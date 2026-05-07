# Level 1: Preview with Page Switching and Authentication

We include the Hydra iframe bridge which creates a two-way link between the Hydra editor and your frontend.

## Setup

1. Take the latest [hydra.js](https://github.com/collective/volto-hydra/tree/main/packages/hydra-js) from the hydra-js package and include it in your frontend
2. During admin, initialise it with Volto settings:

```js
import { initBridge } from './hydra.js';
const bridge = initBridge({
  page: {
    schema: {
      properties: {
        blocks_layout: { title: 'Content', allowedBlocks: ['slate', 'image', 'video'] },
      },
    },
  },
});
```

## Detecting Hydra Mode

To know you are being managed by Hydra, check if `window.name` starts with `hydra`. See [Advanced](../concepts/advanced.md) for lazy loading patterns.

To see private content, you will need to change your authentication token (see [Advanced](../concepts/advanced.md)).

## What editors get at Level 1

Frontend navigation is now bidirectional, and authentication is shared:

- Browsing in the frontend updates Hydra's context — admin actions stay on the page the editor is looking at.
- Private content renders in the preview because the frontend has the editor's auth token.
- Editing still happens via the sidebar; preview updates on save.

Either hashbang (`/#!/path`) or normal (`/path`) style paths are supported.

For the editor-side UX (selecting, editing, moving blocks), see the [Editor Guide](../editor-guide/index.md) — those interactions need Level 3+.
