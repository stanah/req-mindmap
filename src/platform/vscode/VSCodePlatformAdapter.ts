import type { PlatformAdapter } from '../interfaces';
import { VSCodeFileSystemAdapter } from './VSCodeFileSystemAdapter';
import { VSCodeEditorAdapter } from './VSCodeEditorAdapter';
import { VSCodeUIAdapter } from './VSCodeUIAdapter';
import { VSCodeSettingsAdapter } from './VSCodeSettingsAdapter';
import VSCodeApiSingleton, { type VSCodeApi } from './VSCodeApiSingleton';

/**
 * VSCode拡張環境用のメインプラットフォームアダプター
 * 将来実装予定のスケルトン
 */
export class VSCodePlatformAdapter implements PlatformAdapter {
  public readonly fileSystem: VSCodeFileSystemAdapter;
  public readonly editor: VSCodeEditorAdapter;
  public readonly ui: VSCodeUIAdapter;
  public readonly settings: VSCodeSettingsAdapter;
  
  constructor() {
    this.fileSystem = new VSCodeFileSystemAdapter();
    this.editor = new VSCodeEditorAdapter();
    this.ui = new VSCodeUIAdapter();
    this.settings = new VSCodeSettingsAdapter();
  }
  
  /**
   * VSCode APIを安全に取得する（シングルトン経由）
   */
  static getVSCodeApi(): VSCodeApi | null {
    return VSCodeApiSingleton.getInstance().getApi();
  }

  getPlatformType(): 'browser' | 'vscode' {
    // 実際のVSCode環境かどうかを動的に判定
    const singleton = VSCodeApiSingleton.getInstance();
    return singleton.isAvailable() ? 'vscode' : 'browser';
  }

  async initialize(): Promise<void> {
    console.log('VSCodeプラットフォームアダプターを初期化しています...');
    
    try {
      // VSCode API シングルトンを使用
      const singleton = VSCodeApiSingleton.getInstance();
      if (singleton.isAvailable()) {
        console.log('VSCode Webview環境を検出しました');
        
        // 初期化完了を通知
        singleton.postMessage({
          command: 'webviewReady'
        });
      } else {
        console.log('非VSCode環境で実行しています（ブラウザモード）');
      }
      
      // 各サブアダプターの初期化
      await Promise.all([
        this.fileSystem.initialize?.(),
        this.editor.initialize?.(),
        this.ui.initialize?.(),
        this.settings.initialize?.()
      ].filter(Boolean));
      
      console.log('VSCodeプラットフォームアダプターの初期化が完了しました');
    } catch (error) {
      console.error('VSCodeプラットフォームアダプターの初期化中にエラーが発生しました:', error);
      throw error;
    }
  }

  dispose(): void {
    if (process.env.NODE_ENV !== 'test') {
      console.log('VSCodeプラットフォームアダプターを破棄しています...');
    }
    
    try {
      // 各アダプターの破棄（dispose メソッドがある場合のみ）
      if (typeof this.fileSystem.dispose === 'function') {
        this.fileSystem.dispose();
      }
      if (typeof this.editor.dispose === 'function') {
        this.editor.dispose();
      }
      if (typeof this.ui.dispose === 'function') {
        this.ui.dispose();
      }
      if (typeof this.settings.dispose === 'function') {
        this.settings.dispose();
      }
      
      if (process.env.NODE_ENV !== 'test') {
        console.log('VSCodeプラットフォームアダプターの破棄が完了しました');
      }
    } catch (error) {
      console.error('VSCodeプラットフォームアダプターの破棄中にエラーが発生しました:', error);
    }
  }
}