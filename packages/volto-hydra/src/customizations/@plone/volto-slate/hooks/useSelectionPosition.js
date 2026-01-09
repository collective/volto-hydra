import { useSlate, ReactEditor, useSlateSelection } from 'slate-react';

/**
 * Iframe-aware useSelectionPosition hook for Hydra.
 *
 * For Quanta toolbar context: returns positioning data to align LinkEditor
 * with the toolbar's top-left corner.
 * For sidebar context: returns DOM-based selection positioning.
 */
export const useSelectionPosition = () => {
  const editor = useSlate();
  const selection = useSlateSelection();

  // Check for Hydra toolbar context
  const isToolbarContext = editor.uid?.startsWith('toolbar-');
  const hydraData = editor.hydra || (isToolbarContext && typeof window !== 'undefined' ? window.voltoHydraData : null);

  // For Hydra toolbar context: return position to align LinkEditor with toolbar
  if (hydraData?.toolbarTop !== undefined && hydraData?.toolbarLeft !== undefined) {
    const { toolbarTop, toolbarLeft } = hydraData;

    // PositionedToolbar applies these transforms:
    //   left = style.left - el.offsetWidth / 2  (centers horizontally)
    //   top = style.top - el.offsetHeight       (positions above)
    // getPositionStyle (Link plugin) does:
    //   style.left = rect.left + rect.width / 2
    //   style.top = rect.top - 6
    //
    // To align LinkEditor's top-left with toolbar's top-left:
    // We need final.left = toolbarLeft and final.top = toolbarTop
    //
    // Combined for left: final = rect.left + rect.width/2 - el.offsetWidth/2
    // If rect.width = 0: final = rect.left - el.offsetWidth/2
    // So: rect.left = toolbarLeft + el.offsetWidth/2
    //
    // Combined for top: final = rect.top - 6 - el.offsetHeight
    // So: rect.top = toolbarTop + el.offsetHeight + 6
    //
    // Estimate LinkEditor dimensions (measured: 300x38 including wrapper padding)
    const LINK_EDITOR_WIDTH = 300;
    const LINK_EDITOR_HEIGHT = 38;

    return {
      top: toolbarTop + LINK_EDITOR_HEIGHT + 6,
      left: toolbarLeft + LINK_EDITOR_WIDTH / 2,
      width: 0,
      height: LINK_EDITOR_HEIGHT,
    };
  }

  // For sidebar/fallback: use DOM-based positioning
  let rect = {};

  if (selection && ReactEditor.isFocused(editor)) {
    try {
      const [textNode] = ReactEditor.toDOMPoint(editor, selection.anchor);
      const parentNode = textNode.parentNode;
      rect = parentNode.getBoundingClientRect();
    } catch (e) {
      console.warn('[useSelectionPosition] Failed to get DOM rect:', e.message);
    }
  }

  return rect;
};
