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
        // D3を個別モジュールとして外部化（tree-shaking対応）
        /^d3-/,
        'd3',
        'zustand',
        'ajv',
        'ajv-formats',
        'js-yaml',
        'yaml',
        'zod'
      ],
      output: {
        // tree-shaking最適化のためのマニュアルチャンク分割
        manualChunks: (id) => {
          // D3関連モジュールを分離
          if (id.includes('d3-')) {
            return 'd3-modules';
          }
          // ユーティリティ関数群
          if (id.includes('src/utils/')) {
            return 'utilities';
          }
          // コアロジック
          if (id.includes('src/core/')) {
            return 'core';
          }
          // プラットフォームアダプター
          if (id.includes('src/platform/')) {
            return 'platform';
          }
          // デフォルトチャンク
          return null;
        },
        globals: {
          'react': 'React',
          'react-dom': 'ReactDOM',
          'd3': 'D3',
          'd3-selection': 'D3Selection',
          'd3-zoom': 'D3Zoom',
          'd3-hierarchy': 'D3Hierarchy',
          'd3-tree': 'D3Tree',
          'd3-shape': 'D3Shape',
          'zustand': 'Zustand',
          'ajv': 'Ajv',
          'js-yaml': 'jsyaml',
          'yaml': 'YAML',
          'zod': 'Zod'
        },
        // tree-shaking最適化
        preserveModules: false,
        exports: 'named',
        interop: 'auto'
      },
      
      // tree-shaking最適化設定
      treeshake: {
        moduleSideEffects: false,
        propertyReadSideEffects: false,
        annotations: true
      }
    },
    
    // TypeScript型定義ファイルの出力
    emptyOutDir: true,
    outDir: 'dist',
    target: 'es2020',
    minify: 'terser',
    sourcemap: true,
    
    // tree-shaking最適化
    assetsInlineLimit: 4096,
    chunkSizeWarningLimit: 500
  },

  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  }
});