import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockVSCode } from './setup';
import { MindmapEditorProvider } from '../MindmapEditorProvider';
import type { MockExtensionContext, MockTextDocument, MockWebviewPanel } from './types';
import * as vscode from 'vscode';

describe('MindmapEditorProvider', () => {
  let provider: MindmapEditorProvider;
  let mockContext: MockExtensionContext;
  let mockDocument: MockTextDocument;
  let mockWebviewPanel: MockWebviewPanel;

  beforeEach(() => {
    vi.clearAllMocks();

    mockContext = {
      extensionUri: { 
        fsPath: '/test/extension', 
        toString: () => '/test/extension',
        scheme: 'file',
        path: '/test/extension'
      },
      subscriptions: []
    };

    mockDocument = {
      uri: { toString: () => '/test/mindmap.json' },
      fileName: '/test/mindmap.json',
      getText: vi.fn(() => '{"root":{"id":"root","title":"Test"}}'),
      save: vi.fn(),
      positionAt: vi.fn((pos) => ({ line: 0, character: pos }))
    };

    mockWebviewPanel = {
      webview: {
        options: {},
        postMessage: vi.fn(),
        onDidReceiveMessage: vi.fn(),
        asWebviewUri: vi.fn((uri) => ({ 
          toString: () => `vscode-webview://webview/${uri?.toString?.() || uri}`,
          fsPath: `vscode-webview://webview/${uri?.toString?.() || uri}`,
          scheme: 'vscode-webview'
        })),
        html: ''
      },
      onDidDispose: vi.fn()
    };

    provider = new MindmapEditorProvider(mockContext);
  });

  describe('resolveCustomTextEditor', () => {
    it('should initialize webview panel correctly', async () => {
      const mockToken: vscode.CancellationToken = { isCancellationRequested: false, onCancellationRequested: vi.fn() };

      await provider.resolveCustomTextEditor(mockDocument, mockWebviewPanel, mockToken);

      // Webviewのオプションが設定されていることを確認
      expect(mockWebviewPanel.webview.options).toEqual({
        enableScripts: true,
        localResourceRoots: [
          expect.objectContaining({
            fsPath: expect.stringContaining('/test/extension')
          }),
          expect.objectContaining({
            fsPath: expect.stringContaining('/test/extension')
          })
        ]
      });
    });

    it('should set up message handling', async () => {
      const mockToken: vscode.CancellationToken = { isCancellationRequested: false, onCancellationRequested: vi.fn() };

      await provider.resolveCustomTextEditor(mockDocument, mockWebviewPanel, mockToken);

      // メッセージハンドラーが設定されていることを確認
      expect(mockWebviewPanel.webview.onDidReceiveMessage).toHaveBeenCalled();
    });

    it('should set up document change monitoring', async () => {
      const mockToken: vscode.CancellationToken = { isCancellationRequested: false, onCancellationRequested: vi.fn() };

      await provider.resolveCustomTextEditor(mockDocument, mockWebviewPanel, mockToken);

      // ドキュメント変更の監視が設定されていることを確認
      expect(mockVSCode.workspace.onDidChangeTextDocument).toHaveBeenCalled();
      expect(mockVSCode.workspace.onDidChangeConfiguration).toHaveBeenCalled();
      expect(mockVSCode.window.onDidChangeActiveColorTheme).toHaveBeenCalled();
    });

    it('should send initial content and configuration', async () => {
      vi.useFakeTimers();
      const mockToken: vscode.CancellationToken = { isCancellationRequested: false, onCancellationRequested: vi.fn() };

      await provider.resolveCustomTextEditor(mockDocument, mockWebviewPanel, mockToken);

      // setTimeout をトリガー
      vi.advanceTimersByTime(100);

      expect(mockWebviewPanel.webview.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          command: 'updateContent',
          content: expect.any(String),
          fileName: mockDocument.fileName,
          uri: mockDocument.uri.toString()
        })
      );

      expect(mockWebviewPanel.webview.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          command: 'configurationChanged',
          configuration: expect.any(Object)
        })
      );

      vi.useRealTimers();
    });
  });

  describe('Message Handling', () => {
    beforeEach(async () => {
      const mockToken = { isCancellationRequested: false };
      await provider.resolveCustomTextEditor(mockDocument, mockWebviewPanel, mockToken as any);
    });

    it('should handle webviewReady message', async () => {
      const messageHandler = mockWebviewPanel.webview.onDidReceiveMessage.mock.calls[0][0];

      // postMessageのcallsをクリア
      mockWebviewPanel.webview.postMessage.mockClear();

      await messageHandler({ command: 'webviewReady' });

      // webviewReadyメッセージは updateWebviewContent と updateWebviewConfiguration を呼び出す
      expect(mockWebviewPanel.webview.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          command: 'updateContent'
        })
      );
      expect(mockWebviewPanel.webview.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          command: 'configurationChanged'
        })
      );
    });

    it('should handle updateDocument message', async () => {
      const messageHandler = mockWebviewPanel.webview.onDidReceiveMessage.mock.calls[0][0];
      
      // WorkspaceEditのモック
      const mockEdit = {
        replace: vi.fn()
      };
      mockVSCode.WorkspaceEdit.mockReturnValue(mockEdit);
      mockVSCode.Range.mockReturnValue({});
      mockVSCode.workspace.applyEdit.mockResolvedValue(true);

      await messageHandler({
        command: 'updateDocument',
        content: '{"root":{"id":"root","title":"Updated"}}'
      });

      expect(mockVSCode.workspace.applyEdit).toHaveBeenCalled();
    });

    it('should handle showError message', async () => {
      const messageHandler = mockWebviewPanel.webview.onDidReceiveMessage.mock.calls[0][0];

      await messageHandler({
        command: 'showError',
        message: 'Test error message'
      });

      expect(mockVSCode.window.showErrorMessage).toHaveBeenCalledWith('Test error message');
    });

    it('should handle saveDocument message', async () => {
      const messageHandler = mockWebviewPanel.webview.onDidReceiveMessage.mock.calls[0][0];

      await messageHandler({ command: 'saveDocument' });

      expect(mockDocument.save).toHaveBeenCalled();
    });

    it('should handle showWarning message', async () => {
      const messageHandler = mockWebviewPanel.webview.onDidReceiveMessage.mock.calls[0][0];

      await messageHandler({
        command: 'showWarning',
        message: 'Test warning message'
      });

      expect(mockVSCode.window.showWarningMessage).toHaveBeenCalledWith('Test warning message');
    });

    it('should handle showInformation message', async () => {
      const messageHandler = mockWebviewPanel.webview.onDidReceiveMessage.mock.calls[0][0];

      await messageHandler({
        command: 'showInformation',
        message: 'Test info message'
      });

      expect(mockVSCode.window.showInformationMessage).toHaveBeenCalledWith('Test info message');
    });

    it('should handle getInitialConfiguration message', async () => {
      const messageHandler = mockWebviewPanel.webview.onDidReceiveMessage.mock.calls[0][0];

      // postMessageのcallsをクリア
      mockWebviewPanel.webview.postMessage.mockClear();

      await messageHandler({ command: 'getInitialConfiguration' });

      expect(mockWebviewPanel.webview.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          command: 'configurationChanged'
        })
      );
    });

    it('should handle exportMindmap message', async () => {
      const messageHandler = mockWebviewPanel.webview.onDidReceiveMessage.mock.calls[0][0];

      await messageHandler({
        command: 'exportMindmap',
        format: 'png'
      });

      expect(mockVSCode.window.showInformationMessage).toHaveBeenCalledWith('エクスポート機能は準備中です');
    });

    it('should handle unknown command', async () => {
      const messageHandler = mockWebviewPanel.webview.onDidReceiveMessage.mock.calls[0][0];
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await messageHandler({
        command: 'unknownCommand',
        data: 'test'
      });

      expect(consoleSpy).toHaveBeenCalledWith('未知のWebviewメッセージ:', expect.objectContaining({
        command: 'unknownCommand'
      }));

      consoleSpy.mockRestore();
    });

    it('should handle message processing errors', async () => {
      const messageHandler = mockWebviewPanel.webview.onDidReceiveMessage.mock.calls[0][0];
      
      // mockDocumentのsaveメソッドがエラーを投げるようにモック
      mockDocument.save.mockRejectedValue(new Error('Save failed'));

      await messageHandler({ command: 'saveDocument' });

      expect(mockVSCode.window.showErrorMessage).toHaveBeenCalledWith(
        expect.stringContaining('メッセージ処理エラー: Save failed')
      );
    });
  });

  describe('Adapter Message Handling', () => {
    beforeEach(async () => {
      const mockToken = { isCancellationRequested: false };
      await provider.resolveCustomTextEditor(mockDocument, mockWebviewPanel, mockToken as any);
    });

    it('should handle editor adapter messages', async () => {
      const messageHandler = mockWebviewPanel.webview.onDidReceiveMessage.mock.calls[0][0];

      // postMessageのcallsをクリア
      mockWebviewPanel.webview.postMessage.mockClear();

      await messageHandler({
        command: 'getCurrentCursorPosition',
        requestId: 'test-123'
      });

      expect(mockWebviewPanel.webview.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          requestId: 'test-123',
          result: expect.objectContaining({
            line: expect.any(Number),
            column: expect.any(Number)
          })
        })
      );
    });

    it('should handle file system adapter messages', async () => {
      const messageHandler = mockWebviewPanel.webview.onDidReceiveMessage.mock.calls[0][0];

      // postMessageのcallsをクリア
      mockWebviewPanel.webview.postMessage.mockClear();
      mockVSCode.workspace.fs.readFile.mockResolvedValue(Buffer.from('test content'));

      await messageHandler({
        command: 'readFile',
        requestId: 'test-456',
        path: '/test/file.txt'
      });

      expect(mockVSCode.workspace.fs.readFile).toHaveBeenCalledWith(
        expect.anything() // vscode.Uri.file の結果
      );

      expect(mockWebviewPanel.webview.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          requestId: 'test-456',
          result: 'test content'
        })
      );
    });

    it('should handle UI adapter messages', async () => {
      const messageHandler = mockWebviewPanel.webview.onDidReceiveMessage.mock.calls[0][0];

      await messageHandler({
        command: 'showInformationMessage',
        message: 'Test info message'
      });

      expect(mockVSCode.window.showInformationMessage).toHaveBeenCalledWith('Test info message');
    });

    it('should handle settings adapter messages', async () => {
      const messageHandler = mockWebviewPanel.webview.onDidReceiveMessage.mock.calls[0][0];

      // postMessageのcallsをクリア
      mockWebviewPanel.webview.postMessage.mockClear();

      const mockConfig = {
        get: vi.fn(),
        update: vi.fn()
      };
      mockVSCode.workspace.getConfiguration.mockReturnValue(mockConfig);

      await messageHandler({
        command: 'updateConfiguration',
        requestId: 'test-789',
        key: 'editor.theme',
        value: 'dark'
      });

      expect(mockConfig.update).toHaveBeenCalledWith(
        'editor.theme',
        'dark',
        mockVSCode.ConfigurationTarget.Global
      );

      expect(mockWebviewPanel.webview.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          requestId: 'test-789',
          result: { success: true }
        })
      );
    });

    it('should handle setCursorPosition message', async () => {
      const messageHandler = mockWebviewPanel.webview.onDidReceiveMessage.mock.calls[0][0];
      
      const mockEditor = {
        document: { uri: { toString: () => mockDocument.uri.toString() } },
        selection: undefined,
        revealRange: vi.fn()
      };
      (mockVSCode.window as typeof vscode.window).visibleTextEditors = [mockEditor];
      mockVSCode.Position.mockImplementation((line, character) => ({ line, character }));
      mockVSCode.Selection.mockImplementation((start, end) => ({ start, end }));
      mockVSCode.Range.mockImplementation((start, end) => ({ start, end }));

      // postMessageのcallsをクリア
      mockWebviewPanel.webview.postMessage.mockClear();

      await messageHandler({
        command: 'setCursorPosition',
        requestId: 'test-cursor',
        line: 5,
        column: 10
      });

      expect(mockVSCode.Position).toHaveBeenCalledWith(5, 10);
      expect(mockEditor.revealRange).toHaveBeenCalled();
      expect(mockWebviewPanel.webview.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          requestId: 'test-cursor',
          result: { success: true }
        })
      );
    });

    it('should handle highlightRange message', async () => {
      const messageHandler = mockWebviewPanel.webview.onDidReceiveMessage.mock.calls[0][0];
      
      const mockEditor = {
        document: { uri: { toString: () => mockDocument.uri.toString() } },
        selection: undefined,
        revealRange: vi.fn()
      };
      (mockVSCode.window as typeof vscode.window).visibleTextEditors = [mockEditor];

      await messageHandler({
        command: 'highlightRange',
        requestId: 'test-highlight',
        startLine: 1,
        endLine: 3,
        startColumn: 0,
        endColumn: 5
      });

      expect(mockVSCode.Position).toHaveBeenCalledWith(1, 0);
      expect(mockVSCode.Position).toHaveBeenCalledWith(3, 5);
      expect(mockEditor.revealRange).toHaveBeenCalled();
    });

    it('should handle writeFile message', async () => {
      const messageHandler = mockWebviewPanel.webview.onDidReceiveMessage.mock.calls[0][0];
      
      mockVSCode.workspace.fs.writeFile.mockResolvedValue(undefined);
      mockVSCode.Uri.file.mockReturnValue({ scheme: 'file', path: '/test/file.txt', fsPath: '/test/file.txt', toString: () => '/test/file.txt' });

      await messageHandler({
        command: 'writeFile',
        requestId: 'test-write',
        path: '/test/file.txt',
        content: 'test content'
      });

      expect(mockVSCode.workspace.fs.writeFile).toHaveBeenCalled();
      expect(mockWebviewPanel.webview.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          requestId: 'test-write',
          result: { success: true }
        })
      );
    });

    it('should handle exists message', async () => {
      const messageHandler = mockWebviewPanel.webview.onDidReceiveMessage.mock.calls[0][0];
      
      mockVSCode.workspace.fs.stat.mockResolvedValue({});
      mockVSCode.Uri.file.mockReturnValue({ scheme: 'file', path: '/test/file.txt', fsPath: '/test/file.txt', toString: () => '/test/file.txt' });

      await messageHandler({
        command: 'exists',
        requestId: 'test-exists',
        path: '/test/file.txt'
      });

      expect(mockVSCode.workspace.fs.stat).toHaveBeenCalled();
      expect(mockWebviewPanel.webview.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          requestId: 'test-exists',
          result: true
        })
      );
    });

    it('should handle showConfirmDialog message', async () => {
      const messageHandler = mockWebviewPanel.webview.onDidReceiveMessage.mock.calls[0][0];
      
      mockVSCode.window.showQuickPick.mockResolvedValue('Yes');

      await messageHandler({
        command: 'showConfirmDialog',
        requestId: 'test-confirm',
        message: 'Are you sure?',
        options: ['Yes', 'No']
      });

      expect(mockVSCode.window.showQuickPick).toHaveBeenCalledWith(
        ['Yes', 'No'],
        { placeHolder: 'Are you sure?' }
      );
      expect(mockWebviewPanel.webview.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          requestId: 'test-confirm',
          result: 'Yes'
        })
      );
    });

    it('should handle showStatusBarMessage message', async () => {
      const messageHandler = mockWebviewPanel.webview.onDidReceiveMessage.mock.calls[0][0];

      await messageHandler({
        command: 'showStatusBarMessage',
        message: 'Status message',
        timeout: 5000
      });

      expect(mockVSCode.window.setStatusBarMessage).toHaveBeenCalledWith('Status message', 5000);
    });

    it('should handle adapter ready messages', async () => {
      const messageHandler = mockWebviewPanel.webview.onDidReceiveMessage.mock.calls[0][0];
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await messageHandler({ command: 'editorAdapterReady' });
      await messageHandler({ command: 'fileSystemAdapterReady' });
      await messageHandler({ command: 'uiAdapterReady' });
      await messageHandler({ command: 'treeDataProviderReady' });

      expect(consoleSpy).toHaveBeenCalledWith('EditorAdapter初期化完了');
      expect(consoleSpy).toHaveBeenCalledWith('FileSystemAdapter初期化完了');
      expect(consoleSpy).toHaveBeenCalledWith('UIAdapter初期化完了');
      expect(consoleSpy).toHaveBeenCalledWith('TreeDataProvider初期化完了');

      consoleSpy.mockRestore();
    });

    it('should handle settingsAdapterReady message', async () => {
      const messageHandler = mockWebviewPanel.webview.onDidReceiveMessage.mock.calls[0][0];
      
      // postMessageのcallsをクリア
      mockWebviewPanel.webview.postMessage.mockClear();

      await messageHandler({ command: 'settingsAdapterReady' });

      // settingsAdapterReadyはhandleAdapterMessagesで処理されるため、適切なメッセージが送信されることを確認
      expect(mockWebviewPanel.webview.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          command: 'initialConfiguration'
        })
      );
    });

    it('should handle adapter message errors', async () => {
      const messageHandler = mockWebviewPanel.webview.onDidReceiveMessage.mock.calls[0][0];
      
      // readFileでエラーを発生させる
      mockVSCode.workspace.fs.readFile.mockRejectedValue(new Error('File not found'));
      mockVSCode.Uri.file.mockReturnValue({ scheme: 'file', path: '/test/missing.txt', fsPath: '/test/missing.txt', toString: () => '/test/missing.txt' });

      await messageHandler({
        command: 'readFile',
        requestId: 'test-error',
        path: '/test/missing.txt'
      });

      expect(mockWebviewPanel.webview.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          requestId: 'test-error',
          error: expect.stringContaining('ファイル読み込みエラー')
        })
      );
    });
  });

  describe('Configuration Management', () => {
    it('should return correct configuration structure', async () => {
      const mockConfig = {
        get: vi.fn((key, defaultValue) => {
          const configs: Record<string, any> = {
            'editor.theme': 'vs-dark',
            'editor.fontSize': 14,
            'mindmap.layout': 'tree',
            'mindmap.theme': 'auto',
            'validation.enabled': true,
            'validation.showWarnings': true,
            'autoSave.enabled': true,
            'autoSave.delay': 1000
          };
          return configs[key] || defaultValue;
        }),
        update: vi.fn()
      };

      mockVSCode.workspace.getConfiguration.mockReturnValue(mockConfig);

      const mockToken = { isCancellationRequested: false };
      
      // getConfiguration呼び出しをクリア
      mockVSCode.workspace.getConfiguration.mockClear();
      
      await provider.resolveCustomTextEditor(mockDocument, mockWebviewPanel, mockToken as any);

      // setTimeout内で設定が呼ばれるのを待つ
      await new Promise(resolve => setTimeout(resolve, 150));

      // getConfiguration が呼ばれたことを確認
      expect(mockVSCode.workspace.getConfiguration).toHaveBeenCalledWith('mindmapTool');
      // 設定値が取得されたことを確認
      expect(mockConfig.get).toHaveBeenCalledWith('editor.theme', 'vs-dark');
      expect(mockConfig.get).toHaveBeenCalledWith('mindmap.layout', 'tree');
    });
  });
});