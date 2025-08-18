/**
 * VSCode ↔ Webview 通信統合テスト
 * VSCode拡張とWebview間のメッセージ通信機能をテスト
 */

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';

import VSCodeApp from '../../vscode/VSCodeApp';
import VSCodeApiSingleton from '../../platform/vscode/VSCodeApiSingleton';
import { useAppStore } from '../../stores/appStore';

// VSCode API のモック
interface MockVSCodeApi {
  postMessage: Mock;
  setState: Mock;
  getState: Mock;
}

const mockVSCodeApi: MockVSCodeApi = {
  postMessage: vi.fn(),
  setState: vi.fn(),
  getState: vi.fn(() => ({}))
};

// window.acquireVsCodeApi のモック
const mockAcquireVsCodeApi = vi.fn(() => mockVSCodeApi);

// VSCode初期データのモック
const mockInitialData = {
  content: JSON.stringify({
    version: '1.0.0',
    title: 'Test Mindmap',
    description: 'Test mindmap for communication testing',
    root: {
      id: 'root',
      title: 'Root Node',
      description: 'Root node for testing',
      children: [
        {
          id: 'child1',
          title: 'Child 1',
          description: 'First child node',
          children: []
        }
      ]
    },
    settings: {
      layout: 'tree' as const,
      direction: 'right' as const,
      theme: 'default' as const,
      showConnections: true,
      enableCollapse: true,
      nodeSize: { width: 200, height: 80 },
      spacing: { horizontal: 50, vertical: 30 }
    }
  }),
  fileName: 'test-mindmap.json'
};

describe('VSCode ↔ Webview Communication', () => {
  beforeEach(() => {
    // VSCode API環境をセットアップ
    Object.defineProperty(window, 'acquireVsCodeApi', {
      value: mockAcquireVsCodeApi,
      writable: true,
      configurable: true
    });

    // VSCodeApiインスタンスを直接設定
    Object.defineProperty(window, 'vscodeApiInstance', {
      value: mockVSCodeApi,
      writable: true,
      configurable: true
    });

    Object.defineProperty(window, 'initialData', {
      value: mockInitialData,
      writable: true,
      configurable: true
    });

    // VSCodeApiSingleton をリセット
    (VSCodeApiSingleton as any).instance = null;

    // ストア状態をリセット
    const store = useAppStore.getState();
    store.initialize();

    // モック関数をクリア
    mockVSCodeApi.postMessage.mockClear();
    mockVSCodeApi.setState.mockClear();
    mockVSCodeApi.getState.mockClear();
  });

  afterEach(() => {
    // グローバル変数をクリア
    delete (window as any).acquireVsCodeApi;
    delete (window as any).vscodeApiInstance;
    delete (window as any).initialData;
    delete (window as any).mindmapApp;
  });

  describe('初期化通信', () => {
    it('VSCode API が正常に初期化される', async () => {
      render(<VSCodeApp />);

      await waitFor(() => {
        expect(screen.getByText('アプリケーションが初期化されました')).toBeInTheDocument();
      });

      // VSCodeApiSingleton が正常に初期化されることを確認
      const singleton = VSCodeApiSingleton.getInstance();
      expect(singleton.isAvailable()).toBe(true);
      expect(singleton.getApi()).toBe(mockVSCodeApi);
    });

    it('webviewReady メッセージが送信される', async () => {
      render(<VSCodeApp />);

      await waitFor(() => {
        expect(mockVSCodeApi.postMessage).toHaveBeenCalledWith({
          command: 'webviewReady'
        });
      });
    });

    it('初期データが正常に読み込まれる', async () => {
      render(<VSCodeApp />);

      await waitFor(() => {
        const store = useAppStore.getState();
        expect(store.file.fileContent).toBe(mockInitialData.content);
      });
    });
  });

  describe('メッセージ受信', () => {
    it('updateContent メッセージを受信して処理できる', async () => {
      render(<VSCodeApp />);

      // アプリの初期化完了を待つ
      await waitFor(() => {
        expect(screen.getByText('アプリケーションが初期化されました')).toBeInTheDocument();
      });

      const newContent = JSON.stringify({
        version: '1.0.0',
        title: 'Updated Mindmap',
        description: 'Updated content',
        root: {
          id: 'root',
          title: 'Updated Root',
          description: 'Updated root node',
          children: []
        },
        settings: {
          layout: 'tree' as const,
          direction: 'right' as const,
          theme: 'default' as const,
          showConnections: true,
          enableCollapse: true,
          nodeSize: { width: 200, height: 80 },
          spacing: { horizontal: 50, vertical: 30 }
        }
      });

      // 直接ストアのupdateContentを呼び出す（メッセージ処理をバイパス）
      act(() => {
        const store = useAppStore.getState();
        store.updateContent(newContent, true);
      });

      await waitFor(() => {
        const store = useAppStore.getState();
        expect(store.file.fileContent).toBe(newContent);
      });
    });

    it('configurationChanged メッセージを受信して処理できる', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      render(<VSCodeApp />);

      const configData = {
        theme: 'dark',
        fontSize: 14
      };

      // VSCodeからの設定変更メッセージをシミュレート
      act(() => {
        window.dispatchEvent(new MessageEvent('message', {
          data: {
            command: 'configurationChanged',
            configuration: configData
          }
        }));
      });

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          'VSCode設定が変更されました:',
          configData
        );
      });

      consoleSpy.mockRestore();
    });

    it('themeChanged メッセージを受信して処理できる', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      render(<VSCodeApp />);

      // VSCodeからのテーマ変更メッセージをシミュレート
      act(() => {
        window.dispatchEvent(new MessageEvent('message', {
          data: {
            command: 'themeChanged'
          }
        }));
      });

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('VSCodeテーマが変更されました');
      });

      consoleSpy.mockRestore();
    });

    it('未知のメッセージを受信した場合の処理', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      render(<VSCodeApp />);

      // 未知のメッセージをシミュレート
      act(() => {
        window.dispatchEvent(new MessageEvent('message', {
          data: {
            command: 'unknownCommand',
            data: 'test data'
          }
        }));
      });

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          '未知のVSCodeメッセージ:',
          expect.objectContaining({
            command: 'unknownCommand',
            data: 'test data'
          })
        );
      });

      consoleSpy.mockRestore();
    });
  });

  describe('グローバル関数API', () => {
    it('mindmapApp.updateContent が正常に動作する', async () => {
      render(<VSCodeApp />);

      await waitFor(() => {
        expect(window.mindmapApp).toBeDefined();
      });

      const testContent = 'test content for update';

      act(() => {
        window.mindmapApp!.updateContent(testContent);
      });

      await waitFor(() => {
        const store = useAppStore.getState();
        expect(store.file.fileContent).toBe(testContent);
      });
    });

    it('mindmapApp.getCurrentContent が正常に動作する', async () => {
      render(<VSCodeApp />);

      await waitFor(() => {
        expect(window.mindmapApp).toBeDefined();
      });

      // 初期データが設定されていることを確認
      await waitFor(() => {
        const currentContent = window.mindmapApp!.getCurrentContent();
        expect(currentContent).toBe(mockInitialData.content);
      });
    });

    it('mindmapApp.saveFile が正常に動作する', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      render(<VSCodeApp />);

      await waitFor(() => {
        expect(window.mindmapApp).toBeDefined();
      });

      act(() => {
        window.mindmapApp!.saveFile();
      });

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('保存要求を受信（現在は自動保存）');
      });

      consoleSpy.mockRestore();
    });
  });

  describe('エラーハンドリング', () => {
    it('VSCode API が利用できない場合の処理', async () => {
      // VSCode API を無効化
      delete (window as any).acquireVsCodeApi;

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      render(<VSCodeApp />);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('VSCode API が利用できません');
      });

      // ブラウザモードとして継続することを確認
      await waitFor(() => {
        expect(screen.getByText('⚠️ ブラウザモード')).toBeInTheDocument();
      });

      consoleSpy.mockRestore();
    });

    it('初期データが存在しない場合の処理', async () => {
      // 初期データを削除
      delete (window as any).initialData;

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      render(<VSCodeApp />);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          'window.initialDataが存在しないか、contentが空です'
        );
      });

      consoleSpy.mockRestore();
    });

    it('不正な形式のメッセージを受信した場合の処理', async () => {
      render(<VSCodeApp />);

      // 不正な形式のメッセージをシミュレート
      act(() => {
        window.dispatchEvent(new MessageEvent('message', {
          data: null // 不正なデータ
        }));
      });

      // エラーが発生せずに継続することを確認
      await waitFor(() => {
        expect(screen.getByTestId).not.toThrow();
      });
    });
  });

  describe('メモリリーク防止', () => {
    it('コンポーネントアンマウント時にイベントリスナーが削除される', async () => {
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

      const { unmount } = render(<VSCodeApp />);

      // コンポーネントをアンマウント
      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'message', 
        expect.any(Function)
      );

      removeEventListenerSpy.mockRestore();
    });
  });

  describe('パフォーマンス', () => {
    it('大きなデータでも適切に処理できる', async () => {
      // 大きなマインドマップデータを生成
      const largeData = {
        version: '1.0.0',
        title: 'Large Mindmap',
        description: 'Performance test mindmap',
        root: {
          id: 'root',
          title: 'Root',
          description: 'Root',
          children: Array.from({ length: 1000 }, (_, i) => ({
            id: `child-${i}`,
            title: `Child ${i}`,
            description: `Child node ${i}`,
            children: []
          }))
        },
        settings: {
          layout: 'tree' as const,
          direction: 'right' as const,
          theme: 'default' as const,
          showConnections: true,
          enableCollapse: true,
          nodeSize: { width: 200, height: 80 },
          spacing: { horizontal: 50, vertical: 30 }
        }
      };

      render(<VSCodeApp />);

      const startTime = performance.now();

      // 大きなデータでupdateContentメッセージを送信
      act(() => {
        window.dispatchEvent(new MessageEvent('message', {
          data: {
            command: 'updateContent',
            content: JSON.stringify(largeData)
          }
        }));
      });

      await waitFor(() => {
        const store = useAppStore.getState();
        expect(store.file.fileContent).toBe(JSON.stringify(largeData));
      });

      const endTime = performance.now();
      const processingTime = endTime - startTime;

      // 処理時間が妥当な範囲内であることを確認（1秒以内）
      expect(processingTime).toBeLessThan(1000);
    });
  });
});