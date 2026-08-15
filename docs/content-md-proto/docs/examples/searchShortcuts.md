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
  - { uid: ref-searchShortcuts-json-data, type: codeExample }
  - { uid: ref-searchShortcuts-rendering-intro, type: slate }
  - { uid: ref-searchShortcuts-fetcher, type: codeExample }
  - { uid: ref-searchShortcuts-rendering, type: codeExample }
prototypes: |
  <block type="title" _="${h1}" />
  <block type="slate" value="${p|h2|h3|h4|h5|h6|ul|ol|blockquote/slate}" />
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

<block type="codeExample" templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-searchShortcuts" slotId="schema" data='{"tabs":[{"@id":"ref-searchShortcuts-schema-javascript-980727","label":"Schema","language":"javascript","code":"{\n  \"searchShortcuts\": {\n    \"id\": \"searchShortcuts\",\n    \"title\": \"Search Shortcuts\",\n    \"blockSchema\": {\n      \"fieldsets\": [\n        {\n          \"id\": \"default\",\n          \"title\": \"Default\",\n          \"fields\": [\n            \"index\",\n            \"pageField\",\n            \"searchUrl\",\n            \"variation\",\n            \"fieldMapping\"\n          ]\n        }\n      ],\n      \"properties\": {\n        \"index\": {\n          \"title\": \"Index\",\n          \"widget\": \"select_querystring_field\",\n          \"vocabulary\": {\n            \"@id\": \"plone.app.contenttypes.metadatafields\"\n          },\n          \"default\": \"Subject\"\n        },\n        \"pageField\": {\n          \"title\": \"This page field (optional)\",\n          \"widget\": \"schemaFieldSelect\",\n          \"fieldType\": \"keyword\"\n        },\n        \"searchUrl\": {\n          \"title\": \"Search page URL\",\n          \"widget\": \"url\"\n        },\n        \"variation\": {\n          \"title\": \"Item Type\",\n          \"widget\": \"blockTypeSelect\",\n          \"filterConvertibleFrom\": \"@default\",\n          \"default\": \"default\"\n        }\n      }\n    },\n    \"schemaEnhancer\": {\n      \"inheritSchemaFrom\": {\n        \"typeField\": \"variation\",\n        \"mappingField\": \"fieldMapping\",\n        \"defaultsField\": \"itemDefaults\"\n      }\n    }\n  }\n}"}]}' />

<block type="codeExample" templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-searchShortcuts" slotId="json-data" data='{"tabs":[{"@id":"ref-searchShortcuts-json-data-json-b402fc","label":"JSON Block Data","language":"json","code":"{\n  \"@type\": \"searchShortcuts\",\n  \"index\": \"Subject\",\n  \"pageField\": \"subjects\",\n  \"searchUrl\": \"/search\",\n  \"variation\": \"default\"\n}"}]}' />

<block type="slate" templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-searchShortcuts" slotId="rendering" data='{"value":[{"type":"p","children":[{"text":"This block has no bespoke renderer. Add its fetcher to your fetchItems map (keyed by @type) and expandListingBlocks expands it in any region you render — the same seam that powers "},{"type":"link","data":{"url":"/docs/listings"},"children":[{"text":"listings"}]},{"text":" and other collection blocks. See "},{"type":"link","data":{"url":"/docs/custom-blocks"},"children":[{"text":"Custom Blocks"}]},{"text":" to define the block type. Only the fetcher below is block-specific."}]}]}' />

<block type="codeExample" templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-searchShortcuts" slotId="rendering" data='{"tabs":[{"@id":"ref-searchShortcuts-fetcher-javascript-e7f760","label":"Fetcher","language":"javascript","code":"export function searchShortcutsFetcher({ apiUrl, contextPath }) {\n  return async function fetchItems(block, { start, size }) {\n    const index = block.index || &#39;Subject&#39;;\n    let values;\n    if (block.pageField) {\n      // Linked field → THIS page&#39;s values of that field.\n      const content = await (await fetch(`${apiUrl}${contextPath}/++api++`, { headers: authHeaders() })).json();\n      values = content[block.pageField] || [];\n    } else {\n      // No field → all unique values of the index, site-wide (its vocabulary).\n      const vocab = index === &#39;Subject&#39; ? &#39;plone.app.vocabularies.Keywords&#39; : index;\n      const data = await (await fetch(`${apiUrl}/++api++/@vocabularies/${vocab}`, { headers: authHeaders() })).json();\n      values = (data.items || []).map((t) => t.token);\n    }\n    // Each value → a shortcut link; @id is the facet-search URL.\n    const all = values.map((v) => ({\n      &#39;@id&#39;: `${block.searchUrl}?facet.${index}=${encodeURIComponent(v)}`,\n      title: v,\n    }));\n    return { items: all.slice(start, start + size), total: all.length };\n  };\n}"}]}' />

<block type="codeExample" templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-searchShortcuts" slotId="rendering" data='{"tabs":[{"@id":"ref-searchShortcuts-rendering-javascript-ab7111","label":"Render","language":"javascript","code":"// One fetchItems map, keyed by @type, holds every fetch-based block you use.\nconst fetchItems = {\n  listing: ploneFetchItems({ apiUrl, contextPath }),\n  searchShortcuts: searchShortcutsFetcher({ apiUrl, contextPath }), // ← this block\n};\n\n// Call this on each region you render (the list of block ids in that region).\nconst { items } = await expandListingBlocks(regionBlockIds, {\n  blocks, fetchItems, itemTypeField: &#39;variation&#39;,\n});\nitems.forEach((item) => renderBlock(item)); // your normal per-block renderer"}]}' />
