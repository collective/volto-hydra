---
"@type": Document
UID: tpl-ct-event-view
id: event-view
title: Event View
review_state: published
description: Layout template for Event content type pages
effective: 2025-01-01T00:00:00
blocks-assignments:
  - { uid: tpl-ev-title }
  - { uid: tpl-ev-metadata }
  - { uid: tpl-ev-content }
blocks-matched: |
  <block type="slate" value="${p,h*,ul,ol,blockquote/slate}" />
  <block type="title" _="${h1}" />
---

<fields templateId="/templates/event-view" templateInstanceId="tpl-ev-def">

<fields data-json='{"fixed":true}'>

<block type="title">

# 

<fields slotId="title" />

</block>

<block type="eventMetadata" slotId="event-metadata" />

</fields>

<block type="slate" slotId="content" data-json='{"value":[{"type":"p","children":[{"text":""}]}]}' />

</fields>
