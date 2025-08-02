/**
 * JSON ファイルのインポート用型定義
 */

declare module "*.json" {
  const value: Record<string, unknown>;
  export default value;
}

declare module "*.schema.json" {
  const schema: import('ajv').JSONSchemaType<Record<string, unknown>>;
  export default schema;
}