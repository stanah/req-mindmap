import type { MindmapData, ParseError, ValidationResult, FileError } from './mindmap';

// ファイル操作サービス
export interface FileService {
  loadFile(path: string): Promise<string>;
  saveFile(path: string, content: string): Promise<void>;
  watchFile(path: string, callback: (content: string) => void): void;
  stopWatching(path: string): void;
}

// パーサーサービス
export interface ParserService {
  parseJSON(content: string): Promise<MindmapData>;
  parseYAML(content: string): Promise<MindmapData>;
  validateData(data: any): ValidationResult;
  validateSchema(data: any): ValidationResult;
  validateCustomSchema(data: MindmapData): ValidationResult;
  getParseErrors(content: string, format: 'json' | 'yaml'): ParseError[];
  generateSchema(data: MindmapData): any; // 既存データからスキーマ生成
}

// エラーハンドラー
export interface ErrorHandler {
  handleParseError(error: ParseError): void;
  handleFileError(error: FileError): void;
  showUserFriendlyMessage(error: Error): void;
  recoverFromError(): void;
}

// プラットフォーム適応インターフェース（VSCode拡張対応）
export interface PlatformAdapter {
  fileSystem: FileSystemAdapter;
  editor: EditorAdapter;
  ui: UIAdapter;
}

export interface FileSystemAdapter {
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;
  exists(path: string): Promise<boolean>;
  watchFile(path: string, callback: (content: string) => void): void;
}

export interface EditorAdapter {
  getValue(): string;
  setValue(content: string): void;
  onDidChangeContent(callback: (content: string) => void): void;
  setLanguage(language: 'json' | 'yaml'): void;
  showErrorMarkers(errors: ParseError[]): void;
  clearErrorMarkers(): void;
}

export interface UIAdapter {
  showMessage(message: string, type: 'info' | 'warning' | 'error'): void;
  showProgress(title: string, task: () => Promise<void>): Promise<void>;
  openFileDialog(): Promise<string | undefined>;
  saveFileDialog(): Promise<string | undefined>;
}