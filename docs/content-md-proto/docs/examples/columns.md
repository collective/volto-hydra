---
"@type": Document
UID: docs-examples-columns-001
allow_discussion: false
contributors: []
creators:
  - admin
description: A responsive grid layout container. Each cell is a child block
  (teaser, slate, image, etc.) rendered inside the grid. This is the built-in
  Volto grid block (gridBlock).
effective: null
exclude_from_nav: false
expires: null
id: columns
is_folderish: false
language: "##DEFAULT##"
layout: document_view
review_state: published
rights: ""
subjects:
  - blocks
  - containers
title: Grid Block
blocks-assignments:
  - { uid: title-1 }
  - { uid: ref-columns-description }
  - { uid: ref-columns-schema }
  - { id: ref-columns-schema-javascript-45206c }
  - { uid: ref-columns-json-data }
  - { id: ref-columns-json-data-json-9ddfde }
  - { uid: ref-columns-rendering }
  - { id: ref-columns-rendering-jsx-a52cb0 }
  - { id: ref-columns-rendering-vue-526eec }
  - { id: ref-columns-rendering-svelte-9b4eec }
  - { id: ref-columns-rendering-astro-481d9d }
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

A horizontal multi-column container. The block has one slot — columns — restricted to column children, capped at four. Each column is itself a container holding any of its allowed inner block types (slate, image, …).

<fields templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-columns">

<block type="codeExample" slotId="schema">

### Schema

```javascript
{
  "columns": {
    "blockSchema": {
      "properties": {
        "title": {
          "title": "Title"
        },
        "columns": {
          "title": "Columns",
          "widget": "blocks_layout",
          "allowedBlocks": [
            "column"
          ],
          "maxLength": 4
        }
      }
    }
  },
  "column": {
    "blockSchema": {
      "properties": {
        "title": {
          "title": "Title"
        },
        "items": {
          "title": "Content",
          "widget": "blocks_layout",
          "allowedBlocks": [
            "slate",
            "image"
          ],
          "defaultBlockType": "slate"
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
  "@type": "columns",
  "title": "Our Services",
  "blocks": {
    "col-1": {
      "@type": "column",
      "title": "Design",
      "blocks": {
        "text-1": {
          "@type": "slate",
          "value": [
            {
              "type": "p",
              "children": [
                {
                  "text": "We craft beautiful interfaces."
                }
              ]
            }
          ]
        }
      },
      "blocks_layout": {
        "items": [
          "text-1"
        ]
      }
    },
    "col-2": {
      "@type": "column",
      "title": "Engineering",
      "blocks": {
        "text-2": {
          "@type": "slate",
          "value": [
            {
              "type": "p",
              "children": [
                {
                  "text": "We build robust systems."
                }
              ]
            }
          ]
        }
      },
      "blocks_layout": {
        "items": [
          "text-2"
        ]
      }
    }
  },
  "blocks_layout": {
    "columns": [
      "col-1",
      "col-2"
    ]
  }
}
```

</block>

<block type="codeExample" slotId="rendering">

### React

```{literalinclude} ../../../examples/examples/react/ColumnsBlock.jsx
:language: jsx
```

### Vue

```{literalinclude} ../../../examples/examples/vue/ColumnsBlock.vue
:language: vue
```

### Svelte

```{literalinclude} ../../../examples/examples/svelte/ColumnsBlock.svelte
:language: svelte
```

### Astro

```{literalinclude} ../../../examples/examples/astro/ColumnsBlock.astro
:language: astro
```

</block>

</fields>
