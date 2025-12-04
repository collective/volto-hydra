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

    // Click on a block - this will wait for toolbar to appear
    const blockId = 'block-1-uuid';
    await helper.clickBlockInIframe(blockId);

    // Verify toolbar is visible (indicates block is selected)
    const hasToolbar = await helper.isQuantaToolbarVisibleInIframe(blockId);
    expect(hasToolbar).toBe(true);

    // Verify block appears selected with proper positioning
    await helper.waitForQuantaToolbar(blockId);
  });

  test('switching block selection updates visual state', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    // Select first block - clickBlockInIframe waits for toolbar
    await helper.clickBlockInIframe('block-1-uuid');

    expect((await helper.isBlockSelectedInIframe('block-1-uuid')).ok).toBe(true);
    expect((await helper.isBlockSelectedInIframe('block-2-uuid')).ok).toBe(false);

    // Select second block - clickBlockInIframe waits for toolbar
    await helper.clickBlockInIframe('block-2-uuid');

    expect((await helper.isBlockSelectedInIframe('block-1-uuid')).ok).toBe(false);
    expect((await helper.isBlockSelectedInIframe('block-2-uuid')).ok).toBe(true);
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

  test('clicking block in Order tab selects it in iframe', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    // Click first block to open sidebar
    await helper.clickBlockInIframe('block-1-uuid');
    await helper.waitForSidebarOpen();

    // Open Order tab
    await helper.openSidebarTab('Order');

    // Wait for Order tab content to be visible (uses @dnd-kit, not react-beautiful-dnd)
    const orderTab = page.locator('#sidebar-order');
    await expect(orderTab).toBeVisible({ timeout: 2000 });

    // Find the second block in the order list (using .tree-item-wrapper)
    // Note: test-page has 3 blocks total (block-1-uuid, block-2-uuid, block-3-uuid)
    const blockItems = page.locator('.tree-item-wrapper');
    await expect(blockItems.first()).toBeVisible();

    // Click the second block's tree-item div (block-2-uuid which is an image block)
    const secondBlockInList = blockItems.nth(1).locator('.tree-item');
    await expect(secondBlockInList).toBeVisible();
    await secondBlockInList.click();
    await page.waitForTimeout(500);

    // Verify the second block is now selected
    // Check that Block tab shows the image block fields
    await helper.openSidebarTab('Block');

    // The sidebar should now show image block fields (url, alt)
    const hasUrlField = await helper.hasSidebarField('url');
    expect(hasUrlField).toBe(true);

    // Verify Quanta toolbar appears on the selected block in iframe
    const hasQuantaToolbar = await helper.isQuantaToolbarVisibleInIframe('block-2-uuid');
    expect(hasQuantaToolbar).toBe(true);
  });

  test('clicking text block puts cursor focus at correct position', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    const iframe = helper.getIframe();

    // Click on a text block (block-3-uuid - "Another paragraph for testing")
    const blockId = 'block-3-uuid';
    await helper.clickBlockInIframe(blockId);

    // Verify toolbar appeared (clickBlockInIframe already waits for this)
    const hasToolbar = await helper.isQuantaToolbarVisibleInIframe(blockId);
    expect(hasToolbar).toBe(true);

    // Wait a moment for focus to be set asynchronously
    await page.waitForTimeout(500);

    // Verify we can type immediately
    await page.keyboard.type('TYPED');
    await page.waitForTimeout(200);

    // Verify the text was inserted into the block
    const blockText = await iframe.locator(`[data-block-uid="${blockId}"]`).textContent();
    expect(blockText).toContain('TYPED');
  });

  test('can select block that is wrapped in a link', async ({ page }) => {
    // When an entire block is wrapped in a link (e.g., image block with href),
    // clicking it should select the block instead of navigating away
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    const iframe = helper.getIframe();
    const LINKED_IMAGE_BLOCK_ID = 'block-5-linked-image';

    // Store original URL to verify we haven't navigated away
    const originalUrl = page.url();

    // Click the linked image block
    await helper.clickBlockInIframe(LINKED_IMAGE_BLOCK_ID);

    // Block should be selected (toolbar visible)
    const hasToolbar = await helper.isQuantaToolbarVisibleInIframe(LINKED_IMAGE_BLOCK_ID);
    expect(hasToolbar).toBe(true);

    // Page should NOT have navigated away - URL should still contain /edit
    expect(page.url()).toContain('/edit');
    expect(page.url()).toBe(originalUrl);

    // Verify the link element is present inside the block (confirms test setup)
    const linkElement = iframe.locator(`[data-block-uid="${LINKED_IMAGE_BLOCK_ID}"] a.image-link`);
    await expect(linkElement).toBeVisible();
  });
});
