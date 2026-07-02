import { describe, test, expect } from 'vitest';
import { initializeContainerBlock } from './blockPath';

/**
 * An object_list container's seeded child type must use the SAME decision as a blocks_layout
 * container (getEmptyBlockType): defaultBlockType → single allowed type → 'empty' picker.
 *
 * The bug: the object_list branch presumed allowedBlocks[0] when there was no default, so a
 * form (subblocks: object_list, allowedBlocks ['text','textarea','from',…], no default)
 * silently seeded a `text` field instead of a pickable empty — the author never got to
 * choose the field type. The blocks_layout branch already did the right thing (empty →
 * 'empty' picker); this pins the two branches to the same centralized decision.
 */
describe('initializeContainerBlock — object_list seed type mirrors getEmptyBlockType', () => {
  let c = 0;
  const uuid = () => `u-${++c}`;
  const intl = { formatMessage: (m) => m?.defaultMessage || m?.id || '' };
  const mkSchema = (subblocksDef) => ({
    properties: {
      subblocks: { widget: 'object_list', typeField: 'field_type', ...subblocksDef },
    },
  });

  test('multiple allowedBlocks + no default → seeds a pickable empty (not the first type)', () => {
    const schema = mkSchema({ allowedBlocks: ['text', 'textarea', 'from'] });
    const result = initializeContainerBlock({ '@type': 'form' }, {}, uuid, { intl, blockType: 'form' }, schema);
    expect(result.subblocks[0].field_type).toBe('empty');
  });

  test('single allowedBlock → auto-picks it', () => {
    const schema = mkSchema({ allowedBlocks: ['text'] });
    const result = initializeContainerBlock({ '@type': 'form' }, {}, uuid, { intl, blockType: 'form' }, schema);
    expect(result.subblocks[0].field_type).toBe('text');
  });

  test('explicit defaultBlockType → uses it', () => {
    const schema = mkSchema({ allowedBlocks: ['text', 'from'], defaultBlockType: 'textarea' });
    const result = initializeContainerBlock({ '@type': 'form' }, {}, uuid, { intl, blockType: 'form' }, schema);
    expect(result.subblocks[0].field_type).toBe('textarea');
  });
});
