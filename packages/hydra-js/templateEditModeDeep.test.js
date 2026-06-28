import { isBlockInEditedTemplateDeep, isBlockReadonlyDeep } from '@volto-hydra/helpers';

/**
 * Template edit mode unlocks a block via a flat predicate
 * (templateInstanceId === editedInstance), which only covers the instance's
 * DIRECT children. Blocks nested in a container belong to a separate nested
 * level with a different id, so they need an ancestry walk — and that walk must
 * stop at a foreign embedded template (each template is its own edit unit).
 *
 * Path map shape (instances are virtual entries; blocks point at them):
 *   _page
 *     X            isTemplateInstance               ("Template: A", edited)
 *       directChild
 *       grid
 *         nestedInst   isTemplateInstance + isNestedTemplateInstance ("Template blocks", same template)
 *           cell
 *         B            isTemplateInstance            ("Template: B", a DIFFERENT embedded template)
 *           cellInB
 */
const map = {
  X: { isTemplateInstance: true, parentId: '_page' },
  directChild: { parentId: 'X' },
  grid: { parentId: 'X' },
  nestedInst: { isTemplateInstance: true, isNestedTemplateInstance: true, parentId: 'grid' },
  cell: { parentId: 'nestedInst' },
  B: { isTemplateInstance: true, parentId: 'grid' },
  cellInB: { parentId: 'B' },
};

describe('isBlockInEditedTemplateDeep — ancestry-aware template-edit unlock', () => {
  test('a direct child of the edited instance is inside it', () => {
    expect(isBlockInEditedTemplateDeep('directChild', map, 'X')).toBe(true);
  });

  test('a block nested in a same-template container is inside it', () => {
    expect(isBlockInEditedTemplateDeep('cell', map, 'X')).toBe(true);
  });

  test('a block inside a foreign embedded template is NOT inside it (stop at the boundary)', () => {
    expect(isBlockInEditedTemplateDeep('cellInB', map, 'X')).toBe(false);
  });

  test('not in template edit mode -> false', () => {
    expect(isBlockInEditedTemplateDeep('cell', map, null)).toBe(false);
  });
});

describe('isBlockReadonlyDeep', () => {
  test('edit mode: editable inside the instance at any depth, locked in a foreign template', () => {
    // readOnly:true would lock it in normal mode, but edit mode unlocks it
    expect(isBlockReadonlyDeep('cell', map, { readOnly: true }, 'X')).toBe(false);
    expect(isBlockReadonlyDeep('cellInB', map, {}, 'X')).toBe(true);
  });

  test('normal mode: falls back to the block.readOnly flag', () => {
    expect(isBlockReadonlyDeep('cell', map, { readOnly: true }, null)).toBe(true);
    expect(isBlockReadonlyDeep('cell', map, { readOnly: false }, null)).toBe(false);
  });
});
