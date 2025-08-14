import React, { useRef, useEffect, useMemo, useState } from 'react';
import { useAppStore } from '../../stores';
import { useMindmapSync } from '../../hooks';
import { MindmapCore } from '../../core';
import type { RendererEventHandlers } from '../../core';
import { NodeDetailsPanel } from './NodeDetailsPanel';
import './MindmapPane.css';

export const MindmapPane: React.FC = () => {
  const svgRef = useRef<SVGSVGElement>(null);
  const rendererRef = useRef<MindmapCore | null>(null);
  
  // 新しいZustandストアからの状態取得
  const parsedData = useAppStore(state => state.parse.parsedData);
  const mindmapSettings = useAppStore(state => state.ui.mindmapSettings);
  const selectedNodeId = useAppStore(state => state.ui.selectedNodeId);
  const cursorCorrespondingNodeId = useAppStore(state => state.ui.cursorCorrespondingNodeId);
  const debugMode = useAppStore(state => state.debugMode);
  const selectNode = useAppStore(state => state.selectNode);
  const countNodes = useAppStore(state => state.countNodes);
  
  // マインドマップ同期フックの使用
  const { updateMindmapSettings: syncUpdateSettings } = useMindmapSync();

  // パフォーマンス関連の状態
  const [performanceMode, setPerformanceMode] = useState<'auto' | 'performance' | 'quality'>('auto');
  const [showPerformancePanel, setShowPerformancePanel] = useState(false);
  const [nodeCount, setNodeCount] = useState(0);

  // イベントハンドラーの定義
  const eventHandlers: RendererEventHandlers = useMemo(() => ({
    onNodeClick: (nodeId: string, event: MouseEvent) => {
      console.log('ノードクリック:', nodeId);
      selectNode(nodeId);
      
      // ダブルクリックでフォーカス
      if (event.detail === 2 && rendererRef.current) {
        // フォーカス機能は今後実装
      }
    },
    onNodeHover: (nodeId: string, event: MouseEvent) => {
      // ホバー時の処理
      const target = event.target as SVGElement;
      if (target) {
        target.style.cursor = 'pointer';
      }
    },
    onNodeLeave: (nodeId: string, event: MouseEvent) => {
      // ホバー終了時の処理
      const target = event.target as SVGElement;
      if (target) {
        target.style.cursor = 'default';
      }
    },
    onBackgroundClick: () => {
      // 背景クリック時の処理
      selectNode(null);
    },
  }), [selectNode]);

  // レンダラーの初期化（初回のみ）
  useEffect(() => {
    if (!svgRef.current) return;

    // 既存のレンダラーをクリーンアップ
    if (rendererRef.current) {
      rendererRef.current.destroy();
    }

    // 新しいレンダラーを作成
    rendererRef.current = new MindmapCore({
      container: svgRef.current,
      settings: mindmapSettings,
      eventHandlers
    });

    return () => {
      if (rendererRef.current) {
        rendererRef.current.destroy();
        rendererRef.current = null;
      }
    };
  }, [eventHandlers, mindmapSettings]);

  // データの描画
  useEffect(() => {
    if (!rendererRef.current || !parsedData) {
      setNodeCount(0);
      return;
    }

    const count = countNodes(parsedData.root);
    setNodeCount(count);

    console.log('マインドマップを描画中:', parsedData.title, `(${count} nodes)`);
    rendererRef.current.render(parsedData);
    
    // VSCode環境での初期表示最適化
    setTimeout(() => {
      if (rendererRef.current) {
        rendererRef.current.centerView();
        rendererRef.current.resetView();
      }
    }, 100);
  }, [parsedData, countNodes]);

  // 設定の更新
  useEffect(() => {
    if (rendererRef.current) {
      rendererRef.current.updateSettings(mindmapSettings);
    }
  }, [mindmapSettings]);

  // 選択ノードの更新
  useEffect(() => {
    if (rendererRef.current) {
      rendererRef.current.selectNode(selectedNodeId);
    }
  }, [selectedNodeId]);

  // カーソル対応ノードの強調表示
  useEffect(() => {
    if (rendererRef.current) {
      rendererRef.current.highlightCursorNode(cursorCorrespondingNodeId);
    }
  }, [cursorCorrespondingNodeId]);

  // キーボードショートカット
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!rendererRef.current) return;

      // Ctrl/Cmd + 0: ビューをリセット
      if ((event.ctrlKey || event.metaKey) && event.key === '0') {
        event.preventDefault();
        rendererRef.current.resetView();
      }
      // Ctrl/Cmd + +: ズームイン
      else if ((event.ctrlKey || event.metaKey) && (event.key === '+' || event.key === '=')) {
        event.preventDefault();
        rendererRef.current.zoomIn();
      }
      // Ctrl/Cmd + -: ズームアウト
      else if ((event.ctrlKey || event.metaKey) && event.key === '-') {
        event.preventDefault();
        rendererRef.current.zoomOut();
      }
      // スペースキー: 選択ノードの折りたたみ切り替え
      else if (event.key === ' ' && selectedNodeId) {
        event.preventDefault();
        rendererRef.current.toggleNode(selectedNodeId);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedNodeId]);

  // ウィンドウリサイズ対応
  useEffect(() => {
    const handleResize = () => {
      if (rendererRef.current) {
        // リサイズ後に少し遅延してビューを再調整
        setTimeout(() => {
          rendererRef.current?.resetView();
        }, 100);
      }
    };

    window.addEventListener('resize', handleResize);
    
    // VSCode環境での初期リサイズ処理
    if (typeof window !== 'undefined' && window.vscodeApiInstance) {
      setTimeout(handleResize, 200);
    }
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const handleZoomIn = () => {
    if (rendererRef.current) {
      rendererRef.current.zoomIn();
    }
  };

  const handleZoomOut = () => {
    if (rendererRef.current) {
      rendererRef.current.zoomOut();
    }
  };

  const handleResetView = () => {
    if (rendererRef.current) {
      rendererRef.current.resetView();
    }
  };

  const handleLayoutChange = (layout: 'tree' | 'radial') => {
    syncUpdateSettings({ layout });
  };

  // パフォーマンスモードの変更
  const handlePerformanceModeChange = (mode: 'auto' | 'performance' | 'quality') => {
    setPerformanceMode(mode);
    if (rendererRef.current) {
      rendererRef.current.setPerformanceMode(mode);
    }
  };

  // パフォーマンス統計の表示
  const handleShowPerformanceStats = () => {
    if (rendererRef.current) {
      rendererRef.current.logPerformanceStats();
    }
  };

  // メモリ最適化の実行
  const handleOptimizeMemory = () => {
    if (rendererRef.current) {
      rendererRef.current.optimizeMemory();
    }
  };

  // 仮想化の切り替え
  const handleToggleVirtualization = () => {
    if (rendererRef.current) {
      const stats = rendererRef.current.getPerformanceStats();
      const newEnabled = !stats.currentSettings.enableVirtualization;
      rendererRef.current.setVirtualizationEnabled(newEnabled);
    }
  };

  return (
    <div className="mindmap-pane">
      <div className="mindmap-toolbar">
        <div className="zoom-controls">
          <button 
            className="toolbar-btn"
            onClick={handleZoomIn}
            title="ズームイン"
          >
            +
          </button>
          <button 
            className="toolbar-btn"
            onClick={handleZoomOut}
            title="ズームアウト"
          >
            -
          </button>
          <button 
            className="toolbar-btn"
            onClick={handleResetView}
            title="ビューをリセット"
          >
            ⌂
          </button>
        </div>
        
        <div className="node-controls">
          <button
            className="toolbar-btn"
            onClick={() => selectedNodeId && rendererRef.current?.toggleNode(selectedNodeId)}
            disabled={!selectedNodeId}
            title="選択ノードの折りたたみ切り替え (Space)"
          >
            ⌄
          </button>
          <button
            className="toolbar-btn"
            onClick={() => selectedNodeId && rendererRef.current?.focusNode(selectedNodeId)}
            disabled={!selectedNodeId}
            title="選択ノードにフォーカス"
          >
            ⊙
          </button>
        </div>
        
        <div className="layout-controls">
          <button
            className={`layout-btn ${mindmapSettings.layout === 'tree' ? 'active' : ''}`}
            onClick={() => handleLayoutChange('tree')}
            title="ツリーレイアウト"
          >
            ツリー
          </button>
          <button
            className={`layout-btn ${mindmapSettings.layout === 'radial' ? 'active' : ''}`}
            onClick={() => handleLayoutChange('radial')}
            title="放射状レイアウト"
          >
            放射状
          </button>
        </div>

        {/* パフォーマンス制御（デバッグモード時のみ） */}
        {debugMode && (
          <div className="performance-controls">
            <div className="node-count-display">
              <span className="node-count-label">ノード数:</span>
              <span className={`node-count-value ${nodeCount > 100 ? 'high' : nodeCount > 50 ? 'medium' : 'low'}`}>
                {nodeCount}
              </span>
            </div>
            
            <select
              className="performance-mode-select"
              value={performanceMode}
              onChange={(e) => handlePerformanceModeChange(e.target.value as 'auto' | 'performance' | 'quality')}
              title="パフォーマンスモード"
            >
              <option value="auto">自動</option>
              <option value="performance">パフォーマンス</option>
              <option value="quality">品質</option>
            </select>
            
            <button
              className="toolbar-btn performance-btn"
              onClick={() => setShowPerformancePanel(!showPerformancePanel)}
              title="パフォーマンス詳細"
            >
              📊
            </button>
          </div>
        )}
      </div>
      
      <div className="mindmap-container">
        <svg
          ref={svgRef}
          className="mindmap-svg"
          width="100%"
          height="100%"
        >
          {/* D3.jsによる描画がここに追加される */}
        </svg>
      </div>
      
      {!parsedData && (
        <div className="empty-state">
          <div className="empty-state-content">
            <h3>マインドマップを表示するには</h3>
            <p>左側のエディタでJSON/YAMLファイルを編集するか、ファイルを読み込んでください。</p>
          </div>
        </div>
      )}
      
      {selectedNodeId && parsedData && (
        <div className="node-details-panel">
          <NodeDetailsPanel 
            nodeId={selectedNodeId}
            data={parsedData}
            onClose={() => selectNode(null)}
          />
        </div>
      )}

      {/* パフォーマンスパネル（デバッグモード時のみ） */}
      {debugMode && showPerformancePanel && (
        <div className="performance-panel">
          <div className="performance-panel-header">
            <h3>パフォーマンス情報</h3>
            <button
              className="close-btn"
              onClick={() => setShowPerformancePanel(false)}
            >
              ×
            </button>
          </div>
          <div className="performance-panel-content">
            <div className="performance-section">
              <h4>描画統計</h4>
              <div className="performance-stats">
                <div>総ノード数: {nodeCount}</div>
                <div>現在のモード: {performanceMode}</div>
              </div>
            </div>
            
            <div className="performance-section">
              <h4>操作</h4>
              <div className="performance-actions">
                <button onClick={handleShowPerformanceStats}>
                  統計をログ出力
                </button>
                <button onClick={handleOptimizeMemory}>
                  メモリ最適化
                </button>
                <button onClick={handleToggleVirtualization}>
                  仮想化切り替え
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};