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
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { test, expect } from '../fixtures';
import { AdminUIHelper } from '../helpers/AdminUIHelper';

// When CAPTURE_MOBILE_SCREENSHOTS=1, the four "snapshot" tests at the
// bottom of this file each save a viewport screenshot into the editor
// guide's _images dir. These tests intentionally re-use the
// already-proven admin-mock setup so the bridge handshake (which is
// flaky with Nuxt in headless capture) is reliable.
const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const SHOTS_OUT_DIR = path.join(
  SCRIPT_DIR,
  '..',
  '..',
  'docs',
  'what-editors-will-experience',
  '_images',
);
const CAPTURE_SHOTS = process.env.CAPTURE_MOBILE_SCREENSHOTS === '1';

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

  test('collapsed sidebar trigger sliver remains visible + clickable on desktop (stock Volto)', async ({
    page,
  }) => {
    // Counterpart to the mobile "no sidebar sliver on the right edge"
    // test: on desktop, Volto's stock .trigger sliver MUST stay
    // visible+clickable so editors can expand a collapsed sidebar from
    // the right edge. The mobile fix is scoped to max-width: 767px and
    // must not bleed into desktop.
    await page.setViewportSize({ width: 1280, height: 800 });
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/test-page');

    const trigger = page.locator('.sidebar-container .trigger');
    await expect(trigger).toBeVisible();

    // Click to collapse, then assert the trigger is STILL visible (the
    // sliver) and is positioned somewhere inside the viewport (i.e.
    // unlike on mobile it is NOT pushed offscreen by the mobile fix).
    await trigger.click();
    await expect(page.locator('.sidebar-container.collapsed')).toBeAttached({
      timeout: 5000,
    });
    // Wait for the 300ms sidebar-slide transition to settle so bbox is stable.
    await expect(async () => {
      const tb = await trigger.boundingBox();
      expect(tb).not.toBeNull();
      expect(tb!.x, 'trigger inside viewport (not pushed offscreen)').toBeLessThan(
        1280,
      );
      expect(tb!.x + tb!.width, 'trigger inside viewport').toBeGreaterThan(0);
    }).toPass({ timeout: 3000 });
    await expect(trigger).toBeVisible();

    // Clicking the sliver re-expands — the affordance is functional, not
    // just visible.
    await trigger.click();
    await expect(page.locator('.sidebar-container.collapsed')).toHaveCount(0, {
      timeout: 5000,
    });
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

  test('⋯ menu bottom sheet: back-arrow is at the TOP, last item visible below it', async ({
    page,
  }) => {
    // Regression: I shipped the back-arrow at the BOTTOM-LEFT of the
    // sheet, which (a) breaks mobile bottom-sheet convention (close
    // affordance belongs at the top) and (b) overlapped the last menu
    // item ("Remove") so it got hidden behind the button. This test
    // asserts both: the back arrow sits in the top half of the sheet
    // AND every menu item's bottom edge is above the back arrow's top
    // edge (i.e. no item is drawn under it).
    await page.setViewportSize({ width: 375, height: 812 });
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/test-page');
    await helper.clickBlockInIframe('block-1-uuid');

    await page.locator('.quanta-toolbar button:has-text("⋯")').click();
    const menu = page.locator('.volto-hydra-dropdown-menu');
    await expect(menu).toBeVisible();
    const mb = await menu.boundingBox();
    const back = page.locator('.volto-hydra-dropdown-menu .mobile-sheet-back');
    await expect(back).toBeVisible();
    const bb = await back.boundingBox();

    // Back arrow lives in the TOP half of the sheet (within ~80px of
    // the sheet's top edge).
    expect(
      bb!.y - mb!.y,
      'back arrow should be near the top of the sheet',
    ).toBeLessThan(80);
    expect(
      bb!.y - mb!.y,
      'back arrow should not be at the bottom of the sheet',
    ).toBeLessThan(mb!.height / 2);

    // Every menu item must be FULLY visible (top and bottom inside the
    // viewport) — proves nothing is clipped at the sheet's bottom edge
    // (the old 70vh max-height + cramped layout hid "Remove").
    const items = page.locator('.volto-hydra-dropdown-menu .volto-hydra-dropdown-item');
    const count = await items.count();
    expect(count, 'menu should render its items').toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      const ib = await items.nth(i).boundingBox();
      expect(
        ib!.y + ib!.height,
        `menu item ${i} must be inside the viewport`,
      ).toBeLessThanOrEqual(812);
      // And not under the back arrow (its top edge stays below the back
      // button's bottom edge OR is not horizontally overlapping it).
      const itemOverlapsBack =
        ib!.y < bb!.y + bb!.height &&
        ib!.y + ib!.height > bb!.y &&
        ib!.x < bb!.x + bb!.width &&
        ib!.x + ib!.width > bb!.x;
      expect(
        itemOverlapsBack,
        `menu item ${i} must not overlap the back arrow`,
      ).toBe(false);
    }
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

    // Regression: stock Volto's .trigger button is part of every
    // sidebar (it's the right-edge sliver on desktop). On mobile the
    // sheet doesn't need it — we have the X close in the page-header.
    // Worse, .trigger:before is a 4px blue highlight bar at left:0 which
    // used to leak through as a stray vertical line on the full-screen
    // sheet (visible in mobile-sidebar-fullscreen.png before the fix).
    await expect(
      sidebar.locator('.trigger'),
      'stock .trigger must not be visible on the mobile sidebar sheet',
    ).toBeHidden();

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

  /**
   * Slate LinkEditor on mobile.
   *
   * Desktop behavior (inline-editing-links.spec.ts:12): the LinkEditor
   * popup sits ON TOP OF Quanta in the same x/y as the format toolbar
   * — clicking "link" swaps Quanta for the URL form, same place.
   *
   * Mobile must preserve that mental model: the LinkEditor covers the
   * top toolbar (Quanta), full-width, NOT as a bottom sheet. The
   * picker (browse → ObjectBrowser, rendered inside SidebarPopup's
   * <aside class="sidebar-container">) takes the WHOLE SCREEN, like
   * the main sidebar does when expanded on mobile.
   */
  test('LinkEditor on mobile covers Quanta at the top of the viewport', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/test-page');

    const blockId = 'block-1-uuid';
    await helper.editBlockTextInIframe(blockId, 'Tap me');
    const editor = await helper.getEditorLocator(blockId);
    await helper.selectAllTextInEditor(editor);
    await helper.clickFormatButton('link');

    const linkEditor = page.locator('.add-link').first();
    await expect(linkEditor).toBeVisible({ timeout: 5000 });

    // Pinned to top, full-width (NOT a bottom sheet).
    const lb = await linkEditor.boundingBox();
    expect(lb).not.toBeNull();
    expect(lb!.y, 'LinkEditor sits at the top of the viewport').toBeLessThan(5);
    expect(lb!.x, 'LinkEditor starts at viewport left').toBeLessThan(5);
    expect(
      lb!.x + lb!.width,
      'LinkEditor reaches viewport right',
    ).toBeGreaterThan(370);

    // Quanta sits at top:0 too — the LinkEditor must visually cover it.
    // Same vertical band (overlap), not below it.
    const qb = await page.locator('.quanta-toolbar').boundingBox();
    expect(qb).not.toBeNull();
    expect(
      lb!.y,
      'LinkEditor y must overlap Quanta y (i.e. cover it, not sit below)',
    ).toBeLessThanOrEqual(qb!.y + 5);

    // Can actually type + submit a URL from the top-pinned editor.
    const urlInput = await helper.getLinkEditorUrlInput();
    await urlInput.fill('https://plone.org');
    await urlInput.press('Enter');

    await expect(async () => {
      const html = await editor.innerHTML();
      expect(html).toContain('<a ');
      expect(html).toContain('https://plone.org');
    }).toPass({ timeout: 5000 });

    // After submit the LinkEditor goes away (Quanta still visible).
    await expect(page.locator('.add-link')).not.toBeVisible();
    await expect(page.locator('.quanta-toolbar')).toBeVisible();
  });

  test('object-browser picker takes the whole screen on mobile', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/test-page');

    const blockId = 'block-1-uuid';
    await helper.editBlockTextInIframe(blockId, 'Tap me');
    const editor = await helper.getEditorLocator(blockId);
    await helper.selectAllTextInEditor(editor);
    await helper.clickFormatButton('link');

    await expect(page.locator('.add-link').first()).toBeVisible({
      timeout: 5000,
    });

    // The browse button inside the LinkEditor opens the ObjectBrowser
    // picker. It's rendered as <aside class="sidebar-container"> by
    // SidebarPopup (Volto core), so my existing
    // .sidebar-container:not(.collapsed) full-screen rule applies.
    await page.locator('.add-link .link-form-container button').first().click();

    const picker = page.locator('.object-browser').first();
    await expect(picker).toBeVisible({ timeout: 5000 });

    // The picker's wrapping .sidebar-container must be full-viewport.
    const wrapper = picker.locator('xpath=ancestor::*[contains(@class, "sidebar-container")]').first();
    const wb = await wrapper.boundingBox();
    expect(wb).not.toBeNull();
    expect(wb!.x, 'picker wrapper covers viewport left').toBeLessThan(5);
    expect(wb!.y, 'picker wrapper covers viewport top').toBeLessThan(5);
    expect(
      wb!.x + wb!.width,
      'picker wrapper covers viewport right',
    ).toBeGreaterThan(370);
    expect(
      wb!.y + wb!.height,
      'picker wrapper covers viewport bottom',
    ).toBeGreaterThan(800);
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
    // Regression: v1 of this button used a unicode ⬆ glyph at color
    // #666 / 14px — visibly invisible in screenshots and indistinct
    // from the ▲ sibling-reorder chevron. The fix replaced the glyph
    // with the standard Volto Icon component (up.svg) so the button
    // renders a real <svg> element. Asserting on <svg> presence
    // catches a regression back to a bare text glyph at this size.
    await expect(
      btn.locator('svg'),
      'select-parent button must render an SVG icon (not a bare unicode glyph)',
    ).toBeVisible();

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

/**
 * Mobile screenshots for the Editor Guide.
 *
 * Skipped by default. Run with:
 *   CAPTURE_MOBILE_SCREENSHOTS=1 pnpm exec playwright test \
 *     tests-playwright/integration/mobile-tablet-admin-layout.spec.ts \
 *     --project=admin-mock --grep "screenshot:"
 *
 * Uses the admin-mock test frontend (not Nuxt) because admin-mock's
 * bridge handshake is reliable in headless capture. The visuals show
 * the editor *chrome* — Quanta, bottom toolbar, sidebar sheet, link
 * editor, picker — which is the same on every Hydra frontend; the
 * iframe content underneath is whatever the test fixture renders.
 */
test.describe('Editor Guide screenshots — mobile', () => {
  test.skip(!CAPTURE_SHOTS, 'set CAPTURE_MOBILE_SCREENSHOTS=1 to capture');

  test.beforeAll(() => {
    fs.mkdirSync(SHOTS_OUT_DIR, { recursive: true });
  });

  const snap = async (
    page: import('@playwright/test').Page,
    name: string,
  ) => {
    const file = path.join(SHOTS_OUT_DIR, `${name}.png`);
    await page.screenshot({ path: file, fullPage: false });
  };

  test('screenshot: mobile-block-selected — Quanta top + compact bottom toolbar', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/test-page');

    await helper.clickBlockInIframe('block-1-uuid');
    await page.waitForTimeout(300);

    await snap(page, 'mobile-block-selected');
  });

  test('screenshot: mobile-dropdown-menu — ⋯ menu as a bottom sheet', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/test-page');

    await helper.clickBlockInIframe('block-1-uuid');
    await page.locator('.quanta-toolbar .volto-hydra-menu-trigger').click();
    await expect(page.locator('.volto-hydra-dropdown-menu')).toBeVisible({
      timeout: 3000,
    });
    await page.waitForTimeout(300);

    await snap(page, 'mobile-dropdown-menu');
  });

  test('screenshot: mobile-sidebar-fullscreen — sidebar covers everything', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/test-page');

    // Open via the bottom-toolbar Settings shortcut (the mobile path).
    await page.locator('#toolbar-body .sidebar-toggle-toolbar-btn').click();
    await expect(page.locator('.sidebar-container')).toBeVisible({
      timeout: 3000,
    });
    await expect(page.locator('.sidebar-container.collapsed')).toHaveCount(0, {
      timeout: 3000,
    });
    await page.waitForTimeout(300);

    await snap(page, 'mobile-sidebar-fullscreen');
  });

  test('screenshot: mobile-select-parent — ⬆ button on a nested block', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/test-page');

    // manual-teaser lives inside block-8-grid → parent button appears.
    await helper.clickBlockInIframe('manual-teaser');
    await expect(page.locator('.quanta-toolbar .select-parent-btn')).toBeVisible(
      { timeout: 3000 },
    );
    await page.waitForTimeout(300);

    await snap(page, 'mobile-select-parent');
  });
});
