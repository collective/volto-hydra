---
"@type": Document
UID: docs-examples-slider-001
allow_discussion: false
contributors: []
creators:
  - admin
description: A carousel/slider that cycles through slides. Slides are stored as
  an object_list — each slide has a title, description, image, and optional
  button.
effective: null
exclude_from_nav: false
expires: null
id: slider
language: "##DEFAULT##"
layout: document_view
review_state: published
rights: ""
subjects:
  - blocks
  - containers
  - media
title: Slider Block
assignments:
  - { uid: title-1, type: title }
  - { uid: ref-slider-description, type: slate }
  - { uid: ref-slider-schema, type: codeExample }
  - { uid: ref-slider-json-data, type: codeExample }
  - { uid: ref-slider-rendering, type: codeExample }
prototypes: |
  <block type="title" _="${h1}" />
  <block type="slate" value="${p|h2|h3|h4|h5|h6|ul|ol|blockquote/slate}" />
  <block type="codeExample">
    <region name="tabs" widget="object_list">
      <block type="tab" label="${h3/text}" language="${pre/lang}" code="${pre/text}" />
    </region>
  </block>
---

# 

A carousel/slider that cycles through slides. Slides are stored as an object\_list — each slide has a title, description, image, and optional button.

<block type="codeExample" templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-slider" slotId="schema" data='{"tabs":[{"@id":"ref-slider-schema-javascript-ce9b5a","label":"Schema","language":"javascript","code":"{\n  \"slider\": {\n    \"schemaEnhancer\": {\n      \"inheritSchemaFrom\": {}\n    },\n    \"blockSchema\": {\n      \"properties\": {\n        \"slides\": {\n          \"title\": \"Slides\",\n          \"widget\": \"object_list\",\n          \"allowedBlocks\": [\n            \"slide\",\n            \"image\",\n            \"listing\",\n            \"teaser\"\n          ],\n          \"typeField\": \"@type\",\n          \"itemTypeField\": \"variation\",\n          \"defaultBlockType\": \"slide\"\n        },\n        \"variation\": {\n          \"title\": \"Item Type\",\n          \"widget\": \"blockTypeSelect\",\n          \"filterConvertibleFrom\": \"@default\"\n        },\n        \"autoplayEnabled\": {\n          \"title\": \"Autoplay Enabled\",\n          \"type\": \"boolean\",\n          \"default\": false\n        },\n        \"autoplayDelay\": {\n          \"title\": \"Autoplay Delay\",\n          \"type\": \"integer\",\n          \"default\": 4000\n        },\n        \"autoplayJump\": {\n          \"title\": \"Autoplay Jump\",\n          \"type\": \"boolean\",\n          \"default\": false\n        }\n      }\n    }\n  },\n  \"slide\": {\n    \"fieldMappings\": {\n      \"@default\": {\n        \"@id\": \"href\",\n        \"title\": \"title\",\n        \"description\": \"description\",\n        \"image\": \"preview_image\"\n      }\n    },\n    \"blockSchema\": {\n      \"properties\": {\n        \"head_title\": {\n          \"title\": \"Kicker\"\n        },\n        \"title\": {\n          \"title\": \"Title\"\n        },\n        \"description\": {\n          \"title\": \"Description\",\n          \"widget\": \"textarea\"\n        },\n        \"preview_image\": {\n          \"title\": \"Image Override\",\n          \"widget\": \"object_browser\",\n          \"mode\": \"image\",\n          \"allowExternals\": true\n        },\n        \"buttonText\": {\n          \"title\": \"Button Text\"\n        },\n        \"hideButton\": {\n          \"title\": \"Hide Button\",\n          \"type\": \"boolean\"\n        }\n      }\n    }\n  }\n}"}]}' />

<block type="codeExample" templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-slider" slotId="json-data" data='{"tabs":[{"@id":"ref-slider-json-data-json-c5167b","label":"JSON Block Data","language":"json","code":"{\n  \"@type\": \"slider\",\n  \"autoplayEnabled\": false,\n  \"autoplayDelay\": 5000,\n  \"slides\": [\n    {\n      \"@id\": \"slide-1\",\n      \"@type\": \"slide\",\n      \"head_title\": \"New Release\",\n      \"title\": \"Product Launch 2025\",\n      \"description\": \"Discover our latest innovations.\",\n      \"preview_image\": [\n        {\n          \"@id\": \"data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%27800%27 height=%27400%27%3E%3Crect width=%27100%25%27 height=%27100%25%27 fill=%27%235577aa%27/%3E%3Ctext x=%2750%25%27 y=%2750%25%27 fill=%27white%27 text-anchor=%27middle%27 font-size=%2724%27%3ESlide 1%3C/text%3E%3C/svg%3E\"\n        }\n      ],\n      \"buttonText\": \"Learn More\"\n    },\n    {\n      \"@id\": \"slide-2\",\n      \"@type\": \"slide\",\n      \"head_title\": \"Featured\",\n      \"title\": \"Award-Winning Design\",\n      \"description\": \"Recognized for excellence in UX.\",\n      \"preview_image\": [\n        {\n          \"@id\": \"data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%27800%27 height=%27400%27%3E%3Crect width=%27100%25%27 height=%27100%25%27 fill=%27%23aa5577%27/%3E%3Ctext x=%2750%25%27 y=%2750%25%27 fill=%27white%27 text-anchor=%27middle%27 font-size=%2724%27%3ESlide 2%3C/text%3E%3C/svg%3E\"\n        }\n      ],\n      \"buttonText\": \"See Details\"\n    }\n  ]\n}"}]}' />

<block type="codeExample" templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-slider" slotId="rendering" data='{"tabs":[{"@id":"ref-slider-rendering-jsx-87bcad","label":"React","language":"jsx","code":"import { getImageUrl } from &#39;./utils.js&#39;;\n\nfunction SliderBlock({ block }) {\n  const [current, setCurrent] = useState(0);\n  const slides = expandTemplatesSync(block.slides || [], { idField: &#39;@id&#39; });\n\n  return (\n    <div data-block-uid={block[&#39;@uid&#39;]} className=\"slider-block\">\n      {slides.map((slide, i) => (\n        <div\n          key={slide[&#39;@id&#39;]}\n          data-block-uid={slide[&#39;@id&#39;]}\n          className=\"slide\"\n          style={{ display: i === current ? &#39;block&#39; : &#39;none&#39; }}\n        >\n          {slide.preview_image &amp;&amp; (\n            <img\n              data-edit-media=\"preview_image\"\n              src={getImageUrl(slide.preview_image)}\n              alt=\"\"\n            />\n          )}\n          <span data-edit-text=\"head_title\">{slide.head_title}</span>\n          <h2 data-edit-text=\"title\">{slide.title}</h2>\n          <p data-edit-text=\"description\">{slide.description}</p>\n          <button data-edit-text=\"buttonText\">{slide.buttonText}</button>\n        </div>\n      ))}\n      <div className=\"slider-dots\">\n        {slides.map((_, i) => (\n          <button key={i} onClick={() => setCurrent(i)} className={i === current ? &#39;active&#39; : &#39;&#39;} />\n        ))}\n      </div>\n    </div>\n  );\n}"},{"@id":"ref-slider-rendering-vue-6e69c4","label":"Vue","language":"vue","code":"<template>\n  <div :data-block-uid=\"block[&#39;@uid&#39;]\" class=\"slider-block\">\n    <div\n      v-for=\"(slide, i) in slides\"\n      :key=\"slide[&#39;@id&#39;]\"\n      :data-block-uid=\"slide[&#39;@id&#39;]\"\n      class=\"slide\"\n      v-show=\"i === current\"\n    >\n      <img\n        v-if=\"slide.preview_image\"\n        data-edit-media=\"preview_image\"\n        :src=\"getImageUrl(slide.preview_image)\"\n        alt=\"\"\n      />\n      <span data-edit-text=\"head_title\">{{ slide.head_title }}</span>\n      <h2 data-edit-text=\"title\">{{ slide.title }}</h2>\n      <p data-edit-text=\"description\">{{ slide.description }}</p>\n      <button data-edit-text=\"buttonText\">{{ slide.buttonText }}</button>\n    </div>\n    <div class=\"slider-dots\">\n      <button\n        v-for=\"(_, i) in slides\"\n        :key=\"i\"\n        @click=\"current = i\"\n        :class=\"{ active: i === current }\"\n      />\n    </div>\n  </div>\n</template>\n\n<script setup>\nimport { ref, computed } from &#39;vue&#39;;\nimport { getImageUrl } from &#39;./utils.js&#39;;\nconst props = defineProps({ block: Object });\nconst current = ref(0);\n// Expand the slides object_list (keyed by @id). Edit-mode pass-through sets each slide&#39;s @uid.\nconst slides = computed(() => expandTemplatesSync(props.block.slides || [], { idField: &#39;@id&#39; }));\n</script>"},{"@id":"ref-slider-rendering-svelte-586973","label":"Svelte","language":"svelte","code":"<script>\n  import { getImageUrl } from &#39;./utils.js&#39;;\n  export let block;\n  let current = 0;\n  // Expand the slides object_list (keyed by @id). Edit-mode pass-through sets each slide&#39;s @uid.\n  $: slides = expandTemplatesSync(block.slides || [], { idField: &#39;@id&#39; });\n</script>\n\n<div data-block-uid={block[&#39;@uid&#39;]} class=\"slider-block\">\n  {#each slides as slide, i (slide[&#39;@id&#39;])}\n    <div\n      data-block-uid={slide[&#39;@id&#39;]}\n      class=\"slide\"\n      style:display={i === current ? &#39;block&#39; : &#39;none&#39;}\n    >\n      {#if slide.preview_image}\n        <img\n          data-edit-media=\"preview_image\"\n          src={getImageUrl(slide.preview_image)}\n          alt=\"\"\n        />\n      {/if}\n      <span data-edit-text=\"head_title\">{slide.head_title}</span>\n      <h2 data-edit-text=\"title\">{slide.title}</h2>\n      <p data-edit-text=\"description\">{slide.description}</p>\n      <button data-edit-text=\"buttonText\">{slide.buttonText}</button>\n    </div>\n  {/each}\n  <div class=\"slider-dots\">\n    {#each slides as _, i}\n      <button on:click={() => current = i} class:active={i === current} />\n    {/each}\n  </div>\n</div>"}]}' />
