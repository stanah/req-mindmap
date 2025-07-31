/**
 * ファイル操作ツールバーコンポーネント
 * 
 * ファイルの読み込み、保存、新規作成などの操作を提供するツールバー
 */

import React, { useRef, useState } from 'react';
import { useAppStore } from '../../stores/appStore';
import { fileService, BrowserFileService } from '../../services/fileService';
import { projectManagementSample, sampleYAML } from '../../data/samples';
import { SettingsPanel } from './SettingsPanel';
import type { FileLoadResult } from '../../services/fileService';
import './SettingsPanel.css';

interface FileToolbarProps {
  className?: string;
}

export const FileToolbar: React.FC<FileToolbarProps> = ({ className = '' }) => {
  const {
    file,
    newFile,
    saveFile,
    updateContent,
    addNotification,
    closeFile,
    ui: { editorSettings },
  } = useAppStore();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showSettings, setShowSettings] = useState(false);

  /**
   * ファイル読み込みハンドラー
   */
  const handleLoadFile = async () => {
    try {
      // BrowserFileServiceにキャストしてloadFileWithInfoメソッドを呼び出し
      const browserService = fileService as BrowserFileService;
      const result: FileLoadResult = await browserService.loadFileWithInfo();
      
      if (result.success) {
        // ファイル内容をストアに設定
        updateContent(result.content);
        
        addNotification({
          message: `ファイル "${result.fileInfo.name}" を読み込みました (${result.fileInfo.detectedFormat}形式)`,
          type: 'success',
          autoHide: true,
          duration: 3000,
        });
      } else {
        addNotification({
          message: result.error || 'ファイルの読み込みに失敗しました',
          type: 'error',
          autoHide: true,
          duration: 5000,
        });
      }
    } catch (error) {
      addNotification({
        message: `ファイル読み込みエラー: ${error instanceof Error ? error.message : '不明なエラー'}`,
        type: 'error',
        autoHide: true,
        duration: 5000,
      });
    }
  };

  /**
   * ファイル保存ハンドラー
   */
  const handleSaveFile = async () => {
    try {
      // 常にmindmap.jsonとして保存
      const suggestedName = 'mindmap.json';
      
      // BrowserFileServiceにキャストしてsaveFileWithOptionsメソッドを呼び出し
      const browserService = fileService as BrowserFileService;
      await browserService.saveFileWithOptions(file.fileContent, {
        filename: suggestedName,
        format: file.fileFormat || 'json',
      });

      addNotification({
        message: 'ファイルを保存しました',
        type: 'success',
        autoHide: true,
        duration: 3000,
      });
    } catch (error) {
      addNotification({
        message: `保存エラー: ${error instanceof Error ? error.message : '不明なエラー'}`,
        type: 'error',
        autoHide: true,
        duration: 5000,
      });
    }
  };

  /**
   * 新規ファイル作成ハンドラー
   */
  const handleNewFile = () => {
    if (file.isDirty) {
      // 未保存の変更がある場合は確認
      const confirmed = window.confirm('保存されていない変更があります。新しいファイルを作成しますか？');
      if (!confirmed) return;
    }
    
    newFile();
  };

  /**
   * ファイルを閉じるハンドラー
   */
  const handleCloseFile = () => {
    closeFile();
  };

  /**
   * テンプレートから新規作成
   */
  const handleNewFromTemplate = (templateType: 'basic' | 'advanced' | 'project') => {
    if (file.isDirty) {
      const confirmed = window.confirm('保存されていない変更があります。新しいファイルを作成しますか？');
      if (!confirmed) return;
    }

    // BrowserFileServiceにキャストしてcreateNewFileTemplateメソッドを呼び出し
    const browserService = fileService as BrowserFileService;
    const templateContent = browserService.createNewFileTemplate(templateType);
    updateContent(templateContent);
    
    const templateNames = {
      basic: '基本テンプレート',
      advanced: '高度なテンプレート',
      project: 'プロジェクト管理テンプレート',
    };

    addNotification({
      message: `${templateNames[templateType]}から新しいファイルを作成しました`,
      type: 'info',
      autoHide: true,
      duration: 3000,
    });
  };

  /**
   * サンプルデータを読み込む
   */
  const handleLoadSample = () => {
    const language = editorSettings.language;
    let content: string;
    
    // エディター言語に応じてサンプルを選択
    if (language === 'yaml') {
      content = sampleYAML;
    } else {
      // デフォルトはJSON（projectManagementSample）
      content = JSON.stringify(projectManagementSample, null, 2);
    }
    
    updateContent(content);

    addNotification({
      message: `サンプルデータを読み込みました (${language === 'yaml' ? 'YAML' : 'JSON'}形式)`,
      type: 'info',
      autoHide: true,
      duration: 3000,
    });
  };

  return (
    <div className={`file-toolbar ${className}`}>
      {/* ファイル操作ボタン */}
      <div className="file-toolbar__group">
        <button
          className="file-toolbar__button file-toolbar__button--primary"
          onClick={handleLoadFile}
          title="ファイルを開く"
        >
          📁 開く
        </button>
        
        <button
          className="file-toolbar__button"
          onClick={handleSaveFile}
          disabled={!file.fileContent}
          title="ファイルを保存"
        >
          💾 保存
        </button>
      </div>

      {/* 新規作成ボタン */}
      <div className="file-toolbar__group">
        <button
          className="file-toolbar__button file-toolbar__button--new"
          onClick={handleNewFile}
          title="新しいファイル"
        >
          ➕ 新規
        </button>
        
        <div className="file-toolbar__dropdown">
          <button
            className="file-toolbar__button file-toolbar__button--dropdown"
            title="テンプレートから作成"
          >
            📋 テンプレート ▼
          </button>
          <div className="file-toolbar__dropdown-menu">
            <button
              className="file-toolbar__dropdown-item"
              onClick={() => handleNewFromTemplate('basic')}
            >
              基本テンプレート
            </button>
            <button
              className="file-toolbar__dropdown-item"
              onClick={() => handleNewFromTemplate('advanced')}
            >
              高度なテンプレート
            </button>
            <button
              className="file-toolbar__dropdown-item"
              onClick={() => handleNewFromTemplate('project')}
            >
              プロジェクト管理
            </button>
          </div>
        </div>
      </div>

      {/* サンプルデータ読み込み */}
      <div className="file-toolbar__group">
        <button
          className="file-toolbar__button file-toolbar__button--sample"
          onClick={handleLoadSample}
          title="サンプルデータを読み込む"
        >
          📝 サンプル読み込み
        </button>
      </div>

      {/* 設定ボタン */}
      <div className="file-toolbar__group">
        <button
          className="file-toolbar__button"
          onClick={() => setShowSettings(true)}
          title="設定"
        >
          ⚙️ 設定
        </button>
      </div>

      {/* ファイル情報表示 */}
      <div className="file-toolbar__info">
        {file.currentFile && (
          <span className="file-toolbar__filename">
            {file.currentFile.split('/').pop()}
            {file.isDirty && <span className="file-toolbar__dirty">*</span>}
          </span>
        )}
        
        {file.fileFormat && (
          <span className="file-toolbar__format">
            {file.fileFormat.toUpperCase()}
          </span>
        )}
        
        {file.currentFile && (
          <button
            className="file-toolbar__button file-toolbar__button--close"
            onClick={handleCloseFile}
            title="ファイルを閉じる"
          >
            ✕
          </button>
        )}
      </div>

      {/* 隠されたファイル入力要素 */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,.yaml,.yml,.txt"
        style={{ display: 'none' }}
        onChange={() => {}} // ファイル選択はhandleLoadFileで処理
      />

      {/* 設定パネル */}
      <SettingsPanel
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />
    </div>
  );
};

export default FileToolbar;