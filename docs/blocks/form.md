# Form Block

A multi-field form with configurable field types, validation, and email submission. Fields are stored as a typed `object_list` — each field has a `field_type` that maps to a sub-block schema.

This is a **custom** block — register it via `initBridge`.

## Schema

```js
form: {
  id: 'form',
  title: 'Form',
  icon: '<svg viewBox="0 0 24 24"><path d="M4 4h16v2H4zm0 4h10v2H4zm0 4h16v2H4zm0 4h10v2H4z"/></svg>',
  group: 'common',
  blockSchema: {
    fieldsets: [
      {
        id: 'default',
        title: 'Default',
        fields: [
          'title', 'description', 'subblocks',
          'default_to', 'default_from', 'default_subject',
          'submit_label',
        ],
      },
    ],
    properties: {
      title:           { title: 'Title', type: 'string' },
      description:     { title: 'Description', type: 'textarea' },
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
      default_to:      { title: 'Recipients', type: 'string' },
      default_from:    { title: 'Default sender', type: 'string' },
      default_subject: { title: 'Mail subject', type: 'string' },
      submit_label:    { title: 'Submit button label', type: 'string' },
    },
    required: ['default_to', 'default_from', 'default_subject'],
  },
}
```

### Form Field Sub-Blocks

Each field type is a restricted block. Here are the most common:

**`text`** — Single line input:
```js
{
  blockSchema: {
    properties: {
      label:       { title: 'Label', type: 'string' },
      description: { title: 'Description', type: 'string' },
      required:    { title: 'Required', type: 'boolean', default: false },
    },
  },
}
```

**`select`** — Dropdown with choices:
```js
{
  blockSchema: {
    properties: {
      label:        { title: 'Label', type: 'string' },
      description:  { title: 'Description', type: 'string' },
      input_values: { title: 'Possible values', type: 'array', creatable: true },
      required:     { title: 'Required', type: 'boolean', default: false },
    },
  },
}
```

**`from`** — Email field:
```js
{
  blockSchema: {
    properties: {
      label:            { title: 'Label', type: 'string' },
      description:      { title: 'Description', type: 'string' },
      use_as_reply_to:  { title: "Use as 'reply to'", type: 'boolean', default: false },
      use_as_bcc:       { title: 'Send a copy to this address', type: 'boolean', default: false },
      required:         { title: 'Required', type: 'boolean', default: false },
    },
  },
}
```

All field types: `text`, `textarea`, `number`, `select`, `single_choice`, `multiple_choice`, `checkbox`, `date`, `from` (email), `static_text`, `hidden`, `attachment`.

## JSON Block Data

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
      "input_values": ["Sales", "Support", "General"],
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

## Rendering

### React

<!-- file: examples/react/FormBlock.jsx -->
```jsx
function FormBlock({ block }) {
  const fields = block.subblocks || [];

  return (
    <form data-block-uid={block['@uid']} className="form-block" onSubmit={e => e.preventDefault()}>
      <h3>{block.title}</h3>
      {block.description && <p>{block.description}</p>}

      {fields.map(field => (
        <FormField key={field['@id']} field={field} />
      ))}

      <button type="submit">{block.submit_label || 'Submit'}</button>
    </form>
  );
}

function FormField({ field }) {
  const label = field.label || '';
  const required = field.required || false;

  switch (field.field_type) {
    case 'text':
      return <label>{label} <input type="text" required={required} /></label>;
    case 'textarea':
      return <label>{label} <textarea required={required} /></label>;
    case 'number':
      return <label>{label} <input type="number" required={required} /></label>;
    case 'from':
      return <label>{label} <input type="email" required={required} /></label>;
    case 'date':
      return <label>{label} <input type="date" required={required} /></label>;
    case 'checkbox':
      return <label><input type="checkbox" required={required} /> {label}</label>;
    case 'select':
      return (
        <label>{label}
          <select required={required}>
            <option value="">Choose...</option>
            {(field.input_values || []).map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </label>
      );
    case 'single_choice':
      return (
        <fieldset>
          <legend>{label}</legend>
          {(field.input_values || []).map(v => (
            <label key={v}><input type="radio" name={field.field_id} value={v} /> {v}</label>
          ))}
        </fieldset>
      );
    case 'multiple_choice':
      return (
        <fieldset>
          <legend>{label}</legend>
          {(field.input_values || []).map(v => (
            <label key={v}><input type="checkbox" value={v} /> {v}</label>
          ))}
        </fieldset>
      );
    case 'static_text':
      return <p>{label}</p>;
    case 'hidden':
      return <input type="hidden" name={field.field_id} value={field.value || ''} />;
    case 'attachment':
      return <label>{label} <input type="file" required={required} /></label>;
    default:
      return <label>{label} <input type="text" /></label>;
  }
}
```

### Vue

<!-- file: examples/vue/FormBlock.vue -->
```vue
<template>
  <form :data-block-uid="block['@uid']" class="form-block" @submit.prevent>
    <h3>{{ block.title }}</h3>
    <p v-if="block.description">{{ block.description }}</p>

    <div v-for="field in block.subblocks || []" :key="field['@id']" class="form-field">
      <template v-if="field.field_type === 'text'">
        <label>{{ field.label }} <input type="text" :required="field.required" /></label>
      </template>
      <template v-else-if="field.field_type === 'textarea'">
        <label>{{ field.label }} <textarea :required="field.required" /></label>
      </template>
      <template v-else-if="field.field_type === 'from'">
        <label>{{ field.label }} <input type="email" :required="field.required" /></label>
      </template>
      <template v-else-if="field.field_type === 'select'">
        <label>{{ field.label }}
          <select :required="field.required">
            <option value="">Choose...</option>
            <option v-for="v in field.input_values || []" :key="v" :value="v">{{ v }}</option>
          </select>
        </label>
      </template>
      <template v-else-if="field.field_type === 'single_choice'">
        <fieldset>
          <legend>{{ field.label }}</legend>
          <label v-for="v in field.input_values || []" :key="v">
            <input type="radio" :name="field.field_id" :value="v" /> {{ v }}
          </label>
        </fieldset>
      </template>
      <template v-else-if="field.field_type === 'checkbox'">
        <label><input type="checkbox" :required="field.required" /> {{ field.label }}</label>
      </template>
      <template v-else-if="field.field_type === 'static_text'">
        <p>{{ field.label }}</p>
      </template>
      <template v-else-if="field.field_type === 'hidden'">
        <input type="hidden" :name="field.field_id" :value="field.value" />
      </template>
      <template v-else>
        <label>{{ field.label }} <input type="text" :required="field.required" /></label>
      </template>
    </div>

    <button type="submit">{{ block.submit_label || 'Submit' }}</button>
  </form>
</template>

<script setup>
defineProps({ block: Object });
</script>
```

### Svelte

<!-- file: examples/svelte/FormBlock.svelte -->
```svelte
<script>
  export let block;
</script>

<form data-block-uid={block['@uid']} class="form-block" on:submit|preventDefault>
  <h3>{block.title}</h3>
  {#if block.description}
    <p>{block.description}</p>
  {/if}

  {#each block.subblocks || [] as field (field['@id'])}
    <div class="form-field">
      {#if field.field_type === 'text'}
        <label>{field.label} <input type="text" required={field.required} /></label>
      {:else if field.field_type === 'textarea'}
        <label>{field.label} <textarea required={field.required} /></label>
      {:else if field.field_type === 'number'}
        <label>{field.label} <input type="number" required={field.required} /></label>
      {:else if field.field_type === 'from'}
        <label>{field.label} <input type="email" required={field.required} /></label>
      {:else if field.field_type === 'date'}
        <label>{field.label} <input type="date" required={field.required} /></label>
      {:else if field.field_type === 'checkbox'}
        <label><input type="checkbox" required={field.required} /> {field.label}</label>
      {:else if field.field_type === 'select'}
        <label>{field.label}
          <select required={field.required}>
            <option value="">Choose...</option>
            {#each field.input_values || [] as v}
              <option value={v}>{v}</option>
            {/each}
          </select>
        </label>
      {:else if field.field_type === 'single_choice'}
        <fieldset>
          <legend>{field.label}</legend>
          {#each field.input_values || [] as v}
            <label><input type="radio" name={field.field_id} value={v} /> {v}</label>
          {/each}
        </fieldset>
      {:else if field.field_type === 'multiple_choice'}
        <fieldset>
          <legend>{field.label}</legend>
          {#each field.input_values || [] as v}
            <label><input type="checkbox" value={v} /> {v}</label>
          {/each}
        </fieldset>
      {:else if field.field_type === 'static_text'}
        <p>{field.label}</p>
      {:else if field.field_type === 'hidden'}
        <input type="hidden" name={field.field_id} value={field.value || ''} />
      {:else if field.field_type === 'attachment'}
        <label>{field.label} <input type="file" required={field.required} /></label>
      {:else}
        <label>{field.label} <input type="text" /></label>
      {/if}
    </div>
  {/each}

  <button type="submit">{block.submit_label || 'Submit'}</button>
</form>
```
