# Image Block

Displays an image with optional alt text and link. Supports the image picker widget for selecting images from the Plone content tree or uploading new ones.

This is a **built-in** block.

## Schema

```json
{
  "image": {
    "fieldMappings": {
      "@default": {
        "image": "url",
        "@id": "href",
        "title": "alt"
      }
    },
    "blockSchema": {
      "properties": {
        "url": {
          "title": "Image",
          "widget": "image"
        },
        "alt": {
          "title": "Alt Text"
        },
        "href": {
          "title": "Link",
          "widget": "object_browser",
          "mode": "link"
        }
      }
    },
    "schemaEnhancer": {
      "childBlockConfig": {
        "defaultsField": "itemDefaults"
      }
    }
  }
}
```


## JSON Block Data

```json
{
  "@type": "image",
  "url": "data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%27600%27 height=%27400%27%3E%3Crect width=%27100%25%27 height=%27100%25%27 fill=%27%2377aadd%27/%3E%3Ctext x=%2750%25%27 y=%2750%25%27 fill=%27white%27 text-anchor=%27middle%27 font-size=%2724%27%3ETest Image%3C/text%3E%3C/svg%3E",
  "alt": "A description of the image",
  "href": [
    {
      "@id": "/target-page"
    }
  ]
}
```

The `url` field can be:
- A Plone image path: `"/my-image/@@images/image"`
- An external URL: `"https://example.com/photo.jpg"`

The `href` field (optional) wraps the image in a link. Format is an array with one object containing `@id`.

## Rendering

### React

<!-- file: examples/react/ImageBlock.jsx -->
```jsx
function ImageBlock({ block }) {
  const src = block.url || '';
  const alt = block.alt || '';
  const href = block.href?.[0]?.['@id'] || block.href;

  const img = (
    <img data-edit-media="url" src={src} alt={alt} />
  );

  return (
    <div data-block-uid={block['@uid']}>
      {href ? (
        <a href={href} data-edit-link="href">{img}</a>
      ) : (
        <>{img}</>
      )}
    </div>
  );
}
```

### Vue

<!-- file: examples/vue/ImageBlock.vue -->
```vue
<template>
  <div :data-block-uid="block['@uid']">
    <a v-if="href" :href="href" data-edit-link="href">
      <img data-edit-media="url" :src="block.url" :alt="block.alt" />
    </a>
    <img v-else data-edit-media="url" :src="block.url" :alt="block.alt" />
  </div>
</template>

<script setup>
import { computed } from 'vue';
const props = defineProps({ block: Object });
const href = computed(() => props.block.href?.[0]?.['@id'] || props.block.href);
</script>
```

### Svelte

<!-- file: examples/svelte/ImageBlock.svelte -->
```svelte
<script>
  export let block;
  $: href = block.href?.[0]?.['@id'] || block.href;
</script>

<div data-block-uid={block['@uid']}>
  {#if href}
    <a {href} data-edit-link="href">
      <img data-edit-media="url" src={block.url} alt={block.alt} />
    </a>
  {:else}
    <img data-edit-media="url" src={block.url} alt={block.alt} />
  {/if}
</div>
```

### Data Attributes

| Attribute | Purpose |
|-----------|---------|
| `data-edit-media="url"` | Makes the image clickable to open the image picker |
| `data-edit-link="href"` | Makes the link editable via the link widget |
