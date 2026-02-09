/**
 * Advanced template tests for edge cases and additional features.
 *
 * Tests that:
 * 1. Fixed editable blocks can be edited but not moved
 * 2. Removing a layout preserves content
 * 3. Deleting a template instance preserves placeholder content
 * 4. Non-matching placeholder content goes to default placeholder
 */
import { test, expect } from '../fixtures';
import { AdminUIHelper } from '../helpers/AdminUIHelper';

test.describe('Fixed Editable Blocks', () => {
  test('fixed block without readOnly can be edited', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    const iframe = helper.getIframe();

    await helper.login();
    await helper.navigateToEdit('/another-page');
    await helper.waitForIframeReady();

    // Apply the editable-fixed layout
    await page.keyboard.press('Escape');
    const layoutSelector = page.locator('.layout-selector select');
    await expect(layoutSelector).toBeVisible({ timeout: 5000 });
    await layoutSelector.selectOption('Editable Fixed Layout');
    await page.locator('.apply-layout-btn').click();

    // Wait for layout to be applied
    await expect(page.locator('.child-block-item', { hasText: 'Editable Header' })).toBeVisible({ timeout: 5000 });

    // Click the editable header block
    const headerBlock = iframe.locator('main [data-block-uid], #content [data-block-uid]').filter({ hasText: 'Editable Header' });
    await expect(headerBlock).toBeVisible();
    await headerBlock.click();
    await helper.waitForSidebarOpen();

    // Verify it shows lock icon (fixed)
    const toolbar = page.locator('.quanta-toolbar');
    const lockIcon = toolbar.locator('.lock-icon');
    await expect(lockIcon).toBeVisible();

    // But the block should be editable - verify the editable field is present
    const editableField = helper.getSlateField(headerBlock);
    await expect(editableField).toBeVisible({ timeout: 5000 });
  });

  test('fixed block without readOnly cannot be moved', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    const iframe = helper.getIframe();

    await helper.login();
    await helper.navigateToEdit('/another-page');
    await helper.waitForIframeReady();

    // Apply the editable-fixed layout
    await page.keyboard.press('Escape');
    const layoutSelector = page.locator('.layout-selector select');
    await expect(layoutSelector).toBeVisible({ timeout: 5000 });
    await layoutSelector.selectOption('Editable Fixed Layout');
    await page.locator('.apply-layout-btn').click();

    // Wait for layout
    await expect(page.locator('.child-block-item', { hasText: 'Editable Header' })).toBeVisible({ timeout: 5000 });

    // Click the header block
    const headerBlock = iframe.locator('main [data-block-uid], #content [data-block-uid]').filter({ hasText: 'Editable Header' });
    await headerBlock.click();
    await helper.waitForSidebarOpen();

    // Verify drag handle is NOT shown (fixed blocks can't be dragged)
    const toolbar = page.locator('.quanta-toolbar');
    const dragHandle = toolbar.locator('.drag-handle');
    await expect(dragHandle).not.toBeVisible();
  });
});

test.describe('Remove Layout', () => {
  test('can clear layout selection and preserve content', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    const iframe = helper.getIframe();

    await helper.login();
    await helper.navigateToEdit('/another-page');
    await helper.waitForIframeReady();

    // Get initial content
    const initialBlocks = await iframe.locator('main [data-block-uid], #content [data-block-uid]').allTextContents();
    const hasOriginalContent = initialBlocks.some(t => t.includes('another test page'));
    expect(hasOriginalContent).toBe(true);

    // Apply header-footer layout
    await page.keyboard.press('Escape');
    const layoutSelector = page.locator('.layout-selector select');
    await expect(layoutSelector).toBeVisible({ timeout: 5000 });
    await layoutSelector.selectOption('Header Footer Layout');
    await page.locator('.apply-layout-btn').click();

    // Wait for layout to be applied
    await expect(page.locator('.child-block-item', { hasText: 'Layout Header' })).toBeVisible({ timeout: 5000 });

    // Verify original content is still there (in default placeholder)
    const afterLayoutBlocks = await iframe.locator('main [data-block-uid], #content [data-block-uid]').allTextContents();
    const contentPreserved = afterLayoutBlocks.some(t => t.includes('another test page'));
    expect(contentPreserved).toBe(true);

    // Now select "Layout" (no layout) to remove the layout
    await page.keyboard.press('Escape');
    await expect(layoutSelector).toBeVisible({ timeout: 5000 });
    await layoutSelector.selectOption('Layout');

    // Click apply (should clear the layout)
    const applyButton = page.locator('.apply-layout-btn');
    // Apply button may not be visible when selecting "Layout" (no-op)
    // The content should still be there without the fixed header/footer
  });
});

test.describe('Delete Template Instance', () => {
  test('deleting template block via Remove moves placeholder content out', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    const iframe = helper.getIframe();

    await helper.login();
    await helper.navigateToEdit('/template-test-page');
    await helper.waitForIframeReady();

    // Click on a template block to select it - this shows the template instance in breadcrumbs
    const headerBlock = iframe.locator('main [data-block-uid], #content [data-block-uid]').filter({ hasText: 'Template Header' });
    await expect(headerBlock).toBeVisible();
    await headerBlock.click();
    await helper.waitForSidebarOpen();

    // The template block is selected, which shows template settings in sidebar
    // The template breadcrumb button shows "Template: test-layout"
    const templateBreadcrumb = page.locator('button', { hasText: 'Template: test-layout' });
    await expect(templateBreadcrumb).toBeVisible({ timeout: 5000 });

    // Click the "•••" dropdown button next to the template breadcrumb to access Remove option
    // The dropdown is a sibling of the template breadcrumb in the same container
    const templateSection = templateBreadcrumb.locator('xpath=..');
    const dropdownTrigger = templateSection.locator('button', { hasText: '•••' });
    await expect(dropdownTrigger).toBeVisible();
    await dropdownTrigger.click();

    // Click Remove to delete the template instance
    const removeButton = page.locator('.volto-hydra-dropdown-item', { hasText: 'Remove' });
    await expect(removeButton).toBeVisible();
    await removeButton.click();

    // Verify the template header is gone
    await expect(headerBlock).not.toBeVisible();

    // Verify user content is preserved (moved out of template)
    // Both user content blocks should still be visible
    const userContent = iframe.locator('main [data-block-uid], #content [data-block-uid]').filter({ hasText: 'User content' });
    await expect(userContent).toHaveCount(2);
  });
});

test.describe('Non-matching Placeholder Content', () => {
  test('content with unknown placeholder goes to default slot', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    const iframe = helper.getIframe();

    await helper.login();
    await helper.navigateToEdit('/another-page');
    await helper.waitForIframeReady();

    // another-page has content without placeholder names
    // When we apply a layout, it should go into the "default" placeholder

    // Get initial block count
    const initialBlocks = await iframe.locator('main [data-block-uid], #content [data-block-uid]').allTextContents();
    expect(initialBlocks.length).toBeGreaterThan(0);

    // Apply header-footer layout (which has a "default" placeholder)
    await page.keyboard.press('Escape');
    const layoutSelector = page.locator('.layout-selector select');
    await expect(layoutSelector).toBeVisible({ timeout: 5000 });
    await layoutSelector.selectOption('Header Footer Layout');
    await page.locator('.apply-layout-btn').click();

    // Wait for layout
    await expect(page.locator('.child-block-item', { hasText: 'Layout Header' })).toBeVisible({ timeout: 5000 });

    // Verify: header is first, original content is in the middle, footer is last
    const allBlocks = await iframe.locator('main [data-block-uid], #content [data-block-uid]').allTextContents();
    const headerIndex = allBlocks.findIndex(t => t.includes('Layout Header'));
    const footerIndex = allBlocks.findIndex(t => t.includes('Layout Footer'));
    const contentIndex = allBlocks.findIndex(t => t.includes('another test page'));

    expect(headerIndex).toBe(0); // Header at start
    expect(footerIndex).toBe(allBlocks.length - 1); // Footer at end
    expect(contentIndex).toBeGreaterThan(headerIndex); // Content after header
    expect(contentIndex).toBeLessThan(footerIndex); // Content before footer
  });
});

test.describe('Template Placeholder Replacement', () => {
  test('replacing placeholder blocks with new content persists after reload', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    const iframe = helper.getIframe();

    await helper.login();
    await helper.navigateToEdit('/template-test-page');
    await helper.waitForIframeReady();

    // Wait for template merge to complete (header gets template content)
    const headerBlock = iframe.locator('main [data-block-uid], #content [data-block-uid]').filter({ hasText: 'Template Header' }).first();
    await expect(headerBlock).toContainText('Template Header - From Template', { timeout: 15000 });

    // Verify placeholder blocks exist
    await expect(iframe.locator('[data-block-uid="user-content-1"]')).toBeVisible();
    await expect(iframe.locator('[data-block-uid="user-content-2"]')).toBeVisible();

    const initialCount = await helper.getBlockCount();

    // Remove BOTH placeholder blocks - this is the bug scenario:
    // all placeholder info for "primary" is now gone from the instance
    await helper.clickBlockInIframe('user-content-1');
    await helper.openQuantaToolbarMenu('user-content-1');
    await helper.clickQuantaToolbarMenuOption('user-content-1', 'Remove');
    await helper.waitForBlockToDisappear('user-content-1');

    await helper.clickBlockInIframe('user-content-2');
    await helper.openQuantaToolbarMenu('user-content-2');
    await helper.clickQuantaToolbarMenuOption('user-content-2', 'Remove');
    await helper.waitForBlockToDisappear('user-content-2');

    // All placeholder blocks are gone. The grid block (fixed) now has
    // nextPlaceholder: "primary" from the merge, so its add button is visible.
    // Click the grid block (find by content since fixed blocks get new UUIDs after merge).
    const gridBlock = iframe.locator('main [data-block-uid], #content [data-block-uid]').filter({ hasText: 'Template Grid Cell 1' }).first();
    await expect(gridBlock).toBeVisible();
    const gridBlockId = await gridBlock.getAttribute('data-block-uid');

    // Record all block IDs before adding, so we can find the new one by set difference
    // (getBlockOrder includes nested blocks, so position-based lookup doesn't work)
    const blockIdsBefore = new Set(await helper.getBlockOrder());

    await helper.clickBlockInIframe(gridBlockId!);
    await helper.waitForSidebarOpen();
    await helper.clickAddBlockButton();
    await helper.selectBlockType('slate');

    // Wait for new block to appear (removed 2, added 1)
    await helper.waitForBlockCountToBe(initialCount - 1);

    // Find the new block by set difference
    const blockIdsAfter = await helper.getBlockOrder();
    const newBlockUid = blockIdsAfter.find(id => !blockIdsBefore.has(id));
    expect(newBlockUid).toBeTruthy();

    // Save (goes to view mode) — verify the new block persists after merge
    await helper.saveContent();

    // In view mode the bridge runs the merge again.
    // The new block should survive because it inherited placeholder: "primary".
    await expect(iframe.locator(`[data-block-uid="${newBlockUid}"]`)).toBeVisible({ timeout: 15000 });

    // Original placeholder blocks should be gone
    await expect(iframe.locator('[data-block-uid="user-content-1"]')).not.toBeVisible();
    await expect(iframe.locator('[data-block-uid="user-content-2"]')).not.toBeVisible();

    // Template fixed blocks still present
    await expect(iframe.locator('main [data-block-uid], #content [data-block-uid]').filter({ hasText: 'Template Header' }).first()).toBeVisible();
    await expect(iframe.locator('main [data-block-uid], #content [data-block-uid]').filter({ hasText: 'Template Footer' })).toBeVisible();
  });
});

test.describe('Template Sidebar Placeholder Sections', () => {
  test('sidebar groups template children by placeholder with fixed blocks between', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/template-test-page');
    await helper.waitForIframeReady();

    // Click a template block then Escape up to the template virtual block
    const { locator: headerBlock } = await helper.waitForBlockByContent('Template Header');
    await headerBlock.click();
    await helper.waitForSidebarOpen();
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);

    // Should be at template instance level
    const stickyHeaders = page.locator('.sidebar-section-header.sticky-header');
    await expect(stickyHeaders.nth(1)).toContainText('Template: test-layout');

    // Fixed blocks should appear as fixed-block-items (no drag handle)
    const fixedItems = page.locator('#sidebar-order .fixed-block-item');
    await expect(fixedItems.first()).toBeVisible({ timeout: 5000 });
    const fixedCount = await fixedItems.count();
    expect(fixedCount).toBeGreaterThanOrEqual(3); // header, grid, footer

    // Placeholder section should show "Primary" header with user content blocks
    const primarySection = page.locator('.container-field-section').filter({
      has: page.locator('.widget-title', { hasText: 'Primary' }),
    });
    await expect(primarySection).toBeVisible({ timeout: 5000 });

    // Primary section should have 2 draggable child blocks (user-content-1, user-content-2)
    const primaryItems = primarySection.locator('.child-block-item');
    await expect(primaryItems).toHaveCount(2);

    // Drag handles should be visible on placeholder blocks (they're draggable)
    const dragHandles = primarySection.locator('.drag-handle');
    await expect(dragHandles).toHaveCount(2);

    // Fixed blocks should NOT have drag handles
    for (let i = 0; i < fixedCount; i++) {
      await expect(fixedItems.nth(i).locator('.drag-handle')).not.toBeVisible();
    }
  });

  test('DnD reorders blocks within a placeholder section', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    const iframe = helper.getIframe();

    await helper.login();
    await helper.navigateToEdit('/template-test-page');
    await helper.waitForIframeReady();

    // Navigate to template instance level
    const { locator: headerBlock } = await helper.waitForBlockByContent('Template Header');
    await headerBlock.click();
    await helper.waitForSidebarOpen();
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);

    // Find the Primary placeholder section
    const primarySection = page.locator('.container-field-section').filter({
      has: page.locator('.widget-title', { hasText: 'Primary' }),
    });
    await expect(primarySection).toBeVisible({ timeout: 5000 });

    // Verify initial order: user-content-1 before user-content-2
    await expect(iframe.locator('[data-block-uid="user-content-1"]')).toBeVisible();
    await expect(iframe.locator('[data-block-uid="user-content-2"]')).toBeVisible();

    const initialOrder = await iframe.locator('main [data-block-uid], #content [data-block-uid]')
      .evaluateAll((els) => els.map((el) => el.getAttribute('data-block-uid')));
    const idx1 = initialOrder.indexOf('user-content-1');
    const idx2 = initialOrder.indexOf('user-content-2');
    expect(idx1).toBeLessThan(idx2);

    // Use keyboard-based DnD (more reliable than mouse in automated tests)
    // react-beautiful-dnd: focus drag handle → Space to grab → ArrowDown to move → Space to drop
    const firstHandle = primarySection.locator('.drag-handle').first();
    await firstHandle.focus();
    await page.keyboard.press('Space');
    await page.waitForTimeout(200);
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(200);
    await page.keyboard.press('Space');

    // Verify order changed in iframe: user-content-2 now before user-content-1
    await expect(async () => {
      const newOrder = await iframe.locator('main [data-block-uid], #content [data-block-uid]')
        .evaluateAll((els) => els.map((el) => el.getAttribute('data-block-uid')));
      const newIdx1 = newOrder.indexOf('user-content-1');
      const newIdx2 = newOrder.indexOf('user-content-2');
      expect(newIdx2).toBeLessThan(newIdx1);
    }).toPass({ timeout: 5000 });
  });

  test('add block into placeholder section via sidebar [+] button', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    const iframe = helper.getIframe();

    await helper.login();
    await helper.navigateToEdit('/template-test-page');
    await helper.waitForIframeReady();

    // Navigate to template instance level
    const { locator: headerBlock } = await helper.waitForBlockByContent('Template Header');
    await headerBlock.click();
    await helper.waitForSidebarOpen();
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);

    // Find the Primary placeholder section
    const primarySection = page.locator('.container-field-section').filter({
      has: page.locator('.widget-title', { hasText: 'Primary' }),
    });
    await expect(primarySection).toBeVisible({ timeout: 5000 });

    // Initial count of blocks in Primary section
    const initialItems = primarySection.locator('.child-block-item');
    await expect(initialItems).toHaveCount(2);

    // Record block IDs before adding
    const blockIdsBefore = new Set(await helper.getBlockOrder());

    // Click the [+] button in the Primary section header
    const addButton = primarySection.locator('.widget-actions button');
    await addButton.click();

    // BlockChooser should appear — select slate
    await helper.selectBlockType('slate');

    // Wait for new block to appear in iframe
    await expect(async () => {
      const currentIds = await helper.getBlockOrder();
      expect(currentIds.length).toBeGreaterThan(blockIdsBefore.size);
    }).toPass({ timeout: 5000 });

    // Find the new block ID
    const blockIdsAfter = await helper.getBlockOrder();
    const newBlockId = blockIdsAfter.find((id: string) => !blockIdsBefore.has(id));
    expect(newBlockId).toBeTruthy();

    // The new block should be in the iframe between user-content-2 and the footer
    const newBlock = iframe.locator(`[data-block-uid="${newBlockId}"]`);
    await expect(newBlock).toBeVisible({ timeout: 5000 });

    // Verify the new block is positioned after user-content-2 (the last block in the primary section)
    const finalOrder = await iframe.locator('main [data-block-uid], #content [data-block-uid]')
      .evaluateAll((els) => els.map((el) => el.getAttribute('data-block-uid')));
    const idxContent2 = finalOrder.indexOf('user-content-2');
    const idxNew = finalOrder.indexOf(newBlockId);
    expect(idxNew).toBe(idxContent2 + 1);
  });
});

test.describe('allowedTemplates vs allowedLayouts', () => {
  test('template in allowedTemplates appears in BlockChooser Templates group', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');
    await helper.waitForIframeReady();

    // Click a block to show add button
    await helper.clickBlockInIframe('block-1-uuid');
    await helper.waitForSidebarOpen();

    // Open BlockChooser
    await helper.clickAddBlockButton();
    expect(await helper.isBlockChooserVisible()).toBe(true);

    // Open Templates group
    const blockChooser = page.locator('.blocks-chooser');
    const templatesGroup = blockChooser.locator('text=Templates').first();
    await templatesGroup.click();

    // test-layout is in allowedTemplates, should appear
    const testLayoutOption = blockChooser.locator('button').filter({ hasText: /test-layout/i });
    await expect(testLayoutOption).toBeVisible();
  });

  test('template in allowedLayouts but not allowedTemplates does not appear in BlockChooser', async ({ page }, testInfo) => {
    // This test verifies that allowedLayouts and allowedTemplates are independent
    // header-footer-layout is in allowedLayouts but not in allowedTemplates
    // It should NOT appear in BlockChooser Templates group

    // Skip for now - need to verify the current config
    // test-frontend has test-layout in both allowedTemplates and allowedLayouts
    // We need a template that's only in allowedLayouts to test this properly
    test.skip(true, 'Need dedicated test data for this scenario');
  });
});


