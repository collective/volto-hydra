import { describe, test, expect } from 'vitest';
import {
  getTemplateInstanceSchema,
  getTemplateBlockSettingsSchema,
  blockKindFromFlags,
  blockKindFlags,
} from './templateSettingsSchema';

/**
 * Editing a template edits its underlying Plone document, so the editTemplate toggle
 * requires "Modify portal content" on that document (the doc's `can_edit`). When the user
 * lacks it, the toggle is disabled with a permission tooltip rather than hidden.
 */
describe('getTemplateInstanceSchema — editTemplate permission gating', () => {
  test('editTemplate is enabled when the user can edit the template', () => {
    const schema = getTemplateInstanceSchema(null, { canEdit: true });
    expect(schema.properties.editTemplate.isDisabled).toBeUndefined();
    expect(schema.properties.editTemplate.description).toMatch(/when enabled/i);
  });

  test('editTemplate is disabled with a permission tooltip when the user cannot edit', () => {
    const schema = getTemplateInstanceSchema(null, { canEdit: false });
    expect(schema.properties.editTemplate.isDisabled).toBe(true);
    expect(schema.properties.editTemplate.description).toMatch(/permission|modify portal content/i);
  });

  test('defaults to editable when canEdit is unspecified (no gating regression)', () => {
    const schema = getTemplateInstanceSchema(null);
    expect(schema.properties.editTemplate.isDisabled).toBeUndefined();
  });
});

/**
 * A template block's kind is a single dropdown replacing the fixed + readOnly checkboxes.
 * fixed-XOR-inside-slot: inside a slot the only offered kind is `slot`, so you can't make a
 * block fixed or read-only while it's inside a slot.
 */
describe('template block kind — fixed-XOR-inside-slot', () => {
  test('kind maps to (fixed, readOnly) and back', () => {
    expect(blockKindFromFlags(true, true)).toBe('fixed-readonly');
    expect(blockKindFromFlags(false, true)).toBe('movable-readonly');
    expect(blockKindFromFlags(true, false)).toBe('fixed-editable');
    expect(blockKindFromFlags(false, false)).toBe('slot');
    expect(blockKindFlags('fixed-readonly')).toEqual({ fixed: true, readOnly: true });
    expect(blockKindFlags('fixed-editable')).toEqual({ fixed: true, readOnly: false });
    expect(blockKindFlags('slot')).toEqual({ fixed: false, readOnly: false });
  });

  test('outside a slot, all four kinds are offered', () => {
    const schema = getTemplateBlockSettingsSchema({ insideSlot: false });
    const ids = schema.properties.kind.choices.map(([id]) => id);
    expect(ids).toEqual(['fixed-readonly', 'movable-readonly', 'fixed-editable', 'slot']);
  });

  test('inside a slot, the ONLY kind offered is slot (cannot be fixed or read-only)', () => {
    const schema = getTemplateBlockSettingsSchema({ insideSlot: true });
    const ids = schema.properties.kind.choices.map(([id]) => id);
    expect(ids).toEqual(['slot']);
    expect(schema.properties.kind.description).toMatch(/inside a slot/i);
  });
});
