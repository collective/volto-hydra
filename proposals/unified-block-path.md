# Unified block/field path grammar — Design Proposal

> **Status: §5 steps 1–2 IMPLEMENTED; step 3 not.** `data-edit-text` uses the
> `/` grammar (object hops descend `widget:'object'`), and the container funnel
> addresses regions by `regionPath` (object prefix) + `region` — the internal
> `dataPath`/`regionPath` split is gone (one representation). Region-by-**id** in
> a path (`content/body/<id>`) and the physical `pathInfo.path` collapse (step 3)
> are not done. The tables below still show the *old* split in the "Today" column
> for contrast; the "Unified path" column is what now ships (minus region-by-id).

## 1. Problem

"Address a piece of content" is expressed **three different ways** today:

- **Block scope** — `data-edit-text` strings: `field` (this block), `../field`
  (parent block), `/field` (page root). Already a filesystem-style path.
- **Field-within-object** — a `.`-dotted tail added for #245: `content.headline`
  descends a `widget:'object'` wrapper to a field.
- **Container region** — an internal **array** descriptor on each block's
  `pathInfo`: `dataPath: ['table','rows']` (object_list array) and
  `regionPath: ['content']` + `region: 'body'` (blocks_layout dict).

Three grammars for the same idea ("go deeper into nested content"). The dotted
tail and the array descriptors both walk objects; they just look different and
can't address the same things. We want **one** path grammar.

## 2. The grammar

A path is a `/`-separated list of segments, resolved **left to right against the
schema**, starting **at the current block** (the `data-block-uid` element that
carries the `data-edit-text`, or the block a container op targets).

```
path        := ['/'] segment ('/' segment)*        // leading '/' = page root
segment     := '..'                                // up one BLOCK (see §3)
             | <name>                              // field name (in an object)
             | <id>                                // child id (in a region)
```

Resolution — at each hop, look at the **current node's schema**:

| current node          | next segment is… | descends to                          |
|-----------------------|------------------|--------------------------------------|
| block / `widget:'object'` | a **field name** | that field (its `schema.properties[name]`) |
| region (`object_list`)    | a **child id**   | the item whose `idField` == id       |
| region (`blocks_layout`)  | a **child id**   | the block with that id in the shared dict |
| value (slate/string/…)    | — (terminal)     | nothing — a value has no sub-path    |

The schema at the node — not the separator — decides whether a segment is a
name or an id, so there is no ambiguity and no second separator. A region is
never traversed by *name* (which item? there are many); an object is never
traversed by *id* (it has named fields). A value is terminal.

## 3. The `..` rule (agreed)

`..` **always means "up to the parent BLOCK"** — never up an object or region
level. Rationale:

- It matches what `..` means **today** (`schemaInheritance` fieldRules,
  `resolveFieldPath`), so **no migration** of existing `../field` references.
- It keeps the axes asymmetric but simple: `/` descends *down* through objects
  and regions; `..` only ever crosses *block* boundaries going up. Within-block
  object nesting has **no "up"** — to reach a sibling field of `content/headline`
  you re-address from the block root (`content/subtitle`), not `../subtitle`.

So: **objects and regions are down-only (via `/`); the block hierarchy is the
up axis (`..`) and the absolute root (`/`).**

## 4. What this replaces

| Today | Unified path |
|-------|--------------|
| `data-edit-text="value"` | `value` (unchanged) |
| `data-edit-text="/title"` | `/title` (unchanged) |
| `data-edit-text="../subtitle"` | `../subtitle` (unchanged) |
| `data-edit-text="content.headline"` (#245 dotted) | `content/headline` |
| container descriptor `dataPath:['table','rows']` | path `table/rows` |
| container descriptor `regionPath:['content'], region:'body'` | path `content/body` |
| a specific child block in a region | `content/body/<block-id>` |

The array `dataPath`/`regionPath` descriptors stop being a separate thing: they
are just the parsed segments of a `/`-path. The walk is already implemented —
`getFieldDefByPath` (schema) and `getAtPath`/`ensureMutablePath` (data) in
`@volto-hydra/helpers` — they'd take the parsed path instead of a pre-baked
array, plus a region hop that resolves a child by id.

## 5. Migration

1. **`data-edit-text` grammar** — ✅ **DONE.** Object-field descent switched from
   `.` to `/`. Renderers emit `content/headline`; `getFieldType`/placeholder/
   nodeId/writeback all split the post-block-scope remainder on `/` via
   `getFieldDefByPath`/`getAtPath` (descend `widget:'object'` only). `..`/`/`
   (block scope) unchanged.
2. **Funnel region-addressing** — ✅ **DONE (minus region-by-id).** The container
   funnel addresses a region by `regionPath` (object prefix) + `region`; the
   object_list array is at `[...regionPath, region]`, blocks_layout on the node at
   `regionPath`. The old `dataPath` field is removed everywhere
   (`buildBlockPathMap`, `getContainerFieldConfig`, `getAllContainerFields`,
   `getChildFields`, the ops, and the shared `getChildBlockEntries`/
   `setChildBlockEntries`). Kept as arrays internally (not stringified) — the
   `/`-grammar is the interface, arrays the impl. The region→**child-by-id** hop
   is **not** added yet (no funnel consumer needs it; see §6).
3. **Physical `pathInfo.path` collapse** — ⬜ **NOT DONE.** Derive the physical
   formData location from a logical path on demand and drop the stored `path`
   arrays. Only worth it if the uniformity beats re-resolving vs array-indexing.

## 6. Constraints / notes

- **Separator is `/`.** A schema field key or a block id must not contain `/`
  (block ids are uuids; schema keys are identifiers — neither does).
- **Region-by-id in `data-edit-text` is rarely needed** — a child block already
  carries its own `data-block-uid` in the DOM, so inline editing addresses it
  directly. Region-by-id mainly pays off in step 2 (unifying the funnel) and for
  template/fieldRules that reference a specific nested block's field.
- **Values stay terminal** on both halves (schema descent stops at non-object;
  data descent naturally returns `undefined` past a value).
