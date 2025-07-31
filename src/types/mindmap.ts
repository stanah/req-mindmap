/**
 * マインドマップのコアデータ型定義
 * 
 * このファイルは、マインドマップアプリケーションで使用される
 * 基本的なデータ構造とインターフェースを定義します。
 */

/**
 * バリデーションルール
 */
export interface ValidationRule {
  type: 'required' | 'minLength' | 'maxLength' | 'pattern' | 'min' | 'max';
  value?: any;
  message?: string;
}

/**
 * フィールド定義
 * カスタムスキーマで使用されるフィールドの定義
 */
export interface FieldDefinition {
  /** フィールド名 */
  name: string;
  /** フィールドの型 */
  type: 'string' | 'number' | 'boolean' | 'date' | 'select' | 'multiselect';
  /** 表示用ラベル */
  label: string;
  /** 必須フィールドかどうか */
  required?: boolean;
  /** select/multiselect用の選択肢 */
  options?: string[];
  /** バリデーションルール */
  validation?: ValidationRule[];
  /** デフォルト値 */
  defaultValue?: any;
  /** フィールドの説明 */
  description?: string;
}

/**
 * 表示ルール
 * カスタムフィールドの表示方法を定義
 */
export interface DisplayRule {
  /** 対象フィールド名 */
  field: string;
  /** 表示タイプ */
  displayType: 'badge' | 'icon' | 'color' | 'text';
  /** 表示条件（オプション） */
  condition?: string;
  /** スタイル設定 */
  style?: Record<string, any>;
  /** 表示位置 */
  position?: 'inline' | 'tooltip' | 'sidebar';
}

/**
 * カスタムスキーマ定義
 * プロジェクト固有のフィールドと表示ルールを定義
 */
export interface CustomSchema {
  /** スキーマのバージョン */
  version?: string;
  /** フィールド定義の配列 */
  fields: FieldDefinition[];
  /** 表示ルールの配列 */
  displayRules: DisplayRule[];
  /** スキーマの説明 */
  description?: string;
  /** 作成日時 */
  createdAt?: string;
  /** 更新日時 */
  updatedAt?: string;
}

/**
 * マインドマップノード
 * 階層構造を持つマインドマップの各ノードを表現
 */
export interface MindmapNode {
  /** ノードの一意識別子 */
  id: string;
  /** ノードのタイトル */
  title: string;
  /** ノードの詳細説明（オプション） */
  description?: string;
  /** 子ノードの配列 */
  children?: MindmapNode[];
  /** 拡張可能なメタデータ */
  metadata?: Record<string, any>;
  /** ノードの表示位置 */
  position?: {
    x: number;
    y: number;
  };
  /** 折りたたみ状態 */
  collapsed?: boolean;
  /** カスタムフィールドの値 */
  customFields?: Record<string, any>;
  /** ノードの種類（オプション） */
  type?: string;
  /** ノードの色（オプション） */
  color?: string;
  /** ノードのアイコン（オプション） */
  icon?: string;
  /** ノードの優先度（オプション） */
  priority?: 'high' | 'medium' | 'low';
  /** ノードのステータス（オプション） */
  status?: 'todo' | 'in-progress' | 'done' | 'blocked';
  /** 作成日時 */
  createdAt?: string;
  /** 更新日時 */
  updatedAt?: string;
  /** 担当者 */
  assignee?: string;
  /** 期限 */
  deadline?: string;
  /** タグ */
  tags?: string[];
  /** 関連リンク */
  links?: Array<{
    url: string;
    title: string;
    type?: 'reference' | 'documentation' | 'issue' | 'other';
  }>;
}

/**
 * マインドマップ設定
 */
export interface MindmapSettings {
  /** テーマ */
  theme?: 'light' | 'dark' | 'auto';
  /** レイアウト */
  layout?: 'tree' | 'radial' | 'force';
  /** ズームレベル */
  zoom?: number;
  /** 中心位置 */
  center?: {
    x: number;
    y: number;
  };
  /** ノードの最大幅 */
  maxNodeWidth?: number;
  /** ノード間の間隔 */
  nodeSpacing?: number;
  /** レベル間の間隔 */
  levelSpacing?: number;
  /** アニメーション有効/無効 */
  enableAnimation?: boolean;
  /** 自動レイアウト有効/無効 */
  autoLayout?: boolean;
}

/**
 * マインドマップデータ
 * 完全なマインドマップファイルの構造を表現
 */
export interface MindmapData {
  /** データ形式のバージョン */
  version: string;
  /** マインドマップのタイトル */
  title: string;
  /** ルートノード */
  root: MindmapNode;
  /** カスタムスキーマ定義（オプション） */
  schema?: CustomSchema;
  /** 表示設定 */
  settings?: MindmapSettings;
  /** マインドマップの説明 */
  description?: string;
  /** 作成者 */
  author?: string;
  /** 作成日時 */
  createdAt?: string;
  /** 更新日時 */
  updatedAt?: string;
  /** メタデータ */
  metadata?: Record<string, any>;
}

/**
 * パースエラー
 * ファイル解析時のエラー情報
 */
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

/**
 * スキーマエラー
 * データバリデーション時のエラー情報
 */
export interface SchemaError {
  /** エラーが発生したデータパス */
  path: string;
  /** エラーメッセージ */
  message: string;
  /** エラーが発生した値 */
  value: any;
  /** 期待される値の型や形式 */
  expected?: string;
  /** エラーコード */
  code?: string;
}

/**
 * バリデーション結果
 */
export interface ValidationResult {
  /** バリデーションが成功したかどうか */
  valid: boolean;
  /** エラーの配列 */
  errors: SchemaError[];
  /** 警告の配列 */
  warnings?: SchemaError[];
}

/**
 * ファイルエラー
 * ファイル操作時のエラー情報
 */
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

/**
 * ノード選択情報
 */
export interface NodeSelection {
  /** 選択されたノードのID */
  nodeId: string;
  /** 選択の種類 */
  type: 'click' | 'hover' | 'focus';
  /** 選択された時刻 */
  timestamp: number;
}

/**
 * ノード操作イベント
 */
export interface NodeEvent {
  /** イベントの種類 */
  type: 'select' | 'collapse' | 'expand' | 'edit' | 'delete' | 'move';
  /** 対象ノードのID */
  nodeId: string;
  /** イベントデータ */
  data?: any;
  /** イベント発生時刻 */
  timestamp: number;
}

/**
 * エディタ設定
 */
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

/**
 * アプリケーション設定
 */
export interface AppSettings {
  /** エディタ設定 */
  editor: EditorSettings;
  /** マインドマップ設定 */
  mindmap: MindmapSettings;
  /** 言語設定 */
  language: 'ja' | 'en';
  /** デバッグモード */
  debug: boolean;
  /** 自動バックアップ */
  autoBackup: boolean;
  /** 最近開いたファイル */
  recentFiles: string[];
}