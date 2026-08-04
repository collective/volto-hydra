# Container ⇄ value conversion (region-crossing path syntax)

## Problem

A container block holds child blocks in a region; a *value* block holds a scalar
field. Some blocks want to switch between the two shapes:

- A **table header cell** should be a *value* block — a single `slate` `value`
  rendered onto the caller's `<th>` (bare DS markup, `data-node-id` forwarded for
  inline editing).
- A **table body cell** should be a *container* — a `blocks` region holding
  slate / image / video.

Position (`headerMode` + row/column index) decides which shape a given cell needs,
so a cell must convert **container → value** and **value → container** losslessly.

`convertContainerBlock` today only maps **region → region** (it funnels each source
region into the same-named target region). `fieldMappings` only maps **scalar
field → scalar field**. Neither can bridge a region and a scalar. This proposal
adds that bridge, plus the path syntax to declare it.

## Design

### 1. Region-crossing path: `<region>/<type|*>/<field>`

The field-path grammar (visual-editing.md#field-path-syntax) stops at a region —
a region's children are separate blocks, so `/` never descends into them and `..`
"never crosses a region level." This adds one segment shape that deliberately
crosses that boundary:

```
items/slate/value     the `value` field of each `slate` child of the `items` region
items/*/value         the `value` field of every child that has one (image/video skipped)
items/*/@type         each child's @type (read-only; useful in a `when`)
```

- `<region>` — an `object_list` or `blocks_layout` field on the block.
- `<type|*>` — a block-type filter; `*` = any type (only children exposing
  `<field>` participate).
- `<field>` — the field read/written on each matched child.

It resolves to an ordered list of `{ childId, field }` targets rather than a single
`{ blockId, fieldName }` — a **multi-target** path. Read-only uses (a `when`
condition) fold the list; conversion uses it to collapse/expand.

### 2. `fieldMappings` value may be a region path

A `fieldMappings` entry's value can now be a region-crossing path, declared once on
the *value* block and used **both directions**:

```js
tableHeaderCell: {                                   // the value block
  blockSchema: { properties: { value: { widget: 'slate' } } },
  fieldMappings: { tableCell: { value: 'items/slate/value' } },
}
```

`value ⟷ tableCell.items[slate].value`.

### 3. Collapse (container → value)

Gather the region-path targets' values. For `slate`, fold them left-to-right with
`mergeSlateWithBlockBackward` (slateTransforms.js) → one merged `value`. **Lossless**
— no "keep the first, drop the rest". If a matched child's value can't be merged
(non-slate reached via `*`), it is dropped **with a warning** (the "no silent caps"
rule). Unmapped scalar fields (`key`, `width`) carry over unchanged.

### 4. Expand (value → container)

Create ONE child in the region — its type is the path's concrete type
(`items/slate/...` → `slate`), or, for `*`, the region's `defaultBlockType` /the
allowed type carrying `<field>`. Set that child's `<field>` = the source value.
A concrete type in the path makes expand unambiguous; that's why the bidirectional
bridge uses `items/slate/value`, not `items/*/value`.

### 5. Engine

`convertContainerBlock` gains two endpoint cases: when a mapping's *target* is a
scalar field, collapse the source region into it; when it's a region path, expand
the source scalar into it. The region-funnel for same-named regions is unchanged.

### 6. The `@type` RULE — position drives an item's type

The bridge converts on demand; a **rule** decides *when*. A typed `object_list`
field may carry a `typeRule`: a `when`-based fieldRule (the same grammar as a schema
fieldRule — `@index`, `../@index`, `../../<field>`, `oneOf`, `lt`, …) whose `set` is
a block-**type name** rather than a field definition:

```js
cells: {
  widget: 'object_list',
  typeField: '@type',
  allowedBlocks: ['tableCell', 'tableHeaderCell'],
  typeRule: [
    { when: { '../../headerMode': { oneOf: ['row', 'both'] }, '../@index': { lt: 1 } }, set: 'tableHeaderCell' },
    { when: { '../../headerMode': { oneOf: ['col', 'both'] }, '@index': { lt: 1 } },     set: 'tableHeaderCell' },
    { set: 'tableCell' },
  ],
}
```

**No new resolver, no new editor plumbing, no public API.** The rule is evaluated in
`applySchemaDefaultsToFormData` — the pass that *already* walks every block on each
mutation, resolves its schema (running the rules), and writes back what changed.
buildBlockPathMap carries the field's `typeRule` onto each typed item's pathMap
entry; the pass re-resolves the target `@type` and, when it differs from the stored
one, calls `convertValueContainer` and writes the converted block back. Because the
target type re-resolves to itself once the item is in place, it settles in one pass —
no oscillation. This is literally "run the rules, see what changed, write it back",
the same mechanism as defaults.

This subsumes the earlier ideas of a `maxLength:1` cap (a header cell is a *different
type* with a single `value`, not a container capped at one) and a bespoke
"normalize cell types" sweep (the generic pass already visits every item). A DnD/paste
of a foreign block still rides the existing membership convert (getConversionMap /
convertBlockInPlace); the `typeRule` covers the position-driven case (a cell whose
*row* moved) that isn't a block-into-container event.

## Scope of this PR

The reusable core: the `<region>/<type|*>/<field>` path resolution, the
`fieldMappings` region-path collapse/expand, the slate merge on collapse, the
`@type` `typeRule` (carried by buildBlockPathMap, enforced in
`applySchemaDefaultsToFormData`), tests, and `docs/custom-blocks.md`.

## Tests

- collapse: a container of N slate children → one merged `value` (order preserved).
- expand: a value → a region with one `slate` child carrying it.
- type filter: `items/slate/value` ignores an image sibling; `*` skips children
  with no such field.
- unmapped scalar fields (`key`, `width`) survive both directions.
- lossy collapse warns when it drops non-mergeable content.
