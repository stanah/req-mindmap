import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import dts from 'vite-plugin-dts';

/**
 * ライブラリエクスポート用のVite設定
 * マインドマップビューアコンポーネントを他のプロジェクトから利用可能にする
 */
export default defineConfig({
  plugins: [
    react(),
    dts({
      include: ['src/index.ts', 'src/core/**/*.ts', 'src/vscode/**/*.tsx', 'src/types/**/*.ts'],
      exclude: ['**/*.test.*', '**/__tests__/**', '**/test/**']
    })
  ],
  
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'ReqMindmap',
      formats: ['es', 'cjs'],
      fileName: (format) => `index.${format === 'es' ? 'esm' : format === 'cjs' ? 'cjs' : 'js'}`
    },
    
    rollupOptions: {
      // 外部依存関係として扱う（バンドルに含めない）
      external: [
        'react',
        'react-dom',
        'react/jsx-runtime',
        'd3',
        'zustand',
        'ajv',
        'ajv-formats',
        'js-yaml',
        'yaml',
        'zod'
      ],
      output: {
        globals: {
          'react': 'React',
          'react-dom': 'ReactDOM',
          'd3': 'D3',
          'zustand': 'Zustand',
          'ajv': 'Ajv',
          'js-yaml': 'jsyaml',
          'yaml': 'YAML',
          'zod': 'Zod'
        }
      }
    },
    
    // TypeScript型定義ファイルの出力
    emptyOutDir: true,
    outDir: 'dist',
    target: 'es2020',
    minify: 'terser',
    sourcemap: true
  },

  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  }
});