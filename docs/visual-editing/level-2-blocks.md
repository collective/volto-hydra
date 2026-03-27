# Level 2: Block Definitions

During the initialisation you can have full control over the blocks that will be stored, their schema and where they can be added.

## Configuration

- `page` > `schema` > `properties`: lets you specify regions of the page where blocks can be added. The default is `blocks_layout`
  - `allowedBlocks`: you can enable or disable any builtin blocks (note this will stop new blocks being added but not filter blocks already saved)
  - Note: you can't currently change the page metadata schema itself
    - Custom content types are created via "Site Setup > Content types"
- `blocks`: Override settings of builtin blocks or add new block definitions
  - `blockSchema` > `properties`: field definitions for your block such as `title`, `type` or `widget`
- `voltoConfig`: in the future will let you change other settings like slate formats or toolbar actions

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
- `[rule, rule, ...]` — switch: first matching rule wins
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

A parent container can control the type of all its children. Setting `itemTypeField` on the parent's block config tells the system which field drives the child type.

```js
const bridge = initBridge({
  blocks: {
    gridBlock: {
      itemTypeField: 'variation',
      allowedBlocks: ['teaser', 'image'],
      schemaEnhancer: {
        inheritSchemaFrom: {
          blocksField: 'blocks',
        },
      },
    },
    teaser: {
      fieldMappings: {
        '@default': { '@id': 'href', 'title': 'title', 'image': 'preview_image' },
      },
    },
  },
});
```

### `inheritSchemaFrom` Recipe Options

- `blocksField`: which blocks field the sub-blocks live in (required for child type syncing)
- `mappingField`: field name where the FieldMappingWidget saves its output
- `defaultsField`: where to store inherited default values
- `filterConvertibleFrom`: only offer child types that can convert from this source type
- `title`: label for the type selector field in the sidebar
- `default`: default type value when none is selected

### `childBlockConfig` Recipe Options

- `editableFields`: allowlist of fields that stay on the child block's sidebar form
- `parentControlledFields`: blocklist alternative — only these fields are moved to the parent
