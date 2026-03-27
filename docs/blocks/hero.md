# Hero Block

A full-width hero section with heading, subheading, image, rich text description, and a call-to-action button. Demonstrates multiple field types in a single block: `string`, `textarea`, `slate`, `image`, and `object_browser`.

This is a **custom** block — register it via `initBridge`.

## Schema

```json
{
  "hero": {
    "blockSchema": {
      "properties": {
        "heading": {
          "title": "Heading"
        },
        "subheading": {
          "title": "Subheading",
          "widget": "textarea"
        },
        "buttonText": {
          "title": "Button Text"
        },
        "buttonLink": {
          "title": "Button Link",
          "widget": "object_browser",
          "mode": "link",
          "allowExternals": true
        },
        "image": {
          "title": "Image",
          "widget": "image"
        },
        "description": {
          "title": "Description",
          "widget": "slate"
        }
      }
    },
    "fieldMappings": {
      "@default": {
        "title": "heading",
        "description": "subheading",
        "@id": "buttonLink",
        "image": "image"
      }
    }
  }
}
```


## JSON Block Data

```json
{
  "@type": "hero",
  "heading": "Welcome to Our Site",
  "subheading": "Discover amazing content\nacross multiple lines",
  "buttonText": "Get Started",
  "buttonLink": [
    {
      "@id": "/getting-started"
    }
  ],
  "image": "data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%27800%27 height=%27400%27%3E%3Crect width=%27100%25%27 height=%27100%25%27 fill=%27%234a90d9%27/%3E%3Ctext x=%2750%25%27 y=%2750%25%27 fill=%27white%27 text-anchor=%27middle%27 font-size=%2724%27%3EHero Image%3C/text%3E%3C/svg%3E",
  "description": [
    {
      "type": "p",
      "children": [
        {
          "text": "We build tools that make content editing delightful."
        }
      ]
    }
  ]
}
```

## Rendering

### React

<!-- file: examples/react/HeroBlock.jsx -->
```jsx
import { getImageUrl } from './utils.js';

function HeroBlock({ block }) {
  const heading = block.heading || '';
  const subheading = (block.subheading || '').replace(/\n/g, '<br>');
  const buttonText = block.buttonText || '';
  const buttonLink = block.buttonLink?.[0]?.['@id'] || '';
  const imageSrc = getImageUrl(block.image);

  return (
    <div data-block-uid={block['@uid']} className="hero-block">
      {imageSrc && (
        <img data-edit-media="image" src={imageSrc} alt="Hero image" />
      )}
      <h1 data-edit-text="heading">{heading}</h1>
      <p data-edit-text="subheading" dangerouslySetInnerHTML={{ __html: subheading }} />
      <div className="hero-description">
        {(block.description || []).map((node, i) => (
          <SlateNode key={i} node={node} />
        ))}
      </div>
      <a data-edit-text="buttonText" data-edit-link="buttonLink" href={buttonLink}>
        {buttonText}
      </a>
    </div>
  );
}
```

### Vue

<!-- file: examples/vue/HeroBlock.vue -->
```vue
<template>
  <div :data-block-uid="block['@uid']" class="hero-block">
    <img v-if="block.image" data-edit-media="image" :src="heroImageSrc" alt="Hero image" />
    <h1 data-edit-text="heading">{{ block.heading }}</h1>
    <p data-edit-text="subheading" v-html="subheadingHtml" />
    <div class="hero-description">
      <SlateNode v-for="(node, i) in block.description || []" :key="i" :node="node" />
    </div>
    <a data-edit-text="buttonText" data-edit-link="buttonLink" :href="buttonLink">
      {{ block.buttonText }}
    </a>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { getImageUrl } from './utils.js';
const props = defineProps({ block: Object });
const subheadingHtml = computed(() => (props.block.subheading || '').replace(/\n/g, '<br>'));
const buttonLink = computed(() => props.block.buttonLink?.[0]?.['@id'] || '');
const heroImageSrc = computed(() => getImageUrl(props.block.image));
</script>
```

### Svelte

<!-- file: examples/svelte/HeroBlock.svelte -->
```svelte
<script>
  import SlateNode from './SlateNode.svelte';
  import { getImageUrl } from './utils.js';
  export let block;

  $: subheadingHtml = (block.subheading || '').replace(/\n/g, '<br>');
  $: buttonLink = block.buttonLink?.[0]?.['@id'] || '';
  $: heroImageSrc = getImageUrl(block.image);
</script>

<div data-block-uid={block['@uid']} class="hero-block">
  {#if block.image}
    <img data-edit-media="image" src={heroImageSrc} alt="Hero image" />
  {/if}
  <h1 data-edit-text="heading">{block.heading}</h1>
  <p data-edit-text="subheading">{@html subheadingHtml}</p>
  <div class="hero-description">
    {#each block.description || [] as node, i (i)}
      <SlateNode {node} />
    {/each}
  </div>
  <a data-edit-text="buttonText" data-edit-link="buttonLink" href={buttonLink}>
    {block.buttonText}
  </a>
</div>
```
