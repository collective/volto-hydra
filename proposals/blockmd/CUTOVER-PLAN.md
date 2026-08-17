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
2. **Stabilize block uids.** Replace sync's positional counter (`p-7`, `ul-6`)
   with heading/slug-derived ids, so hand-edits don't renumber. Must precede the
   freeze.
   - check: editing prose in a page changes only that block's markdown, no id churn.
3. **Freeze markdown as source.** The format files become canonical; stop
   generating them from JSON. One committed markdown tree per side.
   - check: no script writes the markdown tree from JSON anymore.
4. **Loader is the one content path; retire `sync`.** The loader reads the
   format files directly (superseding `sync.mjs`). Route the mock API mounts and
   the docs `/docs` mount through it.
   - check: mock API serves both trees from the markdown; `sync.mjs` deleted.
5. **Deploy from the loader.** Replace `build-distribution-content.mjs`: the
   loader emits the distribution (`__metadata__.json`: `_data_files_`,
   `_blob_files_`, `ordering`, `local_roles`) from the two markdown trees.
   - check: built distribution imports and matches today's served JSON.
6. **Bring marketing to sanity-clean.** Run the normalizer + discovery/sanity on
   `inka-site/content` (14 multi-node slates + any shape issues), so the deployed
   content — not just docs — is covered.
   - check: discovery on the marketing tree is slate/shape 0.
7. **Retire scaffolding.** Delete the committed JSON trees, `sync.mjs`,
   `export-proto`/`export-tree`/`convert`/`check-*`/`normalize-*`, the duplicate
   `content-md`/`content-md-proto` copies — keep one loader + one validator.

## Example-code path (removes the last sync step)

Today `docs/examples/examples/{react,vue,svelte,astro}/` are the source, and
`sync` COPIES their code into the codeExample blocks — the code lives in two
places. Invert it so the markdown is the single source:

```
before:  snippet files (source) --sync--> codeExample blocks (copy)      # duplication
after:   md codeExample (source) --extract--> snippet files (generated)
                                  \--> check-examples reads the md
```

- **check-examples reads the md.** Decode the codeExample blocks via the loader
  (`tabs[].{language, code}`) and run the SAME parsers it already uses (acorn +
  acorn-jsx, `@vue/compiler-sfc`, `@astrojs/compiler`) per tab. Same validation,
  sourced from the markdown, no snippet files needed as input.
- **Generated files for the compiling frontends.** `test-react/App.jsx`,
  `test-vue/App.vue`, `test-astro/.../render.ts` need real files to build; a
  build step extracts each tab's code from the md and writes them as artifacts.

So the codeExample block's code is authored in the md (readable, thanks to the
greedy-bare emit) and everything else derives from it. This means **`sync`
retires fully** — example code was the one apparent exception, and it isn't.

## Deleted at the end

`sync.mjs`, `docs/content/content/**` + `inka-site/content/**` (JSON as source),
`build-distribution-content.mjs`, the prototype scripts, the duplicate md trees,
the hand-authored `docs/examples/examples/**` snippet files (now generated).

## Risks

- **uid stability** (step 2) gates the freeze — do it first.
- **Deploy metadata** (step 5) must generate `__metadata__.json` exactly; the
  agreement check (built distribution == served JSON) is the guard.
- **Marketing coverage** (step 6) — deploy currently ships unchecked site content.
