---
"@type": Document
UID: docs-examples-contextNavigation-001
allow_discussion: false
contributors: []
creators:
  - admin
description: A vertical navigation list for grouped pages — a left sidebar on
  desktop and a collapsible disclosure at the top on mobile. Each row is a
  navItem (hand-added link) and/or a listing (auto-populated from a path query).
  The active link is detected from the current URL and gets aria-current="page"
  plus a .current class. Named after Plone's @contextnavigation endpoint, which
  serves the same purpose.
effective: null
exclude_from_nav: false
expires: null
id: contextNavigation
language: "##DEFAULT##"
layout: document_view
review_state: published
rights: ""
subjects:
  - blocks
  - navigation
  - templates
title: Context Navigation Block
assignments:
  - { uid: title-1, type: title }
  - { uid: ref-contextNavigation-description, type: slate }
  - { uid: ref-contextNavigation-schema, type: codeExample }
  - { uid: ref-contextNavigation-json-data, type: codeExample }
  - { uid: ref-contextNavigation-rendering, type: codeExample }
prototypes: |
  <block type="title"      _="${h1}" />
  <block type="slate"      value="${p|h2|h3|h4|h5|h6|ul|ol|blockquote/slate}" />
---

# Context Navigation Block

A vertical navigation list for grouped pages — a left sidebar on desktop and a collapsible disclosure at the top on mobile. Each row is a navItem (hand-added link) and/or a listing (auto-populated from a path query). The active link is detected from the current URL and gets aria-current="page" plus a .current class. Named after Plone's @contextnavigation endpoint, which serves the same purpose.

<block type="codeExample" uid="ref-contextNavigation-schema" templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-contextNavigation" slotId="schema" data='{"tabs":[{"@id":"ref-contextNavigation-schema-javascript-38f58f","label":"Schema","language":"javascript","code":"{\n  \"contextNavigation\": {\n    \"blockSchema\": {\n      \"properties\": {\n        \"ariaLabel\": {\n          \"title\": \"Aria label\",\n          \"default\": \"Section navigation\"\n        },\n        \"expandCurrentOnly\": {\n          \"title\": \"Expand current section only\",\n          \"type\": \"boolean\",\n          \"default\": true\n        },\n        \"includeTop\": {\n          \"title\": \"Include section root\",\n          \"type\": \"boolean\",\n          \"default\": false\n        },\n        \"items\": {\n          \"title\": \"Items\",\n          \"widget\": \"blocks_layout\",\n          \"allowedBlocks\": [\n            \"navItem\",\n            \"listing\"\n          ]\n        }\n      }\n    }\n  },\n  \"navItem\": {\n    \"blockSchema\": {\n      \"properties\": {\n        \"label\": {\n          \"title\": \"Label\"\n        },\n        \"href\": {\n          \"title\": \"Link\",\n          \"widget\": \"object_browser\",\n          \"mode\": \"link\"\n        }\n      }\n    }\n  }\n}"}]}' />

<block type="codeExample" uid="ref-contextNavigation-json-data" templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-contextNavigation" slotId="json-data" data='{"tabs":[{"@id":"ref-contextNavigation-json-data-json-62b3b4","label":"JSON Block Data","language":"json","code":"{\n  \"@type\": \"contextNavigation\",\n  \"ariaLabel\": \"Section navigation\",\n  \"blocks\": {\n    \"nav-1\": {\n      \"@type\": \"navItem\",\n      \"label\": \"Introduction\",\n      \"href\": [\n        {\n          \"@id\": \"/docs/introduction\"\n        }\n      ]\n    },\n    \"nav-2\": {\n      \"@type\": \"navItem\",\n      \"label\": \"Custom blocks\",\n      \"href\": [\n        {\n          \"@id\": \"/docs/custom-blocks\"\n        }\n      ]\n    },\n    \"nav-2a\": {\n      \"@type\": \"navItem\",\n      \"label\": \"Schema\",\n      \"href\": [\n        {\n          \"@id\": \"/docs/custom-blocks/schema\"\n        }\n      ]\n    },\n    \"nav-2b\": {\n      \"@type\": \"navItem\",\n      \"label\": \"Rendering\",\n      \"href\": [\n        {\n          \"@id\": \"/docs/custom-blocks/rendering\"\n        }\n      ]\n    },\n    \"nav-3\": {\n      \"@type\": \"navItem\",\n      \"label\": \"Listings\",\n      \"href\": [\n        {\n          \"@id\": \"/docs/listings\"\n        }\n      ]\n    }\n  },\n  \"blocks_layout\": {\n    \"items\": [\n      \"nav-1\",\n      \"nav-2\",\n      \"nav-2a\",\n      \"nav-2b\",\n      \"nav-3\"\n    ]\n  }\n}\n\n{\n  \"@type\": \"contextNavigation\",\n  \"items\": { \"items\": [\"cnav-listing\"] },\n  \"blocks\": {\n    \"cnav-listing\": {\n      \"@type\": \"listing\",\n      \"variation\": \"navItem\",\n      \"querystring\": {\n        \"query\": [\n          { \"i\": \"path\",\n            \"o\": \"plone.app.querystring.operation.string.relativePath\",\n            \"v\": \".\" },\n          { \"i\": \"exclude_from_nav\",\n            \"o\": \"plone.app.querystring.operation.boolean.isFalse\",\n            \"v\": \"\" }\n        ],\n        \"sort_on\": \"getObjPositionInParent\",\n        \"depth\": 2\n      }\n    }\n  }\n}"}]}' />

<block type="codeExample" uid="ref-contextNavigation-rendering" templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-contextNavigation" slotId="rendering" data='{"tabs":[{"@id":"ref-contextNavigation-rendering-jsx-25968a","label":"React","language":"jsx","code":"function ContextNavigationBlock({ block, blocks }) {\n  const items = block.blocks_layout?.items || [];\n  return (\n    <nav\n      data-block-uid={block[&#39;@uid&#39;]}\n      aria-label={block.ariaLabel || &#39;Section navigation&#39;}\n      className=\"context-navigation\"\n    >\n      <ul role=\"list\" className=\"context-navigation-list\">\n        {items.map(id => {\n          const child = blocks[id];\n          if (!child) return null;\n          if (child[&#39;@type&#39;] === &#39;listing&#39;) {\n            return <ListingNav key={id} block={child} blockId={id} />;\n          }\n          return <NavItem key={id} block={{ ...child, &#39;@uid&#39;: id }} />;\n        })}\n      </ul>\n    </nav>\n  );\n}\n\nfunction NavItem({ block }) {\n  // Both manual and listing-synth items share shape: `href` is the\n  // object_browser array `[{ &#39;@id&#39;: string }]` (the listing variation&#39;s\n  // fieldMappings.@default maps `@id` → `href` via type=&#39;link&#39;). `label`\n  // is a string. `_level` is set by the parent ContextNavigationBlock\n  // after computing minDepth across all sibling hrefs.\n  const here = window.location.pathname.replace(/\\/edit$/, &#39;&#39;);\n  const itemPath = new URL(block.href[0][&#39;@id&#39;], window.location.origin).pathname;\n  const active = itemPath === here;\n  const inPath = !active &amp;&amp; here.startsWith(itemPath + &#39;/&#39;);\n  return (\n    <li>\n      <a\n        href={itemPath}\n        data-block-uid={block[&#39;@uid&#39;]}\n        data-edit-link=\"href\"\n        className={`nav-item level-${block._level} ${active ? &#39;current&#39; : &#39;&#39;} ${inPath ? &#39;in-path&#39; : &#39;&#39;}`}\n        aria-current={active ? &#39;page&#39; : undefined}\n      >\n        <span data-edit-text=\"label\">{block.label}</span>\n      </a>\n    </li>\n  );\n}"},{"@id":"ref-contextNavigation-rendering-vue-af752b","label":"Vue","language":"vue","code":"<template>\n  <nav\n    :data-block-uid=\"block[&#39;@uid&#39;]\"\n    :aria-label=\"block.ariaLabel || &#39;Section navigation&#39;\"\n    class=\"context-navigation\"\n  >\n    <ul role=\"list\" class=\"context-navigation-list\">\n      <li v-for=\"id in (block.blocks_layout?.items || [])\" :key=\"id\">\n        <NavItem :block=\"{ ...blocks[id], &#39;@uid&#39;: id }\" />\n      </li>\n    </ul>\n  </nav>\n</template>\n\n<script setup>\nimport NavItem from &#39;./NavItem.vue&#39;;\ndefineProps({ block: Object, blocks: Object });\n</script>"},{"@id":"ref-contextNavigation-rendering-svelte-a27836","label":"Svelte","language":"svelte","code":"<script>\n  import NavItem from &#39;./NavItem.svelte&#39;;\n  export let block;\n  export let blocks;\n  $: items = block.blocks_layout?.items || [];\n</script>\n\n<nav\n  data-block-uid={block[&#39;@uid&#39;]}\n  aria-label={block.ariaLabel || &#39;Section navigation&#39;}\n  class=\"context-navigation\"\n>\n  <ul role=\"list\" class=\"context-navigation-list\">\n    {#each items as id (id)}\n      <li>\n        <NavItem block={{ ...blocks[id], &#39;@uid&#39;: id }} />\n      </li>\n    {/each}\n  </ul>\n</nav>"}]}' />
