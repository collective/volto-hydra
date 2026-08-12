---
title: Context Navigation Layout
description: Forced layout for 3rd-level pages — injects a contextNavigation
  (auto-populated from sibling pages via listing+depth) above the page content.
review_state: published
id: context-navigation-layout
UID: context-navigation-layout-uid
"@type": Document
blocks:
  - tpl-context-nav: contextNavigation
  - tpl-default-slot: slate
---

:::contextNavigation{uid="tpl-context-nav" fixed=true readOnly=true templateId="/templates/context-navigation-layout" templateInstanceId="context-navigation-layout-def-instance" slotId="context-navigation" ariaLabel="In this section"}
:::listing{uid="tpl-cnav-listing" variation="navItem" fixed=true readOnly=true templateId="/templates/context-navigation-layout" templateInstanceId="context-navigation-layout-def-instance" slotId="context-navigation-listing"}
```fields
{
 "fieldMapping": {
  "@id": {
   "field": "href",
   "type": "link"
  },
  "title": {
   "field": "label"
  }
 },
 "querystring": {
  "query": [
   {
    "i": "path",
    "o": "plone.app.querystring.operation.string.relativePath",
    "v": ".."
   },
   {
    "i": "portal_type",
    "o": "plone.app.querystring.operation.selection.none",
    "v": [
     "Image",
     "File"
    ]
   },
   {
    "i": "exclude_from_nav",
    "o": "plone.app.querystring.operation.boolean.isFalse",
    "v": ""
   }
  ],
  "sort_on": "getObjPositionInParent",
  "depth": 4
 }
}
```
:::
:::

:::slate{uid="tpl-default-slot" templateId="/templates/context-navigation-layout" templateInstanceId="context-navigation-layout-def-instance" slotId="default"}
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
