/**
 * Razzle configuration for Volto Hydra.
 * Extends Volto's razzle configuration.
 */
const voltoPath = './node_modules/@plone/volto';
const defaultVoltoRazzleConfig = require(`${voltoPath}/razzle.config`);

module.exports = {
  ...defaultVoltoRazzleConfig,
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
