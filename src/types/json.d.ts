/**
 * JSON ファイルのインポート用型定義
 */

declare module "*.json" {
  const value: any;
  export default value;
}

declare module "*.schema.json" {
  const schema: import('ajv').JSONSchemaType<any>;
  export default schema;
}