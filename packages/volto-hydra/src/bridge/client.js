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
    send: (msg) => {
      const iframe = bridgeIframe();
      const origin = resolveTargetOrigin();
      if (!iframe?.contentWindow || !origin) {
        // Cannot happen once an adapter has announced — announcing requires
        // the iframe to exist — so reaching here means the gate released
        // without a frontend, which is a bug worth seeing.
        throw new Error(
          '[hydra] bridge send with no iframe to send to; the gate released ' +
            'without a frontend.',
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
function installListener(rpcClient) {
  window.addEventListener('message', (event) => {
    const type = event.data?.type;
    if (!type) return;

    const iframe = bridgeIframe();
    const expected = iframe?.src ? new URL(iframe.src).origin : null;
    if (expected && event.origin !== expected) return;
    // Same reasoning as the editor's handler: with two iframes on one origin,
    // only the window reference distinguishes them.
    if (iframe?.contentWindow && event.source !== iframe.contentWindow) return;

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
      rpcClient.markReady();
    }
  });
}

/** What the frontend last told us it is and can do. */
let lastAdapter = null;

export function getAdapterInfo() {
  return lastAdapter;
}

if (typeof window !== 'undefined') {
  // The Api shadow is constructed by Volto's start-client before any React
  // tree exists and has no context to read from; one window handle is the seam.
  const client = getBridgeRpc();
  window.__hydraBridgeRpc = client;
  installListener(client);
}
