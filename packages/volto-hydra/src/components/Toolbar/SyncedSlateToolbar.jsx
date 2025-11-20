import React, { useState, useEffect, useCallback } from 'react';
import { Slate } from 'slate-react';
import { createEditor } from 'slate';
import { withReact } from 'slate-react';
import { Editor } from 'slate';
import config from '@plone/volto/registry';

/**
 * Synced Slate Toolbar - Renders real Slate buttons with synchronized editor
 *
 * This component creates a real Slate editor that stays synchronized with:
 * - The current block's value (from Redux form data)
 * - The current selection (from iframe)
 *
 * Real Slate buttons are rendered inside the Slate context, allowing them to:
 * - Access the editor via useSlate() hook
 * - Determine their own active state via isBlockActive/isMarkActive
 * - Execute transforms directly on the editor
 * - Work automatically including custom plugin buttons
 *
 * When a button modifies the editor, onChange fires and we send the updated
 * value back to Redux and the iframe.
 *
 * This editor is also used by keyboard shortcuts - they access it via
 * window.voltoHydraToolbarEditor instead of duplicating format logic.
 */
const SyncedSlateToolbar = ({
  selectedBlock,
  form,
  currentSelection,
  onChangeFormData,
  blockUI,
  iframeElement,
  onOpenMenu,
}) => {

  // Create Slate editor once
  const [editor] = useState(() => {
    const ed = withReact(createEditor());
    // Add custom methods that Slate/Volto expects
    ed.getSavedSelection = () => null;
    ed.setSavedSelection = () => {};
    ed.isSidebarOpen = false;
    // Initialize with empty paragraph to avoid undefined error on first render
    // IMPORTANT: Must include nodeId properties - this is a Volto Slate requirement
    ed.children = [{type: 'p', children: [{text: '', nodeId: 2}], nodeId: 1}];
    return ed;
  });

  // Expose editor globally for keyboard shortcuts
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.voltoHydraToolbarEditor = editor;
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.voltoHydraToolbarEditor = null;
      }
    };
  }, [editor]);

  // Sync editor state with current block and selection
  useEffect(() => {
    if (!selectedBlock || !form.blocks[selectedBlock]) return;

    const block = form.blocks[selectedBlock];
    const fieldName = blockUI?.focusedFieldName || 'value'; // Default to 'value' for simple slate blocks
    const fieldValue = block[fieldName];

    if (!fieldValue || !Array.isArray(fieldValue)) {
      return;
    }

    // Update editor children with the focused field's value
    editor.children = fieldValue;

    // Update editor selection
    if (currentSelection) {
      editor.selection = currentSelection;
    }

    // Normalize if needed
    Editor.normalize(editor, { force: true });
  }, [selectedBlock, form, currentSelection, editor, blockUI?.focusedFieldName]);

  // Handle changes from button clicks
  const handleChange = useCallback(
    (newValue) => {
      // Avoid update loops - only update if value actually changed
      if (JSON.stringify(newValue) === JSON.stringify(editor.children)) {
        return;
      }

      // Determine which field to update
      const fieldName = blockUI?.focusedFieldName || 'value';

      // Build updated form data with the correct field
      const updatedForm = {
        ...form,
        blocks: {
          ...form.blocks,
          [selectedBlock]: {
            ...form.blocks[selectedBlock],
            [fieldName]: newValue,
          },
        },
      };

      // Send to parent (which updates Redux and iframe)
      onChangeFormData(updatedForm);
    },
    [editor.children, form, selectedBlock, onChangeFormData, blockUI?.focusedFieldName],
  );

  // Get button configuration
  const toolbarButtons = config.settings.slate?.toolbarButtons || [];
  const buttons = config.settings.slate?.buttons || {};

  if (!blockUI || !selectedBlock) {
    return null;
  }

  // DEFENSIVE: Verify we have form data with blocks
  if (!form) {
    throw new Error(`[SyncedSlateToolbar] form is ${form} - cannot render toolbar without form data`);
  }

  if (!form.blocks) {
    throw new Error(`[SyncedSlateToolbar] form.blocks is ${form.blocks} - form object doesn't have blocks property. Form keys: ${Object.keys(form).join(', ')}`);
  }

  // Check if we have block data for this specific block
  const block = form.blocks[selectedBlock];
  if (!block) {
    return null; // No block data yet - this is OK during initial render
  }

  const fieldName = blockUI?.focusedFieldName || 'value';
  const fieldValue = block[fieldName];

  // CRITICAL: Only show Slate if we actually have a valid field value array
  // Don't trust blockUI.showFormatButtons alone - verify the data exists!
  const hasValidSlateValue = fieldValue && Array.isArray(fieldValue) && fieldValue.length > 0;

  // Calculate toolbar position - add iframe offset and position above the BLOCK CONTAINER
  // NOTE: blockUI.rect comes from BLOCK_SELECTED message and is the block container rect, NOT field rect
  const iframeRect = iframeElement?.getBoundingClientRect() || { top: 0, left: 0 };
  const toolbarTop = iframeRect.top + blockUI.rect.top - 40; // 40px above block container
  const toolbarLeft = iframeRect.left + blockUI.rect.left; // Aligned with block container left edge

  // DEBUG: Log positioning calculations
  console.log('[TOOLBAR] Positioning:', {
    iframeLeft: iframeRect.left,
    blockRectLeft: blockUI.rect.left,
    calculatedToolbarLeft: toolbarLeft,
    blockUid: selectedBlock
  });

  return (
    <div
      className="quanta-toolbar"
      style={{
        position: 'fixed',
        top: `${toolbarTop}px`,
        left: `${toolbarLeft}px`,
        zIndex: 10,
        display: 'flex',
        gap: '4px',
        background: '#fff',
        border: '1px solid #ccc',
        borderRadius: '4px',
        padding: '4px',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
        pointerEvents: 'none', // Allow events to pass through to iframe drag button
      }}
    >
      {/* Drag handle - visual indicator only, pointer events pass through to iframe button */}
      <div
        className="drag-handle"
        style={{
          cursor: 'move',
          padding: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
        }}
      >
        ⠿
      </div>

      {/* Real Slate buttons - only show if we have a valid slate field value */}
      {blockUI.showFormatButtons && hasValidSlateValue && (
        <Slate editor={editor} initialValue={editor.children} onChange={handleChange}>
          {toolbarButtons.map((name, i) => {
            if (name === 'separator') {
              return (
                <div
                  key={i}
                  className="toolbar-separator"
                  style={{
                    width: '1px',
                    height: '28px',
                    background: '#e0e0e0',
                    margin: '0 4px',
                  }}
                />
              );
            }

            const Btn = buttons[name];
            if (!Btn) {
              return null;
            }

            return <Btn key={`${name}-${i}`} />;
          })}
        </Slate>
      )}

      {/* Three-dots menu button */}
      <button
        style={{
          background: '#fff',
          border: 'none',
          padding: '8px 10px',
          cursor: 'pointer',
          fontSize: '18px',
          color: '#666',
          pointerEvents: 'auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        title="More options"
        onClick={(e) => {
          e.stopPropagation();
          const rect = e.currentTarget.getBoundingClientRect();
          onOpenMenu?.(rect);
        }}
      >
        ⋯
      </button>
    </div>
  );
};

export default SyncedSlateToolbar;
