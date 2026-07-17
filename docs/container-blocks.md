# Container Blocks

A block — or the page itself — is divided into **regions**, and each region holds an ordered list of blocks. Sliders have a slides region, grids have columns, accordions have panels; a page has its main `items` region (and optionally a header, footer, …).

You declare regions in your `blockSchema` (or the page schema), and **you choose how each region is stored in the JSON**:

- **`blocks_layout`** — the region's *ordering* is a named list inside the parent's shared `blocks_layout` dict, and the blocks themselves live in the parent's shared `blocks` dict. This is the default, and it's what persists through the backend (see [Why these persist](#why-these-persist-and-separate-top-level-fields-dont)).
- **`object_list`** — the region is stored inline, as an array of objects on the field itself.

Both look and behave the same in the editor — selecting, dragging, nesting — and blocks can be dragged from one to the other; only the JSON storage differs.

---

## blocks_layout: a region in the shared dict

Each child has its own `@type` and schema (from `blocks`). The blocks live in the parent's shared `blocks` dict; the region's name is a key in the parent's shared `blocks_layout` dict that holds the ordering:

<!-- codeExample: javascript -->
```javascript
// Schema definition — a 'slides' region on a slider block
slides: {
    title: 'Slides',
    widget: 'blocks_layout',
    allowedBlocks: ['slide', 'image'],
    defaultBlockType: 'slide',
    maxLength: 10,
}

// Resulting data — blocks in the shared dict, ordering under blocks_layout.slides
{
  "@type": "slider",
  "blocks": {
    "slide-1": { "@type": "slide", "title": "First" },
    "slide-2": { "@type": "image", "url": "..." }
  },
  "blocks_layout": { "slides": ["slide-1", "slide-2"] }
}
```

A block can declare several `blocks_layout` regions; they all share the one `blocks` dict, and each region gets its own list under `blocks_layout`.

> **The region name is a key inside `blocks_layout` — not a top-level field.** The
> ordering list lives at `blocks_layout.<region>` (a plain array of ids). A tempting
> mistake is to store it as a top-level field named after the region:
>
> <!-- codeExample: json -->
> ```json
> // ✅ CORRECT — ordering keyed inside the shared blocks_layout dict
> { "@type": "slider", "blocks": { … }, "blocks_layout": { "slides": ["slide-1", "slide-2"] } }
>
> // ❌ WRONG — an ad-hoc top-level `slides` field holding { items: [...] }
> { "@type": "slider", "blocks": { … }, "slides": { "items": ["slide-1", "slide-2"] } }
> ```
>
> The wrong form may *look* fine in a frontend that reads it back the same way, but
> `slides` is **not a registered field**, so the backend **silently drops it on save**
> (see [Why these persist](#why-these-persist-and-separate-top-level-fields-dont)) —
> and tools that walk the shared dict (the block path map, the sanity checks, the
> editor's reorder/drag) never see the region, because they look under
> `blocks_layout`, never at a field named for the region. Renderers must read the
> ordering from `blocks_layout[<region>]`, not from `<region>.items`.

## Multiple regions

A container (or the page) can declare more than one **region** — each a schema property with its own `allowedBlocks`. The default region is `items`.

Storage is a property of **each region, not the container**: every region independently chooses `widget: 'blocks_layout'` or `widget: 'object_list'`, and a single container may **mix** them — e.g. a `blocks_layout` region for body content alongside an `object_list` region for a set of inline cards. A blocks_layout region keys its ordering inside the shared `blocks_layout` dict (its children in the shared `blocks` dict); an object_list region stores its items inline on its own field. So "is this container object_list or blocks_layout?" is never a meaningful question — you look at the region. Every blocks_layout region's children still share the one `blocks` dict; the regions only partition *ordering*.

<!-- codeExample: javascript -->
```javascript
// Schema definition — a page with a header, main content, and a footer
properties: {
    header: { widget: 'blocks_layout', title: 'Header', allowedBlocks: ['slate', 'image'], maxLength: 3 },
    items:  { widget: 'blocks_layout', allowedBlocks: ['slate', 'image'] },
    footer: { widget: 'blocks_layout', title: 'Footer', allowedBlocks: ['slate', 'link'] },
}

// Resulting data — ONE shared blocks dict, one list per blocks field
{
  "blocks": {
    "header-1": { "@type": "image" },
    "hero-1":   { "@type": "slate" },
    "footer-1": { "@type": "slate" }
  },
  "blocks_layout": {
    "header": ["header-1"],
    "items":  ["hero-1"],
    "footer": ["footer-1"]
  }
}
```

Each blocks field has its own `allowedBlocks` / `maxLength`. A declared field appears in the editor even when empty (it gets a seeded empty block so it is editable and a drop target).

### Why these persist (and separate top-level fields don't)

`blocks_layout` regions live as **keys inside the registered `blocks_layout` dict** rather than as separate top-level fields (the older `header_blocks` / `footer_blocks` style) for one concrete reason: **persistence**.

The backend deserializer only saves values for **registered fields**. `blocks` and `blocks_layout` are registered behavior fields, so the entire `blocks_layout` dict — every list inside it — is stored verbatim. An ad-hoc top-level field like `footer_blocks` is **not** a registered field, so the backend **silently drops it on save**. (A footer might still appear on the live site if a layout template re-injects it on every load — but that footer is never actually persisted.) Keeping every region inside the registered `blocks_layout` dict makes them all persist for real.

## object_list: a region stored inline

The other storage choice for a region. Instead of ordering in the shared `blocks_layout` dict, all items share one inline schema and are stored as an array with an ID field, at the field itself. (To place the array deeper — e.g. `block.table.rows` — nest the field inside a `widget: 'object'`; see below.)

<!-- codeExample: javascript -->
```javascript
// Schema
slides: {
    title: 'Slides',
    widget: 'object_list',
    idField: '@id',
    schema: {
        properties: {
            title: { title: 'Title' },
            image: { title: 'Image', widget: 'image' },
            description: { title: 'Description', widget: 'slate' },
        }
    }
}

// Resulting data — the array is stored at the field
{
  "@type": "slider",
  "slides": [
    { "@id": "slide-1", "title": "First", "image": "..." },
    { "@id": "slide-2", "title": "Second", "image": "..." }
  ]
}
```

## object_list with allowedBlocks: Typed Items

When `allowedBlocks` is set on an `object_list`, items can have different types (like `blocks_layout`) but are still stored as an array. Each item's type is stored in the field specified by `typeField` (defaults to `'@type'`) and its schema is looked up from `blocks`:

<!-- codeExample: javascript -->
```javascript
facets: {
    title: 'Facets',
    widget: 'object_list',
    allowedBlocks: ['checkboxFacet', 'selectFacet'],
    typeField: 'type',
    defaultBlockType: 'checkboxFacet',
}

// Resulting data
{
  "@type": "search",
  "facets": [
    { "@id": "facet-1", "type": "checkboxFacet",
      "title": "Content Type", "field": "portal_type" },
    { "@id": "facet-2", "type": "selectFacet",
      "title": "Subject", "field": "Subject" }
  ]
}
```

Both `blocks_layout` and `object_list` look the same in the editing UI and blocks can be dragged between them — data is automatically adapted when moving between formats (ID fields added/stripped, type fields set appropriately).

## widget: 'object': nesting fields (and containers) inside a block field

A `widget: 'object'` field groups sub-fields under one key. Its `schema.properties` are first-class — plain fields OR nested containers — and everything nests **inside** the object, exactly where the schema puts it. No `dataPath` indirection.

An **`object_list`** inside an object stores its array at `object.<field>`:

<!-- codeExample: javascript -->
```javascript
// A table block whose rows live at block.table.rows
table: {
    widget: 'object',
    schema: { properties: {
        rows: { widget: 'object_list', idField: 'key',
                schema: { properties: { cells: { widget: 'object_list', idField: 'key' /* … */ } } } },
    } },
}
// data
{ "@type": "slateTable", "table": { "rows": [ { "key": "r1", "cells": [ /* … */ ] } ] } }
```

A **`blocks_layout`** inside an object makes the object its own mini-container: it holds its own `blocks` dict + `blocks_layout`, just like a columns/grid container block, one level deeper:

<!-- codeExample: javascript -->
```javascript
table: { widget: 'object', schema: { properties: {
    body: { widget: 'blocks_layout' },
} } }
// data
{ "@type": "slateTable",
  "table": { "blocks": { "b1": { /* … */ } }, "blocks_layout": { "body": ["b1"] } } }
```

A **plain field** inside an object is edited in the canvas like any top-level field — you just address it by its **`/`-path**. A `data-edit-*` value is a path resolved against the schema:

- `field` — this block's own field
- `content/field` — descend the `content` object to a nested field (object keys mirror the storage path)
- `..` — the parent **block** (never up an object level)
- `/field` — a page/root field

The **same `/`-path works for every inline field kind** — text, links, and media — because they all resolve a field the same way:

<!-- codeExample: html -->
```html
<!-- all three fields live on the `content` object of this block -->
<h3 data-edit-text="content/headline">…</h3>
<a  data-edit-link="content/href">…</a>
<img data-edit-media="content/image" />
```

Each writes back to its nested location (`block.content.headline`, `block.content.href`, `block.content.image`) — never a flat key.

Blocks inside a nested container are edited in the canvas like any other container. The sidebar prefixes a nested container's **title** with the path (e.g. **Table / Rows**) so the nesting is visible.

This replaces `dataPath`: declare the container inside the object rather than hoisting it to the block's top level with a `dataPath` back-reference.

## Rendering Containers in Your Frontend

Add `data-block-uid` to each child element. You don't need to mark the container element itself:

<!-- codeExample: html -->
```html
<div class="slider" data-block-uid="slider-1">
  <div class="slide" data-block-uid="slide-1"
       data-block-add="right">
    <img src="/news.jpg"/>
    <h2>Big News</h2>
  </div>
  <div class="slide" data-block-uid="slide-2"
       data-block-add="right">
    ...
  </div>
  <a data-block-selector="-1">Prev</a>
  <a data-block-selector="+1">Next</a>
</div>
```

- **`data-block-add="bottom|right"`** — Controls where the '+' button appears. By default it will be the opposite of its parent. Use "bottom" for vertical stacking, "right" for horizontal.
- **`data-block-selector="-1|+1|blockId"`** — Tag paging buttons so sidebar selection can navigate paged containers.
- **`data-block-selector="uid1 uid2 uid3 …"`** — Space-separated list of uids this element should "expose" when any of them is selected from the admin. The bridge matches with the CSS word-list operator (`[data-block-selector~=...]`), so one trigger can cover many descendants. Use it on a disclosure trigger (collapsed details, accordion header, hidden tab panel button) so that picking any block within from the sidebar opens / scrolls / activates the enclosing container. For `<summary>` triggers the bridge sets `details.open = true` directly (idempotent — won't toggle an already-open disclosure); for everything else it `.click()`s the trigger, skipping the click if `aria-expanded="true"`. The contextNavigation `<summary>` and accordion panel buttons use this pattern; the carousel `+1` / `-1` / specific-slide-uid form above is a special case of the same attribute.

## Table Mode

Set `addMode: 'table'` for table-like structures (rows containing cells). This lets users add and remove columns as easily as rows. The rows live inside a `table` object field (`block.table.rows`) — no `dataPath`:

<!-- codeExample: javascript -->
```javascript
table: {
    widget: 'object',
    schema: { properties: {
        rows: {
            widget: 'object_list',
            idField: 'key',
            addMode: 'table',
            schema: { properties: {
                cells: {
                    widget: 'object_list',
                    idField: 'key',
                    schema: { properties: {
                        value: { title: 'Content', widget: 'slate' },
                    } },
                },
            } },
        },
    } },
}
```

## Empty Blocks

A container region can never be truly empty. When its last child is deleted, Hydra fills it back in — but *what* it inserts depends on the region's config:

- If the region has a **`defaultBlockType`**, that type is added.
- If the region allows exactly **one** `allowedBlocks` type, that type is added.
- Only when the region has **no `defaultBlockType` and more than one `allowedBlocks`** is the choice ambiguous — so Hydra inserts a placeholder child with `@type: "empty"` and shows a '+' for the user to pick a type in place.

So the simplest way to never deal with empty placeholders in a region is to give it a `defaultBlockType` (or a single-entry `allowedBlocks`). Otherwise your frontend must render `empty`.

Empty blocks are stripped before saving. Render them as empty space; Hydra puts a '+' button in the middle for the user to pick a real type in place. You can override the look of that '+' by rendering something inside the empty block and adding `data-block-add="button"` to it.

### `empty` is a universal placeholder — renderers must tolerate it

In a no-default, multi-allowed region, `@type: "empty"` can appear in **any** container — including transiently, the moment a child is deleted and before the user picks a replacement. You never list `"empty"` in `allowedBlocks`; it isn't a type you opt into. So every container renderer has to render an `empty` child without erroring.

If your container renders its children by delegating each one to your central block dispatch (the function or component that switches on `@type`), you get this for free — just give that dispatch an `empty` case that renders a selectable placeholder.

The trap is a **custom** container renderer that only expects specific child types — a `contextNavigation` that walks `navItem`/`listing` children, say. Don't hand-roll an allow-list that rejects anything else, or a seeded `empty` will throw and break the whole container. Route non-special children through your central dispatch instead of throwing:

<!-- codeExample: javascript -->
```javascript
for (const childId of items) {
    const child = blocks[childId];
    if (child['@type'] === 'navItem') { /* nav-specific rendering */ }
    else if (child['@type'] === 'listing') { /* expand listing */ }
    else renderBlock(childId, child);   // empty (or anything else) → central dispatch, never throw
}
```

Two more things a renderer must survive once the user picks a type for a seeded empty:

- **Re-render on the type change.** The child's `@type` flips from `empty` to the picked type in place (same `data-block-uid`). If your renderer memoises or does its work once (e.g. an async setup), make sure it re-runs when a child's type changes — otherwise it keeps showing the stale `empty`.
- **Tolerate a freshly-typed child with no data yet.** A just-picked `navItem` has no `href`; a just-picked form field has no value — render a placeholder, don't crash on the missing field.

## Synchronised Block Types in a Container

You can have one container type whose children are all kept the same `@type`, with the editor picking that type once on the parent. When the type changes, every child is converted (using each child's `fieldMappings`); when a new child is added it gets the selected type.

Declare `itemTypeField` on the *blocks field* — its value names a sibling field on the same schema whose value drives every child's `@type`. The sibling field is typically rendered with `widget: 'blockTypeSelect'`, which computes its `choices` from the blocks field's `allowedBlocks` at render time:

<!-- codeExample: javascript -->
```javascript
blocks: {
    gridBlock: {
        blockSchema: {
            properties: {
                slides: {
                    widget: 'blocks_layout',
                    itemTypeField: 'variation',         // sync trigger
                    allowedBlocks: ['teaser', 'image'],
                },
                variation: {
                    widget: 'blockTypeSelect',          // dropdown
                },
            },
        },
    },
    teaser: {
        fieldMappings: {
            '@default': { '@id': 'href', 'title': 'title', 'image': 'preview_image' },
        },
    },
    image: {
        fieldMappings: {
            '@default': { '@id': 'href', 'title': 'alt', 'image': 'url' },
        },
    },
}
```

The relationship is local: read the schema and you can see "the children of `slides` get their `@type` from `variation`" right next to the field declaration. Works the same for `widget: 'blocks_layout'` and `widget: 'object_list'` children.

### Field-value syncing

On top of type syncing you can also have field _values_ centrally controlled at the parent — set once on the parent, applied to every child. Add ONE enhancer on the parent:

<!-- codeExample: javascript -->
```javascript
gridBlock: {
    blockSchema: {
        properties: {
            slides: { widget: 'blocks_layout', itemTypeField: 'variation', allowedBlocks: ['teaser', 'image'] },
            variation: { widget: 'blockTypeSelect' },
        },
    },
    schemaEnhancer: { inheritSchemaFrom: {} },
}
```

`inheritSchemaFrom` does two things automatically:

1. Surfaces the **parent-claimed** fields on the parent's sidebar under an "Item Defaults" fieldset.
2. Auto-hides the same fields on every child's sidebar (via a `hideParentOwnedFields` enhancer that's applied to every block at INIT — no per-child opt-in).

The parent declares **what it claims** per child block type via `parentControlled`. If absent, the default is: parent claims everything _not_ listed in the child's `fieldMappings['@default']` mapping. The default works for typical cases; set `parentControlled` only when you want a different split (e.g. keep a meta-toggle field editable per-child):

<!-- codeExample: javascript -->
```javascript
listing: {
    schemaEnhancer: {
        inheritSchemaFrom: {
            typeField: 'variation',
            mappingField: 'fieldMapping',
            // Only these fields are claimed by listing for teaser children.
            // The rest (including teaser's `overwrite` toggle) stay editable.
            parentControlled: {
                teaser: ['head_title', 'openLinkInNewTab', 'styles'],
            },
        },
    },
}
```

When `parentControlled[childType]` is set, it **replaces** the `@default` fallback for that child type. Both sides — the parent's "Item Defaults" fieldset and the child's hidden fields — are computed from the same single rule, so they can never get out of sync.

### Recipe options

- **`inheritSchemaFrom`** — schemaEnhancer recipe; surfaces parent-claimed fields on the parent and hides them on children.
- **`itemTypeField`** — declared on a `blocks_layout`/`object_list` field; names the sibling field whose value drives every child's `@type`.
- **`typeField`** — names the sibling field directly on `inheritSchemaFrom`. Use this when there is no blocks field to declare `itemTypeField` on (e.g. listings — see [Listings](listings.md)).
- **`mappingField`** — name of the field where a per-block `fieldMapping` override is stored. Required for the `FieldMappingWidget` to appear.
- **`parentControlled`** — `{ childType: [fieldName, ...] }` per-child-type override. Replaces the `fieldMappings['@default']` fallback.
- **`defaultsField`** — prefix for the inherited fields on the parent's "Item Defaults" fieldset (default: `'itemDefaults'`).
- **`blockTypeSelect`** widget options:
  - **`blocksField`** — which sub-blocks field's `allowedBlocks` to use for the choices. Auto-discovers if omitted. Set to `'..'` when the choices should come from the *enclosing parent's* `allowedSiblingTypes`.
  - **`filterConvertibleFrom`** — only offer types whose `fieldMappings` accept the named source. Typically `'@default'` for listings (every item type must be populatable from canonical content fields).
