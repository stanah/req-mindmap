/**
 * マインドマップコアロジックインターフェース
 * プラットフォーム非依存のデータ管理・操作機能を定義
 * 
 * このインターフェースは描画機能から完全に分離されており、
 * VSCodeとWebアプリケーションの両方で共有可能な
 * ビジネスロジック機能のみを提供する
 */

import type { 
  MindmapData, 
  MindmapNode, 
  MindmapSettings
} from '../types';

/**
 * イベント型定義
 */
export type CoreLogicEvent = 
  | 'dataChanged'
  | 'nodeAdded'
  | 'nodeUpdated' 
  | 'nodeRemoved'
  | 'nodeMoved'
  | 'nodeSelected'
  | 'nodeDeselected'
  | 'nodeCollapsed'
  | 'nodeExpanded'
  | 'settingsChanged'
  | 'undoStackChanged'
  | 'redoStackChanged';

/**
 * イベントハンドラー関数型
 */
export type EventHandler<T = any> = (data: T) => void;

/**
 * 検索オプション
 */
export interface SearchOptions {
  searchInDescription?: boolean;
  searchInMetadata?: boolean;
  caseSensitive?: boolean;
  useRegex?: boolean;
}

/**
 * フィルタリング条件
 */
export interface FilterCondition {
  priority?: string | string[];
  status?: string | string[];
  tags?: string | string[];
  customFields?: Record<string, any>;
}

/**
 * Undo/Redoで管理されるコマンド
 */
export interface Command {
  type: string;
  execute(): void;
  undo(): void;
  redo?(): void;
}

/**
 * バッチ更新コールバック
 */
export type BatchUpdateCallback = () => void;

/**
 * マインドマップコアロジックインターフェース
 * プラットフォーム非依存のデータ管理・操作機能を提供
 */
export interface ICoreLogic {
  // ==========================================
  // データ管理機能
  // ==========================================
  
  /**
   * マインドマップデータを設定
   * @param data マインドマップデータ
   * @throws データが無効な場合
   */
  setData(data: MindmapData): void;
  
  /**
   * 現在のマインドマップデータを取得
   * @returns 現在のデータ
   */
  getData(): MindmapData | null;
  
  /**
   * データの検証
   * @param data 検証するデータ
   * @returns 検証結果
   */
  validateData(data: MindmapData): { valid: boolean; errors: string[] };

  // ==========================================
  // ノードCRUD操作機能
  // ==========================================
  
  /**
   * ノードをIDで取得
   * @param nodeId ノードID
   * @returns ノード（存在しない場合はnull）
   */
  getNode(nodeId: string): MindmapNode | null;
  
  /**
   * 新しいノードを追加
   * @param parentId 親ノードのID
   * @param node 追加するノード
   */
  addNode(parentId: string, node: MindmapNode): void;
  
  /**
   * ノードを更新
   * @param nodeId ノードID
   * @param changes 変更内容
   */
  updateNode(nodeId: string, changes: Partial<MindmapNode>): void;
  
  /**
   * ノードを削除
   * @param nodeId ノードID
   */
  removeNode(nodeId: string): void;

  // ==========================================
  // ツリー構造操作機能
  // ==========================================
  
  /**
   * ノードを別の親に移動
   * @param nodeId 移動するノードのID
   * @param newParentId 新しい親ノードのID
   * @throws 循環参照が発生する場合
   */
  moveNode(nodeId: string, newParentId: string): void;
  
  /**
   * ノードの順序を変更
   * @param parentId 親ノードのID
   * @param newOrder 新しい順序（子ノードIDの配列）
   */
  reorderNodes(parentId: string, newOrder: string[]): void;

  // ==========================================
  // ノード状態管理機能  
  // ==========================================
  
  /**
   * ノードを選択
   * @param nodeId ノードID（nullで選択解除）
   * @param addToSelection マルチセレクトモードでの追加選択
   */
  selectNode(nodeId: string | null, addToSelection?: boolean): void;
  
  /**
   * 現在選択中のノードIDを取得
   * @returns 選択中ノードID（未選択の場合null）
   */
  getSelectedNodeId(): string | null;
  
  /**
   * 選択中の全ノードIDを取得（マルチセレクト対応）
   * @returns 選択中ノードIDの配列
   */
  getSelectedNodeIds(): string[];
  
  /**
   * マルチセレクトモードの設定
   * @param enabled 有効/無効
   */
  setMultiSelectMode(enabled: boolean): void;
  
  /**
   * ノードの折りたたみ状態を切り替え
   * @param nodeId ノードID
   */
  toggleNodeCollapse(nodeId: string): void;
  
  /**
   * ノードが折りたたまれているかを確認
   * @param nodeId ノードID
   * @returns 折りたたみ状態
   */
  isNodeCollapsed(nodeId: string): boolean;

  // ==========================================
  // Undo/Redo機能
  // ==========================================
  
  /**
   * 最後の操作をUndo
   */
  undo(): void;
  
  /**
   * Undoした操作をRedo
   */
  redo(): void;
  
  /**
   * Undoが可能かを判定
   * @returns Undo可能性
   */
  canUndo(): boolean;
  
  /**
   * Redoが可能かを判定
   * @returns Redo可能性
   */
  canRedo(): boolean;
  
  /**
   * Undo履歴の上限設定
   * @param limit 上限値
   */
  setUndoHistoryLimit(limit: number): void;
  
  /**
   * Undo/Redo履歴をクリア
   */
  clearUndoRedoHistory(): void;

  // ==========================================
  // イベントシステム機能
  // ==========================================
  
  /**
   * イベントリスナーを登録
   * @param event イベント名
   * @param handler ハンドラー関数
   */
  on(event: CoreLogicEvent, handler: EventHandler): void;
  
  /**
   * イベントリスナーを削除
   * @param event イベント名
   * @param handler ハンドラー関数
   */
  off(event: CoreLogicEvent, handler: EventHandler): void;
  
  /**
   * 一度だけ実行されるイベントリスナーを登録
   * @param event イベント名  
   * @param handler ハンドラー関数
   */
  once(event: CoreLogicEvent, handler: EventHandler): void;
  
  /**
   * すべてのイベントリスナーを削除
   */
  removeAllListeners(): void;
  
  /**
   * イベントを発火
   * @param event イベント名
   * @param data イベントデータ
   */
  emit(event: CoreLogicEvent, data?: any): void;

  // ==========================================
  // 検索・フィルタリング機能
  // ==========================================
  
  /**
   * ノードを検索
   * @param query 検索クエリ
   * @param options 検索オプション
   * @returns 検索結果
   */
  searchNodes(query: string, options?: SearchOptions): MindmapNode[];
  
  /**
   * ノードをフィルタリング
   * @param condition フィルタ条件
   * @returns フィルタ結果
   */
  filterNodes(condition: FilterCondition): MindmapNode[];

  // ==========================================
  // 設定管理機能
  // ==========================================
  
  /**
   * 設定を更新
   * @param newSettings 新しい設定
   * @throws 無効な設定値の場合
   */
  updateSettings(newSettings: Partial<MindmapSettings>): void;
  
  /**
   * 現在の設定を取得
   * @returns 現在の設定
   */
  getSettings(): MindmapSettings;

  // ==========================================
  // パフォーマンス最適化機能
  // ==========================================
  
  /**
   * バッチ更新の実行
   * 複数の操作を1つのUndoコマンドとしてまとめ、イベント発火を最適化
   * @param callback バッチ処理のコールバック
   */
  batchUpdate(callback: BatchUpdateCallback): void;
  
  /**
   * インデックスの再構築
   * 検索パフォーマンス向上のための内部インデックス再構築
   */
  rebuildIndex(): void;

  // ==========================================
  // メモリ管理・クリーンアップ機能
  // ==========================================
  
  /**
   * インスタンスの破棄とクリーンアップ
   * イベントリスナーやタイマーなどのリソースを解放
   */
  destroy(): void;
  
  /**
   * メモリ使用量の統計を取得
   * @returns メモリ統計（ノード数、イベントリスナー数など）
   */
  getMemoryStats(): {
    nodeCount: number;
    eventListenerCount: number;
    undoStackSize: number;
    redoStackSize: number;
  };
}