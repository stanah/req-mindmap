import type { EditorAdapter, EditorError } from '../interfaces';
import type * as monaco from 'monaco-editor';

/**
 * ブラウザ環境でのMonaco Editor操作実装
 */
export class BrowserEditorAdapter implements EditorAdapter {
  private editor: monaco.editor.IStandaloneCodeEditor | null = null;
  private contentChangeCallback?: (content: string) => void;
  private cursorChangeCallback?: (line: number, column: number) => void;

  constructor(editor?: monaco.editor.IStandaloneCodeEditor) {
    if (editor) {
      this.setEditor(editor);
    }
  }

  /**
   * Monaco Editorインスタンスを設定
   */
  setEditor(editor: monaco.editor.IStandaloneCodeEditor): void {
    this.editor = editor;
    this.setupEventListeners();
  }

  getValue(): string {
    if (!this.editor) {
      throw new Error('エディタが初期化されていません');
    }
    return this.editor.getValue();
  }

  setValue(value: string): void {
    if (!this.editor) {
      throw new Error('エディタが初期化されていません');
    }
    this.editor.setValue(value);
  }

  async setLanguage(language: 'json' | 'yaml'): Promise<void> {
    if (!this.editor) {
      throw new Error('エディタが初期化されていません');
    }
    
    const model = this.editor.getModel();
    if (model) {
      try {
        const monacoModule = await import('monaco-editor');
        monacoModule.editor.setModelLanguage(model, language);
      } catch {
        // テスト環境では何もしない
      }
    }
  }

  async setTheme(theme: string): Promise<void> {
    try {
      const monacoModule = await import('monaco-editor');
      monacoModule.editor.setTheme(theme);
    } catch {
      // テスト環境では何もしない
    }
  }

  setCursor(line: number, column: number = 1): void {
    if (!this.editor) {
      throw new Error('エディタが初期化されていません');
    }
    
    this.editor.setPosition({ lineNumber: line, column });
    this.editor.revealLineInCenter(line);
  }

  async highlight(startLine: number, startColumn: number, endLine: number, endColumn: number): Promise<void> {
    if (!this.editor) {
      throw new Error('エディタが初期化されていません');
    }

    try {
      const monacoModule = await import('monaco-editor');
      const range = new monacoModule.Range(startLine, startColumn, endLine, endColumn);
      this.editor.setSelection(range);
      this.editor.revealRangeInCenter(range);
    } catch {
      // テスト環境では何もしない
    }
  }

  async setErrorMarkers(errors: EditorError[]): Promise<void> {
    if (!this.editor) {
      throw new Error('エディタが初期化されていません');
    }

    const model = this.editor.getModel();
    if (!model) {
      return;
    }

    try {
      const monacoModule = await import('monaco-editor');
      const markers: any[] = await Promise.all(errors.map(async error => ({
        startLineNumber: error.line,
        startColumn: error.column,
        endLineNumber: error.endLine || error.line,
        endColumn: error.endColumn || error.column + 1,
        message: error.message,
        severity: await this.mapSeverity(error.severity)
      })));

      monacoModule.editor.setModelMarkers(model, 'mindmap-tool', markers);
    } catch {
      // テスト環境では何もしない
    }
  }

  onDidChangeContent(callback: (content: string) => void): void {
    this.contentChangeCallback = callback;
  }

  onDidChangeCursorPosition(callback: (line: number, column: number) => void): void {
    this.cursorChangeCallback = callback;
  }

  /**
   * イベントリスナーを設定
   */
  private setupEventListeners(): void {
    if (!this.editor) {
      return;
    }

    // 内容変更イベント
    this.editor.onDidChangeModelContent(() => {
      if (this.contentChangeCallback) {
        this.contentChangeCallback(this.getValue());
      }
    });

    // カーソル位置変更イベント
    this.editor.onDidChangeCursorPosition((event) => {
      if (this.cursorChangeCallback) {
        this.cursorChangeCallback(event.position.lineNumber, event.position.column);
      }
    });
  }

  /**
   * エラーの重要度をMonacoの形式にマップ
   */
  private async mapSeverity(severity: 'error' | 'warning' | 'info'): Promise<number> {
    try {
      const monacoModule = await import('monaco-editor');
      switch (severity) {
        case 'error':
          return monacoModule.MarkerSeverity.Error;
        case 'warning':
          return monacoModule.MarkerSeverity.Warning;
        case 'info':
          return monacoModule.MarkerSeverity.Info;
        default:
          return monacoModule.MarkerSeverity.Info;
      }
    } catch {
      // テスト環境のフォールバック
      return severity === 'error' ? 8 : severity === 'warning' ? 4 : 2;
    }
  }

  /**
   * エディタを破棄
   */
  dispose(): void {
    if (this.editor) {
      this.editor.dispose();
      this.editor = null;
    }
  }
}