import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// VSCode拡張環境用のメインエントリーポイント
import { PlatformAdapterFactory } from './platform';
import { VSCodePlatformAdapter } from './platform/vscode/VSCodePlatformAdapter';
import VSCodeApiSingleton from './platform/vscode/VSCodeApiSingleton';

// VSCode環境の検出と設定
if (typeof window !== 'undefined' && 'acquireVsCodeApi' in window) {
  // VSCode拡張環境用のアダプターを設定
  // 現在はまだ実装されていないため、ブラウザアダプターを使用
  console.log('VSCode拡張環境で実行中（開発版）');
  
  // 将来的にVSCodeアダプターが実装されたら以下のコメントを解除
  // const vscodeAdapter = new VSCodePlatformAdapter();
  // PlatformAdapterFactory.setInstance(vscodeAdapter);
}

// VSCode Webview用のグローバル関数を設定
declare global {
  interface Window {
    mindmapApp: {
      updateContent: (content: string) => void;
      saveFile: () => void;
      getCurrentContent: () => string;
    };
    vscode: any;
  }
}

// アプリケーションの初期化
async function initializeApp() {
  try {
    // プラットフォームアダプターの初期化
    const platformAdapter = PlatformAdapterFactory.getInstance();
    await platformAdapter.initialize();
    
    console.log(`プラットフォーム: ${platformAdapter.getPlatformType()}`);
    
    // Reactアプリケーションのマウント
    const root = ReactDOM.createRoot(
      document.getElementById('root') as HTMLElement
    );
    
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
    
    // VSCode拡張との通信用のグローバル関数を設定
    window.mindmapApp = {
      updateContent: (content: string) => {
        // エディタ内容の更新処理
        console.log('VSCodeからの内容更新:', content);
        // 実際の更新処理は各コンポーネントで実装
      },
      
      saveFile: () => {
        // ファイル保存処理
        console.log('VSCodeからの保存要求');
        // 実際の保存処理は各コンポーネントで実装
      },
      
      getCurrentContent: () => {
        // 現在の内容を取得
        console.log('VSCodeから内容取得要求');
        // 実際の取得処理は各コンポーネントで実装
        return '';
      }
    };
    
    // VSCode拡張に準備完了を通知
    if (window.vscode) {
      window.vscode.postMessage({
        command: 'appInitialized',
        timestamp: new Date().toISOString()
      });
    }
    
  } catch (error) {
    console.error('アプリケーションの初期化に失敗しました:', error);
    
    // VSCode拡張にエラーを通知
    const singleton = VSCodeApiSingleton.getInstance();
    if (singleton.isAvailable()) {
      singleton.postMessage({
        command: 'initializationError',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
}

// アプリケーションの初期化を実行
initializeApp();