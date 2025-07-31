// マインドマップのデータ構造定義

export interface MindmapNode {
  id: string;
  title: string;
  description?: string;
  children?: MindmapNode[];
  metadata?: Record<string, any>; // 拡張可能なメタデータ
  position?: { x: number; y: number };
  collapsed?: boolean;
  customFields?: Record<string, any>; // カスタムフィールド
}

export interface MindmapData {
  version: string;
  title: string;
  root: MindmapNode;
  schema?: CustomSchema; // カスタムスキーマ定義
  settings?: {
    theme?: 'light' | 'dark';
    layout?: 'tree' | 'radial';
  };
}

// カスタムスキーマ定義
export interface CustomSchema {
  fields: FieldDefinition[];
  displayRules: DisplayRule[];
}

export interface FieldDefinition {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'select' | 'multiselect';
  label: string;
  required?: boolean;
  options?: string[]; // select/multiselect用
  validation?: ValidationRule[];
}

export interface DisplayRule {
  field: string;
  displayType: 'badge' | 'icon' | 'color' | 'text';
  condition?: string; // 表示条件
  style?: Record<string, any>;
}

export interface ValidationRule {
  type: 'required' | 'minLength' | 'maxLength' | 'pattern' | 'custom';
  value?: any;
  message?: string;
}

// パースエラー
export interface ParseError {
  line: number;
  column: number;
  message: string;
  severity: 'error' | 'warning';
}

// バリデーション結果
export interface ValidationResult {
  valid: boolean;
  errors: SchemaError[];
}

export interface SchemaError {
  path: string;
  message: string;
  value: any;
}

// ファイルエラー
export interface FileError {
  type: 'not_found' | 'permission_denied' | 'invalid_format' | 'unknown';
  message: string;
  path?: string;
}

// エディタ設定
export interface EditorSettings {
  theme: 'light' | 'dark';
  fontSize: number;
  wordWrap: boolean;
  minimap: boolean;
  language: 'json' | 'yaml';
}

// マインドマップ設定
export interface MindmapSettings {
  layout: 'tree' | 'radial';
  nodeSize: 'small' | 'medium' | 'large';
  showMetadata: boolean;
  autoCollapse: boolean;
  animationEnabled: boolean;
}