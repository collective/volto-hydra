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
is_folderish: true
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
blocks-assignments:
  - { uid: ccff41c6-b733-4b88-b02e-4c07460a19e2 }
  - { uid: ref-text-description }
  - { uid: editor-screenshot }
  - { uid: da904eda-9add-496c-ab09-4fee9820af1f }
  - { uid: 244197b5-ac86-4d92-b235-18986a351580 }
  - { uid: 5783a103-3129-48f8-80af-f7ad7af1efa4 }
  - { uid: 9704c0d2-3e17-41c6-b3f6-9ae051d8c2f8 }
  - { uid: 2abcc2af-dc78-4ca6-8882-6682f7e9a5b9 }
  - { uid: 8df2a31d-76a5-445c-aacc-0437c48331d8 }
  - { uid: 3a2f8507-01bf-49a4-a670-2159005075df }
  - { uid: 9aa1cf78-c6dd-4f31-8673-4a3fc2653add }
  - { uid: 291012a9-ca10-4011-9121-32a210f24d58 }
  - { uid: 55df52be-8681-4d09-a17b-f32f31632213 }
  - { uid: cd44a7ba-b521-41fb-a609-0d1b8d9df592 }
  - { uid: 801d735a-2d81-428e-a4e9-85d1e82c3639 }
  - { uid: 910a3f25-0318-41b3-a1a6-6e35cdf83451 }
  - { uid: 486c4646-de10-40a9-9470-58b7b1449240 }
  - { uid: f0a56edf-a963-4177-877c-76d9a4d6c20b }
  - { uid: 00146980-5c86-4ecd-a84e-d373183231ad }
  - { uid: ref-text-schema }
  - { id: ref-text-schema-javascript-6ffd2e }
  - { uid: ref-text-json-data }
  - { id: ref-text-json-data-json-f6d82b }
  - { uid: ref-text-rendering }
  - { id: ref-text-rendering-jsx-076433 }
  - { id: ref-text-rendering-vue-54b4b7 }
  - { id: ref-text-rendering-svelte-2aa474 }
blocks-matched: |
  <block type="slate" value="${p,h*,ul,ol,blockquote,strong,em/slate}" />
  <block type="title" _="${h1}" />
  <block type="separator" _="${hr}" styles={"align":"full"} />
  <block type="image" description="${p?/text}" url="${img/src}" alt="${img?/alt}" title="${img?/title}" align="center" size="l" />
  <block type="image" url="${img/src}" alt="${img?/alt}" title="${img?/title}" align="center" size="l" />
  <block type="codeExample">
    <region name="tabs" widget="object_list">
      <block type="tab" label="${h3/text}" language="${pre/lang}" code="${pre/text}" />
    </region>
  </block>
---

# Text

Rich text block powered by the Slate editor. Supports paragraphs, headings, lists, blockquotes, and inline formatting (bold, italic, strikethrough, underline, code, links).

<block type="image">

![The slate example block being edited in Volto Hydra](/docs/images/slate-edit)

</block>

Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet. Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet.

<block type="separator" />

**This is bold text.**

*This is Italics.*

<block type="slate" data-json='{"value":[{"children":[{"text":""},{"children":[{"text":""}],"type":"em"},{"text":""},{"children":[{"text":"This is link."}],"data":{"url":"https://www.google.com/"},"type":"link"},{"text":""}],"type":"p"}]}' />

## This is H2

### This is H3

1. one
2. two
3. three

- This is unordered list
- This is unordered list
- This is unordered list

<block type="separator" />

<block type="heading" alignment="left" tag="h2" data-json='{"heading":" Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet. Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet. "}' />

<block type="separator" />

## Überschrift zweiter Ordnung (Headline H2)

Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet. Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet.

### Überschrift dritter Ordnung (Headline H3)

Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet. Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet

<fields templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-text">

<block type="codeExample" slotId="schema">

### Schema

```javascript
{
  "slate": {
    "blockSchema": {
      "properties": {
        "value": {
          "title": "Text",
          "widget": "slate",
          "type": "array"
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
  "@type": "slate",
  "value": [
    {
      "type": "h2",
      "children": [
        {
          "text": "Welcome"
        }
      ]
    }
  ]
}
```

</block>

<block type="codeExample" slotId="rendering">

### React

```jsx
function SlateBlock({ block }) {
  return (
    <div data-block-uid={block['@uid']} data-edit-text="value">
      {(block.value || []).map((node, i) => (
        <SlateNode key={i} node={node} />
      ))}
    </div>
  );
}

function SlateNode({ node }) {
  if (node.text !== undefined) return <>{node.text}</>;
  const children = (node.children || []).map((c, i) => <SlateNode key={i} node={c} />);
  const Tag = node.type === 'link' ? 'a' : node.type;
  const props = { 'data-node-id': node.nodeId };
  if (node.type === 'link') props.href = node.data?.url;
  return <Tag {...props}>{children}</Tag>;
}
```

### Vue

```vue
<!-- SlateBlock.vue -->
<template>
  <div :data-block-uid="block['@uid']" data-edit-text="value">
    <SlateNode v-for="(node, i) in block.value || []" :key="i" :node="node" />
  </div>
</template>

<script setup>
defineProps({ block: Object });
</script>

<!-- SlateNode.vue -->
<template>
  <template v-if="!node.type">{{ node.text }}</template>
  <a v-else-if="node.type === 'link'" :href="node.data?.url" :data-node-id="node.nodeId">
    <SlateNode v-for="(c, i) in node.children" :key="i" :node="c" />
  </a>
  <component v-else :is="node.type" :data-node-id="node.nodeId">
    <SlateNode v-for="(c, i) in node.children" :key="i" :node="c" />
  </component>
</template>

<script setup>
defineProps({ node: Object });
</script>
```

### Svelte

```svelte
<!-- SlateBlock.svelte -->
<script>
  import SlateNode from './SlateNode.svelte';
  export let block;
</script>

<div data-block-uid={block['@uid']} data-edit-text="value">
  {#each block.value || [] as node, i (i)}
    <SlateNode {node} />
  {/each}
</div>

<!-- SlateNode.svelte -->
<script>
  export let node;
</script>

{#if node.text !== undefined}
  {node.text}
{:else if node.type === 'link'}
  <a href={node.data?.url} data-node-id={node.nodeId}>{#each node.children || [] as c, i (i)}<svelte:self node={c} />{/each}</a>
{:else}
  <svelte:element this={node.type} data-node-id={node.nodeId}>{#each node.children || [] as c, i (i)}<svelte:self node={c} />{/each}</svelte:element>
{/if}
```

</block>

</fields>
