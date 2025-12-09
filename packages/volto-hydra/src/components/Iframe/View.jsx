import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { v4 as uuid } from 'uuid';
import { useHistory } from 'react-router-dom';
import Cookies from 'js-cookie';
import { Node } from 'slate';
import {
  applyBlockDefaults,
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
import { BlockChooser } from '@plone/volto/components';
import { createPortal, flushSync } from 'react-dom';
import { usePopper } from 'react-popper';
import { useSelector, useDispatch } from 'react-redux';
import { getURlsFromEnv } from '../../utils/getSavedURLs';
import { setSidebarTab } from '@plone/volto/actions';
import { setAllowedBlocksList } from '../../utils/allowedBlockList';
import toggleMark from '../../utils/toggleMark';
import slateTransforms from '../../utils/slateTransforms';
// Note: Editor, Transforms, toggleInlineFormat, toggleBlock were removed
// as applyFormat was replaced by SLATE_TRANSFORM_REQUEST handling
import OpenObjectBrowser from './OpenObjectBrowser';
import SyncedSlateToolbar from '../Toolbar/SyncedSlateToolbar';
import { buildBlockPathMap, getBlockByPath, getContainerFieldConfig, getBlockOwnContainerConfig, insertBlockInContainer, deleteBlockFromContainer, mutateBlockInContainer, ensureEmptyBlockIfEmpty, initializeContainerBlock, moveBlockBetweenContainers, reorderBlocksInContainer, getAllContainerFields } from '../../utils/blockPath';
import ChildBlocksWidget from '../Sidebar/ChildBlocksWidget';
import ParentBlocksWidget from '../Sidebar/ParentBlocksWidget';

/**
 * NoPreview component for frontend-defined blocks.
 * Prevents React errors when Volto tries to render a preview for blocks
 * that have Slate values or other non-serializable content.
 */
const NoPreview = () => null;

/**
 * Validate frontend configuration passed to initBridge.
 * Collects all validation errors and throws a single error with all issues.
 *
 * @param {Object} options - Options from FRONTEND_INIT message
 * @param {string[]} options.allowedBlocks - Page-level allowed block types
 * @param {Object} options.voltoConfig - Frontend's custom config
 * @param {Object} mergedBlocksConfig - Full merged blocks configuration
 * @throws {Error} If any validation errors are found
 */
const validateFrontendConfig = (options, mergedBlocksConfig) => {
  const errors = [];
  const { allowedBlocks, voltoConfig } = options;
  const frontendBlocksConfig = voltoConfig?.blocks?.blocksConfig;

  if (!allowedBlocks || !mergedBlocksConfig || !frontendBlocksConfig) return;

  // Validation 1: Check for container-only blocks in page-level allowedBlocks
  const customBlockTypes = new Set(Object.keys(frontendBlocksConfig));
  const containerChildBlocks = new Set();

  Object.values(mergedBlocksConfig).forEach((blockConfig) => {
    const schema = typeof blockConfig?.blockSchema === 'function'
      ? blockConfig.blockSchema({ formData: {}, intl: { formatMessage: (m) => m.defaultMessage } })
      : blockConfig?.blockSchema;

    if (schema?.properties) {
      Object.values(schema.properties).forEach((fieldDef) => {
        if (fieldDef.type === 'blocks' && fieldDef.allowedBlocks) {
          fieldDef.allowedBlocks.forEach((childType) => {
            if (customBlockTypes.has(childType)) {
              containerChildBlocks.add(childType);
            }
          });
        }
      });
    }
  });

  const containerOnlyBlocks = allowedBlocks.filter((blockType) => {
    if (!containerChildBlocks.has(blockType)) return false;
    const blockConfig = mergedBlocksConfig[blockType];
    if (!blockConfig) return false;
    const schema = typeof blockConfig.blockSchema === 'function'
      ? blockConfig.blockSchema({ formData: {}, intl: { formatMessage: (m) => m.defaultMessage } })
      : blockConfig.blockSchema;
    const hasEditableFields = schema?.fieldsets?.some(
      (fs) => fs.fields?.some((f) => schema.properties?.[f]?.type !== 'blocks')
    );
    return !hasEditableFields;
  });

  if (containerOnlyBlocks.length > 0) {
    errors.push(
      `allowedBlocks contains container-only block types: [${containerOnlyBlocks.join(', ')}]. ` +
      `These blocks are only valid inside container blocks. Remove them from the page-level allowedBlocks array.`
    );
  }

  // Future validations can be added here:
  // - Validation 2: Check for missing block renderers
  // - Validation 3: Check for invalid schema definitions
  // - etc.

  if (errors.length > 0) {
    throw new Error(`[HYDRA] initBridge config error:\n- ${errors.join('\n- ')}`);
  }
};

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

      // Debug: Log hero block schema processing
      if (blockType === 'hero') {
        console.log('[EXTRACT] Processing hero block, blockConfig.blockSchema:', blockConfig.blockSchema);
        console.log('[EXTRACT] Hero schema after resolution:', schema);
        console.log('[EXTRACT] Hero schema.properties:', schema?.properties);
      }

      if (!schema?.properties) {
        return;
      }

      // Map each field to its type for this block type
      // Preserve any hardcoded values (like slate.value) by merging, not overwriting
      if (!blockFieldTypes[blockType]) {
        blockFieldTypes[blockType] = {};
      }
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

        // Debug: Log hero field processing
        if (blockType === 'hero') {
          console.log(`[EXTRACT] Hero field ${fieldName}: widget=${field.widget}, type=${field.type}, resolved fieldType=${fieldType}`);
        }
      });

      // Debug: Log what was added for hero
      if (blockType === 'hero') {
        console.log('[EXTRACT] Hero blockFieldTypes after processing:', blockFieldTypes['hero']);
      }
    } catch (error) {
      console.warn(`[VIEW] Error extracting field types for block type "${blockType}":`, error);
      // Continue with other block types
    }
  });

  // Debug: Final state check
  console.log('[EXTRACT] Final blockFieldTypes keys:', Object.keys(blockFieldTypes));
  console.log('[EXTRACT] Final blockFieldTypes.hero:', blockFieldTypes['hero']);

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
function _isObject(item) {
  return (
    ![undefined, null].includes(item) &&
    typeof item === 'object' &&
    !Array.isArray(item)
  );
}
function deepMerge(entry, newConfig) {
  let output = Object.assign({}, entry);
  if (_isObject(entry) && _isObject(newConfig)) {
    Object.keys(newConfig).forEach((key) => {
      if (_isObject(newConfig[key])) {
        if (!(key in entry)) {
          Object.assign(output, {
            [key]: newConfig[key],
          });
        } else {
          output[key] = deepMerge(entry[key], newConfig[key]);
        }
      } else {
        Object.assign(output, { [key]: newConfig[key] });
      }
    });
  }
  return output;
}
/**
 * Parse an SVG string into Volto's Icon component format.
 * Volto's Icon expects: { attributes: { xmlns, viewBox }, content }
 *
 * @param {string} svgString - SVG string like '<svg xmlns="..." viewBox="..."><path d="..."/></svg>'
 * @returns {Object|null} - Icon object or null if parsing fails
 */
function parseSvgToIconFormat(svgString) {
  if (typeof svgString !== 'string' || !svgString.trim().startsWith('<svg')) {
    return null;
  }

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgString, 'image/svg+xml');
    const svg = doc.querySelector('svg');

    if (!svg) {
      return null;
    }

    // Extract attributes
    const xmlns = svg.getAttribute('xmlns') || 'http://www.w3.org/2000/svg';
    const viewBox = svg.getAttribute('viewBox') || '0 0 24 24';

    // Extract inner content (everything inside the svg tag)
    const content = svg.innerHTML;

    return {
      attributes: { xmlns, viewBox },
      content,
    };
  } catch (e) {
    console.warn('[HYDRA] Failed to parse SVG icon:', e);
    return null;
  }
}

/**
 * Process blocksConfig to convert string SVG icons to Volto's format.
 * Modifies the config in place.
 */
function processBlockIcons(blocksConfig) {
  if (!blocksConfig || typeof blocksConfig !== 'object') {
    return;
  }

  Object.keys(blocksConfig).forEach((blockType) => {
    const blockConfig = blocksConfig[blockType];
    if (blockConfig && typeof blockConfig.icon === 'string') {
      const parsedIcon = parseSvgToIconFormat(blockConfig.icon);
      if (parsedIcon) {
        blockConfig.icon = parsedIcon;
      } else {
        // Remove invalid string icons to prevent Icon component errors
        delete blockConfig.icon;
      }
    }
  });
}

function recurseUpdateVoltoConfig(newConfig) {
  // Process icon strings in blocksConfig before merging
  if (newConfig?.blocks?.blocksConfig) {
    processBlockIcons(newConfig.blocks.blocksConfig);
  }

  // Config object is not directly editable, update all the keys only.
  Object.entries(newConfig).forEach(([configKey, configValue]) => {
    config[configKey] = deepMerge(config[configKey], configValue);
  });
}

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
  const [addAfterBlockId, setAddAfterBlockId] = useState(null); // which block to add after
  const [pendingDelete, setPendingDelete] = useState(null);
  const [popperElement, setPopperElement] = useState(null);
  const [referenceElement, setReferenceElement] = useState(null);
  const [blockUI, setBlockUI] = useState(null); // { blockUid, rect, focusedFieldName }
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
    // Only send SELECT_BLOCK if iframe is ready (has sent INIT)
    if (iframeOriginRef.current && selectedBlock) {
      console.log('[VIEW] useEffect sending SELECT_BLOCK:', selectedBlock);
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

  // Clear blockUI when no block is selected
  useEffect(() => {
    if (!selectedBlock) {
      setBlockUI(null);
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
    blockPathMap: buildBlockPathMap(properties, config.blocks.blocksConfig), // Maps blockId -> { path, parentId, allowedSiblingTypes }
    selection: null,
    completedFlushRequestId: null, // For toolbar button click flow (FLUSH_BUFFER)
    transformAction: null, // For hotkey transform flow (format, paste, delete) - includes its own requestId
    toolbarRequestDone: null, // requestId - toolbar completed format, need to respond to iframe
    pendingSelectBlockUid: null, // Block to select after next FORM_DATA (for new block add)
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
      // Rebuild blockPathMap when formData changes (use live config for custom blocks)
      const newBlockPathMap = buildBlockPathMap(formDataFromRedux, config.blocks.blocksConfig);
      setIframeSyncState(prev => {
        // Redux form syncs (from sidebar editing) don't include a new selection -
        // only the form data changes. The existing selection from the iframe may
        // become stale if the document structure changed (e.g., bold removed).
        // Validate and clear the selection if it's no longer valid.
        let newSelection = prev.selection;
        if (selectedBlock && prev.selection) {
          // Use path lookup for nested block support
          const blockPath = newBlockPathMap[selectedBlock]?.path;
          const block = blockPath
            ? getBlockByPath(formDataFromRedux, blockPath)
            : formDataFromRedux.blocks?.[selectedBlock];
          const slateValue = block?.value; // Most common slate field name
          if (slateValue && !isSelectionValidForValue(prev.selection, slateValue)) {
            console.log('[VIEW] Selection invalid for new form data, clearing');
            newSelection = null;
          }
        }
        return {
          ...prev,
          formData: formDataFromRedux,
          blockPathMap: newBlockPathMap,
          selection: newSelection,
        };
      });
    }
  }, [formDataFromRedux, selectedBlock, blocksConfig]);

  const history = useHistory();

  const intl = useIntl();

  // Extract block field types - stored in state so it can be updated when frontend config is merged
  const [blockFieldTypes, setBlockFieldTypes] = useState(() => extractBlockFieldTypes(intl));

  const onInsertBlock = (id, value, current) => {
    if (value?.['@type'] === 'slate') {
      value = {
        ...value,
        value: [{ type: 'p', children: [{ text: '', nodeId: 2 }], nodeId: 1 }],
      };
    }

    const newId = uuid();

    // Apply block defaults to the new block
    let blockData = { '@type': value['@type'], ...value };
    blockData = applyBlockDefaults({
      data: blockData,
      intl,
      metadata,
      properties,
    });

    // Use merged config from registry (includes frontend's custom blocks after INIT)
    const mergedBlocksConfig = config.blocks.blocksConfig;

    // Initialize container blocks with default children (recursive)
    // Pass intl/metadata/properties so nested blocks get proper defaults (e.g., slate's value)
    blockData = initializeContainerBlock(blockData, mergedBlocksConfig, uuid, {
      intl,
      metadata,
      properties,
    });

    // Check if inserting inside a container (null means page-level)
    const containerConfig = getContainerFieldConfig(
      id,
      iframeSyncState.blockPathMap,
      properties,
      mergedBlocksConfig,
    );
    // Unified insertion - works for both page and container
    const newFormData = insertBlockInContainer(
      properties,
      iframeSyncState.blockPathMap,
      id,
      newId,
      blockData,
      containerConfig,
    );

    onChangeFormData(newFormData);
    return newId;
  };

  const onMutateBlock = (id, value) => {
    // Use merged config from registry (includes frontend's custom blocks after INIT)
    const mergedBlocksConfig = config.blocks.blocksConfig;

    // Initialize block data the same way as onInsertBlock
    // This is important when replacing empty blocks with real blocks
    let blockData = { '@type': value['@type'], ...value };

    // Add initial slate value for slate blocks
    if (blockData['@type'] === 'slate' && !blockData.value) {
      blockData.value = [{ type: 'p', children: [{ text: '', nodeId: 2 }], nodeId: 1 }];
    }

    // Apply block defaults
    blockData = applyBlockDefaults({
      data: blockData,
      intl,
      metadata,
      properties,
    });

    // Initialize container blocks with default children (recursive)
    blockData = initializeContainerBlock(blockData, mergedBlocksConfig, uuid, {
      intl,
      metadata,
      properties,
    });

    // Check if mutating inside a container (null means page-level)
    const containerConfig = getContainerFieldConfig(
      id,
      iframeSyncState.blockPathMap,
      properties,
      mergedBlocksConfig,
    );

    // Use container-aware mutation for nested blocks
    const newFormData = mutateBlockInContainer(
      properties,
      iframeSyncState.blockPathMap,
      id,
      blockData,
      containerConfig,
    );

    onChangeFormData(newFormData);
  };

  const onDeleteBlock = (id, selectPrev) => {
    // Use merged config from registry (includes frontend's custom blocks after INIT)
    const mergedBlocksConfig = config.blocks.blocksConfig;

    // Check if deleting from a container (null means page-level)
    const containerConfig = getContainerFieldConfig(
      id,
      iframeSyncState.blockPathMap,
      properties,
      mergedBlocksConfig,
    );

    // Get previous block for selection (within same container or page)
    const previous = previousBlockId(properties, id);

    // Unified deletion - works for both page and container
    let newFormData = deleteBlockFromContainer(
      properties,
      iframeSyncState.blockPathMap,
      id,
      containerConfig,
    );

    // Ensure container has at least one block (empty block if now empty)
    newFormData = ensureEmptyBlockIfEmpty(
      newFormData,
      containerConfig,
      iframeSyncState.blockPathMap,
      uuid,
      blocksConfig,
      { intl, metadata, properties },
    );

    onChangeFormData(newFormData);
    onSelectBlock(selectPrev ? previous : null);
    setAddNewBlockOpened(false);
    dispatch(setSidebarTab(1));
  };

  // Process pending delete from iframe DELETE_BLOCK message (same pattern as addNewBlockOpened)
  useEffect(() => {
    if (pendingDelete) {
      onDeleteBlock(pendingDelete.uid, pendingDelete.selectPrev);
      setPendingDelete(null);
    }
  }, [pendingDelete]);

  useEffect(() => {
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
          setPendingDelete({ uid: event.data.uid, selectPrev: true });
          break;

        case 'INLINE_EDIT_DATA':
          inlineEditCounterRef.current += 1;
          // Update combined state atomically - formData, blockPathMap, selection together
          // If flushRequestId is present, this was a flush response - also set completedFlushRequestId
          // so the toolbar knows it can proceed with the format button click
          setIframeSyncState(prev => ({
            ...prev,
            formData: event.data.data,
            blockPathMap: buildBlockPathMap(event.data.data, config.blocks.blocksConfig),
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
              const enterBlockPathMap = buildBlockPathMap(formToUseForEnter, config.blocks.blocksConfig);
              setIframeSyncState(prev => ({
                ...prev,
                formData: formToUseForEnter,
                blockPathMap: enterBlockPathMap,
                selection: enterSelection || null,
              }));

              // Get the current block data using path lookup (supports nested blocks)
              const enterBlockPath = enterBlockPathMap[enterBlockId]?.path;
              const currentBlock = enterBlockPath
                ? getBlockByPath(formToUseForEnter, enterBlockPath)
                : formToUseForEnter.blocks[enterBlockId];
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

              // Check if this block is inside a container
              const containerConfig = getContainerFieldConfig(
                enterBlockId,
                enterBlockPathMap,
                formToUseForEnter,
                config.blocks.blocksConfig,
              );

              // Update current block with content before cursor
              const updatedCurrentBlock = {
                ...currentBlock,
                [enterFieldName]: topValue,
              };
              let newFormData = mutateBlockInContainer(
                formToUseForEnter,
                enterBlockPathMap,
                enterBlockId,
                updatedCurrentBlock,
                containerConfig,
              );

              // Create new block with content after cursor
              const newBlockId = uuid();
              const newBlockData = {
                '@type': blockType,
                [enterFieldName]: bottomValue,
              };
              const updatedFormData = insertBlockInContainer(
                newFormData,
                enterBlockPathMap,
                enterBlockId,
                newBlockId,
                newBlockData,
                containerConfig,
              );

              // Update Redux state
              onChangeFormData(updatedFormData);
              onSelectBlock(newBlockId);

              // Send FORM_DATA message to trigger iframe re-render with new block
              if (iframeOriginRef.current) {
                const updatedBlockPathMap = buildBlockPathMap(updatedFormData, config.blocks.blocksConfig);
                event.source.postMessage(
                  { type: 'FORM_DATA', data: updatedFormData, blockPathMap: updatedBlockPathMap, formatRequestId: enterRequestId },
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
              blockPathMap: buildBlockPathMap(event.data.data, config.blocks.blocksConfig),
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

        case 'MOVE_BLOCK': {
          // Handle drag-and-drop block moves (supports container and page-level)
          const { blockId, targetBlockId, insertAfter, sourceParentId, targetParentId } = event.data;

          // Get source container config BEFORE the move (needed for ensureEmptyBlockIfEmpty)
          // Only needed when moving to a different container
          const sourceContainerConfig = sourceParentId !== targetParentId && sourceParentId
            ? getContainerFieldConfig(blockId, iframeSyncState.blockPathMap, properties, blocksConfig)
            : null;

          // Use moveBlockBetweenContainers utility to handle all cases:
          // - Same container reordering
          // - Different container moves
          // - Page ↔ container moves
          let newFormData = moveBlockBetweenContainers(
            properties,
            iframeSyncState.blockPathMap,
            blockId,
            targetBlockId,
            insertAfter,
            sourceParentId,
            targetParentId,
            blocksConfig,
          );

          if (newFormData) {
            // If we moved to a different container, ensure source container has at least one block
            if (sourceParentId !== targetParentId && sourceContainerConfig) {
              newFormData = ensureEmptyBlockIfEmpty(
                newFormData,
                sourceContainerConfig,
                iframeSyncState.blockPathMap,
                uuid,
                blocksConfig,
                { intl, metadata, properties },
              );
            }
            onChangeFormData(newFormData);
          }
          break;
        }

        case 'SELECTION_CHANGE':
          // Store current selection from iframe for format operations
          setIframeSyncState(prev => ({
            ...prev,
            selection: event.data.selection,
          }));
          break;

        case 'BLOCK_SELECTED': {
          // Update block UI state and selection atomically
          // Selection is included in BLOCK_SELECTED to prevent race conditions

          // Determine if this is a new block BEFORE setBlockUI to avoid nested state updates
          // Calling onSelectBlock (which dispatches Redux action) inside setBlockUI callback
          // causes React's "Cannot update during an existing state transition" warning
          //
          // IMPORTANT: Position updates from scroll/resize handlers should NEVER trigger
          // onSelectBlock - they're just updating the rect, not changing selection.
          // This prevents the scroll-back bug where scrolling away from a block causes
          // it to be "re-selected" and scrolled back into view.
          const isPositionUpdateOnly = event.data.src === 'scrollHandler' ||
                                        event.data.src === 'resizeHandler';
          const isNewBlock = !isPositionUpdateOnly &&
                             (!blockUI || blockUI.blockUid !== event.data.blockUid) &&
                             selectedBlock !== event.data.blockUid;
          console.log('[VIEW] BLOCK_SELECTED received:', event.data.blockUid, 'src:', event.data.src, 'isNewBlock:', isNewBlock, 'currentBlockUI:', blockUI?.blockUid, 'currentSelectedBlock:', selectedBlock);

          // Call onSelectBlock OUTSIDE setBlockUI callback to avoid React warning
          if (isNewBlock) {
            console.log('[VIEW] BLOCK_SELECTED calling onSelectBlock:', event.data.blockUid);
            onSelectBlock(event.data.blockUid);
          }

          // Check if selected block is an empty block - if so, open block chooser
          // This should happen on every click of an empty block, not just "new" selections
          // BlockChooser will dynamically decide to mutate vs insert based on selected block type
          const selectedBlockData = getBlockByPath(
            properties,
            iframeSyncState.blockPathMap?.[event.data.blockUid]?.path,
          ) || properties?.blocks?.[event.data.blockUid];
          if (selectedBlockData?.['@type'] === 'empty') {
            setAddNewBlockOpened(true);
          }

          // Now update blockUI state
          setBlockUI((prevBlockUI) => {
            // Skip update if nothing changed - prevents unnecessary toolbar redraws
            if (prevBlockUI &&
                prevBlockUI.blockUid === event.data.blockUid &&
                prevBlockUI.focusedFieldName === event.data.focusedFieldName &&
                prevBlockUI.addDirection === event.data.addDirection &&
                prevBlockUI.rect?.top === event.data.rect?.top &&
                prevBlockUI.rect?.left === event.data.rect?.left &&
                prevBlockUI.rect?.width === event.data.rect?.width &&
                prevBlockUI.rect?.height === event.data.rect?.height) {
              return prevBlockUI; // Return same reference to skip re-render
            }

            return {
              blockUid: event.data.blockUid,
              rect: event.data.rect,
              focusedFieldName: event.data.focusedFieldName, // Track which field is focused
              editableFields: event.data.editableFields || {}, // Map of fieldName -> fieldType from iframe
              addDirection: event.data.addDirection || 'bottom', // Direction for add button positioning
            };
          });
          // Set selection from BLOCK_SELECTED - this ensures block and selection are atomic
          // Only update if selection actually changed
          setIframeSyncState(prev => {
            const newSelection = event.data.selection || null;
            if (JSON.stringify(prev.selection) === JSON.stringify(newSelection)) {
              return prev; // Skip re-render if selection unchanged
            }
            return { ...prev, selection: newSelection };
          });
          break;
        }

        case 'HIDE_BLOCK_UI':
          // Hide block UI overlays temporarily (during scroll/resize)
          // Don't deselect the block - just hide the visual overlays
          // The block will be re-shown when BLOCK_SELECTED is sent after scroll stops
          setBlockUI(null);
          // Don't call onSelectBlock(null) - keep the block selected in Redux
          break;

        case 'INIT':
          // Combined initialization: merge config first, then send data
          // This ensures blockPathMap is built with complete schema knowledge
          iframeOriginRef.current = event.origin;

          // 1. Merge voltoConfig (adds custom block definitions)
          if (event.data.voltoConfig) {
            const frontendConfig = event.data.voltoConfig;
            // Inject NoPreview view for frontend blocks that don't have one
            if (frontendConfig?.blocks?.blocksConfig) {
              Object.keys(frontendConfig.blocks.blocksConfig).forEach((blockType) => {
                const blockConfig = frontendConfig.blocks.blocksConfig[blockType];
                if (blockConfig && !blockConfig.view) {
                  blockConfig.view = NoPreview;
                }
              });
            }
            recurseUpdateVoltoConfig(frontendConfig);
          }

          // 2. Apply allowedBlocks by setting `restricted: true` on blocks not in the list
          // This integrates with Volto's standard block restriction mechanism
          if (event.data.allowedBlocks) {
            validateFrontendConfig(event.data, config.blocks.blocksConfig);
            const allowedSet = new Set(event.data.allowedBlocks);
            Object.keys(config.blocks.blocksConfig).forEach((blockType) => {
              const blockConfig = config.blocks.blocksConfig[blockType];
              if (blockConfig && !allowedSet.has(blockType)) {
                // Block not in allowedBlocks - mark as restricted at page level
                // Preserve existing restricted function if it exists (for dynamic restrictions)
                const existingRestricted = blockConfig.restricted;
                if (typeof existingRestricted !== 'function') {
                  blockConfig.restricted = true;
                }
                // If it's already a function, leave it - function takes precedence
              }
            });
            // Keep the list for backwards compatibility
            setAllowedBlocksList(event.data.allowedBlocks);
          }

          // 3. Extract block field types (now includes custom blocks)
          const initialBlockFieldTypes = extractBlockFieldTypes(intl);
          setBlockFieldTypes(initialBlockFieldTypes);

          // 4. Build blockPathMap (now has complete schema knowledge)
          // No need to pass allowedBlocks - it's now derived from blocksConfig.restricted
          const initialBlockPathMap = buildBlockPathMap(form, config.blocks.blocksConfig);
          setIframeSyncState(prev => ({
            ...prev,
            blockPathMap: initialBlockPathMap,
          }));

          // 5. Send everything to iframe
          const toolbarButtons = config.settings.slate?.toolbarButtons || [];
          event.source.postMessage(
            {
              type: 'INITIAL_DATA',
              data: form,
              blockFieldTypes: initialBlockFieldTypes,
              blockPathMap: initialBlockPathMap,
              slateConfig: {
                hotkeys: config.settings.slate?.hotkeys || {},
                toolbarButtons,
              },
            },
            event.origin,
          );
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
        blockPathMap: iframeSyncState.blockPathMap,
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
      const updatedBlockPathMap = buildBlockPathMap(formToUse, config.blocks.blocksConfig);
      console.log('[VIEW] Sending FORM_DATA with blockPathMap keys:', Object.keys(updatedBlockPathMap));
      console.log('[VIEW] blockPathMap for text-1a:', updatedBlockPathMap['text-1a']);
      // Include pendingSelectBlockUid so iframe can select the block after re-rendering
      // This is needed when a new block is added - the block doesn't exist in DOM yet
      const message = {
        type: 'FORM_DATA',
        data: formToUse,
        blockPathMap: updatedBlockPathMap,
        selectedBlockUid: iframeSyncState.pendingSelectBlockUid,
      };
      console.log('[VIEW] FORM_DATA selectedBlockUid:', iframeSyncState.pendingSelectBlockUid);
      document.getElementById('previewIframe')?.contentWindow?.postMessage(
        message,
        iframeOriginRef.current,
      );
      // Clear pendingSelectBlockUid after sending
      if (iframeSyncState.pendingSelectBlockUid) {
        setIframeSyncState(prev => ({
          ...prev,
          pendingSelectBlockUid: null,
        }));
      }
    }
  // NOTE: Only depend on formDataFromRedux, toolbarRequestDone, and pendingSelectBlockUid.
  // Do NOT depend on iframeSyncState.formData/selection - those change during
  // normal toolbar sync and would cause echo back to iframe.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formDataFromRedux, iframeSyncState.toolbarRequestDone, iframeSyncState.pendingSelectBlockUid]);

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


  // Get container configs for the selected block
  // - ownContainerConfig: for adding children INTO the selected block (sidebar add)
  // - parentContainerConfig: for adding siblings AFTER the selected block (iframe add)
  // NOTE: We use config.blocks.blocksConfig directly (not blocksConfig prop) because
  // the config is mutated when INIT is received with frontend's custom blocksConfig.
  // The iframeSyncState.blockPathMap dependency ensures re-compute after INIT.
  const { ownContainerConfig, parentContainerConfig } = useMemo(() => {
    if (!selectedBlock || !iframeSyncState.blockPathMap) {
      return { ownContainerConfig: null, parentContainerConfig: null };
    }

    // Use merged config from registry (includes frontend's custom blocks after INIT)
    const mergedBlocksConfig = config.blocks.blocksConfig;

    const ownConfig = getBlockOwnContainerConfig(
      selectedBlock,
      iframeSyncState.blockPathMap,
      iframeSyncState.formData,
      mergedBlocksConfig,
    );

    const parentConfig = getContainerFieldConfig(
      selectedBlock,
      iframeSyncState.blockPathMap,
      iframeSyncState.formData,
      mergedBlocksConfig,
    );

    return { ownContainerConfig: ownConfig, parentContainerConfig: parentConfig };
  }, [selectedBlock, iframeSyncState.blockPathMap, iframeSyncState.formData]);

  // Sidebar add: adds INTO the selected container
  // Uses ownContainerConfig.allowedBlocks
  const sidebarAllowedBlocks = useMemo(() => {
    return ownContainerConfig?.allowedBlocks || null;
  }, [ownContainerConfig]);

  // Iframe add: adds AFTER the selected block (as sibling)
  // Uses parentContainerConfig.allowedBlocks, or page-level allowedBlocks
  const iframeAllowedBlocks = useMemo(() => {
    if (parentContainerConfig?.allowedBlocks) {
      return parentContainerConfig.allowedBlocks;
    }
    return allowedBlocks;
  }, [parentContainerConfig, allowedBlocks]);

  // Compute allowedBlocks for BlockChooser based on addAfterBlockId
  // We always add AFTER a block, so we need the parent container's allowedBlocks
  const effectiveAllowedBlocks = useMemo(() => {
    const afterBlockId = addAfterBlockId || selectedBlock;
    const parentId = iframeSyncState.blockPathMap?.[afterBlockId]?.parentId;
    if (parentId) {
      // Adding inside a container - get that container's allowedBlocks
      const parentBlockData = getBlockByPath(
        properties,
        iframeSyncState.blockPathMap?.[parentId]?.path,
      );
      const parentType = parentBlockData?.['@type'];
      const parentSchema = config.blocks.blocksConfig?.[parentType]?.blockSchema;
      // Find the container field that contains this block
      for (const [fieldName, fieldDef] of Object.entries(parentSchema?.properties || {})) {
        if (fieldDef.type === 'blocks') {
          const layoutField = `${fieldName}_layout`;
          if (parentBlockData?.[layoutField]?.items?.includes(afterBlockId)) {
            return fieldDef.allowedBlocks || null;
          }
        }
      }
    }
    // Page-level - use page's allowedBlocks prop
    return allowedBlocks;
  }, [addAfterBlockId, selectedBlock, iframeSyncState.blockPathMap, properties, allowedBlocks]);

  // Handle sidebar add - adds after the last child of the container
  const handleSidebarAdd = useCallback((parentBlockId, fieldName) => {
    // Find the last child of the container
    const parentPath = iframeSyncState.blockPathMap?.[parentBlockId]?.path;
    const parentBlock = getBlockByPath(properties, parentPath);
    const layoutField = `${fieldName}_layout`;
    const existingItems = parentBlock?.[layoutField]?.items || [];
    const lastBlockId = existingItems[existingItems.length - 1] || null;

    // Set which block we're adding after (for allowedBlocks computation)
    setAddAfterBlockId(lastBlockId);

    const containerAllowed = sidebarAllowedBlocks;
    if (containerAllowed?.length === 1) {
      // Only one allowed block type - auto-insert without showing chooser
      const blockType = containerAllowed[0];
      const newBlockId = uuid();

      const mergedBlocksConfig = config.blocks.blocksConfig;
      let newBlockData = { '@type': blockType };
      newBlockData = initializeContainerBlock(newBlockData, mergedBlocksConfig, uuid, {
        intl,
        metadata,
        properties,
      });

      const containerConfig = { parentId: parentBlockId, fieldName };
      const newFormData = insertBlockInContainer(
        properties,
        iframeSyncState.blockPathMap,
        lastBlockId,
        newBlockId,
        newBlockData,
        containerConfig,
      );
      if (newFormData) {
        onChangeFormData(newFormData);
        setIframeSyncState((prev) => ({
          ...prev,
          pendingSelectBlockUid: newBlockId,
        }));
        dispatch(setSidebarTab(1));
      }
    } else {
      // Multiple options - show the block chooser
      setAddNewBlockOpened(true);
    }
  }, [sidebarAllowedBlocks, properties, onChangeFormData, iframeSyncState.blockPathMap, intl, metadata, dispatch]);

  // Handle iframe add - inserts AFTER the selected block (as sibling)
  const handleIframeAdd = useCallback(() => {
    // Set which block we're adding after (for allowedBlocks computation)
    setAddAfterBlockId(selectedBlock);

    const siblingAllowed = iframeAllowedBlocks;
    if (siblingAllowed?.length === 1) {
      // Only one allowed block type - auto-insert without showing chooser
      const blockType = siblingAllowed[0];
      const newId = onInsertBlock(selectedBlock, { '@type': blockType });
      // Store block to select after FORM_DATA is sent to iframe
      // Don't call onSelectBlock directly - iframe doesn't have the block yet
      setIframeSyncState((prev) => ({
        ...prev,
        pendingSelectBlockUid: newId,
      }));
      dispatch(setSidebarTab(1));
    } else {
      // Multiple options - show the block chooser
      setAddNewBlockOpened(true);
    }
  }, [iframeAllowedBlocks, selectedBlock, onInsertBlock, dispatch]);

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
                // Check if selected block is empty - if so, use onMutateBlock to replace
                (() => {
                  const selectedBlockData = getBlockByPath(
                    properties,
                    iframeSyncState.blockPathMap?.[selectedBlock]?.path,
                  ) || properties?.blocks?.[selectedBlock];
                  const isEmptyBlock = selectedBlockData?.['@type'] === 'empty';

                  if (!onInsertBlock || isEmptyBlock) return null;

                  return (id, value) => {
                    setAddNewBlockOpened(false);
                    // Use addAfterBlockId when set (sidebar add), otherwise use id from BlockChooser
                    const insertAfterId = addAfterBlockId || id;
                    const newId = onInsertBlock(insertAfterId, value);
                    // Store block to select after FORM_DATA is sent to iframe
                    // Don't call onSelectBlock directly - iframe doesn't have the block yet
                    setIframeSyncState((prev) => ({
                      ...prev,
                      pendingSelectBlockUid: newId,
                    }));
                    dispatch(setSidebarTab(1));
                  };
                })()
              }
              currentBlock={selectedBlock}
              allowedBlocks={effectiveAllowedBlocks}
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
      {blockUI && blockUI.rect && referenceElement && (() => {
        // Determine outline style based on block type and number of editable fields
        // Container blocks always get full border (they contain child blocks)
        // Single field non-container blocks get bottom line
        // Multi-field non-container blocks get full border
        const editableFieldCount = Object.keys(blockUI.editableFields || {}).length;
        const isContainer = getAllContainerFields(
          selectedBlock,
          iframeSyncState.blockPathMap,
          properties,
          config.blocks.blocksConfig,
        ).length > 0;
        const showBottomLine = editableFieldCount === 1 && !isContainer;
        return (
        <>
          {/* Selection Outline - blue border or bottom line depending on field count */}
          <div
            className="volto-hydra-block-outline"
            data-outline-style={showBottomLine ? 'bottom-line' : 'border'}
            style={{
              position: 'fixed',
              left: `${referenceElement.getBoundingClientRect().left + blockUI.rect.left}px`,
              top: showBottomLine
                ? `${referenceElement.getBoundingClientRect().top + blockUI.rect.top + blockUI.rect.height - 1}px`
                : `${referenceElement.getBoundingClientRect().top + blockUI.rect.top - 2}px`,
              width: `${blockUI.rect.width}px`,
              height: showBottomLine ? '3px' : `${blockUI.rect.height + 4}px`,
              background: showBottomLine ? '#007eb1' : 'transparent',
              border: showBottomLine ? 'none' : '2px solid #007eb1',
              pointerEvents: 'none',
              zIndex: 1,
            }}
          />

          {/* Quanta Toolbar with real Slate buttons */}
          <SyncedSlateToolbar
            selectedBlock={selectedBlock}
            form={iframeSyncState.formData}
            blockPathMap={iframeSyncState.blockPathMap}
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
            onDeleteBlock={onDeleteBlock}
            onSelectBlock={onSelectBlock}
            parentId={iframeSyncState.blockPathMap?.[selectedBlock]?.parentId}
            maxToolbarWidth={referenceElement?.getBoundingClientRect()?.width || 400}
          />

          {/* Add Button - positioned based on data-block-add direction */}
          {blockUI.addDirection !== 'hidden' && (() => {
            // Check if container is at maxLength
            const pathInfo = iframeSyncState.blockPathMap?.[selectedBlock];
            if (pathInfo?.maxSiblings) {
              // Count siblings in the same container
              const siblingCount = Object.values(iframeSyncState.blockPathMap || {})
                .filter((info) => info.parentId === pathInfo.parentId)
                .length;
              if (siblingCount >= pathInfo.maxSiblings) {
                return null; // Don't show add button when at maxLength
              }
            }

            const iframeRect = referenceElement.getBoundingClientRect();
            const isRightDirection = blockUI.addDirection === 'right';

            // Calculate ideal position
            const buttonWidth = 30;
            let addLeft = isRightDirection
              ? iframeRect.left + blockUI.rect.left + blockUI.rect.width + 8  // Right of block
              : iframeRect.left + blockUI.rect.left + blockUI.rect.width - buttonWidth; // Bottom-right of block

            // Constrain to stay within iframe bounds - stay at top-right but move inward
            const iframeRight = iframeRect.left + iframeRect.width;
            if (addLeft + buttonWidth > iframeRight) {
              // Move button inward to stay on screen, but keep it at top-right of block
              addLeft = iframeRect.left + blockUI.rect.left + blockUI.rect.width - buttonWidth - 8;
            }

            // For 'right': top-right of block
            // For 'bottom' (default): below block
            const addTop = isRightDirection
              ? iframeRect.top + blockUI.rect.top  // Top-right
              : iframeRect.top + blockUI.rect.top + blockUI.rect.height + 8;  // Below block

            return (
            <button
              className="volto-hydra-add-button"
              style={{
                position: 'fixed',
                left: `${addLeft}px`,
                top: `${addTop}px`,
                zIndex: 10,
                width: '30px',
                height: '30px',
                background: 'rgba(200, 200, 200, 0.5)',
                color: '#666',
                border: 'none',
                borderRadius: '50%',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '22px',
                lineHeight: '1',
                fontWeight: '400',
                padding: '0 0 2px 0',
                textAlign: 'center',
              }}
              onClick={handleIframeAdd}
              title="Add block"
            >
              +
            </button>
            );
          })()}
        </>
        );
      })()}

      {/* Hierarchical sidebar widgets */}
      <ParentBlocksWidget
        selectedBlock={selectedBlock}
        formData={properties}
        blockPathMap={iframeSyncState.blockPathMap}
        onSelectBlock={onSelectBlock}
        onDeleteBlock={onDeleteBlock}
        onChangeBlock={(blockId, newBlockData) => {
          // Rebuild blockPathMap from current properties to ensure it's up to date
          const currentBlockPathMap = buildBlockPathMap(properties, config.blocks.blocksConfig);

          // Find container config for nested blocks
          const pathInfo = currentBlockPathMap[blockId];
          const containerConfig = pathInfo?.parentId
            ? getContainerFieldConfig(
                blockId,
                currentBlockPathMap,
                properties,
                blocksConfig,
              )
            : null;

          const newFormData = mutateBlockInContainer(
            properties,
            currentBlockPathMap,
            blockId,
            newBlockData,
            containerConfig,
          );

          onChangeFormData(newFormData);
        }}
      />
      <ChildBlocksWidget
        selectedBlock={selectedBlock}
        formData={properties}
        blockPathMap={iframeSyncState.blockPathMap}
        onSelectBlock={onSelectBlock}
        onAddBlock={(parentBlockId, fieldName) => {
          handleSidebarAdd(parentBlockId, fieldName);
        }}
        onMoveBlock={(parentBlockId, fieldName, newOrder) => {
          const newFormData = reorderBlocksInContainer(
            properties,
            iframeSyncState.blockPathMap,
            parentBlockId,
            fieldName,
            newOrder,
          );
          onChangeFormData(newFormData);
        }}
      />
    </div>
  );
};

export default Iframe;
