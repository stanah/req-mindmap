import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import './setup';
import { BrowserPlatformAdapter } from '../browser/BrowserPlatformAdapter';

// モックの設定
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn()
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage
});

describe('BrowserPlatformAdapter', () => {
  let adapter: BrowserPlatformAdapter;

  beforeEach(() => {
    adapter = new BrowserPlatformAdapter();
    vi.clearAllMocks();
  });

  afterEach(() => {
    adapter.dispose();
  });

  describe('基本機能', () => {
    it('プラットフォームタイプがbrowserであること', () => {
      expect(adapter.getPlatformType()).toBe('browser');
    });

    it('初期化が正常に完了すること', async () => {
      await expect(adapter.initialize()).resolves.toBeUndefined();
    });

    it('破棄が正常に完了すること', () => {
      expect(() => adapter.dispose()).not.toThrow();
    });
  });

  describe('機能確認', () => {
    it('機能情報を正しく取得できること', () => {
      const capabilities = adapter.getCapabilities();
      
      expect(capabilities).toHaveProperty('fileSystemAccess');
      expect(capabilities).toHaveProperty('nativeDialogs');
      expect(capabilities).toHaveProperty('fileWatching');
      expect(capabilities).toHaveProperty('clipboard');
      
      expect(typeof capabilities.fileSystemAccess).toBe('boolean');
      expect(typeof capabilities.nativeDialogs).toBe('boolean');
      expect(typeof capabilities.fileWatching).toBe('boolean');
      expect(typeof capabilities.clipboard).toBe('boolean');
    });

    it('ブラウザ情報を正しく取得できること', () => {
      const browserInfo = adapter.getBrowserInfo();
      
      expect(browserInfo).toHaveProperty('userAgent');
      expect(browserInfo).toHaveProperty('language');
      expect(browserInfo).toHaveProperty('platform');
      expect(browserInfo).toHaveProperty('cookieEnabled');
      expect(browserInfo).toHaveProperty('onLine');
    });

    it('パフォーマンス情報を正しく取得できること', () => {
      const performanceInfo = adapter.getPerformanceInfo();
      
      expect(performanceInfo).toHaveProperty('timing');
      expect(performanceInfo.timing).toBeDefined();
    });
  });

  describe('アダプター', () => {
    it('すべてのアダプターが初期化されていること', () => {
      expect(adapter.fileSystem).toBeDefined();
      expect(adapter.editor).toBeDefined();
      expect(adapter.ui).toBeDefined();
      expect(adapter.settings).toBeDefined();
    });

    it('ファイルシステムアダプターが正しい型であること', () => {
      expect(adapter.fileSystem.constructor.name).toBe('BrowserFileSystemAdapter');
    });

    it('エディタアダプターが正しい型であること', () => {
      expect(adapter.editor.constructor.name).toBe('BrowserEditorAdapter');
    });

    it('UIアダプターが正しい型であること', () => {
      expect(adapter.ui.constructor.name).toBe('BrowserUIAdapter');
    });

    it('設定アダプターが正しい型であること', () => {
      expect(adapter.settings.constructor.name).toBe('BrowserSettingsAdapter');
    });
  });

  describe('クリップボード機能', () => {
    it('クリップボードにコピーできること（navigator.clipboard利用可能時）', async () => {
      const mockWriteText = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: mockWriteText },
        configurable: true
      });

      const showInformationMessageSpy = vi.spyOn(adapter.ui, 'showInformationMessage');

      await adapter.copyToClipboard('テストテキスト');

      expect(mockWriteText).toHaveBeenCalledWith('テストテキスト');
      expect(showInformationMessageSpy).toHaveBeenCalledWith('クリップボードにコピーしました');
    });

    it('クリップボードコピーでエラーが発生した場合の処理', async () => {
      const mockWriteText = vi.fn().mockRejectedValue(new Error('コピー失敗'));
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: mockWriteText },
        configurable: true
      });

      const showErrorMessageSpy = vi.spyOn(adapter.ui, 'showErrorMessage');
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await adapter.copyToClipboard('テストテキスト');

      expect(showErrorMessageSpy).toHaveBeenCalledWith('クリップボードへのコピーに失敗しました');
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });
});