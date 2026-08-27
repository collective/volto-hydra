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

function resolveTargetOrigin() {
  if (targetOrigin) return targetOrigin;
  const iframe = document.getElementById('previewIframe');
  if (!iframe?.src) return null;
  return new URL(iframe.src).origin;
}

export function getBridgeRpc() {
  if (rpc) return rpc;
  rpc = new BridgeRPC({
    gated: true,
    send: (msg) => {
      const iframe = document.getElementById('previewIframe');
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

if (typeof window !== 'undefined') {
  // The Api shadow is constructed by Volto's start-client before any React
  // tree exists and has no context to read from; one window handle is the seam.
  window.__hydraBridgeRpc = getBridgeRpc();
}
