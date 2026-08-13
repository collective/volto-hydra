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
blocks:
  - ccff41c6-b733-4b88-b02e-4c07460a19e2: title
  - ref-text-description: slate
  - editor-screenshot: image
  - da904eda-9add-496c-ab09-4fee9820af1f: slate
  - 244197b5-ac86-4d92-b235-18986a351580: separator
  - 5783a103-3129-48f8-80af-f7ad7af1efa4: slate
  - 9704c0d2-3e17-41c6-b3f6-9ae051d8c2f8: slate
  - 2abcc2af-dc78-4ca6-8882-6682f7e9a5b9: slate
  - 8df2a31d-76a5-445c-aacc-0437c48331d8: slate
  - 3a2f8507-01bf-49a4-a670-2159005075df: slate
  - 9aa1cf78-c6dd-4f31-8673-4a3fc2653add: slate
  - 291012a9-ca10-4011-9121-32a210f24d58: slate
  - 55df52be-8681-4d09-a17b-f32f31632213: separator
  - cd44a7ba-b521-41fb-a609-0d1b8d9df592: heading
  - 801d735a-2d81-428e-a4e9-85d1e82c3639: separator
  - 910a3f25-0318-41b3-a1a6-6e35cdf83451: slate
  - 486c4646-de10-40a9-9470-58b7b1449240: slate
  - f0a56edf-a963-4177-877c-76d9a4d6c20b: slate
  - 00146980-5c86-4ecd-a84e-d373183231ad: slate
  - ref-text-schema: codeExample
  - ref-text-json-data: codeExample
  - ref-text-rendering: codeExample
---

:::title{uid="ccff41c6-b733-4b88-b02e-4c07460a19e2"}
:::

Rich text block powered by the Slate editor. Supports paragraphs, headings, lists, blockquotes, and inline formatting (bold, italic, strikethrough, underline, code, links).

:::image{uid="editor-screenshot" align="center" size="l" url="${src}" alt="${alt}"}
![The slate example block being edited in Volto Hydra](/docs/images/slate-edit)
:::

Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet. Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet.

:::separator{uid="244197b5-ac86-4d92-b235-18986a351580"}
:::

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

:::separator{uid="55df52be-8681-4d09-a17b-f32f31632213"}
:::

:::heading{uid="cd44a7ba-b521-41fb-a609-0d1b8d9df592" alignment="left" tag="h2"}
```field:heading
 Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet. Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet. 
```
:::

:::separator{uid="801d735a-2d81-428e-a4e9-85d1e82c3639"}
:::

## Überschrift zweiter Ordnung (Headline H2)

Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet. Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet.

### Überschrift dritter Ordnung (Headline H3)

Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet. Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet

:::codeExample{uid="ref-text-schema" templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-text" slotId="schema"}
::::tabs[items]{repeat="h3" label="${1/text}" language="${2/lang}" code="${2/code}" @ids=["ref-text-schema-javascript-6ffd2e"]}
### Schema

```javascript
{
  "slate": {
    "blockSchema": {
      "properties": {
        "value": {
          "title": "Text",
          "widget": "slate"
        }
      }
    }
  }
}
```
::::
:::

:::codeExample{uid="ref-text-json-data" templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-text" slotId="json-data"}
::::tabs[items]{repeat="h3" label="${1/text}" language="${2/lang}" code="${2/code}" @ids=["ref-text-json-data-json-f6d82b"]}
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
::::
:::

:::codeExample{uid="ref-text-rendering" templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-text" slotId="rendering"}
::::tabs[items]{repeat="h3" label="${1/text}" language="${2/lang}" code="${2/code}" @ids=["ref-text-rendering-jsx-076433","ref-text-rendering-vue-54b4b7","ref-text-rendering-svelte-2aa474"]}
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
::::
:::
