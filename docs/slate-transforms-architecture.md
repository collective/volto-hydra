# Slate Transforms Architecture

**Status:** Implemented
**Updated:** 2025-12-19

## Table of Contents

1. [Overview](#overview)
2. [Data Flow](#data-flow)
   - [Flow 1: Format Button Clicked](#flow-1-format-button-clicked-toolbar--iframe)
   - [Flow 2: Sidebar Editing](#flow-2-sidebar-editing-sidebar--redux--toolbar)
   - [Flow 3: Hotkey Format](#flow-3-hotkey-format-iframe--admin--iframe)
   - [Flow 4: Block Selection](#flow-4-block-selection-iframe--admin)
   - [Flow 5: Block Add](#flow-5-block-add-sidebar-or-iframe--admin--iframe)
3. [Bridge Protocol](#bridge-protocol)
4. [Selection Serialization](#selection-serialization)
5. [Key Components](#key-components)

---

## Overview

The Volto-Hydra inline editing system enables rich text editing in an iframe while keeping all Slate transforms in the Admin UI. This architecture:

- **Prevents text loss** when formatting across node boundaries
- **Supports keyboard shortcuts** (Ctrl+B, etc.) from the iframe
- **Maintains consistent button states** via synchronized selection
- **Eliminates race conditions** via flush/requestId mechanism

### Component Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Admin UI (Volto)                       │
│                   packages/volto-hydra/                     │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  View.jsx                                            │  │
│  │  - Manages form state (Redux)                        │  │
│  │  - Receives postMessage from iframe                  │  │
│  │  - Sends FORM_DATA back to iframe                    │  │
│  └──────────────────────────────────────────────────────┘  │
│                          │                                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  SyncedSlateToolbar                                  │  │
│  │  - Real Slate editor synchronized with iframe        │  │
│  │  - Renders actual Volto-Slate toolbar buttons        │  │
│  │  - Applies transforms via Slate APIs                 │  │
│  │  - Exposed as window.voltoHydraToolbarEditor         │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                           │
                           │ postMessage
                           │
┌──────────────────────────┼──────────────────────────────────┐
│                          ▼                                  │
│              Frontend Iframe (User's Site)                  │
│                packages/hydra-js/                           │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  hydra.js (Bridge)                                   │  │
│  │  - Sets up contenteditable blocks                    │  │
│  │  - Captures selection and sends to Admin UI          │  │
│  │  - Handles keyboard shortcuts → SLATE_FORMAT_REQUEST │  │
│  │  - Receives FORM_DATA and re-renders content         │  │
│  │  - Restores selection after updates                  │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Data Flow

### FLOW 1: Format Button Clicked (Toolbar → Iframe)

Uses a flush/requestId mechanism to ensure the iframe sends any pending text before formatting:

```
1. User clicks format button (e.g., Bold) in toolbar
2. onMouseDownCapture intercepts BEFORE Slate handles it
3. Generate requestId, send FLUSH_BUFFER to iframe
   - Iframe immediately sends any pending text changes
   - Iframe sets contenteditable=false (blocks input)
4. Iframe receives FLUSH_BUFFER, replies BUFFER_FLUSHED
5. View.jsx receives BUFFER_FLUSHED, updates form data
6. useEffect triggers the actual button click
7. Slate button applies transform to toolbar editor
8. handleChange fires with new value
9. FORM_DATA sent to iframe with formatRequestId
10. Iframe unblocks editor, re-renders with formatted content
```

**Why flush?** Without it, user might type "hello", click Bold, but iframe hasn't sent "hello" yet—so only partial text gets formatted.

### FLOW 2: Sidebar Editing (Sidebar → Redux → Iframe)

When user edits via the sidebar RichTextWidget:

```
1. User edits in sidebar editor
2. Sidebar onChange updates Redux form state
3. Unified Form Sync useEffect triggers (formDataFromRedux changed)
4. JSON.stringify comparison detects data changed
5. Updates iframeSyncState (formData, blockPathMap, validates selection)
6. Sends FORM_DATA to iframe
7. SyncedSlateToolbar receives new props, re-renders
8. Iframe receives FORM_DATA and re-renders
```

**Key:** No flush needed—changes originate from sidebar. Echo prevention via JSON comparison ensures we don't send data back that came from the iframe.

### FLOW 3: Hotkey Format (Iframe → Admin → Iframe)

When user presses Ctrl+B in iframe:

```
1. User presses Ctrl+B in iframe
2. hydra.js hotkey handler detects shortcut
3. hydra.js flushes pending text (synchronous)
4. hydra.js generates requestId, blocks editor
5. hydra.js sends SLATE_FORMAT_REQUEST to admin
6. View.jsx calls applyFormat() on toolbar editor
7. Toolbar editor onChange fires, updates Redux
8. FORM_DATA sent to iframe with formatRequestId
9. Iframe unblocks editor, re-renders content
```

**Key difference:** No FLUSH_BUFFER round-trip—iframe already has latest text.

### FLOW 4: Block Selection (Iframe → Admin)

When user clicks a different block:

```
1. User clicks block in iframe
2. hydra.js selectBlock() called
3. Block focused, selection established via caretRangeFromPoint
4. Inside requestAnimationFrame (after selection set):
   - BLOCK_SELECTED sent with BOTH blockUid AND selection
5. View.jsx receives BLOCK_SELECTED
6. Sets blockUI state and selection atomically
7. Calls onSelectBlock to update parent
```

**Why atomic?** Previously BLOCK_SELECTED and SELECTION_CHANGE were separate messages. When switching blocks quickly, toolbar could get new block ID but old selection, causing "Cannot find descendant at path" errors.

**Note:** `OPEN_SETTINGS` (which opens the sidebar) does NOT call `onSelectBlock`. Selection is handled exclusively by `BLOCK_SELECTED`. This prevents race conditions where the sidebar opens but the toolbar doesn't see the selection yet.

### FLOW 5: Block Add (Sidebar or Iframe → Admin → Iframe)

Both sidebar add (via ChildBlocksWidget "+") and iframe add (via overlay "+" button) use `insertAndSelectBlock(blockId, blockType, action, fieldName)`:

```
1. User clicks add button (sidebar or iframe)
2. Determine allowedBlocks for insertion context
3. If single allowedBlock: auto-insert via insertAndSelectBlock
   Else: show BlockChooser, then call insertAndSelectBlock on selection
4. insertAndSelectBlock:
   a. Creates block data with defaults
   b. Calls insertBlockInContainer(blockId, newBlockId, blockData, containerConfig, action)
   c. onChangeFormData(newFormData) - updates Redux
   d. flushSync: set pendingSelectBlockUid flag
   e. Opens sidebar tab
5. Unified Form Sync useEffect triggers (formDataFromRedux changed)
6. hasPendingSelect=true, so sends FORM_DATA with selectedBlockUid
7. Iframe receives FORM_DATA, calls selectBlock(selectedBlockUid)
8. Iframe sends BLOCK_SELECTED back to admin
9. View.jsx receives BLOCK_SELECTED
10. Sets blockUI (toolbar overlay) AND calls onSelectBlock (Redux)
```

**insertAndSelectBlock API:**
- `blockId`: Reference block for positioning
- `blockType`: Type of block to create (e.g., 'slate', 'image')
- `action`: 'before' | 'after' | 'inside'
- `fieldName`: For 'inside' action, which container field

**Why flushSync?** Without it, there's a race condition:
- `onChangeFormData` dispatches Redux update
- Redux update triggers component re-render
- useEffect runs with new formData but OLD state (pendingSelectBlockUid not yet committed)
- FORM_DATA is sent WITHOUT selectedBlockUid
- Block never gets selected

With `flushSync`, the state update commits synchronously, before the Redux dispatch can trigger the useEffect.

### Selection Restoration

After formatting, iframe restores user's selection using `data-node-id` attributes:

```
1. FORM_DATA arrives with savedSelection
2. hydra.js calls restoreSelectionFromSlate(savedSelection)
3. For each point (anchor/focus):
   a. Walk path to find DOM element with matching data-node-id
   b. Use findChildBySlateIndex() to find correct text node
   c. findChildBySlateIndex skips zero-width space nodes (ZWS)
4. Create Range and apply to window.getSelection()
```

**Why findChildBySlateIndex?** DOM may contain ZWS nodes (`\u200B`) for cursor positioning that Slate doesn't know about.

---

## Bridge Protocol

### Messages: Iframe → Admin UI

#### `BLOCK_SELECTED`
User clicked/focused a block. Includes selection for atomic update.

```javascript
{
  type: 'BLOCK_SELECTED',
  blockUid: string,
  rect: { top, left, width, height },
  showFormatButtons: boolean,
  focusedFieldName: string,
  selection: {  // Included for atomic update
    anchor: { path: number[], offset: number },
    focus: { path: number[], offset: number }
  }
}
```

#### `SELECTION_CHANGE`
Selection changed within current block.

```javascript
{
  type: 'SELECTION_CHANGE',
  blockUid: string,
  selection: {
    anchor: { path: number[], offset: number },
    focus: { path: number[], offset: number }
  }
}
```

#### `SLATE_FORMAT_REQUEST`
Keyboard shortcut triggered formatting.

```javascript
{
  type: 'SLATE_FORMAT_REQUEST',
  blockUid: string,
  format: 'bold' | 'italic' | 'del' | 'underline',
  requestId: string,
  selection: { anchor, focus }
}
```

#### `INLINE_EDIT_DATA`
Text content changed via typing.

```javascript
{
  type: 'INLINE_EDIT_DATA',
  blockUid: string,
  fieldName: string,
  value: SlateValue  // Array of Slate nodes
}
```

#### `BUFFER_FLUSHED`
Response to FLUSH_BUFFER—pending text has been sent.

```javascript
{
  type: 'BUFFER_FLUSHED',
  requestId: string
}
```

### Messages: Admin UI → Iframe

#### `FORM_DATA`
Updated content after any change.

```javascript
{
  type: 'FORM_DATA',
  data: FormData,
  formatRequestId?: string,  // If responding to format request
  savedSelection?: {         // Selection to restore
    anchor: { path, offset },
    focus: { path, offset }
  }
}
```

#### `FLUSH_BUFFER`
Request iframe to send pending text immediately.

```javascript
{
  type: 'FLUSH_BUFFER',
  requestId: string
}
```

#### `INITIAL_DATA`
Sent when iframe first connects.

```javascript
{
  type: 'INITIAL_DATA',
  data: FormData,
  blockFieldTypes: Object,
  slateConfig: { hotkeys, toolbarButtons }
}
```

---

## Selection Serialization

### DOM to Slate Conversion

`serializeSelection()` in hydra.js converts browser Selection to Slate format by walking up the DOM tree using `data-node-id` attributes to build a Slate path.

### Slate to DOM Conversion

`restoreSelectionFromSlate()` converts Slate selection back to browser Selection by walking down using `data-node-id` to find DOM nodes, then using `findChildBySlateIndex()` to handle ZWS nodes.

### NodeId System

Both iframe and Admin UI use `data-node-id` attributes to map between different HTML representations:

- **Slate JSON** is the source of truth
- **Iframe HTML** rendered by user's frontend (may use `<b>`)
- **Admin UI HTML** rendered by Volto (may use `<strong>`)
- **NodeIds** provide mapping between these representations

```html
<!-- Iframe -->
<p data-node-id="1">
  <span data-node-id="2">Hello </span>
  <b data-node-id="3">world</b>
</p>

<!-- Admin UI -->
<p data-node-id="1">
  <span data-node-id="2">Hello </span>
  <strong data-node-id="3">world</strong>
</p>
```

**Renderer Contract:** ALL elements that render a single Slate node MUST have the same `data-node-id`:

```jsx
// Correct: both wrapper elements have the nodeId
const renderLeaf = ({ children, leaf }) => {
  let result = <span data-node-id={leaf.nodeId}>{children}</span>;
  if (leaf.bold) {
    result = <strong data-node-id={leaf.nodeId}>{result}</strong>;
  }
  if (leaf.italic) {
    result = <em data-node-id={leaf.nodeId}>{result}</em>;
  }
  return result;
};
```

This allows hydra.js to walk up from any DOM node and find the correct Slate node by its nodeId.

### Zero-Width Space (ZWS) Handling

Hydra inserts zero-width space characters (`\u200B`) to solve cursor positioning problems in empty elements. Without ZWS, browsers cannot place a cursor inside an empty `<strong></strong>` or similar element.

**Problem solved:** When user clicks inside an empty formatted element, the browser needs a text node to position the cursor. Hydra adds ZWS as a placeholder.

**Selection restoration challenge:** When restoring selection, Slate paths don't account for these ZWS nodes. A path like `[0, 1]` means "second child" in Slate terms, but the DOM may have ZWS nodes that shift indices.

**Solution:** `findChildBySlateIndex()` in hydra.js counts only "real" text nodes, skipping ZWS-only nodes when mapping Slate paths to DOM nodes.

---

## Key Components

### SyncedSlateToolbar

`packages/volto-hydra/src/components/Toolbar/SyncedSlateToolbar.jsx`

Creates a real Slate editor synchronized with:
- Current block's value (from Redux)
- Current selection (from iframe)

Real Slate buttons rendered inside Slate context can:
- Access editor via `useSlate()` hook
- Determine active state via `isBlockActive`/`isMarkActive`
- Execute transforms directly
- Work automatically including custom plugin buttons

### hydra.js Bridge

`packages/hydra-js/hydra.js`

Key methods:
- `selectBlock()` - Focus block, send BLOCK_SELECTED with selection
- `serializeSelection()` - Convert DOM selection to Slate format
- `restoreSelectionFromSlate()` - Restore selection after updates
- `findChildBySlateIndex()` - Find text node, skipping ZWS nodes
- `handleHotkey()` - Send SLATE_FORMAT_REQUEST for keyboard shortcuts

### View.jsx

`packages/volto-hydra/src/components/Iframe/View.jsx`

**Unified Form Sync useEffect:** Single useEffect handles both state sync and iframe communication:
- Triggers on `formDataFromRedux` or `toolbarRequestDone` changes
- Updates `iframeSyncState` (formData, blockPathMap, validates selection)
- Sends FORM_DATA to iframe when data changed or pendingSelectBlockUid set
- Echo prevention via JSON.stringify comparison of blocks

**Message handlers:**
- `BLOCK_SELECTED` - Update blockUI and selection atomically
- `SELECTION_CHANGE` - Update current selection
- `SLATE_FORMAT_REQUEST` - Apply format via toolbar editor
- `INLINE_EDIT_DATA` - Update form data from typing
- `BUFFER_FLUSHED` - Trigger pending format button click

**Key functions:**
- `insertAndSelectBlock(blockId, blockType, action, fieldName)` - Unified block insertion

---

## References

- **Slate Documentation**: https://docs.slatejs.org/
- **Slate Transforms API**: https://docs.slatejs.org/api/transforms
- **Issue #147**: https://github.com/pretagov/volto-hydra/issues/147
