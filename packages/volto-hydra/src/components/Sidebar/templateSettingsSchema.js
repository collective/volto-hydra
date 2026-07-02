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

/**
 * A template block's "kind" is the single user-facing choice that replaces the raw
 * fixed + readOnly checkboxes. The four kinds are the (fixed, readOnly) combinations:
 *   fixed-readonly   — locked chrome (logo/branding): can't move, can't edit
 *   movable-readonly — repositionable but not editable
 *   fixed-editable   — a required section: can't move, but content-editable
 *   slot             — a per-page user region (movable + editable)
 */
export const BLOCK_KINDS = [
  { id: 'fixed-readonly', title: 'Fixed, read-only', fixed: true, readOnly: true },
  { id: 'movable-readonly', title: 'Movable, read-only', fixed: false, readOnly: true },
  { id: 'fixed-editable', title: 'Fixed, editable', fixed: true, readOnly: false },
  { id: 'slot', title: 'Slot (user content)', fixed: false, readOnly: false },
];

/** Map a block's (fixed, readOnly) flags to its kind id. Defaults to 'slot'. */
export function blockKindFromFlags(fixed, readOnly) {
  return (
    BLOCK_KINDS.find((k) => k.fixed === !!fixed && k.readOnly === !!readOnly)?.id || 'slot'
  );
}

/** Map a kind id back to its (fixed, readOnly) flags. */
export function blockKindFlags(kind) {
  const k = BLOCK_KINDS.find((x) => x.id === kind);
  return { fixed: k?.fixed ?? false, readOnly: k?.readOnly ?? false };
}

/**
 * The kind choices to offer. Inside a slot the ONLY valid kind is `slot`
 * (fixed-XOR-inside-slot) — a per-page region can't contain fixed/locked template content.
 */
export function blockKindChoices(insideSlot) {
  const kinds = insideSlot ? BLOCK_KINDS.filter((k) => k.id === 'slot') : BLOCK_KINDS;
  return kinds.map((k) => [k.id, k.title]);
}

/**
 * Schema for a template block's settings — a `slotId` plus a single `kind` dropdown that
 * replaces the fixed + readOnly checkboxes. When the block is inside a slot, `kind` offers
 * only `slot`, enforcing fixed-XOR-inside-slot in the UI (the save normalizer backs this up).
 */
export const getTemplateBlockSettingsSchema = ({ insideSlot = false } = {}) => ({
  title: 'Template Block Settings',
  fieldsets: [
    { id: 'default', title: 'Default', fields: [] },
    { id: 'template', title: 'Template Settings', fields: ['slotId', 'kind'] },
  ],
  properties: {
    slotId: {
      title: 'Slot ID',
      description:
        'Identifies where user content goes in the template (e.g., "header", "primary")',
      type: 'string',
    },
    kind: {
      title: 'Block kind',
      description: insideSlot
        ? 'This block is inside a slot, so it can only be user content (a slot).'
        : 'How this block behaves in the template.',
      choices: blockKindChoices(insideSlot),
    },
  },
  required: ['slotId'],
});
