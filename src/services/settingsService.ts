/**
 * 設定管理サービス（簡略版）
 * 
 * デフォルト設定のみを提供します。
 * 将来的にはVSCode設定APIで管理される予定です。
 */

import type { AppSettings } from '../types';

/**
 * 設定管理サービスクラス
 */
export class SettingsService {
  /**
   * アプリケーション設定を読み込む（デフォルト値のみ）
   */
  loadSettings(): AppSettings {
    return this.getDefaultSettings();
  }

  /**
   * アプリケーション設定を保存する（何もしない）
   */
  saveSettings(_settings: AppSettings): void {
    // 将来的にはVSCode設定APIを使用
    console.debug('Settings save requested - will be implemented with VSCode API');
  }

  /**
   * 最近開いたファイル一覧を取得（空配列を返す）
   */
  getRecentFiles(): Array<{ path: string; name: string; lastAccessed: number }> {
    // 将来的にはVSCode APIで履歴管理
    return [];
  }

  /**
   * 最近開いたファイルに追加（何もしない）
   */
  addRecentFile(_file: { path: string; name: string }): void {
    // 将来的にはVSCode APIで履歴管理
    console.debug('Recent file add requested - will be implemented with VSCode API');
  }

  /**
   * デフォルト設定を取得
   */
  private getDefaultSettings(): AppSettings {
    return {
      editor: {
        language: 'json',
        theme: 'vs-light',
        fontSize: 14,
        tabSize: 2,
        formatOnType: true,
        autoSave: false,
        lineNumbers: true,
        wordWrap: true,
        minimap: true,
      },
      mindmap: {
        theme: 'light',
        layout: 'tree',
        zoom: 1,
        center: { x: 0, y: 0 },
        nodeWidth: 160,
        maxNodeWidth: 200,
        nodeSpacing: 20,
        levelSpacing: 100,
        verticalSpacing: 1.0,
        enableAnimation: true,
        autoLayout: true,
      },
      language: 'ja',
      debug: false,
      autoBackup: true,
      recentFiles: [],
    };
  }
}

/**
 * 設定サービスのシングルトンインスタンス
 */
export const settingsService = new SettingsService();