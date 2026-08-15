---
"@type": Document
UID: 3ac4a2c6c4034a1686bc0ee2d2072fd6
allow_discussion: false
contributors: []
creators:
  - admin
description: >-
  
  The Grid block allows adding multi-column blocks. A grid block can contain
  between one and four columns of different blocks. This is a grid block with
  multiple listing blocks.
effective: 2023-07-06T18:35:00
exclude_from_nav: false
expires: null
id: listing
language: "##DEFAULT##"
layout: document_view
preview_caption: null
preview_image:
  blob_path: docs/examples/grid/listing/preview_image/black-starry-night.jpg
  content-type: image/jpeg
  filename: black-starry-night.jpg
  height: 1708
  size: 693013
  width: 2400
review_state: published
rights: ""
subjects: []
title: Grid-Listing
assignments:
  - { uid: fc7973d9-34e3-484c-a20b-1af7eecd9879, type: title }
  - { uid: 5a361b25-3e19-4c06-866f-a2db6feed983, type: gridBlock }
prototypes: |
  <block type="title" _="${h1}" />
---

# 

<block type="gridBlock" data='{"blocks":{"0fae8b67-374c-4ca2-b3e0-86114e2f17e1":{"@type":"listing","headlineTag":"h2","querystring":{"limit":"7","query":[{"i":"path","o":"plone.app.querystring.operation.string.absolutePath","v":"/docs/examples/grid"}],"sort_on":"getId","sort_order":"descending","sort_order_boolean":true},"styles":{},"variation":"default"},"b940ae89-2b34-472b-aac8-f3d96dfe46f4":{"@type":"listing","headlineTag":"h2","querystring":{"limit":"7","query":[{"i":"path","o":"plone.app.querystring.operation.string.absolutePath","v":"/docs/examples/grid"}],"sort_order":"ascending"},"styles":{},"variation":"default"}},"blocks_layout":{"items":["b940ae89-2b34-472b-aac8-f3d96dfe46f4","0fae8b67-374c-4ca2-b3e0-86114e2f17e1"]},"styles":{}}' />
