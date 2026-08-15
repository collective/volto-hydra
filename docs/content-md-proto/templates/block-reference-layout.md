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

<block type="separator" templateId="/templates/block-reference-layout" templateInstanceId="tpl-block-ref-def" slotId="sep" data='{"fixed":true,"readOnly":true,"styles":{"align":"full"}}' />

<block type="slate" templateId="/templates/block-reference-layout" templateInstanceId="tpl-block-ref-def" slotId="examples-heading" data='{"fixed":true,"readOnly":true,"value":[{"type":"h2","children":[{"text":"Developer Reference"}]}]}' />

<block type="slate" templateId="/templates/block-reference-layout" templateInstanceId="tpl-block-ref-def" slotId="schema-heading" data='{"fixed":true,"readOnly":true,"value":[{"type":"h3","children":[{"text":"Schema"}]}]}' />

<block type="slate" templateId="/templates/block-reference-layout" templateInstanceId="tpl-block-ref-def" slotId="schema-desc" data='{"fixed":true,"readOnly":true,"value":[{"type":"p","children":[{"text":"Pass this object inside the "},{"type":"code","children":[{"text":"blocks"}]},{"text":" option when calling "},{"type":"code","children":[{"text":"initBridge()"}]},{"text":" to register this block type with the admin UI. See "},{"type":"link","data":{"url":"/docs/live-preview"},"children":[{"text":"Custom Blocks"}]},{"text":" for the full setup guide."}]}]}' />

<block type="codeExample" templateId="/templates/block-reference-layout" templateInstanceId="tpl-block-ref-def" slotId="schema">

### Schema

```javascript

```

</block>

<block type="slate" templateId="/templates/block-reference-layout" templateInstanceId="tpl-block-ref-def" slotId="json-heading" data='{"fixed":true,"readOnly":true,"value":[{"type":"h3","children":[{"text":"JSON Block Data"}]}]}' />

<block type="slate" templateId="/templates/block-reference-layout" templateInstanceId="tpl-block-ref-def" slotId="json-desc" data='{"fixed":true,"readOnly":true,"value":[{"type":"p","children":[{"text":"Example JSON as stored in the Plone content API. This is the data structure your component will receive in the "},{"type":"code","children":[{"text":"block"}]},{"text":" prop."}]}]}' />

<block type="codeExample" templateId="/templates/block-reference-layout" templateInstanceId="tpl-block-ref-def" slotId="json-data">

### JSON Block Data

```json

```

</block>

<block type="slate" templateId="/templates/block-reference-layout" templateInstanceId="tpl-block-ref-def" slotId="rendering-heading" data='{"fixed":true,"readOnly":true,"value":[{"type":"h3","children":[{"text":"Rendering"}]}]}' />

<block type="slate" templateId="/templates/block-reference-layout" templateInstanceId="tpl-block-ref-def" slotId="rendering-desc" data='{"fixed":true,"readOnly":true,"value":[{"type":"p","children":[{"text":"How this block renders in your frontend. Add its handling to your renderer, or — for list-style blocks — register a fetcher and reuse your list rendering."}]}]}' />

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
