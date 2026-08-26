/**
 * Bidirectional RPC over the admin <-> iframe postMessage channel.
 *
 * Symmetric: the same class runs on both sides. The admin instance sends
 * BACKEND_REQUEST and resolves on BACKEND_RESPONSE; the iframe instance
 * serves requests by dispatching them to a registered adapter.
 */

/** Bumped whenever the envelope shape changes incompatibly. */
export const BRIDGE_PROTOCOL_VERSION = 1;

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

  request(intent, args) {
    const requestId = `rpc-${++this.nextId}`;
    const promise = new Promise((resolve, reject) => {
      this.pending.set(requestId, { resolve, reject });
    });
    this.send({ type: 'BACKEND_REQUEST', requestId, intent, args });
    return promise;
  }

  handleMessage(msg) {
    if (msg?.type !== 'BACKEND_RESPONSE') return false;
    const entry = this.pending.get(msg.requestId);
    if (!entry) return false;
    this.pending.delete(msg.requestId);
    entry.resolve(msg.result);
    return true;
  }
}
