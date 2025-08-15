/**
 * 設定管理サービス
 * 
 * アプリケーション設定のローカルストレージ保存・復元、
 * 最近開いたファイル管理、セッション状態管理を行います。
 */

import type { AppSettings } from '../types';

/**
 * 自動保存設定
 */
export interface AutoSaveSettings {
  /** 自動保存を有効にするかどうか */
  enabled: boolean;
  /** 自動保存の間隔（秒） */
  interval: number;
  /** 最大自動保存回数 */
  maxBackups: number;
}

/**
 * セッション状態
 */
export interface SessionState {
  /** 最後に開いていたファイルのパス */
  lastOpenFile?: string;
  /** 最後のファイル内容 */
  lastFileContent?: string;
  /** 最後のカーソル位置 */
  lastCursorPosition?: {
    line: number;
    column: number;
  };
  /** 最後の選択ノード */
  lastSelectedNodeId?: string;
  /** パネルサイズ */
  panelSizes?: {
    editor: number;
    mindmap: number;
  };
  /** マインドマップのビューポート状態 */
  viewportState?: {
    zoom: number;
    center: { x: number; y: number };
  };
  /** 保存日時 */
  timestamp: number;
}

/**
 * 最近開いたファイル情報
 */
export interface RecentFile {
  /** ファイルパス */
  path: string;
  /** ファイル名 */
  name: string;
  /** 最後にアクセスした日時 */
  lastAccessed: number;
  /** ファイルサイズ */
  size?: number;
  /** ファイル形式 */
  format?: 'json' | 'yaml';
  /** プレビュー用のタイトル */
  title?: string;
}

/**
 * 設定管理サービスクラス
 */
export class SettingsService {
  private readonly STORAGE_PREFIX = 'mindmap-app-';
  private readonly SETTINGS_KEY = `${this.STORAGE_PREFIX}settings`;
  private readonly SESSION_KEY = `${this.STORAGE_PREFIX}session`;
  private readonly RECENT_FILES_KEY = `${this.STORAGE_PREFIX}recent-files`;
  private readonly AUTO_SAVE_KEY = `${this.STORAGE_PREFIX}auto-save-data`;

  private autoSaveTimer: NodeJS.Timeout | null = null;
  private autoSaveSettings: AutoSaveSettings = {
    enabled: true,
    interval: 30, // 30秒間隔
    maxBackups: 5,
  };

  /**
   * アプリケーション設定を読み込む
   */
  loadSettings(): AppSettings {
    try {
      const stored = localStorage.getItem(this.SETTINGS_KEY);
      if (stored) {
        const settings = JSON.parse(stored);
        return this.validateAndMergeSettings(settings);
      }
    } catch (error) {
      console.warn('Failed to load settings from localStorage:', error);
    }

    return this.getDefaultSettings();
  }

  /**
   * アプリケーション設定を保存する
   */
  saveSettings(settings: AppSettings): void {
    try {
      localStorage.setItem(this.SETTINGS_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error('Failed to save settings to localStorage:', error);
      throw new Error('設定の保存に失敗しました');
    }
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

  /**
   * 設定を検証し、デフォルト値とマージする
   */
  private validateAndMergeSettings(stored: unknown): AppSettings {
    const defaults = this.getDefaultSettings();
    
    // 型安全な方法でストアドデータを検証
    const storedObj = stored && typeof stored === 'object' ? stored as Record<string, unknown> : {};
    
    return {
      editor: { 
        ...defaults.editor, 
        ...(storedObj.editor && typeof storedObj.editor === 'object' ? storedObj.editor as Partial<typeof defaults.editor> : {})
      },
      mindmap: { 
        ...defaults.mindmap, 
        ...(storedObj.mindmap && typeof storedObj.mindmap === 'object' ? storedObj.mindmap as Partial<typeof defaults.mindmap> : {})
      },
      language: typeof storedObj.language === 'string' && ['ja', 'en'].includes(storedObj.language) ? storedObj.language as 'ja' | 'en' : defaults.language,
      debug: typeof storedObj.debug === 'boolean' ? storedObj.debug : defaults.debug,
      autoBackup: typeof storedObj.autoBackup === 'boolean' ? storedObj.autoBackup : defaults.autoBackup,
      recentFiles: Array.isArray(storedObj.recentFiles) ? storedObj.recentFiles as string[] : defaults.recentFiles,
    };
  }

  /**
   * セッション状態を保存する
   */
  saveSessionState(state: Partial<SessionState>): void {
    try {
      const currentState = this.loadSessionState();
      const newState: SessionState = {
        ...currentState,
        ...state,
        timestamp: Date.now(),
      };
      localStorage.setItem(this.SESSION_KEY, JSON.stringify(newState));
    } catch (error) {
      console.warn('Failed to save session state:', error);
    }
  }

  /**
   * セッション状態を読み込む
   */
  loadSessionState(): SessionState {
    try {
      const stored = localStorage.getItem(this.SESSION_KEY);
      if (stored) {
        const state = JSON.parse(stored);
        // 1日以上古いセッション状態は無視
        const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
        if (state.timestamp && state.timestamp > oneDayAgo) {
          return state;
        }
      }
    } catch (error) {
      console.warn('Failed to load session state:', error);
    }

    return {
      timestamp: Date.now(),
    };
  }

  /**
   * セッション状態をクリアする
   */
  clearSessionState(): void {
    try {
      localStorage.removeItem(this.SESSION_KEY);
    } catch (error) {
      console.warn('Failed to clear session state:', error);
    }
  }

  /**
   * 最近開いたファイル一覧を取得
   */
  getRecentFiles(): RecentFile[] {
    try {
      const stored = localStorage.getItem(this.RECENT_FILES_KEY);
      if (stored) {
        const files = JSON.parse(stored);
        if (Array.isArray(files)) {
          // 日付順でソート
          return files.sort((a, b) => b.lastAccessed - a.lastAccessed);
        }
      }
    } catch (error) {
      console.warn('Failed to load recent files:', error);
    }

    return [];
  }

  /**
   * 最近開いたファイルに追加
   */
  addRecentFile(file: Omit<RecentFile, 'lastAccessed'>): void {
    try {
      const recentFiles = this.getRecentFiles();
      
      // 既存のエントリを削除
      const filtered = recentFiles.filter(f => f.path !== file.path);
      
      // 新しいエントリを先頭に追加
      const newEntry: RecentFile = {
        ...file,
        lastAccessed: Date.now(),
      };
      
      filtered.unshift(newEntry);
      
      // 最大10件まで保持
      const limited = filtered.slice(0, 10);
      
      localStorage.setItem(this.RECENT_FILES_KEY, JSON.stringify(limited));
    } catch (error) {
      console.warn('Failed to add recent file:', error);
    }
  }

  /**
   * 最近開いたファイルから削除
   */
  removeRecentFile(path: string): void {
    try {
      const recentFiles = this.getRecentFiles();
      const filtered = recentFiles.filter(f => f.path !== path);
      localStorage.setItem(this.RECENT_FILES_KEY, JSON.stringify(filtered));
    } catch (error) {
      console.warn('Failed to remove recent file:', error);
    }
  }

  /**
   * 最近開いたファイル一覧をクリア
   */
  clearRecentFiles(): void {
    try {
      localStorage.removeItem(this.RECENT_FILES_KEY);
    } catch (error) {
      console.warn('Failed to clear recent files:', error);
    }
  }

  /**
   * 自動保存を開始
   */
  startAutoSave(saveCallback: () => Promise<void>): void {
    if (!this.autoSaveSettings.enabled) return;

    this.stopAutoSave();
    
    this.autoSaveTimer = setInterval(async () => {
      try {
        await saveCallback();
        console.log('Auto-save completed');
      } catch (error) {
        console.warn('Auto-save failed:', error);
      }
    }, this.autoSaveSettings.interval * 1000);
  }

  /**
   * 自動保存を停止
   */
  stopAutoSave(): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = null;
    }
  }

  /**
   * 自動保存データを保存
   */
  saveAutoSaveData(content: string, filename?: string): void {
    if (!this.autoSaveSettings.enabled) return;

    try {
      const autoSaveData = this.getAutoSaveData();
      const timestamp = Date.now();
      
      // 新しいバックアップを追加
      autoSaveData.push({
        content,
        filename: filename || 'untitled',
        timestamp,
      });

      // 最大バックアップ数を超えた場合、古いものを削除
      if (autoSaveData.length > this.autoSaveSettings.maxBackups) {
        autoSaveData.splice(0, autoSaveData.length - this.autoSaveSettings.maxBackups);
      }

      localStorage.setItem(this.AUTO_SAVE_KEY, JSON.stringify(autoSaveData));
    } catch (error) {
      console.warn('Failed to save auto-save data:', error);
    }
  }

  /**
   * 自動保存データを取得
   */
  getAutoSaveData(): Array<{content: string; filename: string; timestamp: number}> {
    try {
      const stored = localStorage.getItem(this.AUTO_SAVE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        if (Array.isArray(data)) {
          return data;
        }
      }
    } catch (error) {
      console.warn('Failed to load auto-save data:', error);
    }

    return [];
  }

  /**
   * 自動保存データをクリア
   */
  clearAutoSaveData(): void {
    try {
      localStorage.removeItem(this.AUTO_SAVE_KEY);
    } catch (error) {
      console.warn('Failed to clear auto-save data:', error);
    }
  }

  /**
   * 自動保存設定を更新
   */
  updateAutoSaveSettings(settings: Partial<AutoSaveSettings>): void {
    this.autoSaveSettings = { ...this.autoSaveSettings, ...settings };
  }

  /**
   * 自動保存設定を取得
   */
  getAutoSaveSettings(): AutoSaveSettings {
    return { ...this.autoSaveSettings };
  }

  /**
   * 設定をエクスポート
   */
  exportSettings(): string {
    const settings = this.loadSettings();
    const sessionState = this.loadSessionState();
    const recentFiles = this.getRecentFiles();
    
    const exportData = {
      settings,
      sessionState,
      recentFiles,
      autoSaveSettings: this.autoSaveSettings,
      exportedAt: new Date().toISOString(),
      version: '1.0',
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * 設定をインポート
   */
  importSettings(jsonData: string): void {
    try {
      const data = JSON.parse(jsonData);
      
      if (data.settings) {
        this.saveSettings(data.settings);
      }
      
      if (data.recentFiles && Array.isArray(data.recentFiles)) {
        localStorage.setItem(this.RECENT_FILES_KEY, JSON.stringify(data.recentFiles));
      }
      
      if (data.autoSaveSettings) {
        this.updateAutoSaveSettings(data.autoSaveSettings);
      }
      
      // セッション状態は現在のものを維持（インポートしない）
      
    } catch (error) {
      console.error('Failed to import settings:', error);
      throw new Error('設定のインポートに失敗しました。正しいJSONファイルを選択してください。');
    }
  }

  /**
   * 全ての設定データをクリア
   */
  clearAllData(): void {
    try {
      // 設定関連のキーをすべて削除
      const keys = [
        this.SETTINGS_KEY,
        this.SESSION_KEY,
        this.RECENT_FILES_KEY,
        this.AUTO_SAVE_KEY,
      ];
      
      keys.forEach(key => {
        localStorage.removeItem(key);
      });
      
      this.stopAutoSave();
    } catch (error) {
      console.warn('Failed to clear all data:', error);
    }
  }

  /**
   * ストレージ使用量を取得（デバッグ用）
   */
  getStorageUsage(): { [key: string]: number } {
    const usage: { [key: string]: number } = {};
    
    try {
      const keys = [
        this.SETTINGS_KEY,
        this.SESSION_KEY,
        this.RECENT_FILES_KEY,
        this.AUTO_SAVE_KEY,
      ];
      
      keys.forEach(key => {
        const data = localStorage.getItem(key);
        usage[key] = data ? new Blob([data]).size : 0;
      });
      
      // 総使用量も計算
      usage.total = Object.values(usage).reduce((sum, size) => sum + size, 0);
    } catch (error) {
      console.warn('Failed to calculate storage usage:', error);
    }
    
    return usage;
  }
}

// シングルトンインスタンス
export const settingsService = new SettingsService();