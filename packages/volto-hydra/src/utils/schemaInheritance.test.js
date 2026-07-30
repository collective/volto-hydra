import { describe, test, expect, vi } from 'vitest';

// HydraSchemaContext.js is JSX inside a .js file (the admin build uses babel; vitest
// uses esbuild and can't parse it). The slotId-inheritance path doesn't touch the
// schema context, so stub the module to keep the import graph parseable.
vi.mock('../context', () => ({
  getHydraSchemaContext: () => ({}),
  setHydraSchemaContext: () => {},
  getLiveBlockData: () => undefined,
}));

import {
  applyBlockDefaultsWithContext,
  createSchemaEnhancerFromRecipe,
  getConversionMap,
  validateFieldMappings,
} from './schemaInheritance';
import config from '@plone/volto/registry';

describe('validateFieldMappings — @default accepts any search-metadata field', () => {
  const warnFor = (mapping) => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    validateFieldMappings('blk', { fieldMappings: { '@default': mapping } });
    const warned = spy.mock.calls.length > 0;
    spy.mockRestore();
    return warned;
  };

  test('canonical fields do not warn', () => {
    expect(warnFor({ '@id': 'href', title: 'title', description: 'desc', image: 'img' })).toBe(false);
  });

  test('other search-metadata fields (tags, dates) do not warn', () => {
    // @default keys are whatever a catalog search returns as metadata — not just
    // the canonical four. Subject/created/effective must be accepted.
    expect(warnFor({ title: 'heading', Subject: 'tags', created: 'createdOn', effective: 'publishedOn' })).toBe(false);
  });

  test('block-field names (fieldRules keys) still warn — the guardrail', () => {
    expect(warnFor({ title: 'title', label: 'x', required: 'y' })).toBe(true);
  });
});

/**
 * The store-on-add path: when a block is added into a slot region inside a
 * template, applyBlockDefaultsWithContext must DERIVE the slot from the neighbour
 * it's inserted next to and WRITE it as the new block's stored slotId (plus the
 * template membership). The integration "add + remove columns" test only asserts
 * the column COUNT went up — that would still pass if this path produced
 * `undefined` or the wrong slot, leaving the new column not actually a member of
 * the region. These tests assert the inherited slotId itself.
 */
describe('applyBlockDefaultsWithContext — slotId inheritance on add', () => {
  const intl = { formatMessage: (m) => (m && m.defaultMessage) || '' };

  test('a column added after a slot-region neighbour inherits its stored slotId', () => {
    const allBlocks = {
      'col-1': {
        '@type': 'column',
        slotId: 'cols-slot',
        templateId: '/t/footer',
        templateInstanceId: 'inst-1',
        // not fixed → a real slot member whose slotId should be inherited
      },
    };
    const context = {
      blocksConfig: { column: {} },
      intl,
      allBlocks,
      layoutItems: ['col-1'],
      position: 1, // inserting AFTER col-1 (index 0) → new block lands at index 1
      insertAfter: true,
      containerId: 'cols-1',
      field: 'blocks',
    };

    const result = applyBlockDefaultsWithContext({ '@type': 'column' }, context);

    // The new column is a real member of the slot region: same slotId as its
    // neighbour, and the same template membership — NOT undefined, NOT a fresh slot.
    expect(result.slotId).toBe('cols-slot');
    expect(result.templateId).toBe('/t/footer');
    expect(result.templateInstanceId).toBe('inst-1');
  });

  test('a column added outside any template gets no slotId (no spurious membership)', () => {
    const allBlocks = {
      'plain-1': { '@type': 'column' }, // no templateId → not in a template
    };
    const context = {
      blocksConfig: { column: {} },
      intl,
      allBlocks,
      layoutItems: ['plain-1'],
      position: 1,
      insertAfter: true,
      containerId: 'cols-1',
      field: 'blocks',
    };

    const result = applyBlockDefaultsWithContext({ '@type': 'column' }, context);

    expect(result.slotId).toBeUndefined();
    expect(result.templateId).toBeUndefined();
    expect(result.templateInstanceId).toBeUndefined();
  });

  test('a block added after a FIXED neighbour with nextSlotId inherits that slot + membership', () => {
    // The grid is fixed; the slot after it ("primary") is empty, so the grid carries
    // nextSlotId: "primary". A block added after the grid fills that slot — it must
    // inherit slotId "primary" + the template membership (this is the template-advanced
    // :203 scenario: add into an emptied slot via the fixed neighbour's nextSlotId).
    const allBlocks = {
      'grid-1': {
        '@type': 'gridBlock',
        fixed: true,
        slotId: 'grid',
        nextSlotId: 'primary',
        templateId: '/t/test-layout',
        templateInstanceId: 'inst-1',
      },
    };
    const context = {
      blocksConfig: { slate: {} },
      intl,
      allBlocks,
      items: [allBlocks['grid-1']],
      layoutItems: ['grid-1'],
      position: 1, // inserting AFTER the grid (index 0)
      insertAfter: true,
      containerId: 'page',
      field: 'items',
    };

    const result = applyBlockDefaultsWithContext({ '@type': 'slate' }, context);

    expect(result.slotId).toBe('primary');
    expect(result.templateId).toBe('/t/test-layout');
    expect(result.templateInstanceId).toBe('inst-1');
  });
});

/**
 * fieldRules `contains` operator — array membership.
 *
 * The block schema pattern this enables: a multiselect field (e.g. a card's
 * `elements: ['image', 'date', 'tag']`) that conditionally reveals each
 * element's data field. Without an array-membership operator a multiselect
 * can't drive conditional visibility (isSet only tells you the array is
 * non-empty, not which values it holds). Tested through the public recipe
 * entry, exactly as the frontend sends it.
 */
describe('fieldRules — contains operator (multiselect-driven visibility)', () => {
  const baseSchema = () => ({
    fieldsets: [{ id: 'default', title: 'Default', fields: ['elements', 'date'] }],
    properties: {
      elements: { title: 'Elements', type: 'array' },
      date: { title: 'Date' },
    },
    required: [],
  });

  // Show `date` only when the `elements` multiselect includes 'date'.
  const recipe = {
    fieldRules: {
      date: { when: { elements: { contains: 'date' } }, else: false },
    },
  };

  test('keeps the field when the multiselect array includes the value', () => {
    const enhancer = createSchemaEnhancerFromRecipe(recipe);
    const out = enhancer({
      schema: baseSchema(),
      formData: { elements: ['image', 'date'] },
    });
    expect(out.properties.date).toBeDefined();
    expect(out.fieldsets[0].fields).toContain('date');
  });

  test('hides the field when the multiselect array omits the value', () => {
    const enhancer = createSchemaEnhancerFromRecipe(recipe);
    const out = enhancer({
      schema: baseSchema(),
      formData: { elements: ['image', 'tag'] },
    });
    expect(out.properties.date).toBeUndefined();
    expect(out.fieldsets[0].fields).not.toContain('date');
  });

  test('hides the field when the multiselect is empty or unset', () => {
    const enhancer = createSchemaEnhancerFromRecipe(recipe);
    for (const formData of [{ elements: [] }, {}]) {
      const out = enhancer({ schema: baseSchema(), formData });
      expect(out.properties.date).toBeUndefined();
    }
  });

  // notContains is the inverse: keep the field UNLESS the array holds the value.
  const notContainsRecipe = {
    fieldRules: {
      date: { when: { elements: { notContains: 'date' } }, else: false },
    },
  };

  test('notContains keeps the field when the array omits the value', () => {
    const enhancer = createSchemaEnhancerFromRecipe(notContainsRecipe);
    const out = enhancer({
      schema: baseSchema(),
      formData: { elements: ['image', 'tag'] },
    });
    expect(out.properties.date).toBeDefined();
  });

  test('notContains hides the field when the array holds the value', () => {
    const enhancer = createSchemaEnhancerFromRecipe(notContainsRecipe);
    const out = enhancer({
      schema: baseSchema(),
      formData: { elements: ['image', 'date'] },
    });
    expect(out.properties.date).toBeUndefined();
  });

  test('notContains matches (keeps) when the multiselect is unset', () => {
    // A non-array value contains nothing, so notContains is satisfied.
    const enhancer = createSchemaEnhancerFromRecipe(notContainsRecipe);
    const out = enhancer({ schema: baseSchema(), formData: {} });
    expect(out.properties.date).toBeDefined();
  });
});

describe('fieldRules — oneOf operator (scalar Choice-driven visibility)', () => {
  const baseSchema = () => ({
    fieldsets: [{ id: 'default', title: 'Default', fields: ['colour', 'invert'] }],
    properties: {
      colour: { title: 'Colour' },
      invert: { title: 'Invert', type: 'boolean' },
    },
    required: [],
  });

  // Show `invert` only when the colour is one of the dark set — the inverse of
  // `contains` (the SET is the operand, the field value is a scalar Choice).
  const recipe = {
    fieldRules: {
      invert: {
        when: { colour: { oneOf: ['brand-dark', 'black'] } },
        else: false,
      },
    },
  };

  test('keeps the field when the value is in the set', () => {
    const enhancer = createSchemaEnhancerFromRecipe(recipe);
    const out = enhancer({
      schema: baseSchema(),
      formData: { colour: 'brand-dark' },
    });
    expect(out.properties.invert).toBeDefined();
    expect(out.fieldsets[0].fields).toContain('invert');
  });

  test('hides the field when the value is outside the set', () => {
    const enhancer = createSchemaEnhancerFromRecipe(recipe);
    const out = enhancer({
      schema: baseSchema(),
      formData: { colour: 'off-white' },
    });
    expect(out.properties.invert).toBeUndefined();
    expect(out.fieldsets[0].fields).not.toContain('invert');
  });

  test('hides the field when the value is unset', () => {
    const enhancer = createSchemaEnhancerFromRecipe(recipe);
    const out = enhancer({ schema: baseSchema(), formData: {} });
    expect(out.properties.invert).toBeUndefined();
  });

  // notOneOf is the inverse: keep the field UNLESS the value is in the set.
  const notOneOfRecipe = {
    fieldRules: {
      invert: {
        when: { colour: { notOneOf: ['off-white', 'white'] } },
        else: false,
      },
    },
  };

  test('notOneOf keeps the field when the value is outside the set', () => {
    const enhancer = createSchemaEnhancerFromRecipe(notOneOfRecipe);
    const out = enhancer({
      schema: baseSchema(),
      formData: { colour: 'brand-dark' },
    });
    expect(out.properties.invert).toBeDefined();
  });

  test('notOneOf hides the field when the value is in the set', () => {
    const enhancer = createSchemaEnhancerFromRecipe(notOneOfRecipe);
    const out = enhancer({
      schema: baseSchema(),
      formData: { colour: 'off-white' },
    });
    expect(out.properties.invert).toBeUndefined();
  });

  test('notOneOf keeps the field when the value is unset', () => {
    // An unset value is not in the set, so notOneOf is satisfied.
    const enhancer = createSchemaEnhancerFromRecipe(notOneOfRecipe);
    const out = enhancer({ schema: baseSchema(), formData: {} });
    expect(out.properties.invert).toBeDefined();
  });
});

/**
 * fieldRules `containsAny`/`containsAll` (and their inverses) — a multiselect
 * ARRAY tested against a SET. The multi-value form of `contains`: gate a field
 * on the multiselect sharing any of a set (`containsAny`) or holding all of it
 * (`containsAll`), rather than one value at a time.
 */
describe('fieldRules — containsAny/containsAll operators (multiselect vs a set)', () => {
  const baseSchema = () => ({
    fieldsets: [{ id: 'default', title: 'Default', fields: ['elements', 'target'] }],
    properties: {
      elements: { title: 'Elements', type: 'array' },
      target: { title: 'Target' },
    },
    required: [],
  });
  const recipe = (op, set) => ({
    fieldRules: {
      target: { when: { elements: { [op]: set } }, else: false },
    },
  });
  const shows = (op, set, elements) => {
    const enhancer = createSchemaEnhancerFromRecipe(recipe(op, set));
    const out = enhancer({ schema: baseSchema(), formData: { elements } });
    return out.properties.target !== undefined;
  };
  const showsUnset = (op, set) => {
    const enhancer = createSchemaEnhancerFromRecipe(recipe(op, set));
    return enhancer({ schema: baseSchema(), formData: {} }).properties.target !== undefined;
  };

  test('containsAny: shows when the array shares ANY value with the set', () => {
    expect(shows('containsAny', ['image', 'video'], ['tag', 'image'])).toBe(true);
    expect(shows('containsAny', ['image', 'video'], ['tag', 'date'])).toBe(false);
    expect(showsUnset('containsAny', ['image', 'video'])).toBe(false);
  });

  test('notContainsAny: shows when the array shares NONE with the set', () => {
    expect(shows('notContainsAny', ['image', 'video'], ['tag', 'date'])).toBe(true);
    expect(shows('notContainsAny', ['image', 'video'], ['tag', 'image'])).toBe(false);
    // An unset multiselect shares nothing, so notContainsAny is satisfied.
    expect(showsUnset('notContainsAny', ['image', 'video'])).toBe(true);
  });

  test('containsAll: shows only when the array holds EVERY value in the set', () => {
    expect(shows('containsAll', ['image', 'date'], ['image', 'date', 'tag'])).toBe(true);
    expect(shows('containsAll', ['image', 'date'], ['image', 'tag'])).toBe(false);
    expect(showsUnset('containsAll', ['image', 'date'])).toBe(false);
  });

  test('notContainsAll: shows unless the array holds EVERY value (missing ≥1)', () => {
    expect(shows('notContainsAll', ['image', 'date'], ['image', 'tag'])).toBe(true);
    expect(shows('notContainsAll', ['image', 'date'], ['image', 'date'])).toBe(false);
    // Unset is missing all of them, so notContainsAll is satisfied.
    expect(showsUnset('notContainsAll', ['image', 'date'])).toBe(true);
  });
});

/**
 * fieldRules + `required` — a hidden field must not stay required.
 *
 * A field declared required in the base schema but hidden by a `when` rule is
 * dropped from `required` too: the editor can't supply a value it can't see,
 * and a required-but-absent property would wedge the form. This gives
 * *conditional* required — required exactly when the rule shows the field, e.g.
 * a card's `image` required only when the grid enables the image element.
 */
describe('fieldRules — hidden fields are dropped from required (conditional required)', () => {
  const baseSchema = () => ({
    fieldsets: [{ id: 'default', title: 'Default', fields: ['elements', 'image'] }],
    properties: {
      elements: { title: 'Elements', type: 'array' },
      image: { title: 'Image', widget: 'image' },
    },
    required: ['image'],
  });

  // Show (and thus keep required) `image` only when `elements` includes 'image'.
  const recipe = {
    fieldRules: {
      image: { when: { elements: { contains: 'image' } }, else: false },
    },
  };

  test('keeps the field required when the rule shows it', () => {
    const enhancer = createSchemaEnhancerFromRecipe(recipe);
    const out = enhancer({ schema: baseSchema(), formData: { elements: ['image'] } });
    expect(out.properties.image).toBeDefined();
    expect(out.required).toContain('image');
  });

  test('drops the field from required when the rule hides it', () => {
    const enhancer = createSchemaEnhancerFromRecipe(recipe);
    const out = enhancer({ schema: baseSchema(), formData: { elements: ['date'] } });
    expect(out.properties.image).toBeUndefined();
    expect(out.required).not.toContain('image');
  });

  test('leaves an unrelated always-required field in place', () => {
    const schema = baseSchema();
    schema.required = ['title', 'image'];
    schema.properties.title = { title: 'Title' };
    schema.fieldsets[0].fields.unshift('title');
    const enhancer = createSchemaEnhancerFromRecipe(recipe);
    const out = enhancer({ schema, formData: { elements: [] } });
    expect(out.required).toContain('title'); // no rule → never hidden → stays
    expect(out.required).not.toContain('image'); // hidden → dropped
  });
});

describe('getConversionMap', () => {
  // Edge direction: `X.fieldMappings[Y]` means "X can be built FROM Y", i.e. Y→X.
  // So the edge a→b→c is declared on the TARGETS: b.fieldMappings.a, c.fieldMappings.b.
  const cfg = {
    a: { id: 'a', fieldMappings: {} }, // valid source; reaches b then c
    b: { id: 'b', fieldMappings: { a: { x: 'x' } } }, // a → b
    c: { id: 'c', fieldMappings: { b: { y: 'y' } } }, // b → c
    lone: { id: 'lone' }, // no fieldMappings → not convertible
  };

  test('maps each source type to its full reachable set (BFS)', () => {
    const m = getConversionMap(cfg);
    expect(new Set(m.a)).toEqual(new Set(['b', 'c']));
    expect(new Set(m.b)).toEqual(new Set(['c']));
    expect(m.c || []).toEqual([]);
  });

  test('empties types with no fieldMappings', () => {
    const m = getConversionMap(cfg);
    expect(m.lone || []).toEqual([]);
  });

  test('null/empty config → empty map', () => {
    expect(getConversionMap(null)).toEqual({});
    expect(getConversionMap({})).toEqual({});
  });
});

describe('inheritSchemaFrom — idempotent (no doubled "… Defaults" fieldset)', () => {
  const intl = { formatMessage: (m) => (m && m.defaultMessage) || '' };

  // A grid whose child cards carry a parent-claimed field (`colour`, NOT in the
  // card's fieldMappings['@default']) → the enhancer surfaces it as the grid's
  // "Card Defaults" fieldset. Applying the enhancer twice (pathmap build +
  // sidebar render both run the schemaEnhancer chain) must NOT add it twice.
  test('applying the enhancer twice keeps a single inherited fieldset', () => {
    const prev = config.blocks?.blocksConfig;
    config.blocks = config.blocks || {};
    config.blocks.blocksConfig = {
      grid: { title: 'Grid' },
      card: {
        title: 'Card',
        fieldMappings: { '@default': { title: 'title' } },
        blockSchema: {
          fieldsets: [{ id: 'default', title: 'Default', fields: ['title', 'colour'] }],
          properties: { title: { title: 'Title' }, colour: { title: 'Colour' } },
        },
      },
    };

    const enhancer = createSchemaEnhancerFromRecipe({
      inheritSchemaFrom: { typeField: 'variation', defaultsField: 'itemDefaults' },
    });
    const baseSchema = {
      fieldsets: [{ id: 'default', title: 'Default', fields: ['items', 'variation'] }],
      properties: { items: { title: 'Items' }, variation: { title: 'Item Type' } },
    };
    const formData = { '@type': 'grid', variation: 'card' };

    const once = enhancer({ schema: baseSchema, formData, intl });
    const inheritedOnce = once.fieldsets.filter((fs) => fs.id === 'inherited_fields');
    expect(inheritedOnce).toHaveLength(1);
    expect(inheritedOnce[0].fields).toContain('itemDefaults_colour');

    // Re-apply to the already-enhanced schema — the bug pushed a 2nd fieldset.
    const twice = enhancer({ schema: once, formData, intl });
    expect(
      twice.fieldsets.filter((fs) => fs.id === 'inherited_fields'),
    ).toHaveLength(1);

    config.blocks.blocksConfig = prev;
  });
});

/**
 * OPERATOR × VALUE-TYPE MATRIX.
 *
 * One table mapping every `when` operator against the field-value types it can
 * meet — scalar (string/number), array (object_list / multiselect), blocks_layout
 * regions dict, and unset/empty — with the expected match result. This is the
 * single source of truth for "what does operator X do on field type Y", exercised
 * through the public recipe path exactly as a frontend sends it.
 *
 * Notes the table pins down:
 *  - Numeric ops (gt/gte/lt/lte) COUNT sub-items on arrays and region dicts.
 *  - A value that isn't countable/numeric (a plain string, or an UNSET field)
 *    makes the numeric checks NaN → skipped → the condition passes. In practice a
 *    container field is an empty array/region (count 0), not undefined.
 *  - contains-family require an actual array, so they never match a scalar string.
 *  - isSet treats an empty array/object as "set" (non-null).
 */
describe('fieldRules — operator × value-type matrix', () => {
  const baseSchema = () => ({
    fieldsets: [{ id: 'default', title: 'Default', fields: ['f', 'target'] }],
    properties: { f: { title: 'F' }, target: { title: 'Target' } },
    required: [],
  });
  // Does `target` survive when field `f` holds `value` and the rule is `when f: op`?
  const shows = (op, value) => {
    const recipe = { fieldRules: { target: { when: { f: op }, else: false } } };
    const enhancer = createSchemaEnhancerFromRecipe(recipe);
    const formData = value === undefined ? {} : { f: value };
    return enhancer({ schema: baseSchema(), formData }).properties.target !== undefined;
  };

  // Field-value fixtures spanning the type space.
  const V = {
    str: 'date',
    num: 5,
    numStr: '5',
    empty: '',
    arr: ['image', 'date'], // array (object_list / multiselect), length 2
    arrEmpty: [], // empty array
    region: { items: ['a', 'b'], footer: ['c'] }, // blocks_layout, 3 sub-items
    regionEmpty: { items: [] }, // blocks_layout, 0 sub-items
    obj: { title: 'x' }, // non-region object (widget:'object') — not countable
    unset: undefined,
  };

  // [description, operator, valueKey, expected]
  const cases = [
    // equality — scalars
    ['is: matches scalar', { is: 'date' }, 'str', true],
    ['is: no match', { is: 'x' }, 'str', false],
    ['is: unset', { is: 'date' }, 'unset', false],
    ['isNot: differs', { isNot: 'x' }, 'str', true],
    ['isNot: equal', { isNot: 'date' }, 'str', false],

    // presence — empty array/object are "set" (non-null)
    ['isSet: scalar set', { isSet: true }, 'str', true],
    ['isSet: empty string is unset', { isSet: true }, 'empty', false],
    ['isSet: unset', { isSet: true }, 'unset', false],
    ['isSet: empty array counts as set', { isSet: true }, 'arrEmpty', true],
    ['isNotSet: unset', { isNotSet: true }, 'unset', true],
    ['isNotSet: scalar set', { isNotSet: true }, 'str', false],

    // numeric on scalars
    ['gt: number 5 > 2', { gt: 2 }, 'num', true],
    ['lt: number 5 < 2', { lt: 2 }, 'num', false],
    ['gte: numeric string "5" >= 5', { gte: 5 }, 'numStr', true],
    ['gt: non-numeric string → skipped (matches)', { gt: 0 }, 'str', true],
    ['gt: unset → skipped (matches)', { gt: 0 }, 'unset', true],

    // numeric as COUNT on arrays (object_list / multiselect)
    ['gt: array count 2 > 1', { gt: 1 }, 'arr', true],
    ['gt: array count 2 > 2', { gt: 2 }, 'arr', false],
    ['gte: array count 2 >= 2', { gte: 2 }, 'arr', true],
    ['gt: empty array count 0 > 0', { gt: 0 }, 'arrEmpty', false],
    ['lt: empty array count 0 < 1', { lt: 1 }, 'arrEmpty', true],

    // numeric as COUNT on blocks_layout regions (total across regions)
    ['gte: region count 3 >= 3', { gte: 3 }, 'region', true],
    ['gt: region count 3 > 3', { gt: 3 }, 'region', false],
    ['gt: empty region count 0 > 0', { gt: 0 }, 'regionEmpty', false],
    ['lte: empty region count 0 <= 0', { lte: 0 }, 'regionEmpty', true],
    ['gt: non-region object → skipped (matches)', { gt: 0 }, 'obj', true],

    // contains / notContains — array membership of a single value
    ['contains: array has value', { contains: 'date' }, 'arr', true],
    ['contains: array lacks value', { contains: 'x' }, 'arr', false],
    ['contains: string is not an array → never matches', { contains: 'da' }, 'str', false],
    ['contains: unset', { contains: 'x' }, 'unset', false],
    ['notContains: array lacks', { notContains: 'x' }, 'arr', true],
    ['notContains: array has', { notContains: 'date' }, 'arr', false],
    ['notContains: unset → matches', { notContains: 'x' }, 'unset', true],

    // oneOf / notOneOf — scalar in a set
    ['oneOf: scalar in set', { oneOf: ['date', 'tag'] }, 'str', true],
    ['oneOf: scalar out of set', { oneOf: ['x', 'y'] }, 'str', false],
    ['oneOf: unset', { oneOf: ['date'] }, 'unset', false],
    ['notOneOf: out of set', { notOneOf: ['x'] }, 'str', true],
    ['notOneOf: in set', { notOneOf: ['date'] }, 'str', false],
    ['notOneOf: unset → matches', { notOneOf: ['date'] }, 'unset', true],

    // containsAny / containsAll — array vs a set
    ['containsAny: shares one', { containsAny: ['image', 'x'] }, 'arr', true],
    ['containsAny: shares none', { containsAny: ['x', 'y'] }, 'arr', false],
    ['containsAny: unset', { containsAny: ['image'] }, 'unset', false],
    ['containsAll: has all', { containsAll: ['image', 'date'] }, 'arr', true],
    ['containsAll: missing one', { containsAll: ['image', 'x'] }, 'arr', false],
    ['notContainsAny: shares none', { notContainsAny: ['x'] }, 'arr', true],
    ['notContainsAny: shares one', { notContainsAny: ['image'] }, 'arr', false],
    ['notContainsAll: missing one', { notContainsAll: ['image', 'x'] }, 'arr', true],
    ['notContainsAll: has all', { notContainsAll: ['image', 'date'] }, 'arr', false],
  ];

  test.each(cases)('%s', (_desc, op, key, expected) => {
    expect(shows(op, V[key])).toBe(expected);
  });
});
