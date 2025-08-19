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
  retryAction?: () => void | Promise<void>;
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
  private currentOperations = new Map<string, () => Promise<void>>();
  private retryQueue = new Map<string, ErrorReport>();
  private corruptedDataBackup: { content: string; timestamp: string; key: string } | null = null;

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
    return `error_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
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
   * リトライ戦略を実行（改良版）
   */
  private executeRetryStrategy(errorReport: ErrorReport, strategy: RecoveryStrategy): void {
    const maxRetries = strategy.maxRetries || 3;
    
    if (errorReport.retryCount >= maxRetries) {
      console.warn(`[ErrorHandler] Max retries (${maxRetries}) reached for error ${errorReport.id}`);
      this.handleMaxRetriesReached(errorReport);
      return;
    }

    // リトライキューに追加
    this.retryQueue.set(errorReport.id, errorReport);

    const delay = this.calculateRetryDelay(errorReport.retryCount, strategy.delay || 1000);
    
    setTimeout(async () => {
      errorReport.retryCount++;
      console.log(`[ErrorHandler] Retrying operation for error ${errorReport.id} (attempt ${errorReport.retryCount}/${maxRetries})`);
      
      try {
        // 現在のオペレーションを取得して実行
        const operation = this.getCurrentOperation(errorReport);
        
        if (operation) {
          await operation();
          console.log(`[ErrorHandler] Retry successful for error ${errorReport.id}`);
          this.retryQueue.delete(errorReport.id);
          this.onRetrySuccess(errorReport);
        } else if (strategy.retryAction) {
          await strategy.retryAction();
          console.log(`[ErrorHandler] Fallback retry action successful for error ${errorReport.id}`);
          this.retryQueue.delete(errorReport.id);
          this.onRetrySuccess(errorReport);
        } else {
          throw new Error('No retry operation available');
        }
      } catch (retryError) {
        console.warn(`[ErrorHandler] Retry failed for error ${errorReport.id}:`, retryError);
        
        // エラーが変わった場合は新しいエラーとして処理
        if (retryError instanceof Error && retryError.message !== errorReport.message) {
          console.log(`[ErrorHandler] Different error occurred during retry, handling as new error`);
          this.handleError(retryError, { 
            originalErrorId: errorReport.id,
            retryAttempt: errorReport.retryCount 
          });
          return;
        }
        
        // 同じエラーの場合は再帰的にリトライを継続
        this.executeRetryStrategy(errorReport, strategy);
      }
    }, delay);
  }

  /**
   * 現在のオペレーションを取得
   */
  private getCurrentOperation(errorReport: ErrorReport): (() => Promise<void>) | null {
    // エラーの種類に基づいて適切なオペレーションを特定
    const operationKey = this.getOperationKeyForError(errorReport);
    return operationKey ? this.currentOperations.get(operationKey) ?? null : null;
  }

  /**
   * エラーに対応するオペレーションキーを取得
   */
  private getOperationKeyForError(errorReport: ErrorReport): string | null {
    const context = errorReport.context || {};
    
    // コンテキストから操作を特定
    if (context.operation) {
      return context.operation;
    }
    
    // エラータイプから推測
    switch (errorReport.type) {
      case ErrorType.NETWORK_ERROR:
        return context.url || 'network-operation';
      case ErrorType.FILE_ERROR:
        return context.filepath || 'file-operation';
      case ErrorType.PARSE_ERROR:
        return 'parse-operation';
      default:
        return null;
    }
  }

  /**
   * リトライ遅延時間を計算（指数バックオフ）
   */
  private calculateRetryDelay(retryCount: number, baseDelay: number): number {
    // 指数バックオフ + ジッター
    const exponentialDelay = baseDelay * Math.pow(2, retryCount - 1);
    const jitter = Math.random() * 200; // 0-200msのランダムジッター
    return Math.min(exponentialDelay + jitter, 30000); // 最大30秒
  }

  /**
   * 最大リトライ回数に達した場合の処理
   */
  private handleMaxRetriesReached(errorReport: ErrorReport): void {
    this.retryQueue.delete(errorReport.id);
    
    const store = useAppStore.getState();
    store.addNotification({
      type: 'error',
      message: `操作の実行に複数回失敗しました (${errorReport.type}): ${this.getUserFriendlyMessage(errorReport)}`,
      autoHide: false,
      duration: 0,
      actions: [{
        label: '手動で再試行',
        action: () => this.manualRetry(errorReport)
      }]
    });
  }

  /**
   * リトライ成功時の処理
   */
  private onRetrySuccess(errorReport: ErrorReport): void {
    const store = useAppStore.getState();
    store.addNotification({
      type: 'success',
      message: `操作が正常に完了しました（${errorReport.retryCount}回目で成功）`,
      autoHide: true,
      duration: 3000
    });
  }

  /**
   * 手動リトライ
   */
  private manualRetry = (errorReport: ErrorReport): void => {
    console.log(`[ErrorHandler] Manual retry triggered for error ${errorReport.id}`);
    
    // リトライカウントをリセット
    errorReport.retryCount = 0;
    
    // 再度リトライ戦略を実行
    const strategy = this.config.recoveryStrategies.get(errorReport.type);
    if (strategy && strategy.type === 'retry') {
      this.executeRetryStrategy(errorReport, strategy);
    }
  };

  /**
   * オペレーションを登録（リトライに使用）
   */
  public registerOperation(key: string, operation: () => Promise<void>): void {
    this.currentOperations.set(key, operation);
  }

  /**
   * オペレーションを削除
   */
  public unregisterOperation(key: string): void {
    this.currentOperations.delete(key);
  }

  /**
   * 進行中のリトライをキャンセル
   */
  public cancelRetries(errorId?: string): void {
    if (errorId) {
      this.retryQueue.delete(errorId);
      console.log(`[ErrorHandler] Cancelled retry for error ${errorId}`);
    } else {
      const count = this.retryQueue.size;
      this.retryQueue.clear();
      console.log(`[ErrorHandler] Cancelled ${count} pending retries`);
    }
  }

  /**
   * リトライ統計情報を取得
   */
  public getRetryStatistics(): {
    pendingRetries: number;
    retryQueue: { errorId: string; retryCount: number; type: ErrorType }[];
  } {
    const retryQueue = Array.from(this.retryQueue.values()).map(error => ({
      errorId: error.id,
      retryCount: error.retryCount,
      type: error.type
    }));

    return {
      pendingRetries: this.retryQueue.size,
      retryQueue
    };
  }

  // リカバリーアクション
  private handleParseError = (): void => {
    console.log('[ErrorHandler] Attempting to recover from parse error');
    const store = useAppStore.getState();
    
    // 現在の破損データをメモリにバックアップ（セッション中のみ有効）
    let backupSaved = false;
    try {
      const currentContent = store.file.fileContent;
      if (currentContent && currentContent.trim()) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        // メモリ上にバックアップを保存（永続化なし）
        this.corruptedDataBackup = {
          content: currentContent,
          timestamp,
          key: `mindmap-backup-corrupted-${timestamp}`
        };
        console.log('[ErrorHandler] Corrupted data backed up to memory with key:', this.corruptedDataBackup.key);
        backupSaved = true;
      }
    } catch (error) {
      console.warn('[ErrorHandler] Failed to backup corrupted data:', error);
    }
    
    // ユーザーに復元オプションを含む確認ダイアログを表示
    const hasBackup = Boolean(backupSaved || this.corruptedDataBackup);
    const message = hasBackup 
      ? 'データの読み込みに失敗しました。新規マインドマップを作成しますか？\n破損したデータはバックアップされており、後で復元を試行できます。'
      : 'データの読み込みに失敗したため、新規マインドマップを作成します。';
    
    // VSCodeまたはブラウザ環境に応じた確認ダイアログ
    const userConfirmed = this.showUserConfirmation(message, hasBackup);
    
    if (userConfirmed || !hasBackup) {
      // デフォルトデータにフォールバック
      store.updateContent('{"version":"1.0.0","title":"新規マインドマップ","root":{"id":"root","title":"ルートノード","children":[]}}');
      
      // ユーザーに通知（復元オプション付き）
      store.addNotification({
        type: 'warning',
        message: hasBackup 
          ? 'データの読み込みに失敗したため、新規マインドマップを作成しました。破損したデータはバックアップされています。設定から復元を試行できます。'
          : 'データの読み込みに失敗したため、新規マインドマップを作成しました。',
        autoHide: false,
        duration: 0,
        actions: hasBackup ? [{
          label: '復元を試行',
          action: () => this.attemptDataRestoration()
        }] : undefined
      });
    }
  };

  /**
   * ユーザー確認ダイアログを表示
   */
  private showUserConfirmation(message: string, showCancel: boolean = true): boolean {
    try {
      // VSCode環境の場合
      const vscode = VSCodeApiSingleton.getInstance();
      if (vscode.isAvailable()) {
        vscode.postMessage({
          command: 'showConfirmation',
          message,
          options: showCancel ? ['新規作成', 'キャンセル'] : ['OK']
        });
        // VSCodeからの応答は非同期なので、とりあえずtrueを返す
        return true;
      }
    } catch (error) {
      console.warn('[ErrorHandler] VSCode confirmation failed:', error);
    }
    
    // ブラウザ環境の場合
    if (typeof window !== 'undefined' && window.confirm) {
      return showCancel ? window.confirm(message) : (window.alert(message), true);
    }
    
    // フォールバック：常にtrue
    return true;
  }

  /**
   * データ復元を試行
   */
  private attemptDataRestoration = (): void => {
    console.log('[ErrorHandler] Attempting data restoration');
    
    try {
      // メモリ上のバックアップデータを確認
      if (!this.corruptedDataBackup) {
        throw new Error('No backup found in memory');
      }
      
      const backupContent = this.corruptedDataBackup.content;
      
      // JSONの修復を試行
      const repairedContent = this.attemptJsonRepair(backupContent);
      
      const store = useAppStore.getState();
      store.updateContent(repairedContent);
      
      store.addNotification({
        type: 'success',
        message: 'データの復元に成功しました。内容を確認してください。',
        autoHide: true,
        duration: 5000
      });
      
      console.log('[ErrorHandler] Data restoration successful');
      
    } catch (error) {
      console.error('[ErrorHandler] Data restoration failed:', error);
      
      const store = useAppStore.getState();
      store.addNotification({
        type: 'error',
        message: 'データの復元に失敗しました。手動でのデータ復旧が必要です。',
        autoHide: false,
        duration: 0
      });
    }
  };

  /**
   * JSON修復を試行
   */
  private attemptJsonRepair(content: string): string {
    // まずそのままパースを試行
    try {
      JSON.parse(content);
      return content; // 問題なし
    } catch {
      console.log('[ErrorHandler] JSON parse failed, attempting repair');
    }
    
    // 一般的なJSON破損パターンの修復を試行
    let repairedContent = content;
    
    // 末尾の不完全な構造を削除
    repairedContent = repairedContent.replace(/,\s*$/, '');
    repairedContent = repairedContent.replace(/{\s*$/, '');
    repairedContent = repairedContent.replace(/\[\s*$/, '');
    
    // 閉じ括弧の補完
    const openBraces = (repairedContent.match(/{/g) || []).length;
    const closeBraces = (repairedContent.match(/}/g) || []).length;
    const openBrackets = (repairedContent.match(/\[/g) || []).length;
    const closeBrackets = (repairedContent.match(/\]/g) || []).length;
    
    repairedContent += '}' .repeat(Math.max(0, openBraces - closeBraces));
    repairedContent += ']' .repeat(Math.max(0, openBrackets - closeBrackets));
    
    // 修復後の検証
    try {
      JSON.parse(repairedContent);
      return repairedContent;
    } catch {
      console.warn('[ErrorHandler] JSON repair failed, using default');
      return '{"version":"1.0.0","title":"復元されたマインドマップ","root":{"id":"root","title":"ルートノード","children":[]}}';
    }
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
  // configの安定性を確保するため、JSON文字列で比較
  const configKey = React.useMemo(() => config ? JSON.stringify(config) : null, [config]);
  const handler = React.useMemo(() => ErrorHandler.getInstance(config), [config, configKey]);

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