---
"@type": Document
UID: docs-what-editors-will-experience-templates-and-layouts-001
allow_discussion: false
contributors: []
creators:
  - admin
description: "A template is a piece of pre-built page structure that someone
  (often a developer or site admin) has saved separately. When you apply a
  template to a page, the page gets the template's structure overlaid: some
  blocks are fixed and can't be edited, some can be edited but not moved, and
  some are open slots where you fill in your own blocks."
effective: 2025-01-01T00:00:00
exclude_from_nav: false
expires: null
id: templates-and-layouts
language: "##DEFAULT##"
layout: document_view
preview_caption: null
preview_image: null
review_state: published
rights: ""
subjects: []
title: Templates and layouts
blocks:
  - title-1: title
  - p-1: slate
  - p-2: slate
  - ul-3: slate
  - p-4: slate
  - h-5: slate
  - p-6: slate
  - h-7: slate
  - p-8: slate
  - ul-9: slate
  - p-10: slate
  - p-11: slate
  - h-12: slate
  - p-13: slate
  - ul-14: slate
  - p-15: slate
  - ul-16: slate
  - p-17: slate
  - h-18: slate
  - p-19: slate
  - img-20: image
  - h-21: slate
  - p-22: slate
  - p-23: slate
  - h-24: slate
  - p-25: slate
  - ul-26: slate
  - p-27: slate
  - p-28: slate
  - h-29: slate
  - p-30: slate
  - ol-31: slate
  - p-32: slate
  - h-33: slate
  - p-34: slate
  - p-35: slate
  - p-36: slate
  - ul-37: slate
  - p-38: slate
  - img-39: image
  - h-40: slate
  - p-41: slate
  - h-42: slate
  - p-43: slate
---

<block type="title" uid="title-1" />

A **template** is a piece of pre-built page structure that someone (often a developer or site admin) has saved separately. When you apply a template to a page, the page gets the template's structure overlaid: some blocks are fixed and can't be edited, some can be edited but not moved, and some are open slots where you fill in your own blocks.

Templates let editors reuse a layout consistently across many pages without copy-pasting structure each time. Two flavours:

- **Block-level templates** — a snippet you insert as a block (e.g. a "feature row" snippet you drop into the middle of a page). Configured per field as `allowedTemplates`; appears in the BlockChooser's Templates group.
- **Page-level layouts** — a full layout the whole page (or a region) is rendered through (e.g. an "article layout" with a fixed header / sidebar / footer). Configured as `allowedLayouts`; appears in the Layout dropdown.

The two share the same merge rules; the difference is just where they're applied.

## What you'll see in the editor

When a template is applied to a page, blocks fall into three categories:

### 🔒 Locked (fixed + read-only)

Shown with a **lock icon** — a 🔒 in the Quanta toolbar (in place of the drag handle) and on the template's sidebar bar. You can't:

- Edit the text/media inside it.
- Move it.
- Delete it.

Selecting a locked block still shows its content in the sidebar — as **read-only values**, not editable fields — so you can see what's there without being able to change it.

Typical use: branded headers, footers, legal disclaimers — content the template author wants identical across every page.

### Fixed (editable, not movable)

Shown without a lock but without a drag handle. You can:

- Edit text, media, links inside it.
- Change its block-level settings.

You cannot:

- Move it to a different position.
- Delete it.

Typical use: a "callout" block in the middle of a layout — every page has one, but the content varies.

### Slot (your content)

Regular blocks where you can do anything — add, edit, move, delete. The template marks regions as slots (with a `slotId`) and your existing content is placed into the matching slots when the template merges.

<block type="image" uid="img-20" align="center" size="l" url="${src}" alt="${alt}">

![A snippet template applied to a page. The "Snippet Header" block is selected, rendered muted as a locked block. Its sidebar shows its content read-only — a "Text" field with the value "Snippet Header - From Template" — above the template's own read-only settings (Template Name, Save Location).](/docs/images/template-locked)

</block>

## Inserting between fixed blocks

You **can't** insert a new block between two adjacent fixed/readonly template blocks — the "+" button is hidden in those positions and DnD is rejected. This is intentional: the template author put those fixed blocks side-by-side on purpose, and the editor inserting between them would break the layout's intent.

If you need to add content there, you may need to switch to a different layout (one whose structure has a slot in that position) or talk to whoever maintains the templates.

## Moving content in and out of slots

A block belongs to whichever **slot it currently sits in** — and you change that just by moving it. A block always takes on the slot it *lands* in; it never keeps the slot it came from.

- **Drag a block into a slot** — drop it inside a slot region (next to other slot content, or into an empty slot placeholder) and it becomes part of that slot. If you later switch layouts, it travels with that slot.
- **Drag a block out of the template** — drop it in the ordinary page area *around* the template (above it, below it, between it and other page content) and it **leaves the template**: it turns back into a normal block with no slot, freely editable and movable like any other page content.
- **Move a block between slots** — drop it into a different slot and it simply joins the new one.

A template is anchored by its fixed blocks at the top and/or bottom, with its slots in between. Wherever an end has **no** fixed block, that edge is open — you can drag content in there (it joins the edge slot) or drag your content out past it (it leaves the template). Where a fixed block sits at the very edge, there's nothing to drop past, so blocks stay inside.

Locked and fixed template blocks are the exception: they can't be moved at all (unless you're editing the template itself), so they never change slots.

## Switching the layout

When `allowedLayouts` is configured for a page (or a region), the sidebar shows a **Layout** dropdown. Pick a different layout and:

<block type="slate" uid="ol-31">

```field-json:value
[
 {
  "type": "ol",
  "children": [
   {
    "type": "li",
    "children": [
     {
      "text": "The new layout's structure replaces the old one."
     }
    ]
   },
   {
    "type": "li",
    "children": [
     {
      "text": "Your existing content is "
     },
     {
      "type": "strong",
      "children": [
       {
        "text": "redistributed"
       }
      ]
     },
     {
      "text": " into the new layout's slots based on "
     },
     {
      "type": "code",
      "children": [
       {
        "text": "slotId"
       }
      ]
     },
     {
      "text": ":"
     },
     {
      "type": "ul",
      "children": [
       {
        "type": "li",
        "children": [
         {
          "text": "Content tagged with a slot name is placed into the matching slot in the new layout."
         }
        ]
       },
       {
        "type": "li",
        "children": [
         {
          "text": "Content with no slot tag falls into the "
         },
         {
          "type": "code",
          "children": [
           {
            "text": "\"default\""
           }
          ]
         },
         {
          "text": " slot if the new layout has one; otherwise into the bottom or top slot, or is dropped."
         }
        ]
       },
       {
        "type": "li",
        "children": [
         {
          "text": "Fixed blocks with the same "
         },
         {
          "type": "code",
          "children": [
           {
            "text": "slotId"
           }
          ]
         },
         {
          "text": " get their editable content carried over (text, media); their structural settings come from the new layout."
         }
        ]
       }
      ]
     }
    ]
   }
  ]
 }
]
```

</block>

The point of `slotId` is that two layouts can share the same set of region names — switch between them and your content lands in the right places automatically.

## Editing content inside a template

A template's own (fixed) blocks are **locked** by default — you can edit *this page's* content, but not the template. To change the template itself, **unlock** it: select one of its blocks and click the 🔒 on its **sidebar bar** ("Template: *name*"), on the block's **Quanta toolbar**, or **Edit template** in the bar's `⋯` menu. The 🔒 becomes 🔓, and the template's blocks — plus its Name / Save Location — become editable.

Unlocking one template unlocks only *that* template. The rest of the page stays editable as normal, and you can **unlock several templates at once** and edit them together.

**Locking is where your template edits commit.** When you lock a template you choose:

- **Change on all pages** — save your edits to the template; every page using it picks them up.
- **Reset changes** — discard the edits and revert the template to its saved version. Only the template reverts; any page content you edited while it was unlocked stays.
- **Cancel** — keep editing (stay unlocked).

Templates are saved when you **lock** them, not when you save the page. If you save the page while a template is still unlocked, you're prompted to lock it first.

<block type="image" uid="img-39" align="center" size="l" url="${src}" alt="${alt}">

![A template's sidebar bar, locked (🔒) — the Template Settings show as read-only text. Clicking the lock unlocks it (🔓) and makes the template editable.](/docs/images/template-edit-locked)

</block>

## Template instances in the sidebar

When a template is applied, the template's blocks are grouped under a single virtual entry in the sidebar block list — you'll see "Template: Article Layout" rather than each fixed/readonly block as a separate row. Expand it to see the structure inside.

## Inserting a template as a block

When `allowedTemplates` is configured on a field, the BlockChooser's Templates group shows the list. Pick one and the template's content is inserted at the current position as a block (just like adding any other block). Editor-side this is the simpler case — once inserted, the template's blocks behave the same as if a layout had placed them (lock icons, fixed-but-editable, slots).
