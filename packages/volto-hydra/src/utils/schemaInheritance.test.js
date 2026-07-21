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
} from './schemaInheritance';
import config from '@plone/volto/registry';

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
