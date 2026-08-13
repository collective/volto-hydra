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
blocks:
  - title-1: title
  - ref-relatedItemsListing-description: slate
  - ri-live-heading: slate
  - ri-live-1: relatedItemsListing
  - ref-relatedItemsListing-schema: codeExample
  - ref-relatedItemsListing-json-data: codeExample
  - ref-relatedItemsListing-rendering-intro: slate
  - ref-relatedItemsListing-fetcher: codeExample
  - ref-relatedItemsListing-rendering: codeExample
---

:::title{uid="title-1"}
:::

Renders the current page's related items relation field (default relatedItems). Its items are fetched at render time and shown with a configurable item type (variation).

## Live example

:::relatedItemsListing{uid="ri-live-1" relationField="relatedItems" variation="summary"}
:::

:::codeExample{uid="ref-relatedItemsListing-schema" templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-relatedItemsListing" slotId="schema" tabs="${1.../h3}" tabs.label="${1/text}" tabs.language="${2/lang}" tabs.code="${2/code}" tabs@ids=["ref-relatedItemsListing-schema-javascript-a1a504"]}
### Schema

```javascript
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
:::

:::codeExample{uid="ref-relatedItemsListing-json-data" templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-relatedItemsListing" slotId="json-data" tabs="${1.../h3}" tabs.label="${1/text}" tabs.language="${2/lang}" tabs.code="${2/code}" tabs@ids=["ref-relatedItemsListing-json-data-json-ba9577"]}
### JSON Block Data

```json
{
  "@type": "relatedItemsListing",
  "variation": "summary",
  "relationField": "relatedItems"
}
```
:::

:::slate{uid="ref-relatedItemsListing-rendering-intro" templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-relatedItemsListing" slotId="rendering"}
This block has no bespoke renderer. Add its fetcher to your fetchItems map (keyed by @type) and expandListingBlocks expands it in any region you render — the same seam that powers [listings](/docs/listings) and other collection blocks. See [Custom Blocks](/docs/custom-blocks) to define the block type. Only the fetcher below is block-specific.
:::

:::codeExample{uid="ref-relatedItemsListing-fetcher" templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-relatedItemsListing" slotId="rendering" tabs="${1.../h3}" tabs.label="${1/text}" tabs.language="${2/lang}" tabs.code="${2/code}" tabs@ids=["ref-relatedItemsListing-fetcher-javascript-1c975d"]}
### Fetcher

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
:::

:::codeExample{uid="ref-relatedItemsListing-rendering" templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-relatedItemsListing" slotId="rendering" tabs="${1.../h3}" tabs.label="${1/text}" tabs.language="${2/lang}" tabs.code="${2/code}" tabs@ids=["ref-relatedItemsListing-rendering-javascript-2b9d44"]}
### Render

```javascript
// One fetchItems map, keyed by @type, holds every fetch-based block you use.
const fetchItems = {
  listing: ploneFetchItems({ apiUrl, contextPath }),
  relatedItemsListing: relatedItemsFetcher({ apiUrl, contextPath }), // ← this block
};

// Call this on each region you render (the list of block ids in that region).
const { items } = await expandListingBlocks(regionBlockIds, {
  blocks, fetchItems, itemTypeField: 'variation',
});
items.forEach((item) => renderBlock(item)); // your normal per-block renderer
```
:::
