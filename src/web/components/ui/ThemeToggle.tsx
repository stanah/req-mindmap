import React, { useEffect, useState, useCallback } from 'react';
import './ThemeToggle.css';

interface ThemeToggleProps {
  className?: string;
}

type Theme = 'light' | 'dark' | 'auto';

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ className = '' }) => {
  const [theme, setTheme] = useState<Theme>('auto');
  
  // VSCode環境の検出
  const isVSCodeEnvironment = typeof window !== 'undefined' && 
    (window.vscode !== undefined || 'acquireVsCodeApi' in window);

  // システム設定の検出
  const getSystemTheme = (): 'light' | 'dark' => {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  };

  // 実際に適用するテーマの決定
  const getEffectiveTheme = useCallback((selectedTheme: Theme): 'light' | 'dark' => {
    if (selectedTheme === 'auto') {
      return getSystemTheme();
    }
    return selectedTheme;
  }, []);

  // テーマの適用
  const applyTheme = useCallback((selectedTheme: Theme) => {
    const effectiveTheme = getEffectiveTheme(selectedTheme);
    const root = document.documentElement;
    
    if (effectiveTheme === 'dark') {
      root.setAttribute('data-theme', 'dark');
    } else {
      root.setAttribute('data-theme', 'light');
    }
  }, [getEffectiveTheme]);

  // 初期化とシステム設定の監視
  useEffect(() => {
    // VSCode環境では何もしない（VSCodeThemeToggleが処理する）
    if (isVSCodeEnvironment) {
      console.log('VSCode environment detected, Web ThemeToggle is disabled');
      return;
    }
    
    // localStorageから設定を読み込み
    const savedTheme = localStorage.getItem('theme') as Theme | null;
    const initialTheme = savedTheme || 'auto';
    setTheme(initialTheme);
    applyTheme(initialTheme);

    // システム設定の変更を監視
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemThemeChange = () => {
      if (theme === 'auto') {
        applyTheme('auto');
      }
    };

    mediaQuery.addEventListener('change', handleSystemThemeChange);
    return () => mediaQuery.removeEventListener('change', handleSystemThemeChange);
  }, [applyTheme, theme, isVSCodeEnvironment]);

  // テーマ変更時の処理
  useEffect(() => {
    // VSCode環境では何もしない
    if (isVSCodeEnvironment) {
      return;
    }
    
    applyTheme(theme);
    localStorage.setItem('theme', theme);
  }, [theme, applyTheme, isVSCodeEnvironment]);

  const handleThemeChange = () => {
    // VSCode環境では何もしない
    if (isVSCodeEnvironment) {
      console.log('Theme change disabled in VSCode environment');
      return;
    }
    
    const themes: Theme[] = ['light', 'dark', 'auto'];
    const currentIndex = themes.indexOf(theme);
    const nextTheme = themes[(currentIndex + 1) % themes.length];
    setTheme(nextTheme);
  };

  const getThemeIcon = () => {
    const effectiveTheme = getEffectiveTheme(theme);
    switch (theme) {
      case 'light':
        return '☀️';
      case 'dark':
        return '🌙';
      case 'auto':
        return effectiveTheme === 'dark' ? '🌙🔄' : '☀️🔄';
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

  // VSCode環境では表示しない
  if (isVSCodeEnvironment) {
    return null;
  }

  return (
    <button
      className={`theme-toggle ${className}`}
      onClick={handleThemeChange}
      title={`現在: ${getThemeLabel()}`}
      aria-label={`テーマを切り替え (現在: ${getThemeLabel()})`}
      type="button"
    >
      <span className="theme-toggle__icon" aria-hidden="true">
        {getThemeIcon()}
      </span>
      <span className="theme-toggle__label">
        {getThemeLabel()}
      </span>
    </button>
  );
};

export default ThemeToggle;