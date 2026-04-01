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

Use `itemType` (or `variation`) on the listing block to control what `@type` expanded items get. Combined with `inheritSchemaFrom`, the listing's sidebar shows fields from the selected item type:

<!-- codeExample: javascript -->
```javascript
listing: {
    schemaEnhancer: ({ schema }) => {
        schema.properties.itemType = {
            title: 'Display as',
            choices: [['teaser', 'Teaser'], ['card', 'Card']],
        };
        return schema;
    },
    inheritSchemaFrom: {
        typeField: 'itemType',
        blocksField: null,
    },
}
```

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
