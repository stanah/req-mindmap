/**
 * D3.jsを使用したマインドマップ描画エンジン
 * 
 * SVGベースのマインドマップ描画機能を提供します。
 * 階層構造に基づくレイアウトアルゴリズムとノード・リンクの描画を実装。
 */

import * as d3 from 'd3';
import { MindmapData, MindmapNode, MindmapSettings, CustomSchema, DisplayRule } from '../types/mindmap';

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
  private svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;
  private container: d3.Selection<SVGGElement, unknown, null, undefined>;
  private zoom: d3.ZoomBehavior<SVGSVGElement, unknown>;
  private root: D3Node | null = null;
  private settings: MindmapSettings;
  private eventHandlers: RendererEventHandlers = {};
  private customSchema: CustomSchema | null = null;

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

    this.initializeSVG(svgElement);
  }

  /**
   * SVGの初期化
   */
  private initializeSVG(svgElement: SVGSVGElement): void {
    this.svg = d3.select(svgElement);
    
    // 既存の内容をクリア
    this.svg.selectAll('*').remove();

    // ズーム機能の設定
    this.zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 3])
      .on('zoom', (event) => {
        this.container.attr('transform', event.transform);
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
    if (!data.root) {
      console.warn('マインドマップデータにルートノードがありません');
      return;
    }

    // カスタムスキーマの設定
    this.customSchema = data.schema || null;

    // 階層データの作成
    const hierarchy = d3.hierarchy(data.root);
    
    // ノードサイズの計算
    hierarchy.each((node: D3Node) => {
      const nodeData = node.data;
      const textLength = this.calculateTextWidth(nodeData.title);
      const badgeHeight = this.calculateBadgeHeight(nodeData);
      
      node.width = Math.min(Math.max(textLength + this.NODE_PADDING * 2, this.NODE_WIDTH), this.settings.maxNodeWidth || 200);
      node.height = this.NODE_HEIGHT + badgeHeight;
      
      // 折りたたみ状態の初期化
      if (nodeData.collapsed && node.children) {
        node._children = node.children;
        node.children = null;
      }
    });

    // レイアウトの適用
    this.root = this.applyLayout(hierarchy as D3Node);

    // 描画の実行
    this.draw();

    // 初期ビューの設定
    this.centerView();
  }

  /**
   * レイアウトアルゴリズムの適用
   */
  private applyLayout(hierarchy: D3Node): D3Node {
    let layout: d3.TreeLayout<MindmapNode> | d3.ClusterLayout<MindmapNode>;

    switch (this.settings.layout) {
      case 'radial':
        // 放射状レイアウト（将来実装）
        layout = d3.tree<MindmapNode>()
          .size([2 * Math.PI, Math.min(400, 300)])
          .separation((a, b) => (a.parent === b.parent ? 1 : 2) / a.depth);
        break;
      
      case 'tree':
      default:
        // ツリーレイアウト
        layout = d3.tree<MindmapNode>()
          .nodeSize([this.settings.nodeSpacing || this.NODE_SPACING, this.settings.levelSpacing || this.LEVEL_SPACING])
          .separation((a, b) => {
            return a.parent === b.parent ? 1 : 1.2;
          });
        break;
    }

    return layout(hierarchy) as D3Node;
  }

  /**
   * 描画の実行
   */
  private draw(): void {
    if (!this.root) return;

    const nodes = this.root.descendants() as D3Node[];
    const links = this.root.links() as D3Link[];

    // リンクの描画
    this.drawLinks(links);
    
    // ノードの描画
    this.drawNodes(nodes);
  }

  /**
   * リンクの描画
   */
  private drawLinks(links: D3Link[]): void {
    const linkGenerator = d3.linkHorizontal<D3Link, D3Node>()
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
    const badgeContainer = nodeEnter
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
      .filter(d => (d.children && d.children.length > 0) || (d._children && d._children.length > 0))
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
      .attr('y', d => -8)
      .attr('fill', d => this.getNodeTextColor(d.data));

    // テキストの更新と位置調整
    nodeUpdate.select('.mindmap-node-text')
      .attr('x', d => this.getNodeIcon(d.data) ? 8 : 0)
      .attr('y', d => -8)
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
    // 簡易的な計算（実際のフォントメトリクスを使用する場合はより正確）
    return text.length * 8 + 20;
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
      const colorStyle = colorRule.style[fieldValue];
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
      const colorStyle = colorRule.style[fieldValue];
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
      const iconStyle = iconRule.style[fieldValue];
      return iconStyle?.icon || null;
    }

    return null;
  }

  /**
   * バッジ情報を取得
   */
  private getNodeBadges(nodeData: MindmapNode): Array<{text: string, style: any}> {
    if (!this.customSchema || !nodeData.customFields) {
      return [];
    }

    const badgeRules = this.customSchema.displayRules.filter(rule => 
      rule.displayType === 'badge' && nodeData.customFields?.[rule.field]
    );

    return badgeRules.map(rule => {
      const fieldValue = nodeData.customFields![rule.field];
      const badgeStyle = rule.style?.[fieldValue] || {};
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

      badges.forEach((badge, index) => {
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

        // バッジのテキスト
        const badgeText = badgeGroup
          .append('text')
          .attr('class', 'mindmap-badge-text')
          .attr('text-anchor', 'middle')
          .attr('dominant-baseline', 'middle')
          .attr('font-size', '10px')
          .attr('font-weight', '500')
          .attr('fill', badge.style.color || '#374151')
          .attr('pointer-events', 'none')
          .text(badge.text);

        // バッジの幅を計算
        const textWidth = badge.text.length * 6 + 8;
        badgeRect.attr('width', textWidth);

        // バッジの位置を設定
        badgeGroup.attr('transform', `translate(${xOffset + textWidth / 2}, ${d.height / 2 - this.BADGE_HEIGHT / 2 - 2})`);
        badgeRect.attr('x', -textWidth / 2);

        xOffset += textWidth + 4;
      });
    });
  }

  /**
   * ビューを中央に配置
   */
  public centerView(): void {
    if (!this.root) return;

    const svgRect = (this.svg.node() as SVGSVGElement).getBoundingClientRect();
    const bounds = this.container.node()?.getBBox();
    
    if (!bounds) return;

    const centerX = svgRect.width / 2;
    const centerY = svgRect.height / 2;
    
    const scale = Math.min(
      svgRect.width / (bounds.width + 100),
      svgRect.height / (bounds.height + 100),
      1
    );

    const transform = d3.zoomIdentity
      .translate(centerX - bounds.x * scale - bounds.width * scale / 2, 
                centerY - bounds.y * scale - bounds.height * scale / 2)
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
    this.settings = { ...this.settings, ...newSettings };
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
      targetNode.children = null;
      targetNode.data.collapsed = true;
    } else if (targetNode._children) {
      // 折りたたみ状態 → 展開
      targetNode.children = targetNode._children;
      targetNode._children = null;
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
        .selectAll('.mindmap-node')
        .filter((d: any) => d.data.id === nodeId)
        .classed('selected', true);
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
   * リソースのクリーンアップ
   */
  public destroy(): void {
    this.svg.selectAll('*').remove();
    this.svg.on('.zoom', null);
  }
}