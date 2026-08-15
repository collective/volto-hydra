---
"@type": Document
UID: docs-what-editors-will-experience-containers-001
allow_discussion: false
contributors: []
creators:
  - admin
description: A container block holds other blocks inside it — sliders, columns,
  accordions, grids, generic sections. The blocks inside are called its
  children. Containers can be nested (a column inside a row inside a section).
effective: 2025-01-01T00:00:00
exclude_from_nav: false
expires: null
id: containers
is_folderish: false
language: "##DEFAULT##"
layout: document_view
preview_caption: null
preview_image: null
review_state: published
rights: ""
subjects: []
title: Containers
assignments:
  - { uid: title-1, type: title }
  - { uid: p-1, type: slate }
  - { uid: p-2, type: slate }
  - { uid: h-3, type: slate }
  - { uid: p-4, type: slate }
  - { uid: ol-5, type: slate }
  - { uid: p-6, type: slate }
  - { uid: img-7, type: image }
  - { uid: p-8, type: slate }
  - { uid: h-9, type: slate }
  - { uid: p-10, type: slate }
  - { uid: p-11, type: slate }
  - { uid: p-12, type: slate }
  - { uid: h-13, type: slate }
  - { uid: p-14, type: slate }
  - { uid: ul-15, type: slate }
  - { uid: p-16, type: slate }
  - { uid: img-17, type: image }
  - { uid: p-18, type: slate }
  - { uid: p-19, type: slate }
  - { uid: h-20, type: slate }
  - { uid: p-21, type: slate }
  - { uid: ul-22, type: slate }
  - { uid: img-23, type: image }
  - { uid: p-24, type: slate }
  - { uid: h-25, type: slate }
  - { uid: p-26, type: slate }
  - { uid: h-27, type: slate }
  - { uid: ul-28, type: slate }
  - { uid: h-29, type: slate }
  - { uid: ul-30, type: slate }
prototypes: |
  <block type="title" _="${h1}" />
  <block type="slate" value="${p|h*|ul|ol|blockquote/slate}" />
  <block type="image" description="${p/text}" url="${img/src}" alt="${img/alt}" align="center" size="l" image_field="image" title="Image" />
  <block type="image" url="${img/src}" alt="${img/alt}" align="center" size="l" image_field="image" title="Image" />
---

# 

<block type="slate">

A **container block** holds other blocks inside it — sliders, columns, accordions, grids, generic sections. The blocks inside are called its **children**. Containers can be nested (a column inside a row inside a section).

</block>

<block type="slate">

This page covers operations that change container structure: wrap a selection, unwrap a container, drag the edge of a container to absorb or expel adjacent blocks, and convert a container's type while keeping the children.

</block>

## Wrap

<block type="slate">

Select one or more blocks (see [Selecting blocks](selecting-blocks.md)), then choose **Wrap in...** from the Quanta toolbar dropdown (or sidebar block actions). A popup shows container types that:

</block>

1. Accept every selected block type (their `allowedBlocks` covers the selection).
2. Are themselves allowed in the current parent container.

<block type="slate">

Pick one. The selected blocks are pulled out of their original positions and placed as children of the new container, in the original order. The new container takes the first selected block's position.

</block>

<block type="image" url="/docs/images/wrap-chooser" align="center" size="l" data='{"alt":"Two adjacent paragraphs multi-selected, \"Wrap in...\" chooser open showing container types in Most Used / Common groups."}' />

<block type="slate">

Use this to retroactively group content — e.g. wrap two paragraphs and an image into a card, or wrap three columns of content into a row.

</block>

## Unwrap

<block type="slate">

Select a container in block mode (one Escape from text mode). Choose **Unwrap container** from the Quanta toolbar dropdown.

</block>

<block type="slate">

The container's children are promoted to the parent at the container's position, and the container itself is removed.

</block>

<block type="slate">

Unwrap is **disabled** when the parent wouldn't accept some of the children — for example, if the children are columns and the parent's `allowedBlocks` doesn't include columns. Hover the disabled action for the reason.

</block>

## Edge-drag

<block type="slate">

When a container is selected (block mode), thin **edge handles** appear on the container's borders. Drag a handle:

</block>

- **Outward** — the adjacent block(s) on that side get **absorbed** into the container as new children.
- **Inward** — the edge-most child blocks of the container get **expelled** to the parent at the container's position.

<block type="slate">

Multiple blocks can cross in a single drag — keep dragging and a "ghost boundary" line shows where the new edge will land. Release to commit. Until release, the page DOM is unchanged; you can drag back across blocks to restore.

</block>

<block type="image" url="/docs/images/edge-drag-ghost" alt="Container selected with edge handles visible. The bottom handle is being dragged toward the next sibling." align="center" size="l" />

<block type="slate">

This makes a container feel like a resizable divider: drag its edge to "grow" it across adjacent content rather than dragging blocks one at a time.

</block>

<block type="slate">

Edge handles only appear when the container is selected. They don't render on edges where there's nothing to do (the page edge, or against a fixed/readonly block that can't be moved).

</block>

## Convert (change container type)

<block type="slate">

In the Quanta toolbar dropdown, **Convert to...** lists block types this block can be converted to. For containers, conversion preserves the children:

</block>

- **Layout shape conversion** — children move into the new container's layout field automatically (whether the source uses `blocks_layout` or `object_list`).
- **Recursive child conversion** — if some children's `@type` isn't in the target's `allowedBlocks`, those children are themselves converted (using their `fieldMappings`) so they fit. If no path exists, the conversion target is shown disabled with a tooltip.

<block type="image" url="/docs/images/container-convert" align="center" size="l" data='{"alt":"A grid container selected, \"Convert to...\" chooser open showing compatible target container types."}' />

<block type="slate">

Use this to reshape an existing layout — e.g. a 2-column row into a 3-column grid, or columns into an accordion.

</block>

## The `section` block

<block type="slate">

`section` is a generic container that accepts any child block type. It's useful when you don't have a more specific container for what you're building — a "marketing section", a "case study block", a "page break with anything inside". Frontends typically render it as a `<section>` element with optional styling.

</block>

## Limits

- A container with `fixed` or `readOnly: true` (typically inherited from a template) can't be unwrapped or have its children rearranged via edge-drag. You can still edit child blocks if the children themselves aren't readonly.
- A container's `maxLength` caps how many children it can hold — wrap and edge-drag respect this. The action shows disabled with a tooltip if respecting it would mean refusing the operation.
- When dragging children **between** containers via edge-drag, the destination's `allowedBlocks` filter still applies. A block that's not in the target's `allowedBlocks` is skipped from the absorb plan.

## Things still on the roadmap

- **Split** — drag a container's edge outward through itself to create a sibling container of the same type with the children divided between them.
- **Merge** — combine two adjacent same-type containers into one.
- **Tab / Shift+Tab** — keyboard nest / unnest from inside a container.
- **Sidebar drag-to-reparent** — drag a block in the sidebar outline to move it under a different parent.
