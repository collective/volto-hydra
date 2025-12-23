# Bug Investigation: Rapid Typing Loses Keystrokes in Sidebar

## Summary

**Root Cause**: Stale closure in Form.jsx's `onChangeFormData` callback.

When typing rapidly in the iframe, the second+ keystrokes don't appear in the sidebar. The sidebar gets stuck showing only the first keystroke. This manifests more reliably when typing before inline formatting (bold), likely due to timing differences.

## Confirmed Test Results (Dec 2024)

| Test | Position | Result |
|------|----------|--------|
| `typing before bold: second keystroke fails to sync` | children[0] (before bold) | ✘ FAILS |
| `typing after bold: all keystrokes sync correctly` | children[2] (after bold) | ✓ PASSES |

Both tests use the same block (`text-after`) on the same page (`/carousel-test-page`).

## Block Structure

```json
{
  "type": "p",
  "children": [
    { "text": "This text appears after the slider. Click on " },  // children[0] - FAILS
    { "type": "strong", "children": [{ "text": "bold text" }] },  // children[1]
    { "text": " to test getNodePath." }                           // children[2] - WORKS
  ]
}
```

## File Location

- **Test file**: `tests-playwright/integration/inline-editing-basic.spec.ts`

## Observed Behavior

### What Works
- First keystroke syncs correctly to sidebar
- Typing in children[2] (after bold) syncs all keystrokes correctly

### What Fails
- Second+ keystrokes in children[0] (before bold) don't update the sidebar
- Sidebar gets stuck at the first keystroke value

## Test Run Analysis (Dec 2024)

### Timeline of Events
```
5022ms: flushPendingTextUpdates sends seq 3 with "This text 12appears..."
5023ms: INLINE_EDIT_DATA seq 3 received, onChangeFormData called
5034ms: TOOLBAR SYNC: incomingSeq: 2, lastSeenSeq: 2 (hasn't seen seq 3 yet)
5042ms: TOOLBAR SYNC: incomingSeq: 2, lastSeenSeq: 2 (still waiting)
5061ms: TOOLBAR SYNC: incomingSeq: 3, contentNeedsSync: TRUE
5061ms: "Syncing content from iframe" with selection offset 12
5062ms: TOOLBAR onChange called with selection offset 12
5227ms: TEST POLL - sidebar STILL shows "1" not "12"!
```

### Key Observations

1. The iframe correctly sends "12" to the Admin
2. The toolbar sees `contentNeedsSync: true` and "Syncing content from iframe" is logged
3. `onChange` is called with the correct selection (offset 12 = after "12")
4. But the sidebar still shows "1" 165ms later

### Initial Hypothesis: Position Matters (WRONG)

Initial observation suggested typing AFTER bold works but BEFORE bold fails. This led us down the wrong path investigating childIndex handling, nodeId tracking, etc.

**Actual cause**: The position difference was a red herring. The real issue is a stale closure in Form.jsx that causes rapid updates to use outdated state. The timing happens to be more reliable when typing after bold, making it appear position-specific.

## Root Cause Investigation (Dec 2024)

### Initial Theory: Stale Closure (DISPROVEN)

Initially thought the bug was a stale closure in Form.jsx's `onChangeFormData` callback.

**Location**: `packages/volto-hydra/src/customizations/volto/components/manage/Form/Form.jsx` lines 712-727

**The Problem**:

```javascript
// Line 657 in render():
const formData = this.state.formData;

// Line 712-727 - callback closes over `formData` from render time:
onChangeFormData={(newData) => {
  const newFormData = {
    ...formData,  // <-- STALE! Uses formData from when callback was created
    ...newData,
  };
  this.setState({ formData: newFormData });
}}
```

**What happens with rapid updates**:

1. Render 1: `formData` = original text ("appears")
2. seq 1 arrives ("1appears"), callback uses `formData` from Render 1 → merges correctly
3. setState triggers Render 2
4. Render 2: `formData` = seq 1 data ("1appears")
5. **seq 2 arrives ("12appears"), BUT callback was created in Render 1**
6. Callback still uses stale `formData` from Render 1 ("appears")!
7. Merge: `{ ...originalData, ...seq2Data }` - loses seq 1 changes

**Evidence from logs**:
```
[FORM] onChangeFormData seq: 2 newText: This text 12appears...  // Form.jsx RECEIVES correct data
[SIDEBAR] ParentBlocksWidget render, block: text-after text: "This text 1appears..."  // But sidebar gets STALE data
```

Form.jsx receives seq 2 with "12appears", but ParentBlocksWidget (which gets `properties={formData}`) renders with "1appears" because the stale closure merged seq 2 onto the original data instead of seq 1 data.

### Why This Theory Was WRONG

Detailed logging showed the Form.jsx merge is actually **working correctly**:

```
[FORM] onChangeFormData seq: 2
  newData  child0: "This text 12appears..."
  stale    child0: "This text 1appears..."   ← Previous value (correct!)
  merged   child0: "This text 12appears..."  ← Merge is CORRECT!
```

The merge produces the right result. The issue is downstream - something between Form.jsx and the sidebar's SlateEditor.

### Current Status: Slate DOM Update Issue Found

The logs show the **entire React data flow is correct**:
1. Form.jsx receives and merges data correctly → "12appears"
2. ParentBlocksWidget receives correct blockData → "12appears"
3. ParentBlockSection passes correct data to BlockEdit → "12appears"
4. SlateEditor receives correct propsText → "12appears"
5. SlateEditor syncs: `editor.children = value` → "12appears"
6. **But the DOM still shows "1appears"!**

This is a **Slate rendering bug**, not a React data flow issue.

### Root Cause: Slate Direct Mutation Doesn't Trigger DOM Update

The sidebar's SlateEditor uses direct mutation to sync external changes:

```javascript
// core/packages/volto-slate/src/editor/SlateEditor.jsx componentDidUpdate
editor.children = this.props.value;  // Direct mutation!
```

**The problem**: Direct mutation of `editor.children` doesn't always trigger Slate's React reconciliation for text nodes, especially for `children[0]` (before inline formatting). The internal Slate state updates, but the DOM doesn't re-render.

**Why "after bold" works but "before bold" fails:**
- Typing in `children[2]` (after bold) → Slate DOM updates correctly
- Typing in `children[0]` (before bold) → Slate DOM doesn't update

This appears to be a position-specific Slate bug where text node updates before inline elements (like `<strong>`) don't trigger proper DOM reconciliation when using direct assignment.

### Potential Fixes

1. **Use Slate Transforms instead of direct assignment** - Replace `editor.children = value` with proper Slate operations
2. **Force React re-render** - After setting `editor.children`, trigger a state update to force re-render
3. **Use Editor.withoutNormalizing** - Wrap the assignment to prevent Slate's normalization from interfering

### Attempted Fix: Use `properties` Instead of Redux

Changed View.jsx's useEffect to depend on `properties` (Form's local state) instead of `formDataFromRedux`. This did NOT fix the issue - the test still fails.

**The Fix (NOT WORKING)**:

Use functional setState to always get the latest state:

```javascript
onChangeFormData={(newData) => {
  this.setState((prevState) => ({
    formData: {
      ...prevState.formData,  // Always uses latest state
      ...newData,
    }
  }));
}}
```

### Why "after bold" works but "before bold" fails

This is likely a **timing coincidence**. When typing after the bold element:
- The text change is in `children[2]`, not `children[0]`
- The logging only shows `children[0]` text, so we don't see the actual changes
- The merge might happen to work due to different timing

The real test is: does the stale closure issue affect the specific block data being updated? If `newData.blocks['text-after']` fully replaces the block, the stale closure wouldn't matter. But if it's a partial merge, the timing of renders matters.

## Debugging Approach That Found the Bug

1. **Added sequence logging everywhere** - tracked `_editSequence` through the entire flow
2. **Centralized incoming data** - created `setFormDataFromAdmin()` in hydra.js to log all incoming data with sequence numbers
3. **Compared component renders** - logged what ParentBlocksWidget received vs what Form.jsx logged
4. **Key insight**: Form.jsx logged receiving seq 2 with "12appears", but ParentBlocksWidget rendered with "1appears" - this pointed to the state update, not the data flow

## Previous Fix Attempts (Before Finding Root Cause)

1. **Sequence tracking fix**: Fixed `lastSeenSequenceRef` to only update when content is actually synced (not just when `hasNewData` is true). This fixed prospective formatting but didn't address this issue.

2. **contentNeedsSync logic**: Changed from requiring both `hasNewData` AND content difference to just content difference.

3. **Echo detection in bufferUpdate**: Simplified to only check against lastReceivedFormData at buffer time, assign sequence at send time.

## Next Steps

1. **Apply the fix**: Change Form.jsx to use functional setState
2. **Run tests**: Verify both "before bold" and "after bold" tests pass
3. **Remove debug logging**: Clean up temporary console.log statements added during investigation

## Related Code Paths

- **Form.jsx**: `onChangeFormData` callback (THE BUG)
- **View.jsx**: Passes `properties` to ParentBlocksWidget
- **ParentBlocksWidget.jsx**: Receives formData, passes to BlockEdit
- **hydra.js**: `setFormDataFromAdmin()` - centralized incoming data handling
- **hydra.js**: `bufferUpdate()` / `flushPendingTextUpdates()` - outgoing data handling

## Important: Two Separate SlateEditors

There are TWO different SlateEditor instances in the Admin UI:

1. **SyncedSlateToolbar** (`packages/volto-hydra/src/components/Toolbar/SyncedSlateToolbar.jsx`)
   - The Quanta toolbar for inline formatting (bold, italic, etc.)
   - Logs prefixed with `[TOOLBAR SYNC]` and `[TOOLBAR onChange]`
   - This is NOT the sidebar!

2. **Sidebar's SlateEditor** (inside ParentBlocksWidget → BlockEdit → Text/Slate Edit component)
   - Rendered inside `#sidebar-properties`
   - Uses the core volto-slate SlateEditor component
   - Logs prefixed with `[SIDEBAR]` from ParentBlocksWidget

**CRITICAL**: When debugging, don't confuse TOOLBAR logs with SIDEBAR behavior. They are completely separate components with separate state.
