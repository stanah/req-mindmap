import { useState, useEffect, useCallback } from 'react';
import { MindmapViewer } from './components/MindmapViewer';
import { AlertComponent } from '../components/shared/AlertComponent';
import ErrorBoundary from '../components/shared/ErrorBoundary';
import { useAppStore } from '../stores/appStore';
import { PlatformAdapterFactory } from '../platform';
import VSCodeApiSingleton from '../platform/vscode/VSCodeApiSingleton';
import '../index.css';

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
    
    // メッセージが不正な場合は無視
    if (!message || typeof message !== 'object' || !message.command) {
      console.warn('[VSCodeApp] Invalid message received:', message);
      return;
    }
    
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
    console.log('VSCodeApp初期化開始');
    console.log('window.initialData:', window.initialData);
    console.log('window.acquireVsCodeApi:', typeof window.acquireVsCodeApi);
    
    const singleton = VSCodeApiSingleton.getInstance();
    console.log('VSCodeApiSingleton.isAvailable():', singleton.isAvailable());
    
    if (singleton.isAvailable()) {
      const vscode = singleton.getApi();
      console.log('VSCode API取得成功:', !!vscode);
      
      // VSCodeからのメッセージを監視
      window.addEventListener('message', handleVSCodeMessage);
      
      // VSCode側に準備完了を通知
      if (vscode) {
        console.log('VSCodeに準備完了を通知中...');
        vscode.postMessage({
          command: 'webviewReady'
        });
      }
      
      // 初期ファイル内容を読み込み（VSCodeからの初期データ）
      if (window.initialData?.content) {
        const initialContent = window.initialData.content;
        console.log('初期ファイル内容を読み込み:', window.initialData.fileName, `(${initialContent.length}文字)`);
        console.log('初期ファイル内容（最初の100文字）:', initialContent.substring(0, 100));
        setCurrentContent(initialContent);
        
        // updateContentの結果を詳しくログ
        console.log('updateContentを呼び出します...');
        const result = updateContent(initialContent);
        console.log('updateContent完了:', result);
      } else {
        console.warn('window.initialDataが存在しないか、contentが空です');
        console.log('window.initialData:', window.initialData);
        console.log('window object keys:', Object.keys(window));
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
  }, [handleVSCodeMessage, updateContent, currentContent]);

  // アプリケーションの初期化
  useEffect(() => {
    console.log('アプリケーション初期化開始 - isVSCodeReady:', isVSCodeReady, 'initialized:', initialized);
    
    const initApp = async () => {
      try {
        if (!isVSCodeReady) {
          console.log('VSCodeがまだ準備できていません');
          return;
        }
        
        console.log('ストア初期化を開始...');
        await initialize();
        console.log('ストア初期化完了');
        
        // VSCode拡張用の設定
        const platformAdapter = PlatformAdapterFactory.getInstance();
        console.log('プラットフォームタイプ:', platformAdapter.getPlatformType());
        
        if (platformAdapter.getPlatformType() === 'vscode') {
          const editorAdapter = platformAdapter.editor;
          
          // エディタの内容変更を監視
          editorAdapter.onDidChangeContent((content: string) => {
            console.log('エディタ内容変更を検出:', content.length, '文字');
            setCurrentContent(content);
            updateContent(content, true); // fromVSCode: true
          });
        }
        
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
  }, [initialize, isVSCodeReady, initialized, addNotification, updateContent]);

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
        <ErrorBoundary
          fallback={
            <div className="mindmap-error">
              <h3>🗺️ マインドマップの表示でエラーが発生しました</h3>
              <p>マインドマップのレンダリング中にエラーが発生しました。</p>
              <button onClick={() => window.location.reload()}>
                リロード
              </button>
            </div>
          }
          onError={(error, errorInfo) => {
            console.error('MindmapViewer error:', error, errorInfo);
            addNotification({
              type: 'error',
              message: `マインドマップエラー: ${error.message}`,
              duration: 5000,
              autoHide: true
            });
          }}
        >
          <MindmapViewer />
        </ErrorBoundary>
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