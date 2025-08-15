#!/usr/bin/env tsx

/**
 * JSON SchemaからTypeScript型定義を自動生成するスクリプト
 * 
 * 使用例:
 * pnpm generate-types
 */

import { compile } from 'json-schema-to-typescript';
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '..');

interface SchemaConfig {
  input: string;
  output: string;
  options?: any;
}

const schemas: SchemaConfig[] = [
  {
    input: 'src/schemas/mindmap-schema.json',
    output: 'src/types/generated/mindmap.ts',
    options: {
      bannerComment: '/* eslint-disable */\n/**\n * This file was automatically generated from mindmap-schema.json.\n * DO NOT MODIFY IT BY HAND. Instead, modify the source JSONSchema file,\n * and run `pnpm generate-types` to regenerate this file.\n */',
      style: {
        singleQuote: true,
        semi: true,
        trailingComma: 'es5'
      },
      additionalProperties: false,
      enableConstEnums: true,
      format: false, // Prettierに任せる
      unreachableDefinitions: false
    }
  }
];

async function generateTypes() {
  console.log('🔧 Generating TypeScript types from JSON Schema...\n');

  for (const schema of schemas) {
    try {
      console.log(`📄 Processing: ${schema.input}`);
      
      const inputPath = resolve(projectRoot, schema.input);
      const outputPath = resolve(projectRoot, schema.output);
      
      // JSON Schemaを読み込み
      const schemaContent = readFileSync(inputPath, 'utf-8');
      const jsonSchema = JSON.parse(schemaContent);
      
      // TypeScript型定義を生成
      const typeDefinitions = await compile(jsonSchema, 'MindmapSchema', schema.options);
      
      // 出力ディレクトリを作成
      const outputDir = dirname(outputPath);
      await import('fs').then(fs => fs.promises.mkdir(outputDir, { recursive: true }));
      
      // ファイルに書き込み
      writeFileSync(outputPath, typeDefinitions);
      
      console.log(`✅ Generated: ${schema.output}`);
      
    } catch (error) {
      console.error(`❌ Error processing ${schema.input}:`, error);
      process.exit(1);
    }
  }

  console.log('\n🎉 All types generated successfully!');
  console.log('\n💡 Next steps:');
  console.log('   - Update imports to use generated types');
  console.log('   - Remove duplicate type definitions');
  console.log('   - Run `pnpm build` to verify everything works');
}

generateTypes().catch(error => {
  console.error('Script failed:', error);
  process.exit(1);
});