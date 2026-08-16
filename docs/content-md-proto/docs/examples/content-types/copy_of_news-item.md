---
"@type": News Item
UID: af85ff98cd6446eebcba56305ed89fed
allow_discussion: false
changeNote: null
contributors: []
creators:
  - admin
description: Cinnamon skinny medium panna americano spice affogato froth frappuccino that.
effective: 2024-03-07T17:09:00
exclude_from_nav: false
expires: null
id: copy_of_news-item
image:
  blob_path: docs/examples/content-types/copy_of_news-item/image/sergio-martinez-rhNJJ4eD2zk-unsplash.jpg
  content-type: image/jpeg
  filename: sergio-martinez-rhNJJ4eD2zk-unsplash.jpg
  height: 3456
  size: 2231807
  width: 5184
image_caption: null
is_folderish: true
language: "##DEFAULT##"
layout: newsitem_view
review_state: published
rights: ""
subjects:
  - news
title: Another News Item
assignments:
  - { uid: ni-date-qrq6v50j, type: dateField }
  - { uid: a0ac0f60-667b-4b22-a49f-989f2ae8c3cc, type: title }
  - { uid: 8c686422-757e-4519-ae6a-ffcb4d107e22, type: introduction }
  - { uid: 944cfb1b-3ef7-425f-a5ef-eb9242429bfd, type: leadimage }
  - { uid: 6db5aa18-6fd8-4efe-9bc6-9cd6fc1dd0be, type: slate }
prototypes: |
  <block type="title" _="${h1}" />
  <block type="slate" value="${p|h*|ul|ol|blockquote/slate}" />
---

<block type="dateField" dateField="effective" templateId="/templates/newsitem-view" templateInstanceId="tpl-ni-def" slotId="date" data='{"showTime":false,"fixed":true,"readOnly":true}' />

<block type="title">

# 

<fields templateId="/templates/newsitem-view" templateInstanceId="tpl-ni-def" slotId="title" data='{"fixed":true,"readOnly":true}' />

</block>

<block type="introduction" templateId="/templates/newsitem-view" templateInstanceId="tpl-ni-def" slotId="content" data='{"value":[{"children":[{"text":"Cinnamon skinny medium panna americano spice affogato froth frappuccino that."}],"type":"p"}]}' />

<block type="leadimage" align="center" templateId="/templates/newsitem-view" templateInstanceId="tpl-ni-def" slotId="lead-image" data='{"fixed":true}' />

<block type="slate">

Ristretto so chicory skinny ristretto au decaffeinated sugar that spoon shop crema ut pot lungo. Flavour that milk brewed flavour whipped kopi black and robusta. Bar sugar americano eu froth variety brewed acerbic steamed. Aroma est milk doppio frappuccino half cream filter french froth luwak. Acerbic plunger au barista flavour in froth trade.

<fields templateId="/templates/newsitem-view" templateInstanceId="tpl-ni-def" slotId="content" data='{"styles":{}}' />

</block>
