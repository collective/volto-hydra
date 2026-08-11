// Vitest setup for Hydra: apply volto-slate's plugin config so
// `settings.slate.extensions` is populated. Volto's own
// test-setup-config.jsx initialises the bare config registry but doesn't
// invoke addon applyConfig chains — for our slate-touching tests we need
// volto-slate's setup to run too (Markdown plugin sets slate.extensions).
import voltoSlateApplyConfig from '@plone/volto-slate';
import config from '@plone/volto/registry';
import { applyBlockDefaults } from '@plone/volto/helpers';
import { setInjectedVoltoConfig } from './packages/volto-hydra/src/utils/injectedVoltoConfig.js';

voltoSlateApplyConfig(config);

// blockPath.js / blockSync.js no longer import `@plone/volto/registry`
// or `applyBlockDefaults` directly (so the offline block-sanity discovery can
// load them) — they read these via an injected seam. hydra's addon applyConfig
// sets it at runtime; mirror that here so the unit tests do too.
setInjectedVoltoConfig({
  applyBlockDefaults,
  getDefaultBlockType: () => config.settings.defaultBlockType,
  getBlocksConfig: () => config.blocks.blocksConfig,
});
