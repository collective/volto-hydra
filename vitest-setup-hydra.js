// Vitest setup for Hydra: apply volto-slate's plugin config so
// `settings.slate.extensions` is populated. Volto's own
// test-setup-config.jsx initialises the bare config registry but doesn't
// invoke addon applyConfig chains — for our slate-touching tests we need
// volto-slate's setup to run too (Markdown plugin sets slate.extensions).
import voltoSlateApplyConfig from '@plone/volto-slate';
import config from '@plone/volto/registry';

voltoSlateApplyConfig(config);
