/**
 * Drop-in replacement for Volto's Api helper that routes every call over the
 * Hydra bridge instead of fetching the CMS directly.
 *
 * Same five methods, same argument shape, so the api middleware, the ~30 URL
 * templates in the action creators, and every reducer stay untouched — only
 * the transport changes.
 *
 * Two transports live behind that interface:
 *
 *   passthrough — the request's Plone path is forwarded verbatim. Only an
 *     adapter advertising `http-passthrough` can serve it, and for Plone it
 *     reproduces today's behaviour exactly, which is what makes the
 *     transparency proof meaningful.
 *
 *   semantic — the path is translated to a canonical intent and the result
 *     translated back. This is what lets a CMS that has never heard of
 *     /@querystring answer the query builder.
 *
 * The adapter picks, by what it advertises. Routing per request rather than per
 * adapter matters because coverage is partial: /@history has no canonical form
 * yet, so it must still reach a passthrough adapter rather than fail.
 */

import { routeToIntent } from './intentRouter';
import { plonify } from './plonify';

const METHODS = ['get', 'post', 'put', 'patch', 'del'];

export class BridgeApi {
  constructor(rpc, { getAdapterInfo, whenAdapterReady } = {}) {
    this.rpc = rpc;
    this.getAdapterInfo = getAdapterInfo ?? (() => null);
    // Without this the first request decides the transport for good, before
    // the adapter has said a word.
    this.whenAdapterReady = whenAdapterReady ?? (() => Promise.resolve(null));
    METHODS.forEach((op) => {
      this[op] = (path, { params, data, headers } = {}) =>
        this.dispatch({ op, path, data, headers, params });
    });
  }

  supportsPassthrough() {
    const info = this.getAdapterInfo();
    // Before an adapter announces itself we cannot know what it speaks. Treat
    // that as passthrough: it is the status quo, and semantic routing here
    // would silently change behaviour for every caller that races readiness.
    if (!info?.capabilities) return true;
    return info.capabilities.includes('http-passthrough');
  }

  async dispatch({ op, path, data, headers, params }) {
    await this.whenAdapterReady();
    if (this.supportsPassthrough()) {
      return this.rpc.request('http', { op, path, data, headers, params });
    }

    // params are Volto's querystring; the router reads the query off the path,
    // so fold them in before matching.
    const fullPath = withParams(path, params);
    const routed = routeToIntent({ op, path: fullPath, data });

    if (!routed) {
      // No canonical equivalent and no passthrough to fall back on. Failing
      // loudly names the endpoint that needs one — silently returning empty
      // would surface later as an unexplained blank panel.
      throw new Error(
        `[hydra] No canonical intent for ${op.toUpperCase()} ${fullPath}, ` +
          `and this adapter does not implement the http passthrough. ` +
          `Add a route in intentRouter.js or an http case in the adapter.`,
      );
    }

    const result = await this.rpc.request(routed.intent, routed.args);
    return plonify(routed.intent, result, {
      path: fullPath,
      endpoint: routed.endpoint,
    });
  }
}

function withParams(path, params) {
  if (!params || !Object.keys(params).length) return path;
  const [base, existing] = String(path).split('?');
  const qs = new URLSearchParams(existing || '');
  for (const [k, v] of Object.entries(params)) qs.set(k, v);
  return `${base}?${qs.toString()}`;
}

export default BridgeApi;
