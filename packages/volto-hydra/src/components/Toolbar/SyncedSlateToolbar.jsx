import React, { useState, useEffect, useLayoutEffect, useCallback, useRef, useMemo, Component } from 'react';
import { Slate, ReactEditor } from 'slate-react';
import { Transforms, Node, Range, Editor, Point } from 'slate';
import { isEqual } from 'lodash';
import config from '@plone/volto/registry';
import { makeEditor, toggleInlineFormat, isBlockActive } from '@plone/volto-slate/utils';
import slateTransforms from '../../utils/slateTransforms';
import { useDispatch, useSelector } from 'react-redux';
import { setPluginOptions } from '@plone/volto-slate/actions';

/**
 * Validates if a selection is valid for the given document structure.
 * Returns true if all paths in the selection exist in the document.
 */
function isSelectionValidForDocument(selection, children) {
  if (!selection) return true; // No selection is always valid
  if (!children || !Array.isArray(children)) return false;

  // Create a temporary object to check paths against
  const doc = { children };

  try {
    // Check if both anchor and focus paths exist in the document
    if (selection.anchor?.path) {
      Node.get(doc, selection.anchor.path);
    }
    if (selection.focus?.path) {
      Node.get(doc, selection.focus.path);
    }
    return true;
  } catch (e) {
    // Path doesn't exist in document
    return false;
  }
}

/**
 * Error boundary to catch ReactEditor DOM errors from toolbar editors
 * The toolbar editor isn't in a resolvable DOM tree, so Slate DOM operations fail
 */
class SlateErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    // Suppress Slate DOM errors for toolbar editor
    if (error?.message?.includes('Cannot resolve a DOM node')) {
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
 *
 * For detailed data flow architecture (format buttons, sidebar editing, hotkeys,
 * block selection), see: docs/slate-transforms-architecture.md
 */
const SyncedSlateToolbar = ({
  selectedBlock,
  form,
  currentSelection,
  onChangeFormData,
  completedFlushRequestId,
  transformAction,
  onTransformApplied,
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
  // The toolbar editor isn't in a resolvable DOM tree, so focus calls will fail
  useEffect(() => {
    const originalFocus = ReactEditor.focus;

    ReactEditor.focus = (editorToFocus) => {
      // Skip focus for our toolbar editor
      if (editorToFocus === editor || editorToFocus?.isToolbarEditor) {
        return;
      }
      // Call original for other editors
      try {
        return originalFocus(editorToFocus);
      } catch (e) {
        // Silently catch DOM resolution errors for toolbar editor
        console.warn('[ReactEditor.focus] Focus error caught:', e.message);
      }
    };

    // Global error handler for synchronous focus errors (e.g., Clear button in AddLinkForm)
    // When this.input.focus() is called and this.input is null, the error would break
    // React's event handling and prevent onClear changes from being committed
    const handleError = (event) => {
      const error = event.error || event.reason;
      if (error?.message?.includes("Cannot read properties of null (reading 'focus')")) {
        event.preventDefault();
        return true;
      }
    };

    window.addEventListener('error', handleError, true);

    return () => {
      ReactEditor.focus = originalFocus;
      window.removeEventListener('error', handleError, true);
    };
  }, [editor]);

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

  // Detect clicks in iframe to close popups like LinkEditor
  // Clicks in iframe don't bubble to parent document, so handleClickOutside never fires
  // Solution: When Admin window loses focus to iframe, dispatch synthetic mousedown
  useEffect(() => {
    const handleWindowBlur = () => {
      // Check if focus went to the iframe
      const iframe = document.getElementById('previewIframe');
      if (document.activeElement === iframe) {
        console.log('[TOOLBAR] Focus moved to iframe, dispatching mousedown to close popups');
        // Dispatch synthetic mousedown on document to trigger handleClickOutside
        const mousedownEvent = new MouseEvent('mousedown', {
          bubbles: true,
          cancelable: true,
          view: window,
        });
        document.dispatchEvent(mousedownEvent);
      }
    };

    window.addEventListener('blur', handleWindowBlur);
    return () => window.removeEventListener('blur', handleWindowBlur);
  }, []);

  // Track internal value to detect external changes (like Volto does)
  const internalValueRef = useRef(null);

  // Force re-renders when value changes (to update button active states)
  const [renderKey, setRenderKey] = useState(0);

  // Helper to safely increment renderKey without unmounting popups
  // When LinkEditor is open, we skip the remount to prevent this.input.focus() errors
  const safeIncrementRenderKey = useCallback(() => {
    if (!linkEditorWasVisibleRef.current) {
      setRenderKey((k) => k + 1);
    }
  }, []);

  // Track the last value we sent to Redux to avoid overwriting local changes
  const lastSentValueRef = useRef(null);

  // Track pending flush request for button click coordination
  const pendingFlushRef = useRef(null); // { requestId, button }
  // Track the requestId of active format operation (persists through handleChange)
  const activeFormatRequestIdRef = useRef(null);
  // Track processed transform requestIds to prevent double-application
  const processedTransformRequestIdRef = useRef(null);
  // Track LinkEditor visibility across effect restarts (persists when dependencies change)
  const linkEditorWasVisibleRef = useRef(false);

  // Poll for LinkEditor (.add-link) visibility changes to detect when it closes
  // The LinkEditor doesn't use Redux for visibility - it uses CSS opacity
  // IMPORTANT: Use linkEditorWasVisibleRef instead of local variable because
  // effect dependencies change frequently, causing restarts that reset local state
  useEffect(() => {
    let pollCount = 0;

    const checkVisibility = () => {
      const popup = document.querySelector('.add-link');
      pollCount++;

      if (!popup) {
        if (linkEditorWasVisibleRef.current) {
          console.log('[TOOLBAR] LinkEditor removed from DOM, was visible');
          linkEditorWasVisibleRef.current = false;
          handlePopupClosed();
        }
        return;
      }

      const style = window.getComputedStyle(popup);
      const isVisible = style.opacity !== '0' && style.display !== 'none' && style.visibility !== 'hidden';

      if (linkEditorWasVisibleRef.current && !isVisible) {
        console.log('[TOOLBAR] LinkEditor became hidden');
        handlePopupClosed();
      }
      linkEditorWasVisibleRef.current = isVisible;
    };

    const handlePopupClosed = () => {
      console.log('[TOOLBAR] handlePopupClosed called, activeFormatRequestId:', activeFormatRequestIdRef.current);
      if (activeFormatRequestIdRef.current) {
        console.log('[TOOLBAR] LinkEditor closed, sending update to unblock iframe, requestId:', activeFormatRequestIdRef.current);
        onChangeFormData(form, currentSelection, activeFormatRequestIdRef.current);
        activeFormatRequestIdRef.current = null;
      }
      // NOTE: Don't clear pendingFlushRef here - it will be cleared when the flush completes.
      // The polling might detect a stale popup closing while a new button click is pending,
      // and we don't want to interfere with that pending operation.
    };

    const intervalId = setInterval(checkVisibility, 100);
    return () => clearInterval(intervalId);
  }, [form, currentSelection, onChangeFormData]);

  // Sync editor state when form data or selection changes (like Volto's componentDidUpdate)
  useEffect(() => {
    if (!selectedBlock || !form.blocks[selectedBlock]) return;

    const block = form.blocks[selectedBlock];
    const fieldName = blockUI?.focusedFieldName || 'value';
    const fieldValue = block[fieldName];

    // Only sync editor for slate fields - non-slate fields don't use the Slate editor
    const blockType = block?.['@type'];
    const blockTypeFields = blockFieldTypes?.[blockType] || {};
    const fieldType = blockTypeFields[fieldName];
    if (fieldType !== 'slate') {
      // Clear internalValueRef so we don't use stale slate value when switching to a slate field
      internalValueRef.current = null;
      return;
    }

    // Update editor.children if external value changed (like Volto line 158)
    // BUT don't overwrite local changes - only sync if Redux has caught up to what we sent
    // or if the value came from somewhere else (iframe text changes)
    if (fieldValue && !isEqual(fieldValue, editor.children)) {
      if (lastSentValueRef.current) {
        // We have pending local changes - check if Redux caught up
        if (isEqual(fieldValue, lastSentValueRef.current)) {
          // Redux now has our value, safe to sync
          console.log('[TOOLBAR] Redux caught up, syncing editor.children');
          // CRITICAL: When structure changes (e.g., format removed), selection paths may become invalid.
          // Check if current selection is valid for new children, deselect if not.
          const hadToDeselect = !isSelectionValidForDocument(editor.selection, fieldValue);
          if (hadToDeselect) {
            console.log('[TOOLBAR] Selection invalid for new structure, deselecting');
            Transforms.deselect(editor);
          }
          editor.children = fieldValue;
          internalValueRef.current = fieldValue;
          lastSentValueRef.current = null;
          // If we deselected, try to restore selection from currentSelection if it's valid
          if (hadToDeselect && currentSelection && isSelectionValidForDocument(currentSelection, fieldValue)) {
            console.log('[TOOLBAR] Restoring valid selection from currentSelection');
            try {
              Transforms.select(editor, currentSelection);
              editor.savedSelection = currentSelection;
            } catch (e) {
              console.log('[TOOLBAR] Failed to restore selection:', e.message);
            }
          }
          safeIncrementRenderKey();
        } else {
          // Redux still has old value, don't overwrite our local changes
          console.log('[TOOLBAR] Skipping sync - Redux has old value, waiting for catch up');
        }
      } else {
        // No pending changes, this is an external change (from iframe), sync it
        console.log('[TOOLBAR] External change detected, syncing editor.children');
        // Must deselect before changing children to avoid invalid selection errors
        // Selection will be synced after children update if currentSelection is valid
        Transforms.deselect(editor);
        editor.children = fieldValue;
        internalValueRef.current = fieldValue;
        safeIncrementRenderKey();
      }
    } else if (fieldValue && !isEqual(fieldValue, internalValueRef.current)) {
      console.log('[TOOLBAR] Updating internalValueRef (children already synced)');
      internalValueRef.current = fieldValue;
      lastSentValueRef.current = null;
    } else if (fieldValue && lastSentValueRef.current && isEqual(fieldValue, lastSentValueRef.current)) {
      // Redux caught up and editor.children already matches - just clear the ref
      console.log('[TOOLBAR] Redux caught up, clearing lastSentValueRef');
      lastSentValueRef.current = null;
    }

    // Update editor selection using Transforms (like Volto line 167)
    // Only sync if selection is valid for current document structure
    if (currentSelection && !isEqual(currentSelection, editor.selection)) {
      try {
        Transforms.select(editor, currentSelection);
        // Save selection for Link plugin to use
        editor.savedSelection = currentSelection;

        // Force re-render to update button active states when selection changes
        safeIncrementRenderKey();
      } catch (e) {
        // Selection is invalid for current document - likely stale, ignore it
        console.warn('[TOOLBAR] Selection transform failed (ignoring stale selection):', e.message);
      }
    } else if (currentSelection) {
      // Still update savedSelection even if selection hasn't changed
      editor.savedSelection = currentSelection;
    }

    // Check if there's a pending flush request to complete
    // This runs regardless of whether formData changed (handles BUFFER_FLUSHED case)
    if (completedFlushRequestId && pendingFlushRef.current) {
      const { requestId, button } = pendingFlushRef.current;
      if (requestId === completedFlushRequestId) {
        pendingFlushRef.current = null;
        // Store requestId so handleChange can include it in FORM_DATA
        // This allows iframe to match FORM_DATA to the FLUSH_BUFFER that started blocking
        activeFormatRequestIdRef.current = requestId;
        console.log('[TOOLBAR] Stored activeFormatRequestId:', requestId);
        button.dataset.bypassCapture = 'true';
        // Find the actual clickable element - Semantic UI Button renders as <a> tag
        // The onMouseDown handler is on the <a> tag, not the wrapper
        const clickableElement = button.querySelector('a.ui.button') || button.querySelector('button') || button;
        // Dispatch mousedown event since Slate buttons apply formatting on mousedown
        // We need bubbles: true for React's event delegation to work
        // Mark the event so AddLinkForm's handleClickOutside can ignore it
        const mousedownEvent = new MouseEvent('mousedown', {
          bubbles: true,
          cancelable: true,
          view: window,
        });
        mousedownEvent._hydraReDispatch = true;
        // Store on window so handleClickOutside can check it
        window._hydraReDispatchEvent = mousedownEvent;
        clickableElement.dispatchEvent(mousedownEvent);
        // Clean up after a tick
        setTimeout(() => {
          window._hydraReDispatchEvent = null;
        }, 0);
        delete button.dataset.bypassCapture;
      }
    }
  }, [selectedBlock, form, currentSelection, editor, blockUI?.focusedFieldName, dispatch, completedFlushRequestId, blockFieldTypes, safeIncrementRenderKey]);

  // Handle transformAction from iframe (format, paste, delete)
  // These arrive atomically with form data, so editor already has the latest text
  useEffect(() => {
    if (!transformAction || !editor) return;

    const { type, requestId } = transformAction;

    // Skip if we already processed this transform (prevents double-application during re-renders)
    if (requestId && requestId === processedTransformRequestIdRef.current) {
      return;
    }
    processedTransformRequestIdRef.current = requestId;

    console.log('[TOOLBAR] Processing transformAction:', transformAction);

    // Store requestId so handleChange includes it in FORM_DATA for iframe unblocking
    if (requestId) {
      activeFormatRequestIdRef.current = requestId;
    }

    // Selection is already synced from iframeSyncState via the earlier useEffect

    try {
      switch (type) {
        case 'format':
          const format = transformAction.format;
          console.log('[TOOLBAR] Applying format:', format);

          // Check if selection is collapsed (cursor, no range)
          const isCollapsed = editor.selection && Range.isCollapsed(editor.selection);
          const formatIsActive = isBlockActive(editor, format);

          if (isCollapsed) {
            // Prospective formatting - handle differently for collapsed selections
            if (formatIsActive) {
              // Cursor is inside the format element - exit it (move cursor after)
              // Find the inline element we're in and move cursor after it
              const [inlineEntry] = Editor.nodes(editor, {
                match: n => n.type === format,
                mode: 'lowest',
              });

              if (inlineEntry) {
                const [, inlinePath] = inlineEntry;
                // Move cursor to after the inline element
                const afterPoint = Editor.after(editor, inlinePath);
                if (afterPoint) {
                  Transforms.select(editor, afterPoint);
                  // Selection-only change won't trigger handleChange, so manually send FORM_DATA to unblock
                  if (requestId) {
                    onChangeFormData(form, editor.selection, requestId);
                    activeFormatRequestIdRef.current = null;
                    console.log('[TOOLBAR] Sent selection-only update with requestId to unblock iframe');
                  }
                } else {
                  // No point after - insert empty text node after and position there
                  Transforms.insertNodes(editor, { text: '' }, { at: [...inlinePath.slice(0, -1), inlinePath[inlinePath.length - 1] + 1] });
                  const newAfterPoint = Editor.after(editor, inlinePath);
                  if (newAfterPoint) {
                    Transforms.select(editor, newAfterPoint);
                  }
                  console.log('[TOOLBAR] Inserted text node and moved cursor after inline element');
                }
              }
            } else {
              // Cursor is NOT inside the format element - enable prospective formatting
              // Insert an empty inline element and position cursor inside it
              const inlineNode = { type: format, children: [{ text: '' }] };
              Transforms.insertNodes(editor, inlineNode);

              // Move cursor inside the newly inserted inline element
              // After insertion, cursor should be after the inserted node
              // We need to move it inside the empty text child
              const [insertedEntry] = Editor.nodes(editor, {
                match: n => n.type === format && n.children?.length === 1 && n.children[0].text === '',
                mode: 'lowest',
                reverse: true, // Start from cursor position going backwards
              });

              if (insertedEntry) {
                const [, insertedPath] = insertedEntry;
                // Position cursor at the start of the empty text inside the inline element
                Transforms.select(editor, { path: [...insertedPath, 0], offset: 0 });
                console.log('[TOOLBAR] Inserted empty inline element and positioned cursor inside');
              }

              // DON'T call onChangeFormData here - handleChange will fire because we changed children
              // handleChange will pick up activeFormatRequestIdRef.current and include it
              // (Unlike selection-only changes where we must call explicitly)
              console.log('[TOOLBAR] Prospective format applied, handleChange will send update');
            }
          } else {
            // Range selection - use toggleInlineFormat to wrap/unwrap selected text
            toggleInlineFormat(editor, format);
          }
          break;

        case 'paste':
          // Paste has no button - use direct Slate transforms
          const pastedSlate = slateTransforms.htmlToSlate(transformAction.html);
          let fragment = [];
          pastedSlate.forEach((node) => {
            if (node.children) {
              fragment.push(...node.children);
            } else {
              fragment.push(node);
            }
          });
          if (fragment.length === 1 && fragment[0].text !== undefined && Object.keys(fragment[0]).length === 1) {
            Transforms.insertText(editor, fragment[0].text);
          } else {
            Transforms.insertNodes(editor, fragment);
          }
          break;

        case 'delete':
          // Delete has no button - use direct Slate transforms
          Transforms.delete(editor, {
            unit: 'character',
            reverse: transformAction.direction === 'backward',
          });
          break;

        default:
          console.warn('[TOOLBAR] Unknown transform type:', type);
      }

    } catch (e) {
      console.error('[TOOLBAR] Error applying transform:', e);
    }

    // Clear the transform action
    onTransformApplied?.();
  }, [transformAction, editor, onTransformApplied, form, onChangeFormData]);

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

  // Handle changes from button clicks (like Volto's handleChange)
  const handleChange = useCallback(
    (newValue) => {
      // Update internal value tracker
      internalValueRef.current = newValue;

      // Only call onChange if value actually changed (like Volto line 108)
      const block = form.blocks[selectedBlock];
      const fieldName = blockUI?.focusedFieldName || 'value';
      const currentFieldValue = block?.[fieldName];

      if (isEqual(newValue, currentFieldValue)) {
        return;
      }

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

      // Track what we're sending so useEffect doesn't overwrite with stale data
      lastSentValueRef.current = newValue;
      // Send form data AND selection together atomically to parent
      // This ensures the iframe receives both in sync
      // Include requestId if this is from a format operation (allows iframe to match and unblock)
      const formatRequestId = activeFormatRequestIdRef.current;
      activeFormatRequestIdRef.current = null; // Clear after use
      onChangeFormData(updatedForm, editor.selection, formatRequestId);

      // DON'T increment renderKey here - it would remount <Slate> and reset editor.children
      // Buttons will re-render naturally when React processes the state updates
    },
    [form, selectedBlock, onChangeFormData, blockUI?.focusedFieldName, editor],
  );

  // Create Redux store for persistent helpers (like LinkEditor)
  // This provides the state management that Slate plugins expect
  // Get button configuration
  const toolbarButtons = config.settings.slate?.toolbarButtons || [];
  const buttons = config.settings.slate?.buttons || {};
  const persistentHelpers = config.settings.slate?.persistentHelpers || [];



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

  // Debug: Check what blockFieldTypes the toolbar is receiving
  if (blockType === 'hero') {
    console.log('[TOOLBAR] Hero block - blockFieldTypes keys:', Object.keys(blockFieldTypes || {}));
    console.log('[TOOLBAR] Hero block - blockFieldTypes[hero]:', blockFieldTypes?.['hero']);
    console.log('[TOOLBAR] fieldName:', fieldName, 'fieldType:', fieldType, 'showFormatButtons:', showFormatButtons);
    console.log('[TOOLBAR] fieldValue:', fieldValue, 'hasValidSlateValue:', fieldValue && Array.isArray(fieldValue) && fieldValue.length > 0);
  }

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
          color: '#666',
          fontSize: '14px',
          background: '#e8e8e8',
          borderRadius: '2px',
        }}
      >
        ⠿
      </div>

      {/* Real Slate buttons - only show if we have a valid slate field value */}
      {/* IMPORTANT: Wrap in div with pointerEvents: 'auto' to make buttons clickable
          while parent toolbar has pointerEvents: 'none' for drag-and-drop passthrough */}
      {/* Wrapped with Redux Provider for buttons that dispatch Redux actions (like Link button) */}
      {showFormatButtons && hasValidSlateValue && (
        <div
          style={{ pointerEvents: 'auto', display: 'flex', gap: '1px', alignItems: 'center' }}
          onMouseDownCapture={(e) => {
            // Slate buttons apply formatting on mousedown (not click) to prevent focus loss
            // We must capture mousedown to intercept before format is applied
            console.log('[TOOLBAR] onMouseDownCapture fired, target:', e.target.tagName, e.target.title || e.target.className);

            // Don't intercept clicks inside popups (like LinkEditor's Clear/Submit buttons)
            if (e.target.closest('.add-link')) {
              console.log('[TOOLBAR] Click inside popup, not intercepting');
              return;
            }

            // Find the actual button element - could be button, a (Semantic UI), or our wrapper span
            const button = e.target.closest('button') || e.target.closest('[data-toolbar-button]');
            if (!button) {
              console.log('[TOOLBAR] No button found, target:', e.target.tagName);
              return;
            }

            // Check if this is a re-triggered event after flush
            if (button.dataset.bypassCapture === 'true') {
              console.log('[TOOLBAR] Bypass capture - letting mousedown through');
              return; // Let the mousedown proceed normally
            }

            console.log('[TOOLBAR] Button mousedown intercepted, flushing buffer first');

            // Prevent the immediate mousedown - we'll re-trigger after flush
            e.preventDefault();
            e.stopPropagation();

            // Generate unique request ID and store pending request
            const requestId = `flush-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            pendingFlushRef.current = { requestId, button };

            // Send FLUSH_BUFFER to iframe - response will come via completedFlushRequestId prop
            const iframe = document.getElementById('previewIframe');
            if (iframe?.contentWindow) {
              iframe.contentWindow.postMessage({ type: 'FLUSH_BUFFER', requestId }, '*');
            }
          }}
          onClickCapture={(e) => {
            // Also capture click to prevent it when mousedown was intercepted
            // Click fires after mousedown, so if we intercepted mousedown, we should also block click
            const button = e.target.closest('button') || e.target.closest('[data-toolbar-button]');
            if (!button) return;

            if (button.dataset.bypassCapture === 'true') {
              console.log('[TOOLBAR] Bypass capture - letting click through');
              return;
            }

            // If pendingFlushRef has a request, the mousedown was intercepted
            // Block this click to prevent double-application
            if (pendingFlushRef.current) {
              console.log('[TOOLBAR] Click blocked - waiting for flush');
              e.preventDefault();
              e.stopPropagation();
            }
          }}
        >
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

                return (
                  <span key={`${name}-${i}`} data-toolbar-button={name}>
                    <Btn />
                  </span>
                );
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
