/**
 * ノード削除機能のテスト
 */

import { describe, it, expect } from 'vitest';
import { removeNode, findNodeById } from '../nodeHelpers';
import type { MindmapNode } from '../../types/generated/mindmap';

// テスト用のマインドマップデータを作成
const createTestMindmap = (): MindmapNode => {
  const now = new Date().toISOString();
  
  return {
    id: 'root',
    title: 'ルートノード',
    description: 'テスト用のルートノード',
    status: 'active',
    priority: 'high',
    tags: [],
    customFields: {},
    createdAt: now,
    updatedAt: now,
    children: [
      {
        id: 'child1',
        title: '子ノード1',
        description: '最初の子ノード',
        status: 'active',
        priority: 'medium',
        tags: [],
        customFields: {},
        createdAt: now,
        updatedAt: now,
        children: [
          {
            id: 'grandchild1',
            title: '孫ノード1',
            description: '子ノード1の子',
            status: 'active',
            priority: 'low',
            tags: [],
            customFields: {},
            createdAt: now,
            updatedAt: now,
            children: []
          },
          {
            id: 'grandchild2',
            title: '孫ノード2',
            description: '子ノード1の子',
            status: 'active',
            priority: 'low',
            tags: [],
            customFields: {},
            createdAt: now,
            updatedAt: now,
            children: []
          }
        ]
      },
      {
        id: 'child2',
        title: '子ノード2',
        description: '2番目の子ノード',
        status: 'active',
        priority: 'medium',
        tags: [],
        customFields: {},
        createdAt: now,
        updatedAt: now,
        children: []
      },
      {
        id: 'child3',
        title: '子ノード3',
        description: '3番目の子ノード',
        status: 'active',
        priority: 'medium',
        tags: [],
        customFields: {},
        createdAt: now,
        updatedAt: now,
        children: []
      }
    ]
  };
};

describe('removeNode', () => {
  it('子ノードを削除できる', () => {
    const rootNode = createTestMindmap();
    
    // child2を削除
    const updatedRoot = removeNode(rootNode, 'child2');
    
    // child2が削除されていることを確認
    expect(updatedRoot.children?.length).toBe(2);
    expect(findNodeById(updatedRoot, 'child2')).toBeNull();
    
    // 他のノードは残っていることを確認
    expect(findNodeById(updatedRoot, 'child1')).not.toBeNull();
    expect(findNodeById(updatedRoot, 'child3')).not.toBeNull();
  });

  it('子ノードとその子孫ノードをすべて削除する', () => {
    const rootNode = createTestMindmap();
    
    // child1（孫ノード2つ持ち）を削除
    const updatedRoot = removeNode(rootNode, 'child1');
    
    // child1とその子孫が削除されていることを確認
    expect(updatedRoot.children?.length).toBe(2);
    expect(findNodeById(updatedRoot, 'child1')).toBeNull();
    expect(findNodeById(updatedRoot, 'grandchild1')).toBeNull();
    expect(findNodeById(updatedRoot, 'grandchild2')).toBeNull();
    
    // 他のノードは残っていることを確認
    expect(findNodeById(updatedRoot, 'child2')).not.toBeNull();
    expect(findNodeById(updatedRoot, 'child3')).not.toBeNull();
  });

  it('孫ノードを削除できる', () => {
    const rootNode = createTestMindmap();
    
    // grandchild1を削除
    const updatedRoot = removeNode(rootNode, 'grandchild1');
    
    // grandchild1が削除されていることを確認
    const child1 = findNodeById(updatedRoot, 'child1');
    expect(child1?.children?.length).toBe(1);
    expect(findNodeById(updatedRoot, 'grandchild1')).toBeNull();
    
    // 他のノードは残っていることを確認
    expect(findNodeById(updatedRoot, 'grandchild2')).not.toBeNull();
    expect(findNodeById(updatedRoot, 'child1')).not.toBeNull();
    expect(findNodeById(updatedRoot, 'child2')).not.toBeNull();
  });

  it('ルートノードの削除はエラーになる', () => {
    const rootNode = createTestMindmap();
    
    // ルートノードの削除を試行
    expect(() => {
      removeNode(rootNode, 'root');
    }).toThrow('ルートノードは削除できません');
  });

  it('存在しないノードの削除はエラーになる', () => {
    const rootNode = createTestMindmap();
    
    // 存在しないノードの削除を試行
    expect(() => {
      removeNode(rootNode, 'nonexistent');
    }).toThrow('削除対象のノードが見つかりません');
  });

  it('削除後のデータ構造が正しく保たれる', () => {
    const rootNode = createTestMindmap();
    const originalChildrenLength = rootNode.children?.length || 0;
    
    // child2を削除
    const updatedRoot = removeNode(rootNode, 'child2');
    
    // ルートノードの基本情報は変わらない
    expect(updatedRoot.id).toBe('root');
    expect(updatedRoot.title).toBe('ルートノード');
    
    // 子ノード数が1つ減っている
    expect(updatedRoot.children?.length).toBe(originalChildrenLength - 1);
    
    // 残った子ノードの順序が正しい
    expect(updatedRoot.children?.[0].id).toBe('child1');
    expect(updatedRoot.children?.[1].id).toBe('child3');
  });

  it('元のデータが変更されていない（不変性の確認）', () => {
    const rootNode = createTestMindmap();
    const originalChildrenLength = rootNode.children?.length || 0;
    
    // child2を削除
    const updatedRoot = removeNode(rootNode, 'child2');
    
    // 元のデータは変更されていない
    expect(rootNode.children?.length).toBe(originalChildrenLength);
    expect(findNodeById(rootNode, 'child2')).not.toBeNull();
    
    // 新しいデータでは削除されている
    expect(updatedRoot.children?.length).toBe(originalChildrenLength - 1);
    expect(findNodeById(updatedRoot, 'child2')).toBeNull();
  });
});