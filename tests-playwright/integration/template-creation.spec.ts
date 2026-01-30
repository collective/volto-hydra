/**
 * Integration tests for creating and editing templates.
 *
 * Based on GitHub issue #184 workflow:
 * 1. Create a block → "Make Template" option
 * 2. Enter template name/path
 * 3. Block becomes part of template instance, enter edit mode
 * 4. Configure block settings (fixed/editable/placeholder)
 * 5. Exit edit mode → save page (template saved separately)
 */
import { test, expect } from '../fixtures';
import { AdminUIHelper } from '../helpers/AdminUIHelper';

// Block IDs for the template instance in template-test-page
const TEMPLATE_BLOCK_IDS = ['template-header', 'template-grid', 'user-content-1', 'user-content-2', 'template-footer'];

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

    const iframe = helper.getIframe();

    // Wait for template block
    await expect(iframe.locator('[data-block-uid="template-header"]')).toBeVisible({ timeout: 15000 });

    // Click template block
    await helper.clickBlockInIframe('template-header');
    await helper.waitForQuantaToolbar('template-header');

    // Open toolbar menu
    await helper.openQuantaToolbarMenu('template-header');
    const menuOptions = await helper.getQuantaToolbarMenuOptions('template-header');
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

  test('template edit mode is automatically activated when creating template', async ({ page }) => {
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
});

test.describe('Template Edit Mode', () => {
  test('can toggle template edit mode from sidebar', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/template-test-page');

    const iframe = helper.getIframe();

    // Wait for template block and click it
    await expect(iframe.locator('[data-block-uid="template-header"]')).toBeVisible({ timeout: 15000 });
    await helper.clickBlockInIframe('template-header');
    await helper.waitForSidebarOpen();

    // Navigate up to template instance
    await page.keyboard.press('Escape');
    await helper.waitForQuantaToolbar(TEMPLATE_BLOCK_IDS);

    // Sidebar should have "Edit Template" toggle
    const editTemplateToggle = page.locator('.edit-template-toggle, [data-field-id="editTemplate"] input, label').filter({ hasText: /edit.*template/i });
    await expect(editTemplateToggle).toBeVisible();

    // Toggle edit mode on
    await editTemplateToggle.click();

    // Edit mode should be active - blocks outside template should be locked (greyed out)
    await helper.waitForBlockReadonly('standalone-block-1');
  });

  test('in edit mode, fixed blocks inside template become editable', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/template-test-page');

    const iframe = helper.getIframe();

    // Wait for template block
    await expect(iframe.locator('[data-block-uid="template-header"]')).toContainText('Template Header', { timeout: 15000 });

    // Initially, the fixed template block should NOT be editable
    const headerBlock = iframe.locator('[data-block-uid="template-header"]');
    const h1Element = headerBlock.locator('h1');
    let isEditable = await h1Element.getAttribute('contenteditable');
    expect(isEditable).not.toBe('true');

    // Navigate to template instance and enable edit mode
    await helper.clickBlockInIframe('template-header');
    await helper.waitForSidebarOpen();
    await page.keyboard.press('Escape');
    await helper.waitForQuantaToolbar(TEMPLATE_BLOCK_IDS);

    const editTemplateToggle = page.locator('.edit-template-toggle, [data-field-id="editTemplate"] input, label').filter({ hasText: /edit.*template/i });
    await editTemplateToggle.click();
    await helper.waitForBlockReadonly('standalone-block-1');

    // Click the fixed block again
    await helper.clickBlockInIframe('template-header');
    await helper.waitForQuantaToolbar('template-header');

    // Now the fixed block should be editable (even though readOnly: true)
    isEditable = await h1Element.getAttribute('contenteditable');
    expect(isEditable).toBe('true');
  });

  test('in edit mode, blocks outside template become non-editable', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/template-test-page');

    const iframe = helper.getIframe();

    // Wait for blocks
    await expect(iframe.locator('[data-block-uid="standalone-block-1"]')).toBeVisible({ timeout: 15000 });
    await expect(iframe.locator('[data-block-uid="template-header"]')).toBeVisible();

    // Initially, standalone block should be editable
    await helper.clickBlockInIframe('standalone-block-1');
    await helper.waitForQuantaToolbar('standalone-block-1');
    const standaloneBlock = iframe.locator('[data-block-uid="standalone-block-1"]');
    const standaloneEditor = helper.getSlateField(standaloneBlock);
    await expect(standaloneEditor).toHaveAttribute('contenteditable', 'true', { timeout: 5000 });

    // Navigate to template instance and enable edit mode
    await helper.clickBlockInIframe('template-header');
    await helper.waitForSidebarOpen();
    await page.keyboard.press('Escape');
    await helper.waitForQuantaToolbar(TEMPLATE_BLOCK_IDS);

    const editTemplateToggle = page.locator('.edit-template-toggle, [data-field-id="editTemplate"] input, label').filter({ hasText: /edit.*template/i });
    await editTemplateToggle.click();
    await helper.waitForBlockReadonly('standalone-block-1');

    // Click standalone block (outside template)
    await helper.clickBlockInIframe('standalone-block-1');

    // In template edit mode, blocks outside the template should NOT be editable
    const isEditable = await standaloneEditor.getAttribute('contenteditable');
    expect(isEditable).not.toBe('true');
  });

  test('in edit mode, can configure block placeholderName', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/template-test-page');

    const iframe = helper.getIframe();

    // Wait for template block
    await expect(iframe.locator('[data-block-uid="template-header"]')).toBeVisible({ timeout: 15000 });

    // Navigate to template instance and enable edit mode
    await helper.clickBlockInIframe('template-header');
    await helper.waitForSidebarOpen();
    await page.keyboard.press('Escape');
    await helper.waitForQuantaToolbar(TEMPLATE_BLOCK_IDS);

    const editTemplateToggle = page.locator('.edit-template-toggle, [data-field-id="editTemplate"] input, label').filter({ hasText: /edit.*template/i });
    await editTemplateToggle.click();
    await helper.waitForBlockReadonly('standalone-block-1');

    // Click the template header block
    await helper.clickBlockInIframe('template-header');
    await helper.waitForSidebarOpen();

    // Sidebar should show placeholderName field in edit mode
    // Scroll sidebar to ensure field is visible (it's below the slate block settings)
    const sidebar = page.locator('#sidebar-properties');
    await sidebar.evaluate((el: HTMLElement) => el.scrollTop = el.scrollHeight);

    // Volto outputs field-wrapper-{fieldId} class
    const placeholderNameField = page.locator('.field-wrapper-placeholderName');
    await expect(placeholderNameField).toBeVisible({ timeout: 5000 });

    // Change the placeholderName
    const input = placeholderNameField.locator('input');
    await input.clear();
    await input.fill('new-header-name');

    // Field should have new value
    await expect(input).toHaveValue('new-header-name');
  });

  test('in edit mode, can toggle block fixed/editable mode', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/template-test-page');

    const iframe = helper.getIframe();

    // Wait for template block
    await expect(iframe.locator('[data-block-uid="user-content-1"]')).toBeVisible({ timeout: 15000 });

    // Navigate to template instance and enable edit mode
    await helper.clickBlockInIframe('template-header');
    await helper.waitForSidebarOpen();
    await page.keyboard.press('Escape');
    await helper.waitForQuantaToolbar(TEMPLATE_BLOCK_IDS);

    const editTemplateToggle = page.locator('.edit-template-toggle, [data-field-id="editTemplate"] input, label').filter({ hasText: /edit.*template/i });
    await editTemplateToggle.click();
    await helper.waitForBlockReadonly('standalone-block-1');

    // Click a placeholder block (not fixed)
    await helper.clickBlockInIframe('user-content-1');
    await helper.waitForSidebarOpen();

    // Should show template settings fieldset with mode selector
    const modeField = page.locator('[data-field-id="templateMode"], .field-wrapper').filter({ hasText: /mode/i });
    await expect(modeField).toBeVisible();

    // Mode should show current state (placeholder = not fixed)
    // Available options: fixed-readonly, fixed-editable, placeholder
    const modeSelect = modeField.locator('select, [role="listbox"]');
    if (await modeSelect.isVisible()) {
      const currentValue = await modeSelect.inputValue();
      expect(currentValue).toMatch(/placeholder/i);
    }
  });

  test('exiting edit mode re-locks fixed blocks', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/template-test-page');

    const iframe = helper.getIframe();

    // Wait for template block
    await expect(iframe.locator('[data-block-uid="template-header"]')).toContainText('Template Header', { timeout: 15000 });

    // Navigate to template instance and enable edit mode
    await helper.clickBlockInIframe('template-header');
    await helper.waitForSidebarOpen();
    await page.keyboard.press('Escape');
    await helper.waitForQuantaToolbar(TEMPLATE_BLOCK_IDS);

    const editTemplateToggle = page.locator('.edit-template-toggle, [data-field-id="editTemplate"] input, label').filter({ hasText: /edit.*template/i });
    await editTemplateToggle.click();
    await helper.waitForBlockReadonly('standalone-block-1');

    // Verify header is now editable in edit mode
    await helper.clickBlockInIframe('template-header');
    await helper.waitForQuantaToolbar('template-header');
    const headerBlock = iframe.locator('[data-block-uid="template-header"]');
    const h1Element = headerBlock.locator('h1');
    let isEditable = await h1Element.getAttribute('contenteditable');
    expect(isEditable).toBe('true');

    // Exit edit mode by toggling off
    await page.keyboard.press('Escape'); // Back to template instance
    await helper.waitForQuantaToolbar(TEMPLATE_BLOCK_IDS);
    await editTemplateToggle.click(); // Toggle off
    await helper.waitForBlockEditable('standalone-block-1');

    // Click header again
    await helper.clickBlockInIframe('template-header');
    await helper.waitForQuantaToolbar('template-header');

    // Fixed block should be readonly again
    isEditable = await h1Element.getAttribute('contenteditable');
    expect(isEditable).not.toBe('true');
  });
});

test.describe('Template Saving', () => {
  test('editing template header updates template on save', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/template-test-page');

    const iframe = helper.getIframe();

    // Wait for merged content
    await expect(iframe.locator('[data-block-uid="template-header"]')).toContainText('Template Header - From Template', { timeout: 15000 });

    // Enter template edit mode
    await helper.clickBlockInIframe('template-header');
    await helper.waitForSidebarOpen();
    await page.keyboard.press('Escape');
    await helper.waitForQuantaToolbar(TEMPLATE_BLOCK_IDS);

    const editTemplateToggle = page.locator('.edit-template-toggle, [data-field-id="editTemplate"] input, label').filter({ hasText: /edit.*template/i });
    await editTemplateToggle.click();
    await helper.waitForBlockReadonly('standalone-block-1');

    // Edit the template header content
    await helper.clickBlockInIframe('template-header');
    await helper.waitForQuantaToolbar('template-header');
    const headerBlock = iframe.locator('[data-block-uid="template-header"]');
    const h1Element = headerBlock.locator('h1');
    await h1Element.click();
    await page.keyboard.press('End');
    await page.keyboard.type(' - EDITED');

    // Wait for text to appear
    await expect(headerBlock).toContainText('EDITED', { timeout: 5000 });

    // Exit edit mode
    await page.keyboard.press('Escape');
    await helper.waitForQuantaToolbar(TEMPLATE_BLOCK_IDS);
    await editTemplateToggle.click();
    await helper.waitForBlockEditable('standalone-block-1');

    // Save the page
    await page.keyboard.press('Control+s');

    // Navigate away and back to verify template was saved
    await helper.navigateToEdit('/test-page');
    await helper.navigateToEdit('/template-test-page');

    // The header should still have the edited content (from saved template)
    await expect(iframe.locator('[data-block-uid="template-header"]')).toContainText('EDITED', { timeout: 15000 });
  });

  test('template changes are detected and saved separately from page', async ({ page, request }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/template-test-page');

    const iframe = helper.getIframe();

    // Wait for merged content
    await expect(iframe.locator('[data-block-uid="template-header"]')).toContainText('Template Header', { timeout: 15000 });

    // Enter template edit mode and make a change
    await helper.clickBlockInIframe('template-header');
    await helper.waitForSidebarOpen();
    await page.keyboard.press('Escape');
    await helper.waitForQuantaToolbar(TEMPLATE_BLOCK_IDS);

    const editTemplateToggle = page.locator('.edit-template-toggle, [data-field-id="editTemplate"] input, label').filter({ hasText: /edit.*template/i });
    await editTemplateToggle.click();
    await helper.waitForBlockReadonly('standalone-block-1');

    // Edit template content
    await helper.clickBlockInIframe('template-header');
    const headerBlock = iframe.locator('[data-block-uid="template-header"]');
    const h1Element = headerBlock.locator('h1');
    await h1Element.click();
    await page.keyboard.press('End');
    await page.keyboard.type(' - MODIFIED');
    await expect(headerBlock).toContainText('MODIFIED', { timeout: 5000 });

    // Exit edit mode and save
    await page.keyboard.press('Escape');
    await helper.waitForQuantaToolbar(TEMPLATE_BLOCK_IDS);
    await editTemplateToggle.click();
    await helper.waitForBlockEditable('standalone-block-1');

    // Save - this should save BOTH page and template
    await page.keyboard.press('Control+s');

    // Verify template document was saved by fetching it directly
    const templateResponse = await request.get('http://localhost:8888/++api++/templates/test-layout');
    const templateData = await templateResponse.json();

    // The template's header block should have the modified content
    const headerBlockData = templateData.blocks?.['header-block'];
    expect(headerBlockData).toBeDefined();
    expect(headerBlockData.plaintext || JSON.stringify(headerBlockData.value)).toContain('MODIFIED');
  });

  test('placeholder content is NOT saved to template', async ({ page, request }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/template-test-page');

    const iframe = helper.getIframe();

    // Wait for content
    await expect(iframe.locator('[data-block-uid="user-content-1"]')).toBeVisible({ timeout: 15000 });

    // Edit placeholder content (not in template edit mode)
    await helper.clickBlockInIframe('user-content-1');
    await helper.waitForQuantaToolbar('user-content-1');
    const userBlock = iframe.locator('[data-block-uid="user-content-1"]');
    const editor = helper.getSlateField(userBlock);
    await editor.click();
    await page.keyboard.press('End');
    await page.keyboard.type(' - PAGE SPECIFIC EDIT');
    await expect(editor).toContainText('PAGE SPECIFIC EDIT', { timeout: 5000 });

    // Save
    await page.keyboard.press('Control+s');

    // Verify template was NOT changed
    const templateResponse = await request.get('http://localhost:8888/++api++/templates/test-layout');
    const templateData = await templateResponse.json();

    // The template's placeholder block should NOT have the page-specific edit
    const placeholderBlockData = templateData.blocks?.['main-placeholder'];
    expect(placeholderBlockData).toBeDefined();
    expect(placeholderBlockData.plaintext || JSON.stringify(placeholderBlockData.value)).not.toContain('PAGE SPECIFIC EDIT');
  });
});
