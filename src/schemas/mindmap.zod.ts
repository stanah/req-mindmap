/**
 * Zodスキーマ定義
 * マインドマップのデータ構造をZodで定義し、型安全性とランタイムバリデーションを提供
 */

import { z } from 'zod';

/**
 * ノードの優先度
 */
export const NodePrioritySchema = z.enum(['critical', 'high', 'medium', 'low']);

/**
 * ノードのステータス
 */
export const NodeStatusSchema = z.enum([
  'draft',
  'pending', 
  'in-progress',
  'review',
  'done',
  'cancelled',
  'deferred'
]);

/**
 * フィールドタイプ
 */
export const FieldTypeSchema = z.enum([
  'string',
  'number',
  'boolean',
  'date',
  'select',
  'multiselect'
]);

/**
 * バリデーションルール
 */
export const ValidationRuleSchema = z.object({
  type: z.enum(['required', 'min', 'max', 'pattern']),
  value: z.union([z.string(), z.number()]).optional(),
  message: z.string().optional()
});

/**
 * カスタムフィールド定義
 */
export const FieldDefinitionSchema = z.object({
  /** フィールド名 */
  name: z.string().min(1),
  
  /** フィールドの型 */
  type: FieldTypeSchema,
  
  /** 表示用ラベル */
  label: z.string().min(1),
  
  /** 必須フィールドかどうか */
  required: z.boolean().default(false),
  
  /** 説明文 */
  description: z.string().optional(),
  
  /** セレクト/マルチセレクト用のオプション */
  options: z.array(z.string()).optional(),
  
  /** フィールドの位置 */
  location: z.enum(['node', 'custom']).optional(),
  
  /** バリデーションルール */
  validation: z.array(ValidationRuleSchema).optional()
});

/**
 * タグ定義
 */
export const TagDefinitionSchema = z.object({
  /** タグ名 */
  name: z.string().min(1),
  
  /** タグの色 */
  color: z.string().optional(),
  
  /** タグの説明 */
  description: z.string().optional()
});

/**
 * 表示ルール
 */
export const DisplayRuleSchema = z.object({
  field: z.string(),
  displayType: z.enum(['text', 'badge', 'icon', 'progress']),
  position: z.enum(['inline', 'tooltip', 'detail']),
  style: z.record(z.any()).optional()
});

/**
 * カスタムスキーマ
 */
export const CustomSchemaSchema = z.object({
  /** スキーマバージョン */
  version: z.string().optional(),
  /** スキーマの説明 */
  description: z.string().optional(),
  /** 作成日時 */
  createdAt: z.string().optional(),
  /** 更新日時 */
  updatedAt: z.string().optional(),
  /** 基本フィールド定義 */
  baseFields: z.array(FieldDefinitionSchema).optional(),
  /** カスタムフィールド定義 */
  customFields: z.array(FieldDefinitionSchema).optional(),
  /** 表示ルール */
  displayRules: z.array(DisplayRuleSchema).optional()
});

/**
 * マインドマップノード（再帰的構造）
 */
export const MindmapNodeSchema = z.object({
  /** ノードの一意識別子 */
  id: z.string().min(1),
  
  /** ノードのタイトル */
  title: z.string().min(1),
  
  /** ノードの詳細説明 */
  description: z.string().optional(),
  
  /** ノードの優先度 */
  priority: NodePrioritySchema.optional(),
  
  /** ノードのステータス */
  status: NodeStatusSchema.optional(),
  
  /** ノードに関連付けられたタグ */
  tags: z.array(z.string()).optional(),
  
  /** カスタムフィールドの値 */
  customFields: z.record(z.any()).optional(),
  
  /** ノードの色設定 */
  color: z.string().optional(),
  
  /** ノードの折りたたみ状態 */
  collapsed: z.boolean().optional(),
  
  /** ノードのメタデータ */
  metadata: z.record(z.any()).optional(),
  
  /** ノードの作成日時 */
  createdAt: z.string().optional(),
  
  /** ノードの更新日時 */
  updatedAt: z.string().optional(),
  
  /** ノードの期限 */
  deadline: z.string().optional(),
  
  /** 子ノードの配列（再帰構造）*/
  children: z.array(z.any()).optional()
});



/**
 * メタデータ
 */
export const MetadataSchema = z.object({
  /** 作成日時 */
  createdAt: z.string().optional(),
  
  /** 更新日時 */
  updatedAt: z.string().optional(),
  
  /** メタデータの説明 */
  description: z.string().optional(),
  
  /** テンプレートタイプ */
  templateType: z.string().optional()
});

/**
 * マインドマップデータ（メインスキーマ）
 */
export const MindmapDataSchema = z.object({
  /** データ形式のバージョン */
  version: z.string().min(1),
  
  /** マインドマップのタイトル */
  title: z.string().min(1),
  
  /** マインドマップの説明 */
  description: z.string().optional(),
  
  /** 追加のメタデータ */
  metadata: MetadataSchema.optional(),
  
  /** カスタムスキーマ */
  schema: CustomSchemaSchema.optional(),
  
  /** マインドマップの設定 */
  settings: z.record(z.any()).optional(),
  
  /** マインドマップの作成日時 */
  createdAt: z.string().optional(),
  
  /** マインドマップの更新日時 */
  updatedAt: z.string().optional(),
  
  /** 利用可能なタグの定義 */
  tags: z.array(TagDefinitionSchema).optional(),
  
  /** ルートノード */
  root: MindmapNodeSchema
});

/**
 * Zodスキーマから推論される型定義
 */
export type MindmapData = z.infer<typeof MindmapDataSchema>;
export type MindmapNode = z.infer<typeof MindmapNodeSchema>;
export type CustomSchema = z.infer<typeof CustomSchemaSchema>;
export type FieldDefinition = z.infer<typeof FieldDefinitionSchema>;
export type TagDefinition = z.infer<typeof TagDefinitionSchema>;
export type Metadata = z.infer<typeof MetadataSchema>;
export type NodePriority = z.infer<typeof NodePrioritySchema>;
export type NodeStatus = z.infer<typeof NodeStatusSchema>;
export type FieldType = z.infer<typeof FieldTypeSchema>;

/**
 * マインドマップ設定
 */
export const MindmapSettingsSchema = z.object({
  theme: z.string().optional(),
  layout: z.string().optional(),
  animation: z.boolean().optional(),
  autoSave: z.boolean().optional(),
  showMinimap: z.boolean().optional(),
  nodeSize: z.number().optional(),
  nodeWidth: z.number().optional(),
  nodeSpacing: z.number().optional(),
  levelSpacing: z.number().optional(),
  verticalSpacing: z.number().optional(),
  maxNodeWidth: z.number().optional(),
  enableAnimation: z.boolean().optional(),
  autoLayout: z.boolean().optional(),
  zoom: z.number().optional(),
  center: z.object({
    x: z.number(),
    y: z.number()
  }).optional()
});

export type ValidationRule = z.infer<typeof ValidationRuleSchema>;
export type DisplayRule = z.infer<typeof DisplayRuleSchema>;
export type MindmapSettings = z.infer<typeof MindmapSettingsSchema>;

/**
 * バリデーション結果
 */
export interface ZodValidationResult {
  /** バリデーションが成功したかどうか */
  success: boolean;
  /** バリデーション済みデータ（成功時のみ） */
  data?: MindmapData;
  /** エラー情報（失敗時のみ） */
  errors?: {
    path: string;
    message: string;
    code: string;
  }[];
}

/**
 * Zodバリデータークラス
 */
export class ZodMindmapValidator {
  /**
   * マインドマップデータを検証
   */
  static validate(data: unknown): ZodValidationResult {
    try {
      const result = MindmapDataSchema.parse(data);
      return {
        success: true,
        data: result
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          success: false,
          errors: error.issues.map(issue => ({
            path: issue.path.join('.'),
            message: issue.message,
            code: issue.code
          }))
        };
      }
      
      return {
        success: false,
        errors: [{
          path: 'unknown',
          message: 'バリデーションエラーが発生しました',
          code: 'unknown_error'
        }]
      };
    }
  }

  /**
   * 安全なパース（エラーをthrowしない）
   */
  static safeParse(data: unknown): ZodValidationResult {
    const result = MindmapDataSchema.safeParse(data);
    
    if (result.success) {
      return {
        success: true,
        data: result.data
      };
    }
    
    return {
      success: false,
      errors: result.error.issues.map(issue => ({
        path: issue.path.join('.'),
        message: issue.message,
        code: issue.code
      }))
    };
  }

  /**
   * ノード単体のバリデーション
   */
  static validateNode(data: unknown): { success: boolean; data?: MindmapNode; errors?: any[] } {
    const result = MindmapNodeSchema.safeParse(data);
    
    if (result.success) {
      return {
        success: true,
        data: result.data
      };
    }
    
    return {
      success: false,
      errors: result.error.issues.map(issue => ({
        path: issue.path.join('.'),
        message: issue.message,
        code: issue.code
      }))
    };
  }

  /**
   * カスタムフィールド定義のバリデーション
   */
  static validateFieldDefinition(data: unknown): { success: boolean; data?: FieldDefinition; errors?: any[] } {
    const result = FieldDefinitionSchema.safeParse(data);
    
    if (result.success) {
      return {
        success: true,
        data: result.data
      };
    }
    
    return {
      success: false,
      errors: result.error.issues.map(issue => ({
        path: issue.path.join('.'),
        message: issue.message,
        code: issue.code
      }))
    };
  }
}

/**
 * 型ガード関数
 */
export const isValidMindmapData = (data: unknown): data is MindmapData => {
  return ZodMindmapValidator.safeParse(data).success;
};

export const isValidMindmapNode = (data: unknown): data is MindmapNode => {
  return ZodMindmapValidator.validateNode(data).success;
};

export const isValidFieldDefinition = (data: unknown): data is FieldDefinition => {
  return ZodMindmapValidator.validateFieldDefinition(data).success;
};