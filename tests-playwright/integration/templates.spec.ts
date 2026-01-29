/**
 * Integration tests for template functionality in Volto Hydra.
 *
 * Tests that:
 * 1. Template content is merged on page load (fixed blocks get content from template)
 * 2. Fixed template blocks show lock icon instead of drag handle
 * 3. Fixed template blocks cannot be edited or deleted
 * 4. Placeholder content remains fully editable
 */
import { test, expect } from '../fixtures';
import { AdminUIHelper } from '../helpers/AdminUIHelper';

test.describe('Templates', () => {
  test('template content is merged on page load', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/template-test-page');

    const iframe = helper.getIframe();

    // Wait for the fixed template block (header) to be visible
    await expect(iframe.locator('[data-block-uid="template-header"]')).toBeVisible({ timeout: 15000 });

    // The header should show content from the TEMPLATE, not the stale page content
    // Page has "Stale Header - Should Be Replaced By Merge"
    // Template has "Template Header - From Template"
    const headerBlock = iframe.locator('[data-block-uid="template-header"]');
    await expect(headerBlock).toContainText('Template Header - From Template');
    await expect(headerBlock).not.toContainText('Stale Header');

    // User content in placeholder should be preserved (not replaced)
    const userContent = iframe.locator('[data-block-uid="user-content-1"]');
    await expect(userContent).toContainText('User content - different from template default');
  });

  test('new fixed blocks from template are inserted during merge', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/template-test-page');

    const iframe = helper.getIframe();

    // Wait for merge to complete (header gets template content)
    await expect(iframe.locator('[data-block-uid="template-header"]')).toContainText('Template Header - From Template', { timeout: 15000 });

    // The grid block exists in the template but NOT in the page's original data
    // It should be inserted during merge
    const gridBlock = iframe.locator('[data-block-uid="template-grid"]');
    await expect(gridBlock).toBeVisible();

    // Grid should have content from template cell 1 (which has _templateSource)
    await expect(gridBlock).toContainText('Template Grid Cell 1');

    // Verify block order: header, grid, user-content-1, user-content-2, footer
    const blockOrder = await helper.getBlockOrder();
    const headerIndex = blockOrder.indexOf('template-header');
    const gridIndex = blockOrder.indexOf('template-grid');
    const userContent1Index = blockOrder.indexOf('user-content-1');
    const footerIndex = blockOrder.indexOf('template-footer');

    // Grid should be after header and before user content
    expect(gridIndex).toBe(headerIndex + 1);
    expect(userContent1Index).toBeGreaterThan(gridIndex);
    expect(footerIndex).toBeGreaterThan(userContent1Index);
  });

  test('nested blocks without _templateSource are NOT synced from template', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/template-test-page');

    const iframe = helper.getIframe();

    // Wait for merge to complete
    await expect(iframe.locator('[data-block-uid="template-header"]')).toContainText('Template Header - From Template', { timeout: 15000 });

    // The grid block should be visible
    const gridBlock = iframe.locator('[data-block-uid="template-grid"]');
    await expect(gridBlock).toBeVisible();

    // Grid cell 1 HAS _templateSource marker - should be synced
    await expect(gridBlock).toContainText('Template Grid Cell 1');

    // Grid cell 2 does NOT have _templateSource marker - should NOT be synced
    // The merge logic ignores blocks without placeholderName
    await expect(gridBlock).not.toContainText('Template Grid Cell 2');
  });

  test('placeholder content is preserved during merge', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/template-test-page');

    const iframe = helper.getIframe();

    // Wait for merge to complete
    await expect(iframe.locator('[data-block-uid="template-header"]')).toContainText('Template Header - From Template', { timeout: 15000 });

    // User content should have the PAGE's content, not the template default
    // Page has "User content - different from template default"
    // Template default is "Default placeholder content - should be replaced by user content"
    const userContent1 = iframe.locator('[data-block-uid="user-content-1"]');
    await expect(userContent1).toContainText('User content - different from template default');
    await expect(userContent1).not.toContainText('Default placeholder content');

    // Second user content block should also be preserved
    const userContent2 = iframe.locator('[data-block-uid="user-content-2"]');
    await expect(userContent2).toContainText('Second user content block in placeholder');
  });

  test('merged template content persists after editing placeholder', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/template-test-page');

    const iframe = helper.getIframe();

    // Wait for merged content to appear
    const headerBlock = iframe.locator('[data-block-uid="template-header"]');
    await expect(headerBlock).toContainText('Template Header - From Template', { timeout: 15000 });

    // Edit the placeholder content (user-content-1)
    await helper.clickBlockInIframe('user-content-1');
    await helper.waitForQuantaToolbar('user-content-1');

    const userBlock = iframe.locator('[data-block-uid="user-content-1"]');
    const editor = helper.getSlateField(userBlock);
    await expect(editor).toHaveAttribute('contenteditable', 'true', { timeout: 5000 });

    // Type something new
    await editor.click();
    await page.keyboard.type(' - EDITED');

    // Wait for the edit to propagate (FORM_DATA sent back to frontend)
    await page.waitForTimeout(500);

    // The merged template header should STILL show template content, not stale page content
    // This catches the bug where edits trigger a re-merge or reload
    await expect(headerBlock).toContainText('Template Header - From Template');
    await expect(headerBlock).not.toContainText('Stale Header');

    // Footer should also still have merged content
    const footerBlock = iframe.locator('[data-block-uid="template-footer"]');
    await expect(footerBlock).toContainText('Template Footer - From Template');
    await expect(footerBlock).not.toContainText('Stale Footer');
  });

  test('fixed template blocks show lock icon instead of drag handle', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/template-test-page');

    const iframe = helper.getIframe();

    // Wait for the fixed template block (header) to be visible
    // The template-test-page has pre-applied template with fixed header block
    await expect(iframe.locator('[data-block-uid="template-header"]')).toBeVisible({ timeout: 15000 });

    // Click the fixed template block
    await helper.clickBlockInIframe('template-header');
    await helper.waitForQuantaToolbar('template-header');

    // The toolbar is rendered in admin UI
    const toolbar = page.locator('.quanta-toolbar');
    await expect(toolbar).toBeVisible();

    // Lock icon should be visible instead of drag handle
    const lockIcon = toolbar.locator('.lock-icon');
    await expect(lockIcon).toBeVisible();

    // Drag handle should NOT be visible for fixed template blocks
    const dragHandle = toolbar.locator('.drag-handle');
    await expect(dragHandle).not.toBeVisible();
  });

  test('fixed template blocks cannot be edited', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/template-test-page');

    const iframe = helper.getIframe();

    // Wait for merged content to appear (template merge must complete)
    const headerBlock = iframe.locator('[data-block-uid="template-header"]');
    await expect(headerBlock).toContainText('Template Header - From Template', { timeout: 15000 });

    // Click the fixed template block
    await helper.clickBlockInIframe('template-header');
    await helper.waitForQuantaToolbar('template-header');

    // 1. Check inline editing is disabled (contenteditable should not be true)
    const h1Element = headerBlock.locator('h1');
    await expect(h1Element).toBeVisible();
    const isEditable = await h1Element.getAttribute('contenteditable');
    expect(isEditable).not.toBe('true');

    // 2. Check toolbar has NO slate formatting buttons (Bold, Italic, etc.)
    const toolbarButtons = await helper.getQuantaToolbarButtons();
    const buttonTitles = toolbarButtons.filter(b => b.visible).map(b => b.title.toLowerCase());

    // Slate formatting buttons should NOT be visible for readonly blocks
    expect(buttonTitles).not.toContain('bold');
    expect(buttonTitles).not.toContain('italic');
    expect(buttonTitles).not.toContain('underline');
    expect(buttonTitles).not.toContain('strikethrough');

    // 3. Check sidebar does NOT have editable value field
    await helper.waitForSidebarOpen();

    // The sidebar should NOT have a 'value' field (the slate content field)
    // Readonly blocks don't expose their content for editing in sidebar
    const hasValueField = await helper.hasSidebarField('value');
    expect(hasValueField).toBe(false);

    // 4. Try typing in iframe - nothing should happen
    await h1Element.click();
    const textBefore = await h1Element.textContent();
    await page.keyboard.type('SHOULD NOT APPEAR');
    const textAfter = await h1Element.textContent();
    expect(textAfter).toBe(textBefore);
  });

  test('fixed template blocks cannot be deleted', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/template-test-page');

    const iframe = helper.getIframe();

    // Wait for the fixed template block
    await expect(iframe.locator('[data-block-uid="template-header"]')).toBeVisible({ timeout: 15000 });

    // Click the fixed template block
    await helper.clickBlockInIframe('template-header');
    await helper.waitForQuantaToolbar('template-header');

    // Open the toolbar menu
    await helper.openQuantaToolbarMenu('template-header');
    const menuOptions = await helper.getQuantaToolbarMenuOptions('template-header');
    const optionLabels = menuOptions.map(o => o.toLowerCase());

    // Should NOT have delete/remove option
    expect(optionLabels).not.toContain('remove');
    expect(optionLabels).not.toContain('delete');
  });

  test('placeholder content is fully editable', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/template-test-page');

    const iframe = helper.getIframe();

    // Wait for user content block (in placeholder region)
    await expect(iframe.locator('[data-block-uid="user-content-1"]')).toBeVisible({ timeout: 15000 });

    // Click the user content block
    await helper.clickBlockInIframe('user-content-1');
    await helper.waitForQuantaToolbar('user-content-1');

    // The toolbar (in admin UI) should show drag handle (not lock)
    const toolbar = page.locator('.quanta-toolbar');
    const dragHandle = toolbar.locator('.drag-handle');
    await expect(dragHandle).toBeVisible();

    // Lock icon should NOT be visible
    const lockIcon = toolbar.locator('.lock-icon');
    await expect(lockIcon).not.toBeVisible();

    // Content should be editable
    const userBlock = iframe.locator('[data-block-uid="user-content-1"]');
    const editor = helper.getSlateField(userBlock);
    await expect(editor).toHaveAttribute('contenteditable', 'true', { timeout: 5000 });

    // Should have delete option in menu
    await helper.openQuantaToolbarMenu('user-content-1');
    const menuOptions = await helper.getQuantaToolbarMenuOptions('user-content-1');
    const optionLabels = menuOptions.map(o => o.toLowerCase());
    expect(optionLabels.some(o => o.includes('remove') || o.includes('delete'))).toBe(true);
  });

  // Phase 2: Virtual Container Tests

  test('sidebar shows template instance in hierarchy when selecting template block', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/template-test-page');

    const iframe = helper.getIframe();
    await expect(iframe.locator('[data-block-uid="template-header"]')).toBeVisible({ timeout: 15000 });

    // Click the template header block
    await helper.clickBlockInIframe('template-header');
    await helper.waitForSidebarOpen();

    // Sidebar should show hierarchy: Page > Template Instance > Text (block title)
    // The template instance uses "Template: {path}" format
    const stickyHeaders = page.locator('.sidebar-section-header.sticky-header');
    await expect(stickyHeaders).toHaveCount(3);
    await expect(stickyHeaders.nth(0)).toContainText('Page');
    await expect(stickyHeaders.nth(1)).toContainText('Template: test-layout');
    await expect(stickyHeaders.nth(2)).toContainText('Text'); // slate block's display name
  });

  test('Escape key navigates up to template instance', async ({ page }) => {

    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/template-test-page');

    const iframe = helper.getIframe();
    await expect(iframe.locator('[data-block-uid="template-header"]')).toBeVisible({ timeout: 15000 });

    // Click the template header block
    await helper.clickBlockInIframe('template-header');
    await helper.waitForSidebarOpen();

    // Initially 3 headers: Page > Template Instance > Slate
    const stickyHeaders = page.locator('.sidebar-section-header.sticky-header');
    await expect(stickyHeaders).toHaveCount(3);

    // Press Escape to navigate up to template instance
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);

    // Now should have 2 headers: Page > Template Instance
    await expect(stickyHeaders).toHaveCount(2);
    await expect(stickyHeaders.nth(1)).toContainText('Template: test-layout');

    // Sidebar should show placeholder children of the template
    const childBlocksList = page.locator('.child-blocks-list');
    await expect(childBlocksList).toBeVisible();
  });

  test('dragging template instance moves all template blocks together', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/template-test-page');

    const iframe = helper.getIframe();
    // Wait for all blocks to be visible
    await expect(iframe.locator('[data-block-uid="standalone-block-1"]')).toBeVisible({ timeout: 15000 });
    await expect(iframe.locator('[data-block-uid="template-header"]')).toBeVisible({ timeout: 15000 });

    // Get initial block order - should be:
    // standalone-block-1, template-header, template-grid, template-grid-cell-1, user-content-1, user-content-2, template-footer, standalone-block-2
    // Note: template-grid-cell-1 is a nested block that appears after template-grid in DOM order
    const initialOrder = await helper.getBlockOrder();
    expect(initialOrder[0]).toBe('standalone-block-1');
    expect(initialOrder[1]).toBe('template-header');
    expect(initialOrder[2]).toBe('template-grid');
    expect(initialOrder[3]).toBe('template-grid-cell-1');
    expect(initialOrder[4]).toBe('user-content-1');
    expect(initialOrder[5]).toBe('user-content-2');
    expect(initialOrder[6]).toBe('template-footer');
    expect(initialOrder[7]).toBe('standalone-block-2');

    // Select template header, then navigate up to template instance
    await helper.clickBlockInIframe('template-header');
    await helper.waitForQuantaToolbar('template-header');
    await page.keyboard.press('Escape');

    // Wait for the template instance toolbar to appear with a drag handle
    // Template instances are virtual (no DOM element), so just check toolbar visibility
    const toolbar = page.locator('.quanta-toolbar');
    const dragHandle = toolbar.locator('.drag-handle');
    await expect(dragHandle).toBeVisible({ timeout: 5000 });

    // Drag the template instance before standalone-block-1
    // This moves the entire template (header + user-content + footer) to the top
    const standaloneBlock1 = iframe.locator('[data-block-uid="standalone-block-1"]');
    await helper.dragBlockWithMouse(dragHandle, standaloneBlock1, false); // insertAfter=false means before

    // Get new block order - template blocks should all be at the top now
    const newOrder = await helper.getBlockOrder();
    // Template blocks (header, grid + nested cell, user-content-1, user-content-2, footer) should be first, followed by standalone blocks
    expect(newOrder[0]).toBe('template-header');
    expect(newOrder[1]).toBe('template-grid');
    expect(newOrder[2]).toBe('template-grid-cell-1');
    expect(newOrder[3]).toBe('user-content-1');
    expect(newOrder[4]).toBe('user-content-2');
    expect(newOrder[5]).toBe('template-footer');
    expect(newOrder[6]).toBe('standalone-block-1');
    expect(newOrder[7]).toBe('standalone-block-2');
  });

  test('cannot insert blocks between two fixed template blocks', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/template-test-page');

    const iframe = helper.getIframe();

    // Wait for merged content to appear
    await expect(iframe.locator('[data-block-uid="template-header"]')).toContainText('Template Header - From Template', { timeout: 15000 });
    await expect(iframe.locator('[data-block-uid="template-grid"]')).toBeVisible({ timeout: 5000 });

    // Select the template header (first fixed block)
    // template-header is followed by template-grid (both fixed)
    await helper.clickBlockInIframe('template-header');
    await helper.waitForQuantaToolbar('template-header');

    // The add button should NOT be visible because you can't insert
    // between two adjacent fixed blocks
    const addButton = page.locator('.volto-hydra-add-button');
    await expect(addButton).not.toBeVisible();

    // Verify blocks are still adjacent (no blocks in between)
    const blockOrder = await helper.getBlockOrder();
    const headerIndex = blockOrder.indexOf('template-header');
    const gridIndex = blockOrder.indexOf('template-grid');
    expect(gridIndex).toBe(headerIndex + 1);
  });

  test('cannot insert blocks at container edges around fixed nested block', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/template-test-page');

    const iframe = helper.getIframe();

    // Wait for the grid block to be visible with merged content
    await expect(iframe.locator('[data-block-uid="template-grid"]')).toBeVisible({ timeout: 15000 });

    // Click on the fixed grid cell (it's the only block in the grid, so it's at both edges)
    await helper.clickBlockInIframe('template-grid-cell-1');
    await helper.waitForQuantaToolbar('template-grid-cell-1');

    // The add button should NOT be visible because:
    // 1. It's a fixed block at the end of the container (no placeholder after it)
    // 2. Can't insert between fixed block and container edge
    const addButton = page.locator('.volto-hydra-add-button');
    await expect(addButton).not.toBeVisible();
  });

  test('cannot drag block between two fixed template blocks', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/template-test-page');

    const iframe = helper.getIframe();

    // Wait for blocks to be visible
    await expect(iframe.locator('[data-block-uid="standalone-block-1"]')).toBeVisible({ timeout: 15000 });
    await expect(iframe.locator('[data-block-uid="template-header"]')).toBeVisible();
    await expect(iframe.locator('[data-block-uid="template-grid"]')).toBeVisible();

    // Get initial block order - header and grid should be adjacent
    const initialOrder = await helper.getBlockOrder();
    expect(initialOrder.indexOf('template-header') + 1).toBe(initialOrder.indexOf('template-grid'));

    // Select the standalone block (not fixed)
    await helper.clickBlockInIframe('standalone-block-1');
    await helper.waitForSidebarOpen();

    // Get drag handle and start drag
    const dragHandle = await helper.getDragHandle();
    const handleBox = await dragHandle.boundingBox();
    expect(handleBox).not.toBeNull();

    await page.mouse.move(handleBox!.x + handleBox!.width / 2, handleBox!.y + handleBox!.height / 2);
    await page.mouse.down();

    // Move to after template-header (which is followed by template-grid, also fixed)
    const headerBlock = iframe.locator('[data-block-uid="template-header"]');
    const headerBox = await headerBlock.boundingBox();
    expect(headerBox).not.toBeNull();

    // Position for "insert after" - bottom area of header block
    await page.mouse.move(
      headerBox!.x + headerBox!.width / 2,
      headerBox!.y + headerBox!.height * 0.75,
      { steps: 10 },
    );

    // Drop indicator should NOT be positioned between header and grid
    // (it may appear elsewhere, like before the header, but not in the gap)
    const dropIndicator = iframe.locator('.volto-hydra-drop-indicator');
    const gridBlock = iframe.locator('[data-block-uid="template-grid"]');
    const gridBox = await gridBlock.boundingBox();
    expect(gridBox).not.toBeNull();

    // If indicator is visible, verify it's NOT between header and grid
    const indicatorVisible = await dropIndicator.isVisible();
    if (indicatorVisible) {
      const indicatorBox = await dropIndicator.boundingBox();
      if (indicatorBox) {
        // Indicator should NOT be in the gap between header bottom and grid top
        const headerBottom = headerBox!.y + headerBox!.height;
        const gridTop = gridBox!.y;
        const indicatorCenter = indicatorBox.y + indicatorBox.height / 2;

        // Indicator should be either above header or below grid, not in between
        const isBetweenFixedBlocks = indicatorCenter > headerBottom - 10 && indicatorCenter < gridTop + 10;
        expect(isBetweenFixedBlocks).toBe(false);
      }
    }

    // Also move over the grid and check - indicator should NOT show before grid (between header and grid)
    await page.mouse.move(
      gridBox!.x + gridBox!.width / 2,
      gridBox!.y + gridBox!.height * 0.25, // Top area of grid = "insert before"
      { steps: 10 },
    );

    // Check indicator position when hovering over grid
    const indicatorVisible2 = await dropIndicator.isVisible();
    if (indicatorVisible2) {
      const indicatorBox2 = await dropIndicator.boundingBox();
      if (indicatorBox2) {
        const headerBottom = headerBox!.y + headerBox!.height;
        const gridTop = gridBox!.y;
        const indicatorCenter2 = indicatorBox2.y + indicatorBox2.height / 2;

        // Indicator should NOT be between header and grid
        const isBetweenFixedBlocks2 = indicatorCenter2 > headerBottom - 10 && indicatorCenter2 < gridTop + 10;
        expect(isBetweenFixedBlocks2).toBe(false);
      }
    }

    // Drop
    await page.mouse.up();

    // Verify block order - template-header and template-grid should still be adjacent
    const newOrder = await helper.getBlockOrder();
    const headerIndex = newOrder.indexOf('template-header');
    const gridIndex = newOrder.indexOf('template-grid');

    // The key assertion: header and grid must remain adjacent
    expect(gridIndex).toBe(headerIndex + 1);
  });

  test('can drag block into placeholder region', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/template-test-page');

    const iframe = helper.getIframe();

    // Wait for blocks to be visible
    await expect(iframe.locator('[data-block-uid="standalone-block-2"]')).toBeVisible({ timeout: 15000 });
    await expect(iframe.locator('[data-block-uid="user-content-1"]')).toBeVisible();

    // Get initial block order - standalone-block-2 should be after template-footer
    const initialOrder = await helper.getBlockOrder();
    expect(initialOrder.indexOf('standalone-block-2')).toBeGreaterThan(initialOrder.indexOf('template-footer'));

    // Select standalone-block-2
    await helper.clickBlockInIframe('standalone-block-2');
    await helper.waitForSidebarOpen();

    // Get drag handle
    const dragHandle = await helper.getDragHandle();

    // Drag standalone-block-2 to after user-content-1 (which is in the placeholder region)
    const userContentBlock = iframe.locator('[data-block-uid="user-content-1"]');
    await helper.dragBlockWithMouse(dragHandle, userContentBlock, true); // insertAfter=true

    // Wait for DOM to stabilize
    await helper.getStableBlockCount();

    // Verify standalone-block-2 is now right after user-content-1
    const newOrder = await helper.getBlockOrder();
    const newUserContentIndex = newOrder.indexOf('user-content-1');
    const newStandalone2Index = newOrder.indexOf('standalone-block-2');

    // standalone-block-2 should now be right after user-content-1
    expect(newStandalone2Index).toBe(newUserContentIndex + 1);
  });

  test('template instance toolbar remains visible after scrolling', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/template-test-page');

    const iframe = helper.getIframe();

    // Wait for template blocks to be visible
    await expect(iframe.locator('[data-block-uid="template-header"]')).toBeVisible({ timeout: 15000 });

    // Select template header, then Escape to navigate up to template instance
    await helper.clickBlockInIframe('template-header');
    await helper.waitForQuantaToolbar('template-header');
    await page.keyboard.press('Escape');

    // Template instance child block IDs (the outline should cover all of these)
    const templateChildBlocks = ['template-header', 'template-grid', 'user-content-1', 'user-content-2', 'template-footer'];

    // Wait for template instance toolbar to be positioned correctly
    await helper.waitForQuantaToolbar(templateChildBlocks);

    // Scroll the iframe content down
    await iframe.locator('body').evaluate((body) => body.ownerDocument.defaultView?.scrollBy(0, 200));

    // BUG: After scrolling, the toolbar should still be visible and positioned
    // correctly for the template instance. The instance is still selected
    // (shows in sidebar) but toolbar/outline disappears from iframe.
    await helper.waitForQuantaToolbar(templateChildBlocks);
  });
});
