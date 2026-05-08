# Incremental adoption

Hydra is designed so each layer of integration is **independent and additive**. You can stop at any row in the table below and have a working setup; rows further down enhance the editing experience without breaking the rows above. There's no all-or-nothing commitment.

This page is a map, not a how-to — each row links to the concept page where you find the actual setup details.

| Step | What you wire up | What editors get |
|------|------------------|------------------|
| **Plain headless** | Frontend fetches the Plone REST API. No `hydra.js` involved. | Sidebar editing in Volto, frontend reloads on save. Equivalent to two-window editing — see [Deployment › Without Hydra](deployment.md#without-hydra-two-window-editing). |
| **Bridge installed** | Load `hydra.js`. Call `initBridge({ page: { schema: { properties: { ... } } } })`. See [Live Preview › Setting Up the Bridge](live-preview.md#setting-up-the-bridge). | Frontend follows admin navigation (and vice versa). Frontend renders private content via shared auth ([Authentication](advanced.md#authentication)). Page metadata (title, description, etc.) is editable from the admin. Hashbang and normal paths both work. |
| **Custom block types** | Add a `blocks: { ... }` config to `initBridge`. See [Custom Blocks › `initBridge()` Reference](custom-blocks.md#initbridge-reference) and [Defining a custom block](custom-blocks.md#defining-a-custom-block). | Editors can add, configure, and convert your custom block types — the schema renders in the sidebar without you touching Volto. Cross-block conversion ([fieldMappings](custom-blocks.md#block-conversion--fieldmappings)) becomes possible. |
| **Block selection in preview** | Add `data-block-uid` to your rendered blocks. See [Visual Editing › HTML Annotations](visual-editing.md#html-annotations-for-visual-editing). | Click-to-select on the preview. The Quanta Toolbar appears above selected blocks. Sidebar selection scrolls the matching block into view. Multi-block selection becomes possible (Shift+Click, Ctrl/Cmd+Click) — see [Editor Guide › Selecting blocks](../what-editors-will-experience/selecting-blocks.md). |
| **Realtime preview** | Register `onEditChange` and render from the `formData` it gives you instead of from the API. See [Live Preview › Setting Up the Bridge](live-preview.md#setting-up-the-bridge). | Preview updates as the editor types. The full editor experience unlocks: drag-and-drop, multi-select operations, the slash menu, container operations (wrap, unwrap, edge-drag, convert) — see the [Editor Guide](../what-editors-will-experience/index.md) for the full list. |
| **Direct field editing** | Add `data-edit-text`, `data-edit-link`, `data-edit-media` to specific elements. See [Visual Editing › HTML Annotations](visual-editing.md#html-annotations-for-visual-editing). | Click rendered text and start typing. Click an image to pick or upload a new one. Click a link to open the link picker. Markdown shortcuts (`## `, `**bold**`, etc.) — see [Editor Guide › Editing text](../what-editors-will-experience/editing-text.md). |
| **Templates and layouts** | Configure `allowedTemplates` / `allowedLayouts` on a page region. Use `expandTemplates` / `expandTemplatesSync` at render time. See [Templates](templates.md). | Editors can pick layouts from a dropdown, insert template snippets via the BlockChooser, and recognise locked vs editable vs slot blocks. See [Editor Guide › Templates and layouts](../what-editors-will-experience/templates-and-layouts.md). |
| **Listings and dynamic content** | Configure listing block types and pass `fetchItems` to `expandListingBlocks`. See [Listings](listings.md). | Editors get a `fieldMapping` widget on listing blocks to map query results to item fields. Listings render as repeated blocks in the preview, editable per item type. |
| **Custom UI / advanced** | Override Volto components, or use the bridge's `sendBlockUpdate` / `sendBlockAction` API to drive frontend-side editing for blocks Hydra's defaults don't fit. See [Advanced › Custom Sidebar UI](advanced.md#custom-sidebar-and-cms-ui). | Editors can use bespoke widgets, custom block edit forms, and in-frontend interactions for things like a table block's column-count picker on first insert. |

## Why incremental?

The trade-off at each row is **complexity vs editor experience**. A frontend that only fetches the REST API has zero Hydra integration cost — no JS to ship, no attributes to add — and editors can still publish content via the standard Volto sidebar. Each row adds a specific concrete editor capability in exchange for a specific concrete piece of frontend code.

This means:

- **You can ship before integration is "done"** — wire up the bridge and ship realtime preview today, add direct field editing for the page title next week.
- **Different parts of the same site can be at different rows** — inline-editable headers and titles on the homepage, sidebar-only editing on a complex catalog page where direct manipulation would be confusing.
- **Adoption can match team capacity** — start with whichever rows produce the biggest editor wins for your team, defer the rest.

## What's still on the roadmap

- Live updates with SSR via REST API — sidebar changes reflected in an SSR preview without a SPA build (TODO).
- Visual diff in version history — currently history shows JSON-level diffs only (TODO).
- Markdown autoformat for h4–h6 and additional inline patterns ([TODO #105](https://github.com/collective/volto-hydra/issues/105)).
- `sendBlockUpdate` / disable Hydra default handling for specific interactions ([TODO #4](https://github.com/collective/volto-hydra/issues/4)).
