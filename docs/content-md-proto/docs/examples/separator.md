---
"@type": Document
UID: 546e82cce6c842d0a4046a0131539bd2
allow_discussion: false
contributors: []
creators:
  - admin
description: >-
  
  The separator block allows blocks or groups of blocks to be visually separated
  by a horizontal line.
effective: 2023-07-06T18:35:00
exclude_from_nav: false
expires: null
id: separator
language: "##DEFAULT##"
layout: document_view
preview_caption: null
preview_image: null
review_state: published
rights: ""
subjects:
  - blocks
  - text
title: Separator
assignments:
  - { uid: 47b1e791-6f01-4b9b-a923-6658e7bc7871, type: title }
  - { uid: ref-separator-description, type: slate }
  - { uid: editor-screenshot, type: image }
  - { uid: dee0a2a5-dda7-407d-be26-1cecf1ba55a6, type: separator }
  - { uid: be9ea3ae-29e1-41b8-b338-f32070a82675, type: introduction }
  - { uid: cf7e08f3-b9a8-4604-b208-e3a8bc88ec83, type: separator }
  - { uid: 360c5f14-05d0-4292-afcb-e4edb164addc, type: slate }
  - { uid: 6d7874ae-a64d-4e79-8264-ef56cebd4ccf, type: slate }
  - { uid: a4eccaa5-e954-4c35-9d1d-bd3ce3a68691, type: separator }
  - { uid: d4d24182-f2b9-4f42-8775-92ceeabeb962, type: image }
  - { uid: a10b2026-51da-421a-a2b7-1e9617362366, type: separator }
  - { uid: d65027a5-7bc8-476b-8061-779ba923b04a, type: image }
  - { uid: 16d92364-84f3-4ef1-a24a-8d217ee15456, type: slate }
  - { uid: e28cf868-7156-445c-a512-dba929aa6977, type: slate }
  - { uid: da5327a4-144c-4327-a38e-98a58643f9d0, type: separator }
  - { uid: 9128144d-66f8-4943-8b1d-253cb11431de, type: image }
  - { uid: 462237eb-7cbe-4fc3-8fcb-7cd18eeeaf7f, type: slate }
  - { uid: 512e7346-36b6-4b57-a4ee-54c23ea27aa0, type: slate }
  - { uid: ef3f8f79-11c3-4495-b98f-15f0568645b5, type: separator }
  - { uid: 9c102ef1-5044-41cf-9859-025b23a90c26, type: image }
  - { uid: c209c305-cde3-497d-9a58-3dc642f3cb5d, type: slate }
  - { uid: c0f46bdd-58ae-48a1-9ee7-a9ba780d7386, type: slate }
  - { uid: ref-separator-schema, type: codeExample }
  - { id: ref-separator-schema-javascript-3157d9 }
  - { uid: ref-separator-json-data, type: codeExample }
  - { id: ref-separator-json-data-json-9d890c }
  - { uid: ref-separator-rendering, type: codeExample }
  - { id: ref-separator-rendering-jsx-470901 }
  - { id: ref-separator-rendering-vue-4281a1 }
  - { id: ref-separator-rendering-svelte-8c1d19 }
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

A horizontal rule used to visually divide sections of content. Supports an alignment style property.

<block type="image" url="/docs/images/separator-edit" alt="The separator example block being edited in Volto Hydra" align="center" size="l" />

<block type="separator" data='{"styles":{"align":"full"}}' />

<block type="introduction" data='{"value":[{"children":[{"text":"Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat."}],"type":"p"}]}' />

<block type="separator" data='{"styles":{"align":"full"}}' />

Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat. Duis autem vel eum iriure dolor in hendrerit in vulputate velit esse molestie consequat, vel illum dolore eu feugiat nulla facilisis at vero eros et accumsan et iusto odio dignissim qui blandit praesent luptatum zzril delenit augue duis dolore te feugait nulla facilisi.

Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat. Duis autem vel eum iriure dolor in hendrerit in vulputate velit esse molestie consequat, vel illum dolore eu feugiat nulla facilisis at vero eros et accumsan et iusto odio dignissim qui blandit praesent luptatum zzril delenit augue duis dolore te feugait nulla facilisi.

<block type="separator" data='{"styles":{"align":"center"}}' />

<block type="image" align="center" description="Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt." size="l" title="Title Image" url="/docs/examples/content-types/image-dark" data='{"credit":{}}' />

<block type="separator" data='{"styles":{"align":"center"}}' />

<block type="image" align="right" description="Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt." size="l" title="Title Image" url="/docs/examples/content-types/image-dark" data='{"credit":{},"styles":{"size:noprefix":"large"}}' />

## Text Heading H2

Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat. Duis autem iusto odio dignissim qui blandit praesent luptatum zzril delenit auguevel eum iriure dolor in hendrerit in vulputate velit esse molestie consequat, vel illum dolore blandit praesent luptatum zzril qu. Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat. Duis autem vel eum iriure dolor in hendrerit in vulputate velit esse molestie consequat, vel illum dolore eu feugiat nulla facilisis at vero eros et accumsan et iusto odio dignissim qui blandit praesent luptatum zzril delenit augue duis dolore te feugait nulla facilisi.&#x20;

<block type="separator" data='{"styles":{"align":"left"}}' />

<block type="image" align="left" description="Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt." size="m" title="Title Image" url="/docs/examples/content-types/image-dark" data='{"credit":{},"styles":{"size:noprefix":"medium"}}' />

### Text Heading H3

Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat. Duis autem iusto odio dignissim qui blandit praesent luptatum zzril delenit auguevel eum iriure dolor in hendrerit in vulputate velit esse molestie consequat, vel illum dolore blandit praesent luptatum zzril qu. Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat. Duis autem vel eum iriure dolor in hendrerit in vulputate velit esse molestie consequat, vel illum dolore eu feugiat nulla facilisis at vero eros et accumsan et iusto odio dignissim qui blandit praesent luptatum zzril delenit augue duis dolore te feugait nulla facilisi.&#x20;

<block type="separator" data='{"styles":{"align":"left"}}' />

<block type="image" align="left" description="Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt." size="s" title="Title Image" url="/docs/examples/content-types/image-dark" data='{"credit":{},"styles":{"size:noprefix":"small"}}' />

### Text Heading H3

Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat. Duis autem iusto odio dignissim qui blandit praesent luptatum zzril delenit auguevel eum iriure dolor in hendrerit in vulputate velit esse molestie consequat, vel illum dolore blandit praesent luptatum zzril qu. Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat. Duis autem vel eum iriure dolor in hendrerit in vulputate velit esse molestie consequat, vel illum dolore eu feugiat nulla facilisis at vero eros et accumsan et iusto odio dignissim qui blandit praesent luptatum zzril delenit augue duis dolore te feugait nulla facilisi.&#x20;

<block type="codeExample" templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-separator" slotId="schema">

### Schema

```javascript
{
  "separator": {
    "blockSchema": {
      "properties": {
        "styles": {
          "title": "Styles"
        }
      }
    }
  }
}
```

</block>

<block type="codeExample" templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-separator" slotId="json-data">

### JSON Block Data

```json
{
  "@type": "separator",
  "styles": {
    "align": "center"
  }
}
```

</block>

<block type="codeExample" templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-separator" slotId="rendering">

### React

```jsx
function SeparatorBlock({ block }) {
  const align = block.styles?.align || 'full';

  return (
    <div data-block-uid={block['@uid']} className={`separator-block separator-${align}`}>
      <hr />
    </div>
  );
}
```

### Vue

```vue
<template>
  <div :data-block-uid="block['@uid']" :class="'separator-block separator-' + (block.styles?.align || 'full')">
    <hr />
  </div>
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

<div data-block-uid={block['@uid']} class="separator-block separator-{block.styles?.align || 'full'}">
  <hr />
</div>
```

</block>
