import { test, expect } from '../fixtures';
import { AdminUIHelper } from '../helpers/AdminUIHelper';

test.describe('Navigation and URL Handling', () => {
  test('External URLs do not load in iframe', async ({ page }, testInfo) => {

    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    // Wait for iframe to have content
    const iframe = helper.getIframe();

    // Verify the test page loaded in the iframe (not an external URL)
    // Check for content that exists on test-page in both mock and Nuxt frontends
    await expect(iframe.locator('text=This is a test paragraph'), 'Iframe should load test page content').toBeVisible({ timeout: 10000 });

    // Get iframe element to check its src
    const iframeElement = page.locator('#previewIframe');
    const iframeSrc = await iframeElement.getAttribute('src');

    // Iframe src should exist and point to localhost
    expect(iframeSrc, 'Iframe src attribute should exist').toBeTruthy();
    expect(iframeSrc).toContain('localhost');
    expect(iframeSrc).not.toContain('example.com');
  });

  // Test hash-based routing with different URL formats
  const hashFormats = [
    { name: '#/', url: 'http://localhost:8888/#/', expectedHash: '#/test-page' },
    { name: '#!/', url: 'http://localhost:8888/#!/', expectedHash: '#!/test-page' },
  ];

  for (const format of hashFormats) {
    test(`Hash-based frontend routing works with ${format.name} format`, async ({ page }, testInfo) => {
      // Skip on Nuxt - this test uses the mock frontend which supports hash URLs
      test.skip(testInfo.project.name === 'nuxt', 'Mock frontend test only');

      const helper = new AdminUIHelper(page);

      await helper.login();

      // Open Personal Preferences to set hash-based frontend URL
      await page.locator('#toolbar-personal').click();
      await page.locator('#toolbar-preferences').or(page.locator('text=Preferences')).first().click();

      // Wait for preferences form to load
      await expect(page.locator('text=Frontend URL')).toBeVisible({ timeout: 5000 });

      // Check "Custom URL" checkbox to enable custom URL input
      await page.locator('label:has-text("Custom URL")').click();

      // Enter hash-based frontend URL
      const urlInput = page.locator('input[name="url"]');
      await urlInput.fill(format.url);

      // Submit the form
      await page.locator('form button[type="submit"], form .ui.button.primary').click();

      // Navigate to test-page in edit mode
      await helper.navigateToEdit('/test-page');

      // Wait for iframe to load
      const iframeElement = page.locator('#previewIframe');
      await iframeElement.waitFor({ state: 'visible', timeout: 10000 });

      // Verify iframe src uses hash-based URL format (hash comes after query params)
      // Note: _edit param is no longer used - edit mode is communicated via window.name
      const iframeSrc = await iframeElement.getAttribute('src');
      expect(iframeSrc, `Iframe src should contain ${format.expectedHash}`).toContain(format.expectedHash);

      // Verify iframe content shows the correct page
      const iframe = helper.getIframe();
      await expect(iframe.locator('h1:has-text("Test Page")')).toBeVisible({ timeout: 10000 });
      await expect(iframe.locator('text=This is a test paragraph')).toBeVisible({ timeout: 5000 });

      // Click a block and verify sidebar shows correct page data
      await iframe.locator('[data-block-uid]').first().click();
      await helper.waitForSidebarOpen();
      await expect(page.locator('.sidebar-container input[name="title"]')).toHaveValue('Test Page', { timeout: 5000 });
    });
  }

  test('Navigation links work in iframe when clicking header nav', async ({ page }, testInfo) => {

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

  test('Cancelling navigation warning stays on edit page', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');
    await helper.waitForSidebarOpen();

    // Set up dialog handler to dismiss (cancel) the beforeunload dialog
    page.on('dialog', async (dialog) => {
      expect(dialog.type()).toBe('beforeunload');
      await dialog.dismiss(); // Cancel navigation
    });

    // Try to navigate away by clicking a link in the iframe
    const iframe = helper.getIframe();
    const navLink = iframe.locator('nav a, header a').first();
    await navLink.click();

    // Give time for dialog to be handled
    await page.waitForTimeout(500);

    // Verify we're still on the edit page
    await expect(page).toHaveURL(/test-page\/edit/);
    await expect(page.locator('#sidebar-properties')).toBeVisible();
  });

  test('Confirming navigation warning leaves edit page', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');
    await helper.waitForSidebarOpen();

    // Set up dialog handler to accept all beforeunload dialogs
    page.on('dialog', async (dialog) => {
      if (dialog.type() === 'beforeunload') {
        await dialog.accept(); // Confirm navigation
      }
    });

    // Try to navigate away by clicking a link in the iframe
    const iframe = helper.getIframe();
    const navLink = iframe.locator('nav a, header a').first();
    await navLink.click();

    // The iframe navigates, sends INIT with new path, admin follows to view mode
    // Should not be on test-page and should not be in edit mode
    await expect(page).not.toHaveURL(/\/test-page/, { timeout: 15000 });
    await expect(page).not.toHaveURL(/\/edit$/);
  });

  test('Root page has top-level navigation in iframe', async ({ page }, testInfo) => {

    const helper = new AdminUIHelper(page);

    await helper.login();

    // Navigate to root in edit mode
    await page.goto('http://localhost:3001/edit');
    await page.waitForLoadState('networkidle');

    // Wait for iframe element to be visible
    await page.locator('#previewIframe').waitFor({ state: 'visible', timeout: 10000 });

    // Check that navigation items are visible in the iframe
    const iframe = helper.getIframe();
    // The mock frontend displays navigation from API's @components.navigation.items
    const navItems = iframe.locator('nav a, header a, .navigation a');
    await expect(navItems.first()).toBeVisible({ timeout: 10000 });

    // Verify at least one known nav item exists (from mock fixtures)
    const testPageLink = iframe.locator('a[href*="test-page"], a:has-text("Test Page")');
    await expect(testPageLink.first()).toBeVisible({ timeout: 5000 });
  });

  test('Navigation works in view mode without warning', async ({ page }, testInfo) => {
  
    const helper = new AdminUIHelper(page);

    await helper.login();

    // Go to view mode (not edit)
    await page.goto('http://localhost:3001/test-page');
    await page.waitForLoadState('networkidle');

    // Wait for iframe to load
    await page.locator('#previewIframe').waitFor({ state: 'visible', timeout: 10000 });
    const iframe = helper.getIframe();
    await expect(iframe.locator('nav a, header a').first()).toBeVisible({ timeout: 10000 });

    // Track if beforeunload dialog appears (it shouldn't in view mode)
    let dialogAppeared = false;
    page.on('dialog', async (dialog) => {
      dialogAppeared = true;
      await dialog.accept();
    });

    // Click "Accordion Test Page" link in iframe nav
    const navLink = iframe.locator('a').filter({ hasText: 'Accordion Test Page' }).first();
    await navLink.click();

    // Wait for navigation
    await page.waitForTimeout(1000);

    // Verify no warning dialog appeared
    expect(dialogAppeared, 'No beforeunload warning should appear in view mode').toBe(false);

    // Verify admin URL changed to the new page
    await expect(page).toHaveURL(/\/accordion-test-page$/, { timeout: 10000 });
  });

  test('Contents action is available on folderish pages', async ({ page }, testInfo) => {
    // Skip on Nuxt - test-page may have different behavior

    const helper = new AdminUIHelper(page);

    await helper.login();

    // Navigate to view mode (not edit) to see Contents action in toolbar
    await page.goto('http://localhost:3001/test-page');
    await page.waitForLoadState('networkidle');

    // Look for the contents/folder action in the toolbar
    // This should be visible because test-page is folderish (is_folderish: true in fixture)
    const contentsButton = page.locator('#toolbar a[href*="contents"], #toolbar [aria-label*="Contents" i]');
    await expect(contentsButton.first()).toBeVisible({ timeout: 5000 });
  });
});
