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
   * セッション状態を保存（何もしない）
   */
  saveSessionState(_sessionState: Record<string, unknown>): void {
    // 将来的にはVSCode APIでセッション状態管理
    console.debug('Session state save requested - will be implemented with VSCode API');
  }

  /**
   * セッション状態を読み込み（空オブジェクトを返す）
   */
  loadSessionState(): Record<string, unknown> {
    // 将来的にはVSCode APIでセッション状態管理
    return {};
  }

  /**
   * 自動保存を開始（何もしない）
   */
  startAutoSave(_callback: () => Promise<void>): void {
    // 将来的にはVSCode APIで自動保存管理
    console.debug('Auto save start requested - will be implemented with VSCode API');
  }

  /**
   * 自動保存データを保存（何もしない）
   */
  saveAutoSaveData(_content: string, _fileName?: string): void {
    // 将来的にはVSCode APIで自動保存データ管理
    console.debug('Auto save data requested - will be implemented with VSCode API');
  }

  /**
   * 全データをクリア（何もしない）
   */
  clearAllData(): void {
    // 将来的にはVSCode APIでデータクリア
    console.debug('Clear all data requested - will be implemented with VSCode API');
  }

  /**
   * 設定をエクスポート（デフォルト設定のJSONを返す）
   */
  exportSettings(): string {
    // 将来的にはVSCode APIで設定エクスポート
    return JSON.stringify(this.getDefaultSettings(), null, 2);
  }

  /**
   * 設定をインポート（何もしない）
   */
  importSettings(_settingsJson: string): void {
    // 将来的にはVSCode APIで設定インポート
    console.debug('Import settings requested - will be implemented with VSCode API');
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