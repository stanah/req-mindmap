import React from 'react';
import { useAppStore } from '../stores';
import './Layout.css';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const setFileContent = useAppStore(state => state.setFileContent);
  const parseContent = useAppStore(state => state.parseContent);

  const handleLoadSample = () => {
    const sampleData = {
      version: "1.0.0",
      title: "プロジェクト管理システム",
      root: {
        id: "root",
        title: "プロジェクト管理システム",
        description: "チーム向けのプロジェクト管理ツール",
        children: [
          {
            id: "features",
            title: "機能要件",
            children: [
              {
                id: "task-management",
                title: "タスク管理",
                description: "タスクの作成、編集、削除、ステータス管理",
                customFields: {
                  priority: "high",
                  status: "in-progress"
                }
              },
              {
                id: "user-management",
                title: "ユーザー管理",
                description: "ユーザーの登録、権限管理、チーム管理",
                customFields: {
                  priority: "medium",
                  status: "todo"
                }
              },
              {
                id: "reporting",
                title: "レポート機能",
                description: "進捗レポート、ガントチャート、統計情報",
                customFields: {
                  priority: "low",
                  status: "todo"
                }
              }
            ]
          },
          {
            id: "technical",
            title: "技術要件",
            children: [
              {
                id: "frontend",
                title: "フロントエンド",
                description: "React, TypeScript, Tailwind CSS",
                customFields: {
                  type: "technology"
                }
              },
              {
                id: "backend",
                title: "バックエンド",
                description: "Node.js, Express, PostgreSQL",
                customFields: {
                  type: "technology"
                }
              }
            ]
          }
        ],
        customFields: {
          version: "1.0.0",
          deadline: "2024-12-31"
        }
      },
      schema: {
        fields: [
          {
            name: "priority",
            type: "select",
            label: "優先度",
            options: ["high", "medium", "low"]
          },
          {
            name: "status",
            type: "select",
            label: "ステータス",
            options: ["todo", "in-progress", "done"]
          }
        ],
        displayRules: [
          {
            field: "priority",
            displayType: "badge",
            style: {
              high: { backgroundColor: "#fee2e2", color: "#dc2626" },
              medium: { backgroundColor: "#fef3c7", color: "#d97706" },
              low: { backgroundColor: "#dbeafe", color: "#2563eb" }
            }
          },
          {
            field: "status",
            displayType: "badge",
            style: {
              todo: { backgroundColor: "#f3f4f6", color: "#6b7280" },
              "in-progress": { backgroundColor: "#fef3c7", color: "#d97706" },
              done: { backgroundColor: "#d1fae5", color: "#059669" }
            }
          }
        ]
      }
    };

    const jsonContent = JSON.stringify(sampleData, null, 2);
    setFileContent(jsonContent, 'sample.json');
    parseContent();
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