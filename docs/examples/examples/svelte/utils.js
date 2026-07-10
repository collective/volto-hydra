/**
 * Frontend binding for the shared Plone image helper.
 *
 * The canonical implementation lives in `@volto-hydra/helpers` and is
 * pure — it takes `(value, apiUrl)` and returns the resolved URL. Each
 * frontend wraps it to supply `apiUrl` from wherever that frontend
 * keeps it (here: `window._API_URL`, set by main.js).
 */
import { getImageUrl as _getImageUrl } from '$helpers';

export function getImageUrl(value) {
  return _getImageUrl(value, (typeof window !== 'undefined' && window._API_URL) || '');
}
