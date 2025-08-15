/**
 * VSCode用NodeActionButtonsコンポーネントのテスト
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NodeActionButtons } from '../../../vscode/components/NodeActionButtons';
// import type { MindmapNode } from "../../../types";

const mockData = {
  version: '1.0',
  title: 'テストマインドマップ',
  root: {
    id: 'root',
    title: 'ルートノード',
    description: 'テスト用のルートノード',
    status: 'draft',
    priority: 'medium',
    tags: [],
    customFields: {},
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    children: [
      {
        id: 'child1',
        title: '子ノード1',
        description: 'テスト用の子ノード',
        status: 'draft',
        priority: 'medium',
        tags: [],
        customFields: {},
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        children: []
      }
    ]
  }
};

describe('NodeActionButtons', () => {
  const mockOnAddChild = vi.fn();
  const mockOnAddSibling = vi.fn();
  const mockOnDeleteNode = vi.fn();

  beforeEach(() => {
    mockOnAddChild.mockClear();
    mockOnAddSibling.mockClear();
    mockOnDeleteNode.mockClear();
  });

  it('選択されたノードがない場合は無効化されたボタンを表示する', () => {
    render(
      <NodeActionButtons
        selectedNodeId={null}
        data={mockData}
        onAddChild={mockOnAddChild}
        onAddSibling={mockOnAddSibling}
        onDeleteNode={mockOnDeleteNode}
      />
    );

    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(4);
    buttons.forEach(button => {
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute('title', 'ノードを選択してください');
    });
  });

  it('データがない場合は無効化されたボタンを表示する', () => {
    render(
      <NodeActionButtons
        selectedNodeId="test"
        data={null}
        onAddChild={mockOnAddChild}
        onAddSibling={mockOnAddSibling}
        onDeleteNode={mockOnDeleteNode}
      />
    );

    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(4);
    buttons.forEach(button => {
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute('title', 'ノードを選択してください');
    });
  });

  it('子ノードが選択されている場合、適切なボタンが表示される', () => {
    render(
      <NodeActionButtons
        selectedNodeId="child1"
        data={mockData}
        onAddChild={mockOnAddChild}
        onAddSibling={mockOnAddSibling}
        onDeleteNode={mockOnDeleteNode}
      />
    );

    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(4);
    
    // 子追加ボタン
    const childButton = screen.getByTitle('子ノードを追加');
    expect(childButton).not.toBeDisabled();
    
    // 兄弟追加ボタン
    const siblingButton = screen.getByTitle('兄弟ノードを追加');
    expect(siblingButton).not.toBeDisabled();
    
    // 削除ボタン
    const deleteButton = screen.getByTitle('ノードを削除');
    expect(deleteButton).not.toBeDisabled();
  });

  it('ルートノードが選択されている場合、兄弟追加と削除ボタンが無効になる', () => {
    render(
      <NodeActionButtons
        selectedNodeId="root"
        data={mockData}
        onAddChild={mockOnAddChild}
        onAddSibling={mockOnAddSibling}
        onDeleteNode={mockOnDeleteNode}
      />
    );

    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(4);
    
    // 子追加ボタンは有効
    const childButton = screen.getByTitle('子ノードを追加');
    expect(childButton).not.toBeDisabled();
    
    // 兄弟追加ボタンは無効
    const siblingButton = screen.getByTitle('ルートノードには兄弟ノードを追加できません');
    expect(siblingButton).toBeDisabled();
    
    // 削除ボタンは無効
    const deleteButton = screen.getByTitle('ルートノードは削除できません');
    expect(deleteButton).toBeDisabled();
  });

  it('子追加ボタンをクリックするとonAddChildが呼ばれる', () => {
    render(
      <NodeActionButtons
        selectedNodeId="child1"
        data={mockData}
        onAddChild={mockOnAddChild}
        onAddSibling={mockOnAddSibling}
        onDeleteNode={mockOnDeleteNode}
      />
    );

    const childButton = screen.getByTitle('子ノードを追加');
    fireEvent.click(childButton);

    expect(mockOnAddChild).toHaveBeenCalledWith('child1');
    expect(mockOnAddChild).toHaveBeenCalledTimes(1);
  });

  it('兄弟追加ボタンをクリックするとonAddSiblingが呼ばれる', () => {
    render(
      <NodeActionButtons
        selectedNodeId="child1"
        data={mockData}
        onAddChild={mockOnAddChild}
        onAddSibling={mockOnAddSibling}
        onDeleteNode={mockOnDeleteNode}
      />
    );

    const siblingButton = screen.getByTitle('兄弟ノードを追加');
    fireEvent.click(siblingButton);

    expect(mockOnAddSibling).toHaveBeenCalledWith('child1');
    expect(mockOnAddSibling).toHaveBeenCalledTimes(1);
  });

  it('カスタムクラス名が適用される', () => {
    const { container } = render(
      <NodeActionButtons
        selectedNodeId="child1"
        data={mockData}
        onAddChild={mockOnAddChild}
        onAddSibling={mockOnAddSibling}
        onDeleteNode={mockOnDeleteNode}
        className="custom-class"
      />
    );

    const buttonContainer = container.querySelector('.node-action-buttons');
    expect(buttonContainer).toHaveClass('custom-class');
  });

  it('存在しないノードIDが指定された場合は何も表示しない', () => {
    const { container } = render(
      <NodeActionButtons
        selectedNodeId="nonexistent"
        data={mockData}
        onAddChild={mockOnAddChild}
        onAddSibling={mockOnAddSibling}
        onDeleteNode={mockOnDeleteNode}
      />
    );

    expect(container.firstChild).toBeNull();
  });
});