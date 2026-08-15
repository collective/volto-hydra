---
"@type": Document
UID: 99c70917b6894af08dd306fdbc0eff6a
allow_discussion: false
contributors: []
creators:
  - admin
description: >-
  
  The Grid block allows adding multi-column blocks. A grid block can contain
  between one and four columns of different blocks. Teasers and images can be
  added in a grid block.
effective: 2023-07-06T18:35:00
exclude_from_nav: false
expires: null
id: grid
language: "##DEFAULT##"
layout: document_view
preview_caption: null
preview_image:
  blob_path: docs/examples/grid/preview_image/black-starry-night.jpg
  content-type: image/jpeg
  filename: black-starry-night.jpg
  height: 1708
  size: 693013
  width: 2400
review_state: published
rights: ""
subjects:
  - blocks
  - containers
title: Grid
assignments:
  - { uid: d3f1c443-583f-4e8e-a682-3bf25752a300, type: title }
  - { uid: ref-grid-description, type: slate }
  - { uid: 616b625c-b79f-4881-8536-b67a9e401a7d, type: listing }
  - { uid: 7624cf59-05d0-4055-8f55-5fd6597d84b0, type: slate }
  - { uid: ref-grid-schema, type: codeExample }
  - { uid: ref-grid-json-data, type: codeExample }
  - { uid: ref-grid-rendering, type: codeExample }
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

A responsive grid that lays out child blocks in equal-width cells. The block uses Volto's standard shared-blocks shape — blocks is the dict of children, blocks\_layout.items is their order — and constrains the allowed types via allowedBlocks.

<block type="listing" block="616b625c-b79f-4881-8536-b67a9e401a7d" headlineTag="h2" variation="default" data='{"query":[]}' />

<block type="slate" data='{"value":[{"children":[{"text":""}],"type":"p"}]}' />

<block type="codeExample" templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-grid" slotId="schema" data='{"tabs":[{"@id":"ref-grid-schema-javascript-af1095","label":"Schema","language":"javascript","code":"{\n  \"gridBlock\": {\n    \"allowedBlocks\": [\"teaser\", \"image\", \"slate\"],\n    \"blockSchema\": {\n      \"properties\": {\n        \"blocks_layout\": {\n          \"title\": \"Cells\",\n          \"widget\": \"blocks_layout\",\n          \"allowedBlocks\": [\"teaser\", \"image\", \"slate\"]\n        }\n      }\n    }\n  }\n}"}]}' />

<block type="codeExample" templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-grid" slotId="json-data" data='{"tabs":[{"@id":"ref-grid-json-data-json-5ff79e","label":"JSON Block Data","language":"json","code":"{\n  \"@type\": \"gridBlock\",\n  \"blocks\": {\n    \"cell-1\": {\n      \"@type\": \"teaser\",\n      \"title\": \"Design\",\n      \"description\": \"We craft beautiful interfaces that users love.\",\n      \"href\": [{\"@id\": \"/design\"}]\n    },\n    \"cell-2\": {\n      \"@type\": \"image\",\n      \"url\": \"https://placehold.co/600x400\",\n      \"alt\": \"Placeholder\"\n    },\n    \"cell-3\": {\n      \"@type\": \"teaser\",\n      \"title\": \"Learn More\",\n      \"description\": \"Explore the full documentation.\",\n      \"href\": [{\"@id\": \"/docs\"}]\n    }\n  },\n  \"blocks_layout\": {\n    \"items\": [\"cell-1\", \"cell-2\", \"cell-3\"]\n  }\n}"}]}' />

<block type="codeExample" templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-grid" slotId="rendering" data='{"tabs":[{"@id":"ref-grid-rendering-jsx-f30d80","label":"React","language":"jsx","code":"function GridBlock({ block }) {\n  const blocks = block.blocks || {};\n  const items = block.blocks_layout?.items || [];\n\n  return (\n    <div data-block-uid={block[&#39;@uid&#39;]} className=\"grid-block\">\n      <div style={{ display: &#39;grid&#39;, gridTemplateColumns: `repeat(${items.length}, 1fr)`, gap: &#39;1rem&#39; }}>\n        {items.map(id => {\n          const child = { ...blocks[id], &#39;@uid&#39;: id };\n          return (\n            <div key={id} className=\"grid-cell\">\n              <BlockRenderer block={child} />\n            </div>\n          );\n        })}\n      </div>\n    </div>\n  );\n}"},{"@id":"ref-grid-rendering-vue-1d61ab","label":"Vue","language":"vue","code":"<template>\n  <div :data-block-uid=\"block[&#39;@uid&#39;]\" class=\"grid-block\">\n    <div :style=\"{ display: &#39;grid&#39;, gridTemplateColumns: `repeat(${items.length}, 1fr)`, gap: &#39;1rem&#39; }\">\n      <div v-for=\"id in items\" :key=\"id\" class=\"grid-cell\">\n        <BlockRenderer :block=\"{ ...block.blocks?.[id], &#39;@uid&#39;: id }\" />\n      </div>\n    </div>\n  </div>\n</template>\n\n<script setup>\nimport { computed } from &#39;vue&#39;;\nimport BlockRenderer from &#39;./BlockRenderer.vue&#39;;\nconst props = defineProps({ block: Object });\nconst items = computed(() => props.block.blocks_layout?.items || []);\n</script>"},{"@id":"ref-grid-rendering-svelte-8158ec","label":"Svelte","language":"svelte","code":"<script>\n  import BlockRenderer from &#39;./BlockRenderer.svelte&#39;;\n  export let block;\n  $: blocks = block.blocks || {};\n  $: items = block.blocks_layout?.items || [];\n</script>\n\n<div data-block-uid={block[&#39;@uid&#39;]} class=\"grid-block\">\n  <div style=\"display: grid; grid-template-columns: repeat({items.length}, 1fr); gap: 1rem\">\n    {#each items as id (id)}\n      <div class=\"grid-cell\">\n        <BlockRenderer block={{ ...blocks[id], &#39;@uid&#39;: id }} />\n      </div>\n    {/each}\n  </div>\n</div>"}]}' />
