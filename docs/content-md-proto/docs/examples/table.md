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
blocks-matched: |
  <block type="slate" value="${p,h*,ul,ol,blockquote/slate}" />
  <block type="title" _="${h1}" />
  <block type="image" description="${p/text}" url="${img/src}" alt="${img/alt}" align="center" size="l" image_field="image" title="Image" />
  <block type="image" url="${img/src}" alt="${img/alt}" align="center" size="l" image_field="image" title="Image" />
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

# 

A table with rich text (Slate) content in each cell. Supports adding/removing rows and columns via toolbar actions.

<block type="image" url="/docs/images/table-edit" alt="The table example block being edited in Volto Hydra" align="center" size="l" />

<block type="heading" alignment="left" heading="Basic Table" tag="h2" data-json='{"styles":{}}' />

<block type="slateTable" table.celled table.fixed>

| Title Tablehead | Title Tablehead | Title Tablehead | Title Tablehead |
| --- | --- | --- | --- |
| Heading H2Heading H3Text can be **bold** or *italic* or a [Link](/docs/examples)&#x20; | Heading H2Heading H3Text can be **bold** or *italic* or a [Link](/docs/examples) | Heading H2Heading H3Text can be **bold** or *italic* or a [Link](/docs/examples) | Heading H2Heading H3Text can be **bold** or *italic* or a [Link](/docs/examples) |
| Heading H2Heading H3Text can be **bold** or *italic* or a [Link](/docs/examples) | Heading H2Heading H3Text can be **bold** or *italic* or a [Link](/docs/examples) | Heading H2Heading H3Text can be **bold** or *italic* or a [Link](/docs/examples) | Heading H2Heading H3Text can be **bold** or *italic* or a [Link](/docs/examples) |
| Heading H2Heading H3Text can be **bold** or *italic* or a [Link](/docs/examples) | Heading H2Heading H3Text can be **bold** or *italic* or a [Link](/docs/examples) | Heading H2Heading H3Text can be **bold** or *italic* or a [Link](/docs/examples) | Heading H2Heading H3Text can be **bold** or *italic* or a [Link](/docs/examples) |
| Heading H2Heading H3Text can be **bold** or *italic* or a [Link](/docs/examples) | Heading H2Heading H3Text can be **bold** or *italic* or a [Link](/docs/examples) | Heading H2Heading H3Text can be **bold** or *italic* or a [Link](/docs/examples) | Heading H2Heading H3Text can be **bold** or *italic* or a [Link](/docs/examples) |

</block>

<block type="heading" alignment="left" heading="Stripe alternating rows with colors" tag="h2" data-json='{"styles":{}}' />

<block type="slateTable" table.celled table.fixed table.striped>

| Title Tablehead | Title Tablehead | Title Tablehead | Title Tablehead |
| --- | --- | --- | --- |
| Heading H2Heading H3Text can be **bold** or *italic* or a [Link](/docs/examples)&#x20; | Heading H2Heading H3Text can be **bold** or *italic* or a [Link](/docs/examples) | Heading H2Heading H3Text can be **bold** or *italic* or a [Link](/docs/examples) | Heading H2Heading H3Text can be **bold** or *italic* or a [Link](/docs/examples) |
| Heading H2Heading H3Text can be **bold** or *italic* or a [Link](/docs/examples) | Heading H2Heading H3Text can be **bold** or *italic* or a [Link](/docs/examples) | Heading H2Heading H3Text can be **bold** or *italic* or a [Link](/docs/examples) | Heading H2Heading H3Text can be **bold** or *italic* or a [Link](/docs/examples) |
| Heading H2Heading H3Text can be **bold** or *italic* or a [Link](/docs/examples) | Heading H2Heading H3Text can be **bold** or *italic* or a [Link](/docs/examples) | Heading H2Heading H3Text can be **bold** or *italic* or a [Link](/docs/examples) | Heading H2Heading H3Text can be **bold** or *italic* or a [Link](/docs/examples) |
| Heading H2Heading H3Text can be **bold** or *italic* or a [Link](/docs/examples) | Heading H2Heading H3Text can be **bold** or *italic* or a [Link](/docs/examples) | Heading H2Heading H3Text can be **bold** or *italic* or a [Link](/docs/examples) | Heading H2Heading H3Text can be **bold** or *italic* or a [Link](/docs/examples) |

</block>

<block type="heading" alignment="left" heading="Basic Table" tag="h2" data-json='{"styles":{"backgroundColor":"grey"}}' />

<block type="slateTable" data-json='{"styles":{"backgroundColor":"grey"},"table":{"basic":false,"celled":true,"compact":false,"fixed":true,"hideHeaders":false,"inverted":false,"rows":[{"cells":[{"key":"0b0891c8-2616q","type":"header","value":[{"children":[{"text":"Title Tablehead"}],"type":"p"}]},{"key":"0b0891c8-9c5fm","type":"header","value":[{"children":[{"text":"Title Tablehead"}],"type":"p"}]},{"key":"0b0891c8-ljf3","type":"header","value":[{"children":[{"text":"Title Tablehead"}],"type":"p"}]},{"key":"0b0891c8-fgtdt","type":"header","value":[{"children":[{"text":"Title Tablehead"}],"type":"p"}]}],"key":"0b0891c8-36un"},{"cells":[{"key":"0b0891c8-flhhb","type":"data","value":[{"type":"p","children":[{"text":"Heading H2"},{"text":"Heading H3"},{"text":""},{"text":"Text can be "},{"children":[{"text":"bold"}],"type":"strong"},{"text":" or "},{"children":[{"text":"italic"}],"type":"em"},{"text":" or a "},{"children":[{"text":"Link"}],"data":{"url":"/docs/examples"},"type":"link"},{"text":" "}]}]},{"key":"0b0891c8-9biso","type":"data","value":[{"type":"p","children":[{"text":"Heading H2"},{"text":"Heading H3"},{"text":""},{"text":"Text can be "},{"children":[{"text":"bold"}],"type":"strong"},{"text":" or "},{"children":[{"text":"italic"}],"type":"em"},{"text":" or a "},{"children":[{"text":"Link"}],"data":{"url":"/docs/examples"},"type":"link"},{"text":""}]}]},{"key":"0b0891c8-56ea8","type":"data","value":[{"type":"p","children":[{"text":"Heading H2"},{"text":"Heading H3"},{"text":""},{"text":"Text can be "},{"children":[{"text":"bold"}],"type":"strong"},{"text":" or "},{"children":[{"text":"italic"}],"type":"em"},{"text":" or a "},{"children":[{"text":"Link"}],"data":{"url":"/docs/examples"},"type":"link"},{"text":""}]}]},{"key":"0b0891c8-47ahr","type":"data","value":[{"type":"p","children":[{"text":"Heading H2"},{"text":"Heading H3"},{"text":""},{"text":"Text can be "},{"children":[{"text":"bold"}],"type":"strong"},{"text":" or "},{"children":[{"text":"italic"}],"type":"em"},{"text":" or a "},{"children":[{"text":"Link"}],"data":{"url":"/docs/examples"},"type":"link"},{"text":""}]}]}],"key":"0b0891c8-6qrch"},{"cells":[{"key":"0b0891c8-21kbu","type":"data","value":[{"type":"p","children":[{"text":"Heading H2"},{"text":"Heading H3"},{"text":""},{"text":"Text can be "},{"children":[{"text":"bold"}],"type":"strong"},{"text":" or "},{"children":[{"text":"italic"}],"type":"em"},{"text":" or a "},{"children":[{"text":"Link"}],"data":{"url":"/docs/examples"},"type":"link"},{"text":""}]}]},{"key":"0b0891c8-1ph74","type":"data","value":[{"type":"p","children":[{"text":"Heading H2"},{"text":"Heading H3"},{"text":""},{"text":"Text can be "},{"children":[{"text":"bold"}],"type":"strong"},{"text":" or "},{"children":[{"text":"italic"}],"type":"em"},{"text":" or a "},{"children":[{"text":"Link"}],"data":{"url":"/docs/examples"},"type":"link"},{"text":""}]}]},{"key":"0b0891c8-5m4uq","type":"data","value":[{"type":"p","children":[{"text":"Heading H2"},{"text":"Heading H3"},{"text":""},{"text":"Text can be "},{"children":[{"text":"bold"}],"type":"strong"},{"text":" or "},{"children":[{"text":"italic"}],"type":"em"},{"text":" or a "},{"children":[{"text":"Link"}],"data":{"url":"/docs/examples"},"type":"link"},{"text":""}]}]},{"key":"0b0891c8-6474i","type":"data","value":[{"type":"p","children":[{"text":"Heading H2"},{"text":"Heading H3"},{"text":""},{"text":"Text can be "},{"children":[{"text":"bold"}],"type":"strong"},{"text":" or "},{"children":[{"text":"italic"}],"type":"em"},{"text":" or a "},{"children":[{"text":"Link"}],"data":{"url":"/docs/examples"},"type":"link"},{"text":""}]}]}],"key":"0b0891c8-7ujhi"},{"cells":[{"key":"0b0891c8-99oe4","type":"data","value":[{"type":"p","children":[{"text":"Heading H2"},{"text":"Heading H3"},{"text":""},{"text":"Text can be "},{"children":[{"text":"bold"}],"type":"strong"},{"text":" or "},{"children":[{"text":"italic"}],"type":"em"},{"text":" or a "},{"children":[{"text":"Link"}],"data":{"url":"/docs/examples"},"type":"link"},{"text":""}]}]},{"key":"0b0891c8-d896l","type":"data","value":[{"type":"p","children":[{"text":"Heading H2"},{"text":"Heading H3"},{"text":""},{"text":"Text can be "},{"children":[{"text":"bold"}],"type":"strong"},{"text":" or "},{"children":[{"text":"italic"}],"type":"em"},{"text":" or a "},{"children":[{"text":"Link"}],"data":{"url":"/docs/examples"},"type":"link"},{"text":""}]}]},{"key":"0b0891c8-ack6p","type":"data","value":[{"type":"p","children":[{"text":"Heading H2"},{"text":"Heading H3"},{"text":""},{"text":"Text can be "},{"children":[{"text":"bold"}],"type":"strong"},{"text":" or "},{"children":[{"text":"italic"}],"type":"em"},{"text":" or a "},{"children":[{"text":"Link"}],"data":{"url":"/docs/examples"},"type":"link"},{"text":""}]}]},{"key":"0b0891c8-fkour","type":"data","value":[{"type":"p","children":[{"text":"Heading H2"},{"text":"Heading H3"},{"text":""},{"text":"Text can be "},{"children":[{"text":"bold"}],"type":"strong"},{"text":" or "},{"children":[{"text":"italic"}],"type":"em"},{"text":" or a "},{"children":[{"text":"Link"}],"data":{"url":"/docs/examples"},"type":"link"},{"text":""}]}]}],"key":"0b0891c8-8f7ih"},{"cells":[{"key":"0b0891c8-cn6mu","type":"data","value":[{"type":"p","children":[{"text":"Heading H2"},{"text":"Heading H3"},{"text":""},{"text":"Text can be "},{"children":[{"text":"bold"}],"type":"strong"},{"text":" or "},{"children":[{"text":"italic"}],"type":"em"},{"text":" or a "},{"children":[{"text":"Link"}],"data":{"url":"/docs/examples"},"type":"link"},{"text":""}]}]},{"key":"0b0891c8-4t8ro","type":"data","value":[{"type":"p","children":[{"text":"Heading H2"},{"text":"Heading H3"},{"text":""},{"text":"Text can be "},{"children":[{"text":"bold"}],"type":"strong"},{"text":" or "},{"children":[{"text":"italic"}],"type":"em"},{"text":" or a "},{"children":[{"text":"Link"}],"data":{"url":"/docs/examples"},"type":"link"},{"text":""}]}]},{"key":"0b0891c8-72b6i","type":"data","value":[{"type":"p","children":[{"text":"Heading H2"},{"text":"Heading H3"},{"text":""},{"text":"Text can be "},{"children":[{"text":"bold"}],"type":"strong"},{"text":" or "},{"children":[{"text":"italic"}],"type":"em"},{"text":" or a "},{"children":[{"text":"Link"}],"data":{"url":"/docs/examples"},"type":"link"},{"text":""}]}]},{"key":"0b0891c8-5nchn","type":"data","value":[{"type":"p","children":[{"text":"Heading H2"},{"text":"Heading H3"},{"text":""},{"text":"Text can be "},{"children":[{"text":"bold"}],"type":"strong"},{"text":" or "},{"children":[{"text":"italic"}],"type":"em"},{"text":" or a "},{"children":[{"text":"Link"}],"data":{"url":"/docs/examples"},"type":"link"},{"text":""}]}]}],"key":"0b0891c8-bd5ru"}],"striped":false}}' />

<block type="heading" alignment="left" heading="Stripe alternating rows with colors" tag="h2" data-json='{"styles":{"backgroundColor":"grey"}}' />

<block type="slateTable" data-json='{"styles":{"backgroundColor":"grey"},"table":{"basic":false,"celled":true,"compact":false,"fixed":true,"hideHeaders":false,"inverted":false,"rows":[{"cells":[{"key":"4266731a-2616q","type":"header","value":[{"children":[{"text":"Title Tablehead"}],"type":"p"}]},{"key":"4266731a-9c5fm","type":"header","value":[{"children":[{"text":"Title Tablehead"}],"type":"p"}]},{"key":"4266731a-ljf3","type":"header","value":[{"children":[{"text":"Title Tablehead"}],"type":"p"}]},{"key":"4266731a-fgtdt","type":"header","value":[{"children":[{"text":"Title Tablehead"}],"type":"p"}]}],"key":"4266731a-36un"},{"cells":[{"key":"4266731a-flhhb","type":"data","value":[{"type":"p","children":[{"text":"Heading H2"},{"text":"Heading H3"},{"text":""},{"text":"Text can be "},{"children":[{"text":"bold"}],"type":"strong"},{"text":" or "},{"children":[{"text":"italic"}],"type":"em"},{"text":" or a "},{"children":[{"text":"Link"}],"data":{"url":"/docs/examples"},"type":"link"},{"text":" "}]}]},{"key":"4266731a-9biso","type":"data","value":[{"type":"p","children":[{"text":"Heading H2"},{"text":"Heading H3"},{"text":""},{"text":"Text can be "},{"children":[{"text":"bold"}],"type":"strong"},{"text":" or "},{"children":[{"text":"italic"}],"type":"em"},{"text":" or a "},{"children":[{"text":"Link"}],"data":{"url":"/docs/examples"},"type":"link"},{"text":""}]}]},{"key":"4266731a-56ea8","type":"data","value":[{"type":"p","children":[{"text":"Heading H2"},{"text":"Heading H3"},{"text":""},{"text":"Text can be "},{"children":[{"text":"bold"}],"type":"strong"},{"text":" or "},{"children":[{"text":"italic"}],"type":"em"},{"text":" or a "},{"children":[{"text":"Link"}],"data":{"url":"/docs/examples"},"type":"link"},{"text":""}]}]},{"key":"4266731a-47ahr","type":"data","value":[{"type":"p","children":[{"text":"Heading H2"},{"text":"Heading H3"},{"text":""},{"text":"Text can be "},{"children":[{"text":"bold"}],"type":"strong"},{"text":" or "},{"children":[{"text":"italic"}],"type":"em"},{"text":" or a "},{"children":[{"text":"Link"}],"data":{"url":"/docs/examples"},"type":"link"},{"text":""}]}]}],"key":"4266731a-6qrch"},{"cells":[{"key":"4266731a-21kbu","type":"data","value":[{"type":"p","children":[{"text":"Heading H2"},{"text":"Heading H3"},{"text":""},{"text":"Text can be "},{"children":[{"text":"bold"}],"type":"strong"},{"text":" or "},{"children":[{"text":"italic"}],"type":"em"},{"text":" or a "},{"children":[{"text":"Link"}],"data":{"url":"/docs/examples"},"type":"link"},{"text":""}]}]},{"key":"4266731a-1ph74","type":"data","value":[{"type":"p","children":[{"text":"Heading H2"},{"text":"Heading H3"},{"text":""},{"text":"Text can be "},{"children":[{"text":"bold"}],"type":"strong"},{"text":" or "},{"children":[{"text":"italic"}],"type":"em"},{"text":" or a "},{"children":[{"text":"Link"}],"data":{"url":"/docs/examples"},"type":"link"},{"text":""}]}]},{"key":"4266731a-5m4uq","type":"data","value":[{"type":"p","children":[{"text":"Heading H2"},{"text":"Heading H3"},{"text":""},{"text":"Text can be "},{"children":[{"text":"bold"}],"type":"strong"},{"text":" or "},{"children":[{"text":"italic"}],"type":"em"},{"text":" or a "},{"children":[{"text":"Link"}],"data":{"url":"/docs/examples"},"type":"link"},{"text":""}]}]},{"key":"4266731a-6474i","type":"data","value":[{"type":"p","children":[{"text":"Heading H2"},{"text":"Heading H3"},{"text":""},{"text":"Text can be "},{"children":[{"text":"bold"}],"type":"strong"},{"text":" or "},{"children":[{"text":"italic"}],"type":"em"},{"text":" or a "},{"children":[{"text":"Link"}],"data":{"url":"/docs/examples"},"type":"link"},{"text":""}]}]}],"key":"4266731a-7ujhi"},{"cells":[{"key":"4266731a-99oe4","type":"data","value":[{"type":"p","children":[{"text":"Heading H2"},{"text":"Heading H3"},{"text":""},{"text":"Text can be "},{"children":[{"text":"bold"}],"type":"strong"},{"text":" or "},{"children":[{"text":"italic"}],"type":"em"},{"text":" or a "},{"children":[{"text":"Link"}],"data":{"url":"/docs/examples"},"type":"link"},{"text":""}]}]},{"key":"4266731a-d896l","type":"data","value":[{"type":"p","children":[{"text":"Heading H2"},{"text":"Heading H3"},{"text":""},{"text":"Text can be "},{"children":[{"text":"bold"}],"type":"strong"},{"text":" or "},{"children":[{"text":"italic"}],"type":"em"},{"text":" or a "},{"children":[{"text":"Link"}],"data":{"url":"/docs/examples"},"type":"link"},{"text":""}]}]},{"key":"4266731a-ack6p","type":"data","value":[{"type":"p","children":[{"text":"Heading H2"},{"text":"Heading H3"},{"text":""},{"text":"Text can be "},{"children":[{"text":"bold"}],"type":"strong"},{"text":" or "},{"children":[{"text":"italic"}],"type":"em"},{"text":" or a "},{"children":[{"text":"Link"}],"data":{"url":"/docs/examples"},"type":"link"},{"text":""}]}]},{"key":"4266731a-fkour","type":"data","value":[{"type":"p","children":[{"text":"Heading H2"},{"text":"Heading H3"},{"text":""},{"text":"Text can be "},{"children":[{"text":"bold"}],"type":"strong"},{"text":" or "},{"children":[{"text":"italic"}],"type":"em"},{"text":" or a "},{"children":[{"text":"Link"}],"data":{"url":"/docs/examples"},"type":"link"},{"text":""}]}]}],"key":"4266731a-8f7ih"},{"cells":[{"key":"4266731a-cn6mu","type":"data","value":[{"type":"p","children":[{"text":"Heading H2"},{"text":"Heading H3"},{"text":""},{"text":"Text can be "},{"children":[{"text":"bold"}],"type":"strong"},{"text":" or "},{"children":[{"text":"italic"}],"type":"em"},{"text":" or a "},{"children":[{"text":"Link"}],"data":{"url":"/docs/examples"},"type":"link"},{"text":""}]}]},{"key":"4266731a-4t8ro","type":"data","value":[{"type":"p","children":[{"text":"Heading H2"},{"text":"Heading H3"},{"text":""},{"text":"Text can be "},{"children":[{"text":"bold"}],"type":"strong"},{"text":" or "},{"children":[{"text":"italic"}],"type":"em"},{"text":" or a "},{"children":[{"text":"Link"}],"data":{"url":"/docs/examples"},"type":"link"},{"text":""}]}]},{"key":"4266731a-72b6i","type":"data","value":[{"type":"p","children":[{"text":"Heading H2"},{"text":"Heading H3"},{"text":""},{"text":"Text can be "},{"children":[{"text":"bold"}],"type":"strong"},{"text":" or "},{"children":[{"text":"italic"}],"type":"em"},{"text":" or a "},{"children":[{"text":"Link"}],"data":{"url":"/docs/examples"},"type":"link"},{"text":""}]}]},{"key":"4266731a-5nchn","type":"data","value":[{"type":"p","children":[{"text":"Heading H2"},{"text":"Heading H3"},{"text":""},{"text":"Text can be "},{"children":[{"text":"bold"}],"type":"strong"},{"text":" or "},{"children":[{"text":"italic"}],"type":"em"},{"text":" or a "},{"children":[{"text":"Link"}],"data":{"url":"/docs/examples"},"type":"link"},{"text":""}]}]}],"key":"4266731a-bd5ru"}],"striped":true}}' />

<block type="codeExample" templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-table" slotId="schema">

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

<block type="codeExample" templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-table" slotId="json-data">

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

<block type="codeExample" templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-table" slotId="rendering">

### React

```jsx
function TableBlock({ block }) {
  const rows = block.table?.rows || [];
  return (
    <div data-block-uid={block['@uid']}>
      <table>
        <tbody>
          {rows.map(row => (
            <tr key={row.key} data-block-uid={row.key}>
              {row.cells.map(cell => (
                <td key={cell.key} data-block-uid={cell.key} data-edit-text="value">
                  {(cell.value || []).map((node, i) => (
                    <SlateNode key={i} node={node} />
                  ))}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

### Vue

```vue
<template>
  <div :data-block-uid="block['@uid']">
    <table>
      <tbody>
        <tr v-for="row in block.table?.rows || []" :key="row.key" :data-block-uid="row.key">
          <td v-for="cell in row.cells" :key="cell.key" :data-block-uid="cell.key" data-edit-text="value">
            <SlateNode v-for="(node, i) in cell.value || []" :key="i" :node="node" />
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup>
defineProps({ block: Object });
</script>
```

### Svelte

```svelte
<script>
  import SlateNode from './SlateNode.svelte';
  export let block;
</script>

<div data-block-uid={block['@uid']}>
  <table>
    <tbody>
      {#each block.table?.rows || [] as row (row.key)}
        <tr data-block-uid={row.key}>
          {#each row.cells as cell (cell.key)}
            <td data-block-uid={cell.key} data-edit-text="value">
              {#each cell.value || [] as node, i (i)}
                <SlateNode {node} />
              {/each}
            </td>
          {/each}
        </tr>
      {/each}
    </tbody>
  </table>
</div>
```

</block>
