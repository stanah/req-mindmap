import React, { useRef, useEffect } from 'react';
import { useAppStore } from '../stores';
import { useMindmapSync } from '../hooks';
import './MindmapPane.css';

export const MindmapPane: React.FC = () => {
  const svgRef = useRef<SVGSVGElement>(null);
  
  // 新しいZustandストアからの状態取得
  const parsedData = useAppStore(state => state.parse.parsedData);
  const mindmapSettings = useAppStore(state => state.ui.mindmapSettings);
  const updateMindmapSettings = useAppStore(state => state.updateMindmapSettings);
  
  // マインドマップ同期フックの使用
  const { updateMindmapSettings: syncUpdateSettings } = useMindmapSync();

  useEffect(() => {
    if (!svgRef.current || !parsedData) {
      return;
    }

    // TODO: D3.jsを使用したマインドマップの描画処理を実装
    // 現在はプレースホルダー
    console.log('Rendering mindmap with data:', parsedData);
    
    // SVGをクリア
    const svg = svgRef.current;
    while (svg.firstChild) {
      svg.removeChild(svg.firstChild);
    }

    // プレースホルダーテキストを表示
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', '50%');
    text.setAttribute('y', '50%');
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('dominant-baseline', 'middle');
    text.setAttribute('fill', '#666');
    text.setAttribute('font-size', '16');
    text.textContent = 'マインドマップがここに表示されます';
    svg.appendChild(text);

  }, [parsedData, mindmapSettings]);

  const handleZoomIn = () => {
    // TODO: ズームイン処理を実装
    console.log('Zoom in');
  };

  const handleZoomOut = () => {
    // TODO: ズームアウト処理を実装
    console.log('Zoom out');
  };

  const handleResetView = () => {
    // TODO: ビューリセット処理を実装
    console.log('Reset view');
  };

  const handleLayoutChange = (layout: 'tree' | 'radial') => {
    syncUpdateSettings({ layout });
  };

  return (
    <div className="mindmap-pane">
      <div className="mindmap-toolbar">
        <div className="zoom-controls">
          <button 
            className="toolbar-btn"
            onClick={handleZoomIn}
            title="ズームイン"
          >
            +
          </button>
          <button 
            className="toolbar-btn"
            onClick={handleZoomOut}
            title="ズームアウト"
          >
            -
          </button>
          <button 
            className="toolbar-btn"
            onClick={handleResetView}
            title="ビューをリセット"
          >
            ⌂
          </button>
        </div>
        
        <div className="layout-controls">
          <button
            className={`layout-btn ${mindmapSettings.layout === 'tree' ? 'active' : ''}`}
            onClick={() => handleLayoutChange('tree')}
            title="ツリーレイアウト"
          >
            ツリー
          </button>
          <button
            className={`layout-btn ${mindmapSettings.layout === 'radial' ? 'active' : ''}`}
            onClick={() => handleLayoutChange('radial')}
            title="放射状レイアウト"
          >
            放射状
          </button>
        </div>
      </div>
      
      <div className="mindmap-container">
        <svg
          ref={svgRef}
          className="mindmap-svg"
          width="100%"
          height="100%"
        >
          {/* D3.jsによる描画がここに追加される */}
        </svg>
      </div>
      
      {!parsedData && (
        <div className="empty-state">
          <div className="empty-state-content">
            <h3>マインドマップを表示するには</h3>
            <p>左側のエディタでJSON/YAMLファイルを編集するか、ファイルを読み込んでください。</p>
          </div>
        </div>
      )}
    </div>
  );
};