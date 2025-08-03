import type { UIAdapter, ProgressReporter } from '../interfaces';

/**
 * VSCode拡張環境でのUI操作実装
 * 将来実装予定のスケルトン
 */
export class VSCodeUIAdapter implements UIAdapter {
  showInformationMessage(_message: string): void {
    // VSCode API を使用して情報メッセージを表示
    // const vscode = acquireVsCodeApi();
    // vscode.postMessage({
    //   command: 'showInformationMessage',
    //   message: message
    // });
    
    throw new Error('VSCode拡張環境はまだ実装されていません');
  }

  showWarningMessage(_message: string): void {
    // VSCode API を使用して警告メッセージを表示
    // const vscode = acquireVsCodeApi();
    // vscode.postMessage({
    //   command: 'showWarningMessage',
    //   message: message
    // });
    
    throw new Error('VSCode拡張環境はまだ実装されていません');
  }

  showErrorMessage(_message: string): void {
    // VSCode API を使用してエラーメッセージを表示
    // const vscode = acquireVsCodeApi();
    // vscode.postMessage({
    //   command: 'showErrorMessage',
    //   message: message
    // });
    
    throw new Error('VSCode拡張環境はまだ実装されていません');
  }

  async showConfirmDialog(_message: string, _options: string[]): Promise<string | null> {
    // VSCode API を使用して確認ダイアログを表示
    // const vscode = acquireVsCodeApi();
    // return await vscode.postMessage({
    //   command: 'showConfirmDialog',
    //   message: message,
    //   options: options
    // });
    
    throw new Error('VSCode拡張環境はまだ実装されていません');
  }

  async withProgress<T>(_title: string, _task: (progress: ProgressReporter) => Promise<T>): Promise<T> {
    // VSCode API を使用してプログレスバーを表示
    // const vscode = acquireVsCodeApi();
    // return await vscode.postMessage({
    //   command: 'withProgress',
    //   title: title,
    //   task: task
    // });
    
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