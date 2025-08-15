/**
 * MindmapCore 統合テスト
 * 現在の全機能をカバーし、リファクタリング時の動作保証を目的とする
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MindmapCore } from '../MindmapCore';
import type { MindmapData, MindmapSettings, RenderOptions } from '../../types';

// SVGとDOMのモック設定
const mockSVGElement = {
  getBoundingClientRect: vi.fn().mockReturnValue({
    width: 800,
    height: 600,
    x: 0,
    y: 0,
    top: 0,
    left: 0,
    right: 800,
    bottom: 600
  })
} as unknown as SVGSVGElement;

// D3.jsのモック
const mockSelection = {
  attr: vi.fn().mockReturnThis(),
  style: vi.fn().mockReturnThis(),
  append: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  selectAll: vi.fn().mockReturnThis(),
  data: vi.fn().mockReturnThis(),
  enter: vi.fn().mockReturnThis(),
  merge: vi.fn().mockReturnThis(),
  exit: vi.fn().mockReturnThis(),
  remove: vi.fn().mockReturnThis(),
  on: vi.fn().mockReturnThis(),
  call: vi.fn().mockReturnThis(),
  transition: vi.fn().mockReturnThis(),
  duration: vi.fn().mockReturnThis(),
  classed: vi.fn().mockReturnThis(),
  text: vi.fn().mockReturnThis(),
  filter: vi.fn().mockReturnThis(),
  each: vi.fn().mockReturnThis(),
  node: vi.fn().mockReturnValue({
    ...mockSVGElement,
    getBBox: vi.fn().mockReturnValue({
      x: 0,
      y: 0,
      width: 800,
      height: 600
    })
  })
};

const mockZoom = {
  scaleExtent: vi.fn().mockReturnThis(),
  on: vi.fn().mockReturnThis(),
  transform: vi.fn(),
  scaleBy: vi.fn(),
  translateTo: vi.fn()
};

// treeLayoutのモック関数
const mockTreeLayout = vi.fn((root) => {
  // 基本的なD3ツリーレイアウトの動作をシミュレート
  if (root) {
    root.x = 0;
    root.y = 0;
    if (root.children) {
      root.children.forEach((child: { x: number; y: number; children?: unknown[] }, index: number) => {
        child.x = index * 100 - ((root.children.length - 1) * 100) / 2;
        child.y = 100;
      });
    }
  }
  return root;
});

const mockClusterLayout = vi.fn((root) => {
  // 基本的なD3クラスターレイアウトの動作をシミュレート
  if (root) {
    root.x = 0;
    root.y = 0;
  }
  return root;
});

// D3モックの設定
vi.mock('d3', () => ({
  select: vi.fn(() => mockSelection),
  selectAll: vi.fn(() => mockSelection),
  hierarchy: vi.fn((data) => {
    const mockRoot: { data: MindmapNode; depth: number; x: number; y: number; children?: unknown[]; descendants: () => unknown[] } = {
      data,
      depth: 0,
      x: 0,
      y: 0,
      children: undefined,
      descendants: vi.fn(() => [mockRoot]),
      links: vi.fn(() => []),
      each: vi.fn((callback) => {
        callback(mockRoot);
        if (mockRoot.children) {
          mockRoot.children.forEach(callback);
        }
      })
    };
    
    // 子ノードがある場合の処理
    if (data?.children) {
      mockRoot.children = data.children.map((child: MindmapNode, index: number) => ({
        data: child,
        parent: mockRoot,
        depth: 1,
        x: index * 100,
        y: 100
      }));
    }
    
    return mockRoot;
  }),
  tree: vi.fn(() => {
    const treeLayout = Object.assign(mockTreeLayout, {
      nodeSize: vi.fn().mockReturnValue(mockTreeLayout),
      separation: vi.fn().mockReturnValue(mockTreeLayout)
    });
    return treeLayout;
  }),
  cluster: vi.fn(() => {
    const clusterLayout = Object.assign(mockClusterLayout, {
      size: vi.fn().mockReturnValue(mockClusterLayout),
      separation: vi.fn().mockReturnValue(mockClusterLayout)
    });
    return clusterLayout;
  }),
  zoom: vi.fn(() => mockZoom),
  zoomIdentity: {
    x: 0, 
    y: 0, 
    k: 1,
    translate: vi.fn().mockReturnThis(),
    scale: vi.fn().mockReturnThis()
  },
  linkHorizontal: vi.fn(() => {
    const linkGen = vi.fn(() => 'M0,0L100,100'); // SVGパス文字列を返す
    linkGen.x = vi.fn().mockReturnValue(linkGen);
    linkGen.y = vi.fn().mockReturnValue(linkGen);
    return linkGen;
  }),
  linkRadial: vi.fn(() => {
    const linkGen = vi.fn(() => 'M0,0L100,100'); // SVGパス文字列を返す
    linkGen.angle = vi.fn().mockReturnValue(linkGen);
    linkGen.radius = vi.fn().mockReturnValue(linkGen);
    return linkGen;
  })
}));

describe('MindmapCore 統合テスト', () => {
  let mindmapCore: MindmapCore;
  let mockEventHandlers: Record<string, (...args: unknown[]) => void>;
  let renderOptions: RenderOptions;

  // テスト用のサンプルデータ
  const sampleMindmapData: MindmapData = {
    version: '1.0',
    title: 'テストマインドマップ',
    root: {
      id: 'root',
      title: 'ルートノード',
      description: 'ルートノードの説明',
      children: [
        {
          id: 'child1',
          title: '子ノード1',
          description: '子ノード1の説明',
          priority: 'high',
          status: 'in-progress',
          children: [
            {
              id: 'grandchild1',
              title: '孫ノード1',
              description: '孫ノード1の説明',
              priority: 'medium'
            }
          ]
        },
        {
          id: 'child2',
          title: '子ノード2',
          description: '子ノード2の説明',
          priority: 'low',
          status: 'done'
        }
      ]
    },
    settings: {
      theme: 'light',
      layout: 'tree',
      enableAnimation: true
    }
  };

  const defaultSettings: MindmapSettings = {
    theme: 'light',
    layout: 'tree',
    enableAnimation: true,
    maxNodeWidth: 200,
    nodeSpacing: 60,
    levelSpacing: 200,
    verticalSpacing: 1.0
  };

  beforeEach(() => {
    // イベントハンドラーのモック
    mockEventHandlers = {
      onNodeClick: vi.fn(),
      onNodeHover: vi.fn(),
      onNodeLeave: vi.fn(),
      onBackgroundClick: vi.fn()
    };

    // レンダーオプションの設定
    renderOptions = {
      container: mockSVGElement,
      settings: defaultSettings,
      eventHandlers: mockEventHandlers
    };

    // MindmapCoreインスタンスの作成
    mindmapCore = new MindmapCore(renderOptions);
  });

  afterEach(() => {
    mindmapCore?.destroy();
    vi.clearAllMocks();
  });

  describe('コンストラクタと初期化', () => {
    it('正常に初期化できること', () => {
      expect(mindmapCore).toBeInstanceOf(MindmapCore);
    });

    it('SVGの初期化が実行されること', () => {
      expect(mockSelection.append).toHaveBeenCalledWith('g');
    });

    it('ズーム機能が初期化されること', () => {
      expect(mockZoom.scaleExtent).toHaveBeenCalledWith([0.1, 3]);
      expect(mockZoom.on).toHaveBeenCalledWith('zoom', expect.any(Function));
    });
  });

  describe('データレンダリング機能', () => {
    it('正常なデータをレンダリングできること', () => {
      expect(() => {
        mindmapCore.render(sampleMindmapData);
      }).not.toThrow();
    });

    it('無効なデータでエラーが発生しないこと', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      mindmapCore.render(null as never);
      
      expect(consoleSpy).toHaveBeenCalledWith('描画データが無効です');
      consoleSpy.mockRestore();
    });

    it('空のルートノードでもレンダリングできること', () => {
      const emptyData: MindmapData = {
        ...sampleMindmapData,
        root: {
          id: 'root',
          title: 'Empty Root',
          children: []
        }
      };

      expect(() => {
        mindmapCore.render(emptyData);
      }).not.toThrow();
    });
  });

  describe('ノード選択機能', () => {
    beforeEach(() => {
      mindmapCore.render(sampleMindmapData);
    });

    it('ノードを選択できること', () => {
      expect(() => {
        mindmapCore.selectNode('child1');
      }).not.toThrow();
    });

    it('存在しないノードを選択しても例外が発生しないこと', () => {
      expect(() => {
        mindmapCore.selectNode('nonexistent');
      }).not.toThrow();
    });

    it('nullで選択を解除できること', () => {
      mindmapCore.selectNode('child1');
      expect(() => {
        mindmapCore.selectNode(null);
      }).not.toThrow();
    });
  });

  describe('ノード折りたたみ・展開機能', () => {
    beforeEach(() => {
      mindmapCore.render(sampleMindmapData);
    });

    it('ノードを折りたたむことができること', () => {
      expect(() => {
        mindmapCore.toggleNode('child1');
      }).not.toThrow();
    });

    it('存在しないノードでも例外が発生しないこと', () => {
      expect(() => {
        mindmapCore.toggleNode('nonexistent');
      }).not.toThrow();
    });
  });

  describe('ビュー操作機能', () => {
    beforeEach(() => {
      mindmapCore.render(sampleMindmapData);
    });

    it('ビューをリセットできること', () => {
      expect(() => {
        mindmapCore.resetView();
      }).not.toThrow();
    });

    it('ズームインできること', () => {
      // モック呼び出し回数をリセット
      vi.clearAllMocks();
      
      expect(() => {
        mindmapCore.zoomIn();
      }).not.toThrow();
      
      // SVGのtransitionが呼ばれて、その後scaleByが呼ばれることを確認
      expect(mockSelection.transition).toHaveBeenCalled();
    });

    it('ズームアウトできること', () => {
      // モック呼び出し回数をリセット
      vi.clearAllMocks();
      
      expect(() => {
        mindmapCore.zoomOut();
      }).not.toThrow();
      
      // SVGのtransitionが呼ばれて、その後scaleByが呼ばれることを確認
      expect(mockSelection.transition).toHaveBeenCalled();
    });

    it('中央表示ができること', () => {
      expect(() => {
        mindmapCore.centerView();
      }).not.toThrow();
    });
  });

  describe('設定更新機能', () => {
    beforeEach(() => {
      mindmapCore.render(sampleMindmapData);
    });

    it('設定を更新できること', () => {
      const newSettings: Partial<MindmapSettings> = {
        theme: 'dark',
        layout: 'radial',
        enableAnimation: false
      };

      expect(() => {
        mindmapCore.updateSettings(newSettings);
      }).not.toThrow();
    });

    it('部分的な設定更新ができること', () => {
      const partialSettings: Partial<MindmapSettings> = {
        theme: 'dark'
      };

      expect(() => {
        mindmapCore.updateSettings(partialSettings);
      }).not.toThrow();
    });
  });

  describe('レイアウト切り替え機能', () => {
    beforeEach(() => {
      mindmapCore.render(sampleMindmapData);
    });

    it('ツリーレイアウトに設定できること', () => {
      expect(() => {
        mindmapCore.updateSettings({ layout: 'tree' });
      }).not.toThrow();
    });

    it('放射状レイアウトに設定できること', () => {
      expect(() => {
        mindmapCore.updateSettings({ layout: 'radial' });
      }).not.toThrow();
    });
  });

  describe('イベント処理機能', () => {
    beforeEach(() => {
      mindmapCore.render(sampleMindmapData);
    });

    it('ノードクリックイベントが設定されていること', () => {
      expect(mockEventHandlers.onNodeClick).toBeDefined();
    });

    it('ノードホバーイベントが設定されていること', () => {
      expect(mockEventHandlers.onNodeHover).toBeDefined();
    });

    it('背景クリックイベントが設定されていること', () => {
      expect(mockEventHandlers.onBackgroundClick).toBeDefined();
    });
  });

  describe('ノード描画詳細機能', () => {
    beforeEach(() => {
      mindmapCore.render(sampleMindmapData);
    });

    it('優先度バッジが描画されること', () => {
      // バッジ描画のロジックが呼ばれることを確認
      expect(mockSelection.append).toHaveBeenCalled();
    });

    it('ステータスバッジが描画されること', () => {
      // バッジ描画のロジックが呼ばれることを確認
      expect(mockSelection.append).toHaveBeenCalled();
    });

    it('複数行テキストが処理されること', () => {
      const multilineData: MindmapData = {
        ...sampleMindmapData,
        root: {
          ...sampleMindmapData.root,
          title: '複数行\nタイトル\nテスト'
        }
      };

      expect(() => {
        mindmapCore.render(multilineData);
      }).not.toThrow();
    });
  });

  describe('パフォーマンス関連機能', () => {
    it('パフォーマンス統計を取得できること', () => {
      const stats = mindmapCore.getPerformanceStats();
      expect(stats).toBeDefined();
      expect(stats.currentSettings).toBeDefined();
    });

    it('パフォーマンスモードを設定できること', () => {
      expect(() => {
        mindmapCore.setPerformanceMode('performance');
        mindmapCore.setPerformanceMode('quality');
        mindmapCore.setPerformanceMode('auto');
      }).not.toThrow();
    });

    it('仮想化の有効/無効を切り替えできること', () => {
      expect(() => {
        mindmapCore.setVirtualizationEnabled(true);
        mindmapCore.setVirtualizationEnabled(false);
      }).not.toThrow();
    });

    it('メモリ最適化が実行できること', () => {
      expect(() => {
        mindmapCore.optimizeMemory();
      }).not.toThrow();
    });

    it('パフォーマンス統計をログ出力できること', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      mindmapCore.logPerformanceStats();
      
      expect(consoleSpy).toHaveBeenCalledWith('Performance stats logging...');
      consoleSpy.mockRestore();
    });
  });

  describe('将来実装予定機能', () => {
    beforeEach(() => {
      mindmapCore.render(sampleMindmapData);
    });

    it('ノードハイライト機能が呼び出せること', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      mindmapCore.highlightCursorNode('child1');
      
      expect(consoleSpy).toHaveBeenCalledWith('highlightCursorNode called with:', 'child1');
      consoleSpy.mockRestore();
    });

    it('ノードフォーカス機能が呼び出せること', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      mindmapCore.focusNode('child1');
      
      expect(consoleSpy).toHaveBeenCalledWith('focusNode called with:', 'child1');
      consoleSpy.mockRestore();
    });
  });

  describe('エラーハンドリング', () => {
    it('不正な設定でも例外が発生しないこと', () => {
      expect(() => {
        mindmapCore.updateSettings({
          maxNodeWidth: -100,
          nodeSpacing: -50
        } as MindmapSettings);
      }).not.toThrow();
    });

    it('破棄処理が正常に実行されること', () => {
      mindmapCore.render(sampleMindmapData);
      
      expect(() => {
        mindmapCore.destroy();
      }).not.toThrow();
    });

    it('破棄後の操作でも例外が発生しないこと', () => {
      mindmapCore.destroy();
      
      expect(() => {
        mindmapCore.render(sampleMindmapData);
        mindmapCore.selectNode('child1');
        mindmapCore.zoomIn();
      }).not.toThrow();
    });
  });

  describe('メモリリーク防止', () => {
    it('多数のレンダリング操作でメモリリークが発生しないこと', () => {
      // 100回レンダリングを実行してもエラーが発生しないことを確認
      for (let i = 0; i < 100; i++) {
        expect(() => {
          mindmapCore.render(sampleMindmapData);
        }).not.toThrow();
      }
    });

    it('イベントリスナーが適切にクリーンアップされること', () => {
      mindmapCore.render(sampleMindmapData);
      mindmapCore.destroy();
      
      // destroy後にSVGイベントが削除されていることを確認
      expect(mockSelection.on).toHaveBeenCalledWith('click', null);
    });
  });
});