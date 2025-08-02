import { EditorAdapter, EditorError } from '../interfaces';

// Monaco Editorの型定義（テスト環境対応）
declare global {
  const monaco: typeof import('monaco-editor');
}

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

  setLanguage(language: 'json' | 'yaml'): void {
    if (!this.editor) {
      throw new Error('エディタが初期化されていません');
    }
    
    const model = this.editor.getModel();
    if (model) {
      monaco.editor.setModelLanguage(model, language);
    }
  }

  setTheme(theme: string): void {
    monaco.editor.setTheme(theme);
  }

  setCursor(line: number, column: number = 1): void {
    if (!this.editor) {
      throw new Error('エディタが初期化されていません');
    }
    
    this.editor.setPosition({ lineNumber: line, column });
    this.editor.revealLineInCenter(line);
  }

  highlight(startLine: number, startColumn: number, endLine: number, endColumn: number): void {
    if (!this.editor) {
      throw new Error('エディタが初期化されていません');
    }

    const range = new monaco.Range(startLine, startColumn, endLine, endColumn);
    this.editor.setSelection(range);
    this.editor.revealRangeInCenter(range);
  }

  setErrorMarkers(errors: EditorError[]): void {
    if (!this.editor) {
      throw new Error('エディタが初期化されていません');
    }

    const model = this.editor.getModel();
    if (!model) {
      return;
    }

    const markers: monaco.editor.IMarkerData[] = errors.map(error => ({
      startLineNumber: error.line,
      startColumn: error.column,
      endLineNumber: error.endLine || error.line,
      endColumn: error.endColumn || error.column + 1,
      message: error.message,
      severity: this.mapSeverity(error.severity)
    }));

    monaco.editor.setModelMarkers(model, 'mindmap-tool', markers);
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
  private mapSeverity(severity: 'error' | 'warning' | 'info'): monaco.MarkerSeverity {
    switch (severity) {
      case 'error':
        return monaco.MarkerSeverity.Error;
      case 'warning':
        return monaco.MarkerSeverity.Warning;
      case 'info':
        return monaco.MarkerSeverity.Info;
      default:
        return monaco.MarkerSeverity.Info;
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