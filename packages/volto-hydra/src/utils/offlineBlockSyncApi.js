/**
 * Offline Block-Sync API — the surface block-sanity's bare-Node discovery needs.
 *
 * NOT used by the editor. block-sanity's `discover-blocks.cjs` esbuild-bundles
 * THIS entry (which pulls in blockSync.js + blockPath.js + the injected-config
 * seam) into one self-contained module, so the discovery can run Hydra's REAL
 * schema resolver offline to compute a block's DYNAMIC `required` set — instead
 * of a hand-rolled approximation. Bundling one entry keeps a single module
 * instance, so `setInjectedVoltoConfig` here and the seam blockPath.js reads are
 * the same holder.
 *
 * Why a bundle at all: blockSync.js / blockPath.js are idiomatic Volto source
 * (JSX in the context module, `import {get} from 'lodash'`, extensionless
 * imports) that bare Node can't load — esbuild transpiles them. The registry
 * coupling was already removed (injectedVoltoConfig), which is what makes a
 * clean bundle possible.
 */

export { setInjectedVoltoConfig } from './injectedVoltoConfig.js';
export {
  installChildBlockEnhancers,
  installVariationFieldEnhancers,
  populateTypeSchemaCache,
  resolveEffectiveBlockSchema,
} from './blockSync.js';
