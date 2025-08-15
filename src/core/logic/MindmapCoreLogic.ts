/**
 * マインドマップコアロジック実装
 * プラットフォーム非依存のデータ管理・操作機能を提供
 * 
 * このクラスは描画機能から完全に分離されており、
 * VSCodeとWebアプリケーションの両方で共有可能な
 * ビジネスロジック機能のみを実装する
 */

import type { 
  MindmapData, 
  MindmapNode, 
  MindmapSettings
} from '../types';

import type { 
  ICoreLogic, 
  CoreLogicEvent, 
  EventHandler, 
  SearchOptions, 
  FilterCondition, 
  Command, 
  BatchUpdateCallback 
} from './ICoreLogic';

/**
 * Undoコマンド実装
 */
abstract class BaseCommand implements Command {
  abstract type: string;
  abstract execute(): void;
  abstract undo(): void;
  
  redo(): void {
    this.execute();
  }
}

/**
 * ノード更新コマンド
 */
class UpdateNodeCommand extends BaseCommand {
  public readonly type = 'updateNode';
  
  constructor(
    private logic: MindmapCoreLogic,
    private nodeId: string,
    private newData: Partial<MindmapNode>,
    private oldData: Partial<MindmapNode>
  ) {
    super();
  }
  
  execute(): void {
    this.logic.updateNodeInternal(this.nodeId, this.newData, false);
  }
  
  undo(): void {
    this.logic.updateNodeInternal(this.nodeId, this.oldData, false);
  }
}

/**
 * ノード追加コマンド
 */
class AddNodeCommand extends BaseCommand {
  public readonly type = 'addNode';
  
  constructor(
    private logic: MindmapCoreLogic,
    private parentId: string,
    private node: MindmapNode
  ) {
    super();
  }
  
  execute(): void {
    this.logic.addNodeInternal(this.parentId, this.node, false);
  }
  
  undo(): void {
    this.logic.removeNodeInternal(this.node.id, false);
  }
}

/**
 * ノード削除コマンド
 */
class RemoveNodeCommand extends BaseCommand {
  public readonly type = 'removeNode';
  
  constructor(
    private logic: MindmapCoreLogic,
    private nodeId: string,
    private parentId: string,
    private nodeData: MindmapNode,
    private index: number
  ) {
    super();
  }
  
  execute(): void {
    this.logic.removeNodeInternal(this.nodeId, false);
  }
  
  undo(): void {
    this.logic.addNodeAtIndexInternal(this.parentId, this.nodeData, this.index, false);
  }
}

/**
 * マインドマップコアロジック実装クラス
 */
export class MindmapCoreLogic implements ICoreLogic {
  private data: MindmapData | null = null;
  private selectedNodeIds: Set<string> = new Set();
  private collapsedNodes: Set<string> = new Set();
  private multiSelectMode: boolean = false;
  private isDestroyed: boolean = false;
  
  // イベントシステム
  private eventListeners: Map<CoreLogicEvent, Set<EventHandler>> = new Map();
  
  // Undo/Redo システム
  private undoStack: Command[] = [];
  private redoStack: Command[] = [];
  private undoHistoryLimit: number = 50;
  private batchMode: boolean = false;
  private batchCommands: Command[] = [];
  
  // インデックス（検索用）
  private nodeIndex: Map<string, MindmapNode> = new Map();
  private parentIndex: Map<string, string> = new Map(); // nodeId -> parentId
  
  // ==========================================
  // データ管理機能
  // ==========================================
  
  setData(data: MindmapData): void {
    this.checkNotDestroyed();
    
    
    const validation = this.validateData(data);
    if (!validation.valid) {
      throw new Error(`Invalid mindmap data: ${validation.errors.join(', ')}`);
    }
    
    this.data = JSON.parse(JSON.stringify(data)); // ディープクローン
    this.rebuildIndex();
    
    
    this.selectedNodeIds.clear();
    this.collapsedNodes.clear();
    this.clearUndoRedoHistory();
    
    this.emit('dataChanged', this.data);
  }
  
  getData(): MindmapData | null {
    return this.data ? JSON.parse(JSON.stringify(this.data)) : null;
  }
  
  validateData(data: MindmapData): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!data) {
      errors.push('Data is null or undefined');
      return { valid: false, errors };
    }
    
    if (!data.version) {
      errors.push('Missing version');
    }
    
    if (!data.title) {
      errors.push('Missing title');
    }
    
    if (!data.root) {
      errors.push('Missing root node');
      return { valid: false, errors };
    }
    
    // ルートノードの検証
    const nodeErrors = this.validateNode(data.root, 'root');
    errors.push(...nodeErrors);
    
    return { valid: errors.length === 0, errors };
  }
  
  private validateNode(node: MindmapNode, path: string): string[] {
    const errors: string[] = [];
    
    if (!node.id) {
      errors.push(`Node at ${path} is missing id`);
    }
    
    if (!node.title) {
      errors.push(`Node at ${path} is missing title`);
    }
    
    // 子ノードの検証
    if (node.children) {
      node.children.forEach((child, index) => {
        const childErrors = this.validateNode(child, `${path}.children[${index}]`);
        errors.push(...childErrors);
      });
    }
    
    return errors;
  }

  // ==========================================
  // ノードCRUD操作機能
  // ==========================================
  
  getNode(nodeId: string): MindmapNode | null {
    return this.nodeIndex.get(nodeId) || null;
  }
  
  addNode(parentId: string, node: MindmapNode): void {
    this.checkNotDestroyed();
    
    const command = new AddNodeCommand(this, parentId, node);
    this.executeCommand(command);
  }
  
  addNodeInternal(parentId: string, node: MindmapNode, recordCommand: boolean = true): void {
    const parentNode = this.nodeIndex.get(parentId);
    if (!parentNode) {
      throw new Error(`Parent node with id ${parentId} not found`);
    }
    
    if (!parentNode.children) {
      parentNode.children = [];
    }
    
    // IDの重複チェック
    if (this.nodeIndex.has(node.id)) {
      throw new Error(`Node with id ${node.id} already exists`);
    }
    
    parentNode.children.push(node);
    this.addToIndex(node, parentId);
    
    this.emit('nodeAdded', { nodeId: node.id, parentId });
    this.emit('dataChanged', this.data);
  }
  
  addNodeAtIndexInternal(parentId: string, node: MindmapNode, index: number, recordCommand: boolean = true): void {
    const parentNode = this.nodeIndex.get(parentId);
    if (!parentNode) {
      throw new Error(`Parent node with id ${parentId} not found`);
    }
    
    if (!parentNode.children) {
      parentNode.children = [];
    }
    
    parentNode.children.splice(index, 0, node);
    this.addToIndex(node, parentId);
    
    this.emit('nodeAdded', { nodeId: node.id, parentId });
    this.emit('dataChanged', this.data);
  }
  
  updateNode(nodeId: string, changes: Partial<MindmapNode>): void {
    this.checkNotDestroyed();
    
    const currentNode = this.nodeIndex.get(nodeId);
    if (!currentNode) {
      throw new Error(`Node with id ${nodeId} not found`);
    }
    
    // 変更前のデータを保存（Undo用）
    const oldData: Partial<MindmapNode> = {};
    Object.keys(changes).forEach(key => {
      const nodeKey = key as keyof MindmapNode;
      oldData[nodeKey] = currentNode[nodeKey];
    });
    
    const command = new UpdateNodeCommand(this, nodeId, changes, oldData);
    this.executeCommand(command);
  }
  
  updateNodeInternal(nodeId: string, changes: Partial<MindmapNode>, recordCommand: boolean = true): void {
    const node = this.nodeIndex.get(nodeId);
    if (!node) {
      throw new Error(`Node with id ${nodeId} not found`);
    }
    
    Object.assign(node, changes);
    
    this.emit('nodeUpdated', { nodeId, changes });
    this.emit('dataChanged', this.data);
  }
  
  removeNode(nodeId: string): void {
    this.checkNotDestroyed();
    
    if (!this.data || nodeId === this.data.root.id) {
      throw new Error('Cannot remove root node');
    }
    
    const parentId = this.parentIndex.get(nodeId);
    if (!parentId) {
      throw new Error(`Node with id ${nodeId} not found`);
    }
    
    const parentNode = this.nodeIndex.get(parentId);
    if (!parentNode || !parentNode.children) {
      throw new Error(`Parent node not found or has no children`);
    }
    
    const nodeIndex = parentNode.children.findIndex(child => child.id === nodeId);
    if (nodeIndex === -1) {
      throw new Error(`Node with id ${nodeId} not found in parent's children`);
    }
    
    const nodeData = parentNode.children[nodeIndex];
    const command = new RemoveNodeCommand(this, nodeId, parentId, nodeData, nodeIndex);
    this.executeCommand(command);
  }
  
  removeNodeInternal(nodeId: string, recordCommand: boolean = true): void {
    const parentId = this.parentIndex.get(nodeId);
    if (!parentId) {
      throw new Error(`Node with id ${nodeId} not found`);
    }
    
    const parentNode = this.nodeIndex.get(parentId);
    if (!parentNode || !parentNode.children) {
      return;
    }
    
    const nodeIndex = parentNode.children.findIndex(child => child.id === nodeId);
    if (nodeIndex !== -1) {
      parentNode.children.splice(nodeIndex, 1);
    }
    
    this.removeFromIndex(nodeId);
    this.selectedNodeIds.delete(nodeId);
    this.collapsedNodes.delete(nodeId);
    
    this.emit('nodeRemoved', { nodeId, parentId });
    this.emit('dataChanged', this.data);
  }

  // ==========================================
  // ツリー構造操作機能
  // ==========================================
  
  moveNode(nodeId: string, newParentId: string): void {
    this.checkNotDestroyed();
    
    // 循環参照チェック
    if (this.wouldCreateCycle(nodeId, newParentId)) {
      throw new Error('循環参照が発生します');
    }
    
    const oldParentId = this.parentIndex.get(nodeId);
    if (!oldParentId) {
      throw new Error(`Node with id ${nodeId} not found`);
    }
    
    if (oldParentId === newParentId) {
      return; // 同じ親への移動は何もしない
    }
    
    const node = this.nodeIndex.get(nodeId);
    if (!node) {
      throw new Error(`Node with id ${nodeId} not found`);
    }
    
    // 古い親から削除
    const oldParent = this.nodeIndex.get(oldParentId);
    if (oldParent?.children) {
      const index = oldParent.children.findIndex(child => child.id === nodeId);
      if (index !== -1) {
        oldParent.children.splice(index, 1);
      }
    }
    
    // 新しい親に追加
    const newParent = this.nodeIndex.get(newParentId);
    if (!newParent) {
      throw new Error(`New parent node with id ${newParentId} not found`);
    }
    
    if (!newParent.children) {
      newParent.children = [];
    }
    newParent.children.push(node);
    
    // インデックスを更新
    this.parentIndex.set(nodeId, newParentId);
    
    this.emit('nodeMoved', { nodeId, oldParentId, newParentId });
    this.emit('dataChanged', this.data);
  }
  
  reorderNodes(parentId: string, newOrder: string[]): void {
    this.checkNotDestroyed();
    
    const parentNode = this.nodeIndex.get(parentId);
    if (!parentNode || !parentNode.children) {
      throw new Error(`Parent node with id ${parentId} not found or has no children`);
    }
    
    // 新しい順序での子ノード配列を作成
    const reorderedChildren: MindmapNode[] = [];
    for (const childId of newOrder) {
      const child = parentNode.children.find(c => c.id === childId);
      if (child) {
        reorderedChildren.push(child);
      }
    }
    
    // 新しい順序に含まれていない子ノードがあれば末尾に追加
    for (const child of parentNode.children) {
      if (!newOrder.includes(child.id)) {
        reorderedChildren.push(child);
      }
    }
    
    parentNode.children = reorderedChildren;
    
    this.emit('dataChanged', this.data);
  }
  
  private wouldCreateCycle(nodeId: string, newParentId: string): boolean {
    let currentId: string | undefined = newParentId;
    
    while (currentId) {
      if (currentId === nodeId) {
        return true;
      }
      currentId = this.parentIndex.get(currentId);
    }
    
    return false;
  }

  // ==========================================
  // ノード状態管理機能
  // ==========================================
  
  selectNode(nodeId: string | null, addToSelection: boolean = false): void {
    this.checkNotDestroyed();
    
    if (!this.multiSelectMode) {
      addToSelection = false;
    }
    
    if (nodeId === null) {
      // すべて選択解除
      const previouslySelected = Array.from(this.selectedNodeIds);
      this.selectedNodeIds.clear();
      
      previouslySelected.forEach(prevNodeId => {
        this.emit('nodeDeselected', prevNodeId);
      });
      return;
    }
    
    if (!this.nodeIndex.has(nodeId)) {
      console.warn(`🚨 [CoreLogic] Node with id ${nodeId} not found - ignoring selection request`);
      return;
    }
    
    if (addToSelection) {
      if (this.selectedNodeIds.has(nodeId)) {
        this.selectedNodeIds.delete(nodeId);
        this.emit('nodeDeselected', nodeId);
      } else {
        this.selectedNodeIds.add(nodeId);
        this.emit('nodeSelected', nodeId);
      }
    } else {
      // 単一選択モードまたは新規選択
      const previouslySelected = Array.from(this.selectedNodeIds);
      this.selectedNodeIds.clear();
      this.selectedNodeIds.add(nodeId);
      
      // 前回選択されていたノードの選択解除イベント
      previouslySelected.forEach(prevNodeId => {
        if (prevNodeId !== nodeId) {
          this.emit('nodeDeselected', prevNodeId);
        }
      });
      
      // 新しく選択されたノードのイベント
      if (!previouslySelected.includes(nodeId)) {
        this.emit('nodeSelected', nodeId);
      }
    }
  }
  
  getSelectedNodeId(): string | null {
    return this.selectedNodeIds.size === 1 ? Array.from(this.selectedNodeIds)[0] : null;
  }
  
  getSelectedNodeIds(): string[] {
    return Array.from(this.selectedNodeIds);
  }
  
  setMultiSelectMode(enabled: boolean): void {
    this.multiSelectMode = enabled;
    
    if (!enabled && this.selectedNodeIds.size > 1) {
      // マルチセレクトを無効にする際、最初の選択以外をクリア
      const firstSelected = Array.from(this.selectedNodeIds)[0];
      const toDeselect = Array.from(this.selectedNodeIds).slice(1);
      
      this.selectedNodeIds.clear();
      if (firstSelected) {
        this.selectedNodeIds.add(firstSelected);
      }
      
      toDeselect.forEach(nodeId => {
        this.emit('nodeDeselected', nodeId);
      });
    }
  }
  
  toggleNodeCollapse(nodeId: string): void {
    this.checkNotDestroyed();
    
    if (!this.nodeIndex.has(nodeId)) {
      throw new Error(`Node with id ${nodeId} not found`);
    }
    
    if (this.collapsedNodes.has(nodeId)) {
      this.collapsedNodes.delete(nodeId);
      this.emit('nodeExpanded', nodeId);
    } else {
      this.collapsedNodes.add(nodeId);
      this.emit('nodeCollapsed', nodeId);
    }
  }
  
  isNodeCollapsed(nodeId: string): boolean {
    return this.collapsedNodes.has(nodeId);
  }

  /**
   * 全てのノードを展開
   */
  expandAll(): void {
    this.checkNotDestroyed();
    
    if (this.collapsedNodes.size === 0) {
      return;
    }
    
    this.collapsedNodes.clear();
    this.emit('dataChanged');
  }

  /**
   * 全てのノードを折りたたみ
   */
  collapseAll(): void {
    this.checkNotDestroyed();
    
    if (!this.data?.root) {
      return;
    }
    
    // 子ノードを持つ全てのノードを折りたたみ
    this.collapseNodeRecursive(this.data.root);
    this.emit('dataChanged');
  }

  private collapseNodeRecursive(node: MindmapNode): void {
    if (node.children && node.children.length > 0) {
      this.collapsedNodes.add(node.id);
      
      // 子ノードも再帰的に処理
      for (const child of node.children) {
        this.collapseNodeRecursive(child);
      }
    }
  }

  // ==========================================
  // Undo/Redo機能
  // ==========================================
  
  undo(): void {
    this.checkNotDestroyed();
    
    if (!this.canUndo()) {
      return;
    }
    
    const command = this.undoStack.pop()!;
    command.undo();
    this.redoStack.push(command);
    
    this.emit('undoStackChanged', this.undoStack.length);
    this.emit('redoStackChanged', this.redoStack.length);
  }
  
  redo(): void {
    this.checkNotDestroyed();
    
    if (!this.canRedo()) {
      return;
    }
    
    const command = this.redoStack.pop()!;
    if (command.redo) {
      command.redo();
    } else {
      command.execute();
    }
    this.undoStack.push(command);
    
    this.emit('undoStackChanged', this.undoStack.length);
    this.emit('redoStackChanged', this.redoStack.length);
  }
  
  canUndo(): boolean {
    return this.undoStack.length > 0;
  }
  
  canRedo(): boolean {
    return this.redoStack.length > 0;
  }
  
  setUndoHistoryLimit(limit: number): void {
    this.undoHistoryLimit = Math.max(1, limit);
    
    // 既存のスタックを制限内に収める
    while (this.undoStack.length > this.undoHistoryLimit) {
      this.undoStack.shift();
    }
  }
  
  clearUndoRedoHistory(): void {
    this.undoStack.length = 0;
    this.redoStack.length = 0;
    
    this.emit('undoStackChanged', 0);
    this.emit('redoStackChanged', 0);
  }
  
  private executeCommand(command: Command): void {
    command.execute();
    
    if (!this.batchMode) {
      this.undoStack.push(command);
      this.redoStack.length = 0; // Redoスタックをクリア
      
      // 履歴制限を適用
      while (this.undoStack.length > this.undoHistoryLimit) {
        this.undoStack.shift();
      }
      
      this.emit('undoStackChanged', this.undoStack.length);
      this.emit('redoStackChanged', 0);
    } else {
      this.batchCommands.push(command);
    }
  }

  // ==========================================
  // イベントシステム機能
  // ==========================================
  
  on(event: CoreLogicEvent, handler: EventHandler): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    
    this.eventListeners.get(event)!.add(handler);
  }
  
  off(event: CoreLogicEvent, handler: EventHandler): void {
    const handlers = this.eventListeners.get(event);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.eventListeners.delete(event);
      }
    }
  }
  
  once(event: CoreLogicEvent, handler: EventHandler): void {
    const onceHandler = (data: unknown) => {
      handler(data);
      this.off(event, onceHandler);
    };
    
    this.on(event, onceHandler);
  }
  
  removeAllListeners(): void {
    this.eventListeners.clear();
  }
  
  emit(event: CoreLogicEvent, data?: unknown): void {
    const handlers = this.eventListeners.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in event handler for ${event}:`, error);
        }
      });
    }
  }

  // ==========================================
  // 検索・フィルタリング機能
  // ==========================================
  
  searchNodes(query: string, options: SearchOptions = {}): MindmapNode[] {
    this.checkNotDestroyed();
    
    if (!query.trim()) {
      return [];
    }
    
    const results: MindmapNode[] = [];
    const searchRegex = options.useRegex 
      ? new RegExp(query, options.caseSensitive ? 'g' : 'gi')
      : null;
    
    for (const node of this.nodeIndex.values()) {
      let matches = false;
      
      // タイトルで検索
      if (this.matchesQuery(node.title, query, searchRegex, options.caseSensitive)) {
        matches = true;
      }
      
      // 説明で検索（オプション）
      if (!matches && options.searchInDescription && node.description) {
        if (this.matchesQuery(node.description, query, searchRegex, options.caseSensitive)) {
          matches = true;
        }
      }
      
      // メタデータで検索（オプション）
      if (!matches && options.searchInMetadata && node.metadata) {
        const metadataStr = JSON.stringify(node.metadata);
        if (this.matchesQuery(metadataStr, query, searchRegex, options.caseSensitive)) {
          matches = true;
        }
      }
      
      if (matches) {
        results.push(node);
      }
    }
    
    return results;
  }
  
  filterNodes(condition: FilterCondition): MindmapNode[] {
    this.checkNotDestroyed();
    
    const results: MindmapNode[] = [];
    
    for (const node of this.nodeIndex.values()) {
      if (this.nodeMatchesFilter(node, condition)) {
        results.push(node);
      }
    }
    
    return results;
  }
  
  private matchesQuery(text: string, query: string, regex: RegExp | null, caseSensitive?: boolean): boolean {
    if (regex) {
      return regex.test(text);
    } else {
      const searchText = caseSensitive ? text : text.toLowerCase();
      const searchQuery = caseSensitive ? query : query.toLowerCase();
      return searchText.includes(searchQuery);
    }
  }
  
  private nodeMatchesFilter(node: MindmapNode, condition: FilterCondition): boolean {
    // 優先度フィルタ
    if (condition.priority) {
      const priorities = Array.isArray(condition.priority) ? condition.priority : [condition.priority];
      if (node.priority && !priorities.includes(node.priority)) {
        return false;
      }
    }
    
    // ステータスフィルタ
    if (condition.status) {
      const statuses = Array.isArray(condition.status) ? condition.status : [condition.status];
      if (node.status && !statuses.includes(node.status)) {
        return false;
      }
    }
    
    // タグフィルタ
    if (condition.tags) {
      const filterTags = Array.isArray(condition.tags) ? condition.tags : [condition.tags];
      if (!node.tags || !filterTags.some(tag => node.tags!.includes(tag))) {
        return false;
      }
    }
    
    // カスタムフィールドフィルタ
    if (condition.customFields) {
      for (const [key, value] of Object.entries(condition.customFields)) {
        if (!node.customFields || node.customFields[key] !== value) {
          return false;
        }
      }
    }
    
    return true;
  }

  // ==========================================
  // 設定管理機能
  // ==========================================
  
  updateSettings(newSettings: Partial<MindmapSettings>): void {
    this.checkNotDestroyed();
    
    // 設定の検証
    this.validateSettings(newSettings);
    
    if (this.data) {
      // データがある場合はデータ内の設定を更新
      const currentSettings = this.data.settings || {};
      this.data.settings = { ...currentSettings, ...newSettings };
      this.emit('settingsChanged', this.data.settings);
    } else {
      // データがない場合は新しい設定をそのまま通知
      this.emit('settingsChanged', newSettings);
    }
    this.emit('dataChanged', this.data);
  }
  
  getSettings(): MindmapSettings {
    return this.data?.settings || {};
  }
  
  private validateSettings(settings: Partial<MindmapSettings>): void {
    if (settings.theme && !['light', 'dark', 'auto'].includes(settings.theme)) {
      throw new Error(`Invalid theme: ${settings.theme}`);
    }
    
    if (settings.layout && !['tree', 'radial', 'force'].includes(settings.layout)) {
      throw new Error(`Invalid layout: ${settings.layout}`);
    }
    
    if (settings.nodeSize && !['small', 'medium', 'large'].includes(String(settings.nodeSize))) {
      throw new Error(`Invalid nodeSize: ${settings.nodeSize}`);
    }
  }

  // ==========================================
  // パフォーマンス最適化機能
  // ==========================================
  
  batchUpdate(callback: BatchUpdateCallback): void {
    this.checkNotDestroyed();
    
    if (this.batchMode) {
      // 既にバッチモードの場合は、そのまま実行
      callback();
      return;
    }
    
    this.batchMode = true;
    this.batchCommands = [];
    
    try {
      callback();
      
      // バッチコマンドがある場合、1つのコマンドとしてまとめる
      if (this.batchCommands.length > 0) {
        const batchCommand: Command = {
          type: 'batch',
          execute: () => {
            this.batchCommands.forEach(cmd => cmd.execute());
          },
          undo: () => {
            // 逆順でundo
            for (let i = this.batchCommands.length - 1; i >= 0; i--) {
              this.batchCommands[i].undo();
            }
          },
          redo: () => {
            this.batchCommands.forEach(cmd => cmd.redo ? cmd.redo() : cmd.execute());
          }
        };
        
        this.undoStack.push(batchCommand);
        this.redoStack.length = 0;
        
        // 履歴制限を適用
        while (this.undoStack.length > this.undoHistoryLimit) {
          this.undoStack.shift();
        }
        
        this.emit('undoStackChanged', this.undoStack.length);
        this.emit('redoStackChanged', 0);
      }
      
      // バッチ処理完了後に1回だけdataChangedイベントを発火
      this.emit('dataChanged', this.data);
    } finally {
      this.batchMode = false;
      this.batchCommands = [];
    }
  }
  
  rebuildIndex(): void {
    this.nodeIndex.clear();
    this.parentIndex.clear();
    
    if (this.data?.root) {
      this.buildIndexRecursive(this.data.root, null);
    }
  }
  
  private buildIndexRecursive(node: MindmapNode, parentId: string | null): void {
    this.nodeIndex.set(node.id, node);
    if (parentId) {
      this.parentIndex.set(node.id, parentId);
    }
    
    if (node.children) {
      for (const child of node.children) {
        this.buildIndexRecursive(child, node.id);
      }
    }
  }
  
  private addToIndex(node: MindmapNode, parentId: string): void {
    this.nodeIndex.set(node.id, node);
    this.parentIndex.set(node.id, parentId);
    
    // 子ノードも再帰的にインデックスに追加
    if (node.children) {
      for (const child of node.children) {
        this.addToIndex(child, node.id);
      }
    }
  }
  
  private removeFromIndex(nodeId: string): void {
    const node = this.nodeIndex.get(nodeId);
    if (!node) return;
    
    // 子ノードも再帰的に削除
    if (node.children) {
      for (const child of node.children) {
        this.removeFromIndex(child.id);
      }
    }
    
    this.nodeIndex.delete(nodeId);
    this.parentIndex.delete(nodeId);
  }

  // ==========================================
  // メモリ管理・クリーンアップ機能
  // ==========================================
  
  destroy(): void {
    if (this.isDestroyed) {
      return;
    }
    
    this.isDestroyed = true;
    
    // イベントリスナーをクリア
    this.removeAllListeners();
    
    // データとインデックスをクリア
    this.data = null;
    this.nodeIndex.clear();
    this.parentIndex.clear();
    this.selectedNodeIds.clear();
    this.collapsedNodes.clear();
    
    // Undo/Redoスタックをクリア
    this.undoStack.length = 0;
    this.redoStack.length = 0;
    this.batchCommands.length = 0;
  }
  
  getMemoryStats(): {
    nodeCount: number;
    eventListenerCount: number;
    undoStackSize: number;
    redoStackSize: number;
  } {
    let eventListenerCount = 0;
    for (const handlers of this.eventListeners.values()) {
      eventListenerCount += handlers.size;
    }
    
    return {
      nodeCount: this.nodeIndex.size,
      eventListenerCount,
      undoStackSize: this.undoStack.length,
      redoStackSize: this.redoStack.length
    };
  }
  
  private checkNotDestroyed(): void {
    if (this.isDestroyed) {
      throw new Error('MindmapCoreLogic instance has been destroyed');
    }
  }
}