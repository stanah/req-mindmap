/**
 * VSCode拡張専用マインドマップテーマ切り替えコンポーネント
 * マインドマップ表示のダークモード/ライトモードを切り替える
 */

import React, { useEffect, useState, useCallback } from 'react';
import { IoColorPalette } from 'react-icons/io5';

interface VSCodeThemeToggleProps {
  className?: string;
}

type Theme = 'light' | 'dark' | 'auto';

export const VSCodeThemeToggle: React.FC<VSCodeThemeToggleProps> = ({ className = '' }) => {
  const [theme, setTheme] = useState<Theme>('auto');

  // テーマの適用（シンプルに）
  const applyTheme = (selectedTheme: Theme) => {
    const root = document.documentElement;
    
    let effectiveTheme: 'light' | 'dark';
    if (selectedTheme === 'auto') {
      effectiveTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } else {
      effectiveTheme = selectedTheme;
    }
    
    root.setAttribute('data-theme', effectiveTheme);
  };

  // 初期化（一度だけ実行）
  useEffect(() => {
    // localStorageから設定を読み込み（VSCode拡張専用のキー）
    const savedTheme = localStorage.getItem('vscode-mindmap-theme') as Theme | null;
    const initialTheme = savedTheme || 'auto';
    setTheme(initialTheme);
  }, []);

  // テーマ変更時の処理
  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem('vscode-mindmap-theme', theme);
  }, [theme]);

  // システム設定の変更を監視（一度だけ設定）
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemThemeChange = () => {
      // 現在のテーマが'auto'の場合のみ再適用
      setTheme(currentTheme => {
        if (currentTheme === 'auto') {
          // stateを更新することで、上のuseEffectが自動で再実行される
          return 'auto';
        }
        return currentTheme;
      });
    };

    mediaQuery.addEventListener('change', handleSystemThemeChange);
    return () => mediaQuery.removeEventListener('change', handleSystemThemeChange);
  }, []);

  const handleThemeToggle = useCallback(() => {
    const themes: Theme[] = ['light', 'dark', 'auto'];
    const currentIndex = themes.indexOf(theme);
    const nextTheme = themes[(currentIndex + 1) % themes.length];
    setTheme(nextTheme);
  }, [theme]);

  const getThemeIcon = () => {
    switch (theme) {
      case 'light':
        return '☀️';
      case 'dark':
        return '🌙';
      case 'auto':
        const systemIsDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        return systemIsDark ? '🌙🔄' : '☀️🔄';
      default:
        return '🔄';
    }
  };

  const getThemeLabel = () => {
    switch (theme) {
      case 'light':
        return 'ライトモード';
      case 'dark':
        return 'ダークモード';
      case 'auto':
        return 'システム設定';
      default:
        return 'テーマ';
    }
  };

  return (
    <button
      className={`toolbar-button ${className}`}
      onClick={handleThemeToggle}
      title={`マインドマップテーマ切り替え (現在: ${getThemeLabel()})`}
      aria-label={`マインドマップテーマを切り替え (現在: ${getThemeLabel()})`}
      type="button"
    >
      <IoColorPalette size={16} />
      <span style={{ marginLeft: '4px', fontSize: '12px' }}>
        {getThemeIcon()}
      </span>
    </button>
  );
};