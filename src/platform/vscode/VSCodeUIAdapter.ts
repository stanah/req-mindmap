import type { UIAdapter, ProgressReporter } from '../interfaces';
import { VSCodePlatformAdapter } from './VSCodePlatformAdapter';
import type { VSCodeApi } from './VSCodeApiSingleton';

/**
 * VSCode拡張環境でのUI操作実装
 * VSCode Extension API との実際の統合を提供
 */
export class VSCodeUIAdapter implements UIAdapter {
  private vscode: VSCodeApi | null = null;
  private messageHandlers = new Map<string, (data: unknown) => void>();
  private progressTasks = new Map<string, ProgressReporter>();
  private requestId = 0;
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
        
        // メッセージのnullチェック
        if (!message) {
          console.warn('[VSCodeApp] Invalid message received:', message);
          return;
        }
        
        if (message.requestId && this.messageHandlers.has(message.requestId)) {
          const handler = this.messageHandlers.get(message.requestId);
          if (handler) {
            handler(message);
            this.messageHandlers.delete(message.requestId);
          }
        }

        // プログレス関連のイベント処理
        this.handleProgressEvent(message);
      });

      // VSCode拡張に初期化完了を通知
      this.vscode.postMessage({
        command: 'uiAdapterReady'
      });

      this.initialized = true;
      console.log('VSCodeUIAdapter初期化完了');
    }
  }

  private handleProgressEvent(message: { 
    command: string; 
    progressId?: string; 
    cancelled?: boolean; 
  }): void {
    switch (message.command) {
      case 'progressCancelled':
        if (message.progressId) {
          // プログレスタスクがキャンセルされた場合の処理
          this.progressTasks.delete(message.progressId);
        }
        break;
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
    const progressId = `progress_${++this.requestId}`;
    
    // プログレスレポーターを作成
    const progressReporter: ProgressReporter = {
      report: (value: { message?: string; increment?: number }) => {
        if (this.vscode) {
          this.vscode.postMessage({
            command: 'reportProgress',
            progressId,
            message: value.message,
            increment: value.increment
          });
        }
      }
    };

    // プログレスタスクを管理マップに追加
    this.progressTasks.set(progressId, progressReporter);

    try {
      // VSCode側にプログレス開始を通知
      this.vscode.postMessage({
        command: 'startProgress',
        progressId,
        title
      });

      // タスクを実行
      const result = await task(progressReporter);

      // プログレス終了を通知
      this.vscode.postMessage({
        command: 'endProgress',
        progressId
      });

      return result;
    } catch (error) {
      // エラー時もプログレス終了を通知
      this.vscode.postMessage({
        command: 'endProgress',
        progressId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    } finally {
      // プログレスタスクを管理マップから削除
      this.progressTasks.delete(progressId);
    }
  }

  showStatusBarMessage(message: string, timeout?: number): void {
    if (!this.vscode) {
      console.log(`[StatusBar] ${message}`);
      return;
    }

    this.vscode.postMessage({
      command: 'showStatusBarMessage',
      message,
      timeout
    });
  }

  /**
   * 入力ボックスを表示
   */
  async showInputBox(options: {
    prompt?: string;
    placeholder?: string;
    value?: string;
    password?: boolean;
  }): Promise<string | null> {
    if (!this.vscode) {
      // Webviewでない環境では空文字列を返す
      return '';
    }

    return this.sendMessage<string | null>('showInputBox', { options });
  }

  /**
   * クイックピックを表示
   */
  async showQuickPick(items: string[], options?: {
    placeHolder?: string;
    canPickMany?: boolean;
  }): Promise<string | string[] | null> {
    if (!this.vscode) {
      // Webviewでない環境では最初のアイテムを返す
      return items[0] || null;
    }

    return this.sendMessage('showQuickPick', { items, options });
  }

  /**
   * 通知を表示（一定時間後に自動的に消える）
   */
  showNotification(message: string, type: 'info' | 'warning' | 'error' = 'info', timeout?: number): void {
    if (!this.vscode) {
      console.log(`[${type.toUpperCase()}] ${message}`);
      return;
    }

    this.vscode.postMessage({
      command: 'showNotification',
      message,
      type,
      timeout
    });
  }

  /**
   * カスタムWebviewダイアログを表示
   */
  async showWebviewDialog(options: {
    title: string;
    html: string;
    width?: number;
    height?: number;
  }): Promise<unknown> {
    if (!this.vscode) {
      console.log(`[WebviewDialog] ${options.title}`);
      return null;
    }

    return this.sendMessage('showWebviewDialog', { options });
  }

  /**
   * リソースを解放
   */
  dispose(): void {
    this.messageHandlers.clear();
    this.progressTasks.clear();
    this.initialized = false;
  }
}