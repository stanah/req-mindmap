/**
 * プラットフォーム抽象化インターフェース
 * ブラウザ環境とVSCode拡張環境の両方に対応するための抽象化レイヤー
 */

// ファイルシステム操作の抽象化
export interface FileSystemAdapter {
  /**
   * ファイルを読み込む
   * @param path ファイルパス
   * @returns ファイル内容
   */
  readFile(path: string): Promise<string>;

  /**
   * ファイルを保存する
   * @param path ファイルパス
   * @param content ファイル内容
   */
  writeFile(path: string, content: string): Promise<void>;

  /**
   * ファイルの存在確認
   * @param path ファイルパス
   * @returns ファイルが存在するかどうか
   */
  exists(path: string): Promise<boolean>;

  /**
   * ファイル選択ダイアログを表示
   * @param options ファイル選択オプション
   * @returns 選択されたファイルパス
   */
  showOpenDialog(options: FileDialogOptions): Promise<string | null>;

  /**
   * ファイル保存ダイアログを表示
   * @param options ファイル保存オプション
   * @returns 保存先ファイルパス
   */
  showSaveDialog(options: FileDialogOptions): Promise<string | null>;

  /**
   * ファイル変更の監視
   * @param path ファイルパス
   * @param callback 変更時のコールバック
   * @returns 監視を停止する関数
   */
  watchFile(path: string, callback: (content: string) => void): () => void;
}

// エディタ操作の抽象化
export interface EditorAdapter {
  /**
   * エディタの内容を取得
   * @returns エディタの内容
   */
  getValue(): string;

  /**
   * エディタの内容を設定
   * @param value 設定する内容
   */
  setValue(value: string): void;

  /**
   * エディタの言語モードを設定
   * @param language 言語モード
   */
  setLanguage(language: 'json' | 'yaml'): void;

  /**
   * エディタのテーマを設定
   * @param theme テーマ名
   */
  setTheme(theme: string): void;

  /**
   * 指定行にカーソルを移動
   * @param line 行番号
   * @param column 列番号
   */
  setCursor(line: number, column?: number): void;

  /**
   * 指定範囲をハイライト
   * @param startLine 開始行
   * @param startColumn 開始列
   * @param endLine 終了行
   * @param endColumn 終了列
   */
  highlight(startLine: number, startColumn: number, endLine: number, endColumn: number): void;

  /**
   * エラーマーカーを設定
   * @param errors エラー情報
   */
  setErrorMarkers(errors: EditorError[]): void;

  /**
   * 内容変更時のコールバックを設定
   * @param callback 変更時のコールバック
   */
  onDidChangeContent(callback: (content: string) => void): void;

  /**
   * カーソル位置変更時のコールバックを設定
   * @param callback カーソル位置変更時のコールバック
   */
  onDidChangeCursorPosition(callback: (line: number, column: number) => void): void;
}

// UI操作の抽象化
export interface UIAdapter {
  /**
   * 情報メッセージを表示
   * @param message メッセージ
   */
  showInformationMessage(message: string): void;

  /**
   * 警告メッセージを表示
   * @param message メッセージ
   */
  showWarningMessage(message: string): void;

  /**
   * エラーメッセージを表示
   * @param message メッセージ
   */
  showErrorMessage(message: string): void;

  /**
   * 確認ダイアログを表示
   * @param message メッセージ
   * @param options 選択肢
   * @returns 選択された選択肢
   */
  showConfirmDialog(message: string, options: string[]): Promise<string | null>;

  /**
   * プログレスバーを表示
   * @param title タイトル
   * @param task 実行するタスク
   */
  withProgress<T>(title: string, task: (progress: ProgressReporter) => Promise<T>): Promise<T>;

  /**
   * ステータスバーにメッセージを表示
   * @param message メッセージ
   * @param timeout タイムアウト（ミリ秒）
   */
  showStatusBarMessage(message: string, timeout?: number): void;
}

// 設定管理の抽象化
export interface SettingsAdapter {
  /**
   * 設定値を取得
   * @param key 設定キー
   * @param defaultValue デフォルト値
   * @returns 設定値
   */
  get<T>(key: string, defaultValue?: T): T;

  /**
   * 設定値を保存
   * @param key 設定キー
   * @param value 設定値
   */
  set<T>(key: string, value: T): Promise<void>;

  /**
   * 設定変更時のコールバックを設定
   * @param callback 変更時のコールバック
   */
  onDidChange(callback: (key: string, value: unknown) => void): void;

  /**
   * すべての設定を取得
   * @returns すべての設定
   */
  getAll(): Record<string, unknown>;

  /**
   * 設定をリセット
   * @param key 設定キー
   */
  reset(key: string): Promise<void>;
}

// メインのプラットフォームアダプター
export interface PlatformAdapter {
  fileSystem: FileSystemAdapter;
  editor: EditorAdapter;
  ui: UIAdapter;
  settings: SettingsAdapter;
  
  /**
   * プラットフォームの種類を取得
   */
  getPlatformType(): 'browser' | 'vscode';

  /**
   * プラットフォーム固有の初期化処理
   */
  initialize(): Promise<void>;

  /**
   * プラットフォーム固有のクリーンアップ処理
   */
  dispose(): void;
}

// 共通の型定義
export interface FileDialogOptions {
  title?: string;
  defaultPath?: string;
  filters?: Array<{
    name: string;
    extensions: string[];
  }>;
  allowMultiple?: boolean;
}

export interface EditorError {
  line: number;
  column: number;
  endLine?: number;
  endColumn?: number;
  message: string;
  severity: 'error' | 'warning' | 'info';
}

export interface ProgressReporter {
  report(value: { message?: string; increment?: number }): void;
}