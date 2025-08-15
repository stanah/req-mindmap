/**
 * ノードヘルパー関数のテスト
 */

import { describe, it, expect } from 'vitest';
import {
  generateNodeId,
  createNewNode,
  findNodeById,
  findParentNode,
  findNodeIndex,
  addSiblingNode,
  addChildNode
} from '../../utils/nodeHelpers';
import type { MindmapNode } from '../../types/generated/mindmap';

const createTestNode = (id: string, title: string, children: MindmapNode[] = []): MindmapNode => ({
  id,
  title,
  description: `${title}の説明`,
  status: 'draft',
  priority: 'medium',
  tags: [],
  customFields: {},
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  children
});

describe('nodeHelpers', () => {
  describe('generateNodeId', () => {
    it('ユニークなIDを生成する', () => {
      const id1 = generateNodeId();
      const id2 = generateNodeId();
      
      expect(id1).not.toEqual(id2);
      expect(id1).toMatch(/^node_\d+_[a-z0-9]+$/);
      expect(id2).toMatch(/^node_\d+_[a-z0-9]+$/);
    });
  });

  describe('createNewNode', () => {
    it('タイトルのみで新しいノードを作成する', () => {
      const node = createNewNode('テストノード');
      
      expect(node.title).toBe('テストノード');
      expect(node.description).toBeUndefined();
      expect(node.status).toBe('draft');
      expect(node.priority).toBe('medium');
      expect(node.tags).toEqual([]);
      expect(node.children).toEqual([]);
      expect(node.id).toMatch(/^node_\d+_[a-z0-9]+$/);
      expect(node.createdAt).toBeDefined();
      expect(node.updatedAt).toBeDefined();
    });

    it('タイトルと説明で新しいノードを作成する', () => {
      const node = createNewNode('テストノード', 'テスト説明');
      
      expect(node.title).toBe('テストノード');
      expect(node.description).toBe('テスト説明');
      expect(node.status).toBe('draft');
      expect(node.priority).toBe('medium');
    });
  });

  describe('findNodeById', () => {
    const testTree = createTestNode('root', 'ルート', [
      createTestNode('child1', '子1', [
        createTestNode('grandchild1', '孫1')
      ]),
      createTestNode('child2', '子2')
    ]);

    it('ルートノードを見つける', () => {
      const found = findNodeById(testTree, 'root');
      expect(found).toBe(testTree);
    });

    it('子ノードを見つける', () => {
      const found = findNodeById(testTree, 'child1');
      expect(found?.title).toBe('子1');
    });

    it('孫ノードを見つける', () => {
      const found = findNodeById(testTree, 'grandchild1');
      expect(found?.title).toBe('孫1');
    });

    it('存在しないノードの場合はnullを返す', () => {
      const found = findNodeById(testTree, 'nonexistent');
      expect(found).toBeNull();
    });
  });

  describe('findParentNode', () => {
    const testTree = createTestNode('root', 'ルート', [
      createTestNode('child1', '子1', [
        createTestNode('grandchild1', '孫1')
      ]),
      createTestNode('child2', '子2')
    ]);

    it('子ノードの親を見つける', () => {
      const parent = findParentNode(testTree, 'child1');
      expect(parent?.id).toBe('root');
    });

    it('孫ノードの親を見つける', () => {
      const parent = findParentNode(testTree, 'grandchild1');
      expect(parent?.id).toBe('child1');
    });

    it('ルートノードの親はnull', () => {
      const parent = findParentNode(testTree, 'root');
      expect(parent).toBeNull();
    });

    it('存在しないノードの場合はnullを返す', () => {
      const parent = findParentNode(testTree, 'nonexistent');
      expect(parent).toBeNull();
    });
  });

  describe('findNodeIndex', () => {
    const nodes = [
      createTestNode('node1', 'ノード1'),
      createTestNode('node2', 'ノード2'),
      createTestNode('node3', 'ノード3')
    ];

    it('存在するノードのインデックスを返す', () => {
      expect(findNodeIndex(nodes, 'node1')).toBe(0);
      expect(findNodeIndex(nodes, 'node2')).toBe(1);
      expect(findNodeIndex(nodes, 'node3')).toBe(2);
    });

    it('存在しないノードの場合は-1を返す', () => {
      expect(findNodeIndex(nodes, 'nonexistent')).toBe(-1);
    });
  });

  describe('addChildNode', () => {
    it('親ノードに子ノードを追加する', () => {
      const rootNode = createTestNode('root', 'ルート', [
        createTestNode('child1', '子1')
      ]);
      const newChild = createTestNode('child2', '子2');

      const result = addChildNode(rootNode, 'root', newChild);
      
      expect(result.children).toHaveLength(2);
      expect(result.children?.[1]).toBe(newChild);
    });

    it('子のないノードに最初の子を追加する', () => {
      const rootNode = createTestNode('root', 'ルート');
      const newChild = createTestNode('child1', '子1');

      const result = addChildNode(rootNode, 'root', newChild);
      
      expect(result.children).toHaveLength(1);
      expect(result.children?.[0]).toBe(newChild);
    });

    it('存在しない親ノードの場合はエラーを投げる', () => {
      const rootNode = createTestNode('root', 'ルート');
      const newChild = createTestNode('child1', '子1');

      expect(() => {
        addChildNode(rootNode, 'nonexistent', newChild);
      }).toThrow('親ノードが見つかりません');
    });
  });

  describe('addSiblingNode', () => {
    it('兄弟ノードを指定された位置に追加する', () => {
      const rootNode = createTestNode('root', 'ルート', [
        createTestNode('child1', '子1'),
        createTestNode('child2', '子2')
      ]);
      const newSibling = createTestNode('child1_5', '子1.5');

      const result = addSiblingNode(rootNode, 'child1', newSibling);
      
      expect(result.children).toHaveLength(3);
      expect(result.children?.[0].id).toBe('child1');
      expect(result.children?.[1]).toBe(newSibling);
      expect(result.children?.[2].id).toBe('child2');
    });

    it('ルートノードには兄弟を追加できない', () => {
      const rootNode = createTestNode('root', 'ルート');
      const newSibling = createTestNode('sibling', '兄弟');

      expect(() => {
        addSiblingNode(rootNode, 'root', newSibling);
      }).toThrow('ルートノードには兄弟ノードを追加できません');
    });

    it('存在しないノードの場合はエラーを投げる', () => {
      const rootNode = createTestNode('root', 'ルート', [
        createTestNode('child1', '子1')
      ]);
      const newSibling = createTestNode('sibling', '兄弟');

      expect(() => {
        addSiblingNode(rootNode, 'nonexistent', newSibling);
      }).toThrow('親ノードが見つかりません');
    });
  });
});