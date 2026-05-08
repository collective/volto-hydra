# Carousel Test Flakiness Analysis

## Problem

The test "sidebar selection works for all carousel slides" is flaky. When selecting slide-3 via the sidebar, the carousel doesn't transition to show slide-3 - it remains showing slide-1.

## Root Cause

There's a race condition between carousel slide navigation and FORM_DATA re-renders:

1. **Admin selects slide-3** via sidebar ChildBlocksWidget
2. **Admin sends FORM_DATA** to iframe with slide-3 as selected block
3. **Iframe re-renders** via `onEditChange` callback - this **resets carousel to slide-1** (default visible slide)
4. **Hydra calls `tryMakeBlockVisible("slide-3")`** to navigate carousel
5. **tryMakeBlockVisible clicks +1 button** to go from slide-1 to slide-2
6. **Slide transition starts** (100ms delay in test renderer)
7. **Admin sends another FORM_DATA** (triggered by selection change or other update)
8. **Iframe re-renders again** - carousel resets to slide-1 BEFORE the transition completes
9. **Loop repeats** - tryMakeBlockVisible keeps trying, FORM_DATA keeps resetting

## Evidence from Logs

```
[HYDRA] tryMakeBlockVisible: click() called
[HYDRA] [setFormDataFromAdmin] source: FORM_DATA, seq: 2, block: slide-3
[RENDERER] Slide transition complete, slide-2 display: block
[HYDRA] [setFormDataFromAdmin] source: FORM_DATA, seq: 3, block: slider-1  <-- Another FORM_DATA!
[HYDRA] tryMakeBlockVisible: click() called                                 <-- Trying again
[HYDRA] [setFormDataFromAdmin] source: FORM_DATA, seq: 4, block: slide-3
[HYDRA] tryMakeBlockVisible debug: display=none                             <-- Re-render reset it!
```

The "Slide transition complete" message shows the transition DID happen, but subsequent FORM_DATA messages caused re-renders that reset the carousel state.

## Why FORM_DATA is Sent Multiple Times

Despite the `formDataContentEqual` check, FORM_DATA is sent multiple times because:

1. **Selection changes trigger FORM_DATA** - When selection changes from slide-1 → slider-1 → slide-3, each change may trigger a sync
2. **`applySchemaDefaultsToFormData` may produce different output** - If defaults are applied inconsistently, content comparison fails
3. **The original @type mutation issue** - While we fixed the mutation in `getBlockData`, there may be other places where formData diverges between admin and iframe

## The @type Fix We Made

We changed `blockPathMap` to store `blockType` for all blocks (not just object_list items), and removed the `@type` mutation from hydra.js `getBlockData`. We also added code to strip virtual `@type` before persisting in `applySchemaDefaultsToFormData`.

However, the core issue remains: **FORM_DATA re-renders reset carousel state**.

## Potential Solutions

### Option 1: Preserve Carousel State Across Re-renders

The test-frontend renderer could track which slide is currently visible and restore that state after re-render:

```javascript
// In renderer.js
const carouselState = {}; // { sliderId: currentSlideIndex }

function renderSliderBlock(block, blockId) {
  const savedIndex = carouselState[blockId];
  // ... render slides, making savedIndex visible instead of always index 0
}

// On slide change
carouselState[sliderId] = newIndex;
```

### Option 2: Debounce/Skip FORM_DATA During Navigation

Hydra.js already sets `_navigatingToBlock` flag during `tryMakeBlockVisible`. The admin could check this flag and skip sending FORM_DATA while navigation is in progress.

### Option 3: Don't Re-render on Every FORM_DATA

The iframe could be smarter about when to re-render:
- Only re-render if block content actually changed
- Don't re-render if only selection changed

### Option 4: Send SELECT_BLOCK Separately from FORM_DATA

Currently the admin sends FORM_DATA which includes selection info. The iframe re-renders AND tries to select. Instead:
- FORM_DATA for content changes only (triggers re-render)
- SELECT_BLOCK for selection changes only (no re-render, just navigation)

## Recommended Fix

**Option 1 (Preserve Carousel State)** is the most robust solution because:
- It handles all re-render cases, not just FORM_DATA
- It's a frontend concern (carousel state management)
- It doesn't require changes to the admin-iframe protocol

The test-frontend should track carousel state and restore it after re-renders.

## Files Involved

- `packages/hydra-js/hydra.js` - `tryMakeBlockVisible`, `isElementHidden`, FORM_DATA handling
- `packages/volto-hydra/src/components/Iframe/View.jsx` - FORM_DATA sync, `formDataContentEqual` check
- `packages/volto-hydra/src/utils/schemaInheritance.js` - `applySchemaDefaultsToFormData`
- `tests-playwright/fixtures/test-frontend/renderer.js` - Slider rendering, slide transitions
