---
"@type": Document
UID: tpl-ct-event-view
id: event-view
title: Event View
review_state: published
description: Layout template for Event content type pages
effective: 2025-01-01T00:00:00
assignments:
  - { uid: tpl-ev-title, type: title }
  - { uid: tpl-ev-metadata, type: eventMetadata }
  - { uid: tpl-ev-content, type: slate }
prototypes: |
  <block type="title" _="${h1}" />
  <block type="slate" value="${p|h*|ul|ol|blockquote/slate}" />
  <block type="slate" value="${*/slate}" />
---

<block type="title">

# 

<fields templateId="/templates/event-view" templateInstanceId="tpl-ev-def" slotId="title" data='{"fixed":true}' />

</block>

<block type="eventMetadata" templateId="/templates/event-view" templateInstanceId="tpl-ev-def" slotId="event-metadata" data='{"fixed":true}' />

<block type="slate" templateId="/templates/event-view" templateInstanceId="tpl-ev-def" slotId="content" data='{"value":[{"type":"p","children":[{"text":""}]}]}' />
