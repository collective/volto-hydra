import { beforeAll, afterAll, beforeEach, describe, it, expect } from 'vitest';
import { resolveTarget, type Target } from '../targets';

let target: Target;

beforeAll(async () => {
  target = await resolveTarget();
  await target.start();
});

afterAll(async () => {
  await target.stop();
});

beforeEach(async () => {
  await target.seed();
});

/**
 * One representative intent per capability. If an adapter advertises the
 * capability, this call must work; if it does not, the call must fail cleanly
 * rather than half-working.
 */
const PROBES: Record<string, () => Promise<unknown>> = {
  content: () =>
    target.adapter.dispatch('content.get', { path: '/news/first-post' }),
  'search-fulltext': () => target.adapter.dispatch('search', { query: 'First' }),
  'search-filter': () => target.adapter.dispatch('tree.list', { parent: '/news' }),
  vocabulary: () =>
    target.adapter.dispatch('vocabulary.get', {
      name: target.vocabularies.categories,
      limit: 1,
    }),
  schema: () => target.adapter.dispatch('types.list', {}),
  asset: () =>
    target.adapter.dispatch('asset.imageUrl', {
      path: '/news/first-post',
      field: 'image',
      scale: 'preview',
    }),
  workflow: () => target.adapter.dispatch('workflow.get', { path: '/about' }),
  versioning: () => target.adapter.dispatch('revisions.list', { path: '/about' }),
  sharing: () => target.adapter.dispatch('permissions.get', { path: '/about' }),
  comments: () => target.adapter.dispatch('comments.list', { path: '/about' }),
};

describe('advertised capabilities are real', () => {
  it('declares at least one capability', () => {
    expect(target.adapter.capabilities.length).toBeGreaterThan(0);
  });

  for (const capability of Object.keys(PROBES)) {
    it(`${capability}: behaviour matches what the adapter advertises`, async () => {
      const advertised = target.adapter.capabilities.includes(capability as any);

      if (!advertised) {
        // An unadvertised capability must say so, not 500 or silently return
        // an empty result that the UI would render as "no items".
        await expect(PROBES[capability]()).rejects.toMatchObject({
          code: 'NOT_IMPLEMENTED',
        });
        return;
      }

      // Advertised: the intent must resolve, OR fail for a reason about THIS
      // request rather than about the feature being absent. asset.imageUrl on
      // a document with no image is a legitimate NOT_FOUND, for instance.
      try {
        await PROBES[capability]();
      } catch (err: any) {
        expect(err.code).not.toBe('NOT_IMPLEMENTED');
        expect(err.code).toBeDefined();
      }
    });
  }
});
