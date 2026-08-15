---
"@type": Document
UID: docs-live-preview-001
allow_discussion: false
contributors: []
creators:
  - admin
description: To make your site editable with Inka you load hydra.js in your
  frontend and call initBridge(). This sets up a two-way communication channel
  that handles authentication, page navigation, and live content updates.
effective: 2025-01-01T00:00:00
exclude_from_nav: false
expires: null
id: live-preview
language: "##DEFAULT##"
layout: document_view
preview_caption: null
preview_image: null
review_state: published
rights: ""
subjects:
  - editing
title: Live Preview
assignments:
  - { uid: title-1, type: title }
  - { uid: p-1, type: slate }
  - { uid: sep-2, type: separator }
  - { uid: h-3, type: slate }
  - { uid: p-4, type: slate }
  - { uid: ce-5, type: codeExample }
  - { uid: p-6, type: slate }
  - { uid: p-7, type: slate }
  - { uid: h-8, type: slate }
  - { uid: p-9, type: slate }
  - { uid: ce-10, type: codeExample }
  - { uid: h-11, type: slate }
  - { uid: p-12, type: slate }
  - { uid: ce-13, type: codeExample }
prototypes: |
  <block type="title" _="${h1}" />
  <block type="slate" value="${p|h2|h3|h4|h5|h6|ul|ol|blockquote/slate}" />
  <block type="separator" _="${hr}" />
  <block type="codeExample">
    <region name="tabs" widget="object_list">
      <block type="tab" label="${h3/text}" language="${pre/lang}" code="${pre/text}" />
    </region>
  </block>
---

# 

To make your site editable with Inka you load hydra.js in your frontend and call `initBridge()`. This sets up a two-way communication channel that handles authentication, page navigation, and live content updates.

---

## Setting Up the Bridge

Call `initBridge()` with an `onEditChange` callback to receive live content updates as the user edits. Your frontend re-renders in real time. Outside edit mode, fetch content from the API as normal.

<block type="codeExample" data='{"tabs":[{"@id":"ce-5-javascript-3259a0","label":"Javascript","language":"javascript","code":"import { initBridge } from &#39;./hydra.js&#39;;\n\nlet bridge;\nif (window.name.startsWith(&#39;hydra&#39;)) {\n    bridge = initBridge({\n        onEditChange: (formData) => renderPage(formData),\n    });\n} else {\n    renderPage(await fetchContent(window.location.pathname));\n}"}]}' />

The `formData` passed to `onEditChange` has the same structure as the Plone REST API response, so the same rendering code works for both live editing and normal page display.

Either hashbang (`/#!/path`) or normal (`/path`) style paths are supported.

## A Simple Page Renderer

Iterate `blocks_layout.items` and render each block by type. Add `data-block-uid` so Inka knows which block the user clicked.

<block type="codeExample" data='{"tabs":[{"@id":"ce-10-javascript-23153e","label":"Javascript","language":"javascript","code":"<!DOCTYPE html>\n<html>\n<head>\n    <script type=\"module\">\n    import { initBridge } from &#39;./hydra.js&#39;;\n\n    if (window.name.startsWith(&#39;hydra&#39;)) {\n        initBridge({\n            onEditChange: (formData) => renderPage(formData),\n        });\n    } else {\n        renderPage(await fetchContent(window.location.pathname));\n    }\n\n    function renderPage(data) {\n        document.getElementById(&#39;content&#39;).innerHTML =\n            data.blocks_layout.items.map(id => {\n                const block = data.blocks[id];\n                return `<div data-block-uid=\"${id}\">\n                    ${renderBlock(block)}\n                </div>`;\n            }).join(&#39;&#39;);\n    }\n\n    function renderBlock(block) {\n        switch (block[&#39;@type&#39;]) {\n            case &#39;slate&#39;:\n                return renderSlate(block.value);\n            case &#39;image&#39;:\n                return `<img src=\"${block.url}/@@images/image\" />`;\n            default:\n                return `<pre>${JSON.stringify(block, null, 2)}</pre>`;\n        }\n    }\n    </script>\n</head>\n<body>\n    <div id=\"content\"></div>\n</body>\n</html>"}]}' />

## Allowed Blocks and Page Regions

When initialising the bridge, you can configure rules for what blocks can be added to the page and where. Pages can have multiple blocks fields for different regions (e.g., header, content, footer), each with its own allowed block types and limits. These show as separate sections in the sidebar when no block is selected:

<block type="codeExample" data='{"tabs":[{"@id":"ce-13-javascript-4aeb0d","label":"Javascript","language":"javascript","code":"bridge = initBridge({\n    page: {\n        schema: {\n            properties: {\n                items: {\n                    widget: &#39;blocks_layout&#39;,\n                    title: &#39;Content&#39;,\n                    allowedBlocks: [&#39;slate&#39;, &#39;image&#39;, &#39;hero&#39;, &#39;columns&#39;],\n                },\n                header: {\n                    widget: &#39;blocks_layout&#39;,\n                    title: &#39;Header&#39;,\n                    allowedBlocks: [&#39;slate&#39;, &#39;image&#39;],\n                    maxLength: 3,\n                },\n                footer: {\n                    widget: &#39;blocks_layout&#39;,\n                    title: &#39;Footer&#39;,\n                    allowedBlocks: [&#39;slate&#39;, &#39;link&#39;],\n                },\n            },\n        },\n    },\n});"}]}' />
