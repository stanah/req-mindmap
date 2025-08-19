/**
 * VSCode API型定義とメッセージバリデーション
 */

/**
 * VSCode WebViewからの基本メッセージ型
 */
export interface VSCodeMessage {
  command: string;
  [key: string]: any;
}

/**
 * VSCode WebViewへの基本メッセージ型
 */
export interface VSCodeWebViewMessage {
  command: string;
  data?: any;
  error?: any;
}

/**
 * 許可されたコマンド一覧
 */
export const ALLOWED_VSCODE_COMMANDS = {
  // WebView から拡張機能へ
  IN: {
    SAVE_FILE: 'saveFile',
    LOAD_FILE: 'loadFile',
    EXPORT_FILE: 'exportFile',
    SHOW_INFO: 'showInfo',
    SHOW_ERROR: 'showError',
    SHOW_WARNING: 'showWarning',
    SHOW_CONFIRMATION: 'showConfirmation',
    UPDATE_CONTENT: 'updateContent',
    UPDATE_DOCUMENT: 'updateDocument',
    WEBVIEW_READY: 'webviewReady',
    CONTENT_CHANGED: 'contentChanged',
    ERROR: 'error',
    APPLICATION_ERROR: 'applicationError',
    TEST: 'test',
    GET_CONFIG: 'getConfig',
    SET_CONFIG: 'setConfig',
    OPEN_EXTERNAL: 'openExternal',
    COPY_TO_CLIPBOARD: 'copyToClipboard'
  },
  // 拡張機能から WebView へ
  OUT: {
    CONTENT_LOADED: 'contentLoaded',
    FILE_SAVED: 'fileSaved',
    FILE_EXPORTED: 'fileExported',
    CONFIG_UPDATED: 'configUpdated',
    CONFIGURATION_CHANGED: 'configurationChanged',
    ERROR_OCCURRED: 'errorOccurred',
    THEME_CHANGED: 'themeChanged',
    READY: 'ready',
    INITIAL_CONTENT: 'initialContent',
    UNKNOWN_COMMAND: 'unknownCommand',
    INVALID_COMMAND: 'invalidCommand'
  }
} as const;

/**
 * VSCode API メッセージバリデーター
 */
export class VSCodeMessageValidator {
  /**
   * 拡張機能からWebViewへの受信メッセージを検証
   */
  static validateIncoming(message: any): message is VSCodeWebViewMessage {
    if (!message || typeof message !== 'object') {
      console.warn('[VSCode] Invalid message format: not an object');
      return false;
    }

    if (!message.command || typeof message.command !== 'string') {
      console.warn('[VSCode] Invalid message: missing or invalid command');
      return false;
    }

    const allowedCommands = Object.values(ALLOWED_VSCODE_COMMANDS.OUT);
    if (!allowedCommands.includes(message.command as any)) {
      console.warn('[VSCode] Invalid message: command not allowed:', message.command);
      return false;
    }

    return true;
  }

  /**
   * WebViewから拡張機能への送信メッセージを検証
   */
  static validateOutgoing(message: any): message is VSCodeMessage {
    if (!message || typeof message !== 'object') {
      console.warn('[VSCode] Invalid message format: not an object');
      return false;
    }

    if (!message.command || typeof message.command !== 'string') {
      console.warn('[VSCode] Invalid message: missing or invalid command');
      return false;
    }

    const allowedCommands = Object.values(ALLOWED_VSCODE_COMMANDS.IN);
    if (!allowedCommands.includes(message.command as any)) {
      console.warn('[VSCode] Invalid message: command not allowed:', message.command);
      return false;
    }

    return true;
  }

  /**
   * メッセージデータをサニタイズ
   */
  static sanitizeMessage(message: VSCodeMessage): VSCodeMessage {
    const sanitized: VSCodeMessage = {
      command: this.sanitizeString(message.command)
    };

    // データが存在する場合はサニタイズ
    if (message.data !== undefined) {
      sanitized.data = this.sanitizeData(message.data);
    }

    // 他のフィールドもサニタイズ
    for (const [key, value] of Object.entries(message)) {
      if (key !== 'command' && key !== 'data') {
        sanitized[key] = this.sanitizeData(value);
      }
    }

    return sanitized;
  }

  /**
   * 文字列をサニタイズ
   */
  private static sanitizeString(str: any): string {
    if (typeof str !== 'string') {
      return String(str);
    }

    return str
      .replace(/<script[^>]*>.*?<\/script>/gi, '') // スクリプトタグ除去
      .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '') // iframe除去
      .replace(/<object[^>]*>.*?<\/object>/gi, '') // object除去
      .replace(/<embed[^>]*>/gi, '') // embed除去
      .replace(/javascript:/gi, '') // javascript:プロトコル除去
      .replace(/on\w+\s*=/gi, '') // イベントハンドラー属性除去
      .trim();
  }

  /**
   * データをサニタイズ
   */
  private static sanitizeData(data: any): any {
    if (typeof data === 'string') {
      return this.sanitizeString(data);
    }

    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeData(item));
    }

    if (data && typeof data === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(data)) {
        sanitized[this.sanitizeString(key)] = this.sanitizeData(value);
      }
      return sanitized;
    }

    return data;
  }
}

// VSCode API型の拡張は VSCodeApiSingleton.ts で定義

export default VSCodeMessageValidator;