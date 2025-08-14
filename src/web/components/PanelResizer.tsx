import React, { useCallback, useRef, useState } from 'react';

interface PanelResizerProps {
  onResize: (width: number) => void;
  minWidth?: number;
  maxWidth?: number;
  className?: string;
}

export const PanelResizer: React.FC<PanelResizerProps> = ({
  onResize,
  minWidth = 300,
  maxWidth = 70,
  className = ''
}) => {
  const isDragging = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);
  const [isHovered, setIsHovered] = useState(false);

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
    document.body.classList.add('resizing');
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
    document.body.classList.remove('resizing');
  }, []);

  const handleDoubleClick = useCallback(() => {
    // ダブルクリックで50%にリセット
    onResize(50);
  }, [onResize]);

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
      className={`panel-resizer ${className} ${isHovered ? 'panel-resizer--hovered' : ''} ${isDragging.current ? 'panel-resizer--dragging' : ''}`}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      title="ドラッグしてパネルサイズを調整 | ダブルクリックで50%にリセット"
    >
      <div className="panel-resizer__handle">
        <div className="panel-resizer__dots">
          <div className="panel-resizer__dot"></div>
          <div className="panel-resizer__dot"></div>
          <div className="panel-resizer__dot"></div>
        </div>
      </div>
    </div>
  );
};