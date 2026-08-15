---
"@type": Document
UID: e8178744e30a418b9a5768997bb29a19
allow_discussion: false
contributors: []
creators:
  - admin
description: This section has a sample of content types available in this site.
effective: 2023-09-22T16:09:00
exclude_from_nav: false
expires: null
id: content-types
is_folderish: true
language: "##DEFAULT##"
layout: document_view
preview_caption: null
preview_image: null
review_state: published
rights: ""
subjects: []
title: Content Types
assignments:
  - { uid: 7f1d39a2-a57c-4b2a-93bd-4dd30ee3f6cc, type: title }
  - { uid: e3bb641a-0252-4fff-a6a0-80ce155d4ee5, type: listing }
  - { uid: fdb1dfd1-6073-4ad0-a147-c0709c39734d, type: slate }
prototypes: |
  <block type="title" _="${h1}" />
  <block type="slate" value="${p|h*|ul|ol|blockquote/slate}" />
---

# 

<block type="listing" headlineTag="h2" variation="default" data='{"styles":{}}' />

<block type="slate" data='{"styles":{},"value":[{"children":[{"text":""}],"type":"p"}]}' />
