/**
 * ファイルドロップゾーンコンポーネント
 * 
 * ドラッグ&ドロップでファイルを読み込むためのコンポーネント
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useAppStore } from '../../stores/appStore';
import type { FileLoadResult } from '../../services/fileService';

interface FileDropZoneProps {
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  onFileLoad?: (result: FileLoadResult) => void;
}

export const FileDropZone: React.FC<FileDropZoneProps> = ({
  children,
  className = '',
  disabled = false,
  onFileLoad,
}) => {
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [dragCounter, setDragCounter] = useState(0);
  
  const { updateContent, addNotification } = useAppStore();

  /**
   * ファイル読み込み処理
   */
  const handleFileLoad = (result: FileLoadResult) => {
    if (result.success) {
      // ファイル内容をストアに設定
      updateContent(result.content);
      
      addNotification({
        message: `ファイル "${result.fileInfo.name}" をドロップで読み込みました (${result.fileInfo.detectedFormat}形式)`,
        type: 'success',
        autoHide: true,
        duration: 3000,
      });
      
      // カスタムハンドラーがあれば実行
      onFileLoad?.(result);
    } else {
      addNotification({
        message: result.error || 'ファイルの読み込みに失敗しました',
        type: 'error',
        autoHide: true,
        duration: 5000,
      });
    }
  };

  /**
   * ドラッグイベントのデフォルト動作を防止
   */
  const preventDefaults = (e: Event) => {
    e.preventDefault();
    e.stopPropagation();
  };

  /**
   * ドラッグエンター処理
   */
  const handleDragEnter = (e: DragEvent) => {
    preventDefaults(e);
    if (disabled) return;
    
    setDragCounter(prev => prev + 1);
    setIsDragActive(true);
  };

  /**
   * ドラッグリーブ処理
   */
  const handleDragLeave = (e: DragEvent) => {
    preventDefaults(e);
    if (disabled) return;
    
    const newCounter = dragCounter - 1;
    setDragCounter(newCounter);
    if (newCounter === 0) {
      setIsDragActive(false);
    }
  };

  /**
   * ドラッグオーバー処理
   */
  const handleDragOver = (e: DragEvent) => {
    preventDefaults(e);
    if (disabled) return;
    
    // ドラッグ効果を設定
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'copy';
    }
  };

  /**
   * ドロップ処理
   */
  const handleDrop = useCallback(async (e: DragEvent) => {
    preventDefaults(e);
    if (disabled) return;
    
    setIsDragActive(false);
    setDragCounter(0);
    
    const files = e.dataTransfer?.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    
    // ファイルタイプチェック
    const allowedTypes = ['.json', '.yaml', '.yml', '.txt'];
    const extension = '.' + (file.name.split('.').pop()?.toLowerCase() || '');
    
    if (!allowedTypes.includes(extension)) {
      addNotification({
        message: 'サポートされていないファイル形式です。JSON、YAML、またはテキストファイルをドロップしてください。',
        type: 'error',
        autoHide: true,
        duration: 5000,
      });
      return;
    }

    // ファイルサイズチェック
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      addNotification({
        message: 'ファイルサイズが大きすぎます（10MB以下のファイルをドロップしてください）',
        type: 'error',
        autoHide: true,
        duration: 5000,
      });
      return;
    }

    // ファイル読み込み
    try {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        const fileInfo = {
          name: file.name,
          size: file.size,
          type: file.type,
          lastModified: file.lastModified,
          extension: extension.slice(1),
          detectedFormat: detectFileFormat(file.name, content),
        };
        
        handleFileLoad({
          content,
          fileInfo,
          success: true,
        });
      };
      
      reader.onerror = () => {
        addNotification({
          message: 'ファイルの読み込み中にエラーが発生しました',
          type: 'error',
          autoHide: true,
          duration: 5000,
        });
      };
      
      reader.readAsText(file, 'UTF-8');
    } catch (error) {
      addNotification({
        message: `ファイル読み込みエラー: ${error instanceof Error ? error.message : '不明なエラー'}`,
        type: 'error',
        autoHide: true,
        duration: 5000,
      });
    }
  }, [disabled, addNotification, updateContent, onFileLoad]);

  /**
   * ファイル形式を自動検出
   */
  const detectFileFormat = (filename: string, content?: string): 'json' | 'yaml' | 'unknown' => {
    const extension = filename.split('.').pop()?.toLowerCase();
    
    // 拡張子による判定
    if (extension === 'json') return 'json';
    if (extension === 'yaml' || extension === 'yml') return 'yaml';
    
    // 内容による判定（拡張子が不明な場合）
    if (content) {
      const trimmed = content.trim();
      if (trimmed.startsWith('{') && trimmed.endsWith('}')) return 'json';
      if (trimmed.startsWith('[') && trimmed.endsWith(']')) return 'json';
      
      // YAML特有のパターンを検出
      if (/^[a-zA-Z_][a-zA-Z0-9_]*:\s*/.test(trimmed) || 
          /^-\s+/.test(trimmed)) return 'yaml';
    }
    
    return 'unknown';
  };

  /**
   * イベントリスナーの設定
   */
  useEffect(() => {
    const dropZone = dropZoneRef.current;
    if (!dropZone || disabled) return;

    // イベントリスナーを追加
    dropZone.addEventListener('dragenter', handleDragEnter);
    dropZone.addEventListener('dragleave', handleDragLeave);
    dropZone.addEventListener('dragover', handleDragOver);
    dropZone.addEventListener('drop', handleDrop);

    // クリーンアップ
    return () => {
      dropZone.removeEventListener('dragenter', handleDragEnter);
      dropZone.removeEventListener('dragleave', handleDragLeave);
      dropZone.removeEventListener('dragover', handleDragOver);
      dropZone.removeEventListener('drop', handleDrop);
    };
  }, [handleDragEnter, handleDragLeave, handleDragOver, handleDrop]);

  return (
    <div
      ref={dropZoneRef}
      className={`
        file-drop-zone 
        ${className}
        ${isDragActive ? 'file-drop-zone--active' : ''}
        ${disabled ? 'file-drop-zone--disabled' : ''}
      `.trim()}
    >
      {children}
      
      {/* ドラッグ中のオーバーレイ */}
      {isDragActive && !disabled && (
        <div className="file-drop-zone__overlay">
          <div className="file-drop-zone__message">
            <div className="file-drop-zone__icon">📁</div>
            <div className="file-drop-zone__text">
              <div className="file-drop-zone__title">ファイルをドロップしてください</div>
              <div className="file-drop-zone__subtitle">
                JSON、YAML、テキストファイルに対応
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileDropZone;