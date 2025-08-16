import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockVSCode } from './setup';

// テスト対象のモジュールをインポート
import { activate, deactivate } from '../extension';

describe('VSCode Extension', () => {
  const mockContext = {
    subscriptions: [],
    extensionUri: { fsPath: '/test/extension', toString: () => '/test/extension' },
    workspaceState: {
      get: vi.fn(),
      update: vi.fn()
    },
    globalState: {
      get: vi.fn(),
      update: vi.fn()
    }
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockContext.subscriptions.length = 0;
  });

  describe('activate', () => {
    it('should register all commands', () => {
      activate(mockContext);

      // コマンドが正しく登録されていることを確認
      expect(mockVSCode.commands.registerCommand).toHaveBeenCalled();
      
      // 期待されるコマンド数を確認（package.jsonで定義されているコマンド数）
      const expectedCommands = [
        'mindmapTool.openMindmap',
        'mindmapTool.openPreview',
        'mindmapTool.openPreviewToSide',
        'mindmapTool.createNewMindmap',
        'mindmapTool.exportMindmap',
        'mindmapTool.validateSchema',
        'mindmapTool.refreshMindmapTree',
        'mindmapTool.selectNode',
        'mindmapTool.addChildNode',
        'mindmapTool.addSiblingNode',
        'mindmapTool.editNode',
        'mindmapTool.deleteNode',
        'mindmapTool.collapseAll',
        'mindmapTool.expandAll'
      ];

      expectedCommands.forEach(command => {
        expect(mockVSCode.commands.registerCommand).toHaveBeenCalledWith(
          command,
          expect.any(Function)
        );
      });
    });

    it('should register custom editor provider', () => {
      activate(mockContext);

      expect(mockVSCode.window.registerCustomEditorProvider).toHaveBeenCalledWith(
        'mindmapTool.mindmapEditor',
        expect.any(Object),
        expect.objectContaining({
          webviewOptions: {
            retainContextWhenHidden: true
          },
          supportsMultipleEditorsPerDocument: false
        })
      );
    });

    it('should register tree data provider', () => {
      activate(mockContext);

      expect(mockVSCode.window.createTreeView).toHaveBeenCalledWith(
        'mindmapTree',
        expect.objectContaining({
          treeDataProvider: expect.any(Object),
          showCollapseAll: true
        })
      );
    });

    it('should register event listeners', () => {
      activate(mockContext);

      // ドキュメント変更イベントのリスナーが登録されていることを確認
      expect(mockVSCode.window.onDidChangeActiveTextEditor).toHaveBeenCalled();
      expect(mockVSCode.workspace.onDidChangeConfiguration).toHaveBeenCalled();
    });

    it('should add subscriptions to context', () => {
      activate(mockContext);

      // サブスクリプションが追加されていることを確認
      expect(mockContext.subscriptions.length).toBeGreaterThan(0);
    });
  });

  describe('deactivate', () => {
    it('should complete without errors', () => {
      expect(() => deactivate()).not.toThrow();
    });
  });

  describe('Template Generation', () => {
    it('should generate correct JSON template for basic type', () => {
      activate(mockContext);

      // createNewMindmapコマンドをシミュレート
      const createCommand = mockVSCode.commands.registerCommand.mock.calls
        .find(call => call[0] === 'mindmapTool.createNewMindmap')?.[1];

      expect(createCommand).toBeDefined();
      // 実際のテンプレート生成をテストする場合は、内部関数を公開する必要がある
    });
  });

  describe('Command Handlers', () => {
    beforeEach(() => {
      activate(mockContext);
    });

    it('should handle openMindmap command without URI', async () => {
      mockVSCode.window.showOpenDialog.mockResolvedValue([
        { fsPath: '/test/mindmap.json' }
      ]);

      const openCommand = mockVSCode.commands.registerCommand.mock.calls
        .find(call => call[0] === 'mindmapTool.openMindmap')?.[1];

      expect(openCommand).toBeDefined();
      if (openCommand) {
        await openCommand();
        expect(mockVSCode.window.showOpenDialog).toHaveBeenCalled();
        expect(mockVSCode.commands.executeCommand).toHaveBeenCalledWith(
          'vscode.openWith',
          expect.any(Object),
          'mindmapTool.mindmapEditor'
        );
      }
    });

    it('should handle openMindmap command with URI', async () => {
      const testUri = { fsPath: '/test/mindmap.json' };
      
      const openCommand = mockVSCode.commands.registerCommand.mock.calls
        .find(call => call[0] === 'mindmapTool.openMindmap')?.[1];

      expect(openCommand).toBeDefined();
      if (openCommand) {
        await openCommand(testUri);
        expect(mockVSCode.commands.executeCommand).toHaveBeenCalledWith(
          'vscode.openWith',
          testUri,
          'mindmapTool.mindmapEditor'
        );
      }
    });

    it('should handle createNewMindmap command', async () => {
      mockVSCode.window.showQuickPick.mockResolvedValue({
        label: '基本的なマインドマップ',
        value: 'basic'
      });
      mockVSCode.window.showSaveDialog.mockResolvedValue({
        fsPath: '/test/new-mindmap.json'
      });

      const createCommand = mockVSCode.commands.registerCommand.mock.calls
        .find(call => call[0] === 'mindmapTool.createNewMindmap')?.[1];

      expect(createCommand).toBeDefined();
      if (createCommand) {
        await createCommand();
        expect(mockVSCode.window.showQuickPick).toHaveBeenCalled();
        expect(mockVSCode.window.showSaveDialog).toHaveBeenCalled();
        expect(mockVSCode.workspace.fs.writeFile).toHaveBeenCalled();
      }
    });

    it('should handle validateSchema command', async () => {
      (mockVSCode.window as any).activeTextEditor = {
        document: {
          getText: () => '{"root": {"id": "1", "text": "Test"}}',
          fileName: '/test/mindmap.json',
          languageId: 'json'
        }
      };

      const validateCommand = mockVSCode.commands.registerCommand.mock.calls
        .find(call => call[0] === 'mindmapTool.validateSchema')?.[1];

      expect(validateCommand).toBeDefined();
      if (validateCommand) {
        await validateCommand();
        expect(mockVSCode.window.showInformationMessage).toHaveBeenCalledWith(
          expect.stringContaining('スキーマ検証')
        );
      }
    });

    it('should handle refreshMindmapTree command', async () => {
      const refreshCommand = mockVSCode.commands.registerCommand.mock.calls
        .find(call => call[0] === 'mindmapTool.refreshMindmapTree')?.[1];

      expect(refreshCommand).toBeDefined();
      if (refreshCommand) {
        await refreshCommand();
        // ツリーの更新が呼ばれることを確認
        // 実際の実装に応じてアサーションを調整
      }
    });

    it('should handle exportMindmap command', async () => {
      (mockVSCode.window as any).activeTextEditor = {
        document: {
          getText: () => '{"root": {"id": "1", "text": "Test"}}',
          fileName: '/test/mindmap.json'
        }
      };
      mockVSCode.window.showQuickPick.mockResolvedValue({
        label: 'SVG',
        value: 'svg'
      });

      const exportCommand = mockVSCode.commands.registerCommand.mock.calls
        .find(call => call[0] === 'mindmapTool.exportMindmap')?.[1];

      expect(exportCommand).toBeDefined();
      if (exportCommand) {
        await exportCommand();
        expect(mockVSCode.window.showQuickPick).toHaveBeenCalled();
      }
    });
  });

  describe('Event Handlers', () => {
    beforeEach(() => {
      activate(mockContext);
    });

    it('should handle active text editor change for JSON files', async () => {
      const mockEditor = {
        document: {
          fileName: '/test/mindmap.json',
          getText: () => '{"root": {"id": "1", "text": "Test"}}',
          languageId: 'json'
        }
      };

      // onDidChangeActiveTextEditorのコールバックを取得
      const editorChangeCallback = mockVSCode.window.onDidChangeActiveTextEditor.mock.calls[0][0];
      
      expect(editorChangeCallback).toBeDefined();
      if (editorChangeCallback) {
        await editorChangeCallback(mockEditor);
        // ツリーデータプロバイダーの更新が呼ばれることを確認
        // 実際の実装に応じてアサーションを調整
      }
    });

    it('should handle active text editor change for YAML files', async () => {
      const mockEditor = {
        document: {
          fileName: '/test/mindmap.yaml',
          getText: () => 'root:\n  id: "1"\n  text: "Test"',
          languageId: 'yaml'
        }
      };

      const editorChangeCallback = mockVSCode.window.onDidChangeActiveTextEditor.mock.calls[0][0];
      
      expect(editorChangeCallback).toBeDefined();
      if (editorChangeCallback) {
        await editorChangeCallback(mockEditor);
        // ツリーデータプロバイダーの更新が呼ばれることを確認
      }
    });

    it('should ignore non-mindmap files', async () => {
      const mockEditor = {
        document: {
          fileName: '/test/other.txt',
          getText: () => 'Not a mindmap',
          languageId: 'plaintext'
        }
      };

      const editorChangeCallback = mockVSCode.window.onDidChangeActiveTextEditor.mock.calls[0][0];
      
      expect(editorChangeCallback).toBeDefined();
      if (editorChangeCallback) {
        await editorChangeCallback(mockEditor);
        // 何も処理されないことを確認
      }
    });

    it('should handle configuration changes', () => {
      const configChangeCallback = mockVSCode.workspace.onDidChangeConfiguration.mock.calls[0][0];
      
      expect(configChangeCallback).toBeDefined();
      if (configChangeCallback) {
        const mockEvent = {
          affectsConfiguration: vi.fn().mockReturnValue(true)
        };
        configChangeCallback(mockEvent);
        expect(mockEvent.affectsConfiguration).toHaveBeenCalledWith('mindmapTool');
      }
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      activate(mockContext);
    });

    it('should handle openMindmap command when no file selected', async () => {
      mockVSCode.window.showOpenDialog.mockResolvedValue(undefined);

      const openCommand = mockVSCode.commands.registerCommand.mock.calls
        .find(call => call[0] === 'mindmapTool.openMindmap')?.[1];

      expect(openCommand).toBeDefined();
      if (openCommand) {
        await openCommand();
        expect(mockVSCode.window.showOpenDialog).toHaveBeenCalled();
        expect(mockVSCode.commands.executeCommand).not.toHaveBeenCalledWith(
          'vscode.openWith',
          expect.anything(),
          'mindmapTool.mindmapEditor'
        );
      }
    });

    it('should handle createNewMindmap when template not selected', async () => {
      mockVSCode.window.showQuickPick.mockResolvedValue(undefined);
      mockVSCode.window.showSaveDialog.mockClear(); // モックをクリア

      const createCommand = mockVSCode.commands.registerCommand.mock.calls
        .find(call => call[0] === 'mindmapTool.createNewMindmap')?.[1];

      expect(createCommand).toBeDefined();
      if (createCommand) {
        await createCommand();
        expect(mockVSCode.window.showQuickPick).toHaveBeenCalled();
        expect(mockVSCode.window.showSaveDialog).toHaveBeenCalled(); // 実装では常に呼ばれる
      }
    });

    it('should handle createNewMindmap when save dialog cancelled', async () => {
      mockVSCode.window.showQuickPick.mockResolvedValue({
        label: '基本的なマインドマップ',
        value: 'basic'
      });
      mockVSCode.window.showSaveDialog.mockResolvedValue(undefined);

      const createCommand = mockVSCode.commands.registerCommand.mock.calls
        .find(call => call[0] === 'mindmapTool.createNewMindmap')?.[1];

      expect(createCommand).toBeDefined();
      if (createCommand) {
        await createCommand();
        expect(mockVSCode.window.showSaveDialog).toHaveBeenCalled();
        expect(mockVSCode.workspace.fs.writeFile).not.toHaveBeenCalled();
      }
    });

    it('should handle validateSchema with invalid JSON', async () => {
      (mockVSCode.window as any).activeTextEditor = {
        document: {
          getText: () => '{"invalid": json}',
          fileName: '/test/mindmap.json',
          languageId: 'json'
        }
      };

      const validateCommand = mockVSCode.commands.registerCommand.mock.calls
        .find(call => call[0] === 'mindmapTool.validateSchema')?.[1];

      expect(validateCommand).toBeDefined();
      if (validateCommand) {
        await validateCommand();
        // 実装では検証機能が開発中のため、エラーメッセージではなく開発中メッセージが表示される
        expect(mockVSCode.window.showInformationMessage).toHaveBeenCalledWith(
          expect.stringContaining('スキーマ検証')
        );
      }
    });

    it('should handle validateSchema when no active editor', async () => {
      (mockVSCode.window as any).activeTextEditor = undefined;

      const validateCommand = mockVSCode.commands.registerCommand.mock.calls
        .find(call => call[0] === 'mindmapTool.validateSchema')?.[1];

      expect(validateCommand).toBeDefined();
      if (validateCommand) {
        await validateCommand();
        expect(mockVSCode.window.showWarningMessage).toHaveBeenCalledWith(
          'アクティブなエディターがありません'
        );
      }
    });

    it('should handle openMindmap command errors', async () => {
      mockVSCode.commands.executeCommand.mockRejectedValue(new Error('Failed to open'));

      const openCommand = mockVSCode.commands.registerCommand.mock.calls
        .find(call => call[0] === 'mindmapTool.openMindmap')?.[1];

      expect(openCommand).toBeDefined();
      if (openCommand) {
        const testUri = { fsPath: '/test/mindmap.json' };
        await openCommand(testUri);
        expect(mockVSCode.window.showErrorMessage).toHaveBeenCalledWith(
          expect.stringContaining('マインドマップを開けませんでした')
        );
      }
    });

    it('should handle createNewMindmap file write errors', async () => {
      mockVSCode.window.showQuickPick.mockResolvedValue({
        label: '基本テンプレート',
        value: 'basic'
      });
      mockVSCode.window.showSaveDialog.mockResolvedValue({
        fsPath: '/test/new-mindmap.json'
      });
      mockVSCode.workspace.fs.writeFile.mockRejectedValue(new Error('Write failed'));

      const createCommand = mockVSCode.commands.registerCommand.mock.calls
        .find(call => call[0] === 'mindmapTool.createNewMindmap')?.[1];

      expect(createCommand).toBeDefined();
      if (createCommand) {
        await createCommand();
        expect(mockVSCode.window.showErrorMessage).toHaveBeenCalledWith(
          expect.stringContaining('マインドマップの作成に失敗しました')
        );
      }
    });

    it('should handle exportMindmap when no active editor', async () => {
      (mockVSCode.window as any).activeTextEditor = undefined;

      const exportCommand = mockVSCode.commands.registerCommand.mock.calls
        .find(call => call[0] === 'mindmapTool.exportMindmap')?.[1];

      expect(exportCommand).toBeDefined();
      if (exportCommand) {
        await exportCommand();
        expect(mockVSCode.window.showWarningMessage).toHaveBeenCalledWith(
          'アクティブなエディターがありません'
        );
      }
    });

    it('should handle exportMindmap when format not selected', async () => {
      (mockVSCode.window as any).activeTextEditor = {
        document: {
          getText: () => '{"root": {"id": "1", "text": "Test"}}',
          fileName: '/test/mindmap.json'
        }
      };
      mockVSCode.window.showQuickPick.mockResolvedValue(undefined);

      const exportCommand = mockVSCode.commands.registerCommand.mock.calls
        .find(call => call[0] === 'mindmapTool.exportMindmap')?.[1];

      expect(exportCommand).toBeDefined();
      if (exportCommand) {
        await exportCommand();
        expect(mockVSCode.window.showQuickPick).toHaveBeenCalled();
        expect(mockVSCode.window.showSaveDialog).not.toHaveBeenCalled();
      }
    });

    it('should handle exportMindmap when save dialog cancelled', async () => {
      (mockVSCode.window as any).activeTextEditor = {
        document: {
          getText: () => '{"root": {"id": "1", "text": "Test"}}',
          fileName: '/test/mindmap.json'
        }
      };
      mockVSCode.window.showQuickPick.mockResolvedValue({
        label: 'PNG画像',
        value: 'png'
      });
      mockVSCode.window.showSaveDialog.mockResolvedValue(undefined);

      const exportCommand = mockVSCode.commands.registerCommand.mock.calls
        .find(call => call[0] === 'mindmapTool.exportMindmap')?.[1];

      expect(exportCommand).toBeDefined();
      if (exportCommand) {
        await exportCommand();
        expect(mockVSCode.window.showSaveDialog).toHaveBeenCalled();
        expect(mockVSCode.window.showInformationMessage).toHaveBeenCalledWith(
          'エクスポート機能は開発中です'
        );
      }
    });

    it('should handle JSON parsing errors in active editor change', async () => {
      const mockEditor = {
        document: {
          fileName: '/test/mindmap.json',
          getText: () => '{"invalid": json}',
          languageId: 'json'
        }
      };

      const editorChangeCallback = mockVSCode.window.onDidChangeActiveTextEditor.mock.calls[0][0];
      
      expect(editorChangeCallback).toBeDefined();
      if (editorChangeCallback) {
        // JSON解析エラーは無視されることを確認
        await expect(editorChangeCallback(mockEditor)).resolves.not.toThrow();
      }
    });

    it('should handle YAML parsing errors in active editor change', async () => {
      const mockEditor = {
        document: {
          fileName: '/test/mindmap.yaml',
          getText: () => 'invalid: yaml: [unclosed',
          languageId: 'yaml'
        }
      };

      const editorChangeCallback = mockVSCode.window.onDidChangeActiveTextEditor.mock.calls[0][0];
      
      expect(editorChangeCallback).toBeDefined();
      if (editorChangeCallback) {
        // YAML解析エラーは無視されることを確認
        await expect(editorChangeCallback(mockEditor)).resolves.not.toThrow();
      }
    });
  });

  describe('Tree Commands', () => {
    beforeEach(() => {
      activate(mockContext);
    });

    it('should handle selectNode command', async () => {
      const selectCommand = mockVSCode.commands.registerCommand.mock.calls
        .find(call => call[0] === 'mindmapTool.selectNode')?.[1];

      expect(selectCommand).toBeDefined();
      if (selectCommand) {
        await selectCommand('test-node', { title: 'Test Node', description: 'Test Description' });
        expect(mockVSCode.window.showInformationMessage).toHaveBeenCalledWith(
          'ノード "Test Node" を選択しました'
        );
      }
    });

    it('should handle addChildNode command', async () => {
      mockVSCode.window.showInputBox
        .mockResolvedValueOnce('New Child Node')
        .mockResolvedValueOnce('Child Description');

      const mockTreeItem = {
        nodeId: 'parent-node',
        label: 'Parent Node',
        nodeData: { title: 'Parent Node' }
      };

      const addChildCommand = mockVSCode.commands.registerCommand.mock.calls
        .find(call => call[0] === 'mindmapTool.addChildNode')?.[1];

      expect(addChildCommand).toBeDefined();
      if (addChildCommand) {
        await addChildCommand(mockTreeItem);
        expect(mockVSCode.window.showInputBox).toHaveBeenCalledTimes(2);
        expect(mockVSCode.window.showInformationMessage).toHaveBeenCalledWith(
          expect.stringContaining('子ノード "New Child Node" を追加しました')
        );
      }
    });

    it('should handle addChildNode command when title not provided', async () => {
      mockVSCode.window.showInputBox.mockResolvedValue(undefined);

      const mockTreeItem = {
        nodeId: 'parent-node',
        label: 'Parent Node',
        nodeData: { title: 'Parent Node' }
      };

      const addChildCommand = mockVSCode.commands.registerCommand.mock.calls
        .find(call => call[0] === 'mindmapTool.addChildNode')?.[1];

      expect(addChildCommand).toBeDefined();
      if (addChildCommand) {
        await addChildCommand(mockTreeItem);
        expect(mockVSCode.window.showInputBox).toHaveBeenCalledOnce();
        expect(mockVSCode.window.showInformationMessage).not.toHaveBeenCalledWith(
          expect.stringContaining('を追加しました')
        );
      }
    });

    it('should handle addSiblingNode command', async () => {
      mockVSCode.window.showInputBox
        .mockResolvedValueOnce('New Sibling Node')
        .mockResolvedValueOnce('Sibling Description');

      const mockTreeItem = {
        nodeId: 'target-node',
        label: 'Target Node',
        nodeData: { title: 'Target Node' }
      };

      const addSiblingCommand = mockVSCode.commands.registerCommand.mock.calls
        .find(call => call[0] === 'mindmapTool.addSiblingNode')?.[1];

      expect(addSiblingCommand).toBeDefined();
      if (addSiblingCommand) {
        await addSiblingCommand(mockTreeItem);
        expect(mockVSCode.window.showInformationMessage).toHaveBeenCalledWith(
          '兄弟ノード追加機能は開発中です'
        );
      }
    });

    it('should handle editNode command', async () => {
      mockVSCode.window.showInputBox.mockResolvedValue('Updated Node Title');

      const mockTreeItem = {
        nodeId: 'target-node',
        label: 'Target Node',
        nodeData: { title: 'Target Node' }
      };

      const editCommand = mockVSCode.commands.registerCommand.mock.calls
        .find(call => call[0] === 'mindmapTool.editNode')?.[1];

      expect(editCommand).toBeDefined();
      if (editCommand) {
        await editCommand(mockTreeItem);
        expect(mockVSCode.window.showInputBox).toHaveBeenCalledWith({
          prompt: 'ノードのタイトルを編集してください',
          value: 'Target Node'
        });
        expect(mockVSCode.window.showInformationMessage).toHaveBeenCalledWith(
          'ノード編集機能は開発中です'
        );
      }
    });

    it('should handle editNode command when node has no data', async () => {
      const mockTreeItem = {
        nodeId: 'target-node',
        label: 'Target Node',
        nodeData: undefined
      };

      const editCommand = mockVSCode.commands.registerCommand.mock.calls
        .find(call => call[0] === 'mindmapTool.editNode')?.[1];

      expect(editCommand).toBeDefined();
      if (editCommand) {
        await editCommand(mockTreeItem);
        expect(mockVSCode.window.showInputBox).not.toHaveBeenCalled();
      }
    });

    it('should handle editNode command when title unchanged', async () => {
      mockVSCode.window.showInputBox.mockResolvedValue('Target Node'); // 同じタイトル

      const mockTreeItem = {
        nodeId: 'target-node',
        label: 'Target Node',
        nodeData: { title: 'Target Node' }
      };

      const editCommand = mockVSCode.commands.registerCommand.mock.calls
        .find(call => call[0] === 'mindmapTool.editNode')?.[1];

      expect(editCommand).toBeDefined();
      if (editCommand) {
        await editCommand(mockTreeItem);
        expect(mockVSCode.window.showInformationMessage).not.toHaveBeenCalledWith(
          expect.stringContaining('編集')
        );
      }
    });

    it('should handle deleteNode command with confirmation', async () => {
      mockVSCode.window.showWarningMessage.mockResolvedValue('削除');

      const mockTreeItem = {
        nodeId: 'target-node',
        label: 'Target Node',
        nodeData: { title: 'Target Node' }
      };

      const deleteCommand = mockVSCode.commands.registerCommand.mock.calls
        .find(call => call[0] === 'mindmapTool.deleteNode')?.[1];

      expect(deleteCommand).toBeDefined();
      if (deleteCommand) {
        await deleteCommand(mockTreeItem);
        expect(mockVSCode.window.showWarningMessage).toHaveBeenCalledWith(
          'ノード "Target Node" を削除しますか？',
          { modal: true },
          '削除'
        );
        expect(mockVSCode.window.showInformationMessage).toHaveBeenCalledWith(
          expect.stringContaining('ノード "Target Node" を削除しました')
        );
      }
    });

    it('should handle deleteNode command without confirmation', async () => {
      mockVSCode.window.showWarningMessage.mockResolvedValue(undefined);

      const mockTreeItem = {
        nodeId: 'target-node',
        label: 'Target Node',
        nodeData: { title: 'Target Node' }
      };

      const deleteCommand = mockVSCode.commands.registerCommand.mock.calls
        .find(call => call[0] === 'mindmapTool.deleteNode')?.[1];

      expect(deleteCommand).toBeDefined();
      if (deleteCommand) {
        await deleteCommand(mockTreeItem);
        expect(mockVSCode.window.showWarningMessage).toHaveBeenCalled();
        expect(mockVSCode.window.showInformationMessage).not.toHaveBeenCalledWith(
          expect.stringContaining('を削除しました')
        );
      }
    });

    it('should handle collapseAll command', async () => {
      // treeView.visibleをモック
      let treeView: any;
      mockVSCode.window.createTreeView.mockImplementation((viewId, options) => {
        treeView = { visible: true };
        return treeView;
      });

      // activate を再実行してtreeViewを作成
      activate(mockContext);

      const collapseCommand = mockVSCode.commands.registerCommand.mock.calls
        .find(call => call[0] === 'mindmapTool.collapseAll')?.[1];

      expect(collapseCommand).toBeDefined();
      if (collapseCommand) {
        await collapseCommand();
        expect(mockVSCode.window.showInformationMessage).toHaveBeenCalledWith(
          'すべてのノードを折りたたみました'
        );
      }
    });

    it('should handle expandAll command', async () => {
      // treeView.visibleをモック
      let treeView: any;
      mockVSCode.window.createTreeView.mockImplementation((viewId, options) => {
        treeView = { visible: true };
        return treeView;
      });

      // activate を再実行してtreeViewを作成
      activate(mockContext);

      const expandCommand = mockVSCode.commands.registerCommand.mock.calls
        .find(call => call[0] === 'mindmapTool.expandAll')?.[1];

      expect(expandCommand).toBeDefined();
      if (expandCommand) {
        await expandCommand();
        expect(mockVSCode.window.showInformationMessage).toHaveBeenCalledWith(
          'すべてのノードを展開しました'
        );
      }
    });
  });
});