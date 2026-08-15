---
"@type": Document
UID: docs-custom-blocks-001
allow_discussion: false
contributors: []
creators:
  - admin
description: Define custom block types directly in your frontend configuration
  via the blocks option in initBridge. No Volto plugin deployment required. Each
  block type needs an id, title, and a blockSchema with its field properties.
effective: 2025-01-01T00:00:00
exclude_from_nav: false
expires: null
id: custom-blocks
language: "##DEFAULT##"
layout: document_view
preview_caption: null
preview_image: null
review_state: published
rights: ""
subjects:
  - blocks
  - frontend
title: Custom Blocks
assignments:
  - { uid: cb-title-1, type: title }
  - { uid: p-1, type: slate }
  - { uid: h-2, type: slate }
  - { uid: p-3, type: slate }
  - { uid: ce-4, type: codeExample }
  - { uid: h-5, type: slate }
  - { uid: p-6, type: slate }
  - { uid: ce-7, type: codeExample }
  - { uid: p-8, type: slate }
  - { uid: ul-9, type: slate }
  - { uid: p-10, type: slate }
  - { uid: ul-11, type: slate }
  - { uid: h-12, type: slate }
  - { uid: p-13, type: slate }
  - { uid: ce-14, type: codeExample }
  - { uid: p-15, type: slate }
  - { uid: ul-16, type: slate }
  - { uid: p-17, type: slate }
  - { uid: h-18, type: slate }
  - { uid: ul-19, type: slate }
  - { uid: h-20, type: slate }
  - { uid: p-21, type: slate }
  - { uid: h-22, type: slate }
  - { uid: ce-23, type: codeExample }
  - { uid: p-24, type: slate }
  - { uid: ul-25, type: slate }
  - { uid: p-26, type: slate }
  - { uid: h-27, type: slate }
  - { uid: p-28, type: slate }
  - { uid: ce-29, type: codeExample }
  - { uid: p-30, type: slate }
  - { uid: ul-31, type: slate }
  - { uid: p-32, type: slate }
  - { uid: p-33, type: slate }
  - { uid: tbl-34, type: slateTable }
  - { uid: p-35, type: slate }
  - { uid: p-36, type: slate }
  - { uid: ul-37, type: slate }
  - { uid: ce-38, type: codeExample }
  - { uid: p-39, type: slate }
  - { uid: ce-40, type: codeExample }
  - { uid: p-41, type: slate }
  - { uid: ce-42, type: codeExample }
  - { uid: p-43, type: slate }
  - { uid: p-44, type: slate }
  - { uid: h-45, type: slate }
  - { uid: p-46, type: slate }
  - { uid: ul-47, type: slate }
  - { uid: p-48, type: slate }
  - { uid: h-49, type: slate }
  - { uid: p-50, type: slate }
  - { uid: h-51, type: slate }
  - { uid: p-52, type: slate }
  - { uid: ce-53, type: codeExample }
  - { uid: h-54, type: slate }
  - { uid: p-55, type: slate }
  - { uid: ce-56, type: codeExample }
  - { uid: p-57, type: slate }
  - { uid: ul-58, type: slate }
  - { uid: h-59, type: slate }
  - { uid: p-60, type: slate }
  - { uid: ce-61, type: codeExample }
  - { uid: ul-62, type: slate }
  - { uid: p-63, type: slate }
  - { uid: h-64, type: slate }
  - { uid: p-65, type: slate }
  - { uid: ce-66, type: codeExample }
  - { uid: p-67, type: slate }
  - { uid: p-68, type: slate }
  - { uid: p-69, type: slate }
  - { uid: p-70, type: slate }
  - { uid: h-71, type: slate }
  - { uid: ul-72, type: slate }
  - { uid: h-73, type: slate }
  - { uid: p-74, type: slate }
  - { uid: p-75, type: slate }
  - { uid: p-76, type: slate }
  - { uid: h-77, type: slate }
  - { uid: p-78, type: slate }
  - { uid: ce-79, type: codeExample }
  - { uid: p-80, type: slate }
  - { uid: tbl-81, type: slateTable }
  - { uid: h-82, type: slate }
  - { uid: p-83, type: slate }
  - { uid: ul-84, type: slate }
  - { uid: p-85, type: slate }
  - { uid: h-86, type: slate }
  - { uid: p-87, type: slate }
  - { uid: ce-88, type: codeExample }
  - { uid: p-89, type: slate }
prototypes: |
  <block type="title" _="${h1}" />
  <block type="slate" value="${p|h2|h3|h4|h5|h6|ul|ol|blockquote/slate}" />
  <block type="codeExample">
    <region name="tabs" widget="object_list">
      <block type="tab" label="${h3/text}" language="${pre/lang}" code="${pre/text}" />
    </region>
  </block>
---

# 

Define custom block types directly in your frontend configuration via the `blocks` option in `initBridge`. No Volto plugin deployment required. Each block type needs an `id`, `title`, and a `blockSchema` with its field properties.

## `initBridge()` Reference

`initBridge(options)` opens the iframe bridge and registers your frontend's page and block configuration with the admin. Call it once during page setup when running inside the admin iframe.

<block type="codeExample" data='{"tabs":[{"@id":"ce-4-js-dec45b","label":"Js","language":"js","code":"import { initBridge } from &#39;@hydra-js/hydra.js&#39;;\n\nconst bridge = initBridge({\n  page:        { /* page-level blocks fields */ },\n  blocks:      { /* block type registry */ },\n  voltoConfig: { /* other Volto settings */ },\n  onEditChange: (formData) => { /* re-render on edit */ },\n  pathToApiPath: (path) => path,\n  debug: false,\n});"}]}' />

### `page` — page-level blocks fields

Defines the **blocks fields of a page** where blocks can live. `page.schema.properties` is keyed by field name; each `widget: 'blocks_layout'` entry is one blocks field. The field name is the key inside the page's `blocks_layout` dict (the default field is `items`), so they all persist inside the registered `blocks_layout` field.

<block type="codeExample" data='{"tabs":[{"@id":"ce-7-javascript-f817db","label":"Js","language":"js","code":"page: {\n  schema: {\n    properties: {\n      items:  { widget: &#39;blocks_layout&#39;, title: &#39;Content&#39;, allowedBlocks: [&#39;slate&#39;, &#39;image&#39;, &#39;slider&#39;] },\n      header: { widget: &#39;blocks_layout&#39;, title: &#39;Header&#39;,  allowedBlocks: [&#39;slate&#39;], maxLength: 3 },\n      footer: { widget: &#39;blocks_layout&#39;, title: &#39;Footer&#39;,  allowedBlocks: [&#39;slate&#39;, &#39;link&#39;] },\n    },\n  },\n}"}]}' />

Per-field options:

- **`title`** — sidebar section title (defaults to the field name).
- **`allowedBlocks`** — array of block-type names this region accepts. Acts as a per-region filter on top of the registry.
- **`allowedTemplates`** — array of template URLs shown in the BlockChooser's "Templates" group for this field. See [Templates](templates.md).
- **`allowedLayouts`** — array of template URLs shown in the Layout dropdown for this field.
- **`maxLength`** — maximum number of blocks in the field.

Defaults and side effects:

- If you don't include `blocks_layout`, it's auto-added with `{ title: 'Blocks' }`.
- The sidebar shows one section per field when no block is selected.
- **Auto-restrict**: any block type that's not in *any* field's `allowedBlocks` is auto-restricted (hidden from the BlockChooser globally). To bypass, set the block's `restricted` to a function instead of `true`/`false`.
- Fields not present in saved page data are auto-initialised with `{ items: [] }` on load.
- You can't currently change the page metadata schema itself — custom content types are created via "Site Setup > Content types" in Volto.

### `blocks` — block type registry

Defines or overrides individual block types. Each key is the block type name (matching what appears in `allowedBlocks` and `@type` on saved blocks).

<block type="codeExample" data='{"tabs":[{"@id":"ce-14-js-c5449c","label":"Js","language":"js","code":"blocks: {\n  slider: {                          // new custom block\n    id: &#39;slider&#39;,\n    title: &#39;Slider&#39;,\n    icon: &#39;data:...&#39;,\n    group: &#39;common&#39;,\n    mostUsed: true,\n    blockSchema: { properties: { /* fields */ } },\n  },\n  slate: {                           // override the built-in slate block\n    blockSchema: { /* override */ },\n  },\n}"}]}' />

Per-block options (most are passed through to Volto's block config):

- **`id`** — block type identifier (matches the key).
- **`title`** — display name in the BlockChooser.
- **`icon`** — icon shown in the BlockChooser (data URL or SVG component).
- **`group`** — chooser group (e.g. `'common'`).
- **`restricted`** — `true` hides the block from the chooser; can also be a function for conditional restrictions.
- **`mostUsed`** — pin to the top of the chooser.
- **`disableCustomSidebarEditForm`** — set `true` to use only the schema form in the sidebar (no custom edit component).
- **`blockSchema`** — JSON-schema-style definition of the block's fields. See [Schema Enhancers](#schema-enhancers) below and the [Block reference](examples/README.md).
- **`fieldMappings`** — block-to-block conversion rules. See [Block Conversion & fieldMappings](#block-conversion--fieldmappings) below.
- **`schemaEnhancer`** — recipe-based schema modifier; supports `fieldRules`, `inheritSchemaFrom`, etc. See [Schema Enhancers](#schema-enhancers).

`page` and `blocks` interact via name lookup: a region's `allowedBlocks: ['slate', 'slider']` references keys of the `blocks` registry. You can use one without the other — `page` alone restricts placement of built-in blocks; `blocks` alone registers custom types and gets a default `blocks_layout` region accepting everything.

### Other top-level options

- **`onEditChange(formData)`** — callback invoked with the new form data whenever the editor changes anything. See [Live Preview › Setting Up the Bridge](live-preview.md#setting-up-the-bridge).
- **`pathToApiPath(path)`** — function transforming a frontend path to the API/admin path on `PATH_CHANGE` messages. Use when your frontend embeds state (paging, filters) in URL segments that don't exist on the CMS side. See [Listings › Path Transformation](listings.md#path-transformation-pathtoapipath).
- **`voltoConfig`** — passes additional Volto config (non-block settings) through to the admin. Future home for things like slate formats ([TODO #109](https://github.com/collective/volto-hydra/issues/109)) and toolbar actions.
- **`debug`** — `true` enables verbose console logging in the bridge. Default `false`.

### Returns

The `Bridge` instance, which exposes additional API methods you can call from the frontend (e.g. `getAccessToken()`, `sendBlockUpdate()`, `sendBlockAction()`). See [Advanced › Custom Sidebar UI](advanced.md#custom-sidebar-and-cms-ui) for those.

## Defining a custom block

<block type="codeExample" data='{"tabs":[{"@id":"ce-23-javascript-a47dd8","label":"Javascript","language":"javascript","code":"const bridge = initBridge({\n    page: {\n        schema: {\n            properties: {\n                blocks_layout: {\n                    title: &#39;Content&#39;,\n                    allowedBlocks: [&#39;slate&#39;, &#39;image&#39;, &#39;video&#39;, &#39;slider&#39;],\n                },\n            },\n        },\n    },\n    blocks: {\n        slider: {\n            id: &#39;slider&#39;,\n            title: &#39;Slider&#39;,\n            icon: &#39;data:...&#39;,\n            group: &#39;common&#39;,\n            restricted: false,\n            mostUsed: true,\n            disableCustomSidebarEditForm: false,\n            blockSchema: {\n                properties: {\n                    slider_timing: {\n                        title: &#39;Delay&#39;,\n                        widget: &#39;float&#39;,\n                    },\n                    slides: {\n                        title: &#39;Slides&#39;,\n                        widget: &#39;blocks_layout&#39;,\n                        allowedBlocks: [&#39;slide&#39;, &#39;image&#39;],\n                        defaultBlockType: &#39;slide&#39;,\n                    }\n                },\n            }\n        },\n        slide: {\n            id: &#39;slide&#39;,\n            title: &#39;Slide&#39;,\n            blockSchema: {\n                properties: {\n                    url: { title: &#39;Link&#39;, widget: &#39;url&#39; },\n                    title: { title: &#39;Title&#39; },\n                    image: { title: &#39;Image&#39;, widget: &#39;image&#39; },\n                    description: { title: &#39;Description&#39;,\n                                   widget: &#39;slate&#39; },\n                },\n            },\n        },\n    },\n});"}]}' />

Child block types (like `slide` above) must be defined at the top level of `blocks`. You can also:

- Set `restricted: true` to hide a block from the block chooser (only usable as child blocks)
- Set `mostUsed: true` to pin a block to the top of the chooser
- Set `disableCustomSidebarEditForm: true` to use only the schema form in the sidebar (no custom edit component)
- Use `fieldsets` in the schema to organize fields into tabs

**A `widget: 'slate'` field holds one top-level node.** A slate field — like `description` on the `slide` above — stores a single paragraph, heading, or list, not a document of several. Pasting or typing multiple paragraphs into it flattens them back into one node; only the built-in `slate` *block* splits multi-node content into separate blocks. Design slate fields for single-node content, and use a `blocks_layout`/`object_list` of `slate` blocks when you need several. See [Visual Editing › One top-level node per slate field](visual-editing.md#one-top-level-node-per-slate-field).

## Schema Enhancers

Schema enhancers modify block schemas dynamically:

<block type="codeExample" data='{"tabs":[{"@id":"ce-29-javascript-f2ef0c","label":"Javascript","language":"javascript","code":"const bridge = initBridge({\n    blocks: {\n        myBlock: {\n            blockSchema: {\n                properties: {\n                    mode: {\n                        title: &#39;Mode&#39;, widget: &#39;select&#39;,\n                        choices: [[&#39;simple&#39;, &#39;Simple&#39;], [&#39;advanced&#39;, &#39;Advanced&#39;]],\n                    },\n                    advancedOptions: { title: &#39;Advanced Options&#39;, type: &#39;string&#39; },\n                },\n            },\n            schemaEnhancer: {\n                fieldRules: {\n                    advancedOptions: { when: { mode: &#39;advanced&#39; }, else: false },\n                },\n            },\n        },\n    },\n});"}]}' />

**`fieldRules`** — add, remove, or conditionally modify field definitions. The value for each rule key can be:

- `false` — always hide the field
- `{ set: { title: '...', widget: '...' } }` — always add or replace the field definition
- `{ when: { fieldName: value }, else: false }` — show only when condition met
- `{ when: { fieldName: { gte: 2 } }, set: { ... } }` — conditional definition override
- `[rule, rule, ...]` — switch: first matching rule wins. A bare `false` in the array is a catch-all hide: `[{ when: A }, { when: B }, false]` shows on A or B, hides otherwise.
- `'parent.child': false` — hide a field inside a widget's inner schema

Condition operators: `is`, `isNot`, `isSet`, `isNotSet`, `oneOf`, `notOneOf`, `contains`, `notContains`, `containsAny`, `notContainsAny`, `containsAll`, `notContainsAll`, `regex`, `notRegex`, `gt`, `gte`, `lt`, `lte`. A bare value (`{ mode: 'advanced' }`) is shorthand for `is`.

Each operator is driven by the field's **declared type**, never the value shape. A field reduces to one of four **surfaces**, and an operator used off its surface raises an error (a mis-authored rule fails loudly rather than silently mismatching):

<block type="slateTable" data='{"table":{"fixed":true,"compact":false,"basic":false,"celled":true,"inverted":false,"striped":false,"rows":[{"key":"tbl-34-r0","cells":[{"key":"tbl-34-r0c0","type":"header","value":[{"type":"p","children":[{"text":"surface"}]}]},{"key":"tbl-34-r0c1","type":"header","value":[{"type":"p","children":[{"text":"fields"}]}]},{"key":"tbl-34-r0c2","type":"header","value":[{"type":"p","children":[{"text":"operators"}]}]}]},{"key":"tbl-34-r1","cells":[{"key":"tbl-34-r1c0","type":"data","value":[{"type":"p","children":[{"type":"strong","children":[{"text":"string"}]}]}]},{"key":"tbl-34-r1c1","type":"data","value":[{"type":"p","children":[{"text":"text, textarea, url, Choice, "},{"type":"strong","children":[{"text":"slate"}]},{"text":" (its plaintext)"}]}]},{"key":"tbl-34-r1c2","type":"data","value":[{"type":"p","children":[{"type":"code","children":[{"text":"is"}]},{"text":"/"},{"type":"code","children":[{"text":"isNot"}]},{"text":", "},{"type":"code","children":[{"text":"isSet"}]},{"text":", "},{"type":"code","children":[{"text":"oneOf"}]},{"text":"/"},{"type":"code","children":[{"text":"notOneOf"}]},{"text":", "},{"type":"code","children":[{"text":"contains"}]},{"text":"/"},{"type":"code","children":[{"text":"notContains"}]},{"text":" = "},{"type":"strong","children":[{"text":"substring"}]},{"text":", "},{"type":"code","children":[{"text":"regex"}]},{"text":"/"},{"type":"code","children":[{"text":"notRegex"}]}]}]}]},{"key":"tbl-34-r2","cells":[{"key":"tbl-34-r2c0","type":"data","value":[{"type":"p","children":[{"type":"strong","children":[{"text":"number"}]}]}]},{"key":"tbl-34-r2c1","type":"data","value":[{"type":"p","children":[{"text":"integer, float, number"}]}]},{"key":"tbl-34-r2c2","type":"data","value":[{"type":"p","children":[{"type":"code","children":[{"text":"is"}]},{"text":"/"},{"type":"code","children":[{"text":"isNot"}]},{"text":", "},{"type":"code","children":[{"text":"oneOf"}]},{"text":", "},{"type":"code","children":[{"text":"isSet"}]},{"text":", "},{"type":"code","children":[{"text":"gt"}]},{"text":"/"},{"type":"code","children":[{"text":"gte"}]},{"text":"/"},{"type":"code","children":[{"text":"lt"}]},{"text":"/"},{"type":"code","children":[{"text":"lte"}]},{"text":" = compare"}]}]}]},{"key":"tbl-34-r3","cells":[{"key":"tbl-34-r3c0","type":"data","value":[{"type":"p","children":[{"type":"strong","children":[{"text":"boolean"}]}]}]},{"key":"tbl-34-r3c1","type":"data","value":[{"type":"p","children":[{"text":"boolean"}]}]},{"key":"tbl-34-r3c2","type":"data","value":[{"type":"p","children":[{"type":"code","children":[{"text":"is"}]},{"text":"/"},{"type":"code","children":[{"text":"isNot"}]},{"text":", "},{"type":"code","children":[{"text":"isSet"}]}]}]}]},{"key":"tbl-34-r4","cells":[{"key":"tbl-34-r4c0","type":"data","value":[{"type":"p","children":[{"type":"strong","children":[{"text":"array"}]}]}]},{"key":"tbl-34-r4c1","type":"data","value":[{"type":"p","children":[{"text":"multiselect (its values), "},{"type":"strong","children":[{"text":"region"}]},{"text":" (its child block "},{"type":"strong","children":[{"text":"types"}]},{"text":")"}]}]},{"key":"tbl-34-r4c2","type":"data","value":[{"type":"p","children":[{"type":"code","children":[{"text":"isSet"}]},{"text":", "},{"type":"code","children":[{"text":"is"}]},{"text":"/"},{"type":"code","children":[{"text":"isNot"}]},{"text":" = "},{"type":"strong","children":[{"text":"set-equality"}]},{"text":", "},{"type":"code","children":[{"text":"contains"}]},{"text":"/"},{"type":"code","children":[{"text":"notContains"}]},{"text":" = membership, "},{"type":"code","children":[{"text":"containsAny"}]},{"text":"/"},{"type":"code","children":[{"text":"containsAll"}]},{"text":" (+inverses), "},{"type":"code","children":[{"text":"gt"}]},{"text":"/"},{"type":"code","children":[{"text":"gte"}]},{"text":"/"},{"type":"code","children":[{"text":"lt"}]},{"text":"/"},{"type":"code","children":[{"text":"lte"}]},{"text":" = "},{"type":"strong","children":[{"text":"count"}]}]}]}]}]}}' />

`oneOf` (scalar value ∈ set) and `containsAny` (array shares any with a set) differ only on the field side — `oneOf` is for a single-valued field, `containsAny` for a multiselect; `oneOf` on an array throws (use `containsAny`).

Two extras drive **position-** and \*\*type-\*\*aware rules:

- The virtual field **`@index`** reads a block's ordinal position within its parent `object_list` region (a `number` surface) — `{ '@index': { lt: 1 } }` means "first in my region", and `../@index` is the parent block's index. Distinct from a region's `count` (which counts children).
- A rule whose **`set` is a block-type NAME** (a string) rather than a field definition is a **`@type` rule** — it changes the item's *type* by position, not a field. Declared as `typeRule` on a typed `object_list`; see [`typeRule` — position picks a typed item's `@type`](#typerule--position-picks-a-typed-items-type). The retype is applied by CONVERSION (a schema enhancer can't rewrite stored `@type`), which brings up the confirm described under [Drag / paste via conversion](#drag--paste-via-conversion).

<block type="codeExample" data='{"tabs":[{"@id":"ce-38-javascript-4acd08","label":"Javascript","language":"javascript","code":"schemaEnhancer: {\n    fieldRules: {\n        // multiselect `elements: [&#39;image&#39;,&#39;date&#39;,&#39;tag&#39;]` — reveal each option&#39;s field\n        date: { when: { elements: { contains: &#39;date&#39; } }, else: false },\n        media: { when: { elements: { containsAny: [&#39;image&#39;, &#39;video&#39;] } }, else: false },\n        layout: { when: { elements: { containsAll: [&#39;image&#39;, &#39;date&#39;] } }, else: false },\n        // scalar Choice\n        invert: { when: { colour: { oneOf: [&#39;brand-dark&#39;, &#39;black&#39;] } }, else: false },\n        // text: substring / pattern\n        cta: { when: { title: { contains: &#39;Sale&#39; } }, else: false },\n        year: { when: { title: { regex: { pattern: &#39;\\\\b20\\\\d\\\\d\\\\b&#39;, flags: &#39;i&#39; } } }, else: false },\n    },\n}"}]}' />

For a **region** (an `object_list` field, or a single `blocks_layout` region named by its region key), the array surface is its **child block types**, and the numeric operators **count** that region's children — only its own, never a cross-region total:

<block type="codeExample" data='{"tabs":[{"@id":"ce-40-javascript-c0236e","label":"Javascript","language":"javascript","code":"schemaEnhancer: {\n    fieldRules: {\n        // reveal a caption field only when the `body` region has an image block\n        caption: { when: { body: { contains: &#39;image&#39; } }, else: false },\n        // offer \"columns layout\" only once the `columns` region has ≥2 blocks\n        columnsLayout: { when: { columns: { gte: 2 } }, else: false },\n        // \"carousel options\" only when the `slides` object_list has >1 item\n        carouselOptions: { when: { slides: { gt: 1 } }, else: false },\n    },\n}"}]}' />

To condition on a block's **position** rather than a field value, use the virtual field **`@index`** — a block's ordinal index within its parent `object_list` region (a `number` surface). It composes with the block-step grammar, so `../@index` is the parent block's index. Unlike the region's numeric ops (which *count* children), `@index` is *where this block sits*:

<block type="codeExample" data='{"tabs":[{"@id":"ce-42-javascript-bdaefa","label":"Javascript","language":"javascript","code":"schemaEnhancer: {\n    fieldRules: {\n        // a table cell&#39;s blocks region: cap at one block when this cell is in the\n        // first row (a header row) — `../@index` is the cell&#39;s ROW index\n        blocks: [\n            { when: { &#39;../../headerMode&#39;: { oneOf: [&#39;row&#39;, &#39;both&#39;] }, &#39;../@index&#39;: { lt: 1 } }, set: { maxLength: 1 } },\n            { when: { &#39;../../headerMode&#39;: { oneOf: [&#39;col&#39;, &#39;both&#39;] }, &#39;@index&#39;:    { lt: 1 } }, set: { maxLength: 1 } },\n        ],\n    },\n}"}]}' />

A block that isn't an `object_list` item yields an unset `@index`, so comparisons are simply false (never an error). `lt: 1` is "first"; `lt: 2` is "first two", etc.

Field paths: `../field` for the parent block's field (and `@index` / `../@index` for position), `/field` for a page metadata field.

## Block Conversion & fieldMappings

`fieldMappings` (plural) on a block config defines how fields map between block types (and from linked content). This enables:

- **"Convert to..." UI action** — editors can convert a block to another type (e.g. teaser → image).
- **Listing item types** — query results are mapped to item blocks via `@default` (see [Listings](listings.md)).
- **Synchronised container children** — a parent controls child type, all children convert together (see [Container Blocks › Synchronised Block Types](container-blocks.md#synchronised-block-types-in-a-container)).
- **Drag / paste via conversion** — a block can be dropped or pasted into a container that only accepts a *convertible* type; it's converted on drop (see below).
- **Copy from a linked target** — a block pulls fields from the content item its link field points at, with a per-field linked/custom toggle (see [`@target`](#target--copy-from-a-linked-content-item)).

Each key in `fieldMappings` is either a **specific block type name**, **`@default`**, or **`@target`**.

### `@default` — the canonical content shape

`@default` is a virtual type representing a linked content item's fields — anything a catalog **search** returns as metadata (`metadata_fields: '_all'`): `@id`, `title`, `description`, `image`, `Subject` (tags), `created`/`effective` dates, and so on. A block with `fieldMappings['@default']` is saying "I can be populated from a content item." The keys are content/metadata field names — not this block's own field names (e.g. `label`, `field`, `required` are not content metadata and are invalid).

### Explicit type-to-type mappings

Use these when blocks share fields that aren't part of the `@default` set — for example, facet types sharing `{ title, field, hidden }` or form field types sharing `{ label, description, required }`.

<block type="codeExample" data='{"tabs":[{"@id":"ce-53-javascript-6ea81c","label":"Javascript","language":"javascript","code":"// Content item types: use @default (canonical fields) + explicit cross-mappings\nteaser: {\n    fieldMappings: {\n        &#39;@default&#39;: { &#39;@id&#39;: &#39;href&#39;, &#39;title&#39;: &#39;title&#39;, &#39;image&#39;: &#39;preview_image&#39; },\n        image: { &#39;href&#39;: &#39;href&#39;, &#39;alt&#39;: &#39;title&#39;, &#39;url&#39;: &#39;preview_image&#39; },\n    },\n},\nimage: {\n    fieldMappings: {\n        &#39;@default&#39;: { &#39;@id&#39;: &#39;href&#39;, &#39;title&#39;: &#39;alt&#39;, &#39;image&#39;: &#39;url&#39; },\n        teaser: { &#39;href&#39;: &#39;href&#39;, &#39;title&#39;: &#39;alt&#39;, &#39;preview_image&#39;: &#39;url&#39; },\n    },\n},\n\n// Non-content types: use explicit hub-type mappings (NOT @default).\n// All facet types map through checkboxFacet as a hub:\nselectFacet:  { fieldMappings: { checkboxFacet: { title: &#39;title&#39;, field: &#39;field&#39;, hidden: &#39;hidden&#39; } } },\ncheckboxFacet: { fieldMappings: { selectFacet: { /* ... */ }, daterangeFacet: { /* ... */ } } },"}]}' />

### `@target` — copy from a linked content item

`@target` maps a **linked** content item's attributes onto this block's own fields — the generic version of the Volto teaser's "copy from target" button. It maps *source content attributes* (`title`, `description`, `image`, …) to *this block's fields*. The item is whichever the block's **link field** points at (the `object_browser mode: 'link'` field — its stored snapshot is the source), so you don't name a URL field separately: "the url is the link in the mapping".

<block type="codeExample" data='{"tabs":[{"@id":"ce-56-javascript-46bfa7","label":"Javascript","language":"javascript","code":"button: {\n    // The Label (title) syncs from the linked item&#39;s title.\n    fieldMappings: {\n        &#39;@target&#39;: {\n            title: &#39;title&#39;,\n            description: &#39;description&#39;,\n            // image: the conversion is derived from the destination field&#39;s\n            // widget, so the value is assembled into the shape it expects.\n            image: &#39;preview_image&#39;,\n        },\n    },\n},"}]}' />

Declaring `@target` is the **only** opt-in — no per-block enhancer wiring. Each mapped field then shows a small **🔗 pull from linked** toggle in the sidebar (only when a target is selected). Every mapped field is one of two states:

- **Linked** (default, toggle ticked) — the field *pulls from the linked item*. Its value is filled from the target's snapshot when the page opens for editing and re-pulled when you change the link, so it always mirrors the linked content.
- **Custom** (toggle unticked) — your own value, ignored by the target. A field becomes custom the moment you edit it, or when you untick the toggle; re-ticking re-pulls the target value. Custom fields are recorded in the block's `_customFields` array (absence ⇒ linked), so the state persists with the block.

### Container ⇄ value (region-crossing paths)

A `fieldMappings` value is usually a sibling **field name**. It may instead be a **region-crossing path** `<region>/<type|*>/<field>`, which reaches the `<field>` of a container region's children — the one place the path grammar crosses a region boundary. This bridges a **container** block (a region of child blocks) and a **value** block (a scalar field), so a block can convert between the two shapes:

<block type="codeExample" data='{"tabs":[{"@id":"ce-61-javascript-9a6e0e","label":"Javascript","language":"javascript","code":"tableHeaderCell: {                                   // the value form: one slate\n    blockSchema: { properties: { value: { widget: &#39;slate&#39; } } },\n    // Declared ONCE on the value block; works both directions.\n    fieldMappings: { tableCell: { value: &#39;blocks/slate/value&#39; } },\n},\ntableCell: {                                         // the container form\n    blockSchema: { properties: {\n        blocks: { widget: &#39;object_list&#39;, typeField: &#39;@type&#39;,\n                  allowedBlocks: [&#39;slate&#39;, &#39;image&#39;, &#39;video&#39;] },\n    } },\n},"}]}' />

- **container → value (collapse)** — gather the region's matching children's `<field>`; slate values are **merged** into one (lossless), not truncated.
- **value → container (expand)** — wrap the value in **one** child of `<type>` in the region.
- `<type>` selects a child type; `*` = any child that exposes `<field>` (siblings without it — an `image` for a `value` path — are skipped). A **concrete** type (`blocks/slate/value`) makes expand unambiguous, so use it for a two-way bridge; `*` suits read-only cross-region reads (e.g. a `when` condition).

Non-region scalar fields (`key`, `width`, …) carry over unchanged. This is the `convertValueContainer` helper; DnD/paste and the block chooser reuse it via the same `fieldMappings` graph. See `proposals/container-value-conversion.md`.

#### `typeRule` — position picks a typed item's `@type`

The bridge converts on demand; a **`@type` rule** on a typed `object_list` field decides *when*, by **position**. It is an ordinary `when`-based fieldRule (same grammar — `@index`, `../@index`, `../../<field>`, `oneOf`, `lt`, …) whose `set` is a block-**type name** instead of a field definition:

<block type="codeExample" data='{"tabs":[{"@id":"ce-66-javascript-11d07c","label":"Javascript","language":"javascript","code":"cells: {\n    widget: &#39;object_list&#39;, typeField: &#39;@type&#39;,\n    allowedBlocks: [&#39;tableCell&#39;, &#39;tableHeaderCell&#39;],\n    typeRule: [\n        // header row OR header column → the value form\n        { when: { &#39;../../headerMode&#39;: { oneOf: [&#39;row&#39;, &#39;both&#39;] }, &#39;../@index&#39;: { lt: 1 } }, set: &#39;tableHeaderCell&#39; },\n        { when: { &#39;../../headerMode&#39;: { oneOf: [&#39;col&#39;, &#39;both&#39;] }, &#39;@index&#39;: { lt: 1 } },     set: &#39;tableHeaderCell&#39; },\n        { set: &#39;tableCell&#39; },                                // otherwise the container form\n    ],\n},"}]}' />

The rule is evaluated in the same pass that applies field defaults (run on every edit): each typed item's target `@type` is re-resolved, and when it differs from the stored `@type` the item is **converted in place** via the bridge above. So moving a row to/from row 0 flips its cells between `tableHeaderCell` (a slate `value`) and `tableCell` (a `blocks` container), losslessly — no imperative "re-type the cells" code. Only meaningful on a **typed** object\_list (a `typeField` item has an `@type` to rewrite); it settles in one pass (the target type re-resolves to itself once the item is in place).

Each field's value is converted to the shape its destination widget expects (derived from the widget): strings copy across, an image field is assembled from the target's `image_scales` / `image_field`, multi-value fields (e.g. `Subject` → tags) pass through as-is.

The pull is **snapshot-based** — there is no separate live fetch. When you pick or type a link, the url widget stores the target's **full** metadata onto the link field (the object browser already fetches every item with `metadata_fields: '_all'`, and the field's `selectedItemAttrs` keeps the whole canonical set), so the block carries its own source data. Every mapped field then pulls straight from that stored snapshot: **on page open** (all blocks fill at once) and again whenever you change the link.

Only an **internal** link is a pull source. An external URL has no catalog item to search, so a field linked to one can't pull — the toggle is hidden and the field behaves as a plain editable field. (Unfurling external links via OpenGraph is a future enhancement.)

### Conversion graph rules

- Explicit `fieldMappings[typeName]` always creates a conversion edge.
- `@default` only creates edges between types that both have valid `@default` mappings (keys from `{ @id, title, description, image }`). Types with non-canonical `@default` keys are ignored.
- Types without `fieldMappings` never appear in the "Convert to..." menu.
- Transitive conversions use paths through intermediate types (e.g. hero → teaser → image).
- Unmapped fields are kept in the data so converting back restores them.

### Drag / paste via conversion

The same conversion graph gives drag-and-drop (and paste) more valid destinations: a block can be dropped or pasted into a container whose `allowedBlocks` only admits a type the block can *convert* to.

**Every drop/paste is TRIALLED before it commits.** The candidate result is normalised (the same pass that applies field defaults and evaluates [`@type` rules](#typerule--position-picks-a-typed-items-type)), then each block's `@type` is diffed against what was dropped. If **anything** converted — because the dropped block had to convert to fit the container, **or** because a rule re-typed a block by its new position (e.g. a table row moved to row 0 turns its cells into header cells) — a **"Convert blocks?"** confirm lists each `from → to` and waits: **Convert** commits the already-converted result, **Cancel** aborts the whole drop. Nothing converted → it commits silently.

The chooser popup survives only for the genuinely ambiguous case: a single block reachable to *several* target types, where you pick which one (cancelling leaves it untouched). Zero reachable types rejects the drop; multi-block selections are auto-only (every member must reach exactly one type). On mobile, conversion happens via cut → paste (drag/chevron move stays native-only). External-link and other type restrictions are unaffected; only the container's `allowedBlocks` gate is relaxed to "allowed or convertible".

### Mapping value format

A mapping value is either a string (simple field rename) or `{ field, type }` (rename with type conversion):

<block type="codeExample" data='{"tabs":[{"@id":"ce-79-json-1fc605","label":"Json","language":"json","code":"{\n    \"@id\": { \"field\": \"href\", \"type\": \"link\" },\n    \"title\": \"title\",\n    \"description\": \"description\",\n    \"image\": \"preview_image\"\n}"}]}' />

When `type` is specified, the value is converted at runtime:

<block type="slateTable" data='{"table":{"fixed":true,"compact":false,"basic":false,"celled":true,"inverted":false,"striped":false,"rows":[{"key":"tbl-81-r0","cells":[{"key":"tbl-81-r0c0","type":"header","value":[{"type":"p","children":[{"text":"Type"}]}]},{"key":"tbl-81-r0c1","type":"header","value":[{"type":"p","children":[{"text":"Conversion"}]}]}]},{"key":"tbl-81-r1","cells":[{"key":"tbl-81-r1c0","type":"data","value":[{"type":"p","children":[{"type":"code","children":[{"text":"string"}]}]}]},{"key":"tbl-81-r1c1","type":"data","value":[{"type":"p","children":[{"text":"Arrays joined with "},{"type":"code","children":[{"text":"\", \""}]},{"text":"; image objects resolved to URL string"}]}]}]},{"key":"tbl-81-r2","cells":[{"key":"tbl-81-r2c0","type":"data","value":[{"type":"p","children":[{"type":"code","children":[{"text":"link"}]}]}]},{"key":"tbl-81-r2c1","type":"data","value":[{"type":"p","children":[{"text":"String wrapped as "},{"type":"code","children":[{"text":"[{ \"@id\": value }]"}]},{"text":" (Volto link format)"}]}]}]},{"key":"tbl-81-r3","cells":[{"key":"tbl-81-r3c0","type":"data","value":[{"type":"p","children":[{"type":"code","children":[{"text":"image"}]}]}]},{"key":"tbl-81-r3c1","type":"data","value":[{"type":"p","children":[{"text":"Pass through (expects "},{"type":"code","children":[{"text":"{ \"@id\", image_field, image_scales }"}]},{"text":")"}]}]}]},{"key":"tbl-81-r4","cells":[{"key":"tbl-81-r4c0","type":"data","value":[{"type":"p","children":[{"type":"code","children":[{"text":"array"}]}]}]},{"key":"tbl-81-r4c1","type":"data","value":[{"type":"p","children":[{"text":"Non-arrays wrapped in "},{"type":"code","children":[{"text":"[value]"}]}]}]}]},{"key":"tbl-81-r5","cells":[{"key":"tbl-81-r5c0","type":"data","value":[{"type":"p","children":[{"type":"code","children":[{"text":"(none)"}]}]}]},{"key":"tbl-81-r5c1","type":"data","value":[{"type":"p","children":[{"text":"Copied as-is"}]}]}]}]}}' />

### FieldMappingWidget

When a parent block has `mappingField` set in its `inheritSchemaFrom` recipe, the admin sidebar shows a widget that lets editors configure field mappings visually:

- Shows the `@default` source fields (`@id`, `title`, `description`, `image`) on the left.
- For each source field, lets the editor pick a field from the selected child type's schema.
- Auto-detects the conversion `type` from the target field definition (e.g. `object_browser` with `mode=link` → `type: "link"`).
- Saves the result as `fieldMapping` (singular) on the block data.

The saved `fieldMapping` is read at render time by `expandListingBlocks` — no block registry access needed at render time.

## HTML Paste Support (TODO)

When the editor pastes rich HTML into the page, Inka will eventually be able to recognise it as a custom block by matching against a CSS selector mapping. The proposed shape:

<block type="codeExample" data='{"tabs":[{"@id":"ce-88-javascript-e562d7","label":"Javascript","language":"javascript","code":"video: {\n    fieldMappings: {\n        &#39;css:video&#39;: { &#39;src&#39;: &#39;url&#39;, &#39;caption[@class=\"alt\"]&#39;: &#39;alt&#39; },\n    },\n}"}]}' />

The `css:<selector>` key in `fieldMappings` matches a pasted HTML element; the value maps element attributes to block fields. Not yet implemented — open question on whether this should run via `htmlTagsToSlate` (bypassing slate conversion) or be encoded into slate so attributes/classes survive.
