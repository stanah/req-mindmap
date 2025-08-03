import type { PlatformAdapter } from '../interfaces';
import { BrowserFileSystemAdapter } from './BrowserFileSystemAdapter';
import { BrowserEditorAdapter } from './BrowserEditorAdapter';
import { BrowserUIAdapter } from './BrowserUIAdapter';
import { BrowserSettingsAdapter } from './BrowserSettingsAdapter';

/**
 * ブラウザ環境用のメインプラットフォームアダプター
 */
export class BrowserPlatformAdapter implements PlatformAdapter {
  public readonly fileSystem: BrowserFileSystemAdapter;
  public readonly editor: BrowserEditorAdapter;
  public readonly ui: BrowserUIAdapter;
  public readonly settings: BrowserSettingsAdapter;

  constructor() {
    this.fileSystem = new BrowserFileSystemAdapter();
    this.editor = new BrowserEditorAdapter();
    this.ui = new BrowserUIAdapter();
    this.settings = new BrowserSettingsAdapter();
  }

  getPlatformType(): 'browser' | 'vscode' {
    return 'browser';
  }

  async initialize(): Promise<void> {
    // ブラウザ環境での初期化処理
    console.log('ブラウザプラットフォームアダプターを初期化しています...');

    // File System Access API の対応確認
    if ('showOpenFilePicker' in window) {
      console.log('File System Access API が利用可能です');
    } else {
      console.log('File System Access API が利用できません。フォールバック機能を使用します');
    }

    // Monaco Editor の初期化確認
    try {
      await import('monaco-editor');
      console.log('Monaco Editor が利用可能です');
    } catch {
      console.warn('Monaco Editor が読み込まれていません');
    }

    // ローカルストレージの利用可能性確認
    try {
      const testKey = 'mindmap-tool-test';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      console.log('ローカルストレージが利用可能です');
    } catch (error) {
      console.warn('ローカルストレージが利用できません:', error);
    }

    // デフォルト設定の初期化
    await this.initializeDefaultSettings();

    console.log('ブラウザプラットフォームアダプターの初期化が完了しました');
  }

  dispose(): void {
    console.log('ブラウザプラットフォームアダプターを破棄しています...');
    
    this.editor.dispose();
    this.ui.dispose();
    this.settings.dispose();
    
    console.log('ブラウザプラットフォームアダプターの破棄が完了しました');
  }

  /**
   * デフォルト設定を初期化
   */
  private async initializeDefaultSettings(): Promise<void> {
    const defaultSettings = {
      'editor.theme': 'vs-dark',
      'editor.fontSize': 14,
      'editor.wordWrap': 'on',
      'editor.minimap.enabled': true,
      'mindmap.layout': 'tree',
      'mindmap.theme': 'light',
      'mindmap.autoSave': true,
      'mindmap.autoSaveDelay': 1000,
      'ui.language': 'ja',
      'ui.showWelcome': true
    };

    for (const [key, value] of Object.entries(defaultSettings)) {
      // 既存の設定がない場合のみデフォルト値を設定
      if (this.settings.get(key) === undefined) {
        await this.settings.set(key, value);
      }
    }
  }

  /**
   * プラットフォーム固有の機能を取得
   */
  getCapabilities(): {
    fileSystemAccess: boolean;
    nativeDialogs: boolean;
    fileWatching: boolean;
    clipboard: boolean;
  } {
    return {
      fileSystemAccess: 'showOpenFilePicker' in window,
      nativeDialogs: true,
      fileWatching: false, // ブラウザでは制限的
      clipboard: 'navigator' in window && 'clipboard' in navigator
    };
  }

  /**
   * ブラウザ固有のユーティリティメソッド
   */
  async copyToClipboard(text: string): Promise<void> {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        this.ui.showInformationMessage('クリップボードにコピーしました');
      } else {
        // フォールバック: 古いブラウザ対応
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        this.ui.showInformationMessage('クリップボードにコピーしました');
      }
    } catch (error) {
      console.error('クリップボードへのコピーに失敗しました:', error);
      this.ui.showErrorMessage('クリップボードへのコピーに失敗しました');
    }
  }

  /**
   * ブラウザ情報を取得
   */
  getBrowserInfo(): {
    userAgent: string;
    language: string;
    platform: string;
    cookieEnabled: boolean;
    onLine: boolean;
  } {
    return {
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine
    };
  }

  /**
   * パフォーマンス情報を取得
   */
  getPerformanceInfo(): {
    memory?: {
      usedJSHeapSize: number;
      totalJSHeapSize: number;
      jsHeapSizeLimit: number;
    };
    timing: PerformanceTiming;
  } {
    const result: any = {
      timing: performance.timing
    };

    // メモリ情報（Chrome系ブラウザのみ）
    if ('memory' in performance) {
      result.memory = (performance as any).memory;
    }

    return result;
  }
}