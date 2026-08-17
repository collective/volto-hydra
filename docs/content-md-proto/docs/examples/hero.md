---
"@type": Document
UID: docs-examples-hero-001
allow_discussion: false
contributors: []
creators:
  - admin
description: "A full-width hero section with heading, subheading, image, rich
  text description, and a call-to-action button. Demonstrates multiple field
  types in a single block: string, textarea, slate, image, and object_browser."
effective: null
exclude_from_nav: false
expires: null
id: hero
is_folderish: false
language: "##DEFAULT##"
layout: document_view
review_state: published
rights: ""
subjects:
  - blocks
  - media
title: Hero Block
blocks-assignments:
  - { uid: title-1 }
  - { uid: ref-hero-description }
  - { uid: ref-hero-schema }
  - { id: ref-hero-schema-javascript-698e6b }
  - { uid: ref-hero-json-data }
  - { id: ref-hero-json-data-json-fc17f8 }
  - { uid: ref-hero-rendering }
  - { id: ref-hero-rendering-jsx-46a2e5 }
  - { id: ref-hero-rendering-vue-337205 }
  - { id: ref-hero-rendering-svelte-a2ecf7 }
blocks-matched: |
  <block type="slate" value="${p,h*,ul,ol,blockquote/slate}" />
  <block type="title" _="${h1}" />
  <block type="codeExample">
    <region name="tabs" widget="object_list">
      <block type="tab" label="${h3/text}" language="${pre/lang}" code="${pre/text}" />
    </region>
  </block>
---

# 

A full-width hero section with heading, subheading, image, rich text description, and a call-to-action button. Demonstrates multiple field types in a single block: string, textarea, slate, image, and object\_browser.

<block type="codeExample" templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-hero" slotId="schema">

### Schema

```javascript
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

</block>

<block type="codeExample" templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-hero" slotId="json-data">

### JSON Block Data

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

</block>

<block type="codeExample" templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-hero" slotId="rendering">

### React

```jsx
import { getImageUrl } from './utils.js';

function HeroBlock({ block }) {
  const subheading = (block.subheading || '').replace(/\n/g, '<br>');
  const buttonLink = block.buttonLink?.[0]?.['@id'] || '';
  const imageSrc = getImageUrl(block.image);

  // Data-driven: render a field only when it has data. No data ⇒ no element, so
  // view markup stays clean. Inka reveals an empty optional field for editing by
  // seeding it, which makes these same checks true — no edit-mode branch needed.
  return (
    <div data-block-uid={block['@uid']} className="hero-block">
      {imageSrc && (
        <img data-edit-media="image" src={imageSrc} alt="Hero image" />
      )}
      {block.heading && <h1 data-edit-text="heading">{block.heading}</h1>}
      {block.subheading && (
        <p data-edit-text="subheading" dangerouslySetInnerHTML={{ __html: subheading }} />
      )}
      {block.description && (
        <div className="hero-description" data-edit-text="description">
          {block.description.map((node, i) => (
            <SlateNode key={i} node={node} />
          ))}
        </div>
      )}
      {(block.buttonText || block.buttonLink) && (
        <a data-edit-text="buttonText" data-edit-link="buttonLink" href={buttonLink}>
          {block.buttonText}
        </a>
      )}
    </div>
  );
}
```

### Vue

```vue
<template>
  <!-- Data-driven: render a field only when it has data. No data ⇒ no element, so
       view markup stays clean. Inka reveals an empty optional field for editing by
       seeding it, which makes these same checks true — no edit-mode branch needed. -->
  <div :data-block-uid="block['@uid']" class="hero-block">
    <img v-if="block.image" data-edit-media="image" :src="heroImageSrc" alt="Hero image" />
    <h1 v-if="block.heading" data-edit-text="heading">{{ block.heading }}</h1>
    <p v-if="block.subheading" data-edit-text="subheading" v-html="subheadingHtml" />
    <div v-if="block.description" class="hero-description" data-edit-text="description">
      <SlateNode v-for="(node, i) in block.description" :key="i" :node="node" />
    </div>
    <a v-if="block.buttonText || block.buttonLink"
       data-edit-text="buttonText" data-edit-link="buttonLink" :href="buttonLink">
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

```svelte
<script>
  import SlateNode from './SlateNode.svelte';
  import { getImageUrl } from './utils.js';
  export let block;

  $: subheadingHtml = (block.subheading || '').replace(/\n/g, '<br>');
  $: buttonLink = block.buttonLink?.[0]?.['@id'] || '';
  $: heroImageSrc = getImageUrl(block.image);
</script>

<!-- Data-driven: render a field only when it has data. No data ⇒ no element, so
     view markup stays clean. Inka reveals an empty optional field for editing by
     seeding it, which makes these same checks true — no edit-mode branch needed. -->
<div data-block-uid={block['@uid']} class="hero-block">
  {#if block.image}
    <img data-edit-media="image" src={heroImageSrc} alt="Hero image" />
  {/if}
  {#if block.heading}
    <h1 data-edit-text="heading">{block.heading}</h1>
  {/if}
  {#if block.subheading}
    <p data-edit-text="subheading">{@html subheadingHtml}</p>
  {/if}
  {#if block.description}
    <div class="hero-description" data-edit-text="description">
      {#each block.description as node, i (i)}
        <SlateNode {node} />
      {/each}
    </div>
  {/if}
  {#if block.buttonText || block.buttonLink}
    <a data-edit-text="buttonText" data-edit-link="buttonLink" href={buttonLink}>
      {block.buttonText}
    </a>
  {/if}
</div>
```

</block>
