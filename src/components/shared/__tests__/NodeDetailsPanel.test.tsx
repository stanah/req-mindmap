/**
 * VSCode NodeDetailsPanel のテスト
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { NodeDetailsPanel } from '../NodeDetailsPanel';
import type { MindmapData } from '../../../types';

// テスト用のサンプルデータ
const sampleData: MindmapData = {
  title: "テストマインドマップ",
  version: "1.0",
  root: {
    id: "root",
    title: "ルートノード",
    description: "これはテスト用のルートノードです",
    type: "folder",
    children: [
      {
        id: "child1",
        title: "子ノード1",
        description: "子ノードの説明",
        customFields: {
          priority: "high",
          status: "active"
        },
        tags: ["重要", "進行中"],
        metadata: {
          author: "テストユーザー",
          version: 1
        },
        links: [{
          title: "関連リンク",
          url: "https://example.com"
        }],
        createdAt: "2023-01-01T00:00:00Z",
        updatedAt: "2023-01-02T00:00:00Z",
        deadline: "2023-12-31T23:59:59Z"
      }
    ]
  },
  schema: {
    version: "1.0",
    customFields: [
      {
        name: "priority",
        label: "優先度",
        type: "select",
        options: ["high", "medium", "low"]
      },
      {
        name: "status",
        label: "状態",
        type: "select",
        options: ["active", "inactive", "pending"]
      }
    ]
  }
};

describe('NodeDetailsPanel', () => {
  test('パネルが非表示の場合、適切な状態になる', () => {
    render(
      <NodeDetailsPanel
        nodeId="child1"
        data={sampleData}
        isVisible={false}
        onToggle={() => {}}
      />
    );

    const panel = screen.getByTitle('パネルを開く');
    expect(panel).toBeInTheDocument();
    
    // パネル内容は表示されていない
    expect(screen.queryByText('基本情報')).not.toBeInTheDocument();
  });

  test('パネルが表示されている場合、ノード詳細が表示される', () => {
    render(
      <NodeDetailsPanel
        nodeId="child1"
        data={sampleData}
        isVisible={true}
        onToggle={() => {}}
      />
    );

    // ヘッダーにノードタイトルが表示される
    expect(screen.getAllByText('子ノード1')).toHaveLength(2); // ヘッダーと詳細の両方に表示
    
    // 基本情報が表示される
    expect(screen.getByText('基本情報')).toBeInTheDocument();
    expect(screen.getByText('child1')).toBeInTheDocument();
    expect(screen.getByText('子ノードの説明')).toBeInTheDocument();

    // カスタムフィールドが表示される
    expect(screen.getByText('カスタムフィールド')).toBeInTheDocument();
    const priorityLabels = screen.getAllByText('優先度:');
    expect(priorityLabels.length).toBeGreaterThan(0);
    expect(screen.getByText('high')).toBeInTheDocument();
    expect(screen.getAllByText('状態:').length).toBeGreaterThan(0);
    expect(screen.getByText('active')).toBeInTheDocument();

    // タグが表示される
    expect(screen.getByText('タグ:')).toBeInTheDocument();
    expect(screen.getByText('重要')).toBeInTheDocument();
    expect(screen.getByText('進行中')).toBeInTheDocument();

    // TODO: メタデータ機能は未実装
    // expect(screen.getByText('メタデータ')).toBeInTheDocument();
    // expect(screen.getByText('author:')).toBeInTheDocument();
    // expect(screen.getByText('テストユーザー')).toBeInTheDocument();

    // TODO: 関連リンク機能は未実装
    // expect(screen.getByText('関連リンク')).toBeInTheDocument();
    // expect(screen.getByText('https://example.com')).toBeInTheDocument();

    // 日時情報が表示される（基本情報に含まれる）
    expect(screen.getByText('作成日時:')).toBeInTheDocument();
    expect(screen.getByText('更新日時:')).toBeInTheDocument();
    expect(screen.getByText('期限:')).toBeInTheDocument();
  });

  test('ノードが選択されていない場合、適切なメッセージが表示される', () => {
    render(
      <NodeDetailsPanel
        nodeId={null}
        data={sampleData}
        isVisible={true}
        onToggle={() => {}}
      />
    );

    expect(screen.getByText('ノード詳細')).toBeInTheDocument();
    expect(screen.getByText('ノードを選択してください')).toBeInTheDocument();
  });

  test('存在しないノードIDが指定された場合、適切なメッセージが表示される', () => {
    render(
      <NodeDetailsPanel
        nodeId="nonexistent"
        data={sampleData}
        isVisible={true}
        onToggle={() => {}}
      />
    );

    expect(screen.getByText('ノード詳細')).toBeInTheDocument();
    expect(screen.getByText('ノードを選択してください')).toBeInTheDocument();
  });

  test('トグルボタンクリック時にonToggleが呼ばれる', () => {
    const mockOnToggle = vi.fn();
    
    render(
      <NodeDetailsPanel
        nodeId="child1"
        data={sampleData}
        isVisible={true}
        onToggle={mockOnToggle}
      />
    );

    const toggleButton = screen.getByTitle('パネルを閉じる');
    fireEvent.click(toggleButton);

    expect(mockOnToggle).toHaveBeenCalledTimes(1);
  });

  test('データがnullの場合、適切に処理される', () => {
    render(
      <NodeDetailsPanel
        nodeId="child1"
        data={null}
        isVisible={true}
        onToggle={() => {}}
      />
    );

    expect(screen.getByText('ノード詳細')).toBeInTheDocument();
    expect(screen.getByText('ノードを選択してください')).toBeInTheDocument();
  });

  test.skip('リンクが新しいタブで開かれる', () => {
    render(
      <NodeDetailsPanel
        nodeId="child1"
        data={sampleData}
        isVisible={true}
        onToggle={() => {}}
      />
    );

    const link = screen.getByText('https://example.com');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  // 編集機能のテスト
  test.skip('編集ボタンクリック時に編集モードに切り替わる', () => {
    const mockOnNodeUpdate = vi.fn();
    
    render(
      <NodeDetailsPanel
        nodeId="child1"
        data={sampleData}
        isVisible={true}
        onToggle={() => {}}
        onNodeUpdate={mockOnNodeUpdate}
      />
    );

    // 編集ボタンをクリック
    const editButton = screen.getByTitle('編集モード');
    fireEvent.click(editButton);

    // 編集中の表示確認
    expect(screen.getByText('(編集中)')).toBeInTheDocument();
    
    // 保存・キャンセルボタンの表示確認
    expect(screen.getByTitle('保存')).toBeInTheDocument();
    expect(screen.getByTitle('キャンセル')).toBeInTheDocument();
    
    // 入力フィールドの表示確認
    expect(screen.getByDisplayValue('子ノード1')).toBeInTheDocument();
    expect(screen.getByDisplayValue('子ノードの説明')).toBeInTheDocument();
  });

  test.skip('編集モードでのタイトル変更と保存', () => {
    const mockOnNodeUpdate = vi.fn();
    
    render(
      <NodeDetailsPanel
        nodeId="child1"
        data={sampleData}
        isVisible={true}
        onToggle={() => {}}
        onNodeUpdate={mockOnNodeUpdate}
      />
    );

    // 編集モードに切り替え
    fireEvent.click(screen.getByTitle('編集モード'));

    // タイトルを変更
    const titleInput = screen.getByDisplayValue('子ノード1');
    fireEvent.change(titleInput, { target: { value: '新しいタイトル' } });

    // 保存
    fireEvent.click(screen.getByTitle('保存'));

    // onNodeUpdateが正しい引数で呼ばれることを確認
    expect(mockOnNodeUpdate).toHaveBeenCalledWith('child1', expect.objectContaining({
      title: '新しいタイトル',
      updatedAt: expect.any(String)
    }));
  });

  test.skip('編集モードでのキャンセル', () => {
    const mockOnNodeUpdate = vi.fn();
    
    render(
      <NodeDetailsPanel
        nodeId="child1"
        data={sampleData}
        isVisible={true}
        onToggle={() => {}}
        onNodeUpdate={mockOnNodeUpdate}
      />
    );

    // 編集モードに切り替え
    fireEvent.click(screen.getByTitle('編集モード'));

    // タイトルを変更
    const titleInput = screen.getByDisplayValue('子ノード1');
    fireEvent.change(titleInput, { target: { value: '新しいタイトル' } });

    // キャンセル
    fireEvent.click(screen.getByTitle('キャンセル'));

    // 編集モードが終了していることを確認
    expect(screen.queryByText('(編集中)')).not.toBeInTheDocument();
    
    // onNodeUpdateが呼ばれていないことを確認
    expect(mockOnNodeUpdate).not.toHaveBeenCalled();
    
    // 元の値が表示されていることを確認（編集モードではないことを確認）
    expect(screen.getAllByText('子ノード1').length).toBeGreaterThan(0);
  });

  test.skip('タグの追加と削除', () => {
    const mockOnNodeUpdate = vi.fn();
    
    render(
      <NodeDetailsPanel
        nodeId="child1"
        data={sampleData}
        isVisible={true}
        onToggle={() => {}}
        onNodeUpdate={mockOnNodeUpdate}
      />
    );

    // 編集モードに切り替え
    fireEvent.click(screen.getByTitle('編集モード'));

    // 新しいタグを追加
    const tagInput = screen.getByPlaceholderText('タグを追加してEnter');
    fireEvent.change(tagInput, { target: { value: '新タグ' } });
    fireEvent.keyPress(tagInput, { key: 'Enter' });

    // タグが追加されることを確認
    expect(screen.getByText('新タグ')).toBeInTheDocument();

    // 既存タグの削除ボタンをクリック
    const removeButtons = screen.getAllByTitle('タグを削除');
    fireEvent.click(removeButtons[0]);

    // 保存
    fireEvent.click(screen.getByTitle('保存'));

    // 更新されたタグ配列が渡されることを確認
    expect(mockOnNodeUpdate).toHaveBeenCalledWith('child1', expect.objectContaining({
      tags: expect.arrayContaining(['新タグ'])
    }));
  });

  test.skip('カスタムフィールドの編集', () => {
    const mockOnNodeUpdate = vi.fn();
    
    render(
      <NodeDetailsPanel
        nodeId="child1"
        data={sampleData}
        isVisible={true}
        onToggle={() => {}}
        onNodeUpdate={mockOnNodeUpdate}
      />
    );

    // 編集モードに切り替え
    fireEvent.click(screen.getByTitle('編集モード'));

    // priorityフィールドを変更
    const priorityInput = screen.getByDisplayValue('high');
    fireEvent.change(priorityInput, { target: { value: 'low' } });

    // 保存
    fireEvent.click(screen.getByTitle('保存'));

    // カスタムフィールドが更新されることを確認
    expect(mockOnNodeUpdate).toHaveBeenCalledWith('child1', expect.objectContaining({
      customFields: expect.objectContaining({
        priority: 'low'
      })
    }));
  });

  test('onNodeUpdateが提供されていない場合、編集ボタンが表示されない', () => {
    render(
      <NodeDetailsPanel
        nodeId="child1"
        data={sampleData}
        isVisible={true}
        onToggle={() => {}}
      />
    );

    // 編集ボタンが表示されないことを確認
    expect(screen.queryByTitle('編集モード')).not.toBeInTheDocument();
  });
});