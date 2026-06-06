/**
 * Pick the "publicURL" for the editor's currently selected iframe frontend.
 *
 * Saved entries are `{name, url, publishUrl?}` — `url` is what the
 * iframe loads (the edit-mode frontend), `publishUrl` is where the same
 * content actually lives for end users. We prefer `publishUrl` because
 * that's what canonical/og:url/share links should point at; we fall
 * back to `url` for setups where edit and public are the same origin.
 *
 * Trailing slashes are stripped so concatenation with a /path yields a
 * clean absolute URL.
 *
 * @param {Array<{url:string, publishUrl?:string}>} savedEntries
 * @param {string|null|undefined} currentEditUrl
 * @returns {string|null}
 */
const getCurrentFrontendPublicUrl = (savedEntries, currentEditUrl) => {
  if (!currentEditUrl) return null;
  const entry = savedEntries.find((e) => e.url === currentEditUrl);
  if (!entry) return null;
  const chosen = entry.publishUrl || entry.url;
  return chosen ? chosen.replace(/\/$/, '') : null;
};

export default getCurrentFrontendPublicUrl;
