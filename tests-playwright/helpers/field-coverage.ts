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

const seenByType = new Map<string, Set<string>>();
const missingByType = new Map<string, Map<string, string>>();

export function recordSlateFieldContainer(
  blockType: string,
  field: string,
  hasContainer: boolean,
  example: string,
): void {
  if (hasContainer) {
    let set = seenByType.get(blockType);
    if (!set) seenByType.set(blockType, (set = new Set()));
    set.add(field);
  } else {
    let miss = missingByType.get(blockType);
    if (!miss) missingByType.set(blockType, (miss = new Map()));
    // Keep the first example we saw a field missing in, for the diagnostic.
    if (!miss.has(field)) miss.set(field, example);
  }
}

export interface UneditableSlateField {
  blockType: string;
  field: string;
  example: string;
}

// Fields that were missing their edit container in at least one example AND
// never had it in any example of the same block type.
export function slateFieldsNeverEditable(): UneditableSlateField[] {
  const out: UneditableSlateField[] = [];
  for (const [blockType, fields] of missingByType) {
    for (const [field, example] of fields) {
      if (!seenByType.get(blockType)?.has(field)) {
        out.push({ blockType, field, example });
      }
    }
  }
  return out;
}
