// 型定義のエクスポート
/**
 * 型定義のエクスポート
 * 
 * このファイルは、アプリケーション全体で使用される
 * 型定義を一元的にエクスポートします。
 */

// マインドマップ関連の型
export * from './mindmap';

// サービス関連の型
export * from './services';

// 状態管理関連の型
export * from './store';

// 型ガード関数
export const isValidMindmapData = (data: any): data is import('./mindmap').MindmapData => {
  return (
    data &&
    typeof data === 'object' &&
    typeof data.version === 'string' &&
    typeof data.title === 'string' &&
    data.root &&
    typeof data.root === 'object' &&
    typeof data.root.id === 'string' &&
    typeof data.root.title === 'string'
  );
};

export const isValidMindmapNode = (node: any): node is import('./mindmap').MindmapNode => {
  return (
    node &&
    typeof node === 'object' &&
    typeof node.id === 'string' &&
    typeof node.title === 'string'
  );
};

export const isParseError = (error: any): error is import('./mindmap').ParseError => {
  return (
    error &&
    typeof error === 'object' &&
    typeof error.line === 'number' &&
    typeof error.column === 'number' &&
    typeof error.message === 'string' &&
    ['error', 'warning', 'info'].includes(error.severity)
  );
};

export const isSchemaError = (error: any): error is import('./mindmap').SchemaError => {
  return (
    error &&
    typeof error === 'object' &&
    typeof error.path === 'string' &&
    typeof error.message === 'string'
  );
};

// ユーティリティ型
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type OptionalFields<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type Nullable<T> = T | null;

export type Optional<T> = T | undefined;

// イベント関連の型
export type EventCallback<T = any> = (data: T) => void;

export type AsyncEventCallback<T = any> = (data: T) => Promise<void>;

// エラー関連の型
export type ErrorType = 'parse' | 'validation' | 'file' | 'network' | 'unknown';

export interface BaseError {
  type: ErrorType;
  message: string;
  timestamp: number;
  stack?: string;
}

// 設定関連の型
export type ThemeType = 'light' | 'dark' | 'auto';

export type LanguageType = 'ja' | 'en';

export type LayoutType = 'tree' | 'radial' | 'force';

// ファイル関連の型
export type FileFormat = 'json' | 'yaml';

export type FileEncoding = 'utf-8' | 'utf-16' | 'shift-jis';

// UI関連の型
export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export type ModalType = 'confirm' | 'prompt' | 'alert' | 'custom';

export type PanelType = 'editor' | 'mindmap' | 'sidebar' | 'settings' | 'error';

// 操作関連の型
export type ActionType = 'create' | 'read' | 'update' | 'delete';

export type OperationType = 'file' | 'node' | 'ui' | 'settings';

// バリデーション関連の型
export type ValidationSeverity = 'error' | 'warning' | 'info';

export type ValidationType = 'syntax' | 'schema' | 'custom' | 'business';