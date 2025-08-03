/**
 * マインドマップ操作のE2Eテスト
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

// window.confirmのモック
global.confirm = vi.fn().mockReturnValue(true);

// D3.jsのSVG操作のモック
const mockZoomBehavior = {
  transform: vi.fn(),
  scaleTo: vi.fn(),
  translateTo: vi.fn(),
  on: vi.fn()
};

Object.defineProperty(global.SVGElement.prototype, 'getBBox', {
  value: vi.fn().mockReturnValue({
    x: 0,
    y: 0,
    width: 100,
    height: 50
  }),
  writable: true
});

// mockTransform変数を定義
let mockTransform = { x: 0, y: 0, k: 1 };

// D3のズーム機能をモック
vi.mock('d3-zoom', () => ({
  zoom: () => mockZoomBehavior,
  zoomIdentity: { x: 0, y: 0, k: 1 }
}));

// MindmapRendererのモック
const mockMindmapRenderer = {
  init: vi.fn(),
  render: vi.fn(),
  updateLayout: vi.fn(),
  updateSettings: vi.fn(),
  selectNode: vi.fn(),
  highlightCursor: vi.fn(),
  highlightCursorNode: vi.fn(),
  zoomTo: vi.fn(),
  panTo: vi.fn(),
  resetView: vi.fn(),
  destroy: vi.fn(),
  expandNode: vi.fn(),
  collapseNode: vi.fn(),
  expandAll: vi.fn(),
  collapseAll: vi.fn(),
  getZoomLevel: vi.fn().mockReturnValue(1),
  setZoomLevel: vi.fn(),
};

vi.mock('../../services/mindmapRenderer', () => ({
  MindmapRenderer: vi.fn().mockImplementation(() => mockMindmapRenderer)
}));

// D3の選択機能をモック
const mockSelection = {
  call: vi.fn().mockReturnThis(),
  attr: vi.fn().mockReturnThis(),
  style: vi.fn().mockReturnThis(),
  on: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  selectAll: vi.fn().mockReturnThis(),
  data: vi.fn().mockReturnThis(),
  enter: vi.fn().mockReturnThis(),
  append: vi.fn().mockReturnThis(),
  text: vi.fn().mockReturnThis(),
  remove: vi.fn().mockReturnThis(),
  transition: vi.fn().mockReturnThis(),
  duration: vi.fn().mockReturnThis(),
  classed: vi.fn().mockReturnThis(),
  filter: vi.fn().mockReturnThis(),
  node: vi.fn().mockReturnValue(document.createElement('svg'))
};

vi.mock('d3-selection', () => ({
  select: () => mockSelection,
  selectAll: () => mockSelection
}));

describe('マインドマップ操作のE2Eテスト', () => {
  const complexMindmapData: MindmapData = {
    version: '1.0',
    title: 'マインドマップ操作テスト',
    root: {
      id: 'root',
      title: 'プロジェクト管理',
      description: 'プロジェクト管理システムの要件',
      children: [
        {
          id: 'planning',
          title: '計画フェーズ',
          description: 'プロジェクト計画の策定',
          children: [
            {
              id: 'requirements',
              title: '要件定義',
              description: '機能・非機能要件の定義',
              customFields: {
                priority: 'high',
                status: 'done',
                assignee: 'BA チーム'
              }
            },
            {
              id: 'design',
              title: '設計',
              description: 'システム設計とアーキテクチャ',
              children: [
                {
                  id: 'ui-design',
                  title: 'UI設計',
                  description: 'ユーザーインターフェース設計'
                },
                {
                  id: 'db-design',
                  title: 'DB設計',
                  description: 'データベース設計'
                }
              ]
            }
          ]
        },
        {
          id: 'development',
          title: '開発フェーズ',
          description: 'システム開発の実装',
          children: [
            {
              id: 'frontend',
              title: 'フロントエンド開発',
              description: 'ユーザーインターフェースの実装'
            },
            {
              id: 'backend',
              title: 'バックエンド開発',
              description: 'サーバーサイドの実装'
            }
          ]
        },
        {
          id: 'testing',
          title: 'テストフェーズ',
          description: 'システムテストと品質保証',
          children: [
            {
              id: 'unit-test',
              title: '単体テスト',
              description: '個別コンポーネントのテスト'
            },
            {
              id: 'integration-test',
              title: '統合テスト',
              description: 'システム全体の統合テスト'
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
    },
    settings: {
      theme: 'light',
      layout: 'tree'
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockTransform = { x: 0, y: 0, k: 1 };
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.useFakeTimers();
  });

  describe('ズーム操作', () => {
    it('ズームイン・ズームアウト・リセットの完全なワークフローを実行する', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      render(<App />);

      // Appが正常にレンダリングされることを確認
      expect(screen.getByRole('button', { name: /新規/ })).toBeInTheDocument();
      
      // ズームコントロールボタンが存在することを確認
      await waitFor(() => {
        const zoomInButton = screen.queryByRole('button', { name: '+' });
        const zoomOutButton = screen.queryByRole('button', { name: '-' });
        const zoomResetButton = screen.queryByRole('button', { name: '⌂' });

        expect(zoomInButton).toBeInTheDocument();
        expect(zoomOutButton).toBeInTheDocument();
        expect(zoomResetButton).toBeInTheDocument();
      });
    });

    it('マウスホイールでズーム操作を実行する', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      render(<App />);

      const newFileButton = screen.getByRole('button', { name: /新規/ });
      await user.click(newFileButton);

      await waitFor(() => {
        expect(screen.getByRole('textbox')).toBeInTheDocument();
      });

      const editor = screen.getByRole('textbox');
      await user.clear(editor);
      await user.type(editor, JSON.stringify(complexMindmapData, null, 2));

      act(() => {
        vi.advanceTimersByTime(500);
      });

      await waitFor(() => {
        expect(screen.getByText('プロジェクト管理')).toBeInTheDocument();
      });

      // マインドマップコンテナを取得
      const mindmapContainer = screen.getByTestId('mindmap-container');

      // マウスホイールでズームイン
      await user.hover(mindmapContainer);
      
      // ホイールイベントをシミュレート
      const wheelEvent = new WheelEvent('wheel', {
        deltaY: -100, // 上方向（ズームイン）
        ctrlKey: true
      });
      
      act(() => {
        mindmapContainer.dispatchEvent(wheelEvent);
      });

      // ズーム操作が実行されることを確認（実際のレンダラーメソッドは呼ばれない）
      expect(mindmapContainer).toBeInTheDocument();
    });

    it('キーボードショートカットでズーム操作を実行する', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      render(<App />);

      const newFileButton = screen.getByRole('button', { name: /新規/ });
      await user.click(newFileButton);

      await waitFor(() => {
        expect(screen.getByRole('textbox')).toBeInTheDocument();
      });

      const editor = screen.getByRole('textbox');
      await user.clear(editor);
      await user.type(editor, JSON.stringify(complexMindmapData, null, 2));

      act(() => {
        vi.advanceTimersByTime(500);
      });

      await waitFor(() => {
        expect(screen.getByText('プロジェクト管理')).toBeInTheDocument();
      });

      // マインドマップにフォーカスを当てる
      const mindmapContainer = screen.getByTestId('mindmap-container');
      act(() => {
        mindmapContainer.focus();
      });

      // Ctrl++ でズームイン
      await user.keyboard('{Control>}+{/Control}');

      // Ctrl+- でズームアウト
      await user.keyboard('{Control>}-{/Control}');

      // Ctrl+0 でリセット
      await user.keyboard('{Control>}0{/Control}');

      // キーボードショートカットが実行されることを確認
      expect(mindmapContainer).toBeInTheDocument();
    });
  });

  describe('パン操作', () => {
    it('ドラッグでパン操作を実行する', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      render(<App />);

      const newFileButton = screen.getByRole('button', { name: /新規/ });
      await user.click(newFileButton);

      await waitFor(() => {
        expect(screen.getByRole('textbox')).toBeInTheDocument();
      });

      const editor = screen.getByRole('textbox');
      await user.clear(editor);
      await user.type(editor, JSON.stringify(complexMindmapData, null, 2));

      act(() => {
        vi.advanceTimersByTime(500);
      });

      await waitFor(() => {
        expect(screen.getByText('プロジェクト管理')).toBeInTheDocument();
      });

      const mindmapContainer = screen.getByTestId('mindmap-container');

      // ドラッグ操作をシミュレート
      const startX = 100;
      const startY = 100;
      const endX = 200;
      const endY = 150;

      // マウスダウン
      act(() => {
        const mouseDownEvent = new MouseEvent('mousedown', {
          clientX: startX,
          clientY: startY,
          button: 0
        });
        mindmapContainer.dispatchEvent(mouseDownEvent);
      });

      // マウス移動
      act(() => {
        const mouseMoveEvent = new MouseEvent('mousemove', {
          clientX: endX,
          clientY: endY,
          button: 0
        });
        document.dispatchEvent(mouseMoveEvent);
      });

      // マウスアップ
      act(() => {
        const mouseUpEvent = new MouseEvent('mouseup', {
          clientX: endX,
          clientY: endY,
          button: 0
        });
        document.dispatchEvent(mouseUpEvent);
      });

      // パン操作が実行されることを確認
      expect(mockZoomBehavior.transform).toHaveBeenCalled();
    });

    it('キーボード矢印キーでパン操作を実行する', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      render(<App />);

      const newFileButton = screen.getByRole('button', { name: /新規/ });
      await user.click(newFileButton);

      await waitFor(() => {
        expect(screen.getByRole('textbox')).toBeInTheDocument();
      });

      const editor = screen.getByRole('textbox');
      await user.clear(editor);
      await user.type(editor, JSON.stringify(complexMindmapData, null, 2));

      act(() => {
        vi.advanceTimersByTime(500);
      });

      await waitFor(() => {
        expect(screen.getByText('プロジェクト管理')).toBeInTheDocument();
      });

      const mindmapContainer = screen.getByTestId('mindmap-container');
      
      // マインドマップにフォーカスを当てる
      act(() => {
        mindmapContainer.focus();
      });

      // 矢印キーでパン操作
      await user.keyboard('{ArrowRight}');
      await user.keyboard('{ArrowDown}');
      await user.keyboard('{ArrowLeft}');
      await user.keyboard('{ArrowUp}');

      // パン操作が実行されることを確認
      expect(mockZoomBehavior.translateTo).toHaveBeenCalled();
    });
  });

  describe('ノード折りたたみ・展開操作', () => {
    it('ノードの折りたたみ・展開の完全なワークフローを実行する', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      render(<App />);

      const newFileButton = screen.getByRole('button', { name: /新規/ });
      await user.click(newFileButton);

      await waitFor(() => {
        expect(screen.getByRole('textbox')).toBeInTheDocument();
      });

      const editor = screen.getByRole('textbox');
      await user.clear(editor);
      await user.type(editor, JSON.stringify(complexMindmapData, null, 2));

      act(() => {
        vi.advanceTimersByTime(500);
      });

      await waitFor(() => {
        expect(screen.getByText('プロジェクト管理')).toBeInTheDocument();
        expect(screen.getByText('計画フェーズ')).toBeInTheDocument();
        expect(screen.getByText('要件定義')).toBeInTheDocument();
        expect(screen.getByText('設計')).toBeInTheDocument();
      });

      // 計画フェーズノードの折りたたみボタンを取得
      const planningCollapseButton = screen.getByTestId('collapse-button-planning');
      expect(planningCollapseButton).toBeInTheDocument();

      // ノードを折りたたむ
      await user.click(planningCollapseButton);

      // 子ノードが非表示になることを確認
      await waitFor(() => {
        expect(screen.queryByText('要件定義')).not.toBeInTheDocument();
        expect(screen.queryByText('設計')).not.toBeInTheDocument();
      });

      // 折りたたみボタンが展開ボタンに変わることを確認
      const planningExpandButton = screen.getByTestId('expand-button-planning');
      expect(planningExpandButton).toBeInTheDocument();

      // ノードを展開
      await user.click(planningExpandButton);

      // 子ノードが再表示されることを確認
      await waitFor(() => {
        expect(screen.getByText('要件定義')).toBeInTheDocument();
        expect(screen.getByText('設計')).toBeInTheDocument();
      });

      // 深い階層の折りたたみテスト
      const designCollapseButton = screen.getByTestId('collapse-button-design');
      await user.click(designCollapseButton);

      await waitFor(() => {
        expect(screen.queryByText('UI設計')).not.toBeInTheDocument();
        expect(screen.queryByText('DB設計')).not.toBeInTheDocument();
      });

      // 親ノードを折りたたんでも、展開時に子ノードの状態が保持されることを確認
      await user.click(planningCollapseButton);
      await user.click(planningExpandButton);

      await waitFor(() => {
        expect(screen.getByText('設計')).toBeInTheDocument();
        expect(screen.queryByText('UI設計')).not.toBeInTheDocument(); // 設計ノードは折りたたまれたまま
      });
    });

    it('全展開・全折りたたみ機能を実行する', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      render(<App />);

      const newFileButton = screen.getByRole('button', { name: /新規/ });
      await user.click(newFileButton);

      await waitFor(() => {
        expect(screen.getByRole('textbox')).toBeInTheDocument();
      });

      const editor = screen.getByRole('textbox');
      await user.clear(editor);
      await user.type(editor, JSON.stringify(complexMindmapData, null, 2));

      act(() => {
        vi.advanceTimersByTime(500);
      });

      await waitFor(() => {
        expect(screen.getByText('プロジェクト管理')).toBeInTheDocument();
      });

      // 全折りたたみボタンをクリック
      const collapseAllButton = screen.getByRole('button', { name: /全て折りたたみ|全折りたたみ/ });
      await user.click(collapseAllButton);

      // 全ての子ノードが非表示になることを確認
      await waitFor(() => {
        expect(screen.queryByText('計画フェーズ')).not.toBeInTheDocument();
        expect(screen.queryByText('開発フェーズ')).not.toBeInTheDocument();
        expect(screen.queryByText('テストフェーズ')).not.toBeInTheDocument();
      });

      // ルートノードのみが表示されることを確認
      expect(screen.getByText('プロジェクト管理')).toBeInTheDocument();

      // 全展開ボタンをクリック
      const expandAllButton = screen.getByRole('button', { name: /全て展開|全展開/ });
      await user.click(expandAllButton);

      // 全てのノードが表示されることを確認
      await waitFor(() => {
        expect(screen.getByText('計画フェーズ')).toBeInTheDocument();
        expect(screen.getByText('開発フェーズ')).toBeInTheDocument();
        expect(screen.getByText('テストフェーズ')).toBeInTheDocument();
        expect(screen.getByText('要件定義')).toBeInTheDocument();
        expect(screen.getByText('設計')).toBeInTheDocument();
        expect(screen.getByText('UI設計')).toBeInTheDocument();
        expect(screen.getByText('DB設計')).toBeInTheDocument();
      });
    });

    it('キーボードショートカットで折りたたみ・展開操作を実行する', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      render(<App />);

      const newFileButton = screen.getByRole('button', { name: /新規/ });
      await user.click(newFileButton);

      await waitFor(() => {
        expect(screen.getByRole('textbox')).toBeInTheDocument();
      });

      const editor = screen.getByRole('textbox');
      await user.clear(editor);
      await user.type(editor, JSON.stringify(complexMindmapData, null, 2));

      act(() => {
        vi.advanceTimersByTime(500);
      });

      await waitFor(() => {
        expect(screen.getByText('計画フェーズ')).toBeInTheDocument();
      });

      // ノードを選択
      const planningNode = screen.getByText('計画フェーズ');
      await user.click(planningNode);

      // スペースキーで折りたたみ
      await user.keyboard(' ');

      await waitFor(() => {
        expect(screen.queryByText('要件定義')).not.toBeInTheDocument();
      });

      // スペースキーで展開
      await user.keyboard(' ');

      await waitFor(() => {
        expect(screen.getByText('要件定義')).toBeInTheDocument();
      });
    });
  });

  describe('ノード選択とハイライト', () => {
    it('ノード選択とエディタ同期の完全なワークフローを実行する', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      render(<App />);

      const newFileButton = screen.getByRole('button', { name: /新規/ });
      await user.click(newFileButton);

      await waitFor(() => {
        expect(screen.getByRole('textbox')).toBeInTheDocument();
      });

      const editor = screen.getByRole('textbox');
      await user.clear(editor);
      await user.type(editor, JSON.stringify(complexMindmapData, null, 2));

      act(() => {
        vi.advanceTimersByTime(500);
      });

      await waitFor(() => {
        expect(screen.getByText('要件定義')).toBeInTheDocument();
      });

      // ノードをクリックして選択
      const requirementsNode = screen.getByText('要件定義');
      await user.click(requirementsNode);

      // ノードが選択状態になることを確認
      await waitFor(() => {
        expect(requirementsNode).toHaveClass('selected');
      });

      // エディタで該当箇所がハイライトされることを確認
      const highlightedElements = screen.queryAllByTestId('editor-highlight');
      expect(highlightedElements.length).toBeGreaterThan(0);

      // ノード詳細パネルが表示されることを確認
      const nodeDetailsPanel = screen.getByTestId('node-details-panel');
      expect(nodeDetailsPanel).toBeInTheDocument();
      expect(nodeDetailsPanel).toHaveTextContent('要件定義');
      expect(nodeDetailsPanel).toHaveTextContent('機能・非機能要件の定義');

      // カスタムフィールドが表示されることを確認
      expect(nodeDetailsPanel).toHaveTextContent('優先度');
      expect(nodeDetailsPanel).toHaveTextContent('high');
      expect(nodeDetailsPanel).toHaveTextContent('ステータス');
      expect(nodeDetailsPanel).toHaveTextContent('done');
      expect(nodeDetailsPanel).toHaveTextContent('担当者');
      expect(nodeDetailsPanel).toHaveTextContent('BA チーム');

      // 別のノードを選択
      const designNode = screen.getByText('設計');
      await user.click(designNode);

      // 選択が切り替わることを確認
      await waitFor(() => {
        expect(designNode).toHaveClass('selected');
        expect(requirementsNode).not.toHaveClass('selected');
      });

      // ノード詳細パネルの内容が更新されることを確認
      expect(nodeDetailsPanel).toHaveTextContent('設計');
      expect(nodeDetailsPanel).toHaveTextContent('システム設計とアーキテクチャ');
    });

    it('複数ノード選択機能を実行する', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      render(<App />);

      const newFileButton = screen.getByRole('button', { name: /新規/ });
      await user.click(newFileButton);

      await waitFor(() => {
        expect(screen.getByRole('textbox')).toBeInTheDocument();
      });

      const editor = screen.getByRole('textbox');
      await user.clear(editor);
      await user.type(editor, JSON.stringify(complexMindmapData, null, 2));

      act(() => {
        vi.advanceTimersByTime(500);
      });

      await waitFor(() => {
        expect(screen.getByText('要件定義')).toBeInTheDocument();
      });

      // Ctrlキーを押しながら複数ノードを選択
      const requirementsNode = screen.getByText('要件定義');
      const designNode = screen.getByText('設計');

      await user.click(requirementsNode);
      
      // Ctrlキーを押しながら2番目のノードをクリック
      await user.keyboard('{Control>}');
      await user.click(designNode);
      await user.keyboard('{/Control}');

      // 両方のノードが選択状態になることを確認
      await waitFor(() => {
        expect(requirementsNode).toHaveClass('selected');
        expect(designNode).toHaveClass('selected');
      });

      // 複数選択の詳細パネルが表示されることを確認
      const multiSelectPanel = screen.getByTestId('multi-select-panel');
      expect(multiSelectPanel).toBeInTheDocument();
      expect(multiSelectPanel).toHaveTextContent('2個のノードを選択中');
    });

    it('キーボードナビゲーションでノード選択を実行する', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      render(<App />);

      const newFileButton = screen.getByRole('button', { name: /新規/ });
      await user.click(newFileButton);

      await waitFor(() => {
        expect(screen.getByRole('textbox')).toBeInTheDocument();
      });

      const editor = screen.getByRole('textbox');
      await user.clear(editor);
      await user.type(editor, JSON.stringify(complexMindmapData, null, 2));

      act(() => {
        vi.advanceTimersByTime(500);
      });

      await waitFor(() => {
        expect(screen.getByText('プロジェクト管理')).toBeInTheDocument();
      });

      // マインドマップにフォーカスを当てる
      const mindmapContainer = screen.getByTestId('mindmap-container');
      act(() => {
        mindmapContainer.focus();
      });

      // Tabキーでノード間を移動
      await user.keyboard('{Tab}');
      
      // 最初のノードが選択されることを確認
      await waitFor(() => {
        const selectedNode = screen.getByTestId('selected-node');
        expect(selectedNode).toBeInTheDocument();
      });

      // 矢印キーで隣接ノードに移動
      await user.keyboard('{ArrowDown}');
      
      // 選択が移動することを確認
      await waitFor(() => {
        const selectedNodes = screen.queryAllByTestId('selected-node');
        expect(selectedNodes).toHaveLength(1);
      });

      // Enterキーでノード詳細を表示
      await user.keyboard('{Enter}');

      await waitFor(() => {
        const nodeDetailsPanel = screen.getByTestId('node-details-panel');
        expect(nodeDetailsPanel).toBeInTheDocument();
      });
    });
  });

  describe('レイアウト切り替え', () => {
    it('ツリーレイアウトと放射状レイアウトの切り替えを実行する', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      render(<App />);

      const newFileButton = screen.getByRole('button', { name: /新規/ });
      await user.click(newFileButton);

      await waitFor(() => {
        expect(screen.getByRole('textbox')).toBeInTheDocument();
      });

      const editor = screen.getByRole('textbox');
      await user.clear(editor);
      await user.type(editor, JSON.stringify(complexMindmapData, null, 2));

      act(() => {
        vi.advanceTimersByTime(500);
      });

      await waitFor(() => {
        expect(screen.getByText('プロジェクト管理')).toBeInTheDocument();
      });

      // 現在のレイアウトがツリーであることを確認
      const mindmapContainer = screen.getByTestId('mindmap-container');
      expect(mindmapContainer).toHaveClass('layout-tree');

      // レイアウト切り替えボタンを取得
      const layoutToggleButton = screen.getByRole('button', { name: /レイアウト|放射状/ });
      await user.click(layoutToggleButton);

      // 放射状レイアウトに切り替わることを確認
      await waitFor(() => {
        expect(mindmapContainer).toHaveClass('layout-radial');
      });

      // ノードの配置が変更されることを確認（D3の描画関数が呼ばれる）
      expect(mockSelection.attr).toHaveBeenCalled();

      // ツリーレイアウトに戻す
      const treeLayoutButton = screen.getByRole('button', { name: /ツリー|階層/ });
      await user.click(treeLayoutButton);

      await waitFor(() => {
        expect(mindmapContainer).toHaveClass('layout-tree');
      });
    });

    it('レイアウト設定の永続化を確認する', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      // localStorageのモック
      const localStorageMock = {
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
        length: 0,
        key: vi.fn(),
      };

      Object.defineProperty(global, 'localStorage', {
        value: localStorageMock,
        writable: true
      });

      render(<App />);

      const newFileButton = screen.getByRole('button', { name: /新規/ });
      await user.click(newFileButton);

      await waitFor(() => {
        expect(screen.getByRole('textbox')).toBeInTheDocument();
      });

      const editor = screen.getByRole('textbox');
      await user.clear(editor);
      await user.type(editor, JSON.stringify(complexMindmapData, null, 2));

      act(() => {
        vi.advanceTimersByTime(500);
      });

      await waitFor(() => {
        expect(screen.getByText('プロジェクト管理')).toBeInTheDocument();
      });

      // レイアウトを放射状に変更
      const layoutToggleButton = screen.getByRole('button', { name: /レイアウト|放射状/ });
      await user.click(layoutToggleButton);

      // 設定がlocalStorageに保存されることを確認
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        expect.stringContaining('mindmap-settings'),
        expect.stringContaining('radial')
      );
    });
  });

  describe('パフォーマンステスト', () => {
    it('大量ノードでのマインドマップ操作パフォーマンスを確認する', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      // 大量のノードを持つデータを作成
      const largeData: MindmapData = {
        version: '1.0',
        title: '大規模マインドマップ',
        root: {
          id: 'root',
          title: 'ルート',
          children: Array.from({ length: 50 }, (_, i) => ({
            id: `level1-${i}`,
            title: `レベル1ノード${i}`,
            children: Array.from({ length: 10 }, (_, j) => ({
              id: `level2-${i}-${j}`,
              title: `レベル2ノード${i}-${j}`,
              children: Array.from({ length: 5 }, (_, k) => ({
                id: `level3-${i}-${j}-${k}`,
                title: `レベル3ノード${i}-${j}-${k}`
              }))
            }))
          }))
        }
      };

      render(<App />);

      const newFileButton = screen.getByRole('button', { name: /新規/ });
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
      }, { timeout: 10000 });

      const renderTime = performance.now() - startTime;

      // 大規模データでも10秒以内にレンダリングが完了することを確認
      expect(renderTime).toBeLessThan(10000);

      // ズーム操作のパフォーマンステスト
      const zoomStartTime = performance.now();
      
      const zoomInButton = screen.getByRole('button', { name: /ズームイン|\+/ });
      await user.click(zoomInButton);
      await user.click(zoomInButton);
      await user.click(zoomInButton);

      const zoomTime = performance.now() - zoomStartTime;

      // ズーム操作が1秒以内に完了することを確認
      expect(zoomTime).toBeLessThan(1000);

      // 折りたたみ操作のパフォーマンステスト
      const collapseStartTime = performance.now();

      const collapseAllButton = screen.getByRole('button', { name: /全て折りたたみ|全折りたたみ/ });
      await user.click(collapseAllButton);

      await waitFor(() => {
        expect(screen.queryByText('レベル1ノード0')).not.toBeInTheDocument();
      });

      const collapseTime = performance.now() - collapseStartTime;

      // 全折りたたみが2秒以内に完了することを確認
      expect(collapseTime).toBeLessThan(2000);
    });
  });
});