/**
 * VSCode拡張用ノード詳細情報パネル（画面下部固定・編集機能付き）
 * 
 * 選択されたノードの詳細情報を画面下部に固定表示するパネルコンポーネント
 * 編集モードでノード情報を変更可能
 */

import React, { useState, useCallback, useEffect } from 'react';
import type { MindmapData, MindmapNode, CustomSchema } from '../../types/mindmap';

interface NodeDetailsPanelProps {
  nodeId: string | null;
  data: MindmapData | null;
  isVisible: boolean;
  onToggle: () => void;
  onNodeUpdate?: (nodeId: string, updates: Partial<MindmapNode>) => void;
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
  isVisible,
  onToggle,
  onNodeUpdate,
}) => {
  const [newTagValue, setNewTagValue] = useState('');

  const node = nodeId && data ? findNodeById(data.root, nodeId) : null;

  // ノード切り替え時にタグ入力をリセット
  useEffect(() => {
    setNewTagValue('');
  }, [nodeId]);

  // フィールド値の自動保存
  const handleFieldChange = useCallback((field: string, value: any) => {
    if (node && onNodeUpdate) {
      const updates = {
        [field]: value,
        updatedAt: new Date().toISOString(),
      };
      onNodeUpdate(node.id, updates);
    }
  }, [node, onNodeUpdate]);

  // カスタムフィールドの自動保存
  const handleCustomFieldChange = useCallback((fieldName: string, value: any) => {
    if (node && onNodeUpdate) {
      const updates = {
        customFields: {
          ...node.customFields,
          [fieldName]: value,
        },
        updatedAt: new Date().toISOString(),
      };
      onNodeUpdate(node.id, updates);
    }
  }, [node, onNodeUpdate]);

  // タグの追加
  const addTag = useCallback((tag: string) => {
    if (tag.trim() && node && onNodeUpdate) {
      const newTags = [...(node.tags || []), tag.trim()];
      const updates = {
        tags: newTags,
        updatedAt: new Date().toISOString(),
      };
      onNodeUpdate(node.id, updates);
      setNewTagValue('');
    }
  }, [node, onNodeUpdate]);

  // タグの削除
  const removeTag = useCallback((index: number) => {
    if (node && onNodeUpdate) {
      const newTags = (node.tags || []).filter((_, i) => i !== index);
      const updates = {
        tags: newTags,
        updatedAt: new Date().toISOString(),
      };
      onNodeUpdate(node.id, updates);
    }
  }, [node, onNodeUpdate]);

  return (
    <div className={`vscode-node-details-panel ${isVisible ? 'visible' : 'hidden'}`}>
      {/* パネルヘッダー */}
      <div className="panel-header">
        <div className="panel-title">
          {node ? (
            <>
              <span className="node-icon">📄</span>
              <span className="node-title">{node.title}</span>
            </>
          ) : (
            <span>ノード詳細</span>
          )}
        </div>
        <div className="header-actions">
          <button 
            className="toggle-btn" 
            onClick={onToggle}
            title={isVisible ? 'パネルを閉じる' : 'パネルを開く'}
          >
            {isVisible ? '▼' : '▲'}
          </button>
        </div>
      </div>

      {/* パネル内容 */}
      {isVisible && (
        <div className="panel-content">
          {!node ? (
            <div className="no-selection">
              <p>ノードを選択してください</p>
            </div>
          ) : (
            <div className="node-details-content">
              <div className="details-grid">
                {/* 基本情報 */}
                <div className="details-section">
                  <h4>基本情報</h4>
                  <div className="details-item">
                    <label>ID:</label>
                    <span className="value">{node.id}</span>
                  </div>
                  <div className="details-item">
                    <label>タイトル:</label>
                    <input
                      key={`title-${node.id}`}
                      type="text"
                      className="edit-input always-editable"
                      defaultValue={node.title}
                      onBlur={(e) => handleFieldChange('title', e.target.value)}
                      placeholder="タイトルを入力"
                    />
                  </div>
                  <div className="details-item">
                    <label>説明:</label>
                    <textarea
                      key={`description-${node.id}`}
                      className="edit-textarea always-editable"
                      defaultValue={node.description || ''}
                      onBlur={(e) => handleFieldChange('description', e.target.value)}
                      placeholder="説明を入力"
                      rows={3}
                    />
                  </div>
                  <div className="details-item">
                    <label>種類:</label>
                    <input
                      key={`type-${node.id}`}
                      type="text"
                      className="edit-input always-editable"
                      defaultValue={node.type || ''}
                      onBlur={(e) => handleFieldChange('type', e.target.value)}
                      placeholder="種類を入力"
                    />
                  </div>
                </div>

                {/* 階層情報 */}
                <div className="details-section">
                  <h4>階層情報</h4>
                  {node.children && node.children.length > 0 && (
                    <div className="details-item">
                      <label>子ノード数:</label>
                      <span className="value">{node.children.length}</span>
                    </div>
                  )}
                  <div className="details-item">
                    <label>状態:</label>
                    <span className="value">{node.collapsed ? '折りたたみ' : '展開'}</span>
                  </div>
                </div>

                {/* メタデータ */}
                {node.metadata && Object.keys(node.metadata).length > 0 && (
                  <div className="details-section">
                    <h4>メタデータ</h4>
                    {Object.entries(node.metadata).map(([key, value]) => (
                      <div key={key} className="details-item">
                        <label>{key}:</label>
                        <span className="value">{formatValue(value)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* カスタムフィールド */}
                {(node.customFields && Object.keys(node.customFields).length > 0) && (
                  <div className="details-section">
                    <h4>カスタムフィールド</h4>
                    {data?.schema?.fields?.map((field) => {
                      const currentValue = node.customFields?.[field.name];
                      
                      return (
                        <div key={field.name} className="details-item">
                          <label>{field.label}:</label>
                          {field.type === 'boolean' ? (
                            <input
                              key={`${field.name}-${node.id}`}
                              type="checkbox"
                              className="edit-checkbox always-editable"
                              defaultChecked={Boolean(currentValue)}
                              onChange={(e) => handleCustomFieldChange(field.name, e.target.checked)}
                            />
                          ) : field.type === 'number' ? (
                            <input
                              key={`${field.name}-${node.id}`}
                              type="number"
                              className="edit-input always-editable"
                              defaultValue={Number(currentValue) || 0}
                              onBlur={(e) => handleCustomFieldChange(field.name, Number(e.target.value))}
                            />
                          ) : (
                            <input
                              key={`${field.name}-${node.id}`}
                              type="text"
                              className="edit-input always-editable"
                              defaultValue={String(currentValue || '')}
                              onBlur={(e) => handleCustomFieldChange(field.name, e.target.value)}
                              placeholder={`${field.label}を入力`}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* タグ */}
                <div className="details-section">
                  <h4>タグ</h4>
                  <div className="tags-container">
                    {node.tags && node.tags.length > 0 && (
                      node.tags.map((tag, index) => (
                        <span key={index} className="tag editable">
                          {tag}
                          <button 
                            className="remove-tag-btn"
                            onClick={() => removeTag(index)}
                            title="タグを削除"
                          >
                            ×
                          </button>
                        </span>
                      ))
                    )}
                    <input
                      key={`add-tag-${node.id}`}
                      type="text"
                      className="add-tag-input always-editable"
                      value={newTagValue}
                      onChange={(e) => setNewTagValue(e.target.value)}
                      placeholder="タグを追加してEnter"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          addTag(newTagValue);
                        }
                      }}
                    />
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

                {/* 日時情報 */}
                {(node.createdAt || node.updatedAt || node.deadline) && (
                  <div className="details-section">
                    <h4>日時情報</h4>
                    {node.createdAt && (
                      <div className="details-item">
                        <label>作成日時:</label>
                        <span className="value">{new Date(node.createdAt).toLocaleString('ja-JP')}</span>
                      </div>
                    )}
                    {node.updatedAt && (
                      <div className="details-item">
                        <label>更新日時:</label>
                        <span className="value">{new Date(node.updatedAt).toLocaleString('ja-JP')}</span>
                      </div>
                    )}
                    {node.deadline && (
                      <div className="details-item">
                        <label>期限:</label>
                        <span className="value deadline">{new Date(node.deadline).toLocaleString('ja-JP')}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};