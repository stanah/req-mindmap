/**
 * VSCode用NodeActionButtonsコンポーネントのテスト
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NodeActionButtons } from '../../../vscode/components/NodeActionButtons';
import type { MindmapNode } from '../../../types/generated/mindmap';

const mockNode: MindmapNode = {
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
};

describe('NodeActionButtons', () => {
  const mockOnAddChild = vi.fn();
  const mockOnAddSibling = vi.fn();

  beforeEach(() => {
    mockOnAddChild.mockClear();
    mockOnAddSibling.mockClear();
  });

  it('選択されたノードがない場合は何も表示しない', () => {
    const { container } = render(
      <NodeActionButtons
        selectedNodeId={null}
        data={mockNode}
        onAddChild={mockOnAddChild}
        onAddSibling={mockOnAddSibling}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('データがない場合は何も表示しない', () => {
    const { container } = render(
      <NodeActionButtons
        selectedNodeId="test"
        data={null}
        onAddChild={mockOnAddChild}
        onAddSibling={mockOnAddSibling}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('子ノードが選択されている場合、両方のボタンが表示される', () => {
    render(
      <NodeActionButtons
        selectedNodeId="child1"
        data={mockNode}
        onAddChild={mockOnAddChild}
        onAddSibling={mockOnAddSibling}
      />
    );

    expect(screen.getByText('選択中: 子ノード1')).toBeInTheDocument();
    expect(screen.getByText('子を追加')).toBeInTheDocument();
    expect(screen.getByText('兄弟を追加')).toBeInTheDocument();
    
    const siblingButton = screen.getByText('兄弟を追加').closest('button');
    expect(siblingButton).not.toBeDisabled();
  });

  it('ルートノードが選択されている場合、兄弟追加ボタンが無効になる', () => {
    render(
      <NodeActionButtons
        selectedNodeId="root"
        data={mockNode}
        onAddChild={mockOnAddChild}
        onAddSibling={mockOnAddSibling}
      />
    );

    expect(screen.getByText('選択中: ルートノード')).toBeInTheDocument();
    expect(screen.getByText('子を追加')).toBeInTheDocument();
    expect(screen.getByText('兄弟を追加')).toBeInTheDocument();
    
    const childButton = screen.getByText('子を追加').closest('button');
    const siblingButton = screen.getByText('兄弟を追加').closest('button');
    
    expect(childButton).not.toBeDisabled();
    expect(siblingButton).toBeDisabled();
  });

  it('子追加ボタンをクリックするとonAddChildが呼ばれる', () => {
    render(
      <NodeActionButtons
        selectedNodeId="child1"
        data={mockNode}
        onAddChild={mockOnAddChild}
        onAddSibling={mockOnAddSibling}
      />
    );

    const childButton = screen.getByText('子を追加');
    fireEvent.click(childButton);

    expect(mockOnAddChild).toHaveBeenCalledWith('child1');
    expect(mockOnAddChild).toHaveBeenCalledTimes(1);
  });

  it('兄弟追加ボタンをクリックするとonAddSiblingが呼ばれる', () => {
    render(
      <NodeActionButtons
        selectedNodeId="child1"
        data={mockNode}
        onAddChild={mockOnAddChild}
        onAddSibling={mockOnAddSibling}
      />
    );

    const siblingButton = screen.getByText('兄弟を追加');
    fireEvent.click(siblingButton);

    expect(mockOnAddSibling).toHaveBeenCalledWith('child1');
    expect(mockOnAddSibling).toHaveBeenCalledTimes(1);
  });

  it('カスタムクラス名が適用される', () => {
    const { container } = render(
      <NodeActionButtons
        selectedNodeId="child1"
        data={mockNode}
        onAddChild={mockOnAddChild}
        onAddSibling={mockOnAddSibling}
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
        data={mockNode}
        onAddChild={mockOnAddChild}
        onAddSibling={mockOnAddSibling}
      />
    );

    expect(container.firstChild).toBeNull();
  });
});