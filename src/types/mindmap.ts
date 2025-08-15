/**
 * マインドマップのコアデータ型定義
 * 
 * @deprecated このファイルは非推奨です。
 * 新しい統一された型システムでは、JSON Schemaから自動生成された型を使用します。
 * 
 * マイグレーションガイド:
 * - `import { MindmapData } from './mindmap'` → `import { MindmapData } from './index'`
 * - すべての主要な型は src/types/index.ts からインポートしてください
 */

// 下位互換性のためのre-export
export * from './index';