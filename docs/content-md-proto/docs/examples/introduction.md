---
"@type": Document
UID: 00cef5f245a342958288ace545e3c097
allow_discussion: false
contributors: []
creators:
  - admin
description: >-
  
  The introductory block allows the display of an introductory text, which is
  displayed larger than normal continuous text.
effective: 2023-07-06T18:35:00
exclude_from_nav: false
expires: null
id: introduction
language: "##DEFAULT##"
layout: document_view
preview_caption: null
preview_image:
  blob_path: docs/examples/introduction/preview_image/black-starry-night.jpg
  content-type: image/jpeg
  filename: black-starry-night.jpg
  height: 1708
  size: 693013
  width: 2400
review_state: published
rights: ""
subjects:
  - blocks
  - text
title: Introduction
assignments:
  - { uid: 50727b9a-1f8a-4857-aab5-8acc6985bfc6, type: title }
  - { uid: ref-introduction-description, type: slate }
  - { uid: editor-screenshot, type: image }
  - { uid: d0438a28-aaaf-4db1-8887-c9b3351787d3, type: separator }
  - { uid: d35f209e-12c1-4a30-ae36-52f84a4a0b7b, type: introduction }
  - { uid: d35f209e-12c1-4a30-ae36-52f84a4a0b7b-split-1, type: slate }
  - { uid: cec08900-0334-4288-9ece-f5d15d4dd6f1, type: separator }
  - { uid: 26accd80-9715-43ea-9b7c-aa0b3be7d0da, type: slate }
  - { uid: 177de529-ce72-4721-a58c-15feadaf285e, type: slate }
  - { uid: ref-introduction-schema, type: codeExample }
  - { uid: ref-introduction-json-data, type: codeExample }
  - { uid: ref-introduction-rendering, type: codeExample }
prototypes: |
  <block type="title"      _="${h1}" />
  <block type="slate"      value="${p|h2|h3|h4|h5|h6|ul|ol|blockquote/slate}" />
  <block type="image"      description="${p/text}" url="${img/src}" alt="${img/alt}" align="center" size="l" />
---

# Introduction

Displays the page's title and description as a styled header. The introduction block has no content of its own — it reads title and description from the page metadata.

![The introduction example block being edited in Volto Hydra](/docs/images/introduction-edit)

<block type="separator" uid="d0438a28-aaaf-4db1-8887-c9b3351787d3" data='{"styles":{"align":"full"}}' />

<block type="introduction" uid="d35f209e-12c1-4a30-ae36-52f84a4a0b7b" data='{"value":[{"children":[{"text":"Highlight Title H2 "}],"type":"h2"}]}' />

Lorem ipsum vitae elit libero, a pharetra augue. Nulla vitae elit libero, a pharetra augue. Duis mollis, est non commodo luctus, nisi erat porttitor ligula, eget lacinia odio sem nec elit. Donec ullamcorper nulla non metus auctor fringilla. Vivamus sagittis lacus vel augue laoreet rutrum faucibus dolor auctor. Vestibulum id ligula porta felis euismod semper.

<block type="separator" uid="cec08900-0334-4288-9ece-f5d15d4dd6f1" data='{"styles":{"align":"full"}}' />

## Headline H2

Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat. Duis autem vel eum iriure dolor in hendrerit in vulputate velit esse molestie consequat, vel illum dolore eu feugiat nulla facilisis at vero eros et accumsan et iusto odio dignissim qui blandit praesent luptatum zzril delenit augue duis dolore te feugait nulla facilisi.

<block type="codeExample" uid="ref-introduction-schema" templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-introduction" slotId="schema" data='{"tabs":[{"@id":"ref-introduction-schema-javascript-e14a03","label":"Schema","language":"javascript","code":"{\n  \"introduction\": {\n    \"blockSchema\": {\n      \"properties\": {\n        \"value\": {\n          \"title\": \"Text\",\n          \"widget\": \"slate\"\n        }\n      }\n    }\n  }\n}"}]}' />

<block type="codeExample" uid="ref-introduction-json-data" templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-introduction" slotId="json-data" data='{"tabs":[{"@id":"ref-introduction-json-data-json-d959f7","label":"JSON Block Data","language":"json","code":"{\n  \"@type\": \"introduction\",\n  \"value\": [\n    {\n      \"type\": \"p\",\n      \"children\": [\n        {\n          \"text\": \"A short introductory paragraph that sets the context for the page.\"\n        }\n      ]\n    }\n  ]\n}"}]}' />

<block type="codeExample" uid="ref-introduction-rendering" templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-introduction" slotId="rendering" data='{"tabs":[{"@id":"ref-introduction-rendering-jsx-599242","label":"React","language":"jsx","code":"function IntroductionBlock({ block }) {\n  return (\n    <div data-block-uid={block[&#39;@uid&#39;]} className=\"introduction-block\">\n      <div className=\"introduction-body\" data-edit-text=\"value\">\n        {(block.value || []).map((node, i) => (\n          <SlateNode key={i} node={node} />\n        ))}\n      </div>\n    </div>\n  );\n}"},{"@id":"ref-introduction-rendering-vue-53106b","label":"Vue","language":"vue","code":"<template>\n  <div :data-block-uid=\"block[&#39;@uid&#39;]\" class=\"introduction-block\">\n    <div class=\"introduction-body\" data-edit-text=\"value\">\n      <SlateNode v-for=\"(node, i) in block.value || []\" :key=\"i\" :node=\"node\" />\n    </div>\n  </div>\n</template>\n\n<script setup>\nimport SlateNode from &#39;./SlateNode.vue&#39;;\ndefineProps({ block: Object });\n</script>"},{"@id":"ref-introduction-rendering-svelte-9e2b59","label":"Svelte","language":"svelte","code":"<script>\n  import SlateNode from &#39;./SlateNode.svelte&#39;;\n  export let block;\n</script>\n\n<div data-block-uid={block[&#39;@uid&#39;]} class=\"introduction-block\">\n  <div class=\"introduction-body\" data-edit-text=\"value\">\n    {#each block.value || [] as node, i (i)}\n      <SlateNode {node} />\n    {/each}\n  </div>\n</div>"}]}' />
