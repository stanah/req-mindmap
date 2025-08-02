import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../stores/appStore';
import { performanceMonitor } from '../../utils/performanceMonitor';
import './StatusBar.css';

export const StatusBar: React.FC = () => {
  const { 
    file: { currentFile, isDirty, fileSize },
    parse: { parseErrors, parsedData },
    ui: { selectedNodeId },
    debugMode
  } = useAppStore();
  const notifications = useAppStore(state => state.ui.notifications);
  const countNodes = useAppStore(state => state.countNodes);
  const getPerformanceStats = useAppStore(state => state.getPerformanceStats);
  const optimizeMemory = useAppStore(state => state.optimizeMemory);

  // パフォーマンス情報の状態
  const [memoryInfo, setMemoryInfo] = useState<any>(null);
  const [showPerformanceDetails, setShowPerformanceDetails] = useState(false);

  // メモリ情報を定期的に更新
  useEffect(() => {
    const updateMemoryInfo = () => {
      const info = performanceMonitor.getCurrentMemoryUsage();
      setMemoryInfo(info);
    };

    updateMemoryInfo();
    const interval = setInterval(updateMemoryInfo, 2000); // 2秒ごとに更新

    return () => clearInterval(interval);
  }, []);

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

  // ノード数を取得
  const nodeCount = parsedData ? countNodes(parsedData.root) : 0;

  // メモリ使用率に基づく警告レベル
  const getMemoryWarningLevel = (ratio: number): 'normal' | 'warning' | 'critical' => {
    if (ratio > 0.85) return 'critical';
    if (ratio > 0.7) return 'warning';
    return 'normal';
  };

  // パフォーマンス詳細を切り替え
  const togglePerformanceDetails = () => {
    setShowPerformanceDetails(!showPerformanceDetails);
  };

  // メモリ最適化を実行
  const handleOptimizeMemory = () => {
    optimizeMemory();
  };

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

        {/* ノード数 */}
        {nodeCount > 0 && (
          <div className="status-item node-count">
            <span>ノード: {nodeCount}</span>
          </div>
        )}

        {/* 選択中のノード */}
        {selectedNodeId && (
          <div className="status-item selected-node">
            <span>選択中: {selectedNodeId}</span>
          </div>
        )}
      </div>

      <div className="status-right">
        {/* パフォーマンス情報（デバッグモード時） */}
        {debugMode && memoryInfo && (
          <div className="status-item performance-info">
            <div 
              className={`memory-usage ${getMemoryWarningLevel(memoryInfo.usageRatio)}`}
              onClick={togglePerformanceDetails}
              title="クリックで詳細表示"
            >
              <span className="memory-icon">🧠</span>
              <span className="memory-text">
                {(memoryInfo.usageRatio * 100).toFixed(1)}%
              </span>
            </div>
            
            {memoryInfo.usageRatio > 0.8 && (
              <button 
                className="optimize-button"
                onClick={handleOptimizeMemory}
                title="メモリを最適化"
              >
                🔧
              </button>
            )}
          </div>
        )}

        {/* パフォーマンス詳細（展開時） */}
        {showPerformanceDetails && debugMode && memoryInfo && (
          <div className="status-item performance-details">
            <div className="performance-popup">
              <div className="performance-header">
                <span>パフォーマンス情報</span>
                <button 
                  className="close-button"
                  onClick={togglePerformanceDetails}
                >
                  ×
                </button>
              </div>
              <div className="performance-content">
                <div className="memory-details">
                  <div>使用中: {(memoryInfo.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB</div>
                  <div>合計: {(memoryInfo.totalJSHeapSize / 1024 / 1024).toFixed(2)}MB</div>
                  <div>制限: {(memoryInfo.jsHeapSizeLimit / 1024 / 1024).toFixed(2)}MB</div>
                  <div>使用率: {(memoryInfo.usageRatio * 100).toFixed(1)}%</div>
                </div>
                <div className="performance-actions">
                  <button onClick={handleOptimizeMemory}>
                    メモリ最適化
                  </button>
                  <button onClick={() => {
                    const stats = getPerformanceStats();
                    console.log('Performance Stats:', stats);
                  }}>
                    統計をログ出力
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

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