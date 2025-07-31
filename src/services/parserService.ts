import * as yaml from 'js-yaml';
import Ajv from 'ajv';
import type { ParserService, MindmapData, ParseError, ValidationResult } from '../types';
import { ERROR_MESSAGES } from '../utils';

// マインドマップデータのJSONスキーマ
const mindmapSchema = {
  type: 'object',
  required: ['version', 'title', 'root'],
  properties: {
    version: { type: 'string' },
    title: { type: 'string' },
    root: {
      type: 'object',
      required: ['id', 'title'],
      properties: {
        id: { type: 'string' },
        title: { type: 'string' },
        description: { type: 'string' },
        children: {
          type: 'array',
          items: { $ref: '#/properties/root' }
        },
        metadata: { type: 'object' },
        position: {
          type: 'object',
          properties: {
            x: { type: 'number' },
            y: { type: 'number' }
          }
        },
        collapsed: { type: 'boolean' },
        customFields: { type: 'object' }
      }
    },
    schema: {
      type: 'object',
      properties: {
        fields: {
          type: 'array',
          items: {
            type: 'object',
            required: ['name', 'type', 'label'],
            properties: {
              name: { type: 'string' },
              type: { 
                type: 'string',
                enum: ['string', 'number', 'boolean', 'date', 'select', 'multiselect']
              },
              label: { type: 'string' },
              required: { type: 'boolean' },
              options: {
                type: 'array',
                items: { type: 'string' }
              }
            }
          }
        },
        displayRules: {
          type: 'array',
          items: {
            type: 'object',
            required: ['field', 'displayType'],
            properties: {
              field: { type: 'string' },
              displayType: {
                type: 'string',
                enum: ['badge', 'icon', 'color', 'text']
              },
              condition: { type: 'string' },
              style: { type: 'object' }
            }
          }
        }
      }
    },
    settings: {
      type: 'object',
      properties: {
        theme: {
          type: 'string',
          enum: ['light', 'dark']
        },
        layout: {
          type: 'string',
          enum: ['tree', 'radial']
        }
      }
    }
  }
};

export class ParserServiceImpl implements ParserService {
  private ajv: Ajv;

  constructor() {
    this.ajv = new Ajv({ allErrors: true });
    this.ajv.addSchema(mindmapSchema, 'mindmap');
  }

  async parseJSON(content: string): Promise<MindmapData> {
    try {
      const data = JSON.parse(content);
      const validationResult = this.validateData(data);
      
      if (!validationResult.valid) {
        throw new Error(`${ERROR_MESSAGES.SCHEMA_VALIDATION_FAILED}: ${validationResult.errors[0]?.message}`);
      }
      
      return data as MindmapData;
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error(`${ERROR_MESSAGES.INVALID_JSON}: ${error.message}`);
      }
      throw error;
    }
  }

  async parseYAML(content: string): Promise<MindmapData> {
    try {
      const data = yaml.load(content);
      const validationResult = this.validateData(data);
      
      if (!validationResult.valid) {
        throw new Error(`${ERROR_MESSAGES.SCHEMA_VALIDATION_FAILED}: ${validationResult.errors[0]?.message}`);
      }
      
      return data as MindmapData;
    } catch (error) {
      if (error instanceof yaml.YAMLException) {
        throw new Error(`${ERROR_MESSAGES.INVALID_YAML}: ${error.message}`);
      }
      throw error;
    }
  }

  validateData(data: any): ValidationResult {
    const validate = this.ajv.getSchema('mindmap');
    if (!validate) {
      return {
        valid: false,
        errors: [{ path: '', message: 'スキーマが見つかりません', value: data }]
      };
    }

    const valid = validate(data);
    
    if (!valid && validate.errors) {
      return {
        valid: false,
        errors: validate.errors.map(error => ({
          path: error.instancePath || error.schemaPath || '',
          message: error.message || '不明なエラー',
          value: error.data
        }))
      };
    }

    return { valid: true, errors: [] };
  }

  validateSchema(data: any): ValidationResult {
    // 基本的なスキーマ検証
    return this.validateData(data);
  }

  validateCustomSchema(data: MindmapData): ValidationResult {
    if (!data.schema) {
      return { valid: true, errors: [] };
    }

    // カスタムスキーマの検証ロジック
    const errors: any[] = [];
    
    // フィールド定義の検証
    if (data.schema.fields) {
      data.schema.fields.forEach((field, index) => {
        if (!field.name || !field.type || !field.label) {
          errors.push({
            path: `schema.fields[${index}]`,
            message: 'フィールド定義に必須項目が不足しています',
            value: field
          });
        }
      });
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  getParseErrors(content: string, format: 'json' | 'yaml'): ParseError[] {
    const errors: ParseError[] = [];

    try {
      if (format === 'json') {
        JSON.parse(content);
      } else {
        yaml.load(content);
      }
    } catch (error) {
      if (error instanceof SyntaxError) {
        // JSON構文エラーの解析
        const match = error.message.match(/at position (\d+)/);
        const position = match ? parseInt(match[1]) : 0;
        const lines = content.substring(0, position).split('\n');
        
        errors.push({
          line: lines.length,
          column: lines[lines.length - 1].length + 1,
          message: error.message,
          severity: 'error'
        });
      } else if (error instanceof yaml.YAMLException) {
        // YAML構文エラーの解析
        errors.push({
          line: error.mark?.line || 1,
          column: error.mark?.column || 1,
          message: error.message,
          severity: 'error'
        });
      }
    }

    return errors;
  }

  generateSchema(data: MindmapData): any {
    // 既存データからスキーマを生成する基本的な実装
    const fields: any[] = [];
    const displayRules: any[] = [];

    // ルートノードからカスタムフィールドを抽出
    const extractFields = (node: any) => {
      if (node.customFields) {
        Object.entries(node.customFields).forEach(([key, value]) => {
          const existingField = fields.find(f => f.name === key);
          if (!existingField) {
            fields.push({
              name: key,
              type: typeof value === 'number' ? 'number' : 
                    typeof value === 'boolean' ? 'boolean' : 'string',
              label: key.charAt(0).toUpperCase() + key.slice(1),
              required: false
            });
          }
        });
      }

      if (node.children) {
        node.children.forEach(extractFields);
      }
    };

    extractFields(data.root);

    return {
      fields,
      displayRules
    };
  }
}