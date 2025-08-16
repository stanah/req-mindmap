import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  root: __dirname,  // extensionディレクトリをルートに設定
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/out/**',
      '**/build/**',
      '**/.vscode/**'
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*'],
      exclude: [
        '**/node_modules/**',
        '**/out/**',
        '**/test/**',
        '**/__tests__/**',
        '**/*.test.*',
        '**/*.spec.*',
        '**/*.d.ts',
        '**/*.config.*',
        '**/coverage/**',
        '**/dist/**',
        '**/build/**'
      ]
    },
    // VSCode拡張固有の設定
    setupFiles: [resolve(__dirname, './src/test/setup.ts')],  // 絶対パスで指定
    testTimeout: 10000
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      // monaco-editorの依存関係をモック
      'monaco-editor': resolve(__dirname, './src/test/mocks/monaco-editor.ts')
    }
  },
  // VSCodeモック用の設定
  define: {
    'process.env.NODE_ENV': '"test"'
  },
  // 外部依存関係の除外
  esbuild: {
    target: 'node16'
  },
  optimizeDeps: {
    exclude: ['monaco-editor']
  }
});