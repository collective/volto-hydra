---
"@type": Document
UID: docs-folder-001
allow_discussion: false
contributors: []
creators:
  - admin
description: A Visual Headless CMS using Plone as a server, providing true
  visual editing with drag-and-drop blocks and editable text — with any frontend
  stack you choose.
effective: 2025-01-01T00:00:00
exclude_from_nav: false
expires: null
id: docs
is_folderish: true
language: "##DEFAULT##"
layout: document_view
preview_caption: null
preview_image: null
review_state: published
rights: ""
subjects: []
title: Volto Hydra Documentation
blocks-assignments:
  - { uid: title-1 }
  - { uid: p-1 }
  - { uid: h-2 }
  - { uid: ul-3 }
  - { uid: h-4 }
  - { uid: p-5 }
  - { uid: p-6 }
  - { uid: ul-7 }
  - { uid: p-8 }
  - { uid: p-9 }
  - { uid: listing-1 }
blocks-matched: |
  <block type="slate" value="${p,h*,ul,ol,blockquote,strong,em/slate}" />
  <block type="title" _="${h1}" />
order:
  - architecture
  - build-a-frontend
  - server-rendered-frontends
  - live-preview
  - custom-blocks
  - container-blocks
  - visual-editing
  - what-editors-will-experience
  - listings
  - templates
  - advanced
  - examples
  - static
  - images
---

# Volto Hydra Documentation

A Visual Headless CMS using Plone as a server, providing true visual editing with drag-and-drop blocks and editable text — with any frontend stack you choose.

## Why Hydra?

- **Visual + True Headless + Open Source** — a unique combination in the CMS space
- **Framework agnostic** — Next.js, Nuxt.js, Astro, plus server-only stacks (PHP, Django, Rails, Laravel) via the [server-render pattern](/docs/server-rendered-frontends)
- **Quick visual editing** — enable it with simple HTML data attributes, no React or Vue required in your frontend
- **Omni-channel** — switch between multiple frontends mid-edit
- **Enterprise features** — versioning, i18n, workflow, and automated content rules
- **Customisable** — both the admin interface and block definitions are fully configurable

## Try the online demo

The fastest way to feel what Hydra does is to log into the hosted demo and edit a real page against a real frontend.

<block type="slate" data-json='{"value":[{"type":"p","children":[{"text":"Open <https://hydra.pretagov.com>, log in, then:"}]}]}' />

- Open user preferences (bottom-left).
- Pick one of the preset frontends, or paste in your own frontend URL.
- Edit any page — every change updates the live preview.

The default preset is a Nuxt.js frontend deployed as an [SSG](https://hydra-nuxt-flowbrite.netlify.app/) to demonstrate scale-to-zero editing on free hosting. An [Astro example](https://github.com/collective/volto-hydra/tree/main/docs/examples/test-astro) demonstrates the [server-render pattern](/docs/server-rendered-frontends) for static-first frameworks. See [Build a frontend › Deployment patterns](/docs/build-a-frontend#deployment-patterns).

To run Hydra locally against your own frontend, see the **Run Locally** section of the [project README](https://github.com/collective/volto-hydra#run-locally).

<block type="listing" headlineTag="h2" variation="summary" data-json='{"fieldMapping":{"@id":"href","title":"title","description":"description","image":"image"}}' />
