import type { FileService } from '../types';

/**
 * ファイル情報インターフェース
 */
export interface FileInfo {
  /** ファイル名 */
  name: string;
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
  private watchers: Map<string, (content: string) => void> = new Map();
  private dragAndDropEnabled = false;
  private recentFiles: any[] = [];
  private fileChangeCallbacks: Map<string, (file: File) => void> = new Map();

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
  async openFile(): Promise<{
    success: boolean;
    data?: any;
    fileName?: string;
    format?: 'json' | 'yaml';
    error?: string;
  }> {
    try {
      // File System Access APIの確認
      if (!window.showOpenFilePicker) {
        return {
          success: false,
          error: 'ファイルシステムアクセスがサポートされていません'
        };
      }

      const [fileHandle] = await (window as any).showOpenFilePicker({
        types: [
          {
            description: 'JSON/YAML Files',
            accept: {
              'application/json': ['.json'],
              'text/yaml': ['.yaml', '.yml']
            }
          }
        ],
        multiple: false
      });

      const file = await fileHandle.getFile();
      const content = await file.text();
      const format = this.detectFormat(file.name);

      if (format === 'unknown') {
        return {
          success: false,
          error: 'サポートされていないファイル形式です'
        };
      }

      let data;
      try {
        if (format === 'json') {
          data = JSON.parse(content);
        } else if (format === 'yaml') {
          // YAMLパースはyaml-jsライブラリを使用（テストではモック）
          try {
            const yaml = await import('yaml');
            data = yaml.parse(content);
          } catch (error) {
            // テスト環境等でyamlライブラリが利用できない場合のフォールバック
            throw new Error('YAMLパースライブラリが利用できません');
          }
        }
      } catch (error) {
        const errorType = format === 'json' ? 'JSON' : 'YAML';
        return {
          success: false,
          error: `${errorType}構文エラー: ${error.message}`
        };
      }

      return {
        success: true,
        data,
        fileName: file.name,
        format
      };
    } catch (error) {
      if (error.name === 'AbortError') {
        return {
          success: false,
          error: 'ファイル選択がキャンセルされました'
        };
      }
      if (error.name === 'SecurityError') {
        return {
          success: false,
          error: 'セキュリティエラー: ファイルアクセスが拒否されました'
        };
      }
      if (error.name === 'TypeError' && error.message.includes('Network')) {
        return {
          success: false,
          error: 'ネットワークエラー: ファイルの読み込みに失敗しました'
        };
      }
      return {
        success: false,
        error: `ファイルの読み込みに失敗しました: ${error.message}`
      };
    }
  }

  /**
   * ファイルの読み込み（ダイアログ経由）
   */
  async loadFile(): Promise<string> {
    const result = await this.loadFileWithInfo();
    return result.content;
  }

  /**
   * ファイルの読み込み（詳細情報付き）
   */
  async loadFileWithInfo(): Promise<FileLoadResult> {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json,.yaml,.yml,.txt';
      input.multiple = false;
      
      input.onchange = (event) => {
        const file = (event.target as HTMLInputElement).files?.[0];
        if (!file) {
          resolve({
            content: '',
            fileInfo: {} as FileInfo,
            success: false,
            error: 'ファイルが選択されませんでした',
          });
          return;
        }

        // ファイルサイズチェック（10MB制限）
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (file.size > maxSize) {
          resolve({
            content: '',
            fileInfo: {} as FileInfo,
            success: false,
            error: 'ファイルサイズが大きすぎます（10MB以下のファイルを選択してください）',
          });
          return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
          const content = e.target?.result as string;
          const fileInfo = this.createFileInfo(file, content);
          
          resolve({
            content,
            fileInfo,
            success: true,
          });
        };
        
        reader.onerror = () => {
          resolve({
            content: '',
            fileInfo: {} as FileInfo,
            success: false,
            error: 'ファイルの読み込みに失敗しました',
          });
        };
        
        reader.readAsText(file, 'UTF-8');
      };

      // ダイアログがキャンセルされた場合の処理
      input.oncancel = () => {
        resolve({
          content: '',
          fileInfo: {} as FileInfo,
          success: false,
          error: 'ファイル選択がキャンセルされました',
        });
      };

      input.click();
    });
  }

  /**
   * ドラッグ&ドロップでのファイル読み込みを有効化
   */
  enableDragAndDrop(element: HTMLElement, onFileLoad: (result: FileLoadResult) => void): void {
    if (this.dragAndDropEnabled) return;
    
    const preventDefault = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const handleDrop = async (e: DragEvent) => {
      preventDefault(e);
      
      const files = e.dataTransfer?.files;
      if (!files || files.length === 0) return;
      
      const file = files[0];
      
      // ファイルタイプチェック
      const allowedTypes = ['.json', '.yaml', '.yml', '.txt'];
      const extension = '.' + (file.name.split('.').pop()?.toLowerCase() || '');
      
      if (!allowedTypes.includes(extension)) {
        onFileLoad({
          content: '',
          fileInfo: {} as FileInfo,
          success: false,
          error: 'サポートされていないファイル形式です。JSON、YAML、またはテキストファイルを選択してください。',
        });
        return;
      }

      // ファイルサイズチェック
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        onFileLoad({
          content: '',
          fileInfo: {} as FileInfo,
          success: false,
          error: 'ファイルサイズが大きすぎます（10MB以下のファイルを選択してください）',
        });
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        const fileInfo = this.createFileInfo(file, content);
        
        onFileLoad({
          content,
          fileInfo,
          success: true,
        });
      };
      
      reader.onerror = () => {
        onFileLoad({
          content: '',
          fileInfo: {} as FileInfo,
          success: false,
          error: 'ファイルの読み込みに失敗しました',
        });
      };
      
      reader.readAsText(file, 'UTF-8');
    };

    // イベントリスナーを追加
    element.addEventListener('dragenter', preventDefault);
    element.addEventListener('dragover', preventDefault);
    element.addEventListener('dragleave', preventDefault);
    element.addEventListener('drop', handleDrop);
    
    this.dragAndDropEnabled = true;
  }

  async saveFile(data: any, format: 'json' | 'yaml'): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      // formatチェック
      if (format !== 'json' && format !== 'yaml') {
        return {
          success: false,
          error: 'サポートされていない形式です'
        };
      }

      // File System Access APIの確認
      if (!window.showSaveFilePicker) {
        return {
          success: false,
          error: 'ファイルシステムアクセスがサポートされていません'
        };
      }

      const fileHandle = await (window as any).showSaveFilePicker({
        suggestedName: format === 'json' ? 'mindmap.json' : 'mindmap.yaml',
        types: [
          {
            description: format === 'json' ? 'JSON File' : 'YAML File',
            accept: {
              [format === 'json' ? 'application/json' : 'text/yaml']: 
                format === 'json' ? ['.json'] : ['.yaml', '.yml']
            }
          }
        ]
      });

      const writable = await fileHandle.createWritable();
      
      let content;
      if (format === 'json') {
        content = JSON.stringify(data, null, 2);
      } else {
        // YAMLフォーマットはyaml-jsライブラリを使用
        try {
          const yaml = await import('yaml');
          content = yaml.stringify(data);
        } catch (error) {
          // テスト環境等でyamlライブラリが利用できない場合のフォールバック
          throw new Error('YAMLフォーマットライブラリが利用できません');
        }
      }

      await writable.write(content);
      await writable.close();

      return { success: true };
    } catch (error) {
      if (error.name === 'AbortError') {
        return {
          success: false,
          error: 'ファイル保存がキャンセルされました'
        };
      }
      return {
        success: false,
        error: `ファイルの保存に失敗しました: ${error.message}`
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

  watchFile(file: File, callback: (file: File) => void): void {
    // ファイル監視のコールバックを登録
    this.fileChangeCallbacks.set(file.name, callback);
  }

  // 内部的にファイル変更を通知
  private notifyFileChange(file: File): void {
    const callback = this.fileChangeCallbacks.get(file.name);
    if (callback) {
      callback(file);
    }
  }

  stopWatching(): void {
    this.fileChangeCallbacks.clear();
  }

  async exists(): Promise<boolean> {
    // ブラウザ環境では実装不可能（セキュリティ上の制限）
    return false;
  }

  async deleteFile(): Promise<void> {
    // ブラウザ環境では実装不可能（セキュリティ上の制限）
    throw new Error('ブラウザ環境ではファイル削除はサポートされていません');
  }

  async createDirectory(): Promise<void> {
    // ブラウザ環境では実装不可能（セキュリティ上の制限）
    throw new Error('ブラウザ環境ではディレクトリ作成はサポートされていません');
  }

  async listFiles(): Promise<string[]> {
    // ブラウザ環境では実装不可能（セキュリティ上の制限）
    return [];
  }

  // 最近使用したファイル関連のメソッド
  addToRecentFiles(fileInfo: { name: string; path: string; lastModified: number }): void {
    // 既存のエントリを削除
    this.recentFiles = this.recentFiles.filter(f => f.path !== fileInfo.path);
    
    // 新しいエントリを先頭に追加
    this.recentFiles.unshift(fileInfo);
    
    // 最大10件まで保持
    if (this.recentFiles.length > 10) {
      this.recentFiles = this.recentFiles.slice(0, 10);
    }
    
    // localStorageに保存
    localStorage.setItem('mindmap-recent-files', JSON.stringify(this.recentFiles));
  }

  getRecentFiles(): any[] {
    const stored = localStorage.getItem('mindmap-recent-files');
    if (stored) {
      try {
        this.recentFiles = JSON.parse(stored);
      } catch (error) {
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
  async loadFile(): Promise<string> {
    // VSCode API を使用した実装
    // 現在はプレースホルダー
    throw new Error('VSCode file service not implemented yet');
  }

  async saveFile(): Promise<void> {
    // VSCode API を使用した実装
    // 現在はプレースホルダー
    throw new Error('VSCode file service not implemented yet');
  }

  watchFile(): void {
    // VSCode API を使用した実装
    // 現在はプレースホルダー
    throw new Error('VSCode file service not implemented yet');
  }

  stopWatching(): void {
    // VSCode API を使用した実装
    // 現在はプレースホルダー
    throw new Error('VSCode file service not implemented yet');
  }

  async exists(): Promise<boolean> {
    // VSCode API を使用した実装
    // 現在はプレースホルダー
    throw new Error('VSCode file service not implemented yet');
  }

  async deleteFile(): Promise<void> {
    // VSCode API を使用した実装
    // 現在はプレースホルダー
    throw new Error('VSCode file service not implemented yet');
  }

  async createDirectory(): Promise<void> {
    // VSCode API を使用した実装
    // 現在はプレースホルダー
    throw new Error('VSCode file service not implemented yet');
  }

  async listFiles(): Promise<string[]> {
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