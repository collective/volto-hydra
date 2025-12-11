/**
 * Tests for complex Slate structures (lists with links)
 *
 * This tests the exact structure that causes the error:
 * "Cannot find a descendant at path [0,0,0] in node: {"text":"","children":[...],"type":"li"}"
 *
 * The API returns valid Slate (li has type + children, no text property)
 * But somewhere the first li gets text:"" added to it, corrupting the structure
 */

import { test, expect } from '@playwright/test';
import { AdminUIHelper } from '../helpers/AdminUIHelper';

test.describe('Complex Slate Structures', () => {
  test.beforeEach(async ({ page }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();
  });

  test('selecting list block with links does not cause Slate path error', async ({ page }) => {
    // Navigate to the complex slate page in edit mode
    await page.goto('http://localhost:3001/complex-slate-page/edit');

    // Wait for the page to load
    await page.waitForSelector('iframe');

    // Wait for iframe to be ready
    const iframe = page.frameLocator('iframe');

    // Wait for the list block to be rendered in the iframe
    const listBlock = iframe.locator('[data-block-uid="block-list-links"]');
    await expect(listBlock).toBeVisible({ timeout: 10000 });

    // Capture any errors during selection
    const errors: string[] = [];
    page.on('pageerror', (error) => {
      errors.push(error.message);
    });

    // Click on the list block to select it
    await listBlock.click();

    // Wait a moment for any async errors
    await page.waitForTimeout(1000);

    // Check for the specific Slate error
    const slateError = errors.find(e => e.includes('Cannot find a descendant at path'));
    expect(slateError).toBeUndefined();
  });

  test('list with links structure is preserved after selection', async ({ page }) => {
    await page.goto('http://localhost:3001/complex-slate-page/edit');
    await page.waitForSelector('iframe');

    const iframe = page.frameLocator('iframe');
    const listBlock = iframe.locator('[data-block-uid="block-list-links"]');
    await expect(listBlock).toBeVisible({ timeout: 10000 });

    // Click to select the block
    await listBlock.click();

    // Wait for selection to complete
    await page.waitForTimeout(500);

    // Verify the list structure is intact in the iframe
    const listItems = iframe.locator('[data-block-uid="block-list-links"] li');
    await expect(listItems).toHaveCount(4);

    // Verify links are present
    const links = iframe.locator('[data-block-uid="block-list-links"] a');
    await expect(links).toHaveCount(4);

    // First link should have correct text
    await expect(links.first()).toContainText('NUXT.js Example');
  });

  test('clicking into list item for inline edit does not corrupt structure', async ({ page }) => {
    await page.goto('http://localhost:3001/complex-slate-page/edit');
    await page.waitForSelector('iframe');

    const iframe = page.frameLocator('iframe');
    const listBlock = iframe.locator('[data-block-uid="block-list-links"]');
    await expect(listBlock).toBeVisible({ timeout: 10000 });

    // Capture errors
    const errors: string[] = [];
    page.on('pageerror', (error) => {
      errors.push(error.message);
    });

    // Click directly on the first link text to start inline editing
    const firstLink = iframe.locator('[data-block-uid="block-list-links"] a').first();
    await firstLink.click();

    // Wait for potential error
    await page.waitForTimeout(500);

    // No Slate path errors should occur
    const slateError = errors.find(e => e.includes('Cannot find a descendant at path'));
    expect(slateError).toBeUndefined();
  });

  test('API returns valid slate structure without text on li elements', async ({ request }) => {
    // Verify the mock API is returning valid data
    const response = await request.get('http://localhost:8888/++api++/complex-slate-page');
    const data = await response.json();

    // Get the list block's Slate value
    const listValue = data.blocks['block-list-links'].value;

    // Verify structure: ul -> li elements should NOT have 'text' property
    const ul = listValue[0];
    expect(ul.type).toBe('ul');

    for (const li of ul.children) {
      expect(li.type).toBe('li');
      expect(li).toHaveProperty('children');
      // CRITICAL: li should NOT have 'text' property
      expect(li).not.toHaveProperty('text');
    }
  });
});
