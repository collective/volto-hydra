---
"@type": Document
UID: 102f648399914851951ffa3fefc8665c
allow_discussion: false
contributors: []
creators:
  - admin
description: The Table block allows you to add a table to a page.
effective: 2023-07-06T18:35:00
exclude_from_nav: false
expires: null
id: table
is_folderish: true
language: "##DEFAULT##"
layout: document_view
preview_caption: null
preview_image:
  blob_path: docs/examples/table/preview_image/black-starry-night.jpg
  content-type: image/jpeg
  filename: black-starry-night.jpg
  height: 1708
  size: 693013
  width: 2400
review_state: published
rights: ""
subjects:
  - blocks
title: Table
blocks-assignments:
  - { uid: fb451586-3dab-4b40-a5f8-f73056685165 }
  - { uid: ref-table-description }
  - { uid: editor-screenshot }
  - { uid: ff4fd61a-f5eb-4733-a883-816985c44348 }
  - { uid: 0d727fc0-71c0-4e2c-918a-35b726636569 }
  - { uid: 7aafc602-902a-4d21-bf63-2e7c5c8d4839 }
  - { uid: 4a5779a4-fda5-431c-80e5-3c789375ce10 }
  - { uid: 10566683-a8b2-4b47-b64b-b01ddf43c307 }
  - { uid: 0b0891c8-812e-41ca-b572-b7851361025f }
  - { uid: aa800193-7bf4-4f54-9bb6-a6c5b4e02b81 }
  - { uid: 4266731a-e721-4f2f-95de-c7c3e885677b }
  - { uid: ref-table-schema }
  - { id: ref-table-schema-javascript-237d52 }
  - { uid: ref-table-json-data }
  - { id: ref-table-json-data-json-472dd4 }
  - { uid: ref-table-rendering }
  - { id: ref-table-rendering-jsx-ee1611 }
  - { id: ref-table-rendering-vue-570ccb }
  - { id: ref-table-rendering-svelte-de27fc }
  - { id: ref-table-rendering-astro-a34e40 }
blocks-matched: |
  <block type="slate" value="${p,h*,ul,ol,blockquote/slate}" />
  <block type="title" _="${h1}" />
  <block type="image" description="${p?/text}" url="${img/src}" alt="${img?/alt}" title="${img?/title}" align="center" size="l" />
  <block type="image" url="${img/src}" alt="${img?/alt}" title="${img?/title}" align="center" size="l" />
  <block type="codeExample">
    <region name="tabs" widget="object_list">
      <block type="tab" label="${h3/text}" language="${pre/lang}" code="${pre/text}" />
    </region>
  </block>
blocks-tagged: |
  <block type="slateTable">
    <region name="table.rows">
      <block type="row">
        <region name="cells">
          <block type="cell" value="${td/slate}" />
        </region>
      </block>
    </region>
  </block>
---

# Table

A table with rich text (Slate) content in each cell. Supports adding/removing rows and columns via toolbar actions.

<block type="image">

![The table example block being edited in Volto Hydra](/docs/images/table-edit)

</block>

<block type="heading" alignment="left" heading="Basic Table" tag="h2" />

<block type="slateTable" table.celled table.fixed>

| Title Tablehead | Title Tablehead | Title Tablehead | Title Tablehead |
| --- | --- | --- | --- |
| Heading H2Heading H3Text can be **bold** or *italic* or a [Link](/docs/examples)&#x20; | Heading H2Heading H3Text can be **bold** or *italic* or a [Link](/docs/examples) | Heading H2Heading H3Text can be **bold** or *italic* or a [Link](/docs/examples) | Heading H2Heading H3Text can be **bold** or *italic* or a [Link](/docs/examples) |
| Heading H2Heading H3Text can be **bold** or *italic* or a [Link](/docs/examples) | Heading H2Heading H3Text can be **bold** or *italic* or a [Link](/docs/examples) | Heading H2Heading H3Text can be **bold** or *italic* or a [Link](/docs/examples) | Heading H2Heading H3Text can be **bold** or *italic* or a [Link](/docs/examples) |
| Heading H2Heading H3Text can be **bold** or *italic* or a [Link](/docs/examples) | Heading H2Heading H3Text can be **bold** or *italic* or a [Link](/docs/examples) | Heading H2Heading H3Text can be **bold** or *italic* or a [Link](/docs/examples) | Heading H2Heading H3Text can be **bold** or *italic* or a [Link](/docs/examples) |
| Heading H2Heading H3Text can be **bold** or *italic* or a [Link](/docs/examples) | Heading H2Heading H3Text can be **bold** or *italic* or a [Link](/docs/examples) | Heading H2Heading H3Text can be **bold** or *italic* or a [Link](/docs/examples) | Heading H2Heading H3Text can be **bold** or *italic* or a [Link](/docs/examples) |

</block>

<block type="heading" alignment="left" heading="Stripe alternating rows with colors" tag="h2" />

<block type="slateTable" table.celled table.fixed table.striped>

| Title Tablehead | Title Tablehead | Title Tablehead | Title Tablehead |
| --- | --- | --- | --- |
| Heading H2Heading H3Text can be **bold** or *italic* or a [Link](/docs/examples)&#x20; | Heading H2Heading H3Text can be **bold** or *italic* or a [Link](/docs/examples) | Heading H2Heading H3Text can be **bold** or *italic* or a [Link](/docs/examples) | Heading H2Heading H3Text can be **bold** or *italic* or a [Link](/docs/examples) |
| Heading H2Heading H3Text can be **bold** or *italic* or a [Link](/docs/examples) | Heading H2Heading H3Text can be **bold** or *italic* or a [Link](/docs/examples) | Heading H2Heading H3Text can be **bold** or *italic* or a [Link](/docs/examples) | Heading H2Heading H3Text can be **bold** or *italic* or a [Link](/docs/examples) |
| Heading H2Heading H3Text can be **bold** or *italic* or a [Link](/docs/examples) | Heading H2Heading H3Text can be **bold** or *italic* or a [Link](/docs/examples) | Heading H2Heading H3Text can be **bold** or *italic* or a [Link](/docs/examples) | Heading H2Heading H3Text can be **bold** or *italic* or a [Link](/docs/examples) |
| Heading H2Heading H3Text can be **bold** or *italic* or a [Link](/docs/examples) | Heading H2Heading H3Text can be **bold** or *italic* or a [Link](/docs/examples) | Heading H2Heading H3Text can be **bold** or *italic* or a [Link](/docs/examples) | Heading H2Heading H3Text can be **bold** or *italic* or a [Link](/docs/examples) |

</block>

<fields data-json='{"styles":{"backgroundColor":"grey"}}'>

<block type="heading" alignment="left" heading="Basic Table" tag="h2" />

<block type="slateTable" table.celled table.fixed>

| Title Tablehead | Title Tablehead | Title Tablehead | Title Tablehead |
| --- | --- | --- | --- |
| Heading H2Heading H3Text can be **bold** or *italic* or a [Link](/docs/examples)&#x20; | Heading H2Heading H3Text can be **bold** or *italic* or a [Link](/docs/examples) | Heading H2Heading H3Text can be **bold** or *italic* or a [Link](/docs/examples) | Heading H2Heading H3Text can be **bold** or *italic* or a [Link](/docs/examples) |
| Heading H2Heading H3Text can be **bold** or *italic* or a [Link](/docs/examples) | Heading H2Heading H3Text can be **bold** or *italic* or a [Link](/docs/examples) | Heading H2Heading H3Text can be **bold** or *italic* or a [Link](/docs/examples) | Heading H2Heading H3Text can be **bold** or *italic* or a [Link](/docs/examples) |
| Heading H2Heading H3Text can be **bold** or *italic* or a [Link](/docs/examples) | Heading H2Heading H3Text can be **bold** or *italic* or a [Link](/docs/examples) | Heading H2Heading H3Text can be **bold** or *italic* or a [Link](/docs/examples) | Heading H2Heading H3Text can be **bold** or *italic* or a [Link](/docs/examples) |
| Heading H2Heading H3Text can be **bold** or *italic* or a [Link](/docs/examples) | Heading H2Heading H3Text can be **bold** or *italic* or a [Link](/docs/examples) | Heading H2Heading H3Text can be **bold** or *italic* or a [Link](/docs/examples) | Heading H2Heading H3Text can be **bold** or *italic* or a [Link](/docs/examples) |

</block>

<block type="heading" alignment="left" heading="Stripe alternating rows with colors" tag="h2" />

<block type="slateTable" table.celled table.fixed table.striped>

| Title Tablehead | Title Tablehead | Title Tablehead | Title Tablehead |
| --- | --- | --- | --- |
| Heading H2Heading H3Text can be **bold** or *italic* or a [Link](/docs/examples)&#x20; | Heading H2Heading H3Text can be **bold** or *italic* or a [Link](/docs/examples) | Heading H2Heading H3Text can be **bold** or *italic* or a [Link](/docs/examples) | Heading H2Heading H3Text can be **bold** or *italic* or a [Link](/docs/examples) |
| Heading H2Heading H3Text can be **bold** or *italic* or a [Link](/docs/examples) | Heading H2Heading H3Text can be **bold** or *italic* or a [Link](/docs/examples) | Heading H2Heading H3Text can be **bold** or *italic* or a [Link](/docs/examples) | Heading H2Heading H3Text can be **bold** or *italic* or a [Link](/docs/examples) |
| Heading H2Heading H3Text can be **bold** or *italic* or a [Link](/docs/examples) | Heading H2Heading H3Text can be **bold** or *italic* or a [Link](/docs/examples) | Heading H2Heading H3Text can be **bold** or *italic* or a [Link](/docs/examples) | Heading H2Heading H3Text can be **bold** or *italic* or a [Link](/docs/examples) |
| Heading H2Heading H3Text can be **bold** or *italic* or a [Link](/docs/examples) | Heading H2Heading H3Text can be **bold** or *italic* or a [Link](/docs/examples) | Heading H2Heading H3Text can be **bold** or *italic* or a [Link](/docs/examples) | Heading H2Heading H3Text can be **bold** or *italic* or a [Link](/docs/examples) |

</block>

</fields>

<fields templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-table">

<block type="codeExample" slotId="schema">

### Schema

```javascript
{
  "slateTable": {
    "addMode": "table",
    "blockSchema": {
      "properties": {
        "table": {
          "title": "Table",
          "widget": "object",
          "schema": {
            "properties": {
              "rows": {
                "widget": "object_list",
                "idField": "key",
                "addMode": "table",
                "schema": {
                  "properties": {
                    "cells": {
                      "widget": "object_list",
                      "idField": "key",
                      "schema": {
                        "properties": {
                          "value": {
                            "widget": "slate"
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
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
  "@type": "slateTable",
  "table": {
    "rows": [
      {
        "key": "row-1",
        "cells": [
          {
            "key": "cell-1",
            "value": [
              {
                "type": "p",
                "children": [
                  {
                    "text": "Name"
                  }
                ]
              }
            ]
          },
          {
            "key": "cell-2",
            "value": [
              {
                "type": "p",
                "children": [
                  {
                    "text": "Role"
                  }
                ]
              }
            ]
          }
        ]
      },
      {
        "key": "row-2",
        "cells": [
          {
            "key": "cell-3",
            "value": [
              {
                "type": "p",
                "children": [
                  {
                    "text": "Alice"
                  }
                ]
              }
            ]
          },
          {
            "key": "cell-4",
            "value": [
              {
                "type": "p",
                "children": [
                  {
                    "text": "Engineer"
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
  }
}
```

</block>

<block type="codeExample" slotId="rendering">

### React

```{literalinclude} ../../../examples/examples/react/TableBlock.jsx
:language: jsx
```

### Vue

```{literalinclude} ../../../examples/examples/vue/TableBlock.vue
:language: vue
```

### Svelte

```{literalinclude} ../../../examples/examples/svelte/TableBlock.svelte
:language: svelte
```

### Astro

```{literalinclude} ../../../examples/examples/astro/TableBlock.astro
:language: astro
```

</block>

</fields>
