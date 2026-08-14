---
"@type": Document
UID: 2f69aa417e894fd3bf23d393287b369e
allow_discussion: false
contributors: []
creators:
  - admin
description: >-
  
  The heading block allows you to display headings to group multiple blocks
  under one topic.
effective: 2023-07-06T18:35:00
exclude_from_nav: false
expires: null
id: heading
language: "##DEFAULT##"
layout: document_view
preview_caption: null
preview_image: null
review_state: published
rights: null
subjects:
  - blocks
  - text
title: Heading
assignments:
  - { uid: e58cca3c-95d4-4819-951d-48415706bf41, type: title }
  - { uid: ref-heading-description, type: slate }
  - { uid: 4a0352d5-89df-48aa-944e-7270e81351d4, type: separator }
  - { uid: faabad67-4aa2-4774-a48c-b1accf288700, type: introduction }
  - { uid: fe637263-126e-4a7f-b4aa-36369c5155cc, type: separator }
  - { uid: 36960cee-ec85-458b-b0be-d2e7a5a41e5f, type: introduction }
  - { uid: 36960cee-ec85-458b-b0be-d2e7a5a41e5f-split-1, type: slate }
  - { uid: e328753b-d914-4bcb-8b8b-2d5060476efe, type: separator }
  - { uid: 06a960a6-795c-409d-a55f-94d5047e3514, type: slate }
  - { uid: b4691078-153d-451f-9b47-fa6f852a1e6c, type: slate }
  - { uid: 7a405d27-e5ca-426c-bca4-e40cc338f7ba, type: slate }
  - { uid: 7ebc67e3-e666-43f4-9fce-5dc14f98834f, type: slate }
  - { uid: 0126e819-d955-41c5-a736-2f0b5ffda8a1, type: separator }
  - { uid: 1bedcc9d-1c02-44e8-bb8e-5c46d6c67d3d, type: gridBlock }
  - { uid: ref-heading-schema, type: codeExample }
  - { uid: ref-heading-json-data, type: codeExample }
  - { uid: ref-heading-rendering, type: codeExample }
prototypes: |
  <block type="title"      _="${h1}" />
  <block type="slate"      value="${p|h2|h3|h4|h5|h6|ul|ol|blockquote/slate}" />
  <block type="gridBlock"  headline="${text}">
    <region name="blocks" widget="blocks_layout" />
  </block>
---

# Heading

A standalone heading block that renders as h1–h6 based on a configurable tag field. Unlike headings inside a slate block, this is a dedicated block type with its own heading text field.

<block type="separator" uid="4a0352d5-89df-48aa-944e-7270e81351d4" data='{"styles":{"align":"full","backgroundColor":"transparent","noLine":false}}' />

<block type="introduction" uid="faabad67-4aa2-4774-a48c-b1accf288700" data='{"value":[{"children":[{"text":"Lorem ipsum vitae elit libero, a pharetra augue. Nulla vitae elit libero, a pharetra augue. Duis mollis, est non commodo luctus, nisi erat porttitor ligula, eget lacinia odio sem nec elit. Donec ullamcorper nulla non metus auctor fringilla. Vivamus sagittis lacus vel augue laoreet rutrum faucibus dolor auctor. Vestibulum id ligula porta felis euismod semper."}],"type":"p"}]}' />

<block type="separator" uid="fe637263-126e-4a7f-b4aa-36369c5155cc" data='{"styles":{"align":"full"}}' />

<block type="introduction" uid="36960cee-ec85-458b-b0be-d2e7a5a41e5f" data='{"value":[{"children":[{"text":"Highlight Title H2 "}],"type":"h2"}]}' />

Lorem ipsum vitae elit libero, a pharetra augue. Nulla vitae elit libero, a pharetra augue. Duis mollis, est non commodo luctus, nisi erat porttitor ligula, eget lacinia odio sem nec elit. Donec ullamcorper nulla non metus auctor fringilla. Vivamus sagittis lacus vel augue laoreet rutrum faucibus dolor auctor. Vestibulum id ligula porta felis euismod semper.

<block type="separator" uid="e328753b-d914-4bcb-8b8b-2d5060476efe" data='{"styles":{"align":"full"}}' />

## Headline H2

Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat. Duis autem vel eum iriure dolor in hendrerit in vulputate velit esse molestie consequat, vel illum dolore eu feugiat nulla facilisis at vero eros et accumsan et iusto odio dignissim qui blandit praesent luptatum zzril delenit augue duis dolore te feugait nulla facilisi.

### Headline H3

Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat. Duis autem vel eum iriure dolor in hendrerit in vulputate velit esse molestie consequat, vel illum dolore eu feugiat nulla facilisis at vero eros et accumsan et iusto odio dignissim qui blandit praesent luptatum zzril delenit augue duis dolore te feugait nulla facilisi.

<block type="separator" uid="0126e819-d955-41c5-a736-2f0b5ffda8a1" data='{"styles":{"align":"full"}}' />

<block type="gridBlock" headline="Block Title">

<block type="teaser" uid="882e7872-bcf3-4234-a510-d1cff6bf2f7f" title="Teaser Title H2" data='{"description":"Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat. Duis autem vel eum iriure dolor in hendrerit in vulputate velit esse molestie consequat, vel illum dolore eu feugiat nulla facilisis at vero eros et accumsan et iusto odio dignissim qui blandit praesent luptatum zzril delenit augue duis dolore te feugait nulla facilisi.","head_title":null,"href":[{"@id":"/docs/examples/content-types/page","@type":"Document","Description":"The Page content type can be used to display content on a single page of the website. Pages can be structured using text, images and blocks.","Title":"Page","getRemoteUrl":null,"hasPreviewImage":true,"head_title":null,"image_field":"preview_image","title":"Page"}],"styles":{"align":"left"}}' />

</block>

<block type="codeExample" uid="ref-heading-schema" templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-heading" slotId="schema" data='{"tabs":[{"@id":"ref-heading-schema-javascript-f00bc9","label":"Schema","language":"javascript","code":"{\n  \"heading\": {\n    \"blockSchema\": {\n      \"properties\": {\n        \"heading\": {\n          \"title\": \"Heading\"\n        },\n        \"tag\": {\n          \"title\": \"Tag\",\n          \"widget\": \"select\",\n          \"choices\": [\n            [\n              \"h1\",\n              \"h1\"\n            ],\n            [\n              \"h2\",\n              \"h2\"\n            ],\n            [\n              \"h3\",\n              \"h3\"\n            ],\n            [\n              \"h4\",\n              \"h4\"\n            ],\n            [\n              \"h5\",\n              \"h5\"\n            ],\n            [\n              \"h6\",\n              \"h6\"\n            ]\n          ]\n        }\n      }\n    }\n  }\n}"}]}' />

<block type="codeExample" uid="ref-heading-json-data" templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-heading" slotId="json-data" data='{"tabs":[{"@id":"ref-heading-json-data-json-87c435","label":"JSON Block Data","language":"json","code":"{\n  \"@type\": \"heading\",\n  \"heading\": \"Getting Started\",\n  \"tag\": \"h2\"\n}"}]}' />

<block type="codeExample" uid="ref-heading-rendering" templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-heading" slotId="rendering" data='{"tabs":[{"@id":"ref-heading-rendering-jsx-eb01a3","label":"React","language":"jsx","code":"function HeadingBlock({ block }) {\n  const Tag = block.tag || &#39;h2&#39;;\n  const text = block.heading || &#39;&#39;;\n\n  return (\n    <Tag data-block-uid={block[&#39;@uid&#39;]} data-edit-text=\"heading\">\n      {text}\n    </Tag>\n  );\n}"},{"@id":"ref-heading-rendering-vue-754dc2","label":"Vue","language":"vue","code":"<template>\n  <component :is=\"block.tag || &#39;h2&#39;\" :data-block-uid=\"block[&#39;@uid&#39;]\" data-edit-text=\"heading\">\n    {{ block.heading }}\n  </component>\n</template>\n\n<script setup>\ndefineProps({ block: Object });\n</script>"},{"@id":"ref-heading-rendering-svelte-f5f71c","label":"Svelte","language":"svelte","code":"<script>\n  export let block;\n</script>\n\n<svelte:element this={block.tag || &#39;h2&#39;} data-block-uid={block[&#39;@uid&#39;]} data-edit-text=\"heading\">\n  {block.heading}\n</svelte:element>"}]}' />
