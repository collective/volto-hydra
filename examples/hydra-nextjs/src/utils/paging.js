/**
 * A listing's paging state lives in the URL as an `@pg_<blockId>_<page>`
 * segment, so a page of results can be linked to, bookmarked and reloaded.
 *
 * The segment addresses a BLOCK on the page, not a piece of content, so every
 * consumer that turns the URL into a content path has to drop it first — the
 * server before fetching the page, the client before querying a listing. Left
 * in, the API is asked for a path that doesn't exist and the whole page 404s,
 * which is what made every paging link on the site a dead link.
 */
const PAGING_SEGMENT = /^@pg_/;

/** Drop paging segments from a Next.js catch-all `slug` array. */
export function stripPagingSegments(segments) {
  return (segments || []).filter((s) => !PAGING_SEGMENT.test(s));
}

/** Drop the paging segment from a pathname like `/docs/@pg_listing-1_2`. */
export function stripPagingFromPath(pathname) {
  if (!pathname) return pathname;
  const kept = pathname.split('/').filter((s) => !PAGING_SEGMENT.test(s));
  const path = kept.join('/');
  return path === '' ? '/' : path;
}

/** The page number a URL asks for, for `blockId` — 0 when it says nothing. */
export function pageFromPath(pathname, blockId) {
  const match = (pathname || '').match(new RegExp(`@pg_${blockId}_(\\d+)`));
  return match ? parseInt(match[1], 10) : 0;
}
