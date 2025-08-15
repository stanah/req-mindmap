/**
 * マインドマップ統合コアクラス
 * MindmapCoreLogic（データ管理）とMindmapRenderer（描画）を統合
 * 既存のAPIとの互換性を保ちながら、責務分離されたアーキテクチャを提供
 */

import { MindmapCoreLogic } from './logic/MindmapCoreLogic';
import { MindmapRenderer } from './renderer/MindmapRenderer';
import type { ICoreLogic } from './logic/ICoreLogic';
import type {
  MindmapData,
  MindmapNode,
  MindmapSettings,
  RenderOptions
} from './types';

/**
 * マインドマップコアクラス
 * データ管理（MindmapCoreLogic）と描画（MindmapRenderer）を統合し、
 * 従来のAPIとの互換性を保持
 */
export class MindmapCore {
  private coreLogic: ICoreLogic;
  private renderer: MindmapRenderer;
  private isDestroyed: boolean = false;

  constructor(options: RenderOptions) {
    // コアロジックの初期化
    this.coreLogic = new MindmapCoreLogic();
    
    // 描画エンジンの初期化
    this.renderer = new MindmapRenderer(options);
    
    // コアロジックの変更を描画に反映
    this.setupDataSync();
  }

  /**
   * データ同期の設定
   * MindmapCoreLogicの変更をMindmapRendererに自動反映
   */
  private setupDataSync(): void {
    // データ変更時の再描画
    this.coreLogic.on('dataChanged', () => {
      this.renderCurrentData();
    });
    
    // 設定変更時の再描画
    this.coreLogic.on('settingsChanged', (settings) => {
      // レンダラーの設定を更新（データがなくても安全）
      this.renderer.updateSettings(settings);
      // データがある場合のみ再描画
      if (this.coreLogic.getData()) {
        this.renderCurrentData();
      }
    });
    
    // ノード選択の同期
    this.coreLogic.on('nodeSelected', (nodeId) => {
      this.renderer.selectNode(nodeId);
    });
    
    this.coreLogic.on('nodeDeselected', () => {
      this.renderer.selectNode(null);
    });
    
    // ノード状態変更時の再描画
    this.coreLogic.on('nodeCollapsed', () => {
      this.renderCurrentData();
    });
    
    this.coreLogic.on('nodeExpanded', () => {
      this.renderCurrentData();
    });
  }

  /**
   * 現在のデータを描画
   */
  private renderCurrentData(): void {
    const data = this.coreLogic.getData();
    if (data) {
      // 折りたたまれたノードの情報を取得
      const collapsedNodes = new Set<string>();
      const nodeIds = this.getAllNodeIds(data.root);
      nodeIds.forEach(nodeId => {
        if (this.coreLogic.isNodeCollapsed(nodeId)) {
          collapsedNodes.add(nodeId);
        }
      });
      
      this.renderer.render(data, collapsedNodes);
    }
  }

  /**
   * 全ノードIDを取得（再帰的）
   */
  private getAllNodeIds(node: MindmapNode): string[] {
    const ids = [node.id];
    if (node.children) {
      node.children.forEach(child => {
        ids.push(...this.getAllNodeIds(child));
      });
    }
    return ids;
  }

  // ==========================================
  // 公開API - データ管理系（MindmapCoreLogicに委譲）
  // ==========================================

  /**
   * データの描画（従来のAPIとの互換性維持）
   */
  public render(data: MindmapData): void {
    this.checkNotDestroyed();
    this.coreLogic.setData(data);
    // setDataによってdataChangedイベントが発火され、自動的に描画される
  }

  /**
   * 現在のデータを取得
   */
  public getData(): MindmapData | null {
    return this.coreLogic.getData();
  }

  /**
   * ノードを取得
   */
  public getNode(nodeId: string): MindmapNode | null {
    return this.coreLogic.getNode(nodeId);
  }

  /**
   * ノードを追加
   */
  public addNode(parentId: string, node: MindmapNode): void {
    this.checkNotDestroyed();
    this.coreLogic.addNode(parentId, node);
  }

  /**
   * ノードを更新
   */
  public updateNode(nodeId: string, changes: Partial<MindmapNode>): void {
    this.checkNotDestroyed();
    this.coreLogic.updateNode(nodeId, changes);
  }

  /**
   * ノードを削除
   */
  public removeNode(nodeId: string): void {
    this.checkNotDestroyed();
    this.coreLogic.removeNode(nodeId);
  }

  /**
   * ノードを移動
   */
  public moveNode(nodeId: string, newParentId: string): void {
    this.checkNotDestroyed();
    this.coreLogic.moveNode(nodeId, newParentId);
  }

  // ==========================================
  // 公開API - ノード状態管理系（MindmapCoreLogicに委譲）
  // ==========================================

  /**
   * ノードの選択
   */
  public selectNode(nodeId: string | null): void {
    this.checkNotDestroyed();
    this.coreLogic.selectNode(nodeId);
  }

  /**
   * 選択中のノードIDを取得
   */
  public getSelectedNodeId(): string | null {
    return this.coreLogic.getSelectedNodeId();
  }

  /**
   * ノードの折りたたみ切り替え（従来のAPIとの互換性維持）
   */
  public toggleNode(nodeId: string): void {
    this.checkNotDestroyed();
    this.coreLogic.toggleNodeCollapse(nodeId);
  }

  /**
   * ノードが折りたたまれているかを確認
   */
  public isNodeCollapsed(nodeId: string): boolean {
    return this.coreLogic.isNodeCollapsed(nodeId);
  }

  // ==========================================
  // 公開API - Undo/Redo系（MindmapCoreLogicに委譲）
  // ==========================================

  /**
   * Undo操作
   */
  public undo(): void {
    this.checkNotDestroyed();
    this.coreLogic.undo();
  }

  /**
   * Redo操作
   */
  public redo(): void {
    this.checkNotDestroyed();
    this.coreLogic.redo();
  }

  /**
   * Undoが可能かを判定
   */
  public canUndo(): boolean {
    return this.coreLogic.canUndo();
  }

  /**
   * Redoが可能かを判定
   */
  public canRedo(): boolean {
    return this.coreLogic.canRedo();
  }

  // ==========================================
  // 公開API - 検索・フィルタリング系（MindmapCoreLogicに委譲）
  // ==========================================

  /**
   * ノードを検索
   */
  public searchNodes(query: string, options?: any): MindmapNode[] {
    return this.coreLogic.searchNodes(query, options);
  }

  /**
   * ノードをフィルタリング
   */
  public filterNodes(condition: any): MindmapNode[] {
    return this.coreLogic.filterNodes(condition);
  }

  // ==========================================
  // 公開API - 設定管理系（両方に委譲）
  // ==========================================

  /**
   * 設定の更新
   */
  public updateSettings(newSettings: Partial<MindmapSettings>): void {
    this.checkNotDestroyed();
    
    // コアロジックの設定を更新（これによりsettingsChangedイベントが発火）
    this.coreLogic.updateSettings(newSettings);
  }

  /**
   * 現在の設定を取得
   */
  public getSettings(): MindmapSettings {
    return this.coreLogic.getSettings();
  }

  // ==========================================
  // 公開API - 描画系（MindmapRendererに委譲）
  // ==========================================

  /**
   * ビューのリセット
   */
  public resetView(): void {
    this.checkNotDestroyed();
    this.renderer.resetView();
  }

  /**
   * ズームイン
   */
  public zoomIn(): void {
    this.checkNotDestroyed();
    this.renderer.zoomIn();
  }

  /**
   * ズームアウト
   */
  public zoomOut(): void {
    this.checkNotDestroyed();
    this.renderer.zoomOut();
  }

  /**
   * ノードにフォーカス
   */
  public focusNode(nodeId: string): void {
    this.checkNotDestroyed();
    this.renderer.focusNode(nodeId);
  }

  // ==========================================
  // 公開API - イベント系（MindmapCoreLogicに委譲）
  // ==========================================

  /**
   * イベントリスナーを登録
   */
  public on(event: string, handler: any): void {
    this.coreLogic.on(event as any, handler);
  }

  /**
   * イベントリスナーを削除
   */
  public off(event: string, handler: any): void {
    this.coreLogic.off(event as any, handler);
  }

  /**
   * 一度だけ実行されるイベントリスナーを登録
   */
  public once(event: string, handler: any): void {
    this.coreLogic.once(event as any, handler);
  }

  // ==========================================
  // 公開API - パフォーマンス最適化系
  // ==========================================

  /**
   * バッチ更新の実行
   */
  public batchUpdate(callback: () => void): void {
    this.checkNotDestroyed();
    this.coreLogic.batchUpdate(callback);
  }

  // ==========================================
  // 公開API - 従来のAPIとの互換性維持
  // ==========================================

  /**
   * カーソル対応ノードをハイライト（従来のAPIとの互換性維持）
   */
  public highlightCursorNode(nodeId: string | null): void {
    this.checkNotDestroyed();
    // 現在は選択で代用
    if (nodeId) {
      this.selectNode(nodeId);
    }
  }

  /**
   * ビューを中央に配置（従来のAPIとの互換性維持）
   */
  public centerView(): void {
    this.checkNotDestroyed();
    this.resetView();
  }

  /**
   * パフォーマンスモードの設定（従来のAPIとの互換性維持）
   */
  public setPerformanceMode(mode: 'auto' | 'performance' | 'quality'): void {
    console.log('setPerformanceMode called with:', mode);
    // 今後実装予定
  }

  /**
   * パフォーマンス統計のログ出力（従来のAPIとの互換性維持）
   */
  public logPerformanceStats(): void {
    console.log('Performance stats logging...');
    const memoryStats = this.coreLogic.getMemoryStats();
    console.log('Memory stats:', memoryStats);
  }

  /**
   * メモリ最適化（従来のAPIとの互換性維持）
   */
  public optimizeMemory(): void {
    console.log('Memory optimization...');
    // 必要に応じてインデックス再構築
    this.coreLogic.rebuildIndex();
  }

  /**
   * パフォーマンス統計の取得（従来のAPIとの互換性維持）
   */
  public getPerformanceStats(): any {
    const memoryStats = this.coreLogic.getMemoryStats();
    return {
      currentSettings: {
        enableVirtualization: true
      },
      memoryStats
    };
  }

  /**
   * 仮想化の有効/無効切り替え（従来のAPIとの互換性維持）
   */
  public setVirtualizationEnabled(enabled: boolean): void {
    console.log('setVirtualizationEnabled called with:', enabled);
    // 今後実装予定
  }

  // ==========================================
  // ライフサイクル管理
  // ==========================================

  /**
   * 破棄処理
   */
  public destroy(): void {
    if (this.isDestroyed) {
      return;
    }
    
    this.isDestroyed = true;
    
    // コアロジックの破棄
    this.coreLogic.destroy();
    
    // 描画エンジンの破棄
    this.renderer.destroy();
  }

  /**
   * メモリ統計の取得
   */
  public getMemoryStats(): any {
    return this.coreLogic.getMemoryStats();
  }

  /**
   * 破棄チェック
   */
  private checkNotDestroyed(): void {
    if (this.isDestroyed) {
      throw new Error('MindmapCore instance has been destroyed');
    }
  }
}