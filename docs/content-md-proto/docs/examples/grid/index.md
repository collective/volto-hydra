---
"@type": Document
UID: 99c70917b6894af08dd306fdbc0eff6a
allow_discussion: false
contributors: []
creators:
  - admin
description: >-
  
  The Grid block allows adding multi-column blocks. A grid block can contain
  between one and four columns of different blocks. Teasers and images can be
  added in a grid block.
effective: 2023-07-06T18:35:00
exclude_from_nav: false
expires: null
id: grid
is_folderish: true
language: "##DEFAULT##"
layout: document_view
preview_caption: null
preview_image:
  blob_path: docs/examples/grid/preview_image/black-starry-night.jpg
  content-type: image/jpeg
  filename: black-starry-night.jpg
  height: 1708
  size: 693013
  width: 2400
review_state: published
rights: ""
subjects:
  - blocks
  - containers
title: Grid
blocks-assignments:
  - { uid: d3f1c443-583f-4e8e-a682-3bf25752a300 }
  - { uid: ref-grid-description }
  - { uid: 616b625c-b79f-4881-8536-b67a9e401a7d }
  - { uid: 7624cf59-05d0-4055-8f55-5fd6597d84b0 }
  - { uid: ref-grid-schema }
  - { id: ref-grid-schema-javascript-af1095 }
  - { uid: ref-grid-json-data }
  - { id: ref-grid-json-data-json-5ff79e }
  - { uid: ref-grid-rendering }
  - { id: ref-grid-rendering-jsx-f30d80 }
  - { id: ref-grid-rendering-vue-1d61ab }
  - { id: ref-grid-rendering-svelte-8158ec }
blocks-matched: |
  <block type="slate" value="${p,h*,ul,ol,blockquote,strong,em/slate}" />
  <block type="title" _="${h1}" />
  <block type="codeExample">
    <region name="tabs" widget="object_list">
      <block type="tab" label="${h3/text}" language="${pre/lang}" code="${pre/text}" />
    </region>
  </block>
order:
  - grid-image
  - listing
  - teaser
  - text
---

# Grid

A responsive grid that lays out child blocks in equal-width cells. The block uses Volto's standard shared-blocks shape — blocks is the dict of children, blocks\_layout.items is their order — and constrains the allowed types via allowedBlocks.

<block type="listing" block="616b625c-b79f-4881-8536-b67a9e401a7d" headlineTag="h2" variation="default" data-json='{"query":[]}' />

<block type="slate" data-json='{"value":[{"children":[{"text":""}],"type":"p"}]}' />

<fields templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-grid">

<block type="codeExample" slotId="schema">

### Schema

```javascript
{
  "gridBlock": {
    "allowedBlocks": ["teaser", "image", "slate"],
    "blockSchema": {
      "properties": {
        "blocks_layout": {
          "title": "Cells",
          "widget": "blocks_layout",
          "allowedBlocks": ["teaser", "image", "slate"]
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
  "@type": "gridBlock",
  "blocks": {
    "cell-1": {
      "@type": "teaser",
      "title": "Design",
      "description": "We craft beautiful interfaces that users love.",
      "href": [{"@id": "/design"}]
    },
    "cell-2": {
      "@type": "image",
      "url": "https://placehold.co/600x400",
      "alt": "Placeholder"
    },
    "cell-3": {
      "@type": "teaser",
      "title": "Learn More",
      "description": "Explore the full documentation.",
      "href": [{"@id": "/docs"}]
    }
  },
  "blocks_layout": {
    "items": ["cell-1", "cell-2", "cell-3"]
  }
}
```

</block>

<block type="codeExample" slotId="rendering">

### React

```{literalinclude} ../../../../examples/examples/react/GridBlock.jsx
:language: jsx
```

### Vue

```{literalinclude} ../../../../examples/examples/vue/GridBlock.vue
:language: vue
```

### Svelte

```{literalinclude} ../../../../examples/examples/svelte/GridBlock.svelte
:language: svelte
```

</block>

</fields>
