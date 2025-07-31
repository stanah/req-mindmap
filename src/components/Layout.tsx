import React from 'react';
import { useAppStore } from '../stores';
import { projectManagementSample } from '../data/samples';
import './Layout.css';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const updateContent = useAppStore(state => state.updateContent);

  const handleLoadSample = () => {
    const jsonContent = JSON.stringify(projectManagementSample, null, 2);
    updateContent(jsonContent);
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