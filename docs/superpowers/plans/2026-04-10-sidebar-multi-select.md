# Unified Selection Mode Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unify selection mode across iframe and sidebar. One mode, entered from either place, shows checkboxes in both. Sidebar ChildBlocksWidget displays selected blocks in context — highlighting siblings, or showing a filtered path view when selection spans containers. Replace the current `multi-select-summary` div with ChildBlocksWidget-based display.

**Architecture:** Selection mode is one shared state. Entering it (via long press in iframe, or Ctrl/Shift+Click in sidebar) puts both views into selection mode. The iframe shows checkbox overlays on ALL visible blocks (not just siblings). The sidebar ChildBlocksWidget shows checkboxes on its block items. Navigation in the sidebar still works (clicking navigates, checkboxes toggle selection). An exit button (X with count badge, already on left toolbar) exits mode. The `selectionMode` boolean lives in View.jsx state; `multiSelected` in Redux is the source of truth for what's checked.

**Tech Stack:** React, Redux (`setUIState`), Playwright integration tests, `getCommonAncestor` from `blockPath.js`

---

## Current State (what exists)

- **Iframe selection mode**: Long press → checkboxes on siblings only (`_selectionModeBlockUids` = siblings). Click handler intercepts clicks and toggles. Scroll handler re-sends rects.
- **Sidebar Ctrl/Shift+Click**: ChildBlocksWidget has handlers that toggle `multiSelected` in Redux. But no checkboxes, no visual highlighting.
- **Sidebar multi-select display**: ParentBlocksWidget replaces entire sidebar with flat `multi-select-summary` div (no context, no paths).
- **Exit**: Left toolbar X button with count badge sends `EXIT_SELECTION_MODE`.

## Target State

- **Entering selection mode**: Long press on iframe OR Ctrl+Click on sidebar ChildBlocksWidget item → enters selection mode. Iframe shows checkbox overlays on ALL visible blocks. Sidebar shows checkboxes on ChildBlocksWidget items.
- **In selection mode**:
  - **Iframe**: clicks on blocks toggle them (no single-block outline/toolbar). Navigation via sidebar still works.
  - **Sidebar**: clicking an item's body toggles its checkbox. Clicking the `>` arrow navigates into that block's children (view only — iframe does NOT highlight the block as selected). Back arrow navigates up. Selected items visually highlighted.
  - Normal single-block selection visualization (outline, toolbar) is suppressed — only multi-select checkboxes show.
- **Sidebar display during selection mode**:
  - **Siblings selected**: ChildBlocksWidget stays in place, selected items highlighted, "N selected" bar at bottom.
  - **Cross-container**: Sidebar navigates to common ancestor. ChildBlocksWidget shows filtered view — only selected descendant blocks with paths from ancestor.
- **One mode**: Entering from either iframe or sidebar activates both. Exiting clears both.
- **Exit**: X button on left toolbar, or untick all → auto-exit. Exiting returns to normal mode with one block selected (the last-tapped / first in multiSelected).

---

## Key Design Decisions

1. **`_selectionModeBlockUids` changes meaning**: Currently stores siblings for checkbox positioning. New: stores ALL visible block UIDs in iframe (or null when not in selection mode). Checkboxes render for all of them.
2. **Sidebar doesn't need `selectionModeRects`**: Sidebar checkboxes are inline in the block list items, not positioned overlays. Only iframe needs rect-based positioning.
3. **ChildBlocksWidget gets a `selectionMode` prop**: When true, show checkboxes and highlight selected items. Normal click still navigates.
4. **ParentBlocksWidget detects sibling vs cross-container**: Uses `getCommonAncestor`. Siblings → normal ChildBlocksWidget with highlights. Cross-container → navigate to ancestor, ChildBlocksWidget in filtered mode.
5. **Entering selection mode from sidebar**: Ctrl/Shift+Click dispatches `setUIState({ multiSelected: [...] })` AND sets `selectionMode` in View.jsx AND sends message to iframe to enter selection mode.

---

### Task 0: Validate baseline — commit Form.jsx and Item.jsx cleanup

**Files:**
- Verify: `packages/volto-hydra/src/customizations/volto/components/manage/Form/Form.jsx`
- Verify: `packages/volto-hydra/src/customizations/volto/components/manage/Blocks/Block/Order/Item.jsx`

These changes were already made. Validate before building on top.

- [ ] **Step 1: Run full block-selection test suite**

Run: `pnpm exec playwright test tests-playwright/integration/block-selection.spec.ts --project=admin-mock`
Expected: All pass (or document which fail and why)

- [ ] **Step 2: Commit if changes exist**

```bash
git add packages/volto-hydra/src/customizations/volto/components/manage/Form/Form.jsx \
       packages/volto-hydra/src/customizations/volto/components/manage/Blocks/Block/Order/Item.jsx
git commit -m "Remove dead blocks_layout multi-select from Form.jsx, fix Item.jsx Ctrl+Click"
```

---

### Task 1: Iframe checkboxes on ALL visible blocks (not just siblings)

**Files:**
- Modify: `packages/hydra-js/hydra.src.js:2220-2243` (`_enterSelectionMode`)
- Modify: `packages/hydra-js/hydra.src.js:8200-8209` (scroll handler `selectionModeRects`)
- Test: `tests-playwright/integration/block-selection.spec.ts`

Currently `_enterSelectionMode` only includes siblings. Change it to include all blocks with `[data-block-uid]` in the iframe.

- [ ] **Step 1: Write failing test — checkboxes appear on non-sibling blocks**

```typescript
test('Selection mode shows checkboxes on blocks outside current container', async ({ page }) => {
  const helper = new AdminUIHelper(page);
  await helper.login();
  await helper.navigateToEdit('/container-test-page');

  // Click text-1a (inside col-1), enter selection mode via long press
  await helper.clickBlockInIframe('text-1a');
  await helper.waitForBlockSelected('text-1a');
  await helper.longPressBlock('text-1a');

  // Checkbox should appear on text-after (page-level, different container)
  const textAfterCheckbox = page.locator('.volto-hydra-selection-checkbox[data-block-uid="text-after"]');
  await expect(textAfterCheckbox).toBeVisible({ timeout: 5000 });
});
```

- [ ] **Step 2: Run test to verify it fails**

Expected: FAIL — checkbox only appears on siblings (text-1a, text-1b)

- [ ] **Step 3: Change `_enterSelectionMode` to include all visible blocks**

In `hydra.src.js`, replace the siblings-only logic:

```javascript
_enterSelectionMode(blockUid) {
  // Get ALL blocks with [data-block-uid] in the iframe
  const allBlockElements = document.querySelectorAll('[data-block-uid]');
  const allBlockUids = [];
  const allBlockRects = {};
  for (const el of allBlockElements) {
    const uid = el.getAttribute('data-block-uid');
    // Skip nested duplicates — only use the outermost for each UID
    if (allBlockUids.includes(uid)) continue;
    allBlockUids.push(uid);
    const r = el.getBoundingClientRect();
    allBlockRects[uid] = { top: r.top, left: r.left, width: r.width, height: r.height };
  }

  this._selectionModeBlockUids = allBlockUids;

  this.sendMessageToParent({
    type: 'ENTER_SELECTION_MODE',
    blockUid,
    allBlockRects,
  });
}
```

Also update the scroll handler to re-query ALL blocks (not just `_selectionModeBlockUids`) for rects, since blocks may have scrolled in/out of view.

- [ ] **Step 4: Run test to verify it passes**

- [ ] **Step 5: Commit**

```bash
git add packages/hydra-js/hydra.src.js tests-playwright/integration/block-selection.spec.ts
git commit -m "Selection mode: checkboxes on all visible blocks, not just siblings"
```

---

### Task 2: ChildBlocksWidget highlighting and summary bar

**Files:**
- Modify: `packages/volto-hydra/src/components/Sidebar/ChildBlocksWidget.jsx:255-300`
- Test: `tests-playwright/integration/block-selection.spec.ts`

- [ ] **Step 1: Write failing test — sidebar items highlighted during multi-select**

```typescript
test('Multi-selected blocks are highlighted in sidebar ChildBlocksWidget', async ({ page }) => {
  const helper = new AdminUIHelper(page);
  await helper.login();
  await helper.navigateToEdit('/container-test-page');

  // Select text-1a, escape to col-1 level
  await helper.clickBlockInIframe('text-1a');
  await helper.waitForBlockSelected('text-1a');
  await helper.escapeToParent();
  await helper.waitForBlockSelected('col-1');

  // ChildBlocksWidget visible with col-1's children
  const blockList = page.locator('.child-blocks-widget');
  await expect(blockList).toBeVisible({ timeout: 5000 });

  // Ctrl+Click first item
  await blockList.locator('.child-block-item').first().click({ modifiers: ['ControlOrMeta'] });
  // Ctrl+Click second item
  await blockList.locator('.child-block-item').last().click({ modifiers: ['ControlOrMeta'] });

  // Items should be highlighted
  await expect(blockList.locator('.child-block-item.selected')).toHaveCount(2, { timeout: 5000 });

  // Summary bar at bottom
  await expect(blockList.locator('.multi-select-bar')).toContainText('2 selected');
});
```

- [ ] **Step 2: Run test to verify it fails**

- [ ] **Step 3: Add `.selected` class and summary bar**

In ChildBlocksWidget, update child-block-item:
```jsx
className={`child-block-item${multiSelected.includes(child.id) ? ' selected' : ''}`}
style={{ ...(multiSelected.includes(child.id) ? { background: '#e8f4fd' } : {}) }}
```

Add summary bar after DragDropList:
```jsx
{(() => {
  const count = multiSelected.filter(uid => childBlocks.some(c => c.id === uid)).length;
  return count > 0 ? (
    <div className="multi-select-bar" style={{
      padding: '6px 12px', background: '#e8f4fd',
      borderTop: '1px solid #007eb1', fontSize: '13px',
      fontWeight: 'bold', color: '#007eb1',
    }}>
      {count} selected
    </div>
  ) : null;
})()}
```

- [ ] **Step 4: Run test to verify it passes**

- [ ] **Step 5: Commit**

---

### Task 3: Sidebar enters selection mode (syncs with iframe)

**Files:**
- Modify: `packages/volto-hydra/src/components/Sidebar/ChildBlocksWidget.jsx`
- Modify: `packages/volto-hydra/src/components/Iframe/View.jsx`
- Test: `tests-playwright/integration/block-selection.spec.ts`

When Ctrl/Shift+Click in sidebar enters multi-select, it should also set `selectionMode = true` and tell the iframe to enter selection mode.

- [ ] **Step 1: Write failing test — sidebar multi-select shows iframe checkboxes**

```typescript
test('Ctrl+Click in sidebar also shows checkboxes in iframe', async ({ page }) => {
  const helper = new AdminUIHelper(page);
  await helper.login();
  await helper.navigateToEdit('/container-test-page');

  // Navigate to col-1 children in sidebar
  await helper.clickBlockInIframe('text-1a');
  await helper.waitForBlockSelected('text-1a');
  await helper.escapeToParent();
  await helper.waitForBlockSelected('col-1');

  // Ctrl+Click items in sidebar
  const blockList = page.locator('.child-blocks-widget');
  await blockList.locator('.child-block-item').first().click({ modifiers: ['ControlOrMeta'] });
  await blockList.locator('.child-block-item').last().click({ modifiers: ['ControlOrMeta'] });

  // Iframe should show checkboxes too
  await expect(page.locator('.volto-hydra-selection-checkbox').first())
    .toBeVisible({ timeout: 5000 });

  // Exit button should be on left toolbar
  await expect(page.locator('[data-testid="exit-selection-mode"]'))
    .toBeVisible({ timeout: 3000 });
});
```

- [ ] **Step 2: Run test to verify it fails**

- [ ] **Step 3: Implement sidebar → iframe selection mode sync**

When ChildBlocksWidget Ctrl/Shift+Click sets `multiSelected`, it should also:
1. Dispatch an event or message to set `selectionMode = true` in View.jsx
2. Tell the iframe to enter selection mode (so `_selectionModeBlockUids` is set and clicks are intercepted)

Approach: ChildBlocksWidget dispatches `hydra-enter-selection-mode` document event. View.jsx listens and sends `ENTER_SELECTION_MODE` to iframe (without a specific blockUid — just activating mode). Iframe responds by setting `_selectionModeBlockUids` to all blocks and sending back `ENTER_SELECTION_MODE` with rects.

- [ ] **Step 4: Run test to verify it passes**

- [ ] **Step 5: Commit**

---

### Task 4: ParentBlocksWidget — siblings vs cross-container display

**Files:**
- Modify: `packages/volto-hydra/src/components/Sidebar/ParentBlocksWidget.jsx:575,744-797`
- Test: `tests-playwright/integration/block-selection.spec.ts`

- [ ] **Step 1: Write failing test — sibling multi-select keeps block list**

```typescript
test('Sibling multi-select keeps ChildBlocksWidget visible', async ({ page }) => {
  const helper = new AdminUIHelper(page);
  await helper.login();
  await helper.navigateToEdit('/container-test-page');

  // Shift+Arrow to multi-select text-1a + text-1b (siblings in col-1)
  await helper.clickBlockInIframe('text-1a');
  await helper.waitForBlockSelected('text-1a');
  await helper.escapeFromEditing();
  await page.keyboard.press('Shift+ArrowDown');

  // ChildBlocksWidget should be visible (not replaced by summary)
  await expect(page.locator('.child-blocks-widget')).toBeVisible({ timeout: 5000 });

  // multi-select-summary should NOT appear
  await expect(page.locator('[data-testid="multi-select-summary"]')).not.toBeVisible({ timeout: 2000 });
});
```

- [ ] **Step 2: Write failing test — cross-container shows filtered path view**

```typescript
test('Cross-container multi-select shows filtered path view in ChildBlocksWidget', async ({ page }) => {
  const helper = new AdminUIHelper(page);
  await helper.login();
  await helper.navigateToEdit('/container-test-page');

  const iframe = helper.getIframe();

  // Select text-1a (col-1), Ctrl+Click text-2a (col-2)
  await helper.clickBlockInIframe('text-1a');
  await helper.waitForBlockSelected('text-1a');
  await helper.escapeFromEditing();
  await iframe.locator('[data-block-uid="text-2a"]').click({ modifiers: ['ControlOrMeta'] });

  // Sidebar should navigate to common ancestor (columns-1)
  // ChildBlocksWidget should show filtered view with paths
  const blockList = page.locator('.child-blocks-widget');
  await expect(blockList).toBeVisible({ timeout: 5000 });

  // Should show selected blocks with path context
  await expect(blockList.locator('.selected-block-path')).toHaveCount(2, { timeout: 5000 });
  await expect(blockList.locator('.multi-select-bar')).toContainText('2 selected');
});
```

- [ ] **Step 3: Run tests to verify they fail**

- [ ] **Step 4: Implement siblings detection**

In ParentBlocksWidget:
```jsx
import { getCommonAncestor } from '../../utils/blockPath';

const isMultiSelected = multiSelected.length > 1;
let multiSelectMode = null;
let commonAncestorId = null;
if (isMultiSelected) {
  const parents = multiSelected
    .map(uid => blockPathMap[uid]?.parentId)
    .filter(p => p !== undefined);
  if (parents.length === multiSelected.length && new Set(parents).size === 1) {
    multiSelectMode = 'siblings';
  } else {
    multiSelectMode = 'cross-container';
    commonAncestorId = getCommonAncestor(blockPathMap, multiSelected);
  }
}
```

For siblings: render normal `ParentBlockSection` (ChildBlocksWidget handles highlighting via Task 2).

For cross-container: render ChildBlocksWidget in filtered mode at the common ancestor, showing only selected blocks with their paths.

- [ ] **Step 5: Implement cross-container filtered ChildBlocksWidget**

Pass a `filteredSelection` prop to ChildBlocksWidget when in cross-container mode. When set, ChildBlocksWidget renders only the specified blocks with path prefixes instead of the full child list.

- [ ] **Step 6: Run tests to verify they pass**

- [ ] **Step 7: Update existing tests**

Tests that expect `[data-testid="multi-select-summary"]` for sibling selections need updating. Replace with `.child-block-item.selected` count or `.multi-select-bar` checks.

- [ ] **Step 8: Commit**

---

### Task 5: Selection mode navigation in sidebar

**Files:**
- Modify: `packages/volto-hydra/src/components/Sidebar/ChildBlocksWidget.jsx`
- Test: `tests-playwright/integration/block-selection.spec.ts`

In selection mode, normal clicks in ChildBlocksWidget should still navigate (not toggle). Only checkboxes toggle. This allows navigating to other containers and selecting blocks there.

- [ ] **Step 1: Write failing test — navigate in selection mode**

```typescript
test('Sidebar navigation works during selection mode', async ({ page }) => {
  const helper = new AdminUIHelper(page);
  await helper.login();
  await helper.navigateToEdit('/container-test-page');

  // Enter selection mode via iframe long press
  await helper.clickBlockInIframe('text-1a');
  await helper.waitForBlockSelected('text-1a');
  await helper.longPressBlock('text-1a');

  // Navigate back to col-1 via sidebar back arrow
  const backArrow = page.locator('.sidebar-section-header .nav-back');
  await expect(backArrow).toBeVisible({ timeout: 5000 });
  await backArrow.click();

  // Should see col-1's children in sidebar, still in selection mode
  const blockList = page.locator('.child-blocks-widget');
  await expect(blockList).toBeVisible({ timeout: 5000 });

  // Checkboxes should still be in iframe
  await expect(page.locator('.volto-hydra-selection-checkbox').first())
    .toBeVisible({ timeout: 3000 });
});
```

- [ ] **Step 2: Run test to verify it fails**

- [ ] **Step 3: Implement — ensure sidebar navigation doesn't exit selection mode**

Currently `onSelectBlock` in Form.jsx clears `multiSelected`. In selection mode, sidebar navigation should NOT clear the selection. Add a guard: if `selectionMode` is active, navigation preserves `multiSelected`.

- [ ] **Step 4: Run test to verify it passes**

- [ ] **Step 5: Commit**

---

### Task 6: Full regression

- [ ] **Step 1: Run full block-selection suite on admin-mock**

Run: `pnpm exec playwright test tests-playwright/integration/block-selection.spec.ts --project=admin-mock`

- [ ] **Step 2: Run on admin-nuxt**

Run: `pnpm exec playwright test tests-playwright/integration/block-selection.spec.ts --project=admin-nuxt`

- [ ] **Step 3: Fix regressions, commit**
