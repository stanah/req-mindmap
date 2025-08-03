/**
 * 統合コンテンツ読み込みモーダル
 * テンプレート生成、サンプル読み込み、カスタムテンプレートを統合したUI
 */

import React, { useState, useCallback } from 'react';
import './ContentLoadModal.css';
import { useAppStore } from '../../stores/appStore';
import { contentLoaderService } from '../../services/contentLoaderService';
import type { ContentLoadOptions, ContentSource } from '../../services/contentLoaderService';
import type { TemplateGeneratorOptions } from '../../services/templateGeneratorService';

/**
 * Props
 */
export interface ContentLoadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * タブの種類
 */
type TabType = 'schema' | 'sample' | 'custom';

/**
 * 統合コンテンツ読み込みモーダルコンポーネント
 */
export const ContentLoadModal: React.FC<ContentLoadModalProps> = ({ isOpen, onClose }) => {
  const { updateContent, addNotification } = useAppStore();

  // UI状態
  const [activeTab, setActiveTab] = useState<TabType>('schema');
  const [isLoading, setIsLoading] = useState(false);

  // スキーマベース生成用の状態
  const [selectedSchemaTemplate, setSelectedSchemaTemplate] = useState('starter-template');
  const [includeExamples, setIncludeExamples] = useState(true);
  const [includeComments, setIncludeComments] = useState(true);
  const [locale, setLocale] = useState<'ja' | 'en'>('ja');

  // サンプル読み込み用の状態
  const [selectedSample, setSelectedSample] = useState('');

  // カスタムテンプレート用の状態
  const [customTemplatePath, setCustomTemplatePath] = useState('');

  // 利用可能なオプション
  const schemaTemplates = contentLoaderService.getAvailableSchemaTemplates();
  const availableSamples = contentLoaderService.getAvailableSamples();

  /**
   * コンテンツ読み込みハンドラー
   */
  const handleLoadContent = useCallback(async () => {
    if (isLoading) return;

    setIsLoading(true);
    
    try {
      let options: ContentLoadOptions;

      switch (activeTab) {
        case 'schema': {
          const template = schemaTemplates.find(t => t.id === selectedSchemaTemplate);
          if (!template) {
            throw new Error('選択されたテンプレートが見つかりません');
          }

          options = {
            source: 'schema',
            schemaPath: template.schemaPath,
            templateOptions: {
              templateType: template.templateType,
              includeExamples,
              includeComments,
              locale
            } as TemplateGeneratorOptions
          };
          break;
        }

        case 'sample': {
          if (!selectedSample) {
            throw new Error('サンプルを選択してください');
          }

          options = {
            source: 'sample',
            sampleId: selectedSample,
            format: 'json', // デフォルトでJSON形式
            locale
          };
          break;
        }

        case 'custom': {
          if (!customTemplatePath.trim()) {
            throw new Error('カスタムテンプレートのパスを入力してください');
          }

          options = {
            source: 'custom',
            templatePath: customTemplatePath.trim(),
            locale
          };
          break;
        }

        default:
          throw new Error('無効なタブが選択されています');
      }

      // コンテンツを読み込み
      const result = await contentLoaderService.loadContent(options);
      
      // エディタに設定
      updateContent(result.content);
      
      // 成功通知
      addNotification({
        message: `${result.metadata.title || 'コンテンツ'}を読み込みました`,
        type: 'success',
        autoHide: true,
        duration: 3000,
      });

      onClose();
      
    } catch (error) {
      console.error('Content loading failed:', error);
      addNotification({
        message: `コンテンツの読み込みに失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`,
        type: 'error',
        autoHide: true,
        duration: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  }, [
    activeTab, selectedSchemaTemplate, includeExamples, includeComments, locale,
    selectedSample, customTemplatePath, isLoading, updateContent, addNotification, onClose, schemaTemplates
  ]);

  if (!isOpen) return null;

  return (
    <div className="content-load-modal-overlay" onClick={onClose}>
      <div className="content-load-modal" onClick={(e) => e.stopPropagation()}>
        <div className="content-load-modal__header">
          <h2 className="content-load-modal__title">📄 コンテンツ読み込み</h2>
          <button 
            className="content-load-modal__close"
            onClick={onClose}
            aria-label="閉じる"
          >
            ✕
          </button>
        </div>

        {/* タブナビゲーション */}
        <div className="content-load-modal__tabs">
          <button
            className={`tab ${activeTab === 'schema' ? 'tab--active' : ''}`}
            onClick={() => setActiveTab('schema')}
          >
            🔧 スキーマベース生成
          </button>
          <button
            className={`tab ${activeTab === 'sample' ? 'tab--active' : ''}`}
            onClick={() => setActiveTab('sample')}
          >
            📋 サンプルデータ
          </button>
          <button
            className={`tab ${activeTab === 'custom' ? 'tab--active' : ''}`}
            onClick={() => setActiveTab('custom')}
          >
            🎨 カスタムテンプレート
          </button>
        </div>

        <div className="content-load-modal__content">
          {/* スキーマベース生成タブ */}
          {activeTab === 'schema' && (
            <div className="tab-content">
              <div className="form-group">
                <label htmlFor="schema-template">テンプレートタイプ</label>
                <select
                  id="schema-template"
                  value={selectedSchemaTemplate}
                  onChange={(e) => setSelectedSchemaTemplate(e.target.value)}
                >
                  {schemaTemplates.map(template => (
                    <option key={template.id} value={template.id}>
                      {template.name} - {template.description}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>オプション</label>
                <div className="checkbox-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={includeExamples}
                      onChange={(e) => setIncludeExamples(e.target.checked)}
                    />
                    サンプルデータを含める
                  </label>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={includeComments}
                      onChange={(e) => setIncludeComments(e.target.checked)}
                    />
                    ヘルプコメントを含める
                  </label>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="locale">言語</label>
                <select
                  id="locale"
                  value={locale}
                  onChange={(e) => setLocale(e.target.value as 'ja' | 'en')}
                >
                  <option value="ja">日本語</option>
                  <option value="en">English</option>
                </select>
              </div>
            </div>
          )}

          {/* サンプルデータタブ */}
          {activeTab === 'sample' && (
            <div className="tab-content">
              <div className="form-group">
                <label htmlFor="sample-select">サンプルを選択</label>
                <select
                  id="sample-select"
                  value={selectedSample}
                  onChange={(e) => setSelectedSample(e.target.value)}
                >
                  <option value="">サンプルを選択してください</option>
                  {availableSamples.map(sample => (
                    <option key={sample.id} value={sample.id}>
                      {sample.name} ({sample.format.toUpperCase()})
                    </option>
                  ))}
                </select>
              </div>

              {selectedSample && (
                <div className="sample-preview">
                  {(() => {
                    const sample = availableSamples.find(s => s.id === selectedSample);
                    return sample ? (
                      <div className="sample-info">
                        <h4>{sample.name}</h4>
                        <p>{sample.description}</p>
                        <span className="sample-format">形式: {sample.format.toUpperCase()}</span>
                      </div>
                    ) : null;
                  })()}
                </div>
              )}
            </div>
          )}

          {/* カスタムテンプレートタブ */}
          {activeTab === 'custom' && (
            <div className="tab-content">
              <div className="form-group">
                <label htmlFor="custom-path">テンプレートURL/パス</label>
                <input
                  id="custom-path"
                  type="text"
                  value={customTemplatePath}
                  onChange={(e) => setCustomTemplatePath(e.target.value)}
                  placeholder="例: /templates/my-template.json"
                />
                <small className="help-text">
                  JSONまたはYAML形式のテンプレートファイルのURLまたはパスを入力してください
                </small>
              </div>
            </div>
          )}
        </div>

        <div className="content-load-modal__footer">
          <button
            className="btn btn--secondary"
            onClick={onClose}
            disabled={isLoading}
          >
            キャンセル
          </button>
          <button
            className="btn btn--primary"
            onClick={handleLoadContent}
            disabled={isLoading}
          >
            {isLoading ? '読み込み中...' : '読み込む'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ContentLoadModal;