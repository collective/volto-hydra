---
"@type": Document
UID: docs-examples-cookie-consent-001
allow_discussion: false
contributors: []
creators:
  - admin
description: A consent banner and a preferences dialog, written by one block. It
  is the worked example for revealing the place a FIELD is edited —
  data-block-selector="uid#fieldName".
effective: null
exclude_from_nav: false
expires: null
id: cookie-consent
is_folderish: false
language: "##DEFAULT##"
layout: document_view
review_state: published
rights: ""
subjects: []
title: Cookie Consent Block
blocks-assignments:
  - { uid: title-1 }
  - { uid: ref-cookie-consent-description }
  - { uid: cookie-live-heading }
  - { uid: cookie-live-1 }
  - { uid: ref-cookie-consent-schema }
  - { id: ref-cookie-consent-schema-javascript-6ba1e2 }
  - { uid: ref-cookie-consent-json-data }
  - { id: ref-cookie-consent-json-data-json-bacd31 }
  - { uid: ref-cookie-consent-rendering }
  - { id: ref-cookie-consent-rendering-jsx-06f33f }
  - { id: ref-cookie-consent-rendering-vue-49ac4b }
  - { id: ref-cookie-consent-rendering-svelte-92073b }
blocks-matched: |
  <block type="slate" value="${p,h*,ul,ol,blockquote,strong,em/slate}" />
  <block type="title" _="${h1}" />
  <block type="codeExample">
    <region name="tabs" widget="object_list">
      <block type="tab" label="${h3/text}" language="${pre/lang}" code="${pre/text}" />
    </region>
  </block>
---

# Cookie Consent Block

A consent banner and a preferences dialog, written by one block. It is the worked example for revealing the place a FIELD is edited — data-block-selector="uid#fieldName".

## Live example

<block type="cookieConsent" analyticsPurpose="Counts visits and pages, so we can see what is worth improving. Never used to identify you." data-json='{"message":[{"type":"p","children":[{"text":"We use essential cookies to make this site work, and analytics cookies to see how it is used."}]}]}' />

<fields templateId="/templates/block-reference-layout" templateInstanceId="tpl-inst-cookie-consent">

<block type="codeExample" slotId="schema">

### Schema

```javascript
{
  "cookieConsent": {
    "id": "cookieConsent",
    "title": "Cookie consent",
    "blockSchema": {
      "fieldsets": [
        {
          "id": "default",
          "title": "Default",
          "fields": [
            "message",
            "analyticsPurpose"
          ]
        }
      ],
      "properties": {
        "message": {
          "title": "Banner message",
          "widget": "slate",
          "description": "Shown in the consent banner, at the foot of every page, until a visitor chooses."
        },
        "analyticsPurpose": {
          "title": "Analytics cookies \u2014 what they are for",
          "widget": "textarea",
          "description": "Shown beside the analytics tick box, inside the preferences dialog."
        }
      },
      "required": []
    }
  }
}
```

</block>

<block type="codeExample" slotId="json-data">

### JSON Block Data

```json
{
  "@type": "cookieConsent",
  "message": [
    {
      "type": "p",
      "children": [
        {
          "text": "We use essential cookies to make this site work, and analytics cookies to see how it is used. You can "
        },
        {
          "type": "link",
          "data": {
            "url": "/cookies"
          },
          "children": [
            {
              "text": "manage your cookie settings"
            }
          ]
        },
        {
          "text": " at any time."
        }
      ]
    }
  ],
  "analyticsPurpose": "Counts visits and pages, so we can see what is worth improving. Never used to identify you."
}
```

</block>

<block type="codeExample" slotId="rendering">

### React

```{literalinclude} ../../../examples/examples/react/CookieConsentBlock.jsx
:language: jsx
```

### Vue

```{literalinclude} ../../../examples/examples/vue/CookieConsentBlock.vue
:language: vue
```

### Svelte

```{literalinclude} ../../../examples/examples/svelte/CookieConsentBlock.svelte
:language: svelte
```

</block>

</fields>
