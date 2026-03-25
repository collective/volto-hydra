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
    if (!listItem) {
      return deleteBackward(...args);
    }

    const listItemIndex = listItemPath[listItemPath.length - 1];
    if (listItemIndex === 0) {
      return deleteBackward(...args);
    }

    // Verify cursor is at the very start of this list item
    const start = Editor.start(editor, listItemPath);
    if (
      anchor.offset !== start.offset ||
      anchor.path.join(',') !== start.path.join(',')
    ) {
      return deleteBackward(...args);
    }

    // Split the list at this item, then lift and demote.
    // Use withoutNormalizing to prevent Slate from re-merging.
    const listPath = listItemPath.slice(0, -1);
    const defaultType = slate.defaultBlockType || 'p';

    Editor.withoutNormalizing(editor, () => {
      // Split the list node at this li boundary
      Transforms.splitNodes(editor, {
        at: listItemPath,
        match: (n) => Element.isElement(n) && slate.listTypes?.includes(n.type),
        always: true,
      });

      // Second list is now at listPath[last] + 1
      const secondListIdx = listPath[listPath.length - 1] + 1;
      const secondListPath = listPath.length === 1
        ? [secondListIdx]
        : [...listPath.slice(0, -1), secondListIdx];

      // Unwrap the second list — lifts li children to editor level
      Transforms.unwrapNodes(editor, {
        at: secondListPath,
        match: (n) => Element.isElement(n) && slate.listTypes?.includes(n.type),
      });

      // Convert lifted li nodes to paragraphs
      for (let i = secondListPath[0]; i < editor.children.length; i++) {
        if (editor.children[i]?.type === slate.listItemType) {
          Transforms.setNodes(editor, { type: defaultType }, { at: [i] });
        }
      }
    });

    // Place cursor at start of first demoted paragraph
    const newNodeIdx = listPath[listPath.length - 1] + 1;
    const newNodePath = listPath.length === 1
      ? [newNodeIdx]
      : [...listPath.slice(0, -1), newNodeIdx];
    Transforms.select(editor, Editor.start(editor, newNodePath));
  };

  return editor;
};
