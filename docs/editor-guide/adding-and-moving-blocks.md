# Adding and moving blocks

## Adding a block

Three ways:

### "+" button in the preview

Hover or select a block in the preview. A "+" button appears outside one corner of it (typically below for vertical layouts, to the right for horizontal). Click it to open the **block chooser** — a popup listing the block types allowed at that position.

The chooser is filtered: it only shows block types that fit the surrounding container's `allowedBlocks`. Block types are grouped (Common, Site, Custom, Templates) and typically a "Most used" group is pinned to the top.

### Slash menu (in an empty text block)

Type `/` at the start of an empty text block (a fresh paragraph or a paragraph you've cleared). The slash menu opens with the list of block types you can convert to. Keep typing to filter; `Enter` picks; `Escape` dismisses.

This is the fastest way to add a heading, image, embed, or other block while you're already typing — no mouse needed.

### Enter from a selected block (block mode)

Press `Escape` to enter block mode, then `Enter`. A new block is created **after** the current one, of the most appropriate default type (or the only type allowed in the current container if there's just one).

If the current block is itself a container, `Enter` creates a new container of the same type and the cursor lands inside it on the first typeable leaf — so you can keep typing without aiming. Useful for sliders, columns, accordions: hit `Enter` once and you're already in the next slide / column / panel.

## Moving a block

### Drag and drop

Each selected block has a **drag handle** in the Quanta toolbar above it. Click and drag from there to move the block somewhere else. While dragging:

- A **line indicator** shows where the block will land between siblings.
- A **shaded overlay** highlights the whole drop target when you hover over an empty container — dropping there places the block as the container's first child (replacing the empty placeholder rather than landing as a sibling).
- The page auto-scrolls when you drag near the top or bottom of the viewport.

Drop targets are filtered by `allowedBlocks` — you can't drop into a region that doesn't accept this block type. The line/shade indicator only appears over valid drop targets.

### Cut / copy / paste

Standard keyboard shortcuts work on the selected block(s):

- `Cmd/Ctrl+C` — copy
- `Cmd/Ctrl+X` — cut (block disappears from the original spot when you paste)
- `Cmd/Ctrl+V` — paste at the current selection

This works across pages — copy a block on one page, navigate to another, paste.

### Block-mode keyboard

In block mode (after pressing `Escape`):

| Key | Effect |
|-----|--------|
| `Arrow Up` / `Arrow Down` | Move selection to previous / next sibling |
| `Enter` | Add a new block after this one |
| `Delete` / `Backspace` | Remove the selected block(s) |
| `Escape` | Go up to the parent container (or deselect) |

`Arrow Up/Down` is **container-aware** — it walks across container boundaries. Pressing Down on the last block of a column jumps into the next column rather than getting stuck.

## Working with multiple blocks at once

If you've selected multiple blocks (see [Selecting blocks](selecting-blocks.md)):

- **Drag and drop** — works on the whole group; line indicator shows where the group will land.
- **Delete** — removes all selected blocks.
- **Wrap / Convert / Cut / Copy / Paste** — all apply to the group. See [Containers](containers.md) for wrap.

## Empty containers

Container blocks can never be truly empty — when the last child is deleted, the container shows a placeholder block in its place, with a "+" in the middle for adding the next block. The placeholder is stripped automatically when you save, so it never ends up in the saved page.

Drop a block onto an empty container and it replaces the placeholder rather than landing alongside it.
