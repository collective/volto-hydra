# Block Reference

Each block page shows the full example: schema definition, JSON data structure, and rendering code for both React and Vue.

## Built-in Blocks

These blocks are available by default — no schema registration required.

| Block | Description |
|-------|-------------|
| [Slate (Text)](./slate.md) | Rich text with headings, lists, links, and inline formatting |
| [Image](./image.md) | Image display with optional link |
| [Teaser](./teaser.md) | Content preview card linked to a target page |
| [Table](./table.md) | Table with rich text (Slate) cells |
| [Listing](./listing.md) | Query-driven content list with configurable item types |
| [Search](./search.md) | Search with faceted filtering and listing results |

## Custom Block Examples

These blocks demonstrate common patterns. Register them via `initBridge({ blocks: { ... } })`.

| Block | Pattern |
|-------|---------|
| [Hero](./hero.md) | Multiple field types: string, textarea, slate, image, object_browser |
| [Columns](./columns.md) | Container block with nested children (`blocks_layout` widget) |
| [Accordion](./accordion.md) | Container block with header + content areas |
| [Slider](./slider.md) | Array of items (`object_list` widget) |
| [Form](./form.md) | Typed `object_list` with field type sub-blocks |

## Page Structure

Each block doc page follows this template:

1. **Title & description** — what the block does, whether it's built-in or custom
2. **Schema** — the `blockSchema` you'd pass to `initBridge` (or what Hydra registers internally for built-in blocks)
3. **JSON Block Data** — what the block data looks like in the page content
4. **Rendering** — React and Vue examples showing how to render the block with the correct `data-*` attributes for Hydra editing

## Data Attributes for Editing

Your rendered HTML uses these attributes to enable visual editing:

| Attribute | Purpose | Example |
|-----------|---------|---------|
| `data-block-uid="id"` | Identifies a block for selection | `<div data-block-uid="text-1">` |
| `data-edit-text="field"` | Makes text inline-editable | `<h1 data-edit-text="title">` |
| `data-edit-media="field"` | Opens image picker on click | `<img data-edit-media="url">` |
| `data-edit-link="field"` | Opens link editor on click | `<a data-edit-link="href">` |
| `data-node-id="id"` | Identifies Slate nodes for selection sync | `<p data-node-id="abc123">` |

## Widget Reference

Common `widget` values used in block schemas:

| Widget | Description | Data format |
|--------|-------------|-------------|
| `string` (default) | Single-line text input | `"text value"` |
| `textarea` | Multi-line text | `"line1\nline2"` |
| `slate` | Rich text editor | `[{ type: 'p', children: [{ text: '' }] }]` |
| `image` | Image picker (upload/browse) | `"/path/@@images/image"` |
| `object_browser` | Content browser | `[{ "@id": "/path" }]` |
| `url` | URL input | `"/path"` or `"https://..."` |
| `select` | Dropdown | `"selected_value"` |
| `blocks_layout` | Container for nested blocks | `{ items: [...], blocks: {...} }` |
| `object_list` | Array of typed items | `[{ "@id": "...", ... }]` |
| `boolean` | Checkbox toggle | `true` / `false` |
| `integer` | Number input | `42` |

```{toctree}
:hidden:

slate
image
teaser
table
listing
search
hero
columns
accordion
slider
form
introduction
heading
highlight
maps
separator
button
toc
video
```

