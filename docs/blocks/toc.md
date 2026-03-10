# Table of Contents Block

Renders a table of contents generated from heading blocks on the current page. It scans sibling blocks for headings and builds a navigation list.

This is a **built-in** block.

## Schema

```json
{
  "toc": {
    "blockSchema": {
      "properties": {
        "title": {
          "title": "Title"
        },
        "hide_title": {
          "title": "Hide title",
          "type": "boolean"
        },
        "ordered": {
          "title": "Ordered",
          "type": "boolean"
        },
        "levels": {
          "title": "Entries",
          "isMulti": true,
          "choices": [
            [
              "h1",
              "h1"
            ],
            [
              "h2",
              "h2"
            ],
            [
              "h3",
              "h3"
            ],
            [
              "h4",
              "h4"
            ],
            [
              "h5",
              "h5"
            ],
            [
              "h6",
              "h6"
            ]
          ]
        }
      }
    }
  }
}
```


## JSON Block Data

```json
{
  "@type": "toc",
  "title": "On this page",
  "hide_title": false,
  "ordered": false,
  "levels": [
    "h2",
    "h3"
  ]
}
```

The block scans the page's `blocks` for heading entries:
- `heading` type blocks (uses `block.heading` text and `block.tag` level)
- `slate` type blocks whose first node is `h1`–`h6` (uses `plaintext`)

## Rendering

### React

<!-- file: examples/react/TocBlock.jsx -->
```jsx
function TocBlock({ block, content }) {
  const entries = [];
  if (content?.blocks && content?.blocks_layout?.items) {
    for (const id of content.blocks_layout.items) {
      const b = content.blocks[id];
      if (!b) continue;
      if (b['@type'] === 'heading' && b.heading) {
        entries.push({ id, level: parseInt((b.tag || 'h2').slice(1)), text: b.heading });
      } else if (b['@type'] === 'slate' && b.value?.[0]?.type?.match(/^h[1-6]$/)) {
        const level = parseInt(b.value[0].type.slice(1));
        const text = b.plaintext || b.value[0].children?.map(c => c.text).join('') || '';
        if (text.trim()) entries.push({ id, level, text });
      }
    }
  }

  return (
    <nav data-block-uid={block['@uid']} className="toc-block">
      {entries.length > 0 ? (
        <ul>
          {entries.map(e => (
            <li key={e.id} style={{ marginLeft: `${(e.level - 2) * 1.5}em` }}>
              <a href={`#${e.id}`}>{e.text}</a>
            </li>
          ))}
        </ul>
      ) : (
        <p>Table of Contents</p>
      )}
    </nav>
  );
}
```

### Vue

<!-- file: examples/vue/TocBlock.vue -->
```vue
<template>
  <nav :data-block-uid="block['@uid']" class="toc-block">
    <ul v-if="entries.length">
      <li v-for="e in entries" :key="e.id" :style="{ marginLeft: (e.level - 2) * 1.5 + 'em' }">
        <a :href="`#${e.id}`">{{ e.text }}</a>
      </li>
    </ul>
    <p v-else>Table of Contents</p>
  </nav>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({ block: Object, content: Object });

const entries = computed(() => {
  const result = [];
  const c = props.content;
  if (!c?.blocks || !c?.blocks_layout?.items) return result;
  for (const id of c.blocks_layout.items) {
    const b = c.blocks[id];
    if (!b) continue;
    if (b['@type'] === 'heading' && b.heading) {
      result.push({ id, level: parseInt((b.tag || 'h2').slice(1)), text: b.heading });
    } else if (b['@type'] === 'slate' && b.value?.[0]?.type?.match(/^h[1-6]$/)) {
      const level = parseInt(b.value[0].type.slice(1));
      const text = b.plaintext || b.value[0].children?.map(c => c.text).join('') || '';
      if (text.trim()) result.push({ id, level, text });
    }
  }
  return result;
});
</script>
```

### Svelte

<!-- file: examples/svelte/TocBlock.svelte -->
```svelte
<script>
  export let block;
  export let content = {};

  $: entries = (() => {
    const result = [];
    if (!content?.blocks || !content?.blocks_layout?.items) return result;
    for (const id of content.blocks_layout.items) {
      const b = content.blocks[id];
      if (!b) continue;
      if (b['@type'] === 'heading' && b.heading) {
        result.push({ id, level: parseInt((b.tag || 'h2').slice(1)), text: b.heading });
      } else if (b['@type'] === 'slate' && b.value?.[0]?.type?.match(/^h[1-6]$/)) {
        const level = parseInt(b.value[0].type.slice(1));
        const text = b.plaintext || b.value[0].children?.map(c => c.text).join('') || '';
        if (text.trim()) result.push({ id, level, text });
      }
    }
    return result;
  })();
</script>

<nav data-block-uid={block['@uid']} class="toc-block">
  {#if entries.length > 0}
    <ul>
      {#each entries as e (e.id)}
        <li style="margin-left: {(e.level - 2) * 1.5}em">
          <a href="#{e.id}">{e.text}</a>
        </li>
      {/each}
    </ul>
  {:else}
    <p>Table of Contents</p>
  {/if}
</nav>
```
