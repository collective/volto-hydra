---
"@type": Document
UID: docs-server-rendered-frontends-001
allow_discussion: false
contributors: []
creators:
  - admin
description: Inka works with any frontend, including ones that have no client-side
effective: 2025-01-01T00:00:00
exclude_from_nav: false
expires: null
id: server-rendered-frontends
language: "##DEFAULT##"
layout: document_view
preview_caption: null
preview_image: null
review_state: published
rights: ""
subjects:
  - frontend
title: Server-rendered frontends
assignments:
  - { uid: title-1, type: title }
  - { uid: p-1, type: slate }
  - { uid: h-2, type: slate }
  - { uid: p-3, type: slate }
  - { uid: p-4, type: slate }
  - { uid: p-5, type: slate }
  - { uid: h-6, type: slate }
  - { uid: ce-7, type: codeExample }
  - { uid: h-8, type: slate }
  - { uid: p-9, type: slate }
  - { uid: ul-10, type: slate }
  - { uid: p-11, type: slate }
  - { uid: h-12, type: slate }
  - { uid: p-13, type: slate }
  - { uid: p-14, type: slate }
  - { uid: p-15, type: slate }
  - { uid: h-16, type: slate }
  - { uid: ce-17, type: codeExample }
  - { uid: ce-18, type: codeExample }
  - { uid: ce-19, type: codeExample }
  - { uid: p-20, type: slate }
  - { uid: h-21, type: slate }
  - { uid: ce-22, type: codeExample }
  - { uid: ce-23, type: codeExample }
  - { uid: ce-24, type: codeExample }
  - { uid: p-25, type: slate }
  - { uid: ce-26, type: codeExample }
  - { uid: h-27, type: slate }
  - { uid: p-28, type: slate }
  - { uid: tbl-29, type: slateTable }
  - { uid: p-30, type: slate }
  - { uid: h-31, type: slate }
  - { uid: ul-32, type: slate }
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

Inka works with any frontend, including ones that have no client-side reactivity at all — pure server-rendered frameworks like **Astro**, **PHP**, **Django**, **Rails**, **Laravel**, **Symfony**, **Go html/template**. The bridge ships a built-in pattern for these: one config option on `initBridge` and one small endpoint on your server.

## When you need this

If you're using React, Vue, Svelte, Solid, Next, Nuxt, or any framework with client-side reactivity, you don't need this. The bridge fires `FORM_DATA`, your framework reconciles the DOM, and only the changed nodes update. Contenteditable cursors, image loads, and scroll positions survive every edit "for free" because the virtual DOM diff doesn't touch unchanged nodes.

Server-rendered-only frameworks have no such reconciliation. If you naively swapped the whole content area's `innerHTML` on every `FORM_DATA`, every keystroke would destroy contenteditable cursors, reload images, jump scroll, and reset IME state. The editing experience would be visibly broken.

The fix is to update only the smallest block that changed, and let the rest of the DOM stay untouched. That's what the bridge does when you set `renderEndpoint`.

## How it works

<block type="codeExample" data='{"tabs":[{"@id":"ce-7-text-316e7d","label":"Text","language":"text","code":"Admin (Volto)              Your server-rendered frontend\n─────────────              ──────────────────────────────\nhydra.js bridge   ────►    FORM_DATA postMessage\n                           │\n                           ▼\n                           bridge calls findChangedUnit(prev, new)\n                           │\n                           ▼\n                           unit = { unit: &#39;block&#39;, blockId: X }\n                               OR { unit: &#39;page&#39; }\n                           │\n                           ▼\n                           POST renderEndpoint { unit, formData }\n                           │\n                           ▼\n                           your endpoint renders the unit&#39;s HTML\n                           │\n                           ▼\n                           bridge swaps [data-block-uid=X].outerHTML\n                           (or renderContainer.innerHTML for page unit)"}]}' />

### The diff rule (built into `hydra.js`)

`findChangedUnit(prevFormData, newFormData)` walks the new form data against the previous one looking for the shallowest changed subtree. At each container level:

- `items` array differs (add/remove/reorder) → **this container is the unit**
- exactly one child differs AND `items` unchanged → recurse into that child
- 2 or more children differ → this container is the unit
- nothing differs → no-op (forms are equal)

Spans more than one nesting level (e.g. a block moved from one column to another) → falls back to `{ unit: 'page' }`. Most edits stay at one level because one focused field = one block.

### The `data-block-uid` contract

For the bridge to swap `[data-block-uid=X].outerHTML` reliably, every block's **outermost rendered element** must carry `data-block-uid={id}`. This is Astro-only / server-only — reactive frontends don't care because their reconciliation finds DOM nodes via virtual DOM, not query selectors.

The recommended pattern: write a `BlockRenderer` (or equivalent) wrapper in your templating language that puts the `<div data-block-uid={id}>` around every block before dispatching to the block's own template. Then block authors don't think about it — the wrapper IS the contract.

That dispatch must also handle `@type: "empty"` — the placeholder Inka seeds into any container region with no `defaultBlockType` and more than one `allowedBlocks` — by rendering an empty, selectable slot (with its `data-block-uid`) rather than erroring. See [Empty Blocks](container-blocks.md#empty-blocks).

## Worked example: Astro

<block type="codeExample" data='{"tabs":[{"@id":"ce-17-astro-6cfb06","label":"Js","language":"js","code":"// src/main.js (bridge bootstrap, runs in the iframe child)\nimport { initBridge } from &#39;@volto-hydra/hydra-js&#39;;\n\ninitBridge({\n  page: { schema: { properties: { blocks_layout: { allowedBlocks: [...] } } } },\n  blocks: { /* your block configs */ },\n  renderEndpoint: &#39;/api/render&#39;,\n  renderContainer: &#39;#content&#39;,   // optional, default &#39;#content&#39;\n});"}]}' />

<block type="codeExample" data='{"tabs":[{"@id":"ce-18-ts-ad6a37","label":"Astro","language":"astro","code":"---\n// src/components/BlockRenderer.astro — enforces the data-block-uid contract.\nimport SlateBlock from &#39;./SlateBlock.astro&#39;;\nimport ImageBlock from &#39;./ImageBlock.astro&#39;;\n// ...\n\nconst { block } = Astro.props;\nconst type = block?.[&#39;@type&#39;];\nconst uid  = block?.[&#39;@uid&#39;];\n---\n<div data-block-uid={uid}>\n  {type === &#39;slate&#39; &amp;&amp; <SlateBlock block={block} />}\n  {type === &#39;image&#39; &amp;&amp; <ImageBlock block={block} />}\n  {/* ...one branch per block type... */}\n</div>"}]}' />

<block type="codeExample" data='{"tabs":[{"@id":"ce-19-ts-892388","label":"Ts","language":"ts","code":"// src/pages/api/render.ts — the render endpoint.\nimport type { APIRoute } from &#39;astro&#39;;\nimport { experimental_AstroContainer as AstroContainer } from &#39;astro/container&#39;;\nimport BlockRenderer from &#39;../../components/BlockRenderer.astro&#39;;\nimport Content from &#39;../../components/Content.astro&#39;;\n\nexport const POST: APIRoute = async ({ request }) => {\n  const { unit, formData } = await request.json();\n  const container = await AstroContainer.create();\n  if (unit.unit === &#39;page&#39;) {\n    const html = await container.renderToString(Content, { props: { formData } });\n    return new Response(html, { headers: { &#39;Content-Type&#39;: &#39;text/html&#39; } });\n  }\n  // unit === &#39;block&#39;\n  const block = findBlockById(formData, unit.blockId);\n  const html = await container.renderToString(BlockRenderer, { props: { block } });\n  return new Response(html, { headers: { &#39;Content-Type&#39;: &#39;text/html&#39; } });\n};\n\nfunction findBlockById(formData, blockId) {\n  const blocks = formData?.blocks;\n  if (!blocks) return null;\n  if (blocks[blockId]) return { ...blocks[blockId], &#39;@uid&#39;: blockId };\n  for (const child of Object.values(blocks)) {\n    const inside = findBlockById(child, blockId);\n    if (inside) return inside;\n  }\n  return null;\n}"}]}' />

The full working example lives at [`docs/examples/test-astro/`](https://github.com/collective/volto-hydra/tree/main/docs/examples/test-astro) with block components in [`docs/examples/examples/astro/`](https://github.com/collective/volto-hydra/tree/main/docs/examples/examples/astro).

## Worked example: PHP

<block type="codeExample" data='{"tabs":[{"@id":"ce-22-php-e87720","label":"Php","language":"php","code":"<!-- blocks/_renderer.php — enforces the data-block-uid contract -->\n<div data-block-uid=\"<?= htmlspecialchars($block[&#39;@uid&#39;]) ?>\">\n  <?php\n    $tpl = __DIR__ . \"/{$block[&#39;@type&#39;]}.php\";\n    if (file_exists($tpl)) include $tpl;\n  ?>\n</div>"}]}' />

<block type="codeExample" data='{"tabs":[{"@id":"ce-23-php-9a04e4","label":"Php","language":"php","code":"<!-- blocks/slate.php — one file per block type -->\n<div data-edit-text=\"value\">\n  <?php foreach ($block[&#39;value&#39;] ?? [] as $node) include __DIR__ . &#39;/_slate_node.php&#39;; ?>\n</div>"}]}' />

<block type="codeExample" data='{"tabs":[{"@id":"ce-24-php-ebbd45","label":"Php","language":"php","code":"<?php\n// api/render.php — the render endpoint\nheader(&#39;Content-Type: text/html&#39;);\n\n$payload  = json_decode(file_get_contents(&#39;php://input&#39;), true);\n$unit     = $payload[&#39;unit&#39;];\n$formData = $payload[&#39;formData&#39;];\n\nif ($unit[&#39;unit&#39;] === &#39;page&#39;) {\n    foreach ($formData[&#39;blocks_layout&#39;][&#39;items&#39;] as $id) {\n        $block = array_merge($formData[&#39;blocks&#39;][$id], [&#39;@uid&#39; => $id]);\n        include __DIR__ . &#39;/../blocks/_renderer.php&#39;;\n    }\n} else {\n    $block = find_block_by_id($formData, $unit[&#39;blockId&#39;]);\n    include __DIR__ . &#39;/../blocks/_renderer.php&#39;;\n}\n\nfunction find_block_by_id($data, $blockId) {\n    $blocks = $data[&#39;blocks&#39;] ?? [];\n    if (isset($blocks[$blockId])) {\n        return array_merge($blocks[$blockId], [&#39;@uid&#39; => $blockId]);\n    }\n    foreach ($blocks as $child) {\n        $found = find_block_by_id($child, $blockId);\n        if ($found) return $found;\n    }\n    return null;\n}"}]}' />

The HTML page that loads in the editor iframe just needs to pull in the bridge and call `initBridge` with the endpoint:

<block type="codeExample" data='{"tabs":[{"@id":"ce-26-html-476b8c","label":"Html","language":"html","code":"<!-- index.php (or a static index.html) -->\n<!DOCTYPE html>\n<html>\n<head><title>My PHP frontend</title></head>\n<body>\n  <div id=\"content\"></div>\n  <script type=\"module\">\n    import { initBridge } from &#39;/static/hydra.js&#39;;\n    initBridge({\n      page: { schema: { properties: { blocks_layout: { allowedBlocks: [...] } } } },\n      blocks: { /* ... */ },\n      renderEndpoint: &#39;/api/render.php&#39;,\n    });\n  </script>\n</body>\n</html>"}]}' />

## Adapting for Django / Rails / Laravel / Symfony / Go

The recipe is the same in every framework — only the rendering call changes:

<block type="slateTable" data='{"table":{"fixed":true,"compact":false,"basic":false,"celled":true,"inverted":false,"striped":false,"rows":[{"key":"tbl-29-r0","cells":[{"key":"tbl-29-r0c0","type":"header","value":[{"type":"p","children":[{"text":"Framework"}]}]},{"key":"tbl-29-r0c1","type":"header","value":[{"type":"p","children":[{"text":"Render call"}]}]}]},{"key":"tbl-29-r1","cells":[{"key":"tbl-29-r1c0","type":"data","value":[{"type":"p","children":[{"text":"Astro"}]}]},{"key":"tbl-29-r1c1","type":"data","value":[{"type":"p","children":[{"type":"code","children":[{"text":"AstroContainer.renderToString(Component, { props })"}]}]}]}]},{"key":"tbl-29-r2","cells":[{"key":"tbl-29-r2c0","type":"data","value":[{"type":"p","children":[{"text":"PHP"}]}]},{"key":"tbl-29-r2c1","type":"data","value":[{"type":"p","children":[{"type":"code","children":[{"text":"ob_start(); include \"blocks/{$type}.php\"; return ob_get_clean();"}]}]}]}]},{"key":"tbl-29-r3","cells":[{"key":"tbl-29-r3c0","type":"data","value":[{"type":"p","children":[{"text":"Django"}]}]},{"key":"tbl-29-r3c1","type":"data","value":[{"type":"p","children":[{"type":"code","children":[{"text":"render_to_string(f&#39;blocks/{type}.html&#39;, {&#39;block&#39;: data})"}]}]}]}]},{"key":"tbl-29-r4","cells":[{"key":"tbl-29-r4c0","type":"data","value":[{"type":"p","children":[{"text":"Rails"}]}]},{"key":"tbl-29-r4c1","type":"data","value":[{"type":"p","children":[{"type":"code","children":[{"text":"render_to_string(\"blocks/#{type}\", locals: { block: data })"}]}]}]}]},{"key":"tbl-29-r5","cells":[{"key":"tbl-29-r5c0","type":"data","value":[{"type":"p","children":[{"text":"Laravel"}]}]},{"key":"tbl-29-r5c1","type":"data","value":[{"type":"p","children":[{"type":"code","children":[{"text":"view(\"blocks.{$type}\", [&#39;block&#39; => $data])->render()"}]}]}]}]},{"key":"tbl-29-r6","cells":[{"key":"tbl-29-r6c0","type":"data","value":[{"type":"p","children":[{"text":"Symfony (Twig)"}]}]},{"key":"tbl-29-r6c1","type":"data","value":[{"type":"p","children":[{"type":"code","children":[{"text":"$twig->render(\"blocks/{$type}.html.twig\", [&#39;block&#39; => $data])"}]}]}]}]},{"key":"tbl-29-r7","cells":[{"key":"tbl-29-r7c0","type":"data","value":[{"type":"p","children":[{"text":"Go templates"}]}]},{"key":"tbl-29-r7c1","type":"data","value":[{"type":"p","children":[{"type":"code","children":[{"text":"tpl.ExecuteTemplate(buf, type, data); return buf.String()"}]}]}]}]}]}}' />

Everything else — the diff, the POST, the swap, the `data-block-uid` contract — is identical because the bridge handles it.

## Caveats

- **Network round trip per edit.** Faster than full reload (Sanity's approach) but slower than client-side reconciliation. For a typical edit (one block at a time) it's a few hundred bytes and a few milliseconds on a same-origin endpoint. Don't put the endpoint behind authentication that adds another round trip.
- **`data-block-uid` MUST be the outer element.** A wrapper around the block from outside the renderer (e.g. a CSS-grid `<li>` your layout adds) will break `outerHTML` swaps — the swap would replace the wrapper too. Always wrap inside the renderer.
- **The endpoint must be on the same origin** as the rendered page (or CORS-enabled). The bridge POSTs from the iframe child to whatever URL you give it; cross-origin without CORS will fail.
- **The endpoint receives the full formData on every edit.** Don't log it to disk or replay it — it's editing state, potentially containing unpublished content.
