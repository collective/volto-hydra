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
is_folderish: false
language: "##DEFAULT##"
layout: document_view
review_state: published
rights: ""
subjects:
  - blocks
  - containers
  - media
title: Slider Block
blocks-assignments:
  - { uid: title-1 }
  - { uid: ref-slider-description }
  - { uid: ref-slider-schema }
  - { id: ref-slider-schema-javascript-ce9b5a }
  - { uid: ref-slider-json-data }
  - { id: ref-slider-json-data-json-c5167b }
  - { uid: ref-slider-rendering }
  - { id: ref-slider-rendering-jsx-87bcad }
  - { id: ref-slider-rendering-vue-6e69c4 }
  - { id: ref-slider-rendering-svelte-586973 }
blocks-matched: |
  <block type="slate" value="${p,h*,ul,ol,blockquote,strong,em/slate}" />
  <block type="title" _="${h1}" />
  <block type="codeExample">
    <region name="tabs" widget="object_list">
      <block type="tab" label="${h3/text}" language="${pre/lang}" code="${pre/text}" />
    </region>
  </block>
---

# Slider Block

A carousel/slider that cycles through slides. Slides are stored as an object\_list — each slide has a title, description, image, and optional button.

<fields templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-slider">

<block type="codeExample" slotId="schema">

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

</block>

<block type="codeExample" slotId="json-data">

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

</block>

<block type="codeExample" slotId="rendering">

### React

```{literalinclude} ../../../examples/examples/react/SliderBlock.jsx
:language: jsx
```

### Vue

```{literalinclude} ../../../examples/examples/vue/SliderBlock.vue
:language: vue
```

### Svelte

```{literalinclude} ../../../examples/examples/svelte/SliderBlock.svelte
:language: svelte
```

</block>

</fields>
