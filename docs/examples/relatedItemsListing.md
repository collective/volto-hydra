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

## Rendering

Like the [Listing block](./listing.md), Related Items expands via `expandListingBlocks` and renders each result with the standard item renderer — **no bespoke renderer**. The only difference is the fetcher: register `relatedItemsFetcher` for the `relatedItemsListing` type in your `fetchItems` map.

```javascript
import { expandListingBlocks, relatedItemsFetcher } from '@hydra-js/helpers';

const { items } = await expandListingBlocks([blockId], {
  blocks: { [blockId]: block },
  fetchItems: { relatedItemsListing: relatedItemsFetcher({ apiUrl, contextPath }) },
  itemTypeField: 'variation',
});
```

The fetcher reads the current page's `relationField` (default `relatedItems`) — Plone serializes relations as summaries (`@id`/`title`/`description`/`image`), so no catalog query is needed. The optional field picker (`schemaFieldSelect` with `fieldType: 'relation'`) lists the content type's relation fields from `/@types`. See [Listings › Example fetchers](../listings.md#example-fetchers).
