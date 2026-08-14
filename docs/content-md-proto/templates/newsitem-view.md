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

---

<block type="dateField" uid="tpl-ni-date" dateField="effective" templateId="/templates/newsitem-view" templateInstanceId="tpl-ni-def" slotId="date" data='{"showTime":false,"fixed":true}' />

<block type="title" uid="tpl-ni-title" templateId="/templates/newsitem-view" templateInstanceId="tpl-ni-def" slotId="title" data='{"fixed":true}' />

<block type="leadimage" uid="tpl-ni-leadimage" templateId="/templates/newsitem-view" templateInstanceId="tpl-ni-def" slotId="lead-image" data='{"fixed":true}' />

<block type="slate" uid="tpl-ni-content" templateId="/templates/newsitem-view" templateInstanceId="tpl-ni-def" slotId="content" data='{"value":[{"type":"p","children":[{"text":""}]}]}' />
