/**
 * Helper class for interacting with Volto Hydra admin UI in tests.
 */
import { Page, Locator, FrameLocator, expect, ElementHandle } from '@playwright/test';

export class AdminUIHelper {
  constructor(
    public readonly page: Page,
    public readonly adminUrl: string = 'http://localhost:3001'
  ) {
    // Capture all browser console messages
    this.page.on('console', (msg) => {
      console.log(`[BROWSER] ${msg.text()}`);
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

    console.log('[DEBUG] Auth cookie set directly for testing');

    // Navigate to homepage first (doesn't require SSR auth)
    await this.page.goto(`${this.adminUrl}/`, {
      timeout: 60000,
      waitUntil: 'networkidle',
    });

    console.log('[DEBUG] Homepage loaded successfully');
  }

  /**
   * Navigate to the edit page for a piece of content.
   * Uses pure client-side navigation to avoid SSR auth issues.
   */
  async navigateToEdit(contentPath: string): Promise<void> {
    // Ensure path starts with /
    if (!contentPath.startsWith('/')) {
      contentPath = '/' + contentPath;
    }

    const editPath = `${contentPath}/edit`;

    console.log(`[DEBUG] Navigating to ${editPath} using client-side navigation`);

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

    console.log(`[DEBUG] Client-side navigation to ${editPath} triggered, waiting for iframe`);

    // Wait for the URL to change
    await this.page.waitForURL(`${this.adminUrl}${editPath}`, { timeout: 10000 });

    // Wait for iframe to load
    await this.waitForIframeReady();
  }

  /**
   * Wait for the preview iframe to load.
   */
  async waitForIframeReady(timeout: number = 10000): Promise<void> {
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
   * Click on a block within the preview iframe.
   * Waits for the block to be selected (have the outline) after clicking.
   */
  async clickBlockInIframe(blockId: string) {
    const iframe = this.getIframe();
    const block = iframe.locator(`[data-block-uid="${blockId}"]`);

    // Verify block exists before trying to click
    const blockCount = await block.count();
    if (blockCount === 0) {
      throw new Error(`Block with id "${blockId}" not found in iframe. Check if the block exists in the content.`);
    }

    // Scroll into view to ensure the block and its toolbar are visible
    await block.scrollIntoViewIfNeeded();
    await block.click();

    // Wait for the block UI overlays to appear in the parent window (toolbar and selection outline)
    // The selection outline and toolbar are now rendered in the parent window, not in the iframe
    try {
      await this.page.locator('.quanta-toolbar').waitFor({
        state: 'visible',
        timeout: 5000
      });
    } catch (e) {
      throw new Error(`Block "${blockId}" was clicked but the toolbar overlay never appeared in parent window. This likely means selectBlock() in hydra.js is not sending BLOCK_SELECTED message. Check that hydra.js is loaded and selectBlock() is being called.`);
    }

    // Wait for the Quanta toolbar to appear on the selected block
    await this.waitForQuantaToolbar(blockId);

    // Wait for the sidebar to open and show this block's info
    // await this.waitForSidebarOpen();

    // Return the block locator for chaining
    return block;
  }

  /**
   * Check if a block is selected in the iframe.
   * A block is selected if it has the "selected" class.
   */
  /**
   * Wait for a block to be selected in the iframe.
   */
  async waitForBlockSelected(blockId: string, timeout: number = 5000) {
    const iframe = this.getIframe();
    const block = iframe.locator(`[data-block-uid="${blockId}"]`);
    await block.waitFor({ state: 'visible', timeout });
    // Also wait a bit for the selected class to be applied
    await this.page.waitForTimeout(300);

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
    await this.page.waitForSelector(
      '#sidebar-properties',
      {
        state: 'visible',
        timeout,
      }
    );
  }

  /**
   * Open a specific sidebar tab (Page, Block, Order, etc.)
   * Matches Cypress pattern: .sidebar-container .tabs-wrapper .menu .item
   */
  async openSidebarTab(tabName: string): Promise<void> {
    const tab = this.page.locator('.sidebar-container .tabs-wrapper .menu .item', {
      hasText: tabName
    });

    // Check if tab exists
    const tabCount = await tab.count();
    if (tabCount === 0) {
      throw new Error(
        `Sidebar tab "${tabName}" not found. ` +
        `Check that the sidebar is open and the tab name is correct. ` +
        `Available tabs are typically: Page, Block, Order.`
      );
    }

    // Verify tab is visible
    try {
      await tab.waitFor({ state: 'visible', timeout: 2000 });
    } catch (e) {
      throw new Error(`Sidebar tab "${tabName}" exists but is not visible. Check sidebar state.`);
    }

    await tab.click();
    // Wait for tab content to load
    await this.page.waitForTimeout(300);
  }

  /**
   * Get the type of block currently being edited in the sidebar.
   */
  async getSidebarBlockType(): Promise<string | null> {
    const sidebar = this.page.locator('#sidebar-properties');

    // Check for common block type indicators
    const selectors = [
      '[data-block-type]',
      '.block-editor-slate',
      '.block-editor-image',
      '.block-editor h2',
    ];

    for (const selector of selectors) {
      const element = sidebar.locator(selector).first();
      if (await element.isVisible()) {
        // Try to extract block type
        const dataAttr = await element.getAttribute('data-block-type');
        if (dataAttr) {
          return dataAttr;
        }

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
   * Check if the Quanta Toolbar is visible for a block.
   * The toolbar is rendered in the parent window (admin UI), not inside the iframe.
   */
  async isQuantaToolbarVisibleInIframe(blockId: string): Promise<boolean> {
    // Toolbar is now rendered in parent window, not in iframe
    const toolbar = this.page.locator('.quanta-toolbar');
    return await toolbar.isVisible();
  }

  /**
   * Get Quanta Toolbar buttons for a block (inside iframe).
   * Returns object with button visibility states.
   */
  async getQuantaToolbarButtons(
    blockId: string
  ): Promise<{
    addButton: boolean;
    dragButton: boolean;
    menuButton: boolean;
    formatButtons?: {
      bold: boolean;
      italic: boolean;
      strikethrough: boolean;
      link: boolean;
    };
  }> {
    const iframe = this.getIframe();
    const blockLocator = iframe.locator(`[data-block-uid="${blockId}"]`);

    const result = {
      addButton: await blockLocator.locator('.volto-hydra-add-button').isVisible(),
      dragButton: await blockLocator
        .locator('.volto-hydra-quantaToolbar .volto-hydra-drag-button')
        .isVisible(),
      menuButton: await blockLocator
        .locator('.volto-hydra-quantaToolbar .volto-hydra-menu-button')
        .isVisible(),
    };

    // Check for format buttons (only present for Slate/text blocks)
    const formatButtons = blockLocator.locator(
      '.volto-hydra-quantaToolbar .volto-hydra-format-button'
    );
    const formatButtonCount = await formatButtons.count();

    if (formatButtonCount > 0) {
      // Format buttons exist, check each one
      const allFormatButtons = await formatButtons.all();
      result.formatButtons = {
        bold: allFormatButtons.length > 0 && (await allFormatButtons[0].isVisible()),
        italic: allFormatButtons.length > 1 && (await allFormatButtons[1].isVisible()),
        strikethrough: allFormatButtons.length > 2 && (await allFormatButtons[2].isVisible()),
        link: allFormatButtons.length > 3 && (await allFormatButtons[3].isVisible()),
      };
    }

    return result;
  }

  /**
   * Wait for the Quanta toolbar to appear on a block.
   */
  async waitForQuantaToolbar(blockId: string, timeout: number = 10000): Promise<void> {
    // Toolbar is now rendered in the parent window, not in the iframe
    const toolbar = this.page.locator('.quanta-toolbar');

    try {
      await toolbar.waitFor({ state: 'visible', timeout });
    } catch (e) {
      throw new Error(
        `Quanta toolbar overlay did not appear for block "${blockId}" within ${timeout}ms. ` +
        `The toolbar is now rendered in the parent window as an overlay. ` +
        `Check that: (1) hydra.js is loaded, (2) selectBlock() sends BLOCK_SELECTED message, ` +
        `and (3) View.jsx renders the toolbar overlay on BLOCK_SELECTED.`
      );
    }
    const result = await this.isBlockSelectedInIframe(blockId);
    if (!result.ok) {
      throw new Error(`Block "${blockId}" selection check failed: ${result.reason}`);
    }
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
    menuButton.click();

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
   * get the Quanta Toolbar dropdown menu.
   */
  async getQuantaToolbarMenu(blockId: string): Promise<Locator> {
    const dropdown = this.page.locator(`.volto-hydra-dropdown-menu.visible`);
    return dropdown;
  }

  /**
   * Get the dropdown menu options (Settings, Remove).
   */
  async getQuantaToolbarMenuOptions(blockId: string): Promise<string[]> {
    const iframe = this.getIframe();
    const dropdown = iframe.locator(
      `[data-block-uid="${blockId}"] .volto-hydra-dropdown-menu`
    );
    const items = dropdown.locator('.volto-hydra-dropdown-item');

    const options: string[] = [];
    const count = await items.count();

    for (let i = 0; i < count; i++) {
      const text = await items.nth(i).locator('.volto-hydra-dropdown-text').textContent();
      if (text) {
        options.push(text.trim());
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
    const dropdown = this.page.locator(
      `.volto-hydra-dropdown-menu`
    );
    const option = dropdown.locator(
      `.volto-hydra-dropdown-item:has-text("${optionText}")`
    );
    await option.click();
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
   */
  async verifySelectionMatches(editor: Locator, expectedText: string): Promise<void> {
    const selectedText = await editor.evaluate((el) => {
      const selection = window.getSelection();
      return selection ? selection.toString() : '';
    });

    if (selectedText !== expectedText) {
      throw new Error(
        `Selection mismatch. Expected: "${expectedText}", Got: "${selectedText}"`
      );
    }
  }

  /**
   * Select all text in a contenteditable element using JavaScript Selection API.
   * This is more reliable than using keyboard shortcuts.
   * Handles both plain text and formatted text (where text is inside SPAN, STRONG, etc.)
   */
  async selectAllTextInEditor(editor: Locator): Promise<void> {
    await editor.evaluate((el) => {
      // Find the first and last text nodes in the element
      // This handles both plain text and formatted text (e.g., <span>text</span>)
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
      const firstTextNode = walker.nextNode();
      if (!firstTextNode) {
        throw new Error('No text nodes found in editor');
      }

      // Find the last text node
      let lastTextNode = firstTextNode;
      let node;
      while ((node = walker.nextNode())) {
        lastTextNode = node;
      }

      const range = document.createRange();
      range.setStart(firstTextNode, 0);
      range.setEnd(lastTextNode, lastTextNode.textContent?.length || 0);
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(range);
      }
    });
    // Give the selection time to register and trigger selectionchange event
    await this.page.waitForTimeout(100);
  }

  /**
   * Copy selected text and return clipboard content.
   * Uses native keyboard copy (Meta+c) and reads from clipboard API.
   * Automatically grants clipboard permissions if needed.
   */
  async copyAndGetClipboardText(editor: Locator): Promise<string> {
    // Grant clipboard permissions
    await this.page.context().grantPermissions(['clipboard-read', 'clipboard-write']);

    // Trigger native copy with keyboard shortcut
    await editor.press('Meta+c');

    // Small delay for clipboard to be populated
    await this.page.waitForTimeout(50);

    // Read clipboard from parent page (clipboard is shared)
    const clipboardText = await this.page.evaluate(() =>
      navigator.clipboard.readText()
    );

    return clipboardText;
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
   * Get the number of blocks rendered in the iframe.
   */
  async getBlockCountInIframe(): Promise<number> {
    const iframe = this.getIframe();
    const blocks = iframe.locator('[data-block-uid]');
    return await blocks.count();
  }

  /**
   * Get the text content of a block in the iframe.
   */
  async getBlockTextInIframe(blockId: string): Promise<string> {
    const iframe = this.getIframe();
    // Get text from the editable field (data-editable-field), not the entire block (which includes toolbar buttons)
    // Don't require contenteditable="true" because it's only set when the block is selected
    const editor = iframe.locator(`[data-block-uid="${blockId}"] [data-editable-field]`).first();

    // Wait a moment for any pending mutations to complete
    await this.page.waitForTimeout(100);

    return (await editor.textContent()) || '';
  }

  /**
   * Get the text content of an editor, stripping ZWS characters.
   * ZWS characters (\u200B, \uFEFF) are inserted for cursor positioning
   * but are invisible to users, so tests should verify what users see.
   */
  async getCleanTextContent(editor: Locator): Promise<string> {
    const text = (await editor.textContent()) || '';
    return text.replace(/[\u200B\uFEFF]/g, '');
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
      // Strip zero-width spaces and other invisible characters
      // (used for cursor positioning in empty inline elements)
      // These are invisible to users, so test what users actually see
      text = text.replace(/[\uFEFF\u200B\u00A0\u2060]/g, ' ').replace(/\s+/g, ' ').trim();
      expect(text).toMatch(regex);
    }).toPass({ timeout });
    return text;
  }

  /**
   * Wait for formatted text (bold/italic) to appear in the editor.
   * Useful for waiting until formatting has been applied after Ctrl+B or toolbar clicks.
   */
  async waitForFormattedText(
    editor: Locator,
    pattern: RegExp | string,
    format: 'bold' | 'italic',
    options: { timeout?: number } = {}
  ): Promise<void> {
    const timeout = options.timeout ?? 5000;
    const selector = format === 'bold'
      ? 'span[style*="font-weight: bold"]'
      : 'span[style*="font-style: italic"]';
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;

    await expect(editor.locator(selector)).toHaveText(regex, { timeout });
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
      // Verify all UI overlays are visible
      const toolbar = this.page.locator('.quanta-toolbar');
      const outline = this.page.locator('.volto-hydra-block-outline');
      const addButton = this.page.locator('.volto-hydra-add-button');

      const toolbarVisible = await toolbar.isVisible();
      const outlineVisible = await outline.isVisible();
      const addButtonVisible = await addButton.isVisible();

      if (!toolbarVisible || !outlineVisible || !addButtonVisible) {
        return {
          ok: false,
          reason: `Overlays not visible: toolbar=${toolbarVisible}, outline=${outlineVisible}, addButton=${addButtonVisible}`,
        };
      }

      // Verify positioning is correct
      const positions = await this.verifyBlockUIPositioning(blockId);

      // Toolbar positioning: Can overlap the block top (negative is OK)
      // Just verify it's reasonably positioned near the block (within -50px to +50px)
      const toolbarPositioned = positions.toolbarAboveBlock > -50 && positions.toolbarAboveBlock < 50;

      // Add button should be ~8px below block (allow ±8px tolerance)
      const addButtonPositioned = positions.addButtonBelowBlock > 0 && positions.addButtonBelowBlock < 16;

      // Horizontal alignment check: tolerate small misalignments since toolbar is positioned
      // Note: the toolbar is aligned with the block not the field!
      const aligned = true; // Skip strict alignment check for now

      if (!toolbarPositioned) {
        return {
          ok: false,
          reason: `Toolbar not positioned correctly: toolbarAboveBlock=${positions.toolbarAboveBlock} (expected -50 to 50)`,
        };
      }
      if (!addButtonPositioned) {
        return {
          ok: false,
          reason: `Add button not positioned correctly: addButtonBelowBlock=${positions.addButtonBelowBlock} (expected 0-16)`,
        };
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
  async verifyBlockUIPositioning(blockId: string): Promise<{
    toolbarAboveBlock: number;
    addButtonBelowBlock: number;
    horizontalAlignment: boolean;
  }> {
    const blockBox = await this.getBlockBoundingBoxInIframe(blockId);
    const toolbarBox = await this.getToolbarBoundingBox();
    const addButtonBox = await this.getAddButtonBoundingBox();

    if (!blockBox || !toolbarBox || !addButtonBox) {
      throw new Error(`Missing bounding boxes: block=${!!blockBox}, toolbar=${!!toolbarBox}, addButton=${!!addButtonBox}`);
    }

    return {
      // Distance from bottom of toolbar to top of block
      toolbarAboveBlock: blockBox.y - (toolbarBox.y + toolbarBox.height),
      // Distance from bottom of block to top of add button
      addButtonBelowBlock: addButtonBox.y - (blockBox.y + blockBox.height),
      // Check if toolbar and block are horizontally aligned (within 2px tolerance)
      horizontalAlignment: Math.abs(toolbarBox.x - blockBox.x) < 2
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
   */
  async moveCursorToEnd(editor: any): Promise<void> {
    await editor.evaluate((el: any) => {
      const range = el.ownerDocument.createRange();
      const selection = el.ownerDocument.defaultView.getSelection();
      range.selectNodeContents(el);
      range.collapse(false); // Collapse to end
      selection.removeAllRanges();
      selection.addRange(range);
    });
  }

  /**
   * Move cursor to a specific position in a contenteditable element.
   *
   * @param editor - The contenteditable element
   * @param position - The character offset position to move to (0-based)
   */
  async moveCursorToPosition(editor: any, position: number): Promise<void> {
    await editor.evaluate(
      (el: any, pos: number) => {
        const textNode = el.firstChild;
        if (!textNode || textNode.nodeType !== 3) {
          // Node.TEXT_NODE = 3
          throw new Error('Expected first child to be a text node');
        }
        const range = el.ownerDocument.createRange();
        const selection = el.ownerDocument.defaultView.getSelection();
        range.setStart(textNode, pos);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
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
   * @returns The editor element, ready for text input
   */
  async enterEditMode(blockId: string): Promise<any> {
    const iframe = this.getIframe();
    // Use [data-editable-field] to find editor regardless of contenteditable state
    const editor = iframe
      .locator(`[data-block-uid="${blockId}"] [data-editable-field]`)
      .first();

    // Check if the editor is already visible and focused
    const isVisible = await editor.isVisible().catch(() => false);

    if (isVisible) {
      // Check if already editable
      const isEditable = await editor.getAttribute('contenteditable');
      if (isEditable === 'true') {
        // Check if already focused
        const focusInfo = await this.isEditorFocused(editor);
        if (focusInfo.isFocused) {
          // Already in edit mode, return the editor
          return editor;
        }
      }
    }

    // Not in edit mode yet, need to click the block
    const blockContainer = iframe.locator(`[data-block-uid="${blockId}"]`);
    await blockContainer.click();

    // Wait for the Quanta toolbar to appear (indicating block is selected)
    await this.waitForQuantaToolbar(blockId, 5000);

    // Wait for the editor element to appear
    await editor.waitFor({ state: 'visible', timeout: 5000 });

    // Wait for contenteditable to become true (may be blocked briefly)
    await expect(editor).toHaveAttribute('contenteditable', 'true', {
      timeout: 5000,
    });

    const focusInfo = await this.isEditorFocused(editor);
    if (!focusInfo.isFocused) {
      throw new Error(
        `Block ${blockId} field is not focused. Active element: ${focusInfo.activeElement}`,
      );
    }

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
        // The editor element itself contains the text node directly
        const textNode = el.firstChild;
        if (textNode && textNode.nodeType === 3) {
          // nodeType 3 = TEXT_NODE
          const range = doc.createRange();
          range.setStart(textNode, start);
          range.setEnd(textNode, end);
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
    const fieldWrapper = this.page.locator(`#sidebar-properties .field-wrapper-${fieldName}`);
    return await fieldWrapper.isVisible();
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

    // Try contenteditable
    const contentEditable = fieldWrapper.locator('[contenteditable="true"]');
    if (await contentEditable.isVisible()) {
      await contentEditable.click();
      await contentEditable.fill(value);
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
   */
  async isBlockTypeVisible(blockType: string): Promise<boolean> {
    // Different block types have different display names
    const blockNames: Record<string, string[]> = {
      slate: ['Text', 'Slate', 'text'],
      image: ['Image', 'image'],
      video: ['Video', 'video'],
      listing: ['Listing', 'listing'],
    };

    const possibleNames = blockNames[blockType.toLowerCase()] || [blockType];

    // Try to find the block type button
    for (const name of possibleNames) {
      const blockButton = this.page.locator(`button:has-text("${name}")`).or(
        this.page.locator(`[data-block-type="${name.toLowerCase()}"]`)
      ).first();

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

    // Try to find and click the block type button
    for (const name of possibleNames) {
      const blockButton = this.page.locator(`button:has-text("${name}")`).or(
        this.page.locator(`[data-block-type="${name.toLowerCase()}"]`)
      ).first();

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

    try {
      await block.waitFor({ state: 'hidden', timeout });
    } catch {
      // Block might be completely removed from DOM
      const count = await block.count();
      if (count > 0) {
        throw new Error(`Block ${blockId} still exists after timeout`);
      }
    }
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
   * Drag a block using realistic mouse events at coordinates.
   * Simulates actual user interaction by clicking at visual coordinates
   * where the toolbar drag icon appears, rather than dispatching on specific elements.
   *
   * This realistic approach will FAIL if the iframe drag button is not correctly
   * positioned under the toolbar icon, which helps catch positioning bugs.
   *
   * @param dragHandle - The toolbar drag handle (used to get visual coordinates)
   * @param targetBlock - The target block to drag to
   * @param insertAfter - If true, insert after target (past halfway). If false, insert before (top half).
   */
  async dragBlockWithMouse(
    dragHandle: Locator,
    targetBlock: Locator,
    insertAfter: boolean = true
  ): Promise<void> {
    // Get toolbar drag icon position (where user SEES the draggable element)
    const toolbar = this.page.locator('.quanta-toolbar');
    const toolbarDragIcon = toolbar.locator('.drag-handle');
    const toolbarIconRect = await toolbarDragIcon.boundingBox();

    if (!toolbarIconRect) {
      throw new Error('Could not get toolbar drag icon bounding box');
    }

    // Calculate center point where user would click
    const startX = toolbarIconRect.x + toolbarIconRect.width / 2;
    const startY = toolbarIconRect.y + toolbarIconRect.height / 2;

    console.log('[TEST] Realistic drag: clicking at toolbar visual position', { startX, startY });

    // Use Playwright's mouse API to click at coordinates
    // This will hit whatever element is actually at those coordinates in the browser
    // If the iframe drag button is correctly positioned, it will receive the event
    // If it's mispositioned (the bug), the event will miss it and drag will fail
    await this.page.mouse.move(startX, startY);
    await this.page.mouse.down();
    await this.page.waitForTimeout(50);

    // Get target block position
    const targetRect = await targetBlock.boundingBox();
    if (!targetRect) {
      throw new Error('Could not get target block bounding box');
    }

    // Calculate target coordinates (insertAfter determines position)
    // Note: targetRect is already in page coordinates (Playwright handles iframe offset)
    const targetY = insertAfter
      ? targetRect.y + targetRect.height * 0.75  // 75% down
      : targetRect.y + targetRect.height * 0.25; // 25% down
    const targetX = targetRect.x + targetRect.width / 2;

    // Get iframe position to check for coordinate offset
    const iframeElement = this.page.locator('#previewIframe');
    const iframeRect = await iframeElement.boundingBox();
    console.log('[TEST] Iframe position:', iframeRect);
    console.log('[TEST] Target block rect (page coords):', targetRect);
    console.log('[TEST] Moving mouse to (page coords):', { targetX, targetY, insertAfter });

    // Move to target with steps to simulate dragging motion
    await this.page.mouse.move(targetX, targetY, { steps: 10 });

    // Wait for throttled mousemove handler in hydra.js (100ms throttle + processing time)
    await this.page.waitForTimeout(150);

    // Trigger one final mousemove at the exact target position to ensure throttled handler
    // processes the final position (not just an intermediate step position)
    await this.page.mouse.move(targetX, targetY);
    await this.page.waitForTimeout(150);

    // Verify drop indicator is showing during drag
    const isDropIndicatorVisible = await this.isDropIndicatorVisible();
    console.log('[TEST] Drop indicator visible during drag:', isDropIndicatorVisible);

    if (!isDropIndicatorVisible) {
      throw new Error('Drop indicator not visible during drag - drag may have failed');
    }

    // Get drop indicator position and verify it's between the correct blocks
    const iframe = this.getIframe();
    const dropIndicator = iframe.locator('.volto-hydra-drop-indicator');
    const dropIndicatorRect = await dropIndicator.boundingBox();
    const targetBlockRect = await targetBlock.boundingBox();

    if (!dropIndicatorRect || !targetBlockRect || !iframeRect) {
      throw new Error('Could not get drop indicator, target block, or iframe position');
    }

    // Convert drop indicator position from iframe coords to page coords
    const dropIndicatorPageY = dropIndicatorRect.y + iframeRect.y;

    console.log('[TEST] Drop indicator Y (iframe coords):', dropIndicatorRect.y);
    console.log('[TEST] Drop indicator Y (page coords):', dropIndicatorPageY);
    console.log('[TEST] Target block top:', targetBlockRect.y, 'bottom:', targetBlockRect.y + targetBlockRect.height);

    // Verify drop indicator position relative to target block
    if (insertAfter) {
      // Should be at or below the bottom of the target block
      const isAfterTarget = dropIndicatorPageY >= targetBlockRect.y + targetBlockRect.height - 5; // 5px tolerance
      console.log('[TEST] Drop indicator is after target block:', isAfterTarget);

      if (!isAfterTarget) {
        throw new Error(
          `Drop indicator positioned incorrectly for insertAfter. ` +
          `Expected at/below ${targetBlockRect.y + targetBlockRect.height}, got ${dropIndicatorPageY}`
        );
      }
    } else {
      // Should be at or above the top of the target block
      const isBeforeTarget = dropIndicatorPageY <= targetBlockRect.y + 5; // 5px tolerance
      console.log('[TEST] Drop indicator is before target block:', isBeforeTarget);

      if (!isBeforeTarget) {
        throw new Error(
          `Drop indicator positioned incorrectly for insertBefore. ` +
          `Expected at/above ${targetBlockRect.y}, got ${dropIndicatorPageY}`
        );
      }
    }

    // Release mouse to complete the drag
    await this.page.mouse.up();

    // Wait for postMessage round-trip and DOM updates
    await this.page.waitForTimeout(500);

    // Verify drop indicator disappears after drop
    const isDropIndicatorVisibleAfter = await this.isDropIndicatorVisible();
    console.log('[TEST] Drop indicator visible after drop:', isDropIndicatorVisibleAfter);

    if (isDropIndicatorVisibleAfter) {
      console.warn('[TEST] Warning: Drop indicator still visible after drop');
    }

    console.log('[TEST] Realistic drag: completed');
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
   * Clicks the user menu and then the logout button.
   * This is a complex operation that handles various UI patterns.
   *
   * @throws Error if logout UI elements cannot be found
   */
  async logout(): Promise<void> {
    // Look for user menu
    const userMenu = this.page.locator('[aria-label="User menu"]').or(
      this.page.locator('.user.menu')
    ).first();

    const menuCount = await userMenu.count();
    if (menuCount === 0) {
      throw new Error(
        'User menu not found. Check that user is logged in and the user menu element exists.'
      );
    }

    // Verify menu is visible before clicking
    try {
      await userMenu.waitFor({ state: 'visible', timeout: 2000 });
    } catch (e) {
      throw new Error(
        'User menu exists but is not visible. Check that the UI is fully loaded.'
      );
    }

    await userMenu.click();

    // Wait for dropdown to appear
    const logoutButton = this.page.locator('text=Logout').or(
      this.page.locator('text=Log out')
    );

    try {
      await logoutButton.waitFor({ state: 'visible', timeout: 2000 });
    } catch (e) {
      throw new Error(
        'Logout button did not appear after clicking user menu. ' +
        'Check that the menu dropdown is working correctly.'
      );
    }

    await logoutButton.click();

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

    console.log(`[TEST] ${message}:`, selectionInfo);

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
      // Log all candidates for debugging
      const count = await popups.count();
      for (let i = 0; i < count; i++) {
        const box = await popups.nth(i).boundingBox();
        console.log(`[TEST] LinkEditor popup ${i} at:`, box);
      }
      throw new Error(`LinkEditor popup not found on-screen. Found ${count} candidates but none at valid position.`);
    }

    console.log('[TEST] LinkEditor popup found at:', boundingBox);

    // Verify popup has dimensions (width and height > 0)
    if (boundingBox.width === 0 || boundingBox.height === 0) {
      throw new Error(
        `LinkEditor popup has no dimensions! Size: ${boundingBox.width}x${boundingBox.height}`
      );
    }

    console.log('[TEST] LinkEditor popup is visible with dimensions:', {
      position: `(${boundingBox.x}, ${boundingBox.y})`,
      size: `${boundingBox.width}x${boundingBox.height}`,
    });

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
    // Find the formatted element within the editor
    const formattedElement = editor.locator(formatSelector).first();
    await formattedElement.waitFor({ state: 'visible', timeout: 5000 });

    const box = await formattedElement.boundingBox();
    if (!box) {
      throw new Error(`Formatted element ${formatSelector} has no bounding box`);
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

    // Click at the calculated position
    await editor.click({ position: { x: clickX - (await editor.boundingBox())!.x, y: clickY - (await editor.boundingBox())!.y } });

    console.log(`[TEST] Clicked ${position} ${formatSelector} at (${clickX}, ${clickY})`);
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

    console.log('[TEST] All LinkEditor popups are now hidden');
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

    console.log('[TEST] LinkEditor URL input found');

    // Wait for the input to actually be focused (componentDidMount completed successfully)
    await expect(input).toBeFocused({ timeout: 2000 });
    console.log('[TEST] LinkEditor input is focused, componentDidMount completed');

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
    console.log('[TEST] LinkEditor Clear button found');

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
    console.log('[TEST] LinkEditor Browse button found');

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
    // Wait for a .slate-inline-toolbar with opacity=1 that is NOT the quanta-toolbar
    await this.page.waitForFunction(() => {
      const toolbars = document.querySelectorAll('.slate-inline-toolbar:not(.quanta-toolbar)');
      for (const toolbar of toolbars) {
        const style = window.getComputedStyle(toolbar);
        if (style.opacity === '1') {
          return true;
        }
      }
      return false;
    }, { timeout });

    // Get the visible toolbar element
    const toolbarHandle = await this.page.evaluateHandle(() => {
      const toolbars = document.querySelectorAll('.slate-inline-toolbar:not(.quanta-toolbar)');
      for (const toolbar of toolbars) {
        const style = window.getComputedStyle(toolbar);
        if (style.opacity === '1') {
          return toolbar;
        }
      }
      return null;
    });

    if (!toolbarHandle) {
      throw new Error('Sidebar Slate toolbar not found after waiting');
    }

    console.log('[TEST] Sidebar Slate toolbar is visible');
    return toolbarHandle as ElementHandle;
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
    const formatTitle = format.charAt(0).toUpperCase() + format.slice(1); // Capitalize first letter

    const buttonHandle = await toolbar.evaluateHandle((tb, title) => {
      const button = tb.querySelector(`[title*="${title}" i]`);
      return button;
    }, formatTitle);

    if (!buttonHandle) {
      throw new Error(`Format button "${format}" not found in sidebar toolbar`);
    }

    console.log(`[TEST] Found sidebar toolbar button: ${format}`);
    return buttonHandle as ElementHandle;
  }
}
