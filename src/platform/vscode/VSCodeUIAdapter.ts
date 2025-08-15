import type { UIAdapter, ProgressReporter } from '../interfaces';
import { VSCodePlatformAdapter } from './VSCodePlatformAdapter';
import type { VSCodeApi } from './VSCodeApiSingleton';

/**
 * VSCode拡張環境でのUI操作実装
 * 将来実装予定のスケルトン
 */
export class VSCodeUIAdapter implements UIAdapter {
  private vscode: VSCodeApi | null = null;
  private messageHandlers = new Map<string, (data: unknown) => void>();
  private requestId = 0;

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
      });
    }
  }

  private async sendMessage<T>(command: string, payload?: Record<string, unknown>): Promise<T> {
    if (!this.vscode) {
      // Webviewでない環境ではconsoleにログ出力
      console.log(`[UI] ${command}:`, payload);
      return Promise.resolve() as Promise<T>;
    }

    return new Promise((resolve, reject) => {
      const requestId = `${++this.requestId}`;
      
      // レスポンスハンドラーを登録
      this.messageHandlers.set(requestId, (data: { error?: string; result?: T }) => {
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
          resolve(undefined as T);
        }
      }, 5000);
    });
  }

  showInformationMessage(message: string): void {
    if (!this.vscode) {
      console.info(message);
      return;
    }

    this.vscode.postMessage({
      command: 'showInformationMessage',
      message
    });
  }

  showWarningMessage(message: string): void {
    if (!this.vscode) {
      console.warn(message);
      return;
    }

    this.vscode.postMessage({
      command: 'showWarningMessage',
      message
    });
  }

  showErrorMessage(message: string): void {
    if (!this.vscode) {
      console.error(message);
      return;
    }

    this.vscode.postMessage({
      command: 'showErrorMessage',
      message
    });
  }

  async showConfirmDialog(message: string, options: string[]): Promise<string | null> {
    if (!this.vscode) {
      // Webviewでない環境では常に最初のオプションを返す
      return options[0] || null;
    }

    return this.sendMessage<string | null>('showConfirmDialog', { message, options });
  }

  async withProgress<T>(title: string, task: (progress: ProgressReporter) => Promise<T>): Promise<T> {
    if (!this.vscode) {
      // Webviewでない環境では単純にタスクを実行
      const progressReporter: ProgressReporter = {
        report: (value: { message?: string; increment?: number }) => {
          console.log(`[Progress] ${title}: ${value.message || ''} ${value.increment || ''}%`);
        }
      };
      return task(progressReporter);
    }

    // VSCode側でプログレス表示を開始
    const _progressId = `progress_${++this.requestId}`;
    
    throw new Error('VSCode拡張環境はまだ実装されていません');
  }

  showStatusBarMessage(_message: string, _timeout?: number): void {
    // VSCode API を使用してステータスバーメッセージを表示
    // const vscode = acquireVsCodeApi();
    // vscode.postMessage({
    //   command: 'showStatusBarMessage',
    //   message: message,
    //   timeout: timeout
    // });
    
    throw new Error('VSCode拡張環境はまだ実装されていません');
  }
}