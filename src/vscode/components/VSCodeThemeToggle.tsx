/**
 * VSCode拡張専用テーマ切り替えコンポーネント
 * 無限ループを回避するシンプルな実装
 */

import React, { useEffect, useState, useCallback } from 'react';
import { IoColorPalette } from 'react-icons/io5';

interface VSCodeThemeToggleProps {
  className?: string;
}

export const VSCodeThemeToggle: React.FC<VSCodeThemeToggleProps> = ({ className = '' }) => {
  const [vscodeTheme, setVscodeTheme] = useState<'light' | 'dark'>('light');
  const [isInitialized, setIsInitialized] = useState(false);

  // VSCodeテーマの検出（一度だけ）
  const detectVSCodeTheme = useCallback((): 'light' | 'dark' => {
    // VSCode環境での検出方法
    const bodyClasses = document.body.classList;
    const htmlClasses = document.documentElement.classList;
    
    // VSCodeのクラス名を確認
    if (bodyClasses.contains('vscode-dark') || 
        htmlClasses.contains('vscode-dark') ||
        bodyClasses.contains('vs-dark')) {
      return 'dark';
    }
    
    if (bodyClasses.contains('vscode-light') || 
        htmlClasses.contains('vscode-light') ||
        bodyClasses.contains('vs')) {
      return 'light';
    }

    // CSS変数での検出（フォールバック）
    const computedStyle = getComputedStyle(document.documentElement);
    const bgColor = computedStyle.getPropertyValue('--vscode-editor-background') || 
                   computedStyle.getPropertyValue('background-color');
    
    if (bgColor) {
      // RGB値を解析してテーマを判定
      const rgb = bgColor.match(/\d+/g);
      if (rgb) {
        const brightness = (parseInt(rgb[0]) + parseInt(rgb[1]) + parseInt(rgb[2])) / 3;
        return brightness > 128 ? 'light' : 'dark';
      }
    }

    // デフォルトはlight
    return 'light';
  }, []);

  // 初期化時のテーマ検出（一度だけ実行）
  useEffect(() => {
    if (isInitialized) return;
    
    const timer = setTimeout(() => {
      const detectedTheme = detectVSCodeTheme();
      setVscodeTheme(detectedTheme);
      setIsInitialized(true);
      console.log(`Initial VSCode theme detected: ${detectedTheme}`);
    }, 100);

    return () => clearTimeout(timer);
  }, [detectVSCodeTheme, isInitialized]);

  // VSCodeからのテーマ変更メッセージを処理（メッセージベースのみ）
  useEffect(() => {
    if (!window.vscode) return;

    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      if (message.command === 'themeChanged') {
        const newTheme = message.theme as 'light' | 'dark';
        console.log('Received theme change from VSCode:', newTheme);
        setVscodeTheme(newTheme);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // VSCodeテーマ選択画面を開く
  const handleThemeToggle = useCallback(() => {
    console.log('Theme toggle clicked');
    
    if (window.vscode) {
      // VSCodeのテーマ選択コマンドを実行
      window.vscode.postMessage({
        command: 'requestThemeChange',
        currentTheme: vscodeTheme
      });
    } else {
      // VSCode環境でない場合は手動で切り替え（デバッグ用）
      const newTheme = vscodeTheme === 'light' ? 'dark' : 'light';
      setVscodeTheme(newTheme);
      console.log(`Manual theme toggle: ${newTheme}`);
    }
  }, [vscodeTheme]);

  const getThemeLabel = () => {
    return vscodeTheme === 'dark' ? 'ダークモード' : 'ライトモード';
  };

  return (
    <button
      className={`toolbar-button ${className}`}
      onClick={handleThemeToggle}
      title={`テーマ切り替え (現在: ${getThemeLabel()})`}
      aria-label={`テーマを切り替え (現在: ${getThemeLabel()})`}
      type="button"
    >
      <IoColorPalette size={16} />
    </button>
  );
};