/**
 * D3.jsを使用したマインドマップ描画エンジン
 * 
 * SVGベースのマインドマップ描画機能を提供します。
 * 階層構造に基づくレイアウトアルゴリズムとノード・リンクの描画を実装。
 * パフォーマンス最適化と仮想化機能を含みます。
 */

import * as d3 from 'd3';
import type { MindmapData, MindmapNode, MindmapSettings, CustomSchema, StyleSettings } from '../types/mindmap';
import { performanceMonitor, debounce, rafThrottle } from '../utils/performanceMonitor';
import { VirtualizationManager, type Viewport, type VirtualizationResult } from '../utils/virtualization';

/**
 * D3.js用の拡張ノードデータ
 */
export interface D3Node extends d3.HierarchyPointNode<MindmapNode> {
  /** ノードの幅 */
  width: number;
  /** ノードの高さ */
  height: number;
  /** 折りたたみ状態 */
  _children?: D3Node[];
}

/**
 * D3.js用のリンクデータ
 */
export interface D3Link extends d3.HierarchyPointLink<MindmapNode> {
  source: D3Node;
  target: D3Node;
}

/**
 * レンダラーのイベントハンドラー
 */
export interface RendererEventHandlers {
  onNodeClick?: (node: D3Node, event: MouseEvent) => void;
  onNodeHover?: (node: D3Node, event: MouseEvent) => void;
  onNodeLeave?: (node: D3Node, event: MouseEvent) => void;
  onBackgroundClick?: (event: MouseEvent) => void;
}

/**
 * マインドマップレンダラークラス
 */
export class MindmapRenderer {
  private svg!: d3.Selection<SVGSVGElement, unknown, null, undefined>;
  private container!: d3.Selection<SVGGElement, unknown, null, undefined>;
  private zoom!: d3.ZoomBehavior<SVGSVGElement, unknown>;
  private root: D3Node | null = null;
  private settings: MindmapSettings;
  private eventHandlers: RendererEventHandlers = {};
  private customSchema: CustomSchema | null = null;
  private resizeObserver: ResizeObserver | null = null;

  // パフォーマンス最適化関連
  private virtualizationManager: VirtualizationManager;
  private currentViewport: Viewport | null = null;
  private lastVirtualizationResult: VirtualizationResult | null = null;
  private enableVirtualization = true;
  private performanceMode: 'auto' | 'performance' | 'quality' = 'auto';
  private nodeCountThreshold = 100; // 仮想化を有効にするノード数の閾値

  // 描画最適化
  private debouncedRender = debounce(this.performRender.bind(this), 16);
  private throttledZoomHandler = rafThrottle((transform: d3.ZoomTransform) => this.handleZoomChange(transform));

  // レイアウト設定
  private readonly NODE_WIDTH = 160;
  private readonly NODE_HEIGHT = 40;
  private readonly NODE_PADDING = 8;
  private readonly LEVEL_SPACING = 200;
  private readonly NODE_SPACING = 60;
  private readonly BADGE_HEIGHT = 16;
  private readonly BADGE_MARGIN = 4;

  constructor(
    svgElement: SVGSVGElement,
    settings: MindmapSettings = {},
    eventHandlers: RendererEventHandlers = {}
  ) {
    this.settings = {
      layout: 'tree',
      theme: 'light',
      enableAnimation: true,
      maxNodeWidth: 200,
      nodeSpacing: 60,
      levelSpacing: 200,
      ...settings,
    };
    this.eventHandlers = eventHandlers;

    // 仮想化マネージャーの初期化
    this.virtualizationManager = new VirtualizationManager({
      maxVisibleNodes: 500,
      bufferSize: 200,
      detailMinZoom: 0.8,
      mediumMinZoom: 0.4,
      simpleMinZoom: 0.2,
    });

    this.initializeSVG(svgElement);
    this.setupResizeObserver(svgElement);
    this.startPerformanceMonitoring();
  }

  /**
   * リサイズ監視のセットアップ
   */
  private setupResizeObserver(svgElement: SVGSVGElement): void {
    if (!window.ResizeObserver) return;

    this.resizeObserver = new ResizeObserver(() => {
      // レイアウトを再計算してビューを調整
      if (this.root) {
        setTimeout(() => {
          this.centerView();
        }, 100); // 少し遅延を入れて確実にリサイズが完了してから実行
      }
    });

    // SVG要素のリサイズを監視
    this.resizeObserver.observe(svgElement);
  }

  /**
   * SVGの初期化
   */
  private initializeSVG(svgElement: SVGSVGElement): void {
    this.svg = d3.select(svgElement);

    // 既存の内容をクリア
    this.svg.selectAll('*').remove();

    // SVGのサイズを100%に設定
    this.svg
      .attr('width', '100%')
      .attr('height', '100%')
      .style('display', 'block');

    // ズーム機能の設定
    this.zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 3])
      .on('zoom', (event) => {
        this.container.attr('transform', event.transform);
        this.throttledZoomHandler(event.transform);
      });

    this.svg.call(this.zoom);

    // メインコンテナの作成
    this.container = this.svg.append('g')
      .attr('class', 'mindmap-container');

    // 背景クリックイベント
    this.svg.on('click', (event) => {
      if (event.target === svgElement && this.eventHandlers.onBackgroundClick) {
        this.eventHandlers.onBackgroundClick(event);
      }
    });
  }

  /**
   * マインドマップデータを描画
   */
  public render(data: MindmapData): void {
    performanceMonitor.startMeasurement('mindmap-render', {
      nodeCount: this.countNodes(data.root),
      enableVirtualization: this.enableVirtualization,
    });

    if (!data.root) {
      console.warn('マインドマップデータにルートノードがありません');
      performanceMonitor.endMeasurement('mindmap-render');
      return;
    }

    // カスタムスキーマの設定
    this.customSchema = data.schema || null;

    // 階層データの作成
    const hierarchy = d3.hierarchy(data.root);

    // ノードサイズの計算
    hierarchy.each((node: d3.HierarchyNode<MindmapNode>) => {
      const nodeData = node.data;
      const textLength = this.calculateTextWidth(nodeData.title);
      const badgeHeight = this.calculateBadgeHeight(nodeData);

      (node as D3Node).width = Math.min(Math.max(textLength + this.NODE_PADDING * 2, this.NODE_WIDTH), this.settings.maxNodeWidth || 200);
      (node as D3Node).height = this.NODE_HEIGHT + badgeHeight;

      // 折りたたみ状態の初期化
      if (nodeData.collapsed && node.children) {
        (node as D3Node)._children = node.children as D3Node[];
        node.children = undefined;
      }
    });

    // レイアウトの適用
    this.root = this.applyLayout(hierarchy as D3Node);

    // パフォーマンスモードの自動調整
    this.adjustPerformanceMode();

    // 描画の実行（デバウンス処理）
    this.debouncedRender();

    // 初期ビューの設定（少し遅延を入れて確実に描画完了を待つ）
    setTimeout(() => {
      this.centerView();
      performanceMonitor.endMeasurement('mindmap-render');
    }, 50);
  }

  /**
   * レイアウトアルゴリズムの適用
   */
  private applyLayout(hierarchy: D3Node): D3Node {
    // 既存の階層から元のデータを抽出して再構築
    const rootData = this.extractNodeData(hierarchy);
    const newHierarchy = d3.hierarchy(rootData);

    // ノードサイズの再計算
    newHierarchy.each((node: d3.HierarchyNode<MindmapNode>) => {
      const nodeData = node.data;
      const textLength = this.calculateTextWidth(nodeData.title);
      const badgeHeight = this.calculateBadgeHeight(nodeData);

      (node as D3Node).width = Math.min(Math.max(textLength + this.NODE_PADDING * 2, this.NODE_WIDTH), this.settings.maxNodeWidth || 200);
      (node as D3Node).height = this.NODE_HEIGHT + badgeHeight;

      // 折りたたみ状態の復元
      if (nodeData.collapsed && node.children) {
        (node as D3Node)._children = node.children as D3Node[];
        node.children = undefined;
      }
    });
    let layout: d3.TreeLayout<MindmapNode> | d3.ClusterLayout<MindmapNode>;

    switch (this.settings.layout) {
      case 'radial':
        // 放射状レイアウト
        layout = d3.tree<MindmapNode>()
          .size([2 * Math.PI, 500])
          .separation((a, b) => (a.parent === b.parent ? 2 : 3) / Math.max(a.depth, 1));
        break;

      case 'tree':
      default:
        // 横方向ツリーレイアウト（左から右）
        // nodeSizeを使って固定サイズから開始し、後で調整
        layout = d3.tree<MindmapNode>()
          .nodeSize([this.NODE_SPACING * 1.5, this.LEVEL_SPACING])
          .separation((a: d3.HierarchyPointNode<MindmapNode>, b: d3.HierarchyPointNode<MindmapNode>) => {
            // 実際のノードサイズに基づいた分離距離を計算
            const aNode = a as D3Node;
            const bNode = b as D3Node;

            // ノードの高さに基づく間隔計算
            const maxHeight = Math.max(aNode.height || this.NODE_HEIGHT, bNode.height || this.NODE_HEIGHT);
            const baseSpacing = maxHeight / this.NODE_SPACING;

            // 同じ親の子ノード間は基本間隔、異なる親の子ノード間は1.5倍
            const separationMultiplier = a.parent === b.parent ? 1.2 : 1.8;

            return baseSpacing * separationMultiplier;
          });
        break;
    }

    const result = layout(newHierarchy) as D3Node;

    // レイアウトごとの座標変換
    if (this.settings.layout === 'radial') {
      // 放射状レイアウトの座標変換（極座標から直交座標への変換）
      result.each((node: d3.HierarchyPointNode<MindmapNode>) => {
        const angle = node.x;
        const radius = node.y;

        // 極座標から直交座標に変換
        node.x = radius * Math.cos(angle - Math.PI / 2);
        node.y = radius * Math.sin(angle - Math.PI / 2);
      });
    } else if (this.settings.layout === 'tree') {
      // x <-> y を入れ替えて横方向にする
      result.each((node: d3.HierarchyPointNode<MindmapNode>) => {
        const originalX = node.x;
        const originalY = node.y;
        node.x = originalY; // 水平位置（左から右）
        node.y = originalX; // 垂直位置（上から下）
      });

      // ノード間の重なりを防ぐ調整
      this.preventNodeOverlaps(result);
    }

    return result;
  }

  /**
   * 階層ノードから元のデータ構造を抽出
   */
  private extractNodeData(hierarchyNode: D3Node): MindmapNode {
    const nodeData: MindmapNode = {
      id: hierarchyNode.data.id,
      title: hierarchyNode.data.title,
      description: hierarchyNode.data.description,
      metadata: hierarchyNode.data.metadata,
      customFields: hierarchyNode.data.customFields,
      collapsed: hierarchyNode.data.collapsed,
      children: []
    };

    // 子ノードも再帰的に抽出（展開状態と折りたたみ状態両方を考慮）
    const children = hierarchyNode.children || hierarchyNode._children;
    if (children) {
      nodeData.children = children.map(child => this.extractNodeData(child));
    }

    return nodeData;
  }

  /**
   * ノードの重なりを防ぐ（シンプルなアプローチ）
   */
  private preventNodeOverlaps(root: D3Node): void {
    // 同じレベルの兄弟ノード間の重なりをチェック・修正
    root.each((node: D3Node) => {
      if (!node.parent || !node.parent.children) return;

      const siblings = node.parent.children as D3Node[];
      if (siblings.length <= 1) return;

      // Y座標順にソート
      const sortedSiblings = [...siblings].sort((a, b) => a.y - b.y);

      // 各ノードペアの間隔をチェック
      for (let i = 1; i < sortedSiblings.length; i++) {
        const prevNode = sortedSiblings[i - 1];
        const currentNode = sortedSiblings[i];

        // 必要な最小間隔を計算（各ノードの高さの半分 + マージン）
        const minDistance = (prevNode.height + currentNode.height) / 2 + 40;
        const actualDistance = currentNode.y - prevNode.y;

        if (actualDistance < minDistance) {
          // 重なりがある場合、現在のノードとそれ以降を下に移動
          const adjustment = minDistance - actualDistance;
          for (let j = i; j < sortedSiblings.length; j++) {
            sortedSiblings[j].y += adjustment;
          }
        }
      }
    });
  }

  /**
   * 描画の実行（最適化版）
   */
  private performRender(): void {
    if (!this.root) return;

    performanceMonitor.startMeasurement('mindmap-draw');

    const allNodes = this.root.descendants() as D3Node[];
    const allLinks = this.root.links() as D3Link[];

    let nodesToRender = allNodes;
    let linksToRender = allLinks;

    // 仮想化が有効で、ノード数が閾値を超える場合
    if (this.enableVirtualization && allNodes.length > this.nodeCountThreshold && this.currentViewport) {
      // 仮想化マネージャーでノード境界を更新
      this.virtualizationManager.updateNodeBounds(allNodes);

      // 仮想化を実行
      const virtualizationResult = this.virtualizationManager.virtualize(allNodes, this.currentViewport);
      this.lastVirtualizationResult = virtualizationResult;

      nodesToRender = virtualizationResult.visibleNodes;
      linksToRender = virtualizationResult.visibleLinks;

      console.debug(`[Renderer] Virtualization: ${nodesToRender.length}/${allNodes.length} nodes visible`);
    }

    // リンクの描画
    this.drawLinks(linksToRender);

    // ノードの描画
    this.drawNodes(nodesToRender);

    performanceMonitor.endMeasurement('mindmap-draw');
  }

  /**
   * 従来の描画メソッド（後方互換性のため）
   */
  private draw(): void {
    this.performRender();
  }

  /**
   * リンクの描画
   */
  private drawLinks(links: D3Link[]): void {
    // レイアウトに応じてリンク生成器を選択
    const linkGenerator = this.settings.layout === 'radial'
      ? d3.linkRadial<D3Link, D3Node>()
        .angle(d => {
          // 直交座標から角度を逆算
          return Math.atan2(d.y, d.x) + Math.PI / 2;
        })
        .radius(d => Math.sqrt(d.x * d.x + d.y * d.y))
      : d3.linkHorizontal<D3Link, D3Node>()
        .x(d => d.x)
        .y(d => d.y);

    const linkSelection = this.container
      .selectAll<SVGPathElement, D3Link>('.mindmap-link')
      .data(links, (d: D3Link) => `${d.source.data.id}-${d.target.data.id}`);

    // 新しいリンクの追加
    const linkEnter = linkSelection
      .enter()
      .append('path')
      .attr('class', 'mindmap-link')
      .attr('fill', 'none')
      .attr('stroke', '#94a3b8')
      .attr('stroke-width', 2);

    // リンクの更新
    const linkUpdate = linkEnter.merge(linkSelection);

    if (this.settings.enableAnimation) {
      linkUpdate
        .transition()
        .duration(300)
        .attr('d', linkGenerator);
    } else {
      linkUpdate.attr('d', linkGenerator);
    }

    // 不要なリンクの削除
    linkSelection.exit().remove();
  }

  /**
   * ノードの描画
   */
  private drawNodes(nodes: D3Node[]): void {
    const nodeSelection = this.container
      .selectAll<SVGGElement, D3Node>('.mindmap-node')
      .data(nodes, (d: D3Node) => d.data.id);

    // 新しいノードの追加
    const nodeEnter = nodeSelection
      .enter()
      .append('g')
      .attr('class', 'mindmap-node')
      .attr('cursor', 'pointer')
      .on('click', (event, d) => {
        event.stopPropagation();
        if (this.eventHandlers.onNodeClick) {
          this.eventHandlers.onNodeClick(d, event);
        }
      })
      .on('mouseenter', (event, d) => {
        if (this.eventHandlers.onNodeHover) {
          this.eventHandlers.onNodeHover(d, event);
        }
      })
      .on('mouseleave', (event, d) => {
        if (this.eventHandlers.onNodeLeave) {
          this.eventHandlers.onNodeLeave(d, event);
        }
      });

    // ノードの背景矩形
    nodeEnter
      .append('rect')
      .attr('class', 'mindmap-node-rect')
      .attr('rx', 8)
      .attr('ry', 8)
      .attr('stroke', '#e0e0e0')
      .attr('stroke-width', 1);

    // アイコン（ある場合）
    nodeEnter
      .filter(d => this.getNodeIcon(d.data) !== null)
      .append('text')
      .attr('class', 'mindmap-node-icon')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('font-family', 'Arial, sans-serif')
      .attr('font-size', '16px')
      .attr('pointer-events', 'none')
      .text(d => {
        const icon = this.getNodeIcon(d.data);
        // 簡易的なアイコンマッピング
        switch (icon) {
          case 'circle': return '●';
          case 'clock': return '⏰';
          case 'check': return '✓';
          case 'eye': return '👁';
          default: return icon || '';
        }
      });

    // ノードのテキスト
    nodeEnter
      .append('text')
      .attr('class', 'mindmap-node-text')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('font-family', '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif')
      .attr('font-size', '14px')
      .attr('pointer-events', 'none');

    // バッジコンテナ
    nodeEnter
      .filter(d => this.getNodeBadges(d.data).length > 0)
      .append('g')
      .attr('class', 'mindmap-badges');

    // ツールチップ用のタイトル要素
    nodeEnter
      .append('title')
      .text(d => {
        let tooltip = d.data.title;
        if (d.data.description) {
          tooltip += '\n\n' + d.data.description;
        }
        if (d.data.metadata) {
          const metadata = Object.entries(d.data.metadata)
            .map(([key, value]) => `${key}: ${value}`)
            .join('\n');
          if (metadata) {
            tooltip += '\n\n' + metadata;
          }
        }
        if (d.data.customFields) {
          const customFields = Object.entries(d.data.customFields)
            .map(([key, value]) => `${key}: ${value}`)
            .join('\n');
          if (customFields) {
            tooltip += '\n\nカスタムフィールド:\n' + customFields;
          }
        }
        return tooltip;
      });

    // 折りたたみインジケーター（子ノードがある場合）
    const collapseGroup = nodeEnter
      .filter((d: D3Node) => !!(d.children && d.children.length > 0) || !!(d._children && d._children.length > 0))
      .append('g')
      .attr('class', 'mindmap-collapse-group')
      .attr('cursor', 'pointer')
      .on('click', (event, d) => {
        event.stopPropagation();
        this.toggleNode(d.data.id);
      });

    collapseGroup
      .append('circle')
      .attr('class', 'mindmap-collapse-indicator')
      .attr('r', 8)
      .attr('fill', '#2563eb')
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 2);

    collapseGroup
      .append('text')
      .attr('class', 'mindmap-collapse-text')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('fill', '#ffffff')
      .attr('font-size', '10px')
      .attr('pointer-events', 'none');

    // ノードの更新
    const nodeUpdate = nodeEnter.merge(nodeSelection);

    // 位置の更新
    if (this.settings.enableAnimation) {
      nodeUpdate
        .transition()
        .duration(300)
        .attr('transform', d => `translate(${d.x},${d.y})`);
    } else {
      nodeUpdate.attr('transform', d => `translate(${d.x},${d.y})`);
    }

    // 矩形のサイズとスタイル更新
    nodeUpdate.select('.mindmap-node-rect')
      .attr('x', d => -d.width / 2)
      .attr('y', d => -d.height / 2)
      .attr('width', d => d.width)
      .attr('height', d => d.height)
      .attr('fill', d => this.getNodeBackgroundColor(d.data));

    // アイコンの位置更新
    nodeUpdate.select('.mindmap-node-icon')
      .attr('x', d => -d.width / 2 + 16)
      .attr('y', -8)
      .attr('fill', d => this.getNodeTextColor(d.data));

    // テキストの更新と位置調整
    nodeUpdate.select('.mindmap-node-text')
      .attr('x', d => this.getNodeIcon(d.data) ? 8 : 0)
      .attr('y', -8)
      .attr('fill', d => this.getNodeTextColor(d.data))
      .text(d => {
        const availableWidth = d.width - this.NODE_PADDING * 2 - (this.getNodeIcon(d.data) ? 24 : 0);
        return this.truncateText(d.data.title, availableWidth);
      });

    // バッジの描画
    this.drawBadges(nodeUpdate);

    // 折りたたみインジケーターの位置とテキスト更新
    nodeUpdate.select('.mindmap-collapse-group')
      .attr('transform', d => `translate(${d.width / 2 - 12}, ${-d.height / 2 + 12})`);

    nodeUpdate.select('.mindmap-collapse-text')
      .text(d => (d._children && d._children.length > 0) ? '+' : '−');

    // 不要なノードの削除
    nodeSelection.exit().remove();
  }

  /**
   * テキスト幅の計算
   */
  private calculateTextWidth(text: string): number {
    // より正確な文字幅計算（日本語と英語を考慮）
    let width = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charAt(i);
      // 日本語文字（ひらがな、カタカナ、漢字）は幅広
      if (char.match(/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/)) {
        width += 14; // 日本語文字の幅
      } else {
        width += 8; // 英数字の幅
      }
    }
    return Math.max(width + 40, this.NODE_WIDTH * 0.8); // 最小幅を保証
  }

  /**
   * バッジ用テキスト幅の計算
   */
  private calculateBadgeTextWidth(text: string): number {
    let width = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charAt(i);
      // 小さいフォント用の幅計算
      if (char.match(/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/)) {
        width += 10; // 日本語文字の幅（10pxフォント）
      } else {
        width += 6; // 英数字の幅（10pxフォント）
      }
    }
    return Math.max(width, 20); // 最小幅20px
  }

  /**
   * テキストの切り詰め
   */
  private truncateText(text: string, maxWidth: number): string {
    const charWidth = 8; // 平均文字幅
    const maxChars = Math.floor(maxWidth / charWidth);

    if (text.length <= maxChars) {
      return text;
    }

    return text.substring(0, maxChars - 3) + '...';
  }

  /**
   * バッジの高さを計算
   */
  private calculateBadgeHeight(nodeData: MindmapNode): number {
    if (!this.customSchema || !nodeData.customFields) {
      return 0;
    }

    const badgeRules = this.customSchema.displayRules.filter(rule =>
      rule.displayType === 'badge' && nodeData.customFields?.[rule.field]
    );

    return badgeRules.length > 0 ? this.BADGE_HEIGHT + this.BADGE_MARGIN : 0;
  }

  /**
   * ノードの背景色を取得
   */
  private getNodeBackgroundColor(nodeData: MindmapNode): string {
    if (!this.customSchema || !nodeData.customFields) {
      return '#ffffff';
    }

    const colorRule = this.customSchema.displayRules.find(rule =>
      rule.displayType === 'color' && nodeData.customFields?.[rule.field]
    );

    if (colorRule && colorRule.style) {
      const fieldValue = nodeData.customFields[colorRule.field];
      const fieldValueStr = String(fieldValue);
      const colorStyle = colorRule.style[fieldValueStr] as StyleSettings;
      return colorStyle?.backgroundColor || '#ffffff';
    }

    return '#ffffff';
  }

  /**
   * ノードのテキスト色を取得
   */
  private getNodeTextColor(nodeData: MindmapNode): string {
    if (!this.customSchema || !nodeData.customFields) {
      return '#333333';
    }

    const colorRule = this.customSchema.displayRules.find(rule =>
      rule.displayType === 'color' && nodeData.customFields?.[rule.field]
    );

    if (colorRule && colorRule.style) {
      const fieldValue = nodeData.customFields[colorRule.field];
      const fieldValueStr = String(fieldValue);
      const colorStyle = colorRule.style[fieldValueStr] as StyleSettings;
      return colorStyle?.color || '#333333';
    }

    return '#333333';
  }

  /**
   * アイコンを取得
   */
  private getNodeIcon(nodeData: MindmapNode): string | null {
    if (!this.customSchema || !nodeData.customFields) {
      return null;
    }

    const iconRule = this.customSchema.displayRules.find(rule =>
      rule.displayType === 'icon' && nodeData.customFields?.[rule.field]
    );

    if (iconRule && iconRule.style) {
      const fieldValue = nodeData.customFields[iconRule.field];
      const fieldValueStr = String(fieldValue);
      const iconStyle = iconRule.style[fieldValueStr] as StyleSettings;
      return iconStyle?.icon || null;
    }

    return null;
  }

  /**
   * バッジ情報を取得
   */
  private getNodeBadges(nodeData: MindmapNode): Array<{ text: string, style: StyleSettings }> {
    if (!this.customSchema || !nodeData.customFields) {
      return [];
    }

    const badgeRules = this.customSchema.displayRules.filter(rule =>
      rule.displayType === 'badge' && nodeData.customFields?.[rule.field]
    );

    return badgeRules.map(rule => {
      const fieldValue = nodeData.customFields![rule.field];
      const fieldValueStr = String(fieldValue);
      const badgeStyle = (rule.style?.[fieldValueStr] as StyleSettings) || {};
      return {
        text: String(fieldValue),
        style: badgeStyle
      };
    });
  }

  /**
   * バッジの描画
   */
  private drawBadges(nodeUpdate: d3.Selection<SVGGElement, D3Node, SVGGElement, unknown>): void {
    nodeUpdate.each((d, i, nodes) => {
      const node = d3.select(nodes[i]);
      const badges = this.getNodeBadges(d.data);

      // 既存のバッジをクリア
      node.select('.mindmap-badges').selectAll('*').remove();

      if (badges.length === 0) return;

      const badgeContainer = node.select('.mindmap-badges');
      let xOffset = -d.width / 2 + this.NODE_PADDING;

      badges.forEach((badge) => {
        const badgeGroup = badgeContainer
          .append('g')
          .attr('class', 'mindmap-badge');

        // バッジの背景
        const badgeRect = badgeGroup
          .append('rect')
          .attr('rx', 8)
          .attr('ry', 8)
          .attr('height', this.BADGE_HEIGHT)
          .attr('fill', badge.style.backgroundColor || '#e5e7eb')
          .attr('stroke', badge.style.borderColor || 'none');

        // バッジの幅を計算（日本語対応）
        const textWidth = this.calculateBadgeTextWidth(badge.text) + 12; // パディング追加

        // バッジのテキスト
        badgeGroup
          .append('text')
          .attr('class', 'mindmap-badge-text')
          .attr('text-anchor', 'middle')
          .attr('dominant-baseline', 'central')
          .attr('font-size', '10px')
          .attr('font-weight', '500')
          .attr('fill', badge.style.color || '#374151')
          .attr('pointer-events', 'none')
          .attr('x', 0) // バッジグループの中央
          .attr('y', this.BADGE_HEIGHT / 2) // バッジの垂直中央
          .text(badge.text);

        // バッジ背景のサイズと位置
        badgeRect
          .attr('width', textWidth)
          .attr('x', -textWidth / 2)
          .attr('y', 0);

        // バッジグループの位置を設定
        badgeGroup.attr('transform', `translate(${xOffset + textWidth / 2}, ${d.height / 2 - this.BADGE_HEIGHT - 4})`);

        xOffset += textWidth + 4;
      });
    });
  }

  /**
   * ビューを中央に配置
   */
  public centerView(): void {
    if (!this.root) return;

    const svgElement = this.svg.node() as SVGSVGElement;
    const svgRect = svgElement.getBoundingClientRect();

    // SVGのサイズが0の場合は少し待ってから再試行
    if (svgRect.width === 0 || svgRect.height === 0) {
      setTimeout(() => this.centerView(), 100);
      return;
    }

    const bounds = this.container.node()?.getBBox();
    if (!bounds || bounds.width === 0) return;

    const centerX = svgRect.width / 2;
    const centerY = svgRect.height / 2;

    // より適切なスケーリング計算
    const padding = 50;
    const scale = Math.min(
      (svgRect.width - padding) / bounds.width,
      (svgRect.height - padding) / bounds.height,
      1
    );

    // ルートノードを左側に配置（横レイアウト用）
    const rootX = bounds.x + bounds.width / 2;
    const rootY = bounds.y + bounds.height / 2;

    const transform = d3.zoomIdentity
      .translate(centerX - rootX * scale, centerY - rootY * scale)
      .scale(scale);

    if (this.settings.enableAnimation) {
      this.svg
        .transition()
        .duration(500)
        .call(this.zoom.transform, transform);
    } else {
      this.svg.call(this.zoom.transform, transform);
    }
  }

  /**
   * ズームイン
   */
  public zoomIn(): void {
    this.svg
      .transition()
      .duration(300)
      .call(this.zoom.scaleBy, 1.5);
  }

  /**
   * ズームアウト
   */
  public zoomOut(): void {
    this.svg
      .transition()
      .duration(300)
      .call(this.zoom.scaleBy, 1 / 1.5);
  }

  /**
   * ビューをリセット
   */
  public resetView(): void {
    this.centerView();
  }

  /**
   * 設定の更新
   */
  public updateSettings(newSettings: Partial<MindmapSettings>): void {
    const oldLayout = this.settings.layout;
    this.settings = { ...this.settings, ...newSettings };

    // レイアウトが変更された場合は再描画
    if (newSettings.layout && newSettings.layout !== oldLayout && this.root) {
      // 既存のSVG要素をクリアしてから再レイアウト
      this.container.selectAll('*').remove();

      this.root = this.applyLayout(this.root);
      this.draw();

      // ビューを中央に配置（少し遅延を入れて確実に描画完了を待つ）
      setTimeout(() => {
        this.centerView();
      }, 100);
    }
  }

  /**
   * ノードの折りたたみ・展開
   */
  public toggleNode(nodeId: string): void {
    if (!this.root) return;

    const targetNode = this.findNodeById(this.root, nodeId);
    if (!targetNode) return;

    if (targetNode.children) {
      // 展開状態 → 折りたたみ
      targetNode._children = targetNode.children;
      targetNode.children = undefined;
      targetNode.data.collapsed = true;
    } else if (targetNode._children) {
      // 折りたたみ状態 → 展開
      targetNode.children = targetNode._children;
      targetNode._children = undefined;
      targetNode.data.collapsed = false;
    }

    // レイアウトを再計算して再描画
    this.root = this.applyLayout(this.root);
    this.draw();
  }

  /**
   * IDでノードを検索
   */
  private findNodeById(node: D3Node, id: string): D3Node | null {
    if (node.data.id === id) {
      return node;
    }

    if (node.children) {
      for (const child of node.children) {
        const found = this.findNodeById(child, id);
        if (found) return found;
      }
    }

    if (node._children) {
      for (const child of node._children) {
        const found = this.findNodeById(child, id);
        if (found) return found;
      }
    }

    return null;
  }

  /**
   * ノードの選択状態を更新
   */
  public selectNode(nodeId: string | null): void {
    this.container
      .selectAll('.mindmap-node')
      .classed('selected', false);

    if (nodeId) {
      this.container
        .selectAll<SVGGElement, D3Node>('.mindmap-node')
        .filter((d: D3Node) => d.data.id === nodeId)
        .classed('selected', true);
    }
  }

  /**
   * カーソル対応ノードの強調表示
   */
  public highlightCursorNode(nodeId: string | null): void {
    this.container
      .selectAll('.mindmap-node')
      .classed('cursor-highlight', false);

    if (nodeId) {
      this.container
        .selectAll<SVGGElement, D3Node>('.mindmap-node')
        .filter((d: D3Node) => d.data.id === nodeId)
        .classed('cursor-highlight', true);
    }
  }

  /**
   * ノードにフォーカス（ズームして中央に配置）
   */
  public focusNode(nodeId: string): void {
    if (!this.root) return;

    const targetNode = this.findNodeById(this.root, nodeId);
    if (!targetNode) return;

    const svgRect = (this.svg.node() as SVGSVGElement).getBoundingClientRect();
    const centerX = svgRect.width / 2;
    const centerY = svgRect.height / 2;

    const transform = d3.zoomIdentity
      .translate(centerX - targetNode.x, centerY - targetNode.y)
      .scale(1.2);

    this.svg
      .transition()
      .duration(500)
      .call(this.zoom.transform, transform);
  }

  /**
   * イベントハンドラーの更新
   */
  public updateEventHandlers(newHandlers: Partial<RendererEventHandlers>): void {
    this.eventHandlers = { ...this.eventHandlers, ...newHandlers };
  }

  /**
   * パフォーマンス監視を開始
   */
  private startPerformanceMonitoring(): void {
    performanceMonitor.startMemoryMonitoring(5000, (memoryInfo) => {
      console.warn('[Renderer] High memory usage detected:', memoryInfo);

      // メモリ使用量が高い場合は自動的にパフォーマンスモードに切り替え
      if (memoryInfo.usageRatio > 0.85) {
        this.setPerformanceMode('performance');
      }
    });
  }

  /**
   * ズーム変更ハンドラー
   */
  private handleZoomChange(transform: d3.ZoomTransform): void {
    if (!this.svg.node()) return;

    const svgRect = (this.svg.node() as SVGSVGElement).getBoundingClientRect();

    // 現在のビューポートを更新
    this.currentViewport = {
      x: -transform.x / transform.k,
      y: -transform.y / transform.k,
      width: svgRect.width / transform.k,
      height: svgRect.height / transform.k,
      scale: transform.k,
    };

    // 仮想化が有効な場合は再描画
    if (this.enableVirtualization && this.root) {
      this.debouncedRender();
    }
  }

  /**
   * パフォーマンスモードを自動調整
   */
  private adjustPerformanceMode(): void {
    if (this.performanceMode !== 'auto' || !this.root) return;

    const nodeCount = this.root.descendants().length;
    const memoryInfo = performanceMonitor.getCurrentMemoryUsage();

    // ノード数とメモリ使用量に基づいて自動調整
    if (nodeCount > 500 || (memoryInfo && memoryInfo.usageRatio > 0.7)) {
      this.enableVirtualization = true;
      this.settings.enableAnimation = false;
      console.debug('[Renderer] Auto-switched to performance mode');
    } else if (nodeCount < 100 && (!memoryInfo || memoryInfo.usageRatio < 0.5)) {
      this.enableVirtualization = false;
      this.settings.enableAnimation = true;
      console.debug('[Renderer] Auto-switched to quality mode');
    }
  }

  /**
   * パフォーマンスモードを設定
   */
  public setPerformanceMode(mode: 'auto' | 'performance' | 'quality'): void {
    this.performanceMode = mode;

    switch (mode) {
      case 'performance':
        this.enableVirtualization = true;
        this.settings.enableAnimation = false;
        this.nodeCountThreshold = 50;
        this.virtualizationManager.updateLODSettings({
          maxVisibleNodes: 200,
          detailMinZoom: 1.0,
          mediumMinZoom: 0.6,
          simpleMinZoom: 0.3,
        });
        break;

      case 'quality':
        this.enableVirtualization = false;
        this.settings.enableAnimation = true;
        this.nodeCountThreshold = 1000;
        break;

      case 'auto':
        this.adjustPerformanceMode();
        break;
    }

    // 設定変更後に再描画
    if (this.root) {
      this.debouncedRender();
    }
  }

  /**
   * 仮想化の有効/無効を切り替え
   */
  public setVirtualizationEnabled(enabled: boolean): void {
    this.enableVirtualization = enabled;

    if (this.root) {
      this.debouncedRender();
    }
  }

  /**
   * ノード数をカウント
   */
  private countNodes(node: MindmapNode): number {
    let count = 1;
    if (node.children) {
      for (const child of node.children) {
        count += this.countNodes(child);
      }
    }
    return count;
  }

  /**
   * パフォーマンス統計を取得
   */
  public getPerformanceStats(): {
    renderMetrics: Record<string, unknown> | null;
    virtualizationStats: Record<string, unknown>;
    memoryInfo: {
      usedJSHeapSize: number;
      totalJSHeapSize: number;
      jsHeapSizeLimit: number;
      usageRatio: number;
    } | null;
    currentSettings: {
      enableVirtualization: boolean;
      performanceMode: string;
      nodeCountThreshold: number;
    };
  } {
    return {
      renderMetrics: performanceMonitor.getMetricsSummary('mindmap-render'),
      virtualizationStats: this.virtualizationManager.getStats(),
      memoryInfo: performanceMonitor.getCurrentMemoryUsage(),
      currentSettings: {
        enableVirtualization: this.enableVirtualization,
        performanceMode: this.performanceMode,
        nodeCountThreshold: this.nodeCountThreshold,
      },
    };
  }

  /**
   * パフォーマンス統計をログ出力
   */
  public logPerformanceStats(): void {
    console.group('[Renderer] Performance Statistics');

    const stats = this.getPerformanceStats();

    if (stats.renderMetrics) {
      console.log('Render Metrics:', stats.renderMetrics);
    }

    console.log('Virtualization Stats:', stats.virtualizationStats);

    if (stats.memoryInfo) {
      console.log('Memory Usage:', {
        used: `${(stats.memoryInfo.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB`,
        total: `${(stats.memoryInfo.totalJSHeapSize / 1024 / 1024).toFixed(2)}MB`,
        limit: `${(stats.memoryInfo.jsHeapSizeLimit / 1024 / 1024).toFixed(2)}MB`,
        usage: `${(stats.memoryInfo.usageRatio * 100).toFixed(1)}%`,
      });
    }

    console.log('Current Settings:', stats.currentSettings);

    if (this.lastVirtualizationResult) {
      console.log('Last Virtualization Result:', {
        visibleNodes: this.lastVirtualizationResult.visibleNodeCount,
        totalNodes: this.lastVirtualizationResult.totalNodes,
        culledNodes: this.lastVirtualizationResult.stats.culledNodes,
        processingTime: `${this.lastVirtualizationResult.stats.processingTime.toFixed(2)}ms`,
        memoryEstimate: `${(this.lastVirtualizationResult.stats.memoryEstimate / 1024).toFixed(2)}KB`,
      });
    }

    console.groupEnd();
  }

  /**
   * メモリ使用量を最適化
   */
  public optimizeMemory(): void {
    console.log('[Renderer] Optimizing memory usage...');

    // 仮想化キャッシュをクリア
    this.virtualizationManager.clearCache();

    // パフォーマンス統計をクリア
    performanceMonitor.clearMetrics();

    // ガベージコレクションを強制実行（可能な場合）
    performanceMonitor.forceGarbageCollection();

    // パフォーマンスモードに切り替え
    if (this.performanceMode === 'auto') {
      this.setPerformanceMode('performance');
    }

    console.log('[Renderer] Memory optimization completed');
  }

  /**
   * リソースのクリーンアップ
   */
  public destroy(): void {
    // パフォーマンス監視を停止
    performanceMonitor.stopMemoryMonitoring();

    // 仮想化マネージャーをクリア
    this.virtualizationManager.clearCache();

    // リサイズ監視を停止
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }

    this.svg.selectAll('*').remove();
    this.svg.on('.zoom', null);

    // 参照をクリア
    this.root = null;
    this.currentViewport = null;
    this.lastVirtualizationResult = null;
  }
}