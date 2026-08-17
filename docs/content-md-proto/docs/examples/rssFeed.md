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
is_folderish: false
language: "##DEFAULT##"
layout: document_view
review_state: published
rights: ""
subjects:
  - blocks
  - listings
title: RSS Feed Block
blocks-assignments:
  - { uid: title-1 }
  - { uid: ref-rssFeed-description }
  - { uid: rss-live-heading }
  - { uid: rss-live-1 }
  - { uid: ref-rssFeed-schema }
  - { id: ref-rssFeed-schema-javascript-d79cf2 }
  - { uid: ref-rssFeed-json-data }
  - { id: ref-rssFeed-json-data-json-c55bf4 }
  - { uid: ref-rssFeed-rendering-intro }
  - { uid: ref-rssFeed-fetcher }
  - { id: ref-rssFeed-fetcher-javascript-7f0034 }
  - { uid: ref-rssFeed-rendering }
  - { id: ref-rssFeed-rendering-javascript-df4061 }
blocks-matched: |
  <block type="slate" value="${p,h*,ul,ol,blockquote/slate}" />
  <block type="title" _="${h1}" />
  <block type="codeExample">
    <region name="tabs" widget="object_list">
      <block type="tab" label="${h3/text}" language="${pre/lang}" code="${pre/text}" />
    </region>
  </block>
---

# 

Renders entries from an external RSS feed. Its items are fetched at render time (by a fetcher you provide) and shown with a configurable item type (variation).

## Live example

<block type="rssFeed" feedUrl="https://pypi.org/rss/project/plone/releases.xml" variation="default" />

<block type="codeExample" templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-rssFeed" slotId="schema">

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

</block>

<block type="codeExample" templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-rssFeed" slotId="json-data">

### JSON Block Data

```json
{
  "@type": "rssFeed",
  "feedUrl": "https://pypi.org/rss/project/plone/releases.xml",
  "count": 6,
  "variation": "summary"
}
```

</block>

<block type="slate">

This block has no bespoke renderer. Add its fetcher to your fetchItems map (keyed by @type) and expandListingBlocks expands it in any region you render — the same seam that powers [listings](/docs/listings) and other collection blocks. See [Custom Blocks](/docs/custom-blocks) to define the block type. Only the fetcher below is block-specific.

<fields templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-rssFeed" slotId="rendering" />

</block>

<block type="codeExample" templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-rssFeed" slotId="rendering">

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

</block>

<block type="codeExample" templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-rssFeed" slotId="rendering">

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

</block>
