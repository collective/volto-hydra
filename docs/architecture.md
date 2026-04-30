# Volto-Hydra Architecture

**Status:** Living document
**Updated:** 2026-04-28

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
6. [Chrome — Admin-Rendered Editor UI](#chrome--admin-rendered-editor-ui)
   - [Why the admin owns the chrome](#why-the-admin-owns-the-chrome)
   - [Pattern: visual in admin, invisible event-capture in iframe](#pattern-visual-in-admin-invisible-event-capture-in-iframe)
   - [Quanta toolbar](#quanta-toolbar)
   - [Block drag (DnD)](#block-drag-dnd)
   - [Scroll lifecycle](#scroll-lifecycle)
   - [Edge-drag (container resize)](#edge-drag-container-resize)
   - [Anti-pattern: chrome inside the iframe](#anti-pattern-chrome-inside-the-iframe)

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

## Data Sent to Iframe

Before sending data to the iframe, View.jsx processes and augments it:

### Schema Defaults

`applySchemaDefaultsToFormData()` iterates all blocks and applies schema defaults to fields that are empty or null. This ensures the frontend receives complete data even when the user hasn't explicitly set all fields.

### Block Path Map

The `blockPathMap` maps each block ID to its location in the nested data structure:

```javascript
{
  "block-1": { path: ["blocks", "block-1"], parentId: null },
  "nested-1": { path: ["blocks", "block-1", "items", "nested-1"], parentId: "block-1" }
}
```

### Block Field Types

The `blockFieldTypes` maps block IDs to their field widget types, so hydra.js knows which fields are editable and how:

```javascript
{
  "block-1": { title: "string", description: "slate", image: "image" }
}
```

### Slate Config

`slateConfig` contains hotkey mappings and toolbar button configuration for rich text editing.

### Function Stripping

Schema enhancers run first to compute the final schema (including dynamic defaults), then functions are stripped from the result before sending since functions can't be serialized via postMessage.

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
- Triggers on `properties` or `toolbarRequestDone` changes
- **Case 1 (toolbar):** When `toolbarRequestDone` is set, sends FORM_DATA with `transformedSelection` from `iframeSyncState.formData`, then updates Redux via `onChangeFormData`
- **Case 2 (properties):** When `properties` changes (sidebar edit, block add, etc.), sends FORM_DATA without selection
- **Echo prevention:** Case 2 skips if:
  1. `processedInlineEditCounterRef` detects the change came from an inline edit already forwarded (fast O(1) counter check)
  2. Content is identical via `formDataContentEqual()` (ignores `_editSequence` metadata)
  See [Echo Prevention (3-Way Sync)](#echo-prevention-3-way-sync) for full design rationale.

**Message handlers:**
- `BLOCK_SELECTED` - Update blockUI and selection atomically
- `SELECTION_CHANGE` - Update current selection
- `SLATE_FORMAT_REQUEST` - Apply format via toolbar editor
- `INLINE_EDIT_DATA` - Update form data from typing
- `BUFFER_FLUSHED` - Trigger pending format button click

**Key functions:**
- `insertAndSelectBlock(blockId, blockType, action, fieldName)` - Unified block insertion

---

## Echo Prevention (3-Way Sync)

The system has a 3-way sync problem: data flows between **iframe** (hydra.js), **admin** (View.jsx), and **Redux** (properties). Each change can echo back through the other components, creating infinite loops or overwriting newer data with stale copies.

### The Problem

When the user types in the iframe:
1. Iframe sends INLINE_EDIT_DATA to admin
2. Admin updates iframeSyncState (direct) AND Redux (async)
3. Redux triggers Unified Form Sync useEffect
4. Without echo prevention, admin would send FORM_DATA back to iframe (echo!)
5. Iframe receives its own text back, possibly overwriting newer keystrokes

### Approaches Considered

Three general approaches to 3-way sync conflict resolution were evaluated:

#### 1. Sequence Numbers (Lamport Clocks)

Each mutation increments a monotonic counter (`_editSequence`). Receivers reject data with a lower sequence than their own.

| Pro | Con |
|-----|-----|
| Gives causal ordering — "this is newer than that" | Every code path must maintain the counter correctly |
| Works even when content is identical | Sequences diverge across async boundaries (Redux) |
| Compact (single integer) | Admin-side changes inherit stale sequences from Redux |
| | Universal adoption, per-branch stamping, stripping — complex and error-prone |

#### 2. Content Comparison

Compare actual data at each boundary. If content matches what we already have, it's an echo — skip it.

| Pro | Con |
|-----|-----|
| Simple — correct by definition | Can't distinguish "same content, different logical state" |
| No state to maintain across boundaries | O(n) comparison cost (acceptable in practice) |
| Works for all code paths automatically | |

#### 3. Focus-Based Locking / Merge

Track where the user is acting. Only the "owner" (iframe or sidebar) writes to the shared state. Or: merge incoming data with local state, preserving the field being edited.

| Pro | Con |
|-----|-----|
| Both changes preserved immediately (merge) | Can't instrument custom sidebar panels (they write to Redux directly) |
| Better UX — sidebar edits not delayed | Merge requires careful handling of stale buffer snapshots |
| | Re-rendering during merge could disrupt contenteditable |

### Current Design: Layered Approach

The system uses different mechanisms at each boundary, chosen for what works best at that layer:

#### Admin Side (View.jsx → iframe)

Echo prevention uses **content comparison + source tracking**:

1. **`processedInlineEditCounterRef`** (source tracking): Counts inline edits processed. When Redux triggers Unified Form Sync, the counter detects "this change came from an inline edit I already forwarded" and skips it. Fast O(1) check.

2. **`formDataContentEqual()`** (content comparison): Catches any remaining echoes where content is identical. Handles all code paths (sidebar edits, block add/delete, etc.) without needing sequence numbers.

Sequence-based echo prevention was removed from the admin side because admin-side changes (delete, add) go through Redux which has stale `_editSequence`, causing genuinely new data to be incorrectly rejected.

#### Iframe Side (hydra.js receiving FORM_DATA)

Uses **sequence numbers** because the iframe may have **unsent buffered text** (typing debounced at 300ms) that content comparison can't protect:

- Iframe increments `_editSequence` when buffering text and before sending transforms
- When FORM_DATA arrives: `incomingSeq < localSeq` → reject as stale
- Exception: format responses (`formatRequestId`) are never rejected

This protects against: user types "ab", admin sends FORM_DATA with old text "a" (from sidebar edit). Content IS different (sidebar changed Title), but text "a" is stale. Sequence check rejects it. When buffer flushes, admin gets both changes.

#### Iframe Side (hydra.js sending updates)

Uses **content comparison** via `lastReceivedFormData` + `focusedFieldValuesEqual()`:

- After rendering FORM_DATA, save it as `lastReceivedFormData`
- Before buffering a text update, compare current state against `lastReceivedFormData`
- If content matches → echo of what we just rendered → skip

#### Admin ↔ Iframe coordination

Uses **blocking + flush** for transform operations:

- Toolbar button click → FLUSH_BUFFER → iframe sends pending text → blocks editor → admin processes → FORM_DATA → unblock
- Hotkey/Enter/Backspace → iframe flushes locally → blocks → sends transform request → admin processes → FORM_DATA → unblock

The blocking mechanism ensures there is never pending text AND incoming FORM_DATA simultaneously during transform processing. This eliminates the need for merge/locking during the most common conflict scenarios.

### Why Not Sequence Numbers on Admin Side?

The admin side has two data sources: `iframeSyncState` (updated directly from iframe messages) and `properties` (updated async via Redux). Sequence numbers fail here because:

1. **Redux strips sequences**: INLINE_EDIT_DATA strips `_editSequence` before updating Redux (to prevent sidebar edits from inheriting stale sequences)
2. **Admin changes have no sequence**: Block delete/add creates data from `properties` which has no `_editSequence` or a stale one
3. **Universal adoption creates gaps**: Adopting iframe's sequence makes admin's counter jump ahead, then Redux changes with lower sequences are incorrectly rejected

Content comparison avoids all these issues — it doesn't matter what sequence the data has, only whether the content actually changed.

---

## Chrome — Admin-Rendered Editor UI

"Chrome" here means everything the editor draws on top of the user's content: selection outlines, the Quanta toolbar, the block drag handle, multi-select rects, edge-drag handles, the "+" add button, etc. None of this is part of the page being authored — it's the editor's own UI.

### Why the admin owns the chrome

The iframe contains the *content* (the rendered page); the admin contains the *editor*. The primary reason the admin owns the chrome is **isolation from the frontend**:

- The user's frontend ships its own CSS, layout, scripts, third-party widgets, etc. Anything we render *inside* the iframe is at the mercy of that — global selectors, reset stylesheets, transform/overflow contexts, accidental z-index regimes, and scripts that mutate the DOM can all distort or hide our chrome.
- Anything we render *outside* the iframe is in the admin's own React tree, with our own styles. The frontend can't reach it. The chrome looks and behaves the same regardless of what frontend the user has loaded (Volto, Nuxt, Next.js, F7, custom).

Two secondary reasons follow from the same split:

- **Lifecycle.** Selection state, multi-select state, scroll state, focus, mode (text vs block), and chrome visibility are React state in `View.jsx`. Rendering chrome from React means it follows React's normal lifecycle automatically — unmounts when selection clears, repositions when `blockUI.rect` changes, hides during scroll, suppresses itself during multi-select, etc.
- **Z-order.** The admin sits above the iframe; portal-mounted React elements can layer over the iframe content without z-index gymnastics inside the page.

The iframe's job is to **measure** (compute bounding rects in iframe coordinates) and **report** (`postMessage` rects to admin), nothing more.

### Pattern: visual in admin, invisible event-capture in iframe

When chrome needs to receive mouse events that target the *iframe content underneath* (drag handles, edge handles), we use a two-element pattern:

- **Admin side**: a visible div positioned via `blockUI` rects, styled however we want, with `pointerEvents: 'none'`. It's purely cosmetic.
- **Iframe side**: an invisible (or transparent) div at the same iframe-coordinates with `pointerEvents: 'auto'`, attached to `document.body` inside the iframe. It owns the actual `mousedown` / `mousemove` / `mouseup` / `click` listeners.

Because the admin visual has `pointerEvents: 'none'`, mouse events pass through it to the iframe — and the iframe's invisible element catches them. Drag computations stay where they need to (in hydra.js, with access to iframe DOM rects), while the visuals stay where they belong (in the admin, with React lifecycle).

Codified by `createDragHandle` in `packages/hydra-js/hydra.src.js` (see comment at the top of that method). The Quanta toolbar's drag-button is the original example.

### Quanta toolbar

- **Visual** (admin): `SyncedSlateToolbar.jsx` — rendered as a portal whose position is computed from `blockUI.rect`. Buttons are real Slate buttons inside a synthetic Slate context (see [Key Components](#key-components)).
- **Iframe**: contributes nothing visible. It computes the block's rect, sends `BLOCK_SELECTED { rect, focusedFieldName, focusedFieldRect, ... }`, and that's it.
- **Lifecycle**: hides on selection clear (`blockUI` becomes null), during multi-select (`multiSelectedUids.length > 1`), during scroll (`HIDE_BLOCK_UI` from iframe scroll handler), and during DnD (`grabbing` class).

### Block drag (DnD)

- **Visual** (admin): a `volto-hydra-drag-button` div positioned over the block's top-left corner, rendered from `blockUI` data, `pointerEvents: 'none'`.
- **Iframe**: an *invisible* `volto-hydra-drag-button` div, also positioned over the block's top-left corner inside `document.body` (iframe), `pointerEvents: 'auto'`. Owns mousedown for drag start and mousemove during drag (with auto-scroll, drop-indicator placement, and `MOVE_BLOCKS` postMessage on release).
- The user sees the admin's visible button; their click passes through to the iframe's invisible one. Drag computations have access to iframe block rects directly.
- **Lifecycle**: same as toolbar — both elements update from selection, hide on scroll, etc.

### Scroll lifecycle

The iframe scrolls independently of the admin (the iframe's `body` has its own scroll position). When the user scrolls the iframe:

1. Iframe-side hydra listens for `scroll` and posts `HIDE_BLOCK_UI` to admin.
2. Admin hides chrome (toolbar, outline, drag button) until selection settles.
3. Iframe re-emits `BLOCK_SELECTED` with the new rect once scroll settles.
4. Admin re-renders chrome at the new rect.

Anything chrome-like the iframe draws inside its own DOM **does not** participate in this — it stays at its last computed position regardless of admin scroll. That's the second reason chrome belongs in the admin: scroll behaviour comes for free.

### Edge-drag (container resize)

Edge-drag — drag a container's edge to absorb adjacent blocks (or expel children) — follows the same pattern:

- **Iframe** (`hydra.src.js`): for the selected container, computes 4 edge rects (top/bottom/left/right) plus per-edge `canAbsorb` / `canExpel` flags, attaches them to `BLOCK_SELECTED` (or a dedicated `EDGE_RECTS_UPDATED` message). It also creates 4 invisible event-capture divs in `document.body` aligned to those rects, with mousedown handlers that run absorb/expel computation and emit `MOVE_BLOCKS` on release.
- **Admin** (`View.jsx`): renders 4 visible edge handles + the translucent "growth box" overlay + per-block tints during a drag, all positioned from `blockUI.edgeRects`. `pointerEvents: 'none'` on the visuals so they pass through to the iframe.
- **Lifecycle**: piggybacks on `blockUI` — handles disappear when selection changes, when scrolling, when multi-select is active, etc.

Earlier versions of edge-drag rendered the visible handles **inside the iframe** (see [Anti-pattern](#anti-pattern-chrome-inside-the-iframe)). That re-introduced exactly the bugs this architecture exists to avoid: handles persisted across selection changes, didn't hide on scroll, and could co-exist with the admin's `.volto-hydra-block-outline` to produce two simultaneous selection rects.

### Frontend's focus styling on selected blocks

Hydra's `selectBlock` calls `.focus()` (after setting `tabindex="-1"`) on the selected block when it has no editable text fields. This is plumbing — without focus inside the iframe, keydown events fire on the parent admin window instead of being caught by the iframe's document keyboard blocker. It is not "the block is selected, so it has focus" — selection is an editor concept tracked in admin Redux, focus is a DOM concept.

Frontends are free to style `:focus` on their blocks however they like. The only request: **on container blocks (gridBlock, columns, accordion, etc.) that you give a `border-radius` on the `data-block-uid` element, suppress the browser's default `:focus` outline** — otherwise it traces a rounded blue rectangle that looks indistinguishable from a selection outline and stacks visually on top of the admin's chrome. Tailwind: add `focus:outline-none`. Vanilla CSS: `[data-block-uid]:focus { outline: none; }` scoped to the relevant blocks.

Hydra does not inject CSS to suppress this — that would override the frontend's styling for `:focus` everywhere and is wrong on principle (frontend owns its CSS).

### Anti-pattern: chrome inside the iframe

If you find yourself doing any of the following in `hydra.src.js`, stop and reconsider:

- Calling `document.body.appendChild(...)` to add a *visible* div (border, background, shadow, etc.).
- Using `position: 'fixed'` for chrome (it's fixed to the iframe viewport, which doesn't scroll the way the user expects).
- Reaching for a manual cleanup pass on selection change or scroll to hide your visual.
- Building your own state machine for "is this currently the selected block".

The fix in every case is: hand the geometry to the admin via `BLOCK_SELECTED` (or a dedicated message), let React render the visible chrome from `blockUI`, and keep an invisible event-capture div on the iframe side if you also need to handle mouse events.

---

## References

- **Slate Documentation**: https://docs.slatejs.org/
- **Slate Transforms API**: https://docs.slatejs.org/api/transforms
- **Issue #147**: https://github.com/pretagov/volto-hydra/issues/147
