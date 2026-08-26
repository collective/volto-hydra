/**
 * Shared behaviour for every Hydra CMS adapter.
 *
 * Subclasses implement dispatch(); everything here is transport-agnostic, so
 * it is unit-testable without a CMS.
 */

export class AdapterError extends Error {
  constructor(message, { code = 'ADAPTER_ERROR', status, data } = {}) {
    super(message);
    this.name = 'AdapterError';
    this.code = code;
    this.status = status;
    this.data = data;
  }
}

export class BaseAdapter {
  constructor({ name, capabilities }) {
    this.name = name;
    this.capabilities = capabilities;
    this.ctx = null;
  }

  async init(ctx) {
    this.ctx = ctx;
  }

  supports(capability) {
    return this.capabilities.includes(capability);
  }

  async whoami() {
    return null;
  }

  getAdminUrl() {
    return null;
  }

  async dispatch(intent) {
    throw new AdapterError(`${this.name} does not implement '${intent}'`, {
      code: 'NOT_IMPLEMENTED',
      status: 501,
    });
  }

  /**
   * Run fn; on a 401 run it exactly once more — the CMS session may have been
   * refreshed in another tab. If the retry also 401s, tell the admin to raise
   * an auth challenge and rethrow, so the caller still sees the failure rather
   * than a silently swallowed one.
   */
  async withAuthRetry(fn) {
    try {
      return await fn();
    } catch (err) {
      if (err?.status !== 401) throw err;
      try {
        return await fn();
      } catch (retryErr) {
        this.ctx?.emit('auth-required', {
          reason: 'session-expired',
          adapter: this.name,
        });
        throw retryErr;
      }
    }
  }
}
