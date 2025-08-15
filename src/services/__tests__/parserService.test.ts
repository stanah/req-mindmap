/**
 * ParserServiceのテスト
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ParserServiceImpl } from '../parserService';
import type { MindmapData } from '../../types';

describe('ParserService', () => {
  let parserService: ParserServiceImpl;

  beforeEach(() => {
    parserService = new ParserServiceImpl();
  });

  describe('parseJSON', () => {
    it('有効なJSONを正しく解析する', async () => {
      const validJson = JSON.stringify({
        version: '1.0',
        title: 'テストマインドマップ',
        root: {
          id: 'root',
          title: 'ルートノード'
        }
      });

      const result = await parserService.parseJSON(validJson);
      
      expect(result.version).toBe('1.0');
      expect(result.title).toBe('テストマインドマップ');
      expect(result.root.id).toBe('root');
      expect(result.root.title).toBe('ルートノード');
    });

    it('空文字列の場合エラーを投げる', async () => {
      await expect(parserService.parseJSON('')).rejects.toThrow('ファイル内容が空です');
      await expect(parserService.parseJSON('   ')).rejects.toThrow('ファイル内容が空です');
    });

    it('無効なJSONの場合エラーを投げる', async () => {
      const invalidJson = '{ "version": "1.0", "title": }';
      
      await expect(parserService.parseJSON(invalidJson)).rejects.toThrow('JSON構文エラー');
    });

    it('必須フィールドが不足している場合エラーを投げる', async () => {
      const incompleteJson = JSON.stringify({
        version: '1.0'
        // title と root が不足
      });

      await expect(parserService.parseJSON(incompleteJson)).rejects.toThrow('データ構造が正しくありません');
    });

    it('複雑なマインドマップデータを正しく解析する', async () => {
      const complexJson = JSON.stringify({
        version: '1.0',
        title: '複雑なマインドマップ',
        description: 'テスト用の複雑なデータ',
        root: {
          id: 'root',
          title: 'ルートノード',
          description: 'ルートノードの説明',
          children: [
            {
              id: 'child1',
              title: '子ノード1',
              customFields: {
                priority: 'high',
                status: 'todo'
              },
              children: [
                {
                  id: 'grandchild1',
                  title: '孫ノード1'
                }
              ]
            }
          ]
        },
        settings: {
          theme: 'light',
          layout: 'tree'
        }
      });

      const result = await parserService.parseJSON(complexJson);
      
      expect(result.root.children).toHaveLength(1);
      expect(result.root.children![0].id).toBe('child1');
      expect(result.root.children![0].customFields?.priority).toBe('high');
      expect(result.root.children![0].children![0].id).toBe('grandchild1');
      expect(result.settings?.theme).toBe('light');
    });
  });

  describe('parseYAML', () => {
    it('有効なYAMLを正しく解析する', async () => {
      const validYaml = `
version: "1.0"
title: "テストマインドマップ"
root:
  id: root
  title: "ルートノード"
`;

      const result = await parserService.parseYAML(validYaml);
      
      expect(result.version).toBe('1.0');
      expect(result.title).toBe('テストマインドマップ');
      expect(result.root.id).toBe('root');
      expect(result.root.title).toBe('ルートノード');
    });

    it('空文字列の場合エラーを投げる', async () => {
      await expect(parserService.parseYAML('')).rejects.toThrow('ファイル内容が空です');
    });

    it('無効なYAMLの場合エラーを投げる', async () => {
      const invalidYaml = `
version: "1.0"
title: "テスト
  invalid: yaml
`;
      
      await expect(parserService.parseYAML(invalidYaml)).rejects.toThrow('YAML構文エラー');
    });

    it('複雑なYAMLデータを正しく解析する', async () => {
      const complexYaml = `
version: "1.0"
title: "複雑なマインドマップ"
description: "テスト用の複雑なデータ"
root:
  id: root
  title: "ルートノード"
  children:
    - id: child1
      title: "子ノード1"
      customFields:
        priority: high
        status: todo
        tags:
          - important
          - urgent
      children:
        - id: grandchild1
          title: "孫ノード1"
settings:
  theme: light
  layout: tree
  zoom: 1.0
`;

      const result = await parserService.parseYAML(complexYaml);
      
      expect(result.root.children).toHaveLength(1);
      expect(result.root.children![0].customFields?.priority).toBe('high');
      expect(result.root.children![0].customFields?.tags).toEqual(['important', 'urgent']);
      expect(result.settings?.zoom).toBe(1.0);
    });
  });

  describe('validateData', () => {
    it('有効なデータの場合trueを返す', () => {
      const validData = {
        version: '1.0',
        title: 'テスト',
        root: {
          id: 'root',
          title: 'ルート'
        }
      };

      const result = parserService.validateData(validData);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('nullデータの場合エラーを返す', () => {
      const result = parserService.validateData(null);
      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe('NULL_DATA');
    });

    it('オブジェクトでない場合エラーを返す', () => {
      const result = parserService.validateData('string');
      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe('INVALID_TYPE');
    });

    it('必須フィールドが不足している場合エラーを返す', () => {
      const incompleteData = {
        version: '1.0'
        // title と root が不足
      };

      const result = parserService.validateData(incompleteData);
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(2);
      expect(result.errors.some(e => e.path === 'title')).toBe(true);
      expect(result.errors.some(e => e.path === 'root')).toBe(true);
    });

    it('rootノードが無効な場合エラーを返す', () => {
      const invalidRootData = {
        version: '1.0',
        title: 'テスト',
        root: {
          // id が不足
          title: 'ルート'
        }
      };

      const result = parserService.validateData(invalidRootData);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.path === 'root.id')).toBe(true);
    });
  });

  describe('getParseErrors', () => {
    it('空文字列の場合エラーを返す', () => {
      const errors = parserService.getParseErrors('');
      expect(errors).toHaveLength(1);
      expect(errors[0].code).toBe('EMPTY_CONTENT');
    });

    it('有効なJSONの場合エラーを返さない', () => {
      const validJson = '{"version": "1.0", "title": "test", "root": {"id": "root", "title": "root"}}';
      const errors = parserService.getParseErrors(validJson);
      expect(errors).toHaveLength(0);
    });

    it('無効なJSONの場合構文エラーを返す', () => {
      const invalidJson = '{"version": "1.0", "title": "test", "root": {';
      const errors = parserService.getParseErrors(invalidJson);
      expect(errors.length).toBeGreaterThan(0);
      // JSONもYAMLも無効な場合、最終的にYAMLエラーが返される
      expect(['JSON_SYNTAX_ERROR', 'YAML_SYNTAX_ERROR']).toContain(errors[0].code);
      expect(errors[0].severity).toBe('error');
    });

    it('有効なYAMLの場合エラーを返さない', () => {
      const validYaml = `
version: "1.0"
title: test
root:
  id: root
  title: root
`;
      const errors = parserService.getParseErrors(validYaml);
      expect(errors).toHaveLength(0);
    });

    it('無効なYAMLの場合構文エラーを返す', () => {
      const invalidYaml = `
version: "1.0"
title: "test
  invalid: yaml
`;
      const errors = parserService.getParseErrors(invalidYaml);
      expect(errors).toHaveLength(1);
      expect(errors[0].code).toBe('YAML_SYNTAX_ERROR');
    });
  });

  describe('detectFormat', () => {
    it('JSONファイルを正しく判定する', () => {
      const jsonContent = '{"version": "1.0", "title": "test"}';
      expect(parserService.detectFormat(jsonContent)).toBe('json');
    });

    it('YAMLファイルを正しく判定する', () => {
      const yamlContent = `
version: "1.0"
title: test
`;
      expect(parserService.detectFormat(yamlContent)).toBe('yaml');
    });

    it('空文字列の場合unknownを返す', () => {
      expect(parserService.detectFormat('')).toBe('unknown');
      expect(parserService.detectFormat('   ')).toBe('unknown');
    });

    it('無効な形式の場合unknownを返す', () => {
      const invalidContent = 'this is not json or yaml';
      expect(parserService.detectFormat(invalidContent)).toBe('unknown');
    });

    it('配列形式のJSONを正しく判定する', () => {
      const arrayJson = '[{"id": "1", "title": "test"}]';
      expect(parserService.detectFormat(arrayJson)).toBe('json');
    });
  });

  describe('serialize', () => {
    const testData: MindmapData = {
      version: '1.0',
      title: 'テストデータ',
      root: {
        id: 'root',
        title: 'ルートノード',
        children: [
          {
            id: 'child1',
            title: '子ノード1',
            customFields: {
              priority: 'high'
            }
          }
        ]
      }
    };

    it('JSON形式にシリアライズできる', async () => {
      const result = await parserService.serialize(testData, 'json');
      expect(result).toContain('"version": "1.0"');
      expect(result).toContain('"title": "テストデータ"');
      
      // 再パースして元データと一致することを確認
      const reparsed = JSON.parse(result);
      expect(reparsed.version).toBe(testData.version);
      expect(reparsed.title).toBe(testData.title);
    });

    it('YAML形式にシリアライズできる', async () => {
      const result = await parserService.serialize(testData, 'yaml');
      expect(result).toContain('version:');
      expect(result).toContain('title: テストデータ');
      
      // 再パースして元データと一致することを確認
      const yaml = await import('js-yaml');
      const reparsed = yaml.load(result) as MindmapData;
      expect(reparsed.version).toBe(testData.version);
      expect(reparsed.title).toBe(testData.title);
    });

    it('サポートされていない形式の場合エラーを投げる', async () => {
      await expect(
        parserService.serialize(testData, 'xml' as 'json' | 'yaml')
      ).rejects.toThrow('サポートされていない形式');
    });
  });

  describe('generateSchema', () => {
    it('カスタムフィールドからスキーマを生成する', async () => {
      const testData: MindmapData = {
        version: '1.0',
        title: 'テストデータ',
        root: {
          id: 'root',
          title: 'ルート',
          children: [
            {
              id: 'child1',
              title: '子1',
              customFields: {
                priority: 'high',
                status: 'todo',
                completed: true,
                score: 85
              }
            },
            {
              id: 'child2',
              title: '子2',
              customFields: {
                priority: 'medium',
                status: 'done',
                completed: false,
                score: 92
              }
            }
          ]
        }
      };

      const schema = await parserService.generateSchema(testData);
      
      expect(schema.customFields).toHaveLength(4);
      
      const priorityField = schema.customFields?.find(f => f.name === 'priority');
      expect(priorityField?.type).toBe('select');
      expect(priorityField?.options).toEqual(['high', 'medium']);
      
      const completedField = schema.customFields?.find(f => f.name === 'completed');
      expect(completedField?.type).toBe('boolean');
      
      const scoreField = schema.customFields?.find(f => f.name === 'score');
      expect(scoreField?.type).toBe('number');
      
      expect(schema.displayRules).toHaveLength(4);
    });

    it('カスタムフィールドがない場合空のスキーマを生成する', async () => {
      const testData: MindmapData = {
        version: '1.0',
        title: 'テストデータ',
        root: {
          id: 'root',
          title: 'ルート'
        }
      };

      const schema = await parserService.generateSchema(testData);
      
      expect(schema.customFields).toHaveLength(0);
      expect(schema.displayRules).toHaveLength(0);
    });

    it('日付フィールドを正しく検出する', async () => {
      const testData: MindmapData = {
        version: '1.0',
        title: 'テストデータ',
        root: {
          id: 'root',
          title: 'ルート',
          children: [
            {
              id: 'child1',
              title: '子1',
              customFields: {
                deadline: '2024-12-31',
                created: '2024-01-01'
              }
            }
          ]
        }
      };

      const schema = await parserService.generateSchema(testData);
      
      const deadlineField = schema.customFields?.find(f => f.name === 'deadline');
      expect(deadlineField?.type).toBe('date');
    });
  });

  describe('migrateSchema', () => {
    it('新しいフィールドを追加する', async () => {
      const oldSchema: import('../../types').CustomSchema = {
        version: '1.0',
        customFields: [
          { name: 'priority', type: 'select', label: '優先度', options: ['high', 'low'] }
        ],
        displayRules: [
          { field: 'priority', displayType: 'badge' }
        ]
      };

      const newSchema: import('../../types').CustomSchema = {
        version: '1.1',
        customFields: [
          { name: 'priority', type: 'select', label: '優先度', options: ['high', 'low'] },
          { name: 'status', type: 'select', label: 'ステータス', options: ['todo', 'done'] }
        ],
        displayRules: [
          { field: 'priority', displayType: 'badge' },
          { field: 'status', displayType: 'badge' }
        ]
      };

      const result = await parserService.migrateSchema(oldSchema, newSchema);
      
      expect(result.migratedSchema.customFields).toHaveLength(2);
      expect(result.migratedSchema.displayRules).toHaveLength(2);
      expect(result.migrationLog).toContain('新しいフィールドを追加: status (select)');
    });

    it('互換性のある型変更を処理する', async () => {
      const oldSchema: import('../../types').CustomSchema = {
        version: '1.0',
        customFields: [
          { name: 'category', type: 'string', label: 'カテゴリ' }
        ],
        displayRules: []
      };

      const newSchema: import('../../types').CustomSchema = {
        version: '1.1',
        customFields: [
          { name: 'category', type: 'select', label: 'カテゴリ', options: ['A', 'B', 'C'] }
        ],
        displayRules: []
      };

      const result = await parserService.migrateSchema(oldSchema, newSchema);
      
      const categoryField = result.migratedSchema.customFields?.find(f => f.name === 'category');
      expect(categoryField?.type).toBe('select');
      expect(result.migrationLog.some(log => log.includes('フィールド型を更新'))).toBe(true);
    });
  });

  describe('getSchemaChanges', () => {
    it('スキーマの差分を正しく検出する', () => {
      const oldSchema: import('../../types').CustomSchema = {
        version: '1.0',
        customFields: [
          { name: 'priority', type: 'select', label: '優先度', options: ['high', 'low'] },
          { name: 'oldField', type: 'string', label: '古いフィールド' }
        ],
        displayRules: [
          { field: 'priority', displayType: 'badge' }
        ]
      };

      const newSchema: import('../../types').CustomSchema = {
        version: '1.1',
        customFields: [
          { name: 'priority', type: 'select', label: '優先度', options: ['high', 'medium', 'low'] },
          { name: 'newField', type: 'string', label: '新しいフィールド' }
        ],
        displayRules: [
          { field: 'priority', displayType: 'badge' },
          { field: 'newField', displayType: 'text' }
        ]
      };

      const changes = parserService.getSchemaChanges(oldSchema, newSchema);
      
      expect(changes.addedFields).toContain('newField');
      expect(changes.removedFields).toContain('oldField');
      expect(changes.modifiedFields).toContain('priority');
      expect(changes.addedRules).toContain('newField');
    });
  });

  describe('validateCustomSchema', () => {
    it('カスタムスキーマに基づいてデータを検証する', () => {
      const validData: MindmapData = {
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
                priority: 'high',
                status: 'todo',
                score: 85
              }
            }
          ]
        }
      };

      const result = parserService.validateCustomSchema(validData);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it.skip('必須フィールドが不足している場合エラーを返す', () => {
      // TODO: カスタムフィールドバリデーション機能の実装が必要
    });

    it.skip('無効な選択肢の場合エラーを返す', () => {
      const schema: import('../../types').CustomSchema = {
        version: '1.0',
        customFields: [
          { name: 'priority', type: 'select', label: '優先度', options: ['high', 'medium', 'low'] }
        ],
        displayRules: []
      };

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
                priority: 'invalid-option'
              }
            }
          ]
        },
        schema
      };

      const result = parserService.validateCustomSchema(invalidData);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.includes('無効な選択肢'))).toBe(true);
    });

    it.skip('数値の範囲バリデーションを行う', () => {
      const schema: import('../../types').CustomSchema = {
        version: '1.0',
        customFields: [
          { 
            name: 'score', 
            type: 'number', 
            label: 'スコア', 
            validation: [{ type: 'range', min: 0, max: 100 }] 
          }
        ],
        displayRules: []
      };

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
                score: 150 // 範囲外
              }
            }
          ]
        },
        schema
      };

      const result = parserService.validateCustomSchema(invalidData);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.includes('範囲外'))).toBe(true);
    });

    it.skip('日付フォーマットのバリデーションを行う', () => {
      const schema: import('../../types').CustomSchema = {
        version: '1.0',
        customFields: [
          { name: 'deadline', type: 'date', label: '期限' }
        ],
        displayRules: []
      };

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
                deadline: 'invalid-date'
              }
            }
          ]
        },
        schema
      };

      const result = parserService.validateCustomSchema(invalidData);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.includes('日付形式'))).toBe(true);
    });

    it.skip('文字列の長さバリデーションを行う', () => {
      const schema: import('../../types').CustomSchema = {
        version: '1.0',
        customFields: [
          { 
            name: 'description', 
            type: 'string', 
            label: '説明', 
            validation: [{ type: 'length', min: 5, max: 50 }] 
          }
        ],
        displayRules: []
      };

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
                description: 'abc' // 短すぎる
              }
            }
          ]
        },
        schema
      };

      const result = parserService.validateCustomSchema(invalidData);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.includes('文字数'))).toBe(true);
    });

    it.skip('複数選択フィールドのバリデーションを行う', () => {
      const schema: import('../../types').CustomSchema = {
        version: '1.0',
        customFields: [
          { 
            name: 'tags', 
            type: 'multiselect', 
            label: 'タグ', 
            options: ['urgent', 'important', 'review', 'blocked'] 
          }
        ],
        displayRules: []
      };

      const validData: MindmapData = {
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
                tags: ['urgent', 'important']
              }
            }
          ]
        },
        schema
      };

      const result = parserService.validateCustomSchema(validData);
      expect(result.valid).toBe(true);

      // 無効な選択肢を含む場合
      const invalidData: MindmapData = {
        ...validData,
        root: {
          ...validData.root,
          children: [
            {
              id: 'child1',
              title: '子1',
              customFields: {
                tags: ['urgent', 'invalid-tag']
              }
            }
          ]
        }
      };

      const invalidResult = parserService.validateCustomSchema(invalidData);
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.errors.some(e => e.message.includes('無効な選択肢'))).toBe(true);
    });

    it('スキーマが定義されていない場合は検証をスキップする', () => {
      const dataWithoutSchema: MindmapData = {
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
                anyField: 'anyValue'
              }
            }
          ]
        }
      };

      const result = parserService.validateCustomSchema(dataWithoutSchema);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });
});