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
assignments:
  - { uid: 00e8d49b-5b99-4d2f-83b3-7d69bc80b893, type: title }
  - { uid: ref-form-description, type: slate }
  - { uid: editor-screenshot, type: image }
  - { uid: 3687103d-0766-4d5e-8aae-fc7e65c457a6, type: form }
  - { uid: eb25b89c-d64a-4566-8e6e-71fd0f371964, type: slate }
  - { uid: ref-form-schema, type: codeExample }
  - { id: ref-form-schema-javascript-2285e7 }
  - { uid: ref-form-json-data, type: codeExample }
  - { id: ref-form-json-data-json-6e9c29 }
  - { uid: ref-form-rendering, type: codeExample }
  - { id: ref-form-rendering-jsx-29590c }
  - { id: ref-form-rendering-vue-3f1bde }
  - { id: ref-form-rendering-svelte-f8f39b }
prototypes: |
  <block type="title" _="${h1}" />
  <block type="slate" value="${p|h*|ul|ol|blockquote/slate}" />
  <block type="slate" value="${*/slate}" />
  <block type="image" description="${p/text}" url="${img/src}" alt="${img/alt}" align="center" size="l" image_field="image" title="Image" />
  <block type="image" url="${img/src}" alt="${img/alt}" align="center" size="l" image_field="image" title="Image" />
  <block type="codeExample">
    <region name="tabs" widget="object_list">
      <block type="tab" label="${h3/text}" language="${pre/lang}" code="${pre/text}" />
    </region>
  </block>
---

# 

A multi-field form with configurable field types, validation, and email submission. Fields are stored as a typed object\_list — each field has a field\_type that maps to a sub-block schema.

<block type="image" url="/docs/images/form-edit" alt="The form example block being edited in Volto Hydra" align="center" size="l" />

<block type="form" default_from="noreply@plone.org" title="A simple form" data='{"lastChange":1710238630312,"remove_data_after_days":-1,"send_email":true,"show_cancel":false,"store":true,"subblocks":[{"field_id":"1709833577467","field_type":"text","id":"1709833577467","label":"Name","required":true},{"field_id":"1709833592544","field_type":"from","id":"1709833592544","label":"Email","required":false,"use_as_bcc":false,"use_as_reply_to":false},{"field_id":"1709833604677","field_type":"textarea","id":"1709833604677","label":"Message","required":false},{"field_id":"1709833616406","field_type":"multiple_choice","id":"1709833616406","input_values":["Red","Green","Blue"],"label":"Select field","required":false}]}' />

<block type="slate" data='{"styles":{},"value":[{"children":[{"text":""}],"type":"p"}]}' />

<block type="codeExample" templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-form" slotId="schema">

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

<block type="codeExample" templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-form" slotId="json-data">

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

<block type="codeExample" templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-form" slotId="rendering">

### React

```jsx
function FormBlock({ block }) {
  const fields = expandTemplatesSync(block.subblocks || [], { idField: 'field_id' });

  return (
    <form data-block-uid={block['@uid']} className="form-block" onSubmit={e => e.preventDefault()}>
      <h3 data-edit-text="title">{block.title}</h3>
      {block.description && <p data-edit-text="description">{block.description}</p>}

      {fields.map(field => (
        <div key={field.field_id} data-block-uid={field.field_id} className="form-field">
          <FormField field={field} />
        </div>
      ))}

      <button type="submit" data-edit-text="submit_label">{block.submit_label || 'Submit'}</button>
    </form>
  );
}

function FormField({ field }) {
  const label = field.label || '';
  const required = field.required || false;

  switch (field.field_type) {
    case 'text':
      return <label><span data-edit-text="label">{label}</span> <input type="text" required={required} /></label>;
    case 'textarea':
      return <label><span data-edit-text="label">{label}</span> <textarea required={required} /></label>;
    case 'number':
      return <label><span data-edit-text="label">{label}</span> <input type="number" required={required} /></label>;
    case 'from':
      return <label><span data-edit-text="label">{label}</span> <input type="email" required={required} /></label>;
    case 'date':
      return <label><span data-edit-text="label">{label}</span> <input type="date" required={required} /></label>;
    case 'checkbox':
      return <label><input type="checkbox" required={required} /> <span data-edit-text="label">{label}</span></label>;
    case 'select':
      return (
        <label><span data-edit-text="label">{label}</span>
          <select required={required}>
            <option value="">Choose...</option>
            {(field.input_values || []).map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </label>
      );
    case 'single_choice':
      return (
        <fieldset>
          <legend data-edit-text="label">{label}</legend>
          {(field.input_values || []).map(v => (
            <label key={v}><input type="radio" name={field.field_id} value={v} /> {v}</label>
          ))}
        </fieldset>
      );
    case 'multiple_choice':
      return (
        <fieldset>
          <legend data-edit-text="label">{label}</legend>
          {(field.input_values || []).map(v => (
            <label key={v}><input type="checkbox" value={v} /> {v}</label>
          ))}
        </fieldset>
      );
    case 'static_text':
      return <p data-edit-text="label">{label}</p>;
    case 'hidden':
      return <input type="hidden" name={field.field_id} value={field.value || ''} />;
    case 'attachment':
      return <label><span data-edit-text="label">{label}</span> <input type="file" required={required} /></label>;
    default:
      return <label><span data-edit-text="label">{label}</span> <input type="text" /></label>;
  }
}
```

### Vue

```vue
<template>
  <form :data-block-uid="block['@uid']" class="form-block" @submit.prevent>
    <h3 data-edit-text="title">{{ block.title }}</h3>
    <p v-if="block.description" data-edit-text="description">{{ block.description }}</p>

    <div v-for="field in fields" :key="field.field_id" class="form-field" :data-block-uid="field.field_id">
      <template v-if="field.field_type === 'text'">
        <label><span data-edit-text="label">{{ field.label }}</span> <input type="text" :required="field.required" /></label>
      </template>
      <template v-else-if="field.field_type === 'textarea'">
        <label><span data-edit-text="label">{{ field.label }}</span> <textarea :required="field.required" /></label>
      </template>
      <template v-else-if="field.field_type === 'from'">
        <label><span data-edit-text="label">{{ field.label }}</span> <input type="email" :required="field.required" /></label>
      </template>
      <template v-else-if="field.field_type === 'select'">
        <label><span data-edit-text="label">{{ field.label }}</span>
          <select :required="field.required">
            <option value="">Choose...</option>
            <option v-for="v in field.input_values || []" :key="v" :value="v">{{ v }}</option>
          </select>
        </label>
      </template>
      <template v-else-if="field.field_type === 'single_choice'">
        <fieldset>
          <legend data-edit-text="label">{{ field.label }}</legend>
          <label v-for="v in field.input_values || []" :key="v">
            <input type="radio" :name="field.field_id" :value="v" /> {{ v }}
          </label>
        </fieldset>
      </template>
      <template v-else-if="field.field_type === 'checkbox'">
        <label><input type="checkbox" :required="field.required" /> <span data-edit-text="label">{{ field.label }}</span></label>
      </template>
      <template v-else-if="field.field_type === 'static_text'">
        <p data-edit-text="label">{{ field.label }}</p>
      </template>
      <template v-else-if="field.field_type === 'hidden'">
        <input type="hidden" :name="field.field_id" :value="field.value" />
      </template>
      <template v-else>
        <label><span data-edit-text="label">{{ field.label }}</span> <input type="text" :required="field.required" /></label>
      </template>
    </div>

    <button type="submit" data-edit-text="submit_label">{{ block.submit_label || 'Submit' }}</button>
  </form>
</template>

<script setup>
import { computed } from 'vue';
const props = defineProps({ block: Object });
// Expand the subblocks object_list, passing its idField (field_id) so the merge stamps ids
// correctly. In edit mode this is a pass-through that sets each field's @uid from field_id.
const fields = computed(() => expandTemplatesSync(props.block.subblocks || [], { idField: 'field_id' }));
</script>
```

### Svelte

```svelte
<script>
  export let block;
  // Expand the subblocks object_list, passing its idField (field_id) so the merge stamps ids
  // correctly. Edit-mode pass-through sets each field's @uid from field_id.
  $: fields = expandTemplatesSync(block.subblocks || [], { idField: 'field_id' });
</script>

<form data-block-uid={block['@uid']} class="form-block" on:submit|preventDefault>
  <h3 data-edit-text="title">{block.title}</h3>
  {#if block.description}
    <p data-edit-text="description">{block.description}</p>
  {/if}

  {#each fields as field (field.field_id)}
    <div class="form-field" data-block-uid={field.field_id}>
      {#if field.field_type === 'text'}
        <label><span data-edit-text="label">{field.label}</span> <input type="text" required={field.required} /></label>
      {:else if field.field_type === 'textarea'}
        <label><span data-edit-text="label">{field.label}</span> <textarea required={field.required} /></label>
      {:else if field.field_type === 'number'}
        <label><span data-edit-text="label">{field.label}</span> <input type="number" required={field.required} /></label>
      {:else if field.field_type === 'from'}
        <label><span data-edit-text="label">{field.label}</span> <input type="email" required={field.required} /></label>
      {:else if field.field_type === 'date'}
        <label><span data-edit-text="label">{field.label}</span> <input type="date" required={field.required} /></label>
      {:else if field.field_type === 'checkbox'}
        <label><input type="checkbox" required={field.required} /> <span data-edit-text="label">{field.label}</span></label>
      {:else if field.field_type === 'select'}
        <label><span data-edit-text="label">{field.label}</span>
          <select required={field.required}>
            <option value="">Choose...</option>
            {#each field.input_values || [] as v}
              <option value={v}>{v}</option>
            {/each}
          </select>
        </label>
      {:else if field.field_type === 'single_choice'}
        <fieldset>
          <legend data-edit-text="label">{field.label}</legend>
          {#each field.input_values || [] as v}
            <label><input type="radio" name={field.field_id} value={v} /> {v}</label>
          {/each}
        </fieldset>
      {:else if field.field_type === 'multiple_choice'}
        <fieldset>
          <legend data-edit-text="label">{field.label}</legend>
          {#each field.input_values || [] as v}
            <label><input type="checkbox" value={v} /> {v}</label>
          {/each}
        </fieldset>
      {:else if field.field_type === 'static_text'}
        <p data-edit-text="label">{field.label}</p>
      {:else if field.field_type === 'hidden'}
        <input type="hidden" name={field.field_id} value={field.value || ''} />
      {:else if field.field_type === 'attachment'}
        <label><span data-edit-text="label">{field.label}</span> <input type="file" required={field.required} /></label>
      {:else}
        <label><span data-edit-text="label">{field.label}</span> <input type="text" /></label>
      {/if}
    </div>
  {/each}

  <button type="submit" data-edit-text="submit_label">{block.submit_label || 'Submit'}</button>
</form>
```

</block>
