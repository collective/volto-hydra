import { test, expect } from '../fixtures';
import { AdminUIHelper } from '../helpers/AdminUIHelper';

test.describe('Navigation and URL Handling', () => {
  test('External URLs do not load in iframe', async ({ page }, testInfo) => {
    // Skip on Nuxt - test-page has hero block not supported in Nuxt
    test.skip(testInfo.project.name === 'nuxt', 'test-page has custom hero block');

    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    // Wait for iframe to have content
    const iframe = helper.getIframe();
    await iframe.locator('h1').first().waitFor();

    // Verify the test page loaded in the iframe (not an external URL)
    const heading = await iframe.locator('h1').first().textContent();
    expect(heading, 'Iframe should load test page content').toContain('Test Page');

    // Get iframe element to check its src
    const iframeElement = page.locator('#previewIframe');
    const iframeSrc = await iframeElement.getAttribute('src');

    // Iframe src should exist and point to localhost
    expect(iframeSrc, 'Iframe src attribute should exist').toBeTruthy();
    expect(iframeSrc).toContain('localhost');
    expect(iframeSrc).not.toContain('example.com');
  });

  test('Hash bang URLs are handled gracefully', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();

    // Try navigating with hash bang style URL
    await page.goto('http://localhost:3001/#!/test-page/edit');
    await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});

    // Verify we can navigate normally after encountering hash bang URL
    await helper.navigateToEdit('/test-page');
    await helper.waitForSidebarOpen();

    // Verify the page actually loaded in the iframe
    // Use text content check instead of 'main' element (mock frontend uses #content, Nuxt uses main)
    const iframe = helper.getIframe();
    await expect(iframe.locator('text=This is a test paragraph')).toBeVisible({ timeout: 10000 });

    // Verify sidebar is showing the correct page
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
    await page.waitForLoadState('networkidle', { timeout: 2000 }).catch(() => {});

    // Navigate back to normal URL
    await helper.navigateToEdit('/test-page');
    await helper.waitForSidebarOpen();

    // Verify we're still in functioning edit mode
    const sidebar = page.locator('#sidebar-properties');
    await expect(sidebar).toBeVisible();
  });

  test('Navigation links work in iframe when clicking header nav', async ({ page }, testInfo) => {
    // Only run on Nuxt - test frontend doesn't have header navigation
    test.skip(testInfo.project.name !== 'nuxt', 'Nuxt-only: test frontend has no header nav');

    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    // Get the iframe
    const iframe = helper.getIframe();

    // Verify the initial page loaded in iframe with its content
    await expect(iframe.locator('main')).toBeVisible();
    await expect(iframe.locator('text=This is a test paragraph')).toBeVisible();

    // The nav menu may be collapsed on mobile - click hamburger if needed
    const hamburger = iframe.locator('[data-collapse-toggle="mega-menu"]');
    if (await hamburger.isVisible()) {
      await hamburger.click();
    }

    // Find and click a navigation link
    const navLink = iframe.locator('header nav a').filter({ hasText: 'Another Page' }).first();
    await expect(navLink).toBeVisible({ timeout: 5000 });
    await navLink.click();

    // Verify the admin URL changed to reflect the new page (view mode)
    await expect(page).toHaveURL(/another-page/, { timeout: 10000 });

    // Verify the iframe navigated and rendered the new page content
    await expect(iframe.locator('main')).toBeVisible({ timeout: 10000 });
    await expect(iframe.locator('text=This is another test page')).toBeVisible({ timeout: 5000 });

    // Click Edit button to enter edit mode (navigateToEdit detects we're on view page)
    await helper.navigateToEdit('/another-page');

    // Verify we're now in edit mode
    await expect(page).toHaveURL(/another-page\/edit/, { timeout: 10000 });

    // Verify the iframe still shows the correct page content
    await expect(iframe.locator('main')).toBeVisible({ timeout: 10000 });
    await expect(iframe.locator('text=This is another test page')).toBeVisible({ timeout: 5000 });

    // Click a block and verify sidebar shows correct page title in the title input
    await iframe.locator('[data-block-uid]').first().click();
    await expect(page.locator('.sidebar-container input[name="title"]')).toHaveValue('Another Page', { timeout: 5000 });
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
    await page.waitForLoadState('networkidle', { timeout: 2000 }).catch(() => {});

    // Verify sidebar is no longer visible (exited edit mode)
    sidebar = page.locator('#sidebar-properties');
    await expect(sidebar).not.toBeVisible();
  });
});
