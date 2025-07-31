import type { FileService } from '../types';

// ブラウザ環境用のファイルサービス実装
export class BrowserFileService implements FileService {
  private watchers: Map<string, (content: string) => void> = new Map();

  async loadFile(_path: string): Promise<string> {
    // ブラウザ環境では File API を使用
    return new Promise((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json,.yaml,.yml';
      
      input.onchange = (event) => {
        const file = (event.target as HTMLInputElement).files?.[0];
        if (!file) {
          reject(new Error('ファイルが選択されませんでした'));
          return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
          const content = e.target?.result as string;
          resolve(content);
        };
        reader.onerror = () => {
          reject(new Error('ファイルの読み込みに失敗しました'));
        };
        reader.readAsText(file);
      };

      input.click();
    });
  }

  async saveFile(path: string, content: string): Promise<void> {
    // ブラウザ環境ではダウンロードとして保存
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = path.split('/').pop() || 'mindmap.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    URL.revokeObjectURL(url);
  }

  watchFile(path: string, callback: (content: string) => void): void {
    // ブラウザ環境では実際のファイル監視は不可能
    // 代わりにコールバックを保存して手動更新時に使用
    this.watchers.set(path, callback);
  }

  stopWatching(path: string): void {
    this.watchers.delete(path);
  }

  // 手動でファイル変更を通知するメソッド（開発用）
  notifyFileChange(path: string, content: string): void {
    const callback = this.watchers.get(path);
    if (callback) {
      callback(content);
    }
  }
}

// VSCode拡張用のファイルサービス実装（将来用）
export class VSCodeFileService implements FileService {
  async loadFile(_path: string): Promise<string> {
    // VSCode API を使用した実装
    // 現在はプレースホルダー
    throw new Error('VSCode file service not implemented yet');
  }

  async saveFile(_path: string, _content: string): Promise<void> {
    // VSCode API を使用した実装
    // 現在はプレースホルダー
    throw new Error('VSCode file service not implemented yet');
  }

  watchFile(_path: string, _callback: (content: string) => void): void {
    // VSCode API を使用した実装
    // 現在はプレースホルダー
    throw new Error('VSCode file service not implemented yet');
  }

  stopWatching(_path: string): void {
    // VSCode API を使用した実装
    // 現在はプレースホルダー
    throw new Error('VSCode file service not implemented yet');
  }
}

// 環境に応じたファイルサービスのファクトリー
export function createFileService(): FileService {
  // 現在はブラウザ環境のみサポート
  return new BrowserFileService();
}