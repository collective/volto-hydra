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
    await helper.waitForSidebarOpen();

    // Wait for iframe content to be stable
    const iframe = helper.getIframe();
    await expect(iframe.locator('text=This is a test paragraph')).toBeVisible();

    // The nav menu may be collapsed on mobile - click hamburger if needed
    const hamburger = iframe.locator('[data-collapse-toggle="mega-menu"]');
    if (await hamburger.isVisible()) {
      await hamburger.click();
    }

    // Find and click a navigation link (wait for it since nav loads async)
    const navLink = iframe.locator('a').filter({ hasText: 'Another Page' }).first();
    await navLink.waitFor({ state: 'attached' });
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

  test('Clicking linked image block in edit mode does not navigate', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');
    await helper.waitForSidebarOpen();

    const iframe = helper.getIframe();

    // Track if beforeunload dialog appears (it shouldn't - link should be prevented)
    let dialogAppeared = false;
    page.on('dialog', async (dialog) => {
      dialogAppeared = true;
      await dialog.accept();
    });

    // Find and click the linked image block (block-5-linked-image has href="https://example.com")
    const linkedImageBlock = iframe.locator('[data-block-uid="block-5-linked-image"]');
    await linkedImageBlock.waitFor({ state: 'visible', timeout: 5000 });

    // Click the image/link inside the block
    const imageOrLink = linkedImageBlock.locator('a, img').first();
    await imageOrLink.click();

    // Wait a moment to ensure no navigation occurs
    await page.waitForTimeout(500);

    // Verify we're still on the edit page - no navigation happened
    await expect(page).toHaveURL(/test-page\/edit/);

    // Verify no beforeunload warning appeared (link was prevented at click level)
    expect(dialogAppeared, 'No beforeunload warning should appear - link click should be prevented').toBe(false);

    // Verify the block got selected (Quanta toolbar should appear)
    await helper.waitForQuantaToolbar('block-5-linked-image');
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

    // Wait for iframe content to be stable
    const iframe = helper.getIframe();
    await expect(iframe.locator('text=This is a test paragraph')).toBeVisible();

    // Set up dialog handler to accept all beforeunload dialogs
    page.on('dialog', async (dialog) => {
      if (dialog.type() === 'beforeunload') {
        await dialog.accept(); // Confirm navigation
      }
    });

    // Click a nav link to navigate away (wait for it since nav loads async)
    const navLink = iframe.locator('a').filter({ hasText: 'Accordion Test Page' }).first();
    await navLink.waitFor({ state: 'attached' });
    await navLink.click();

    // Wait for navigation to complete - expect to be on the new page in view mode
    await expect(page).toHaveURL(/\/accordion-test-page$/, { timeout: 15000 });
    // Verify not in edit mode
    await expect(page).not.toHaveURL(/\/edit$/);
  });

  test('Root page has top-level navigation in iframe', async ({ page }, testInfo) => {

    const helper = new AdminUIHelper(page);

    await helper.login();

    // Navigate to root in edit mode
    await page.goto('http://localhost:3001/edit');

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

    // Wait for iframe content to load
    const iframe = helper.getIframe();
    await expect(iframe.locator('text=This is a test paragraph')).toBeVisible({ timeout: 10000 });

    // Track if beforeunload dialog appears (it shouldn't in view mode)
    let dialogAppeared = false;
    page.on('dialog', async (dialog) => {
      dialogAppeared = true;
      await dialog.accept();
    });

    // Click "Accordion Test Page" link in iframe nav (wait for it since nav loads async)
    const navLink = iframe.locator('a').filter({ hasText: 'Accordion Test Page' }).first();
    await navLink.waitFor({ state: 'attached' });
    await navLink.click();

    // Wait for admin URL to change
    await expect(page).toHaveURL(/\/accordion-test-page$/, { timeout: 10000 });

    // Verify no warning dialog appeared during navigation
    expect(dialogAppeared, 'No beforeunload warning should appear in view mode').toBe(false);
  });

  test('Grid block paging works in view mode', async ({ page }, testInfo) => {
    // Skip on Nuxt - this test uses mock frontend's grid paging
    test.skip(testInfo.project.name === 'nuxt', 'Mock frontend test only');

    const helper = new AdminUIHelper(page);

    await helper.login();

    // Go to view mode (not edit)
    await page.goto('http://localhost:3001/test-page');

    // Wait for iframe content to load
    const iframe = helper.getIframe();
    await expect(iframe.locator('text=This is a test paragraph')).toBeVisible({ timeout: 10000 });

    // Grid block (block-8-grid) should have paging since it has >6 elements
    // (1 manual teaser + query results from listing-in-grid)
    // Wait for paging controls to appear
    const pagingNav = iframe.locator('.grid-paging');
    await expect(pagingNav).toBeVisible({ timeout: 10000 });

    // Track if beforeunload dialog appears (it shouldn't in view mode)
    let dialogAppeared = false;
    page.on('dialog', async (dialog) => {
      dialogAppeared = true;
      await dialog.accept();
    });

    // Click the "Next" or page 2 paging link
    const pagingLink = iframe.locator('.grid-paging a').filter({ hasText: /Next|2/ }).first();
    await pagingLink.click();

    // Wait for the iframe to reload with page 2 content
    // The paging link has data-linkable-allow so navigation should work without warning
    // After navigation, the "Prev" link should become visible (indicating we're on page 2)
    // Re-get iframe reference since navigation may have invalidated it
    const iframeAfter = helper.getIframe();
    await expect(iframeAfter.locator('a:has-text("← Prev")')).toBeVisible({ timeout: 10000 });

    // Verify no warning dialog appeared during navigation
    expect(dialogAppeared, 'No beforeunload warning should appear for paging in view mode').toBe(false);

    // Verify the iframe still shows the page content (didn't break)
    await expect(iframeAfter.locator('main')).toBeVisible({ timeout: 5000 });
  });

  test('Iframe does not double-load when clicking nav link', async ({ page }, testInfo) => {
    // Skip on Nuxt - this test uses mock frontend's load counter
    test.skip(testInfo.project.name === 'nuxt', 'Mock frontend test only');

    const helper = new AdminUIHelper(page);

    await helper.login();

    // Go to view mode
    await page.goto('http://localhost:3001/test-page');
    await page.waitForLoadState('networkidle');

    const iframe = helper.getIframe();
    await expect(iframe.locator('text=This is a test paragraph')).toBeVisible({ timeout: 10000 });

    // Click nav link to navigate
    const navLink = iframe.locator('a').filter({ hasText: 'Another Page' }).first();
    await navLink.waitFor({ state: 'attached' });
    await navLink.click();

    // Wait for navigation to complete
    await expect(page).toHaveURL(/another-page/, { timeout: 10000 });
    await expect(iframe.locator('text=This is another test page')).toBeVisible({ timeout: 10000 });

    // Wait a moment for any potential admin-forced reload to occur
    await page.waitForTimeout(500);

    // Verify admin didn't force an extra reload
    // Without fix: 1 (initial) + 1 (nav) + 1 (admin reload) = 3
    // With fix: 1 (initial) + 1 (nav) = 2
    // Counter persists in sessionStorage across page loads within the session
    const loadCount = parseInt(await iframe.locator('#render-counter').textContent() || '0', 10);
    expect(loadCount, `Iframe loaded ${loadCount} times, should be 2 (not 3+ from admin reload)`).toBeLessThan(3);
  });

  test('Changing frontend URL in preferences reloads iframe', async ({ page }, testInfo) => {
    // Skip on Nuxt - this test changes frontend URL which would conflict
    test.skip(testInfo.project.name === 'nuxt', 'Mock frontend test only');

    const helper = new AdminUIHelper(page);

    await helper.login();

    // Go to test-page in view mode
    await page.goto('http://localhost:3001/test-page');

    const iframe = helper.getIframe();
    await expect(iframe.locator('text=This is a test paragraph')).toBeVisible({ timeout: 10000 });

    // Get the current iframe src (should be path-based: localhost:8888/test-page)
    const iframeElement = page.locator('#previewIframe');
    const srcBefore = await iframeElement.getAttribute('src');
    expect(srcBefore).toContain('localhost:8888/test-page');
    expect(srcBefore).not.toContain('#');

    // Open Personal Preferences
    await page.locator('#toolbar-personal').click();
    await page.locator('#toolbar-preferences').or(page.locator('text=Preferences')).first().click();
    await expect(page.locator('text=Frontend URL')).toBeVisible({ timeout: 5000 });

    // Enable custom URL and change to hash-based URL format
    await page.locator('label:has-text("Custom URL")').click();
    const urlInput = page.locator('input[name="url"]');
    await urlInput.fill('http://localhost:8888/#/');

    // Submit the form
    await page.locator('form button[type="submit"], form .ui.button.primary').click();

    // Wait for iframe src to change to hash-based format
    await expect(async () => {
      const src = await iframeElement.getAttribute('src');
      expect(src).toContain('#/test-page');
    }).toPass({ timeout: 10000 });

    const srcAfter = await iframeElement.getAttribute('src');
    expect(srcAfter, 'Iframe src should have changed to hash-based URL').toContain('#/test-page');

    // Re-get iframe reference after reload and verify content still shows
    const iframeAfter = helper.getIframe();
    await expect(iframeAfter.locator('text=This is a test paragraph')).toBeVisible({ timeout: 10000 });
  });

  test('Contents action is available on folderish pages', async ({ page }, testInfo) => {
    // Skip on Nuxt - test-page may have different behavior

    const helper = new AdminUIHelper(page);

    await helper.login();

    // Navigate to view mode (not edit) to see Contents action in toolbar
    await page.goto('http://localhost:3001/test-page');

    // Look for the contents/folder action in the toolbar
    // This should be visible because test-page is folderish (is_folderish: true in fixture)
    const contentsButton = page.locator('#toolbar a[href*="contents"], #toolbar [aria-label*="Contents" i]');
    await expect(contentsButton.first()).toBeVisible({ timeout: 5000 });
  });
});
