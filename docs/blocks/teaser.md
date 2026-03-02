# Teaser Block

A content preview card that links to another page. Selecting a target page via the object browser auto-fills the title, description, and preview image from that page. Editors can toggle "overwrite" to customize these values.

This is a **built-in** block.

## Schema

The teaser block uses Volto's built-in TeaserSchema. It has an `href` field (object browser) that selects the target content, and an `overwrite` toggle that controls whether block-level title/description/image override the target page's values.

```js
{
  blockSchema: {
    properties: {
      href: {
        title: 'Target',
        widget: 'object_browser',
        mode: 'link',
      },
      title: {
        title: 'Title',
        type: 'string',
      },
      description: {
        title: 'Description',
        type: 'string',
      },
      preview_image: {
        title: 'Image',
        widget: 'image',
      },
      overwrite: {
        title: 'Overwrite',
        type: 'boolean',
        description: 'Override target content values with custom ones',
      },
    },
  },
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
  "preview_image": "/news/my-article/@@images/preview_image",
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
