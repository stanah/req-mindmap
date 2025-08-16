import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockVSCode } from './setup';
import { MindmapTreeDataProvider, MindmapTreeItem } from '../MindmapTreeDataProvider';

describe('MindmapTreeDataProvider', () => {
  let provider: MindmapTreeDataProvider;
  let mockDocument: any;

  beforeEach(() => {
    vi.clearAllMocks();
    provider = new MindmapTreeDataProvider();

    mockDocument = {
      uri: { toString: () => '/test/mindmap.json' },
      fileName: '/test/mindmap.json',
      getText: vi.fn(),
      save: vi.fn(),
      positionAt: vi.fn((pos) => ({ line: 0, character: pos }))
    };
  });

  describe('setCurrentDocument', () => {
    it('should set document and load tree data', async () => {
      const mockContent = JSON.stringify({
        root: {
          id: 'root',
          title: 'Test Root',
          description: 'Test Description',
          children: [
            {
              id: 'child1',
              title: 'Child 1',
              children: []
            }
          ]
        }
      });

      mockDocument.getText.mockReturnValue(mockContent);

      await provider.setCurrentDocument(mockDocument);

      const treeData = provider.getChildren();
      expect(treeData).toHaveLength(1);
      expect(treeData[0].label).toBe('Test Root');
      expect(treeData[0].nodeId).toBe('root');
    });

    it('should handle YAML files', async () => {
      const yamlContent = `
root:
  id: root
  title: YAML Root
  children:
    - id: child1
      title: YAML Child
      children: []
      `;

      mockDocument.fileName = '/test/mindmap.yaml';
      mockDocument.getText.mockReturnValue(yamlContent);

      await provider.setCurrentDocument(mockDocument);

      const treeData = provider.getChildren();
      expect(treeData).toHaveLength(1);
      expect(treeData[0].label).toBe('YAML Root');
    });

    it('should handle malformed JSON gracefully', async () => {
      mockDocument.getText.mockReturnValue('invalid json');

      await provider.setCurrentDocument(mockDocument);

      const treeData = provider.getChildren();
      expect(treeData).toHaveLength(0);
    });

    it('should handle malformed YAML gracefully', async () => {
      mockDocument.fileName = '/test/mindmap.yml';
      mockDocument.getText.mockReturnValue('invalid: yaml: [unclosed');

      await provider.setCurrentDocument(mockDocument);

      const treeData = provider.getChildren();
      expect(treeData).toHaveLength(0);
    });

    it('should handle document without root', async () => {
      const contentWithoutRoot = JSON.stringify({
        someOtherProperty: 'value'
      });

      mockDocument.getText.mockReturnValue(contentWithoutRoot);

      await provider.setCurrentDocument(mockDocument);

      const treeData = provider.getChildren();
      expect(treeData).toHaveLength(0);
    });

    it('should handle undefined document', async () => {
      const provider = new MindmapTreeDataProvider();

      // ドキュメントを設定せずにgetChildrenを呼ぶ
      const treeData = provider.getChildren();
      expect(treeData).toHaveLength(0);
    });
  });

  describe('getChildren', () => {
    beforeEach(async () => {
      const mockContent = JSON.stringify({
        root: {
          id: 'root',
          title: 'Root',
          children: [
            {
              id: 'child1',
              title: 'Child 1',
              children: [
                {
                  id: 'grandchild1',
                  title: 'Grandchild 1',
                  children: []
                }
              ]
            },
            {
              id: 'child2',
              title: 'Child 2',
              children: []
            }
          ]
        }
      });

      mockDocument.getText.mockReturnValue(mockContent);
      await provider.setCurrentDocument(mockDocument);
    });

    it('should return root items when no element is provided', () => {
      const children = provider.getChildren();
      expect(children).toHaveLength(1);
      expect(children[0].label).toBe('Root');
    });

    it('should return child items for parent element', () => {
      const rootItem = provider.getChildren()[0];
      const children = provider.getChildren(rootItem);
      
      expect(children).toHaveLength(2);
      expect(children[0].label).toBe('Child 1');
      expect(children[1].label).toBe('Child 2');
    });

    it('should return grandchild items', () => {
      const rootItem = provider.getChildren()[0];
      const childItems = provider.getChildren(rootItem);
      const grandchildren = provider.getChildren(childItems[0]);
      
      expect(grandchildren).toHaveLength(1);
      expect(grandchildren[0].label).toBe('Grandchild 1');
    });

    it('should return empty array for item without children', () => {
      const rootItem = provider.getChildren()[0];
      const childItems = provider.getChildren(rootItem);
      const leafChildren = provider.getChildren(childItems[1]); // Child 2 has no children
      
      expect(leafChildren).toHaveLength(0);
    });

    it('should return empty array for item with no nodeData', () => {
      const itemWithoutData = new MindmapTreeItem('test', 'Test', 0, 'node');
      const children = provider.getChildren(itemWithoutData);
      
      expect(children).toHaveLength(0);
    });
  });

  describe('getTreeItem', () => {
    it('should return the tree item as-is', () => {
      const treeItem = new MindmapTreeItem(
        'test-id',
        'Test Label',
        0, // TreeItemCollapsibleState.None
        'mindmapNode'
      );

      const result = provider.getTreeItem(treeItem);
      expect(result).toBe(treeItem);
    });
  });

  describe('findTreeItem', () => {
    beforeEach(async () => {
      const mockContent = JSON.stringify({
        root: {
          id: 'root',
          title: 'Root',
          children: [
            {
              id: 'target-node',
              title: 'Target Node',
              children: []
            }
          ]
        }
      });

      mockDocument.getText.mockReturnValue(mockContent);
      await provider.setCurrentDocument(mockDocument);
    });

    it('should find tree item by node ID', () => {
      const found = provider.findTreeItem('target-node');
      expect(found).toBeDefined();
      expect(found?.nodeId).toBe('target-node');
      expect(found?.label).toBe('Target Node');
    });

    it('should return undefined for non-existent node ID', () => {
      const found = provider.findTreeItem('non-existent');
      expect(found).toBeUndefined();
    });
  });

  describe('addNode', () => {
    beforeEach(async () => {
      const mockContent = JSON.stringify({
        root: {
          id: 'root',
          title: 'Root',
          children: []
        }
      });

      mockDocument.getText.mockReturnValue(mockContent);
      
      // WorkspaceEditとRangeのモック
      const mockEdit = {
        replace: vi.fn()
      };
      mockVSCode.WorkspaceEdit.mockReturnValue(mockEdit);
      mockVSCode.Range.mockReturnValue({});
      mockVSCode.workspace.applyEdit.mockResolvedValue(true);

      await provider.setCurrentDocument(mockDocument);
    });

    it('should add node to parent and update document', async () => {
      const newNodeData = {
        id: 'new-node',
        title: 'New Node',
        description: 'New Description'
      };

      await provider.addNode('root', newNodeData);

      // WorkspaceEdit.replace が呼ばれたことを確認
      expect(mockVSCode.workspace.applyEdit).toHaveBeenCalled();
      expect(mockDocument.save).toHaveBeenCalled();
    });

    it('should handle add node when no document is set', async () => {
      const provider = new MindmapTreeDataProvider();
      const newNodeData = {
        id: 'new-node',
        title: 'New Node'
      };

      // ドキュメントが設定されていない場合は何もしない
      await provider.addNode('root', newNodeData);

      expect(mockVSCode.workspace.applyEdit).not.toHaveBeenCalled();
    });

    it('should handle YAML files when adding nodes', async () => {
      const yamlProvider = new MindmapTreeDataProvider();
      const yamlContent = `
root:
  id: root
  title: YAML Root
  children: []
      `;

      const yamlDocument = {
        ...mockDocument,
        fileName: '/test/mindmap.yaml',
        getText: vi.fn().mockReturnValue(yamlContent)
      };

      await yamlProvider.setCurrentDocument(yamlDocument);

      const newNodeData = {
        id: 'new-node',
        title: 'New YAML Node'
      };

      await yamlProvider.addNode('root', newNodeData);

      expect(mockVSCode.workspace.applyEdit).toHaveBeenCalled();
      expect(yamlDocument.save).toHaveBeenCalled();
    });

    it('should handle add node errors gracefully', async () => {
      mockVSCode.workspace.applyEdit.mockRejectedValue(new Error('Apply edit failed'));

      const newNodeData = {
        id: 'new-node',
        title: 'New Node'
      };

      await provider.addNode('root', newNodeData);

      expect(mockVSCode.window.showErrorMessage).toHaveBeenCalledWith(
        expect.stringContaining('ノードの追加に失敗しました')
      );
    });
  });

  describe('deleteNode', () => {
    beforeEach(async () => {
      const mockContent = JSON.stringify({
        root: {
          id: 'root',
          title: 'Root',
          children: [
            {
              id: 'node-to-delete',
              title: 'Node to Delete',
              children: []
            }
          ]
        }
      });

      mockDocument.getText.mockReturnValue(mockContent);
      
      const mockEdit = {
        replace: vi.fn()
      };
      mockVSCode.WorkspaceEdit.mockReturnValue(mockEdit);
      mockVSCode.Range.mockReturnValue({});
      mockVSCode.workspace.applyEdit.mockResolvedValue(true);

      await provider.setCurrentDocument(mockDocument);
    });

    it('should delete node and update document', async () => {
      await provider.deleteNode('node-to-delete');

      expect(mockVSCode.workspace.applyEdit).toHaveBeenCalled();
      expect(mockDocument.save).toHaveBeenCalled();
    });

    it('should handle delete node when no document is set', async () => {
      const provider = new MindmapTreeDataProvider();

      await provider.deleteNode('some-node');

      expect(mockVSCode.workspace.applyEdit).not.toHaveBeenCalled();
    });

    it('should handle YAML files when deleting nodes', async () => {
      const yamlProvider = new MindmapTreeDataProvider();
      const yamlContent = `
root:
  id: root
  title: YAML Root
  children:
    - id: node-to-delete
      title: Node to Delete
      children: []
      `;

      const yamlDocument = {
        ...mockDocument,
        fileName: '/test/mindmap.yml',
        getText: vi.fn().mockReturnValue(yamlContent)
      };

      await yamlProvider.setCurrentDocument(yamlDocument);

      await yamlProvider.deleteNode('node-to-delete');

      expect(mockVSCode.workspace.applyEdit).toHaveBeenCalled();
      expect(yamlDocument.save).toHaveBeenCalled();
    });

    it('should handle delete node errors gracefully', async () => {
      mockVSCode.workspace.applyEdit.mockRejectedValue(new Error('Delete failed'));

      await provider.deleteNode('node-to-delete');

      expect(mockVSCode.window.showErrorMessage).toHaveBeenCalledWith(
        expect.stringContaining('ノードの削除に失敗しました')
      );
    });
  });

  describe('refresh and expansion methods', () => {
    it('should call refresh without errors', () => {
      expect(() => provider.refresh()).not.toThrow();
    });

    it('should call expandAll without errors', () => {
      expect(() => provider.expandAll()).not.toThrow();
    });

    it('should call collapseAll without errors', () => {
      expect(() => provider.collapseAll()).not.toThrow();
    });
  });
});