# Container Blocks

Container blocks hold other blocks inside them — sliders with slides, grids with columns, accordions with panels. Define them in your `blockSchema` using `blocks_layout` or `object_list` widgets.

## blocks_layout: Typed Child Blocks

Each child has its own `@type` and schema (from `blocks`). Children are stored in a shared `blocks` dict on the parent, with the field holding `{ items: [...] }` for ordering:

<!-- codeExample: javascript -->
```javascript
// Schema definition
slides: {
    title: 'Slides',
    widget: 'blocks_layout',
    allowedBlocks: ['slide', 'image'],
    defaultBlockType: 'slide',
    maxLength: 10,
}

// Resulting data
{
  "@type": "slider",
  "blocks": {
    "slide-1": { "@type": "slide", "title": "First" },
    "slide-2": { "@type": "image", "url": "..." }
  },
  "slides": { "items": ["slide-1", "slide-2"] }
}
```

All `blocks_layout` fields on the same block share the same `blocks` dict. So a block can have multiple container fields (e.g., `header_blocks` and `footer_blocks`) whose children all live in the parent's `blocks`.

## object_list: Items Sharing One Schema

All items share one inline schema, stored as an array with an ID field. Use `dataPath` when the data is nested within the block:

<!-- codeExample: javascript -->
```javascript
// Schema
slides: {
    title: 'Slides',
    widget: 'object_list',
    idField: '@id',
    dataPath: ['data', 'rows'],  // optional path when data is nested
    schema: {
        properties: {
            title: { title: 'Title' },
            image: { title: 'Image', widget: 'image' },
            description: { title: 'Description', widget: 'slate' },
        }
    }
}

// Resulting data (note: nested under dataPath)
{
  "@type": "slider",
  "data": {
    "slides": [
      { "@id": "slide-1", "title": "First", "image": "..." },
      { "@id": "slide-2", "title": "Second", "image": "..." }
    ]
  }
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
- **`data-block-selector="-1|+1|blockId"`** — Tag paging buttons so sidebar selection can navigate paged containers

## Table Mode

Set `addMode: 'table'` for table-like structures (rows containing cells). This lets users add and remove columns as easily as rows:

<!-- codeExample: javascript -->
```javascript
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
                        value: { title: 'Content',
                                 widget: 'slate' }
                    }
                }
            }
        }
    }
}
```

## Empty Blocks

A container can never be empty. When the last child is deleted, either the `defaultBlockType` is added, or a special block with `@type: "empty"` is inserted. Empty blocks are stripped before saving. Render them as empty space — Hydra puts a '+' button in the middle for the user to replace it.

You can override the look of the '+' button by rendering something inside the empty block and adding `data-block-add="button"` to it.

## Synchronised Block Types in a Container

You might want one container type that holds different block types but constrains them to all be the same type with synchronised settings. A field on the parent lets the editor select the type and all blocks get converted using `fieldMappings`:

<!-- codeExample: javascript -->
```javascript
blocks: {
    gridBlock: {
        allowedBlocks: ['teaser', 'image'],
        schemaEnhancer: {
            inheritSchemaFrom: {
                typeField: 'variation',
            },
        },
    },
    teaser: {
        schemaEnhancer: {
            childBlockConfig: {
                editableFields: ['href', 'title', 'description'],
            },
        },
        fieldMappings: {
            default: { '@id': 'href', 'title': 'title', 'image': 'preview_image' },
        },
    },
}
```

- **`inheritSchemaFrom`**: Parent inherits schema from selected child type. When the type field changes, child blocks sync to new type.
- **`typeField`**: Field name for selecting child type (e.g., `'variation'`)
- **`defaultsField`**: Field name for storing inherited defaults (e.g., `'itemDefaults'`)
- **`blocksField`**: Which blocks field the sub-blocks are in. Set to `".."` to use the parent's `allowedBlocks`.
- **`filterConvertibleFrom`**: Only allow selecting a block type which can convert from the specified type.
- **`childBlockConfig`**: Child hides fields except `editableFields` when inside a parent with `inheritSchemaFrom`.
