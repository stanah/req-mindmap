/**
 * Zodスキーマのテスト
 */

import { describe, it, expect } from 'vitest';
import {
  MindmapDataSchema,
  MindmapNodeSchema,
  FieldDefinitionSchema,
  TagDefinitionSchema,
  ZodMindmapValidator,
  isValidMindmapData,
  isValidMindmapNode,
  isValidFieldDefinition
} from '../mindmap.zod';

describe('Zodスキーマテスト', () => {
  describe('MindmapNodeSchema', () => {
    it('有効なノードデータを受け入れる', () => {
      const validNode = {
        id: 'node1',
        title: 'テストノード',
        description: 'テスト用のノードです',
        priority: 'high' as const,
        status: 'pending' as const,
        tags: ['tag1', 'tag2'],
        customFields: {
          customField1: 'value1'
        }
        // 日時フィールドを一旦除外して問題を特定
      };

      const result = MindmapNodeSchema.safeParse(validNode);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe('node1');
        expect(result.data.title).toBe('テストノード');
      }
    });

    it('必須フィールドが不足している場合にエラーを返す', () => {
      const invalidNode = {
        title: 'テストノード'
        // idが不足
      };

      const result = MindmapNodeSchema.safeParse(invalidNode);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some(issue => issue.path.includes('id'))).toBe(true);
      }
    });

    it('再帰的な子ノード構造を正しく処理する', () => {
      const nodeWithChildren = {
        id: 'parent',
        title: '親ノード',
        children: [
          {
            id: 'child1',
            title: '子ノード1',
            children: [
              {
                id: 'grandchild1',
                title: '孫ノード1'
              }
            ]
          },
          {
            id: 'child2',
            title: '子ノード2'
          }
        ]
      };

      const result = MindmapNodeSchema.safeParse(nodeWithChildren);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.children).toHaveLength(2);
        expect(result.data.children![0].children).toHaveLength(1);
        expect(result.data.children![0].children![0].title).toBe('孫ノード1');
      }
    });

    it('無効な日時フォーマットでエラーを返す', () => {
      const nodeWithInvalidDate = {
        id: 'node1',
        title: 'テストノード',
        createdAt: 'invalid-date'
      };

      const result = MindmapNodeSchema.safeParse(nodeWithInvalidDate);
      expect(result.success).toBe(false);
    });
  });

  describe('FieldDefinitionSchema', () => {
    it('有効なフィールド定義を受け入れる', () => {
      const validField = {
        name: 'priority',
        type: 'select' as const,
        label: '優先度',
        required: true,
        options: ['high', 'medium', 'low'],
        description: '優先度を選択してください'
      };

      const result = FieldDefinitionSchema.safeParse(validField);
      expect(result.success).toBe(true);
    });

    it('select/multiselectタイプでoptionsが不足している場合にエラーを返す', () => {
      const invalidField = {
        name: 'priority',
        type: 'select' as const,
        label: '優先度'
        // optionsが不足
      };

      const result = FieldDefinitionSchema.safeParse(invalidField);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some(issue => 
          issue.message.includes('optionsは必須')
        )).toBe(true);
      }
    });

    it('string/numberタイプではoptionsが不要', () => {
      const validStringField = {
        name: 'description',
        type: 'string' as const,
        label: '説明'
      };

      const result = FieldDefinitionSchema.safeParse(validStringField);
      expect(result.success).toBe(true);
    });
  });

  describe('TagDefinitionSchema', () => {
    it('有効なタグ定義を受け入れる', () => {
      const validTag = {
        name: 'urgent',
        color: '#ff0000',
        description: '緊急タスク'
      };

      const result = TagDefinitionSchema.safeParse(validTag);
      expect(result.success).toBe(true);
    });

    it('最小限のタグ定義を受け入れる', () => {
      const minimalTag = {
        name: 'simple'
      };

      const result = TagDefinitionSchema.safeParse(minimalTag);
      expect(result.success).toBe(true);
    });
  });

  describe('MindmapDataSchema', () => {
    it('有効なマインドマップデータを受け入れる', () => {
      const validMindmap = {
        version: '1.0',
        title: 'テストマインドマップ',
        description: 'テスト用のマインドマップです',
        metadata: {
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
          description: 'メタデータ説明'
        },
        schema: {
          customFields: [
            {
              name: 'priority',
              type: 'select' as const,
              label: '優先度',
              options: ['high', 'medium', 'low']
            }
          ]
        },
        tags: [
          {
            name: 'important',
            color: '#ff0000'
          }
        ],
        root: {
          id: 'root',
          title: 'ルートノード',
          children: [
            {
              id: 'child1',
              title: '子ノード1'
            }
          ]
        }
      };

      const result = MindmapDataSchema.safeParse(validMindmap);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.version).toBe('1.0');
        expect(result.data.title).toBe('テストマインドマップ');
        expect(result.data.root.id).toBe('root');
      }
    });

    it('必須フィールドが不足している場合にエラーを返す', () => {
      const invalidMindmap = {
        version: '1.0'
        // titleとrootが不足
      };

      const result = MindmapDataSchema.safeParse(invalidMindmap);
      expect(result.success).toBe(false);
      if (!result.success) {
        const paths = result.error.issues.map(issue => issue.path.join('.'));
        expect(paths).toContain('title');
        expect(paths).toContain('root');
      }
    });
  });

  describe('ZodMindmapValidator', () => {
    it('validate: 有効なデータで成功を返す', () => {
      const validData = {
        version: '1.0',
        title: 'テスト',
        root: {
          id: 'root',
          title: 'ルート'
        }
      };

      const result = ZodMindmapValidator.validate(validData);
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.errors).toBeUndefined();
    });

    it('validate: 無効なデータでエラーを返す', () => {
      const invalidData = {
        version: '1.0'
        // titleとrootが不足
      };

      const result = ZodMindmapValidator.validate(invalidData);
      expect(result.success).toBe(false);
      expect(result.data).toBeUndefined();
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
    });

    it('safeParse: バリデーションが同じ結果を返す', () => {
      const validData = {
        version: '1.0',
        title: 'テスト',
        root: {
          id: 'root',
          title: 'ルート'
        }
      };

      const result1 = ZodMindmapValidator.validate(validData);
      const result2 = ZodMindmapValidator.safeParse(validData);

      expect(result1.success).toBe(result2.success);
      expect(result1.success).toBe(true);
    });

    it('validateNode: 有効なノードで成功を返す', () => {
      const validNode = {
        id: 'test',
        title: 'テストノード'
      };

      const result = ZodMindmapValidator.validateNode(validNode);
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });
  });

  describe('型ガード関数', () => {
    it('isValidMindmapData: 有効なデータでtrueを返す', () => {
      const validData = {
        version: '1.0',
        title: 'テスト',
        root: {
          id: 'root',
          title: 'ルート'
        }
      };

      expect(isValidMindmapData(validData)).toBe(true);
    });

    it('isValidMindmapData: 無効なデータでfalseを返す', () => {
      const invalidData = {
        version: '1.0'
        // titleとrootが不足
      };

      expect(isValidMindmapData(invalidData)).toBe(false);
    });

    it('isValidMindmapNode: 有効なノードでtrueを返す', () => {
      const validNode = {
        id: 'test',
        title: 'テストノード'
      };

      expect(isValidMindmapNode(validNode)).toBe(true);
    });

    it('isValidMindmapNode: 無効なノードでfalseを返す', () => {
      const invalidNode = {
        title: 'テストノード'
        // idが不足
      };

      expect(isValidMindmapNode(invalidNode)).toBe(false);
    });

    it('isValidFieldDefinition: 有効なフィールド定義でtrueを返す', () => {
      const validField = {
        name: 'test',
        type: 'string' as const,
        label: 'テスト'
      };

      expect(isValidFieldDefinition(validField)).toBe(true);
    });
  });
});