/**
 * グローバル型定義の拡張
 */

// File System Access APIの型拡張
declare global {
  interface FileSystemFileHandle {
    queryPermission?(descriptor?: { mode?: 'read' | 'readwrite' }): Promise<PermissionState>;
    requestPermission?(descriptor?: { mode?: 'read' | 'readwrite' }): Promise<PermissionState>;
  }
  
  // ブラウザAPIの型定義
  function showOpenFilePicker(options?: {
    types?: Array<{
      description: string;
      accept: Record<string, string[]>;
    }>;
    excludeAcceptAllOption?: boolean;
    multiple?: boolean;
  }): Promise<FileSystemFileHandle[]>;

  function showSaveFilePicker(options?: {
    types?: Array<{
      description: string;
      accept: Record<string, string[]>;
    }>;
    excludeAcceptAllOption?: boolean;
    suggestedName?: string;
  }): Promise<FileSystemFileHandle>;

  // VSCode Webview用のグローバル変数
  interface Window {
    initialData?: {
      content: string;
      fileName: string;
      language: string;
      uri: string;
    };
    
    mindmapApp?: {
      updateContent: (content: string) => void;
      saveFile: () => void;
      getCurrentContent: () => string;
    };

    acquireVsCodeApi?: () => {
      postMessage: (message: unknown) => void;
      setState: (state: unknown) => void;
      getState: () => unknown;
    };

    vscodeApiInstance?: any;
    vscode?: any;
  }
}

export {};