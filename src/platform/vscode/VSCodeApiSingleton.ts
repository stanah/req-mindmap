/**
 * VSCode API シングルトン
 * VSCode APIは一度しか取得できないため、アプリケーション全体で共有するシングルトン
 */

export interface VSCodeApi {
  postMessage: (message: unknown) => void;
  setState: (state: unknown) => void;
  getState: () => unknown;
}

declare global {
  interface Window {
    acquireVsCodeApi?: () => {
      postMessage: (message: unknown) => void;
      setState: (state: unknown) => void;
      getState: () => unknown;
    };
    vscodeApiInstance?: VSCodeApi;
    vscode?: VSCodeApi;
  }
}

class VSCodeApiSingleton {
  private static instance: VSCodeApiSingleton | null = null;
  private vscodeApi: VSCodeApi | null = null;
  private isInitialized = false;

  private constructor() {}

  static getInstance(): VSCodeApiSingleton {
    if (!VSCodeApiSingleton.instance) {
      VSCodeApiSingleton.instance = new VSCodeApiSingleton();
    }
    return VSCodeApiSingleton.instance;
  }

  /**
   * VSCode APIを取得（初回のみ実際にacquireVsCodeApiを呼び出し）
   */
  getApi(): VSCodeApi | null {
    if (!this.isInitialized) {
      this.initialize();
    }
    return this.vscodeApi;
  }

  /**
   * VSCode APIが利用可能かどうか
   */
  isAvailable(): boolean {
    return this.getApi() !== null;
  }

  /**
   * 初期化（一度だけ実行される）
   */
  private initialize(): void {
    if (this.isInitialized) {
      return;
    }

    this.isInitialized = true;

    try {
      // 最初にHTMLで設定されたAPIインスタンスをチェック
      if (typeof window !== 'undefined' && window.vscodeApiInstance) {
        console.log('[VSCodeApiSingleton] HTMLで設定済みのVSCode APIを使用');
        this.vscodeApi = window.vscodeApiInstance;
      } else if (typeof window !== 'undefined' && window.acquireVsCodeApi) {
        console.log('[VSCodeApiSingleton] VSCode API を取得中...');
        this.vscodeApi = window.acquireVsCodeApi();
        console.log('[VSCodeApiSingleton] VSCode API を正常に取得しました');
      } else {
        console.log('[VSCodeApiSingleton] VSCode API が利用できません（ブラウザモード）');
      }
    } catch (error) {
      console.error('[VSCodeApiSingleton] VSCode API の取得に失敗:', error);
      this.vscodeApi = null;
    }
  }

  /**
   * メッセージ送信の便利メソッド
   */
  postMessage(message: any): boolean {
    const api = this.getApi();
    if (api) {
      api.postMessage(message);
      return true;
    }
    console.warn('[VSCodeApiSingleton] メッセージ送信に失敗: VSCode API が利用できません');
    return false;
  }

  /**
   * 状態保存の便利メソッド
   */
  setState(state: any): boolean {
    const api = this.getApi();
    if (api) {
      api.setState(state);
      return true;
    }
    return false;
  }

  /**
   * 状態取得の便利メソッド
   */
  getState(): any {
    const api = this.getApi();
    return api ? api.getState() : null;
  }

  /**
   * ドキュメント更新をVSCodeエディタに送信
   */
  updateDocumentContent(content: string): boolean {
    return this.postMessage({
      command: 'updateDocument',
      content
    });
  }

  /**
   * エラーメッセージをVSCodeに送信
   */
  showError(message: string): boolean {
    return this.postMessage({
      command: 'showError',
      message
    });
  }

  /**
   * 情報メッセージをVSCodeに送信
   */
  showInformation(message: string): boolean {
    return this.postMessage({
      command: 'showInformation',
      message
    });
  }
}

export default VSCodeApiSingleton;