/**
 * スキーマバリデーション機能のテスト
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SchemaValidator } from '../schemaValidator';
import type { MindmapData, CustomSchema, ValidationResult } from '../../types';

describe('SchemaValidator', () => {
  let validator: SchemaValidator;

  beforeEach(() => {
    validator = new SchemaValidator();
  });

  describe('基本的なデータ構造の検証', () => {
    it('有効なマインドマップデータを検証する', () => {
      const validData: MindmapData = {
        version: '1.0',
        title: 'テストマインドマップ',
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

      const result = validator.validateMindmapData(validData);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('必須フィールドが不足している場合エラーを返す', () => {
      const invalidData = {
        version: '1.0',
        // title が不足
        root: {
          id: 'root',
          title: 'ルート'
        }
      };

      const result = validator.validateMindmapData(invalidData as MindmapData);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.path === 'title')).toBe(true);
    });

    it('ルートノードが無効な場合エラーを返す', () => {
      const invalidData: MindmapData = {
        version: '1.0',
        title: 'テスト',
        root: {
          // id が不足
          title: 'ルート'
        } as any
      };

      const result = validator.validateMindmapData(invalidData);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.path === 'root.id')).toBe(true);
    });

    it('子ノードの構造を再帰的に検証する', () => {
      const invalidData: MindmapData = {
        version: '1.0',
        title: 'テスト',
        root: {
          id: 'root',
          title: 'ルート',
          children: [
            {
              id: 'child1',
              title: '子1',
              children: [
                {
                  // id が不足
                  title: '孫1'
                } as any
              ]
            }
          ]
        }
      };

      const result = validator.validateMindmapData(invalidData);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.path.includes('children[0].children[0].id'))).toBe(true);
    });
  });

  describe('カスタムスキーマの検証', () => {
    it('有効なカスタムスキーマを検証する', () => {
      const validSchema: CustomSchema = {
        version: '1.0',
        fields: [
          {
            name: 'priority',
            type: 'select',
            label: '優先度',
            options: ['high', 'medium', 'low'],
            required: true
          },
          {
            name: 'description',
            type: 'string',
            label: '説明',
            validation: [
              { type: 'length', min: 1, max: 100 }
            ]
          }
        ],
        displayRules: [
          {
            field: 'priority',
            displayType: 'badge',
            style: {
              high: { color: 'red' },
              medium: { color: 'orange' },
              low: { color: 'green' }
            }
          }
        ]
      };

      const result = validator.validateCustomSchema(validSchema);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('フィールド定義が無効な場合エラーを返す', () => {
      const invalidSchema: CustomSchema = {
        version: '1.0',
        fields: [
          {
            // name が不足
            type: 'select',
            label: '優先度',
            options: ['high', 'low']
          } as any
        ],
        displayRules: []
      };

      const result = validator.validateCustomSchema(invalidSchema);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.path.includes('fields[0].name'))).toBe(true);
    });

    it('選択肢フィールドでoptionsが不足している場合エラーを返す', () => {
      const invalidSchema: CustomSchema = {
        version: '1.0',
        fields: [
          {
            name: 'priority',
            type: 'select',
            label: '優先度'
            // options が不足
          } as any
        ],
        displayRules: []
      };

      const result = validator.validateCustomSchema(invalidSchema);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.includes('options'))).toBe(true);
    });

    it('バリデーションルールが無効な場合エラーを返す', () => {
      const invalidSchema: CustomSchema = {
        version: '1.0',
        fields: [
          {
            name: 'score',
            type: 'number',
            label: 'スコア',
            validation: [
              {
                type: 'range',
                min: 100,
                max: 50 // min > max で無効
              }
            ]
          }
        ],
        displayRules: []
      };

      const result = validator.validateCustomSchema(invalidSchema);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.includes('範囲'))).toBe(true);
    });

    it('表示ルールが無効な場合エラーを返す', () => {
      const invalidSchema: CustomSchema = {
        version: '1.0',
        fields: [
          {
            name: 'priority',
            type: 'select',
            label: '優先度',
            options: ['high', 'low']
          }
        ],
        displayRules: [
          {
            field: 'nonexistent', // 存在しないフィールド
            displayType: 'badge'
          }
        ]
      };

      const result = validator.validateCustomSchema(invalidSchema);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.includes('存在しないフィールド'))).toBe(true);
    });
  });

  describe('カスタムフィールドの値検証', () => {
    const testSchema: CustomSchema = {
      version: '1.0',
      fields: [
        {
          name: 'priority',
          type: 'select',
          label: '優先度',
          options: ['high', 'medium', 'low'],
          required: true
        },
        {
          name: 'score',
          type: 'number',
          label: 'スコア',
          validation: [
            { type: 'range', min: 0, max: 100 }
          ]
        },
        {
          name: 'deadline',
          type: 'date',
          label: '期限'
        },
        {
          name: 'completed',
          type: 'boolean',
          label: '完了'
        },
        {
          name: 'tags',
          type: 'multiselect',
          label: 'タグ',
          options: ['urgent', 'important', 'review']
        },
        {
          name: 'description',
          type: 'string',
          label: '説明',
          validation: [
            { type: 'length', min: 5, max: 200 }
          ]
        }
      ],
      displayRules: []
    };

    beforeEach(() => {
      validator.setCustomSchema(testSchema);
    });

    it('有効なカスタムフィールド値を検証する', () => {
      const validFields = {
        priority: 'high',
        score: 85,
        deadline: '2024-12-31',
        completed: true,
        tags: ['urgent', 'important'],
        description: 'これは有効な説明文です。'
      };

      const result = validator.validateCustomFields(validFields, 'test-node');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('必須フィールドが不足している場合エラーを返す', () => {
      const invalidFields = {
        // priority が不足（必須）
        score: 85
      };

      const result = validator.validateCustomFields(invalidFields, 'test-node');
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.path.includes('priority'))).toBe(true);
    });

    it('選択肢フィールドで無効な値の場合エラーを返す', () => {
      const invalidFields = {
        priority: 'invalid-priority',
        score: 85
      };

      const result = validator.validateCustomFields(invalidFields, 'test-node');
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.includes('無効な選択肢'))).toBe(true);
    });

    it('数値フィールドで範囲外の値の場合エラーを返す', () => {
      const invalidFields = {
        priority: 'high',
        score: 150 // 範囲外
      };

      const result = validator.validateCustomFields(invalidFields, 'test-node');
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.includes('範囲外'))).toBe(true);
    });

    it('日付フィールドで無効な形式の場合エラーを返す', () => {
      const invalidFields = {
        priority: 'high',
        deadline: 'invalid-date'
      };

      const result = validator.validateCustomFields(invalidFields, 'test-node');
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.includes('日付形式'))).toBe(true);
    });

    it('文字列フィールドで長さ制限違反の場合エラーを返す', () => {
      const invalidFields = {
        priority: 'high',
        description: 'abc' // 短すぎる
      };

      const result = validator.validateCustomFields(invalidFields, 'test-node');
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.includes('文字数'))).toBe(true);
    });

    it('複数選択フィールドで無効な選択肢の場合エラーを返す', () => {
      const invalidFields = {
        priority: 'high',
        tags: ['urgent', 'invalid-tag']
      };

      const result = validator.validateCustomFields(invalidFields, 'test-node');
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.includes('無効な選択肢'))).toBe(true);
    });

    it('ブール値フィールドで無効な型の場合エラーを返す', () => {
      const invalidFields = {
        priority: 'high',
        completed: 'yes' // 文字列（ブール値ではない）
      };

      const result = validator.validateCustomFields(invalidFields, 'test-node');
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.includes('ブール値'))).toBe(true);
    });
  });

  describe('エラーメッセージの詳細', () => {
    it('エラーメッセージに適切なパスと説明が含まれる', () => {
      const invalidData: MindmapData = {
        version: '1.0',
        title: 'テスト',
        root: {
          id: 'root',
          title: 'ルート',
          children: [
            {
              id: 'child1',
              title: '子1',
              customFields: {
                priority: 'invalid'
              }
            }
          ]
        }
      };

      const schema: CustomSchema = {
        version: '1.0',
        fields: [
          {
            name: 'priority',
            type: 'select',
            label: '優先度',
            options: ['high', 'low']
          }
        ],
        displayRules: []
      };

      validator.setCustomSchema(schema);
      const result = validator.validateMindmapData(invalidData);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      
      const error = result.errors[0];
      expect(error.path).toContain('child1');
      expect(error.message).toContain('priority');
      expect(error.value).toBe('invalid');
    });

    it('複数のエラーを同時に検出する', () => {
      const invalidData: MindmapData = {
        version: '1.0',
        title: 'テスト',
        root: {
          id: 'root',
          title: 'ルート',
          children: [
            {
              id: 'child1',
              title: '子1',
              customFields: {
                priority: 'invalid',
                score: 150,
                description: 'abc'
              }
            }
          ]
        }
      };

      const schema: CustomSchema = {
        version: '1.0',
        fields: [
          {
            name: 'priority',
            type: 'select',
            label: '優先度',
            options: ['high', 'low'],
            required: true
          },
          {
            name: 'score',
            type: 'number',
            label: 'スコア',
            validation: [{ type: 'range', min: 0, max: 100 }]
          },
          {
            name: 'description',
            type: 'string',
            label: '説明',
            validation: [{ type: 'length', min: 5, max: 200 }]
          }
        ],
        displayRules: []
      };

      validator.setCustomSchema(schema);
      const result = validator.validateMindmapData(invalidData);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBe(3); // 3つのエラー
    });
  });

  describe('パフォーマンステスト', () => {
    it('大量のノードを効率的に検証する', () => {
      // 1000個のノードを持つデータを作成
      const children = Array.from({ length: 1000 }, (_, i) => ({
        id: `child${i}`,
        title: `子ノード${i}`,
        customFields: {
          priority: i % 2 === 0 ? 'high' : 'low',
          score: Math.floor(Math.random() * 100)
        }
      }));

      const largeData: MindmapData = {
        version: '1.0',
        title: 'パフォーマンステスト',
        root: {
          id: 'root',
          title: 'ルート',
          children
        }
      };

      const schema: CustomSchema = {
        version: '1.0',
        fields: [
          {
            name: 'priority',
            type: 'select',
            label: '優先度',
            options: ['high', 'low']
          },
          {
            name: 'score',
            type: 'number',
            label: 'スコア',
            validation: [{ type: 'range', min: 0, max: 100 }]
          }
        ],
        displayRules: []
      };

      validator.setCustomSchema(schema);
      
      const startTime = performance.now();
      const result = validator.validateMindmapData(largeData);
      const endTime = performance.now();

      expect(result.valid).toBe(true);
      expect(endTime - startTime).toBeLessThan(1000); // 1秒以内
    });
  });
});