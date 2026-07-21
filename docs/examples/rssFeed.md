# RSS Feed Block

Renders entries from an external RSS feed. Its items are fetched at render time (by a fetcher you provide) and shown with a configurable item type (variation).

It's a custom block type whose items come from a fetcher; `expandListingBlocks` expands it in any region (see Rendering).

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
  "feedUrl": "https://pypi.org/rss/project/plone/releases.xml",
  "count": 6,
  "variation": "summary"
}
```

## Fetcher

The whole block is a **fetcher** — everything block-specific lives here. A fetcher is `async (block, { start, size }) => ({ items, total })`; `expandListingBlocks` calls it, keyed by the block's `@type` in your `fetchItems` map. Return raw result objects — set each item's `@id` to what you want its link to be (here, the entry's link), and the default `@id → href` mapping turns it into a link item, so nothing renderer-side is special.

```javascript
// packages/helpers — client-side, best-effort (CORS-permitting feeds).
export function rssFetcher() {
  return async function fetchItems(block, { start, size }) {
    let entries = [];
    try {
      const res = await fetch(block.feedUrl);
      entries = parseRssEntries(await res.text()); // → [{ '@id': link, title, description, pubDate }]
    } catch {
      return { items: [], total: 0 };              // CORS / parse failure → empty feed, never throws
    }
    if (block.count != null) entries = entries.slice(0, block.count);
    return { items: entries.slice(start, start + size), total: entries.length };
  };
}

// Dependency-free parse so it runs in the browser AND node (no DOMParser):
function parseRssEntries(xml) {
  const out = [];
  const tag = (b, n) => (new RegExp(`<${n}\\b[^>]*>([\\s\\S]*?)<\\/${n}>`, 'i').exec(b) || [])[1];
  for (const m of xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)) {
    const b = m[1];
    out.push({ '@id': tag(b, 'link') || '', title: tag(b, 'title') || '', description: tag(b, 'description') || '', pubDate: tag(b, 'pubDate') });
  }
  return out;
}
```

Because this fetch runs in the browser, the feed must send an `Access-Control-Allow-Origin` header — most feeds don't. This example points at the [PyPI Plone releases feed](https://pypi.org/rss/project/plone/releases.xml), which does. For an arbitrary feed, fetch it server-side (SSR/SSG) or proxy it through your own route and point `feedUrl` at that.

## Rendering

There's no bespoke renderer. Add this block's fetcher to your `fetchItems` map (keyed by `@type`) alongside any other fetch-based blocks, then expand each region with `expandListingBlocks` — it turns every block whose `@type` is in the map into ready-to-render item blocks. Only the fetcher above is block-specific.

```javascript
// One fetchItems map, keyed by @type, holds every fetch-based block you use.
const fetchItems = {
  listing: ploneFetchItems({ apiUrl, contextPath }),
  rssFeed: rssFetcher(), // ← this block — just another entry
};

// Call this on each region you render (the list of block ids in that region).
const { items } = await expandListingBlocks(regionBlockIds, {
  blocks, fetchItems, itemTypeField: 'variation',
});
items.forEach((item) => renderBlock(item)); // your normal per-block renderer
```

See the [Listing block](./listing.md#rendering) for full per-stack (React / Vue / Svelte / Astro) render components, and [Listings](../listings.md) for the expand pattern.
