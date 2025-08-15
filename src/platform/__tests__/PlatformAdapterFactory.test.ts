import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import './setup';
import { PlatformAdapterFactory, getPlatformAdapter, initializePlatform, disposePlatform, getPlatformType } from '../adapters';
import { BrowserPlatformAdapter } from '../browser/BrowserPlatformAdapter';

describe('PlatformAdapterFactory', () => {
  beforeEach(() => {
    // 各テスト前にファクトリーをリセット
    PlatformAdapterFactory.reset();
  });

  afterEach(() => {
    // 各テスト後にクリーンアップ
    PlatformAdapterFactory.reset();
  });

  describe('getInstance', () => {
    it('シングルトンインスタンスを返すこと', () => {
      const instance1 = PlatformAdapterFactory.getInstance();
      const instance2 = PlatformAdapterFactory.getInstance();
      
      expect(instance1).toBe(instance2);
    });

    it('ブラウザ環境ではBrowserPlatformAdapterを返すこと', () => {
      const instance = PlatformAdapterFactory.getInstance();
      expect(instance).toBeInstanceOf(BrowserPlatformAdapter);
    });
  });

  describe('reset', () => {
    it('インスタンスをリセットできること', () => {
      const instance1 = PlatformAdapterFactory.getInstance();
      PlatformAdapterFactory.reset();
      const instance2 = PlatformAdapterFactory.getInstance();
      
      expect(instance1).not.toBe(instance2);
    });

    it('リセット時に既存インスタンスのdisposeが呼ばれること', () => {
      const instance = PlatformAdapterFactory.getInstance();
      const disposeSpy = vi.spyOn(instance, 'dispose');
      
      PlatformAdapterFactory.reset();
      
      expect(disposeSpy).toHaveBeenCalled();
    });
  });

  describe('setInstance', () => {
    it('特定のインスタンスを設定できること', () => {
      const customAdapter = new BrowserPlatformAdapter();
      PlatformAdapterFactory.setInstance(customAdapter);
      
      const instance = PlatformAdapterFactory.getInstance();
      expect(instance).toBe(customAdapter);
    });

    it('既存インスタンスがある場合はdisposeが呼ばれること', () => {
      const instance1 = PlatformAdapterFactory.getInstance();
      const disposeSpy = vi.spyOn(instance1, 'dispose');
      
      const customAdapter = new BrowserPlatformAdapter();
      PlatformAdapterFactory.setInstance(customAdapter);
      
      expect(disposeSpy).toHaveBeenCalled();
    });
  });

  describe('ヘルパー関数', () => {
    it('getPlatformAdapterが正しいインスタンスを返すこと', () => {
      const factoryInstance = PlatformAdapterFactory.getInstance();
      const helperInstance = getPlatformAdapter();
      
      expect(helperInstance).toBe(factoryInstance);
    });

    it('initializePlatformが初期化を実行すること', async () => {
      const adapter = await initializePlatform();
      
      expect(adapter).toBeInstanceOf(BrowserPlatformAdapter);
      expect(adapter.getPlatformType()).toBe('browser');
    });

    it('disposePlatformがリセットを実行すること', () => {
      const instance = getPlatformAdapter();
      const disposeSpy = vi.spyOn(instance, 'dispose');
      
      disposePlatform();
      
      expect(disposeSpy).toHaveBeenCalled();
    });

    it('getPlatformTypeが正しいプラットフォーム種別を返すこと', () => {
      const platformType = getPlatformType();
      expect(platformType).toBe('browser');
    });
  });

  describe('VSCode環境の検出', () => {
    it('VSCode環境が検出された場合はVSCodePlatformAdapterを作成すること', () => {
      // VSCode環境をモック
      Object.defineProperty(window, 'acquireVsCodeApi', {
        value: vi.fn(),
        configurable: true
      });

      const adapter = PlatformAdapterFactory.getInstance();
      expect(adapter.getPlatformType()).toBe('vscode');

      // モックをクリーンアップ
      delete (window as typeof window & { acquireVsCodeApi?: unknown }).acquireVsCodeApi;
    });
  });
});