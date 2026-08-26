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

const CATEGORIES = 'categories';

describe('vocabulary.get', () => {
  it('returns the canonical Vocabulary shape', async () => {
    const vocab: any = await target.adapter.dispatch('vocabulary.get', {
      name: target.vocabularies[CATEGORIES],
      limit: 10,
    });
    expect(Array.isArray(vocab.items)).toBe(true);
    expect(typeof vocab.total).toBe('number');
    for (const item of vocab.items) {
      expect(typeof item.token).toBe('string');
      expect(typeof item.title).toBe('string');
    }
  });

  it('reports the full size of the vocabulary, not the page size', async () => {
    const vocab: any = await target.adapter.dispatch('vocabulary.get', {
      name: target.vocabularies[CATEGORIES],
      limit: 10,
    });
    expect(vocab.total).toBe(target.vocabularySize);
    expect(vocab.items.length).toBeLessThanOrEqual(10);
  });

  it('narrows the result set with a title filter', async () => {
    const vocab: any = await target.adapter.dispatch('vocabulary.get', {
      name: target.vocabularies[CATEGORIES],
      title: `Category ${Math.floor(target.vocabularySize / 2)}`,
    });
    expect(vocab.items.length).toBeGreaterThan(0);
    for (const item of vocab.items) {
      expect(item.title).toContain(
        `Category ${Math.floor(target.vocabularySize / 2)}`,
      );
    }
  });

  it('stays usable as type-ahead against a large vocabulary', async () => {
    // The seed generates 10 000 terms precisely so this assertion means
    // something: an adapter that fetches the whole vocabulary and filters in
    // memory will breach this well before a user notices it is broken.
    const started = Date.now();
    const vocab: any = await target.adapter.dispatch('vocabulary.get', {
      name: target.vocabularies[CATEGORIES],
      title: `Category ${target.vocabularySize - 1}`,
      limit: 20,
    });
    const elapsed = Date.now() - started;
    expect(vocab.items.length).toBeGreaterThan(0);
    expect(elapsed).toBeLessThan(1000);
  });

  it('rejects an unknown vocabulary with NOT_FOUND', async () => {
    await expect(
      target.adapter.dispatch('vocabulary.get', { name: 'no.such.vocabulary' }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});
