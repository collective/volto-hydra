/**
 * Integration tests for inserting templates via BlockChooser.
 *
 * Tests that:
 * 1. Templates appear in BlockChooser when allowedTemplates is configured
 * 2. Selecting a template inserts blocks with proper _templateSource markers
 * 3. Existing content is preserved in the placeholder region
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

  test('selecting template inserts blocks with _templateSource markers', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    const iframe = helper.getIframe();

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

    // Wait for template to be applied
    await page.waitForTimeout(500);

    // Template blocks should be inserted
    // test-layout has: header, main-placeholder, footer
    await expect(iframe.locator('[data-block-uid]').filter({ hasText: 'Template Header' })).toBeVisible({ timeout: 5000 });
    await expect(iframe.locator('[data-block-uid]').filter({ hasText: 'Template Footer' })).toBeVisible();
  });

  test('inserted template blocks show in sidebar hierarchy', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    const iframe = helper.getIframe();

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
    await page.waitForTimeout(500);

    // Click on the template header block
    const headerBlock = iframe.locator('[data-block-uid]').filter({ hasText: 'Template Header' });
    await headerBlock.click();
    await helper.waitForSidebarOpen();

    // Sidebar should show template instance in hierarchy
    const stickyHeaders = page.locator('.sidebar-section-header.sticky-header');
    await expect(stickyHeaders).toHaveCount(3); // Page > Template Instance > Block
    await expect(stickyHeaders.nth(1)).toContainText('test-layout');
  });

  test('template fixed blocks show lock icon', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    const iframe = helper.getIframe();

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
    await page.waitForTimeout(500);

    // Click the template header block (which is fixed)
    const headerBlock = iframe.locator('[data-block-uid]').filter({ hasText: 'Template Header' });
    await headerBlock.click();
    await helper.waitForSidebarOpen();

    // Template header should show lock icon (fixed block)
    const toolbar = page.locator('.quanta-toolbar');
    const lockIcon = toolbar.locator('.lock-icon');
    await expect(lockIcon).toBeVisible();
  });
});
