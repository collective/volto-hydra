# Templates & Layouts

Templates allow editors to centrally control content and reuse content. They allow a developer to not have to hard code layout decisions and instead use rules to apply user layouts in template content stored separately from the page, or give the user a choice on which layout they want.

## Template Concepts

Templates:

- Can be created from any blocks
- Are always edited in-context in the current page (user can switch in and out of template edit mode)
- Are saved alongside the page into normal content so editing template permissions can use content permissions
- `allowedTemplates` and `allowedLayouts` in the blocks schema let the developer control which templates are available and how they are applied

Templates are analogous to blocks themselves but are made up of blocks with special properties:

- **Fixed + ReadOnly**: Can't be edited or moved (e.g., branded headers/footers)
- **Fixed**: Can be edited but not moved (e.g., required sections)
- **Placeholder**: Named slots where editors can add their own blocks. The "default" placeholder receives leftover content.

<!-- codeExample: json -->
```json
{
  "blocks": {
    "header": { "@type": "slate", "fixed": true,
               "readOnly": true, "placeholder": "header" },
    "content": { "@type": "slate", "placeholder": "default" },
    "footer": { "@type": "slate", "fixed": true,
               "readOnly": true, "placeholder": "footer" }
  }
}
```

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

1. Remove the blocks with the `templateId` to replace, storing any that aren't fixed and readOnly by placeholder name.
2. Insert in their place the template content: if fixed and readOnly, just insert it; if fixed, copy block content (not including block fields) from a page block with the same placeholder name; if a placeholder, don't insert it, but insert the previous blocks with the same placeholder name.
3. Recursively replace any block fields using the same rules.
4. Any placeholder blocks left over are inserted at the end of a special placeholder called "default" if it exists, otherwise are dropped.

When a layout is applied, the rules are the same but applied across a whole blocks field. Content without a placeholder name ends up:

- In the "default" placeholder if it exists
- In the bottom placeholder outside the last fixed template block
- In the top placeholder outside the first fixed template block
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
