---
"@type": Document
UID: docs-listings-001
allow_discussion: false
contributors: []
creators:
  - admin
description: A listing block fetches content from the server (e.g. latest news)
  and renders each result as a separate block, repeating each block once per
  result entry. This means a listing can be moved between containers and reuse
  normal blocks for what it repeats.
effective: 2025-01-01T00:00:00
exclude_from_nav: false
expires: null
id: listings
is_folderish: false
language: "##DEFAULT##"
layout: document_view
preview_caption: null
preview_image: null
review_state: published
rights: ""
subjects:
  - listings
  - frontend
title: Listings & Dynamic Blocks
blocks-assignments:
  - { uid: title-1 }
  - { uid: p-1 }
  - { uid: p-2 }
  - { uid: p-3 }
  - { uid: ce-4 }
  - { id: ce-4-javascript-17afd4 }
  - { uid: sep-5 }
  - { uid: h-6 }
  - { uid: p-7 }
  - { uid: ce-8 }
  - { id: ce-8-jsx-37efcc }
  - { uid: h-9 }
  - { uid: ul-10 }
  - { uid: h-11 }
  - { uid: p-12 }
  - { uid: tbl-13 }
  - { uid: p-14 }
  - { uid: p-15 }
  - { uid: ce-16 }
  - { id: ce-16-json-38bb3a }
  - { uid: p-17 }
  - { uid: p-18 }
  - { uid: h-19 }
  - { uid: p-20 }
  - { uid: tbl-21 }
  - { uid: p-22 }
  - { uid: ce-23 }
  - { id: ce-23-json-6d0894 }
  - { uid: p-24 }
  - { uid: h-25 }
  - { uid: p-26 }
  - { uid: p-27 }
  - { uid: tbl-28 }
  - { uid: ce-29 }
  - { id: ce-29-json-a7c4dc }
  - { uid: h-30 }
  - { uid: p-31 }
  - { uid: ce-32 }
  - { id: ce-32-javascript-f6757f }
  - { uid: p-33 }
  - { uid: p-34 }
  - { uid: h-35 }
  - { uid: p-36 }
  - { uid: ce-37 }
  - { id: ce-37-javascript-2ec596 }
  - { uid: p-38 }
  - { uid: p-39 }
  - { uid: ul-40 }
  - { uid: p-41 }
  - { uid: h-42 }
  - { uid: p-43 }
  - { uid: ce-44 }
  - { id: ce-44-javascript-82ad8e }
  - { uid: p-45 }
  - { uid: h-46 }
  - { uid: p-47 }
  - { uid: ul-48 }
  - { uid: p-49 }
  - { uid: p-50 }
  - { uid: p-51 }
  - { uid: h-52 }
  - { uid: p-53 }
blocks-matched: |
  <block type="slate" value="${p,h*,ul,ol,blockquote/slate}" />
  <block type="title" _="${h1}" />
  <block type="separator" _="${hr}" />
blocks-tagged: |
  <block type="slateTable">
    <region name="table.rows">
      <block type="row">
        <region name="cells">
          <block type="cell" value="${td/slate}" />
        </region>
      </block>
    </region>
  </block>
  <block type="codeExample">
    <region name="tabs" widget="object_list">
      <block type="tab" label="${h3/text}" language="${pre/lang}" code="${pre/text}" />
    </region>
  </block>
---

# 

A listing block fetches content from the server (e.g. latest news) and renders each result as a separate block, repeating each block once per result entry. This means a listing can be moved between containers and reuse normal blocks for what it repeats.

`expandListingBlocks(layout, options)` is a helper in hydra.js that handles fetching, paging, and mapping results to block objects. It walks a layout, fetches results for each listing-type block, and returns `{ items, paging }` where `items` is an array of block objects with `@uid` and `@type`.

You tell it which block types need fetching via a `fetchItems` map — keys are block types, values are fetcher functions. This means you can have different kinds of listings (Plone queries, RSS feeds, etc.) each with their own fetcher:

<block type="codeExample">

### Javascript

```javascript
const { items, paging } = await expandListingBlocks(layout, {
  blocks,
  paging: { start: 0, size: 6 },
  fetchItems: {
    listing: ploneFetchItems({ apiUrl, contextPath }),
    rssFeed: myRSSFetcher,
  },
});
// paging = { totalPages, totalItems, currentPage, prev, next, pages, seen }
```

</block>

---

## Example: Mixing Listings, Blocks and Paging

A grid can have a mix of listing and static blocks sharing a single paging. The `staticBlocks` helper wraps non-listing blocks so they participate in the shared page window. The listings use Suspense so they load client-side:

<block type="codeExample">

### Jsx

```jsx
import { Suspense, useState } from 'react';
import { staticBlocks, expandListingBlocks, ploneFetchItems } from '@hydra-js/hydra.js';

function Grid({ blocks, blocks_layout, pageNum, apiUrl, contextPath }) {
  const pagingInput = { start: pageNum * 6, size: 6 };
  const fetchItems = { listing: ploneFetchItems({ apiUrl, contextPath }) };
  const [gridPaging, setGridPaging] = useState({});

  // Walk layout in order, chaining `seen` for position tracking
  let seen = 0;
  return (
    <div className="grid">
      {blocks_layout.items.map(id => {
        if (fetchItems[blocks[id]['@type']]) {
          const mySeen = seen;
          return (
            <Suspense key={id} fallback={<div>Loading...</div>}>
              <ListingItems id={id} blocks={blocks} paging={pagingInput}
                seen={mySeen} fetchItems={fetchItems} onPaging={setGridPaging} />
            </Suspense>
          );
        }
        const result = staticBlocks([id], { blocks, paging: pagingInput, seen });
        seen = result.paging.seen;
        return result.items.map(item =>
          <Block key={item['@uid']} block={item} />
        );
      })}
      {gridPaging.totalPages > 1 && <Paging paging={gridPaging} />}
    </div>
  );
}

async function ListingItems({ id, blocks, paging, seen, fetchItems, onPaging }) {
  const result = await expandListingBlocks([id], {
    blocks, paging, seen, fetchItems,
  });
  onPaging(result.paging);
  return result.items.map(item => <Block key={item['@uid']} block={item} />);
}
```

</block>

## expandListingBlocks Options

- **`blocks`** — Map of blockId to block data
- **`fetchItems`** — Required. Map of `{ blockType: async (block, { start, size }) => { items, total } }`. Keys declare which block types to expand; values are fetcher functions. Use `ploneFetchItems()` for Plone backends.
- **`paging`** — Paging input `{ start, size }` (not mutated). Computed values are returned in the response.
- **`seen`** — Number of items already seen by prior calls (default: 0). Chain `paging.seen` from one call to the next for grids.
- **`itemTypeField`** — Field on the listing block that holds the item type (default: `'itemType'`)
- **`defaultItemType`** — Fallback type when field is not set (default: `'summary'`)

## ploneFetchItems Helper

`ploneFetchItems({ apiUrl, contextPath, extraCriteria })` creates a fetcher function for Plone's `@querystring-search` endpoint, suitable as a value in the `fetchItems` map.

<block type="slateTable" table.fixed table.celled>

| Option | Default | Description |
| --- | --- | --- |
| `apiUrl` | — | Plone site URL (e.g. `'http://localhost:8080/Plone'`) |
| `contextPath` | `'/'` | Path for relative queries |
| `extraCriteria` | `{}` | Additional query params — `SearchableText`, `sort_on`, `sort_order`, `facet.*` keys |

</block>

A listing with no `querystring` defaults to showing the current folder's contents in folder order.

`ploneFetchItems` also normalizes Plone's image data — packaging `image_field` + `image_scales` into a self-contained `image` object with `@id` duplicated inside (needed for URL resolution):

<block type="codeExample">

### Json

```json
// Plone search result:
{ "@id": "/news/article", "image_field": "image", "image_scales": { "image": [{ "...": "..." }] } }

// After normalization:
{ "@id": "/news/article", "image": { "@id": "/news/article", "image_field": "image", "image_scales": { "...": "..." } } }
```

</block>

This self-contained object has everything needed to resolve image URLs with scale support — see the Nuxt example's `composables/imageProps.js` for one approach.

For non-Plone backends (RSS feeds, external APIs, etc.), write your own fetcher: `async (block, { start, size }) => ({ items, total })`. `start` is the zero-based offset, `size` is the number of items to return (or `0` for total-only), and `total` in the return value is the full count, not just this page.

## Example fetchers

The same `fetchItems` seam powers other "collection" blocks — each is just a fetcher that returns raw result objects (`expandListingBlocks` maps `@id → href` etc. and repeats an item block per result, so they need **no bespoke renderer**; they render via the standard item types on every frontend). `@hydra-js/helpers` ships three reference fetchers:

<block type="slateTable" table.fixed table.celled>

| Fetcher | Block | What it returns |
| --- | --- | --- |
| `relatedItemsFetcher({ apiUrl, contextPath })` | **Related Items** | the current page's relation field (default `relatedItems`) — its summaries, paged |
| `searchShortcutsFetcher({ apiUrl, contextPath })` | **Search Shortcuts** | one link per value, each `@id` set to `${searchUrl}?facet.${index}=${value}` (a shortcut into a search page's facet). A linked `pageField` → this page's values; none → the index's site-wide unique values (e.g. `Keywords` for `Subject`) |
| `rssFetcher()` | **RSS Feed** | entries from `block.feedUrl`, client-side `fetch` (best-effort — a CORS/parse error degrades to an empty feed); each entry's `@id` is its link |

</block>

Register them alongside `listing` in the `fetchItems` map:

<block type="codeExample">

### Javascript

```javascript
const { items } = await expandListingBlocks(layout, {
  blocks,
  fetchItems: {
    listing:             ploneFetchItems({ apiUrl, contextPath }),
    relatedItemsListing: relatedItemsFetcher({ apiUrl, contextPath }),
    searchShortcuts:     searchShortcutsFetcher({ apiUrl, contextPath }),
    rssFeed:             rssFetcher(),
  },
});
```

</block>

The **Search Shortcuts** link target reads Volto's search-block facet params — a page with a `search` block picks up `?facet.<index>=<value>` from the URL. The block's *index* uses the existing `select_querystring_field` widget; the optional *this-page field* uses `schemaFieldSelect` (a `/@types`-backed field dropdown, parameterized by `fieldType`), which **Related Items** also uses with `fieldType: 'relation'`.

## Field Mapping

`fieldMapping` on a listing block controls which fields appear on expanded items — only mapped fields are included. Default: `{ @id → href, title → title, description → description, image → image }`. Values can be a string (rename) or `{ field, type }` for conversions:

Built-in item types and the fields they expose:

<block type="slateTable" table.fixed table.celled>

| Type | Fields |
| --- | --- |
| `default` | `title`, `description`, `href` |
| `summary` | `title`, `description`, `href`, `image` |
| `teaser` | `title`, `description`, `href`, `preview_image` |

</block>

<block type="codeExample">

### Json

```json
"fieldMapping": {
  "@id": { "field": "href", "type": "link" },
  "title": "title",
  "image": { "field": "preview_image", "type": "image" },
  "Subject": { "field": "tags", "type": "string" }
}

Types: string (array→join, image→URL), link (→[{@id}]), image (pass through)
```

</block>

## Item Type Selection

Use `variation` on the listing block to control what `@type` expanded items get. Listings reuse the same `inheritSchemaFrom` recipe as container blocks (see [Container Blocks › Synchronised Block Types](container-blocks.md#synchronised-block-types-in-a-container)) but differ in one structural way: there's no blocks field to declare `itemTypeField` on, since listing children are *virtual* (produced from query results at render time, not authored as page data). Instead, declare the typeField directly on the `inheritSchemaFrom` recipe:

<block type="codeExample">

### Javascript

```javascript
listing: {
    blockSchema: {
        properties: {
            variation: {
                widget: 'blockTypeSelect',
                filterConvertibleFrom: '@default',  // only offer types with @default mappings
            },
            // FieldMappingWidget is added at sidebar render time by
            // inheritSchemaFrom (the enhancer reads `mappingField` below);
            // declare an empty placeholder so it appears in the auto-generated
            // default fieldset alongside `variation`.
            fieldMapping: {},
        },
    },
    schemaEnhancer: {
        inheritSchemaFrom: {
            typeField: 'variation',     // listing has no blocks field — declare here
            mappingField: 'fieldMapping',
        },
    },
}
```

</block>

`filterConvertibleFrom: '@default'` restricts the dropdown to types that have a `fieldMappings['@default']` entry — i.e. types that can be populated from the canonical content fields (`@id`, `title`, `description`, `image`) that listing queries return. Each item type's `fieldMappings['@default']` (on its own block config) defines how those source fields land on its schema; that static mapping is enough to render listings. Adding `mappingField` to the enhancer exposes the `FieldMappingWidget` so the editor can override the mapping per listing instance.

The widget saves its output as `fieldMapping` (singular) on the block data. `expandListingBlocks` reads that at render time to translate each query result into an item block.

## Combining Listings with Container Syncing

A container (e.g. `gridBlock`) can mix **manual children** AND **a listing** as children. Add `'listing'` to the blocks field's `allowedBlocks`, and the parent's typeField propagates everywhere:

<block type="codeExample">

### Javascript

```javascript
gridBlock: {
    blockSchema: {
        properties: {
            slides: {
                widget: 'blocks_layout',
                itemTypeField: 'variation',
                allowedBlocks: ['teaser', 'image', 'listing'],  // manual items + listing
            },
            variation: {
                widget: 'blockTypeSelect',
                filterConvertibleFrom: '@default',  // keeps 'listing' out of the dropdown
            },
        },
    },
    schemaEnhancer: { inheritSchemaFrom: {} },
}
```

</block>

`filterConvertibleFrom: '@default'` keeps `'listing'` out of the dropdown (it's a structural container, not an item type, so it has no `fieldMappings['@default']`) but it stays in `allowedBlocks` so a listing block can still exist as a structural child. The editor sees "Teaser / Image / Summary" in the picker; the listing is a structural choice they don't have to think about.

When the editor changes `gridBlock.variation` to e.g. `'summary'`:

- **Manual children** (a teaser, an image) get their `@type` converted via the destination type's `fieldMappings` — teaser becomes summary.
- **Listing child** keeps `@type: 'listing'` but its own `variation` field is set to `'summary'`, so the listing now renders summary items.

The sync walks recursively — if the listing held nested containers with their own typeFields, those would update too. Net effect: ONE picker on the parent controls the rendered type for every descendant, regardless of whether descendants are authored manually or expanded from a query.

## Path Transformation (pathToApiPath)

If your frontend embeds state in the URL path (like pagination), you need to tell hydra.js how to transform the frontend path to the API/admin path. Otherwise, the admin will try to navigate to URLs that don't exist in the CMS.

<block type="codeExample">

### Javascript

```javascript
const bridge = initBridge({
    page: { ... },
    // Transform frontend path to API path by stripping paging segments
    // e.g., /test-page/@pg_block-8-grid_1 -> /test-page
    pathToApiPath: (path) => path.replace(/\/@pg_[^/]+_\d+/, ''),
});
```

</block>

The `pathToApiPath` function is called whenever hydra.js sends a `PATH_CHANGE` message to the admin, allowing your frontend to strip or transform URL segments that are frontend-specific (like pagination, filters, or other client-side state).

## Paging Values

Both `expandListingBlocks` and `staticBlocks` return `{ items, paging }`. You pass `{ start, size }` as input (not mutated) and get back computed paging values:

- **`currentPage`** (number) — Zero-based current page index
- **`totalPages`** (number) — Total number of pages
- **`totalItems`** (number) — Total item count across all blocks
- **`prev`** (number | null) — Previous page index, or null on first page
- **`next`** (number | null) — Next page index, or null on last page
- **`pages`** (array) — Window of \~5 page objects: `{ start, page }` where page is 1-based
- **`seen`** (number) — Running item count — pass to the next call's `seen` option for position tracking in grids

Neither function mutates the input `paging` object — calling again with the same `{ start, size }` is safe.

When multiple listings share a pager (e.g. a grid with several listings), `expandListingBlocks` walks them sequentially. Each fetch returns `{ items, total }`, so the total is learned from the response and used to compute where the next listing starts. One request per listing. Listings outside the page window are fetched with `size: 0` (total only, no items).

When mixing listings with static blocks in a shared pager, use `staticBlocks(ids, { blocks, paging, seen })` for the non-listing blocks — it tracks their position in the paging window. Chain the returned `paging.seen` to the next call so each block knows its offset (see the React example above).

## Notes

Expanded listing items share the listing block's `@uid`. Selecting any expanded item selects the parent listing block.
