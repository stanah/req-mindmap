
import { Layout, EditorPane, MindmapPane } from './components';
import './App.css';

function App() {
  return (
    <Layout>
      <div className="app-content">
        <div className="editor-section">
          <EditorPane />
        </div>
        <div className="mindmap-section">
          <MindmapPane />
        </div>
      </div>
    </Layout>
  );
}

export default App;
