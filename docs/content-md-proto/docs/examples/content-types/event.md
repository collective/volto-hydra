---
"@type": Event
UID: 7adc12f0e7604982a6cdcb9437bccf66
allow_discussion: false
attendees: []
changeNote: null
contact_email: m.mustermann@plone.com
contact_name: Max Mustermann
contact_phone: +49 1234 567-890
contributors: []
creators:
  - admin
description: The event content type can be used to display an event on the website.
effective: 2023-07-06T18:35:00
end: 2023-12-31T12:00:00+00:00
event_url: http://www.musterevents.com
exclude_from_nav: false
expires: null
id: event
is_folderish: true
language: "##DEFAULT##"
layout: event_view
location: Musterhausener Landstrasse 134 Standort E123 67111 Musterhausen
open_end: false
preview_caption: null
preview_image:
  blob_path: docs/examples/content-types/event/preview_image/event.svg
  content-type: image/svg+xml
  filename: event.svg
  height: 36
  size: 703
  width: 36
recurrence: null
review_state: published
rights: ""
start: 2023-01-01T11:00:00+00:00
subjects:
  - events
sync_uid: null
title: Event
whole_day: false
assignments:
  - { uid: d3f1c443-583f-4e8e-a682-3bf25752a300, type: title }
  - { uid: b539ed36-442b-4c7d-8b9b-8af01963c206, type: eventMetadata }
  - { uid: 6e6979eb-af21-466f-b2de-3148144ac950, type: slate }
prototypes: |
  <block type="title" _="${h1}" />
  <block type="slate" value="${p|h*|ul|ol|blockquote/slate}" />
---

<block type="title">

# 

<fields templateId="/templates/event-view" templateInstanceId="tpl-ev-def" slotId="title" data='{"fixed":true,"readOnly":true}' />

</block>

<block type="eventMetadata" templateId="/templates/event-view" templateInstanceId="tpl-ev-def" slotId="event-metadata" data='{"fixed":true}' />

<block type="slate" templateId="/templates/event-view" templateInstanceId="tpl-ev-def" slotId="content" data='{"styles":{},"value":[{"children":[{"text":""}],"type":"p"}]}' />
