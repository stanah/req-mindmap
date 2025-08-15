/**
 * VSCode NodeDetailsPanel のテスト
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { NodeDetailsPanel } from '../NodeDetailsPanel';
import type { MindmapData } from '../../../types/mindmap';

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
    fields: [
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
    expect(screen.getByText('優先度:')).toBeInTheDocument();
    expect(screen.getByText('high')).toBeInTheDocument();
    expect(screen.getAllByText(/状態/).length).toBeGreaterThan(0);
    expect(screen.getByText('active')).toBeInTheDocument();

    // タグが表示される
    expect(screen.getByText('タグ')).toBeInTheDocument();
    expect(screen.getByText('重要')).toBeInTheDocument();
    expect(screen.getByText('進行中')).toBeInTheDocument();

    // メタデータが表示される
    expect(screen.getByText('メタデータ')).toBeInTheDocument();
    expect(screen.getByText('author:')).toBeInTheDocument();
    expect(screen.getByText('テストユーザー')).toBeInTheDocument();

    // 関連リンクが表示される
    expect(screen.getByText('関連リンク')).toBeInTheDocument();
    expect(screen.getByText('https://example.com')).toBeInTheDocument();

    // 日時情報が表示される
    expect(screen.getByText('日時情報')).toBeInTheDocument();
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

  test('リンクが新しいタブで開かれる', () => {
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
});