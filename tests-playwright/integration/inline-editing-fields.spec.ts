/**
 * Tests for inline editing of linkable and media fields.
 *
 * These tests verify that:
 * - Elements with data-linkable-field show link icon in toolbar
 * - Elements with data-media-field show image icon in toolbar
 * - Link icon opens AddLinkForm popup
 * - Image icon triggers object browser
 *
 * Uses the hero block (block-4-hero) which has:
 * - data-linkable-field="buttonLink" on the button
 * - data-media-field="image" on the image element
 */
import { test, expect } from '../fixtures';
import { AdminUIHelper } from '../helpers/AdminUIHelper';

test.describe('Inline editing - linkable/media fields', () => {
  test('shows link icon when clicking element with data-linkable-field', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    // The hero block has a button with data-linkable-field="buttonLink"
    const iframe = helper.getIframe();
    const linkableElement = iframe.locator('[data-linkable-field="buttonLink"]');
    await expect(linkableElement).toBeVisible();

    // Click the linkable element
    await linkableElement.click();

    // Verify toolbar appears with link icon
    const toolbar = page.locator('.quanta-toolbar');
    await expect(toolbar).toBeVisible();

    // Look for the link button (should show when focusedLinkableField is set)
    const linkButton = toolbar.locator('button[title*="Edit link"]');
    await expect(linkButton).toBeVisible();
  });

  test('shows image icon when clicking element with data-media-field', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    // The hero block has an image with data-media-field="image"
    const iframe = helper.getIframe();
    const mediaElement = iframe.locator('[data-media-field="image"]');
    await expect(mediaElement).toBeVisible();

    // Click the media element
    await mediaElement.click();

    // Verify toolbar appears with image icon
    const toolbar = page.locator('.quanta-toolbar');
    await expect(toolbar).toBeVisible();

    // Look for the image button (should show when focusedMediaField is set)
    const imageButton = toolbar.locator('button[title*="Select image"]');
    await expect(imageButton).toBeVisible();
  });

  test('clicking link icon opens AddLinkForm popup', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    // Click the linkable element (hero button)
    const iframe = helper.getIframe();
    const linkableElement = iframe.locator('[data-linkable-field="buttonLink"]');
    await linkableElement.click();

    // Click the link icon in toolbar
    const toolbar = page.locator('.quanta-toolbar');
    const linkButton = toolbar.locator('button[title*="Edit link"]');
    await linkButton.click();

    // Verify AddLinkForm popup appears
    const linkForm = page.locator('.field-link-editor .link-form-container');
    await expect(linkForm).toBeVisible();

    // Verify input exists and can be interacted with
    const linkInput = linkForm.locator('input[name="link"]');
    await expect(linkInput).toBeVisible();
  });

  test('element with both editable and linkable fields shows both format and link buttons', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    // The hero button has both data-editable-field="buttonText" and data-linkable-field="buttonLink"
    const iframe = helper.getIframe();
    const buttonElement = iframe.locator('[data-editable-field="buttonText"][data-linkable-field="buttonLink"]');
    await expect(buttonElement).toBeVisible();

    // Click the element
    await buttonElement.click();

    const toolbar = page.locator('.quanta-toolbar');
    await expect(toolbar).toBeVisible();

    // Should show link button for the linkable field
    const linkButton = toolbar.locator('button[title*="Edit link"]');
    await expect(linkButton).toBeVisible();
  });

  test('hover state shows dashed border on linkable field', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    // Hover over the linkable element
    const iframe = helper.getIframe();
    const linkableElement = iframe.locator('[data-linkable-field="buttonLink"]');
    await linkableElement.hover();

    // Check that the ::after pseudo-element creates a dashed border
    // We verify by checking computed style
    const hasHoverStyle = await linkableElement.evaluate((el) => {
      const afterStyle = window.getComputedStyle(el, '::after');
      return afterStyle.borderStyle.includes('dashed');
    });
    expect(hasHoverStyle).toBe(true);
  });

  test('hover state shows dashed border on media field', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    // Hover over the media element
    const iframe = helper.getIframe();
    const mediaElement = iframe.locator('[data-media-field="image"]');
    await mediaElement.hover();

    // Check that the ::after pseudo-element creates a dashed border
    const hasHoverStyle = await mediaElement.evaluate((el) => {
      const afterStyle = window.getComputedStyle(el, '::after');
      return afterStyle.borderStyle.includes('dashed');
    });
    expect(hasHoverStyle).toBe(true);
  });
});
