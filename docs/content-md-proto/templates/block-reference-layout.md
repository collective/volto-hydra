---
"@type": Document
UID: tpl-block-reference-layout
id: block-reference-layout
title: Block Reference Layout
review_state: published
description: Template for code examples at the bottom of block reference pages
effective: 2025-01-01T00:00:00
assignments:
  - { uid: tpl-sep, type: separator }
  - { uid: tpl-examples-heading, type: slate }
  - { uid: tpl-schema-heading, type: slate }
  - { uid: tpl-schema-desc, type: slate }
  - { uid: tpl-schema, type: codeExample }
  - { id: tpl-schema-javascript-000000 }
  - { uid: tpl-json-heading, type: slate }
  - { uid: tpl-json-desc, type: slate }
  - { uid: tpl-json, type: codeExample }
  - { id: tpl-json-json-000000 }
  - { uid: tpl-rendering-heading, type: slate }
  - { uid: tpl-rendering-desc, type: slate }
  - { uid: tpl-rendering, type: codeExample }
  - { id: tpl-rendering-jsx-000000 }
  - { id: tpl-rendering-vue-000000 }
  - { id: tpl-rendering-svelte-000000 }
prototypes: |
  <block type="slate" value="${p|h*|ul|ol|blockquote/slate}" />
  <block type="separator" _="${hr}" />
  <block type="codeExample">
    <region name="tabs" widget="object_list">
      <block type="tab" label="${h3/text}" language="${pre/lang}" code="${pre/text}" />
    </region>
  </block>
---

<block type="separator">

---

<fields templateId="/templates/block-reference-layout" templateInstanceId="tpl-block-ref-def" slotId="sep" data='{"fixed":true,"readOnly":true,"styles":{"align":"full"}}' />

</block>

<block type="slate">

## Developer Reference

<fields templateId="/templates/block-reference-layout" templateInstanceId="tpl-block-ref-def" slotId="examples-heading" data='{"fixed":true,"readOnly":true}' />

</block>

<block type="slate">

### Schema

<fields templateId="/templates/block-reference-layout" templateInstanceId="tpl-block-ref-def" slotId="schema-heading" data='{"fixed":true,"readOnly":true}' />

</block>

<block type="slate">

Pass this object inside the `blocks` option when calling `initBridge()` to register this block type with the admin UI. See [Custom Blocks](/docs/live-preview) for the full setup guide.

<fields templateId="/templates/block-reference-layout" templateInstanceId="tpl-block-ref-def" slotId="schema-desc" data='{"fixed":true,"readOnly":true}' />

</block>

<block type="codeExample" templateId="/templates/block-reference-layout" templateInstanceId="tpl-block-ref-def" slotId="schema">

### Schema

```javascript

```

</block>

<block type="slate">

### JSON Block Data

<fields templateId="/templates/block-reference-layout" templateInstanceId="tpl-block-ref-def" slotId="json-heading" data='{"fixed":true,"readOnly":true}' />

</block>

<block type="slate">

Example JSON as stored in the Plone content API. This is the data structure your component will receive in the `block` prop.

<fields templateId="/templates/block-reference-layout" templateInstanceId="tpl-block-ref-def" slotId="json-desc" data='{"fixed":true,"readOnly":true}' />

</block>

<block type="codeExample" templateId="/templates/block-reference-layout" templateInstanceId="tpl-block-ref-def" slotId="json-data">

### JSON Block Data

```json

```

</block>

<block type="slate">

### Rendering

<fields templateId="/templates/block-reference-layout" templateInstanceId="tpl-block-ref-def" slotId="rendering-heading" data='{"fixed":true,"readOnly":true}' />

</block>

<block type="slate">

How this block renders in your frontend. Add its handling to your renderer, or — for list-style blocks — register a fetcher and reuse your list rendering.

<fields templateId="/templates/block-reference-layout" templateInstanceId="tpl-block-ref-def" slotId="rendering-desc" data='{"fixed":true,"readOnly":true}' />

</block>

<block type="codeExample" templateId="/templates/block-reference-layout" templateInstanceId="tpl-block-ref-def" slotId="rendering">

### React

```jsx

```

### Vue

```vue

```

### Svelte

```svelte

```

</block>
