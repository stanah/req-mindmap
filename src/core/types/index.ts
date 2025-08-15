/**
 * マインドマップコア機能のタイプ定義
 * プラットフォーム非依存のコア型定義を集約
 */

// バリデーション関連（メインの型定義を使用）
export type { ValidationRule } from '../../types';

export interface ValidationResult {
  valid: boolean;
  errors: SchemaError[];
  warnings?: SchemaError[];
}

export interface ParseError {
  line: number;
  column: number;
  message: string;
  severity: 'error' | 'warning' | 'info';
  code?: string;
  details?: string;
}

export interface SchemaError {
  path: string;
  message: string;
  value: unknown;
  expected?: string;
  code?: string;
}

// フィールド定義（メインの型定義を使用）
export type { FieldDefinition } from '../../types';

export interface StyleSettings {
  backgroundColor?: string;
  color?: string;
  borderColor?: string;
  icon?: string;
  fontSize?: number;
  fontWeight?: string | number;
  [key: string]: string | number | undefined;
}

export interface DisplayRule {
  field: string;
  displayType: 'badge' | 'icon' | 'color' | 'text';
  condition?: string;
  style?: Record<string, StyleSettings>;
  position?: 'inline' | 'tooltip' | 'sidebar';
}

// カスタムスキーマ（メインの型定義を使用）
export type { CustomSchema } from '../../types';

// マインドマップデータ構造（メインの型定義を使用）
export type { MindmapNode, MindmapData } from '../../types';

// 描画設定（メインの型定義を使用）
export type { MindmapSettings } from '../../types';

// イベント関連
export interface NodeSelection {
  nodeId: string;
  type: 'click' | 'hover' | 'focus';
  timestamp: number;
}

export interface NodeEvent {
  type: 'select' | 'collapse' | 'expand' | 'edit' | 'delete' | 'move';
  nodeId: string;
  data?: unknown;
  timestamp: number;
}

// レンダラー用の型定義
export interface RendererEventHandlers {
  onNodeClick?: (nodeId: string, event: MouseEvent) => void;
  onNodeHover?: (nodeId: string, event: MouseEvent) => void;
  onNodeLeave?: (nodeId: string, event: MouseEvent) => void;
  onNodeToggle?: (nodeId: string, event: MouseEvent) => void;
  onBackgroundClick?: (event: MouseEvent) => void;
}

export interface RenderOptions {
  container: SVGSVGElement;
  settings: import('../../types').MindmapSettings;
  eventHandlers?: RendererEventHandlers;
}

// パーサー用の型定義
export interface ParseOptions {
  strictMode?: boolean;
  validateSchema?: boolean;
  customSchema?: import('../../types').CustomSchema;
}

export interface ParseResult {
  data: import('../../types').MindmapData | null;
  errors: ParseError[];
  warnings: ParseError[];
  valid: boolean;
}