/**
 * Tests for schema inheritance and block type widgets.
 *
 * Tests the Phase 2 features:
 * - BlockTypeWidget: selecting block types for container items
 * - FieldMappingWidget: mapping source fields to target block fields
 * - Schema inheritance: inheriting non-mapped fields from referenced type
 */
import { test, expect } from '../fixtures';
import { AdminUIHelper } from '../helpers/AdminUIHelper';

test.describe('Schema Inheritance - Listing Block Item Type', () => {
  test('listing block shows itemType selector in sidebar', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    // Click on listing block (block-9-listing)
    await helper.clickBlockInIframe('block-9-listing');
    await helper.waitForSidebarOpen();

    // Open Block tab
    await helper.openSidebarTab('Block');

    // Verify itemType field exists
    const hasItemTypeField = await helper.hasSidebarField('itemType');
    expect(hasItemTypeField).toBe(true);
  });

  test('changing itemType from teaser to image updates frontend rendering', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    const blockId = 'block-9-listing';
    const iframe = helper.getIframe();

    // Click on listing block first (scrolls to it)
    await helper.clickBlockInIframe(blockId);
    await helper.waitForSidebarOpen();
    await helper.openSidebarTab('Block');

    // Initially should have teaser items (expanded from listing -> teaser blocks)
    // Expanded items have data-block-uid="block-9-listing" AND class="teaser-block" on same element
    const teaserItems = iframe.locator(`[data-block-uid="${blockId}"].teaser-block`);
    await expect(teaserItems.first()).toBeVisible();

    // Verify teaser blocks render with correct field-mapped data
    // Field mapping for teaser: @id->href, title->title, description->description, image->preview_image
    const firstTeaser = teaserItems.first();

    // Check teaser has a title (from title field mapping)
    const teaserTitle = firstTeaser.locator('h3');
    await expect(teaserTitle).toBeVisible();
    const titleText = await teaserTitle.textContent();
    expect(titleText).toBeTruthy();

    // Check teaser has a link with href (from @id field mapping)
    const teaserLink = firstTeaser.locator('a').first();
    const teaserHref = await teaserLink.getAttribute('href');
    expect(teaserHref).toBeTruthy();
    expect(teaserHref).toContain('http');

    // Find the itemType field's React Select
    const itemTypeField = page.locator('#sidebar-properties .field-wrapper-itemType');
    await expect(itemTypeField).toBeVisible();

    // Verify current value is "Teaser"
    await expect(itemTypeField.locator('.react-select__single-value')).toContainText('Teaser');

    // Click on the React Select control to open dropdown
    const selectControl = itemTypeField.locator('.react-select__control');
    await selectControl.click();

    // Wait for dropdown menu to appear
    const menu = page.locator('.react-select__menu');
    await menu.waitFor({ state: 'visible', timeout: 3000 });

    // Click on "Image" option
    const imageOption = menu.locator('.react-select__option', { hasText: 'Image' });
    await imageOption.click();

    // Wait for frontend to re-render with image type
    // Image blocks: element with data-block-uid contains <img data-media-field="url">
    const imageItems = iframe.locator(`[data-block-uid="${blockId}"] img[data-media-field="url"]`);
    await expect(imageItems.first()).toBeVisible({ timeout: 5000 });

    // Verify field mapping worked - check that rendered images have correct data:
    // - Image src should have a URL (from image field mapping)
    // - Alt text should have the title (from title field mapping)
    const firstImage = imageItems.first();
    const imgSrc = await firstImage.getAttribute('src');
    const imgAlt = await firstImage.getAttribute('alt');

    // Image src should be populated (not empty)
    expect(imgSrc).toBeTruthy();
    expect(imgSrc).toContain('http');

    // Alt text should contain the page title (field mapping: title -> alt)
    expect(imgAlt).toBeTruthy();

    // Check that the image is wrapped in a link with href (from @id field mapping)
    const imageLink = iframe.locator(`[data-block-uid="${blockId}"] a`).first();
    const linkHref = await imageLink.getAttribute('href');
    expect(linkHref).toBeTruthy();
    expect(linkHref).toContain('http');

    // Teaser blocks should no longer be visible (same element selector, no matches)
    await expect(teaserItems).toHaveCount(0);

    // Verify toolbar doesn't show link/media buttons for readonly listing items
    // Click on one of the rendered image items to select it
    await imageItems.first().click();

    // The Quanta toolbar should be visible (selection box around block)
    const quantaToolbar = page.locator('.quanta-toolbar');
    await expect(quantaToolbar).toBeVisible();

    // But the link and image buttons should NOT be visible (listing items are readonly)
    // These buttons appear when focusedLinkableField or focusedMediaField are set
    const linkButton = quantaToolbar.locator('button[title*="link"]');
    const imageButton = quantaToolbar.locator('button[title*="image"]');
    await expect(linkButton).not.toBeVisible();
    await expect(imageButton).not.toBeVisible();
  });

  test('listing block shows fieldMapping widget with target type fields', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    // Click on listing block
    await helper.clickBlockInIframe('block-9-listing');
    await helper.waitForSidebarOpen();
    await helper.openSidebarTab('Block');

    // Verify fieldMapping field exists
    const hasFieldMappingField = await helper.hasSidebarField('fieldMapping');
    expect(hasFieldMappingField).toBe(true);

    // The field mapping widget should show source fields in the first column
    const fieldMappingWidget = page.locator('#sidebar-properties .field-wrapper-fieldMapping');
    const mappingTable = fieldMappingWidget.locator('.field-mapping-table');
    await expect(mappingTable).toBeVisible();

    // Check source field labels exist in the Source column (first td of each row)
    await expect(mappingTable.locator('td:first-child', { hasText: 'Title' })).toBeVisible();
    await expect(mappingTable.locator('td:first-child', { hasText: 'Description' })).toBeVisible();

    // Open the URL row's target dropdown to verify target type fields are available
    const urlRowDropdown = mappingTable.locator('tr', { hasText: 'URL' }).locator('.react-select__control');
    await urlRowDropdown.click();

    // Wait for dropdown menu to appear
    const menu = page.locator('.react-select__menu');
    await menu.waitFor({ state: 'visible', timeout: 3000 });

    // Verify all teaser block fields are available as options
    // Teaser has: href (Target), title (Title), head_title (Head title),
    // description (Description), preview_image (Image override)
    // React Select options are divs with class react-select__option
    const options = menu.locator('.react-select__option');
    // Should have at least 6 options: (none), Target, Title, Head title, Description, Image override
    await expect(options).toHaveCount(9); // All teaser properties + (none)

    // Verify specific teaser fields are present
    await expect(menu.locator('.react-select__option:has-text("(none)")')).toBeVisible();
    await expect(menu.locator('.react-select__option:has-text("Target")')).toBeVisible();
    await expect(menu.locator('.react-select__option:has-text("Description")')).toBeVisible();
    await expect(menu.locator('.react-select__option:has-text("Image override")')).toBeVisible();

    // Close dropdown by clicking elsewhere (not Escape, which deselects the block)
    await mappingTable.locator('th', { hasText: 'Source' }).click();
    await menu.waitFor({ state: 'hidden', timeout: 1000 });

    // Now change itemType to "image" and verify dropdown options change
    const itemTypeField = page.locator('#sidebar-properties .field-wrapper-itemType');
    const itemTypeSelect = itemTypeField.locator('.react-select__control');
    await itemTypeSelect.click();

    // Wait for itemType dropdown menu
    const itemTypeMenu = page.locator('.react-select__menu');
    await itemTypeMenu.waitFor({ state: 'visible', timeout: 3000 });

    // Select "Image" option
    await itemTypeMenu.locator('.react-select__option', { hasText: 'Image' }).click();

    // Wait for itemType menu to close (confirms selection was made)
    await itemTypeMenu.waitFor({ state: 'hidden', timeout: 3000 });

    // Verify smart defaults are recalculated for image block
    // The "Image" row should now show a mapped value (smart defaults for image type)
    const imageRow = mappingTable.locator('tr').filter({ has: page.locator('td:first-child', { hasText: 'Image' }) });
    const imageRowSelect = imageRow.locator('.react-select__single-value');
    // Image block's url field should be mapped (it's an image type field)
    await expect(imageRowSelect).toContainText('Image Src');

    // Open the URL row's dropdown to verify image block fields are available
    await urlRowDropdown.click();
    await menu.waitFor({ state: 'visible', timeout: 3000 });

    // Image block should have different fields than teaser
    // Verify "Target" (teaser-specific) is NOT present
    await expect(menu.locator('.react-select__option:has-text("Target")')).not.toBeVisible();

    // Verify image block has "Image Src" field (url with widget: 'image')
    await expect(menu.locator('.react-select__option:has-text("Image Src")')).toBeVisible();

    // Close dropdown by clicking elsewhere
    await mappingTable.locator('th', { hasText: 'Source' }).click();
    await menu.waitFor({ state: 'hidden', timeout: 1000 });
  });

  test('fieldMapping shows smart defaults based on field types', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    // Click on listing block
    await helper.clickBlockInIframe('block-9-listing');
    await helper.waitForSidebarOpen();
    await helper.openSidebarTab('Block');

    // The field mapping widget should show smart defaults by field type:
    // - @id (URL) → href target (link field - "Target")
    // - title source → title target (first string field - "Title")
    // - description source → description target (textarea field)
    // - image source → preview_image target (image field)
    const fieldMappingTable = page.locator('#sidebar-properties .field-mapping-table');
    await expect(fieldMappingTable).toBeVisible();

    // Check that URL row has a default mapping to "Target" (href/link field)
    const urlRow = fieldMappingTable.locator('tr').filter({ has: page.locator('td:first-child', { hasText: 'URL' }) });
    await expect(urlRow.locator('.react-select__single-value')).toContainText('Target');

    // Check that Title row has a default mapping to "Title" (first string field)
    const titleRow = fieldMappingTable.locator('tr').filter({ has: page.locator('td:first-child', { hasText: 'Title' }) });
    await expect(titleRow.locator('.react-select__single-value')).toContainText('Title');

    // Check that Description row has a default mapping to "Description"
    const descriptionRow = fieldMappingTable.locator('tr').filter({ has: page.locator('td:first-child', { hasText: 'Description' }) });
    await expect(descriptionRow.locator('.react-select__single-value')).toContainText('Description');

    // Check that Lead Image row has a default mapping to "Image override" (preview_image)
    const imageRow = fieldMappingTable.locator('tr').filter({ has: page.locator('td:first-child', { hasText: 'Lead Image' }) });
    await expect(imageRow.locator('.react-select__single-value')).toContainText('Image override');
  });

  test('Teaser Defaults fieldset hides fields that are in fieldMapping', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    // Click on listing block
    await helper.clickBlockInIframe('block-9-listing');
    await helper.waitForSidebarOpen();
    await helper.openSidebarTab('Block');

    // Scroll to the "Teaser Defaults" fieldset (it's expanded by default)
    const teaserDefaultsContent = page.locator('#blockform-fieldset-inherited_fields');
    await teaserDefaultsContent.scrollIntoViewIfNeeded();
    await expect(teaserDefaultsContent).toBeVisible();

    // The fieldset should NOT contain fields that are mapped:
    // - title is mapped (title -> title)
    // - description is mapped (description -> description)
    // - href/Target is mapped (@id -> href)
    // - preview_image/Image override is mapped (image -> preview_image)

    // But it SHOULD contain fields that are NOT mapped, like:
    // - overwrite (checkbox to enable custom content)
    // - head_title
    // - openLinkInNewTab

    // Mapped fields should NOT appear in Teaser Defaults
    // (they get their values from query results via fieldMapping)
    await expect(teaserDefaultsContent.locator('.field-wrapper-itemDefaults_title')).not.toBeVisible();
    await expect(teaserDefaultsContent.locator('.field-wrapper-itemDefaults_description')).not.toBeVisible();
    await expect(teaserDefaultsContent.locator('.field-wrapper-itemDefaults_href')).not.toBeVisible();
    await expect(teaserDefaultsContent.locator('.field-wrapper-itemDefaults_preview_image')).not.toBeVisible();

    // Non-mapped fields SHOULD appear
    await expect(teaserDefaultsContent.locator('.field-wrapper-itemDefaults_overwrite')).toBeVisible();
    await expect(teaserDefaultsContent.locator('.field-wrapper-itemDefaults_head_title')).toBeVisible();
  });

  test('enabling overwrite in Teaser Defaults shows title in rendered teaser', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    const blockId = 'block-9-listing';
    const iframe = helper.getIframe();

    // Click on listing block
    await helper.clickBlockInIframe(blockId);
    await helper.waitForSidebarOpen();
    await helper.openSidebarTab('Block');

    // Scroll to the "Teaser Defaults" fieldset (it's expanded by default)
    // First wait for element to be in DOM, then scroll the sidebar container
    const teaserDefaultsFieldset = page.locator('#blockform-fieldset-inherited_fields');
    await expect(teaserDefaultsFieldset).toBeAttached({ timeout: 10000 });

    // Scroll the sidebar container to bring fieldset into view
    await page.evaluate(() => {
      const fieldset = document.querySelector('#blockform-fieldset-inherited_fields');
      if (fieldset) {
        fieldset.scrollIntoView({ block: 'center', behavior: 'instant' });
      }
    });
    await expect(teaserDefaultsFieldset).toBeVisible();

    // Find and check the "overwrite" checkbox (field is itemDefaults_overwrite)
    const overwriteField = page.locator('#sidebar-properties .field-wrapper-itemDefaults_overwrite');
    const overwriteCheckbox = overwriteField.locator('input[type="checkbox"]');
    await overwriteField.scrollIntoViewIfNeeded();
    await expect(overwriteCheckbox).toBeVisible();

    // Check if it's already checked, if not, click it (click label to toggle)
    const isChecked = await overwriteCheckbox.isChecked();
    if (!isChecked) {
      await overwriteField.locator('label').click();
    }

    // Wait for frontend to re-render
    await page.waitForTimeout(500);

    // Now the teaser should render with title from the mapped field
    // because overwrite enables the block.title to be used
    const teaserItems = iframe.locator(`[data-block-uid="${blockId}"].teaser-block`);
    await expect(teaserItems.first()).toBeVisible({ timeout: 5000 });

    // First teaser should now have a title (h3 or h5 element with text)
    const firstTeaser = teaserItems.first();
    const teaserTitle = firstTeaser.locator('h3, h5');
    await expect(teaserTitle).toBeVisible();
    const titleText = await teaserTitle.textContent();
    expect(titleText).toBeTruthy();
    expect(titleText?.length).toBeGreaterThan(0);
  });

  test('listing inside grid has valid titles on initial render', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    const iframe = helper.getIframe();

    // Wait for the grid block to be visible
    const gridBlock = iframe.locator('[data-block-uid="block-8-grid"]');
    await expect(gridBlock).toBeVisible({ timeout: 10000 });

    // The grid contains a listing (listing-in-grid) which should be expanded to teaser items
    // Each expanded teaser has data-block-uid="listing-in-grid" (the listing's ID)
    const nestedListingItems = iframe.locator('[data-block-uid="listing-in-grid"]');

    // Wait for items to appear (expansion should happen during render)
    await expect(nestedListingItems.first()).toBeVisible({ timeout: 10000 });

    // Should have multiple items from the listing query
    const itemCount = await nestedListingItems.count();
    expect(itemCount).toBeGreaterThan(0);

    // Check that each item has a valid title (not empty)
    // These are teaser blocks with h3 or h5 titles
    for (let i = 0; i < Math.min(itemCount, 3); i++) {
      const item = nestedListingItems.nth(i);
      const title = item.locator('h3, h5');

      // Title should be visible and have text
      await expect(title).toBeVisible();
      const titleText = await title.textContent();
      expect(titleText).toBeTruthy();
      expect(titleText?.trim().length).toBeGreaterThan(0);
    }

    // Verify these items are readonly (no editable fields should be present)
    // The listing block ID should be in the readonly registry
    // Clicking on an item should NOT show media/link buttons in toolbar
    await nestedListingItems.first().click();

    // Toolbar should appear but without link/image buttons
    const toolbar = page.locator('.quanta-toolbar');
    await expect(toolbar).toBeVisible({ timeout: 5000 });

    // Link and image buttons should NOT be visible (listing items are readonly)
    const linkButton = toolbar.locator('button[title*="link"]');
    const imageButton = toolbar.locator('button[title*="image"]');
    await expect(linkButton).not.toBeVisible();
    await expect(imageButton).not.toBeVisible();
  });
});
