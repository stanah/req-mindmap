import type { FileSystemAdapter, FileDialogOptions } from '../interfaces';

/**
 * ブラウザ環境でのファイルシステム操作実装
 * File API とローカルストレージを使用
 */
export class BrowserFileSystemAdapter implements FileSystemAdapter {
  private fileHandles = new Map<string, FileSystemFileHandle>();

  async readFile(path: string): Promise<string> {
    // ブラウザ環境では、事前に選択されたファイルハンドルを使用
    const handle = this.fileHandles.get(path);
    if (!handle) {
      throw new Error(`ファイルが見つかりません: ${path}`);
    }

    const file = await handle.getFile();
    return await file.text();
  }

  async writeFile(path: string, content: string): Promise<void> {
    const handle = this.fileHandles.get(path);
    if (!handle) {
      throw new Error(`ファイルハンドルが見つかりません: ${path}`);
    }

    // ファイル書き込み権限を確認（ブラウザサポート確認付き）
    try {
      if ('queryPermission' in handle) {
        const permission = await (handle as any).queryPermission({ mode: 'readwrite' });
        if (permission !== 'granted') {
          const newPermission = await (handle as any).requestPermission({ mode: 'readwrite' });
          if (newPermission !== 'granted') {
            throw new Error('ファイル書き込み権限が拒否されました');
          }
        }
      }
    } catch (error) {
      console.warn('Permission API not supported, proceeding without permission check:', error);
    }

    const writable = await handle.createWritable();
    await writable.write(content);
    await writable.close();
  }

  async exists(path: string): Promise<boolean> {
    return this.fileHandles.has(path);
  }

  async showOpenDialog(options: FileDialogOptions): Promise<string | null> {
    try {
      // File System Access API を使用
      if ('showOpenFilePicker' in window) {
        const fileHandles = await (window as any).showOpenFilePicker({
          types: options.filters?.map(filter => ({
            description: filter.name,
            accept: {
              'application/json': filter.extensions.includes('json') ? ['.json'] : [],
              'application/x-yaml': filter.extensions.includes('yaml') || filter.extensions.includes('yml') 
                ? ['.yaml', '.yml'] : []
            }
          })) || [{
            description: 'マインドマップファイル',
            accept: {
              'application/json': ['.json'],
              'application/x-yaml': ['.yaml', '.yml']
            }
          }],
          multiple: options.allowMultiple || false
        });

        if (fileHandles.length > 0) {
          const handle = fileHandles[0];
          const path = handle.name;
          this.fileHandles.set(path, handle);
          return path;
        }
      } else {
        // フォールバック: 従来のファイル入力要素を使用
        return this.showLegacyFileDialog(options);
      }
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        console.error('ファイル選択エラー:', error);
      }
    }
    
    return null;
  }

  async showSaveDialog(options: FileDialogOptions): Promise<string | null> {
    try {
      // File System Access API を使用
      if ('showSaveFilePicker' in window) {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: options.defaultPath || 'mindmap.json',
          types: options.filters?.map(filter => ({
            description: filter.name,
            accept: {
              'application/json': filter.extensions.includes('json') ? ['.json'] : [],
              'application/x-yaml': filter.extensions.includes('yaml') || filter.extensions.includes('yml') 
                ? ['.yaml', '.yml'] : []
            }
          })) || [{
            description: 'マインドマップファイル',
            accept: {
              'application/json': ['.json'],
              'application/x-yaml': ['.yaml', '.yml']
            }
          }]
        });

        const path = handle.name;
        this.fileHandles.set(path, handle);
        return path;
      } else {
        // フォールバック: ダウンロードリンクを使用
        return this.showLegacySaveDialog(options);
      }
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        console.error('ファイル保存エラー:', error);
      }
    }

    return null;
  }

  watchFile(path: string, callback: (content: string) => void): () => void {
    // ブラウザ環境では、ファイル監視は制限的
    // 代わりに定期的なポーリングまたは手動更新を実装
    let isWatching = true;
    
    const checkFile = async () => {
      if (!isWatching) return;
      
      try {
        const content = await this.readFile(path);
        callback(content);
      } catch (error) {
        console.warn('ファイル監視エラー:', error);
      }
      
      if (isWatching) {
        setTimeout(checkFile, 1000); // 1秒間隔でチェック
      }
    };

    // 初回チェックを遅延実行
    setTimeout(checkFile, 100);

    return () => {
      isWatching = false;
    };
  }

  /**
   * 従来のファイル入力要素を使用したファイル選択
   */
  private showLegacyFileDialog(options: FileDialogOptions): Promise<string | null> {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.multiple = options.allowMultiple || false;
      
      if (options.filters) {
        const extensions = options.filters.flatMap(f => f.extensions.map(ext => `.${ext}`));
        input.accept = extensions.join(',');
      }

      input.onchange = async (event) => {
        const files = (event.target as HTMLInputElement).files;
        if (files && files.length > 0) {
          const file = files[0];
          const content = await file.text();
          
          // ファイル内容をメモリに保存
          const path = file.name;
          this.storeFileContent(path, content);
          resolve(path);
        } else {
          resolve(null);
        }
      };

      input.oncancel = () => resolve(null);
      input.click();
    });
  }

  /**
   * 従来のダウンロードリンクを使用したファイル保存
   */
  private showLegacySaveDialog(options: FileDialogOptions): Promise<string | null> {
    // この実装では、実際のファイル保存ダイアログは表示できないため、
    // デフォルトのファイル名を返す
    return Promise.resolve(options.defaultPath || 'mindmap.json');
  }

  /**
   * ファイル内容をローカルストレージに保存（フォールバック用）
   */
  private storeFileContent(path: string, content: string): void {
    try {
      localStorage.setItem(`file_content_${path}`, content);
    } catch (error) {
      console.warn('ローカルストレージへの保存に失敗:', error);
    }
  }

  /**
   * ローカルストレージからファイル内容を取得（フォールバック用）
   * 将来の機能拡張のために保持
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private _getStoredFileContent(path: string): string | null {
    try {
      return localStorage.getItem(`file_content_${path}`);
    } catch (error) {
      console.warn('ローカルストレージからの読み込みに失敗:', error);
      return null;
    }
  }
}