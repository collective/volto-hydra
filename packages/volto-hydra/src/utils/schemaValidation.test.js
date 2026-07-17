import { describe, test, expect } from 'vitest';
import {
  applySchemaDefaultsToBlock,
  applySchemaDefaultsToBlockWithContext,
} from './schemaValidation.mjs';

/**
 * Schema defaults must reach fields nested inside a `widget:'object'` (#245) —
 * a default declared on `content.inneralign` is applied just like a top-level
 * field's. The walk descends objects only; it must NOT recurse into a region
 * (object_list/blocks_layout), whose items are handled elsewhere.
 */
describe('applySchemaDefaultsToBlock — object-nested defaults', () => {
  const schema = {
    properties: {
      align: { default: 'left' },
      content: {
        widget: 'object',
        schema: {
          properties: {
            inneralign: { default: 'center' },
            deep: { widget: 'object', schema: { properties: { size: { default: 'md' } } } },
            // a region nested in the object — must be left untouched
            rows: { widget: 'object_list', schema: { properties: { x: { default: 'NO' } } } },
          },
        },
      },
    },
  };

  test('applies a default to a field inside an object', () => {
    const out = applySchemaDefaultsToBlock({ content: {} }, schema);
    expect(out.content.inneralign).toBe('center');
    expect(out.align).toBe('left'); // top-level still works
  });

  test('applies defaults at arbitrary object depth (content.deep.size)', () => {
    const out = applySchemaDefaultsToBlock({ content: { deep: {} } }, schema);
    expect(out.content.deep.size).toBe('md');
  });

  test('does NOT recurse into a region nested in the object', () => {
    const out = applySchemaDefaultsToBlock(
      { content: { rows: [{ '@id': 'r1' }] } },
      schema,
    );
    // The region's items are containers — defaults must not be stamped into them.
    expect(out.content.rows).toEqual([{ '@id': 'r1' }]);
    expect(out.content.rows[0].x).toBeUndefined();
  });

  test('leaves an already-set nested value alone', () => {
    const out = applySchemaDefaultsToBlock({ content: { inneralign: 'right' } }, schema);
    expect(out.content.inneralign).toBe('right');
  });

  test('unchanged input is returned by identity (no spurious modification)', () => {
    const block = { align: 'left', content: { inneralign: 'center' } };
    expect(applySchemaDefaultsToBlock(block, schema)).toBe(block);
  });

  test('WithContext resolves a function default on a nested field', () => {
    const ctxSchema = {
      properties: {
        content: {
          widget: 'object',
          schema: { properties: { id: { default: (ctx) => ctx.seed } } },
        },
      },
    };
    const out = applySchemaDefaultsToBlockWithContext({ content: {} }, ctxSchema, { seed: 'X1' });
    expect(out.content.id).toBe('X1');
  });
});
