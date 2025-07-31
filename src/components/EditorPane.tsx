import React, { useCallback } from 'react';
import Editor from '@monaco-editor/react';
import { useAppStore } from '../stores';
import { useEditorSync } from '../hooks';
import { debounce } from '../utils/helpers';
import { DEBOUNCE_DELAY } from '../utils/constants';
import './EditorPane.css';

export const EditorPane: React.FC = () => {
  // 新しいZustandストアからの状態取得
  const fileContent = useAppStore(state => state.file.fileContent);
  const editorSettings = useAppStore(state => state.ui.editorSettings);
  const parseErrors = useAppStore(state => state.parse.parseErrors);
  const updateContent = useAppStore(state => state.updateContent);
  const updateEditorSettings = useAppStore(state => state.updateEditorSettings);
  
  // エディタ同期フックの使用
  const { debouncedUpdateContent } = useEditorSync();

  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) {
      debouncedUpdateContent(value);
    }
  };

  const handleLanguageChange = (language: 'json' | 'yaml') => {
    updateEditorSettings({ language });
  };

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
          {/* TODO: フォーマット、検証などのボタンを追加 */}
        </div>
      </div>
      
      <div className="editor-container">
        <Editor
          height="100%"
          language={editorSettings.language}
          theme={editorSettings.theme === 'dark' ? 'vs-dark' : 'vs'}
          value={fileContent}
          onChange={handleEditorChange}
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
          }}
        />
      </div>
      
      {parseErrors.length > 0 && (
        <div className="error-panel">
          <div className="error-header">
            <span className="error-count">{parseErrors.length} エラー</span>
          </div>
          <div className="error-list">
            {parseErrors.map((error, index) => (
              <div key={index} className={`error-item ${error.severity}`}>
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