/**
 * Integration tests for template edit mode.
 *
 * Template edit mode allows editing the template structure:
 * - Fixed/readonly blocks inside template become editable
 * - Blocks outside template become locked
 * - Fixed blocks can be moved (drag enabled)
 * - DnD out of template removes block from template
 * - DnD into template adds block to template
 * - Save validates template structure (no split slot groups)
 *
 * Note: Fixed template blocks get random UUIDs from template merge, so we find them by content.
 * User content blocks keep their original IDs from the page fixture.
 */
import { test, expect } from '../fixtures';
import { AdminUIHelper } from '../helpers/AdminUIHelper';
import { URLS } from '../ports';

// Content strings to find fixed template blocks (they have random UUIDs after merge)
const TEMPLATE_HEADER_CONTENT = 'Template Header - From Template';
const TEMPLATE_FOOTER_CONTENT = 'Template Footer - From Template';

// User content blocks keep their IDs from the page fixture
const USER_CONTENT_1 = 'user-content-1';
const USER_CONTENT_2 = 'user-content-2';
const STANDALONE_BLOCK_1 = 'standalone-block-1';
const STANDALONE_BLOCK_2 = 'standalone-block-2';


test.describe('Template Creation', () => {
  test('"Make Template" option appears in toolbar menu for regular blocks', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    // Click a regular block (not part of a template)
    await helper.clickBlockInIframe('block-1-uuid');
    await helper.waitForBlockSelectedInAdmin('block-1-uuid');

    // Open toolbar menu
    await helper.openQuantaToolbarMenu('block-1-uuid');
    const menuOptions = await helper.getQuantaToolbarMenuOptions('block-1-uuid');
    const optionLabels = menuOptions.map(o => o.toLowerCase());

    // Should have "Make Template" option
    expect(optionLabels.some(o => o.includes('make') && o.includes('template'))).toBe(true);
  });

  test('"Make Template" does NOT appear for blocks already in a template', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/template-test-page');

    // Click template header block (merged from template, has random UUID)
    // Content is "Template Header - From Template" after merge replaces stale content
    const headerBlockId = await helper.clickBlockByContent('Template Header - From Template');
    await helper.waitForBlockSelectedInAdmin(headerBlockId);

    // Open toolbar menu
    await helper.openQuantaToolbarMenu(headerBlockId);
    const menuOptions = await helper.getQuantaToolbarMenuOptions(headerBlockId);
    const optionLabels = menuOptions.map(o => o.toLowerCase());

    // Should NOT have "Make Template" option for blocks already in a template
    expect(optionLabels.some(o => o.includes('make') && o.includes('template'))).toBe(false);
  });

  test('clicking "Make Template" wraps block in template instance and shows settings', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    // Click a regular block
    await helper.clickBlockInIframe('block-1-uuid');
    await helper.waitForBlockSelectedInAdmin('block-1-uuid');

    // Open toolbar menu and click "Make Template"
    await helper.openQuantaToolbarMenu('block-1-uuid');
    const makeTemplateOption = page.locator('.volto-hydra-dropdown-menu .volto-hydra-dropdown-item')
      .filter({ hasText: /make.*template/i });
    await makeTemplateOption.click();

    // Wait for sidebar to update
    await helper.waitForSidebarOpen();

    // Block should now be inside a template instance
    // Sidebar should show hierarchy: Page > Template Instance > Block
    const stickyHeaders = page.locator('.sidebar-section-header.sticky-header');
    await expect(stickyHeaders).toHaveCount(3, { timeout: 5000 }); // Page > Template > Block
    await expect(stickyHeaders.nth(1)).toContainText(/Template:/i);

    // Should have a name/title field for the template visible in sidebar
    const nameField = page.locator('.field-wrapper-title, .field').filter({ hasText: /Template Name/i });
    await expect(nameField).toBeVisible({ timeout: 5000 });

    // Should also have save location field
    const locationField = page.locator('.field-wrapper-folder, .field').filter({ hasText: /Save Location/i });
    await expect(locationField).toBeVisible({ timeout: 5000 });
  });

  // Failing on purpose (TDD): when the user makes a block into a template
  // and saves the page, the new template document needs to be POSTed to
  // the API as a brand-new Document. Currently onMakeTemplate only stores
  // the template object in templateCacheRef and saveTemplatesRef does an
  // api.patch — which 404s on a real Plone backend because the document
  // doesn't exist yet. Plone (not the client) is what populates created /
  // modified / effective / UID timestamps, so a missing POST is also why
  // hand-crafted template fixtures end up with null timestamps.
  //
  // Expected behaviour: on save after make-template, a POST hits the
  // template's parent folder with @type:'Document' and the block payload.
  // The folder path comes from the sidebar's 'folder' field, NOT from a
  // hard-coded '/templates/' prefix in the bridge (so consumers can host
  // templates anywhere in the content tree).
  test('saving a page after Make Template POSTs a new template document', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/test-page');

    // Capture every POST that goes to the API while we save. Filter for
    // content-creation requests (body has @type) so we don't catch login,
    // search, etc.
    const contentPosts: Array<{ url: string; body: any }> = [];
    page.on('request', (req) => {
      if (req.method() !== 'POST') return;
      if (!req.url().startsWith(URLS.mockApi)) return;
      let body: any = null;
      try { body = req.postDataJSON(); } catch { /* not JSON */ }
      if (!body || !body['@type']) return;
      contentPosts.push({ url: req.url(), body });
    });

    // Make-template on a regular block.
    await helper.clickBlockInIframe('block-1-uuid');
    await helper.waitForBlockSelectedInAdmin('block-1-uuid');
    await helper.openQuantaToolbarMenu('block-1-uuid');
    const makeTemplateOption = page.locator('.volto-hydra-dropdown-menu .volto-hydra-dropdown-item')
      .filter({ hasText: /make.*template/i });
    await makeTemplateOption.click();
    await helper.waitForSidebarOpen();

    // Save. saveContent waits for redirect out of /edit so any POSTs
    // dispatched as part of the save will have been observed by then.
    await helper.saveContent();

    // EXPECTED: at least one POST whose body @type is Document — that's
    // the new template being created. Path is the parent folder; client
    // doesn't set timestamps (Plone fills those server-side).
    const templatePosts = contentPosts.filter((r) => r.body['@type'] === 'Document');
    expect(templatePosts.length,
      'expected the save flow to POST a new template document for the just-created template',
    ).toBeGreaterThanOrEqual(1);
    const tplPost = templatePosts[0];
    expect(tplPost.body.blocks, 'POSTed template should carry the source block in its blocks dict').toBeTruthy();
    expect(tplPost.body.blocks_layout?.items?.length,
      'POSTed template should have blocks_layout.items',
    ).toBeGreaterThan(0);
    // Path must not be hard-coded to /templates/ — it should reflect the
    // sidebar 'folder' field's value (default folder is fine here, just
    // not a baked-in literal in the bridge).
    expect(tplPost.url, 'template POST URL must come from the sidebar folder, not a hard-coded /templates/ literal')
      .not.toMatch(/\/templates\/$/);
  });

  // Failing on purpose (TDD): a template document is just a Document at
  // /templates/<name> whose blocks happen to have templateId/slotId set.
  // It should be openable + editable in the admin like any other page.
  // The save flow's existing `id !== currentPath` filter already covers
  // "don't recursively save the template's own page as a template", but
  // the LOAD path (View.jsx ~2751 + ~2936) calls getUniqueTemplateIds
  // without the same filter — after dropping the instanceId-equality
  // heuristic, that means navigating to a template page tries to fetch
  // and re-merge the template into itself, which breaks rendering /
  // selection of its own blocks.
  //
  // Expected behaviour: open /templates/test-layout in the editor → its
  // blocks render visibly, clicking one selects it (admin chrome appears).
  // Same as opening any non-template Document.
  test('a template page loads + edits like a normal page', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    await helper.login();
    await helper.navigateToEdit('/templates/test-layout');

    const iframe = helper.getIframe();

    // Block from the test-layout fixture. Identified by content (template
    // fixtures' own UUIDs are stable in this fixture but the test cares
    // about the rendered state, not the id, so use plaintext to find it).
    const { blockId: headerBlockId, locator: headerBlock } =
      await helper.waitForBlockByContent('Template Header - From Template');
    await expect(headerBlock).toBeVisible();

    // Click + verify admin reflects the selection (toolbar + outline
    // mounted over the block — i.e. the page is interactive, not stuck
    // mid-load or stuck in a template-expansion loop).
    await helper.clickBlockInIframe(headerBlockId);
    await helper.waitForBlockSelectedInAdmin(headerBlockId);
  });

  test.skip('template edit mode is automatically activated when creating template', async ({ page }) => {
    // Skipped: auto-activation feature not yet implemented
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/test-page');

    // Click a regular block and make it a template
    await helper.clickBlockInIframe('block-1-uuid');
    await helper.waitForBlockSelectedInAdmin('block-1-uuid');
    await helper.openQuantaToolbarMenu('block-1-uuid');
    const makeTemplateOption = page.locator('.volto-hydra-dropdown-menu .volto-hydra-dropdown-item')
      .filter({ hasText: /make.*template/i });
    await makeTemplateOption.click();

    // Template edit mode should be active (indicated by toggle in sidebar)
    await helper.waitForSidebarOpen();
    const editModeToggle = page.locator('.edit-template-toggle input, [data-field-id="editTemplate"] input');
    await expect(editModeToggle).toBeChecked({ timeout: 5000 });
  });

  test('can toggle template edit mode from sidebar', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/template-test-page');

    // Find template block IDs (fixed blocks have random UUIDs, user content keeps original IDs)
    const { blockId: headerBlockId } = await helper.waitForBlockByContent(TEMPLATE_HEADER_CONTENT);
    const { blockId: footerBlockId } = await helper.waitForBlockByContent(TEMPLATE_FOOTER_CONTENT);
    const templateBlockIds = [headerBlockId, USER_CONTENT_1, USER_CONTENT_2, footerBlockId];

    // Click template block
    await helper.clickBlockInIframe(headerBlockId);
    await helper.waitForSidebarOpen();

    // Navigate up to template instance
    await helper.escapeToParent();
    await helper.waitForBlockSelectedInAdmin(templateBlockIds);

    // Sidebar should have "Edit Template" toggle
    const editTemplateToggle = page.locator('.edit-template-toggle, [data-field-id="editTemplate"] input, label').filter({ hasText: /edit.*template/i });
    await expect(editTemplateToggle).toBeVisible();

    // Toggle edit mode on
    await editTemplateToggle.click();

    // Edit mode should be active - blocks outside template should be locked (greyed out)
    await helper.waitForBlockReadonly(STANDALONE_BLOCK_1);
  });
});

test.describe('Template Edit Mode - Editability', () => {
  test('fixed readonly blocks inside template become editable in edit mode', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/template-test-page');

    const iframe = helper.getIframe();

    // Find template block by content (fixed blocks have random UUIDs after merge)
    const { blockId: headerBlockId, locator: headerBlock } = await helper.waitForBlockByContent(TEMPLATE_HEADER_CONTENT);
    const { blockId: footerBlockId } = await helper.waitForBlockByContent(TEMPLATE_FOOTER_CONTENT);
    const templateBlockIds = [headerBlockId, USER_CONTENT_1, USER_CONTENT_2, footerBlockId];

    // Initially, the fixed template block should NOT be editable
    const editor = helper.getSlateField(headerBlock);
    let isEditable = await editor.getAttribute('contenteditable');
    expect(isEditable).not.toBe('true');

    // Enter template edit mode via sidebar
    await helper.clickBlockInIframe(headerBlockId);
    await helper.waitForSidebarOpen();

    // Navigate to template instance
    await helper.escapeToParent();
    await helper.waitForBlockSelectedInAdmin(templateBlockIds);

    // Toggle edit mode on
    const editToggle = page.locator('.field-wrapper-editTemplate label[for="field-editTemplate"]');
    await editToggle.click();
    // Wait for edit mode to activate (blocks outside template get locked)
    await helper.waitForBlockReadonly(STANDALONE_BLOCK_1);

    // Click the fixed block again
    await helper.clickBlockInIframe(headerBlockId);
    await helper.waitForBlockSelectedInAdmin(headerBlockId);

    // Now the fixed block should be editable
    isEditable = await editor.getAttribute('contenteditable');
    expect(isEditable).toBe('true');
  });

  test('fixed readonly blocks NESTED in a template container become editable in edit mode', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/template-test-page');

    // A grid cell is a fixed template block nested two levels deep
    // (grid -> cell), not a direct child of the instance — the flat unlock check
    // (templateInstanceId match) only covers direct children, so the cell stays
    // locked. Edit mode must walk the instance subtree and unlock it too.
    const { blockId: cellId, locator: cellBlock } = await helper.waitForBlockByContent('Template Grid Cell 1');

    // Initially the nested fixed block is NOT editable.
    const editor = helper.getSlateField(cellBlock);
    let isEditable = await editor.getAttribute('contenteditable');
    expect(isEditable).not.toBe('true');

    // Enter template edit mode via the instance.
    const { blockId: headerBlockId } = await helper.waitForBlockByContent(TEMPLATE_HEADER_CONTENT);
    await helper.clickBlockInIframe(headerBlockId);
    await helper.waitForSidebarOpen();
    await helper.escapeToParent();
    const editToggle = page.locator('.field-wrapper-editTemplate label[for="field-editTemplate"]');
    await editToggle.click();
    await helper.waitForBlockReadonly(STANDALONE_BLOCK_1);

    // The nested grid cell must now be editable — it belongs to the instance.
    await helper.clickBlockInIframe(cellId);
    await helper.waitForBlockSelectedInAdmin(cellId);
    isEditable = await editor.getAttribute('contenteditable');
    expect(isEditable).toBe('true');
  });

  test('a nested template block can be deleted in edit mode', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    const iframe = helper.getIframe();

    await helper.login();
    await helper.navigateToEdit('/template-test-page');

    const cellLocator = iframe.locator('[data-block-uid]').filter({ hasText: 'Template Grid Cell 1' });
    const { blockId: cellId } = await helper.waitForBlockByContent('Template Grid Cell 1');

    // Enter template edit mode via the instance.
    const { blockId: headerBlockId } = await helper.waitForBlockByContent(TEMPLATE_HEADER_CONTENT);
    await helper.clickBlockInIframe(headerBlockId);
    await helper.waitForSidebarOpen();
    await helper.escapeToParent();
    const editToggle = page.locator('.field-wrapper-editTemplate label[for="field-editTemplate"]');
    await editToggle.click();
    await helper.waitForBlockReadonly(STANDALONE_BLOCK_1);

    // Delete the nested cell. handleDelete filters out blocks isBlockReadonlyDeep
    // flags as readonly — this guards two fixes together: (1) the ancestry-aware
    // unlock (the flat templateInstanceId check treated the nested cell as
    // readonly), and (2) handleDelete depending on templateEditMode (a stale
    // listener closure otherwise saw edit mode as null and refused to mutate any
    // template block at all).
    await helper.clickBlockInIframe(cellId);
    await helper.waitForBlockSelectedInAdmin(cellId);
    await page.evaluate((id) => {
      document.dispatchEvent(new CustomEvent('hydra-delete-blocks', { detail: { blockIds: [id] } }));
    }, cellId);

    // The nested cell must be gone — it belongs to the edited instance.
    await expect(cellLocator).toHaveCount(0, { timeout: 5000 });
  });

  test('editing a template lets you add + remove children in a container (items region)', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/template-test-page');

    // Enter template edit mode via the instance.
    const { blockId: headerBlockId } = await helper.waitForBlockByContent(TEMPLATE_HEADER_CONTENT);
    await helper.clickBlockInIframe(headerBlockId);
    await helper.waitForSidebarOpen();
    await helper.escapeToParent();
    await page.locator('.field-wrapper-editTemplate label[for="field-editTemplate"]').click();
    await helper.waitForBlockReadonly(STANDALONE_BLOCK_1);

    // Select a grid cell, then escape up to the grid container.
    const { blockId: cellId } = await helper.waitForBlockByContent('Template Grid Cell 1');
    await helper.clickBlockInIframe(cellId);
    await helper.waitForBlockSelectedInAdmin(cellId);
    await helper.escapeToParent();

    // canAdd must resolve for the nested grid in edit mode — before recursive
    // stamping the cells had no instance id and the Add control never showed.
    // Assert against the iframe (render = source of truth, selection-independent).
    // The merged grid has ONE real cell (fixture's tpl-grid-cell-2 is a markerless
    // default the merge drops).
    const gridCells = helper.getIframe().locator('.grid-row > [data-block-uid]');
    await expect(gridCells).toHaveCount(1);

    // ADD a child to the nested container while editing the template.
    // (gridBlock allowedBlocks = ['teaser','image'].)
    await helper.addBlockViaSidebar('Blocks', 'Teaser');
    await expect(gridCells).toHaveCount(2);

    // REMOVE a child from the nested container while editing the template.
    await page.evaluate((id) => {
      document.dispatchEvent(new CustomEvent('hydra-delete-blocks', { detail: { blockIds: [id] } }));
    }, cellId);
    await expect(gridCells).toHaveCount(1);
  });

  test('blocks outside template become locked in edit mode', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/template-test-page');

    const iframe = helper.getIframe();

    // Find template block by content and wait for standalone block
    const { blockId: headerBlockId } = await helper.waitForBlockByContent(TEMPLATE_HEADER_CONTENT);
    await expect(iframe.locator(`[data-block-uid="${STANDALONE_BLOCK_1}"]`)).toBeVisible();

    // Initially, standalone block should be editable
    await helper.clickBlockInIframe(STANDALONE_BLOCK_1);
    await helper.waitForBlockSelectedInAdmin(STANDALONE_BLOCK_1);
    const standaloneEditor = helper.getSlateField(iframe.locator(`[data-block-uid="${STANDALONE_BLOCK_1}"]`));
    let isEditable = await standaloneEditor.getAttribute('contenteditable');
    expect(isEditable).toBe('true');

    // Enter template edit mode
    const { blockId: footerBlockId } = await helper.waitForBlockByContent(TEMPLATE_FOOTER_CONTENT);
    const templateBlockIds = [headerBlockId, USER_CONTENT_1, USER_CONTENT_2, footerBlockId];
    await helper.clickBlockInIframe(headerBlockId);
    await helper.waitForSidebarOpen();
    await helper.escapeToParent();
    await helper.waitForBlockSelectedInAdmin(templateBlockIds);

    const editToggle = page.locator('.field-wrapper-editTemplate label[for="field-editTemplate"]');
    await editToggle.click();
    // Wait for edit mode to activate (blocks outside template get locked)
    await helper.waitForBlockReadonly(STANDALONE_BLOCK_1);

    // Click standalone block (outside template)
    await helper.clickBlockInIframe(STANDALONE_BLOCK_1);

    // Standalone block should now be locked (not editable)
    isEditable = await standaloneEditor.getAttribute('contenteditable');
    expect(isEditable).not.toBe('true');
  });

  test('exiting edit mode re-locks fixed blocks and unlocks outside blocks', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/template-test-page');

    const iframe = helper.getIframe();

    // Find template blocks by content
    const { blockId: headerBlockId, locator: headerLocator } = await helper.waitForBlockByContent(TEMPLATE_HEADER_CONTENT);
    const { blockId: footerBlockId } = await helper.waitForBlockByContent(TEMPLATE_FOOTER_CONTENT);
    const templateBlockIds = [headerBlockId, USER_CONTENT_1, USER_CONTENT_2, footerBlockId];

    // Enter template edit mode
    await helper.clickBlockInIframe(headerBlockId);
    await helper.waitForSidebarOpen();
    await helper.escapeToParent();
    await helper.waitForBlockSelectedInAdmin(templateBlockIds);

    const editToggle = page.locator('.field-wrapper-editTemplate label[for="field-editTemplate"]');
    const editCheckbox = page.locator('#field-editTemplate');
    await editToggle.click();
    await expect(editCheckbox).toBeChecked();
    // Wait for edit mode to activate
    await helper.waitForBlockReadonly(STANDALONE_BLOCK_1);

    // Verify template block is editable
    await helper.clickBlockInIframe(headerBlockId);
    const templateEditor = helper.getSlateField(headerLocator);
    expect(await templateEditor.getAttribute('contenteditable')).toBe('true');

    // Exit edit mode
    await helper.escapeToParent();
    await helper.waitForBlockSelectedInAdmin(templateBlockIds);
    await editToggle.click();
    await expect(editCheckbox).not.toBeChecked();
    // Wait for edit mode to deactivate
    await helper.waitForBlockEditable(STANDALONE_BLOCK_1);

    // Template block should be locked again
    await helper.clickBlockInIframe(headerBlockId);
    expect(await templateEditor.getAttribute('contenteditable')).not.toBe('true');

    // Standalone block should be editable again
    await helper.clickBlockInIframe(STANDALONE_BLOCK_1);
    const standaloneEditor = helper.getSlateField(iframe.locator(`[data-block-uid="${STANDALONE_BLOCK_1}"]`));
    expect(await standaloneEditor.getAttribute('contenteditable')).toBe('true');
  });
});

test.describe('Template Edit Mode - Drag and Drop', () => {
  test('fixed blocks can be dragged in edit mode', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/template-test-page');

    // Find template blocks by content
    const { blockId: headerBlockId } = await helper.waitForBlockByContent(TEMPLATE_HEADER_CONTENT);
    const { blockId: footerBlockId } = await helper.waitForBlockByContent(TEMPLATE_FOOTER_CONTENT);
    const templateBlockIds = [headerBlockId, USER_CONTENT_1, USER_CONTENT_2, footerBlockId];

    // Enter template edit mode
    await helper.clickBlockInIframe(headerBlockId);
    await helper.waitForSidebarOpen();
    await helper.escapeToParent();
    await helper.waitForBlockSelectedInAdmin(templateBlockIds);

    const editToggle = page.locator('.field-wrapper-editTemplate label[for="field-editTemplate"]');
    await editToggle.click();
    // Wait for edit mode to activate
    await helper.waitForBlockReadonly(STANDALONE_BLOCK_1);

    // Select the fixed header block
    await helper.clickBlockInIframe(headerBlockId);
    await helper.waitForBlockSelectedInAdmin(headerBlockId);

    // In edit mode, fixed blocks should show drag handle (not lock icon)
    const toolbar = page.locator('.quanta-toolbar');
    const dragHandle = toolbar.locator('.drag-handle, [title*="drag"], [aria-label*="drag"]');
    await expect(dragHandle).toBeVisible();

    // Lock icon should NOT be visible
    const lockIcon = toolbar.locator('.lock-icon, [title*="lock"], [aria-label*="locked"]');
    await expect(lockIcon).not.toBeVisible();
  });

  test('dragging block out of template removes template fields', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/template-test-page');

    const iframe = helper.getIframe();

    // Find template blocks by content
    const { blockId: headerBlockId } = await helper.waitForBlockByContent(TEMPLATE_HEADER_CONTENT);
    const { blockId: footerBlockId } = await helper.waitForBlockByContent(TEMPLATE_FOOTER_CONTENT);
    const templateBlockIds = [headerBlockId, USER_CONTENT_1, USER_CONTENT_2, footerBlockId];

    // Enter template edit mode
    await expect(iframe.locator(`[data-block-uid="${USER_CONTENT_1}"]`)).toBeVisible({ timeout: 15000 });
    await helper.clickBlockInIframe(headerBlockId);
    await helper.waitForSidebarOpen();
    await helper.escapeToParent();
    await helper.waitForBlockSelectedInAdmin(templateBlockIds);

    const editToggle = page.locator('.field-wrapper-editTemplate label[for="field-editTemplate"]');
    await editToggle.click();
    await helper.waitForBlockReadonly(STANDALONE_BLOCK_1);

    // Verify user-content-1 is inside template (shows slotId field in sidebar)
    await helper.clickBlockInIframe(USER_CONTENT_1);
    await helper.waitForSidebarOpen();
    const slotIdFieldBefore = page.locator('.field-wrapper-slotId input');
    await expect(slotIdFieldBefore).toBeVisible({ timeout: 5000 });
    await helper.expectTemplateSettingsCount(1);

    // Drag user-content-1 outside the template (after standalone-block-1)
    await helper.dragBlockAfter(USER_CONTENT_1, STANDALONE_BLOCK_1);

    // Verify block moved - it should now be after standalone-block-1 (position 1 in DOM)
    const allBlocks = await iframe.locator('main [data-block-uid], #content [data-block-uid]').all();
    const blockIds = await Promise.all(allBlocks.map(b => b.getAttribute('data-block-uid')));
    const movedIndex = blockIds.indexOf(USER_CONTENT_1);
    const standaloneIndex = blockIds.indexOf(STANDALONE_BLOCK_1);
    expect(movedIndex).toBe(standaloneIndex + 1);

    // Verify block is now OUTSIDE template - it should be readonly in template edit mode
    // (blocks outside the template being edited are greyed out)
    await helper.waitForBlockReadonly(USER_CONTENT_1);

    // Exit template edit mode - click header to access the edit toggle
    await helper.clickBlockInIframe(headerBlockId);
    await helper.waitForSidebarOpen();
    const editCheckbox = page.locator('#field-editTemplate');
    await editToggle.click();
    await expect(editCheckbox).not.toBeChecked();
    await helper.waitForBlockEditable(STANDALONE_BLOCK_1);

    // Select the moved block - it should be editable now (template edit mode is off)
    await helper.clickBlockInIframe(USER_CONTENT_1);
    await helper.waitForSidebarOpen();

    // Block should be editable (not readonly)
    const editor = helper.getSlateField(iframe.locator(`[data-block-uid="${USER_CONTENT_1}"]`));
    const isEditable = await editor.getAttribute('contenteditable');
    expect(isEditable).toBe('true');

    // Placeholder field should NOT be visible (block is no longer in template)
    const slotIdFieldAfter = page.locator('.field-wrapper-slotId input');
    await expect(slotIdFieldAfter).not.toBeVisible();
  });

  test('moving slot block before first fixed block keeps it in template', async ({ page }) => {
    // Placeholders at template edges must be allowed - needed for layout switching
    // where content needs to be tracked even at edges
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/template-test-page');

    const iframe = helper.getIframe();

    // Find template blocks by content
    const { blockId: headerBlockId } = await helper.waitForBlockByContent(TEMPLATE_HEADER_CONTENT);
    const { blockId: footerBlockId } = await helper.waitForBlockByContent(TEMPLATE_FOOTER_CONTENT);
    const templateBlockIds = [headerBlockId, USER_CONTENT_1, USER_CONTENT_2, footerBlockId];

    // Enter template edit mode
    await expect(iframe.locator(`[data-block-uid="${USER_CONTENT_1}"]`)).toBeVisible({ timeout: 15000 });
    await helper.clickBlockInIframe(headerBlockId);
    await helper.waitForSidebarOpen();
    await helper.escapeToParent();
    await helper.waitForBlockSelectedInAdmin(templateBlockIds);

    const editToggle = page.locator('.field-wrapper-editTemplate label[for="field-editTemplate"]');
    await editToggle.click();
    await helper.waitForBlockReadonly(STANDALONE_BLOCK_1);

    // Move user-content-1 BEFORE the first fixed block (header)
    // This puts a slot block at the template edge
    await helper.clickBlockInIframe(USER_CONTENT_1);
    await helper.waitForSidebarOpen();
    const slotIdFieldBefore = page.locator('.field-wrapper-slotId input');
    await expect(slotIdFieldBefore).toBeVisible({ timeout: 5000 });

    await helper.dragBlockBefore(USER_CONTENT_1, headerBlockId);

    // Verify block moved - it should now be before header
    const allBlocks = await iframe.locator('main [data-block-uid], #content [data-block-uid]').all();
    const blockIds = await Promise.all(allBlocks.map(b => b.getAttribute('data-block-uid')));
    const movedIndex = blockIds.indexOf(USER_CONTENT_1);
    const headerIndex = blockIds.indexOf(headerBlockId);
    expect(movedIndex).toBeLessThan(headerIndex);

    // Verify block is still IN the template - it should still be editable in template edit mode
    // (blocks outside the template are readonly in edit mode)
    await helper.clickBlockInIframe(USER_CONTENT_1);
    await helper.waitForSidebarOpen();

    // Placeholder field should still be visible (block is still in template)
    const slotIdFieldAfter = page.locator('.field-wrapper-slotId input');
    await expect(slotIdFieldAfter).toBeVisible({ timeout: 5000 });
    await helper.expectTemplateSettingsCount(1);

    // Block should be editable (not readonly, since it's in the template being edited)
    const editor = helper.getSlateField(iframe.locator(`[data-block-uid="${USER_CONTENT_1}"]`));
    const isEditable = await editor.getAttribute('contenteditable');
    expect(isEditable).toBe('true');
  });

  test('dragging block into template adds template fields', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/template-test-page');

    const iframe = helper.getIframe();

    // Find template blocks by content
    const { blockId: headerBlockId } = await helper.waitForBlockByContent(TEMPLATE_HEADER_CONTENT);
    const { blockId: footerBlockId } = await helper.waitForBlockByContent(TEMPLATE_FOOTER_CONTENT);
    const templateBlockIds = [headerBlockId, USER_CONTENT_1, USER_CONTENT_2, footerBlockId];

    // Enter template edit mode
    await expect(iframe.locator(`[data-block-uid="${STANDALONE_BLOCK_1}"]`)).toBeVisible({ timeout: 15000 });
    await helper.clickBlockInIframe(headerBlockId);
    await helper.waitForSidebarOpen();
    await helper.escapeToParent();
    await helper.waitForBlockSelectedInAdmin(templateBlockIds);

    const editToggle = page.locator('.field-wrapper-editTemplate label[for="field-editTemplate"]');
    await editToggle.click();
    await helper.waitForBlockReadonly(STANDALONE_BLOCK_1);

    // Verify standalone-block-1 is NOT in template (no slotId field)
    // First exit template edit mode to check
    await helper.clickBlockInIframe(STANDALONE_BLOCK_1);
    await helper.waitForSidebarOpen();
    // Outside template blocks are locked in template edit mode, so no slotId field
    const slotIdFieldBefore = page.locator('.field-wrapper-slotId input');
    await expect(slotIdFieldBefore).not.toBeVisible();

    // Drag standalone-block-1 into the template (between slot blocks)
    await helper.dragBlockAfter(STANDALONE_BLOCK_1, USER_CONTENT_1);

    // Select the moved block
    await helper.clickBlockInIframe(STANDALONE_BLOCK_1);
    await helper.waitForSidebarOpen();

    // Block should now show slotId field (it's now in template)
    const slotIdFieldAfter = page.locator('.field-wrapper-slotId input');
    await expect(slotIdFieldAfter).toBeVisible({ timeout: 5000 });
    await helper.expectTemplateSettingsCount(1);

    // Block should be editable (since we're in template edit mode)
    const editor = helper.getSlateField(iframe.locator(`[data-block-uid="${STANDALONE_BLOCK_1}"]`));
    const isEditable = await editor.getAttribute('contenteditable');
    expect(isEditable).toBe('true');
  });

  test('block dragged into template inherits slotId from neighbors', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/template-test-page');

    const iframe = helper.getIframe();

    // Find template blocks by content
    const { blockId: headerBlockId } = await helper.waitForBlockByContent(TEMPLATE_HEADER_CONTENT);
    const { blockId: footerBlockId } = await helper.waitForBlockByContent(TEMPLATE_FOOTER_CONTENT);
    const templateBlockIds = [headerBlockId, USER_CONTENT_1, USER_CONTENT_2, footerBlockId];

    // Enter template edit mode
    await expect(iframe.locator(`[data-block-uid="${STANDALONE_BLOCK_1}"]`)).toBeVisible({ timeout: 15000 });
    await helper.clickBlockInIframe(headerBlockId);
    await helper.waitForSidebarOpen();
    await helper.escapeToParent();
    await helper.waitForBlockSelectedInAdmin(templateBlockIds);

    const editToggle = page.locator('.field-wrapper-editTemplate label[for="field-editTemplate"]');
    await editToggle.click();
    await helper.waitForBlockReadonly(STANDALONE_BLOCK_1);

    // First check what slotId value user-content-1 has (should be "primary")
    await helper.clickBlockInIframe(USER_CONTENT_1);
    await helper.waitForSidebarOpen();
    const neighborPlaceholder = page.locator('.field-wrapper-slotId input');
    const expectedPlaceholder = await neighborPlaceholder.inputValue();
    expect(expectedPlaceholder).toBe('primary');

    // Drag standalone block into template (between user-content-1 and user-content-2)
    await helper.dragBlockAfter(STANDALONE_BLOCK_1, USER_CONTENT_1);

    // Select the newly added block
    await helper.clickBlockInIframe(STANDALONE_BLOCK_1);
    await helper.waitForSidebarOpen();

    // Should show slotId field with inherited value from neighbors
    const slotIdInput = page.locator('.field-wrapper-slotId input');
    await expect(slotIdInput).toBeVisible({ timeout: 5000 });

    // The slotId should match the neighbors (all are "primary" in this region)
    const actualSlotId = await slotIdInput.inputValue();
    expect(actualSlotId).toBe(expectedPlaceholder);
  });
});

test.describe('Template Edit Mode - Validation', () => {
  test('non-contiguous slot groups prevent exit from edit mode', async ({ page }) => {
    // Rule: All blocks with the same slotId must be adjacent.
    // Having two separate groups with the same name is invalid.
    //
    // Valid:   [header] [content] [content] [footer]
    // Invalid: [header] [content] [footer] [content]  <- "content" is split

    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/template-test-page');

    const iframe = helper.getIframe();

    // Find template blocks by content
    const { blockId: headerBlockId } = await helper.waitForBlockByContent(TEMPLATE_HEADER_CONTENT);
    const { blockId: footerBlockId } = await helper.waitForBlockByContent(TEMPLATE_FOOTER_CONTENT);
    const templateBlockIds = [headerBlockId, USER_CONTENT_1, USER_CONTENT_2, footerBlockId];

    // Enter template edit mode
    await expect(iframe.locator(`[data-block-uid="${USER_CONTENT_1}"]`)).toBeVisible({ timeout: 15000 });
    await helper.clickBlockInIframe(headerBlockId);
    await helper.waitForSidebarOpen();
    await helper.escapeToParent();
    await helper.waitForBlockSelectedInAdmin(templateBlockIds);

    const editToggle = page.locator('.field-wrapper-editTemplate label[for="field-editTemplate"]');
    await editToggle.click();
    await helper.waitForBlockReadonly(STANDALONE_BLOCK_1);

    // Create invalid structure: move user-content-2 after footer
    // This splits the "primary" slot group:
    // Before: [header] [content-1] [content-2] [footer]  <- valid, "primary" blocks adjacent
    // After:  [header] [content-1] [footer] [content-2]  <- invalid, "primary" blocks separated
    await helper.dragBlockAfter(USER_CONTENT_2, footerBlockId);

    // Try to exit edit mode - should fail validation
    await helper.escapeToParent();
    await helper.waitForBlockSelectedInAdmin(templateBlockIds);

    // Click the label to try to exit (validation should prevent state change)
    await editToggle.click();

    // Should show validation error about non-contiguous slots (prevents exit)
    const errorMessage = page.locator('.toast-error, .Toastify__toast--error').filter({ hasText: /slot|contiguous|adjacent|position/i });
    await expect(errorMessage).toBeVisible({ timeout: 5000 });

    // Verify we're still in edit mode (checkbox should still be checked)
    const checkbox = page.locator('.field-wrapper-editTemplate input[type="checkbox"]');
    await expect(checkbox).toBeChecked();
    // Verify standalone block is still readonly (template edit mode still active)
    await helper.waitForBlockReadonly(STANDALONE_BLOCK_1);
  });

  test('adjacent slot groups without fixed block prevent exit from edit mode', async ({ page }) => {
    // Rule: Different slot groups must be separated by a fixed block.
    // Having two different slot groups adjacent is invalid.
    //
    // Valid:   [header-fixed] [primary] [primary] [footer-fixed]
    // Invalid: [header-fixed] [primary] [secondary] [footer-fixed]  <- no fixed block between groups

    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/template-test-page');

    const iframe = helper.getIframe();

    // Find template blocks by content
    const { blockId: headerBlockId } = await helper.waitForBlockByContent(TEMPLATE_HEADER_CONTENT);
    const { blockId: footerBlockId } = await helper.waitForBlockByContent(TEMPLATE_FOOTER_CONTENT);
    const templateBlockIds = [headerBlockId, USER_CONTENT_1, USER_CONTENT_2, footerBlockId];

    // Enter template edit mode
    await expect(iframe.locator(`[data-block-uid="${USER_CONTENT_1}"]`)).toBeVisible({ timeout: 15000 });
    await helper.clickBlockInIframe(headerBlockId);
    await helper.waitForSidebarOpen();
    await helper.escapeToParent();
    await helper.waitForBlockSelectedInAdmin(templateBlockIds);

    const editToggle = page.locator('.field-wrapper-editTemplate label[for="field-editTemplate"]');
    await editToggle.click();
    await helper.waitForBlockReadonly(STANDALONE_BLOCK_1);

    // Select user-content-2 and change its slotId to create a different group
    await helper.clickBlockInIframe(USER_CONTENT_2);
    await helper.waitForSidebarOpen();

    // Change slotId in sidebar from "primary" to "secondary"
    const slotIdField = page.locator('.field-wrapper-slotId input');
    await slotIdField.fill('secondary');

    // Try to exit edit mode - should fail validation
    await helper.escapeToParent();
    await helper.waitForBlockSelectedInAdmin(templateBlockIds);

    // Click the label to try to exit (validation should prevent state change)
    await editToggle.click();

    // Should show validation error about adjacent slot groups needing fixed block (prevents exit)
    const errorMessage = page.locator('.toast-error, .Toastify__toast--error').filter({ hasText: /slot|fixed|separated/i });
    await expect(errorMessage).toBeVisible({ timeout: 5000 });

    // Verify we're still in edit mode (checkbox should still be checked)
    const checkbox = page.locator('.field-wrapper-editTemplate input[type="checkbox"]');
    await expect(checkbox).toBeChecked();
    // Verify standalone block is still readonly (template edit mode still active)
    await helper.waitForBlockReadonly(STANDALONE_BLOCK_1);
  });

  test('saved template changes persist and appear on other pages using the template', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/template-test-page');

    const iframe = helper.getIframe();

    // Find template blocks by content
    const { blockId: headerBlockId, locator: headerLocator } = await helper.waitForBlockByContent(TEMPLATE_HEADER_CONTENT);
    const { blockId: footerBlockId } = await helper.waitForBlockByContent(TEMPLATE_FOOTER_CONTENT);
    const templateBlockIds = [headerBlockId, USER_CONTENT_1, USER_CONTENT_2, footerBlockId];

    // Enter template edit mode
    await helper.clickBlockInIframe(headerBlockId);
    await helper.waitForSidebarOpen();
    await helper.escapeToParent();
    await helper.waitForBlockSelectedInAdmin(templateBlockIds);

    const editToggle = page.locator('.field-wrapper-editTemplate label[for="field-editTemplate"]');
    await editToggle.click();
    await helper.waitForBlockReadonly(STANDALONE_BLOCK_1);

    // Make a valid change - edit template header content
    await helper.clickBlockInIframe(headerBlockId);
    const editor = helper.getSlateField(headerLocator);
    // Wait for contenteditable to be set (template edit mode makes fixed blocks editable)
    await expect(editor).toHaveAttribute('contenteditable', 'true', { timeout: 5000 });
    await editor.click();
    // Wait for element to be focused before typing
    await expect(editor).toBeFocused({ timeout: 2000 });
    await page.keyboard.press('End');
    await page.keyboard.type(' - edited');
    // Wait for text to appear - use fresh locator since text changed (stale locator won't match)
    const headerBlock = iframe.locator(`[data-block-uid="${headerBlockId}"]`);
    await expect(headerBlock).toContainText('edited', { timeout: 5000 });

    // Exit edit mode
    await helper.escapeToParent();
    await helper.waitForBlockSelectedInAdmin(templateBlockIds);
    // Click to exit template edit mode - waits for async flush before toggling
    await editToggle.click();
    const checkbox = page.locator('.field-wrapper-editTemplate input[type="checkbox"]');
    await expect(checkbox).not.toBeChecked({ timeout: 5000 });
    await helper.waitForBlockEditable(STANDALONE_BLOCK_1);

    // Save should succeed - wait for pencil icon (view mode) indicating save completed
    await page.keyboard.press('Control+s');
    const pencilIcon = page.locator('.toolbar-actions .edit, [aria-label="Edit"]');
    await expect(pencilIcon).toBeVisible({ timeout: 10000 });

    // Should NOT show validation error
    const errorMessage = page.locator('.toast-error, .validation-error, [role="alert"]').filter({ hasText: /slot|split|contiguous/i });
    await expect(errorMessage).not.toBeVisible();

    // Wait for iframe to refresh with new content (block count stabilizes after Nuxt re-renders)
    await helper.getStableBlockCount();

    // Content should be preserved in view mode - find by content since text and ID both changed
    const editedHeader = iframe.locator('main [data-block-uid], #content [data-block-uid]').filter({ hasText: 'edited' }).first();
    await expect(editedHeader).toBeVisible({ timeout: 15000 });

    // Verify template was actually saved by loading another page using the same template
    // Navigate to view mode (not edit) to also test that view mode loads templates
    await helper.navigateToView('/template-test-page-2');
    // Find header by content on page 2 as well
    const { locator: page2Header } = await helper.waitForBlockByContent('edited');
    await expect(page2Header).toContainText('edited', { timeout: 15000 });
  });

  test('saved NESTED template changes (a block inside a container) persist to other pages', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/template-test-page');

    const iframe = helper.getIframe();

    // A grid cell is nested inside the grid container (and inside a nested
    // "Template blocks" instance level) — not a direct child of the instance.
    // The top-level save test above only edits the header; the reverse merge that
    // captures edits back into the template must also walk into containers, or a
    // nested edit is silently dropped on save.
    const { blockId: headerBlockId } = await helper.waitForBlockByContent(TEMPLATE_HEADER_CONTENT);
    const { blockId: cellId, locator: cellLocator } = await helper.waitForBlockByContent('Template Grid Cell 1');

    // Enter template edit mode
    await helper.clickBlockInIframe(headerBlockId);
    await helper.waitForSidebarOpen();
    await helper.escapeToParent();
    const editToggle = page.locator('.field-wrapper-editTemplate label[for="field-editTemplate"]');
    await editToggle.click();
    await helper.waitForBlockReadonly(STANDALONE_BLOCK_1);

    // Edit the NESTED grid cell with a unique marker
    await helper.clickBlockInIframe(cellId);
    const editor = helper.getSlateField(cellLocator);
    await expect(editor).toHaveAttribute('contenteditable', 'true', { timeout: 5000 });
    await editor.click();
    await expect(editor).toBeFocused({ timeout: 2000 });
    await page.keyboard.press('End');
    await page.keyboard.type(' NESTEDSAVE');
    const cellBlock = iframe.locator(`[data-block-uid="${cellId}"]`);
    await expect(cellBlock).toContainText('NESTEDSAVE', { timeout: 5000 });

    // Exit edit mode
    await helper.escapeToParent();
    const editToggle2 = page.locator('.field-wrapper-editTemplate label[for="field-editTemplate"]');
    await editToggle2.click();
    const checkbox = page.locator('.field-wrapper-editTemplate input[type="checkbox"]');
    await expect(checkbox).not.toBeChecked({ timeout: 5000 });
    await helper.waitForBlockEditable(STANDALONE_BLOCK_1);

    // Save
    await page.keyboard.press('Control+s');
    const pencilIcon = page.locator('.toolbar-actions .edit, [aria-label="Edit"]');
    await expect(pencilIcon).toBeVisible({ timeout: 10000 });
    await helper.getStableBlockCount();

    // The nested edit must persist to another page using the same template.
    await helper.navigateToView('/template-test-page-2');
    const { locator: page2Cell } = await helper.waitForBlockByContent('NESTEDSAVE');
    await expect(page2Cell).toContainText('NESTEDSAVE', { timeout: 15000 });
  });
});

test.describe('Template Edit Mode - Block Settings', () => {
  test('can change block slotId in edit mode', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/template-test-page');

    const iframe = helper.getIframe();

    // Find template blocks by content
    const { blockId: headerBlockId } = await helper.waitForBlockByContent(TEMPLATE_HEADER_CONTENT);
    const { blockId: footerBlockId } = await helper.waitForBlockByContent(TEMPLATE_FOOTER_CONTENT);
    const templateBlockIds = [headerBlockId, USER_CONTENT_1, USER_CONTENT_2, footerBlockId];

    // Enter template edit mode
    await expect(iframe.locator(`[data-block-uid="${USER_CONTENT_1}"]`)).toBeVisible({ timeout: 15000 });
    await helper.clickBlockInIframe(headerBlockId);
    await helper.waitForSidebarOpen();
    await helper.escapeToParent();
    await helper.waitForBlockSelectedInAdmin(templateBlockIds);

    const editToggle = page.locator('.field-wrapper-editTemplate label[for="field-editTemplate"]');
    await editToggle.click();
    await helper.waitForBlockReadonly(STANDALONE_BLOCK_1);

    // Select a slot block
    await helper.clickBlockInIframe(USER_CONTENT_1);
    await helper.waitForSidebarOpen();

    // slotId input should be visible and have initial value from block data.
    const slotIdInput = page.locator('.field-wrapper-slotId input');
    await expect(slotIdInput).toHaveValue('primary', { timeout: 5000 });
    await helper.expectTemplateSettingsCount(1);

    // CRITICAL — wait for the sidebar form to STOP re-rendering before
    // typing. Just-asserting toHaveValue('primary') above only catches
    // the first poll where the value matches; Volto's TextWidget can
    // still be receiving Redux dispatches from schema-inheritance
    // recompute / template state churn for several hundred ms after.
    // If we start typing during that window the input unmounts and our
    // keystrokes go nowhere (or land on the next mount with leftover
    // text). Gate on N consecutive same-value polls of 'primary' before
    // touching it. (Cheap on the fast path: passes after ~300ms.)
    {
      let prev = '', stable = 0;
      await expect.poll(async () => {
        const v = await slotIdInput.inputValue();
        if (v === prev && v === 'primary') stable++;
        else { stable = 0; prev = v; }
        return stable >= 3;
      }, { timeout: 5000, intervals: [100, 150, 200] }).toBe(true);
    }

    // pressSequentially (NOT fill) on purpose. Volto's TextWidget is a
    // React controlled input whose value flows from Redux. fill() sets
    // the DOM `.value` directly and fires ONE 'input' event — React's
    // onChange may not dispatch the Redux update in time, and the next
    // render reads the stale value and reverts the DOM. Typing one char
    // at a time fires real keydown/keyup/input per char, React handles
    // each deterministically.
    await slotIdInput.press('ControlOrMeta+a');
    await slotIdInput.press('Backspace');
    await slotIdInput.pressSequentially('new-slot-name', { delay: 20 });

    // Stable-for-N-consecutive-polls gate: value must equal
    // 'new-slot-name' for 3 polls in a row. If a late re-render of the
    // sidebar form (from an iframe FORM_DATA echo or schema-inheritance
    // recompute) reverts the value, the counter resets and we keep
    // waiting; if Redux can't settle on the typed value at all the poll
    // times out, surfacing the bug rather than masking it.
    //
    // Generous timeout (10s) because admin-nuxt is markedly slower than
    // admin-mock — extra FORM_DATA echoes from the Nuxt iframe extend the
    // re-render churn window before the form quiets down.
    const seen: string[] = [];
    let prev = '';
    let stable = 0;
    try {
      await expect.poll(async () => {
        const v = await slotIdInput.inputValue();
        if (seen[seen.length - 1] !== v) seen.push(v);
        if (v === prev && v === 'new-slot-name') stable++;
        else { stable = 0; prev = v; }
        return stable >= 3;
      }, { timeout: 10000, intervals: [100, 150, 200] }).toBe(true);
    } catch (e) {
      throw new Error(`slotId never settled at "new-slot-name". Distinct values seen during poll: ${JSON.stringify(seen)} — last value: "${prev}"`);
    }
  });

  test('can toggle block fixed mode in edit mode', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/template-test-page');

    const iframe = helper.getIframe();

    // Find template blocks by content
    const { blockId: headerBlockId } = await helper.waitForBlockByContent(TEMPLATE_HEADER_CONTENT);
    const { blockId: footerBlockId } = await helper.waitForBlockByContent(TEMPLATE_FOOTER_CONTENT);
    const templateBlockIds = [headerBlockId, USER_CONTENT_1, USER_CONTENT_2, footerBlockId];

    // Enter template edit mode
    await expect(iframe.locator(`[data-block-uid="${USER_CONTENT_1}"]`)).toBeVisible({ timeout: 15000 });
    await helper.clickBlockInIframe(headerBlockId);
    await helper.waitForSidebarOpen();
    await helper.escapeToParent();
    await helper.waitForBlockSelectedInAdmin(templateBlockIds);

    const editToggle = page.locator('.field-wrapper-editTemplate label[for="field-editTemplate"]');
    await editToggle.click();
    await helper.waitForBlockReadonly(STANDALONE_BLOCK_1);

    // Select a slot block (not fixed)
    await helper.clickBlockInIframe(USER_CONTENT_1);
    await helper.waitForSidebarOpen();

    // Scroll sidebar to make Template Settings visible
    const sidebar = page.locator('#sidebar-template-settings');
    await sidebar.scrollIntoViewIfNeeded();

    // Fixed checkbox should be visible and toggleable
    const fixedLabel = page.locator('.field-wrapper-fixed label[for="field-fixed"]');
    const fixedCheckbox = page.locator('.field-wrapper-fixed input[type="checkbox"]');
    await expect(fixedLabel).toBeVisible({ timeout: 5000 });
    await helper.expectTemplateSettingsCount(1);

    const wasChecked = await fixedCheckbox.isChecked();
    await fixedLabel.click();

    // Verify checkbox state changed
    if (wasChecked) {
      await expect(fixedCheckbox).not.toBeChecked({ timeout: 5000 });
    } else {
      await expect(fixedCheckbox).toBeChecked({ timeout: 5000 });
    }
  });
});

test.describe('Template Edit Mode - Object List Items', () => {
  // Object_list items (e.g., slider slides) inside a fixed/readOnly template block
  // should inherit readOnly status — they can't be edited until template edit mode is on.
  //
  // Carousel slides: only the first slide is visible by default.
  // Use carousel next button (data-block-selector="+1") to navigate to subsequent slides.
  const SLIDER_BLOCK_ID = 'template-slider';
  const SLIDE_1_ID = 'tpl-slide-1';
  const SLIDE_2_ID = 'tpl-slide-2';

  test('object_list items inside readOnly template block are locked', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    const iframe = helper.getIframe();

    await helper.login();
    await helper.navigateToEdit('/template-test-page');
    await helper.getStableBlockCount();

    // Wait for slider container to be visible
    await expect(iframe.locator(`[data-block-uid="${SLIDER_BLOCK_ID}"]`)).toBeVisible({ timeout: 10000 });

    // Verify slides have hydra-locked class (readOnly from template)
    await helper.waitForBlockReadonly(SLIDE_1_ID);

    // Use carousel indicator to select slide 1 (slide itself may be hidden due to hydra-locked CSS)
    const slide1Indicator = iframe.locator(`[data-block-selector="${SLIDE_1_ID}"]`);
    await slide1Indicator.click();
    // hydra-locked breaks absolute positioning so toolbar position check fails — use sidebar instead
    await helper.waitForSidebarCurrentBlock('Slide');

    // Sidebar form should NOT have interactive inputs (readOnly slide)
    const sidebarInputs = page.locator('#sidebar-properties input:not([type="hidden"]), #sidebar-properties textarea, #sidebar-properties [contenteditable="true"]');
    await expect(sidebarInputs).toHaveCount(0, { timeout: 3000 });

    // Navigate to slide 2 via carousel next button and verify it's also locked
    const nextButton = iframe.locator('[data-block-selector="+1"]');
    await nextButton.click();
    await helper.waitForSidebarCurrentBlock('Slide');
    await helper.waitForBlockReadonly(SLIDE_2_ID);
  });

  test('readOnly parent block sidebar form should not be interactive', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    const iframe = helper.getIframe();

    await helper.login();
    await helper.navigateToEdit('/template-test-page');
    await helper.getStableBlockCount();

    // Wait for slider container to be visible
    await expect(iframe.locator(`[data-block-uid="${SLIDER_BLOCK_ID}"]`)).toBeVisible({ timeout: 10000 });

    // Use carousel indicator to select slide 1
    const slide1Indicator = iframe.locator(`[data-block-selector="${SLIDE_1_ID}"]`);
    await slide1Indicator.click();
    await helper.waitForSidebarCurrentBlock('Slide');

    // Navigate up to the parent slider block
    await helper.escapeToParent();
    await page.waitForTimeout(300);

    // The parent slider's sidebar form should NOT have interactive inputs
    // (the slider block is readOnly — its settings like autoplayEnabled should be disabled)
    const sidebarInputs = page.locator('#sidebar-properties input:not([type="hidden"]), #sidebar-properties textarea, #sidebar-properties [contenteditable="true"]');
    await expect(sidebarInputs).toHaveCount(0, { timeout: 3000 });
  });

  test('object_list items become editable in template edit mode', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    const iframe = helper.getIframe();

    await helper.login();
    await helper.navigateToEdit('/template-test-page');
    await helper.getStableBlockCount();

    const { blockId: headerBlockId } = await helper.waitForBlockByContent(TEMPLATE_HEADER_CONTENT);
    const { blockId: footerBlockId } = await helper.waitForBlockByContent(TEMPLATE_FOOTER_CONTENT);
    const templateBlockIds = [headerBlockId, USER_CONTENT_1, USER_CONTENT_2, footerBlockId];

    // Initially locked
    await helper.waitForBlockReadonly(SLIDE_1_ID);

    // Enter template edit mode via the header block
    await helper.clickBlockInIframe(headerBlockId);
    await helper.waitForSidebarOpen();
    await helper.escapeToParent();
    await helper.waitForBlockSelectedInAdmin(templateBlockIds);

    const editToggle = page.locator('.field-wrapper-editTemplate label[for="field-editTemplate"]');
    await expect(editToggle).toBeVisible({ timeout: 10000 });
    await editToggle.click();

    // Wait for template edit mode to activate
    await helper.waitForBlockReadonly(STANDALONE_BLOCK_1);

    // Now the first slide should be editable (no longer locked)
    await helper.waitForBlockEditable(SLIDE_1_ID);

    // Select slide 1 via carousel indicator — sidebar form should now have interactive inputs
    const slide1Indicator = iframe.locator(`[data-block-selector="${SLIDE_1_ID}"]`);
    await slide1Indicator.click();
    await helper.waitForSidebarCurrentBlock('Slide');
    const sidebarInputs = page.locator('#sidebar-properties input:not([type="hidden"]), #sidebar-properties textarea, #sidebar-properties [contenteditable="true"]');
    await expect(sidebarInputs.first()).toBeVisible({ timeout: 5000 });

    // Object_list items should NOT show their own TEMPLATE SETTINGS —
    // only the parent block's template settings should appear
    await helper.expectTemplateSettingsCount(1);

    // Navigate to slide 2 and verify it's also editable
    const nextButton = iframe.locator('[data-block-selector="+1"]');
    await nextButton.click();
    await helper.waitForSidebarCurrentBlock('Slide');
    await helper.waitForBlockEditable(SLIDE_2_ID);
  });

  test('new object_list item added in template edit mode inherits template settings', async ({ page }) => {
    const helper = new AdminUIHelper(page);
    const iframe = helper.getIframe();

    await helper.login();
    await helper.navigateToEdit('/template-test-page');
    await helper.getStableBlockCount();

    // Find template blocks and enter template edit mode
    const { blockId: headerBlockId } = await helper.waitForBlockByContent(TEMPLATE_HEADER_CONTENT);
    const { blockId: footerBlockId } = await helper.waitForBlockByContent(TEMPLATE_FOOTER_CONTENT);
    const templateBlockIds = [headerBlockId, USER_CONTENT_1, USER_CONTENT_2, footerBlockId];

    await helper.clickBlockInIframe(headerBlockId);
    await helper.waitForSidebarOpen();
    await helper.escapeToParent();
    await helper.waitForBlockSelectedInAdmin(templateBlockIds);

    const editToggle = page.locator('.field-wrapper-editTemplate label[for="field-editTemplate"]');
    await expect(editToggle).toBeVisible({ timeout: 10000 });
    await editToggle.click();
    await helper.waitForBlockReadonly(STANDALONE_BLOCK_1);

    // Select slide 1 via carousel indicator, then click the [+] to add a new slide
    await helper.waitForBlockEditable(SLIDE_1_ID);
    const slide1Indicator = iframe.locator(`[data-block-selector="${SLIDE_1_ID}"]`);
    await slide1Indicator.click();
    await helper.waitForSidebarCurrentBlock('Slide');
    await helper.clickAddBlockButton();

    // Wait for the new slide to be selected
    await helper.waitForSidebarCurrentBlock('Slide');

    // The new slide should be editable (we're in template edit mode)
    const sidebarInputs = page.locator('#sidebar-properties input:not([type="hidden"]), #sidebar-properties textarea, #sidebar-properties [contenteditable="true"]');
    await expect(sidebarInputs.first()).toBeVisible({ timeout: 5000 });

    // The new slide should inherit template settings from its neighbor (fixed, readOnly)
    // so it should have a template settings section with fixed=true
    await helper.expectTemplateSettingsCount(1);
    const fixedCheckbox = page.locator('#sidebar-template-settings .field-wrapper-fixed input[type="checkbox"]');
    await expect(fixedCheckbox).toBeChecked({ timeout: 5000 });

    // The iframe [+] add button should still be visible on the new slide
    const addButton = page.locator('.volto-hydra-add-button');
    await expect(addButton).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Template Edit Mode - UI Restrictions', () => {
  test('readonly blocks should not show format buttons in toolbar', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/template-test-page');

    // Find template header by content (has random UUID after merge)
    const headerBlockId = await helper.clickBlockByContent(TEMPLATE_HEADER_CONTENT);
    await helper.waitForBlockSelectedInAdmin(headerBlockId);

    // Format buttons (bold, italic, etc.) should NOT be visible
    const toolbar = page.locator('.quanta-toolbar');
    const formatButtons = toolbar.locator('[data-toolbar-button]');
    await expect(formatButtons).toHaveCount(0);
  });

  test('readonly blocks should not show media field overlay', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/template-test-page');

    // Find template header by content (has random UUID after merge)
    const headerBlockId = await helper.clickBlockByContent(TEMPLATE_HEADER_CONTENT);
    await helper.waitForBlockSelectedInAdmin(headerBlockId);

    // Media overlay (X button to clear image) should NOT be visible
    const mediaOverlay = page.locator('.empty-image-overlay, button[title="Clear image"]');
    await expect(mediaOverlay).toHaveCount(0);
  });

  test('readonly blocks should not show link/media buttons in toolbar', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/template-test-page');

    // Find template header by content (has random UUID after merge)
    const headerBlockId = await helper.clickBlockByContent(TEMPLATE_HEADER_CONTENT);
    await helper.waitForBlockSelectedInAdmin(headerBlockId);

    // Link and media field buttons should NOT be visible
    const toolbar = page.locator('.quanta-toolbar');
    const linkButton = toolbar.locator('button[title*="link" i]');
    const mediaButton = toolbar.locator('button[title*="image" i]');
    await expect(linkButton).toHaveCount(0);
    await expect(mediaButton).toHaveCount(0);
  });

  test('readonly block sidebar form should not be interactive', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/template-test-page');

    // Find and click readonly template header block
    const headerBlockId = await helper.clickBlockByContent(TEMPLATE_HEADER_CONTENT);
    await helper.waitForSidebarOpen();

    // Sidebar form should not have interactive inputs (readonly block)
    const sidebarInputs = page.locator('#sidebar-properties input:not([type="hidden"]), #sidebar-properties textarea, #sidebar-properties [contenteditable="true"]');
    await expect(sidebarInputs).toHaveCount(0, { timeout: 3000 });
  });

  test('readonly block sidebar form becomes interactive in template edit mode', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/template-test-page');

    const { blockId: headerBlockId } = await helper.waitForBlockByContent(TEMPLATE_HEADER_CONTENT);
    const { blockId: footerBlockId } = await helper.waitForBlockByContent(TEMPLATE_FOOTER_CONTENT);
    const templateBlockIds = [headerBlockId, USER_CONTENT_1, USER_CONTENT_2, footerBlockId];

    // Enter template edit mode
    await helper.clickBlockInIframe(headerBlockId);
    await helper.waitForSidebarOpen();
    await helper.escapeToParent();
    await helper.waitForBlockSelectedInAdmin(templateBlockIds);

    const editToggle = page.locator('.field-wrapper-editTemplate label[for="field-editTemplate"]');
    await editToggle.click();
    await helper.waitForBlockReadonly(STANDALONE_BLOCK_1);

    // Click header block again — now in template edit mode
    await helper.clickBlockInIframe(headerBlockId);
    await helper.waitForSidebarOpen();

    // Sidebar form should now have interactive inputs
    const sidebarInputs = page.locator('#sidebar-properties input:not([type="hidden"]), #sidebar-properties textarea, #sidebar-properties [contenteditable="true"]');
    await expect(sidebarInputs.first()).toBeVisible({ timeout: 5000 });
  });

  test('fixed blocks should not show Remove option in dropdown menu', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/template-test-page');

    // Find template header by content (has random UUID after merge)
    const headerBlockId = await helper.clickBlockByContent(TEMPLATE_HEADER_CONTENT);
    await helper.waitForBlockSelectedInAdmin(headerBlockId);
    await helper.waitForSidebarOpen();

    // Open the dropdown menu (scroll to it first as it may be below the fold)
    const menuButton = page.locator('.parent-block-section .menu-trigger').last();
    await menuButton.scrollIntoViewIfNeeded();
    await menuButton.click();
    // Wait for menu to appear
    const menu = page.locator('.volto-hydra-dropdown-menu');
    await expect(menu).toBeVisible({ timeout: 5000 });

    // Remove option should NOT be visible
    const removeOption = menu.locator('.volto-hydra-dropdown-item').filter({ hasText: /Remove/i });
    await expect(removeOption).toHaveCount(0);
  });

  test('fixed blocks should not show Make Template option in dropdown menu', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/template-test-page');

    // Find template header by content (has random UUID after merge)
    const headerBlockId = await helper.clickBlockByContent(TEMPLATE_HEADER_CONTENT);
    await helper.waitForBlockSelectedInAdmin(headerBlockId);
    await helper.waitForSidebarOpen();

    // Open the dropdown menu (scroll to it first as it may be below the fold)
    const menuButton = page.locator('.parent-block-section .menu-trigger').last();
    await menuButton.scrollIntoViewIfNeeded();
    await menuButton.click();
    // Wait for menu to appear
    const menu = page.locator('.volto-hydra-dropdown-menu');
    await expect(menu).toBeVisible({ timeout: 5000 });

    // Make Template option should NOT be visible for fixed blocks
    const makeTemplateOption = menu.locator('.volto-hydra-dropdown-item').filter({ hasText: /Make Template/i });
    await expect(makeTemplateOption).toHaveCount(0);
  });

  test('readonly blocks should not show Convert to option in dropdown menu', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/template-test-page');

    // Find template header by content (has random UUID after merge)
    const headerBlockId = await helper.clickBlockByContent(TEMPLATE_HEADER_CONTENT);
    await helper.waitForBlockSelectedInAdmin(headerBlockId);
    await helper.waitForSidebarOpen();

    // Open the dropdown menu (scroll to it first as it may be below the fold)
    const menuButton = page.locator('.parent-block-section .menu-trigger').last();
    await menuButton.scrollIntoViewIfNeeded();
    await menuButton.click();
    // Wait for menu to appear
    const menu = page.locator('.volto-hydra-dropdown-menu');
    await expect(menu).toBeVisible({ timeout: 5000 });

    // Convert to option should NOT be visible for readonly blocks
    const convertOption = menu.locator('.volto-hydra-dropdown-item').filter({ hasText: /Convert to/i });
    await expect(convertOption).toHaveCount(0);
  });

  test('cannot add blocks outside template in template edit mode', async ({ page }) => {
    const helper = new AdminUIHelper(page);

    await helper.login();
    await helper.navigateToEdit('/template-test-page');

    // Find template blocks by content
    const { blockId: headerBlockId } = await helper.waitForBlockByContent(TEMPLATE_HEADER_CONTENT);
    const { blockId: footerBlockId } = await helper.waitForBlockByContent(TEMPLATE_FOOTER_CONTENT);
    const templateBlockIds = [headerBlockId, USER_CONTENT_1, USER_CONTENT_2, footerBlockId];

    // Enter template edit mode
    await helper.clickBlockInIframe(headerBlockId);
    await helper.waitForSidebarOpen();
    await helper.escapeToParent();
    await helper.waitForBlockSelectedInAdmin(templateBlockIds);

    // Click the label instead of the hidden checkbox input
    const editToggleLabel = page.locator('label[for="field-editTemplate"]');
    await editToggleLabel.click();
    await helper.waitForBlockReadonly(STANDALONE_BLOCK_1);

    // Click a block outside the template
    await helper.clickBlockInIframe(STANDALONE_BLOCK_1);
    await helper.waitForBlockSelectedInAdmin(STANDALONE_BLOCK_1);

    // Add button should NOT be visible for blocks outside the template
    const addButton = page.locator('button[title*="Add block"]');
    await expect(addButton).toHaveCount(0);
  });
});
