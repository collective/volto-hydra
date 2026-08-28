import { BridgeRPC } from '@volto-hydra/hydra-js/bridgeRpc';

/**
 * The admin's single bridge client, published before any route can dispatch.
 *
 * Timing is the whole point. Volto's editor bootstrap fires @types and
 * @querystring during mount, and React runs child effects before parent
 * effects — so publishing this from a component's useEffect (even App's) is
 * already too late, and those calls found no bridge and went direct. Creating
 * it at module load, which happens when the addon's applyConfig is imported,
 * means the client exists before the store does.
 *
 * It starts gated, so anything dispatched before the frontend announces an
 * adapter queues rather than racing.
 */

let rpc = null;

/** Origin of the iframe we talk to; learned from the first message it sends. */
let targetOrigin = null;

export function setBridgeTargetOrigin(origin) {
  if (origin) targetOrigin = origin;
}

/**
 * The adapter host is preferred over the visible editing iframe, because it
 * exists on every route. The editing iframe is only there while a document is
 * open, so relying on it would leave the contents view — and anything else
 * without an iframe — unable to reach the CMS at all.
 */
/**
 * The editing iframe when there is one, the host otherwise.
 *
 * Preferring the editing iframe matters: it already exists on editing routes,
 * so using it means the frontend is loaded ONCE. The host exists only to
 * cover routes that render no editor — the contents view above all.
 */
function bridgeIframe() {
  return (
    document.getElementById('previewIframe') ||
    document.getElementById('hydraAdapterHost')
  );
}

/**
 * The window whose adapter has announced itself.
 *
 * Readiness used to be a single boolean on the client, but there are two
 * possible targets — the hidden adapter host and the editing iframe — and
 * bridgeIframe() prefers the editing one the moment its element exists. So on
 * the way into /edit the host would announce, the editing iframe would mount
 * and become the target while still loading, and canSend() would say yes
 * because an element with a contentWindow existed. Requests were then posted
 * into a document with no listener and silently dropped, surfacing much later
 * as a per-request timeout: 22 requests in, 6 out, an edit form with no title
 * and a preview stuck on "Loading...".
 *
 * Comparing against the announcing window makes readiness a property of the
 * transport rather than of the client, so a target that has not announced
 * queues instead of swallowing.
 */
let readyWindow = null;

// Whether an editing iframe is currently mounted. The host subscribes so it
// can stay out of the way rather than loading the frontend a second time.
let editingMounted = false;
const editingListeners = new Set();

export function setEditingIframeMounted(value) {
  if (editingMounted === value) return;
  editingMounted = value;
  for (const listener of editingListeners) listener(editingMounted);
}

export function subscribeEditingIframe(listener) {
  editingListeners.add(listener);
  return () => editingListeners.delete(listener);
}

export function isEditingIframeMounted() {
  return editingMounted;
}

function resolveTargetOrigin() {
  const iframe = bridgeIframe();
  if (iframe?.src) return new URL(iframe.src).origin;
  return targetOrigin;
}

export function getBridgeRpc() {
  if (rpc) return rpc;
  rpc = new BridgeRPC({
    gated: true,
    // Readiness is not just "an adapter announced" — it is also "there is an
    // iframe to send to". Leaving one route for another can remove the host
    // before the next mounts, and a request dispatched into that gap is lost.
    // Not just "is there an iframe" — "is there an adapter in the window I am
    // about to post to". The two differ exactly while a target is swapping,
    // which is when requests were being lost.
    canSend: () => {
      const target = bridgeIframe()?.contentWindow;
      return Boolean(target) && target === readyWindow;
    },
    send: (msg) => {
      const iframe = bridgeIframe();
      const origin = resolveTargetOrigin();
      if (!iframe?.contentWindow || !origin) {
        // canSend() should have kept this queued. Reaching here means the
        // transport vanished between the check and the send, so surface it
        // rather than dropping the message silently.
        throw new Error(
          '[hydra] bridge send with no iframe to send to; the transport ' +
            'disappeared after the readiness check.',
        );
      }
      iframe.contentWindow.postMessage(msg, origin);
    },
  });
  return rpc;
}

/**
 * Listen for bridge traffic here rather than in a component.
 *
 * ADAPTER_READY used to be handled in the Iframe view, which is not mounted on
 * every route — the contents view has no iframe at all. The adapter announced
 * itself, nothing was listening, the gate never opened and every request sat
 * queued behind it. The client owns its own transport so it works regardless
 * of what is on screen.
 */
const ADAPTER_ANNOUNCE_TIMEOUT_MS = 15_000;

function installListener(rpcClient) {
  window.addEventListener('message', (event) => {
    const type = event.data?.type;
    if (!type) return;

    const iframe = bridgeIframe();
    const expected = iframe?.src ? new URL(iframe.src).origin : null;
    if (expected && event.origin !== expected) return;
    // NOT filtering on event.source, deliberately. During an iframe reload the
    // element's contentWindow can already be the new document while
    // ADAPTER_READY from the old one is still in flight; dropping it leaves
    // the gate shut and every request hanging. The host and the editor never
    // coexist now — the host is confined to routes with no editor — so origin
    // is sufficient to identify the sender.

    if (type === 'BACKEND_RESPONSE') {
      rpcClient.handleMessage(event.data);
      return;
    }
    if (type === 'ADAPTER_READY') {
      setBridgeTargetOrigin(event.origin);
      lastAdapter = {
        name: event.data.name,
        capabilities: event.data.capabilities ?? [],
        protocolVersion: event.data.protocolVersion,
        user: event.data.user,
      };
      // Readiness belongs to the WINDOW that announced it, not to the client.
      readyWindow = event.source;
      rpcClient.markReady();
      resolveAdapterReady?.(lastAdapter);
    }
  });
}

/** What the frontend last told us it is and can do. */
let lastAdapter = null;

export function getAdapterInfo() {
  return lastAdapter;
}

/**
 * Resolves once the frontend has said what it is.
 *
 * Callers that only need a request answered can rely on the RPC queue, which
 * already holds traffic until readiness. Callers that must *decide something*
 * from the adapter's capabilities cannot: they run at call time, before the
 * announcement, and would bake in a default that never gets revisited. That is
 * exactly how every request ended up on the passthrough regardless of which
 * CMS was connected.
 *
 * Resolves with null if no adapter ever announces, so a missing frontend
 * surfaces as the usual NO_ADAPTER error instead of a hang here.
 */
let resolveAdapterReady;
const adapterReadyPromise =
  typeof window === 'undefined'
    ? Promise.resolve(null)
    : new Promise((resolve) => {
        resolveAdapterReady = resolve;
        setTimeout(() => resolve(lastAdapter), ADAPTER_ANNOUNCE_TIMEOUT_MS);
      });

export function whenAdapterReady() {
  return adapterReadyPromise;
}

if (typeof window !== 'undefined') {
  // The Api shadow is constructed by Volto's start-client before any React
  // tree exists and has no context to read from; one window handle is the seam.
  const client = getBridgeRpc();
  window.__hydraBridgeRpc = client;
  installListener(client);
}
