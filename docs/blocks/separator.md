# Separator Block

A horizontal rule used to visually divide sections of content. Supports an alignment style property.

This is a **built-in** block.

## Schema

```js
{
  blockSchema: {
    properties: {
      styles: {
        title: 'Styles',
        schema: {
          properties: {
            align: {
              title: 'Alignment',
              type: 'string',
              default: 'full',
              choices: [['full', 'Full'], ['left', 'Left'], ['center', 'Center'], ['right', 'Right']],
            },
          },
        },
      },
    },
  },
}
```

## JSON Block Data

```json
{
  "@type": "separator",
  "styles": {
    "align": "center"
  }
}
```

## Rendering

### React

<!-- file: examples/react/SeparatorBlock.jsx -->
```jsx
function SeparatorBlock({ block }) {
  const align = block.styles?.align || 'full';

  return (
    <div data-block-uid={block['@uid']} className={`separator-block separator-${align}`}>
      <hr />
    </div>
  );
}
```

### Vue

<!-- file: examples/vue/SeparatorBlock.vue -->
```vue
<template>
  <div :data-block-uid="block['@uid']" :class="'separator-block separator-' + (block.styles?.align || 'full')">
    <hr />
  </div>
</template>

<script setup>
defineProps({ block: Object });
</script>
```

### Svelte

<!-- file: examples/svelte/SeparatorBlock.svelte -->
```svelte
<script>
  export let block;
</script>

<div data-block-uid={block['@uid']} class="separator-block separator-{block.styles?.align || 'full'}">
  <hr />
</div>
```
