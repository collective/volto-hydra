import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useHistory } from 'react-router-dom';
import { compose } from 'redux';
import Cookies from 'js-cookie';
import { Node } from 'slate';
import {
  applyBlockDefaults,
  deleteBlock,
  getBlocksFieldname,
  getBlocksLayoutFieldname,
  insertBlock,
  moveBlock,
  mutateBlock,
  previousBlockId,
} from '@plone/volto/helpers';

/**
 * Validates if a selection is valid for the given slate value.
 * Returns true if all paths in the selection exist in the document.
 */
function isSelectionValidForValue(selection, slateValue) {
  if (!selection) return true; // No selection is always valid
  if (!slateValue || !Array.isArray(slateValue)) return false;

  const doc = { children: slateValue };

  try {
    if (selection.anchor?.path) {
      Node.get(doc, selection.anchor.path);
    }
    if (selection.focus?.path) {
      Node.get(doc, selection.focus.path);
    }
    return true;
  } catch (e) {
    return false;
  }
}
import './styles.css';
import { useIntl } from 'react-intl';
import config from '@plone/volto/registry';
import { buttons as slateButtons } from '@plone/volto-slate/editor/config';
import isValidUrl from '../../utils/isValidUrl';
import { BlockChooser } from '@plone/volto/components';
import { createPortal, flushSync } from 'react-dom';
import { usePopper } from 'react-popper';
import { useSelector, useDispatch } from 'react-redux';
import { getURlsFromEnv } from '../../utils/getSavedURLs';
import { setSidebarTab } from '@plone/volto/actions';
import {
  getAllowedBlocksList,
  setAllowedBlocksList,
} from '../../utils/allowedBlockList';
import toggleMark from '../../utils/toggleMark';
import slateTransforms from '../../utils/slateTransforms';
// Note: Editor, Transforms, toggleInlineFormat, toggleBlock were removed
// as applyFormat was replaced by SLATE_TRANSFORM_REQUEST handling
import OpenObjectBrowser from './OpenObjectBrowser';
import SyncedSlateToolbar from '../Toolbar/SyncedSlateToolbar';
import DropdownMenu from '../Toolbar/DropdownMenu';

/**
 * Extract field types for all block types from schema registry
 * @param {Object} intl - The react-intl intl object for internationalization
 * @returns {Object} - Object mapping blockType -> fieldName -> fieldType
 *
 * We look up schemas from config.blocks.blocksConfig for each registered block type
 * and identify which fields are Slate fields (widget: 'slate') vs text fields.
 * This way it works for all blocks of that type, including ones added later.
 */
const extractBlockFieldTypes = (intl) => {
  const blockFieldTypes = {};

  if (!config.blocks?.blocksConfig) {
    return blockFieldTypes;
  }

  // Hardcode known block types that don't have schemas
  // Slate blocks always have a 'value' field that is a slate field
  blockFieldTypes.slate = { value: 'slate' };
  blockFieldTypes.detachedSlate = { value: 'slate' };

  // Iterate through all registered block types
  Object.keys(config.blocks.blocksConfig).forEach((blockType) => {
    const blockConfig = config.blocks.blocksConfig[blockType];
    if (!blockConfig) {
      return;
    }

    try {
      // Get schema - can be a function or an object
      const schema = typeof blockConfig.blockSchema === 'function'
        ? blockConfig.blockSchema({ ...config, formData: {}, intl })
        : blockConfig.blockSchema;

      if (!schema?.properties) {
        return;
      }

      // Map each field to its type for this block type
      blockFieldTypes[blockType] = {};
      Object.keys(schema.properties).forEach((fieldName) => {
        const field = schema.properties[fieldName];
        // Determine field type based on widget
        let fieldType = null;
        if (field.widget === 'slate') {
          fieldType = 'slate';
        } else if (field.widget === 'textarea') {
          fieldType = 'textarea';
        } else if (field.type === 'string') {
          fieldType = 'string';
        }

        if (fieldType) {
          blockFieldTypes[blockType][fieldName] = fieldType;
        }
      });
    } catch (error) {
      console.warn(`[VIEW] Error extracting field types for block type "${blockType}":`, error);
      // Continue with other block types
    }
  });

  return blockFieldTypes;
};

/**
 * Returns url with query params + proper paths
 * @param {String} url
 * @param {Object} qParams
 * @param {String} pathname
 * @returns {String}
 */
const addUrlParams = (url, qParams, pathname) => {
  const urlObj = new URL(url);
  for (const [key, value] of Object.entries(qParams)) {
    urlObj.searchParams.set(key, value);
  }
  // console.log('pathname', appendPathToURL(newUrl, pathname));

  const path = pathname.startsWith('/') ? pathname.slice(1) : pathname;
  if (urlObj.hash) {
    urlObj.hash += `/${path}`;
  } else {
    urlObj.pathname += `${path}`;
  }
  const newURL = urlObj.toString();
  return newURL;
};

/**
 * Format the URL for the Iframe with location, token and edit mode
 * @param {URL} url
 * @param {String} token
 * @returns {URL} URL with the admin params
 */
const getUrlWithAdminParams = (url, token) => {
  return typeof window !== 'undefined'
    ? window.location.pathname.endsWith('/edit')
      ? addUrlParams(
          `${url}`,
          { access_token: token, _edit: true },
          `${window.location.pathname.replace('/edit', '')}`,
        )
      : addUrlParams(
          `${url}`,
          {
            access_token: token,
            _edit: false,
          },
          `${window.location.pathname}`,
        )
    : null;
};

const Iframe = (props) => {
  const {
    onSelectBlock,
    properties,
    onChangeFormData,
    metadata,
    formData: form, // Keep for compatibility, but we'll use Redux selector for sync
    token,
    allowedBlocks,
    showRestricted,
    blocksConfig = config.blocks.blocksConfig,
    navRoot,
    type: contentType,
    selectedBlock,
    openObjectBrowser,
    closeObjectBrowser,
  } = props;

  const dispatch = useDispatch();
  const [addNewBlockOpened, setAddNewBlockOpened] = useState(false);
  const [popperElement, setPopperElement] = useState(null);
  const [referenceElement, setReferenceElement] = useState(null);
  const [blockUI, setBlockUI] = useState(null); // { blockUid, rect, focusedFieldName }
  const [menuDropdownOpen, setMenuDropdownOpen] = useState(false); // Track dropdown menu visibility
  const [menuButtonRect, setMenuButtonRect] = useState(null); // Store menu button position for portal positioning
  const blockChooserRef = useRef();

  // NOTE: selectionToSendRef, formatRequestIdToSendRef, and applyFormatRef have been removed.
  // Selection and toolbarRequestDone are now part of iframeSyncState.
  // Transforms are handled via SLATE_TRANSFORM_REQUEST and the toolbar's transformAction.

  const { styles, attributes } = usePopper(referenceElement, popperElement, {
    strategy: 'fixed',
    placement: 'bottom',
    modifiers: [
      {
        name: 'offset',
        options: {
          offset: [550, -300],
        },
      },
      {
        name: 'flip',
        options: {
          fallbackPlacements: ['right-end', 'top-start'],
        },
      },
    ],
  });

  useEffect(() => {
    // Only send SELECT_BLOCK if iframe is ready (has sent GET_INITIAL_DATA)
    if (iframeOriginRef.current && selectedBlock) {
      document.getElementById('previewIframe')?.contentWindow?.postMessage(
        {
          type: 'SELECT_BLOCK',
          uid: selectedBlock,
          method: 'select',
        },
        iframeOriginRef.current,
      );
    }
  }, [selectedBlock]);

  const iframeOriginRef = useRef(null); // Store actual iframe origin from received messages
  const inlineEditCounterRef = useRef(0); // Count INLINE_EDIT_DATA messages from iframe
  const processedInlineEditCounterRef = useRef(0); // Count how many we've seen come back through Redux
  // Combined state for iframe data - formData, selection, requestId, and transformAction updated atomically
  // This ensures toolbar sees all together in the same render
  // Initialize with properties so we have data from first render
  //
  // UNIFIED STATE MODEL (see DATA FLOW ARCHITECTURE in SyncedSlateToolbar.jsx):
  // - formData: current form data to sync with iframe
  // - selection: current Slate selection
  // - completedFlushRequestId: iframe completed a FLUSH_BUFFER request (toolbar button flow)
  // - transformAction: hotkey transform pending (format, paste, delete) - includes its own requestId
  // - toolbarRequestDone: toolbar completed a format operation, needs to send FORM_DATA to unblock iframe
  //   This is separate from completedFlushRequestId - that's for iframe→toolbar flow (flush),
  //   this is for toolbar→iframe flow (format completion, including selection-only changes)
  const [iframeSyncState, setIframeSyncState] = useState(() => ({
    formData: properties,
    selection: null,
    completedFlushRequestId: null, // For toolbar button click flow (FLUSH_BUFFER)
    transformAction: null, // For hotkey transform flow (format, paste, delete) - includes its own requestId
    toolbarRequestDone: null, // requestId - toolbar completed format, need to respond to iframe
  }));
  const urlFromEnv = getURlsFromEnv();
  const u =
    useSelector((state) => state.frontendPreviewUrl.url) ||
    Cookies.get('iframe_url') ||
    urlFromEnv[0];
  const [iframeSrc, setIframeSrc] = useState(getUrlWithAdminParams(u, token));

  // Subscribe to form data from Redux to detect changes
  // This provides a new reference on updates, unlike the mutated form prop
  const formDataFromRedux = useSelector((state) => state.form?.global);

  useEffect(() => {
    setIframeSrc(getUrlWithAdminParams(u, token));
    u && Cookies.set('iframe_url', u, { expires: 7 });
  }, [token, u]);

  // Sync iframeSyncState.formData with Redux form changes
  // This ensures SyncedSlateToolbar sees updates from sidebar widgets (RichTextWidget etc)
  // Without this, sidebar edits don't propagate to the toolbar, causing selection/content mismatch
  useEffect(() => {
    if (formDataFromRedux && formDataFromRedux !== iframeSyncState.formData) {
      setIframeSyncState(prev => {
        // Redux form syncs (from sidebar editing) don't include a new selection -
        // only the form data changes. The existing selection from the iframe may
        // become stale if the document structure changed (e.g., bold removed).
        // Validate and clear the selection if it's no longer valid.
        let newSelection = prev.selection;
        if (selectedBlock && prev.selection && formDataFromRedux.blocks?.[selectedBlock]) {
          const block = formDataFromRedux.blocks[selectedBlock];
          const slateValue = block.value; // Most common slate field name
          if (slateValue && !isSelectionValidForValue(prev.selection, slateValue)) {
            console.log('[VIEW] Selection invalid for new form data, clearing');
            newSelection = null;
          }
        }
        return {
          ...prev,
          formData: formDataFromRedux,
          selection: newSelection,
        };
      });
    }
  }, [formDataFromRedux, selectedBlock]);

  const history = useHistory();

  const intl = useIntl();

  // Extract block field types once and memoize (maps blockType -> fieldName -> fieldType)
  const blockFieldTypes = useMemo(() => extractBlockFieldTypes(intl), [intl]);

  const onInsertBlock = (id, value, current) => {
    if (value?.['@type'] === 'slate') {
      value = {
        ...value,
        value: [{ type: 'p', children: [{ text: '', nodeId: 2 }], nodeId: 1 }],
      };
    }
    const [newId, newFormData] = insertBlock(
      properties,
      id,
      value,
      current,
      config.experimental.addBlockButton.enabled ? 1 : 0,
    );

    const blocksFieldname = getBlocksFieldname(newFormData);
    const blockData = newFormData[blocksFieldname][newId];
    newFormData[blocksFieldname][newId] = applyBlockDefaults({
      data: blockData,
      intl,
      metadata,
      properties,
    });

    onChangeFormData(newFormData);
    return newId;
  };

  const onMutateBlock = (id, value) => {
    const newFormData = mutateBlock(properties, id, value);
    onChangeFormData(newFormData);
  };

  useEffect(() => {
    const onDeleteBlock = (id, selectPrev) => {
      const previous = previousBlockId(properties, id);
      const newFormData = deleteBlock(properties, id);

      onChangeFormData(newFormData);
      onSelectBlock(selectPrev ? previous : null);
      setAddNewBlockOpened(false);
      dispatch(setSidebarTab(1));
    };

    const initialUrlOrigin = iframeSrc && new URL(iframeSrc).origin;
    const messageHandler = (event) => {
      if (event.origin !== initialUrlOrigin) {
        return;
      }
      // Store the actual iframe origin from the first message we receive
      if (!iframeOriginRef.current) {
        iframeOriginRef.current = event.origin;
      }
      const { type } = event.data;
      switch (type) {
        case 'PATH_CHANGE': // PATH change from the iframe
          history.push(event.data.path);

          break;

        case 'OPEN_SETTINGS':
          if (history.location.pathname.endsWith('/edit')) {
            onSelectBlock(event.data.uid);
            setAddNewBlockOpened(false);
            dispatch(setSidebarTab(1));
          }
          break;

        case 'ADD_BLOCK':
          setAddNewBlockOpened(true);
          break;

        case 'DELETE_BLOCK':
          onDeleteBlock(event.data.uid, true);
          break;

        case 'ALLOWED_BLOCKS':
          if (
            JSON.stringify(getAllowedBlocksList()) !==
            JSON.stringify(event.data.allowedBlocks)
          ) {
            setAllowedBlocksList(event.data.allowedBlocks);
          }
          break;

        case 'INLINE_EDIT_DATA':
          inlineEditCounterRef.current += 1;
          // Update combined state atomically - formData, selection together
          // If flushRequestId is present, this was a flush response - also set completedFlushRequestId
          // so the toolbar knows it can proceed with the format button click
          setIframeSyncState(prev => ({
            ...prev,
            formData: event.data.data,
            selection: event.data.selection || null,
            ...(event.data.flushRequestId ? { completedFlushRequestId: event.data.flushRequestId } : {}),
          }));
          // Also update Redux for persistence
          onChangeFormData(event.data.data);
          break;

        case 'BUFFER_FLUSHED':
          // Iframe had no pending text - update combined state with current form + requestId + selection
          console.log('[VIEW] Received BUFFER_FLUSHED (no pending text), requestId:', event.data.requestId);
          setIframeSyncState(prev => ({
            ...prev,
            selection: event.data.selection || null,
            completedFlushRequestId: event.data.requestId,
          }));
          break;

        case 'INLINE_EDIT_EXIT':
          
          break;

        case 'TOGGLE_MARK':
          // console.log('TOGGLE_BOLD', event.data.html);
          
          const deserializedHTMLData = toggleMark(event.data.html);
          // console.log('deserializedHTMLData', deserializedHTMLData);
          onChangeFormData({
            ...form,
            blocks: {
              ...form.blocks,
              [selectedBlock]: {
                ...form.blocks[selectedBlock],
                value: deserializedHTMLData,
              },
            },
          });
          event.source.postMessage(
            {
              type: 'TOGGLE_MARK_DONE',
              data: {
                ...form,
                blocks: {
                  ...form.blocks,
                  [selectedBlock]: {
                    ...form.blocks[selectedBlock],
                    value: deserializedHTMLData,
                  },
                },
              },
            },
            event.origin,
          );
          break;

        case 'SLATE_TRANSFORM_REQUEST':
          // Unified transform request from iframe - always includes form data with buffer
          // transformType: 'format', 'paste', 'delete', 'enter'
          // fieldName: which field is being edited (e.g., 'value', 'description')
          if (event.data.transformType === 'enter') {
            // Enter is handled directly here since it creates a new block
            try {
              const { blockId: enterBlockId, fieldName: enterFieldName, selection: enterSelection, requestId: enterRequestId } = event.data;
              const formToUseForEnter = event.data.data;

              // Update iframeSyncState to keep it in sync
              setIframeSyncState(prev => ({
                ...prev,
                formData: formToUseForEnter,
                selection: enterSelection || null,
              }));

              // Get the current block data and check if the field is a slate field
              const currentBlock = formToUseForEnter.blocks[enterBlockId];
              if (!currentBlock) {
                break;
              }
              const blockType = currentBlock['@type'];
              const fieldType = blockFieldTypes[blockType]?.[enterFieldName];
              if (fieldType !== 'slate') {
                // Not a slate field - don't split block
                break;
              }

              // Get the field value to split
              const fieldValue = currentBlock[enterFieldName];
              if (!fieldValue) {
                break;
              }

              // Split the block at the cursor using slateTransforms
              const { topValue, bottomValue } = slateTransforms.splitBlock(
                fieldValue,
                enterSelection,
              );

              // Create new form data with updated blocks
              const newFormData = { ...formToUseForEnter };
              const blocksFieldname = getBlocksFieldname(newFormData);

              // Update current block with content before cursor
              newFormData[blocksFieldname][enterBlockId] = {
                ...currentBlock,
                [enterFieldName]: topValue,
              };

              // Create new block with content after cursor
              const [newBlockId, updatedFormData] = insertBlock(
                newFormData,
                enterBlockId,
                {
                  '@type': blockType,
                  [enterFieldName]: bottomValue,
                },
                {},
                1,
                config.blocks.blocksConfig,
              );

              // Update Redux state
              onChangeFormData(updatedFormData);
              onSelectBlock(newBlockId);

              // Send FORM_DATA message to trigger iframe re-render with new block
              if (iframeOriginRef.current) {
                event.source.postMessage(
                  { type: 'FORM_DATA', data: updatedFormData, formatRequestId: enterRequestId },
                  event.origin,
                );
              }
            } catch (error) {
              console.error('[VIEW] Error handling enter transform:', error);
              event.source.postMessage(
                {
                  type: 'SLATE_ERROR',
                  blockId: event.data.blockId,
                  error: error.message,
                },
                event.origin,
              );
            }
          } else {
            // Format, paste, delete - let toolbar handle via transformAction
            // Build transformAction based on transformType
            const transformAction = {
              type: event.data.transformType,
              requestId: event.data.requestId,
            };
            // Add type-specific fields
            if (event.data.transformType === 'format') {
              transformAction.format = event.data.format;
            } else if (event.data.transformType === 'paste') {
              transformAction.html = event.data.html;
            } else if (event.data.transformType === 'delete') {
              transformAction.direction = event.data.direction;
            }

            setIframeSyncState(prev => ({
              ...prev,
              formData: event.data.data,
              selection: event.data.selection || null,
              transformAction: transformAction,
            }));
          }
          break;

        case 'SLATE_UNDO_REQUEST':
          // Dispatch a synthetic Ctrl+Z event to trigger Volto's global undo manager
          const undoEvent = new KeyboardEvent('keydown', {
            key: 'z',
            ctrlKey: true,
            bubbles: true,
            cancelable: true,
          });
          document.dispatchEvent(undoEvent);
          break;

        case 'SLATE_REDO_REQUEST':
          // Dispatch a synthetic Ctrl+Y event to trigger Volto's global undo manager
          const redoEvent = new KeyboardEvent('keydown', {
            key: 'y',
            ctrlKey: true,
            bubbles: true,
            cancelable: true,
          });
          document.dispatchEvent(redoEvent);
          break;

        case 'UPDATE_BLOCKS_LAYOUT':

          onChangeFormData(event.data.data);
          break;

        case 'SELECTION_CHANGE':
          // Store current selection from iframe for format operations
          setIframeSyncState(prev => ({
            ...prev,
            selection: event.data.selection,
          }));
          break;

        case 'BLOCK_SELECTED':
          // Update block UI state and selection atomically
          // Selection is included in BLOCK_SELECTED to prevent race conditions
          setBlockUI({
            blockUid: event.data.blockUid,
            rect: event.data.rect,
            focusedFieldName: event.data.focusedFieldName, // Track which field is focused
          });
          // Set selection from BLOCK_SELECTED - this ensures block and selection are atomic
          setIframeSyncState(prev => ({
            ...prev,
            selection: event.data.selection || null,
          }));
          // Call onSelectBlock to open sidebar and update selectedBlock in parent
          onSelectBlock(event.data.blockUid);
          break;

        case 'HIDE_BLOCK_UI':
          // Hide all block UI overlays
          setBlockUI(null);
          break;

        case 'GET_INITIAL_DATA':
          // Store the iframe's actual origin when it first contacts us
          iframeOriginRef.current = event.origin;

          // Extract block field types from schema registry (maps blockType -> fieldName -> fieldType)
          // Use different name to avoid shadowing outer blockFieldTypes (causes temporal dead zone)
          const initialBlockFieldTypes = extractBlockFieldTypes(intl);

          const toolbarButtons = config.settings.slate?.toolbarButtons || [];

          event.source.postMessage(
            {
              type: 'INITIAL_DATA',
              data: form,
              blockFieldTypes: initialBlockFieldTypes,
              slateConfig: {
                hotkeys: config.settings.slate?.hotkeys || {},
                toolbarButtons,
              },
            },
            event.origin,
          );
          // Don't send SELECT_BLOCK here - let the useEffect handle it after content is rendered
          // The useEffect at line ~375 will send SELECT_BLOCK once iframe is ready and content is rendered
          break;

        // case 'OPEN_OBJECT_BROWSER':
        //   openObjectBrowser({
        //     mode: event.data.mode,
        //     propDataName: 'data',
        //     onSelectItem: (item) => {
        //       event.source.postMessage(
        //         {
        //           type: 'OBJECT_SELECTED',
        //           path: item,
        //         },
        //         event.origin,
        //       );
        //       closeObjectBrowser();
        //       
        //     },
        //   });
        //   break;

        default:
          break;
      }
    };

    // Listen for messages from the iframe
    window.addEventListener('message', messageHandler);

    // Clean up the event listener on unmount
    return () => {
      window.removeEventListener('message', messageHandler);
    };
  }, [
    closeObjectBrowser,
    dispatch,
    form,
    form?.blocks,
    history,
    history.location.pathname,
    iframeSrc,
    onChangeFormData,
    onSelectBlock,
    openObjectBrowser,
    properties,
    selectedBlock,
    token,
  ]);

  // Send FORM_DATA to iframe when:
  // 1. Redux form data changes (from sidebar editing)
  // 2. toolbarRequestDone is set (toolbar completed a format, including selection-only changes)
  useEffect(() => {
    console.log('[VIEW] FORM_DATA useEffect triggered, toolbarRequestDone:', iframeSyncState.toolbarRequestDone);
    // Use formDataFromRedux if available (for change detection), otherwise fall back to form prop
    const formToUse = formDataFromRedux || form;

    // Check if this formData change is from an INLINE_EDIT_DATA we haven't processed yet
    const hasUnprocessedInlineEdit = processedInlineEditCounterRef.current < inlineEditCounterRef.current;

    if (hasUnprocessedInlineEdit) {
      // This is the formData update FROM the iframe's inline edit, don't send it back
      processedInlineEditCounterRef.current += 1;
      // Flush handling is now done atomically via iframeSyncState
      return;
    }

    // Check if toolbar completed a format operation (includes selection-only changes)
    if (iframeSyncState.toolbarRequestDone) {
      const message = {
        type: 'FORM_DATA',
        data: iframeSyncState.formData,
        formatRequestId: iframeSyncState.toolbarRequestDone,
      };
      if (iframeSyncState.selection) {
        message.transformedSelection = iframeSyncState.selection;
      }
      console.log('[VIEW] Sending FORM_DATA with formatRequestId:', message.formatRequestId);
      document.getElementById('previewIframe')?.contentWindow?.postMessage(
        message,
        iframeOriginRef.current,
      );
      // Clear toolbarRequestDone SYNCHRONOUSLY before updating Redux
      // Without flushSync, Redux dispatch triggers re-render before this state update commits,
      // causing the useEffect to see stale toolbarRequestDone and loop infinitely
      flushSync(() => {
        setIframeSyncState(prev => ({ ...prev, toolbarRequestDone: null }));
      });
      // Now safe to update Redux - toolbarRequestDone is already cleared
      onChangeFormData(iframeSyncState.formData);
      return;
    }

    // Normal Redux form data change (from sidebar editing)
    // Skip if formData hasn't actually changed from what we already have synced
    // This prevents echoing back data we just sent to Redux from toolbar
    if (JSON.stringify(formToUse) === JSON.stringify(iframeSyncState.formData)) {
      return;
    }
    if (iframeOriginRef.current && formToUse) {
      const message = { type: 'FORM_DATA', data: formToUse };
      document.getElementById('previewIframe')?.contentWindow?.postMessage(
        message,
        iframeOriginRef.current,
      );
    }
  // NOTE: Only depend on formDataFromRedux and toolbarRequestDone.
  // Do NOT depend on iframeSyncState.formData/selection - those change during
  // normal toolbar sync and would cause echo back to iframe.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formDataFromRedux, iframeSyncState.toolbarRequestDone]);

  const sidebarFocusEventListenerRef = useRef(null);

  useEffect(() => {
    const handleMouseHover = (e) => {
      e.stopPropagation();
      
      // console.log(
      //   'Sidebar or its child element focused!',
      // );
    };
    sidebarFocusEventListenerRef.current = handleMouseHover;
    const sidebarElement = document.getElementById('sidebar');
    sidebarElement.addEventListener('mouseover', handleMouseHover, true);

    // Cleanup on component unmount
    return () => {
      // ... (your other cleanup code)
      if (sidebarElement && sidebarFocusEventListenerRef.current) {
        sidebarElement.removeEventListener(
          'mouseover',
          sidebarFocusEventListenerRef.current,
          true,
        );
      }
    };
  }, []);

  // Handle window resize to update block UI overlay positions
  useEffect(() => {
    const handleResize = () => {
      // On window resize, request updated positions from iframe
      if (blockUI && iframeOriginRef.current) {
        const iframe = document.getElementById('previewIframe');
        if (iframe?.contentWindow) {
          iframe.contentWindow.postMessage(
            {
              type: 'REQUEST_BLOCK_RESELECT',
              blockUid: blockUI.blockUid,
            },
            iframeOriginRef.current,
          );
        }
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [blockUI]);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (menuDropdownOpen) {
      const handleClickOutside = (event) => {
        // Close dropdown if clicking anywhere outside
        if (!event.target.closest('.volto-hydra-dropdown-menu')) {
          setMenuDropdownOpen(false);
        }
      };

      // Add slight delay to avoid immediate close from the button click that opened it
      setTimeout(() => {
        document.addEventListener('click', handleClickOutside);
      }, 0);

      return () => {
        document.removeEventListener('click', handleClickOutside);
      };
    }
  }, [menuDropdownOpen]);

  return (
    <div id="iframeContainer">
      <OpenObjectBrowser
        origin={iframeSrc && new URL(iframeSrc).origin}
      />
      {addNewBlockOpened &&
        createPortal(
          <div
            ref={setPopperElement}
            style={styles.popper}
            {...attributes.popper}
          >
            <BlockChooser
              onMutateBlock={
                onMutateBlock
                  ? (id, value) => {
                      setAddNewBlockOpened(false);
                      onMutateBlock(id, value);
                    }
                  : null
              }
              onInsertBlock={
                onInsertBlock
                  ? (id, value) => {
                      setAddNewBlockOpened(false);

                      const newId = onInsertBlock(id, value);
                      onSelectBlock(newId);
                      setAddNewBlockOpened(false);
                      dispatch(setSidebarTab(1));
                    }
                  : null
              }
              currentBlock={selectedBlock}
              allowedBlocks={allowedBlocks}
              blocksConfig={blocksConfig}
              properties={properties}
              showRestricted={showRestricted}
              ref={blockChooserRef}
              navRoot={navRoot}
              contentType={contentType}
            />
          </div>,
          document.body,
        )}
      <iframe
        id="previewIframe"
        title="Preview"
        src={iframeSrc}
        ref={setReferenceElement}
        allow="clipboard-read; clipboard-write"
      />

      {/* Block UI Overlays - rendered in parent window, positioned over iframe */}
      {blockUI && referenceElement && (
        <>
          {/* Selection Outline - blue border or bottom line depending on block type */}
          <div
            className="volto-hydra-block-outline"
            style={{
              position: 'fixed',
              left: `${referenceElement.getBoundingClientRect().left + blockUI.rect.left}px`,
              top: blockUI.showFormatButtons
                ? `${referenceElement.getBoundingClientRect().top + blockUI.rect.top + blockUI.rect.height - 1}px`
                : `${referenceElement.getBoundingClientRect().top + blockUI.rect.top - 2}px`,
              width: `${blockUI.rect.width}px`,
              height: blockUI.showFormatButtons ? '3px' : `${blockUI.rect.height + 4}px`,
              background: blockUI.showFormatButtons ? '#007eb1' : 'transparent',
              border: blockUI.showFormatButtons ? 'none' : '2px solid #007eb1',
              pointerEvents: 'none',
              zIndex: 1,
            }}
          />

          {/* Quanta Toolbar with real Slate buttons */}
          <SyncedSlateToolbar
            selectedBlock={selectedBlock}
            form={iframeSyncState.formData}
            currentSelection={iframeSyncState.selection}
            completedFlushRequestId={iframeSyncState.completedFlushRequestId}
            transformAction={iframeSyncState.transformAction}
            onTransformApplied={() => setIframeSyncState(prev => ({ ...prev, transformAction: null }))}
            onChangeFormData={(formData, selection, formatRequestId) => {
              console.log('[VIEW] onChangeFormData callback called, formatRequestId:', formatRequestId);
              // Update iframeSyncState atomically with formData, selection, and toolbarRequestDone
              // The FORM_DATA useEffect will:
              // 1. Send to iframe when it sees toolbarRequestDone (with formatRequestId)
              // 2. THEN update Redux (to avoid race condition where Redux re-render
              //    happens before toolbarRequestDone is committed)
              setIframeSyncState(prev => {
                console.log('[VIEW] setIframeSyncState called, prev toolbarRequestDone:', prev.toolbarRequestDone, 'new:', formatRequestId);
                return {
                  ...prev,
                  formData: formData,
                  selection: selection || prev.selection,
                  toolbarRequestDone: formatRequestId || null,
                };
              });
              // NOTE: Don't update Redux here - let the useEffect do it after sending FORM_DATA
              // This avoids a race condition where Redux dispatch causes re-render before
              // setIframeSyncState commits, making useEffect see old toolbarRequestDone value
            }}
            blockUI={blockUI}
            blockFieldTypes={blockFieldTypes}
            iframeElement={referenceElement}
            onOpenMenu={(rect) => {
              setMenuButtonRect(rect);
              setMenuDropdownOpen(!menuDropdownOpen);
            }}
          />

          {/* Add Button - below block, right-aligned */}
          <button
            className="volto-hydra-add-button"
            style={{
              position: 'fixed',
              left: `${referenceElement.getBoundingClientRect().left + blockUI.rect.left + blockUI.rect.width - 30}px`,
              top: `${referenceElement.getBoundingClientRect().top + blockUI.rect.top + blockUI.rect.height + 8}px`,
              zIndex: 10,
              width: '30px',
              height: '30px',
              background: 'transparent',
              color: '#b8b8b8',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '28px',
              lineHeight: '1',
              fontWeight: '300',
              padding: 0,
            }}
            onClick={() => setAddNewBlockOpened(true)}
            title="Add block"
          >
            +
          </button>
        </>
      )}

      {/* Dropdown menu */}
      {menuDropdownOpen && (
        <DropdownMenu
          selectedBlock={selectedBlock}
          properties={properties}
          onChangeFormData={onChangeFormData}
          onSelectBlock={onSelectBlock}
          menuButtonRect={menuButtonRect}
          onClose={() => setMenuDropdownOpen(false)}
        />
      )}
    </div>
  );
};

export default Iframe;
