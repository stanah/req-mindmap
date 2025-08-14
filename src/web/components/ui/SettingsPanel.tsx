/**
 * 設定管理パネルコンポーネント
 * 
 * アプリケーション設定の変更、エクスポート・インポート、
 * セッション管理機能を提供するパネル
 */

import React, { useState, useRef } from 'react';
import { useAppStore } from '../../../stores/appStore';
import { settingsService } from '../../../services/settingsService';
import { ContentLoadModal } from './ContentLoadModal';
import type { EditorSettings, MindmapSettings } from '../../../types/mindmap';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ isOpen, onClose }) => {
  const {
    ui: { editorSettings, mindmapSettings },
    updateEditorSettings,
    updateMindmapSettings,
    addNotification,
    exportSettings,
    importSettings,
    resetSettings,
  } = useAppStore();

  const [activeTab, setActiveTab] = useState<'editor' | 'mindmap' | 'content' | 'session' | 'about'>('editor');
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [showContentLoadModal, setShowContentLoadModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  /**
   * エディタ設定の更新
   */
  const handleEditorSettingChange = <K extends keyof EditorSettings>(
    setting: K, 
    value: EditorSettings[K]
  ) => {
    updateEditorSettings({ [setting]: value });
    
    addNotification({
      message: 'エディタ設定を更新しました',
      type: 'success',
      autoHide: true,
      duration: 2000,
    });
  };

  /**
   * マインドマップ設定の更新
   */
  const handleMindmapSettingChange = <K extends keyof MindmapSettings>(
    setting: K, 
    value: MindmapSettings[K]
  ) => {
    updateMindmapSettings({ [setting]: value });
    
    addNotification({
      message: 'マインドマップ設定を更新しました',
      type: 'success',
      autoHide: true,
      duration: 2000,
    });
  };

  /**
   * 設定をエクスポート
   */
  const handleExportSettings = async () => {
    setIsExporting(true);
    try {
      const settings = exportSettings();
      const blob = new Blob([JSON.stringify(settings, null, 2)], { 
        type: 'application/json' 
      });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `mindmap-settings-${new Date().toISOString().split('T')[0]}.json`;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);

      addNotification({
        message: '設定をエクスポートしました',
        type: 'success',
        autoHide: true,
        duration: 3000,
      });
    } catch {
      addNotification({
        message: '設定のエクスポートに失敗しました',
        type: 'error',
        autoHide: true,
        duration: 5000,
      });
    } finally {
      setIsExporting(false);
    }
  };

  /**
   * 設定をインポート
   */
  const handleImportSettings = () => {
    fileInputRef.current?.click();
  };

  /**
   * ファイル選択時の処理
   */
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const text = await file.text();
      const settings = JSON.parse(text);
      
      importSettings(settings);
      
      addNotification({
        message: '設定をインポートしました',
        type: 'success',
        autoHide: true,
        duration: 3000,
      });
    } catch {
      addNotification({
        message: '設定のインポートに失敗しました。正しいJSONファイルを選択してください。',
        type: 'error',
        autoHide: true,
        duration: 5000,
      });
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  /**
   * 設定をリセット
   */
  const handleResetSettings = () => {
    if (window.confirm('設定をデフォルトに戻しますか？この操作は元に戻せません。')) {
      resetSettings();
      
      addNotification({
        message: '設定をリセットしました',
        type: 'info',
        autoHide: true,
        duration: 3000,
      });
    }
  };

  /**
   * セッションデータをクリア
   */
  const handleClearSession = () => {
    if (window.confirm('セッションデータをクリアしますか？最近開いたファイルの履歴などが削除されます。')) {
      settingsService.clearSessionState();
      settingsService.clearRecentFiles();
      settingsService.clearAutoSaveData();
      
      addNotification({
        message: 'セッションデータをクリアしました',
        type: 'info',
        autoHide: true,
        duration: 3000,
      });
    }
  };

  /**
   * ストレージ使用量を取得
   */
  const getStorageUsage = () => {
    const usage = settingsService.getStorageUsage();
    const totalKB = Math.round(usage.total / 1024 * 100) / 100;
    return totalKB;
  };

  return (
    <div className="settings-panel-overlay" onClick={onClose}>
      <div className="settings-panel" onClick={(e) => e.stopPropagation()}>
        {/* ヘッダー */}
        <div className="settings-header">
          <h2>設定</h2>
          <button className="close-btn" onClick={onClose} title="閉じる">
            ✕
          </button>
        </div>

        {/* タブ */}
        <div className="settings-tabs">
          <button
            className={`tab-btn ${activeTab === 'editor' ? 'active' : ''}`}
            onClick={() => setActiveTab('editor')}
          >
            📝 エディタ
          </button>
          <button
            className={`tab-btn ${activeTab === 'mindmap' ? 'active' : ''}`}
            onClick={() => setActiveTab('mindmap')}
          >
            🗺️ マインドマップ
          </button>
          <button
            className={`tab-btn ${activeTab === 'content' ? 'active' : ''}`}
            onClick={() => setActiveTab('content')}
          >
            📚 コンテンツ
          </button>
          <button
            className={`tab-btn ${activeTab === 'session' ? 'active' : ''}`}
            onClick={() => setActiveTab('session')}
          >
            💾 セッション
          </button>
          <button
            className={`tab-btn ${activeTab === 'about' ? 'active' : ''}`}
            onClick={() => setActiveTab('about')}
          >
            ℹ️ 情報
          </button>
        </div>

        {/* コンテンツ */}
        <div className="settings-content">
          {/* エディタ設定 */}
          {activeTab === 'editor' && (
            <div className="setting-section">
              <h3>エディタ設定</h3>
              
              <div className="setting-group">
                <label className="setting-label">言語</label>
                <select
                  value={editorSettings.language}
                  onChange={(e) => handleEditorSettingChange('language', e.target.value as 'json' | 'yaml')}
                  className="setting-select"
                >
                  <option value="json">JSON</option>
                  <option value="yaml">YAML</option>
                </select>
              </div>

              <div className="setting-group">
                <label className="setting-label">テーマ</label>
                <select
                  value={editorSettings.theme}
                  onChange={(e) => handleEditorSettingChange('theme', e.target.value as 'vs-light' | 'vs-dark' | 'hc-black')}
                  className="setting-select"
                >
                  <option value="vs-light">ライト</option>
                  <option value="vs-dark">ダーク</option>
                  <option value="hc-black">ハイコントラスト</option>
                </select>
              </div>

              <div className="setting-group">
                <label className="setting-label">フォントサイズ</label>
                <input
                  type="number"
                  min="10"
                  max="24"
                  value={editorSettings.fontSize}
                  onChange={(e) => handleEditorSettingChange('fontSize', parseInt(e.target.value))}
                  className="setting-input"
                />
              </div>

              <div className="setting-group">
                <label className="setting-label">タブサイズ</label>
                <input
                  type="number"
                  min="1"
                  max="8"
                  value={editorSettings.tabSize}
                  onChange={(e) => handleEditorSettingChange('tabSize', parseInt(e.target.value))}
                  className="setting-input"
                />
              </div>

              <div className="setting-group">
                <label className="setting-checkbox">
                  <input
                    type="checkbox"
                    checked={editorSettings.wordWrap}
                    onChange={(e) => handleEditorSettingChange('wordWrap', e.target.checked)}
                  />
                  <span>ワードラップ</span>
                </label>
              </div>

              <div className="setting-group">
                <label className="setting-checkbox">
                  <input
                    type="checkbox"
                    checked={editorSettings.lineNumbers}
                    onChange={(e) => handleEditorSettingChange('lineNumbers', e.target.checked)}
                  />
                  <span>行番号表示</span>
                </label>
              </div>

              <div className="setting-group">
                <label className="setting-checkbox">
                  <input
                    type="checkbox"
                    checked={editorSettings.minimap}
                    onChange={(e) => handleEditorSettingChange('minimap', e.target.checked)}
                  />
                  <span>ミニマップ表示</span>
                </label>
              </div>

              <div className="setting-group">
                <label className="setting-checkbox">
                  <input
                    type="checkbox"
                    checked={editorSettings.formatOnType}
                    onChange={(e) => handleEditorSettingChange('formatOnType', e.target.checked)}
                  />
                  <span>自動フォーマット</span>
                </label>
              </div>
            </div>
          )}

          {/* マインドマップ設定 */}
          {activeTab === 'mindmap' && (
            <div className="setting-section">
              <h3>マインドマップ設定</h3>
              
              <div className="setting-group">
                <label className="setting-label">レイアウト</label>
                <select
                  value={mindmapSettings.layout || 'tree'}
                  onChange={(e) => handleMindmapSettingChange('layout', e.target.value as 'tree' | 'radial' | 'force')}
                  className="setting-select"
                >
                  <option value="tree">ツリー</option>
                  <option value="radial">放射状</option>
                </select>
              </div>

              <div className="setting-group">
                <label className="setting-label">ノード幅</label>
                <input
                  type="number"
                  min="80"
                  max="400"
                  value={mindmapSettings.nodeWidth || 160}
                  onChange={(e) => handleMindmapSettingChange('nodeWidth', parseInt(e.target.value))}
                  className="setting-input"
                />
              </div>



              <div className="setting-group">
                <label className="setting-label">ノード間隔</label>
                <input
                  type="number"
                  min="10"
                  max="50"
                  value={mindmapSettings.nodeSpacing || 20}
                  onChange={(e) => handleMindmapSettingChange('nodeSpacing', parseInt(e.target.value))}
                  className="setting-input"
                />
              </div>

              <div className="setting-group">
                <label className="setting-label">レベル間隔</label>
                <input
                  type="number"
                  min="50"
                  max="200"
                  value={mindmapSettings.levelSpacing || 100}
                  onChange={(e) => handleMindmapSettingChange('levelSpacing', parseInt(e.target.value))}
                  className="setting-input"
                />
              </div>

              <div className="setting-group">
                <label className="setting-label">縦間隔</label>
                <input
                  type="number"
                  min="0.3"
                  max="2.0"
                  step="0.1"
                  value={mindmapSettings.verticalSpacing || 1.0}
                  onChange={(e) => handleMindmapSettingChange('verticalSpacing', parseFloat(e.target.value))}
                  className="setting-input"
                />
              </div>

              <div className="setting-group">
                <label className="setting-checkbox">
                  <input
                    type="checkbox"
                    checked={mindmapSettings.enableAnimation !== false}
                    onChange={(e) => handleMindmapSettingChange('enableAnimation', e.target.checked)}
                  />
                  <span>アニメーション有効</span>
                </label>
              </div>

              <div className="setting-group">
                <label className="setting-checkbox">
                  <input
                    type="checkbox"
                    checked={mindmapSettings.autoLayout !== false}
                    onChange={(e) => handleMindmapSettingChange('autoLayout', e.target.checked)}
                  />
                  <span>自動レイアウト</span>
                </label>
              </div>
            </div>
          )}

          {/* コンテンツ設定 */}
          {activeTab === 'content' && (
            <div className="setting-section">
              <h3>コンテンツ読み込み</h3>
              
              <div className="setting-actions">
                <div className="action-group">
                  <h4>テンプレート・サンプル読み込み</h4>
                  <p className="action-description">
                    スキーマベーステンプレート、サンプルデータ、カスタムテンプレートを読み込むことができます。
                  </p>
                  <div className="action-buttons">
                    <button
                      className="action-btn primary"
                      onClick={() => setShowContentLoadModal(true)}
                    >
                      📚 コンテンツ読み込み
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* セッション設定 */}
          {activeTab === 'session' && (
            <div className="setting-section">
              <h3>セッション・データ管理</h3>
              
              <div className="setting-actions">
                <div className="action-group">
                  <h4>設定のバックアップ</h4>
                  <p className="action-description">
                    現在の設定をJSONファイルとしてエクスポート・インポートできます。
                  </p>
                  <div className="action-buttons">
                    <button
                      className="action-btn primary"
                      onClick={handleExportSettings}
                      disabled={isExporting}
                    >
                      {isExporting ? '📤 エクスポート中...' : '📤 設定をエクスポート'}
                    </button>
                    <button
                      className="action-btn secondary"
                      onClick={handleImportSettings}
                      disabled={isImporting}
                    >
                      {isImporting ? '📥 インポート中...' : '📥 設定をインポート'}
                    </button>
                  </div>
                </div>

                <div className="action-group">
                  <h4>データクリア</h4>
                  <p className="action-description">
                    セッションデータや設定をクリア・リセットできます。
                  </p>
                  <div className="action-buttons">
                    <button
                      className="action-btn warning"
                      onClick={handleClearSession}
                    >
                      🗑️ セッションクリア
                    </button>
                    <button
                      className="action-btn danger"
                      onClick={handleResetSettings}
                    >
                      🔄 設定をリセット
                    </button>
                  </div>
                </div>

                <div className="storage-info">
                  <h4>ストレージ使用量</h4>
                  <p>約 {getStorageUsage()} KB</p>
                </div>
              </div>
            </div>
          )}

          {/* 情報 */}
          {activeTab === 'about' && (
            <div className="setting-section">
              <h3>アプリケーション情報</h3>
              
              <div className="app-info">
                <div className="info-item">
                  <strong>名前:</strong> Requirements Mindmap Tool
                </div>
                <div className="info-item">
                  <strong>バージョン:</strong> 1.0.0
                </div>
                <div className="info-item">
                  <strong>説明:</strong> JSON/YAMLファイルからマインドマップを生成するツール
                </div>
                <div className="info-item">
                  <strong>対応形式:</strong> JSON, YAML
                </div>
                <div className="info-item">
                  <strong>ブラウザサポート:</strong> Chrome, Firefox, Safari, Edge
                </div>
                <div className="info-item">
                  <strong>開発:</strong> React + TypeScript + Vite
                </div>
              </div>

              <div className="keyboard-shortcuts">
                <h4>キーボードショートカット</h4>
                <div className="shortcut-list">
                  <div className="shortcut-item">
                    <code>Ctrl/Cmd + O</code>
                    <span>ファイルを開く</span>
                  </div>
                  <div className="shortcut-item">
                    <code>Ctrl/Cmd + S</code>
                    <span>ファイルを保存</span>
                  </div>
                  <div className="shortcut-item">
                    <code>Ctrl/Cmd + N</code>
                    <span>新規ファイル</span>
                  </div>
                  <div className="shortcut-item">
                    <code>F11</code>
                    <span>フルスクリーン</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 隠しファイル入力 */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          style={{ display: 'none' }}
          onChange={handleFileSelect}
        />

        {/* コンテンツ読み込みモーダル */}
        <ContentLoadModal
          isOpen={showContentLoadModal}
          onClose={() => setShowContentLoadModal(false)}
        />
      </div>
    </div>
  );
};