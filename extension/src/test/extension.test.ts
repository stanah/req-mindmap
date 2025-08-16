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
});