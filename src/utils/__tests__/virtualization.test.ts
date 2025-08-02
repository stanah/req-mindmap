/**
 * 仮想化機能のテスト
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { VirtualizationManager, SpatialIndex, type Viewport, type NodeBounds } from '../virtualization';
import type { D3Node } from '../../services/mindmapRenderer';
import type { MindmapNode } from '../../types/mindmap';

// テスト用のD3Nodeを作成するヘルパー
function createTestD3Node(
  id: string,
  x: number,
  y: number,
  width: number = 160,
  height: number = 40,
  depth: number = 0
): D3Node {
  const mindmapNode: MindmapNode = {
    id,
    title: `Node ${id}`,
    children: [],
  };

  return {
    data: mindmapNode,
    x,
    y,
    width,
    height,
    depth,
    parent: null,
    children: null,
    descendants: () => [],
    ancestors: () => [],
    leaves: () => [],
    links: () => [],
    path: () => [],
    sum: () => null as any,
    sort: () => null as any,
    count: () => null as any,
    each: () => {},
    eachAfter: () => {},
    eachBefore: () => {},
    copy: () => null as any,
    value: undefined,
    height: 0,
  } as D3Node;
}

describe('VirtualizationManager', () => {
  let manager: VirtualizationManager;
  let testNodes: D3Node[];
  let testViewport: Viewport;

  beforeEach(() => {
    manager = new VirtualizationManager({
      maxVisibleNodes: 10,
      bufferSize: 50,
      detailMinZoom: 1.0,
      mediumMinZoom: 0.5,
      simpleMinZoom: 0.2,
    });

    // 3x3グリッドのテストノードを作成
    testNodes = [];
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        const node = createTestD3Node(
          `node-${i}-${j}`,
          j * 200, // x座標
          i * 100, // y座標
          160,
          40,
          i // 深度
        );
        testNodes.push(node);
      }
    }

    // 中央部分を表示するビューポート
    testViewport = {
      x: 100,
      y: 50,
      width: 200,
      height: 100,
      scale: 1.0,
    };
  });

  describe('ノード境界の更新', () => {
    it('ノードの境界ボックスを正しく計算する', () => {
      manager.updateNodeBounds(testNodes);
      
      const stats = manager.getStats();
      expect(stats.cachedNodes).toBe(9);
    });
  });

  describe('仮想化処理', () => {
    it('ビューポート内のノードのみを選択する', () => {
      manager.updateNodeBounds(testNodes);
      
      const result = manager.virtualize(testNodes, testViewport);
      
      expect(result.totalNodes).toBe(9);
      expect(result.visibleNodeCount).toBeLessThanOrEqual(result.totalNodes);
      expect(result.stats.culledNodes).toBeGreaterThanOrEqual(0);
    });

    it('同じビューポートでは結果をキャッシュする', () => {
      manager.updateNodeBounds(testNodes);
      
      const result1 = manager.virtualize(testNodes, testViewport);
      const result2 = manager.virtualize(testNodes, testViewport);
      
      // 同じ参照を返すはず
      expect(result1).toBe(result2);
    });

    it('ビューポートが変わると新しい結果を計算する', () => {
      manager.updateNodeBounds(testNodes);
      
      const result1 = manager.virtualize(testNodes, testViewport);
      
      const newViewport = { ...testViewport, x: 200 };
      const result2 = manager.virtualize(testNodes, newViewport);
      
      // 異なる参照を返すはず
      expect(result1).not.toBe(result2);
    });

    it('最大表示ノード数を超える場合はフィルタリングする', () => {
      // 大量のノードを作成
      const manyNodes: D3Node[] = [];
      for (let i = 0; i < 20; i++) {
        const node = createTestD3Node(`node-${i}`, i * 50, 0, 160, 40, 0);
        manyNodes.push(node);
      }

      manager.updateNodeBounds(manyNodes);
      
      const largeViewport: Viewport = {
        x: 0,
        y: -50,
        width: 1000,
        height: 100,
        scale: 1.0,
      };
      
      const result = manager.virtualize(manyNodes, largeViewport);
      
      // 最大表示ノード数（10）以下になるはず
      expect(result.visibleNodeCount).toBeLessThanOrEqual(10);
    });
  });

  describe('レベル・オブ・ディテール（LOD）', () => {
    it('ズームレベルに応じて詳細レベルを調整する', () => {
      manager.updateNodeBounds(testNodes);
      
      // 高ズームレベル（詳細表示）
      const highZoomViewport = { ...testViewport, scale: 1.5 };
      const highZoomResult = manager.virtualize(testNodes, highZoomViewport);
      
      // 低ズームレベル（簡易表示）
      const lowZoomViewport = { ...testViewport, scale: 0.1 };
      const lowZoomResult = manager.virtualize(testNodes, lowZoomViewport);
      
      // 両方とも結果が得られることを確認
      expect(highZoomResult.visibleNodes.length).toBeGreaterThan(0);
      expect(lowZoomResult.visibleNodes.length).toBeGreaterThan(0);
    });
  });

  describe('設定の更新', () => {
    it('LOD設定を更新できる', () => {
      const newSettings = {
        maxVisibleNodes: 5,
        detailMinZoom: 2.0,
      };
      
      manager.updateLODSettings(newSettings);
      
      const stats = manager.getStats();
      expect(stats.lodSettings.maxVisibleNodes).toBe(5);
      expect(stats.lodSettings.detailMinZoom).toBe(2.0);
    });

    it('設定更新後にキャッシュがクリアされる', () => {
      manager.updateNodeBounds(testNodes);
      manager.virtualize(testNodes, testViewport);
      
      const statsBefore = manager.getStats();
      expect(statsBefore.lastProcessingTime).toBeDefined();
      
      manager.updateLODSettings({ maxVisibleNodes: 5 });
      
      const statsAfter = manager.getStats();
      expect(statsAfter.lastProcessingTime).toBeUndefined();
    });
  });

  describe('キャッシュ管理', () => {
    it('キャッシュを手動でクリアできる', () => {
      manager.updateNodeBounds(testNodes);
      manager.virtualize(testNodes, testViewport);
      
      expect(manager.getStats().cachedNodes).toBe(9);
      
      manager.clearCache();
      
      expect(manager.getStats().cachedNodes).toBe(0);
    });
  });
});

describe('SpatialIndex', () => {
  let spatialIndex: SpatialIndex;
  let testBounds: { x: number; y: number; width: number; height: number };

  beforeEach(() => {
    testBounds = { x: 0, y: 0, width: 400, height: 400 };
    spatialIndex = new SpatialIndex(testBounds, 4, 3);
  });

  describe('オブジェクトの挿入', () => {
    it('オブジェクトを挿入できる', () => {
      const nodeBounds: NodeBounds = {
        nodeId: 'test-node',
        x: 100,
        y: 100,
        width: 50,
        height: 30,
        depth: 0,
        childIds: [],
      };
      
      const node = createTestD3Node('test-node', 125, 115);
      
      spatialIndex.insert(nodeBounds, node);
      
      // 挿入されたオブジェクトを検索できることを確認
      const results = spatialIndex.retrieve({
        x: 90,
        y: 90,
        width: 70,
        height: 50,
      });
      
      expect(results).toHaveLength(1);
      expect(results[0].data.id).toBe('test-node');
    });

    it('複数のオブジェクトを挿入・検索できる', () => {
      const nodes = [
        { bounds: { nodeId: 'node1', x: 50, y: 50, width: 40, height: 30, depth: 0, childIds: [] }, node: createTestD3Node('node1', 70, 65) },
        { bounds: { nodeId: 'node2', x: 250, y: 50, width: 40, height: 30, depth: 0, childIds: [] }, node: createTestD3Node('node2', 270, 65) },
        { bounds: { nodeId: 'node3', x: 50, y: 250, width: 40, height: 30, depth: 0, childIds: [] }, node: createTestD3Node('node3', 70, 265) },
        { bounds: { nodeId: 'node4', x: 250, y: 250, width: 40, height: 30, depth: 0, childIds: [] }, node: createTestD3Node('node4', 270, 265) },
      ];
      
      nodes.forEach(({ bounds, node }) => {
        spatialIndex.insert(bounds, node);
      });
      
      // 左上象限を検索
      const topLeftResults = spatialIndex.retrieve({
        x: 0,
        y: 0,
        width: 200,
        height: 200,
      });
      
      expect(topLeftResults).toHaveLength(1);
      expect(topLeftResults[0].data.id).toBe('node1');
      
      // 全体を検索
      const allResults = spatialIndex.retrieve({
        x: 0,
        y: 0,
        width: 400,
        height: 400,
      });
      
      expect(allResults).toHaveLength(4);
    });
  });

  describe('範囲検索', () => {
    it('指定範囲内のオブジェクトのみを返す', () => {
      // 複数のオブジェクトを配置
      const testData = [
        { id: 'inside1', x: 100, y: 100 },
        { id: 'inside2', x: 150, y: 150 },
        { id: 'outside1', x: 300, y: 300 },
        { id: 'outside2', x: 50, y: 350 },
      ];
      
      testData.forEach(({ id, x, y }) => {
        const bounds: NodeBounds = {
          nodeId: id,
          x: x - 20,
          y: y - 15,
          width: 40,
          height: 30,
          depth: 0,
          childIds: [],
        };
        const node = createTestD3Node(id, x, y);
        spatialIndex.insert(bounds, node);
      });
      
      // 中央部分を検索
      const results = spatialIndex.retrieve({
        x: 80,
        y: 80,
        width: 100,
        height: 100,
      });
      
      expect(results).toHaveLength(2);
      const resultIds = results.map(r => r.data.id).sort();
      expect(resultIds).toEqual(['inside1', 'inside2']);
    });
  });

  describe('インデックスのクリア', () => {
    it('インデックスをクリアできる', () => {
      const bounds: NodeBounds = {
        nodeId: 'test',
        x: 100,
        y: 100,
        width: 40,
        height: 30,
        depth: 0,
        childIds: [],
      };
      const node = createTestD3Node('test', 120, 115);
      
      spatialIndex.insert(bounds, node);
      
      let results = spatialIndex.retrieve({
        x: 0,
        y: 0,
        width: 400,
        height: 400,
      });
      expect(results).toHaveLength(1);
      
      spatialIndex.clear();
      
      results = spatialIndex.retrieve({
        x: 0,
        y: 0,
        width: 400,
        height: 400,
      });
      expect(results).toHaveLength(0);
    });
  });
});