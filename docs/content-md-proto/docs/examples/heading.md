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
  - { uid: 882e7872-bcf3-4234-a510-d1cff6bf2f7f, type: teaser }
  - { uid: ref-heading-schema, type: codeExample }
  - { id: ref-heading-schema-javascript-f00bc9 }
  - { uid: ref-heading-json-data, type: codeExample }
  - { id: ref-heading-json-data-json-87c435 }
  - { uid: ref-heading-rendering, type: codeExample }
  - { id: ref-heading-rendering-jsx-eb01a3 }
  - { id: ref-heading-rendering-vue-754dc2 }
  - { id: ref-heading-rendering-svelte-f5f71c }
prototypes: |
  <block type="title" _="${h1}" />
  <block type="slate" value="${p|h*|ul|ol|blockquote/slate}" />
  <block type="separator" _="${hr}" />
  <block type="teaser" title="${h/text}" href="${h/link}" description="${p/text}" />
  <block type="codeExample">
    <region name="tabs" widget="object_list">
      <block type="tab" label="${h3/text}" language="${pre/lang}" code="${pre/text}" />
    </region>
  </block>
  <block type="gridBlock" headline="${h/text}">
    <region name="blocks" widget="blocks_layout">
      <block type="teaser" title="${h/text}" description="${p/text}" />
    </region>
  </block>
---

# 

<block type="slate">

A standalone heading block that renders as h1–h6 based on a configurable tag field. Unlike headings inside a slate block, this is a dedicated block type with its own heading text field.

</block>

<block type="separator">

---

<fields data='{"styles":{"align":"full","backgroundColor":"transparent","noLine":false}}' />

</block>

<block type="introduction" data='{"value":[{"children":[{"text":"Lorem ipsum vitae elit libero, a pharetra augue. Nulla vitae elit libero, a pharetra augue. Duis mollis, est non commodo luctus, nisi erat porttitor ligula, eget lacinia odio sem nec elit. Donec ullamcorper nulla non metus auctor fringilla. Vivamus sagittis lacus vel augue laoreet rutrum faucibus dolor auctor. Vestibulum id ligula porta felis euismod semper."}],"type":"p"}]}' />

<block type="separator">

---

<fields data='{"styles":{"align":"full"}}' />

</block>

<block type="introduction" data='{"value":[{"children":[{"text":"Highlight Title H2 "}],"type":"h2"}]}' />

<block type="slate">

Lorem ipsum vitae elit libero, a pharetra augue. Nulla vitae elit libero, a pharetra augue. Duis mollis, est non commodo luctus, nisi erat porttitor ligula, eget lacinia odio sem nec elit. Donec ullamcorper nulla non metus auctor fringilla. Vivamus sagittis lacus vel augue laoreet rutrum faucibus dolor auctor. Vestibulum id ligula porta felis euismod semper.

</block>

<block type="separator">

---

<fields data='{"styles":{"align":"full"}}' />

</block>

## Headline H2

<block type="slate">

Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat. Duis autem vel eum iriure dolor in hendrerit in vulputate velit esse molestie consequat, vel illum dolore eu feugiat nulla facilisis at vero eros et accumsan et iusto odio dignissim qui blandit praesent luptatum zzril delenit augue duis dolore te feugait nulla facilisi.

</block>

### Headline H3

<block type="slate">

Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat. Duis autem vel eum iriure dolor in hendrerit in vulputate velit esse molestie consequat, vel illum dolore eu feugiat nulla facilisis at vero eros et accumsan et iusto odio dignissim qui blandit praesent luptatum zzril delenit augue duis dolore te feugait nulla facilisi.

</block>

<block type="separator">

---

<fields data='{"styles":{"align":"full"}}' />

</block>

<block type="gridBlock">

## Block Title

<block type="teaser">

### [Teaser Title H2](/docs/examples/content-types/page)

Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat. Duis autem vel eum iriure dolor in hendrerit in vulputate velit esse molestie consequat, vel illum dolore eu feugiat nulla facilisis at vero eros et accumsan et iusto odio dignissim qui blandit praesent luptatum zzril delenit augue duis dolore te feugait nulla facilisi.

<fields data='{"head_title":null,"styles":{"align":"left"}}' />

</block>

</block>

<block type="codeExample" templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-heading" slotId="schema">

### Schema

```javascript
{
  "heading": {
    "blockSchema": {
      "properties": {
        "heading": {
          "title": "Heading"
        },
        "tag": {
          "title": "Tag",
          "widget": "select",
          "choices": [
            [
              "h1",
              "h1"
            ],
            [
              "h2",
              "h2"
            ],
            [
              "h3",
              "h3"
            ],
            [
              "h4",
              "h4"
            ],
            [
              "h5",
              "h5"
            ],
            [
              "h6",
              "h6"
            ]
          ]
        }
      }
    }
  }
}
```

</block>

<block type="codeExample" templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-heading" slotId="json-data">

### JSON Block Data

```json
{
  "@type": "heading",
  "heading": "Getting Started",
  "tag": "h2"
}
```

</block>

<block type="codeExample" templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-heading" slotId="rendering">

### React

```jsx
function HeadingBlock({ block }) {
  const Tag = block.tag || 'h2';
  const text = block.heading || '';

  return (
    <Tag data-block-uid={block['@uid']} data-edit-text="heading">
      {text}
    </Tag>
  );
}
```

### Vue

```vue
<template>
  <component :is="block.tag || 'h2'" :data-block-uid="block['@uid']" data-edit-text="heading">
    {{ block.heading }}
  </component>
</template>

<script setup>
defineProps({ block: Object });
</script>
```

### Svelte

```svelte
<script>
  export let block;
</script>

<svelte:element this={block.tag || 'h2'} data-block-uid={block['@uid']} data-edit-text="heading">
  {block.heading}
</svelte:element>
```

</block>
