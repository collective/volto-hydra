import { test, expect } from '@playwright/test';
import { AdminUIHelper } from './helpers/AdminUIHelper';

test.describe('Debug Iframe Bridge', () => {
  test('Check if bridge initializes', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    // Capture console messages from the page (Admin UI)
    page.on('console', msg => {
      console.log('[ADMIN UI CONSOLE]', msg.type(), msg.text());
    });

    // Capture console messages from the iframe (Frontend)
    page.on('framenavigated', async (frame) => {
      if (frame.url().includes('localhost:8888')) {
        frame.page().on('console', msg => {
          if (msg.text().includes('[TEST-FRONTEND]')) {
            console.log('[IFRAME CONSOLE]', msg.text());
          }
        });
      }
    });

    await helper.login();
    await helper.navigateToEdit('/test-page');

    // Wait for iframe to be ready
    await page.waitForTimeout(3000);

    // Check if hydra.js loaded in iframe
    const iframe = page.frameLocator('#previewIframe');

    // Check if window.bridge exists
    const bridgeExists = await iframe.locator('body').evaluate(() => {
      return typeof (window as any).bridge !== 'undefined';
    });

    console.log('Bridge exists:', bridgeExists);

    // Check if blocks have data-block-uid
    const blockCount = await iframe.locator('[data-block-uid]').count();
    console.log('Blocks with data-block-uid:', blockCount);

    // Get all block UIDs
    const blockUIDs = await iframe.locator('[data-block-uid]').evaluateAll(elements => {
      return elements.map(el => el.getAttribute('data-block-uid'));
    });
    console.log('Block UIDs:', blockUIDs);

    // Check if we're in an iframe
    const isIframe = await iframe.locator('body').evaluate(() => {
      return window.self !== window.top;
    });
    console.log('Is in iframe:', isIframe);

    // Check URL params
    const urlParams = await iframe.locator('body').evaluate(() => {
      const params = new URLSearchParams(window.location.search);
      return {
        _edit: params.get('_edit'),
        access_token: params.get('access_token') ? 'present' : 'missing'
      };
    });
    console.log('URL params:', urlParams);

    // Check bridge initialization status
    const bridgeStatus = await iframe.locator('body').evaluate(() => {
      const bridge = (window as any).bridge;
      if (!bridge) return 'Bridge not found';

      return {
        hasOnEditChange: typeof bridge.onEditChange === 'function',
        hasSelectBlock: typeof bridge.selectBlock === 'function'
      };
    });
    console.log('Bridge methods:', bridgeStatus);
  });
});
