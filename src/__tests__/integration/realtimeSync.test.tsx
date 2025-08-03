/**
 * リアルタイム同期機能の統合テスト
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../../App';
import type { MindmapData } from '../../types';

// タイマーのモック
vi.useFakeTimers();

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

describe('リアルタイム同期機能の統合テスト', () => {
  const initialData: MindmapData = {
    version: '1.0',
    title: '同期テストマインドマップ',
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

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.useFakeTimers();
  });

  describe('エディタからマインドマップへの同期', () => {
    it('エディタでJSONを編集するとマインドマップがリアルタイムで更新される', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      render(<App />);

      // 新規ファイルを作成
      const newFileButton = screen.getByRole('button', { name: /新規|新しい/ });
      await user.click(newFileButton);

      // エディタが表示されるまで待機
      await waitFor(() => {
        expect(screen.getByRole('textbox')).toBeInTheDocument();
      });

      const editor = screen.getByRole('textbox');

      // 初期データを入力
      await user.clear(editor);
      await user.type(editor, JSON.stringify(initialData, null, 2));

      // デバウンス期間を進める
      act(() => {
        vi.advanceTimersByTime(500);
      });

      // マインドマップが更新されることを確認
      await waitFor(() => {
        expect(screen.getByText('ルートノード')).toBeInTheDocument();
        expect(screen.getByText('子ノード1')).toBeInTheDocument();
      });

      // データを編集
      const updatedData = {
        ...initialData,
        root: {
          ...initialData.root,
          children: [
            ...initialData.root.children!,
            {
              id: 'child2',
              title: '新しい子ノード'
            }
          ]
        }
      };

      await user.clear(editor);
      await user.type(editor, JSON.stringify(updatedData, null, 2));

      // デバウンス期間を進める
      act(() => {
        vi.advanceTimersByTime(500);
      });

      // 新しいノードが表示されることを確認
      await waitFor(() => {
        expect(screen.getByText('新しい子ノード')).toBeInTheDocument();
      });
    });

    it('YAMLを編集するとマインドマップが更新される', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      render(<App />);

      const newFileButton = screen.getByRole('button', { name: /新規|新しい/ });
      await user.click(newFileButton);

      await waitFor(() => {
        expect(screen.getByRole('textbox')).toBeInTheDocument();
      });

      const editor = screen.getByRole('textbox');

      // YAML形式でデータを入力
      const yamlContent = `
version: "1.0"
title: "YAML同期テスト"
root:
  id: root
  title: "YAMLルート"
  children:
    - id: yaml-child1
      title: "YAML子ノード1"
    - id: yaml-child2
      title: "YAML子ノード2"
`;

      await user.clear(editor);
      await user.type(editor, yamlContent);

      act(() => {
        vi.advanceTimersByTime(500);
      });

      await waitFor(() => {
        expect(screen.getByText('YAMLルート')).toBeInTheDocument();
        expect(screen.getByText('YAML子ノード1')).toBeInTheDocument();
        expect(screen.getByText('YAML子ノード2')).toBeInTheDocument();
      });
    });

    it('段階的な編集でも正しく同期される', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      render(<App />);

      const newFileButton = screen.getByRole('button', { name: /新規|新しい/ });
      await user.click(newFileButton);

      await waitFor(() => {
        expect(screen.getByRole('textbox')).toBeInTheDocument();
      });

      const editor = screen.getByRole('textbox');

      // 段階的にJSONを構築
      await user.type(editor, '{');
      act(() => { vi.advanceTimersByTime(100); });

      await user.type(editor, '\n  "version": "1.0",');
      act(() => { vi.advanceTimersByTime(100); });

      await user.type(editor, '\n  "title": "段階的テスト",');
      act(() => { vi.advanceTimersByTime(100); });

      await user.type(editor, '\n  "root": {');
      act(() => { vi.advanceTimersByTime(100); });

      await user.type(editor, '\n    "id": "root",');
      act(() => { vi.advanceTimersByTime(100); });

      await user.type(editor, '\n    "title": "段階的ルート"');
      act(() => { vi.advanceTimersByTime(100); });

      await user.type(editor, '\n  }');
      act(() => { vi.advanceTimersByTime(100); });

      await user.type(editor, '\n}');

      // 最終的なデバウンス期間を進める
      act(() => {
        vi.advanceTimersByTime(500);
      });

      // 完成したマインドマップが表示されることを確認
      await waitFor(() => {
        expect(screen.getByText('段階的ルート')).toBeInTheDocument();
      });
    });
  });

  describe('マインドマップからエディタへの同期', () => {
    it('マインドマップでノードを選択するとエディタの該当箇所がハイライトされる', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      render(<App />);

      const newFileButton = screen.getByRole('button', { name: /新規|新しい/ });
      await user.click(newFileButton);

      await waitFor(() => {
        expect(screen.getByRole('textbox')).toBeInTheDocument();
      });

      const editor = screen.getByRole('textbox');
      await user.clear(editor);
      await user.type(editor, JSON.stringify(initialData, null, 2));

      act(() => {
        vi.advanceTimersByTime(500);
      });

      await waitFor(() => {
        expect(screen.getByText('子ノード1')).toBeInTheDocument();
      });

      // マインドマップのノードをクリック
      const childNode = screen.getByText('子ノード1');
      await user.click(childNode);

      // エディタで該当箇所がハイライトされることを確認
      // （実際の実装に応じてセレクタを調整）
      await waitFor(() => {
        const highlightedElements = screen.queryAllByTestId('editor-highlight');
        expect(highlightedElements.length).toBeGreaterThan(0);
      });
    });

    it('ノードの折りたたみ状態が同期される', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      const dataWithGrandchildren: MindmapData = {
        version: '1.0',
        title: '折りたたみテスト',
        root: {
          id: 'root',
          title: 'ルート',
          children: [
            {
              id: 'parent',
              title: '親ノード',
              children: [
                {
                  id: 'grandchild1',
                  title: '孫ノード1'
                },
                {
                  id: 'grandchild2',
                  title: '孫ノード2'
                }
              ]
            }
          ]
        }
      };

      render(<App />);

      const newFileButton = screen.getByRole('button', { name: /新規|新しい/ });
      await user.click(newFileButton);

      await waitFor(() => {
        expect(screen.getByRole('textbox')).toBeInTheDocument();
      });

      const editor = screen.getByRole('textbox');
      await user.clear(editor);
      await user.type(editor, JSON.stringify(dataWithGrandchildren, null, 2));

      act(() => {
        vi.advanceTimersByTime(500);
      });

      await waitFor(() => {
        expect(screen.getByText('親ノード')).toBeInTheDocument();
        expect(screen.getByText('孫ノード1')).toBeInTheDocument();
        expect(screen.getByText('孫ノード2')).toBeInTheDocument();
      });

      // 親ノードを折りたたむ
      const collapseButton = screen.getByTestId('collapse-button-parent');
      await user.click(collapseButton);

      // 孫ノードが非表示になることを確認
      await waitFor(() => {
        expect(screen.queryByText('孫ノード1')).not.toBeInTheDocument();
        expect(screen.queryByText('孫ノード2')).not.toBeInTheDocument();
      });

      // 再度展開
      await user.click(collapseButton);

      // 孫ノードが再表示されることを確認
      await waitFor(() => {
        expect(screen.getByText('孫ノード1')).toBeInTheDocument();
        expect(screen.getByText('孫ノード2')).toBeInTheDocument();
      });
    });
  });

  describe('エラー状態での同期', () => {
    it('構文エラーがある間は最後の有効な表示を維持する', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      render(<App />);

      const newFileButton = screen.getByRole('button', { name: /新規|新しい/ });
      await user.click(newFileButton);

      await waitFor(() => {
        expect(screen.getByRole('textbox')).toBeInTheDocument();
      });

      const editor = screen.getByRole('textbox');

      // 有効なデータを入力
      await user.clear(editor);
      await user.type(editor, JSON.stringify(initialData, null, 2));

      act(() => {
        vi.advanceTimersByTime(500);
      });

      await waitFor(() => {
        expect(screen.getByText('ルートノード')).toBeInTheDocument();
        expect(screen.getByText('子ノード1')).toBeInTheDocument();
      });

      // 無効なJSONに変更
      await user.clear(editor);
      await user.type(editor, '{ "version": "1.0", "title": }');

      act(() => {
        vi.advanceTimersByTime(500);
      });

      // エラーが表示されるが、マインドマップは最後の有効な状態を維持
      await waitFor(() => {
        expect(screen.getByText(/構文エラー|JSON構文エラー/)).toBeInTheDocument();
      });

      // 最後の有効なマインドマップが表示され続ける
      expect(screen.getByText('ルートノード')).toBeInTheDocument();
      expect(screen.getByText('子ノード1')).toBeInTheDocument();
    });

    it('バリデーションエラーがある場合は適切なエラーメッセージを表示する', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      render(<App />);

      const newFileButton = screen.getByRole('button', { name: /新規|新しい/ });
      await user.click(newFileButton);

      await waitFor(() => {
        expect(screen.getByRole('textbox')).toBeInTheDocument();
      });

      const editor = screen.getByRole('textbox');

      // 必須フィールドが不足したデータを入力
      const invalidData = {
        version: '1.0'
        // title と root が不足
      };

      await user.clear(editor);
      await user.type(editor, JSON.stringify(invalidData, null, 2));

      act(() => {
        vi.advanceTimersByTime(500);
      });

      // バリデーションエラーが表示されることを確認
      await waitFor(() => {
        expect(screen.getByText(/データ構造が正しくありません|バリデーションエラー/)).toBeInTheDocument();
      });
    });
  });

  describe('パフォーマンス最適化', () => {
    it('高速な連続編集でもパフォーマンスが維持される', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      render(<App />);

      const newFileButton = screen.getByRole('button', { name: /新規|新しい/ });
      await user.click(newFileButton);

      await waitFor(() => {
        expect(screen.getByRole('textbox')).toBeInTheDocument();
      });

      const editor = screen.getByRole('textbox');

      // 初期データを設定
      await user.clear(editor);
      await user.type(editor, JSON.stringify(initialData, null, 2));

      act(() => {
        vi.advanceTimersByTime(500);
      });

      await waitFor(() => {
        expect(screen.getByText('ルートノード')).toBeInTheDocument();
      });

      const startTime = performance.now();

      // 高速な連続編集をシミュレート
      for (let i = 0; i < 10; i++) {
        const updatedData = {
          ...initialData,
          title: `更新${i}回目`
        };

        await user.clear(editor);
        await user.type(editor, JSON.stringify(updatedData, null, 2));

        // 短い間隔で更新
        act(() => {
          vi.advanceTimersByTime(50);
        });
      }

      // 最終的なデバウンス期間を完了
      act(() => {
        vi.advanceTimersByTime(500);
      });

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // 処理時間が合理的な範囲内であることを確認
      expect(totalTime).toBeLessThan(2000); // 2秒以内

      // 最終的な更新が反映されることを確認
      await waitFor(() => {
        expect(screen.getByDisplayValue(/更新9回目/)).toBeInTheDocument();
      });
    });

    it('大きなデータでも同期が効率的に動作する', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      // 大量のノードを持つデータを作成
      const largeData: MindmapData = {
        version: '1.0',
        title: '大規模同期テスト',
        root: {
          id: 'root',
          title: 'ルート',
          children: Array.from({ length: 50 }, (_, i) => ({
            id: `child-${i}`,
            title: `子ノード${i}`,
            children: Array.from({ length: 5 }, (_, j) => ({
              id: `child-${i}-${j}`,
              title: `孫ノード${i}-${j}`
            }))
          }))
        }
      };

      render(<App />);

      const newFileButton = screen.getByRole('button', { name: /新規|新しい/ });
      await user.click(newFileButton);

      await waitFor(() => {
        expect(screen.getByRole('textbox')).toBeInTheDocument();
      });

      const editor = screen.getByRole('textbox');

      const startTime = performance.now();

      await user.clear(editor);
      await user.type(editor, JSON.stringify(largeData, null, 2));

      act(() => {
        vi.advanceTimersByTime(500);
      });

      await waitFor(() => {
        expect(screen.getByText('ルート')).toBeInTheDocument();
      }, { timeout: 5000 });

      const endTime = performance.now();
      const syncTime = endTime - startTime;

      // 大規模データでも5秒以内に同期が完了することを確認
      expect(syncTime).toBeLessThan(5000);

      // 一部のノードが表示されることを確認
      expect(screen.getByText('子ノード0')).toBeInTheDocument();
    });
  });

  describe('設定による同期制御', () => {
    it('自動同期を無効にできる', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      render(<App />);

      // 設定パネルを開く
      const settingsButton = screen.getByRole('button', { name: /設定/ });
      await user.click(settingsButton);

      // 自動同期を無効にする
      const autoSyncToggle = screen.getByRole('checkbox', { name: /自動同期/ });
      await user.click(autoSyncToggle);

      // 設定パネルを閉じる
      const closeButton = screen.getByRole('button', { name: /閉じる/ });
      await user.click(closeButton);

      const newFileButton = screen.getByRole('button', { name: /新規|新しい/ });
      await user.click(newFileButton);

      await waitFor(() => {
        expect(screen.getByRole('textbox')).toBeInTheDocument();
      });

      const editor = screen.getByRole('textbox');
      await user.clear(editor);
      await user.type(editor, JSON.stringify(initialData, null, 2));

      // デバウンス期間を進めても同期されない
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      // マインドマップが更新されないことを確認
      expect(screen.queryByText('ルートノード')).not.toBeInTheDocument();
    });

    it('同期遅延時間を変更できる', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      render(<App />);

      // 設定パネルを開く
      const settingsButton = screen.getByRole('button', { name: /設定/ });
      await user.click(settingsButton);

      // 同期遅延を1秒に変更
      const delayInput = screen.getByLabelText(/同期遅延|遅延時間/);
      await user.clear(delayInput);
      await user.type(delayInput, '1000');

      const closeButton = screen.getByRole('button', { name: /閉じる/ });
      await user.click(closeButton);

      const newFileButton = screen.getByRole('button', { name: /新規|新しい/ });
      await user.click(newFileButton);

      await waitFor(() => {
        expect(screen.getByRole('textbox')).toBeInTheDocument();
      });

      const editor = screen.getByRole('textbox');
      await user.clear(editor);
      await user.type(editor, JSON.stringify(initialData, null, 2));

      // 500ms では同期されない
      act(() => {
        vi.advanceTimersByTime(500);
      });

      expect(screen.queryByText('ルートノード')).not.toBeInTheDocument();

      // 1000ms で同期される
      act(() => {
        vi.advanceTimersByTime(500);
      });

      await waitFor(() => {
        expect(screen.getByText('ルートノード')).toBeInTheDocument();
      });
    });
  });
});