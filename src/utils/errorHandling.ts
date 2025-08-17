/**
 * エラーハンドリングユーティリティ
 * アプリケーション全体のエラー処理とリカバリー機能
 */

import React, { Component } from 'react';
import { useAppStore } from '../stores/appStore';
import VSCodeApiSingleton from '../platform/vscode/VSCodeApiSingleton';

/**
 * エラーの種類を定義
 */
export enum ErrorType {
  PARSE_ERROR = 'PARSE_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  PLATFORM_ERROR = 'PLATFORM_ERROR',
  COMPONENT_ERROR = 'COMPONENT_ERROR',
  FILE_ERROR = 'FILE_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

/**
 * エラー情報の詳細
 */
export interface ErrorInfo {
  type: ErrorType;
  message: string;
  stack?: string;
  code?: string;
  context?: Record<string, any>;
  timestamp: Date;
  userAgent?: string;
  url?: string;
}

/**
 * エラーレポート
 */
export interface ErrorReport extends ErrorInfo {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  recoverable: boolean;
  retryCount: number;
}

/**
 * リカバリー戦略の定義
 */
export interface RecoveryStrategy {
  type: 'retry' | 'fallback' | 'reset' | 'ignore';
  maxRetries?: number;
  delay?: number;
  fallbackAction?: () => void;
  resetAction?: () => void;
}

/**
 * エラーハンドラーの設定
 */
export interface ErrorHandlerConfig {
  enableConsoleLogging: boolean;
  enableVSCodeReporting: boolean;
  enableUserNotification: boolean;
  maxErrorsPerSession: number;
  recoveryStrategies: Map<ErrorType, RecoveryStrategy>;
}

/**
 * グローバルエラーハンドラークラス
 */
export class ErrorHandler {
  private static instance: ErrorHandler | null = null;
  private config: ErrorHandlerConfig;
  private errorCounts = new Map<ErrorType, number>();
  private sessionErrors: ErrorReport[] = [];

  private constructor(config: Partial<ErrorHandlerConfig> = {}) {
    this.config = {
      enableConsoleLogging: true,
      enableVSCodeReporting: true,
      enableUserNotification: true,
      maxErrorsPerSession: 100,
      recoveryStrategies: new Map([
        [ErrorType.PARSE_ERROR, { type: 'fallback', fallbackAction: this.handleParseError }],
        [ErrorType.NETWORK_ERROR, { type: 'retry', maxRetries: 3, delay: 1000 }],
        [ErrorType.VALIDATION_ERROR, { type: 'fallback', fallbackAction: this.handleValidationError }],
        [ErrorType.PLATFORM_ERROR, { type: 'fallback', fallbackAction: this.handlePlatformError }],
        [ErrorType.COMPONENT_ERROR, { type: 'reset', resetAction: this.handleComponentError }],
        [ErrorType.FILE_ERROR, { type: 'retry', maxRetries: 2, delay: 500 }],
        [ErrorType.UNKNOWN_ERROR, { type: 'ignore' }]
      ]),
      ...config
    };
  }

  /**
   * シングルトンインスタンスを取得
   */
  public static getInstance(config?: Partial<ErrorHandlerConfig>): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler(config);
    }
    return ErrorHandler.instance;
  }

  /**
   * エラーを処理
   */
  public handleError(error: Error | ErrorInfo, context?: Record<string, any>): ErrorReport {
    const errorInfo = this.normalizeError(error, context);
    const errorReport = this.createErrorReport(errorInfo);

    // セッション内エラー数制限チェック
    if (this.sessionErrors.length >= this.config.maxErrorsPerSession) {
      console.warn('[ErrorHandler] Maximum errors per session reached, ignoring further errors');
      return errorReport;
    }

    this.sessionErrors.push(errorReport);
    this.incrementErrorCount(errorInfo.type);

    // ログ出力
    if (this.config.enableConsoleLogging) {
      this.logError(errorReport);
    }

    // VSCode拡張へのレポート
    if (this.config.enableVSCodeReporting) {
      this.reportToVSCode(errorReport);
    }

    // ユーザー通知
    if (this.config.enableUserNotification && errorReport.severity !== 'low') {
      this.notifyUser(errorReport);
    }

    // リカバリー戦略の実行
    this.executeRecoveryStrategy(errorReport);

    return errorReport;
  }

  /**
   * エラーを正規化
   */
  private normalizeError(error: Error | ErrorInfo, context?: Record<string, any>): ErrorInfo {
    if ('type' in error) {
      return error;
    }

    const errorType = this.classifyError(error);
    
    return {
      type: errorType,
      message: error.message,
      stack: error.stack,
      context,
      timestamp: new Date(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      url: typeof window !== 'undefined' ? window.location.href : undefined
    };
  }

  /**
   * エラーを分類
   */
  private classifyError(error: Error): ErrorType {
    const message = error.message.toLowerCase();
    const stack = error.stack?.toLowerCase() || '';

    if (message.includes('parse') || message.includes('json') || message.includes('yaml')) {
      return ErrorType.PARSE_ERROR;
    }

    if (message.includes('network') || message.includes('fetch') || message.includes('connection')) {
      return ErrorType.NETWORK_ERROR;
    }

    if (message.includes('validation') || message.includes('invalid') || message.includes('schema')) {
      return ErrorType.VALIDATION_ERROR;
    }

    if (message.includes('platform') || message.includes('vscode') || message.includes('adapter')) {
      return ErrorType.PLATFORM_ERROR;
    }

    if (message.includes('file') || message.includes('filesystem') || message.includes('read') || message.includes('write')) {
      return ErrorType.FILE_ERROR;
    }

    if (stack.includes('react') || stack.includes('component')) {
      return ErrorType.COMPONENT_ERROR;
    }

    return ErrorType.UNKNOWN_ERROR;
  }

  /**
   * エラーレポートを作成
   */
  private createErrorReport(errorInfo: ErrorInfo): ErrorReport {
    const severity = this.determineSeverity(errorInfo);
    const recoverable = this.isRecoverable(errorInfo.type);

    return {
      ...errorInfo,
      id: this.generateErrorId(),
      severity,
      recoverable,
      retryCount: 0
    };
  }

  /**
   * エラーの重要度を判定
   */
  private determineSeverity(errorInfo: ErrorInfo): 'low' | 'medium' | 'high' | 'critical' {
    switch (errorInfo.type) {
      case ErrorType.COMPONENT_ERROR:
      case ErrorType.PLATFORM_ERROR:
        return 'critical';
      case ErrorType.PARSE_ERROR:
      case ErrorType.VALIDATION_ERROR:
      case ErrorType.FILE_ERROR:
        return 'high';
      case ErrorType.NETWORK_ERROR:
        return 'medium';
      default:
        return 'low';
    }
  }

  /**
   * エラーがリカバリー可能かどうか判定
   */
  private isRecoverable(errorType: ErrorType): boolean {
    const strategy = this.config.recoveryStrategies.get(errorType);
    return strategy?.type !== 'ignore';
  }

  /**
   * エラーID生成
   */
  private generateErrorId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * エラーカウントを増やす
   */
  private incrementErrorCount(errorType: ErrorType): void {
    const current = this.errorCounts.get(errorType) || 0;
    this.errorCounts.set(errorType, current + 1);
  }

  /**
   * エラーログ出力
   */
  private logError(errorReport: ErrorReport): void {
    const logLevel = errorReport.severity === 'critical' ? 'error' : 
                    errorReport.severity === 'high' ? 'warn' : 'log';

    console[logLevel](`[ErrorHandler] ${errorReport.type}: ${errorReport.message}`, {
      id: errorReport.id,
      severity: errorReport.severity,
      timestamp: errorReport.timestamp,
      context: errorReport.context,
      stack: errorReport.stack
    });
  }

  /**
   * VSCode拡張への報告
   */
  private reportToVSCode(errorReport: ErrorReport): void {
    try {
      const singleton = VSCodeApiSingleton.getInstance();
      if (singleton.isAvailable()) {
        singleton.postMessage({
          command: 'error',
          error: {
            id: errorReport.id,
            type: errorReport.type,
            message: errorReport.message,
            severity: errorReport.severity,
            stack: errorReport.stack,
            context: errorReport.context,
            timestamp: errorReport.timestamp.toISOString()
          }
        });
      }
    } catch (error) {
      console.warn('[ErrorHandler] Failed to report error to VSCode:', error);
    }
  }

  /**
   * ユーザーへの通知
   */
  private notifyUser(errorReport: ErrorReport): void {
    try {
      const store = useAppStore.getState();
      store.addNotification({
        type: 'error',
        message: this.getUserFriendlyMessage(errorReport),
        duration: errorReport.severity === 'critical' ? 0 : 5000, // criticalは手動で閉じる
        autoHide: errorReport.severity !== 'critical'
      });
    } catch (error) {
      console.warn('[ErrorHandler] Failed to notify user:', error);
    }
  }

  /**
   * ユーザーフレンドリーなメッセージを生成
   */
  private getUserFriendlyMessage(errorReport: ErrorReport): string {
    switch (errorReport.type) {
      case ErrorType.PARSE_ERROR:
        return 'ファイルの形式が正しくありません。JSONまたはYAML形式を確認してください。';
      case ErrorType.NETWORK_ERROR:
        return 'ネットワーク接続に問題があります。しばらく後に再試行してください。';
      case ErrorType.VALIDATION_ERROR:
        return 'データの形式が正しくありません。内容を確認してください。';
      case ErrorType.PLATFORM_ERROR:
        return 'プラットフォームエラーが発生しました。VSCode拡張を再起動してください。';
      case ErrorType.COMPONENT_ERROR:
        return 'アプリケーションエラーが発生しました。ページを再読み込みしてください。';
      case ErrorType.FILE_ERROR:
        return 'ファイル操作でエラーが発生しました。ファイルの読み書き権限を確認してください。';
      default:
        return '予期しないエラーが発生しました。しばらく後に再試行してください。';
    }
  }

  /**
   * リカバリー戦略を実行
   */
  private executeRecoveryStrategy(errorReport: ErrorReport): void {
    const strategy = this.config.recoveryStrategies.get(errorReport.type);
    if (!strategy) return;

    switch (strategy.type) {
      case 'retry':
        this.executeRetryStrategy(errorReport, strategy);
        break;
      case 'fallback':
        strategy.fallbackAction?.();
        break;
      case 'reset':
        strategy.resetAction?.();
        break;
      case 'ignore':
        // 何もしない
        break;
    }
  }

  /**
   * リトライ戦略を実行
   */
  private executeRetryStrategy(errorReport: ErrorReport, strategy: RecoveryStrategy): void {
    if (errorReport.retryCount >= (strategy.maxRetries || 3)) {
      console.warn(`[ErrorHandler] Max retries reached for error ${errorReport.id}`);
      return;
    }

    setTimeout(() => {
      errorReport.retryCount++;
      console.log(`[ErrorHandler] Retrying operation for error ${errorReport.id} (attempt ${errorReport.retryCount})`);
      // 実際のリトライロジックは呼び出し元で実装
    }, strategy.delay || 1000);
  }

  // リカバリーアクション
  private handleParseError = (): void => {
    console.log('[ErrorHandler] Attempting to recover from parse error');
    // デフォルトデータにフォールバック
    const store = useAppStore.getState();
    store.updateContent('{"version":"1.0.0","title":"新規マインドマップ","root":{"id":"root","title":"ルートノード","children":[]}}');
  };

  private handleValidationError = (): void => {
    console.log('[ErrorHandler] Attempting to recover from validation error');
    // スキーマバリデーションエラーからの回復
  };

  private handlePlatformError = (): void => {
    console.log('[ErrorHandler] Attempting to recover from platform error');
    // プラットフォームアダプターの再初期化
  };

  private handleComponentError = (): void => {
    console.log('[ErrorHandler] Attempting to recover from component error');
    // コンポーネント状態のリセット
    const store = useAppStore.getState();
    store.initialize();
  };

  /**
   * 統計情報を取得
   */
  public getErrorStatistics(): {
    total: number;
    byType: Map<ErrorType, number>;
    sessionErrors: ErrorReport[];
  } {
    return {
      total: this.sessionErrors.length,
      byType: new Map(this.errorCounts),
      sessionErrors: [...this.sessionErrors]
    };
  }

  /**
   * エラーハンドラーをリセット
   */
  public reset(): void {
    this.errorCounts.clear();
    this.sessionErrors.length = 0;
  }
}

/**
 * withErrorHandling Higher-Order Component
 */
export function withErrorHandling<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  errorHandler?: ErrorHandler
): React.ComponentType<P> {
  const handler = errorHandler || ErrorHandler.getInstance();

  return class WithErrorHandling extends Component<P, { hasError: boolean }> {
    constructor(props: P) {
      super(props);
      this.state = { hasError: false };
    }

    static getDerivedStateFromError(): { hasError: boolean } {
      return { hasError: true };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
      handler.handleError(error, {
        componentStack: errorInfo.componentStack,
        componentName: WrappedComponent.displayName || WrappedComponent.name
      });
    }

    render() {
      if (this.state.hasError) {
        return React.createElement('div', {
          className: 'error-fallback'
        }, [
          React.createElement('h3', { key: 'title' }, 'エラーが発生しました'),
          React.createElement('p', { key: 'message' }, 'コンポーネントでエラーが発生しました。'),
          React.createElement('button', {
            key: 'retry',
            onClick: () => this.setState({ hasError: false })
          }, '再試行')
        ]);
      }

      return React.createElement(WrappedComponent, this.props);
    }
  };
}

/**
 * useErrorHandler フック
 */
export function useErrorHandler(config?: Partial<ErrorHandlerConfig>) {
  const handler = React.useMemo(() => ErrorHandler.getInstance(config), [config]);

  const handleError = React.useCallback((error: Error | ErrorInfo, context?: Record<string, any>) => {
    return handler.handleError(error, context);
  }, [handler]);

  return {
    handleError,
    getStatistics: () => handler.getErrorStatistics(),
    reset: () => handler.reset()
  };
}

/**
 * エラーハンドリング用のデコレーター（関数版）
 */
export function withErrorHandlingDecorator<T extends (...args: any[]) => any>(
  fn: T,
  errorHandler?: ErrorHandler
): T {
  const handler = errorHandler || ErrorHandler.getInstance();

  return ((...args: Parameters<T>) => {
    try {
      return fn(...args);
    } catch (error) {
      handler.handleError(error as Error, {
        function: fn.name,
        arguments: args
      });
      throw error; // 元の動作を維持
    }
  }) as T;
}

// デフォルトエクスポート
export default ErrorHandler;