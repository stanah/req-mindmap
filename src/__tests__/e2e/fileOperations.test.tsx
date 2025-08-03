/**
 * ファイル操作ワークフローのE2Eテスト
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../../App';
import type { MindmapData } from '../../types';

// タイマーのモック
vi.useFakeTimers();

// File System Access APIのモック
const mockFileHandle = {
  getFile: vi.fn(),
  createWritable: vi.fn(),
  name: 'test.json',
  kind: 'file' as const
};

const mockWritableStream = {
  write: vi.fn(),
  close: vi.fn()
};

Object.defineProperty(global, 'showOpenFilePicker', {
  value: vi.fn(),
  writable: true
});

Object.defineProperty(global, 'showSaveFilePicker', {
  value: vi.fn(),
  writable: true
});

// これらのモックはsetup.tsで定義済み
// - ResizeObserver
// - SVGElement.prototype.getBBox
// - localStorage

describe('ファイル操作ワークフローのE2Eテスト', () => {
  const testMindmapData: MindmapData = {
    version: '1.0',
    title: 'E2Eテストマインドマップ',
    description: 'エンドツーエンドテスト用のデータ',
    root: {
      id: 'root',
      title: 'プロジェクト要件',
      description: 'プロジェクトの要件定義',
      children: [
        {
          id: 'functional',
          title: '機能要件',
          children: [
            {
              id: 'auth',
              title: 'ユーザー認証',
              description: 'ログイン・ログアウト機能',
              customFields: {
                priority: 'high',
                status: 'todo',
                assignee: '開発チーム'
              }
            },
            {
              id: 'data',
              title: 'データ管理',
              description: 'CRUD操作の実装'
            }
          ]
        },
        {
          id: 'nonfunctional',
          title: '非機能要件',
          children: [
            {
              id: 'performance',
              title: 'パフォーマンス',
              description: '応答時間とスループット'
            },
            {
              id: 'security',
              title: 'セキュリティ',
              description: 'データ保護とアクセス制御'
            }
          ]
        }
      ]
    },
    schema: {
      version: '1.0',
      fields: [
        {
          name: 'priority',
          type: 'select',
          label: '優先度',
          options: ['high', 'medium', 'low'],
          required: true
        },
        {
          name: 'status',
          type: 'select',
          label: 'ステータス',
          options: ['todo', 'in-progress', 'done']
        },
        {
          name: 'assignee',
          type: 'string',
          label: '担当者'
        }
      ],
      displayRules: [
        {
          field: 'priority',
          displayType: 'badge',
          style: {
            high: { color: 'red', backgroundColor: '#ffebee' },
            medium: { color: 'orange', backgroundColor: '#fff3e0' },
            low: { color: 'green', backgroundColor: '#e8f5e8' }
          }
        }
      ]
    },
    settings: {
      theme: 'light',
      layout: 'tree'
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.useFakeTimers();
  });

  describe('完全なファイル操作ワークフロー', () => {
    it('新規作成→編集→保存→再読み込みの完全なワークフローを実行する', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      render(<App />);

      // ステップ1: 新規ファイル作成
      const newFileButton = screen.getByRole('button', { name: /新規|新しい/ });
      await user.click(newFileButton);

      await waitFor(() => {
        expect(screen.getByRole('textbox')).toBeInTheDocument();
      });

      // ステップ2: データ入力
      const editor = screen.getByRole('textbox');
      await user.clear(editor);
      await user.type(editor, JSON.stringify(testMindmapData, null, 2));

      act(() => {
        vi.advanceTimersByTime(500);
      });

      // マインドマップが表示されることを確認
      await waitFor(() => {
        expect(screen.getByText('プロジェクト要件')).toBeInTheDocument();
        expect(screen.getByText('機能要件')).toBeInTheDocument();
        expect(screen.getByText('非機能要件')).toBeInTheDocument();
      });

      // ステップ3: データ編集
      const editedData = {
        ...testMindmapData,
        title: 'E2E編集済みマインドマップ',
        root: {
          ...testMindmapData.root,
          children: [
            ...testMindmapData.root.children!,
            {
              id: 'technical',
              title: '技術要件',
              description: '技術的な制約と要件',
              children: [
                {
                  id: 'architecture',
                  title: 'アーキテクチャ',
                  description: 'システム設計'
                }
              ]
            }
          ]
        }
      };

      await user.clear(editor);
      await user.type(editor, JSON.stringify(editedData, null, 2));

      act(() => {
        vi.advanceTimersByTime(500);
      });

      // 新しいノードが表示されることを確認
      await waitFor(() => {
        expect(screen.getByText('技術要件')).toBeInTheDocument();
        expect(screen.getByText('アーキテクチャ')).toBeInTheDocument();
      });

      // ステップ4: ファイル保存
      mockFileHandle.createWritable.mockResolvedValue(mockWritableStream);
      ((global as any).showSaveFilePicker).mockResolvedValue(mockFileHandle);

      const saveButton = screen.getByRole('button', { name: /保存/ });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockWritableStream.write).toHaveBeenCalled();
        expect(mockWritableStream.close).toHaveBeenCalled();
      });

      // 保存された内容を確認
      const savedContent = mockWritableStream.write.mock.calls[0][0];
      const savedData = JSON.parse(savedContent);
      expect(savedData.title).toBe('E2E編集済みマインドマップ');
      expect(savedData.root.children).toHaveLength(3);

      // ステップ5: ファイル再読み込み
      const mockFile = new File([savedContent], 'edited.json', {
        type: 'application/json'
      });
      mockFileHandle.getFile.mockResolvedValue(mockFile);
      ((global as any).showOpenFilePicker).mockResolvedValue([mockFileHandle]);

      const openButton = screen.getByRole('button', { name: /ファイルを開く|開く/ });
      await user.click(openButton);

      // 再読み込みされたデータが正しく表示されることを確認
      await waitFor(() => {
        expect(screen.getByDisplayValue(/E2E編集済みマインドマップ/)).toBeInTheDocument();
        expect(screen.getByText('技術要件')).toBeInTheDocument();
        expect(screen.getByText('アーキテクチャ')).toBeInTheDocument();
      });
    });

    it('複数ファイルの切り替えワークフローを実行する', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      render(<App />);

      // ファイル1を作成
      const newFileButton = screen.getByRole('button', { name: /新規|新しい/ });
      await user.click(newFileButton);

      await waitFor(() => {
        expect(screen.getByRole('textbox')).toBeInTheDocument();
      });

      const editor = screen.getByRole('textbox');
      const file1Data = {
        version: '1.0',
        title: 'ファイル1',
        root: { id: 'root1', title: 'ルート1' }
      };

      await user.clear(editor);
      await user.type(editor, JSON.stringify(file1Data, null, 2));

      act(() => {
        vi.advanceTimersByTime(500);
      });

      await waitFor(() => {
        expect(screen.getByText('ルート1')).toBeInTheDocument();
      });

      // ファイル1を保存
      const file1Handle = { ...mockFileHandle, name: 'file1.json' };
      file1Handle.createWritable.mockResolvedValue(mockWritableStream);
      ((global as any).showSaveFilePicker).mockResolvedValue(file1Handle);

      const saveButton = screen.getByRole('button', { name: /保存/ });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockWritableStream.write).toHaveBeenCalled();
      });

      // ファイル2を作成
      await user.click(newFileButton);

      const file2Data = {
        version: '1.0',
        title: 'ファイル2',
        root: { id: 'root2', title: 'ルート2' }
      };

      await user.clear(editor);
      await user.type(editor, JSON.stringify(file2Data, null, 2));

      act(() => {
        vi.advanceTimersByTime(500);
      });

      await waitFor(() => {
        expect(screen.getByText('ルート2')).toBeInTheDocument();
      });

      // ファイル1に戻る
      const file1Content = JSON.stringify(file1Data, null, 2);
      const mockFile1 = new File([file1Content], 'file1.json', {
        type: 'application/json'
      });
      file1Handle.getFile.mockResolvedValue(mockFile1);
      ((global as any).showOpenFilePicker).mockResolvedValue([file1Handle]);

      const openButton = screen.getByRole('button', { name: /ファイルを開く|開く/ });
      await user.click(openButton);

      await waitFor(() => {
        expect(screen.getByText('ルート1')).toBeInTheDocument();
        expect(screen.queryByText('ルート2')).not.toBeInTheDocument();
      });
    });
  });

  describe('ファイル形式の変換ワークフロー', () => {
    it('JSON→YAML→JSON変換ワークフローを実行する', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      render(<App />);

      // JSONファイルを読み込み
      const jsonContent = JSON.stringify(testMindmapData, null, 2);
      const mockJsonFile = new File([jsonContent], 'test.json', {
        type: 'application/json'
      });
      mockFileHandle.getFile.mockResolvedValue(mockJsonFile);
      ((global as any).showOpenFilePicker).mockResolvedValue([mockFileHandle]);

      const openButton = screen.getByRole('button', { name: /ファイルを開く|開く/ });
      await user.click(openButton);

      await waitFor(() => {
        expect(screen.getByDisplayValue(/E2Eテストマインドマップ/)).toBeInTheDocument();
      });

      // YAML形式で保存
      const yamlHandle = { ...mockFileHandle, name: 'test.yaml' };
      yamlHandle.createWritable.mockResolvedValue(mockWritableStream);
      ((global as any).showSaveFilePicker).mockResolvedValue(yamlHandle);

      // 形式選択ドロップダウンでYAMLを選択
      const formatSelect = screen.getByLabelText(/形式|フォーマット/);
      await user.selectOptions(formatSelect, 'yaml');

      const saveButton = screen.getByRole('button', { name: /保存/ });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockWritableStream.write).toHaveBeenCalled();
      });

      // YAML形式で保存されたことを確認
      const savedYamlContent = mockWritableStream.write.mock.calls[0][0];
      expect(savedYamlContent).toContain('version:');
      expect(savedYamlContent).toContain('title: E2Eテストマインドマップ');

      // YAMLファイルを再読み込み
      const mockYamlFile = new File([savedYamlContent], 'test.yaml', {
        type: 'application/x-yaml'
      });
      yamlHandle.getFile.mockResolvedValue(mockYamlFile);
      ((global as any).showOpenFilePicker).mockResolvedValue([yamlHandle]);

      await user.click(openButton);

      await waitFor(() => {
        expect(screen.getByDisplayValue(/version:/)).toBeInTheDocument();
        expect(screen.getByText('プロジェクト要件')).toBeInTheDocument();
      });

      // JSON形式で再保存
      const jsonHandle2 = { ...mockFileHandle, name: 'converted.json' };
      jsonHandle2.createWritable.mockResolvedValue(mockWritableStream);
      ((global as any).showSaveFilePicker).mockResolvedValue(jsonHandle2);

      await user.selectOptions(formatSelect, 'json');
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockWritableStream.write).toHaveBeenCalledTimes(2);
      });

      // JSON形式で保存されたことを確認
      const savedJsonContent = mockWritableStream.write.mock.calls[1][0];
      const convertedData = JSON.parse(savedJsonContent);
      expect(convertedData.title).toBe('E2Eテストマインドマップ');
      expect(convertedData.root.title).toBe('プロジェクト要件');
    });
  });

  describe('エラー回復ワークフロー', () => {
    it('エラー発生→修正→保存の回復ワークフローを実行する', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      render(<App />);

      const newFileButton = screen.getByRole('button', { name: /新規|新しい/ });
      await user.click(newFileButton);

      await waitFor(() => {
        expect(screen.getByRole('textbox')).toBeInTheDocument();
      });

      const editor = screen.getByRole('textbox');

      // 無効なJSONを入力してエラーを発生させる
      const invalidJson = '{ "version": "1.0", "title": }';
      await user.clear(editor);
      await user.type(editor, invalidJson);

      act(() => {
        vi.advanceTimersByTime(500);
      });

      // エラーが表示されることを確認
      await waitFor(() => {
        expect(screen.getByText(/構文エラー|JSON構文エラー/)).toBeInTheDocument();
      });

      // 保存ボタンが無効化されることを確認
      const saveButton = screen.getByRole('button', { name: /保存/ });
      expect(saveButton).toBeDisabled();

      // エラーを修正
      const validData = {
        version: '1.0',
        title: '修正済みマインドマップ',
        root: {
          id: 'root',
          title: '修正済みルート'
        }
      };

      await user.clear(editor);
      await user.type(editor, JSON.stringify(validData, null, 2));

      act(() => {
        vi.advanceTimersByTime(500);
      });

      // エラーが解消されることを確認
      await waitFor(() => {
        expect(screen.queryByText(/構文エラー/)).not.toBeInTheDocument();
        expect(screen.getByText('修正済みルート')).toBeInTheDocument();
      });

      // 保存ボタンが有効化されることを確認
      expect(saveButton).not.toBeDisabled();

      // 保存を実行
      mockFileHandle.createWritable.mockResolvedValue(mockWritableStream);
      ((global as any).showSaveFilePicker).mockResolvedValue(mockFileHandle);

      await user.click(saveButton);

      await waitFor(() => {
        expect(mockWritableStream.write).toHaveBeenCalled();
      });

      // 正しいデータが保存されることを確認
      const savedContent = mockWritableStream.write.mock.calls[0][0];
      const savedData = JSON.parse(savedContent);
      expect(savedData.title).toBe('修正済みマインドマップ');
    });
  });

  describe('設定の永続化ワークフロー', () => {
    it('設定変更→保存→再読み込みで設定が保持される', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      render(<App />);

      // 設定パネルを開く
      const settingsButton = screen.getByRole('button', { name: /設定/ });
      await user.click(settingsButton);

      // エディタ設定を変更
      const fontSizeInput = screen.getByLabelText(/フォントサイズ/);
      await user.clear(fontSizeInput);
      await user.type(fontSizeInput, '18');

      const themeSelect = screen.getByLabelText(/テーマ/);
      await user.selectOptions(themeSelect, 'dark');

      // マインドマップ設定を変更
      const layoutSelect = screen.getByLabelText(/レイアウト/);
      await user.selectOptions(layoutSelect, 'radial');

      // 設定を保存
      const saveSettingsButton = screen.getByRole('button', { name: /設定を保存/ });
      await user.click(saveSettingsButton);

      // 設定パネルを閉じる
      const closeButton = screen.getByRole('button', { name: /閉じる/ });
      await user.click(closeButton);

      // localStorageに保存されることを確認
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        expect.stringContaining('settings'),
        expect.stringContaining('18')
      );

      // アプリケーションを再起動（再レンダリング）
      const { unmount } = render(<App />);
      unmount();

      // 設定が復元されることをシミュレート
      localStorageMock.getItem.mockReturnValue(JSON.stringify({
        editor: { fontSize: 18, theme: 'dark' },
        mindmap: { layout: 'radial' }
      }));

      render(<App />);

      // 設定パネルを再度開いて設定が保持されていることを確認
      const settingsButton2 = screen.getByRole('button', { name: /設定/ });
      await user.click(settingsButton2);

      const fontSizeInput2 = screen.getByLabelText(/フォントサイズ/);
      expect(fontSizeInput2).toHaveValue(18);

      const themeSelect2 = screen.getByLabelText(/テーマ/);
      expect(themeSelect2).toHaveValue('dark');

      const layoutSelect2 = screen.getByLabelText(/レイアウト/);
      expect(layoutSelect2).toHaveValue('radial');
    });
  });

  describe('最近使用したファイルのワークフロー', () => {
    it('ファイル履歴の管理ワークフローを実行する', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      render(<App />);

      // 複数のファイルを順次開く
      const files = [
        { name: 'file1.json', content: { version: '1.0', title: 'ファイル1', root: { id: 'root1', title: 'ルート1' } } },
        { name: 'file2.json', content: { version: '1.0', title: 'ファイル2', root: { id: 'root2', title: 'ルート2' } } },
        { name: 'file3.json', content: { version: '1.0', title: 'ファイル3', root: { id: 'root3', title: 'ルート3' } } }
      ];

      for (const file of files) {
        const mockFile = new File([JSON.stringify(file.content, null, 2)], file.name, {
          type: 'application/json'
        });
        const fileHandle = { ...mockFileHandle, name: file.name };
        fileHandle.getFile.mockResolvedValue(mockFile);
        ((global as any).showOpenFilePicker).mockResolvedValue([fileHandle]);

        const openButton = screen.getByRole('button', { name: /ファイルを開く|開く/ });
        await user.click(openButton);

        await waitFor(() => {
          expect(screen.getByText(file.content.root.title)).toBeInTheDocument();
        });
      }

      // 最近使用したファイル一覧を開く
      const recentFilesButton = screen.getByRole('button', { name: /最近使用|履歴/ });
      await user.click(recentFilesButton);

      // 最近使用したファイルが表示されることを確認
      await waitFor(() => {
        expect(screen.getByText('file3.json')).toBeInTheDocument();
        expect(screen.getByText('file2.json')).toBeInTheDocument();
        expect(screen.getByText('file1.json')).toBeInTheDocument();
      });

      // 履歴からファイルを選択
      const file2Link = screen.getByText('file2.json');
      await user.click(file2Link);

      // 選択したファイルが開かれることを確認
      await waitFor(() => {
        expect(screen.getByText('ルート2')).toBeInTheDocument();
        expect(screen.queryByText('ルート3')).not.toBeInTheDocument();
      });

      // localStorageに履歴が保存されることを確認
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'mindmap-recent-files',
        expect.stringContaining('file2.json')
      );
    });
  });

  describe('自動保存ワークフロー', () => {
    it('自動保存機能のワークフローを実行する', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      render(<App />);

      // 自動保存を有効にする
      const settingsButton = screen.getByRole('button', { name: /設定/ });
      await user.click(settingsButton);

      const autoSaveToggle = screen.getByRole('checkbox', { name: /自動保存/ });
      await user.click(autoSaveToggle);

      const closeButton = screen.getByRole('button', { name: /閉じる/ });
      await user.click(closeButton);

      // ファイルを作成
      const newFileButton = screen.getByRole('button', { name: /新規|新しい/ });
      await user.click(newFileButton);

      await waitFor(() => {
        expect(screen.getByRole('textbox')).toBeInTheDocument();
      });

      const editor = screen.getByRole('textbox');
      const testData = {
        version: '1.0',
        title: '自動保存テスト',
        root: { id: 'root', title: 'ルート' }
      };

      await user.clear(editor);
      await user.type(editor, JSON.stringify(testData, null, 2));

      act(() => {
        vi.advanceTimersByTime(500);
      });

      // 最初の手動保存
      mockFileHandle.createWritable.mockResolvedValue(mockWritableStream);
      ((global as any).showSaveFilePicker).mockResolvedValue(mockFileHandle);

      const saveButton = screen.getByRole('button', { name: /保存/ });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockWritableStream.write).toHaveBeenCalled();
      });

      // データを編集
      const editedData = {
        ...testData,
        title: '自動保存テスト（編集済み）'
      };

      await user.clear(editor);
      await user.type(editor, JSON.stringify(editedData, null, 2));

      act(() => {
        vi.advanceTimersByTime(500);
      });

      // 自動保存のタイマーを進める（通常5秒）
      act(() => {
        vi.advanceTimersByTime(5000);
      });

      // 自動保存が実行されることを確認
      await waitFor(() => {
        expect(mockWritableStream.write).toHaveBeenCalledTimes(2);
      });

      // 自動保存された内容を確認
      const autoSavedContent = mockWritableStream.write.mock.calls[1][0];
      const autoSavedData = JSON.parse(autoSavedContent);
      expect(autoSavedData.title).toBe('自動保存テスト（編集済み）');
    });
  });
});