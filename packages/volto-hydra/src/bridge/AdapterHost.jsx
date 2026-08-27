import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import Cookies from 'js-cookie';
import config from '@plone/volto/registry';
import { getIframeUrlCookieName } from '../utils/cookieNames';
import { getURlsFromEnv } from '../utils/getSavedURLs';
import {
  getBridgeRpc,
  isEditingIframeMounted,
  subscribeEditingIframe,
} from './client';

/**
 * A hidden iframe whose only job is to host the frontend's adapter.
 *
 * The editing iframe cannot serve this purpose. Several core editing routes
 * render no iframe at all — the contents view is one, and it is where an
 * editor browses and reorganises a site — so on those routes there would be
 * no adapter, every CMS call would queue behind the readiness gate, and the
 * page would come up empty. That is not a control-panel edge case; it is
 * ordinary editing.
 *
 * Kept deliberately dumb: it renders an iframe at the frontend URL and
 * nothing else. Whatever the frontend registers at initBridge answers the
 * admin's requests, on the frontend's origin with the frontend's
 * credentials — unchanged from the visible-iframe case.
 */
export default function AdapterHost() {
  const [isClient, setIsClient] = useState(false);
  useEffect(() => setIsClient(true), []);

  // Which routes get a host is decided by the ROUTE, not by timing.
  //
  // Two timing-based attempts failed here, both racy in the same way: this
  // component sits above the editor in App's tree, so anything based on "has
  // the editor mounted yet" is a guess about render order, and a delay long
  // enough to be safe on one route is too long on another. The route is known
  // synchronously and cannot race.
  //
  // Deliberately narrow: it covers the contents view, which is the editing
  // route that renders no iframe. It is not a general answer for every
  // adapter-less route, and control panels still need their own delegation to
  // the CMS's own admin.
  const { pathname } = useLocation();

  // Every route, until the editor takes over.
  //
  // Narrowing this to /contents and /add was wrong: a plain content view
  // deadlocks the same way. App fetches the content over the bridge, no
  // adapter has registered, the request queues, so the route never renders —
  // and therefore never renders the iframe that would have hosted the
  // adapter. On a full page load SSR hides this (it fetches directly), which
  // is why it only appears on SPA navigation, exactly as an editor moving
  // between pages would experience it.
  const adapterlessRoute = true;

  // Stand down once the editor owns an iframe, so the frontend is loaded once.
  // The handoff gap this used to race against is now covered by the RPC's
  // canSend(): requests queue while no transport exists.
  const [editing, setEditing] = useState(isEditingIframeMounted());
  useEffect(() => subscribeEditingIframe(setEditing), []);

  const needsHost = adapterlessRoute && !editing;

  // Close the gate whenever this host goes away.
  //
  // Leaving /contents for /add swaps WHICH iframe hosts the adapter. The gate
  // would still say "ready" from this host's announcement while requests were
  // already being sent to the editor's iframe, which has not registered yet —
  // so they went to an iframe with no adapter and were simply dropped. Closing
  // the gate makes them queue until the new host announces itself.
  useEffect(() => {
    if (!needsHost) return undefined;
    return () => {
      getBridgeRpc().markNotReady();
    };
  }, [needsHost]);

  const frontendUrl =
    useSelector((state) => state.frontendPreviewUrl?.url) ||
    (isClient ? Cookies.get(getIframeUrlCookieName()) : null) ||
    getURlsFromEnv()[0]?.url;

  // The adapter runs on the FRONTEND's origin and needs the session to talk
  // to the CMS. The visible editing iframe receives it as a URL parameter;
  // without the same here, the adapter's whoami() fails, registration is
  // abandoned, ADAPTER_READY never fires, and every request sits queued
  // behind a gate that will not open.
  const token = useSelector((state) => state.userSession?.token);

  // Only meaningful in a bridge session, and only on the client: there is no
  // iframe at render time on the server.
  if (!config.settings.useBridgeBackend || !isClient || !frontendUrl) return null;
  if (!needsHost) return null;

  const src = (() => {
    const url = new URL(frontendUrl, window.location.origin);
    if (token) url.searchParams.set('access_token', token);
    // Explicitly NOT edit mode: this host renders nothing, and edit mode would
    // start selection chrome and mutation observers for no document.
    url.searchParams.set('_edit', 'false');
    return url.toString();
  })();

  // The frontend decides whether it is inside Hydra by reading window.name,
  // which an iframe inherits from this attribute at creation. Without it the
  // frontend concludes it is being viewed normally and skips bridge setup
  // altogether — the iframe loads, and no adapter ever registers.
  //
  // "view" rather than "edit": this host renders nothing and must not put the
  // frontend into edit mode, where it would set up selection chrome and
  // mutation observers for a document nobody is editing.
  const adminOrigin =
    typeof window !== 'undefined' ? window.location.origin : '';

  return (
    <iframe
      id="hydraAdapterHost"
      title="Adapter host"
      name={`hydra-view:${adminOrigin}`}
      src={src}
      aria-hidden="true"
      tabIndex={-1}
      style={{
        position: 'absolute',
        width: 1,
        height: 1,
        opacity: 0,
        pointerEvents: 'none',
        border: 0,
      }}
    />
  );
}
