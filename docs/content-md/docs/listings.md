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
blocks:
  - title-1: title
  - p-1: slate
  - p-2: slate
  - p-3: slate
  - ce-4: codeExample
  - sep-5: separator
  - h-6: slate
  - p-7: slate
  - ce-8: codeExample
  - h-9: slate
  - ul-10: slate
  - h-11: slate
  - p-12: slate
  - tbl-13: slateTable
  - p-14: slate
  - p-15: slate
  - ce-16: codeExample
  - p-17: slate
  - p-18: slate
  - h-19: slate
  - p-20: slate
  - tbl-21: slateTable
  - p-22: slate
  - ce-23: codeExample
  - p-24: slate
  - h-25: slate
  - p-26: slate
  - p-27: slate
  - tbl-28: slateTable
  - ce-29: codeExample
  - h-30: slate
  - p-31: slate
  - ce-32: codeExample
  - p-33: slate
  - p-34: slate
  - h-35: slate
  - p-36: slate
  - ce-37: codeExample
  - p-38: slate
  - p-39: slate
  - ul-40: slate
  - p-41: slate
  - h-42: slate
  - p-43: slate
  - ce-44: codeExample
  - p-45: slate
  - h-46: slate
  - p-47: slate
  - ul-48: slate
  - p-49: slate
  - p-50: slate
  - p-51: slate
  - h-52: slate
  - p-53: slate
---

:::title{uid="title-1"}
:::

A listing block fetches content from the server (e.g. latest news) and renders each result as a separate block, repeating each block once per result entry. This means a listing can be moved between containers and reuse normal blocks for what it repeats.

`expandListingBlocks(layout, options)` is a helper in hydra.js that handles fetching, paging, and mapping results to block objects. It walks a layout, fetches results for each listing-type block, and returns `{ items, paging }` where `items` is an array of block objects with `@uid` and `@type`.

You tell it which block types need fetching via a `fetchItems` map — keys are block types, values are fetcher functions. This means you can have different kinds of listings (Plone queries, RSS feeds, etc.) each with their own fetcher:

:::codeExample{uid="ce-4" tabs="${1.../h3}" tabs.label="${1/text}" tabs.language="${2/lang}" tabs.code="${2/code}" tabs@ids=["ce-4-javascript-17afd4"]}
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
:::

:::separator{uid="sep-5"}
:::

## Example: Mixing Listings, Blocks and Paging

A grid can have a mix of listing and static blocks sharing a single paging. The `staticBlocks` helper wraps non-listing blocks so they participate in the shared page window. The listings use Suspense so they load client-side:

:::codeExample{uid="ce-8" tabs="${1.../h3}" tabs.label="${1/text}" tabs.language="${2/lang}" tabs.code="${2/code}" tabs@ids=["ce-8-jsx-37efcc"]}
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
:::

## expandListingBlocks Options

- **`blocks`** — Map of blockId to block data
- **`fetchItems`** — Required. Map of `{ blockType: async (block, { start, size }) => { items, total } }`. Keys declare which block types to expand; values are fetcher functions. Use `ploneFetchItems()` for Plone backends.
- **`paging`** — Paging input `{ start, size }` (not mutated). Computed values are returned in the response.
- **`seen`** — Number of items already seen by prior calls (default: 0). Chain `paging.seen` from one call to the next for grids.
- **`itemTypeField`** — Field on the listing block that holds the item type (default: `'itemType'`)
- **`defaultItemType`** — Fallback type when field is not set (default: `'summary'`)

## ploneFetchItems Helper

`ploneFetchItems({ apiUrl, contextPath, extraCriteria })` creates a fetcher function for Plone's `@querystring-search` endpoint, suitable as a value in the `fetchItems` map.

:::slateTable{uid="tbl-13"}
```fields
{
 "table": {
  "fixed": true,
  "compact": false,
  "basic": false,
  "celled": true,
  "inverted": false,
  "striped": false,
  "rows": [
   {
    "key": "tbl-13-r0",
    "cells": [
     {
      "key": "tbl-13-r0c0",
      "type": "header",
      "value": [
       {
        "type": "p",
        "children": [
         {
          "text": "Option"
         }
        ]
       }
      ]
     },
     {
      "key": "tbl-13-r0c1",
      "type": "header",
      "value": [
       {
        "type": "p",
        "children": [
         {
          "text": "Default"
         }
        ]
       }
      ]
     },
     {
      "key": "tbl-13-r0c2",
      "type": "header",
      "value": [
       {
        "type": "p",
        "children": [
         {
          "text": "Description"
         }
        ]
       }
      ]
     }
    ]
   },
   {
    "key": "tbl-13-r1",
    "cells": [
     {
      "key": "tbl-13-r1c0",
      "type": "data",
      "value": [
       {
        "type": "p",
        "children": [
         {
          "type": "code",
          "children": [
           {
            "text": "apiUrl"
           }
          ]
         }
        ]
       }
      ]
     },
     {
      "key": "tbl-13-r1c1",
      "type": "data",
      "value": [
       {
        "type": "p",
        "children": [
         {
          "text": "—"
         }
        ]
       }
      ]
     },
     {
      "key": "tbl-13-r1c2",
      "type": "data",
      "value": [
       {
        "type": "p",
        "children": [
         {
          "text": "Plone site URL (e.g. "
         },
         {
          "type": "code",
          "children": [
           {
            "text": "'http://localhost:8080/Plone'"
           }
          ]
         },
         {
          "text": ")"
         }
        ]
       }
      ]
     }
    ]
   },
   {
    "key": "tbl-13-r2",
    "cells": [
     {
      "key": "tbl-13-r2c0",
      "type": "data",
      "value": [
       {
        "type": "p",
        "children": [
         {
          "type": "code",
          "children": [
           {
            "text": "contextPath"
           }
          ]
         }
        ]
       }
      ]
     },
     {
      "key": "tbl-13-r2c1",
      "type": "data",
      "value": [
       {
        "type": "p",
        "children": [
         {
          "type": "code",
          "children": [
           {
            "text": "'/'"
           }
          ]
         }
        ]
       }
      ]
     },
     {
      "key": "tbl-13-r2c2",
      "type": "data",
      "value": [
       {
        "type": "p",
        "children": [
         {
          "text": "Path for relative queries"
         }
        ]
       }
      ]
     }
    ]
   },
   {
    "key": "tbl-13-r3",
    "cells": [
     {
      "key": "tbl-13-r3c0",
      "type": "data",
      "value": [
       {
        "type": "p",
        "children": [
         {
          "type": "code",
          "children": [
           {
            "text": "extraCriteria"
           }
          ]
         }
        ]
       }
      ]
     },
     {
      "key": "tbl-13-r3c1",
      "type": "data",
      "value": [
       {
        "type": "p",
        "children": [
         {
          "type": "code",
          "children": [
           {
            "text": "{}"
           }
          ]
         }
        ]
       }
      ]
     },
     {
      "key": "tbl-13-r3c2",
      "type": "data",
      "value": [
       {
        "type": "p",
        "children": [
         {
          "text": "Additional query params — "
         },
         {
          "type": "code",
          "children": [
           {
            "text": "SearchableText"
           }
          ]
         },
         {
          "text": ", "
         },
         {
          "type": "code",
          "children": [
           {
            "text": "sort_on"
           }
          ]
         },
         {
          "text": ", "
         },
         {
          "type": "code",
          "children": [
           {
            "text": "sort_order"
           }
          ]
         },
         {
          "text": ", "
         },
         {
          "type": "code",
          "children": [
           {
            "text": "facet.*"
           }
          ]
         },
         {
          "text": " keys"
         }
        ]
       }
      ]
     }
    ]
   }
  ]
 }
}
```
:::

A listing with no `querystring` defaults to showing the current folder's contents in folder order.

`ploneFetchItems` also normalizes Plone's image data — packaging `image_field` + `image_scales` into a self-contained `image` object with `@id` duplicated inside (needed for URL resolution):

:::codeExample{uid="ce-16" tabs="${1.../h3}" tabs.label="${1/text}" tabs.language="${2/lang}" tabs.code="${2/code}" tabs@ids=["ce-16-json-38bb3a"]}
### Json

```json
// Plone search result:
{ "@id": "/news/article", "image_field": "image", "image_scales": { "image": [{ "...": "..." }] } }

// After normalization:
{ "@id": "/news/article", "image": { "@id": "/news/article", "image_field": "image", "image_scales": { "...": "..." } } }
```
:::

This self-contained object has everything needed to resolve image URLs with scale support — see the Nuxt example's `composables/imageProps.js` for one approach.

For non-Plone backends (RSS feeds, external APIs, etc.), write your own fetcher: `async (block, { start, size }) => ({ items, total })`. `start` is the zero-based offset, `size` is the number of items to return (or `0` for total-only), and `total` in the return value is the full count, not just this page.

## Example fetchers

The same `fetchItems` seam powers other "collection" blocks — each is just a fetcher that returns raw result objects (`expandListingBlocks` maps `@id → href` etc. and repeats an item block per result, so they need **no bespoke renderer**; they render via the standard item types on every frontend). `@hydra-js/helpers` ships three reference fetchers:

:::slateTable{uid="tbl-21"}
```fields
{
 "table": {
  "fixed": true,
  "compact": false,
  "basic": false,
  "celled": true,
  "inverted": false,
  "striped": false,
  "rows": [
   {
    "key": "tbl-21-r0",
    "cells": [
     {
      "key": "tbl-21-r0c0",
      "type": "header",
      "value": [
       {
        "type": "p",
        "children": [
         {
          "text": "Fetcher"
         }
        ]
       }
      ]
     },
     {
      "key": "tbl-21-r0c1",
      "type": "header",
      "value": [
       {
        "type": "p",
        "children": [
         {
          "text": "Block"
         }
        ]
       }
      ]
     },
     {
      "key": "tbl-21-r0c2",
      "type": "header",
      "value": [
       {
        "type": "p",
        "children": [
         {
          "text": "What it returns"
         }
        ]
       }
      ]
     }
    ]
   },
   {
    "key": "tbl-21-r1",
    "cells": [
     {
      "key": "tbl-21-r1c0",
      "type": "data",
      "value": [
       {
        "type": "p",
        "children": [
         {
          "type": "code",
          "children": [
           {
            "text": "relatedItemsFetcher({ apiUrl, contextPath })"
           }
          ]
         }
        ]
       }
      ]
     },
     {
      "key": "tbl-21-r1c1",
      "type": "data",
      "value": [
       {
        "type": "p",
        "children": [
         {
          "type": "strong",
          "children": [
           {
            "text": "Related Items"
           }
          ]
         }
        ]
       }
      ]
     },
     {
      "key": "tbl-21-r1c2",
      "type": "data",
      "value": [
       {
        "type": "p",
        "children": [
         {
          "text": "the current page's relation field (default "
         },
         {
          "type": "code",
          "children": [
           {
            "text": "relatedItems"
           }
          ]
         },
         {
          "text": ") — its summaries, paged"
         }
        ]
       }
      ]
     }
    ]
   },
   {
    "key": "tbl-21-r2",
    "cells": [
     {
      "key": "tbl-21-r2c0",
      "type": "data",
      "value": [
       {
        "type": "p",
        "children": [
         {
          "type": "code",
          "children": [
           {
            "text": "searchShortcutsFetcher({ apiUrl, contextPath })"
           }
          ]
         }
        ]
       }
      ]
     },
     {
      "key": "tbl-21-r2c1",
      "type": "data",
      "value": [
       {
        "type": "p",
        "children": [
         {
          "type": "strong",
          "children": [
           {
            "text": "Search Shortcuts"
           }
          ]
         }
        ]
       }
      ]
     },
     {
      "key": "tbl-21-r2c2",
      "type": "data",
      "value": [
       {
        "type": "p",
        "children": [
         {
          "text": "one link per value, each "
         },
         {
          "type": "code",
          "children": [
           {
            "text": "@id"
           }
          ]
         },
         {
          "text": " set to "
         },
         {
          "type": "code",
          "children": [
           {
            "text": "${searchUrl}?facet.${index}=${value}"
           }
          ]
         },
         {
          "text": " (a shortcut into a search page's facet). A linked "
         },
         {
          "type": "code",
          "children": [
           {
            "text": "pageField"
           }
          ]
         },
         {
          "text": " → this page's values; none → the index's site-wide unique values (e.g. "
         },
         {
          "type": "code",
          "children": [
           {
            "text": "Keywords"
           }
          ]
         },
         {
          "text": " for "
         },
         {
          "type": "code",
          "children": [
           {
            "text": "Subject"
           }
          ]
         },
         {
          "text": ")"
         }
        ]
       }
      ]
     }
    ]
   },
   {
    "key": "tbl-21-r3",
    "cells": [
     {
      "key": "tbl-21-r3c0",
      "type": "data",
      "value": [
       {
        "type": "p",
        "children": [
         {
          "type": "code",
          "children": [
           {
            "text": "rssFetcher()"
           }
          ]
         }
        ]
       }
      ]
     },
     {
      "key": "tbl-21-r3c1",
      "type": "data",
      "value": [
       {
        "type": "p",
        "children": [
         {
          "type": "strong",
          "children": [
           {
            "text": "RSS Feed"
           }
          ]
         }
        ]
       }
      ]
     },
     {
      "key": "tbl-21-r3c2",
      "type": "data",
      "value": [
       {
        "type": "p",
        "children": [
         {
          "text": "entries from "
         },
         {
          "type": "code",
          "children": [
           {
            "text": "block.feedUrl"
           }
          ]
         },
         {
          "text": ", client-side "
         },
         {
          "type": "code",
          "children": [
           {
            "text": "fetch"
           }
          ]
         },
         {
          "text": " (best-effort — a CORS/parse error degrades to an empty feed); each entry's "
         },
         {
          "type": "code",
          "children": [
           {
            "text": "@id"
           }
          ]
         },
         {
          "text": " is its link"
         }
        ]
       }
      ]
     }
    ]
   }
  ]
 }
}
```
:::

Register them alongside `listing` in the `fetchItems` map:

:::codeExample{uid="ce-23" tabs="${1.../h3}" tabs.label="${1/text}" tabs.language="${2/lang}" tabs.code="${2/code}" tabs@ids=["ce-23-json-6d0894"]}
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
:::

The **Search Shortcuts** link target reads Volto's search-block facet params — a page with a `search` block picks up `?facet.<index>=<value>` from the URL. The block's *index* uses the existing `select_querystring_field` widget; the optional *this-page field* uses `schemaFieldSelect` (a `/@types`-backed field dropdown, parameterized by `fieldType`), which **Related Items** also uses with `fieldType: 'relation'`.

## Field Mapping

`fieldMapping` on a listing block controls which fields appear on expanded items — only mapped fields are included. Default: `{ @id → href, title → title, description → description, image → image }`. Values can be a string (rename) or `{ field, type }` for conversions:

Built-in item types and the fields they expose:

:::slateTable{uid="tbl-28"}
```fields
{
 "table": {
  "fixed": true,
  "compact": false,
  "basic": false,
  "celled": true,
  "inverted": false,
  "striped": false,
  "rows": [
   {
    "key": "tbl-28-r0",
    "cells": [
     {
      "key": "tbl-28-r0c0",
      "type": "header",
      "value": [
       {
        "type": "p",
        "children": [
         {
          "text": "Type"
         }
        ]
       }
      ]
     },
     {
      "key": "tbl-28-r0c1",
      "type": "header",
      "value": [
       {
        "type": "p",
        "children": [
         {
          "text": "Fields"
         }
        ]
       }
      ]
     }
    ]
   },
   {
    "key": "tbl-28-r1",
    "cells": [
     {
      "key": "tbl-28-r1c0",
      "type": "data",
      "value": [
       {
        "type": "p",
        "children": [
         {
          "type": "code",
          "children": [
           {
            "text": "default"
           }
          ]
         }
        ]
       }
      ]
     },
     {
      "key": "tbl-28-r1c1",
      "type": "data",
      "value": [
       {
        "type": "p",
        "children": [
         {
          "type": "code",
          "children": [
           {
            "text": "title"
           }
          ]
         },
         {
          "text": ", "
         },
         {
          "type": "code",
          "children": [
           {
            "text": "description"
           }
          ]
         },
         {
          "text": ", "
         },
         {
          "type": "code",
          "children": [
           {
            "text": "href"
           }
          ]
         }
        ]
       }
      ]
     }
    ]
   },
   {
    "key": "tbl-28-r2",
    "cells": [
     {
      "key": "tbl-28-r2c0",
      "type": "data",
      "value": [
       {
        "type": "p",
        "children": [
         {
          "type": "code",
          "children": [
           {
            "text": "summary"
           }
          ]
         }
        ]
       }
      ]
     },
     {
      "key": "tbl-28-r2c1",
      "type": "data",
      "value": [
       {
        "type": "p",
        "children": [
         {
          "type": "code",
          "children": [
           {
            "text": "title"
           }
          ]
         },
         {
          "text": ", "
         },
         {
          "type": "code",
          "children": [
           {
            "text": "description"
           }
          ]
         },
         {
          "text": ", "
         },
         {
          "type": "code",
          "children": [
           {
            "text": "href"
           }
          ]
         },
         {
          "text": ", "
         },
         {
          "type": "code",
          "children": [
           {
            "text": "image"
           }
          ]
         }
        ]
       }
      ]
     }
    ]
   },
   {
    "key": "tbl-28-r3",
    "cells": [
     {
      "key": "tbl-28-r3c0",
      "type": "data",
      "value": [
       {
        "type": "p",
        "children": [
         {
          "type": "code",
          "children": [
           {
            "text": "teaser"
           }
          ]
         }
        ]
       }
      ]
     },
     {
      "key": "tbl-28-r3c1",
      "type": "data",
      "value": [
       {
        "type": "p",
        "children": [
         {
          "type": "code",
          "children": [
           {
            "text": "title"
           }
          ]
         },
         {
          "text": ", "
         },
         {
          "type": "code",
          "children": [
           {
            "text": "description"
           }
          ]
         },
         {
          "text": ", "
         },
         {
          "type": "code",
          "children": [
           {
            "text": "href"
           }
          ]
         },
         {
          "text": ", "
         },
         {
          "type": "code",
          "children": [
           {
            "text": "preview_image"
           }
          ]
         }
        ]
       }
      ]
     }
    ]
   }
  ]
 }
}
```
:::

:::codeExample{uid="ce-29" tabs="${1.../h3}" tabs.label="${1/text}" tabs.language="${2/lang}" tabs.code="${2/code}" tabs@ids=["ce-29-json-a7c4dc"]}
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
:::

## Item Type Selection

Use `variation` on the listing block to control what `@type` expanded items get. Listings reuse the same `inheritSchemaFrom` recipe as container blocks (see [Container Blocks › Synchronised Block Types](container-blocks.md#synchronised-block-types-in-a-container)) but differ in one structural way: there's no blocks field to declare `itemTypeField` on, since listing children are *virtual* (produced from query results at render time, not authored as page data). Instead, declare the typeField directly on the `inheritSchemaFrom` recipe:

:::codeExample{uid="ce-32" tabs="${1.../h3}" tabs.label="${1/text}" tabs.language="${2/lang}" tabs.code="${2/code}" tabs@ids=["ce-32-javascript-f6757f"]}
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
:::

`filterConvertibleFrom: '@default'` restricts the dropdown to types that have a `fieldMappings['@default']` entry — i.e. types that can be populated from the canonical content fields (`@id`, `title`, `description`, `image`) that listing queries return. Each item type's `fieldMappings['@default']` (on its own block config) defines how those source fields land on its schema; that static mapping is enough to render listings. Adding `mappingField` to the enhancer exposes the `FieldMappingWidget` so the editor can override the mapping per listing instance.

The widget saves its output as `fieldMapping` (singular) on the block data. `expandListingBlocks` reads that at render time to translate each query result into an item block.

## Combining Listings with Container Syncing

A container (e.g. `gridBlock`) can mix **manual children** AND **a listing** as children. Add `'listing'` to the blocks field's `allowedBlocks`, and the parent's typeField propagates everywhere:

:::codeExample{uid="ce-37" tabs="${1.../h3}" tabs.label="${1/text}" tabs.language="${2/lang}" tabs.code="${2/code}" tabs@ids=["ce-37-javascript-2ec596"]}
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
:::

`filterConvertibleFrom: '@default'` keeps `'listing'` out of the dropdown (it's a structural container, not an item type, so it has no `fieldMappings['@default']`) but it stays in `allowedBlocks` so a listing block can still exist as a structural child. The editor sees "Teaser / Image / Summary" in the picker; the listing is a structural choice they don't have to think about.

When the editor changes `gridBlock.variation` to e.g. `'summary'`:

- **Manual children** (a teaser, an image) get their `@type` converted via the destination type's `fieldMappings` — teaser becomes summary.
- **Listing child** keeps `@type: 'listing'` but its own `variation` field is set to `'summary'`, so the listing now renders summary items.

The sync walks recursively — if the listing held nested containers with their own typeFields, those would update too. Net effect: ONE picker on the parent controls the rendered type for every descendant, regardless of whether descendants are authored manually or expanded from a query.

## Path Transformation (pathToApiPath)

If your frontend embeds state in the URL path (like pagination), you need to tell hydra.js how to transform the frontend path to the API/admin path. Otherwise, the admin will try to navigate to URLs that don't exist in the CMS.

:::codeExample{uid="ce-44" tabs="${1.../h3}" tabs.label="${1/text}" tabs.language="${2/lang}" tabs.code="${2/code}" tabs@ids=["ce-44-javascript-82ad8e"]}
### Javascript

```javascript
const bridge = initBridge({
    page: { ... },
    // Transform frontend path to API path by stripping paging segments
    // e.g., /test-page/@pg_block-8-grid_1 -> /test-page
    pathToApiPath: (path) => path.replace(/\/@pg_[^/]+_\d+/, ''),
});
```
:::

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
