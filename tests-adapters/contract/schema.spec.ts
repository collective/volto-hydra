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

describe('types.list', () => {
  it('includes the types the seed content uses', async () => {
    const res: any = await target.adapter.dispatch('types.list', {});
    const ids = res.items.map((t: any) => t.id);
    expect(ids).toContain(target.types.page);
  });

  it('gives every type an id and a title', async () => {
    const res: any = await target.adapter.dispatch('types.list', {});
    expect(res.items.length).toBeGreaterThan(0);
    for (const t of res.items) {
      expect(typeof t.id).toBe('string');
      expect(typeof t.title).toBe('string');
    }
  });
});

describe('types.getSchema', () => {
  it('returns the canonical Schema shape', async () => {
    const schema: any = await target.adapter.dispatch('types.getSchema', {
      type: target.types.page,
    });
    expect(Array.isArray(schema.fieldsets)).toBe(true);
    expect(typeof schema.properties).toBe('object');
    expect(Array.isArray(schema.required)).toBe(true);
  });

  it('exposes title as a property listed in a fieldset', async () => {
    const schema: any = await target.adapter.dispatch('types.getSchema', {
      type: target.types.page,
    });
    expect(schema.properties.title).toBeDefined();
    const allFields = schema.fieldsets.flatMap((f: any) => f.fields);
    expect(allFields).toContain('title');
  });

  it('rejects an unknown type with NOT_FOUND', async () => {
    await expect(
      target.adapter.dispatch('types.getSchema', { type: 'NoSuchType' }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});
