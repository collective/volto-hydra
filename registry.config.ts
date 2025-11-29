/**
 * Registry configuration for Volto 18
 * Explicitly registers addons and packages for shadowing support
 */

export default {
  // Register addons that can be shadowed
  addons: [
    'volto-hydra',
    '@plone/volto-slate',
  ],

  // Core addons that are loaded by Volto
  coreAddons: [
    '@plone/volto-slate',
  ],
};
