# Level 4: Realtime Changes While Editing

Without this step, any edits in the sidebar won't result in the preview pane changing.

## Setup

To enable realtime preview, first ensure the frontend used for editing is SPA or Hybrid (i.e., can re-render the whole page client-side).

```{tip}
You can still use SSG or SSR for your production frontend by using a different build of your frontend with client-side rendering enabled. See [Deployment](../concepts/deployment.md).
```

Register the `onEditChange` callback with the hydra.js bridge at initialisation. Your frontend can now disable loading content via the API in edit mode and instead rely on content sent over the bridge via the callback in exactly the same format as the [content API](https://6.docs.plone.org/volto/client/quick-start.html?highlight=data#query-or-mutation-options-factories).

```js
const bridge = initBridge({
  ...
  onEditChange: (formData) => renderPage(formData),
});
```

Since the data structure is the same as returned by the [REST API](https://6.docs.plone.org/plone.restapi/docs/source/index.html), it's normally easy to re-render your page dynamically using the same code your frontend used to render the page previously.

## What editors get at Level 4

The preview changes as the editor types in the sidebar — and a number of structural operations become available directly in the preview rather than requiring sidebar trips:

- **"+" button** in the preview to add blocks after the current one (BlockChooser popup).
- **Drag and drop** to move blocks; cut / copy / paste with keyboard shortcuts.
- **Remove a block** via the Quanta Toolbar dropdown.
- **Multi-block selection** — Shift+Click range, Ctrl/Cmd+Click toggle, Shift+Arrow extend (block mode).
- **Block-mode keyboard nav** — arrows move between siblings, Enter adds, Delete removes.
- **Container operations** — wrap selected blocks in a container, unwrap, edge-drag to absorb/expel adjacent blocks, convert container type while preserving children.

For how editors actually use these (visuals, modes, keyboard map), see the [Editor Guide](../editor-guide/index.md). For the integration mechanics (`onEditChange`, blocks dict, etc.), continue below.
