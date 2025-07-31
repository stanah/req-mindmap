import React from 'react';
import { useAppStore } from '../stores';
import { projectManagementSample, sampleYAML } from '../data/samples';
import './Layout.css';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const updateContent = useAppStore(state => state.updateContent);
  const fileFormat = useAppStore(state => state.file.fileFormat);

  const handleLoadSample = () => {
    let content: string;
    
    // ファイル形式に応じてサンプルを選択
    if (fileFormat === 'yaml') {
      content = sampleYAML;
    } else {
      // デフォルトはJSON（projectManagementSample）
      content = JSON.stringify(projectManagementSample, null, 2);
    }
    
    updateContent(content);
  };

  return (
    <div className="layout">
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
      <main className="layout-main">
        {children}
      </main>
      <footer className="layout-footer">
        <div className="status-bar">
          {/* TODO: ステータス情報を表示 */}
          <span>準備完了</span>
        </div>
      </footer>
    </div>
  );
};