/**
 * VSCode拡張用のノードアクションボタン
 * 選択されたノードに対して子・兄弟ノードの追加を行う
 */

import React from 'react';
import { MdAdd, MdDelete, MdExpandMore, MdExpandLess } from 'react-icons/md';
import type { MindmapData } from '../../types';
import { findNodeById, findParentNode } from '../../utils/nodeHelpers';
import './NodeActionButtons.css';

interface NodeActionButtonsProps {
  selectedNodeId: string | null;
  data: MindmapData | null;
  onAddChild: (parentNodeId: string) => void;
  onAddSibling: (siblingNodeId: string) => void;
  onDeleteNode: (nodeId: string) => void;
  onExpandNode?: (nodeId: string) => void;
  onCollapseNode?: (nodeId: string) => void;
  isNodeCollapsed?: (nodeId: string) => boolean;
  className?: string;
}

export const NodeActionButtons: React.FC<NodeActionButtonsProps> = ({
  selectedNodeId,
  data,
  onAddChild,
  onAddSibling,
  onDeleteNode,
  onExpandNode,
  onCollapseNode,
  isNodeCollapsed,
  className = ''
}) => {


  // 選択されたノードがない場合はボタンを無効化して表示
  if (!selectedNodeId || !data) {
    return (
      <div className={`node-action-buttons ${className}`}>
        <button className="node-action-button" disabled title="ノードを選択してください">
          <MdAdd size={16} />
        </button>
        <button className="node-action-button" disabled title="ノードを選択してください">
          <MdAdd size={16} />
        </button>
        <button className="node-action-button" disabled title="ノードを選択してください">
          <MdExpandMore size={16} />
        </button>
        <button className="node-action-button" disabled title="ノードを選択してください">
          <MdDelete size={16} />
        </button>
      </div>
    );
  }

  // YAMLの構造を確認 - ルートノードはdata.rootにある
  const rootNode = data.root;
  
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

  const handleToggleExpand = () => {
    if (!onExpandNode || !onCollapseNode || !isNodeCollapsed) {
      return;
    }
    
    if (isNodeCollapsed(selectedNodeId)) {
      onExpandNode(selectedNodeId);
    } else {
      onCollapseNode(selectedNodeId);
    }
  };

  // 子ノードの有無をチェック
  const hasChildren = selectedNode.children && selectedNode.children.length > 0;
  
  // 折りたたみ状態を取得
  const collapsed = isNodeCollapsed ? isNodeCollapsed(selectedNodeId) : false;

  return (
    <div className={`node-action-buttons ${className}`}>
      <button
        className="node-action-button node-action-button--child"
        onClick={handleAddChild}
        title="子ノードを追加"
      >
        <MdAdd size={16} />
      </button>
      
      <button
        className="node-action-button node-action-button--sibling"
        onClick={handleAddSibling}
        disabled={!parentNode}
        title={parentNode ? "兄弟ノードを追加" : "ルートノードには兄弟ノードを追加できません"}
      >
        <MdAdd size={16} />
      </button>
      
      <button
        className="node-action-button node-action-button--expand"
        onClick={handleToggleExpand}
        disabled={!hasChildren || !onExpandNode || !onCollapseNode}
        title={
          !hasChildren 
            ? "子ノードがありません" 
            : collapsed 
              ? "ノードを展開"
              : "ノードを折りたたみ"
        }
      >
        {collapsed ? <MdExpandMore size={16} /> : <MdExpandLess size={16} />}
      </button>
      
      <button
        className="node-action-button node-action-button--delete"
        onClick={handleDeleteNode}
        disabled={!parentNode}
        title={parentNode ? "ノードを削除" : "ルートノードは削除できません"}
      >
        <MdDelete size={16} />
      </button>
    </div>
  );
};