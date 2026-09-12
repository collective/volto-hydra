---
"@type": Document
UID: docs-what-editors-will-experience-editing-text-001
allow_discussion: false
contributors: []
creators:
  - admin
description: "Click into any text in the preview that's marked inline-editable
  and start typing. There are two kinds of text fields: simple text (like a
  title) and slate (rich text — the body of a paragraph block, descriptions,
  etc.)."
effective: 2025-01-01T00:00:00
exclude_from_nav: false
expires: null
id: editing-text
is_folderish: false
language: "##DEFAULT##"
layout: document_view
preview_caption: null
preview_image: null
review_state: published
rights: ""
subjects: []
title: Editing text
blocks-assignments:
  - { uid: title-1 }
  - { uid: p-1 }
  - { uid: h-2 }
  - { uid: p-3 }
  - { uid: h-4 }
  - { uid: p-5 }
  - { uid: ul-6 }
  - { uid: h-7 }
  - { uid: p-8 }
  - { uid: h-9 }
  - { uid: tbl-10 }
  - { uid: h-11 }
  - { uid: tbl-12 }
  - { uid: h-13 }
  - { uid: p-14 }
  - { uid: h-15 }
  - { uid: p-16 }
  - { uid: img-17 }
  - { uid: p-18 }
  - { uid: h-19 }
  - { uid: p-20 }
  - { uid: ul-21 }
  - { uid: p-22 }
  - { uid: h-23 }
  - { uid: p-24 }
  - { uid: h-25 }
  - { uid: ul-26 }
blocks-matched: |
  <block type="slate" value="${p,h*,ul,ol,blockquote,strong,em/slate}" />
  <block type="title" _="${h1}" />
  <block type="image" description="${p?/text}" url="${img/src}" alt="${img?/alt}" title="${img?/title}" align="center" size="l" />
  <block type="image" url="${img/src}" alt="${img?/alt}" title="${img?/title}" align="center" size="l" />
blocks-tagged: |
  <block type="slateTable">
    <region name="table.rows">
      <block type="row">
        <region name="cells">
          <block type="cell" value="${td/slate}" />
        </region>
      </block>
    </region>
  </block>
---

# Editing text

Click into any text in the preview that's marked inline-editable and start typing. There are two kinds of text fields: **simple text** (like a title) and **slate** (rich text — the body of a paragraph block, descriptions, etc.).

## Simple text

Click and type. `Enter` splits the field into two text blocks (when supported); `Backspace` at the start joins back. That's it.

## Slate (rich text)

Slate fields are richer:

- Select text → the Quanta toolbar shows formatting options.
- Apply marks: **Bold**, *Italic*, \~\~Strikethrough\~\~ via toolbar buttons or keyboard shortcuts.
- Select text and click the link button to attach a URL or pick another page.
- The toolbar also surfaces paragraph-level type changes (heading, list, blockquote, etc.).

## Markdown shortcuts

When you're typing in a slate field, certain markdown patterns are converted automatically:

### Block-level (start of a line, then space)

<block type="slateTable" table.fixed table.celled>

| Type | Becomes |
| --- | --- |
| `## ` | Heading 2 |
| `### ` | Heading 3 |
| `> ` | Blockquote |
| `- `, `+ `, `* ` | Bulleted list |
| `1. `, `1) ` | Numbered list |

</block>

### Inline (around selected/typed text)

<block type="slateTable" table.fixed table.celled>

| Type | Becomes |
| --- | --- |
| \`` `code` `\` | inline code |
| `**bold**` or `__bold__` | **bold** |
| `*italic*` or `_italic_` | *italic* |
| `~~strikethrough~~` | \~\~strikethrough\~\~ |

</block>

### Backspace-at-start: unwrap

Press `Backspace` at the very start of a heading, list item, or blockquote and it converts back to a plain paragraph. Use this when a markdown shortcut grabbed you a heading you didn't actually want.

## The slash menu

Type `/` at the start of an empty text block to open a menu of block types you can convert to (heading, image, list, your custom blocks, …). Keep typing to filter (`/he` filters to heading); `Enter` picks the highlighted result; `Escape` dismisses without changing anything.

<block type="image">

![Empty paragraph showing the slash menu listing block types — Accordion, Columns, Description, etc.](/docs/images/slash-menu)

</block>

The slash menu changes the block's `@type`. If you wanted to add a *new* block, see [Adding and moving blocks](/docs/what-editors-will-experience/adding-and-moving-blocks) instead.

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
- Text-region "make this part read-only" markup isn't yet exposed to editors — frontend developers can mark whole blocks as readonly (see [Templates and layouts](/docs/what-editors-will-experience/templates-and-layouts)).
