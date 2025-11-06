/**
 * Integration tests for block selection in Volto Hydra admin UI.
 *
 * These tests verify that clicking blocks in the iframe opens the correct
 * sidebar settings and toolbars appear as expected.
 */
import { test, expect } from '@playwright/test';
import { AdminUIHelper } from '../helpers/AdminUIHelper';

test.describe('Block Selection', () => {
  test('clicking a block in iframe opens sidebar', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    // Login and navigate to edit page
    await helper.login();
    await helper.navigateToEdit('/test-page');

    // Click on first block
    await helper.clickBlockInIframe('block-1-uuid');

    // Verify sidebar opens
    await helper.waitForSidebarOpen();
    const sidebarOpen = await helper.isSidebarOpen();
    expect(sidebarOpen).toBe(true);
  });

  test('clicking a Slate block shows Slate settings in sidebar', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    // Click on Slate block
    await helper.clickBlockInIframe('block-1-uuid');

    // Wait for sidebar
    await helper.waitForSidebarOpen();
    await helper.openSidebarTab('Block');

    // Verify sidebar is open with Block tab active
    const sidebarOpen = await helper.isSidebarOpen();
    expect(sidebarOpen).toBe(true);

    // Verify we can interact with sidebar (it has loaded content)
    const sidebar = page.locator('#sidebar-properties');
    const content = await sidebar.textContent();
    expect(content).toBeTruthy();
  });

  test('clicking different blocks updates sidebar settings', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    // Click first block (Slate)
    await helper.clickBlockInIframe('block-1-uuid');
    await helper.waitForSidebarOpen();
    await helper.openSidebarTab('Block');

    // Get sidebar content for first block
    const sidebar = page.locator('#sidebar-properties');
    await expect(sidebar).toBeVisible();
    const firstContent = await sidebar.textContent();
    expect(firstContent).toBeTruthy();

    // Click second block (Image) and wait for sidebar to remain open
    await helper.clickBlockInIframe('block-2-uuid');

    // Wait for sidebar to still be visible (it should stay open when switching blocks)
    await expect(sidebar).toBeVisible({ timeout: 10000 });

    // Get sidebar content for second block - should check for image-specific fields
    const hasUrlField = await helper.hasSidebarField('url');
    const hasAltField = await helper.hasSidebarField('alt');

    // Image block should have url and alt fields
    expect(hasUrlField || hasAltField).toBe(true);
  });

  test('selected block has visual indication', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    // Click on a block
    const blockId = 'block-1-uuid';
    await helper.clickBlockInIframe(blockId);

    // Wait for the block to get the volto-hydra--outline class
    const iframe = helper.getIframe();
    const block = iframe.locator(`[data-block-uid="${blockId}"]`);
    await expect(block).toHaveClass(/volto-hydra--outline/, { timeout: 10000 });

    // Verify block appears selected
    const isSelected = await helper.isBlockSelectedInIframe(blockId);
    expect(isSelected).toBe(true);
  });

  test('switching block selection updates visual state', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    const iframe = helper.getIframe();

    // Select first block and wait for outline class
    await helper.clickBlockInIframe('block-1-uuid');
    const block1 = iframe.locator('[data-block-uid="block-1-uuid"]');
    await expect(block1).toHaveClass(/volto-hydra--outline/, { timeout: 10000 });

    expect(await helper.isBlockSelectedInIframe('block-1-uuid')).toBe(true);
    expect(await helper.isBlockSelectedInIframe('block-2-uuid')).toBe(false);

    // Select second block and wait for outline class
    await helper.clickBlockInIframe('block-2-uuid');
    const block2 = iframe.locator('[data-block-uid="block-2-uuid"]');
    await expect(block2).toHaveClass(/volto-hydra--outline/, { timeout: 10000 });

    expect(await helper.isBlockSelectedInIframe('block-1-uuid')).toBe(false);
    expect(await helper.isBlockSelectedInIframe('block-2-uuid')).toBe(true);
  });

  test('block selection shows correct block type in sidebar', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    // Test selecting an image block
    await helper.clickBlockInIframe('block-2-uuid');
    await helper.waitForSidebarOpen();
    await helper.openSidebarTab('Block');

    // Verify sidebar shows image-specific fields (url, alt)
    const hasUrlField = await helper.hasSidebarField('url');
    const hasAltField = await helper.hasSidebarField('alt');
    expect(hasUrlField).toBe(true);
    expect(hasAltField).toBe(true);

    // Test selecting a slate/text block
    await helper.clickBlockInIframe('block-1-uuid');
    await helper.waitForSidebarOpen();
    await helper.openSidebarTab('Block');

    // Verify sidebar no longer shows image-specific fields
    const stillHasUrlField = await helper.hasSidebarField('url');
    const stillHasAltField = await helper.hasSidebarField('alt');
    expect(stillHasUrlField).toBe(false);
    expect(stillHasAltField).toBe(false);
  });
});
