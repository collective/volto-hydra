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

  test('can enter URL in starter UI and fill teaser href', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/test-page');

    const iframe = helper.getIframe();

    // Click the empty teaser
    const emptyTeaser = iframe.locator('[data-block-uid="block-6-empty-teaser"]');
    await expect(emptyTeaser).toBeVisible({ timeout: 10000 });
    await emptyTeaser.click();

    // Wait for starter UI
    const starterOverlay = page.locator('.starter-ui-overlay');
    await expect(starterOverlay).toBeVisible({ timeout: 5000 });

    // Enter a URL
    const linkInput = starterOverlay.locator('input[name="link"]');
    await linkInput.fill('https://example.com/test-page');

    // Submit the form
    const submitButton = starterOverlay.locator('button[aria-label="Submit"]');
    await submitButton.click();

    // After submitting, the starter UI should disappear (href is now filled)
    await expect(starterOverlay).not.toBeVisible({ timeout: 5000 });
  });

  test('clicking Read more link does not navigate and shows link icon', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/test-page');

    const iframe = helper.getIframe();

    // Find and click the filled teaser's "Read more" link
    const filledTeaser = iframe.locator('[data-block-uid="block-7-filled-teaser"]');
    await expect(filledTeaser).toBeVisible({ timeout: 10000 });

    const readMoreLink = filledTeaser.locator('a[data-linkable-field="href"]');
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
    const readMoreLink = filledTeaser.locator('a[data-linkable-field="href"]');
    await expect(readMoreLink).toBeVisible();
    await readMoreLink.click();

    // URL should NOT change (navigation should be prevented even for unselected block)
    expect(page.url()).toBe(urlBefore);
  });
});
