/**
 * Nuxt Frontend - Slider Block Tests
 *
 * Tests the slider block rendering and editing with the Nuxt frontend.
 * Uses http://localhost:3003 (Nuxt) instead of http://localhost:8888 (mock frontend).
 */
import { test, expect, Page } from '@playwright/test';
import { AdminUIHelper } from '../helpers/AdminUIHelper';

// Helper to switch Volto to use Nuxt frontend
async function useNuxtFrontend(page: Page) {
  // Set a cookie to tell Volto to use Nuxt frontend in the iframe
  await page.context().addCookies([
    {
      name: 'iframe_url',
      value: 'http://localhost:3003',
      domain: 'localhost',
      path: '/',
    },
  ]);
}

test.describe('Nuxt Frontend - Slider Block', () => {
  let helper: AdminUIHelper;

  test.beforeEach(async ({ page }) => {
    helper = new AdminUIHelper(page);
    // Set Nuxt frontend as the iframe URL
    await useNuxtFrontend(page);
    // Log in to access edit pages
    await helper.login();
  });

  test('slider page loads in Nuxt frontend', async () => {
    // Navigate to the slider test page in edit mode
    await helper.navigateToEdit('/slider-test-page');

    const iframe = helper.getIframe();

    // Wait for Nuxt to hydrate and render the page
    // The title block should be visible
    await expect(iframe.locator('[data-block-uid="title-block-uuid"]')).toBeVisible({
      timeout: 30000,
    });

    // Verify the slider block is rendered
    await expect(iframe.locator('[data-block-uid="slider-block-uuid"]')).toBeVisible();
  });

  test('clicking text after bold in slate block returns correct path', async () => {
    // This test reproduces the getNodePath bug:
    // Clicking on text after bold element should return correct Slate path

    await helper.navigateToEdit('/slider-test-page');

    const iframe = helper.getIframe();

    // Wait for the slate block after the slider to load
    const slateBlock = iframe.locator('[data-block-uid="slate-after-slider"]');
    await expect(slateBlock).toBeVisible({ timeout: 30000 });

    // Find the text "to test getNodePath" which comes after the bold "bold text"
    // In Nuxt, text leaves are wrapped in spans without nodeId
    const textAfterBold = slateBlock.locator('text=" to test getNodePath."');

    // Click on the text after bold
    await textAfterBold.click();

    // Wait for the quanta toolbar to appear for the slate block
    // This will fail if getNodePath returned an error
    await helper.waitForQuantaToolbar('slate-after-slider');
  });

  test('slider slides are rendered with correct structure', async () => {
    await helper.navigateToEdit('/slider-test-page');

    const iframe = helper.getIframe();

    // Wait for slider to load
    const slider = iframe.locator('[data-block-uid="slider-block-uuid"]');
    await expect(slider).toBeVisible({ timeout: 30000 });

    // Check that slides are rendered
    // The Nuxt block.vue renders slides with data-carousel-item
    const slides = slider.locator('[data-carousel-item]');
    await expect(slides).toHaveCount(2);
  });

  // Note: 'selection is preserved after applying bold formatting' test is in
  // inline-editing-basic.spec.ts and runs against both mock and nuxt frontends
});
