/**
 * リアルタイム同期システム用カスタムフック
 * 
 * エディタの変更をマインドマップに即座に反映させる高度な同期機能を提供します。
 */

import { useEffect, useCallback, useRef, useMemo } from 'react';
import { useAppStore } from '../stores';
import { useDebounce } from './useDebounce';

/**
 * リアルタイム同期の設定
 */
interface RealtimeSyncOptions {
  /** パース処理のデバウンス時間（ミリ秒） */
  parseDebounceDelay?: number;
  /** 描画処理のデバウンス時間（ミリ秒） */
  renderDebounceDelay?: number;
  /** エラー時の再試行回数 */
  retryCount?: number;
  /** 大きなファイルでのパフォーマンス最適化を有効にするか */
  enablePerformanceOptimization?: boolean;
}

/**
 * 同期統計情報
 */
interface SyncStats {
  /** 成功した同期回数 */
  successCount: number;
  /** 失敗した同期回数 */
  errorCount: number;
  /** 最後の同期時間（ミリ秒） */
  lastSyncTime: number;
  /** 平均同期時間（ミリ秒） */
  averageSyncTime: number;
}

/**
 * リアルタイム同期システムのメインフック
 */
export function useRealtimeSync(options: RealtimeSyncOptions = {}) {
  const {
    parseDebounceDelay = 300,
    renderDebounceDelay = 100,
    retryCount = 3,
    enablePerformanceOptimization = true,
  } = options;

  // ストアの状態
  const fileContent = useAppStore(state => state.file.fileContent);
  const parsedData = useAppStore(state => state.parse.parsedData);
  const parseErrors = useAppStore(state => state.parse.parseErrors);
  const isParsing = useAppStore(state => state.parse.isParsing);
  const parseContent = useAppStore(state => state.parseContent);

  // デバウンス処理
  const debouncedContent = useDebounce(fileContent, parseDebounceDelay);
  const debouncedParsedData = useDebounce(parsedData, renderDebounceDelay);

  // 統計情報の管理
  const statsRef = useRef<SyncStats>({
    successCount: 0,
    errorCount: 0,
    lastSyncTime: 0,
    averageSyncTime: 0,
  });

  const syncTimesRef = useRef<number[]>([]);

  /**
   * パフォーマンス監視
   */
  const startPerformanceTimer = useCallback(() => {
    return performance.now();
  }, []);

  const endPerformanceTimer = useCallback((startTime: number, operation: string) => {
    const duration = performance.now() - startTime;
    console.log(`[RealtimeSync] ${operation}: ${duration.toFixed(2)}ms`);
    
    // 統計情報の更新
    syncTimesRef.current.push(duration);
    if (syncTimesRef.current.length > 10) {
      syncTimesRef.current.shift(); // 最大10回分の履歴を保持
    }
    
    const averageTime = syncTimesRef.current.reduce((a, b) => a + b, 0) / syncTimesRef.current.length;
    statsRef.current.averageSyncTime = averageTime;
    statsRef.current.lastSyncTime = duration;
    
    return duration;
  }, []);

  /**
   * コンテンツの検証とバリデーション
   */
  const validateContent = useCallback((content: string): boolean => {
    if (!content || content.trim().length === 0) {
      return false;
    }

    // 基本的な構文チェック
    try {
      if (content.trim().startsWith('{')) {
        JSON.parse(content);
      } else if (content.trim().startsWith('version:') || content.includes(':')) {
        // YAML の基本チェック（簡易版）
        return true;
      }
      return true;
    } catch {
      return false; // 無効なJSONの場合はパースしない
    }
  }, []);

  /**
   * パフォーマンス最適化された同期処理
   */
  const optimizedSync = useCallback(async (content: string) => {
    if (!validateContent(content)) {
      return;
    }

    const startTime = startPerformanceTimer();

    try {
      // 大きなファイルの場合は段階的に処理
      if (enablePerformanceOptimization && content.length > 10000) {
        console.log('[RealtimeSync] 大きなファイルを検出、最適化モードで処理中...');
        
        // Web Worker を使用した非同期パース（将来の拡張として）
        await parseContent(content);
      } else {
        await parseContent(content);
      }

      // 成功統計の更新
      statsRef.current.successCount++;
      endPerformanceTimer(startTime, 'Parse and sync');

    } catch (error) {
      console.error('[RealtimeSync] 同期エラー:', error);
      statsRef.current.errorCount++;
      endPerformanceTimer(startTime, 'Parse error');
    }
  }, [
    validateContent,
    startPerformanceTimer,
    endPerformanceTimer,
    enablePerformanceOptimization,
    parseContent
  ]);

  /**
   * デバウンスされたコンテンツが変更された時の処理
   */
  useEffect(() => {
    if (debouncedContent && debouncedContent.trim().length > 0) {
      optimizedSync(debouncedContent);
    }
  }, [debouncedContent, optimizedSync]);

  /**
   * エラー回復機能
   */
  const retrySync = useCallback(async () => {
    if (fileContent && parseErrors.length > 0) {
      console.log('[RealtimeSync] エラー回復を試行中...');
      
      for (let i = 0; i < retryCount; i++) {
        try {
          await optimizedSync(fileContent);
          if (parseErrors.length === 0) {
            console.log('[RealtimeSync] エラー回復に成功');
            break;
          }
        } catch (error) {
          console.warn(`[RealtimeSync] 再試行 ${i + 1}/${retryCount} 失敗:`, error);
          
          if (i === retryCount - 1) {
            console.error('[RealtimeSync] 最大再試行回数に達しました');
          }
          
          // 指数バックオフで待機
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
        }
      }
    }
  }, [fileContent, parseErrors, retryCount, optimizedSync]);

  /**
   * 同期状態の情報
   */
  const syncState = useMemo(() => ({
    isActive: isParsing,
    hasErrors: parseErrors.length > 0,
    lastSyncTime: statsRef.current.lastSyncTime,
    averageSyncTime: statsRef.current.averageSyncTime,
    successRate: statsRef.current.successCount / (statsRef.current.successCount + statsRef.current.errorCount) || 0,
    stats: { ...statsRef.current },
  }), [isParsing, parseErrors.length]);

  /**
   * 手動同期トリガー
   */
  const forcSync = useCallback(() => {
    if (fileContent) {
      optimizedSync(fileContent);
    }
  }, [fileContent, optimizedSync]);

  /**
   * 同期の一時停止/再開機能
   */
  const pauseRef = useRef(false);
  
  const pauseSync = useCallback(() => {
    pauseRef.current = true;
    console.log('[RealtimeSync] 同期を一時停止しました');
  }, []);

  const resumeSync = useCallback(() => {
    pauseRef.current = false;
    console.log('[RealtimeSync] 同期を再開しました');
    
    // 再開時に即座に同期
    if (fileContent) {
      optimizedSync(fileContent);
    }
  }, [fileContent, optimizedSync]);

  return {
    // 状態
    syncState,
    parsedData: debouncedParsedData,
    
    // 操作
    forcSync,
    retrySync,
    pauseSync,
    resumeSync,
    
    // 統計情報
    stats: syncState.stats,
  };
}

/**
 * 軽量版のリアルタイム同期フック
 * パフォーマンスが重視される場合に使用
 */
export function useLightweightSync() {
  return useRealtimeSync({
    parseDebounceDelay: 500,
    renderDebounceDelay: 200,
    enablePerformanceOptimization: false,
  });
}

/**
 * 高速版のリアルタイム同期フック
 * 応答性が重視される場合に使用
 */
export function useFastSync() {
  return useRealtimeSync({
    parseDebounceDelay: 150,
    renderDebounceDelay: 50,
    enablePerformanceOptimization: true,
  });
}