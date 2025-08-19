import type { MindmapNode } from '../types';

// デバウンス関数
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

// スロットル関数
export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let lastCall = 0;
  return (...args: Parameters<T>) => {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      func(...args);
    }
  };
}

// ディープクローン
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  if (obj instanceof Date) {
    return new Date(obj.getTime()) as T;
  }
  
  if (obj instanceof Array) {
    return obj.map(item => deepClone(item)) as T;
  }
  
  if (typeof obj === 'object') {
    const cloned = {} as T;
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        cloned[key] = deepClone(obj[key]);
      }
    }
    return cloned;
  }
  
  return obj;
}

// ユニークIDの生成
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// ファイル拡張子の取得
export function getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() || '';
}

// ファイル形式の判定
export function detectFileFormat(filename: string): 'json' | 'yaml' | 'unknown' {
  const ext = getFileExtension(filename);
  if (ext === 'json') return 'json';
  if (ext === 'yaml' || ext === 'yml') return 'yaml';
  return 'unknown';
}

// マインドマップノードの検索
export function findNodeById(root: MindmapNode, id: string): MindmapNode | null {
  if (root.id === id) {
    return root;
  }
  
  if (root.children) {
    for (const child of root.children) {
      const found = findNodeById(child, id);
      if (found) {
        return found;
      }
    }
  }
  
  return null;
}

// マインドマップノードの親を検索
export function findParentNode(root: MindmapNode, targetId: string): MindmapNode | null {
  if (root.children) {
    for (const child of root.children) {
      if (child.id === targetId) {
        return root;
      }
      const found = findParentNode(child, targetId);
      if (found) {
        return found;
      }
    }
  }
  
  return null;
}

// マインドマップノードの全ての子ノードを取得
export function getAllChildNodes(node: MindmapNode): MindmapNode[] {
  const result: MindmapNode[] = [];
  
  if (node.children) {
    for (const child of node.children) {
      result.push(child);
      result.push(...getAllChildNodes(child));
    }
  }
  
  return result;
}

// マインドマップノードの深度を計算
export function getNodeDepth(root: MindmapNode, targetId: string, currentDepth = 0): number {
  if (root.id === targetId) {
    return currentDepth;
  }
  
  if (root.children) {
    for (const child of root.children) {
      const depth = getNodeDepth(child, targetId, currentDepth + 1);
      if (depth !== -1) {
        return depth;
      }
    }
  }
  
  return -1;
}

// テキストの省略
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.substring(0, maxLength - 3) + '...';
}

// localStorage機能は削除済み（メモリのみの状態管理に移行）

// エラーメッセージの日本語化
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return '不明なエラーが発生しました';
}