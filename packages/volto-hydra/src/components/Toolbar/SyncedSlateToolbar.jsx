import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Slate } from 'slate-react';
import { Transforms, Editor } from 'slate';
import { isEqual } from 'lodash';
import config from '@plone/volto/registry';
import { makeEditor } from '@plone/volto-slate/utils';

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
  onSelectionChange,
  blockUI,
  iframeElement,
  onOpenMenu,
}) => {

  // Create Slate editor once using Volto's makeEditor (includes all plugins)
  const [editor] = useState(() => {
    const ed = makeEditor();

    // Add custom methods that Slate/Volto expects
    ed.getSavedSelection = () => null;
    ed.setSavedSelection = () => {};
    ed.isSidebarOpen = false;

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

  // Track internal value to detect external changes (like Volto does)
  const internalValueRef = useRef(null);

  // Force re-renders when value changes (to update button active states)
  const [renderKey, setRenderKey] = useState(0);

  // Sync editor state when form data or selection changes (like Volto's componentDidUpdate)
  useEffect(() => {
    if (!selectedBlock || !form.blocks[selectedBlock]) return;

    const block = form.blocks[selectedBlock];
    const fieldName = blockUI?.focusedFieldName || 'value';
    const fieldValue = block[fieldName];

    // Update editor.children if external value changed (like Volto line 158)
    if (fieldValue && !isEqual(fieldValue, editor.children)) {
      console.log('[TOOLBAR] Syncing editor.children from form data (structure changed)');
      editor.children = fieldValue;
      internalValueRef.current = fieldValue;
      // Force re-render to update button active states (like Volto's setState)
      setRenderKey(k => k + 1);
    } else if (fieldValue && !isEqual(fieldValue, internalValueRef.current)) {
      console.log('[TOOLBAR] Updating internalValueRef (children already synced)');
      internalValueRef.current = fieldValue;
    }

    // Update editor selection using Transforms (like Volto line 167)
    if (currentSelection && !isEqual(currentSelection, editor.selection)) {
      console.log('[TOOLBAR] Setting editor selection via Transforms (selection changed)');
      try {
        Transforms.select(editor, currentSelection);
        // Force re-render to update button active states when selection changes
        setRenderKey(k => k + 1);
      } catch (e) {
        console.log('[TOOLBAR] Selection transform failed:', e);
      }
    } else if (currentSelection) {
      console.log('[TOOLBAR] Skipping selection sync - already matches editor.selection');
    }
  }, [selectedBlock, form, currentSelection, editor, blockUI?.focusedFieldName]);

  // Handle changes from button clicks (like Volto's handleChange)
  const handleChange = useCallback(
    (newValue) => {
      console.error('[TOOLBAR] handleChange called, newValue:', JSON.stringify(newValue));
      console.error('[TOOLBAR] editor.children after change:', JSON.stringify(editor.children));
      console.error('[TOOLBAR] editor.selection after change:', JSON.stringify(editor.selection));

      // Update internal value tracker
      internalValueRef.current = newValue;

      // Only call onChange if value actually changed (like Volto line 108)
      const block = form.blocks[selectedBlock];
      const fieldName = blockUI?.focusedFieldName || 'value';
      const currentFieldValue = block?.[fieldName];

      if (isEqual(newValue, currentFieldValue)) {
        console.log('[TOOLBAR] Skipping update - value unchanged');
        return;
      }

      console.log('[TOOLBAR] Updating field:', fieldName);

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

      console.log('[TOOLBAR] Calling onChangeFormData with updated form');
      // Send to parent (which updates Redux and iframe)
      onChangeFormData(updatedForm);

      // Send updated selection to parent so it can be sent to iframe
      if (onSelectionChange && editor.selection) {
        console.log('[TOOLBAR] Sending updated selection:', JSON.stringify(editor.selection));
        onSelectionChange(editor.selection);
      }

      // DON'T increment renderKey here - it would remount <Slate> and reset editor.children
      // Buttons will re-render naturally when React processes the state updates
    },
    [form, selectedBlock, onChangeFormData, onSelectionChange, blockUI?.focusedFieldName, editor],
  );

  // Get button configuration
  const toolbarButtons = config.settings.slate?.toolbarButtons || [];
  const buttons = config.settings.slate?.buttons || {};

  console.log('[TOOLBAR] toolbarButtons config:', toolbarButtons);
  console.log('[TOOLBAR] Available buttons:', Object.keys(buttons));
  console.log('[TOOLBAR] Bold button exists?', !!buttons.bold);

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

  // For controlled mode, we need the current value from form data
  // Always provide a valid array to avoid Slate errors
  // IMPORTANT: Use internalValueRef if available (means we just applied formatting)
  // This prevents the editor from resetting to old value when it remounts with new renderKey
  const currentValue = internalValueRef.current
    ? internalValueRef.current
    : hasValidSlateValue
    ? fieldValue
    : [{type: 'p', children: [{text: '', nodeId: 2}], nodeId: 1}];

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
      {/* IMPORTANT: Wrap in div with pointerEvents: 'auto' to make buttons clickable
          while parent toolbar has pointerEvents: 'none' for drag-and-drop passthrough */}
      {blockUI.showFormatButtons && hasValidSlateValue && (
        <div style={{ pointerEvents: 'auto', display: 'flex', gap: '4px' }}>
          {console.log('[TOOLBAR] About to render Slate with:', { initialValue: currentValue, type: typeof currentValue, isArray: Array.isArray(currentValue) })}
          <Slate
            key={renderKey}
            editor={editor}
            initialValue={currentValue}
            onChange={handleChange}
          >
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
                console.log(`[TOOLBAR] Button "${name}" not found in buttons config`);
                return null;
              }

              console.log(`[TOOLBAR] Rendering button: ${name}, editor.children:`, JSON.stringify(editor.children));
              return <Btn key={`${name}-${i}`} />;
            })}
          </Slate>
        </div>
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
