---
"@type": Document
UID: 40a436ad604f4f80aeafe0977806760a
allow_discussion: false
contributors: []
creators:
  - admin
description: >-
  
  The image block allows images to be embedded in various display formats.
  Images can be displayed in different sizes (100%, L, M, S) and aligned left,
  right or center of the text flow.
effective: 2023-07-06T18:35:00
exclude_from_nav: false
expires: null
id: image-block
is_folderish: true
language: "##DEFAULT##"
layout: document_view
preview_caption: null
preview_image:
  blob_path: docs/examples/image-block/preview_image/black-starry-night.jpg
  content-type: image/jpeg
  filename: black-starry-night.jpg
  height: 1708
  size: 693013
  width: 2400
review_state: published
rights: ""
subjects:
  - blocks
  - media
title: Image
assignments:
  - { uid: 4bfc973c-5fbf-45a3-819a-750a3eff4def, type: title }
  - { uid: ref-image-description, type: slate }
  - { uid: editor-screenshot, type: image }
  - { uid: ed863393-7692-4cc3-8b39-503591d4ea80, type: slate }
  - { uid: bcc07f9d-7f53-450a-b3f4-20286fd66692, type: image }
  - { uid: e8178fee-0fb3-405d-8c81-cf47c1d2139f, type: slate }
  - { uid: 3b647cba-a65f-4d55-9a50-9c8b37c52372, type: slate }
  - { uid: 0f4f3139-9386-4023-9c50-add562acab5d, type: image }
  - { uid: cd47ee9d-014f-4726-ad87-91d35b6f5231, type: slate }
  - { uid: e68341fb-401f-4a19-84e9-ae1dc73db915, type: slate }
  - { uid: 1bf3b6c3-8db1-4293-9088-00d1c5b8c91c, type: image }
  - { uid: 961969c7-1292-4c3e-bf4f-557fb87f4342, type: slate }
  - { uid: 44bc28fb-2431-46c8-9c1f-ec09cde7dae5, type: slate }
  - { uid: d48b2411-07fd-4911-8185-56e8760abab5, type: image }
  - { uid: c4eddbb6-cb34-479f-bf35-52adc6dd0f4e, type: slate }
  - { uid: 5ea2e916-7224-43ad-adc8-7bd6b4fadf53, type: slate }
  - { uid: bd53c8f5-d1eb-49e1-ac9d-463e0c50d4ce, type: slate }
  - { uid: b7d57c29-c082-4b41-b6e0-7ccf83d46b97, type: image }
  - { uid: b6bf35d7-7536-4a32-9821-4ae209de88fe, type: slate }
  - { uid: ref-image-schema, type: codeExample }
  - { id: ref-image-schema-javascript-979df6 }
  - { uid: ref-image-json-data, type: codeExample }
  - { id: ref-image-json-data-json-ddd34d }
  - { uid: ref-image-rendering, type: codeExample }
  - { id: ref-image-rendering-jsx-a59bc5 }
  - { id: ref-image-rendering-vue-c3dead }
  - { id: ref-image-rendering-svelte-52a7e2 }
prototypes: |
  <block type="title" _="${h1}" />
  <block type="slate" value="${p|h*|ul|ol|blockquote/slate}" />
  <block type="image" description="${p/text}" url="${img/src}" alt="${img/alt}" align="center" size="l" image_field="image" title="Image" />
  <block type="image" url="${img/src}" alt="${img/alt}" align="center" size="l" image_field="image" title="Image" />
  <block type="codeExample">
    <region name="tabs" widget="object_list">
      <block type="tab" label="${h3/text}" language="${pre/lang}" code="${pre/text}" />
    </region>
  </block>
---

# 

Displays an image with optional alt text and link. Supports the image picker widget for selecting images from the Plone content tree or uploading new ones.

<block type="image" url="/docs/images/image-block-edit" alt="The image-block example block being edited in Volto Hydra" align="center" size="l" />

## Bild-block (Standard Size)

<block type="image" align="wide" size="l" title="Headline H2" url="/docs/examples/content-types/image-dark" data='{"credit":{},"description":"Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet. Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum."}' />

## Bild-Block (Full Width )

Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet. Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet.

<block type="image" align="full" size="l" title="Headline H2" url="/docs/examples/content-types/image-dark" data='{"credit":{},"description":"Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet. Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum."}' />

## Bild-Block (Align: center)

Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet. Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet.

<block type="image" align="center" size="l" title="Headline H2" url="/docs/examples/content-types/image-dark" data='{"credit":{},"description":"Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit ata sanctus est Lorem ipsum dolor sit amet."}' />

## Bild-Block (Align: Left)

The Bild-Block can be aligned to the left with text floating around it on the right side.

<block type="image" align="left" size="l" title="Headline H2" url="/docs/examples/content-types/image-dark" data='{"credit":{},"description":"Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet. "}' />

Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet.Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet.Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet.Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet.

## Bild-Block (Align Right)

The Bild-Block can be aligned to the right with text floating around it on the left side.

<block type="image" align="right" size="l" title="Headline H2" url="/docs/examples/content-types/image-dark" data='{"credit":{},"description":"Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet. Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum."}' />

Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet. Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum.Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet. Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua.

<block type="codeExample" templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-image" slotId="schema">

### Schema

```javascript
{
  "image": {
    "fieldMappings": {
      "@default": {
        "image": "url",
        "@id": "href",
        "title": "alt"
      }
    },
    "blockSchema": {
      "properties": {
        "url": {
          "title": "Image",
          "widget": "image"
        },
        "alt": {
          "title": "Alt Text"
        },
        "href": {
          "title": "Link",
          "widget": "object_browser",
          "mode": "link"
        }
      }
    }
  }
}
```

</block>

<block type="codeExample" templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-image" slotId="json-data">

### JSON Block Data

```json
{
  "@type": "image",
  "url": "data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%27600%27 height=%27400%27%3E%3Crect width=%27100%25%27 height=%27100%25%27 fill=%27%2377aadd%27/%3E%3Ctext x=%2750%25%27 y=%2750%25%27 fill=%27white%27 text-anchor=%27middle%27 font-size=%2724%27%3ETest Image%3C/text%3E%3C/svg%3E",
  "alt": "A description of the image",
  "href": [
    {
      "@id": "/target-page"
    }
  ]
}
```

</block>

<block type="codeExample" templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-image" slotId="rendering">

### React

```jsx
import { getImageUrl } from './utils.js';

function ImageBlock({ block }) {
  const src = getImageUrl(block.url);
  const alt = block.alt || '';
  const href = block.href?.[0]?.['@id'] || block.href;

  const img = src
    ? <img data-edit-media="url" src={src} alt={alt} />
    : <div data-edit-media="url" style={{height:100,background:'#e5e7eb',display:'flex',alignItems:'center',justifyContent:'center',borderRadius:4,cursor:'pointer'}}>Click to add image</div>;

  return (
    <div data-block-uid={block['@uid']}>
      {href ? (
        <a href={href} data-edit-link="href">{img}</a>
      ) : (
        <>{img}</>
      )}
    </div>
  );
}
```

### Vue

```vue
<template>
  <div :data-block-uid="block['@uid']">
    <a v-if="href" :href="href" data-edit-link="href">
      <img data-edit-media="url" :src="imgSrc" :alt="block.alt" />
    </a>
    <img v-else data-edit-media="url" :src="imgSrc" :alt="block.alt" />
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { getImageUrl } from './utils.js';
const props = defineProps({ block: Object });
const href = computed(() => props.block.href?.[0]?.['@id'] || props.block.href);
const imgSrc = computed(() => getImageUrl(props.block.url));
</script>
```

### Svelte

```svelte
<script>
  import { getImageUrl } from './utils.js';
  export let block;
  $: href = block.href?.[0]?.['@id'] || block.href;
  $: imgSrc = getImageUrl(block.url);
</script>

<div data-block-uid={block['@uid']}>
  {#if href}
    <a {href} data-edit-link="href">
      <img data-edit-media="url" src={imgSrc} alt={block.alt} />
    </a>
  {:else}
    <img data-edit-media="url" src={imgSrc} alt={block.alt} />
  {/if}
</div>
```

</block>
