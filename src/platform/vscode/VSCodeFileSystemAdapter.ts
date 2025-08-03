import type { FileSystemAdapter, FileDialogOptions } from '../interfaces';

/**
 * VSCode拡張環境でのファイルシステム操作実装
 * 将来実装予定のスケルトン
 */
export class VSCodeFileSystemAdapter implements FileSystemAdapter {
  async readFile(_path: string): Promise<string> {
    // VSCode API を使用してファイルを読み込み
    // const vscode = acquireVsCodeApi();
    // return await vscode.postMessage({
    //   command: 'readFile',
    //   path: path
    // });
    
    throw new Error('VSCode拡張環境はまだ実装されていません');
  }

  async writeFile(_path: string, _content: string): Promise<void> {
    // VSCode API を使用してファイルを保存
    // const vscode = acquireVsCodeApi();
    // await vscode.postMessage({
    //   command: 'writeFile',
    //   path: path,
    //   content: content
    // });
    
    throw new Error('VSCode拡張環境はまだ実装されていません');
  }

  async exists(_path: string): Promise<boolean> {
    // VSCode API を使用してファイルの存在確認
    // const vscode = acquireVsCodeApi();
    // return await vscode.postMessage({
    //   command: 'exists',
    //   path: path
    // });
    
    throw new Error('VSCode拡張環境はまだ実装されていません');
  }

  async showOpenDialog(_options: FileDialogOptions): Promise<string | null> {
    // VSCode API を使用してファイル選択ダイアログを表示
    // const vscode = acquireVsCodeApi();
    // return await vscode.postMessage({
    //   command: 'showOpenDialog',
    //   options: options
    // });
    
    throw new Error('VSCode拡張環境はまだ実装されていません');
  }

  async showSaveDialog(_options: FileDialogOptions): Promise<string | null> {
    // VSCode API を使用してファイル保存ダイアログを表示
    // const vscode = acquireVsCodeApi();
    // return await vscode.postMessage({
    //   command: 'showSaveDialog',
    //   options: options
    // });
    
    throw new Error('VSCode拡張環境はまだ実装されていません');
  }

  watchFile(_path: string, _callback: (content: string) => void): () => void {
    // VSCode API を使用してファイル監視を設定
    // const vscode = acquireVsCodeApi();
    // const disposable = vscode.postMessage({
    //   command: 'watchFile',
    //   path: path,
    //   callback: callback
    // });
    
    // return () => disposable.dispose();
    
    throw new Error('VSCode拡張環境はまだ実装されていません');
  }
}