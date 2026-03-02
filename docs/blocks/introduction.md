# Introduction Block

A styled lead paragraph that introduces a page. Uses the same Slate rich text format as the slate block but is rendered with distinct styling to visually set it apart from body text.

This is a **built-in** block.

## Schema

No block config needed — Introduction is a built-in Volto block.

## JSON Block Data

```json
{
  "@type": "introduction",
  "value": [
    {
      "type": "p",
      "children": [{ "text": "This page explains how Hydra bridges your frontend with the Plone editor." }]
    }
  ]
}
```

## Rendering

### React

<!-- file: examples/react/IntroductionBlock.jsx -->
```jsx
function IntroductionBlock({ block }) {
  return (
    <div data-block-uid={block['@uid']} className="introduction-block" data-edit-text="value">
      {(block.value || []).map((node, i) => (
        <SlateNode key={i} node={node} />
      ))}
    </div>
  );
}
```

### Vue

<!-- file: examples/vue/IntroductionBlock.vue -->
```vue
<template>
  <div :data-block-uid="block['@uid']" class="introduction-block" data-edit-text="value">
    <SlateNode v-for="(node, i) in block.value || []" :key="i" :node="node" />
  </div>
</template>

<script setup>
defineProps({ block: Object });
</script>
```

### Svelte

<!-- file: examples/svelte/IntroductionBlock.svelte -->
```svelte
<script>
  import SlateNode from './SlateNode.svelte';
  export let block;
</script>

<div data-block-uid={block['@uid']} class="introduction-block" data-edit-text="value">
  {#each block.value || [] as node, i (i)}
    <SlateNode {node} />
  {/each}
</div>
```

### Data Attributes

| Attribute | Purpose |
|-----------|---------|
| `data-edit-text="value"` | Makes the rich text content inline-editable |
