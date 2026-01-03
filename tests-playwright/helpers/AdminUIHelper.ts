/**
 * Helper class for interacting with Volto Hydra admin UI in tests.
 */
import { Page, Locator, FrameLocator, expect, ElementHandle } from '@playwright/test';

export class AdminUIHelper {
  constructor(
    public readonly page: Page,
    public readonly adminUrl: string = 'http://localhost:3001'
  ) {
    // Capture browser console - all logs locally, only errors/warnings in CI
    this.page.on('console', (msg) => {
      const type = msg.type();
      if (process.env.CI) {
        // CI: only errors and warnings
        if (type === 'error' || type === 'warning') {
          console.log(`[BROWSER ${type.toUpperCase()}] ${msg.text()}`);
        }
      } else {
        // Local: all console output for debugging
        console.log(`[${type}] ${msg.text()}`);
      }
    });

    // Capture page errors
    this.page.on('pageerror', (error) => {
      console.log(`[BROWSER PAGE ERROR] ${error.message}`);
      console.log(error.stack);
    });

    // Log only failed requests (status >= 400)
    this.page.on('response', async (response) => {
      const status = response.status();
      if (status >= 400) {
        const url = response.url();
        console.log(`[NETWORK ERROR] ${response.request().method()} ${status} ${url}`);
        try {
          const body = await response.text();
          if (body) {
            console.log(`[ERROR BODY]:`, body.substring(0, 500));
          }
        } catch (e) {
          console.log(`[ERROR] Could not read response body:`, e.message);
        }
      }
    });
  }

  /**
   * Log in to the Volto admin UI.
   */
  async login(username: string = 'admin', password: string = 'admin'): Promise<void> {
    // For testing, bypass the login form and set the auth cookie directly
    // This avoids Redux/middleware complexity in the test environment

    // Create a valid JWT format token (header.payload.signature)
    // Header: {"alg":"HS256","typ":"JWT"}
    // Payload: {"sub":"admin","exp":Math.floor(Date.now()/1000) + 86400} (expires in 24 hours)
    // Signature: fake but valid base64
    const header = Buffer.from(JSON.stringify({"alg":"HS256","typ":"JWT"})).toString('base64').replace(/=/g, '');
    const payload = Buffer.from(JSON.stringify({"sub":"admin","exp":Math.floor(Date.now()/1000) + 86400})).toString('base64').replace(/=/g, '');
    const signature = 'fake-signature';
    const authToken = `${header}.${payload}.${signature}`;

    // Set the auth_token cookie
    await this.page.context().addCookies([{
      name: 'auth_token',
      value: authToken,
      domain: 'localhost',
      path: '/',
      httpOnly: false,
      secure: false,
      sameSite: 'Lax',
    }]);


    // Navigate to homepage first (doesn't require SSR auth)
    await this.page.goto(`${this.adminUrl}/`, {
      timeout: 60000,
      waitUntil: 'networkidle',
    });

  }

  /**
   * Navigate to the edit page for a piece of content.
   * If already on the page in view mode, clicks the Edit button.
   * Otherwise uses client-side navigation to avoid SSR auth issues.
   */
  async navigateToEdit(contentPath: string): Promise<void> {
    // Ensure path starts with /
    if (!contentPath.startsWith('/')) {
      contentPath = '/' + contentPath;
    }

    const editPath = `${contentPath}/edit`;
    const currentUrl = this.page.url();

    // Check if we're already on this page (view mode)
    const isOnViewPage = currentUrl.includes(contentPath) && !currentUrl.includes('/edit');

    if (isOnViewPage) {
      // Click the Edit button in the toolbar
      const editButton = this.page.locator('#toolbar a.edit, #toolbar [aria-label="Edit"]');
      await editButton.click({ timeout: 5000 });
    } else {
      // Use React Router to navigate client-side (avoids SSR)
      await this.page.evaluate((path) => {
        // @ts-ignore - window.__APP_HISTORY__ is set by Volto
        if (window.__HISTORY__) {
          window.__HISTORY__.push(path);
        } else {
          // Fallback to pushState + popstate event
          window.history.pushState({}, '', path);
          window.dispatchEvent(new PopStateEvent('popstate'));
        }
      }, editPath);
    }

    // Wait for the URL to change
    await this.page.waitForURL(`${this.adminUrl}${editPath}`, { timeout: 10000 });

    // Wait for iframe to load
    await this.waitForIframeReady();
  }

  /**
   * Wait for the preview iframe to load.
   */
  async waitForIframeReady(timeout: number = 30000): Promise<void> {
    await this.page.waitForSelector('#previewIframe', {
      state: 'visible',
      timeout,
    });

    // Wait for iframe to have content with blocks
    const iframe = this.getIframe();
    await iframe.locator('[data-block-uid]').first().waitFor({ timeout });
  }

  /**
   * Get the preview iframe frame locator.
   */
  getIframe(): FrameLocator {
    return this.page.frameLocator('#previewIframe');
  }

  /**
   * Check if a block is hidden in the iframe.
   * Matches hydra.js's isElementHidden logic:
   * - display: none or visibility: hidden
   * - zero dimensions
   * - translated outside container bounds (e.g., Flowbite carousel)
   */
  async isBlockHiddenInIframe(blockId: string): Promise<boolean> {
    const iframe = this.getIframe();
    const block = iframe.locator(`[data-block-uid="${blockId}"]`);

    return await block.evaluate((el) => {
      if (!el) return true;
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') {
        return true;
      }
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) {
        return true;
      }
      // Check if element is translated/positioned outside its container
      const container = el.parentElement?.closest('[data-block-uid]');
      if (container) {
        const containerRect = container.getBoundingClientRect();
        if (rect.right <= containerRect.left || rect.left >= containerRect.right) {
          return true;
        }
      }
      return false;
    });
  }

  /**
   * Inject the preserveWhitespaceDOM helper into the iframe.
   * This helper creates DOM while preserving whitespace text nodes that innerHTML would collapse.
   * Vue/Nuxt templates create these from newlines/indentation.
   *
   * After calling this, tests can use: (window as any).preserveWhitespaceDOM('<div>\\n  <p>text</p>\\n</div>')
   */
  async injectPreserveWhitespaceHelper(): Promise<void> {
    const iframe = this.getIframe();
    await iframe.locator('body').evaluate(() => {
      (window as any).preserveWhitespaceDOM = function(html: string): DocumentFragment {
        const fragment = document.createDocumentFragment();

        function parseHTML(htmlStr: string, parent: Node): string {
          let remaining = htmlStr;

          while (remaining.length > 0) {
            const tagStart = remaining.indexOf('<');

            if (tagStart === -1) {
              if (remaining.length > 0) {
                parent.appendChild(document.createTextNode(remaining));
              }
              break;
            }

            if (tagStart > 0) {
              const text = remaining.slice(0, tagStart);
              parent.appendChild(document.createTextNode(text));
              remaining = remaining.slice(tagStart);
            }

            if (remaining.startsWith('</')) {
              return remaining;
            }

            const tagEnd = remaining.indexOf('>');
            if (tagEnd === -1) break;

            const tagContent = remaining.slice(1, tagEnd);
            const selfClosing = tagContent.endsWith('/');
            const tagParts = (selfClosing ? tagContent.slice(0, -1) : tagContent).trim().split(/\s+/);
            const tagName = tagParts[0];

            const element = document.createElement(tagName);

            const attrStr = tagParts.slice(1).join(' ');
            const attrRegex = /([a-zA-Z-]+)(?:="([^"]*)")?/g;
            let match;
            while ((match = attrRegex.exec(attrStr)) !== null) {
              element.setAttribute(match[1], match[2] || '');
            }

            parent.appendChild(element);
            remaining = remaining.slice(tagEnd + 1);

            if (!selfClosing) {
              remaining = parseHTML(remaining, element);
              const closeTag = `</${tagName}>`;
              if (remaining.startsWith(closeTag)) {
                remaining = remaining.slice(closeTag.length);
              }
            }
          }

          return remaining;
        }

        parseHTML(html, fragment);
        return fragment;
      };

      // Vue-style DOM helper: splits text nodes at whitespace boundaries and converts
      // whitespace-only segments to empty text nodes, matching Vue's template interpolation behavior
      // Vue creates: [empty ""][content][empty ""] from "<p>\n{{ text }}\n</p>"
      (window as any).vueStyleDOM = function(html: string): DocumentFragment {
        const fragment = (window as any).preserveWhitespaceDOM(html);

        // Walk all text nodes and split at whitespace/content boundaries
        const walker = document.createTreeWalker(fragment, NodeFilter.SHOW_TEXT);
        const nodesToProcess: Text[] = [];
        let node;
        while ((node = walker.nextNode())) {
          nodesToProcess.push(node as Text);
        }

        nodesToProcess.forEach(textNode => {
          const text = textNode.textContent || '';
          // Match pattern: (leading whitespace)(content)(trailing whitespace)
          const match = text.match(/^(\s*)(.*?)(\s*)$/s);
          if (match) {
            const [, leading, content, trailing] = match;
            // Only split if there's actual content with surrounding whitespace
            if (content && (leading || trailing)) {
              const parent = textNode.parentNode;
              if (parent) {
                // Create replacement nodes: empty for whitespace, content as-is
                if (leading) {
                  parent.insertBefore(document.createTextNode(''), textNode);
                }
                parent.insertBefore(document.createTextNode(content), textNode);
                if (trailing) {
                  parent.insertBefore(document.createTextNode(''), textNode);
                }
                parent.removeChild(textNode);
              }
            } else if (!content && text) {
              // Whitespace-only node -> convert to empty
              textNode.textContent = '';
            }
          }
        });

        return fragment;
      };
    });
  }

  /**
   * Click on a block within the preview iframe.
   * Waits for the block to be selected (have the outline) after clicking.
   *
   * @param blockId - The data-block-uid of the block to click
   * @param options.waitForToolbar - If true (default), waits for Volto's quanta-toolbar.
   *                                  Set to false for mock parent tests where Volto isn't running.
   */
  async clickBlockInIframe(
    blockId: string,
    options: { waitForToolbar?: boolean } = {},
  ) {
    const { waitForToolbar = true } = options;
    const iframe = this.getIframe();
    const block = iframe.locator(`[data-block-uid="${blockId}"]`);

    // Verify block exists before trying to click
    const blockCount = await block.count();
    if (blockCount === 0) {
      throw new Error(`Block with id "${blockId}" not found in iframe. Check if the block exists in the content.`);
    }

    // Scroll block into view inside the iframe
    await block.scrollIntoViewIfNeeded();
    await block.click();

    if (waitForToolbar) {
      // Wait for any block to be selected (toolbar visible)
      const toolbar = this.page.locator('.quanta-toolbar');
      await toolbar.waitFor({ state: 'visible', timeout: 5000 });

      // Wait for selection to settle
      await this.waitForBlockSelected(blockId);

      // Check if the correct block is selected
      const result = await this.isBlockSelectedInIframe(blockId);
      if (!result.ok) {
        // Wrong block selected - likely a child. Navigate up via sidebar.
        await this.navigateToParentBlock(blockId);
      } else {
        // Target is selected, wait for toolbar to be positioned correctly
        await this.waitForQuantaToolbar(blockId);
      }
    } else {
      // For mock parent tests: wait for block to become editable instead of toolbar
      // Handle both: contenteditable on child (mock) OR on block itself (Nuxt)
      const childEditable = block.locator('[contenteditable="true"]');
      const selfEditable = iframe.locator(
        `[data-block-uid="${blockId}"][contenteditable="true"]`,
      );
      try {
        await childEditable.or(selfEditable).first().waitFor({ state: 'visible', timeout: 5000 });
      } catch (e) {
        throw new Error(`Block "${blockId}" was clicked but no contenteditable field appeared. Check that hydra.js is handling the block selection.`);
      }
    }

    // Return the block locator for chaining
    return block;
  }

  /**
   * Navigate up through parent blocks in the sidebar until reaching the target block.
   * Used when clicking on a container block selects a child instead.
   *
   * @param targetBlockId - The block ID we want to be selected
   * @param expectedCurrentType - Optional: the type name of the block we expect to be currently selected
   *                              (e.g., "Grid" if grid-1 was selected instead of the target)
   * @param maxAttempts - Maximum navigation attempts
   */
  async navigateToParentBlock(
    targetBlockId: string,
    expectedCurrentType?: string,
    maxAttempts: number = 10
  ): Promise<void> {
    // Wait for sidebar to be open
    await this.waitForSidebarOpen();

    // Wait for parent navigation buttons to appear in sidebar
    // The sidebar needs time to render the block's parent hierarchy
    const parentButtonLocator = this.page.locator('button').filter({ hasText: /^‹/ });
    try {
      await parentButtonLocator.first().waitFor({ state: 'visible', timeout: 5000 });
    } catch {
      throw new Error(
        `Cannot navigate to block "${targetBlockId}": no parent navigation buttons appeared in sidebar after 5s`
      );
    }

    // Debug: Get all parent button texts for error messages
    const getParentButtonTexts = async () => {
      const buttons = await parentButtonLocator.all();
      const texts: string[] = [];
      for (const btn of buttons) {
        texts.push(await btn.textContent() || '(empty)');
      }
      return texts;
    };

    // If expectedCurrentType is provided, verify the sidebar shows it as the current block
    if (expectedCurrentType) {
      const buttonTexts = await getParentButtonTexts();
      const lastButtonText = buttonTexts[buttonTexts.length - 1] || '';
      if (!lastButtonText.includes(expectedCurrentType)) {
        throw new Error(
          `Sidebar state mismatch: expected current block type "${expectedCurrentType}" but found buttons: [${buttonTexts.join(', ')}]`
        );
      }
    }

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      // Check if target block is now selected
      const result = await this.isBlockSelectedInIframe(targetBlockId);
      if (result.ok) {
        await this.waitForQuantaToolbar(targetBlockId);
        return;
      }

      // Find and click the LAST "‹ BlockType" parent navigation button in sidebar
      // Clicking it closes that section and navigates up one level
      const parentButton = parentButtonLocator.last();
      const buttonExists = (await parentButton.count()) > 0;

      if (!buttonExists) {
        const buttonTexts = await getParentButtonTexts();
        throw new Error(
          `Cannot navigate to block "${targetBlockId}": parent navigation buttons disappeared from sidebar. ` +
          `Last known buttons: [${buttonTexts.join(', ')}]`
        );
      }

      await parentButton.click();
      await this.page.waitForTimeout(300); // Wait for selection to update
    }

    const buttonTexts = await getParentButtonTexts();
    throw new Error(
      `Failed to navigate to block "${targetBlockId}" after ${maxAttempts} attempts. ` +
      `Current sidebar buttons: [${buttonTexts.join(', ')}]`
    );
  }

  /**
   * Click on a container block by clicking on its title area.
   * This is necessary for container blocks (like columns) that have nested blocks,
   * where clicking in the center would select a nested block instead.
   *
   * @param blockId - The data-block-uid of the container block
   */
  async clickContainerBlockInIframe(blockId: string) {
    const iframe = this.getIframe();
    const block = iframe.locator(`[data-block-uid="${blockId}"]`);

    // Verify block exists
    const blockCount = await block.count();
    if (blockCount === 0) {
      throw new Error(
        `Block with id "${blockId}" not found in iframe. Check if the block exists in the content.`,
      );
    }

    // Try to click on the block's title element (data-editable-field="title")
    const titleElement = block.locator(
      '> [data-editable-field="title"], > .column-title, > h3, > h4',
    );
    const hasTitleElement = (await titleElement.count()) > 0;

    if (hasTitleElement) {
      // Click on title to select the container
      await titleElement.first().scrollIntoViewIfNeeded();
      await titleElement.first().click();
    } else {
      // Fall back to clicking on the block's border area
      // Avoid data-block-selector elements (like carousel nav buttons on the sides)
      const blockBox = await block.boundingBox();
      if (blockBox) {
        // Click at top center - avoids nav buttons (on sides) and child blocks (in middle)
        // The top border area is typically safe for containers like carousels
        await block.click({
          position: { x: blockBox.width / 2, y: 3 },
        });
      } else {
        throw new Error(
          `Cannot get bounding box for block "${blockId}" to click on border`,
        );
      }
    }

    // Wait for toolbar to be positioned correctly
    await this.waitForQuantaToolbar(blockId);

    return block;
  }

  /**
   * Wait for a block to be selected in the iframe.
   */
  async waitForBlockSelected(blockId: string, timeout: number = 5000) {
    const iframe = this.getIframe();
    const block = iframe.locator(`[data-block-uid="${blockId}"]`);
    await block.waitFor({ state: 'visible', timeout });

    // Wait for drag handle to appear and be positioned at the correct block
    // The drag handle is positioned at the selected block's left edge, typically 48px above
    // For container blocks, positioning may vary, so we check if handle is near the block
    const dragHandle = iframe.locator('.volto-hydra-drag-button');
    await expect(async () => {
      await expect(dragHandle).toBeVisible({ timeout: 100 });

      // Verify drag handle is positioned near this block
      const blockBox = await block.boundingBox();
      const handleBox = await dragHandle.boundingBox();
      if (!blockBox || !handleBox) {
        throw new Error('Could not get bounding boxes');
      }

      // Drag handle should be at block's left edge (within tolerance)
      const xDiff = Math.abs(handleBox.x - blockBox.x);
      // Drag handle should be near the block's top or at iframe top when clamped
      const iframeElement = this.page.locator('iframe').first();
      const iframeBox = await iframeElement.boundingBox();
      const iframeTop = iframeBox?.y || 0;
      // Handle can be anywhere from iframe top to slightly below block top
      const minY = iframeTop;
      const maxY = blockBox.y + 30;
      const inYRange = handleBox.y >= minY && handleBox.y <= maxY;

      if (xDiff > 30 || !inYRange) {
        throw new Error(
          `Drag handle not at block position. Block: (${blockBox.x.toFixed(0)}, ${blockBox.y.toFixed(0)}), ` +
          `Handle: (${handleBox.x.toFixed(0)}, ${handleBox.y.toFixed(0)}), ` +
          `expected y range: [${minY.toFixed(0)}, ${maxY.toFixed(0)}]`
        );
      }
    }).toPass({ timeout });

    // Return the block locator for chaining
    return block;
  }

  /**
   * Check if the sidebar is open.
   */
  async isSidebarOpen(): Promise<boolean> {
    const sidebar = this.page.locator('#sidebar-properties');
    return await sidebar.isVisible();
  }

  /**
   * Wait for the sidebar to open.
   */
  async waitForSidebarOpen(timeout: number = 5000): Promise<void> {
    // Wait for sidebar to be open - check for the content wrapper which is always visible
    await this.page.waitForSelector(
      '.sidebar-content-wrapper',
      {
        state: 'visible',
        timeout,
      }
    );
  }

  /**
   * Wait for the sidebar to show a specific block type as the current block.
   * The current block in the sidebar has data-is-current="true" on its header.
   *
   * @param blockTypeTitle - The display title of the block type (e.g., "Slider", "Slide", "Text")
   * @param timeout - Maximum time to wait in milliseconds
   */
  async waitForSidebarCurrentBlock(blockTypeTitle: string, timeout: number = 10000): Promise<void> {
    const sidebar = this.page.locator('.sidebar-container');
    // The current block header has data-is-current="true" and contains the block type title
    const currentBlockHeader = sidebar.locator('[data-is-current="true"]').filter({ hasText: blockTypeTitle });
    await expect(currentBlockHeader).toBeVisible({ timeout });
  }

  /**
   * Open a specific sidebar tab (Page, Block, Order, etc.)
   *
   * Note: The Hydra sidebar uses a unified hierarchical view without tabs.
   * This method is kept for backwards compatibility and scrolls to the
   * appropriate section:
   * - "Block": Scrolls to block settings (#sidebar-properties)
   * - "Page"/"Document": Scrolls to top for page metadata (#sidebar-metadata)
   * - "Order": Scrolls to child blocks widget at bottom (#sidebar-children)
   */
  async openSidebarTab(tabName: string): Promise<void> {
    // Map tab names to their portal target IDs
    const tabToSelector: Record<string, string> = {
      Block: '#sidebar-properties',
      Page: '#sidebar-metadata',
      Document: '#sidebar-metadata',
      Order: '#sidebar-order',
    };

    const selector = tabToSelector[tabName];
    if (selector) {
      const section = this.page.locator(selector);
      // Wait for the section to exist
      await section.waitFor({ state: 'attached', timeout: 5000 });
      // Scroll to the section
      await section.scrollIntoViewIfNeeded();
      // Brief wait for scroll to complete
      await this.page.waitForTimeout(100);
    }
  }

  /**
   * Get the type of block currently being edited in the sidebar.
   */
  async getSidebarBlockType(): Promise<string | null> {
    const sidebar = this.page.locator('#sidebar-properties');

    // Check for common block type indicators
    const selectors = [
      '.block-editor-slate',
      '.block-editor-image',
      '.block-editor h2',
    ];

    for (const selector of selectors) {
      const element = sidebar.locator(selector).first();
      if (await element.isVisible()) {
        // Try from class names
        const classAttr = await element.getAttribute('class');
        if (classAttr) {
          if (classAttr.includes('slate')) return 'slate';
          if (classAttr.includes('image')) return 'image';
        }

        // Try from text content
        const text = await element.textContent();
        if (text) {
          return text.toLowerCase();
        }
      }
    }

    return null;
  }

  /**
   * Get a locator for the slate editable field in a block.
   * The field may be on the block element itself (Nuxt) or a child element (mock).
   * Use with expect().toBeVisible() to verify a block is a slate block.
   * @param blockLocator - Locator for the block element with data-block-uid
   */
  getSlateField(blockLocator: Locator): Locator {
    // Try child first (mock renderer), then self (Nuxt where attr is on root)
    const childField = blockLocator.locator('[data-editable-field="value"]');
    const selfField = blockLocator.and(this.page.locator('[data-editable-field="value"]'));
    return childField.or(selfField);
  }

  /**
   * Check if the Quanta Toolbar is visible for a specific block.
   * The toolbar is rendered in the parent window (admin UI), positioned above the block in iframe.
   * Uses isBlockSelectedInIframe which verifies both visibility AND correct positioning.
   */
  async isQuantaToolbarVisibleInIframe(blockId: string): Promise<boolean> {
    const result = await this.isBlockSelectedInIframe(blockId);
    return result.ok;
  }

  /**
   * Get all buttons in the Quanta toolbar (rendered in parent window).
   * Returns a list of buttons with their title/aria-label.
   */
  async getQuantaToolbarButtons(): Promise<{ title: string; visible: boolean }[]> {
    const toolbar = this.page.locator('.quanta-toolbar');
    const buttons = toolbar.locator('button, [role="button"], a');
    const count = await buttons.count();

    const result: { title: string; visible: boolean }[] = [];
    for (let i = 0; i < count; i++) {
      const btn = buttons.nth(i);
      const title = await btn.getAttribute('title') || await btn.getAttribute('aria-label') || '';
      const visible = await btn.isVisible();
      if (title) {
        result.push({ title, visible });
      }
    }
    return result;
  }

  /**
   * Get a format button from the Quanta toolbar by name (e.g., "Bold", "Italic").
   * Uses accessible name matching which works with title attribute.
   */
  getQuantaToolbarFormatButton(formatName: string): Locator {
    return this.page.locator('.quanta-toolbar').getByRole('button', { name: new RegExp(formatName, 'i') });
  }

  /**
   * Check if a format button is visible in the Quanta toolbar.
   */
  async isFormatButtonVisible(formatName: string): Promise<boolean> {
    const button = this.getQuantaToolbarFormatButton(formatName);
    return await button.isVisible();
  }

  /**
   * Scroll a block into view with room for the toolbar above it.
   * The toolbar is in the parent page, positioned based on block position.
   * Using 'center' ensures there's room above for the toolbar.
   */
  async scrollBlockIntoViewWithToolbarRoom(blockId: string): Promise<void> {
    const iframe = this.getIframe();
    const block = iframe.locator(`[data-block-uid="${blockId}"]`);
    await block.evaluate((el) => {
      el.scrollIntoView({ block: 'center', behavior: 'instant' });
    });
  }

  /**
   * Check if the toolbar is covered by the sidebar.
   * Returns true if NOT covered (toolbar is fully visible and clickable).
   */
  async isToolbarNotCoveredBySidebar(): Promise<boolean> {
    const toolbar = this.page.locator('.quanta-toolbar');
    const sidebar = this.page.locator('.sidebar-container:not(.collapsed)');

    // If sidebar doesn't exist or is collapsed, toolbar can't be covered
    if (!(await sidebar.isVisible())) {
      return true;
    }

    const toolbarBox = await toolbar.boundingBox();
    const sidebarBox = await sidebar.boundingBox();

    if (!toolbarBox || !sidebarBox) {
      return true; // Can't determine, assume ok
    }

    // Check if toolbar's right edge extends into sidebar's left edge
    const toolbarRight = toolbarBox.x + toolbarBox.width;
    const sidebarLeft = sidebarBox.x;

    // Toolbar is not covered if its right edge is left of sidebar's left edge
    return toolbarRight <= sidebarLeft;
  }

  /**
   * Wait for the Quanta toolbar to appear on a block and scroll it into view.
   * Also verifies the toolbar is not covered by the sidebar.
   */
  async waitForQuantaToolbar(blockId: string, timeout: number = 10000): Promise<void> {
    // Wait until toolbar is positioned correctly relative to the block
    // (isBlockSelectedInIframe checks visibility AND positioning)
    await expect.poll(async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res: any = await this.isBlockSelectedInIframe(blockId);
      if (typeof res === 'boolean') return res;
      return !!res && !!res.ok;
    }, { timeout }).toBeTruthy();

    // Scroll block into view with room for toolbar
    await this.scrollBlockIntoViewWithToolbarRoom(blockId);

    // After scrolling, the viewport position changed, so poll again to ensure
    // the toolbar has re-adjusted its position correctly
    await expect.poll(async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res: any = await this.isBlockSelectedInIframe(blockId);
      if (typeof res === 'boolean') return res;
      return !!res && !!res.ok;
    }, { timeout: 5000 }).toBeTruthy();

    // Verify toolbar is not covered by sidebar
    await expect.poll(async () => {
      return await this.isToolbarNotCoveredBySidebar();
    }, { timeout: 5000 }).toBeTruthy();
  }

  async getMenuButtonInQuantaToolbar(blockId: string, formatKeyword:string): Promise<void> {
    const menuButton = this.page.locator(
      `.quanta-toolbar [title*="${formatKeyword}" i]`
    );

    // Check if menu button exists
    const buttonCount = await menuButton.count();
    if (buttonCount === 0) {
      throw new Error(
        `Menu button not found in Quanta toolbar for block "${blockId}". ` +
        `The menu button should be created by hydra.js createQuantaToolbar().`
      );
    }

    // Verify button is visible
    try {
      await menuButton.waitFor({ state: 'visible', timeout: 2000 });
    } catch (e) {
      throw new Error(
        `Menu button exists but is not visible for block "${blockId}". ` +
        `Check toolbar CSS or positioning.`
      );
    }

    return menuButton;
  }

  /**
   * Click the dropdown menu button to reveal Settings/Remove options.
   */
  async openQuantaToolbarMenu(blockId: string): Promise<void> {

    // First wait for the Quanta toolbar to appear
    await this.waitForQuantaToolbar(blockId);

    const menuButton = await this.getMenuButtonInQuantaToolbar(blockId, 'options');
    await menuButton.click();

    // Wait for dropdown to appear
    const dropdown = this.page.locator(
      `.volto-hydra-dropdown-menu`
    );

    try {
      await dropdown.waitFor({ state: 'visible', timeout: 3000 });
    } catch (e) {
      throw new Error(
        `Dropdown menu did not appear after clicking menu button for block "${blockId}". ` +
        `Check that the click handler is working and the dropdown is being shown.`
      );
    }
  }

  /**
   * Get the Quanta Toolbar dropdown menu (rendered in parent window via portal).
   */
  async getQuantaToolbarMenu(blockId: string): Promise<Locator> {
    // The dropdown is rendered via portal to document.body in parent window
    // It doesn't have a .visible class - it's conditionally rendered
    const dropdown = this.page.locator('.volto-hydra-dropdown-menu');
    return dropdown;
  }

  /**
   * Get the dropdown menu options (Settings, Remove).
   * The dropdown is rendered via portal to document.body in parent window.
   */
  async getQuantaToolbarMenuOptions(_blockId: string): Promise<string[]> {
    // The dropdown is in the parent window, not in the iframe
    const dropdown = this.page.locator('.volto-hydra-dropdown-menu');
    const items = dropdown.locator('.volto-hydra-dropdown-item');

    const options: string[] = [];
    const count = await items.count();

    for (let i = 0; i < count; i++) {
      // Text is directly in the item, not in a nested element
      const text = await items.nth(i).textContent();
      if (text) {
        // Remove emoji prefix (e.g., "⚙️ Settings" -> "Settings")
        const cleanText = text.replace(/^[^\w]*/, '').trim();
        if (cleanText) {
          options.push(cleanText);
        }
      }
    }

    return options;
  }

  /**
   * Click a specific menu option (Settings or Remove).
   */
  async clickQuantaToolbarMenuOption(
    blockId: string,
    optionText: 'Settings' | 'Remove'
  ): Promise<void> {
    const dropdown = this.page.locator(`.volto-hydra-dropdown-menu`);
    const option = dropdown.locator(
      `.volto-hydra-dropdown-item:has-text("${optionText}")`
    );
    // Wait for option to be visible and clickable
    await option.waitFor({ state: 'visible', timeout: 3000 });
    await option.click();
    // Wait for dropdown to close (confirms action was triggered)
    await dropdown.waitFor({ state: 'hidden', timeout: 3000 });
  }

  /**
   * Click a format button (bold, italic, strikethrough, link) in the currently visible Quanta Toolbar.
   * Searches for the button by title attribute containing the format keyword.
   * Since only one toolbar can be open at a time, no blockId is needed.
   */
  async clickFormatButton(
    format: 'bold' | 'italic' | 'strikethrough' | 'link'
  ): Promise<void> {
    // Toolbar is now rendered in parent window (admin UI), not iframe
    // Find button by title attribute (case-insensitive search)
    // Note: Semantic UI buttons render as <a> tags, not <button> tags
    const formatKeyword = format.charAt(0).toUpperCase() + format.slice(1); // Capitalize first letter
    const button = this.page.locator(
      `.quanta-toolbar [title*="${formatKeyword}" i]`
    );

    const count = await button.count();

    if (count === 0) {
      throw new Error(
        `Format button "${format}" not found in visible toolbar. ` +
        `Expected button with title containing "${formatKeyword}". ` +
        `Check that: (1) a block with a slate field is selected, (2) toolbar is visible in admin UI, ` +
        `(3) the button has a title attribute set.`
      );
    }

    if (count > 1) {
      throw new Error(
        `Found ${count} buttons matching "${format}" - test is not deterministic. ` +
        `Expected exactly one button with title containing "${formatKeyword}".`
      );
    }

    await button.waitFor({ state: 'visible', timeout: 2000 });
    await button.click();
  }

  /**
   * Apply a format to the currently selected text in an editor.
   * This is a higher-level helper that:
   * 1. Clicks the format button
   * 2. Waits for the formatted text to appear
   * 3. Re-selects all text (to restore selection after DOM re-render)
   *
   * Use this instead of clickFormatButton when you need to apply multiple
   * formats in sequence, as the DOM re-render can lose the selection.
   */
  async applyFormat(
    editor: Locator,
    format: 'bold' | 'italic',
    expectedText: RegExp | string,
  ): Promise<void> {
    await this.clickFormatButton(format);
    await this.waitForFormattedText(editor, expectedText, format);
    // Re-select all text to restore selection after DOM re-render
    // There is a bug if this is not automatically done by hydra.js
    // await this.selectAllTextInEditor(editor);
  }

  /**
   * Check if a format button is in active state.
   * Semantic UI Button with active={true} gets the "active" CSS class.
   */
  async isActiveFormatButton(
    format: 'bold' | 'italic' | 'strikethrough' | 'link'
  ): Promise<boolean> {
    const formatKeyword = format.charAt(0).toUpperCase() + format.slice(1);
    const button = this.page.locator(
      `.quanta-toolbar [title*="${formatKeyword}" i]`
    );

    const count = await button.count();
    if (count === 0) {
      throw new Error(`Format button "${format}" not found in visible toolbar`);
    }

    // Check if button has "active" class (added by Semantic UI when active={true})
    const hasActiveClass = await button.first().evaluate((el) =>
      el.classList.contains('active')
    );

    return hasActiveClass;
  }

  /**
   * Verify that the current selection matches the expected text.
   * Uses Playwright polling to handle async selection restoration after formatting.
   */
  async verifySelectionMatches(editor: Locator, expectedText: string): Promise<void> {
    await expect
      .poll(
        async () => {
          return await editor.evaluate(() => {
            const selection = window.getSelection();
            return selection ? selection.toString() : '';
          });
        },
        {
          message: `Expected selection to be "${expectedText}"`,
          timeout: 2000,
        }
      )
      .toBe(expectedText);
  }

  /**
   * Select all text in a contenteditable element using JavaScript Selection API.
   * This is more reliable than using keyboard shortcuts.
   * Handles both plain text and formatted text (where text is inside SPAN, STRONG, etc.)
   */
  async selectAllTextInEditor(editor: Locator): Promise<void> {
    // Get the expected text content (visible text, trimmed)
    const expectedText = await editor.evaluate((el) => el.textContent?.trim() || '');

    // Use platform-appropriate keyboard shortcut (Cmd+A on Mac, Ctrl+A elsewhere)
    await editor.press('ControlOrMeta+a');

    // Wait for selection to match the editor's text content
    await expect
      .poll(
        async () => {
          return editor.evaluate(() => {
            const sel = window.getSelection();
            return sel?.toString().trim() || '';
          });
        },
        { timeout: 5000 }
      )
      .toBe(expectedText);
  }

  /**
   * Copy selected text and return clipboard content.
   * Uses native keyboard copy (ControlOrMeta+c) and reads from clipboard API.
   * Automatically grants clipboard permissions if needed.
   */
  async copyAndGetClipboardText(editor: Locator): Promise<string> {
    // Grant clipboard permissions
    await this.page.context().grantPermissions(['clipboard-read', 'clipboard-write']);

    // Trigger native copy with keyboard shortcut
    await editor.press('ControlOrMeta+c');

    // Small delay for clipboard to be populated
    await this.page.waitForTimeout(50);

    // Read clipboard from parent page (clipboard is shared)
    const clipboardText = await this.page.evaluate(() =>
      navigator.clipboard.readText()
    );

    return clipboardText;
  }

  /**
   * Cut selected text and return the cut content.
   * Uses native keyboard cut (ControlOrMeta+x) and reads from clipboard API.
   * Automatically grants clipboard permissions if needed.
   */
  async cutSelectedText(editor: Locator): Promise<string> {
    // Grant clipboard permissions
    await this.page.context().grantPermissions(['clipboard-read', 'clipboard-write']);

    // Trigger native cut with keyboard shortcut
    await editor.press('ControlOrMeta+x');

    // Small delay for clipboard to be populated
    await this.page.waitForTimeout(50);

    // Read clipboard from parent page (clipboard is shared)
    const clipboardText = await this.page.evaluate(() =>
      navigator.clipboard.readText()
    );

    return clipboardText;
  }

  /**
   * Paste text from clipboard into the editor.
   * Uses native keyboard paste (ControlOrMeta+v).
   * Automatically grants clipboard permissions if needed.
   */
  async pasteFromClipboard(editor: Locator): Promise<void> {
    // Grant clipboard permissions
    await this.page.context().grantPermissions(['clipboard-read', 'clipboard-write']);

    // Trigger native paste with keyboard shortcut
    await editor.press('ControlOrMeta+v');

    // Small delay for paste to complete
    await this.page.waitForTimeout(50);
  }

  /**
   * Get selection state info from an editor element.
   * Useful for debugging selection/focus issues.
   */
  async getSelectionInfo(editor: Locator): Promise<{
    rangeCount: number;
    isCollapsed: boolean;
    anchorNodeName: string | null;
    anchorOffset: number;
    focusNodeName: string | null;
    focusOffset: number;
    activeElementTag: string | null;
    editorHasFocus: boolean;
  }> {
    return await editor.evaluate((el) => {
      const sel = window.getSelection();
      const activeEl = document.activeElement;
      return {
        rangeCount: sel?.rangeCount ?? 0,
        isCollapsed: sel?.isCollapsed ?? true,
        anchorNodeName: sel?.anchorNode?.nodeName ?? null,
        anchorOffset: sel?.anchorOffset ?? 0,
        focusNodeName: sel?.focusNode?.nodeName ?? null,
        focusOffset: sel?.focusOffset ?? 0,
        activeElementTag: activeEl?.tagName ?? null,
        editorHasFocus: el.contains(activeEl),
      };
    });
  }

  /**
   * Get the visible text before and after the cursor position.
   * Uses Range APIs to get accurate text regardless of DOM structure.
   * Strips ZWS characters to return only visible text.
   */
  async getTextAroundCursor(editor: Locator): Promise<{
    textBefore: string;
    textAfter: string;
  }> {
    return await editor.evaluate((el) => {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) {
        return { textBefore: '', textAfter: '' };
      }

      const range = sel.getRangeAt(0);
      const ZWS = '\u200B\uFEFF';

      // Get text before cursor
      const beforeRange = document.createRange();
      beforeRange.selectNodeContents(el);
      beforeRange.setEnd(range.startContainer, range.startOffset);
      const textBefore = beforeRange.toString().replace(new RegExp(`[${ZWS}]`, 'g'), '');

      // Get text after cursor
      const afterRange = document.createRange();
      afterRange.selectNodeContents(el);
      afterRange.setStart(range.endContainer, range.endOffset);
      const textAfter = afterRange.toString().replace(new RegExp(`[${ZWS}]`, 'g'), '');

      return { textBefore, textAfter };
    });
  }

  /**
   * Get the number of blocks rendered in the iframe.
   */
  async getBlockCountInIframe(): Promise<number> {
    const iframe = this.getIframe();
    const blocks = iframe.locator('[data-block-uid]');
    return await blocks.count();
  }

  /**
   * Get the text content of a block in the iframe.
   * Handles both mock frontend (descendant) and Nuxt frontend (same element) patterns.
   */
  async getBlockTextInIframe(blockId: string): Promise<string> {
    const iframe = this.getIframe();
    // Try descendant first (mock frontend: data-block-uid > [data-editable-field])
    let editor = iframe.locator(`[data-block-uid="${blockId}"] [data-editable-field]`).first();

    if ((await editor.count()) === 0) {
      // Nuxt pattern: data-block-uid and data-editable-field on same element
      editor = iframe.locator(`[data-block-uid="${blockId}"][data-editable-field]`).first();
    }

    // Wait a moment for any pending mutations to complete
    await this.page.waitForTimeout(100);

    return (await editor.textContent()) || '';
  }

  /**
   * Get the editor locator for a block.
   * Handles both mock frontend (descendant) and Nuxt frontend (same element) patterns.
   *
   * @param blockId - The block UID
   * @param fieldName - Optional field name to target a specific editable field (e.g., 'title', 'description')
   * @returns The editor locator
   */
  async getEditorLocator(blockId: string, fieldName?: string): Promise<Locator> {
    const iframe = this.getIframe();

    // If field name specified, target that specific field
    if (fieldName) {
      return iframe.locator(
        `[data-block-uid="${blockId}"] [data-editable-field="${fieldName}"]`,
      );
    }

    // Try descendant first (mock frontend: data-block-uid > [contenteditable])
    let editor = iframe
      .locator(`[data-block-uid="${blockId}"] [contenteditable="true"]`)
      .first();

    // Use count() instead of isVisible() - element might exist but be scrolled out of view
    const count = await editor.count().catch(() => 0);

    if (count === 0) {
      // Try same-element selector (Nuxt: data-block-uid AND contenteditable on same element)
      editor = iframe.locator(
        `[data-block-uid="${blockId}"][contenteditable="true"]`,
      );
    }

    return editor;
  }

  /**
   * Get the text content of an editor, stripping ZWS characters.
   * ZWS characters (\u200B, \uFEFF) are inserted for cursor positioning
   * but are invisible to users, so tests should verify what users see.
   */
  async getCleanTextContent(editor: Locator): Promise<string> {
    const text = (await editor.textContent()) || '';
    // Strip ZWS and trim whitespace (Vue/Nuxt can have template whitespace)
    return text.replace(/[\u200B\uFEFF]/g, '').trim();
  }

  /**
   * Wait for editor text to match a regex pattern.
   * Useful for waiting until text changes stabilize after typing or formatting.
   * Uses textContent() directly to preserve whitespace (toHaveText normalizes it).
   */
  async waitForEditorText(
    editor: Locator,
    pattern: RegExp | string,
    options: { timeout?: number } = {}
  ): Promise<string> {
    const timeout = options.timeout ?? 5000;
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;

    let text = '';
    await expect(async () => {
      text = (await editor.textContent()) || '';
      // Strip only truly invisible characters (ZWS, word joiner) - don't convert to space
      // Keep NBSP as regular space since it's a visible space character
      // Don't collapse multiple spaces - that could hide missing space bugs
      text = text
        .replace(/[\uFEFF\u200B\u2060]/g, '') // Remove invisible chars
        .replace(/\u00A0/g, ' ') // Convert NBSP to regular space
        .trim();
      expect(text).toMatch(regex);
    }).toPass({ timeout });
    return text;
  }

  /**
   * Get the CSS selector for a format type that works with both frontends.
   * Mock frontend uses inline styles, Nuxt uses semantic tags.
   */
  getFormatSelector(format: 'bold' | 'italic'): string {
    return format === 'bold'
      ? 'span[style*="font-weight: bold"], strong, b'
      : 'span[style*="font-style: italic"], em, i';
  }

  /**
   * Wait for formatted text (bold/italic) to appear in the editor.
   * Useful for waiting until formatting has been applied after Ctrl+B or toolbar clicks.
   */
  async waitForFormattedText(
    editor: Locator,
    pattern: RegExp | string,
    format: 'bold' | 'italic',
    options: { timeout?: number } = {},
  ): Promise<void> {
    const timeout = options.timeout ?? 5000;
    const selector = this.getFormatSelector(format);
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;

    // Use filter to find elements matching the pattern, first() handles multiple matches
    await expect(editor.locator(selector).filter({ hasText: regex }).first()).toBeVisible({ timeout });
  }

  /**
   * Wait for formatted text (bold/italic) to be removed from the editor.
   * Useful for waiting until formatting has been removed after toggling off.
   */
  async waitForFormattingRemoved(
    editor: Locator,
    format: 'bold' | 'italic',
    options: { timeout?: number } = {},
  ): Promise<void> {
    const timeout = options.timeout ?? 5000;
    const selector = this.getFormatSelector(format);

    await expect(editor.locator(selector)).not.toBeVisible({ timeout });
  }

  /**
   * Check if a specific block is selected in the iframe.
   * Verifies that:
   * 1. Block UI overlays are visible (toolbar, outline, add button)
   * 2. They are positioned correctly relative to the block (toolbar above, add button below)
   * 3. Elements are horizontally aligned with the block
   */
  async isBlockSelectedInIframe(blockId: string): Promise<{ ok: boolean; reason?: string }> {
    try {
      // Verify essential UI overlays are visible (toolbar and outline)
      // Note: add button visibility/positioning is checked separately by verifyBlockUIPositioning
      const toolbar = this.page.locator('.quanta-toolbar');
      const outline = this.page.locator('.volto-hydra-block-outline');

      const toolbarVisible = await toolbar.isVisible();
      const outlineVisible = await outline.isVisible();

      if (!toolbarVisible || !outlineVisible) {
        return {
          ok: false,
          reason: `Overlays not visible: toolbar=${toolbarVisible}, outline=${outlineVisible}`,
        };
      }

      // Verify the outline covers THIS specific block
      const blockBox = await this.getBlockBoundingBoxInIframe(blockId);
      const outlineBox = await this.getBlockOutlineBoundingBox();

      if (!blockBox || !outlineBox) {
        return {
          ok: false,
          reason: `Missing bounding boxes: block=${!!blockBox}, outline=${!!outlineBox}`,
        };
      }

      // Check if outline covers this specific block
      // Outline is either a full box around the block, or a bottom line
      const tolerance = 20;

      // Check horizontal alignment (X and width should match)
      const xDiff = Math.abs(blockBox.x - outlineBox.x);
      const widthDiff = Math.abs(blockBox.width - outlineBox.width);

      if (xDiff > tolerance || widthDiff > tolerance) {
        return {
          ok: false,
          reason: `Outline not horizontally aligned. Block: x=${blockBox.x.toFixed(0)} w=${blockBox.width.toFixed(0)}, Outline: x=${outlineBox.x.toFixed(0)} w=${outlineBox.width.toFixed(0)}`,
        };
      }

      // Check vertical alignment
      // If outline is a full box: top should match block top, height should match
      // If outline is a bottom line: top should be at block bottom
      const isFullBox = outlineBox.height > 10;
      if (isFullBox) {
        // Full box - should surround the block
        const topDiff = Math.abs(blockBox.y - outlineBox.y);
        const heightDiff = Math.abs(blockBox.height - outlineBox.height);
        if (topDiff > tolerance || heightDiff > tolerance) {
          return {
            ok: false,
            reason: `Outline box not around block. Block: y=${blockBox.y.toFixed(0)} h=${blockBox.height.toFixed(0)}, Outline: y=${outlineBox.y.toFixed(0)} h=${outlineBox.height.toFixed(0)}`,
          };
        }
      } else {
        // Bottom line - should be at block's bottom edge
        const blockBottom = blockBox.y + blockBox.height;
        const bottomDiff = Math.abs(blockBottom - outlineBox.y);
        if (bottomDiff > tolerance) {
          return {
            ok: false,
            reason: `Outline line not at block bottom. Block bottom: ${blockBottom.toFixed(0)}, Outline Y: ${outlineBox.y.toFixed(0)}, diff: ${bottomDiff.toFixed(0)}`,
          };
        }
      }

      return { ok: true };
    } catch (error) {
      // If positioning verification fails, the block is not properly selected
      return { ok: false, reason: `Positioning verification error: ${error}` };
    }
  }

  /**
   * Get the bounding box of the Quanta toolbar overlay in the parent window.
   */
  async getToolbarBoundingBox(): Promise<{ x: number; y: number; width: number; height: number } | null> {
    const toolbar = this.page.locator('.quanta-toolbar');
    return await toolbar.boundingBox();
  }

  /**
   * Get the bounding box of the block outline overlay in the parent window.
   */
  async getBlockOutlineBoundingBox(): Promise<{ x: number; y: number; width: number; height: number } | null> {
    const outline = this.page.locator('.volto-hydra-block-outline');
    return await outline.boundingBox();
  }

  /**
   * Monitor the outline position during an action and check if it ever appears at an invalid position.
   * Returns true if the outline was ever at a bad position (x < minX or visible when should be hidden).
   *
   * @param action - The async action to perform while monitoring
   * @param minX - Minimum acceptable X position (outline going left of this is bad)
   * @param checkInterval - How often to check position in ms
   * @returns Object with badPositionDetected and details about what was found
   */
  async monitorOutlinePositionDuringAction(
    action: () => Promise<void>,
    minX: number = 0,
    checkInterval: number = 16,
  ): Promise<{ badPositionDetected: boolean; minXSeen: number | null; positions: Array<{ x: number; y: number; visible: boolean }> }> {
    const outline = this.page.locator('.volto-hydra-block-outline');
    const positions: Array<{ x: number; y: number; visible: boolean }> = [];
    let badPositionDetected = false;
    let minXSeen: number | null = null;
    let monitoring = true;

    // Start monitoring in background
    const monitorPromise = (async () => {
      while (monitoring) {
        const visible = await outline.isVisible().catch(() => false);
        if (visible) {
          const box = await outline.boundingBox().catch(() => null);
          if (box) {
            positions.push({ x: box.x, y: box.y, visible: true });
            if (minXSeen === null || box.x < minXSeen) {
              minXSeen = box.x;
            }
            if (box.x < minX) {
              badPositionDetected = true;
            }
          }
        } else {
          positions.push({ x: 0, y: 0, visible: false });
        }
        await new Promise((r) => setTimeout(r, checkInterval));
      }
    })();

    // Perform the action
    await action();

    // Wait a bit more after action completes to catch any delayed updates
    await new Promise((r) => setTimeout(r, 100));

    // Stop monitoring
    monitoring = false;
    await monitorPromise.catch(() => {}); // Ignore any errors from the monitoring loop

    return { badPositionDetected, minXSeen, positions };
  }

  /**
   * Get the bounding box of the add button overlay in the parent window.
   */
  async getAddButtonBoundingBox(): Promise<{ x: number; y: number; width: number; height: number } | null> {
    const addButton = this.page.locator('.volto-hydra-add-button');
    return await addButton.boundingBox();
  }

  /**
   * Helper to clarify coordinate systems.
   * Playwright's iframe.locator().boundingBox() returns coordinates in the PAGE viewport,
   * which for elements inside an iframe means coordinates relative to the PARENT PAGE,
   * NOT relative to the iframe's internal document. So no conversion is needed.
   */
  async getBoundsInParentCoordinates(
    elementBox: { x: number; y: number; width: number; height: number }
  ): Promise<{ x: number; y: number; width: number; height: number }> {
    // Playwright already returns page-relative coordinates, even for iframe elements
    return elementBox;
  }

  /**
   * Get the bounding box of a block in the iframe, in parent window coordinates.
   */
  async getBlockBoundingBoxInIframe(blockId: string): Promise<{ x: number; y: number; width: number; height: number } | null> {
    const iframe = this.getIframe();
    const block = iframe.locator(`[data-block-uid="${blockId}"]`);
    const blockBox = await block.boundingBox();

    if (!blockBox) return null;

    // Convert from iframe page coordinates to parent window coordinates
    return await this.getBoundsInParentCoordinates(blockBox);
  }

  /**
   * Check if the outline is a full border or just a bottom line.
   * Returns the style information about the outline.
   */
  async getOutlineStyle(): Promise<{ isFull: boolean; height: number }> {
    const outline = this.page.locator('.volto-hydra-block-outline');
    const height = await outline.evaluate((el) => {
      const style = window.getComputedStyle(el);
      return parseFloat(style.height);
    });

    return {
      isFull: height > 10, // Full outline is block height + 4px, line is 3px
      height
    };
  }

  /**
   * Verify the positioning relationships between block UI elements and the block.
   * Returns measurements for toolbar, add button, and alignment.
   */
  async verifyBlockUIPositioning(
    blockId: string,
    options: { timeout?: number } = {},
  ): Promise<{
    toolbarAboveBlock: number;
    addButtonBelowBlock: number;
    addButtonRightOfBlock: number;
    addButtonDirection: 'bottom' | 'right' | 'unknown';
    horizontalAlignment: boolean;
  }> {
    const timeout = options.timeout ?? 5000;
    const startTime = Date.now();

    // Poll until the add button is positioned for this block (top or bottom aligned)
    // This handles the race condition where React has rendered but browser hasn't painted
    while (Date.now() - startTime < timeout) {
      const blockBox = await this.getBlockBoundingBoxInIframe(blockId);
      const toolbarBox = await this.getToolbarBoundingBox();
      const addButtonBox = await this.getAddButtonBoundingBox();

      if (blockBox && toolbarBox && addButtonBox) {
        // Check if add button is positioned for THIS block (either top-aligned or bottom-aligned)
        const addButtonTopAligned = Math.abs(addButtonBox.y - blockBox.y) < 30;
        const addButtonBottomAligned =
          Math.abs(addButtonBox.y - (blockBox.y + blockBox.height)) < 30;

        if (addButtonTopAligned || addButtonBottomAligned) {
          // Add button is positioned for this block, return the measurements
          return this.measureBlockUIPositioningInternal(
            blockBox,
            toolbarBox,
            addButtonBox,
          );
        }
      }

      // Wait a bit before polling again
      await this.page.waitForTimeout(50);
    }

    // Timeout - return measurements anyway (test will likely fail with useful info)
    const blockBox = await this.getBlockBoundingBoxInIframe(blockId);
    const toolbarBox = await this.getToolbarBoundingBox();
    const addButtonBox = await this.getAddButtonBoundingBox();

    if (!blockBox || !toolbarBox || !addButtonBox) {
      throw new Error(
        `Missing bounding boxes: block=${!!blockBox}, toolbar=${!!toolbarBox}, addButton=${!!addButtonBox}`,
      );
    }

    return this.measureBlockUIPositioningInternal(
      blockBox,
      toolbarBox,
      addButtonBox,
    );
  }

  /**
   * Internal helper to calculate positioning measurements from bounding boxes.
   */
  private measureBlockUIPositioningInternal(
    blockBox: { x: number; y: number; width: number; height: number },
    toolbarBox: { x: number; y: number; width: number; height: number },
    addButtonBox: { x: number; y: number; width: number; height: number },
  ): {
    toolbarAboveBlock: number;
    addButtonBelowBlock: number;
    addButtonRightOfBlock: number;
    addButtonDirection: 'bottom' | 'right' | 'unknown';
    horizontalAlignment: boolean;
  } {
    // Distance from bottom of block to top of add button (positive = button is below)
    const addButtonBelowBlock = addButtonBox.y - (blockBox.y + blockBox.height);
    // Distance from right edge of block to left edge of add button (positive = button is to right)
    const addButtonRightOfBlock = addButtonBox.x - (blockBox.x + blockBox.width);

    // Determine direction based on position
    // "bottom" = button's top is near/below block's bottom (within 20px)
    // "right" = button's top is near block's top (top-aligned, within 20px)
    //           OR button is constrained inside block at bottom-right corner
    let addButtonDirection: 'bottom' | 'right' | 'unknown' = 'unknown';
    const addButtonTopAligned = Math.abs(addButtonBox.y - blockBox.y) < 20;
    const addButtonBottomAligned =
      addButtonBelowBlock >= -5 && addButtonBelowBlock < 20;

    // Detect constrained positioning: button is inside block (negative values)
    // but positioned near the right edge (typical for horizontal containers when space is tight)
    const isConstrainedRight =
      addButtonBelowBlock < -20 && // Well above block bottom (inside block)
      addButtonRightOfBlock < 0 && // Inside block horizontally
      addButtonRightOfBlock > -50; // But near right edge

    if (addButtonBottomAligned && !addButtonTopAligned) {
      addButtonDirection = 'bottom';
    } else if (addButtonTopAligned || isConstrainedRight) {
      // Top-aligned OR constrained at bottom-right means 'right' direction
      addButtonDirection = 'right';
    }

    return {
      // Distance from bottom of toolbar to top of block
      toolbarAboveBlock: blockBox.y - (toolbarBox.y + toolbarBox.height),
      // Distance from bottom of block to top of add button
      addButtonBelowBlock,
      // Distance from right edge of block to left edge of add button
      addButtonRightOfBlock,
      // Detected direction of add button relative to block
      addButtonDirection,
      // Check if toolbar and block are horizontally aligned (within 2px tolerance)
      horizontalAlignment: Math.abs(toolbarBox.x - blockBox.x) < 2,
    };
  }

  /**
   * Save the current content being edited.
   */
  async saveContent(): Promise<void> {
    const saveButton = this.page.locator('#toolbar-save, button:has-text("Save")');
    await saveButton.click();
    // Wait for save to complete
    await this.page.waitForTimeout(1000);
  }

  /**
   * Get cursor position information for a contenteditable element.
   * Returns details about the cursor position, selection, and text content.
   */
  async getCursorInfo(editor: any): Promise<{
    text: string;
    textLength: number;
    selectionCollapsed: boolean;
    cursorOffset: number | undefined;
    cursorContainerText: string;
    isFocused: boolean;
  }> {
    return await editor.evaluate((el: HTMLElement) => {
      const doc = el.ownerDocument;
      const selection = doc.getSelection();
      const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
      const text = el.innerText || el.textContent || '';

      return {
        text: text,
        textLength: text.length,
        selectionCollapsed: selection?.isCollapsed ?? true,
        cursorOffset: range?.startOffset,
        cursorContainerText: range?.startContainer?.textContent || '',
        isFocused: doc.activeElement === el,
      };
    });
  }

  /**
   * Assert that the cursor is at the end of the text in a contenteditable element.
   * Throws an error if the cursor position is not as expected.
   */
  async assertCursorAtEnd(editor: any, blockId: string, expectedText?: string): Promise<void> {
    const cursorInfo = await this.getCursorInfo(editor);

    if (!cursorInfo.isFocused) {
      throw new Error(
        `Block ${blockId} lost focus. ` +
        `Expected text: "${expectedText || 'N/A'}", actual: "${cursorInfo.text}"`
      );
    }

    if (!cursorInfo.selectionCollapsed) {
      throw new Error(
        `Block ${blockId} cursor is not collapsed (text is selected). ` +
        `This indicates the cursor was reset.`
      );
    }

    // Cursor should be at or near the end of the text
    const expectedEnd = cursorInfo.textLength;
    if (cursorInfo.cursorOffset !== undefined &&
        Math.abs(cursorInfo.cursorOffset - expectedEnd) > 2) {
      throw new Error(
        `Block ${blockId} cursor position unexpected. ` +
        `Expected near end (${expectedEnd}), but at offset ${cursorInfo.cursorOffset}. ` +
        `Text: "${cursorInfo.text}". This indicates cursor was reset.`
      );
    }
  }

  /**
   * Assert that the text content matches what was expected.
   * Allows for some variation in whitespace and formatting.
   */
  async assertTextMatches(editor: any, blockId: string, expectedText: string): Promise<void> {
    const cursorInfo = await this.getCursorInfo(editor);

    // Check if the text contains at least the beginning of expected text
    if (!cursorInfo.text.includes(expectedText.substring(0, Math.min(5, expectedText.length)))) {
      throw new Error(
        `Block ${blockId} text doesn't match after typing. ` +
        `Expected: "${expectedText}", actual: "${cursorInfo.text}"`
      );
    }
  }

  /**
   * Move cursor to the end of the text in a contenteditable element.
   * Finds the last non-whitespace text node and places cursor at the end of it.
   * This works correctly on both mock (flat structure) and Nuxt (nested p/span structure).
   */
  async moveCursorToEnd(editor: any): Promise<void> {
    await editor.evaluate((el: any) => {
      const range = el.ownerDocument.createRange();
      const selection = el.ownerDocument.defaultView.getSelection();

      // Find all text nodes, keeping only ones with actual content
      const walker = el.ownerDocument.createTreeWalker(
        el,
        NodeFilter.SHOW_TEXT,
        null,
      );
      let lastContentTextNode = null;
      let node;
      while ((node = walker.nextNode())) {
        // Skip whitespace-only text nodes (newlines, spaces between elements)
        if (node.textContent && node.textContent.trim().length > 0) {
          lastContentTextNode = node;
        }
      }

      if (lastContentTextNode) {
        // Place cursor at end of last content text node
        range.setStart(
          lastContentTextNode,
          lastContentTextNode.textContent?.length || 0,
        );
        range.collapse(true);
      } else {
        // Fallback: no text nodes, collapse to end of container
        range.selectNodeContents(el);
        range.collapse(false);
      }

      selection.removeAllRanges();
      selection.addRange(range);
    });
  }

  /**
   * Move cursor to the start of the text in a contenteditable element.
   * Finds the first text node and places cursor at the start of it.
   * This works correctly on both mock (flat structure) and Nuxt (nested p/span structure).
   */
  async moveCursorToStart(editor: any): Promise<void> {
    await editor.evaluate((el: any) => {
      const range = el.ownerDocument.createRange();
      const selection = el.ownerDocument.defaultView.getSelection();

      // Find the first text node in the element
      const walker = el.ownerDocument.createTreeWalker(
        el,
        NodeFilter.SHOW_TEXT,
        null,
      );
      const firstTextNode = walker.nextNode();

      if (firstTextNode) {
        // Place cursor at start of first text node
        range.setStart(firstTextNode, 0);
        range.collapse(true);
      } else {
        // Fallback: no text nodes, collapse to start of container
        range.selectNodeContents(el);
        range.collapse(true);
      }

      selection.removeAllRanges();
      selection.addRange(range);
    });
  }

  /**
   * Get click coordinates for a specific character position in a text element.
   * Uses the Range API to find the exact pixel position of a character.
   *
   * @param editor - The element containing the text
   * @param charPosition - The character offset to get coordinates for (0-based)
   * @returns Click position relative to the element, or null if not found
   */
  async getClickPositionForCharacter(
    editor: Locator,
    charPosition: number,
  ): Promise<{ x: number; y: number } | null> {
    return await editor.evaluate(
      (el: HTMLElement, pos: number) => {
        // Find the first text node with actual content (skip whitespace-only nodes)
        const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
        let textNode = walker.nextNode();
        while (textNode && (!textNode.textContent || !textNode.textContent.trim())) {
          textNode = walker.nextNode();
        }
        if (!textNode || !textNode.textContent) return null;

        // Clamp position to valid range
        const clampedPos = Math.min(pos, textNode.textContent.length);

        // Create a range at the specified position
        const range = document.createRange();
        range.setStart(textNode, clampedPos);
        range.collapse(true);

        // Get the bounding rect of that position
        const rect = range.getBoundingClientRect();
        const elRect = el.getBoundingClientRect();

        // Return position relative to element
        return {
          x: rect.left - elRect.left,
          y: rect.top - elRect.top + rect.height / 2,
        };
      },
      charPosition,
    );
  }

  /**
   * Move cursor to a specific position in a contenteditable element.
   * Uses Selection.modify() to move by visible characters, handling Vue/Nuxt empty text nodes.
   *
   * @param editor - The contenteditable element
   * @param position - The character offset position to move to (0-based)
   */
  async moveCursorToPosition(editor: any, position: number): Promise<void> {
    await editor.evaluate(
      (el: any, pos: number) => {
        const doc = el.ownerDocument;
        const selection = doc.defaultView.getSelection();

        // First, move cursor to start of element
        const range = doc.createRange();
        range.selectNodeContents(el);
        range.collapse(true); // Collapse to start
        selection.removeAllRanges();
        selection.addRange(range);

        // Then move forward by visible characters using Selection.modify()
        for (let i = 0; i < pos; i++) {
          selection.modify('move', 'forward', 'character');
        }
      },
      position,
    );
  }

  /**
   * Check if an editor element is currently focused.
   *
   * @param editor - The editor element to check
   * @returns Object with isFocused boolean and activeElement info
   */
  async isEditorFocused(editor: any): Promise<{
    isFocused: boolean;
    activeElement: string;
  }> {
    return await editor.evaluate((el: HTMLElement) => {
      const doc = el.ownerDocument;
      const activeEl = doc.activeElement;
      const activeTag = activeEl?.tagName;
      const activeEditable = activeEl?.getAttribute?.('data-editable-field');
      return {
        isFocused: activeEl === el,
        activeElement: `${activeTag}[data-editable-field="${activeEditable}"]`,
      };
    });
  }

  /**
   * Check if the cursor is at a specific position in the editor.
   *
   * @param editor - The editor element to check
   * @param expectedPosition - The expected cursor position (0-based)
   * @param blockId - Optional block ID for error messages
   * @throws Error if cursor is not at the expected position, not focused, or not collapsed
   */
  async assertCursorAtPosition(
    editor: any,
    expectedPosition: number,
    blockId?: string,
  ): Promise<void> {
    const cursorInfo = await this.getCursorInfo(editor);
    const blockDesc = blockId ? `Block ${blockId}` : 'Editor';

    if (!cursorInfo.isFocused) {
      throw new Error(
        `${blockDesc}: Lost focus. Expected cursor at position ${expectedPosition}. ` +
          `Text: "${cursorInfo.text}"`,
      );
    }

    if (!cursorInfo.selectionCollapsed) {
      throw new Error(
        `${blockDesc}: Cursor not collapsed (text is selected). ` +
          `Expected cursor at position ${expectedPosition}. This indicates cursor was reset.`,
      );
    }

    if (
      cursorInfo.cursorOffset !== undefined &&
      cursorInfo.cursorOffset !== expectedPosition
    ) {
      throw new Error(
        `${blockDesc}: Cursor position wrong. ` +
          `Expected at position ${expectedPosition}, but at ${cursorInfo.cursorOffset}. ` +
          `Text: "${cursorInfo.text}". This indicates cursor was reset.`,
      );
    }
  }

  /**
   * Enter edit mode on a specific block and return the editor element.
   * This helper checks if already editable/focused, and only clicks if necessary.
   *
   * Uses [data-editable-field] selector instead of [contenteditable="true"] because
   * contenteditable may be temporarily set to "false" when the editor is blocked
   * during format operations (e.g., waiting for iframe flush to complete).
   *
   * @param blockId - The block UID to enter edit mode on
   * @param fieldName - Optional field name to target (e.g., 'value', 'title'). If not provided, uses first editable field.
   * @returns The editor element, ready for text input
   */
  async enterEditMode(blockId: string, fieldName?: string): Promise<any> {
    const iframe = this.getIframe();

    // Click the block to select it
    const blockContainer = iframe.locator(`[data-block-uid="${blockId}"]`);
    await blockContainer.click();

    // Wait for block selection to be confirmed by Admin UI
    await this.waitForBlockSelected(blockId);

    // Wait for the Quanta toolbar to appear (indicating block is selected)
    await this.waitForQuantaToolbar(blockId, 5000);

    // Now get the editor element (after block is selected and rendered)
    const editor = await this.getEditorLocator(blockId, fieldName);

    // Click the editor field to focus it
    await editor.click();

    // Wait for contenteditable to become true (may be blocked briefly)
    await expect(editor).toHaveAttribute('contenteditable', 'true', {
      timeout: 5000,
    });

    // Wait for focus to be established (may take a moment after re-renders)
    // Use polling instead of single check to handle race conditions with FORM_DATA re-renders
    await expect(async () => {
      const focusInfo = await this.isEditorFocused(editor);
      if (!focusInfo.isFocused) {
        throw new Error(
          `Block ${blockId} field${fieldName ? ` (${fieldName})` : ''} is not focused. Active element: ${focusInfo.activeElement}`,
        );
      }
    }).toPass({ timeout: 5000 });

    return editor;
  }

  /**
   * Select a range of text in an editor element.
   * The editor element should be a contenteditable element (like a <p> with data-editable-field).
   *
   * @param editor - Locator for the editor element
   * @param startOffset - Character offset to start selection
   * @param endOffset - Character offset to end selection
   */
  async selectTextRange(
    editor: Locator,
    startOffset: number,
    endOffset: number,
  ): Promise<void> {
    await editor.evaluate(
      (el, { start, end }) => {
        const doc = el.ownerDocument;
        const win = doc.defaultView;

        // Helper to find node and offset at a given character position
        // Walks all text nodes, skipping ZWS characters
        const findPositionInTextNodes = (
          targetOffset: number,
        ): { node: Node; offset: number } | null => {
          const walker = doc.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
          let currentOffset = 0;
          let node: Node | null;

          while ((node = walker.nextNode())) {
            // Get text content, filtering out ZWS
            const text = node.textContent || '';
            const cleanText = text.replace(/[\uFEFF\u200B]/g, '');
            const nodeLength = cleanText.length;

            if (currentOffset + nodeLength >= targetOffset) {
              // Target is within this node
              // Calculate offset within this node, accounting for ZWS
              let charsSeen = 0;
              let rawOffset = 0;
              for (let i = 0; i < text.length && charsSeen < targetOffset - currentOffset; i++) {
                if (text[i] !== '\uFEFF' && text[i] !== '\u200B') {
                  charsSeen++;
                }
                rawOffset++;
              }
              return { node, offset: rawOffset };
            }
            currentOffset += nodeLength;
          }
          return null;
        };

        const startPos = findPositionInTextNodes(start);
        const endPos = findPositionInTextNodes(end);

        if (startPos && endPos) {
          const range = doc.createRange();
          range.setStart(startPos.node, startPos.offset);
          range.setEnd(endPos.node, endPos.offset);
          const sel = win?.getSelection();
          sel?.removeAllRanges();
          sel?.addRange(range);
        }
      },
      { start: startOffset, end: endOffset },
    );

    // Wait for selection change to propagate
    await this.page.waitForTimeout(100);
  }

  /**
   * Edit text in a contenteditable block within the iframe.
   * Handles both cases: block already editable, or needs to be clicked to become editable.
   */
  async editBlockTextInIframe(blockId: string, newText: string): Promise<void> {
    // Enter edit mode and get the editor
    const editor = await this.enterEditMode(blockId);

    // Clear existing text by selecting all within the contenteditable field
    await this.selectAllTextInEditor(editor);

    // Type new text (will replace the selection)
    await editor.pressSequentially(newText, { delay: 10 });

    // ASSERT: Verify cursor and text after typing
    await this.assertTextMatches(editor, blockId, newText);
    await this.assertCursorAtEnd(editor, blockId, newText);
  }

  /**
   * Get the list of visible form field IDs in the sidebar.
   * Returns the field IDs that are currently visible in the sidebar form.
   */
  async getSidebarFormFields(): Promise<string[]> {
    const sidebar = this.page.locator('#sidebar-properties');
    const fieldWrappers = sidebar.locator('[class*="field-wrapper-"]');
    const count = await fieldWrappers.count();

    const fieldNames: string[] = [];
    for (let i = 0; i < count; i++) {
      const classList = await fieldWrappers.nth(i).getAttribute('class');
      if (classList) {
        // Extract field name from "field-wrapper-{name}" in class list
        const match = classList.match(/field-wrapper-(\w+)/);
        if (match) {
          fieldNames.push(match[1]);
        }
      }
    }

    return fieldNames;
  }

  /**
   * Get the value of a specific form field in the sidebar.
   * Works with text inputs, textareas, contenteditable fields, and image widgets.
   * Matches Cypress pattern: #sidebar-properties .field-wrapper-{fieldname}
   */
  async getSidebarFieldValue(fieldName: string): Promise<string | null> {
    const fieldWrapper = this.page.locator(`#sidebar-properties .field-wrapper-${fieldName}`);

    // For image widget (url field), get the src from the displayed image
    if (fieldName === 'url') {
      const img = fieldWrapper.locator('img');
      if (await img.isVisible()) {
        return await img.getAttribute('src');
      }
    }

    // Try standard text inputs and textareas
    const input = fieldWrapper.locator('input[type="text"], input[type="url"], textarea');
    if (await input.isVisible()) {
      return await input.inputValue();
    }

    // Try contenteditable (for slate widget)
    const contentEditable = fieldWrapper.locator('[contenteditable="true"]');
    if (await contentEditable.isVisible()) {
      return await contentEditable.textContent();
    }

    return null;
  }

  /**
   * Check if a specific field exists in the sidebar form.
   * Matches Cypress pattern: #sidebar-properties .field-wrapper-{fieldname}
   */
  async hasSidebarField(fieldName: string): Promise<boolean> {
    const fieldWrapper = this.page.locator(
      `#sidebar-properties .field-wrapper-${fieldName}`,
    );
    return await fieldWrapper.isVisible();
  }

  /**
   * Get the sidebar slate editor locator for a specific field.
   * Returns the contenteditable element for the field's slate widget.
   */
  getSidebarSlateEditor(fieldName: string): Locator {
    return this.page.locator(
      `#sidebar-properties .field-wrapper-${fieldName} [contenteditable="true"]`,
    );
  }

  /**
   * Get all fieldset titles in the sidebar (including accordions).
   * Searches for clickable elements that look like accordion headers.
   */
  async getSidebarFieldsets(): Promise<string[]> {
    const sidebar = this.page.locator('#sidebar-properties');
    // Look for accordion titles in Semantic UI or custom accordion structures
    // Try multiple patterns: .accordion .title, .title, or any clickable div with text
    const accordionSelectors = [
      '.accordion .title',
      '.ui.accordion .title',
      'div[class*="accordion"] > div:first-child',
      '#sidebar-properties > div > div > div:first-child:has(img)'  // Pattern: clickable div with image (expand/collapse icon)
    ];

    const fieldsets: string[] = [];

    for (const selector of accordionSelectors) {
      const accordionTitles = sidebar.locator(selector);
      const count = await accordionTitles.count();

      for (let i = 0; i < count; i++) {
        const text = await accordionTitles.nth(i).textContent();
        if (text && text.trim() && !fieldsets.includes(text.trim())) {
          fieldsets.push(text.trim());
        }
      }

      if (fieldsets.length > 0) {
        break;  // Found accordions with first selector, no need to try others
      }
    }

    return fieldsets;
  }

  /**
   * Check if a fieldset accordion is open.
   * An accordion is considered open if its content area is visible.
   */
  async isFieldsetAccordionOpen(fieldsetTitle: string): Promise<boolean> {
    const sidebar = this.page.locator('#sidebar-properties');

    // Find the accordion title by text content
    const accordionContainer = sidebar.locator(`div:has-text("${fieldsetTitle}")`).first();

    // Check if next sibling (content area) is visible
    // If the accordion uses 'active' class or similar
    const parent = accordionContainer.locator('xpath=..');
    const classAttr = await parent.getAttribute('class');

    if (classAttr && classAttr.includes('active')) {
      return true;
    }

    // Alternative: check if content after title is visible
    // This is a fallback for accordions without explicit active class
    return true; // Assume open by default if we can't determine
  }

  /**
   * Open a fieldset accordion in the sidebar by clicking its title.
   * Ensures the accordion is open (idempotent - won't close if already open).
   */
  async openFieldsetAccordion(fieldsetTitle: string): Promise<void> {
    const sidebar = this.page.locator('#sidebar-properties');

    // Find clickable element containing the fieldset title text
    // Look for the title element that might have an image/icon next to it
    const accordionTitle = sidebar.locator(`div:has-text("${fieldsetTitle}")`).first();

    // Check if accordion content is already visible by looking for active class
    const isActive = await accordionTitle.evaluate((el) => {
      // Check if this accordion title's parent or the title itself has 'active' class
      return el.classList.contains('active') || el.parentElement?.classList.contains('active');
    });

    // Only click if not already active/open
    if (!isActive) {
      await accordionTitle.click();
      // Wait for animation/expansion
      await this.page.waitForTimeout(300);
    }
  }

  /**
   * Close a fieldset accordion in the sidebar by clicking its title.
   * Ensures the accordion is closed (idempotent - won't open if already closed).
   */
  async closeFieldsetAccordion(fieldsetTitle: string): Promise<void> {
    const sidebar = this.page.locator('#sidebar-properties');

    // Find clickable element containing the fieldset title text
    const accordionTitle = sidebar.locator(`div:has-text("${fieldsetTitle}")`).first();

    // Check if accordion content is currently visible
    const isActive = await accordionTitle.evaluate((el) => {
      // Check if this accordion title's parent or the title itself has 'active' class
      return el.classList.contains('active') || el.parentElement?.classList.contains('active');
    });

    // Only click if currently active/open
    if (isActive) {
      await accordionTitle.click();
      // Wait for animation/collapse
      await this.page.waitForTimeout(300);
    }
  }

  /**
   * Set the value of a text field in the sidebar.
   * Matches Cypress pattern: #sidebar-properties #field-{fieldname}
   */
  async setSidebarFieldValue(fieldName: string, value: string): Promise<void> {
    const fieldWrapper = this.page.locator(`#sidebar-properties .field-wrapper-${fieldName}`);

    // Try text input
    const input = fieldWrapper.locator('input[type="text"], input[type="url"], textarea');
    if (await input.isVisible()) {
      await input.fill(value);
      await input.blur(); // Trigger blur to commit the value
      return;
    }

    // Try contenteditable (Slate editors)
    // Note: fill() doesn't reliably clear Slate editors, use select-all + type
    const contentEditable = fieldWrapper.locator('[contenteditable="true"]');
    if (await contentEditable.isVisible()) {
      // Get current text to verify selection
      const currentText = await contentEditable.textContent() || '';

      await contentEditable.click();
      await contentEditable.press('ControlOrMeta+a'); // Select all existing content

      // Verify selection covers all text before typing
      if (currentText.trim()) {
        await expect(async () => {
          const selectedText = await contentEditable.evaluate(() =>
            window.getSelection()?.toString() || ''
          );
          expect(selectedText.trim()).toBe(currentText.trim());
        }).toPass({ timeout: 2000 });
      }

      // Small wait to ensure selection is stable before typing
      await this.page.waitForTimeout(50);

      await contentEditable.pressSequentially(value, { delay: 10 }); // Type replaces selection
      await contentEditable.blur(); // Trigger blur to commit the value
      return;
    }
  }

  /**
   * Click the Add Block button that appears below a selected block.
   * This should open the block chooser.
   */
  async clickAddBlockButton(): Promise<void> {

    // The add button has class volto-hydra-add-button and is appended to the selected block element
    const addButton = this.page.locator('.volto-hydra-add-button');

    await addButton.click({ timeout: 10000 });
    await this.page.waitForTimeout(500); // Wait for chooser to appear
  }

  /**
   * Check if the block chooser modal is visible in the Admin UI.
   */
  async isBlockChooserVisible(): Promise<boolean> {
    // Block chooser appears in the Admin UI (not iframe)
    const chooser = this.page.locator('[role="dialog"]').or(
      this.page.locator('.blocks-chooser')
    ).or(
      this.page.locator('text=Add block')
    );

    try {
      await chooser.waitFor({ state: 'visible', timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if a block type is visible in the block chooser.
   * Block types: 'slate', 'image', 'video', 'listing', etc.
   * Note: Only searches within the block chooser popup, not the entire page.
   */
  async isBlockTypeVisible(blockType: string): Promise<boolean> {
    // Different block types have different display names
    const blockNames: Record<string, string[]> = {
      slate: ['Text', 'Slate', 'text'],
      image: ['Image', 'image'],
      video: ['Video', 'video'],
      listing: ['Listing', 'listing'],
      columns: ['Columns', 'columns'],
      hero: ['Hero', 'hero'],
    };

    const possibleNames = blockNames[blockType.toLowerCase()] || [blockType];

    // Scope search to block chooser only (not sidebar or other parts of page)
    const blockChooser = this.page.locator('.blocks-chooser');

    // Try to find the block type button within the block chooser
    for (const name of possibleNames) {
      const blockButton = blockChooser.locator(`button:has-text("${name}")`).first();

      if (await blockButton.isVisible({ timeout: 1000 }).catch(() => false)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Select a block type from the block chooser.
   * Block types: 'slate', 'image', 'video', 'listing', etc.
   */
  async selectBlockType(blockType: string): Promise<void> {
    // Wait for block chooser to be visible
    await this.page.waitForTimeout(500);

    // Different block types have different display names
    const blockNames: Record<string, string[]> = {
      slate: ['Text', 'Slate', 'text'],
      image: ['Image', 'image'],
      video: ['Video', 'video'],
      listing: ['Listing', 'listing'],
    };

    const possibleNames = blockNames[blockType.toLowerCase()] || [blockType];

    // Block chooser is rendered as a portal directly on document.body
    // with class "blocks-chooser". Look specifically within this container
    // to avoid matching sidebar buttons with similar text.
    const blockChooser = this.page.locator('.blocks-chooser');

    // Try to find and click the block type button within the block chooser
    for (const name of possibleNames) {
      // Look for button within block chooser, excluding sidebar items (which have ⋮⋮ prefix)
      const blockButton = blockChooser.locator(`button:has-text("${name}")`).first();

      if (await blockButton.isVisible({ timeout: 1000 }).catch(() => false)) {
        await blockButton.click();
        await this.page.waitForTimeout(500); // Wait for block to be added
        return;
      }
    }

    throw new Error(`Block type "${blockType}" not found in chooser`);
  }

  /**
   * Get the current number of blocks in the iframe.
   */
  async getBlockCount(): Promise<number> {
    return this.getBlockCountInIframe();
  }

  /**
   * Get all block IDs in order.
   * Returns an array of block UIDs.
   */
  async getBlockOrder(): Promise<string[]> {
    const iframe = this.getIframe();
    const blocks = await iframe.locator('[data-block-uid]').all();

    const blockIds: string[] = [];
    for (const block of blocks) {
      const uid = await block.getAttribute('data-block-uid');
      if (uid) {
        blockIds.push(uid);
      }
    }

    return blockIds;
  }

  /**
   * Wait for a block with the given ID to appear in the iframe.
   */
  async waitForBlockToAppear(blockId: string, timeout: number = 10000): Promise<void> {
    const iframe = this.getIframe();
    const block = iframe.locator(`[data-block-uid="${blockId}"]`);
    await block.waitFor({ state: 'visible', timeout });
  }

  /**
   * Wait for a block with the given ID to disappear from the iframe.
   */
  async waitForBlockToDisappear(blockId: string, timeout: number = 10000): Promise<void> {
    const iframe = this.getIframe();
    const block = iframe.locator(`[data-block-uid="${blockId}"]`);
    // Use expect().not.toBeVisible() which auto-retries until element is gone
    await expect(block).not.toBeVisible({ timeout });
  }

  /**
   * Check if a block exists in the iframe.
   */
  async blockExists(blockId: string): Promise<boolean> {
    const iframe = this.getIframe();
    const block = iframe.locator(`[data-block-uid="${blockId}"]`);
    return await block.count() > 0;
  }

  /**
   * Get the drag handle from the toolbar.
   * The drag handle is in the parent window toolbar (not the iframe).
   * Also verifies that the invisible iframe drag button is properly positioned underneath.
   */
  /**
   * Get the bounding box of the iframe drag button in parent window coordinates.
   */
  async getIframeDragButtonBoundingBox(): Promise<{ x: number; y: number; width: number; height: number } | null> {
    const iframe = this.getIframe();
    const dragButton = iframe.locator('.volto-hydra-drag-button');
    const buttonBox = await dragButton.boundingBox();

    if (!buttonBox) return null;

    // Convert from iframe page coordinates to parent window coordinates
    return await this.getBoundsInParentCoordinates(buttonBox);
  }

  async getDragHandle(): Promise<Locator> {
    const toolbar = this.page.locator('.quanta-toolbar');
    const dragHandle = toolbar.locator('.drag-handle');
    await expect(dragHandle).toBeVisible({ timeout: 2000 });

    // Get the invisible drag button in iframe (this is what actually receives drag events)
    const iframe = this.getIframe();
    const iframeDragButton = iframe.locator('.volto-hydra-drag-button');

    // Verify iframe drag button is aligned with the toolbar (which is aligned with the block)
    const iframeDragButtonBox = await this.getIframeDragButtonBoundingBox();
    const toolbarBox = await toolbar.boundingBox();

    if (iframeDragButtonBox && toolbarBox) {
      // Both toolbar and iframe drag button should be left-aligned with the block
      const xDiff = Math.abs(iframeDragButtonBox.x - toolbarBox.x);

      if (xDiff > 5) {
        throw new Error(
          `Iframe drag button not aligned with toolbar (both should be left-aligned with block). ` +
          `Toolbar at x=${toolbarBox.x}, iframe button at x=${iframeDragButtonBox.x}. ` +
          `Difference: ${xDiff}px`
        );
      }

      // Verify pointer-events allows mouse events
      const pointerEvents = await iframeDragButton.evaluate((el) =>
        window.getComputedStyle(el).pointerEvents
      );
      if (pointerEvents !== 'auto') {
        throw new Error(
          `Iframe drag button should have pointer-events: auto, got: ${pointerEvents}`
        );
      }
    }

    // we will mouse down in this but it will actually fall through to the iframe button
    return dragHandle;
  }

  /**
   * Start a drag operation using realistic mouse events at coordinates.
   * Clicks at the visual toolbar icon position.
   * Returns the starting coordinates.
   */
  async startDrag(dragHandle: Locator): Promise<{ startX: number; startY: number }> {
    const toolbar = this.page.locator('.quanta-toolbar');
    const toolbarDragIcon = toolbar.locator('.drag-handle');
    const toolbarIconRect = await toolbarDragIcon.boundingBox();

    if (!toolbarIconRect) {
      throw new Error('Could not get toolbar drag icon bounding box');
    }

    const startX = toolbarIconRect.x + toolbarIconRect.width / 2;
    const startY = toolbarIconRect.y + toolbarIconRect.height / 2;

    // Use realistic mouse events at coordinates (not element-specific dispatch)
    await this.page.mouse.move(startX, startY);
    await this.page.mouse.down();
    await this.page.waitForTimeout(50);

    return { startX, startY };
  }

  /**
   * Move mouse during drag operation to a target block using realistic coordinates.
   * @param targetBlock - The block to move over
   * @param insertAfter - If true, position for insert after (75% down). If false, insert before (25% down).
   */
  async moveDragToBlock(targetBlock: Locator, insertAfter: boolean = true): Promise<void> {
    const targetRect = await targetBlock.boundingBox();
    if (!targetRect) {
      throw new Error('Could not get target block bounding box');
    }

    const clientY = insertAfter
      ? targetRect.y + targetRect.height * 0.75
      : targetRect.y + targetRect.height * 0.25;
    const clientX = targetRect.x + targetRect.width / 2;

    // Use realistic mouse movement
    await this.page.mouse.move(clientX, clientY);
    await this.page.waitForTimeout(100);
  }

  /**
   * Complete a drag operation by releasing the mouse using realistic events.
   */
  async completeDrag(dragHandle: Locator): Promise<void> {
    await this.page.mouse.up();
    await this.page.waitForTimeout(500);
  }

  /**
   * Check if the drop indicator is visible in the iframe.
   */
  async isDropIndicatorVisible(): Promise<boolean> {
    const iframe = this.getIframe();
    const dropIndicator = iframe.locator('.volto-hydra-drop-indicator');
    return await dropIndicator.isVisible();
  }

  /**
   * Check if the drag shadow (visual clone of dragged block) is visible in the iframe.
   * The drag shadow has class .dragging and is created when drag starts.
   */
  async isDragShadowVisible(): Promise<boolean> {
    const iframe = this.getIframe();
    const dragShadow = iframe.locator('.dragging');
    return await dragShadow.isVisible();
  }

  /**
   * Wait for and assert that the drag shadow is visible during drag.
   */
  async verifyDragShadowVisible(): Promise<void> {
    const iframe = this.getIframe();
    const dragShadow = iframe.locator('.dragging');
    await dragShadow.waitFor({ state: 'visible', timeout: 5000 });
  }

  /**
   * Assert that the drop indicator is visible during drag.
   */
  async verifyDropIndicatorVisible(): Promise<void> {
    const isVisible = await this.isDropIndicatorVisible();
    if (!isVisible) {
      throw new Error('Drop indicator not visible during drag - drag may have failed');
    }
  }

  /**
   * Verify drop indicator is positioned near the target block.
   * This is a resilient check - it verifies the indicator is in the general
   * area of the target rather than checking exact pixel positions.
   *
   * @param targetBlock - The block we're dragging to
   * @param insertAfter - Whether we're inserting after (true) or before (false) the target
   */
  async verifyDropIndicatorNearTarget(
    targetBlock: Locator,
    insertAfter: boolean,
    cursorPageCoords?: { x: number; y: number },
  ): Promise<void> {
    const iframe = this.getIframe();
    const dropIndicator = iframe.locator('.volto-hydra-drop-indicator');

    // Get iframe offset for coordinate translation
    const iframeEl = this.page.locator('#previewIframe');
    const iframeBox = await iframeEl.boundingBox();

    // Use iframe's internal getBoundingClientRect for consistent coordinates
    // (Playwright's boundingBox doesn't account for iframe scroll correctly)
    const dropRectInIframeCoords = await dropIndicator.evaluate((el) => {
      const r = el.getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height, display: getComputedStyle(el).display };
    });
    const targetRectInIframeCoords = await targetBlock.evaluate((el) => {
      const r = el.getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height };
    });

    const targetTop = targetRectInIframeCoords.y;
    const targetBottom = targetRectInIframeCoords.y + targetRectInIframeCoords.height;
    const dropY = dropRectInIframeCoords.y;

    // Calculate cursor position in iframe coords (if provided)
    let cursorIframeCoords: { x: number; y: number } | null = null;
    if (cursorPageCoords && iframeBox) {
      cursorIframeCoords = {
        x: cursorPageCoords.x - iframeBox.x,
        y: cursorPageCoords.y - iframeBox.y,
      };
    }

    // Drop indicator should be at the correct edge of the target block
    // For insertAfter: indicator at BOTTOM edge (within tolerance below block)
    // For insertBefore: indicator at TOP edge (within tolerance above block)
    const tolerance = 30; // Should be close to the edge
    const expectedEdge = insertAfter ? targetBottom : targetTop;
    let isNearTarget: boolean;

    if (insertAfter) {
      // Indicator should be near bottom edge of target
      isNearTarget = dropY >= targetBottom - tolerance && dropY <= targetBottom + tolerance;
    } else {
      // Indicator should be near top edge of target
      isNearTarget = dropY >= targetTop - tolerance && dropY <= targetTop + tolerance;
    }

    if (!isNearTarget) {
      throw new Error(
        `Drop indicator not near target block.\n` +
          `  Cursor (iframe): ${cursorIframeCoords ? `(${cursorIframeCoords.x.toFixed(0)}, ${cursorIframeCoords.y.toFixed(0)})` : 'unknown'}\n` +
          `  Drop indicator y: ${dropY.toFixed(0)}\n` +
          `  Target: top=${targetTop.toFixed(0)}, bottom=${targetBottom.toFixed(0)}\n` +
          `  Expected: ${insertAfter ? 'bottom' : 'top'} edge @ ${expectedEdge.toFixed(0)} ±${tolerance}\n` +
          `  Allowed range: ${expectedEdge - tolerance} to ${expectedEdge + tolerance}`,
      );
    }
  }

  /**
   * Get the center position of the toolbar drag icon in PAGE coordinates.
   * Fails if toolbar is not visible.
   */
  private async getToolbarDragIconCenterInPageCoords(): Promise<{ x: number; y: number }> {
    const toolbar = this.page.locator('.quanta-toolbar');
    const toolbarDragIcon = toolbar.locator('.drag-handle');

    const rect = await toolbarDragIcon.boundingBox();
    if (!rect) {
      throw new Error('Toolbar drag icon not visible');
    }

    return {
      x: rect.x + rect.width / 2,
      y: rect.y + rect.height / 2,
    };
  }

  /**
   * Get the drop position in IFRAME coordinates using frame.evaluate.
   * This gets the actual viewport coordinates that hydra.js will receive.
   */
  private async getDropPositionInIframeCoords(
    blockUid: string,
    insertAfter: boolean
  ): Promise<{ x: number; y: number }> {
    const iframe = this.getIframe();
    const block = iframe.locator(`[data-block-uid="${blockUid}"]`);

    // Evaluate inside the iframe to get viewport-relative coords
    const rect = await block.evaluate((el) => {
      const r = el.getBoundingClientRect();
      return {
        x: r.x, y: r.y, width: r.width, height: r.height,
        tagName: el.tagName,
        className: el.className,
      };
    });

    return {
      x: rect.x + rect.width / 2,
      y: insertAfter
        ? rect.y + rect.height * 0.75
        : rect.y + rect.height * 0.25,
    };
  }

  /**
   * Convert iframe coordinates to page coordinates.
   */
  private async iframeCoordsToPageCoords(
    iframeCoords: { x: number; y: number }
  ): Promise<{ x: number; y: number }> {
    const iframeEl = this.page.locator('#previewIframe');
    const iframeBoxInPageCoords = await iframeEl.boundingBox();
    if (!iframeBoxInPageCoords) {
      throw new Error('Could not get iframe bounding box');
    }

    return {
      x: iframeCoords.x + iframeBoxInPageCoords.x,
      y: iframeCoords.y + iframeBoxInPageCoords.y,
    };
  }

  /**
   * Get the target drop position for a block in PAGE coordinates.
   * Returns Y at 25% for insertBefore, 75% for insertAfter.
   *
   * Note: We use evaluate() with getBoundingClientRect() to get coords relative
   * to the iframe's VIEWPORT (not scrollable content), then add the iframe's
   * position in the page. This ensures correct coords even after auto-scroll.
   */
  private async getDropPositionInPageCoords(
    targetBlock: Locator,
    insertAfter: boolean
  ): Promise<{ x: number; y: number }> {
    // Use evaluate to get getBoundingClientRect - this gives coords relative
    // to the iframe's VIEWPORT, which is what we need for mouse positioning
    const rect = await targetBlock.evaluate((el) => {
      const r = el.getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height };
    });

    // Get iframe position in page coordinates
    const iframeEl = this.page.locator('#previewIframe');
    const iframeRect = await iframeEl.boundingBox();
    if (!iframeRect) {
      throw new Error('Could not get iframe bounding box');
    }

    const result = {
      x: iframeRect.x + rect.x + rect.width / 2,
      y: insertAfter
        ? iframeRect.y + rect.y + rect.height * 0.75
        : iframeRect.y + rect.y + rect.height * 0.25,
    };

    return result;
  }

  // ============================================================================
  // DRAG AND DROP HELPER - STEP 1: START DRAG
  // ============================================================================

  /**
   * Start a drag operation from the toolbar drag handle.
   * Returns the starting position for reference.
   */
  private async startDragFromToolbar(): Promise<{ x: number; y: number }> {
    const startPosPage = await this.getToolbarDragIconCenterInPageCoords();

    if (!this.isInPageViewport(startPosPage.y)) {
      throw new Error(
        `Toolbar drag icon is off-screen at Y=${startPosPage.y}. ` +
        `The block must be scrolled into view before dragging. ` +
        `Ensure clickBlockInIframe() scrolls the selected block into view.`
      );
    }

    await this.page.mouse.move(startPosPage.x, startPosPage.y);
    await this.page.mouse.down();
    await this.verifyDragShadowVisible();

    return startPosPage;
  }

  // ============================================================================
  // DRAG AND DROP HELPER - STEP 2: AUTO-SCROLL TO TARGET
  // ============================================================================

  /**
   * Auto-scroll the iframe until the target block is visible in the viewport.
   * Returns when the target is in the viewport and ready for drop.
   */
  private async autoScrollToTarget(
    targetBlock: Locator,
    insertAfter: boolean,
    maxAttempts: number = 40
  ): Promise<{ x: number; y: number }> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await this.verifyDragShadowVisible();

      const dropPosPage = await this.getDropPositionInPageCoords(targetBlock, insertAfter);

      const viewportSize = this.page.viewportSize();
      const isAboveViewport = dropPosPage.y < 0;
      const isBelowViewport = viewportSize && dropPosPage.y > viewportSize.height;
      const needsAutoScroll = isAboveViewport || isBelowViewport;

      if (!needsAutoScroll) {
        return dropPosPage;
      }

      // Target is off-screen - move to edge to trigger auto-scroll
      const scrollUp = isAboveViewport;
      await this.moveToScrollEdge(scrollUp);

      // Wait for auto-scroll to happen (target position must change)
      await this.waitForAutoScrollProgress(targetBlock, insertAfter, dropPosPage.y);
    }

    // If we get here, we've exceeded max attempts
    throw new Error(`Auto-scroll failed after ${maxAttempts} attempts`);
  }

  /**
   * Wait for auto-scroll to make progress (target position changes).
   */
  private async waitForAutoScrollProgress(
    targetBlock: Locator,
    insertAfter: boolean,
    prevY: number
  ): Promise<void> {
    await expect(async () => {
      await this.verifyDragShadowVisible();
      // Don't check drop indicator during scroll - it may legitimately hide when
      // mouse is between valid drop zones. We'll verify it before drop instead.
      const newPos = await this.getDropPositionInPageCoords(targetBlock, insertAfter);
      const scrollAmount = Math.abs(newPos.y - prevY);
      if (scrollAmount < 5) {
        throw new Error(`Waiting for auto-scroll: target moved only ${scrollAmount.toFixed(1)}px`);
      }
    }).toPass({ timeout: 2000 });
  }

  // ============================================================================
  // DRAG AND DROP HELPER - STEP 3: MOVE TO DROP POSITION
  // ============================================================================

  /**
   * Move the mouse to the drop position and verify the drop indicator is correct.
   *
   * NOTE: We continuously update the mouse position until the drop indicator is correct.
   * This handles the case where auto-scroll continues after we start moving to the target.
   */
  private async moveToDropPosition(
    targetBlock: Locator,
    insertAfter: boolean,
    _initialDropPos: { x: number; y: number }
  ): Promise<void> {
    // Keep moving to the target and checking until indicator is correct
    await expect(async () => {
      // Get current position and move to it
      const dropPosPage = await this.getDropPositionInPageCoords(targetBlock, insertAfter);
      await this.page.mouse.move(dropPosPage.x, dropPosPage.y, { steps: 5 });

      // Wait a moment for the drop indicator to update
      await this.page.waitForTimeout(50);

      // Verify the indicator is in the right position
      await this.verifyDropIndicatorNearTarget(targetBlock, insertAfter, dropPosPage);
    }).toPass({ timeout: 5000 });
  }

  // ============================================================================
  // DRAG AND DROP HELPER - STEP 4: DROP AND CLEANUP
  // ============================================================================

  /**
   * Complete the drag operation by releasing the mouse and waiting for cleanup.
   */
  private async completeDrop(): Promise<void> {
    await this.page.mouse.up();

    const iframe = this.getIframe();
    await expect(iframe.locator('.volto-hydra-drop-indicator')).not.toBeVisible({ timeout: 5000 });
    await expect(iframe.locator('.dragging')).not.toBeVisible({ timeout: 5000 });
  }

  /**
   * Check if a Y position (in PAGE coordinates) is within the viewport.
   */
  private isInPageViewport(y: number): boolean {
    const viewportSize = this.page.viewportSize();
    if (!viewportSize) return false;
    return y >= 0 && y <= viewportSize.height;
  }

  /**
   * Move mouse towards iframe edge to trigger auto-scroll.
   */
  private async moveToScrollEdge(scrollUp: boolean): Promise<void> {
    const iframeElement = this.page.locator('#previewIframe');
    const iframeRect = await iframeElement.boundingBox();
    if (!iframeRect) throw new Error('Could not get iframe bounds');

    const edgeThreshold = 30;
    const edgeX = iframeRect.x + iframeRect.width / 2;
    const edgeY = scrollUp
      ? iframeRect.y + edgeThreshold
      : iframeRect.y + iframeRect.height - edgeThreshold;

    // Multiple small moves to trigger scroll
    for (let i = 0; i < 5; i++) {
      await this.page.mouse.move(edgeX, edgeY + (i % 2), { steps: 2 });
      await this.page.waitForTimeout(50);
    }
  }

  /**
   * Drag a block to a new position.
   *
   * NOTE: This helper tests hydra.js auto-scroll functionality. When dragging
   * to blocks that are off-screen, we move the mouse to the viewport edge
   * to trigger hydra's auto-scroll, which scrolls the iframe content until
   * the target becomes visible.
   *
   * @param _dragHandle - Unused, kept for API compatibility
   * @param targetBlock - The block to drop near
   * @param insertAfter - If true, insert after target. If false, insert before.
   */
  async dragBlockWithMouse(
    _dragHandle: Locator,
    targetBlock: Locator,
    insertAfter: boolean = true
  ): Promise<void> {
    // Step 1: Start drag from toolbar
    await this.startDragFromToolbar();

    // Step 2: Auto-scroll until target is in viewport
    const dropPosPage = await this.autoScrollToTarget(targetBlock, insertAfter);

    // Step 3: Move to drop position and verify indicator
    await this.moveToDropPosition(targetBlock, insertAfter, dropPosPage);

    // Step 4: Complete the drop
    await this.completeDrop();
  }

  /**
   * Drag a block horizontally to a target position (for blocks with data-block-add="right").
   * Uses X-axis position to determine left/right insertion.
   *
   * @param _dragHandle - Unused, kept for API compatibility
   * @param targetBlock - The target block locator (where to drop)
   * @param insertAfter - If true, insert to the right; if false, insert to the left
   * @param expectIndicator - Whether to expect drop indicator (true) or rejection (false)
   */
  async dragBlockWithMouseHorizontal(
    _dragHandle: Locator,
    targetBlock: Locator,
    insertAfter: boolean = true,
    expectIndicator: boolean = true
  ): Promise<boolean> {
    // Step 1: Start drag from toolbar
    await this.startDragFromToolbar();

    // Step 2: Calculate horizontal drop position
    const dropPosPage = await this.getHorizontalDropPosition(targetBlock, insertAfter);

    // Step 3: Move to drop position
    await this.page.mouse.move(dropPosPage.x, dropPosPage.y, { steps: 10 });

    // Step 4: Check drop indicator visibility
    const indicatorVisible = await this.checkDropIndicator(expectIndicator);

    // Step 5: Complete the drop
    await this.completeDrop();

    return indicatorVisible;
  }

  /**
   * Get the horizontal drop position for a target block.
   * Returns X at 25% for insertBefore (left), 75% for insertAfter (right).
   */
  private async getHorizontalDropPosition(
    targetBlock: Locator,
    insertAfter: boolean
  ): Promise<{ x: number; y: number }> {
    const targetRect = await targetBlock.boundingBox();
    if (!targetRect) {
      throw new Error('Could not get target block bounding box');
    }

    const dropX = insertAfter
      ? targetRect.x + targetRect.width * 0.75 // Right side
      : targetRect.x + targetRect.width * 0.25; // Left side
    const dropY = targetRect.y + targetRect.height / 2; // Center vertically

    return { x: dropX, y: dropY };
  }

  /**
   * Check if the drop indicator is visible as expected.
   */
  private async checkDropIndicator(expectIndicator: boolean): Promise<boolean> {
    const iframe = this.getIframe();
    const dropIndicator = iframe.locator('.volto-hydra-drop-indicator');

    if (expectIndicator) {
      await expect(dropIndicator).toBeVisible({ timeout: 2000 });
      return true;
    } else {
      await expect(dropIndicator).not.toBeVisible();
      return false;
    }
  }

  /**
   * Wait for the block count to reach a specific value.
   * This is a condition-based wait that replaces arbitrary timeouts.
   *
   * @param expectedCount - The expected number of blocks
   * @param timeout - Maximum time to wait in milliseconds (default 10000)
   * @throws Error if the expected count is not reached within the timeout
   */
  async waitForBlockCountToBe(expectedCount: number, timeout: number = 10000): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const currentCount = await this.getBlockCount();

      if (currentCount === expectedCount) {
        return; // Success!
      }

      // Wait a bit before checking again
      await this.page.waitForTimeout(100);
    }

    // Timeout reached - get final count for error message
    const finalCount = await this.getBlockCount();
    throw new Error(
      `Block count did not reach expected value within ${timeout}ms. ` +
      `Expected: ${expectedCount}, Actual: ${finalCount}. ` +
      `This likely means the block add/remove operation did not complete. ` +
      `Check that postMessage communication is working and the Admin UI is processing block changes.`
    );
  }

  /**
   * Wait for a sidebar field value to change to a specific value.
   * This is a condition-based wait that replaces arbitrary timeouts.
   *
   * @param fieldName - The field name to check
   * @param expectedValue - The expected value
   * @param timeout - Maximum time to wait in milliseconds (default 5000)
   * @throws Error if the expected value is not reached within the timeout
   */
  async waitForFieldValueToBe(
    fieldName: string,
    expectedValue: string,
    timeout: number = 5000
  ): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const currentValue = await this.getSidebarFieldValue(fieldName);

      if (currentValue === expectedValue) {
        return; // Success!
      }

      // Wait a bit before checking again
      await this.page.waitForTimeout(100);
    }

    // Timeout reached - get final value for error message
    const finalValue = await this.getSidebarFieldValue(fieldName);
    throw new Error(
      `Field "${fieldName}" did not reach expected value within ${timeout}ms. ` +
      `Expected: "${expectedValue}", Actual: "${finalValue}". ` +
      `This likely means the field update did not propagate or the form did not update.`
    );
  }

  /**
   * Logout from the Admin UI.
   * Clicks the PersonalTools button in the toolbar, then clicks Logout.
   *
   * @throws Error if logout UI elements cannot be found
   */
  async logout(): Promise<void> {
    // Look for PersonalTools button in the left toolbar
    // The button has class="user" and id="toolbar-personal"
    const userMenu = this.page
      .locator('#toolbar-personal')
      .or(this.page.locator('#toolbar button.user'))
      .or(this.page.locator('[aria-label="Personal tools"]'))
      .first();

    const menuCount = await userMenu.count();
    if (menuCount === 0) {
      throw new Error(
        'PersonalTools button not found. Check that user is logged in and on view page (not edit).',
      );
    }

    // Verify button is visible before clicking
    try {
      await userMenu.waitFor({ state: 'visible', timeout: 5000 });
    } catch {
      throw new Error(
        'PersonalTools button exists but is not visible. Check that the toolbar is fully loaded.',
      );
    }

    await userMenu.click();

    // Wait for dropdown to appear - the logout is a Link with id="toolbar-logout"
    // It contains an SVG with class="logout"
    const logoutButton = this.page
      .locator('#toolbar-logout')
      .or(this.page.locator('a .icon.logout').first())
      .or(this.page.locator('[aria-label="Logout"]'))
      .or(this.page.locator('text=Logout'));

    try {
      await logoutButton.first().waitFor({ state: 'visible', timeout: 2000 });
    } catch (e) {
      throw new Error(
        'Logout button did not appear after clicking user menu. ' +
        'Check that the menu dropdown is working correctly.'
      );
    }

    await logoutButton.first().click();

    // Wait for redirect to login page
    try {
      await this.page.waitForURL(/.*login.*/, { timeout: 5000 });
    } catch (e) {
      // Check if we're on login page by looking for login form
      const loginForm = this.page.locator('input[type="password"]');
      const isOnLoginPage = await loginForm.isVisible();

      if (!isOnLoginPage) {
        throw new Error(
          'Logout did not redirect to login page. Check that logout is working correctly.'
        );
      }
    }
  }

  /**
   * Assert text selection in the iframe.
   * Returns selection information for further assertions.
   *
   * @param locator - The element locator (usually contenteditable element)
   * @param expectedText - Optional expected selected text
   * @param options - Optional assertion options
   * @returns Selection information object
   */
  async assertTextSelection(
    locator: Locator,
    expectedText?: string,
    options?: {
      shouldExist?: boolean;
      shouldBeCollapsed?: boolean;
      message?: string;
    }
  ): Promise<{
    hasSelection: boolean;
    isCollapsed: boolean;
    selectedText: string;
    rangeCount: number;
  }> {
    const {
      shouldExist = true,
      shouldBeCollapsed = false,
      message = 'Selection assertion'
    } = options || {};

    const selectionInfo = await locator.evaluate(() => {
      const sel = window.getSelection();
      return {
        hasSelection: sel !== null && sel.rangeCount > 0,
        isCollapsed: sel?.isCollapsed || false,
        selectedText: sel?.toString() || '',
        rangeCount: sel?.rangeCount || 0,
      };
    });

    if (shouldExist) {
      if (!selectionInfo.hasSelection) {
        throw new Error(`${message}: Expected selection to exist, but no selection found`);
      }
    } else {
      if (selectionInfo.hasSelection) {
        throw new Error(`${message}: Expected no selection, but found: "${selectionInfo.selectedText}"`);
      }
    }

    if (shouldExist && shouldBeCollapsed !== selectionInfo.isCollapsed) {
      throw new Error(
        `${message}: Expected selection to be ${shouldBeCollapsed ? 'collapsed' : 'not collapsed'}, ` +
        `but it was ${selectionInfo.isCollapsed ? 'collapsed' : 'not collapsed'}`
      );
    }

    if (expectedText !== undefined && selectionInfo.selectedText !== expectedText) {
      throw new Error(
        `${message}: Expected selected text "${expectedText}", ` +
        `but got "${selectionInfo.selectedText}"`
      );
    }

    return selectionInfo;
  }

  /**
   * Wait for the LinkEditor popup to appear and verify its position.
   * The LinkEditor should appear near the selected text in the iframe.
   *
   * IMPORTANT: The LinkEditor popup is ALWAYS rendered in the DOM when Redux
   * show_sidebar_editor is true. It hides itself by positioning off-screen
   * (at -10000, -10000) rather than using display:none or opacity:0.
   * This is controlled by PositionedToolbar which positions based on the
   * selection rect from useSelectionPosition. When no valid selection exists,
   * the popup is positioned off-screen.
   *
   * @param timeout Maximum time to wait for popup in milliseconds
   * @returns The popup element and its bounding box
   */
  async waitForLinkEditorPopup(timeout: number = 5000): Promise<{
    popup: Locator;
    boundingBox: { x: number; y: number; width: number; height: number };
  }> {
    // LinkEditor renders in a PositionedToolbar with className "add-link"
    // There may be multiple elements (one per Slate editor context) - find the one that's on-screen
    const popups = this.page.locator('.add-link, .slate-inline-toolbar, [data-slate-toolbar="link"]');

    // Wait for at least one to exist in DOM
    await popups.first().waitFor({ state: 'visible', timeout });

    // Poll for a popup that's actually on-screen (not at -10000,-10000)
    // The popup may exist but be positioned off-screen until selection position is calculated
    let popup: Locator | null = null;
    let boundingBox: { x: number; y: number; width: number; height: number } | null = null;
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const count = await popups.count();

      for (let i = 0; i < count; i++) {
        const candidate = popups.nth(i);
        const box = await candidate.boundingBox();
        if (box && box.x > -100 && box.y > -100) {
          popup = candidate;
          boundingBox = box;
          break;
        }
      }

      if (popup && boundingBox) {
        break;
      }

      // Wait a bit before retrying
      await this.page.waitForTimeout(100);
    }

    if (!popup || !boundingBox) {
      const count = await popups.count();
      throw new Error(`LinkEditor popup not found on-screen. Found ${count} candidates but none at valid position.`);
    }

    // Verify popup has dimensions (width and height > 0)
    if (boundingBox.width === 0 || boundingBox.height === 0) {
      throw new Error(
        `LinkEditor popup has no dimensions! Size: ${boundingBox.width}x${boundingBox.height}`
      );
    }

    return { popup, boundingBox };
  }

  /**
   * Click at a specific position relative to a formatted element (link, bold, etc).
   *
   * @param editor - The contenteditable editor locator
   * @param position - Where to click: 'inside', 'before', or 'after'
   * @param formatSelector - CSS selector for the format (e.g., 'a' for links, 'strong' for bold)
   * @returns The formatted element that was clicked relative to
   */
  async clickRelativeToFormat(
    editor: Locator,
    position: 'inside' | 'before' | 'after',
    formatSelector: string = 'a'
  ): Promise<Locator> {
    // Wait for editor to be visible first (important for CI timing)
    await editor.waitFor({ state: 'visible', timeout: 10000 });

    // Find the formatted element within the editor
    const formattedElement = editor.locator(formatSelector).first();
    await formattedElement.waitFor({ state: 'visible', timeout: 5000 });

    const box = await formattedElement.boundingBox();
    if (!box) {
      throw new Error(`Formatted element ${formatSelector} has no bounding box`);
    }

    // Cache editor bounding box (call once, not twice)
    const editorBox = await editor.boundingBox();
    if (!editorBox) {
      throw new Error(`Editor has no bounding box`);
    }

    let clickX: number;
    let clickY: number = box.y + box.height / 2; // Middle vertically

    switch (position) {
      case 'inside':
        // Click in the middle of the formatted element
        clickX = box.x + box.width / 2;
        break;
      case 'before':
        // Click 5px before the formatted element
        clickX = box.x - 5;
        break;
      case 'after':
        // Click 5px after the formatted element
        clickX = box.x + box.width + 5;
        break;
    }

    // Click at the calculated position (use cached editorBox)
    await editor.click({
      position: {
        x: clickX - editorBox.x,
        y: clickY - editorBox.y,
      },
    });

    return formattedElement;
  }

  /**
   * Wait for all LinkEditor popups to be hidden.
   *
   * @param timeout - Maximum time to wait in milliseconds (default: 5000)
   */
  async waitForLinkEditorToClose(timeout: number = 5000): Promise<void> {
    // LinkEditor renders in a PositionedToolbar with className "add-link"
    // Wait for NO .add-link elements to be visible
    const popup = this.page.locator('.add-link');

    // Wait until there are no visible LinkEditor popups
    await this.page.waitForFunction(
      () => {
        const popups = document.querySelectorAll('.add-link');
        return Array.from(popups).every(p => {
          const style = window.getComputedStyle(p);
          return style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0';
        });
      },
      { timeout }
    );
  }

  /**
   * Get the URL input field from the LinkEditor popup.
   * Throws if popup is not visible or input is not found.
   *
   * @returns The URL input locator
   */
  async getLinkEditorUrlInput(): Promise<Locator> {
    // First ensure popup is visible
    await this.waitForLinkEditorPopup();

    // Find the URL input within the popup
    const input = this.page.locator('.add-link input, .slate-inline-toolbar input, input[placeholder*="link" i]').first();

    // Wait for input to be visible
    await input.waitFor({ state: 'visible', timeout: 2000 });

    // Wait for the input to actually be focused (componentDidMount completed successfully)
    await expect(input).toBeFocused({ timeout: 2000 });

    return input;
  }

  /**
   * Get the Clear button from the LinkEditor popup.
   * The Clear button appears when the input has text.
   *
   * @returns The Clear button locator
   */
  async getLinkEditorClearButton(): Promise<Locator> {
    // Look for Clear button directly - it should be near the "Add link" input
    const clearButton = this.page.locator('button[aria-label="Clear"]').first();

    await clearButton.waitFor({ state: 'visible', timeout: 2000 });

    return clearButton;
  }

  /**
   * Get the Browse button from the LinkEditor popup.
   * The Browse button appears when the input is empty.
   *
   * @returns The Browse button locator
   */
  async getLinkEditorBrowseButton(): Promise<Locator> {
    // Look for Browse button directly - it should be near the "Add link" input
    const browseButton = this.page.locator('button[aria-label="Open object browser"]').first();

    await browseButton.waitFor({ state: 'visible', timeout: 2000 });

    return browseButton;
  }

  /**
   * Wait for the sidebar's Slate inline toolbar to appear and return it.
   * The sidebar toolbar is a .slate-inline-toolbar that is NOT the main .quanta-toolbar.
   * It appears when text is selected in the sidebar's Slate editor (e.g., RichTextWidget).
   *
   * @param timeout - Maximum time to wait in milliseconds (default: 5000)
   * @returns ElementHandle for the toolbar element
   */
  async waitForSidebarSlateToolbar(timeout: number = 5000): Promise<ElementHandle> {
    // Wait for toolbar and get it in a single atomic operation
    // This avoids race conditions where toolbar disappears between wait and get
    const toolbarHandle = await this.page.waitForFunction(
      () => {
        const toolbars = document.querySelectorAll(
          '.slate-inline-toolbar:not(.quanta-toolbar)',
        );
        for (const toolbar of toolbars) {
          const style = window.getComputedStyle(toolbar);
          if (style.opacity === '1') {
            return toolbar; // Return the element itself
          }
        }
        return null;
      },
      { timeout },
    );

    return toolbarHandle as unknown as ElementHandle;
  }

  /**
   * Get a format button from the sidebar's Slate toolbar.
   * Use this to click Bold, Italic, etc. in the sidebar editor's toolbar.
   *
   * @param toolbar - ElementHandle returned from waitForSidebarSlateToolbar()
   * @param format - The format to get: 'bold', 'italic', 'strikethrough', 'link', etc.
   * @returns ElementHandle for the button element
   */
  async getSidebarToolbarButton(
    toolbar: ElementHandle,
    format: 'bold' | 'italic' | 'strikethrough' | 'link'
  ): Promise<ElementHandle> {
    const formatTitle = format.charAt(0).toUpperCase() + format.slice(1);

    const buttonHandle = await toolbar.evaluateHandle((tb, title) => {
      const button = tb.querySelector(`[title*="${title}" i]`);
      return button;
    }, formatTitle);

    // Check if the handle wraps null
    const isNull = await buttonHandle.evaluate((el) => el === null);
    if (isNull) {
      throw new Error(`Format button "${format}" not found in sidebar toolbar`);
    }

    // Scroll into view to avoid "outside of viewport" issues
    await buttonHandle.evaluate((el) => (el as Element).scrollIntoView({ block: 'center' }));

    return buttonHandle as ElementHandle;
  }

  /**
   * Add a block via the sidebar ChildBlocksWidget.
   * Clicks the add button for the specified container field, and if a block chooser
   * appears (multiple allowed types), selects the specified block type.
   *
   * @param containerFieldTitle - The title of the container field section (e.g., 'Columns', 'Blocks')
   * @param blockType - The block type to add (e.g., 'column', 'slate', 'image'). If the container
   *                    only allows one type, this is ignored and the block is auto-inserted.
   */
  async addBlockViaSidebar(
    containerFieldTitle: string,
    blockType?: string,
  ): Promise<void> {
    // Find the container field section and its add button
    const section = this.page.locator('.container-field-section', {
      has: this.page.locator('.widget-title', { hasText: containerFieldTitle }),
    });
    const addButton = section.getByRole('button', { name: 'Add block' });
    await expect(addButton).toBeVisible({ timeout: 5000 });
    await addButton.click();

    // Check if block chooser appeared (multiple allowed types)
    const blockChooser = this.page.locator('.blocks-chooser');
    const chooserVisible = await blockChooser
      .waitFor({ state: 'visible', timeout: 1000 })
      .then(() => true)
      .catch(() => false);

    if (chooserVisible && blockType) {
      // Select the specified block type
      const blockButton = blockChooser.getByRole('button', {
        name: new RegExp(blockType, 'i'),
      });
      await blockButton.click();
      // Wait for chooser to close
      await blockChooser.waitFor({ state: 'hidden', timeout: 5000 });
    }
  }

  /**
   * Click a block action button (e.g., Add Row Before, Add Column Before).
   * Handles both toolbar and overflow dropdown locations since buttons may
   * overflow to dropdown when toolbar is narrow.
   *
   * @param actionTitle - The title/label of the action button (e.g., 'Add Row Before')
   */
  async clickBlockAction(actionTitle: string): Promise<void> {
    const toolbar = this.page.locator('.quanta-toolbar');
    await toolbar.waitFor({ state: 'visible', timeout: 5000 });

    // First try to find the button directly in the toolbar
    const toolbarButton = toolbar.locator(`button[title="${actionTitle}"]`);
    if (await toolbarButton.isVisible().catch(() => false)) {
      await toolbarButton.click();
      return;
    }

    // Button not in toolbar - look in the overflow dropdown
    const dropdownTrigger = toolbar.locator('button[title="More options"]');
    if (!(await dropdownTrigger.isVisible().catch(() => false))) {
      throw new Error(
        `Block action "${actionTitle}" not found in toolbar and no dropdown available`
      );
    }

    await dropdownTrigger.click();

    // Wait for dropdown to open and find the button
    const dropdown = this.page.locator('.volto-hydra-dropdown-menu');
    await dropdown.waitFor({ state: 'visible', timeout: 3000 });

    const dropdownButton = dropdown.locator(`button[title="${actionTitle}"]`);
    if (!(await dropdownButton.isVisible().catch(() => false))) {
      throw new Error(
        `Block action "${actionTitle}" not found in toolbar or dropdown`
      );
    }

    await dropdownButton.click();
  }

  // =============================================================================
  // Object Browser Helpers
  // =============================================================================

  /**
   * Get the object browser popup locator.
   * The object browser can be:
   * - An aside[role="presentation"] (for link editor)
   * - A div with h2 "Choose Image" (for image selection from toolbar)
   *
   * @returns Locator for the object browser popup
   */
  getObjectBrowserPopup(): Locator {
    // Use last() since there may be multiple and the object browser is the newest
    return this.page.locator('aside[role="presentation"], .object-browser-wrapper').last();
  }

  /**
   * Wait for the object browser popup to be fully visible and ready.
   * Handles both aside-based and div-based object browsers.
   * Navigates to root (Home) since the browser may open at current page path.
   *
   * @param timeout - Maximum time to wait in milliseconds (default: 5000)
   * @returns Locator for the object browser popup
   */
  async waitForObjectBrowser(timeout: number = 5000): Promise<Locator> {
    // Wait for either type of object browser:
    // - aside[role="presentation"] for link editor
    // - Element with "Choose Image" heading for toolbar image selection

    // Try aside first (link editor)
    const aside = this.page.locator('aside[role="presentation"]').last();

    // Also look for image browser by finding "Choose Image" heading and going to parent container
    const chooseImageHeading = this.page.getByRole('heading', { name: 'Choose Image' });

    // Wait for either to appear
    await Promise.race([
      aside.waitFor({ state: 'visible', timeout }).catch(() => null),
      chooseImageHeading.waitFor({ state: 'visible', timeout }).catch(() => null),
    ]);

    // Determine which one is visible
    let locator: Locator;
    if (await aside.isVisible().catch(() => false)) {
      locator = aside;
    } else if (await chooseImageHeading.isVisible()) {
      // Get the parent container (2 levels up from heading -> header -> container)
      locator = chooseImageHeading.locator('xpath=ancestor::*[.//ul or .//list]').first();
      // Fallback to just finding the list nearby
      if (!(await locator.count())) {
        locator = this.page.locator('ul:has(li)').filter({ hasText: /Document|Image/ }).last();
      }
    } else {
      throw new Error('Object browser did not appear');
    }

    // Object browser may open at current page path (e.g., /test-page) which has no children.
    // Check if we need to navigate to Home (list is empty or no matching items)
    const listItems = this.page.locator('li').filter({ hasText: /Document|Image|Folder/ });
    const hasItems = await listItems.first().isVisible({ timeout: 1000 }).catch(() => false);

    if (!hasItems) {
      const homeButton = this.page.getByRole('button', { name: 'Home' });
      if (await homeButton.isVisible().catch(() => false)) {
        await homeButton.click();
        await this.page.waitForTimeout(500);
      }
    }

    // Wait for list items to appear
    await expect(listItems.first()).toBeVisible({ timeout });

    return locator;
  }

  /**
   * Navigate to the root (Home) in the object browser.
   * Clicks the Home button in the breadcrumb.
   *
   * @param objectBrowser - The object browser locator (from waitForObjectBrowser)
   */
  async objectBrowserNavigateHome(objectBrowser: Locator): Promise<void> {
    const homeBreadcrumb = objectBrowser.getByRole('button', { name: 'Home' });
    await homeBreadcrumb.waitFor({ state: 'visible', timeout: 2000 });
    await homeBreadcrumb.click();

    // Wait for the listing to update by checking for list items
    await expect(objectBrowser.locator('li[role="listitem"]').first()).toBeVisible({ timeout: 5000 });
  }

  /**
   * Navigate into a folder in the object browser.
   * Clicks the folder item to enter it.
   *
   * @param _objectBrowser - The object browser locator (unused, searches globally)
   * @param folderName - The name of the folder to navigate into (e.g., "Images" or /images/i)
   */
  async objectBrowserNavigateToFolder(_objectBrowser: Locator, folderName: string | RegExp): Promise<void> {
    // Find folder by text content since accessible names include full path like "/images (Document)"
    // Search globally since the object browser container locator may vary
    const folderItem = this.page.locator('li').filter({ hasText: folderName });
    await folderItem.first().waitFor({ state: 'visible', timeout: 5000 });
    await folderItem.first().click();

    // Wait for the listing to update - new items should appear
    await this.page.waitForTimeout(300);
    await expect(this.page.locator('li').first()).toBeVisible({ timeout: 5000 });
  }

  /**
   * Select an item in the object browser (closes the browser).
   * This is used to select an image or content item.
   *
   * @param _objectBrowser - The object browser locator (unused, searches globally)
   * @param itemName - The name of the item to select (e.g., "Test Image 1" or /test-image-1/i)
   */
  async objectBrowserSelectItem(_objectBrowser: Locator, itemName: string | RegExp): Promise<void> {
    // Find item by text content since accessible names include full path
    // Search globally since the object browser container locator may vary
    const item = this.page.locator('li').filter({ hasText: itemName });
    await item.first().waitFor({ state: 'visible', timeout: 5000 });
    await item.first().click();

    // Wait for the object browser to close, or close it manually if it stays open
    // Check for both "Choose Image" and "Choose Target" headings (different browser types)
    const chooseImageHeading = this.page.getByRole('heading', { name: 'Choose Image' });
    const chooseTargetHeading = this.page.getByRole('heading', { name: 'Choose Target' });
    const browserHeading = await chooseImageHeading.isVisible().catch(() => false)
      ? chooseImageHeading
      : chooseTargetHeading;

    try {
      await expect(browserHeading).not.toBeVisible({ timeout: 2000 });
    } catch {
      // Object browser didn't auto-close, close it manually via the X button in header
      // The X button is the last button in the header banner
      const banner = browserHeading.locator('..');
      const closeButton = banner.locator('button').last();
      if (await closeButton.isVisible().catch(() => false)) {
        await closeButton.click();
        await this.page.waitForTimeout(500);
      }
      // If still visible, press Escape
      if (await browserHeading.isVisible().catch(() => false)) {
        await this.page.keyboard.press('Escape');
        await this.page.waitForTimeout(500);
      }
    }
  }

  /**
   * Open the object browser from a sidebar field and wait for it to be ready.
   *
   * @param fieldWrapper - Locator for the field wrapper (e.g., .field-wrapper-image)
   * @returns Locator for the open object browser popup
   */
  async openObjectBrowserFromField(fieldWrapper: Locator): Promise<Locator> {
    const browseButton = fieldWrapper.locator('button[aria-label="Open object browser"]');
    await expect(browseButton).toBeVisible({ timeout: 5000 });
    await browseButton.click();

    return this.waitForObjectBrowser();
  }

  /**
   * Open the object browser from a toolbar AddLinkForm popup.
   * Handles clearing existing value first if needed (browse button only shows when empty).
   *
   * @param popup - Locator for the AddLinkForm popup (e.g., .field-image-editor)
   * @param reopenButton - Locator for the button to reopen the popup after clearing
   * @returns Locator for the open object browser popup
   */
  async openObjectBrowserFromToolbarPopup(popup: Locator, reopenButton: Locator): Promise<Locator> {
    // Check if there's an existing value (clear button visible instead of browse)
    const clearButton = popup.locator('button[aria-label="Clear"]');
    const browseButton = popup.locator('button[aria-label="Open object browser"]');

    if (await clearButton.isVisible().catch(() => false)) {
      // Clear the value first
      await clearButton.click();

      // Popup closes on clear, reopen it
      await reopenButton.click();
      await expect(popup).toBeVisible({ timeout: 5000 });
    }

    // Now browse button should be visible
    await expect(browseButton).toBeVisible({ timeout: 5000 });
    await browseButton.click();

    return this.waitForObjectBrowser();
  }

  /**
   * Submit the AddLinkForm popup if it's still open.
   * The object browser selection sets the URL but doesn't auto-submit due to React async state.
   *
   * @param popup - Locator for the AddLinkForm popup (e.g., .field-image-editor, .field-link-editor)
   */
  async submitAddLinkFormIfOpen(popup: Locator): Promise<void> {
    const submitButton = popup.locator('button[aria-label="Submit"]');
    if (await submitButton.isVisible().catch(() => false)) {
      await submitButton.click();
    }
  }

  /**
   * Simulate drag-and-drop of an image file onto a target element.
   * Uses DataTransfer API to dispatch real drag events that react-dropzone handles.
   *
   * @param dropTarget - Locator for the drop zone element
   * @param filename - Name for the test file (default: 'drag-drop-test.png')
   */
  async dragDropImageFile(
    dropTarget: Locator,
    filename: string = 'drag-drop-test.png',
  ): Promise<void> {
    await expect(dropTarget).toBeVisible({ timeout: 5000 });

    // Scroll into view to ensure element is in viewport for elementFromPoint
    await dropTarget.scrollIntoViewIfNeeded();
    await this.page.waitForTimeout(100); // Brief wait for scroll to settle

    const box = await dropTarget.boundingBox();
    if (!box) throw new Error('Could not get bounding box for drop target');
    const dropX = box.x + box.width / 2;
    const dropY = box.y + box.height / 2;

    // Minimal valid 1x1 PNG as base64
    const pngBase64 =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

    await this.page.evaluate(
      ({ dropX, dropY, pngBase64, filename }) => {
        const byteCharacters = atob(pngBase64);
        const byteArray = new Uint8Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteArray[i] = byteCharacters.charCodeAt(i);
        }
        const blob = new Blob([byteArray], { type: 'image/png' });
        const file = new File([blob], filename, { type: 'image/png' });

        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);

        const element = document.elementFromPoint(dropX, dropY);
        if (!element) throw new Error('No element at drop coordinates');

        element.dispatchEvent(
          new DragEvent('dragenter', { bubbles: true, cancelable: true, dataTransfer }),
        );
        element.dispatchEvent(
          new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer }),
        );
        element.dispatchEvent(
          new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer }),
        );
      },
      { dropX, dropY, pngBase64, filename },
    );
  }
}
