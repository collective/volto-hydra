import { test, expect } from '@playwright/test';
import { AdminUIHelper } from '../helpers/AdminUIHelper';

test.describe('Navigation and URL Handling', () => {
  test('External URLs do not load in iframe', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    // Wait for iframe to have content
    const iframe = helper.getIframe();
    await iframe.locator('h1').first().waitFor();

    // Verify the test page loaded in the iframe (not an external URL)
    const heading = await iframe.locator('h1').first().textContent();
    expect(heading).toContain('Test Page');

    // Get iframe element to check its src
    const iframeElement = page.locator('#previewIframe');
    const iframeSrc = await iframeElement.getAttribute('src');

    // Iframe should be pointing to localhost, not external URL
    expect(iframeSrc).toContain('localhost');
    expect(iframeSrc).not.toContain('example.com');
  });

  test('Hash bang URLs are handled gracefully', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();

    // Try navigating with hash bang style URL
    await page.goto('http://localhost:3001/#!/test-page/edit');
    await page.waitForTimeout(1000);

    // Volto may redirect or handle hash bangs differently
    // Verify the page doesn't crash and we can still navigate normally
    const currentUrl = page.url();

    // Either we stayed at hash bang URL or redirected to normal URL
    // Both are acceptable as long as the app didn't crash
    expect(currentUrl).toBeTruthy();

    // Verify we can navigate normally after encountering hash bang URL
    await helper.navigateToEdit('/test-page');
    await helper.waitForSidebarOpen();

    const sidebar = page.locator('#sidebar-properties');
    await expect(sidebar).toBeVisible();
  });

  test('Navigation between normal and hash bang URLs works', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();

    // Start with normal URL
    await helper.navigateToEdit('/test-page');
    await helper.waitForSidebarOpen();

    // Navigate to hash bang URL
    await page.goto('http://localhost:3001/#!/');
    await page.waitForTimeout(500);

    // Navigate back to normal URL
    await helper.navigateToEdit('/test-page');
    await helper.waitForSidebarOpen();

    // Verify we're still in functioning edit mode
    const sidebar = page.locator('#sidebar-properties');
    await expect(sidebar).toBeVisible();
  });

  test('Navigating away from edit mode exits editing', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');
    await helper.waitForSidebarOpen();

    // Verify we're in edit mode
    let sidebar = page.locator('#sidebar-properties');
    await expect(sidebar).toBeVisible();

    // Navigate to contents view
    await page.goto('http://localhost:3001/contents');
    await page.waitForTimeout(500);

    // Verify sidebar is no longer visible (exited edit mode)
    sidebar = page.locator('#sidebar-properties');
    await expect(sidebar).not.toBeVisible();
  });
});
