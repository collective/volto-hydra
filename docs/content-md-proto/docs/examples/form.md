---
"@type": Document
UID: 13de82575e16493fbc54514e548a9f3c
allow_discussion: false
contributors: []
creators:
  - admin
description: A form block can be used to create forms
effective: 2024-03-08T12:40:00
exclude_from_nav: false
expires: null
id: form
is_folderish: true
language: "##DEFAULT##"
layout: document_view
preview_caption: null
preview_image: null
review_state: published
rights: ""
subjects:
  - blocks
  - forms
title: Form
blocks-assignments:
  - { uid: 00e8d49b-5b99-4d2f-83b3-7d69bc80b893 }
  - { uid: ref-form-description }
  - { uid: editor-screenshot }
  - { uid: 3687103d-0766-4d5e-8aae-fc7e65c457a6 }
  - { uid: eb25b89c-d64a-4566-8e6e-71fd0f371964 }
  - { uid: ref-form-schema }
  - { id: ref-form-schema-javascript-2285e7 }
  - { uid: ref-form-json-data }
  - { id: ref-form-json-data-json-6e9c29 }
  - { uid: ref-form-rendering }
  - { id: ref-form-rendering-jsx-29590c }
  - { id: ref-form-rendering-vue-3f1bde }
  - { id: ref-form-rendering-svelte-f8f39b }
  - { id: ref-form-rendering-astro-8cd3ec }
blocks-matched: |
  <block type="slate" value="${p,h*,ul,ol,blockquote/slate}" />
  <block type="title" _="${h1}" />
  <block type="image" description="${p/text}" url="${img/src}" alt="${img/alt}" align="center" size="l" image_field="image" title="Image" />
  <block type="image" url="${img/src}" alt="${img/alt}" align="center" size="l" image_field="image" title="Image" />
  <block type="codeExample">
    <region name="tabs" widget="object_list">
      <block type="tab" label="${h3/text}" language="${pre/lang}" code="${pre/text}" />
    </region>
  </block>
---

# Form

A multi-field form with configurable field types, validation, and email submission. Fields are stored as a typed object\_list — each field has a field\_type that maps to a sub-block schema.

<block type="image" url="/docs/images/form-edit" alt="The form example block being edited in Volto Hydra" align="center" size="l" />

<block type="form" default_from="noreply@plone.org" title="A simple form" data-json='{"lastChange":1710238630312,"remove_data_after_days":-1,"send":false,"show_cancel":false,"store":true,"subblocks":[{"field_id":"1709833577467","field_type":"text","id":"1709833577467","label":"Name","required":true},{"field_id":"1709833592544","field_type":"from","id":"1709833592544","label":"Email","required":false,"use_as_bcc":false,"use_as_reply_to":false},{"field_id":"1709833604677","field_type":"textarea","id":"1709833604677","label":"Message","required":false},{"field_id":"1709833616406","field_type":"multiple_choice","id":"1709833616406","input_values":["Red","Green","Blue"],"label":"Select field","required":false}]}' />

<block type="slate" data-json='{"value":[{"children":[{"text":""}],"type":"p"}]}' />

<fields templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-form">

<block type="codeExample" slotId="schema">

### Schema

```javascript
{
  "form": {
    "blockSchema": {
      "fieldsets": [
        {
          "id": "default",
          "title": "Default",
          "fields": [
            "title",
            "description",
            "subblocks",
            "default_to",
            "default_from",
            "default_subject",
            "submit_label",
            "show_cancel",
            "cancel_label",
            "captcha"
          ]
        },
        {
          "id": "manage_data",
          "title": "Manage data",
          "fields": [
            "store",
            "remove_data_after_days",
            "send",
            "send_message"
          ]
        }
      ],
      "properties": {
        "title": {
          "title": "Title"
        },
        "description": {
          "title": "Description",
          "widget": "textarea"
        },
        "subblocks": {
          "title": "Fields",
          "widget": "object_list",
          "idField": "field_id",
          "typeField": "field_type",
          "allowedBlocks": [
            "text",
            "textarea",
            "number",
            "select",
            "single_choice",
            "multiple_choice",
            "checkbox",
            "date",
            "from",
            "static_text",
            "hidden",
            "attachment"
          ]
        },
        "default_to": {
          "title": "Recipients"
        },
        "default_from": {
          "title": "Default sender"
        },
        "default_subject": {
          "title": "Mail subject"
        },
        "submit_label": {
          "title": "Submit button label"
        },
        "show_cancel": {
          "title": "Show cancel button",
          "type": "boolean"
        },
        "cancel_label": {
          "title": "Cancel button label"
        },
        "captcha": {
          "title": "Captcha provider"
        },
        "store": {
          "title": "Store compiled data",
          "type": "boolean"
        },
        "remove_data_after_days": {
          "title": "Data wipe",
          "type": "integer",
          "default": -1
        },
        "send": {
          "title": "Send email to recipient",
          "type": "boolean"
        },
        "send_message": {
          "title": "Message of sending confirmed",
          "widget": "textarea"
        }
      }
    },
    "schemaEnhancer": {
      "fieldRules": {
        "cancel_label": {
          "when": {
            "show_cancel": true
          },
          "else": false
        }
      }
    }
  },
  "text": {
    "restricted": true,
    "fieldMappings": {
      "select": {
        "label": "label",
        "description": "description",
        "required": "required"
      }
    },
    "blockSchema": {
      "properties": {
        "label": {
          "title": "Label"
        },
        "description": {
          "title": "Description"
        },
        "required": {
          "title": "Required",
          "type": "boolean",
          "default": false
        }
      }
    }
  },
  "textarea": {
    "restricted": true,
    "fieldMappings": {
      "select": {
        "label": "label",
        "description": "description",
        "required": "required"
      }
    },
    "blockSchema": {
      "properties": {
        "label": {
          "title": "Label"
        },
        "description": {
          "title": "Description"
        },
        "required": {
          "title": "Required",
          "type": "boolean",
          "default": false
        }
      }
    }
  },
  "number": {
    "restricted": true,
    "fieldMappings": {
      "select": {
        "label": "label",
        "description": "description",
        "required": "required"
      }
    },
    "blockSchema": {
      "properties": {
        "label": {
          "title": "Label"
        },
        "description": {
          "title": "Description"
        },
        "required": {
          "title": "Required",
          "type": "boolean",
          "default": false
        }
      }
    }
  },
  "select": {
    "restricted": true,
    "fieldMappings": {
      "text": {
        "label": "label",
        "description": "description",
        "required": "required"
      },
      "textarea": {
        "label": "label",
        "description": "description",
        "required": "required"
      },
      "number": {
        "label": "label",
        "description": "description",
        "required": "required"
      },
      "single_choice": {
        "label": "label",
        "description": "description",
        "required": "required",
        "input_values": "input_values"
      },
      "multiple_choice": {
        "label": "label",
        "description": "description",
        "required": "required",
        "input_values": "input_values"
      },
      "checkbox": {
        "label": "label",
        "description": "description",
        "required": "required"
      },
      "date": {
        "label": "label",
        "description": "description",
        "required": "required"
      },
      "from": {
        "label": "label",
        "description": "description",
        "required": "required"
      },
      "static_text": {
        "label": "label",
        "description": "description"
      },
      "hidden": {
        "label": "label"
      },
      "attachment": {
        "label": "label",
        "description": "description",
        "required": "required"
      }
    },
    "blockSchema": {
      "properties": {
        "label": {
          "title": "Label"
        },
        "description": {
          "title": "Description"
        },
        "input_values": {
          "title": "Possible values",
          "type": "array",
          "creatable": true
        },
        "required": {
          "title": "Required",
          "type": "boolean",
          "default": false
        }
      }
    }
  },
  "single_choice": {
    "restricted": true,
    "fieldMappings": {
      "select": {
        "label": "label",
        "description": "description",
        "required": "required",
        "input_values": "input_values"
      }
    },
    "blockSchema": {
      "properties": {
        "label": {
          "title": "Label"
        },
        "description": {
          "title": "Description"
        },
        "input_values": {
          "title": "Possible values",
          "type": "array",
          "creatable": true
        },
        "required": {
          "title": "Required",
          "type": "boolean",
          "default": false
        }
      }
    }
  },
  "multiple_choice": {
    "restricted": true,
    "fieldMappings": {
      "select": {
        "label": "label",
        "description": "description",
        "required": "required",
        "input_values": "input_values"
      }
    },
    "blockSchema": {
      "properties": {
        "label": {
          "title": "Label"
        },
        "description": {
          "title": "Description"
        },
        "input_values": {
          "title": "Possible values",
          "type": "array",
          "creatable": true
        },
        "required": {
          "title": "Required",
          "type": "boolean",
          "default": false
        }
      }
    }
  },
  "checkbox": {
    "restricted": true,
    "fieldMappings": {
      "select": {
        "label": "label",
        "description": "description",
        "required": "required"
      }
    },
    "blockSchema": {
      "properties": {
        "label": {
          "title": "Label"
        },
        "description": {
          "title": "Description"
        },
        "required": {
          "title": "Required",
          "type": "boolean",
          "default": false
        }
      }
    }
  },
  "date": {
    "restricted": true,
    "fieldMappings": {
      "select": {
        "label": "label",
        "description": "description",
        "required": "required"
      }
    },
    "blockSchema": {
      "properties": {
        "label": {
          "title": "Label"
        },
        "description": {
          "title": "Description"
        },
        "required": {
          "title": "Required",
          "type": "boolean",
          "default": false
        }
      }
    }
  },
  "from": {
    "restricted": true,
    "fieldMappings": {
      "select": {
        "label": "label",
        "description": "description",
        "required": "required"
      }
    },
    "blockSchema": {
      "properties": {
        "label": {
          "title": "Label"
        },
        "description": {
          "title": "Description"
        },
        "use_as_reply_to": {
          "title": "Use as 'reply to'",
          "type": "boolean",
          "default": false
        },
        "use_as_bcc": {
          "title": "Send a copy to this address",
          "type": "boolean",
          "default": false
        },
        "required": {
          "title": "Required",
          "type": "boolean",
          "default": false
        }
      }
    }
  },
  "static_text": {
    "restricted": true,
    "fieldMappings": {
      "select": {
        "label": "label",
        "description": "description"
      }
    },
    "blockSchema": {
      "properties": {
        "label": {
          "title": "Label"
        },
        "description": {
          "title": "Description"
        }
      }
    }
  },
  "hidden": {
    "restricted": true,
    "fieldMappings": {
      "select": {
        "label": "label"
      }
    },
    "blockSchema": {
      "properties": {
        "label": {
          "title": "Label"
        },
        "description": {
          "title": "Description"
        },
        "value": {
          "title": "Value for field"
        }
      }
    }
  },
  "attachment": {
    "restricted": true,
    "fieldMappings": {
      "select": {
        "label": "label",
        "description": "description",
        "required": "required"
      }
    },
    "blockSchema": {
      "properties": {
        "label": {
          "title": "Label"
        },
        "description": {
          "title": "Description"
        },
        "required": {
          "title": "Required",
          "type": "boolean",
          "default": false
        }
      }
    }
  }
}
```

</block>

<block type="codeExample" slotId="json-data">

### JSON Block Data

```json
{
  "@type": "form",
  "title": "Contact Us",
  "description": "Fill out this form and we'll get back to you.",
  "default_to": "admin@example.com",
  "default_from": "noreply@example.com",
  "default_subject": "New contact form submission",
  "submit_label": "Send Message",
  "subblocks": [
    {
      "@id": "field-1",
      "field_id": "name",
      "field_type": "text",
      "label": "Your Name",
      "required": true
    },
    {
      "@id": "field-2",
      "field_id": "email",
      "field_type": "from",
      "label": "Email Address",
      "use_as_reply_to": true,
      "required": true
    },
    {
      "@id": "field-3",
      "field_id": "department",
      "field_type": "select",
      "label": "Department",
      "input_values": [
        "Sales",
        "Support",
        "General"
      ],
      "required": false
    },
    {
      "@id": "field-4",
      "field_id": "message",
      "field_type": "textarea",
      "label": "Message",
      "required": true
    }
  ]
}
```

</block>

<block type="codeExample" slotId="rendering">

### React

```{literalinclude} ../../../examples/examples/react/FormBlock.jsx
:language: jsx
```

### Vue

```{literalinclude} ../../../examples/examples/vue/FormBlock.vue
:language: vue
```

### Svelte

```{literalinclude} ../../../examples/examples/svelte/FormBlock.svelte
:language: svelte
```

### Astro

```{literalinclude} ../../../examples/examples/astro/FormBlock.astro
:language: astro
```

</block>

</fields>
