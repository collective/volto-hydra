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
blocks:
  - d3f1c443-583f-4e8e-a682-3bf25752a300: title
  - ref-grid-description: slate
  - 616b625c-b79f-4881-8536-b67a9e401a7d: listing
  - 7624cf59-05d0-4055-8f55-5fd6597d84b0: slate
  - ref-grid-schema: codeExample
  - ref-grid-json-data: codeExample
  - ref-grid-rendering: codeExample
order:
  - grid-image
  - listing
  - teaser
  - text
---

<block type="title" uid="d3f1c443-583f-4e8e-a682-3bf25752a300" />

A responsive grid that lays out child blocks in equal-width cells. The block uses Volto's standard shared-blocks shape — blocks is the dict of children, blocks\_layout.items is their order — and constrains the allowed types via allowedBlocks.

<block type="listing" uid="616b625c-b79f-4881-8536-b67a9e401a7d" block="616b625c-b79f-4881-8536-b67a9e401a7d" headlineTag="h2" variation="default" data='{"query":[]}' />

<block type="slate" uid="7624cf59-05d0-4055-8f55-5fd6597d84b0">

```field-json:value
[
 {
  "children": [
   {
    "text": ""
   }
  ],
  "type": "p"
 }
]
```

</block>

<block type="codeExample" uid="ref-grid-schema" templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-grid" slotId="schema">

<region name="tabs" widget="object_list" repeat="h3" label="${1/text}" language="${2/lang}" code="${2/code}" data='{"items":[{"@id":"ref-grid-schema-javascript-af1095"}]}'>

### Schema

```javascript
{
  "gridBlock": {
    "allowedBlocks": ["teaser", "image", "slate"],
    "blockSchema": {
      "properties": {
        "blocks_layout": {
          "title": "Cells",
          "widget": "blocks_layout",
          "allowedBlocks": ["teaser", "image", "slate"]
        }
      }
    }
  }
}
```

</region>

</block>

<block type="codeExample" uid="ref-grid-json-data" templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-grid" slotId="json-data">

<region name="tabs" widget="object_list" repeat="h3" label="${1/text}" language="${2/lang}" code="${2/code}" data='{"items":[{"@id":"ref-grid-json-data-json-5ff79e"}]}'>

### JSON Block Data

```json
{
  "@type": "gridBlock",
  "blocks": {
    "cell-1": {
      "@type": "teaser",
      "title": "Design",
      "description": "We craft beautiful interfaces that users love.",
      "href": [{"@id": "/design"}]
    },
    "cell-2": {
      "@type": "image",
      "url": "https://placehold.co/600x400",
      "alt": "Placeholder"
    },
    "cell-3": {
      "@type": "teaser",
      "title": "Learn More",
      "description": "Explore the full documentation.",
      "href": [{"@id": "/docs"}]
    }
  },
  "blocks_layout": {
    "items": ["cell-1", "cell-2", "cell-3"]
  }
}
```

</region>

</block>

<block type="codeExample" uid="ref-grid-rendering" templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-grid" slotId="rendering">

<region name="tabs" widget="object_list" repeat="h3" label="${1/text}" language="${2/lang}" code="${2/code}" data='{"items":[{"@id":"ref-grid-rendering-jsx-f30d80"},{"@id":"ref-grid-rendering-vue-1d61ab"},{"@id":"ref-grid-rendering-svelte-8158ec"}]}'>

### React

```jsx
function GridBlock({ block }) {
  const blocks = block.blocks || {};
  const items = block.blocks_layout?.items || [];

  return (
    <div data-block-uid={block['@uid']} className="grid-block">
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${items.length}, 1fr)`, gap: '1rem' }}>
        {items.map(id => {
          const child = { ...blocks[id], '@uid': id };
          return (
            <div key={id} className="grid-cell">
              <BlockRenderer block={child} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

### Vue

```vue
<template>
  <div :data-block-uid="block['@uid']" class="grid-block">
    <div :style="{ display: 'grid', gridTemplateColumns: `repeat(${items.length}, 1fr)`, gap: '1rem' }">
      <div v-for="id in items" :key="id" class="grid-cell">
        <BlockRenderer :block="{ ...block.blocks?.[id], '@uid': id }" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import BlockRenderer from './BlockRenderer.vue';
const props = defineProps({ block: Object });
const items = computed(() => props.block.blocks_layout?.items || []);
</script>
```

### Svelte

```svelte
<script>
  import BlockRenderer from './BlockRenderer.svelte';
  export let block;
  $: blocks = block.blocks || {};
  $: items = block.blocks_layout?.items || [];
</script>

<div data-block-uid={block['@uid']} class="grid-block">
  <div style="display: grid; grid-template-columns: repeat({items.length}, 1fr); gap: 1rem">
    {#each items as id (id)}
      <div class="grid-cell">
        <BlockRenderer block={{ ...blocks[id], '@uid': id }} />
      </div>
    {/each}
  </div>
</div>
```

</region>

</block>
