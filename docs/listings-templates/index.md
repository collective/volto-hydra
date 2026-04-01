# Listings, Dynamic Blocks & Templates

## Listings and Dynamic Repeating Blocks

A listing block fetches content from a query (e.g., latest news) and renders each result as a separate block, repeating each block with one result entry. This allows a listing to be moved between containers and reuse normal blocks for what it repeats.

`expandListingBlocks` is a helper in hydra.js which handles fetching, paging, and mapping results to block objects:

```js
import { expandListingBlocks, ploneFetchItems } from '@volto-hydra/hydra-js';

const { items, paging } = await expandListingBlocks(layout, {
  blocks,
  paging: { start: 0, size: 6 },
  fetchItems: { listing: ploneFetchItems({ apiUrl, contextPath }) },
});
// items = [{ '@uid': 'listing-1', '@type': 'summary', title: 'My Article', href: '/my-article', ... }, ...]
// paging = { totalPages, totalItems, currentPage, prev, next, pages, ... }
```

### fetchItems

`fetchItems` is a map of block type → fetcher function. The keys tell `expandListingBlocks` which block types to expand; all other blocks are treated as static. Each fetcher receives the block and a `{ start, size }` pair:

```js
async (block, { start, size }) => ({ items: [...], total: number })
```

- **`start`**: zero-based offset into results
- **`size`**: number of items to return (0 = return total only, no items)
- **Returns**: `{ items, total }` where `total` is the full count, not just this page

Different block types can use different fetchers:

```js
const { items, paging } = await expandListingBlocks(layout, {
  blocks,
  paging: { start: 0, size: 6 },
  fetchItems: {
    listing: ploneFetchItems({ apiUrl, contextPath }),
    rssFeed: async (block, { start, size }) => {
      const res = await fetch(`/api/rss?url=${block.feedUrl}&offset=${start}&limit=${size}`);
      const data = await res.json();
      return { items: data.results, total: data.count };
    },
  },
});
```

### ploneFetchItems

Factory returning a fetcher for Plone's `@querystring-search` endpoint:

| Option | Default | Description |
|--------|---------|-------------|
| `apiUrl` | — | Plone site URL (e.g., `'http://localhost:8080/Plone'`) |
| `contextPath` | `'/'` | Path for relative queries |
| `extraCriteria` | `{}` | Additional query params — `SearchableText`, `sort_on`, `sort_order`, `facet.*` keys |

A listing with no `querystring` defaults to showing current folder contents in folder order.

### fieldMapping and Item Types

Each listing block stores a `fieldMapping` on its block data that maps query result fields to item block fields. When no `fieldMapping` is saved, a built-in default is used:

```json
{ "@id": "href", "title": "title", "description": "description", "image": "image" }
```

Built-in item types:

| Type | Fields |
|------|--------|
| `default` | `title`, `description`, `href` |
| `summary` | `title`, `description`, `href`, `image` |
| `teaser` | `title`, `description`, `href`, `preview_image` |

### Paging

Both `expandListingBlocks` and `staticBlocks` return `{ items, paging }` where the returned `paging` object contains:

| Field | Type | Description |
|-------|------|-------------|
| `currentPage` | `number` | Zero-based current page index |
| `totalPages` | `number` | Total number of pages |
| `totalItems` | `number` | Total item count across all blocks |
| `prev` | `number \| null` | Previous page index, or `null` on first page |
| `next` | `number \| null` | Next page index, or `null` on last page |
| `pages` | `array` | Window of ~5 page objects: `{ start, page }` |
| `seen` | `number` | Running item count for position tracking |

### expandListingBlocks Options

| Option | Default | Description |
|--------|---------|-------------|
| `blocks` | — | Map of blockId to block data |
| `paging` | — | Paging input `{ start, size }` (not mutated) |
| `seen` | `0` | Number of items already seen by prior calls |
| `fetchItems` | — | `{ blockType: async (block, { start, size }) => { items, total } }` |
| `itemTypeField` | `'itemType'` | Field on the listing block that holds the item type |
| `defaultItemType` | `'summary'` | Fallback type when field is not set |

### Path Transformation

If paging embeds state in the URL path, pass `pathToApiPath` to `initBridge`:

```js
pathToApiPath: (path) => path.replace(/\/@pg_[^/]+_\d+/, ''),
```

---

## Templates

Templates allow editors to centrally control content and reuse content. They allow a developer to not have to hard code some layout decisions and instead can use rules to apply user layouts in template content stored separate from the page, or give the user a choice on which layout they want.

### Template Properties

- Can be created from any blocks
- Are always edited in-context in the current page (user can switch in and out of template edit mode)
- Are saved alongside the page into normal content so editing template permissions can use content permissions
- `allowedTemplates` and `allowedLayouts` applied to the blocks schema let the developer control loading templates

### Template Concepts

Templates are analogous to blocks themselves but are made up of blocks with special properties:

- **Fixed + ReadOnly**: Can't be edited or moved (e.g., branded headers/footers)
- **Fixed**: Can be edited but not moved (e.g., required sections)
- **Placeholder**: Named slots where editors can add their own blocks

```json
{
  "blocks": {
    "header": { "@type": "slate", "fixed": true, "readOnly": true, "placeholder": "header" },
    "content": { "@type": "slate", "placeholder": "default" },
    "footer": { "@type": "slate", "fixed": true, "readOnly": true, "placeholder": "footer" }
  }
}
```

### allowedTemplates vs allowedLayouts

Configure templates in `page.schema.properties`:

```js
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

- **allowedTemplates**: Templates shown in BlockChooser's "Templates" group, inserted as blocks
- **allowedLayouts**: Templates shown in Layout dropdown, replace/merge entire container content

### Applying Merge Rules

Use `expandTemplates` (async) or `expandTemplatesSync` (sync with pre-fetched templates) to merge template content during rendering.

```js
import { loadTemplates, expandTemplatesSync, expandTemplates } from '@hydra-js/hydra.js';

const loadTemplate = async (id) => fetch(`${apiBase}${id}`).then(r => r.json());

// Sync approach: pre-fetch templates at page level
const templates = await loadTemplates(pageData, loadTemplate);
const templateState = {};
const items = expandTemplatesSync(layout, { blocks, templateState, templates });

// Async approach: load templates on demand
const items = await expandTemplates(layout, {
  blocks,
  templateState: {},
  loadTemplate: async (id) => fetch(id).then(r => r.json())
});

// Render items — each has @uid for the block ID
for (const item of items) {
  renderBlock(item['@uid'], item);
}
```

### Merge Algorithm

1. Remove the blocks with the templateId to replace, storing any that aren't fixed and readonly by placeholder name
2. Insert the template content in their place:
   - If fixed and readonly: just insert it
   - If fixed: copy the block content (not including block fields) from a page block with the same placeholder name
   - If a placeholder: don't insert it, but insert the previous blocks with the same placeholder name
3. Recursively replace any block fields using the same rules
4. Any placeholder blocks left over are inserted at the end of the `default` placeholder if it exists, otherwise are dropped

```text
Before:  [User Block A] [User Block B]
Layout:  [Fixed Header] [default] [Fixed Footer] [post_footer]
After:   [Fixed Header] [User Block A] [User Block B] [Fixed Footer]
```

### Template Options

- `blocks`: Map of blockId → block data
- `templateState`: Pass `{}` and share across calls — tracks state for nested containers
- `templates`: (sync only) Pre-fetched map of templateId → template data
- `loadTemplate(id)`: (async only) Function to fetch template content
- `allowedLayouts`: Force a layout when container has no template applied
