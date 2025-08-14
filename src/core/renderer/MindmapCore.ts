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
    const maxWidth = this.settings.maxNodeWidth || 200;
    console.log('calculateNodeSizes - maxWidth:', maxWidth, 'settings:', this.settings);
    
    // 複数行テキストのサイズを測定
    const textMeasurement = this.measureMultilineText(node.data.title, maxWidth - this.NODE_PADDING * 2);
    
    // ノードの幅を固定（設定値または200px）
    node.width = maxWidth;
    
    // 実際の行数に基づいて高さを設定
    node.height = Math.max(textMeasurement.height + this.NODE_PADDING * 2, this.NODE_HEIGHT);

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
      // 動的な横方向間隔を計算
      const dynamicLevelSpacing = this.calculateDynamicLevelSpacing(this.root);
      
      const treeLayout = d3.tree<MindmapNode>()
        .nodeSize([this.NODE_SPACING, dynamicLevelSpacing])
        .separation((a, b) => {
          return this.calculateDynamicSeparation(a as D3Node, b as D3Node);
        });

      treeLayout(this.root);
    } else if (layout === 'radial') {
      this.applyRadialLayout();
    }
  }

  /**
   * 動的な横方向間隔（階層間距離）を計算
   */
  private calculateDynamicLevelSpacing(root: D3Node): number {
    // 各階層の最大ノード幅を計算
    const maxWidthPerLevel: number[] = [];
    
    root.each((node: D3Node) => {
      const depth = node.depth || 0;
      const width = node.width || this.NODE_WIDTH;
      maxWidthPerLevel[depth] = Math.max(maxWidthPerLevel[depth] || 0, width);
    });
    
    // 最大幅に基づいて間隔を決定
    const maxWidth = Math.max(...maxWidthPerLevel);
    const dynamicSpacing = Math.max(this.LEVEL_SPACING, maxWidth + 50);
    
    console.log('Dynamic level spacing:', { maxWidthPerLevel, maxWidth, dynamicSpacing });
    
    return dynamicSpacing;
  }

  /**
   * 動的な間隔計算
   * ノードの実際のサイズに基づいて間隔を動的に調整
   */
  private calculateDynamicSeparation(nodeA: D3Node, nodeB: D3Node): number {
    // 全て同じ間隔
    return 1;
  }

  /**
   * 放射状レイアウトの適用
   */
  private applyRadialLayout(): void {
    if (!this.root) return;

    const cluster = d3.cluster<MindmapNode>()
      .size([2 * Math.PI, 200])
      .separation((a, b) => {
        // 放射状レイアウト用の動的間隔調整
        return this.calculateRadialSeparation(a as D3Node, b as D3Node);
      });

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
   * 放射状レイアウト用の動的間隔計算
   * 半径による間隔の調整と、ノードサイズを考慮
   */
  private calculateRadialSeparation(nodeA: D3Node, nodeB: D3Node): number {
    // 基本間隔（d3の標準と同じ）
    const baseSeparation = nodeA.parent === nodeB.parent ? 1 : 2;
    
    // 半径による調整（深い階層ほど間隔を狭める - d3公式推奨）
    const depth = Math.max(nodeA.depth || 1, nodeB.depth || 1);
    const radialFactor = baseSeparation / depth;
    
    // ノードサイズによる調整
    const aWidth = nodeA.width || this.NODE_WIDTH;
    const bWidth = nodeB.width || this.NODE_WIDTH;
    const maxWidth = Math.max(aWidth, bWidth);
    const sizeFactor = Math.min(maxWidth / this.NODE_WIDTH, 1.5);
    
    // verticalSpacing設定による調整
    const spacingFactor = this.settings.verticalSpacing || 1.0;
    
    return Math.max(0.3, radialFactor * sizeFactor * spacingFactor);
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

    // ノードテキスト（複数行対応）
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

    // 背景矩形のサイズ更新（優先度インジケーター対応）
    nodeUpdate.select('.mindmap-node-rect')
      .attr('width', (d: D3Node) => d.width)
      .attr('height', (d: D3Node) => d.height)
      .attr('x', (d: D3Node) => -d.width / 2)
      .attr('y', (d: D3Node) => -d.height / 2)
      .attr('fill', (d: D3Node) => this.getNodeColor(d.data))
      .attr('stroke', (d: D3Node) => this.getPriorityBorderColor(d.data))
      .attr('stroke-width', (d: D3Node) => this.getPriorityBorderWidth(d.data));

    // テキストの更新（複数行対応）
    nodeUpdate.select('.mindmap-node-text')
      .each((d: D3Node, i, nodes) => {
        const textElement = d3.select(nodes[i] as SVGTextElement);
        
        // 実際の行数を計算してノード高さを調整（幅は固定）
        const actualLines = this.countActualLines(d.data.title, d.width - this.NODE_PADDING * 2);
        const requiredHeight = actualLines * 16.8 + this.NODE_PADDING * 2;
        if (requiredHeight > d.height) {
          d.height = requiredHeight;
          // 背景矩形の高さのみ更新（幅は変更しない）
          nodeUpdate.filter((nd: D3Node) => nd === d)
            .select('.mindmap-node-rect')
            .attr('height', d.height)
            .attr('y', -d.height / 2);
        }
        
        this.renderMultilineText(textElement, d.data.title, d.width - this.NODE_PADDING * 2, d.height - this.NODE_PADDING * 2);
      });

    // 優先度バッジの描画
    this.drawPriorityBadges(nodeUpdate);

    // ステータスバッジの描画
    this.drawStatusBadges(nodeUpdate);

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

    // 優先度に応じた背景色の微調整
    const theme = this.settings.theme || 'light';
    const baseColor = theme === 'dark' ? '#2d2d2d' : '#ffffff';
    
    // 優先度に応じて背景色を微調整
    const priority = node.priority;
    if (priority && theme === 'light') {
      switch (priority) {
        case 'critical':
          return '#fef2f2'; // クリティカル：強い赤系背景
        case 'high':
          return '#fef2f2'; // 赤系の薄い背景
        case 'medium':
          return '#fffbeb'; // オレンジ系の薄い背景
        case 'low':
          return '#f0fdf4'; // 緑系の薄い背景
      }
    } else if (priority && theme === 'dark') {
      switch (priority) {
        case 'critical':
          return '#4f1f1f'; // クリティカル：より強い赤系暗い背景
        case 'high':
          return '#3f1f1f'; // 赤系の暗い背景
        case 'medium':
          return '#3f2f1f'; // オレンジ系の暗い背景
        case 'low':
          return '#1f3f2f'; // 緑系の暗い背景
      }
    }
    
    return baseColor;
  }

  /**
   * 優先度に応じた境界線の色を取得
   */
  private getPriorityBorderColor(node: MindmapNode): string {
    const priority = node.priority;
    
    switch (priority) {
      case 'critical':
        return '#dc2626'; // クリティカル：濃い赤
      case 'high':
        return '#ef4444'; // 赤
      case 'medium':
        return '#f59e0b'; // オレンジ
      case 'low':
        return '#10b981'; // 緑
      default:
        return '#e0e0e0'; // デフォルトのグレー
    }
  }

  /**
   * 優先度に応じた境界線の太さを取得
   */
  private getPriorityBorderWidth(node: MindmapNode): number {
    const priority = node.priority;
    
    switch (priority) {
      case 'critical':
        return 4; // クリティカル：最も太い境界線
      case 'high':
        return 3; // 太い境界線
      case 'medium':
        return 2; // 中程度の境界線
      case 'low':
        return 1; // 細い境界線
      default:
        return 1; // デフォルト
    }
  }

  /**
   * 優先度バッジの情報を取得
   */
  private getPriorityBadgeInfo(node: MindmapNode): { text: string; color: string; bgColor: string } | null {
    const priority = node.priority;
    
    switch (priority) {
      case 'critical':
        return { text: 'CRITICAL', color: '#ffffff', bgColor: '#dc2626' };
      case 'high':
        return { text: 'HIGH', color: '#ffffff', bgColor: '#ef4444' };
      case 'medium':
        return { text: 'MEDIUM', color: '#ffffff', bgColor: '#f59e0b' };
      case 'low':
        return { text: 'LOW', color: '#ffffff', bgColor: '#10b981' };
      default:
        return null;
    }
  }

  /**
   * ステータスバッジの情報を取得
   */
  private getStatusBadgeInfo(node: MindmapNode): { text: string; color: string; bgColor: string } | null {
    const status = node.status;
    
    switch (status) {
      case 'draft':
        return { text: 'DRAFT', color: '#ffffff', bgColor: '#9ca3af' };
      case 'pending':
        return { text: 'PENDING', color: '#ffffff', bgColor: '#6b7280' };
      case 'in-progress':
        return { text: 'WORKING', color: '#ffffff', bgColor: '#3b82f6' };
      case 'review':
        return { text: 'REVIEW', color: '#ffffff', bgColor: '#f59e0b' };
      case 'done':
        return { text: 'DONE', color: '#ffffff', bgColor: '#10b981' };
      case 'cancelled':
        return { text: 'CANCELLED', color: '#ffffff', bgColor: '#ef4444' };
      case 'deferred':
        return { text: 'DEFERRED', color: '#ffffff', bgColor: '#8b5cf6' };
      default:
        return null;
    }
  }

  /**
   * 優先度バッジを描画
   */
  private drawPriorityBadges(nodeUpdate: d3.Selection<SVGGElement, D3Node, SVGGElement, unknown>): void {
    // 既存のバッジを削除
    nodeUpdate.selectAll('.priority-badge').remove();

    // 優先度バッジの描画
    nodeUpdate.each((d: D3Node, i, nodes) => {
      const badgeInfo = this.getPriorityBadgeInfo(d.data);
      if (!badgeInfo) return;

      const nodeGroup = d3.select(nodes[i] as SVGGElement);
      const badgeHeight = 16;
      const badgeWidth = badgeInfo.text.length * 6 + 8; // 文字数に応じて幅を調整
      const badgeX = d.width / 2 - badgeWidth - 4;
      const badgeY = -d.height / 2 - 8;

      // バッジグループ作成
      const badgeGroup = nodeGroup
        .append('g')
        .attr('class', 'priority-badge')
        .attr('transform', `translate(${badgeX}, ${badgeY})`);

      // バッジ背景（長方形）
      badgeGroup
        .append('rect')
        .attr('width', badgeWidth)
        .attr('height', badgeHeight)
        .attr('rx', 3)
        .attr('ry', 3)
        .attr('fill', badgeInfo.bgColor)
        .attr('stroke', '#ffffff')
        .attr('stroke-width', 1);

      // バッジテキスト
      badgeGroup
        .append('text')
        .attr('x', badgeWidth / 2)
        .attr('y', badgeHeight / 2)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'central')
        .attr('font-size', '8px')
        .attr('font-weight', 'bold')
        .attr('fill', badgeInfo.color)
        .text(badgeInfo.text);
    });
  }

  /**
   * ステータスバッジを描画
   */
  private drawStatusBadges(nodeUpdate: d3.Selection<SVGGElement, D3Node, SVGGElement, unknown>): void {
    // 既存のステータスバッジを削除
    nodeUpdate.selectAll('.status-badge').remove();

    // ステータスバッジの描画
    nodeUpdate.each((d: D3Node, i, nodes) => {
      const badgeInfo = this.getStatusBadgeInfo(d.data);
      if (!badgeInfo) return;

      const nodeGroup = d3.select(nodes[i] as SVGGElement);
      
      // 優先度バッジがある場合のX位置を計算
      const priorityBadgeInfo = this.getPriorityBadgeInfo(d.data);
      const priorityBadgeWidth = priorityBadgeInfo ? priorityBadgeInfo.text.length * 6 + 8 : 0;
      
      const badgeHeight = 16;
      const badgeWidth = badgeInfo.text.length * 6 + 8;
      const badgeX = d.width / 2 - badgeWidth - priorityBadgeWidth - 8; // 優先度バッジの左隣に配置
      const badgeY = -d.height / 2 - 8;

      // バッジグループ作成
      const badgeGroup = nodeGroup
        .append('g')
        .attr('class', 'status-badge')
        .attr('transform', `translate(${badgeX}, ${badgeY})`);

      // バッジ背景（長方形）
      badgeGroup
        .append('rect')
        .attr('width', badgeWidth)
        .attr('height', badgeHeight)
        .attr('rx', 3)
        .attr('ry', 3)
        .attr('fill', badgeInfo.bgColor)
        .attr('stroke', '#ffffff')
        .attr('stroke-width', 1);

      // バッジテキスト
      badgeGroup
        .append('text')
        .attr('x', badgeWidth / 2)
        .attr('y', badgeHeight / 2)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'central')
        .attr('font-size', '8px')
        .attr('font-weight', 'bold')
        .attr('fill', badgeInfo.color)
        .text(badgeInfo.text);
    });
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
   * 実際の行数をカウント（renderMultilineTextと同じロジック）
   */
  private countActualLines(text: string, maxWidth: number): number {
    const fontSize = 14;
    const charWidth = fontSize * 1.0; // 日本語対応で幅を広く
    
    const paragraphs = text.split(/\n/);
    const allLines: string[] = [];
    
    paragraphs.forEach(paragraph => {
      if (paragraph.trim() === '') {
        allLines.push('');
        return;
      }
      
      const paragraphWidth = paragraph.length * charWidth;
      if (paragraphWidth <= maxWidth) {
        allLines.push(paragraph);
        return;
      }
      
      const words = paragraph.split(/\s+/);
      let currentLine = '';
      
      words.forEach(word => {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const testWidth = testLine.length * charWidth;
        
        if (testWidth <= maxWidth) {
          currentLine = testLine;
        } else {
          if (currentLine) {
            allLines.push(currentLine);
            currentLine = word;
            
            while (word.length * charWidth > maxWidth) {
              const maxChars = Math.floor(maxWidth / charWidth);
              if (maxChars > 0) {
                allLines.push(word.substring(0, maxChars));
                word = word.substring(maxChars);
              } else {
                break;
              }
            }
            currentLine = word;
          } else {
            while (word.length * charWidth > maxWidth) {
              const maxChars = Math.floor(maxWidth / charWidth);
              if (maxChars > 0) {
                allLines.push(word.substring(0, maxChars));
                word = word.substring(maxChars);
              } else {
                break;
              }
            }
            currentLine = word;
          }
        }
      });
      
      if (currentLine) {
        allLines.push(currentLine);
      }
    });
    
    return allLines.length;
  }

  /**
   * 複数行テキストの描画
   */
  private renderMultilineText(textElement: d3.Selection<SVGTextElement, unknown, null, undefined>, text: string, maxWidth: number, maxHeight: number): void {
    console.log('renderMultilineText called with:', { text, maxWidth, maxHeight });
    // 既存のtspan要素をクリア
    textElement.selectAll('tspan').remove();
    
    const fontSize = 14;
    const lineHeight = fontSize * 1.2;
    const charWidth = fontSize * 1.0; // 日本語対応で幅を広く
    
    // 改行文字で分割
    const paragraphs = text.split(/\n/);
    console.log('Split paragraphs:', paragraphs);
    const allLines: string[] = [];
    
    // 各段落をワードラップ
    paragraphs.forEach(paragraph => {
      if (paragraph.trim() === '') {
        allLines.push(''); // 空行を保持
        return;
      }
      
      // 段落がmaxWidth以内に収まる場合はそのまま追加
      const paragraphWidth = paragraph.length * charWidth;
      if (paragraphWidth <= maxWidth) {
        allLines.push(paragraph);
        return;
      }
      
      const words = paragraph.split(/\s+/);
      let currentLine = '';
      
      words.forEach(word => {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const testWidth = testLine.length * charWidth;
        
        if (testWidth <= maxWidth) {
          currentLine = testLine;
        } else {
          if (currentLine) {
            allLines.push(currentLine);
            currentLine = word;
            
            // 新しい行の単語も長すぎる場合は文字単位で分割
            while (word.length * charWidth > maxWidth) {
              const maxChars = Math.floor(maxWidth / charWidth);
              if (maxChars > 0) {
                allLines.push(word.substring(0, maxChars));
                word = word.substring(maxChars);
              } else {
                break;
              }
            }
            currentLine = word;
          } else {
            // 最初の単語が長すぎる場合も文字単位で分割
            while (word.length * charWidth > maxWidth) {
              const maxChars = Math.floor(maxWidth / charWidth);
              if (maxChars > 0) {
                allLines.push(word.substring(0, maxChars));
                word = word.substring(maxChars);
              } else {
                break;
              }
            }
            currentLine = word;
          }
        }
      });
      
      if (currentLine) {
        allLines.push(currentLine);
      }
    });
    
    // 改行が含まれている場合は高さ制限を緩和
    const hasExplicitLineBreaks = text.includes('\n');
    const maxLines = hasExplicitLineBreaks 
      ? allLines.length  // 改行がある場合は全行表示
      : Math.floor(maxHeight / lineHeight);  // 改行がない場合のみ高さ制限
    
    const displayLines = allLines.slice(0, maxLines);
    
    // 行数が制限を超える場合は省略記号を追加（改行がない場合のみ）
    if (!hasExplicitLineBreaks && allLines.length > maxLines && maxLines > 0) {
      if (displayLines.length > 0) {
        const lastLine = displayLines[displayLines.length - 1];
        displayLines[displayLines.length - 1] = lastLine.substring(0, Math.max(0, lastLine.length - 3)) + '...';
      }
    }
    
    // 各行をtspan要素として追加
    const startY = -(displayLines.length - 1) * lineHeight / 2;
    console.log('Final displayLines:', displayLines);
    
    displayLines.forEach((line, index) => {
      console.log(`Adding tspan ${index}: "${line}"`);
      const dyValue = index === 0 ? startY : lineHeight;
      console.log(`Setting dy to: ${dyValue}`);
      
      const tspan = textElement
        .append('tspan')
        .attr('x', 0)
        .attr('dy', dyValue)
        .text(line);
    });
  }

  /**
   * 複数行テキストのサイズを測定
   */
  private measureMultilineText(text: string, maxWidth: number): { width: number; height: number; lines: number } {
    const fontSize = 14;
    const lineHeight = fontSize * 1.2;
    const charWidth = fontSize * 1.0; // 日本語対応で幅を広く
    
    // 改行文字で分割
    const paragraphs = text.split(/\n/);
    const allLines: string[] = [];
    let actualWidth = 0;
    
    // 各段落をワードラップ
    paragraphs.forEach(paragraph => {
      if (paragraph.trim() === '') {
        allLines.push(''); // 空行を保持
        return;
      }
      
      // 段落がmaxWidth以内に収まる場合はそのまま追加
      const paragraphWidth = paragraph.length * charWidth;
      if (paragraphWidth <= maxWidth) {
        allLines.push(paragraph);
        actualWidth = Math.max(actualWidth, paragraphWidth);
        return;
      }
      
      const words = paragraph.split(/\s+/);
      let currentLine = '';
      
      words.forEach(word => {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const testWidth = testLine.length * charWidth;
        
        if (testWidth <= maxWidth) {
          currentLine = testLine;
        } else {
          if (currentLine) {
            allLines.push(currentLine);
            actualWidth = Math.max(actualWidth, currentLine.length * charWidth);
            currentLine = word;
          } else {
            // 単語が長すぎる場合は強制的に分割
            allLines.push(word);
            actualWidth = Math.max(actualWidth, Math.min(word.length * charWidth, maxWidth));
          }
        }
      });
      
      if (currentLine) {
        allLines.push(currentLine);
        actualWidth = Math.max(actualWidth, currentLine.length * charWidth);
      }
    });
    
    // 正確な行数計算（renderMultilineTextと同じロジック）
    const hasExplicitLineBreaks = text.includes('\n');
    const finalLines = hasExplicitLineBreaks ? allLines.length : allLines.length;
    const textHeight = finalLines * lineHeight;
    console.log('measureMultilineText:', { text: text.substring(0, 20) + '...', allLines: allLines.length, finalLines, textHeight });
    
    return {
      width: actualWidth,
      height: textHeight,
      lines: finalLines
    };
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