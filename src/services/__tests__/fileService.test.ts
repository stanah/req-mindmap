/**
 * ファイルサービスのテスト
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FileServiceImpl } from '../fileService';
import type { MindmapData } from '../../types';

// ファイルAPIのモック
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

// グローバルAPIのモック
Object.defineProperty(global, 'showOpenFilePicker', {
  value: vi.fn(),
  writable: true
});

Object.defineProperty(global, 'showSaveFilePicker', {
  value: vi.fn(),
  writable: true
});

describe('FileService', () => {
  let fileService: FileServiceImpl;

  beforeEach(() => {
    fileService = new FileServiceImpl();
    vi.clearAllMocks();
  });

  describe('ファイル読み込み', () => {
    it('JSONファイルを正しく読み込む', async () => {
      const testData = {
        version: '1.0',
        title: 'テストマインドマップ',
        root: {
          id: 'root',
          title: 'ルートノード'
        }
      };

      const mockFile = new File([JSON.stringify(testData)], 'test.json', {
        type: 'application/json'
      });

      mockFileHandle.getFile.mockResolvedValue(mockFile);
      (global.showOpenFilePicker as any).mockResolvedValue([mockFileHandle]);

      const result = await fileService.openFile();

      expect(result.success).toBe(true);
      expect(result.data?.title).toBe('テストマインドマップ');
      expect(result.fileName).toBe('test.json');
      expect(result.format).toBe('json');
    });

    it('YAMLファイルを正しく読み込む', async () => {
      const yamlContent = `
version: "1.0"
title: "テストマインドマップ"
root:
  id: root
  title: "ルートノード"
`;

      const mockFile = new File([yamlContent], 'test.yaml', {
        type: 'application/x-yaml'
      });

      mockFileHandle.getFile.mockResolvedValue(mockFile);
      (global.showOpenFilePicker as any).mockResolvedValue([mockFileHandle]);

      const result = await fileService.openFile();

      expect(result.success).toBe(true);
      expect(result.data?.title).toBe('テストマインドマップ');
      expect(result.fileName).toBe('test.yaml');
      expect(result.format).toBe('yaml');
    });

    it('ファイル選択がキャンセルされた場合', async () => {
      (global.showOpenFilePicker as any).mockRejectedValue(new DOMException('User cancelled', 'AbortError'));

      const result = await fileService.openFile();

      expect(result.success).toBe(false);
      expect(result.error).toBe('ファイル選択がキャンセルされました');
    });

    it('無効なファイル形式の場合エラーを返す', async () => {
      const mockFile = new File(['invalid content'], 'test.txt', {
        type: 'text/plain'
      });

      mockFileHandle.getFile.mockResolvedValue(mockFile);
      (global.showOpenFilePicker as any).mockResolvedValue([mockFileHandle]);

      const result = await fileService.openFile();

      expect(result.success).toBe(false);
      expect(result.error).toContain('サポートされていないファイル形式');
    });

    it('ファイル読み込みエラーを適切に処理する', async () => {
      mockFileHandle.getFile.mockRejectedValue(new Error('File read error'));
      (global.showOpenFilePicker as any).mockResolvedValue([mockFileHandle]);

      const result = await fileService.openFile();

      expect(result.success).toBe(false);
      expect(result.error).toContain('ファイルの読み込みに失敗');
    });

    it('破損したJSONファイルの場合エラーを返す', async () => {
      const invalidJson = '{ "version": "1.0", "title": }';
      const mockFile = new File([invalidJson], 'broken.json', {
        type: 'application/json'
      });

      mockFileHandle.getFile.mockResolvedValue(mockFile);
      (global.showOpenFilePicker as any).mockResolvedValue([mockFileHandle]);

      const result = await fileService.openFile();

      expect(result.success).toBe(false);
      expect(result.error).toContain('JSON構文エラー');
    });

    it('破損したYAMLファイルの場合エラーを返す', async () => {
      const invalidYaml = `
version: "1.0"
title: "test
  invalid: yaml
`;
      const mockFile = new File([invalidYaml], 'broken.yaml', {
        type: 'application/x-yaml'
      });

      mockFileHandle.getFile.mockResolvedValue(mockFile);
      (global.showOpenFilePicker as any).mockResolvedValue([mockFileHandle]);

      const result = await fileService.openFile();

      expect(result.success).toBe(false);
      expect(result.error).toContain('YAML構文エラー');
    });
  });

  describe('ファイル保存', () => {
    const testData: MindmapData = {
      version: '1.0',
      title: 'テストマインドマップ',
      root: {
        id: 'root',
        title: 'ルートノード',
        children: [
          {
            id: 'child1',
            title: '子ノード1'
          }
        ]
      }
    };

    it('JSONファイルを正しく保存する', async () => {
      mockFileHandle.createWritable.mockResolvedValue(mockWritableStream);
      (global.showSaveFilePicker as any).mockResolvedValue(mockFileHandle);

      const result = await fileService.saveFile(testData, 'json');

      expect(result.success).toBe(true);
      expect(mockWritableStream.write).toHaveBeenCalled();
      expect(mockWritableStream.close).toHaveBeenCalled();

      // 書き込まれた内容を確認
      const writtenContent = mockWritableStream.write.mock.calls[0][0];
      const parsedContent = JSON.parse(writtenContent);
      expect(parsedContent.title).toBe('テストマインドマップ');
    });

    it('YAMLファイルを正しく保存する', async () => {
      mockFileHandle.createWritable.mockResolvedValue(mockWritableStream);
      (global.showSaveFilePicker as any).mockResolvedValue(mockFileHandle);

      const result = await fileService.saveFile(testData, 'yaml');

      expect(result.success).toBe(true);
      expect(mockWritableStream.write).toHaveBeenCalled();
      expect(mockWritableStream.close).toHaveBeenCalled();

      // 書き込まれた内容を確認
      const writtenContent = mockWritableStream.write.mock.calls[0][0];
      expect(writtenContent).toContain('version:');
      expect(writtenContent).toContain('title: テストマインドマップ');
    });

    it('ファイル保存がキャンセルされた場合', async () => {
      (global.showSaveFilePicker as any).mockRejectedValue(new DOMException('User cancelled', 'AbortError'));

      const result = await fileService.saveFile(testData, 'json');

      expect(result.success).toBe(false);
      expect(result.error).toBe('ファイル保存がキャンセルされました');
    });

    it('ファイル書き込みエラーを適切に処理する', async () => {
      mockWritableStream.write.mockRejectedValue(new Error('Write error'));
      mockFileHandle.createWritable.mockResolvedValue(mockWritableStream);
      (global.showSaveFilePicker as any).mockResolvedValue(mockFileHandle);

      const result = await fileService.saveFile(testData, 'json');

      expect(result.success).toBe(false);
      expect(result.error).toContain('ファイルの保存に失敗');
    });

    it('サポートされていない形式の場合エラーを返す', async () => {
      const result = await fileService.saveFile(testData, 'xml' as any);

      expect(result.success).toBe(false);
      expect(result.error).toContain('サポートされていない形式');
    });
  });

  describe('ファイル形式の検出', () => {
    it('ファイル拡張子からJSON形式を検出する', () => {
      expect(fileService.detectFormat('test.json')).toBe('json');
      expect(fileService.detectFormat('data.JSON')).toBe('json');
    });

    it('ファイル拡張子からYAML形式を検出する', () => {
      expect(fileService.detectFormat('test.yaml')).toBe('yaml');
      expect(fileService.detectFormat('test.yml')).toBe('yaml');
      expect(fileService.detectFormat('data.YAML')).toBe('yaml');
    });

    it('不明な拡張子の場合unknownを返す', () => {
      expect(fileService.detectFormat('test.txt')).toBe('unknown');
      expect(fileService.detectFormat('test')).toBe('unknown');
      expect(fileService.detectFormat('')).toBe('unknown');
    });
  });

  describe('最近使用したファイル', () => {
    beforeEach(() => {
      // localStorageのモック
      const localStorageMock = {
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn()
      };
      Object.defineProperty(global, 'localStorage', {
        value: localStorageMock,
        writable: true
      });
    });

    it('最近使用したファイルを記録する', () => {
      const fileInfo = {
        name: 'test.json',
        path: '/path/to/test.json',
        lastModified: Date.now()
      };

      fileService.addToRecentFiles(fileInfo);

      expect(localStorage.setItem).toHaveBeenCalledWith(
        'mindmap-recent-files',
        expect.stringContaining('test.json')
      );
    });

    it('最近使用したファイル一覧を取得する', () => {
      const recentFiles = [
        { name: 'test1.json', path: '/path/to/test1.json', lastModified: Date.now() },
        { name: 'test2.yaml', path: '/path/to/test2.yaml', lastModified: Date.now() - 1000 }
      ];

      (localStorage.getItem as any).mockReturnValue(JSON.stringify(recentFiles));

      const result = fileService.getRecentFiles();

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('test1.json');
    });

    it('最近使用したファイル一覧をクリアする', () => {
      fileService.clearRecentFiles();

      expect(localStorage.removeItem).toHaveBeenCalledWith('mindmap-recent-files');
    });

    it('最大件数を超えた場合古いファイルを削除する', () => {
      // 11個のファイルを追加（最大10個）
      for (let i = 0; i < 11; i++) {
        fileService.addToRecentFiles({
          name: `test${i}.json`,
          path: `/path/to/test${i}.json`,
          lastModified: Date.now() + i
        });
      }

      const setItemCalls = (localStorage.setItem as any).mock.calls;
      const lastCall = setItemCalls[setItemCalls.length - 1];
      const savedData = JSON.parse(lastCall[1]);

      expect(savedData).toHaveLength(10); // 最大10個まで
      expect(savedData[0].name).toBe('test10.json'); // 最新のファイルが先頭
    });
  });

  describe('ファイル監視', () => {
    it('ファイル変更を監視できる', async () => {
      const callback = vi.fn();
      const testFile = new File(['test content'], 'test.json');

      // ファイル監視を開始
      fileService.watchFile(testFile, callback);

      // ファイル変更をシミュレート
      const newContent = 'updated content';
      const updatedFile = new File([newContent], 'test.json');

      // 内部的にファイル変更を通知
      (fileService as any).notifyFileChange(updatedFile);

      expect(callback).toHaveBeenCalledWith(updatedFile);
    });

    it('ファイル監視を停止できる', () => {
      const callback = vi.fn();
      const testFile = new File(['test content'], 'test.json');

      fileService.watchFile(testFile, callback);
      fileService.stopWatching();

      // 変更通知があっても呼ばれない
      (fileService as any).notifyFileChange(testFile);

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('エラーハンドリング', () => {
    it('File System Access APIが利用できない場合の代替処理', async () => {
      // File System Access APIを無効化
      delete (global as any).showOpenFilePicker;
      delete (global as any).showSaveFilePicker;

      const result = await fileService.openFile();

      expect(result.success).toBe(false);
      expect(result.error).toContain('ファイルシステムアクセス');
    });

    it('セキュリティエラーを適切に処理する', async () => {
      (global.showOpenFilePicker as any).mockRejectedValue(
        new DOMException('Security error', 'SecurityError')
      );

      const result = await fileService.openFile();

      expect(result.success).toBe(false);
      expect(result.error).toContain('セキュリティ');
    });

    it('ネットワークエラーを適切に処理する', async () => {
      mockFileHandle.getFile.mockRejectedValue(new TypeError('Network error'));
      (global.showOpenFilePicker as any).mockResolvedValue([mockFileHandle]);

      const result = await fileService.openFile();

      expect(result.success).toBe(false);
      expect(result.error).toContain('ネットワーク');
    });
  });
});