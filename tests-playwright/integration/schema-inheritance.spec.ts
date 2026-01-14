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

test.describe('Schema Inheritance - Search Block with Listing Container', () => {
  test('can select search block, facet, and listing block', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/search-test-page');

    const iframe = helper.getIframe();

    // Wait for search block to be visible
    const searchBlock = iframe.locator('[data-block-uid="search-block-1"]');
    await expect(searchBlock).toBeVisible({ timeout: 10000 });

    // Click on the search block headline (not on the listing results area)
    const searchHeadline = searchBlock.locator('h2[data-editable-field="headline"]');
    await expect(searchHeadline).toBeVisible();
    await searchHeadline.click();

    // Verify the search block is selected (toolbar visible)
    const toolbar = page.locator('.quanta-toolbar');
    await expect(toolbar).toBeVisible({ timeout: 5000 });

    // Click on a facet item (facet-type is "Content Type" facet)
    const facetItem = iframe.locator('[data-block-uid="facet-type"]');
    await expect(facetItem).toBeVisible({ timeout: 5000 });
    await facetItem.click();

    // Toolbar should be visible for the facet
    await expect(toolbar).toBeVisible({ timeout: 5000 });

    // Verify sidebar shows facet settings (title field)
    await helper.waitForSidebarOpen();
    await helper.openSidebarTab('Block');

    // Facet should have title field in sidebar
    const titleField = page.locator('#sidebar-properties .field-wrapper-title');
    await expect(titleField).toBeVisible({ timeout: 5000 });

    // Now click on the listing child block inside search
    const listingItems = iframe.locator('[data-block-uid="results-listing"]');
    await expect(listingItems.first()).toBeVisible({ timeout: 10000 });
    await listingItems.first().click();

    // Toolbar should still be visible for the listing block
    await expect(toolbar).toBeVisible({ timeout: 5000 });
  });

  test('search block listing container has no add buttons when at maxItems', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/search-test-page');

    const iframe = helper.getIframe();

    // Wait for the listing child block to be visible
    const listingItems = iframe.locator('[data-block-uid="results-listing"]');
    await expect(listingItems.first()).toBeVisible({ timeout: 10000 });

    // Click on the listing block
    await listingItems.first().click();

    // Toolbar should be visible
    const toolbar = page.locator('.quanta-toolbar');
    await expect(toolbar).toBeVisible({ timeout: 5000 });

    // Since maxItems=1 and there's already 1 listing block,
    // there should be no add block buttons (data-block-add markers should be hidden)
    // The listing items should NOT have visible add buttons
    const addButtons = iframe.locator('[data-block-uid="results-listing"] [data-block-add]');

    // If add buttons exist, they should not trigger the add block UI
    // Check that no "+" buttons are visible in the listing container area
    const plusButtons = page.locator('.volto-hydra-add-button');
    await expect(plusButtons).toHaveCount(0);
  });

  test('search block filters results when user submits search form', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    // Use view mode - search is a frontend feature, not an editing feature
    await helper.navigateToView('/search-test-page');

    const iframe = helper.getIframe();

    // Wait for search block and initial results to be visible
    const searchBlock = iframe.locator('[data-block-uid="search-block-1"]');
    await expect(searchBlock).toBeVisible({ timeout: 10000 });

    // Get initial results count (listing items inside search results)
    const searchResults = searchBlock.locator('.search-results [data-block-uid]');
    await expect(searchResults.first()).toBeVisible({ timeout: 10000 });
    const initialCount = await searchResults.count();
    expect(initialCount).toBeGreaterThan(0);

    // Find the search input and enter a search term
    const searchInput = searchBlock.locator('input[name="SearchableText"]');
    await expect(searchInput).toBeVisible();
    await searchInput.fill('accordion');

    // Submit the search form - this navigates iframe to ?SearchableText=accordion
    const searchButton = searchBlock.locator('button.search-submit-button');
    await searchButton.click();

    // Wait for iframe to reload by waiting for the search input to have the value
    // (indicates the page reloaded and read the URL param)
    const searchInputAfter = iframe.locator('[data-block-uid="search-block-1"] input[name="SearchableText"]');
    await expect(searchInputAfter).toHaveValue('accordion', { timeout: 10000 });

    // Check filtered results
    const filteredResults = iframe.locator('[data-block-uid="search-block-1"] .search-results [data-block-uid]');

    // Should have at least one result (accordion-test-page matches "accordion")
    await expect(filteredResults.first()).toBeVisible({ timeout: 10000 });
    const filteredCount = await filteredResults.count();
    expect(filteredCount).toBeGreaterThan(0);

    // Should have fewer results than initial (search filtered them)
    expect(filteredCount).toBeLessThan(initialCount);
  });

  test('search block filters results when user clicks facet checkbox', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();

    // Navigate to search page in VIEW mode (search is frontend-driven)
    await helper.navigateToView('/search-test-page');

    const iframe = helper.getIframe();

    // Wait for the search block to be visible
    const searchBlock = iframe.locator('[data-block-uid="search-block-1"]');
    await expect(searchBlock).toBeVisible({ timeout: 10000 });

    // Wait for initial results to load (all Documents)
    // Use data-block-uid selector which works across mock and Nuxt frontends
    const initialResults = iframe.locator('[data-block-uid="results-listing"]');
    await expect(initialResults.first()).toBeVisible({ timeout: 10000 });
    const initialCount = await initialResults.count();
    expect(initialCount).toBeGreaterThan(0);

    // Find the portal_type facet checkbox for "Image" (base query returns Documents, adding Image filter should return 0)
    const imageCheckbox = iframe.locator('.facet-checkbox[data-field="portal_type"][value="Image"]');
    await expect(imageCheckbox).toBeVisible({ timeout: 5000 });

    // Click the checkbox to filter by Image
    await imageCheckbox.click();

    // Wait for page to reload with facet filter
    // The checkbox should now be checked after reload
    const imageCheckboxAfter = iframe.locator('.facet-checkbox[data-field="portal_type"][value="Image"]');
    await expect(imageCheckboxAfter).toBeChecked({ timeout: 10000 });

    // Should have 0 results (base query filters to Documents, facet adds Image filter = no matches)
    const filteredResults = iframe.locator('[data-block-uid="results-listing"]');
    const filteredCount = await filteredResults.count();
    expect(filteredCount).toBe(0);
  });

  test('can add a facet using add button', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/search-test-page');

    const iframe = helper.getIframe();

    // Wait for facets to be visible
    const facetItem = iframe.locator('[data-block-uid="facet-type"]');
    await expect(facetItem).toBeVisible({ timeout: 10000 });

    // Count initial facets
    const initialFacets = iframe.locator('.facet-item[data-block-uid]');
    const initialCount = await initialFacets.count();
    expect(initialCount).toBe(2); // facet-type and facet-state

    // Click on a facet to select it
    await facetItem.click();

    // Toolbar should appear
    const toolbar = page.locator('.quanta-toolbar');
    await expect(toolbar).toBeVisible({ timeout: 5000 });

    // Click the add button (should appear below the facet since data-block-add="bottom")
    const addButton = page.locator('.volto-hydra-add-button');
    await expect(addButton).toBeVisible({ timeout: 5000 });
    await addButton.click();

    // Wait for the new facet to be added (count goes from 2 to 3)
    const allFacets = iframe.locator('.facet-item[data-block-uid]');
    await expect(allFacets).toHaveCount(3, { timeout: 10000 });

    // Find the new facet ID (not facet-type or facet-state)
    const knownIds = ['facet-type', 'facet-state'];
    let newFacetId: string | null = null;
    for (let i = 0; i < 3; i++) {
      const uid = await allFacets.nth(i).getAttribute('data-block-uid');
      if (uid && !knownIds.includes(uid)) {
        newFacetId = uid;
        break;
      }
    }
    expect(newFacetId).not.toBeNull();

    // Wait for the new facet to be selected (should happen automatically after add)
    const newFacet = iframe.locator(`[data-block-uid="${newFacetId}"]`);
    await helper.waitForBlockSelected(newFacetId!, 10000);

    // Find and select the field (review_state)
    const fieldWrapper = page.locator('#sidebar-properties .field-wrapper-field');
    await expect(fieldWrapper).toBeVisible({ timeout: 5000 });

    const fieldSelect = fieldWrapper.locator('.react-select__control');
    await fieldSelect.click();

    // Wait for dropdown menu to appear and select review_state
    const fieldMenu = page.locator('.react-select__menu');
    await fieldMenu.waitFor({ state: 'visible', timeout: 3000 });

    const reviewStateOption = fieldMenu.locator('.react-select__option', {
      hasText: /Review state|review_state/i,
    });
    await reviewStateOption.click();

    // Now find and set the facet type to selectFacet
    const typeWrapper = page.locator('#sidebar-properties .field-wrapper-type');
    await expect(typeWrapper).toBeVisible({ timeout: 5000 });

    const typeSelect = typeWrapper.locator('.react-select__control');
    await typeSelect.click();

    // Wait for type dropdown and select selectFacet
    const typeMenu = page.locator('.react-select__menu');
    await typeMenu.waitFor({ state: 'visible', timeout: 3000 });

    const selectFacetOption = typeMenu.locator('.react-select__option', {
      hasText: /Select/i,
    });
    await selectFacetOption.click();

    // Wait for frontend to re-render with the new facet settings
    await page.waitForTimeout(1000);

    // Verify the facet now renders as a dropdown (select element)
    const facetDropdown = newFacet.locator('select.facet-select');
    await expect(facetDropdown).toBeVisible({ timeout: 5000 });

    // Verify the dropdown has the correct options for review_state
    const options = facetDropdown.locator('option');
    const optionCount = await options.count();
    expect(optionCount).toBe(4); // Select..., Private, Pending, Published

    // Check specific option values
    await expect(options.nth(0)).toHaveText('Select...');
    await expect(options.nth(1)).toHaveText('Private');
    await expect(options.nth(2)).toHaveText('Pending');
    await expect(options.nth(3)).toHaveText('Published');

    // Verify the dropdown has the correct data-field attribute
    const dataField = await facetDropdown.getAttribute('data-field');
    expect(dataField).toBe('review_state');
  });
});
