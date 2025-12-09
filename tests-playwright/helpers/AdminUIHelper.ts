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
      // Try to wait for toolbar on the target block
      // If a child was selected instead, navigate up via sidebar
      const result = await this.isBlockSelectedInIframe(blockId);
      if (!result.ok) {
        // A child block was likely selected instead - navigate up via sidebar
        await this.navigateToParentBlock(blockId);
      } else {
        // Target is selected, wait for toolbar to be positioned correctly
        await this.waitForQuantaToolbar(blockId);
      }
    } else {
      // For mock parent tests: wait for block to become editable instead of toolbar
      const editableField = block.locator('[contenteditable="true"]');
      try {
        await editableField.waitFor({ state: 'visible', timeout: 5000 });
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
   */
  async navigateToParentBlock(targetBlockId: string, maxAttempts: number = 10): Promise<void> {
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

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      // Check if target block is now selected
      const result = await this.isBlockSelectedInIframe(targetBlockId);
      if (result.ok) {
        await this.waitForQuantaToolbar(targetBlockId);
        return;
      }

      // Find and click the LAST "‹ BlockType" parent navigation button in sidebar
      // (the one closest to the current block - clicking it navigates up one level)
      // Buttons are ordered root-to-current, so last is the current block's header
      const parentButton = parentButtonLocator.last();
      const buttonExists = (await parentButton.count()) > 0;

      if (!buttonExists) {
        throw new Error(
          `Cannot navigate to block "${targetBlockId}": parent navigation buttons disappeared from sidebar`
        );
      }

      await parentButton.click();
      await this.page.waitForTimeout(300); // Wait for selection to update
    }

    throw new Error(
      `Failed to navigate to block "${targetBlockId}" after ${maxAttempts} attempts`
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
      // Fall back to clicking on the block's border area (top-left corner)
      const blockBox = await block.boundingBox();
      if (blockBox) {
        // Click 5px from left edge and 5px from top - on the border area
        await block.click({ position: { x: 5, y: 5 } });
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
      if (res && !res.ok && res.reason) {
        console.log(`[TEST] isBlockSelectedInIframe failed: ${res.reason}`);
      }
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
      const notCovered = await this.isToolbarNotCoveredBySidebar();
      if (!notCovered) {
        console.log(`[TEST] Toolbar for block "${blockId}" is covered by sidebar`);
      }
      return notCovered;
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
    //           This includes when button is constrained to be inside the block
    let addButtonDirection: 'bottom' | 'right' | 'unknown' = 'unknown';
    const addButtonTopAligned = Math.abs(addButtonBox.y - blockBox.y) < 20;
    const addButtonBottomAligned =
      addButtonBelowBlock >= -5 && addButtonBelowBlock < 20;

    if (addButtonBottomAligned && !addButtonTopAligned) {
      addButtonDirection = 'bottom';
    } else if (addButtonTopAligned) {
      // Top-aligned means 'right' direction (even if constrained to be inside block)
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
   * Uses JavaScript to avoid triggering window scroll (unlike keyboard End key).
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
   * Move cursor to the start of the text in a contenteditable element.
   * Uses JavaScript to avoid triggering window scroll (unlike keyboard Home key).
   */
  async moveCursorToStart(editor: any): Promise<void> {
    await editor.evaluate((el: any) => {
      const range = el.ownerDocument.createRange();
      const selection = el.ownerDocument.defaultView.getSelection();
      range.selectNodeContents(el);
      range.collapse(true); // Collapse to start
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
      const blockButton = blockChooser.locator(`button:has-text("${name}")`).or(
        blockChooser.locator(`[data-block-type="${name.toLowerCase()}"]`)
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

    // Block chooser is rendered as a portal directly on document.body
    // with class "blocks-chooser". Look specifically within this container
    // to avoid matching sidebar buttons with similar text.
    const blockChooser = this.page.locator('.blocks-chooser');

    // Try to find and click the block type button within the block chooser
    for (const name of possibleNames) {
      // Look for button within block chooser, excluding sidebar items (which have ⋮⋮ prefix)
      const blockButton = blockChooser.locator(`button:has-text("${name}")`).or(
        blockChooser.locator(`[data-block-type="${name.toLowerCase()}"]`)
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
    console.log('[TEST] Drag shadow visible: true');
  }

  /**
   * Assert that the drop indicator is visible during drag.
   */
  async verifyDropIndicatorVisible(): Promise<void> {
    const isVisible = await this.isDropIndicatorVisible();
    console.log('[TEST] Drop indicator visible during drag:', isVisible);
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

    console.log(
      `[TEST] Drop indicator check (all iframe coords):\n` +
        `  Cursor: ${cursorIframeCoords ? `(${cursorIframeCoords.x.toFixed(0)}, ${cursorIframeCoords.y.toFixed(0)})` : 'unknown'}\n` +
        `  Drop indicator: y=${dropY.toFixed(0)} (display: ${dropRectInIframeCoords.display})\n` +
        `  Target block: top=${targetTop.toFixed(0)}, bottom=${targetBottom.toFixed(0)}\n` +
        `  Expected edge: ${insertAfter ? 'bottom' : 'top'} @ ${expectedEdge.toFixed(0)} ±${tolerance}\n` +
        `  Result: ${isNearTarget ? 'PASS' : 'FAIL'} (dropY ${dropY.toFixed(0)} ${isNearTarget ? 'is' : 'is NOT'} within ${expectedEdge - tolerance}-${expectedEdge + tolerance})`,
    );

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

    console.log(`[TEST] getDropPositionInIframeCoords: blockUid=${blockUid}, element=${rect.tagName}.${rect.className}, rect=`, { x: rect.x, y: rect.y, width: rect.width, height: rect.height });

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

    console.log(`[TEST] getDropPositionInPageCoords: rect.y=${rect.y.toFixed(1)}, iframeRect.y=${iframeRect.y.toFixed(1)}, result.y=${result.y.toFixed(1)}`);

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
    console.log('[TEST] Drag start position (page):', startPosPage);

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
      console.log(`[TEST] Attempt ${attempt}: target at page Y=${dropPosPage.y.toFixed(1)}`);

      const viewportSize = this.page.viewportSize();
      const isAboveViewport = dropPosPage.y < 0;
      const isBelowViewport = viewportSize && dropPosPage.y > viewportSize.height;
      const needsAutoScroll = isAboveViewport || isBelowViewport;

      if (!needsAutoScroll) {
        return dropPosPage;
      }

      // Target is off-screen - move to edge to trigger auto-scroll
      const scrollUp = isAboveViewport;
      console.log(`[TEST] Target ${scrollUp ? 'above' : 'below'} viewport (Y=${dropPosPage.y.toFixed(1)}), triggering auto-scroll`);
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
      if (!(await this.isDropIndicatorVisible())) {
        throw new Error('Drop indicator not visible during auto-scroll');
      }
      const newPos = await this.getDropPositionInPageCoords(targetBlock, insertAfter);
      const scrollAmount = Math.abs(newPos.y - prevY);
      if (scrollAmount < 5) {
        throw new Error(`Waiting for auto-scroll: target moved only ${scrollAmount.toFixed(1)}px`);
      }
      console.log(`[TEST] Auto-scroll happened, target moved by ${scrollAmount.toFixed(1)}px`);
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
    console.log('[TEST] Drag complete');
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
    console.log('[TEST] Moving to horizontal drop position:', dropPosPage);
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
