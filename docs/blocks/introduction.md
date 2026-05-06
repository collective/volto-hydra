# Introduction Block

Displays the page's title and description as a styled header. The introduction block has no content of its own — it reads `title` and `description` from the page metadata.

This is a **built-in** block.

## Schema

```json
{
  "introduction": {
    "blockSchema": {
      "properties": {
        "value": {
          "title": "Text",
          "widget": "slate"
        }
      }
    }
  }
}
```


## JSON Block Data

```json
{
  "@type": "introduction",
  "value": [
    {
      "type": "p",
      "children": [
        {
          "text": "A short introductory paragraph that sets the context for the page."
        }
      ]
    }
  ]
}
```

The block itself has no content fields. The renderer should display the page's `title` and `description`.

## Rendering

### React

<!-- file: examples/react/IntroductionBlock.jsx -->
```jsx
function IntroductionBlock({ block }) {
  return (
    <div data-block-uid={block['@uid']} className="introduction-block">
      <div className="introduction-body" data-edit-text="value">
        {(block.value || []).map((node, i) => (
          <SlateNode key={i} node={node} />
        ))}
      </div>
    </div>
  );
}
```

### Vue

<!-- file: examples/vue/IntroductionBlock.vue -->
```vue
<template>
  <div :data-block-uid="block['@uid']" class="introduction-block">
    <div class="introduction-body" data-edit-text="value">
      <SlateNode v-for="(node, i) in block.value || []" :key="i" :node="node" />
    </div>
  </div>
</template>

<script setup>
import SlateNode from './SlateNode.vue';
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

<div data-block-uid={block['@uid']} class="introduction-block">
  <div class="introduction-body" data-edit-text="value">
    {#each block.value || [] as node, i (i)}
      <SlateNode {node} />
    {/each}
  </div>
</div>
```
