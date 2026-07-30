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
  getBlockTypeChoices,
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
 * getBlockTypeChoices computes the type/convert picker's options. Its
 * explicit-blocksField branch reads the container's own field allowedBlocks
 * directly (not the resolved allowedSiblingTypes), so it must apply the same
 * ancestor `disallowDescendantBlocks` restriction — via the shared
 * addableSiblingTypes helper, using the set buildBlockPathMap records on the
 * container entry. Otherwise the type picker could offer a type that add/DnD
 * forbid.
 */
describe('getBlockTypeChoices — respects ancestor disallowDescendantBlocks', () => {
  const intl = { formatMessage: (m) => (m && m.defaultMessage) || '' };
  const blocksConfig = {
    grid: {
      id: 'grid',
      title: 'Grid',
      blockSchema: {
        properties: {
          items: { widget: 'blocks_layout', allowedBlocks: ['card', 'columns'] },
        },
      },
    },
    card: { id: 'card', title: 'Card' },
    columns: { id: 'columns', title: 'Columns' },
  };

  test('subtracts the recorded disallow set from the field allowedBlocks', () => {
    const blockPathMap = {
      'grid-1': { blockType: 'grid', descendantDisallowedTypes: ['columns'] },
    };
    const values = getBlockTypeChoices(
      { blocksField: 'items' },
      blocksConfig,
      blockPathMap,
      'grid-1',
      { '@type': 'grid' },
      intl,
    ).map(([v]) => v);
    expect(values).toContain('card');
    expect(values).not.toContain('columns');
  });

  test('no disallow set → field allowedBlocks unchanged (back-compat)', () => {
    const blockPathMap = { 'grid-1': { blockType: 'grid' } };
    const values = getBlockTypeChoices(
      { blocksField: 'items' },
      blocksConfig,
      blockPathMap,
      'grid-1',
      { '@type': 'grid' },
      intl,
    ).map(([v]) => v);
    expect(values).toEqual(expect.arrayContaining(['card', 'columns']));
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
 * SURFACE MODEL — each field reduces to a comparison surface (string / number /
 * boolean / array) and every operator is valid only for specific surfaces,
 * throwing otherwise. These describes are the single source of truth for
 * "operator X on a Y field". count-vs-compare, membership-vs-substring, etc. are
 * driven by the field's declared type, never the value shape.
 */

// Declare field `f` with `fieldDef`; does `target` survive under `when`?
const runField = (fieldDef, value, when) => {
  const recipe = { fieldRules: { target: { when, else: false } } };
  const enhancer = createSchemaEnhancerFromRecipe(recipe);
  const schema = {
    fieldsets: [{ id: 'default', title: 'Default', fields: ['f', 'target'] }],
    properties: { f: { title: 'F', ...fieldDef }, target: { title: 'Target' } },
    required: [],
  };
  const formData = value === undefined ? {} : { f: value };
  return enhancer({ schema, formData }).properties.target !== undefined;
};

describe('fieldRules — string surface (text / Choice / url)', () => {
  const run = (value, when, fieldDef = {}) => runField(fieldDef, value, when);

  test('is / isNot — exact match; bare value is shorthand for is', () => {
    expect(run('draft', { f: { is: 'draft' } })).toBe(true);
    expect(run('draft', { f: { is: 'live' } })).toBe(false);
    expect(run('draft', { f: { isNot: 'live' } })).toBe(true);
    expect(run('draft', { f: 'draft' })).toBe(true);
    expect(run('draft', { f: 'live' })).toBe(false);
  });

  test('isSet / isNotSet — empty string is unset', () => {
    expect(run('x', { f: { isSet: true } })).toBe(true);
    expect(run('', { f: { isSet: true } })).toBe(false);
    expect(run(undefined, { f: { isSet: true } })).toBe(false);
    expect(run('', { f: { isNotSet: true } })).toBe(true);
  });

  test('oneOf / notOneOf — value in a set', () => {
    expect(run('brand-dark', { f: { oneOf: ['brand-dark', 'black'] } })).toBe(true);
    expect(run('white', { f: { oneOf: ['brand-dark', 'black'] } })).toBe(false);
    expect(run('white', { f: { notOneOf: ['brand-dark'] } })).toBe(true);
  });

  test('contains / notContains — SUBSTRING', () => {
    expect(run('Chapter 3: Intro', { f: { contains: 'Chapter' } })).toBe(true);
    expect(run('Intro', { f: { contains: 'Chapter' } })).toBe(false);
    expect(run('Intro', { f: { notContains: 'Chapter' } })).toBe(true);
    expect(run(undefined, { f: { contains: 'x' } })).toBe(false); // unset → ''
  });

  test('regex / notRegex — pattern, with optional flags', () => {
    expect(run('Chapter 12', { f: { regex: '^Chapter \\d+$' } })).toBe(true);
    expect(run('chapter 12', { f: { regex: '^Chapter' } })).toBe(false); // case-sensitive
    expect(run('chapter 12', { f: { regex: { pattern: '^chapter', flags: 'i' } } })).toBe(true);
    expect(run('Intro', { f: { notRegex: '^Chapter' } })).toBe(true);
  });

  test('array / number ops throw on a string field; invalid regex throws', () => {
    expect(() => run('x', { f: { containsAny: ['a'] } })).toThrow(
      /operator "containsAny" is not valid/i,
    );
    expect(() => run('x', { f: { gt: 1 } })).toThrow(/is not valid/i);
    expect(() => run('x', { f: { regex: '(' } })).toThrow(/invalid pattern/i);
  });
});

describe('fieldRules — slate surface (rich text → plaintext)', () => {
  const nodes = (text) => [{ type: 'p', children: [{ text }] }];
  const run = (text, when) => runField({ widget: 'slate' }, nodes(text), when);

  test('contains / regex read the serialized plaintext', () => {
    expect(run('Hello brave world', { f: { contains: 'brave' } })).toBe(true);
    expect(run('Hello world', { f: { contains: 'brave' } })).toBe(false);
    expect(run('Draft 2026', { f: { regex: '\\d{4}' } })).toBe(true);
  });

  test('isSet — empty slate is unset', () => {
    expect(run('hi', { f: { isSet: true } })).toBe(true);
    expect(runField({ widget: 'slate' }, [], { f: { isSet: true } })).toBe(false);
  });
});

describe('fieldRules — number surface', () => {
  const run = (value, when) => runField({ type: 'integer' }, value, when);

  test('gt/gte/lt/lte compare the number (numeric strings coerce)', () => {
    expect(run(5, { f: { gt: 2 } })).toBe(true);
    expect(run(5, { f: { lt: 2 } })).toBe(false);
    expect(run(5, { f: { gte: 5 } })).toBe(true);
    expect(run('5', { f: { gte: 5 } })).toBe(true);
    expect(runField({ type: 'float' }, 1.5, { f: { gt: 1 } })).toBe(true);
  });

  test('unset / blank → every comparison is false', () => {
    expect(run(undefined, { f: { gt: 0 } })).toBe(false);
    expect(run('', { f: { gte: 1 } })).toBe(false);
  });

  test('is / oneOf — numeric equality / membership; 0 is set', () => {
    expect(run(5, { f: { is: 5 } })).toBe(true);
    expect(run('5', { f: { is: 5 } })).toBe(true);
    expect(run(2, { f: { oneOf: [1, 2, 3] } })).toBe(true);
    expect(run(9, { f: { oneOf: [1, 2, 3] } })).toBe(false);
    expect(run(0, { f: { isSet: true } })).toBe(true);
    expect(run(undefined, { f: { isSet: true } })).toBe(false);
  });

  test('contains / regex throw on a number field', () => {
    expect(() => run(5, { f: { contains: 5 } })).toThrow(/operator "contains" is not valid/i);
    expect(() => run(5, { f: { regex: '5' } })).toThrow(/operator "regex" is not valid/i);
  });
});

describe('fieldRules — boolean surface', () => {
  const run = (value, when) => runField({ type: 'boolean' }, value, when);

  test('is true/false; false is "set"', () => {
    expect(run(true, { f: { is: true } })).toBe(true);
    expect(run(false, { f: { is: true } })).toBe(false);
    expect(run(false, { f: { isSet: true } })).toBe(true);
    expect(run(undefined, { f: { isSet: true } })).toBe(false);
  });
});

describe('fieldRules — multiselect surface (array of values)', () => {
  const run = (value, when) => runField({ type: 'array' }, value, when);

  test('contains / containsAny / containsAll — membership', () => {
    expect(run(['image', 'date'], { f: { contains: 'date' } })).toBe(true);
    expect(run(['image'], { f: { contains: 'date' } })).toBe(false);
    expect(run(['image', 'date'], { f: { containsAny: ['x', 'image'] } })).toBe(true);
    expect(run(['image', 'date'], { f: { containsAll: ['image', 'date'] } })).toBe(true);
    expect(run(['image'], { f: { containsAll: ['image', 'date'] } })).toBe(false);
  });

  test('is / isNot — SET equality (order-independent)', () => {
    expect(run(['image', 'date'], { f: { is: ['date', 'image'] } })).toBe(true);
    expect(run(['image'], { f: { is: ['image', 'date'] } })).toBe(false);
    expect(run(['image', 'date'], { f: { isNot: ['image'] } })).toBe(true);
  });

  test('gt/gte/lt/lte — COUNT the selected values', () => {
    expect(run(['image', 'date'], { f: { gte: 2 } })).toBe(true);
    expect(run(['image'], { f: { gte: 2 } })).toBe(false);
    expect(run([], { f: { gt: 0 } })).toBe(false);
    expect(run(undefined, { f: { gt: 0 } })).toBe(false);
  });

  test('isSet — empty selection is unset', () => {
    expect(run(['image'], { f: { isSet: true } })).toBe(true);
    expect(run([], { f: { isSet: true } })).toBe(false);
  });

  test('oneOf and regex throw on an array field', () => {
    expect(() => run(['image'], { f: { oneOf: ['image', 'date'] } })).toThrow(
      /operator "oneOf" is not valid/i,
    );
    expect(() => run(['image'], { f: { regex: 'x' } })).toThrow(
      /operator "regex" is not valid/i,
    );
  });
});

describe('fieldRules — region surface (child block TYPES, not UIDs)', () => {
  // blocks_layout container: `body` region holds [image, slate, image].
  const blocksLayoutBlock = () => ({
    '@type': 'grid',
    blocks: {
      a: { '@type': 'image' },
      b: { '@type': 'slate' },
      c: { '@type': 'image' },
    },
    blocks_layout: { body: ['a', 'b', 'c'] },
  });
  const runRegion = (when, formData, schema) => {
    const recipe = { fieldRules: { target: { when, else: false } } };
    const enhancer = createSchemaEnhancerFromRecipe(recipe);
    const s = schema || {
      fieldsets: [{ id: 'default', title: 'Default', fields: ['target'] }],
      properties: { target: { title: 'Target' } },
      required: [],
    };
    return enhancer({ schema: s, formData }).properties.target !== undefined;
  };

  test('contains matches on child block TYPE (blocks_layout, by @type)', () => {
    const b = blocksLayoutBlock();
    expect(runRegion({ body: { contains: 'image' } }, b)).toBe(true);
    expect(runRegion({ body: { contains: 'video' } }, b)).toBe(false);
    expect(runRegion({ body: { containsAny: ['video', 'slate'] } }, b)).toBe(true);
    expect(runRegion({ body: { containsAll: ['image', 'slate'] } }, b)).toBe(true);
    expect(runRegion({ body: { containsAll: ['image', 'video'] } }, b)).toBe(false);
  });

  test('gt/gte/lt/lte count the region children', () => {
    const b = blocksLayoutBlock();
    expect(runRegion({ body: { gte: 3 } }, b)).toBe(true);
    expect(runRegion({ body: { gt: 3 } }, b)).toBe(false);
  });

  test('object_list region: contains matches typed item type via typeField', () => {
    const schema = {
      fieldsets: [{ id: 'default', title: 'Default', fields: ['panels', 'target'] }],
      properties: {
        panels: { title: 'Panels', widget: 'object_list', typeField: 'field_type' },
        target: { title: 'Target' },
      },
      required: [],
    };
    const formData = { panels: [{ field_type: 'faq' }, { field_type: 'cta' }] };
    expect(runRegion({ panels: { contains: 'faq' } }, formData, schema)).toBe(true);
    expect(runRegion({ panels: { contains: 'missing' } }, formData, schema)).toBe(false);
    expect(runRegion({ panels: { gte: 2 } }, formData, schema)).toBe(true);
  });
});

/**
 * A numeric operator counts ONE blocks_layout region — the region named by the
 * field path — NOT the sum across all regions. blocks_layout regions aren't schema
 * properties; the region name resolves through the central storage-agnostic reader.
 */
describe('fieldRules — numeric operators count ONE blocks_layout region', () => {
  // Container block: `columns` region has 3 children, `footer` has 1.
  const container = () => ({
    '@type': 'columnsBlock',
    blocks: { c1: {}, c2: {}, c3: {}, f1: {} },
    blocks_layout: { columns: ['c1', 'c2', 'c3'], footer: ['f1'] },
  });
  const shows = (region, op) => {
    const recipe = { fieldRules: { target: { when: { [region]: op }, else: false } } };
    const enhancer = createSchemaEnhancerFromRecipe(recipe);
    const schema = {
      fieldsets: [{ id: 'default', title: 'Default', fields: ['target'] }],
      properties: { target: { title: 'Target' } },
      required: [],
    };
    return enhancer({ schema, formData: container() }).properties.target !== undefined;
  };

  test('counts the named region, independent of sibling regions (not summed)', () => {
    expect(shows('columns', { gte: 3 })).toBe(true); // columns has 3
    expect(shows('columns', { gt: 3 })).toBe(false); // 3, NOT 3+1=4 (would pass if summed)
    expect(shows('footer', { gte: 1 })).toBe(true); // footer has 1
    expect(shows('footer', { gte: 2 })).toBe(false); // 1, NOT the 4-item total
    expect(shows('footer', { gt: 1 })).toBe(false);
  });

  test('an empty blocks_layout region counts 0', () => {
    const recipe = { fieldRules: { target: { when: { sidebar: { gt: 0 } }, else: false } } };
    const enhancer = createSchemaEnhancerFromRecipe(recipe);
    const schema = {
      fieldsets: [{ id: 'default', title: 'Default', fields: ['target'] }],
      properties: { target: { title: 'Target' } },
      required: [],
    };
    const formData = {
      '@type': 'columnsBlock',
      blocks: {},
      blocks_layout: { sidebar: [] },
    };
    expect(enhancer({ schema, formData }).properties.target !== undefined).toBe(
      false,
    );
  });
});
