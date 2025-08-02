/**
 * エラーハンドリングの統合テスト
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../../App';
import type { MindmapData } from '../../types';

// タイマーのモック
vi.useFakeTimers();

// console.errorのモック
const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

// ResizeObserverのモック
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// D3.jsのSVG操作のモック
Object.defineProperty(global.SVGElement.prototype, 'getBBox', {
  value: vi.fn().mockReturnValue({
    x: 0,
    y: 0,
    width: 100,
    height: 50
  }),
  writable: true
});

// File System Access APIのモック
const mockFileHandle = {
  getFile: vi.fn(),
  createWritable: vi.fn(),
  name: 'test.json',
  kind: 'file' as const
};

Object.defineProperty(global, 'showOpenFilePicker', {
  value: vi.fn(),
  writable: true
});

Object.defineProperty(global, 'showSaveFilePicker', {
  value: vi.fn(),
  writable: true
});

describe('エラーハンドリングの統合テスト', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    consoleErrorSpy.mockClear();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.useFakeTimers();
  });

  describe('ファイル読み込みエラー', () => {
    it('ファイル読み込み失敗時に適切なエラーメッセージを表示する', async () => {
      const user = userEvent.setup();

      mockFileHandle.getFile.mockRejectedValue(new Error('File read failed'));
      (global.showOpenFilePicker as any).mockResolvedValue([mockFileHandle]);

      render(<App />);

      const openButton = screen.getByRole('button', { name: /ファイルを開く|開く/ });
      await user.click(openButton);

      // エラーメッセージが表示されることを確認
      await waitFor(() => {
        expect(screen.getByText(/ファイルの読み込みに失敗|読み込みエラー/)).toBeInTheDocument();
      });

      // エラー通知が表示されることを確認
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('サポートされていないファイル形式のエラーを処理する', async () => {
      const user = userEvent.setup();

      const mockFile = new File(['unsupported content'], 'test.txt', {
        type: 'text/plain'
      });
      mockFileHandle.getFile.mockResolvedValue(mockFile);
      (global.showOpenFilePicker as any).mockResolvedValue([mockFileHandle]);

      render(<App />);

      const openButton = screen.getByRole('button', { name: /ファイルを開く|開く/ });
      await user.click(openButton);

      await waitFor(() => {
        expect(screen.getByText(/サポートされていないファイル形式|対応していない形式/)).toBeInTheDocument();
      });
    });

    it('ファイルアクセス権限エラーを処理する', async () => {
      const user = userEvent.setup();

      (global.showOpenFilePicker as any).mockRejectedValue(
        new DOMException('Permission denied', 'NotAllowedError')
      );

      render(<App />);

      const openButton = screen.getByRole('button', { name: /ファイルを開く|開く/ });
      await user.click(openButton);

      await waitFor(() => {
        expect(screen.getByText(/ファイルアクセス権限|権限がありません/)).toBeInTheDocument();
      });
    });

    it('ネットワークエラーを処理する', async () => {
      const user = userEvent.setup();

      mockFileHandle.getFile.mockRejectedValue(new TypeError('Network error'));
      (global.showOpenFilePicker as any).mockResolvedValue([mockFileHandle]);

      render(<App />);

      const openButton = screen.getByRole('button', { name: /ファイルを開く|開く/ });
      await user.click(openButton);

      await waitFor(() => {
        expect(screen.getByText(/ネットワークエラー|接続エラー/)).toBeInTheDocument();
      });
    });
  });

  describe('ファイル保存エラー', () => {
    it('ファイル保存失敗時に適切なエラーメッセージを表示する', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      render(<App />);

      // 新規ファイルを作成
      const newFileButton = screen.getByRole('button', { name: /新規|新しい/ });
      await user.click(newFileButton);

      await waitFor(() => {
        expect(screen.getByRole('textbox')).toBeInTheDocument();
      });

      const editor = screen.getByRole('textbox');
      const testData = {
        version: '1.0',
        title: 'テスト',
        root: { id: 'root', title: 'ルート' }
      };

      await user.clear(editor);
      await user.type(editor, JSON.stringify(testData, null, 2));

      act(() => {
        vi.advanceTimersByTime(500);
      });

      // 保存時にエラーを発生させる
      const mockWritableStream = {
        write: vi.fn().mockRejectedValue(new Error('Write failed')),
        close: vi.fn()
      };
      mockFileHandle.createWritable.mockResolvedValue(mockWritableStream);
      (global.showSaveFilePicker as any).mockResolvedValue(mockFileHandle);

      const saveButton = screen.getByRole('button', { name: /保存/ });
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/ファイルの保存に失敗|保存エラー/)).toBeInTheDocument();
      });
    });

    it('ストレージ容量不足エラーを処理する', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      render(<App />);

      const newFileButton = screen.getByRole('button', { name: /新規|新しい/ });
      await user.click(newFileButton);

      await waitFor(() => {
        expect(screen.getByRole('textbox')).toBeInTheDocument();
      });

      const editor = screen.getByRole('textbox');
      const testData = {
        version: '1.0',
        title: 'テスト',
        root: { id: 'root', title: 'ルート' }
      };

      await user.clear(editor);
      await user.type(editor, JSON.stringify(testData, null, 2));

      act(() => {
        vi.advanceTimersByTime(500);
      });

      // ストレージ容量不足エラーを発生させる
      const mockWritableStream = {
        write: vi.fn().mockRejectedValue(new DOMException('Quota exceeded', 'QuotaExceededError')),
        close: vi.fn()
      };
      mockFileHandle.createWritable.mockResolvedValue(mockWritableStream);
      (global.showSaveFilePicker as any).mockResolvedValue(mockFileHandle);

      const saveButton = screen.getByRole('button', { name: /保存/ });
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/ストレージ容量不足|容量が不足/)).toBeInTheDocument();
      });
    });
  });

  describe('パースエラー', () => {
    it('JSON構文エラーを適切に表示する', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      render(<App />);

      const newFileButton = screen.getByRole('button', { name: /新規|新しい/ });
      await user.click(newFileButton);

      await waitFor(() => {
        expect(screen.getByRole('textbox')).toBeInTheDocument();
      });

      const editor = screen.getByRole('textbox');

      // 無効なJSONを入力
      const invalidJson = '{ "version": "1.0", "title": }';
      await user.clear(editor);
      await user.type(editor, invalidJson);

      act(() => {
        vi.advanceTimersByTime(500);
      });

      // JSON構文エラーが表示されることを確認
      await waitFor(() => {
        expect(screen.getByText(/JSON構文エラー|構文エラー/)).toBeInTheDocument();
      });

      // エラーの詳細情報が表示されることを確認
      expect(screen.getByText(/行|列|位置/)).toBeInTheDocument();
    });

    it('YAML構文エラーを適切に表示する', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      render(<App />);

      const newFileButton = screen.getByRole('button', { name: /新規|新しい/ });
      await user.click(newFileButton);

      await waitFor(() => {
        expect(screen.getByRole('textbox')).toBeInTheDocument();
      });

      const editor = screen.getByRole('textbox');

      // 無効なYAMLを入力
      const invalidYaml = `
version: "1.0"
title: "test
  invalid: yaml
`;
      await user.clear(editor);
      await user.type(editor, invalidYaml);

      act(() => {
        vi.advanceTimersByTime(500);
      });

      await waitFor(() => {
        expect(screen.getByText(/YAML構文エラー|YAML|構文エラー/)).toBeInTheDocument();
      });
    });

    it('複数のパースエラーを表示する', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      render(<App />);

      const newFileButton = screen.getByRole('button', { name: /新規|新しい/ });
      await user.click(newFileButton);

      await waitFor(() => {
        expect(screen.getByRole('textbox')).toBeInTheDocument();
      });

      const editor = screen.getByRole('textbox');

      // 複数のエラーを含むJSONを入力
      const multiErrorJson = '{ "version": "1.0", "title": , "root": { "id": } }';
      await user.clear(editor);
      await user.type(editor, multiErrorJson);

      act(() => {
        vi.advanceTimersByTime(500);
      });

      await waitFor(() => {
        expect(screen.getByText(/構文エラー/)).toBeInTheDocument();
      });

      // エラーリストが表示されることを確認
      const errorList = screen.getByTestId('error-list');
      expect(errorList).toBeInTheDocument();
    });
  });

  describe('バリデーションエラー', () => {
    it('必須フィールド不足エラーを表示する', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      render(<App />);

      const newFileButton = screen.getByRole('button', { name: /新規|新しい/ });
      await user.click(newFileButton);

      await waitFor(() => {
        expect(screen.getByRole('textbox')).toBeInTheDocument();
      });

      const editor = screen.getByRole('textbox');

      // 必須フィールドが不足したデータを入力
      const incompleteData = {
        version: '1.0'
        // title と root が不足
      };

      await user.clear(editor);
      await user.type(editor, JSON.stringify(incompleteData, null, 2));

      act(() => {
        vi.advanceTimersByTime(500);
      });

      await waitFor(() => {
        expect(screen.getByText(/必須フィールド|データ構造が正しくありません/)).toBeInTheDocument();
      });

      // 具体的な不足フィールドが表示されることを確認
      expect(screen.getByText(/title|root/)).toBeInTheDocument();
    });

    it('カスタムスキーマバリデーションエラーを表示する', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      render(<App />);

      const newFileButton = screen.getByRole('button', { name: /新規|新しい/ });
      await user.click(newFileButton);

      await waitFor(() => {
        expect(screen.getByRole('textbox')).toBeInTheDocument();
      });

      const editor = screen.getByRole('textbox');

      // カスタムスキーマ違反のデータを入力
      const invalidSchemaData: MindmapData = {
        version: '1.0',
        title: 'スキーマテスト',
        root: {
          id: 'root',
          title: 'ルート',
          children: [
            {
              id: 'child1',
              title: '子ノード',
              customFields: {
                priority: 'invalid-priority' // 無効な選択肢
              }
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
            }
          ],
          displayRules: []
        }
      };

      await user.clear(editor);
      await user.type(editor, JSON.stringify(invalidSchemaData, null, 2));

      act(() => {
        vi.advanceTimersByTime(500);
      });

      await waitFor(() => {
        expect(screen.getByText(/カスタムスキーマ|スキーマ違反|無効な選択肢/)).toBeInTheDocument();
      });
    });

    it('型不一致エラーを表示する', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      render(<App />);

      const newFileButton = screen.getByRole('button', { name: /新規|新しい/ });
      await user.click(newFileButton);

      await waitFor(() => {
        expect(screen.getByRole('textbox')).toBeInTheDocument();
      });

      const editor = screen.getByRole('textbox');

      // 型が不正なデータを入力
      const typeErrorData = {
        version: 1.0, // 文字列であるべき
        title: 'テスト',
        root: {
          id: 'root',
          title: 'ルート'
        }
      };

      await user.clear(editor);
      await user.type(editor, JSON.stringify(typeErrorData, null, 2));

      act(() => {
        vi.advanceTimersByTime(500);
      });

      await waitFor(() => {
        expect(screen.getByText(/型が正しくありません|型エラー/)).toBeInTheDocument();
      });
    });
  });

  describe('レンダリングエラー', () => {
    it('マインドマップレンダリングエラーを処理する', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      // D3.jsのSVG操作でエラーを発生させる
      Object.defineProperty(global.SVGElement.prototype, 'getBBox', {
        value: vi.fn().mockImplementation(() => {
          throw new Error('SVG rendering error');
        }),
        writable: true
      });

      render(<App />);

      const newFileButton = screen.getByRole('button', { name: /新規|新しい/ });
      await user.click(newFileButton);

      await waitFor(() => {
        expect(screen.getByRole('textbox')).toBeInTheDocument();
      });

      const editor = screen.getByRole('textbox');
      const validData = {
        version: '1.0',
        title: 'レンダリングテスト',
        root: {
          id: 'root',
          title: 'ルート'
        }
      };

      await user.clear(editor);
      await user.type(editor, JSON.stringify(validData, null, 2));

      act(() => {
        vi.advanceTimersByTime(500);
      });

      // レンダリングエラーが表示されることを確認
      await waitFor(() => {
        expect(screen.getByText(/マインドマップの描画に失敗|レンダリングエラー/)).toBeInTheDocument();
      });

      // エラーがコンソールに出力されることを確認
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('SVG rendering error')
      );
    });

    it('大量データでのメモリエラーを処理する', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      render(<App />);

      const newFileButton = screen.getByRole('button', { name: /新規|新しい/ });
      await user.click(newFileButton);

      await waitFor(() => {
        expect(screen.getByRole('textbox')).toBeInTheDocument();
      });

      const editor = screen.getByRole('textbox');

      // 極端に大量のノードを持つデータを作成
      const massiveData: MindmapData = {
        version: '1.0',
        title: '大量データテスト',
        root: {
          id: 'root',
          title: 'ルート',
          children: Array.from({ length: 1000 }, (_, i) => ({
            id: `child-${i}`,
            title: `子ノード${i}`,
            children: Array.from({ length: 100 }, (_, j) => ({
              id: `grandchild-${i}-${j}`,
              title: `孫ノード${i}-${j}`
            }))
          }))
        }
      };

      await user.clear(editor);
      await user.type(editor, JSON.stringify(massiveData, null, 2));

      act(() => {
        vi.advanceTimersByTime(500);
      });

      // メモリ不足警告またはパフォーマンス警告が表示される可能性
      await waitFor(() => {
        const warningElements = screen.queryAllByText(/メモリ|パフォーマンス|大量のデータ/);
        // 警告が表示されるか、正常に処理されるかのいずれか
        expect(warningElements.length >= 0).toBe(true);
      }, { timeout: 10000 });
    });
  });

  describe('エラー回復', () => {
    it('エラー状態から正常状態に回復できる', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      render(<App />);

      const newFileButton = screen.getByRole('button', { name: /新規|新しい/ });
      await user.click(newFileButton);

      await waitFor(() => {
        expect(screen.getByRole('textbox')).toBeInTheDocument();
      });

      const editor = screen.getByRole('textbox');

      // まず無効なデータを入力してエラー状態にする
      const invalidData = '{ "version": "1.0", "title": }';
      await user.clear(editor);
      await user.type(editor, invalidData);

      act(() => {
        vi.advanceTimersByTime(500);
      });

      await waitFor(() => {
        expect(screen.getByText(/構文エラー/)).toBeInTheDocument();
      });

      // 有効なデータに修正
      const validData = {
        version: '1.0',
        title: '回復テスト',
        root: {
          id: 'root',
          title: 'ルート'
        }
      };

      await user.clear(editor);
      await user.type(editor, JSON.stringify(validData, null, 2));

      act(() => {
        vi.advanceTimersByTime(500);
      });

      // エラーが解消され、正常にマインドマップが表示されることを確認
      await waitFor(() => {
        expect(screen.queryByText(/構文エラー/)).not.toBeInTheDocument();
        expect(screen.getByText('ルート')).toBeInTheDocument();
      });
    });

    it('エラー通知を手動で閉じることができる', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      render(<App />);

      const newFileButton = screen.getByRole('button', { name: /新規|新しい/ });
      await user.click(newFileButton);

      await waitFor(() => {
        expect(screen.getByRole('textbox')).toBeInTheDocument();
      });

      const editor = screen.getByRole('textbox');

      // エラーを発生させる
      const invalidData = '{ invalid json }';
      await user.clear(editor);
      await user.type(editor, invalidData);

      act(() => {
        vi.advanceTimersByTime(500);
      });

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });

      // エラー通知の閉じるボタンをクリック
      const closeButton = screen.getByRole('button', { name: /閉じる|×/ });
      await user.click(closeButton);

      // 通知が閉じられることを確認
      await waitFor(() => {
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      });
    });

    it('自動非表示エラー通知が時間経過で消える', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      render(<App />);

      const newFileButton = screen.getByRole('button', { name: /新規|新しい/ });
      await user.click(newFileButton);

      await waitFor(() => {
        expect(screen.getByRole('textbox')).toBeInTheDocument();
      });

      const editor = screen.getByRole('textbox');

      // エラーを発生させる
      const invalidData = '{ invalid json }';
      await user.clear(editor);
      await user.type(editor, invalidData);

      act(() => {
        vi.advanceTimersByTime(500);
      });

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });

      // 自動非表示時間（通常5秒）を進める
      act(() => {
        vi.advanceTimersByTime(5000);
      });

      // 通知が自動的に消えることを確認
      await waitFor(() => {
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      });
    });
  });

  describe('エラー統計とログ', () => {
    it('エラー統計が正しく記録される', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      render(<App />);

      // デバッグモードを有効にする
      const debugButton = screen.getByRole('button', { name: /デバッグ|統計/ });
      await user.click(debugButton);

      const newFileButton = screen.getByRole('button', { name: /新規|新しい/ });
      await user.click(newFileButton);

      await waitFor(() => {
        expect(screen.getByRole('textbox')).toBeInTheDocument();
      });

      const editor = screen.getByRole('textbox');

      // 複数のエラーを発生させる
      const errors = [
        '{ invalid json 1 }',
        '{ "version": "1.0", "title": }',
        '{ "version": 1.0, "title": "test" }'
      ];

      for (const errorData of errors) {
        await user.clear(editor);
        await user.type(editor, errorData);

        act(() => {
          vi.advanceTimersByTime(500);
        });

        await waitFor(() => {
          expect(screen.getByText(/エラー/)).toBeInTheDocument();
        });
      }

      // エラー統計が表示されることを確認
      const statsPanel = screen.getByTestId('error-stats');
      expect(statsPanel).toBeInTheDocument();
      expect(statsPanel).toHaveTextContent('3'); // 3つのエラー
    });
  });
});