# Table of Contents Block

Renders a table of contents generated from heading blocks on the current page. The block itself has no editable fields — it scans sibling blocks for headings and builds a navigation list.

This is a **built-in** block.

## Schema

No block config needed — Table of Contents is a built-in Volto block.

## JSON Block Data

```json
{
  "@type": "toc"
}
```

## Rendering

### React

<!-- file: examples/react/TocBlock.jsx -->
```jsx
function TocBlock({ block }) {
  // Table of Contents renders a placeholder.
  // A real implementation scans sibling blocks for headings.
  return (
    <nav data-block-uid={block['@uid']} className="toc-block">
      <ul>
        <li>Table of Contents (generated from page headings)</li>
      </ul>
    </nav>
  );
}
```

### Vue

<!-- file: examples/vue/TocBlock.vue -->
```vue
<template>
  <nav :data-block-uid="block['@uid']" class="toc-block">
    <ul>
      <li>Table of Contents (generated from page headings)</li>
    </ul>
  </nav>
</template>

<script setup>
defineProps({ block: Object });
</script>
```

### Svelte

<!-- file: examples/svelte/TocBlock.svelte -->
```svelte
<script>
  export let block;
</script>

<nav data-block-uid={block['@uid']} class="toc-block">
  <ul>
    <li>Table of Contents (generated from page headings)</li>
  </ul>
</nav>
```
