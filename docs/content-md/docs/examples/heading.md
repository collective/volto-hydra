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
blocks:
  - e58cca3c-95d4-4819-951d-48415706bf41: title
  - ref-heading-description: slate
  - 4a0352d5-89df-48aa-944e-7270e81351d4: separator
  - faabad67-4aa2-4774-a48c-b1accf288700: introduction
  - fe637263-126e-4a7f-b4aa-36369c5155cc: separator
  - 36960cee-ec85-458b-b0be-d2e7a5a41e5f: introduction
  - 36960cee-ec85-458b-b0be-d2e7a5a41e5f-split-1: slate
  - e328753b-d914-4bcb-8b8b-2d5060476efe: separator
  - 06a960a6-795c-409d-a55f-94d5047e3514: slate
  - b4691078-153d-451f-9b47-fa6f852a1e6c: slate
  - 7a405d27-e5ca-426c-bca4-e40cc338f7ba: slate
  - 7ebc67e3-e666-43f4-9fce-5dc14f98834f: slate
  - 0126e819-d955-41c5-a736-2f0b5ffda8a1: separator
  - 1bedcc9d-1c02-44e8-bb8e-5c46d6c67d3d: gridBlock
  - ref-heading-schema: codeExample
  - ref-heading-json-data: codeExample
  - ref-heading-rendering: codeExample
---

<block type="title" uid="e58cca3c-95d4-4819-951d-48415706bf41" />

A standalone heading block that renders as h1–h6 based on a configurable tag field. Unlike headings inside a slate block, this is a dedicated block type with its own heading text field.

<block type="separator" uid="4a0352d5-89df-48aa-944e-7270e81351d4" data='{"styles":{"align":"full","backgroundColor":"transparent","noLine":false}}' />

<block type="introduction" uid="faabad67-4aa2-4774-a48c-b1accf288700">

Lorem ipsum vitae elit libero, a pharetra augue. Nulla vitae elit libero, a pharetra augue. Duis mollis, est non commodo luctus, nisi erat porttitor ligula, eget lacinia odio sem nec elit. Donec ullamcorper nulla non metus auctor fringilla. Vivamus sagittis lacus vel augue laoreet rutrum faucibus dolor auctor. Vestibulum id ligula porta felis euismod semper.

</block>

<block type="separator" uid="fe637263-126e-4a7f-b4aa-36369c5155cc" data='{"styles":{"align":"full"}}' />

<block type="introduction" uid="36960cee-ec85-458b-b0be-d2e7a5a41e5f">

## Highlight Title H2&#x20;

</block>

Lorem ipsum vitae elit libero, a pharetra augue. Nulla vitae elit libero, a pharetra augue. Duis mollis, est non commodo luctus, nisi erat porttitor ligula, eget lacinia odio sem nec elit. Donec ullamcorper nulla non metus auctor fringilla. Vivamus sagittis lacus vel augue laoreet rutrum faucibus dolor auctor. Vestibulum id ligula porta felis euismod semper.

<block type="separator" uid="e328753b-d914-4bcb-8b8b-2d5060476efe" data='{"styles":{"align":"full"}}' />

## Headline H2

Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat. Duis autem vel eum iriure dolor in hendrerit in vulputate velit esse molestie consequat, vel illum dolore eu feugiat nulla facilisis at vero eros et accumsan et iusto odio dignissim qui blandit praesent luptatum zzril delenit augue duis dolore te feugait nulla facilisi.

### Headline H3

Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat. Duis autem vel eum iriure dolor in hendrerit in vulputate velit esse molestie consequat, vel illum dolore eu feugiat nulla facilisis at vero eros et accumsan et iusto odio dignissim qui blandit praesent luptatum zzril delenit augue duis dolore te feugait nulla facilisi.

<block type="separator" uid="0126e819-d955-41c5-a736-2f0b5ffda8a1" data='{"styles":{"align":"full"}}' />

<block type="gridBlock" uid="1bedcc9d-1c02-44e8-bb8e-5c46d6c67d3d" headline="Block Title" data='{"styles":{}}'>

<block type="teaser" uid="882e7872-bcf3-4234-a510-d1cff6bf2f7f" title="Teaser Title H2" data='{"head_title":null,"href":[{"@id":"/docs/examples/content-types/page","@type":"Document","Description":"The Page content type can be used to display content on a single page of the website. Pages can be structured using text, images and blocks.","Title":"Page","getRemoteUrl":null,"hasPreviewImage":true,"head_title":null,"image_field":"preview_image","title":"Page"}],"styles":{"align":"left"}}'>

```field:description
Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat. Duis autem vel eum iriure dolor in hendrerit in vulputate velit esse molestie consequat, vel illum dolore eu feugiat nulla facilisis at vero eros et accumsan et iusto odio dignissim qui blandit praesent luptatum zzril delenit augue duis dolore te feugait nulla facilisi.
```

</block>

</block>

<block type="codeExample" uid="ref-heading-schema" templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-heading" slotId="schema">

<region name="tabs" widget="object_list" repeat="h3" label="${1/text}" language="${2/lang}" code="${2/code}" data='{"@ids":["ref-heading-schema-javascript-f00bc9"]}'>

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

</region>

</block>

<block type="codeExample" uid="ref-heading-json-data" templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-heading" slotId="json-data">

<region name="tabs" widget="object_list" repeat="h3" label="${1/text}" language="${2/lang}" code="${2/code}" data='{"@ids":["ref-heading-json-data-json-87c435"]}'>

### JSON Block Data

```json
{
  "@type": "heading",
  "heading": "Getting Started",
  "tag": "h2"
}
```

</region>

</block>

<block type="codeExample" uid="ref-heading-rendering" templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-heading" slotId="rendering">

<region name="tabs" widget="object_list" repeat="h3" label="${1/text}" language="${2/lang}" code="${2/code}" data='{"@ids":["ref-heading-rendering-jsx-eb01a3","ref-heading-rendering-vue-754dc2","ref-heading-rendering-svelte-f5f71c"]}'>

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

</region>

</block>
