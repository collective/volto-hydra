---
"@type": Document
UID: 6d37dd19ef754344aaa254fa288e44b4
allow_discussion: false
contributors: []
creators:
  - admin
description: |-
  
  The video block can contain videos from YouTube.
effective: 2023-07-06T18:35:00
exclude_from_nav: false
expires: null
id: video
is_folderish: true
language: "##DEFAULT##"
layout: document_view
preview_caption: null
preview_image: null
review_state: published
rights: ""
subjects:
  - blocks
  - media
title: Video
assignments:
  - { uid: 604e5248-8521-403d-9e5f-3f50d1229454 }
  - { uid: ref-video-description }
  - { uid: editor-screenshot }
  - { uid: 7ace8ba6-13cb-4a5c-ab1c-fc6f8ce8737c }
  - { uid: c97a926c-b2d2-4a73-9691-fc6e1aca6c52 }
  - { uid: 30c476a0-65fe-4e3a-895e-f59f6695929b }
  - { uid: 42767d3a-3186-4e50-843d-3ea96c380943 }
  - { uid: 458576df-767e-4412-9e9f-2733e8334d5d }
  - { uid: e6e1484a-c2c2-4788-a8c4-a26a979d18cd }
  - { uid: 38e88a05-b1b0-4958-af71-b3bd6e37297f }
  - { uid: 70d958cb-14b6-4689-84ad-cd3aa4ac19ee }
  - { uid: 45a46c1b-f619-4e95-9b8c-932d524336af }
  - { uid: 3664a470-22c4-47d9-8a30-89c34f1f7c99 }
  - { uid: 0d092cea-0518-428c-8aaa-c90a7cff183f }
  - { uid: 205fa3ab-9358-46f3-81d6-4ea90dc8c290 }
  - { uid: c9eb00a4-23c8-4a13-a19d-9ee056646e16 }
  - { uid: 5212b457-984a-4666-ab67-7c9f6429b2a7 }
  - { uid: b75aeb62-6aca-440b-ab6d-66b063dbdab9 }
  - { uid: 19a3d50a-a683-4e59-ac7c-d2ba2149cdd7 }
  - { uid: 49a61581-70ce-4810-84c2-1d91ac421197 }
  - { uid: ref-video-schema }
  - { id: ref-video-schema-javascript-104794 }
  - { uid: ref-video-json-data }
  - { id: ref-video-json-data-json-9ce28f }
  - { uid: ref-video-rendering }
  - { id: ref-video-rendering-jsx-b3c5ea }
  - { id: ref-video-rendering-vue-160de2 }
  - { id: ref-video-rendering-svelte-b4e8ba }
prototypes: |
  <block type="slate" value="${p,h*,ul,ol,blockquote/slate}" />
  <block type="title" _="${h1}" />
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

Embeds a video from a URL. Detects YouTube links and renders an iframe embed; otherwise falls back to an HTML5 \<video> element.

<block type="image" url="/docs/images/video-edit" alt="The video example block being edited in Volto Hydra" align="center" size="l" />

## Video-Block (Full Width)

<block type="video" align="full" url="https://www.youtube.com/watch?v=_yaYy86jdk8" data-json='{"styles":{}}' />

## Video-Block (Standard Size)

<block type="video" align="wide" url="https://www.youtube.com/watch?v=_yaYy86jdk8" data-json='{"styles":{}}' />

<block type="separator">

---

<fields data-json='{"styles":{"align":"full"}}' />

</block>

### Headline H2

Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat. Duis autem vel eum iriure dolor in hendrerit in vulputate velit esse molestie consequat, vel illum dolore eu feugiat nulla facilisis at vero eros et accumsan et iusto odio dignissim qui blandit praesent luptatum zzril delenit augue duis dolore te feugait nulla facilisi.

<block type="video" align="center" url="https://www.youtube.com/watch?v=_yaYy86jdk8" data-json='{"styles":{}}' />

<block type="separator">

---

<fields data-json='{"styles":{"align":"left"}}' />

</block>

### Video-Block (Align: Left)

The Video-Block can be aligned to the left with text floating around it on the right side.

<block type="video" align="left" preview_image="http://localhost:8080/Plone/docs/examples/content-types/image-dark" url="https://www.youtube.com/watch?v=_yaYy86jdk8" data-json='{"styles":{}}' />

Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet. Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet.Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam. Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat quis nostrud exerci tation ullamcorper ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat quis Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam.

### Video Block (Align Right)

The Video-Block can be aligned to the right with text floating around it on the left side.

<block type="video" align="right" preview_image="http://localhost:8080/Plone/docs/examples/content-types/image-dark" url="https://www.youtube.com/watch?v=_yaYy86jdk8" data-json='{"styles":{}}' />

Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet. Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet.Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam. Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat quis nostrud exerci tation ullamcorper ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat quis Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam. Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt

<block type="codeExample" templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-video" slotId="schema">

### Schema

```javascript
{
  "video": {
    "blockSchema": {
      "properties": {
        "url": {
          "title": "Video URL"
        },
        "controls": {
          "title": "Show controls",
          "type": "boolean",
          "default": true
        },
        "autoplay": {
          "title": "Autoplay",
          "type": "boolean",
          "default": false
        },
        "loop": {
          "title": "Loop",
          "type": "boolean",
          "default": false
        },
        "muted": {
          "title": "Muted (required for autoplay)",
          "type": "boolean",
          "default": false
        }
      }
    }
  }
}
```

</block>

<block type="codeExample" templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-video" slotId="json-data">

### JSON Block Data

```json
{
  "@type": "video",
  "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
}
```

</block>

<block type="codeExample" templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-video" slotId="rendering">

### React

```jsx
function VideoBlock({ block }) {
  const url = block.url || '';
  const youtubeId = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([^&?/]+)/)?.[1];

  return (
    <div data-block-uid={block['@uid']} className="video-block">
      {youtubeId ? (
        <iframe
          src={`https://www.youtube.com/embed/${youtubeId}`}
          allowFullScreen
          style={{ width: '100%', aspectRatio: '16/9', border: 'none' }}
        />
      ) : url ? (
        <video src={url} controls style={{ width: '100%' }} />
      ) : (
        <p>No video URL set</p>
      )}
    </div>
  );
}
```

### Vue

```vue
<template>
  <div :data-block-uid="block['@uid']" class="video-block">
    <iframe
      v-if="youtubeId"
      :src="`https://www.youtube.com/embed/${youtubeId}`"
      allowfullscreen
      style="width: 100%; aspect-ratio: 16/9; border: none"
    />
    <video v-else-if="block.url" :src="block.url" controls style="width: 100%" />
    <p v-else>No video URL set</p>
  </div>
</template>

<script setup>
import { computed } from 'vue';
const props = defineProps({ block: Object });
const youtubeId = computed(() => {
  const url = props.block.url || '';
  return url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([^&?/]+)/)?.[1];
});
</script>
```

### Svelte

```svelte
<script>
  export let block;
  $: url = block.url || '';
  $: youtubeId = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([^&?/]+)/)?.[1];
</script>

<div data-block-uid={block['@uid']} class="video-block">
  {#if youtubeId}
    <iframe
      src="https://www.youtube.com/embed/{youtubeId}"
      allowfullscreen
      style="width: 100%; aspect-ratio: 16/9; border: none"
      title="Video"
    />
  {:else if url}
    <video src={url} controls style="width: 100%">
      <track kind="captions" />
    </video>
  {:else}
    <p>No video URL set</p>
  {/if}
</div>
```

</block>
