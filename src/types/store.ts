import type { MindmapData, ParseError, EditorSettings, MindmapSettings } from './mindmap';

// アプリケーション全体の状態
export interface AppState {
  // ファイル状態
  currentFile: string | null;
  fileContent: string;
  isDirty: boolean;
  
  // パース状態
  parsedData: MindmapData | null;
  parseErrors: ParseError[];
  isValidData: boolean;
  
  // UI状態
  editorSettings: EditorSettings;
  mindmapSettings: MindmapSettings;
  selectedNodeId: string | null;
  isLoading: boolean;
  
  // アクション
  loadFile: (path: string) => Promise<void>;
  saveFile: () => Promise<void>;
  saveFileAs: (path: string) => Promise<void>;
  updateContent: (content: string) => void;
  selectNode: (nodeId: string) => void;
  toggleNodeCollapse: (nodeId: string) => void;
  updateEditorSettings: (settings: Partial<EditorSettings>) => void;
  updateMindmapSettings: (settings: Partial<MindmapSettings>) => void;
  clearErrors: () => void;
  setLoading: (loading: boolean) => void;
}

// エディタ専用の状態
export interface EditorState {
  content: string;
  language: 'json' | 'yaml';
  errors: ParseError[];
  cursorPosition: { line: number; column: number };
  
  // アクション
  setContent: (content: string) => void;
  setLanguage: (language: 'json' | 'yaml') => void;
  setErrors: (errors: ParseError[]) => void;
  setCursorPosition: (position: { line: number; column: number }) => void;
}

// マインドマップ専用の状態
export interface MindmapState {
  data: MindmapData | null;
  selectedNodeId: string | null;
  collapsedNodes: Set<string>;
  zoomLevel: number;
  panOffset: { x: number; y: number };
  
  // アクション
  setData: (data: MindmapData | null) => void;
  selectNode: (nodeId: string | null) => void;
  toggleNodeCollapse: (nodeId: string) => void;
  setZoom: (level: number) => void;
  setPan: (offset: { x: number; y: number }) => void;
  resetView: () => void;
}