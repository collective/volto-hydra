/**
 * Razzle configuration for Volto Hydra.
 * Extends Volto's razzle configuration.
 */
const voltoPath = './node_modules/@plone/volto';
const defaultVoltoRazzleConfig = require(`${voltoPath}/razzle.config`);

module.exports = {
  ...defaultVoltoRazzleConfig,
  options: {
    ...defaultVoltoRazzleConfig.options,
    // Read PORT at RUNTIME, not baked at build time. Razzle's DefinePlugin inlines
    // process.env.* unless the var is in forceRuntimeEnvVars (razzle env.js). Without
    // this, `razzle build` bakes the build-time PORT into build/server.js
    // (start-server.js: `process.env.PORT || 3000`), pinning the prod admin build to one
    // port — serving on another needs a full rebuild. Listing PORT here leaves it as a
    // runtime lookup, so `PORT=<n> pnpm start:prod` binds <n> from the SAME build.
    forceRuntimeEnvVars: [
      ...(defaultVoltoRazzleConfig.options?.forceRuntimeEnvVars || []),
      'PORT',
    ],
  },
  modifyWebpackConfig: (opts) => {
    let config = defaultVoltoRazzleConfig.modifyWebpackConfig
      ? defaultVoltoRazzleConfig.modifyWebpackConfig(opts)
      : opts.webpackConfig;

    // Enable better sourcemaps in development
    if (opts.env.dev && opts.env.target === 'web') {
      config.devtool = 'eval-source-map';
    }

    // Enable source maps for production server to debug SSR errors
    if (!opts.env.dev && opts.env.target === 'node') {
      config.devtool = 'source-map';
    }

    return config;
  },
};
