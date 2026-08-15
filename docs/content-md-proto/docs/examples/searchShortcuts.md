---
"@type": Document
UID: docs-examples-searchShortcuts-001
allow_discussion: false
contributors: []
creators:
  - admin
description: Renders a set of values as links into a faceted search — a "tag
  cloud" of shortcuts. Each value links to a search page with
  ?facet.<index>=<value> pre-set, which a Search block reads from the URL.
effective: null
exclude_from_nav: false
expires: null
id: searchShortcuts
language: "##DEFAULT##"
layout: document_view
review_state: published
rights: ""
subjects:
  - blocks
  - listings
title: Search Shortcuts Block
assignments:
  - { uid: title-1, type: title }
  - { uid: ref-searchShortcuts-description, type: slate }
  - { uid: ss-live-heading, type: slate }
  - { uid: ss-live-1, type: searchShortcuts }
  - { uid: ref-searchShortcuts-schema, type: codeExample }
  - { id: ref-searchShortcuts-schema-javascript-980727 }
  - { uid: ref-searchShortcuts-json-data, type: codeExample }
  - { id: ref-searchShortcuts-json-data-json-b402fc }
  - { uid: ref-searchShortcuts-rendering-intro, type: slate }
  - { uid: ref-searchShortcuts-fetcher, type: codeExample }
  - { id: ref-searchShortcuts-fetcher-javascript-e7f760 }
  - { uid: ref-searchShortcuts-rendering, type: codeExample }
  - { id: ref-searchShortcuts-rendering-javascript-ab7111 }
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

Renders a set of values as links into a faceted search — a "tag cloud" of shortcuts. Each value links to a search page with ?facet.\<index>=\<value> pre-set, which a Search block reads from the URL.

## Live example

<block type="searchShortcuts" index="Subject" searchUrl="/search" variation="default" />

<block type="codeExample" templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-searchShortcuts" slotId="schema">

### Schema

```javascript
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

</block>

<block type="codeExample" templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-searchShortcuts" slotId="json-data">

### JSON Block Data

```json
{
  "@type": "searchShortcuts",
  "index": "Subject",
  "pageField": "subjects",
  "searchUrl": "/search",
  "variation": "default"
}
```

</block>

<block type="slate" templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-searchShortcuts" slotId="rendering" data='{"value":[{"type":"p","children":[{"text":"This block has no bespoke renderer. Add its fetcher to your fetchItems map (keyed by @type) and expandListingBlocks expands it in any region you render — the same seam that powers "},{"type":"link","data":{"url":"/docs/listings"},"children":[{"text":"listings"}]},{"text":" and other collection blocks. See "},{"type":"link","data":{"url":"/docs/custom-blocks"},"children":[{"text":"Custom Blocks"}]},{"text":" to define the block type. Only the fetcher below is block-specific."}]}]}' />

<block type="codeExample" templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-searchShortcuts" slotId="rendering">

### Fetcher

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

</block>

<block type="codeExample" templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-searchShortcuts" slotId="rendering">

### Render

```javascript
// One fetchItems map, keyed by @type, holds every fetch-based block you use.
const fetchItems = {
  listing: ploneFetchItems({ apiUrl, contextPath }),
  searchShortcuts: searchShortcutsFetcher({ apiUrl, contextPath }), // ← this block
};

// Call this on each region you render (the list of block ids in that region).
const { items } = await expandListingBlocks(regionBlockIds, {
  blocks, fetchItems, itemTypeField: 'variation',
});
items.forEach((item) => renderBlock(item)); // your normal per-block renderer
```

</block>
