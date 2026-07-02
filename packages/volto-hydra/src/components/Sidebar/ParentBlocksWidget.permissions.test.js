import { describe, test, expect } from 'vitest';
import { getTemplateInstanceSchema } from './templateSettingsSchema';

/**
 * Editing a template edits its underlying Plone document, so the editTemplate toggle
 * requires "Modify portal content" on that document (the doc's `can_edit`). When the user
 * lacks it, the toggle is disabled with a permission tooltip rather than hidden.
 */
describe('getTemplateInstanceSchema — editTemplate permission gating', () => {
  test('editTemplate is enabled when the user can edit the template', () => {
    const schema = getTemplateInstanceSchema(null, { canEdit: true });
    expect(schema.properties.editTemplate.disabled).toBeUndefined();
    expect(schema.properties.editTemplate.description).toMatch(/when enabled/i);
  });

  test('editTemplate is disabled with a permission tooltip when the user cannot edit', () => {
    const schema = getTemplateInstanceSchema(null, { canEdit: false });
    expect(schema.properties.editTemplate.disabled).toBe(true);
    expect(schema.properties.editTemplate.description).toMatch(/permission|modify portal content/i);
  });

  test('defaults to editable when canEdit is unspecified (no gating regression)', () => {
    const schema = getTemplateInstanceSchema(null);
    expect(schema.properties.editTemplate.disabled).toBeUndefined();
  });
});
