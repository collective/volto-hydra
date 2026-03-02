# Heading Block

A standalone heading block that renders as h1–h6 based on a configurable `tag` field. Unlike headings inside a slate block, this is a dedicated block type with its own `heading` text field.

This is a **built-in** block.

## Schema

```js
{
  blockSchema: {
    properties: {
      heading: {
        title: 'Heading',
        type: 'string',
      },
      tag: {
        title: 'Tag',
        type: 'string',
        default: 'h2',
        choices: [['h1','h1'], ['h2','h2'], ['h3','h3'], ['h4','h4'], ['h5','h5'], ['h6','h6']],
      },
    },
  },
}
```

## JSON Block Data

```json
{
  "@type": "heading",
  "heading": "Getting Started",
  "tag": "h2"
}
```

## Rendering

### React

<!-- file: examples/react/HeadingBlock.jsx -->
```jsx
function HeadingBlock({ block }) {
  const Tag = block.tag || 'h2';
  const text = block.heading || '';

  return (
    <Tag data-block-uid={block['@uid']} data-edit-text="heading">
      {text}
    </Tag>
  );
}
```

### Vue

<!-- file: examples/vue/HeadingBlock.vue -->
```vue
<template>
  <component :is="block.tag || 'h2'" :data-block-uid="block['@uid']" data-edit-text="heading">
    {{ block.heading }}
  </component>
</template>

<script setup>
defineProps({ block: Object });
</script>
```

### Svelte

<!-- file: examples/svelte/HeadingBlock.svelte -->
```svelte
<script>
  export let block;
</script>

<svelte:element this={block.tag || 'h2'} data-block-uid={block['@uid']} data-edit-text="heading">
  {block.heading}
</svelte:element>
```

### Data Attributes

| Attribute | Purpose |
|-----------|---------|
| `data-edit-text="heading"` | Makes the heading text inline-editable |
