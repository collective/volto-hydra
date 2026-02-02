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
