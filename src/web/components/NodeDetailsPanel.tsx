/**
 * ノード詳細情報パネル
 * 
 * 選択されたノードの詳細情報を表示するパネルコンポーネント
 */

import React from 'react';
import type { MindmapData, MindmapNode, CustomSchema } from '../../types/mindmap';

interface NodeDetailsPanelProps {
  nodeId: string;
  data: MindmapData;
  onClose: () => void;
}

/**
 * ノードをIDで検索
 */
const findNodeById = (node: MindmapNode, id: string): MindmapNode | null => {
  if (node.id === id) {
    return node;
  }

  if (node.children) {
    for (const child of node.children) {
      const found = findNodeById(child, id);
      if (found) return found;
    }
  }

  return null;
};

/**
 * カスタムフィールドの表示名を取得
 */
const getFieldLabel = (fieldName: string, schema?: CustomSchema): string => {
  if (!schema?.fields) return fieldName;

  const field = schema.fields.find((f) => f.name === fieldName);
  return field?.label || fieldName;
};

/**
 * 値をフォーマット
 */
const formatValue = (value: unknown): string => {
  if (value === null || value === undefined) {
    return '未設定';
  }

  if (typeof value === 'boolean') {
    return value ? 'はい' : 'いいえ';
  }

  if (Array.isArray(value)) {
    return value.join(', ');
  }

  return String(value);
};

export const NodeDetailsPanel: React.FC<NodeDetailsPanelProps> = ({
  nodeId,
  data,
  onClose,
}) => {
  const node = findNodeById(data.root, nodeId);

  if (!node) {
    return (
      <div className="node-details">
        <div className="node-details-header">
          <h3>ノードが見つかりません</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
      </div>
    );
  }

  return (
    <div className="node-details" data-testid="node-details-panel">
      <div className="node-details-header">
        <h3>{node.title}</h3>
        <button className="close-btn" onClick={onClose} title="閉じる">×</button>
      </div>

      <div className="node-details-content">
        {/* 基本情報 */}
        <div className="details-section">
          <h4>基本情報</h4>
          <div className="details-item">
            <label>ID:</label>
            <span>{node.id}</span>
          </div>
          <div className="details-item">
            <label>タイトル:</label>
            <span>{node.title}</span>
          </div>
          {node.description && (
            <div className="details-item">
              <label>説明:</label>
              <span className="description">{node.description}</span>
            </div>
          )}
          {node.type && (
            <div className="details-item">
              <label>種類:</label>
              <span>{node.type}</span>
            </div>
          )}
        </div>

        {/* メタデータ */}
        {node.metadata && Object.keys(node.metadata).length > 0 && (
          <div className="details-section">
            <h4>メタデータ</h4>
            {Object.entries(node.metadata).map(([key, value]) => (
              <div key={key} className="details-item">
                <label>{key}:</label>
                <span>{formatValue(value)}</span>
              </div>
            ))}
          </div>
        )}

        {/* カスタムフィールド */}
        {node.customFields && Object.keys(node.customFields).length > 0 && (
          <div className="details-section">
            <h4>カスタムフィールド</h4>
            {Object.entries(node.customFields).map(([key, value]) => (
              <div key={key} className="details-item">
                <label>{getFieldLabel(key, data.schema)}:</label>
                <span className={`field-value field-${key}`}>
                  {formatValue(value)}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* 階層情報 */}
        <div className="details-section">
          <h4>階層情報</h4>
          {node.children && node.children.length > 0 && (
            <div className="details-item">
              <label>子ノード数:</label>
              <span>{node.children.length}</span>
            </div>
          )}
          <div className="details-item">
            <label>折りたたみ状態:</label>
            <span>{node.collapsed ? '折りたたみ' : '展開'}</span>
          </div>
        </div>

        {/* 関連リンク */}
        {node.links && node.links.length > 0 && (
          <div className="details-section">
            <h4>関連リンク</h4>
            {node.links.map((link, index) => (
              <div key={index} className="details-item">
                <label>{link.title || 'リンク'}:</label>
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="link-url"
                >
                  {link.url}
                </a>
              </div>
            ))}
          </div>
        )}

        {/* タグ */}
        {node.tags && node.tags.length > 0 && (
          <div className="details-section">
            <h4>タグ</h4>
            <div className="tags-container">
              {node.tags.map((tag, index) => (
                <span key={index} className="tag">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 日時情報 */}
        {(node.createdAt || node.updatedAt || node.deadline) && (
          <div className="details-section">
            <h4>日時情報</h4>
            {node.createdAt && (
              <div className="details-item">
                <label>作成日時:</label>
                <span>{new Date(node.createdAt).toLocaleString('ja-JP')}</span>
              </div>
            )}
            {node.updatedAt && (
              <div className="details-item">
                <label>更新日時:</label>
                <span>{new Date(node.updatedAt).toLocaleString('ja-JP')}</span>
              </div>
            )}
            {node.deadline && (
              <div className="details-item">
                <label>期限:</label>
                <span className="deadline">{new Date(node.deadline).toLocaleString('ja-JP')}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};