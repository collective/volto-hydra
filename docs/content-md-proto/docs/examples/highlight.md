---
"@type": Document
UID: 8416628543f146ff9a18d281c03e2399
allow_discussion: false
contributors: []
creators:
  - admin
description: >-
  
  The highlight block allows you to highlight and tease a single piece of
  content. The content is displayed with a large image and a title and
  description in a banderole.
effective: 2023-07-06T18:35:00
exclude_from_nav: false
expires: null
id: highlight
is_folderish: true
language: "##DEFAULT##"
layout: document_view
preview_caption: null
preview_image:
  blob_path: docs/examples/highlight/preview_image/black-starry-night.jpg
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
title: Highlight
blocks-assignments:
  - { uid: af3c704a-1f80-48c8-843b-dc29368d43d9 }
  - { uid: ref-highlight-description }
  - { uid: editor-screenshot }
  - { uid: 8d932379-1247-4281-bd30-dfecd5b3c378 }
  - { uid: 417e7343-af04-4da4-96bf-29321a3e0fc6 }
  - { uid: 67a6a73a-5ae7-4e14-a11b-bd0139e56513 }
  - { uid: 25a0a1b5-3ce9-468f-8968-9a7f83ca4e53 }
  - { uid: 94655cc3-817d-48ba-bc20-6e9f7796dc46 }
  - { uid: ref-highlight-schema }
  - { id: ref-highlight-schema-javascript-80590c }
  - { uid: ref-highlight-json-data }
  - { id: ref-highlight-json-data-json-a2bfa3 }
  - { uid: ref-highlight-rendering }
  - { id: ref-highlight-rendering-jsx-659b6c }
  - { id: ref-highlight-rendering-vue-dd8730 }
  - { id: ref-highlight-rendering-svelte-d3a4c8 }
blocks-matched: |
  <block type="slate" value="${p,h*,ul,ol,blockquote/slate}" />
  <block type="title" _="${h1}" />
  <block type="image" description="${p/text}" url="${img/src}" alt="${img/alt}" align="center" size="l" image_field="image" title="Image" />
  <block type="image" url="${img/src}" alt="${img/alt}" align="center" size="l" image_field="image" title="Image" />
  <block type="codeExample">
    <region name="tabs" widget="object_list">
      <block type="tab" label="${h3/text}" language="${pre/lang}" code="${pre/text}" />
    </region>
  </block>
---

# 

A prominent content section with a background image, overlay, title, rich text body, and an optional call-to-action link. Used for feature callouts and banners.

<block type="image" url="/docs/images/highlight-edit" alt="The highlight example block being edited in Volto Hydra" align="center" size="l" />

<block type="highlight" title="Highlight-Block" cta_title="Button" image="/docs/examples/content-types/image/@@images/image" data-json='{"styles":{"descriptionColor":"highlight-custom-color-1"},"description":[{"children":[{"text":"Lorem ipsum dolor sit amet, "},{"children":[{"text":"consetetur sadipscing"}],"data":{"url":"/docs/examples/button"},"type":"link"},{"text":" elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt."}],"type":"p"}],"cta_link":[{"@id":"/docs/examples/content-types/page"}]}' />

<block type="highlight" title="Highlight-Block" cta_title="Button" image="/docs/examples/content-types/image/@@images/image" data-json='{"styles":{"descriptionColor":"highlight-custom-color-2"},"description":[{"children":[{"text":"Lorem ipsum dolor sit amet, "},{"children":[{"text":"consetetur sadipscing"}],"data":{"url":"/docs/examples/button"},"type":"link"},{"text":" elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt."}],"type":"p"}],"cta_link":[{"@id":"/docs/examples/content-types/page"}]}' />

<block type="highlight" title="Highlight-Block" cta_title="Button" image="/docs/examples/content-types/image/@@images/image" data-json='{"styles":{"descriptionColor":"highlight-custom-color-3"},"description":[{"children":[{"text":"Lorem ipsum dolor sit amet, "},{"children":[{"text":"consetetur sadipscing"}],"data":{"url":"/docs/examples/button"},"type":"link"},{"text":" elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt."}],"type":"p"}],"cta_link":[{"@id":"/docs/examples/content-types/page"}]}' />

<block type="highlight" title="Highlight-Block" cta_title="Button" image="/docs/examples/content-types/image/@@images/image" data-json='{"styles":{"descriptionColor":"highlight-custom-color-4"},"description":[{"children":[{"text":"Lorem ipsum dolor sit amet, "},{"children":[{"text":"consetetur sadipscing"}],"data":{"url":"/docs/examples/button"},"type":"link"},{"text":" elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt."}],"type":"p"}],"cta_link":[{"@id":"/docs/examples/content-types/page"}]}' />

<block type="highlight" title="Highlight-Block" cta_title="Button" image="/docs/examples/content-types/image/@@images/image" data-json='{"styles":{"descriptionColor":"highlight-custom-color-5"},"description":[{"children":[{"text":"Lorem ipsum dolor sit amet, "},{"children":[{"text":"consetetur sadipscing"}],"data":{"url":"/docs/examples/button"},"type":"link"},{"text":" elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt."}],"type":"p"}],"cta_link":[{"@id":"/docs/examples/content-types/page"}]}' />

<block type="codeExample" templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-highlight" slotId="schema">

### Schema

```javascript
{
  "highlight": {
    "blockSchema": {
      "properties": {
        "title": {
          "title": "Title"
        },
        "description": {
          "title": "Description",
          "widget": "slate"
        },
        "image": {
          "title": "Background Image",
          "widget": "image"
        },
        "cta_title": {
          "title": "CTA Text"
        },
        "cta_link": {
          "title": "CTA Link",
          "widget": "object_browser",
          "mode": "link"
        }
      }
    }
  }
}
```

</block>

<block type="codeExample" templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-highlight" slotId="json-data">

### JSON Block Data

```json
{
  "@type": "highlight",
  "title": "Featured Content",
  "description": [
    {
      "type": "p",
      "children": [
        {
          "text": "Discover the latest updates and features available in this release."
        }
      ]
    }
  ],
  "image": "data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%27800%27 height=%27400%27%3E%3Crect width=%27100%25%27 height=%27100%25%27 fill=%27%23334455%27/%3E%3Ctext x=%2750%25%27 y=%2750%25%27 fill=%27white%27 text-anchor=%27middle%27 font-size=%2724%27%3EHighlight BG%3C/text%3E%3C/svg%3E",
  "cta_title": "Read More",
  "cta_link": [
    {
      "@id": "/news/latest"
    }
  ]
}
```

</block>

<block type="codeExample" templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-highlight" slotId="rendering">

### React

```jsx
const highlightGradients = {
  'highlight-custom-color-1': 'linear-gradient(135deg, #1e3a5f, #2563eb)',
  'highlight-custom-color-2': 'linear-gradient(135deg, #064e3b, #059669)',
  'highlight-custom-color-3': 'linear-gradient(135deg, #581c87, #9333ea)',
  'highlight-custom-color-4': 'linear-gradient(135deg, #78350f, #d97706)',
  'highlight-custom-color-5': 'linear-gradient(135deg, #881337, #e11d48)',
};

import { getImageUrl } from './utils.js';

function HighlightBlock({ block }) {
  const title = block.title || '';
  const description = block.description || [];
  const imageSrc = getImageUrl(block.image);
  const ctaText = block.cta_title || '';
  const ctaLink = block.cta_link?.[0]?.['@id'] || '';
  const gradient = highlightGradients[block.styles?.descriptionColor] || 'linear-gradient(135deg, #334, #556)';
  const bgStyle = imageSrc
    ? { backgroundImage: `url(${imageSrc})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : { background: gradient };

  return (
    <section
      data-block-uid={block['@uid']}
      className="highlight-block"
      style={{ ...bgStyle, padding: '40px 20px', color: 'white', borderRadius: '8px' }}
    >
      <div className="highlight-overlay" style={{ background: 'rgba(0,0,0,0.4)', padding: '30px', borderRadius: '8px' }}>
        <h2 data-edit-text="title">{title}</h2>
        <div className="highlight-body" data-edit-text="description">
          {description.map((node, i) => (
            <SlateNode key={i} node={node} />
          ))}
        </div>
        {ctaText && (
          <a href={ctaLink} data-edit-text="cta_title" data-edit-link="cta_link" className="highlight-cta"
            style={{ display: 'inline-block', padding: '10px 20px', background: '#007eb1', color: 'white', textDecoration: 'none', borderRadius: '4px', marginTop: '16px' }}>
            {ctaText}
          </a>
        )}
      </div>
    </section>
  );
}
```

### Vue

```vue
<template>
  <section
    :data-block-uid="block['@uid']"
    class="highlight-block"
    :style="{ ...bgStyle, padding: '40px 20px', color: 'white', borderRadius: '8px' }"
  >
    <div class="highlight-overlay" style="background:rgba(0,0,0,0.4);padding:30px;border-radius:8px">
      <h2 data-edit-text="title">{{ block.title }}</h2>
      <div class="highlight-body" data-edit-text="description">
        <SlateNode v-for="(node, i) in block.description || []" :key="i" :node="node" />
      </div>
      <a
        v-if="block.cta_title"
        :href="ctaLink"
        data-edit-text="cta_title"
        data-edit-link="cta_link"
        class="highlight-cta"
        style="display:inline-block;padding:10px 20px;background:#007eb1;color:white;text-decoration:none;border-radius:4px;margin-top:16px"
      >
        {{ block.cta_title }}
      </a>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue';
const props = defineProps({ block: Object });
const ctaLink = computed(() => props.block.cta_link?.[0]?.['@id'] || '');

const gradients = {
  'highlight-custom-color-1': 'linear-gradient(135deg, #1e3a5f, #2563eb)',
  'highlight-custom-color-2': 'linear-gradient(135deg, #064e3b, #059669)',
  'highlight-custom-color-3': 'linear-gradient(135deg, #581c87, #9333ea)',
  'highlight-custom-color-4': 'linear-gradient(135deg, #78350f, #d97706)',
  'highlight-custom-color-5': 'linear-gradient(135deg, #881337, #e11d48)',
};
const bgStyle = computed(() => {
  if (props.block.image) {
    return { backgroundImage: `url(${props.block.image})`, backgroundSize: 'cover', backgroundPosition: 'center' };
  }
  const gradient = gradients[props.block.styles?.descriptionColor] || 'linear-gradient(135deg, #334, #556)';
  return { background: gradient };
});
</script>
```

### Svelte

```svelte
<script>
  import SlateNode from './SlateNode.svelte';
  export let block;
  $: ctaLink = block.cta_link?.[0]?.['@id'] || '';

  const gradients = {
    'highlight-custom-color-1': 'linear-gradient(135deg, #1e3a5f, #2563eb)',
    'highlight-custom-color-2': 'linear-gradient(135deg, #064e3b, #059669)',
    'highlight-custom-color-3': 'linear-gradient(135deg, #581c87, #9333ea)',
    'highlight-custom-color-4': 'linear-gradient(135deg, #78350f, #d97706)',
    'highlight-custom-color-5': 'linear-gradient(135deg, #881337, #e11d48)',
  };
  $: gradient = gradients[block.styles?.descriptionColor] || 'linear-gradient(135deg, #334, #556)';
  $: bgStyle = block.image
    ? `background-image:url(${block.image});background-size:cover;background-position:center`
    : `background:${gradient}`;
</script>

<section
  data-block-uid={block['@uid']}
  class="highlight-block"
  style="{bgStyle};padding:40px 20px;color:white;border-radius:8px"
>
  <div class="highlight-overlay" style="background:rgba(0,0,0,0.4);padding:30px;border-radius:8px">
    <h2 data-edit-text="title">{block.title}</h2>
    <div class="highlight-body" data-edit-text="description">
      {#each block.description || [] as node, i (i)}
        <SlateNode {node} />
      {/each}
    </div>
    {#if block.cta_title}
      <a href={ctaLink} data-edit-text="cta_title" data-edit-link="cta_link" class="highlight-cta"
        style="display:inline-block;padding:10px 20px;background:#007eb1;color:white;text-decoration:none;border-radius:4px;margin-top:16px">
        {block.cta_title}
      </a>
    {/if}
  </div>
</section>
```

</block>
