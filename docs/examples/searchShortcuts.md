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

## Fetcher

The whole block is a **fetcher** — everything block-specific lives here. A fetcher is `async (block, { start, size }) => ({ items, total })`; `expandListingBlocks` calls it, keyed by the block's `@type`. Return raw result objects: set each item's `@id` to the facet-search URL, and the default `@id → href` mapping renders it as a link — no bespoke renderer.

```javascript
export function searchShortcutsFetcher({ apiUrl, contextPath }) {
  return async function fetchItems(block, { start, size }) {
    const index = block.index || 'Subject';
    let values;
    if (block.pageField) {
      // Linked field → THIS page's values of that field.
      const content = await (await fetch(`${apiUrl}${contextPath}/++api++`, { headers: authHeaders() })).json();
      values = content[block.pageField] || [];
    } else {
      // No field → all unique values of the index, site-wide (its vocabulary).
      const vocab = index === 'Subject' ? 'plone.app.vocabularies.Keywords' : index;
      const data = await (await fetch(`${apiUrl}/++api++/@vocabularies/${vocab}`, { headers: authHeaders() })).json();
      values = (data.items || []).map((t) => t.token);
    }
    // Each value → a shortcut link; @id is the facet-search URL.
    const all = values.map((v) => ({
      '@id': `${block.searchUrl}?facet.${index}=${encodeURIComponent(v)}`,
      title: v,
    }));
    return { items: all.slice(start, start + size), total: all.length };
  };
}
```

Pick the `index` with the existing `select_querystring_field` widget (e.g. `Subject`); the optional `pageField` uses `schemaFieldSelect` with `fieldType: 'keyword'`.

## Rendering

The render is **identical to every list block** — call `expandListingBlocks`, then map over the items; only the fetcher above is block-specific. Register it in `fetchItems`:

```javascript
fetchItems: { searchShortcuts: searchShortcutsFetcher({ apiUrl, contextPath }) }
```

See the [Listing block](./listing.md#rendering) for the per-stack (React / Vue / Svelte / Astro) render component and [Listings › Example fetchers](../listings.md#example-fetchers) for the full picture.
