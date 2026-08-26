import type { HydraAdapter } from '@volto-hydra/hydra-types';

/**
 * A conformance target is one CMS the contract suite can run against.
 *
 * Every target seeds itself from the same tests-adapters/fixtures/seed.json,
 * so the suite's assertions refer to the seed rather than to per-CMS literals.
 * If an assertion needs a CMS-specific value to pass, the abstraction has
 * leaked and that is the finding.
 */
export interface Target {
  name: string;
  /** Capabilities the suite may exercise. Anything absent must reject. */
  capabilities: string[];
  /**
   * Canonical seed type -> this CMS's real type name (Plone 'Document',
   * WP 'post', Drupal 'page'). Assertions compare against this rather than
   * hardcoding a portal type.
   */
  types: Record<string, string>;
  /** Boot the backing CMS (or mock) and seed it. */
  start(): Promise<void>;
  stop(): Promise<void>;
  /** Reset content to the seed state between test files. */
  seed(): Promise<void>;
  adapter: HydraAdapter;
}

/**
 * Explicit registry rather than a computed import: vite cannot statically
 * analyse `import(`./${name}.ts`)` against its own directory, and an unknown
 * TARGET should fail with a list of what exists rather than a module-not-found.
 */
const TARGETS: Record<string, () => Promise<{ default: Target }>> = {
  plone: () => import('./plone'),
};

export async function resolveTarget(): Promise<Target> {
  const name = process.env.TARGET ?? 'plone';
  const load = TARGETS[name];
  if (!load) {
    throw new Error(
      `Unknown TARGET '${name}'. Available: ${Object.keys(TARGETS).join(', ')}`,
    );
  }
  const mod = await load();
  return mod.default;
}
