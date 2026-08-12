# blockmd — two-way markdown ⇄ block documents

Reference implementation of the format in `../mcp-content-authoring.md`.
Measured against **all** real content — 74 pages, 1546 blocks, 30 block types.

```
node convert.mjs           # write out/**.md and report round-trip fidelity
node convert.mjs --check   # report only
./dump_schema.sh           # refresh schemas.json from shared-block-schemas.js
```

| | |
|---|---|
| page metadata | **74 / 74 — 100%** |
| block order | **74 / 74 — 100%** |
| blocks (semantic) | **1545 / 1546** |

The round-trip writes each file to disk and parses **that file back**, not the
in-memory string — comparing a string against itself only proves the functions
compose.

Semantic = ignoring empty text leaves and the derived `plaintext`; see
`../blockmd-prototype/FINDINGS.md` for why byte-equality is the wrong bar
(stored slate is inconsistently normalised).

## Design

Two layers, each doing what it is good at.

**1. Frame layer** — a line-anchored scanner for `:::type{attrs}` … `:::`.
This grammar is ours, always block-level, always at line start, so a scanner is
exact and needs no dependency. `::::name` opens a named region: either a
`blocks_layout` region or an `object_list` field.

**2. Prose layer** — `remark` (mdast) ⇄ slate. Markdown parsing is where
hand-rolling goes wrong; the earlier python prototype's regexes lost inline
code, split one list into three, and mangled nested emphasis. Delegated to
`remark-parse` / `remark-stringify` / `remark-gfm`, all already in the tree.

`remark-directive` is deliberately *not* used. Directives here are emitted by
us and always line-anchored, so the scanner is exact, and it avoids adding a
dependency to a repo that pins carefully.

## The format

```markdown
---
title: About
description: Why Inka exists…
review_state: published
UID: aboutinka0000000000000000000001
blocks:                      # the blockMap: ordered uid -> type
  - intro: slate
  - status-grid: gridBlock
---

Plain prose is a slate block. No wrapper.

## So are headings

:::gridBlock{uid="status-grid" headline="Status"}
:::slate{uid="card-1"}
**Built** — the editor, the bridge, the Plone adapter.
:::
:::

:::codeExample{uid="ex-1"}
::::tabs
:::tab{uid="tab-nuxt" label="Nuxt.js" language="vue"}
```field:code vue
<template>…</template>
```
:::
::::
:::
```

**Rules**

| JSON | markdown |
|---|---|
| `blocks_layout` order | document order — needs no syntax |
| block uid | `{uid="…"}`, or the frontmatter `blocks:` map for bare prose |
| `slate` (65% of blocks) | plain markdown |
| scalar field, single line, ≤200 chars | `{key="value"}` attr |
| multi-line string | ` ```field:name lang ` fenced block |
| object/array field | ` ```fields ` JSON escape hatch |
| nested `blocks` | nested `:::`, `::::region` for named regions |
| `object_list` field | `::::field` containing `:::item` — **needs the schema** |
| `plaintext` | derived, never authored |

Multi-line strings get a fence long enough to contain any backtick run inside
them, so a code sample containing ``` still round-trips.

## Why the schema is needed

`object_list` and `object_browser` are indistinguishable in storage — both are
`[{"@id": …}]`:

```
object_list      slider.slides  accordion.panels  codeExample.tabs  form.subblocks
object_browser   button.href    hero.buttonLink   navItem.href      highlight.cta_link
```

`accordion.panels[0]` is a child block; `button.href[0]` is a link to a page.
No shape heuristic survives real content. Without the schema you still get a
lossless round-trip (those fields use the escape hatch) — what you lose is an
agent being able to author `:::accordion` with `:::panel` children.

`shared-block-schemas.js` is incomplete: `teaser.href`, `search.facets` and
`socialLinks.links` are absent, so they fall back to the hatch.

## The one block that doesn't round-trip

`docs/architecture` `ol-26` has two `em` nodes separated only by unspaced text.
That serialises to `*a*outside* the template*`, which no markdown parser can
read back unambiguously — emphasis and strong share the `*` delimiter and there
is nothing to disambiguate against. Switching emphasis to `_` fixes this case
and breaks a worse one (remark emits a broken `&#xNAN;` character reference when
a paragraph *starts* with emphasis), so `*` stays.

Fixable by editing that sentence to put a space around the emphasis. Not worth
special-casing in the parser.

## Content normalised to get here

`normalise-content.mjs` fixed genuine editing debris — these were data quirks,
not format limits, and each is worth fixing at source regardless of markdown:

- **2 `{"type":"a"}` link nodes** where the other 110 use `"link"`.
- **2 empty inline nodes** — an `<em>` or `<strong>` containing no text, which
  renders nothing and serialises to stray asterisks.
- **1 trailing newline** inside a text leaf at the end of a paragraph. Markdown
  cannot express it and it renders as nothing.

One content edit: `docs/index.md` said `Open <https://hydra.pretagov.com>`,
which remark-gfm reads back as an autolink. It is now a proper markdown link,
which it should have been anyway. Note remark-stringify *does* escape the angle
bracket correctly (`\<https\://…`) — gfm's autolink-literal extension matches
the URL regardless, so escaping is not a fix.

## What this does not do yet

- **Write-back into the CMS.** Reading is solved; the MCP's edit loop needs
  id-addressed operations (`edit_blocks`), not whole-page replacement.
- **A mock-API mount.** `scanContentDir` would need a markdown variant. The
  conversion is ready; the wiring is not.
- **Replace `sync.mjs` at deploy.** Production imports a Plone distribution, so
  a markdown→JSON pass still runs. The win is the dev loop and the end of
  generated JSON in git.
