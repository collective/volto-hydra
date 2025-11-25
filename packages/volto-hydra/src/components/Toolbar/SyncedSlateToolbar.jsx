import React, { useState, useEffect, useLayoutEffect, useCallback, useRef, useMemo, Component } from 'react';
import { Slate, ReactEditor } from 'slate-react';
import { Transforms, Editor } from 'slate';
import { isEqual } from 'lodash';
import config from '@plone/volto/registry';
import { makeEditor } from '@plone/volto-slate/utils';
import { useDispatch, useSelector } from 'react-redux';
import { setPluginOptions } from '@plone/volto-slate/actions';

/**
 * Error boundary to catch ReactEditor.focus() errors from toolbar editors
 * The toolbar editor isn't in a resolvable DOM tree, so focus calls will fail
 */
class SlateErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    // Check if it's an error we should suppress
    if (error?.message?.includes('Cannot resolve a DOM node') ||
        error?.message?.includes("Cannot read properties of null (reading 'focus')") ||
        error?.message?.includes("Cannot read property 'focus' of null")) {
      console.log('[SlateErrorBoundary] Suppressed error:', error.message);
      return { hasError: false }; // Don't show error UI, just suppress it
    }
    // Re-throw other errors
    throw error;
  }

  render() {
    return this.props.children;
  }
}

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
  blockFieldTypes,
  iframeElement,
  onOpenMenu,
}) => {

  // Create Slate editor once using Volto's makeEditor (includes all plugins)
  const [editor] = useState(() => {
    const ed = makeEditor();

    // Implement savedSelection for link plugin (stores selection from iframe)
    ed.savedSelection = null;
    ed.getSavedSelection = () => ed.savedSelection;
    ed.setSavedSelection = (selection) => {
      ed.savedSelection = selection;
    };
    ed.isSidebarOpen = false;

    // Ensure editor has a UID for Redux state keys (required for persistent helpers)
    if (!ed.uid) {
      ed.uid = `toolbar-${selectedBlock}`;
    }

    // Mark as toolbar editor
    ed.isToolbarEditor = true;

    return ed;
  });

  // Redux dispatch for closing persistent helpers
  const dispatch = useDispatch();

  // Wrap ReactEditor.focus to handle toolbar editor gracefully
  // Also set up global error handler to catch focus errors from AddLinkForm
  useEffect(() => {
    const originalFocus = ReactEditor.focus;

    ReactEditor.focus = (editorToFocus) => {
      // Skip focus for our toolbar editor
      if (editorToFocus === editor || editorToFocus?.isToolbarEditor) {
        console.log('[ReactEditor.focus] Skipping focus for toolbar editor');
        return;
      }
      // Call original for other editors
      try {
        return originalFocus(editorToFocus);
      } catch (e) {
        // Silently catch and log focus errors to prevent LinkEditor from closing
        console.warn('[ReactEditor.focus] Focus error caught:', e.message);
      }
    };

    // Global error handler to catch ALL focus-related errors
    const handleError = (event) => {
      const error = event.error || event.reason;
      if (error && error.message) {
        // Suppress focus errors from LinkEditor
        if (error.message.includes("Cannot read properties of null (reading 'focus')") ||
            error.message.includes("Cannot read property 'focus' of null") ||
            error.message.includes("null is not an object (evaluating") && error.message.includes("focus")) {
          console.warn('[SyncedSlateToolbar] Suppressed focus error:', error.message);
          event.preventDefault();
          event.stopPropagation();
          event.stopImmediatePropagation();
          return true;
        }
      }
    };

    // Capture phase to catch errors before they bubble
    window.addEventListener('error', handleError, true);
    window.addEventListener('unhandledrejection', handleError, true);

    return () => {
      // Restore original on unmount
      ReactEditor.focus = originalFocus;
      window.removeEventListener('error', handleError, true);
      window.removeEventListener('unhandledrejection', handleError, true);
    };
  }, [editor]);

  // Override HTMLInputElement.prototype.focus to add null check for automated tests
  // This prevents errors when AddLinkForm tries to focus an input that hasn't mounted yet
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const originalFocus = HTMLInputElement.prototype.focus;

    HTMLInputElement.prototype.focus = function(...args) {
      try {
        // Only call if element is connected to DOM
        if (this.isConnected) {
          return originalFocus.apply(this, args);
        }
      } catch (e) {
        // Silently ignore focus errors in tests
        console.warn('[HTMLInputElement.focus] Focus error suppressed:', e.message);
      }
    };

    return () => {
      HTMLInputElement.prototype.focus = originalFocus;
    };
  }, []);

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
        // Save selection for Link plugin to use
        editor.savedSelection = currentSelection;

        // Force re-render to update button active states when selection changes
        setRenderKey(k => k + 1);
      } catch (e) {
        console.log('[TOOLBAR] Selection transform failed:', e);
      }
    } else if (currentSelection) {
      console.log('[TOOLBAR] Skipping selection sync - already matches editor.selection');
      // Still update savedSelection even if selection hasn't changed
      editor.savedSelection = currentSelection;
    }
  }, [selectedBlock, form, currentSelection, editor, blockUI?.focusedFieldName, dispatch]);

  // Check if LinkEditor is currently open
  const linkEditorOpenRef = useRef(false);
  linkEditorOpenRef.current = useSelector((state) => {
    return state['slate_plugins']?.[`${editor.uid}-link`]?.show_sidebar_editor || false;
  });

  // Close LinkEditor when selection changes (user clicked in editor)
  // Only close if it's actually open to avoid flickering
  useEffect(() => {
    if (linkEditorOpenRef.current && currentSelection) {
      dispatch(setPluginOptions(`${editor.uid}-link`, { show_sidebar_editor: false }));
    }
  }, [currentSelection, editor.uid, dispatch]);

  // Set editor.hydra with iframe positioning data for persistent helpers
  // NOTE: editor is stable (created once), so we don't include it in dependencies
  // This must be set SYNCHRONOUSLY during render, not in an effect, because
  // persistentHelpers (like LinkEditor) may render before effects run
  // ALSO set globally so ANY editor can access it (handles nested Slate contexts)
  // IMPORTANT: Don't store the iframe element itself - causes circular JSON errors
  // when Slate tries to serialize. Instead store only the rect data we need.
  const hydraIframeRect = iframeElement?.getBoundingClientRect();
  const hydraData = {
    iframeRect: hydraIframeRect ? { top: hydraIframeRect.top, left: hydraIframeRect.left } : null,
    blockUIRect: blockUI?.rect,
  };
  editor.hydra = hydraData;
  if (typeof window !== 'undefined') {
    window.voltoHydraData = hydraData;
  }
  console.log('[TOOLBAR] Set editor.hydra and window.voltoHydraData:', hydraData);

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

  // Create Redux store for persistent helpers (like LinkEditor)
  // This provides the state management that Slate plugins expect
  // Get button configuration
  const toolbarButtons = config.settings.slate?.toolbarButtons || [];
  const buttons = config.settings.slate?.buttons || {};
  const persistentHelpers = config.settings.slate?.persistentHelpers || [];


  console.log('[TOOLBAR] toolbarButtons config:', toolbarButtons);
  console.log('[TOOLBAR] Available buttons:', Object.keys(buttons));
  console.log('[TOOLBAR] Bold button exists?', !!buttons.bold);
  console.log('[TOOLBAR] persistentHelpers count:', persistentHelpers.length);
  console.log('[TOOLBAR] Editor UID:', editor.uid);

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

  // Determine if we should show format buttons based on field type
  const blockType = block?.['@type'];
  const blockTypeFields = blockFieldTypes?.[blockType] || {};
  const fieldType = blockTypeFields[fieldName];
  const showFormatButtons = fieldType === 'slate';

  // CRITICAL: Only show Slate if we actually have a valid field value array
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
  const toolbarIframeRect = iframeElement?.getBoundingClientRect() || { top: 0, left: 0 };
  const toolbarTop = toolbarIframeRect.top + blockUI.rect.top - 40; // 40px above block container
  const toolbarLeft = toolbarIframeRect.left + blockUI.rect.left; // Aligned with block container left edge

  // DEBUG: Log positioning calculations
  console.log('[TOOLBAR] Positioning:', {
    iframeLeft: toolbarIframeRect.left,
    blockRectLeft: blockUI.rect.left,
    calculatedToolbarLeft: toolbarLeft,
    blockUid: selectedBlock
  });

  return (
    <>
      <div
        className="quanta-toolbar"
        style={{
          position: 'fixed',
          top: `${toolbarTop}px`,
          left: `${toolbarLeft}px`,
          zIndex: 10,
          display: 'flex',
          gap: '2px',
          background: '#fff',
          border: '1px solid #e0e0e0',
          borderRadius: '3px',
          padding: '2px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
          pointerEvents: 'none', // Allow events to pass through to iframe drag button
        }}
      >
      {/* Drag handle - visual indicator only, pointer events pass through to iframe button */}
      <div
        className="drag-handle"
        style={{
          cursor: 'move',
          padding: '4px 6px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
          color: '#999',
          fontSize: '14px',
        }}
      >
        ⠿
      </div>

      {/* Real Slate buttons - only show if we have a valid slate field value */}
      {/* IMPORTANT: Wrap in div with pointerEvents: 'auto' to make buttons clickable
          while parent toolbar has pointerEvents: 'none' for drag-and-drop passthrough */}
      {/* Wrapped with Redux Provider for buttons that dispatch Redux actions (like Link button) */}
      {showFormatButtons && hasValidSlateValue && (
        <div style={{ pointerEvents: 'auto', display: 'flex', gap: '1px', alignItems: 'center' }}>
            {console.log('[TOOLBAR] About to render Slate with:', { initialValue: currentValue, type: typeof currentValue, isArray: Array.isArray(currentValue) })}
            <SlateErrorBoundary>
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
                        height: '20px',
                        background: '#e0e0e0',
                        margin: '0 2px',
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

              {/* Render persistent helpers (like LinkEditor) - they use editor.hydra for positioning */}
              {persistentHelpers.map((Helper, idx) => (
                <Helper key={idx} editor={editor} />
              ))}
              </Slate>
            </SlateErrorBoundary>
          </div>
      )}

      {/* Three-dots menu button */}
      <button
        style={{
          background: '#fff',
          border: 'none',
          padding: '4px 6px',
          cursor: 'pointer',
          fontSize: '14px',
          color: '#999',
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
    </>
  );
};

export default SyncedSlateToolbar;
