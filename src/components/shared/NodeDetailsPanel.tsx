/**
 * ノード詳細情報パネル（共通コンポーネント）
 * 
 * VSCode拡張版をベースとした編集機能付きノード詳細パネル
 * Web版・VSCode拡張版の両方で使用可能
 */

import React, { useState, useCallback, useEffect } from 'react';
import type { MindmapData, MindmapNode, CustomSchema } from '../../types';

interface NodeDetailsPanelProps {
  nodeId: string | null;
  data: MindmapData | null;
  isVisible: boolean;
  onToggle: () => void;
  onNodeUpdate?: (nodeId: string, updates: Partial<MindmapNode>) => void;
  // プラットフォーム固有の設定
  mode?: 'web' | 'vscode';
  position?: 'bottom' | 'sidebar';
  onClose?: () => void; // Web版互換性のため
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

/**
 * カスタムフィールドの表示名を取得
 */
const _getFieldLabel = (fieldName: string, schema?: CustomSchema): string => {
  const allFields = schema?.customFields || [];
  
  if (allFields.length === 0) return fieldName;

  const field = allFields.find((f) => f.name === fieldName);
  return field?.label || fieldName;
};

export const NodeDetailsPanel: React.FC<NodeDetailsPanelProps> = ({
  nodeId,
  data,
  isVisible,
  onToggle,
  onNodeUpdate,
  mode = 'vscode',
  position = 'bottom',
  onClose,
}) => {
  const [newTagValue, setNewTagValue] = useState('');
  const [currentTheme, setCurrentTheme] = useState<string | null>(null);

  const node = nodeId && data ? findNodeById(data.root, nodeId) : null;

  // ノード切り替え時にタグ入力をリセット
  useEffect(() => {
    setNewTagValue('');
  }, [nodeId]);

  // Web版でテーマ変更を監視
  useEffect(() => {
    if (mode !== 'web') return;

    const updateTheme = () => {
      const theme = document.documentElement.getAttribute('data-theme');
      setCurrentTheme(theme);
    };

    // 初期テーマ設定
    updateTheme();

    // MutationObserverでdata-theme属性の変更を監視
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'data-theme') {
          updateTheme();
        }
      });
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme']
    });

    return () => {
      observer.disconnect();
    };
  }, [mode]);

  // フィールド値の自動保存
  const handleFieldChange = useCallback((field: string, value: unknown) => {
    if (node && onNodeUpdate) {
      const updates = {
        [field]: value,
        updatedAt: new Date().toISOString(),
      };
      onNodeUpdate(node.id, updates);
    }
  }, [node, onNodeUpdate]);

  // カスタムフィールドの自動保存
  const handleCustomFieldChange = useCallback((fieldName: string, value: unknown) => {
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

  // Web版の閉じるボタン用ハンドラ
  const handleClose = useCallback(() => {
    if (mode === 'web' && onClose) {
      onClose();
    } else {
      onToggle();
    }
  }, [mode, onClose, onToggle]);

  // CSS クラス名の決定
  const getPanelClassName = () => {
    const baseClass = mode === 'web' ? 'node-details' : 'vscode-node-details-panel';
    const visibilityClass = isVisible ? 'visible' : 'hidden';
    const positionClass = position === 'sidebar' ? 'sidebar' : 'bottom';
    
    // Web版でもテーマクラスを適用
    const themeClass = mode === 'web' && currentTheme 
      ? currentTheme === 'dark' 
        ? 'dark-theme' 
        : 'light-theme'
      : '';
    
    return `${baseClass} ${visibilityClass} ${positionClass} ${themeClass}`.trim();
  };

  return (
    <div 
      className={getPanelClassName()} 
      data-testid="node-details-panel"
      data-theme={mode === 'web' ? currentTheme : undefined}
    >
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
            className={mode === 'web' ? 'close-btn' : 'toggle-btn'}
            onClick={handleClose}
            title={mode === 'web' ? '閉じる' : (isVisible ? 'パネルを閉じる' : 'パネルを開く')}
          >
            {mode === 'web' ? '×' : (isVisible ? '▼' : '▲')}
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
                    {onNodeUpdate ? (
                      <input
                        key={`title-${node.id}`}
                        type="text"
                        className="edit-input always-editable"
                        defaultValue={node.title}
                        onBlur={(e) => handleFieldChange('title', e.target.value)}
                        placeholder="タイトルを入力"
                      />
                    ) : (
                      <span className="value">{node.title}</span>
                    )}
                  </div>
                  <div className="details-item">
                    <label>説明:</label>
                    {onNodeUpdate ? (
                      <textarea
                        key={`description-${node.id}`}
                        className="edit-textarea always-editable"
                        defaultValue={node.description || ''}
                        onBlur={(e) => handleFieldChange('description', e.target.value)}
                        placeholder="説明を入力"
                        rows={3}
                      />
                    ) : (
                      <span className="value description">{node.description || '未設定'}</span>
                    )}
                  </div>

                  {/* タグ */}
                  <div className="details-item">
                    <label>タグ:</label>
                    <div className="tags-container">
                      {node.tags && node.tags.length > 0 && (
                        node.tags.map((tag, index) => (
                          <span key={index} className={onNodeUpdate ? "tag editable" : "tag"}>
                            {tag}
                            {onNodeUpdate && (
                              <button 
                                className="remove-tag-btn"
                                onClick={() => removeTag(index)}
                                title="タグを削除"
                              >
                                ×
                              </button>
                            )}
                          </span>
                        ))
                      )}
                      {onNodeUpdate && (
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
                      )}
                    </div>
                  </div>

                  {/* 日時情報 */}
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

                  {/* 優先度 */}
                  <div className="details-item">
                    <label>優先度:</label>
                    {onNodeUpdate ? (
                      <select
                        key={`priority-${node.id}`}
                        className="edit-select always-editable"
                        defaultValue={node.priority || ''}
                        onChange={(e) => handleFieldChange('priority', e.target.value || undefined)}
                      >
                        <option value="">未設定</option>
                        <option value="critical">緊急</option>
                        <option value="high">高</option>
                        <option value="medium">中</option>
                        <option value="low">低</option>
                      </select>
                    ) : (
                      <span className={`value priority ${node.priority || ''}`}>
                        {node.priority === 'critical' ? '緊急' : 
                         node.priority === 'high' ? '高' :
                         node.priority === 'medium' ? '中' :
                         node.priority === 'low' ? '低' : '未設定'}
                      </span>
                    )}
                  </div>

                  {/* ステータス */}
                  <div className="details-item">
                    <label>ステータス:</label>
                    {onNodeUpdate ? (
                      <select
                        key={`status-${node.id}`}
                        className="edit-select always-editable"
                        defaultValue={node.status || ''}
                        onChange={(e) => handleFieldChange('status', e.target.value || undefined)}
                      >
                        <option value="">未設定</option>
                        <option value="draft">下書き</option>
                        <option value="pending">保留</option>
                        <option value="in-progress">進行中</option>
                        <option value="review">レビュー</option>
                        <option value="done">完了</option>
                        <option value="cancelled">キャンセル</option>
                        <option value="deferred">延期</option>
                      </select>
                    ) : (
                      <span className={`value status ${node.status || ''}`}>
                        {node.status === 'draft' ? '下書き' :
                         node.status === 'pending' ? '保留' :
                         node.status === 'in-progress' ? '進行中' :
                         node.status === 'review' ? 'レビュー' :
                         node.status === 'done' ? '完了' :
                         node.status === 'cancelled' ? 'キャンセル' :
                         node.status === 'deferred' ? '延期' : '未設定'}
                      </span>
                    )}
                  </div>
                </div>


                {/* スキーマ定義フィールド */}
                {data?.schema && (
                  <>

                    {/* カスタムフィールド */}
                    {data.schema.customFields && data.schema.customFields.length > 0 && (
                      <div className="details-section">
                        <h4>カスタムフィールド</h4>
                        {data.schema.customFields.map((field) => {
                            const currentValue = (node.customFields as Record<string, unknown> | undefined)?.[field.name];
                            
                            return (
                              <div key={field.name} className="details-item">
                                <label>{field.label}:</label>
                                {onNodeUpdate ? (
                                  field.type === 'boolean' ? (
                                    <input
                                      key={`custom-${field.name}-${node.id}`}
                                      type="checkbox"
                                      className="edit-checkbox always-editable"
                                      defaultChecked={Boolean(currentValue)}
                                      onChange={(e) => handleCustomFieldChange(field.name, e.target.checked)}
                                    />
                                  ) : field.type === 'select' ? (
                                    <select
                                      key={`custom-${field.name}-${node.id}`}
                                      className="edit-select always-editable"
                                      defaultValue={String(currentValue || '')}
                                      onChange={(e) => handleCustomFieldChange(field.name, e.target.value)}
                                    >
                                      <option value="">選択してください</option>
                                      {field.options?.map((option) => (
                                        <option key={option} value={option}>
                                          {option}
                                        </option>
                                      ))}
                                    </select>
                                  ) : field.type === 'multiselect' ? (
                                    <select
                                      key={`custom-${field.name}-${node.id}`}
                                      className="edit-select always-editable"
                                      multiple
                                      defaultValue={Array.isArray(currentValue) ? currentValue : []}
                                      onChange={(e) => {
                                        const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
                                        handleCustomFieldChange(field.name, selectedOptions);
                                      }}
                                    >
                                      {field.options?.map((option) => (
                                        <option key={option} value={option}>
                                          {option}
                                        </option>
                                      ))}
                                    </select>
                                  ) : field.type === 'number' ? (
                                    <input
                                      key={`custom-${field.name}-${node.id}`}
                                      type="number"
                                      className="edit-input always-editable"
                                      defaultValue={Number(currentValue) || 0}
                                      onBlur={(e) => handleCustomFieldChange(field.name, Number(e.target.value))}
                                    />
                                  ) : field.type === 'date' ? (
                                    <input
                                      key={`custom-${field.name}-${node.id}`}
                                      type="date"
                                      className="edit-input always-editable"
                                      defaultValue={String(currentValue || '')}
                                      onBlur={(e) => handleCustomFieldChange(field.name, e.target.value)}
                                    />
                                  ) : (
                                    <input
                                      key={`custom-${field.name}-${node.id}`}
                                      type="text"
                                      className="edit-input always-editable"
                                      defaultValue={String(currentValue || '')}
                                      onBlur={(e) => handleCustomFieldChange(field.name, e.target.value)}
                                      placeholder={`${field.label}を入力`}
                                    />
                                  )
                                ) : (
                                  <span className={`field-value field-${field.name}`}>
                                    {formatValue(currentValue)}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                      </div>
                    )}

                  </>
                )}

              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};