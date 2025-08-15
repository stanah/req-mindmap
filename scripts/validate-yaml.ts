#!/usr/bin/env ts-node

/**
 * YAML/JSONファイルをJSON Schemaでバリデーションするスクリプト
 * 
 * 使用例:
 * pnpm validate-yaml src/data/samples/comprehensive-requirements.yaml
 * pnpm validate-yaml src/data/samples/*.yaml
 */

import { readFileSync } from 'fs';
import { glob } from 'glob';
import { resolve } from 'path';
import { parserService } from '../src/services/parserService';

interface ValidationOptions {
  verbose?: boolean;
  fix?: boolean;
}

async function validateFile(filePath: string, options: ValidationOptions = {}): Promise<boolean> {
  try {
    console.log(`\n📄 Validating: ${filePath}`);
    
    const content = readFileSync(filePath, 'utf-8');
    const result = await parserService.parse(content);
    
    if (result.success) {
      console.log(`✅ Valid: ${filePath}`);
      
      if (options.verbose && result.data) {
        const nodeCount = countNodes(result.data.root);
        const schemaInfo = result.data.schema ? 
          `Schema v${result.data.schema.version || 'unknown'}` : 
          'No schema';
        console.log(`   📊 Nodes: ${nodeCount}, ${schemaInfo}`);
      }
      
      return true;
    } else {
      console.log(`❌ Invalid: ${filePath}`);
      
      if (result.errors && result.errors.length > 0) {
        result.errors.forEach(error => {
          console.log(`   🚨 Line ${error.line}:${error.column} - ${error.message}`);
          if (options.verbose && error.details) {
            console.log(`      Details: ${error.details}`);
          }
        });
      }
      
      return false;
    }
  } catch (error) {
    console.log(`❌ Error validating ${filePath}:`);
    console.log(`   ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}

function countNodes(node: any): number {
  let count = 1;
  if (node.children && Array.isArray(node.children)) {
    for (const child of node.children) {
      count += countNodes(child);
    }
  }
  return count;
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage: pnpm validate-yaml <file-pattern> [--verbose] [--fix]');
    console.log('Example: pnpm validate-yaml src/data/samples/*.yaml --verbose');
    process.exit(1);
  }

  const options: ValidationOptions = {
    verbose: args.includes('--verbose'),
    fix: args.includes('--fix')
  };

  const patterns = args.filter(arg => !arg.startsWith('--'));
  let allFiles: string[] = [];

  // Globパターンでファイルを展開
  for (const pattern of patterns) {
    try {
      const files = await glob(pattern, { absolute: true });
      allFiles = allFiles.concat(files);
    } catch (error) {
      // 単一ファイルの場合
      try {
        const absolutePath = resolve(pattern);
        allFiles.push(absolutePath);
      } catch {
        console.log(`❌ Invalid pattern: ${pattern}`);
      }
    }
  }

  if (allFiles.length === 0) {
    console.log('❌ No files found matching the pattern(s)');
    process.exit(1);
  }

  console.log(`🔍 Found ${allFiles.length} file(s) to validate`);

  let validCount = 0;
  let invalidCount = 0;

  for (const file of allFiles) {
    const isValid = await validateFile(file, options);
    if (isValid) {
      validCount++;
    } else {
      invalidCount++;
    }
  }

  console.log(`\n📊 Validation Summary:`);
  console.log(`   ✅ Valid files: ${validCount}`);
  console.log(`   ❌ Invalid files: ${invalidCount}`);
  console.log(`   📄 Total files: ${allFiles.length}`);

  if (invalidCount > 0) {
    console.log('\n💡 Tips:');
    console.log('   - Use --verbose for detailed error information');
    console.log('   - Check the JSON Schema at src/schemas/mindmap-schema.json');
    console.log('   - Ensure all required fields (version, title, root) are present');
    console.log('   - Verify date fields use ISO 8601 format (YYYY-MM-DDTHH:mm:ssZ)');
    
    process.exit(1);
  }

  console.log('\n🎉 All files are valid!');
}

// スクリプトとして直接実行されたときにmainを呼び出し
main().catch(error => {
  console.error('Script failed:', error);
  process.exit(1);
});