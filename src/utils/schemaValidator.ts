/**
 * スキーマバリデーション機能
 */

import type { MindmapData, CustomSchema, ValidationResult, SchemaError } from '../types';

export class SchemaValidator {
  private customSchema: CustomSchema | null = null;

  /**
   * カスタムスキーマを設定
   */
  setCustomSchema(schema: CustomSchema): void {
    this.customSchema = schema;
  }

  /**
   * マインドマップデータを検証
   */
  validateMindmapData(data: MindmapData): ValidationResult {
    const errors: SchemaError[] = [];

    // 基本構造の検証
    if (!data.version) {
      errors.push({
        path: 'version',
        message: 'バージョンが必要です',
        value: data.version
      });
    }

    if (!data.title) {
      errors.push({
        path: 'title',
        message: 'タイトルが必要です',
        value: data.title
      });
    }

    if (!data.root) {
      errors.push({
        path: 'root',
        message: 'ルートノードが必要です',
        value: data.root
      });
    } else {
      this.validateNode(data.root, 'root', errors);
    }

    // カスタムスキーマの検証
    if (this.customSchema && data.root) {
      this.validateNodeCustomFields(data.root, 'root', errors);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * カスタムスキーマを検証
   */
  validateCustomSchema(schema: CustomSchema): ValidationResult {
    const errors: SchemaError[] = [];

    if (!schema.version) {
      errors.push({
        path: 'version',
        message: 'スキーマバージョンが必要です',
        value: schema.version
      });
    }

    if (!schema.fields || !Array.isArray(schema.fields)) {
      errors.push({
        path: 'fields',
        message: 'フィールド定義が必要です',
        value: schema.fields
      });
    } else {
      schema.fields.forEach((field, index) => {
        this.validateFieldDefinition(field, `fields[${index}]`, errors);
      });
    }

    if (schema.displayRules && Array.isArray(schema.displayRules)) {
      schema.displayRules.forEach((rule, index) => {
        this.validateDisplayRule(rule, `displayRules[${index}]`, schema.fields || [], errors);
      });
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * カスタムスキーマに基づいてデータを検証
   */
  validateWithCustomSchema(data: MindmapData, schema: CustomSchema): ValidationResult {
    const originalSchema = this.customSchema;
    this.setCustomSchema(schema);
    
    const result = this.validateMindmapData(data);
    
    // 元のスキーマを復元
    this.customSchema = originalSchema;
    
    return result;
  }

  /**
   * カスタムフィールドの値を検証
   */
  validateCustomFields(fields: Record<string, any>, nodeId: string): ValidationResult {
    const errors: SchemaError[] = [];

    if (!this.customSchema) {
      return { valid: true, errors: [] };
    }

    // 必須フィールドのチェック
    this.customSchema.fields.forEach(fieldDef => {
      if (fieldDef.required && !fields.hasOwnProperty(fieldDef.name)) {
        errors.push({
          path: `${nodeId}.${fieldDef.name}`,
          message: `必須フィールド '${fieldDef.label}' が不足しています`,
          value: undefined
        });
      }
    });

    // フィールド値の検証
    Object.entries(fields).forEach(([fieldName, value]) => {
      const fieldDef = this.customSchema!.fields.find(f => f.name === fieldName);
      if (fieldDef) {
        this.validateFieldValue(value, fieldDef, `${nodeId}.${fieldName}`, errors);
      }
    });

    return {
      valid: errors.length === 0,
      errors
    };
  }

  private validateNode(node: any, path: string, errors: SchemaError[]): void {
    if (!node.id) {
      errors.push({
        path: `${path}.id`,
        message: 'ノードIDが必要です',
        value: node.id
      });
    }

    if (!node.title) {
      errors.push({
        path: `${path}.title`,
        message: 'ノードタイトルが必要です',
        value: node.title
      });
    }

    if (node.children && Array.isArray(node.children)) {
      node.children.forEach((child: any, index: number) => {
        this.validateNode(child, `${path}.children[${index}]`, errors);
      });
    }
  }

  private validateNodeCustomFields(node: any, path: string, errors: SchemaError[]): void {
    if (node.customFields) {
      const fieldValidation = this.validateCustomFields(node.customFields, path);
      errors.push(...fieldValidation.errors);
    }

    if (node.children && Array.isArray(node.children)) {
      node.children.forEach((child: any, index: number) => {
        this.validateNodeCustomFields(child, `${path}.children[${index}]`, errors);
      });
    }
  }

  private validateFieldDefinition(field: any, path: string, errors: SchemaError[]): void {
    if (!field.name) {
      errors.push({
        path: `${path}.name`,
        message: 'フィールド名が必要です',
        value: field.name
      });
    }

    if (!field.type) {
      errors.push({
        path: `${path}.type`,
        message: 'フィールドタイプが必要です',
        value: field.type
      });
    }

    if (!field.label) {
      errors.push({
        path: `${path}.label`,
        message: 'フィールドラベルが必要です',
        value: field.label
      });
    }

    if ((field.type === 'select' || field.type === 'multiselect') && !field.options) {
      errors.push({
        path: `${path}.options`,
        message: '選択肢フィールドにはoptionsが必要です',
        value: field.options
      });
    }

    if (field.validation && Array.isArray(field.validation)) {
      field.validation.forEach((rule: any, index: number) => {
        this.validateValidationRule(rule, `${path}.validation[${index}]`, errors);
      });
    }
  }

  private validateDisplayRule(rule: any, path: string, fields: any[], errors: SchemaError[]): void {
    if (!rule.field) {
      errors.push({
        path: `${path}.field`,
        message: 'フィールド名が必要です',
        value: rule.field
      });
    } else {
      const fieldExists = fields.some(f => f.name === rule.field);
      if (!fieldExists) {
        errors.push({
          path: `${path}.field`,
          message: `存在しないフィールド '${rule.field}' が参照されています`,
          value: rule.field
        });
      }
    }

    if (!rule.displayType) {
      errors.push({
        path: `${path}.displayType`,
        message: '表示タイプが必要です',
        value: rule.displayType
      });
    }
  }

  private validateValidationRule(rule: any, path: string, errors: SchemaError[]): void {
    if (rule.type === 'range') {
      if (typeof rule.min === 'number' && typeof rule.max === 'number' && rule.min > rule.max) {
        errors.push({
          path: `${path}`,
          message: '範囲の最小値が最大値より大きくなっています',
          value: rule
        });
      }
    } else if (rule.type === 'min') {
      // min単体の検証ルール
      if (typeof rule.min === 'number' && typeof rule.max === 'number' && rule.min > rule.max) {
        errors.push({
          path: `${path}`,
          message: '範囲の最小値が最大値より大きくなっています',
          value: rule
        });
      }
    } else if (rule.type === 'max') {
      // max単体の検証ルール
      if (typeof rule.min === 'number' && typeof rule.max === 'number' && rule.min > rule.max) {
        errors.push({
          path: `${path}`,
          message: '範囲の最小値が最大値より大きくなっています',
          value: rule
        });
      }
    } else if (rule.type === 'length') {
      // 文字列長の検証ルール
      if (typeof rule.min === 'number' && typeof rule.max === 'number' && rule.min > rule.max) {
        errors.push({
          path: `${path}`,
          message: '文字数の最小値が最大値より大きくなっています',
          value: rule
        });
      }
    }
  }

  private validateFieldValue(value: any, fieldDef: any, path: string, errors: SchemaError[]): void {
    switch (fieldDef.type) {
      case 'select':
        if (fieldDef.options && !fieldDef.options.includes(value)) {
          errors.push({
            path,
            message: `無効な選択肢: ${value}`,
            value
          });
        }
        break;

      case 'multiselect':
        if (Array.isArray(value)) {
          value.forEach(v => {
            if (fieldDef.options && !fieldDef.options.includes(v)) {
              errors.push({
                path,
                message: `無効な選択肢: ${v}`,
                value: v
              });
            }
          });
        }
        break;

      case 'number':
        if (typeof value !== 'number') {
          errors.push({
            path,
            message: '数値が必要です',
            value
          });
        } else if (fieldDef.validation) {
          fieldDef.validation.forEach((rule: any) => {
            if (rule.type === 'range') {
              if (typeof rule.min === 'number' && value < rule.min) {
                errors.push({
                  path,
                  message: `値が範囲外です (最小: ${rule.min})`,
                  value
                });
              }
              if (typeof rule.max === 'number' && value > rule.max) {
                errors.push({
                  path,
                  message: `値が範囲外です (最大: ${rule.max})`,
                  value
                });
              }
            } else if (rule.type === 'min') {
              if (typeof rule.min === 'number' && value < rule.min) {
                errors.push({
                  path,
                  message: `値が範囲外です (最小: ${rule.min})`,
                  value
                });
              }
            } else if (rule.type === 'max') {
              if (typeof rule.max === 'number' && value > rule.max) {
                errors.push({
                  path,
                  message: `値が範囲外です (最大: ${rule.max})`,
                  value
                });
              }
            }
          });
        }
        break;

      case 'string':
        if (typeof value !== 'string') {
          errors.push({
            path,
            message: '文字列が必要です',
            value
          });
        } else if (fieldDef.validation) {
          fieldDef.validation.forEach((rule: any) => {
            if (rule.type === 'length') {
              if (typeof rule.min === 'number' && value.length < rule.min) {
                errors.push({
                  path,
                  message: `文字数が不足しています (最小: ${rule.min})`,
                  value
                });
              }
              if (typeof rule.max === 'number' && value.length > rule.max) {
                errors.push({
                  path,
                  message: `文字数が超過しています (最大: ${rule.max})`,
                  value
                });
              }
            } else if (rule.type === 'minLength') {
              if (typeof rule.min === 'number' && value.length < rule.min) {
                errors.push({
                  path,
                  message: `文字数が不足しています (最小: ${rule.min})`,
                  value
                });
              }
            } else if (rule.type === 'maxLength') {
              if (typeof rule.max === 'number' && value.length > rule.max) {
                errors.push({
                  path,
                  message: `文字数が超過しています (最大: ${rule.max})`,
                  value
                });
              }
            }
          });
        }
        break;

      case 'boolean':
        if (typeof value !== 'boolean') {
          errors.push({
            path,
            message: 'ブール値が必要です',
            value
          });
        }
        break;

      case 'date':
        if (typeof value === 'string') {
          const date = new Date(value);
          if (isNaN(date.getTime())) {
            errors.push({
              path,
              message: '有効な日付形式が必要です',
              value
            });
          }
        } else {
          errors.push({
            path,
            message: '日付形式が必要です',
            value
          });
        }
        break;
    }
  }
}

// デフォルトインスタンスをエクスポート
export const schemaValidator = new SchemaValidator();