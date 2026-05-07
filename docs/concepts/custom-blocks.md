# Custom Blocks

Define custom block types directly in your frontend configuration via the `blocks` option in `initBridge`. No Volto plugin deployment required. Each block type needs an `id`, `title`, and a `blockSchema` with its field properties.

<!-- codeExample: javascript -->
```javascript
const bridge = initBridge({
    page: {
        schema: {
            properties: {
                blocks_layout: {
                    title: 'Content',
                    allowedBlocks: ['slate', 'image', 'video', 'slider'],
                },
            },
        },
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
                        title: 'Delay',
                        widget: 'float',
                    },
                    slides: {
                        title: 'Slides',
                        widget: 'blocks_layout',
                        allowedBlocks: ['slide', 'image'],
                        defaultBlockType: 'slide',
                    }
                },
            }
        },
        slide: {
            id: 'slide',
            title: 'Slide',
            blockSchema: {
                properties: {
                    url: { title: 'Link', widget: 'url' },
                    title: { title: 'Title' },
                    image: { title: 'Image', widget: 'image' },
                    description: { title: 'Description',
                                   widget: 'slate' },
                },
            },
        },
    },
});
```

Child block types (like `slide` above) must be defined at the top level of `blocks`. You can also:

- Set `restricted: true` to hide a block from the block chooser (only usable as child blocks)
- Set `mostUsed: true` to pin a block to the top of the chooser
- Set `disableCustomSidebarEditForm: true` to use only the schema form in the sidebar (no custom edit component)
- Use `fieldsets` in the schema to organize fields into tabs

## Schema Enhancers

Schema enhancers modify block schemas dynamically:

<!-- codeExample: javascript -->
```javascript
const bridge = initBridge({
    blocks: {
        myBlock: {
            blockSchema: {
                properties: {
                    mode: {
                        title: 'Mode', widget: 'select',
                        choices: [['simple', 'Simple'], ['advanced', 'Advanced']],
                    },
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

**`fieldRules`**: Add, remove, or conditionally modify field definitions.

- Condition operators: `is`, `isNot`, `isSet`, `isNotSet`, `gt`, `gte`, `lt`, `lte`
- Field paths: `../field` for parent block, `/field` for root

## Block Conversion & fieldMappings

`fieldMappings` (plural) on a block config defines how fields map between block types. This enables three things:

- **"Convert to..." UI action** — editors can convert a block to another type (e.g. teaser → image).
- **Listing item types** — query results are mapped to item blocks via `@default` (see [Listings](listings.md)).
- **Synchronised container children** — a parent controls child type, all children convert together (see [Container Blocks › Synchronised Block Types](container-blocks.md#synchronised-block-types-in-a-container)).

Each key in `fieldMappings` is either a **specific block type name** or **`@default`**.

### `@default` — the canonical content shape

`@default` is a virtual type representing canonical Plone content item fields: `@id`, `title`, `description`, `image`. These are the same fields that listing query results provide. A block with `fieldMappings['@default']` is saying "I can be populated from standard content item fields." The keys in `@default` must only use these four canonical fields — using other keys (e.g. `label`, `field`, `required`) is invalid and produces a console warning.

### Explicit type-to-type mappings

Use these when blocks share fields that aren't part of the `@default` set — for example, facet types sharing `{ title, field, hidden }` or form field types sharing `{ label, description, required }`.

<!-- codeExample: javascript -->
```javascript
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

// Non-content types: use explicit hub-type mappings (NOT @default).
// All facet types map through checkboxFacet as a hub:
selectFacet:  { fieldMappings: { checkboxFacet: { title: 'title', field: 'field', hidden: 'hidden' } } },
checkboxFacet: { fieldMappings: { selectFacet: { /* ... */ }, daterangeFacet: { /* ... */ } } },
```

### Conversion graph rules

- Explicit `fieldMappings[typeName]` always creates a conversion edge.
- `@default` only creates edges between types that both have valid `@default` mappings (keys from `{ @id, title, description, image }`). Types with non-canonical `@default` keys are ignored.
- Types without `fieldMappings` never appear in the "Convert to..." menu.
- Transitive conversions use paths through intermediate types (e.g. hero → teaser → image).
- Unmapped fields are kept in the data so converting back restores them.

### Mapping value format

A mapping value is either a string (simple field rename) or `{ field, type }` (rename with type conversion):

<!-- codeExample: json -->
```json
{
    "@id": { "field": "href", "type": "link" },
    "title": "title",
    "description": "description",
    "image": "preview_image"
}
```

When `type` is specified, the value is converted at runtime:

| Type | Conversion |
|------|------------|
| `string` | Arrays joined with `", "`; image objects resolved to URL string |
| `link` | String wrapped as `[{ "@id": value }]` (Volto link format) |
| `image` | Pass through (expects `{ "@id", image_field, image_scales }`) |
| `array` | Non-arrays wrapped in `[value]` |
| `(none)` | Copied as-is |

### FieldMappingWidget

When a parent block has `mappingField` set in its `inheritSchemaFrom` recipe, the admin sidebar shows a widget that lets editors configure field mappings visually:

- Shows the `@default` source fields (`@id`, `title`, `description`, `image`) on the left.
- For each source field, lets the editor pick a field from the selected child type's schema.
- Auto-detects the conversion `type` from the target field definition (e.g. `object_browser` with `mode=link` → `type: "link"`).
- Saves the result as `fieldMapping` (singular) on the block data.

The saved `fieldMapping` is read at render time by `expandListingBlocks` — no block registry access needed at render time.

## HTML Paste Support (TODO)

When the editor pastes rich HTML into the page, Hydra will eventually be able to recognise it as a custom block by matching against a CSS selector mapping. The proposed shape:

<!-- codeExample: javascript -->
```javascript
video: {
    fieldMappings: {
        'css:video': { 'src': 'url', 'caption[@class="alt"]': 'alt' },
    },
}
```

The `css:<selector>` key in `fieldMappings` matches a pasted HTML element; the value maps element attributes to block fields. Not yet implemented — open question on whether this should run via `htmlTagsToSlate` (bypassing slate conversion) or be encoded into slate so attributes/classes survive.
