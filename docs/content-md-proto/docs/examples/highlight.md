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
assignments:
  - { uid: af3c704a-1f80-48c8-843b-dc29368d43d9, type: title }
  - { uid: ref-highlight-description, type: slate }
  - { uid: editor-screenshot, type: image }
  - { uid: 8d932379-1247-4281-bd30-dfecd5b3c378, type: highlight }
  - { uid: 417e7343-af04-4da4-96bf-29321a3e0fc6, type: highlight }
  - { uid: 67a6a73a-5ae7-4e14-a11b-bd0139e56513, type: highlight }
  - { uid: 25a0a1b5-3ce9-468f-8968-9a7f83ca4e53, type: highlight }
  - { uid: 94655cc3-817d-48ba-bc20-6e9f7796dc46, type: highlight }
  - { uid: ref-highlight-schema, type: codeExample }
  - { uid: ref-highlight-json-data, type: codeExample }
  - { uid: ref-highlight-rendering, type: codeExample }
prototypes: |
  <block type="title" _="${h1}" />
  <block type="slate" value="${p|h2|h3|h4|h5|h6|ul|ol|blockquote/slate}" />
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

<block type="highlight" title="Highlight-Block" cta_title="Button" image="/docs/examples/content-types/image/@@images/image" data='{"styles":{"descriptionColor":"highlight-custom-color-1"},"description":[{"children":[{"text":"Lorem ipsum dolor sit amet, "},{"children":[{"text":"consetetur sadipscing"}],"data":{"url":"/docs/examples/button"},"type":"link"},{"text":" elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt."}],"type":"p"}],"cta_link":[{"@id":"/docs/examples/content-types/page"}]}' />

<block type="highlight" title="Highlight-Block" cta_title="Button" image="/docs/examples/content-types/image/@@images/image" data='{"styles":{"descriptionColor":"highlight-custom-color-2"},"description":[{"children":[{"text":"Lorem ipsum dolor sit amet, "},{"children":[{"text":"consetetur sadipscing"}],"data":{"url":"/docs/examples/button"},"type":"link"},{"text":" elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt."}],"type":"p"}],"cta_link":[{"@id":"/docs/examples/content-types/page"}]}' />

<block type="highlight" title="Highlight-Block" cta_title="Button" image="/docs/examples/content-types/image/@@images/image" data='{"styles":{"descriptionColor":"highlight-custom-color-3"},"description":[{"children":[{"text":"Lorem ipsum dolor sit amet, "},{"children":[{"text":"consetetur sadipscing"}],"data":{"url":"/docs/examples/button"},"type":"link"},{"text":" elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt."}],"type":"p"}],"cta_link":[{"@id":"/docs/examples/content-types/page"}]}' />

<block type="highlight" title="Highlight-Block" cta_title="Button" image="/docs/examples/content-types/image/@@images/image" data='{"styles":{"descriptionColor":"highlight-custom-color-4"},"description":[{"children":[{"text":"Lorem ipsum dolor sit amet, "},{"children":[{"text":"consetetur sadipscing"}],"data":{"url":"/docs/examples/button"},"type":"link"},{"text":" elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt."}],"type":"p"}],"cta_link":[{"@id":"/docs/examples/content-types/page"}]}' />

<block type="highlight" title="Highlight-Block" cta_title="Button" image="/docs/examples/content-types/image/@@images/image" data='{"styles":{"descriptionColor":"highlight-custom-color-5"},"description":[{"children":[{"text":"Lorem ipsum dolor sit amet, "},{"children":[{"text":"consetetur sadipscing"}],"data":{"url":"/docs/examples/button"},"type":"link"},{"text":" elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt."}],"type":"p"}],"cta_link":[{"@id":"/docs/examples/content-types/page"}]}' />

<block type="codeExample" templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-highlight" slotId="schema" data='{"tabs":[{"@id":"ref-highlight-schema-javascript-80590c","label":"Schema","language":"javascript","code":"{\n  \"highlight\": {\n    \"blockSchema\": {\n      \"properties\": {\n        \"title\": {\n          \"title\": \"Title\"\n        },\n        \"description\": {\n          \"title\": \"Description\",\n          \"widget\": \"slate\"\n        },\n        \"image\": {\n          \"title\": \"Background Image\",\n          \"widget\": \"image\"\n        },\n        \"cta_title\": {\n          \"title\": \"CTA Text\"\n        },\n        \"cta_link\": {\n          \"title\": \"CTA Link\",\n          \"widget\": \"object_browser\",\n          \"mode\": \"link\"\n        }\n      }\n    }\n  }\n}"}]}' />

<block type="codeExample" templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-highlight" slotId="json-data" data='{"tabs":[{"@id":"ref-highlight-json-data-json-a2bfa3","label":"JSON Block Data","language":"json","code":"{\n  \"@type\": \"highlight\",\n  \"title\": \"Featured Content\",\n  \"description\": [\n    {\n      \"type\": \"p\",\n      \"children\": [\n        {\n          \"text\": \"Discover the latest updates and features available in this release.\"\n        }\n      ]\n    }\n  ],\n  \"image\": \"data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%27800%27 height=%27400%27%3E%3Crect width=%27100%25%27 height=%27100%25%27 fill=%27%23334455%27/%3E%3Ctext x=%2750%25%27 y=%2750%25%27 fill=%27white%27 text-anchor=%27middle%27 font-size=%2724%27%3EHighlight BG%3C/text%3E%3C/svg%3E\",\n  \"cta_title\": \"Read More\",\n  \"cta_link\": [\n    {\n      \"@id\": \"/news/latest\"\n    }\n  ]\n}"}]}' />

<block type="codeExample" templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-highlight" slotId="rendering" data='{"tabs":[{"@id":"ref-highlight-rendering-jsx-659b6c","label":"React","language":"jsx","code":"const highlightGradients = {\n  &#39;highlight-custom-color-1&#39;: &#39;linear-gradient(135deg, #1e3a5f, #2563eb)&#39;,\n  &#39;highlight-custom-color-2&#39;: &#39;linear-gradient(135deg, #064e3b, #059669)&#39;,\n  &#39;highlight-custom-color-3&#39;: &#39;linear-gradient(135deg, #581c87, #9333ea)&#39;,\n  &#39;highlight-custom-color-4&#39;: &#39;linear-gradient(135deg, #78350f, #d97706)&#39;,\n  &#39;highlight-custom-color-5&#39;: &#39;linear-gradient(135deg, #881337, #e11d48)&#39;,\n};\n\nimport { getImageUrl } from &#39;./utils.js&#39;;\n\nfunction HighlightBlock({ block }) {\n  const title = block.title || &#39;&#39;;\n  const description = block.description || [];\n  const imageSrc = getImageUrl(block.image);\n  const ctaText = block.cta_title || &#39;&#39;;\n  const ctaLink = block.cta_link?.[0]?.[&#39;@id&#39;] || &#39;&#39;;\n  const gradient = highlightGradients[block.styles?.descriptionColor] || &#39;linear-gradient(135deg, #334, #556)&#39;;\n  const bgStyle = imageSrc\n    ? { backgroundImage: `url(${imageSrc})`, backgroundSize: &#39;cover&#39;, backgroundPosition: &#39;center&#39; }\n    : { background: gradient };\n\n  return (\n    <section\n      data-block-uid={block[&#39;@uid&#39;]}\n      className=\"highlight-block\"\n      style={{ ...bgStyle, padding: &#39;40px 20px&#39;, color: &#39;white&#39;, borderRadius: &#39;8px&#39; }}\n    >\n      <div className=\"highlight-overlay\" style={{ background: &#39;rgba(0,0,0,0.4)&#39;, padding: &#39;30px&#39;, borderRadius: &#39;8px&#39; }}>\n        <h2 data-edit-text=\"title\">{title}</h2>\n        <div className=\"highlight-body\" data-edit-text=\"description\">\n          {description.map((node, i) => (\n            <SlateNode key={i} node={node} />\n          ))}\n        </div>\n        {ctaText &amp;&amp; (\n          <a href={ctaLink} data-edit-text=\"cta_title\" data-edit-link=\"cta_link\" className=\"highlight-cta\"\n            style={{ display: &#39;inline-block&#39;, padding: &#39;10px 20px&#39;, background: &#39;#007eb1&#39;, color: &#39;white&#39;, textDecoration: &#39;none&#39;, borderRadius: &#39;4px&#39;, marginTop: &#39;16px&#39; }}>\n            {ctaText}\n          </a>\n        )}\n      </div>\n    </section>\n  );\n}"},{"@id":"ref-highlight-rendering-vue-dd8730","label":"Vue","language":"vue","code":"<template>\n  <section\n    :data-block-uid=\"block[&#39;@uid&#39;]\"\n    class=\"highlight-block\"\n    :style=\"{ ...bgStyle, padding: &#39;40px 20px&#39;, color: &#39;white&#39;, borderRadius: &#39;8px&#39; }\"\n  >\n    <div class=\"highlight-overlay\" style=\"background:rgba(0,0,0,0.4);padding:30px;border-radius:8px\">\n      <h2 data-edit-text=\"title\">{{ block.title }}</h2>\n      <div class=\"highlight-body\" data-edit-text=\"description\">\n        <SlateNode v-for=\"(node, i) in block.description || []\" :key=\"i\" :node=\"node\" />\n      </div>\n      <a\n        v-if=\"block.cta_title\"\n        :href=\"ctaLink\"\n        data-edit-text=\"cta_title\"\n        data-edit-link=\"cta_link\"\n        class=\"highlight-cta\"\n        style=\"display:inline-block;padding:10px 20px;background:#007eb1;color:white;text-decoration:none;border-radius:4px;margin-top:16px\"\n      >\n        {{ block.cta_title }}\n      </a>\n    </div>\n  </section>\n</template>\n\n<script setup>\nimport { computed } from &#39;vue&#39;;\nconst props = defineProps({ block: Object });\nconst ctaLink = computed(() => props.block.cta_link?.[0]?.[&#39;@id&#39;] || &#39;&#39;);\n\nconst gradients = {\n  &#39;highlight-custom-color-1&#39;: &#39;linear-gradient(135deg, #1e3a5f, #2563eb)&#39;,\n  &#39;highlight-custom-color-2&#39;: &#39;linear-gradient(135deg, #064e3b, #059669)&#39;,\n  &#39;highlight-custom-color-3&#39;: &#39;linear-gradient(135deg, #581c87, #9333ea)&#39;,\n  &#39;highlight-custom-color-4&#39;: &#39;linear-gradient(135deg, #78350f, #d97706)&#39;,\n  &#39;highlight-custom-color-5&#39;: &#39;linear-gradient(135deg, #881337, #e11d48)&#39;,\n};\nconst bgStyle = computed(() => {\n  if (props.block.image) {\n    return { backgroundImage: `url(${props.block.image})`, backgroundSize: &#39;cover&#39;, backgroundPosition: &#39;center&#39; };\n  }\n  const gradient = gradients[props.block.styles?.descriptionColor] || &#39;linear-gradient(135deg, #334, #556)&#39;;\n  return { background: gradient };\n});\n</script>"},{"@id":"ref-highlight-rendering-svelte-d3a4c8","label":"Svelte","language":"svelte","code":"<script>\n  import SlateNode from &#39;./SlateNode.svelte&#39;;\n  export let block;\n  $: ctaLink = block.cta_link?.[0]?.[&#39;@id&#39;] || &#39;&#39;;\n\n  const gradients = {\n    &#39;highlight-custom-color-1&#39;: &#39;linear-gradient(135deg, #1e3a5f, #2563eb)&#39;,\n    &#39;highlight-custom-color-2&#39;: &#39;linear-gradient(135deg, #064e3b, #059669)&#39;,\n    &#39;highlight-custom-color-3&#39;: &#39;linear-gradient(135deg, #581c87, #9333ea)&#39;,\n    &#39;highlight-custom-color-4&#39;: &#39;linear-gradient(135deg, #78350f, #d97706)&#39;,\n    &#39;highlight-custom-color-5&#39;: &#39;linear-gradient(135deg, #881337, #e11d48)&#39;,\n  };\n  $: gradient = gradients[block.styles?.descriptionColor] || &#39;linear-gradient(135deg, #334, #556)&#39;;\n  $: bgStyle = block.image\n    ? `background-image:url(${block.image});background-size:cover;background-position:center`\n    : `background:${gradient}`;\n</script>\n\n<section\n  data-block-uid={block[&#39;@uid&#39;]}\n  class=\"highlight-block\"\n  style=\"{bgStyle};padding:40px 20px;color:white;border-radius:8px\"\n>\n  <div class=\"highlight-overlay\" style=\"background:rgba(0,0,0,0.4);padding:30px;border-radius:8px\">\n    <h2 data-edit-text=\"title\">{block.title}</h2>\n    <div class=\"highlight-body\" data-edit-text=\"description\">\n      {#each block.description || [] as node, i (i)}\n        <SlateNode {node} />\n      {/each}\n    </div>\n    {#if block.cta_title}\n      <a href={ctaLink} data-edit-text=\"cta_title\" data-edit-link=\"cta_link\" class=\"highlight-cta\"\n        style=\"display:inline-block;padding:10px 20px;background:#007eb1;color:white;text-decoration:none;border-radius:4px;margin-top:16px\">\n        {block.cta_title}\n      </a>\n    {/if}\n  </div>\n</section>"}]}' />
