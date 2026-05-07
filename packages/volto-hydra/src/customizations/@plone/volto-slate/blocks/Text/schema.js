// SHADOW of @plone/volto-slate/blocks/Text/schema.
//
// Adds a `value` field at the top of the default fieldset so the slate
// editor's body content is editable from the sidebar (Volto Hydra feature
// — standard Volto edits slate body inline only).
//
// Previously, the value field was added by a `schemaEnhancer` registered
// in volto-hydra/src/index.js. That enhancer ran once per slate block
// during buildBlockPathMap pass 2 — on slate-heavy pages (e.g. 150+
// blocks) the per-instance reruns added measurable latency to slate
// keystrokes. Inlining the field into the schema itself removes the
// need for the enhancer and removes the per-instance work.
//
// The `widget: 'slate'` (JSON) widget is safe to declare in the schema;
// the bug the old enhancer was avoiding was specific to the
// `widget: 'richtext'` (HTML) widget, which corrupted Slate state when
// declared at registration time.
const TextBlockSchema = (data) => {
  const { override_toc } = data;
  return {
    title: 'Advanced settings',
    fieldsets: [
      {
        id: 'default',
        title: 'Default',
        fields: [
          'value',
          'override_toc',
          ...(override_toc ? ['level', 'entry_text'] : []),
        ],
      },
    ],
    properties: {
      value: {
        title: 'Body',
        widget: 'slate',
      },
      override_toc: {
        title: 'Override TOC entry',
        type: 'boolean',
      },
      level: {
        title: 'TOC entry level',
        choices: [
          ['h1', 'h1'],
          ['h2', 'h2'],
          ['h3', 'h3'],
          ['h4', 'h4'],
          ['h5', 'h5'],
          ['h6', 'h6'],
        ],
      },
      entry_text: {
        title: 'Entry text for TOC',
      },
    },
    required: [],
  };
};

export default TextBlockSchema;
