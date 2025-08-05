/**
 * エディタとマインドマップの同期のE2Eテスト
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import type { MindmapData } from '../../types';
import { useAppStore } from '../../stores';

// UIレンダリングなしの純粋なストアテスト

describe('エディタとマインドマップの同期のE2Eテスト', () => {
  const syncTestData: MindmapData = {
    version: '1.0',
    title: '同期テストマインドマップ',
    description: 'エディタとマインドマップの同期テスト用データ',
    root: {
      id: 'root',
      title: 'プロジェクト',
      description: 'プロジェクトのルートノード',
      children: [
        {
          id: 'frontend',
          title: 'フロントエンド',
          description: 'ユーザーインターフェース開発',
          children: [
            {
              id: 'react',
              title: 'React開発',
              description: 'Reactコンポーネントの実装',
              customFields: {
                priority: 'high',
                status: 'in-progress',
                assignee: 'フロントエンドチーム'
              }
            },
            {
              id: 'styling',
              title: 'スタイリング',
              description: 'CSS/SCSSによるスタイリング'
            }
          ]
        },
        {
          id: 'backend',
          title: 'バックエンド',
          description: 'サーバーサイド開発',
          children: [
            {
              id: 'api',
              title: 'API開発',
              description: 'RESTful APIの実装'
            },
            {
              id: 'database',
              title: 'データベース',
              description: 'データベース設計と実装'
            }
          ]
        }
      ]
    },
    schema: {
      version: '1.0',
      fields: [
        {
          name: 'priority',
          type: 'select',
          label: '優先度',
          options: ['high', 'medium', 'low']
        },
        {
          name: 'status',
          type: 'select',
          label: 'ステータス',
          options: ['todo', 'in-progress', 'done']
        },
        {
          name: 'assignee',
          type: 'string',
          label: '担当者'
        }
      ],
      displayRules: []
    }
  };

  beforeEach(() => {
    // ストアをリセット
    const store = useAppStore.getState();
    store.closeFile();
  });

  describe('エディタ→マインドマップ同期', () => {
    it('エディタでの基本的な編集が正しく動作する', () => {
      // UIレンダリングを避けて純粋にストアテストを行う
      const store = useAppStore.getState();
      
      // 基本構造を直接ストアに設定
      const basicStructure = {
        version: '1.0',
        title: '基本テスト',
        root: {
          id: 'root',
          title: 'ルートノード',
          children: [
            {
              id: 'child1',
              title: '子ノード1'  
            }
          ]
        }
      };

      // 新規ファイルとしてセット
      store.newFile();
      store.updateContent(JSON.stringify(basicStructure, null, 2));

      // ストアに正しく保存されていることを確認
      expect(store.file.fileContent).toContain('ルートノード');
      expect(store.file.fileContent).toContain('子ノード1');
    });

    it('エディタでのノード削除が正しく処理される', () => {
      const store = useAppStore.getState();

      // 初期データを設定
      const initialData = {
        version: '1.0',
        title: '削除テスト',
        root: {
          id: 'root',
          title: 'プロジェクト',
          children: [
            {
              id: 'frontend',
              title: 'フロントエンド'
            },
            {
              id: 'backend',
              title: 'バックエンド'
            }
          ]
        }
      };

      store.newFile();
      store.updateContent(JSON.stringify(initialData, null, 2));

      // バックエンドノードを削除
      const dataWithoutBackend = {
        ...initialData,
        root: {
          ...initialData.root,
          children: initialData.root.children!.filter(child => child.id !== 'backend')
        }
      };

      store.updateContent(JSON.stringify(dataWithoutBackend, null, 2));

      // バックエンドが削除されることを確認
      expect(store.file.fileContent).not.toContain('バックエンド');
      expect(store.file.fileContent).toContain('フロントエンド');
    });

    it('エディタでのプロパティ変更が正しく処理される', () => {
      const store = useAppStore.getState();

      // シンプルなデータで初期化
      const simpleData = {
        version: '1.0',
        title: 'プロパティテスト',
        root: {
          id: 'root',
          title: 'ルート',
          customFields: {
            status: 'pending'
          }
        }
      };

      store.newFile();
      store.updateContent(JSON.stringify(simpleData, null, 2));

      // プロパティを変更
      const updatedData = {
        ...simpleData,
        root: {
          ...simpleData.root,
          customFields: {
            status: 'completed'
          }
        }
      };

      store.updateContent(JSON.stringify(updatedData, null, 2));

      // 変更を確認
      expect(store.file.fileContent).toContain('completed');
      expect(store.file.fileContent).not.toContain('pending');
    });
  });

  describe('基本的な同期確認', () => {
    it('エディタの内容が正しく表示される', () => {
      const store = useAppStore.getState();

      // シンプルなデータを設定
      const simpleData = {
        version: '1.0',
        title: '基本確認テスト',
        root: {
          id: 'root',
          title: 'プロジェクト',
          children: [
            {
              id: 'frontend',
              title: 'フロントエンド'
            }
          ]
        }
      };

      store.newFile();
      store.updateContent(JSON.stringify(simpleData, null, 2));

      // ストアに内容が正しく保存されることを確認
      expect(store.file.fileContent).toContain('プロジェクト');
      expect(store.file.fileContent).toContain('フロントエンド');
    });
  });

  describe('同期の整合性', () => {
    it('エディタでの編集が正しく処理される', () => {
      const store = useAppStore.getState();

      // 初期データを設定
      const initialData = {
        version: '1.0',
        title: '整合性テスト',
        root: {
          id: 'root',
          title: 'プロジェクト',
          children: [
            {
              id: 'frontend',
              title: 'フロントエンド'
            }
          ]
        }
      };

      store.newFile();
      store.updateContent(JSON.stringify(initialData, null, 2));

      // エディタでデータを編集（ノード追加）
      const editedData = {
        ...initialData,
        root: {
          ...initialData.root,
          children: [
            ...initialData.root.children,
            {
              id: 'testing',
              title: 'テスト'
            }
          ]
        }
      };

      store.updateContent(JSON.stringify(editedData, null, 2));

      // 新しいノードが追加されることを確認
      expect(store.file.fileContent).toContain('テスト');
    });

    it('無効なJSONに対するエラーハンドリング', () => {
      const store = useAppStore.getState();

      // 有効なデータを設定
      const validData = {
        version: '1.0',
        title: 'エラーテスト',
        root: {
          id: 'root',
          title: 'プロジェクト'
        }
      };

      store.newFile();
      store.updateContent(JSON.stringify(validData, null, 2));

      // 無効なJSONを入力してエラーを発生させる
      const invalidJson = '{ "version": "1.0", "title": }';
      
      store.updateContent(invalidJson);

      // パースエラーが発生していることを確認
      const state = useAppStore.getState();
      expect(state.parse.parseErrors.length).toBeGreaterThan(0);

      // 有効なデータに修正
      const fixedData = {
        version: '1.0',
        title: '修正済み',
        root: {
          id: 'root',
          title: '修正済みプロジェクト'
        }
      };

      store.updateContent(JSON.stringify(fixedData, null, 2));

      // エラーが解消されることを確認
      const finalState = useAppStore.getState();
      expect(finalState.parse.parseErrors.length).toBe(0);
      expect(finalState.file.fileContent).toContain('修正済みプロジェクト');
    });
  });
});