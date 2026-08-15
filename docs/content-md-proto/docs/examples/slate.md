---
"@type": Document
UID: 2508797173824f0e9f82bb2e7cfe922d
allow_discussion: false
contributors: []
creators:
  - admin
description: >-
  
  The Text Block allows you to add text to a web page. The text can be formatted
  and structured in different ways (bold, headings, etc.).
effective: 2023-07-06T18:35:00
exclude_from_nav: false
expires: null
id: slate
language: "##DEFAULT##"
layout: document_view
preview_caption: null
preview_image:
  blob_path: docs/examples/slate/preview_image/black-starry-night.jpg
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
  - editing
title: Text
assignments:
  - { uid: ccff41c6-b733-4b88-b02e-4c07460a19e2, type: title }
  - { uid: ref-text-description, type: slate }
  - { uid: editor-screenshot, type: image }
  - { uid: da904eda-9add-496c-ab09-4fee9820af1f, type: slate }
  - { uid: 244197b5-ac86-4d92-b235-18986a351580, type: separator }
  - { uid: 5783a103-3129-48f8-80af-f7ad7af1efa4, type: slate }
  - { uid: 9704c0d2-3e17-41c6-b3f6-9ae051d8c2f8, type: slate }
  - { uid: 2abcc2af-dc78-4ca6-8882-6682f7e9a5b9, type: slate }
  - { uid: 8df2a31d-76a5-445c-aacc-0437c48331d8, type: slate }
  - { uid: 3a2f8507-01bf-49a4-a670-2159005075df, type: slate }
  - { uid: 9aa1cf78-c6dd-4f31-8673-4a3fc2653add, type: slate }
  - { uid: 291012a9-ca10-4011-9121-32a210f24d58, type: slate }
  - { uid: 55df52be-8681-4d09-a17b-f32f31632213, type: separator }
  - { uid: cd44a7ba-b521-41fb-a609-0d1b8d9df592, type: heading }
  - { uid: 801d735a-2d81-428e-a4e9-85d1e82c3639, type: separator }
  - { uid: 910a3f25-0318-41b3-a1a6-6e35cdf83451, type: slate }
  - { uid: 486c4646-de10-40a9-9470-58b7b1449240, type: slate }
  - { uid: f0a56edf-a963-4177-877c-76d9a4d6c20b, type: slate }
  - { uid: 00146980-5c86-4ecd-a84e-d373183231ad, type: slate }
  - { uid: ref-text-schema, type: codeExample }
  - { uid: ref-text-json-data, type: codeExample }
  - { uid: ref-text-rendering, type: codeExample }
prototypes: |
  <block type="title" _="${h1}" />
  <block type="slate" value="${p|h2|h3|h4|h5|h6|ul|ol|blockquote/slate}" />
  <block type="separator" _="${hr}" />
  <block type="image" description="${p/text}" url="${img/src}" alt="${img/alt}" align="center" size="l" image_field="image" title="Image" />
  <block type="image" url="${img/src}" alt="${img/alt}" align="center" size="l" image_field="image" title="Image" />
  <block type="codeExample">
    <region name="tabs" widget="object_list">
      <block type="tab" label="${h3/text}" language="${pre/lang}" code="${pre/text}" />
    </region>
  </block>
---

# 

Rich text block powered by the Slate editor. Supports paragraphs, headings, lists, blockquotes, and inline formatting (bold, italic, strikethrough, underline, code, links).

<block type="image" url="/docs/images/slate-edit" alt="The slate example block being edited in Volto Hydra" align="center" size="l" />

Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet. Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet.

---

**This is bold text.**

*This is Italics.*

[This is link.](https://www.google.com/)

## This is H2

### This is H3

1. one
2. two
3. three

- This is unordered list
- This is unordered list
- This is unordered list

---

<block type="heading" alignment="left" tag="h2" data='{"heading":" Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet. Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet. "}' />

---

## Überschrift zweiter Ordnung (Headline H2)

Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet. Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet.

### Überschrift dritter Ordnung (Headline H3)

Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet. Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet

<block type="codeExample" templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-text" slotId="schema" data='{"tabs":[{"@id":"ref-text-schema-javascript-6ffd2e","label":"Schema","language":"javascript","code":"{\n  \"slate\": {\n    \"blockSchema\": {\n      \"properties\": {\n        \"value\": {\n          \"title\": \"Text\",\n          \"widget\": \"slate\"\n        }\n      }\n    }\n  }\n}"}]}' />

<block type="codeExample" templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-text" slotId="json-data" data='{"tabs":[{"@id":"ref-text-json-data-json-f6d82b","label":"JSON Block Data","language":"json","code":"{\n  \"@type\": \"slate\",\n  \"value\": [\n    {\n      \"type\": \"h2\",\n      \"children\": [\n        {\n          \"text\": \"Welcome\"\n        }\n      ]\n    }\n  ]\n}"}]}' />

<block type="codeExample" templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-text" slotId="rendering" data='{"tabs":[{"@id":"ref-text-rendering-jsx-076433","label":"React","language":"jsx","code":"function SlateBlock({ block }) {\n  return (\n    <div data-block-uid={block[&#39;@uid&#39;]} data-edit-text=\"value\">\n      {(block.value || []).map((node, i) => (\n        <SlateNode key={i} node={node} />\n      ))}\n    </div>\n  );\n}\n\nfunction SlateNode({ node }) {\n  if (node.text !== undefined) return <>{node.text}</>;\n  const children = (node.children || []).map((c, i) => <SlateNode key={i} node={c} />);\n  const Tag = node.type === &#39;link&#39; ? &#39;a&#39; : node.type;\n  const props = { &#39;data-node-id&#39;: node.nodeId };\n  if (node.type === &#39;link&#39;) props.href = node.data?.url;\n  return <Tag {...props}>{children}</Tag>;\n}"},{"@id":"ref-text-rendering-vue-54b4b7","label":"Vue","language":"vue","code":"<!-- SlateBlock.vue -->\n<template>\n  <div :data-block-uid=\"block[&#39;@uid&#39;]\" data-edit-text=\"value\">\n    <SlateNode v-for=\"(node, i) in block.value || []\" :key=\"i\" :node=\"node\" />\n  </div>\n</template>\n\n<script setup>\ndefineProps({ block: Object });\n</script>\n\n<!-- SlateNode.vue -->\n<template>\n  <template v-if=\"!node.type\">{{ node.text }}</template>\n  <a v-else-if=\"node.type === &#39;link&#39;\" :href=\"node.data?.url\" :data-node-id=\"node.nodeId\">\n    <SlateNode v-for=\"(c, i) in node.children\" :key=\"i\" :node=\"c\" />\n  </a>\n  <component v-else :is=\"node.type\" :data-node-id=\"node.nodeId\">\n    <SlateNode v-for=\"(c, i) in node.children\" :key=\"i\" :node=\"c\" />\n  </component>\n</template>\n\n<script setup>\ndefineProps({ node: Object });\n</script>"},{"@id":"ref-text-rendering-svelte-2aa474","label":"Svelte","language":"svelte","code":"<!-- SlateBlock.svelte -->\n<script>\n  import SlateNode from &#39;./SlateNode.svelte&#39;;\n  export let block;\n</script>\n\n<div data-block-uid={block[&#39;@uid&#39;]} data-edit-text=\"value\">\n  {#each block.value || [] as node, i (i)}\n    <SlateNode {node} />\n  {/each}\n</div>\n\n<!-- SlateNode.svelte -->\n<script>\n  export let node;\n</script>\n\n{#if node.text !== undefined}\n  {node.text}\n{:else if node.type === &#39;link&#39;}\n  <a href={node.data?.url} data-node-id={node.nodeId}>{#each node.children || [] as c, i (i)}<svelte:self node={c} />{/each}</a>\n{:else}\n  <svelte:element this={node.type} data-node-id={node.nodeId}>{#each node.children || [] as c, i (i)}<svelte:self node={c} />{/each}</svelte:element>\n{/if}"}]}' />
