/**
 * マインドマップ描画エンジン
 * プラットフォーム非依存のD3.js描画機能を提供
 * MindmapCoreLogicと連携してデータ管理とレンダリングを分離
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
 * マインドマップ描画専用クラス
 * データ管理機能を排除し、純粋な描画機能のみを提供
 */
export class MindmapRenderer {
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

    // 右クリック（コンテキストメニュー）のデフォルト動作を無効化
    this.svg.on('contextmenu', (event) => {
      event.preventDefault();
      event.stopPropagation();
    });

    // 描画グループの作成
    this.container.append('g').attr('class', 'mindmap-links');
    this.container.append('g').attr('class', 'mindmap-nodes');
  }

  /**
   * データの描画
   * 外部からマインドマップデータを受け取って描画
   */
  public render(data: MindmapData, collapsedNodes?: Set<string>): void {
    if (!data || !data.root) {
      console.warn('描画データが無効です');
      return;
    }

    // カスタムスキーマの設定
    this.customSchema = data.schema || null;

    // D3.js階層データの作成（折りたたみ状態を考慮）
    this.root = d3.hierarchy(data.root, (d: MindmapNode) => {
      // 折りたたまれたノードの子は表示しない
      const isCollapsed = collapsedNodes?.has(d.id) || d.collapsed;
      return isCollapsed ? null : d.children;
    }) as D3Node;

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
   * 設定を更新
   */
  public updateSettings(newSettings: Partial<MindmapSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
    
    // データが存在し、かつコンテナが有効な場合のみレイアウトと描画を実行
    if (this.root && this.container) {
      try {
        this.applyLayout();
        this.draw();
      } catch (error) {
        console.warn('設定更新中の描画でエラーが発生しました:', error);
      }
    }
  }

  /**
   * 現在の設定を取得
   */
  public getSettings(): MindmapSettings {
    return { ...this.settings };
  }

  /**
   * ノードの選択表示
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
   * ノードにフォーカス
   */
  public focusNode(nodeId: string): void {
    console.log('focusNode called with:', nodeId);
    // TODO: 実装
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

  // =============================================
  // 以下、元のMindmapCoreから移行した描画メソッド
  // =============================================

  private calculateNodeSizes(node: D3Node): void {
    const maxWidth = this.settings.maxNodeWidth || 200;
    
    const textMeasurement = this.measureMultilineText(node.data.title, maxWidth - this.NODE_PADDING * 2);
    
    node.width = maxWidth;
    node.height = Math.max(textMeasurement.height + this.NODE_PADDING * 2, this.NODE_HEIGHT);

    if (node.children) {
      node.children.forEach(child => this.calculateNodeSizes(child));
    }
  }

  private applyLayout(): void {
    if (!this.root) return;

    const layout = this.settings.layout || 'tree';

    if (layout === 'tree') {
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

  private calculateDynamicLevelSpacing(root: D3Node): number {
    const maxWidthPerLevel: number[] = [];
    
    root.each((node: D3Node) => {
      const depth = node.depth || 0;
      const width = node.width || this.NODE_WIDTH;
      maxWidthPerLevel[depth] = Math.max(maxWidthPerLevel[depth] || 0, width);
    });
    
    const maxWidth = Math.max(...maxWidthPerLevel);
    const dynamicSpacing = Math.max(this.LEVEL_SPACING, maxWidth + 50);
    
    return dynamicSpacing;
  }

  private calculateDynamicSeparation(nodeA: D3Node, nodeB: D3Node): number {
    return 1;
  }

  private applyRadialLayout(): void {
    if (!this.root) return;

    const cluster = d3.cluster<MindmapNode>()
      .size([2 * Math.PI, 200])
      .separation((a, b) => {
        return this.calculateRadialSeparation(a as D3Node, b as D3Node);
      });

    cluster(this.root);

    this.root.each((node: D3Node) => {
      const angle = node.x as number;
      const radius = node.y as number;
      node.x = Math.cos(angle) * radius;
      node.y = Math.sin(angle) * radius;
    });
  }

  private calculateRadialSeparation(nodeA: D3Node, nodeB: D3Node): number {
    const baseSeparation = nodeA.parent === nodeB.parent ? 1 : 2;
    const depth = Math.max(nodeA.depth || 1, nodeB.depth || 1);
    const radialFactor = baseSeparation / depth;
    
    const aWidth = nodeA.width || this.NODE_WIDTH;
    const bWidth = nodeB.width || this.NODE_WIDTH;
    const maxWidth = Math.max(aWidth, bWidth);
    const sizeFactor = Math.min(maxWidth / this.NODE_WIDTH, 1.5);
    
    const spacingFactor = this.settings.verticalSpacing || 1.0;
    
    return Math.max(0.3, radialFactor * sizeFactor * spacingFactor);
  }

  private draw(): void {
    if (!this.root) return;

    const nodes = this.root.descendants();
    const links = this.root.links();

    this.drawLinks(links);
    this.drawNodes(nodes);
  }

  private drawLinks(links: d3.HierarchyLink<MindmapNode>[]): void {
    const linkSelection = this.container.select('.mindmap-links')
      .selectAll<SVGPathElement, d3.HierarchyLink<MindmapNode>>('.mindmap-link')
      .data(links, (d: d3.HierarchyLink<MindmapNode>) => 
        `${d.source.data.id}-${d.target.data.id}`
      );

    const linkEnter = linkSelection
      .enter()
      .append('path')
      .attr('class', 'mindmap-link')
      .attr('fill', 'none')
      .attr('stroke', '#ccc')
      .attr('stroke-width', 2);

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

    linkSelection.exit().remove();
  }

  private drawNodes(nodes: D3Node[]): void {
    const nodeSelection = this.container.select('.mindmap-nodes')
      .selectAll<SVGGElement, D3Node>('.mindmap-node')
      .data(nodes, (d: D3Node) => d.data.id);

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
      .on('contextmenu', (event, d) => {
        // 右クリックのデフォルト動作（コンテキストメニュー）を無効化
        event.preventDefault();
        event.stopPropagation();
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

    nodeEnter
      .append('rect')
      .attr('class', 'mindmap-node-rect')
      .attr('rx', 8)
      .attr('ry', 8)
      .attr('stroke', '#e0e0e0')
      .attr('stroke-width', 1)
      .attr('fill', '#fff');

    nodeEnter
      .append('text')
      .attr('class', 'mindmap-node-text')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'central')
      .attr('font-size', '14px')
      .attr('fill', '#333');

    const nodeUpdate = nodeEnter.merge(nodeSelection);

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

    nodeUpdate.select('.mindmap-node-rect')
      .attr('width', (d: D3Node) => d.width)
      .attr('height', (d: D3Node) => d.height)
      .attr('x', (d: D3Node) => -d.width / 2)
      .attr('y', (d: D3Node) => -d.height / 2)
      .attr('fill', (d: D3Node) => this.getNodeColor(d.data))
      .attr('stroke', (d: D3Node) => this.getPriorityBorderColor(d.data))
      .attr('stroke-width', (d: D3Node) => this.getPriorityBorderWidth(d.data));

    nodeUpdate.select('.mindmap-node-text')
      .each((d: D3Node, i, nodes) => {
        const textElement = d3.select(nodes[i] as SVGTextElement);
        
        const actualLines = this.countActualLines(d.data.title, d.width - this.NODE_PADDING * 2);
        const requiredHeight = actualLines * 16.8 + this.NODE_PADDING * 2;
        if (requiredHeight > d.height) {
          d.height = requiredHeight;
          nodeUpdate.filter((nd: D3Node) => nd === d)
            .select('.mindmap-node-rect')
            .attr('height', d.height)
            .attr('y', -d.height / 2);
        }
        
        this.renderMultilineText(textElement, d.data.title, d.width - this.NODE_PADDING * 2, d.height - this.NODE_PADDING * 2);
      });

    this.drawPriorityBadges(nodeUpdate as any);
    this.drawStatusBadges(nodeUpdate as any);

    nodeSelection.exit().remove();
  }

  // =============================================
  // ノード装飾メソッド（元のコードから移行）
  // =============================================

  private getNodeColor(node: MindmapNode): string {
    if (node.color) {
      return node.color;
    }

    const theme = this.settings.theme || 'light';
    const baseColor = theme === 'dark' ? '#2d2d2d' : '#ffffff';
    
    const priority = node.priority;
    if (priority && theme === 'light') {
      switch (priority) {
        case 'critical': return '#fef2f2';
        case 'high': return '#fef2f2';
        case 'medium': return '#fffbeb';
        case 'low': return '#f0fdf4';
      }
    } else if (priority && theme === 'dark') {
      switch (priority) {
        case 'critical': return '#4f1f1f';
        case 'high': return '#3f1f1f';
        case 'medium': return '#3f2f1f';
        case 'low': return '#1f3f2f';
      }
    }
    
    return baseColor;
  }

  private getPriorityBorderColor(node: MindmapNode): string {
    const priority = node.priority;
    
    switch (priority) {
      case 'critical': return '#dc2626';
      case 'high': return '#ef4444';
      case 'medium': return '#f59e0b';
      case 'low': return '#10b981';
      default: return '#e0e0e0';
    }
  }

  private getPriorityBorderWidth(node: MindmapNode): number {
    const priority = node.priority;
    
    switch (priority) {
      case 'critical': return 4;
      case 'high': return 3;
      case 'medium': return 2;
      case 'low': return 1;
      default: return 1;
    }
  }

  private getPriorityBadgeInfo(node: MindmapNode): { text: string; color: string; bgColor: string } | null {
    const priority = node.priority;
    
    switch (priority) {
      case 'critical': return { text: 'CRITICAL', color: '#ffffff', bgColor: '#dc2626' };
      case 'high': return { text: 'HIGH', color: '#ffffff', bgColor: '#ef4444' };
      case 'medium': return { text: 'MEDIUM', color: '#ffffff', bgColor: '#f59e0b' };
      case 'low': return { text: 'LOW', color: '#ffffff', bgColor: '#10b981' };
      default: return null;
    }
  }

  private getStatusBadgeInfo(node: MindmapNode): { text: string; color: string; bgColor: string } | null {
    const status = node.status;
    
    switch (status) {
      case 'draft': return { text: 'DRAFT', color: '#ffffff', bgColor: '#9ca3af' };
      case 'pending': return { text: 'PENDING', color: '#ffffff', bgColor: '#6b7280' };
      case 'in-progress': return { text: 'WORKING', color: '#ffffff', bgColor: '#3b82f6' };
      case 'review': return { text: 'REVIEW', color: '#ffffff', bgColor: '#f59e0b' };
      case 'done': return { text: 'DONE', color: '#ffffff', bgColor: '#10b981' };
      case 'cancelled': return { text: 'CANCELLED', color: '#ffffff', bgColor: '#ef4444' };
      case 'deferred': return { text: 'DEFERRED', color: '#ffffff', bgColor: '#8b5cf6' };
      default: return null;
    }
  }

  private drawPriorityBadges(nodeUpdate: d3.Selection<SVGGElement, D3Node, SVGGElement, unknown>): void {
    nodeUpdate.selectAll('.priority-badge').remove();

    nodeUpdate.each((d: D3Node, i, nodes) => {
      const badgeInfo = this.getPriorityBadgeInfo(d.data);
      if (!badgeInfo) return;

      const nodeGroup = d3.select(nodes[i] as SVGGElement);
      const badgeHeight = 16;
      const badgeWidth = badgeInfo.text.length * 6 + 8;
      const badgeX = d.width / 2 - badgeWidth - 4;
      const badgeY = -d.height / 2 - 8;

      const badgeGroup = nodeGroup
        .append('g')
        .attr('class', 'priority-badge')
        .attr('transform', `translate(${badgeX}, ${badgeY})`);

      badgeGroup
        .append('rect')
        .attr('width', badgeWidth)
        .attr('height', badgeHeight)
        .attr('rx', 3)
        .attr('ry', 3)
        .attr('fill', badgeInfo.bgColor)
        .attr('stroke', '#ffffff')
        .attr('stroke-width', 1);

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

  private drawStatusBadges(nodeUpdate: d3.Selection<SVGGElement, D3Node, SVGGElement, unknown>): void {
    nodeUpdate.selectAll('.status-badge').remove();

    nodeUpdate.each((d: D3Node, i, nodes) => {
      const badgeInfo = this.getStatusBadgeInfo(d.data);
      if (!badgeInfo) return;

      const nodeGroup = d3.select(nodes[i] as SVGGElement);
      
      const priorityBadgeInfo = this.getPriorityBadgeInfo(d.data);
      const priorityBadgeWidth = priorityBadgeInfo ? priorityBadgeInfo.text.length * 6 + 8 : 0;
      
      const badgeHeight = 16;
      const badgeWidth = badgeInfo.text.length * 6 + 8;
      const badgeX = d.width / 2 - badgeWidth - priorityBadgeWidth - 8;
      const badgeY = -d.height / 2 - 8;

      const badgeGroup = nodeGroup
        .append('g')
        .attr('class', 'status-badge')
        .attr('transform', `translate(${badgeX}, ${badgeY})`);

      badgeGroup
        .append('rect')
        .attr('width', badgeWidth)
        .attr('height', badgeHeight)
        .attr('rx', 3)
        .attr('ry', 3)
        .attr('fill', badgeInfo.bgColor)
        .attr('stroke', '#ffffff')
        .attr('stroke-width', 1);

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

  // =============================================
  // テキスト描画メソッド（元のコードから移行）
  // =============================================

  private countActualLines(text: string, maxWidth: number): number {
    const fontSize = 14;
    const charWidth = fontSize * 1.0;
    
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

  private renderMultilineText(textElement: d3.Selection<SVGTextElement, unknown, null, undefined>, text: string, maxWidth: number, maxHeight: number): void {
    textElement.selectAll('tspan').remove();
    
    const fontSize = 14;
    const lineHeight = fontSize * 1.2;
    const charWidth = fontSize * 1.0;
    
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
    
    const hasExplicitLineBreaks = text.includes('\n');
    const maxLines = hasExplicitLineBreaks 
      ? allLines.length
      : Math.floor(maxHeight / lineHeight);
    
    const displayLines = allLines.slice(0, maxLines);
    
    if (!hasExplicitLineBreaks && allLines.length > maxLines && maxLines > 0) {
      if (displayLines.length > 0) {
        const lastLine = displayLines[displayLines.length - 1];
        displayLines[displayLines.length - 1] = lastLine.substring(0, Math.max(0, lastLine.length - 3)) + '...';
      }
    }
    
    const startY = -(displayLines.length - 1) * lineHeight / 2;
    
    displayLines.forEach((line, index) => {
      const dyValue = index === 0 ? startY : lineHeight;
      
      textElement
        .append('tspan')
        .attr('x', 0)
        .attr('dy', dyValue)
        .text(line);
    });
  }

  private measureMultilineText(text: string, maxWidth: number): { width: number; height: number; lines: number } {
    const fontSize = 14;
    const lineHeight = fontSize * 1.2;
    const charWidth = fontSize * 1.0;
    
    const paragraphs = text.split(/\n/);
    const allLines: string[] = [];
    let actualWidth = 0;
    
    paragraphs.forEach(paragraph => {
      if (paragraph.trim() === '') {
        allLines.push('');
        return;
      }
      
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
    
    const hasExplicitLineBreaks = text.includes('\n');
    const finalLines = hasExplicitLineBreaks ? allLines.length : allLines.length;
    const textHeight = finalLines * lineHeight;
    
    return {
      width: actualWidth,
      height: textHeight,
      lines: finalLines
    };
  }
}