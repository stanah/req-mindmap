/**
 * グローバル型定義の拡張
 */

// VSCode拡張専用のグローバル型定義
declare global {

  // VSCode Webview用のグローバル変数
  interface Window {
    initialData?: {
      content: string;
      fileName: string;
      language: string;
      uri: string;
    };
    
    mindmapApp?: {
      updateContent: (content: string, fromVSCode?: boolean) => void;
      saveFile: () => void;
      getCurrentContent: () => string;
    };

    acquireVsCodeApi?: () => {
      postMessage: (message: unknown) => void;
      setState: (state: unknown) => void;
      getState: () => unknown;
    };

    vscodeApiInstance?: {
      postMessage: (message: unknown) => void;
      setState: (state: unknown) => void;
      getState: () => unknown;
    };
    vscode?: {
      postMessage: (message: unknown) => void;
      setState: (state: unknown) => void;
      getState: () => unknown;
    };
  }
}

export {};