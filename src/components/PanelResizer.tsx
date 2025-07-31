import React, { useCallback, useRef } from 'react';

interface PanelResizerProps {
  onResize: (width: number) => void;
  minWidth?: number;
  maxWidth?: number;
}

export const PanelResizer: React.FC<PanelResizerProps> = ({
  onResize,
  minWidth = 300,
  maxWidth = 70
}) => {
  const isDragging = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    startX.current = e.clientX;
    
    // 現在の幅を取得
    const appContent = document.querySelector('.app-content') as HTMLElement;
    const editorSection = document.querySelector('.editor-section') as HTMLElement;
    if (appContent && editorSection) {
      const appWidth = appContent.offsetWidth;
      const currentWidth = editorSection.offsetWidth;
      startWidth.current = (currentWidth / appWidth) * 100;
    }

    document.body.style.cursor = 'ew-resize';
    document.body.style.userSelect = 'none';
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging.current) return;

    const appContent = document.querySelector('.app-content') as HTMLElement;
    if (!appContent) return;

    const deltaX = e.clientX - startX.current;
    const appWidth = appContent.offsetWidth;
    const deltaPercent = (deltaX / appWidth) * 100;
    const newWidthPercent = startWidth.current + deltaPercent;

    // 最小幅・最大幅の制限をパーセントに変換
    const minWidthPercent = (minWidth / appWidth) * 100;
    const maxWidthPercent = maxWidth;

    // 制限内に収める
    const clampedWidth = Math.max(minWidthPercent, Math.min(maxWidthPercent, newWidthPercent));
    
    onResize(clampedWidth);
  }, [onResize, minWidth, maxWidth]);

  const handleMouseUp = useCallback(() => {
    if (!isDragging.current) return;
    
    isDragging.current = false;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, []);

  React.useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  return (
    <div 
      className="panel-resizer"
      onMouseDown={handleMouseDown}
    />
  );
};