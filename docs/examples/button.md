# Button Block

A call-to-action button with editable label and link. The block type is `__button` (double-underscore prefix indicates a Volto built-in).

This is a **built-in** block.

## Schema

```json
{
  "__button": {
    "blockSchema": {
      "properties": {
        "title": {
          "title": "Label"
        },
        "href": {
          "title": "Link",
          "widget": "object_browser",
          "mode": "link"
        }
      }
    }
  }
}
```


## JSON Block Data

```json
{
  "@type": "__button",
  "title": "Learn More",
  "href": [
    {
      "@id": "/about-us"
    }
  ]
}
```

## Rendering

### React

<!-- file: examples/react/ButtonBlock.jsx -->
```jsx
function ButtonBlock({ block }) {
  const title = block.title || 'Button';
  const href = block.href?.[0]?.['@id'] || block.href || '#';

  return (
    <div data-block-uid={block['@uid']} className="button-block">
      <a href={href} data-edit-text="title" data-edit-link="href" className="btn">
        {title}
      </a>
    </div>
  );
}
```

### Vue

<!-- file: examples/vue/ButtonBlock.vue -->
```vue
<template>
  <div :data-block-uid="block['@uid']" class="button-block">
    <a :href="href" data-edit-text="title" data-edit-link="href" class="btn">
      {{ block.title || 'Button' }}
    </a>
  </div>
</template>

<script setup>
import { computed } from 'vue';
const props = defineProps({ block: Object });
const href = computed(() => props.block.href?.[0]?.['@id'] || props.block.href || '#');
</script>
```

### Svelte

<!-- file: examples/svelte/ButtonBlock.svelte -->
```svelte
<script>
  export let block;
  $: href = block.href?.[0]?.['@id'] || block.href || '#';
</script>

<div data-block-uid={block['@uid']} class="button-block">
  <a {href} data-edit-text="title" data-edit-link="href" class="btn">
    {block.title || 'Button'}
  </a>
</div>
```

### Data Attributes

| Attribute | Purpose |
|-----------|---------|
| `data-edit-text="title"` | Makes the button label inline-editable |
| `data-edit-link="href"` | Makes the link destination editable via the link widget |
