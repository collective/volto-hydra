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
blocks:
  - title-1: title
  - p-1: slate
  - h-2: slate
  - p-3: slate
  - p-4: slate
  - p-5: slate
  - h-6: slate
  - ce-7: codeExample
  - h-8: slate
  - p-9: slate
  - ul-10: slate
  - p-11: slate
  - h-12: slate
  - p-13: slate
  - p-14: slate
  - p-15: slate
  - h-16: slate
  - ce-17: codeExample
  - ce-18: codeExample
  - ce-19: codeExample
  - p-20: slate
  - h-21: slate
  - ce-22: codeExample
  - ce-23: codeExample
  - ce-24: codeExample
  - p-25: slate
  - ce-26: codeExample
  - h-27: slate
  - p-28: slate
  - tbl-29: slateTable
  - p-30: slate
  - h-31: slate
  - ul-32: slate
---

:::title{uid="title-1"}
:::

Inka works with any frontend, including ones that have no client-side reactivity at all — pure server-rendered frameworks like **Astro**, **PHP**, **Django**, **Rails**, **Laravel**, **Symfony**, **Go html/template**. The bridge ships a built-in pattern for these: one config option on `initBridge` and one small endpoint on your server.

## When you need this

If you're using React, Vue, Svelte, Solid, Next, Nuxt, or any framework with client-side reactivity, you don't need this. The bridge fires `FORM_DATA`, your framework reconciles the DOM, and only the changed nodes update. Contenteditable cursors, image loads, and scroll positions survive every edit "for free" because the virtual DOM diff doesn't touch unchanged nodes.

Server-rendered-only frameworks have no such reconciliation. If you naively swapped the whole content area's `innerHTML` on every `FORM_DATA`, every keystroke would destroy contenteditable cursors, reload images, jump scroll, and reset IME state. The editing experience would be visibly broken.

The fix is to update only the smallest block that changed, and let the rest of the DOM stay untouched. That's what the bridge does when you set `renderEndpoint`.

## How it works

:::codeExample{uid="ce-7"}
::::tabs[items]{repeat="h3" label="${1/text}" language="${2/lang}" code="${2/code}" @ids=["ce-7-text-316e7d"]}
### Text

```text
Admin (Volto)              Your server-rendered frontend
─────────────              ──────────────────────────────
hydra.js bridge   ────►    FORM_DATA postMessage
                           │
                           ▼
                           bridge calls findChangedUnit(prev, new)
                           │
                           ▼
                           unit = { unit: 'block', blockId: X }
                               OR { unit: 'page' }
                           │
                           ▼
                           POST renderEndpoint { unit, formData }
                           │
                           ▼
                           your endpoint renders the unit's HTML
                           │
                           ▼
                           bridge swaps [data-block-uid=X].outerHTML
                           (or renderContainer.innerHTML for page unit)
```
::::
:::

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

:::codeExample{uid="ce-17"}
::::tabs[items]{repeat="h3" label="${1/text}" language="${2/lang}" code="${2/code}" @ids=["ce-17-astro-6cfb06"]}
### Js

```js
// src/main.js (bridge bootstrap, runs in the iframe child)
import { initBridge } from '@volto-hydra/hydra-js';

initBridge({
  page: { schema: { properties: { blocks_layout: { allowedBlocks: [...] } } } },
  blocks: { /* your block configs */ },
  renderEndpoint: '/api/render',
  renderContainer: '#content',   // optional, default '#content'
});
```
::::
:::

:::codeExample{uid="ce-18"}
::::tabs[items]{repeat="h3" label="${1/text}" language="${2/lang}" code="${2/code}" @ids=["ce-18-ts-ad6a37"]}
### Astro

```astro
---
// src/components/BlockRenderer.astro — enforces the data-block-uid contract.
import SlateBlock from './SlateBlock.astro';
import ImageBlock from './ImageBlock.astro';
// ...

const { block } = Astro.props;
const type = block?.['@type'];
const uid  = block?.['@uid'];
---
<div data-block-uid={uid}>
  {type === 'slate' && <SlateBlock block={block} />}
  {type === 'image' && <ImageBlock block={block} />}
  {/* ...one branch per block type... */}
</div>
```
::::
:::

:::codeExample{uid="ce-19"}
::::tabs[items]{repeat="h3" label="${1/text}" language="${2/lang}" code="${2/code}" @ids=["ce-19-ts-892388"]}
### Ts

```ts
// src/pages/api/render.ts — the render endpoint.
import type { APIRoute } from 'astro';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import BlockRenderer from '../../components/BlockRenderer.astro';
import Content from '../../components/Content.astro';

export const POST: APIRoute = async ({ request }) => {
  const { unit, formData } = await request.json();
  const container = await AstroContainer.create();
  if (unit.unit === 'page') {
    const html = await container.renderToString(Content, { props: { formData } });
    return new Response(html, { headers: { 'Content-Type': 'text/html' } });
  }
  // unit === 'block'
  const block = findBlockById(formData, unit.blockId);
  const html = await container.renderToString(BlockRenderer, { props: { block } });
  return new Response(html, { headers: { 'Content-Type': 'text/html' } });
};

function findBlockById(formData, blockId) {
  const blocks = formData?.blocks;
  if (!blocks) return null;
  if (blocks[blockId]) return { ...blocks[blockId], '@uid': blockId };
  for (const child of Object.values(blocks)) {
    const inside = findBlockById(child, blockId);
    if (inside) return inside;
  }
  return null;
}
```
::::
:::

The full working example lives at [`docs/examples/test-astro/`](https://github.com/collective/volto-hydra/tree/main/docs/examples/test-astro) with block components in [`docs/examples/examples/astro/`](https://github.com/collective/volto-hydra/tree/main/docs/examples/examples/astro).

## Worked example: PHP

:::codeExample{uid="ce-22"}
::::tabs[items]{repeat="h3" label="${1/text}" language="${2/lang}" code="${2/code}" @ids=["ce-22-php-e87720"]}
### Php

```php
<!-- blocks/_renderer.php — enforces the data-block-uid contract -->
<div data-block-uid="<?= htmlspecialchars($block['@uid']) ?>">
  <?php
    $tpl = __DIR__ . "/{$block['@type']}.php";
    if (file_exists($tpl)) include $tpl;
  ?>
</div>
```
::::
:::

:::codeExample{uid="ce-23"}
::::tabs[items]{repeat="h3" label="${1/text}" language="${2/lang}" code="${2/code}" @ids=["ce-23-php-9a04e4"]}
### Php

```php
<!-- blocks/slate.php — one file per block type -->
<div data-edit-text="value">
  <?php foreach ($block['value'] ?? [] as $node) include __DIR__ . '/_slate_node.php'; ?>
</div>
```
::::
:::

:::codeExample{uid="ce-24"}
::::tabs[items]{repeat="h3" label="${1/text}" language="${2/lang}" code="${2/code}" @ids=["ce-24-php-ebbd45"]}
### Php

```php
<?php
// api/render.php — the render endpoint
header('Content-Type: text/html');

$payload  = json_decode(file_get_contents('php://input'), true);
$unit     = $payload['unit'];
$formData = $payload['formData'];

if ($unit['unit'] === 'page') {
    foreach ($formData['blocks_layout']['items'] as $id) {
        $block = array_merge($formData['blocks'][$id], ['@uid' => $id]);
        include __DIR__ . '/../blocks/_renderer.php';
    }
} else {
    $block = find_block_by_id($formData, $unit['blockId']);
    include __DIR__ . '/../blocks/_renderer.php';
}

function find_block_by_id($data, $blockId) {
    $blocks = $data['blocks'] ?? [];
    if (isset($blocks[$blockId])) {
        return array_merge($blocks[$blockId], ['@uid' => $blockId]);
    }
    foreach ($blocks as $child) {
        $found = find_block_by_id($child, $blockId);
        if ($found) return $found;
    }
    return null;
}
```
::::
:::

The HTML page that loads in the editor iframe just needs to pull in the bridge and call `initBridge` with the endpoint:

:::codeExample{uid="ce-26"}
::::tabs[items]{repeat="h3" label="${1/text}" language="${2/lang}" code="${2/code}" @ids=["ce-26-html-476b8c"]}
### Html

```html
<!-- index.php (or a static index.html) -->
<!DOCTYPE html>
<html>
<head><title>My PHP frontend</title></head>
<body>
  <div id="content"></div>
  <script type="module">
    import { initBridge } from '/static/hydra.js';
    initBridge({
      page: { schema: { properties: { blocks_layout: { allowedBlocks: [...] } } } },
      blocks: { /* ... */ },
      renderEndpoint: '/api/render.php',
    });
  </script>
</body>
</html>
```
::::
:::

## Adapting for Django / Rails / Laravel / Symfony / Go

The recipe is the same in every framework — only the rendering call changes:

:::slateTable{uid="tbl-29"}
```fields
{
 "table": {
  "fixed": true,
  "compact": false,
  "basic": false,
  "celled": true,
  "inverted": false,
  "striped": false,
  "rows": [
   {
    "key": "tbl-29-r0",
    "cells": [
     {
      "key": "tbl-29-r0c0",
      "type": "header",
      "value": [
       {
        "type": "p",
        "children": [
         {
          "text": "Framework"
         }
        ]
       }
      ]
     },
     {
      "key": "tbl-29-r0c1",
      "type": "header",
      "value": [
       {
        "type": "p",
        "children": [
         {
          "text": "Render call"
         }
        ]
       }
      ]
     }
    ]
   },
   {
    "key": "tbl-29-r1",
    "cells": [
     {
      "key": "tbl-29-r1c0",
      "type": "data",
      "value": [
       {
        "type": "p",
        "children": [
         {
          "text": "Astro"
         }
        ]
       }
      ]
     },
     {
      "key": "tbl-29-r1c1",
      "type": "data",
      "value": [
       {
        "type": "p",
        "children": [
         {
          "type": "code",
          "children": [
           {
            "text": "AstroContainer.renderToString(Component, { props })"
           }
          ]
         }
        ]
       }
      ]
     }
    ]
   },
   {
    "key": "tbl-29-r2",
    "cells": [
     {
      "key": "tbl-29-r2c0",
      "type": "data",
      "value": [
       {
        "type": "p",
        "children": [
         {
          "text": "PHP"
         }
        ]
       }
      ]
     },
     {
      "key": "tbl-29-r2c1",
      "type": "data",
      "value": [
       {
        "type": "p",
        "children": [
         {
          "type": "code",
          "children": [
           {
            "text": "ob_start(); include \"blocks/{$type}.php\"; return ob_get_clean();"
           }
          ]
         }
        ]
       }
      ]
     }
    ]
   },
   {
    "key": "tbl-29-r3",
    "cells": [
     {
      "key": "tbl-29-r3c0",
      "type": "data",
      "value": [
       {
        "type": "p",
        "children": [
         {
          "text": "Django"
         }
        ]
       }
      ]
     },
     {
      "key": "tbl-29-r3c1",
      "type": "data",
      "value": [
       {
        "type": "p",
        "children": [
         {
          "type": "code",
          "children": [
           {
            "text": "render_to_string(f'blocks/{type}.html', {'block': data})"
           }
          ]
         }
        ]
       }
      ]
     }
    ]
   },
   {
    "key": "tbl-29-r4",
    "cells": [
     {
      "key": "tbl-29-r4c0",
      "type": "data",
      "value": [
       {
        "type": "p",
        "children": [
         {
          "text": "Rails"
         }
        ]
       }
      ]
     },
     {
      "key": "tbl-29-r4c1",
      "type": "data",
      "value": [
       {
        "type": "p",
        "children": [
         {
          "type": "code",
          "children": [
           {
            "text": "render_to_string(\"blocks/#{type}\", locals: { block: data })"
           }
          ]
         }
        ]
       }
      ]
     }
    ]
   },
   {
    "key": "tbl-29-r5",
    "cells": [
     {
      "key": "tbl-29-r5c0",
      "type": "data",
      "value": [
       {
        "type": "p",
        "children": [
         {
          "text": "Laravel"
         }
        ]
       }
      ]
     },
     {
      "key": "tbl-29-r5c1",
      "type": "data",
      "value": [
       {
        "type": "p",
        "children": [
         {
          "type": "code",
          "children": [
           {
            "text": "view(\"blocks.{$type}\", ['block' => $data])->render()"
           }
          ]
         }
        ]
       }
      ]
     }
    ]
   },
   {
    "key": "tbl-29-r6",
    "cells": [
     {
      "key": "tbl-29-r6c0",
      "type": "data",
      "value": [
       {
        "type": "p",
        "children": [
         {
          "text": "Symfony (Twig)"
         }
        ]
       }
      ]
     },
     {
      "key": "tbl-29-r6c1",
      "type": "data",
      "value": [
       {
        "type": "p",
        "children": [
         {
          "type": "code",
          "children": [
           {
            "text": "$twig->render(\"blocks/{$type}.html.twig\", ['block' => $data])"
           }
          ]
         }
        ]
       }
      ]
     }
    ]
   },
   {
    "key": "tbl-29-r7",
    "cells": [
     {
      "key": "tbl-29-r7c0",
      "type": "data",
      "value": [
       {
        "type": "p",
        "children": [
         {
          "text": "Go templates"
         }
        ]
       }
      ]
     },
     {
      "key": "tbl-29-r7c1",
      "type": "data",
      "value": [
       {
        "type": "p",
        "children": [
         {
          "type": "code",
          "children": [
           {
            "text": "tpl.ExecuteTemplate(buf, type, data); return buf.String()"
           }
          ]
         }
        ]
       }
      ]
     }
    ]
   }
  ]
 }
}
```
:::

Everything else — the diff, the POST, the swap, the `data-block-uid` contract — is identical because the bridge handles it.

## Caveats

- **Network round trip per edit.** Faster than full reload (Sanity's approach) but slower than client-side reconciliation. For a typical edit (one block at a time) it's a few hundred bytes and a few milliseconds on a same-origin endpoint. Don't put the endpoint behind authentication that adds another round trip.
- **`data-block-uid` MUST be the outer element.** A wrapper around the block from outside the renderer (e.g. a CSS-grid `<li>` your layout adds) will break `outerHTML` swaps — the swap would replace the wrapper too. Always wrap inside the renderer.
- **The endpoint must be on the same origin** as the rendered page (or CORS-enabled). The bridge POSTs from the iframe child to whatever URL you give it; cross-origin without CORS will fail.
- **The endpoint receives the full formData on every edit.** Don't log it to disk or replay it — it's editing state, potentially containing unpublished content.
