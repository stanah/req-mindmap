import type { EditorAdapter, EditorError } from '../interfaces';
import { VSCodePlatformAdapter } from './VSCodePlatformAdapter';
import type { VSCodeApi } from './VSCodeApiSingleton';

/**
 * VSCode拡張環境でのエディタ操作実装
 * VSCode Extension API との実際の統合を提供
 */
export class VSCodeEditorAdapter implements EditorAdapter {
  private vscode: VSCodeApi | null = null;
  private messageHandlers = new Map<string, (data: unknown) => void>();
  private contentChangeCallbacks = new Set<(content: string) => void>();
  private cursorChangeCallbacks = new Set<(line: number, column: number) => void>();
  private requestId = 0;
  private currentContent = '';
  private currentLanguage: 'json' | 'yaml' = 'json';
  private initialized = false;

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    if (this.initialized) return;
    
    const vscode = VSCodePlatformAdapter.getVSCodeApi();
    if (vscode && 'postMessage' in vscode) {
      this.vscode = vscode;
      
      // VSCodeからのメッセージを受信
      window.addEventListener('message', (event) => {
        const message = event.data;
        
        // メッセージが不正な場合は無視
        if (!message || typeof message !== 'object') {
          return;
        }
        
        if (message.requestId && this.messageHandlers.has(message.requestId)) {
          const handler = this.messageHandlers.get(message.requestId);
          if (handler) {
            handler(message);
            this.messageHandlers.delete(message.requestId);
          }
        }
        
        // エディタイベントの処理
        this.handleEditorEvent(message);
      });

      // VSCode拡張に初期化完了を通知
      this.vscode.postMessage({
        command: 'editorAdapterReady'
      });

      this.initialized = true;
      console.log('VSCodeEditorAdapter初期化完了');
    }
  }

  private handleEditorEvent(message: { 
    command: string; 
    content?: string; 
    language?: string;
    line?: number; 
    column?: number;
    fileName?: string;
    uri?: string;
  }): void {
    switch (message.command) {
      case 'updateContent':
      case 'contentChanged':
        if (message.content !== undefined) {
          this.currentContent = message.content;
          this.contentChangeCallbacks.forEach(callback => callback(message.content || ''));
        }
        if (message.language) {
          this.currentLanguage = message.language === 'yaml' ? 'yaml' : 'json';
        }
        break;
      case 'cursorPositionChanged':
        this.cursorChangeCallbacks.forEach(callback => callback(message.line || 0, message.column || 0));
        break;
      case 'documentChanged':
        // ドキュメント全体の変更（ファイル切り替えなど）
        if (message.content !== undefined) {
          this.currentContent = message.content;
          this.contentChangeCallbacks.forEach(callback => callback(message.content || ''));
        }
        break;
      case 'activeEditorChanged':
        // アクティブエディタの変更
        console.log('アクティブエディタが変更されました:', message.fileName);
        break;
    }
  }

  private async sendMessage<T>(command: string, payload?: Record<string, unknown>): Promise<T> {
    if (!this.vscode) {
      throw new Error('VSCode API が利用できません');
    }

    return new Promise((resolve, reject) => {
      const requestId = `${++this.requestId}`;
      
      // レスポンスハンドラーを登録
      this.messageHandlers.set(requestId, (data: unknown) => {
        const response = data as { error?: string; result?: T };
        if (response.error) {
          reject(new Error(response.error));
        } else {
          resolve(response.result as T);
        }
      });

      // メッセージを送信
      this.vscode!.postMessage({
        command,
        requestId,
        ...payload
      });

      // タイムアウト処理
      setTimeout(() => {
        if (this.messageHandlers.has(requestId)) {
          this.messageHandlers.delete(requestId);
          reject(new Error(`操作がタイムアウトしました: ${command}`));
        }
      }, 5000);
    });
  }

  getValue(): string {
    return this.currentContent;
  }

  setValue(value: string): void {
    // VSCode拡張に内容更新を要求
    if (this.vscode) {
      this.vscode.postMessage({
        command: 'updateDocument',
        content: value
      });
    } else {
      console.warn('VSCode API が利用できません');
    }
  }

  setLanguage(language: 'json' | 'yaml'): void {
    this.currentLanguage = language;
    // VSCode拡張に言語モード変更を要求
    if (this.vscode) {
      this.vscode.postMessage({
        command: 'setLanguageMode',
        language
      });
    }
  }

  setTheme(theme: string): void {
    // VSCode拡張にテーマ変更要求を送信
    if (this.vscode) {
      this.vscode.postMessage({
        command: 'requestThemeChange',
        theme
      });
    }
  }

  setCursor(line: number, column?: number): void {
    // VSCode拡張にカーソル位置設定を要求
    if (this.vscode) {
      this.vscode.postMessage({
        command: 'setCursorPosition',
        line,
        column: column || 0
      });
    }
  }

  /**
   * 現在のファイル内で指定されたノードIDの定義箇所にジャンプする
   */
  async jumpToNodeInCurrentFile(nodeId: string): Promise<void> {
    try {
      await this.sendMessage('jumpToNodeInFile', {
        nodeId
      });
    } catch (error) {
      console.error('ノードジャンプに失敗しました:', error);
      throw error;
    }
  }

  highlight(startLine: number, startColumn: number, endLine: number, endColumn: number): void {
    // VSCode拡張にハイライト要求を送信
    if (this.vscode) {
      this.vscode.postMessage({
        command: 'highlightRange',
        startLine,
        startColumn,
        endLine,
        endColumn
      });
    }
  }

  setErrorMarkers(errors: EditorError[]): void {
    // VSCode拡張にエラーマーカー設定を要求
    if (this.vscode) {
      this.vscode.postMessage({
        command: 'setErrorMarkers',
        errors
      });
    }
  }

  onDidChangeContent(callback: (content: string) => void): void {
    this.contentChangeCallbacks.add(callback);
    
    // VSCode拡張に内容変更通知の購読を要求
    if (this.vscode) {
      this.vscode.postMessage({
        command: 'subscribeToContentChanges'
      });
    }
  }

  onDidChangeCursorPosition(callback: (line: number, column: number) => void): void {
    this.cursorChangeCallbacks.add(callback);
    
    // VSCode拡張にカーソル変更通知の購読を要求
    if (this.vscode) {
      this.vscode.postMessage({
        command: 'subscribeToCursorChanges'
      });
    }
  }

  /**
   * 現在の言語モードを取得
   */
  getLanguage(): 'json' | 'yaml' {
    return this.currentLanguage;
  }

  /**
   * 現在のカーソル位置を取得
   */
  async getCurrentCursorPosition(): Promise<{ line: number; column: number }> {
    return this.sendMessage<{ line: number; column: number }>('getCurrentCursorPosition');
  }

  /**
   * 現在の選択範囲を取得
   */
  async getSelection(): Promise<{
    startLine: number;
    startColumn: number;
    endLine: number;
    endColumn: number;
    text: string;
  } | null> {
    return this.sendMessage('getSelection');
  }

  /**
   * テキストを選択範囲で置換
   */
  async replaceSelection(text: string): Promise<void> {
    return this.sendMessage('replaceSelection', { text });
  }

  /**
   * 指定位置にテキストを挿入
   */
  async insertTextAt(line: number, column: number, text: string): Promise<void> {
    return this.sendMessage('insertTextAt', { line, column, text });
  }

  /**
   * ファイル保存を要求
   */
  async saveFile(): Promise<void> {
    return this.sendMessage('saveFile');
  }

  /**
   * リソースを解放
   */
  dispose(): void {
    this.messageHandlers.clear();
    this.contentChangeCallbacks.clear();
    this.cursorChangeCallbacks.clear();
    this.initialized = false;
  }
}