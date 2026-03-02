# Highlight Block

A prominent content section with a background image, overlay, title, rich text body, and an optional call-to-action link. Used for feature callouts and banners.

This is a **custom** block — register it via `initBridge`.

## Schema

No block config needed — Highlight is a built-in Volto block.

## JSON Block Data

```json
{
  "@type": "highlight",
  "title": "Featured Content",
  "description": [
    {
      "type": "p",
      "children": [{ "text": "Discover the latest updates and features available in this release." }]
    }
  ],
  "image": "/banner/@@images/image",
  "cta_title": "Read More",
  "cta_link": [{ "@id": "/news/latest" }]
}
```

## Rendering

### React

<!-- file: examples/react/HighlightBlock.jsx -->
```jsx
function HighlightBlock({ block }) {
  const title = block.title || '';
  const description = block.description || [];
  const imageSrc = block.image || '';
  const ctaText = block.cta_title || '';
  const ctaLink = block.cta_link?.[0]?.['@id'] || '';

  return (
    <section
      data-block-uid={block['@uid']}
      className="highlight-block"
      style={{ backgroundImage: imageSrc ? `url(${imageSrc})` : undefined }}
    >
      <div className="highlight-overlay">
        <h2 data-edit-text="title">{title}</h2>
        <div className="highlight-body">
          {description.map((node, i) => (
            <SlateNode key={i} node={node} />
          ))}
        </div>
        {ctaText && (
          <a href={ctaLink} data-edit-text="cta_title" data-edit-link="cta_link" className="highlight-cta">
            {ctaText}
          </a>
        )}
      </div>
    </section>
  );
}
```

### Vue

<!-- file: examples/vue/HighlightBlock.vue -->
```vue
<template>
  <section
    :data-block-uid="block['@uid']"
    class="highlight-block"
    :style="{ backgroundImage: block.image ? `url(${block.image})` : undefined }"
  >
    <div class="highlight-overlay">
      <h2 data-edit-text="title">{{ block.title }}</h2>
      <div class="highlight-body">
        <SlateNode v-for="(node, i) in block.description || []" :key="i" :node="node" />
      </div>
      <a
        v-if="block.cta_title"
        :href="ctaLink"
        data-edit-text="cta_title"
        data-edit-link="cta_link"
        class="highlight-cta"
      >
        {{ block.cta_title }}
      </a>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue';
const props = defineProps({ block: Object });
const ctaLink = computed(() => props.block.cta_link?.[0]?.['@id'] || '');
</script>
```

### Svelte

<!-- file: examples/svelte/HighlightBlock.svelte -->
```svelte
<script>
  import SlateNode from './SlateNode.svelte';
  export let block;
  $: ctaLink = block.cta_link?.[0]?.['@id'] || '';
</script>

<section
  data-block-uid={block['@uid']}
  class="highlight-block"
  style={block.image ? `background-image: url(${block.image})` : ''}
>
  <div class="highlight-overlay">
    <h2 data-edit-text="title">{block.title}</h2>
    <div class="highlight-body">
      {#each block.description || [] as node, i (i)}
        <SlateNode {node} />
      {/each}
    </div>
    {#if block.cta_title}
      <a href={ctaLink} data-edit-text="cta_title" data-edit-link="cta_link" class="highlight-cta">
        {block.cta_title}
      </a>
    {/if}
  </div>
</section>
```

### Data Attributes

| Attribute | Purpose |
|-----------|---------|
| `data-edit-text="title"` | Makes the title inline-editable |
| `data-edit-text="cta_title"` | Makes the CTA button text editable |
| `data-edit-link="cta_link"` | Makes the CTA link destination editable |
