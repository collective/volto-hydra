---
"@type": Document
UID: docs-examples-columns-001
allow_discussion: false
contributors: []
creators:
  - admin
description: A responsive grid layout container. Each cell is a child block
  (teaser, slate, image, etc.) rendered inside the grid. This is the built-in
  Volto grid block (gridBlock).
effective: null
exclude_from_nav: false
expires: null
id: columns
language: "##DEFAULT##"
layout: document_view
review_state: published
rights: ""
subjects:
  - blocks
  - containers
title: Grid Block
assignments:
  - { uid: title-1, type: title }
  - { uid: ref-columns-description, type: slate }
  - { uid: ref-columns-schema, type: codeExample }
  - { uid: ref-columns-json-data, type: codeExample }
  - { uid: ref-columns-rendering, type: codeExample }
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

A horizontal multi-column container. The block has one slot — columns — restricted to column children, capped at four. Each column is itself a container holding any of its allowed inner block types (slate, image, …).

<block type="codeExample" templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-columns" slotId="schema" data='{"tabs":[{"@id":"ref-columns-schema-javascript-45206c","label":"Schema","language":"javascript","code":"{\n  \"columns\": {\n    \"blockSchema\": {\n      \"properties\": {\n        \"title\": {\n          \"title\": \"Title\"\n        },\n        \"columns\": {\n          \"title\": \"Columns\",\n          \"widget\": \"blocks_layout\",\n          \"allowedBlocks\": [\n            \"column\"\n          ],\n          \"maxLength\": 4\n        }\n      }\n    }\n  },\n  \"column\": {\n    \"blockSchema\": {\n      \"properties\": {\n        \"title\": {\n          \"title\": \"Title\"\n        },\n        \"items\": {\n          \"title\": \"Content\",\n          \"widget\": \"blocks_layout\",\n          \"allowedBlocks\": [\n            \"slate\",\n            \"image\"\n          ],\n          \"defaultBlockType\": \"slate\"\n        }\n      }\n    }\n  }\n}"}]}' />

<block type="codeExample" templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-columns" slotId="json-data" data='{"tabs":[{"@id":"ref-columns-json-data-json-9ddfde","label":"JSON Block Data","language":"json","code":"{\n  \"@type\": \"columns\",\n  \"title\": \"Our Services\",\n  \"blocks\": {\n    \"col-1\": {\n      \"@type\": \"column\",\n      \"title\": \"Design\",\n      \"blocks\": {\n        \"text-1\": {\n          \"@type\": \"slate\",\n          \"value\": [\n            {\n              \"type\": \"p\",\n              \"children\": [\n                {\n                  \"text\": \"We craft beautiful interfaces.\"\n                }\n              ]\n            }\n          ]\n        }\n      },\n      \"blocks_layout\": {\n        \"items\": [\n          \"text-1\"\n        ]\n      }\n    },\n    \"col-2\": {\n      \"@type\": \"column\",\n      \"title\": \"Engineering\",\n      \"blocks\": {\n        \"text-2\": {\n          \"@type\": \"slate\",\n          \"value\": [\n            {\n              \"type\": \"p\",\n              \"children\": [\n                {\n                  \"text\": \"We build robust systems.\"\n                }\n              ]\n            }\n          ]\n        }\n      },\n      \"blocks_layout\": {\n        \"items\": [\n          \"text-2\"\n        ]\n      }\n    }\n  },\n  \"blocks_layout\": {\n    \"columns\": [\n      \"col-1\",\n      \"col-2\"\n    ]\n  }\n}"}]}' />

<block type="codeExample" templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-columns" slotId="rendering" data='{"tabs":[{"@id":"ref-columns-rendering-jsx-a52cb0","label":"React","language":"jsx","code":"function ColumnsBlock({ block }) {\n  const items = block.blocks_layout?.columns || [];\n  const blocks = block.blocks || {};\n\n  return (\n    <div data-block-uid={block[&#39;@uid&#39;]} className=\"columns-block\">\n      <div style={{ display: &#39;flex&#39;, gap: &#39;1rem&#39; }}>\n        {items.map(id => (\n          <ColumnBlock key={id} block={{ ...blocks[id], &#39;@uid&#39;: id }} />\n        ))}\n      </div>\n    </div>\n  );\n}\n\nfunction ColumnBlock({ block }) {\n  const items = block.blocks_layout?.items || [];\n  const blocks = block.blocks || {};\n\n  return (\n    <div data-block-uid={block[&#39;@uid&#39;]} style={{ flex: 1 }}>\n      {block.title &amp;&amp; <h4 data-edit-text=\"title\">{block.title}</h4>}\n      {items.map(id => (\n        <BlockRenderer key={id} block={{ ...blocks[id], &#39;@uid&#39;: id }} />\n      ))}\n    </div>\n  );\n}"},{"@id":"ref-columns-rendering-vue-526eec","label":"Vue","language":"vue","code":"<template>\n  <div :data-block-uid=\"block[&#39;@uid&#39;]\" class=\"columns-block\">\n    <div style=\"display: flex; gap: 1rem\">\n      <ColumnBlock\n        v-for=\"id in block.blocks_layout?.columns || []\"\n        :key=\"id\"\n        :block=\"{ ...block.blocks?.[id], &#39;@uid&#39;: id }\"\n      />\n    </div>\n  </div>\n</template>\n\n<script setup>\ndefineProps({ block: Object });\n</script>"},{"@id":"ref-columns-rendering-svelte-9b4eec","label":"Svelte","language":"svelte","code":"<script>\n  import ColumnBlock from &#39;./ColumnBlock.svelte&#39;;\n  export let block;\n</script>\n\n<div data-block-uid={block[&#39;@uid&#39;]} class=\"columns-block\">\n  <div style=\"display: flex; gap: 1rem\">\n    {#each block.blocks_layout?.columns || [] as id (id)}\n      <ColumnBlock block={{ ...block.blocks?.[id], &#39;@uid&#39;: id }} />\n    {/each}\n  </div>\n</div>"}]}' />
