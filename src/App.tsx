
import React, { useState } from 'react';
import { Layout, EditorPane, MindmapPane } from './components';
import { PanelResizer } from './components/PanelResizer';
import './App.css';

function App() {
  const [editorWidth, setEditorWidth] = useState(50); // パーセント

  const handleResize = (width: number) => {
    setEditorWidth(width);
  };

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
    </Layout>
  );
}

export default App;
