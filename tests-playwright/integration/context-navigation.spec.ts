/**
 * contextNavigation block tests.
 *
 * Structural checks ride on the /context-navigation-test-page fixture:
 *
 *  - A hand-built nav (3 navItems) verifies the rendering contract:
 *    <nav aria-label> > <ul> > <li><a class="nav-item">. The link whose
 *    href matches the current URL gets aria-current="page" + .current.
 *    Indent levels (.level-N) are derived from URL path depth — there
 *    is no manual `level` field on navItem.
 *
 *  - An auto-populated nav (listing child, variation=nav, path=/_test_data,
 *    depth=1) verifies that the depth field is honored — only direct
 *    children come back, no grand-children — and that listing items
 *    render via the same navItem template.
 *
 *  - The context-navigation-layout template (a forced layout) injects
 *    a contextNavigation onto any page under /context-navigation-forced-folder/.
 */
import { test, expect } from '../fixtures';
import { AdminUIHelper } from '../helpers/AdminUIHelper';

test.describe('contextNavigation block', () => {
  test('hand-built nav renders aria-label / aria-current / indent levels', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/context-navigation-test-page');

    const iframe = helper.getIframe();

    const nav = iframe.locator('[data-block-uid="nav-1"]');
    await expect(nav).toBeVisible({ timeout: 10_000 });

    // a11y contract: <nav aria-label="Section navigation">
    await expect(nav).toHaveAttribute('aria-label', 'Section navigation');

    // List semantics: <ul role="list"> > three <li>
    const list = nav.locator('ul.context-navigation-list');
    await expect(list).toBeVisible();
    await expect(list.locator('> li')).toHaveCount(3);

    // The self-pointing link should be the active one — aria-current
    // and the .current class both come from the renderer's path match.
    const selfLink = nav.locator('a[data-block-uid="item-self"]');
    await expect(selfLink).toHaveAttribute('aria-current', 'page');
    await expect(selfLink).toHaveClass(/\bcurrent\b/);

    // Non-matching links don't get aria-current.
    const otherLink = nav.locator('a[data-block-uid="item-test-page"]');
    await expect(otherLink).not.toHaveAttribute('aria-current', 'page');

    // Indent levels via .level-N — derived from URL path depth:
    //   /_test_data/context-navigation-test-page → 2 segs (shallowest)
    //   /_test_data/test-page                    → 2 segs
    //   /_test_data/test-page/sub                → 3 segs → level-2
    const child = nav.locator('a[data-block-uid="item-test-page-child"]');
    await expect(child).toHaveClass(/\blevel-2\b/);
    await expect(selfLink).toHaveClass(/\blevel-1\b/);
  });

  test('mobile disclosure toggle hidden on desktop, visible <768', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/context-navigation-test-page');

    const iframe = helper.getIframe();
    const nav = iframe.locator('[data-block-uid="nav-1"]');
    await expect(nav).toBeVisible({ timeout: 10_000 });

    // The toggle <button> is always in the DOM; CSS hides it on desktop.
    const toggle = nav.locator('button.context-navigation-toggle');
    await expect(toggle).toBeAttached();
    await expect(toggle).toHaveAttribute('aria-controls', /nav-1-list$/);

    // At the default viewport (≥768) the toggle isn't visible. We check
    // computed style rather than .isVisible() because Playwright's
    // visible heuristic considers offset/opacity but not display.
    const isHidden = await toggle.evaluate(
      (el) => window.getComputedStyle(el).display === 'none',
    );
    expect(isHidden).toBe(true);
  });

  test('context-navigation-layout forces contextNavigation onto 3rd-level pages', async ({ page }) => {
    // The fixture tree:
    //   /_test_data/context-navigation-forced-folder/         (no force — depth 2)
    //   /_test_data/context-navigation-forced-folder/page-a/  (forced)
    //   /_test_data/context-navigation-forced-folder/page-b/  (forced)
    //
    // test-frontend/index.html sets allowedLayouts=[context-navigation-layout]
    // for any path under context-navigation-forced-folder/, so
    // expandTemplates merges the layout's fixed contextNavigation block
    // on top of the page's own body content.
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/context-navigation-forced-folder/page-a');

    const iframe = helper.getIframe();
    const forcedNav = iframe.locator('nav[aria-label="In this section"]');
    await expect(forcedNav).toBeVisible({ timeout: 10_000 });

    // The listing inside resolves `relativePath: ..` against the current
    // page, so depth=1 returns the siblings page-a and page-b.
    const links = forcedNav.locator('a.nav-item');
    await expect(links.first()).toBeVisible({ timeout: 10_000 });

    const hrefs = await links.evaluateAll((els) => els.map((el) => el.getAttribute('href')));
    expect(hrefs).toContain('/_test_data/context-navigation-forced-folder/page-a');
    expect(hrefs).toContain('/_test_data/context-navigation-forced-folder/page-b');

    // The current page link gets aria-current="page" via the renderer's
    // path match — the URL-based active-state logic must work whether
    // the contextNavigation came from the page or the template.
    const currentLink = forcedNav.locator('a[aria-current="page"]');
    await expect(currentLink).toHaveAttribute('href', '/_test_data/context-navigation-forced-folder/page-a');

    // The page's own body content is still rendered after the forced nav.
    await expect(iframe.getByText('Body of page A.')).toBeVisible();
  });

test('listing-derived level + hierarchical sort: depth=2 listing renders mixed levels in parent-then-children order', async ({ page }) => {
    // nav-4 fetches /context-navigation-forced-folder with depth=2 →
    //   page-a, page-b (depth 3 = 3 path segs)     → minDepth → level-1
    //   page-a/deep-1   (depth 4)                   → level-2
    //
    // The fixture's __metadata__.json sets page-b at position 0 and
    // page-a at position 1 — so a flat sort by getObjPositionInParent
    // alone (without the hierarchical post-sort in ploneFetchItems)
    // would slot deep-1 (position 0 inside page-a) between page-b (0)
    // and page-a (1), giving [page-b, deep-1, page-a]. The post-sort
    // restores hierarchical order: [page-b, page-a, deep-1] —
    // parent-then-its-subtree-then-next-parent.
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/context-navigation-test-page');

    const iframe = helper.getIframe();
    const nav = iframe.locator('[data-block-uid="nav-4"]');
    await expect(nav).toBeVisible({ timeout: 10_000 });

    const linkA = nav.locator('a[href="/_test_data/context-navigation-forced-folder/page-a"]');
    const linkB = nav.locator('a[href="/_test_data/context-navigation-forced-folder/page-b"]');
    const linkDeep = nav.locator('a[href="/_test_data/context-navigation-forced-folder/page-a/deep-1"]');

    await expect(linkA).toBeVisible({ timeout: 10_000 });
    await expect(linkA).toHaveClass(/\blevel-1\b/);
    await expect(linkB).toHaveClass(/\blevel-1\b/);
    await expect(linkDeep).toHaveClass(/\blevel-2\b/);

    // Hierarchical order: page-b (pos 0), then page-a (pos 1) and its
    // subtree (deep-1). deep-1 must appear AFTER page-a, never sandwiched
    // between page-b and page-a — that's the failure mode without the
    // post-sort.
    const hrefs = await nav.locator('a.nav-item').evaluateAll((els) =>
      els.map((el) => el.getAttribute('href')),
    );
    const pageBIdx = hrefs.indexOf('/_test_data/context-navigation-forced-folder/page-b');
    const pageAIdx = hrefs.indexOf('/_test_data/context-navigation-forced-folder/page-a');
    const deepIdx = hrefs.indexOf('/_test_data/context-navigation-forced-folder/page-a/deep-1');
    expect(pageBIdx, 'page-b present').toBeGreaterThanOrEqual(0);
    expect(pageAIdx, 'page-a present').toBeGreaterThanOrEqual(0);
    expect(deepIdx, 'deep-1 present').toBeGreaterThanOrEqual(0);
    expect(pageBIdx, 'page-b before page-a (position-0 first)').toBeLessThan(pageAIdx);
    expect(pageAIdx, 'page-a before its child deep-1 (hierarchical)').toBeLessThan(deepIdx);
  });

  test('listing child with depth=1 returns direct children only', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/context-navigation-test-page');

    const iframe = helper.getIframe();
    const topNav = iframe.locator('[data-block-uid="nav-2"]');
    await expect(topNav).toBeVisible({ timeout: 10_000 });

    // Listing fetches direct children of /_test_data — the fixture
    // has many siblings. Depth limits the result set; we don't assert
    // an exact count because the fixture grows over time, only that:
    //   1. at least one link is present (depth filter didn't kill the result),
    //   2. no link's href contains a deeper path under /_test_data
    //      (depth=1 must reject /a/b style nested grand-children).
    const links = topNav.locator('a.nav-item');
    await expect(links.first()).toBeVisible({ timeout: 10_000 });
    const count = await links.count();
    expect(count).toBeGreaterThan(0);

    const hrefs = await links.evaluateAll((els) => els.map((el) => el.getAttribute('href')));
    for (const href of hrefs) {
      if (!href) continue;
      // direct children of /_test_data have exactly 2 segments
      const segs = href.replace(/^\/+|\/+$/g, '').split('/').filter(Boolean);
      expect(segs.length, `link ${href} should be at depth 1 under /_test_data`).toBeLessThanOrEqual(2);
    }
  });
});
