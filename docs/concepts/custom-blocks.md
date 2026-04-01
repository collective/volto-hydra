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

If a block type has a `fieldMappings` defined it will enable a "Convert to..." UI action. You specify either conversions to a specific type, or to a generic search result schema (`@id`, `title`, `preview-image`, `description`):

<!-- codeExample: javascript -->
```javascript
blocks: {
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
}
```

Transitive conversions are performed automatically by using paths through intermediate types (e.g., `hero -> teaser -> image`). Any fields that don't match will still be kept in the data so if the block is converted back that data will reappear.
