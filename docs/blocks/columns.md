# Columns Block

A multi-column layout container. Each column is itself a container that holds child blocks (slate, image, etc.). Use this when you need side-by-side content regions.

This is a **custom** block — register it via `initBridge`.

## Schema

The columns block has two container fields (both use `widget: 'blocks_layout'`):

```js
columns: {
  id: 'columns',
  title: 'Columns',
  icon: '<svg viewBox="0 0 24 24"><rect x="2" y="3" width="8" height="18" rx="1"/><rect x="14" y="3" width="8" height="18" rx="1"/></svg>',
  group: 'common',
  blockSchema: {
    fieldsets: [
      { id: 'default', title: 'Default', fields: ['title', 'top_images', 'columns'] },
    ],
    properties: {
      title: {
        title: 'Title',
        type: 'string',
      },
      top_images: {
        title: 'Top Images',
        widget: 'blocks_layout',
        allowedBlocks: ['image'],
      },
      columns: {
        title: 'Columns',
        widget: 'blocks_layout',
        allowedBlocks: ['column'],
        maxLength: 4,
      },
    },
  },
}
```

Each column is a separate block type:

```js
column: {
  id: 'column',
  title: 'Column',
  blockSchema: {
    fieldsets: [
      { id: 'default', title: 'Default', fields: ['title', 'blocks_layout'] },
    ],
    properties: {
      title: {
        title: 'Title',
        type: 'string',
      },
      blocks_layout: {
        title: 'Content',
        widget: 'blocks_layout',
        allowedBlocks: ['slate', 'image'],
        defaultBlockType: 'slate',
      },
    },
  },
}
```

### Key Concepts

- **`widget: 'blocks_layout'`** — declares a container field that holds child blocks
- **`allowedBlocks`** — restricts which block types can be added inside
- **`maxLength`** — limits the number of children (e.g., max 4 columns)
- **`defaultBlockType`** — the block type created when pressing Enter

## JSON Block Data

```json
{
  "@type": "columns",
  "title": "Our Services",
  "columns": {
    "items": ["col-1", "col-2"],
    "blocks": {
      "col-1": {
        "@type": "column",
        "title": "Design",
        "blocks_layout": {
          "items": ["text-1"],
          "blocks": {
            "text-1": {
              "@type": "slate",
              "value": [{ "type": "p", "children": [{ "text": "We craft beautiful interfaces." }] }]
            }
          }
        }
      },
      "col-2": {
        "@type": "column",
        "title": "Engineering",
        "blocks_layout": {
          "items": ["text-2"],
          "blocks": {
            "text-2": {
              "@type": "slate",
              "value": [{ "type": "p", "children": [{ "text": "We build robust systems." }] }]
            }
          }
        }
      }
    }
  }
}
```

## Rendering

Container blocks render their children by iterating the `items` array and looking up each block in the `blocks` dict.

### React

```jsx
function ColumnsBlock({ block }) {
  const columns = block.columns || {};
  const items = columns.items || [];
  const blocks = columns.blocks || {};

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
  const layout = block.blocks_layout || {};
  const items = layout.items || [];
  const blocks = layout.blocks || {};

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
<!-- ColumnsBlock.vue -->
<template>
  <div :data-block-uid="block['@uid']" class="columns-block">
    <div style="display: flex; gap: 1rem">
      <ColumnBlock
        v-for="id in block.columns?.items || []"
        :key="id"
        :block="{ ...block.columns.blocks[id], '@uid': id }"
      />
    </div>
  </div>
</template>

<script setup>
defineProps({ block: Object });
</script>
```

```vue
<!-- ColumnBlock.vue -->
<template>
  <div :data-block-uid="block['@uid']" style="flex: 1">
    <h4 v-if="block.title" data-edit-text="title">{{ block.title }}</h4>
    <BlockRenderer
      v-for="id in block.blocks_layout?.items || []"
      :key="id"
      :block="{ ...block.blocks_layout.blocks[id], '@uid': id }"
    />
  </div>
</template>

<script setup>
defineProps({ block: Object });
</script>
```
