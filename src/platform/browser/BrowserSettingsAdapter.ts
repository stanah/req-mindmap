import type { SettingsAdapter } from '../interfaces';

/**
 * ブラウザ環境での設定管理実装
 * ローカルストレージを使用して設定を永続化
 */
export class BrowserSettingsAdapter implements SettingsAdapter {
  private static readonly STORAGE_PREFIX = 'mindmap-tool-settings-';
  private changeCallbacks: Array<(key: string, value: any) => void> = [];
  private settings: Record<string, any> = {};

  constructor() {
    this.loadSettings();
    this.setupStorageListener();
  }

  get<T>(key: string, defaultValue?: T): T {
    const value = this.settings[key];
    return value !== undefined ? value : (defaultValue as T);
  }

  async set<T>(key: string, value: T): Promise<void> {
    const oldValue = this.settings[key];
    this.settings[key] = value;

    try {
      localStorage.setItem(
        BrowserSettingsAdapter.STORAGE_PREFIX + key,
        JSON.stringify(value)
      );

      // 変更通知
      if (oldValue !== value) {
        this.notifyChange(key, value);
      }
    } catch (error) {
      console.error('設定の保存に失敗しました:', error);
      // ローカルストレージが満杯の場合などのエラーハンドリング
      throw new Error(`設定の保存に失敗しました: ${key}`);
    }
  }

  onDidChange(callback: (key: string, value: any) => void): void {
    this.changeCallbacks.push(callback);
  }

  getAll(): Record<string, any> {
    return { ...this.settings };
  }

  async reset(key: string): Promise<void> {
    delete this.settings[key];
    
    try {
      localStorage.removeItem(BrowserSettingsAdapter.STORAGE_PREFIX + key);
      this.notifyChange(key, undefined);
    } catch (error) {
      console.error('設定のリセットに失敗しました:', error);
      throw new Error(`設定のリセットに失敗しました: ${key}`);
    }
  }

  /**
   * ローカルストレージから設定を読み込み
   */
  private loadSettings(): void {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const storageKey = localStorage.key(i);
        if (storageKey?.startsWith(BrowserSettingsAdapter.STORAGE_PREFIX)) {
          const key = storageKey.substring(BrowserSettingsAdapter.STORAGE_PREFIX.length);
          const value = localStorage.getItem(storageKey);
          
          if (value !== null) {
            try {
              this.settings[key] = JSON.parse(value);
            } catch (parseError) {
              console.warn(`設定値の解析に失敗しました: ${key}`, parseError);
              // 解析に失敗した場合は文字列として保存
              this.settings[key] = value;
            }
          }
        }
      }
    } catch (error) {
      console.error('設定の読み込みに失敗しました:', error);
    }
  }

  /**
   * ストレージ変更イベントのリスナーを設定
   * 他のタブでの変更を検知するため
   */
  private setupStorageListener(): void {
    window.addEventListener('storage', (event) => {
      if (event.key?.startsWith(BrowserSettingsAdapter.STORAGE_PREFIX)) {
        const key = event.key.substring(BrowserSettingsAdapter.STORAGE_PREFIX.length);
        
        let newValue: any;
        if (event.newValue !== null) {
          try {
            newValue = JSON.parse(event.newValue);
          } catch {
            newValue = event.newValue;
          }
        } else {
          newValue = undefined;
        }

        // 内部状態を更新
        if (newValue !== undefined) {
          this.settings[key] = newValue;
        } else {
          delete this.settings[key];
        }

        // 変更通知
        this.notifyChange(key, newValue);
      }
    });
  }

  /**
   * 設定変更を通知
   */
  private notifyChange(key: string, value: any): void {
    this.changeCallbacks.forEach(callback => {
      try {
        callback(key, value);
      } catch (error) {
        console.error('設定変更コールバックでエラーが発生しました:', error);
      }
    });
  }

  /**
   * すべての設定をクリア（デバッグ用）
   */
  clearAll(): void {
    const keysToRemove: string[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(BrowserSettingsAdapter.STORAGE_PREFIX)) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
      const settingKey = key.substring(BrowserSettingsAdapter.STORAGE_PREFIX.length);
      delete this.settings[settingKey];
      this.notifyChange(settingKey, undefined);
    });
  }

  /**
   * 設定のエクスポート
   */
  exportSettings(): string {
    return JSON.stringify(this.settings, null, 2);
  }

  /**
   * 設定のインポート
   */
  async importSettings(settingsJson: string): Promise<void> {
    try {
      const importedSettings = JSON.parse(settingsJson);
      
      for (const [key, value] of Object.entries(importedSettings)) {
        await this.set(key, value);
      }
    } catch (error) {
      console.error('設定のインポートに失敗しました:', error);
      throw new Error('設定のインポートに失敗しました');
    }
  }

  /**
   * 設定アダプターを破棄
   */
  dispose(): void {
    this.changeCallbacks.length = 0;
  }
}