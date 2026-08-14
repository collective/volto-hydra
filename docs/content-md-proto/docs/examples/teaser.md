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
  - { uid: ref-teaser-json-data, type: codeExample }
  - { uid: ref-teaser-rendering, type: codeExample }
prototypes: |
  <block type="title"      _="${h1}" />
  <block type="slate"      value="${p|h2|h3|h4|h5|h6|ul|ol|blockquote/slate}" />
  <block type="image"      description="${p/text}" url="${img/src}" alt="${img/alt}" align="center" size="l" />
---

# Teaser

A content preview card that links to another page. Selecting a target page via the object browser auto-fills the title, description, and preview image from that page. Editors can toggle "overwrite" to customize these values.

![The teaser example block being edited in Volto Hydra](/docs/images/teaser-edit)

<block type="teaser" uid="61f0e286-0527-43a7-b8fe-29f1be40a8c3" head_title="Head title" title="Headline H2" data='{"description":"Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum.","href":[{"@id":"/docs/examples/content-types/page","@type":"Document","Description":"The Page content type can be used to display content on a single page of the website. Pages can be structured using text, images and blocks.","Title":"Page","getRemoteUrl":null,"hasPreviewImage":true,"head_title":null,"image_field":"preview_image","title":"Page"}],"styles":{"align":"center"}}' />

<block type="teaser" uid="03fd3352-0845-4c70-9d01-805996bd127b" head_title="Head title" title="Headline H2" data='{"description":"Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea.","href":[{"@id":"/docs/examples/content-types/page","@type":"Document","Description":"The Page content type can be used to display content on a single page of the website. Pages can be structured using text, images and blocks.","Title":"Page","getRemoteUrl":null,"hasPreviewImage":true,"head_title":null,"image_field":"preview_image","title":"Page"}],"styles":{"align":"left"}}' />

<block type="teaser" uid="530939e1-8579-4d37-a111-716475c00cac" head_title="Head title" title="Headline H2" data='{"description":"Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea.","href":[{"@id":"/docs/examples/content-types/page","@type":"Document","Description":"The Page content type can be used to display content on a single page of the website. Pages can be structured using text, images and blocks.","Title":"Page","getRemoteUrl":null,"hasPreviewImage":true,"head_title":null,"image_field":"preview_image","title":"Page"}],"styles":{"align":"right"}}' />

<block type="teaser" uid="95648579-7116-401f-a448-e48938c88246" title="Headline H2" data='{"description":"Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum.","href":[{"@id":"/docs/examples/content-types/page","@type":"Document","Description":"The Page content type can be used to display content on a single page of the website. Pages can be structured using text, images and blocks.","Title":"Page","getRemoteUrl":null,"hasPreviewImage":true,"head_title":null,"image_field":"preview_image","title":"Page"}],"styles":{"align":"center","backgroundColor":"grey"}}' />

<block type="teaser" uid="b798dde4-6a5d-4cef-9e25-fd532e1ea9a7" title="Headline H2" data='{"description":"Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea.","href":[{"@id":"/docs/examples/content-types/page","@type":"Document","Description":"The Page content type can be used to display content on a single page of the website. Pages can be structured using text, images and blocks.","Title":"Page","getRemoteUrl":null,"hasPreviewImage":true,"head_title":null,"image_field":"preview_image","title":"Page"}],"styles":{"align":"left","backgroundColor":"grey"}}' />

<block type="teaser" uid="620f0540-8c3d-422d-a1c6-47037b5dbfbc" title="Headline H2" data='{"description":"Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea.","href":[{"@id":"/docs/examples/content-types/page","@type":"Document","Description":"The Page content type can be used to display content on a single page of the website. Pages can be structured using text, images and blocks.","Title":"Page","getRemoteUrl":null,"hasPreviewImage":true,"head_title":null,"image_field":"preview_image","title":"Page"}],"styles":{"align":"right","backgroundColor":"grey"}}' />

<block type="codeExample" uid="ref-teaser-schema" templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-teaser" slotId="schema" data='{"tabs":[{"@id":"ref-teaser-schema-javascript-bfff08","label":"Schema","language":"javascript","code":"{\n  \"teaser\": {\n    \"fieldMappings\": {\n      \"@default\": {\n        \"@id\": \"href\",\n        \"title\": \"title\",\n        \"description\": \"description\",\n        \"image\": \"preview_image\"\n      }\n    },\n    \"blockSchema\": {\n      \"properties\": {\n        \"href\": {\n          \"title\": \"Target\",\n          \"widget\": \"object_browser\",\n          \"mode\": \"link\"\n        },\n        \"title\": {\n          \"title\": \"Title\"\n        },\n        \"description\": {\n          \"title\": \"Description\",\n          \"widget\": \"textarea\"\n        },\n        \"preview_image\": {\n          \"title\": \"Preview Image\",\n          \"widget\": \"image\"\n        },\n        \"overwrite\": {\n          \"title\": \"Overwrite target content\",\n          \"type\": \"boolean\"\n        }\n      }\n    }\n  }\n}"}]}' />

<block type="codeExample" uid="ref-teaser-json-data" templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-teaser" slotId="json-data" data='{"tabs":[{"@id":"ref-teaser-json-data-json-7f117c","label":"JSON Block Data","language":"json","code":"{\n  \"@type\": \"teaser\",\n  \"href\": [\n    {\n      \"@id\": \"/news/my-article\",\n      \"title\": \"My Article\",\n      \"description\": \"A short summary of the article\",\n      \"hasPreviewImage\": true\n    }\n  ],\n  \"title\": \"Custom Title\",\n  \"description\": \"Custom description overriding the target\",\n  \"preview_image\": \"data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%27400%27 height=%27300%27%3E%3Crect width=%27100%25%27 height=%27100%25%27 fill=%27%2399bbdd%27/%3E%3Ctext x=%2750%25%27 y=%2750%25%27 fill=%27white%27 text-anchor=%27middle%27 font-size=%2718%27%3ETeaser%3C/text%3E%3C/svg%3E\",\n  \"overwrite\": true\n}"}]}' />

<block type="codeExample" uid="ref-teaser-rendering" templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-teaser" slotId="rendering" data='{"tabs":[{"@id":"ref-teaser-rendering-jsx-d1dd76","label":"React","language":"jsx","code":"import { getImageUrl } from &#39;./utils.js&#39;;\n\nfunction TeaserBlock({ block }) {\n  const hrefObj = block.href?.[0] || null;\n  const useBlockData = block.overwrite || !hrefObj?.title;\n\n  const title = useBlockData ? block.title : hrefObj?.title || &#39;&#39;;\n  const description = useBlockData ? block.description : hrefObj?.description || &#39;&#39;;\n  // Strip API origin from brain @id so the link resolves same-origin.\n  const href = contentPath(hrefObj?.[&#39;@id&#39;] || &#39;&#39;);\n  const imageSrc = block.preview_image\n    ? getImageUrl(block.preview_image)\n    : (hrefObj?.hasPreviewImage ? getImageUrl({ &#39;@id&#39;: `${href}/@@images/preview_image` }) : &#39;&#39;);\n\n  if (!href) {\n    return (\n      <div data-block-uid={block[&#39;@uid&#39;]} className=\"teaser-placeholder\">\n        <p>Select a target page for this teaser</p>\n      </div>\n    );\n  }\n\n  return (\n    <div data-block-uid={block[&#39;@uid&#39;]} className=\"teaser-block\">\n      {imageSrc &amp;&amp; <img data-edit-media=\"preview_image\" src={imageSrc} alt=\"\" />}\n      <h3 data-edit-text=\"title\">{title}</h3>\n      <p data-edit-text=\"description\">{description}</p>\n      <a href={href} data-edit-link=\"href\">Read more</a>\n    </div>\n  );\n}"},{"@id":"ref-teaser-rendering-vue-fc123a","label":"Vue","language":"vue","code":"<template>\n  <div :data-block-uid=\"block[&#39;@uid&#39;]\" class=\"teaser-block\">\n    <div v-if=\"!href\" class=\"teaser-placeholder\">\n      <p>Select a target page for this teaser</p>\n    </div>\n    <template v-else>\n      <img v-if=\"imageSrc\" data-edit-media=\"preview_image\" :src=\"imageSrc\" alt=\"\" />\n      <h3 data-edit-text=\"title\">{{ title }}</h3>\n      <p data-edit-text=\"description\">{{ description }}</p>\n      <a :href=\"href\" data-edit-link=\"href\">Read more</a>\n    </template>\n  </div>\n</template>\n\n<script setup>\nimport { computed } from &#39;vue&#39;;\nimport { getImageUrl } from &#39;./utils.js&#39;;\nconst props = defineProps({ block: Object });\n\nconst hrefObj = computed(() => props.block.href?.[0] || null);\nconst useBlockData = computed(() => props.block.overwrite || !hrefObj.value?.title);\nconst title = computed(() => useBlockData.value ? props.block.title : hrefObj.value?.title || &#39;&#39;);\nconst description = computed(() => useBlockData.value ? props.block.description : hrefObj.value?.description || &#39;&#39;);\nconst href = computed(() => contentPath(hrefObj.value?.[&#39;@id&#39;] || &#39;&#39;));\nconst imageSrc = computed(() => {\n  if (props.block.preview_image) {\n    return getImageUrl(props.block.preview_image);\n  }\n  return hrefObj.value?.hasPreviewImage ? getImageUrl(`${href.value}/@@images/preview_image`) : &#39;&#39;;\n});\n</script>"},{"@id":"ref-teaser-rendering-svelte-bf19cf","label":"Svelte","language":"svelte","code":"<script>\n  import { getImageUrl } from &#39;./utils.js&#39;;\n  export let block;\n\n  $: hrefObj = block.href?.[0] || null;\n  $: useBlockData = block.overwrite || !hrefObj?.title;\n  $: title = useBlockData ? block.title : hrefObj?.title || &#39;&#39;;\n  $: description = useBlockData ? block.description : hrefObj?.description || &#39;&#39;;\n  $: href = contentPath(hrefObj?.[&#39;@id&#39;] || &#39;&#39;);\n  $: imageSrc = block.preview_image\n    ? getImageUrl(block.preview_image)\n    : (hrefObj?.hasPreviewImage ? getImageUrl(`${href}/@@images/preview_image`) : &#39;&#39;);\n</script>\n\n{#if !href}\n  <div data-block-uid={block[&#39;@uid&#39;]} class=\"teaser-placeholder\">\n    <p>Select a target page for this teaser</p>\n  </div>\n{:else}\n  <div data-block-uid={block[&#39;@uid&#39;]} class=\"teaser-block\">\n    {#if imageSrc}\n      <img data-edit-media=\"preview_image\" src={imageSrc} alt=\"\" />\n    {/if}\n    <h3 data-edit-text=\"title\">{title}</h3>\n    <p data-edit-text=\"description\">{description}</p>\n    <a {href} data-edit-link=\"href\">Read more</a>\n  </div>\n{/if}"}]}' />
