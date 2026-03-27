# Grid Block

A responsive grid layout container. Each column is a container that can hold any blocks inside it. Columns are defined as an `object_list` with an inline schema — each item has its own `blocks_layout` for nested content. No separate column block type is needed.

## Schema

```json
{
  "gridBlock": {
    "blockSchema": {
      "properties": {
        "columns": {
          "title": "Columns",
          "widget": "object_list",
          "schema": {
            "properties": {
              "blocks_layout": {
                "title": "Content",
                "widget": "blocks_layout",
                "defaultBlockType": "slate"
              }
            }
          }
        }
      }
    }
  }
}
```

## JSON Block Data

```json
{
  "@type": "gridBlock",
  "columns": [
    {
      "@id": "col-1",
      "blocks": {
        "heading-1": {
          "@type": "slate",
          "value": [{"type": "h3", "children": [{"text": "Design"}]}]
        },
        "text-1": {
          "@type": "slate",
          "value": [{"type": "p", "children": [{"text": "We craft beautiful interfaces that users love."}]}]
        }
      },
      "blocks_layout": {
        "items": ["heading-1", "text-1"]
      }
    },
    {
      "@id": "col-2",
      "blocks": {
        "img-1": {
          "@type": "image",
          "url": "https://placehold.co/600x400",
          "alt": "Placeholder"
        }
      },
      "blocks_layout": {
        "items": ["img-1"]
      }
    },
    {
      "@id": "col-3",
      "blocks": {
        "teaser-1": {
          "@type": "teaser",
          "title": "Learn More",
          "description": "Explore the full documentation.",
          "href": [{"@id": "/concepts/architecture"}]
        }
      },
      "blocks_layout": {
        "items": ["teaser-1"]
      }
    }
  ]
}
```

## Rendering

Each column in the `columns` array is a container with its own `blocks` and `blocks_layout`. Use `expandListingBlocks` to expand each column's nested blocks — this assigns `@uid` to each block for editing support.

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
