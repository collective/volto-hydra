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
blocks:
  - title-1: title
  - ref-searchShortcuts-description: slate
  - ss-live-heading: slate
  - ss-live-1: searchShortcuts
  - ref-searchShortcuts-schema: codeExample
  - ref-searchShortcuts-json-data: codeExample
  - ref-searchShortcuts-rendering-intro: slate
  - ref-searchShortcuts-fetcher: codeExample
  - ref-searchShortcuts-rendering: codeExample
---

:::title{uid="title-1"}
:::

Renders a set of values as links into a faceted search — a "tag cloud" of shortcuts. Each value links to a search page with ?facet.\<index>=\<value> pre-set, which a Search block reads from the URL.

## Live example

:::searchShortcuts{uid="ss-live-1" index="Subject" searchUrl="/search" variation="default"}
:::

:::codeExample{uid="ref-searchShortcuts-schema" templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-searchShortcuts" slotId="schema" tabs="${1.../h3}" tabs.label="${1/text}" tabs.language="${2/lang}" tabs.code="${2/code}" tabs@ids=["ref-searchShortcuts-schema-javascript-980727"]}
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
:::

:::codeExample{uid="ref-searchShortcuts-json-data" templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-searchShortcuts" slotId="json-data" tabs="${1.../h3}" tabs.label="${1/text}" tabs.language="${2/lang}" tabs.code="${2/code}" tabs@ids=["ref-searchShortcuts-json-data-json-b402fc"]}
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
:::

:::slate{uid="ref-searchShortcuts-rendering-intro" templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-searchShortcuts" slotId="rendering"}
This block has no bespoke renderer. Add its fetcher to your fetchItems map (keyed by @type) and expandListingBlocks expands it in any region you render — the same seam that powers [listings](/docs/listings) and other collection blocks. See [Custom Blocks](/docs/custom-blocks) to define the block type. Only the fetcher below is block-specific.
:::

:::codeExample{uid="ref-searchShortcuts-fetcher" templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-searchShortcuts" slotId="rendering" tabs="${1.../h3}" tabs.label="${1/text}" tabs.language="${2/lang}" tabs.code="${2/code}" tabs@ids=["ref-searchShortcuts-fetcher-javascript-e7f760"]}
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
:::

:::codeExample{uid="ref-searchShortcuts-rendering" templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-searchShortcuts" slotId="rendering" tabs="${1.../h3}" tabs.label="${1/text}" tabs.language="${2/lang}" tabs.code="${2/code}" tabs@ids=["ref-searchShortcuts-rendering-javascript-ab7111"]}
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
:::
