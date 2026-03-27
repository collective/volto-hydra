# Level 4: Realtime Changes While Editing

Without this step, any edits in the sidebar won't result in the preview pane changing.

## Setup

To enable realtime preview, first ensure the frontend used for editing is SPA or Hybrid (i.e., can re-render the whole page client-side).

```{tip}
You can still use SSG or SSR for your production frontend by using a different build of your frontend with client-side rendering enabled. See {doc}`../deployment/index`.
```

Register the `onEditChange` callback with the hydra.js bridge at initialisation. Your frontend can now disable loading content via the API in edit mode and instead rely on content sent over the bridge via the callback in exactly the same format as the [content API](https://6.docs.plone.org/volto/client/quick-start.html?highlight=data#query-or-mutation-options-factories).

```js
const bridge = initBridge({
  ...
  onEditChange: (formData) => renderPage(formData),
});
```

Since the data structure is the same as returned by the [REST API](https://6.docs.plone.org/plone.restapi/docs/source/index.html), it's normally easy to re-render your page dynamically using the same code your frontend used to render the page previously.

## Editor Capabilities at Level 4

In addition to the preview changing as you type in the sidebar:

- **Click on "+" icon** directly on the frontend to add a block after the current block — the BlockChooser popup will appear
  - The "+" icon appears outside the corner of the element with `data-block-uid` in the direction the block will be added
- **Remove a block** via the Quanta Toolbar dropdown
- **Drag and drop** and cut, copy and paste on the preview
- **Open or close** the block settings
- Multiple block selection to move, delete, or copy in bulk (TODO)
- And more (TODO)
