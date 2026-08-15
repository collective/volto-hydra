---
"@type": Document
UID: docs-advanced-001
allow_discussion: false
contributors: []
creators:
  - admin
description: "Advanced topics for optimising your Inka integration: lazy loading
  the bridge, authentication, and preventing reloads."
effective: 2025-01-01T00:00:00
exclude_from_nav: false
expires: null
id: advanced
language: "##DEFAULT##"
layout: document_view
preview_caption: null
preview_image: null
review_state: published
rights: ""
subjects:
  - frontend
title: Advanced
assignments:
  - { uid: title-1, type: title }
  - { uid: p-1, type: slate }
  - { uid: sep-2, type: separator }
  - { uid: h-3, type: slate }
  - { uid: p-4, type: slate }
  - { uid: ul-5, type: slate }
  - { uid: p-6, type: slate }
  - { uid: ce-7, type: codeExample }
  - { uid: h-8, type: slate }
  - { uid: p-9, type: slate }
  - { uid: p-10, type: slate }
  - { uid: ce-11, type: codeExample }
  - { uid: p-12, type: slate }
  - { uid: ce-13, type: codeExample }
  - { uid: h-14, type: slate }
  - { uid: p-15, type: slate }
  - { uid: h-16, type: slate }
  - { uid: p-17, type: slate }
  - { uid: ul-18, type: slate }
  - { uid: h-19, type: slate }
  - { uid: p-20, type: slate }
  - { uid: ul-21, type: slate }
  - { uid: h-22, type: slate }
  - { uid: p-23, type: slate }
  - { uid: ul-24, type: slate }
prototypes: |
  <block type="title" _="${h1}" />
  <block type="slate" value="${p|h2|h3|h4|h5|h6|ul|ol|blockquote/slate}" />
  <block type="separator" _="${hr}" />
  <block type="codeExample">
    <region name="tabs" widget="object_list">
      <block type="tab" label="${h3/text}" language="${pre/lang}" code="${pre/text}" />
    </region>
  </block>
---

# 

Advanced topics for optimising your Inka integration: lazy loading the bridge, authentication, and preventing reloads.

---

## Lazy Load the Bridge

Detect the admin iframe and load the bridge only when needed. `window.name` is set by Inka to indicate mode:

- **`hydra-edit:<origin>`** — edit mode (e.g., `hydra-edit:http://localhost:3001`)
- **`hydra-view:<origin>`** — view mode (e.g., `hydra-view:http://localhost:3001`)

This persists across SPA navigation within the iframe, allowing your frontend to detect it's in the admin even after client-side route changes. In view mode, render from your API immediately but still load the bridge for navigation tracking. In edit mode, wait for `onEditChange` before rendering.

<block type="codeExample" data='{"tabs":[{"@id":"ce-7-javascript-f6a08c","label":"Javascript","language":"javascript","code":"function loadBridge(callback) {\n    const existingScript = document.getElementById(\"hydraBridge\");\n    if (!existingScript) {\n      const script = document.createElement(\"script\");\n      script.src = \"your-hydra-js-path\";\n      script.id = \"hydraBridge\";\n      document.body.appendChild(script);\n      script.onload = () => callback();\n    } else {\n      callback();\n    }\n}\n\nconst isHydraEdit = window.name.startsWith(&#39;hydra-edit:&#39;);\nconst isHydraView = window.name.startsWith(&#39;hydra-view:&#39;);\nconst inAdminIframe = isHydraEdit || isHydraView;\n\n// View mode or not in admin: render from API\nif (!isHydraEdit) {\n    renderPage(await fetchContent(path));\n}\n\n// Load bridge only in admin iframe\nif (inAdminIframe) {\n    loadBridge(() => {\n        initBridge({\n            onEditChange: (formData) => renderPage(formData),\n        });\n    });\n}"}]}' />

## Authentication

As soon as the editor logs into the hydra editor, your frontend should use the same auth token to access the REST API with the same privileges and render private content.

The `access_token` is passed as a URL parameter on initial load and automatically stored in `sessionStorage` by hydra.js. On SPA navigation, the URL param is gone but the token persists in `sessionStorage`. Use the `getAccessToken()` helper:

<block type="codeExample" data='{"tabs":[{"@id":"ce-11-javascript-060e3a","label":"Javascript","language":"javascript","code":"import { getAccessToken } from &#39;@hydra-js/hydra.js&#39;;\n\nconst token = getAccessToken();\n// Returns token from URL param (if present)\n// or sessionStorage (for SPA navigation)"}]}' />

Example using Next.js 14 and ploneClient:

<block type="codeExample" data='{"tabs":[{"@id":"ce-13-javascript-852336","label":"Javascript","language":"javascript","code":"import ploneClient from \"@plone/client\";\nimport { useQuery } from \"@tanstack/react-query\";\nimport { getAccessToken } from &#39;@hydra-js/hydra.js&#39;;\n\nexport default function Blog({ params }) {\n  const token = getAccessToken();\n\n  const client = ploneClient.initialize({\n    apiPath: \"http://localhost:8080/Plone/\",\n    token: token,\n  });\n\n  const { getContentQuery } = client;\n  const { data, isLoading } = useQuery(\n    getContentQuery({ path: &#39;/blogs&#39; })\n  );\n\n  if (isLoading) return <div>Loading...</div>;\n  return <div>{data.title}</div>;\n}"}]}' />

## Preventing Reloads

If you wish to make the editing experience smoother you can register for `onRoute` callbacks to prevent the frontend being forced to reload at certain times using the hydra editor. (TODO)

## Custom Sidebar and CMS UI

If the auto-generated sidebar UI from your block or content schemas isn't suitable, the React Volto framework has an addon system that lets you override CMS components — at widget level, block-settings level, or even whole views like Contents or Site Settings. For example, you might want to replace the image picker with a custom map editor.

- [Volto Block Edit Component documentation](https://6.docs.plone.org/volto/blocks/editcomponent.html)

## Custom Visual Editing (TODO)

In some cases you might want to provide editors with more visual editing inside the preview than Inka currently supports out of the box. For example, a newly created table block might display a form to set the initial number of columns and rows. The bridge exposes the following hooks to make this possible:

- **`sendBlockUpdate`** — send an updated version of the block back to the admin after frontend-side changes (TODO).
- **`sendBlockAction`** — perform actions like select, add, move, copy or remove blocks, or invoke custom actions on the Volto block edit component.
- You can disable Inka's default handling of selection, DnD, or other interactions if you want to replace some parts of Inka and not others (TODO).

## Custom API Endpoints

With an open-source headless CMS you have a choice between creating custom server-side functionality as:

- A separately deployed microservice, or
- An [API endpoint addon](https://2022.training.plone.org/mastering-plone/endpoints.html) attached to the backend API server.
