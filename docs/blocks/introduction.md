# Introduction Block

Displays the page's title and description as a styled header. The introduction block has no content of its own — it reads `title` and `description` from the page metadata.

This is a **built-in** block.

## Schema

```json
{
  "introduction": {
    "blockSchema": {
      "properties": {}
    }
  }
}
```


## JSON Block Data

```json
{
  "@type": "introduction"
}
```

The block itself has no content fields. The renderer should display the page's `title` and `description`.

## Rendering

### React

<!-- file: examples/react/IntroductionBlock.jsx -->
```jsx
function IntroductionBlock({ block, content }) {
  return (
    <div data-block-uid={block['@uid']} className="introduction-block">
      <h1 data-edit-text="/title">{content.title}</h1>
      {content.description && <p data-edit-text="/description" className="description">{content.description}</p>}
    </div>
  );
}
```

### Vue

<!-- file: examples/vue/IntroductionBlock.vue -->
```vue
<template>
  <div :data-block-uid="block['@uid']" class="introduction-block">
    <h1 data-edit-text="/title">{{ content.title }}</h1>
    <p v-if="content.description" data-edit-text="/description" class="description">{{ content.description }}</p>
  </div>
</template>

<script setup>
defineProps({ block: Object, content: Object });
</script>
```

### Svelte

<!-- file: examples/svelte/IntroductionBlock.svelte -->
```svelte
<script>
  export let block;
  export let content;
</script>

<div data-block-uid={block['@uid']} class="introduction-block">
  <h1 data-edit-text="/title">{content.title}</h1>
  {#if content.description}<p data-edit-text="/description" class="description">{content.description}</p>{/if}
</div>
```
