/**
 * Schema for the "Template Settings" form (title / save location / edit toggle) shown for
 * a top-level template instance in the sidebar. Kept in its own dependency-free module so
 * the permission gating is unit-testable without importing the React/Volto component tree.
 *
 * `canEdit` gates the editTemplate toggle: a template maps to a Plone document, and
 * entering template edit mode edits that document, so it requires "Modify portal content"
 * on it (the doc's `can_edit`). When the user lacks it, the toggle is disabled with a
 * permission tooltip rather than hidden, so the capability stays discoverable.
 */
export const getTemplateInstanceSchema = (intl, { canEdit = true } = {}) => ({
  title: 'Template Settings',
  fieldsets: [
    {
      id: 'default',
      title: 'Default',
      fields: ['title', 'folder', 'editTemplate'],
    },
  ],
  properties: {
    title: {
      title: 'Template Name',
      description: 'Display name for this template',
      type: 'string',
    },
    folder: {
      title: 'Save Location',
      description: 'Folder where this template will be saved',
      widget: 'object_browser',
      mode: 'link',
      selectableTypes: ['Folder'],
      allowExternals: false,
    },
    editTemplate: {
      title: 'Edit Template',
      description: canEdit
        ? 'When enabled, you can edit the template structure. Fixed blocks become editable.'
        : "You don't have permission to modify this template (requires “Modify portal content”).",
      type: 'boolean',
      // Volto's CheckboxWidget disables on `isDisabled` (not `disabled`); schema props are
      // spread to the widget, so this is what actually greys out the toggle.
      ...(canEdit ? {} : { isDisabled: true }),
    },
  },
  required: ['title'],
});
