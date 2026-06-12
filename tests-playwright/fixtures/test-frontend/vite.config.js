import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  root: __dirname,
  server: {
    port: 8889,
    strictPort: true,
    // Bind on all interfaces so tests can reach the same server via both
    // http://localhost:8889 and http://127.0.0.1:8889 — different origins
    // to the browser, used by the publicURL-flatten test to simulate
    // switching between two frontends without standing up a second Vite
    // process.
    host: true,
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
