# Teaser Block

A content preview card that links to another page. Selecting a target page via the object browser auto-fills the title, description, and preview image from that page. Editors can toggle "overwrite" to customize these values.

This is a **built-in** block.

## Schema

```json
{
  "teaser": {
    "fieldMappings": {
      "@default": {
        "@id": "href",
        "title": "title",
        "description": "description",
        "image": "preview_image"
      }
    },
    "blockSchema": {
      "properties": {
        "href": {
          "title": "Target",
          "widget": "object_browser",
          "mode": "link"
        },
        "title": {
          "title": "Title"
        },
        "description": {
          "title": "Description",
          "widget": "textarea"
        },
        "preview_image": {
          "title": "Preview Image",
          "widget": "image"
        },
        "overwrite": {
          "title": "Overwrite target content",
          "type": "boolean"
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
  "@type": "teaser",
  "href": [
    {
      "@id": "/news/my-article",
      "title": "My Article",
      "description": "A short summary of the article",
      "hasPreviewImage": true
    }
  ],
  "title": "Custom Title",
  "description": "Custom description overriding the target",
  "preview_image": "data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%27400%27 height=%27300%27%3E%3Crect width=%27100%25%27 height=%27100%25%27 fill=%27%2399bbdd%27/%3E%3Ctext x=%2750%25%27 y=%2750%25%27 fill=%27white%27 text-anchor=%27middle%27 font-size=%2718%27%3ETeaser%3C/text%3E%3C/svg%3E",
  "overwrite": true
}
```

When `overwrite` is `false` (default), the renderer should use `href[0].title` and `href[0].description`. When `true`, use `block.title` and `block.description`.

## Rendering

### React

<!-- file: examples/react/TeaserBlock.jsx -->
```jsx
function TeaserBlock({ block }) {
  const hrefObj = block.href?.[0] || null;
  const useBlockData = block.overwrite || !hrefObj?.title;

  const title = useBlockData ? block.title : hrefObj?.title || '';
  const description = useBlockData ? block.description : hrefObj?.description || '';
  const href = hrefObj?.['@id'] || '';
  const imageSrc = block.preview_image
    ? (typeof block.preview_image === 'string' ? block.preview_image : block.preview_image['@id'])
    : (hrefObj?.hasPreviewImage ? `${href}/@@images/preview_image` : '');

  if (!href) {
    return (
      <div data-block-uid={block['@uid']} className="teaser-placeholder">
        <p>Select a target page for this teaser</p>
      </div>
    );
  }

  return (
    <div data-block-uid={block['@uid']} className="teaser-block">
      {imageSrc && <img data-edit-media="preview_image" src={imageSrc} alt="" />}
      <h3 data-edit-text="title">{title}</h3>
      <p data-edit-text="description">{description}</p>
      <a href={href} data-edit-link="href">Read more</a>
    </div>
  );
}
```

### Vue

<!-- file: examples/vue/TeaserBlock.vue -->
```vue
<template>
  <div :data-block-uid="block['@uid']" class="teaser-block">
    <div v-if="!href" class="teaser-placeholder">
      <p>Select a target page for this teaser</p>
    </div>
    <template v-else>
      <img v-if="imageSrc" data-edit-media="preview_image" :src="imageSrc" alt="" />
      <h3 data-edit-text="title">{{ title }}</h3>
      <p data-edit-text="description">{{ description }}</p>
      <a :href="href" data-edit-link="href">Read more</a>
    </template>
  </div>
</template>

<script setup>
import { computed } from 'vue';
const props = defineProps({ block: Object });

const hrefObj = computed(() => props.block.href?.[0] || null);
const useBlockData = computed(() => props.block.overwrite || !hrefObj.value?.title);
const title = computed(() => useBlockData.value ? props.block.title : hrefObj.value?.title || '');
const description = computed(() => useBlockData.value ? props.block.description : hrefObj.value?.description || '');
const href = computed(() => hrefObj.value?.['@id'] || '');
const imageSrc = computed(() => {
  if (props.block.preview_image) {
    return typeof props.block.preview_image === 'string'
      ? props.block.preview_image
      : props.block.preview_image['@id'];
  }
  return hrefObj.value?.hasPreviewImage ? `${href.value}/@@images/preview_image` : '';
});
</script>
```

### Svelte

<!-- file: examples/svelte/TeaserBlock.svelte -->
```svelte
<script>
  export let block;

  $: hrefObj = block.href?.[0] || null;
  $: useBlockData = block.overwrite || !hrefObj?.title;
  $: title = useBlockData ? block.title : hrefObj?.title || '';
  $: description = useBlockData ? block.description : hrefObj?.description || '';
  $: href = hrefObj?.['@id'] || '';
  $: imageSrc = block.preview_image
    ? (typeof block.preview_image === 'string' ? block.preview_image : block.preview_image['@id'])
    : (hrefObj?.hasPreviewImage ? `${href}/@@images/preview_image` : '');
</script>

{#if !href}
  <div data-block-uid={block['@uid']} class="teaser-placeholder">
    <p>Select a target page for this teaser</p>
  </div>
{:else}
  <div data-block-uid={block['@uid']} class="teaser-block">
    {#if imageSrc}
      <img data-edit-media="preview_image" src={imageSrc} alt="" />
    {/if}
    <h3 data-edit-text="title">{title}</h3>
    <p data-edit-text="description">{description}</p>
    <a {href} data-edit-link="href">Read more</a>
  </div>
{/if}
```
