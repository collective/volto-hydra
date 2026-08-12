---
title: Examples
description: "Block reference: schema, JSON, and rendered examples for every
  block type Volto Hydra ships."
review_state: published
exclude_from_nav: false
subjects: []
language: "##DEFAULT##"
rights: ""
effective: null
expires: null
id: examples
UID: docs-examples-folder-001
"@type": Document
blocks:
  - title-1: title
  - examples-listing: listing
order:
  - accordion
  - button
  - columns
  - contextNavigation
  - form
  - grid
  - heading
  - hero
  - highlight
  - image-block
  - introduction
  - listing
  - maps
  - relatedItemsListing
  - rssFeed
  - search
  - searchShortcuts
  - separator
  - slate
  - slider
  - table
  - teaser
  - toc
  - video
  - content-types
---

:::title{uid="title-1"}
:::

:::listing{uid="examples-listing" headlineTag="h2" variation="summary"}
```fields
{
 "styles": {},
 "querystring": {
  "query": [
   {
    "i": "path",
    "o": "plone.app.querystring.operation.string.relativePath",
    "v": "."
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
  "depth": 1
 },
 "fieldMapping": {
  "@id": "href",
  "title": "title",
  "description": "description",
  "image": "image"
 }
}
```
:::
