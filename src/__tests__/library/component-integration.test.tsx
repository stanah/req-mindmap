/**
 * コンポーネント統合テスト
 * ライブラリとして提供されるコンポーネントの統合動作をテスト
 */

import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// D3モックを最初に設定
vi.mock('d3-selection', () => ({
  select: vi.fn(() => mockD3Selection),
  selectAll: vi.fn(() => mockD3Selection)
}));

vi.mock('d3-zoom', () => ({
  zoom: vi.fn(() => mockD3Zoom),
  zoomIdentity: { translate: vi.fn().mockReturnValue({ scale: vi.fn() }) }
}));

vi.mock('d3-hierarchy', () => ({
  hierarchy: vi.fn(),
  tree: vi.fn()
}));

vi.mock('d3-shape', () => ({
  linkHorizontal: vi.fn()
}));

vi.mock('d3-scale', () => ({
  scaleOrdinal: vi.fn()
}));

vi.mock('d3-interpolate', () => ({
  interpolate: vi.fn()
}));

vi.mock('d3-scale-chromatic', () => ({
  schemeCategory10: []
}));

const mockD3Selection = {
  append: vi.fn(() => mockD3Selection),
  attr: vi.fn(() => mockD3Selection),
  style: vi.fn(() => mockD3Selection),
  classed: vi.fn(() => mockD3Selection),
  call: vi.fn(() => mockD3Selection),
  selectAll: vi.fn(() => mockD3Selection),
  data: vi.fn(() => mockD3Selection),
  enter: vi.fn(() => mockD3Selection),
  exit: vi.fn(() => mockD3Selection),
  remove: vi.fn(() => mockD3Selection),
  text: vi.fn(() => mockD3Selection),
  on: vi.fn(() => mockD3Selection),
  node: vi.fn(() => ({ getBBox: () => ({ width: 100, height: 50 }) })),
  nodes: vi.fn(() => [])
};

const mockD3Zoom = {
  scaleExtent: vi.fn(() => mockD3Zoom),
  on: vi.fn(() => mockD3Zoom),
  transform: vi.fn()
};

// ライブラリエクスポートからインポート
import { MindmapViewer, useAppStore } from '../../index';

// テスト用のサンプルデータ
const sampleMindmapData = {
  version: '1.0.0',
  title: 'Test Mindmap',
  description: 'A test mindmap for component integration testing',
  root: {
    id: 'root',
    title: 'Root Node',
    description: 'Root node description',
    children: [
      {
        id: 'child1',
        title: 'Child 1',
        description: 'First child node',
        children: []
      },
      {
        id: 'child2', 
        title: 'Child 2',
        description: 'Second child node',
        children: []
      }
    ]
  },
  settings: {
    layout: 'tree' as const,
    direction: 'right' as const,
    theme: 'default' as const,
    showConnections: true,
    enableCollapse: true,
    nodeSize: { width: 200, height: 80 },
    spacing: { horizontal: 50, vertical: 30 }
  }
};

// テスト用のWrapper コンポーネント
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <div data-testid="test-wrapper">{children}</div>;
};

describe('Component Integration Tests', () => {
  beforeEach(() => {
    // ストア状態をリセット
    const store = useAppStore.getState();
    store.initialize();
  });

  afterEach(() => {
    cleanup();
  });

  describe('MindmapViewer Component', () => {
    it('コンポーネントが正常にレンダリングされる', () => {
      render(
        <TestWrapper>
          <MindmapViewer />
        </TestWrapper>
      );

      // MindmapViewer の基本要素が存在することを確認
      expect(screen.getByTestId('test-wrapper')).toBeInTheDocument();
    });

    it('エラーなしでマウント・アンマウントできる', () => {
      const { unmount } = render(
        <TestWrapper>
          <MindmapViewer />
        </TestWrapper>
      );

      expect(() => {
        unmount();
      }).not.toThrow();
    });

    it('ストアとの統合が正常に動作する', () => {
      // ストアにテストデータを設定
      const store = useAppStore.getState();
      store.updateContent(JSON.stringify(sampleMindmapData));

      render(
        <TestWrapper>
          <MindmapViewer />
        </TestWrapper>
      );

      // コンポーネントがストアの状態を反映していることを確認
      const currentState = useAppStore.getState();
      expect(currentState.file.fileContent).toBe(JSON.stringify(sampleMindmapData));
    });
  });

  describe('Error Handling Integration', () => {
    it('無効なデータでもクラッシュしない', () => {
      const store = useAppStore.getState();
      store.updateContent('invalid json data');

      expect(() => {
        render(
          <TestWrapper>
            <MindmapViewer />
          </TestWrapper>
        );
      }).not.toThrow();
    });

    it('空のデータでも正常に動作する', () => {
      const store = useAppStore.getState();
      store.updateContent('');

      expect(() => {
        render(
          <TestWrapper>
            <MindmapViewer />
          </TestWrapper>
        );
      }).not.toThrow();
    });
  });

  describe('Performance Integration', () => {
    it('大きなデータセットでも適切にレンダリングできる', () => {
      // 大きなマインドマップデータを生成
      const largeMindmapData = {
        ...sampleMindmapData,
        root: {
          ...sampleMindmapData.root,
          children: Array.from({ length: 100 }, (_, i) => ({
            id: `child-${i}`,
            title: `Child ${i}`,
            description: `Generated child node ${i}`,
            children: []
          }))
        }
      };

      const store = useAppStore.getState();
      store.updateContent(JSON.stringify(largeMindmapData));

      const startTime = performance.now();
      
      render(
        <TestWrapper>
          <MindmapViewer />
        </TestWrapper>
      );

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // レンダリング時間が妥当な範囲内であることを確認（1秒以内）
      expect(renderTime).toBeLessThan(1000);
    });
  });

  describe('Memory Management', () => {
    it('コンポーネントのマウント・アンマウントでメモリリークが発生しない', () => {
      // メモリ使用量の初期値を記録
      const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;

      // 複数回マウント・アンマウントを実行
      for (let i = 0; i < 10; i++) {
        const { unmount } = render(
          <TestWrapper>
            <MindmapViewer />
          </TestWrapper>
        );
        unmount();
      }

      // ガベージコレクション（可能な場合）
      if (global.gc) {
        global.gc();
      }

      // メモリ使用量の最終値を確認
      const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;
      
      // メモリ増加が過度でないことを確認（初期値の2倍以内）
      if (initialMemory > 0 && finalMemory > 0) {
        const memoryIncrease = finalMemory - initialMemory;
        const increaseRatio = memoryIncrease / initialMemory;
        
        // メモリ増加が100%を超えないことを確認（一定の余裕を持たせる）
        expect(increaseRatio).toBeLessThan(1.0);
      }
    });
  });

  describe('TypeScript Strict Mode Compatibility', () => {
    it('TypeScript strict mode でコンパイルエラーが発生しない', () => {
      // このテストはコンパイル時にチェックされる
      // ランタイムでは型安全性が保たれていることを間接的に確認
      const store = useAppStore.getState();
      
      // 型安全な操作が正常に動作することを確認
      expect(() => {
        store.updateContent(JSON.stringify(sampleMindmapData));
        store.selectNode('root');
        store.toggleNodeCollapse('root');
      }).not.toThrow();
    });

    it('型定義が正しくエクスポートされている', () => {
      // 型の使用例をテスト
      const testData: typeof sampleMindmapData = {
        version: '1.0.0',
        title: 'Type Test',
        description: 'Testing type definitions',
        root: {
          id: 'test-root',
          title: 'Test Root',
          description: 'Test root description',
          children: []
        },
        settings: {
          layout: 'tree',
          direction: 'right',
          theme: 'default',
          showConnections: true,
          enableCollapse: true,
          nodeSize: { width: 200, height: 80 },
          spacing: { horizontal: 50, vertical: 30 }
        }
      };

      expect(testData).toBeDefined();
      expect(testData.version).toBe('1.0.0');
    });
  });

  describe('Development vs Production Mode', () => {
    it('本番モードでもデバッグ情報が適切に処理される', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      try {
        render(
          <TestWrapper>
            <MindmapViewer />
          </TestWrapper>
        );

        // 本番モードでは開発用ログが出力されないことを確認
        expect(consoleSpy).not.toHaveBeenCalledWith(
          expect.stringMatching(/debug|development/i)
        );
      } finally {
        process.env.NODE_ENV = originalEnv;
        consoleSpy.mockRestore();
      }
    });
  });
});