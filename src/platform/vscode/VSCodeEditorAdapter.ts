import type { EditorAdapter, EditorError } from '../interfaces';
import { VSCodePlatformAdapter } from './VSCodePlatformAdapter';
import type { VSCodeApi } from './VSCodeApiSingleton';

/**
 * VSCode拡張環境でのエディタ操作実装
 * 将来実装予定のスケルトン
 */
export class VSCodeEditorAdapter implements EditorAdapter {
  private vscode: VSCodeApi | null = null;
  private messageHandlers = new Map<string, (data: unknown) => void>();
  private contentChangeCallbacks = new Set<(content: string) => void>();
  private cursorChangeCallbacks = new Set<(line: number, column: number) => void>();
  private requestId = 0;
  private currentContent = '';

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    const vscode = VSCodePlatformAdapter.getVSCodeApi();
    if (vscode) {
      this.vscode = vscode;
      
      // VSCodeからのメッセージを受信
      window.addEventListener('message', (event) => {
        const message = event.data;
        
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
    }
  }

  private handleEditorEvent(message: { command: string; content?: string; line?: number; column?: number }): void {
    switch (message.command) {
      case 'contentChanged':
        this.currentContent = message.content;
        this.contentChangeCallbacks.forEach(callback => callback(message.content));
        break;
      case 'cursorPositionChanged':
        this.cursorChangeCallbacks.forEach(callback => callback(message.line, message.column));
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
      this.messageHandlers.set(requestId, (data: { error?: string; result?: unknown }) => {
        if (data.error) {
          reject(new Error(data.error));
        } else {
          resolve(data.result);
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
    // 現在のコンテンツを返す（VSCode拡張からのメッセージで更新される）
    return this.currentContent;
  }

  setValue(_value: string): void {
    // VSCode拡張では読み取り専用のため、設定は無効
    console.warn('VSCode拡張モードでは setValue は無効です');
  }

  setLanguage(_language: 'json' | 'yaml'): void {
    // VSCode拡張では言語モードは自動判定されるため無効
    console.warn('VSCode拡張モードでは setLanguage は無効です');
  }

  setTheme(_theme: string): void {
    // VSCode拡張ではテーマはVSCode本体で管理されるため無効
    console.warn('VSCode拡張モードでは setTheme は無効です');
  }

  setCursor(_line: number, _column?: number): void {
    // VSCode拡張では外部からカーソル制御は無効
    console.warn('VSCode拡張モードでは setCursor は無効です');
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

  highlight(_startLine: number, _startColumn: number, _endLine: number, _endColumn: number): void {
    // VSCode拡張では外部からハイライト制御は無効
    console.warn('VSCode拡張モードでは highlight は無効です');
  }

  setErrorMarkers(_errors: EditorError[]): void {
    // VSCode拡張ではエラーマーカーはVSCode本体で管理されるため無効
    console.warn('VSCode拡張モードでは setErrorMarkers は無効です');
  }

  onDidChangeContent(callback: (content: string) => void): void {
    // イベントリスナーをコールバック集合に追加
    this.contentChangeCallbacks.add(callback);
    
    // VSCode拡張からの内容変更通知を受信する準備ができたことを通知
    if (this.vscode) {
      this.vscode.postMessage({
        command: 'subscribeToContentChanges'
      });
    }
  }

  onDidChangeCursorPosition(callback: (line: number, column: number) => void): void {
    // イベントリスナーをコールバック集合に追加
    this.cursorChangeCallbacks.add(callback);
    
    // VSCode拡張からのカーソル変更通知を受信する準備ができたことを通知
    if (this.vscode) {
      this.vscode.postMessage({
        command: 'subscribeToCursorChanges'
      });
    }
  }
}