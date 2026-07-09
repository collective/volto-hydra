import { isBlockInEditedTemplate, isBlockReadonly } from '@volto-hydra/helpers';

/**
 * Template edit mode unlocks a block via the FLAT predicate
 * (templateInstanceId === editedInstance).
 *
 * This used to miss blocks nested in a container — they kept a DIFFERENT id, so a
 * separate ancestry walk (isBlockInEditedTemplateDeep / isBlockReadonlyDeep) was
 * needed, stopping at a foreign embedded template. The merge now STAMPS every
 * block with its RESOLVED instance id: same-template nested content keeps the
 * instance's id, a foreign embedded template starts its OWN id. So the flat check
 * is equivalent to the walk at every depth, and the Deep helpers were removed.
 *
 * Stamped instance ids the merge produces for an edited instance 'X' that embeds
 * a foreign template 'B':
 *   directChild  templateInstanceId 'X'  (direct child)
 *   cell         templateInstanceId 'X'  (nested in a same-template container)
 *   cellInB      templateInstanceId 'B'  (nested inside the foreign template)
 */
describe('isBlockInEditedTemplate — flat unlock on stamped data', () => {
  test('a direct child of the edited instance is inside it', () => {
    expect(isBlockInEditedTemplate({ templateInstanceId: 'X' }, 'X')).toBe(true);
  });

  test('a block nested in a same-template container is inside it (stamped same id)', () => {
    // The merge stamps the nested cell with the instance id 'X' — no walk needed.
    expect(isBlockInEditedTemplate({ templateInstanceId: 'X' }, 'X')).toBe(true);
  });

  test('a block inside a foreign embedded template is NOT inside it (foreign stamped id)', () => {
    expect(isBlockInEditedTemplate({ templateInstanceId: 'B' }, 'X')).toBe(false);
  });

  test('not in template edit mode -> false', () => {
    expect(isBlockInEditedTemplate({ templateInstanceId: 'X' }, null)).toBe(false);
  });
});

describe('isBlockReadonly — flat, on stamped data', () => {
  test('edit mode: editable inside the instance at any depth, locked in a foreign template', () => {
    // readOnly:true would lock it in normal mode, but edit mode unlocks it because
    // its stamped id matches the edited instance.
    expect(isBlockReadonly({ templateInstanceId: 'X', readOnly: true }, 'X')).toBe(false);
    // foreign embedded template (different stamped id) stays locked.
    expect(isBlockReadonly({ templateInstanceId: 'B' }, 'X')).toBe(true);
  });

  test('normal mode: falls back to the block.readOnly flag', () => {
    expect(isBlockReadonly({ readOnly: true }, null)).toBe(true);
    expect(isBlockReadonly({ readOnly: false }, null)).toBe(false);
  });
});
