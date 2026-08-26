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
  /**
   * @param {Object} opts
   * @param {(msg: object) => void} opts.send - transport (postMessage wrapper)
   * @param {boolean} [opts.gated] - hold requests until an adapter is serving.
   *   The admin side sets this: the inversion makes it depend on the iframe to
   *   fetch the very content the iframe needs in order to render, so a request
   *   sent while the iframe is between documents is dropped on the floor and
   *   the editor deadlocks until the request times out. The iframe side is
   *   ungated — it only ever answers.
   */
  constructor({ send, gated = false }) {
    this.send = send;
    this.pending = new Map();
    this.nextId = 0;
    this.gated = gated;
    this.ready = !gated;
    this.queue = [];
  }

  /** An adapter has announced itself; release anything held. */
  markReady() {
    this.ready = true;
    const queued = this.queue;
    this.queue = [];
    for (const dispatch of queued) dispatch();
  }

  /** The iframe is navigating; whatever was serving us is gone. */
  markNotReady() {
    if (this.gated) this.ready = false;
  }

  timeoutFor(intent) {
    return INTENT_TIMEOUTS[intent] ?? DEFAULT_TIMEOUT_MS;
  }

  request(intent, args, { timeoutMs } = {}) {
    const requestId = `rpc-${++this.nextId}`;
    const ms = timeoutMs ?? this.timeoutFor(intent);

    return new Promise((resolve, reject) => {
      // The timeout clock starts when the request actually goes out, not when
      // it is created: time spent waiting for the iframe is not the CMS being
      // slow, and charging it to the request's budget would fail calls that
      // were never given a chance to run.
      const dispatch = () => {
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
        this.send({
          type: 'BACKEND_REQUEST',
          requestId,
          intent,
          args,
          meta: { timeoutMs: ms },
        });
      };

      if (this.ready) dispatch();
      else this.queue.push(dispatch);
    });
  }

  /** Register the adapter this side answers BACKEND_REQUEST with. */
  serve(adapter) {
    this.adapter = adapter;
  }

  async handleRequest(msg) {
    const { requestId, intent, args } = msg;
    if (!this.adapter) {
      this.send({
        type: 'BACKEND_RESPONSE',
        requestId,
        ok: false,
        error: {
          code: 'NO_ADAPTER',
          message: 'No adapter registered on this frontend',
        },
      });
      return;
    }
    try {
      const result = await this.adapter.dispatch(intent, args);
      this.send({
        type: 'BACKEND_RESPONSE',
        requestId,
        ok: true,
        // Only the raw http passthrough bypasses canonical normalisation.
        raw: intent === 'http',
        result,
      });
    } catch (err) {
      this.send({
        type: 'BACKEND_RESPONSE',
        requestId,
        ok: false,
        error: {
          code: err.code ?? 'ADAPTER_ERROR',
          status: err.status,
          message: err.message,
          data: err.data,
        },
      });
    }
  }

  handleMessage(msg) {
    if (msg?.type === 'BACKEND_REQUEST') return this.handleRequest(msg);
    if (msg?.type !== 'BACKEND_RESPONSE') return false;
    const entry = this.pending.get(msg.requestId);
    if (!entry) return false;
    this.pending.delete(msg.requestId);
    clearTimeout(entry.timer);
    if (msg.ok) {
      // Last-write-wins rather than per-request state: the only reader is the
      // synchronous plonify() decision immediately after the await, and
      // threading a wrapper through the Api shadow's five methods would buy
      // nothing behaviourally. Promote to a { result, raw } tuple if a real
      // concurrency bug ever shows up.
      this.lastResponseWasRaw = msg.raw === true;
      entry.resolve(msg.result);
    } else {
      const e = msg.error ?? {};
      const err = new Error(e.message ?? 'Bridge request failed');
      err.code = e.code ?? 'BRIDGE_ERROR';
      err.status = e.status;
      err.data = e.data;
      entry.reject(err);
    }
    return true;
  }
}
