# Listings & Dynamic Blocks

A listing block fetches content from the server (e.g. latest news) and renders each result as a separate block. `expandListingBlocks(layout, options)` walks a layout, fetches results for each listing-type block, and returns `{ items, paging }` where `items` is an array of block objects with `@uid` and `@type`.

You tell it which block types need fetching via a `fetchItems` map — keys are block types, values are fetcher functions. This means you can have different kinds of listings (Plone queries, RSS feeds, etc.) each with their own fetcher:

<!-- codeExample: javascript -->
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

## Example: Mixing Listings, Blocks and Paging

A grid can have a mix of listing and static blocks sharing a single paging. The `staticBlocks` helper wraps non-listing blocks so they participate in the shared page window. The listings use Suspense so they load client-side:

<!-- codeExample: jsx -->
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

## expandListingBlocks Options

- **`blocks`** — Map of blockId to block data
- **`fetchItems`** — Required. Map of `{ blockType: async (block, { start, size }) => { items, total } }`. Keys declare which block types to expand; values are fetcher functions. Use `ploneFetchItems()` for Plone backends.
- **`paging`** — Paging input `{ start, size }` (not mutated). Computed values are returned in the response.
- **`seen`** — Number of items already seen by prior calls (default: 0). Chain `paging.seen` from one call to the next for grids.
- **`itemTypeField`** — Field on the listing block that holds the item type (default: `'itemType'`)
- **`defaultItemType`** — Fallback type when field is not set (default: `'summary'`)

## ploneFetchItems Helper

**`ploneFetchItems({ apiUrl, contextPath, extraCriteria })`** — creates a fetcher function for Plone backends, suitable as a value in the `fetchItems` map. Normalizes results by packaging `image_field` + `image_scales` into a self-contained image object `{ @id, image_field, image_scales }`.

For non-Plone backends (RSS feeds, external APIs, etc.), write your own fetcher: `async (block, { start, size }) => { items, total }`.

## Field Mapping

`fieldMapping` on a listing block controls which fields appear on expanded items — only mapped fields are included. Default: `{ @id → href, title → title, description → description, image → image }`. Values can be a string (rename) or `{ field, type }` for conversions:

Built-in item types and the fields they expose:

| Type | Fields |
|------|--------|
| `default` | `title`, `description`, `href` |
| `summary` | `title`, `description`, `href`, `image` |
| `teaser` | `title`, `description`, `href`, `preview_image` |


<!-- codeExample: json -->
```json
"fieldMapping": {
  "@id": { "field": "href", "type": "link" },
  "title": "title",
  "image": { "field": "preview_image", "type": "image" },
  "Subject": { "field": "tags", "type": "string" }
}

Types: string (array→join, image→URL), link (→[{@id}]), image (pass through)
```

## Item Type Selection

Use `variation` on the listing block to control what `@type` expanded items get. Listings reuse the same `inheritSchemaFrom` recipe as container blocks (see [Container Blocks › Synchronised Block Types](container-blocks.md#synchronised-block-types-in-a-container)) but differ in one structural way: there's no blocks field to declare `itemTypeField` on, since listing children are *virtual* (produced from query results at render time, not authored as page data). Instead, declare the typeField directly on the `inheritSchemaFrom` recipe:

<!-- codeExample: javascript -->
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

`filterConvertibleFrom: '@default'` restricts the dropdown to types that have a `fieldMappings['@default']` entry — i.e. types that can be populated from the canonical content fields (`@id`, `title`, `description`, `image`) that listing queries return. Each item type's `fieldMappings['@default']` (on its own block config) defines how those source fields land on its schema; that static mapping is enough to render listings. Adding `mappingField` to the enhancer exposes the `FieldMappingWidget` so the editor can override the mapping per listing instance.

The widget saves its output as `fieldMapping` (singular) on the block data. `expandListingBlocks` reads that at render time to translate each query result into an item block.

## Combining Listings with Container Syncing

A container (e.g. `gridBlock`) can mix **manual children** AND **a listing** as children. Add `'listing'` to the blocks field's `allowedBlocks`, and the parent's typeField propagates everywhere:

<!-- codeExample: javascript -->
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

`filterConvertibleFrom: '@default'` keeps `'listing'` out of the dropdown (it's a structural container, not an item type, so it has no `fieldMappings['@default']`) but it stays in `allowedBlocks` so a listing block can still exist as a structural child. The editor sees "Teaser / Image / Summary" in the picker; the listing is a structural choice they don't have to think about.

When the editor changes `gridBlock.variation` to e.g. `'summary'`:

- **Manual children** (a teaser, an image) get their `@type` converted via the destination type's `fieldMappings` — teaser becomes summary.
- **Listing child** keeps `@type: 'listing'` but its own `variation` field is set to `'summary'`, so the listing now renders summary items.

The sync walks recursively — if the listing held nested containers with their own typeFields, those would update too. Net effect: ONE picker on the parent controls the rendered type for every descendant, regardless of whether descendants are authored manually or expanded from a query.

## Path Transformation (pathToApiPath)

If your frontend embeds state in the URL path (like pagination), you need to tell hydra.js how to transform the frontend path to the API/admin path. Otherwise, the admin will try to navigate to URLs that don't exist in the CMS.

<!-- codeExample: javascript -->
```javascript
const bridge = initBridge({
    page: { ... },
    // Transform frontend path to API path by stripping paging segments
    // e.g., /test-page/@pg_block-8-grid_1 -> /test-page
    pathToApiPath: (path) => path.replace(/\/@pg_[^/]+_\d+/, ''),
});
```

The `pathToApiPath` function is called whenever hydra.js sends a `PATH_CHANGE` message to the admin, allowing your frontend to strip or transform URL segments that are frontend-specific (like pagination, filters, or other client-side state).

## Paging Values

Both `expandListingBlocks` and `staticBlocks` return `{ items, paging }`. You pass `{ start, size }` as input (not mutated) and get back computed paging values:

- **`currentPage`** (number) — Zero-based current page index
- **`totalPages`** (number) — Total number of pages
- **`totalItems`** (number) — Total item count across all blocks
- **`prev`** (number | null) — Previous page index, or null on first page
- **`next`** (number | null) — Next page index, or null on last page
- **`pages`** (array) — Window of ~5 page objects: `{ start, page }` where page is 1-based
- **`seen`** (number) — Running item count — pass to the next call's `seen` option for position tracking in grids

## Notes

Expanded listing items share the listing block's `@uid`. Selecting any expanded item selects the parent listing block.
