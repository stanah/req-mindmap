import type { FileService } from '../types';

/**
 * ファイル情報インターフェース
 */
export interface FileInfo {
  /** ファイル名 */
  name: string;
  /** ファイルパス */
  path: string;
  /** ファイルサイズ（バイト） */
  size: number;
  /** ファイル形式 */
  type: string;
  /** 最終更新日時 */
  lastModified: number;
  /** ファイル拡張子 */
  extension: string;
  /** 推定されたファイル形式 */
  detectedFormat: 'json' | 'yaml' | 'unknown';
}

/**
 * ファイル読み込み結果
 */
export interface FileLoadResult {
  /** ファイル内容 */
  content: string;
  /** ファイル情報 */
  fileInfo: FileInfo;
  /** 読み込み成功フラグ */
  success: boolean;
  /** エラーメッセージ（失敗時） */
  error?: string;
}

/**
 * ファイル保存オプション
 */
export interface FileSaveOptions {
  /** ファイル名（省略時はダイアログで指定） */
  filename?: string;
  /** ファイル形式 */
  format?: 'json' | 'yaml';
  /** 保存形式の詳細設定 */
  formatOptions?: {
    /** JSONの場合のインデント */
    indent?: number;
    /** YAMLの場合のインデント */
    yamlIndent?: number;
  };
}

// ブラウザ環境用のファイルサービス実装
export class BrowserFileService implements FileService {
  private watchers: Map<string, (content: string | File) => void> = new Map();
  // ドラッグアンドドロップ機能（将来実装予定）
   
  private _dragAndDropEnabled = false;
  private recentFiles: FileInfo[] = [];


  /**
   * ファイル形式を自動検出
   */
  detectFormat(filename: string): 'json' | 'yaml' | 'unknown' {
    const extension = filename.split('.').pop()?.toLowerCase();
    
    if (extension === 'json') return 'json';
    if (extension === 'yaml' || extension === 'yml') return 'yaml';
    
    return 'unknown';
  }

  /**
   * ファイル形式を自動検出（内容も考慮）
   */
  private detectFileFormat(filename: string, content?: string): 'json' | 'yaml' | 'unknown' {
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

  /**
   * ファイル情報を作成
   */
  private createFileInfo(file: File, content: string): FileInfo {
    const extension = file.name.split('.').pop()?.toLowerCase() || '';
    const detectedFormat = this.detectFileFormat(file.name, content);
    
    return {
      name: file.name,
      path: file.name, // ブラウザ環境ではファイル名をパスとして使用
      size: file.size,
      type: file.type,
      lastModified: file.lastModified,
      extension,
      detectedFormat,
    };
  }

  /**
   * ファイルを開く（File System Access API使用）
   */
  /**
   * ファイルを開く（File System Access API使用）
   */
  async openFile(): Promise<{
    success: boolean;
    data?: unknown;
    fileName?: string;
    format?: 'json' | 'yaml';
    error?: string;
  }> {
    try {
      // File System Access APIが利用可能かチェック
      if (!('showOpenFilePicker' in window)) {
        return { 
          success: false, 
          error: 'ファイルシステムアクセスAPIが利用できません。ブラウザが対応していないか、HTTPSでアクセスしてください。' 
        };
      }

      // ファイル選択ダイアログを表示
      const [fileHandle] = await (window as Window & { showOpenFilePicker: (options: unknown) => Promise<FileSystemFileHandle[]> }).showOpenFilePicker({
        types: [
          {
            description: 'マインドマップファイル',
            accept: {
              'application/json': ['.json'],
              'text/yaml': ['.yaml', '.yml'],
            },
          },
        ],
        excludeAcceptAllOption: true,
        multiple: false,
      });

      // ファイルを読み込み
      const file = await fileHandle.getFile();
      const content = await file.text();
      
      // ファイル形式を検出
      const format = this.detectFileFormat(file.name, content);
      
      if (format === 'unknown') {
        return {
          success: false,
          error: `サポートされていないファイル形式です: ${file.name}`
        };
      }

      // ファイル内容をパース
      let data;
      try {
        if (format === 'json') {
          data = JSON.parse(content);
        } else if (format === 'yaml') {
          // 簡単なYAMLパーサー（基本的な構造のみサポート）
          try {
            data = this.parseSimpleYaml(content);
          } catch (yamlError) {
            return {
              success: false,
              error: `YAML構文エラー: ${yamlError instanceof Error ? yamlError.message : String(yamlError)}`
            };
          }
        }
      } catch (_parseError) {
        return {
          success: false,
          error: `${format.toUpperCase()}構文エラー: ${_parseError instanceof Error ? _parseError.message : String(_parseError)}`
        };
      }

      // 最近使用したファイルに追加
      this.addToRecentFiles({
        name: file.name,
        path: file.name, // ブラウザ環境では実パスは取得できない
        lastModified: file.lastModified
      });

      return {
        success: true,
        data,
        fileName: file.name,
        format
      };

    } catch (error) {
// ユーザーがキャンセルした場合
      if ((error as Error & { name?: string })?.name === 'AbortError' || (error as Error)?.message?.includes('cancelled') || (error as Error)?.message?.includes('User cancelled')) {
        return {
          success: false,
          error: 'ファイル選択がキャンセルされました'
        };
      }

      // セキュリティエラー
      if ((error as Error & { name?: string })?.name === 'SecurityError' || (error as Error)?.message?.includes('Security error')) {
        return {
          success: false,
          error: 'セキュリティエラー: ファイルへのアクセスが拒否されました'
        };
      }

      // ネットワークエラー
      if ((error as Error & { name?: string })?.name === 'NetworkError' || (error as Error)?.message?.includes('Network error') || (error as Error)?.message?.includes('network')) {
        return {
          success: false,
          error: 'ネットワークエラー: ファイルの読み込みに失敗しました'
        };
      }

      // エラーメッセージを解析
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // ファイルシステムアクセスAPIが利用できない場合
      if (errorMessage.includes('showOpenFilePicker') || errorMessage.includes('not a function')) {
        return {
          success: false,
          error: 'ファイルシステムアクセスAPIが利用できません。ブラウザが対応していないか、HTTPSでアクセスしてください。'
        };
      }
      
      // その他のエラー
      return {
        success: false,
        error: `ファイルの読み込みに失敗しました: ${errorMessage}`
      };
    }
  }

  /**
   * 高機能なファイル保存（オプション付き）
   */
  async saveFileWithOptions(content: string, options: FileSaveOptions = {}): Promise<void> {
    const { filename, format, formatOptions } = options;
    
    // フォーマット指定がある場合は内容を整形
    let processedContent = content;
    let finalFilename = filename || 'mindmap.json';
    let mimeType = 'text/plain;charset=utf-8';
    
    if (format === 'json') {
      try {
        const parsed = JSON.parse(content);
        const indent = formatOptions?.indent ?? 2;
        processedContent = JSON.stringify(parsed, null, indent);
        mimeType = 'application/json;charset=utf-8';
        if (!finalFilename.endsWith('.json')) {
          finalFilename = finalFilename.replace(/\.[^.]*$/, '.json') || 'mindmap.json';
        }
      } catch (error) {
        console.warn('JSON formatting failed, saving as-is:', error);
      }
    } else if (format === 'yaml') {
      // YAMLフォーマット機能は将来実装予定
      mimeType = 'text/yaml;charset=utf-8';
      if (!finalFilename.endsWith('.yaml') && !finalFilename.endsWith('.yml')) {
        finalFilename = finalFilename.replace(/\.[^.]*$/, '.yaml') || 'mindmap.yaml';
      }
    }

    const blob = new Blob([processedContent], { type: mimeType });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = finalFilename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    
    // クリーンアップ
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  }

  /**
   * 名前をつけて保存ダイアログ（将来のHTML File System Access API対応準備）
   */
  async saveAsFile(content: string, suggestedName?: string): Promise<void> {
    // 現在はダウンロード方式で実装
    // 将来的にはFile System Access APIを使用予定
    await this.saveFileWithOptions(content, { filename: suggestedName });
  }

  /**
   * ユーザーがファイルを選択して読み込み、ファイル情報も含めて返す
   */
  async loadFileWithInfo(): Promise<FileLoadResult> {
    return new Promise((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json,.yaml,.yml';
      
      input.onchange = async (event) => {
        const target = event.target as HTMLInputElement;
        const file = target.files?.[0];
        
        if (!file) {
          reject(new Error('ファイルが選択されませんでした'));
          return;
        }

        try {
          const content = await file.text();
          const fileInfo = this.createFileInfo(file, content);
          
          resolve({
            content,
            fileInfo,
            success: true
          });
        } catch (error) {
          reject(new Error(`ファイル読み込みエラー: ${error instanceof Error ? error.message : String(error)}`));
        }
      };

      input.click();
    });
  }

  // FileServiceインターフェースの必須メソッド
  async loadFile(_path: string): Promise<string> {
    // ブラウザ環境では直接パスでのファイル読み込みは不可能
    // ユーザー選択によるファイル読み込みを実行
    throw new Error('ブラウザ環境では直接パスでのファイル読み込みはサポートされていません。loadFileWithInfoメソッドを使用してください。');
  }

  async saveFile(pathOrData: string | unknown, contentOrFormat?: string | 'json' | 'yaml'): Promise<{ success: boolean; error?: string } | void> {
    try {
      // 引数のパターンを判定
      let content: string;
      let format: 'json' | 'yaml' = 'json';
      
      if (typeof pathOrData === 'string' && typeof contentOrFormat === 'string') {
        // 元のインターフェース: saveFile(path, content)
        const pathStr = String(pathOrData); // 文字列に確実に変換
        const filename = pathStr.split('/').pop() || 'untitled.json';
        await this.saveFileWithOptions(contentOrFormat, { filename });
        return { success: true };
      } else {
        // 新しいインターフェース: saveFile(data, format)
        if (typeof pathOrData === 'string') {
          content = pathOrData;
        } else {
          format = (contentOrFormat as 'json' | 'yaml') || 'json';
          if (format === 'json') {
            content = JSON.stringify(pathOrData, null, 2);
          } else {
            // YAML形式の場合は簡易変換
            content = this.convertToSimpleYaml(pathOrData);
          }
        }
      }
      
      // File System Access API が利用可能かチェック
      if (!('showSaveFilePicker' in window)) {
        // フォールバック: ダウンロード方式
        await this.saveFileWithOptions(content, { format });
        return { success: true };
      }

      // ファイル形式に応じたオプション設定
      const fileExtension = format === 'yaml' ? '.yaml' : '.json';
      const mimeType = format === 'yaml' ? 'text/yaml' : 'application/json';
      
      // File System Access API を使用
      const fileHandle = await (window as Window & { showSaveFilePicker: (options: unknown) => Promise<FileSystemFileHandle> }).showSaveFilePicker({
        types: [
          {
            description: `${format.toUpperCase()}ファイル`,
            accept: {
              [mimeType]: [fileExtension],
            },
          },
        ],
        suggestedName: `mindmap${fileExtension}`,
      });

      // ファイルに書き込み
      const writable = await fileHandle.createWritable();
      await writable.write(content);
      await writable.close();
      
      return { success: true };
      
    } catch (error) {
      // キャンセルエラー
      if ((error as Error & { name?: string })?.name === 'AbortError' || (error as Error)?.message?.includes('cancelled')) {
        return {
          success: false,
          error: 'ファイル保存がキャンセルされました'
        };
      }
      
      // サポートされていない形式のチェック
      if (contentOrFormat === 'xml') {
        return {
          success: false,
          error: 'サポートされていない形式です'
        };
      }
      
      return {
        success: false,
        error: `ファイルの保存に失敗しました: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  watchFile(pathOrFile: string | File, callback: (content: string | File) => void): void {
    // ファイル監視のコールバックを登録
    if (pathOrFile instanceof File) {
      this.watchers.set(pathOrFile.name, callback);
    } else {
      this.watchers.set(pathOrFile, callback);
    }
  }



  stopWatching(): void {
    this.watchers.clear();
  }

  /**
   * ファイル変更を通知する（テスト用）
   */
  notifyFileChange(pathOrFile: string | File, content?: string): void {
    if (pathOrFile instanceof File) {
      // Fileオブジェクトが渡された場合
      const callback = this.watchers.get(pathOrFile.name);
      if (callback) {
        callback(pathOrFile);
      }
    } else {
      // パス文字列が渡された場合
      const callback = this.watchers.get(pathOrFile);
      if (callback && content !== undefined) {
        callback(content);
      }
    }
  }

  /**
   * 簡単なYAMLパーサー（基本的な構造のみサポート）
   */
  /**
   * 簡単なYAMLパーサー（基本的な構造のみサポート）
   */
  /**
   * 簡単なYAMLパーサー（基本的な構造のみサポート）
   */
  private parseSimpleYaml(yamlText: string): Record<string, unknown> {
    try {
      // 非常に基本的なYAML → JSON変換
      // より高度なパースが必要な場合はjs-yamlライブラリなどを使用
      const lines = yamlText.split('\n');
      const result: Record<string, unknown> = {};
      let currentObj = result;
      const stack: Record<string, unknown>[] = [];
      let hasValidContent = false;
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        
        // 基本的な構文チェック
        const colonIndex = trimmed.indexOf(':');
        if (colonIndex === -1) {
          // コロンがない行は無効な構文として扱う
          if (trimmed.length > 0 && !trimmed.startsWith('-')) {
            throw new Error(`無効なYAML構文: ${trimmed} (行 ${i + 1})`);
          }
          continue;
        }
        
        const key = trimmed.substring(0, colonIndex).trim();
        const value = trimmed.substring(colonIndex + 1).trim();
        
        // キーが空の場合はエラー
        if (!key) {
          throw new Error(`キーが空です: ${trimmed} (行 ${i + 1})`);
        }
        
        // 引用符のバランスチェック
        if (value.startsWith('"') && !value.endsWith('"')) {
          throw new Error(`引用符が閉じられていません: ${trimmed} (行 ${i + 1})`);
        }
        
        // 無効な文字をチェック
        if (key.includes('"') && (!key.startsWith('"') || !key.endsWith('"'))) {
          throw new Error(`キーの引用符が不正です: ${key} (行 ${i + 1})`);
        }
        
        hasValidContent = true;
        
        if (value === '') {
          // ネストしたオブジェクト
          currentObj[key] = {} as Record<string, unknown>;
          stack.push(currentObj);
          currentObj = currentObj[key] as Record<string, unknown>;
        } else if (value.startsWith('"') && value.endsWith('"')) {
          // 文字列値
          currentObj[key] = value.slice(1, -1);
        } else if (value === 'true' || value === 'false') {
          // ブール値
          currentObj[key] = value === 'true';
        } else if (!isNaN(Number(value))) {
          // 数値
          currentObj[key] = Number(value);
        } else {
          // その他の文字列
          currentObj[key] = value;
        }
      }
      
      // 有効なコンテンツが一つもない場合はエラー
      if (!hasValidContent) {
        throw new Error('有効なYAMLコンテンツが見つかりません');
      }
      
      return result;
    } catch (error) {
      throw new Error(`YAML解析エラー: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 簡単なJSON→YAML変換（基本的な構造のみサポート）
   */
  private convertToSimpleYaml(obj: unknown, indent: number = 0): string {
    const indentStr = '  '.repeat(indent);
    let result = '';
    
    if (typeof obj === 'object' && obj !== null && !Array.isArray(obj)) {
      for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          result += `${indentStr}${key}:\n`;
          result += this.convertToSimpleYaml(value, indent + 1);
        } else if (Array.isArray(value)) {
          result += `${indentStr}${key}:\n`;
          for (const item of value) {
            if (typeof item === 'object' && item !== null) {
              result += `${indentStr}  -\n`;
              result += this.convertToSimpleYaml(item, indent + 2);
            } else {
              result += `${indentStr}  - ${this.formatYamlValue(item)}\n`;
            }
          }
        } else {
          result += `${indentStr}${key}: ${this.formatYamlValue(value)}\n`;
        }
      }
    }
    
    return result;
  }
  
  private formatYamlValue(value: unknown): string {
    if (typeof value === 'string') {
      // 特殊文字を含む場合は引用符で囲む
      if (value.includes(':') || value.includes('#') || value.includes('\n')) {
        return `"${value}"`;
      }
      return value;
    } else if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    } else if (value === null || value === undefined) {
      return 'null';
    }
    return String(value);
  }

  async exists(_path: string): Promise<boolean> {
    // ブラウザ環境では実装不可能（セキュリティ上の制限）
    return false;
  }

  async deleteFile(_path: string): Promise<void> {
    // ブラウザ環境では実装不可能（セキュリティ上の制限）
    throw new Error('ブラウザ環境ではファイル削除はサポートされていません');
  }

  async createDirectory(_path: string): Promise<void> {
    // ブラウザ環境では実装不可能（セキュリティ上の制限）
    throw new Error('ブラウザ環境ではディレクトリ作成はサポートされていません');
  }

  async listFiles(_path: string): Promise<string[]> {
    // ブラウザ環境では実装不可能（セキュリティ上の制限）
    return [];
  }

  // 最近使用したファイル関連のメソッド
  addToRecentFiles(fileInfo: Pick<FileInfo, 'name' | 'path' | 'lastModified'>): void {
    // 既存のエントリを削除
    this.recentFiles = this.recentFiles.filter(f => f.path !== fileInfo.path);
    
    // 新しいエントリを先頭に追加（完全なFileInfo形式に変換）
    const completeFileInfo: FileInfo = {
      ...fileInfo,
      size: 0, // 不明な場合のデフォルト値
      type: 'application/octet-stream', // 不明な場合のデフォルト値
      extension: fileInfo.name.split('.').pop()?.toLowerCase() || '',
      detectedFormat: 'unknown' as const
    };
    this.recentFiles.unshift(completeFileInfo);
    
    // 最大10件まで保持
    if (this.recentFiles.length > 10) {
      this.recentFiles = this.recentFiles.slice(0, 10);
    }
    
    // localStorageに保存
    localStorage.setItem('mindmap-recent-files', JSON.stringify(this.recentFiles));
  }

  getRecentFiles(): FileInfo[] {
    const stored = localStorage.getItem('mindmap-recent-files');
    if (stored) {
      try {
        this.recentFiles = JSON.parse(stored);
      } catch {
        this.recentFiles = [];
      }
    }
    return this.recentFiles;
  }

  clearRecentFiles(): void {
    this.recentFiles = [];
    localStorage.removeItem('mindmap-recent-files');
  }

  /**
   * 新規ファイルテンプレートを生成
   */
  createNewFileTemplate(templateType: 'basic' | 'advanced' | 'project' = 'basic'): string {
    const templates = {
      basic: {
        version: '1.0',
        title: '新しいマインドマップ',
        root: {
          id: 'root',
          title: 'ルートノード',
          description: 'このマインドマップのメインテーマです',
          children: [
            {
              id: 'branch1',
              title: 'ブランチ1',
              description: '最初のアイデアまたはトピック',
              children: []
            },
            {
              id: 'branch2',
              title: 'ブランチ2',
              description: '2つ目のアイデアまたはトピック',
              children: []
            }
          ]
        }
      },
      advanced: {
        version: '1.0',
        title: '高度なマインドマップテンプレート',
        description: 'カスタムフィールドとメタデータを含むテンプレート',
        schema: {
          version: '1.0',
          fields: [
            {
              id: 'priority',
              name: '優先度',
              type: 'select',
              options: ['高', '中', '低'],
              required: false
            },
            {
              id: 'status',
              name: 'ステータス',
              type: 'select',
              options: ['未着手', '進行中', '完了'],
              required: false
            }
          ],
          displayRules: [
            {
              field: 'priority',
              displayType: 'badge',
              style: {
                '高': { backgroundColor: '#fecaca', color: '#dc2626' },
                '中': { backgroundColor: '#fed7aa', color: '#ea580c' },
                '低': { backgroundColor: '#d1fae5', color: '#16a34a' }
              }
            },
            {
              field: 'status',
              displayType: 'color',
              style: {
                '未着手': { backgroundColor: '#f3f4f6', color: '#374151' },
                '進行中': { backgroundColor: '#dbeafe', color: '#1d4ed8' },
                '完了': { backgroundColor: '#d1fae5', color: '#16a34a' }
              }
            }
          ]
        },
        root: {
          id: 'root',
          title: 'プロジェクトルート',
          description: 'プロジェクトの全体像',
          customFields: {
            priority: '高',
            status: '進行中'
          },
          children: [
            {
              id: 'planning',
              title: '計画フェーズ',
              description: 'プロジェクトの計画と準備',
              customFields: {
                priority: '高',
                status: '完了'
              },
              children: [
                {
                  id: 'requirements',
                  title: '要件定義',
                  customFields: {
                    priority: '高',
                    status: '完了'
                  },
                  children: []
                },
                {
                  id: 'design',
                  title: '設計',
                  customFields: {
                    priority: '高',
                    status: '完了'
                  },
                  children: []
                }
              ]
            },
            {
              id: 'development',
              title: '開発フェーズ',
              description: '実装とテスト',
              customFields: {
                priority: '高',
                status: '進行中'
              },
              children: [
                {
                  id: 'backend',
                  title: 'バックエンド開発',
                  customFields: {
                    priority: '高',
                    status: '進行中'
                  },
                  children: []
                },
                {
                  id: 'frontend',
                  title: 'フロントエンド開発',
                  customFields: {
                    priority: '中',
                    status: '未着手'
                  },
                  children: []
                }
              ]
            }
          ]
        }
      },
      project: {
        version: '1.0',
        title: 'プロジェクト管理テンプレート',
        description: 'プロジェクト管理用の包括的なテンプレート',
        metadata: {
          author: 'システム',
          created: new Date().toISOString(),
          category: 'プロジェクト管理'
        },
        root: {
          id: 'project-root',
          title: 'プロジェクト名',
          description: 'プロジェクトの目的と概要を記述してください',
          metadata: {
            owner: '',
            deadline: '',
            budget: ''
          },
          children: [
            {
              id: 'objectives',
              title: '目標・成果物',
              description: 'プロジェクトの目標と期待される成果物',
              children: [
                {
                  id: 'goal1',
                  title: '主要目標1',
                  children: []
                },
                {
                  id: 'goal2',
                  title: '主要目標2',
                  children: []
                }
              ]
            },
            {
              id: 'stakeholders',
              title: 'ステークホルダー',
              description: 'プロジェクトに関わる人々',
              children: [
                {
                  id: 'sponsor',
                  title: 'スポンサー',
                  children: []
                },
                {
                  id: 'team',
                  title: 'チームメンバー',
                  children: []
                },
                {
                  id: 'users',
                  title: 'エンドユーザー',
                  children: []
                }
              ]
            },
            {
              id: 'phases',
              title: 'プロジェクトフェーズ',
              description: 'プロジェクトの段階的な実行計画',
              children: [
                {
                  id: 'initiation',
                  title: '開始フェーズ',
                  children: []
                },
                {
                  id: 'planning',
                  title: '計画フェーズ',
                  children: []
                },
                {
                  id: 'execution',
                  title: '実行フェーズ',
                  children: []
                },
                {
                  id: 'closure',
                  title: '終了フェーズ',
                  children: []
                }
              ]
            },
            {
              id: 'risks',
              title: 'リスク管理',
              description: '想定されるリスクと対策',
              children: [
                {
                  id: 'technical-risks',
                  title: '技術的リスク',
                  children: []
                },
                {
                  id: 'business-risks',
                  title: 'ビジネスリスク',
                  children: []
                }
              ]
            }
          ]
        }
      }
    };

    return JSON.stringify(templates[templateType], null, 2);
  }

  /**
   * YAML形式の新規ファイルテンプレートを生成
   */
  createNewYamlTemplate(templateType: 'basic' | 'advanced' = 'basic'): string {
    if (templateType === 'basic') {
      return `version: "1.0"
title: "新しいマインドマップ"
root:
  id: "root"
  title: "ルートノード"
  description: "このマインドマップのメインテーマです"
  children:
    - id: "branch1"
      title: "ブランチ1"
      description: "最初のアイデアまたはトピック"
      children: []
    - id: "branch2"
      title: "ブランチ2" 
      description: "2つ目のアイデアまたはトピック"
      children: []`;
    } else {
      return `version: "1.0"
title: "高度なマインドマップテンプレート"
description: "カスタムフィールドとメタデータを含むテンプレート"
schema:
  version: "1.0"
  fields:
    - id: "priority"
      name: "優先度"
      type: "select"
      options: ["高", "中", "低"]
      required: false
    - id: "status"
      name: "ステータス"
      type: "select"
      options: ["未着手", "進行中", "完了"]
      required: false
  displayRules:
    - field: "priority"
      displayType: "badge"
      style:
        高:
          backgroundColor: "#fecaca"
          color: "#dc2626"
        中:
          backgroundColor: "#fed7aa"
          color: "#ea580c"
        低:
          backgroundColor: "#d1fae5"
          color: "#16a34a"
root:
  id: "root"
  title: "プロジェクトルート"
  description: "プロジェクトの全体像"
  customFields:
    priority: "高"
    status: "進行中"
  children:
    - id: "planning"
      title: "計画フェーズ"
      description: "プロジェクトの計画と準備"
      customFields:
        priority: "高"
        status: "完了"
      children: []`;
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

  stopWatching(): void {
    // VSCode API を使用した実装
    // 現在はプレースホルダー
    throw new Error('VSCode file service not implemented yet');
  }

  // テスト用のメソッドも追加
  notifyFileChange(_pathOrFile: string | File, _content?: string): void {
    throw new Error('VSCode file service not implemented yet');
  }

  async exists(_path: string): Promise<boolean> {
    // VSCode API を使用した実装
    // 現在はプレースホルダー
    throw new Error('VSCode file service not implemented yet');
  }

  async deleteFile(_path: string): Promise<void> {
    // VSCode API を使用した実装
    // 現在はプレースホルダー
    throw new Error('VSCode file service not implemented yet');
  }

  async createDirectory(_path: string): Promise<void> {
    // VSCode API を使用した実装
    // 現在はプレースホルダー
    throw new Error('VSCode file service not implemented yet');
  }

  async listFiles(_path: string): Promise<string[]> {
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

// デフォルトのファイルサービスインスタンス
export const fileService = createFileService();