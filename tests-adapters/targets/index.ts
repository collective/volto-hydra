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

export async function resolveTarget(): Promise<Target> {
  const name = process.env.TARGET ?? 'plone';
  const mod = await import(`./${name}.ts`);
  return mod.default as Target;
}
