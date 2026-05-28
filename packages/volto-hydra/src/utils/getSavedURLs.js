import Cookies from 'js-cookie';
import isValidUrl from './isValidUrl';
import { getSavedUrlsCookieName } from './cookieNames';

/**
 * Frontend list entries are stored as comma-separated `Name|URL` pairs in
 * both the env var (RAZZLE_DEFAULT_IFRAME_URL) and the saved-URLs cookie.
 * Old entries without `|` are interpreted as URL-only and the name is
 * derived from the hostname; this keeps existing setups working without
 * a forced migration.
 *
 * Examples:
 *   "Nuxt blog|https://nuxt.example.com,F7 mobile|https://f7.example.com/#!"
 *   "https://legacy.example.com"           (no name → name = "legacy.example.com")
 */

// When the env/cookie entry has no `Name|` prefix, fall back to the URL
// minus its protocol — same string the old switcher used to render, so
// existing setups look identical until someone opts in to a real name.
const deriveName = (url) => url.replace(/^https?:\/\//, '');

const parseEntry = (raw) => {
  const s = (raw || '').trim();
  if (!s) return null;
  const sep = s.indexOf('|');
  if (sep === -1) {
    if (!isValidUrl(s)) return null;
    return { url: s, name: deriveName(s) };
  }
  const name = s.slice(0, sep).trim();
  const url = s.slice(sep + 1).trim();
  if (!isValidUrl(url)) return null;
  return { url, name: name || deriveName(url) };
};

const parseList = (csv) =>
  (csv || '')
    .split(',')
    .map(parseEntry)
    .filter(Boolean);

const dedupeByUrl = (entries) => {
  const seen = new Set();
  const out = [];
  for (const e of entries) {
    if (seen.has(e.url)) continue;
    seen.add(e.url);
    out.push(e);
  }
  return out;
};

/**
 * Get the default frontend list from the environment.
 * @returns {Array<{url: string, name: string}>}
 */
export const getURlsFromEnv = () => {
  const presetUrlsString =
    process.env['RAZZLE_DEFAULT_IFRAME_URL'] ||
    (typeof window !== 'undefined' &&
      window.env['RAZZLE_DEFAULT_IFRAME_URL']) ||
    'http://localhost:3002';
  return parseList(presetUrlsString);
};

/**
 * Get the saved frontend list from the cookie, merged with env entries.
 * Cookie entries take precedence (so the user can rename an env entry).
 * @returns {Array<{url: string, name: string}>}
 */
const getSavedURLs = () => {
  const cookieName = getSavedUrlsCookieName();
  const cookieEntries = parseList(Cookies.get(cookieName));
  const envEntries = getURlsFromEnv();
  return dedupeByUrl([...cookieEntries, ...envEntries]);
};

/**
 * Serialise an entry list to the `Name|URL,Name|URL` cookie/env format.
 * @param {Array<{url: string, name?: string}>} entries
 */
export const serialiseEntries = (entries) =>
  entries.map((e) => `${e.name || deriveName(e.url)}|${e.url}`).join(',');

export default getSavedURLs;
