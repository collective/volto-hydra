/**
 * Frontend bindings for shared Plone helpers.
 *
 * The canonical implementations live in `@volto-hydra/helpers` and are
 * pure. Each frontend wraps them to supply runtime-bound values
 * (`apiUrl` etc.) from wherever that frontend keeps them.
 *
 * In the Astro example these run BOTH client-side (after main.js sets
 * `window._API_URL`) AND server-side via the /api/render endpoint
 * (where `window` is undefined). The `typeof window` guard returns
 * `''` server-side so SSR renders relative paths — the bridge tests
 * only check shape, not absolute URL.
 */
import { getImageUrl as _getImageUrl } from '$helpers';

export function getImageUrl(value) {
  return _getImageUrl(value, (typeof window !== 'undefined' && window._API_URL) || '');
}

export function contentPath(url) {
  if (typeof window !== 'undefined' && window._contentPath) return window._contentPath(url);
  return url || '';
}

export function apiUrl() {
  if (typeof window !== 'undefined' && window._API_URL) return window._API_URL;
  return '';
}
