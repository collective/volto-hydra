---
title: News Item View
description: Layout template for News Item content type pages
review_state: published
effective: 2025-01-01T00:00:00
id: newsitem-view
UID: tpl-ct-newsitem-view
"@type": Document
blocks:
  - tpl-ni-date: dateField
  - tpl-ni-title: title
  - tpl-ni-leadimage: leadimage
  - tpl-ni-content: slate
---

:::dateField{uid="tpl-ni-date" dateField="effective" showTime=false fixed=true templateId="/templates/newsitem-view" templateInstanceId="tpl-ni-def" slotId="date"}
:::

:::title{uid="tpl-ni-title" fixed=true templateId="/templates/newsitem-view" templateInstanceId="tpl-ni-def" slotId="title"}
:::

:::leadimage{uid="tpl-ni-leadimage" fixed=true templateId="/templates/newsitem-view" templateInstanceId="tpl-ni-def" slotId="lead-image"}
:::

:::slate{uid="tpl-ni-content" templateId="/templates/newsitem-view" templateInstanceId="tpl-ni-def" slotId="content"}
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
