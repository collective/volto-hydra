/**
 * Bidirectional RPC over the admin <-> iframe postMessage channel.
 *
 * Symmetric: the same class runs on both sides. The admin instance sends
 * BACKEND_REQUEST and resolves on BACKEND_RESPONSE; the iframe instance
 * serves requests by dispatching them to a registered adapter.
 */

/** Bumped whenever the envelope shape changes incompatibly. */
export const BRIDGE_PROTOCOL_VERSION = 1;

const DEFAULT_TIMEOUT_MS = 30_000;

/**
 * Intents that legitimately take longer than the default. Uploads move real
 * bytes over the wire; everything else is a JSON round trip.
 */
const INTENT_TIMEOUTS = { 'asset.upload': 120_000 };

export class BridgeRPC {
  /**
   * @param {Object} opts
   * @param {(msg: object) => void} opts.send - transport (postMessage wrapper)
   */
  constructor({ send }) {
    this.send = send;
    this.pending = new Map();
    this.nextId = 0;
  }

  timeoutFor(intent) {
    return INTENT_TIMEOUTS[intent] ?? DEFAULT_TIMEOUT_MS;
  }

  request(intent, args, { timeoutMs } = {}) {
    const requestId = `rpc-${++this.nextId}`;
    const ms = timeoutMs ?? this.timeoutFor(intent);
    const promise = new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(requestId);
        const err = new Error(
          `Bridge request '${intent}' timed out after ${ms}ms`,
        );
        err.code = 'TIMEOUT';
        err.intent = intent;
        reject(err);
      }, ms);
      this.pending.set(requestId, { resolve, reject, timer });
    });
    this.send({
      type: 'BACKEND_REQUEST',
      requestId,
      intent,
      args,
      meta: { timeoutMs: ms },
    });
    return promise;
  }

  handleMessage(msg) {
    if (msg?.type !== 'BACKEND_RESPONSE') return false;
    const entry = this.pending.get(msg.requestId);
    if (!entry) return false;
    this.pending.delete(msg.requestId);
    clearTimeout(entry.timer);
    entry.resolve(msg.result);
    return true;
  }
}
