# Slate Transforms Architecture Design

**Branch:** `feature/slate-transforms-refactor`
**Related Issue:** [#147 - formatting can result in removing text in slate (+other problems)](https://github.com/pretagov/volto-hydra/issues/147)
**Status:** Implementation Phase
**Author:** Claude + Dylan Jay
**Date:** 2025-11-06
**Updated:** 2025-11-07

## Table of Contents

1. [Problem Statement](#problem-statement)
2. [Current Architecture](#current-architecture)
3. [Proposed Architecture](#proposed-architecture)
4. [Bridge Protocol Specification](#bridge-protocol-specification)
5. [Selection Serialization](#selection-serialization)
6. [Implementation Plan](#implementation-plan)
7. [Files to Modify/Create/Delete](#files-to-modifycreateddelete)
8. [Testing Strategy](#testing-strategy)
9. [Timeline](#timeline)

---

## Problem Statement

### Current Issues

The current inline editing implementation has several critical problems:

1. **Text Deletion When Formatting Across Nodes** (Issue #147)
   - Applying formatting (bold, italic, link) across Slate node boundaries can delete text
   - Root cause: Direct DOM manipulation doesn't understand Slate's document structure
   - Example: Making text bold that spans two paragraphs can lose content

2. **Keyboard Selection Not Working**
   - `currentFormats` only updates on mouseup events (hydra.js:755-791)
   - Keyboard selection (Ctrl+A, Shift+arrows) doesn't trigger mouseup
   - Results in null reference errors when trying to format keyboard-selected text
   - Lines affected: 681, 686, 718, 733 in hydra.js

3. **Fragile DOM Manipulation**
   - ~350 lines of custom DOM manipulation code (hydra.js:1349-1657)
   - Functions like `formatSelectedText()`, `unwrapFormatting()`, `unwrapSelectedPortion()`, etc.
   - Brittle HTML serialization/deserialization cycle
   - Doesn't preserve Slate's internal structure (nodeIds, block structure)

4. **Inconsistent Button States**
   - Format buttons only update on mouse events
   - No reliable way to show active state for current selection

5. **Race Condition Between Text Changes and Format Requests** (Discovered during E2E testing)
   - User types new text → MutationObserver fires → `INLINE_EDIT_DATA` message sent to Admin UI
   - User immediately clicks Bold → `SLATE_FORMAT_REQUEST` message sent to Admin UI
   - Format request arrives before text change completes processing
   - Admin UI reads stale `form.blocks[blockId].value` from React state
   - Result: Formatting applied to old text content, not the text user just typed
   - Timeline example:
     ```
     T=0ms:   User types "Text to make bold" → MutationObserver triggered
     T=1ms:   INLINE_EDIT_DATA sent to Admin UI
     T=5ms:   User clicks Bold → SLATE_FORMAT_REQUEST sent
     T=10ms:  Admin UI receives FORMAT_REQUEST, reads stale value
     T=15ms:  Admin UI receives INLINE_EDIT_DATA (too late!)
     ```
   - Evidence: Test logs showed selection contained "Text to make bold" but serialized HTML showed "This is a test paragraph" (the old text)

### Why This Matters

- **Data Loss**: Users can lose content when formatting text
- **Poor UX**: Keyboard-based workflows don't work reliably
- **Wrong Content Formatted**: Race condition causes formatting to apply to wrong text
- **Maintenance Burden**: Complex DOM manipulation code is hard to debug and extend
- **Architectural Mismatch**: Fighting against Slate's design instead of working with it

---

## Current Architecture

### Component Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      Admin UI (React)                       │
│                   packages/volto-hydra/                     │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  View.jsx (Sidebar)                                  │  │
│  │  - Manages form state                                │  │
│  │  - Receives postMessage from iframe                  │  │
│  │  - Sends updated block data back to iframe           │  │
│  │  - Message handler: case 'TOGGLE_MARK'               │  │
│  └──────────────────────────────────────────────────────┘  │
│                          ▲                                  │
│                          │ postMessage                      │
│                          │ (TOGGLE_MARK, html)              │
│                          │                                  │
└──────────────────────────┼──────────────────────────────────┘
                           │
                           │
┌──────────────────────────┼──────────────────────────────────┐
│                          │                                  │
│                          ▼                                  │
│              Frontend Iframe (User's Site)                  │
│                packages/hydra-js/                           │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  hydra.js (Bridge)                                   │  │
│  │  - Sets up contenteditable blocks                    │  │
│  │  - Adds Quanta toolbar with bold/italic/link btns    │  │
│  │  - Listens for mouseup events on blocks              │  │
│  │  - Detects selection, calculates currentFormats      │  │
│  │  - On button click: calls formatSelectedText()       │  │
│  │  - Uses DOM Range API to wrap/unwrap elements        │  │
│  │  - Serializes result to HTML                         │  │
│  │  - Sends 'TOGGLE_MARK' message to Admin UI           │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Current Event Flow (Bold Button Example)

```
1. User selects text with mouse/keyboard
2. User clicks Bold button in Quanta toolbar (in iframe)
3. hydra.js mouseup handler fires (if mouse selection)
   - Updates currentFormats via isFormatted()
4. Bold button click handler:
   - Gets current selection via window.getSelection()
   - Calls formatSelectedText(range, 'bold')
   - DOM manipulation:
     * Creates <strong> elements
     * Wraps selected nodes
     * Handles partial wrapping of text nodes
     * Removes empty formatting elements
5. Serializes contenteditable DOM to HTML string
6. Sends postMessage to Admin UI:
   { type: 'TOGGLE_MARK', html: '<p>...<strong>text</strong>...</p>' }
7. Admin UI (View.jsx) receives message
8. Calls toggleMark(html) utility:
   - Parses HTML with DOMParser
   - Deserializes to Slate JSON
   - Adds nodeIds to JSON
9. Updates form state with new Slate JSON
10. Sends TOGGLE_MARK_DONE back to iframe with full block data
11. Iframe re-renders contenteditable with updated HTML
```

### Problem Areas in Current Code

**hydra.js** (packages/hydra-js/hydra.js)

```javascript
// Line 535: currentFormats only set via mouseup
let currentFormats = null;

// Lines 755-791: handleSelectionChange only called on mouseup
const handleSelectionChange = () => {
  const selection = window.getSelection();
  const range = selection.getRangeAt(0);
  currentFormats = this.isFormatted(range);
  // Update button states...
};

this.handleMouseUp = (e) => {
  if (e.target.closest('[data-editable-field="value"]')) {
    handleSelectionChange();
  }
};

// Lines 681, 686, 718, 733: Accesses currentFormats['link'] without null check
// Causes "Cannot read properties of null (reading 'link')" errors

// Lines 1453-1657: ~200 lines of DOM manipulation utilities
// - formatSelectedText()
// - unwrapFormatting()
// - unwrapSelectedPortion()
// - unwrapElement()
// - removeEmptyFormattingElements()
// - sendFormattedHTMLToAdminUI()

// Lines 1349-1427: isFormatted() - 78 lines detecting format state
```

**View.jsx** (packages/volto-hydra/src/components/Iframe/View.jsx)

```javascript
case 'TOGGLE_MARK':
  isInlineEditingRef.current = true;
  // Converts HTML back to Slate JSON
  const deserializedHTMLData = toggleMark(event.data.html);
  onChangeFormData({
    ...form,
    blocks: {
      ...form.blocks,
      [selectedBlock]: {
        ...form.blocks[selectedBlock],
        value: deserializedHTMLData,
      },
    },
  });
  // Send updated data back to iframe
  event.source.postMessage({
    type: 'TOGGLE_MARK_DONE',
    data: { ...fullBlockData... },
  }, event.origin);
  break;
```

**toggleMark.js** (packages/volto-hydra/src/utils/toggleMark.js)

```javascript
// Problem: HTML → Slate JSON conversion loses fidelity
export default function toggleMark(html) {
  const document = new DOMParser().parseFromString(html, 'text/html');
  const d = deserialize(document.body);
  return addNodeIds(d, { current: 1 });
}
```

---

## Proposed Architecture

### Core Principle

**Move all Slate editing operations to the Admin UI side** where we have access to Slate's transform APIs and can leverage the existing Volto-Slate infrastructure.

The iframe becomes a "dumb terminal" that only:
1. Captures user selection
2. Serializes selection to a Slate-compatible format
3. Sends selection + operation request to Admin UI
4. Receives updated content and re-renders

### New Component Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      Admin UI (React)                       │
│                   packages/volto-hydra/                     │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  View.jsx (Sidebar)                                  │  │
│  │  - NEW: Slate message handlers                       │  │
│  │  - Receives SLATE_FORMAT_REQUEST, selection data     │  │
│  │  - Calls slateTransforms.applyFormat()               │  │
│  │  - Updates form state with result                    │  │
│  │  - Sends SLATE_UPDATE_DONE back to iframe            │  │
│  └──────────────────────────────────────────────────────┘  │
│                          ▲                                  │
│  ┌──────────────────────┼───────────────────────────────┐  │
│  │  slateTransforms.js (NEW)                            │  │
│  │  - createHeadlessEditor(value)                       │  │
│  │  - applyFormat(value, selection, format, action)     │  │
│  │  - applyDeletion(value, selection, direction)        │  │
│  │  - insertText(value, selection, text)                │  │
│  │  - getFormatState(value, selection)                  │  │
│  └──────────────────────────────────────────────────────┘  │
└──────────────────────────┼──────────────────────────────────┘
                           │ postMessage
                           │ (SLATE_FORMAT_REQUEST,
                           │  serialized selection)
                           │
┌──────────────────────────┼──────────────────────────────────┐
│                          ▼                                  │
│              Frontend Iframe (User's Site)                  │
│                packages/hydra-js/                           │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  hydra.js (Bridge) - SIMPLIFIED                      │  │
│  │  - Sets up contenteditable blocks                    │  │
│  │  - Adds Quanta toolbar                               │  │
│  │  - NEW: Listens for selectionchange events           │  │
│  │  - On button click:                                  │  │
│  │    * Serializes current selection to Slate paths     │  │
│  │    * Sends SLATE_FORMAT_REQUEST to Admin UI          │  │
│  │  - Receives SLATE_UPDATE_DONE and re-renders         │  │
│  │  - REMOVED: All DOM manipulation functions           │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### New Event Flow (Bold Button Example)

```
1. User selects text with mouse/keyboard
2. selectionchange event fires in iframe
   - Updates button states immediately (show active state)
3. User clicks Bold button in Quanta toolbar
4. hydra.js button click handler:
   - Calls serializeSelection()
   - Converts browser Selection API to Slate-compatible paths:
     {
       anchor: { path: [0, 1], offset: 5 },
       focus: { path: [0, 1], offset: 15 }
     }
   - Sends postMessage to Admin UI:
     {
       type: 'SLATE_FORMAT_REQUEST',
       blockId: 'abc-123',
       format: 'bold',
       action: 'toggle',
       selection: { anchor: {...}, focus: {...} }
     }
5. Admin UI (View.jsx) receives message
6. Calls slateTransforms.applyFormat():
   - Creates headless Slate editor with current block value
   - Applies Slate.Transforms.select() to set selection
   - Calls Editor.addMark('bold') or Editor.removeMark('bold')
   - Returns updated Slate JSON
7. Updates form state with new Slate JSON
8. Sends SLATE_UPDATE_DONE back to iframe with:
   - Updated HTML for rendering
   - Updated button states
9. Iframe re-renders contenteditable with updated HTML
```

### Race Condition Solution: Input Blocking During Transforms

To solve race conditions between user input and Slate transforms, the iframe blocks user input while transforms are processing:

**Problem Identified:**
- Slate transforms can restructure nodes unpredictably (e.g., merging nodes at boundaries, normalizing structure)
- If user continues typing/deleting while transform is processing, DOM changes conflict with incoming transform results
- Multiple operations in flight cannot be reliably tracked with state snapshots

**Blocking Mechanism Design:**

**Key Principle:** Block user input during any operation that requires Slate transforms. Normal typing doesn't block (just syncs state), but format operations do.

**Implementation:**
1. **Block on transform operations:**
   - Format buttons (bold, italic, del, link)
   - Paste operations (require Slate deserialization)
   - Delete/Backspace at node boundaries (might merge/restructure nodes)

2. **Blocking behavior:**
   - Set `contenteditable="false"` on editable field
   - Disable format buttons
   - Change cursor to "wait"
   - Start 2-second timeout

3. **Unblocking:**
   - Admin UI sends `SLATE_UPDATE_DONE` or `TOGGLE_MARK_DONE` response
   - Iframe receives response and updates DOM
   - Re-enables `contenteditable="true"`
   - Re-enables format buttons
   - Changes cursor back to "text"

4. **Timeout handling:**
   - If no response after 2 seconds, show error state
   - Permanently disable editing (set `cursor: not-allowed`, `opacity: 0.5`)
   - Display tooltip: "Transform timeout - refresh page to continue editing"

5. **Ignored events:**
   - During blocking, all keyboard/mouse input is ignored (not queued)
   - Provides visual feedback via cursor change

**Normal typing doesn't block:**
- Text changes sync via `INLINE_EDIT_DATA` messages
- No Slate transforms required, just state synchronization
- Users can type freely without waiting for Admin UI

**Benefits of Blocking Approach:**

1. **Prevents All Race Conditions**: Impossible for user to make changes while transform processes
2. **Simpler Than State Snapshots**: No need to track currentValue or reconcile states
3. **Clear User Feedback**: Cursor and button states show when system is processing
4. **Fail-Safe**: Timeout prevents indefinite blocking if Admin UI fails
5. **Structurally Impossible Bugs**: Race conditions eliminated at architectural level, not via careful coding

### Benefits of New Architecture

1. **No Text Loss**: Slate transforms understand node boundaries and preserve structure
2. **Keyboard Selection Works**: Uses selectionchange event, not mouseup
3. **Less Code**: Remove ~350 lines of fragile DOM manipulation
4. **Leverages Existing Infrastructure**: Uses Volto-Slate's editor utilities
5. **Easier to Extend**: Adding new operations (strikethrough, subscript) is trivial
6. **Consistent State**: Button states can update on any selection change
7. **Better Error Handling**: Slate operations are atomic and predictable
8. **No Race Conditions**: Blocking mechanism prevents user input during transforms

---

## Bridge Protocol Specification

### Messages from Iframe to Admin UI

#### `SLATE_FORMAT_REQUEST`

Request to apply formatting to the current selection. **Iframe blocks user input until response received.**

```typescript
{
  type: 'SLATE_FORMAT_REQUEST',
  blockId: string,          // Block UUID
  format: 'bold' | 'italic' | 'link' | 'del',
  action: 'toggle' | 'add' | 'remove',
  selection: {
    anchor: { path: number[], offset: number },
    focus: { path: number[], offset: number }
  },
  url?: string              // Only for format='link', action='add'
}
```

**Example:**
```javascript
// Block input before sending
this.setBlockProcessing(blockId, true);

window.parent.postMessage({
  type: 'SLATE_FORMAT_REQUEST',
  blockId: 'abc-123',
  format: 'bold',
  action: 'toggle',
  selection: {
    anchor: { path: [0], offset: 5 },
    focus: { path: [0], offset: 15 }
  }
}, '*');

// Unblocking happens when SLATE_UPDATE_DONE received
```

**Blocking prevents race conditions:**
- User cannot type/delete while transform is processing
- No state synchronization needed - blocking eliminates the race at source
- Clear visual feedback via cursor change

#### `SLATE_DELETE_REQUEST`

Request to delete content in a direction.

```typescript
{
  type: 'SLATE_DELETE_REQUEST',
  blockId: string,
  direction: 'forward' | 'backward',
  selection: {
    anchor: { path: number[], offset: number },
    focus: { path: number[], offset: number }
  }
}
```

#### `SLATE_INSERT_TEXT_REQUEST`

Request to insert text at selection.

```typescript
{
  type: 'SLATE_INSERT_TEXT_REQUEST',
  blockId: string,
  text: string,
  selection: {
    anchor: { path: number[], offset: number },
    focus: { path: number[], offset: number }
  }
}
```

#### `SLATE_GET_FORMAT_STATE_REQUEST`

Request current format state for button UI updates.

```typescript
{
  type: 'SLATE_GET_FORMAT_STATE_REQUEST',
  blockId: string,
  selection: {
    anchor: { path: number[], offset: number },
    focus: { path: number[], offset: number }
  }
}
```

### Messages from Admin UI to Iframe

#### `SLATE_UPDATE_DONE`

Response after successfully applying an operation.

```typescript
{
  type: 'SLATE_UPDATE_DONE',
  blockId: string,
  html: string,             // Updated HTML for rendering
  formatState: {            // Current format state for button UI
    bold: boolean,
    italic: boolean,
    link: { present: boolean, url?: string },
    del: boolean
  }
}
```

#### `SLATE_ERROR`

Error response.

```typescript
{
  type: 'SLATE_ERROR',
  blockId: string,
  error: string,
  originalRequest: object   // Original request for debugging
}
```

---

## Selection Serialization

### Challenge

The browser's Selection API uses DOM nodes and offsets, but Slate uses paths and offsets into its JSON tree structure. We need bidirectional conversion.

### DOM to Slate Conversion

**Implemented in hydra.js (lines 1062-1166):**

```javascript
/**
 * Serializes the current DOM selection to Slate selection format.
 * Converts browser Selection/Range into Slate's {anchor, focus} format.
 */
serializeSelection() {
  const selection = window.getSelection();
  if (!selection || !selection.rangeCount || selection.isCollapsed) {
    return null;
  }

  const range = selection.getRangeAt(0);

  // Get anchor and focus points
  const anchorNode = range.startContainer;
  const focusNode = range.endContainer;

  // Serialize both points
  const anchor = this.serializePoint(anchorNode, range.startOffset);
  const focus = this.serializePoint(focusNode, range.endOffset);

  if (!anchor || !focus) {
    console.warn('[HYDRA] Could not serialize selection points');
    return null;
  }

  return { anchor, focus };
}

/**
 * Serializes a single point (anchor or focus) to Slate format.
 */
serializePoint(node, offset) {
  // Find the text node (might be element node in some cases)
  let textNode = node;
  if (node.nodeType === Node.ELEMENT_NODE) {
    // If element node, get first text child
    textNode = node.childNodes[offset] || node.firstChild;
    offset = 0;
  }

  // Walk up to find the path through the Slate structure
  const path = this.getNodePath(textNode);
  if (!path) {
    return null;
  }

  return { path, offset };
}

/**
 * Gets the Slate path for a DOM node by walking up the tree.
 * Uses data-node-id to identify Slate nodes.
 */
getNodePath(node) {
  const path = [];
  let current = node;

  // Walk up until we find the editable field container
  while (current && !current.hasAttribute?.('data-editable-field')) {
    if (current.hasAttribute?.('data-node-id')) {
      // This is a Slate node, find its index among siblings
      const parent = current.parentNode;
      const siblings = Array.from(parent.children).filter((child) =>
        child.hasAttribute('data-node-id'),
      );
      const index = siblings.indexOf(current);
      if (index !== -1) {
        path.unshift(index);
      }
    } else if (current.nodeType === Node.TEXT_NODE) {
      // Text node - find index among text siblings
      const parent = current.parentNode;
      const textNodes = Array.from(parent.childNodes).filter(
        (child) => child.nodeType === Node.TEXT_NODE,
      );
      const index = textNodes.indexOf(current);
      if (index !== -1) {
        path.unshift(index);
      }
    }

    current = current.parentNode;
  }

  // If we didn't find the editable field, path is invalid
  if (!current) {
    return null;
  }

  // Ensure path has at least block index (0 for paragraph)
  if (path.length === 0) {
    return [0, 0]; // Default to first block, first text
  }

  return path;
}
```

### Slate to DOM Conversion

**Function:** `deserializeSelection(slateSelection, blockElement)` in hydra.js

```javascript
/**
 * Converts Slate selection to browser Selection
 * Used to restore selection after updates
 */
function deserializeSelection(slateSelection, blockElement) {
  const range = document.createRange();

  const anchorNode = getDOMNodeFromPath(
    slateSelection.anchor.path,
    blockElement
  );
  const focusNode = getDOMNodeFromPath(
    slateSelection.focus.path,
    blockElement
  );

  range.setStart(anchorNode, slateSelection.anchor.offset);
  range.setEnd(focusNode, slateSelection.focus.offset);

  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);
}

/**
 * Gets DOM node from Slate path using data-node-id attributes
 */
function getDOMNodeFromPath(path, blockElement) {
  // Use path to find corresponding DOM node
  // Look for elements with matching data-node-id
  // Return text node at that location
}
```

### NodeId System and Different HTML Representations

**Critical Architectural Principle:** The iframe HTML and Admin UI sidebar HTML are **different representations** of the same Slate JSON structure.

- **Slate JSON** is the single source of truth (shared data structure)
- **Iframe HTML** is rendered by user's frontend code (user-controlled)
- **Admin UI HTML** is rendered by Volto's Slate serialization (Volto-controlled)
- **NodeIds** provide the mapping between these two different HTML representations

**Why This Matters:**
- User's frontend is free to render Slate nodes however they want
- Example: Slate JSON `{text: "Hello", bold: true}` might render as:
  - Iframe: `<b>Hello</b>` (user's choice)
  - Admin UI: `<strong>Hello</strong>` (Volto's choice)
- Both are valid representations of the same Slate structure
- We cannot compare or convert HTML directly between iframe and Admin UI
- We must always go through the Slate JSON layer

**NodeId Implementation:**

The existing `addNodeIds()` utility (packages/volto-hydra/src/utils/addNodeIds.js) adds a unique `nodeId` to every node in the Slate JSON:

```javascript
{
  "type": "p",
  "nodeId": 1,
  "children": [
    { "text": "Hello ", "nodeId": 2 },
    { "text": "world", "bold": true, "nodeId": 3 }
  ]
}
```

Both iframe and Admin UI include these nodeIds as `data-node-id` attributes when rendering:

**Iframe HTML (user's frontend):**
```html
<p data-node-id="1">
  <span data-node-id="2">Hello </span>
  <b data-node-id="3">world</b>
</p>
```

**Admin UI HTML (Volto rendering):**
```html
<p data-node-id="1">
  <span data-node-id="2">Hello </span>
  <strong data-node-id="3">world</strong>
</p>
```

**Selection Serialization Flow:**
1. User selects text in iframe's contenteditable
2. `serializeSelection()` walks iframe DOM using `data-node-id` attributes
3. Builds Slate path (e.g., `[1, 2]` = node 1, child 2)
4. Sends path to Admin UI in message
5. Admin UI uses path to locate node in Slate JSON (universal coordinate system)
6. Applies transform to Slate JSON
7. Both iframe and Admin UI re-render from updated Slate JSON (each with their own HTML)

This allows bidirectional mapping between different HTML representations via the shared Slate JSON structure.

---

## Implementation Plan

### Phase 1: Setup and Core Utilities (Days 1-2)

**Tasks:**
1. Create `packages/volto-hydra/src/utils/slateTransforms.js`
   - Import Slate dependencies (`slate`, `slate-react`, `@plone/volto-slate`)
   - Implement `createHeadlessEditor(value)` - creates a non-React Slate editor instance
   - Implement `applyFormat(value, selection, format, action)` - apply formatting transforms
   - Implement `getFormatState(value, selection)` - check active formats
   - Add comprehensive JSDoc comments
   - Add unit tests (if time permits, or mark as TODO)

2. Add new message handlers to `View.jsx`
   - Add `SLATE_FORMAT_REQUEST` handler
   - Call `slateTransforms.applyFormat()`
   - Update form state
   - Send `SLATE_UPDATE_DONE` response
   - Add error handling → `SLATE_ERROR` response

3. Test formatting operations (bold, italic, link, del)
   - Test within single text node
   - Test across multiple text nodes (same block)
   - Test with existing formatting
   - Test toggle behavior

**Deliverable:** Basic bold/italic formatting working end-to-end

### Phase 2: Selection Serialization (Days 3-4)

**Tasks:**
1. Add `serializeSelection()` to hydra.js
   - Implement `getPathFromDOMNode(node, blockElement)`
   - Handle text nodes, element nodes
   - Use `data-node-id` attributes to build paths
   - Handle edge cases (selection in non-tracked elements)

2. Add `deserializeSelection()` to hydra.js
   - Implement `getDOMNodeFromPath(path, blockElement)`
   - Restore browser selection after updates
   - Handle cases where path no longer exists (content changed)

3. Update event handlers in hydra.js
   - Replace `mouseup` with `selectionchange` event
   - Call `serializeSelection()` on selection changes
   - Update button states using serialized selection
   - Send `SLATE_GET_FORMAT_STATE_REQUEST` to Admin UI

4. Test selection serialization
   - Test simple selections (single text node)
   - Test complex selections (across multiple nodes)
   - Test selection persistence after updates
   - Test edge cases (empty selection, collapsed selection)

**Deliverable:** Selection accurately serialized/deserialized

### Phase 3: Advanced Operations (Days 5-6)

**Tasks:**
1. Implement deletion operations in slateTransforms.js
   - `applyDeletion(value, selection, direction)`
   - Handle forward delete (Delete key)
   - Handle backward delete (Backspace key)
   - Handle cross-node deletions
   - Handle merged nodes

2. Add `SLATE_DELETE_REQUEST` handler to View.jsx

3. Implement text insertion in slateTransforms.js
   - `insertText(value, selection, text)`
   - Handle replacing selected text
   - Handle inserting at cursor

4. Add `SLATE_INSERT_TEXT_REQUEST` handler to View.jsx

5. Test advanced operations
   - Delete across node boundaries
   - Delete with formatting
   - Insert text replacing selection
   - Insert text with inherited formatting

**Deliverable:** All editing operations working

### Phase 4: Refactoring and Cleanup (Days 7-8)

**Tasks:**
1. Remove old DOM manipulation code from hydra.js
   - Delete `formatSelectedText()` (lines 1453-1477)
   - Delete `unwrapFormatting()` (lines 1479-1535)
   - Delete `unwrapSelectedPortion()` (lines 1537-1594)
   - Delete `unwrapElement()` (lines 1596-1622)
   - Delete `removeEmptyFormattingElements()` (lines 1623-1638)
   - Delete `sendFormattedHTMLToAdminUI()` (lines 1639-1657)
   - Delete `isFormatted()` (lines 1349-1427)
   - ~350 lines removed total

2. Remove `toggleMark.js` utility (no longer needed)

3. Remove `currentFormats` global variable and mouseup handlers

4. Update inline-editing.spec.ts tests
   - Remove workarounds (triple-click, etc.)
   - Test keyboard selection directly
   - Add new tests for cross-node operations
   - Update test comments to reflect new architecture

5. Code review and refactoring
   - Ensure consistent error handling
   - Add logging for debugging
   - Optimize performance (minimize re-renders)
   - Add comments explaining Slate concepts

**Deliverable:** Clean, well-documented codebase

### Phase 5: Testing and Documentation (Days 9-11)

**Tasks:**
1. Run full Playwright test suite
   - Verify all existing tests pass
   - Fix any regressions
   - Add new tests for edge cases discovered

2. Manual testing
   - Test all formatting operations
   - Test keyboard shortcuts
   - Test with screen readers (accessibility)
   - Test in different browsers (Chrome, Firefox, Safari)

3. Update documentation
   - Update CLAUDE.md if needed
   - Add inline code comments
   - Document new message protocol
   - Add troubleshooting section

4. Performance testing
   - Test with large documents
   - Verify no memory leaks
   - Optimize if needed

**Deliverable:** Production-ready code with passing tests

---

## Files to Modify/Create/Delete

### New Files

1. **`packages/volto-hydra/src/utils/slateTransforms.js`**
   - Core Slate transform utilities
   - ~200-300 lines

### Modified Files

1. **`packages/volto-hydra/src/components/Iframe/View.jsx`**
   - Add new message handlers for `SLATE_*` messages
   - ~100 lines added
   - Remove `TOGGLE_MARK` handler (if fully replaced)

2. **`packages/hydra-js/hydra.js`**
   - Add `serializeSelection()`, `deserializeSelection()`
   - Add `getPathFromDOMNode()`, `getDOMNodeFromPath()`
   - Replace mouseup handlers with selectionchange
   - Update button click handlers to send new messages
   - ~200 lines added
   - ~350 lines removed (DOM manipulation code)
   - Net: -150 lines

3. **`tests-playwright/integration/inline-editing.spec.ts`**
   - Update tests to remove workarounds
   - Add new tests for cross-node operations
   - ~50 lines modified/added

### Deleted Files

1. **`packages/volto-hydra/src/utils/toggleMark.js`**
   - No longer needed with Slate transforms approach

### Deleted Code Sections

**In hydra.js:**
- Lines 1453-1477: `formatSelectedText()`
- Lines 1479-1535: `unwrapFormatting()`
- Lines 1537-1594: `unwrapSelectedPortion()`
- Lines 1596-1622: `unwrapElement()`
- Lines 1623-1638: `removeEmptyFormattingElements()`
- Lines 1639-1657: `sendFormattedHTMLToAdminUI()`
- Lines 1349-1427: `isFormatted()`

**Total removed:** ~350 lines

---

## Testing Strategy

### Unit Tests

**slateTransforms.js:**
- Test `createHeadlessEditor()` with various Slate values
- Test `applyFormat()` with all format types
- Test `applyFormat()` with toggle/add/remove actions
- Test `getFormatState()` returns correct active formats
- Test `applyDeletion()` across node boundaries
- Test `insertText()` with and without selection

### Integration Tests (Playwright)

**Existing tests to update:**
- `inline-editing.spec.ts` - Remove triple-click workaround, test keyboard selection
- All tests with `waitForTimeout()` - Replace with condition-based waiting

**New tests to add:**
1. Cross-node formatting
   - Select text across two paragraphs, make bold
   - Verify no text loss
   - Verify both paragraphs have bold text

2. Keyboard selection formatting
   - Use Ctrl+A to select all text in block
   - Apply bold
   - Verify formatting applied

3. Format removal
   - Select bold text
   - Click bold button (toggle off)
   - Verify formatting removed

4. Complex operations
   - Select text with mixed formatting
   - Apply new format
   - Verify correct merge behavior

5. Link operations
   - Create link with keyboard selection
   - Edit link URL
   - Remove link

6. Deletion across nodes
   - Place cursor at end of paragraph 1
   - Press Delete (forward delete into paragraph 2)
   - Verify paragraphs merge correctly

### Manual Testing Checklist

- [ ] Bold/italic/link/strikethrough formatting
- [ ] Keyboard selection (Ctrl+A, Shift+arrows)
- [ ] Mouse selection
- [ ] Mixed formatting (bold + italic)
- [ ] Format toggle (apply/remove)
- [ ] Link creation with URL input
- [ ] Link editing
- [ ] Cross-paragraph operations
- [ ] Delete key (forward)
- [ ] Backspace key (backward)
- [ ] Cut/copy/paste
- [ ] Undo/redo
- [ ] Browser compatibility (Chrome, Firefox, Safari)
- [ ] Screen reader compatibility

---

## Timeline

### Estimated Duration: 8-11 days

**Phase 1:** 2 days
**Phase 2:** 2 days
**Phase 3:** 2 days
**Phase 4:** 2 days
**Phase 5:** 3 days (buffer for testing)

### Milestones

1. **Day 2:** Basic formatting works (bold/italic)
2. **Day 4:** Selection serialization working
3. **Day 6:** All operations implemented
4. **Day 8:** Code cleaned up, old code removed
5. **Day 11:** All tests passing, documentation complete

### Risk Factors

- **Selection serialization complexity**: May take longer than expected
- **Edge cases**: Slate has many corner cases to handle
- **Test failures**: Existing tests may need more updates than anticipated
- **Browser differences**: Selection API behaves differently across browsers

### Mitigation

- Start with simplest cases, add complexity incrementally
- Add extensive logging for debugging
- Test frequently in multiple browsers
- Keep old code until new code is fully tested (temporary fallback)

---

## Appendix: Code Examples

### Example: slateTransforms.js

```javascript
import { createEditor, Transforms, Editor, Range, Text } from 'slate';
import { withReact } from 'slate-react';
import { makeEditor } from '@plone/volto-slate/utils';

/**
 * Creates a headless (non-React) Slate editor instance
 * for applying transforms server-side style
 */
export function createHeadlessEditor(value) {
  const editor = makeEditor(); // Use Volto-Slate's editor factory
  editor.children = value;
  return editor;
}

/**
 * Applies formatting to selection
 *
 * @param {Array} value - Slate document value
 * @param {Object} selection - { anchor: {...}, focus: {...} }
 * @param {string} format - 'bold', 'italic', 'link', 'del'
 * @param {string} action - 'toggle', 'add', 'remove'
 * @param {Object} options - Additional options (e.g., url for links)
 * @returns {Array} Updated Slate document value
 */
export function applyFormat(value, selection, format, action, options = {}) {
  const editor = createHeadlessEditor(value);

  // Set selection
  Transforms.select(editor, selection);

  // Apply format based on action
  if (action === 'toggle') {
    const isActive = Editor.marks(editor)?.[format];
    if (isActive) {
      Editor.removeMark(editor, format);
    } else {
      Editor.addMark(editor, format, true);
    }
  } else if (action === 'add') {
    if (format === 'link' && options.url) {
      // Links are different - they're inline nodes, not marks
      wrapLink(editor, options.url);
    } else {
      Editor.addMark(editor, format, true);
    }
  } else if (action === 'remove') {
    if (format === 'link') {
      unwrapLink(editor);
    } else {
      Editor.removeMark(editor, format);
    }
  }

  return editor.children;
}

/**
 * Gets current format state at selection
 * Used to update button UI (active states)
 */
export function getFormatState(value, selection) {
  const editor = createHeadlessEditor(value);
  Transforms.select(editor, selection);

  const marks = Editor.marks(editor) || {};

  return {
    bold: !!marks.bold,
    italic: !!marks.italic,
    del: !!marks.del,
    link: isLinkActive(editor)
  };
}

/**
 * Checks if selection is inside a link
 */
function isLinkActive(editor) {
  const [link] = Editor.nodes(editor, {
    match: n => n.type === 'a',
  });
  return !!link;
}

/**
 * Wraps selection in a link node
 */
function wrapLink(editor, url) {
  if (isLinkActive(editor)) {
    unwrapLink(editor);
  }

  const { selection } = editor;
  const isCollapsed = selection && Range.isCollapsed(selection);

  const link = {
    type: 'a',
    url,
    children: isCollapsed ? [{ text: url }] : [],
  };

  if (isCollapsed) {
    Transforms.insertNodes(editor, link);
  } else {
    Transforms.wrapNodes(editor, link, { split: true });
  }
}

/**
 * Unwraps link node from selection
 */
function unwrapLink(editor) {
  Transforms.unwrapNodes(editor, {
    match: n => n.type === 'a',
  });
}
```

### Example: View.jsx Message Handler

```javascript
case 'SLATE_FORMAT_REQUEST': {
  try {
    const { blockId, format, action, selection, url, currentValue } = event.data;
    const block = form.blocks[blockId];

    // Use currentValue from iframe if provided (solves race condition)
    // Otherwise fall back to form state (shouldn't happen during inline editing)
    const valueToFormat = currentValue || block?.value;

    if (!valueToFormat) {
      throw new Error(`No value found for block ${blockId}`);
    }

    // Apply format using Slate transforms
    const updatedValue = slateTransforms.applyFormat(
      valueToFormat,  // Use iframe's current value, not potentially stale form state
      selection,
      format,
      action,
      { url }
    );

    // Update form state
    isInlineEditingRef.current = true;
    onChangeFormData({
      ...form,
      blocks: {
        ...form.blocks,
        [blockId]: {
          ...block,
          value: updatedValue,
        },
      },
    });

    // Get updated format state
    const formatState = slateTransforms.getFormatState(
      updatedValue,
      selection
    );

    // Serialize to HTML for iframe rendering
    const html = serialize(updatedValue);

    // Send response
    event.source.postMessage({
      type: 'SLATE_UPDATE_DONE',
      blockId,
      html,
      formatState,
    }, event.origin);

  } catch (error) {
    console.error('Error applying format:', error);
    event.source.postMessage({
      type: 'SLATE_ERROR',
      blockId: event.data.blockId,
      error: error.message,
      originalRequest: event.data,
    }, event.origin);
  }
  break;
}
```

### Example: hydra.js Selection Serialization

```javascript
/**
 * Serializes browser Selection to Slate selection object
 */
function serializeSelection(blockElement) {
  const selection = window.getSelection();
  if (!selection.rangeCount) return null;

  const range = selection.getRangeAt(0);

  return {
    anchor: {
      path: getPathFromDOMNode(range.startContainer, blockElement),
      offset: range.startOffset
    },
    focus: {
      path: getPathFromDOMNode(range.endContainer, blockElement),
      offset: range.endOffset
    }
  };
}

/**
 * Converts DOM node to Slate path using data-node-id attributes
 */
function getPathFromDOMNode(node, blockElement) {
  const path = [];
  let currentNode = node;

  // If text node, start from parent element
  if (currentNode.nodeType === Node.TEXT_NODE) {
    currentNode = currentNode.parentElement;
  }

  // Walk up tree, collecting node IDs
  while (currentNode && currentNode !== blockElement) {
    const nodeId = currentNode.getAttribute('data-node-id');
    if (nodeId) {
      path.unshift(parseInt(nodeId, 10));
    }
    currentNode = currentNode.parentElement;
  }

  return path;
}

/**
 * Format button click handler (new implementation)
 */
function handleFormatClick(format, blockId) {
  const blockElement = document.querySelector(`[data-block-uid="${blockId}"]`);
  const selection = serializeSelection(blockElement);

  if (!selection) {
    console.warn('No selection to format');
    return;
  }

  // Send request to Admin UI
  // Include currentValue to solve race condition with text changes
  window.parent.postMessage({
    type: 'SLATE_FORMAT_REQUEST',
    blockId,
    format,
    action: 'toggle',
    selection,
    currentValue: this.formData.blocks[blockId].value  // Iframe's current Slate value
  }, '*');
}
```

---

## Questions and Open Issues

1. **Undo/Redo**: How should undo/redo work with this architecture? Slate has built-in history, but we're applying transforms server-side.

2. **Performance**: Will creating a headless editor for every operation be performant enough? May need to cache editor instances.

3. **Backwards Compatibility**: Are there any existing users who might be affected by this change? (User indicated no backwards compatibility needed.)

4. **Error Recovery**: What should happen if selection paths become invalid (e.g., content changed while user was editing)?

5. **Multi-block Operations**: Should we support formatting across multiple blocks in the future?

---

## References

- **Issue #147**: https://github.com/pretagov/volto-hydra/issues/147
- **Slate Documentation**: https://docs.slatejs.org/
- **Slate Transforms API**: https://docs.slatejs.org/api/transforms
- **Volto-Slate**: https://github.com/plone/volto/tree/main/packages/volto-slate

---

## Appendix A: Slate.js Internals Research

### Research Findings from Slate.js Source Code

During implementation planning, we researched Slate.js internals to ensure our slateTransforms.js implementation uses proper Slate APIs instead of JSON manipulation.

**Source examined:** `node_modules/slate@0.100.0/`

### Key Findings

#### 1. Headless Editor Creation

**Discovery:** Slate editors don't require React or DOM. You can create "headless" editors for server-side transforms.

**API:**
```javascript
import { createEditor } from 'slate';

const editor = createEditor();
editor.children = slateValue;
editor.selection = { anchor: {...}, focus: {...} };
```

**Why this matters:** We can apply transforms in the Admin UI (Node.js/React environment) without a full SlateEditor component.

#### 2. Marks vs Elements

**Discovery:** Bold, italic, strikethrough are **marks** (properties on text nodes), NOT wrapper elements.

**Wrong approach (DOM manipulation):**
```html
<!-- This is how HTML represents it -->
<p>Hello <strong>world</strong></p>
```

**Correct approach (Slate structure):**
```javascript
// This is how Slate represents it
{
  type: 'p',
  children: [
    { text: 'Hello ' },
    { text: 'world', bold: true }  // mark is a property
  ]
}
```

**Why this matters:** Our JSON manipulation approach was wrong because it tried to mirror HTML structure instead of Slate's structure.

#### 3. Editor.addMark() and Editor.removeMark()

**Discovery:** High-level APIs for applying marks that handle all edge cases.

**API:**
```javascript
import { Editor } from 'slate';

// Add a mark to current selection
Editor.addMark(editor, 'bold', true);

// Remove a mark from current selection
Editor.removeMark(editor, 'bold');

// Check active marks at selection
const marks = Editor.marks(editor);
// Returns: { bold: true, italic: true, ... } or null
```

**Why this matters:** We don't need to manually split nodes or handle edge cases - Slate does it for us.

#### 4. Transforms.setNodes() with split: true

**Discovery:** Low-level API that handles node splitting at selection boundaries.

**Source location:** `node_modules/slate/src/transforms/node.ts`

**API:**
```javascript
import { Transforms } from 'slate';

// Apply property to nodes in selection
Transforms.setNodes(
  editor,
  { bold: true },  // properties to set
  {
    match: n => Text.isText(n),  // only affect text nodes
    split: true  // split nodes at selection boundaries
  }
);
```

**What `split: true` does:**
- If selection starts mid-text: splits text node at start point
- If selection ends mid-text: splits text node at end point
- Applies mark only to text nodes within selection
- Preserves text nodes outside selection

**Example:**
```javascript
// Before:
{ text: 'Hello world' }
// Selection: offset 0-5 ("Hello")

// After Transforms.setNodes with split:true:
[
  { text: 'Hello', bold: true },
  { text: ' world' }
]
```

**Why this matters:** This is the correct way to apply formatting across node boundaries without text loss.

#### 5. Path-Based Operations

**Discovery:** All Slate operations use paths (arrays of indices) to reference nodes.

**Path examples:**
```javascript
[0]        // First child of root
[0, 1]     // Second child of first child
[0, 1, 2]  // Third child of second child of first child
```

**API:**
```javascript
import { Editor, Path } from 'slate';

// Get node at path
const node = Editor.node(editor, [0, 1]);

// Check if path exists
const exists = Editor.hasPath(editor, [0, 1]);

// Navigate paths
const parent = Path.parent([0, 1, 2]);  // [0, 1]
const next = Path.next([0, 1]);         // [0, 2]
```

**Selection structure:**
```javascript
{
  anchor: { path: [0, 1], offset: 5 },
  focus: { path: [0, 2], offset: 10 }
}
```

**Why this matters:** Our selection serialization must convert DOM nodes to paths, and paths are the universal coordinate system.

#### 6. Links are Elements, Not Marks

**Discovery:** Unlike bold/italic, links are inline **elements**, not marks.

**Structure:**
```javascript
{
  type: 'p',
  children: [
    { text: 'Visit ' },
    {
      type: 'a',           // element
      url: 'https://...',
      children: [
        { text: 'our site' }
      ]
    },
    { text: '!' }
  ]
}
```

**API:**
```javascript
import { Transforms } from 'slate';

// Wrap selection in link
Transforms.wrapNodes(
  editor,
  { type: 'a', url: 'https://...', children: [] },
  { split: true }
);

// Unwrap link
Transforms.unwrapNodes(editor, {
  match: n => n.type === 'a'
});
```

**Why this matters:** Link formatting requires different API (`wrapNodes`) than bold/italic (`addMark`).

### Volto-Slate Integration Points

**Source examined:** `core/packages/volto-slate/src/`

#### makeEditor() Utility

**Location:** `core/packages/volto-slate/src/utils/editor.js`

Volto provides `makeEditor()` which creates a Slate editor with Volto-specific plugins:
- History plugin (undo/redo)
- Inline/block handling
- Serialization utilities

**Usage in slateTransforms.js:**
```javascript
import { makeEditor } from '@plone/volto-slate/utils';

function createHeadlessEditor(value) {
  const editor = makeEditor();
  editor.children = value;
  return editor;
}
```

#### Existing Mark Implementation

**Location:** `core/packages/volto-slate/src/utils/marks.js`

Volto already has correct mark implementation we can reference:

```javascript
export function toggleMark(editor, format) {
  const isActive = isMarkActive(editor, format);

  if (isActive) {
    Editor.removeMark(editor, format);
  } else {
    Editor.addMark(editor, format, true);
  }
}

export function isMarkActive(editor, format) {
  const marks = Editor.marks(editor);
  return marks ? marks[format] === true : false;
}
```

### Implementation Guidelines from Research

Based on this research, our slateTransforms.js should:

1. **Use createEditor()** (or Volto's makeEditor()) to create headless editors
2. **Use Editor.addMark()/removeMark()** for bold, italic, strikethrough
3. **Use Transforms.wrapNodes()** for links
4. **Use Transforms.setNodes() with split: true** if we need low-level control
5. **Never manually manipulate JSON** - always use Slate APIs
6. **Work with paths** for selection, not DOM nodes
7. **Treat marks and elements differently** - they have different APIs

### Common Pitfalls to Avoid

❌ **Wrong:** Manually modifying JSON
```javascript
// Don't do this!
newValue = applyFormatToValue(value, format, action);
```

✅ **Right:** Use Slate transforms
```javascript
const editor = createHeadlessEditor(value);
Editor.addMark(editor, format, true);
return editor.children;
```

❌ **Wrong:** Creating wrapper elements for marks
```javascript
// Don't do this!
{ type: 'strong', children: [{ text: 'bold' }] }
```

✅ **Right:** Use mark properties on text
```javascript
{ text: 'bold', bold: true }
```

❌ **Wrong:** Assuming HTML structure matches Slate structure
```javascript
// Don't parse HTML and expect it to map to Slate
const dom = new DOMParser().parseFromString(html, 'text/html');
```

✅ **Right:** Slate JSON is the source of truth, HTML is just rendering
```javascript
// Always work with Slate JSON, render to HTML separately
const html = serialize(slateValue);
```

### Architecture Layers Clarification

This research clarified the three architectural layers:

1. **Slate.js** (External library - `slate` npm package)
   - Core APIs: createEditor(), Editor, Transforms
   - Document model (JSON tree structure)
   - Transform system
   - No rendering logic

2. **Volto-Slate** (Core Volto - `@plone/volto-slate`)
   - React integration (SlateEditor component)
   - Volto-specific plugins and utilities
   - Serialization to/from HTML
   - Used in sidebar for rich text fields

3. **Volto-Hydra** (Addon - `@plone/volto-hydra`)
   - Iframe inline editing
   - PostMessage bridge protocol
   - slateTransforms.js utility (uses Slate.js + Volto-Slate)
   - Coordinates between iframe and Admin UI

**Key insight:** Volto-Hydra should use Slate.js APIs directly (with Volto-Slate utilities when helpful), not create its own JSON manipulation approach.
