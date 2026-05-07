// SHADOW of @plone/volto-slate/blocks/Text/DefaultTextBlockEditor.
//
// In Volto Hydra, slate editing happens in the iframe (rendered by the
// user's frontend). The admin renders BlockEdit components inside a hidden
// `display: none` div in ParentBlocksWidget — purely so Volto's normal
// Edit/Sidebar wiring still works for the selected block. Anything the
// upstream DefaultTextBlockEditor draws on the page (the SlateEditor, the
// Dropzone, the BlockChooserButton) is invisible and wasted work.
//
// We trim this component down to just the SidebarPortal contents — the one
// thing that actually surfaces in the UI. That removes:
//   - The inline <SlateEditor> mount (its slate context, useState/useRef/
//     useCallback/useMemo/useEffect chain, and React reconciliation for
//     every keystroke on slate-heavy pages).
//   - The image-upload Dropzone (admin-side feature; iframe-side equivalent
//     would be a separate feature).
//   - The empty-block BlockChooserButton (Hydra has its own block-add UX
//     in the iframe).
//   - useIntersectionObserver, image-upload handlers, slash menu wiring.
//
// The schema is read from the sibling schema.js (also shadowed), which is
// where the `value` field is now declared (replacing the old slate
// schemaEnhancer in volto-hydra/src/index.js).
import React from 'react';
import { Segment } from 'semantic-ui-react';

import SidebarPortal from '@plone/volto/components/manage/Sidebar/SidebarPortal';
import { BlockDataForm } from '@plone/volto/components/manage/Form';

import ShortcutListing from './ShortcutListing';
import MarkdownIntroduction from './MarkdownIntroduction';
import TextBlockSchema from './schema';

export const DefaultTextBlockEditor = (props) => {
  const { block, data, onChangeBlock, selected, formDescription } = props;

  let instructions = data?.instructions?.data || data?.instructions;
  if (!instructions || instructions === '<p><br/></p>') {
    instructions = formDescription;
  }

  const schema = TextBlockSchema(data);

  return (
    <SidebarPortal selected={selected}>
      <div id="slate-plugin-sidebar"></div>
      {instructions ? (
        <Segment attached>
          <div dangerouslySetInnerHTML={{ __html: instructions }} />
        </Segment>
      ) : (
        <>
          <ShortcutListing />
          <MarkdownIntroduction />
          <BlockDataForm
            block={block}
            schema={schema}
            title={schema.title}
            onChangeBlock={onChangeBlock}
            onChangeField={(id, value) => {
              onChangeBlock(block, {
                ...data,
                [id]: value,
              });
            }}
            formData={data}
          />
        </>
      )}
    </SidebarPortal>
  );
};

export default DefaultTextBlockEditor;
