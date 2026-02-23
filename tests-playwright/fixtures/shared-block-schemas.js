/**
 * Shared block schema definitions used by both the test frontend (mock)
 * and the Nuxt example frontend for E2E tests.
 *
 * Single source of truth — prevents schema drift between frontends.
 */

export const sharedBlocksConfig = {
    hero: {
        id: 'hero',
        title: 'Hero',
        icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>',
        group: 'common',
        mostUsed: true,
        blockSchema: {
            fieldsets: [
                {
                    id: 'default',
                    title: 'Default',
                    fields: ['heading', 'subheading', 'buttonText', 'buttonLink', 'image', 'description'],
                },
            ],
            properties: {
                heading: {
                    title: 'Heading',
                    type: 'string',
                },
                subheading: {
                    title: 'Subheading',
                    type: 'string',
                    widget: 'textarea',
                },
                buttonText: {
                    title: 'Button Text',
                    type: 'string',
                },
                buttonLink: {
                    title: 'Button Link',
                    widget: 'object_browser',
                    mode: 'link',
                    allowExternals: true,
                },
                image: {
                    title: 'Image',
                    widget: 'image',
                },
                description: {
                    title: 'Description',
                    type: 'array',
                    widget: 'slate',
                },
            },
            required: [],
        },
        fieldMappings: {
            default: {
                'title': 'heading',
                'description': 'subheading',
                '@id': 'buttonLink',
                'image': 'image',
            },
            teaser: {
                'title': 'heading',
                'description': 'subheading',
                'href': 'buttonLink',
                'preview_image': 'image',
            },
        },
    },
    // Container block: columns contains column children AND top_images
    // Tests multi-container field routing
    columns: {
        id: 'columns',
        title: 'Columns',
        icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect x="2" y="3" width="8" height="18" rx="1"/><rect x="14" y="3" width="8" height="18" rx="1"/></svg>',
        group: 'common',
        blockSchema: {
            fieldsets: [
                {
                    id: 'default',
                    title: 'Default',
                    fields: ['title', 'top_images', 'columns'],
                },
            ],
            properties: {
                title: {
                    title: 'Title',
                    type: 'string',
                },
                top_images: {
                    title: 'Top Images',
                    widget: 'blocks_layout',
                    allowedBlocks: ['image'],
                    defaultBlockType: 'image',
                },
                columns: {
                    title: 'Columns',
                    widget: 'blocks_layout',
                    allowedBlocks: ['column'],
                    // No defaultBlockType - tests single allowedBlock path
                    maxLength: 4,
                },
            },
            required: [],
        },
    },
    // Nested container: column contains content blocks
    column: {
        id: 'column',
        title: 'Column',
        icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect x="6" y="3" width="12" height="18" rx="1"/></svg>',
        group: 'common',
        blockSchema: {
            fieldsets: [
                {
                    id: 'default',
                    title: 'Default',
                    fields: ['title', 'blocks_layout'],
                },
            ],
            properties: {
                title: {
                    title: 'Title',
                    type: 'string',
                },
                blocks_layout: {
                    title: 'Content',
                    widget: 'blocks_layout',
                    allowedBlocks: ['slate', 'image'],
                    defaultBlockType: 'slate',
                },
            },
            required: [],
        },
    },
    // Slider container: uses object_list widget (volto-slider-block format)
    // Slides are stored as array with @id instead of blocks/blocks_layout
    slider: {
        id: 'slider',
        title: 'Slider',
        icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="8" cy="18" r="1.5"/><circle cx="12" cy="18" r="1.5"/><circle cx="16" cy="18" r="1.5"/></svg>',
        group: 'common',
        blockSchema: {
            fieldsets: [
                {
                    id: 'default',
                    title: 'Default',
                    fields: ['slides', 'autoplayEnabled', 'autoplayDelay', 'autoplayJump'],
                },
            ],
            properties: {
                slides: {
                    title: 'Slides',
                    widget: 'object_list',
                    schema: {
                        title: 'Slide',
                        fieldsets: [{ id: 'default', title: 'Default', fields: ['head_title', 'title', 'description', 'preview_image', 'buttonText', 'hideButton'] }],
                        properties: {
                            head_title: { title: 'Kicker', type: 'string' },
                            title: { title: 'Title', type: 'string' },
                            description: { title: 'Description', type: 'string', widget: 'textarea' },
                            preview_image: { title: 'Image Override', widget: 'object_browser', mode: 'image', allowExternals: true },
                            buttonText: { title: 'Button Text', type: 'string' },
                            hideButton: { title: 'Hide Button', type: 'boolean' },
                        },
                    },
                },
                autoplayEnabled: {
                    title: 'Autoplay Enabled',
                    type: 'boolean',
                    default: false,
                },
                autoplayDelay: {
                    title: 'Autoplay Delay',
                    type: 'integer',
                    default: 4000,
                },
                autoplayJump: {
                    title: 'Autoplay Jump',
                    type: 'boolean',
                    default: false,
                },
            },
            required: [],
        },
    },
    // Slide block: child of carousel
    slide: {
        id: 'slide',
        title: 'Slide',
        icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="2"/></svg>',
        group: 'common',
        blockSchema: {
            fieldsets: [
                {
                    id: 'default',
                    title: 'Default',
                    fields: ['title', 'content'],
                },
            ],
            properties: {
                title: {
                    title: 'Title',
                    type: 'string',
                },
                content: {
                    title: 'Content',
                    type: 'string',
                    widget: 'textarea',
                },
            },
            required: [],
        },
    },
    // Accordion block with header and content containers
    accordion: {
        id: 'accordion',
        title: 'Accordion',
        icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="4" rx="1"/><rect x="3" y="10" width="18" height="4" rx="1"/><rect x="3" y="16" width="18" height="4" rx="1"/></svg>',
        group: 'common',
        blockSchema: {
            fieldsets: [
                {
                    id: 'default',
                    title: 'Default',
                    fields: ['header', 'content'],
                },
            ],
            properties: {
                header: {
                    title: 'Header',
                    widget: 'blocks_layout',
                    allowedBlocks: ['slate'],
                    defaultBlockType: 'slate',
                },
                content: {
                    title: 'Content',
                    widget: 'blocks_layout',
                    allowedBlocks: ['slate', 'image'],
                    defaultBlockType: 'slate',
                },
            },
            required: [],
        },
    },
    // Grid block: schema inheritance recipe
    // variation field is created by inheritSchemaFrom with computed choices
    // allowedBlocks on config controls what children can be added
    // blocksField: 'blocks_layout' tells inheritSchemaFrom to derive choices from it
    // When variation is set, BlockChooser only shows that type
    gridBlock: {
        allowedBlocks: ['teaser', 'image'],
        schemaEnhancer: {
            inheritSchemaFrom: {
                typeField: 'variation',
                defaultsField: 'itemDefaults',
                blocksField: 'blocks_layout',
                title: 'Item Type',
            },
        },
    },
    // Teaser block: use Volto's TeaserSchema (has href with object_browser)
    // fieldMappings come from volto-hydra index.js (merged via deepMerge)
    teaser: {
        id: 'teaser',
        title: 'Teaser',
        icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/></svg>',
        group: 'common',
        schemaEnhancer: {
            childBlockConfig: {
                defaultsField: 'itemDefaults',
                editableFields: ['href', 'title', 'description', 'preview_image', 'overwrite'],
            },
        },
    },
    // Image block: configure which fields are editable on child vs parent
    // fieldMappings come from volto-hydra index.js (merged via deepMerge)
    image: {
        schemaEnhancer: {
            childBlockConfig: {
                defaultsField: 'itemDefaults',
                editableFields: ['url', 'alt', 'href'],
            },
        },
    },
    // Skiplogic test block: demonstrates conditional field visibility
    skiplogicTest: {
        id: 'skiplogicTest',
        title: 'Skiplogic Test',
        group: 'common',
        blockSchema: {
            properties: {
                mode: {
                    title: 'Mode',
                    widget: 'select',
                    choices: [['simple', 'Simple'], ['advanced', 'Advanced']],
                },
                columns: {
                    title: 'Columns',
                    type: 'integer',
                    default: 1,
                },
                basicTitle: {
                    title: 'Basic Title',
                    type: 'string',
                },
                advancedOptions: {
                    title: 'Advanced Options',
                    type: 'string',
                },
                simpleWarning: {
                    title: 'Simple Warning',
                    type: 'string',
                },
                columnLayout: {
                    title: 'Column Layout',
                    widget: 'select',
                    choices: [['equal', 'Equal'], ['weighted', 'Weighted']],
                },
                pageNotice: {
                    title: 'Page Notice',
                    type: 'string',
                    description: 'Only visible when page has a description',
                },
            },
        },
        schemaEnhancer: {
            skiplogic: {
                advancedOptions: { field: 'mode', is: 'advanced' },
                simpleWarning: { field: 'mode', isNot: 'advanced' },
                columnLayout: { field: 'columns', gte: 2 },
                pageNotice: { field: '../description', isSet: true },
            },
        },
    },
};
