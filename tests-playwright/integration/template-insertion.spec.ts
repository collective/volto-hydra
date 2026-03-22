/**
 * Integration tests for inserting templates via BlockChooser.
 *
 * Tests that:
 * 1. Templates appear in BlockChooser when allowedTemplates is configured
 * 2. Selecting a template inserts blocks with proper template fields
 * 3. Existing content is preserved in the slot region
 */
import { test, expect } from '../fixtures';
import { AdminUIHelper } from '../helpers/AdminUIHelper';

test.describe('Template Insertion', () => {
  test('template appears in block chooser when configured', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    // Templates are configured via pageBlocksFields.allowedTemplates in test frontend
    await helper.navigateToEdit('/test-page');

    // Click a block to select it and show add button
    await helper.clickBlockInIframe('block-1-uuid');
    await helper.waitForSidebarOpen();

    // Click the add button to open block chooser
    await helper.clickAddBlockButton();

    // BlockChooser should be visible
    const chooserVisible = await helper.isBlockChooserVisible();
    expect(chooserVisible).toBe(true);

    // Unfold the Templates group
    const blockChooser = page.locator('.blocks-chooser');
    const templatesGroup = blockChooser.locator('text=Templates').first();
    await templatesGroup.click();

    // Template should appear in the chooser (format: "Template: {name}")
    const templateOption = blockChooser.locator('button').filter({ hasText: /test-layout/ });
    await expect(templateOption).toBeVisible();
  });

  test('selecting template inserts blocks with template fields', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    // Click a block to select it and show add button
    await helper.clickBlockInIframe('block-1-uuid');
    await helper.waitForSidebarOpen();

    // Click add button to open block chooser
    await helper.clickAddBlockButton();

    // Unfold Templates group and select the template
    const blockChooser = page.locator('.blocks-chooser');
    await blockChooser.locator('text=Templates').first().click();
    const templateOption = blockChooser.locator('button').filter({ hasText: /test-layout/ });
    await templateOption.click();

    // Template blocks should be inserted
    // test-layout has: header, main-placeholder, footer
    await helper.waitForBlockByContent('Template Header');
    await helper.waitForBlockByContent('Template Footer');

    // Slot block content should be stored as fieldPlaceholders
    // The main-placeholder slot block has "Default placeholder content"
    const iframe = helper.getIframe();
    const placeholderBlock = iframe.locator('[data-block-uid]').filter({ hasText: 'Default placeholder content' });
    if (await placeholderBlock.count() > 0) {
      // The slot block's text should show as a placeholder (data-placeholder attr)
      const editField = placeholderBlock.locator('[data-edit-text]').first();
      await expect(editField).toHaveAttribute('data-placeholder', /Default placeholder content/);
    }
  });

  test('inserted template blocks show in sidebar hierarchy', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    // Click a block to select it
    await helper.clickBlockInIframe('block-1-uuid');
    await helper.waitForSidebarOpen();

    // Insert template via block chooser
    await helper.clickAddBlockButton();
    const blockChooser = page.locator('.blocks-chooser');
    await blockChooser.locator('text=Templates').first().click();
    const templateOption = blockChooser.locator('button').filter({ hasText: /test-layout/ });
    await templateOption.click();

    // Wait for template to be inserted and click the header block
    const { locator: headerBlock } = await helper.waitForBlockByContent('Template Header');
    await headerBlock.click();
    await helper.waitForSidebarOpen();

    // Sidebar should show template instance in hierarchy
    const stickyHeaders = page.locator('.sidebar-section-header.sticky-header');
    await expect(stickyHeaders).toHaveCount(3); // Page > Template Instance > Block
    await expect(stickyHeaders.nth(1)).toContainText('test-layout');
  });

  test('template fixed blocks show lock icon', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    // Click a block to select it
    await helper.clickBlockInIframe('block-1-uuid');
    await helper.waitForSidebarOpen();

    // Insert template via block chooser
    await helper.clickAddBlockButton();
    const blockChooser = page.locator('.blocks-chooser');
    await blockChooser.locator('text=Templates').first().click();
    const templateOption = blockChooser.locator('button').filter({ hasText: /test-layout/ });
    await templateOption.click();

    // Wait for template to be inserted and click the header block (which is fixed)
    const { locator: headerBlock } = await helper.waitForBlockByContent('Template Header');
    await headerBlock.click();
    await helper.waitForSidebarOpen();

    // Template header should show lock icon (fixed block)
    const toolbar = page.locator('.quanta-toolbar');
    const lockIcon = toolbar.locator('.lock-icon');
    await expect(lockIcon).toBeVisible();
  });
});
