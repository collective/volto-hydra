
import path from 'path';
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite'
import mkcert from 'vite-plugin-mkcert'



const SRC_DIR = path.resolve(__dirname, './src');
const PUBLIC_DIR = path.resolve(__dirname, './public');
const BUILD_DIR = path.resolve(__dirname, './dist',);

export default {
  plugins: [
    vue(),
    mkcert(),  
  ],
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
    },
  },
  server: {
    host: true,
    https: true,
    cors: {
      origin: "https://hydra.pretagov.com"
    }
  },

};

