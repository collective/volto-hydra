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
      // In dev mode, resolve hydra.js from source so webpack bundles it
      // (resolves tabbable import). Changes are picked up on rebuild.
      // In production builds, copy:hydra copies the pre-built bundle.
      config.resolve.alias['#utils/hydra'] = path.resolve(
        __dirname,
        '../../packages/hydra-js/hydra.src.js',
      );
    }
    return config;
  },
};

export default nextConfig;
