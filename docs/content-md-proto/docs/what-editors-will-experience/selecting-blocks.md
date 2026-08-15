---
"@type": Document
UID: docs-what-editors-will-experience-selecting-blocks-001
allow_discussion: false
contributors: []
creators:
  - admin
description: "The editor has two modes when a block is selected: text mode
  (you're editing inside the block) and block mode (the whole block is selected
  as a unit)."
effective: 2025-01-01T00:00:00
exclude_from_nav: false
expires: null
id: selecting-blocks
language: "##DEFAULT##"
layout: document_view
preview_caption: null
preview_image: null
review_state: published
rights: ""
subjects: []
title: Selecting blocks
assignments:
  - { uid: title-1, type: title }
  - { uid: p-1, type: slate }
  - { uid: h-2, type: slate }
  - { uid: p-3, type: slate }
  - { uid: ul-4, type: slate }
  - { uid: img-5, type: image }
  - { uid: h-6, type: slate }
  - { uid: p-7, type: slate }
  - { uid: ul-8, type: slate }
  - { uid: p-9, type: slate }
  - { uid: img-10, type: image }
  - { uid: h-11, type: slate }
  - { uid: p-12, type: slate }
  - { uid: tbl-13, type: slateTable }
  - { uid: p-14, type: slate }
  - { uid: ul-15, type: slate }
  - { uid: img-16, type: image }
  - { uid: h-17, type: slate }
  - { uid: p-18, type: slate }
  - { uid: h-19, type: slate }
  - { uid: p-20, type: slate }
  - { uid: ce-21, type: codeExample }
  - { id: ce-21-text-3d139a }
  - { uid: p-22, type: slate }
  - { uid: img-23, type: image }
  - { uid: p-24, type: slate }
  - { uid: h-25, type: slate }
  - { uid: p-26, type: slate }
  - { uid: ce-27, type: codeExample }
  - { id: ce-27-text-19ff8a }
  - { uid: ul-28, type: slate }
  - { uid: p-29, type: slate }
  - { uid: img-30, type: image }
  - { uid: h-31, type: slate }
  - { uid: p-32, type: slate }
  - { uid: h-33, type: slate }
  - { uid: p-34, type: slate }
prototypes: |
  <block type="title" _="${h1}" />
  <block type="slate" value="${p|h*|ul|ol|blockquote/slate}" />
  <block type="image" description="${p/text}" url="${img/src}" alt="${img/alt}" align="center" size="l" image_field="image" title="Image" />
  <block type="image" url="${img/src}" alt="${img/alt}" align="center" size="l" image_field="image" title="Image" />
  <block type="slateTable">
    <region name="table.rows">
      <block type="row">
        <region name="cells">
          <block type="cell" value="${td/slate}" />
        </region>
      </block>
    </region>
  </block>
  <block type="codeExample">
    <region name="tabs" widget="object_list">
      <block type="tab" label="${h3/text}" language="${pre/lang}" code="${pre/text}" />
    </region>
  </block>
---

# 

<block type="slate">

The editor has two modes when a block is selected: **text mode** (you're editing inside the block) and **block mode** (the whole block is selected as a unit).

</block>

## Text mode

<block type="slate">

Click on a block in the preview. If the frontend marks any of its fields as inline-editable, the cursor goes into that field and you can start typing.

</block>

- A subtle border appears around the block.
- The field you're editing gets a faint underline.
- The Quanta toolbar appears above the block (formatting, convert-to, delete, etc.).
- The sidebar switches to that block's settings.

<block type="image" url="/docs/images/block-selected" alt="Slate paragraph in text mode — cursor in the field, sidebar showing block's settings." align="center" size="l" />

## Block mode

<block type="slate">

Press `Escape` to leave text editing. The block stays selected, but you're no longer inside any specific field.

</block>

<block type="slate" data='{"value":[{"type":"ul","children":[{"type":"li","children":[{"text":"A full border appears around the block (visually stronger than the text-mode hint)."}]},{"type":"li","children":[{"text":"Keyboard shortcuts now operate on the whole block:"},{"type":"ul","children":[{"type":"li","children":[{"type":"strong","children":[{"text":"Arrow Up / Down"}]},{"text":" — move selection to the previous / next sibling block (container-aware: jumps into and out of containers)."}]},{"type":"li","children":[{"type":"strong","children":[{"text":"Enter"}]},{"text":" — add a new block after this one."}]},{"type":"li","children":[{"type":"strong","children":[{"text":"Delete / Backspace"}]},{"text":" — remove the selected block."}]}]}]}]}]}' />

<block type="slate">

Press `Escape` again to **deselect** (or go up to the parent container if this block is inside one). Each `Escape` walks one step up the hierarchy.

</block>

<block type="image" url="/docs/images/block-mode" alt="Same paragraph in block mode — full blue border, no cursor." align="center" size="l" />

## Multi-selection

<block type="slate">

You can select multiple blocks at once and operate on the group.

</block>

<block type="slateTable" table.fixed table.celled>

| Action | Result |
| --- | --- |
| **Shift+Click** (in block mode) | Select range from currently-selected block to the clicked one |
| **Ctrl+Click / Cmd+Click** (any mode) | Toggle the clicked block in/out of the selection |
| **Shift+Arrow Up/Down** (block mode) | Extend or shrink the selection by one block |
| Plain click | Clears multi-selection, selects only the clicked block |

</block>

<block type="slate">

While multiple blocks are selected:

</block>

- A combined bounding box is drawn around them.
- `Delete` / `Backspace` removes all of them.
- The Quanta toolbar dropdown offers actions that apply to all (e.g. "Wrap in...", see [Containers](containers.md)).
- The sidebar shows the count and lists each selected block by type.

<block type="image" url="/docs/images/multi-select" align="center" size="l" data='{"alt":"Two adjacent paragraphs multi-selected — combined bounding box, sidebar shows \"2 selected\", toolbar shows count badge."}' />

## Selecting from the sidebar

<block type="slate">

The sidebar is the other way to navigate selection — useful when the block you want is offscreen, buried inside a paged container (e.g. a specific slide of a slider), or you just prefer keyboard / pointer nav over hunting in the preview.

</block>

### The parent chain (going up)

<block type="slate">

When a block is selected, the sidebar shows the **chain of parent containers** from the root down to the block — one collapsible section per level. Each level has a `‹` arrow on the left.

</block>

<block type="codeExample">

### Text

```text
‹ Columns          ← click ‹ to deselect (go to page level)
   [Columns settings]
   ‹ Column        ← click ‹ to select Columns
      [Column settings]
      ‹ Text       ← current block, highlighted
         [Text body, …]
```

</block>

<block type="slate">

Click any `‹` arrow to **navigate up** to that level. This does the same thing as pressing `Escape` repeatedly, but visibly — you can see what each parent is named, jump several levels in one click, and edit the parent's own settings (alignment, padding, …) inline without leaving the current selection.

</block>

<block type="image" url="/docs/images/parent-chain" align="center" size="l" data='{"alt":"Sidebar showing parent chain for a slate inside a column inside columns. Three sections each with a `‹` arrow: Columns (\"My Columns Section\"), Column (\"Left Column\"), Text (current, body field shown)."}' />

<block type="slate">

This works for any depth — nested columns, slider with templated children, accordion inside a section inside the page. The chain reflects the real DOM hierarchy.

</block>

### The children list (going down)

<block type="slate">

When a container block is selected, the sidebar shows that container's **children** as a list, one row per child:

</block>

<block type="codeExample">

### Text

```text
Slides                    [+]
⋮⋮  Slide 1                >
⋮⋮  Slide 2                >
⋮⋮  Slide 3                >
```

</block>

- **`⋮⋮` drag handle** — drag to reorder children within the container.
- **`>` drill-in arrow** — selects that child, scrolls the preview to it, switches the sidebar to its settings.
- **`[+]` add button** — opens the BlockChooser to add a new child to that field.

<block type="slate">

If the container has multiple blocks fields (e.g. a header field and a body field), each appears as a separate section with its own children list and add button.

</block>

<block type="image" url="/docs/images/children-list" align="center" size="l" data='{"alt":"Sidebar with a search container selected, showing two children-list sections — Facets (with three facet rows) and Results Listing (with one Listing row). Each row has a `⋮⋮` drag handle and a `>` drill-in arrow; each section has a `+` add button."}' />

### Picking from the outline (for paged containers)

<block type="slate">

Some containers paginate their children — a slider only renders the active slide; an accordion only the expanded panel. Use the children list to pick a slide / panel that's not currently visible — the preview scrolls and pages to it automatically.

</block>

## Selecting page-level fields

<block type="slate">

The page itself has metadata fields (title, description, preview image). Some are inline-editable in the preview (e.g. clicking the rendered `<h1>` to edit the page title); all are editable from the sidebar when no block is selected.

</block>
