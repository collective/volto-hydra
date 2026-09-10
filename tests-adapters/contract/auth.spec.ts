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

describe('auth.whoami', () => {
  it('returns a canonical User for the authenticated session', async () => {
    const user: any = await target.adapter.dispatch('auth.whoami', {});
    expect(typeof user.id).toBe('string');
    expect(typeof user.username).toBe('string');
    expect(Array.isArray(user.roles)).toBe(true);
    expect(user.roles.length).toBeGreaterThan(0);
  });

  it('exposes the same user through the whoami() method', async () => {
    const viaIntent: any = await target.adapter.dispatch('auth.whoami', {});
    const viaMethod: any = await target.adapter.whoami();
    expect(viaMethod.username).toBe(viaIntent.username);
  });
});

describe('session expiry', () => {
  it('maps a CMS 401 to UNAUTHORIZED and asks the admin for a challenge', async () => {
    const events: string[] = [];
    await target.expireSession((event: string) => events.push(event));

    await expect(
      target.adapter.dispatch('content.get', { path: '/news/first-post' }),
    ).rejects.toMatchObject({ code: 'UNAUTHORIZED', status: 401 });

    // BaseAdapter retries once — a session refreshed in another tab is the
    // common case — and only then escalates. The admin must be told, or the
    // user sees a dead editor with no explanation.
    expect(events).toContain('auth-required');
  });
});
