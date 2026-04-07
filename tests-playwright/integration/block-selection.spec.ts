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
    test.skip(testInfo.project.name.includes('nuxt'), 'Nuxt test-page has custom blocks');

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
    await helper.waitForSidebarCurrentBlock('Image');

    // Verify sidebar shows image-specific fields (alt, size)
    await expect(page.locator('#sidebar-properties .field-wrapper-alt')).toBeVisible();
    await expect(page.locator('#sidebar-properties .field-wrapper-size')).toBeVisible();

    // Test selecting a slate/text block
    await helper.clickBlockInIframe('block-1-uuid');
    await helper.waitForSidebarCurrentBlock('Text');

    // Verify sidebar no longer shows image-specific fields
    await expect(page.locator('#sidebar-properties .field-wrapper-alt')).not.toBeVisible();
    await expect(page.locator('#sidebar-properties .field-wrapper-size')).not.toBeVisible();
  });

  test('clicking block in ChildBlocksWidget selects it in iframe', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    // Click first block to open sidebar
    await helper.clickBlockInIframe('block-1-uuid');
    await helper.waitForSidebarOpen();

    // Click the back arrow to deselect - this navigates up to page level
    const backArrow = page.locator('.sidebar-section-header .nav-back');
    await expect(backArrow).toBeVisible({ timeout: 5000 });
    await backArrow.click();

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

    // Select listing block which has multiple settings (variation, headline, querystring, fieldMapping)
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

    // Also verify the first field is visible (variation for listing block)
    const firstField = page.locator('#sidebar-properties .field-wrapper-variation');
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
    test.skip(testInfo.project.name.includes('nuxt'), 'Uses container-test-page');

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

    // Scroll iframe to bottom programmatically (simulates user scrolling)
    await iframeBody.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(200);

    // Check scroll position right after scrolling
    const scrollAfterEnd = await iframeBody.evaluate(() => window.scrollY);
    expect(scrollAfterEnd).toBeGreaterThan(scrollBefore);

    // Wait to see if it jumps back (the bug was scroll-back after ~1s)
    await page.waitForTimeout(1000);

    // Check if scroll position was maintained
    const scrollFinal = await iframeBody.evaluate(() => window.scrollY);

    // The scroll should stay where End key put it, not jump back to the selected block
    expect(scrollFinal).toBeGreaterThanOrEqual(scrollAfterEnd - 50);

    // Now scroll back to the top - the toolbar should reappear on the selected block
    await iframeBody.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(500);

    // Verify the toolbar is visible again for the selected block
    const hasToolbar = await helper.isQuantaToolbarVisibleInIframe('title-block');
    expect(hasToolbar).toBe(true);
  });
});

test.describe('Block Mode (Escape state machine)', () => {
  test('First Escape from text editing enters block mode (not parent)', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/test-page');

    const iframe = helper.getIframe();

    // Click a Slate text block — enters text editing mode (contenteditable)
    await helper.clickBlockInIframe('block-1-uuid');
    await helper.waitForBlockSelected('block-1-uuid');

    // Verify we're in text editing mode: field should be contenteditable
    const editFieldEditable = await helper.getEditorLocator('block-1-uuid', 'value');
    await expect(editFieldEditable).toBeVisible({ timeout: 5000 });

    // Text mode: subtle outline on block + field underline
    const outline = page.locator('.volto-hydra-block-outline');
    await expect(outline).toHaveAttribute('data-outline-style', 'subtle', { timeout: 3000 });
    await expect(page.locator('.volto-hydra-field-underline')).toBeVisible({ timeout: 3000 });

    // First Escape: should enter block mode (block still selected, but NOT editing)
    await page.keyboard.press('Escape');

    // Block mode: full border, no field underline
    await expect(outline).toBeVisible({ timeout: 3000 });
    await expect(outline).toHaveAttribute('data-outline-style', 'border', { timeout: 3000 });
    await expect(page.locator('.volto-hydra-field-underline')).not.toBeVisible({ timeout: 3000 });

    // The field should no longer be contenteditable="true"
    const editField = await helper.getEditorLocator('block-1-uuid', 'value');
    await expect(editField).not.toHaveAttribute('contenteditable', 'true', { timeout: 3000 });

    // Second Escape: should deselect (top-level block, no parent)
    await page.keyboard.press('Escape');

    // Block should now be deselected — no outline, no quanta toolbar
    await expect(page.locator('.volto-hydra-block-outline')).not.toBeVisible({ timeout: 3000 });
  });

  test('Escape from container block to page level hides outline', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/container-test-page');

    const iframe = helper.getIframe();

    // Click a container block (columns-1 has a title field)
    await helper.clickContainerBlockInIframe('columns-1');
    await helper.waitForBlockSelected('columns-1');

    // Verify outline is visible
    await expect(page.locator('.volto-hydra-block-outline')).toBeVisible({ timeout: 5000 });

    // Escape to parent — columns-1 is top-level, so should deselect
    await helper.escapeToParent();

    // Outline should be gone
    await expect(page.locator('.volto-hydra-block-outline')).not.toBeVisible({ timeout: 5000 });
  });

  test('Enter or click in block mode re-enters text editing', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/test-page');

    const iframe = helper.getIframe();

    // Click a Slate text block — enters text editing mode
    await helper.clickBlockInIframe('block-1-uuid');
    await helper.waitForBlockSelected('block-1-uuid');

    // First Escape: enter block mode
    await helper.escapeFromEditing();

    // Verify block mode: editor field should not be contenteditable
    const editor = await helper.getEditorLocator('block-1-uuid', 'value');
    await expect(editor).not.toHaveAttribute('contenteditable', 'true', { timeout: 3000 });

    // Click the text area again — should re-enter text editing mode
    await editor.click();

    // Field should become contenteditable again
    await expect(editor).toHaveAttribute('contenteditable', 'true', { timeout: 5000 });
  });

  test('Arrow Down in block mode moves to next block', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/test-page');

    // Click block-1, enter block mode
    await helper.clickBlockInIframe('block-1-uuid');
    await helper.waitForBlockSelected('block-1-uuid');
    await helper.escapeFromEditing();

    // Arrow Down twice to reach block-3 (Slate text block) — must stay in block mode
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await helper.waitForBlockSelected('block-3-uuid');

    // Should still be in block mode (full border, not subtle/text mode)
    await expect(page.locator('.volto-hydra-block-outline[data-outline-style="border"]'))
      .toBeVisible({ timeout: 3000 });
  });

  test('Arrow through non-editable block stays in text mode', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/test-page');

    // block-1 (slate text), block-2 (image, no fields), block-3 (slate text)
    // Click block-1, cursor at end
    await helper.clickBlockInIframe('block-1-uuid');
    await helper.waitForBlockSelected('block-1-uuid');

    // Verify text mode (subtle border)
    await expect(page.locator('.volto-hydra-block-outline[data-outline-style="subtle"]'))
      .toBeVisible({ timeout: 3000 });

    // ArrowDown at end → lands on block-2 (image, no editable fields)
    // Should show block mode border for this block but editMode stays 'text'
    await page.keyboard.press('End');
    await page.keyboard.press('ArrowDown');
    await helper.waitForBlockSelected('block-2-uuid');

    // ArrowDown again → lands on block-3 (slate text)
    // Should re-enter text mode (subtle border) because editMode is 'text'
    await page.keyboard.press('ArrowDown');
    await helper.waitForBlockSelected('block-3-uuid');

    // Should be in text mode with cursor at start
    await expect(page.locator('.volto-hydra-block-outline[data-outline-style="subtle"]'))
      .toBeVisible({ timeout: 3000 });
  });

  test('Arrow Down navigates between nested blocks inside a container', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/container-test-page');

    // Click text-1a (inside col-1 of columns-1), enter block mode
    await helper.clickBlockInIframe('text-1a');
    await helper.waitForBlockSelected('text-1a');
    await helper.escapeFromEditing();

    // Arrow Down should move to text-1b (sibling inside same column)
    await page.keyboard.press('ArrowDown');
    await helper.waitForBlockSelected('text-1b');

    // Should still be in block mode
    await expect(page.locator('.volto-hydra-block-outline[data-outline-style="border"]'))
      .toBeVisible({ timeout: 3000 });
  });

  test('Cmd+A in text mode selects all text, second enters block mode, third selects all siblings', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/container-test-page');

    const iframe = helper.getIframe();

    // Click text-1a inside col-1 — enters text mode
    await helper.clickBlockInIframe('text-1a');
    await helper.waitForBlockSelected('text-1a');

    // Verify text mode (subtle border)
    await expect(page.locator('.volto-hydra-block-outline[data-outline-style="subtle"]'))
      .toBeVisible({ timeout: 3000 });

    // First Cmd+A: selects all text in field (browser native)
    await page.keyboard.press('ControlOrMeta+a');

    // Should still be in text mode with text selected
    const hasTextSelection = await iframe.locator('body').evaluate(() => {
      const sel = window.getSelection();
      return sel ? sel.toString().length > 0 : false;
    });
    expect(hasTextSelection).toBe(true);
    await expect(page.locator('.volto-hydra-block-outline[data-outline-style="subtle"]'))
      .toBeVisible({ timeout: 2000 });

    // Second Cmd+A: enters block mode (selects block, not text)
    await page.keyboard.press('ControlOrMeta+a');
    await expect(page.locator('.volto-hydra-block-outline[data-outline-style="border"]'))
      .toBeVisible({ timeout: 3000 });

    // Third Cmd+A: selects all sibling blocks (multi-selection)
    await page.keyboard.press('ControlOrMeta+a');

    // Should have multi-selection outline covering both text-1a and text-1b
    await expect(async () => {
      const outline = page.locator('.volto-hydra-block-outline');
      const box = await outline.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.height).toBeGreaterThan(50);
    }).toPass({ timeout: 5000 });
  });

  test('Cmd+A in block mode selects all sibling blocks', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/container-test-page');

    // Click text-1a, enter block mode
    await helper.clickBlockInIframe('text-1a');
    await helper.waitForBlockSelected('text-1a');
    await helper.escapeFromEditing();

    // Verify block mode
    await expect(page.locator('.volto-hydra-block-outline[data-outline-style="border"]'))
      .toBeVisible({ timeout: 3000 });

    // Cmd+A should select all siblings (text-1a + text-1b)
    await page.keyboard.press('ControlOrMeta+a');

    await expect(async () => {
      const outline = page.locator('.volto-hydra-block-outline');
      const box = await outline.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.height).toBeGreaterThan(50);
    }).toPass({ timeout: 5000 });
  });

  test('Cmd+A on non-editable block selects all sibling blocks', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/test-page');

    // Click image block (non-editable — no contenteditable fields)
    await helper.clickBlockInIframe('block-2-uuid');
    await helper.waitForBlockSelected('block-2-uuid');

    // Already in block mode (image has no editable fields)
    await expect(page.locator('.volto-hydra-block-outline[data-outline-style="border"]'))
      .toBeVisible({ timeout: 3000 });

    // Cmd+A should select all page-level siblings
    await page.keyboard.press('ControlOrMeta+a');

    await expect(async () => {
      const outline = page.locator('.volto-hydra-block-outline');
      const box = await outline.boundingBox();
      expect(box).not.toBeNull();
      // Should cover many blocks — much taller than single image
      expect(box!.height).toBeGreaterThan(200);
    }).toPass({ timeout: 5000 });
  });

  test('Shift+Arrow extend and shrink shows correct outline at each step', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/container-test-page');

    const iframe = helper.getIframe();
    const outline = page.locator('.volto-hydra-block-outline');

    // Click text-1a inside col-1, enter block mode
    await helper.clickBlockInIframe('text-1a');
    await helper.waitForBlockSelected('text-1a');
    await helper.escapeFromEditing();

    // Step 1: Single block — full border around text-1a only
    await expect(outline).toHaveAttribute('data-outline-style', 'border', { timeout: 3000 });
    const singleBox = await outline.boundingBox();
    expect(singleBox).not.toBeNull();

    // Step 2: Shift+ArrowDown — multi-select text-1a + text-1b
    await page.keyboard.press('Shift+ArrowDown');
    await expect(async () => {
      const box = await outline.boundingBox();
      expect(box).not.toBeNull();
      // Combined box must be taller than single block
      expect(box!.height).toBeGreaterThan(singleBox!.height + 10);
    }).toPass({ timeout: 5000 });

    // Step 3: Shift+ArrowUp — shrink back to single block (text-1a)
    await page.keyboard.press('Shift+ArrowUp');

    // Should be exactly one outline with block mode border, NOT multi-select
    await expect(outline).toHaveCount(1, { timeout: 3000 });
    await expect(outline).toHaveAttribute('data-outline-style', 'border', { timeout: 3000 });

    // Outline should be back to single-block size (not the combined box)
    await expect(async () => {
      const box = await outline.boundingBox();
      expect(box).not.toBeNull();
      // Should be approximately the same height as the original single block
      expect(Math.abs(box!.height - singleBox!.height)).toBeLessThan(20);
    }).toPass({ timeout: 5000 });

    // No browser text selection should remain
    const hasTextSelection = await iframe.locator('body').evaluate(() => {
      const sel = window.getSelection();
      return sel ? sel.toString().length > 0 : false;
    });
    expect(hasTextSelection).toBe(false);
  });

  test('Shift+Arrow Down in block mode extends multi-selection', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/test-page');

    // Click block-1, enter block mode
    await helper.clickBlockInIframe('block-1-uuid');
    await helper.waitForBlockSelected('block-1-uuid');
    await helper.escapeFromEditing();

    // Shift+ArrowDown should extend selection to include block-2
    await page.keyboard.press('Shift+ArrowDown');

    // Multi-selection outline should cover both blocks (larger than single block)
    await expect(async () => {
      const outline = page.locator('.volto-hydra-block-outline');
      const box = await outline.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.height).toBeGreaterThan(100);
    }).toPass({ timeout: 5000 });
  });
});

test.describe('Multi-Block Selection', () => {
  test('Shift+Click on same block in block mode enters text mode', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/container-test-page');

    const iframe = helper.getIframe();

    // Click text-1a, enter block mode
    await helper.clickBlockInIframe('text-1a');
    await helper.waitForBlockSelected('text-1a');
    await helper.escapeFromEditing();

    // Verify block mode
    await expect(page.locator('.volto-hydra-block-outline[data-outline-style="border"]'))
      .toBeVisible({ timeout: 3000 });

    // Shift+Click on the SAME block (text-1a)
    const textField1a = await helper.getEditorLocator('text-1a', 'value');
    await textField1a.click({ modifiers: ['Shift'] });

    // Should enter text mode: subtle border + field underline + toolbar
    await expect(page.locator('.volto-hydra-block-outline[data-outline-style="subtle"]'))
      .toBeVisible({ timeout: 3000 });
    await expect(page.locator('.volto-hydra-field-underline')).toBeVisible({ timeout: 3000 });
    await helper.waitForQuantaToolbar('text-1a');
  });

  test('Shift+Click on text block from block mode multi-selects (not text mode)', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/test-page');

    const iframe = helper.getIframe();

    // Click block-1 (Slate text) and enter block mode
    await helper.clickBlockInIframe('block-1-uuid');
    await helper.waitForBlockSelected('block-1-uuid');
    await helper.escapeFromEditing();

    // Verify we're in block mode (full border, not subtle)
    await expect(page.locator('.volto-hydra-block-outline[data-outline-style="border"]'))
      .toBeVisible({ timeout: 3000 });

    // Shift+Click directly on the TEXT inside block-3 (another Slate block)
    // This must trigger multi-select, NOT enter text editing on block-3
    const textField3 = await helper.getEditorLocator('block-3-uuid', 'value');
    await textField3.click({ modifiers: ['Shift'] });

    // Should have multi-selection outline (combined bounding box, taller than single)
    await expect(async () => {
      const outline = page.locator('.volto-hydra-block-outline');
      const box = await outline.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.height).toBeGreaterThan(100);
    }).toPass({ timeout: 5000 });

    // Should NOT be in text mode — field should not be contenteditable
    await expect(textField3).not.toHaveAttribute('contenteditable', 'true', { timeout: 2000 });
  });

  test('Shift+Click selects range of blocks', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/test-page');

    const iframe = helper.getIframe();

    // Click first block and enter block mode (Shift+Click only works in block mode)
    await helper.clickBlockInIframe('block-1-uuid');
    await helper.waitForBlockSelected('block-1-uuid');
    await helper.escapeFromEditing();

    // Get single block outline height for comparison
    const singleOutline = page.locator('.volto-hydra-block-outline');
    await expect(singleOutline).toBeVisible({ timeout: 5000 });
    const singleBox = await singleOutline.boundingBox();

    // Enable debug to trace click handler
    await iframe.locator('body').evaluate(() => { (window as any).HYDRA_DEBUG = true; });

    // Shift+Click third block — should select range block-1 through block-3
    await iframe.locator('[data-block-uid="block-3-uuid"]').click({ modifiers: ['Shift'] });

    // Outline should grow to cover all three blocks (combined bounding box)
    await expect(async () => {
      const outline = page.locator('.volto-hydra-block-outline');
      const box = await outline.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.height).toBeGreaterThan(singleBox!.height * 2);
    }).toPass({ timeout: 5000 });

    // Debug: check toolbar DOM state
    const toolbarInfo = await page.evaluate(() => {
      const t = document.querySelector('.quanta-toolbar');
      return t ? { html: t.outerHTML.substring(0, 300), multiSelect: t.getAttribute('data-multi-select') } : 'NO TOOLBAR';
    });
    console.log('Toolbar state:', JSON.stringify(toolbarInfo));

    // Multi-select toolbar should show block count (not format buttons)
    const toolbar = page.locator('.quanta-toolbar[data-multi-select="true"]');
    await expect(toolbar).toBeVisible({ timeout: 3000 });
  });

  test('Ctrl+Click toggles block in/out of selection', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/test-page');

    const iframe = helper.getIframe();

    // Click first block
    await helper.clickBlockInIframe('block-1-uuid');
    await helper.waitForBlockSelected('block-1-uuid');

    // Ctrl/Meta+Click third block — outline should expand to cover both
    const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';
    await iframe.locator('[data-block-uid="block-3-uuid"]').click({ modifiers: [modifier] });

    await expect(async () => {
      const outline = page.locator('.volto-hydra-block-outline');
      const box = await outline.boundingBox();
      expect(box).not.toBeNull();
      // Combined box should span from block-1 top to block-3 bottom
      expect(box!.height).toBeGreaterThan(100);
    }).toPass({ timeout: 5000 });
  });

  test('Click clears multi-selection back to single', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/test-page');

    const iframe = helper.getIframe();

    // Create multi-selection via Shift+Click (need block mode first)
    await helper.clickBlockInIframe('block-1-uuid');
    await helper.waitForBlockSelected('block-1-uuid');
    await helper.escapeFromEditing();
    await iframe.locator('[data-block-uid="block-3-uuid"]').click({ modifiers: ['Shift'] });

    // Verify outline is multi-block sized
    await expect(async () => {
      const box = await page.locator('.volto-hydra-block-outline').boundingBox();
      expect(box!.height).toBeGreaterThan(100);
    }).toPass({ timeout: 5000 });

    // Plain click on block-2 — should clear multi-selection
    await helper.clickBlockInIframe('block-2-uuid');
    await helper.waitForBlockSelected('block-2-uuid');

    // Should be back to single outline (multi-select outline removed)
    await expect(page.locator('.volto-hydra-block-outline')).toHaveCount(1, { timeout: 5000 });

    // Quanta toolbar should be back (single-select mode)
    await helper.waitForQuantaToolbar('block-2-uuid');
  });

  test('Delete key removes all multi-selected blocks', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/test-page');

    const iframe = helper.getIframe();

    // Verify block-1 and block-3 exist
    await expect(iframe.locator('[data-block-uid="block-1-uuid"]')).toBeVisible();
    await expect(iframe.locator('[data-block-uid="block-3-uuid"]')).toBeVisible();

    // Select block-1, enter block mode, Shift+ArrowDown twice to select block-1 + block-2 + block-3
    await helper.clickBlockInIframe('block-1-uuid');
    await helper.waitForBlockSelected('block-1-uuid');
    await helper.escapeFromEditing();
    await page.keyboard.press('Shift+ArrowDown');
    await page.keyboard.press('Shift+ArrowDown');

    // Verify multi-selection outline is visible
    await expect(async () => {
      const outline = page.locator('.volto-hydra-block-outline');
      const box = await outline.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.height).toBeGreaterThan(100);
    }).toPass({ timeout: 5000 });

    // Press Delete — should remove all three selected blocks
    await page.keyboard.press('Delete');

    // block-1, block-2 (image), block-3 should all be gone from iframe
    await expect(iframe.locator('[data-block-uid="block-1-uuid"]')).not.toBeVisible({ timeout: 5000 });
    await expect(iframe.locator('[data-block-uid="block-2-uuid"]')).not.toBeVisible({ timeout: 5000 });
    await expect(iframe.locator('[data-block-uid="block-3-uuid"]')).not.toBeVisible({ timeout: 5000 });

    // Multi-selection outline should be gone
    await expect(page.locator('.volto-hydra-block-outline')).not.toBeVisible({ timeout: 3000 });
  });

  test('Cmd+C in block mode copies block to clipboard', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/test-page');

    // Click block-1, enter block mode
    await helper.clickBlockInIframe('block-1-uuid');
    await helper.waitForBlockSelected('block-1-uuid');
    await helper.escapeFromEditing();

    // Cmd+C in block mode should send COPY_BLOCKS to admin
    await page.keyboard.press('ControlOrMeta+c');

    // Verify the blocksClipboard Redux state was set
    // BlocksToolbar renders a paste button when clipboard has content
    // We can check by looking for the paste button in the toolbar
    const pasteButton = page.locator('#toolbar-paste-blocks');
    await expect(pasteButton).toBeVisible({ timeout: 3000 });
  });

  test('Multi-select shows left toolbar buttons (copy/cut/delete)', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/test-page');

    // Click block-1, enter block mode, Shift+ArrowDown to multi-select
    await helper.clickBlockInIframe('block-1-uuid');
    await helper.waitForBlockSelected('block-1-uuid');
    await helper.escapeFromEditing();
    await page.keyboard.press('Shift+ArrowDown');

    // Left toolbar should show copy, cut, and delete buttons
    await expect(page.locator('#toolbar-copy-blocks')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('#toolbar-cut-blocks')).toBeVisible({ timeout: 3000 });
    await expect(page.locator('#toolbar-delete-blocks')).toBeVisible({ timeout: 3000 });
  });

  test('Multi-select shows right sidebar summary', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/test-page');

    // Click block-1, enter block mode, Shift+ArrowDown to multi-select 2 blocks
    await helper.clickBlockInIframe('block-1-uuid');
    await helper.waitForBlockSelected('block-1-uuid');
    await helper.escapeFromEditing();
    await page.keyboard.press('Shift+ArrowDown');

    // Right sidebar should show multi-select summary
    const summary = page.locator('[data-testid="multi-select-summary"]');
    await expect(summary).toBeVisible({ timeout: 5000 });
    await expect(summary).toContainText('2 blocks selected');
  });

  test('Copy block and paste after another block', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/test-page');
    const iframe = helper.getIframe();

    const initialOrder = await helper.getBlockOrder();
    const initialCount = initialOrder.length;

    // Select block-1, enter block mode, copy
    await helper.clickBlockInIframe('block-1-uuid');
    await helper.waitForBlockSelected('block-1-uuid');
    await helper.escapeFromEditing();
    await page.keyboard.press('ControlOrMeta+c');

    // Paste button should appear in left toolbar
    const pasteButton = page.locator('#toolbar-paste-blocks');
    await expect(pasteButton).toBeVisible({ timeout: 3000 });

    // Click block-3 to select as paste target
    await helper.clickBlockInIframe('block-3-uuid');
    await helper.waitForBlockSelected('block-3-uuid');
    await expect(pasteButton).toBeVisible({ timeout: 3000 });

    // Click paste — block should be inserted after block-3
    await pasteButton.click();

    // Verify: one more block, and it appears after block-3
    await expect(async () => {
      const newOrder = await helper.getBlockOrder();
      expect(newOrder.length).toBe(initialCount + 1);
      const block3Idx = newOrder.indexOf('block-3-uuid');
      // New block is right after block-3
      expect(block3Idx).toBeGreaterThanOrEqual(0);
      expect(block3Idx + 1).toBeLessThan(newOrder.length);
      // The new block should NOT be any of the original blocks
      expect(initialOrder).not.toContain(newOrder[block3Idx + 1]);
    }).toPass({ timeout: 5000 });
  });

  test('Multi-select copy and paste inserts all blocks', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/test-page');
    const iframe = helper.getIframe();

    const initialOrder = await helper.getBlockOrder();
    const initialCount = initialOrder.length;

    // Select block-1 in block mode, Shift+Arrow to also select block-2
    await helper.clickBlockInIframe('block-1-uuid');
    await helper.waitForBlockSelected('block-1-uuid');
    await helper.escapeFromEditing();
    await page.keyboard.press('Shift+ArrowDown');

    // Left toolbar should show copy button for multi-selection
    const copyButton = page.locator('#toolbar-copy-blocks');
    await expect(copyButton).toBeVisible({ timeout: 5000 });

    // Copy via left toolbar button
    await copyButton.click();

    // Click block-3 to set paste target
    await helper.clickBlockInIframe('block-3-uuid');
    await helper.waitForBlockSelected('block-3-uuid');

    // Paste button should show with count of 2
    const pasteButton = page.locator('#toolbar-paste-blocks');
    await expect(pasteButton).toBeVisible({ timeout: 3000 });
    await expect(pasteButton.locator('.blockCount')).toHaveText('2');

    // Click paste
    await pasteButton.click();

    // Verify: two more blocks inserted after block-3
    await expect(async () => {
      const newOrder = await helper.getBlockOrder();
      expect(newOrder.length).toBe(initialCount + 2);
    }).toPass({ timeout: 5000 });
  });

  test('Paste button is disabled when block type not allowed in target container', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/container-test-page');

    // Copy a text block (type=slate) from inside a column
    await helper.clickBlockInIframe('text-1a');
    await helper.waitForBlockSelected('text-1a');
    await helper.escapeFromEditing();
    await page.keyboard.press('ControlOrMeta+c');

    // Paste button should appear
    const pasteButton = page.locator('#toolbar-paste-blocks');
    await expect(pasteButton).toBeVisible({ timeout: 3000 });

    // Navigate to col-1 via Escape from text-1a (text mode → block mode → parent)
    // col-1's parent (columns-1) only allows 'column' children,
    // so pasting 'slate' after col-1 is not allowed
    await helper.clickBlockInIframe('text-1a');
    await helper.waitForBlockSelected('text-1a');
    await helper.escapeFromEditing();  // text mode → block mode
    await page.keyboard.press('Escape');  // block mode → select parent (col-1)
    await helper.waitForQuantaToolbar('col-1');

    // Left toolbar paste button should be disabled
    await expect(pasteButton).toBeVisible({ timeout: 5000 });
    await expect(pasteButton).toBeDisabled({ timeout: 5000 });

    // Dropdown paste item should be hidden when not allowed
    const menuButton = page.locator('.quanta-toolbar .volto-hydra-menu-trigger');
    await menuButton.click();
    const dropdown = page.locator('.volto-hydra-dropdown-menu');
    await expect(dropdown).toBeVisible({ timeout: 3000 });
    await expect(dropdown.locator('[data-action="paste-block"]')).not.toBeVisible();
    await menuButton.click(); // close

    // Cmd+V should be a no-op — block count shouldn't change
    const iframe = helper.getIframe();
    const blocksBefore = await iframe.locator('[data-block-uid]').count();
    await page.keyboard.press('ControlOrMeta+v');
    // Small wait then verify count unchanged
    await page.waitForTimeout(500);
    const blocksAfter = await iframe.locator('[data-block-uid]').count();
    expect(blocksAfter).toBe(blocksBefore);
  });

  test('Quanta toolbar dropdown has copy/cut/paste actions for single block', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/test-page');

    // Select block-1
    await helper.clickBlockInIframe('block-1-uuid');
    await helper.waitForBlockSelected('block-1-uuid');

    // Open the ⋯ dropdown
    const menuButton = page.locator('.quanta-toolbar .volto-hydra-menu-trigger');
    await expect(menuButton).toBeVisible({ timeout: 3000 });
    await menuButton.click();

    // Should have copy and cut items
    const dropdown = page.locator('.volto-hydra-dropdown-menu');
    await expect(dropdown).toBeVisible({ timeout: 3000 });
    await expect(dropdown.locator('[data-action="copy-block"]')).toBeVisible();
    await expect(dropdown.locator('[data-action="cut-block"]')).toBeVisible();

    // Click copy
    await dropdown.locator('[data-action="copy-block"]').click();

    // Paste should now be available in dropdown (re-open menu)
    await menuButton.click();
    await expect(dropdown.locator('[data-action="paste-block"]')).toBeVisible();
  });

  test('Quanta toolbar dropdown has copy/cut for multi-selected blocks', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/test-page');

    // Multi-select: block-1 + block-2
    await helper.clickBlockInIframe('block-1-uuid');
    await helper.waitForBlockSelected('block-1-uuid');
    await helper.escapeFromEditing();
    await page.keyboard.press('Shift+ArrowDown');

    // Multi-select toolbar should have ⋯ button
    const toolbar = page.locator('.quanta-toolbar[data-multi-select="true"]');
    await expect(toolbar).toBeVisible({ timeout: 5000 });
    const menuButton = toolbar.locator('.volto-hydra-menu-trigger');
    await expect(menuButton).toBeVisible({ timeout: 3000 });
    await menuButton.click();

    // Should have copy, cut, delete items
    const dropdown = page.locator('.volto-hydra-dropdown-menu');
    await expect(dropdown).toBeVisible({ timeout: 3000 });
    await expect(dropdown.locator('[data-action="copy-block"]')).toBeVisible();
    await expect(dropdown.locator('[data-action="cut-block"]')).toBeVisible();
  });

  test('Paste from quanta toolbar dropdown inserts block', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/test-page');
    const iframe = helper.getIframe();

    const initialOrder = await helper.getBlockOrder();
    const initialCount = initialOrder.length;

    // Copy block-1 via keyboard
    await helper.clickBlockInIframe('block-1-uuid');
    await helper.waitForBlockSelected('block-1-uuid');
    await helper.escapeFromEditing();
    await page.keyboard.press('ControlOrMeta+c');

    // Select block-3
    await helper.clickBlockInIframe('block-3-uuid');
    await helper.waitForBlockSelected('block-3-uuid');

    // Open ⋯ dropdown and click paste
    const menuButton = page.locator('.quanta-toolbar .volto-hydra-menu-trigger');
    await menuButton.click();
    const dropdown = page.locator('.volto-hydra-dropdown-menu');
    await expect(dropdown.locator('[data-action="paste-block"]')).toBeVisible({ timeout: 3000 });
    await dropdown.locator('[data-action="paste-block"]').click();

    // Should have one more block
    await expect(async () => {
      const newOrder = await helper.getBlockOrder();
      expect(newOrder.length).toBe(initialCount + 1);
    }).toPass({ timeout: 5000 });
  });

  test('Cmd+V in block mode pastes blocks from clipboard', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/test-page');
    const iframe = helper.getIframe();

    const initialOrder = await helper.getBlockOrder();
    const initialCount = initialOrder.length;

    // Select block-1, enter block mode, copy
    await helper.clickBlockInIframe('block-1-uuid');
    await helper.waitForBlockSelected('block-1-uuid');
    await helper.escapeFromEditing();
    await page.keyboard.press('ControlOrMeta+c');

    // Paste button should appear (clipboard has content)
    const pasteButton = page.locator('#toolbar-paste-blocks');
    await expect(pasteButton).toBeVisible({ timeout: 3000 });

    // ArrowDown to move to block-2 (stay in block mode)
    await page.keyboard.press('ArrowDown');

    // Cmd+V in block mode should paste after currently selected block
    await page.keyboard.press('ControlOrMeta+v');

    // Should have one more block
    await expect(async () => {
      const newOrder = await helper.getBlockOrder();
      expect(newOrder.length).toBe(initialCount + 1);
    }).toPass({ timeout: 5000 });
  });

  test('Cut blocks removes originals after paste', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/test-page');
    const iframe = helper.getIframe();

    const initialOrder = await helper.getBlockOrder();
    const initialCount = initialOrder.length;

    // Select block-1, enter block mode
    await helper.clickBlockInIframe('block-1-uuid');
    await helper.waitForBlockSelected('block-1-uuid');
    await helper.escapeFromEditing();

    // Cut via Cmd+X (block mode sends COPY_BLOCKS with action='cut')
    await page.keyboard.press('ControlOrMeta+x');

    // block-1 should be removed (cut deletes immediately)
    await expect(async () => {
      const order = await helper.getBlockOrder();
      expect(order).not.toContain('block-1-uuid');
    }).toPass({ timeout: 5000 });

    // Click block-3 to set paste target
    await helper.clickBlockInIframe('block-3-uuid');
    await helper.waitForBlockSelected('block-3-uuid');

    // Paste button should be visible
    const pasteButton = page.locator('#toolbar-paste-blocks');
    await expect(pasteButton).toBeVisible({ timeout: 3000 });

    // Click paste — block-1 data pasted after block-3 (same count as before cut)
    await pasteButton.click();

    await expect(async () => {
      const newOrder = await helper.getBlockOrder();
      // Cut removes 1, paste adds 1 — same total count
      expect(newOrder.length).toBe(initialCount);
    }).toPass({ timeout: 5000 });
  });
});
