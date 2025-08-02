import { UIAdapter, ProgressReporter } from '../interfaces';

/**
 * ブラウザ環境でのUI操作実装
 * ブラウザのネイティブダイアログとカスタムUIを使用
 */
export class BrowserUIAdapter implements UIAdapter {
  private statusBarElement: HTMLElement | null = null;
  private statusBarTimeout: NodeJS.Timeout | null = null;

  constructor() {
    this.initializeStatusBar();
  }

  showInformationMessage(message: string): void {
    this.showNotification(message, 'info');
  }

  showWarningMessage(message: string): void {
    this.showNotification(message, 'warning');
  }

  showErrorMessage(message: string): void {
    this.showNotification(message, 'error');
  }

  async showConfirmDialog(message: string, options: string[]): Promise<string | null> {
    // ブラウザの確認ダイアログを使用（簡易実装）
    if (options.length === 2 && options.includes('はい') && options.includes('いいえ')) {
      const result = confirm(message);
      return result ? 'はい' : 'いいえ';
    }

    // より複雑な選択肢の場合は、カスタムダイアログを実装
    return this.showCustomDialog(message, options);
  }

  async withProgress<T>(title: string, task: (progress: ProgressReporter) => Promise<T>): Promise<T> {
    // プログレスバーを表示
    const progressElement = this.createProgressBar(title);
    document.body.appendChild(progressElement);

    const progressReporter: ProgressReporter = {
      report: (value) => {
        if (value.message) {
          const messageElement = progressElement.querySelector('.progress-message');
          if (messageElement) {
            messageElement.textContent = value.message;
          }
        }
        if (value.increment !== undefined) {
          const barElement = progressElement.querySelector('.progress-bar') as HTMLElement;
          if (barElement) {
            const currentWidth = parseInt(barElement.style.width) || 0;
            const newWidth = Math.min(100, currentWidth + value.increment);
            barElement.style.width = `${newWidth}%`;
          }
        }
      }
    };

    try {
      const result = await task(progressReporter);
      return result;
    } finally {
      // プログレスバーを削除
      document.body.removeChild(progressElement);
    }
  }

  showStatusBarMessage(message: string, timeout?: number): void {
    if (!this.statusBarElement) {
      return;
    }

    this.statusBarElement.textContent = message;
    this.statusBarElement.style.display = 'block';

    // 既存のタイムアウトをクリア
    if (this.statusBarTimeout) {
      clearTimeout(this.statusBarTimeout);
    }

    // 指定時間後にメッセージを非表示
    if (timeout) {
      this.statusBarTimeout = setTimeout(() => {
        if (this.statusBarElement) {
          this.statusBarElement.style.display = 'none';
        }
      }, timeout);
    }
  }

  /**
   * 通知を表示
   */
  private showNotification(message: string, type: 'info' | 'warning' | 'error'): void {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;

    // スタイルを設定
    Object.assign(notification.style, {
      position: 'fixed',
      top: '20px',
      right: '20px',
      padding: '12px 16px',
      borderRadius: '4px',
      color: 'white',
      fontSize: '14px',
      zIndex: '10000',
      maxWidth: '400px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      backgroundColor: this.getNotificationColor(type)
    });

    document.body.appendChild(notification);

    // 3秒後に自動削除
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 3000);

    // クリックで削除
    notification.addEventListener('click', () => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    });
  }

  /**
   * カスタムダイアログを表示
   */
  private showCustomDialog(message: string, options: string[]): Promise<string | null> {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'dialog-overlay';
      Object.assign(overlay.style, {
        position: 'fixed',
        top: '0',
        left: '0',
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: '10001'
      });

      const dialog = document.createElement('div');
      dialog.className = 'dialog';
      Object.assign(dialog.style, {
        backgroundColor: 'white',
        padding: '24px',
        borderRadius: '8px',
        minWidth: '300px',
        maxWidth: '500px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)'
      });

      const messageElement = document.createElement('p');
      messageElement.textContent = message;
      messageElement.style.marginBottom = '20px';
      dialog.appendChild(messageElement);

      const buttonContainer = document.createElement('div');
      buttonContainer.style.display = 'flex';
      buttonContainer.style.gap = '8px';
      buttonContainer.style.justifyContent = 'flex-end';

      options.forEach((option) => {
        const button = document.createElement('button');
        button.textContent = option;
        Object.assign(button.style, {
          padding: '8px 16px',
          border: '1px solid #ccc',
          borderRadius: '4px',
          backgroundColor: '#f5f5f5',
          cursor: 'pointer'
        });

        button.addEventListener('click', () => {
          document.body.removeChild(overlay);
          resolve(option);
        });

        buttonContainer.appendChild(button);
      });

      dialog.appendChild(buttonContainer);
      overlay.appendChild(dialog);
      document.body.appendChild(overlay);

      // オーバーレイクリックでキャンセル
      overlay.addEventListener('click', (event) => {
        if (event.target === overlay) {
          document.body.removeChild(overlay);
          resolve(null);
        }
      });
    });
  }

  /**
   * プログレスバーを作成
   */
  private createProgressBar(title: string): HTMLElement {
    const container = document.createElement('div');
    container.className = 'progress-container';
    Object.assign(container.style, {
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      backgroundColor: 'white',
      padding: '24px',
      borderRadius: '8px',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
      minWidth: '300px',
      zIndex: '10002'
    });

    const titleElement = document.createElement('h3');
    titleElement.textContent = title;
    titleElement.style.margin = '0 0 16px 0';
    container.appendChild(titleElement);

    const progressTrack = document.createElement('div');
    Object.assign(progressTrack.style, {
      width: '100%',
      height: '8px',
      backgroundColor: '#e0e0e0',
      borderRadius: '4px',
      overflow: 'hidden'
    });

    const progressBar = document.createElement('div');
    progressBar.className = 'progress-bar';
    Object.assign(progressBar.style, {
      width: '0%',
      height: '100%',
      backgroundColor: '#007acc',
      transition: 'width 0.3s ease'
    });

    progressTrack.appendChild(progressBar);
    container.appendChild(progressTrack);

    const messageElement = document.createElement('p');
    messageElement.className = 'progress-message';
    messageElement.style.margin = '12px 0 0 0';
    messageElement.style.fontSize = '14px';
    messageElement.style.color = '#666';
    container.appendChild(messageElement);

    return container;
  }

  /**
   * 通知の色を取得
   */
  private getNotificationColor(type: 'info' | 'warning' | 'error'): string {
    switch (type) {
      case 'info':
        return '#007acc';
      case 'warning':
        return '#ff9800';
      case 'error':
        return '#f44336';
      default:
        return '#007acc';
    }
  }

  /**
   * ステータスバーを初期化
   */
  private initializeStatusBar(): void {
    this.statusBarElement = document.createElement('div');
    this.statusBarElement.className = 'status-bar-message';
    Object.assign(this.statusBarElement.style, {
      position: 'fixed',
      bottom: '0',
      left: '0',
      right: '0',
      padding: '8px 16px',
      backgroundColor: '#007acc',
      color: 'white',
      fontSize: '14px',
      display: 'none',
      zIndex: '9999'
    });

    document.body.appendChild(this.statusBarElement);
  }

  /**
   * UIアダプターを破棄
   */
  dispose(): void {
    if (this.statusBarElement && this.statusBarElement.parentNode) {
      this.statusBarElement.parentNode.removeChild(this.statusBarElement);
    }
    if (this.statusBarTimeout) {
      clearTimeout(this.statusBarTimeout);
    }
  }
}