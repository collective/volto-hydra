// Test config: same as vite.config.js but without mkcert/https (which fails in CI/test)
import path from 'path';
import vue from '@vitejs/plugin-vue';

const SRC_DIR = path.resolve(__dirname, './src');
const PUBLIC_DIR = path.resolve(__dirname, './public');
const BUILD_DIR = path.resolve(__dirname, './dist');
const HYDRA_JS_DIR = path.resolve(__dirname, '../../packages/hydra-js');

export default {
  plugins: [vue({
    template: {
      compilerOptions: {
        isCustomElement: (tag) => tag.startsWith('swiper-'),
      },
    },
  })],
  root: SRC_DIR,
  base: '',
  publicDir: PUBLIC_DIR,
  build: {
    outDir: BUILD_DIR,
    assetsInlineLimit: 0,
    emptyOutDir: true,
    rollupOptions: {
      treeshake: false,
    },
  },
  resolve: {
    alias: {
      '@': SRC_DIR,
      '@hydra-js/hydra.js': path.resolve(HYDRA_JS_DIR, 'hydra.src.js'),
      '@hydra-js': HYDRA_JS_DIR,
    },
  },
  server: {
    host: true,
  },
};
