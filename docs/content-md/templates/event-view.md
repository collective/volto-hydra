---
"@type": Document
UID: tpl-ct-event-view
id: event-view
title: Event View
review_state: published
description: Layout template for Event content type pages
effective: 2025-01-01T00:00:00
blocks:
  - tpl-ev-title: title
  - tpl-ev-metadata: eventMetadata
  - tpl-ev-content: slate
---

:::title{uid="tpl-ev-title" fixed=true templateId="/templates/event-view" templateInstanceId="tpl-ev-def" slotId="title"}
:::

:::eventMetadata{uid="tpl-ev-metadata" fixed=true templateId="/templates/event-view" templateInstanceId="tpl-ev-def" slotId="event-metadata"}
:::

:::slate{uid="tpl-ev-content" templateId="/templates/event-view" templateInstanceId="tpl-ev-def" slotId="content"}
```field-json:value
[
 {
  "type": "p",
  "children": [
   {
    "text": ""
   }
  ]
 }
]
```
:::
