/**
 * リアルタイム同期フック
 */

import { useCallback, useRef, useEffect, useState } from 'react';
import { useAppStore } from '../stores/appStore';
import { useDebounce } from './useDebounce';

interface SyncStats {
  totalSyncs: number;
  successfulSyncs: number;
  failedSyncs: number;
  averageSyncTime: number;
}

export function useRealtimeSync() {
  // ストアの状態
  const fileContent = useAppStore(state => state.file?.fileContent || '');
  const parsedData = useAppStore(state => state.parse?.parsedData);
  const parseErrors = useAppStore(state => state.parse?.parseErrors || []);
  const editorSettings = useAppStore(state => state.ui?.editorSettings || { autoSync: true, syncDelay: 300 });
  
  // ストアのアクション
  const updateContent = useAppStore(state => state.updateContent);
  const parseContent = useAppStore(state => state.parseContent);
  const addNotification = useAppStore(state => state.addNotification);

  // 内部状態
  const [isSyncing, setIsSyncing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [syncStats, setSyncStats] = useState<SyncStats>({
    totalSyncs: 0,
    successfulSyncs: 0,
    failedSyncs: 0,
    averageSyncTime: 0
  });

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastContentRef = useRef<string>('');
  const syncDelayRef = useRef(editorSettings.syncDelay || 300);

  // syncDelayの変更を追跡
  useEffect(() => {
    syncDelayRef.current = editorSettings.syncDelay || 300;
  }, [editorSettings.syncDelay]);

  // デバウンス付きコンテンツ同期
  const syncContent = useCallback((content: string) => {
    if (!editorSettings.autoSync || isPaused || !content.trim()) {
      return;
    }

    // 同じコンテンツの場合はスキップ（ただし統計は更新しない）
    if (content === lastContentRef.current) {
      return;
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    setIsSyncing(true);

    debounceTimerRef.current = setTimeout(() => {
      try {
        const startTime = performance.now();
        updateContent?.(content);
        parseContent?.();
        
        const endTime = performance.now();
        const syncTime = endTime - startTime;

        // 統計を正しく更新（totalSyncsを先に増やしてから計算）
        setSyncStats(prev => {
          const newTotalSyncs = prev.totalSyncs + 1;
          const newSuccessfulSyncs = prev.successfulSyncs + 1;
          return {
            totalSyncs: newTotalSyncs,
            successfulSyncs: newSuccessfulSyncs,
            failedSyncs: prev.failedSyncs,
            averageSyncTime: prev.totalSyncs === 0 
              ? syncTime 
              : (prev.averageSyncTime * prev.totalSyncs + syncTime) / newTotalSyncs
          };
        });

        lastContentRef.current = content;
      } catch (error) {
        setSyncStats(prev => ({
          totalSyncs: prev.totalSyncs + 1,
          successfulSyncs: prev.successfulSyncs,
          failedSyncs: prev.failedSyncs + 1,
          averageSyncTime: prev.averageSyncTime
        }));

        addNotification?.({
          message: `パースエラーが発生しました: ${error instanceof Error ? error.message : 'Unknown error'}`,
          type: 'error',
          autoHide: true
        });
      } finally {
        setIsSyncing(false);
      }
    }, syncDelayRef.current);
  }, [editorSettings.autoSync, isPaused, updateContent, parseContent, addNotification]);

  // 即座同期
  const syncContentImmediate = useCallback((content: string) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    try {
      const startTime = performance.now();
      updateContent?.(content);
      parseContent?.();
      
      const endTime = performance.now();
      const syncTime = endTime - startTime;

      setSyncStats(prev => {
        const newTotalSyncs = prev.totalSyncs + 1;
        const newSuccessfulSyncs = prev.successfulSyncs + 1;
        return {
          totalSyncs: newTotalSyncs,
          successfulSyncs: newSuccessfulSyncs,
          failedSyncs: prev.failedSyncs,
          averageSyncTime: prev.totalSyncs === 0 
            ? syncTime 
            : (prev.averageSyncTime * prev.totalSyncs + syncTime) / newTotalSyncs
        };
      });

      lastContentRef.current = content;
    } catch (error) {
      setSyncStats(prev => ({
        totalSyncs: prev.totalSyncs + 1,
        successfulSyncs: prev.successfulSyncs,
        failedSyncs: prev.failedSyncs + 1,
        averageSyncTime: prev.averageSyncTime
      }));

      addNotification?.({
        message: `パースエラーが発生しました: ${error instanceof Error ? error.message : 'Unknown error'}`,
        type: 'error',
        autoHide: true
      });
    }
  }, [updateContent, parseContent, addNotification]);

  // 同期の一時停止
  const pauseSync = useCallback(() => {
    setIsPaused(true);
  }, []);

  // 同期の再開
  const resumeSync = useCallback(() => {
    setIsPaused(false);
  }, []);

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return {
    syncContent,
    syncContentImmediate,
    pauseSync,
    resumeSync,
    isSyncing,
    isPaused,
    syncStats
  };
}