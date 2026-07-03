import { describe, test, expect } from 'vitest';
import { initializeContainerBlock } from './blockPath';

/**
 * When a container is created INSIDE A TEMPLATE INSTANCE, the block/field it seeds must inherit
 * the container's template membership (templateInstanceId, fixed). Otherwise the seeded child is
 * not recognized as template content and gets dropped on the next merge — the "field disappears"
 * bug (column → form → field, freshly added in edit mode). Covers both a typed object_list item
 * and a blocks_layout empty child. Same well-formedness that instance-stamping.test.js checks for
 * expanded template content, but at ADD/seed time.
 */
describe('initializeContainerBlock — seeded children inherit template membership', () => {
  let c = 0;
  const uuid = () => `u-${++c}`;
  const intl = { formatMessage: (m) => m?.defaultMessage || m?.id || '' };

  test('object_list: a seeded form field inside a template instance inherits templateInstanceId + fixed', () => {
    const schema = {
      properties: {
        subblocks: { widget: 'object_list', typeField: 'field_type', idField: 'field_id', allowedBlocks: ['text', 'from'] },
      },
    };
    // The form is template content (added inside a template instance).
    const form = { '@type': 'form', templateInstanceId: 'inst-1', templateId: '/t', fixed: true };
    const result = initializeContainerBlock(form, {}, uuid, { intl, blockType: 'form' }, schema);
    const field = result.subblocks[0];
    // eslint-disable-next-line no-console
    console.log('SEEDED FIELD:', JSON.stringify(field));
    expect(field.field_type).toBe('empty');
    expect(field.templateInstanceId).toBe('inst-1');
    expect(field.fixed).toBe(true);
  });

  test('blocks_layout: a seeded empty child inside a template instance inherits templateInstanceId + fixed', () => {
    const schema = { properties: { items: { widget: 'blocks_layout', defaultBlockType: 'slate' } } };
    const container = { '@type': 'column', templateInstanceId: 'inst-1', templateId: '/t', fixed: true };
    const result = initializeContainerBlock(container, {}, uuid, { intl, blockType: 'column' }, schema);
    // eslint-disable-next-line no-console
    console.log('BLOCKS_LAYOUT RESULT:', JSON.stringify(result));
    const child = Object.values(result.blocks || {})[0];
    expect(child, 'container should seed a child').toBeTruthy();
    expect(child.templateInstanceId).toBe('inst-1');
    expect(child.fixed).toBe(true);
  });
});
