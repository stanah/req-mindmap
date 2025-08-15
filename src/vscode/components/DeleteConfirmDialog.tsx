/**
 * VSCode拡張用の削除確認ダイアログ
 */

import React from 'react';
import type { MindmapNode } from '../../types/generated/mindmap';
import './DeleteConfirmDialog.css';

interface DeleteConfirmDialogProps {
  isOpen: boolean;
  node: MindmapNode | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export const DeleteConfirmDialog: React.FC<DeleteConfirmDialogProps> = ({
  isOpen,
  node,
  onConfirm,
  onCancel
}) => {
  if (!isOpen || !node) {
    return null;
  }

  // 子ノードの数をカウント
  const getDescendantCount = (node: MindmapNode): number => {
    let count = 0;
    if (node.children) {
      count += node.children.length;
      for (const child of node.children) {
        count += getDescendantCount(child);
      }
    }
    return count;
  };

  const descendantCount = getDescendantCount(node);
  const hasChildren = descendantCount > 0;

  return (
    <div className="delete-confirm-overlay">
      <div className="delete-confirm-dialog">
        <div className="delete-confirm-header">
          <h3>ノード削除の確認</h3>
        </div>
        
        <div className="delete-confirm-content">
          <div className="delete-confirm-node-info">
            <strong>削除対象:</strong> {node.title}
          </div>
          
          {hasChildren && (
            <div className="delete-confirm-warning">
              <div className="warning-icon">⚠️</div>
              <div className="warning-text">
                このノードには <strong>{descendantCount}個</strong> の子ノードが含まれています。<br />
                削除すると、すべての子ノードも一緒に削除されます。
              </div>
            </div>
          )}
          
          <div className="delete-confirm-message">
            この操作は取り消せません。削除しますか？
          </div>
        </div>
        
        <div className="delete-confirm-actions">
          <button
            className="delete-confirm-button delete-confirm-button--cancel"
            onClick={onCancel}
          >
            キャンセル
          </button>
          <button
            className="delete-confirm-button delete-confirm-button--delete"
            onClick={onConfirm}
            autoFocus
          >
            削除する
          </button>
        </div>
      </div>
    </div>
  );
};