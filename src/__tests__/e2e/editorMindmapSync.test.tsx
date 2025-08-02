/**
 * エディタとマインドマップの同期のE2Eテスト
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../../App';
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

// Monaco Editorのモック
const mockEditor = {
  getValue: vi.fn(),
  setValue: vi.fn(),
  getModel: vi.fn(),
  setSelection: vi.fn(),
  revealLineInCenter: vi.fn(),
  deltaDecorations: vi.fn(),
  onDidChangeModelContent: vi.fn(),
  focus: vi.fn(),
  getPosition: vi.fn(),
  setPosition: vi.fn()
};

vi.mock('@monaco-editor/react', () => ({
  Editor: ({ onChange, value, onMount }: any) => {
    const handleChange = (newValue: string) => {
      if (onChange) {
        onChange(newValue);
      }
    };

    // onMountが呼ばれた時にモックエディタを渡す
    if (onMount) {
      setTimeout(() => onMount(mockEditor), 0);
    }

    return (
      <textarea
        data-testid="monaco-editor"
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        style={{ width: '100%', height: '100%', fontFamily: 'monospace' }}
      />
    );
  }
}));

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
    vi.clearAllMocks();
    mockEditor.getValue.mockReturnValue('');
    mockEditor.getModel.mockReturnValue({
      findMatches: vi.fn().mockReturnValue([]),
      getLineContent: vi.fn(),
      getLineCount: vi.fn().mockReturnValue(1)
    });
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.useFakeTimers();
  });

  describe('エディタ→マインドマップ同期', () => {
    it('エディタでの段階的編集がマインドマップにリアルタイムで反映される', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      render(<App />);

      // 新規ファイルを作成
      const newFileButton = screen.getByRole('button', { name: /新規|新しい/ });
      await user.click(newFileButton);

      await waitFor(() => {
        expect(screen.getByTestId('monaco-editor')).toBeInTheDocument();
      });

      const editor = screen.getByTestId('monaco-editor');

      // 段階1: 基本構造を入力
      const basicStructure = {
        version: '1.0',
        title: '段階的構築テスト',
        root: {
          id: 'root',
          title: 'ルート'
        }
      };

      await user.clear(editor);
      await user.type(editor, JSON.stringify(basicStructure, null, 2));

      act(() => {
        vi.advanceTimersByTime(500);
      });

      // マインドマップにルートノードが表示されることを確認
      await waitFor(() => {
        expect(screen.getByText('ルート')).toBeInTheDocument();
      });

      // 段階2: 子ノードを追加
      const withChildren = {
        ...basicStructure,
        root: {
          ...basicStructure.root,
          children: [
            {
              id: 'child1',
              title: '子ノード1'
            }
          ]
        }
      };

      await user.clear(editor);
      await user.type(editor, JSON.stringify(withChildren, null, 2));

      act(() => {
        vi.advanceTimersByTime(500);
      });

      // 子ノードが追加されることを確認
      await waitFor(() => {
        expect(screen.getByText('子ノード1')).toBeInTheDocument();
      });

      // 段階3: さらに子ノードを追加
      const moreChildren = {
        ...withChildren,
        root: {
          ...withChildren.root,
          children: [
            ...withChildren.root.children!,
            {
              id: 'child2',
              title: '子ノード2',
              description: '2番目の子ノード'
            }
          ]
        }
      };

      await user.clear(editor);
      await user.type(editor, JSON.stringify(moreChildren, null, 2));

      act(() => {
        vi.advanceTimersByTime(500);
      });

      // 新しい子ノードが追加されることを確認
      await waitFor(() => {
        expect(screen.getByText('子ノード2')).toBeInTheDocument();
      });

      // 段階4: 孫ノードを追加
      const withGrandchildren = {
        ...moreChildren,
        root: {
          ...moreChildren.root,
          children: [
            {
              ...moreChildren.root.children![0],
              children: [
                {
                  id: 'grandchild1',
                  title: '孫ノード1'
                }
              ]
            },
            moreChildren.root.children![1]
          ]
        }
      };

      await user.clear(editor);
      await user.type(editor, JSON.stringify(withGrandchildren, null, 2));

      act(() => {
        vi.advanceTimersByTime(500);
      });

      // 孫ノードが追加されることを確認
      await waitFor(() => {
        expect(screen.getByText('孫ノード1')).toBeInTheDocument();
      });
    });

    it('エディタでのノード削除がマインドマップに反映される', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      render(<App />);

      const newFileButton = screen.getByRole('button', { name: /新規|新しい/ });
      await user.click(newFileButton);

      await waitFor(() => {
        expect(screen.getByTestId('monaco-editor')).toBeInTheDocument();
      });

      const editor = screen.getByTestId('monaco-editor');

      // 初期データを設定
      await user.clear(editor);
      await user.type(editor, JSON.stringify(syncTestData, null, 2));

      act(() => {
        vi.advanceTimersByTime(500);
      });

      // 全てのノードが表示されることを確認
      await waitFor(() => {
        expect(screen.getByText('プロジェクト')).toBeInTheDocument();
        expect(screen.getByText('フロントエンド')).toBeInTheDocument();
        expect(screen.getByText('バックエンド')).toBeInTheDocument();
        expect(screen.getByText('React開発')).toBeInTheDocument();
        expect(screen.getByText('API開発')).toBeInTheDocument();
      });

      // バックエンドノードを削除
      const dataWithoutBackend = {
        ...syncTestData,
        root: {
          ...syncTestData.root,
          children: syncTestData.root.children!.filter(child => child.id !== 'backend')
        }
      };

      await user.clear(editor);
      await user.type(editor, JSON.stringify(dataWithoutBackend, null, 2));

      act(() => {
        vi.advanceTimersByTime(500);
      });

      // バックエンド関連のノードが削除されることを確認
      await waitFor(() => {
        expect(screen.queryByText('バックエンド')).not.toBeInTheDocument();
        expect(screen.queryByText('API開発')).not.toBeInTheDocument();
        expect(screen.queryByText('データベース')).not.toBeInTheDocument();
      });

      // フロントエンド関連のノードは残ることを確認
      expect(screen.getByText('フロントエンド')).toBeInTheDocument();
      expect(screen.getByText('React開発')).toBeInTheDocument();
    });

    it('エディタでのプロパティ変更がマインドマップに反映される', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      render(<App />);

      const newFileButton = screen.getByRole('button', { name: /新規|新しい/ });
      await user.click(newFileButton);

      await waitFor(() => {
        expect(screen.getByTestId('monaco-editor')).toBeInTheDocument();
      });

      const editor = screen.getByTestId('monaco-editor');

      // 初期データを設定
      await user.clear(editor);
      await user.type(editor, JSON.stringify(syncTestData, null, 2));

      act(() => {
        vi.advanceTimersByTime(500);
      });

      await waitFor(() => {
        expect(screen.getByText('React開発')).toBeInTheDocument();
      });

      // React開発ノードをクリックして詳細を表示
      const reactNode = screen.getByText('React開発');
      await user.click(reactNode);

      await waitFor(() => {
        const nodeDetailsPanel = screen.getByTestId('node-details-panel');
        expect(nodeDetailsPanel).toHaveTextContent('in-progress');
      });

      // ステータスを変更
      const updatedData = {
        ...syncTestData,
        root: {
          ...syncTestData.root,
          children: syncTestData.root.children!.map(child => 
            child.id === 'frontend' ? {
              ...child,
              children: child.children!.map(grandchild =>
                grandchild.id === 'react' ? {
                  ...grandchild,
                  customFields: {
                    ...grandchild.customFields,
                    status: 'done'
                  }
                } : grandchild
              )
            } : child
          )
        }
      };

      await user.clear(editor);
      await user.type(editor, JSON.stringify(updatedData, null, 2));

      act(() => {
        vi.advanceTimersByTime(500);
      });

      // ノードを再選択して変更を確認
      await user.click(reactNode);

      await waitFor(() => {
        const nodeDetailsPanel = screen.getByTestId('node-details-panel');
        expect(nodeDetailsPanel).toHaveTextContent('done');
      });
    });
  });

  describe('マインドマップ→エディタ同期', () => {
    it('マインドマップでのノード選択がエディタのハイライトに反映される', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      render(<App />);

      const newFileButton = screen.getByRole('button', { name: /新規|新しい/ });
      await user.click(newFileButton);

      await waitFor(() => {
        expect(screen.getByTestId('monaco-editor')).toBeInTheDocument();
      });

      const editor = screen.getByTestId('monaco-editor');

      // データを設定
      await user.clear(editor);
      await user.type(editor, JSON.stringify(syncTestData, null, 2));

      act(() => {
        vi.advanceTimersByTime(500);
      });

      await waitFor(() => {
        expect(screen.getByText('React開発')).toBeInTheDocument();
      });

      // React開発ノードをクリック
      const reactNode = screen.getByText('React開発');
      await user.click(reactNode);

      // エディタで該当箇所がハイライトされることを確認
      await waitFor(() => {
        expect(mockEditor.deltaDecorations).toHaveBeenCalled();
        expect(mockEditor.revealLineInCenter).toHaveBeenCalled();
      });

      // 別のノードをクリック
      const apiNode = screen.getByText('API開発');
      await user.click(apiNode);

      // ハイライトが更新されることを確認
      await waitFor(() => {
        expect(mockEditor.deltaDecorations).toHaveBeenCalledTimes(2);
      });
    });

    it('マインドマップでのノード折りたたみがエディタに反映される', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      render(<App />);

      const newFileButton = screen.getByRole('button', { name: /新規|新しい/ });
      await user.click(newFileButton);

      await waitFor(() => {
        expect(screen.getByTestId('monaco-editor')).toBeInTheDocument();
      });

      const editor = screen.getByTestId('monaco-editor');

      // データを設定
      await user.clear(editor);
      await user.type(editor, JSON.stringify(syncTestData, null, 2));

      act(() => {
        vi.advanceTimersByTime(500);
      });

      await waitFor(() => {
        expect(screen.getByText('フロントエンド')).toBeInTheDocument();
        expect(screen.getByText('React開発')).toBeInTheDocument();
      });

      // フロントエンドノードを折りたたむ
      const frontendCollapseButton = screen.getByTestId('collapse-button-frontend');
      await user.click(frontendCollapseButton);

      // 子ノードが非表示になることを確認
      await waitFor(() => {
        expect(screen.queryByText('React開発')).not.toBeInTheDocument();
        expect(screen.queryByText('スタイリング')).not.toBeInTheDocument();
      });

      // エディタの内容は変更されないことを確認（表示のみの変更）
      const currentValue = (editor as HTMLTextAreaElement).value;
      expect(currentValue).toContain('React開発');
      expect(currentValue).toContain('スタイリング');

      // 展開
      const frontendExpandButton = screen.getByTestId('expand-button-frontend');
      await user.click(frontendExpandButton);

      // 子ノードが再表示されることを確認
      await waitFor(() => {
        expect(screen.getByText('React開発')).toBeInTheDocument();
        expect(screen.getByText('スタイリング')).toBeInTheDocument();
      });
    });
  });

  describe('双方向同期の整合性', () => {
    it('エディタとマインドマップの双方向同期が正しく動作する', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      render(<App />);

      const newFileButton = screen.getByRole('button', { name: /新規|新しい/ });
      await user.click(newFileButton);

      await waitFor(() => {
        expect(screen.getByTestId('monaco-editor')).toBeInTheDocument();
      });

      const editor = screen.getByTestId('monaco-editor');

      // 初期データを設定
      await user.clear(editor);
      await user.type(editor, JSON.stringify(syncTestData, null, 2));

      act(() => {
        vi.advanceTimersByTime(500);
      });

      await waitFor(() => {
        expect(screen.getByText('プロジェクト')).toBeInTheDocument();
      });

      // ステップ1: マインドマップでノードを選択
      const reactNode = screen.getByText('React開発');
      await user.click(reactNode);

      // エディタでハイライトされることを確認
      await waitFor(() => {
        expect(mockEditor.deltaDecorations).toHaveBeenCalled();
      });

      // ステップ2: エディタでデータを編集
      const editedData = {
        ...syncTestData,
        root: {
          ...syncTestData.root,
          children: [
            ...syncTestData.root.children!,
            {
              id: 'testing',
              title: 'テスト',
              description: 'テストフェーズ',
              children: [
                {
                  id: 'unit-test',
                  title: '単体テスト',
                  description: 'ユニットテストの実装'
                }
              ]
            }
          ]
        }
      };

      await user.clear(editor);
      await user.type(editor, JSON.stringify(editedData, null, 2));

      act(() => {
        vi.advanceTimersByTime(500);
      });

      // マインドマップに新しいノードが表示されることを確認
      await waitFor(() => {
        expect(screen.getByText('テスト')).toBeInTheDocument();
        expect(screen.getByText('単体テスト')).toBeInTheDocument();
      });

      // ステップ3: 新しく追加されたノードを選択
      const testNode = screen.getByText('テスト');
      await user.click(testNode);

      // エディタで新しいノードの箇所がハイライトされることを確認
      await waitFor(() => {
        expect(mockEditor.deltaDecorations).toHaveBeenCalledTimes(2);
      });

      // ステップ4: ノードの詳細情報が正しく表示されることを確認
      const nodeDetailsPanel = screen.getByTestId('node-details-panel');
      expect(nodeDetailsPanel).toHaveTextContent('テスト');
      expect(nodeDetailsPanel).toHaveTextContent('テストフェーズ');
    });

    it('同期エラーからの回復機能を確認する', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      render(<App />);

      const newFileButton = screen.getByRole('button', { name: /新規|新しい/ });
      await user.click(newFileButton);

      await waitFor(() => {
        expect(screen.getByTestId('monaco-editor')).toBeInTheDocument();
      });

      const editor = screen.getByTestId('monaco-editor');

      // 有効なデータを設定
      await user.clear(editor);
      await user.type(editor, JSON.stringify(syncTestData, null, 2));

      act(() => {
        vi.advanceTimersByTime(500);
      });

      await waitFor(() => {
        expect(screen.getByText('プロジェクト')).toBeInTheDocument();
      });

      // ノードを選択
      const reactNode = screen.getByText('React開発');
      await user.click(reactNode);

      await waitFor(() => {
        const nodeDetailsPanel = screen.getByTestId('node-details-panel');
        expect(nodeDetailsPanel).toHaveTextContent('React開発');
      });

      // 無効なJSONを入力してエラーを発生させる
      const invalidJson = '{ "version": "1.0", "title": "broken" }';
      await user.clear(editor);
      await user.type(editor, invalidJson);

      act(() => {
        vi.advanceTimersByTime(500);
      });

      // エラーが表示されることを確認
      await waitFor(() => {
        expect(screen.getByText(/構文エラー|JSON構文エラー/)).toBeInTheDocument();
      });

      // マインドマップは最後の有効な状態を維持
      expect(screen.getByText('プロジェクト')).toBeInTheDocument();

      // 選択状態も維持されることを確認
      expect(reactNode).toHaveClass('selected');

      // 有効なデータに修正
      const fixedData = {
        version: '1.0',
        title: '修正済み',
        root: {
          id: 'root',
          title: '修正済みプロジェクト'
        }
      };

      await user.clear(editor);
      await user.type(editor, JSON.stringify(fixedData, null, 2));

      act(() => {
        vi.advanceTimersByTime(500);
      });

      // エラーが解消され、新しいデータが表示されることを確認
      await waitFor(() => {
        expect(screen.queryByText(/構文エラー/)).not.toBeInTheDocument();
        expect(screen.getByText('修正済みプロジェクト')).toBeInTheDocument();
      });

      // 古いノードは表示されないことを確認
      expect(screen.queryByText('React開発')).not.toBeInTheDocument();
    });
  });

  describe('同期パフォーマンス', () => {
    it('大量データでの同期パフォーマンスを確認する', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      // 大量のノードを持つデータを作成
      const largeData: MindmapData = {
        version: '1.0',
        title: '大規模同期テスト',
        root: {
          id: 'root',
          title: 'ルート',
          children: Array.from({ length: 100 }, (_, i) => ({
            id: `node-${i}`,
            title: `ノード${i}`,
            description: `ノード${i}の説明`,
            children: Array.from({ length: 10 }, (_, j) => ({
              id: `node-${i}-${j}`,
              title: `子ノード${i}-${j}`,
              customFields: {
                priority: i % 3 === 0 ? 'high' : i % 3 === 1 ? 'medium' : 'low',
                status: j % 3 === 0 ? 'todo' : j % 3 === 1 ? 'in-progress' : 'done'
              }
            }))
          }))
        }
      };

      render(<App />);

      const newFileButton = screen.getByRole('button', { name: /新規|新しい/ });
      await user.click(newFileButton);

      await waitFor(() => {
        expect(screen.getByTestId('monaco-editor')).toBeInTheDocument();
      });

      const editor = screen.getByTestId('monaco-editor');

      const startTime = performance.now();

      // 大量データを入力
      await user.clear(editor);
      await user.type(editor, JSON.stringify(largeData, null, 2));

      act(() => {
        vi.advanceTimersByTime(500);
      });

      // マインドマップが表示されるまでの時間を測定
      await waitFor(() => {
        expect(screen.getByText('ルート')).toBeInTheDocument();
      }, { timeout: 10000 });

      const syncTime = performance.now() - startTime;

      // 大量データでも10秒以内に同期が完了することを確認
      expect(syncTime).toBeLessThan(10000);

      // ノード選択のパフォーマンステスト
      const nodeSelectionStartTime = performance.now();

      const firstNode = screen.getByText('ノード0');
      await user.click(firstNode);

      await waitFor(() => {
        expect(mockEditor.deltaDecorations).toHaveBeenCalled();
      });

      const nodeSelectionTime = performance.now() - nodeSelectionStartTime;

      // ノード選択が1秒以内に完了することを確認
      expect(nodeSelectionTime).toBeLessThan(1000);
    });

    it('高速な連続編集での同期パフォーマンスを確認する', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      render(<App />);

      const newFileButton = screen.getByRole('button', { name: /新規|新しい/ });
      await user.click(newFileButton);

      await waitFor(() => {
        expect(screen.getByTestId('monaco-editor')).toBeInTheDocument();
      });

      const editor = screen.getByTestId('monaco-editor');

      // 基本データを設定
      let currentData = {
        version: '1.0',
        title: '高速編集テスト',
        root: {
          id: 'root',
          title: 'ルート',
          children: [] as any[]
        }
      };

      await user.clear(editor);
      await user.type(editor, JSON.stringify(currentData, null, 2));

      act(() => {
        vi.advanceTimersByTime(500);
      });

      await waitFor(() => {
        expect(screen.getByText('ルート')).toBeInTheDocument();
      });

      const startTime = performance.now();

      // 高速で連続編集を実行
      for (let i = 0; i < 10; i++) {
        currentData = {
          ...currentData,
          root: {
            ...currentData.root,
            children: [
              ...currentData.root.children,
              {
                id: `rapid-${i}`,
                title: `高速ノード${i}`,
                description: `高速編集で追加されたノード${i}`
              }
            ]
          }
        };

        await user.clear(editor);
        await user.type(editor, JSON.stringify(currentData, null, 2));

        // 短い間隔で更新
        act(() => {
          vi.advanceTimersByTime(100);
        });
      }

      // 最終的なデバウンス期間を完了
      act(() => {
        vi.advanceTimersByTime(500);
      });

      // 最終的な状態が正しく反映されることを確認
      await waitFor(() => {
        expect(screen.getByText('高速ノード9')).toBeInTheDocument();
      });

      const totalTime = performance.now() - startTime;

      // 高速連続編集が5秒以内に完了することを確認
      expect(totalTime).toBeLessThan(5000);

      // 全てのノードが正しく表示されることを確認
      for (let i = 0; i < 10; i++) {
        expect(screen.getByText(`高速ノード${i}`)).toBeInTheDocument();
      }
    });
  });

  describe('同期設定とカスタマイズ', () => {
    it('同期遅延設定が正しく動作することを確認する', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      render(<App />);

      // 設定パネルを開く
      const settingsButton = screen.getByRole('button', { name: /設定/ });
      await user.click(settingsButton);

      // 同期遅延を1秒に設定
      const syncDelayInput = screen.getByLabelText(/同期遅延|遅延時間/);
      await user.clear(syncDelayInput);
      await user.type(syncDelayInput, '1000');

      const closeButton = screen.getByRole('button', { name: /閉じる/ });
      await user.click(closeButton);

      const newFileButton = screen.getByRole('button', { name: /新規|新しい/ });
      await user.click(newFileButton);

      await waitFor(() => {
        expect(screen.getByTestId('monaco-editor')).toBeInTheDocument();
      });

      const editor = screen.getByTestId('monaco-editor');

      // データを入力
      const testData = {
        version: '1.0',
        title: '遅延テスト',
        root: { id: 'root', title: 'ルート' }
      };

      await user.clear(editor);
      await user.type(editor, JSON.stringify(testData, null, 2));

      // 500ms では同期されない
      act(() => {
        vi.advanceTimersByTime(500);
      });

      expect(screen.queryByText('ルート')).not.toBeInTheDocument();

      // 1000ms で同期される
      act(() => {
        vi.advanceTimersByTime(500);
      });

      await waitFor(() => {
        expect(screen.getByText('ルート')).toBeInTheDocument();
      });
    });

    it('自動同期の有効/無効切り替えが正しく動作することを確認する', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      render(<App />);

      // 設定パネルを開く
      const settingsButton = screen.getByRole('button', { name: /設定/ });
      await user.click(settingsButton);

      // 自動同期を無効にする
      const autoSyncToggle = screen.getByRole('checkbox', { name: /自動同期/ });
      await user.click(autoSyncToggle);

      const closeButton = screen.getByRole('button', { name: /閉じる/ });
      await user.click(closeButton);

      const newFileButton = screen.getByRole('button', { name: /新規|新しい/ });
      await user.click(newFileButton);

      await waitFor(() => {
        expect(screen.getByTestId('monaco-editor')).toBeInTheDocument();
      });

      const editor = screen.getByTestId('monaco-editor');

      // データを入力
      const testData = {
        version: '1.0',
        title: '自動同期無効テスト',
        root: { id: 'root', title: 'ルート' }
      };

      await user.clear(editor);
      await user.type(editor, JSON.stringify(testData, null, 2));

      // 十分な時間が経過しても同期されない
      act(() => {
        vi.advanceTimersByTime(2000);
      });

      expect(screen.queryByText('ルート')).not.toBeInTheDocument();

      // 手動同期ボタンをクリック
      const manualSyncButton = screen.getByRole('button', { name: /手動同期|同期/ });
      await user.click(manualSyncButton);

      // 手動同期で更新される
      await waitFor(() => {
        expect(screen.getByText('ルート')).toBeInTheDocument();
      });
    });
  });
});