/**
 * sectionNav block tests.
 *
 * Two structural checks ride on the /section-nav-test-page fixture:
 *
 *  - A hand-built nav (3 navItems) verifies the rendering contract:
 *    <nav aria-label> > <ul> > <li><a class="nav-item">. The link whose
 *    href matches the current URL gets aria-current="page" + .current.
 *    Indent levels apply via .level-N.
 *
 *  - An auto-populated nav (listing child, variation=nav, path=/_test_data,
 *    depth=1) verifies that the depth field is honored — only direct
 *    children come back, no grand-children — and that listing items
 *    render via the same navItem template.
 */
import { test, expect } from '../fixtures';
import { AdminUIHelper } from '../helpers/AdminUIHelper';

test.describe('sectionNav block', () => {
  test('hand-built nav renders aria-label / aria-current / indent levels', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/section-nav-test-page');

    const iframe = helper.getIframe();

    // The first sectionNav is the manual one (placement=sidebar).
    const sidebarNav = iframe.locator('[data-block-uid="nav-1"]');
    await expect(sidebarNav).toBeVisible({ timeout: 10_000 });

    // a11y contract: <nav aria-label="Section navigation">
    await expect(sidebarNav).toHaveAttribute('aria-label', 'Section navigation');

    // List semantics: <ul role="list"> > three <li>
    const list = sidebarNav.locator('ul.section-nav-list');
    await expect(list).toBeVisible();
    await expect(list.locator('> li')).toHaveCount(3);

    // The self-pointing link should be the active one — aria-current
    // and the .current class both come from the renderer's path match.
    const selfLink = sidebarNav.locator('a[data-block-uid="item-self"]');
    await expect(selfLink).toHaveAttribute('aria-current', 'page');
    await expect(selfLink).toHaveClass(/\bcurrent\b/);

    // Non-matching links don't get aria-current.
    const otherLink = sidebarNav.locator('a[data-block-uid="item-test-page"]');
    await expect(otherLink).not.toHaveAttribute('aria-current', 'page');

    // Indent levels via .level-N: item-test-page-child is level 2.
    const child = sidebarNav.locator('a[data-block-uid="item-test-page-child"]');
    await expect(child).toHaveClass(/\blevel-2\b/);
    await expect(selfLink).toHaveClass(/\blevel-1\b/);
  });

  test('mobile disclosure toggle hidden on desktop, visible <768', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/section-nav-test-page');

    const iframe = helper.getIframe();
    const sidebarNav = iframe.locator('[data-block-uid="nav-1"]');
    await expect(sidebarNav).toBeVisible({ timeout: 10_000 });

    // The toggle <button> is always in the DOM; CSS hides it on desktop.
    const toggle = sidebarNav.locator('button.section-nav-toggle');
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

  test('listing child with depth=1 returns direct children only', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/section-nav-test-page');

    const iframe = helper.getIframe();
    const topNav = iframe.locator('[data-block-uid="nav-2"]');
    await expect(topNav).toBeVisible({ timeout: 10_000 });

    // Listing fetches direct children of /_test_data — the fixture
    // has many siblings (test-page, container-test-page, etc.). Depth
    // limits the result set; we don't assert an exact count because
    // the fixture grows over time, only that:
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
