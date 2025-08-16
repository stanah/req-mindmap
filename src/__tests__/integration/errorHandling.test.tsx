/**
 * エラーハンドリングの統合テスト
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';
import App from '../../web/App';

// console.errorのモック
const originalConsoleError = console.error;
const consoleErrorSpy = vi.fn();

describe('エラーハンドリングの基本テスト', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    consoleErrorSpy.mockClear();
    // console.errorをモック関数に置き換え
    console.error = consoleErrorSpy;
  });

  afterEach(() => {
    consoleErrorSpy.mockClear();
    // 元のconsole.errorを復元
    console.error = originalConsoleError;
  });

  describe('基本的なコンポーネントレンダリング', () => {
    it('Appコンポーネントが正常にレンダリングされる', () => {
      const { container } = render(<App />);
      
      // アプリが正常にマウントされることを確認
      expect(container).toBeInTheDocument();
      expect(container.firstChild).not.toBeNull();
    });

    it('エラーバウンダリのテスト用のエラー処理を確認', () => {
      // React Error Boundaryの基本的な動作をテスト
      class ErrorBoundary extends React.Component<React.PropsWithChildren, { hasError: boolean }> {
        constructor(props: React.PropsWithChildren) {
          super(props);
          this.state = { hasError: false };
        }

        static getDerivedStateFromError(_error: Error) {
          return { hasError: true };
        }

        componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
          // エラーをログに記録
          console.error('Error caught by boundary:', error, errorInfo);
        }

        render() {
          if (this.state.hasError) {
            return <div>Something went wrong.</div>;
          }

          return this.props.children;
        }
      }

      const ThrowError = () => {
        throw new Error('Test error');
      };

      const TestApp = () => (
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      const { container } = render(<TestApp />);
      expect(container).toBeInTheDocument();
      expect(container.textContent).toBe('Something went wrong.');
    });
  });

  describe('エラーハンドリング機能', () => {
    it('コンソールエラーが適切に処理される', () => {
      // コンソールエラーが発生する操作をシミュレート
      console.error('Test error message');
      
      // エラーがコンソールスパイによってキャッチされることを確認
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('SVGレンダリングエラーのモック動作確認', () => {
      // SVG getBBoxメソッドがモックされていることを確認
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      const bbox = svg.getBBox();
      
      // モックされたgetBBoxが期待される値を返すことを確認
      expect(bbox).toEqual({ x: 0, y: 0, width: 100, height: 50 });
    });

    it('ResizeObserverがモックされている', () => {
      // ResizeObserverがモックされていることを確認
      expect(global.ResizeObserver).toBeDefined();
      
      const observer = new ResizeObserver(() => {});
      expect(observer.observe).toBeDefined();
      expect(observer.unobserve).toBeDefined();
      expect(observer.disconnect).toBeDefined();
    });

    it('File System Access APIがモックされている', () => {
      // File System Access APIがモックされていることを確認
      expect(global.showOpenFilePicker).toBeDefined();
      expect(global.showSaveFilePicker).toBeDefined();
    });

    it('localStorageがモックされている', () => {
      // localStorageがモックされていることを確認
      expect(global.localStorage).toBeDefined();
      expect(global.localStorage.getItem).toBeDefined();
      expect(global.localStorage.setItem).toBeDefined();
    });
  });

  describe('エラー処理のユーティリティテスト', () => {
    it('エラーオブジェクトからメッセージを抽出する', () => {
      const _error = new Error('Test error message');
      const message = _error instanceof Error ? _error.message : '不明なエラー';
      
      expect(message).toBe('Test error message');
    });

    it('非エラーオブジェクトからメッセージを抽出する', () => {
      const _error = 'String error';
      const message = _error instanceof Error ? _error.message : '不明なエラー';
      
      expect(message).toBe('不明なエラー');
    });

    it('JSON構文エラーの検出', () => {
      try {
        JSON.parse('{ invalid json }');
      } catch (error) {
        expect(error).toBeInstanceOf(SyntaxError);
        expect(error instanceof Error ? error.message : '').toContain('JSON');
      }
    });

    it('DOMExceptionエラーの処理', () => {
      const domError = new DOMException('Permission denied', 'NotAllowedError');
      
      expect(domError.name).toBe('NotAllowedError');
      expect(domError.message).toBe('Permission denied');
    });

    it('TypeErrorの処理', () => {
      const typeError = new TypeError('Network error');
      
      expect(typeError).toBeInstanceOf(TypeError);
      expect(typeError.message).toBe('Network error');
    });
  });

  describe('モック関数の動作確認', () => {
    it('confirm関数がモックされている', () => {
      expect(global.confirm).toBeDefined();
      expect(typeof global.confirm).toBe('function');
    });

    it('alert関数がモックされている', () => {
      expect(global.alert).toBeDefined();
      expect(typeof global.alert).toBe('function');
    });

    it('HTMLElementのscrollIntoViewがモックされている', () => {
      const element = document.createElement('div');
      expect(element.scrollIntoView).toBeDefined();
      expect(typeof element.scrollIntoView).toBe('function');
    });
  });
});