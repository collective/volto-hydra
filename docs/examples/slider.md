# Slider Block

A carousel/slider that cycles through slides. Slides are stored as an `object_list` — each slide has a title, description, image, and optional button.

This is a **custom** block — register it via `initBridge`.

## Schema

```json
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


## JSON Block Data

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

## Rendering

### React

<!-- file: examples/react/SliderBlock.jsx -->
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

<!-- file: examples/vue/SliderBlock.vue -->
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

<!-- file: examples/svelte/SliderBlock.svelte -->
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

### Astro

<!-- file: examples/astro/SliderBlock.astro -->
```astro
---
/**
 * Slider/carousel. Server-render shows the first slide visible and the
 * rest hidden, mirroring the svelte version's initial state. There's no
 * client interactivity in the SSR example — tests only verify per-slide
 * DOM hooks render.
 *
 * Each slide keeps its own data-block-uid so the bridge can target slides
 * individually.
 */
import { getImageUrl } from './utils.js';
import { expandTemplatesSync } from '$helpers';
// astro renders ONLY via the edit render API (SSR has no window.name), so default to edit mode —
// also covers a slider nested in a container, whose BlockRenderer doesn't thread editMode down.
const { block, editMode = true } = Astro.props;
// Expand the slides object_list (idField @id). Edit mode makes this a pass-through that sets each
// slide's @uid (a view render would need pre-loaded templates instead).
const slides = expandTemplatesSync(block.slides || [], { idField: '@id', editMode });
---
<div class="slider-block">
  {slides.map((slide: any, i: number) => (
    <div
      data-block-uid={slide['@id']}
      class="slide"
      style={`display: ${i === 0 ? 'block' : 'none'}`}
    >
      {slide.preview_image && (
        <img data-edit-media="preview_image" src={getImageUrl(slide.preview_image)} alt="" />
      )}
      <span data-edit-text="head_title">{slide.head_title}</span>
      <h2 data-edit-text="title">{slide.title}</h2>
      <p data-edit-text="description">{slide.description}</p>
      <button data-edit-text="buttonText">{slide.buttonText}</button>
    </div>
  ))}
  <div class="slider-dots">
    {slides.map((_: any, i: number) => (
      <button class={i === 0 ? 'active' : ''} />
    ))}
  </div>
</div>
```
