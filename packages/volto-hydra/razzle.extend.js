/**
 * Razzle extension for volto-hydra
 * Adds /health endpoint to webpack-dev-server for Playwright test readiness checks
 *
 * The /health endpoint checks both:
 * 1. Webpack compilation status (client-side)
 * 2. SSR server is actually accepting connections
 */

// Track compilation state for Playwright test readiness
let isCompiling = true; // Start as compiling (initial compilation)
let compilationError = null;

const plugins = (defaultPlugins) => {
  return defaultPlugins;
};

// The modify function is called by Volto's razzle.config.js
// It receives the current webpack config and should return the modified config
const modify = (config, { target, dev }, webpackConfig) => {
  // Only add health check for client-side dev builds
  if (target === 'web' && dev) {
    // Fix react-refresh-webpack-plugin bug in version 0.4.3
    // The plugin injects raw require() calls which don't work in browsers
    // Remove the ReactRefreshWebpackPlugin from the config
    config.plugins = (config.plugins || []).filter((plugin) => {
      // Filter out ReactRefreshWebpackPlugin
      return !plugin || !plugin.constructor || plugin.constructor.name !== 'ReactRefreshPlugin';
    });

    // Also disable react-refresh in babel-loader to prevent $RefreshSig$ errors
    // Find and modify the babel-loader rule
    const findBabelLoader = (rules) => {
      for (const rule of rules) {
        if (rule.oneOf) {
          const found = findBabelLoader(rule.oneOf);
          if (found) return found;
        }
        if (rule.use) {
          const loaders = Array.isArray(rule.use) ? rule.use : [rule.use];
          for (const loader of loaders) {
            const loaderPath = typeof loader === 'string' ? loader : loader.loader;
            if (loaderPath && loaderPath.includes('razzle-babel-loader')) {
              return loader;
            }
          }
        }
      }
      return null;
    };

    const babelLoader = findBabelLoader(config.module.rules);
    if (babelLoader && babelLoader.options) {
      babelLoader.options.shouldUseReactRefresh = false;
    }

    // Hook into webpack compiler to track compilation state
    config.plugins.push({
      apply: (compiler) => {
        compiler.hooks.invalid.tap('PlaywrightHealthCheck', () => {
          isCompiling = true;
          compilationError = null;
          console.log('[Health Check] Compilation started');
        });

        compiler.hooks.done.tap('PlaywrightHealthCheck', (stats) => {
          isCompiling = false;
          compilationError = stats.hasErrors() ? 'Compilation has errors' : null;
          console.log('[Health Check] Compilation complete', stats.hasErrors() ? '(with errors)' : '(success)');
        });

        compiler.hooks.failed.tap('PlaywrightHealthCheck', (error) => {
          isCompiling = false;
          compilationError = error.message || 'Compilation failed';
          console.log('[Health Check] Compilation failed:', error.message);
        });
      },
    });

    // Add health endpoint that returns 503 during compilation
    config.devServer = config.devServer || {};
    const originalSetupMiddlewares = config.devServer.setupMiddlewares;
    config.devServer.setupMiddlewares = (middlewares, devServer) => {
      if (!devServer) {
        throw new Error('webpack-dev-server is not defined');
      }

      // Add /health endpoint before other middlewares
      devServer.app.get('/health', (req, res) => {
        if (isCompiling) {
          res.status(503).send('Compiling...');
        } else if (compilationError) {
          res.status(500).send(`Compilation error: ${compilationError}`);
        } else {
          // Webpack compilation is done, check if SSR server on port 3001 is ready
          const http = require('http');
          let responded = false;

          const checkReq = http.get('http://localhost:3001/', () => {
            if (!responded) {
              responded = true;
              res.status(200).send('OK');
            }
          });

          checkReq.on('error', () => {
            if (!responded) {
              responded = true;
              res.status(503).send('SSR server not ready');
            }
          });

          checkReq.setTimeout(1000, () => {
            if (!responded) {
              responded = true;
              checkReq.destroy();
              res.status(503).send('SSR server timeout');
            }
          });
        }
      });

      // Call original setupMiddlewares if it exists
      if (originalSetupMiddlewares) {
        return originalSetupMiddlewares(middlewares, devServer);
      }
      return middlewares;
    };
  }

  return config;
};

module.exports = {
  plugins,
  modify,
};
