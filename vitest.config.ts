/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: true,
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['extension/**/*', 'node_modules/**/*'],
  },
  resolve: {
    alias: {
      'monaco-editor': 'monaco-editor/esm/vs/editor/editor.api.js',
      // D3 modules mock for testing when not available
      'd3-selection': '/src/test/mocks/d3-selection.ts',
      'd3-zoom': '/src/test/mocks/d3-zoom.ts',
      'd3-hierarchy': '/src/test/mocks/d3-hierarchy.ts',
    },
  },
  define: {
    global: 'globalThis',
  },
});