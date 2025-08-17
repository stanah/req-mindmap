/**
 * TypeScript Strict Mode 互換性テスト
 * ライブラリが TypeScript の strict mode で正常に動作することを確認
 */

import { describe, it, expect } from 'vitest';

// ライブラリエクスポートからインポート（型チェック用）
import type { 
  MindmapData, 
  MindmapNode, 
  MindmapSettings,
  CustomSchema,
  RendererEventHandlers,
  RenderOptions
} from '../../index';

import { 
  MindmapRenderer,
  MindmapCore,
  MindmapParser,
  findNodeById,
  mapNodesToHierarchy
} from '../../index';

describe('TypeScript Strict Mode Compatibility', () => {
  describe('Type Definitions', () => {
    it('MindmapData 型が正しく定義されている', () => {
      const testData: MindmapData = {
        version: '1.0.0',
        title: 'Test',
        description: 'Test description',
        root: {
          id: 'root',
          title: 'Root',
          description: 'Root description',
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

      expect(testData.version).toBe('1.0.0');
      expect(testData.root.id).toBe('root');
    });

    it('MindmapNode 型が正しく定義されている', () => {
      const testNode: MindmapNode = {
        id: 'test-node',
        title: 'Test Node',
        description: 'Test node description',
        children: [
          {
            id: 'child-1',
            title: 'Child 1',
            description: 'Child node description',
            children: []
          }
        ]
      };

      expect(testNode.id).toBe('test-node');
      expect(testNode.children).toHaveLength(1);
    });

    it('MindmapSettings 型が正しく定義されている', () => {
      const testSettings: MindmapSettings = {
        layout: 'radial',
        direction: 'left',
        theme: 'dark',
        showConnections: false,
        enableCollapse: false,
        nodeSize: { width: 150, height: 60 },
        spacing: { horizontal: 40, vertical: 25 }
      };

      expect(testSettings.layout).toBe('radial');
      expect(testSettings.nodeSize.width).toBe(150);
    });

    it('オプショナルプロパティが正しく処理される', () => {
      // 最小限の必須プロパティのみ
      const minimalNode: MindmapNode = {
        id: 'minimal',
        title: 'Minimal Node',
        children: []
      };

      expect(minimalNode.description).toBeUndefined();
      expect(minimalNode.children).toEqual([]);

      // オプショナルプロパティ付き
      const fullNode: MindmapNode = {
        id: 'full',
        title: 'Full Node',
        description: 'Complete node',
        children: [],
        metadata: { custom: 'value' },
        style: { color: '#ff0000' }
      };

      expect(fullNode.description).toBe('Complete node');
      expect(fullNode.metadata).toEqual({ custom: 'value' });
    });
  });

  describe('Function Type Safety', () => {
    it('findNodeById 関数の型安全性', () => {
      const testData: MindmapData = {
        version: '1.0.0',
        title: 'Test',
        description: 'Test',
        root: {
          id: 'root',
          title: 'Root',
          description: 'Root',
          children: [
            {
              id: 'child1',
              title: 'Child 1',
              description: 'Child 1',
              children: []
            }
          ]
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

      // 正しい型での呼び出し
      const found = findNodeById(testData.root, 'child1');
      expect(found).toBeDefined();
      if (found) {
        expect(found.id).toBe('child1');
      }

      // 存在しないノードの場合
      const notFound = findNodeById(testData.root, 'nonexistent');
      expect(notFound).toBeNull();
    });

    it('mapNodesToHierarchy 関数の型安全性', () => {
      const flatNodes: MindmapNode[] = [
        { id: 'root', title: 'Root', children: [] },
        { id: 'child1', title: 'Child 1', children: [] },
        { id: 'child2', title: 'Child 2', children: [] }
      ];

      const hierarchy = mapNodesToHierarchy(flatNodes, 'root');
      expect(hierarchy).toBeDefined();
      expect(hierarchy?.id).toBe('root');
    });

    it('MindmapParser の型安全性', () => {
      const parser = new MindmapParser();
      expect(parser).toBeInstanceOf(MindmapParser);

      // パーサーメソッドの型チェック
      expect(typeof parser.parseJSON).toBe('function');
      expect(typeof parser.parseYAML).toBe('function');
    });
  });

  describe('Null Safety', () => {
    it('null/undefined 値の適切な処理', () => {
      // null チェックが必要な関数のテスト
      const result = findNodeById(null as any, 'test');
      expect(result).toBeNull();

      // undefined チェック
      const undefinedResult = findNodeById(undefined as any, 'test');
      expect(undefinedResult).toBeNull();
    });

    it('オプショナルチェーニングの動作', () => {
      const partialNode: Partial<MindmapNode> = {
        id: 'partial',
        title: 'Partial Node'
        // children は undefined
      };

      // TypeScript でのオプショナルチェーニング
      expect(partialNode.children?.length).toBeUndefined();
      expect(partialNode.title).toBe('Partial Node');
    });
  });

  describe('Generic Type Safety', () => {
    it('ジェネリック型の正しい推論', () => {
      // カスタムメタデータ型の定義
      interface CustomMetadata {
        priority: number;
        tags: string[];
        author: string;
      }

      const nodeWithCustomMetadata: MindmapNode & { metadata: CustomMetadata } = {
        id: 'custom',
        title: 'Custom Node',
        description: 'Node with custom metadata',
        children: [],
        metadata: {
          priority: 1,
          tags: ['important', 'work'],
          author: 'test-user'
        }
      };

      expect(nodeWithCustomMetadata.metadata.priority).toBe(1);
      expect(nodeWithCustomMetadata.metadata.tags).toEqual(['important', 'work']);
      expect(nodeWithCustomMetadata.metadata.author).toBe('test-user');
    });
  });

  describe('Discriminated Unions', () => {
    it('判別可能ユニオン型の動作', () => {
      // レイアウト型の判別
      const treeSettings: MindmapSettings = {
        layout: 'tree',
        direction: 'right',
        theme: 'default',
        showConnections: true,
        enableCollapse: true,
        nodeSize: { width: 200, height: 80 },
        spacing: { horizontal: 50, vertical: 30 }
      };

      if (treeSettings.layout === 'tree') {
        // tree レイアウト固有の処理
        expect(treeSettings.direction).toMatch(/^(left|right|up|down)$/);
      }

      const radialSettings: MindmapSettings = {
        layout: 'radial',
        direction: 'right',
        theme: 'default',
        showConnections: true,
        enableCollapse: true,
        nodeSize: { width: 200, height: 80 },
        spacing: { horizontal: 50, vertical: 30 }
      };

      if (radialSettings.layout === 'radial') {
        // radial レイアウト固有の処理
        expect(radialSettings.layout).toBe('radial');
      }
    });
  });

  describe('Readonly and Immutability', () => {
    it('読み取り専用配列の処理', () => {
      const readonlyChildren: readonly MindmapNode[] = [
        { id: 'readonly1', title: 'Readonly 1', children: [] },
        { id: 'readonly2', title: 'Readonly 2', children: [] }
      ];

      // 読み取り専用配列でも関数が正常に動作
      expect(readonlyChildren.length).toBe(2);
      expect(readonlyChildren[0].id).toBe('readonly1');
    });

    it('深い読み取り専用オブジェクトの処理', () => {
      const deepReadonly: DeepReadonly<MindmapData> = {
        version: '1.0.0',
        title: 'Deep Readonly Test',
        description: 'Testing deep readonly',
        root: {
          id: 'root',
          title: 'Root',
          description: 'Root',
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
      } as const;

      expect(deepReadonly.version).toBe('1.0.0');
      expect(deepReadonly.root.id).toBe('root');
    });
  });
});

// DeepReadonly ユーティリティ型の定義
type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};