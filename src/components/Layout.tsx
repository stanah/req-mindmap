import React from 'react';
import './Layout.css';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="layout">
      <header className="layout-header">
        <h1>Requirements Mindmap Tool</h1>
        <div className="header-actions">
          {/* TODO: ファイル操作ボタンなどを追加 */}
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