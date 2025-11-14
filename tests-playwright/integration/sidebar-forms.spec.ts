/**
 * Integration tests for Sidebar Form Fields in Volto Hydra.
 *
 * Tests validate that correct form fields appear in the sidebar when blocks
 * are selected, and that field values match the block data.
 *
 * IMPORTANT: Slate/Text blocks edit their content INLINE, not through sidebar fields.
 * The Slate block sidebar only shows TOC override settings on the Page tab.
 */
import { test, expect } from '@playwright/test';
import { AdminUIHelper } from '../helpers/AdminUIHelper';

test.describe('Sidebar Forms - Slate Block Behavior', () => {
  test('Slate block Block tab shows value field (Volto Hydra feature)', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    // Click on Slate block
    await helper.clickBlockInIframe('block-1-uuid');

    // Wait for sidebar to open (indicates block is selected in Admin UI)
    await helper.waitForSidebarOpen();

    // Wait for Quanta toolbar to appear in iframe (visual confirmation of selection)
    await helper.waitForQuantaToolbar('block-1-uuid');
    const hasQuantaToolbar = await helper.isQuantaToolbarVisibleInIframe('block-1-uuid');
    expect(hasQuantaToolbar).toBe(true);

    // Open Block tab (Volto Hydra sets sidebarTab: 1 for slate blocks)
    await helper.openSidebarTab('Block');

    // Volto Hydra allows editing slate content in the sidebar (unlike standard Volto)
    const hasValueField = await helper.hasSidebarField('value');
    expect(hasValueField).toBe(true);
  });

  test('Slate blocks show TOC settings on Block tab', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    // Click on Slate block
    await helper.clickBlockInIframe('block-1-uuid');
    await helper.waitForSidebarOpen();

    // Open Block tab
    await helper.openSidebarTab('Block');

    // Slate blocks should have TOC override settings from base schema
    const hasOverrideTocField = await helper.hasSidebarField('override_toc');
    expect(hasOverrideTocField).toBe(true);
  });

  test('Slate blocks do NOT show Image-specific fields on Block tab', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    // Click on Slate block
    await helper.clickBlockInIframe('block-1-uuid');
    await helper.waitForSidebarOpen();
    await helper.openSidebarTab('Block');

    // Slate blocks should NOT have image-specific fields
    const hasAltField = await helper.hasSidebarField('alt');
    const hasAlignField = await helper.hasSidebarField('align');
    const hasSizeField = await helper.hasSidebarField('size');
    const hasUrlField = await helper.hasSidebarField('url');

    expect(hasAltField).toBe(false);
    expect(hasAlignField).toBe(false);
    expect(hasSizeField).toBe(false);
    expect(hasUrlField).toBe(false);
  });
});

test.describe('Sidebar Forms - Image Block Fields', () => {
  test('Image block sidebar shows expected fields on Block tab', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    // Click on Image block
    await helper.clickBlockInIframe('block-2-uuid');
    await helper.waitForSidebarOpen();
    await helper.openSidebarTab('Block');

    // Check for expected fields in default fieldset
    const hasUrlField = await helper.hasSidebarField('url');
    const hasAltField = await helper.hasSidebarField('alt');

    expect(hasUrlField).toBe(true);
    expect(hasAltField).toBe(true);
  });

  test('Image block url field shows current image URL', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    // Click on Image block
    await helper.clickBlockInIframe('block-2-uuid');
    await helper.waitForSidebarOpen();
    await helper.openSidebarTab('Block');

    // Get url field value
    const urlFieldValue = await helper.getSidebarFieldValue('url');

    // Should match the block's url
    expect(urlFieldValue).toContain('placehold.co');
  });

  test('Image block alt field shows current alt text', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    // Click on Image block
    await helper.clickBlockInIframe('block-2-uuid');
    await helper.waitForSidebarOpen();
    await helper.openSidebarTab('Block');

    // Get alt field value
    const altFieldValue = await helper.getSidebarFieldValue('alt');

    // Should match the block's alt text
    expect(altFieldValue).toBe('Test image');
  });

  test('Image block has Link settings accordion fieldset', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    // Click on Image block
    await helper.clickBlockInIframe('block-2-uuid');
    await helper.waitForSidebarOpen();
    await helper.openSidebarTab('Block');

    // Get all fieldsets
    const fieldsets = await helper.getSidebarFieldsets();

    // Should include Link settings accordion
    expect(fieldsets).toContain('Link settings');
  });

  test('Link settings accordion shows href field', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    // Click on Image block
    await helper.clickBlockInIframe('block-2-uuid');
    await helper.waitForSidebarOpen();
    await helper.openSidebarTab('Block');

    // Link settings accordion should contain href field (accordion may be open by default)
    // Ensure accordion is open
    await helper.openFieldsetAccordion('Link settings');

    // href field should be visible
    const hasHrefField = await helper.hasSidebarField('href');
    expect(hasHrefField).toBe(true);
  });

  test('Editing Image block alt field updates block data', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    // Click on Image block
    await helper.clickBlockInIframe('block-2-uuid');
    await helper.waitForSidebarOpen();
    await helper.openSidebarTab('Block');

    // Edit alt field
    await helper.setSidebarFieldValue('alt', 'Updated alt text');

    // Wait for update to propagate
    await helper.waitForFieldValueToBe('alt', 'Updated alt text');

    // Verify alt field shows new value
    const newAltValue = await helper.getSidebarFieldValue('alt');
    expect(newAltValue).toBe('Updated alt text');
  });
});

test.describe('Sidebar Forms - Block Type Differences', () => {
  test('Image blocks do NOT show Slate-specific TOC fields', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    // Click on Image block
    await helper.clickBlockInIframe('block-2-uuid');
    await helper.waitForSidebarOpen();
    await helper.openSidebarTab('Block');

    // Image blocks should NOT have slate TOC override fields
    const hasOverrideTocField = await helper.hasSidebarField('override_toc');
    const hasLevelField = await helper.hasSidebarField('level');
    const hasEntryTextField = await helper.hasSidebarField('entry_text');

    expect(hasOverrideTocField).toBe(false);
    expect(hasLevelField).toBe(false);
    expect(hasEntryTextField).toBe(false);
  });

  test('Switching from Slate to Image block changes sidebar fields', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    // Click on Slate block
    await helper.clickBlockInIframe('block-1-uuid');
    await helper.waitForSidebarOpen();
    await helper.openSidebarTab('Block');

    // Slate blocks should NOT have content fields on Block tab
    let hasAltField = await helper.hasSidebarField('alt');
    let hasUrlField = await helper.hasSidebarField('url');
    expect(hasAltField).toBe(false);
    expect(hasUrlField).toBe(false);

    // Click on Image block
    await helper.clickBlockInIframe('block-2-uuid');
    await helper.waitForSidebarOpen();
    await helper.openSidebarTab('Block');

    // Image blocks SHOULD have these fields
    hasAltField = await helper.hasSidebarField('alt');
    hasUrlField = await helper.hasSidebarField('url');
    expect(hasAltField).toBe(true);
    expect(hasUrlField).toBe(true);
  });
});

test.describe('Sidebar Forms - Field Validation', () => {
  test('Sidebar fields list matches expected fields for Image block', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    // Click on Image block
    await helper.clickBlockInIframe('block-2-uuid');
    await helper.waitForSidebarOpen();
    await helper.openSidebarTab('Block');

    // Get all visible field names (default fieldset only, accordion closed)
    const fields = await helper.getSidebarFormFields();

    // Should include core image fields
    expect(fields).toContain('url');
    expect(fields).toContain('alt');

    // May also include align and size depending on whether image is loaded
    // (ImageSchema conditionally shows these only when formData.url exists)
  });

  test('All visible Image fields are accessible', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    // Click on Image block
    await helper.clickBlockInIframe('block-2-uuid');
    await helper.waitForSidebarOpen();
    await helper.openSidebarTab('Block');

    // Get all visible fields
    const fields = await helper.getSidebarFormFields();

    // Every field should be accessible
    for (const fieldName of fields) {
      const hasField = await helper.hasSidebarField(fieldName);
      expect(hasField, `Field ${fieldName} should be accessible`).toBe(true);
    }
  });
});
