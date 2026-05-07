// SHADOW of @plone/volto-slate/blocks/Text/DefaultTextBlockEditor.
//
// This file owns the slate sidebar UX in Volto Hydra:
//
//   - Volto-slate's standard slate edits the body inline. Volto Hydra adds
//     a "Body" field to the sidebar form so the slate body is also editable
//     from the side panel. We read the schema for that form straight from
//     `blocksConfig.slate.schema` (overridden in volto-hydra/src/index.js to
//     prepend `value: { widget: 'slate' }`). Single source of truth for
//     slate's schema — both this sidebar render and buildBlockPathMap read
//     the same thing, so there's no drift.
//
//   - Body field is rendered first; the keyboard-shortcut listing and
//     markdown-introduction help text are rendered below it.
//
//   - We skip the bits of the upstream component that don't apply in Volto
//     Hydra: the inline `<SlateEditor>` (slate editing happens in the
//     iframe, rendered by the user's frontend; the admin only mounts this
//     component inside a `display: none` div, so the editor + slash menu +
//     image dropzone + BlockChooserButton would all be invisible work).
import React from 'react';
import { Segment } from 'semantic-ui-react';

import config from '@plone/volto/registry';
import SidebarPortal from '@plone/volto/components/manage/Sidebar/SidebarPortal';
import { BlockDataForm } from '@plone/volto/components/manage/Form';

import ShortcutListing from './ShortcutListing';
import MarkdownIntroduction from './MarkdownIntroduction';

export const DefaultTextBlockEditor = (props) => {
  const { block, data, onChangeBlock, selected, formDescription, intl } = props;

  let instructions = data?.instructions?.data || data?.instructions;
  if (!instructions || instructions === '<p><br/></p>') {
    instructions = formDescription;
  }

  // Read schema from blocksConfig — same source buildBlockPathMap reads, so
  // pathMap._schemas, the iframe, and this sidebar form all agree.
  const slateConfig = config.blocks.blocksConfig.slate;
  const schema = typeof slateConfig.schema === 'function'
    ? slateConfig.schema({ formData: data, intl })
    : slateConfig.schema;

  return (
    <SidebarPortal selected={selected}>
      <div id="slate-plugin-sidebar"></div>
      {instructions ? (
        <Segment attached>
          <div dangerouslySetInnerHTML={{ __html: instructions }} />
        </Segment>
      ) : (
        <>
          <BlockDataForm
            block={block}
            schema={schema}
            title={schema?.title}
            onChangeBlock={onChangeBlock}
            onChangeField={(id, value) => {
              onChangeBlock(block, {
                ...data,
                [id]: value,
              });
            }}
            formData={data}
          />
          <ShortcutListing />
          <MarkdownIntroduction />
        </>
      )}
    </SidebarPortal>
  );
};

export default DefaultTextBlockEditor;
