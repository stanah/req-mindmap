/**
 * VSCode拡張用ツールバーUI
 * ズーム、レイアウト切り替え、ノード操作ボタンなど
 */

import React from 'react';
import { NodeActionButtons } from './NodeActionButtons';
import { ThemeToggle } from '../../web/components/ui/ThemeToggle';
import type { MindmapData } from '../../types';
import type { MindmapCore } from '../../core';
import './Toolbar.css';

interface ToolbarProps {
  selectedNodeId: string | null;
  data: MindmapData | null;
  rendererRef: React.RefObject<MindmapCore | null>;
  onAddChild: (nodeId: string) => void;
  onAddSibling: (nodeId: string) => void;
  onDeleteNode: (nodeId: string) => void;
  onTogglePanel: () => void;
  isPanelVisible: boolean;
  zoomLevel?: number;
  onZoomChange?: (level: number) => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  selectedNodeId,
  data,
  rendererRef,
  onAddChild,
  onAddSibling,
  onDeleteNode,
  onTogglePanel,
  isPanelVisible,
  zoomLevel = 100,
  onZoomChange
}) => {

  // ズームイン
  const handleZoomIn = () => {
    if (rendererRef.current) {
      rendererRef.current.zoomIn();
      const newLevel = Math.min(zoomLevel + 25, 500);
      onZoomChange?.(newLevel);
    }
  };

  // ズームアウト
  const handleZoomOut = () => {
    if (rendererRef.current) {
      rendererRef.current.zoomOut();
      const newLevel = Math.max(zoomLevel - 25, 25);
      onZoomChange?.(newLevel);
    }
  };

  // ズームリセット
  const handleZoomReset = () => {
    if (rendererRef.current) {
      rendererRef.current.resetView();
      onZoomChange?.(100);
    }
  };

  // 全体表示
  const handleFitToView = () => {
    if (rendererRef.current) {
      rendererRef.current.fitToView();
      onZoomChange?.(100);
    }
  };

  // 選択ノードにフォーカス
  const handleFocusSelected = () => {
    if (rendererRef.current && selectedNodeId) {
      rendererRef.current.focusNode(selectedNodeId);
    }
  };

  // 全ノード展開
  const handleExpandAll = () => {
    if (rendererRef.current) {
      rendererRef.current.expandAll();
    }
  };

  // 全ノード折りたたみ
  const handleCollapseAll = () => {
    if (rendererRef.current) {
      rendererRef.current.collapseAll();
    }
  };

  return (
    <div className="toolbar">
      {/* 左側: ノード操作 */}
      <div className="toolbar-section toolbar-left">
        <NodeActionButtons
          selectedNodeId={selectedNodeId}
          data={data?.root || null}
          onAddChild={onAddChild}
          onAddSibling={onAddSibling}
          onDeleteNode={onDeleteNode}
          className="toolbar-node-actions"
        />
        
        <div className="toolbar-separator" />
        
        {/* レイアウト操作 */}
        <button 
          className="toolbar-button"
          onClick={handleExpandAll}
          title="全て展開 (Ctrl+E)"
          aria-label="全ノード展開"
        >
          <span className="codicon codicon-expand-all"></span>
        </button>
        
        <button 
          className="toolbar-button"
          onClick={handleCollapseAll}
          title="全て折りたたみ (Ctrl+Shift+E)"
          aria-label="全ノード折りたたみ"
        >
          <span className="codicon codicon-collapse-all"></span>
        </button>
        
        <button
          className="toolbar-button"
          onClick={handleFocusSelected}
          disabled={!selectedNodeId}
          title="選択ノードにフォーカス (F)"
          aria-label="選択ノードにフォーカス"
        >
          <span className="codicon codicon-target"></span>
        </button>
      </div>

      {/* 中央: ズーム操作 */}
      <div className="toolbar-section toolbar-center">
        <button
          className="toolbar-button"
          onClick={handleZoomOut}
          title="ズームアウト (Ctrl+-)"
          aria-label="ズームアウト"
        >
          <span className="codicon codicon-zoom-out"></span>
        </button>
        
        <button
          className="toolbar-button zoom-level"
          onClick={handleZoomReset}
          title="ズームリセット (Ctrl+0)"
          aria-label="ズームリセット"
        >
          {zoomLevel}%
        </button>
        
        <button
          className="toolbar-button"
          onClick={handleZoomIn}
          title="ズームイン (Ctrl++)"
          aria-label="ズームイン"
        >
          <span className="codicon codicon-zoom-in"></span>
        </button>
        
        <div className="toolbar-separator" />
        
        <button
          className="toolbar-button"
          onClick={handleFitToView}
          title="全体表示 (Ctrl+Shift+0)"
          aria-label="全体表示"
        >
          <span className="codicon codicon-screen-full"></span>
        </button>
      </div>

      {/* 右側: 表示切り替え */}
      <div className="toolbar-section toolbar-right">
        <button
          className={`toolbar-button ${isPanelVisible ? 'active' : ''}`}
          onClick={onTogglePanel}
          title="詳細パネル切り替え (Ctrl+I)"
          aria-label="詳細パネル切り替え"
        >
          <span className="codicon codicon-info"></span>
        </button>
        
        <div className="toolbar-separator" />
        
        <ThemeToggle className="toolbar-theme-toggle" />
      </div>
    </div>
  );
};