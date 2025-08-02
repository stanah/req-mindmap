# 設計書

## 概要

TypeScriptベースのマインドマップツールは、JSON/YAMLファイルをテキストエディタで編集しながら、リアルタイムで視覚的なマインドマップを表示するWebアプリケーションとして設計します。テンプレート機能、AIアシスタント統合、コラボレーション機能、リッチテキスト編集、タグ管理、進捗管理、高度なエクスポート機能、UIカスタマイズ、自動保存・バージョン管理など、包括的な要件定義支援機能を提供します。将来的なVSCode拡張対応を考慮し、モジュラー設計を採用します。

## アーキテクチャ

### 全体アーキテクチャ

```
┌─────────────────┬─────────────────┬─────────────────┐
│   Editor Pane   │  Mindmap Pane   │  Details Panel  │
│                 │                 │                 │
│  Monaco Editor  │   D3.js Graph   │  - Node Details │
│  - JSON/YAML    │   - Interactive │  - Rich Editor  │
│  - Markdown     │   - Zoomable    │  - Tag Manager  │
│  - Syntax HL    │   - Collapsible │  - Progress     │
│  - Auto Indent  │   - Filterable  │  - Comments     │
└─────────────────┴─────────────────┴─────────────────┘
         │                   │                   │
         └───────────────────┼───────────────────┘
                             │
    ┌─────────────────────────────────────────────────┐
    │              Application Core                   │
    │                                                 │
    │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐│
    │  │File Manager │ │AI Assistant │ │Collaboration││
    │  │- Templates  │ │- Suggestions│ │- Real-time  ││
    │  │- Auto Save  │ │- Validation │ │- Comments   ││
    │  │- Versions   │ │- Generation │ │- Sync       ││
    │  └─────────────┘ └─────────────┘ └─────────────┘│
    │                                                 │
    │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐│
    │  │Parser Svc   │ │State Mgr    │ │Export Svc   ││
    │  │- JSON/YAML  │ │- Zustand    │ │- PDF/PNG    ││
    │  │- Markdown   │ │- Persistence│ │- Mermaid    ││
    │  │- Validation │ │- Sync       │ │- Excel/CSV  ││
    │  └─────────────┘ └─────────────┘ └─────────────┘│
    └─────────────────────────────────────────────────┘
```

### 技術スタック

- **フロントエンド**: React + TypeScript
- **エディタ**: Monaco Editor (VS Codeと同じエンジン)
- **リッチテキスト**: @monaco-editor/react + Markdown-it
- **マインドマップ描画**: D3.js + SVG
- **ファイル解析**: js-yaml + JSON.parse + markdown-it
- **スキーマ検証**: Ajv (JSON Schema validator)
- **状態管理**: Zustand (軽量) + Immer (不変性)
- **リアルタイム通信**: Socket.io (コラボレーション用)
- **AIアシスタント**: OpenAI API / Claude API
- **エクスポート**: jsPDF + html2canvas + mermaid
- **テンプレート**: Handlebars.js
- **バージョン管理**: Git-like diff + IndexedDB
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
  richDescription?: string; // Markdown対応
  children?: MindmapNode[];
  metadata?: Record<string, any>; // 拡張可能なメタデータ
  position?: { x: number; y: number };
  collapsed?: boolean;
  customFields?: Record<string, any>; // カスタムフィールド
  tags?: string[]; // タグ管理
  progress?: number; // 進捗率 (0-100)
  deadline?: string; // 期限 (ISO 8601)
  assignee?: string; // 担当者
  priority?: 'high' | 'medium' | 'low'; // 優先度
  status?: 'todo' | 'in-progress' | 'review' | 'done' | 'blocked'; // ステータス
  comments?: Comment[]; // コメント
  relations?: NodeRelation[]; // ノード間関係
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  updatedBy?: string;
}

interface Comment {
  id: string;
  author: string;
  content: string;
  timestamp: string;
  replies?: Comment[];
}

interface NodeRelation {
  type: 'depends-on' | 'related-to' | 'blocks' | 'duplicates';
  targetNodeId: string;
  description?: string;
}

interface MindmapData {
  version: string;
  title: string;
  root: MindmapNode;
  schema?: CustomSchema; // カスタムスキーマ定義
  templates?: Template[]; // テンプレート
  tags?: TagDefinition[]; // タグ定義
  settings?: {
    theme?: 'light' | 'dark' | 'custom';
    layout?: 'tree' | 'radial' | 'force';
    customTheme?: ThemeDefinition;
    shortcuts?: ShortcutDefinition[];
    autoSave?: AutoSaveSettings;
    collaboration?: CollaborationSettings;
    ai?: AISettings;
  };
  metadata?: {
    createdAt: string;
    updatedAt: string;
    authors: string[];
    version: string;
    description?: string;
  };
}

// 新機能のインターフェース
interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  data: MindmapData;
  thumbnail?: string;
  tags: string[];
  isBuiltIn: boolean;
  createdAt: string;
  updatedAt: string;
}

interface TagDefinition {
  name: string;
  color: string;
  icon?: string;
  description?: string;
  category?: string;
}

interface ThemeDefinition {
  name: string;
  colors: {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    text: string;
    accent: string;
  };
  fonts: {
    primary: string;
    secondary: string;
    mono: string;
  };
  spacing: Record<string, number>;
}

interface ShortcutDefinition {
  action: string;
  keys: string[];
  description: string;
  context?: 'editor' | 'mindmap' | 'global';
}

interface AutoSaveSettings {
  enabled: boolean;
  interval: number; // 秒
  maxVersions: number;
  compressionEnabled: boolean;
}

interface CollaborationSettings {
  enabled: boolean;
  serverUrl?: string;
  roomId?: string;
  userName: string;
  permissions: {
    canEdit: boolean;
    canComment: boolean;
    canExport: boolean;
  };
}

interface AISettings {
  enabled: boolean;
  provider: 'openai' | 'claude' | 'local';
  apiKey?: string;
  model: string;
  features: {
    suggestions: boolean;
    validation: boolean;
    generation: boolean;
    translation: boolean;
  };
}

// カスタムスキーマ定義
interface CustomSchema {
  fields: FieldDefinition[];
  displayRules: DisplayRule[];
}

interface FieldDefinition {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'select' | 'multiselect' | 'markdown' | 'user' | 'file';
  label: string;
  required?: boolean;
  options?: string[]; // select/multiselect用
  validation?: ValidationRule[];
  defaultValue?: any;
  placeholder?: string;
  helpText?: string;
}

interface DisplayRule {
  field: string;
  displayType: 'badge' | 'icon' | 'color' | 'text' | 'progress' | 'avatar';
  condition?: string; // 表示条件
  style?: Record<string, any>;
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
}

// 拡張されたサービスインターフェース
interface FileService {
  loadFile(path: string): Promise<string>;
  saveFile(path: string, content: string): Promise<void>;
  watchFile(path: string, callback: (content: string) => void): void;
  autoSave(data: MindmapData): Promise<void>;
  createBackup(data: MindmapData): Promise<string>;
  restoreFromBackup(backupId: string): Promise<MindmapData>;
  exportFile(data: MindmapData, format: ExportFormat): Promise<Blob>;
}

interface TemplateService {
  getTemplates(): Promise<Template[]>;
  getTemplate(id: string): Promise<Template>;
  saveTemplate(template: Template): Promise<void>;
  deleteTemplate(id: string): Promise<void>;
  applyTemplate(templateId: string): Promise<MindmapData>;
  createTemplateFromData(data: MindmapData, metadata: Partial<Template>): Promise<Template>;
}

interface AIService {
  generateSuggestions(node: MindmapNode, context: MindmapData): Promise<string[]>;
  validateConsistency(data: MindmapData): Promise<ValidationIssue[]>;
  generateNodes(prompt: string, parentNode: MindmapNode): Promise<MindmapNode[]>;
  improveDescription(text: string, context: string): Promise<string>;
  translateContent(text: string, targetLanguage: string): Promise<string>;
}

interface CollaborationService {
  connect(roomId: string, userName: string): Promise<void>;
  disconnect(): Promise<void>;
  sendChange(change: ChangeEvent): Promise<void>;
  onRemoteChange(callback: (change: ChangeEvent) => void): void;
  getActiveUsers(): Promise<User[]>;
  addComment(nodeId: string, comment: Comment): Promise<void>;
  resolveComment(commentId: string): Promise<void>;
}

interface VersionService {
  saveVersion(data: MindmapData, message?: string): Promise<string>;
  getVersionHistory(): Promise<Version[]>;
  getVersion(versionId: string): Promise<MindmapData>;
  compareVersions(v1: string, v2: string): Promise<VersionDiff>;
  restoreVersion(versionId: string): Promise<MindmapData>;
  createBranch(name: string, fromVersion?: string): Promise<string>;
  mergeBranch(branchName: string): Promise<MindmapData>;
}

interface ExportService {
  exportToPDF(data: MindmapData, options: PDFExportOptions): Promise<Blob>;
  exportToPNG(data: MindmapData, options: ImageExportOptions): Promise<Blob>;
  exportToSVG(data: MindmapData, options: ImageExportOptions): Promise<string>;
  exportToMermaid(data: MindmapData): Promise<string>;
  exportToExcel(data: MindmapData): Promise<Blob>;
  exportToCSV(data: MindmapData): Promise<string>;
  exportToMarkdown(data: MindmapData): Promise<string>;
}

// パーサー
interface ParserService {
  parseJSON(content: string): MindmapData;
  parseYAML(content: string): MindmapData;
  parseMarkdown(content: string): MindmapData; // Markdown対応
  validateData(data: any): boolean;
  validateSchema(data: any): ValidationResult;
  validateCustomSchema(data: MindmapData): ValidationResult;
  getParseErrors(content: string): ParseError[];
  generateSchema(data: MindmapData): CustomSchema; // 既存データからスキーマ生成
  convertFormat(data: MindmapData, targetFormat: 'json' | 'yaml' | 'markdown'): string;
}

// 新しい型定義
interface ValidationIssue {
  type: 'error' | 'warning' | 'suggestion';
  nodeId: string;
  field?: string;
  message: string;
  suggestion?: string;
  severity: 'low' | 'medium' | 'high';
}

interface ChangeEvent {
  type: 'node-update' | 'node-create' | 'node-delete' | 'node-move';
  nodeId: string;
  data: any;
  userId: string;
  timestamp: string;
}

interface User {
  id: string;
  name: string;
  avatar?: string;
  isOnline: boolean;
  cursor?: { nodeId: string; position: number };
}

interface Version {
  id: string;
  message: string;
  timestamp: string;
  author: string;
  size: number;
  tags: string[];
}

interface VersionDiff {
  added: MindmapNode[];
  modified: { before: MindmapNode; after: MindmapNode }[];
  deleted: MindmapNode[];
  moved: { node: MindmapNode; fromParent: string; toParent: string }[];
}

interface ExportFormat {
  type: 'pdf' | 'png' | 'svg' | 'mermaid' | 'excel' | 'csv' | 'markdown';
  options?: Record<string, any>;
}

interface PDFExportOptions {
  pageSize: 'A4' | 'A3' | 'Letter';
  orientation: 'portrait' | 'landscape';
  includeMetadata: boolean;
  includeComments: boolean;
  quality: 'low' | 'medium' | 'high';
}

interface ImageExportOptions {
  width: number;
  height: number;
  scale: number;
  backgroundColor: string;
  includeWatermark: boolean;
}

// スキーマ検証
interface ValidationResult {
  valid: boolean;
  errors: SchemaError[];
  warnings: SchemaError[];
}

interface SchemaError {
  path: string;
  message: string;
  value: any;
  severity: 'error' | 'warning';
}
```

### 2. React コンポーネント構造

```
App
├── Layout
│   ├── EditorPane
│   │   ├── MonacoEditor
│   │   ├── MarkdownEditor
│   │   ├── FileControls
│   │   ├── TemplateSelector
│   │   └── ErrorDisplay
│   ├── MindmapPane
│   │   ├── MindmapCanvas (D3.js)
│   │   ├── ZoomControls
│   │   ├── LayoutControls
│   │   ├── FilterControls
│   │   └── ExportControls
│   └── DetailsPane
│       ├── NodeDetailsPanel
│       ├── RichTextEditor
│       ├── TagManager
│       ├── ProgressTracker
│       ├── CommentSection
│       └── RelationshipEditor
├── Modals
│   ├── TemplateGallery
│   ├── AIAssistant
│   ├── SettingsPanel
│   ├── ExportDialog
│   ├── VersionHistory
│   ├── CollaborationPanel
│   └── ShortcutEditor
├── Toolbars
│   ├── MainToolbar
│   ├── StatusBar
│   └── CollaborationBar
└── Overlays
    ├── LoadingOverlay
    ├── ErrorBoundary
    └── ToastNotifications
```

### 3. 状態管理

```typescript
interface AppState {
  // ファイル状態
  currentFile: string | null;
  fileContent: string;
  isDirty: boolean;
  autoSaveEnabled: boolean;
  lastSaved: string | null;
  
  // パース状態
  parsedData: MindmapData | null;
  parseErrors: ParseError[];
  validationIssues: ValidationIssue[];
  
  // UI状態
  editorSettings: EditorSettings;
  mindmapSettings: MindmapSettings;
  selectedNodeId: string | null;
  activePane: 'editor' | 'mindmap' | 'details';
  theme: ThemeDefinition;
  shortcuts: ShortcutDefinition[];
  
  // テンプレート状態
  templates: Template[];
  selectedTemplate: string | null;
  
  // AI状態
  aiEnabled: boolean;
  aiSuggestions: string[];
  aiLoading: boolean;
  
  // コラボレーション状態
  collaborationEnabled: boolean;
  activeUsers: User[];
  comments: Record<string, Comment[]>;
  
  // バージョン管理状態
  versions: Version[];
  currentVersion: string | null;
  
  // タグ・フィルタ状態
  availableTags: TagDefinition[];
  selectedTags: string[];
  filterSettings: FilterSettings;
  
  // エクスポート状態
  exportFormats: ExportFormat[];
  exportInProgress: boolean;
  
  // アクション
  loadFile: (path: string) => Promise<void>;
  saveFile: () => Promise<void>;
  autoSave: () => Promise<void>;
  updateContent: (content: string) => void;
  selectNode: (nodeId: string) => void;
  toggleNodeCollapse: (nodeId: string) => void;
  
  // テンプレート操作
  loadTemplate: (templateId: string) => Promise<void>;
  saveAsTemplate: (name: string, description: string) => Promise<void>;
  
  // AI操作
  generateSuggestions: (nodeId: string) => Promise<void>;
  applySuggestion: (suggestion: string) => void;
  validateWithAI: () => Promise<void>;
  
  // コラボレーション操作
  joinCollaboration: (roomId: string, userName: string) => Promise<void>;
  leaveCollaboration: () => Promise<void>;
  addComment: (nodeId: string, comment: string) => Promise<void>;
  
  // バージョン管理操作
  saveVersion: (message: string) => Promise<void>;
  restoreVersion: (versionId: string) => Promise<void>;
  compareVersions: (v1: string, v2: string) => Promise<void>;
  
  // タグ・フィルタ操作
  addTag: (nodeId: string, tag: string) => void;
  removeTag: (nodeId: string, tag: string) => void;
  filterByTags: (tags: string[]) => void;
  
  // エクスポート操作
  exportData: (format: ExportFormat) => Promise<void>;
  
  // 設定操作
  updateTheme: (theme: ThemeDefinition) => void;
  updateShortcuts: (shortcuts: ShortcutDefinition[]) => void;
  resetSettings: () => void;
}

interface FilterSettings {
  tags: string[];
  status: string[];
  priority: string[];
  assignee: string[];
  dateRange: { start: string; end: string } | null;
  searchQuery: string;
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
version: "2.0"
title: "要件定義マインドマップ"
metadata:
  createdAt: "2024-01-15T09:00:00Z"
  updatedAt: "2024-01-20T15:30:00Z"
  authors: ["田中太郎", "佐藤花子"]
  version: "1.2.0"
  description: "新システムの包括的要件定義"

templates:
  - id: "basic-requirements"
    name: "基本要件テンプレート"
    description: "標準的な要件定義構造"
    category: "requirements"
    isBuiltIn: true

tags:
  - name: "critical"
    color: "#ff4444"
    icon: "alert"
    description: "クリティカルな要件"
  - name: "nice-to-have"
    color: "#44ff44"
    icon: "star"
    description: "あると良い機能"

schema:
  fields:
    - name: priority
      type: select
      label: "優先度"
      options: ["high", "medium", "low"]
      required: true
      helpText: "要件の重要度を選択"
    - name: status
      type: select
      label: "ステータス"
      options: ["todo", "in-progress", "review", "done", "blocked"]
      defaultValue: "todo"
    - name: assignee
      type: user
      label: "担当者"
      placeholder: "担当者を選択"
    - name: deadline
      type: date
      label: "期限"
    - name: progress
      type: number
      label: "進捗率"
      validation:
        - type: range
          min: 0
          max: 100
    - name: richDescription
      type: markdown
      label: "詳細説明"
      helpText: "Markdownで詳細を記述"
  displayRules:
    - field: priority
      displayType: badge
      position: "top"
      style:
        high: { color: "white", backgroundColor: "#ff4444" }
        medium: { color: "white", backgroundColor: "#ff8800" }
        low: { color: "white", backgroundColor: "#44aa44" }
    - field: status
      displayType: icon
      position: "left"
      style:
        todo: { icon: "circle", color: "#999" }
        in-progress: { icon: "clock", color: "#0066cc" }
        review: { icon: "eye", color: "#ff8800" }
        done: { icon: "check", color: "#44aa44" }
        blocked: { icon: "block", color: "#ff4444" }
    - field: progress
      displayType: progress
      position: "bottom"
      style:
        backgroundColor: "#f0f0f0"
        fillColor: "#0066cc"

root:
  id: root
  title: "システム要件"
  richDescription: |
    # 新システムの要件定義
    
    ## 概要
    次世代システムの包括的な要件を定義します。
    
    ## 目標
    - ユーザビリティの向上
    - パフォーマンスの最適化
    - セキュリティの強化
  tags: ["critical"]
  progress: 25
  createdAt: "2024-01-15T09:00:00Z"
  updatedAt: "2024-01-20T15:30:00Z"
  children:
    - id: func-req
      title: "機能要件"
      description: "システムが提供すべき機能"
      tags: ["critical"]
      progress: 40
      assignee: "田中太郎"
      children:
        - id: user-auth
          title: "ユーザー認証"
          richDescription: |
            ## ユーザー認証機能
            
            ### 要求事項
            - セキュアなログイン・ログアウト
            - 多要素認証対応
            - パスワードポリシー適用
            
            ### 技術要件
            - OAuth 2.0対応
            - JWT トークン使用
            - セッション管理
          customFields:
            priority: high
            status: in-progress
            assignee: "田中太郎"
            deadline: "2024-03-31"
            progress: 60
          tags: ["critical", "security"]
          comments:
            - id: "c1"
              author: "佐藤花子"
              content: "多要素認証の実装方法について相談したい"
              timestamp: "2024-01-18T10:30:00Z"
              replies:
                - id: "c1-r1"
                  author: "田中太郎"
                  content: "SMS認証とTOTP認証の両方を検討しましょう"
                  timestamp: "2024-01-18T14:15:00Z"
          relations:
            - type: "depends-on"
              targetNodeId: "security-framework"
              description: "セキュリティフレームワークの実装が前提"

settings:
  theme: "custom"
  layout: "tree"
  customTheme:
    name: "プロジェクトテーマ"
    colors:
      primary: "#0066cc"
      secondary: "#44aa44"
      background: "#ffffff"
      surface: "#f8f9fa"
      text: "#333333"
      accent: "#ff8800"
    fonts:
      primary: "Noto Sans JP"
      secondary: "Roboto"
      mono: "Fira Code"
  shortcuts:
    - action: "save"
      keys: ["Ctrl", "S"]
      description: "ファイルを保存"
      context: "global"
    - action: "new-node"
      keys: ["Ctrl", "N"]
      description: "新しいノードを作成"
      context: "mindmap"
  autoSave:
    enabled: true
    interval: 30
    maxVersions: 50
    compressionEnabled: true
  collaboration:
    enabled: true
    userName: "田中太郎"
    permissions:
      canEdit: true
      canComment: true
      canExport: true
  ai:
    enabled: true
    provider: "openai"
    model: "gpt-4"
    features:
      suggestions: true
      validation: true
      generation: true
      translation: false
```

## エラーハンドリング

### エラー種別

1. **パースエラー**: JSON/YAML/Markdown構文エラー
2. **バリデーションエラー**: データ構造の不整合
3. **ファイルエラー**: ファイル読み書きエラー
4. **描画エラー**: マインドマップ描画エラー
5. **ネットワークエラー**: コラボレーション・AI通信エラー
6. **認証エラー**: AI API・コラボレーション認証エラー
7. **エクスポートエラー**: ファイル出力エラー
8. **テンプレートエラー**: テンプレート読み込み・適用エラー
9. **バージョン管理エラー**: バージョン操作エラー
10. **権限エラー**: コラボレーション権限エラー

### エラー処理戦略

```typescript
interface ErrorHandler {
  handleParseError(error: ParseError): void;
  handleFileError(error: FileError): void;
  handleNetworkError(error: NetworkError): void;
  handleAuthError(error: AuthError): void;
  handleExportError(error: ExportError): void;
  handleTemplateError(error: TemplateError): void;
  handleVersionError(error: VersionError): void;
  handleCollaborationError(error: CollaborationError): void;
  showUserFriendlyMessage(error: Error): void;
  recoverFromError(): void;
  logError(error: Error, context: string): void;
}

// エラー型定義
interface ParseError {
  line: number;
  column: number;
  message: string;
  severity: 'error' | 'warning';
  type: 'syntax' | 'schema' | 'validation';
}

interface NetworkError {
  type: 'connection' | 'timeout' | 'server';
  message: string;
  retryable: boolean;
  retryAfter?: number;
}

interface AuthError {
  type: 'invalid-key' | 'expired-token' | 'insufficient-permissions';
  message: string;
  provider: string;
}

interface ExportError {
  type: 'format-unsupported' | 'generation-failed' | 'file-too-large';
  format: string;
  message: string;
}

interface TemplateError {
  type: 'not-found' | 'invalid-format' | 'incompatible-version';
  templateId: string;
  message: string;
}

interface VersionError {
  type: 'not-found' | 'conflict' | 'storage-full';
  versionId?: string;
  message: string;
}

interface CollaborationError {
  type: 'connection-lost' | 'sync-conflict' | 'permission-denied';
  message: string;
  recoverable: boolean;
}
```

## テスト戦略

### 1. 単体テスト
- パーサーサービス（JSON/YAML/Markdown）のテスト
- データバリデーションのテスト
- ユーティリティ関数のテスト
- テンプレートサービスのテスト
- AIサービスのモックテスト
- エクスポートサービスのテスト
- バージョン管理サービスのテスト

### 2. 統合テスト
- ファイル読み込み→パース→描画の流れ
- エディタ変更→リアルタイム更新
- エラー処理の動作確認
- テンプレート適用→データ更新の流れ
- AI機能統合テスト（モック使用）
- エクスポート機能統合テスト
- バージョン管理統合テスト

### 3. E2Eテスト
- ファイル操作のワークフロー
- マインドマップ操作（ズーム、パン、折りたたみ）
- エディタとマインドマップの同期
- テンプレート選択→適用→編集のワークフロー
- タグ管理・フィルタリング機能
- 進捗管理機能
- エクスポート機能のワークフロー
- 設定変更・カスタマイズ機能
- ショートカットキー操作

### 4. パフォーマンステスト
- 大規模データでの描画性能
- リアルタイム更新の応答性
- メモリ使用量の監視
- エクスポート処理の性能
- バージョン履歴の読み込み性能
- 大量ノードでのフィルタリング性能

### 5. コラボレーションテスト
- 複数ユーザー同時編集のシミュレーション
- 競合解決機能のテスト
- リアルタイム同期の信頼性テスト
- コメント機能のテスト

### 6. セキュリティテスト
- AI API キーの安全な管理
- ファイルアップロード時のバリデーション
- XSS攻撃対策のテスト
- データ漏洩防止のテスト

### 7. アクセシビリティテスト
- キーボードナビゲーション
- スクリーンリーダー対応
- 色覚異常対応
- 高コントラストモード対応

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
