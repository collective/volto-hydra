/**
 * Tests for block resize detection.
 *
 * Verifies that when a block changes size (e.g., image loading),
 * the selection outline is updated to match the new dimensions.
 */
import { test, expect } from '@playwright/test';
import { AdminUIHelper } from '../helpers/AdminUIHelper';

test.describe('Block Resize Detection', () => {
  let helper: AdminUIHelper;

  test.beforeEach(async ({ page }) => {
    helper = new AdminUIHelper(page);

    // Load the mock parent page from the mock API server
    await page.goto('http://localhost:8888/mock-parent.html');

    // Wait for iframe to load
    await helper.waitForIframeReady();

    console.log('[TEST] Mock parent page loaded');
  });

  test('ResizeObserver updates overlay when block size changes', async ({ page }) => {
    // This test simulates an image loading and changing the block's size.
    // The ResizeObserver in hydra.js should detect the size change and send
    // an updated BLOCK_SELECTED message with the new dimensions.

    // Select a slate block and wait for overlays to be positioned correctly
    await helper.clickBlockInIframe('mock-block-1');

    // Verify initial positioning is correct
    const initialCheck = await helper.isBlockSelectedInIframe('mock-block-1');
    expect(initialCheck.ok).toBe(true);

    // Now resize the block in the iframe (simulating image load)
    const iframe = helper.getIframe();
    const block = iframe.locator('[data-block-uid="mock-block-1"]');
    await block.evaluate((el) => {
      // Add significant padding to simulate content change
      // ResizeObserver with border-box option catches padding changes too
      el.style.paddingBottom = '200px';
      console.log('[TEST] Block resized with paddingBottom 200px');
    });

    // Wait for ResizeObserver to fire and overlays to update
    // If ResizeObserver isn't working, positioning will be wrong and this will fail
    await expect.poll(
      async () => {
        const result = await helper.isBlockSelectedInIframe('mock-block-1');
        return result.ok;
      },
      { timeout: 5000, message: 'Expected overlays to update after block resize' }
    ).toBe(true);
  });

  test('ResizeObserver still works after FORM_DATA re-render', async ({ page }) => {
    // This test verifies that after a FORM_DATA message causes a re-render,
    // the ResizeObserver is re-attached to the new DOM element.
    //
    // The bug: When React re-renders, it creates a new DOM element.
    // The ResizeObserver was watching the old (now detached) element,
    // so it wouldn't detect size changes on the new element.

    // Select a slate block and wait for overlays
    await helper.clickBlockInIframe('mock-block-1');

    // Verify initial positioning is correct
    const initialCheck = await helper.isBlockSelectedInIframe('mock-block-1');
    expect(initialCheck.ok).toBe(true);

    // Trigger a FORM_DATA message to cause a re-render
    const iframe = helper.getIframe();
    await page.evaluate(() => {
      const iframeWindow = (document.getElementById('previewIframe') as HTMLIFrameElement).contentWindow;
      if (iframeWindow) {
        // Send a FORM_DATA message to trigger re-render
        iframeWindow.postMessage({
          type: 'FORM_DATA',
          data: {
            '@id': 'http://localhost:8888/test-page',
            '@type': 'Document',
            title: 'Mock Test Page',
            blocks: {
              'mock-block-1': {
                '@type': 'slate',
                value: [
                  {
                    type: 'p',
                    nodeId: '0',
                    children: [{ text: 'Text after re-render' }],
                  },
                ],
              },
              'mock-text-block': { '@type': 'text', text: 'Simple text field' },
              'mock-multi-field-block': {
                '@type': 'multifield',
                title: 'Block Title',
                description: [{ type: 'p', nodeId: '0', children: [{ text: 'Description' }] }],
              },
              'mock-textarea-block': { '@type': 'textarea', content: 'Textarea content' },
            },
            blocks_layout: {
              items: ['mock-block-1', 'mock-text-block', 'mock-multi-field-block', 'mock-textarea-block'],
            },
          },
        }, '*');
      }
    });

    // Wait for re-render to complete
    await page.waitForTimeout(300);

    // Now resize the block (which is a NEW DOM element after re-render)
    const block = iframe.locator('[data-block-uid="mock-block-1"]');
    await block.evaluate((el) => {
      // Add significant height to simulate image loading
      el.style.paddingBottom = '200px';
      console.log('[TEST] Block resized after re-render');
    });

    // The ResizeObserver should STILL detect this change even after re-render
    // If the observer wasn't re-attached, the overlays won't update and this will fail
    await expect.poll(
      async () => {
        const result = await helper.isBlockSelectedInIframe('mock-block-1');
        return result.ok;
      },
      { timeout: 5000, message: 'Expected overlays to update after resize post-rerender' }
    ).toBe(true);
  });
});
