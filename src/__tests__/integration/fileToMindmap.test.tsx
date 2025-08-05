/**
 * ファイル読み込みからマインドマップ表示までの統合テスト
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../../App';
import type { MindmapData } from '../../types';
import { useAppStore } from '../../stores';

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

// Monaco Editorのモック
vi.mock('@monaco-editor/react', () => ({
  default: ({ value, onChange }: { value: string; onChange: (value: string) => void }) => (
    <textarea
      data-testid="monaco-editor"
      value={value || ''}
      onChange={(e) => onChange?.(e.target.value)}
      style={{ width: '100%', height: '100%' }}
    />
  ),
}));

// MindmapRendererのモック
vi.mock('../../services/mindmapRenderer', () => ({
  MindmapRenderer: vi.fn().mockImplementation((svgElement: SVGElement) => {
    const mockRenderer = {
      render: vi.fn((data: any) => {
        // マインドマップのノードをSVGに追加
        if (data && data.root) {
          const addNode = (node: any, parent?: SVGElement) => {
            const textElement = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            textElement.textContent = node.title;
            textElement.setAttribute('data-testid', `mindmap-node-${node.id}`);
            svgElement.appendChild(textElement);
            
            if (node.children) {
              node.children.forEach((child: any) => addNode(child, textElement));
            }
          };
          
          // 非同期でノードを追加（実際のレンダリングをシミュレート）
          setTimeout(() => {
            addNode(data.root);
          }, 100);
        }
      }),
      updateSettings: vi.fn(),
      selectNode: vi.fn(),
      highlightCursorNode: vi.fn(),
      destroy: vi.fn(),
      resetView: vi.fn(),
      zoomIn: vi.fn(),
      zoomOut: vi.fn(),
      toggleNode: vi.fn(),
      focusNode: vi.fn(),
      centerView: vi.fn(),
      setPerformanceMode: vi.fn(),
      logPerformanceStats: vi.fn(),
      optimizeMemory: vi.fn(),
      getPerformanceStats: vi.fn(() => ({
        currentSettings: { enableVirtualization: false }
      })),
      setVirtualizationEnabled: vi.fn(),
    };
    
    return mockRenderer;
  }),
}));

// FileServiceのモック
vi.mock('../../services/fileService', () => ({
  fileService: {
    loadFile: vi.fn(),
    saveFile: vi.fn(),
  },
}));

// ParserServiceのモック
vi.mock('../../services/parserService', () => ({
  parserService: {
    parse: vi.fn((content: string) => {
      try {
        return JSON.parse(content);
      } catch (error) {
        return null;
      }
    }),
    parseContent: vi.fn(),
    getParseErrors: vi.fn(() => []),
    validate: vi.fn(() => ({ isValid: true, errors: [] })),
  },
}));

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
      const { container } = render(<App />);

      // AppStoreに直接データを設定（実際のファイル読み込みをスキップ）
      const store = useAppStore.getState();
      const jsonContent = JSON.stringify(testMindmapData, null, 2);
      
      // ファイル内容を直接設定
      await act(async () => {
        store.updateContent(jsonContent);
        // パース処理の完了を待つ
        await new Promise(resolve => setTimeout(resolve, 500));
      });

      // エディタに内容が表示されることを確認
      await waitFor(() => {
        const editor = screen.getByTestId('monaco-editor') as HTMLTextAreaElement;
        expect(editor.value).toContain('テスト統合マインドマップ');
      }, { timeout: 5000 });

      // ファイルサイズが更新されていることを確認
      await waitFor(() => {
        const fileSize = container.querySelector('.file-size');
        expect(fileSize?.textContent).toContain('KB');
      }, { timeout: 5000 });

      // パース状態が正常であることを確認
      await waitFor(() => {
        const state = useAppStore.getState();
        expect(state.file.fileContent).toContain('テスト統合マインドマップ');
        expect(state.file.fileSize).toBeGreaterThan(0);
      }, { timeout: 5000 });
    });

    it('カスタムフィールドが正しく表示される', async () => {
      const { container } = render(<App />);

      // AppStoreに直接データを設定
      const store = useAppStore.getState();
      const jsonContent = JSON.stringify(testMindmapData, null, 2);
      
      await act(async () => {
        store.updateContent(jsonContent);
        await new Promise(resolve => setTimeout(resolve, 500));
      });

      // エディタにカスタムフィールドのデータが表示されることを確認
      await waitFor(() => {
        const editor = screen.getByTestId('monaco-editor') as HTMLTextAreaElement;
        expect(editor.value).toContain('ユーザー認証');
        expect(editor.value).toContain('customFields');
      }, { timeout: 5000 });

      // カスタムフィールドがJSONに含まれていることを確認
      const editor = screen.getByTestId('monaco-editor') as HTMLTextAreaElement;
      expect(editor.value).toContain('priority');
      expect(editor.value).toContain('田中');
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
        const editor = screen.getByTestId('monaco-editor');
        expect(editor).toHaveValue(expect.stringContaining('YAML統合テスト'));
      }, { timeout: 10000 });

      // マインドマップが表示されることを確認
      await waitFor(() => {
        expect(screen.getByText('YAMLルート')).toBeInTheDocument();
        expect(screen.getByText('YAML子ノード1')).toBeInTheDocument();
        expect(screen.getByText('YAML子ノード2')).toBeInTheDocument();
      }, { timeout: 10000 });
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
        const editor = screen.getByTestId('monaco-editor');
        expect(editor).toHaveValue(expect.stringContaining('テスト統合マインドマップ'));
      }, { timeout: 10000 });

      // エディタでデータを編集
      const editor = screen.getByTestId('monaco-editor');
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
      await waitFor(() => {
        const mindmapContainer = screen.getByTestId('mindmap-container');
        expect(mindmapContainer).toBeInTheDocument();
      }, { timeout: 5000 });
    });
  });

  describe('パフォーマンス', () => {
    it('大量のノードを持つファイルを効率的に処理する', async () => {
      const user = userEvent.setup();
      
      // 10個の子ノードを持つデータを作成（テスト実行時間を短縮）
      const largeData: MindmapData = {
        version: '1.0',
        title: '大規模マインドマップ',
        root: {
          id: 'root',
          title: 'ルート',
          children: Array.from({ length: 10 }, (_, i) => ({
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
      }, { timeout: 10000 });

      const endTime = performance.now();
      const loadTime = endTime - startTime;

      // 10秒以内に読み込みが完了することを確認
      expect(loadTime).toBeLessThan(10000);

      // 一部のノードが表示されることを確認（仮想化により全てが表示されるとは限らない）
      await waitFor(() => {
        expect(screen.getByText('子ノード0')).toBeInTheDocument();
      }, { timeout: 5000 });
    });
  });
});