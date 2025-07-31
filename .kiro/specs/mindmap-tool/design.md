# 設計書

## 概要

TypeScriptベースのマインドマップツールは、JSON/YAMLファイルをテキストエディタで編集しながら、リアルタイムで視覚的なマインドマップを表示するWebアプリケーションとして設計します。将来的なVSCode拡張対応を考慮し、モジュラー設計を採用します。

## アーキテクチャ

### 全体アーキテクチャ

```
┌─────────────────┬─────────────────┐
│   Editor Pane   │  Mindmap Pane   │
│                 │                 │
│  Monaco Editor  │   D3.js Graph   │
│  - JSON/YAML    │   - Interactive │
│  - Syntax HL    │   - Zoomable    │
│  - Auto Indent  │   - Collapsible │
└─────────────────┴─────────────────┘
         │                   │
         └───────┬───────────┘
                 │
    ┌─────────────────────────┐
    │    Application Core     │
    │                         │
    │  - File Manager         │
    │  - Parser Service       │
    │  - State Manager        │
    │  - Event Bus            │
    └─────────────────────────┘
```

### 技術スタック

- **フロントエンド**: React + TypeScript
- **エディタ**: Monaco Editor (VS Codeと同じエンジン)
- **マインドマップ描画**: D3.js + SVG
- **ファイル解析**: js-yaml + JSON.parse
- **スキーマ検証**: Ajv (JSON Schema validator)
- **状態管理**: Zustand (軽量)
- **ビルドツール**: Vite
- **テスト**: Vitest + React Testing Library
- **実行環境**: ブラウザ（開発・テスト）、VSCode Webview（拡張）

## コンポーネントとインターフェース

### 1. コアインターフェース

```typescript
// データモデル
interface MindmapNode {
  id: string;
  title: string;
  description?: string;
  children?: MindmapNode[];
  metadata?: Record<string, any>; // 拡張可能なメタデータ
  position?: { x: number; y: number };
  collapsed?: boolean;
  customFields?: Record<string, any>; // カスタムフィールド
}

interface MindmapData {
  version: string;
  title: string;
  root: MindmapNode;
  schema?: CustomSchema; // カスタムスキーマ定義
  settings?: {
    theme?: 'light' | 'dark';
    layout?: 'tree' | 'radial';
  };
}

// カスタムスキーマ定義
interface CustomSchema {
  fields: FieldDefinition[];
  displayRules: DisplayRule[];
}

interface FieldDefinition {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'select' | 'multiselect';
  label: string;
  required?: boolean;
  options?: string[]; // select/multiselect用
  validation?: ValidationRule[];
}

interface DisplayRule {
  field: string;
  displayType: 'badge' | 'icon' | 'color' | 'text';
  condition?: string; // 表示条件
  style?: Record<string, any>;
}

// ファイル操作
interface FileService {
  loadFile(path: string): Promise<string>;
  saveFile(path: string, content: string): Promise<void>;
  watchFile(path: string, callback: (content: string) => void): void;
}

// パーサー
interface ParserService {
  parseJSON(content: string): MindmapData;
  parseYAML(content: string): MindmapData;
  validateData(data: any): boolean;
  validateSchema(data: any): ValidationResult;
  validateCustomSchema(data: MindmapData): ValidationResult;
  getParseErrors(content: string): ParseError[];
  generateSchema(data: MindmapData): CustomSchema; // 既存データからスキーマ生成
}

// スキーマ検証
interface ValidationResult {
  valid: boolean;
  errors: SchemaError[];
}

interface SchemaError {
  path: string;
  message: string;
  value: any;
}
```

### 2. React コンポーネント構造

```
App
├── Layout
│   ├── EditorPane
│   │   ├── MonacoEditor
│   │   ├── FileControls
│   │   └── ErrorDisplay
│   └── MindmapPane
│       ├── MindmapCanvas (D3.js)
│       ├── ZoomControls
│       └── LayoutControls
├── StatusBar
└── SettingsPanel
```

### 3. 状態管理

```typescript
interface AppState {
  // ファイル状態
  currentFile: string | null;
  fileContent: string;
  isDirty: boolean;
  
  // パース状態
  parsedData: MindmapData | null;
  parseErrors: ParseError[];
  
  // UI状態
  editorSettings: EditorSettings;
  mindmapSettings: MindmapSettings;
  selectedNodeId: string | null;
  
  // アクション
  loadFile: (path: string) => Promise<void>;
  saveFile: () => Promise<void>;
  updateContent: (content: string) => void;
  selectNode: (nodeId: string) => void;
  toggleNodeCollapse: (nodeId: string) => void;
}
```

## データモデル

### JSON形式例

```json
{
  "version": "1.0",
  "title": "要件定義マインドマップ",
  "root": {
    "id": "root",
    "title": "システム要件",
    "description": "新システムの要件定義",
    "children": [
      {
        "id": "func-req",
        "title": "機能要件",
        "children": [
          {
            "id": "user-auth",
            "title": "ユーザー認証",
            "description": "ログイン・ログアウト機能",
            "metadata": {
              "priority": "high",
              "status": "todo",
              "assignee": "田中"
            }
          }
        ]
      }
    ]
  },
  "settings": {
    "theme": "light",
    "layout": "tree"
  }
}
```

### YAML形式例

```yaml
version: "1.0"
title: "要件定義マインドマップ"
schema:
  fields:
    - name: priority
      type: select
      label: "優先度"
      options: ["high", "medium", "low"]
      required: true
    - name: status
      type: select
      label: "ステータス"
      options: ["todo", "in-progress", "done"]
    - name: assignee
      type: string
      label: "担当者"
    - name: deadline
      type: date
      label: "期限"
  displayRules:
    - field: priority
      displayType: badge
      style:
        high: { color: "red", backgroundColor: "#ffebee" }
        medium: { color: "orange", backgroundColor: "#fff3e0" }
        low: { color: "green", backgroundColor: "#e8f5e8" }
    - field: status
      displayType: icon
      style:
        todo: { icon: "circle", color: "gray" }
        in-progress: { icon: "clock", color: "blue" }
        done: { icon: "check", color: "green" }
root:
  id: root
  title: "システム要件"
  description: "新システムの要件定義"
  children:
    - id: func-req
      title: "機能要件"
      children:
        - id: user-auth
          title: "ユーザー認証"
          description: "ログイン・ログアウト機能"
          customFields:
            priority: high
            status: todo
            assignee: "田中"
            deadline: "2024-03-31"
settings:
  theme: light
  layout: tree
```

## エラーハンドリング

### エラー種別

1. **パースエラー**: JSON/YAML構文エラー
2. **バリデーションエラー**: データ構造の不整合
3. **ファイルエラー**: ファイル読み書きエラー
4. **描画エラー**: マインドマップ描画エラー

### エラー処理戦略

```typescript
interface ErrorHandler {
  handleParseError(error: ParseError): void;
  handleFileError(error: FileError): void;
  showUserFriendlyMessage(error: Error): void;
  recoverFromError(): void;
}

// エラー表示
interface ParseError {
  line: number;
  column: number;
  message: string;
  severity: 'error' | 'warning';
}
```

## テスト戦略

### 1. 単体テスト
- パーサーサービスのテスト
- データバリデーションのテスト
- ユーティリティ関数のテスト

### 2. 統合テスト
- ファイル読み込み→パース→描画の流れ
- エディタ変更→リアルタイム更新
- エラー処理の動作確認

### 3. E2Eテスト
- ファイル操作のワークフロー
- マインドマップ操作（ズーム、パン、折りたたみ）
- エディタとマインドマップの同期

### 4. パフォーマンステスト
- 大規模データでの描画性能
- リアルタイム更新の応答性
- メモリ使用量の監視

## 実装詳細

### 1. Monaco Editor統合

```typescript
class EditorService {
  private editor: monaco.editor.IStandaloneCodeEditor;
  
  initializeEditor(container: HTMLElement, language: 'json' | 'yaml') {
    this.editor = monaco.editor.create(container, {
      language,
      theme: 'vs-dark',
      automaticLayout: true,
      formatOnPaste: true,
      formatOnType: true
    });
    
    this.setupChangeListener();
    this.setupErrorMarkers();
  }
  
  private setupChangeListener() {
    this.editor.onDidChangeModelContent((e) => {
      const content = this.editor.getValue();
      this.onContentChange(content);
    });
  }
}
```

### 2. D3.js マインドマップ描画

```typescript
class MindmapRenderer {
  private svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;
  private zoom: d3.ZoomBehavior<SVGSVGElement, unknown>;
  
  render(data: MindmapData, container: HTMLElement) {
    this.svg = d3.select(container).append('svg');
    this.setupZoom();
    this.drawNodes(data.root);
    this.drawLinks(data.root);
  }
  
  private drawNodes(node: MindmapNode) {
    // ノード描画ロジック
    // 折りたたみ状態の管理
    // クリックイベントの処理
  }
}
```

### 3. リアルタイム同期

```typescript
class SyncService {
  private debounceTimer: NodeJS.Timeout;
  
  onEditorChange(content: string) {
    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.updateMindmap(content);
    }, 300); // 300ms デバウンス
  }
  
  private async updateMindmap(content: string) {
    try {
      const data = await this.parserService.parse(content);
      this.mindmapRenderer.render(data);
    } catch (error) {
      this.errorHandler.handleParseError(error);
    }
  }
}
```

## VSCode拡張対応設計

### 1. アーキテクチャ分離

```typescript
// 抽象化レイヤー
interface PlatformAdapter {
  fileSystem: FileSystemAdapter;
  editor: EditorAdapter;
  ui: UIAdapter;
}

// VSCode実装
class VSCodeAdapter implements PlatformAdapter {
  fileSystem = new VSCodeFileSystemAdapter();
  editor = new VSCodeEditorAdapter();
  ui = new VSCodeUIAdapter();
}

// ブラウザ実装
class BrowserAdapter implements PlatformAdapter {
  fileSystem = new BrowserFileSystemAdapter();
  editor = new MonacoEditorAdapter();
  ui = new WebUIAdapter();
}
```

### 2. 設定管理

```typescript
interface SettingsManager {
  get<T>(key: string): T;
  set<T>(key: string, value: T): void;
  onDidChange(callback: (key: string, value: any) => void): void;
}
```
