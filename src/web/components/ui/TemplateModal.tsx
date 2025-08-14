/**
 * テンプレート生成モーダルコンポーネント
 * 
 * スキーマベースのテンプレート生成機能を提供
 */

import React, { useState, useCallback } from 'react';
import { useAppStore } from '../../stores/appStore';
import { templateGeneratorService } from '../../services/templateGeneratorService';
import './TemplateModal.css';

interface TemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TemplateModal: React.FC<TemplateModalProps> = ({ isOpen, onClose }) => {
  const { updateContent, addNotification } = useAppStore();
  
  const [selectedTemplateType, setSelectedTemplateType] = useState<'starter' | 'standard' | 'enterprise'>('starter');
  const [includeExamples, setIncludeExamples] = useState(true);
  const [includeComments, setIncludeComments] = useState(true);
  const [locale, setLocale] = useState<'ja' | 'en'>('ja');
  const [isGenerating, setIsGenerating] = useState(false);

  const templateTypeOptions = [
    {
      value: 'starter' as const,
      label: 'スターター版',
      description: '基本的な要件定義（ビジネス目標 + ユーザー要件）',
      icon: '🚀',
      complexity: '低',
      timeToStart: '5分'
    },
    {
      value: 'standard' as const,
      label: 'スタンダード版',
      description: '標準的な要件定義（システム要件・ステークホルダー含む）',
      icon: '⚖️',
      complexity: '中',
      timeToStart: '15分'
    },
    {
      value: 'enterprise' as const,
      label: 'エンタープライズ版',
      description: '包括的な要件定義（トレーサビリティ・コンプライアンス含む）',
      icon: '🏢',
      complexity: '高',
      timeToStart: '30分'
    }
  ];

  /**
   * テンプレート生成ハンドラー
   */
  const handleGenerateTemplate = useCallback(async () => {
    if (isGenerating) return;

    setIsGenerating(true);
    
    try {
      const options = {
        templateType: selectedTemplateType,
        includeExamples,
        includeComments,
        locale
      };

      // 適切なスキーマファイルを選択
      const schemaPath = `/schemas/${selectedTemplateType === 'starter' ? 'simplified' : 'unified'}-requirements-schema.json`;
      
      const result = await templateGeneratorService.generateFromSchemaFile(schemaPath, options);
      
      // 生成されたテンプレートをJSONとして整形
      const formattedContent = JSON.stringify(result.data, null, 2);
      
      // エディタに設定
      updateContent(formattedContent);
      
      addNotification({
        message: `${templateTypeOptions.find(t => t.value === selectedTemplateType)?.label}テンプレートを生成しました`,
        type: 'success',
        autoHide: true,
        duration: 3000,
      });

      onClose();
      
    } catch (error) {
      console.error('Template generation failed:', error);
      addNotification({
        message: `テンプレート生成に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`,
        type: 'error',
        autoHide: true,
        duration: 5000,
      });
    } finally {
      setIsGenerating(false);
    }
  }, [selectedTemplateType, includeExamples, includeComments, locale, isGenerating, updateContent, addNotification, onClose]);

  if (!isOpen) return null;

  return (
    <div className="template-modal-overlay" onClick={onClose}>
      <div className="template-modal" onClick={(e) => e.stopPropagation()}>
        <div className="template-modal__header">
          <h2>📋 スキーマベーステンプレート生成</h2>
          <button 
            className="template-modal__close"
            onClick={onClose}
            aria-label="閉じる"
          >
            ×
          </button>
        </div>

        <div className="template-modal__content">
          {/* テンプレートタイプ選択 */}
          <div className="template-modal__section">
            <h3>テンプレートタイプ</h3>
            <div className="template-type-grid">
              {templateTypeOptions.map((option) => (
                <div
                  key={option.value}
                  className={`template-type-card ${
                    selectedTemplateType === option.value ? 'selected' : ''
                  }`}
                  onClick={() => setSelectedTemplateType(option.value)}
                >
                  <div className="template-type-card__icon">{option.icon}</div>
                  <div className="template-type-card__content">
                    <h4>{option.label}</h4>
                    <p>{option.description}</p>
                    <div className="template-type-card__meta">
                      <span className="complexity">複雑度: {option.complexity}</span>
                      <span className="time">開始時間: {option.timeToStart}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* オプション設定 */}
          <div className="template-modal__section">
            <h3>生成オプション</h3>
            <div className="template-options">
              <label className="template-option">
                <input
                  type="checkbox"
                  checked={includeExamples}
                  onChange={(e) => setIncludeExamples(e.target.checked)}
                />
                <span>サンプルデータを含める</span>
                <small>実際の要件例を自動生成します</small>
              </label>

              <label className="template-option">
                <input
                  type="checkbox"
                  checked={includeComments}
                  onChange={(e) => setIncludeComments(e.target.checked)}
                />
                <span>ヘルプコメントを含める</span>
                <small>各項目の説明コメントを追加します</small>
              </label>

              <label className="template-option">
                <span>言語設定</span>
                <select
                  value={locale}
                  onChange={(e) => setLocale(e.target.value as 'ja' | 'en')}
                >
                  <option value="ja">日本語</option>
                  <option value="en">English</option>
                </select>
              </label>
            </div>
          </div>

          {/* プレビュー情報 */}
          <div className="template-modal__section">
            <h3>生成される内容</h3>
            <div className="template-preview">
              {selectedTemplateType === 'starter' && (
                <ul>
                  <li>✅ ビジネス目標</li>
                  <li>✅ ユーザー要件</li>
                  <li>✅ 基本メタデータ</li>
                </ul>
              )}
              {selectedTemplateType === 'standard' && (
                <ul>
                  <li>✅ ビジネス目標</li>
                  <li>✅ ユーザー要件</li>
                  <li>✅ システム要件</li>
                  <li>✅ ステークホルダー管理</li>
                  <li>✅ 品質目標</li>
                </ul>
              )}
              {selectedTemplateType === 'enterprise' && (
                <ul>
                  <li>✅ スタンダード版の全機能</li>
                  <li>✅ トレーサビリティマトリクス</li>
                  <li>✅ コンプライアンス情報</li>
                  <li>✅ 詳細メトリクス</li>
                  <li>✅ 監査対応</li>
                </ul>
              )}
            </div>
          </div>
        </div>

        <div className="template-modal__footer">
          <button
            className="template-modal__button template-modal__button--secondary"
            onClick={onClose}
            disabled={isGenerating}
          >
            キャンセル
          </button>
          <button
            className="template-modal__button template-modal__button--primary"
            onClick={handleGenerateTemplate}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <>
                <span className="loading-spinner"></span>
                生成中...
              </>
            ) : (
              '📋 テンプレート生成'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TemplateModal;