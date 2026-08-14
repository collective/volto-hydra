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
  - { uid: tpl-json-heading, type: slate }
  - { uid: tpl-json-desc, type: slate }
  - { uid: tpl-json, type: codeExample }
  - { uid: tpl-rendering-heading, type: slate }
  - { uid: tpl-rendering-desc, type: slate }
  - { uid: tpl-rendering, type: codeExample }

---

<block type="separator" uid="tpl-sep" templateId="/templates/block-reference-layout" templateInstanceId="tpl-block-ref-def" slotId="sep" data='{"fixed":true,"readOnly":true,"styles":{"align":"full"}}' />

<block type="slate" uid="tpl-examples-heading" templateId="/templates/block-reference-layout" templateInstanceId="tpl-block-ref-def" slotId="examples-heading" data='{"fixed":true,"readOnly":true,"value":[{"type":"h2","children":[{"text":"Developer Reference"}]}]}' />

<block type="slate" uid="tpl-schema-heading" templateId="/templates/block-reference-layout" templateInstanceId="tpl-block-ref-def" slotId="schema-heading" data='{"fixed":true,"readOnly":true,"value":[{"type":"h3","children":[{"text":"Schema"}]}]}' />

<block type="slate" uid="tpl-schema-desc" templateId="/templates/block-reference-layout" templateInstanceId="tpl-block-ref-def" slotId="schema-desc" data='{"fixed":true,"readOnly":true,"value":[{"type":"p","children":[{"text":"Pass this object inside the "},{"type":"code","children":[{"text":"blocks"}]},{"text":" option when calling "},{"type":"code","children":[{"text":"initBridge()"}]},{"text":" to register this block type with the admin UI. See "},{"type":"link","data":{"url":"/docs/live-preview"},"children":[{"text":"Custom Blocks"}]},{"text":" for the full setup guide."}]}]}' />

<block type="codeExample" uid="tpl-schema" templateId="/templates/block-reference-layout" templateInstanceId="tpl-block-ref-def" slotId="schema" data='{"tabs":[{"@id":"tpl-schema-javascript-000000","label":"Schema","language":"javascript","code":""}]}' />

<block type="slate" uid="tpl-json-heading" templateId="/templates/block-reference-layout" templateInstanceId="tpl-block-ref-def" slotId="json-heading" data='{"fixed":true,"readOnly":true,"value":[{"type":"h3","children":[{"text":"JSON Block Data"}]}]}' />

<block type="slate" uid="tpl-json-desc" templateId="/templates/block-reference-layout" templateInstanceId="tpl-block-ref-def" slotId="json-desc" data='{"fixed":true,"readOnly":true,"value":[{"type":"p","children":[{"text":"Example JSON as stored in the Plone content API. This is the data structure your component will receive in the "},{"type":"code","children":[{"text":"block"}]},{"text":" prop."}]}]}' />

<block type="codeExample" uid="tpl-json" templateId="/templates/block-reference-layout" templateInstanceId="tpl-block-ref-def" slotId="json-data" data='{"tabs":[{"@id":"tpl-json-json-000000","label":"JSON Block Data","language":"json","code":""}]}' />

<block type="slate" uid="tpl-rendering-heading" templateId="/templates/block-reference-layout" templateInstanceId="tpl-block-ref-def" slotId="rendering-heading" data='{"fixed":true,"readOnly":true,"value":[{"type":"h3","children":[{"text":"Rendering"}]}]}' />

<block type="slate" uid="tpl-rendering-desc" templateId="/templates/block-reference-layout" templateInstanceId="tpl-block-ref-def" slotId="rendering-desc" data='{"fixed":true,"readOnly":true,"value":[{"type":"p","children":[{"text":"How this block renders in your frontend. Add its handling to your renderer, or — for list-style blocks — register a fetcher and reuse your list rendering."}]}]}' />

<block type="codeExample" uid="tpl-rendering" templateId="/templates/block-reference-layout" templateInstanceId="tpl-block-ref-def" slotId="rendering" data='{"tabs":[{"@id":"tpl-rendering-jsx-000000","label":"React","language":"jsx","code":""},{"@id":"tpl-rendering-vue-000000","label":"Vue","language":"vue","code":""},{"@id":"tpl-rendering-svelte-000000","label":"Svelte","language":"svelte","code":""}]}' />
