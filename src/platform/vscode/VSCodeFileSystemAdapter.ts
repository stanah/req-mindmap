import type { FileSystemAdapter, FileDialogOptions } from '../interfaces';
import { VSCodePlatformAdapter } from './VSCodePlatformAdapter';
import type { VSCodeApi } from './VSCodeApiSingleton';

/**
 * VSCode拡張環境でのファイルシステム操作実装
 * 将来実装予定のスケルトン
 */
export class VSCodeFileSystemAdapter implements FileSystemAdapter {
  private vscode: VSCodeApi | null = null;
  private messageHandlers = new Map<string, (data: unknown) => void>();
  private requestId = 0;

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    const vscode = VSCodePlatformAdapter.getVSCodeApi();
    if (vscode) {
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
      });
    }
  }

  private async sendMessage<T>(command: string, payload?: Record<string, unknown>): Promise<T> {
    if (!this.vscode) {
      throw new Error('VSCode API が利用できません');
    }

    return new Promise((resolve, reject) => {
      const requestId = `${++this.requestId}`;
      
      // レスポンスハンドラーを登録
      this.messageHandlers.set(requestId, (data: { error?: string; result?: T }) => {
        if (data.error) {
          reject(new Error(data.error));
        } else {
          resolve(data.result);
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

    const _watcherId = `watcher_${++this.requestId}`;
    
    throw new Error('VSCode拡張環境はまだ実装されていません');
  }
}