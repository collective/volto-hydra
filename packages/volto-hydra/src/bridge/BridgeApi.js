/**
 * Drop-in replacement for Volto's Api helper that routes every call over the
 * Hydra bridge instead of fetching the CMS directly.
 *
 * Same five methods, same argument shape, so the api middleware, the ~30 URL
 * templates in the action creators, and every reducer stay untouched — only
 * the transport changes.
 *
 * MVP uses the `http` passthrough intent for all traffic: the Plone adapter
 * then mirrors today's behaviour exactly, which is what makes the transparency
 * proof meaningful. Semantic intents replace this per action creator as
 * non-Plone adapters need them.
 */

const METHODS = ['get', 'post', 'put', 'patch', 'del'];

export class BridgeApi {
  constructor(rpc) {
    this.rpc = rpc;
    METHODS.forEach((op) => {
      this[op] = (path, { params, data, headers } = {}) =>
        this.rpc.request('http', { op, path, data, headers, params });
    });
  }
}

export default BridgeApi;
