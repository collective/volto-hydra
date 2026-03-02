import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import path from 'path';

export default defineConfig({
  plugins: [svelte()],
  resolve: {
    alias: {
      '$examples': path.resolve(__dirname, '../examples/svelte'),
      '$hydra': path.resolve(__dirname, '../../../packages/hydra-js/hydra.js'),
      '$schemas': path.resolve(__dirname, '../../../tests-playwright/fixtures/shared-block-schemas.js'),
    },
  },
});
