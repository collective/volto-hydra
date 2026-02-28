# Accordion Block

A collapsible section with a header and expandable content area. Both the header and content are container fields that hold child blocks.

This is a **custom** block — register it via `initBridge`.

## Schema

```js
accordion: {
  id: 'accordion',
  title: 'Accordion',
  icon: '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="4" rx="1"/><rect x="3" y="10" width="18" height="4" rx="1"/><rect x="3" y="16" width="18" height="4" rx="1"/></svg>',
  group: 'common',
  blockSchema: {
    fieldsets: [
      { id: 'default', title: 'Default', fields: ['header', 'content'] },
    ],
    properties: {
      header: {
        title: 'Header',
        widget: 'blocks_layout',
        allowedBlocks: ['slate'],
        defaultBlockType: 'slate',
      },
      content: {
        title: 'Content',
        widget: 'blocks_layout',
        allowedBlocks: ['slate', 'image'],
        defaultBlockType: 'slate',
      },
    },
  },
}
```

Both `header` and `content` are `blocks_layout` container fields. The header is restricted to slate (text only), while the content area allows both text and images.

## JSON Block Data

```json
{
  "@type": "accordion",
  "header": {
    "items": ["header-text-1"],
    "blocks": {
      "header-text-1": {
        "@type": "slate",
        "value": [{ "type": "p", "children": [{ "text": "Frequently Asked Questions" }] }]
      }
    }
  },
  "content": {
    "items": ["content-text-1"],
    "blocks": {
      "content-text-1": {
        "@type": "slate",
        "value": [{ "type": "p", "children": [{ "text": "Here are the answers to common questions." }] }]
      }
    }
  }
}
```

## Rendering

### React

<!-- file: examples/react/AccordionBlock.jsx -->
```jsx
function AccordionBlock({ block }) {
  const [open, setOpen] = useState(false);

  const header = block.header || {};
  const content = block.content || {};

  return (
    <div data-block-uid={block['@uid']} className="accordion-block">
      <button onClick={() => setOpen(!open)} className="accordion-header">
        {(header.items || []).map(id => (
          <BlockRenderer key={id} block={{ ...header.blocks[id], '@uid': id }} />
        ))}
        <span>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="accordion-content">
          {(content.items || []).map(id => (
            <BlockRenderer key={id} block={{ ...content.blocks[id], '@uid': id }} />
          ))}
        </div>
      )}
    </div>
  );
}
```

### Vue

<!-- file: examples/vue/AccordionBlock.vue -->
```vue
<template>
  <div :data-block-uid="block['@uid']" class="accordion-block">
    <button @click="open = !open" class="accordion-header">
      <BlockRenderer
        v-for="id in block.header?.items || []"
        :key="id"
        :block="{ ...block.header.blocks[id], '@uid': id }"
      />
      <span>{{ open ? '▲' : '▼' }}</span>
    </button>
    <div v-if="open" class="accordion-content">
      <BlockRenderer
        v-for="id in block.content?.items || []"
        :key="id"
        :block="{ ...block.content.blocks[id], '@uid': id }"
      />
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
defineProps({ block: Object });
const open = ref(false);
</script>
```

### Svelte

<!-- file: examples/svelte/AccordionBlock.svelte -->
```svelte
<script>
  import BlockRenderer from './BlockRenderer.svelte';
  export let block;

  let open = false;
</script>

<div data-block-uid={block['@uid']} class="accordion-block">
  <button on:click={() => open = !open} class="accordion-header">
    {#each block.header?.items || [] as id (id)}
      <BlockRenderer block={{ ...block.header.blocks[id], '@uid': id }} />
    {/each}
    <span>{open ? '▲' : '▼'}</span>
  </button>
  {#if open}
    <div class="accordion-content">
      {#each block.content?.items || [] as id (id)}
        <BlockRenderer block={{ ...block.content.blocks[id], '@uid': id }} />
      {/each}
    </div>
  {/if}
</div>
```
