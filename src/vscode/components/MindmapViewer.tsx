/**
 * VSCode拡張専用のマインドマップビューアー
 * エディタ機能を除外し、マインドマップ表示のみに特化
 */

import React, { useRef, useEffect, useMemo, useState } from 'react';
import { useAppStore } from '../../stores';
import { useMindmapNodeUpdate } from '../../hooks/useMindmapNodeUpdate';
import { MindmapCore } from '../../core';
import type { RendererEventHandlers } from '../../core';
import type { MindmapData } from '../../types';

import { PlatformAdapterFactory } from '../../platform';
import { VSCodeEditorAdapter } from '../../platform/vscode/VSCodeEditorAdapter';
import { NodeDetailsPanel } from '../../components/shared/NodeDetailsPanel';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';
import { Toolbar } from './Toolbar';
import { createNewNode, addChildNode, addSiblingNode, removeNode, findNodeById } from '../../utils/nodeHelpers';
import './MindmapViewer.css';
import './NodeActionButtons.css';
import './Toolbar.css';
import '../../styles/NodeDetailsPanel.css';

// VSCode APIの型定義（将来使用予定）
interface _VSCodeApi {
  postMessage: (message: unknown) => void;
}

export const MindmapViewer: React.FC = () => {
  const svgRef = useRef<SVGSVGElement>(null);
  const rendererRef = useRef<MindmapCore | null>(null);
  
  // ノード詳細パネルの表示状態
  const [isPanelVisible, setIsPanelVisible] = useState(false);
  
  // 削除確認ダイアログの状態
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [nodeToDelete, setNodeToDelete] = useState<string | null>(null);
  
  // ズームレベルの状態管理
  const [zoomLevel, setZoomLevel] = useState(100);
  
  // Zustandストアからの状態取得
  const parsedData = useAppStore(state => state.parse.parsedData);
  const mindmapSettings = useAppStore(state => state.ui.mindmapSettings);
  const selectedNodeId = useAppStore(state => state.ui.selectedNodeId);
  const _cursorCorrespondingNodeId = useAppStore(state => state.ui.cursorCorrespondingNodeId);
  const selectNode = useAppStore(state => state.selectNode);


  // ノード更新フックの使用
  const { updateNode } = useMindmapNodeUpdate({ rendererRef });

  // ノード追加のハンドラー関数
  const handleAddChild = async (parentNodeId: string) => {
    if (!parsedData || !rendererRef.current) return;

    try {
      console.log('子ノード追加開始:', { parentNodeId, parsedData: !!parsedData });
      
      // 新しい子ノードを作成
      const newNode = createNewNode('新しい子ノード', 'ここに説明を入力してください');
      console.log('新しいノードを作成:', newNode);
      
      // データ構造を更新（不変更新） - data.rootを使用
      const mindmapData = parsedData as MindmapData;
      const rootNode = mindmapData.root;
      console.log('ルートノード取得:', { hasRootNode: !!rootNode });
      
      const updatedRootNode = addChildNode(rootNode, parentNodeId, newNode);
      console.log('ノード追加完了:', { updatedRootNode: !!updatedRootNode });
      
      const updatedData = { ...parsedData, root: updatedRootNode };
      
      // VSCodeエディターのファイル内容を更新（これが最優先）
      try {
        const platformAdapter = PlatformAdapterFactory.getInstance();
        if (platformAdapter.getPlatformType() === 'vscode') {
          const _editorAdapter = platformAdapter.editor;
          
          // VSCodeにデータオブジェクトを送信（VSCode側で適切な形式に変換）
          console.log('VSCode API確認:', { hasVscode: !!window.vscode, windowKeys: Object.keys(window) });
          if (window.vscode) {
            console.log('contentChangedメッセージ送信中:', { command: 'contentChanged', dataKeys: Object.keys(updatedData) });
            window.vscode?.postMessage({
              command: 'contentChanged',
              data: updatedData  // contentではなくdataとして送信
            });
            console.log('VSCodeにcontentChangedメッセージを送信');
            
            // ファイル保存を少し遅延させて競合を回避
            setTimeout(() => {
              console.log('ファイル保存要求送信中');
              window.vscode?.postMessage({
                command: 'saveFile',
                data: updatedData
              });
              console.log('VSCodeにsaveFileメッセージを送信');
            }, 100);
          } else {
            console.error('window.vscodeが存在しません');
          }
          console.log('ファイル更新・保存完了');
          
          // ファイル更新後は自動でパーサーが動くので、手動での状態更新は不要
        }
      } catch (fileError) {
        console.error('ファイル書き戻しに失敗:', fileError);
        // フォールバックとしてメモリ内のみ更新
        useAppStore.setState((state) => ({
          parse: {
            ...state.parse,
            parsedData: updatedData
          }
        }));
        rendererRef.current.render(updatedData);
      }
      
      // 新しく追加されたノードを選択
      selectNode(newNode.id);
      
      console.log(`子ノードを追加しました: ${newNode.id} (親: ${parentNodeId})`);
    } catch (error) {
      console.error('子ノード追加に失敗:', error);
      if (error instanceof Error) {
        console.error('エラースタック:', error.stack);
      }
    }
  };

  const handleAddSibling = async (siblingNodeId: string) => {
    if (!parsedData || !rendererRef.current) return;

    try {
      // 新しい兄弟ノードを作成
      const newNode = createNewNode('新しい兄弟ノード', 'ここに説明を入力してください');
      
      // データ構造を更新（不変更新） - data.rootを使用
      const mindmapData = parsedData as MindmapData;
      const rootNode = mindmapData.root;
      const updatedRootNode = addSiblingNode(rootNode, siblingNodeId, newNode);
      const updatedData = { ...parsedData, root: updatedRootNode };
      
      // VSCodeエディターのファイル内容を更新（これが最優先）
      try {
        const platformAdapter = PlatformAdapterFactory.getInstance();
        if (platformAdapter.getPlatformType() === 'vscode') {
          const _editorAdapter = platformAdapter.editor;
          
          // VSCodeにデータオブジェクトを送信（VSCode側で適切な形式に変換）
          console.log('VSCode API確認:', { hasVscode: !!window.vscode, windowKeys: Object.keys(window) });
          if (window.vscode) {
            console.log('contentChangedメッセージ送信中:', { command: 'contentChanged', dataKeys: Object.keys(updatedData) });
            window.vscode?.postMessage({
              command: 'contentChanged',
              data: updatedData  // contentではなくdataとして送信
            });
            console.log('VSCodeにcontentChangedメッセージを送信');
            
            // ファイル保存を少し遅延させて競合を回避
            setTimeout(() => {
              console.log('ファイル保存要求送信中');
              window.vscode?.postMessage({
                command: 'saveFile',
                data: updatedData
              });
              console.log('VSCodeにsaveFileメッセージを送信');
            }, 100);
          } else {
            console.error('window.vscodeが存在しません');
          }
          console.log('ファイル更新・保存完了');
          
          // ファイル更新後は自動でパーサーが動くので、手動での状態更新は不要
        }
      } catch (fileError) {
        console.error('ファイル書き戻しに失敗:', fileError);
        // フォールバックとしてメモリ内のみ更新
        useAppStore.setState((state) => ({
          parse: {
            ...state.parse,
            parsedData: updatedData
          }
        }));
        rendererRef.current.render(updatedData);
      }
      
      // 新しく追加されたノードを選択
      selectNode(newNode.id);
      
      console.log(`兄弟ノードを追加しました: ${newNode.id} (兄弟: ${siblingNodeId})`);
    } catch (error) {
      console.error('兄弟ノード追加に失敗:', error);
    }
  };

  // ノード削除のハンドラー関数（確認ダイアログを表示）
  const handleDeleteNode = async (nodeId: string) => {
    setNodeToDelete(nodeId);
    setIsDeleteDialogOpen(true);
  };

  // 削除確認後の実際の削除処理
  const handleConfirmDelete = async () => {
    if (!nodeToDelete || !parsedData || !rendererRef.current) return;

    try {
      console.log('ノード削除開始:', { nodeId: nodeToDelete, parsedData: !!parsedData });
      
      // データ構造を更新（不変更新） - data.rootを使用
      const mindmapData = parsedData as MindmapData;
      const rootNode = mindmapData.root;
      const updatedRootNode = removeNode(rootNode, nodeToDelete);
      const updatedData = { ...parsedData, root: updatedRootNode };
      
      // VSCodeエディターのファイル内容を更新（これが最優先）
      try {
        const platformAdapter = PlatformAdapterFactory.getInstance();
        if (platformAdapter.getPlatformType() === 'vscode') {
          
          // VSCodeにデータオブジェクトを送信（VSCode側で適切な形式に変換）
          console.log('VSCode API確認:', { hasVscode: !!window.vscode, windowKeys: Object.keys(window) });
          if (window.vscode) {
            console.log('contentChangedメッセージ送信中:', { command: 'contentChanged', dataKeys: Object.keys(updatedData) });
            window.vscode?.postMessage({
              command: 'contentChanged',
              data: updatedData
            });
            console.log('VSCodeにcontentChangedメッセージを送信');
            
            // ファイル保存を少し遅延させて競合を回避
            setTimeout(() => {
              console.log('ファイル保存要求送信中');
              window.vscode?.postMessage({
                command: 'saveFile',
                data: updatedData
              });
              console.log('VSCodeにsaveFileメッセージを送信');
            }, 100);
          } else {
            console.error('window.vscodeが存在しません');
          }
          console.log('ファイル更新・保存完了');
          
          // ファイル更新後は自動でパーサーが動くので、手動での状態更新は不要
        }
      } catch (fileError) {
        console.error('ファイル書き戻しに失敗:', fileError);
        // フォールバックとしてメモリ内のみ更新
        useAppStore.setState((state) => ({
          parse: {
            ...state.parse,
            parsedData: updatedData
          }
        }));
        rendererRef.current.render(updatedData);
      }
      
      // 削除されたノードが選択されていた場合、選択を解除
      if (selectedNodeId === nodeToDelete) {
        selectNode(null);
      }
      
      console.log(`ノードを削除しました: ${nodeToDelete}`);
    } catch (error) {
      console.error('ノード削除に失敗:', error);
      if (error instanceof Error) {
        console.error('エラースタック:', error.stack);
      }
    } finally {
      // ダイアログを閉じる
      setIsDeleteDialogOpen(false);
      setNodeToDelete(null);
    }
  };

  // 削除キャンセル
  const handleCancelDelete = () => {
    setIsDeleteDialogOpen(false);
    setNodeToDelete(null);
  };

  // イベントハンドラーの定義
  const eventHandlers: RendererEventHandlers = useMemo(() => ({
    onNodeClick: async (nodeId: string, event: MouseEvent) => {
      console.log('ノードクリック:', nodeId);
      selectNode(nodeId);
      
      // ノードが選択されたらパネルを自動で表示
      if (nodeId) {
        setIsPanelVisible(true);
      }
      
      // マインドマップファイル内の該当ノード定義箇所にジャンプ
      // 動的に追加されたノード（node_で始まる）はジャンプをスキップ
      if (!nodeId.startsWith('node_')) {
        try {
          const platformAdapter = PlatformAdapterFactory.getInstance();
          if (platformAdapter.getPlatformType() === 'vscode') {
            const _editorAdapter = platformAdapter.editor;
            // TypeScript のため一時的に any を使用 - VSCodeEditorAdapter の jumpToNodeInCurrentFile メソッドを呼び出す
            await (_editorAdapter as VSCodeEditorAdapter).jumpToNodeInCurrentFile(nodeId);
            console.log(`ノードジャンプ実行: ${nodeId}`);
          }
        } catch (error) {
          console.error('ノードジャンプに失敗:', error);
        }
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

      // Ctrl/Cmd + Shift + 0: 全体表示
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === '0') {
        event.preventDefault();
        rendererRef.current.fitToView();
        setZoomLevel(100);
      }
      // Ctrl/Cmd + 0: ビューをリセット
      else if ((event.ctrlKey || event.metaKey) && event.key === '0') {
        event.preventDefault();
        rendererRef.current.resetView();
        setZoomLevel(100);
      }
      // Ctrl/Cmd + +: ズームイン
      else if ((event.ctrlKey || event.metaKey) && (event.key === '+' || event.key === '=')) {
        event.preventDefault();
        rendererRef.current.zoomIn();
        setZoomLevel(prev => Math.min(prev + 25, 500));
      }
      // Ctrl/Cmd + -: ズームアウト
      else if ((event.ctrlKey || event.metaKey) && event.key === '-') {
        event.preventDefault();
        rendererRef.current.zoomOut();
        setZoomLevel(prev => Math.max(prev - 25, 25));
      }
      // Ctrl/Cmd + E: 全て展開
      else if ((event.ctrlKey || event.metaKey) && event.key === 'e' && !event.shiftKey) {
        event.preventDefault();
        rendererRef.current.expandAll();
      }
      // Ctrl/Cmd + Shift + E: 全て折りたたみ
      else if ((event.ctrlKey || event.metaKey) && event.shiftKey && (event.key === 'E' || event.key === 'e')) {
        event.preventDefault();
        rendererRef.current.collapseAll();
      }
      // F: 選択ノードにフォーカス
      else if (event.key === 'f' && selectedNodeId && !event.ctrlKey && !event.metaKey) {
        event.preventDefault();
        rendererRef.current.focusNode(selectedNodeId);
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
  }, [selectedNodeId, isPanelVisible, zoomLevel]);

  // VSCodeメッセージハンドラー
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      console.log('VSCodeメッセージを受信:', message);
      
      switch (message.command) {
        case 'saveComplete':
          if (message.success) {
            console.log('ファイル保存成功');
          } else {
            console.error('ファイル保存失敗:', message.error);
          }
          break;
        default:
          console.log('未知のVSCodeメッセージ:', message);
      }
    };

    // VSCode環境でのみメッセージリスナーを追加
    if (window.vscode) {
      window.addEventListener('message', handleMessage);
      return () => {
        window.removeEventListener('message', handleMessage);
      };
    }
  }, []);

  return (
    <div className="mindmap-viewer">
      {/* VSCode用のツールバー */}
      <Toolbar
        selectedNodeId={selectedNodeId}
        data={parsedData as MindmapData}
        rendererRef={rendererRef}
        onAddChild={handleAddChild}
        onAddSibling={handleAddSibling}
        onDeleteNode={handleDeleteNode}
        onTogglePanel={() => setIsPanelVisible(!isPanelVisible)}
        isPanelVisible={isPanelVisible}
        zoomLevel={zoomLevel}
        onZoomChange={setZoomLevel}
      />
      
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
        onNodeUpdate={updateNode}
        mode="vscode"
        position="bottom"
      />
      
      {/* 削除確認ダイアログ */}
      <DeleteConfirmDialog
        isOpen={isDeleteDialogOpen}
        node={nodeToDelete && parsedData ? findNodeById((parsedData as MindmapData).root, nodeToDelete) : null}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />
    </div>
  );
};