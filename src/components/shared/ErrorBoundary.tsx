import React, { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

/**
 * エラーバウンダリコンポーネント
 * 子コンポーネントでエラーが発生した場合にキャッチして適切に処理する
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    // 次のレンダーでフォールバックUIを表示するためにstateを更新
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // エラーログ出力
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // 親コンポーネントにエラーを通知
    this.props.onError?.(error, errorInfo);
    
    // VSCode拡張の場合はVSCode側にもエラーを通知
    if (typeof window !== 'undefined' && window.vscode) {
      window.vscode.postMessage({
        command: 'error',
        error: {
          message: error.message,
          stack: error.stack,
          componentStack: errorInfo.componentStack,
        }
      });
    }

    this.setState({
      error,
      errorInfo,
    });
  }

  private handleReload = () => {
    // エラー状態をリセット
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  private handleRestart = () => {
    // ページ全体をリロード
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // カスタムフォールバックUIが提供されている場合はそれを使用
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // デフォルトのエラーUI
      return (
        <div className="error-boundary">
          <div className="error-container">
            <h2>🚨 エラーが発生しました</h2>
            <p>アプリケーションでエラーが発生しました。申し訳ございません。</p>
            
            <div className="error-actions">
              <button 
                onClick={this.handleReload}
                className="error-button primary"
              >
                再試行
              </button>
              <button 
                onClick={this.handleRestart}
                className="error-button secondary"
              >
                アプリケーション再起動
              </button>
            </div>
            
            {/* 開発環境でのみエラー詳細を表示 */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="error-details">
                <summary>エラー詳細（開発用）</summary>
                <pre className="error-stack">
                  {this.state.error.message}
                  {'\n\n'}
                  {this.state.error.stack}
                  {this.state.errorInfo?.componentStack && (
                    <>
                      {'\n\nコンポーネントスタック:'}
                      {this.state.errorInfo.componentStack}
                    </>
                  )}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;