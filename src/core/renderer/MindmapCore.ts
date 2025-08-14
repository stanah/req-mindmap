/**
 * マインドマップコア描画エンジン
 * プラットフォーム非依存のD3.js描画機能を提供
 */

import * as d3 from 'd3';
import type {
  MindmapData,
  MindmapNode,
  MindmapSettings,
  CustomSchema,
  RendererEventHandlers,
  RenderOptions
} from '../types';

/**
 * D3.js用の拡張ノードデータ
 */
export interface D3Node extends d3.HierarchyPointNode<MindmapNode> {
  width: number;
  height: number;
  _children?: D3Node[];
}

/**
 * マインドマップコア描画クラス
 * プラットフォーム非依存のSVG描画機能を提供
 */
export class MindmapCore {
  private svg!: d3.Selection<SVGSVGElement, unknown, null, undefined>;
  private container!: d3.Selection<SVGGElement, unknown, null, undefined>;
  private zoom!: d3.ZoomBehavior<SVGSVGElement, unknown>;
  private root: D3Node | null = null;
  private settings: MindmapSettings;
  private eventHandlers: RendererEventHandlers = {};
  private customSchema: CustomSchema | null = null;

  // 描画定数
  private readonly NODE_WIDTH = 160;
  private readonly NODE_HEIGHT = 40;
  private readonly NODE_PADDING = 8;
  private readonly LEVEL_SPACING = 200;
  private readonly NODE_SPACING = 60;

  constructor(options: RenderOptions) {
    this.settings = {
      layout: 'tree',
      theme: 'light',
      enableAnimation: true,
      maxNodeWidth: 200,
      nodeSpacing: 60,
      levelSpacing: 200,
      verticalSpacing: 1.0,
      ...options.settings,
    };
    
    this.eventHandlers = options.eventHandlers || {};
    this.initializeSVG(options.container);
  }

  /**
   * SVGの初期化
   */
  private initializeSVG(svgElement: SVGSVGElement): void {
    this.svg = d3.select(svgElement);
    
    // メインコンテナ
    this.container = this.svg
      .append('g')
      .attr('class', 'mindmap-container');

    // ズーム機能
    this.zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 3])
      .on('zoom', (event) => {
        this.container.attr('transform', event.transform);
      });

    this.svg.call(this.zoom);

    // 背景クリックイベント
    this.svg.on('click', (event) => {
      if (event.target === svgElement && this.eventHandlers.onBackgroundClick) {
        this.eventHandlers.onBackgroundClick(event);
      }
    });

    // 描画グループの作成
    this.container.append('g').attr('class', 'mindmap-links');
    this.container.append('g').attr('class', 'mindmap-nodes');
  }

  /**
   * データの描画
   */
  public render(data: MindmapData): void {
    if (!data || !data.root) {
      console.warn('描画データが無効です');
      return;
    }

    // カスタムスキーマの設定
    this.customSchema = data.schema || null;

    // D3.js階層データの作成
    this.root = d3.hierarchy(data.root, (d: MindmapNode) => 
      d.collapsed ? null : d.children
    ) as D3Node;

    // ノードサイズの計算
    this.calculateNodeSizes(this.root);

    // レイアウトの適用
    this.applyLayout();

    // 描画の実行
    this.draw();

    // 初期ビューの設定
    this.resetView();
  }

  /**
   * ノードサイズの計算
   */
  private calculateNodeSizes(node: D3Node): void {
    const measureText = (text: string): { width: number; height: number } => {
      const maxWidth = this.settings.maxNodeWidth || 200;
      const fontSize = 14;
      const charWidth = fontSize * 0.6;
      const lineHeight = fontSize * 1.4;
      
      const lines = Math.ceil((text.length * charWidth) / (maxWidth - this.NODE_PADDING * 2));
      const width = Math.min(text.length * charWidth + this.NODE_PADDING * 2, maxWidth);
      const height = lines * lineHeight + this.NODE_PADDING * 2;
      
      return { width, height };
    };

    const size = measureText(node.data.title);
    node.width = Math.max(size.width, this.NODE_WIDTH);
    node.height = Math.max(size.height, this.NODE_HEIGHT);

    // 子ノードのサイズも計算
    if (node.children) {
      node.children.forEach(child => this.calculateNodeSizes(child));
    }
  }

  /**
   * レイアウトの適用
   */
  private applyLayout(): void {
    if (!this.root) return;

    const layout = this.settings.layout || 'tree';

    if (layout === 'tree') {
      const treeLayout = d3.tree<MindmapNode>()
        .nodeSize([this.NODE_SPACING * (this.settings.verticalSpacing || 1), this.LEVEL_SPACING])
        .separation((a, b) => {
          const aWidth = (a as D3Node).width || this.NODE_WIDTH;
          const bWidth = (b as D3Node).width || this.NODE_WIDTH;
          return (aWidth + bWidth) / (2 * this.NODE_WIDTH) + 0.5;
        });

      treeLayout(this.root);
    } else if (layout === 'radial') {
      this.applyRadialLayout();
    }
  }

  /**
   * 放射状レイアウトの適用
   */
  private applyRadialLayout(): void {
    if (!this.root) return;

    const cluster = d3.cluster<MindmapNode>()
      .size([2 * Math.PI, 200]);

    cluster(this.root);

    // 極座標から直交座標への変換
    this.root.each((node: D3Node) => {
      const angle = node.x as number;
      const radius = node.y as number;
      node.x = Math.cos(angle) * radius;
      node.y = Math.sin(angle) * radius;
    });
  }

  /**
   * 描画の実行
   */
  private draw(): void {
    if (!this.root) return;

    const nodes = this.root.descendants();
    const links = this.root.links();

    this.drawLinks(links);
    this.drawNodes(nodes);
  }

  /**
   * リンクの描画
   */
  private drawLinks(links: d3.HierarchyLink<MindmapNode>[]): void {
    const linkSelection = this.container.select('.mindmap-links')
      .selectAll<SVGPathElement, d3.HierarchyLink<MindmapNode>>('.mindmap-link')
      .data(links, (d: d3.HierarchyLink<MindmapNode>) => 
        `${d.source.data.id}-${d.target.data.id}`
      );

    // 新しいリンクの追加
    const linkEnter = linkSelection
      .enter()
      .append('path')
      .attr('class', 'mindmap-link')
      .attr('fill', 'none')
      .attr('stroke', '#ccc')
      .attr('stroke-width', 2);

    // リンクパスの更新
    const linkUpdate = linkEnter.merge(linkSelection);

    const linkPath = this.settings.layout === 'radial' 
      ? d3.linkRadial<d3.HierarchyLink<MindmapNode>, d3.HierarchyPointNode<MindmapNode>>()
          .angle(d => d.x as number)
          .radius(d => d.y as number)
      : d3.linkHorizontal<d3.HierarchyLink<MindmapNode>, d3.HierarchyPointNode<MindmapNode>>()
          .x(d => d.y as number)
          .y(d => d.x as number);

    if (this.settings.enableAnimation) {
      linkUpdate.transition()
        .duration(300)
        .attr('d', linkPath as any);
    } else {
      linkUpdate.attr('d', linkPath as any);
    }

    // 不要なリンクの削除
    linkSelection.exit().remove();
  }

  /**
   * ノードの描画
   */
  private drawNodes(nodes: D3Node[]): void {
    const nodeSelection = this.container.select('.mindmap-nodes')
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
          this.eventHandlers.onNodeClick(d.data.id, event);
        }
      })
      .on('mouseenter', (event, d) => {
        if (this.eventHandlers.onNodeHover) {
          this.eventHandlers.onNodeHover(d.data.id, event);
        }
      })
      .on('mouseleave', (event, d) => {
        if (this.eventHandlers.onNodeLeave) {
          this.eventHandlers.onNodeLeave(d.data.id, event);
        }
      });

    // ノードの背景矩形
    nodeEnter
      .append('rect')
      .attr('class', 'mindmap-node-rect')
      .attr('rx', 8)
      .attr('ry', 8)
      .attr('stroke', '#e0e0e0')
      .attr('stroke-width', 1)
      .attr('fill', '#fff');

    // ノードテキスト
    nodeEnter
      .append('text')
      .attr('class', 'mindmap-node-text')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'central')
      .attr('font-size', '14px')
      .attr('fill', '#333');

    // ノードの更新
    const nodeUpdate = nodeEnter.merge(nodeSelection);

    // 位置の更新
    if (this.settings.enableAnimation) {
      nodeUpdate.transition()
        .duration(300)
        .attr('transform', (d: D3Node) => 
          this.settings.layout === 'radial' 
            ? `translate(${d.x},${d.y})` 
            : `translate(${d.y},${d.x})`
        );
    } else {
      nodeUpdate.attr('transform', (d: D3Node) => 
        this.settings.layout === 'radial' 
          ? `translate(${d.x},${d.y})` 
          : `translate(${d.y},${d.x})`
      );
    }

    // 背景矩形のサイズ更新
    nodeUpdate.select('.mindmap-node-rect')
      .attr('width', (d: D3Node) => d.width)
      .attr('height', (d: D3Node) => d.height)
      .attr('x', (d: D3Node) => -d.width / 2)
      .attr('y', (d: D3Node) => -d.height / 2)
      .attr('fill', (d: D3Node) => this.getNodeColor(d.data));

    // テキストの更新
    nodeUpdate.select('.mindmap-node-text')
      .text((d: D3Node) => this.truncateText(d.data.title, d.width - this.NODE_PADDING * 2));

    // 不要なノードの削除
    nodeSelection.exit().remove();
  }

  /**
   * ノードの色を取得
   */
  private getNodeColor(node: MindmapNode): string {
    if (node.color) {
      return node.color;
    }

    const theme = this.settings.theme || 'light';
    return theme === 'dark' ? '#2d2d2d' : '#ffffff';
  }

  /**
   * テキストの切り捨て
   */
  private truncateText(text: string, maxWidth: number): string {
    const charWidth = 8; // 大体の文字幅
    const maxChars = Math.floor(maxWidth / charWidth);
    
    if (text.length <= maxChars) {
      return text;
    }
    
    return text.substring(0, maxChars - 3) + '...';
  }

  /**
   * ノードの選択
   */
  public selectNode(nodeId: string | null): void {
    this.container.selectAll('.mindmap-node')
      .classed('selected', false);

    if (nodeId) {
      this.container.selectAll('.mindmap-node')
        .filter((d: any) => d.data.id === nodeId)
        .classed('selected', true);
    }
  }

  /**
   * ノードの折りたたみ切り替え
   */
  public toggleNode(nodeId: string): void {
    if (!this.root) return;

    const node = this.findNodeById(this.root, nodeId);
    if (!node) return;

    if (node.children) {
      // 折りたたみ
      node._children = node.children;
      node.children = undefined;
    } else if (node._children) {
      // 展開
      node.children = node._children;
      node._children = undefined;
    }

    // 再描画
    this.applyLayout();
    this.draw();
  }

  /**
   * IDでノードを検索
   */
  private findNodeById(root: D3Node, nodeId: string): D3Node | null {
    if (root.data.id === nodeId) {
      return root;
    }

    if (root.children) {
      for (const child of root.children) {
        const found = this.findNodeById(child, nodeId);
        if (found) return found;
      }
    }

    return null;
  }

  /**
   * ビューのリセット
   */
  public resetView(): void {
    if (!this.root) return;

    const bounds = this.container.node()?.getBBox();
    if (!bounds) return;

    const svgElement = this.svg.node();
    if (!svgElement) return;

    const svgRect = svgElement.getBoundingClientRect();
    const scale = Math.min(
      svgRect.width / bounds.width,
      svgRect.height / bounds.height
    ) * 0.8;

    const x = svgRect.width / 2 - (bounds.x + bounds.width / 2) * scale;
    const y = svgRect.height / 2 - (bounds.y + bounds.height / 2) * scale;

    this.svg.transition()
      .duration(500)
      .call(this.zoom.transform, d3.zoomIdentity.translate(x, y).scale(scale));
  }

  /**
   * ズームイン
   */
  public zoomIn(): void {
    this.svg.transition()
      .duration(300)
      .call(this.zoom.scaleBy, 1.5);
  }

  /**
   * ズームアウト
   */
  public zoomOut(): void {
    this.svg.transition()
      .duration(300)
      .call(this.zoom.scaleBy, 1 / 1.5);
  }

  /**
   * 設定の更新
   */
  public updateSettings(newSettings: Partial<MindmapSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
    
    if (this.root) {
      this.applyLayout();
      this.draw();
    }
  }

  /**
   * 現在のカーソル対応ノードをハイライト（今後実装）
   */
  public highlightCursorNode(nodeId: string | null): void {
    // 今後実装
    console.log('highlightCursorNode called with:', nodeId);
  }

  /**
   * ビューを中央に配置（今後実装）
   */
  public centerView(): void {
    // 今後実装
    this.resetView();
  }

  /**
   * パフォーマンスモードの設定（今後実装）
   */
  public setPerformanceMode(mode: 'auto' | 'performance' | 'quality'): void {
    console.log('setPerformanceMode called with:', mode);
  }

  /**
   * パフォーマンス統計のログ出力（今後実装）
   */
  public logPerformanceStats(): void {
    console.log('Performance stats logging...');
  }

  /**
   * メモリ最適化（今後実装）
   */
  public optimizeMemory(): void {
    console.log('Memory optimization...');
  }

  /**
   * パフォーマンス統計の取得（今後実装）
   */
  public getPerformanceStats(): any {
    return {
      currentSettings: {
        enableVirtualization: true
      }
    };
  }

  /**
   * 仮想化の有効/無効切り替え（今後実装）
   */
  public setVirtualizationEnabled(enabled: boolean): void {
    console.log('setVirtualizationEnabled called with:', enabled);
  }

  /**
   * ノードにフォーカス（今後実装）
   */
  public focusNode(nodeId: string): void {
    console.log('focusNode called with:', nodeId);
  }

  /**
   * 破棄処理
   */
  public destroy(): void {
    if (this.svg) {
      this.svg.selectAll('*').remove();
      this.svg.on('click', null);
    }
    
    this.root = null;
    this.customSchema = null;
  }
}