/**
 * マインドマップコア機能のタイプ定義
 * プラットフォーム非依存のコア型定義を集約
 */

// バリデーション関連
export interface ValidationRule {
  type: 'required' | 'minLength' | 'maxLength' | 'pattern' | 'min' | 'max' | 'range' | 'length';
  value?: string | number | RegExp;
  message?: string;
}

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

// スキーマとフィールド定義
export interface FieldDefinition {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'select' | 'multiselect';
  label: string;
  required?: boolean;
  options?: string[];
  validation?: ValidationRule[];
  defaultValue?: string | number | boolean | string[];
  description?: string;
}

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

export interface CustomSchema {
  version?: string;
  fields: FieldDefinition[];
  displayRules: DisplayRule[];
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

// マインドマップデータ構造
export interface MindmapNode {
  id: string;
  title: string;
  description?: string;
  children?: MindmapNode[];
  metadata?: Record<string, unknown>;
  position?: {
    x: number;
    y: number;
  };
  collapsed?: boolean;
  customFields?: Record<string, unknown>;
  type?: string;
  color?: string;
  icon?: string;
  priority?: 'critical' | 'high' | 'medium' | 'low';
  status?: 'draft' | 'pending' | 'in-progress' | 'review' | 'done' | 'cancelled' | 'deferred';
  createdAt?: string;
  updatedAt?: string;
  assignee?: string;
  deadline?: string;
  tags?: string[];
  links?: Array<{
    url: string;
    title: string;
    type?: 'reference' | 'documentation' | 'issue' | 'other';
  }>;
}

export interface MindmapData {
  version: string;
  title: string;
  root: MindmapNode;
  schema?: CustomSchema;
  settings?: MindmapSettings;
  description?: string;
  author?: string;
  createdAt?: string;
  updatedAt?: string;
  metadata?: Record<string, unknown>;
}

// 描画設定（プラットフォーム非依存）
export interface MindmapSettings {
  theme?: 'light' | 'dark' | 'auto';
  layout?: 'tree' | 'radial' | 'force';
  zoom?: number;
  center?: {
    x: number;
    y: number;
  };
  nodeSize?: 'small' | 'medium' | 'large';
  nodeWidth?: number;
  maxNodeWidth?: number;
  nodeSpacing?: number;
  levelSpacing?: number;
  verticalSpacing?: number;
  enableAnimation?: boolean;
  enableAnimations?: boolean;
  autoLayout?: boolean;
  showMinimap?: boolean;
}

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
  onBackgroundClick?: (event: MouseEvent) => void;
}

export interface RenderOptions {
  container: SVGSVGElement;
  settings: MindmapSettings;
  eventHandlers?: RendererEventHandlers;
}

// パーサー用の型定義
export interface ParseOptions {
  strictMode?: boolean;
  validateSchema?: boolean;
  customSchema?: CustomSchema;
}

export interface ParseResult {
  data: MindmapData | null;
  errors: ParseError[];
  warnings: ParseError[];
  valid: boolean;
}