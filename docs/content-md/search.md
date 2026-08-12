---
title: Search
description: Search the site
review_state: published
exclude_from_nav: true
subjects: []
language: ""
rights: null
effective: null
expires: null
id: search
UID: 120c479717b248a8b28c3556ee63e054
"@type": Document
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
::::listing
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
