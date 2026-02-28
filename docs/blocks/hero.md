# Hero Block

A full-width hero section with heading, subheading, image, rich text description, and a call-to-action button. Demonstrates multiple field types in a single block: `string`, `textarea`, `slate`, `image`, and `object_browser`.

This is a **custom** block — register it via `initBridge`.

## Schema

```js
hero: {
  id: 'hero',
  title: 'Hero',
  icon: '<svg viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>',
  group: 'common',
  mostUsed: true,
  blockSchema: {
    fieldsets: [
      {
        id: 'default',
        title: 'Default',
        fields: ['heading', 'subheading', 'buttonText', 'buttonLink', 'image', 'description'],
      },
    ],
    properties: {
      heading: {
        title: 'Heading',
        type: 'string',
      },
      subheading: {
        title: 'Subheading',
        type: 'string',
        widget: 'textarea',
      },
      buttonText: {
        title: 'Button Text',
        type: 'string',
      },
      buttonLink: {
        title: 'Button Link',
        widget: 'object_browser',
        mode: 'link',
        allowExternals: true,
      },
      image: {
        title: 'Image',
        widget: 'image',
      },
      description: {
        title: 'Description',
        type: 'array',
        widget: 'slate',
      },
    },
    required: [],
  },
}
```

### Field Types Used

| Field | Widget | Description |
|-------|--------|-------------|
| `heading` | `string` | Plain text, inline editable |
| `subheading` | `textarea` | Multi-line plain text |
| `buttonText` | `string` | Button label, inline editable |
| `buttonLink` | `object_browser` | Content link or external URL |
| `image` | `image` | Image picker (upload or browse) |
| `description` | `slate` | Rich text (Slate JSON tree) |

## JSON Block Data

```json
{
  "@type": "hero",
  "heading": "Welcome to Our Site",
  "subheading": "Discover amazing content\nacross multiple lines",
  "buttonText": "Get Started",
  "buttonLink": [{ "@id": "/getting-started" }],
  "image": "/hero-banner/@@images/image",
  "description": [
    {
      "type": "p",
      "children": [{ "text": "We build tools that make content editing delightful." }]
    }
  ]
}
```

## Rendering

### React

```jsx
function HeroBlock({ block }) {
  const heading = block.heading || '';
  const subheading = (block.subheading || '').replace(/\n/g, '<br>');
  const buttonText = block.buttonText || '';
  const buttonLink = block.buttonLink?.[0]?.['@id'] || '';
  const imageSrc = block.image || '';

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

```vue
<template>
  <div :data-block-uid="block['@uid']" class="hero-block">
    <img v-if="block.image" data-edit-media="image" :src="block.image" alt="Hero image" />
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
const props = defineProps({ block: Object });
const subheadingHtml = computed(() => (props.block.subheading || '').replace(/\n/g, '<br>'));
const buttonLink = computed(() => props.block.buttonLink?.[0]?.['@id'] || '');
</script>
```
