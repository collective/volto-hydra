---
"@type": Document
UID: docs-examples-relatedItemsListing-001
allow_discussion: false
contributors: []
creators:
  - admin
description: Renders the current page's related items relation field (default
  relatedItems) as a list, reusing the listing machinery — each related item is
  rendered with a configurable item type (variation).
effective: null
exclude_from_nav: false
expires: null
id: relatedItemsListing
language: "##DEFAULT##"
layout: document_view
review_state: published
rights: ""
subjects:
  - blocks
  - listings
title: Related Items Block
assignments:
  - { uid: title-1, type: title }
  - { uid: ref-relatedItemsListing-description, type: slate }
  - { uid: ri-live-heading, type: slate }
  - { uid: ri-live-1, type: relatedItemsListing }
  - { uid: ref-relatedItemsListing-schema, type: codeExample }
  - { uid: ref-relatedItemsListing-json-data, type: codeExample }
  - { uid: ref-relatedItemsListing-rendering-intro, type: slate }
  - { uid: ref-relatedItemsListing-fetcher, type: codeExample }
  - { uid: ref-relatedItemsListing-rendering, type: codeExample }
prototypes: |
  <block type="title"      _="${h1}" />
  <block type="slate"      value="${p|h2|h3|h4|h5|h6|ul|ol|blockquote/slate}" />
---

# Related Items Block

Renders the current page's related items relation field (default relatedItems). Its items are fetched at render time and shown with a configurable item type (variation).

## Live example

<block type="relatedItemsListing" uid="ri-live-1" relationField="relatedItems" variation="summary" />

<block type="codeExample" uid="ref-relatedItemsListing-schema" templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-relatedItemsListing" slotId="schema" data='{"tabs":[{"@id":"ref-relatedItemsListing-schema-javascript-a1a504","label":"Schema","language":"javascript","code":"{\n  \"relatedItemsListing\": {\n    \"id\": \"relatedItemsListing\",\n    \"title\": \"Related Items\",\n    \"blockSchema\": {\n      \"fieldsets\": [\n        {\n          \"id\": \"default\",\n          \"title\": \"Default\",\n          \"fields\": [\n            \"relationField\",\n            \"variation\",\n            \"fieldMapping\"\n          ]\n        }\n      ],\n      \"properties\": {\n        \"relationField\": {\n          \"title\": \"Relation field\",\n          \"widget\": \"schemaFieldSelect\",\n          \"fieldType\": \"relation\"\n        },\n        \"variation\": {\n          \"title\": \"Item Type\",\n          \"widget\": \"blockTypeSelect\",\n          \"filterConvertibleFrom\": \"@default\",\n          \"default\": \"summary\"\n        }\n      }\n    },\n    \"schemaEnhancer\": {\n      \"inheritSchemaFrom\": {\n        \"typeField\": \"variation\",\n        \"mappingField\": \"fieldMapping\",\n        \"defaultsField\": \"itemDefaults\"\n      }\n    }\n  }\n}"}]}' />

<block type="codeExample" uid="ref-relatedItemsListing-json-data" templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-relatedItemsListing" slotId="json-data" data='{"tabs":[{"@id":"ref-relatedItemsListing-json-data-json-ba9577","label":"JSON Block Data","language":"json","code":"{\n  \"@type\": \"relatedItemsListing\",\n  \"variation\": \"summary\",\n  \"relationField\": \"relatedItems\"\n}"}]}' />

<block type="slate" uid="ref-relatedItemsListing-rendering-intro" templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-relatedItemsListing" slotId="rendering" data='{"value":[{"type":"p","children":[{"text":"This block has no bespoke renderer. Add its fetcher to your fetchItems map (keyed by @type) and expandListingBlocks expands it in any region you render — the same seam that powers "},{"type":"link","data":{"url":"/docs/listings"},"children":[{"text":"listings"}]},{"text":" and other collection blocks. See "},{"type":"link","data":{"url":"/docs/custom-blocks"},"children":[{"text":"Custom Blocks"}]},{"text":" to define the block type. Only the fetcher below is block-specific."}]}]}' />

<block type="codeExample" uid="ref-relatedItemsListing-fetcher" templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-relatedItemsListing" slotId="rendering" data='{"tabs":[{"@id":"ref-relatedItemsListing-fetcher-javascript-1c975d","label":"Fetcher","language":"javascript","code":"export function relatedItemsFetcher({ apiUrl, contextPath }) {\n  return async function fetchItems(block, { start, size }) {\n    const field = block.relationField || &#39;relatedItems&#39;;\n    const content = await (await fetch(`${apiUrl}${contextPath}/++api++`, { headers: authHeaders() })).json();\n    const all = Array.isArray(content[field]) ? content[field] : [];\n    return { items: all.slice(start, start + size), total: all.length };\n  };\n}"}]}' />

<block type="codeExample" uid="ref-relatedItemsListing-rendering" templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-relatedItemsListing" slotId="rendering" data='{"tabs":[{"@id":"ref-relatedItemsListing-rendering-javascript-2b9d44","label":"Render","language":"javascript","code":"// One fetchItems map, keyed by @type, holds every fetch-based block you use.\nconst fetchItems = {\n  listing: ploneFetchItems({ apiUrl, contextPath }),\n  relatedItemsListing: relatedItemsFetcher({ apiUrl, contextPath }), // ← this block\n};\n\n// Call this on each region you render (the list of block ids in that region).\nconst { items } = await expandListingBlocks(regionBlockIds, {\n  blocks, fetchItems, itemTypeField: &#39;variation&#39;,\n});\nitems.forEach((item) => renderBlock(item)); // your normal per-block renderer"}]}' />
