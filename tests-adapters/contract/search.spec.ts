import { beforeAll, afterAll, beforeEach, describe, it, expect } from 'vitest';
import { resolveTarget, type Target } from '../targets';

let target: Target;

beforeAll(async () => {
  target = await resolveTarget();
  await target.start();
}, 60_000);

afterAll(async () => {
  await target.stop();
});

beforeEach(async () => {
  await target.seed();
});

describe('search', () => {
  it('finds a seeded document by its title text', async () => {
    const res: any = await target.adapter.dispatch('search', {
      query: 'First',
    });
    expect(typeof res.total).toBe('number');
    expect(Array.isArray(res.items)).toBe(true);
    expect(res.items.map((i: any) => i.path)).toContain('/news/first-post');
  });

  it('returns canonical Documents, not CMS-shaped brains', async () => {
    const res: any = await target.adapter.dispatch('search', {
      query: 'First',
    });
    const hit = res.items.find((i: any) => i.path === '/news/first-post');
    expect(hit).toBeDefined();
    expect(hit.path).not.toMatch(/^https?:/);
    expect(typeof hit.id).toBe('string');
    expect(typeof hit.title).toBe('string');
  });

  it('returns an empty result set rather than throwing on no match', async () => {
    const res: any = await target.adapter.dispatch('search', {
      query: 'zzzz-no-such-content-zzzz',
    });
    expect(res.items).toEqual([]);
    expect(res.total).toBe(0);
  });
});

describe('tree.list', () => {
  it('lists the children of a folder', async () => {
    const res: any = await target.adapter.dispatch('tree.list', {
      parent: '/news',
    });
    const paths = res.items.map((i: any) => i.path).sort();
    expect(paths).toEqual(['/news/draft-post', '/news/first-post']);
  });

  it('returns an empty list for a leaf', async () => {
    const res: any = await target.adapter.dispatch('tree.list', {
      parent: '/about',
    });
    expect(res.items).toEqual([]);
  });
});

describe('breadcrumbs.get', () => {
  it('returns the ancestor chain root-first, excluding the site root', async () => {
    const res: any = await target.adapter.dispatch('breadcrumbs.get', {
      path: '/news/first-post',
    });
    expect(res.items.map((i: any) => i.path)).toEqual([
      '/news',
      '/news/first-post',
    ]);
  });
});

describe('navigation.get', () => {
  it('returns top-level navigation entries as canonical paths', async () => {
    const res: any = await target.adapter.dispatch('navigation.get', {
      path: '/',
    });
    const paths = res.items.map((i: any) => i.path);
    expect(paths).toContain('/news');
    expect(paths).toContain('/about');
    for (const p of paths) {
      expect(p).not.toMatch(/^https?:/);
    }
  });
});
