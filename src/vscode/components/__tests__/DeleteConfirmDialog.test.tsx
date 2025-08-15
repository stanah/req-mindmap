/**
 * 削除確認ダイアログのテスト
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DeleteConfirmDialog } from '../DeleteConfirmDialog';
import type { MindmapNode } from "../../../types";

// テスト用のノードデータを作成
const createTestNode = (id: string, title: string, childrenCount = 0): MindmapNode => {
  const now = new Date().toISOString();
  const children: MindmapNode[] = [];
  
  // 子ノードを作成
  for (let i = 0; i < childrenCount; i++) {
    children.push({
      id: `${id}_child_${i}`,
      title: `子ノード${i + 1}`,
      description: `${title}の子ノード`,
      status: 'active',
      priority: 'medium',
      tags: [],
      customFields: {},
      createdAt: now,
      updatedAt: now,
      children: []
    });
  }
  
  return {
    id,
    title,
    description: `${title}の説明`,
    status: 'active',
    priority: 'medium',
    tags: [],
    customFields: {},
    createdAt: now,
    updatedAt: now,
    children
  };
};

describe('DeleteConfirmDialog', () => {
  const mockOnConfirm = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    mockOnConfirm.mockClear();
    mockOnCancel.mockClear();
  });

  it('isOpenがfalseの時は何も表示されない', () => {
    const testNode = createTestNode('test-node', 'テストノード');
    
    render(
      <DeleteConfirmDialog
        isOpen={false}
        node={testNode}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );
    
    expect(screen.queryByText('ノード削除の確認')).not.toBeInTheDocument();
  });

  it('nodeがnullの時は何も表示されない', () => {
    render(
      <DeleteConfirmDialog
        isOpen={true}
        node={null}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );
    
    expect(screen.queryByText('ノード削除の確認')).not.toBeInTheDocument();
  });

  it('子ノードがない場合の表示が正しい', () => {
    const testNode = createTestNode('test-node', 'テストノード', 0);
    
    render(
      <DeleteConfirmDialog
        isOpen={true}
        node={testNode}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );
    
    expect(screen.getByText('ノード削除の確認')).toBeInTheDocument();
    expect(screen.getByText('削除対象:')).toBeInTheDocument();
    expect(screen.getByText('テストノード')).toBeInTheDocument();
    expect(screen.getByText('この操作は取り消せません。削除しますか？')).toBeInTheDocument();
    
    // 警告メッセージは表示されない
    expect(screen.queryByText(/このノードには.*個.*の子ノードが含まれています/)).not.toBeInTheDocument();
  });

  it('子ノードがある場合の警告表示が正しい', () => {
    const testNode = createTestNode('test-node', 'テストノード', 3);
    
    render(
      <DeleteConfirmDialog
        isOpen={true}
        node={testNode}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );
    
    expect(screen.getByText('ノード削除の確認')).toBeInTheDocument();
    expect(screen.getByText('削除対象:')).toBeInTheDocument();
    expect(screen.getByText('テストノード')).toBeInTheDocument();
    
    // 警告メッセージが表示される
    expect(screen.getByText('3個')).toBeInTheDocument();
    // Note: テキストが<br>で分かれているため、基本的な要素のみ確認
    expect(screen.getByText('⚠️')).toBeInTheDocument();
  });

  it('キャンセルボタンをクリックするとonCancelが呼ばれる', () => {
    const testNode = createTestNode('test-node', 'テストノード');
    
    render(
      <DeleteConfirmDialog
        isOpen={true}
        node={testNode}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );
    
    const cancelButton = screen.getByText('キャンセル');
    fireEvent.click(cancelButton);
    
    expect(mockOnCancel).toHaveBeenCalledTimes(1);
    expect(mockOnConfirm).not.toHaveBeenCalled();
  });

  it('削除するボタンをクリックするとonConfirmが呼ばれる', () => {
    const testNode = createTestNode('test-node', 'テストノード');
    
    render(
      <DeleteConfirmDialog
        isOpen={true}
        node={testNode}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );
    
    const confirmButton = screen.getByText('削除する');
    fireEvent.click(confirmButton);
    
    expect(mockOnConfirm).toHaveBeenCalledTimes(1);
    expect(mockOnCancel).not.toHaveBeenCalled();
  });

  it('削除するボタンが存在する', () => {
    const testNode = createTestNode('test-node', 'テストノード');
    
    render(
      <DeleteConfirmDialog
        isOpen={true}
        node={testNode}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );
    
    const confirmButton = screen.getByText('削除する');
    expect(confirmButton).toBeInTheDocument();
  });

  it('複雑な階層構造のノード数を正しくカウントする', () => {
    // 複雑な階層のノードを作成
    const testNode = createTestNode('root', 'ルートノード', 2);
    
    // 子ノードにさらに子ノードを追加
    if (testNode.children) {
      testNode.children[0].children = [
        createTestNode('grandchild1', '孫ノード1'),
        createTestNode('grandchild2', '孫ノード2')
      ];
      testNode.children[1].children = [
        createTestNode('grandchild3', '孫ノード3')
      ];
    }
    
    render(
      <DeleteConfirmDialog
        isOpen={true}
        node={testNode}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );
    
    // 総子孫数: 2（子） + 3（孫） = 5
    expect(screen.getByText('ルートノード')).toBeInTheDocument();
    expect(screen.getByText('5個')).toBeInTheDocument();
    expect(screen.getByText('⚠️')).toBeInTheDocument();
  });
});