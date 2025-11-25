import { useSlate, ReactEditor, useSlateSelection } from 'slate-react';

/**
 * Iframe-aware useSelectionPosition hook
 *
 * Replaces the default volto-slate useSelectionPosition to support both:
 * 1. Quanta toolbar context (iframe) - positions over toolbar using editor.hydra data
 * 2. Sidebar context (normal) - positions using DOM-based selection
 */
export const useSelectionPosition = () => {
  const editor = useSlate();

  // If editor has Hydra positioning data (Quanta toolbar), position over toolbar
  if (editor.hydra?.iframeElement && editor.hydra?.blockUIRect) {
    const { iframeElement, blockUIRect } = editor.hydra;
    const iframeRect = iframeElement.getBoundingClientRect();

    console.log('[useSelectionPosition] Hydra mode detected, positioning over toolbar:', {
      iframeTop: iframeRect.top,
      blockTop: blockUIRect.top,
      calculatedTop: iframeRect.top + blockUIRect.top - 40,
    });

    return {
      top: iframeRect.top + blockUIRect.top - 40,
      left: iframeRect.left + blockUIRect.left,
      width: blockUIRect.width,
      height: 40,
    };
  }

  // Otherwise (sidebar), use original DOM-based positioning
  console.log('[useSelectionPosition] No Hydra data, using DOM-based positioning');

  let rect = {};
  const selection = useSlateSelection();

  if (selection && ReactEditor.isFocused(editor)) {
    try {
      const [textNode] = ReactEditor.toDOMPoint(editor, selection.anchor);
      const parentNode = textNode.parentNode;
      rect = parentNode.getBoundingClientRect();
      console.log('[useSelectionPosition] DOM rect:', rect);
    } catch (e) {
      console.log('[useSelectionPosition] Failed to get DOM rect:', e.message);
      // Fails when selection is outdated
    }
  } else {
    console.log('[useSelectionPosition] No selection or editor not focused');
  }

  return rect;
};
