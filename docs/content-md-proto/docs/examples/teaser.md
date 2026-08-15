---
"@type": Document
UID: bd2b39d2745847db82ed197a4eb1effc
allow_discussion: false
contributors: []
creators:
  - admin
description: The teaser block allows you to add an element that teases existing
  website content with an image, a title and a description.
effective: 2023-07-06T18:35:00
exclude_from_nav: false
expires: null
id: teaser
is_folderish: true
language: "##DEFAULT##"
layout: document_view
preview_caption: null
preview_image:
  blob_path: docs/examples/teaser/preview_image/black-starry-night.jpg
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
title: Teaser
assignments:
  - { uid: b986b92c-e180-42d3-b755-4728854e5a50, type: title }
  - { uid: ref-teaser-description, type: slate }
  - { uid: editor-screenshot, type: image }
  - { uid: 61f0e286-0527-43a7-b8fe-29f1be40a8c3, type: teaser }
  - { uid: 03fd3352-0845-4c70-9d01-805996bd127b, type: teaser }
  - { uid: 530939e1-8579-4d37-a111-716475c00cac, type: teaser }
  - { uid: 95648579-7116-401f-a448-e48938c88246, type: teaser }
  - { uid: b798dde4-6a5d-4cef-9e25-fd532e1ea9a7, type: teaser }
  - { uid: 620f0540-8c3d-422d-a1c6-47037b5dbfbc, type: teaser }
  - { uid: ref-teaser-schema, type: codeExample }
  - { id: ref-teaser-schema-javascript-bfff08 }
  - { uid: ref-teaser-json-data, type: codeExample }
  - { id: ref-teaser-json-data-json-7f117c }
  - { uid: ref-teaser-rendering, type: codeExample }
  - { id: ref-teaser-rendering-jsx-d1dd76 }
  - { id: ref-teaser-rendering-vue-fc123a }
  - { id: ref-teaser-rendering-svelte-bf19cf }
prototypes: |
  <block type="title" _="${h1}" />
  <block type="slate" value="${p|h*|ul|ol|blockquote/slate}" />
  <block type="teaser" title="${h/text}" href="${h/link}" description="${p/text}" />
  <block type="image" description="${p/text}" url="${img/src}" alt="${img/alt}" align="center" size="l" image_field="image" title="Image" />
  <block type="image" url="${img/src}" alt="${img/alt}" align="center" size="l" image_field="image" title="Image" />
  <block type="codeExample">
    <region name="tabs" widget="object_list">
      <block type="tab" label="${h3/text}" language="${pre/lang}" code="${pre/text}" />
    </region>
  </block>
---

# 

<block type="slate">

A content preview card that links to another page. Selecting a target page via the object browser auto-fills the title, description, and preview image from that page. Editors can toggle "overwrite" to customize these values.

</block>

<block type="image" url="/docs/images/teaser-edit" alt="The teaser example block being edited in Volto Hydra" align="center" size="l" />

<block type="teaser">

## [Headline H2](/docs/examples/content-types/page)

Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum.

<fields head_title="Head title" data='{"styles":{"align":"center"}}' />

</block>

<block type="teaser">

## [Headline H2](/docs/examples/content-types/page)

Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea.

<fields head_title="Head title" data='{"styles":{"align":"left"}}' />

</block>

<block type="teaser">

## [Headline H2](/docs/examples/content-types/page)

Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea.

<fields head_title="Head title" data='{"styles":{"align":"right"}}' />

</block>

<block type="teaser">

## [Headline H2](/docs/examples/content-types/page)

Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum.

<fields data='{"styles":{"align":"center","backgroundColor":"grey"}}' />

</block>

<block type="teaser">

## [Headline H2](/docs/examples/content-types/page)

Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea.

<fields data='{"styles":{"align":"left","backgroundColor":"grey"}}' />

</block>

<block type="teaser">

## [Headline H2](/docs/examples/content-types/page)

Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea.

<fields data='{"styles":{"align":"right","backgroundColor":"grey"}}' />

</block>

<block type="codeExample" templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-teaser" slotId="schema">

### Schema

```javascript
{
  "teaser": {
    "fieldMappings": {
      "@default": {
        "@id": "href",
        "title": "title",
        "description": "description",
        "image": "preview_image"
      }
    },
    "blockSchema": {
      "properties": {
        "href": {
          "title": "Target",
          "widget": "object_browser",
          "mode": "link"
        },
        "title": {
          "title": "Title"
        },
        "description": {
          "title": "Description",
          "widget": "textarea"
        },
        "preview_image": {
          "title": "Preview Image",
          "widget": "image"
        },
        "overwrite": {
          "title": "Overwrite target content",
          "type": "boolean"
        }
      }
    }
  }
}
```

</block>

<block type="codeExample" templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-teaser" slotId="json-data">

### JSON Block Data

```json
{
  "@type": "teaser",
  "href": [
    {
      "@id": "/news/my-article",
      "title": "My Article",
      "description": "A short summary of the article",
      "hasPreviewImage": true
    }
  ],
  "title": "Custom Title",
  "description": "Custom description overriding the target",
  "preview_image": "data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%27400%27 height=%27300%27%3E%3Crect width=%27100%25%27 height=%27100%25%27 fill=%27%2399bbdd%27/%3E%3Ctext x=%2750%25%27 y=%2750%25%27 fill=%27white%27 text-anchor=%27middle%27 font-size=%2718%27%3ETeaser%3C/text%3E%3C/svg%3E",
  "overwrite": true
}
```

</block>

<block type="codeExample" templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-teaser" slotId="rendering">

### React

```jsx
import { getImageUrl } from './utils.js';

function TeaserBlock({ block }) {
  const hrefObj = block.href?.[0] || null;
  const useBlockData = block.overwrite || !hrefObj?.title;

  const title = useBlockData ? block.title : hrefObj?.title || '';
  const description = useBlockData ? block.description : hrefObj?.description || '';
  // Strip API origin from brain @id so the link resolves same-origin.
  const href = contentPath(hrefObj?.['@id'] || '');
  const imageSrc = block.preview_image
    ? getImageUrl(block.preview_image)
    : (hrefObj?.hasPreviewImage ? getImageUrl({ '@id': `${href}/@@images/preview_image` }) : '');

  if (!href) {
    return (
      <div data-block-uid={block['@uid']} className="teaser-placeholder">
        <p>Select a target page for this teaser</p>
      </div>
    );
  }

  return (
    <div data-block-uid={block['@uid']} className="teaser-block">
      {imageSrc && <img data-edit-media="preview_image" src={imageSrc} alt="" />}
      <h3 data-edit-text="title">{title}</h3>
      <p data-edit-text="description">{description}</p>
      <a href={href} data-edit-link="href">Read more</a>
    </div>
  );
}
```

### Vue

```vue
<template>
  <div :data-block-uid="block['@uid']" class="teaser-block">
    <div v-if="!href" class="teaser-placeholder">
      <p>Select a target page for this teaser</p>
    </div>
    <template v-else>
      <img v-if="imageSrc" data-edit-media="preview_image" :src="imageSrc" alt="" />
      <h3 data-edit-text="title">{{ title }}</h3>
      <p data-edit-text="description">{{ description }}</p>
      <a :href="href" data-edit-link="href">Read more</a>
    </template>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { getImageUrl } from './utils.js';
const props = defineProps({ block: Object });

const hrefObj = computed(() => props.block.href?.[0] || null);
const useBlockData = computed(() => props.block.overwrite || !hrefObj.value?.title);
const title = computed(() => useBlockData.value ? props.block.title : hrefObj.value?.title || '');
const description = computed(() => useBlockData.value ? props.block.description : hrefObj.value?.description || '');
const href = computed(() => contentPath(hrefObj.value?.['@id'] || ''));
const imageSrc = computed(() => {
  if (props.block.preview_image) {
    return getImageUrl(props.block.preview_image);
  }
  return hrefObj.value?.hasPreviewImage ? getImageUrl(`${href.value}/@@images/preview_image`) : '';
});
</script>
```

### Svelte

```svelte
<script>
  import { getImageUrl } from './utils.js';
  export let block;

  $: hrefObj = block.href?.[0] || null;
  $: useBlockData = block.overwrite || !hrefObj?.title;
  $: title = useBlockData ? block.title : hrefObj?.title || '';
  $: description = useBlockData ? block.description : hrefObj?.description || '';
  $: href = contentPath(hrefObj?.['@id'] || '');
  $: imageSrc = block.preview_image
    ? getImageUrl(block.preview_image)
    : (hrefObj?.hasPreviewImage ? getImageUrl(`${href}/@@images/preview_image`) : '');
</script>

{#if !href}
  <div data-block-uid={block['@uid']} class="teaser-placeholder">
    <p>Select a target page for this teaser</p>
  </div>
{:else}
  <div data-block-uid={block['@uid']} class="teaser-block">
    {#if imageSrc}
      <img data-edit-media="preview_image" src={imageSrc} alt="" />
    {/if}
    <h3 data-edit-text="title">{title}</h3>
    <p data-edit-text="description">{description}</p>
    <a {href} data-edit-link="href">Read more</a>
  </div>
{/if}
```

</block>
