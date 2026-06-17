# Columns Block

A horizontal multi-column container. The block has one slot — `columns` — restricted to `column` children, capped at four. Each `column` is itself a container holding any of its allowed inner block types (slate, image, …).

This is a **custom** block — register it via `initBridge`.

## Schema

```json
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

The columns slot uses the standard shared-blocks shape: child columns live in `block.blocks` and their order comes from `block.columns.items`. Each column is itself a container with its own `blocks_layout` for content.

### React

<!-- file: examples/react/ColumnsBlock.jsx -->
```jsx
function ColumnsBlock({ block }) {
  const items = block.columns?.items || [];
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

<!-- file: examples/vue/ColumnsBlock.vue -->
```vue
<template>
  <div :data-block-uid="block['@uid']" class="columns-block">
    <div style="display: flex; gap: 1rem">
      <ColumnBlock
        v-for="id in block.columns?.items || []"
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

<!-- file: examples/svelte/ColumnsBlock.svelte -->
```svelte
<script>
  import ColumnBlock from './ColumnBlock.svelte';
  export let block;
</script>

<div data-block-uid={block['@uid']} class="columns-block">
  <div style="display: flex; gap: 1rem">
    {#each block.columns?.items || [] as id (id)}
      <ColumnBlock block={{ ...block.blocks?.[id], '@uid': id }} />
    {/each}
  </div>
</div>
```

### Astro

<!-- file: examples/astro/ColumnsBlock.astro -->
```astro
---
/**
 * Columns container. Each column is a sub-block of @type "column" rendered
 * by ColumnBlock. The columns themselves get their own data-block-uid
 * wrapper from ColumnBlock — this outer container is just layout.
 */
import ColumnBlock from './ColumnBlock.astro';
const { block } = Astro.props;
const items = block.columns?.items || [];
const subBlocks = block.blocks || {};
---
<div class="columns-block">
  <div style="display: flex; gap: 1rem">
    {items.map((id: string) => (
      <ColumnBlock block={{ ...subBlocks[id], '@uid': id }} />
    ))}
  </div>
</div>
```
