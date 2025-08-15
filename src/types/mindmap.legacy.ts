/**
 * レガシーマインドマップ型定義
 * 
 * @deprecated このファイルは非推奨です。
 * 代わりに src/types/index.ts のZodベースの型を使用してください。
 * 
 * マイグレーションガイド:
 * - `import { MindmapData } from './mindmap.legacy'` → `import { MindmapData } from './index'`
 * - すべての型定義はZodスキーマから自動生成されるようになりました
 * - カスタム型が必要な場合は src/types/index.ts に追加してください
 */

// 以下は下位互換性のためのre-export（Zodベースの型）
export type {
  MindmapData,
  MindmapNode,
  CustomSchema,
  FieldDefinition,
  // レガシー型は新しいZodベースの型にマップ
} from './index';

export type {
  ParseError,
  SchemaError,
  ValidationResult,
  FileError,
  NodeSelection,
  NodeEvent,
  StyleSettings
} from './index';