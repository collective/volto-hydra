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
language: "##DEFAULT##"
layout: document_view
preview_caption: null
preview_image: null
review_state: published
rights: ""
subjects: []
title: Editing text
assignments:
  - { uid: title-1, type: title }
  - { uid: p-1, type: slate }
  - { uid: h-2, type: slate }
  - { uid: p-3, type: slate }
  - { uid: h-4, type: slate }
  - { uid: p-5, type: slate }
  - { uid: ul-6, type: slate }
  - { uid: h-7, type: slate }
  - { uid: p-8, type: slate }
  - { uid: h-9, type: slate }
  - { uid: tbl-10, type: slateTable }
  - { uid: h-11, type: slate }
  - { uid: tbl-12, type: slateTable }
  - { uid: h-13, type: slate }
  - { uid: p-14, type: slate }
  - { uid: h-15, type: slate }
  - { uid: p-16, type: slate }
  - { uid: img-17, type: image }
  - { uid: p-18, type: slate }
  - { uid: h-19, type: slate }
  - { uid: p-20, type: slate }
  - { uid: ul-21, type: slate }
  - { uid: p-22, type: slate }
  - { uid: h-23, type: slate }
  - { uid: p-24, type: slate }
  - { uid: h-25, type: slate }
  - { uid: ul-26, type: slate }
prototypes: |
  <block type="title" _="${h1}" />
  <block type="slate" value="${p|h2|h3|h4|h5|h6|ul|ol|blockquote/slate}" />
  <block type="image" description="${p/text}" url="${img/src}" alt="${img/alt}" align="center" size="l" image_field="image" title="Image" />
  <block type="image" url="${img/src}" alt="${img/alt}" align="center" size="l" image_field="image" title="Image" />
---

# 

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

<block type="slateTable" data='{"table":{"fixed":true,"compact":false,"basic":false,"celled":true,"inverted":false,"striped":false,"rows":[{"key":"tbl-10-r0","cells":[{"key":"tbl-10-r0c0","type":"header","value":[{"type":"p","children":[{"text":"Type"}]}]},{"key":"tbl-10-r0c1","type":"header","value":[{"type":"p","children":[{"text":"Becomes"}]}]}]},{"key":"tbl-10-r1","cells":[{"key":"tbl-10-r1c0","type":"data","value":[{"type":"p","children":[{"type":"code","children":[{"text":"## "}]}]}]},{"key":"tbl-10-r1c1","type":"data","value":[{"type":"p","children":[{"text":"Heading 2"}]}]}]},{"key":"tbl-10-r2","cells":[{"key":"tbl-10-r2c0","type":"data","value":[{"type":"p","children":[{"type":"code","children":[{"text":"### "}]}]}]},{"key":"tbl-10-r2c1","type":"data","value":[{"type":"p","children":[{"text":"Heading 3"}]}]}]},{"key":"tbl-10-r3","cells":[{"key":"tbl-10-r3c0","type":"data","value":[{"type":"p","children":[{"type":"code","children":[{"text":"> "}]}]}]},{"key":"tbl-10-r3c1","type":"data","value":[{"type":"p","children":[{"text":"Blockquote"}]}]}]},{"key":"tbl-10-r4","cells":[{"key":"tbl-10-r4c0","type":"data","value":[{"type":"p","children":[{"type":"code","children":[{"text":"- "}]},{"text":", "},{"type":"code","children":[{"text":"+ "}]},{"text":", "},{"type":"code","children":[{"text":"* "}]}]}]},{"key":"tbl-10-r4c1","type":"data","value":[{"type":"p","children":[{"text":"Bulleted list"}]}]}]},{"key":"tbl-10-r5","cells":[{"key":"tbl-10-r5c0","type":"data","value":[{"type":"p","children":[{"type":"code","children":[{"text":"1. "}]},{"text":", "},{"type":"code","children":[{"text":"1) "}]}]}]},{"key":"tbl-10-r5c1","type":"data","value":[{"type":"p","children":[{"text":"Numbered list"}]}]}]}]}}' />

### Inline (around selected/typed text)

<block type="slateTable" data='{"table":{"fixed":true,"compact":false,"basic":false,"celled":true,"inverted":false,"striped":false,"rows":[{"key":"tbl-12-r0","cells":[{"key":"tbl-12-r0c0","type":"header","value":[{"type":"p","children":[{"text":"Type"}]}]},{"key":"tbl-12-r0c1","type":"header","value":[{"type":"p","children":[{"text":"Becomes"}]}]}]},{"key":"tbl-12-r1","cells":[{"key":"tbl-12-r1c0","type":"data","value":[{"type":"p","children":[{"type":"code","children":[{"text":"`code`"}]}]}]},{"key":"tbl-12-r1c1","type":"data","value":[{"type":"p","children":[{"text":"inline code"}]}]}]},{"key":"tbl-12-r2","cells":[{"key":"tbl-12-r2c0","type":"data","value":[{"type":"p","children":[{"type":"code","children":[{"text":"**bold**"}]},{"text":" or "},{"type":"code","children":[{"text":"__bold__"}]}]}]},{"key":"tbl-12-r2c1","type":"data","value":[{"type":"p","children":[{"type":"strong","children":[{"text":"bold"}]}]}]}]},{"key":"tbl-12-r3","cells":[{"key":"tbl-12-r3c0","type":"data","value":[{"type":"p","children":[{"type":"code","children":[{"text":"*italic*"}]},{"text":" or "},{"type":"code","children":[{"text":"_italic_"}]}]}]},{"key":"tbl-12-r3c1","type":"data","value":[{"type":"p","children":[{"type":"em","children":[{"text":"italic"}]}]}]}]},{"key":"tbl-12-r4","cells":[{"key":"tbl-12-r4c0","type":"data","value":[{"type":"p","children":[{"type":"code","children":[{"text":"~~strikethrough~~"}]}]}]},{"key":"tbl-12-r4c1","type":"data","value":[{"type":"p","children":[{"type":"del","children":[{"text":"strikethrough"}]}]}]}]}]}}' />

### Backspace-at-start: unwrap

Press `Backspace` at the very start of a heading, list item, or blockquote and it converts back to a plain paragraph. Use this when a markdown shortcut grabbed you a heading you didn't actually want.

## The slash menu

Type `/` at the start of an empty text block to open a menu of block types you can convert to (heading, image, list, your custom blocks, …). Keep typing to filter (`/he` filters to heading); `Enter` picks the highlighted result; `Escape` dismisses without changing anything.

<block type="image" url="/docs/images/slash-menu" alt="Empty paragraph showing the slash menu listing block types — Accordion, Columns, Description, etc." align="center" size="l" />

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
