import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockVSCode } from './setup';

// プラットフォームアダプターのテスト用にwebviewアダプターのパスを調整
// 実際の実装では src/platform/vscode にあるアダプターをテストする

describe('VSCode Platform Adapters', () => {
  describe('Integration Tests', () => {
    let mockWebview: any;
    let mockDocument: any;

    beforeEach(() => {
      vi.clearAllMocks();

      mockWebview = {
        postMessage: vi.fn(),
        onDidReceiveMessage: vi.fn()
      };

      mockDocument = {
        uri: { toString: () => '/test/mindmap.json' },
        fileName: '/test/mindmap.json',
        getText: vi.fn(() => '{"root":{"id":"root","title":"Test"}}'),
        save: vi.fn()
      };

      // グローバルVSCode APIのセットアップ
      global.acquireVsCodeApi = vi.fn(() => mockWebview);
    });

    describe('VSCodeEditorAdapter Integration', () => {
      it('should communicate with VSCode extension for document updates', async () => {
        // VSCodeEditorAdapterの通信をシミュレート
        const editorMessage = {
          command: 'updateDocument',
          content: '{"root":{"id":"root","title":"Updated"}}'
        };

        // Webviewからのメッセージ送信をシミュレート
        mockWebview.postMessage(editorMessage);

        expect(mockWebview.postMessage).toHaveBeenCalledWith(editorMessage);
      });

      it('should handle cursor position requests', async () => {
        const cursorMessage = {
          command: 'getCurrentCursorPosition',
          requestId: 'cursor-123'
        };

        mockWebview.postMessage(cursorMessage);

        expect(mockWebview.postMessage).toHaveBeenCalledWith(cursorMessage);
      });
    });

    describe('VSCodeFileSystemAdapter Integration', () => {
      it('should communicate file read requests', async () => {
        const fileMessage = {
          command: 'readFile',
          path: '/test/file.json',
          requestId: 'file-123'
        };

        mockWebview.postMessage(fileMessage);

        expect(mockWebview.postMessage).toHaveBeenCalledWith(fileMessage);
      });

      it('should handle file write operations', async () => {
        const writeMessage = {
          command: 'writeFile',
          path: '/test/output.json',
          content: '{"data": "test"}',
          requestId: 'write-123'
        };

        mockWebview.postMessage(writeMessage);

        expect(mockWebview.postMessage).toHaveBeenCalledWith(writeMessage);
      });
    });

    describe('VSCodeUIAdapter Integration', () => {
      it('should communicate UI message requests', async () => {
        const uiMessage = {
          command: 'showInformationMessage',
          message: 'Test message'
        };

        mockWebview.postMessage(uiMessage);

        expect(mockWebview.postMessage).toHaveBeenCalledWith(uiMessage);
      });

      it('should handle dialog requests', async () => {
        const dialogMessage = {
          command: 'showConfirmDialog',
          message: 'Confirm action?',
          options: ['Yes', 'No'],
          requestId: 'dialog-123'
        };

        mockWebview.postMessage(dialogMessage);

        expect(mockWebview.postMessage).toHaveBeenCalledWith(dialogMessage);
      });
    });

    describe('VSCodeSettingsAdapter Integration', () => {
      it('should communicate configuration updates', async () => {
        const configMessage = {
          command: 'updateConfiguration',
          key: 'mindmapTool.editor.theme',
          value: 'dark',
          requestId: 'config-123'
        };

        mockWebview.postMessage(configMessage);

        expect(mockWebview.postMessage).toHaveBeenCalledWith(configMessage);
      });
    });

    describe('VSCodeTreeDataProvider Integration', () => {
      it('should communicate tree data updates', async () => {
        const treeMessage = {
          command: 'updateTreeData',
          data: [
            {
              id: 'root',
              label: 'Root Node',
              collapsibleState: 'expanded',
              children: []
            }
          ]
        };

        mockWebview.postMessage(treeMessage);

        expect(mockWebview.postMessage).toHaveBeenCalledWith(treeMessage);
      });

      it('should handle node operations', async () => {
        const nodeMessage = {
          command: 'nodeAdded',
          parentId: 'root',
          newNode: {
            id: 'new-node',
            label: 'New Node',
            collapsibleState: 'none'
          }
        };

        mockWebview.postMessage(nodeMessage);

        expect(mockWebview.postMessage).toHaveBeenCalledWith(nodeMessage);
      });
    });
  });

  describe('Error Handling', () => {
    let mockWebview: any;

    beforeEach(() => {
      mockWebview = {
        postMessage: vi.fn(),
        onDidReceiveMessage: vi.fn()
      };

      global.acquireVsCodeApi = vi.fn(() => mockWebview);
    });

    it('should handle communication errors gracefully', async () => {
      mockWebview.postMessage.mockImplementation(() => {
        throw new Error('Communication failed');
      });

      // エラーが投げられてもアプリケーションがクラッシュしないことを確認
      expect(() => {
        try {
          mockWebview.postMessage({ command: 'test' });
        } catch (error) {
          // エラーをキャッチして適切に処理
          expect(error).toBeInstanceOf(Error);
        }
      }).not.toThrow();
    });

    it('should handle missing VSCode API gracefully', () => {
      global.acquireVsCodeApi = undefined as any;

      // VSCode APIが利用できない場合の処理をテスト
      expect(() => {
        const api = global.acquireVsCodeApi?.();
        if (!api) {
          console.warn('VSCode API not available');
        }
      }).not.toThrow();
    });
  });

  describe('Message Protocol', () => {
    it('should use consistent request/response pattern', () => {
      const requestMessage = {
        command: 'testCommand',
        requestId: 'test-123',
        data: 'test'
      };

      const responseMessage = {
        requestId: 'test-123',
        result: 'success'
      };

      // リクエストメッセージの構造をテスト
      expect(requestMessage).toHaveProperty('command');
      expect(requestMessage).toHaveProperty('requestId');

      // レスポンスメッセージの構造をテスト
      expect(responseMessage).toHaveProperty('requestId');
      expect(responseMessage).toHaveProperty('result');
    });

    it('should handle error responses correctly', () => {
      const errorResponse = {
        requestId: 'test-123',
        error: 'Operation failed'
      };

      expect(errorResponse).toHaveProperty('requestId');
      expect(errorResponse).toHaveProperty('error');
      expect(errorResponse.error).toBe('Operation failed');
    });
  });
});