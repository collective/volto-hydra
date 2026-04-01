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
