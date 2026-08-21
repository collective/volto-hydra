---
"@type": Document
UID: tpl-ct-newsitem-view
id: newsitem-view
title: News Item View
review_state: published
description: Layout template for News Item content type pages
effective: 2025-01-01T00:00:00
blocks-assignments:
  - { uid: tpl-ni-date }
  - { uid: tpl-ni-title }
  - { uid: tpl-ni-leadimage }
  - { uid: tpl-ni-content }
blocks-matched: |
  <block type="slate" value="${p,h*,ul,ol,blockquote/slate}" />
  <block type="title" _="${h1}" />
---

<fields templateId="/templates/newsitem-view" templateInstanceId="tpl-ni-def">

<fields data-json='{"fixed":true}'>

<block type="dateField" dateField="effective" slotId="date" data-json='{"showTime":false}' />

<block type="title">

# News Item View

<fields slotId="title" />

</block>

<block type="leadimage" slotId="lead-image" />

</fields>

<block type="slate" slotId="content" data-json='{"value":[{"type":"p","children":[{"text":""}]}]}' />

</fields>
