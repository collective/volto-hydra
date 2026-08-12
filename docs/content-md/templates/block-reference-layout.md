---
title: Block Reference Layout
description: Template for code examples at the bottom of block reference pages
review_state: published
effective: 2025-01-01T00:00:00
id: block-reference-layout
UID: tpl-block-reference-layout
"@type": Document
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

:::separator{uid="tpl-sep" fixed=true readOnly=true templateId="/templates/block-reference-layout" templateInstanceId="tpl-block-ref-def" slotId="sep"}
```fields
{
 "styles": {
  "align": "full"
 }
}
```
:::

:::slate{uid="tpl-examples-heading" fixed=true readOnly=true templateId="/templates/block-reference-layout" templateInstanceId="tpl-block-ref-def" slotId="examples-heading"}
## Developer Reference
:::

:::slate{uid="tpl-schema-heading" fixed=true readOnly=true templateId="/templates/block-reference-layout" templateInstanceId="tpl-block-ref-def" slotId="schema-heading"}
### Schema
:::

:::slate{uid="tpl-schema-desc" fixed=true readOnly=true templateId="/templates/block-reference-layout" templateInstanceId="tpl-block-ref-def" slotId="schema-desc"}
Pass this object inside the `blocks` option when calling `initBridge()` to register this block type with the admin UI. See [Custom Blocks](/docs/live-preview) for the full setup guide.
:::

:::codeExample{uid="tpl-schema" templateId="/templates/block-reference-layout" templateInstanceId="tpl-block-ref-def" slotId="schema" tabs="${1.../h3}" tabs.label="${1/text}" tabs.language="${2/lang}" tabs.code="${2/code}" tabs@ids=["tpl-schema-javascript-000000"]}
### Schema

```javascript

```
:::

:::slate{uid="tpl-json-heading" fixed=true readOnly=true templateId="/templates/block-reference-layout" templateInstanceId="tpl-block-ref-def" slotId="json-heading"}
### JSON Block Data
:::

:::slate{uid="tpl-json-desc" fixed=true readOnly=true templateId="/templates/block-reference-layout" templateInstanceId="tpl-block-ref-def" slotId="json-desc"}
Example JSON as stored in the Plone content API. This is the data structure your component will receive in the `block` prop.
:::

:::codeExample{uid="tpl-json" templateId="/templates/block-reference-layout" templateInstanceId="tpl-block-ref-def" slotId="json-data" tabs="${1.../h3}" tabs.label="${1/text}" tabs.language="${2/lang}" tabs.code="${2/code}" tabs@ids=["tpl-json-json-000000"]}
### JSON Block Data

```json

```
:::

:::slate{uid="tpl-rendering-heading" fixed=true readOnly=true templateId="/templates/block-reference-layout" templateInstanceId="tpl-block-ref-def" slotId="rendering-heading"}
### Rendering
:::

:::slate{uid="tpl-rendering-desc" fixed=true readOnly=true templateId="/templates/block-reference-layout" templateInstanceId="tpl-block-ref-def" slotId="rendering-desc"}
How this block renders in your frontend. Add its handling to your renderer, or — for list-style blocks — register a fetcher and reuse your list rendering.
:::

:::codeExample{uid="tpl-rendering" templateId="/templates/block-reference-layout" templateInstanceId="tpl-block-ref-def" slotId="rendering" tabs="${1.../h3}" tabs.label="${1/text}" tabs.language="${2/lang}" tabs.code="${2/code}" tabs@ids=["tpl-rendering-jsx-000000","tpl-rendering-vue-000000","tpl-rendering-svelte-000000"]}
### React

```jsx

```

### Vue

```vue

```

### Svelte

```svelte

```
:::
