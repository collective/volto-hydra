# Search Shortcuts Block

Renders a set of values as links into a faceted search — a "tag cloud" of shortcuts. Each value links to a search page with `?facet.<index>=<value>` pre-set, which a [Search block](./search.md) reads from the URL.

This is a **custom** example block — register its fetcher via `initBridge` (see below).

## Schema

```json
{
  "searchShortcuts": {
    "id": "searchShortcuts",
    "title": "Search Shortcuts",
    "blockSchema": {
      "fieldsets": [
        {
          "id": "default",
          "title": "Default",
          "fields": [
            "index",
            "pageField",
            "searchUrl",
            "variation",
            "fieldMapping"
          ]
        }
      ],
      "properties": {
        "index": {
          "title": "Index",
          "widget": "select_querystring_field",
          "vocabulary": {
            "@id": "plone.app.contenttypes.metadatafields"
          },
          "default": "Subject"
        },
        "pageField": {
          "title": "This page field (optional)",
          "widget": "schemaFieldSelect",
          "fieldType": "keyword"
        },
        "searchUrl": {
          "title": "Search page URL",
          "widget": "url"
        },
        "variation": {
          "title": "Item Type",
          "widget": "blockTypeSelect",
          "filterConvertibleFrom": "@default",
          "default": "default"
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
  "@type": "searchShortcuts",
  "index": "Subject",
  "pageField": "subjects",
  "searchUrl": "/search",
  "variation": "default"
}
```

## Rendering

Search Shortcuts expands via `expandListingBlocks` into standard link items (each result's `@id` is the facet-search URL, so the default `@id → href` mapping renders a link) — **no bespoke renderer**. Register `searchShortcutsFetcher` for the `searchShortcuts` type:

```javascript
import { expandListingBlocks, searchShortcutsFetcher } from '@hydra-js/helpers';

const { items } = await expandListingBlocks([blockId], {
  blocks: { [blockId]: block },
  fetchItems: { searchShortcuts: searchShortcutsFetcher({ apiUrl, contextPath }) },
  itemTypeField: 'variation',
});
```

Pick the `index` with the existing `select_querystring_field` widget (e.g. `Subject`). Link an optional `pageField` (via `schemaFieldSelect`, `fieldType: 'keyword'`) to show **this page's** values of that field; leave it empty to show all unique values of the index **site-wide** (from the index's vocabulary, e.g. `Keywords` for `Subject`). See [Listings › Example fetchers](../listings.md#example-fetchers).
