import { test, expect } from '@playwright/test';
import { AdminUIHelper } from '../helpers/AdminUIHelper';

test.describe('Field Focus and Toolbar', () => {
  let helper: AdminUIHelper;

  test.beforeEach(async ({ page }) => {
    helper = new AdminUIHelper(page);
    await page.goto('http://localhost:8888/mock-parent.html');
    await helper.waitForIframeReady();
  });

  test('should update toolbar when switching between text and slate fields', async ({ page }) => {
    const iframe = helper.getIframe();

    // Click the multi-field block to select it
    await helper.clickBlockInIframe('mock-multi-field-block');
    await page.waitForTimeout(500);

    // Click the title field (text type)
    const titleField = iframe.locator('[data-editable-field="title"]');
    await titleField.click();
    await page.waitForTimeout(300);

    console.log('[TEST] Clicked title field (text type)');

    // Verify no format buttons for text field
    const formatButtonsAfterTitle = iframe.locator('.volto-hydra-format-button');
    const titleButtonCount = await formatButtonsAfterTitle.count();
    console.log('[TEST] Format buttons after title:', titleButtonCount);
    expect(titleButtonCount).toBe(0);

    // Click the description field (slate type)
    const descriptionField = iframe.locator('[data-editable-field="description"]');
    await descriptionField.click();
    await page.waitForTimeout(300);

    console.log('[TEST] Clicked description field (slate type)');

    // Verify format buttons appear for slate field
    await page.waitForTimeout(200);
    const descButtonCount = await formatButtonsAfterTitle.count();
    console.log('[TEST] Format buttons after description:', descButtonCount);
    expect(descButtonCount).toBeGreaterThan(0);
  });
});
