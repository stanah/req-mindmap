import { EditorAdapter, EditorError } from '../interfaces';

/**
 * VSCode拡張環境でのエディタ操作実装
 * 将来実装予定のスケルトン
 */
export class VSCodeEditorAdapter implements EditorAdapter {
  getValue(): string {
    // VSCode API を使用してエディタの内容を取得
    // const vscode = acquireVsCodeApi();
    // return vscode.postMessage({
    //   command: 'getValue'
    // });
    
    throw new Error('VSCode拡張環境はまだ実装されていません');
  }

  setValue(value: string): void {
    // VSCode API を使用してエディタの内容を設定
    // const vscode = acquireVsCodeApi();
    // vscode.postMessage({
    //   command: 'setValue',
    //   value: value
    // });
    
    throw new Error('VSCode拡張環境はまだ実装されていません');
  }

  setLanguage(language: 'json' | 'yaml'): void {
    // VSCode API を使用して言語モードを設定
    // const vscode = acquireVsCodeApi();
    // vscode.postMessage({
    //   command: 'setLanguage',
    //   language: language
    // });
    
    throw new Error('VSCode拡張環境はまだ実装されていません');
  }

  setTheme(theme: string): void {
    // VSCode API を使用してテーマを設定
    // const vscode = acquireVsCodeApi();
    // vscode.postMessage({
    //   command: 'setTheme',
    //   theme: theme
    // });
    
    throw new Error('VSCode拡張環境はまだ実装されていません');
  }

  setCursor(line: number, column?: number): void {
    // VSCode API を使用してカーソル位置を設定
    // const vscode = acquireVsCodeApi();
    // vscode.postMessage({
    //   command: 'setCursor',
    //   line: line,
    //   column: column
    // });
    
    throw new Error('VSCode拡張環境はまだ実装されていません');
  }

  highlight(startLine: number, startColumn: number, endLine: number, endColumn: number): void {
    // VSCode API を使用して範囲をハイライト
    // const vscode = acquireVsCodeApi();
    // vscode.postMessage({
    //   command: 'highlight',
    //   startLine: startLine,
    //   startColumn: startColumn,
    //   endLine: endLine,
    //   endColumn: endColumn
    // });
    
    throw new Error('VSCode拡張環境はまだ実装されていません');
  }

  setErrorMarkers(errors: EditorError[]): void {
    // VSCode API を使用してエラーマーカーを設定
    // const vscode = acquireVsCodeApi();
    // vscode.postMessage({
    //   command: 'setErrorMarkers',
    //   errors: errors
    // });
    
    throw new Error('VSCode拡張環境はまだ実装されていません');
  }

  onDidChangeContent(callback: (content: string) => void): void {
    // VSCode API を使用して内容変更イベントを監視
    // const vscode = acquireVsCodeApi();
    // vscode.postMessage({
    //   command: 'onDidChangeContent',
    //   callback: callback
    // });
    
    throw new Error('VSCode拡張環境はまだ実装されていません');
  }

  onDidChangeCursorPosition(callback: (line: number, column: number) => void): void {
    // VSCode API を使用してカーソル位置変更イベントを監視
    // const vscode = acquireVsCodeApi();
    // vscode.postMessage({
    //   command: 'onDidChangeCursorPosition',
    //   callback: callback
    // });
    
    throw new Error('VSCode拡張環境はまだ実装されていません');
  }
}