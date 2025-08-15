import type { SettingsAdapter } from '../interfaces';
import { VSCodePlatformAdapter } from './VSCodePlatformAdapter';
import type { VSCodeApi } from './VSCodeApiSingleton';

/**
 * VSCode拡張環境での設定管理実装
 * 将来実装予定のスケルトン
 */
export class VSCodeSettingsAdapter implements SettingsAdapter {
  private vscode: VSCodeApi | null = null;
  private messageHandlers = new Map<string, (data: unknown) => void>();
  private settingsCache = new Map<string, unknown>();
  private changeCallbacks = new Set<(key: string, value: unknown) => void>();
  private requestId = 0;

  constructor() {
    this.initialize();
  }

  private initialize(): void {
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

        // 設定変更通知の処理
        this.handleSettingsEvent(message);
      });

      // 初期設定を要求
      this.vscode?.postMessage({
        command: 'getInitialConfiguration'
      });
    }
  }

  private handleSettingsEvent(message: unknown): void {
    const msg = message as { command?: string; [key: string]: unknown };
    switch (msg.command) {
      case 'configurationChanged':
        this.settingsCache.set(msg.key as string, msg.value);
        this.changeCallbacks.forEach(callback => callback(msg.key as string, msg.value));
        break;
      case 'initialConfiguration':
        // 初期設定を受信
        if (msg.settings) {
          Object.entries(msg.settings as Record<string, unknown>).forEach(([key, value]) => {
            this.settingsCache.set(key, value);
          });
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

  get<T>(key: string, defaultValue?: T): T {
    // キャッシュから取得を試行
    if (this.settingsCache.has(key)) {
      return this.settingsCache.get(key) as T;
    }

    // VSCodeでない環境またはキャッシュにない場合はデフォルト値を返す
    return defaultValue as T;
  }

  async set<T>(key: string, value: T): Promise<void> {
    if (!this.vscode) {
      // Webviewでない環境では警告を出力
      console.warn(`設定の保存ができません: ${key} = ${value}`);
      return;
    }

    await this.sendMessage<void>('updateConfiguration', { key, value });
    
    throw new Error('VSCode拡張環境はまだ実装されていません');
  }

  onDidChange(_callback: (key: string, value: unknown) => void): void {
    // VSCode API を使用して設定変更イベントを監視
    // const vscode = acquireVsCodeApi();
    // vscode.postMessage({
    //   command: 'onDidChangeConfiguration',
    //   callback: callback
    // });
    
    throw new Error('VSCode拡張環境はまだ実装されていません');
  }

  getAll(): Record<string, unknown> {
    // VSCode API を使用してすべての設定を取得
    // const vscode = acquireVsCodeApi();
    // return vscode.postMessage({
    //   command: 'getAllConfiguration'
    // });
    
    throw new Error('VSCode拡張環境はまだ実装されていません');
  }

  async reset(_key: string): Promise<void> {
    // VSCode API を使用して設定をリセット
    // const vscode = acquireVsCodeApi();
    // await vscode.postMessage({
    //   command: 'resetConfiguration',
    //   key: key
    // });
    
    throw new Error('VSCode拡張環境はまだ実装されていません');
  }
}