---
"@type": Document
UID: docs-examples-hero-001
allow_discussion: false
contributors: []
creators:
  - admin
description: "A full-width hero section with heading, subheading, image, rich
  text description, and a call-to-action button. Demonstrates multiple field
  types in a single block: string, textarea, slate, image, and object_browser."
effective: null
exclude_from_nav: false
expires: null
id: hero
language: "##DEFAULT##"
layout: document_view
review_state: published
rights: ""
subjects:
  - blocks
  - media
title: Hero Block
assignments:
  - { uid: title-1, type: title }
  - { uid: ref-hero-description, type: slate }
  - { uid: ref-hero-schema, type: codeExample }
  - { uid: ref-hero-json-data, type: codeExample }
  - { uid: ref-hero-rendering, type: codeExample }
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

A full-width hero section with heading, subheading, image, rich text description, and a call-to-action button. Demonstrates multiple field types in a single block: string, textarea, slate, image, and object\_browser.

<block type="codeExample" templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-hero" slotId="schema" data='{"tabs":[{"@id":"ref-hero-schema-javascript-698e6b","label":"Schema","language":"javascript","code":"{\n  \"hero\": {\n    \"blockSchema\": {\n      \"properties\": {\n        \"heading\": {\n          \"title\": \"Heading\"\n        },\n        \"subheading\": {\n          \"title\": \"Subheading\",\n          \"widget\": \"textarea\"\n        },\n        \"buttonText\": {\n          \"title\": \"Button Text\"\n        },\n        \"buttonLink\": {\n          \"title\": \"Button Link\",\n          \"widget\": \"object_browser\",\n          \"mode\": \"link\",\n          \"allowExternals\": true\n        },\n        \"image\": {\n          \"title\": \"Image\",\n          \"widget\": \"image\"\n        },\n        \"description\": {\n          \"title\": \"Description\",\n          \"widget\": \"slate\"\n        }\n      }\n    },\n    \"fieldMappings\": {\n      \"@default\": {\n        \"title\": \"heading\",\n        \"description\": \"subheading\",\n        \"@id\": \"buttonLink\",\n        \"image\": \"image\"\n      }\n    }\n  }\n}"}]}' />

<block type="codeExample" templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-hero" slotId="json-data" data='{"tabs":[{"@id":"ref-hero-json-data-json-fc17f8","label":"JSON Block Data","language":"json","code":"{\n  \"@type\": \"hero\",\n  \"heading\": \"Welcome to Our Site\",\n  \"subheading\": \"Discover amazing content\\nacross multiple lines\",\n  \"buttonText\": \"Get Started\",\n  \"buttonLink\": [\n    {\n      \"@id\": \"/getting-started\"\n    }\n  ],\n  \"image\": \"data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%27800%27 height=%27400%27%3E%3Crect width=%27100%25%27 height=%27100%25%27 fill=%27%234a90d9%27/%3E%3Ctext x=%2750%25%27 y=%2750%25%27 fill=%27white%27 text-anchor=%27middle%27 font-size=%2724%27%3EHero Image%3C/text%3E%3C/svg%3E\",\n  \"description\": [\n    {\n      \"type\": \"p\",\n      \"children\": [\n        {\n          \"text\": \"We build tools that make content editing delightful.\"\n        }\n      ]\n    }\n  ]\n}"}]}' />

<block type="codeExample" templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-hero" slotId="rendering" data='{"tabs":[{"@id":"ref-hero-rendering-jsx-46a2e5","label":"React","language":"jsx","code":"import { getImageUrl } from &#39;./utils.js&#39;;\n\nfunction HeroBlock({ block }) {\n  const subheading = (block.subheading || &#39;&#39;).replace(/\\n/g, &#39;<br>&#39;);\n  const buttonLink = block.buttonLink?.[0]?.[&#39;@id&#39;] || &#39;&#39;;\n  const imageSrc = getImageUrl(block.image);\n\n  // Data-driven: render a field only when it has data. No data ⇒ no element, so\n  // view markup stays clean. Inka reveals an empty optional field for editing by\n  // seeding it, which makes these same checks true — no edit-mode branch needed.\n  return (\n    <div data-block-uid={block[&#39;@uid&#39;]} className=\"hero-block\">\n      {imageSrc &amp;&amp; (\n        <img data-edit-media=\"image\" src={imageSrc} alt=\"Hero image\" />\n      )}\n      {block.heading &amp;&amp; <h1 data-edit-text=\"heading\">{block.heading}</h1>}\n      {block.subheading &amp;&amp; (\n        <p data-edit-text=\"subheading\" dangerouslySetInnerHTML={{ __html: subheading }} />\n      )}\n      {block.description &amp;&amp; (\n        <div className=\"hero-description\" data-edit-text=\"description\">\n          {block.description.map((node, i) => (\n            <SlateNode key={i} node={node} />\n          ))}\n        </div>\n      )}\n      {(block.buttonText || block.buttonLink) &amp;&amp; (\n        <a data-edit-text=\"buttonText\" data-edit-link=\"buttonLink\" href={buttonLink}>\n          {block.buttonText}\n        </a>\n      )}\n    </div>\n  );\n}"},{"@id":"ref-hero-rendering-vue-337205","label":"Vue","language":"vue","code":"<template>\n  <!-- Data-driven: render a field only when it has data. No data ⇒ no element, so\n       view markup stays clean. Inka reveals an empty optional field for editing by\n       seeding it, which makes these same checks true — no edit-mode branch needed. -->\n  <div :data-block-uid=\"block[&#39;@uid&#39;]\" class=\"hero-block\">\n    <img v-if=\"block.image\" data-edit-media=\"image\" :src=\"heroImageSrc\" alt=\"Hero image\" />\n    <h1 v-if=\"block.heading\" data-edit-text=\"heading\">{{ block.heading }}</h1>\n    <p v-if=\"block.subheading\" data-edit-text=\"subheading\" v-html=\"subheadingHtml\" />\n    <div v-if=\"block.description\" class=\"hero-description\" data-edit-text=\"description\">\n      <SlateNode v-for=\"(node, i) in block.description\" :key=\"i\" :node=\"node\" />\n    </div>\n    <a v-if=\"block.buttonText || block.buttonLink\"\n       data-edit-text=\"buttonText\" data-edit-link=\"buttonLink\" :href=\"buttonLink\">\n      {{ block.buttonText }}\n    </a>\n  </div>\n</template>\n\n<script setup>\nimport { computed } from &#39;vue&#39;;\nimport { getImageUrl } from &#39;./utils.js&#39;;\nconst props = defineProps({ block: Object });\nconst subheadingHtml = computed(() => (props.block.subheading || &#39;&#39;).replace(/\\n/g, &#39;<br>&#39;));\nconst buttonLink = computed(() => props.block.buttonLink?.[0]?.[&#39;@id&#39;] || &#39;&#39;);\nconst heroImageSrc = computed(() => getImageUrl(props.block.image));\n</script>"},{"@id":"ref-hero-rendering-svelte-a2ecf7","label":"Svelte","language":"svelte","code":"<script>\n  import SlateNode from &#39;./SlateNode.svelte&#39;;\n  import { getImageUrl } from &#39;./utils.js&#39;;\n  export let block;\n\n  $: subheadingHtml = (block.subheading || &#39;&#39;).replace(/\\n/g, &#39;<br>&#39;);\n  $: buttonLink = block.buttonLink?.[0]?.[&#39;@id&#39;] || &#39;&#39;;\n  $: heroImageSrc = getImageUrl(block.image);\n</script>\n\n<!-- Data-driven: render a field only when it has data. No data ⇒ no element, so\n     view markup stays clean. Inka reveals an empty optional field for editing by\n     seeding it, which makes these same checks true — no edit-mode branch needed. -->\n<div data-block-uid={block[&#39;@uid&#39;]} class=\"hero-block\">\n  {#if block.image}\n    <img data-edit-media=\"image\" src={heroImageSrc} alt=\"Hero image\" />\n  {/if}\n  {#if block.heading}\n    <h1 data-edit-text=\"heading\">{block.heading}</h1>\n  {/if}\n  {#if block.subheading}\n    <p data-edit-text=\"subheading\">{@html subheadingHtml}</p>\n  {/if}\n  {#if block.description}\n    <div class=\"hero-description\" data-edit-text=\"description\">\n      {#each block.description as node, i (i)}\n        <SlateNode {node} />\n      {/each}\n    </div>\n  {/if}\n  {#if block.buttonText || block.buttonLink}\n    <a data-edit-text=\"buttonText\" data-edit-link=\"buttonLink\" href={buttonLink}>\n      {block.buttonText}\n    </a>\n  {/if}\n</div>"}]}' />
