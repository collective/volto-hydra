# Grid Block

A responsive grid that lays out child blocks in equal-width cells. The block uses Volto's standard shared-blocks shape — `blocks` is the dict of children, `blocks_layout.items` is their order — and constrains the allowed types via `allowedBlocks`.

This is a **built-in** block.

## Schema

```json
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

## JSON Block Data

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

## Rendering

Iterate `blocks_layout.items` and look each child up in `block.blocks`. Spread the `@uid` into the child object so the renderer can attach `data-block-uid` for editing support.

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

### Astro

<!-- file: examples/astro/GridBlock.astro -->
```astro
---
/**
 * Grid container. Children are arbitrary blocks (each rendered by
 * BlockRenderer); columns count is derived from the number of items.
 */
import BlockRenderer from './BlockRenderer.astro';
const { block } = Astro.props;
const subBlocks = block.blocks || {};
const items = block.blocks_layout?.items || [];
---
<div class="grid-block">
  <div style={`display: grid; grid-template-columns: repeat(${items.length}, 1fr); gap: 1rem`}>
    {items.map((id: string) => (
      <div class="grid-cell">
        <BlockRenderer block={{ ...subBlocks[id], '@uid': id }} />
      </div>
    ))}
  </div>
</div>
```
