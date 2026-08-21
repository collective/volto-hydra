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
is_folderish: false
language: "##DEFAULT##"
layout: document_view
review_state: published
rights: ""
subjects:
  - blocks
  - listings
title: Related Items Block
blocks-assignments:
  - { uid: title-1 }
  - { uid: ref-relatedItemsListing-description }
  - { uid: ri-live-heading }
  - { uid: ri-live-1 }
  - { uid: ref-relatedItemsListing-schema }
  - { id: ref-relatedItemsListing-schema-javascript-a1a504 }
  - { uid: ref-relatedItemsListing-json-data }
  - { id: ref-relatedItemsListing-json-data-json-ba9577 }
  - { uid: ref-relatedItemsListing-rendering-intro }
  - { uid: ref-relatedItemsListing-fetcher }
  - { id: ref-relatedItemsListing-fetcher-javascript-1c975d }
  - { uid: ref-relatedItemsListing-rendering }
  - { id: ref-relatedItemsListing-rendering-javascript-2b9d44 }
blocks-matched: |
  <block type="slate" value="${p,h*,ul,ol,blockquote,strong,em/slate}" />
  <block type="title" _="${h1}" />
  <block type="codeExample">
    <region name="tabs" widget="object_list">
      <block type="tab" label="${h3/text}" language="${pre/lang}" code="${pre/text}" />
    </region>
  </block>
---

# Related Items Block

Renders the current page's related items relation field (default relatedItems). Its items are fetched at render time and shown with a configurable item type (variation).

## Live example

<block type="relatedItemsListing" relationField="relatedItems" variation="summary" />

<fields templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-relatedItemsListing">

<block type="codeExample" slotId="schema">

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

</block>

<block type="codeExample" slotId="json-data">

### JSON Block Data

```json
{
  "@type": "relatedItemsListing",
  "variation": "summary",
  "relationField": "relatedItems"
}
```

</block>

<fields slotId="rendering">

This block has no bespoke renderer. Add its fetcher to your fetchItems map (keyed by @type) and expandListingBlocks expands it in any region you render — the same seam that powers [listings](/docs/listings) and other collection blocks. See [Custom Blocks](/docs/custom-blocks) to define the block type. Only the fetcher below is block-specific.

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

<block type="codeExample">

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

</block>

</fields>

</fields>
