/**
 * スキーマバリデーションユーティリティ
 * 
 * このファイルは、JSON SchemaとAjvを使用したデータバリデーション機能を提供します。
 */

import Ajv, { type ValidateFunction, type ErrorObject } from 'ajv';
import addFormats from 'ajv-formats';
import type { 
  MindmapData, 
  CustomSchema, 
  ValidationResult, 
  SchemaError,
  MindmapNode 
} from '../types';

// JSON Schemaファイルをインポート
import mindmapDataSchema from '../schemas/mindmap-data.schema.json';
import customSchemaSchema from '../schemas/custom-schema.schema.json';

/**
 * スキーマバリデータークラス
 */
export class SchemaValidator {
  private ajv: Ajv;
  private mindmapDataValidator: ValidateFunction;
  private customSchemaValidator: ValidateFunction;

  constructor() {
    // Ajvインスタンスを初期化
    this.ajv = new Ajv({
      allErrors: true,
      verbose: true,
      strict: false,
      removeAdditional: false
    });

    // フォーマットバリデーターを追加
    addFormats(this.ajv);

    // カスタムフォーマットを追加
    this.addCustomFormats();

    // スキーマをコンパイル
    this.mindmapDataValidator = this.ajv.compile(mindmapDataSchema);
    this.customSchemaValidator = this.ajv.compile(customSchemaSchema);
  }

  /**
   * カスタムフォーマットを追加
   */
  private addCustomFormats(): void {
    // 日本語の日付フォーマット
    this.ajv.addFormat('japanese-date', {
      type: 'string',
      validate: (dateString: string) => {
        const japaneseDate = /^\d{4}年\d{1,2}月\d{1,2}日$/;
        const isoDate = /^\d{4}-\d{2}-\d{2}$/;
        return japaneseDate.test(dateString) || isoDate.test(dateString);
      }
    });

    // 色コード（hex、rgb、色名）
    this.ajv.addFormat('color', {
      type: 'string',
      validate: (colorString: string) => {
        const hex = /^#[0-9a-fA-F]{6}$/;
        const rgb = /^rgb\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*\)$/;
        const rgba = /^rgba\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*[01]?\.?\d*\s*\)$/;
        const colorNames = [
          'red', 'green', 'blue', 'yellow', 'orange', 'purple', 'pink',
          'brown', 'black', 'white', 'gray', 'grey', 'cyan', 'magenta'
        ];
        
        return hex.test(colorString) || 
               rgb.test(colorString) || 
               rgba.test(colorString) ||
               colorNames.includes(colorString.toLowerCase());
      }
    });

    // ノードID形式
    this.ajv.addFormat('node-id', {
      type: 'string',
      validate: (id: string) => {
        return /^[a-zA-Z0-9_-]+$/.test(id) && id.length >= 1 && id.length <= 100;
      }
    });
  }

  /**
   * マインドマップデータをバリデーション
   */
  validateMindmapData(data: unknown): ValidationResult {
    const valid = this.mindmapDataValidator(data);
    
    if (valid) {
      return {
        valid: true,
        errors: []
      };
    }

    const errors = this.convertAjvErrors(this.mindmapDataValidator.errors || []);
    return {
      valid: false,
      errors
    };
  }

  /**
   * カスタムスキーマをバリデーション
   */
  validateCustomSchema(schema: unknown): ValidationResult {
    const valid = this.customSchemaValidator(schema);
    
    if (valid) {
      return {
        valid: true,
        errors: []
      };
    }

    const errors = this.convertAjvErrors(this.customSchemaValidator.errors || []);
    return {
      valid: false,
      errors
    };
  }

  /**
   * カスタムスキーマに基づいてマインドマップデータをバリデーション
   */
  validateWithCustomSchema(data: MindmapData, customSchema: CustomSchema): ValidationResult {
    const errors: SchemaError[] = [];

    // まず基本スキーマでバリデーション
    const basicValidation = this.validateMindmapData(data);
    if (!basicValidation.valid) {
      errors.push(...basicValidation.errors);
    }

    // カスタムスキーマでバリデーション
    if (customSchema && customSchema.fields) {
      this.validateNodeWithCustomSchema(data.root, customSchema, '', errors);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * ノードをカスタムスキーマでバリデーション（再帰的）
   */
  private validateNodeWithCustomSchema(
    node: MindmapNode, 
    schema: CustomSchema, 
    path: string, 
    errors: SchemaError[]
  ): void {
    const nodePath = path ? `${path}.${node.id}` : node.id;

    // カスタムフィールドをバリデーション
    if (node.customFields) {
      for (const field of schema.fields) {
        const fieldValue = node.customFields[field.name];
        const fieldPath = `${nodePath}.customFields.${field.name}`;

        // 必須フィールドのチェック
        if (field.required && (fieldValue === undefined || fieldValue === null || fieldValue === '')) {
          errors.push({
            path: fieldPath,
            message: `必須フィールド '${field.label}' が設定されていません`,
            value: fieldValue,
            expected: `${field.type}型の値`,
            code: 'REQUIRED_FIELD_MISSING'
          });
          continue;
        }

        // 値が存在する場合の型チェック
        if (fieldValue !== undefined && fieldValue !== null) {
          const fieldErrors = this.validateFieldValue(fieldValue, field, fieldPath);
          errors.push(...fieldErrors);
        }
      }
    }

    // 子ノードを再帰的にバリデーション
    if (node.children) {
      for (const child of node.children) {
        this.validateNodeWithCustomSchema(child, schema, nodePath, errors);
      }
    }
  }

  /**
   * フィールド値をバリデーション
   */
  private validateFieldValue(
    value: unknown, 
    field: import('../types').FieldDefinition, 
    path: string
  ): SchemaError[] {
    const errors: SchemaError[] = [];

    // 型チェック
    switch (field.type) {
      case 'string':
        if (typeof value !== 'string') {
          errors.push({
            path,
            message: `フィールド '${field.label}' は文字列である必要があります`,
            value,
            expected: 'string',
            code: 'INVALID_TYPE'
          });
        }
        break;

      case 'number':
        if (typeof value !== 'number' || isNaN(value)) {
          errors.push({
            path,
            message: `フィールド '${field.label}' は数値である必要があります`,
            value,
            expected: 'number',
            code: 'INVALID_TYPE'
          });
        }
        break;

      case 'boolean':
        if (typeof value !== 'boolean') {
          errors.push({
            path,
            message: `フィールド '${field.label}' は真偽値である必要があります`,
            value,
            expected: 'boolean',
            code: 'INVALID_TYPE'
          });
        }
        break;

      case 'date':
        if (typeof value !== 'string' || !this.isValidDate(value)) {
          errors.push({
            path,
            message: `フィールド '${field.label}' は有効な日付形式である必要があります`,
            value,
            expected: 'YYYY-MM-DD形式の日付',
            code: 'INVALID_DATE'
          });
        }
        break;

      case 'select':
        if (field.options && !field.options.includes(value as string)) {
          errors.push({
            path,
            message: `フィールド '${field.label}' の値は選択肢の中から選んでください`,
            value,
            expected: `次のいずれか: ${field.options.join(', ')}`,
            code: 'INVALID_OPTION'
          });
        }
        break;

      case 'multiselect':
        if (!Array.isArray(value)) {
          errors.push({
            path,
            message: `フィールド '${field.label}' は配列である必要があります`,
            value,
            expected: 'array',
            code: 'INVALID_TYPE'
          });
        } else if (field.options) {
          for (const item of value) {
            if (!field.options.includes(item)) {
              errors.push({
                path,
                message: `フィールド '${field.label}' の値 '${item}' は選択肢にありません`,
                value: item,
                expected: `次のいずれか: ${field.options.join(', ')}`,
                code: 'INVALID_OPTION'
              });
            }
          }
        }
        break;
    }

    // バリデーションルールをチェック
    if (field.validation) {
      for (const rule of field.validation) {
        const ruleErrors = this.validateRule(value, rule, field, path);
        errors.push(...ruleErrors);
      }
    }

    return errors;
  }

  /**
   * バリデーションルールをチェック
   */
  private validateRule(
    value: unknown, 
    rule: import('../types').ValidationRule, 
    field: import('../types').FieldDefinition, 
    path: string
  ): SchemaError[] {
    const errors: SchemaError[] = [];

    switch (rule.type) {
      case 'minLength':
        if (typeof value === 'string' && value.length < (rule.value as number)) {
          errors.push({
            path,
            message: rule.message || `フィールド '${field.label}' は${rule.value}文字以上である必要があります`,
            value,
            expected: `${rule.value}文字以上`,
            code: 'MIN_LENGTH'
          });
        }
        break;

      case 'maxLength':
        if (typeof value === 'string' && value.length > (rule.value as number)) {
          errors.push({
            path,
            message: rule.message || `フィールド '${field.label}' は${rule.value}文字以下である必要があります`,
            value,
            expected: `${rule.value}文字以下`,
            code: 'MAX_LENGTH'
          });
        }
        break;

      case 'min':
        if (typeof value === 'number' && value < (rule.value as number)) {
          errors.push({
            path,
            message: rule.message || `フィールド '${field.label}' は${rule.value}以上である必要があります`,
            value,
            expected: `${rule.value}以上`,
            code: 'MIN_VALUE'
          });
        }
        break;

      case 'max':
        if (typeof value === 'number' && value > (rule.value as number)) {
          errors.push({
            path,
            message: rule.message || `フィールド '${field.label}' は${rule.value}以下である必要があります`,
            value,
            expected: `${rule.value}以下`,
            code: 'MAX_VALUE'
          });
        }
        break;

      case 'pattern':
        if (typeof value === 'string' && rule.value) {
          const regex = new RegExp(rule.value as string);
          if (!regex.test(value)) {
            errors.push({
              path,
              message: rule.message || `フィールド '${field.label}' の形式が正しくありません`,
              value,
              expected: `パターン: ${rule.value}`,
              code: 'PATTERN_MISMATCH'
            });
          }
        }
        break;
    }

    return errors;
  }

  /**
   * 日付の妥当性をチェック
   */
  private isValidDate(dateString: string): boolean {
    // ISO 8601形式 (YYYY-MM-DD)
    const isoDate = /^\d{4}-\d{2}-\d{2}$/;
    if (isoDate.test(dateString)) {
      const date = new Date(dateString);
      return date instanceof Date && !isNaN(date.getTime());
    }

    // 日本語形式 (YYYY年MM月DD日)
    const japaneseDate = /^(\d{4})年(\d{1,2})月(\d{1,2})日$/;
    const match = dateString.match(japaneseDate);
    if (match) {
      const [, year, month, day] = match;
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      return date instanceof Date && !isNaN(date.getTime());
    }

    return false;
  }

  /**
   * AjvのエラーをSchemaErrorに変換
   */
  private convertAjvErrors(ajvErrors: ErrorObject[]): SchemaError[] {
    return ajvErrors.map(error => ({
      path: error.instancePath || error.schemaPath,
      message: this.getJapaneseErrorMessage(error),
      value: error.data,
      expected: error.schema?.toString(),
      code: error.keyword?.toUpperCase()
    }));
  }

  /**
   * エラーメッセージを日本語に変換
   */
  private getJapaneseErrorMessage(error: ErrorObject): string {
    const { keyword, message, params } = error;

    switch (keyword) {
      case 'required':
        return `必須プロパティ '${(params as { missingProperty?: string })?.missingProperty}' がありません`;
      case 'type':
        return `データ型が正しくありません。期待される型: ${(params as { type?: string })?.type}`;
      case 'format':
        return `フォーマットが正しくありません。期待されるフォーマット: ${(params as { format?: string })?.format}`;
      case 'minimum':
        return `値が小さすぎます。最小値: ${(params as { limit?: number })?.limit}`;
      case 'maximum':
        return `値が大きすぎます。最大値: ${(params as { limit?: number })?.limit}`;
      case 'minLength':
        return `文字列が短すぎます。最小長: ${(params as { limit?: number })?.limit}`;
      case 'maxLength':
        return `文字列が長すぎます。最大長: ${(params as { limit?: number })?.limit}`;
      case 'pattern':
        return `パターンにマッチしません。パターン: ${(params as { pattern?: string })?.pattern}`;
      case 'enum':
        return `許可されていない値です。許可される値: ${(params as { allowedValues?: string[] })?.allowedValues?.join(', ')}`;
      case 'additionalProperties':
        return `追加のプロパティは許可されていません: ${(params as { additionalProperty?: string })?.additionalProperty}`;
      case 'uniqueItems':
        return '配列内に重複する項目があります';
      case 'minItems':
        return `配列の要素数が少なすぎます。最小要素数: ${(params as { limit?: number })?.limit}`;
      case 'maxItems':
        return `配列の要素数が多すぎます。最大要素数: ${(params as { limit?: number })?.limit}`;
      default:
        return message || 'バリデーションエラーが発生しました';
    }
  }

  /**
   * スキーマから型定義を生成（開発用）
   */
  generateTypeDefinition(): string {
    // 簡単な型定義生成（実装は省略）
    return '// 型定義は別途実装';
  }

  /**
   * バリデーションエラーをフォーマット
   */
  formatValidationErrors(errors: SchemaError[]): string {
    if (errors.length === 0) {
      return 'バリデーションエラーはありません';
    }

    return errors.map((error, index) => 
      `${index + 1}. ${error.path}: ${error.message}`
    ).join('\n');
  }

  /**
   * バリデーション統計を取得
   */
  getValidationStats(result: ValidationResult): {
    totalErrors: number;
    errorsByType: Record<string, number>;
    errorsByPath: Record<string, number>;
  } {
    const stats = {
      totalErrors: result.errors.length,
      errorsByType: {} as Record<string, number>,
      errorsByPath: {} as Record<string, number>
    };

    for (const error of result.errors) {
      // エラータイプ別の統計
      const errorType = error.code || 'UNKNOWN';
      stats.errorsByType[errorType] = (stats.errorsByType[errorType] || 0) + 1;

      // パス別の統計
      const pathParts = error.path.split('.');
      const rootPath = pathParts[0] || 'root';
      stats.errorsByPath[rootPath] = (stats.errorsByPath[rootPath] || 0) + 1;
    }

    return stats;
  }
}

// シングルトンインスタンス
export const schemaValidator = new SchemaValidator();

// ヘルパー関数
export const validateMindmapData = (data: unknown): ValidationResult => {
  return schemaValidator.validateMindmapData(data);
};

export const validateCustomSchema = (schema: unknown): ValidationResult => {
  return schemaValidator.validateCustomSchema(schema);
};

export const validateWithCustomSchema = (data: MindmapData, customSchema: CustomSchema): ValidationResult => {
  return schemaValidator.validateWithCustomSchema(data, customSchema);
};