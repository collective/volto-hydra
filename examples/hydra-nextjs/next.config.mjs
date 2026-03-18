import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  productionBrowserSourceMaps: true,
  reactStrictMode: false,
  eslint: {
    ignoreDuringBuilds: true,
  },
  webpack: (config, { dev }) => {
    if (dev) {
      // In dev mode, resolve hydra.js directly from source for live reload
      // without needing to re-run copy:hydra after each change.
      // In production builds, the copy:hydra script (prebuild) copies it to
      // ./src/utils/hydra.js which the #utils/hydra import map resolves to.
      config.resolve.alias['#utils/hydra'] = path.resolve(
        __dirname,
        '../../packages/hydra-js/hydra.js',
      );
    }
    return config;
  },
};

export default nextConfig;
