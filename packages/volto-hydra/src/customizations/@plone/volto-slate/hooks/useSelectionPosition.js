import { useSlate, ReactEditor, useSlateSelection } from 'slate-react';

/**
 * Iframe-aware useSelectionPosition hook
 *
 * Replaces the default volto-slate useSelectionPosition to support both:
 * 1. Quanta toolbar context (iframe) - positions over toolbar using editor.hydra data
 * 2. Sidebar context (normal) - positions using DOM-based selection
 */
export const useSelectionPosition = () => {
  // Call ALL hooks at the top level (Rules of Hooks)
  const editor = useSlate();
  const selection = useSlateSelection();

  // For Quanta toolbar context: use hydra data for iframe-aware positioning
  // For sidebar context: use default DOM-based positioning (don't use window.voltoHydraData)
  // Toolbar editor has UID starting with "toolbar-", sidebar has different UID pattern
  const isToolbarContext = editor.uid?.startsWith('toolbar-');
  const hydraData = editor.hydra || (isToolbarContext && typeof window !== 'undefined' ? window.voltoHydraData : null);

  console.log('[useSelectionPosition] Called - isToolbarContext?', isToolbarContext,
    'editor.hydra?', !!editor.hydra,
    'using hydraData?', !!hydraData,
    'editor.uid:', editor.uid);

  // If we have Hydra positioning data (Quanta toolbar), position over toolbar
  if (hydraData?.iframeRect && hydraData?.blockUIRect) {
    const { iframeRect, blockUIRect } = hydraData;

    const calculatedTop = iframeRect.top + blockUIRect.top - 40;
    const calculatedLeft = iframeRect.left + blockUIRect.left;

    console.log('[useSelectionPosition] Hydra mode detected, positioning over toolbar:', {
      iframeTop: iframeRect.top,
      blockTop: blockUIRect.top,
      calculatedTop,
      calculatedLeft,
    });

    // Return a DOMRect-like object with all properties
    return {
      top: calculatedTop,
      left: calculatedLeft,
      bottom: calculatedTop + 40,
      right: calculatedLeft + blockUIRect.width,
      width: blockUIRect.width,
      height: 40,
      x: calculatedLeft,
      y: calculatedTop,
    };
  }

  // Otherwise (sidebar), use original DOM-based positioning
  console.log('[useSelectionPosition] No Hydra data, using DOM-based positioning');

  let rect = {};

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
