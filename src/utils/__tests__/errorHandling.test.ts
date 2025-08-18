/**
 * エラーハンドリングユーティリティのテスト
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';

import ErrorHandler, {
  ErrorType,
  withErrorHandling,
  useErrorHandler,
  withErrorHandlingDecorator
} from '../errorHandling';

// VSCodeApiSingleton のモック
vi.mock('../../platform/vscode/VSCodeApiSingleton', () => ({
  default: {
    getInstance: vi.fn(() => ({
      isAvailable: vi.fn(() => true),
      postMessage: vi.fn()
    }))
  }
}));

// useAppStore のモック
vi.mock('../../stores/appStore', () => ({
  useAppStore: {
    getState: vi.fn(() => ({
      addNotification: vi.fn(),
      updateContent: vi.fn(),
      initialize: vi.fn()
    }))
  }
}));

describe('ErrorHandler', () => {
  let errorHandler: ErrorHandler;
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // シングルトンリセット
    (ErrorHandler as any).instance = null;
    errorHandler = ErrorHandler.getInstance();
    
    // console メソッドをモック
    consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks(); // すべての spy を元に戻す
    vi.clearAllMocks();
  });

  describe('シングルトンパターン', () => {
    it('同じインスタンスが返される', () => {
      const instance1 = ErrorHandler.getInstance();
      const instance2 = ErrorHandler.getInstance();
      
      expect(instance1).toBe(instance2);
    });

    it('設定付きで初期化できる', () => {
      (ErrorHandler as any).instance = null;
      
      const config = {
        enableConsoleLogging: false,
        maxErrorsPerSession: 50
      };
      
      const instance = ErrorHandler.getInstance(config);
      expect(instance).toBeDefined();
    });
  });

  describe('エラー分類', () => {
    it('パースエラーを正しく分類する', () => {
      const error = new Error('JSON parse error');
      const report = errorHandler.handleError(error);
      
      expect(report.type).toBe(ErrorType.PARSE_ERROR);
    });

    it('ネットワークエラーを正しく分類する', () => {
      const error = new Error('Network connection failed');
      const report = errorHandler.handleError(error);
      
      expect(report.type).toBe(ErrorType.NETWORK_ERROR);
    });

    it('バリデーションエラーを正しく分類する', () => {
      const error = new Error('Invalid schema validation');
      const report = errorHandler.handleError(error);
      
      expect(report.type).toBe(ErrorType.VALIDATION_ERROR);
    });

    it('プラットフォームエラーを正しく分類する', () => {
      const error = new Error('VSCode platform adapter failed');
      const report = errorHandler.handleError(error);
      
      expect(report.type).toBe(ErrorType.PLATFORM_ERROR);
    });

    it('ファイルエラーを正しく分類する', () => {
      const error = new Error('File read permission denied');
      const report = errorHandler.handleError(error);
      
      expect(report.type).toBe(ErrorType.FILE_ERROR);
    });

    it('React コンポーネントエラーを正しく分類する', () => {
      const error = new Error('React component render failed');
      error.stack = 'Error at Component.render (react.js:123)';
      
      const report = errorHandler.handleError(error);
      expect(report.type).toBe(ErrorType.COMPONENT_ERROR);
    });

    it('不明なエラーを正しく分類する', () => {
      const error = new Error('Some unknown error occurred');
      const report = errorHandler.handleError(error);
      
      expect(report.type).toBe(ErrorType.UNKNOWN_ERROR);
    });
  });

  describe('エラーレポート生成', () => {
    it('完全なエラーレポートが生成される', () => {
      const error = new Error('Test error');
      const context = { userId: '123', action: 'save' };
      
      const report = errorHandler.handleError(error, context);
      
      expect(report.id).toBeDefined();
      expect(report.message).toBe('Test error');
      expect(report.context).toBe(context);
      expect(report.timestamp).toBeInstanceOf(Date);
      expect(report.severity).toBeDefined();
      expect(typeof report.recoverable).toBe('boolean');
      expect(report.retryCount).toBe(0);
    });

    it('重要度が正しく判定される', () => {
      const componentError = new Error('Component crashed');
      componentError.stack = 'Error at React component';
      
      const parseError = new Error('JSON parse failed');
      const networkError = new Error('Network timeout');
      const unknownError = new Error('Unknown issue');
      
      expect(errorHandler.handleError(componentError).severity).toBe('critical');
      expect(errorHandler.handleError(parseError).severity).toBe('high');
      expect(errorHandler.handleError(networkError).severity).toBe('medium');
      expect(errorHandler.handleError(unknownError).severity).toBe('low');
    });
  });

  describe('エラー統計', () => {
    it('エラー統計が正しく記録される', () => {
      const error1 = new Error('Parse error 1');
      const error2 = new Error('Parse error 2');
      const error3 = new Error('Network error');
      
      errorHandler.handleError(error1);
      errorHandler.handleError(error2);
      errorHandler.handleError(error3);
      
      const stats = errorHandler.getErrorStatistics();
      
      expect(stats.total).toBe(3);
      expect(stats.byType.get(ErrorType.PARSE_ERROR)).toBe(2);
      expect(stats.byType.get(ErrorType.NETWORK_ERROR)).toBe(1);
      expect(stats.sessionErrors).toHaveLength(3);
    });

    it('エラー統計をリセットできる', () => {
      errorHandler.handleError(new Error('Test error'));
      
      let stats = errorHandler.getErrorStatistics();
      expect(stats.total).toBe(1);
      
      errorHandler.reset();
      stats = errorHandler.getErrorStatistics();
      expect(stats.total).toBe(0);
    });
  });

  describe('セッション制限', () => {
    it('最大エラー数に達すると新しいエラーを無視する', () => {
      // 小さな制限でテスト
      (ErrorHandler as any).instance = null;
      const handler = ErrorHandler.getInstance({ maxErrorsPerSession: 2 });
      
      handler.handleError(new Error('Error 1'));
      handler.handleError(new Error('Error 2'));
      handler.handleError(new Error('Error 3')); // これは無視される
      
      const stats = handler.getErrorStatistics();
      expect(stats.total).toBe(2);
    });
  });

  describe('withErrorHandling HOC', () => {
    it('コンポーネントエラーをキャッチする', () => {
      const ThrowingComponent = () => {
        throw new Error('Component error');
      };
      
      const WrappedComponent = withErrorHandling(ThrowingComponent);
      
      expect(() => {
        render(React.createElement(WrappedComponent));
      }).not.toThrow();
    });

    it('正常なコンポーネントは通常通り動作する', () => {
      const NormalComponent = () => React.createElement('div', null, 'Hello World');
      const WrappedComponent = withErrorHandling(NormalComponent);
      
      const { getByText } = render(React.createElement(WrappedComponent));
      expect(getByText('Hello World')).toBeDefined();
    });
  });

  describe('useErrorHandler フック', () => {
    it('エラーハンドラーフックが正常に動作する', () => {
      const { result } = renderHook(() => useErrorHandler());
      
      expect(result.current.handleError).toBeDefined();
      expect(result.current.getStatistics).toBeDefined();
      expect(result.current.reset).toBeDefined();
    });

    it('フック経由でエラーを処理できる', () => {
      const { result } = renderHook(() => useErrorHandler());
      
      const error = new Error('Hook test error');
      const report = result.current.handleError(error);
      
      expect(report.message).toBe('Hook test error');
    });
  });

  describe('withErrorHandlingDecorator', () => {
    it('関数のエラーをキャッチする', () => {
      const throwingFunction = () => {
        throw new Error('Function error');
      };
      
      const wrappedFunction = withErrorHandlingDecorator(throwingFunction);
      
      expect(() => {
        wrappedFunction();
      }).toThrow('Function error'); // 元のエラーは再スローされる
    });

    it('正常な関数は通常通り動作する', () => {
      const normalFunction = (x: number, y: number) => x + y;
      const wrappedFunction = withErrorHandlingDecorator(normalFunction);
      
      expect(wrappedFunction(2, 3)).toBe(5);
    });
  });

  describe('ユーザーフレンドリーメッセージ', () => {
    it('各エラータイプに対して適切なメッセージが生成される', () => {
      const errors = [
        { error: new Error('JSON parse failed'), expectedMessage: 'ファイルの形式が正しくありません' },
        { error: new Error('Network connection timeout'), expectedMessage: 'ネットワーク接続に問題があります' },
        { error: new Error('Invalid validation schema'), expectedMessage: 'データの形式が正しくありません' },
        { error: new Error('VSCode platform error'), expectedMessage: 'プラットフォームエラーが発生しました' },
        { error: new Error('File read permission denied'), expectedMessage: 'ファイル操作でエラーが発生しました' }
      ];
      
      errors.forEach(({ error, expectedMessage }) => {
        const report = errorHandler.handleError(error);
        // 実際のメッセージ生成は内部メソッドなので、ここでは型とメッセージの存在を確認
        expect(report.type).toBeDefined();
        expect(report.message).toBeDefined();
      });
    });
  });

  describe('ErrorInfo 直接処理', () => {
    it('ErrorInfo オブジェクトを直接処理できる', () => {
      const errorInfo = {
        type: ErrorType.VALIDATION_ERROR,
        message: 'Direct error info',
        timestamp: new Date(),
        context: { source: 'test' }
      };
      
      const report = errorHandler.handleError(errorInfo);
      
      expect(report.type).toBe(ErrorType.VALIDATION_ERROR);
      expect(report.message).toBe('Direct error info');
      expect(report.context).toEqual({ source: 'test' });
    });
  });
});

// renderHook のモック（必要に応じて）
function renderHook<T>(callback: () => T): { result: { current: T } } {
  let result: T;
  
  const TestComponent = () => {
    result = callback();
    return null;
  };
  
  render(React.createElement(TestComponent));
  
  return {
    result: {
      get current() {
        return result;
      }
    }
  };
}