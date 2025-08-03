import type { SettingsAdapter } from '../interfaces';

/**
 * VSCode拡張環境での設定管理実装
 * 将来実装予定のスケルトン
 */
export class VSCodeSettingsAdapter implements SettingsAdapter {
  get<T>(_key: string, _defaultValue?: T): T {
    // VSCode API を使用して設定値を取得
    // const vscode = acquireVsCodeApi();
    // return vscode.postMessage({
    //   command: 'getConfiguration',
    //   key: key,
    //   defaultValue: defaultValue
    // });
    
    throw new Error('VSCode拡張環境はまだ実装されていません');
  }

  async set<T>(_key: string, _value: T): Promise<void> {
    // VSCode API を使用して設定値を保存
    // const vscode = acquireVsCodeApi();
    // await vscode.postMessage({
    //   command: 'updateConfiguration',
    //   key: key,
    //   value: value
    // });
    
    throw new Error('VSCode拡張環境はまだ実装されていません');
  }

  onDidChange(_callback: (key: string, value: any) => void): void {
    // VSCode API を使用して設定変更イベントを監視
    // const vscode = acquireVsCodeApi();
    // vscode.postMessage({
    //   command: 'onDidChangeConfiguration',
    //   callback: callback
    // });
    
    throw new Error('VSCode拡張環境はまだ実装されていません');
  }

  getAll(): Record<string, any> {
    // VSCode API を使用してすべての設定を取得
    // const vscode = acquireVsCodeApi();
    // return vscode.postMessage({
    //   command: 'getAllConfiguration'
    // });
    
    throw new Error('VSCode拡張環境はまだ実装されていません');
  }

  async reset(_key: string): Promise<void> {
    // VSCode API を使用して設定をリセット
    // const vscode = acquireVsCodeApi();
    // await vscode.postMessage({
    //   command: 'resetConfiguration',
    //   key: key
    // });
    
    throw new Error('VSCode拡張環境はまだ実装されていません');
  }
}