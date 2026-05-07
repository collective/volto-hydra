# Level 2: Block Definitions

During the initialisation you can have full control over the blocks that will be stored, their schema and where they can be added.

## `initBridge()` Reference

`initBridge(options)` opens the iframe bridge and registers your frontend's page and block configuration with the admin. Call it once during page setup when running inside the admin iframe.

```js
import { initBridge } from '@hydra-js/hydra.js';

const bridge = initBridge({
  page:        { /* page-level blocks fields */ },
  blocks:      { /* block type registry */ },
  voltoConfig: { /* other Volto settings */ },
  onEditChange: (formData) => { /* re-render on edit */ },
  pathToApiPath: (path) => path,
  debug: false,
});
```

### `page` — page-level blocks fields

Defines the **regions of a page** where blocks can live. `page.schema.properties` is keyed by field name; each entry is one region.

```js
page: {
  schema: {
    properties: {
      blocks_layout: { title: 'Content', allowedBlocks: ['slate', 'image', 'slider'] },
      header_blocks: { title: 'Header',  allowedBlocks: ['slate'], maxLength: 3 },
      footer_blocks: { title: 'Footer',  allowedBlocks: ['slate', 'link'] },
    },
  },
}
```

Per-field options:

- **`title`** — sidebar section title (defaults to the field name).
- **`allowedBlocks`** — array of block-type names this region accepts. Acts as a per-region filter on top of the registry.
- **`allowedTemplates`** — array of template URLs shown in the BlockChooser's "Templates" group for this field. See [Templates](../concepts/templates.md).
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

```js
blocks: {
  slider: {                          // new custom block
    id: 'slider',
    title: 'Slider',
    icon: 'data:...',
    group: 'common',
    mostUsed: true,
    blockSchema: { properties: { /* fields */ } },
  },
  slate: {                           // override the built-in slate block
    blockSchema: { /* override */ },
  },
}
```

Per-block options (most are passed through to Volto's block config):

- **`id`** — block type identifier (matches the key).
- **`title`** — display name in the BlockChooser.
- **`icon`** — icon shown in the BlockChooser (data URL or SVG component).
- **`group`** — chooser group (e.g. `'common'`).
- **`restricted`** — `true` hides the block from the chooser; can also be a function for conditional restrictions.
- **`mostUsed`** — pin to the top of the chooser.
- **`disableCustomSidebarEditForm`** — set `true` to use only the schema form in the sidebar (no custom edit component).
- **`blockSchema`** — JSON-schema-style definition of the block's fields. See [Custom Blocks › Schema Enhancers](../concepts/custom-blocks.md) and the [Block reference](../blocks/README.md).
- **`fieldMappings`** — block-to-block conversion rules. See [Custom Blocks › Block Conversion](../concepts/custom-blocks.md#block-conversion--fieldmappings).
- **`schemaEnhancer`** — recipe-based schema modifier; supports `fieldRules`, `inheritSchemaFrom`, etc. See `fieldRules Reference` below.

`page` and `blocks` interact via name lookup: a region's `allowedBlocks: ['slate', 'slider']` references keys of the `blocks` registry. You can use one without the other — `page` alone restricts placement of built-in blocks; `blocks` alone registers custom types and gets a default `blocks_layout` region accepting everything.

### Other top-level options

- **`onEditChange(formData)`** — callback invoked with the new form data whenever the editor changes anything. Used at Level 4+ to enable real-time preview without a server round-trip. See [Level 4: Realtime Changes](level-4-realtime.md).
- **`pathToApiPath(path)`** — function transforming a frontend path to the API/admin path on `PATH_CHANGE` messages. Use when your frontend embeds state (paging, filters) in URL segments that don't exist on the CMS side. See [Listings › Path Transformation](../concepts/listings.md#path-transformation-pathtoapipath).
- **`voltoConfig`** — passes additional Volto config (non-block settings) through to the admin. Future home for things like slate formats ([TODO #109](https://github.com/collective/volto-hydra/issues/109)) and toolbar actions.
- **`debug`** — `true` enables verbose console logging in the bridge. Default `false`.

### Returns

The `Bridge` instance, which exposes additional API methods you can call from the frontend (e.g. `getAccessToken()`, `sendBlockUpdate()`, `sendBlockAction()`). See [Custom Visual Editing](level-6-custom.md) for those.

## Example: Slider Block

Let's take a specific example of a slider block you want to have available for your editors. This is not a default block type so you will need to add it as custom. Normally this would require developing a Volto plugin and installing it into your custom Volto instance.

For our slider example, we can configure this new block directly in the frontend:

```js
import { initBridge } from './hydra.js';

const bridge = initBridge({
  page: {
    schema: {
      properties: {
        'blocks_layout': {
          title: 'Content',
          widget: 'blocks_layout',
          allowedBlocks: ['slate', 'image', 'video', 'slider']
        },
      }
    }
  },
  blocks: {
    slider: {
      id: 'slider',
      title: 'Slider',
      icon: 'data:...',
      group: 'common',
      restricted: false,
      mostUsed: true,
      disableCustomSidebarEditForm: false,
      blockSchema: {
        properties: {
          slider_timing: {
            title: "time",
            widget: 'float',
          },
          slides: {
            title: "Slides",
            widget: 'blocks_layout',
            allowedBlocks: ['slide', 'image'],
            defaultBlockType: 'slide',
            maxLength: 10,
          }
        },
      }
    },
    slide: {
      id: 'slide',
      title: 'Slide',
      blockSchema: {
        fieldsets: [
          {
            id: 'default',
            title: "Settings",
            fields: ['url', 'title', 'image', 'description'],
          },
        ],
        properties: {
          url: { title: "Link", widget: 'url' },
          title: { title: "Title" },
          image: { title: "Image", widget: "image" },
          description: { title: "Description", widget: "slate" },
        },
        required: [],
      },
    },
  },
});
```

Now we can add a slider block using the sidebar and slides to the slider block. Once saved the page data will include a block JSON:

```json
{
  "@type": "slider",
  "blocks": {
    "slide-1": { "@type": "slide", "title": "First Slide", "image": "..." },
    "slide-2": { "@type": "image", "title": "Second Slide", "image": "..." }
  },
  "slides": { "items": ["slide-1", "slide-2"] }
}
```

Which can be rendered (Vue.js example):

```js
<template>
    ...
    <div v-else-if="block['@type'] == 'slider'" class="slider">
      <div>
        <div class="slide" v-for="slide_id in block.slides.items">
          <img :src="block.blocks[slide_id].image"/>
          <h2>{{block.blocks[slide_id].title}</h2>
          <div><RichText v-for="node in block.blocks[slide_id].description" :key="node" :node="node" /></div>
          <div><a :href="block.blocks[slide_id].url">block.blocks[slide_id].link_text</a><div>
        </div>
      </div>
      <a link="">Prev></a><a link="">Next></a>
    </div>
    ...
```

## Container Blocks

Container blocks are ones that have one or more block fields which can contain other blocks. These blocks can be added, removed and dragged around the page.

There are two formats you can use in your block schema to define blocks fields. Both look the same in the editing UI and blocks can be dragged between them.

### `blocks_layout` — Typed Blocks with Separate Schemas

Each child block has its own `@type` and schema (looked up from `blocks`). Child blocks are stored in a shared `blocks` dict on the parent block, with the field holding `{ items: [...] }` for ordering.

```js
slides: {
  title: "Slides",
  widget: 'blocks_layout',
  allowedBlocks: ['slide', 'image'],
  defaultBlockType: 'slide',
  maxLength: 10,
}
```

Resulting data:

```json
{
  "@type": "slider",
  "blocks": {
    "slide-1": { "@type": "slide", "title": "First Slide", "image": "..." },
    "slide-2": { "@type": "image", "title": "Second Slide", "image": "..." }
  },
  "slides": { "items": ["slide-1", "slide-2"] }
}
```

```{note}
All `blocks_layout` fields on the same block share the same `blocks` dict. This means a block can have multiple container fields (e.g., `header` and `footer`) whose child blocks all live in the parent's `blocks`.
```

### `object_list` — Items Sharing a Single Schema

All items share one inline schema. Stored as an array with an ID field.

```js
slides: {
  title: "Slides",
  widget: 'object_list',
  idField: '@id',
  dataPath: ['data', 'rows'],
  schema: {
    properties: {
      title: { title: "Title" },
      image: { title: "Image", widget: "image" },
      description: { title: "Description", widget: "slate" }
    }
  }
}
```

Resulting data:

```json
{
  "@type": "slider",
  "data": {
    "slides": [
      { "@id": "slide-1", "title": "First Slide", "image": "..." },
      { "@id": "slide-2", "title": "Second Slide", "image": "..." }
    ]
  }
}
```

### `object_list` with `allowedBlocks` — Typed Items

When `allowedBlocks` is set on an `object_list`, items can have different types (like `blocks_layout`) but are still stored as an array.

```js
facets: {
  title: "Facets",
  widget: 'object_list',
  allowedBlocks: ['checkboxFacet', 'selectFacet'],
  typeField: 'type',
  defaultBlockType: 'checkboxFacet',
}
```

Resulting data:

```json
{
  "@type": "search",
  "facets": [
    { "@id": "facet-1", "type": "checkboxFacet", "title": "Content Type", "field": "portal_type" },
    { "@id": "facet-2", "type": "selectFacet", "title": "Subject", "field": "Subject" }
  ]
}
```

Both `blocks_layout` and `object_list` look the same in the editing UI and blocks can be dragged between them — data is automatically adapted when moving between formats.

### Table Mode (`addMode: 'table'`)

For table-like structures (rows then cells, or columns then cells) you can enable table mode:

```js
rows: {
  widget: 'object_list',
  idField: 'key',
  addMode: 'table',
  dataPath: ['table', 'rows'],
  schema: {
    properties: {
      cells: {
        widget: 'object_list',
        idField: 'key',
        schema: {
          properties: {
            value: { title: 'Content', widget: 'slate' }
          }
        }
      }
    }
  }
}
```

## Schema Enhancers

Schema enhancers modify block schemas dynamically:

```js
const bridge = initBridge({
  blocks: {
    myBlock: {
      blockSchema: {
        properties: {
          mode: { title: 'Mode', widget: 'select', choices: [['simple', 'Simple'], ['advanced', 'Advanced']] },
          advancedOptions: { title: 'Advanced Options', type: 'string' },
        },
      },
      schemaEnhancer: {
        fieldRules: {
          advancedOptions: { when: { mode: 'advanced' }, else: false },
        },
      },
    },
  },
});
```

### `fieldRules` Reference

- `false` — always hide the field
- `{ set: { title: '...', widget: '...' } }` — always add/replace a field definition
- `{ when: { fieldName: value }, else: false }` — show only when condition met
- `{ when: { fieldName: { gte: 2 } }, set: { ... } }` — conditional definition override
- `[rule, rule, ...]` — switch: first matching rule wins. A bare `false` in the array is a catch-all hide: `[{ when: A }, { when: B }, false]` shows on A or B, hides otherwise.
- `'parent.child': false` — hide a field inside a widget's inner schema
- Condition operators: `is`, `isNot`, `isSet`, `isNotSet`, `gt`, `gte`, `lt`, `lte`
- Field paths: `../field` for parent block, `/field` for root

## Block Conversion and fieldMappings

`fieldMappings` (plural) on a block config defines how fields map between block types. This enables:

- **"Convert to..." UI action** — editors can convert between block types (e.g., teaser → image)
- **Listing item types** — query results are mapped to item blocks via `@default`
- **Synchronised container children** — a parent controls child type, all children convert together

Each key in `fieldMappings` is either a **specific block type name** or **`@default`**.

`@default` is a virtual type representing canonical Plone content item fields: `@id`, `title`, `description`, `image`.

```js
// Content item types: use @default (canonical fields) + explicit cross-mappings
teaser: {
  fieldMappings: {
    '@default': { '@id': 'href', 'title': 'title', 'image': 'preview_image' },
    image: { 'href': 'href', 'alt': 'title', 'url': 'preview_image' },
  },
},
image: {
  fieldMappings: {
    '@default': { '@id': 'href', 'title': 'alt', 'image': 'url' },
    teaser: { 'href': 'href', 'title': 'alt', 'preview_image': 'url' },
  },
},

// Non-content types: use explicit hub-type mappings (NOT @default)
selectFacet:  { fieldMappings: { checkboxFacet: { title: 'title', field: 'field', hidden: 'hidden' } } },
checkboxFacet: { fieldMappings: { selectFacet: {...}, daterangeFacet: {...}, toggleFacet: {...} } },
```

### Conversion Graph Rules

- Explicit `fieldMappings[typeName]` always creates a conversion edge
- `@default` only creates edges between types that both have valid `@default` mappings
- Types without `fieldMappings` never appear in the "Convert to..." menu
- Transitive conversions use paths through intermediate types
- Unmapped fields are kept in the data so converting back restores them

### Value Type Conversions

| Type | Conversion |
|------|-----------|
| `string` | Arrays joined with `", "`; image objects resolved to URL string |
| `link` | String wrapped as `[{ "@id": value }]` (Volto link format) |
| `image` | Pass through (expects `{ "@id", image_field, image_scales }` object) |
| `array` | Non-arrays wrapped in `[value]` |
| _(none)_ | Copied as-is |

## Synchronised Block Types in a Container

A parent container can control the `@type` of all its children. Declare `itemTypeField` on the *blocks field* (the `blocks_layout` or `object_list` field whose children should be synced); its value names a sibling field whose value drives every child's `@type`. When the editor changes that sibling field, every child is converted using its `fieldMappings`.

```js
const bridge = initBridge({
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
      schemaEnhancer: { inheritSchemaFrom: {} },  // optional: also sync field values
    },
    teaser: {
      fieldMappings: {
        '@default': { '@id': 'href', 'title': 'title', 'image': 'preview_image' },
      },
    },
  },
});
```

`schemaEnhancer.inheritSchemaFrom` is optional — without it you get type syncing only. With it you also get **field-value syncing**: parent-claimed fields surface on the parent's sidebar under "Item Defaults", and the same fields are auto-hidden on every child (a `hideParentOwnedFields` enhancer is auto-installed on every block at INIT). Which fields are parent-claimed defaults to "everything not in the child's `fieldMappings['@default']` mapping". Override per child type with `parentControlled`:

```js
listing: {
  schemaEnhancer: {
    inheritSchemaFrom: {
      typeField: 'variation',
      mappingField: 'fieldMapping',
      parentControlled: {
        teaser: ['head_title', 'openLinkInNewTab', 'styles'],  // explicit list — replaces fallback
      },
    },
  },
},
```

See [Container Blocks › Synchronised Block Types](../concepts/container-blocks.md#synchronised-block-types-in-a-container) for the full pattern, and [Listings › Item Type Selection](../concepts/listings.md#item-type-selection) for listings (which declare `typeField` directly on the recipe instead of `itemTypeField` on a blocks field, since listing children are virtual).

### `inheritSchemaFrom` Recipe Options

- `typeField`: name of the sibling field whose value drives child `@type` — declare here when there is no blocks field (e.g. listings); otherwise declare `itemTypeField` on the blocks field instead.
- `mappingField`: field name where the `FieldMappingWidget` saves its per-instance override.
- `defaultsField`: prefix for the inherited fields on the parent's "Item Defaults" fieldset (default: `'itemDefaults'`).
- `parentControlled`: `{ childType: [fieldName, ...] }` per-child-type override. Replaces the `fieldMappings['@default']` fallback.
- `blocksField`: which blocks field the sub-blocks live in. Auto-discovered from `itemTypeField` declarations; declare explicitly only for unusual layouts.
- `filterConvertibleFrom`: only offer child types whose `fieldMappings` accept the named source — typically `'@default'` for listings.

### `blockTypeSelect` Widget

Computes its `choices` from the surrounding block's `allowedBlocks` at render time, so you don't have to keep a static `choices` array in sync with allowed children. Field options:

- `blocksField`: which sub-blocks field's `allowedBlocks` to use for the choices. Auto-discovers if omitted. Set to `'..'` when choices should come from the *enclosing parent's* `allowedSiblingTypes`.
- `filterConvertibleFrom`: only offer types whose `fieldMappings` accept the named source.
- Standard JSON schema properties (`title`, `default`).
