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
  - { id: ref-relatedItemsListing-schema-javascript-a1a504 }
  - { uid: ref-relatedItemsListing-json-data, type: codeExample }
  - { id: ref-relatedItemsListing-json-data-json-ba9577 }
  - { uid: ref-relatedItemsListing-rendering-intro, type: slate }
  - { uid: ref-relatedItemsListing-fetcher, type: codeExample }
  - { id: ref-relatedItemsListing-fetcher-javascript-1c975d }
  - { uid: ref-relatedItemsListing-rendering, type: codeExample }
  - { id: ref-relatedItemsListing-rendering-javascript-2b9d44 }
prototypes: |
  <block type="title" _="${h1}" />
  <block type="slate" value="${p|h*|ul|ol|blockquote/slate}" />
  <block type="codeExample">
    <region name="tabs" widget="object_list">
      <block type="tab" label="${h3/text}" language="${pre/lang}" code="${pre/text}" />
    </region>
  </block>
---

# 

Renders the current page's related items relation field (default relatedItems). Its items are fetched at render time and shown with a configurable item type (variation).

## Live example

<block type="relatedItemsListing" relationField="relatedItems" variation="summary" />

<block type="codeExample" templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-relatedItemsListing" slotId="schema">

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

<block type="codeExample" templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-relatedItemsListing" slotId="json-data">

### JSON Block Data

```json
{
  "@type": "relatedItemsListing",
  "variation": "summary",
  "relationField": "relatedItems"
}
```

</block>

<block type="slate" templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-relatedItemsListing" slotId="rendering" data='{"value":[{"type":"p","children":[{"text":"This block has no bespoke renderer. Add its fetcher to your fetchItems map (keyed by @type) and expandListingBlocks expands it in any region you render — the same seam that powers "},{"type":"link","data":{"url":"/docs/listings"},"children":[{"text":"listings"}]},{"text":" and other collection blocks. See "},{"type":"link","data":{"url":"/docs/custom-blocks"},"children":[{"text":"Custom Blocks"}]},{"text":" to define the block type. Only the fetcher below is block-specific."}]}]}' />

<block type="codeExample" templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-relatedItemsListing" slotId="rendering">

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

</block>

<block type="codeExample" templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-relatedItemsListing" slotId="rendering">

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
