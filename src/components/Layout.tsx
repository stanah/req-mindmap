import React from 'react';
import { useAppStore } from '../stores';
import { projectManagementSample, sampleYAML } from '../data/samples';
import { FileToolbar } from './ui/FileToolbar';
import { FileDropZone } from './ui/FileDropZone';
import './Layout.css';
import './ui/FileToolbar.css';
import './ui/FileDropZone.css';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const updateContent = useAppStore(state => state.updateContent);
  const language = useAppStore(state => state.ui.editorSettings.language);

  const handleLoadSample = () => {
    console.log('Current language:', language);
    let content: string;
    
    // エディター言語に応じてサンプルを選択
    if (language === 'yaml') {
      console.log('Loading YAML sample');
      content = sampleYAML;
    } else {
      console.log('Loading JSON sample (default)');
      // デフォルトはJSON（projectManagementSample）
      content = JSON.stringify(projectManagementSample, null, 2);
    }
    
    updateContent(content);
  };

  return (
    <FileDropZone className="layout">
      <header className="layout-header">
        <h1>Requirements Mindmap Tool</h1>
        <div className="header-actions">
          <button 
            className="header-btn"
            onClick={handleLoadSample}
            title="サンプルデータを読み込む"
          >
            サンプル読み込み
          </button>
        </div>
      </header>
      
      {/* ファイル操作ツールバー */}
      <FileToolbar className="layout-toolbar" />
      
      <main className="layout-main">
        {children}
      </main>
      <footer className="layout-footer">
        <div className="status-bar">
          {/* TODO: ステータス情報を表示 */}
          <span>準備完了</span>
        </div>
      </footer>
    </FileDropZone>
  );
};