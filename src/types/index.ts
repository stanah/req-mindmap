/**
 * 統一された型定義エクスポート
 * 
 * このファイルは、アプリケーション全体で使用される型定義の
 * 統一されたエントリーポイントです。
 */

// JSON Schemaから自動生成された型定義（メイン）
export type {
  MindmapData,
  MindmapNode,
  CustomSchema,
  FieldDefinition,
  ValidationRule,
  DisplayRule,
  MindmapSettings,
  TagDefinition
} from './generated/mindmap';

// サービス関連の型
export * from './services';

// 状態管理関連の型
export * from './store';

// 手動定義が必要な追加型（JSON Schemaで表現が困難なもの）
export interface ParseError {
  /** エラーが発生した行番号 */
  line: number;
  /** エラーが発生した列番号 */
  column: number;
  /** エラーメッセージ */
  message: string;
  /** エラーの重要度 */
  severity: 'error' | 'warning' | 'info';
  /** エラーコード（オプション） */
  code?: string;
  /** エラーの詳細情報 */
  details?: string;
}

export interface SchemaError {
  /** エラーが発生したデータパス */
  path: string;
  /** エラーメッセージ */
  message: string;
  /** エラーが発生した値 */
  value: unknown;
  /** 期待される値の型や形式 */
  expected?: string;
  /** エラーコード */
  code?: string;
}

export interface ValidationResult {
  /** バリデーションが成功したかどうか */
  valid: boolean;
  /** エラーの配列 */
  errors: SchemaError[];
  /** 警告の配列 */
  warnings?: SchemaError[];
}

export interface FileError {
  /** エラーの種類 */
  type: 'not_found' | 'permission_denied' | 'invalid_format' | 'network_error' | 'unknown';
  /** エラーメッセージ */
  message: string;
  /** ファイルパス */
  path?: string;
  /** 元のエラーオブジェクト */
  originalError?: Error;
}

export interface NodeSelection {
  /** 選択されたノードのID */
  nodeId: string;
  /** 選択の種類 */
  type: 'click' | 'hover' | 'focus';
  /** 選択された時刻 */
  timestamp: number;
}

export interface NodeEvent {
  /** イベントの種類 */
  type: 'select' | 'collapse' | 'expand' | 'edit' | 'delete' | 'move';
  /** 対象ノードのID */
  nodeId: string;
  /** イベントデータ */
  data?: unknown;
  /** イベント発生時刻 */
  timestamp: number;
}

export interface EditorSettings {
  /** 言語モード */
  language: 'json' | 'yaml';
  /** テーマ */
  theme: 'vs-light' | 'vs-dark' | 'hc-black';
  /** フォントサイズ */
  fontSize: number;
  /** タブサイズ */
  tabSize: number;
  /** 自動フォーマット */
  formatOnType: boolean;
  /** 自動保存 */
  autoSave: boolean;
  /** 行番号表示 */
  lineNumbers: boolean;
  /** 折り返し */
  wordWrap: boolean;
  /** ミニマップ表示 */
  minimap: boolean;
}

// MindmapSettingsをインポートして使用
import type { MindmapSettings as GeneratedMindmapSettings } from './generated/mindmap';

export interface AppSettings {
  /** エディタ設定 */
  editor: EditorSettings;
  /** マインドマップ設定 */
  mindmap: GeneratedMindmapSettings;
  /** 言語設定 */
  language: 'ja' | 'en';
  /** デバッグモード */
  debug: boolean;
  /** 自動バックアップ */
  autoBackup: boolean;
  /** 最近開いたファイル */
  recentFiles: string[];
}

// スタイル設定の型定義（DisplayRuleで使用）
export interface StyleSettings {
  /** 背景色 */
  backgroundColor?: string;
  /** テキスト色 */
  color?: string;
  /** ボーダー色 */
  borderColor?: string;
  /** アイコン */
  icon?: string;
  /** フォントサイズ */
  fontSize?: number;
  /** フォントウェイト */
  fontWeight?: string | number;
  /** その他のスタイルプロパティ */
  [key: string]: string | number | undefined;
}

// 型ガード関数
import type { MindmapData as GeneratedMindmapData, MindmapNode as GeneratedMindmapNode } from './generated/mindmap';

export const isValidMindmapData = (data: unknown): data is GeneratedMindmapData => {
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

export const isValidMindmapNode = (node: unknown): node is GeneratedMindmapNode => {
  if (!node || typeof node !== 'object') return false;

  const obj = node as Record<string, unknown>;

  return Boolean(
    typeof obj.id === 'string' &&
    typeof obj.title === 'string'
  );
};

export const isParseError = (error: unknown): error is ParseError => {
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

export const isSchemaError = (error: unknown): error is SchemaError => {
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