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
export const isValidMindmapData = (data: unknown): data is import('./mindmap').MindmapData => {
  if (!data || typeof data !== 'object') return false;

  const obj = data as Record<string, unknown>;

  return Boolean(
    typeof obj.version === 'string' &&
    typeof obj.title === 'string' &&
    obj.root &&
    typeof obj.root === 'object' &&
    obj.root !== null &&
    typeof (obj.root as Record<string, unknown>).id === 'string' &&
    typeof (obj.root as Record<string, unknown>).title === 'string'
  );
};

export const isValidMindmapNode = (node: unknown): node is import('./mindmap').MindmapNode => {
  if (!node || typeof node !== 'object') return false;

  const obj = node as Record<string, unknown>;

  return Boolean(
    typeof obj.id === 'string' &&
    typeof obj.title === 'string'
  );
};

export const isParseError = (error: unknown): error is import('./mindmap').ParseError => {
  if (!error || typeof error !== 'object') return false;

  const obj = error as Record<string, unknown>;

  return Boolean(
    typeof obj.line === 'number' &&
    typeof obj.column === 'number' &&
    typeof obj.message === 'string' &&
    typeof obj.severity === 'string' &&
    ['error', 'warning', 'info'].includes(obj.severity as string)
  );
};

export const isSchemaError = (error: unknown): error is import('./mindmap').SchemaError => {
  if (!error || typeof error !== 'object') return false;

  const obj = error as Record<string, unknown>;

  return Boolean(
    typeof obj.path === 'string' &&
    typeof obj.message === 'string'
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
export type EventCallback<T = unknown> = (data: T) => void;

export type AsyncEventCallback<T = unknown> = (data: T) => Promise<void>;

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