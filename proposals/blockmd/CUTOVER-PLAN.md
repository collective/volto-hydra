# blockmd cutover — one format, loader + Sphinx on the same files

## Goal / end state

One markdown format is the source of truth. The **loader** turns it into Plone
content (serving + deploy); **Sphinx** builds the docs from the *same files*. No
committed JSON content trees, no `sync`, no prototype scaffolding.

- `inka-site/` — top-level marketing, authored in the format.
- `docs/` — documentation, authored in the format; Sphinx builds it, and the
  loader includes it at `/docs`.
- Deploy builds the distribution from the loader. CI runs sanity on both trees.

## Key finding (tested 2026-08-17, not assumed)

Sphinx 9.1 + myst 5.1 build the current blockmd format **as-is**:
- heavy frontmatter (`@type`, `UID`, `prototypes`, `assignments`) → dropped as
  metadata, invisible.
- markdown inside `<block …>` tags → fully parsed (Pygments-highlighted code,
  section anchors).
- `<block>` wrappers and `data='{…}'` fallbacks → inert unknown tags, invisible,
  no junk.

So there is **one format**, not a clean-docs/heavy-marketing split. "Make it
Sphinx-clean" is not a prerequisite — only optional cosmetics.

## The format (two readability leans, both mechanical)

1. **Lean frontmatter** — emit only fields that differ from the Plone default or
   can't be derived (drop `expires: null`, `language: "##DEFAULT##"`, empty
   arrays, `is_folderish` when derivable, …).
2. **Hoist prototypes** — one shared prototype set, referenced by pages, instead
   of re-declared in every page's frontmatter.

Neither changes what Sphinx or the loader do; they just make the one file
readable enough to hand/AI-author.

## Cutover steps (each with its check)

1. **Validate Sphinx at scale.** Build *all* `docs/**` new-format pages under
   Sphinx, not one. Fix any real (non-search-index) errors. Optionally add a
   ~10-line extension mapping `<block>`/`<fields>` → passthrough so the inert
   tags disappear from the DOM.
   - check: `sphinx-build` of the full docs tree is clean.
2. **Block uids: derive, don't store; object UIDs: keep stable.** A block uid
   (`p-7`, `ul-6`) is a runtime/internal identity — *not* an identity or match
   key for either deploy path (see step 5), and tests key on block **type**, not
   uid. So stop emitting block uids: the loader derives them deterministically at
   read time (path + type + heading-slug, else position-within-parent). What
   *does* need to be stable is the **content-object UID** (page/folder/blob) — the
   incremental sync uses it for move detection and `resolveuid` links point at it
   — so those stay authored/stable in frontmatter / `subitem-assignments` (largely
   already true; the site tree uses semantic slugs). This **inverts** the old
   "stabilize block uids" step and folds into the freeze (step 3): until we stop
   matching legacy JSON, parity still needs the old uids, so the drop lands *with*
   the freeze, not before it.
   - check: an unrelated prose edit produces no block-uid diff (there are none in
     source) and leaves object UIDs unchanged.
3. **Freeze markdown as source.** The format files become canonical; stop
   generating them from JSON. One committed markdown tree per side.
   - check: no script writes the markdown tree from JSON anymore.
4. **Loader is the one content path; retire `sync`.** The loader reads the
   format files directly (superseding `sync.mjs`). Route the mock API mounts and
   the docs `/docs` mount through it.
   - check: mock API serves both trees from the markdown; `sync.mjs` deleted.
5. **Deploy from the loader — two emitters over one content model.** The loader
   yields a canonical content model (objects: path / `@type` / blocks /
   `blocks_layout`; blobs; order; derived metadata). Deploy is a **pluggable
   emitter** over that model, *not* baked into the loader — so both of pretagov's
   existing deploy paths are consumers of the same output:
   - **Distribution build** — replaces `build-distribution-content.mjs`; emits
     `__metadata__.json` (`_data_files_`, `_blob_files_`, `ordering`,
     `local_roles`). Creates a fresh site (content resets on deploy via
     `plone.distribution`), so nothing to match — block uids are freely derived.
     - check: built distribution imports and matches today's served JSON.
   - **Incremental sync** (`scripts/classify_content_delta.py`) — compares three
     path-keyed `data.json` trees (BASE = last deploy, DISK = HEAD, LIVE = live
     export). Change is a **per-page content hash** (`content_key`, canonical JSON
     minus `VOLATILE`); identity is **path**; object **UID** drives move
     detection. Block uids are not a key here — so to stop derived-uid churn from
     registering as false "changed" (and false clobbers of live editor edits),
     **normalize block uids out of `content_key`** (alongside the existing
     `VOLATILE` stripping) and in `convert-export-to-local.py`'s LIVE
     normalization.
     - task: extend the classifier's normalization to strip block uids.
     - check: an unrelated prose edit classifies **NOOP** for that page (no false
       UPDATE / clobber warning).
6. **Bring marketing to sanity-clean.** Run the normalizer + discovery/sanity on
   `inka-site/content` (14 multi-node slates + any shape issues), so the deployed
   content — not just docs — is covered.
   - check: discovery on the marketing tree is slate/shape 0.
7. **Retire scaffolding.** Delete the committed JSON trees, `sync.mjs`,
   `export-proto`/`export-tree`/`convert`/`check-*`/`normalize-*`, the duplicate
   `content-md`/`content-md-proto` copies — keep one loader + one validator.

## Example-code path (removes the last sync step)

`docs/examples/examples/{react,vue,svelte,astro}/` are the renderer files — one
per block × framework, which the test frontends COMPILE and check-examples
VALIDATES. So they must stay real files (a frontend can't `import` a fence, and
the md documents only a SELECTION, never the full renderer set). Today `sync`
COPIES their code into the codeExample blocks — the duplication to remove.

Fix: the files stay the source; the markdown **references** them, so nothing is
copied. Use Sphinx's native `{literalinclude}`:

```markdown
### React

```{literalinclude} ../../examples/react/ButtonBlock.jsx
:language: jsx
```
```

- **Reference, not copy.** The tab points at the file. Sphinx renders
  `{literalinclude}` (shows the file's code) and the loader resolves the same
  directive into the tab's `code`. **What's shown IS what's compiled and
  tested** — no duplication, never stale, never a stub.
- **check-examples reads the docs.** Decode the codeExample tabs (loader inlines
  each `{literalinclude}`) and run the SAME parsers (acorn+jsx,
  `@vue/compiler-sfc`, `@astrojs/compiler`) per tab.
- **Coverage — every tested renderer must be shown**, one tab per block ×
  framework. Gap today: astro **0/26**, react 10, vue/svelte 4 each. Close it by
  adding the reference tabs.

Rules for the referenced files (they ARE the doc examples):
- **Exhibit the technique** — real field access + `data-block-uid`/`data-edit-*`
  annotations + `slate`/`getImageUrl` usage. Simple != stubbed.
- **Self-contained except three shared primitives**, referenced not shown:
  `getImageUrl` (image), `slate` (SlateNode), `BlockRenderer` (containers only).
  Direct sibling imports route through `BlockRenderer`.

So `sync`'s code-copy is replaced by `{literalinclude}` references — `sync`
retires, the renderer files remain the source, and nothing is duplicated.

Loader change: when a codeExample tab's body is a `{literalinclude}` directive,
read the referenced file for the code (else use the inline fence, for hand-
written doc-only snippets). Sphinx needs no change.

## Deleted at the end

`sync.mjs`, `docs/content/content/**` + `inka-site/content/**` (JSON as source),
`build-distribution-content.mjs`, the prototype scripts, the duplicate md trees.
(The `docs/examples/examples/**` renderer files STAY — they're the source, now
referenced by `{literalinclude}` instead of copied.)

## Risks

- **Object-UID stability** (page/folder/blob — *not* block uids) is what the
  incremental sync's move detection and `resolveuid` links depend on; keep those
  authored/stable. Block uids are loader-derived and normalized out of change
  detection, so they no longer gate anything — the old "stabilize block uids"
  risk is retired.
- **Deploy metadata** (step 5) must generate `__metadata__.json` exactly; the
  agreement check (built distribution == served JSON) is the guard.
- **Marketing coverage** (step 6) — deploy currently ships unchecked site content.
