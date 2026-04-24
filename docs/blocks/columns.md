# Grid Block

A responsive grid layout container. Each cell is a child block (teaser, slate, image, etc.) rendered inside the grid. This is the built-in Volto grid block (`gridBlock`).

This is a **built-in** block.

## Schema

```json
{
  "columns": {
    "blockSchema": {
      "properties": {
        "title": {
          "title": "Title"
        },
        "top_images": {
          "title": "Top Images",
          "widget": "blocks_layout",
          "allowedBlocks": [
            "image"
          ]
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
        "blocks_layout": {
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


## JSON Block Data

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
  "columns": {
    "items": [
      "col-1",
      "col-2"
    ]
  }
}
```

## Rendering

Container blocks render their children by iterating `blocks_layout.items` and looking up each block in the `blocks` dict.

### React

<!-- file: examples/react/GridBlock.jsx -->
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

<!-- file: examples/vue/GridBlock.vue -->
```vue
<template>
  <div :data-block-uid="block['@uid']" class="grid-block">
    <div :style="{ display: 'grid', gridTemplateColumns: `repeat(${items.length}, 1fr)`, gap: '1rem' }">
      <div v-for="id in items" :key="id" class="grid-cell">
        <Block :data="{ ...block.blocks?.[id], '@uid': id }" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
const props = defineProps({ block: Object });
const items = computed(() => props.block.blocks_layout?.items || []);
</script>
```

### Svelte

<!-- file: examples/svelte/GridBlock.svelte -->
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
