/**
 * マインドマップコアパーサー
 * プラットフォーム非依存のJSON/YAML解析機能
 */

import * as yaml from 'js-yaml';
import type { 
  MindmapData, 
  ParseError, 
  ParseResult,
  ParseOptions,
  ValidationResult,
  CustomSchema,
  MindmapNode,
  SchemaError
} from '../types';

/**
 * マインドマップパーサーコアクラス
 */
export class MindmapParser {
  private customSchema: CustomSchema | null = null;

  /**
   * カスタムスキーマの設定
   */
  public setCustomSchema(schema: CustomSchema | null): void {
    this.customSchema = schema;
  }

  /**
   * テキストコンテンツの解析（JSON/YAMLの自動判定）
   */
  public parse(content: string, options: ParseOptions = {}): ParseResult {
    const errors: ParseError[] = [];
    const warnings: ParseError[] = [];

    try {
      // 空文字列チェック
      if (!content.trim()) {
        errors.push({
          line: 1,
          column: 1,
          message: 'ファイル内容が空です',
          severity: 'error'
        });
        return { data: null, errors, warnings, valid: false };
      }

      // フォーマット判定と解析
      let data: unknown;
      if (this.isJSON(content)) {
        data = this.parseJSON(content);
      } else {
        data = this.parseYAML(content);
      }

      // データ検証
      const validationResult = this.validateData(data, options);
      if (!validationResult.valid) {
        errors.push(...validationResult.errors.map(err => ({
          line: 1,
          column: 1,
          message: err.message,
          severity: 'error' as const
        })));
      }

      if (validationResult.warnings && validationResult.warnings.length > 0) {
        warnings.push(...validationResult.warnings.map(warn => ({
          line: 1,
          column: 1,
          message: warn.message,
          severity: 'warning' as const
        })));
      }

      return {
        data: errors.length === 0 ? data as MindmapData : null,
        errors,
        warnings,
        valid: errors.length === 0
      };

    } catch (error) {
      errors.push({
        line: 1,
        column: 1,
        message: error instanceof Error ? error.message : '不明なエラーが発生しました',
        severity: 'error'
      });

      return { data: null, errors, warnings, valid: false };
    }
  }

  /**
   * JSON文字列の解析
   */
  public parseJSON(content: string): unknown {
    try {
      return JSON.parse(content);
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error(`JSON構文エラー: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * YAML文字列の解析
   */
  public parseYAML(content: string): unknown {
    try {
      return yaml.load(content);
    } catch (error: unknown) {
      const yamlError = error as { mark?: { line: number }; message?: string };
      if (yamlError.mark) {
        throw new Error(`YAML構文エラー (行 ${yamlError.mark.line + 1}): ${yamlError.message}`);
      }
      throw new Error(`YAML解析エラー: ${yamlError.message || '不明なエラー'}`);
    }
  }

  /**
   * JSONかどうかの判定
   */
  private isJSON(content: string): boolean {
    const trimmed = content.trim();
    return trimmed.startsWith('{') || trimmed.startsWith('[');
  }

  /**
   * データの基本的なバリデーション
   */
  public validateData(data: unknown, options: ParseOptions = {}): ValidationResult {
    const errors: SchemaError[] = [];
    const warnings: SchemaError[] = [];

    // null/undefined チェック
    if (!data) {
      errors.push({
        path: 'root',
        message: 'データが存在しません',
        value: data
      });
      return { valid: false, errors, warnings };
    }

    // 基本構造の検証
    if (!this.isValidMindmapData(data)) {
      errors.push({
        path: 'root',
        message: '無効なマインドマップデータ構造です',
        value: data
      });
    }

    const typedData = data as Record<string, unknown>;
    
    // 必須フィールドの検証
    if (!typedData.version) {
      errors.push({
        path: 'version',
        message: 'バージョン情報が必要です',
        value: typedData.version
      });
    }

    if (!typedData.title) {
      errors.push({
        path: 'title',
        message: 'タイトルが必要です',
        value: typedData.title
      });
    }

    if (!typedData.root) {
      errors.push({
        path: 'root',
        message: 'ルートノードが必要です',
        value: typedData.root
      });
    } else {
      // ルートノードの検証
      const rootValidation = this.validateNode(typedData.root as MindmapNode, 'root');
      errors.push(...rootValidation.errors);
      if (rootValidation.warnings) {
        warnings.push(...rootValidation.warnings);
      }
    }

    // カスタムスキーマバリデーション
    if (options.validateSchema && this.customSchema) {
      const schemaValidation = this.validateWithCustomSchema(typedData as MindmapData);
      errors.push(...schemaValidation.errors);
      if (schemaValidation.warnings) {
        warnings.push(...schemaValidation.warnings);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * マインドマップデータ構造の基本チェック
   */
  private isValidMindmapData(data: unknown): boolean {
    const typedData = data as Record<string, unknown>;
    return (
      typeof data === 'object' &&
      data !== null &&
      typeof typedData.version === 'string' &&
      typeof typedData.title === 'string' &&
      typeof typedData.root === 'object'
    );
  }

  /**
   * ノードの検証
   */
  private validateNode(node: unknown, path: string): ValidationResult {
    const errors: SchemaError[] = [];
    const warnings: SchemaError[] = [];

    if (!node || typeof node !== 'object') {
      errors.push({
        path,
        message: 'ノードが無効です',
        value: node
      });
      return { valid: false, errors, warnings };
    }

    const typedNode = node as Record<string, unknown>;

    // 必須フィールド
    if (!typedNode.id) {
      errors.push({
        path: `${path}.id`,
        message: 'ノードIDが必要です',
        value: typedNode.id
      });
    }

    if (!typedNode.title) {
      errors.push({
        path: `${path}.title`,
        message: 'ノードタイトルが必要です',
        value: typedNode.title
      });
    }

    // 子ノードの検証（再帰的）
    if (typedNode.children && Array.isArray(typedNode.children)) {
      typedNode.children.forEach((child: unknown, index: number) => {
        const childPath = `${path}.children[${index}]`;
        const childValidation = this.validateNode(child, childPath);
        errors.push(...childValidation.errors);
        if (childValidation.warnings) {
          warnings.push(...childValidation.warnings);
        }
      });
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * カスタムスキーマでのバリデーション
   */
  private validateWithCustomSchema(data: MindmapData): ValidationResult {
    const errors: SchemaError[] = [];
    const warnings: SchemaError[] = [];

    if (!this.customSchema) {
      return { valid: true, errors, warnings };
    }

    // ここでカスタムスキーマに基づく詳細なバリデーションを実装
    // 現在は基本的な実装のみ

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * ノードのIDを生成
   */
  public generateNodeId(): string {
    return `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * データの正規化
   */
  public normalizeData(data: MindmapData): MindmapData {
    const normalized = { ...data };

    // バージョンがない場合はデフォルト値を設定
    if (!normalized.version) {
      normalized.version = '1.0.0';
    }

    // ルートノードの正規化
    if (normalized.root) {
      normalized.root = this.normalizeNode(normalized.root);
    }

    // 日時フィールドの設定
    const now = new Date().toISOString();
    if (!normalized.createdAt) {
      normalized.createdAt = now;
    }
    normalized.updatedAt = now;

    return normalized;
  }

  /**
   * ノードの正規化
   */
  private normalizeNode(node: MindmapNode): MindmapNode {
    const normalized = { ...node };

    // IDがない場合は生成
    if (!normalized.id) {
      normalized.id = this.generateNodeId();
    }

    // 子ノードの正規化（再帰的）
    if (normalized.children && Array.isArray(normalized.children)) {
      normalized.children = normalized.children.map(child => 
        this.normalizeNode(child)
      );
    }

    return normalized;
  }

  /**
   * データをJSON形式で出力
   */
  public toJSON(data: MindmapData, pretty: boolean = true): string {
    return pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data);
  }

  /**
   * データをYAML形式で出力
   */
  public toYAML(data: MindmapData): string {
    return yaml.dump(data, {
      indent: 2,
      lineWidth: 80,
      noRefs: true
    });
  }
}