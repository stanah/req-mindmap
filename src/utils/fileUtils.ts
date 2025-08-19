/**
 * ファイル関連のユーティリティ関数
 */

/**
 * ファイル形式をファイル名から判定
 */
export function detectFormat(filename: string): 'json' | 'yaml' | 'unknown' {
  const extension = filename.split('.').pop()?.toLowerCase();
  
  if (extension === 'json') return 'json';
  if (extension === 'yaml' || extension === 'yml') return 'yaml';
  
  return 'unknown';
}

/**
 * ファイル形式を自動検出（内容も考慮）
 */
export function detectFileFormat(filename: string, content?: string): 'json' | 'yaml' | 'unknown' {
  const extension = filename.split('.').pop()?.toLowerCase();
  
  // 拡張子による判定
  if (extension === 'json') return 'json';
  if (extension === 'yaml' || extension === 'yml') return 'yaml';
  
  // 内容による判定（拡張子が不明な場合）
  if (content) {
    const trimmed = content.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) return 'json';
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) return 'json';
    
    // YAML特有のパターンを検出
    if (/^[a-zA-Z_][a-zA-Z0-9_]*:\s*/.test(trimmed) || 
        /^-\s+/.test(trimmed)) return 'yaml';
  }
  
  return 'unknown';
}