# Related Items Block

Renders the current page's *related items* relation field (default `relatedItems`) as a list, reusing the listing machinery — each related item is rendered with a configurable item type (variation).

This is a **custom** example block — register its fetcher via `initBridge` (see below).

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

The render is **identical to every list block** — call `expandListingBlocks`, then map over the items; only the fetcher above is block-specific. Register it in `fetchItems`:

```javascript
fetchItems: { relatedItemsListing: relatedItemsFetcher({ apiUrl, contextPath }) }
```

See the [Listing block](./listing.md#rendering) for the per-stack (React / Vue / Svelte / Astro) render component and [Listings › Example fetchers](../listings.md#example-fetchers) for the full picture.
