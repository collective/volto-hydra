// Aggregate slate-field editability across all discovered block examples.
//
// A slate field only needs its [data-edit-text="<field>"] edit container in ONE
// example of a block type — not every one. Some fields are gated by an optional
// synced element (e.g. a card's `description` is only editable when the grid's
// `copy` element is on), so they legitimately render in some examples and not
// others. Requiring the container per-instance false-fails the gated-off ones.
//
// The per-example render check records coverage here instead of throwing; a
// final aggregate test (via slateFieldsNeverEditable) fails only if a field is
// never editable in ANY example of its block type.
//
// This relies on the per-example tests and the aggregate sharing module state,
// i.e. running in one worker. block-sanity's config uses fullyParallel: false,
// so this single spec file stays on one worker and the aggregation is exact.
// Under a fully-parallel config the state splits per worker, but a field that
// renders its container in every example (the norm) is still recorded in every
// worker, so `missing` stays empty and the aggregate can't false-fail — only a
// field editable in *some* examples and split across workers could, and that
// gated pattern only occurs in this project's own (serial) content.

// Editability is the same aggregate contract for every field KIND — slate text
// (`data-edit-text`), media (`data-edit-media`) and links (`data-edit-link`): a
// field only needs its edit annotation in ONE example, since it can be gated by
// an optional synced element or simply empty in some examples. Keyed by kind so a
// `slate` and (hypothetical) `media` field of the same name never collide.
type FieldKind = 'text' | 'media' | 'link';
const keyOf = (kind: FieldKind, blockType: string) => `${kind} ${blockType}`;

const seenByType = new Map<string, Set<string>>();
const missingByType = new Map<string, Map<string, string>>();

/**
 * Record whether a `kind` field of `blockType` was editable (its edit annotation
 * present) in this example. The aggregate (`fieldsNeverEditable`) fails a field
 * only if it was editable in NO example.
 */
export function recordFieldEditable(
  kind: FieldKind,
  blockType: string,
  field: string,
  editable: boolean,
  example: string,
): void {
  const key = keyOf(kind, blockType);
  if (editable) {
    let set = seenByType.get(key);
    if (!set) seenByType.set(key, (set = new Set()));
    set.add(field);
  } else {
    let miss = missingByType.get(key);
    if (!miss) missingByType.set(key, (miss = new Map()));
    // Keep the first example we saw a field missing in, for the diagnostic.
    if (!miss.has(field)) miss.set(field, example);
  }
}

/** Slate-specific alias, preserved for existing call sites (slate → data-edit-text). */
export function recordSlateFieldContainer(
  blockType: string,
  field: string,
  hasContainer: boolean,
  example: string,
): void {
  recordFieldEditable('text', blockType, field, hasContainer, example);
}

export interface UneditableField {
  kind: FieldKind;
  blockType: string;
  field: string;
  example: string;
}
export type UneditableSlateField = UneditableField;

// Fields that were missing their edit annotation in at least one example AND
// never had it in any example of the same block type. Optionally scoped to a kind.
export function fieldsNeverEditable(kind?: FieldKind): UneditableField[] {
  const out: UneditableField[] = [];
  for (const [key, fields] of missingByType) {
    const [k, blockType] = key.split(' ') as [FieldKind, string];
    if (kind && k !== kind) continue;
    for (const [field, example] of fields) {
      if (!seenByType.get(key)?.has(field)) {
        out.push({ kind: k, blockType, field, example });
      }
    }
  }
  return out;
}

/** Slate-specific alias, preserved for existing call sites. */
export function slateFieldsNeverEditable(): UneditableField[] {
  return fieldsNeverEditable('text');
}
