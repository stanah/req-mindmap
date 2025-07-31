import React, { useRef, useEffect, useMemo } from 'react';
import { useAppStore } from '../stores';
import { useMindmapSync } from '../hooks';
import { MindmapRenderer } from '../services/mindmapRenderer';
import type { D3Node, RendererEventHandlers } from '../services/mindmapRenderer';
import { NodeDetailsPanel } from './NodeDetailsPanel';
import './MindmapPane.css';

export const MindmapPane: React.FC = () => {
  const svgRef = useRef<SVGSVGElement>(null);
  const rendererRef = useRef<MindmapRenderer | null>(null);
  
  // 新しいZustandストアからの状態取得
  const parsedData = useAppStore(state => state.parse.parsedData);
  const mindmapSettings = useAppStore(state => state.ui.mindmapSettings);
  const selectedNodeId = useAppStore(state => state.ui.selectedNodeId);
  const cursorCorrespondingNodeId = useAppStore(state => state.ui.cursorCorrespondingNodeId);
  const selectNode = useAppStore(state => state.selectNode);
  
  // マインドマップ同期フックの使用
  const { updateMindmapSettings: syncUpdateSettings } = useMindmapSync();

  // イベントハンドラーの定義
  const eventHandlers: RendererEventHandlers = useMemo(() => ({
    onNodeClick: (node: D3Node, event: MouseEvent) => {
      console.log('ノードクリック:', node.data.title);
      selectNode(node.data.id);
      
      // ダブルクリックでフォーカス
      if (event.detail === 2 && rendererRef.current) {
        rendererRef.current.focusNode(node.data.id);
      }
    },
    onNodeHover: (_node: D3Node, event: MouseEvent) => {
      // ホバー時の処理
      const target = event.target as SVGElement;
      if (target) {
        target.style.cursor = 'pointer';
      }
    },
    onNodeLeave: (_node: D3Node, event: MouseEvent) => {
      // ホバー終了時の処理
      const target = event.target as SVGElement;
      if (target) {
        target.style.cursor = 'default';
      }
    },
    onBackgroundClick: (_event: MouseEvent) => {
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
    rendererRef.current = new MindmapRenderer(
      svgRef.current,
      mindmapSettings,
      eventHandlers
    );

    return () => {
      if (rendererRef.current) {
        rendererRef.current.destroy();
        rendererRef.current = null;
      }
    };
  }, [eventHandlers]); // mindmapSettingsを依存配列から除去

  // データの描画
  useEffect(() => {
    if (!rendererRef.current || !parsedData) {
      return;
    }

    console.log('マインドマップを描画中:', parsedData.title);
    rendererRef.current.render(parsedData);
  }, [parsedData]);

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
          rendererRef.current?.centerView();
        }, 100);
      }
    };

    window.addEventListener('resize', handleResize);
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
    </div>
  );
};