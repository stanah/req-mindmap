/**
 * 仮想化による大量ノード表示の最適化ユーティリティ
 * 
 * 大規模なマインドマップデータでのパフォーマンス最適化のため、
 * 表示領域内のノードのみを描画する仮想化機能を提供します。
 */

import type { D3Node } from '../services/mindmapRenderer';

/**
 * ビューポート情報
 */
export interface Viewport {
  /** X座標の開始位置 */
  x: number;
  /** Y座標の開始位置 */
  y: number;
  /** 幅 */
  width: number;
  /** 高さ */
  height: number;
  /** ズームレベル */
  scale: number;
}

/**
 * ノードの境界ボックス
 */
export interface NodeBounds {
  /** ノードID */
  nodeId: string;
  /** X座標 */
  x: number;
  /** Y座標 */
  y: number;
  /** 幅 */
  width: number;
  /** 高さ */
  height: number;
  /** 深度レベル */
  depth: number;
  /** 親ノードID */
  parentId?: string;
  /** 子ノードID配列 */
  childIds: string[];
}

/**
 * 仮想化結果
 */
export interface VirtualizationResult {
  /** 表示すべきノード */
  visibleNodes: D3Node[];
  /** 表示すべきリンク */
  visibleLinks: Array<{ source: D3Node; target: D3Node }>;
  /** 総ノード数 */
  totalNodes: number;
  /** 表示ノード数 */
  visibleNodeCount: number;
  /** パフォーマンス統計 */
  stats: {
    culledNodes: number;
    processingTime: number;
    memoryEstimate: number;
  };
}

/**
 * レベル・オブ・ディテール（LOD）設定
 */
export interface LODSettings {
  /** 詳細表示の最小ズームレベル */
  detailMinZoom: number;
  /** 中程度表示の最小ズームレベル */
  mediumMinZoom: number;
  /** 簡易表示の最小ズームレベル */
  simpleMinZoom: number;
  /** 最大表示ノード数 */
  maxVisibleNodes: number;
  /** バッファサイズ（ビューポート外の描画範囲） */
  bufferSize: number;
}

/**
 * デフォルトのLOD設定
 */
const DEFAULT_LOD_SETTINGS: LODSettings = {
  detailMinZoom: 0.8,
  mediumMinZoom: 0.4,
  simpleMinZoom: 0.2,
  maxVisibleNodes: 500,
  bufferSize: 200,
};

/**
 * 仮想化マネージャークラス
 */
export class VirtualizationManager {
  private lodSettings: LODSettings;
  private nodeBoundsCache: Map<string, NodeBounds> = new Map();
  private lastViewport: Viewport | null = null;
  private lastResult: VirtualizationResult | null = null;

  constructor(lodSettings: Partial<LODSettings> = {}) {
    this.lodSettings = { ...DEFAULT_LOD_SETTINGS, ...lodSettings };
  }

  /**
   * ノードの境界ボックスを計算してキャッシュ
   */
  public updateNodeBounds(nodes: D3Node[]): void {
    const startTime = performance.now();
    
    this.nodeBoundsCache.clear();
    
    for (const node of nodes) {
      const bounds: NodeBounds = {
        nodeId: node.data.id,
        x: node.x - (node.width || 160) / 2,
        y: node.y - (node.height || 40) / 2,
        width: node.width || 160,
        height: node.height || 40,
        depth: node.depth,
        parentId: node.parent?.data.id,
        childIds: (node.children || []).map(child => child.data.id),
      };
      
      this.nodeBoundsCache.set(node.data.id, bounds);
    }
    
    const processingTime = performance.now() - startTime;
    console.debug(`[Virtualization] Updated bounds for ${nodes.length} nodes in ${processingTime.toFixed(2)}ms`);
  }

  /**
   * ビューポートに基づいて表示すべきノードを計算
   */
  public virtualize(
    allNodes: D3Node[],
    viewport: Viewport
  ): VirtualizationResult {
    const startTime = performance.now();
    
    // ビューポートが変わっていない場合はキャッシュを返す
    if (this.lastViewport && this.viewportsEqual(viewport, this.lastViewport) && this.lastResult) {
      return this.lastResult;
    }

    // バッファを含むビューポートを計算
    const bufferedViewport = this.createBufferedViewport(viewport);
    
    // 表示すべきノードを選択
    const visibleNodes = this.selectVisibleNodes(allNodes, bufferedViewport);
    
    // LODに基づいてノードを最適化
    const optimizedNodes = this.applyLevelOfDetail(visibleNodes, viewport.scale);
    
    // 表示すべきリンクを計算
    const visibleLinks = this.calculateVisibleLinks(optimizedNodes);
    
    const processingTime = performance.now() - startTime;
    const memoryEstimate = this.estimateMemoryUsage(optimizedNodes);
    
    const result: VirtualizationResult = {
      visibleNodes: optimizedNodes,
      visibleLinks,
      totalNodes: allNodes.length,
      visibleNodeCount: optimizedNodes.length,
      stats: {
        culledNodes: allNodes.length - optimizedNodes.length,
        processingTime,
        memoryEstimate,
      },
    };
    
    // キャッシュを更新
    this.lastViewport = { ...viewport };
    this.lastResult = result;
    
    console.debug(`[Virtualization] Processed ${allNodes.length} nodes, showing ${optimizedNodes.length} (${(optimizedNodes.length / allNodes.length * 100).toFixed(1)}%) in ${processingTime.toFixed(2)}ms`);
    
    return result;
  }

  /**
   * バッファを含むビューポートを作成
   */
  private createBufferedViewport(viewport: Viewport): Viewport {
    const buffer = this.lodSettings.bufferSize;
    return {
      x: viewport.x - buffer,
      y: viewport.y - buffer,
      width: viewport.width + buffer * 2,
      height: viewport.height + buffer * 2,
      scale: viewport.scale,
    };
  }

  /**
   * ビューポート内の表示すべきノードを選択
   */
  private selectVisibleNodes(allNodes: D3Node[], viewport: Viewport): D3Node[] {
    const visibleNodes: D3Node[] = [];
    const viewportBounds = {
      left: viewport.x,
      right: viewport.x + viewport.width,
      top: viewport.y,
      bottom: viewport.y + viewport.height,
    };

    for (const node of allNodes) {
      const bounds = this.nodeBoundsCache.get(node.data.id);
      if (!bounds) continue;

      // ノードがビューポートと交差するかチェック
      if (this.intersectsViewport(bounds, viewportBounds)) {
        visibleNodes.push(node);
      }
    }

    return visibleNodes;
  }

  /**
   * ノードがビューポートと交差するかチェック
   */
  private intersectsViewport(
    bounds: NodeBounds,
    viewport: { left: number; right: number; top: number; bottom: number }
  ): boolean {
    return !(
      bounds.x + bounds.width < viewport.left ||
      bounds.x > viewport.right ||
      bounds.y + bounds.height < viewport.top ||
      bounds.y > viewport.bottom
    );
  }

  /**
   * レベル・オブ・ディテール（LOD）を適用
   */
  private applyLevelOfDetail(nodes: D3Node[], scale: number): D3Node[] {
    // ズームレベルに基づいて表示レベルを決定
    let detailLevel: 'simple' | 'medium' | 'detail';
    
    if (scale >= this.lodSettings.detailMinZoom) {
      detailLevel = 'detail';
    } else if (scale >= this.lodSettings.mediumMinZoom) {
      detailLevel = 'medium';
    } else {
      detailLevel = 'simple';
    }

    // 最大表示ノード数を超える場合は重要度でフィルタリング
    if (nodes.length > this.lodSettings.maxVisibleNodes) {
      nodes = this.filterByImportance(nodes, this.lodSettings.maxVisibleNodes);
    }

    // 詳細レベルに基づいてノードを最適化
    return nodes.map(node => this.optimizeNodeForLOD(node, detailLevel));
  }

  /**
   * 重要度に基づいてノードをフィルタリング
   */
  private filterByImportance(nodes: D3Node[], maxCount: number): D3Node[] {
    // 重要度スコアを計算（深度が浅い、子ノードが多い、選択されているなどを考慮）
    const scoredNodes = nodes.map(node => ({
      node,
      score: this.calculateImportanceScore(node),
    }));

    // スコア順にソートして上位を選択
    scoredNodes.sort((a, b) => b.score - a.score);
    
    return scoredNodes.slice(0, maxCount).map(item => item.node);
  }

  /**
   * ノードの重要度スコアを計算
   */
  private calculateImportanceScore(node: D3Node): number {
    let score = 0;
    
    // 深度が浅いほど重要（ルートに近い）
    score += Math.max(0, 10 - node.depth);
    
    // 子ノードが多いほど重要
    const childCount = (node.children || []).length + ((node as { _children?: unknown[] })._children || []).length;
    score += childCount * 2;
    
    // 選択されているノードは重要
    if (node.data.id === 'selected') { // 実際の選択状態は外部から渡す必要がある
      score += 50;
    }
    
    // カスタムフィールドに基づく重要度
    if (node.data.customFields?.priority === 'high') {
      score += 10;
    }
    
    return score;
  }

  /**
   * LODレベルに基づいてノードを最適化
   */
  private optimizeNodeForLOD(node: D3Node, detailLevel: 'simple' | 'medium' | 'detail'): D3Node {
    // ノードのクローンを作成
    const optimizedNode = { ...node } as D3Node;
    
    switch (detailLevel) {
      case 'simple':
        // 簡易表示：タイトルのみ、バッジなし
        optimizedNode.data = {
          ...node.data,
          description: undefined,
          customFields: undefined,
        };
        break;
        
      case 'medium':
        // 中程度表示：タイトルと重要なメタデータのみ
        if (optimizedNode.data.customFields) {
          const importantFields: Record<string, unknown> = {};
          if (optimizedNode.data.customFields.priority) {
            importantFields.priority = optimizedNode.data.customFields.priority;
          }
          if (optimizedNode.data.customFields.status) {
            importantFields.status = optimizedNode.data.customFields.status;
          }
          optimizedNode.data.customFields = importantFields;
        }
        break;
        
      case 'detail':
        // 詳細表示：すべての情報を表示
        break;
    }
    
    return optimizedNode;
  }

  /**
   * 表示すべきリンクを計算
   */
  private calculateVisibleLinks(visibleNodes: D3Node[]): Array<{ source: D3Node; target: D3Node }> {
    const visibleNodeIds = new Set(visibleNodes.map(node => node.data.id));
    const links: Array<{ source: D3Node; target: D3Node }> = [];
    
    for (const node of visibleNodes) {
      if (node.parent && visibleNodeIds.has(node.parent.data.id)) {
        links.push({
          source: node.parent as D3Node,
          target: node,
        });
      }
    }
    
    return links;
  }

  /**
   * メモリ使用量を推定
   */
  private estimateMemoryUsage(nodes: D3Node[]): number {
    // 1ノードあたりの推定メモリ使用量（バイト）
    const baseNodeSize = 1024; // 基本的なノードデータ
    
    let totalSize = 0;
    
    for (const node of nodes) {
      totalSize += baseNodeSize;
      totalSize += (node.data.title?.length || 0) * 2; // Unicode文字
      totalSize += (node.data.description?.length || 0) * 2;
      
      if (node.data.customFields) {
        totalSize += JSON.stringify(node.data.customFields).length * 2;
      }
      
      if (node.data.metadata) {
        totalSize += JSON.stringify(node.data.metadata).length * 2;
      }
    }
    
    return totalSize;
  }

  /**
   * ビューポートが等しいかチェック
   */
  private viewportsEqual(a: Viewport, b: Viewport): boolean {
    const tolerance = 1; // 1ピクセルの誤差を許容
    
    return (
      Math.abs(a.x - b.x) < tolerance &&
      Math.abs(a.y - b.y) < tolerance &&
      Math.abs(a.width - b.width) < tolerance &&
      Math.abs(a.height - b.height) < tolerance &&
      Math.abs(a.scale - b.scale) < 0.01
    );
  }

  /**
   * LOD設定を更新
   */
  public updateLODSettings(settings: Partial<LODSettings>): void {
    this.lodSettings = { ...this.lodSettings, ...settings };
    this.clearCache();
  }

  /**
   * キャッシュをクリア
   */
  public clearCache(): void {
    this.lastViewport = null;
    this.lastResult = null;
    this.nodeBoundsCache.clear();
  }

  /**
   * 統計情報を取得
   */
  public getStats(): {
    cachedNodes: number;
    lastProcessingTime?: number;
    lastMemoryEstimate?: number;
    lodSettings: LODSettings;
  } {
    return {
      cachedNodes: this.nodeBoundsCache.size,
      lastProcessingTime: this.lastResult?.stats.processingTime,
      lastMemoryEstimate: this.lastResult?.stats.memoryEstimate,
      lodSettings: { ...this.lodSettings },
    };
  }
}

/**
 * 空間インデックス（Quadtree）を使用した高速な空間検索
 */
export class SpatialIndex {
  private bounds: { x: number; y: number; width: number; height: number };
  private maxObjects: number;
  private maxLevels: number;
  private level: number;
  private objects: Array<{ bounds: NodeBounds; data: D3Node }> = [];
  private nodes: SpatialIndex[] = [];

  constructor(
    bounds: { x: number; y: number; width: number; height: number },
    maxObjects = 10,
    maxLevels = 5,
    level = 0
  ) {
    this.bounds = bounds;
    this.maxObjects = maxObjects;
    this.maxLevels = maxLevels;
    this.level = level;
  }

  /**
   * オブジェクトを挿入
   */
  public insert(bounds: NodeBounds, data: D3Node): void {
    if (this.nodes.length > 0) {
      const index = this.getIndex(bounds);
      if (index !== -1) {
        this.nodes[index].insert(bounds, data);
        return;
      }
    }

    this.objects.push({ bounds, data });

    if (this.objects.length > this.maxObjects && this.level < this.maxLevels) {
      if (this.nodes.length === 0) {
        this.split();
      }

      let i = 0;
      while (i < this.objects.length) {
        const index = this.getIndex(this.objects[i].bounds);
        if (index !== -1) {
          const obj = this.objects.splice(i, 1)[0];
          this.nodes[index].insert(obj.bounds, obj.data);
        } else {
          i++;
        }
      }
    }
  }

  /**
   * 範囲内のオブジェクトを検索
   */
  public retrieve(
    searchBounds: { x: number; y: number; width: number; height: number }
  ): D3Node[] {
    const returnObjects: D3Node[] = [];

    if (this.nodes.length > 0) {
      const index = this.getIndex(searchBounds);
      if (index !== -1) {
        returnObjects.push(...this.nodes[index].retrieve(searchBounds));
      } else {
        for (const node of this.nodes) {
          returnObjects.push(...node.retrieve(searchBounds));
        }
      }
    }

    for (const obj of this.objects) {
      if (this.intersects(obj.bounds, searchBounds)) {
        returnObjects.push(obj.data);
      }
    }

    return returnObjects;
  }

  /**
   * 境界の交差判定
   */
  private intersects(
    a: { x: number; y: number; width: number; height: number },
    b: { x: number; y: number; width: number; height: number }
  ): boolean {
    return !(
      a.x + a.width < b.x ||
      a.x > b.x + b.width ||
      a.y + a.height < b.y ||
      a.y > b.y + b.height
    );
  }

  /**
   * オブジェクトが属する子ノードのインデックスを取得
   */
  private getIndex(bounds: { x: number; y: number; width: number; height: number }): number {
    let index = -1;
    const verticalMidpoint = this.bounds.x + this.bounds.width / 2;
    const horizontalMidpoint = this.bounds.y + this.bounds.height / 2;

    const topQuadrant = bounds.y < horizontalMidpoint && bounds.y + bounds.height < horizontalMidpoint;
    const bottomQuadrant = bounds.y > horizontalMidpoint;

    if (bounds.x < verticalMidpoint && bounds.x + bounds.width < verticalMidpoint) {
      if (topQuadrant) {
        index = 1;
      } else if (bottomQuadrant) {
        index = 2;
      }
    } else if (bounds.x > verticalMidpoint) {
      if (topQuadrant) {
        index = 0;
      } else if (bottomQuadrant) {
        index = 3;
      }
    }

    return index;
  }

  /**
   * 4つの子ノードに分割
   */
  private split(): void {
    const subWidth = this.bounds.width / 2;
    const subHeight = this.bounds.height / 2;
    const x = this.bounds.x;
    const y = this.bounds.y;

    this.nodes[0] = new SpatialIndex(
      { x: x + subWidth, y, width: subWidth, height: subHeight },
      this.maxObjects,
      this.maxLevels,
      this.level + 1
    );
    this.nodes[1] = new SpatialIndex(
      { x, y, width: subWidth, height: subHeight },
      this.maxObjects,
      this.maxLevels,
      this.level + 1
    );
    this.nodes[2] = new SpatialIndex(
      { x, y: y + subHeight, width: subWidth, height: subHeight },
      this.maxObjects,
      this.maxLevels,
      this.level + 1
    );
    this.nodes[3] = new SpatialIndex(
      { x: x + subWidth, y: y + subHeight, width: subWidth, height: subHeight },
      this.maxObjects,
      this.maxLevels,
      this.level + 1
    );
  }

  /**
   * インデックスをクリア
   */
  public clear(): void {
    this.objects = [];
    for (const node of this.nodes) {
      node.clear();
    }
    this.nodes = [];
  }
}