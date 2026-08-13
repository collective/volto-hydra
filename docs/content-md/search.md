---
"@type": Document
UID: 120c479717b248a8b28c3556ee63e054
id: search
title: Search
description: Search the site
allow_discussion: false
contributors: []
creators:
  - admin
effective: null
exclude_from_nav: true
expires: null
language: ""
review_state: published
rights: null
subjects: []
table_of_contents: false
blocks:
  - search-block: search
---

:::search{uid="search-block" headline="Search" variation="facetsLeftSide" showSearchInput=true showSortOn=true showTotalResults=true}
```fields
{
 "facets": [
  {
   "@id": "facet-type",
   "title": "Content Type",
   "field": "portal_type",
   "type": "checkboxFacet",
   "multiple": true
  }
 ],
 "sortOnOptions": [
  "effective",
  "sortable_title"
 ]
}
```
::::listing[blocks_layout]
:::listing{uid="results-listing" variation="default"}
```fields
{
 "fieldMapping": {
  "@id": {
   "field": "href",
   "type": "link"
  },
  "title": "title",
  "description": "description",
  "image": "preview_image"
 },
 "querystring": {
  "query": [
   {
    "i": "path",
    "o": "plone.app.querystring.operation.string.absolutePath",
    "v": "/"
   }
  ],
  "sort_on": "effective",
  "sort_order": "descending"
 }
}
```
:::
::::
:::
