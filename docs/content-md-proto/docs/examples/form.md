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
blocks-matched: |
  <block type="slate" value="${p,h*,ul,ol,blockquote,strong,em/slate}" />
  <block type="title" _="${h1}" />
  <block type="image" description="${p?/text}" url="${img/src}" alt="${img?/alt}" title="${img?/title}" align="center" size="l" />
  <block type="image" url="${img/src}" alt="${img?/alt}" title="${img?/title}" align="center" size="l" />
  <block type="codeExample">
    <region name="tabs" widget="object_list">
      <block type="tab" label="${h3/text}" language="${pre/lang}" code="${pre/text}" />
    </region>
  </block>
---

# Form

A multi-field form with configurable field types, validation, and email submission. Fields are stored as a typed object\_list — each field has a field\_type that maps to a sub-block schema.

<block type="image">

![The form example block being edited in Volto Hydra](/docs/images/form-edit)

</block>

<block type="form" default_from="noreply@plone.org" title="A simple form" default_to="admin@example.com" default_subject="New form submission" captcha="honeypot" data-json='{"lastChange":1710238630312,"remove_data_after_days":-1,"send_email":true,"show_cancel":false,"store":true,"subblocks":[{"field_id":"1709833577467","field_type":"text","id":"1709833577467","label":"Name","required":true},{"field_id":"1709833592544","field_type":"from","id":"1709833592544","label":"Email","required":false,"use_as_bcc":false,"use_as_reply_to":false},{"field_id":"1709833604677","field_type":"textarea","id":"1709833604677","label":"Message","required":false},{"field_id":"1709833616406","field_type":"multiple_choice","id":"1709833616406","input_values":["Red","Green","Blue"],"label":"Select field","required":false}]}' />

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
        },
        "show_when_field": {
          "title": "Only show when",
          "description": "An earlier question in this form. Leave empty to always show this one.",
          "type": "string",
          "widget": "blockPicker",
          "scope": "subblocks",
          "direction": "before",
          "valueField": "field_id",
          "labelField": "label",
          "emptyLabel": "— always show —"
        },
        "show_when_is": {
          "title": "…answers",
          "type": "string"
        }
      }
    },
    "schemaEnhancer": {
      "fieldRules": {
        "show_when_is": {
          "when": {
            "show_when_field": {
              "isNotSet": true
            }
          },
          "else": false
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
        },
        "show_when_field": {
          "title": "Only show when",
          "description": "An earlier question in this form. Leave empty to always show this one.",
          "type": "string",
          "widget": "blockPicker",
          "scope": "subblocks",
          "direction": "before",
          "valueField": "field_id",
          "labelField": "label",
          "emptyLabel": "— always show —"
        },
        "show_when_is": {
          "title": "…answers",
          "type": "string"
        }
      }
    },
    "schemaEnhancer": {
      "fieldRules": {
        "show_when_is": {
          "when": {
            "show_when_field": {
              "isNotSet": true
            }
          },
          "else": false
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
        },
        "show_when_field": {
          "title": "Only show when",
          "description": "An earlier question in this form. Leave empty to always show this one.",
          "type": "string",
          "widget": "blockPicker",
          "scope": "subblocks",
          "direction": "before",
          "valueField": "field_id",
          "labelField": "label",
          "emptyLabel": "— always show —"
        },
        "show_when_is": {
          "title": "…answers",
          "type": "string"
        }
      }
    },
    "schemaEnhancer": {
      "fieldRules": {
        "show_when_is": {
          "when": {
            "show_when_field": {
              "isNotSet": true
            }
          },
          "else": false
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
      },
      "select": {}
    },
    "blockSchema": {
      "properties": {
        "label": {
          "title": "Label"
        },
        "description": {
          "title": "Description"
        },
        "options_from": {
          "title": "Options from",
          "description": "A vocabulary this site keeps. Leave empty to write the options out below.",
          "type": "string",
          "widget": "vocabularySelect"
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
        },
        "show_when_field": {
          "title": "Only show when",
          "description": "An earlier question in this form. Leave empty to always show this one.",
          "type": "string",
          "widget": "blockPicker",
          "scope": "subblocks",
          "direction": "before",
          "valueField": "field_id",
          "labelField": "label",
          "emptyLabel": "— always show —"
        },
        "show_when_is": {
          "title": "…answers",
          "type": "string"
        }
      }
    },
    "schemaEnhancer": {
      "fieldRules": {
        "input_values": {
          "when": {
            "options_from": {
              "isNotSet": true
            }
          },
          "else": false
        },
        "show_when_is": {
          "when": {
            "show_when_field": {
              "isNotSet": true
            }
          },
          "else": false
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
        },
        "show_when_field": {
          "title": "Only show when",
          "description": "An earlier question in this form. Leave empty to always show this one.",
          "type": "string",
          "widget": "blockPicker",
          "scope": "subblocks",
          "direction": "before",
          "valueField": "field_id",
          "labelField": "label",
          "emptyLabel": "— always show —"
        },
        "show_when_is": {
          "title": "…answers",
          "type": "string"
        }
      }
    },
    "schemaEnhancer": {
      "fieldRules": {
        "show_when_is": {
          "when": {
            "show_when_field": {
              "isNotSet": true
            }
          },
          "else": false
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
        },
        "show_when_field": {
          "title": "Only show when",
          "description": "An earlier question in this form. Leave empty to always show this one.",
          "type": "string",
          "widget": "blockPicker",
          "scope": "subblocks",
          "direction": "before",
          "valueField": "field_id",
          "labelField": "label",
          "emptyLabel": "— always show —"
        },
        "show_when_is": {
          "title": "…answers",
          "type": "string"
        }
      }
    },
    "schemaEnhancer": {
      "fieldRules": {
        "show_when_is": {
          "when": {
            "show_when_field": {
              "isNotSet": true
            }
          },
          "else": false
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
        },
        "show_when_field": {
          "title": "Only show when",
          "description": "An earlier question in this form. Leave empty to always show this one.",
          "type": "string",
          "widget": "blockPicker",
          "scope": "subblocks",
          "direction": "before",
          "valueField": "field_id",
          "labelField": "label",
          "emptyLabel": "— always show —"
        },
        "show_when_is": {
          "title": "…answers",
          "type": "string"
        }
      }
    },
    "schemaEnhancer": {
      "fieldRules": {
        "show_when_is": {
          "when": {
            "show_when_field": {
              "isNotSet": true
            }
          },
          "else": false
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
        },
        "show_when_field": {
          "title": "Only show when",
          "description": "An earlier question in this form. Leave empty to always show this one.",
          "type": "string",
          "widget": "blockPicker",
          "scope": "subblocks",
          "direction": "before",
          "valueField": "field_id",
          "labelField": "label",
          "emptyLabel": "— always show —"
        },
        "show_when_is": {
          "title": "…answers",
          "type": "string"
        }
      }
    },
    "schemaEnhancer": {
      "fieldRules": {
        "show_when_is": {
          "when": {
            "show_when_field": {
              "isNotSet": true
            }
          },
          "else": false
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
        },
        "show_when_field": {
          "title": "Only show when",
          "description": "An earlier question in this form. Leave empty to always show this one.",
          "type": "string",
          "widget": "blockPicker",
          "scope": "subblocks",
          "direction": "before",
          "valueField": "field_id",
          "labelField": "label",
          "emptyLabel": "— always show —"
        },
        "show_when_is": {
          "title": "…answers",
          "type": "string"
        }
      }
    },
    "schemaEnhancer": {
      "fieldRules": {
        "show_when_is": {
          "when": {
            "show_when_field": {
              "isNotSet": true
            }
          },
          "else": false
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
        },
        "show_when_field": {
          "title": "Only show when",
          "description": "An earlier question in this form. Leave empty to always show this one.",
          "type": "string",
          "widget": "blockPicker",
          "scope": "subblocks",
          "direction": "before",
          "valueField": "field_id",
          "labelField": "label",
          "emptyLabel": "— always show —"
        },
        "show_when_is": {
          "title": "…answers",
          "type": "string"
        }
      }
    },
    "schemaEnhancer": {
      "fieldRules": {
        "show_when_is": {
          "when": {
            "show_when_field": {
              "isNotSet": true
            }
          },
          "else": false
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
        },
        "show_when_field": {
          "title": "Only show when",
          "description": "An earlier question in this form. Leave empty to always show this one.",
          "type": "string",
          "widget": "blockPicker",
          "scope": "subblocks",
          "direction": "before",
          "valueField": "field_id",
          "labelField": "label",
          "emptyLabel": "— always show —"
        },
        "show_when_is": {
          "title": "…answers",
          "type": "string"
        }
      }
    },
    "schemaEnhancer": {
      "fieldRules": {
        "show_when_is": {
          "when": {
            "show_when_field": {
              "isNotSet": true
            }
          },
          "else": false
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
        },
        "show_when_field": {
          "title": "Only show when",
          "description": "An earlier question in this form. Leave empty to always show this one.",
          "type": "string",
          "widget": "blockPicker",
          "scope": "subblocks",
          "direction": "before",
          "valueField": "field_id",
          "labelField": "label",
          "emptyLabel": "— always show —"
        },
        "show_when_is": {
          "title": "…answers",
          "type": "string"
        }
      }
    },
    "schemaEnhancer": {
      "fieldRules": {
        "show_when_is": {
          "when": {
            "show_when_field": {
              "isNotSet": true
            }
          },
          "else": false
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
      "required": false,
      "options_from": "plone.app.vocabularies.Keywords"
    },
    {
      "@id": "field-4",
      "field_id": "message",
      "field_type": "textarea",
      "label": "Message",
      "required": true
    },
    {
      "@id": "field-5",
      "field_id": "order_number",
      "field_type": "text",
      "label": "Order number",
      "show_when_field": "department",
      "show_when_is": "Sales",
      "required": false
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

</block>

</fields>
