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
 */
import { test, expect } from '../fixtures';
import { AdminUIHelper } from '../helpers/AdminUIHelper';

// Block IDs for the template instance in template-test-page
const TEMPLATE_BLOCK_IDS = ['template-header', 'template-grid', 'user-content-1', 'user-content-2', 'template-footer'];

test.describe('Template Edit Mode - Editability', () => {
  test('fixed readonly blocks inside template become editable in edit mode', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/template-test-page');

    const iframe = helper.getIframe();

    // Wait for template block (fixed + readonly)
    const headerBlock = iframe.locator('[data-block-uid="template-header"]');
    await expect(headerBlock).toContainText('Template Header', { timeout: 15000 });

    // Initially, the fixed template block should NOT be editable
    const editor = helper.getSlateField(headerBlock);
    let isEditable = await editor.getAttribute('contenteditable');
    expect(isEditable).not.toBe('true');

    // Enter template edit mode via sidebar
    await helper.clickBlockInIframe('template-header');
    await helper.waitForSidebarOpen();

    // Navigate to template instance
    await page.keyboard.press('Escape');
    const templateBlockIds = ['template-header', 'template-grid', 'user-content-1', 'user-content-2', 'template-footer'];
    await helper.waitForQuantaToolbar(templateBlockIds);

    // Toggle edit mode on
    const editToggle = page.locator('.field-wrapper-editTemplate label[for="field-editTemplate"]');
    await editToggle.click();
    // Wait for edit mode to activate (blocks outside template get locked)
    await helper.waitForBlockReadonly('standalone-block-1');

    // Click the fixed block again
    await helper.clickBlockInIframe('template-header');
    await helper.waitForQuantaToolbar('template-header');

    // Now the fixed block should be editable
    isEditable = await editor.getAttribute('contenteditable');
    expect(isEditable).toBe('true');
  });

  test('blocks outside template become locked in edit mode', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/template-test-page');

    const iframe = helper.getIframe();

    // Wait for both template and standalone blocks
    await expect(iframe.locator('[data-block-uid="template-header"]')).toBeVisible({ timeout: 15000 });
    await expect(iframe.locator('[data-block-uid="standalone-block-1"]')).toBeVisible();

    // Initially, standalone block should be editable
    await helper.clickBlockInIframe('standalone-block-1');
    await helper.waitForQuantaToolbar('standalone-block-1');
    const standaloneEditor = helper.getSlateField(iframe.locator('[data-block-uid="standalone-block-1"]'));
    let isEditable = await standaloneEditor.getAttribute('contenteditable');
    expect(isEditable).toBe('true');

    // Enter template edit mode
    await helper.clickBlockInIframe('template-header');
    await helper.waitForSidebarOpen();
    await page.keyboard.press('Escape');
    await helper.waitForQuantaToolbar(TEMPLATE_BLOCK_IDS);

    const editToggle = page.locator('.field-wrapper-editTemplate label[for="field-editTemplate"]');
    await editToggle.click();
    // Wait for edit mode to activate (blocks outside template get locked)
    await helper.waitForBlockReadonly('standalone-block-1');

    // Click standalone block (outside template)
    await helper.clickBlockInIframe('standalone-block-1');

    // Standalone block should now be locked (not editable)
    isEditable = await standaloneEditor.getAttribute('contenteditable');
    expect(isEditable).not.toBe('true');
  });

  test('exiting edit mode re-locks fixed blocks and unlocks outside blocks', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/template-test-page');

    const iframe = helper.getIframe();

    // Enter template edit mode
    await expect(iframe.locator('[data-block-uid="template-header"]')).toBeVisible({ timeout: 15000 });
    await helper.clickBlockInIframe('template-header');
    await helper.waitForSidebarOpen();
    await page.keyboard.press('Escape');
    await helper.waitForQuantaToolbar(TEMPLATE_BLOCK_IDS);

    const editToggle = page.locator('.field-wrapper-editTemplate label[for="field-editTemplate"]');
    await editToggle.click();
    // Wait for edit mode to activate
    await helper.waitForBlockReadonly('standalone-block-1');

    // Verify template block is editable
    await helper.clickBlockInIframe('template-header');
    const templateEditor = helper.getSlateField(iframe.locator('[data-block-uid="template-header"]'));
    expect(await templateEditor.getAttribute('contenteditable')).toBe('true');

    // Exit edit mode
    await page.keyboard.press('Escape');
    await helper.waitForQuantaToolbar(TEMPLATE_BLOCK_IDS);
    await editToggle.uncheck();
    // Wait for edit mode to deactivate
    await helper.waitForBlockEditable('standalone-block-1');

    // Template block should be locked again
    await helper.clickBlockInIframe('template-header');
    expect(await templateEditor.getAttribute('contenteditable')).not.toBe('true');

    // Standalone block should be editable again
    await helper.clickBlockInIframe('standalone-block-1');
    const standaloneEditor = helper.getSlateField(iframe.locator('[data-block-uid="standalone-block-1"]'));
    expect(await standaloneEditor.getAttribute('contenteditable')).toBe('true');
  });
});

test.describe('Template Edit Mode - Drag and Drop', () => {
  test('fixed blocks can be dragged in edit mode', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/template-test-page');

    const iframe = helper.getIframe();

    // Enter template edit mode
    await expect(iframe.locator('[data-block-uid="template-header"]')).toBeVisible({ timeout: 15000 });
    await helper.clickBlockInIframe('template-header');
    await helper.waitForSidebarOpen();
    await page.keyboard.press('Escape');
    await helper.waitForQuantaToolbar(TEMPLATE_BLOCK_IDS);

    const editToggle = page.locator('.field-wrapper-editTemplate label[for="field-editTemplate"]');
    await editToggle.click();
    // Wait for edit mode to activate
    await helper.waitForBlockReadonly('standalone-block-1');

    // Select the fixed header block
    await helper.clickBlockInIframe('template-header');
    await helper.waitForQuantaToolbar('template-header');

    // In edit mode, fixed blocks should show drag handle (not lock icon)
    const toolbar = page.locator('.quanta-toolbar');
    const dragHandle = toolbar.locator('.drag-handle, [title*="drag"], [aria-label*="drag"]');
    await expect(dragHandle).toBeVisible();

    // Lock icon should NOT be visible
    const lockIcon = toolbar.locator('.lock-icon, [title*="lock"], [aria-label*="locked"]');
    await expect(lockIcon).not.toBeVisible();
  });

  test('dragging block out of template removes _templateSource', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/template-test-page');

    const iframe = helper.getIframe();

    // Enter template edit mode
    await expect(iframe.locator('[data-block-uid="user-content-1"]')).toBeVisible({ timeout: 15000 });
    await helper.clickBlockInIframe('template-header');
    await helper.waitForSidebarOpen();
    await page.keyboard.press('Escape');
    await helper.waitForQuantaToolbar(TEMPLATE_BLOCK_IDS);

    const editToggle = page.locator('.field-wrapper-editTemplate label[for="field-editTemplate"]');
    await editToggle.click();
    await helper.waitForBlockReadonly('standalone-block-1');

    // Get initial block order - user-content-1 is inside template
    const templateInstanceId = await iframe.locator('[data-block-uid="user-content-1"]').evaluate(el => {
      // Check if block has _templateSource via data attribute or other means
      return el.closest('[data-template-instance]')?.getAttribute('data-template-instance');
    });
    expect(templateInstanceId).toBeTruthy();

    // Drag user-content-1 outside the template (after standalone-block-1)
    await helper.dragBlockAfter('user-content-1', 'standalone-block-1');

    // Block should no longer be part of template
    const newTemplateInstanceId = await iframe.locator('[data-block-uid="user-content-1"]').evaluate(el => {
      return el.closest('[data-template-instance]')?.getAttribute('data-template-instance');
    });
    expect(newTemplateInstanceId).toBeFalsy();
  });

  test('dragging block into template adds _templateSource', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/template-test-page');

    const iframe = helper.getIframe();

    // Enter template edit mode
    await expect(iframe.locator('[data-block-uid="standalone-block-1"]')).toBeVisible({ timeout: 15000 });
    await helper.clickBlockInIframe('template-header');
    await helper.waitForSidebarOpen();
    await page.keyboard.press('Escape');
    await helper.waitForQuantaToolbar(TEMPLATE_BLOCK_IDS);

    const editToggle = page.locator('.field-wrapper-editTemplate label[for="field-editTemplate"]');
    await editToggle.click();
    await helper.waitForBlockReadonly('standalone-block-1');

    // Verify standalone-block-1 is NOT in template
    const initialTemplateId = await iframe.locator('[data-block-uid="standalone-block-1"]').evaluate(el => {
      return el.closest('[data-template-instance]')?.getAttribute('data-template-instance');
    });
    expect(initialTemplateId).toBeFalsy();

    // Drag standalone-block-1 into the template (after template-header)
    await helper.dragBlockAfter('standalone-block-1', 'template-header');

    // Block should now be part of template
    const newTemplateId = await iframe.locator('[data-block-uid="standalone-block-1"]').evaluate(el => {
      return el.closest('[data-template-instance]')?.getAttribute('data-template-instance');
    });
    expect(newTemplateId).toBeTruthy();
  });

  test('block dragged into template gets default placeholderName', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/template-test-page');

    const iframe = helper.getIframe();

    // Enter template edit mode
    await expect(iframe.locator('[data-block-uid="standalone-block-1"]')).toBeVisible({ timeout: 15000 });
    await helper.clickBlockInIframe('template-header');
    await helper.waitForSidebarOpen();
    await page.keyboard.press('Escape');
    await helper.waitForQuantaToolbar(TEMPLATE_BLOCK_IDS);

    const editToggle = page.locator('.field-wrapper-editTemplate label[for="field-editTemplate"]');
    await editToggle.click();
    await helper.waitForBlockReadonly('standalone-block-1');

    // Drag standalone block into template
    await helper.dragBlockAfter('standalone-block-1', 'user-content-1');

    // Select the newly added block
    await helper.clickBlockInIframe('standalone-block-1');
    await helper.waitForSidebarOpen();

    // Should show placeholderName field in sidebar (in edit mode)
    const placeholderField = page.locator('.field-wrapper-placeholderName, .field').filter({ hasText: /placeholder/i });
    await expect(placeholderField).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Template Edit Mode - Validation', () => {
  test('non-contiguous placeholder groups prevent save', async ({ page }) => {
    // Rule: All blocks with the same placeholderName must be adjacent.
    // Having two separate groups with the same name is invalid.
    //
    // Valid:   [header] [content] [content] [footer]
    // Invalid: [header] [content] [footer] [content]  <- "content" is split

    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/template-test-page');

    const iframe = helper.getIframe();

    // Enter template edit mode
    await expect(iframe.locator('[data-block-uid="user-content-1"]')).toBeVisible({ timeout: 15000 });
    await helper.clickBlockInIframe('template-header');
    await helper.waitForSidebarOpen();
    await page.keyboard.press('Escape');
    await helper.waitForQuantaToolbar(TEMPLATE_BLOCK_IDS);

    const editToggle = page.locator('.field-wrapper-editTemplate label[for="field-editTemplate"]');
    await editToggle.click();
    await helper.waitForBlockReadonly('standalone-block-1');

    // Create invalid structure: move user-content-2 after template-footer
    // This splits the "primary" placeholder group:
    // Before: [header] [content-1] [content-2] [footer]  <- valid, "primary" blocks adjacent
    // After:  [header] [content-1] [footer] [content-2]  <- invalid, "primary" blocks separated
    await helper.dragBlockAfter('user-content-2', 'template-footer');

    // Exit edit mode
    await page.keyboard.press('Escape');
    await helper.waitForQuantaToolbar(TEMPLATE_BLOCK_IDS);
    await editToggle.uncheck();
    await helper.waitForBlockEditable('standalone-block-1');

    // Try to save
    await page.keyboard.press('Control+s');

    // Should show validation error about non-contiguous placeholders
    const errorMessage = page.locator('.toast-error, .validation-error, [role="alert"]').filter({ hasText: /placeholder|contiguous|adjacent/i });
    await expect(errorMessage).toBeVisible({ timeout: 5000 });
  });

  test('valid template structure allows save', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/template-test-page');

    const iframe = helper.getIframe();

    // Enter template edit mode
    await expect(iframe.locator('[data-block-uid="template-header"]')).toBeVisible({ timeout: 15000 });
    await helper.clickBlockInIframe('template-header');
    await helper.waitForSidebarOpen();
    await page.keyboard.press('Escape');
    await helper.waitForQuantaToolbar(TEMPLATE_BLOCK_IDS);

    const editToggle = page.locator('.field-wrapper-editTemplate label[for="field-editTemplate"]');
    await editToggle.click();
    await helper.waitForBlockReadonly('standalone-block-1');

    // Make a valid change - edit template header content
    await helper.clickBlockInIframe('template-header');
    const editor = helper.getSlateField(iframe.locator('[data-block-uid="template-header"]'));
    await editor.click();
    await page.keyboard.press('End');
    await page.keyboard.type(' - edited');
    // Wait for text to appear in editor
    await expect(editor).toContainText('edited', { timeout: 5000 });

    // Exit edit mode
    await page.keyboard.press('Escape');
    await helper.waitForQuantaToolbar(TEMPLATE_BLOCK_IDS);
    await editToggle.uncheck();
    await helper.waitForBlockEditable('standalone-block-1');

    // Save should succeed - wait for pencil icon (view mode) indicating save completed
    await page.keyboard.press('Control+s');
    const pencilIcon = page.locator('.toolbar-actions .edit, [aria-label="Edit"]');
    await expect(pencilIcon).toBeVisible({ timeout: 10000 });

    // Should NOT show validation error
    const errorMessage = page.locator('.toast-error, .validation-error, [role="alert"]').filter({ hasText: /placeholder|split|contiguous/i });
    await expect(errorMessage).not.toBeVisible();

    // Content should be preserved in view mode
    await expect(iframe.locator('[data-block-uid="template-header"]')).toContainText('edited', { timeout: 15000 });

    // Verify template was actually saved by loading another page using the same template
    // Navigate to view mode (not edit) to also test that view mode loads templates
    await helper.navigateToView('/template-test-page-2');
    const page2Header = iframe.locator('[data-block-uid="page2-template-header"]');
    await expect(page2Header).toContainText('edited', { timeout: 15000 });
  });
});

test.describe('Template Edit Mode - Block Settings', () => {
  test('can change block placeholderName in edit mode', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/template-test-page');

    const iframe = helper.getIframe();

    // Enter template edit mode
    await expect(iframe.locator('[data-block-uid="user-content-1"]')).toBeVisible({ timeout: 15000 });
    await helper.clickBlockInIframe('template-header');
    await helper.waitForSidebarOpen();
    await page.keyboard.press('Escape');
    await helper.waitForQuantaToolbar(TEMPLATE_BLOCK_IDS);

    const editToggle = page.locator('.field-wrapper-editTemplate label[for="field-editTemplate"]');
    await editToggle.click();
    await helper.waitForBlockReadonly('standalone-block-1');

    // Select a placeholder block
    await helper.clickBlockInIframe('user-content-1');
    await helper.waitForSidebarOpen();

    // placeholderName input should be visible
    const placeholderInput = page.locator('.field-wrapper-placeholderName input');
    await expect(placeholderInput).toBeVisible({ timeout: 5000 });
    await placeholderInput.clear();
    await placeholderInput.fill('new-slot-name');
    await expect(placeholderInput).toHaveValue('new-slot-name');
  });

  test('can toggle block fixed mode in edit mode', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/template-test-page');

    const iframe = helper.getIframe();

    // Enter template edit mode
    await expect(iframe.locator('[data-block-uid="user-content-1"]')).toBeVisible({ timeout: 15000 });
    await helper.clickBlockInIframe('template-header');
    await helper.waitForSidebarOpen();
    await page.keyboard.press('Escape');
    await helper.waitForQuantaToolbar(TEMPLATE_BLOCK_IDS);

    const editToggle = page.locator('.field-wrapper-editTemplate label[for="field-editTemplate"]');
    await editToggle.click();
    await helper.waitForBlockReadonly('standalone-block-1');

    // Select a placeholder block (not fixed)
    await helper.clickBlockInIframe('user-content-1');
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

    const iframe = helper.getIframe();

    // Wait for fixed readonly block
    await expect(iframe.locator('[data-block-uid="template-header"]')).toBeVisible({ timeout: 15000 });

    // Click the readonly block
    await helper.clickBlockInIframe('template-header');
    await helper.waitForQuantaToolbar('template-header');

    // Format buttons (bold, italic, etc.) should NOT be visible
    const toolbar = page.locator('.quanta-toolbar');
    const formatButtons = toolbar.locator('[data-toolbar-button]');
    await expect(formatButtons).toHaveCount(0);
  });

  test('readonly blocks should not show media field overlay', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/template-test-page');

    const iframe = helper.getIframe();

    // Wait for fixed readonly block
    await expect(iframe.locator('[data-block-uid="template-header"]')).toBeVisible({ timeout: 15000 });

    // Click the readonly block
    await helper.clickBlockInIframe('template-header');
    await helper.waitForQuantaToolbar('template-header');

    // Media overlay (X button to clear image) should NOT be visible
    const mediaOverlay = page.locator('.empty-image-overlay, button[title="Clear image"]');
    await expect(mediaOverlay).toHaveCount(0);
  });

  test('readonly blocks should not show link/media buttons in toolbar', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/template-test-page');

    const iframe = helper.getIframe();

    // Wait for fixed readonly block
    await expect(iframe.locator('[data-block-uid="template-header"]')).toBeVisible({ timeout: 15000 });

    // Click the readonly block
    await helper.clickBlockInIframe('template-header');
    await helper.waitForQuantaToolbar('template-header');

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

    const iframe = helper.getIframe();

    // Wait for fixed block
    await expect(iframe.locator('[data-block-uid="template-header"]')).toBeVisible({ timeout: 15000 });

    // Click the fixed block
    await helper.clickBlockInIframe('template-header');
    await helper.waitForQuantaToolbar('template-header');
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

    const iframe = helper.getIframe();

    // Wait for fixed block
    await expect(iframe.locator('[data-block-uid="template-header"]')).toBeVisible({ timeout: 15000 });

    // Click the fixed block
    await helper.clickBlockInIframe('template-header');
    await helper.waitForQuantaToolbar('template-header');
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

    const iframe = helper.getIframe();

    // Wait for fixed readonly block
    await expect(iframe.locator('[data-block-uid="template-header"]')).toBeVisible({ timeout: 15000 });

    // Click the readonly block
    await helper.clickBlockInIframe('template-header');
    await helper.waitForQuantaToolbar('template-header');
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

    const iframe = helper.getIframe();

    // Enter template edit mode
    await expect(iframe.locator('[data-block-uid="template-header"]')).toBeVisible({ timeout: 15000 });
    await helper.clickBlockInIframe('template-header');
    await helper.waitForSidebarOpen();
    await page.keyboard.press('Escape');
    await helper.waitForQuantaToolbar(TEMPLATE_BLOCK_IDS);

    // Click the label instead of the hidden checkbox input
    const editToggleLabel = page.locator('label[for="field-editTemplate"]');
    await editToggleLabel.click();
    await helper.waitForBlockReadonly('standalone-block-1');

    // Click a block outside the template
    await helper.clickBlockInIframe('standalone-block-1');
    await helper.waitForQuantaToolbar('standalone-block-1');

    // Add button should NOT be visible for blocks outside the template
    const addButton = page.locator('button[title*="Add block"]');
    await expect(addButton).toHaveCount(0);
  });
});
