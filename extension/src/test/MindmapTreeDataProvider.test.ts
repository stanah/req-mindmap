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