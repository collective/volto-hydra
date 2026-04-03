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
  },
  // SPA mode (default) — serves index.html for all unmatched routes
  // mock-parent.html is served directly as a static file
  resolve: {
    alias: {
      '/hydra.js': path.resolve(__dirname, '../../../packages/hydra-js/hydra.src.js'),
      '/build-block-path-map.js': path.resolve(__dirname, '../../../packages/hydra-js/buildBlockPathMap.js'),
      '/shared-block-schemas.js': path.resolve(__dirname, '../shared-block-schemas.js'),
    },
  },
});
