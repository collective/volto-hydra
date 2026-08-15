---
"@type": Document
UID: tpl-ct-newsitem-view
id: newsitem-view
title: News Item View
review_state: published
description: Layout template for News Item content type pages
effective: 2025-01-01T00:00:00
assignments:
  - { uid: tpl-ni-date, type: dateField }
  - { uid: tpl-ni-title, type: title }
  - { uid: tpl-ni-leadimage, type: leadimage }
  - { uid: tpl-ni-content, type: slate }
prototypes: |
  <block type="title" _="${h1}" />
  <block type="slate" value="${p|h*|ul|ol|blockquote/slate}" />
---

<block type="dateField" dateField="effective" templateId="/templates/newsitem-view" templateInstanceId="tpl-ni-def" slotId="date" data='{"showTime":false,"fixed":true}' />

<block type="title" templateId="/templates/newsitem-view" templateInstanceId="tpl-ni-def" slotId="title" data='{"fixed":true}' />

<block type="leadimage" templateId="/templates/newsitem-view" templateInstanceId="tpl-ni-def" slotId="lead-image" data='{"fixed":true}' />

<block type="slate" templateId="/templates/newsitem-view" templateInstanceId="tpl-ni-def" slotId="content" data='{"value":[{"type":"p","children":[{"text":""}]}]}' />
