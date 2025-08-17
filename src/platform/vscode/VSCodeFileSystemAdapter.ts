import type { FileSystemAdapter, FileDialogOptions } from '../interfaces';
import { VSCodePlatformAdapter } from './VSCodePlatformAdapter';
import type { VSCodeApi } from './VSCodeApiSingleton';

/**
 * VSCode拡張環境でのファイルシステム操作実装
 * VSCode Extension API との実際の統合を提供
 */
export class VSCodeFileSystemAdapter implements FileSystemAdapter {
  private vscode: VSCodeApi | null = null;
  private messageHandlers = new Map<string, (data: unknown) => void>();
  private fileWatchers = new Map<string, { callback: (content: string) => void; watcherId: string }>();
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
        
        // メッセージが不正な場合は無視
        if (!message || typeof message !== 'object') {
          return;
        }
        
        if (message.requestId && this.messageHandlers.has(message.requestId)) {
          const handler = this.messageHandlers.get(message.requestId);
          if (handler) {
            handler(message);
            this.messageHandlers.delete(message.requestId);
          }
        }

        // ファイル監視イベントの処理
        this.handleFileWatchEvent(message);
      });

      // VSCode拡張に初期化完了を通知
      this.vscode.postMessage({
        command: 'fileSystemAdapterReady'
      });

      this.initialized = true;
      console.log('VSCodeFileSystemAdapter初期化完了');
    }
  }

  private handleFileWatchEvent(message: { 
    command: string; 
    watcherId?: string; 
    path?: string; 
    content?: string; 
  }): void {
    switch (message.command) {
      case 'fileChanged':
        if (message.watcherId && message.content !== undefined) {
          // ウォッチャーIDに対応するコールバックを実行
          for (const [_path, watcher] of this.fileWatchers.entries()) {
            if (watcher.watcherId === message.watcherId) {
              watcher.callback(message.content);
              break;
            }
          }
        }
        break;
      case 'fileDeleted':
        if (message.watcherId) {
          // ファイルが削除された場合、ウォッチャーを削除
          for (const [path, watcher] of this.fileWatchers.entries()) {
            if (watcher.watcherId === message.watcherId) {
              this.fileWatchers.delete(path);
              break;
            }
          }
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
      }, 10000);
    });
  }

  async readFile(path: string): Promise<string> {
    return this.sendMessage<string>('readFile', { path });
  }

  async writeFile(path: string, content: string): Promise<void> {
    await this.sendMessage<void>('writeFile', { path, content });
  }

  async exists(path: string): Promise<boolean> {
    return this.sendMessage<boolean>('exists', { path });
  }

  async showOpenDialog(options: FileDialogOptions): Promise<string | null> {
    return this.sendMessage<string | null>('showOpenDialog', { options });
  }

  async showSaveDialog(options: FileDialogOptions): Promise<string | null> {
    return this.sendMessage<string | null>('showSaveDialog', { options });
  }

  watchFile(path: string, callback: (content: string) => void): () => void {
    if (!this.vscode) {
      throw new Error('VSCode API が利用できません');
    }

    const watcherId = `watcher_${++this.requestId}`;
    
    // ウォッチャーを登録
    this.fileWatchers.set(path, { callback, watcherId });
    
    // VSCode拡張にファイル監視を要求
    this.vscode.postMessage({
      command: 'watchFile',
      path,
      watcherId
    });

    // ウォッチャーを停止する関数を返す
    return () => {
      this.fileWatchers.delete(path);
      if (this.vscode) {
        this.vscode.postMessage({
          command: 'unwatchFile',
          path,
          watcherId
        });
      }
    };
  }

  /**
   * 複数ファイルを同時に読み込み
   */
  async readFiles(paths: string[]): Promise<{ [path: string]: string }> {
    return this.sendMessage<{ [path: string]: string }>('readFiles', { paths });
  }

  /**
   * 複数ファイルを同時に書き込み
   */
  async writeFiles(files: { [path: string]: string }): Promise<void> {
    await this.sendMessage<void>('writeFiles', { files });
  }

  /**
   * ディレクトリ内のファイル一覧を取得
   */
  async listFiles(dirPath: string, pattern?: string): Promise<string[]> {
    return this.sendMessage<string[]>('listFiles', { dirPath, pattern });
  }

  /**
   * ファイルを削除
   */
  async deleteFile(path: string): Promise<void> {
    await this.sendMessage<void>('deleteFile', { path });
  }

  /**
   * ディレクトリを作成
   */
  async createDirectory(path: string): Promise<void> {
    await this.sendMessage<void>('createDirectory', { path });
  }

  /**
   * ファイル/ディレクトリの情報を取得
   */
  async getFileInfo(path: string): Promise<{
    isFile: boolean;
    isDirectory: boolean;
    size: number;
    lastModified: Date;
  }> {
    return this.sendMessage('getFileInfo', { path });
  }

  /**
   * 現在のワークスペースフォルダを取得
   */
  async getWorkspaceFolders(): Promise<string[]> {
    return this.sendMessage<string[]>('getWorkspaceFolders');
  }

  /**
   * リソースを解放
   */
  dispose(): void {
    // すべてのファイルウォッチャーを停止
    for (const [path, watcher] of this.fileWatchers.entries()) {
      if (this.vscode) {
        this.vscode.postMessage({
          command: 'unwatchFile',
          path,
          watcherId: watcher.watcherId
        });
      }
    }
    
    this.messageHandlers.clear();
    this.fileWatchers.clear();
    this.initialized = false;
  }
}