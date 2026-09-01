import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import config from '@plone/volto/registry';
import Api from '../customizations/volto/helpers/Api/Api';

/**
 * The routing decision, pinned.
 *
 * Standalone Hydra has no CMS of its own, so a direct fetch in bridge mode is
 * not a fallback — it is a request aimed at nothing, or at the wrong CMS
 * entirely. These assertions exist so nobody can reintroduce one as a
 * well-meaning "graceful degradation".
 */

const originalFlag = config.settings.useBridgeBackend;

beforeEach(() => {
  delete window.__hydraBridgeRpc;
});

afterEach(() => {
  config.settings.useBridgeBackend = originalFlag;
  delete window.__hydraBridgeRpc;
});

/**
 * Speak as the frontend does on connect.
 *
 * Which transport a request takes depends on what the adapter says it can
 * serve, so a test that never announces one is not testing routing — it is
 * testing the unannounced state, which production never reaches: the adapter
 * host is mounted on every route.
 */
function announceAdapter(capabilities) {
  window.dispatchEvent(
    new MessageEvent('message', {
      data: { type: 'ADAPTER_READY', name: 'test', capabilities, protocolVersion: 1 },
      origin: window.location.origin,
    }),
  );
}

describe('Api transport selection', () => {
  // Routing is decided PER CALL, not in the constructor: Volto builds one Api
  // at boot and the store closes over it for the app's lifetime, long before
  // any bridge exists. A constructor-time choice can only ever be wrong.
  it('routes a call over the bridge when one is published', async () => {
    config.settings.useBridgeBackend = true;
    const request = vi.fn().mockResolvedValue({ ok: 1 });
    window.__hydraBridgeRpc = { request };
    announceAdapter(['content', 'http-passthrough']);

    await new Api().get('/news');

    expect(request).toHaveBeenCalledWith(
      'http',
      expect.objectContaining({ op: 'get', path: '/news' }),
    );
  });

  it('throws rather than fetching directly when the bridge is missing', () => {
    config.settings.useBridgeBackend = true;
    // The client is published at module load, so its absence means bridge
    // mode is on with no bridge at all — a bug, not a reason to fall back.
    expect(() => new Api().get('/news')).toThrow(/cannot reach a CMS by itself/);
  });

  it('leaves stock behaviour alone when the flag is off', () => {
    config.settings.useBridgeBackend = false;
    const api = new Api();
    for (const method of ['get', 'post', 'put', 'patch', 'del']) {
      expect(typeof api[method]).toBe('function');
    }
    // No bridge consulted, no throw: this is stock superagent.
    expect(() => api.get('/news')).not.toThrow();
  });

  /**
   * SSR used to be allowed onto the direct path, on the grounds that there is
   * no iframe at render time. But "no iframe" does not make a direct fetch
   * correct — it just means there is nobody to ask, and answering from
   * `apiPath` sends the admin to the wrong CMS: one that does not exist for a
   * WordPress or Drupal site, and for a Plone site a DIFFERENT Plone, which
   * answers 200 and is indistinguishable from working.
   *
   * In a bridge session every route has its server-side prefetch stripped, so
   * nothing should be asking. If something does, that is the bug to fix, and
   * it has to be audible.
   */
  it('refuses to fetch during SSR rather than reaching for apiPath', () => {
    config.settings.useBridgeBackend = true;
    const request = vi.fn();
    window.__hydraBridgeRpc = { request };
    const api = new Api({ universalCookies: { get: () => null } });
    expect(() => api.get('/news')).toThrow(/server-side rendering/);
    expect(request).not.toHaveBeenCalled();
  });
});
