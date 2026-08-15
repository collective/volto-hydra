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
is_folderish: true
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
  - { id: ref-introduction-schema-javascript-e14a03 }
  - { uid: ref-introduction-json-data, type: codeExample }
  - { id: ref-introduction-json-data-json-d959f7 }
  - { uid: ref-introduction-rendering, type: codeExample }
  - { id: ref-introduction-rendering-jsx-599242 }
  - { id: ref-introduction-rendering-vue-53106b }
  - { id: ref-introduction-rendering-svelte-9e2b59 }
prototypes: |
  <block type="title" _="${h1}" />
  <block type="slate" value="${p|h*|ul|ol|blockquote/slate}" />
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

Displays the page's title and description as a styled header. The introduction block has no content of its own — it reads title and description from the page metadata.

<block type="image" url="/docs/images/introduction-edit" alt="The introduction example block being edited in Volto Hydra" align="center" size="l" />

<block type="separator">

---

<fields data='{"styles":{"align":"full"}}' />

</block>

<block type="introduction" data='{"value":[{"children":[{"text":"Highlight Title H2 "}],"type":"h2"}]}' />

Lorem ipsum vitae elit libero, a pharetra augue. Nulla vitae elit libero, a pharetra augue. Duis mollis, est non commodo luctus, nisi erat porttitor ligula, eget lacinia odio sem nec elit. Donec ullamcorper nulla non metus auctor fringilla. Vivamus sagittis lacus vel augue laoreet rutrum faucibus dolor auctor. Vestibulum id ligula porta felis euismod semper.

<block type="separator">

---

<fields data='{"styles":{"align":"full"}}' />

</block>

## Headline H2

Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat. Duis autem vel eum iriure dolor in hendrerit in vulputate velit esse molestie consequat, vel illum dolore eu feugiat nulla facilisis at vero eros et accumsan et iusto odio dignissim qui blandit praesent luptatum zzril delenit augue duis dolore te feugait nulla facilisi.

<block type="codeExample" templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-introduction" slotId="schema">

### Schema

```javascript
{
  "introduction": {
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

</block>

<block type="codeExample" templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-introduction" slotId="json-data">

### JSON Block Data

```json
{
  "@type": "introduction",
  "value": [
    {
      "type": "p",
      "children": [
        {
          "text": "A short introductory paragraph that sets the context for the page."
        }
      ]
    }
  ]
}
```

</block>

<block type="codeExample" templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-introduction" slotId="rendering">

### React

```jsx
function IntroductionBlock({ block }) {
  return (
    <div data-block-uid={block['@uid']} className="introduction-block">
      <div className="introduction-body" data-edit-text="value">
        {(block.value || []).map((node, i) => (
          <SlateNode key={i} node={node} />
        ))}
      </div>
    </div>
  );
}
```

### Vue

```vue
<template>
  <div :data-block-uid="block['@uid']" class="introduction-block">
    <div class="introduction-body" data-edit-text="value">
      <SlateNode v-for="(node, i) in block.value || []" :key="i" :node="node" />
    </div>
  </div>
</template>

<script setup>
import SlateNode from './SlateNode.vue';
defineProps({ block: Object });
</script>
```

### Svelte

```svelte
<script>
  import SlateNode from './SlateNode.svelte';
  export let block;
</script>

<div data-block-uid={block['@uid']} class="introduction-block">
  <div class="introduction-body" data-edit-text="value">
    {#each block.value || [] as node, i (i)}
      <SlateNode {node} />
    {/each}
  </div>
</div>
```

</block>
