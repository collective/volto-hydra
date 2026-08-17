---
"@type": Document
UID: tpl-ct-newsitem-view
id: newsitem-view
title: News Item View
review_state: published
description: Layout template for News Item content type pages
effective: 2025-01-01T00:00:00
assignments:
  - { uid: tpl-ni-date }
  - { uid: tpl-ni-title }
  - { uid: tpl-ni-leadimage }
  - { uid: tpl-ni-content }
prototypes: |
  <block type="slate" value="${p,h*,ul,ol,blockquote/slate}" />
  <block type="title" _="${h1}" />
---

<block type="dateField" dateField="effective" templateId="/templates/newsitem-view" templateInstanceId="tpl-ni-def" slotId="date" data-json='{"showTime":false,"fixed":true}' />

<block type="title">

# 

<fields templateId="/templates/newsitem-view" templateInstanceId="tpl-ni-def" slotId="title" data-json='{"fixed":true}' />

</block>

<block type="leadimage" templateId="/templates/newsitem-view" templateInstanceId="tpl-ni-def" slotId="lead-image" data-json='{"fixed":true}' />

<block type="slate" templateId="/templates/newsitem-view" templateInstanceId="tpl-ni-def" slotId="content" data-json='{"value":[{"type":"p","children":[{"text":""}]}]}' />
