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
            '@default': {
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
    // Form block: uses typed object_list for field types (like search block facets)
    // field_type values in data map directly to block IDs below
    form: {
        id: 'form',
        title: 'Form',
        icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M4 4h16v2H4zm0 4h10v2H4zm0 4h16v2H4zm0 4h10v2H4z"/></svg>',
        group: 'common',
        blockSchema: {
            fieldsets: [
                {
                    id: 'default',
                    title: 'Default',
                    fields: [
                        'title', 'description', 'subblocks',
                        'default_to', 'default_from', 'default_subject',
                        'submit_label', 'show_cancel', 'cancel_label',
                        'mail_header', 'mail_footer',
                        'captcha', 'email_otp_verification',
                    ],
                },
                {
                    id: 'manage_data',
                    title: 'Manage data',
                    fields: ['store', 'remove_data_after_days', 'send', 'send_message'],
                },
            ],
            properties: {
                title: {
                    title: 'Title',
                    type: 'string',
                },
                description: {
                    title: 'Description',
                    type: 'textarea',
                },
                subblocks: {
                    title: 'Fields',
                    widget: 'object_list',
                    idField: 'field_id',
                    typeField: 'field_type',
                    allowedBlocks: [
                        'text', 'textarea', 'number', 'select',
                        'single_choice', 'multiple_choice', 'checkbox',
                        'date', 'from', 'static_text', 'hidden', 'attachment',
                    ],
                },
                default_to: {
                    title: 'Recipients',
                    type: 'string',
                },
                default_from: {
                    title: 'Default sender',
                    type: 'string',
                },
                default_subject: {
                    title: 'Mail subject',
                    description: 'Use the ${field_id} syntax to add a form value to the email subject',
                    type: 'string',
                },
                submit_label: {
                    title: 'Submit button label',
                    type: 'string',
                },
                show_cancel: {
                    title: 'Show cancel button',
                    type: 'boolean',
                    default: false,
                },
                cancel_label: {
                    title: 'Cancel button label',
                    type: 'string',
                },
                mail_header: {
                    title: 'Text at the beginning of the email',
                    widget: 'richtext',
                    type: 'string',
                    description: "If field isn't filled in, a default text will be used",
                },
                mail_footer: {
                    title: 'Text at the end of the email',
                    widget: 'richtext',
                    type: 'string',
                    description: "If field isn't filled in, a default text will be used",
                },
                captcha: {
                    title: 'Captcha provider',
                    type: 'string',
                },
                email_otp_verification: {
                    title: 'Validate BCC emails with OTP verification',
                    description: "Prevent spam from your website. By enabling this option, you do not allow malicious users to send emails to other email addresses through your website. The OTP will be requested for all email-type fields for which the 'Send a copy of the email to this address' option is checked.",
                    type: 'boolean',
                    default: false,
                },
                store: {
                    title: 'Store compiled data',
                    type: 'boolean',
                },
                remove_data_after_days: {
                    title: 'Data wipe',
                    description: 'Number of days after which, the data should be deleted',
                    type: 'integer',
                    default: -1,
                },
                send: {
                    title: 'Send email to recipient',
                    description: 'Attached file will be sent via email, but not stored',
                    type: 'boolean',
                },
                send_message: {
                    title: 'Message of sending confirmed',
                    widget: 'textarea',
                    description: 'You can add the value of a filled field in the form by inserting its ID between curly brackets preceded by $, example: ${field_id}; you can add also html elements such as links <a>, new line <br />, bold <b> and italic <i> formatting.',
                },
            },
            required: ['default_to', 'default_from', 'default_subject', 'captcha'],
        },
        schemaEnhancer: {
            skiplogic: {
                // cancel_label only visible when show_cancel is checked
                cancel_label: { field: 'show_cancel', is: true },
            },
        },
    },
    // Form field types — restricted blocks keyed by field_type value from data
    // Matches collective/volto-form-block field schemas:
    // - All fields get: label, description, required (except static_text)
    // - select/single_choice/multiple_choice add: input_values (SelectionSchemaExtender)
    // - from adds: use_as_reply_to, use_as_bcc (FromSchemaExtender)
    // - hidden adds: value (HiddenSchemaExtender)
    //
    // fieldMappings use explicit type-to-type via `select` as hub (most fields).
    // @default is NOT used because form field properties (label, description, required)
    // are not canonical @default fields (@id, title, description, image).
    text: {
        id: 'text',
        title: 'Text',
        restricted: true,
        fieldMappings: { select: { label: 'label', description: 'description', required: 'required' } },
        blockSchema: {
            title: 'Text Field',
            fieldsets: [{ id: 'default', title: 'Default', fields: ['label', 'description', 'required'] }],
            properties: {
                label: { title: 'Label', type: 'string' },
                description: { title: 'Description', type: 'string' },
                required: { title: 'Required', type: 'boolean', default: false },
            },
        },
    },
    textarea: {
        id: 'textarea',
        title: 'Textarea',
        restricted: true,
        fieldMappings: { select: { label: 'label', description: 'description', required: 'required' } },
        blockSchema: {
            title: 'Textarea Field',
            fieldsets: [{ id: 'default', title: 'Default', fields: ['label', 'description', 'required'] }],
            properties: {
                label: { title: 'Label', type: 'string' },
                description: { title: 'Description', type: 'string' },
                required: { title: 'Required', type: 'boolean', default: false },
            },
        },
    },
    number: {
        id: 'number',
        title: 'Number',
        restricted: true,
        fieldMappings: { select: { label: 'label', description: 'description', required: 'required' } },
        blockSchema: {
            title: 'Number Field',
            fieldsets: [{ id: 'default', title: 'Default', fields: ['label', 'description', 'required'] }],
            properties: {
                label: { title: 'Label', type: 'string' },
                description: { title: 'Description', type: 'string' },
                required: { title: 'Required', type: 'boolean', default: false },
            },
        },
    },
    select: {
        id: 'select',
        title: 'List',
        restricted: true,
        fieldMappings: {
            text: { label: 'label', description: 'description', required: 'required' },
            textarea: { label: 'label', description: 'description', required: 'required' },
            number: { label: 'label', description: 'description', required: 'required' },
            single_choice: { label: 'label', description: 'description', required: 'required', input_values: 'input_values' },
            multiple_choice: { label: 'label', description: 'description', required: 'required', input_values: 'input_values' },
            checkbox: { label: 'label', description: 'description', required: 'required' },
            date: { label: 'label', description: 'description', required: 'required' },
            from: { label: 'label', description: 'description', required: 'required' },
            static_text: { label: 'label', description: 'description' },
            hidden: { label: 'label' },
            attachment: { label: 'label', description: 'description', required: 'required' },
        },
        blockSchema: {
            title: 'Select Field',
            fieldsets: [{ id: 'default', title: 'Default', fields: ['label', 'description', 'input_values', 'required'] }],
            properties: {
                label: { title: 'Label', type: 'string' },
                description: { title: 'Description', type: 'string' },
                input_values: { title: 'Possible values', type: 'array', creatable: true },
                required: { title: 'Required', type: 'boolean', default: false },
            },
        },
    },
    single_choice: {
        id: 'single_choice',
        title: 'Single Choice',
        restricted: true,
        fieldMappings: { select: { label: 'label', description: 'description', required: 'required', input_values: 'input_values' } },
        blockSchema: {
            title: 'Single Choice Field',
            fieldsets: [{ id: 'default', title: 'Default', fields: ['label', 'description', 'input_values', 'required'] }],
            properties: {
                label: { title: 'Label', type: 'string' },
                description: { title: 'Description', type: 'string' },
                input_values: { title: 'Possible values', type: 'array', creatable: true },
                required: { title: 'Required', type: 'boolean', default: false },
            },
        },
    },
    multiple_choice: {
        id: 'multiple_choice',
        title: 'Multiple Choice',
        restricted: true,
        fieldMappings: { select: { label: 'label', description: 'description', required: 'required', input_values: 'input_values' } },
        blockSchema: {
            title: 'Multiple Choice Field',
            fieldsets: [{ id: 'default', title: 'Default', fields: ['label', 'description', 'input_values', 'required'] }],
            properties: {
                label: { title: 'Label', type: 'string' },
                description: { title: 'Description', type: 'string' },
                input_values: { title: 'Possible values', type: 'array', creatable: true },
                required: { title: 'Required', type: 'boolean', default: false },
            },
        },
    },
    checkbox: {
        id: 'checkbox',
        title: 'Checkbox',
        restricted: true,
        fieldMappings: { select: { label: 'label', description: 'description', required: 'required' } },
        blockSchema: {
            title: 'Checkbox Field',
            fieldsets: [{ id: 'default', title: 'Default', fields: ['label', 'description', 'required'] }],
            properties: {
                label: { title: 'Label', type: 'string' },
                description: { title: 'Description', type: 'string' },
                required: { title: 'Required', type: 'boolean', default: false },
            },
        },
    },
    date: {
        id: 'date',
        title: 'Date',
        restricted: true,
        fieldMappings: { select: { label: 'label', description: 'description', required: 'required' } },
        blockSchema: {
            title: 'Date Field',
            fieldsets: [{ id: 'default', title: 'Default', fields: ['label', 'description', 'required'] }],
            properties: {
                label: { title: 'Label', type: 'string' },
                description: { title: 'Description', type: 'string' },
                required: { title: 'Required', type: 'boolean', default: false },
            },
        },
    },
    from: {
        id: 'from',
        title: 'E-mail',
        restricted: true,
        fieldMappings: { select: { label: 'label', description: 'description', required: 'required' } },
        blockSchema: {
            title: 'Email Field',
            fieldsets: [{ id: 'default', title: 'Default', fields: ['label', 'description', 'use_as_reply_to', 'use_as_bcc', 'required'] }],
            properties: {
                label: { title: 'Label', type: 'string' },
                description: { title: 'Description', type: 'string' },
                use_as_reply_to: { title: "Use as 'reply to'", type: 'boolean', default: false },
                use_as_bcc: { title: 'Send an email copy to this address', type: 'boolean', default: false },
                required: { title: 'Required', type: 'boolean', default: false },
            },
        },
    },
    static_text: {
        id: 'static_text',
        title: 'Static Text',
        restricted: true,
        fieldMappings: { select: { label: 'label', description: 'description' } },
        blockSchema: {
            title: 'Static Text',
            fieldsets: [{ id: 'default', title: 'Default', fields: ['label', 'description'] }],
            properties: {
                label: { title: 'Label', type: 'string' },
                description: { title: 'Description', type: 'string' },
            },
        },
    },
    hidden: {
        id: 'hidden',
        title: 'Hidden',
        restricted: true,
        fieldMappings: { select: { label: 'label' } },
        blockSchema: {
            title: 'Hidden Field',
            fieldsets: [{ id: 'default', title: 'Default', fields: ['label', 'description', 'value'] }],
            properties: {
                label: { title: 'Label', type: 'string' },
                description: { title: 'Description', type: 'string' },
                value: { title: 'Value for field', type: 'string' },
            },
        },
    },
    attachment: {
        id: 'attachment',
        title: 'Attachment',
        restricted: true,
        fieldMappings: { select: { label: 'label', description: 'description', required: 'required' } },
        blockSchema: {
            title: 'Attachment Field',
            fieldsets: [{ id: 'default', title: 'Default', fields: ['label', 'description', 'required'] }],
            properties: {
                label: { title: 'Label', type: 'string' },
                description: { title: 'Description', type: 'string' },
                required: { title: 'Required', type: 'boolean', default: false },
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
