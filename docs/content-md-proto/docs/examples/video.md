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
  - { uid: 604e5248-8521-403d-9e5f-3f50d1229454, type: title }
  - { uid: ref-video-description, type: slate }
  - { uid: editor-screenshot, type: image }
  - { uid: 7ace8ba6-13cb-4a5c-ab1c-fc6f8ce8737c, type: slate }
  - { uid: c97a926c-b2d2-4a73-9691-fc6e1aca6c52, type: video }
  - { uid: 30c476a0-65fe-4e3a-895e-f59f6695929b, type: slate }
  - { uid: 42767d3a-3186-4e50-843d-3ea96c380943, type: video }
  - { uid: 458576df-767e-4412-9e9f-2733e8334d5d, type: separator }
  - { uid: e6e1484a-c2c2-4788-a8c4-a26a979d18cd, type: slate }
  - { uid: 38e88a05-b1b0-4958-af71-b3bd6e37297f, type: slate }
  - { uid: 70d958cb-14b6-4689-84ad-cd3aa4ac19ee, type: video }
  - { uid: 45a46c1b-f619-4e95-9b8c-932d524336af, type: separator }
  - { uid: 3664a470-22c4-47d9-8a30-89c34f1f7c99, type: slate }
  - { uid: 0d092cea-0518-428c-8aaa-c90a7cff183f, type: slate }
  - { uid: 205fa3ab-9358-46f3-81d6-4ea90dc8c290, type: video }
  - { uid: c9eb00a4-23c8-4a13-a19d-9ee056646e16, type: slate }
  - { uid: 5212b457-984a-4666-ab67-7c9f6429b2a7, type: slate }
  - { uid: b75aeb62-6aca-440b-ab6d-66b063dbdab9, type: slate }
  - { uid: 19a3d50a-a683-4e59-ac7c-d2ba2149cdd7, type: video }
  - { uid: 49a61581-70ce-4810-84c2-1d91ac421197, type: slate }
  - { uid: ref-video-schema, type: codeExample }
  - { uid: ref-video-json-data, type: codeExample }
  - { uid: ref-video-rendering, type: codeExample }
prototypes: |
  <block type="title"      _="${h1}" />
  <block type="slate"      value="${p|h2|h3|h4|h5|h6|ul|ol|blockquote/slate}" />
  <block type="image"      description="${p/text}" url="${img/src}" alt="${img/alt}" align="center" size="l" />
---

# Video

Embeds a video from a URL. Detects YouTube links and renders an iframe embed; otherwise falls back to an HTML5 \<video> element.

![The video example block being edited in Volto Hydra](/docs/images/video-edit)

## Video-Block (Full Width)

<block type="video" uid="c97a926c-b2d2-4a73-9691-fc6e1aca6c52" align="full" url="https://www.youtube.com/watch?v=_yaYy86jdk8" data='{"styles":{}}' />

## Video-Block (Standard Size)

<block type="video" uid="42767d3a-3186-4e50-843d-3ea96c380943" align="wide" url="https://www.youtube.com/watch?v=_yaYy86jdk8" data='{"styles":{}}' />

<block type="separator" uid="458576df-767e-4412-9e9f-2733e8334d5d" data='{"styles":{"align":"full"}}' />

### Headline H2

Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat. Duis autem vel eum iriure dolor in hendrerit in vulputate velit esse molestie consequat, vel illum dolore eu feugiat nulla facilisis at vero eros et accumsan et iusto odio dignissim qui blandit praesent luptatum zzril delenit augue duis dolore te feugait nulla facilisi.

<block type="video" uid="70d958cb-14b6-4689-84ad-cd3aa4ac19ee" align="center" url="https://www.youtube.com/watch?v=_yaYy86jdk8" data='{"styles":{}}' />

<block type="separator" uid="45a46c1b-f619-4e95-9b8c-932d524336af" data='{"styles":{"align":"left"}}' />

### Video-Block (Align: Left)

The Video-Block can be aligned to the left with text floating around it on the right side.

<block type="video" uid="205fa3ab-9358-46f3-81d6-4ea90dc8c290" align="left" preview_image="http://localhost:8080/Plone/docs/examples/content-types/image-dark" url="https://www.youtube.com/watch?v=_yaYy86jdk8" data='{"styles":{}}' />

Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet. Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet.Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam. Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat quis nostrud exerci tation ullamcorper ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat quis Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam.

### Video Block (Align Right)

The Video-Block can be aligned to the right with text floating around it on the left side.

<block type="video" uid="19a3d50a-a683-4e59-ac7c-d2ba2149cdd7" align="right" preview_image="http://localhost:8080/Plone/docs/examples/content-types/image-dark" url="https://www.youtube.com/watch?v=_yaYy86jdk8" data='{"styles":{}}' />

Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet. Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet.Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam. Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat quis nostrud exerci tation ullamcorper ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat quis Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam. Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt

<block type="codeExample" uid="ref-video-schema" templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-video" slotId="schema" data='{"tabs":[{"@id":"ref-video-schema-javascript-104794","label":"Schema","language":"javascript","code":"{\n  \"video\": {\n    \"blockSchema\": {\n      \"properties\": {\n        \"url\": {\n          \"title\": \"Video URL\"\n        },\n        \"controls\": {\n          \"title\": \"Show controls\",\n          \"type\": \"boolean\",\n          \"default\": true\n        },\n        \"autoplay\": {\n          \"title\": \"Autoplay\",\n          \"type\": \"boolean\",\n          \"default\": false\n        },\n        \"loop\": {\n          \"title\": \"Loop\",\n          \"type\": \"boolean\",\n          \"default\": false\n        },\n        \"muted\": {\n          \"title\": \"Muted (required for autoplay)\",\n          \"type\": \"boolean\",\n          \"default\": false\n        }\n      }\n    }\n  }\n}"}]}' />

<block type="codeExample" uid="ref-video-json-data" templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-video" slotId="json-data" data='{"tabs":[{"@id":"ref-video-json-data-json-9ce28f","label":"JSON Block Data","language":"json","code":"{\n  \"@type\": \"video\",\n  \"url\": \"https://www.youtube.com/watch?v=dQw4w9WgXcQ\"\n}"}]}' />

<block type="codeExample" uid="ref-video-rendering" templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-video" slotId="rendering" data='{"tabs":[{"@id":"ref-video-rendering-jsx-b3c5ea","label":"React","language":"jsx","code":"function VideoBlock({ block }) {\n  const url = block.url || &#39;&#39;;\n  const youtubeId = url.match(/(?:youtu\\.be\\/|youtube\\.com\\/(?:watch\\?v=|embed\\/))([^&amp;?/]+)/)?.[1];\n\n  return (\n    <div data-block-uid={block[&#39;@uid&#39;]} className=\"video-block\">\n      {youtubeId ? (\n        <iframe\n          src={`https://www.youtube.com/embed/${youtubeId}`}\n          allowFullScreen\n          style={{ width: &#39;100%&#39;, aspectRatio: &#39;16/9&#39;, border: &#39;none&#39; }}\n        />\n      ) : url ? (\n        <video src={url} controls style={{ width: &#39;100%&#39; }} />\n      ) : (\n        <p>No video URL set</p>\n      )}\n    </div>\n  );\n}"},{"@id":"ref-video-rendering-vue-160de2","label":"Vue","language":"vue","code":"<template>\n  <div :data-block-uid=\"block[&#39;@uid&#39;]\" class=\"video-block\">\n    <iframe\n      v-if=\"youtubeId\"\n      :src=\"`https://www.youtube.com/embed/${youtubeId}`\"\n      allowfullscreen\n      style=\"width: 100%; aspect-ratio: 16/9; border: none\"\n    />\n    <video v-else-if=\"block.url\" :src=\"block.url\" controls style=\"width: 100%\" />\n    <p v-else>No video URL set</p>\n  </div>\n</template>\n\n<script setup>\nimport { computed } from &#39;vue&#39;;\nconst props = defineProps({ block: Object });\nconst youtubeId = computed(() => {\n  const url = props.block.url || &#39;&#39;;\n  return url.match(/(?:youtu\\.be\\/|youtube\\.com\\/(?:watch\\?v=|embed\\/))([^&amp;?/]+)/)?.[1];\n});\n</script>"},{"@id":"ref-video-rendering-svelte-b4e8ba","label":"Svelte","language":"svelte","code":"<script>\n  export let block;\n  $: url = block.url || &#39;&#39;;\n  $: youtubeId = url.match(/(?:youtu\\.be\\/|youtube\\.com\\/(?:watch\\?v=|embed\\/))([^&amp;?/]+)/)?.[1];\n</script>\n\n<div data-block-uid={block[&#39;@uid&#39;]} class=\"video-block\">\n  {#if youtubeId}\n    <iframe\n      src=\"https://www.youtube.com/embed/{youtubeId}\"\n      allowfullscreen\n      style=\"width: 100%; aspect-ratio: 16/9; border: none\"\n      title=\"Video\"\n    />\n  {:else if url}\n    <video src={url} controls style=\"width: 100%\">\n      <track kind=\"captions\" />\n    </video>\n  {:else}\n    <p>No video URL set</p>\n  {/if}\n</div>"}]}' />
