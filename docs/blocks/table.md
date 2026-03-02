# Table Block

A table with rich text (Slate) content in each cell. Supports adding/removing rows and columns via toolbar actions.

This is a **built-in** block (registered as `slateTable`).

## Schema

No block config needed — Slate Table is a built-in Volto block.

## JSON Block Data

```json
{
  "@type": "slateTable",
  "table": {
    "rows": [
      {
        "key": "row-1",
        "cells": [
          {
            "key": "cell-1",
            "value": [{ "type": "p", "children": [{ "text": "Name" }] }]
          },
          {
            "key": "cell-2",
            "value": [{ "type": "p", "children": [{ "text": "Role" }] }]
          }
        ]
      },
      {
        "key": "row-2",
        "cells": [
          {
            "key": "cell-3",
            "value": [{ "type": "p", "children": [{ "text": "Alice" }] }]
          },
          {
            "key": "cell-4",
            "value": [{ "type": "p", "children": [{ "text": "Engineer" }] }]
          }
        ]
      }
    ]
  }
}
```

## Rendering

Each cell's `value` is a Slate JSON tree — reuse your Slate renderer (see [Slate block](./slate.md)).

### React

<!-- file: examples/react/TableBlock.jsx -->
```jsx
function TableBlock({ block }) {
  const rows = block.table?.rows || [];
  return (
    <div data-block-uid={block['@uid']}>
      <table>
        <tbody>
          {rows.map(row => (
            <tr key={row.key} data-block-uid={row.key}>
              {row.cells.map(cell => (
                <td key={cell.key} data-block-uid={cell.key} data-edit-text="value">
                  {(cell.value || []).map((node, i) => (
                    <SlateNode key={i} node={node} />
                  ))}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

### Vue

<!-- file: examples/vue/TableBlock.vue -->
```vue
<template>
  <div :data-block-uid="block['@uid']">
    <table>
      <tbody>
        <tr v-for="row in block.table?.rows || []" :key="row.key" :data-block-uid="row.key">
          <td v-for="cell in row.cells" :key="cell.key" :data-block-uid="cell.key" data-edit-text="value">
            <SlateNode v-for="(node, i) in cell.value || []" :key="i" :node="node" />
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup>
defineProps({ block: Object });
</script>
```

### Svelte

<!-- file: examples/svelte/TableBlock.svelte -->
```svelte
<script>
  import SlateNode from './SlateNode.svelte';
  export let block;
</script>

<div data-block-uid={block['@uid']}>
  <table>
    <tbody>
      {#each block.table?.rows || [] as row (row.key)}
        <tr data-block-uid={row.key}>
          {#each row.cells as cell (cell.key)}
            <td data-block-uid={cell.key} data-edit-text="value">
              {#each cell.value || [] as node, i (i)}
                <SlateNode {node} />
              {/each}
            </td>
          {/each}
        </tr>
      {/each}
    </tbody>
  </table>
</div>
```
