# Live Preview

To make your site editable with Hydra you load hydra.js in your frontend and call `initBridge()`. This sets up a two-way communication channel that handles authentication, page navigation, and live content updates.

## Setting Up the Bridge

Call `initBridge()` with an `onEditChange` callback to receive live content updates as the user edits. Your frontend re-renders in real time. Outside edit mode, fetch content from the API as normal.

<!-- codeExample: javascript -->
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

The `formData` passed to `onEditChange` has the same structure as the Plone REST API response, so the same rendering code works for both live editing and normal page display.

## A Simple Page Renderer

Iterate `blocks_layout.items` and render each block by type. Add `data-block-uid` so Hydra knows which block the user clicked.

<!-- codeExample: javascript -->
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

## Allowed Blocks and Page Regions

When initialising the bridge, you can configure rules for what blocks can be added to the page and where. Pages can have multiple blocks fields for different regions (e.g., header, content, footer), each with its own allowed block types and limits. These show as separate sections in the sidebar when no block is selected:

<!-- codeExample: javascript -->
```javascript
bridge = initBridge({
    page: {
        schema: {
            properties: {
                blocks_layout: {
                    title: 'Content',
                    allowedBlocks: ['slate', 'image', 'hero', 'columns'],
                },
                header_blocks: {
                    title: 'Header',
                    allowedBlocks: ['slate', 'image'],
                    maxLength: 3,
                },
                footer_blocks: {
                    title: 'Footer',
                    allowedBlocks: ['slate', 'link'],
                },
            },
        },
    },
});
```
