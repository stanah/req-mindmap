/**
 * ストアセレクター
 * 
 * このファイルは、ストアの状態から特定の値を取得するための
 * セレクター関数を定義します。
 */

import type { AppState } from '../types/store';

/**
 * ストアセレクター関数の集合
 */
export const selectors = {
  /**
   * ファイルが開かれているかどうか
   */
  hasOpenFile: (state: AppState): boolean => {
    return state.file.currentFile !== null;
  },

  /**
   * ファイルが変更されているかどうか
   */
  isFileDirty: (state: AppState): boolean => {
    return state.file.isDirty;
  },

  /**
   * パースエラーがあるかどうか
   */
  hasParseErrors: (state: AppState): boolean => {
    return state.parse.parseErrors.length > 0;
  },

  /**
   * ノードが選択されているかどうか
   */
  hasSelectedNode: (state: AppState): boolean => {
    return state.ui.selectedNodeId !== null;
  },

  /**
   * ローディング中かどうか
   */
  isLoading: (state: AppState): boolean => {
    return state.ui.isLoading;
  },

  /**
   * 通知があるかどうか
   */
  hasNotifications: (state: AppState): boolean => {
    return state.ui.notifications.length > 0;
  },

  /**
   * モーダルが開いているかどうか
   */
  isModalOpen: (state: AppState): boolean => {
    return state.ui.modal !== null;
  },

  /**
   * 現在のファイル名を取得
   */
  getCurrentFileName: (state: AppState): string | null => {
    if (!state.file.currentFile) return null;
    return state.file.currentFile.split('/').pop() || null;
  },

  /**
   * 現在のファイル拡張子を取得
   */
  getCurrentFileExtension: (state: AppState): string | null => {
    const fileName = selectors.getCurrentFileName(state);
    if (!fileName) return null;
    const parts = fileName.split('.');
    return parts.length > 1 ? parts.pop()!.toLowerCase() : null;
  },

  /**
   * エラー数を取得
   */
  getErrorCount: (state: AppState): number => {
    return state.parse.parseErrors.filter(error => error.severity === 'error').length;
  },

  /**
   * 警告数を取得
   */
  getWarningCount: (state: AppState): number => {
    return state.parse.parseErrors.filter(error => error.severity === 'warning').length;
  },

  /**
   * パース成功率を取得
   */
  getParseSuccessRate: (state: AppState): number => {
    const total = state.parse.parseSuccessCount + state.parse.parseErrorCount;
    if (total === 0) return 0;
    return (state.parse.parseSuccessCount / total) * 100;
  },

  /**
   * 最新の通知を取得
   */
  getLatestNotification: (state: AppState) => {
    const notifications = state.ui.notifications;
    return notifications.length > 0 ? notifications[notifications.length - 1] : null;
  },

  /**
   * エラー通知の数を取得
   */
  getErrorNotificationCount: (state: AppState): number => {
    return state.ui.notifications.filter(n => n.type === 'error').length;
  },

  /**
   * ファイルサイズを人間が読みやすい形式で取得
   */
  getFormattedFileSize: (state: AppState): string => {
    const bytes = state.file.fileSize;
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },

  /**
   * 最後に保存された時刻を人間が読みやすい形式で取得
   */
  getFormattedLastSaved: (state: AppState): string | null => {
    if (!state.file.lastSaved) return null;
    
    const date = new Date(state.file.lastSaved);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return '今';
    if (diffMins < 60) return `${diffMins}分前`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}時間前`;
    
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}日前`;
    
    return date.toLocaleDateString('ja-JP');
  },

  /**
   * アプリケーションの状態サマリーを取得
   */
  getAppStatusSummary: (state: AppState) => {
    return {
      hasFile: selectors.hasOpenFile(state),
      isDirty: selectors.isFileDirty(state),
      hasErrors: selectors.hasParseErrors(state),
      errorCount: selectors.getErrorCount(state),
      warningCount: selectors.getWarningCount(state),
      isLoading: selectors.isLoading(state),
      hasNotifications: selectors.hasNotifications(state),
      notificationCount: state.ui.notifications.length,
      selectedNode: state.ui.selectedNodeId,
      fileSize: selectors.getFormattedFileSize(state),
      lastSaved: selectors.getFormattedLastSaved(state),
    };
  },

  /**
   * デバッグ情報を取得
   */
  getDebugInfo: (state: AppState) => {
    return {
      initialized: state.initialized,
      debugMode: state.debugMode,
      parseStats: {
        successCount: state.parse.parseSuccessCount,
        errorCount: state.parse.parseErrorCount,
        successRate: selectors.getParseSuccessRate(state),
        lastParsed: state.parse.lastParsed,
        isParsing: state.parse.isParsing,
      },
      fileInfo: {
        path: state.file.currentFile,
        format: state.file.fileFormat,
        size: state.file.fileSize,
        encoding: state.file.encoding,
        isDirty: state.file.isDirty,
        lastSaved: state.file.lastSaved,
      },
      uiState: {
        sidebarOpen: state.ui.sidebarOpen,
        settingsPanelOpen: state.ui.settingsPanelOpen,
        errorPanelOpen: state.ui.errorPanelOpen,
        fullscreen: state.ui.fullscreen,
        darkMode: state.ui.darkMode,
        panelSizes: state.ui.panelSizes,
      },
    };
  },
};

/**
 * セレクターのタイプ定義
 */
export type Selectors = typeof selectors;

/**
 * セレクター関数の型
 */
export type SelectorFunction<T> = (state: AppState) => T;

/**
 * カスタムセレクターを作成するヘルパー関数
 */
export function createSelector<T>(
  selector: SelectorFunction<T>
): SelectorFunction<T> {
  return selector;
}

/**
 * 複数のセレクターを組み合わせるヘルパー関数
 */
export function combineSelectors<T extends Record<string, unknown>>(
  selectors: { [K in keyof T]: SelectorFunction<T[K]> }
): SelectorFunction<T> {
  return (state: AppState) => {
    const result = {} as T;
    for (const key in selectors) {
      result[key] = selectors[key](state);
    }
    return result;
  };
}

/**
 * メモ化されたセレクターを作成するヘルパー関数
 * （簡易版、実際のプロジェクトではreselectライブラリの使用を推奨）
 */
export function createMemoizedSelector<T>(
  selector: SelectorFunction<T>,
  equalityFn?: (a: T, b: T) => boolean
): SelectorFunction<T> {
  let lastResult: T;
  let lastState: AppState;
  
  return (state: AppState) => {
    if (state !== lastState) {
      const newResult = selector(state);
      
      if (equalityFn) {
        if (!equalityFn(lastResult, newResult)) {
          lastResult = newResult;
        }
      } else {
        lastResult = newResult;
      }
      
      lastState = state;
    }
    
    return lastResult;
  };
}