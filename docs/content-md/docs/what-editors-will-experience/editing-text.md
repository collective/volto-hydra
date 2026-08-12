---
title: Editing text
description: "Click into any text in the preview that's marked inline-editable
  and start typing. There are two kinds of text fields: simple text (like a
  title) and slate (rich text — the body of a paragraph block, descriptions,
  etc.)."
review_state: published
exclude_from_nav: false
subjects: []
language: "##DEFAULT##"
rights: ""
effective: 2025-01-01T00:00:00
expires: null
id: editing-text
UID: docs-what-editors-will-experience-editing-text-001
"@type": Document
blocks:
  - title-1: title
  - p-1: slate
  - h-2: slate
  - p-3: slate
  - h-4: slate
  - p-5: slate
  - ul-6: slate
  - h-7: slate
  - p-8: slate
  - h-9: slate
  - tbl-10: slateTable
  - h-11: slate
  - tbl-12: slateTable
  - h-13: slate
  - p-14: slate
  - h-15: slate
  - p-16: slate
  - img-17: image
  - p-18: slate
  - h-19: slate
  - p-20: slate
  - ul-21: slate
  - p-22: slate
  - h-23: slate
  - p-24: slate
  - h-25: slate
  - ul-26: slate
---

:::title{uid="title-1"}
:::

Click into any text in the preview that's marked inline-editable and start typing. There are two kinds of text fields: **simple text** (like a title) and **slate** (rich text — the body of a paragraph block, descriptions, etc.).

## Simple text

Click and type. `Enter` splits the field into two text blocks (when supported); `Backspace` at the start joins back. That's it.

## Slate (rich text)

Slate fields are richer:

- Select text → the Quanta toolbar shows formatting options.
- Apply marks: **Bold**, *Italic*, ~~Strikethrough~~ via toolbar buttons or keyboard shortcuts.
- Select text and click the link button to attach a URL or pick another page.
- The toolbar also surfaces paragraph-level type changes (heading, list, blockquote, etc.).

## Markdown shortcuts

When you're typing in a slate field, certain markdown patterns are converted automatically:

### Block-level (start of a line, then space)

:::slateTable{uid="tbl-10"}
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
    "key": "tbl-10-r0",
    "cells": [
     {
      "key": "tbl-10-r0c0",
      "type": "header",
      "value": [
       {
        "type": "p",
        "children": [
         {
          "text": "Type"
         }
        ]
       }
      ]
     },
     {
      "key": "tbl-10-r0c1",
      "type": "header",
      "value": [
       {
        "type": "p",
        "children": [
         {
          "text": "Becomes"
         }
        ]
       }
      ]
     }
    ]
   },
   {
    "key": "tbl-10-r1",
    "cells": [
     {
      "key": "tbl-10-r1c0",
      "type": "data",
      "value": [
       {
        "type": "p",
        "children": [
         {
          "type": "code",
          "children": [
           {
            "text": "## "
           }
          ]
         }
        ]
       }
      ]
     },
     {
      "key": "tbl-10-r1c1",
      "type": "data",
      "value": [
       {
        "type": "p",
        "children": [
         {
          "text": "Heading 2"
         }
        ]
       }
      ]
     }
    ]
   },
   {
    "key": "tbl-10-r2",
    "cells": [
     {
      "key": "tbl-10-r2c0",
      "type": "data",
      "value": [
       {
        "type": "p",
        "children": [
         {
          "type": "code",
          "children": [
           {
            "text": "### "
           }
          ]
         }
        ]
       }
      ]
     },
     {
      "key": "tbl-10-r2c1",
      "type": "data",
      "value": [
       {
        "type": "p",
        "children": [
         {
          "text": "Heading 3"
         }
        ]
       }
      ]
     }
    ]
   },
   {
    "key": "tbl-10-r3",
    "cells": [
     {
      "key": "tbl-10-r3c0",
      "type": "data",
      "value": [
       {
        "type": "p",
        "children": [
         {
          "type": "code",
          "children": [
           {
            "text": "> "
           }
          ]
         }
        ]
       }
      ]
     },
     {
      "key": "tbl-10-r3c1",
      "type": "data",
      "value": [
       {
        "type": "p",
        "children": [
         {
          "text": "Blockquote"
         }
        ]
       }
      ]
     }
    ]
   },
   {
    "key": "tbl-10-r4",
    "cells": [
     {
      "key": "tbl-10-r4c0",
      "type": "data",
      "value": [
       {
        "type": "p",
        "children": [
         {
          "type": "code",
          "children": [
           {
            "text": "- "
           }
          ]
         },
         {
          "text": ", "
         },
         {
          "type": "code",
          "children": [
           {
            "text": "+ "
           }
          ]
         },
         {
          "text": ", "
         },
         {
          "type": "code",
          "children": [
           {
            "text": "* "
           }
          ]
         }
        ]
       }
      ]
     },
     {
      "key": "tbl-10-r4c1",
      "type": "data",
      "value": [
       {
        "type": "p",
        "children": [
         {
          "text": "Bulleted list"
         }
        ]
       }
      ]
     }
    ]
   },
   {
    "key": "tbl-10-r5",
    "cells": [
     {
      "key": "tbl-10-r5c0",
      "type": "data",
      "value": [
       {
        "type": "p",
        "children": [
         {
          "type": "code",
          "children": [
           {
            "text": "1. "
           }
          ]
         },
         {
          "text": ", "
         },
         {
          "type": "code",
          "children": [
           {
            "text": "1) "
           }
          ]
         }
        ]
       }
      ]
     },
     {
      "key": "tbl-10-r5c1",
      "type": "data",
      "value": [
       {
        "type": "p",
        "children": [
         {
          "text": "Numbered list"
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

### Inline (around selected/typed text)

:::slateTable{uid="tbl-12"}
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
    "key": "tbl-12-r0",
    "cells": [
     {
      "key": "tbl-12-r0c0",
      "type": "header",
      "value": [
       {
        "type": "p",
        "children": [
         {
          "text": "Type"
         }
        ]
       }
      ]
     },
     {
      "key": "tbl-12-r0c1",
      "type": "header",
      "value": [
       {
        "type": "p",
        "children": [
         {
          "text": "Becomes"
         }
        ]
       }
      ]
     }
    ]
   },
   {
    "key": "tbl-12-r1",
    "cells": [
     {
      "key": "tbl-12-r1c0",
      "type": "data",
      "value": [
       {
        "type": "p",
        "children": [
         {
          "type": "code",
          "children": [
           {
            "text": "`code`"
           }
          ]
         }
        ]
       }
      ]
     },
     {
      "key": "tbl-12-r1c1",
      "type": "data",
      "value": [
       {
        "type": "p",
        "children": [
         {
          "text": "inline code"
         }
        ]
       }
      ]
     }
    ]
   },
   {
    "key": "tbl-12-r2",
    "cells": [
     {
      "key": "tbl-12-r2c0",
      "type": "data",
      "value": [
       {
        "type": "p",
        "children": [
         {
          "type": "code",
          "children": [
           {
            "text": "**bold**"
           }
          ]
         },
         {
          "text": " or "
         },
         {
          "type": "code",
          "children": [
           {
            "text": "__bold__"
           }
          ]
         }
        ]
       }
      ]
     },
     {
      "key": "tbl-12-r2c1",
      "type": "data",
      "value": [
       {
        "type": "p",
        "children": [
         {
          "type": "strong",
          "children": [
           {
            "text": "bold"
           }
          ]
         }
        ]
       }
      ]
     }
    ]
   },
   {
    "key": "tbl-12-r3",
    "cells": [
     {
      "key": "tbl-12-r3c0",
      "type": "data",
      "value": [
       {
        "type": "p",
        "children": [
         {
          "type": "code",
          "children": [
           {
            "text": "*italic*"
           }
          ]
         },
         {
          "text": " or "
         },
         {
          "type": "code",
          "children": [
           {
            "text": "_italic_"
           }
          ]
         }
        ]
       }
      ]
     },
     {
      "key": "tbl-12-r3c1",
      "type": "data",
      "value": [
       {
        "type": "p",
        "children": [
         {
          "type": "em",
          "children": [
           {
            "text": "italic"
           }
          ]
         }
        ]
       }
      ]
     }
    ]
   },
   {
    "key": "tbl-12-r4",
    "cells": [
     {
      "key": "tbl-12-r4c0",
      "type": "data",
      "value": [
       {
        "type": "p",
        "children": [
         {
          "type": "code",
          "children": [
           {
            "text": "~~strikethrough~~"
           }
          ]
         }
        ]
       }
      ]
     },
     {
      "key": "tbl-12-r4c1",
      "type": "data",
      "value": [
       {
        "type": "p",
        "children": [
         {
          "type": "del",
          "children": [
           {
            "text": "strikethrough"
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
 }
}
```
:::

### Backspace-at-start: unwrap

Press `Backspace` at the very start of a heading, list item, or blockquote and it converts back to a plain paragraph. Use this when a markdown shortcut grabbed you a heading you didn't actually want.

## The slash menu

Type `/` at the start of an empty text block to open a menu of block types you can convert to (heading, image, list, your custom blocks, …). Keep typing to filter (`/he` filters to heading); `Enter` picks the highlighted result; `Escape` dismisses without changing anything.

:::image{uid="img-17" align="center" size="l" url="${src}" alt="${alt}"}
![Empty paragraph showing the slash menu listing block types — Accordion, Columns, Description, etc.](/docs/images/slash-menu)
:::

The slash menu changes the block's `@type`. If you wanted to add a *new* block, see [Adding and moving blocks](adding-and-moving-blocks.md) instead.

## Splitting and joining paragraphs

Inside a slate paragraph block:

- `Enter` splits at the cursor — the part after the cursor becomes a new block of the same type.
- `Backspace` at the start of a block joins it with the previous block (text merges, cursor lands at the join point).

These work the same in headings and lists.

## Saving

There's no "save" inside a field — every keystroke is reflected in the page state, and changes are saved when you click the toolbar's **Save** button. Until you save, the green-dot/save indicator shows there are unsaved changes.

## Things you can't do (yet)

- Pasting rich HTML doesn't currently preserve all formatting — pasted text comes in as plain.
- A few markdown shortcuts (`#### ` for h4 etc.) aren't wired up; the supported set is the table above.
- Text-region "make this part read-only" markup isn't yet exposed to editors — frontend developers can mark whole blocks as readonly (see [Templates and layouts](templates-and-layouts.md)).
