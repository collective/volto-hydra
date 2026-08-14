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
assignments:
  - { uid: title-1, type: title }
  - { uid: ref-rssFeed-description, type: slate }
  - { uid: rss-live-heading, type: slate }
  - { uid: rss-live-1, type: rssFeed }
  - { uid: ref-rssFeed-schema, type: codeExample }
  - { uid: ref-rssFeed-json-data, type: codeExample }
  - { uid: ref-rssFeed-rendering-intro, type: slate }
  - { uid: ref-rssFeed-fetcher, type: codeExample }
  - { uid: ref-rssFeed-rendering, type: codeExample }
prototypes: |
  <block type="title"      _="${h1}" />
  <block type="slate"      value="${p|h2|h3|h4|h5|h6|ul|ol|blockquote/slate}" />
---

# RSS Feed Block

Renders entries from an external RSS feed. Its items are fetched at render time (by a fetcher you provide) and shown with a configurable item type (variation).

## Live example

<block type="rssFeed" uid="rss-live-1" feedUrl="https://pypi.org/rss/project/plone/releases.xml" variation="default" />

<block type="codeExample" uid="ref-rssFeed-schema" templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-rssFeed" slotId="schema" data='{"tabs":[{"@id":"ref-rssFeed-schema-javascript-d79cf2","label":"Schema","language":"javascript","code":"{\n  \"rssFeed\": {\n    \"id\": \"rssFeed\",\n    \"title\": \"RSS Feed\",\n    \"blockSchema\": {\n      \"fieldsets\": [\n        {\n          \"id\": \"default\",\n          \"title\": \"Default\",\n          \"fields\": [\n            \"feedUrl\",\n            \"count\",\n            \"variation\",\n            \"fieldMapping\"\n          ]\n        }\n      ],\n      \"properties\": {\n        \"feedUrl\": {\n          \"title\": \"Feed URL\",\n          \"widget\": \"url\"\n        },\n        \"count\": {\n          \"title\": \"Max items\",\n          \"type\": \"number\",\n          \"default\": 6\n        },\n        \"variation\": {\n          \"title\": \"Item Type\",\n          \"widget\": \"blockTypeSelect\",\n          \"filterConvertibleFrom\": \"@default\",\n          \"default\": \"summary\"\n        }\n      }\n    },\n    \"schemaEnhancer\": {\n      \"inheritSchemaFrom\": {\n        \"typeField\": \"variation\",\n        \"mappingField\": \"fieldMapping\",\n        \"defaultsField\": \"itemDefaults\"\n      }\n    }\n  }\n}"}]}' />

<block type="codeExample" uid="ref-rssFeed-json-data" templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-rssFeed" slotId="json-data" data='{"tabs":[{"@id":"ref-rssFeed-json-data-json-c55bf4","label":"JSON Block Data","language":"json","code":"{\n  \"@type\": \"rssFeed\",\n  \"feedUrl\": \"https://pypi.org/rss/project/plone/releases.xml\",\n  \"count\": 6,\n  \"variation\": \"summary\"\n}"}]}' />

<block type="slate" uid="ref-rssFeed-rendering-intro" templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-rssFeed" slotId="rendering" data='{"value":[{"type":"p","children":[{"text":"This block has no bespoke renderer. Add its fetcher to your fetchItems map (keyed by @type) and expandListingBlocks expands it in any region you render — the same seam that powers "},{"type":"link","data":{"url":"/docs/listings"},"children":[{"text":"listings"}]},{"text":" and other collection blocks. See "},{"type":"link","data":{"url":"/docs/custom-blocks"},"children":[{"text":"Custom Blocks"}]},{"text":" to define the block type. Only the fetcher below is block-specific."}]}]}' />

<block type="codeExample" uid="ref-rssFeed-fetcher" templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-rssFeed" slotId="rendering" data='{"tabs":[{"@id":"ref-rssFeed-fetcher-javascript-7f0034","label":"Fetcher","language":"javascript","code":"// packages/helpers — client-side, best-effort (CORS-permitting feeds).\nexport function rssFetcher() {\n  return async function fetchItems(block, { start, size }) {\n    let entries = [];\n    try {\n      const res = await fetch(block.feedUrl);\n      entries = parseRssEntries(await res.text()); // → [{ &#39;@id&#39;: link, title, description, pubDate }]\n    } catch {\n      return { items: [], total: 0 };              // CORS / parse failure → empty feed, never throws\n    }\n    if (block.count != null) entries = entries.slice(0, block.count);\n    return { items: entries.slice(start, start + size), total: entries.length };\n  };\n}\n\n// Dependency-free parse so it runs in the browser AND node (no DOMParser):\nfunction parseRssEntries(xml) {\n  const out = [];\n  const tag = (b, n) => (new RegExp(`<${n}\\\\b[^>]*>([\\\\s\\\\S]*?)<\\\\/${n}>`, &#39;i&#39;).exec(b) || [])[1];\n  for (const m of xml.matchAll(/<item\\b[^>]*>([\\s\\S]*?)<\\/item>/gi)) {\n    const b = m[1];\n    out.push({ &#39;@id&#39;: tag(b, &#39;link&#39;) || &#39;&#39;, title: tag(b, &#39;title&#39;) || &#39;&#39;, description: tag(b, &#39;description&#39;) || &#39;&#39;, pubDate: tag(b, &#39;pubDate&#39;) });\n  }\n  return out;\n}"}]}' />

<block type="codeExample" uid="ref-rssFeed-rendering" templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-rssFeed" slotId="rendering" data='{"tabs":[{"@id":"ref-rssFeed-rendering-javascript-df4061","label":"Render","language":"javascript","code":"// One fetchItems map, keyed by @type, holds every fetch-based block you use.\nconst fetchItems = {\n  listing: ploneFetchItems({ apiUrl, contextPath }),\n  rssFeed: rssFetcher(), // ← this block — just another entry\n};\n\n// Call this on each region you render (the list of block ids in that region).\nconst { items } = await expandListingBlocks(regionBlockIds, {\n  blocks, fetchItems, itemTypeField: &#39;variation&#39;,\n});\nitems.forEach((item) => renderBlock(item)); // your normal per-block renderer"}]}' />
