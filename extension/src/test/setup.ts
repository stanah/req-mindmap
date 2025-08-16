import { vi } from 'vitest';

// VSCode APIのモック
const mockVSCode = {
  workspace: {
    onDidChangeConfiguration: vi.fn(),
    onDidChangeTextDocument: vi.fn(),
    getConfiguration: vi.fn(() => ({
      get: vi.fn(),
      update: vi.fn()
    })),
    fs: {
      readFile: vi.fn(),
      writeFile: vi.fn(),
      stat: vi.fn()
    },
    applyEdit: vi.fn(),
    openTextDocument: vi.fn()
  },
  window: {
    onDidChangeActiveTextEditor: vi.fn(),
    onDidChangeActiveColorTheme: vi.fn(),
    showInformationMessage: vi.fn(),
    showWarningMessage: vi.fn(),
    showErrorMessage: vi.fn(),
    showQuickPick: vi.fn(),
    showInputBox: vi.fn(),
    showSaveDialog: vi.fn(),
    showOpenDialog: vi.fn(),
    showTextDocument: vi.fn(),
    setStatusBarMessage: vi.fn(),
    activeTextEditor: null,
    visibleTextEditors: [],
    createWebviewPanel: vi.fn(),
    createTreeView: vi.fn(),
    registerCustomEditorProvider: vi.fn()
  },
  commands: {
    registerCommand: vi.fn(),
    executeCommand: vi.fn()
  },
  Uri: {
    file: vi.fn((path: string) => ({ 
      fsPath: path, 
      toString: () => path,
      path: path,
      scheme: 'file'
    })),
    joinPath: vi.fn((...paths: any[]) => ({
      fsPath: paths.map(p => p.fsPath || p).join('/'),
      toString: () => paths.map(p => p.fsPath || p).join('/'),
      path: paths.map(p => p.fsPath || p).join('/'),
      scheme: 'file'
    }))
  },
  Range: vi.fn(),
  Position: vi.fn(),
  Selection: vi.fn(),
  WorkspaceEdit: vi.fn(() => ({
    replace: vi.fn()
  })),
  TextEditorRevealType: {
    InCenter: 1,
    InCenterIfOutsideViewport: 2,
    AtTop: 3
  },
  TreeItem: class TreeItem {
    constructor(label: string, collapsibleState?: number) {
      this.label = label;
      this.collapsibleState = collapsibleState || 0;
    }
    label: string;
    collapsibleState: number;
    id?: string;
    tooltip?: string;
    contextValue?: string;
    command?: any;
  },
  TreeItemCollapsibleState: {
    None: 0,
    Collapsed: 1,
    Expanded: 2
  },
  ViewColumn: {
    Active: -1,
    Beside: -2,
    One: 1,
    Two: 2,
    Three: 3
  },
  ConfigurationTarget: {
    Global: 1,
    Workspace: 2,
    WorkspaceFolder: 3
  },
  EventEmitter: vi.fn(() => ({
    fire: vi.fn(),
    event: vi.fn()
  })),
  Disposable: vi.fn()
};

// VSCode APIを全域でモック
vi.mock('vscode', () => mockVSCode);

export { mockVSCode };