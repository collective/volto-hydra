const fs = require('fs');
const projectRootPath = __dirname;

let coreLocation;
if (fs.existsSync(`${projectRootPath}/core`))
  coreLocation = `${projectRootPath}/core`;
else if (fs.existsSync(`${projectRootPath}/../../core`))
  coreLocation = `${projectRootPath}/../../core`;

module.exports = {
  extends: `${coreLocation}/packages/volto/.eslintrc`,
  rules: {
    'import/no-unresolved': 1,
  },
  settings: {
    'import/resolver': {
      alias: {
        map: [
          ['@plone/volto', `${coreLocation}/packages/volto/src`],
          [
            '@plone/volto-slate',
            `${coreLocation}/core/packages/volto-slate/src`,
          ],
          ['@plone/registry', `${coreLocation}/packages/registry/src`],
          [
            'volto-hydra',
            './packages/volto-hydra/src',
          ],
        ],
        extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
      },
    },
  },
};
