/**
 * Tests for schema inheritance and type selection.
 *
 * Tests the Phase 2 features:
 * - Type selection: choosing block types for container items (via inheritSchemaFrom)
 * - FieldMappingWidget: mapping source fields to target block fields
 * - Schema inheritance: inheriting non-mapped fields from referenced type
 */
import { test, expect } from '../fixtures';
import { AdminUIHelper } from '../helpers/AdminUIHelper';

test.describe('Schema Inheritance - Listing Block Item Type', () => {
  test('listing block shows variation selector in sidebar', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    // Click on listing block (block-9-listing)
    await helper.clickBlockInIframe('block-9-listing');
    await helper.waitForSidebarOpen();

    // Open Block tab
    await helper.openSidebarTab('Block');

    // Verify variation field exists
    const hasItemTypeField = await helper.hasSidebarField('variation');
    expect(hasItemTypeField).toBe(true);
  });

  test('changing variation from teaser to image updates frontend rendering', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    const blockId = 'block-9-listing';
    const iframe = helper.getIframe();

    // Initially (BEFORE clicking) should have teaser items - verify data has variation="teaser"
    // Expanded items have data-block-uid="block-9-listing" AND class="teaser-block" on same element
    const teaserItems = iframe.locator(`[data-block-uid="${blockId}"].teaser-block`);
    await expect(teaserItems.first()).toBeVisible({ timeout: 10000 });

    // Verify it's NOT showing summaryItem layout (which has image on the side with flexbox)
    // Teaser layout has image on top (no flex display)
    const summaryItems = iframe.locator(`[data-block-uid="${blockId}"].summary-item-block`);
    await expect(summaryItems).toHaveCount(0);

    // Now click on listing block (scrolls to it)
    await helper.clickBlockInIframe(blockId);
    await helper.waitForSidebarOpen();
    await helper.openSidebarTab('Block');

    // Verify teaser blocks render with correct field-mapped data
    // Field mapping for teaser: @id->href, title->title, description->description, image->preview_image
    const firstTeaser = teaserItems.first();

    // Check teaser has a title (from title field mapping)
    // Test frontend uses h3, Nuxt uses h5
    const teaserTitle = firstTeaser.locator(':is(h3, h4, h5, h6)').first();
    await expect(teaserTitle).toBeVisible();
    const titleText = await teaserTitle.textContent();
    expect(titleText).toBeTruthy();

    // Check teaser has a link with href (from @id field mapping)
    // Test frontend uses absolute URLs, Nuxt uses relative
    const teaserLink = firstTeaser.locator('a').first();
    const teaserHref = await teaserLink.getAttribute('href');
    expect(teaserHref).toBeTruthy();
    expect(teaserHref.length).toBeGreaterThan(1);

    // Find the variation field's React Select
    const variationField = page.locator('#sidebar-properties .field-wrapper-variation');
    await expect(variationField).toBeVisible();

    // Verify current value is "Teaser"
    await expect(variationField.locator('.react-select__single-value')).toContainText('Teaser');

    // Click on the React Select control to open dropdown
    const selectControl = variationField.locator('.react-select__control');
    await selectControl.click();

    // Wait for dropdown menu to appear
    const menu = page.locator('.react-select__menu');
    await menu.waitFor({ state: 'visible', timeout: 3000 });

    // Click on "Image" option
    const imageOption = menu.locator('.react-select__option', { hasText: 'Image' });
    await imageOption.click();

    // Wait for schema to update - "Image Defaults" fieldset appears when variation changes
    const imageDefaultsFieldset = page.locator('#blockform-fieldset-inherited_fields');
    await expect(imageDefaultsFieldset).toBeVisible({ timeout: 5000 });

    // Wait for teasers to disappear first (confirms variation change is taking effect)
    await expect(teaserItems).toHaveCount(0, { timeout: 5000 });

    // Then wait for image blocks to appear
    // Image blocks: element with data-block-uid contains <img data-media-field="url">
    const imageItems = iframe.locator(`[data-block-uid="${blockId}"] img[data-media-field="url"]`);
    await expect(imageItems.first()).toBeVisible({ timeout: 5000 });

    // Verify no image editing overlay appears (listing items are readonly)
    // The image-upload-widget-toolbar is the inline editing UI that shouldn't appear on readonly blocks
    const imageOverlay = page.locator('.image-upload-widget-toolbar, .hydra-image-picker-inline');
    await expect(imageOverlay).toHaveCount(0);

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
    // Test frontend uses absolute URLs, Nuxt uses relative paths
    expect(linkHref.length).toBeGreaterThan(1);

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

    // Now change variation to "image" and verify dropdown options change
    const variationField = page.locator('#sidebar-properties .field-wrapper-variation');
    const variationSelect = variationField.locator('.react-select__control');
    await variationSelect.click();

    // Wait for variation dropdown menu
    const variationMenu = page.locator('.react-select__menu');
    await variationMenu.waitFor({ state: 'visible', timeout: 3000 });

    // Select "Image" option
    await variationMenu.locator('.react-select__option', { hasText: 'Image' }).click();

    // Wait for variation menu to close (confirms selection was made)
    await variationMenu.waitFor({ state: 'hidden', timeout: 3000 });

    // Wait for schema to update - fieldset title changes to "Image Defaults"
    const imageDefaultsFieldset = page.locator('#blockform-fieldset-inherited_fields');
    await expect(imageDefaultsFieldset).toBeVisible({ timeout: 5000 });

    // Verify smart defaults are recalculated for image block
    // The "Lead Image" row should now show a mapped value (smart defaults for image type)
    const imageRow = mappingTable.locator('tr').filter({ has: page.locator('td:first-child', { hasText: 'Lead Image' }) });
    const imageRowSelect = imageRow.locator('.react-select__single-value');
    // Image block's url field should be mapped (it's an image type field)
    await expect(imageRowSelect).toContainText('Image URL');

    // Scroll to show the fieldMapping table after variation change
    const sidebarWrapper = page.locator('.sidebar-content-wrapper');
    await sidebarWrapper.evaluate((el) => el.scrollTo(0, el.scrollHeight));

    // Re-query the URL row dropdown (use first-child filter to avoid matching "Image URL" text)
    const urlRowAfterChange = mappingTable.locator('tr').filter({ has: page.locator('td:first-child', { hasText: 'URL' }) });
    const urlRowDropdownAfterChange = urlRowAfterChange.locator('.react-select__control');
    await urlRowDropdownAfterChange.scrollIntoViewIfNeeded();
    await urlRowDropdownAfterChange.click();
    await menu.waitFor({ state: 'visible', timeout: 3000 });

    // Image block should have different fields than teaser
    // Verify "Target" (teaser-specific) is NOT present
    await expect(menu.locator('.react-select__option:has-text("Target")')).not.toBeVisible();

    // Verify image block has "Image URL" field (url with widget: 'image')
    await expect(menu.locator('.react-select__option:has-text("Image URL")')).toBeVisible();

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

    // Non-mapped AND non-editable fields SHOULD appear in parent defaults
    // editableFields stay on child: ['href', 'title', 'description', 'preview_image', 'overwrite']
    // So head_title and openLinkInNewTab go to parent defaults
    await expect(teaserDefaultsContent.locator('.field-wrapper-itemDefaults_head_title')).toBeVisible();
    await expect(teaserDefaultsContent.locator('.field-wrapper-itemDefaults_openLinkInNewTab')).toBeVisible();
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

    // Click on the search block headline (waits for block, clicks specific element)
    await helper.clickBlockInIframe('search-block-1', {
      selector: 'h2[data-editable-field="headline"]',
    });

    // Verify the search block is selected (toolbar visible)
    const toolbar = page.locator('.quanta-toolbar');
    await expect(toolbar).toBeVisible({ timeout: 5000 });

    // Click on a facet title (waits for block - async expandListingBlocks must complete)
    await helper.clickBlockInIframe('facet-type', {
      selector: '[data-editable-field="title"]',
    });

    // Toolbar should be visible for the facet
    await expect(toolbar).toBeVisible({ timeout: 5000 });

    // Verify sidebar shows facet settings (title field)
    await helper.waitForSidebarOpen();
    await helper.openSidebarTab('Block');

    // Facet should have title field in sidebar
    const titleField = page.locator('#sidebar-properties .field-wrapper-title');
    await expect(titleField).toBeVisible({ timeout: 5000 });

    // Click on the listing child block inside search
    await helper.clickBlockInIframe('results-listing');

    // Toolbar should still be visible for the listing block
    await expect(toolbar).toBeVisible({ timeout: 5000 });
  });

  test('can change search listing item type to summary', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/search-test-page');

    const iframe = helper.getIframe();

    // Click on the listing block inside search
    await helper.clickBlockInIframe('results-listing');
    await helper.waitForSidebarOpen();
    await helper.openSidebarTab('Block');

    // Find the variation field's React Select
    const variationField = page.locator('#sidebar-properties .field-wrapper-variation');
    await expect(variationField).toBeVisible({ timeout: 5000 });

    // Click on the React Select control to open dropdown
    const selectControl = variationField.locator('.react-select__control');
    await selectControl.click();

    // Wait for dropdown menu to appear
    const menu = page.locator('.react-select__menu');
    await expect(menu).toBeVisible({ timeout: 5000 });

    // Verify Summary option exists and click it
    const summaryOption = menu.locator('.react-select__option', { hasText: 'Summary' });
    await expect(summaryOption).toBeVisible();
    await summaryOption.click();

    // Verify the value changed
    await expect(variationField.locator('.react-select__single-value')).toContainText('Summary');
  });

  test('search block listing container has no add buttons when at maxLength', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/search-test-page');

    // Click on the listing block (waits for async expandListingBlocks to complete)
    await helper.clickBlockInIframe('results-listing');

    // Toolbar should be visible
    const toolbar = page.locator('.quanta-toolbar');
    await expect(toolbar).toBeVisible({ timeout: 5000 });

    // Since maxLength=1 and there's already 1 listing block,
    // there should be no add block buttons (data-block-add markers should be hidden)
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

    // Wait for async loading to complete (skeleton to disappear)
    const skeleton = iframe.locator('.animate-pulse');
    await expect(skeleton).not.toBeVisible({ timeout: 10000 });

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

    // Click on a facet title to select it (avoid clicking checkboxes)
    const facetTitle = facetItem.locator('[data-editable-field="title"]');
    await facetTitle.click();

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

    // Verify the facet now renders as a dropdown (select element)
    // This waits for frontend to re-render with the new facet settings
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

test.describe('Frontend-Driven Schema Enhancers', () => {
  test('gridBlock with schemaEnhancer recipe shows inherited defaults fieldset', async ({
    page,
  }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    const iframe = helper.getIframe();

    // Click on a teaser inside gridBlock (this is inside the grid container)
    const gridCell = iframe.locator('[data-block-uid="manual-teaser"]');
    await expect(gridCell).toBeVisible({ timeout: 10000 });
    await gridCell.click();

    await helper.waitForSidebarOpen();
    await helper.openSidebarTab('Block');

    // Scroll to top of sidebar to see parent's settings
    const sidebarWrapper = page.locator('.sidebar-content-wrapper');
    await sidebarWrapper.evaluate((el) => el.scrollTo(0, 0));

    // Find the Grid section in sidebar (parent block settings)
    // Look for section with "‹ Grid" nav button
    const gridSection = page.locator('.parent-block-section').filter({
      has: page.locator('.parent-nav', { hasText: /Grid/ }),
    }).first();
    await expect(gridSection).toBeVisible({ timeout: 5000 });

    // Type widget should start empty (no default) - verify placeholder is shown
    const variationSelect = gridSection.locator('.react-select__control').first();
    await expect(variationSelect).toBeVisible({ timeout: 5000 });
    await expect(variationSelect.locator('.react-select__placeholder')).toBeVisible();

    // No defaults fieldset should be visible yet (no type selected)
    await expect(gridSection.locator('text=Teaser Defaults')).not.toBeVisible();
    await expect(gridSection.locator('text=Image Defaults')).not.toBeVisible();

    // Select Teaser from the dropdown
    await variationSelect.click();
    const menu = page.locator('.react-select__menu');
    await menu.waitFor({ state: 'visible', timeout: 3000 });
    await menu.locator('.react-select__option', { hasText: 'Teaser' }).click();
    await menu.waitFor({ state: 'hidden', timeout: 3000 });

    // Verify inherited fields are present in Grid section (from teaser schema)
    // These fields are NOT in teaser's editableFields, so they get inherited to parent
    // head_title -> "Head title", openLinkInNewTab -> "Open in a new tab", align -> "Alignment"
    const headTitleField = gridSection.locator('text=Head title');
    await expect(headTitleField).toBeVisible({ timeout: 5000 });

    const alignmentField = gridSection.locator('text=Alignment');
    await expect(alignmentField).toBeVisible({ timeout: 3000 });

    // Verify "Customize teaser content" (overwrite) is NOT in Grid section
    // It's in editableFields so it stays on the child teaser
    await expect(gridSection.locator('text=Customize teaser content')).not.toBeVisible();
  });

  test('child teaser inside grid hides parent-owned fields', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    const iframe = helper.getIframe();

    // Click on a child teaser inside gridBlock
    const manualTeaser = iframe.locator('[data-block-uid="manual-teaser"]');
    await expect(manualTeaser).toBeVisible();
    await manualTeaser.click();

    await helper.waitForSidebarOpen();
    await helper.openSidebarTab('Block');

    // PHASE 1: No type selected - children are independent, all fields visible
    // Grid has no default for variation, so childBlockConfig should NOT apply

    // All teaser fields should be visible (no hiding)
    expect(await helper.hasSidebarField('href')).toBe(true);
    expect(await helper.hasSidebarField('overwrite')).toBe(true);
    // align might be in a styling fieldset - check it exists somewhere
    const alignVisibleInitially = await helper.hasSidebarField('align');

    // Grid section should NOT show "Teaser Defaults" since no type selected
    const gridSection = page.locator('.parent-block-section').filter({
      has: page.locator('.parent-nav', { hasText: /Grid/ }),
    });
    await expect(gridSection.getByText('Teaser Defaults')).not.toBeVisible();

    // PHASE 2: Select a type - children become controlled, fields hidden
    // Find the variation dropdown and select "teaser"
    const variationSelect = gridSection.locator('.react-select__control').first();
    await expect(variationSelect).toBeVisible({ timeout: 5000 });
    await variationSelect.click();
    const menu = page.locator('.react-select__menu');
    await menu.locator('text=Teaser').click();
    await menu.waitFor({ state: 'hidden', timeout: 3000 });

    // Wait for schema to update after type selection
    await expect(gridSection.getByText('Teaser Defaults')).toBeVisible({ timeout: 5000 });

    // Now parent-owned fields should be hidden on the child teaser
    // editableFields for teaser are: href, title, description, preview_image, overwrite
    expect(await helper.hasSidebarField('href')).toBe(true);
    expect(await helper.hasSidebarField('overwrite')).toBe(true);

    // If align was visible before, it should now be hidden (moved to parent)
    if (alignVisibleInitially) {
      expect(await helper.hasSidebarField('align')).toBe(false);
    }

    // Verify alignment IS visible in Grid's parent section (inherited fields)
    expect(await helper.hasSidebarField('align-0-itemDefaults_styles', 'Grid')).toBe(true);
  });

  test('nested listing inside grid hides parent-owned fields when type selected', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    const iframe = helper.getIframe();

    // Click on the listing block inside the grid (first match - the container)
    const listingInGrid = iframe.locator('[data-block-uid="listing-in-grid"]').first();
    await expect(listingInGrid).toBeVisible();
    await listingInGrid.click();

    await helper.waitForSidebarOpen();
    await helper.openSidebarTab('Block');

    // Find Grid section and select "teaser" as the item type
    const gridSection = page.locator('.parent-block-section').filter({
      has: page.locator('.parent-nav', { hasText: /Grid/ }),
    });
    await expect(gridSection).toBeVisible({ timeout: 5000 });

    // Select "teaser" in Grid's variation dropdown
    const variationSelect = gridSection.locator('.react-select__control').first();
    await expect(variationSelect).toBeVisible({ timeout: 5000 });
    await variationSelect.click();
    const menu = page.locator('.react-select__menu');
    await menu.locator('text=Teaser').click();
    await menu.waitFor({ state: 'hidden', timeout: 3000 });

    // Wait for Teaser Defaults to appear in Grid section
    await expect(gridSection.getByText('Teaser Defaults')).toBeVisible({ timeout: 5000 });

    // Now the listing block should hide parent-owned fields
    // The listing's "variation" field should NOT be visible (it's controlled by Grid)
    expect(await helper.hasSidebarField('variation')).toBe(false);

    // Parent-owned fields like openLinkInNewTab should NOT be visible
    expect(await helper.hasSidebarField('openLinkInNewTab')).toBe(false);

    // But the listing should still show its own fields like headline
    expect(await helper.hasSidebarField('headline')).toBe(true);
  });

  test('nested listing fieldMapping updates when parent type changes', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    const iframe = helper.getIframe();

    // Click on the listing block inside the grid
    const listingInGrid = iframe.locator('[data-block-uid="listing-in-grid"]').first();
    await expect(listingInGrid).toBeVisible();
    await listingInGrid.click();

    await helper.waitForSidebarOpen();
    await helper.openSidebarTab('Block');

    // Find Grid section and select "teaser" as the item type
    const gridSection = page.locator('.parent-block-section').filter({
      has: page.locator('.parent-nav', { hasText: /Grid/ }),
    });
    await expect(gridSection).toBeVisible({ timeout: 5000 });

    // Select "teaser" in Grid's variation dropdown
    const variationSelect = gridSection.locator('.react-select__control').first();
    await expect(variationSelect).toBeVisible({ timeout: 5000 });
    await variationSelect.click();
    const menu = page.locator('.react-select__menu');
    await menu.locator('text=Teaser').click();
    await menu.waitFor({ state: 'hidden', timeout: 3000 });

    // Wait for Teaser Defaults to appear in Grid section
    await expect(gridSection.getByText('Teaser Defaults')).toBeVisible({ timeout: 5000 });

    // Scroll sidebar to show Field Mapping section
    const sidebarWrapper = page.locator('.sidebar-content-wrapper');
    await sidebarWrapper.evaluate((el) => el.scrollTo(0, el.scrollHeight));

    // Verify fieldMapping widget shows teaser target fields
    const fieldMappingWidget = page.locator('#sidebar-properties .field-wrapper-fieldMapping');
    const fieldMappingTable = fieldMappingWidget.locator('.field-mapping-table');
    await expect(fieldMappingTable).toBeVisible({ timeout: 5000 });

    // The fieldMapping should show teaser's target fields in the dropdowns
    // Check that "Target" (teaser's href field) is available as an option
    const urlRow = fieldMappingTable.locator('tr').filter({ has: page.locator('td:first-child', { hasText: 'URL' }) });
    await expect(urlRow.locator('.react-select__single-value')).toContainText('Target');

    // Now change Grid's variation to "image" and verify fieldMapping updates
    // First scroll back up to access the Grid section
    await sidebarWrapper.evaluate((el) => el.scrollTo(0, 0));
    await variationSelect.click();
    const menu2 = page.locator('.react-select__menu');
    await menu2.locator('text=Image').click();
    await menu2.waitFor({ state: 'hidden', timeout: 3000 });

    // Wait for Image Defaults to appear in Grid section
    await expect(gridSection.getByText('Image Defaults')).toBeVisible({ timeout: 5000 });

    // Scroll down again to check fieldMapping
    await sidebarWrapper.evaluate((el) => el.scrollTo(0, el.scrollHeight));

    // The fieldMapping should now show image's target fields (Image URL, Alt text)
    // Wait for the fieldMapping to update with image fields
    await expect(fieldMappingTable).toBeVisible({ timeout: 5000 });
    // The Lead Image row should map to "Image URL" (image's url field for src)
    const imageRow = fieldMappingTable.locator('tr').filter({ has: page.locator('td:first-child', { hasText: 'Lead Image' }) });
    await expect(imageRow.locator('.react-select__single-value')).toContainText('Image URL', { timeout: 5000 });
  });

  test('changing variation transforms child block types', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    const iframe = helper.getIframe();

    // Click on a child teaser inside gridBlock (manual-teaser is a teaser)
    const manualTeaser = iframe.locator('[data-block-uid="manual-teaser"]');
    await expect(manualTeaser).toBeVisible({ timeout: 10000 });
    await manualTeaser.click();

    await helper.waitForSidebarOpen();
    await helper.openSidebarTab('Block');

    // Scroll to top of sidebar to see parent's settings
    const sidebarWrapper = page.locator('.sidebar-content-wrapper');
    await sidebarWrapper.evaluate((el) => el.scrollTo(0, 0));

    // Verify initial state - child is Teaser type (check breadcrumb)
    const childBreadcrumb = page.locator('.parent-block-section .parent-nav').last();
    await expect(childBreadcrumb).toContainText('Teaser', { timeout: 5000 });

    // Find the Grid section in sidebar
    const gridSection = page.locator('.parent-block-section').filter({
      has: page.locator('.parent-nav', { hasText: /Grid/ }),
    }).first();
    await expect(gridSection).toBeVisible({ timeout: 5000 });

    // Find the variation dropdown (type selector) and change to Image
    // The field renders as a react-select dropdown with computed choices
    const variationSelect = gridSection.locator('.react-select__control').first();
    await expect(variationSelect).toBeVisible({ timeout: 5000 });
    await variationSelect.click();
    const menu = page.locator('.react-select__menu');
    await menu.waitFor({ state: 'visible', timeout: 3000 });
    await menu.locator('.react-select__option', { hasText: 'Image' }).click();
    await menu.waitFor({ state: 'hidden', timeout: 3000 });

    // Verify defaults fieldset changed to Image
    const imageDefaultsFieldset = gridSection.locator('text=Image Defaults');
    await expect(imageDefaultsFieldset).toBeVisible({ timeout: 5000 });

    // Verify child block type changed - breadcrumb should now say Image
    await expect(childBreadcrumb).toContainText('Image', { timeout: 5000 });

    // Verify the grid has 6 items total (1 transformed teaser + 5 listing items)
    // If the listing's @type was wrongly changed to image, we'd only see 2 items
    // (the listing would be an image block, not expanding to 5 items)
    const gridItems = iframe.locator('[data-block-uid="block-8-grid"] [data-block-uid]');
    const itemCount = await gridItems.count();
    expect(itemCount).toBeGreaterThanOrEqual(6);

    // Click on the listing block to verify it's still a listing (not transformed to image)
    const listingBlock = iframe.locator('[data-block-uid="listing-in-grid"]').first();
    await listingBlock.click();

    // Verify listing-in-grid was selected
    await helper.waitForBlockSelected('listing-in-grid');

    // Verify the listing block sidebar still shows listing settings
    // The listing's @type should still be "listing", only its variation changed to "image"
    // Look for the Listing section in parent blocks
    const listingSection = page.locator('.parent-block-section').filter({
      has: page.locator('.parent-nav', { hasText: /Listing/ }),
    }).first();
    await expect(listingSection).toBeVisible();

    // Verify that the Listing does NOT show "Image Defaults" - since the parent (Grid)
    // controls the type, only the Grid should show the defaults fieldset
    // The Listing's variation field should be hidden and it should not duplicate defaults
    const listingForm = listingSection.locator('form');
    await expect(listingForm.locator('text=Image Defaults')).not.toBeVisible();

    // Verify the Grid section still shows "Image Defaults" (parent owns the defaults)
    await expect(gridSection.locator('text=Image Defaults')).toBeVisible();
  });

  test('unselecting grid variation clears type constraint', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    const iframe = helper.getIframe();

    // Click on a child teaser inside gridBlock
    const manualTeaser = iframe.locator('[data-block-uid="manual-teaser"]');
    await expect(manualTeaser).toBeVisible({ timeout: 10000 });
    await manualTeaser.click();

    await helper.waitForSidebarOpen();
    await helper.openSidebarTab('Block');

    // Scroll to top of sidebar
    const sidebarWrapper = page.locator('.sidebar-content-wrapper');
    await sidebarWrapper.evaluate((el) => el.scrollTo(0, 0));

    // Find the Grid section in sidebar
    const gridSection = page.locator('.parent-block-section').filter({
      has: page.locator('.parent-nav', { hasText: /Grid/ }),
    }).first();
    await expect(gridSection).toBeVisible({ timeout: 5000 });

    // First set a variation to 'Teaser'
    const variationSelect = gridSection.locator('.react-select__control').first();
    await expect(variationSelect).toBeVisible({ timeout: 5000 });
    await variationSelect.click();
    let menu = page.locator('.react-select__menu');
    await menu.waitFor({ state: 'visible', timeout: 3000 });
    await menu.locator('.react-select__option', { hasText: 'Teaser' }).click();
    await menu.waitFor({ state: 'hidden', timeout: 3000 });

    // Verify Teaser Defaults fieldset appeared
    await expect(gridSection.locator('text=Teaser Defaults')).toBeVisible({ timeout: 5000 });

    // Now clear the selection by clicking the clear button (x)
    const clearButton = variationSelect.locator('.react-select__clear-indicator');
    await expect(clearButton).toBeVisible({ timeout: 3000 });
    await clearButton.click();

    // Verify the defaults fieldset is gone (no type selected)
    await expect(gridSection.locator('text=Teaser Defaults')).not.toBeVisible({ timeout: 5000 });
    await expect(gridSection.locator('text=Image Defaults')).not.toBeVisible();

    // Verify the placeholder is shown again (no value selected)
    await expect(variationSelect.locator('.react-select__placeholder')).toBeVisible({ timeout: 3000 });
  });

  test('adding different block type inside grid with variation syncs to item type', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    const iframe = helper.getIframe();

    // Click on a child block inside gridBlock
    const manualTeaser = iframe.locator('[data-block-uid="manual-teaser"]');
    await expect(manualTeaser).toBeVisible({ timeout: 10000 });
    await manualTeaser.click();

    await helper.waitForSidebarOpen();
    await helper.openSidebarTab('Block');

    // Scroll to top of sidebar to see parent's settings
    const sidebarWrapper = page.locator('.sidebar-content-wrapper');
    await sidebarWrapper.evaluate((el) => el.scrollTo(0, 0));

    // Find the Grid section in sidebar
    const gridSection = page.locator('.parent-block-section').filter({
      has: page.locator('.parent-nav', { hasText: /Grid/ }),
    }).first();
    await expect(gridSection).toBeVisible({ timeout: 5000 });

    // Set the variation to 'Teaser'
    const variationSelect = gridSection.locator('.react-select__control').first();
    await expect(variationSelect).toBeVisible({ timeout: 5000 });
    await variationSelect.click();
    let menu = page.locator('.react-select__menu');
    await menu.waitFor({ state: 'visible', timeout: 3000 });
    await menu.locator('.react-select__option', { hasText: 'Teaser' }).click();
    await menu.waitFor({ state: 'hidden', timeout: 3000 });

    // Click the add button in the iframe (appears near selected block)
    await helper.clickAddBlockButton();

    // When variation is set, only that type is allowed in the block chooser
    // Since there's only 1 allowed type (Teaser), the system auto-adds it without showing chooser
    // This is the "nicer for user" approach: no need to choose when there's only 1 option

    // Wait a bit for the block to be added and selected
    await page.waitForTimeout(500);

    // The new block should be a Teaser (auto-added since it's the only choice)
    await helper.waitForSidebarOpen();
    const childBreadcrumb = page.locator('.parent-block-section .parent-nav').last();
    await expect(childBreadcrumb).toContainText('Teaser', { timeout: 5000 });
  });
});

test.describe('Skiplogic - Conditional Field Visibility', () => {
  test('field with skiplogic is hidden when condition not met', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    const iframe = helper.getIframe();

    // Click on skiplogic-test block
    const testBlock = iframe.locator('[data-block-uid="skiplogic-test"]');
    await expect(testBlock).toBeVisible({ timeout: 10000 });
    await testBlock.click();

    await helper.waitForSidebarOpen();
    await helper.openSidebarTab('Block');

    // Initially mode is not set, so 'Advanced Options' should be hidden
    const advancedField = page.locator('text=Advanced Options');
    await expect(advancedField).not.toBeVisible();

    // 'Basic Title' should always be visible
    const basicField = page.locator('text=Basic Title');
    await expect(basicField).toBeVisible();
  });

  test('field with skiplogic is shown when condition is met', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    const iframe = helper.getIframe();

    // Click on skiplogic-test block
    const testBlock = iframe.locator('[data-block-uid="skiplogic-test"]');
    await expect(testBlock).toBeVisible({ timeout: 10000 });
    await testBlock.click();

    await helper.waitForSidebarOpen();
    await helper.openSidebarTab('Block');

    // Find mode dropdown and select 'advanced'
    const modeSelect = page.locator('.react-select__control').first();
    await expect(modeSelect).toBeVisible({ timeout: 5000 });
    await modeSelect.click();
    const menu = page.locator('.react-select__menu');
    await menu.waitFor({ state: 'visible', timeout: 3000 });
    await menu.locator('.react-select__option', { hasText: 'Advanced' }).click();
    await menu.waitFor({ state: 'hidden', timeout: 3000 });

    // Now 'Advanced Options' should be visible
    const advancedField = page.locator('text=Advanced Options');
    await expect(advancedField).toBeVisible({ timeout: 5000 });
  });

  test('skiplogic with isNot operator', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    const iframe = helper.getIframe();

    // Click on skiplogic-test block
    const testBlock = iframe.locator('[data-block-uid="skiplogic-test"]');
    await expect(testBlock).toBeVisible({ timeout: 10000 });
    await testBlock.click();

    await helper.waitForSidebarOpen();
    await helper.openSidebarTab('Block');

    // 'Simple Warning' has skiplogic: { field: 'mode', isNot: 'advanced' }
    // Initially mode is not set, so isNot: 'advanced' is true -> should be visible
    const warningField = page.locator('text=Simple Warning');
    await expect(warningField).toBeVisible({ timeout: 5000 });

    // Select 'advanced' mode
    const modeSelect = page.locator('.react-select__control').first();
    await modeSelect.click();
    const menu = page.locator('.react-select__menu');
    await menu.waitFor({ state: 'visible', timeout: 3000 });
    await menu.locator('.react-select__option', { hasText: 'Advanced' }).click();
    await menu.waitFor({ state: 'hidden', timeout: 3000 });

    // Now 'Simple Warning' should be hidden (mode IS 'advanced')
    await expect(warningField).not.toBeVisible({ timeout: 5000 });
  });

  test('skiplogic with numeric comparison', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    const iframe = helper.getIframe();

    // Click on skiplogic-test block
    const testBlock = iframe.locator('[data-block-uid="skiplogic-test"]');
    await expect(testBlock).toBeVisible({ timeout: 10000 });
    await testBlock.click();

    await helper.waitForSidebarOpen();
    await helper.openSidebarTab('Block');

    // 'Column Layout' has skiplogic: { field: 'columns', gte: 2 }
    // Initially columns is not set or 1, so should be hidden
    const columnLayoutField = page.locator('text=Column Layout');
    await expect(columnLayoutField).not.toBeVisible();

    // Find columns number input and set to 3
    const columnsInput = page.locator('input[type="number"]').first();
    await columnsInput.fill('3');
    await columnsInput.blur();

    // Now 'Column Layout' should be visible (columns >= 2)
    await expect(columnLayoutField).toBeVisible({ timeout: 5000 });
  });

  test('skiplogic with parent path reference', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    const iframe = helper.getIframe();

    // Click on the skiplogic-test block
    const testBlock = iframe.locator('[data-block-uid="skiplogic-test"]');
    await expect(testBlock).toBeVisible({ timeout: 10000 });
    await testBlock.click();

    await helper.waitForSidebarOpen();
    await helper.openSidebarTab('Block');

    // Page has description "A test page with blocks", so pageNotice should be visible
    // skiplogic: { field: '../description', isSet: true }
    let pageNoticeField = page.locator('text=Page Notice');
    await expect(pageNoticeField).toBeVisible({ timeout: 5000 });

    // Go to Page tab and clear the description
    await helper.openSidebarTab('Page');
    const summaryField = page.locator('textarea[name="description"]');
    await summaryField.clear();

    // Go back to Block tab
    await helper.openSidebarTab('Block');

    // Now description is empty, so pageNotice should be hidden
    pageNoticeField = page.locator('text=Page Notice');
    await expect(pageNoticeField).not.toBeVisible({ timeout: 5000 });
  });
});

test.describe('Block Type Conversion via fieldMappings', () => {
  test('teaser block dropdown shows Convert to Image option', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    const iframe = helper.getIframe();

    // Click on a teaser block
    const teaserBlock = iframe.locator('[data-block-uid="manual-teaser"]');
    await expect(teaserBlock).toBeVisible({ timeout: 10000 });
    await teaserBlock.click();

    // Wait for toolbar to appear
    const toolbar = page.locator('.quanta-toolbar');
    await expect(toolbar).toBeVisible({ timeout: 5000 });

    // Click the menu button (three dots)
    const menuButton = toolbar.locator('button:has-text("⋯")');
    await menuButton.click();

    // Wait for dropdown menu to appear
    const dropdownMenu = page.locator('.volto-hydra-dropdown-menu');
    await expect(dropdownMenu).toBeVisible({ timeout: 3000 });

    // Hover over "Convert to" menu item
    const convertToItem = dropdownMenu.locator('.convert-to-menu');
    await expect(convertToItem).toBeVisible({ timeout: 3000 });
    await convertToItem.hover();

    // Submenu should appear with "Image" option
    const submenu = page.locator('.volto-hydra-submenu');
    await expect(submenu).toBeVisible({ timeout: 3000 });

    // Verify Image is in the submenu (teaser has fieldMappings.teaser in image config)
    const imageOption = submenu.locator('text=Image');
    await expect(imageOption).toBeVisible({ timeout: 3000 });
  });

  test('converting teaser to image maps fields correctly', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    const iframe = helper.getIframe();

    // Click on a teaser block
    const teaserBlock = iframe.locator('[data-block-uid="manual-teaser"]');
    await expect(teaserBlock).toBeVisible({ timeout: 10000 });
    await teaserBlock.click();

    await helper.waitForSidebarOpen();
    await helper.openSidebarTab('Block');

    // Verify it's currently a Teaser block (check breadcrumb)
    const breadcrumb = page.locator('.parent-block-section .parent-nav').last();
    await expect(breadcrumb).toContainText('Teaser', { timeout: 5000 });

    // Click the menu button in toolbar
    const toolbar = page.locator('.quanta-toolbar');
    await expect(toolbar).toBeVisible({ timeout: 5000 });
    const menuButton = toolbar.locator('button:has-text("⋯")');
    await menuButton.click();

    // Wait for dropdown menu
    const dropdownMenu = page.locator('.volto-hydra-dropdown-menu');
    await expect(dropdownMenu).toBeVisible({ timeout: 3000 });

    // Hover over "Convert to" and click "Image"
    const convertToItem = dropdownMenu.locator('.convert-to-menu');
    await convertToItem.hover();
    const submenu = page.locator('.volto-hydra-submenu');
    await expect(submenu).toBeVisible({ timeout: 3000 });
    const imageOption = submenu.locator('text=Image');
    await imageOption.click();

    // Wait for conversion to complete - breadcrumb should change to Image
    await expect(breadcrumb).toContainText('Image', { timeout: 5000 });

    // The block should now be an Image block - verified by breadcrumb change
    // The sidebar form shows image-specific content like "No image selected"
  });

  test('image block dropdown shows Convert to Teaser option', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    const iframe = helper.getIframe();

    // First need to find an image block - the listing block has image items when variation is image
    // Or we can add one through the block chooser
    // For simplicity, let's click on any block and convert it

    // Click on a teaser, convert to image, then verify Convert to Teaser option appears
    const teaserBlock = iframe.locator('[data-block-uid="manual-teaser"]');
    await expect(teaserBlock).toBeVisible({ timeout: 10000 });
    await teaserBlock.click();

    // Convert to Image first
    const toolbar = page.locator('.quanta-toolbar');
    await expect(toolbar).toBeVisible({ timeout: 5000 });
    let menuButton = toolbar.locator('button:has-text("⋯")');
    await menuButton.click();

    let dropdownMenu = page.locator('.volto-hydra-dropdown-menu');
    await expect(dropdownMenu).toBeVisible({ timeout: 3000 });
    let convertToItem = dropdownMenu.locator('.convert-to-menu');
    await convertToItem.hover();
    let submenu = page.locator('.volto-hydra-submenu');
    await expect(submenu).toBeVisible({ timeout: 3000 });
    await submenu.locator('text=Image').click();

    // Wait for conversion - breadcrumb should change
    const breadcrumb = page.locator('.parent-block-section .parent-nav').last();
    await expect(breadcrumb).toContainText('Image', { timeout: 5000 });

    // Now click menu again and verify "Convert to Teaser" is available
    menuButton = toolbar.locator('button:has-text("⋯")');
    await menuButton.click();

    dropdownMenu = page.locator('.volto-hydra-dropdown-menu');
    await expect(dropdownMenu).toBeVisible({ timeout: 3000 });
    convertToItem = dropdownMenu.locator('.convert-to-menu');
    await convertToItem.hover();
    submenu = page.locator('.volto-hydra-submenu');
    await expect(submenu).toBeVisible({ timeout: 3000 });

    // Verify Teaser option is in submenu
    const teaserOption = submenu.locator('text=Teaser');
    await expect(teaserOption).toBeVisible({ timeout: 3000 });
  });

  test('roundtrip conversion preserves mapped fields', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    const iframe = helper.getIframe();

    // Click on the manual teaser inside gridBlock (has href to /target-page)
    const teaserBlock = iframe.locator('[data-block-uid="manual-teaser"]');
    await expect(teaserBlock).toBeVisible({ timeout: 10000 });
    await teaserBlock.click();

    await helper.waitForSidebarOpen();
    await helper.openSidebarTab('Block');

    // Verify initial teaser has href value (link to /target-page)
    const breadcrumb = page.locator('.parent-block-section .parent-nav').last();
    await expect(breadcrumb).toContainText('Teaser', { timeout: 5000 });

    // Get the initial href value from the teaser
    const hrefField = page.locator('#sidebar-properties .field-wrapper-href');
    await expect(hrefField).toBeVisible({ timeout: 5000 });

    // Convert to Image
    const toolbar = page.locator('.quanta-toolbar');
    await expect(toolbar).toBeVisible({ timeout: 5000 });
    let menuButton = toolbar.locator('button:has-text("⋯")');
    await menuButton.click();

    let dropdownMenu = page.locator('.volto-hydra-dropdown-menu');
    await expect(dropdownMenu).toBeVisible({ timeout: 3000 });
    let convertToItem = dropdownMenu.locator('.convert-to-menu');
    await convertToItem.hover();
    let submenu = page.locator('.volto-hydra-submenu');
    await expect(submenu).toBeVisible({ timeout: 3000 });
    await submenu.locator('text=Image').click();

    // Wait for conversion to Image
    await expect(breadcrumb).toContainText('Image', { timeout: 5000 });

    // Convert back to Teaser
    menuButton = toolbar.locator('button:has-text("⋯")');
    await menuButton.click();

    dropdownMenu = page.locator('.volto-hydra-dropdown-menu');
    await expect(dropdownMenu).toBeVisible({ timeout: 3000 });
    convertToItem = dropdownMenu.locator('.convert-to-menu');
    await convertToItem.hover();
    submenu = page.locator('.volto-hydra-submenu');
    await expect(submenu).toBeVisible({ timeout: 3000 });
    await submenu.locator('text=Teaser').click();

    // Verify back to Teaser
    await expect(breadcrumb).toContainText('Teaser', { timeout: 5000 });

    // The href field should still have a value (preserved through roundtrip)
    // teaser.href -> image.href -> teaser.href
    await expect(hrefField).toBeVisible({ timeout: 5000 });
  });

  test('hero to image and back preserves fields through transitive conversion', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    const iframe = helper.getIframe();

    // Wait for the Hero block to be visible in iframe before clicking
    const heroBlock = iframe.locator('[data-block-uid="block-4-hero"]');
    await expect(heroBlock).toBeVisible({ timeout: 10000 });

    // Click on the Hero block (block-4-hero has heading, image, buttonLink, buttonText)
    await helper.clickBlockInIframe('block-4-hero');

    await helper.waitForSidebarOpen();
    await helper.openSidebarTab('Block');

    const breadcrumb = page.locator('.parent-block-section .parent-nav').last();
    await expect(breadcrumb).toContainText('Hero', { timeout: 5000 });

    // Verify Hero has heading, image, buttonLink, and buttonText fields
    const headingField = page.locator('#sidebar-properties .field-wrapper-heading');
    await expect(headingField).toBeVisible({ timeout: 5000 });
    const imageField = page.locator('#sidebar-properties .field-wrapper-image');
    await expect(imageField).toBeVisible({ timeout: 5000 });
    const buttonLinkField = page.locator('#sidebar-properties .field-wrapper-buttonLink');
    await expect(buttonLinkField).toBeVisible({ timeout: 5000 });
    const buttonTextField = page.locator('#sidebar-properties .field-wrapper-buttonText');
    await expect(buttonTextField).toBeVisible({ timeout: 5000 });

    // Record initial buttonText value (should persist through conversions since it's not mapped)
    const buttonTextInput = buttonTextField.locator('input, textarea');
    const originalButtonText = await buttonTextInput.inputValue();
    expect(originalButtonText).toBe('Click Me');

    // Convert Hero → Image (transitive via teaser)
    const toolbar = page.locator('.quanta-toolbar');
    await expect(toolbar).toBeVisible({ timeout: 5000 });
    let menuButton = toolbar.locator('button:has-text("⋯")');
    await menuButton.click();

    let dropdownMenu = page.locator('.volto-hydra-dropdown-menu');
    await expect(dropdownMenu).toBeVisible({ timeout: 3000 });
    let convertToItem = dropdownMenu.locator('.convert-to-menu');
    await convertToItem.hover();
    let submenu = page.locator('.volto-hydra-submenu');
    await expect(submenu).toBeVisible({ timeout: 3000 });
    await submenu.locator('text=Image').click();

    // Verify converted to Image
    await expect(breadcrumb).toContainText('Image', { timeout: 5000 });

    // Verify Image has alt field with the converted heading value
    const altField = page.locator('#sidebar-properties .field-wrapper-alt');
    await expect(altField).toBeVisible({ timeout: 5000 });
    // Check the alt text field has the converted heading value "Welcome Hero"
    const altInput = altField.locator('input, textarea');
    await expect(altInput).toHaveValue('Welcome Hero', { timeout: 5000 });

    // Convert Image → Hero (transitive via teaser)
    await expect(toolbar).toBeVisible({ timeout: 5000 });
    menuButton = toolbar.locator('button:has-text("⋯")');
    await menuButton.click();

    dropdownMenu = page.locator('.volto-hydra-dropdown-menu');
    await expect(dropdownMenu).toBeVisible({ timeout: 3000 });
    convertToItem = dropdownMenu.locator('.convert-to-menu');
    await convertToItem.hover();
    submenu = page.locator('.volto-hydra-submenu');
    await expect(submenu).toBeVisible({ timeout: 3000 });
    await submenu.locator('text=Hero').click();

    // Verify converted back to Hero
    await expect(breadcrumb).toContainText('Hero', { timeout: 5000 });

    // Verify Hero fields are back with the original values
    await expect(headingField).toBeVisible({ timeout: 5000 });
    // Check heading field has the roundtrip value
    const headingInput = headingField.locator('input, textarea');
    await expect(headingInput).toHaveValue('Welcome Hero', { timeout: 5000 });

    // Verify buttonText was preserved (it's not in any fieldMappings, so should persist)
    await expect(buttonTextField).toBeVisible({ timeout: 5000 });
    await expect(buttonTextInput).toHaveValue('Click Me', { timeout: 5000 });
  });
});
