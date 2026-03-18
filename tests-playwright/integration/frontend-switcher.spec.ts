/**
 * Tests for the Frontend & Viewport Switcher toolbar menu.
 *
 * Validates:
 * - Toolbar button appears and opens the switcher panel
 * - Viewport switching constrains iframe width
 * - Frontend switching mid-edit preserves admin form data
 * - Menu visible in both edit and view mode
 */
import { test, expect } from '../fixtures';
import { AdminUIHelper } from '../helpers/AdminUIHelper';

test.describe('Frontend & Viewport Switcher', () => {
  test('toolbar button is visible and opens panel', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    // The frontend switcher button should be in the toolbar
    const switcherBtn = page.locator('#toolbar-frontend-switcher');
    await expect(switcherBtn).toBeVisible({ timeout: 10000 });

    // Click to open the panel
    await switcherBtn.click();

    // Panel should appear with viewport and frontend sections
    const panel = page.locator('.frontend-switcher-panel');
    await expect(panel).toBeVisible({ timeout: 5000 });

    // Should have viewport buttons
    const viewportBtns = panel.locator('.frontend-switcher-viewport-btn');
    await expect(viewportBtns).toHaveCount(3);

    // Should have at least one frontend URL
    const urlItems = panel.locator('.frontend-switcher-url-item');
    expect(await urlItems.count()).toBeGreaterThan(0);

    // Should have settings button
    const settingsBtn = panel.locator('.frontend-switcher-settings-btn');
    await expect(settingsBtn).toBeVisible();
  });

  test('viewport switching constrains iframe width', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    const iframe = page.locator('#previewIframe');
    const switcherBtn = page.locator('#toolbar-frontend-switcher');
    const panel = page.locator('.frontend-switcher-panel');

    // Helper to open the panel (handles toggle behavior)
    const openPanel = async () => {
      // If panel is already visible, it's ready
      if (await panel.isVisible()) return;
      await switcherBtn.click();
      await expect(panel).toBeVisible({ timeout: 5000 });
    };

    // Initially desktop - no max-width constraint
    await expect(iframe).toBeVisible({ timeout: 10000 });
    const initialStyle = await iframe.getAttribute('style');
    expect(initialStyle || '').not.toContain('max-width');

    // Open panel and click mobile
    await openPanel();
    await panel.locator('.frontend-switcher-viewport-btn').first().click();

    // Iframe should now have max-width: 375px
    await expect(iframe).toHaveAttribute('style', /max-width:\s*375px/, { timeout: 5000 });

    // Panel stays open after clicking viewport button — click tablet
    await panel.locator('.frontend-switcher-viewport-btn').nth(1).click();

    // Iframe should now have max-width: 768px
    await expect(iframe).toHaveAttribute('style', /max-width:\s*768px/, { timeout: 5000 });

    // Click desktop
    await panel.locator('.frontend-switcher-viewport-btn').nth(2).click();

    // Iframe should have no max-width constraint
    await expect(async () => {
      const style = await iframe.getAttribute('style');
      expect(style || '').not.toContain('max-width');
    }).toPass({ timeout: 5000 });
  });

  test('switching frontend mid-edit preserves form data without leave warning', async ({ page }) => {
    // This test needs two frontends running to verify a real switch.
    // admin-mock has mock frontend on 8888; admin-nuxt also has Nuxt on 3003.
    // When run on admin-mock alone, it switches to localhost:3003 which must be reachable.
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    const blockId = 'block-1-uuid';

    // Enter edit mode and type some text
    const editor = await helper.enterEditMode(blockId);
    await helper.selectAllTextInEditor(editor);
    await editor.pressSequentially('Unsaved changes test', { delay: 20 });

    // Wait for debounce
    await page.waitForTimeout(500);

    // Verify text is in the iframe
    const iframe = helper.getIframe();
    await expect(iframe.locator(`[data-block-uid="${blockId}"]`)).toContainText('Unsaved changes test');

    // Listen for any dialog (beforeunload "leave page?" warning)
    let dialogAppeared = false;
    page.on('dialog', async (dialog: any) => {
      dialogAppeared = true;
      await dialog.accept();
    });

    // Now open the switcher and switch frontend URL
    const switcherBtn = page.locator('#toolbar-frontend-switcher');
    await switcherBtn.click();

    const panel = page.locator('.frontend-switcher-panel');
    await expect(panel).toBeVisible();

    // Get the current iframe src to verify it changes
    const iframeEl = page.locator('#previewIframe');
    const srcBefore = await iframeEl.getAttribute('src');
    const currentOrigin = new URL(srcBefore!).origin;

    // Find a URL with a different origin
    const urlItems = panel.locator('.frontend-switcher-url-item');
    const urlCount = await urlItems.count();
    let targetUrl: string | null = null;
    for (let i = 0; i < urlCount; i++) {
      const item = urlItems.nth(i);
      const urlText = await item.getAttribute('title');
      if (urlText && new URL(urlText).origin !== currentOrigin) {
        // Check if this frontend is actually reachable before clicking
        try {
          const resp = await page.request.get(urlText, { timeout: 3000 });
          if (resp.ok()) {
            targetUrl = urlText;
            await item.click();
            break;
          }
        } catch {
          // Not reachable, try next
        }
      }
    }

    if (!targetUrl) {
      test.skip(true, 'No reachable frontend with different origin available for switching test');
      return;
    }

    // No "leave page?" dialog should have appeared
    expect(dialogAppeared).toBe(false);

    // Verify the iframe src actually changed to the new frontend origin
    await expect(async () => {
      const srcAfter = await iframeEl.getAttribute('src');
      expect(srcAfter).not.toBeNull();
      expect(new URL(srcAfter!).origin).not.toBe(currentOrigin);
    }).toPass({ timeout: 10000 });

    // Wait for iframe to reload with new frontend
    await helper.waitForIframeReady();

    // The block should still have the text we typed (admin form data preserved in Redux)
    const newIframe = helper.getIframe();
    await expect(newIframe.locator(`[data-block-uid="${blockId}"]`)).toContainText('Unsaved changes test', { timeout: 10000 });

    // The same block should still be selected (Quanta toolbar visible on it)
    await helper.waitForQuantaToolbar(blockId);
  });

  test('switching to hash-based frontend stays in edit mode', async ({ page }) => {
    // Reproduces production bug: F7 uses hash-bang routing (#!/path).
    // When switching to F7, the iframe should stay in edit mode and render content.
    // Bug: F7's router strips _edit param, hydra.js sends PATH_CHANGE with
    // double-slash path, Volto exits edit mode.
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');
    await helper.waitForIframeReady();

    // Open frontend switcher settings and add hash-based URL
    const switcherBtn = page.locator('#toolbar-frontend-switcher');
    await switcherBtn.click();
    const panel = page.locator('.frontend-switcher-panel');
    await expect(panel).toBeVisible();

    const settingsBtn = panel.locator('.frontend-switcher-settings-btn');
    await settingsBtn.click();

    const modal = page.locator('.frontend-settings-modal');
    await expect(modal).toBeVisible({ timeout: 5000 });

    // Add F7 hash-based URL
    const input = modal.locator('.frontend-settings-input');
    await input.fill('http://localhost:3008/#!');
    await modal.locator('.frontend-settings-add-btn').click();

    // Close modal
    await modal.locator('.frontend-settings-close').click();
    await expect(modal).not.toBeVisible({ timeout: 5000 });

    // Select the F7 URL in the switcher panel
    const f7Item = panel.locator('.frontend-switcher-url-item', { hasText: 'localhost:3008' });
    await expect(f7Item).toBeVisible();
    await f7Item.click();

    // Wait for iframe to load F7 and render content
    const iframe = helper.getIframe();
    await expect(iframe.locator('[data-block-uid]').first()).toBeVisible({ timeout: 15000 });

    // Verify we're still in edit mode (URL ends with /edit)
    expect(page.url()).toContain('/edit');

    // Verify the iframe has F7 content (not a blank page or redirect)
    const blockCount = await iframe.locator('[data-block-uid]').count();
    expect(blockCount).toBeGreaterThan(0);
  });

  test('toolbar button visible in view mode', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    // Navigate to view mode (not edit)
    await page.goto('http://localhost:3001/test-page');
    await page.waitForLoadState('networkidle');

    const switcherBtn = page.locator('#toolbar-frontend-switcher');
    await expect(switcherBtn).toBeVisible({ timeout: 10000 });
  });
});
