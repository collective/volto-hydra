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
  webpack: (config) => {
    // Always resolve hydra.js from workspace source — webpack bundles tabbable
    config.resolve.alias['#utils/hydra'] = path.resolve(
      __dirname,
      '../../packages/hydra-js/hydra.src.js',
    );
    return config;
  },
};

export default nextConfig;
