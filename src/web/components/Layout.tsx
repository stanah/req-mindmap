import React from 'react';
import { FileToolbar } from './ui/FileToolbar';
import { FileDropZone } from './ui/FileDropZone';
import { StatusBar } from './ui/StatusBar';
import './Layout.css';
import './ui/FileToolbar.css';
import './ui/FileDropZone.css';
import './ui/StatusBar.css';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {

  return (
    <FileDropZone className="layout">
      {/* ファイル操作ツールバー */}
      <FileToolbar className="layout-toolbar" />
      
      <main className="layout-main">
        {children}
      </main>
      <footer className="layout-footer">
        <StatusBar />
      </footer>
    </FileDropZone>
  );
};