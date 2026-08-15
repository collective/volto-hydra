---
"@type": Document
UID: docs-container-blocks-001
allow_discussion: false
contributors: []
creators:
  - admin
description: A block — or the page itself — is divided into regions, and each
  region holds an ordered list of blocks. Sliders have a slides region, grids
  have columns, accordions have panels; a page has its main items region (and
  optionally a header, footer, …).
effective: 2025-01-01T00:00:00
exclude_from_nav: false
expires: null
id: container-blocks
language: "##DEFAULT##"
layout: document_view
preview_caption: null
preview_image: null
review_state: published
rights: ""
subjects:
  - containers
  - frontend
title: Container Blocks
assignments:
  - { uid: title-1, type: title }
  - { uid: p-1, type: slate }
  - { uid: p-2, type: slate }
  - { uid: ul-3, type: slate }
  - { uid: p-4, type: slate }
  - { uid: sep-5, type: separator }
  - { uid: h-6, type: slate }
  - { uid: p-7, type: slate }
  - { uid: ce-8, type: codeExample }
  - { uid: p-9, type: slate }
  - { uid: bq-10, type: slate }
  - { uid: h-11, type: slate }
  - { uid: p-12, type: slate }
  - { uid: p-13, type: slate }
  - { uid: ce-14, type: codeExample }
  - { uid: p-15, type: slate }
  - { uid: h-16, type: slate }
  - { uid: p-17, type: slate }
  - { uid: p-18, type: slate }
  - { uid: h-19, type: slate }
  - { uid: p-20, type: slate }
  - { uid: ce-21, type: codeExample }
  - { uid: h-22, type: slate }
  - { uid: p-23, type: slate }
  - { uid: ce-24, type: codeExample }
  - { uid: p-25, type: slate }
  - { uid: h-26, type: slate }
  - { uid: p-27, type: slate }
  - { uid: p-28, type: slate }
  - { uid: ce-29, type: codeExample }
  - { uid: p-30, type: slate }
  - { uid: ce-31, type: codeExample }
  - { uid: p-32, type: slate }
  - { uid: p-33, type: slate }
  - { uid: p-34, type: slate }
  - { uid: h-35, type: slate }
  - { uid: p-36, type: slate }
  - { uid: tbl-37, type: slateTable }
  - { uid: p-38, type: slate }
  - { uid: h-39, type: slate }
  - { uid: p-40, type: slate }
  - { uid: ce-41, type: codeExample }
  - { uid: ul-42, type: slate }
  - { uid: h-43, type: slate }
  - { uid: p-44, type: slate }
  - { uid: ce-45, type: codeExample }
  - { uid: h-46, type: slate }
  - { uid: p-47, type: slate }
  - { uid: ul-48, type: slate }
  - { uid: p-49, type: slate }
  - { uid: p-50, type: slate }
  - { uid: h-51, type: slate }
  - { uid: p-52, type: slate }
  - { uid: ce-53, type: codeExample }
  - { uid: p-54, type: slate }
  - { uid: ul-55, type: slate }
  - { uid: p-56, type: slate }
  - { uid: p-57, type: slate }
  - { uid: h-58, type: slate }
  - { uid: p-59, type: slate }
  - { uid: p-60, type: slate }
  - { uid: p-61, type: slate }
  - { uid: ce-62, type: codeExample }
  - { uid: p-63, type: slate }
  - { uid: ul-64, type: slate }
  - { uid: h-65, type: slate }
  - { uid: p-66, type: slate }
  - { uid: p-67, type: slate }
  - { uid: ce-68, type: codeExample }
  - { uid: p-69, type: slate }
  - { uid: h-70, type: slate }
  - { uid: p-71, type: slate }
  - { uid: ce-72, type: codeExample }
  - { uid: p-73, type: slate }
  - { uid: ol-74, type: slate }
  - { uid: p-75, type: slate }
  - { uid: ce-76, type: codeExample }
  - { uid: p-77, type: slate }
  - { uid: h-78, type: slate }
  - { uid: ul-79, type: slate }
prototypes: |
  <block type="title" _="${h1}" />
  <block type="slate" value="${p|h2|h3|h4|h5|h6|ul|ol|blockquote/slate}" />
  <block type="separator" _="${hr}" />
  <block type="codeExample">
    <region name="tabs" widget="object_list">
      <block type="tab" label="${h3/text}" language="${pre/lang}" code="${pre/text}" />
    </region>
  </block>
---

# 

A block — or the page itself — is divided into **regions**, and each region holds an ordered list of blocks. Sliders have a slides region, grids have columns, accordions have panels; a page has its main `items` region (and optionally a header, footer, …).

You declare regions in your `blockSchema` (or the page schema), and **you choose how each region is stored in the JSON**:

- **`blocks_layout`** — the region's *ordering* is a named list inside the parent's shared `blocks_layout` dict, and the blocks themselves live in the parent's shared `blocks` dict. This is the default, and it's what persists through the backend (see [Why these persist](#why-these-persist-and-separate-top-level-fields-dont)).
- **`object_list`** — the region is stored inline, as an array of objects on the field itself.

Both look and behave the same in the editor — selecting, dragging, nesting — and blocks can be dragged from one to the other; only the JSON storage differs.

---

## blocks\_layout: a region in the shared dict

Each child has its own `@type` and schema (from `blocks`). The blocks live in the parent's shared `blocks` dict; the region's name is a key in the parent's shared `blocks_layout` dict that holds the ordering:

<block type="codeExample" data='{"tabs":[{"@id":"ce-8-javascript-d2f77e","label":"Javascript","language":"javascript","code":"// Schema definition — a &#39;slides&#39; region on a slider block\nslides: {\n    title: &#39;Slides&#39;,\n    widget: &#39;blocks_layout&#39;,\n    allowedBlocks: [&#39;slide&#39;, &#39;image&#39;],\n    defaultBlockType: &#39;slide&#39;,\n    maxLength: 10,\n}\n\n// Resulting data — blocks in the shared dict, ordering under blocks_layout.slides\n{\n  \"@type\": \"slider\",\n  \"blocks\": {\n    \"slide-1\": { \"@type\": \"slide\", \"title\": \"First\" },\n    \"slide-2\": { \"@type\": \"image\", \"url\": \"...\" }\n  },\n  \"blocks_layout\": { \"slides\": [\"slide-1\", \"slide-2\"] }\n}"}]}' />

A block can declare several `blocks_layout` regions; they all share the one `blocks` dict, and each region gets its own list under `blocks_layout`.

<block type="slate" data='{"value":[{"type":"blockquote","children":[{"type":"strong","children":[{"text":"The region name is a key inside "},{"type":"code","children":[{"text":"blocks_layout"}]},{"text":" — not a top-level field."}]},{"text":" The ordering list lives at "},{"type":"code","children":[{"text":"blocks_layout.<region>"}]},{"text":" (a plain array of ids). A tempting mistake is to store it as a top-level field named after the region:  "},{"text":"<!-- codeExample: json -->"},{"text":" "},{"type":"code","children":[{"text":"json // ✅ CORRECT — ordering keyed inside the shared blocks_layout dict { \"@type\": \"slider\", \"blocks\": { … }, \"blocks_layout\": { \"slides\": [\"slide-1\", \"slide-2\"] } }  // ❌ WRONG — an ad-hoc top-level `slides` field holding { items: [...] } { \"@type\": \"slider\", \"blocks\": { … }, \"slides\": { \"items\": [\"slide-1\", \"slide-2\"] } } "}]},{"text":"  The wrong form may "},{"type":"em","children":[{"text":"look"}]},{"text":" fine in a frontend that reads it back the same way, but "},{"type":"code","children":[{"text":"slides"}]},{"text":" is "},{"type":"strong","children":[{"text":"not a registered field"}]},{"text":", so the backend "},{"type":"strong","children":[{"text":"silently drops it on save"}]},{"text":" (see "},{"type":"link","data":{"url":"#why-these-persist-and-separate-top-level-fields-dont"},"children":[{"text":"Why these persist"}]},{"text":") — and tools that walk the shared dict (the block path map, the sanity checks, the editor&#39;s reorder/drag) never see the region, because they look under "},{"type":"code","children":[{"text":"blocks_layout"}]},{"text":", never at a field named for the region. Renderers must read the ordering from "},{"type":"code","children":[{"text":"blocks_layout[<region>]"}]},{"text":", not from "},{"type":"code","children":[{"text":"<region>.items"}]},{"text":"."}]}]}' />

## Multiple regions

A container (or the page) can declare more than one **region** — each a schema property with its own `allowedBlocks`. The default region is `items`.

Storage is a property of **each region, not the container**: every region independently chooses `widget: 'blocks_layout'` or `widget: 'object_list'`, and a single container may **mix** them — e.g. a `blocks_layout` region for body content alongside an `object_list` region for a set of inline cards. A blocks\_layout region keys its ordering inside the shared `blocks_layout` dict (its children in the shared `blocks` dict); an object\_list region stores its items inline on its own field. So "is this container object\_list or blocks\_layout?" is never a meaningful question — you look at the region. Every blocks\_layout region's children still share the one `blocks` dict; the regions only partition *ordering*.

<block type="codeExample" data='{"tabs":[{"@id":"ce-14-javascript-3ea062","label":"Javascript","language":"javascript","code":"// Schema definition — a page with a header, main content, and a footer\nproperties: {\n    header: { widget: &#39;blocks_layout&#39;, title: &#39;Header&#39;, allowedBlocks: [&#39;slate&#39;, &#39;image&#39;], maxLength: 3 },\n    items:  { widget: &#39;blocks_layout&#39;, allowedBlocks: [&#39;slate&#39;, &#39;image&#39;] },\n    footer: { widget: &#39;blocks_layout&#39;, title: &#39;Footer&#39;, allowedBlocks: [&#39;slate&#39;, &#39;link&#39;] },\n}\n\n// Resulting data — ONE shared blocks dict, one list per blocks field\n{\n  \"blocks\": {\n    \"header-1\": { \"@type\": \"image\" },\n    \"hero-1\":   { \"@type\": \"slate\" },\n    \"footer-1\": { \"@type\": \"slate\" }\n  },\n  \"blocks_layout\": {\n    \"header\": [\"header-1\"],\n    \"items\":  [\"hero-1\"],\n    \"footer\": [\"footer-1\"]\n  }\n}"}]}' />

Each blocks field has its own `allowedBlocks` / `maxLength`. A declared field appears in the editor even when empty (it gets a seeded empty block so it is editable and a drop target).

### Why these persist (and separate top-level fields don't)

`blocks_layout` regions live as **keys inside the registered `blocks_layout` dict** rather than as separate top-level fields (the older `header_blocks` / `footer_blocks` style) for one concrete reason: **persistence**.

The backend deserializer only saves values for **registered fields**. `blocks` and `blocks_layout` are registered behavior fields, so the entire `blocks_layout` dict — every list inside it — is stored verbatim. An ad-hoc top-level field like `footer_blocks` is **not** a registered field, so the backend **silently drops it on save**. (A footer might still appear on the live site if a layout template re-injects it on every load — but that footer is never actually persisted.) Keeping every region inside the registered `blocks_layout` dict makes them all persist for real.

## object\_list: a region stored inline

The other storage choice for a region. Instead of ordering in the shared `blocks_layout` dict, all items share one inline schema and are stored as an array with an ID field, at the field itself. (To place the array deeper — e.g. `block.table.rows` — nest the field inside a `widget: 'object'`; see below.)

<block type="codeExample" data='{"tabs":[{"@id":"ce-21-javascript-83a0dc","label":"Javascript","language":"javascript","code":"// Schema\nslides: {\n    title: &#39;Slides&#39;,\n    widget: &#39;object_list&#39;,\n    idField: &#39;@id&#39;,\n    schema: {\n        properties: {\n            title: { title: &#39;Title&#39; },\n            image: { title: &#39;Image&#39;, widget: &#39;image&#39; },\n            description: { title: &#39;Description&#39;, widget: &#39;slate&#39; },\n        }\n    }\n}\n\n// Resulting data — the array is stored at the field\n{\n  \"@type\": \"slider\",\n  \"slides\": [\n    { \"@id\": \"slide-1\", \"title\": \"First\", \"image\": \"...\" },\n    { \"@id\": \"slide-2\", \"title\": \"Second\", \"image\": \"...\" }\n  ]\n}"}]}' />

## object\_list with allowedBlocks: Typed Items

When `allowedBlocks` is set on an `object_list`, items can have different types (like `blocks_layout`) but are still stored as an array. Each item's type is stored in the field specified by `typeField` (defaults to `'@type'`) and its schema is looked up from `blocks`:

<block type="codeExample" data='{"tabs":[{"@id":"ce-24-javascript-6781ed","label":"Javascript","language":"javascript","code":"facets: {\n    title: &#39;Facets&#39;,\n    widget: &#39;object_list&#39;,\n    allowedBlocks: [&#39;checkboxFacet&#39;, &#39;selectFacet&#39;],\n    typeField: &#39;type&#39;,\n    defaultBlockType: &#39;checkboxFacet&#39;,\n}\n\n// Resulting data\n{\n  \"@type\": \"search\",\n  \"facets\": [\n    { \"@id\": \"facet-1\", \"type\": \"checkboxFacet\",\n      \"title\": \"Content Type\", \"field\": \"portal_type\" },\n    { \"@id\": \"facet-2\", \"type\": \"selectFacet\",\n      \"title\": \"Subject\", \"field\": \"Subject\" }\n  ]\n}"}]}' />

Both `blocks_layout` and `object_list` look the same in the editing UI and blocks can be dragged between them — data is automatically adapted when moving between formats (ID fields added/stripped, type fields set appropriately).

## widget: 'object': nesting fields (and containers) inside a block field

A `widget: 'object'` field groups sub-fields under one key. Its `schema.properties` are first-class — plain fields OR nested containers — and everything nests **inside** the object, exactly where the schema puts it. No `dataPath` indirection.

An **`object_list`** inside an object stores its array at `object.<field>`:

<block type="codeExample" data='{"tabs":[{"@id":"ce-29-javascript-dd9f7e","label":"Javascript","language":"javascript","code":"// A table block whose rows live at block.table.rows\ntable: {\n    widget: &#39;object&#39;,\n    schema: { properties: {\n        rows: { widget: &#39;object_list&#39;, idField: &#39;key&#39;,\n                schema: { properties: { cells: { widget: &#39;object_list&#39;, idField: &#39;key&#39; /* … */ } } } },\n    } },\n}\n// data\n{ \"@type\": \"slateTable\", \"table\": { \"rows\": [ { \"key\": \"r1\", \"cells\": [ /* … */ ] } ] } }"}]}' />

A **`blocks_layout`** inside an object makes the object its own mini-container: it holds its own `blocks` dict + `blocks_layout`, just like a columns/grid container block, one level deeper:

<block type="codeExample" data='{"tabs":[{"@id":"ce-31-javascript-f90eb4","label":"Javascript","language":"javascript","code":"table: { widget: &#39;object&#39;, schema: { properties: {\n    body: { widget: &#39;blocks_layout&#39; },\n} } }\n// data\n{ \"@type\": \"slateTable\",\n  \"table\": { \"blocks\": { \"b1\": { /* … */ } }, \"blocks_layout\": { \"body\": [\"b1\"] } } }"}]}' />

A **plain field** inside an object is edited in the canvas like any top-level field — address it inline with its `/`-path (`data-edit-text="content/headline"`, and the same for `data-edit-link` / `data-edit-media`). The object is *transparent*: `content/headline` writes back to `block.content.headline`, never a flat key. See [Field Path Syntax](visual-editing.md#field-path-syntax) for the full grammar (`/` object descent, `..` = parent block, `/field` = page).

Blocks inside a nested container are edited in the canvas like any other container. The sidebar prefixes a nested container's **title** with the path (e.g. **Table / Rows**) so the nesting is visible.

This replaces `dataPath`: declare the container inside the object rather than hoisting it to the block's top level with a `dataPath` back-reference.

## Container schema reference

A block's schema is a standard [Volto block schema](https://6.docs.plone.org/volto/blocks/editcomponent.html) (fieldsets, `properties`, widgets, `default`, etc.). Inka reads three container-oriented `widget` values plus a few per-field keys — those are:

<block type="slateTable" data='{"table":{"fixed":true,"compact":false,"basic":false,"celled":true,"inverted":false,"striped":false,"rows":[{"key":"tbl-37-r0","cells":[{"key":"tbl-37-r0c0","type":"header","value":[{"type":"p","children":[{"type":"code","children":[{"text":"widget"}]}]}]},{"key":"tbl-37-r0c1","type":"header","value":[{"type":"p","children":[{"text":"Storage"}]}]},{"key":"tbl-37-r0c2","type":"header","value":[{"type":"p","children":[{"text":"Key fields"}]}]}]},{"key":"tbl-37-r1","cells":[{"key":"tbl-37-r1c0","type":"data","value":[{"type":"p","children":[{"type":"code","children":[{"text":"blocks_layout"}]}]}]},{"key":"tbl-37-r1c1","type":"data","value":[{"type":"p","children":[{"text":"children are ids in the parent&#39;s shared "},{"type":"code","children":[{"text":"blocks"}]},{"text":" dict; this field&#39;s name is a region key under "},{"type":"code","children":[{"text":"blocks_layout"}]}]}]},{"key":"tbl-37-r1c2","type":"data","value":[{"type":"p","children":[{"type":"code","children":[{"text":"allowedBlocks"}]},{"text":", "},{"type":"code","children":[{"text":"maxLength"}]},{"text":", "},{"type":"code","children":[{"text":"allowedTemplates"}]}]}]}]},{"key":"tbl-37-r2","cells":[{"key":"tbl-37-r2c0","type":"data","value":[{"type":"p","children":[{"type":"code","children":[{"text":"object_list"}]}]}]},{"key":"tbl-37-r2c1","type":"data","value":[{"type":"p","children":[{"text":"inline array on the field itself"}]}]},{"key":"tbl-37-r2c2","type":"data","value":[{"type":"p","children":[{"type":"code","children":[{"text":"idField"}]},{"text":" (default "},{"type":"code","children":[{"text":"@id"}]},{"text":"), "},{"type":"code","children":[{"text":"schema"}]},{"text":" (item schema), "},{"type":"code","children":[{"text":"allowedBlocks"}]},{"text":" + "},{"type":"code","children":[{"text":"typeField"}]},{"text":" (typed items), "},{"type":"code","children":[{"text":"defaultBlockType"}]},{"text":", "},{"type":"code","children":[{"text":"maxLength"}]},{"text":", "},{"type":"code","children":[{"text":"addMode: &#39;table&#39;"}]}]}]}]},{"key":"tbl-37-r3","cells":[{"key":"tbl-37-r3c0","type":"data","value":[{"type":"p","children":[{"type":"code","children":[{"text":"object"}]}]}]},{"key":"tbl-37-r3c1","type":"data","value":[{"type":"p","children":[{"text":"groups sub-fields under one key; sub-fields (plain OR the two container widgets above) nest inside"}]}]},{"key":"tbl-37-r3c2","type":"data","value":[{"type":"p","children":[{"type":"code","children":[{"text":"schema"}]},{"text":" (the nested properties)"}]}]}]}]}}' />

All three can nest inside `object`, and a container may mix a `blocks_layout` region and an `object_list` region. Everything else in a field def (`title`, `default`, `type`, `choices`, `mode`, …) is plain Volto and behaves as documented there.

## Rendering Containers in Your Frontend

Add `data-block-uid` to each child element. You don't need to mark the container element itself:

<block type="codeExample" data='{"tabs":[{"@id":"ce-41-javascript-85a3e1","label":"Html","language":"html","code":"<div class=\"slider\" data-block-uid=\"slider-1\">\n  <div class=\"slide\" data-block-uid=\"slide-1\"\n       data-block-add=\"right\">\n    <img src=\"/news.jpg\"/>\n    <h2>Big News</h2>\n  </div>\n  <div class=\"slide\" data-block-uid=\"slide-2\"\n       data-block-add=\"right\">\n    ...\n  </div>\n  <a data-block-selector=\"-1\">Prev</a>\n  <a data-block-selector=\"+1\">Next</a>\n</div>"}]}' />

- **`data-block-add="bottom|right"`** — Controls where the '+' button appears. By default it will be the opposite of its parent. Use "bottom" for vertical stacking, "right" for horizontal.
- **`data-block-selector="-1|+1|blockId"`** — Tag paging buttons so sidebar selection can navigate paged containers.
- **`data-block-selector="uid1 uid2 uid3 …"`** — Space-separated list of uids this element should "expose" when any of them is selected from the admin. The bridge matches with the CSS word-list operator (`[data-block-selector~=...]`), so one trigger can cover many descendants. Use it on a disclosure trigger (collapsed details, accordion header, hidden tab panel button) so that picking any block within from the sidebar opens / scrolls / activates the enclosing container. For `<summary>` triggers the bridge sets `details.open = true` directly (idempotent — won't toggle an already-open disclosure); for everything else it `.click()`s the trigger, skipping the click if `aria-expanded="true"`. The contextNavigation `<summary>` and accordion panel buttons use this pattern; the carousel `+1` / `-1` / specific-slide-uid form above is a special case of the same attribute.

## Table Mode

Set `addMode: 'table'` for table-like structures (rows containing cells). This lets users add and remove columns as easily as rows. The rows live inside a `table` object field (`block.table.rows`) — no `dataPath`:

<block type="codeExample" data='{"tabs":[{"@id":"ce-45-javascript-1cff8e","label":"Javascript","language":"javascript","code":"table: {\n    widget: &#39;object&#39;,\n    schema: { properties: {\n        rows: {\n            widget: &#39;object_list&#39;,\n            idField: &#39;key&#39;,\n            addMode: &#39;table&#39;,\n            schema: { properties: {\n                cells: {\n                    widget: &#39;object_list&#39;,\n                    idField: &#39;key&#39;,\n                    schema: { properties: {\n                        value: { title: &#39;Content&#39;, widget: &#39;slate&#39; },\n                    } },\n                },\n            } },\n        },\n    } },\n}"}]}' />

## Empty Blocks

A container region can never be truly empty. When its last child is deleted, Inka fills it back in — but *what* it inserts depends on the region's config:

- If the region has a **`defaultBlockType`**, that type is added.
- If the region allows exactly **one** `allowedBlocks` type, that type is added.
- Only when the region has **no `defaultBlockType` and more than one `allowedBlocks`** is the choice ambiguous — so Inka inserts a placeholder child with `@type: "empty"` and shows a '+' for the user to pick a type in place.

So the simplest way to never deal with empty placeholders in a region is to give it a `defaultBlockType` (or a single-entry `allowedBlocks`). Otherwise your frontend must render `empty`.

Empty blocks are stripped before saving. Render them as empty space; Inka puts a '+' button in the middle for the user to pick a real type in place. You can override the look of that '+' by rendering something inside the empty block and adding `data-block-add="button"` to it.

### Making a region empty by default — `defaultBlockType: "empty"`

The rules above mean a region with a `defaultBlockType`, or a single-entry `allowedBlocks`, is *never* empty — it always seeds a block of that type. To declare a region that should sit **empty until an editor adds something**, while still restricting **what** they can add, set **`defaultBlockType: "empty"`** and do **not** list `"empty"` in `allowedBlocks`:

<block type="codeExample" data='{"tabs":[{"@id":"ce-53-javascript-f4d972","label":"Javascript","language":"javascript","code":"announcement: {\n    widget: &#39;blocks_layout&#39;,\n    allowedLayouts: [&#39;/templates/site-announcement&#39;],\n    allowedBlocks: [&#39;globalAlert&#39;], // the only thing an editor can add\n    defaultBlockType: &#39;empty&#39;,      // ...but empty by default (no band shown)\n}"}]}' />

This is the one case where `"empty"` is a **configured** default rather than the fallback Inka inserts for an ambiguous region. The seed and the add diverge on purpose:

- **Passive seed** (region loaded, or its last child deleted): Inka seeds a bare `@type: "empty"` placeholder — nothing renders. `defaultBlockType` wins over the single-`allowedBlocks` auto-fill, so the region genuinely shows empty.
- **The '+' (active add / fill)**: inserts a real block from `allowedBlocks` (converting the empty placeholder **in place**), never another `empty`. The add path reads `allowedBlocks`, not `defaultBlockType` — so a single-entry `allowedBlocks` fills straight to that type with no chooser.
- **`"empty"` is never in `allowedBlocks`** — it isn't a type an editor opts into; it's the "region is empty" state. On save the placeholder is stripped, so a genuinely-empty region persists with no blocks.

Use this for optional site chrome — e.g. a header announcement that is usually absent but can hold a single global alert when needed. (Because the seed is `"empty"`, the frontend must render `empty` as a selectable slot — see below.)

**Forced regions are locked until unlocked.** When the region is a **forced layout** (`allowedLayouts`), it is template-controlled — its content lives in the shared template and is edited *centrally*, like a branded footer. So the seeded empty is stamped as a **locked template member** (`readOnly`, with the forced layout's `templateId`/`templateInstanceId`): it shows empty, but you cannot fill it until you **unlock** the template (enter template-edit-mode). This prevents an editor from silently filling it per-page — the announcement stays site-wide. Filling then happens in template-edit-mode and locking publishes it everywhere. (This stamping happens in the editor's empty-seeding — `ensureEmptyBlockIfEmpty` — so **view-mode merging still leaves an empty forced layout empty**; no empty is ever inserted at render time.)

### `empty` is a universal placeholder — renderers must tolerate it

In a no-default, multi-allowed region, `@type: "empty"` can appear in **any** container — including transiently, the moment a child is deleted and before the user picks a replacement. You never list `"empty"` in `allowedBlocks`; it isn't a type you opt into. So every container renderer has to render an `empty` child without erroring.

If your container renders its children by delegating each one to your central block dispatch (the function or component that switches on `@type`), you get this for free — just give that dispatch an `empty` case that renders a selectable placeholder.

The trap is a **custom** container renderer that only expects specific child types — a `contextNavigation` that walks `navItem`/`listing` children, say. Don't hand-roll an allow-list that rejects anything else, or a seeded `empty` will throw and break the whole container. Route non-special children through your central dispatch instead of throwing:

<block type="codeExample" data='{"tabs":[{"@id":"ce-62-javascript-4ebff8","label":"Javascript","language":"javascript","code":"for (const childId of items) {\n    const child = blocks[childId];\n    if (child[&#39;@type&#39;] === &#39;navItem&#39;) { /* nav-specific rendering */ }\n    else if (child[&#39;@type&#39;] === &#39;listing&#39;) { /* expand listing */ }\n    else renderBlock(childId, child);   // empty (or anything else) → central dispatch, never throw\n}"}]}' />

Two more things a renderer must survive once the user picks a type for a seeded empty:

- **Re-render on the type change.** The child's `@type` flips from `empty` to the picked type in place (same `data-block-uid`). If your renderer memoises or does its work once (e.g. an async setup), make sure it re-runs when a child's type changes — otherwise it keeps showing the stale `empty`.
- **Tolerate a freshly-typed child with no data yet.** A just-picked `navItem` has no `href`; a just-picked form field has no value — render a placeholder, don't crash on the missing field.

## Synchronised Block Types in a Container

You can have one container type whose children are all kept the same `@type`, with the editor picking that type once on the parent. When the type changes, every child is converted (using each child's `fieldMappings`); when a new child is added it gets the selected type.

Declare `itemTypeField` on the *blocks field* — its value names a sibling field on the same schema whose value drives every child's `@type`. The sibling field is typically rendered with `widget: 'blockTypeSelect'`, which computes its `choices` from the blocks field's `allowedBlocks` at render time:

<block type="codeExample" data='{"tabs":[{"@id":"ce-68-javascript-cdad0c","label":"Javascript","language":"javascript","code":"blocks: {\n    gridBlock: {\n        blockSchema: {\n            properties: {\n                slides: {\n                    widget: &#39;blocks_layout&#39;,\n                    itemTypeField: &#39;variation&#39;,         // sync trigger\n                    allowedBlocks: [&#39;teaser&#39;, &#39;image&#39;],\n                },\n                variation: {\n                    widget: &#39;blockTypeSelect&#39;,          // dropdown\n                },\n            },\n        },\n    },\n    teaser: {\n        fieldMappings: {\n            &#39;@default&#39;: { &#39;@id&#39;: &#39;href&#39;, &#39;title&#39;: &#39;title&#39;, &#39;image&#39;: &#39;preview_image&#39; },\n        },\n    },\n    image: {\n        fieldMappings: {\n            &#39;@default&#39;: { &#39;@id&#39;: &#39;href&#39;, &#39;title&#39;: &#39;alt&#39;, &#39;image&#39;: &#39;url&#39; },\n        },\n    },\n}"}]}' />

The relationship is local: read the schema and you can see "the children of `slides` get their `@type` from `variation`" right next to the field declaration. Works the same for `widget: 'blocks_layout'` and `widget: 'object_list'` children.

### Field-value syncing

On top of type syncing you can also have field *values* centrally controlled at the parent — set once on the parent, applied to every child. Add ONE enhancer on the parent:

<block type="codeExample" data='{"tabs":[{"@id":"ce-72-javascript-521655","label":"Javascript","language":"javascript","code":"gridBlock: {\n    blockSchema: {\n        properties: {\n            slides: { widget: &#39;blocks_layout&#39;, itemTypeField: &#39;variation&#39;, allowedBlocks: [&#39;teaser&#39;, &#39;image&#39;] },\n            variation: { widget: &#39;blockTypeSelect&#39; },\n        },\n    },\n    schemaEnhancer: { inheritSchemaFrom: {} },\n}"}]}' />

`inheritSchemaFrom` does two things automatically:

1. Surfaces the **parent-claimed** fields on the parent's sidebar under an "Item Defaults" fieldset.
2. Auto-hides the same fields on every child's sidebar (via a `hideParentOwnedFields` enhancer that's applied to every block at INIT — no per-child opt-in).

The parent declares **what it claims** per child block type via `parentControlled`. If absent, the default is: parent claims everything *not* listed in the child's `fieldMappings['@default']` mapping. The default works for typical cases; set `parentControlled` only when you want a different split (e.g. keep a meta-toggle field editable per-child):

<block type="codeExample" data='{"tabs":[{"@id":"ce-76-javascript-6b52c5","label":"Javascript","language":"javascript","code":"listing: {\n    schemaEnhancer: {\n        inheritSchemaFrom: {\n            typeField: &#39;variation&#39;,\n            mappingField: &#39;fieldMapping&#39;,\n            // Only these fields are claimed by listing for teaser children.\n            // The rest (including teaser&#39;s `overwrite` toggle) stay editable.\n            parentControlled: {\n                teaser: [&#39;head_title&#39;, &#39;openLinkInNewTab&#39;, &#39;styles&#39;],\n            },\n        },\n    },\n}"}]}' />

When `parentControlled[childType]` is set, it **replaces** the `@default` fallback for that child type. Both sides — the parent's "Item Defaults" fieldset and the child's hidden fields — are computed from the same single rule, so they can never get out of sync.

### Recipe options

<block type="slate" data='{"value":[{"type":"ul","children":[{"type":"li","children":[{"type":"strong","children":[{"type":"code","children":[{"text":"inheritSchemaFrom"}]}]},{"text":" — schemaEnhancer recipe; surfaces parent-claimed fields on the parent and hides them on children."}]},{"type":"li","children":[{"type":"strong","children":[{"type":"code","children":[{"text":"itemTypeField"}]}]},{"text":" — declared on a "},{"type":"code","children":[{"text":"blocks_layout"}]},{"text":"/"},{"type":"code","children":[{"text":"object_list"}]},{"text":" field; names the sibling field whose value drives every child&#39;s "},{"type":"code","children":[{"text":"@type"}]},{"text":"."}]},{"type":"li","children":[{"type":"strong","children":[{"type":"code","children":[{"text":"typeField"}]}]},{"text":" — names the sibling field directly on "},{"type":"code","children":[{"text":"inheritSchemaFrom"}]},{"text":". Use this when there is no blocks field to declare "},{"type":"code","children":[{"text":"itemTypeField"}]},{"text":" on (e.g. listings — see "},{"type":"link","data":{"url":"listings.md"},"children":[{"text":"Listings"}]},{"text":")."}]},{"type":"li","children":[{"type":"strong","children":[{"type":"code","children":[{"text":"mappingField"}]}]},{"text":" — name of the field where a per-block "},{"type":"code","children":[{"text":"fieldMapping"}]},{"text":" override is stored. Required for the "},{"type":"code","children":[{"text":"FieldMappingWidget"}]},{"text":" to appear."}]},{"type":"li","children":[{"type":"strong","children":[{"type":"code","children":[{"text":"parentControlled"}]}]},{"text":" — "},{"type":"code","children":[{"text":"{ childType: [fieldName, ...] }"}]},{"text":" per-child-type override. Replaces the "},{"type":"code","children":[{"text":"fieldMappings[&#39;@default&#39;]"}]},{"text":" fallback."}]},{"type":"li","children":[{"type":"strong","children":[{"type":"code","children":[{"text":"defaultsField"}]}]},{"text":" — prefix for the inherited fields on the parent&#39;s \"Item Defaults\" fieldset (default: "},{"type":"code","children":[{"text":"&#39;itemDefaults&#39;"}]},{"text":")."}]},{"type":"li","children":[{"type":"strong","children":[{"type":"code","children":[{"text":"blockTypeSelect"}]}]},{"text":" widget options:"},{"type":"ul","children":[{"type":"li","children":[{"type":"strong","children":[{"type":"code","children":[{"text":"blocksField"}]}]},{"text":" — which sub-blocks field&#39;s "},{"type":"code","children":[{"text":"allowedBlocks"}]},{"text":" to use for the choices. Auto-discovers if omitted. Set to "},{"type":"code","children":[{"text":"&#39;..&#39;"}]},{"text":" when the choices should come from the "},{"type":"em","children":[{"text":"enclosing parent&#39;s"}]},{"text":" "},{"type":"code","children":[{"text":"allowedSiblingTypes"}]},{"text":"."}]},{"type":"li","children":[{"type":"strong","children":[{"type":"code","children":[{"text":"filterConvertibleFrom"}]}]},{"text":" — only offer types whose "},{"type":"code","children":[{"text":"fieldMappings"}]},{"text":" accept the named source. Typically "},{"type":"code","children":[{"text":"&#39;@default&#39;"}]},{"text":" for listings (every item type must be populatable from canonical content fields)."}]}]}]}]}]}' />
