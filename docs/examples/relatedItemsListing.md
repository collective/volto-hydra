# Related Items Block

Renders the current page's *related items* relation field (default `relatedItems`). Its items are fetched at render time and shown with a configurable item type (variation).

It's a custom block type whose items come from a fetcher; `expandListingBlocks` expands it in any region (see Rendering).

## Schema

```json
{
  "relatedItemsListing": {
    "id": "relatedItemsListing",
    "title": "Related Items",
    "blockSchema": {
      "fieldsets": [
        {
          "id": "default",
          "title": "Default",
          "fields": [
            "relationField",
            "variation",
            "fieldMapping"
          ]
        }
      ],
      "properties": {
        "relationField": {
          "title": "Relation field",
          "widget": "schemaFieldSelect",
          "fieldType": "relation"
        },
        "variation": {
          "title": "Item Type",
          "widget": "blockTypeSelect",
          "filterConvertibleFrom": "@default",
          "default": "summary"
        }
      }
    },
    "schemaEnhancer": {
      "inheritSchemaFrom": {
        "typeField": "variation",
        "mappingField": "fieldMapping",
        "defaultsField": "itemDefaults"
      }
    }
  }
}
```


## JSON Block Data

```json
{
  "@type": "relatedItemsListing",
  "variation": "summary",
  "relationField": "relatedItems"
}
```

## Fetcher

The whole block is a **fetcher** — everything block-specific lives here. A fetcher is `async (block, { start, size }) => ({ items, total })`; `expandListingBlocks` calls it, keyed by the block's `@type`. This one reads the current page's relation field — Plone already serializes relations as summaries (`@id`/`title`/`description`/`image`), so there's no catalog query, just a read + page:

```javascript
export function relatedItemsFetcher({ apiUrl, contextPath }) {
  return async function fetchItems(block, { start, size }) {
    const field = block.relationField || 'relatedItems';
    const content = await (await fetch(`${apiUrl}${contextPath}/++api++`, { headers: authHeaders() })).json();
    const all = Array.isArray(content[field]) ? content[field] : [];
    return { items: all.slice(start, start + size), total: all.length };
  };
}
```

The optional field picker (`schemaFieldSelect`, `fieldType: 'relation'`) lists the content type's relation fields from `/@types`, so an editor can point the block at a different relation field.

## Rendering

There's no bespoke renderer. Add this block's fetcher to your `fetchItems` map (keyed by `@type`) alongside any other fetch-based blocks, then expand each region with `expandListingBlocks` — it turns every block whose `@type` is in the map into ready-to-render item blocks. Only the fetcher above is block-specific.

```javascript
// One fetchItems map, keyed by @type, holds every fetch-based block you use.
const fetchItems = {
  listing: ploneFetchItems({ apiUrl, contextPath }),
  relatedItemsListing: relatedItemsFetcher({ apiUrl, contextPath }), // ← this block
};

// Call this on each region you render (the list of block ids in that region).
const { items } = await expandListingBlocks(regionBlockIds, {
  blocks, fetchItems, itemTypeField: 'variation',
});
items.forEach((item) => renderBlock(item)); // your normal per-block renderer
```

See the [Listing block](./listing.md#rendering) for full per-stack (React / Vue / Svelte / Astro) render components, and [Listings](../listings.md) for the expand pattern.
