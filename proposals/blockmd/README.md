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
| blocks (semantic) | **1494 / 1494 — 100%** |

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
| slate with no markdown form | ` ```field-json:value ` — emitter-verified |
| field with a native spelling | `$ref` into the body (see below) |
| nested `blocks` | nested `:::`, `::::region` for named regions |
| `object_list` field | `::::field` containing `:::item` — **needs the schema** |
| `plaintext` | derived, never authored |

Multi-line strings get a fence long enough to contain any backtick run inside
them, so a code sample containing ``` still round-trips.

## Fields that are markdown

A heading block IS a heading; an image block IS an image. Writing them as
attributes or fenced JSON is the format failing at its one job:

```markdown
:::heading{uid="a0e70eab…" alignment="left" heading=$text tag="h${level}"}
## Button Block
:::

:::image{uid="img-14" align="center" size="l" url=$src alt=$alt}
![Frontend switcher panel — Viewport section…](/docs/images/frontend-switcher)
:::
```

**The document carries its own mapping**, so a reader needs no schema. That is
what lets the mock API serve markdown directly.

An attribute value is a JSON scalar *or* a reference — two spaces that cannot
overlap, because `$src` is not a valid JSON token:

| form | meaning |
|---|---|
| `title="…"` | string literal, always — `title="$5.00"` needs no escape |
| `n=3` `ok=true` `x=null` | that JSON value |
| `url=$src` | reference: the construct's part, type preserved |
| `tag="h${level}"` | interpolation: composes a string, so nothing hardcodes the `h` |
| anything else bare | **error** — it used to become a string, silently |

`$part` searches the body's constructs in order; `$N.part` indexes one. The
part vocabulary belongs to markdown, not to any block type — which is what
keeps this generic:

| construct | parts |
|---|---|
| `## text` | `text`, `level` |
| `![alt](src)` | `src`, `alt` |
| `[label](target)` | `text`, `href` |
| paragraph | `text` |

Interpolation is not invertible in general (`"${a}${b}"` = `"h2"` has several
solutions), so only the *emitter* runs it backwards, and it checks the result
reproduces the stored value. The parser only runs forward. A value the
construct cannot carry — one heading's text ends in a space — keeps its literal
attribute instead of being quietly rewritten.

A `Template` is a kind decided where it appears, never inferred from a string's
contents: source code in a fenced field is full of JS template literals, and
treating those as interpolation rewrote 11 codeExample blocks.

`markdown-roles.json` says which fields have a native spelling. It belongs in
the block schema beside `widget`; it is separate while the shape settles. No
block type is named anywhere in `blockmd.mjs`.

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

## Not all valid slate is expressible in markdown

Slate is the larger language. An editor can legally produce two adjacent `em`
nodes with no gap, a text leaf containing a bare `*`, an emphasis boundary
falling mid-word — structures with no markdown spelling, or whose only spelling
reads back as something else. `docs/architecture` `ol-26` is a real example:

```json
{"text": ", and in *"},
{"type": "em", "children": [{"text": "template edit mode only when…"}]},
{"text": "outside"},
{"type": "em", "children": [{"text": " the template"}]}
```

That is well-formed slate. It is not writable in markdown.

The format does not try to enumerate these cases — that list is unbounded and
any omission is silent data loss. Instead **the emitter checks its own work**:

```js
slateRoundTrips(value)   // slateToMd -> mdToSlate -> compare
```

Prose that survives is written as markdown. Prose that doesn't falls back to
` ```field-json:value `, carrying the slate verbatim. Losslessness is therefore
a property of the design, not a number we measured and hope holds on the next
document.

**15 of 1546 blocks (1%) take the fallback** — 14 empty paragraphs (nothing
cannot be read back as a block) and `ol-26`. The other 99% stay readable
markdown.

An earlier version of this note blamed `ol-26` on `*` being ambiguous between
emphasis and strong. That was wrong: remark disambiguates correctly using
character references (`*inside*outsid&#x65;*&#x20;the template*` reparses
exactly). The real reason is simply that this slate has no markdown form.

Separately, that slate does not match its source — `docs/architecture.md:83`
has well-formed nested emphasis, so `sync.mjs` flattened it on the way in.
Worth fixing at source, but *independent* of the format: the format's job is to
carry whatever slate it is handed, however it got there.

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
