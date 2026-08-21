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
  - { id: ref-hero-rendering-astro-239496 }
blocks-matched: |
  <block type="slate" value="${p,h*,ul,ol,blockquote/slate}" />
  <block type="title" _="${h1}" />
  <block type="codeExample">
    <region name="tabs" widget="object_list">
      <block type="tab" label="${h3/text}" language="${pre/lang}" code="${pre/text}" />
    </region>
  </block>
---

# Hero Block

A full-width hero section with heading, subheading, image, rich text description, and a call-to-action button. Demonstrates multiple field types in a single block: string, textarea, slate, image, and object\_browser.

<fields templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-hero">

<block type="codeExample" slotId="schema">

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

<block type="codeExample" slotId="json-data">

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

<block type="codeExample" slotId="rendering">

### React

```{literalinclude} ../../../examples/examples/react/HeroBlock.jsx
:language: jsx
```

### Vue

```{literalinclude} ../../../examples/examples/vue/HeroBlock.vue
:language: vue
```

### Svelte

```{literalinclude} ../../../examples/examples/svelte/HeroBlock.svelte
:language: svelte
```

### Astro

```{literalinclude} ../../../examples/examples/astro/HeroBlock.astro
:language: astro
```

</block>

</fields>
