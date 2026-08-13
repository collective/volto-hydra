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
blocks:
  - fb451586-3dab-4b40-a5f8-f73056685165: title
  - ref-table-description: slate
  - editor-screenshot: image
  - ff4fd61a-f5eb-4733-a883-816985c44348: heading
  - 0d727fc0-71c0-4e2c-918a-35b726636569: slateTable
  - 7aafc602-902a-4d21-bf63-2e7c5c8d4839: heading
  - 4a5779a4-fda5-431c-80e5-3c789375ce10: slateTable
  - 10566683-a8b2-4b47-b64b-b01ddf43c307: heading
  - 0b0891c8-812e-41ca-b572-b7851361025f: slateTable
  - aa800193-7bf4-4f54-9bb6-a6c5b4e02b81: heading
  - 4266731a-e721-4f2f-95de-c7c3e885677b: slateTable
  - ref-table-schema: codeExample
  - ref-table-json-data: codeExample
  - ref-table-rendering: codeExample
---

<block type="title" uid="fb451586-3dab-4b40-a5f8-f73056685165" />

A table with rich text (Slate) content in each cell. Supports adding/removing rows and columns via toolbar actions.

<block type="image" uid="editor-screenshot" align="center" size="l" url="${src}" alt="${alt}">

![The table example block being edited in Volto Hydra](/docs/images/table-edit)

</block>

<block type="heading" uid="ff4fd61a-f5eb-4733-a883-816985c44348" alignment="left" heading="${text}" tag="h${level}" data='{"styles":{}}'>

## Basic Table

</block>

<block type="slateTable" uid="0d727fc0-71c0-4e2c-918a-35b726636569" data='{"styles":{},"table":{"basic":false,"celled":true,"compact":false,"fixed":true,"hideHeaders":false,"inverted":false,"rows":[{"cells":[{"key":"0d727fc0-2616q","type":"header","value":[{"children":[{"text":"Title Tablehead"}],"type":"p"}]},{"key":"0d727fc0-9c5fm","type":"header","value":[{"children":[{"text":"Title Tablehead"}],"type":"p"}]},{"key":"0d727fc0-ljf3","type":"header","value":[{"children":[{"text":"Title Tablehead"}],"type":"p"}]},{"key":"0d727fc0-fgtdt","type":"header","value":[{"children":[{"text":"Title Tablehead"}],"type":"p"}]}],"key":"0d727fc0-36un"},{"cells":[{"key":"0d727fc0-flhhb","type":"data","value":[{"type":"p","children":[{"text":"Heading H2"},{"text":"Heading H3"},{"text":""},{"text":"Text can be "},{"children":[{"text":"bold"}],"type":"strong"},{"text":" or "},{"children":[{"text":"italic"}],"type":"em"},{"text":" or a "},{"children":[{"text":"Link"}],"data":{"url":"/docs/examples"},"type":"link"},{"text":" "}]}]},{"key":"0d727fc0-9biso","type":"data","value":[{"type":"p","children":[{"text":"Heading H2"},{"text":"Heading H3"},{"text":""},{"text":"Text can be "},{"children":[{"text":"bold"}],"type":"strong"},{"text":" or "},{"children":[{"text":"italic"}],"type":"em"},{"text":" or a "},{"children":[{"text":"Link"}],"data":{"url":"/docs/examples"},"type":"link"},{"text":""}]}]},{"key":"0d727fc0-56ea8","type":"data","value":[{"type":"p","children":[{"text":"Heading H2"},{"text":"Heading H3"},{"text":""},{"text":"Text can be "},{"children":[{"text":"bold"}],"type":"strong"},{"text":" or "},{"children":[{"text":"italic"}],"type":"em"},{"text":" or a "},{"children":[{"text":"Link"}],"data":{"url":"/docs/examples"},"type":"link"},{"text":""}]}]},{"key":"0d727fc0-47ahr","type":"data","value":[{"type":"p","children":[{"text":"Heading H2"},{"text":"Heading H3"},{"text":""},{"text":"Text can be "},{"children":[{"text":"bold"}],"type":"strong"},{"text":" or "},{"children":[{"text":"italic"}],"type":"em"},{"text":" or a "},{"children":[{"text":"Link"}],"data":{"url":"/docs/examples"},"type":"link"},{"text":""}]}]}],"key":"0d727fc0-6qrch"},{"cells":[{"key":"0d727fc0-21kbu","type":"data","value":[{"type":"p","children":[{"text":"Heading H2"},{"text":"Heading H3"},{"text":""},{"text":"Text can be "},{"children":[{"text":"bold"}],"type":"strong"},{"text":" or "},{"children":[{"text":"italic"}],"type":"em"},{"text":" or a "},{"children":[{"text":"Link"}],"data":{"url":"/docs/examples"},"type":"link"},{"text":""}]}]},{"key":"0d727fc0-1ph74","type":"data","value":[{"type":"p","children":[{"text":"Heading H2"},{"text":"Heading H3"},{"text":""},{"text":"Text can be "},{"children":[{"text":"bold"}],"type":"strong"},{"text":" or "},{"children":[{"text":"italic"}],"type":"em"},{"text":" or a "},{"children":[{"text":"Link"}],"data":{"url":"/docs/examples"},"type":"link"},{"text":""}]}]},{"key":"0d727fc0-5m4uq","type":"data","value":[{"type":"p","children":[{"text":"Heading H2"},{"text":"Heading H3"},{"text":""},{"text":"Text can be "},{"children":[{"text":"bold"}],"type":"strong"},{"text":" or "},{"children":[{"text":"italic"}],"type":"em"},{"text":" or a "},{"children":[{"text":"Link"}],"data":{"url":"/docs/examples"},"type":"link"},{"text":""}]}]},{"key":"0d727fc0-6474i","type":"data","value":[{"type":"p","children":[{"text":"Heading H2"},{"text":"Heading H3"},{"text":""},{"text":"Text can be "},{"children":[{"text":"bold"}],"type":"strong"},{"text":" or "},{"children":[{"text":"italic"}],"type":"em"},{"text":" or a "},{"children":[{"text":"Link"}],"data":{"url":"/docs/examples"},"type":"link"},{"text":""}]}]}],"key":"0d727fc0-7ujhi"},{"cells":[{"key":"0d727fc0-99oe4","type":"data","value":[{"type":"p","children":[{"text":"Heading H2"},{"text":"Heading H3"},{"text":""},{"text":"Text can be "},{"children":[{"text":"bold"}],"type":"strong"},{"text":" or "},{"children":[{"text":"italic"}],"type":"em"},{"text":" or a "},{"children":[{"text":"Link"}],"data":{"url":"/docs/examples"},"type":"link"},{"text":""}]}]},{"key":"0d727fc0-d896l","type":"data","value":[{"type":"p","children":[{"text":"Heading H2"},{"text":"Heading H3"},{"text":""},{"text":"Text can be "},{"children":[{"text":"bold"}],"type":"strong"},{"text":" or "},{"children":[{"text":"italic"}],"type":"em"},{"text":" or a "},{"children":[{"text":"Link"}],"data":{"url":"/docs/examples"},"type":"link"},{"text":""}]}]},{"key":"0d727fc0-ack6p","type":"data","value":[{"type":"p","children":[{"text":"Heading H2"},{"text":"Heading H3"},{"text":""},{"text":"Text can be "},{"children":[{"text":"bold"}],"type":"strong"},{"text":" or "},{"children":[{"text":"italic"}],"type":"em"},{"text":" or a "},{"children":[{"text":"Link"}],"data":{"url":"/docs/examples"},"type":"link"},{"text":""}]}]},{"key":"0d727fc0-fkour","type":"data","value":[{"type":"p","children":[{"text":"Heading H2"},{"text":"Heading H3"},{"text":""},{"text":"Text can be "},{"children":[{"text":"bold"}],"type":"strong"},{"text":" or "},{"children":[{"text":"italic"}],"type":"em"},{"text":" or a "},{"children":[{"text":"Link"}],"data":{"url":"/docs/examples"},"type":"link"},{"text":""}]}]}],"key":"0d727fc0-8f7ih"},{"cells":[{"key":"0d727fc0-cn6mu","type":"data","value":[{"type":"p","children":[{"text":"Heading H2"},{"text":"Heading H3"},{"text":""},{"text":"Text can be "},{"children":[{"text":"bold"}],"type":"strong"},{"text":" or "},{"children":[{"text":"italic"}],"type":"em"},{"text":" or a "},{"children":[{"text":"Link"}],"data":{"url":"/docs/examples"},"type":"link"},{"text":""}]}]},{"key":"0d727fc0-4t8ro","type":"data","value":[{"type":"p","children":[{"text":"Heading H2"},{"text":"Heading H3"},{"text":""},{"text":"Text can be "},{"children":[{"text":"bold"}],"type":"strong"},{"text":" or "},{"children":[{"text":"italic"}],"type":"em"},{"text":" or a "},{"children":[{"text":"Link"}],"data":{"url":"/docs/examples"},"type":"link"},{"text":""}]}]},{"key":"0d727fc0-72b6i","type":"data","value":[{"type":"p","children":[{"text":"Heading H2"},{"text":"Heading H3"},{"text":""},{"text":"Text can be "},{"children":[{"text":"bold"}],"type":"strong"},{"text":" or "},{"children":[{"text":"italic"}],"type":"em"},{"text":" or a "},{"children":[{"text":"Link"}],"data":{"url":"/docs/examples"},"type":"link"},{"text":""}]}]},{"key":"0d727fc0-5nchn","type":"data","value":[{"type":"p","children":[{"text":"Heading H2"},{"text":"Heading H3"},{"text":""},{"text":"Text can be "},{"children":[{"text":"bold"}],"type":"strong"},{"text":" or "},{"children":[{"text":"italic"}],"type":"em"},{"text":" or a "},{"children":[{"text":"Link"}],"data":{"url":"/docs/examples"},"type":"link"},{"text":""}]}]}],"key":"0d727fc0-bd5ru"}],"striped":false}}' />

<block type="heading" uid="7aafc602-902a-4d21-bf63-2e7c5c8d4839" alignment="left" heading="${text}" tag="h${level}" data='{"styles":{}}'>

## Stripe alternating rows with colors

</block>

<block type="slateTable" uid="4a5779a4-fda5-431c-80e5-3c789375ce10" data='{"styles":{},"table":{"basic":false,"celled":true,"compact":false,"fixed":true,"hideHeaders":false,"inverted":false,"rows":[{"cells":[{"key":"4a5779a4-2616q","type":"header","value":[{"children":[{"text":"Title Tablehead"}],"type":"p"}]},{"key":"4a5779a4-9c5fm","type":"header","value":[{"children":[{"text":"Title Tablehead"}],"type":"p"}]},{"key":"4a5779a4-ljf3","type":"header","value":[{"children":[{"text":"Title Tablehead"}],"type":"p"}]},{"key":"4a5779a4-fgtdt","type":"header","value":[{"children":[{"text":"Title Tablehead"}],"type":"p"}]}],"key":"4a5779a4-36un"},{"cells":[{"key":"4a5779a4-flhhb","type":"data","value":[{"type":"p","children":[{"text":"Heading H2"},{"text":"Heading H3"},{"text":""},{"text":"Text can be "},{"children":[{"text":"bold"}],"type":"strong"},{"text":" or "},{"children":[{"text":"italic"}],"type":"em"},{"text":" or a "},{"children":[{"text":"Link"}],"data":{"url":"/docs/examples"},"type":"link"},{"text":" "}]}]},{"key":"4a5779a4-9biso","type":"data","value":[{"type":"p","children":[{"text":"Heading H2"},{"text":"Heading H3"},{"text":""},{"text":"Text can be "},{"children":[{"text":"bold"}],"type":"strong"},{"text":" or "},{"children":[{"text":"italic"}],"type":"em"},{"text":" or a "},{"children":[{"text":"Link"}],"data":{"url":"/docs/examples"},"type":"link"},{"text":""}]}]},{"key":"4a5779a4-56ea8","type":"data","value":[{"type":"p","children":[{"text":"Heading H2"},{"text":"Heading H3"},{"text":""},{"text":"Text can be "},{"children":[{"text":"bold"}],"type":"strong"},{"text":" or "},{"children":[{"text":"italic"}],"type":"em"},{"text":" or a "},{"children":[{"text":"Link"}],"data":{"url":"/docs/examples"},"type":"link"},{"text":""}]}]},{"key":"4a5779a4-47ahr","type":"data","value":[{"type":"p","children":[{"text":"Heading H2"},{"text":"Heading H3"},{"text":""},{"text":"Text can be "},{"children":[{"text":"bold"}],"type":"strong"},{"text":" or "},{"children":[{"text":"italic"}],"type":"em"},{"text":" or a "},{"children":[{"text":"Link"}],"data":{"url":"/docs/examples"},"type":"link"},{"text":""}]}]}],"key":"4a5779a4-6qrch"},{"cells":[{"key":"4a5779a4-21kbu","type":"data","value":[{"type":"p","children":[{"text":"Heading H2"},{"text":"Heading H3"},{"text":""},{"text":"Text can be "},{"children":[{"text":"bold"}],"type":"strong"},{"text":" or "},{"children":[{"text":"italic"}],"type":"em"},{"text":" or a "},{"children":[{"text":"Link"}],"data":{"url":"/docs/examples"},"type":"link"},{"text":""}]}]},{"key":"4a5779a4-1ph74","type":"data","value":[{"type":"p","children":[{"text":"Heading H2"},{"text":"Heading H3"},{"text":""},{"text":"Text can be "},{"children":[{"text":"bold"}],"type":"strong"},{"text":" or "},{"children":[{"text":"italic"}],"type":"em"},{"text":" or a "},{"children":[{"text":"Link"}],"data":{"url":"/docs/examples"},"type":"link"},{"text":""}]}]},{"key":"4a5779a4-5m4uq","type":"data","value":[{"type":"p","children":[{"text":"Heading H2"},{"text":"Heading H3"},{"text":""},{"text":"Text can be "},{"children":[{"text":"bold"}],"type":"strong"},{"text":" or "},{"children":[{"text":"italic"}],"type":"em"},{"text":" or a "},{"children":[{"text":"Link"}],"data":{"url":"/docs/examples"},"type":"link"},{"text":""}]}]},{"key":"4a5779a4-6474i","type":"data","value":[{"type":"p","children":[{"text":"Heading H2"},{"text":"Heading H3"},{"text":""},{"text":"Text can be "},{"children":[{"text":"bold"}],"type":"strong"},{"text":" or "},{"children":[{"text":"italic"}],"type":"em"},{"text":" or a "},{"children":[{"text":"Link"}],"data":{"url":"/docs/examples"},"type":"link"},{"text":""}]}]}],"key":"4a5779a4-7ujhi"},{"cells":[{"key":"4a5779a4-99oe4","type":"data","value":[{"type":"p","children":[{"text":"Heading H2"},{"text":"Heading H3"},{"text":""},{"text":"Text can be "},{"children":[{"text":"bold"}],"type":"strong"},{"text":" or "},{"children":[{"text":"italic"}],"type":"em"},{"text":" or a "},{"children":[{"text":"Link"}],"data":{"url":"/docs/examples"},"type":"link"},{"text":""}]}]},{"key":"4a5779a4-d896l","type":"data","value":[{"type":"p","children":[{"text":"Heading H2"},{"text":"Heading H3"},{"text":""},{"text":"Text can be "},{"children":[{"text":"bold"}],"type":"strong"},{"text":" or "},{"children":[{"text":"italic"}],"type":"em"},{"text":" or a "},{"children":[{"text":"Link"}],"data":{"url":"/docs/examples"},"type":"link"},{"text":""}]}]},{"key":"4a5779a4-ack6p","type":"data","value":[{"type":"p","children":[{"text":"Heading H2"},{"text":"Heading H3"},{"text":""},{"text":"Text can be "},{"children":[{"text":"bold"}],"type":"strong"},{"text":" or "},{"children":[{"text":"italic"}],"type":"em"},{"text":" or a "},{"children":[{"text":"Link"}],"data":{"url":"/docs/examples"},"type":"link"},{"text":""}]}]},{"key":"4a5779a4-fkour","type":"data","value":[{"type":"p","children":[{"text":"Heading H2"},{"text":"Heading H3"},{"text":""},{"text":"Text can be "},{"children":[{"text":"bold"}],"type":"strong"},{"text":" or "},{"children":[{"text":"italic"}],"type":"em"},{"text":" or a "},{"children":[{"text":"Link"}],"data":{"url":"/docs/examples"},"type":"link"},{"text":""}]}]}],"key":"4a5779a4-8f7ih"},{"cells":[{"key":"4a5779a4-cn6mu","type":"data","value":[{"type":"p","children":[{"text":"Heading H2"},{"text":"Heading H3"},{"text":""},{"text":"Text can be "},{"children":[{"text":"bold"}],"type":"strong"},{"text":" or "},{"children":[{"text":"italic"}],"type":"em"},{"text":" or a "},{"children":[{"text":"Link"}],"data":{"url":"/docs/examples"},"type":"link"},{"text":""}]}]},{"key":"4a5779a4-4t8ro","type":"data","value":[{"type":"p","children":[{"text":"Heading H2"},{"text":"Heading H3"},{"text":""},{"text":"Text can be "},{"children":[{"text":"bold"}],"type":"strong"},{"text":" or "},{"children":[{"text":"italic"}],"type":"em"},{"text":" or a "},{"children":[{"text":"Link"}],"data":{"url":"/docs/examples"},"type":"link"},{"text":""}]}]},{"key":"4a5779a4-72b6i","type":"data","value":[{"type":"p","children":[{"text":"Heading H2"},{"text":"Heading H3"},{"text":""},{"text":"Text can be "},{"children":[{"text":"bold"}],"type":"strong"},{"text":" or "},{"children":[{"text":"italic"}],"type":"em"},{"text":" or a "},{"children":[{"text":"Link"}],"data":{"url":"/docs/examples"},"type":"link"},{"text":""}]}]},{"key":"4a5779a4-5nchn","type":"data","value":[{"type":"p","children":[{"text":"Heading H2"},{"text":"Heading H3"},{"text":""},{"text":"Text can be "},{"children":[{"text":"bold"}],"type":"strong"},{"text":" or "},{"children":[{"text":"italic"}],"type":"em"},{"text":" or a "},{"children":[{"text":"Link"}],"data":{"url":"/docs/examples"},"type":"link"},{"text":""}]}]}],"key":"4a5779a4-bd5ru"}],"striped":true}}' />

<block type="heading" uid="10566683-a8b2-4b47-b64b-b01ddf43c307" alignment="left" heading="${text}" tag="h${level}" data='{"styles":{"backgroundColor":"grey"}}'>

## Basic Table

</block>

<block type="slateTable" uid="0b0891c8-812e-41ca-b572-b7851361025f" data='{"styles":{"backgroundColor":"grey"},"table":{"basic":false,"celled":true,"compact":false,"fixed":true,"hideHeaders":false,"inverted":false,"rows":[{"cells":[{"key":"0b0891c8-2616q","type":"header","value":[{"children":[{"text":"Title Tablehead"}],"type":"p"}]},{"key":"0b0891c8-9c5fm","type":"header","value":[{"children":[{"text":"Title Tablehead"}],"type":"p"}]},{"key":"0b0891c8-ljf3","type":"header","value":[{"children":[{"text":"Title Tablehead"}],"type":"p"}]},{"key":"0b0891c8-fgtdt","type":"header","value":[{"children":[{"text":"Title Tablehead"}],"type":"p"}]}],"key":"0b0891c8-36un"},{"cells":[{"key":"0b0891c8-flhhb","type":"data","value":[{"type":"p","children":[{"text":"Heading H2"},{"text":"Heading H3"},{"text":""},{"text":"Text can be "},{"children":[{"text":"bold"}],"type":"strong"},{"text":" or "},{"children":[{"text":"italic"}],"type":"em"},{"text":" or a "},{"children":[{"text":"Link"}],"data":{"url":"/docs/examples"},"type":"link"},{"text":" "}]}]},{"key":"0b0891c8-9biso","type":"data","value":[{"type":"p","children":[{"text":"Heading H2"},{"text":"Heading H3"},{"text":""},{"text":"Text can be "},{"children":[{"text":"bold"}],"type":"strong"},{"text":" or "},{"children":[{"text":"italic"}],"type":"em"},{"text":" or a "},{"children":[{"text":"Link"}],"data":{"url":"/docs/examples"},"type":"link"},{"text":""}]}]},{"key":"0b0891c8-56ea8","type":"data","value":[{"type":"p","children":[{"text":"Heading H2"},{"text":"Heading H3"},{"text":""},{"text":"Text can be "},{"children":[{"text":"bold"}],"type":"strong"},{"text":" or "},{"children":[{"text":"italic"}],"type":"em"},{"text":" or a "},{"children":[{"text":"Link"}],"data":{"url":"/docs/examples"},"type":"link"},{"text":""}]}]},{"key":"0b0891c8-47ahr","type":"data","value":[{"type":"p","children":[{"text":"Heading H2"},{"text":"Heading H3"},{"text":""},{"text":"Text can be "},{"children":[{"text":"bold"}],"type":"strong"},{"text":" or "},{"children":[{"text":"italic"}],"type":"em"},{"text":" or a "},{"children":[{"text":"Link"}],"data":{"url":"/docs/examples"},"type":"link"},{"text":""}]}]}],"key":"0b0891c8-6qrch"},{"cells":[{"key":"0b0891c8-21kbu","type":"data","value":[{"type":"p","children":[{"text":"Heading H2"},{"text":"Heading H3"},{"text":""},{"text":"Text can be "},{"children":[{"text":"bold"}],"type":"strong"},{"text":" or "},{"children":[{"text":"italic"}],"type":"em"},{"text":" or a "},{"children":[{"text":"Link"}],"data":{"url":"/docs/examples"},"type":"link"},{"text":""}]}]},{"key":"0b0891c8-1ph74","type":"data","value":[{"type":"p","children":[{"text":"Heading H2"},{"text":"Heading H3"},{"text":""},{"text":"Text can be "},{"children":[{"text":"bold"}],"type":"strong"},{"text":" or "},{"children":[{"text":"italic"}],"type":"em"},{"text":" or a "},{"children":[{"text":"Link"}],"data":{"url":"/docs/examples"},"type":"link"},{"text":""}]}]},{"key":"0b0891c8-5m4uq","type":"data","value":[{"type":"p","children":[{"text":"Heading H2"},{"text":"Heading H3"},{"text":""},{"text":"Text can be "},{"children":[{"text":"bold"}],"type":"strong"},{"text":" or "},{"children":[{"text":"italic"}],"type":"em"},{"text":" or a "},{"children":[{"text":"Link"}],"data":{"url":"/docs/examples"},"type":"link"},{"text":""}]}]},{"key":"0b0891c8-6474i","type":"data","value":[{"type":"p","children":[{"text":"Heading H2"},{"text":"Heading H3"},{"text":""},{"text":"Text can be "},{"children":[{"text":"bold"}],"type":"strong"},{"text":" or "},{"children":[{"text":"italic"}],"type":"em"},{"text":" or a "},{"children":[{"text":"Link"}],"data":{"url":"/docs/examples"},"type":"link"},{"text":""}]}]}],"key":"0b0891c8-7ujhi"},{"cells":[{"key":"0b0891c8-99oe4","type":"data","value":[{"type":"p","children":[{"text":"Heading H2"},{"text":"Heading H3"},{"text":""},{"text":"Text can be "},{"children":[{"text":"bold"}],"type":"strong"},{"text":" or "},{"children":[{"text":"italic"}],"type":"em"},{"text":" or a "},{"children":[{"text":"Link"}],"data":{"url":"/docs/examples"},"type":"link"},{"text":""}]}]},{"key":"0b0891c8-d896l","type":"data","value":[{"type":"p","children":[{"text":"Heading H2"},{"text":"Heading H3"},{"text":""},{"text":"Text can be "},{"children":[{"text":"bold"}],"type":"strong"},{"text":" or "},{"children":[{"text":"italic"}],"type":"em"},{"text":" or a "},{"children":[{"text":"Link"}],"data":{"url":"/docs/examples"},"type":"link"},{"text":""}]}]},{"key":"0b0891c8-ack6p","type":"data","value":[{"type":"p","children":[{"text":"Heading H2"},{"text":"Heading H3"},{"text":""},{"text":"Text can be "},{"children":[{"text":"bold"}],"type":"strong"},{"text":" or "},{"children":[{"text":"italic"}],"type":"em"},{"text":" or a "},{"children":[{"text":"Link"}],"data":{"url":"/docs/examples"},"type":"link"},{"text":""}]}]},{"key":"0b0891c8-fkour","type":"data","value":[{"type":"p","children":[{"text":"Heading H2"},{"text":"Heading H3"},{"text":""},{"text":"Text can be "},{"children":[{"text":"bold"}],"type":"strong"},{"text":" or "},{"children":[{"text":"italic"}],"type":"em"},{"text":" or a "},{"children":[{"text":"Link"}],"data":{"url":"/docs/examples"},"type":"link"},{"text":""}]}]}],"key":"0b0891c8-8f7ih"},{"cells":[{"key":"0b0891c8-cn6mu","type":"data","value":[{"type":"p","children":[{"text":"Heading H2"},{"text":"Heading H3"},{"text":""},{"text":"Text can be "},{"children":[{"text":"bold"}],"type":"strong"},{"text":" or "},{"children":[{"text":"italic"}],"type":"em"},{"text":" or a "},{"children":[{"text":"Link"}],"data":{"url":"/docs/examples"},"type":"link"},{"text":""}]}]},{"key":"0b0891c8-4t8ro","type":"data","value":[{"type":"p","children":[{"text":"Heading H2"},{"text":"Heading H3"},{"text":""},{"text":"Text can be "},{"children":[{"text":"bold"}],"type":"strong"},{"text":" or "},{"children":[{"text":"italic"}],"type":"em"},{"text":" or a "},{"children":[{"text":"Link"}],"data":{"url":"/docs/examples"},"type":"link"},{"text":""}]}]},{"key":"0b0891c8-72b6i","type":"data","value":[{"type":"p","children":[{"text":"Heading H2"},{"text":"Heading H3"},{"text":""},{"text":"Text can be "},{"children":[{"text":"bold"}],"type":"strong"},{"text":" or "},{"children":[{"text":"italic"}],"type":"em"},{"text":" or a "},{"children":[{"text":"Link"}],"data":{"url":"/docs/examples"},"type":"link"},{"text":""}]}]},{"key":"0b0891c8-5nchn","type":"data","value":[{"type":"p","children":[{"text":"Heading H2"},{"text":"Heading H3"},{"text":""},{"text":"Text can be "},{"children":[{"text":"bold"}],"type":"strong"},{"text":" or "},{"children":[{"text":"italic"}],"type":"em"},{"text":" or a "},{"children":[{"text":"Link"}],"data":{"url":"/docs/examples"},"type":"link"},{"text":""}]}]}],"key":"0b0891c8-bd5ru"}],"striped":false}}' />

<block type="heading" uid="aa800193-7bf4-4f54-9bb6-a6c5b4e02b81" alignment="left" heading="${text}" tag="h${level}" data='{"styles":{"backgroundColor":"grey"}}'>

## Stripe alternating rows with colors

</block>

<block type="slateTable" uid="4266731a-e721-4f2f-95de-c7c3e885677b" data='{"styles":{"backgroundColor":"grey"},"table":{"basic":false,"celled":true,"compact":false,"fixed":true,"hideHeaders":false,"inverted":false,"rows":[{"cells":[{"key":"4266731a-2616q","type":"header","value":[{"children":[{"text":"Title Tablehead"}],"type":"p"}]},{"key":"4266731a-9c5fm","type":"header","value":[{"children":[{"text":"Title Tablehead"}],"type":"p"}]},{"key":"4266731a-ljf3","type":"header","value":[{"children":[{"text":"Title Tablehead"}],"type":"p"}]},{"key":"4266731a-fgtdt","type":"header","value":[{"children":[{"text":"Title Tablehead"}],"type":"p"}]}],"key":"4266731a-36un"},{"cells":[{"key":"4266731a-flhhb","type":"data","value":[{"type":"p","children":[{"text":"Heading H2"},{"text":"Heading H3"},{"text":""},{"text":"Text can be "},{"children":[{"text":"bold"}],"type":"strong"},{"text":" or "},{"children":[{"text":"italic"}],"type":"em"},{"text":" or a "},{"children":[{"text":"Link"}],"data":{"url":"/docs/examples"},"type":"link"},{"text":" "}]}]},{"key":"4266731a-9biso","type":"data","value":[{"type":"p","children":[{"text":"Heading H2"},{"text":"Heading H3"},{"text":""},{"text":"Text can be "},{"children":[{"text":"bold"}],"type":"strong"},{"text":" or "},{"children":[{"text":"italic"}],"type":"em"},{"text":" or a "},{"children":[{"text":"Link"}],"data":{"url":"/docs/examples"},"type":"link"},{"text":""}]}]},{"key":"4266731a-56ea8","type":"data","value":[{"type":"p","children":[{"text":"Heading H2"},{"text":"Heading H3"},{"text":""},{"text":"Text can be "},{"children":[{"text":"bold"}],"type":"strong"},{"text":" or "},{"children":[{"text":"italic"}],"type":"em"},{"text":" or a "},{"children":[{"text":"Link"}],"data":{"url":"/docs/examples"},"type":"link"},{"text":""}]}]},{"key":"4266731a-47ahr","type":"data","value":[{"type":"p","children":[{"text":"Heading H2"},{"text":"Heading H3"},{"text":""},{"text":"Text can be "},{"children":[{"text":"bold"}],"type":"strong"},{"text":" or "},{"children":[{"text":"italic"}],"type":"em"},{"text":" or a "},{"children":[{"text":"Link"}],"data":{"url":"/docs/examples"},"type":"link"},{"text":""}]}]}],"key":"4266731a-6qrch"},{"cells":[{"key":"4266731a-21kbu","type":"data","value":[{"type":"p","children":[{"text":"Heading H2"},{"text":"Heading H3"},{"text":""},{"text":"Text can be "},{"children":[{"text":"bold"}],"type":"strong"},{"text":" or "},{"children":[{"text":"italic"}],"type":"em"},{"text":" or a "},{"children":[{"text":"Link"}],"data":{"url":"/docs/examples"},"type":"link"},{"text":""}]}]},{"key":"4266731a-1ph74","type":"data","value":[{"type":"p","children":[{"text":"Heading H2"},{"text":"Heading H3"},{"text":""},{"text":"Text can be "},{"children":[{"text":"bold"}],"type":"strong"},{"text":" or "},{"children":[{"text":"italic"}],"type":"em"},{"text":" or a "},{"children":[{"text":"Link"}],"data":{"url":"/docs/examples"},"type":"link"},{"text":""}]}]},{"key":"4266731a-5m4uq","type":"data","value":[{"type":"p","children":[{"text":"Heading H2"},{"text":"Heading H3"},{"text":""},{"text":"Text can be "},{"children":[{"text":"bold"}],"type":"strong"},{"text":" or "},{"children":[{"text":"italic"}],"type":"em"},{"text":" or a "},{"children":[{"text":"Link"}],"data":{"url":"/docs/examples"},"type":"link"},{"text":""}]}]},{"key":"4266731a-6474i","type":"data","value":[{"type":"p","children":[{"text":"Heading H2"},{"text":"Heading H3"},{"text":""},{"text":"Text can be "},{"children":[{"text":"bold"}],"type":"strong"},{"text":" or "},{"children":[{"text":"italic"}],"type":"em"},{"text":" or a "},{"children":[{"text":"Link"}],"data":{"url":"/docs/examples"},"type":"link"},{"text":""}]}]}],"key":"4266731a-7ujhi"},{"cells":[{"key":"4266731a-99oe4","type":"data","value":[{"type":"p","children":[{"text":"Heading H2"},{"text":"Heading H3"},{"text":""},{"text":"Text can be "},{"children":[{"text":"bold"}],"type":"strong"},{"text":" or "},{"children":[{"text":"italic"}],"type":"em"},{"text":" or a "},{"children":[{"text":"Link"}],"data":{"url":"/docs/examples"},"type":"link"},{"text":""}]}]},{"key":"4266731a-d896l","type":"data","value":[{"type":"p","children":[{"text":"Heading H2"},{"text":"Heading H3"},{"text":""},{"text":"Text can be "},{"children":[{"text":"bold"}],"type":"strong"},{"text":" or "},{"children":[{"text":"italic"}],"type":"em"},{"text":" or a "},{"children":[{"text":"Link"}],"data":{"url":"/docs/examples"},"type":"link"},{"text":""}]}]},{"key":"4266731a-ack6p","type":"data","value":[{"type":"p","children":[{"text":"Heading H2"},{"text":"Heading H3"},{"text":""},{"text":"Text can be "},{"children":[{"text":"bold"}],"type":"strong"},{"text":" or "},{"children":[{"text":"italic"}],"type":"em"},{"text":" or a "},{"children":[{"text":"Link"}],"data":{"url":"/docs/examples"},"type":"link"},{"text":""}]}]},{"key":"4266731a-fkour","type":"data","value":[{"type":"p","children":[{"text":"Heading H2"},{"text":"Heading H3"},{"text":""},{"text":"Text can be "},{"children":[{"text":"bold"}],"type":"strong"},{"text":" or "},{"children":[{"text":"italic"}],"type":"em"},{"text":" or a "},{"children":[{"text":"Link"}],"data":{"url":"/docs/examples"},"type":"link"},{"text":""}]}]}],"key":"4266731a-8f7ih"},{"cells":[{"key":"4266731a-cn6mu","type":"data","value":[{"type":"p","children":[{"text":"Heading H2"},{"text":"Heading H3"},{"text":""},{"text":"Text can be "},{"children":[{"text":"bold"}],"type":"strong"},{"text":" or "},{"children":[{"text":"italic"}],"type":"em"},{"text":" or a "},{"children":[{"text":"Link"}],"data":{"url":"/docs/examples"},"type":"link"},{"text":""}]}]},{"key":"4266731a-4t8ro","type":"data","value":[{"type":"p","children":[{"text":"Heading H2"},{"text":"Heading H3"},{"text":""},{"text":"Text can be "},{"children":[{"text":"bold"}],"type":"strong"},{"text":" or "},{"children":[{"text":"italic"}],"type":"em"},{"text":" or a "},{"children":[{"text":"Link"}],"data":{"url":"/docs/examples"},"type":"link"},{"text":""}]}]},{"key":"4266731a-72b6i","type":"data","value":[{"type":"p","children":[{"text":"Heading H2"},{"text":"Heading H3"},{"text":""},{"text":"Text can be "},{"children":[{"text":"bold"}],"type":"strong"},{"text":" or "},{"children":[{"text":"italic"}],"type":"em"},{"text":" or a "},{"children":[{"text":"Link"}],"data":{"url":"/docs/examples"},"type":"link"},{"text":""}]}]},{"key":"4266731a-5nchn","type":"data","value":[{"type":"p","children":[{"text":"Heading H2"},{"text":"Heading H3"},{"text":""},{"text":"Text can be "},{"children":[{"text":"bold"}],"type":"strong"},{"text":" or "},{"children":[{"text":"italic"}],"type":"em"},{"text":" or a "},{"children":[{"text":"Link"}],"data":{"url":"/docs/examples"},"type":"link"},{"text":""}]}]}],"key":"4266731a-bd5ru"}],"striped":true}}' />

<block type="codeExample" uid="ref-table-schema" templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-table" slotId="schema">

<region name="tabs" widget="object_list" repeat="h3" label="${1/text}" language="${2/lang}" code="${2/code}" data='{"@ids":["ref-table-schema-javascript-237d52"]}'>

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

</region>

</block>

<block type="codeExample" uid="ref-table-json-data" templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-table" slotId="json-data">

<region name="tabs" widget="object_list" repeat="h3" label="${1/text}" language="${2/lang}" code="${2/code}" data='{"@ids":["ref-table-json-data-json-472dd4"]}'>

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

</region>

</block>

<block type="codeExample" uid="ref-table-rendering" templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-table" slotId="rendering">

<region name="tabs" widget="object_list" repeat="h3" label="${1/text}" language="${2/lang}" code="${2/code}" data='{"@ids":["ref-table-rendering-jsx-ee1611","ref-table-rendering-vue-570ccb","ref-table-rendering-svelte-de27fc"]}'>

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

</region>

</block>
