---
"@type": Document
UID: 3906609d0456404ca7146f6aa1f12f32
allow_discussion: false
contributors: []
creators:
  - admin
description: The table of contents block automatically generates a table of
  contents with links to the corresponding positions on the page from the
  headings used.
effective: 2023-07-06T18:35:00
exclude_from_nav: false
expires: null
id: toc
language: "##DEFAULT##"
layout: document_view
preview_caption: null
preview_image:
  blob_path: docs/examples/toc/preview_image/black-starry-night.jpg
  content-type: image/jpeg
  filename: black-starry-night.jpg
  height: 1708
  size: 693013
  width: 2400
review_state: published
rights: ""
subjects:
  - blocks
  - navigation
title: Table of Contents
blocks:
  - 537a9742-95f1-4930-9df3-d38766f54a71: title
  - ref-toc-description: slate
  - editor-screenshot: image
  - 22f22002-2159-4e42-942a-8ebc6e930ed5: toc
  - 60a17689-6437-4a88-bf2c-76a62351ca5b: separator
  - 89137ab1-3973-437f-be95-7e91586a4685: image
  - e83fea00-1714-4de7-9d79-8d0e749639a9: introduction
  - d91f58fa-4634-4aac-bd1d-5f2fc4b338ca: separator
  - b1cf3854-5836-4efc-897e-d003ceea19f0: slate
  - 43dd5fcf-3f52-469b-8ccc-57b785cf65b1: slate
  - fde62278-7792-46be-ba68-0d4d19a3a677: slate
  - 9313e80c-65d1-4d72-863f-fc1c17aba444: slate
  - 741da11b-703b-43ab-a9df-a7c1087d059a: slate
  - 2e03fd8c-f334-400e-a3a9-d0446e3a1512: slate
  - 372b9489-5dc4-44a7-a7a9-649c2bc282db: slate
  - c08671c1-ca6c-4a5a-85b8-5c856bc112df: slate
  - c95cd0fd-f914-4dca-9adb-f7438b0a3112: slate
  - 2b54caa5-1c1a-40f2-aacd-84abce141e79: slate
  - 09460f92-723d-402d-a0a5-76a15f2678ad: slate
  - 3e036171-0a20-47d0-a06a-a7f493b65186: separator
  - ref-toc-schema: codeExample
  - ref-toc-json-data: codeExample
  - ref-toc-rendering: codeExample
---

<block type="title" uid="537a9742-95f1-4930-9df3-d38766f54a71" />

Renders a table of contents generated from heading blocks on the current page. It scans sibling blocks for headings and builds a navigation list.

<block type="image" uid="editor-screenshot" align="center" size="l" url="${src}" alt="${alt}">

![The toc example block being edited in Volto Hydra](/docs/images/toc-edit)

</block>

<block type="toc" uid="22f22002-2159-4e42-942a-8ebc6e930ed5" title="Inhaltsverzeichnis" variation="default" />

<block type="separator" uid="60a17689-6437-4a88-bf2c-76a62351ca5b" data='{"styles":{"align":"full"}}' />

<block type="image" uid="89137ab1-3973-437f-be95-7e91586a4685" align="wide" copyright_and_sources="Copyright: unsplash.com" description="Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt." size="l" title="Title Image" url="${src}" data='{"styles":{"size:noprefix":"large"}}'>

![](/docs/examples/content-types/image-dark)

</block>

<block type="introduction" uid="e83fea00-1714-4de7-9d79-8d0e749639a9">

Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat.&#x20;

</block>

<block type="separator" uid="d91f58fa-4634-4aac-bd1d-5f2fc4b338ca" data='{"styles":{"align":"full"}}' />

<block type="slate" uid="b1cf3854-5836-4efc-897e-d003ceea19f0" data='{"styles":{}}'>

## Text Heading H2&#x20;

</block>

<block type="slate" uid="43dd5fcf-3f52-469b-8ccc-57b785cf65b1" data='{"styles":{}}'>

Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat. Duis autem vel eum iriure dolor in hendrerit in vulputate velit esse molestie consequat, vel illum dolore eu feugiat nulla facilisis at vero eros et accumsan et iusto odio dignissim qui blandit praesent luptatum zzril delenit augue duis dolore te feugait nulla facilisi.

</block>

<block type="slate" uid="fde62278-7792-46be-ba68-0d4d19a3a677" data='{"styles":{}}'>

### Text Heading H3

</block>

<block type="slate" uid="9313e80c-65d1-4d72-863f-fc1c17aba444" data='{"styles":{}}'>

Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat. Duis autem vel eum iriure dolor in hendrerit in vulputate velit esse molestie consequat, vel illum dolore eu feugiat nulla facilisis at vero eros et accumsan et iusto odio dignissim qui blandit praesent luptatum zzril delenit augue duis dolore te feugait nulla facilisi.

</block>

<block type="slate" uid="741da11b-703b-43ab-a9df-a7c1087d059a" data='{"styles":{}}'>

## Lists

</block>

<block type="slate" uid="2e03fd8c-f334-400e-a3a9-d0446e3a1512" data='{"styles":{}}'>

1. Ordered List Bullett Point One&#x20;
2. Ordered List Bullett Point Two&#x20;
3. Ordered List Bullett Point Three
4. Ordered List Bullett Point Four

</block>

<block type="slate" uid="372b9489-5dc4-44a7-a7a9-649c2bc282db" data='{"styles":{}}'>

- Ordered List Bullett Point One&#x20;
- Ordered List Bullett Point Two&#x20;
- Ordered List Bullett Point Three
- Ordered List Bullett Point Four

</block>

<block type="slate" uid="c08671c1-ca6c-4a5a-85b8-5c856bc112df" data='{"styles":{}}'>

### Inline Styles

</block>

<block type="slate" uid="c95cd0fd-f914-4dca-9adb-f7438b0a3112" data='{"styles":{}}'>

Text can be **bold** or *italic*.

</block>

<block type="slate" uid="2b54caa5-1c1a-40f2-aacd-84abce141e79" data='{"styles":{}}'>

[Link internal](/docs/examples/heading)

</block>

<block type="slate" uid="09460f92-723d-402d-a0a5-76a15f2678ad" data='{"styles":{}}'>

[Link external](https://www.google.com/)

</block>

<block type="separator" uid="3e036171-0a20-47d0-a06a-a7f493b65186" data='{"styles":{"align":"left"}}' />

<block type="codeExample" uid="ref-toc-schema" templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-toc" slotId="schema">

<region name="tabs" widget="object_list" repeat="h3" label="${1/text}" language="${2/lang}" code="${2/code}" data='{"items":[{"@id":"ref-toc-schema-javascript-496d15"}]}'>

### Schema

```javascript
{
  "toc": {
    "blockSchema": {
      "properties": {
        "title": {
          "title": "Title"
        },
        "hide_title": {
          "title": "Hide title",
          "type": "boolean"
        },
        "ordered": {
          "title": "Ordered",
          "type": "boolean"
        },
        "levels": {
          "title": "Entries",
          "isMulti": true,
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

<block type="codeExample" uid="ref-toc-json-data" templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-toc" slotId="json-data">

<region name="tabs" widget="object_list" repeat="h3" label="${1/text}" language="${2/lang}" code="${2/code}" data='{"items":[{"@id":"ref-toc-json-data-json-aaa910"}]}'>

### JSON Block Data

```json
{
  "@type": "toc",
  "title": "On this page",
  "hide_title": false,
  "ordered": false,
  "levels": [
    "h2",
    "h3"
  ]
}
```

</region>

</block>

<block type="codeExample" uid="ref-toc-rendering" templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-toc" slotId="rendering">

<region name="tabs" widget="object_list" repeat="h3" label="${1/text}" language="${2/lang}" code="${2/code}" data='{"items":[{"@id":"ref-toc-rendering-jsx-ee2124"},{"@id":"ref-toc-rendering-vue-12aef2"},{"@id":"ref-toc-rendering-svelte-397c7f"}]}'>

### React

```jsx
function TocBlock({ block, content }) {
  const entries = [];
  if (content?.blocks && content?.blocks_layout?.items) {
    for (const id of content.blocks_layout.items) {
      const b = content.blocks[id];
      if (!b) continue;
      if (b['@type'] === 'heading' && b.heading) {
        entries.push({ id, level: parseInt((b.tag || 'h2').slice(1)), text: b.heading });
      } else if (b['@type'] === 'slate' && b.value?.[0]?.type?.match(/^h[1-6]$/)) {
        const level = parseInt(b.value[0].type.slice(1));
        const text = b.plaintext || b.value[0].children?.map(c => c.text).join('') || '';
        if (text.trim()) entries.push({ id, level, text });
      }
    }
  }

  return (
    <nav data-block-uid={block['@uid']} className="toc-block">
      {entries.length > 0 ? (
        <ul>
          {entries.map(e => (
            <li key={e.id} style={{ marginLeft: `${(e.level - 2) * 1.5}em` }}>
              <a href={`#${e.id}`}>{e.text}</a>
            </li>
          ))}
        </ul>
      ) : (
        <p>Table of Contents</p>
      )}
    </nav>
  );
}
```

### Vue

```vue
<template>
  <nav :data-block-uid="block['@uid']" class="toc-block">
    <ul v-if="entries.length">
      <li v-for="e in entries" :key="e.id" :style="{ marginLeft: (e.level - 2) * 1.5 + 'em' }">
        <a :href="`#${e.id}`">{{ e.text }}</a>
      </li>
    </ul>
    <p v-else>Table of Contents</p>
  </nav>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({ block: Object, content: Object });

const entries = computed(() => {
  const result = [];
  const c = props.content;
  if (!c?.blocks || !c?.blocks_layout?.items) return result;
  for (const id of c.blocks_layout.items) {
    const b = c.blocks[id];
    if (!b) continue;
    if (b['@type'] === 'heading' && b.heading) {
      result.push({ id, level: parseInt((b.tag || 'h2').slice(1)), text: b.heading });
    } else if (b['@type'] === 'slate' && b.value?.[0]?.type?.match(/^h[1-6]$/)) {
      const level = parseInt(b.value[0].type.slice(1));
      const text = b.plaintext || b.value[0].children?.map(c => c.text).join('') || '';
      if (text.trim()) result.push({ id, level, text });
    }
  }
  return result;
});
</script>
```

### Svelte

```svelte
<script>
  export let block;
  export let content = {};

  $: entries = (() => {
    const result = [];
    if (!content?.blocks || !content?.blocks_layout?.items) return result;
    for (const id of content.blocks_layout.items) {
      const b = content.blocks[id];
      if (!b) continue;
      if (b['@type'] === 'heading' && b.heading) {
        result.push({ id, level: parseInt((b.tag || 'h2').slice(1)), text: b.heading });
      } else if (b['@type'] === 'slate' && b.value?.[0]?.type?.match(/^h[1-6]$/)) {
        const level = parseInt(b.value[0].type.slice(1));
        const text = b.plaintext || b.value[0].children?.map(c => c.text).join('') || '';
        if (text.trim()) result.push({ id, level, text });
      }
    }
    return result;
  })();
</script>

<nav data-block-uid={block['@uid']} class="toc-block">
  {#if entries.length > 0}
    <ul>
      {#each entries as e (e.id)}
        <li style="margin-left: {(e.level - 2) * 1.5}em">
          <a href="#{e.id}">{e.text}</a>
        </li>
      {/each}
    </ul>
  {:else}
    <p>Table of Contents</p>
  {/if}
</nav>
```

</region>

</block>
