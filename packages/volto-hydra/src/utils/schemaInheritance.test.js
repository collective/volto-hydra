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
} from './schemaInheritance';

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
