# Block Reference

Each block page shows the full example: schema definition, JSON data structure, and rendering code for both React and Vue.

## Built-in Blocks

These blocks are available by default — no schema registration required.

| Block | Description |
|-------|-------------|
| [Button Block](./button.md) | A call-to-action button with editable label and link. The block type is `__button` (double-underscore prefix indicates a Volto built-in). |
| [Grid Block](./grid.md) | A responsive grid that lays out child blocks in equal-width cells. The block uses Volto's standard shared-blocks shape — `blocks` is the dict of children, `blocks_layout.items` is their order — and constrains the allowed types via `allowedBlocks`. |
| [Heading Block](./heading.md) | A standalone heading block that renders as h1–h6 based on a configurable `tag` field. Unlike headings inside a slate block, this is a dedicated block type with its own `heading` text field. |
| [Image Block](./image.md) | Displays an image with optional alt text and link. Supports the image picker widget for selecting images from the Plone content tree or uploading new ones. |
| [Introduction Block](./introduction.md) | Displays the page's title and description as a styled header. The introduction block has no content of its own — it reads `title` and `description` from the page metadata. |
| [Listing Block](./listing.md) | Displays a list of content items from a query. The listing block fetches items from the Plone catalog based on a querystring and renders each item using a configurable item type (variation). Built-in item types are `default` (title + description) and `summary` (title + description + image). |
| [Maps Block](./maps.md) | Embeds a map from a URL (Google Maps, OpenStreetMap, etc.) using an iframe. The `url` field should contain the embed URL, and `title` provides an accessible label. |
| [Search Block](./search.md) | A search interface with faceted filtering. Contains a child listing block for results and typed facets (checkbox, select, date range, toggle) for filtering. |
| [Separator Block](./separator.md) | A horizontal rule used to visually divide sections of content. Supports an alignment style property. |
| [Slate (Text) Block](./slate.md) | Rich text block powered by the Slate editor. Supports paragraphs, headings, lists, blockquotes, and inline formatting (bold, italic, strikethrough, underline, code, links). |
| [Table Block](./table.md) | A table with rich text (Slate) content in each cell. Supports adding/removing rows and columns via toolbar actions. |
| [Teaser Block](./teaser.md) | A content preview card that links to another page. Selecting a target page via the object browser auto-fills the title, description, and preview image from that page. Editors can toggle "overwrite" to customize these values. |
| [Table of Contents Block](./toc.md) | Renders a table of contents generated from heading blocks on the current page. It scans sibling blocks for headings and builds a navigation list. |
| [Video Block](./video.md) | Embeds a video from a URL. Detects YouTube links and renders an iframe embed; otherwise falls back to an HTML5 `<video>` element. |
## Custom Block Examples

These blocks demonstrate common patterns. Register them via `initBridge({ blocks: { ... } })`.

| Block | Description |
|-------|-------------|
| [Accordion Block](./accordion.md) | A collapsible panel group. Each panel is an `object_list` item with a title and a content area that holds child blocks. |
| [Columns Block](./columns.md) | A horizontal multi-column container. The block has one slot — `columns` — restricted to `column` children, capped at four. Each `column` is itself a container holding any of its allowed inner block types (slate, image, …). |
| [Context Navigation Block](./contextNavigation.md) | A vertical navigation list for grouped pages — a left sidebar on desktop and a collapsible disclosure at the top on mobile. Each row is a `navItem` (hand-added link) and/or a `listing` (auto-populated from a path query). The active link is detected from the current URL and gets `aria-current="page"` plus a `.current` class. Named after Plone's `@contextnavigation` endpoint, which serves the same purpose. |
| [Form Block](./form.md) | A multi-field form with configurable field types, validation, and email submission. Fields are stored as a typed `object_list` — each field has a `field_type` that maps to a sub-block schema. |
| [Hero Block](./hero.md) | A full-width hero section with heading, subheading, image, rich text description, and a call-to-action button. Demonstrates multiple field types in a single block: `string`, `textarea`, `slate`, `image`, and `object_browser`. |
| [Highlight Block](./highlight.md) | A prominent content section with a background image, overlay, title, rich text body, and an optional call-to-action link. Used for feature callouts and banners. |
| [Slider Block](./slider.md) | A carousel/slider that cycles through slides. Slides are stored as an `object_list` — each slide has a title, description, image, and optional button. |
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

accordion
button
columns
contextNavigation
form
grid
heading
hero
highlight
image
introduction
listing
maps
search
separator
slate
slider
table
teaser
toc
video
```
