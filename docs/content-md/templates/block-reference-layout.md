---
"@type": Document
UID: tpl-block-reference-layout
id: block-reference-layout
title: Block Reference Layout
review_state: published
description: Template for code examples at the bottom of block reference pages
effective: 2025-01-01T00:00:00
blocks:
  - tpl-sep: separator
  - tpl-examples-heading: slate
  - tpl-schema-heading: slate
  - tpl-schema-desc: slate
  - tpl-schema: codeExample
  - tpl-json-heading: slate
  - tpl-json-desc: slate
  - tpl-json: codeExample
  - tpl-rendering-heading: slate
  - tpl-rendering-desc: slate
  - tpl-rendering: codeExample
---

<block type="separator" uid="tpl-sep" templateId="/templates/block-reference-layout" templateInstanceId="tpl-block-ref-def" slotId="sep" data='{"fixed":true,"readOnly":true,"styles":{"align":"full"}}' />

<block type="slate" uid="tpl-examples-heading" templateId="/templates/block-reference-layout" templateInstanceId="tpl-block-ref-def" slotId="examples-heading" data='{"fixed":true,"readOnly":true}'>

## Developer Reference

</block>

<block type="slate" uid="tpl-schema-heading" templateId="/templates/block-reference-layout" templateInstanceId="tpl-block-ref-def" slotId="schema-heading" data='{"fixed":true,"readOnly":true}'>

### Schema

</block>

<block type="slate" uid="tpl-schema-desc" templateId="/templates/block-reference-layout" templateInstanceId="tpl-block-ref-def" slotId="schema-desc" data='{"fixed":true,"readOnly":true}'>

Pass this object inside the `blocks` option when calling `initBridge()` to register this block type with the admin UI. See [Custom Blocks](/docs/live-preview) for the full setup guide.

</block>

<block type="codeExample" uid="tpl-schema" templateId="/templates/block-reference-layout" templateInstanceId="tpl-block-ref-def" slotId="schema">

<region name="tabs" widget="object_list" repeat="h3" label="${1/text}" language="${2/lang}" code="${2/code}" data='{"items":[{"@id":"tpl-schema-javascript-000000"}]}'>

### Schema

```javascript

```

</region>

</block>

<block type="slate" uid="tpl-json-heading" templateId="/templates/block-reference-layout" templateInstanceId="tpl-block-ref-def" slotId="json-heading" data='{"fixed":true,"readOnly":true}'>

### JSON Block Data

</block>

<block type="slate" uid="tpl-json-desc" templateId="/templates/block-reference-layout" templateInstanceId="tpl-block-ref-def" slotId="json-desc" data='{"fixed":true,"readOnly":true}'>

Example JSON as stored in the Plone content API. This is the data structure your component will receive in the `block` prop.

</block>

<block type="codeExample" uid="tpl-json" templateId="/templates/block-reference-layout" templateInstanceId="tpl-block-ref-def" slotId="json-data">

<region name="tabs" widget="object_list" repeat="h3" label="${1/text}" language="${2/lang}" code="${2/code}" data='{"items":[{"@id":"tpl-json-json-000000"}]}'>

### JSON Block Data

```json

```

</region>

</block>

<block type="slate" uid="tpl-rendering-heading" templateId="/templates/block-reference-layout" templateInstanceId="tpl-block-ref-def" slotId="rendering-heading" data='{"fixed":true,"readOnly":true}'>

### Rendering

</block>

<block type="slate" uid="tpl-rendering-desc" templateId="/templates/block-reference-layout" templateInstanceId="tpl-block-ref-def" slotId="rendering-desc" data='{"fixed":true,"readOnly":true}'>

How this block renders in your frontend. Add its handling to your renderer, or — for list-style blocks — register a fetcher and reuse your list rendering.

</block>

<block type="codeExample" uid="tpl-rendering" templateId="/templates/block-reference-layout" templateInstanceId="tpl-block-ref-def" slotId="rendering">

<region name="tabs" widget="object_list" repeat="h3" label="${1/text}" language="${2/lang}" code="${2/code}" data='{"items":[{"@id":"tpl-rendering-jsx-000000"},{"@id":"tpl-rendering-vue-000000"},{"@id":"tpl-rendering-svelte-000000"}]}'>

### React

```jsx

```

### Vue

```vue

```

### Svelte

```svelte

```

</region>

</block>
