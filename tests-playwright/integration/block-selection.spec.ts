/**
 * Integration tests for block selection in Volto Hydra admin UI.
 *
 * These tests verify that clicking blocks in the iframe opens the correct
 * sidebar settings and toolbars appear as expected.
 */
import { test, expect } from '../fixtures';
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

  test('switching block selection updates visual state', async ({ page }, testInfo) => {
    // Skip on Nuxt - test-page has custom blocks that affect bounding box comparison
    test.skip(testInfo.project.name === 'nuxt', 'Nuxt test-page has custom blocks');

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

  test('clicking block in ChildBlocksWidget selects it in iframe', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    // Click first block to open sidebar
    await helper.clickBlockInIframe('block-1-uuid');
    await helper.waitForSidebarOpen();

    // Click the parent arrow "‹ Text" to deselect - this navigates up to page level
    const parentArrow = page.locator('.sidebar-section-header .parent-nav');
    await expect(parentArrow).toBeVisible({ timeout: 5000 });
    await parentArrow.click();

    // Wait for ChildBlocksWidget to show page-level blocks with the Image item
    const childBlocksWidget = page.locator('#sidebar-order .child-blocks-widget');
    await expect(childBlocksWidget).toBeVisible({ timeout: 5000 });

    // Click the first Image block item (block-2-uuid)
    // Using hasText ensures the list is fully rendered before clicking
    // .first() needed because there are two Image blocks (regular and linked)
    const imageBlockItem = childBlocksWidget.locator('.child-block-item', { hasText: 'Image' }).first();
    await expect(imageBlockItem).toBeVisible({ timeout: 5000 });
    await imageBlockItem.click();

    // The sidebar should now show image block fields (alt text, alignment, etc.)
    // Wait for the alt text field to appear (indicates sidebar updated to image block)
    const altTextField = page.locator('.sidebar-container').getByRole('textbox', { name: 'Alt text' });
    await expect(altTextField).toBeVisible({ timeout: 5000 });

    // Wait for Quanta toolbar to appear and be positioned on the selected block
    await helper.waitForQuantaToolbar('block-2-uuid');
  });

  // IMPORTANT: This test verifies that a SINGLE click on a text block focuses the editor
  // at the correct cursor position. Do NOT change this to use enterEditMode or multiple
  // clicks - the purpose is to test that hydra.js correctly handles focus on the first click.
  test('clicking text block puts cursor focus at correct position', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    const iframe = helper.getIframe();

    // Wait for iframe content to be ready - look for the specific text we'll be clicking
    await expect(iframe.locator('text=Another paragraph for testing')).toBeVisible({ timeout: 15000 });

    // block-3-uuid contains "Another paragraph for testing"
    // Click in the middle of the text to position cursor there
    const blockId = 'block-3-uuid';
    const blockLocator = iframe.locator(`[data-block-uid="${blockId}"]`);

    // Find the editable field using helper that handles both Nuxt and mock patterns
    const editor = helper.getSlateField(blockLocator);
    await editor.waitFor({ state: 'visible', timeout: 10000 });

    // Wait for the text content to be rendered inside the editor
    await expect(editor).toContainText('Another paragraph', { timeout: 5000 });

    // Get the click coordinates for the middle of the text
    // "Another paragraph for testing" is 29 chars, so position 14 is roughly middle
    const clickPos = await helper.getClickPositionForCharacter(editor, 14);
    expect(clickPos).toBeTruthy();
    await editor.click({ position: clickPos! });

    // Wait for block to be selected
    await helper.waitForBlockSelected(blockId);

    // Wait for contenteditable to become true after click
    await expect(editor).toHaveAttribute('contenteditable', 'true', { timeout: 5000 });

    // Verify toolbar appeared
    const hasToolbar = await helper.isQuantaToolbarVisibleInIframe(blockId);
    expect(hasToolbar).toBe(true);

    // Verify cursor is in the middle of the text (not at start or end)
    // This also verifies the editor is focused (can't have cursor position without focus)
    const { textBefore, textAfter } = await helper.getTextAroundCursor(editor);
    expect(textBefore.length).toBeGreaterThan(0);
    expect(textAfter.length).toBeGreaterThan(0);

    // Verify we can type immediately - text should be inserted at cursor position
    await editor.pressSequentially('TYPED');

    // Verify the text was inserted at the cursor position (between textBefore and textAfter)
    const expectedText = textBefore + 'TYPED' + textAfter;
    await expect(iframe.locator(`[data-block-uid="${blockId}"]`)).toContainText(expectedText);
  });

  test('selecting new block scrolls sidebar to show settings', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    // Click first block to open sidebar
    await helper.clickBlockInIframe('block-1-uuid');
    await helper.waitForSidebarOpen();

    // Get the sidebar scroll container (.sidebar-content-wrapper in Sidebar.jsx)
    const sidebarScroller = page.locator('.sidebar-content-wrapper');
    await expect(sidebarScroller).toBeVisible();

    // Get the current block settings section (#sidebar-properties)
    const blockSettings = page.locator('#sidebar-properties');
    await expect(blockSettings).toBeVisible({ timeout: 5000 });

    // Wait for scroll animation to complete
    await page.waitForTimeout(500);

    // Verify the block settings are visible within the scroll viewport
    const settingsBox = await blockSettings.boundingBox();
    const scrollerBox = await sidebarScroller.boundingBox();

    expect(settingsBox).toBeTruthy();
    expect(scrollerBox).toBeTruthy();

    // The settings should be at least partially visible in the sidebar viewport
    const settingsTop = settingsBox!.y;
    const settingsBottom = settingsBox!.y + settingsBox!.height;
    const scrollerTop = scrollerBox!.y;
    const scrollerBottom = scrollerBox!.y + scrollerBox!.height;

    // Check that settings are within visible area (at least partially)
    const isVisible = settingsTop < scrollerBottom && settingsBottom > scrollerTop;
    expect(isVisible, 'Current block settings should be visible in sidebar scroll area').toBe(true);
  });

  test('reselecting same block does not scroll sidebar', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    // Click first block to open sidebar
    await helper.clickBlockInIframe('block-1-uuid');
    await helper.waitForSidebarOpen();

    // Get the sidebar scroll container (.sidebar-content-wrapper in Sidebar.jsx)
    const sidebarScroller = page.locator('.sidebar-content-wrapper');
    await expect(sidebarScroller).toBeVisible();

    // Wait for any initial scroll to complete
    await page.waitForTimeout(500);

    // Check if content is scrollable (content height > container height)
    const canScroll = await sidebarScroller.evaluate((el) => {
      return el.scrollHeight > el.clientHeight;
    });

    // Skip scroll test if content isn't tall enough to scroll
    if (!canScroll) {
      // If we can't scroll, just verify re-clicking doesn't cause errors
      await helper.clickBlockInIframe('block-1-uuid');
      await page.waitForTimeout(300);
      // Test passes - no scroll to verify
      return;
    }

    // Scroll the sidebar to a specific position (simulating user scroll)
    await sidebarScroller.evaluate((el) => {
      // Scroll to 50px or max scrollable, whichever is smaller
      el.scrollTop = Math.min(50, el.scrollHeight - el.clientHeight);
    });
    await page.waitForTimeout(100);

    // Get the scroll position (may be less than 50 if content is short)
    const scrollBefore = await sidebarScroller.evaluate((el) => el.scrollTop);
    expect(scrollBefore).toBeGreaterThan(0);

    // Re-click the same block
    await helper.clickBlockInIframe('block-1-uuid');
    await page.waitForTimeout(300);

    // Verify scroll position is maintained (not reset)
    const scrollAfter = await sidebarScroller.evaluate((el) => el.scrollTop);
    expect(scrollAfter).toBe(scrollBefore);
  });

  test('selecting block shows sidebar settings from top, not scrolled down', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    // Select listing block which has multiple settings (itemType, headline, querystring, fieldMapping)
    await helper.clickBlockInIframe('block-9-listing');
    await helper.waitForSidebarOpen();
    await helper.openSidebarTab('Block');

    // Get the sidebar scroll container and block settings
    const sidebarScroller = page.locator('.sidebar-content-wrapper');
    const blockSettings = page.locator('#sidebar-properties');
    await expect(sidebarScroller).toBeVisible();
    await expect(blockSettings).toBeVisible({ timeout: 5000 });

    // Wait for any scroll animation to complete
    await page.waitForTimeout(500);

    // Verify the TOP of block settings is visible (not scrolled past)
    // Get bounding boxes to compare positions
    const scrollerBox = await sidebarScroller.boundingBox();
    const settingsBox = await blockSettings.boundingBox();

    expect(scrollerBox).toBeTruthy();
    expect(settingsBox).toBeTruthy();

    // The top of settings should be at or below the top of the scroller viewport
    // (i.e., not scrolled so far that the top of settings is above the viewport)
    const settingsTopIsVisible = settingsBox!.y >= scrollerBox!.y - 20; // Allow 20px tolerance
    expect(
      settingsTopIsVisible,
      `Top of block settings should be visible. Settings top: ${settingsBox!.y}, Scroller top: ${scrollerBox!.y}`,
    ).toBe(true);

    // Also verify the first field is visible (itemType for listing block)
    const firstField = page.locator('#sidebar-properties .field-wrapper-itemType');
    await expect(firstField).toBeVisible({ timeout: 5000 });
  });

  test('sidebar block header menu has same items as toolbar menu except settings', async ({
    page,
  }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    // Click a block to open sidebar
    await helper.clickBlockInIframe('block-1-uuid');
    await helper.waitForSidebarOpen();

    // Open the Quanta toolbar menu (outside iframe, in Admin UI)
    await helper.openQuantaToolbarMenu('block-1-uuid');
    const toolbarItemTexts = (await helper.getQuantaToolbarMenuOptions('block-1-uuid')).map(t => t.toLowerCase());

    // Close toolbar menu by clicking elsewhere
    await page.locator('body').click({ position: { x: 10, y: 10 } });
    await page.waitForTimeout(200);

    // Open the sidebar block header menu
    const sidebarMenuButton = page.locator(
      '.sidebar-section-header .block-actions-menu button, .sidebar-section-header [aria-label="More options"], .sidebar-section-header .menu-trigger',
    );
    await expect(sidebarMenuButton).toBeVisible({ timeout: 5000 });
    await sidebarMenuButton.click();
    await page.waitForTimeout(200);

    // Get sidebar menu items (same dropdown class as toolbar)
    const sidebarMenuItems = page.locator('.volto-hydra-dropdown-item');
    const sidebarItemTexts: string[] = [];
    const sidebarCount = await sidebarMenuItems.count();
    for (let i = 0; i < sidebarCount; i++) {
      const text = await sidebarMenuItems.nth(i).textContent();
      if (text) {
        // Remove emoji prefix (e.g., "🗑️ Remove" -> "Remove")
        const cleanText = text.replace(/^[^\w]*/, '').trim().toLowerCase();
        if (cleanText) sidebarItemTexts.push(cleanText);
      }
    }

    // Filter out "settings" from toolbar items for comparison
    const toolbarItemsWithoutSettings = toolbarItemTexts.filter(
      (item) => !item.includes('setting'),
    );

    // Sidebar should have same items as toolbar (minus settings)
    expect(sidebarItemTexts.sort()).toEqual(toolbarItemsWithoutSettings.sort());
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

  test('scrolling selected block off screen does not scroll back', async ({ page }, testInfo) => {
    // Skip on Nuxt - uses container-test-page which has container blocks not yet supported
    test.skip(testInfo.project.name === 'nuxt', 'Uses container-test-page');

    // Bug: After selecting a block, if user scrolls the iframe so the block
    // goes off screen, the page automatically scrolls back to the block.
    // This is disruptive to user workflow.

    // Use a small viewport so content is much taller than iframe - matches real user scenario
    await page.setViewportSize({ width: 1280, height: 400 });

    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/container-test-page');

    const iframe = helper.getIframe();

    // Select the title block (first block at very top)
    await helper.clickBlockInIframe('title-block');
    await helper.waitForQuantaToolbar('title-block');

    // Get initial scroll position (should be 0 or near top)
    const iframeBody = iframe.locator('body');
    const scrollBefore = await iframeBody.evaluate(() => window.scrollY);

    // Use End key to scroll to bottom (like user reported)
    await page.keyboard.press('End');
    await page.waitForTimeout(200);

    // Check scroll position right after pressing End
    const scrollAfterEnd = await iframeBody.evaluate(() => window.scrollY);
    expect(scrollAfterEnd).toBeGreaterThan(scrollBefore);

    // Wait to see if it jumps back (the bug was scroll-back after ~1s)
    await page.waitForTimeout(1000);

    // Check if scroll position was maintained
    const scrollFinal = await iframeBody.evaluate(() => window.scrollY);

    // The scroll should stay where End key put it, not jump back to the selected block
    expect(scrollFinal).toBeGreaterThanOrEqual(scrollAfterEnd - 50);

    // Now scroll back to the top - the toolbar should reappear on the selected block
    await page.keyboard.press('Home');
    await page.waitForTimeout(500);

    // Verify the toolbar is visible again for the selected block
    const hasToolbar = await helper.isQuantaToolbarVisibleInIframe('title-block');
    expect(hasToolbar).toBe(true);
  });
});
