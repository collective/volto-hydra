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

---

<block type="title" uid="tpl-ev-title" templateId="/templates/event-view" templateInstanceId="tpl-ev-def" slotId="title" data='{"fixed":true}' />

<block type="eventMetadata" uid="tpl-ev-metadata" templateId="/templates/event-view" templateInstanceId="tpl-ev-def" slotId="event-metadata" data='{"fixed":true}' />

<block type="slate" uid="tpl-ev-content" templateId="/templates/event-view" templateInstanceId="tpl-ev-def" slotId="content" data='{"value":[{"type":"p","children":[{"text":""}]}]}' />
