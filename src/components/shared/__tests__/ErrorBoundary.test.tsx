import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import ErrorBoundary from '../ErrorBoundary';

// エラーを投げるテストコンポーネント
const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>No error</div>;
};

// VSCode APIのモック
const mockVSCodeApi = {
  postMessage: vi.fn(),
};

Object.defineProperty(window, 'vscode', {
  value: mockVSCodeApi,
  writable: true,
});

describe('ErrorBoundary', () => {
  const originalConsoleError = console.error;
  
  beforeEach(() => {
    // console.errorをモック
    console.error = vi.fn();
    mockVSCodeApi.postMessage.mockClear();
  });

  afterEach(() => {
    console.error = originalConsoleError;
  });

  it('エラーが発生しない場合は子コンポーネントを正常に表示する', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(screen.getByText('No error')).toBeInTheDocument();
  });

  it('エラーが発生した場合はデフォルトのエラーUIを表示する', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('🚨 エラーが発生しました')).toBeInTheDocument();
    expect(screen.getByText('アプリケーションでエラーが発生しました。申し訳ございません。')).toBeInTheDocument();
    expect(screen.getByText('再試行')).toBeInTheDocument();
    expect(screen.getByText('アプリケーション再起動')).toBeInTheDocument();
  });

  it('カスタムフォールバックUIが提供された場合はそれを表示する', () => {
    const fallback = <div>Custom error UI</div>;
    
    render(
      <ErrorBoundary fallback={fallback}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Custom error UI')).toBeInTheDocument();
    expect(screen.queryByText('🚨 エラーが発生しました')).not.toBeInTheDocument();
  });

  it('onErrorコールバックが呼び出される', () => {
    const onError = vi.fn();
    
    render(
      <ErrorBoundary onError={onError}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(onError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        componentStack: expect.any(String)
      })
    );
  });

  it('VSCode APIが利用可能な場合はVSCode側にエラーを通知する', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(mockVSCodeApi.postMessage).toHaveBeenCalledWith({
      command: 'error',
      error: {
        message: 'Test error',
        stack: expect.any(String),
        componentStack: expect.any(String),
      }
    });
  });

  it('再試行ボタンをクリックするとエラー状態がリセットされる', () => {
    let shouldThrow = true;
    
    const TestComponent = () => {
      return <ThrowError shouldThrow={shouldThrow} />;
    };

    const { rerender } = render(
      <ErrorBoundary>
        <TestComponent />
      </ErrorBoundary>
    );

    // エラーUIが表示されることを確認
    expect(screen.getByText('🚨 エラーが発生しました')).toBeInTheDocument();

    // shouldThrowをfalseに変更
    shouldThrow = false;

    // 再試行ボタンをクリック
    fireEvent.click(screen.getByText('再試行'));

    // エラー状態がリセットされて正常なコンポーネントが表示される
    rerender(
      <ErrorBoundary>
        <TestComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText('No error')).toBeInTheDocument();
  });

  it('アプリケーション再起動ボタンをクリックするとページがリロードされる', () => {
    // location.reloadをモック
    Object.defineProperty(window, 'location', {
      value: {
        ...window.location,
        reload: vi.fn(),
      },
      writable: true,
    });

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    fireEvent.click(screen.getByText('アプリケーション再起動'));

    expect(window.location.reload).toHaveBeenCalled();
  });

  it('開発環境でエラー詳細が表示される', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('エラー詳細（開発用）')).toBeInTheDocument();

    process.env.NODE_ENV = originalEnv;
  });

  it('本番環境ではエラー詳細が表示されない', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.queryByText('エラー詳細（開発用）')).not.toBeInTheDocument();

    process.env.NODE_ENV = originalEnv;
  });
});