/**
 * Admin layout across three breakpoints (desktop / tablet / mobile).
 *
 * Implements the test plan from
 * docs/superpowers/specs/2026-06-08-mobile-tablet-admin-layout-design.md.
 *
 * The desktop-control describe-block is the "desktop unchanged" guarantee
 * — every subsequent commit in this PR must keep it green. CSS-scoped
 * media queries shouldn't leak to widths ≥ 1024px.
 */
import { test, expect } from '../fixtures';
import { AdminUIHelper } from '../helpers/AdminUIHelper';

test.describe('Admin layout — desktop control (≥1024px)', () => {
  test('main toolbar on the left, sidebar on the right, drag handle visible, no chevrons', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/test-page');
    await helper.clickBlockInIframe('block-1-uuid');

    const toolbar = page.locator('#toolbar-body');
    const sidebar = page.locator('.sidebar-container');
    const dragHandle = page.locator('.quanta-toolbar .drag-handle');
    // Chevrons aren't in the DOM yet (added in Task 6). Use toHaveCount(0)
    // here; Task 6 Step 7 updates these two assertions to
    // toHaveCSS('display', 'none') once the buttons are always-rendered.
    const chevronUp = page.locator('.quanta-toolbar .chevron-up');
    const chevronDown = page.locator('.quanta-toolbar .chevron-down');

    const tb = await toolbar.boundingBox();
    const sb = await sidebar.boundingBox();
    expect(tb, '#toolbar bounding box').not.toBeNull();
    expect(sb, '#sidebar bounding box').not.toBeNull();

    // toolbar pinned to left edge, sidebar to right edge
    expect(tb!.x).toBeLessThan(50);
    expect(sb!.x + sb!.width).toBeGreaterThan(1280 - 50);
    expect(tb!.x + tb!.width).toBeLessThan(sb!.x); // no overlap

    await expect(dragHandle).toBeVisible();
    // Chevrons are now always-rendered (Task 6) but hidden on desktop.
    // Use toBeHidden() — it honours ancestor display:none on the
    // .chevron-buttons wrapper, whereas toHaveCSS reports the button's
    // own (default) display: inline-block.
    await expect(chevronUp).toBeHidden();
    await expect(chevronDown).toBeHidden();
  });
});

test.describe('Admin layout — tablet (601–1023px)', () => {
  test('order left-to-right: canvas, sidebar, toolbar', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/test-page');

    const toolbar = page.locator('#toolbar-body');
    const sidebar = page.locator('.sidebar-container');

    const tb = await toolbar.boundingBox();
    const sb = await sidebar.boundingBox();
    expect(tb, '#toolbar bounding box').not.toBeNull();
    expect(sb, '#sidebar bounding box').not.toBeNull();

    // toolbar pinned to RIGHT edge on tablet (was left on desktop)
    expect(tb!.x + tb!.width).toBeGreaterThan(768 - 50);
    // sidebar sits between canvas and toolbar
    expect(sb!.x + sb!.width).toBeLessThanOrEqual(tb!.x);
  });
});

test.describe('Admin layout — mobile (≤600px)', () => {
  test('quanta pinned top, main toolbar pinned bottom, iframe canvas between', async ({
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

    const qb = await quanta.boundingBox();
    const tb = await toolbar.boundingBox();
    const ib = await iframe.boundingBox();
    expect(qb).not.toBeNull();
    expect(tb).not.toBeNull();
    expect(ib).not.toBeNull();

    expect(qb!.y).toBeLessThan(20); // quanta pinned to top
    expect(tb!.y + tb!.height).toBeGreaterThan(812 - 20); // toolbar pinned bottom
    expect(ib!.y).toBeGreaterThanOrEqual(qb!.height - 1);
    expect(ib!.y + ib!.height).toBeLessThanOrEqual(tb!.y + 1);
  });

  test('⋯ menu opens as a bottom sheet with a visible back-arrow', async ({
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
    expect(mb!.y + mb!.height).toBeGreaterThan(812 - 20); // pinned to bottom
    expect(mb!.x).toBeLessThan(20);
    expect(mb!.x + mb!.width).toBeGreaterThan(355);

    const back = page.locator('.volto-hydra-dropdown-menu .mobile-sheet-back');
    await expect(back).toBeVisible();
  });

  test('opening sidebar makes it full-screen with a visible close button', async ({
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
    // The sidebar slides in via a 300ms CSS transition (right →, height ↕,
    // top ↕ — stock sidebar.less). Poll the bounding box until it settles
    // to the full-screen geometry, otherwise we read a mid-transition rect.
    await expect(async () => {
      const sb = await sidebar.boundingBox();
      expect(sb!.x).toBeLessThan(5);
      expect(sb!.x + sb!.width).toBeGreaterThan(370);
      expect(sb!.y).toBeLessThan(5);
      expect(sb!.y + sb!.height).toBeGreaterThan(800);
    }).toPass({ timeout: 3000 });

    const close = sidebar.locator('.sidebar-close-button');
    await expect(close).toBeVisible();
    await close.click();
    // After close, the sidebar gets .collapsed (existing rule slides
    // it off-screen via right: -355px). It's still in the DOM, so
    // assert the class rather than toBeVisible.
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
