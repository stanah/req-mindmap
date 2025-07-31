/**
 * アプリケーションストアのテスト
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useAppStore } from '../appStore';
import { selectors } from '../selectors';
import type { AppState } from '../../types/store';

// モックの設定
vi.mock('../../utils/helpers', () => ({
  storage: {
    get: vi.fn((_key: string, defaultValue: any) => defaultValue),
    set: vi.fn(),
    remove: vi.fn(),
  },
  debounce: vi.fn((fn: Function, _delay: number) => fn),
  generateId: vi.fn(() => 'test-id'),
  detectFileFormat: vi.fn(() => 'json'),
  deepClone: vi.fn((obj: any) => JSON.parse(JSON.stringify(obj))),
  findNodeById: vi.fn(),
}));

describe('AppStore', () => {
  beforeEach(() => {
    // ストアをリセット
    useAppStore.getState().reset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('初期状態', () => {
    it('正しい初期状態を持つ', () => {
      const state = useAppStore.getState();
      
      expect(state.file.currentFile).toBeNull();
      expect(state.file.fileContent).toBe('');
      expect(state.file.isDirty).toBe(false);
      expect(state.parse.parsedData).toBeNull();
      expect(state.parse.parseErrors).toEqual([]);
      expect(state.ui.selectedNodeId).toBeNull();
      expect(state.ui.isLoading).toBe(false);
      expect(state.initialized).toBe(false);
    });
  });

  describe('ファイル操作', () => {
    it('新規ファイルを作成できる', () => {
      const { newFile } = useAppStore.getState();
      
      newFile();
      
      const state = useAppStore.getState();
      expect(state.file.fileContent).toContain('新しいマインドマップ');
      expect(state.file.fileFormat).toBe('json');
      expect(state.file.isDirty).toBe(true);
    });

    it('ファイルを読み込める', async () => {
      const { loadFile } = useAppStore.getState();
      
      await loadFile('/test/path/file.json');
      
      const state = useAppStore.getState();
      expect(state.file.currentFile).toBe('/test/path/file.json');
      expect(state.file.fileFormat).toBe('json');
      expect(state.file.isDirty).toBe(false);
    });

    it('コンテンツを更新できる', () => {
      const { updateContent } = useAppStore.getState();
      
      const testContent = '{"test": "content"}';
      updateContent(testContent);
      
      const state = useAppStore.getState();
      expect(state.file.fileContent).toBe(testContent);
      expect(state.file.isDirty).toBe(true);
    });
  });

  describe('UI操作', () => {
    it('ノードを選択できる', () => {
      const { selectNode } = useAppStore.getState();
      
      selectNode('test-node-id');
      
      const state = useAppStore.getState();
      expect(state.ui.selectedNodeId).toBe('test-node-id');
      expect(state.ui.nodeSelection).toEqual({
        nodeId: 'test-node-id',
        type: 'click',
        timestamp: expect.any(Number),
      });
    });

    it('サイドバーの表示/非表示を切り替えられる', () => {
      const { toggleSidebar } = useAppStore.getState();
      
      const initialState = useAppStore.getState().ui.sidebarOpen;
      toggleSidebar();
      
      const newState = useAppStore.getState().ui.sidebarOpen;
      expect(newState).toBe(!initialState);
    });

    it('通知を追加できる', () => {
      const { addNotification } = useAppStore.getState();
      
      addNotification({
        message: 'テスト通知',
        type: 'info',
        autoHide: true,
        duration: 3000,
      });
      
      const state = useAppStore.getState();
      expect(state.ui.notifications).toHaveLength(1);
      expect(state.ui.notifications[0].message).toBe('テスト通知');
      expect(state.ui.notifications[0].type).toBe('info');
    });

    it('通知を削除できる', () => {
      const { addNotification, removeNotification } = useAppStore.getState();
      
      // 通知を追加
      addNotification({
        message: 'テスト通知',
        type: 'info',
        autoHide: false,
      });
      
      const notificationId = useAppStore.getState().ui.notifications[0].id;
      
      // 通知を削除
      removeNotification(notificationId);
      
      const state = useAppStore.getState();
      expect(state.ui.notifications).toHaveLength(0);
    });

    it('モーダルを表示できる', () => {
      const { showModal } = useAppStore.getState();
      
      const modalData = {
        type: 'confirm' as const,
        title: 'テストモーダル',
        message: 'テストメッセージ',
      };
      
      showModal(modalData);
      
      const state = useAppStore.getState();
      expect(state.ui.modal).toEqual(modalData);
    });

    it('モーダルを閉じられる', () => {
      const { showModal, closeModal } = useAppStore.getState();
      
      // モーダルを表示
      showModal({
        type: 'alert',
        title: 'テスト',
        message: 'テスト',
      });
      
      // モーダルを閉じる
      closeModal();
      
      const state = useAppStore.getState();
      expect(state.ui.modal).toBeNull();
    });
  });

  describe('設定管理', () => {
    it('エディタ設定を更新できる', () => {
      const { updateEditorSettings } = useAppStore.getState();
      
      updateEditorSettings({
        fontSize: 16,
        theme: 'vs-dark',
      });
      
      const state = useAppStore.getState();
      expect(state.ui.editorSettings.fontSize).toBe(16);
      expect(state.ui.editorSettings.theme).toBe('vs-dark');
    });

    it('マインドマップ設定を更新できる', () => {
      const { updateMindmapSettings } = useAppStore.getState();
      
      updateMindmapSettings({
        zoom: 1.5,
        layout: 'radial',
      });
      
      const state = useAppStore.getState();
      expect(state.ui.mindmapSettings.zoom).toBe(1.5);
      expect(state.ui.mindmapSettings.layout).toBe('radial');
    });

    it('設定をリセットできる', () => {
      const { updateEditorSettings, resetSettings } = useAppStore.getState();
      
      // 設定を変更
      updateEditorSettings({ fontSize: 20 });
      
      // 設定をリセット
      resetSettings();
      
      const state = useAppStore.getState();
      expect(state.ui.editorSettings.fontSize).toBe(14); // デフォルト値
    });
  });

  describe('デバッグ機能', () => {
    it('デバッグモードを切り替えられる', () => {
      const { toggleDebugMode } = useAppStore.getState();
      
      const initialDebugMode = useAppStore.getState().debugMode;
      toggleDebugMode();
      
      const newDebugMode = useAppStore.getState().debugMode;
      expect(newDebugMode).toBe(!initialDebugMode);
    });
  });

  describe('アプリケーション初期化', () => {
    it('アプリケーションを初期化できる', async () => {
      const { initialize } = useAppStore.getState();
      
      await initialize();
      
      const state = useAppStore.getState();
      expect(state.initialized).toBe(true);
    });
  });
});

describe('Selectors', () => {
  let mockState: AppState;

  beforeEach(() => {
    mockState = useAppStore.getState();
  });

  describe('hasOpenFile', () => {
    it('ファイルが開かれていない場合はfalseを返す', () => {
      const result = selectors.hasOpenFile(mockState);
      expect(result).toBe(false);
    });

    it('ファイルが開かれている場合はtrueを返す', () => {
      const stateWithFile = {
        ...mockState,
        file: {
          ...mockState.file,
          currentFile: '/test/file.json',
        },
      };
      
      const result = selectors.hasOpenFile(stateWithFile);
      expect(result).toBe(true);
    });
  });

  describe('isFileDirty', () => {
    it('ファイルが変更されていない場合はfalseを返す', () => {
      const result = selectors.isFileDirty(mockState);
      expect(result).toBe(false);
    });

    it('ファイルが変更されている場合はtrueを返す', () => {
      const stateWithDirtyFile = {
        ...mockState,
        file: {
          ...mockState.file,
          isDirty: true,
        },
      };
      
      const result = selectors.isFileDirty(stateWithDirtyFile);
      expect(result).toBe(true);
    });
  });

  describe('hasParseErrors', () => {
    it('パースエラーがない場合はfalseを返す', () => {
      const result = selectors.hasParseErrors(mockState);
      expect(result).toBe(false);
    });

    it('パースエラーがある場合はtrueを返す', () => {
      const stateWithErrors = {
        ...mockState,
        parse: {
          ...mockState.parse,
          parseErrors: [
            {
              line: 1,
              column: 1,
              message: 'テストエラー',
              severity: 'error' as const,
            },
          ],
        },
      };
      
      const result = selectors.hasParseErrors(stateWithErrors);
      expect(result).toBe(true);
    });
  });

  describe('getCurrentFileName', () => {
    it('ファイルが開かれていない場合はnullを返す', () => {
      const result = selectors.getCurrentFileName(mockState);
      expect(result).toBeNull();
    });

    it('ファイルが開かれている場合はファイル名を返す', () => {
      const stateWithFile = {
        ...mockState,
        file: {
          ...mockState.file,
          currentFile: '/path/to/test.json',
        },
      };
      
      const result = selectors.getCurrentFileName(stateWithFile);
      expect(result).toBe('test.json');
    });
  });

  describe('getErrorCount', () => {
    it('エラーがない場合は0を返す', () => {
      const result = selectors.getErrorCount(mockState);
      expect(result).toBe(0);
    });

    it('エラーがある場合は正しい数を返す', () => {
      const stateWithErrors = {
        ...mockState,
        parse: {
          ...mockState.parse,
          parseErrors: [
            { line: 1, column: 1, message: 'エラー1', severity: 'error' as const },
            { line: 2, column: 1, message: '警告1', severity: 'warning' as const },
            { line: 3, column: 1, message: 'エラー2', severity: 'error' as const },
          ],
        },
      };
      
      const result = selectors.getErrorCount(stateWithErrors);
      expect(result).toBe(2);
    });
  });

  describe('getWarningCount', () => {
    it('警告がない場合は0を返す', () => {
      const result = selectors.getWarningCount(mockState);
      expect(result).toBe(0);
    });

    it('警告がある場合は正しい数を返す', () => {
      const stateWithWarnings = {
        ...mockState,
        parse: {
          ...mockState.parse,
          parseErrors: [
            { line: 1, column: 1, message: 'エラー1', severity: 'error' as const },
            { line: 2, column: 1, message: '警告1', severity: 'warning' as const },
            { line: 3, column: 1, message: '警告2', severity: 'warning' as const },
          ],
        },
      };
      
      const result = selectors.getWarningCount(stateWithWarnings);
      expect(result).toBe(2);
    });
  });
});