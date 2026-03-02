# Heading Block

A standalone heading block that renders as h1–h6 based on a configurable `tag` field. Unlike headings inside a slate block, this is a dedicated block type with its own `heading` text field.

This is a **built-in** block.

## Schema

No block config needed — Heading is a built-in Volto block.

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
