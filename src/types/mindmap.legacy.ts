/**
 * レガシーマインドマップ型定義
 * 
 * @deprecated このファイルは非推奨です。
 * 代わりに src/types/generated/mindmap.ts の自動生成された型を使用してください。
 * 
 * マイグレーションガイド:
 * - `import { MindmapData } from './mindmap'` → `import { MindmapData } from './generated/mindmap'`
 * - すべての型定義はJSON Schemaから自動生成されるようになりました
 * - カスタム型が必要な場合は src/types/index.ts に追加してください
 */

// 以下は下位互換性のためのre-export
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

export type {
  ParseError,
  SchemaError,
  ValidationResult,
  FileError,
  NodeSelection,
  NodeEvent,
  StyleSettings
} from './index';