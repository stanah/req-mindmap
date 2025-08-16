/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/req-mindmap/',
  build: {
    rollupOptions: {
      input: './index.html'
    }
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    // 成功テストのログを削減
    reporter: 'verbose',
    silent: false,
    logHeapUsage: false,
    // React act警告を含むテストログを削減
    onConsoleLog(log, type) {
      if (
        type === 'stderr' &&
        (log.includes('Warning: An update to') ||
         log.includes('act(...)') ||
         log.includes('was not wrapped in act'))
      ) {
        return false; // ログを表示しない
      }
      return true; // その他のログは表示
    },
    // extensionディレクトリを除外（独自のvitest設定を持つため）
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/extension/**',
      '**/.vscode/**'
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'clover'],
      include: ['src/**/*'],
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/build/**',
        '**/extension/**',
        '**/mcp-server/**',
        '**/.vscode/**',
        '**/test/**',
        '**/__tests__/**',
        '**/coverage/**',
        '**/*.test.*',
        '**/*.spec.*',
        '**/*.d.ts',
        '**/vite.config.*',
        '**/vitest.config.*',
        '**/eslint.config.*'
      ]
    }
  },
  resolve: {
    alias: {
      '@': '/src',
      // テスト環境でのmonaco-editor問題の解決
      ...(process.env.NODE_ENV === 'test' && {
        'monaco-editor': 'monaco-editor/esm/vs/editor/editor.api.js'
      })
    }
  }
})
