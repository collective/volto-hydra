# Test Coverage Suggestions for Volto Hydra

Based on analysis of closed GitHub issues and PRs, here are suggested additional tests to improve coverage.

## Current Test Coverage (32 tests)

✅ **sidebar-forms.spec.ts** (13 tests) - Block settings forms
✅ **navigation.spec.ts** (4 tests) - Basic navigation
✅ **block-management.spec.ts** (4 tests) - Adding/removing blocks
✅ **authentication.spec.ts** (6 tests) - Login/logout
✅ **block-selection.spec.ts** (5 tests) - Block selection and visual indication
✅ **inline-editing.spec.ts** (3 tests) - Basic text editing
✅ **quanta-toolbar.spec.ts** (11 tests) - Toolbar button presence

---

## HIGH PRIORITY: Missing Critical Features

### 1. 🔴 **Adding and Removing Blocks** (CRITICAL GAP!)
**File**: `tests-playwright/integration/block-add-remove.spec.ts`

**CURRENT STATUS**: block-management.spec.ts has weak tests that DON'T actually add or remove blocks properly!

**Tests Urgently Needed**:
```typescript
test.describe('Adding Blocks', () => {
  test('clicking Add button shows block chooser');
  test('selecting Slate block adds it to page');
  test('selecting Image block adds it to page');
  test('new block appears in iframe immediately');
  test('new block appears in correct position');
  test('new block syncs to Admin UI');
  test('can add multiple blocks in succession');
  test('block chooser closes after selection');
  test('can cancel block addition');
});

test.describe('Removing Blocks', () => {
  test('clicking Remove from menu deletes block');
  test('block disappears from iframe');
  test('block deletion syncs to Admin UI');
  test('removing block updates blocks_layout');
  test('cannot remove last remaining block');
  test('removing middle block preserves order');
});
```

### 2. 🔴 **Inline Drag and Drop Blocks** (PR #123, Issue #65)
**File**: `tests-playwright/integration/drag-and-drop.spec.ts`

This was a major feature implementation that has NO test coverage.

**Tests Needed**:
```typescript
test.describe('Drag and Drop Blocks', () => {
  test('dragging a block shows visual clone');
  test('dropping block before another updates order');
  test('dropping block after another updates order');
  test('visual feedback shows blue border above hovered block');
  test('visual feedback shows blue border below hovered block');
  test('blocks_layout array updates after drop');
  test('Admin UI receives updated block order');
  test('drag operation can be cancelled by releasing outside');
  test('cannot drag block to invalid positions');
  test('drag indicator disappears after drop');
});
```

**Implementation Notes**:
- From PR: Hydra creates draggable clone on mousedown
- Shows solid blue border above/below hovered block to indicate drop position
- Updates blocks_layout array and syncs with Admin UI
- Should test both "drop before" and "drop after" scenarios

---

### 2. 🔴 **Inline Link Formatting** (PR #126, #137, Issue #35)
**File**: `tests-playwright/integration/inline-link-formatting.spec.ts`

Major inline editing feature with NO test coverage.

**Tests Needed**:
```typescript
test.describe('Inline Link Creation', () => {
  test('selecting text shows link button in toolbar');
  test('clicking link button shows link input field');
  test('entering valid URL enables submit button');
  test('entering invalid URL shows validation feedback');
  test('submitting valid link converts text to hyperlink');
  test('link appears in iframe with correct href');
  test('link change syncs with Admin UI');
  test('can convert multiple selected nodes to link');
  test('can select existing link and edit URL');
  test('link toolbar hides after submission');
  test('can cancel link creation');
});
```

**Implementation Notes**:
- From PR: Toolbar hides and shows input field for link
- Visual validation: thin border around bar indicates valid/invalid
- Submit disabled if link is invalid
- Edge case: selecting last word and converting breaks slate (need guard)
- Should handle both simple text nodes and complex selections with formatting

---

### 3. 🟡 **External URL Navigation** (Issue #94)
**File**: `tests-playwright/integration/external-links.spec.ts`

Important for proper content editing flow.

**Tests Needed**:
```typescript
test.describe('External Link Handling', () => {
  test('clicking external link exits edit mode');
  test('external link opens in new tab (not inside iframe)');
  test('Admin UI exits edit view when external link clicked');
  test('unsaved changes warning appears before navigation');
  test('behavior matches standard Volto behavior');
});
```

**Implementation Notes**:
- From issue: Hydra already detects external link clicks via bridge
- Should exit editor and replace with the clicked URL
- Should NOT load external URL inside iframe

---

### 4. 🟡 **Exit Edit Mode via Navigation** (Issue #69)
**File**: `tests-playwright/integration/edit-mode-exit.spec.ts`

Critical workflow behavior.

**Tests Needed**:
```typescript
test.describe('Exit Edit Mode via Navigation', () => {
  test('navigating to different page exits edit mode');
  test('unsaved changes are abandoned on navigation');
  test('confirmation dialog appears if changes exist');
  test('can cancel navigation and stay in edit mode');
  test('behavior mimics standard Volto');
});
```

**Implementation Notes**:
- From issue: In Volto, navigation during edit abandons changes and exits edit mode
- Hydra should do the same for consistency

---

## MEDIUM PRIORITY: Configuration & URL Handling

### 5. 🟡 **Custom Frontend URL Configuration** (PR #125, Issues #124, #59, #89)
**File**: `tests-playwright/integration/custom-frontend-url.spec.ts`

Multiple PRs fixed this, but no regression tests exist.

**Tests Needed**:
```typescript
test.describe('Custom Frontend URL', () => {
  test('custom URL preserves full path (not just origin)');
  test('custom URL with query params preserved');
  test('hash bang URLs work correctly (#/!/path)');
  test('URL validation prevents invalid URLs');
  test('switching between preset frontends works');
  test('custom URL persists in cookies');
  test('pressing Enter submits URL');
  test('URL input bar accessible via label');
});
```

**Bug History**:
- **PR #125**: Fixed Admin UI ignoring everything except origin
  - Was: `url.origin` → Now: `url.href`
- **Issue #124**: Hash bang URLs like `https://example.com/#/!/test` need support
- **Issue #59**: Input bar usability (Enter key, form submission)

---

### 6. 🟢 **Private Content Access** (Issue #57)
**File**: `tests-playwright/integration/private-content.spec.ts`

**Tests Needed**:
```typescript
test.describe('Private Content Access', () => {
  test('after login, private content loads in iframe');
  test('auth token passed correctly via URL param');
  test('no 404 errors for authenticated private content');
  test('logout clears access to private content');
  test('session expiration handled gracefully');
});
```

**Bug History**:
- **Issue #57**: Private content showed 404 even when logged into Admin UI
- Fix: Pass auth_token via URL param instead of relying on postMessage

---

## LOW PRIORITY: Polish & Accessibility

### 7. 🟢 **Format Button Functionality** (expand inline-editing tests)
**File**: `tests-playwright/integration/text-formatting.spec.ts`

Current quanta-toolbar tests only check button PRESENCE, not functionality.

**Tests Needed**:
```typescript
test.describe('Text Format Buttons', () => {
  test('bold button makes text bold');
  test('italic button makes text italic');
  test('strikethrough button adds strikethrough');
  test('bold formatting syncs with Admin UI');
  test('multiple formats can be applied simultaneously');
  test('format button shows active state for formatted text');
  test('clicking format button again removes format');
});
```

---

### 8. 🟢 **Toolbar Accessibility** (PR #167, Issue #161)
**File**: `tests-playwright/integration/toolbar-accessibility.spec.ts`

**Tests Needed**:
```typescript
test.describe('Toolbar Accessibility', () => {
  test('toolbar font size uses rem units (not px)');
  test('toolbar text scales with browser font size');
  test('toolbar buttons are keyboard accessible');
  test('toolbar buttons have proper ARIA labels');
  test('toolbar icons are SVG (not raster images)');
  test('toolbar contrast meets WCAG standards');
});
```

**Bug History**:
- **PR #167**: Fixed toolbar using fixed px font size → now uses rem
- **Issue #161**: Images used for buttons were blurry → switched to SVGs

---

### 9. 🟢 **Block Type Configuration** (Issue #70)
**File**: `tests-playwright/integration/block-type-restrictions.spec.ts`

**Tests Needed**:
```typescript
test.describe('Block Type Configuration', () => {
  test('only configured block types appear in add menu');
  test('disabled blocks cannot be added');
  test('block restrictions passed on iframe init');
  test('custom block schemas work correctly');
  test('container block rules enforced');
});
```

**Implementation Notes**:
- From issue: Pass allowed blocks on iframe init
- Should support rules about which blocks can be added inside containers
- Should support schema modifications for blocks

---

### 10. 🟢 **Real-time Updates** (Issue #85)
**File**: `tests-playwright/integration/realtime-sync.spec.ts`

**Tests Needed**:
```typescript
test.describe('Real-time Updates', () => {
  test('changes in Admin UI reflect immediately in iframe');
  test('postMessage communication works bidirectionally');
  test('block updates sync within 100ms');
  test('sidebar form changes update iframe');
  test('message queue handles rapid updates');
});
```

**Bug History**:
- **Issue #85**: Deployed demo site not receiving realtime updates
- Issue with postMessage not being received correctly

---

### 11. 🟢 **Mobile Responsiveness** (Issue #56)
**File**: `tests-playwright/integration/mobile-editing.spec.ts`

**Tests Needed**:
```typescript
test.describe('Mobile Editing', () => {
  test('Quanta toolbar positions at bottom on mobile');
  test('main toolbar positions at top on mobile');
  test('sidebar slides in/out on mobile');
  test('iframe takes full available width on mobile');
  test('no extra headers waste space on mobile');
  test('block selection works with touch events');
  test('drag and drop works on mobile');
});
```

**Implementation Notes**:
- From issue: Quanta toolbar should go to bottom on mobile
- Main toolbar should stay at top
- Remove extra headers/borders to maximize frontend visibility

---

### 12. 🟢 **Block Navigation / Breadcrumbs** (Issue #77)
**File**: `tests-playwright/integration/block-navigation.spec.ts`

**Tests Needed**:
```typescript
test.describe('Block Navigation', () => {
  test('block breadcrumbs show parent containers');
  test('can click breadcrumb to select parent block');
  test('breadcrumb dropdown shows block hierarchy');
  test('block navigation available in page settings');
  test('can select blocks even when clicking disabled');
  test('block navtree shows all blocks on page');
});
```

**Implementation Notes**:
- From issue: Block breadcrumbs like `... > Columns > Column > Text [v]`
- Available in both page settings (Blocks section) and block settings
- Useful for selecting thin/hard-to-click blocks

---

## Edge Cases & Error Handling

### 13. Additional Edge Case Tests

**File**: `tests-playwright/integration/error-handling.spec.ts`

```typescript
test.describe('Error Handling', () => {
  test('network error during save shows error message');
  test('invalid block data handled gracefully');
  test('concurrent edit conflict detected');
  test('iframe load failure shows helpful error');
  test('bridge initialization timeout handled');
  test('malformed postMessage ignored safely');
});
```

---

## Test Priority Summary

| Priority | Feature | Test File | Tests | Issues/PRs |
|----------|---------|-----------|-------|------------|
| 🔴 **CRITICAL** | **Add/Remove Blocks** | `block-add-remove.spec.ts` | **15** | **CORE FEATURE** |
| 🔴 HIGH | Drag & Drop | `drag-and-drop.spec.ts` | 10 | #123, #65 |
| 🔴 HIGH | Inline Links | `inline-link-formatting.spec.ts` | 11 | #126, #137, #35 |
| 🟡 MEDIUM | External Links | `external-links.spec.ts` | 5 | #94 |
| 🟡 MEDIUM | Exit Edit Mode | `edit-mode-exit.spec.ts` | 5 | #69 |
| 🟡 MEDIUM | Custom URLs | `custom-frontend-url.spec.ts` | 8 | #125, #124, #59 |
| 🟢 LOW | Private Content | `private-content.spec.ts` | 5 | #57 |
| 🟢 LOW | Text Formatting | `text-formatting.spec.ts` | 7 | - |
| 🟢 LOW | Accessibility | `toolbar-accessibility.spec.ts` | 6 | #167, #161 |
| 🟢 LOW | Block Config | `block-type-restrictions.spec.ts` | 5 | #70 |
| 🟢 LOW | Realtime Sync | `realtime-sync.spec.ts` | 5 | #85 |
| 🟢 LOW | Mobile | `mobile-editing.spec.ts` | 7 | #56 |
| 🟢 LOW | Block Nav | `block-navigation.spec.ts` | 6 | #77 |
| 🟢 LOW | Error Handling | `error-handling.spec.ts` | 6 | - |

**Total Suggested Tests**: 101 additional tests
**Current Tests**: 32
**Target Coverage**: 133 tests

---

## Implementation Notes

### Helper Methods Needed in `AdminUIHelper.ts`

For the new tests, you'll need to add these helper methods:

```typescript
// Add/Remove Blocks (CRITICAL)
async clickAddBlockButton(blockId?: string) // Click + button on toolbar
async isBlockChooserVisible()
async selectBlockType(blockType: 'slate' | 'image' | 'video' | 'listing')
async getBlockCount()
async getBlockByIndex(index: number)
async getBlockOrder() // Returns array of block IDs in order
async waitForBlockToAppear(blockId: string)
async waitForBlockToDisappear(blockId: string)

// Drag and Drop
async dragBlock(blockId: string, targetBlockId: string, position: 'before' | 'after')
async isDragIndicatorVisible()
async getDragCloneElement()

// Link Formatting
async selectTextInBlock(blockId: string, startOffset: number, endOffset: number)
async clickLinkButton()
async isLinkInputVisible()
async enterLinkUrl(url: string)
async submitLink()
async isLinkValid()

// External Links
async clickExternalLinkInIframe(linkText: string)
async isInEditMode()

// Custom URLs
async setCustomFrontendUrl(url: string)
async getIframeSrc()
async selectPresetFrontend(name: string)

// Private Content
async accessPrivateContent(path: string)
async isContentAccessible()

// Format Buttons
async clickFormatButton(format: 'bold' | 'italic' | 'strikethrough')
async isTextFormatted(blockId: string, format: string)

// Mobile
async setMobileViewport()
async getToolbarPosition()

// Block Navigation
async getBlockBreadcrumbs()
async clickBreadcrumbItem(index: number)
async openBlockNavTree()
```

---

## Next Steps

1. **START WITH CRITICAL: Add/Remove Blocks** - Core CMS functionality completely untested!
2. **Then HIGH priority** (Drag & Drop, Inline Links)
3. **Add helper methods** to `AdminUIHelper.ts` as needed
4. **Update mock API** if new endpoints required
5. **Test on real production Hydra** to ensure behavior matches
6. **Document any discovered issues** in GitHub

---

## Summary

The most critical finding is that **adding and removing blocks - the core editing functionality of a CMS - has NO proper test coverage**. The existing `block-management.spec.ts` tests are weak and don't actually verify that blocks can be added or removed successfully.

**Priority Order:**
1. 🔴 **CRITICAL**: Add/Remove Blocks (15 tests)
2. 🔴 HIGH: Drag & Drop (10 tests)
3. 🔴 HIGH: Inline Links (11 tests)
4. 🟡 MEDIUM: URL/Navigation Features (18 tests)
5. 🟢 LOW: Polish & Accessibility (47 tests)

---

**Generated**: 2025-01-06
**Based on**: Closed PRs, Issues analysis, and code review
**Current Test Count**: 32
**Suggested Additional**: 101
**Target Coverage**: 133 tests
