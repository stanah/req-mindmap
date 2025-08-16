import type { VSCodeApi } from './VSCodeApiSingleton';
import { VSCodePlatformAdapter } from './VSCodePlatformAdapter';

/**
 * マインドマップツリー表示用のデータ項目
 */
export interface MindmapTreeItem {
  id: string;
  label: string;
  description?: string;
  contextValue?: string;
  iconPath?: string;
  collapsibleState: 'none' | 'collapsed' | 'expanded';
  children?: MindmapTreeItem[];
  command?: {
    command: string;
    title: string;
    arguments?: unknown[];
  };
}

/**
 * マインドマップノードの型定義（再帰的）
 */
export interface MindmapNode {
  id: string;
  title: string;
  children?: MindmapNode[];
}

/**
 * VSCode拡張のエクスプローラービューでマインドマップツリーを表示するプロバイダー
 * VSCode Extension API の TreeDataProvider と統合
 */
export class VSCodeTreeDataProvider {
  private vscode: VSCodeApi | null = null;
  private messageHandlers = new Map<string, (data: unknown) => void>();
  private treeData: MindmapTreeItem[] = [];
  private changeCallbacks = new Set<() => void>();
  private requestId = 0;
  private initialized = false;

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    if (this.initialized) return;

    const vscode = VSCodePlatformAdapter.getVSCodeApi();
    if (vscode && 'postMessage' in vscode) {
      this.vscode = vscode;
      
      // VSCodeからのメッセージを受信
      window.addEventListener('message', (event) => {
        const message = event.data;
        
        if (message.requestId && this.messageHandlers.has(message.requestId)) {
          const handler = this.messageHandlers.get(message.requestId);
          if (handler) {
            handler(message);
            this.messageHandlers.delete(message.requestId);
          }
        }

        // ツリービュー関連のイベント処理
        this.handleTreeViewEvent(message);
      });

      // VSCode拡張に初期化完了を通知
      this.vscode.postMessage({
        command: 'treeDataProviderReady'
      });

      this.initialized = true;
      console.log('VSCodeTreeDataProvider初期化完了');
    }
  }

  private handleTreeViewEvent(message: { 
    command: string; 
    item?: MindmapTreeItem;
    data?: MindmapTreeItem[];
  }): void {
    switch (message.command) {
      case 'refreshTreeView':
        // ツリービューの更新要求
        this.changeCallbacks.forEach(callback => callback());
        break;
      case 'treeDataUpdated':
        // ツリーデータの更新通知
        if (message.data) {
          this.treeData = message.data;
          this.changeCallbacks.forEach(callback => callback());
        }
        break;
    }
  }

  private async sendMessage<T>(command: string, payload?: Record<string, unknown>): Promise<T> {
    if (!this.vscode) {
      throw new Error('VSCode API が利用できません');
    }

    return new Promise((resolve, reject) => {
      const requestId = `${++this.requestId}`;
      
      // レスポンスハンドラーを登録
      this.messageHandlers.set(requestId, (data: unknown) => {
        const response = data as { error?: string; result?: T };
        if (response.error) {
          reject(new Error(response.error));
        } else {
          resolve(response.result as T);
        }
      });

      // メッセージを送信
      this.vscode!.postMessage({
        command,
        requestId,
        ...payload
      });

      // タイムアウト処理
      setTimeout(() => {
        if (this.messageHandlers.has(requestId)) {
          this.messageHandlers.delete(requestId);
          reject(new Error(`操作がタイムアウトしました: ${command}`));
        }
      }, 5000);
    });
  }

  /**
   * ツリーデータを取得
   */
  getTreeData(): MindmapTreeItem[] {
    return this.treeData;
  }

  /**
   * ツリーデータを設定
   */
  setTreeData(data: MindmapTreeItem[]): void {
    this.treeData = data;
    
    // VSCode拡張にツリーデータ更新を通知
    if (this.vscode) {
      this.vscode.postMessage({
        command: 'updateTreeData',
        data
      });
    }
    
    // 変更通知
    this.changeCallbacks.forEach(callback => callback());
  }

  /**
   * 指定されたマインドマップデータからツリーアイテムを生成
   */
  generateTreeFromMindmapData(mindmapData: {
    title?: string;
    root?: MindmapNode;
  }): MindmapTreeItem[] {
    const treeItems: MindmapTreeItem[] = [];

    if (mindmapData.root) {
      const rootItem = this.createTreeItemFromNode(mindmapData.root, true);
      if (rootItem) {
        treeItems.push(rootItem);
      }
    }

    return treeItems;
  }

  private createTreeItemFromNode(node: MindmapNode, isRoot = false): MindmapTreeItem {
    const hasChildren = node.children && node.children.length > 0;
    
    const treeItem: MindmapTreeItem = {
      id: node.id,
      label: node.title,
      contextValue: isRoot ? 'mindmapRoot' : 'mindmapNode',
      collapsibleState: hasChildren ? 'expanded' : 'none',
      command: {
        command: 'mindmapTool.selectNode',
        title: 'ノードを選択',
        arguments: [node.id]
      }
    };

    if (hasChildren) {
      treeItem.children = node.children!.map(child => 
        this.createTreeItemFromNode(child, false)
      );
    }

    return treeItem;
  }

  /**
   * 特定のノードを更新
   */
  updateNode(nodeId: string, updatedNode: Partial<MindmapTreeItem>): void {
    const updateTreeItem = (items: MindmapTreeItem[]): boolean => {
      for (const item of items) {
        if (item.id === nodeId) {
          Object.assign(item, updatedNode);
          return true;
        }
        if (item.children && updateTreeItem(item.children)) {
          return true;
        }
      }
      return false;
    };

    if (updateTreeItem(this.treeData)) {
      // 変更をVSCode拡張に通知
      if (this.vscode) {
        this.vscode.postMessage({
          command: 'nodeUpdated',
          nodeId,
          updatedNode
        });
      }
      
      // 変更通知
      this.changeCallbacks.forEach(callback => callback());
    }
  }

  /**
   * ノードを追加
   */
  addNode(parentId: string, newNode: MindmapTreeItem): void {
    const addToTreeItem = (items: MindmapTreeItem[]): boolean => {
      for (const item of items) {
        if (item.id === parentId) {
          if (!item.children) {
            item.children = [];
          }
          item.children.push(newNode);
          item.collapsibleState = 'expanded';
          return true;
        }
        if (item.children && addToTreeItem(item.children)) {
          return true;
        }
      }
      return false;
    };

    if (addToTreeItem(this.treeData)) {
      // 変更をVSCode拡張に通知
      if (this.vscode) {
        this.vscode.postMessage({
          command: 'nodeAdded',
          parentId,
          newNode
        });
      }
      
      // 変更通知
      this.changeCallbacks.forEach(callback => callback());
    }
  }

  /**
   * ノードを削除
   */
  removeNode(nodeId: string): void {
    const removeFromTreeItem = (items: MindmapTreeItem[]): boolean => {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.id === nodeId) {
          items.splice(i, 1);
          return true;
        }
        if (item.children && removeFromTreeItem(item.children)) {
          return true;
        }
      }
      return false;
    };

    if (removeFromTreeItem(this.treeData)) {
      // 変更をVSCode拡張に通知
      if (this.vscode) {
        this.vscode.postMessage({
          command: 'nodeRemoved',
          nodeId
        });
      }
      
      // 変更通知
      this.changeCallbacks.forEach(callback => callback());
    }
  }

  /**
   * ツリーの変更を監視
   */
  onDidChangeTreeData(callback: () => void): void {
    this.changeCallbacks.add(callback);
  }

  /**
   * ツリーを更新（手動リフレッシュ）
   */
  refresh(): void {
    if (this.vscode) {
      this.vscode.postMessage({
        command: 'refreshTreeView'
      });
    }
    
    this.changeCallbacks.forEach(callback => callback());
  }

  /**
   * 指定ノードを選択状態にする
   */
  selectNode(nodeId: string): void {
    if (this.vscode) {
      this.vscode.postMessage({
        command: 'selectTreeNode',
        nodeId
      });
    }
  }

  /**
   * 指定ノードを表示領域に表示する
   */
  revealNode(nodeId: string): void {
    if (this.vscode) {
      this.vscode.postMessage({
        command: 'revealTreeNode',
        nodeId
      });
    }
  }

  /**
   * リソースを解放
   */
  dispose(): void {
    this.messageHandlers.clear();
    this.changeCallbacks.clear();
    this.treeData = [];
    this.initialized = false;
  }
}