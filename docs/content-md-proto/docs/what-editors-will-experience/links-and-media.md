---
"@type": Document
UID: docs-what-editors-will-experience-links-and-media-001
allow_discussion: false
contributors: []
creators:
  - admin
description: "The link picker, image picker, and upload dialog are part of
  Inka's chrome — they look the same on every site. What varies by design system
  is which links and images are click-to-edit in the preview: a site might wire
  up every link inline, or only a few \"primary\" links, with everything else
  editable from the sidebar. Same applies to images."
effective: 2025-01-01T00:00:00
exclude_from_nav: false
expires: null
id: links-and-media
is_folderish: false
language: "##DEFAULT##"
layout: document_view
preview_caption: null
preview_image: null
review_state: published
rights: ""
subjects: []
title: Links and media
assignments:
  - { uid: title-1, type: title }
  - { uid: p-1, type: slate }
  - { uid: h-2, type: slate }
  - { uid: p-3, type: slate }
  - { uid: ul-4, type: slate }
  - { uid: img-5, type: image }
  - { uid: p-6, type: slate }
  - { uid: h-7, type: slate }
  - { uid: p-8, type: slate }
  - { uid: p-9, type: slate }
  - { uid: img-10, type: image }
  - { uid: p-11, type: slate }
  - { uid: ul-12, type: slate }
  - { uid: h-13, type: slate }
  - { uid: p-14, type: slate }
  - { uid: h-15, type: slate }
  - { uid: p-16, type: slate }
  - { uid: ul-17, type: slate }
  - { uid: img-18, type: image }
  - { uid: h-19, type: slate }
  - { uid: p-20, type: slate }
  - { uid: ul-21, type: slate }
  - { uid: p-22, type: slate }
  - { uid: h-23, type: slate }
  - { uid: p-24, type: slate }
  - { uid: h-25, type: slate }
  - { uid: p-26, type: slate }
  - { uid: ul-27, type: slate }
  - { uid: p-28, type: slate }
prototypes: |
  <block type="title" _="${h1}" />
  <block type="slate" value="${p|h*|ul|ol|blockquote/slate}" />
  <block type="image" description="${p/text}" url="${img/src}" alt="${img/alt}" align="center" size="l" image_field="image" title="Image" />
  <block type="image" url="${img/src}" alt="${img/alt}" align="center" size="l" image_field="image" title="Image" />
---

# 

<block type="slate">

The link picker, image picker, and upload dialog are part of Inka's chrome — they look the same on every site. What varies by design system is **which** links and images are click-to-edit in the preview: a site might wire up every link inline, or only a few "primary" links, with everything else editable from the sidebar. Same applies to images.

</block>

## Editing a link

<block type="slate">

When the frontend has wired up a link field as inline-editable, clicking the link in the preview doesn't navigate — it opens the **link picker** instead. From the picker you can:

</block>

- **Pick a CMS page** by browsing the content tree.
- **Type/paste an external URL.**
- **Open the URL in a new tab** (toggle the "Open in new tab" option).
- **Clear the link.**

<block type="image" url="/docs/images/link-picker" alt="Link picker on a slate link — URL field with /another-page, browse / clear / open-new-tab / submit icons." align="center" size="l" />

<block type="slate">

The Quanta toolbar's link icon does the same thing and is available on slate text fields too — select some text, click the link icon, and the link picker opens for that text range.

</block>

## Linking to a spot inside a page

<block type="slate">

Sometimes you don't want to link to the top of a page — you want to land the reader on a particular section. Browse to the page and **open it** in the picker: if it has no pages inside it, you'll go straight to its **Fragments** — the page's headings. Pick one and the link becomes `/that-page#that-heading`, so the browser scrolls straight to it.

</block>

<block type="slate">

The two buttons at the top right switch between **Sub items** (pages inside this one) and **Fragments**, so you can always get back to either.

</block>

<block type="image" url="/docs/images/link-fragments" alt="Object browser opened on Deep Link Page with the top-right switch set to Fragments, listing the page's headings — Intro and Details — as link targets." align="center" size="l" />

<block type="slate">

Which spots are offered is up to the site's design system — most sites make every heading linkable. Two things worth knowing:

</block>

- **The page you're editing is live.** Add a heading and it's immediately available as a target, before you save.
- **Other pages use their last saved version.** If a heading was added to another page but not saved yet, it won't appear until that page is saved.

## Uploading media

<block type="slate">

When the frontend marks an image (or other media element) as inline-editable, you can:

</block>

### Empty media element

<block type="slate">

You'll see an empty placeholder with a prompt to **upload, browse, or drag in** an image. Three ways:

</block>

- Click the placeholder → the media picker opens. Pick from existing CMS images or upload a new one.
- Drag an image file from your desktop and drop it directly onto the placeholder.
- Drag an image from another tab / source if your browser supports it.

<block type="image" url="/docs/images/media-empty-placeholder" align="center" size="l" data='{"alt":"Empty image block selected — placeholder with image icon, \"Browse the site, drop an image...\" input, sidebar showing \"NO IMAGE SELECTED\"."}' />

### Replacing an existing media element

<block type="slate">

Hover the image — controls appear. You can:

</block>

- **Replace** — opens the media picker to pick or upload a different image.
- **Remove** — clears the field, returns to the empty placeholder state.
- **Drag and drop a new image** directly onto the existing one to replace it.

<block type="slate">

The same actions are available from the sidebar field if you'd rather not click into the preview.

</block>

## What gets stored

<block type="slate">

When you pick or upload an image, what gets stored on the block isn't a URL string — it's a small object containing the image's CMS path, the field name, and the available scales. The frontend resolves a specific scale at render time (so the same image data renders at thumbnail size in a listing and full size in a hero). You don't have to think about scales as an editor; they're a developer concern.

</block>

## What's not (yet) inline-editable

<block type="slate">

A few media types currently still require sidebar editing:

</block>

- **File uploads** (PDFs, downloads) — pickable from the sidebar but no drag-onto-preview support yet.
- **Embedded video URLs** — sidebar field; click-to-edit on the player isn't wired up.

<block type="slate">

If your frontend doesn't expose a particular media field as inline-editable, you can always edit it from the sidebar — that's available for every field.

</block>
