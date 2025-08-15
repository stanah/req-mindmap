/**
 * VSCode拡張用のノードアクションボタン
 * 選択されたノードに対して子・兄弟ノードの追加を行う
 */

import React from 'react';
import type { MindmapNode, MindmapData } from '../../types';
import { findNodeById, findParentNode } from '../../utils/nodeHelpers';
import './NodeActionButtons.css';

interface NodeActionButtonsProps {
  selectedNodeId: string | null;
  data: MindmapNode | null;
  onAddChild: (parentNodeId: string) => void;
  onAddSibling: (siblingNodeId: string) => void;
  onDeleteNode: (nodeId: string) => void;
  className?: string;
}

export const NodeActionButtons: React.FC<NodeActionButtonsProps> = ({
  selectedNodeId,
  data,
  onAddChild,
  onAddSibling,
  onDeleteNode,
  className = ''
}) => {


  // 選択されたノードがない場合は案内メッセージを表示
  if (!selectedNodeId || !data) {
    return (
      <div className={`node-action-buttons ${className}`}>
        <div className="node-action-buttons__placeholder">
          <span className="node-action-buttons__hint">
            ノードを選択してください
          </span>
        </div>
      </div>
    );
  }

  // YAMLの構造を確認 - ルートノードはdata.rootにある
  const mindmapData = data as MindmapData;
  const rootNode = mindmapData.root;
  
  if (!rootNode) {
    return null;
  }

  const selectedNode = findNodeById(rootNode, selectedNodeId);
  const parentNode = findParentNode(rootNode, selectedNodeId);

  // 選択されたノードが見つからない場合は何も表示しない
  if (!selectedNode) {
    return null;
  }

  const handleAddChild = () => {
    onAddChild(selectedNodeId);
  };

  const handleAddSibling = () => {
    // ルートノードの場合は兄弟を追加できない
    if (!parentNode) {
      console.warn('ルートノードには兄弟ノードを追加できません');
      return;
    }
    onAddSibling(selectedNodeId);
  };

  const handleDeleteNode = () => {
    // ルートノードの削除は禁止
    if (!parentNode) {
      console.warn('ルートノードは削除できません');
      return;
    }
    onDeleteNode(selectedNodeId);
  };

  return (
    <div className={`node-action-buttons ${className}`}>
      <div className="node-action-buttons__header">
        <span className="node-action-buttons__title">
          選択中: {selectedNode.title}
        </span>
      </div>
      
      <div className="node-action-buttons__actions">
        <button
          className="node-action-button node-action-button--child"
          onClick={handleAddChild}
          title="選択されたノードに子ノードを追加"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 2a1 1 0 0 1 1 1v4h4a1 1 0 1 1 0 2H9v4a1 1 0 1 1-2 0V9H3a1 1 0 1 1 0-2h4V3a1 1 0 0 1 1-1z"/>
          </svg>
          子を追加
        </button>
        
        <button
          className="node-action-button node-action-button--sibling"
          onClick={handleAddSibling}
          disabled={!parentNode}
          title={parentNode ? "選択されたノードと同じ階層に兄弟ノードを追加" : "ルートノードには兄弟ノードを追加できません"}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 2a1 1 0 0 1 1 1v4h4a1 1 0 1 1 0 2H9v4a1 1 0 1 1-2 0V9H3a1 1 0 1 1 0-2h4V3a1 1 0 0 1 1-1z"/>
          </svg>
          兄弟を追加
        </button>
        
        <button
          className="node-action-button node-action-button--delete"
          onClick={handleDeleteNode}
          disabled={!parentNode}
          title={parentNode ? "選択されたノードを削除（子ノードも一緒に削除されます）" : "ルートノードは削除できません"}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M3.5 2.75a.75.75 0 0 1 .75-.75h8a.75.75 0 0 1 0 1.5h-8a.75.75 0 0 1-.75-.75zM4.5 4.5a.5.5 0 0 1 .5-.5h6a.5.5 0 0 1 .5.5v8a1.5 1.5 0 0 1-1.5 1.5H6A1.5 1.5 0 0 1 4.5 12.5v-8zM6 6a.5.5 0 0 1 .5.5v4a.5.5 0 0 1-1 0v-4A.5.5 0 0 1 6 6zm3 0a.5.5 0 0 1 .5.5v4a.5.5 0 0 1-1 0v-4A.5.5 0 0 1 9 6z"/>
          </svg>
          削除
        </button>
      </div>
    </div>
  );
};