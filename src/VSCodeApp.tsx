import { useState, useEffect, useCallback } from 'react';
import { MindmapPane } from './components';
import { AlertComponent } from './components/ui/AlertComponent';
import { useAppStore } from './stores/appStore';
import { PlatformAdapterFactory } from './platform';
import VSCodeApiSingleton from './platform/vscode/VSCodeApiSingleton';
import './App.css';

/**
 * VSCode拡張用のアプリケーションコンポーネント
 * マインドマップのプレビューのみを表示（エディタはVSCode側で管理）
 */
function VSCodeApp() {
  const { 
    initialize,
    initialized,
    ui: { isLoading, loadingMessage },
    file: { fileContent },
    addNotification,
    updateContent
  } = useAppStore();

  const [isVSCodeReady, setIsVSCodeReady] = useState(false);
  const [currentContent, setCurrentContent] = useState('');

  // VSCode側との通信処理
  const handleVSCodeMessage = useCallback((event: MessageEvent) => {
    const message = event.data;
    
    switch (message.command) {
      case 'updateContent':
        // VSCode側からのコンテンツ更新
        setCurrentContent(message.content);
        updateContent(message.content, true); // fromVSCode: true
        break;
        
      case 'configurationChanged':
        // VSCode設定の変更
        console.log('VSCode設定が変更されました:', message.configuration);
        break;
        
      case 'themeChanged':
        // VSCodeテーマの変更
        console.log('VSCodeテーマが変更されました');
        // テーマ変更の処理をここに追加
        break;
        
      default:
        console.log('未知のVSCodeメッセージ:', message);
    }
  }, [updateContent]);

  // VSCode APIの初期化
  useEffect(() => {
    const singleton = VSCodeApiSingleton.getInstance();
    if (singleton.isAvailable()) {
      const vscode = singleton.getApi();
      
      // VSCodeからのメッセージを監視
      window.addEventListener('message', handleVSCodeMessage);
      
      // VSCode側に準備完了を通知
      if (vscode) {
        vscode.postMessage({
          command: 'webviewReady'
        });
      }
      
      // 初期ファイル内容を読み込み（VSCodeからの初期データ）
      if (window.initialData?.content) {
        const initialContent = window.initialData.content;
        console.log('初期ファイル内容を読み込み:', window.initialData.fileName, `(${initialContent.length}文字)`);
        setCurrentContent(initialContent);
        updateContent(initialContent);
      }
      
      setIsVSCodeReady(true);
      
      // VSCode用のグローバル関数を設定
      window.mindmapApp = {
        updateContent: (content: string) => {
          setCurrentContent(content);
          updateContent(content, true); // fromVSCode: true
        },
        
        saveFile: () => {
          console.log('保存要求を受信（現在は自動保存）');
        },
        
        getCurrentContent: () => {
          return currentContent;
        }
      };
      
      console.log('VSCode Webview通信が初期化されました');
      
      return () => {
        window.removeEventListener('message', handleVSCodeMessage);
      };
    } else {
      console.warn('VSCode API が利用できません');
      setIsVSCodeReady(true); // ブラウザモードとして続行
    }
  }, [handleVSCodeMessage, updateContent]);

  // アプリケーションの初期化
  useEffect(() => {
    const initApp = async () => {
      try {
        if (!isVSCodeReady) return;
        
        await initialize();
        
        // VSCode拡張用の設定
        const platformAdapter = PlatformAdapterFactory.getInstance();
        if (platformAdapter.getPlatformType() === 'vscode') {
          const editorAdapter = platformAdapter.editor;
          
          // エディタの内容変更を監視
          editorAdapter.onDidChangeContent((content: string) => {
            setCurrentContent(content);
            updateContent(content);
          });
        }
        
        addNotification({
          type: 'success',
          message: 'VSCode拡張でマインドマップビューアが準備完了',
          duration: 3000,
          autoHide: true
        });
        
      } catch (error) {
        console.error('VSCodeアプリの初期化に失敗:', error);
        addNotification({
          type: 'error',
          message: `初期化エラー: ${error instanceof Error ? error.message : String(error)}`,
          duration: 5000,
          autoHide: true
        });
      }
    };

    initApp();
  }, [initialize, isVSCodeReady, addNotification, updateContent]);

  // ローディング中の表示
  if (!initialized || isLoading) {
    return (
      <div className="vscode-app loading">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <div className="loading-message">
            {loadingMessage || 'VSCodeマインドマップビューアを初期化中...'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="vscode-app">
      {/* アラート表示 */}
      <AlertComponent />
      
      {/* メインのマインドマップビュー */}
      <div className="vscode-content">
        <MindmapPane />
      </div>
      
      {/* VSCode用のステータス表示 */}
      <div className="vscode-status">
        <span className="status-indicator">
          {isVSCodeReady ? '🔗 VSCode連携中' : '⚠️ ブラウザモード'}
        </span>
        {fileContent && (
          <span className="content-status">
            📊 データ読み込み済み
          </span>
        )}
      </div>
    </div>
  );
}

export default VSCodeApp;