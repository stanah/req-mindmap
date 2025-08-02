import React from 'react';
import { useAppStore } from '../../stores/appStore';
import './StatusBar.css';

export const StatusBar: React.FC = () => {
  const { 
    file: { currentFile, isDirty, fileSize },
    parse: { parseErrors },
    ui: { selectedNodeId }
  } = useAppStore();
  const notifications = useAppStore(state => state.ui.notifications);

  // ファイル名を取得（パスから）
  const getFileName = (filePath: string | null): string => {
    if (!filePath) return '無題';
    return filePath.split('/').pop() || filePath;
  };

  // ファイルサイズを人間が読みやすい形式に変換
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // パースエラーの数を取得
  const errorCount = parseErrors?.length || 0;
  const isValid = errorCount === 0;
  
  // 現在のエラー通知を取得
  const currentError = notifications.find(n => n.type === 'error');

  return (
    <div className="status-bar">
      <div className="status-left">
        {/* ファイル情報 */}
        <div className="status-item file-info">
          <span className="file-name">
            {getFileName(currentFile)}
            {isDirty && <span className="dirty-indicator">●</span>}
          </span>
          {fileSize !== undefined && (
            <span className="file-size">({formatFileSize(fileSize)})</span>
          )}
        </div>

        {/* パース状態 */}
        <div className={`status-item parse-status ${isValid ? 'valid' : 'invalid'}`}>
          {isValid ? (
            <span className="status-valid">✓ 有効</span>
          ) : (
            <span className="status-invalid">
              ✗ エラー {errorCount > 0 && `(${errorCount})`}
            </span>
          )}
        </div>

        {/* 選択中のノード */}
        {selectedNodeId && (
          <div className="status-item selected-node">
            <span>選択中: {selectedNodeId}</span>
          </div>
        )}
      </div>

      <div className="status-right">
        {/* エラーメッセージ */}
        {currentError && (
          <div className="status-item error-message">
            <span className="error-icon">⚠</span>
            <span className="error-text">{currentError.message}</span>
          </div>
        )}

        {/* 準備完了状態 */}
        {!currentError && isValid && (
          <div className="status-item ready">
            <span className="ready-icon">●</span>
            <span>準備完了</span>
          </div>
        )}
      </div>
    </div>
  );
};