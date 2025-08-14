/**
 * VSCode拡張専用のマインドマップビューアー
 * エディタ機能を除外し、マインドマップ表示のみに特化
 */

import React, { useRef, useEffect, useMemo } from 'react';
import { useAppStore } from '../../stores';
import { MindmapCore } from '../../core';
import type { RendererEventHandlers } from '../../core';
import { PlatformAdapterFactory } from '../../platform';

export const MindmapViewer: React.FC = () => {
  const svgRef = useRef<SVGSVGElement>(null);
  const rendererRef = useRef<MindmapCore | null>(null);
  
  // Zustandストアからの状態取得
  const parsedData = useAppStore(state => state.parse.parsedData);
  const mindmapSettings = useAppStore(state => state.ui.mindmapSettings);
  const selectedNodeId = useAppStore(state => state.ui.selectedNodeId);
  const cursorCorrespondingNodeId = useAppStore(state => state.ui.cursorCorrespondingNodeId);
  const selectNode = useAppStore(state => state.selectNode);

  // イベントハンドラーの定義
  const eventHandlers: RendererEventHandlers = useMemo(() => ({
    onNodeClick: async (nodeId: string, event: MouseEvent) => {
      console.log('ノードクリック:', nodeId);
      selectNode(nodeId);
      
      // マインドマップファイル内の該当ノード定義箇所にジャンプ
      try {
        const platformAdapter = PlatformAdapterFactory.getInstance();
        if (platformAdapter.getPlatformType() === 'vscode') {
          const editorAdapter = platformAdapter.editor;
          await (editorAdapter as any).jumpToNodeInCurrentFile(nodeId);
          console.log(`ノードジャンプ実行: ${nodeId}`);
        }
      } catch (error) {
        console.error('ノードジャンプに失敗:', error);
      }
      
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
      selectNode(null);
    },
  }), [selectNode]);

  // レンダラーの初期化
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
      return;
    }

    console.log('マインドマップを描画中:', parsedData.title);
    rendererRef.current.render(parsedData);
    
    // VSCode環境での初期表示最適化
    setTimeout(() => {
      if (rendererRef.current) {
        rendererRef.current.resetView();
      }
    }, 100);
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

  return (
    <div className="mindmap-viewer">
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
            <p>VSCodeエディタでJSON/YAMLファイルを編集してください。</p>
          </div>
        </div>
      )}
    </div>
  );
};