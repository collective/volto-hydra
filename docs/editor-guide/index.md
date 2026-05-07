# Editor Guide

This guide is for **content editors** using a Hydra-powered site. It covers how to use the editor — how to select things, edit text, add and move blocks, work with containers and templates — without assuming you know how the site was built.

```{toctree}
:maxdepth: 1

selecting-blocks
editing-text
adding-and-moving-blocks
containers
templates-and-layouts
links-and-media
```

## What you see

The editor screen has three regions:

```text
┌───────────┬──────────────────────────────────┬──────────────┐
│           │                                  │              │
│  Toolbar  │   Live preview (your frontend)   │   Sidebar    │
│           │                                  │              │
│  • Save   │                                  │   Page title │
│  • Pages  │  Click anywhere here to edit.    │   Block list │
│  • Site   │                                  │   Settings   │
│           │                                  │              │
└───────────┴──────────────────────────────────┴──────────────┘
```

- **Toolbar (left)** — saving, navigating to other pages, site settings. Standard Volto.
- **Live preview (centre)** — your actual frontend, running inside an iframe. This is what readers will see. Click directly into the preview to edit.
- **Sidebar (right)** — when no block is selected, lists the page-level fields (title, description, blocks). When a block is selected, shows that block's settings.

## Two ways to edit any field

Most fields can be edited from either side:

- **From the preview** — click the rendered text/image/link directly and start typing or replacing media.
- **From the sidebar** — find the field in the block's settings panel and edit it there.

Sidebar editing is always available. Inline editing depends on the frontend supporting it for that field; some fields show a thin underline when hovered to signal they're inline-editable. Either way the result is the same — there's only one source of truth.

## What's a block?

A block is a discrete piece of page content with a type (slate, image, listing, slider, etc.), a schema (its fields), and a position. Blocks can be added, removed, moved, and configured. Some blocks contain other blocks — those are called **container blocks** (columns, accordion, slider, grids, sections).

The page itself is a list of blocks (sometimes split across multiple regions like header / content / footer). When you click into the preview, you're clicking on a block.

## When in doubt — Escape

Pressing `Escape` is always safe. It progressively backs out:

1. If you're typing in a text field → leaves text editing, the block stays selected.
2. If a block is selected (block mode) → goes up to the parent container.
3. If nothing is selected → no-op.

So `Escape` repeatedly takes you up one level at a time. See [Selecting blocks](selecting-blocks.md) for what selection looks like at each level.
