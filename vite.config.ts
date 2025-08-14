/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/req-mindmap/',
  build: {
    rollupOptions: {
      input: './src/web/main.tsx'
    }
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
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
