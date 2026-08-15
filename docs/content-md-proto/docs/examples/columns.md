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
  - { id: ref-columns-schema-javascript-45206c }
  - { uid: ref-columns-json-data, type: codeExample }
  - { id: ref-columns-json-data-json-9ddfde }
  - { uid: ref-columns-rendering, type: codeExample }
  - { id: ref-columns-rendering-jsx-a52cb0 }
  - { id: ref-columns-rendering-vue-526eec }
  - { id: ref-columns-rendering-svelte-9b4eec }
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

A horizontal multi-column container. The block has one slot — columns — restricted to column children, capped at four. Each column is itself a container holding any of its allowed inner block types (slate, image, …).

<block type="codeExample" templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-columns" slotId="schema">

### Schema

```javascript
{
  "columns": {
    "blockSchema": {
      "properties": {
        "title": {
          "title": "Title"
        },
        "columns": {
          "title": "Columns",
          "widget": "blocks_layout",
          "allowedBlocks": [
            "column"
          ],
          "maxLength": 4
        }
      }
    }
  },
  "column": {
    "blockSchema": {
      "properties": {
        "title": {
          "title": "Title"
        },
        "items": {
          "title": "Content",
          "widget": "blocks_layout",
          "allowedBlocks": [
            "slate",
            "image"
          ],
          "defaultBlockType": "slate"
        }
      }
    }
  }
}
```

</block>

<block type="codeExample" templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-columns" slotId="json-data">

### JSON Block Data

```json
{
  "@type": "columns",
  "title": "Our Services",
  "blocks": {
    "col-1": {
      "@type": "column",
      "title": "Design",
      "blocks": {
        "text-1": {
          "@type": "slate",
          "value": [
            {
              "type": "p",
              "children": [
                {
                  "text": "We craft beautiful interfaces."
                }
              ]
            }
          ]
        }
      },
      "blocks_layout": {
        "items": [
          "text-1"
        ]
      }
    },
    "col-2": {
      "@type": "column",
      "title": "Engineering",
      "blocks": {
        "text-2": {
          "@type": "slate",
          "value": [
            {
              "type": "p",
              "children": [
                {
                  "text": "We build robust systems."
                }
              ]
            }
          ]
        }
      },
      "blocks_layout": {
        "items": [
          "text-2"
        ]
      }
    }
  },
  "blocks_layout": {
    "columns": [
      "col-1",
      "col-2"
    ]
  }
}
```

</block>

<block type="codeExample" templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-columns" slotId="rendering">

### React

```jsx
function ColumnsBlock({ block }) {
  const items = block.blocks_layout?.columns || [];
  const blocks = block.blocks || {};

  return (
    <div data-block-uid={block['@uid']} className="columns-block">
      <div style={{ display: 'flex', gap: '1rem' }}>
        {items.map(id => (
          <ColumnBlock key={id} block={{ ...blocks[id], '@uid': id }} />
        ))}
      </div>
    </div>
  );
}

function ColumnBlock({ block }) {
  const items = block.blocks_layout?.items || [];
  const blocks = block.blocks || {};

  return (
    <div data-block-uid={block['@uid']} style={{ flex: 1 }}>
      {block.title && <h4 data-edit-text="title">{block.title}</h4>}
      {items.map(id => (
        <BlockRenderer key={id} block={{ ...blocks[id], '@uid': id }} />
      ))}
    </div>
  );
}
```

### Vue

```vue
<template>
  <div :data-block-uid="block['@uid']" class="columns-block">
    <div style="display: flex; gap: 1rem">
      <ColumnBlock
        v-for="id in block.blocks_layout?.columns || []"
        :key="id"
        :block="{ ...block.blocks?.[id], '@uid': id }"
      />
    </div>
  </div>
</template>

<script setup>
defineProps({ block: Object });
</script>
```

### Svelte

```svelte
<script>
  import ColumnBlock from './ColumnBlock.svelte';
  export let block;
</script>

<div data-block-uid={block['@uid']} class="columns-block">
  <div style="display: flex; gap: 1rem">
    {#each block.blocks_layout?.columns || [] as id (id)}
      <ColumnBlock block={{ ...block.blocks?.[id], '@uid': id }} />
    {/each}
  </div>
</div>
```

</block>
