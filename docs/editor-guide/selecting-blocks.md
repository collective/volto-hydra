# Selecting blocks

The editor has two modes when a block is selected: **text mode** (you're editing inside the block) and **block mode** (the whole block is selected as a unit).

## Text mode

Click on a block in the preview. If the frontend marks any of its fields as inline-editable, the cursor goes into that field and you can start typing.

- A subtle border appears around the block.
- The field you're editing gets a faint underline.
- The Quanta toolbar appears above the block (formatting, convert-to, delete, etc.).
- The sidebar switches to that block's settings.

![Slate paragraph in text mode — cursor in the field, sidebar showing block's settings.](_images/block-selected.png)

## Block mode

Press `Escape` to leave text editing. The block stays selected, but you're no longer inside any specific field.

- A full border appears around the block (visually stronger than the text-mode hint).
- Keyboard shortcuts now operate on the whole block:
  - **Arrow Up / Down** — move selection to the previous / next sibling block (container-aware: jumps into and out of containers).
  - **Enter** — add a new block after this one.
  - **Delete / Backspace** — remove the selected block.

Press `Escape` again to **deselect** (or go up to the parent container if this block is inside one). Each `Escape` walks one step up the hierarchy.

![Same paragraph in block mode — full blue border, no cursor.](_images/block-mode.png)

## Multi-selection

You can select multiple blocks at once and operate on the group.

| Action | Result |
|--------|--------|
| **Shift+Click** (in block mode) | Select range from currently-selected block to the clicked one |
| **Ctrl+Click / Cmd+Click** (any mode) | Toggle the clicked block in/out of the selection |
| **Shift+Arrow Up/Down** (block mode) | Extend or shrink the selection by one block |
| Plain click | Clears multi-selection, selects only the clicked block |

While multiple blocks are selected:

- A combined bounding box is drawn around them.
- `Delete` / `Backspace` removes all of them.
- The Quanta toolbar dropdown offers actions that apply to all (e.g. "Wrap in...", see [Containers](containers.md)).
- The sidebar shows the count and lists each selected block by type.

![Two adjacent paragraphs multi-selected — combined bounding box, sidebar shows "2 selected", toolbar shows count badge.](_images/multi-select.png)

```{tip}
Shift+Click in **text mode** doesn't multi-select — that's reserved for normal text-range selection in your browser. Press `Escape` first to enter block mode, then Shift+Click.
Ctrl/Cmd+Click works in either mode.
```

## Selecting from the sidebar

The sidebar's block-list / outline is the other way to select. Click a block in the outline; the preview scrolls to it and selects it. Useful when the block you want is offscreen or buried inside a paged container (e.g. a specific slide of a slider).

## Selecting page-level fields

The page itself has metadata fields (title, description, preview image). Some are inline-editable in the preview (e.g. clicking the rendered `<h1>` to edit the page title); all are editable from the sidebar when no block is selected.
