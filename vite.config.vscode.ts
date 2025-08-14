import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

/**
 * VSCode Webview用のVite設定
 * 通常のブラウザ版とは異なる設定でビルドする
 */
export default defineConfig({
  plugins: [react()],
  
  // VSCode Webview用の設定
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
    'process.env.VSCODE_WEBVIEW': JSON.stringify('true')
  },

  build: {
    // VSCode拡張用の出力設定
    outDir: 'dist/webview',
    emptyOutDir: true,
    
    // VSCode Webviewでは単一のHTMLファイルが必要
    rollupOptions: {
      input: resolve(__dirname, 'index.vscode.html'),
      output: {
        // VSCode Webviewでは相対パスを使用
        format: 'iife',
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]',
        inlineDynamicImports: true
      }
    },

    // VSCode Webviewのセキュリティ制限に対応
    target: 'es2020',
    minify: 'terser',
    
    // ソースマップを生成（デバッグ用）
    sourcemap: true
  },

  // VSCode Webview用の最適化
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'monaco-editor',
      'd3',
      'js-yaml',
      'ajv',
      'zustand'
    ]
  },

  // VSCode Webviewでは外部リソースの読み込みが制限される
  server: {
    // 開発時はVSCode拡張のローカルサーバーを使用
    port: 3001,
    strictPort: true
  },

  // パス解決の設定
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@platform': resolve(__dirname, 'src/platform')
    }
  },

  // CSS設定
  css: {
    modules: {
      localsConvention: 'camelCase'
    }
  }
});