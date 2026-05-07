/**
 * Page-level integrity checks that run on a fully loaded rendered page,
 * complementing the per-block checks in BlockVerificationHelper. The
 * per-block helper only sees the block under test; this helper sees the
 * whole page, so it catches things like a stray slate link in some other
 * block pointing at the backend API.
 *
 * Intended to be called by a per-page walker (one call per page in the
 * site's @search result) from a consumer repo's playwright spec:
 *
 *   for (const p of pages) {
 *     await page.goto(p);
 *     await page.waitForLoadState('networkidle').catch(() => {});
 *     await verifyPageIntegrity(page);
 *   }
 */
import { Page, expect } from '@playwright/test';

export interface PageIntegrityOptions {
  /**
   * Origins considered "the backend" — any rendered `<a href>` pointing here
   * is an integrity failure (indicates the frontend failed to strip the
   * backend base URL from a resolveuid-expanded link). Defaults to other
   * localhost origins (a reasonable heuristic when tests run against local
   * mock-api + frontend on different ports).
   */
  backendOriginMatches?: (origin: string) => boolean;
}

/**
 * No rendered `<img>` should be broken (empty src, failed load).
 * Skips data: URIs (often inline placeholders).
 */
export async function verifyNoBrokenImages(page: Page): Promise<void> {
  const broken = await page.evaluate(() =>
    Array.from(document.querySelectorAll('img'))
      .filter((img) =>
        img.src &&
        !img.src.startsWith('data:') &&
        (!img.complete || img.naturalWidth === 0),
      )
      .map((img) => ({ src: img.src, alt: img.alt })),
  );
  expect(broken, `Broken images on ${page.url()}:\n${JSON.stringify(broken, null, 2)}`).toEqual([]);
}

/**
 * No rendered link should point at an origin other than the page's, when
 * that other origin is considered "the backend" (default: any other
 * localhost service). Catches resolveuid-expanded backend URLs that the
 * frontend forgot to strip.
 */
export async function verifyNoBackendLinks(
  page: Page,
  options: PageIntegrityOptions = {},
): Promise<void> {
  const matchJs = options.backendOriginMatches
    ? options.backendOriginMatches.toString()
    : '(origin) => origin.includes("localhost")';

  const offSite = await page.evaluate(`(() => {
    const pageOrigin = window.location.origin;
    const isBackend = ${matchJs};
    return Array.from(document.querySelectorAll('a[href]'))
      // Intentional cross-origin admin links (e.g. Login to Volto) opt out
      // via data-linkable-allow, same as block-level edit annotation checks.
      .filter((el) => !el.hasAttribute('data-linkable-allow'))
      .map((el) => el.getAttribute('href'))
      .filter((h) => {
        if (!h || h.startsWith('#') || h.startsWith('/')) return false;
        try {
          const linkOrigin = new URL(h, pageOrigin).origin;
          return linkOrigin !== pageOrigin && isBackend(linkOrigin);
        } catch { return false; }
      });
  })()`) as string[];

  expect(offSite, `Links pointing at backend on ${page.url()}:\n${offSite.join('\n')}`).toEqual([]);
}

/**
 * Run every page-level integrity check in order. Composes the smaller
 * checks so a consumer only needs to wire one call.
 */
export async function verifyPageIntegrity(
  page: Page,
  options: PageIntegrityOptions = {},
): Promise<void> {
  await verifyNoBrokenImages(page);
  await verifyNoBackendLinks(page, options);
}
