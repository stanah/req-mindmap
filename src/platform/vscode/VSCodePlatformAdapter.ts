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
    return 'vscode';
  }

  async initialize(): Promise<void> {
    console.log('VSCodeプラットフォームアダプターを初期化しています...');
    
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
    
    console.log('VSCodeプラットフォームアダプターの初期化が完了しました');
  }

  dispose(): void {
    console.log('VSCodeプラットフォームアダプターを破棄しています...');
    
    // 各アダプターの破棄
    // this.fileSystem.dispose();
    // this.editor.dispose();
    // this.ui.dispose();
    // this.settings.dispose();
    
    console.log('VSCodeプラットフォームアダプターの破棄が完了しました');
  }
}