/**
 * VSCode拡張専用のマインドマップビューアー
 * エディタ機能を除外し、マインドマップ表示のみに特化
 */

import React, { useRef, useEffect, useMemo, useState } from 'react';
import { useAppStore } from '../../stores';
import { MindmapCore } from '../../core';
import type { RendererEventHandlers } from '../../core';
import type { MindmapNode } from '../../types';
import { PlatformAdapterFactory } from '../../platform';
import { ThemeToggle } from '../../web/components/ui/ThemeToggle';
import { NodeDetailsPanel } from '../../components/shared/NodeDetailsPanel';
import './MindmapViewer.css';
import '../../styles/NodeDetailsPanel.css';

export const MindmapViewer: React.FC = () => {
  const svgRef = useRef<SVGSVGElement>(null);
  const rendererRef = useRef<MindmapCore | null>(null);
  
  // ノード詳細パネルの表示状態
  const [isPanelVisible, setIsPanelVisible] = useState(false);
  
  // Zustandストアからの状態取得
  const parsedData = useAppStore(state => state.parse.parsedData);
  const mindmapSettings = useAppStore(state => state.ui.mindmapSettings);
  const selectedNodeId = useAppStore(state => state.ui.selectedNodeId);
  const _cursorCorrespondingNodeId = useAppStore(state => state.ui.cursorCorrespondingNodeId);
  const selectNode = useAppStore(state => state.selectNode);

  // ノード更新のハンドラー
  const handleNodeUpdate = async (nodeId: string, updates: Partial<MindmapNode>) => {
    if (!rendererRef.current || !parsedData) return;
    
    try {
      // MindmapCoreのupdateNodeメソッドを使用してノードを更新
      rendererRef.current.updateNode(nodeId, updates);
      console.log('ノード更新完了:', nodeId, updates);
      
      // 更新されたデータを取得
      const updatedData = rendererRef.current.getData();
      
      // ファイルに保存
      try {
        const platformAdapter = PlatformAdapterFactory.getInstance();
        if (platformAdapter.getPlatformType() === 'vscode') {
          // Zustand ストアのparsedDataを直接更新
          useAppStore.setState((state) => ({
            parse: {
              ...state.parse,
              parsedData: updatedData,
              lastParsed: Date.now(),
            },
          }));
          
          // VSCode側にファイル保存を要求
          // HTMLで初期化されたVSCode APIインスタンスを使用
          const vscode = (window as any).vscodeApiInstance || (window as any).vscode;
          
          if (!vscode) {
            console.error('VSCode APIが利用できません - HTMLで初期化されていない可能性があります');
            return;
          }
          
          const saveMessage = {
            command: 'saveFile',
            data: updatedData
          };
          console.log('VSCodeにファイル保存を要求します:', saveMessage);
          console.log('送信するデータのタイプ:', typeof updatedData);
          console.log('送信するデータのプロパティ:', Object.keys(updatedData || {}));
          
          vscode.postMessage(saveMessage);
          console.log('メッセージ送信完了');
        }
      } catch (saveError) {
        console.error('ファイル保存に失敗:', saveError);
      }
      
      // 再描画
      if (updatedData) {
        rendererRef.current.render(updatedData);
      }
    } catch (error) {
      console.error('ノード更新に失敗:', error);
    }
  };

  // イベントハンドラーの定義
  const eventHandlers: RendererEventHandlers = useMemo(() => ({
    onNodeClick: async (nodeId: string, event: MouseEvent) => {
      console.log('ノードクリック:', nodeId);
      selectNode(nodeId);
      
      // ノードが選択されたらパネルを自動で表示
      if (nodeId && !isPanelVisible) {
        setIsPanelVisible(true);
      }
      
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
  }), [selectNode, isPanelVisible]);

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
    console.log('MindmapViewer - データ描画useEffect:', {
      hasRenderer: !!rendererRef.current,
      hasParsedData: !!parsedData,
      parsedDataTitle: parsedData?.title,
      parsedDataKeys: parsedData ? Object.keys(parsedData) : null
    });
    
    if (!rendererRef.current || !parsedData) {
      console.log('描画をスキップ - レンダラーまたはデータが存在しません');
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
  }, [parsedData, isPanelVisible]);

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
      // Ctrl/Cmd + I: ノード詳細パネルの切り替え
      else if ((event.ctrlKey || event.metaKey) && event.key === 'i') {
        event.preventDefault();
        setIsPanelVisible(!isPanelVisible);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedNodeId, isPanelVisible]);

  return (
    <div className="mindmap-viewer">
      {/* VSCode用のツールバー */}
      <div className="vscode-toolbar">
        <ThemeToggle className="vscode-theme-toggle" />
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
            <p>VSCodeエディタでJSON/YAMLファイルを編集してください。</p>
          </div>
        </div>
      )}
      
      {/* ノード詳細パネル */}
      <NodeDetailsPanel
        nodeId={selectedNodeId}
        data={parsedData}
        isVisible={isPanelVisible}
        onToggle={() => setIsPanelVisible(!isPanelVisible)}
        onNodeUpdate={handleNodeUpdate}
        mode="vscode"
        position="bottom"
      />
    </div>
  );
};