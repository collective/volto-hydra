# Highlight Block

A prominent content section with a background image, overlay, title, rich text body, and an optional call-to-action link. Used for feature callouts and banners.

This is a **custom** block — register it via `initBridge`.

## Schema

```json
{
  "highlight": {
    "blockSchema": {
      "properties": {
        "title": {
          "title": "Title"
        },
        "description": {
          "title": "Description",
          "widget": "slate"
        },
        "image": {
          "title": "Background Image",
          "widget": "image"
        },
        "cta_title": {
          "title": "CTA Text"
        },
        "cta_link": {
          "title": "CTA Link",
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
  "@type": "highlight",
  "title": "Featured Content",
  "description": [
    {
      "type": "p",
      "children": [
        {
          "text": "Discover the latest updates and features available in this release."
        }
      ]
    }
  ],
  "image": "data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%27800%27 height=%27400%27%3E%3Crect width=%27100%25%27 height=%27100%25%27 fill=%27%23334455%27/%3E%3Ctext x=%2750%25%27 y=%2750%25%27 fill=%27white%27 text-anchor=%27middle%27 font-size=%2724%27%3EHighlight BG%3C/text%3E%3C/svg%3E",
  "cta_title": "Read More",
  "cta_link": [
    {
      "@id": "/news/latest"
    }
  ]
}
```

## Rendering

### React

<!-- file: examples/react/HighlightBlock.jsx -->
```jsx
const highlightGradients = {
  'highlight-custom-color-1': 'linear-gradient(135deg, #1e3a5f, #2563eb)',
  'highlight-custom-color-2': 'linear-gradient(135deg, #064e3b, #059669)',
  'highlight-custom-color-3': 'linear-gradient(135deg, #581c87, #9333ea)',
  'highlight-custom-color-4': 'linear-gradient(135deg, #78350f, #d97706)',
  'highlight-custom-color-5': 'linear-gradient(135deg, #881337, #e11d48)',
};

function HighlightBlock({ block }) {
  const title = block.title || '';
  const description = block.description || [];
  const imageSrc = block.image || '';
  const ctaText = block.cta_title || '';
  const ctaLink = block.cta_link?.[0]?.['@id'] || '';
  const gradient = highlightGradients[block.styles?.descriptionColor] || 'linear-gradient(135deg, #334, #556)';
  const bgStyle = imageSrc
    ? { backgroundImage: `url(${imageSrc})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : { background: gradient };

  return (
    <section
      data-block-uid={block['@uid']}
      className="highlight-block"
      style={{ ...bgStyle, padding: '40px 20px', color: 'white', borderRadius: '8px' }}
    >
      <div className="highlight-overlay" style={{ background: 'rgba(0,0,0,0.4)', padding: '30px', borderRadius: '8px' }}>
        <h2 data-edit-text="title">{title}</h2>
        <div className="highlight-body">
          {description.map((node, i) => (
            <SlateNode key={i} node={node} />
          ))}
        </div>
        {ctaText && (
          <a href={ctaLink} data-edit-text="cta_title" data-edit-link="cta_link" className="highlight-cta"
            style={{ display: 'inline-block', padding: '10px 20px', background: '#007eb1', color: 'white', textDecoration: 'none', borderRadius: '4px', marginTop: '16px' }}>
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
    :style="{ ...bgStyle, padding: '40px 20px', color: 'white', borderRadius: '8px' }"
  >
    <div class="highlight-overlay" style="background:rgba(0,0,0,0.4);padding:30px;border-radius:8px">
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
        style="display:inline-block;padding:10px 20px;background:#007eb1;color:white;text-decoration:none;border-radius:4px;margin-top:16px"
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

const gradients = {
  'highlight-custom-color-1': 'linear-gradient(135deg, #1e3a5f, #2563eb)',
  'highlight-custom-color-2': 'linear-gradient(135deg, #064e3b, #059669)',
  'highlight-custom-color-3': 'linear-gradient(135deg, #581c87, #9333ea)',
  'highlight-custom-color-4': 'linear-gradient(135deg, #78350f, #d97706)',
  'highlight-custom-color-5': 'linear-gradient(135deg, #881337, #e11d48)',
};
const bgStyle = computed(() => {
  if (props.block.image) {
    return { backgroundImage: `url(${props.block.image})`, backgroundSize: 'cover', backgroundPosition: 'center' };
  }
  const gradient = gradients[props.block.styles?.descriptionColor] || 'linear-gradient(135deg, #334, #556)';
  return { background: gradient };
});
</script>
```

### Svelte

<!-- file: examples/svelte/HighlightBlock.svelte -->
```svelte
<script>
  import SlateNode from './SlateNode.svelte';
  export let block;
  $: ctaLink = block.cta_link?.[0]?.['@id'] || '';

  const gradients = {
    'highlight-custom-color-1': 'linear-gradient(135deg, #1e3a5f, #2563eb)',
    'highlight-custom-color-2': 'linear-gradient(135deg, #064e3b, #059669)',
    'highlight-custom-color-3': 'linear-gradient(135deg, #581c87, #9333ea)',
    'highlight-custom-color-4': 'linear-gradient(135deg, #78350f, #d97706)',
    'highlight-custom-color-5': 'linear-gradient(135deg, #881337, #e11d48)',
  };
  $: gradient = gradients[block.styles?.descriptionColor] || 'linear-gradient(135deg, #334, #556)';
  $: bgStyle = block.image
    ? `background-image:url(${block.image});background-size:cover;background-position:center`
    : `background:${gradient}`;
</script>

<section
  data-block-uid={block['@uid']}
  class="highlight-block"
  style="{bgStyle};padding:40px 20px;color:white;border-radius:8px"
>
  <div class="highlight-overlay" style="background:rgba(0,0,0,0.4);padding:30px;border-radius:8px">
    <h2 data-edit-text="title">{block.title}</h2>
    <div class="highlight-body">
      {#each block.description || [] as node, i (i)}
        <SlateNode {node} />
      {/each}
    </div>
    {#if block.cta_title}
      <a href={ctaLink} data-edit-text="cta_title" data-edit-link="cta_link" class="highlight-cta"
        style="display:inline-block;padding:10px 20px;background:#007eb1;color:white;text-decoration:none;border-radius:4px;margin-top:16px">
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
