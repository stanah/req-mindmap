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
