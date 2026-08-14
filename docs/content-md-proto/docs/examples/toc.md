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
assignments:
  - { uid: 537a9742-95f1-4930-9df3-d38766f54a71, type: title }
  - { uid: ref-toc-description, type: slate }
  - { uid: editor-screenshot, type: image }
  - { uid: 22f22002-2159-4e42-942a-8ebc6e930ed5, type: toc }
  - { uid: 60a17689-6437-4a88-bf2c-76a62351ca5b, type: separator }
  - { uid: 89137ab1-3973-437f-be95-7e91586a4685, type: image }
  - { uid: e83fea00-1714-4de7-9d79-8d0e749639a9, type: introduction }
  - { uid: d91f58fa-4634-4aac-bd1d-5f2fc4b338ca, type: separator }
  - { uid: b1cf3854-5836-4efc-897e-d003ceea19f0, type: slate }
  - { uid: 43dd5fcf-3f52-469b-8ccc-57b785cf65b1, type: slate }
  - { uid: fde62278-7792-46be-ba68-0d4d19a3a677, type: slate }
  - { uid: 9313e80c-65d1-4d72-863f-fc1c17aba444, type: slate }
  - { uid: 741da11b-703b-43ab-a9df-a7c1087d059a, type: slate }
  - { uid: 2e03fd8c-f334-400e-a3a9-d0446e3a1512, type: slate }
  - { uid: 372b9489-5dc4-44a7-a7a9-649c2bc282db, type: slate }
  - { uid: c08671c1-ca6c-4a5a-85b8-5c856bc112df, type: slate }
  - { uid: c95cd0fd-f914-4dca-9adb-f7438b0a3112, type: slate }
  - { uid: 2b54caa5-1c1a-40f2-aacd-84abce141e79, type: slate }
  - { uid: 09460f92-723d-402d-a0a5-76a15f2678ad, type: slate }
  - { uid: 3e036171-0a20-47d0-a06a-a7f493b65186, type: separator }
  - { uid: ref-toc-schema, type: codeExample }
  - { uid: ref-toc-json-data, type: codeExample }
  - { uid: ref-toc-rendering, type: codeExample }
prototypes: |
  <block type="title"      _="${h1}" />
  <block type="slate"      value="${p|h2|h3|h4|h5|h6|ul|ol|blockquote/slate}" />
  <block type="image"      description="${p/text}" url="${img/src}" alt="${img/alt}" align="center" size="l" />
---

# Table of Contents

Renders a table of contents generated from heading blocks on the current page. It scans sibling blocks for headings and builds a navigation list.

![The toc example block being edited in Volto Hydra](/docs/images/toc-edit)

<block type="toc" uid="22f22002-2159-4e42-942a-8ebc6e930ed5" title="Inhaltsverzeichnis" variation="default" />

<block type="separator" uid="60a17689-6437-4a88-bf2c-76a62351ca5b" data='{"styles":{"align":"full"}}' />

<block type="image" uid="89137ab1-3973-437f-be95-7e91586a4685" align="wide" copyright_and_sources="Copyright: unsplash.com" description="Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt." size="l" title="Title Image" url="/docs/examples/content-types/image-dark" data='{"styles":{"size:noprefix":"large"}}' />

<block type="introduction" uid="e83fea00-1714-4de7-9d79-8d0e749639a9" data='{"value":[{"children":[{"text":"Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat. "}],"type":"p"}]}' />

<block type="separator" uid="d91f58fa-4634-4aac-bd1d-5f2fc4b338ca" data='{"styles":{"align":"full"}}' />

## Text Heading H2&#x20;

Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat. Duis autem vel eum iriure dolor in hendrerit in vulputate velit esse molestie consequat, vel illum dolore eu feugiat nulla facilisis at vero eros et accumsan et iusto odio dignissim qui blandit praesent luptatum zzril delenit augue duis dolore te feugait nulla facilisi.

### Text Heading H3

Lorem ipsum dolor sit amet adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat. Duis autem vel eum iriure dolor in hendrerit in vulputate velit esse molestie consequat, vel illum dolore eu feugiat nulla facilisis at vero eros et accumsan et iusto odio dignissim qui blandit praesent luptatum zzril delenit augue duis dolore te feugait nulla facilisi.

## Lists

1. Ordered List Bullett Point One&#x20;
2. Ordered List Bullett Point Two&#x20;
3. Ordered List Bullett Point Three
4. Ordered List Bullett Point Four

- Ordered List Bullett Point One&#x20;
- Ordered List Bullett Point Two&#x20;
- Ordered List Bullett Point Three
- Ordered List Bullett Point Four

### Inline Styles

Text can be **bold** or *italic*.

[Link internal](/docs/examples/heading)

[Link external](https://www.google.com/)

<block type="separator" uid="3e036171-0a20-47d0-a06a-a7f493b65186" data='{"styles":{"align":"left"}}' />

<block type="codeExample" uid="ref-toc-schema" templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-toc" slotId="schema" data='{"tabs":[{"@id":"ref-toc-schema-javascript-496d15","label":"Schema","language":"javascript","code":"{\n  \"toc\": {\n    \"blockSchema\": {\n      \"properties\": {\n        \"title\": {\n          \"title\": \"Title\"\n        },\n        \"hide_title\": {\n          \"title\": \"Hide title\",\n          \"type\": \"boolean\"\n        },\n        \"ordered\": {\n          \"title\": \"Ordered\",\n          \"type\": \"boolean\"\n        },\n        \"levels\": {\n          \"title\": \"Entries\",\n          \"isMulti\": true,\n          \"choices\": [\n            [\n              \"h1\",\n              \"h1\"\n            ],\n            [\n              \"h2\",\n              \"h2\"\n            ],\n            [\n              \"h3\",\n              \"h3\"\n            ],\n            [\n              \"h4\",\n              \"h4\"\n            ],\n            [\n              \"h5\",\n              \"h5\"\n            ],\n            [\n              \"h6\",\n              \"h6\"\n            ]\n          ]\n        }\n      }\n    }\n  }\n}"}]}' />

<block type="codeExample" uid="ref-toc-json-data" templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-toc" slotId="json-data" data='{"tabs":[{"@id":"ref-toc-json-data-json-aaa910","label":"JSON Block Data","language":"json","code":"{\n  \"@type\": \"toc\",\n  \"title\": \"On this page\",\n  \"hide_title\": false,\n  \"ordered\": false,\n  \"levels\": [\n    \"h2\",\n    \"h3\"\n  ]\n}"}]}' />

<block type="codeExample" uid="ref-toc-rendering" templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-toc" slotId="rendering" data='{"tabs":[{"@id":"ref-toc-rendering-jsx-ee2124","label":"React","language":"jsx","code":"function TocBlock({ block, content }) {\n  const entries = [];\n  if (content?.blocks &amp;&amp; content?.blocks_layout?.items) {\n    for (const id of content.blocks_layout.items) {\n      const b = content.blocks[id];\n      if (!b) continue;\n      if (b[&#39;@type&#39;] === &#39;heading&#39; &amp;&amp; b.heading) {\n        entries.push({ id, level: parseInt((b.tag || &#39;h2&#39;).slice(1)), text: b.heading });\n      } else if (b[&#39;@type&#39;] === &#39;slate&#39; &amp;&amp; b.value?.[0]?.type?.match(/^h[1-6]$/)) {\n        const level = parseInt(b.value[0].type.slice(1));\n        const text = b.plaintext || b.value[0].children?.map(c => c.text).join(&#39;&#39;) || &#39;&#39;;\n        if (text.trim()) entries.push({ id, level, text });\n      }\n    }\n  }\n\n  return (\n    <nav data-block-uid={block[&#39;@uid&#39;]} className=\"toc-block\">\n      {entries.length > 0 ? (\n        <ul>\n          {entries.map(e => (\n            <li key={e.id} style={{ marginLeft: `${(e.level - 2) * 1.5}em` }}>\n              <a href={`#${e.id}`}>{e.text}</a>\n            </li>\n          ))}\n        </ul>\n      ) : (\n        <p>Table of Contents</p>\n      )}\n    </nav>\n  );\n}"},{"@id":"ref-toc-rendering-vue-12aef2","label":"Vue","language":"vue","code":"<template>\n  <nav :data-block-uid=\"block[&#39;@uid&#39;]\" class=\"toc-block\">\n    <ul v-if=\"entries.length\">\n      <li v-for=\"e in entries\" :key=\"e.id\" :style=\"{ marginLeft: (e.level - 2) * 1.5 + &#39;em&#39; }\">\n        <a :href=\"`#${e.id}`\">{{ e.text }}</a>\n      </li>\n    </ul>\n    <p v-else>Table of Contents</p>\n  </nav>\n</template>\n\n<script setup>\nimport { computed } from &#39;vue&#39;;\n\nconst props = defineProps({ block: Object, content: Object });\n\nconst entries = computed(() => {\n  const result = [];\n  const c = props.content;\n  if (!c?.blocks || !c?.blocks_layout?.items) return result;\n  for (const id of c.blocks_layout.items) {\n    const b = c.blocks[id];\n    if (!b) continue;\n    if (b[&#39;@type&#39;] === &#39;heading&#39; &amp;&amp; b.heading) {\n      result.push({ id, level: parseInt((b.tag || &#39;h2&#39;).slice(1)), text: b.heading });\n    } else if (b[&#39;@type&#39;] === &#39;slate&#39; &amp;&amp; b.value?.[0]?.type?.match(/^h[1-6]$/)) {\n      const level = parseInt(b.value[0].type.slice(1));\n      const text = b.plaintext || b.value[0].children?.map(c => c.text).join(&#39;&#39;) || &#39;&#39;;\n      if (text.trim()) result.push({ id, level, text });\n    }\n  }\n  return result;\n});\n</script>"},{"@id":"ref-toc-rendering-svelte-397c7f","label":"Svelte","language":"svelte","code":"<script>\n  export let block;\n  export let content = {};\n\n  $: entries = (() => {\n    const result = [];\n    if (!content?.blocks || !content?.blocks_layout?.items) return result;\n    for (const id of content.blocks_layout.items) {\n      const b = content.blocks[id];\n      if (!b) continue;\n      if (b[&#39;@type&#39;] === &#39;heading&#39; &amp;&amp; b.heading) {\n        result.push({ id, level: parseInt((b.tag || &#39;h2&#39;).slice(1)), text: b.heading });\n      } else if (b[&#39;@type&#39;] === &#39;slate&#39; &amp;&amp; b.value?.[0]?.type?.match(/^h[1-6]$/)) {\n        const level = parseInt(b.value[0].type.slice(1));\n        const text = b.plaintext || b.value[0].children?.map(c => c.text).join(&#39;&#39;) || &#39;&#39;;\n        if (text.trim()) result.push({ id, level, text });\n      }\n    }\n    return result;\n  })();\n</script>\n\n<nav data-block-uid={block[&#39;@uid&#39;]} class=\"toc-block\">\n  {#if entries.length > 0}\n    <ul>\n      {#each entries as e (e.id)}\n        <li style=\"margin-left: {(e.level - 2) * 1.5}em\">\n          <a href=\"#{e.id}\">{e.text}</a>\n        </li>\n      {/each}\n    </ul>\n  {:else}\n    <p>Table of Contents</p>\n  {/if}\n</nav>"}]}' />
