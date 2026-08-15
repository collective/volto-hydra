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
  - { id: ce-5-javascript-3259a0 }
  - { uid: p-6, type: slate }
  - { uid: p-7, type: slate }
  - { uid: h-8, type: slate }
  - { uid: p-9, type: slate }
  - { uid: ce-10, type: codeExample }
  - { id: ce-10-javascript-23153e }
  - { uid: h-11, type: slate }
  - { uid: p-12, type: slate }
  - { uid: ce-13, type: codeExample }
  - { id: ce-13-javascript-4aeb0d }
prototypes: |
  <block type="title" _="${h1}" />
  <block type="slate" value="${p|h*|ul|ol|blockquote/slate}" />
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

<block type="codeExample">

### Javascript

```javascript
import { initBridge } from './hydra.js';

let bridge;
if (window.name.startsWith('hydra')) {
    bridge = initBridge({
        onEditChange: (formData) => renderPage(formData),
    });
} else {
    renderPage(await fetchContent(window.location.pathname));
}
```

</block>

The `formData` passed to `onEditChange` has the same structure as the Plone REST API response, so the same rendering code works for both live editing and normal page display.

Either hashbang (`/#!/path`) or normal (`/path`) style paths are supported.

## A Simple Page Renderer

Iterate `blocks_layout.items` and render each block by type. Add `data-block-uid` so Inka knows which block the user clicked.

<block type="codeExample">

### Javascript

```javascript
<!DOCTYPE html>
<html>
<head>
    <script type="module">
    import { initBridge } from './hydra.js';

    if (window.name.startsWith('hydra')) {
        initBridge({
            onEditChange: (formData) => renderPage(formData),
        });
    } else {
        renderPage(await fetchContent(window.location.pathname));
    }

    function renderPage(data) {
        document.getElementById('content').innerHTML =
            data.blocks_layout.items.map(id => {
                const block = data.blocks[id];
                return `<div data-block-uid="${id}">
                    ${renderBlock(block)}
                </div>`;
            }).join('');
    }

    function renderBlock(block) {
        switch (block['@type']) {
            case 'slate':
                return renderSlate(block.value);
            case 'image':
                return `<img src="${block.url}/@@images/image" />`;
            default:
                return `<pre>${JSON.stringify(block, null, 2)}</pre>`;
        }
    }
    </script>
</head>
<body>
    <div id="content"></div>
</body>
</html>
```

</block>

## Allowed Blocks and Page Regions

When initialising the bridge, you can configure rules for what blocks can be added to the page and where. Pages can have multiple blocks fields for different regions (e.g., header, content, footer), each with its own allowed block types and limits. These show as separate sections in the sidebar when no block is selected:

<block type="codeExample">

### Javascript

```javascript
bridge = initBridge({
    page: {
        schema: {
            properties: {
                items: {
                    widget: 'blocks_layout',
                    title: 'Content',
                    allowedBlocks: ['slate', 'image', 'hero', 'columns'],
                },
                header: {
                    widget: 'blocks_layout',
                    title: 'Header',
                    allowedBlocks: ['slate', 'image'],
                    maxLength: 3,
                },
                footer: {
                    widget: 'blocks_layout',
                    title: 'Footer',
                    allowedBlocks: ['slate', 'link'],
                },
            },
        },
    },
});
```

</block>
