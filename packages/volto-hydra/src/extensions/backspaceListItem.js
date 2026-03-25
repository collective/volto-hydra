/**
 * Slate editor extension: Backspace at start of a non-first list item
 * demotes it to a paragraph, producing multiple top-level nodes.
 *
 * The block splitting is NOT done here — Form.jsx detects multi-node
 * Slate values and splits them into separate Volto blocks. This keeps
 * the extension pure Slate (no Volto block knowledge).
 *
 * Wraps editor.deleteBackward so it fires from any source: physical
 * keypress, sidebar Slate editor, or synced toolbar (iframe editing).
 */
import { Editor, Range, Transforms, Element } from 'slate';
import config from '@plone/volto/registry';
import { getCurrentListItem } from '@plone/volto-slate/utils/lists';

export const backspaceListItem = (editor) => {
  const { deleteBackward } = editor;

  editor.deleteBackward = (...args) => {
    if (!editor.selection || !Range.isCollapsed(editor.selection)) {
      return deleteBackward(...args);
    }

    const { slate } = config.settings;
    const { anchor } = editor.selection;

    if (anchor.offset !== 0) {
      return deleteBackward(...args);
    }

    const [listItem, listItemPath] = getCurrentListItem(editor);
    console.log('[backspaceListItem]', 'listItem:', listItem?.type, 'path:', JSON.stringify(listItemPath), 'anchor:', JSON.stringify(anchor));
    if (!listItem) {
      return deleteBackward(...args);
    }

    const listItemIndex = listItemPath[listItemPath.length - 1];
    if (listItemIndex === 0) {
      console.log('[backspaceListItem] first li, deferring');
      return deleteBackward(...args);
    }

    // Verify cursor is at the very start of this list item.
    // Can't just compare paths — the cursor might be inside an inline element
    // (link, bold) at offset 0 while Editor.start returns the empty text node
    // before it. Check if there's any text content before the cursor.
    const textBefore = Editor.string(editor, {
      anchor: Editor.start(editor, listItemPath),
      focus: anchor,
    });
    if (textBefore !== '') {
      return deleteBackward(...args);
    }

    // Split the list at this item, then lift and demote.
    // Use withoutNormalizing to prevent Slate from re-merging.
    const listPath = listItemPath.slice(0, -1);
    const defaultType = slate.defaultBlockType || 'p';

    Editor.withoutNormalizing(editor, () => {
      const isList = (n) => Element.isElement(n) && slate.listTypes?.includes(n.type);
      const secondListChildren = editor.children[listPath[0]]?.children?.length || 0;
      const hasItemsAfter = listItemIndex < secondListChildren - 1;

      // Split the list at this li boundary
      Transforms.splitNodes(editor, {
        at: listItemPath,
        match: isList,
        always: true,
      });

      // Second list is now at listPath[last] + 1
      const secondListIdx = listPath[listPath.length - 1] + 1;
      const secondListPath = listPath.length === 1
        ? [secondListIdx]
        : [...listPath.slice(0, -1), secondListIdx];

      // If the second list has more than one item, split again to isolate
      // just the first item (the one being demoted). Items after it stay
      // as a list in a third fragment.
      if (hasItemsAfter) {
        Transforms.splitNodes(editor, {
          at: [...secondListPath, 1], // split at second item of the second list
          match: isList,
          always: true,
        });
      }

      // Now the second list has exactly one li — unwrap and demote it
      Transforms.unwrapNodes(editor, {
        at: secondListPath,
        match: isList,
      });

      // Convert the lifted li to a paragraph
      const liftedNode = editor.children[secondListPath[0]];
      if (liftedNode?.type === slate.listItemType) {
        Transforms.setNodes(editor, { type: defaultType }, { at: secondListPath });
      }
    });

    console.log('[backspaceListItem] after split, children:', JSON.stringify(editor.children.map(c => ({ type: c.type, childCount: c.children?.length }))));
    // Place cursor at start of demoted paragraph
    const newNodeIdx = listPath[listPath.length - 1] + 1;
    const newNodePath = listPath.length === 1
      ? [newNodeIdx]
      : [...listPath.slice(0, -1), newNodeIdx];
    Transforms.select(editor, Editor.start(editor, newNodePath));
  };

  return editor;
};
