---
"@type": Document
UID: docs-examples-slider-001
allow_discussion: false
contributors: []
creators:
  - admin
description: A carousel/slider that cycles through slides. Slides are stored as
  an object_list — each slide has a title, description, image, and optional
  button.
effective: null
exclude_from_nav: false
expires: null
id: slider
language: "##DEFAULT##"
layout: document_view
review_state: published
rights: ""
subjects:
  - blocks
  - containers
  - media
title: Slider Block
blocks:
  - title-1: title
  - ref-slider-description: slate
  - ref-slider-schema: codeExample
  - ref-slider-json-data: codeExample
  - ref-slider-rendering: codeExample
---

:::title{uid="title-1"}
:::

A carousel/slider that cycles through slides. Slides are stored as an object\_list — each slide has a title, description, image, and optional button.

:::codeExample{uid="ref-slider-schema" templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-slider" slotId="schema" tabs="${1.../h3}" tabs.label="${1/text}" tabs.language="${2/lang}" tabs.code="${2/code}" tabs@ids=["ref-slider-schema-javascript-ce9b5a"]}
### Schema

```javascript
{
  "slider": {
    "schemaEnhancer": {
      "inheritSchemaFrom": {}
    },
    "blockSchema": {
      "properties": {
        "slides": {
          "title": "Slides",
          "widget": "object_list",
          "allowedBlocks": [
            "slide",
            "image",
            "listing",
            "teaser"
          ],
          "typeField": "@type",
          "itemTypeField": "variation",
          "defaultBlockType": "slide"
        },
        "variation": {
          "title": "Item Type",
          "widget": "blockTypeSelect",
          "filterConvertibleFrom": "@default"
        },
        "autoplayEnabled": {
          "title": "Autoplay Enabled",
          "type": "boolean",
          "default": false
        },
        "autoplayDelay": {
          "title": "Autoplay Delay",
          "type": "integer",
          "default": 4000
        },
        "autoplayJump": {
          "title": "Autoplay Jump",
          "type": "boolean",
          "default": false
        }
      }
    }
  },
  "slide": {
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
        "head_title": {
          "title": "Kicker"
        },
        "title": {
          "title": "Title"
        },
        "description": {
          "title": "Description",
          "widget": "textarea"
        },
        "preview_image": {
          "title": "Image Override",
          "widget": "object_browser",
          "mode": "image",
          "allowExternals": true
        },
        "buttonText": {
          "title": "Button Text"
        },
        "hideButton": {
          "title": "Hide Button",
          "type": "boolean"
        }
      }
    }
  }
}
```
:::

:::codeExample{uid="ref-slider-json-data" templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-slider" slotId="json-data" tabs="${1.../h3}" tabs.label="${1/text}" tabs.language="${2/lang}" tabs.code="${2/code}" tabs@ids=["ref-slider-json-data-json-c5167b"]}
### JSON Block Data

```json
{
  "@type": "slider",
  "autoplayEnabled": false,
  "autoplayDelay": 5000,
  "slides": [
    {
      "@id": "slide-1",
      "@type": "slide",
      "head_title": "New Release",
      "title": "Product Launch 2025",
      "description": "Discover our latest innovations.",
      "preview_image": [
        {
          "@id": "data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%27800%27 height=%27400%27%3E%3Crect width=%27100%25%27 height=%27100%25%27 fill=%27%235577aa%27/%3E%3Ctext x=%2750%25%27 y=%2750%25%27 fill=%27white%27 text-anchor=%27middle%27 font-size=%2724%27%3ESlide 1%3C/text%3E%3C/svg%3E"
        }
      ],
      "buttonText": "Learn More"
    },
    {
      "@id": "slide-2",
      "@type": "slide",
      "head_title": "Featured",
      "title": "Award-Winning Design",
      "description": "Recognized for excellence in UX.",
      "preview_image": [
        {
          "@id": "data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%27800%27 height=%27400%27%3E%3Crect width=%27100%25%27 height=%27100%25%27 fill=%27%23aa5577%27/%3E%3Ctext x=%2750%25%27 y=%2750%25%27 fill=%27white%27 text-anchor=%27middle%27 font-size=%2724%27%3ESlide 2%3C/text%3E%3C/svg%3E"
        }
      ],
      "buttonText": "See Details"
    }
  ]
}
```
:::

:::codeExample{uid="ref-slider-rendering" templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-slider" slotId="rendering" tabs="${1.../h3}" tabs.label="${1/text}" tabs.language="${2/lang}" tabs.code="${2/code}" tabs@ids=["ref-slider-rendering-jsx-87bcad","ref-slider-rendering-vue-6e69c4","ref-slider-rendering-svelte-586973"]}
### React

```jsx
import { getImageUrl } from './utils.js';

function SliderBlock({ block }) {
  const [current, setCurrent] = useState(0);
  const slides = expandTemplatesSync(block.slides || [], { idField: '@id' });

  return (
    <div data-block-uid={block['@uid']} className="slider-block">
      {slides.map((slide, i) => (
        <div
          key={slide['@id']}
          data-block-uid={slide['@id']}
          className="slide"
          style={{ display: i === current ? 'block' : 'none' }}
        >
          {slide.preview_image && (
            <img
              data-edit-media="preview_image"
              src={getImageUrl(slide.preview_image)}
              alt=""
            />
          )}
          <span data-edit-text="head_title">{slide.head_title}</span>
          <h2 data-edit-text="title">{slide.title}</h2>
          <p data-edit-text="description">{slide.description}</p>
          <button data-edit-text="buttonText">{slide.buttonText}</button>
        </div>
      ))}
      <div className="slider-dots">
        {slides.map((_, i) => (
          <button key={i} onClick={() => setCurrent(i)} className={i === current ? 'active' : ''} />
        ))}
      </div>
    </div>
  );
}
```

### Vue

```vue
<template>
  <div :data-block-uid="block['@uid']" class="slider-block">
    <div
      v-for="(slide, i) in slides"
      :key="slide['@id']"
      :data-block-uid="slide['@id']"
      class="slide"
      v-show="i === current"
    >
      <img
        v-if="slide.preview_image"
        data-edit-media="preview_image"
        :src="getImageUrl(slide.preview_image)"
        alt=""
      />
      <span data-edit-text="head_title">{{ slide.head_title }}</span>
      <h2 data-edit-text="title">{{ slide.title }}</h2>
      <p data-edit-text="description">{{ slide.description }}</p>
      <button data-edit-text="buttonText">{{ slide.buttonText }}</button>
    </div>
    <div class="slider-dots">
      <button
        v-for="(_, i) in slides"
        :key="i"
        @click="current = i"
        :class="{ active: i === current }"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { getImageUrl } from './utils.js';
const props = defineProps({ block: Object });
const current = ref(0);
// Expand the slides object_list (keyed by @id). Edit-mode pass-through sets each slide's @uid.
const slides = computed(() => expandTemplatesSync(props.block.slides || [], { idField: '@id' }));
</script>
```

### Svelte

```svelte
<script>
  import { getImageUrl } from './utils.js';
  export let block;
  let current = 0;
  // Expand the slides object_list (keyed by @id). Edit-mode pass-through sets each slide's @uid.
  $: slides = expandTemplatesSync(block.slides || [], { idField: '@id' });
</script>

<div data-block-uid={block['@uid']} class="slider-block">
  {#each slides as slide, i (slide['@id'])}
    <div
      data-block-uid={slide['@id']}
      class="slide"
      style:display={i === current ? 'block' : 'none'}
    >
      {#if slide.preview_image}
        <img
          data-edit-media="preview_image"
          src={getImageUrl(slide.preview_image)}
          alt=""
        />
      {/if}
      <span data-edit-text="head_title">{slide.head_title}</span>
      <h2 data-edit-text="title">{slide.title}</h2>
      <p data-edit-text="description">{slide.description}</p>
      <button data-edit-text="buttonText">{slide.buttonText}</button>
    </div>
  {/each}
  <div class="slider-dots">
    {#each slides as _, i}
      <button on:click={() => current = i} class:active={i === current} />
    {/each}
  </div>
</div>
```
:::
