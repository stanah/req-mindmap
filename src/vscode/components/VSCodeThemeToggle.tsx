/**
 * VSCode拡張専用テーマ切り替えコンポーネント
 * VSCodeのテーマシステムと協調して動作
 */

import React, { useEffect, useState, useCallback } from 'react';

interface VSCodeThemeToggleProps {
  className?: string;
}

export const VSCodeThemeToggle: React.FC<VSCodeThemeToggleProps> = ({ className = '' }) => {
  const [vscodeTheme, setVscodeTheme] = useState<'light' | 'dark'>('light');

  // VSCodeテーマの検出
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

  // VSCodeテーマをCSS変数に適用
  const applyVSCodeTheme = useCallback((theme: 'light' | 'dark') => {
    const root = document.documentElement;
    
    // VSCode拡張用のテーマクラス設定
    root.classList.remove('vscode-light', 'vscode-dark');
    root.classList.add(`vscode-${theme}`);
    
    // データ属性設定
    root.setAttribute('data-vscode-theme', theme);
    
    console.log(`VSCode theme applied: ${theme}`);
  }, []);

  // VSCodeからのテーマ変更メッセージを処理
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      if (message.command === 'themeChanged') {
        const newTheme = message.theme as 'light' | 'dark';
        setVscodeTheme(newTheme);
        applyVSCodeTheme(newTheme);
        console.log('Received theme change from VSCode:', newTheme);
      }
    };

    // VSCode環境でのみメッセージリスナーを追加
    if (window.vscode) {
      window.addEventListener('message', handleMessage);
      return () => window.removeEventListener('message', handleMessage);
    }
  }, [applyVSCodeTheme]);

  // 初期テーマの検出と設定
  useEffect(() => {
    let mounted = true;
    
    const initializeTheme = () => {
      if (!mounted) return;
      
      const detectedTheme = detectVSCodeTheme();
      setVscodeTheme(detectedTheme);
      applyVSCodeTheme(detectedTheme);
    };

    // 少し遅延させてVSCodeの初期化を待つ
    const timer = setTimeout(initializeTheme, 100);
    
    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, [detectVSCodeTheme, applyVSCodeTheme]);

  // MutationObserverでVSCodeのテーマ変更を監視
  useEffect(() => {
    let mounted = true;
    
    const observer = new MutationObserver((mutations) => {
      if (!mounted) return;
      
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && 
            (mutation.attributeName === 'class' || mutation.attributeName === 'data-theme')) {
          const newTheme = detectVSCodeTheme();
          if (newTheme !== vscodeTheme) {
            setVscodeTheme(newTheme);
            applyVSCodeTheme(newTheme);
          }
        }
      });
    });

    // bodyとdocumentElementの変更を監視
    observer.observe(document.body, { 
      attributes: true, 
      attributeFilter: ['class', 'data-theme'] 
    });
    
    observer.observe(document.documentElement, { 
      attributes: true, 
      attributeFilter: ['class', 'data-theme'] 
    });

    return () => {
      mounted = false;
      observer.disconnect();
    };
  }, [detectVSCodeTheme, applyVSCodeTheme, vscodeTheme]);

  // VSCodeにテーマ変更を要求
  const handleThemeToggle = useCallback(() => {
    // VSCodeのコマンドパレットを開いてテーマ選択を促す
    if (window.vscode) {
      window.vscode.postMessage({
        command: 'info',
        message: 'VSCodeのテーマ変更: Ctrl+K Ctrl+T でテーマ選択画面を開けます'
      });
      
      // VSCodeのテーマ選択コマンドを実行
      window.vscode.postMessage({
        command: 'requestThemeChange',
        theme: vscodeTheme === 'light' ? 'dark' : 'light'
      });
    } else {
      // VSCode環境でない場合はローカルで切り替え
      const newTheme = vscodeTheme === 'light' ? 'dark' : 'light';
      setVscodeTheme(newTheme);
      applyVSCodeTheme(newTheme);
    }
  }, [vscodeTheme, applyVSCodeTheme]);

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
      <span className="codicon codicon-symbol-color" aria-hidden="true"></span>
    </button>
  );
};