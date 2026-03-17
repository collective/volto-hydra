# Slider Listing Expansion Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow a slider block to contain a listing block that fetches images, expanding each result into an individual slide rendered as an image block.

**Architecture:** The slider renderer becomes async and calls `expandItems` (which calls `expandListingBlocks` when listings are present) on its slides array before rendering. Listing items get mapped to the slider's variation type (e.g., `image`), so each fetched result becomes a properly-typed slide. The `image` block type needs `fieldMappings` so `expandListingBlocks` can map API results to image block fields.

**Tech Stack:** JavaScript (test frontend renderer, hydra.js), Playwright (tests), JSON (test fixtures)

---

## File Structure

| File | Action | Purpose |
|------|--------|---------|
| `tests-playwright/fixtures/shared-block-schemas.js` | Modify | Add `fieldMappings` to image block config, add `blockSchema` with `url`/`alt`/`href` |
| `tests-playwright/fixtures/test-frontend/renderer.js` | Modify | Make `renderSliderBlock` async, call `expandItems` for slides |
| `tests-playwright/fixtures/content/carousel-test-page/data.json` | Modify | Add a listing block slide to the existing slider |
| `tests-playwright/integration/container-blocks.spec.ts` | Modify | Add test for slider with listing expansion |
| `README.md` | Modify | Document that listing items share `@uid` and selecting any selects the listing block |
| `docs/blocks/listing.md` | Modify | Fix `@uid` example to show listing block ID, add selection explanation |

## Chunk 1: Image block fieldMappings + async slider renderer

### Task 1: Add fieldMappings to image block schema

The `image` block in `shared-block-schemas.js` currently has only `childBlockConfig`. It needs `fieldMappings` so `expandListingBlocks` can map listing results (which have `@id`, `title`, `image`) to image block fields (`url`, `alt`, `href`).

**Files:**
- Modify: `tests-playwright/fixtures/shared-block-schemas.js:403-410`

- [ ] **Step 1: Add fieldMappings and blockSchema to image block**

In `tests-playwright/fixtures/shared-block-schemas.js`, update the `image` block config:

```js
    image: {
        id: 'image',
        title: 'Image',
        fieldMappings: {
            '@default': { '@id': 'href', 'title': 'alt', 'image': 'url' },
        },
        schemaEnhancer: {
            childBlockConfig: {
                defaultsField: 'itemDefaults',
                editableFields: ['url', 'alt', 'href'],
            },
        },
        blockSchema: {
            title: 'Image',
            fieldsets: [{ id: 'default', title: 'Default', fields: ['url', 'alt', 'href'] }],
            properties: {
                url: { title: 'Image URL', widget: 'url' },
                alt: { title: 'Alt Text', type: 'string' },
                href: { title: 'Link', widget: 'url' },
            },
            required: [],
        },
    },
```

The `fieldMappings['@default']` mapping tells `expandListingBlocks` how to map search result fields to image block fields:
- `@id` (content URL) -> `href` (link)
- `title` -> `alt` (alt text)
- `image` (normalized image object) -> `url` (image source)

### Task 2: Make renderSliderBlock async with listing expansion

Currently `renderSliderBlock` is sync and always calls `renderSlideBlock` for every slide. It needs to:
1. Call `expandItems` to expand any listing blocks in the slides array
2. Render expanded items based on their `@type` (not just as slides)

**Files:**
- Modify: `tests-playwright/fixtures/test-frontend/renderer.js:194-197` (caller site)
- Modify: `tests-playwright/fixtures/test-frontend/renderer.js:1337-1400` (function body)

- [ ] **Step 2: Make the slider case async in renderBlock**

In `renderer.js`, change the `case 'slider'` in `renderBlock` to be async:

```js
        case 'slider':
            // Slider uses object_list format (slides as array with @id)
            wrapper.classList.add('carousel-block');
            wrapper.innerHTML = await renderSliderBlock(block, blockId);
            break;
```

- [ ] **Step 3: Rewrite renderSliderBlock to be async and expand listings**

Convert `renderSliderBlock` to async. Before rendering slides, convert the object_list items to blocks dict + layout, call `expandItems`, then render the expanded items by type.

```js
async function renderSliderBlock(block, blockId) {
    // Expand slides through template system
    const rawSlides = block.slides || [];
    const slides = window._expandTemplatesSync
        ? window._expandTemplatesSync(rawSlides, { templateState: window._templateState || {}, templates: {}, idField: '@id' })
        : rawSlides;

    // Convert object_list items to blocks dict + layout for expandItems
    const blocksDict = {};
    const layout = [];
    for (const slide of slides) {
        const slideId = slide['@id'];
        if (!slideId) continue;
        blocksDict[slideId] = slide;
        layout.push(slideId);
    }

    // Expand listing blocks into individual items
    const { items: expandedItems } = await expandItems(blocksDict, layout, blockId);

    const prevCount = sliderSlideCount[blockId] || 0;
    const newCount = expandedItems.length;

    // Detect if a new slide was added - show it instead of first slide
    let activeIndex = 0;
    if (newCount > prevCount && prevCount > 0) {
        activeIndex = newCount - 1;
    }
    sliderSlideCount[blockId] = newCount;

    const activeSlideId = expandedItems[activeIndex]?.['@uid'] || null;

    let html = '<div class="carousel-container" style="position: relative; padding: 20px; background: #f5f5f5; border-radius: 8px; min-height: 120px;">';

    // Navigation button - Previous
    html += '<button data-block-selector="-1" class="carousel-prev" style="position: absolute; left: 5px; top: 50%; transform: translateY(-50%); z-index: 10; padding: 10px; cursor: pointer;">&#x2190;</button>';

    // Slides container - only ONE slide visible at a time
    html += '<div class="slides-wrapper" style="position: relative; margin: 0 50px; min-height: 80px;">';

    expandedItems.forEach((item, index) => {
        const itemId = item['@uid'];
        if (!itemId) return;

        const isActive = index === activeIndex;
        const displayStyle = isActive ? 'block' : 'none';

        html += `<div data-block-uid="${itemId}" data-block-add="right" class="slide ${isActive ? 'active' : ''}" style="display: ${displayStyle}; padding: 15px; background: white; border-radius: 4px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">`;

        // Render based on item type
        switch (item['@type']) {
            case 'image':
                html += renderImageBlock(item);
                break;
            case 'teaser':
                html += renderTeaserBlock(item, null);
                break;
            default:
                html += renderSlideBlock(item);
                break;
        }

        html += '</div>';
    });

    html += '</div>';

    // Navigation button - Next
    html += '<button data-block-selector="+1" class="carousel-next" style="position: absolute; right: 5px; top: 50%; transform: translateY(-50%); z-index: 10; padding: 10px; cursor: pointer;">&#x2192;</button>';

    // Dot indicators
    const halfLength = Math.ceil(expandedItems.length / 2);
    html += '<div class="slide-indicators" style="text-align: center; margin-top: 10px;">';
    expandedItems.forEach((item, index) => {
        const itemId = item['@uid'];
        if (index < halfLength) {
            html += `<button data-block-selector="${itemId}" class="slide-dot" style="width: 12px; height: 12px; border-radius: 50%; margin: 0 4px; cursor: pointer; border: 1px solid #999; background: ${index === activeIndex ? '#333' : '#fff'};">${index + 1}</button>`;
        } else {
            html += `<span class="slide-dot no-selector" style="width: 12px; height: 12px; border-radius: 50%; margin: 0 4px; display: inline-block; border: 1px solid #ccc; background: ${index === activeIndex ? '#333' : '#eee'};">${index + 1}</span>`;
        }
    });
    html += '</div>';

    html += '</div>';
    return html;
}
```

Key changes from the old version:
- Async function
- Converts slides array to blocks dict + layout
- Calls `expandItems` which delegates to `window._expandListingBlocks` when listings exist
- Renders each expanded item by `@type` instead of always calling `renderSlideBlock`
- Uses `@uid` from expanded items (listing items all share the listing block's UID)

- [ ] **Step 4: Run existing carousel tests to verify no regression**

Run: `pnpm exec playwright test tests-playwright/integration/container-blocks.spec.ts -g "data-block-selector" --project=admin-mock --workers=1 2>&1 | tee /tmp/test-output.log | tail -10`

Expected: All existing carousel/slider tests pass (navigation, slide selection, etc.)

- [ ] **Step 5: Commit**

```bash
git add tests-playwright/fixtures/shared-block-schemas.js tests-playwright/fixtures/test-frontend/renderer.js
git commit -m "feat: make slider renderer async with listing expansion support"
```

### Task 3: Add test data and test for slider with listing

**Files:**
- Modify: `tests-playwright/fixtures/content/carousel-test-page/data.json`
- Modify: `tests-playwright/integration/container-blocks.spec.ts`

- [ ] **Step 6: Add listing block to carousel test page**

Add a listing slide to the existing slider in `carousel-test-page/data.json`. The listing queries for Image content type. The mock API has `test-image-1` and `test-image-2`:

In the `slider-1` block's `slides` array, add a listing block after the existing slides:

```json
{
  "@id": "gallery-listing",
  "@type": "listing",
  "querystring": {
    "query": [
      {
        "i": "portal_type",
        "o": "plone.app.querystring.operation.selection.any",
        "v": ["Image"]
      }
    ],
    "sort_on": "sortable_title",
    "sort_order": "ascending"
  }
}
```

The slider's `variation` should be set to `image` so expanded items get `@type: 'image'`. Add to `slider-1`:

```json
"variation": "image"
```

- [ ] **Step 7: Write the test**

Add a test in `container-blocks.spec.ts` inside the `data-block-selector Navigation` describe block:

```typescript
test('Slider with listing block expands images as individual slides', async ({ adminPage, helper }) => {
    await adminPage.goto('/carousel-test-page/edit');
    await helper.waitForIframeReady();

    const iframe = helper.getIframe();

    // Verify slider is loaded
    const slider = iframe.locator('[data-block-uid="slider-1"]');
    await expect(slider).toBeVisible();

    // The listing should have expanded into image slides.
    // We have 3 manual slides + test-image-1 + test-image-2 from the listing query.
    // All listing items share the listing block's @uid ("gallery-listing").
    const gallerySlides = iframe.locator('[data-block-uid="gallery-listing"]');
    await expect(gallerySlides).toHaveCount(2, { timeout: 10000 });

    // Verify image slides are rendered as image blocks (have img or data-edit-media)
    const firstGallerySlide = gallerySlides.first();
    // Image blocks render with renderImageBlock which uses data-edit-media="url"
    await expect(firstGallerySlide.locator('[data-edit-media="url"], img')).toBeVisible({ timeout: 5000 });
});
```

- [ ] **Step 8: Run the test**

Run: `pnpm exec playwright test tests-playwright/integration/container-blocks.spec.ts -g "listing block expands images" --project=admin-mock --workers=1 2>&1 | tee /tmp/test-output.log | tail -10`

Expected: PASS

- [ ] **Step 9: Run full carousel test suite to verify no regression**

Run: `pnpm exec playwright test tests-playwright/integration/container-blocks.spec.ts -g "slider|carousel|data-block-selector" --project=admin-mock --workers=1 2>&1 | tee /tmp/test-output.log | tail -10`

Expected: All tests pass

- [ ] **Step 10: Commit**

```bash
git add tests-playwright/fixtures/content/carousel-test-page/data.json tests-playwright/integration/container-blocks.spec.ts
git commit -m "test: add slider with listing block expanding images as slides"
```

## Chunk 2: Documentation updates

### Task 4: Update listing docs to clarify shared @uid

The listing docs have two issues:
1. The resolved item example shows `"@uid": "item-1"` — should show the listing block's ID to make it clear items share UIDs
2. No explanation that clicking any expanded item selects the listing block

**Files:**
- Modify: `docs/blocks/listing.md:106-117`
- Modify: `README.md:818-821`

- [ ] **Step 11: Fix listing.md resolved item example**

In `docs/blocks/listing.md`, change the resolved item example to show the listing block's UID and add explanation:

```markdown
After the query is resolved, each item looks like:

```json
{
  "@uid": "listing-block-1",
  "@type": "summary",
  "href": "/news/my-article",
  "title": "My Article",
  "description": "Article summary text",
  "image": "/news/my-article/@@images/image-800x600.jpg",
  "readOnly": true
}
```

All expanded items share the same `@uid` as the listing block. When rendered with `data-block-uid`, clicking any item selects the listing block in the admin sidebar for editing (query, variation, field mapping, etc.). The `readOnly` flag prevents inline editing of fetched content.
```

- [ ] **Step 12: Clarify the repeated uid note in README**

In `README.md` around line 820, enhance the existing note:

```markdown
- If your block is rendered as multiple items (e.g., listing results), give each one the same `data-block-uid`.
  Clicking any item selects the source block in the admin sidebar. For listing blocks, all expanded
  items share the listing block's UID so the editor can modify the query, variation, and field mapping.
```

- [ ] **Step 13: Sync docs**

Run: `pnpm sync:docs 2>&1 | tail -5`

This syncs code examples from `docs/blocks/examples/` into the markdown files and content JSON.

- [ ] **Step 14: Commit**

```bash
git add docs/blocks/listing.md README.md
git commit -m "docs: clarify that listing items share @uid for block selection"
```
