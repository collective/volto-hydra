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
    // Always resolve hydra.js and helpers from workspace source —
    // webpack bundles their deps (tabbable for hydra-js, none for helpers).
    // The copy:hydra script vendors a built copy into src/utils/ for
    // VSCode autocomplete, but webpack ignores that and uses these aliases.
    config.resolve.alias['#utils/hydra'] = path.resolve(
      __dirname,
      '../../packages/hydra-js/hydra.src.js',
    );
    config.resolve.alias['#utils/helpers'] = path.resolve(
      __dirname,
      '../../packages/helpers/index.js',
    );
    return config;
  },
};

export default nextConfig;
