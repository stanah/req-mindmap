/**
 * VSCode拡張用ノード詳細情報パネル（画面下部固定・編集機能付き）
 * 
 * 選択されたノードの詳細情報を画面下部に固定表示するパネルコンポーネント
 * 編集モードでノード情報を変更可能
 */

import React, { useState, useCallback } from 'react';
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
  isVisible,
  onToggle,
  onNodeUpdate,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedValues, setEditedValues] = useState<Partial<MindmapNode>>({});

  const node = nodeId && data ? findNodeById(data.root, nodeId) : null;

  // 編集モードの開始
  const startEditing = useCallback(() => {
    if (node) {
      setEditedValues({
        title: node.title,
        description: node.description || '',
        type: node.type || '',
        customFields: { ...node.customFields },
        metadata: { ...node.metadata },
        tags: [...(node.tags || [])],
      });
      setIsEditing(true);
    }
  }, [node]);

  // 編集のキャンセル
  const cancelEditing = useCallback(() => {
    setIsEditing(false);
    setEditedValues({});
  }, []);

  // 変更の保存
  const saveChanges = useCallback(() => {
    if (node && onNodeUpdate) {
      // 更新日時を自動設定
      const updates = {
        ...editedValues,
        updatedAt: new Date().toISOString(),
      };
      
      onNodeUpdate(node.id, updates);
      setIsEditing(false);
      setEditedValues({});
    }
  }, [node, editedValues, onNodeUpdate]);

  // 入力値の更新
  const updateEditedValue = useCallback((field: string, value: any) => {
    setEditedValues(prev => ({
      ...prev,
      [field]: value,
    }));
  }, []);

  // カスタムフィールドの更新
  const updateCustomField = useCallback((fieldName: string, value: any) => {
    setEditedValues(prev => ({
      ...prev,
      customFields: {
        ...prev.customFields,
        [fieldName]: value,
      },
    }));
  }, []);

  // タグの追加
  const addTag = useCallback((tag: string) => {
    if (tag.trim()) {
      setEditedValues(prev => ({
        ...prev,
        tags: [...(prev.tags || []), tag.trim()],
      }));
    }
  }, []);

  // タグの削除
  const removeTag = useCallback((index: number) => {
    setEditedValues(prev => ({
      ...prev,
      tags: (prev.tags || []).filter((_, i) => i !== index),
    }));
  }, []);

  return (
    <div className={`vscode-node-details-panel ${isVisible ? 'visible' : 'hidden'}`}>
      {/* パネルヘッダー */}
      <div className="panel-header">
        <div className="panel-title">
          {node ? (
            <>
              <span className="node-icon">📄</span>
              <span className="node-title">{node.title}</span>
              {isEditing && <span className="edit-indicator">(編集中)</span>}
            </>
          ) : (
            <span>ノード詳細</span>
          )}
        </div>
        <div className="header-actions">
          {node && !isEditing && onNodeUpdate && (
            <button 
              className="edit-btn" 
              onClick={startEditing}
              title="編集モード"
            >
              ✏️
            </button>
          )}
          {isEditing && (
            <>
              <button 
                className="save-btn" 
                onClick={saveChanges}
                title="保存"
              >
                💾
              </button>
              <button 
                className="cancel-btn" 
                onClick={cancelEditing}
                title="キャンセル"
              >
                ❌
              </button>
            </>
          )}
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
                    {isEditing ? (
                      <input
                        type="text"
                        className="edit-input"
                        value={editedValues.title || ''}
                        onChange={(e) => updateEditedValue('title', e.target.value)}
                        placeholder="タイトルを入力"
                      />
                    ) : (
                      <span className="value">{node.title}</span>
                    )}
                  </div>
                  <div className="details-item">
                    <label>説明:</label>
                    {isEditing ? (
                      <textarea
                        className="edit-textarea"
                        value={editedValues.description || ''}
                        onChange={(e) => updateEditedValue('description', e.target.value)}
                        placeholder="説明を入力"
                        rows={3}
                      />
                    ) : (
                      <span className="value description">{node.description || '未設定'}</span>
                    )}
                  </div>
                  <div className="details-item">
                    <label>種類:</label>
                    {isEditing ? (
                      <input
                        type="text"
                        className="edit-input"
                        value={editedValues.type || ''}
                        onChange={(e) => updateEditedValue('type', e.target.value)}
                        placeholder="種類を入力"
                      />
                    ) : (
                      <span className="value">{node.type || '未設定'}</span>
                    )}
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
                {((node.customFields && Object.keys(node.customFields).length > 0) || isEditing) && (
                  <div className="details-section">
                    <h4>カスタムフィールド</h4>
                    {data?.schema?.fields?.map((field) => {
                      const currentValue = isEditing 
                        ? editedValues.customFields?.[field.name]
                        : node.customFields?.[field.name];
                      
                      return (
                        <div key={field.name} className="details-item">
                          <label>{field.label}:</label>
                          {isEditing ? (
                            field.type === 'boolean' ? (
                              <input
                                type="checkbox"
                                className="edit-checkbox"
                                checked={Boolean(currentValue)}
                                onChange={(e) => updateCustomField(field.name, e.target.checked)}
                              />
                            ) : field.type === 'number' ? (
                              <input
                                type="number"
                                className="edit-input"
                                value={Number(currentValue) || 0}
                                onChange={(e) => updateCustomField(field.name, Number(e.target.value))}
                              />
                            ) : (
                              <input
                                type="text"
                                className="edit-input"
                                value={String(currentValue || '')}
                                onChange={(e) => updateCustomField(field.name, e.target.value)}
                                placeholder={`${field.label}を入力`}
                              />
                            )
                          ) : (
                            <span className={`value field-value field-${field.name}`}>
                              {formatValue(currentValue)}
                            </span>
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
                    {isEditing ? (
                      <>
                        {(editedValues.tags || []).map((tag, index) => (
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
                        ))}
                        <input
                          type="text"
                          className="add-tag-input"
                          placeholder="タグを追加してEnter"
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              addTag(e.currentTarget.value);
                              e.currentTarget.value = '';
                            }
                          }}
                        />
                      </>
                    ) : (
                      node.tags && node.tags.length > 0 ? (
                        node.tags.map((tag, index) => (
                          <span key={index} className="tag">
                            {tag}
                          </span>
                        ))
                      ) : (
                        <span className="value">タグなし</span>
                      )
                    )}
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