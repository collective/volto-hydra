# Templates & Layouts

Templates allow editors to centrally control content and reuse content. They allow a developer to not have to hard code layout decisions and instead use rules to apply user layouts in template content stored separately from the page, or give the user a choice on which layout they want.

---

## Template Concepts

Templates:

- Can be created from any blocks
- Are always edited in-context in the current page (user can switch in and out of template edit mode)
- Are saved alongside the page into normal content so editing template permissions can use content permissions
- `allowedTemplates` and `allowedLayouts` applied to the blocks schema let the developer control loading templates: which templates are available for use, which are automatically applied as layouts, and which the editor can switch between
- During rendering, the frontend can use the provided helper (`expandTemplates` / `expandTemplatesSync`) to refresh templates found in the page content from the template content, and apply layouts based on rules (such as forcing a layout based on content type or metadata). Alternatively the frontend can write its own merge logic.

Templates are analogous to blocks themselves but are made up of blocks with special properties. Each block in a template can be one of:

- **Fixed + ReadOnly** — can't be edited or moved (e.g. branded headers/footers). Similar to fixed hard-coded HTML in a block.
- **Fixed** — can be edited but not moved (e.g. required sections). Similar to a block field.
- **Slot** (`fixed: false` / unset) — a named region (`slotId`) where editors can add their own blocks. Similar to a block field. The `"default"` slot receives leftover content.

The slot a block lives in is identified by its `slotId`. This is the field name used by `expandTemplates` / `expandTemplatesSync` and by the merge rules below — not `placeholder`.

<!-- codeExample: json -->
```json
{
  "blocks": {
    "header": { "@type": "slate", "fixed": true,
               "readOnly": true, "slotId": "header" },
    "content": { "@type": "slate", "slotId": "default" },
    "footer": { "@type": "slate", "fixed": true,
               "readOnly": true, "slotId": "footer" }
  }
}
```

## Which mechanism for which use case?

The two configurations below look similar but solve different problems. Pick by
**who controls the structure** and **whether it repeats**:

| You want… | Use | How it's applied |
|-----------|-----|------------------|
| A reusable snippet the editor **inserts** where they choose — e.g. a contact CTA reused across many pages | **`allowedTemplates`** | Offered in the BlockChooser's "Templates" group and inserted **as a block** (the block carries `templateId`). |
| A layout **forced across an entire field/region** — a branded header/footer, or a mandated page structure | **`allowedLayouts`** | Applied across the whole blocks field; the field's content is merged into the layout's slots. The editor can't restructure it. |
| To let the editor **choose** between a few layouts | **`allowedLayouts`** (several, optionally `null`) | Offered in the Layout dropdown; `null` = "no layout". |

A **branded header/footer is the canonical `allowedLayouts` case**, *not*
`allowedTemplates`: don't make the footer a `templateId` block the editor inserts
— force a layout across the footer field. Within that layout, each block declares
how locked it is:

- **`fixed: true, readOnly: true`** — can't be edited or moved (logo, branded chrome).
- **`fixed: true`** — content-editable but not movable (a required section).
- **slot** (`fixed` unset, with `slotId`) — a region where editors add their own blocks; the `"default"` slot receives leftover content.

For a fully-fixed branded footer, leave the blocks **field empty** (`{items: []}`)
and let the layout content item supply everything — then editing the layout
updates every page.

### Block structure inside a template (read this before debugging an empty merge)

```{important}
**Every block in a template must declare a `slotId`** — not just slot blocks, but
**`fixed` and `fixed+readOnly` blocks too, and every block *nested* inside a
container.** The recursive merge keeps a nested block only when it has a `slotId`
(or a `templateId`): `if (nested.slotId || nested.templateId)`. A block without
one is **silently dropped** — the container survives but renders empty, with no
error. This is the most common reason a template "half renders".
```

**Nested containers are fully supported** (e.g. a branded footer built as a
`columns` block). The merge recurses into any field whose `.items` array lists
the block's nested block IDs — a `blocks_layout`-widget field of **any name**
(a `columns` block's `columns` field counts). Two rules for nested content:

- Pair every nested `blocks` map with such a sibling layout field (or the merge throws "no sibling field whose `.items` array lists those block IDs").
- Give **every** block a `slotId` — the container, each column, and each block inside each column. A unique id per block (e.g. the block's own uid) works.

So a branded footer is, end to end: a `columns` block (`slotId`, `fixed`,
`readOnly`) → each `column` (`slotId`, `fixed`, `readOnly`) → each leaf block
(`slotId`, `fixed`, `readOnly`).

## allowedTemplates vs allowedLayouts

Configure templates in `page.schema.properties` on the blocks field:

<!-- codeExample: javascript -->
```javascript
initBridge({
    page: {
        schema: {
            properties: {
                blocks_layout: {
                    allowedTemplates: ['/templates/form-snippet'],
                    allowedLayouts: ['/templates/article-layout'],
                },
            },
        },
    },
});
```

- **`allowedTemplates`** — Templates shown in the BlockChooser's "Templates" group, inserted as blocks.
- **`allowedLayouts`** — Templates shown in the Layout dropdown. They replace/merge the entire container content. A value of `null` allows for a no-template option. If none of those templates are already set as the layout then during editing, the first is applied automatically.

## Applying Merge Rules

Use `expandTemplates` (async) or `expandTemplatesSync` (sync with pre-fetched templates) to merge template content during rendering.

- **Edit Mode**: These functions auto-detect edit mode via `isEditMode()` and pass blocks through unchanged (just adding `@uid`). The admin handles template merging and adds `nodeId` attributes for inline editing.
- **SSR**: On SSR (no window), `isEditMode()` returns false so templates are expanded — this is correct since edit mode only exists in the browser iframe.

**Sync vs Async**:

- **`expandTemplatesSync`** — Use when templates are pre-fetched at page load. Better for Vue computed properties since it's synchronous.
- **`expandTemplates`** — Use when you need to lazy-load templates on demand. Handles on-demand loading of forced layouts not in page data.

## Pre-loading with loadTemplates

**`loadTemplates(data, loadTemplate)`** scans page data for `templateId` references and loads them all in parallel. It follows nested references (templates referencing other templates) and has a 5s per-template timeout. It only loads templates actually in the page data — `allowedLayouts` options are loaded on demand when a forced layout is applied.

```{important}
**A forced layout (`allowedLayouts`) under `expandTemplatesSync` must be
pre-loaded.** It isn't referenced from page data, so `loadTemplates` won't
auto-scan it. The async `expandTemplates` fetches it on demand, but the **sync**
`expandTemplatesSync` (recommended for SSR / Vue computed) needs it already in
`templates` — pass its id explicitly:
`loadTemplates(data, loadTemplate, cache, ['/templates/footer-layout'])`.
Otherwise you'll hit `Template "…" not found in pre-loaded templates`.
```

<!-- codeExample: javascript -->
```javascript
import { loadTemplates, expandTemplatesSync, expandTemplates }
    from '@hydra-js/hydra.js';

const loadTemplate = async (id) =>
    fetch(`${apiBase}${id}`).then(r => r.json());

// Sync approach: pre-fetch templates, use in computed properties
const templates = await loadTemplates(pageData, loadTemplate);
const templateState = {};  // Share across all expandTemplatesSync calls
const items = expandTemplatesSync(layout, {
    blocks, templateState, templates,
});

// Async approach: load templates on demand
const items = await expandTemplates(layout, {
    blocks,
    templateState: {},
    loadTemplate: async (id) => fetch(id).then(r => r.json()),
});

// Render items - each has @uid for the block ID
for (const item of items) {
    renderBlock(item['@uid'], item);
}
```

Options:

- **`blocks`**: Map of blockId -> block data
- **`templateState`**: Pass `{}` and share across calls — tracks state for nested containers
- **`templates`**: (sync only) Pre-fetched map of templateId -> template data
- **`loadTemplate(id)`**: (async only) Function to fetch template content
- **`allowedLayouts`**: Force a layout when container has no template applied

## How the Merge Works

The merge algorithm follows these rules:

1. Remove the blocks with the `templateId` to replace, storing any that aren't fixed and readOnly by `slotId`.
2. Insert in their place the template content: if fixed and readOnly, just insert it; if fixed, copy block content (not including block fields) from a page block with the same `slotId`; if a slot block, don't insert it, but insert the previous blocks with the same `slotId`.
3. Recursively replace any block fields using the same rules.
4. Any slot blocks left over are inserted at the end of a special slot called `"default"` if it exists, otherwise are dropped.

When a layout is applied, the rules are the same but applied across a whole blocks field. Content without a `slotId` ends up:

- In the `"default"` slot if it exists
- In the bottom slot outside the last fixed template block
- In the top slot outside the first fixed template block
- Otherwise it is dropped

<!-- codeExample: bash label="Diagram" -->
```bash
Before:  [User Block A] [User Block B]
Layout:  [Fixed Header] [default] [Fixed Footer] [post_footer]
After:   [Fixed Header] [User Block A] [User Block B] [Fixed Footer]
```

## Forcing Layouts

Your frontend might want to force a layout to apply regardless of whether one is saved, for example to ensure a footer layout. Pass `allowedLayouts`:

<!-- codeExample: javascript -->
```javascript
// Sync (with pre-fetched templates)
const items = expandTemplatesSync(layout, {
    blocks, templateState, templates,
    allowedLayouts: ['/templates/footer-layout'],
});

// Async
const items = await expandTemplates(layout, {
    blocks, templateState: {}, loadTemplate,
    allowedLayouts: ['/templates/footer-layout'],
});
```

Note: during editing the admin side will load the templates so in order to apply the same rules of forcing a layout you will need to set `allowedLayouts` in `page.schema.properties` to ensure the page loads with the right template.
