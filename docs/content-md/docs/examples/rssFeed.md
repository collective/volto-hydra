---
"@type": Document
UID: docs-examples-rssFeed-001
allow_discussion: false
contributors: []
creators:
  - admin
description: Renders entries from an external RSS feed, reusing the listing
  machinery. Each entry is rendered with a configurable item type (variation).
effective: null
exclude_from_nav: false
expires: null
id: rssFeed
language: "##DEFAULT##"
layout: document_view
review_state: published
rights: ""
subjects:
  - blocks
  - listings
title: RSS Feed Block
blocks:
  - title-1: title
  - ref-rssFeed-description: slate
  - rss-live-heading: slate
  - rss-live-1: rssFeed
  - ref-rssFeed-schema: codeExample
  - ref-rssFeed-json-data: codeExample
  - ref-rssFeed-rendering-intro: slate
  - ref-rssFeed-fetcher: codeExample
  - ref-rssFeed-rendering: codeExample
---

:::title{uid="title-1"}
:::

Renders entries from an external RSS feed. Its items are fetched at render time (by a fetcher you provide) and shown with a configurable item type (variation).

## Live example

:::rssFeed{uid="rss-live-1" feedUrl="https://pypi.org/rss/project/plone/releases.xml" variation="default"}
:::

:::codeExample{uid="ref-rssFeed-schema" templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-rssFeed" slotId="schema"}
::::tabs[items]{repeat="h3" label="${1/text}" language="${2/lang}" code="${2/code}" @ids=["ref-rssFeed-schema-javascript-d79cf2"]}
### Schema

```javascript
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
::::
:::

:::codeExample{uid="ref-rssFeed-json-data" templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-rssFeed" slotId="json-data"}
::::tabs[items]{repeat="h3" label="${1/text}" language="${2/lang}" code="${2/code}" @ids=["ref-rssFeed-json-data-json-c55bf4"]}
### JSON Block Data

```json
{
  "@type": "rssFeed",
  "feedUrl": "https://pypi.org/rss/project/plone/releases.xml",
  "count": 6,
  "variation": "summary"
}
```
::::
:::

:::slate{uid="ref-rssFeed-rendering-intro" templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-rssFeed" slotId="rendering"}
This block has no bespoke renderer. Add its fetcher to your fetchItems map (keyed by @type) and expandListingBlocks expands it in any region you render — the same seam that powers [listings](/docs/listings) and other collection blocks. See [Custom Blocks](/docs/custom-blocks) to define the block type. Only the fetcher below is block-specific.
:::

:::codeExample{uid="ref-rssFeed-fetcher" templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-rssFeed" slotId="rendering"}
::::tabs[items]{repeat="h3" label="${1/text}" language="${2/lang}" code="${2/code}" @ids=["ref-rssFeed-fetcher-javascript-7f0034"]}
### Fetcher

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
::::
:::

:::codeExample{uid="ref-rssFeed-rendering" templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-rssFeed" slotId="rendering"}
::::tabs[items]{repeat="h3" label="${1/text}" language="${2/lang}" code="${2/code}" @ids=["ref-rssFeed-rendering-javascript-df4061"]}
### Render

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
::::
:::
