/**
 * ファイル読み込みからマインドマップ表示までの統合テスト
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../../App';
import type { MindmapData } from '../../types';

// モックの設定
const mockFileHandle = {
  getFile: vi.fn(),
  createWritable: vi.fn(),
  name: 'test.json',
  kind: 'file' as const
};

const mockWritableStream = {
  write: vi.fn(),
  close: vi.fn()
};

// File System Access APIのモック
Object.defineProperty(global, 'showOpenFilePicker', {
  value: vi.fn(),
  writable: true
});

Object.defineProperty(global, 'showSaveFilePicker', {
  value: vi.fn(),
  writable: true
});

// これらのモックはsetup.tsで定義済み
// - ResizeObserver
// - SVGElement.prototype.getBBox

describe('ファイル読み込みからマインドマップ表示までの統合テスト', () => {
  const testMindmapData: MindmapData = {
    version: '1.0',
    title: 'テスト統合マインドマップ',
    description: '統合テスト用のマインドマップデータ',
    root: {
      id: 'root',
      title: 'ルートノード',
      description: 'ルートノードの説明',
      children: [
        {
          id: 'child1',
          title: '機能要件',
          description: 'システムの機能要件',
          children: [
            {
              id: 'child1-1',
              title: 'ユーザー認証',
              description: 'ログイン・ログアウト機能',
              customFields: {
                priority: 'high',
                status: 'todo',
                assignee: '田中'
              }
            },
            {
              id: 'child1-2',
              title: 'データ管理',
              description: 'データの作成・更新・削除機能'
            }
          ]
        },
        {
          id: 'child2',
          title: '非機能要件',
          description: 'システムの非機能要件',
          children: [
            {
              id: 'child2-1',
              title: 'パフォーマンス',
              description: '応答時間とスループット要件'
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
          options: ['high', 'medium', 'low'],
          required: true
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
      displayRules: [
        {
          field: 'priority',
          displayType: 'badge',
          style: {
            high: { color: 'red', backgroundColor: '#ffebee' },
            medium: { color: 'orange', backgroundColor: '#fff3e0' },
            low: { color: 'green', backgroundColor: '#e8f5e8' }
          }
        }
      ]
    },
    settings: {
      theme: 'light',
      layout: 'tree'
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockFileHandle.getFile.mockClear();
    ((global as any).showOpenFilePicker).mockClear();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('JSONファイルの読み込みと表示', () => {
    it('JSONファイルを読み込んでマインドマップを表示する', async () => {
      const user = userEvent.setup();
      
      // ファイル読み込みのモック設定
      const mockFile = new File([JSON.stringify(testMindmapData)], 'test.json', {
        type: 'application/json'
      });
      mockFileHandle.getFile.mockResolvedValue(mockFile);
      ((global as any).showOpenFilePicker).mockResolvedValue([mockFileHandle]);

      render(<App />);

      // ファイル読み込みボタンをクリック
      const openButton = screen.getByRole('button', { name: /ファイルを開く|開く/ });
      await user.click(openButton);

      // ファイルが読み込まれるまで待機
      await waitFor(() => {
        expect(screen.getByDisplayValue(/テスト統合マインドマップ/)).toBeInTheDocument();
      });

      // エディタにJSONが表示されることを確認
      const editor = screen.getByRole('textbox');
      expect(editor).toHaveValue(expect.stringContaining('テスト統合マインドマップ'));
      expect(editor).toHaveValue(expect.stringContaining('ルートノード'));

      // マインドマップが表示されることを確認
      await waitFor(() => {
        expect(screen.getByText('ルートノード')).toBeInTheDocument();
        expect(screen.getByText('機能要件')).toBeInTheDocument();
        expect(screen.getByText('非機能要件')).toBeInTheDocument();
      });

      // 子ノードも表示されることを確認
      expect(screen.getByText('ユーザー認証')).toBeInTheDocument();
      expect(screen.getByText('データ管理')).toBeInTheDocument();
      expect(screen.getByText('パフォーマンス')).toBeInTheDocument();
    });

    it('カスタムフィールドが正しく表示される', async () => {
      const user = userEvent.setup();
      
      const mockFile = new File([JSON.stringify(testMindmapData)], 'test.json', {
        type: 'application/json'
      });
      mockFileHandle.getFile.mockResolvedValue(mockFile);
      ((global as any).showOpenFilePicker).mockResolvedValue([mockFileHandle]);

      render(<App />);

      const openButton = screen.getByRole('button', { name: /ファイルを開く|開く/ });
      await user.click(openButton);

      await waitFor(() => {
        expect(screen.getByText('ユーザー認証')).toBeInTheDocument();
      });

      // カスタムフィールドの表示を確認
      // 優先度バッジが表示される
      expect(screen.getByText('high')).toBeInTheDocument();
      
      // ノードをクリックして詳細を表示
      const userAuthNode = screen.getByText('ユーザー認証');
      await user.click(userAuthNode);

      // 詳細パネルでカスタムフィールドが表示される
      await waitFor(() => {
        expect(screen.getByText('優先度')).toBeInTheDocument();
        expect(screen.getByText('ステータス')).toBeInTheDocument();
        expect(screen.getByText('担当者')).toBeInTheDocument();
        expect(screen.getByText('田中')).toBeInTheDocument();
      });
    });
  });

  describe('YAMLファイルの読み込みと表示', () => {
    it('YAMLファイルを読み込んでマインドマップを表示する', async () => {
      const user = userEvent.setup();
      
      const yamlContent = `
version: "1.0"
title: "YAML統合テスト"
root:
  id: root
  title: "YAMLルート"
  children:
    - id: yaml-child1
      title: "YAML子ノード1"
    - id: yaml-child2
      title: "YAML子ノード2"
settings:
  theme: light
  layout: tree
`;

      const mockFile = new File([yamlContent], 'test.yaml', {
        type: 'application/x-yaml'
      });
      mockFileHandle.getFile.mockResolvedValue(mockFile);
      ((global as any).showOpenFilePicker).mockResolvedValue([mockFileHandle]);

      render(<App />);

      const openButton = screen.getByRole('button', { name: /ファイルを開く|開く/ });
      await user.click(openButton);

      await waitFor(() => {
        expect(screen.getByDisplayValue(/YAML統合テスト/)).toBeInTheDocument();
      });

      // マインドマップが表示されることを確認
      await waitFor(() => {
        expect(screen.getByText('YAMLルート')).toBeInTheDocument();
        expect(screen.getByText('YAML子ノード1')).toBeInTheDocument();
        expect(screen.getByText('YAML子ノード2')).toBeInTheDocument();
      });
    });
  });

  describe('エラーハンドリング', () => {
    it('無効なJSONファイルの場合エラーを表示する', async () => {
      const user = userEvent.setup();
      
      const invalidJson = '{ "version": "1.0", "title": }';
      const mockFile = new File([invalidJson], 'invalid.json', {
        type: 'application/json'
      });
      mockFileHandle.getFile.mockResolvedValue(mockFile);
      ((global as any).showOpenFilePicker).mockResolvedValue([mockFileHandle]);

      render(<App />);

      const openButton = screen.getByRole('button', { name: /ファイルを開く|開く/ });
      await user.click(openButton);

      // エラーメッセージが表示されることを確認
      await waitFor(() => {
        expect(screen.getByText(/JSON構文エラー|構文エラー/)).toBeInTheDocument();
      });

      // マインドマップは表示されない
      expect(screen.queryByText('ルートノード')).not.toBeInTheDocument();
    });

    it('必須フィールドが不足している場合エラーを表示する', async () => {
      const user = userEvent.setup();
      
      const incompleteData = {
        version: '1.0'
        // title と root が不足
      };
      
      const mockFile = new File([JSON.stringify(incompleteData)], 'incomplete.json', {
        type: 'application/json'
      });
      mockFileHandle.getFile.mockResolvedValue(mockFile);
      ((global as any).showOpenFilePicker).mockResolvedValue([mockFileHandle]);

      render(<App />);

      const openButton = screen.getByRole('button', { name: /ファイルを開く|開く/ });
      await user.click(openButton);

      // バリデーションエラーが表示されることを確認
      await waitFor(() => {
        expect(screen.getByText(/データ構造が正しくありません|バリデーションエラー/)).toBeInTheDocument();
      });
    });

    it('ファイル読み込みがキャンセルされた場合の処理', async () => {
      const user = userEvent.setup();
      
      ((global as any).showOpenFilePicker).mockRejectedValue(
        new DOMException('User cancelled', 'AbortError')
      );

      render(<App />);

      const openButton = screen.getByRole('button', { name: /ファイルを開く|開く/ });
      await user.click(openButton);

      // キャンセルメッセージまたは何も表示されないことを確認
      await waitFor(() => {
        // エラーメッセージが表示されないか、キャンセルメッセージが表示される
        const errorElements = screen.queryAllByText(/エラー/);
        if (errorElements.length > 0) {
          expect(screen.getByText(/キャンセル/)).toBeInTheDocument();
        }
      });
    });
  });

  describe('ファイル保存', () => {
    it('編集したデータを保存できる', async () => {
      const user = userEvent.setup();
      
      // まずファイルを読み込み
      const mockFile = new File([JSON.stringify(testMindmapData)], 'test.json', {
        type: 'application/json'
      });
      mockFileHandle.getFile.mockResolvedValue(mockFile);
      ((global as any).showOpenFilePicker).mockResolvedValue([mockFileHandle]);

      render(<App />);

      const openButton = screen.getByRole('button', { name: /ファイルを開く|開く/ });
      await user.click(openButton);

      await waitFor(() => {
        expect(screen.getByDisplayValue(/テスト統合マインドマップ/)).toBeInTheDocument();
      });

      // エディタでデータを編集
      const editor = screen.getByRole('textbox');
      await user.clear(editor);
      
      const editedData = {
        ...testMindmapData,
        title: '編集されたマインドマップ'
      };
      
      await user.type(editor, JSON.stringify(editedData, null, 2));

      // 保存の準備
      mockFileHandle.createWritable.mockResolvedValue(mockWritableStream);
      ((global as any).showSaveFilePicker).mockResolvedValue(mockFileHandle);

      // 保存ボタンをクリック
      const saveButton = screen.getByRole('button', { name: /保存/ });
      await user.click(saveButton);

      // 保存が実行されることを確認
      await waitFor(() => {
        expect(mockWritableStream.write).toHaveBeenCalled();
        expect(mockWritableStream.close).toHaveBeenCalled();
      });

      // 保存された内容を確認
      const savedContent = mockWritableStream.write.mock.calls[0][0];
      const savedData = JSON.parse(savedContent);
      expect(savedData.title).toBe('編集されたマインドマップ');
    });
  });

  describe('レイアウトとテーマ', () => {
    it('設定に基づいてレイアウトとテーマが適用される', async () => {
      const user = userEvent.setup();
      
      const dataWithSettings = {
        ...testMindmapData,
        settings: {
          theme: 'dark',
          layout: 'radial'
        }
      };

      const mockFile = new File([JSON.stringify(dataWithSettings)], 'themed.json', {
        type: 'application/json'
      });
      mockFileHandle.getFile.mockResolvedValue(mockFile);
      ((global as any).showOpenFilePicker).mockResolvedValue([mockFileHandle]);

      render(<App />);

      const openButton = screen.getByRole('button', { name: /ファイルを開く|開く/ });
      await user.click(openButton);

      await waitFor(() => {
        expect(screen.getByText('ルートノード')).toBeInTheDocument();
      });

      // テーマとレイアウトの設定が反映されることを確認
      // （実際の実装に応じてセレクタを調整）
      const mindmapContainer = screen.getByTestId('mindmap-container');
      expect(mindmapContainer).toHaveClass('theme-dark');
      expect(mindmapContainer).toHaveClass('layout-radial');
    });
  });

  describe('パフォーマンス', () => {
    it('大量のノードを持つファイルを効率的に処理する', async () => {
      const user = userEvent.setup();
      
      // 100個の子ノードを持つデータを作成
      const largeData: MindmapData = {
        version: '1.0',
        title: '大規模マインドマップ',
        root: {
          id: 'root',
          title: 'ルート',
          children: Array.from({ length: 100 }, (_, i) => ({
            id: `child-${i}`,
            title: `子ノード${i}`,
            description: `子ノード${i}の説明`
          }))
        }
      };

      const mockFile = new File([JSON.stringify(largeData)], 'large.json', {
        type: 'application/json'
      });
      mockFileHandle.getFile.mockResolvedValue(mockFile);
      ((global as any).showOpenFilePicker).mockResolvedValue([mockFileHandle]);

      const startTime = performance.now();

      render(<App />);

      const openButton = screen.getByRole('button', { name: /ファイルを開く|開く/ });
      await user.click(openButton);

      await waitFor(() => {
        expect(screen.getByText('ルート')).toBeInTheDocument();
      }, { timeout: 5000 });

      const endTime = performance.now();
      const loadTime = endTime - startTime;

      // 5秒以内に読み込みが完了することを確認
      expect(loadTime).toBeLessThan(5000);

      // 一部のノードが表示されることを確認（仮想化により全てが表示されるとは限らない）
      expect(screen.getByText('子ノード0')).toBeInTheDocument();
    });
  });
});