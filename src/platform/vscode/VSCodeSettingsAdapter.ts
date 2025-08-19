import type { SettingsAdapter } from '../interfaces';
import { VSCodePlatformAdapter } from './VSCodePlatformAdapter';
import type { VSCodeApi } from './VSCodeApiSingleton';

/**
 * VSCode拡張環境での設定管理実装
 * VSCode Extension API との実際の統合を提供
 */
export class VSCodeSettingsAdapter implements SettingsAdapter {
  private vscode: VSCodeApi | null = null;
  private messageHandlers = new Map<string, (data: unknown) => void>();
  private settingsCache = new Map<string, unknown>();
  private changeCallbacks = new Set<(key: string, value: unknown) => void>();
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

        // 設定変更通知の処理
        this.handleSettingsEvent(message);
      });

      // VSCode拡張に初期化完了を通知
      this.vscode.postMessage({
        command: 'settingsAdapterReady'
      });

      // 初期設定を要求
      this.vscode.postMessage({
        command: 'getInitialConfiguration'
      });

      this.initialized = true;
      console.log('VSCodeSettingsAdapter初期化完了');
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
      console.warn(`設定の保存ができません: ${key} = ${value}`);
      return;
    }

    // VSCode拡張に設定更新を要求
    await this.sendMessage<void>('updateConfiguration', { key, value });
    
    // キャッシュも更新
    this.settingsCache.set(key, value);
  }

  onDidChange(callback: (key: string, value: unknown) => void): void {
    this.changeCallbacks.add(callback);
    
    // VSCode拡張に設定変更通知の購読を要求
    if (this.vscode) {
      this.vscode.postMessage({
        command: 'subscribeToConfigurationChanges'
      });
    }
  }

  getAll(): Record<string, unknown> {
    // キャッシュされた設定をすべて返す
    const result: Record<string, unknown> = {};
    for (const [key, value] of this.settingsCache.entries()) {
      result[key] = value;
    }
    return result;
  }

  async reset(key: string): Promise<void> {
    if (!this.vscode) {
      console.warn(`設定のリセットができません: ${key}`);
      return;
    }

    // VSCode拡張に設定リセットを要求
    await this.sendMessage<void>('resetConfiguration', { key });
    
    // キャッシュからも削除
    this.settingsCache.delete(key);
  }

  /**
   * 指定されたセクションの設定を取得
   */
  async getSection(section: string): Promise<Record<string, unknown>> {
    if (!this.vscode) {
      // キャッシュから該当セクションの設定を検索
      const result: Record<string, unknown> = {};
      for (const [key, value] of this.settingsCache.entries()) {
        if (key.startsWith(`${section}.`)) {
          const subKey = key.substring(section.length + 1);
          result[subKey] = value;
        }
      }
      return result;
    }

    return this.sendMessage<Record<string, unknown>>('getConfigurationSection', { section });
  }

  /**
   * 指定されたセクションの設定を一括更新
   */
  async updateSection(section: string, values: Record<string, unknown>): Promise<void> {
    if (!this.vscode) {
      console.warn(`設定セクションの更新ができません: ${section}`);
      return;
    }

    await this.sendMessage<void>('updateConfigurationSection', { section, values });
    
    // キャッシュも更新
    for (const [key, value] of Object.entries(values)) {
      this.settingsCache.set(`${section}.${key}`, value);
    }
  }

  /**
   * 設定のデフォルト値を取得
   */
  async getDefaultValue<T>(key: string): Promise<T | undefined> {
    if (!this.vscode) {
      return undefined;
    }

    return this.sendMessage<T | undefined>('getDefaultConfigurationValue', { key });
  }

  /**
   * 設定が変更されているかチェック
   */
  async isModified(key: string): Promise<boolean> {
    if (!this.vscode) {
      return false;
    }

    return this.sendMessage<boolean>('isConfigurationModified', { key });
  }

  /**
   * 設定の検証
   */
  async validateConfiguration(): Promise<{ isValid: boolean; errors: string[] }> {
    if (!this.vscode) {
      return { isValid: true, errors: [] };
    }

    return this.sendMessage<{ isValid: boolean; errors: string[] }>('validateConfiguration');
  }

  /**
   * リソースを解放
   */
  dispose(): void {
    this.messageHandlers.clear();
    this.settingsCache.clear();
    this.changeCallbacks.clear();
    this.initialized = false;
  }
}