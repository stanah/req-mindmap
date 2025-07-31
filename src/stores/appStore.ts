import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { AppState, EditorSettings, MindmapSettings } from '../types';
import { APP_CONFIG, STORAGE_KEYS, storage } from '../utils';

// 初期状態
const initialState = {
  currentFile: null,
  fileContent: '',
  isDirty: false,
  parsedData: null,
  parseErrors: [],
  isValidData: false,
  editorSettings: storage.get(STORAGE_KEYS.EDITOR_SETTINGS, APP_CONFIG.defaultSettings.editor),
  mindmapSettings: storage.get(STORAGE_KEYS.MINDMAP_SETTINGS, APP_CONFIG.defaultSettings.mindmap),
  selectedNodeId: null,
  isLoading: false,
};

export const useAppStore = create<AppState>()(
  devtools(
    (set, get) => ({
      ...initialState,

      // ファイル操作
      loadFile: async (path: string) => {
        set({ isLoading: true });
        try {
          // TODO: 実際のファイル読み込み処理を実装
          // 現在はプレースホルダー
          console.log('Loading file:', path);
          set({
            currentFile: path,
            isDirty: false,
            isLoading: false,
          });
        } catch (error) {
          console.error('Failed to load file:', error);
          set({ isLoading: false });
        }
      },

      saveFile: async () => {
        const { currentFile } = get();
        if (!currentFile) return;

        set({ isLoading: true });
        try {
          // TODO: 実際のファイル保存処理を実装
          console.log('Saving file:', currentFile);
          set({
            isDirty: false,
            isLoading: false,
          });
        } catch (error) {
          console.error('Failed to save file:', error);
          set({ isLoading: false });
        }
      },

      saveFileAs: async (path: string) => {
        set({ isLoading: true });
        try {
          // TODO: 実際のファイル保存処理を実装
          console.log('Saving file as:', path);
          set({
            currentFile: path,
            isDirty: false,
            isLoading: false,
          });
        } catch (error) {
          console.error('Failed to save file as:', error);
          set({ isLoading: false });
        }
      },

      // コンテンツ更新
      updateContent: (content: string) => {
        const { fileContent } = get();
        set({
          fileContent: content,
          isDirty: content !== fileContent,
        });
        
        // TODO: パース処理を実装
        // 現在はプレースホルダー
        console.log('Content updated, length:', content.length);
      },

      // ノード選択
      selectNode: (nodeId: string) => {
        set({ selectedNodeId: nodeId });
      },

      // ノード折りたたみ
      toggleNodeCollapse: (nodeId: string) => {
        const { parsedData } = get();
        if (!parsedData) return;

        // TODO: ノード折りたたみ処理を実装
        console.log('Toggle collapse for node:', nodeId);
      },

      // 設定更新
      updateEditorSettings: (settings: Partial<EditorSettings>) => {
        const currentSettings = get().editorSettings;
        const newSettings = { ...currentSettings, ...settings };
        
        set({ editorSettings: newSettings });
        storage.set(STORAGE_KEYS.EDITOR_SETTINGS, newSettings);
      },

      updateMindmapSettings: (settings: Partial<MindmapSettings>) => {
        const currentSettings = get().mindmapSettings;
        const newSettings = { ...currentSettings, ...settings };
        
        set({ mindmapSettings: newSettings });
        storage.set(STORAGE_KEYS.MINDMAP_SETTINGS, newSettings);
      },

      // エラー管理
      clearErrors: () => {
        set({ parseErrors: [] });
      },

      // ローディング状態
      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },
    }),
    {
      name: 'mindmap-app-store',
    }
  )
);