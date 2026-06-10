/**
 * Admin layout across three breakpoints (desktop / tablet / mobile).
 *
 * Spec: docs/superpowers/specs/2026-06-08-mobile-tablet-admin-layout-design.md
 *
 * IMPORTANT — these tests assert USER-VISIBLE behavior, not raw
 * bounding-box coordinates of named elements. A pure coordinate
 * assertion can pass even when an element is faded, covered by a
 * sibling, or unable to receive clicks. Each test below either:
 *   - calls toBeVisible() / toBeHidden() on the actual affordance, OR
 *   - performs the user action (click) and asserts the resulting
 *     state change, OR
 *   - asserts a layout invariant (no overlap, opacity > 0) that
 *     reflects what the editor actually sees.
 *
 * Breakpoints aligned with Volto's own (Semantic UI largestMobileScreen
 * = 767px). Going narrower than that triggers Volto's stock toolbar
 * collapse which fights any tablet-style rule we'd add — so we adopt
 * Volto's boundary instead of redoing the cascade fight.
 */
import { test, expect } from '../fixtures';
import { AdminUIHelper } from '../helpers/AdminUIHelper';

test.describe('Admin layout — desktop control (≥1024px)', () => {
  test('main toolbar pinned left, sidebar pinned right, drag handle visible, chevrons hidden', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/test-page');
    await helper.clickBlockInIframe('block-1-uuid');

    const toolbar = page.locator('#toolbar-body');
    const sidebar = page.locator('.sidebar-container');

    const tb = await toolbar.boundingBox();
    const sb = await sidebar.boundingBox();
    expect(tb!.x).toBeLessThan(50);
    expect(sb!.x + sb!.width).toBeGreaterThan(1280 - 50);
    expect(tb!.x + tb!.width).toBeLessThan(sb!.x);

    await expect(page.locator('.quanta-toolbar .drag-handle')).toBeVisible();
    await expect(page.locator('.quanta-toolbar .chevron-up')).toBeHidden();
    await expect(page.locator('.quanta-toolbar .chevron-down')).toBeHidden();
  });
});

test.describe('Admin layout — tablet (768–1023px)', () => {
  test('canvas / sidebar / toolbar columns do not overlap each other', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 900, height: 1024 });
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/test-page');

    const toolbar = page.locator('#toolbar-body');
    const sidebar = page.locator('.sidebar-container');
    const iframe = page.locator('#previewIframe');

    const tb = await toolbar.boundingBox();
    const sb = await sidebar.boundingBox();
    const ib = await iframe.boundingBox();

    // Toolbar pinned to the right edge
    expect(tb!.x + tb!.width).toBeGreaterThan(900 - 5);
    // Sidebar ends where the toolbar begins (no horizontal overlap)
    expect(sb!.x + sb!.width).toBeLessThanOrEqual(tb!.x + 1);
    // Iframe ends where the sidebar begins (no horizontal overlap with sidebar)
    expect(ib!.x + ib!.width).toBeLessThanOrEqual(sb!.x + 1);
  });
});

test.describe('Admin layout — mobile (≤767px)', () => {
  // Mobile range extended to match Volto's own largestMobileScreen=767
  // breakpoint. Anything narrower triggers Volto's own toolbar collapse
  // (toolbar moves to top horizontally) which our tablet rules can't
  // unwind cleanly, so we treat that whole zone as mobile.

  test('Quanta is visible and stays visible at top (no fade) on block tap', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/test-page');
    await helper.clickBlockInIframe('block-1-uuid');

    const quanta = page.locator('.quanta-toolbar');
    await expect(quanta).toBeVisible();
    const qb = await quanta.boundingBox();
    expect(qb!.y).toBeLessThan(20); // pinned to top

    // Wait past the 5s desktop fade-timer; mobile must keep Quanta visible.
    await page.waitForTimeout(6000);
    await expect(quanta).toBeVisible();
    await expect(quanta).toHaveCSS('opacity', '1');
  });

  test('main toolbar pinned to bottom; iframe canvas occupies the space between', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/test-page');
    await helper.clickBlockInIframe('block-1-uuid');

    const quanta = page.locator('.quanta-toolbar');
    const toolbar = page.locator('#toolbar-body');
    const iframe = page.locator('#previewIframe');

    await expect(quanta).toBeVisible();
    await expect(toolbar).toBeVisible();
    await expect(iframe).toBeVisible();

    const tb = await toolbar.boundingBox();
    const ib = await iframe.boundingBox();
    const qb = await quanta.boundingBox();

    expect(tb!.y + tb!.height).toBeGreaterThan(812 - 20);
    // iframe canvas doesn't overlap toolbar or Quanta
    expect(ib!.y).toBeGreaterThanOrEqual(qb!.height - 1);
    expect(ib!.y + ib!.height).toBeLessThanOrEqual(tb!.y + 1);
  });

  test('mobile (700px in Volto-collapse zone) still uses the mobile layout', async ({
    page,
  }) => {
    // Regression: at 700px (Volto's stock-mobile zone), without proper
    // breakpoint alignment the toolbar collapses to top horizontally and
    // the user sees nothing like the spec'd mobile layout. Asserts our
    // mobile rules win at 700px too.
    await page.setViewportSize({ width: 700, height: 812 });
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/test-page');
    await helper.clickBlockInIframe('block-1-uuid');

    const toolbar = page.locator('#toolbar-body');
    const tb = await toolbar.boundingBox();
    // Toolbar at bottom (mobile layout) — NOT at top (Volto's stock collapse)
    expect(tb!.y + tb!.height).toBeGreaterThan(812 - 20);
    expect(tb!.y).toBeGreaterThan(400);
  });

  test('sidebar is collapsed (off-screen) by default on mobile', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/test-page');

    // .sidebar-container.collapsed has right:-355px (stock rule).
    await expect(page.locator('.sidebar-container.collapsed')).toBeAttached({
      timeout: 5000,
    });
    // Iframe canvas is reachable (not covered by sidebar)
    await expect(page.locator('#previewIframe')).toBeVisible();
  });

  test('no sidebar sliver on the right edge when collapsed', async ({
    page,
  }) => {
    // Stock Volto leaves a 20px sliver of the sidebar visible at the
    // right edge of the viewport on narrow screens (sidebar.less:114-121)
    // as a "trigger" to expand it. With the Settings shortcut in the
    // bottom toolbar, that sliver is redundant cruft. Regression: ensure
    // nothing of the collapsed sidebar (including its .trigger button)
    // sits inside the viewport's right edge.
    await page.setViewportSize({ width: 375, height: 812 });
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/test-page');

    await expect(page.locator('.sidebar-container.collapsed')).toBeAttached({
      timeout: 5000,
    });

    const sb = await page.locator('.sidebar-container.collapsed').boundingBox();
    expect(sb!.x, 'sidebar must be fully offscreen on the right').toBeGreaterThanOrEqual(
      375,
    );

    // The .trigger button (which is the stock sliver) must not be
    // visible to the editor on mobile.
    await expect(
      page.locator('.sidebar-container.collapsed .trigger'),
    ).toBeHidden();
  });

  test('⋯ menu opens as a bottom sheet with back-arrow that dismisses it', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/test-page');
    await helper.clickBlockInIframe('block-1-uuid');

    await page.locator('.quanta-toolbar button:has-text("⋯")').click();
    const menu = page.locator('.volto-hydra-dropdown-menu');
    await expect(menu).toBeVisible();
    const mb = await menu.boundingBox();
    expect(mb!.y + mb!.height).toBeGreaterThan(812 - 20);

    const back = page.locator('.volto-hydra-dropdown-menu .mobile-sheet-back');
    await expect(back).toBeVisible();
    await back.click();
    await expect(menu).not.toBeVisible({ timeout: 3000 });
  });

  test('opening sidebar via ⋯ → Settings makes it full-screen; close button actually dismisses', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/test-page');
    await helper.clickBlockInIframe('block-1-uuid');

    await page.locator('.quanta-toolbar button:has-text("⋯")').click();
    await page.locator('.volto-hydra-dropdown-menu :text("Settings")').click();

    const sidebar = page.locator('.sidebar-container');
    await expect(sidebar).toBeVisible();
    await expect(async () => {
      const sb = await sidebar.boundingBox();
      expect(sb!.x).toBeLessThan(5);
      expect(sb!.x + sb!.width).toBeGreaterThan(370);
      expect(sb!.y).toBeLessThan(5);
      expect(sb!.y + sb!.height).toBeGreaterThan(800);
    }).toPass({ timeout: 3000 });

    // Close button must be visible AND clickable AND non-overlapping the
    // page-header title text (regression: user reported it overlapped).
    const close = sidebar.locator('.sidebar-close-button');
    await expect(close).toBeVisible();
    const closeBox = await close.boundingBox();
    const title = sidebar.locator('.section-title');
    const titleBox = await title.boundingBox();
    const overlap =
      closeBox!.x < titleBox!.x + titleBox!.width &&
      closeBox!.x + closeBox!.width > titleBox!.x &&
      closeBox!.y < titleBox!.y + titleBox!.height &&
      closeBox!.y + closeBox!.height > titleBox!.y;
    expect(overlap, 'close button must not overlap the title').toBe(false);

    await close.click();
    await expect(page.locator('.sidebar-container.collapsed')).toBeAttached({
      timeout: 5000,
    });
  });

  test('chevron ▼ moves the selected block down within its parent', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/test-page');

    const initialOrder = await helper.getBlockOrder();
    await helper.clickBlockInIframe(initialOrder[0]);

    await expect(page.locator('.quanta-toolbar .drag-handle')).toBeHidden();
    const chevronDown = page.locator('.quanta-toolbar .chevron-down');
    await expect(chevronDown).toBeVisible();
    await chevronDown.click();

    await expect(async () => {
      const after = await helper.getBlockOrder();
      expect(after[0]).toBe(initialOrder[1]);
      expect(after[1]).toBe(initialOrder[0]);
    }).toPass({ timeout: 5000 });
  });

  /**
   * Every popup the admin surfaces should render as a bottom sheet on
   * mobile — same geometry, same gesture. Assert each known popup's
   * bounding box pins to the bottom and spans full width.
   */
  const isBottomSheet = async (
    page: import('@playwright/test').Page,
    selector: string,
  ) => {
    const locator = page.locator(selector);
    await expect(locator).toBeVisible();
    const box = await locator.boundingBox();
    expect(box, `${selector} should have a box`).not.toBeNull();
    expect(box!.y + box!.height, `${selector} bottom edge`).toBeGreaterThan(
      812 - 20,
    );
    expect(box!.x, `${selector} left edge`).toBeLessThan(5);
    expect(
      box!.x + box!.width,
      `${selector} right edge`,
    ).toBeGreaterThan(370);
  };

  test('frontend switcher panel renders as a bottom sheet', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/test-page');

    await page.locator('#toolbar-frontend-switcher').click();
    await isBottomSheet(page, '.frontend-switcher-panel');
  });

  test('frontend settings modal renders as a bottom sheet', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/test-page');

    await page.locator('#toolbar-frontend-switcher').click();
    await page
      .locator('.frontend-switcher-panel .frontend-switcher-settings-btn')
      .click();
    await isBottomSheet(page, '.frontend-settings-modal');
  });

  test('sidebar starts collapsed on mobile EVEN IF a desktop sidebar_expanded=true cookie exists', async ({
    page,
    context,
  }) => {
    // Reproduces the user-reported regression: a previous desktop
    // session left sidebar_expanded=true; visiting on mobile would
    // honour that cookie and open the full-screen sheet on first
    // load. Mobile should ignore the cookie and always start collapsed.
    await context.addCookies([
      {
        name: 'sidebar_expanded',
        value: 'true',
        url: 'http://localhost:3001',
      },
    ]);
    await page.setViewportSize({ width: 375, height: 812 });
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/test-page');

    await expect(page.locator('.sidebar-container.collapsed')).toBeAttached({
      timeout: 5000,
    });
    await expect(page.locator('#previewIframe')).toBeVisible();
  });

  test('main toolbar height matches Quanta (compact 44px bar)', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/test-page');
    await helper.clickBlockInIframe('block-1-uuid');

    const tb = await page.locator('#toolbar-body').boundingBox();
    const qb = await page.locator('.quanta-toolbar').boundingBox();
    expect(tb!.height, 'main toolbar should be 44px tall').toBeLessThanOrEqual(
      50,
    );
    expect(qb!.height, 'Quanta toolbar should be ~44px tall').toBeLessThanOrEqual(
      50,
    );
    // The two bars should feel balanced — within ±10px of each other
    expect(Math.abs(tb!.height - qb!.height)).toBeLessThanOrEqual(10);
  });

  test('Settings icon in bottom toolbar opens the sidebar (no ⋯ detour)', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/test-page');

    await expect(page.locator('.sidebar-container.collapsed')).toBeAttached({
      timeout: 5000,
    });
    const toggle = page.locator('#toolbar-body .sidebar-toggle-toolbar-btn');
    await expect(toggle).toBeVisible();
    await toggle.click();
    await expect(page.locator('.sidebar-container')).toBeVisible();
    await expect(page.locator('.sidebar-container.collapsed')).toHaveCount(0);
  });

  test('chevron ▲ disabled at top, ▼ disabled at bottom', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/test-page');

    const order = await helper.getBlockOrder();
    await helper.clickBlockInIframe(order[0]);
    await expect(page.locator('.quanta-toolbar .chevron-up')).toBeDisabled();

    await helper.clickBlockInIframe(order[order.length - 1]);
    await expect(page.locator('.quanta-toolbar .chevron-down')).toBeDisabled();
  });
});

/**
 * Select-parent button (⬆) in Quanta toolbar.
 *
 * Spec: docs/superpowers/specs/2026-06-09-select-parent-quanta-button-design.md
 *
 * Promoted from the ⋯ dropdown's "Select Container" item to a visible
 * Quanta button so editors can escape one level upward in a single tap.
 * Always-visible on all viewports (matches Gutenberg). The handler is
 * the existing onSelectBlock prop — iframe sync rides the existing
 * selectedBlock-watching effect in View.jsx.
 *
 * Nested block used for these tests: `manual-teaser` lives inside
 * `block-8-grid` (a gridBlock) per
 * tests-playwright/fixtures/content/test-page/data.json.
 */
test.describe('Quanta select-parent button (⬆)', () => {
  test('visible when a nested block is selected; clicking walks up one level', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/test-page');
    await helper.clickBlockInIframe('manual-teaser');

    const btn = page.locator('.quanta-toolbar .select-parent-btn');
    await expect(btn).toBeVisible();

    await btn.click();
    await helper.waitForBlockSelectedInAdmin('block-8-grid');
  });

  test('not rendered when a top-level block is selected', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/test-page');
    await helper.clickBlockInIframe('block-1-uuid');

    await expect(page.locator('.quanta-toolbar')).toBeVisible();
    await expect(
      page.locator('.quanta-toolbar .select-parent-btn'),
    ).toHaveCount(0);
  });

  test('repeat-clicks walk up the chain until top-level, then button hides', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/test-page');
    await helper.clickBlockInIframe('manual-teaser');

    const btn = page.locator('.quanta-toolbar .select-parent-btn');
    await expect(btn).toBeVisible();

    // One walk lands on block-8-grid which IS top-level — button must hide.
    await btn.click();
    await helper.waitForBlockSelectedInAdmin('block-8-grid');
    await expect(btn).toHaveCount(0);
  });

  test('regression: ⋯ dropdown no longer offers Select Container', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/test-page');
    await helper.clickBlockInIframe('manual-teaser');

    await page.locator('.quanta-toolbar .volto-hydra-menu-trigger').click();
    const menu = page.locator('.volto-hydra-dropdown-menu');
    await expect(menu).toBeVisible();
    await expect(menu.locator(':text("Select Container")')).toHaveCount(0);
  });

  test('mobile: button is visible and tappable inside Quanta at 375px', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/test-page');
    await helper.clickBlockInIframe('manual-teaser');

    const btn = page.locator('.quanta-toolbar .select-parent-btn');
    await expect(btn).toBeVisible();
    const box = await btn.boundingBox();
    // Sits within the viewport (no horizontal overflow hiding it)
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(375);

    await btn.click();
    await helper.waitForBlockSelectedInAdmin('block-8-grid');
  });
});
