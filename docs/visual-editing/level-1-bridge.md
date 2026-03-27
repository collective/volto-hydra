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

To know you are being managed by Hydra, check if `window.name` starts with `hydra`. See {doc}`../advanced/index` for lazy loading patterns.

To see private content, you will need to change your authentication token (see {doc}`../advanced/index`).

## Editor Capabilities at Level 1

This will enable an editor to:

- **Browse in your frontend** and Hydra will change context so AdminUI actions are on the current page you are seeing
- **Add a page** in Hydra and it will appear — now the frontend has the same editor authentication and can see private content
- **Edit a page** — content still won't change until after save

```{note}
Either hashbang `/#!/path` or normal `/path` style paths are supported.
```
