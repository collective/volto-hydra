/**
 * Integration tests for template edit mode.
 *
 * Template edit mode allows editing the template structure:
 * - Fixed/readonly blocks inside template become editable
 * - Blocks outside template become locked
 * - Fixed blocks can be moved (drag enabled)
 * - DnD out of template removes block from template
 * - DnD into template adds block to template
 * - Save validates template structure (no split placeholder groups)
 *
 * Note: Fixed template blocks get random UUIDs from template merge, so we find them by content.
 * User content blocks keep their original IDs from the page fixture.
 */
import { test, expect } from '../fixtures';
import { AdminUIHelper } from '../helpers/AdminUIHelper';

// Content strings to find fixed template blocks (they have random UUIDs after merge)
const TEMPLATE_HEADER_CONTENT = 'Template Header - From Template';
const TEMPLATE_FOOTER_CONTENT = 'Template Footer - From Template';

// User content blocks keep their IDs from the page fixture
const USER_CONTENT_1 = 'user-content-1';
const USER_CONTENT_2 = 'user-content-2';
const STANDALONE_BLOCK_1 = 'standalone-block-1';
const STANDALONE_BLOCK_2 = 'standalone-block-2';


test.describe('Template Creation', () => {
  test('"Make Template" option appears in toolbar menu for regular blocks', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    // Click a regular block (not part of a template)
    await helper.clickBlockInIframe('block-1-uuid');
    await helper.waitForQuantaToolbar('block-1-uuid');

    // Open toolbar menu
    await helper.openQuantaToolbarMenu('block-1-uuid');
    const menuOptions = await helper.getQuantaToolbarMenuOptions('block-1-uuid');
    const optionLabels = menuOptions.map(o => o.toLowerCase());

    // Should have "Make Template" option
    expect(optionLabels.some(o => o.includes('make') && o.includes('template'))).toBe(true);
  });

  test('"Make Template" does NOT appear for blocks already in a template', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/template-test-page');

    // Click template header block (merged from template, has random UUID)
    // Content is "Template Header - From Template" after merge replaces stale content
    const headerBlockId = await helper.clickBlockByContent('Template Header - From Template');
    await helper.waitForQuantaToolbar(headerBlockId);

    // Open toolbar menu
    await helper.openQuantaToolbarMenu(headerBlockId);
    const menuOptions = await helper.getQuantaToolbarMenuOptions(headerBlockId);
    const optionLabels = menuOptions.map(o => o.toLowerCase());

    // Should NOT have "Make Template" option for blocks already in a template
    expect(optionLabels.some(o => o.includes('make') && o.includes('template'))).toBe(false);
  });

  test('clicking "Make Template" wraps block in template instance and shows settings', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    // Click a regular block
    await helper.clickBlockInIframe('block-1-uuid');
    await helper.waitForQuantaToolbar('block-1-uuid');

    // Open toolbar menu and click "Make Template"
    await helper.openQuantaToolbarMenu('block-1-uuid');
    const makeTemplateOption = page.locator('.volto-hydra-dropdown-menu .volto-hydra-dropdown-item')
      .filter({ hasText: /make.*template/i });
    await makeTemplateOption.click();

    // Wait for sidebar to update
    await helper.waitForSidebarOpen();

    // Block should now be inside a template instance
    // Sidebar should show hierarchy: Page > Template Instance > Block
    const stickyHeaders = page.locator('.sidebar-section-header.sticky-header');
    await expect(stickyHeaders).toHaveCount(3, { timeout: 5000 }); // Page > Template > Block
    await expect(stickyHeaders.nth(1)).toContainText(/Template:/i);

    // Should have a name/title field for the template visible in sidebar
    const nameField = page.locator('.field-wrapper-title, .field').filter({ hasText: /Template Name/i });
    await expect(nameField).toBeVisible({ timeout: 5000 });

    // Should also have save location field
    const locationField = page.locator('.field-wrapper-folder, .field').filter({ hasText: /Save Location/i });
    await expect(locationField).toBeVisible({ timeout: 5000 });
  });

  test.skip('template edit mode is automatically activated when creating template', async ({ page }) => {
    // Skipped: auto-activation feature not yet implemented
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    // Click a regular block and make it a template
    await helper.clickBlockInIframe('block-1-uuid');
    await helper.waitForQuantaToolbar('block-1-uuid');
    await helper.openQuantaToolbarMenu('block-1-uuid');
    const makeTemplateOption = page.locator('.volto-hydra-dropdown-menu .volto-hydra-dropdown-item')
      .filter({ hasText: /make.*template/i });
    await makeTemplateOption.click();

    // Template edit mode should be active (indicated by toggle in sidebar)
    await helper.waitForSidebarOpen();
    const editModeToggle = page.locator('.edit-template-toggle input, [data-field-id="editTemplate"] input');
    await expect(editModeToggle).toBeChecked({ timeout: 5000 });
  });

  test('can toggle template edit mode from sidebar', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/template-test-page');

    // Find template block IDs (fixed blocks have random UUIDs, user content keeps original IDs)
    const { blockId: headerBlockId } = await helper.waitForBlockByContent(TEMPLATE_HEADER_CONTENT);
    const { blockId: footerBlockId } = await helper.waitForBlockByContent(TEMPLATE_FOOTER_CONTENT);
    const templateBlockIds = [headerBlockId, USER_CONTENT_1, USER_CONTENT_2, footerBlockId];

    // Click template block
    await helper.clickBlockInIframe(headerBlockId);
    await helper.waitForSidebarOpen();

    // Navigate up to template instance
    await page.keyboard.press('Escape');
    await helper.waitForQuantaToolbar(templateBlockIds);

    // Sidebar should have "Edit Template" toggle
    const editTemplateToggle = page.locator('.edit-template-toggle, [data-field-id="editTemplate"] input, label').filter({ hasText: /edit.*template/i });
    await expect(editTemplateToggle).toBeVisible();

    // Toggle edit mode on
    await editTemplateToggle.click();

    // Edit mode should be active - blocks outside template should be locked (greyed out)
    await helper.waitForBlockReadonly(STANDALONE_BLOCK_1);
  });
});

test.describe('Template Edit Mode - Editability', () => {
  test('fixed readonly blocks inside template become editable in edit mode', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/template-test-page');

    const iframe = helper.getIframe();

    // Find template block by content (fixed blocks have random UUIDs after merge)
    const { blockId: headerBlockId, locator: headerBlock } = await helper.waitForBlockByContent(TEMPLATE_HEADER_CONTENT);
    const { blockId: footerBlockId } = await helper.waitForBlockByContent(TEMPLATE_FOOTER_CONTENT);
    const templateBlockIds = [headerBlockId, USER_CONTENT_1, USER_CONTENT_2, footerBlockId];

    // Initially, the fixed template block should NOT be editable
    const editor = helper.getSlateField(headerBlock);
    let isEditable = await editor.getAttribute('contenteditable');
    expect(isEditable).not.toBe('true');

    // Enter template edit mode via sidebar
    await helper.clickBlockInIframe(headerBlockId);
    await helper.waitForSidebarOpen();

    // Navigate to template instance
    await page.keyboard.press('Escape');
    await helper.waitForQuantaToolbar(templateBlockIds);

    // Toggle edit mode on
    const editToggle = page.locator('.field-wrapper-editTemplate label[for="field-editTemplate"]');
    await editToggle.click();
    // Wait for edit mode to activate (blocks outside template get locked)
    await helper.waitForBlockReadonly(STANDALONE_BLOCK_1);

    // Click the fixed block again
    await helper.clickBlockInIframe(headerBlockId);
    await helper.waitForQuantaToolbar(headerBlockId);

    // Now the fixed block should be editable
    isEditable = await editor.getAttribute('contenteditable');
    expect(isEditable).toBe('true');
  });

  test('blocks outside template become locked in edit mode', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/template-test-page');

    const iframe = helper.getIframe();

    // Find template block by content and wait for standalone block
    const { blockId: headerBlockId } = await helper.waitForBlockByContent(TEMPLATE_HEADER_CONTENT);
    await expect(iframe.locator(`[data-block-uid="${STANDALONE_BLOCK_1}"]`)).toBeVisible();

    // Initially, standalone block should be editable
    await helper.clickBlockInIframe(STANDALONE_BLOCK_1);
    await helper.waitForQuantaToolbar(STANDALONE_BLOCK_1);
    const standaloneEditor = helper.getSlateField(iframe.locator(`[data-block-uid="${STANDALONE_BLOCK_1}"]`));
    let isEditable = await standaloneEditor.getAttribute('contenteditable');
    expect(isEditable).toBe('true');

    // Enter template edit mode
    const { blockId: footerBlockId } = await helper.waitForBlockByContent(TEMPLATE_FOOTER_CONTENT);
    const templateBlockIds = [headerBlockId, USER_CONTENT_1, USER_CONTENT_2, footerBlockId];
    await helper.clickBlockInIframe(headerBlockId);
    await helper.waitForSidebarOpen();
    await page.keyboard.press('Escape');
    await helper.waitForQuantaToolbar(templateBlockIds);

    const editToggle = page.locator('.field-wrapper-editTemplate label[for="field-editTemplate"]');
    await editToggle.click();
    // Wait for edit mode to activate (blocks outside template get locked)
    await helper.waitForBlockReadonly(STANDALONE_BLOCK_1);

    // Click standalone block (outside template)
    await helper.clickBlockInIframe(STANDALONE_BLOCK_1);

    // Standalone block should now be locked (not editable)
    isEditable = await standaloneEditor.getAttribute('contenteditable');
    expect(isEditable).not.toBe('true');
  });

  test('exiting edit mode re-locks fixed blocks and unlocks outside blocks', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/template-test-page');

    const iframe = helper.getIframe();

    // Find template blocks by content
    const { blockId: headerBlockId, locator: headerLocator } = await helper.waitForBlockByContent(TEMPLATE_HEADER_CONTENT);
    const { blockId: footerBlockId } = await helper.waitForBlockByContent(TEMPLATE_FOOTER_CONTENT);
    const templateBlockIds = [headerBlockId, USER_CONTENT_1, USER_CONTENT_2, footerBlockId];

    // Enter template edit mode
    await helper.clickBlockInIframe(headerBlockId);
    await helper.waitForSidebarOpen();
    await page.keyboard.press('Escape');
    await helper.waitForQuantaToolbar(templateBlockIds);

    const editToggle = page.locator('.field-wrapper-editTemplate label[for="field-editTemplate"]');
    const editCheckbox = page.locator('#field-editTemplate');
    await editToggle.click();
    await expect(editCheckbox).toBeChecked();
    // Wait for edit mode to activate
    await helper.waitForBlockReadonly(STANDALONE_BLOCK_1);

    // Verify template block is editable
    await helper.clickBlockInIframe(headerBlockId);
    const templateEditor = helper.getSlateField(headerLocator);
    expect(await templateEditor.getAttribute('contenteditable')).toBe('true');

    // Exit edit mode
    await page.keyboard.press('Escape');
    await helper.waitForQuantaToolbar(templateBlockIds);
    await editToggle.click();
    await expect(editCheckbox).not.toBeChecked();
    // Wait for edit mode to deactivate
    await helper.waitForBlockEditable(STANDALONE_BLOCK_1);

    // Template block should be locked again
    await helper.clickBlockInIframe(headerBlockId);
    expect(await templateEditor.getAttribute('contenteditable')).not.toBe('true');

    // Standalone block should be editable again
    await helper.clickBlockInIframe(STANDALONE_BLOCK_1);
    const standaloneEditor = helper.getSlateField(iframe.locator(`[data-block-uid="${STANDALONE_BLOCK_1}"]`));
    expect(await standaloneEditor.getAttribute('contenteditable')).toBe('true');
  });
});

test.describe('Template Edit Mode - Drag and Drop', () => {
  test('fixed blocks can be dragged in edit mode', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/template-test-page');

    // Find template blocks by content
    const { blockId: headerBlockId } = await helper.waitForBlockByContent(TEMPLATE_HEADER_CONTENT);
    const { blockId: footerBlockId } = await helper.waitForBlockByContent(TEMPLATE_FOOTER_CONTENT);
    const templateBlockIds = [headerBlockId, USER_CONTENT_1, USER_CONTENT_2, footerBlockId];

    // Enter template edit mode
    await helper.clickBlockInIframe(headerBlockId);
    await helper.waitForSidebarOpen();
    await page.keyboard.press('Escape');
    await helper.waitForQuantaToolbar(templateBlockIds);

    const editToggle = page.locator('.field-wrapper-editTemplate label[for="field-editTemplate"]');
    await editToggle.click();
    // Wait for edit mode to activate
    await helper.waitForBlockReadonly(STANDALONE_BLOCK_1);

    // Select the fixed header block
    await helper.clickBlockInIframe(headerBlockId);
    await helper.waitForQuantaToolbar(headerBlockId);

    // In edit mode, fixed blocks should show drag handle (not lock icon)
    const toolbar = page.locator('.quanta-toolbar');
    const dragHandle = toolbar.locator('.drag-handle, [title*="drag"], [aria-label*="drag"]');
    await expect(dragHandle).toBeVisible();

    // Lock icon should NOT be visible
    const lockIcon = toolbar.locator('.lock-icon, [title*="lock"], [aria-label*="locked"]');
    await expect(lockIcon).not.toBeVisible();
  });

  test('dragging block out of template removes template fields', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/template-test-page');

    const iframe = helper.getIframe();

    // Find template blocks by content
    const { blockId: headerBlockId } = await helper.waitForBlockByContent(TEMPLATE_HEADER_CONTENT);
    const { blockId: footerBlockId } = await helper.waitForBlockByContent(TEMPLATE_FOOTER_CONTENT);
    const templateBlockIds = [headerBlockId, USER_CONTENT_1, USER_CONTENT_2, footerBlockId];

    // Enter template edit mode
    await expect(iframe.locator(`[data-block-uid="${USER_CONTENT_1}"]`)).toBeVisible({ timeout: 15000 });
    await helper.clickBlockInIframe(headerBlockId);
    await helper.waitForSidebarOpen();
    await page.keyboard.press('Escape');
    await helper.waitForQuantaToolbar(templateBlockIds);

    const editToggle = page.locator('.field-wrapper-editTemplate label[for="field-editTemplate"]');
    await editToggle.click();
    await helper.waitForBlockReadonly(STANDALONE_BLOCK_1);

    // Verify user-content-1 is inside template (shows placeholder field in sidebar)
    await helper.clickBlockInIframe(USER_CONTENT_1);
    await helper.waitForSidebarOpen();
    const placeholderFieldBefore = page.locator('.field-wrapper-placeholder input');
    await expect(placeholderFieldBefore).toBeVisible({ timeout: 5000 });

    // Drag user-content-1 outside the template (after standalone-block-1)
    await helper.dragBlockAfter(USER_CONTENT_1, STANDALONE_BLOCK_1);

    // Verify block moved - it should now be after standalone-block-1 (position 1 in DOM)
    const allBlocks = await iframe.locator('main [data-block-uid], #content [data-block-uid]').all();
    const blockIds = await Promise.all(allBlocks.map(b => b.getAttribute('data-block-uid')));
    const movedIndex = blockIds.indexOf(USER_CONTENT_1);
    const standaloneIndex = blockIds.indexOf(STANDALONE_BLOCK_1);
    expect(movedIndex).toBe(standaloneIndex + 1);

    // Verify block is now OUTSIDE template - it should be readonly in template edit mode
    // (blocks outside the template being edited are greyed out)
    await helper.waitForBlockReadonly(USER_CONTENT_1);

    // Exit template edit mode - click header to access the edit toggle
    await helper.clickBlockInIframe(headerBlockId);
    await helper.waitForSidebarOpen();
    await editToggle.uncheck();
    await helper.waitForBlockEditable(STANDALONE_BLOCK_1);

    // Select the moved block - it should be editable now (template edit mode is off)
    await helper.clickBlockInIframe(USER_CONTENT_1);
    await helper.waitForSidebarOpen();

    // Block should be editable (not readonly)
    const editor = helper.getSlateField(iframe.locator(`[data-block-uid="${USER_CONTENT_1}"]`));
    const isEditable = await editor.getAttribute('contenteditable');
    expect(isEditable).toBe('true');

    // Placeholder field should NOT be visible (block is no longer in template)
    const placeholderFieldAfter = page.locator('.field-wrapper-placeholder input');
    await expect(placeholderFieldAfter).not.toBeVisible();
  });

  test('moving placeholder before first fixed block keeps it in template', async ({ page }) => {
    // Placeholders at template edges must be allowed - needed for layout switching
    // where content needs to be tracked even at edges
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/template-test-page');

    const iframe = helper.getIframe();

    // Find template blocks by content
    const { blockId: headerBlockId } = await helper.waitForBlockByContent(TEMPLATE_HEADER_CONTENT);
    const { blockId: footerBlockId } = await helper.waitForBlockByContent(TEMPLATE_FOOTER_CONTENT);
    const templateBlockIds = [headerBlockId, USER_CONTENT_1, USER_CONTENT_2, footerBlockId];

    // Enter template edit mode
    await expect(iframe.locator(`[data-block-uid="${USER_CONTENT_1}"]`)).toBeVisible({ timeout: 15000 });
    await helper.clickBlockInIframe(headerBlockId);
    await helper.waitForSidebarOpen();
    await page.keyboard.press('Escape');
    await helper.waitForQuantaToolbar(templateBlockIds);

    const editToggle = page.locator('.field-wrapper-editTemplate label[for="field-editTemplate"]');
    await editToggle.click();
    await helper.waitForBlockReadonly(STANDALONE_BLOCK_1);

    // Move user-content-1 BEFORE the first fixed block (header)
    // This puts a placeholder at the template edge
    await helper.clickBlockInIframe(USER_CONTENT_1);
    await helper.waitForSidebarOpen();
    const placeholderFieldBefore = page.locator('.field-wrapper-placeholder input');
    await expect(placeholderFieldBefore).toBeVisible({ timeout: 5000 });

    await helper.dragBlockBefore(USER_CONTENT_1, headerBlockId);

    // Verify block moved - it should now be before header
    const allBlocks = await iframe.locator('main [data-block-uid], #content [data-block-uid]').all();
    const blockIds = await Promise.all(allBlocks.map(b => b.getAttribute('data-block-uid')));
    const movedIndex = blockIds.indexOf(USER_CONTENT_1);
    const headerIndex = blockIds.indexOf(headerBlockId);
    expect(movedIndex).toBeLessThan(headerIndex);

    // Verify block is still IN the template - it should still be editable in template edit mode
    // (blocks outside the template are readonly in edit mode)
    await helper.clickBlockInIframe(USER_CONTENT_1);
    await helper.waitForSidebarOpen();

    // Placeholder field should still be visible (block is still in template)
    const placeholderFieldAfter = page.locator('.field-wrapper-placeholder input');
    await expect(placeholderFieldAfter).toBeVisible({ timeout: 5000 });

    // Block should be editable (not readonly, since it's in the template being edited)
    const editor = helper.getSlateField(iframe.locator(`[data-block-uid="${USER_CONTENT_1}"]`));
    const isEditable = await editor.getAttribute('contenteditable');
    expect(isEditable).toBe('true');
  });

  test('dragging block into template adds template fields', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/template-test-page');

    const iframe = helper.getIframe();

    // Find template blocks by content
    const { blockId: headerBlockId } = await helper.waitForBlockByContent(TEMPLATE_HEADER_CONTENT);
    const { blockId: footerBlockId } = await helper.waitForBlockByContent(TEMPLATE_FOOTER_CONTENT);
    const templateBlockIds = [headerBlockId, USER_CONTENT_1, USER_CONTENT_2, footerBlockId];

    // Enter template edit mode
    await expect(iframe.locator(`[data-block-uid="${STANDALONE_BLOCK_1}"]`)).toBeVisible({ timeout: 15000 });
    await helper.clickBlockInIframe(headerBlockId);
    await helper.waitForSidebarOpen();
    await page.keyboard.press('Escape');
    await helper.waitForQuantaToolbar(templateBlockIds);

    const editToggle = page.locator('.field-wrapper-editTemplate label[for="field-editTemplate"]');
    await editToggle.click();
    await helper.waitForBlockReadonly(STANDALONE_BLOCK_1);

    // Verify standalone-block-1 is NOT in template (no placeholder field)
    // First exit template edit mode to check
    await helper.clickBlockInIframe(STANDALONE_BLOCK_1);
    await helper.waitForSidebarOpen();
    // Outside template blocks are locked in template edit mode, so no placeholder field
    const placeholderFieldBefore = page.locator('.field-wrapper-placeholder input');
    await expect(placeholderFieldBefore).not.toBeVisible();

    // Drag standalone-block-1 into the template (between placeholder blocks)
    await helper.dragBlockAfter(STANDALONE_BLOCK_1, USER_CONTENT_1);

    // Select the moved block
    await helper.clickBlockInIframe(STANDALONE_BLOCK_1);
    await helper.waitForSidebarOpen();

    // Block should now show placeholder field (it's now in template)
    const placeholderFieldAfter = page.locator('.field-wrapper-placeholder input');
    await expect(placeholderFieldAfter).toBeVisible({ timeout: 5000 });

    // Block should be editable (since we're in template edit mode)
    const editor = helper.getSlateField(iframe.locator(`[data-block-uid="${STANDALONE_BLOCK_1}"]`));
    const isEditable = await editor.getAttribute('contenteditable');
    expect(isEditable).toBe('true');
  });

  test('block dragged into template inherits placeholder from neighbors', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/template-test-page');

    const iframe = helper.getIframe();

    // Find template blocks by content
    const { blockId: headerBlockId } = await helper.waitForBlockByContent(TEMPLATE_HEADER_CONTENT);
    const { blockId: footerBlockId } = await helper.waitForBlockByContent(TEMPLATE_FOOTER_CONTENT);
    const templateBlockIds = [headerBlockId, USER_CONTENT_1, USER_CONTENT_2, footerBlockId];

    // Enter template edit mode
    await expect(iframe.locator(`[data-block-uid="${STANDALONE_BLOCK_1}"]`)).toBeVisible({ timeout: 15000 });
    await helper.clickBlockInIframe(headerBlockId);
    await helper.waitForSidebarOpen();
    await page.keyboard.press('Escape');
    await helper.waitForQuantaToolbar(templateBlockIds);

    const editToggle = page.locator('.field-wrapper-editTemplate label[for="field-editTemplate"]');
    await editToggle.click();
    await helper.waitForBlockReadonly(STANDALONE_BLOCK_1);

    // First check what placeholder value user-content-1 has (should be "primary")
    await helper.clickBlockInIframe(USER_CONTENT_1);
    await helper.waitForSidebarOpen();
    const neighborPlaceholder = page.locator('.field-wrapper-placeholder input');
    const expectedPlaceholder = await neighborPlaceholder.inputValue();
    expect(expectedPlaceholder).toBe('primary');

    // Drag standalone block into template (between user-content-1 and user-content-2)
    await helper.dragBlockAfter(STANDALONE_BLOCK_1, USER_CONTENT_1);

    // Select the newly added block
    await helper.clickBlockInIframe(STANDALONE_BLOCK_1);
    await helper.waitForSidebarOpen();

    // Should show placeholder field with inherited value from neighbors
    const placeholderInput = page.locator('.field-wrapper-placeholder input');
    await expect(placeholderInput).toBeVisible({ timeout: 5000 });

    // The placeholder should match the neighbors (all are "primary" in this region)
    const actualPlaceholder = await placeholderInput.inputValue();
    expect(actualPlaceholder).toBe(expectedPlaceholder);
  });
});

test.describe('Template Edit Mode - Validation', () => {
  test('non-contiguous placeholder groups prevent exit from edit mode', async ({ page }) => {
    // Rule: All blocks with the same placeholder must be adjacent.
    // Having two separate groups with the same name is invalid.
    //
    // Valid:   [header] [content] [content] [footer]
    // Invalid: [header] [content] [footer] [content]  <- "content" is split

    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/template-test-page');

    const iframe = helper.getIframe();

    // Find template blocks by content
    const { blockId: headerBlockId } = await helper.waitForBlockByContent(TEMPLATE_HEADER_CONTENT);
    const { blockId: footerBlockId } = await helper.waitForBlockByContent(TEMPLATE_FOOTER_CONTENT);
    const templateBlockIds = [headerBlockId, USER_CONTENT_1, USER_CONTENT_2, footerBlockId];

    // Enter template edit mode
    await expect(iframe.locator(`[data-block-uid="${USER_CONTENT_1}"]`)).toBeVisible({ timeout: 15000 });
    await helper.clickBlockInIframe(headerBlockId);
    await helper.waitForSidebarOpen();
    await page.keyboard.press('Escape');
    await helper.waitForQuantaToolbar(templateBlockIds);

    const editToggle = page.locator('.field-wrapper-editTemplate label[for="field-editTemplate"]');
    await editToggle.click();
    await helper.waitForBlockReadonly(STANDALONE_BLOCK_1);

    // Create invalid structure: move user-content-2 after footer
    // This splits the "primary" placeholder group:
    // Before: [header] [content-1] [content-2] [footer]  <- valid, "primary" blocks adjacent
    // After:  [header] [content-1] [footer] [content-2]  <- invalid, "primary" blocks separated
    await helper.dragBlockAfter(USER_CONTENT_2, footerBlockId);

    // Try to exit edit mode - should fail validation
    await page.keyboard.press('Escape');
    await helper.waitForQuantaToolbar(templateBlockIds);

    // Click the label to try to exit (validation should prevent state change)
    await editToggle.click();

    // Should show validation error about non-contiguous placeholders (prevents exit)
    const errorMessage = page.locator('.toast-error, .Toastify__toast--error').filter({ hasText: /placeholder|contiguous|adjacent|position/i });
    await expect(errorMessage).toBeVisible({ timeout: 5000 });

    // Verify we're still in edit mode (checkbox should still be checked)
    const checkbox = page.locator('.field-wrapper-editTemplate input[type="checkbox"]');
    await expect(checkbox).toBeChecked();
    // Verify standalone block is still readonly (template edit mode still active)
    await helper.waitForBlockReadonly(STANDALONE_BLOCK_1);
  });

  test('adjacent placeholder groups without fixed block prevent exit from edit mode', async ({ page }) => {
    // Rule: Different placeholder groups must be separated by a fixed block.
    // Having two different placeholder groups adjacent is invalid.
    //
    // Valid:   [header-fixed] [primary] [primary] [footer-fixed]
    // Invalid: [header-fixed] [primary] [secondary] [footer-fixed]  <- no fixed block between groups

    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/template-test-page');

    const iframe = helper.getIframe();

    // Find template blocks by content
    const { blockId: headerBlockId } = await helper.waitForBlockByContent(TEMPLATE_HEADER_CONTENT);
    const { blockId: footerBlockId } = await helper.waitForBlockByContent(TEMPLATE_FOOTER_CONTENT);
    const templateBlockIds = [headerBlockId, USER_CONTENT_1, USER_CONTENT_2, footerBlockId];

    // Enter template edit mode
    await expect(iframe.locator(`[data-block-uid="${USER_CONTENT_1}"]`)).toBeVisible({ timeout: 15000 });
    await helper.clickBlockInIframe(headerBlockId);
    await helper.waitForSidebarOpen();
    await page.keyboard.press('Escape');
    await helper.waitForQuantaToolbar(templateBlockIds);

    const editToggle = page.locator('.field-wrapper-editTemplate label[for="field-editTemplate"]');
    await editToggle.click();
    await helper.waitForBlockReadonly(STANDALONE_BLOCK_1);

    // Select user-content-2 and change its placeholder to create a different group
    await helper.clickBlockInIframe(USER_CONTENT_2);
    await helper.waitForSidebarOpen();

    // Change placeholder in sidebar from "primary" to "secondary"
    const placeholderField = page.locator('.field-wrapper-placeholder input');
    await placeholderField.fill('secondary');

    // Try to exit edit mode - should fail validation
    await page.keyboard.press('Escape');
    await helper.waitForQuantaToolbar(templateBlockIds);

    // Click the label to try to exit (validation should prevent state change)
    await editToggle.click();

    // Should show validation error about adjacent placeholder groups needing fixed block (prevents exit)
    const errorMessage = page.locator('.toast-error, .Toastify__toast--error').filter({ hasText: /placeholder|fixed|separated/i });
    await expect(errorMessage).toBeVisible({ timeout: 5000 });

    // Verify we're still in edit mode (checkbox should still be checked)
    const checkbox = page.locator('.field-wrapper-editTemplate input[type="checkbox"]');
    await expect(checkbox).toBeChecked();
    // Verify standalone block is still readonly (template edit mode still active)
    await helper.waitForBlockReadonly(STANDALONE_BLOCK_1);
  });

  test('saved template changes persist and appear on other pages using the template', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/template-test-page');

    const iframe = helper.getIframe();

    // Find template blocks by content
    const { blockId: headerBlockId, locator: headerLocator } = await helper.waitForBlockByContent(TEMPLATE_HEADER_CONTENT);
    const { blockId: footerBlockId } = await helper.waitForBlockByContent(TEMPLATE_FOOTER_CONTENT);
    const templateBlockIds = [headerBlockId, USER_CONTENT_1, USER_CONTENT_2, footerBlockId];

    // Enter template edit mode
    await helper.clickBlockInIframe(headerBlockId);
    await helper.waitForSidebarOpen();
    await page.keyboard.press('Escape');
    await helper.waitForQuantaToolbar(templateBlockIds);

    const editToggle = page.locator('.field-wrapper-editTemplate label[for="field-editTemplate"]');
    await editToggle.click();
    await helper.waitForBlockReadonly(STANDALONE_BLOCK_1);

    // Make a valid change - edit template header content
    await helper.clickBlockInIframe(headerBlockId);
    const editor = helper.getSlateField(headerLocator);
    // Wait for contenteditable to be set (template edit mode makes fixed blocks editable)
    await expect(editor).toHaveAttribute('contenteditable', 'true', { timeout: 5000 });
    await editor.click();
    // Wait for element to be focused before typing
    await expect(editor).toBeFocused({ timeout: 2000 });
    await page.keyboard.press('End');
    await page.keyboard.type(' - edited');
    // Wait for text to appear - use fresh locator since text changed (stale locator won't match)
    const headerBlock = iframe.locator(`[data-block-uid="${headerBlockId}"]`);
    await expect(headerBlock).toContainText('edited', { timeout: 5000 });

    // Exit edit mode
    await page.keyboard.press('Escape');
    await helper.waitForQuantaToolbar(templateBlockIds);
    // Click to exit template edit mode - waits for async flush before toggling
    await editToggle.click();
    const checkbox = page.locator('.field-wrapper-editTemplate input[type="checkbox"]');
    await expect(checkbox).not.toBeChecked({ timeout: 5000 });
    await helper.waitForBlockEditable(STANDALONE_BLOCK_1);

    // Save should succeed - wait for pencil icon (view mode) indicating save completed
    await page.keyboard.press('Control+s');
    const pencilIcon = page.locator('.toolbar-actions .edit, [aria-label="Edit"]');
    await expect(pencilIcon).toBeVisible({ timeout: 10000 });

    // Should NOT show validation error
    const errorMessage = page.locator('.toast-error, .validation-error, [role="alert"]').filter({ hasText: /placeholder|split|contiguous/i });
    await expect(errorMessage).not.toBeVisible();

    // Wait for iframe to refresh with new content (block count stabilizes after Nuxt re-renders)
    await helper.getStableBlockCount();

    // Content should be preserved in view mode - find by content since text and ID both changed
    const editedHeader = iframe.locator('main [data-block-uid], #content [data-block-uid]').filter({ hasText: 'edited' }).first();
    await expect(editedHeader).toBeVisible({ timeout: 15000 });

    // Verify template was actually saved by loading another page using the same template
    // Navigate to view mode (not edit) to also test that view mode loads templates
    await helper.navigateToView('/template-test-page-2');
    // Find header by content on page 2 as well
    const { locator: page2Header } = await helper.waitForBlockByContent('edited');
    await expect(page2Header).toContainText('edited', { timeout: 15000 });
  });
});

test.describe('Template Edit Mode - Block Settings', () => {
  test('can change block placeholder in edit mode', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/template-test-page');

    const iframe = helper.getIframe();

    // Find template blocks by content
    const { blockId: headerBlockId } = await helper.waitForBlockByContent(TEMPLATE_HEADER_CONTENT);
    const { blockId: footerBlockId } = await helper.waitForBlockByContent(TEMPLATE_FOOTER_CONTENT);
    const templateBlockIds = [headerBlockId, USER_CONTENT_1, USER_CONTENT_2, footerBlockId];

    // Enter template edit mode
    await expect(iframe.locator(`[data-block-uid="${USER_CONTENT_1}"]`)).toBeVisible({ timeout: 15000 });
    await helper.clickBlockInIframe(headerBlockId);
    await helper.waitForSidebarOpen();
    await page.keyboard.press('Escape');
    await helper.waitForQuantaToolbar(templateBlockIds);

    const editToggle = page.locator('.field-wrapper-editTemplate label[for="field-editTemplate"]');
    await editToggle.click();
    await helper.waitForBlockReadonly(STANDALONE_BLOCK_1);

    // Select a placeholder block
    await helper.clickBlockInIframe(USER_CONTENT_1);
    await helper.waitForSidebarOpen();

    // placeholder input should be visible and have initial value from block data
    const placeholderInput = page.locator('.field-wrapper-placeholder input');
    await expect(placeholderInput).toHaveValue('primary', { timeout: 5000 });
    // Now clear and fill with new value
    await placeholderInput.clear();
    await placeholderInput.fill('new-slot-name');
    await expect(placeholderInput).toHaveValue('new-slot-name');
  });

  test('can toggle block fixed mode in edit mode', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/template-test-page');

    const iframe = helper.getIframe();

    // Find template blocks by content
    const { blockId: headerBlockId } = await helper.waitForBlockByContent(TEMPLATE_HEADER_CONTENT);
    const { blockId: footerBlockId } = await helper.waitForBlockByContent(TEMPLATE_FOOTER_CONTENT);
    const templateBlockIds = [headerBlockId, USER_CONTENT_1, USER_CONTENT_2, footerBlockId];

    // Enter template edit mode
    await expect(iframe.locator(`[data-block-uid="${USER_CONTENT_1}"]`)).toBeVisible({ timeout: 15000 });
    await helper.clickBlockInIframe(headerBlockId);
    await helper.waitForSidebarOpen();
    await page.keyboard.press('Escape');
    await helper.waitForQuantaToolbar(templateBlockIds);

    const editToggle = page.locator('.field-wrapper-editTemplate label[for="field-editTemplate"]');
    await editToggle.click();
    await helper.waitForBlockReadonly(STANDALONE_BLOCK_1);

    // Select a placeholder block (not fixed)
    await helper.clickBlockInIframe(USER_CONTENT_1);
    await helper.waitForSidebarOpen();

    // Scroll sidebar to make Template Settings visible
    const sidebar = page.locator('#sidebar-template-settings');
    await sidebar.scrollIntoViewIfNeeded();

    // Fixed checkbox should be visible and toggleable
    const fixedLabel = page.locator('.field-wrapper-fixed label[for="field-fixed"]');
    const fixedCheckbox = page.locator('.field-wrapper-fixed input[type="checkbox"]');
    await expect(fixedLabel).toBeVisible({ timeout: 5000 });

    const wasChecked = await fixedCheckbox.isChecked();
    await fixedLabel.click();

    // Verify checkbox state changed
    if (wasChecked) {
      await expect(fixedCheckbox).not.toBeChecked({ timeout: 5000 });
    } else {
      await expect(fixedCheckbox).toBeChecked({ timeout: 5000 });
    }
  });
});

test.describe('Template Edit Mode - UI Restrictions', () => {
  test('readonly blocks should not show format buttons in toolbar', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/template-test-page');

    // Find template header by content (has random UUID after merge)
    const headerBlockId = await helper.clickBlockByContent(TEMPLATE_HEADER_CONTENT);
    await helper.waitForQuantaToolbar(headerBlockId);

    // Format buttons (bold, italic, etc.) should NOT be visible
    const toolbar = page.locator('.quanta-toolbar');
    const formatButtons = toolbar.locator('[data-toolbar-button]');
    await expect(formatButtons).toHaveCount(0);
  });

  test('readonly blocks should not show media field overlay', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/template-test-page');

    // Find template header by content (has random UUID after merge)
    const headerBlockId = await helper.clickBlockByContent(TEMPLATE_HEADER_CONTENT);
    await helper.waitForQuantaToolbar(headerBlockId);

    // Media overlay (X button to clear image) should NOT be visible
    const mediaOverlay = page.locator('.empty-image-overlay, button[title="Clear image"]');
    await expect(mediaOverlay).toHaveCount(0);
  });

  test('readonly blocks should not show link/media buttons in toolbar', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/template-test-page');

    // Find template header by content (has random UUID after merge)
    const headerBlockId = await helper.clickBlockByContent(TEMPLATE_HEADER_CONTENT);
    await helper.waitForQuantaToolbar(headerBlockId);

    // Link and media field buttons should NOT be visible
    const toolbar = page.locator('.quanta-toolbar');
    const linkButton = toolbar.locator('button[title*="link" i]');
    const mediaButton = toolbar.locator('button[title*="image" i]');
    await expect(linkButton).toHaveCount(0);
    await expect(mediaButton).toHaveCount(0);
  });

  test('fixed blocks should not show Remove option in dropdown menu', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/template-test-page');

    // Find template header by content (has random UUID after merge)
    const headerBlockId = await helper.clickBlockByContent(TEMPLATE_HEADER_CONTENT);
    await helper.waitForQuantaToolbar(headerBlockId);
    await helper.waitForSidebarOpen();

    // Open the dropdown menu (scroll to it first as it may be below the fold)
    const menuButton = page.locator('.parent-block-section .menu-trigger').last();
    await menuButton.scrollIntoViewIfNeeded();
    await menuButton.click();
    // Wait for menu to appear
    const menu = page.locator('.volto-hydra-dropdown-menu');
    await expect(menu).toBeVisible({ timeout: 5000 });

    // Remove option should NOT be visible
    const removeOption = menu.locator('.volto-hydra-dropdown-item').filter({ hasText: /Remove/i });
    await expect(removeOption).toHaveCount(0);
  });

  test('fixed blocks should not show Make Template option in dropdown menu', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/template-test-page');

    // Find template header by content (has random UUID after merge)
    const headerBlockId = await helper.clickBlockByContent(TEMPLATE_HEADER_CONTENT);
    await helper.waitForQuantaToolbar(headerBlockId);
    await helper.waitForSidebarOpen();

    // Open the dropdown menu (scroll to it first as it may be below the fold)
    const menuButton = page.locator('.parent-block-section .menu-trigger').last();
    await menuButton.scrollIntoViewIfNeeded();
    await menuButton.click();
    // Wait for menu to appear
    const menu = page.locator('.volto-hydra-dropdown-menu');
    await expect(menu).toBeVisible({ timeout: 5000 });

    // Make Template option should NOT be visible for fixed blocks
    const makeTemplateOption = menu.locator('.volto-hydra-dropdown-item').filter({ hasText: /Make Template/i });
    await expect(makeTemplateOption).toHaveCount(0);
  });

  test('readonly blocks should not show Convert to option in dropdown menu', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/template-test-page');

    // Find template header by content (has random UUID after merge)
    const headerBlockId = await helper.clickBlockByContent(TEMPLATE_HEADER_CONTENT);
    await helper.waitForQuantaToolbar(headerBlockId);
    await helper.waitForSidebarOpen();

    // Open the dropdown menu (scroll to it first as it may be below the fold)
    const menuButton = page.locator('.parent-block-section .menu-trigger').last();
    await menuButton.scrollIntoViewIfNeeded();
    await menuButton.click();
    // Wait for menu to appear
    const menu = page.locator('.volto-hydra-dropdown-menu');
    await expect(menu).toBeVisible({ timeout: 5000 });

    // Convert to option should NOT be visible for readonly blocks
    const convertOption = menu.locator('.volto-hydra-dropdown-item').filter({ hasText: /Convert to/i });
    await expect(convertOption).toHaveCount(0);
  });

  test('cannot add blocks outside template in template edit mode', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/template-test-page');

    // Find template blocks by content
    const { blockId: headerBlockId } = await helper.waitForBlockByContent(TEMPLATE_HEADER_CONTENT);
    const { blockId: footerBlockId } = await helper.waitForBlockByContent(TEMPLATE_FOOTER_CONTENT);
    const templateBlockIds = [headerBlockId, USER_CONTENT_1, USER_CONTENT_2, footerBlockId];

    // Enter template edit mode
    await helper.clickBlockInIframe(headerBlockId);
    await helper.waitForSidebarOpen();
    await page.keyboard.press('Escape');
    await helper.waitForQuantaToolbar(templateBlockIds);

    // Click the label instead of the hidden checkbox input
    const editToggleLabel = page.locator('label[for="field-editTemplate"]');
    await editToggleLabel.click();
    await helper.waitForBlockReadonly(STANDALONE_BLOCK_1);

    // Click a block outside the template
    await helper.clickBlockInIframe(STANDALONE_BLOCK_1);
    await helper.waitForQuantaToolbar(STANDALONE_BLOCK_1);

    // Add button should NOT be visible for blocks outside the template
    const addButton = page.locator('button[title*="Add block"]');
    await expect(addButton).toHaveCount(0);
  });
});
