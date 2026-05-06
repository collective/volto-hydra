import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  root: __dirname,
  server: {
    port: 8889,
    strictPort: true,
    headers: {
      'Content-Security-Policy': 'frame-ancestors *',
    },
    // Warm up hydra.js on startup so first test doesn't hit cold compile
    warmup: {
      clientFiles: [
        path.resolve(__dirname, '../../../packages/hydra-js/hydra.src.js'),
      ],
    },
  },
  // Pre-bundle tabbable dependency to avoid on-demand resolution delay
  optimizeDeps: {
    include: ['tabbable'],
  },
  resolve: {
    alias: {
      '/hydra.js': path.resolve(__dirname, '../../../packages/hydra-js/hydra.src.js'),
      '/build-block-path-map.js': path.resolve(__dirname, '../../../packages/hydra-js/buildBlockPathMap.js'),
      '/shared-block-schemas.js': path.resolve(__dirname, '../shared-block-schemas.js'),
    },
  },
});
