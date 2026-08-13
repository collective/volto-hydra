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
blocks:
  - title-1: title
  - p-1: slate
  - h-2: slate
  - p-3: slate
  - ul-4: slate
  - img-5: image
  - h-6: slate
  - p-7: slate
  - ul-8: slate
  - p-9: slate
  - img-10: image
  - h-11: slate
  - p-12: slate
  - tbl-13: slateTable
  - p-14: slate
  - ul-15: slate
  - img-16: image
  - h-17: slate
  - p-18: slate
  - h-19: slate
  - p-20: slate
  - ce-21: codeExample
  - p-22: slate
  - img-23: image
  - p-24: slate
  - h-25: slate
  - p-26: slate
  - ce-27: codeExample
  - ul-28: slate
  - p-29: slate
  - img-30: image
  - h-31: slate
  - p-32: slate
  - h-33: slate
  - p-34: slate
---

:::title{uid="title-1"}
:::

The editor has two modes when a block is selected: **text mode** (you're editing inside the block) and **block mode** (the whole block is selected as a unit).

## Text mode

Click on a block in the preview. If the frontend marks any of its fields as inline-editable, the cursor goes into that field and you can start typing.

- A subtle border appears around the block.
- The field you're editing gets a faint underline.
- The Quanta toolbar appears above the block (formatting, convert-to, delete, etc.).
- The sidebar switches to that block's settings.

:::image{uid="img-5" align="center" size="l" url="${src}" alt="${alt}"}
![Slate paragraph in text mode — cursor in the field, sidebar showing block's settings.](/docs/images/block-selected)
:::

## Block mode

Press `Escape` to leave text editing. The block stays selected, but you're no longer inside any specific field.

:::slate{uid="ul-8"}
```field-json:value
[
 {
  "type": "ul",
  "children": [
   {
    "type": "li",
    "children": [
     {
      "text": "A full border appears around the block (visually stronger than the text-mode hint)."
     }
    ]
   },
   {
    "type": "li",
    "children": [
     {
      "text": "Keyboard shortcuts now operate on the whole block:"
     },
     {
      "type": "ul",
      "children": [
       {
        "type": "li",
        "children": [
         {
          "type": "strong",
          "children": [
           {
            "text": "Arrow Up / Down"
           }
          ]
         },
         {
          "text": " — move selection to the previous / next sibling block (container-aware: jumps into and out of containers)."
         }
        ]
       },
       {
        "type": "li",
        "children": [
         {
          "type": "strong",
          "children": [
           {
            "text": "Enter"
           }
          ]
         },
         {
          "text": " — add a new block after this one."
         }
        ]
       },
       {
        "type": "li",
        "children": [
         {
          "type": "strong",
          "children": [
           {
            "text": "Delete / Backspace"
           }
          ]
         },
         {
          "text": " — remove the selected block."
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
:::

Press `Escape` again to **deselect** (or go up to the parent container if this block is inside one). Each `Escape` walks one step up the hierarchy.

:::image{uid="img-10" align="center" size="l" url="${src}" alt="${alt}"}
![Same paragraph in block mode — full blue border, no cursor.](/docs/images/block-mode)
:::

## Multi-selection

You can select multiple blocks at once and operate on the group.

:::slateTable{uid="tbl-13"}
```fields
{
 "table": {
  "fixed": true,
  "compact": false,
  "basic": false,
  "celled": true,
  "inverted": false,
  "striped": false,
  "rows": [
   {
    "key": "tbl-13-r0",
    "cells": [
     {
      "key": "tbl-13-r0c0",
      "type": "header",
      "value": [
       {
        "type": "p",
        "children": [
         {
          "text": "Action"
         }
        ]
       }
      ]
     },
     {
      "key": "tbl-13-r0c1",
      "type": "header",
      "value": [
       {
        "type": "p",
        "children": [
         {
          "text": "Result"
         }
        ]
       }
      ]
     }
    ]
   },
   {
    "key": "tbl-13-r1",
    "cells": [
     {
      "key": "tbl-13-r1c0",
      "type": "data",
      "value": [
       {
        "type": "p",
        "children": [
         {
          "type": "strong",
          "children": [
           {
            "text": "Shift+Click"
           }
          ]
         },
         {
          "text": " (in block mode)"
         }
        ]
       }
      ]
     },
     {
      "key": "tbl-13-r1c1",
      "type": "data",
      "value": [
       {
        "type": "p",
        "children": [
         {
          "text": "Select range from currently-selected block to the clicked one"
         }
        ]
       }
      ]
     }
    ]
   },
   {
    "key": "tbl-13-r2",
    "cells": [
     {
      "key": "tbl-13-r2c0",
      "type": "data",
      "value": [
       {
        "type": "p",
        "children": [
         {
          "type": "strong",
          "children": [
           {
            "text": "Ctrl+Click / Cmd+Click"
           }
          ]
         },
         {
          "text": " (any mode)"
         }
        ]
       }
      ]
     },
     {
      "key": "tbl-13-r2c1",
      "type": "data",
      "value": [
       {
        "type": "p",
        "children": [
         {
          "text": "Toggle the clicked block in/out of the selection"
         }
        ]
       }
      ]
     }
    ]
   },
   {
    "key": "tbl-13-r3",
    "cells": [
     {
      "key": "tbl-13-r3c0",
      "type": "data",
      "value": [
       {
        "type": "p",
        "children": [
         {
          "type": "strong",
          "children": [
           {
            "text": "Shift+Arrow Up/Down"
           }
          ]
         },
         {
          "text": " (block mode)"
         }
        ]
       }
      ]
     },
     {
      "key": "tbl-13-r3c1",
      "type": "data",
      "value": [
       {
        "type": "p",
        "children": [
         {
          "text": "Extend or shrink the selection by one block"
         }
        ]
       }
      ]
     }
    ]
   },
   {
    "key": "tbl-13-r4",
    "cells": [
     {
      "key": "tbl-13-r4c0",
      "type": "data",
      "value": [
       {
        "type": "p",
        "children": [
         {
          "text": "Plain click"
         }
        ]
       }
      ]
     },
     {
      "key": "tbl-13-r4c1",
      "type": "data",
      "value": [
       {
        "type": "p",
        "children": [
         {
          "text": "Clears multi-selection, selects only the clicked block"
         }
        ]
       }
      ]
     }
    ]
   }
  ]
 }
}
```
:::

While multiple blocks are selected:

- A combined bounding box is drawn around them.
- `Delete` / `Backspace` removes all of them.
- The Quanta toolbar dropdown offers actions that apply to all (e.g. "Wrap in...", see [Containers](containers.md)).
- The sidebar shows the count and lists each selected block by type.

:::image{uid="img-16" align="center" size="l" url="${src}" alt="${alt}"}
![Two adjacent paragraphs multi-selected — combined bounding box, sidebar shows "2 selected", toolbar shows count badge.](/docs/images/multi-select)
:::

## Selecting from the sidebar

The sidebar is the other way to navigate selection — useful when the block you want is offscreen, buried inside a paged container (e.g. a specific slide of a slider), or you just prefer keyboard / pointer nav over hunting in the preview.

### The parent chain (going up)

When a block is selected, the sidebar shows the **chain of parent containers** from the root down to the block — one collapsible section per level. Each level has a `‹` arrow on the left.

:::codeExample{uid="ce-21"}
::::tabs[object_list]{repeat="h3" label="${1/text}" language="${2/lang}" code="${2/code}" @ids=["ce-21-text-3d139a"]}
### Text

```text
‹ Columns          ← click ‹ to deselect (go to page level)
   [Columns settings]
   ‹ Column        ← click ‹ to select Columns
      [Column settings]
      ‹ Text       ← current block, highlighted
         [Text body, …]
```
::::
:::

Click any `‹` arrow to **navigate up** to that level. This does the same thing as pressing `Escape` repeatedly, but visibly — you can see what each parent is named, jump several levels in one click, and edit the parent's own settings (alignment, padding, …) inline without leaving the current selection.

:::image{uid="img-23" url="/docs/images/parent-chain" align="center" size="l"}
```field:alt
Sidebar showing parent chain for a slate inside a column inside columns. Three sections each with a `‹` arrow: Columns ("My Columns Section"), Column ("Left Column"), Text (current, body field shown).
```
:::

This works for any depth — nested columns, slider with templated children, accordion inside a section inside the page. The chain reflects the real DOM hierarchy.

### The children list (going down)

When a container block is selected, the sidebar shows that container's **children** as a list, one row per child:

:::codeExample{uid="ce-27"}
::::tabs[object_list]{repeat="h3" label="${1/text}" language="${2/lang}" code="${2/code}" @ids=["ce-27-text-19ff8a"]}
### Text

```text
Slides                    [+]
⋮⋮  Slide 1                >
⋮⋮  Slide 2                >
⋮⋮  Slide 3                >
```
::::
:::

- **`⋮⋮` drag handle** — drag to reorder children within the container.
- **`>` drill-in arrow** — selects that child, scrolls the preview to it, switches the sidebar to its settings.
- **`[+]` add button** — opens the BlockChooser to add a new child to that field.

If the container has multiple blocks fields (e.g. a header field and a body field), each appears as a separate section with its own children list and add button.

:::image{uid="img-30" url="/docs/images/children-list" align="center" size="l"}
```field:alt
Sidebar with a search container selected, showing two children-list sections — Facets (with three facet rows) and Results Listing (with one Listing row). Each row has a `⋮⋮` drag handle and a `>` drill-in arrow; each section has a `+` add button.
```
:::

### Picking from the outline (for paged containers)

Some containers paginate their children — a slider only renders the active slide; an accordion only the expanded panel. Use the children list to pick a slide / panel that's not currently visible — the preview scrolls and pages to it automatically.

## Selecting page-level fields

The page itself has metadata fields (title, description, preview image). Some are inline-editable in the preview (e.g. clicking the rendered `<h1>` to edit the page title); all are editable from the sidebar when no block is selected.
