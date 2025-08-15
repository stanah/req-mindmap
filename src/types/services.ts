/**
 * サービス層の型定義
 * 
 * このファイルは、アプリケーションのサービス層で使用される
 * インターフェースと型を定義します。
 */

import type { MindmapData, ParseError, ValidationResult, FileError } from './index';

/**
 * ファイルサービスインターフェース
 * ファイルの読み書きを抽象化
 */
export interface FileService {
  /**
   * ファイルを読み込む
   * @param path ファイルパス
   * @returns ファイル内容
   */
  loadFile(path: string): Promise<string>;

  /**
   * ファイルに保存する
   * @param pathOrData ファイルパスまたはデータ
   * @param contentOrFormat ファイル内容またはフォーマット
   */
  saveFile(pathOrData: string | any, contentOrFormat?: string | 'json' | 'yaml'): Promise<void | { success: boolean; error?: string }>;

  /**
   * ファイルの変更を監視する
   * @param pathOrFile ファイルパスまたはFileオブジェクト
   * @param callback 変更時のコールバック
   */
  watchFile(pathOrFile: string | File, callback: (content: string | File) => void): void;

  /**
   * ファイルが存在するかチェック
   * @param path ファイルパス
   * @returns 存在する場合true
   */
  exists(path: string): Promise<boolean>;

  /**
   * ファイルを削除する
   * @param path ファイルパス
   */
  deleteFile(path: string): Promise<void>;

  /**
   * ディレクトリを作成する
   * @param path ディレクトリパス
   */
  createDirectory(path: string): Promise<void>;

  /**
   * ディレクトリ内のファイル一覧を取得
   * @param path ディレクトリパス
   * @returns ファイル名の配列
   */
  listFiles(path: string): Promise<string[]>;
}

/**
 * パーサーサービスインターフェース
 * ファイル内容の解析とバリデーション
 */
export interface ParserService {
  /**
   * JSON文字列を解析してマインドマップデータに変換
   * @param content JSON文字列
   * @returns マインドマップデータ
   */
  parseJSON(content: string): Promise<MindmapData>;

  /**
   * YAML文字列を解析してマインドマップデータに変換
   * @param content YAML文字列
   * @returns マインドマップデータ
   */
  parseYAML(content: string): Promise<MindmapData>;

  /**
   * データの基本的なバリデーション
   * @param data 検証対象のデータ
   * @returns バリデーション結果
   */
  validateData(data: unknown): ValidationResult;

  /**
   * JSON Schemaに基づくバリデーション
   * @param data 検証対象のデータ
   * @returns バリデーション結果
   */
  validateSchema(data: unknown): ValidationResult;

  /**
   * カスタムスキーマに基づくバリデーション
   * @param data マインドマップデータ
   * @returns バリデーション結果
   */
  validateCustomSchema(data: MindmapData): ValidationResult;

  /**
   * パースエラーを取得
   * @param content ファイル内容
   * @returns パースエラーの配列
   */
  getParseErrors(content: string): ParseError[];

  /**
   * 既存データからスキーマを自動生成
   * @param data マインドマップデータ
   * @returns 生成されたカスタムスキーマ
   */
  generateSchema(data: MindmapData): Promise<import('./index').CustomSchema>;

  /**
   * ファイル形式を自動判定
   * @param content ファイル内容
   * @returns ファイル形式
   */
  detectFormat(content: string): 'json' | 'yaml' | 'unknown';

  /**
   * データを指定形式にシリアライズ
   * @param data マインドマップデータ
   * @param format 出力形式
   * @returns シリアライズされた文字列
   */
  serialize(data: MindmapData, format: 'json' | 'yaml'): Promise<string>;
}

/**
 * レンダラーサービスインターフェース
 * マインドマップの描画を担当
 */
export interface RendererService {
  /**
   * マインドマップを描画
   * @param data マインドマップデータ
   * @param container 描画先のコンテナ要素
   */
  render(data: MindmapData, container: HTMLElement): void;

  /**
   * 描画を更新
   * @param data 新しいマインドマップデータ
   */
  update(data: MindmapData): void;

  /**
   * 描画をクリア
   */
  clear(): void;

  /**
   * ノードを選択
   * @param nodeId ノードID
   */
  selectNode(nodeId: string): void;

  /**
   * ノードの折りたたみ状態を切り替え
   * @param nodeId ノードID
   */
  toggleNodeCollapse(nodeId: string): void;

  /**
   * ズームレベルを設定
   * @param level ズームレベル
   */
  setZoom(level: number): void;

  /**
   * 中心位置を設定
   * @param x X座標
   * @param y Y座標
   */
  setCenter(x: number, y: number): void;

  /**
   * レイアウトを再計算
   */
  recalculateLayout(): void;

  /**
   * SVGをエクスポート
   * @returns SVG文字列
   */
  exportSVG(): string;

  /**
   * PNGをエクスポート
   * @returns PNG画像のBlob
   */
  exportPNG(): Promise<Blob>;
}

/**
 * エラーハンドラーインターフェース
 * エラーの処理と表示を担当
 */
export interface ErrorHandler {
  /**
   * パースエラーを処理
   * @param error パースエラー
   */
  handleParseError(error: ParseError): void;

  /**
   * ファイルエラーを処理
   * @param error ファイルエラー
   */
  handleFileError(error: FileError): void;

  /**
   * ユーザーフレンドリーなメッセージを表示
   * @param error エラーオブジェクト
   */
  showUserFriendlyMessage(error: Error): void;

  /**
   * エラーから回復を試行
   */
  recoverFromError(): void;

  /**
   * エラーログを記録
   * @param error エラーオブジェクト
   * @param context エラーのコンテキスト
   */
  logError(error: Error, context?: string): void;

  /**
   * エラー統計を取得
   * @returns エラー統計情報
   */
  getErrorStats(): {
    totalErrors: number;
    errorsByType: Record<string, number>;
    recentErrors: Error[];
  };
}

/**
 * 設定サービスインターフェース
 * アプリケーション設定の管理
 */
export interface SettingsService {
  /**
   * 設定値を取得
   * @param key 設定キー
   * @returns 設定値
   */
  get<T>(key: string): T | undefined;

  /**
   * 設定値を保存
   * @param key 設定キー
   * @param value 設定値
   */
  set<T>(key: string, value: T): void;

  /**
   * 設定変更を監視
   * @param callback 変更時のコールバック
   */
  onDidChange(callback: (key: string, value: unknown) => void): void;

  /**
   * 設定をリセット
   */
  reset(): void;

  /**
   * 設定をエクスポート
   * @returns 設定データ
   */
  export(): Record<string, unknown>;

  /**
   * 設定をインポート
   * @param settings 設定データ
   */
  import(settings: Record<string, unknown>): void;
}

/**
 * 同期サービスインターフェース
 * エディタとマインドマップの同期を担当
 */
export interface SyncService {
  /**
   * エディタの変更を処理
   * @param content エディタの内容
   */
  onEditorChange(content: string): void;

  /**
   * マインドマップの変更を処理
   * @param nodeId 変更されたノードID
   * @param data 変更データ
   */
  onMindmapChange(nodeId: string, data: unknown): void;

  /**
   * 同期を開始
   */
  startSync(): void;

  /**
   * 同期を停止
   */
  stopSync(): void;

  /**
   * 同期状態を取得
   * @returns 同期中の場合true
   */
  isSyncing(): boolean;

  /**
   * 強制同期を実行
   */
  forceSync(): void;
}

/**
 * プラットフォームアダプターインターフェース
 * 異なるプラットフォーム（ブラウザ、VSCode）への対応
 */
export interface PlatformAdapter {
  /** ファイルシステムアダプター */
  fileSystem: FileSystemAdapter;
  /** エディタアダプター */
  editor: EditorAdapter;
  /** UIアダプター */
  ui: UIAdapter;
  /** 設定アダプター */
  settings: SettingsAdapter;
}

/**
 * ファイルシステムアダプターインターフェース
 */
export interface FileSystemAdapter {
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;
  exists(path: string): Promise<boolean>;
  deleteFile(path: string): Promise<void>;
  createDirectory(path: string): Promise<void>;
  listFiles(path: string): Promise<string[]>;
  watchFile(path: string, callback: (content: string) => void): void;
}

/**
 * エディタアダプターインターフェース
 */
export interface EditorAdapter {
  getValue(): string;
  setValue(value: string): void;
  onDidChangeContent(callback: (content: string) => void): void;
  setMarkers(markers: Array<{
    startLineNumber: number;
    startColumn: number;
    endLineNumber: number;
    endColumn: number;
    message: string;
    severity: 'error' | 'warning' | 'info';
  }>): void;
  revealLine(lineNumber: number): void;
  setSelection(startLine: number, startColumn: number, endLine: number, endColumn: number): void;
}

/**
 * UIアダプターインターフェース
 */
export interface UIAdapter {
  showMessage(message: string, type: 'info' | 'warning' | 'error'): void;
  showProgress(title: string, task: () => Promise<void>): Promise<void>;
  showInputBox(prompt: string, defaultValue?: string): Promise<string | undefined>;
  showQuickPick(items: string[], placeholder?: string): Promise<string | undefined>;
}

/**
 * 設定アダプターインターフェース
 */
export interface SettingsAdapter {
  get<T>(key: string): T | undefined;
  set<T>(key: string, value: T): void;
  onDidChange(callback: (key: string, value: unknown) => void): void;
}

/**
 * イベントエミッターインターフェース
 */
export interface EventEmitter<T = unknown> {
  on(event: string, listener: (data: T) => void): void;
  off(event: string, listener: (data: T) => void): void;
  emit(event: string, data: T): void;
  once(event: string, listener: (data: T) => void): void;
}

/**
 * ログサービスインターフェース
 */
export interface LogService {
  debug(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
  setLevel(level: 'debug' | 'info' | 'warn' | 'error'): void;
  getLevel(): 'debug' | 'info' | 'warn' | 'error';
}