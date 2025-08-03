import React, { useCallback, useRef, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import type * as monaco from 'monaco-editor';
import { useAppStore } from '../stores';
import { useEditorSync } from '../hooks';
import './EditorPane.css';

export const EditorPane: React.FC = () => {
  // Zustandストアからの状態取得
  const fileContent = useAppStore(state => state.file.fileContent);
  const editorSettings = useAppStore(state => state.ui.editorSettings);
  const parseErrors = useAppStore(state => state.parse.parseErrors);
  const editorHighlightRange = useAppStore(state => state.ui.editorHighlightRange);
  const updateEditorSettings = useAppStore(state => state.updateEditorSettings);
  const updateEditorCursorPosition = useAppStore(state => state.updateEditorCursorPosition);
  const setEditorHighlight = useAppStore(state => state.setEditorHighlight);
  
  // エディタ同期フックの使用
  const { debouncedUpdateContent } = useEditorSync();
  
  // Monaco Editorのインスタンス参照
  const editorRef = useRef<any | null>(null);

  // エラーマーカーの更新
  const updateErrorMarkers = useCallback(async () => {
    if (!editorRef.current) return;

    const model = editorRef.current.getModel();
    if (!model) return;

    // 動的にmonaco-editorをインポート（テスト環境対応）
    const monaco = await import('monaco-editor').catch(() => {
      // テスト環境やモジュール解決エラーのフォールバック
      return {
        editor: {
          setModelMarkers: () => {},
        },
        MarkerSeverity: {
          Error: 8,
          Warning: 4,
          Info: 2,
          Hint: 1,
        },
        MarkerTag: {
          Unnecessary: 1,
        },
      };
    });

    // パーサーエラーのマーカーをクリア
    monaco.editor.setModelMarkers(model, 'parser', []);

    // パースエラーがある場合、マーカーを設定
    if (parseErrors.length > 0) {
      const markers: any[] = parseErrors.map(error => ({
        severity: error.severity === 'error' 
          ? monaco.MarkerSeverity.Error 
          : monaco.MarkerSeverity.Warning,
        startLineNumber: error.line,
        startColumn: error.column,
        endLineNumber: error.line,
        endColumn: Math.min(error.column + 20, model.getLineMaxColumn(error.line)), // 行末を超えないように調整
        message: error.message,
        source: 'parser',
        tags: [monaco.MarkerTag.Unnecessary], // エラー箇所を視覚的に強調
      }));

      monaco.editor.setModelMarkers(model, 'parser', markers);
    }
  }, [parseErrors]);

  // リアルタイム構文チェック
  const performSyntaxCheck = useCallback((content: string) => {
    if (!editorRef.current) return;

    const model = editorRef.current.getModel();
    if (!model) return;

    // ParserServiceを使用してリアルタイム構文チェック
    import('../services').then(({ parserService }) => {
      const syntaxErrors = parserService.getParseErrors(content);
      
      // 構文エラーのマーカーを設定（テスト環境対応）
      import('monaco-editor').then((monacoModule) => {
        const markers: monaco.editor.IMarkerData[] = syntaxErrors.map(error => ({
          severity: error.severity === 'error' 
            ? monacoModule.MarkerSeverity.Error 
            : monacoModule.MarkerSeverity.Warning,
          startLineNumber: error.line,
          startColumn: error.column,
          endLineNumber: error.line,
          endColumn: error.column + 10,
          message: error.message,
          source: 'syntax-checker',
        }));

        monacoModule.editor.setModelMarkers(model, 'syntax-checker', markers);
      }).catch(() => {
        // テスト環境では何もしない
      });
    }).catch(() => {
      // テスト環境ではparserServiceが利用できない場合は無視
    });
  }, []);

  // エディタのマウント時の処理
  const handleEditorDidMount = useCallback((editor: monaco.editor.IStandaloneCodeEditor) => {
    editorRef.current = editor;
    
    // エディタの設定を適用
    editor.updateOptions({
      fontSize: editorSettings.fontSize,
      wordWrap: editorSettings.wordWrap ? 'on' : 'off',
      minimap: { enabled: editorSettings.minimap },
      automaticLayout: true,
      formatOnPaste: true,
      formatOnType: true,
      scrollBeyondLastLine: false,
      renderWhitespace: 'selection',
      bracketPairColorization: { enabled: true },
      guides: {
        bracketPairs: true,
        indentation: true,
      },
      // JSON/YAML特有の設定
      tabSize: editorSettings.language === 'yaml' ? 2 : 4,
      insertSpaces: true,
      detectIndentation: false,
    });

    // カーソル位置変更のリスナー
    editor.onDidChangeCursorPosition((e: monaco.editor.ICursorPositionChangedEvent) => {
      updateEditorCursorPosition({
        line: e.position.lineNumber,
        column: e.position.column,
      });
    });

    // キーボードショートカットの設定（動的monaco import対応）
    import('monaco-editor').then((monacoModule) => {
      editor.addCommand(monacoModule.KeyMod.CtrlCmd | monacoModule.KeyCode.KeyS, () => {
        // 保存処理（将来的に実装）
        console.log('保存ショートカットが押されました');
      });

      editor.addCommand(monacoModule.KeyMod.CtrlCmd | monacoModule.KeyCode.KeyF, () => {
        // フォーマット処理
        editor.getAction('editor.action.formatDocument')?.run();
      });
    }).catch(() => {
      // テスト環境では何もしない
    });

    // エラーマーカーの初期化
    updateErrorMarkers();

    // ホバープロバイダーの登録（動的monaco import対応）
    let hoverProvider: any = null;
    import('monaco-editor').then((monacoModule) => {
      hoverProvider = monacoModule.languages.registerHoverProvider(
        [editorSettings.language],
        {
          provideHover: (model, position) => {
            // 現在の位置にエラーがあるかチェック
            const markers = monacoModule.editor.getModelMarkers({ resource: model.uri });
            const errorAtPosition = markers.find(marker => 
              marker.startLineNumber <= position.lineNumber &&
              marker.endLineNumber >= position.lineNumber &&
              marker.startColumn <= position.column &&
              marker.endColumn >= position.column
            );

            if (errorAtPosition) {
              return {
                range: new monacoModule.Range(
                  errorAtPosition.startLineNumber,
                  errorAtPosition.startColumn,
                  errorAtPosition.endLineNumber,
                  errorAtPosition.endColumn
                ),
                contents: [
                  { value: `**${errorAtPosition.severity === monacoModule.MarkerSeverity.Error ? 'エラー' : '警告'}**` },
                  { value: errorAtPosition.message },
                  { value: `行 ${errorAtPosition.startLineNumber}, 列 ${errorAtPosition.startColumn}` }
                ]
              };
            }

            return null;
          }
        }
      );
    }).catch(() => {
      // テスト環境では何もしない
    });

    // クリーンアップ関数でプロバイダーを解除
    return () => {
      if (hoverProvider && hoverProvider.dispose) {
        hoverProvider.dispose();
      }
    };
  }, [editorSettings, updateErrorMarkers, updateEditorCursorPosition]);

  // エディタの内容変更時の処理
  const handleEditorChange = useCallback((value: string | undefined) => {
    if (value !== undefined) {
      debouncedUpdateContent(value);
      
      // リアルタイム構文チェック（デバウンス付き）
      setTimeout(() => {
        performSyntaxCheck(value);
      }, 300);
    }
  }, [debouncedUpdateContent, performSyntaxCheck]);

  // 言語変更時の処理
  const handleLanguageChange = useCallback((language: 'json' | 'yaml') => {
    updateEditorSettings({ language });
    
    // エディタのタブサイズを言語に応じて調整
    if (editorRef.current) {
      editorRef.current.updateOptions({
        tabSize: language === 'yaml' ? 2 : 4,
      });
    }
  }, [updateEditorSettings]);

  // フォーマット処理
  const handleFormat = useCallback(() => {
    if (editorRef.current) {
      editorRef.current.getAction('editor.action.formatDocument')?.run();
    }
  }, []);

  // パースエラーの変更を監視してマーカーを更新
  useEffect(() => {
    updateErrorMarkers();
  }, [parseErrors, updateErrorMarkers]);

  // エディタ設定の変更を監視してエディタに反映
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.updateOptions({
        fontSize: editorSettings.fontSize,
        wordWrap: editorSettings.wordWrap ? 'on' : 'off',
        minimap: { enabled: editorSettings.minimap },
        tabSize: editorSettings.language === 'yaml' ? 2 : 4,
      });
    }
  }, [editorSettings]);

  // ハイライト範囲の変更を監視してエディタに反映
  useEffect(() => {
    if (!editorRef.current) return;

    const editor = editorRef.current;
    const model = editor.getModel();
    if (!model) return;

    // 既存のハイライトをクリア（動的monaco import使用）
    import('monaco-editor').then((monacoModule) => {
      monacoModule.editor.setModelMarkers(model, 'node-highlight', []);
    }).catch(() => {
      // テスト環境では何もしない
    });

    if (editorHighlightRange) {
      // 新しいハイライトを設定（動的monaco import使用）
      import('monaco-editor').then((monacoModule) => {
        const markers: monaco.editor.IMarkerData[] = [{
          severity: monacoModule.MarkerSeverity.Info,
          startLineNumber: editorHighlightRange.startLine,
          startColumn: editorHighlightRange.startColumn,
          endLineNumber: editorHighlightRange.endLine,
          endColumn: editorHighlightRange.endColumn,
          message: `選択されたノードに対応する箇所`,
          source: 'node-highlight',
          tags: [monacoModule.MarkerTag.Unnecessary], // 視覚的にハイライト
        }];

        monacoModule.editor.setModelMarkers(model, 'node-highlight', markers);
      }).catch(() => {
        // テスト環境では何もしない
      });

      // ハイライト箇所にスクロール
      if (editorHighlightRange.reason === 'node-selection') {
        editor.revealLineInCenter(editorHighlightRange.startLine);
        
        // 一定時間後にハイライトをクリア（オプション）
        setTimeout(() => {
          setEditorHighlight(null);
        }, 3000);
      }
    }
  }, [editorHighlightRange, setEditorHighlight]);

  return (
    <div className="editor-pane">
      <div className="editor-toolbar">
        <div className="language-selector">
          <button
            className={`language-btn ${editorSettings.language === 'json' ? 'active' : ''}`}
            onClick={() => handleLanguageChange('json')}
          >
            JSON
          </button>
          <button
            className={`language-btn ${editorSettings.language === 'yaml' ? 'active' : ''}`}
            onClick={() => handleLanguageChange('yaml')}
          >
            YAML
          </button>
        </div>
        <div className="editor-actions">
          <button
            className="action-btn"
            onClick={handleFormat}
            title="フォーマット (Ctrl+F)"
          >
            フォーマット
          </button>
        </div>
      </div>
      
      <div className="editor-container">
        <Editor
          height="100%"
          language={editorSettings.language}
          theme={editorSettings.theme === 'vs-dark' ? 'vs-dark' : 'vs'}
          value={fileContent}
          onChange={handleEditorChange}
          onMount={handleEditorDidMount}
          options={{
            fontSize: editorSettings.fontSize,
            wordWrap: editorSettings.wordWrap ? 'on' : 'off',
            minimap: { enabled: editorSettings.minimap },
            automaticLayout: true,
            formatOnPaste: true,
            formatOnType: true,
            scrollBeyondLastLine: false,
            renderWhitespace: 'selection',
            bracketPairColorization: { enabled: true },
            guides: {
              bracketPairs: true,
              indentation: true,
            },
            tabSize: editorSettings.language === 'yaml' ? 2 : 4,
            insertSpaces: true,
            detectIndentation: false,
            // JSON/YAML特有の設定
            folding: true,
            foldingStrategy: 'indentation',
            showFoldingControls: 'always',
            // 自動補完とIntelliSense
            quickSuggestions: {
              other: true,
              comments: false,
              strings: true,
            },
            suggestOnTriggerCharacters: true,
            acceptSuggestionOnEnter: 'on',
            // エラー表示
            renderValidationDecorations: 'on',
            // エラーハイライト設定
            glyphMargin: true,
            // ホバー設定
            hover: {
              enabled: true,
              delay: 300,
              sticky: true,
            },
          }}
        />
      </div>
      
      {parseErrors.length > 0 && (
        <div className="error-panel">
          <div className="error-header">
            <span className="error-count">{parseErrors.length} エラー</span>
            <button
              className="error-clear-btn"
              onClick={() => {
                // 全てのエラーマーカーをクリア
                if (editorRef.current) {
                  const model = editorRef.current.getModel();
                  if (model) {
                    import('monaco-editor').then((monacoModule) => {
                      monacoModule.editor.setModelMarkers(model, 'parser', []);
                      monacoModule.editor.setModelMarkers(model, 'syntax-checker', []);
                    }).catch(() => {
                      // テスト環境では何もしない
                    });
                  }
                }
              }}
              title="エラーマーカーをクリア"
            >
              クリア
            </button>
          </div>
          <div className="error-list">
            {parseErrors.map((error, index) => (
              <div 
                key={index} 
                className={`error-item ${error.severity}`}
                onClick={() => {
                  // エラー箇所にジャンプ
                  if (editorRef.current) {
                    editorRef.current.setPosition({
                      lineNumber: error.line,
                      column: error.column,
                    });
                    editorRef.current.focus();
                    
                    // エラー箇所を中央に表示
                    editorRef.current.revealLineInCenter(error.line);
                  }
                }}
                title="クリックしてエラー箇所にジャンプ"
              >
                <span className="error-location">
                  行 {error.line}, 列 {error.column}:
                </span>
                <span className="error-message">{error.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};