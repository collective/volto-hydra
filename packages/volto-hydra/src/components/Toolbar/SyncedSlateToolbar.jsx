import React, { useState, useEffect, useLayoutEffect, useCallback, useRef, Component } from 'react';
import { Slate, ReactEditor } from 'slate-react';
import { Transforms, Node, Range, Editor, Point } from 'slate';
import { isEqual, cloneDeep } from 'lodash';
import config from '@plone/volto/registry';
import { Icon } from '@plone/volto/components';
import { makeEditor, toggleInlineFormat, isBlockActive } from '@plone/volto-slate/utils';
import { BlockButton } from '@plone/volto-slate/editor/ui';
import slateTransforms, { withEmptyInlineRemoval } from '../../utils/slateTransforms';
import { getBlockById, updateBlockById } from '../../utils/blockPath';
import { isSlateFieldType, calculateDragHandlePosition, PAGE_BLOCK_UID } from '@volto-hydra/hydra-js';
import { useDispatch } from 'react-redux';
import FormatDropdown from './FormatDropdown';
import DropdownMenu from './DropdownMenu';
import linkSVG from '@plone/volto/icons/link.svg';
import imageSVG from '@plone/volto/icons/image.svg';
import clearSVG from '@plone/volto/icons/clear.svg';
import AddLinkForm from '@plone/volto/components/manage/AnchorPlugin/components/LinkButton/AddLinkForm';
import { ImageInput } from '@plone/volto/components/manage/Widgets/ImageWidget';

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
 * Checks if a button factory creates a BlockButton component.
 *
 * Button factories in config.settings.slate.buttons are arrow functions that
 * return React elements: (props) => <MarkElementButton ... /> or <BlockButton ... />
 *
 * We call the factory (with empty props) to get the element, then compare the
 * element's type to the imported BlockButton component reference.
 *
 * BlockButtons are used for block-level formatting (headings, lists, blockquote).
 * They should go in the FormatDropdown. Other buttons (MarkElementButton for bold,
 * italic, etc.) stay in the toolbar.
 *
 * NOTE: We compare element.type === BlockButton directly, which works in both
 * development and production builds because it's a reference comparison, not
 * a string name comparison that would be affected by minification.
 */
function isBlockButton(Btn, BlockButtonRef) {
  if (!Btn || !BlockButtonRef) return false;
  try {
    // Call the factory function to get the React element
    // The factory is like: (props) => <BlockButton format="h2" ... />
    // Calling it returns the element {type: BlockButton, props: {...}}
    const element = Btn({});
    // Compare element.type to the imported BlockButton component reference
    // This is a reference comparison that works in production builds
    return element?.type === BlockButtonRef;
  } catch (e) {
    // If the factory throws (shouldn't happen), treat as non-block button
    return false;
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
 * For detailed data flow architecture (format buttons, sidebar editing, hotkeys,
 * block selection), see: docs/slate-transforms-architecture.md
 */
const SyncedSlateToolbar = ({
  selectedBlock,
  form,
  blockPathMap,
  currentSelection,
  onChangeFormData,
  completedFlushRequestId,
  transformAction,
  onTransformApplied,
  blockUI,
  blockFieldTypes,
  iframeElement,
  onDeleteBlock,
  onSelectBlock,
  parentId,
  maxToolbarWidth,
  blockActions, // { toolbar: [...], dropdown: [...] } from pathMap.actions
  onBlockAction, // Handler for block actions: (actionId) => void
  onFieldLinkChange, // Handler for link field changes: (fieldName, url) => void
  onOpenObjectBrowser, // Handler to open object browser for media fields
  onFileUpload, // Handler for file uploads: (fieldName, file) => void
  convertibleTypes = [], // Array of { type, title } for block type conversion
  onConvertBlock, // Handler for block conversion: (newType) => void
}) => {

  // Helper to get block data using path lookup (supports nested blocks)
  // For page-level fields (blockId is PAGE_BLOCK_UID), return form itself
  const getBlock = useCallback((blockId) => {
    if (blockId === PAGE_BLOCK_UID) {
      return form; // Page-level fields access form directly
    }
    return getBlockById(form, blockPathMap, blockId);
  }, [form, blockPathMap]);

  // Helper to update block data using path lookup (supports nested blocks)
  const updateBlockInForm = useCallback((blockId, newBlockData) => {
    return updateBlockById(form, blockPathMap, blockId, newBlockData);
  }, [form, blockPathMap]);

  // Create Slate editor once using Volto's makeEditor (includes all plugins)
  // Add withEmptyInlineRemoval to clean up empty formatting elements after delete
  const [editor] = useState(() => {
    const ed = withEmptyInlineRemoval(makeEditor());

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


  // Detect clicks in iframe to close popups like LinkEditor
  // Clicks in iframe don't bubble to parent document, so handleClickOutside never fires
  // Solution: When Admin window loses focus to iframe, dispatch synthetic mousedown
  useEffect(() => {
    const handleWindowBlur = () => {
      // Check if focus went to the iframe
      const iframe = document.getElementById('previewIframe');
      if (document.activeElement === iframe) {
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
  // State for dropdown menu
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuButtonRect, setMenuButtonRect] = useState(null);

  // State for field link editor popup
  const [fieldLinkEditorOpen, setFieldLinkEditorOpen] = useState(false);
  const [fieldLinkEditorField, setFieldLinkEditorField] = useState(null);

  // State for field image editor popup
  const [fieldImageEditorOpen, setFieldImageEditorOpen] = useState(false);
  const [fieldImageEditorField, setFieldImageEditorField] = useState(null);

  // Close image editor when block is deselected or changes
  useEffect(() => {
    if (!selectedBlock || !blockUI) {
      setFieldImageEditorOpen(false);
      setFieldImageEditorField(null);
    }
  }, [selectedBlock, blockUI]);

  // Helper to replace editor content using proper Slate APIs
  // Direct assignment (editor.children = X) bypasses Slate-react's state tracking,
  // causing "Cannot find descendant at path" errors when transforms run afterward
  // Optional transformCallback runs INSIDE the same withoutNormalizing block
  // so all operations are batched together
  const replaceEditorContent = useCallback((newValue, selection, transformCallback) => {
    Editor.withoutNormalizing(editor, () => {
      // Remove all existing nodes
      while (editor.children.length > 0) {
        Transforms.removeNodes(editor, { at: [0] });
      }
      // Insert new content (cloned to prevent Slate normalization from mutating Redux state)
      const newNodes = cloneDeep(newValue);
      for (let i = 0; i < newNodes.length; i++) {
        Transforms.insertNodes(editor, newNodes[i], { at: [i] });
      }
      // Restore selection if valid
      if (selection && isSelectionValidForDocument(selection, newValue)) {
        try {
          Transforms.select(editor, selection);
        } catch (e) {
          // Selection invalid, ignore
        }
      }
      // Run transform callback inside the same batch if provided
      if (transformCallback) {
        transformCallback();
      }
    });
  }, [editor]);

  // Track last sequence we've seen to detect new data
  const lastSeenSequenceRef = useRef(0);

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
          linkEditorWasVisibleRef.current = false;
          handlePopupClosed();
        }
        return;
      }

      const style = window.getComputedStyle(popup);
      const isVisible = style.opacity !== '0' && style.display !== 'none' && style.visibility !== 'hidden';

      if (linkEditorWasVisibleRef.current && !isVisible) {
        handlePopupClosed();
      }
      linkEditorWasVisibleRef.current = isVisible;
    };

    const handlePopupClosed = () => {
      if (activeFormatRequestIdRef.current) {
        onChangeFormData(form, currentSelection, activeFormatRequestIdRef.current);
        activeFormatRequestIdRef.current = null;
      }
      // NOTE: Don't clear pendingFlushRef here - it will be cleared when the flush completes.
      // The polling might detect a stale popup closing while a new button click is pending,
      // and we don't want to interfere with that pending operation.

      // Restore focus to the specific field in the iframe after LinkEditor closes
      // We know which block and field was selected when the popup opened
      if (iframeElement?.contentWindow && selectedBlock) {
        const fieldName = blockUI?.focusedFieldName || 'value';
        iframeElement.contentWindow.postMessage({
          type: 'FOCUS_FIELD',
          blockId: selectedBlock,
          fieldName: fieldName,
        }, '*');
      }
    };

    const intervalId = setInterval(checkVisibility, 100);
    return () => clearInterval(intervalId);
  }, [form, currentSelection, onChangeFormData, iframeElement, selectedBlock, blockUI?.focusedFieldName]);

  // Helper function for applying inline format with prospective formatting support
  // Used by both hotkey transforms and toolbar button clicks
  const applyInlineFormat = useCallback((format, requestId) => {
    if (!editor) return;

    // Store requestId so handleChange includes it in FORM_DATA for iframe unblocking
    if (requestId) {
      activeFormatRequestIdRef.current = requestId;
    }

    const isCollapsed = editor.selection && Range.isCollapsed(editor.selection);
    const formatIsActive = isBlockActive(editor, format);

    if (isCollapsed) {
      // Prospective formatting - handle differently for collapsed selections
      if (formatIsActive) {
        // Cursor is inside the format element - exit it (move cursor after)
        const [inlineEntry] = Editor.nodes(editor, {
          match: n => n.type === format,
          mode: 'lowest',
        });

        if (inlineEntry) {
          const [, inlinePath] = inlineEntry;
          const afterPoint = Editor.after(editor, inlinePath);
          const formBlock = getBlockById(form, blockPathMap, selectedBlock);
          const formBlockValue = formBlock?.value?.[0]?.children;
          console.log('[TOOLBAR FORMAT] Cursor exit: inlinePath:', JSON.stringify(inlinePath), 'afterPoint:', JSON.stringify(afterPoint), 'editor.children:', JSON.stringify(editor.children?.[0]?.children), 'form.blocks.value:', JSON.stringify(formBlockValue));
          if (afterPoint) {
            Transforms.select(editor, afterPoint);
            // Selection-only change won't trigger handleChange, so manually send FORM_DATA
            if (requestId) {
              onChangeFormData(form, editor.selection, requestId);
              activeFormatRequestIdRef.current = null;
            }
          } else {
            console.log('[TOOLBAR FORMAT] Cursor exit: NO afterPoint, inserting empty text node');
            Transforms.insertNodes(editor, { text: '' }, { at: [...inlinePath.slice(0, -1), inlinePath[inlinePath.length - 1] + 1] });
            const newAfterPoint = Editor.after(editor, inlinePath);
            if (newAfterPoint) {
              Transforms.select(editor, newAfterPoint);
            }
          }
        }
      } else {
        // Cursor is NOT inside the format element - enable prospective formatting
        // Use zero-width space (ZWS) to prevent withEmptyInlineRemoval from removing the node
        // ZWS is invisible but makes the node non-empty, so normalization won't delete it
        console.log('[TOOLBAR FORMAT] Before insertNodes:', JSON.stringify(editor.children?.[0]?.children), 'selection:', JSON.stringify(editor.selection));
        const inlineNode = { type: format, children: [{ text: '\u200B' }] };
        Transforms.insertNodes(editor, inlineNode);
        console.log('[TOOLBAR FORMAT] After insertNodes:', JSON.stringify(editor.children?.[0]?.children), 'ops:', editor.operations.length);

        const [insertedEntry] = Editor.nodes(editor, {
          match: n => n.type === format && n.children?.length === 1 && n.children[0].text === '\u200B',
          mode: 'lowest',
          reverse: true,
        });

        if (insertedEntry) {
          const [, insertedPath] = insertedEntry;
          Transforms.select(editor, { path: [...insertedPath, 0], offset: 0 });
          console.log('[TOOLBAR FORMAT] After select, insertedPath:', JSON.stringify(insertedPath), 'selection:', JSON.stringify(editor.selection));
        } else {
          console.log('[TOOLBAR FORMAT] WARNING: Could not find inserted node!');
        }
        // handleChange will fire because we changed children
      }
    } else {
      // Range selection - use toggleInlineFormat to wrap/unwrap selected text
      // Use rangeRef to track selection through the transform - wrapNodes creates
      // the inline element, then Slate normalization adds empty text nodes before/after.
      // Without rangeRef, the selection path becomes stale (points to empty text node).
      const rangeRef = Editor.rangeRef(editor, editor.selection);
      toggleInlineFormat(editor, format);
      // Restore selection from tracked range (handles path shifts from wrapping/normalization)
      if (rangeRef.current) {
        try {
          Transforms.select(editor, rangeRef.current);
        } catch (e) {
          console.warn('[TOOLBAR FORMAT] Failed to restore selection after format:', e.message);
        }
        rangeRef.unref();
      }
    }
  }, [editor, form, onChangeFormData]);

  // Sync editor state when form data, selection, or transform changes
  useEffect(() => {
    // === SETUP ===
    const block = getBlock(selectedBlock);
    if (!selectedBlock || !block) return;

    const fieldName = blockUI?.focusedFieldName || 'value';
    const fieldValue = block[fieldName];

    // Only sync for slate fields
    const blockType = block?.['@type'];
    const fieldType = blockFieldTypes?.[blockType]?.[fieldName];
    if (!isSlateFieldType(fieldType)) {
      internalValueRef.current = null;
      return;
    }

    // === DETERMINE WHAT NEEDS TO HAPPEN ===
    const incomingSequence = form?._editSequence || 0;
    const hasNewData = incomingSequence > lastSeenSequenceRef.current;
    // Always track the highest sequence seen, even if we don't sync content
    // This prevents older data (e.g., INLINE_EDIT_DATA sent before format) from being seen as "new"
    if (hasNewData) {
      lastSeenSequenceRef.current = incomingSequence;
    }
    // Content sync is needed if fieldValue differs from editor.children AND it's newer data
    // The sequence check prevents older INLINE_EDIT_DATA (e.g., from typing before format)
    // from overwriting formatted content that was applied after it was sent
    const contentIsDifferent = fieldValue && !isEqual(fieldValue, editor.children);
    const contentNeedsSync = hasNewData && contentIsDifferent;
    const hasUnprocessedTransform = transformAction &&
      transformAction.requestId !== processedTransformRequestIdRef.current;

    console.log('[TOOLBAR SYNC] hasNewData:', hasNewData,
      'contentNeedsSync:', contentNeedsSync,
      'hasUnprocessedTransform:', hasUnprocessedTransform,
      'incomingSeq:', incomingSequence, 'lastSeenSeq:', lastSeenSequenceRef.current);

    // Debug: check for ZWS differences
    if (fieldValue && editor.children) {
      const fieldText = fieldValue[0]?.children?.[0]?.text;
      const editorText = editor.children[0]?.children?.[0]?.text;
      if (fieldText !== editorText) {
        console.log('[TOOLBAR SYNC] Text mismatch - fieldValue:', JSON.stringify(fieldText?.substring(0,40)),
          'editor:', JSON.stringify(editorText?.substring(0,40)),
          'fieldHasZWS:', fieldText?.includes('\u200B'),
          'editorHasZWS:', editorText?.includes('\u200B'));
      }
    }

    // Helper to apply transform based on type
    const applyTransform = () => {
      const { type, requestId } = transformAction;
      switch (type) {
        case 'format':
          applyInlineFormat(transformAction.format, requestId);
          break;
        case 'paste':
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
          // When selection is collapsed, delete one character in the given direction
          // When selection is a range, delete the entire selection (no unit option)
          if (editor.selection && Range.isCollapsed(editor.selection)) {
            Transforms.delete(editor, {
              unit: 'character',
              reverse: transformAction.direction === 'backward',
            });
          } else {
            Transforms.delete(editor);
          }
          break;
        default:
          console.warn('[TOOLBAR] Unknown transform type:', type);
      }
    };

    // === EXECUTE ===
    if (contentNeedsSync) {
      // Content changed from external source - sync it
      console.log('[TOOLBAR SYNC] Syncing content from iframe, incomingSeq:', incomingSequence, 'fieldValue[0].children[0].text:', JSON.stringify(fieldValue?.[0]?.children?.[0]?.text?.substring(0, 30)));
      // Debug: log full children structure to diagnose missing "w" bug
      if (fieldValue?.[0]?.children) {
        console.log('[TOOLBAR SYNC] Full children structure:', JSON.stringify(fieldValue[0].children));
      }

      // If there's a transform, run it in the same batch
      const transformCallback = hasUnprocessedTransform ? () => {
        processedTransformRequestIdRef.current = transformAction.requestId;
        // Set the requestId so handleChange includes it in FORM_DATA for iframe unblocking
        // This is needed for delete/paste transforms that don't go through applyInlineFormat
        activeFormatRequestIdRef.current = transformAction.requestId;
        console.log('[TOOLBAR SYNC] Applying transform in batch');
        applyTransform();
        onTransformApplied?.();
      } : null;

      replaceEditorContent(fieldValue, currentSelection, transformCallback);

      // Debug: check what editor.children looks like after replace
      console.log('[TOOLBAR SYNC] After replaceEditorContent, editor.children[0].children[0].text:',
        JSON.stringify(editor.children?.[0]?.children?.[0]?.text?.substring(0, 40)));
      // Debug: show full editor children after replace to diagnose missing "w"
      if (editor.children?.[0]?.children) {
        console.log('[TOOLBAR SYNC] After replace, full editor.children[0].children:', JSON.stringify(editor.children[0].children));
      }

      // Update internalValueRef from editor.children AFTER transform (not fieldValue)
      internalValueRef.current = editor.children;

    } else if (hasUnprocessedTransform) {
      // No content sync needed (sequence check passed), but transform is pending
      processedTransformRequestIdRef.current = transformAction.requestId;
      // Set the requestId so handleChange includes it in FORM_DATA for iframe unblocking
      // This is needed for delete/paste transforms that don't go through applyInlineFormat
      activeFormatRequestIdRef.current = transformAction.requestId;

      // IMPORTANT: Even if hasNewData is false, the transform request includes the iframe's
      // current content. If content differs, sync it first. This handles cases where the
      // iframe typed text but the sequence didn't change (e.g., typing during blocking).
      if (contentIsDifferent) {
        console.log('[TOOLBAR SYNC] Content differs, syncing before transform');
        replaceEditorContent(fieldValue, currentSelection, () => {
          console.log('[TOOLBAR SYNC] Applying transform after content sync');
          applyTransform();
        });
        internalValueRef.current = editor.children;
      } else {
        console.log('[TOOLBAR SYNC] Applying transform (content already synced)');
        // IMPORTANT: Apply the selection from the iframe before running the transform
        // The transform request includes the selection where the format should be applied,
        // but the editor's selection may be stale (e.g., at end of paragraph instead of
        // the selected text range). We need to update editor.selection first.
        if (currentSelection && !isEqual(currentSelection, editor.selection) &&
            isSelectionValidForDocument(currentSelection, editor.children)) {
          console.log('[TOOLBAR SYNC] Applying selection before transform:', JSON.stringify(currentSelection));
          try {
            Transforms.select(editor, currentSelection);
          } catch (e) {
            console.warn('[TOOLBAR SYNC] Failed to apply selection before transform:', e.message);
          }
        }
        applyTransform();
      }

    } else if (!contentNeedsSync && currentSelection && !isEqual(currentSelection, editor.selection)) {
      // Check if selection needs update
      const isValid = isSelectionValidForDocument(currentSelection, editor.children);
      if (isValid) {
        // Selection-only change - update editor's selection
        // This handles clicks that move cursor without changing content
        console.log('[TOOLBAR SYNC] Selection-only change, updating editor.selection:', JSON.stringify(currentSelection));
        try {
          Transforms.select(editor, currentSelection);
        } catch (e) {
          // Selection invalid, ignore
        }
      } else {
        console.log('[TOOLBAR SYNC] Selection invalid for document:', JSON.stringify(currentSelection),
          'editor.children[0]:', JSON.stringify(editor.children?.[0]?.children?.map(c => ({ type: c.type, text: c.text?.substring(0,20) }))));
      }
    }

    // Update savedSelection from editor.selection AFTER all operations complete
    // This ensures Link plugin gets the correct position after transforms
    if (editor.selection) {
      editor.savedSelection = editor.selection;
    }

    // Update internal ref if content matches but ref is stale
    if (fieldValue && !isEqual(fieldValue, internalValueRef.current)) {
      internalValueRef.current = fieldValue;
    }

    // === HANDLE TOOLBAR BUTTON FLUSH REQUESTS ===
    if (completedFlushRequestId && pendingFlushRef.current) {
      const { requestId, button } = pendingFlushRef.current;
      if (requestId === completedFlushRequestId) {
        pendingFlushRef.current = null;
        const buttonName = button.dataset.toolbarButton;
        const buttonToFormat = {
          bold: 'strong', italic: 'em', underline: 'u',
          strikethrough: 'del', sub: 'sub', sup: 'sup', code: 'code',
        };
        const format = buttonToFormat[buttonName];

        if (format) {
          applyInlineFormat(format, requestId);
        } else {
          // Non-format button - dispatch click event
          activeFormatRequestIdRef.current = requestId;
          button.dataset.bypassCapture = 'true';
          const clickable = button.querySelector('a.ui.button') || button.querySelector('button') || button;
          const event = new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window });
          event._hydraReDispatch = true;
          window._hydraReDispatchEvent = event;
          clickable.dispatchEvent(event);
          setTimeout(() => { window._hydraReDispatchEvent = null; }, 0);
          delete button.dataset.bypassCapture;
        }
      }
    }
  }, [selectedBlock, form, currentSelection, editor, blockUI?.focusedFieldName, dispatch, completedFlushRequestId, blockFieldTypes, getBlock, applyInlineFormat, replaceEditorContent, transformAction, onTransformApplied]);

  // NOTE: editor.hydra is set later (after toolbar position is calculated)
  // to include toolbarTop/toolbarLeft for LinkEditor positioning

  // Handle changes from button clicks (like Volto's handleChange)
  const handleChange = useCallback(
    (newValue) => {
      const newText = newValue?.[0]?.children?.[0]?.text?.substring(0, 40);
      console.log('[TOOLBAR onChange] called, newText:', JSON.stringify(newText), 'selection:', JSON.stringify(editor.selection));

      // Update internal value tracker
      internalValueRef.current = newValue;

      // Only call onChange if value actually changed (like Volto line 108)
      const block = getBlock(selectedBlock);
      const fieldName = blockUI?.focusedFieldName || 'value';
      const currentFieldValue = block?.[fieldName];
      const currentText = currentFieldValue?.[0]?.children?.[0]?.text?.substring(0, 40);

      if (isEqual(newValue, currentFieldValue)) {
        console.log('[TOOLBAR onChange] values equal, skipping');
        return;
      }
      console.log('[TOOLBAR onChange] values DIFFER! newText:', JSON.stringify(newText), 'currentText:', JSON.stringify(currentText), '- SENDING TO REDUX');

      // Build updated form data with the correct field (supports nested blocks)
      const updatedBlock = {
        ...block,
        [fieldName]: newValue,
      };
      const updatedForm = updateBlockInForm(selectedBlock, updatedBlock);

      // NOTE: Don't add _editSequence here - View.jsx adds it when sending FORM_DATA
      // View.jsx is the authoritative source for sequence numbers

      // Send form data AND selection together atomically to parent
      // This ensures the iframe receives both in sync
      // Include requestId if this is from a format operation (allows iframe to match and unblock)
      const formatRequestId = activeFormatRequestIdRef.current;
      activeFormatRequestIdRef.current = null; // Clear after use
      onChangeFormData(updatedForm, editor.selection, formatRequestId);

      // DON'T increment renderKey here - it would remount <Slate> and reset editor.children
      // Buttons will re-render naturally when React processes the state updates
    },
    [form, selectedBlock, onChangeFormData, blockUI?.focusedFieldName, editor, getBlock, updateBlockInForm],
  );

  // Get button configuration
  const toolbarButtons = config.settings.slate?.toolbarButtons || [];
  const buttons = config.settings.slate?.buttons || {};
  const persistentHelpers = config.settings.slate?.persistentHelpers || [];

  // Capture handlers for toolbar buttons - shared between main toolbar and overflow menu
  // These intercept mousedown to flush the iframe buffer before applying formatting
  const handleButtonMouseDownCapture = useCallback(
    (e) => {
      // Don't intercept clicks inside popups (like LinkEditor's Clear/Submit buttons)
      if (e.target.closest('.add-link')) {
        return;
      }

      // Don't intercept format dropdown trigger - it just opens a menu, no formatting
      if (e.target.closest('.format-dropdown-trigger')) {
        return;
      }

      const button =
        e.target.closest('button') || e.target.closest('[data-toolbar-button]');
      if (!button) return;

      // Check if this is a re-triggered event after flush
      if (button.dataset.bypassCapture === 'true') {
        return;
      }

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
    },
    [],
  );

  const handleButtonClickCapture = useCallback(
    (e) => {
      const button =
        e.target.closest('button') || e.target.closest('[data-toolbar-button]');
      if (!button) return;

      if (button.dataset.bypassCapture === 'true') {
        return;
      }

      // If pendingFlushRef has a request, the mousedown was intercepted
      // Block this click to prevent double-application
      if (pendingFlushRef.current) {
        e.preventDefault();
        e.stopPropagation();
      }
    },
    [],
  );

  // Classify buttons into block buttons (FormatDropdown) and inline buttons (toolbar)
  // Computed inline (not in useMemo) because isBlockButton() calls the factory
  // function which may use hooks - calling hooks inside useMemo violates Rules of Hooks
  const blockButtons = [];
  const allInlineButtons = [];

  toolbarButtons.forEach((name) => {
    if (name === 'separator') return;
    const Btn = buttons[name];
    if (!Btn) return;

    // Create element for later rendering
    const element = <Btn />;

    // Check if this is a BlockButton (block-level format like h2, h3, ul, ol)
    // isBlockButton compares element.type to imported BlockButton reference
    if (isBlockButton(Btn, BlockButton)) {
      blockButtons.push({ name, element });
    } else {
      allInlineButtons.push({ name, element });
    }
  });

  // Render toolbar when we have a rect (either block or page-level field)
  // selectedBlock is PAGE_BLOCK_UID for page-level fields
  if (!blockUI?.rect) {
    return null;
  }

  // DEFENSIVE: Verify we have form data with blocks
  if (!form) {
    throw new Error(`[SyncedSlateToolbar] form is ${form} - cannot render toolbar without form data`);
  }

  if (!form.blocks) {
    throw new Error(`[SyncedSlateToolbar] form.blocks is ${form.blocks} - form object doesn't have blocks property. Form keys: ${Object.keys(form).join(', ')}`);
  }

  // Check if we have block data for this specific block (supports nested blocks via path lookup)
  const block = getBlock(selectedBlock);
  if (!block) {
    return null; // No block data yet - this is OK during initial render
  }

  const fieldName = blockUI?.focusedFieldName || 'value';
  const fieldValue = block[fieldName];

  // Determine if we should show format buttons based on field type
  const blockType = block?.['@type'];
  const blockTypeFields = blockFieldTypes?.[blockType] || {};
  const fieldType = blockTypeFields[fieldName];
  const showFormatButtons = isSlateFieldType(fieldType);

  // Debug: Check what blockFieldTypes the toolbar is receiving
  if (blockType === 'hero') {
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
    : [{type: 'p', children: [{text: ''}]}];

  // DEBUG: Log first li keys during render to trace when corruption happens
  if (currentValue?.[0]?.children?.[0]) {
    const firstChild = currentValue[0].children[0];
  }

  // Calculate toolbar position - add iframe offset and position above the BLOCK CONTAINER
  // NOTE: blockUI.rect comes from BLOCK_SELECTED message and is the block container rect, NOT field rect
  const toolbarIframeRect = iframeElement?.getBoundingClientRect() || { top: 0, left: 0, width: 800, height: 600 };

  // Check if block is visible in the iframe viewport
  const blockTopInPage = toolbarIframeRect.top + blockUI.rect.top;
  const blockBottomInPage = blockTopInPage + blockUI.rect.height;
  const iframeBottom = toolbarIframeRect.top + toolbarIframeRect.height;
  const isBlockVisible = blockBottomInPage > toolbarIframeRect.top && blockTopInPage < iframeBottom;

  // Use shared calculation (same as iframe drag handle in hydra.js)
  const { top: toolbarTop, left: toolbarLeft } = calculateDragHandlePosition(
    blockUI.rect,
    { top: toolbarIframeRect.top, left: toolbarIframeRect.left }
  );

  // Update hydraData with toolbar position for LinkEditor positioning
  // This must be set SYNCHRONOUSLY during render (not in an effect) because
  // persistentHelpers (like LinkEditor) render after this and need the data
  editor.hydra = {
    iframeRect: { top: toolbarIframeRect.top, left: toolbarIframeRect.left },
    blockUIRect: blockUI?.rect,
    toolbarTop,
    toolbarLeft,
  };
  if (typeof window !== 'undefined') {
    window.voltoHydraData = editor.hydra;
  }

  // Calculate max width so toolbar doesn't extend past iframe right edge (sidebar boundary)
  const iframeRight = toolbarIframeRect.left + toolbarIframeRect.width;
  const availableWidth = Math.max(100, iframeRight - toolbarLeft); // Min 100px for basic controls
  const constrainedMaxWidth = Math.min(maxToolbarWidth || 400, availableWidth);

  // Calculate how many buttons fit based on constrained width
  // Measured widths: drag handle ~30px, menu button ~30px, gaps ~10px
  const BUTTON_WIDTH = 32;
  const FORMAT_DROPDOWN_WIDTH = 50;
  const FIXED_WIDTH = 70; // drag handle (30) + menu button (30) + gaps/padding (10)
  const availableForButtons = constrainedMaxWidth - FIXED_WIDTH;

  // Format dropdown counts as ~1.5 buttons worth of space
  const hasFormatDropdown = blockButtons.length > 0;
  const formatDropdownSlots = hasFormatDropdown ? Math.ceil(FORMAT_DROPDOWN_WIDTH / BUTTON_WIDTH) : 0;
  const availableSlots = Math.max(0, Math.floor(availableForButtons / BUTTON_WIDTH));

  // Block action buttons (e.g., add row/column for tables) also need slots
  const blockActionToolbarItems = blockActions?.toolbar || [];

  // Slate buttons come first in toolbar, so they get priority for slots
  // Calculate slots for Slate (format dropdown + inline buttons) first
  const slotsAfterFormatDropdown = Math.max(0, availableSlots - formatDropdownSlots);
  const slotsForInlineButtons = Math.min(allInlineButtons.length, slotsAfterFormatDropdown);
  const slotsUsedBySlate = formatDropdownSlots + slotsForInlineButtons;

  // Block actions get remaining slots after Slate buttons
  const slotsForBlockActions = Math.max(0, availableSlots - slotsUsedBySlate);
  const visibleBlockActions = blockActionToolbarItems.slice(0, slotsForBlockActions);
  const overflowBlockActions = blockActionToolbarItems.slice(slotsForBlockActions);

  // Show format dropdown only if there's room for it plus at least 1 inline button
  const showFormatDropdown = hasFormatDropdown && availableSlots >= formatDropdownSlots + 1;

  const visibleButtons = allInlineButtons.slice(0, slotsForInlineButtons);
  const overflowButtons = allInlineButtons.slice(slotsForInlineButtons);




  return (
    <>
      <div
        className="quanta-toolbar"
        style={{
          position: 'fixed',
          top: `${toolbarTop}px`,
          left: `${toolbarLeft}px`,
          maxWidth: `${constrainedMaxWidth}px`,
          zIndex: 10,
          display: isBlockVisible ? 'flex' : 'none',
          gap: '2px',
          background: '#fff',
          border: '1px solid #e0e0e0',
          borderRadius: '3px',
          padding: '2px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
          pointerEvents: 'none', // Allow events to pass through to iframe drag button
          overflow: 'hidden', // Ensure buttons don't extend past maxWidth
        }}
      >
      {/* Drag handle - only show for blocks, not page-level fields */}
      {selectedBlock && selectedBlock !== PAGE_BLOCK_UID ? (
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
      ) : (
        <div style={{ width: '8px' }} /> // Spacer for page-level fields
      )}

      {/* Real Slate buttons - only show if we have a valid slate field value */}
      {/* IMPORTANT: Wrap in div with pointerEvents: 'auto' to make buttons clickable
          while parent toolbar has pointerEvents: 'none' for drag-and-drop passthrough */}
      {/* Wrapped with Redux Provider for buttons that dispatch Redux actions (like Link button) */}
      {showFormatButtons && hasValidSlateValue && (
        <div
          style={{ pointerEvents: 'auto', display: 'flex', gap: '1px', alignItems: 'center' }}
          onMouseDownCapture={handleButtonMouseDownCapture}
          onClickCapture={handleButtonClickCapture}
        >
            <SlateErrorBoundary>
              <Slate
                editor={editor}
                initialValue={currentValue}
                onChange={handleChange}
              >
                <>
                  {/* Format dropdown for block-level buttons - only show if room */}
                  {showFormatDropdown && (
                    <FormatDropdown
                      blockButtons={blockButtons}
                      onMouseDownCapture={handleButtonMouseDownCapture}
                      onClickCapture={handleButtonClickCapture}
                    />
                  )}
                  {/* Visible inline format buttons */}
                  {visibleButtons.map(({ name, element }, i) => (
                    <span key={`${name}-${i}`} data-toolbar-button={name}>
                      {element}
                    </span>
                  ))}
                </>

              {/* Render persistent helpers (like LinkEditor) - they use editor.hydra for positioning */}
              {persistentHelpers.map((Helper, idx) => (
                <Helper key={idx} editor={editor} />
              ))}
              </Slate>
            </SlateErrorBoundary>
          </div>
      )}

      {/* Field-specific buttons for linkable/media fields */}
      {(blockUI?.focusedLinkableField || blockUI?.focusedMediaField) && (
        <div style={{ pointerEvents: 'auto', display: 'flex', gap: '1px', alignItems: 'center', position: 'relative' }}>
          {blockUI?.focusedLinkableField && (
            <button
              title={`Edit link (${blockUI.focusedLinkableField})`}
              onClick={() => {
                setFieldLinkEditorField(blockUI.focusedLinkableField);
                setFieldLinkEditorOpen(true);
              }}
              style={{
                background: fieldLinkEditorOpen ? '#e8e8e8' : 'none',
                border: 'none',
                padding: '4px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '2px',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#e8e8e8')}
              onMouseLeave={(e) => (e.currentTarget.style.background = fieldLinkEditorOpen ? '#e8e8e8' : 'none')}
            >
              <Icon name={linkSVG} size="18px" />
            </button>
          )}
          {blockUI?.focusedMediaField && (
            <button
              title={`Select image (${blockUI.focusedMediaField})`}
              onClick={() => {
                setFieldImageEditorField(blockUI.focusedMediaField);
                setFieldImageEditorOpen(true);
              }}
              style={{
                background: fieldImageEditorOpen ? '#e8e8e8' : 'none',
                border: 'none',
                padding: '4px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '2px',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#e8e8e8')}
              onMouseLeave={(e) => (e.currentTarget.style.background = fieldImageEditorOpen ? '#e8e8e8' : 'none')}
            >
              <Icon name={imageSVG} size="18px" />
            </button>
          )}

        </div>
      )}

      {/* Block action buttons (e.g., add row/column for tables) - only visible ones */}
      {visibleBlockActions.length > 0 && onBlockAction && (() => {
        const actionsRegistry = config.settings.hydraActions || {};
        return (
          <div style={{ pointerEvents: 'auto', display: 'flex', gap: '1px', alignItems: 'center' }}>
            {visibleBlockActions.map((actionId) => {
              const actionDef = actionsRegistry[actionId] || { label: actionId };
              return (
                <button
                  key={actionId}
                  title={actionDef.label}
                  onClick={() => onBlockAction(actionId)}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: '4px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '2px',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#e8e8e8')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                >
                  {actionDef.icon ? (
                    <Icon name={actionDef.icon} size="18px" />
                  ) : (
                    actionDef.label
                  )}
                </button>
              );
            })}
          </div>
        );
      })()}

      {/* Three-dots menu button */}
      <button
        style={{
          background: menuOpen ? '#e8e8e8' : '#fff',
          border: 'none',
          padding: '4px 6px',
          cursor: 'pointer',
          fontSize: '14px',
          color: '#999',
          pointerEvents: 'auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0, // Don't shrink - always visible
        }}
        title="More options"
        onClick={(e) => {
          e.stopPropagation();
          const rect = e.currentTarget.getBoundingClientRect();
          setMenuButtonRect(rect);
          setMenuOpen(!menuOpen);
        }}
      >
        ⋯
      </button>
    </div>

    {/* Dropdown menu with overflow buttons and actions */}
    {menuOpen && (
      <DropdownMenu
        selectedBlock={selectedBlock}
        onDeleteBlock={onDeleteBlock}
        menuButtonRect={menuButtonRect}
        onClose={() => setMenuOpen(false)}
        onOpenSettings={() => {
          // Expand sidebar if collapsed
          const sidebarContainer = document.querySelector('.sidebar-container');
          if (sidebarContainer?.classList.contains('collapsed')) {
            const triggerButton = sidebarContainer.querySelector('.trigger');
            triggerButton?.click();
          }
        }}
        parentId={parentId}
        onSelectBlock={onSelectBlock}
        overflowButtons={overflowButtons}
        showFormatDropdown={!showFormatDropdown}
        blockButtons={blockButtons}
        editor={editor}
        onChange={handleChange}
        onMouseDownCapture={handleButtonMouseDownCapture}
        onClickCapture={handleButtonClickCapture}
        tableActions={blockActions}
        overflowBlockActions={overflowBlockActions}
        onTableAction={onBlockAction}
        addMode={blockPathMap?.[selectedBlock]?.addMode}
        parentAddMode={blockPathMap?.[selectedBlock]?.parentAddMode}
        addDirection={blockUI?.addDirection}
        convertibleTypes={convertibleTypes}
        onConvertBlock={onConvertBlock}
      />
    )}

    {/* Field Link Editor Popup - fixed position at toolbar */}
    {fieldLinkEditorOpen && fieldLinkEditorField && (() => {
      const fieldDef = blockPathMap?.[selectedBlock]?.schema?.properties?.[fieldLinkEditorField];
      const isObjectBrowserLink = fieldDef?.widget === 'object_browser' && fieldDef?.mode === 'link';
      return (
        <div
          className="add-link field-link-editor"
          style={{
            position: 'fixed',
            top: `${toolbarTop}px`,
            left: `${toolbarLeft}px`,
            zIndex: 100,
            width: '300px',
          }}
        >
          <AddLinkForm
            data={{ url: getBlock(selectedBlock)?.[fieldLinkEditorField] || '' }}
            theme={{}}
            onChangeValue={(url) => {
              if (onFieldLinkChange) {
                onFieldLinkChange(fieldLinkEditorField, url);
              }
              setFieldLinkEditorOpen(false);
              setFieldLinkEditorField(null);
            }}
            onSelectItem={isObjectBrowserLink ? (url, item) => {
              if (onFieldLinkChange) {
                // Use full item metadata for object_browser link fields
                const linkValue = [{
                  '@id': item?.['@id'] || url,
                  title: item?.title || item?.Title || '',
                  description: item?.description || item?.Description || '',
                  hasPreviewImage: item?.hasPreviewImage ?? false,
                }];
                onFieldLinkChange(fieldLinkEditorField, linkValue);
              }
              setFieldLinkEditorOpen(false);
              setFieldLinkEditorField(null);
            } : undefined}
            onClear={() => {
              if (onFieldLinkChange) {
                onFieldLinkChange(fieldLinkEditorField, '');
              }
              setFieldLinkEditorOpen(false);
              setFieldLinkEditorField(null);
            }}
            onOverrideContent={() => {
              setFieldLinkEditorOpen(false);
              setFieldLinkEditorField(null);
            }}
          />
        </div>
      );
    })()}

    {/* Media Field Overlays - show when block is selected, for each media field */}
    {blockUI?.mediaFields && Object.entries(blockUI.mediaFields).map(([fieldName, fieldData]) => {
      const mediaValue = getBlock(selectedBlock)?.[fieldName];
      const hasMediaValue = mediaValue && (
        (Array.isArray(mediaValue) && mediaValue.length > 0) ||
        (typeof mediaValue === 'string' && mediaValue !== '')
      );

      // Get the media field element's rect from the message data
      const mediaRect = fieldData?.rect;
      if (!mediaRect) return null;

      console.log('[TOOLBAR] Media field overlay:', fieldName, 'hasMediaValue:', hasMediaValue, 'mediaRect:', mediaRect, 'toolbarIframeRect:', toolbarIframeRect);

      const fieldCenterX = toolbarIframeRect.left + mediaRect.left + mediaRect.width / 2;
      const fieldCenterY = toolbarIframeRect.top + mediaRect.top + mediaRect.height / 2;
      const fieldBottomY = toolbarIframeRect.top + mediaRect.top + mediaRect.height;
      const fieldRightX = toolbarIframeRect.left + mediaRect.left + mediaRect.width - 36;
      const fieldTopY = toolbarIframeRect.top + mediaRect.top + 8;
      const fieldLeftX = toolbarIframeRect.left + mediaRect.left;

      // Show ImageInput overlay if: no image, OR image editor is open for this field
      const showImagePicker = !hasMediaValue || (fieldImageEditorOpen && fieldImageEditorField === fieldName);
      // Show icon only when image is empty (not when editing existing image)
      const showIcon = !hasMediaValue;

      if (showImagePicker) {
        // Empty image OR editing existing - use ImageInput with showPreview={false}
        return (
          <div
            key={`empty-${fieldName}`}
            className="empty-image-overlay"
            style={{
              position: 'fixed',
              top: `${toolbarIframeRect.top + mediaRect.top}px`,
              left: `${toolbarIframeRect.left + mediaRect.left}px`,
              width: `${mediaRect.width}px`,
              height: `${mediaRect.height}px`,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: showIcon ? 'center' : 'flex-end',
              paddingBottom: showIcon ? '0' : '20px',
              zIndex: 10,
              pointerEvents: 'none', // Let clicks pass through to elements behind
            }}
          >
            {/* Large circular icon - only show when empty */}
            {showIcon && (
              <div
                style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  background: 'rgba(0, 123, 255, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '12px',
                  pointerEvents: 'auto', // Icon itself captures events
                }}
              >
                <Icon name={imageSVG} size="40px" color="#007bff" />
              </div>
            )}
            <ImageInput
              id={`inline-image-${fieldName}`}
              value={null}
              showPreview={false}
              onChange={(id, url, metadata) => {
                if (onFieldLinkChange) {
                  // Pass url and metadata (image_scales, image_field) for NamedBlobImage fields
                  onFieldLinkChange(fieldName, url, metadata);
                }
                // Close editor if it was open
                if (fieldImageEditorOpen) {
                  setFieldImageEditorOpen(false);
                  setFieldImageEditorField(null);
                }
              }}
              onClose={() => {
                setFieldImageEditorOpen(false);
                setFieldImageEditorField(null);
              }}
            />
          </div>
        );
      } else {
        // Filled image - show X button in top-right corner (no shadow)
        return (
          <button
            key={`clear-${fieldName}`}
            title="Clear image"
            onClick={() => {
              if (onFieldLinkChange) {
                onFieldLinkChange(fieldName, '');
              }
            }}
            style={{
              position: 'fixed',
              top: `${fieldTopY}px`,
              left: `${fieldRightX}px`,
              width: '28px',
              height: '28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(255, 255, 255, 0.9)',
              border: 'none',
              borderRadius: '50%',
              cursor: 'pointer',
              zIndex: 10,
              padding: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#fff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.9)';
            }}
          >
            <Icon name={clearSVG} size="16px" color="#e40166" />
          </button>
        );
      }
    })}

    {/* Starter UI Overlay - for blocks with empty required fields */}
    {blockPathMap?.[selectedBlock]?.emptyRequiredFields?.map(({ fieldName, fieldDef }) => {
      // For now, only render for object_browser link fields
      if (fieldDef?.widget !== 'object_browser' || fieldDef?.mode !== 'link') {
        return null;
      }

      // Center horizontally on the block
      const centerX = toolbarIframeRect.left + blockUI.rect.left + blockUI.rect.width / 2;
      const centerY = toolbarIframeRect.top + blockUI.rect.top + blockUI.rect.height / 2;

      return (
        <div
          key={`starter-${fieldName}`}
          className="starter-ui-overlay"
          style={{
            position: 'fixed',
            top: `${centerY - 20}px`,
            left: `${centerX}px`,
            transform: 'translateX(-50%)',
            zIndex: 100,
          }}
        >
          <AddLinkForm
            data={{ url: '' }}
            theme={{}}
            objectBrowserPickerType="link"
            onChangeValue={(url) => {
              if (onFieldLinkChange && url) {
                // For object_browser link fields, convert URL to array format
                const linkValue = [{ '@id': url }];
                onFieldLinkChange(fieldName, linkValue);
              }
            }}
            onSelectItem={(url, item) => {
              if (onFieldLinkChange && url) {
                // Use full item metadata from object browser for richer teaser display
                const linkValue = [{
                  '@id': item?.['@id'] || url,
                  title: item?.title || item?.Title || '',
                  description: item?.description || item?.Description || '',
                  hasPreviewImage: item?.hasPreviewImage ?? false,
                }];
                onFieldLinkChange(fieldName, linkValue);
              }
            }}
            onClear={() => {}}
            onOverrideContent={() => {}}
          />
        </div>
      );
    })}
    </>
  );
};

export default SyncedSlateToolbar;
