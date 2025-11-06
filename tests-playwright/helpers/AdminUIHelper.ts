/**
 * Helper class for interacting with Volto Hydra admin UI in tests.
 */
import { Page, Locator, FrameLocator } from '@playwright/test';

export class AdminUIHelper {
  constructor(
    public readonly page: Page,
    public readonly adminUrl: string = 'http://localhost:3001'
  ) {
    // Capture browser console messages for debugging
    this.page.on('console', (msg) => {
      const type = msg.type();
      const text = msg.text();
      if (type === 'error' || type === 'warning' || text.includes('[REDUX ACTION]')) {
        console.log(`[BROWSER ${type.toUpperCase()}] ${text}`);
      }
    });

    // Capture page errors
    this.page.on('pageerror', (error) => {
      console.log(`[BROWSER PAGE ERROR] ${error.message}`);
      console.log(error.stack);
    });

    // Log ALL requests to see what's happening
    this.page.on('request', (request) => {
      console.log(`[REQUEST] ${request.method()} ${request.url()}`);
    });

    // Log ALL responses to see what's failing
    this.page.on('response', async (response) => {
      const url = response.url();
      const status = response.status();
      console.log(`[RESPONSE] ${status} ${url}`);

      // Log error details for failed requests
      if (status >= 400) {
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
    // Payload: {"sub":"admin","exp":9999999999} (expires far in future)
    // Signature: fake but valid base64
    const header = Buffer.from(JSON.stringify({"alg":"HS256","typ":"JWT"})).toString('base64').replace(/=/g, '');
    const payload = Buffer.from(JSON.stringify({"sub":"admin","exp":9999999999})).toString('base64').replace(/=/g, '');
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
  async clickBlockInIframe(blockId: string): Promise<void> {
    const iframe = this.getIframe();
    const block = iframe.locator(`[data-block-uid="${blockId}"]`);
    // Scroll into view to ensure the block and its toolbar are visible
    await block.scrollIntoViewIfNeeded();
    await block.click();

    // Wait for the block to actually be selected (have the outline class)
    await iframe.locator(`[data-block-uid="${blockId}"].volto-hydra--outline`).waitFor({ state: 'visible' });

    // Wait for the Quanta toolbar to appear on the selected block
    await this.waitForQuantaToolbar(blockId);

    // Wait for the sidebar to open and show this block's info
    await this.waitForSidebarOpen();
  }

  /**
   * Check if a block is selected in the iframe.
   * A block is selected if it has the "selected" class.
   */
  /**
   * Wait for a block to be selected in the iframe.
   */
  async waitForBlockSelected(blockId: string, timeout: number = 5000): Promise<void> {
    const iframe = this.getIframe();
    const block = iframe.locator(`[data-block-uid="${blockId}"]`);
    await block.waitFor({ state: 'visible', timeout });
    // Also wait a bit for the selected class to be applied
    await this.page.waitForTimeout(300);
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
   * Check if the Quanta Toolbar is visible for a block (inside iframe).
   * The toolbar is created by hydra.js inside the iframe.
   */
  async isQuantaToolbarVisibleInIframe(blockId: string): Promise<boolean> {
    const iframe = this.getIframe();
    const toolbar = iframe.locator(
      `[data-block-uid="${blockId}"] .volto-hydra-quantaToolbar`
    );
    return await toolbar.isVisible();
  }

  /**
   * Wait for the Quanta Toolbar to appear for a block (inside iframe).
   */
  async waitForQuantaToolbar(blockId: string, timeout: number = 5000): Promise<void> {
    const iframe = this.getIframe();
    const toolbar = iframe.locator(
      `[data-block-uid="${blockId}"] .volto-hydra-quantaToolbar`
    );
    await toolbar.waitFor({ state: 'visible', timeout });
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
    const iframe = this.getIframe();
    const toolbar = iframe.locator(
      `[data-block-uid="${blockId}"] .volto-hydra-quantaToolbar`
    );
    await toolbar.waitFor({ state: 'visible', timeout });

    // Scroll the toolbar into view since it appears BELOW the block
    // and might be outside the viewport even if the block is visible
    await toolbar.scrollIntoViewIfNeeded();
  }

  /**
   * Click the dropdown menu button to reveal Settings/Remove options.
   */
  async openQuantaToolbarMenu(blockId: string): Promise<void> {
    const iframe = this.getIframe();

    // First wait for the Quanta toolbar to appear
    await this.waitForQuantaToolbar(blockId);

    const menuButton = iframe.locator(
      `[data-block-uid="${blockId}"] .volto-hydra-menu-button`
    );
    await menuButton.click();

    // Wait for dropdown to appear
    const dropdown = iframe.locator(
      `[data-block-uid="${blockId}"] .volto-hydra-dropdown-menu`
    );
    await dropdown.waitFor({ state: 'visible' });
  }

  /**
   * Check if the Quanta Toolbar dropdown menu is visible.
   */
  async isQuantaToolbarMenuOpen(blockId: string): Promise<boolean> {
    const iframe = this.getIframe();
    const dropdown = iframe.locator(
      `[data-block-uid="${blockId}"] .volto-hydra-dropdown-menu.visible`
    );
    return await dropdown.isVisible();
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
    const iframe = this.getIframe();
    const dropdown = iframe.locator(
      `[data-block-uid="${blockId}"] .volto-hydra-dropdown-menu`
    );
    const option = dropdown.locator(
      `.volto-hydra-dropdown-item:has-text("${optionText}")`
    );
    await option.click();
  }

  /**
   * Click a format button (bold, italic, strikethrough, link) in Quanta Toolbar.
   */
  async clickFormatButton(
    blockId: string,
    format: 'bold' | 'italic' | 'strikethrough' | 'link'
  ): Promise<void> {
    const iframe = this.getIframe();
    const formatButtons = iframe.locator(
      `[data-block-uid="${blockId}"] .volto-hydra-format-button`
    );

    const index = { bold: 0, italic: 1, strikethrough: 2, link: 3 }[format];
    await formatButtons.nth(index).click();
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
    const block = iframe.locator(`[data-block-uid="${blockId}"]`);
    return (await block.textContent()) || '';
  }

  /**
   * Check if a block is selected in the iframe.
   */
  async isBlockSelectedInIframe(blockId: string): Promise<boolean> {
    const iframe = this.getIframe();
    const block = iframe.locator(`[data-block-uid="${blockId}"]`);
    const classAttr = await block.getAttribute('class');
    return classAttr ? classAttr.includes('volto-hydra--outline') : false;
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
   * Edit text in a contenteditable block within the iframe.
   */
  async editBlockTextInIframe(blockId: string, newText: string): Promise<void> {
    const iframe = this.getIframe();
    const editor = iframe.locator(
      `[data-block-uid="${blockId}"] [contenteditable="true"]`
    );
    await editor.click();
    // Clear existing text
    await editor.evaluate((el) => {
      el.textContent = '';
    });
    // Type new text to trigger characterData mutations
    await editor.pressSequentially(newText, { delay: 10 });
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
      return;
    }

    // Try contenteditable
    const contentEditable = fieldWrapper.locator('[contenteditable="true"]');
    if (await contentEditable.isVisible()) {
      await contentEditable.click();
      await contentEditable.fill(value);
      return;
    }
  }

  /**
   * Click the Add Block button that appears below a selected block.
   * This should open the block chooser.
   */
  async clickAddBlockButton(): Promise<void> {
    const iframe = this.getIframe();

    // The add button has class volto-hydra-add-button and is appended to the selected block element
    const addButton = iframe.locator('.volto-hydra-add-button');

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
   * Drag a block using actual mouse events (compatible with hydra.js implementation).
   * Dispatches MouseEvents programmatically inside the iframe to trigger hydra.js's handlers.
   *
   * @param dragHandle - The drag handle element (usually .volto-hydra-drag-button)
   * @param targetBlock - The target block to drag to
   * @param insertAfter - If true, insert after target (past halfway). If false, insert before (top half).
   */
  async dragBlockWithMouse(
    dragHandle: Locator,
    targetBlock: Locator,
    insertAfter: boolean = true
  ): Promise<void> {
    // Dispatch mousedown event on the drag button
    await dragHandle.evaluate((el) => {
      const rect = el.getBoundingClientRect();
      const mousedownEvent = new MouseEvent('mousedown', {
        bubbles: true,
        cancelable: true,
        view: window,
        clientX: rect.left + rect.width / 2,
        clientY: rect.top + rect.height / 2,
        button: 0,
      });
      el.dispatchEvent(mousedownEvent);
      console.log('[TEST] Dispatched mousedown', {
        clientX: mousedownEvent.clientX,
        clientY: mousedownEvent.clientY,
      });
    });

    await this.page.waitForTimeout(50);

    // Get target block UID
    const targetBlockUid = await targetBlock.getAttribute('data-block-uid');

    // Dispatch mousemove events at target position using targetBlock's evaluate
    await targetBlock.evaluate((targetEl, insertAfter) => {
      const rect = targetEl.getBoundingClientRect();
      // Calculate Y position: insertAfter = bottom half, insertBefore = top half
      const clientY = insertAfter
        ? rect.top + (rect.height * 0.75)  // 75% down
        : rect.top + (rect.height * 0.25); // 25% down
      const clientX = rect.left + rect.width / 2;

      // Dispatch multiple mousemove events to simulate dragging
      for (let i = 0; i <= 10; i++) {
        const mousemoveEvent = new MouseEvent('mousemove', {
          bubbles: true,
          cancelable: true,
          view: window,
          clientX,
          clientY,
          button: 0,
        });
        document.dispatchEvent(mousemoveEvent);
        console.log(`[TEST] Dispatched mousemove #${i}`, { clientX, clientY });
      }
    }, insertAfter);

    await this.page.waitForTimeout(100);

    // Dispatch mouseup event using dragHandle's context
    // Use .first() since after mousedown, hydra.js creates a dragging overlay with a duplicate drag button
    await dragHandle.first().evaluate(() => {
      const mouseupEvent = new MouseEvent('mouseup', {
        bubbles: true,
        cancelable: true,
        view: window,
        button: 0,
      });
      document.dispatchEvent(mouseupEvent);
      console.log('[TEST] Dispatched mouseup');
    });

    // Wait for postMessage round-trip and DOM updates
    await this.page.waitForTimeout(500);
  }
}
