
import { useState, useEffect } from 'react';
import { Layout, EditorPane, MindmapPane } from './components';
import { PanelResizer } from './components/PanelResizer';
import { AlertComponent } from './components/ui/AlertComponent';
import { useAppStore } from './stores/appStore';
import { settingsService } from './services/settingsService';
import './App.css';
import './components/ui/AlertComponent.css';

function App() {
  const { 
    initialize,
    initialized,
    ui: { isLoading, loadingMessage, panelSizes },
    updatePanelSizes,
    addNotification 
  } = useAppStore();
  
  const [editorWidth, setEditorWidth] = useState(panelSizes?.editor || 50); // パーセント

  // アプリケーション初期化
  useEffect(() => {
    const initializeApp = async () => {
      try {
        await initialize();
        
        // セッション状態からパネルサイズを復元
        const sessionState = settingsService.loadSessionState();
        if (sessionState.panelSizes) {
          setEditorWidth(sessionState.panelSizes.editor);
        }
        
        // ウィンドウ閉じる前の処理を登録
        const handleBeforeUnload = () => {
          const currentState = useAppStore.getState();
          
          // 現在の状態をセッションに保存
          settingsService.saveSessionState({
            lastFileContent: currentState.file.fileContent || undefined,
            lastOpenFile: currentState.file.currentFile || undefined,
            lastSelectedNodeId: currentState.ui.selectedNodeId || undefined,
            panelSizes: {
              editor: editorWidth,
              mindmap: 100 - editorWidth,
            },
          });
        };
        
        window.addEventListener('beforeunload', handleBeforeUnload);
        
        // クリーンアップ関数を返す
        return () => {
          window.removeEventListener('beforeunload', handleBeforeUnload);
        };
        
      } catch (error) {
        console.error('Failed to initialize app:', error);
        addNotification({
          message: 'アプリケーションの初期化中にエラーが発生しました',
          type: 'error',
          autoHide: false,
        });
      }
    };

    initializeApp();
  }, [initialize, addNotification, editorWidth]);

  // パネルサイズ変更時の処理
  const handleResize = (width: number) => {
    setEditorWidth(width);
    
    // ストアにも反映
    updatePanelSizes({
      editor: width,
      mindmap: 100 - width,
    });
    
    // セッション状態を即座に保存
    settingsService.saveSessionState({
      panelSizes: {
        editor: width,
        mindmap: 100 - width,
      },
    });
  };

  // 初期化完了前の表示
  if (!initialized || isLoading) {
    return (
      <div className="app-loading">
        <div className="loading-spinner">
          <div className="spinner"></div>
        </div>
        <div className="loading-message">
          {loadingMessage || 'アプリケーションを初期化中...'}
        </div>
      </div>
    );
  }

  return (
    <Layout>
      <div className="app-content">
        <div 
          className="editor-section"
          style={{ flex: `0 0 ${editorWidth}%` }}
        >
          <EditorPane />
        </div>
        <PanelResizer onResize={handleResize} />
        <div className="mindmap-section">
          <MindmapPane />
        </div>
      </div>
      
      {/* アラートコンポーネント */}
      <AlertComponent />
    </Layout>
  );
}

export default App;
