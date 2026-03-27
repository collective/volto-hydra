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
import { expandListingBlocks } from '@hydra-js/hydra.js';

function GridBlock({ block, blockId }) {
  const columns = block.columns || [];

  function expand(layout, blocks, containerId) {
    return expandListingBlocks(layout, { blocks, containerId });
  }

  return (
    <div data-block-uid={blockId} className="grid-block">
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${columns.length}, 1fr)`, gap: '1rem' }}>
        {columns.map(col => {
          const items = expand(col.blocks_layout?.items || [], col.blocks, col['@id']);
          return (
            <div key={col['@id']} data-block-uid={col['@id']} className="grid-column">
              {items.map(item => (
                <BlockRenderer key={item['@uid']} block={item} />
              ))}
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
  <div :data-block-uid="id" class="grid-block">
    <div :style="{ display: 'grid', gridTemplateColumns: `repeat(${columns.length}, 1fr)`, gap: '1rem' }">
      <div v-for="col in columns" :key="col['@id']" :data-block-uid="col['@id']" class="grid-column">
        <Block v-for="item in expand(col.blocks_layout?.items || [], col.blocks, col['@id'])"
          :key="item['@uid']" :data="item" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { expandListingBlocks } from '@hydra-js/hydra.js';
const props = defineProps({ block: Object, id: String });
const columns = computed(() => props.block.columns || []);
function expand(layout, blocks, containerId) {
  return expandListingBlocks(layout, { blocks, containerId });
}
</script>
```

### Svelte

<!-- file: examples/svelte/GridBlock.svelte -->
```svelte
<script>
  import BlockRenderer from './BlockRenderer.svelte';
  import { expandListingBlocks } from '@hydra-js/hydra.js';
  export let block;
  export let blockId;
  $: columns = block.columns || [];
  function expand(layout, blocks, containerId) {
    return expandListingBlocks(layout, { blocks, containerId });
  }
</script>

<div data-block-uid={blockId} class="grid-block">
  <div style="display: grid; grid-template-columns: repeat({columns.length}, 1fr); gap: 1rem">
    {#each columns as col (col['@id'])}
      <div data-block-uid={col['@id']} class="grid-column">
        {#each expand(col.blocks_layout?.items || [], col.blocks, col['@id']) as item (item['@uid'])}
          <BlockRenderer block={item} />
        {/each}
      </div>
    {/each}
  </div>
</div>
```
