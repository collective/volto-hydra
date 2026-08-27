import { beforeAll, afterAll, beforeEach, describe, it, expect } from 'vitest';
import { resolveTarget, type Target } from '../targets';

let target: Target;

beforeAll(async () => {
  target = await resolveTarget();
  await target.start();
}, 240_000);

afterAll(async () => {
  await target.stop();
});

beforeEach(async () => {
  await target.seed();
});

/**
 * Listings.
 *
 * Measured over a real editing session, the query-index endpoint is the second
 * busiest call after schema — every listing, search and teaser block consults
 * it. It is also the surface most likely to be quietly Plone-shaped, because
 * Plone's querystring DSL is idiosyncratic and it is tempting to pass it
 * straight through.
 */

describe('querystring.getIndexes', () => {
  it('describes each queryable index', async () => {
    const res: any = await target.adapter.dispatch(
      'querystring.getIndexes',
      {},
    );
    expect(typeof res.indexes).toBe('object');
    expect(Object.keys(res.indexes).length).toBeGreaterThan(0);

    for (const [name, index] of Object.entries<any>(res.indexes)) {
      expect(typeof name).toBe('string');
      expect(typeof index.title).toBe('string');
      expect(typeof index.enabled).toBe('boolean');
      expect(typeof index.sortable).toBe('boolean');
      expect(Array.isArray(index.operations)).toBe(true);
    }
  });

  it('offers the indexes the target says it supports', async () => {
    const res: any = await target.adapter.dispatch(
      'querystring.getIndexes',
      {},
    );
    for (const index of Object.values(target.queryIndexes)) {
      expect(Object.keys(res.indexes)).toContain(index);
    }
  });
});

describe('querystringSearch', () => {
  it('filters by content type', async () => {
    const res: any = await target.adapter.dispatch('querystringSearch', {
      query: [
        {
          i: target.queryIndexes.type,
          o: 'selection.any',
          v: [target.types.page],
        },
      ],
    });
    expect(res.items.length).toBeGreaterThan(0);
    for (const item of res.items) {
      expect(item.type).toBe(target.types.page);
    }
  });

  it('filters by path, returning only the subtree', async () => {
    const res: any = await target.adapter.dispatch('querystringSearch', {
      query: [
        { i: target.queryIndexes.path, o: 'string.absolutePath', v: '/news' },
      ],
    });
    expect(res.items.length).toBeGreaterThan(0);
    for (const item of res.items) {
      expect(item.path.startsWith('/news')).toBe(true);
    }
  });

  it('filters by title substring', async () => {
    // Every adapter advertises a contains-style operation on title, and the
    // query builder offers it, but nothing exercised it. Drupal's shorthand
    // filter[title][operator]=CONTAINS was silently downgraded to an equality
    // match by a mock that ignored the operator; the CMS and the fixture
    // disagreed and no test could tell.
    const res: any = await target.adapter.dispatch('querystringSearch', {
      query: [
        { i: target.queryIndexes.title, o: 'string.contains', v: 'First' },
      ],
    });
    expect(res.items.length).toBeGreaterThan(0);
    expect(res.items.map((i: any) => i.path)).toContain('/news/first-post');
  });

  it('filters by a multi-value selection', async () => {
    // selection.any means "any of these", and most indexes advertise it. Drupal
    // was emitting filter[x]=a,b — a single equality against the literal "a,b",
    // which matches nothing — because no test ever passed more than one value.
    const res: any = await target.adapter.dispatch('querystringSearch', {
      query: [
        {
          i: target.queryIndexes.type,
          o: 'selection.any',
          v: [target.types.page, target.types.folder],
        },
      ],
    });
    expect(res.items.length).toBeGreaterThan(0);
    for (const item of res.items) {
      expect([target.types.page, target.types.folder]).toContain(item.type);
    }
  });

  it('returns canonical Documents, not CMS-shaped brains', async () => {
    const res: any = await target.adapter.dispatch('querystringSearch', {
      query: [
        {
          i: target.queryIndexes.type,
          o: 'selection.any',
          v: [target.types.page],
        },
      ],
    });
    for (const item of res.items) {
      expect(item.path.startsWith('/')).toBe(true);
      expect(item.path).not.toMatch(/^https?:/);
      expect(typeof item.id).toBe('string');
    }
  });

  it('limits the page without misreporting the total', async () => {
    const all: any = await target.adapter.dispatch('querystringSearch', {
      query: [
        {
          i: target.queryIndexes.type,
          o: 'selection.any',
          v: [target.types.page],
        },
      ],
    });
    const paged: any = await target.adapter.dispatch('querystringSearch', {
      query: [
        {
          i: target.queryIndexes.type,
          o: 'selection.any',
          v: [target.types.page],
        },
      ],
      limit: 1,
    });

    expect(paged.items.length).toBe(1);
    // A listing block renders "showing 1 of N"; reporting the page size as
    // the total makes every listing claim it is complete when it is not.
    expect(paged.total).toBe(all.total);
  });

  it('returns an empty result set rather than throwing on no match', async () => {
    const res: any = await target.adapter.dispatch('querystringSearch', {
      query: [
        { i: target.queryIndexes.type, o: 'selection.any', v: ['NoSuchType'] },
      ],
    });
    expect(res.items).toEqual([]);
    expect(res.total).toBe(0);
  });
});
