# RSS Feed Block

Renders entries from an external RSS feed, reusing the listing machinery. Each entry is rendered with a configurable item type (variation).

This is a **custom** example block — register its fetcher via `initBridge` (see below).

## Schema

```json
{
  "rssFeed": {
    "id": "rssFeed",
    "title": "RSS Feed",
    "blockSchema": {
      "fieldsets": [
        {
          "id": "default",
          "title": "Default",
          "fields": [
            "feedUrl",
            "count",
            "variation",
            "fieldMapping"
          ]
        }
      ],
      "properties": {
        "feedUrl": {
          "title": "Feed URL",
          "widget": "url"
        },
        "count": {
          "title": "Max items",
          "type": "number",
          "default": 6
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
  "@type": "rssFeed",
  "feedUrl": "https://example.com/feed.xml",
  "count": 6,
  "variation": "summary"
}
```

## Rendering

RSS Feed expands via `expandListingBlocks` into standard item blocks (each entry's `@id` is its link) — **no bespoke renderer**. Register `rssFetcher` for the `rssFeed` type:

```javascript
import { expandListingBlocks, rssFetcher } from '@hydra-js/helpers';

const { items } = await expandListingBlocks([blockId], {
  blocks: { [blockId]: block },
  fetchItems: { rssFeed: rssFetcher() },
  itemTypeField: 'variation',
});
```

The fetch is **client-side and best-effort**: most feeds block cross-origin requests, so a CORS or parse failure degrades to an empty feed rather than an error. For a production setup, proxy the feed through your own server route. See [Listings › Example fetchers](../listings.md#example-fetchers).
