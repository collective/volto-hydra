/**
 * Tests for teaser block starter UI.
 * When a teaser block has an empty required 'href' field, a starter UI overlay
 * should appear with an AddLinkForm to help the user select a target page.
 */
import { test, expect } from '@playwright/test';
import { AdminUIHelper } from '../helpers/AdminUIHelper';

test.describe('Teaser Starter UI', () => {
  test('shows starter UI overlay for empty teaser href field', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/test-page');

    const iframe = helper.getIframe();

    // Find and click the empty teaser block
    const emptyTeaser = iframe.locator('[data-block-uid="block-6-empty-teaser"]');
    await expect(emptyTeaser).toBeVisible({ timeout: 10000 });
    await emptyTeaser.click();

    // Wait for block to be selected (outline appears)
    const outline = page.locator('.volto-hydra-block-outline');
    await expect(outline).toBeVisible({ timeout: 5000 });

    // The starter UI overlay should appear with link icon and AddLinkForm
    const starterOverlay = page.locator('.starter-ui-overlay');
    await expect(starterOverlay).toBeVisible({ timeout: 5000 });

    // Should have the link form input
    const linkInput = starterOverlay.locator('input[name="link"]');
    await expect(linkInput).toBeVisible();
  });

  test('does not show starter UI for teaser with href filled', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/test-page');

    const iframe = helper.getIframe();

    // Find and click the filled teaser block
    const filledTeaser = iframe.locator('[data-block-uid="block-7-filled-teaser"]');
    await expect(filledTeaser).toBeVisible({ timeout: 10000 });
    await filledTeaser.click();

    // Wait for block to be selected
    const outline = page.locator('.volto-hydra-block-outline');
    await expect(outline).toBeVisible({ timeout: 5000 });

    // Starter UI should NOT appear (teaser has href filled)
    const starterOverlay = page.locator('.starter-ui-overlay');
    await expect(starterOverlay).not.toBeVisible();
  });

  test('teaser shows target page title and description from href', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/test-page');

    const iframe = helper.getIframe();

    // Find the filled teaser block
    const filledTeaser = iframe.locator('[data-block-uid="block-7-filled-teaser"]');
    await expect(filledTeaser).toBeVisible({ timeout: 10000 });

    // Teaser should show title from href[0].title (not a custom block.title)
    // Use h3, h5 to support both mock (h3) and Nuxt (h5) frontends
    const title = filledTeaser.locator('h3, h5');
    await expect(title).toHaveText('Target Page');

    // Teaser should show description from href[0].description
    const description = filledTeaser.locator('p').first();
    await expect(description).toHaveText('Target page description');
  });

  test('teaser title becomes editable after clicking customize checkbox', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/test-page');

    const iframe = helper.getIframe();

    // Click the filled teaser to select it
    const filledTeaser = iframe.locator('[data-block-uid="block-7-filled-teaser"]');
    await expect(filledTeaser).toBeVisible({ timeout: 10000 });
    await filledTeaser.click();

    // Wait for block to be selected
    const outline = page.locator('.volto-hydra-block-outline');
    await expect(outline).toBeVisible({ timeout: 5000 });

    // Title element should NOT have data-editable-field initially (overwrite is false)
    // When overwrite is false, we show the target's title which isn't editable
    const titleLocator = filledTeaser.locator('[data-editable-field="title"]');
    await expect(titleLocator).toHaveCount(0);

    // Click the "Customize teaser content" checkbox in sidebar
    // The checkbox might be rendered as a Semantic UI checkbox, not a standard label
    const customizeCheckbox = page.locator('text=Customize teaser content');
    await expect(customizeCheckbox).toBeVisible({ timeout: 5000 });
    await customizeCheckbox.click();

    // After enabling customize, title SHOULD have data-editable-field and be contenteditable
    await expect(titleLocator).toHaveCount(1, { timeout: 5000 });
    await expect(titleLocator).toHaveAttribute('contenteditable', 'true');
  });

  test('can select target in starter UI and fill teaser href', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/test-page');

    const iframe = helper.getIframe();

    // Click the empty teaser (scroll into center of view so overlay has room)
    const emptyTeaser = iframe.locator('[data-block-uid="block-6-empty-teaser"]');
    await expect(emptyTeaser).toBeVisible({ timeout: 10000 });
    await emptyTeaser.scrollIntoViewIfNeeded();
    await page.waitForTimeout(200); // Wait for scroll to settle
    await emptyTeaser.click();

    // Wait for starter UI
    const starterOverlay = page.locator('.starter-ui-overlay');
    await expect(starterOverlay).toBeVisible({ timeout: 5000 });

    // Open object browser from starter UI (use force since it may be at edge of viewport)
    const browseButton = starterOverlay.locator('button[aria-label="Open object browser"]');
    await expect(browseButton).toBeVisible({ timeout: 5000 });
    await browseButton.click({ force: true });
    const objectBrowser = await helper.waitForObjectBrowser();

    // Select "Another Page" from the object browser (helper closes it if needed)
    await helper.objectBrowserSelectItem(objectBrowser, /Another Page/);

    // Submit the AddLinkForm if still open
    await helper.submitAddLinkFormIfOpen(starterOverlay);

    // After submitting, the starter UI should disappear (href is now filled)
    await expect(starterOverlay).not.toBeVisible({ timeout: 5000 });

    // Verify the teaser now has the "Read more" link with correct href
    // Note: Title/description aren't shown because AddLinkForm only sets @id,
    // not the full metadata. This would require the object_browser widget to
    // resolve the target's metadata, which is a future enhancement.
    const readMoreLink = emptyTeaser.locator('a').first();
    await expect(readMoreLink).toBeVisible({ timeout: 5000 });
    await expect(readMoreLink).toHaveAttribute('href', /another-page/);
  });

  test('clicking Read more link does not navigate and shows link icon', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/test-page');

    const iframe = helper.getIframe();

    // Find and click the filled teaser's "Read more" link (second linkable href element)
    const filledTeaser = iframe.locator('[data-block-uid="block-7-filled-teaser"]');
    await expect(filledTeaser).toBeVisible({ timeout: 10000 });

    const readMoreLink = filledTeaser.locator('a[data-linkable-field="href"]').last();
    await expect(readMoreLink).toBeVisible();

    // Get current URL before clicking
    const urlBefore = page.url();

    // Click the link
    await readMoreLink.click();

    // URL should NOT change (navigation prevented)
    expect(page.url()).toBe(urlBefore);

    // Block should be selected
    const outline = page.locator('.volto-hydra-block-outline');
    await expect(outline).toBeVisible({ timeout: 5000 });

    // Link icon should appear in toolbar for editing href
    const linkIcon = page.locator('button[title="Edit link (href)"]');
    await expect(linkIcon).toBeVisible({ timeout: 5000 });
  });

  test('clicking teaser title shows link icon for editing href', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/test-page');

    const iframe = helper.getIframe();

    // Find the filled teaser's title link (first linkable href element wrapping h3)
    const filledTeaser = iframe.locator('[data-block-uid="block-7-filled-teaser"]');
    await expect(filledTeaser).toBeVisible({ timeout: 10000 });

    const titleLink = filledTeaser.locator('a[data-linkable-field="href"]').first();
    await expect(titleLink).toBeVisible();

    // Get current URL before clicking
    const urlBefore = page.url();

    // Click the title
    await titleLink.click();

    // URL should NOT change (navigation prevented)
    expect(page.url()).toBe(urlBefore);

    // Block should be selected
    const outline = page.locator('.volto-hydra-block-outline');
    await expect(outline).toBeVisible({ timeout: 5000 });

    // Link icon should appear in toolbar for editing href
    const linkIcon = page.locator('button[title="Edit link (href)"]');
    await expect(linkIcon).toBeVisible({ timeout: 5000 });
  });

  test('clicking Read more link on unselected block does not navigate', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/test-page');

    const iframe = helper.getIframe();

    // First, click a different block to ensure teaser is NOT selected
    const slateBlock = iframe.locator('[data-block-uid="block-1-uuid"]');
    await expect(slateBlock).toBeVisible({ timeout: 10000 });
    await slateBlock.click();

    // Wait for that block to be selected
    const outline = page.locator('.volto-hydra-block-outline');
    await expect(outline).toBeVisible({ timeout: 5000 });

    // Get current URL before clicking the teaser link
    const urlBefore = page.url();

    // Now click the "Read more" link in the teaser (which is NOT selected)
    const filledTeaser = iframe.locator('[data-block-uid="block-7-filled-teaser"]');
    const readMoreLink = filledTeaser.locator('a[data-linkable-field="href"]').last();
    await expect(readMoreLink).toBeVisible();
    await readMoreLink.click();

    // URL should NOT change (navigation should be prevented even for unselected block)
    expect(page.url()).toBe(urlBefore);
  });
});
