# Image Block

Displays an image with optional alt text and link. Supports the image picker widget for selecting images from the Plone content tree or uploading new ones.

This is a **built-in** block.

## Schema

```js
{
  blockSchema: {
    fieldsets: [
      { id: 'default', title: 'Default', fields: ['url', 'alt', 'href'] }
    ],
    properties: {
      url: {
        title: 'Image URL',
        widget: 'image',
      },
      alt: {
        title: 'Alt text',
        type: 'string',
      },
      href: {
        title: 'Link',
        widget: 'object_browser',
        mode: 'link',
        allowExternals: true,
      },
    },
  },
}
```

### Field Widgets

- **`widget: 'image'`** — opens the image picker (upload or select from content tree)
- **`widget: 'object_browser'`** with `mode: 'link'` — browse content or enter an external URL

## JSON Block Data

```json
{
  "@type": "image",
  "url": "/my-folder/my-image/@@images/image",
  "alt": "A description of the image",
  "href": [{ "@id": "/target-page" }]
}
```

The `url` field can be:
- A Plone image path: `"/my-image/@@images/image"`
- An external URL: `"https://example.com/photo.jpg"`

The `href` field (optional) wraps the image in a link. Format is an array with one object containing `@id`.

## Rendering

### React

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
