import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { v4 as uuid } from 'uuid';
import { useHistory } from 'react-router-dom';
import Cookies from 'js-cookie';
import { Node } from 'slate';
import {
  applyBlockDefaults,
} from '@plone/volto/helpers';
import { validateAndLog, validateTemplatePlaceholders } from '../../utils/formDataValidation';
import { toast } from 'react-toastify';
import { getIframeUrlCookieName } from '../../utils/cookieNames';
import { isSlateFieldType, formDataContentEqual, PAGE_BLOCK_UID, getUniqueTemplateIds, getBlockAddability } from '@volto-hydra/hydra-js';
import Api from '@plone/volto/helpers/Api/Api';

import { setBlocksClipboard, resetBlocksClipboard } from '@plone/volto/actions/blocksClipboard/blocksClipboard';
import { cloneBlocks } from '@plone/volto/helpers/Blocks/cloneBlocks';
import { createLog } from '../../utils/log';

const log = createLog('VIEW');
const logExtract = createLog('EXTRACT'); // eslint-disable-line no-unused-vars

/**
 * Get field type string in "type:widget" format.
 * Formats:
 *   - "string:textarea" (type and widget)
 *   - "array:slate" (type and widget)
 *   - ":object_browser" (widget only, no type)
 *   - "string" (type only, no widget - default text field)
 *   - "boolean" (type only)
 *
 * @param {Object} field - Field definition from schema.properties
 * @returns {string} Field type string
 */
const getFieldTypeString = (field) => {
  const type = field.type;
  const widget = field.widget;

  if (type && widget) {
    return `${type}:${widget}`;
  }
  if (widget) {
    return `:${widget}`;
  }
  if (type) {
    return type;
  }
  // No type or widget specified - defaults to string (TextWidget)
  return 'string';
};

/**
 * Validates if a selection is valid for the given slate value.
 * Returns true if all paths in the selection exist in the document.
 */
/**
 * Scan all slate blocks for multi-node values and split them into
 * separate blocks. Returns null if no splits needed, or { formData, selectBlockId }.
 */
function splitMultiNodeSlateBlocks(formData, blockPathMap, blocksConfig, uuidGenerator, selection) {
  let result = formData;
  let selectBlockId = null;

  for (const [blockId, pathInfo] of Object.entries(blockPathMap)) {
    if (blockId.startsWith('_')) continue;
    const blockType = pathInfo.blockType;
    if (!blockType || blockType === 'title' || blockType === 'description') continue;

    const block = getBlockById(result, blockPathMap, blockId);
    if (!block) continue;

    // Check slate fields for multiple top-level nodes
    const schema = getResolvedSchema(pathInfo, blockPathMap);
    if (!schema?.properties) continue;

    for (const [fieldName, fieldDef] of Object.entries(schema.properties)) {
      if (!isSlateFieldType(getFieldTypeString(fieldDef))) continue;
      const value = block[fieldName];
      if (!Array.isArray(value) || value.length <= 1) continue;

      // Found a multi-node slate value — split it
      const firstNode = [value[0]];
      const restNodes = value.slice(1);

      // Update current block to keep only the first node
      const updatedBlock = { ...block, [fieldName]: firstNode };
      result = updateBlockById(result, blockPathMap, blockId, updatedBlock);

      // Create new blocks for each remaining top-level node.
      // Chain inserts: each new block goes after the previous one.
      const containerConfig = getContainerFieldConfig(blockId, blockPathMap, result, blocksConfig);
      let afterBlockId = blockId;
      for (let i = 0; i < restNodes.length; i++) {
        const newBlockId = uuidGenerator();
        const newBlockData = { '@type': 'slate', [fieldName]: [restNodes[i]] };
        result = insertBlockInContainer(
          result, blockPathMap, afterBlockId, newBlockId, newBlockData, containerConfig, 'after',
        );
        afterBlockId = newBlockId;
        if (i === 0) selectBlockId = newBlockId;
      }

      // Translate selection: cursor at [N, ...] in the unsplit value maps
      // to [0, ...] in the Nth new block.
      let newSelection = null;
      if (selection?.anchor?.path?.[0] > 0) {
        const translatePath = (p) => [0, ...p.slice(1)];
        newSelection = {
          anchor: { ...selection.anchor, path: translatePath(selection.anchor.path) },
          focus: { ...selection.focus, path: translatePath(selection.focus.path) },
        };
      }

      // Only process one split per render cycle to avoid stale blockPathMap
      return { formData: result, selectBlockId, selection: newSelection };
    }
  }

  return null;
}

function isSelectionValidForValue(selection, slateValue) {
  if (!selection) return true; // No selection is always valid
  if (!slateValue || !Array.isArray(slateValue)) return false;

  const doc = { children: slateValue };

  try {
    // Paths must resolve to text leaves, not element nodes.
    // A path like [0, 0] pointing to a li element is not a valid
    // cursor position — it must reach a text node like [0, 0, 0].
    if (selection.anchor?.path) {
      const node = Node.get(doc, selection.anchor.path);
      if (typeof node.text !== 'string') return false;
    }
    if (selection.focus?.path) {
      const node = Node.get(doc, selection.focus.path);
      if (typeof node.text !== 'string') return false;
    }
    return true;
  } catch (e) {
    return false;
  }
}
import './styles.css';
import { useIntl } from 'react-intl';
import config from '@plone/volto/registry';
import { BlockChooser, Icon, Toast } from '@plone/volto/components';
import { Menu } from 'semantic-ui-react';
import { createPortal, flushSync } from 'react-dom';
import { usePopper } from 'react-popper';
import { useSelector, useDispatch } from 'react-redux';
import { getURlsFromEnv } from '../../utils/getSavedURLs';
import { setSidebarTab } from '@plone/volto/actions';
import blockSVG from '@plone/volto/icons/block.svg';
import columnAfterSVG from '@plone/volto/icons/column-after.svg';
import rowAfterSVG from '@plone/volto/icons/row-after.svg';
import { setAllowedBlocksList } from '../../utils/allowedBlockList';
import toggleMark from '../../utils/toggleMark';
import slateTransforms from '../../utils/slateTransforms';
// Note: Editor, Transforms, toggleInlineFormat, toggleBlock were removed
// as applyFormat was replaced by SLATE_TRANSFORM_REQUEST handling
import OpenObjectBrowser from './OpenObjectBrowser';
import SyncedSlateToolbar from '../Toolbar/SyncedSlateToolbar';
import { buildBlockPathMap, stripBlockPathMapForPostMessage, getBlockByPath, getBlockById, updateBlockById, getChildBlockIds, getContainerFieldConfig, getSelectAfterDelete, insertBlockInContainer, deleteBlockFromContainer, mutateBlockInContainer, ensureEmptyBlockIfEmpty, initializeContainerBlock, moveBlockBetweenContainers, reorderBlocksInContainer, getAllContainerFields, insertTableColumn, deleteTableColumn, removeTemplateInstance, getContainerItems, getResolvedSchema, getCommonAncestor } from '../../utils/blockPath';
import { mergeTemplatesIntoPage } from '../../utils/mergeTemplates.mjs';
import {
  applySchemaDefaultsToFormData,
  applyBlockDefaultsWithContext,
  createSchemaEnhancerFromRecipe,
  syncChildBlockTypes,
  getConvertibleTypes,
  convertBlockType,
  validateFieldMappings,
} from '../../utils/schemaInheritance';
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

  // Future validations can be added here as needed
  // Frontend developers control what's allowed where via allowedBlocks

  if (errors.length > 0) {
    throw new Error(`[HYDRA] initBridge config error:\n- ${errors.join('\n- ')}`);
  }
};

/**
 * Extract field types for all block types from schema registry
 * @param {Object} intl - The react-intl intl object for internationalization
 * @param {Object} contentTypeSchema - Optional content type schema for page-level fields
 * @returns {Object} - Object mapping blockType -> fieldName -> fieldType
 *
 * We look up schemas from config.blocks.blocksConfig for each registered block type
 * and identify which fields are Slate fields (widget: 'slate') vs text fields.
 * This way it works for all blocks of that type, including ones added later.
 */
const extractBlockFieldTypes = (intl, contentTypeSchema = null) => {
  const blockFieldTypes = {};

  if (!config.blocks?.blocksConfig) {
    return blockFieldTypes;
  }

  // Hardcode known block types that don't have schemas
  // Slate blocks always have a 'value' field that is a slate field
  blockFieldTypes.slate = { value: 'array:slate' };
  blockFieldTypes.detachedSlate = { value: 'array:slate' };

  // Extract page-level field types from content type schema
  // These are accessed via /fieldName syntax (e.g., /title, /description)
  if (contentTypeSchema?.properties) {
    blockFieldTypes._page = {};
    Object.keys(contentTypeSchema.properties).forEach((fieldName) => {
      const field = contentTypeSchema.properties[fieldName];
      blockFieldTypes._page[fieldName] = getFieldTypeString(field);
    });
    logExtract('Page-level field types from content type schema:', blockFieldTypes._page);
  }

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
        logExtract('Processing hero block, blockConfig.blockSchema:', blockConfig.blockSchema);
        logExtract('Hero schema after resolution:', schema);
        logExtract('Hero schema.properties:', schema?.properties);
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
        blockFieldTypes[blockType][fieldName] = getFieldTypeString(field);

        // Handle object_list widgets (e.g., slides in slider block)
        if (field.widget === 'object_list' && field.schema?.properties) {
          // object_list widget: extract field types from itemSchema
          // Store under virtual type key: blockType:fieldName
          const itemTypeKey = `${blockType}:${fieldName}`;
          blockFieldTypes[itemTypeKey] = {};

          // Also register virtual type in blocksConfig so getAllContainerFields works
          if (!config.blocks.blocksConfig[itemTypeKey]) {
            config.blocks.blocksConfig[itemTypeKey] = {
              blockSchema: field.schema,
              disableCustomSidebarEditForm: true, // Virtual types use schema form in sidebar
            };
          }

          Object.keys(field.schema.properties).forEach((itemFieldName) => {
            const itemField = field.schema.properties[itemFieldName];
            blockFieldTypes[itemTypeKey][itemFieldName] = getFieldTypeString(itemField);

            // Handle nested object_list (e.g., rows containing cells)
            if (itemField.widget === 'object_list' && itemField.schema?.properties) {
              const nestedItemTypeKey = `${itemTypeKey}:${itemFieldName}`;
              blockFieldTypes[nestedItemTypeKey] = {};

              // Register nested virtual type in blocksConfig
              if (!config.blocks.blocksConfig[nestedItemTypeKey]) {
                config.blocks.blocksConfig[nestedItemTypeKey] = {
                  blockSchema: itemField.schema,
                  disableCustomSidebarEditForm: true,
                };
              }

              Object.keys(itemField.schema.properties).forEach((nestedFieldName) => {
                const nestedField = itemField.schema.properties[nestedFieldName];
                blockFieldTypes[nestedItemTypeKey][nestedFieldName] = getFieldTypeString(nestedField);
              });
            }
          });
        }
      });

      // Debug: Log what was added for hero
      if (blockType === 'hero') {
        logExtract('Hero blockFieldTypes after processing:', blockFieldTypes['hero']);
      }
    } catch (error) {
      console.warn(`[VIEW] Error extracting field types for block type "${blockType}":`, error);
      // Continue with other block types
    }
  });

  // Debug: Final state check
  logExtract('Final blockFieldTypes keys:', Object.keys(blockFieldTypes));
  logExtract('Final blockFieldTypes.hero:', blockFieldTypes['hero']);

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
    // Support both /#/ and /# - normalize by removing trailing slash before appending
    const hashBase = urlObj.hash.replace(/\/$/, '');
    urlObj.hash = `${hashBase}/${path}`;
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
const getUrlWithAdminParams = (url, token, isEdit) => {
  // Edit mode communicated via iframe name AND _edit param for reliability
  // _edit param ensures mode change triggers URL change and iframe reload
  if (typeof window === 'undefined') return null;
  const contentPath = window.location.pathname.replace(/\/edit$/, '');
  const params = { access_token: token };
  if (isEdit) {
    params._edit = 'true';
  }
  // Forward debug param to iframe so hydra.js enables logging
  const adminUrl = new URL(window.location.href);
  if (adminUrl.searchParams.has('_hydra_debug')) {
    params._hydra_debug = '1';
  }
  return addUrlParams(`${url}`, params, contentPath);
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
        } else if (typeof entry[key] === 'function') {
          // Special case: if existing value is a function (like blockSchema),
          // wrap it to merge the function's result with the new object
          const originalFn = entry[key];
          const overrides = newConfig[key];
          output[key] = (props) => {
            const result = originalFn(props);
            return deepMerge(result, overrides);
          };
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
 * Modifies the config in place. Uses blockSVG as fallback for missing icons.
 */
function processBlockIcons(blocksConfig) {
  if (!blocksConfig || typeof blocksConfig !== 'object') {
    return;
  }

  Object.keys(blocksConfig).forEach((blockType) => {
    const blockConfig = blocksConfig[blockType];
    if (!blockConfig) return;

    if (typeof blockConfig.icon === 'string') {
      const parsedIcon = parseSvgToIconFormat(blockConfig.icon);
      if (parsedIcon) {
        blockConfig.icon = parsedIcon;
      } else {
        // Invalid string icon - use fallback
        blockConfig.icon = blockSVG;
      }
    } else if (!blockConfig.icon) {
      // No icon provided - use fallback
      blockConfig.icon = blockSVG;
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

// Module-level state to track iframe's current state across component remounts
// This prevents unnecessary iframe reloads when React Router remounts the View component
let persistedIframe = { frontendUrl: null, path: null, isEdit: null, src: null };

const Iframe = (props) => {
  if (typeof window !== 'undefined' && window._formatT0) {
    console.log('[VIEW-TIMING] Iframe render +' + (performance.now() - window._formatT0).toFixed(0) + 'ms');
  }
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
    schema, // Content type schema for page-level field types
    saveTemplatesRef, // Ref that Form.jsx uses to trigger template save
    multiSelected = [], // Array of block UIDs in multi-selection
    onSetMultiSelected, // Callback to set multi-selection in Redux
  } = props;

  const dispatch = useDispatch();
  const blocksClipboard = useSelector((state) => state?.blocksClipboard || {});

  // Viewport preset for responsive preview
  const viewportPreset = useSelector(
    (state) => state.viewportPreset?.preset || 'desktop',
  );
  const viewportWidths = useSelector(
    (state) => state.viewportPreset?.widths || { mobile: 375, tablet: 768 },
  );
  const iframeMaxWidth = viewportPreset === 'desktop'
    ? undefined
    : `${viewportWidths[viewportPreset]}px`;

  // DEBUG: Track what causes re-renders
  const renderCountRef = useRef(0);
  const prevPropsRef = useRef({});
  renderCountRef.current++;
  const changedProps = Object.keys(props).filter(
    (key) => props[key] !== prevPropsRef.current[key]
  );
  if (renderCountRef.current > 1 && changedProps.length > 0) {
    log('[RENDER]', renderCountRef.current, 'changed props:', changedProps.join(', '));
  } else if (renderCountRef.current > 1) {
    log('[RENDER]', renderCountRef.current, 'no prop changes (state/context)');
  }
  prevPropsRef.current = props;

  const [addNewBlockOpened, setAddNewBlockOpened] = useState(false);
  // pendingAdd: { mode: 'sidebar', parentBlockId, fieldName } | { mode: 'iframe', afterBlockId }
  const [pendingAdd, setPendingAdd] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [popperElement, setPopperElement] = useState(null);
  const [referenceElement, setReferenceElement] = useState(null);
  const [blockUI, setBlockUI] = useState(null); // { blockUid, rect, focusedFieldName }
  const [mouseActivityCounter, setMouseActivityCounter] = useState(0); // incremented on MOUSE_ACTIVITY from iframe
  const [selectionMode, setSelectionMode] = useState(false); // true when in touch selection mode
  const multiSelectedRef = useRef(multiSelected);
  multiSelectedRef.current = multiSelected;

  // History for routing - needed early for edit mode detection
  const history = useHistory();
  const pathname = history.location.pathname;

  // Edit mode detection and iframe name - used for hydra.js bridge detection
  // Uses history.location.pathname which works on both SSR and client
  const isEditMode = pathname.endsWith('/edit');
  // Origin: use publicURL from config on SSR, window.location.origin on client
  const adminOrigin = typeof window !== 'undefined'
    ? window.location.origin
    : (config.settings.publicURL || '').replace(/\/$/, '');
  const iframeName = `hydra-${isEditMode ? 'edit' : 'view'}:${adminOrigin}`;

  const [pendingFieldMedia, setPendingFieldMedia] = useState(null); // { fieldName, blockUid } for field-level image selection
  // Multi-select state is merged into blockUI (multiSelectedUids, multiSelectRects fields)
  const blockChooserRef = useRef();
  const [slashMenu, setSlashMenu] = useState(null); // { blockId, filter } or null
  const [slashMenuIndex, setSlashMenuIndex] = useState(0);

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

  // Frontend URL: from Redux store, cookie, or env default
  const urlFromEnv = getURlsFromEnv();
  const u =
    useSelector((state) => state.frontendPreviewUrl.url) ||
    Cookies.get(getIframeUrlCookieName()) ||
    urlFromEnv[0];

  // Track last SELECT_BLOCK sent to avoid redundant sends during pending selection
  const lastSentSelectBlockRef = useRef(null);

  // When frontend URL changes (iframe remounts), reset the last-sent ref so the
  // selectedBlock effect below re-sends SELECT_BLOCK to the new iframe.
  // Also clear stale blockUI positioning from the old frontend.
  useEffect(() => {
    lastSentSelectBlockRef.current = null;
    setBlockUI(null);
  }, [u]);

  // Listen for sidebar "Page" click to deselect current block
  useEffect(() => {
    const handler = () => {
      onSelectBlock(null);
      // Tell the iframe to deselect too — otherwise it keeps sending
      // BLOCK_SELECTED for the previously selected block (e.g. from
      // afterContentRender) which immediately re-selects the block.
      if (iframeOriginRef.current) {
        document.getElementById('previewIframe')?.contentWindow?.postMessage(
          { type: 'SELECT_BLOCK', uid: null },
          iframeOriginRef.current,
        );
        lastSentSelectBlockRef.current = null;
      }
    };
    document.addEventListener('hydra-select-page', handler);
    return () => document.removeEventListener('hydra-select-page', handler);
  }, [onSelectBlock]);

  useEffect(() => {
    // Only send SELECT_BLOCK if iframe is ready (has sent INIT)
    // Skip if there's a pending selection - it will be sent via FORM_DATA instead
    // This prevents race condition where old selection overwrites pending new selection
    // Also skip if we just sent this same block (prevents duplicate sends)
    if (iframeOriginRef.current && selectedBlock && !iframeSyncState?.pendingSelectBlockUid) {
      if (lastSentSelectBlockRef.current !== selectedBlock) {
        log('useEffect sending SELECT_BLOCK:', selectedBlock);
        lastSentSelectBlockRef.current = selectedBlock;
        document.getElementById('previewIframe')?.contentWindow?.postMessage(
          {
            type: 'SELECT_BLOCK',
            uid: selectedBlock,
            method: 'select',
          },
          iframeOriginRef.current,
        );
      }
    }
  }, [selectedBlock]);

  // Clear blockUI when no block is selected
  // BUT keep it for page-level fields (blockUI exists with rect and blockUid is PAGE_BLOCK_UID)
  useEffect(() => {
    if (!selectedBlock) {
      setBlockUI((prev) => {
        // Keep blockUI if it's a page-level selection (blockUid is PAGE_BLOCK_UID with rect)
        if (prev?.blockUid === PAGE_BLOCK_UID && prev?.rect) {
          return prev;
        }
        return null;
      });
    }
  }, [selectedBlock]);

  const iframeOriginRef = useRef(null); // Store actual iframe origin from received messages
  // Note: iframePath is stored in module-level persistedIframePath to survive component remounts
  const inlineEditCounterRef = useRef(0); // Count INLINE_EDIT_DATA messages from iframe
  const processedInlineEditCounterRef = useRef(0); // Count how many we've seen come back through Redux
  const editSequenceRef = useRef(-1); // Sequence counter for detecting stale iframe echoes (starts at -1 so first increment gives 0)
  // Combined state for iframe data - formData, selection, requestId, and transformAction updated atomically
  // This ensures toolbar sees all together in the same render
  const intl = useIntl();

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
    blockPathMap: {}, // Built on INIT — no point computing here since INIT replaces it immediately
    selection: null,
    completedFlushRequestId: null, // For toolbar button click flow (FLUSH_BUFFER)
    transformAction: null, // For hotkey transform flow (format, paste, delete) - includes its own requestId
    toolbarRequestDone: null, // requestId - toolbar completed format, need to respond to iframe
    pendingSelectBlockUid: null, // Block to select after next FORM_DATA (for new block add)
    pendingFormatRequestId: null, // requestId to include in next FORM_DATA (for Enter key, etc.)
    templateEditMode: null, // templateInstanceId of template being edited, or null if not in edit mode
  }));

  // Notify toolbar whether paste is allowed for the current selection + clipboard.
  useEffect(() => {
    const bpm = iframeSyncState?.blockPathMap;
    if (!bpm || !selectedBlock) return;
    const clipData = blocksClipboard?.cut || blocksClipboard?.copy || [];
    if (clipData.length === 0) return;

    const blocksConfig = config.blocks.blocksConfig;
    const containerConfig = getContainerFieldConfig(selectedBlock, bpm, properties, blocksConfig, intl);
    const allowedTypes = containerConfig?.allowedBlocks;

    let allowed = true;
    if (allowedTypes?.length > 0) {
      allowed = clipData.every(([, blockData]) =>
        allowedTypes.includes(blockData?.['@type']),
      );
    }

    document.dispatchEvent(new CustomEvent('hydra-paste-state', {
      detail: { allowed },
    }));
  }, [selectedBlock, blocksClipboard, iframeSyncState?.blockPathMap, properties, intl]);

  // Handle copy/cut/delete/paste from BlocksToolbar via document events.
  useEffect(() => {
    const bpm = iframeSyncState?.blockPathMap;
    if (!bpm) return;
    const blocksConfig = config.blocks.blocksConfig;

    const handleCopy = (e) => {
      const { blockIds, action } = e.detail;
      const blocksData = blockIds
        .map((uid) => {
          const block = getBlockById(properties, bpm, uid);
          return block ? [uid, block] : null;
        })
        .filter(Boolean);
      log('hydra-copy-blocks:', action, blocksData.length, 'blocks');
      dispatch(setBlocksClipboard({ [action]: blocksData }));
      // Clear all outlines — stale combined rect would render wrong as single-block outline
      setBlockUI(null);
      handleExitSelectionMode();
    };

    const handleDelete = (e) => {
      const { blockIds } = e.detail;
      log('hydra-delete-blocks:', blockIds.length, 'blocks:', blockIds);
      let newFormData = { ...properties };
      let currentBpm = bpm;
      for (const uid of blockIds) {
        const containerConfig = getContainerFieldConfig(uid, currentBpm, newFormData, blocksConfig, intl);
        newFormData = deleteBlockFromContainer(newFormData, currentBpm, uid, containerConfig);
        currentBpm = buildBlockPathMap(newFormData, blocksConfig, intl);
      }
      onChangeFormData(newFormData);
      onSelectBlock(null);
      setBlockUI(null);
      if (onSetMultiSelected) onSetMultiSelected([]);
    };

    const handlePaste = (e) => {
      const { afterBlockId, keepClipboard } = e.detail;
      const mode = Object.keys(blocksClipboard).includes('cut') ? 'cut' : 'copy';
      const blocksData = blocksClipboard[mode] || [];

      const cloneWithIds = blocksData
        .filter(([blockId, blockData]) => blockId && blockData?.['@type'])
        .map(([blockId, blockData]) => {
          const blockConfig = blocksConfig[blockData['@type']];
          return mode === 'copy'
            ? blockConfig?.cloneData
              ? blockConfig.cloneData(blockData)
              : [uuid(), cloneBlocks(blockData)]
            : [blockId, blockData];
        })
        .filter(Boolean);

      if (cloneWithIds.length === 0) return;

      const containerConfig = getContainerFieldConfig(afterBlockId, bpm, properties, blocksConfig, intl);
      const allowedTypes = containerConfig?.allowedBlocks;
      if (allowedTypes?.length > 0) {
        const allAllowed = cloneWithIds.every(([, blockData]) =>
          allowedTypes.includes(blockData?.['@type']),
        );
        if (!allAllowed) {
          log('hydra-paste-blocks: blocked — types not allowed in container');
          return;
        }
      }

      log('hydra-paste-blocks:', cloneWithIds.length, 'blocks after', afterBlockId);
      let newFormData = { ...properties };
      let currentBpm = bpm;
      let lastId = afterBlockId;
      for (const [newId, blockData] of cloneWithIds) {
        newFormData = insertBlockInContainer(newFormData, currentBpm, lastId, newId, blockData, containerConfig, 'after');
        currentBpm = buildBlockPathMap(newFormData, blocksConfig, intl);
        lastId = newId;
      }

      if (!keepClipboard) dispatch(resetBlocksClipboard());
      onChangeFormData(newFormData);
    };

    const handleExitSelectionMode = () => {
      log('hydra-exit-selection-mode');
      if (onSetMultiSelected) onSetMultiSelected([]);
      // Tell iframe — it clears state and acks with EXIT_SELECTION_MODE
      // which sets selectionMode(false) so checkboxes disappear after iframe confirms
      const iframe = document.getElementById('previewIframe');
      if (iframe?.contentWindow && iframeOriginRef.current) {
        iframe.contentWindow.postMessage({ type: 'EXIT_SELECTION_MODE' }, iframeOriginRef.current);
      }
    };

    const handleEnterSelectionMode = () => {
      log('hydra-enter-selection-mode');
      // Tell iframe to enter selection mode. Iframe responds with ENTER_SELECTION_MODE
      // message containing allBlockRects, which sets selectionMode=true in View.jsx
      const iframe = document.getElementById('previewIframe');
      if (iframe?.contentWindow && iframeOriginRef.current) {
        iframe.contentWindow.postMessage({ type: 'ENTER_SELECTION_MODE' }, iframeOriginRef.current);
      }
    };

    document.addEventListener('hydra-copy-blocks', handleCopy);
    document.addEventListener('hydra-delete-blocks', handleDelete);
    document.addEventListener('hydra-paste-blocks', handlePaste);
    document.addEventListener('hydra-exit-selection-mode', handleExitSelectionMode);
    document.addEventListener('hydra-enter-selection-mode', handleEnterSelectionMode);
    return () => {
      document.removeEventListener('hydra-copy-blocks', handleCopy);
      document.removeEventListener('hydra-delete-blocks', handleDelete);
      document.removeEventListener('hydra-paste-blocks', handlePaste);
      document.removeEventListener('hydra-exit-selection-mode', handleExitSelectionMode);
      document.removeEventListener('hydra-enter-selection-mode', handleEnterSelectionMode);
    };
  }, [blocksClipboard, properties, iframeSyncState?.blockPathMap, onChangeFormData, dispatch, intl]);

  // Template cache: stores loaded template documents keyed by templateId
  // Used for comparison on save to detect template changes
  const templateCacheRef = useRef({});

  // Pending template edit exit - stores { requestId, prevInstanceId } when waiting for flush
  const pendingTemplateEditExitRef = useRef(null);


  // Trigger for template sync effect - INIT increments this when templates need loading
  // This causes the effect to run and fetch templates, then send deferred INITIAL_DATA
  const [templateSyncTrigger, setTemplateSyncTrigger] = useState(0);

  // Set up saveTemplatesRef function for Form.jsx to call before page save
  // Templates are merged into cache when exiting template edit mode
  // This function just persists whatever is in cache to the backend
  useEffect(() => {
    if (!saveTemplatesRef) return;

    saveTemplatesRef.current = async (formData, currentPath) => {
      // Flush any pending inline edit text from the iframe before saving.
      // Text typed in the iframe is debounced, so it may not have been sent
      // via INLINE_EDIT_DATA yet. The flush ensures formData is up to date.
      if (referenceElement?.contentWindow) {
        await new Promise((resolve) => {
          const requestId = `save-flush-${Date.now()}`;
          const handleMessage = (event) => {
            if (
              (event.data.type === 'BUFFER_FLUSHED' && event.data.requestId === requestId) ||
              (event.data.type === 'INLINE_EDIT_DATA' && event.data.flushRequestId === requestId)
            ) {
              window.removeEventListener('message', handleMessage);
              // Let React process the INLINE_EDIT_DATA state update
              setTimeout(resolve, 0);
            }
          };
          window.addEventListener('message', handleMessage);
          referenceElement.contentWindow.postMessage(
            { type: 'FLUSH_BUFFER', requestId },
            '*'
          );
        });
      }

      const templateCache = templateCacheRef.current;
      const templateIds = getUniqueTemplateIds(formData).filter(
        id => id !== currentPath && templateCache[id]
      );

      if (templateIds.length === 0) {
        return;
      }

      // Use Volto's Api helper which handles auth and URL formatting
      const api = new Api();

      await Promise.all(templateIds.map(async (templateId) => {
        const template = templateCache[templateId];
        if (!template) return;

        log('SAVE TEMPLATE: Saving template:', templateId);
        log('SAVE TEMPLATE: Template blocks:', Object.keys(template.blocks || {}));
        // Log first block's value to check if edit is present
        const firstBlockId = template.blocks_layout?.items?.[0];
        if (firstBlockId && template.blocks[firstBlockId]) {
          const block = template.blocks[firstBlockId];
          log('SAVE TEMPLATE: First block value:', JSON.stringify(block.value)?.substring(0, 200));
        }

        // PATCH the template - cache already has merged content from edit mode exit
        try {
          await api.patch(templateId, {
            data: {
              blocks: template.blocks,
              blocks_layout: template.blocks_layout,
            },
          });
        } catch (error) {
          console.error(`[HYDRA] Failed to save template ${templateId}:`, error);
        }
      }));
    };
  }, [saveTemplatesRef, referenceElement]);

  // Handle pending template edit exit after flush completes
  // When exiting template edit mode, we first flush pending text updates,
  // then do the reverse merge once the flush completes
  useEffect(() => {
    const pending = pendingTemplateEditExitRef.current;
    if (!pending) return;

    // Check if flush completed
    if (iframeSyncState.completedFlushRequestId !== pending.requestId) return;

    // Clear pending state
    pendingTemplateEditExitRef.current = null;

    // Now do the reverse merge with fresh formData
    const { prevInstanceId } = pending;
    const formData = iframeSyncState.formData;

    // Find the templateId for this instance
    let templateId = null;
    for (const block of Object.values(formData.blocks || {})) {
      if (block.templateInstanceId === prevInstanceId && block.templateId) {
        templateId = block.templateId;
        break;
      }
    }

    if (templateId && templateCacheRef.current[templateId]) {
      const template = templateCacheRef.current[templateId];

      log('REVERSE MERGE: Starting reverse merge for template:', templateId);
      log('REVERSE MERGE: prevInstanceId:', prevInstanceId);
      log('REVERSE MERGE: Template blocks:', Object.keys(template.blocks || {}));
      log('REVERSE MERGE: FormData blocks:', Object.keys(formData.blocks || {}));
      // Log fixed blocks' content in formData
      for (const [blockId, block] of Object.entries(formData.blocks || {})) {
        if (block.fixed && block.templateInstanceId === prevInstanceId) {
          log(`REVERSE MERGE: Fixed block ${blockId}:`, JSON.stringify(block.value)?.substring(0, 200));
        }
      }

      // Merge edited instance back into template (reverse merge)
      // This captures edits to fixed+readOnly blocks into the template cache
      mergeTemplatesIntoPage(template, {
        loadTemplate: async () => formData,
        filterInstanceId: prevInstanceId,
        uuidGenerator: uuid,
        blocksConfig: config.blocks.blocksConfig,
        intl,
      }).then(({ merged: updatedTemplate }) => {
        log('REVERSE MERGE: Updated template blocks:', Object.keys(updatedTemplate.blocks || {}));
        // Log first block's value to check if edit is captured
        const firstBlockId = updatedTemplate.blocks_layout?.items?.[0];
        if (firstBlockId && updatedTemplate.blocks[firstBlockId]) {
          const block = updatedTemplate.blocks[firstBlockId];
          log('REVERSE MERGE: First block value:', JSON.stringify(block.value)?.substring(0, 200));
        }

        // Update cache with merged template
        templateCacheRef.current[templateId] = updatedTemplate;
      });
    }

    // Update state to exit template edit mode
    setIframeSyncState(prev => ({
      ...prev,
      templateEditMode: null,
    }));

    // Send template edit mode to iframe
    const iframe = document.getElementById('previewIframe');
    if (iframe?.contentWindow) {
      iframe.contentWindow.postMessage(
        { type: 'TEMPLATE_EDIT_MODE', instanceId: null },
        '*'
      );
    }
  }, [iframeSyncState.completedFlushRequestId, iframeSyncState.formData]);

  // Pending INITIAL_DATA: when templates are loading during INIT, store data here
  // Sync effect will send INITIAL_DATA after templates are merged
  const pendingInitialDataRef = useRef(null);

  // Handle Escape key in Admin UI — three-state machine (same as iframe):
  //   Text mode (sidebar field focused) → Block mode (blur field, stay on block)
  //   Block mode → Parent block (or deselect if at page level)
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key !== 'Escape') return;
      if (!selectedBlock) return;

      // Don't interfere with Escape in modals, dropdowns, popups, etc.
      const isInPopup = e.target.closest('.volto-hydra-dropdown-menu, .blocks-chooser, [role="dialog"], .ui.modal, .add-link, .slate-inline-toolbar');
      if (isInPopup) return;

      // Also check if LinkEditor popup is visible (focus may not be inside it)
      const linkEditorVisible = document.querySelector('.add-link');
      if (linkEditorVisible) return;

      // Don't handle if focus is in iframe - let iframe's handler do it
      const iframeEl = document.getElementById('previewIframe');
      if (iframeEl && iframeEl.contains(document.activeElement)) return;

      e.preventDefault();

      // Check if a sidebar form field has focus (sidebar text mode)
      const sidebarField = document.activeElement?.closest?.('.field-wrapper input, .field-wrapper textarea, .field-wrapper [contenteditable="true"], .field-wrapper select');
      if (sidebarField) {
        // FIRST ESCAPE: Sidebar text mode → Block mode (blur field, stay on block)
        log('Admin Escape key - entering block mode (blurring sidebar field)');
        (document.activeElement as HTMLElement)?.blur?.();
        return;
      }

      // SECOND ESCAPE: Block mode → Parent (or deselect)
      const pathInfo = iframeSyncState.blockPathMap?.[selectedBlock];
      const parentId = pathInfo?.parentId || null;
      log('Admin Escape key - selecting parent:', parentId, 'from:', selectedBlock);

      // Select parent (or deselect if no parent)
      onSelectBlock(parentId);

      // Tell the iframe to select the parent (or deselect) — otherwise the iframe
      // still has the old block selected and keeps sending BLOCK_SELECTED messages
      const iframeWindow = iframeEl?.contentWindow;
      if (iframeWindow) {
        iframeWindow.postMessage(
          { type: 'SELECT_BLOCK', uid: parentId, method: 'select' },
          '*',
        );
      }
    };

    document.addEventListener('keydown', handleEscape, true);
    return () => document.removeEventListener('keydown', handleEscape, true);
  }, [selectedBlock, iframeSyncState.blockPathMap, onSelectBlock]);

  // Initialize from persisted state so component remounts don't reset to null
  // (which would cause a duplicate iframe load for the same URL).
  // On first-ever load, persistedIframe.src is null (safe for SSR hydration).
  const [iframeSrc, setIframeSrc] = useState(persistedIframe.src);

  // Note: window.name inside iframe is set via the `name` attribute on the <iframe> element.
  // When iframe reloads (e.g., on mode switch), it picks up the current `name` attribute value.
  // No useEffect needed - the HTML attribute handles it.

  // Extract block field types - stored in state so it can be updated when frontend config is merged
  // Must be declared before useEffects that reference it
  const [blockFieldTypes, setBlockFieldTypes] = useState(() => extractBlockFieldTypes(intl, schema));

  // Update block field types when schema changes (includes page-level field types)
  useEffect(() => {
    if (schema) {
      setBlockFieldTypes(extractBlockFieldTypes(intl, schema));
    }
  }, [schema, intl]);

  // Note: We use `properties` prop from Form.jsx as the single source of truth
  // This matches standard Volto's BlocksForm pattern (props, not Redux)

  // Validate properties on mount and change
  useEffect(() => {
    validateAndLog(properties, 'properties (from Form)', blockFieldTypes);
  }, [properties, blockFieldTypes]);

  useEffect(() => {
    // Only update iframeSrc if admin path, mode, or frontend URL differs from iframe's current state
    // This prevents reloading iframe when it already navigated via SPA
    // Using module-level persistedIframe to survive component remounts
    const adminPath = pathname.replace(/\/edit$/, '');
    const stateMatches =
      persistedIframe.frontendUrl === u &&
      persistedIframe.path === adminPath &&
      persistedIframe.isEdit === isEditMode;
    log('[IFRAME_SRC] persisted:', persistedIframe, 'current:', { frontendUrl: u, path: adminPath, isEdit: isEditMode }, 'match:', stateMatches, 'iframeSrc:', iframeSrc ? 'set' : 'null');
    // Update if state doesn't match OR if iframeSrc is null (component just mounted)
    if (!stateMatches || !iframeSrc) {
      log('[IFRAME_SRC] Updating iframeSrc (state differs:', !stateMatches, 'iframeSrc null:', !iframeSrc, ')');
      const newSrc = getUrlWithAdminParams(u, token, isEditMode);
      setIframeSrc(newSrc);
      persistedIframe = { frontendUrl: u, path: adminPath, isEdit: isEditMode, src: newSrc };
    } else {
      log('[IFRAME_SRC] Skipping - state matches and iframeSrc already set');
    }
    u && Cookies.set(getIframeUrlCookieName(), u, { expires: 7 });
  }, [token, u, pathname, isEditMode, iframeSrc]);

  // NOTE: Form sync and FORM_DATA sending are merged into one useEffect below (search for "UNIFIED FORM SYNC")

  // Warn before leaving edit mode (browser-level)

  useEffect(() => {
    if (!isEditMode) return;

    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = ''; // Required for Chrome
      return ''; // Required for some browsers
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isEditMode]);

  /**
   * Unified block insertion: creates a block, inserts it, updates Redux, and selects it.
   *
   * @param {string} blockId - Reference block ID
   * @param {string} blockType - Type of block to insert (e.g., 'slate', 'image')
   * @param {'before'|'after'|'inside'} action - Where to insert relative to blockId
   * @param {string} [fieldName] - For 'inside' action, which container field to insert into
   * @param {Object} [options] - Optional settings
   * @param {Object} [options.blockData] - Custom block data (skips default generation)
   * @param {Object} [options.formData] - Pre-mutated formData to insert into
   * @param {Object} [options.blockPathMap] - BlockPathMap for the formData
   * @param {string} [options.formatRequestId] - Request ID to include in FORM_DATA response
   * @param {number} [options.selectChildIndex] - Select child at this index instead of the new block
   * @returns {string} The new block's ID
   */
  const insertAndSelectBlock = useCallback((blockId, blockType, action, fieldName, options = {}) => {
    const { blockData: customBlockData, formData: customFormData, blockPathMap: customBlockPathMap, formatRequestId, selectChildIndex } = options;
    const formData = customFormData || properties;
    const blockPathMap = customBlockPathMap || iframeSyncState.blockPathMap;
    const mergedBlocksConfig = config.blocks.blocksConfig;
    const newBlockId = uuid();

    // Handle template insertion - templates expand to multiple blocks
    const templateConfig = mergedBlocksConfig[blockType];
    if (templateConfig?.isTemplate && templateConfig?.templateUrl) {
      // Fetch template data and insert (async)
      (async () => {
        try {
          // Use mergeTemplatesIntoPage with the template as the only allowedLayout to force it
          const { merged: newFormData } = await mergeTemplatesIntoPage(formData, {
            loadTemplate: async () => {
              const response = await fetch(`/++api++${templateConfig.templateUrl}`);
              if (!response.ok) throw new Error(`Failed to fetch template: ${response.status}`);
              return response.json();
            },
            pageBlocksFields: { blocks_layout: { allowedLayouts: [templateConfig.templateUrl] } },
            uuidGenerator: uuid,
            blocksConfig: config.blocks.blocksConfig,
            intl,
          });

          // Merge with existing formData (preserve other fields like title, description)
          onChangeFormData({
            ...formData,
            blocks: newFormData.blocks,
            blocks_layout: newFormData.blocks_layout,
          });

          // Select the template virtual block (instance)
          // Get templateInstanceId from any template block
          const firstBlockId = newFormData.blocks_layout?.items?.[0];
          const firstBlock = newFormData.blocks?.[firstBlockId];
          const tplInstanceId = firstBlock?.templateInstanceId;

          if (tplInstanceId) {
            flushSync(() => {
              setIframeSyncState((prev) => ({
                ...prev,
                pendingSelectBlockUid: tplInstanceId,
              }));
            });
          }
          dispatch(setSidebarTab(1));
        } catch (error) {
          console.error('[VIEW] Failed to insert template:', error);
        }
      })();

      return null; // Async - block ID not immediately available
    }

    // Get container config and determine if object_list
    let containerConfig;
    let isObjectList = false;
    let fieldDef;

    if (action === 'inside') {
      // Get field info from blockPathMap (already resolved by buildBlockPathMap, includes schemaEnhancer)
      const childEntry = Object.values(blockPathMap || {}).find(
        (info) => info.parentId === blockId && info.containerField === fieldName
      );
      if (childEntry?.isObjectListItem) {
        isObjectList = true;
        fieldDef = {
          typeField: childEntry.typeField || null,
          allowedBlocks: childEntry.allowedSiblingTypes,
          idField: childEntry.idField,
          widget: 'object_list',
        };
      } else {
        // blocks_layout container or no existing children — try schema as fallback
        const parentType = blockPathMap[blockId]?.blockType;
        const parentSchema =
          typeof mergedBlocksConfig?.[parentType]?.blockSchema === 'function'
            ? mergedBlocksConfig[parentType].blockSchema({
                formData: {},
                intl: { formatMessage: (m) => m.defaultMessage },
              })
            : mergedBlocksConfig?.[parentType]?.blockSchema;
        fieldDef = parentSchema?.properties?.[fieldName];
        isObjectList = fieldDef?.widget === 'object_list';
      }
      containerConfig = { parentId: blockId, fieldName, isObjectList };
    } else {
      containerConfig = getContainerFieldConfig(blockId, blockPathMap, formData, mergedBlocksConfig, intl);
      // For before/after, get isObjectList from containerConfig
      isObjectList = containerConfig?.isObjectList || false;
    }

    // Check for table mode (from containerConfig which comes from pathMap)
    const isTableMode = containerConfig?.addMode === 'table';
    const isTableCell = containerConfig?.parentAddMode === 'table';

    // Table mode: adding a cell adds a column (to ALL rows)
    if (isTableCell && action !== 'inside') {
      // Create cell template with defaults
      const virtualType = blockPathMap[blockId]?.blockType; // e.g., 'slateTable:rows:cells'
      let cellData = { '@type': virtualType };
      cellData = applyBlockDefaults({ data: cellData, formData: cellData, intl, metadata, properties }, mergedBlocksConfig);
      cellData = initializeContainerBlock(cellData, mergedBlocksConfig, uuid, { intl, metadata, properties, blockType: virtualType });
      delete cellData['@type'];

      const result = insertTableColumn(
        formData,
        blockPathMap,
        blockId,
        cellData,
        action,
        uuid,
      );

      if (!result?.formData) {
        console.error('[VIEW] insertTableColumn failed');
        return null;
      }

      onChangeFormData(result.formData);
      flushSync(() => {
        setIframeSyncState((prev) => ({
          ...prev,
          pendingSelectBlockUid: result.insertedCellId,
          ...(formatRequestId ? { pendingFormatRequestId: formatRequestId } : {}),
        }));
      });
      dispatch(setSidebarTab(1));

      return result.insertedCellId;
    }

    // Create block data (use custom data if provided)
    let blockData;
    if (customBlockData) {
      blockData = customBlockData;
    } else if (isObjectList) {
      // object_list items: typeField defaults to '@type' — no special casing needed
      const idField = containerConfig?.idField || fieldDef?.idField || '@id';
      const typeFieldName = (action === 'inside' ? fieldDef?.typeField : blockPathMap[blockId]?.typeField) || '@type';

      let effectiveType;
      if (blockType) {
        // Block type explicitly chosen (from BlockChooser) — use it directly
        effectiveType = blockType;
      } else if (action === 'inside') {
        // Single-schema or no explicit type: virtual type from parent:field
        effectiveType = `${blockPathMap[blockId]?.blockType}:${fieldName}`;
      } else {
        // Before/after: use existing item's type
        effectiveType = blockPathMap[blockId]?.blockType;
      }
      blockData = { [idField]: newBlockId, '@type': effectiveType };

      // For table mode rows, pass sibling data so cells count is copied
      let siblingData = null;
      if (isTableMode) {
        // Get existing rows for cell count reference
        // For 'inside' action: blockId is the table, fieldName is 'rows'
        // For 'before'/'after' action: blockId is a row, need to get parent table
        let tableBlock;
        let dataPath;
        if (action === 'inside') {
          tableBlock = getBlockById(formData, blockPathMap, blockId);
          dataPath = fieldDef?.dataPath || [fieldName];
        } else {
          // For before/after on a row, get the parent table
          const rowPathInfo = blockPathMap?.[blockId];
          const parentId = rowPathInfo?.parentId;
          tableBlock = getBlockById(formData, blockPathMap, parentId);
          // Get dataPath from the row's container field definition
          const tableType = blockPathMap[parentId]?.blockType;
          const tableBlockSchema = typeof mergedBlocksConfig?.[tableType]?.blockSchema === 'function'
            ? mergedBlocksConfig[tableType].blockSchema({ formData, intl: { formatMessage: (m) => m.defaultMessage } })
            : mergedBlocksConfig?.[tableType]?.blockSchema;
          const rowsFieldDef = tableBlockSchema?.properties?.[rowPathInfo.containerField];
          dataPath = rowsFieldDef?.dataPath || [rowPathInfo.containerField];
        }
        let rowsData = tableBlock;
        for (const key of dataPath) {
          rowsData = rowsData?.[key];
        }
        siblingData = Array.isArray(rowsData) ? rowsData : null;
      }

      // Initialize nested containers (e.g., cells in a row)
      blockData = initializeContainerBlock(blockData, mergedBlocksConfig, uuid, { intl, metadata, properties, siblingData, blockType: effectiveType });

      // Inherit template fields from neighbors (same logic as blocks_layout)
      if (action !== 'inside') {
        const parentId = blockPathMap[blockId]?.parentId;
        const parentBlock = parentId === PAGE_BLOCK_UID
          ? formData
          : getBlockById(formData, blockPathMap, parentId);
        const existingItems = parentBlock ? getContainerItems(parentBlock, containerConfig) : [];
        const idFld = containerConfig?.idField || fieldDef?.idField || '@id';
        const refIndex = existingItems.findIndex(item => item[idFld] === blockId);
        const position = action === 'after' ? refIndex + 1 : refIndex;

          blockData = applyBlockDefaultsWithContext(blockData, {
          position,
          insertAfter: action === 'after',
          items: existingItems,
          blocksConfig: mergedBlocksConfig,
          intl,
        });
      }

      // Store type in typeField, clean up @type if typeField is different
      blockData[typeFieldName] = effectiveType;
      if (typeFieldName !== '@type') {
        delete blockData['@type']; // @type was only used for schema resolution
      }
    } else {
      // Standard block with @type
      blockData = { '@type': blockType };
      if (blockType === 'slate') {
        blockData.value = [{ type: 'p', children: [{ text: '' }] }];
      }

      // Calculate position for context
      const containerId = containerConfig?.parentId || 'page';
      const containerField = containerConfig?.fieldName || 'blocks_layout';
      const container = containerId === 'page' ? formData : getBlockById(formData, blockPathMap, containerId);
      const layoutItems = container?.[containerField]?.items || [];
      const refIndex = layoutItems.indexOf(blockId);
      const position = action === 'after' ? refIndex + 1 : refIndex;

      // Apply defaults with extended context for dynamic defaults
      // insertAfter tells inheritance logic which neighbor to inherit template membership from
      blockData = applyBlockDefaultsWithContext(blockData, {
        containerId,
        field: containerField,
        position,
        insertAfter: action === 'after',
        layoutItems,
        allBlocks: formData.blocks,
        blockPathMap,
        blocksConfig: mergedBlocksConfig,
        intl,
      });

      // Also apply regular applyBlockDefaults for non-context-aware schemas
      blockData = applyBlockDefaults({ data: blockData, formData: blockData, intl, metadata, properties });
      blockData = initializeContainerBlock(blockData, mergedBlocksConfig, uuid, { intl, metadata, properties, blockType });
    }

    // Insert and update state
    let newFormData = insertBlockInContainer(
      formData,
      blockPathMap,
      blockId,
      newBlockId,
      blockData,
      containerConfig,
      action,
    );

    if (!newFormData) {
      console.error('[VIEW] insertAndSelectBlock failed');
      return null;
    }

    // Ensure new container blocks have at least one child (for gridBlock etc.)
    const newBlockPathMap = buildBlockPathMap(newFormData, mergedBlocksConfig, intl);
    newFormData = ensureEmptyBlockIfEmpty(
      newFormData,
      { parentId: newBlockId },
      newBlockPathMap,
      uuid,
      mergedBlocksConfig,
      { intl, metadata, properties },
    );

    // Determine which block to select
    let selectBlockId = newBlockId;
    if (selectChildIndex != null && blockData) {
      // Find the first array field in the block and get the child at selectChildIndex
      // This is used when adding a row from a cell - we want to select the corresponding cell
      for (const [, fieldValue] of Object.entries(blockData)) {
        if (Array.isArray(fieldValue) && fieldValue[selectChildIndex]) {
          const childItem = fieldValue[selectChildIndex];
          // Get the ID field - typically 'key' or '@id'
          const childId = childItem?.key || childItem?.['@id'];
          if (childId) {
            selectBlockId = childId;
            break;
          }
        }
      }
    }

    // Set pending selection and blockPathMap, but NOT formData
    // formData will be updated by the useEffect after it sends FORM_DATA to iframe
    // This ensures the useEffect sees a content change and doesn't skip sending
    const insertBlockPathMap = buildBlockPathMap(newFormData, config.blocks.blocksConfig, intl);
    flushSync(() => {
      setIframeSyncState((prev) => ({
        ...prev,
        blockPathMap: insertBlockPathMap,
        pendingSelectBlockUid: selectBlockId,
        ...(formatRequestId ? { pendingFormatRequestId: formatRequestId } : {}),
      }));
    });
    onChangeFormData(newFormData);
    dispatch(setSidebarTab(1));

    return newBlockId;
  }, [properties, iframeSyncState.blockPathMap, intl, metadata, onChangeFormData, dispatch]);

  const onMutateBlock = (id, value) => {
    // Use merged config from registry (includes frontend's custom blocks after INIT)
    const mergedBlocksConfig = config.blocks.blocksConfig;

    // Initialize block data the same way as onInsertBlock
    // This is important when replacing empty blocks with real blocks
    let blockData = { '@type': value['@type'], ...value };

    // Add initial slate value for slate blocks
    if (blockData['@type'] === 'slate' && !blockData.value) {
      blockData.value = [{ type: 'p', children: [{ text: '' }] }];
    }

    // Apply block defaults
    // Pass formData alongside data - some Volto schemas expect formData (e.g., ImageSchema)
    blockData = applyBlockDefaults({
      data: blockData,
      formData: blockData,
      intl,
      metadata,
      properties,
    });

    // Initialize container blocks with default children (recursive)
    // onMutateBlock replaces blocks in blocks_layout, so @type is the type field
    blockData = initializeContainerBlock(blockData, mergedBlocksConfig, uuid, {
      intl,
      metadata,
      properties,
      blockType: value['@type'],
    });

    // Check if mutating inside a container (null means page-level)
    const containerConfig = getContainerFieldConfig(
      id,
      iframeSyncState.blockPathMap,
      properties,
      mergedBlocksConfig,
      intl,
    );

    // Use container-aware mutation for nested blocks
    const newFormData = mutateBlockInContainer(
      properties,
      iframeSyncState.blockPathMap,
      id,
      blockData,
      containerConfig,
    );

    // Rebuild blockPathMap to reflect the new block type (e.g., empty → slate)
    // Do NOT set formData here - let the useEffect update it after sending FORM_DATA
    const newBlockPathMap = buildBlockPathMap(newFormData, mergedBlocksConfig, intl);
    setIframeSyncState(prev => ({
      ...prev,
      blockPathMap: newBlockPathMap,
    }));
    onChangeFormData(newFormData);
  };

  const onDeleteBlock = (id, selectPrev) => {
    // Use merged config from registry (includes frontend's custom blocks after INIT)
    const mergedBlocksConfig = config.blocks.blocksConfig;

    // Check if this is a template instance (virtual block)
    const pathInfo = iframeSyncState.blockPathMap?.[id];
    if (pathInfo?.isTemplateInstance) {
      // Remove template instance: delete fixed blocks, strip template fields from user content
      let newFormData = removeTemplateInstance(
        properties,
        iframeSyncState.blockPathMap,
        id,
      );

      // Rebuild blockPathMap to reflect the removed template
      const newBlockPathMap = buildBlockPathMap(newFormData, mergedBlocksConfig, intl);
      setIframeSyncState(prev => ({
        ...prev,
        blockPathMap: newBlockPathMap,
      }));
      onChangeFormData(newFormData);
      onSelectBlock(null);
      setAddNewBlockOpened(false);
      dispatch(setSidebarTab(1));
      return;
    }

    // Check if deleting from a container (null means page-level)
    const containerConfig = getContainerFieldConfig(
      id,
      iframeSyncState.blockPathMap,
      properties,
      mergedBlocksConfig,
      intl,
    );

    // Compute which block to select after deletion (previous sibling, or parent if last)
    const selectAfterDelete = getSelectAfterDelete(
      id, containerConfig, iframeSyncState.blockPathMap, properties,
    );

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

    // Rebuild blockPathMap to reflect the deleted block
    // Do NOT set formData here - let the useEffect update it after sending FORM_DATA
    const newBlockPathMap = buildBlockPathMap(newFormData, mergedBlocksConfig, intl);
    const selectAfterDeleteUid = selectPrev ? selectAfterDelete : null;
    setIframeSyncState(prev => ({
      ...prev,
      blockPathMap: newBlockPathMap,
      ...(selectAfterDeleteUid ? { pendingSelectBlockUid: selectAfterDeleteUid } : {}),
    }));
    onChangeFormData(newFormData);
    onSelectBlock(selectAfterDeleteUid);
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

      // Save pre-message sequence for echo detection (used by INLINE_EDIT_DATA).
      const preMessageSeq = editSequenceRef.current;

      // Adopt the iframe's edit sequence from ANY message carrying form data.
      // The iframe increments _editSequence when buffering local changes (typing).
      // Without this, editSequenceRef stays stale when typing is buffered directly
      // into a transform request (e.g., Enter pressed before debounced send).
      if (event.data.data?._editSequence != null) {
        const msgSeq = event.data.data._editSequence;
        if (msgSeq > editSequenceRef.current) {
          editSequenceRef.current = msgSeq;
        }
      }

      switch (type) {
        case 'PATH_CHANGE': { // PATH change from the iframe (SPA navigation)
          // Check if this is in-page navigation (e.g., paging) - just resend form data
          if (event.data.inPage) {
            log('PATH_CHANGE: in-page navigation (paging), resending form data');
            // Build blockPathMap and apply defaults (same as INIT handler)
            const resendBlockPathMap = buildBlockPathMap(form, config.blocks.blocksConfig, intl);
            const resendFormWithDefaults = applySchemaDefaultsToFormData(
              form,
              resendBlockPathMap,
              config.blocks.blocksConfig,
              intl,
            );
            const toolbarButtons = config.settings.slate?.toolbarButtons || [];
            event.source.postMessage(
              {
                type: 'INITIAL_DATA',
                data: resendFormWithDefaults,
                blockPathMap: stripBlockPathMapForPostMessage(resendBlockPathMap),
                selectedBlockUid: selectedBlock,
                slateConfig: {
                  hotkeys: config.settings.slate?.hotkeys || {},
                  toolbarButtons,
                },
              },
              event.origin,
            );
            break;
          }
          // User clicked a nav link in iframe - they want to VIEW that page, not edit it
          // Strip the iframe's base path prefix from the reported path
          // e.g., iframe at /edit/about → content path /about
          const iframeBasePath = u ? new URL(u).pathname.replace(/\/$/, '') : '';
          let navPath = event.data.path;
          if (iframeBasePath && navPath.startsWith(iframeBasePath)) {
            navPath = navPath.slice(iframeBasePath.length) || '/';
          }
          // Update module-level state BEFORE history.push so useEffect knows iframe already has this path
          persistedIframe = { frontendUrl: u, path: navPath, isEdit: false };
          history.push(navPath);
          break;
        }


        case 'OPEN_SETTINGS':
          // NOTE: Do NOT call onSelectBlock here. BLOCK_SELECTED is the single source of
          // truth for selection - it sets both selectedBlock (via onSelectBlock) and blockUI
          // atomically. OPEN_SETTINGS just opens the sidebar; selection happens via BLOCK_SELECTED.
          if (history.location.pathname.endsWith('/edit')) {
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

        case 'DELETE_BLOCKS': {
          const uidsToDelete = event.data.uids || [];
          log('DELETE_BLOCKS: dispatching hydra-delete-blocks for', uidsToDelete.length, 'blocks');
          document.dispatchEvent(new CustomEvent('hydra-delete-blocks', {
            detail: { blockIds: uidsToDelete },
          }));
          break;
        }

        case 'COPY_BLOCKS': {
          const uids = event.data.uids || [];
          const action = event.data.action || 'copy'; // 'copy' or 'cut'
          const blocksData = uids
            .map(uid => {
              const block = getBlockById(properties, iframeSyncState.blockPathMap, uid);
              return block ? [uid, block] : null;
            })
            .filter(Boolean);
          log('COPY_BLOCKS:', action, blocksData.length, 'blocks');
          dispatch(setBlocksClipboard({ [action]: blocksData }));
          break;
        }

        case 'PASTE_BLOCKS': {
          // Paste from blocks clipboard after the specified block (Cmd+V in block mode)
          const afterBlockId = event.data.afterBlockId;
          if (!afterBlockId) break;
          document.dispatchEvent(new CustomEvent('hydra-paste-blocks', {
            detail: { afterBlockId, keepClipboard: false },
          }));
          break;
        }

        case 'ENTER_SELECTION_MODE': {
          const { blockUid: toggledUid, allBlockRects } = event.data;
          log('ENTER_SELECTION_MODE:', toggledUid || '(activate only)', allBlockRects ? Object.keys(allBlockRects).length + ' rects' : 'toggle');
          setSelectionMode(true);
          if (allBlockRects) {
            setBlockUI(prev => ({ ...prev, selectionModeRects: allBlockRects }));
          }
          // Toggle blockUid in multiSelected only if provided. When admin triggered
          // selection mode via sidebar (no blockUid), multiSelected is already set.
          if (toggledUid && onSetMultiSelected) {
            const current = multiSelectedRef.current || [];
            const idx = current.indexOf(toggledUid);
            const updated = idx >= 0
              ? current.filter(id => id !== toggledUid)
              : [...current, toggledUid];
            if (updated.length === 0) {
              // All unchecked — exit selection mode
              onSetMultiSelected([]);
              const iframe = document.getElementById('previewIframe');
              if (iframe?.contentWindow && iframeOriginRef.current) {
                iframe.contentWindow.postMessage({ type: 'EXIT_SELECTION_MODE' }, iframeOriginRef.current);
              }
            } else {
              onSetMultiSelected(updated);
            }
          }
          break;
        }

        case 'EXIT_SELECTION_MODE': {
          log('EXIT_SELECTION_MODE ack from iframe');
          setSelectionMode(false);
          break;
        }

        case 'ADD_BLOCK_AFTER': {
          // Determine the default block type from the container's schema
          const containerFieldConfig = getContainerFieldConfig(
            event.data.blockId, iframeSyncState.blockPathMap, properties, config.blocks.blocksConfig, intl
          );
          const defaultType = containerFieldConfig?.defaultBlockType
            || (containerFieldConfig?.allowedBlocks?.length === 1 ? containerFieldConfig.allowedBlocks[0] : null)
            || 'slate';
          insertAndSelectBlock(event.data.blockId, defaultType, 'after');
          break;
        }

        case 'SLASH_MENU':
          if (event.data.action === 'filter') {
            setSlashMenu({ blockId: event.data.blockId, filter: event.data.filter, fieldRect: event.data.fieldRect });
            setSlashMenuIndex(0);
          } else if (event.data.action === 'hide') {
            setSlashMenu(null);
            setSlashMenuIndex(0);
          } else if (event.data.action === 'up') {
            setSlashMenuIndex(prev => (prev > 0 ? prev - 1 : prev));
          } else if (event.data.action === 'down') {
            setSlashMenuIndex(prev => prev + 1);
          } else if (event.data.action === 'select') {
            // Selection is handled by the slashMenuSelect effect below
            setSlashMenu(prev => prev ? { ...prev, selecting: true } : null);
          }
          break;

        case 'INLINE_EDIT_DATA': {
          // Validate data from postMessage before using it
          validateAndLog(event.data.data, 'INLINE_EDIT_DATA', blockFieldTypes);
          const incomingSequence = event.data.data?._editSequence || 0;
          // Use preMessageSeq (saved before universal adoption) for echo detection.
          // The universal adoption already bumped editSequenceRef, so reading it
          // here would always show incomingSeq == editSequenceRef → never new.
          log('INLINE_EDIT_DATA flushRequestId:', event.data.flushRequestId, '_editSequence:', incomingSequence, 'preMessageSeq:', preMessageSeq);

          // Sequence logic:
          // - incomingSeq > preMessageSeq: new edit from iframe, process it
          // - incomingSeq <= preMessageSeq: echo or stale, only update selection
          const isNewEdit = incomingSequence > preMessageSeq;

          if (isNewEdit) {
            // New edit from iframe - update everything
            inlineEditCounterRef.current += 1;
            // Debug: log full children structure to diagnose missing "w" bug
            const debugBlock = event.data.data?.blocks?.['block-1-uuid'];
            if (debugBlock?.value?.[0]?.children) {
              log('INLINE_EDIT_DATA: full children structure:', JSON.stringify(debugBlock.value[0].children));
            }
            setIframeSyncState(prev => ({
              ...prev,
              formData: event.data.data,
              blockPathMap: buildBlockPathMap(event.data.data, config.blocks.blocksConfig, intl),
              selection: event.data.selection || null,
              _selectionSource: 'INLINE_EDIT_DATA:new',
              ...(event.data.flushRequestId ? { completedFlushRequestId: event.data.flushRequestId } : {}),
            }));
            // Strip _editSequence when updating Redux - sequence numbers are for iframe
            // echo detection only. Redux data doesn't need sequences since admin-side echo
            // prevention uses content comparison (processedInlineEditCounterRef + formDataContentEqual).
            const { _editSequence: _, ...formDataWithoutSeq } = event.data.data;
            log('INLINE_EDIT_DATA: calling onChangeFormData prop to update Redux (without _editSequence)');
            onChangeFormData(formDataWithoutSeq);
          } else {
            // Echo or stale - only update flush state (NOT selection).
            // The iframe may echo back a wrong cursor position (e.g., [0,0]
            // instead of [0,1,0] inside a prospective-format node). The admin
            // already has the authoritative selection from the format transform.
            log('INLINE_EDIT_DATA: echo/stale, updating flush state only (ignoring selection)');
            if (event.data.flushRequestId) {
              setIframeSyncState(prev => ({
                ...prev,
                completedFlushRequestId: event.data.flushRequestId,
              }));
            }
          }
          break;
        }

        case 'BUFFER_FLUSHED':
          // Iframe had no pending text - update combined state with current form + requestId + selection
          log('Received BUFFER_FLUSHED (no pending text), requestId:', event.data.requestId);
          setIframeSyncState(prev => ({
            ...prev,
            selection: event.data.selection || null,
            _selectionSource: 'BUFFER_FLUSHED',
            completedFlushRequestId: event.data.requestId,
          }));
          break;

        case 'INLINE_EDIT_EXIT':
          
          break;

        case 'TOGGLE_MARK': {
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
        }

        case 'SLATE_TRANSFORM_REQUEST':
          window._formatT0 = performance.now();
          console.log('[VIEW-TIMING] SLATE_TRANSFORM_REQUEST received');
          // Validate data from postMessage before using it
          validateAndLog(event.data.data, 'SLATE_TRANSFORM_REQUEST', blockFieldTypes);

          // Unified transform request from iframe - always includes form data with buffer
          // transformType: 'format', 'paste', 'delete', 'enter'
          // fieldName: which field is being edited (e.g., 'value', 'description')

          if (event.data.transformType === 'enter') {
            // Enter is handled directly here since it creates a new block
            try {
              const { blockId: enterBlockId, fieldName: enterFieldName, selection: enterSelection, requestId: enterRequestId } = event.data;
              const formToUseForEnter = event.data.data;

              // Update iframeSyncState to keep it in sync
              const enterBlockPathMap = buildBlockPathMap(formToUseForEnter, config.blocks.blocksConfig, intl);
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
              if (!isSlateFieldType(fieldType)) {
                // Not a slate field - don't split block
                break;
              }

              // Get the field value to split
              const fieldValue = currentBlock[enterFieldName];
              if (!fieldValue) {
                break;
              }

              // Check if cursor is in a list item — handle differently from normal split
              if (slateTransforms.isSelectionInList(fieldValue, enterSelection)) {
                const containerConfig = getContainerFieldConfig(
                  enterBlockId, enterBlockPathMap, formToUseForEnter,
                  config.blocks.blocksConfig, intl,
                );

                if (slateTransforms.isCurrentListItemEmpty(fieldValue, enterSelection)) {
                  // Empty list item: remove it and create new empty block after
                  const { newValue } = slateTransforms.removeEmptyListItem(fieldValue, enterSelection);
                  const updatedBlock = { ...currentBlock, [enterFieldName]: newValue };
                  const mutatedFormData = mutateBlockInContainer(
                    formToUseForEnter, enterBlockPathMap, enterBlockId, updatedBlock, containerConfig,
                  );
                  const syncedBpm = buildBlockPathMap(mutatedFormData, config.blocks.blocksConfig, intl);
                  flushSync(() => {
                    setIframeSyncState(prev => ({
                      ...prev,
                      formData: mutatedFormData,
                      blockPathMap: syncedBpm,
                    }));
                  });
                  onChangeFormData(mutatedFormData);
                  insertAndSelectBlock(enterBlockId, currentBlock['@type'] || 'slate', 'after', null, {
                    formatRequestId: enterRequestId,
                    formData: mutatedFormData,
                    blockPathMap: syncedBpm,
                  });
                } else {
                  // Non-empty list item: split it (new bullet, same block)
                  const { newValue, newSelection } = slateTransforms.splitListItem(fieldValue, enterSelection);
                  const updatedBlock = { ...currentBlock, [enterFieldName]: newValue };
                  const mutatedFormData = mutateBlockInContainer(
                    formToUseForEnter, enterBlockPathMap, enterBlockId, updatedBlock, containerConfig,
                  );
                  const newBpm = buildBlockPathMap(mutatedFormData, config.blocks.blocksConfig, intl);
                  setIframeSyncState(prev => ({
                    ...prev,
                    formData: mutatedFormData,
                    blockPathMap: newBpm,
                    selection: newSelection,
                    toolbarRequestDone: enterRequestId,
                  }));
                }
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
                intl,
              );

              // Update current block with content before cursor
              const updatedCurrentBlock = {
                ...currentBlock,
                [enterFieldName]: topValue,
              };
              const mutatedFormData = mutateBlockInContainer(
                formToUseForEnter,
                enterBlockPathMap,
                enterBlockId,
                updatedCurrentBlock,
                containerConfig,
              );

              // First sync the text changes to Redux (like toolbar onChange does for format)
              // This ensures state is consistent before insert
              const syncedBlockPathMap = buildBlockPathMap(mutatedFormData, config.blocks.blocksConfig, intl);
              flushSync(() => {
                setIframeSyncState(prev => ({
                  ...prev,
                  formData: mutatedFormData,
                  blockPathMap: syncedBlockPathMap,
                }));
              });
              onChangeFormData(mutatedFormData);

              // Insert new block with bottom half of split text.
              // Must pass mutatedFormData because properties is stale (won't update
              // until next render after onChangeFormData dispatch above).
              const newBlockData = {
                '@type': blockType,
                [enterFieldName]: bottomValue,
              };
              insertAndSelectBlock(enterBlockId, blockType, 'after', null, {
                blockData: newBlockData,
                formatRequestId: enterRequestId,
                formData: mutatedFormData,
                blockPathMap: syncedBlockPathMap,
              });
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
          } else if (event.data.transformType === 'outdent') {
            // Check if this is a top-level list item — needs block splitting
            const { blockId: odBlockId, fieldName: odFieldName, selection: odSelection, requestId: odRequestId } = event.data;
            const odForm = event.data.data;
            const odBpm = buildBlockPathMap(odForm, config.blocks.blocksConfig, intl);
            const odBlockPath = odBpm[odBlockId]?.path;
            const odBlock = odBlockPath ? getBlockByPath(odForm, odBlockPath) : odForm.blocks[odBlockId];
            const odFieldValue = odBlock?.[odFieldName];
            log('[OUTDENT] selection:', JSON.stringify(odSelection), 'fieldValue:', JSON.stringify(odFieldValue));
            const split = odFieldValue ? slateTransforms.splitListAtItem(odFieldValue, odSelection) : null;
            log('[OUTDENT] split result:', split ? JSON.stringify({ before: !!split.before, paragraph: !!split.paragraph, after: !!split.after }) : 'null');

            if (!split) {
              // Nested outdent: forward to toolbar
              setIframeSyncState(prev => ({
                ...prev,
                formData: odForm,
                blockPathMap: odBpm,
                selection: odSelection || null,
                transformAction: { type: 'outdent', requestId: odRequestId },
              }));
            } else {
              // Top-level outdent: split list block into up to 3 blocks
              const containerConfig = getContainerFieldConfig(odBlockId, odBpm, odForm, config.blocks.blocksConfig, intl);
              const blockType = odBlock['@type'];

              // Update current block with before-list (or paragraph if no before)
              const updatedBlock = { ...odBlock, [odFieldName]: split.before || split.paragraph };
              let fd = mutateBlockInContainer(odForm, odBpm, odBlockId, updatedBlock, containerConfig);
              let bpm = buildBlockPathMap(fd, config.blocks.blocksConfig, intl);
              let selectBlockId = odBlockId;

              // Insert paragraph block after current (only if current kept the before-list)
              if (split.before) {
                const paraId = uuid();
                fd = insertBlockInContainer(fd, bpm, odBlockId, paraId,
                  { '@type': blockType, [odFieldName]: split.paragraph }, containerConfig, 'after');
                bpm = buildBlockPathMap(fd, config.blocks.blocksConfig, intl);
                selectBlockId = paraId;

                // Insert after-list block after the paragraph
                if (split.after) {
                  const afterId = uuid();
                  fd = insertBlockInContainer(fd, bpm, paraId, afterId,
                    { '@type': blockType, [odFieldName]: split.after }, containerConfig, 'after');
                  bpm = buildBlockPathMap(fd, config.blocks.blocksConfig, intl);
                }
              } else if (split.after) {
                // No before: current block IS paragraph, insert after-list after it
                const afterId = uuid();
                fd = insertBlockInContainer(fd, bpm, odBlockId, afterId,
                  { '@type': blockType, [odFieldName]: split.after }, containerConfig, 'after');
                bpm = buildBlockPathMap(fd, config.blocks.blocksConfig, intl);
              }

              // Set pending selection and blockPathMap, but NOT formData
              // formData will be updated by the useEffect after it sends FORM_DATA to iframe
              // This ensures the useEffect sees a content change and doesn't skip sending
              flushSync(() => {
                setIframeSyncState(prev => ({
                  ...prev,
                  blockPathMap: bpm,
                  pendingSelectBlockUid: selectBlockId,
                  ...(odRequestId ? { pendingFormatRequestId: odRequestId } : {}),
                }));
              });
              onChangeFormData(fd);
              dispatch(setSidebarTab(1));
            }
          } else if (event.data.transformType === 'unwrapBlock' && event.data.isFirstField && !event.data.isEmpty && (() => {
            // Check if block's root node is already a default paragraph — only then merge.
            // Non-default types (headings, lists) should go to toolbar for unwrap first.
            const checkBlock = event.data.data?.blocks?.[event.data.blockId];
            const checkValue = checkBlock?.[event.data.fieldName || 'value'];
            const defaultType = config.settings?.slate?.defaultBlockType || 'p';
            return Array.isArray(checkValue) && checkValue[0]?.type === defaultType;
          })()) {
            // Backspace at start of non-empty default paragraph — merge with previous block
            log('unwrapBlock merge handler reached for block:', event.data.blockId, 'fieldName:', event.data.fieldName);
            try {
              const { blockId: mergeBlockId, fieldName: mergeFieldName, requestId: mergeRequestId } = event.data;
              const mergeForm = event.data.data;
              const mergeBpm = buildBlockPathMap(mergeForm, config.blocks.blocksConfig, intl);
              const mergePathInfo = mergeBpm[mergeBlockId];

              // Find previous block in layout
              const mergeParentId = mergePathInfo?.parentId;
              const mergeField = mergePathInfo?.containerField || 'blocks_layout';
              const mergeParent = mergeParentId === '_page' ? mergeForm : getBlockByPath(mergeForm, mergeBpm[mergeParentId]?.path);
              const mergeLayout = mergeParent?.[mergeField]?.items || mergeParent?.blocks_layout?.items || [];
              const mergeIdx = mergeLayout.indexOf(mergeBlockId);
              const prevBlockId = mergeIdx > 0 ? mergeLayout[mergeIdx - 1] : null;

              if (prevBlockId) {
                const prevPathInfo = mergeBpm[prevBlockId];
                const prevBlock = prevPathInfo?.path ? getBlockByPath(mergeForm, prevPathInfo.path) : mergeForm.blocks[prevBlockId];
                const currentBlock = mergePathInfo?.path ? getBlockByPath(mergeForm, mergePathInfo.path) : mergeForm.blocks[mergeBlockId];
                const fieldName = mergeFieldName || 'value';
                const prevValue = prevBlock?.[fieldName];
                const currentValue = currentBlock?.[fieldName];

                // Only merge single-text-field blocks (e.g. slate paragraphs)
                // Multi-field blocks (hero, teaser) should not merge
                const prevSchema = getResolvedSchema(prevPathInfo, mergeBpm);
                const prevEditableFields = prevSchema?.properties
                  ? Object.entries(prevSchema.properties).filter(([, def]) => {
                      const ft = getFieldTypeString(def);
                      return ft?.includes('slate') || ft === 'string' || ft === 'string:text' || ft === 'string:textarea';
                    })
                  : [];
                const isSingleTextField = prevEditableFields.length === 1 && prevEditableFields[0][0] === fieldName;

                log('unwrapBlock merge check:', { prevBlockId, prevType: prevBlock?.['@type'], fieldName, isSingleTextField, prevEditableFields: prevEditableFields.map(([n]) => n), hasPrevValue: Array.isArray(prevValue), hasCurrentValue: Array.isArray(currentValue) });

                if (isSingleTextField && Array.isArray(prevValue) && Array.isArray(currentValue)) {
                  log('unwrapBlock merge: merging', mergeBlockId, 'into', prevBlockId);

                  const { Transforms, Editor } = require('slate');
                  const { slate: slateConfig } = config.settings;
                  // Merge using a headless Slate editor — handles all cases
                  // (p into p, p into list, heading into p, etc.) and normalizes
                  // the result (merges adjacent text nodes, ensures inline spacing).
                  const allNodes = [...prevValue, ...currentValue];
                  const mergeEditor = slateTransforms.createHeadlessEditor(allNodes);
                  const joinIdx = prevValue.length;
                  Transforms.select(mergeEditor, Editor.start(mergeEditor, [joinIdx]));
                  Editor.deleteBackward(mergeEditor, { unit: 'character' });
                  const mergedValue = JSON.parse(JSON.stringify(mergeEditor.children));
                  const cursorSelection = mergeEditor.selection;
                  log('unwrapBlock merge: joinIdx:', joinIdx, 'result nodes:', mergedValue.length, 'selection:', JSON.stringify(cursorSelection));
                  const updatedPrev = { ...prevBlock, [fieldName]: mergedValue };

                  // Merge + delete in one atomic form data update using iframe's form data
                  // (includes latest typed text from buffer)
                  const mergeBpmForDelete = buildBlockPathMap(mergeForm, config.blocks.blocksConfig, intl);
                  let newFormData = updateBlockById(mergeForm, mergeBpmForDelete, prevBlockId, updatedPrev);
                  // Remove the merged block from blocks and layout
                  newFormData = {
                    ...newFormData,
                    blocks: Object.fromEntries(
                      Object.entries(newFormData.blocks || {}).filter(([id]) => id !== mergeBlockId)
                    ),
                    blocks_layout: {
                      ...newFormData.blocks_layout,
                      items: (newFormData.blocks_layout?.items || []).filter(id => id !== mergeBlockId),
                    },
                  };

                  // After merge+delete, check if the next block is a list of the
                  // same type as the previous block — if so, merge it in.
                  // Lists are containers: two adjacent ul blocks are one split list.
                  const prevRootType = mergedValue[0]?.type;
                  if (prevRootType && slateConfig?.listTypes?.includes(prevRootType)) {
                    const postLayout = newFormData.blocks_layout?.items || [];
                    const prevIdx = postLayout.indexOf(prevBlockId);
                    const nextBlockId = prevIdx >= 0 ? postLayout[prevIdx + 1] : null;
                    if (nextBlockId) {
                      const nextBpm = buildBlockPathMap(newFormData, config.blocks.blocksConfig, intl);
                      const nextBlock = getBlockById(newFormData, nextBpm, nextBlockId);
                      const nextValue = nextBlock?.[fieldName];
                      if (Array.isArray(nextValue) && nextValue.length === 1
                        && nextValue[0]?.type === prevRootType) {
                        log('unwrapBlock: merging adjacent list block', nextBlockId);
                        const adjEditor = slateTransforms.createHeadlessEditor([...mergedValue, ...nextValue]);
                        Transforms.mergeNodes(adjEditor, { at: [mergedValue.length] });
                        const combined = JSON.parse(JSON.stringify(adjEditor.children));
                        newFormData = updateBlockById(newFormData, nextBpm, prevBlockId, { ...updatedPrev, [fieldName]: combined });
                        newFormData = deleteBlockFromContainer(newFormData, nextBpm, nextBlockId,
                          getContainerFieldConfig(nextBlockId, nextBpm, newFormData, config.blocks.blocksConfig, intl));
                      }
                    }
                  }

                  // Set pending state synchronously so the FORM_DATA effect sees it
                  flushSync(() => {
                    setIframeSyncState(prev => ({
                      ...prev,
                      selection: cursorSelection,
                      pendingSelectBlockUid: prevBlockId,
                      pendingFormatRequestId: mergeRequestId,
                      pendingTransformedSelection: cursorSelection,
                    }));
                  });
                  onChangeFormData(newFormData);
                }
              }
            } catch (error) {
              console.error('[VIEW] Error handling unwrapBlock merge:', error);
              event.source.postMessage(
                { type: 'SLATE_ERROR', blockId: event.data.blockId, error: error.message },
                event.origin,
              );
            }
          } else {
            // Format, paste, delete, indent - let toolbar handle via transformAction
            // Build transformAction based on transformType
            const transformAction = {
              type: event.data.transformType,
              requestId: event.data.requestId,
            };
            log('SLATE_TRANSFORM_REQUEST requestId:', event.data.requestId, 'data third child text:', JSON.stringify(event.data.data?.blocks?.[Object.keys(event.data.data?.blocks || {})[0]]?.value?.[0]?.children?.[2]?.text));
            // Add type-specific fields
            if (event.data.transformType === 'format') {
              transformAction.format = event.data.format;
            } else if (event.data.transformType === 'paste') {
              transformAction.html = event.data.html;
            } else if (event.data.transformType === 'delete') {
              transformAction.direction = event.data.direction;
            } else if (event.data.transformType === 'markdown') {
              transformAction.markdownType = event.data.markdownType;
              transformAction.blockType = event.data.blockType;
              transformAction.inlineType = event.data.inlineType;
            } else if (event.data.transformType === 'unwrapBlock') {
              transformAction.isFirstField = event.data.isFirstField;
              transformAction.isEmpty = event.data.isEmpty;
            }

            const bpmT0 = performance.now();
            const transformBpm = buildBlockPathMap(event.data.data, config.blocks.blocksConfig, intl);
            console.log('[VIEW-TIMING] buildBlockPathMap: ' + (performance.now() - bpmT0).toFixed(0) + 'ms, keys:', Object.keys(transformBpm).length);
            setIframeSyncState(prev => ({
              ...prev,
              formData: event.data.data,
              blockPathMap: transformBpm,
              selection: event.data.selection || null,
              _selectionSource: 'SLATE_TRANSFORM_REQUEST',
              transformAction: transformAction,
            }));
            console.log('[VIEW-TIMING] setIframeSyncState done +' + (performance.now() - (window._formatT0 || 0)).toFixed(0) + 'ms');
          }
          break;

        case 'SLATE_UNDO_REQUEST': {
          // Dispatch a synthetic Ctrl+Z event to trigger Volto's global undo manager
          const undoEvent = new KeyboardEvent('keydown', {
            key: 'z',
            ctrlKey: true,
            bubbles: true,
            cancelable: true,
          });
          document.dispatchEvent(undoEvent);
          break;
        }

        case 'SLATE_REDO_REQUEST': {
          // Dispatch a synthetic Ctrl+Y event to trigger Volto's global undo manager
          const redoEvent = new KeyboardEvent('keydown', {
            key: 'y',
            ctrlKey: true,
            bubbles: true,
            cancelable: true,
          });
          document.dispatchEvent(redoEvent);
          break;
        }

        case 'SAVE_REQUEST': {
          // Dispatch a synthetic Ctrl+S event to trigger Form.jsx save handler
          const saveEvent = new KeyboardEvent('keydown', {
            key: 's',
            ctrlKey: true,
            bubbles: true,
            cancelable: true,
          });
          document.dispatchEvent(saveEvent);
          break;
        }

        case 'ACTION_REQUEST': {
          // Generic action handler for custom operations like delete row/column
          const { action, blockId: actionBlockId } = event.data;
          const pathInfo = iframeSyncState.blockPathMap?.[actionBlockId];

          if (action === 'deleteColumn' && pathInfo?.parentAddMode === 'table') {
            // Delete column: remove cell at same index from ALL rows
            const newFormData = deleteTableColumn(properties, iframeSyncState.blockPathMap, actionBlockId);
            if (newFormData) {
              onChangeFormData(newFormData);
              // Select the parent row after column deletion
              if (pathInfo.parentId) {
                flushSync(() => {
                  setIframeSyncState((prev) => ({
                    ...prev,
                    pendingSelectBlockUid: pathInfo.parentId,
                  }));
                });
              }
            }
          } else if (action === 'deleteRow' && pathInfo?.addMode === 'table') {
            // Delete row: use standard block deletion
            const containerConfig = getContainerFieldConfig(actionBlockId, iframeSyncState.blockPathMap, properties, blocksConfig, intl);
            let newFormData = deleteBlockFromContainer(properties, iframeSyncState.blockPathMap, actionBlockId, containerConfig);
            if (newFormData && containerConfig) {
              // Ensure container has at least one row
              newFormData = ensureEmptyBlockIfEmpty(newFormData, containerConfig, iframeSyncState.blockPathMap, uuid, blocksConfig, { intl, metadata, properties });
              onChangeFormData(newFormData);
              // Select the parent table after row deletion
              if (pathInfo.parentId) {
                flushSync(() => {
                  setIframeSyncState((prev) => ({
                    ...prev,
                    pendingSelectBlockUid: pathInfo.parentId,
                  }));
                });
              }
            }
          }
          break;
        }

        case 'UPDATE_BLOCKS_LAYOUT':
          // Validate data from postMessage before using it
          validateAndLog(event.data.data, 'UPDATE_BLOCKS_LAYOUT', blockFieldTypes);
          onChangeFormData(event.data.data);
          break;

        case 'MOVE_BLOCKS': {
          // Handle drag-and-drop block moves (single or multi, supports containers)
          const { blockIds: moveBlockIds, targetBlockId, insertAfter, targetParentId } = event.data;
          log('MOVE_BLOCKS: received:', moveBlockIds?.length, 'blocks to', targetBlockId, 'insertAfter:', insertAfter);

          // Use properties (Redux) as source of truth for moves
          const currentFormData = properties;
          const currentBlockPathMap = buildBlockPathMap(currentFormData, config.blocks.blocksConfig, intl);

          // Expand template instances: each template instance drags all its child blocks
          const blocksToMove = [];
          for (const bid of (moveBlockIds || [])) {
            if (currentBlockPathMap[bid]?.isTemplateInstance) {
              const parentId = currentBlockPathMap[bid]?.parentId || 'page';
              const parentBlock = parentId === 'page' ? currentFormData : getBlockById(currentFormData, currentBlockPathMap, parentId);
              const containerField = currentBlockPathMap[bid]?.containerField || 'blocks_layout';
              const layoutItems = parentBlock?.[containerField]?.items || [];
              const childBlocks = layoutItems.filter(id => currentBlockPathMap[id]?.parentId === bid);
              log('MOVE_BLOCKS: template instance', bid, '- expanding to:', childBlocks);
              blocksToMove.push(...childBlocks);
            } else {
              blocksToMove.push(bid);
            }
          }

          // Derive sourceParentId from first block's pathMap entry
          const firstBlockId = blocksToMove[0];
          const sourceParentId = currentBlockPathMap[firstBlockId]?.parentId || null;

          // Get source container config BEFORE the move (needed for ensureEmptyBlockIfEmpty)
          const sourceContainerConfig = sourceParentId !== targetParentId && sourceParentId
            ? getContainerFieldConfig(firstBlockId, currentBlockPathMap, currentFormData, blocksConfig, intl)
            : null;

          // Check all block types are allowed in the target container
          const targetContainerCfg = getContainerFieldConfig(targetBlockId, currentBlockPathMap, currentFormData, blocksConfig, intl);
          const targetAllowedTypes = targetContainerCfg?.allowedBlocks;
          if (targetAllowedTypes?.length > 0) {
            const allAllowed = blocksToMove.every(bid => {
              const blockData = getBlockById(currentFormData, currentBlockPathMap, bid);
              return targetAllowedTypes.includes(blockData?.['@type']);
            });
            if (!allAllowed) {
              log('MOVE_BLOCKS: blocked — block types not allowed in target container');
              break;
            }
          }

          // Move all blocks in sequence, each one after the previous
          // Track insertAfter for each block (needed for template inheritance)
          let newFormData = currentFormData;
          let currentTarget = targetBlockId;
          let currentInsertAfter = insertAfter;
          const blockInsertAfterMap = {};

          for (let i = 0; i < blocksToMove.length; i++) {
            const moveBlockId = blocksToMove[i];
            blockInsertAfterMap[moveBlockId] = currentInsertAfter;
            const updatedPathMap = buildBlockPathMap(newFormData, config.blocks.blocksConfig, intl);

            newFormData = moveBlockBetweenContainers(
              newFormData,
              updatedPathMap,
              moveBlockId,
              currentTarget,
              currentInsertAfter,
              sourceParentId,
              targetParentId,
              blocksConfig,
              intl,
            );

            if (!newFormData) {
              log('MOVE_BLOCKS: moveBlockBetweenContainers failed for:', moveBlockId);
              break;
            }

            // After first block, subsequent blocks go after the previous one
            currentTarget = moveBlockId;
            currentInsertAfter = true;
          }
          log('MOVE_BLOCKS: moveBlockBetweenContainers returned:', newFormData ? 'formData' : 'null');

          if (newFormData) {
            // Apply defaults to moved blocks based on their new position
            // This updates template fields (templateId, templateInstanceId, slotId)
            // based on neighboring blocks at the new location
            let updatedPathMap = buildBlockPathMap(newFormData, config.blocks.blocksConfig, intl);
            for (const moveBlockId of blocksToMove) {
              const blockData = getBlockById(newFormData, updatedPathMap, moveBlockId);
              if (!blockData) continue;

              // Get container info for the new position
              const targetContainerConfig = getContainerFieldConfig(moveBlockId, updatedPathMap, newFormData, blocksConfig, intl);
              if (!targetContainerConfig) continue;

              const { parentId: containerId, fieldName: containerField } = targetContainerConfig;
              const containerPath = containerId === PAGE_BLOCK_UID ? [] : updatedPathMap[containerId]?.path;
              const container = containerPath ? getBlockByPath(newFormData, containerPath) : newFormData;
              const layoutItems = container?.[containerField]?.items || [];
              const position = layoutItems.indexOf(moveBlockId);

              // Apply defaults with context - this derives template fields from neighbors
              // insertAfter determines which neighbor's template membership to inherit
              const updatedBlockData = applyBlockDefaultsWithContext(blockData, {
                containerId,
                field: containerField,
                position,
                insertAfter: blockInsertAfterMap[moveBlockId],
                layoutItems,
                allBlocks: newFormData.blocks,
                blockPathMap: updatedPathMap,
                blocksConfig,
                intl,
              });

              // Update block if defaults changed it
              if (updatedBlockData !== blockData) {
                newFormData = updateBlockById(newFormData, updatedPathMap, moveBlockId, updatedBlockData);
                updatedPathMap = buildBlockPathMap(newFormData, config.blocks.blocksConfig, intl);
                log('MOVE_BLOCKS: Applied defaults to moved block:', moveBlockId, 'templateId:', updatedBlockData.templateId, 'slotId:', updatedBlockData.slotId);
              }
            }

            // If we moved to a different container, ensure source container has at least one block
            if (sourceParentId !== targetParentId && sourceContainerConfig) {
              newFormData = ensureEmptyBlockIfEmpty(
                newFormData,
                sourceContainerConfig,
                currentBlockPathMap,
                uuid,
                blocksConfig,
                { intl, metadata, properties: currentFormData },
              );
            }
            // Set pendingSelectBlockUid so the moved block stays selected after re-render
            // Rebuild blockPathMap to reflect the new block positions
            // Use flushSync to ensure state is committed before Redux update triggers useEffect
            // Do NOT set formData here - let the useEffect update it after sending FORM_DATA
            const newBlockPathMap = buildBlockPathMap(newFormData, config.blocks.blocksConfig, intl);
            flushSync(() => {
              setIframeSyncState(prev => ({
                ...prev,
                blockPathMap: newBlockPathMap,
                pendingSelectBlockUid: blocksToMove[0],
              }));
            });
            // Debug: Log column contents after move
            const col1AfterMove = newFormData?.blocks?.['columns-1']?.columns?.['col-1'];
            const col2AfterMove = newFormData?.blocks?.['columns-1']?.columns?.['col-2'];
            log('MOVE_BLOCKS: col-1 blocks_layout after move:', col1AfterMove?.blocks_layout?.items);
            log('MOVE_BLOCKS: col-2 blocks_layout after move:', col2AfterMove?.blocks_layout?.items);
            log('MOVE_BLOCKS: calling onChangeFormData');
            onChangeFormData(newFormData);
          }
          break;
        }

        case 'SELECTION_CHANGE':
          // Selection-only update (no text change) — safe because data is already in sync
          // Sent by hydra.js when selectionchange fires but text is unchanged (e.g., Ctrl+A, Shift+Arrow)
          setIframeSyncState(prev => {
            const newSelection = event.data.selection || null;
            if (JSON.stringify(prev.selection) === JSON.stringify(newSelection)) {
              return prev;
            }
            return { ...prev, selection: newSelection };
          });
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
          // Reject BLOCK_SELECTED with zero rect only for position updates of the SAME block
          // (this happens when block element is detached during frontend re-render)
          // For NEW block selection, allow zero rect - the block may be empty but we still need to select it
          const hasZeroRect = event.data.blockUid && (event.data.rect?.width === 0 || event.data.rect?.height === 0);
          const isSameBlock = selectedBlock === event.data.blockUid;
          if (hasZeroRect && isSameBlock) {
            log('[VIEW] Ignoring BLOCK_SELECTED with zero rect (element detached):', event.data.src);
            return;
          }
          // Only check selectedBlock - blockUI can be stale due to React's async state updates
          // When multiple BLOCK_SELECTED messages arrive rapidly (e.g., sidebar click + Escape),
          // blockUI may not have updated yet, causing onSelectBlock to be skipped incorrectly
          const isNewBlock = !isPositionUpdateOnly &&
                             selectedBlock !== event.data.blockUid;

          // Clear any pending selection - BLOCK_SELECTED from hydra.js is authoritative
          // The hydra.js domChange observer already checks blockUid === selectedBlockUid
          // before sending, so we don't need to filter here
          const pendingUid = iframeSyncState?.pendingSelectBlockUid;
          if (pendingUid) {
            log('BLOCK_SELECTED clearing pendingSelectBlockUid:', pendingUid);
            setIframeSyncState(prev => ({ ...prev, pendingSelectBlockUid: null }));
          }

          log('BLOCK_SELECTED received:', event.data.blockUid, 'src:', event.data.src, 'rect:', event.data.rect, 'isNewBlock:', isNewBlock, 'currentBlockUI:', blockUI?.blockUid, 'currentSelectedBlock:', selectedBlock);
          log(' BLOCK_SELECTED received:', event.data.blockUid, 'src:', event.data.src, 'rect:', event.data.rect);

          // Update lastSentSelectBlockRef to match iframe's selection
          // This is critical: when iframe confirms a selection, our ref must match
          // Otherwise, if we later try to select the same block the iframe already has,
          // we'll skip sending SELECT_BLOCK (thinking it's a duplicate) but the iframe
          // may have moved to a different selection in the meantime
          lastSentSelectBlockRef.current = event.data.blockUid;

          // --- Multi-block selection: set state and break (nothing else applies) ---
          if (event.data.isMultipleSelection) {
            const blockUids = event.data.blockUids || [];
            log('BLOCK_SELECTED multi-select:', blockUids.length, 'blocks');
            if (onSetMultiSelected) onSetMultiSelected(blockUids);
            setBlockUI({
              blockUid: blockUids[0],
              rect: event.data.rect,
              focusedFieldName: null,
              addDirection: 'bottom',
              editableFields: {},
              multiSelectedUids: blockUids,
              multiSelectRects: event.data.rects || {},
            });
            break;
          }

          // --- Single-block selection from here on ---
          // Clear multiSelected unless we're in selection mode (preserve during navigation)
          if (onSetMultiSelected && !selectionMode) onSetMultiSelected([]);
          if (isNewBlock) {
            log('BLOCK_SELECTED calling onSelectBlock:', event.data.blockUid);
            onSelectBlock(event.data.blockUid);
          }

          // Deselection: just call onSelectBlock(null) — skip blockUI/addability updates.
          // The selectedBlock useEffect will set blockUI to null.
          // Without this early return, setBlockUI({ blockUid: null }) creates a truthy
          // object that causes a brief intermediate render where the sidebar checks
          // blockUI (truthy) and renders block-level UI instead of page-level UI.
          if (!event.data.blockUid) {
            setBlockUI(null);
            break;
          }

          // Check if we can add/replace at this block - if so, open block chooser for empty blocks
          // This should happen on every click of an empty block, not just "new" selections
          // BlockChooser will dynamically decide to mutate vs insert based on selected block type
          // IMPORTANT: Rebuild blockPathMap from properties instead of using iframeSyncState.blockPathMap
          // because React state updates are async and the state may be stale when BLOCK_SELECTED arrives
          // shortly after a delete operation creates an empty block
          const currentBlockPathMap = buildBlockPathMap(properties, config.blocks.blocksConfig, intl);
          const selectedBlockData = getBlockById(properties, currentBlockPathMap, event.data.blockUid);
          const addability = getBlockAddability(event.data.blockUid, currentBlockPathMap, selectedBlockData, iframeSyncState.templateEditMode);
          if (addability.canReplace) {
            setAddNewBlockOpened(true);
          }

          // Now update blockUI state
          log(' About to call setBlockUI for:', event.data.blockUid);
          setBlockUI((prevBlockUI) => {
            // Skip update if nothing changed - prevents unnecessary toolbar redraws
            // IMPORTANT: Must compare mediaFields because they can change independently
            // (e.g., when an image is cleared, the placeholder div has different dimensions)
            const mediaFieldsChanged = JSON.stringify(prevBlockUI?.mediaFields) !== JSON.stringify(event.data.mediaFields);
            if (prevBlockUI &&
                prevBlockUI.blockUid === event.data.blockUid &&
                prevBlockUI.focusedFieldName === event.data.focusedFieldName &&
                prevBlockUI.focusedLinkableField === event.data.focusedLinkableField &&
                prevBlockUI.focusedMediaField === event.data.focusedMediaField &&
                prevBlockUI.addDirection === event.data.addDirection &&
                prevBlockUI.rect?.top === event.data.rect?.top &&
                prevBlockUI.rect?.left === event.data.rect?.left &&
                prevBlockUI.rect?.width === event.data.rect?.width &&
                prevBlockUI.rect?.height === event.data.rect?.height &&
                !mediaFieldsChanged) {
              // focusedFieldRect intentionally excluded — it changes during typing
              // (field height shifts) and re-renders from that cause perf issues.
              // The underline updates when other fields trigger a state change.
              return prevBlockUI; // Return same reference to skip re-render
            }
            // Note: Zero rect check happens earlier (before onSelectBlock) so we return before reaching here

            // Assert required fields - fail loudly if BLOCK_SELECTED is missing data
            // Only check when selecting a block (blockUid not null) - deselection doesn't need these
            if (event.data.blockUid && !event.data.addDirection) {
              console.error('[VIEW] BLOCK_SELECTED missing addDirection! src:', event.data.src, 'blockUid:', event.data.blockUid);
              throw new Error(`BLOCK_SELECTED missing addDirection (src: ${event.data.src})`);
            }
            // editableFields can be empty {} (block has no editable fields) but must be present
            if (event.data.blockUid && event.data.editableFields === undefined) {
              console.error('[VIEW] BLOCK_SELECTED missing editableFields! src:', event.data.src, 'blockUid:', event.data.blockUid);
              throw new Error(`BLOCK_SELECTED missing editableFields (src: ${event.data.src})`);
            }

            return {
              blockUid: event.data.blockUid,
              rect: event.data.rect,
              focusedFieldName: event.data.focusedFieldName, // Track which editable field is focused
              focusedFieldRect: event.data.focusedFieldRect, // Rect of focused field for underline positioning
              focusedLinkableField: event.data.focusedLinkableField, // Track which linkable field is focused
              focusedMediaField: event.data.focusedMediaField, // Track which media field is focused
              editableFields: event.data.editableFields, // Map of fieldName -> fieldType from iframe
              linkableFields: event.data.linkableFields, // Map of fieldName -> true for link fields
              mediaFields: event.data.mediaFields, // Map of fieldName -> true for image/media fields
              addDirection: event.data.addDirection, // Direction for add button positioning
              isMultiElement: event.data.isMultiElement, // True if block renders as multiple DOM elements
              selectionModeRects: event.data.selectionModeRects,
            };
          });
          // Set selection from BLOCK_SELECTED - this ensures block and selection are atomic
          // Only update selection if EXPLICITLY provided in the message
          // Position-only updates (rect changes) don't include selection - preserve existing
          if (event.data.selection !== undefined) {
            setIframeSyncState(prev => {
              const newSelection = event.data.selection || null;
              if (JSON.stringify(prev.selection) === JSON.stringify(newSelection)) {
                return prev; // Skip re-render if selection unchanged
              }
              return { ...prev, selection: newSelection };
            });
          }
          break;
        }

        case 'HIDE_BLOCK_UI':
          // Hide block UI overlays temporarily (during scroll/resize)
          // Don't deselect the block - just hide the visual overlays
          // The block will be re-shown when BLOCK_SELECTED is sent after scroll stops
          setBlockUI(null);
          // Don't call onSelectBlock(null) - keep the block selected in Redux
          break;

        case 'MOUSE_ACTIVITY':
          // Throttled mousemove from iframe — reset toolbar fade timer
          setMouseActivityCounter(c => c + 1);
          break;

        case 'INIT': {
          // Combined initialization: merge config first, then send data
          // This ensures blockPathMap is built with complete schema knowledge
          iframeOriginRef.current = event.origin;

          // Check if iframe navigated to a different page (e.g., user clicked nav link)
          // User confirmed beforeunload warning, so they're leaving edit mode
          if (event.data.currentPath) {
            // Strip the iframe's base path prefix from the reported path
            // e.g., iframe at /edit/about → content path /about
            const iframeBasePath = u ? new URL(u).pathname.replace(/\/$/, '') : '';
            let contentPath = event.data.currentPath;
            if (iframeBasePath && contentPath.startsWith(iframeBasePath)) {
              contentPath = contentPath.slice(iframeBasePath.length) || '/';
            }
            const adminPath = history.location.pathname.replace(/\/edit$/, '') || '/';
            if (contentPath !== adminPath) {
              log('INIT: iframe navigated to different page, following to view mode:', contentPath, '(raw:', event.data.currentPath, ', base:', iframeBasePath, ')');
              // Update persistedIframe BEFORE history.push so useEffect won't reload iframe
              persistedIframe = { frontendUrl: u, path: contentPath, isEdit: false };
              history.push(contentPath);
              return; // Don't send INITIAL_DATA - admin will re-render with new page
            }
          }

          // 1. Merge custom block definitions from event.data.blocks
          const blocksConfig = event.data.blocks;
          if (blocksConfig) {
            // Inject NoPreview view for frontend blocks that don't have one
            // Also ensure blockSchema has fieldsets if properties exist (for new blocks only)
            Object.keys(blocksConfig).forEach((blockType) => {
              const blockConfig = blocksConfig[blockType];
              if (!blockConfig) return;
              // Ensure id matches the key
              if (!blockConfig.id) {
                blockConfig.id = blockType;
              }
              // Default title from the key name (e.g. 'single_choice' -> 'Single Choice')
              if (!blockConfig.title) {
                blockConfig.title = blockType.replace(/[_-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
              }
              if (!blockConfig.view) {
                blockConfig.view = NoPreview;
              }
              // Default group to 'common' so blocks appear in the block chooser
              if (!blockConfig.group) {
                blockConfig.group = 'common';
              }
              // Show sidebar settings tab when block has a schema
              if (blockConfig.blockSchema && blockConfig.sidebarTab === undefined) {
                blockConfig.sidebarTab = 1;
              }
              // Auto-generate default fieldset if missing (only for new blocks, not overrides)
              // Also ensure required is an array (Volto expects this)
              // Recurse into object_list inner schemas too (Volto's InlineForm needs fieldsets).
              const schema = blockConfig?.blockSchema;
              const isNewBlock = !config.blocks.blocksConfig[blockType];
              if (isNewBlock && schema?.properties && !schema.fieldsets) {
                schema.fieldsets = [{
                  id: 'default',
                  title: 'Default',
                  fields: Object.keys(schema.properties),
                }];
              }
              if (schema && !schema.required) {
                schema.required = [];
              }
              // Auto-generate fieldsets on nested object_list inner schemas
              if (schema?.properties) {
                Object.values(schema.properties).forEach((prop) => {
                  if (prop?.widget === 'object_list' && prop?.schema?.properties && !prop.schema.fieldsets) {
                    prop.schema.fieldsets = [{
                      id: 'default',
                      title: 'Default',
                      fields: Object.keys(prop.schema.properties),
                    }];
                  }
                  if (prop?.widget === 'object_list' && prop?.schema && !prop.schema.required) {
                    prop.schema.required = [];
                  }
                });
              }
              // Validate fieldMappings: warn about invalid @default keys
              validateFieldMappings(blockType, blockConfig);
            });
            // Save existing function-type schemaEnhancers before deepMerge overwrites them.
            // When the frontend sends a recipe object for a block that already has a function
            // enhancer (e.g., listing's fieldMapping/b_size logic from our plugin), deepMerge
            // would corrupt the function. We chain them back in step 1b.
            const savedEnhancers = {};
            for (const blockType of Object.keys(blocksConfig)) {
              const existing = config.blocks.blocksConfig[blockType]?.schemaEnhancer;
              if (typeof existing === 'function') {
                savedEnhancers[blockType] = existing;
              }
            }
            recurseUpdateVoltoConfig({ blocks: { blocksConfig } });

            // 1b. Create schemaEnhancers from frontend recipes
            // When the frontend sends a recipe (e.g., { inheritSchemaFrom: {...} }),
            // chain it with any existing function enhancer from admin plugins (e.g., listing's
            // fieldMapping/b_size removal) rather than replacing it.
            const recipeKeys = ['inheritSchemaFrom', 'childBlockConfig', 'fieldRules'];
            for (const [blockType, blockConfig] of Object.entries(blocksConfig)) {
              const recipe = blockConfig.schemaEnhancer;
              // Check if it's a recipe (has known enhancer keys, type property, or is array)
              const isRecipe =
                recipe &&
                typeof recipe === 'object' &&
                (recipe.type || // legacy format
                  Array.isArray(recipe) || // array of recipes
                  recipeKeys.some((key) => key in recipe)); // new format
              if (isRecipe) {
                // Pass savedEnhancer so createSchemaEnhancerFromRecipe can detect
                // overlapping enhancerTypes (via .config.enhancerType) and skip
                // duplicates while preserving the admin's extra logic.
                const enhancer = createSchemaEnhancerFromRecipe(
                  recipe, savedEnhancers[blockType],
                );
                if (enhancer) {
                  config.blocks.blocksConfig[blockType].schemaEnhancer = enhancer;
                } else {
                  // Remove invalid recipe to prevent Volto from trying to use it
                  delete config.blocks.blocksConfig[blockType].schemaEnhancer;
                }
              }
            }
          }

          // 1c. Merge any additional voltoConfig (non-block settings)
          if (event.data.voltoConfig) {
            recurseUpdateVoltoConfig(event.data.voltoConfig);
          }

          // 2. Process page schema — page.schema.properties is an object keyed by fieldName
          // Default: { blocks_layout: { title: 'Blocks' } }
          const pageProperties = event.data.page?.schema?.properties || {};
          const pageBlocksFieldsDef = { ...pageProperties };
          if (!pageBlocksFieldsDef.blocks_layout) {
            pageBlocksFieldsDef.blocks_layout = { title: 'Blocks' };
          }
          // Ensure each field has widget: 'blocks_layout'
          for (const [fieldName, fieldDef] of Object.entries(pageBlocksFieldsDef)) {
            pageBlocksFieldsDef[fieldName] = {
              widget: 'blocks_layout',
              allowedBlocks: fieldDef.allowedBlocks || null,
              allowedTemplates: fieldDef.allowedTemplates || null,
              allowedLayouts: fieldDef.allowedLayouts || null,
              maxLength: fieldDef.maxLength || null,
              title: fieldDef.title || fieldName,
            };
          }

          // 2b. Apply restrictions based on page fields
          // Collect all unique allowed blocks across all page fields and restrict the rest
          const allAllowedBlocks = new Set();
          for (const fieldDef of Object.values(pageBlocksFieldsDef)) {
            if (fieldDef.allowedBlocks) {
              fieldDef.allowedBlocks.forEach(blockType => allAllowedBlocks.add(blockType));
            }
          }
          if (allAllowedBlocks.size > 0) {
            validateFrontendConfig({ allowedBlocks: [...allAllowedBlocks] }, config.blocks.blocksConfig);
            Object.keys(config.blocks.blocksConfig).forEach((blockType) => {
              const blockConfig = config.blocks.blocksConfig[blockType];
              if (blockConfig && !allAllowedBlocks.has(blockType)) {
                const existingRestricted = blockConfig.restricted;
                if (typeof existingRestricted !== 'function') {
                  blockConfig.restricted = true;
                }
              }
            });
            setAllowedBlocksList([...allAllowedBlocks]);
          }

          // 2c. Auto-initialize missing page fields with empty blocks/layout
          let formWithPageFields = form ? { ...form } : form;
          if (form) {
            if (!formWithPageFields.blocks) {
              formWithPageFields.blocks = {};
            }
            for (const fieldName of Object.keys(pageBlocksFieldsDef)) {
              if (!formWithPageFields[fieldName]) {
                formWithPageFields[fieldName] = { items: [] };
              }
            }
          }

          // 3. Register _page as virtual block type in blocksConfig
          // Merge content-type field definitions (title, description, etc.) alongside
          // blocks_layout fields so buildBlockPathMap includes them in resolvedBlockSchema.
          // This lets hydra.js derive page-level field types from blockPathMap['_page'].
          const contentTypeFields = schema?.properties || {};
          // Add placeholders for common page-level fields
          if (contentTypeFields.title && !contentTypeFields.title.placeholder) {
            contentTypeFields.title = { ...contentTypeFields.title, placeholder: intl.formatMessage({ id: 'Type the title…', defaultMessage: 'Type the title…' }) };
          }
          if (contentTypeFields.description && !contentTypeFields.description.placeholder) {
            contentTypeFields.description = { ...contentTypeFields.description, placeholder: intl.formatMessage({ id: 'Add a description…', defaultMessage: 'Add a description…' }) };
          }
          config.blocks.blocksConfig['_page'] = {
            id: '_page',
            schema: () => ({ properties: { ...contentTypeFields, ...pageBlocksFieldsDef } }),
            restricted: true, // Can't be added as a child block
          };

          // 3b. Register template URLs as virtual block types
          for (const fieldDef of Object.values(pageBlocksFieldsDef)) {
            if (fieldDef.allowedTemplates?.length > 0) {
              fieldDef.allowedTemplates.forEach(templateUrl => {
                if (typeof templateUrl === 'string') {
                  const templateName = templateUrl.split('/').filter(Boolean).pop() || 'unknown';
                  const templateBlockType = `Template: ${templateName}`;

                  // Register template as virtual block type (data fetched on selection)
                  if (!config.blocks.blocksConfig[templateBlockType]) {
                    config.blocks.blocksConfig[templateBlockType] = {
                      id: templateBlockType,
                      title: templateBlockType, // Full title with "Template:" prefix for sidebar display
                      icon: config.blocks.blocksConfig.slate?.icon,
                      isTemplate: true,
                      templateUrl: templateUrl, // URL to fetch when selected
                      group: 'templates',
                      restricted: false,
                    };
                  }
                }
              });
            }
          }

          // 4. Extract block field types (now includes custom blocks and page-level fields)
          const initialBlockFieldTypes = extractBlockFieldTypes(intl, schema);
          setBlockFieldTypes(initialBlockFieldTypes);

          // 5. Build blockPathMap (now has complete schema knowledge from _page registration)
          let initialBlockPathMap = buildBlockPathMap(
            formWithPageFields,
            config.blocks.blocksConfig,
            intl,
          );

          // 5b. Ensure empty page blocks fields have at least one empty block
          // No fieldName = process ALL page-level container fields (blocks, footer_blocks, etc.)
          const preEnsureForm = formWithPageFields;
          formWithPageFields = ensureEmptyBlockIfEmpty(
            formWithPageFields,
            { parentId: PAGE_BLOCK_UID },
            initialBlockPathMap,
            uuid,
            config.blocks.blocksConfig,
            { intl, metadata, properties: formWithPageFields },
          );
          // Rebuild blockPathMap only if empty blocks were actually added
          if (formWithPageFields !== preEnsureForm) {
            initialBlockPathMap = buildBlockPathMap(
              formWithPageFields,
              config.blocks.blocksConfig,
              intl,
            );
          }

          // 6. Apply schema defaults (handles schemaEnhancer-computed defaults like fieldMapping)
          const formWithDefaults = applySchemaDefaultsToFormData(
            formWithPageFields,
            initialBlockPathMap,
            config.blocks.blocksConfig,
            intl,
          );

          setIframeSyncState(prev => ({
            ...prev,
            formData: formWithDefaults,
            blockPathMap: initialBlockPathMap,
          }));

          // 7. Send everything to iframe (only in edit mode)
          // In view mode, frontend renders from its own API - no need to send data
          const inEditMode = history.location.pathname.endsWith('/edit');
          if (!inEditMode) {
            log('INIT: view mode, skipping INITIAL_DATA');
            break;
          }
          if (!form) {
            log('INIT: form data not available yet, skipping INITIAL_DATA');
            break;
          }

          // 8. Always go through sync effect for template merge
          // Even if no templates in data, there might be forced layouts from allowedLayouts
          const templateIds = getUniqueTemplateIds(formWithDefaults);
          const unloadedTemplates = templateIds.filter(id => templateCacheRef.current[id] === undefined);

          if (unloadedTemplates.length > 0) {
            log('[INIT] Templates need loading, deferring INITIAL_DATA');
          } else {
            log('[INIT] No templates to load, but still merging for allowedLayouts');
          }

          // Store pending data for effect to merge and send
          pendingInitialDataRef.current = {
            source: event.source,
            origin: event.origin,
            // Store prepared formData with empty blocks already added
            formData: formWithDefaults,
            blockPathMap: initialBlockPathMap,
          };
          // Trigger the sync effect to fetch templates (if any) and merge
          setTemplateSyncTrigger(prev => prev + 1);
          break;
        }

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

  // UNIFIED FORM SYNC: Syncs iframeSyncState AND sends FORM_DATA to iframe
  // Triggers when Form's properties change or toolbar completes a format operation
  useEffect(() => {
    const useEffectT0 = performance.now();
    let formToUse = properties || form;

    // Skip if this is an echo from INLINE_EDIT_DATA we just processed
    if (processedInlineEditCounterRef.current < inlineEditCounterRef.current) {
      processedInlineEditCounterRef.current += 1;
      return;
    }

    // Case 1: Toolbar completed a format operation
    if (iframeSyncState.toolbarRequestDone) {
      console.log('[VIEW-TIMING] Case 1 start, toolbarRequestDone:', iframeSyncState.toolbarRequestDone, '+' + (performance.now() - (window._formatT0 || 0)).toFixed(0) + 'ms');
      // Increment edit sequence for toolbar operations too
      editSequenceRef.current++;
      let toolbarFormData = iframeSyncState.formData;
      // Always build blockPathMap from the form data being sent
      let toolbarBlockPathMap = iframeSyncState.blockPathMap && Object.keys(iframeSyncState.blockPathMap).length > 0
        ? iframeSyncState.blockPathMap
        : buildBlockPathMap(toolbarFormData || formToUse, config.blocks.blocksConfig, intl);
      // Split any multi-node slate blocks before sending to iframe
      const toolbarSplit = splitMultiNodeSlateBlocks(toolbarFormData, toolbarBlockPathMap, config.blocks.blocksConfig, uuid, iframeSyncState.selection);
      if (toolbarSplit) {
        toolbarFormData = toolbarSplit.formData;
        toolbarBlockPathMap = buildBlockPathMap(toolbarFormData, config.blocks.blocksConfig, intl);
        if (toolbarSplit.selectBlockId) {
          flushSync(() => {
            setIframeSyncState(prev => ({
              ...prev,
              selection: toolbarSplit.selection || prev.selection,
              pendingSelectBlockUid: toolbarSplit.selectBlockId,
            }));
          });
        }
      }
      const formWithSequence = {
        ...toolbarFormData,
        _editSequence: editSequenceRef.current,
      };
      const skipRender = iframeSyncState.skipRenderOnSend;
      const message = {
        type: 'FORM_DATA',
        data: formWithSequence,
        blockPathMap: stripBlockPathMapForPostMessage(toolbarBlockPathMap),
        formatRequestId: iframeSyncState.toolbarRequestDone,
      };
      // When a split created new blocks, tell the iframe which block to select
      if (toolbarSplit?.selectBlockId) {
        message.selectedBlockUid = toolbarSplit.selectBlockId;
        if (toolbarSplit.selection) {
          message.transformedSelection = toolbarSplit.selection;
        }
      } else if (iframeSyncState.selection) {
        message.transformedSelection = iframeSyncState.selection;
      }
      // When data didn't change (e.g. link cancel), tell iframe to skip
      // re-render — just unblock and restore selection/focus.
      if (skipRender) {
        message.skipRender = true;
      }
      message._sentAt = Date.now();
      console.log('[VIEW-TIMING] FORM_DATA prepared +' + (performance.now() - (window._formatT0 || 0)).toFixed(0) + 'ms (useEffect overhead: ' + (performance.now() - useEffectT0).toFixed(0) + 'ms), blockPathMap keys:', Object.keys(message.blockPathMap || {}).length);
      log('Sending FORM_DATA (Case 1: toolbar) formatRequestId:', message.formatRequestId,
        '_editSequence:', editSequenceRef.current, 'skipRender:', !!skipRender,
        'blockPathMap keys:', Object.keys(message.blockPathMap || {}),
        'cachedBPM keys:', Object.keys(iframeSyncState.blockPathMap || {}));
      const iframeEl = document.getElementById('previewIframe');
      let msgSize;
      try { msgSize = JSON.stringify(message).length; } catch { msgSize = -1; }
      // One-time payload breakdown
      if (!window._payloadLogged && message.formatRequestId) {
        window._payloadLogged = true;
        try {
          const dataSize = JSON.stringify(message.data).length;
          const bpmSize = JSON.stringify(message.blockPathMap).length;
          const schemasSize = message.blockPathMap._schemas ? JSON.stringify(message.blockPathMap._schemas).length : 0;
          const uniqueSchemas = message.blockPathMap._schemas ? Object.keys(message.blockPathMap._schemas).length : 0;
          console.log('[PAYLOAD] total:', (msgSize/1024).toFixed(0) + 'KB',
            'data:', (dataSize/1024).toFixed(0) + 'KB',
            'blockPathMap:', (bpmSize/1024).toFixed(0) + 'KB',
            'unique schemas:', uniqueSchemas, '(' + (schemasSize/1024).toFixed(0) + 'KB)');
        } catch (e) {
          console.log('[PAYLOAD] total:', (msgSize/1024).toFixed(0) + 'KB (detail error:', e.message + ')');
        }
      }
      message._sentAt = Date.now();
      const postT0 = performance.now();
      iframeEl?.contentWindow?.postMessage(
        message,
        iframeOriginRef.current,
      );
      console.log('[VIEW-TIMING] postMessage call took', (performance.now() - postT0).toFixed(1) + 'ms, payload:', (msgSize / 1024).toFixed(0) + 'KB');
      // Strip _editSequence from Redux - sequences are for iframe echo detection only.
      // Keeping them in Redux causes sidebar edits to inherit stale sequences.
      const { _editSequence: _, ...formWithoutSeq } = formWithSequence;
      // Use flushSync to ensure BOTH state updates commit before any pending re-renders
      // This prevents race condition where Redux update triggers Case 2 with stale properties
      // NOTE: flushSync may warn "cannot flush when already rendering" but still works
      flushSync(() => {
        setIframeSyncState(prev => ({ ...prev, toolbarRequestDone: null, skipRenderOnSend: false, formData: formWithSequence }));
        onChangeFormData(formWithoutSeq);
      });
      // Focus iframe AFTER flushSync — React has finished all synchronous
      // renders so nothing will steal focus. The iframe-side field focus is
      // handled by restoreSlateSelection in afterContentRender.
      if (iframeEl && message.formatRequestId) {
        iframeEl.focus();
      }
      return;
    }

    // INITIAL_DATA sending - consolidated to this ONE place
    // Handles: no templates, templates loading, templates already cached
    if (pendingInitialDataRef.current) {
      const { source, origin, formData: preparedFormData, blockPathMap: preparedBlockPathMap } = pendingInitialDataRef.current;
      const templateIds = getUniqueTemplateIds(preparedFormData);
      const unloadedTemplates = templateIds.filter(id => templateCacheRef.current[id] === undefined);

      if (unloadedTemplates.length === 0) {
        // No templates to load - but still need to merge for forced layouts
        log('[INITIAL_DATA] No templates to load, merging for forced layouts');
        const toolbarButtons = config.settings.slate?.toolbarButtons || [];

        // Get pageBlocksFields from config (set during INIT)
        const pageBlocksFields = config.blocks.blocksConfig['_page']?.schema?.()?.properties || {};

        // Always call mergeTemplatesIntoPage - it handles all cases:
        // - No templates/layouts: returns data unchanged
        // - Has templates: merges them
        // - Has forced layouts: applies them
        const api = new Api();

        (async () => {
          // Create loadTemplate that uses cache and falls back to API
          const loadTemplate = async (templateId) => {
            if (templateCacheRef.current[templateId]) {
              return templateCacheRef.current[templateId];
            }
            // Load from API and cache
            const template = await api.get(templateId);
            templateCacheRef.current[templateId] = template;
            return template;
          };

          // Merge templates with forced layouts
          const { merged: mergedFormData } = await mergeTemplatesIntoPage(preparedFormData, {
            loadTemplate,
            preloadedTemplates: templateCacheRef.current,
            pageBlocksFields,
            uuidGenerator: uuid,
            blocksConfig: config.blocks.blocksConfig,
            intl,
          });
          let blockPathMap = buildBlockPathMap(mergedFormData, config.blocks.blocksConfig, intl);

          // Ensure empty page blocks fields have at least one empty block (template merge may add containers)
          let formDataToSend = ensureEmptyBlockIfEmpty(
            mergedFormData,
            { parentId: PAGE_BLOCK_UID },
            blockPathMap,
            uuid,
            config.blocks.blocksConfig,
            { intl, metadata, properties: mergedFormData },
          );
          if (formDataToSend !== mergedFormData) {
            blockPathMap = buildBlockPathMap(formDataToSend, config.blocks.blocksConfig, intl);
          }

          // Update Redux with merged data
          onChangeFormData(mergedFormData);

          source.postMessage({
            type: 'INITIAL_DATA',
            data: formDataToSend,
            blockPathMap: stripBlockPathMapForPostMessage(blockPathMap),
            selectedBlockUid: selectedBlock,
            slateConfig: { hotkeys: config.settings.slate?.hotkeys || {}, toolbarButtons },
          }, origin);
          pendingInitialDataRef.current = null;
        })().catch(err => {
          log('[INITIAL_DATA] ERROR in forced-layout merge:', err.message, err.stack);
          console.error('[INITIAL_DATA] Error (forced-layout):', err);
        });
        return;
      }

      // Templates need loading - fetch them
      const api = new Api();

      (async () => {
        const newTemplates = {};

        await Promise.all(
          unloadedTemplates.map(async (templateId) => {
            try {
              const template = await api.get(templateId);
              newTemplates[templateId] = template;
            } catch (error) {
              console.warn(`[INITIAL_DATA] Failed to fetch template ${templateId}:`, error.status || error);
              templateCacheRef.current[templateId] = null;
            }
          }),
        );

        // Re-check pending ref - it might have been cleared if user navigated away
        if (!pendingInitialDataRef.current) {
          return;
        }

        const { source, origin, formData: baseFormData } = pendingInitialDataRef.current;
        const toolbarButtons = config.settings.slate?.toolbarButtons || [];

        // Update template cache
        templateCacheRef.current = { ...templateCacheRef.current, ...newTemplates };

        // Create loadTemplate that uses cache and falls back to API
        const loadTemplate = async (templateId) => {
          if (templateCacheRef.current[templateId]) {
            return templateCacheRef.current[templateId];
          }
          // Load from API and cache
          const template = await api.get(templateId);
          templateCacheRef.current[templateId] = template;
          return template;
        };

        // Get pageBlocksFields from config (set during INIT)
        const pageBlocksFields = config.blocks.blocksConfig['_page']?.schema?.()?.properties || {};

        // Merge templates (both newly fetched and already cached) with forced layouts
        const { merged: mergedFormData, newTemplateIds: moreTemplateIds } = await mergeTemplatesIntoPage(baseFormData, {
          loadTemplate,
          preloadedTemplates: templateCacheRef.current,
          pageBlocksFields,
          uuidGenerator: uuid,
          blocksConfig: config.blocks.blocksConfig,
          intl,
        });
        if (moreTemplateIds.length > 0) {
          log('[INITIAL_DATA] Discovered nested templates:', moreTemplateIds);
          // TODO: Load nested templates and merge again
        }

        // Build blockPathMap and ensure empty blocks
        let blockPathMap = buildBlockPathMap(mergedFormData, config.blocks.blocksConfig, intl);
        let formDataToSend = ensureEmptyBlockIfEmpty(
          mergedFormData,
          { parentId: PAGE_BLOCK_UID },
          blockPathMap,
          uuid,
          config.blocks.blocksConfig,
          { intl, metadata, properties: mergedFormData },
        );
        if (formDataToSend !== mergedFormData) {
          blockPathMap = buildBlockPathMap(formDataToSend, config.blocks.blocksConfig, intl);
        }

        // Send INITIAL_DATA
        source.postMessage({
          type: 'INITIAL_DATA',
          data: formDataToSend,
          blockPathMap: stripBlockPathMapForPostMessage(blockPathMap),
          selectedBlockUid: selectedBlock,
          slateConfig: { hotkeys: config.settings.slate?.hotkeys || {}, toolbarButtons },
        }, origin);
        pendingInitialDataRef.current = null;

        // Update Redux with merged data (without empty block additions - those are UI-only)
        onChangeFormData(mergedFormData);
      })().catch(err => {
        log('[INITIAL_DATA] ERROR in template loading/merge:', err.message, err.stack);
        console.error('[INITIAL_DATA] Error:', err);
      });

      return; // Don't continue to Case 2 while templates are loading
    }

    // Case 2: Form properties changed (sidebar edit, block add, etc.)
    if (!formToUse || !iframeOriginRef.current) {
      return;
    }

    // Build blockPathMap first - needed for applying defaults to nested blocks
    let newBlockPathMap = buildBlockPathMap(formToUse, config.blocks.blocksConfig, intl);

    // Split any slate blocks that have multiple top-level nodes.
    // This happens when the deleteBackward extension demotes a list item
    // to a paragraph, producing [ul, p] — two top-level nodes in one block.
    // Each top-level node becomes its own block.
    const splitResult = splitMultiNodeSlateBlocks(formToUse, newBlockPathMap, config.blocks.blocksConfig, uuid, iframeSyncState.selection);
    if (splitResult) {
      formToUse = splitResult.formData;
      newBlockPathMap = buildBlockPathMap(formToUse, config.blocks.blocksConfig, intl);
      // Select the new block that received the split content
      if (splitResult.selectBlockId) {
        flushSync(() => {
          setIframeSyncState(prev => ({
            ...prev,
            selection: splitResult.selection || prev.selection,
            pendingSelectBlockUid: splitResult.selectBlockId,
          }));
        });
      }
      // Update Redux so the split persists
      onChangeFormData(formToUse);
    }

    // Apply schema defaults BEFORE equality check (handles schemaEnhancer-computed defaults)
    // This ensures fields like fieldMapping get smart defaults even on initial load.
    // IMPORTANT: Must apply before equality check so we compare apples-to-apples
    // (both formWithDefaults and iframeSyncState.formData have defaults applied)
    const formWithDefaults = applySchemaDefaultsToFormData(
      formToUse,
      newBlockPathMap,
      config.blocks.blocksConfig,
      intl,
    );

    // Also skip if content is identical (ignoring _editSequence metadata)
    // Compare defaults-applied versions to avoid infinite loops
    if (formDataContentEqual(formWithDefaults, iframeSyncState.formData)) {
      return;
    }

    // Validate selection (may be stale after document structure changes)
    let newSelection = iframeSyncState.selection;
    if (selectedBlock && iframeSyncState.selection) {
      const block = getBlockById(formToUse, newBlockPathMap, selectedBlock);
      const slateValue = block?.value;
      if (slateValue && !isSelectionValidForValue(iframeSyncState.selection, slateValue)) {
        log('Selection invalid for new form data, clearing');
        newSelection = null;
      }
    }

    const hasPendingSelect = !!iframeSyncState.pendingSelectBlockUid;
    const hasPendingFormatRequest = !!iframeSyncState.pendingFormatRequestId;

    // Always increment sequence - useEffect only runs when properties change
    // The sequence is used to detect stale iframe echoes
    editSequenceRef.current++;

    // Add _editSequence to form data for round-trip tracking
    const formWithSequence = {
      ...formWithDefaults,
      _editSequence: editSequenceRef.current,
    };

    // Update local state
    // NOTE: Do NOT clear pendingSelectBlockUid here - keep it set until BLOCK_SELECTED
    // is received for that block. This prevents race conditions where another block
    // (e.g., parent container) gets selected during re-render and we send SELECT_BLOCK for it.
    log('PROPS_SYNC: overwriting iframeSyncState. prev.selection:', JSON.stringify(iframeSyncState.selection?.anchor?.path), 'newSelection:', JSON.stringify(newSelection?.anchor?.path), 'prevSource:', iframeSyncState._selectionSource);
    setIframeSyncState(prev => ({
      ...prev,
      formData: formWithSequence,
      blockPathMap: newBlockPathMap,
      selection: newSelection,
      _selectionSource: 'PROPS_SYNC',
      ...(hasPendingFormatRequest ? { pendingFormatRequestId: null } : {}),
      pendingTransformedSelection: null,
    }));

    // Send updated data to iframe (duplicates already filtered above)
    // Only include selectedBlockUid when there's a pending selection to avoid
    // clearing the iframe's selection with a null value from subsequent FORM_DATA
    const message = {
      type: 'FORM_DATA',
      data: formWithSequence,
      blockPathMap: stripBlockPathMapForPostMessage(newBlockPathMap),
      ...(hasPendingSelect ? { selectedBlockUid: iframeSyncState.pendingSelectBlockUid } : {}),
      ...(hasPendingFormatRequest ? { formatRequestId: iframeSyncState.pendingFormatRequestId } : {}),
      ...(iframeSyncState.pendingTransformedSelection ? { transformedSelection: iframeSyncState.pendingTransformedSelection } : {}),
    };
    log('Sending FORM_DATA to iframe. blockPathMap keys:', Object.keys(newBlockPathMap), 'selectedBlockUid:', hasPendingSelect ? iframeSyncState.pendingSelectBlockUid : '(not sent)', '_editSequence:', editSequenceRef.current);
    document.getElementById('previewIframe')?.contentWindow?.postMessage(
      message,
      iframeOriginRef.current,
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [properties, iframeSyncState.toolbarRequestDone, templateSyncTrigger]);

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


  // Get parentContainerConfig for the selected block
  // - Used for adding siblings AFTER the selected block (iframe add)
  // NOTE: We use config.blocks.blocksConfig directly (not blocksConfig prop) because
  // the config is mutated when INIT is received with frontend's custom blocksConfig.
  // The iframeSyncState.blockPathMap dependency ensures re-compute after INIT.
  const parentContainerConfig = useMemo(() => {
    if (!selectedBlock || !iframeSyncState.blockPathMap) {
      return null;
    }

    // Use merged config from registry (includes frontend's custom blocks after INIT)
    const mergedBlocksConfig = config.blocks.blocksConfig;

    return getContainerFieldConfig(
      selectedBlock,
      iframeSyncState.blockPathMap,
      iframeSyncState.formData,
      mergedBlocksConfig,
      intl,
    );
  }, [selectedBlock, iframeSyncState.blockPathMap, iframeSyncState.formData, intl]);

  // Filter allowedBlocks by parent's variation if inheritSchemaFrom with blocksField is configured
  // This ensures new blocks match the parent's item type selection (container use case)
  const filterByParentVariation = useCallback((rawAllowedBlocks, parentBlockData, parentType) => {
    if (!rawAllowedBlocks || !parentBlockData || !parentType) {
      return rawAllowedBlocks;
    }
    const parentBlockConfig = config.blocks.blocksConfig?.[parentType];
    const schemaEnhancer = parentBlockConfig?.schemaEnhancer;
    // Handle both function (with .config) and recipe object (with .inheritSchemaFrom)
    const schemaEnhancerConfig = typeof schemaEnhancer === 'function'
      ? schemaEnhancer.config
      : schemaEnhancer?.inheritSchemaFrom;
    const typeField = schemaEnhancerConfig?.typeField;
    const blocksField = schemaEnhancerConfig?.blocksField;

    // Only filter when blocksField is set and not '..' (container use case)
    // Listing use case (blocksField: '..') doesn't need BlockChooser filtering
    if (!blocksField || blocksField === '..' || !typeField) {
      return rawAllowedBlocks;
    }

    const variationValue = parentBlockData?.[typeField];
    // If parent has a variation set and it's in allowedBlocks, filter to just that type
    if (variationValue && rawAllowedBlocks.includes(variationValue)) {
      return [variationValue];
    }
    return rawAllowedBlocks;
  }, []);

  // Iframe add: adds AFTER the selected block (as sibling)
  // Uses parentContainerConfig.allowedBlocks, or page-level allowedBlocks
  // Filtered by parent's variation if inheritSchemaFrom is configured
  const iframeAllowedBlocks = useMemo(() => {
    let allowed = allowedBlocks;
    if (parentContainerConfig?.allowedBlocks) {
      allowed = parentContainerConfig.allowedBlocks;
    }
    // Get parent block data for variation filtering
    const afterBlockId = selectedBlock;
    const parentId = iframeSyncState.blockPathMap?.[afterBlockId]?.parentId;
    if (parentId) {
      const parentBlockData = getBlockByPath(properties, iframeSyncState.blockPathMap?.[parentId]?.path);
      const parentType = iframeSyncState.blockPathMap?.[parentId]?.blockType;
      allowed = filterByParentVariation(allowed, parentBlockData, parentType);
    }
    return allowed;
  }, [parentContainerConfig, allowedBlocks, selectedBlock, iframeSyncState.blockPathMap, properties, filterByParentVariation]);

  // Compute allowedBlocks for BlockChooser based on pendingAdd context
  // Also applies variation filtering when parent has blocksField configured
  // Includes templates from allowedTemplates as virtual block types
  const effectiveAllowedBlocks = useMemo(() => {
    let allowed = null;
    let allowedTemplates = null;
    let parentBlockData = null;
    let parentType = null;

    // Helper to convert template URL/object to block type ID
    const getTemplateTypeId = (template) => {
      const templatePath = typeof template === 'string' ? template : (template['@id'] || template.UID || '');
      const templateName = templatePath.split('/').filter(Boolean).pop() || 'unknown';
      return `Template: ${templateName}`;
    };

    if (pendingAdd?.mode === 'sidebar') {
      // Sidebar add appends to container — get allowedSiblingTypes from any existing sibling
      const { parentBlockId, fieldName } = pendingAdd;
      const effectiveParentId = parentBlockId === null ? '_page' : parentBlockId;
      if (parentBlockId !== null) {
        parentBlockData = getBlockById(properties, iframeSyncState.blockPathMap, parentBlockId);
        parentType = iframeSyncState.blockPathMap?.[parentBlockId]?.blockType;
      }
      const childIds = getChildBlockIds(effectiveParentId, iframeSyncState.blockPathMap);
      const siblingInField = childIds.find(
        id => iframeSyncState.blockPathMap[id].containerField === fieldName
      );
      if (siblingInField) {
        const siblingInfo = iframeSyncState.blockPathMap[siblingInField];
        allowed = siblingInfo.allowedSiblingTypes || null;
        allowedTemplates = siblingInfo.allowedTemplates || null;
      }
    } else {
      // Iframe add: get allowed blocks from blockPathMap (already resolved by buildBlockPathMap)
      const afterBlockId = pendingAdd?.afterBlockId || selectedBlock;
      const afterPathInfo = iframeSyncState.blockPathMap?.[afterBlockId];
      if (afterPathInfo?.parentId) {
        parentBlockData = getBlockByPath(properties, iframeSyncState.blockPathMap?.[afterPathInfo.parentId]?.path);
        parentType = iframeSyncState.blockPathMap?.[afterPathInfo.parentId]?.blockType;
        allowed = afterPathInfo.allowedSiblingTypes || null;
        allowedTemplates = afterPathInfo.allowedTemplates || null;
      } else {
        // No parent - page-level, get templates from _page schema
        const pageSchema = config.blocks.blocksConfig?.['_page']?.schema?.();
        const pageFieldDef = pageSchema?.properties?.blocks_layout;
        allowedTemplates = pageFieldDef?.allowedTemplates;
      }
    }

    // Apply variation filtering if parent has blocksField configured
    if (allowed && parentBlockData && parentType) {
      allowed = filterByParentVariation(allowed, parentBlockData, parentType);
    }

    let result = allowed || allowedBlocks;

    // Add template type IDs to allowed blocks
    if (allowedTemplates?.length > 0) {
      const templateTypeIds = allowedTemplates.map(getTemplateTypeId);
      result = result ? [...result, ...templateTypeIds] : templateTypeIds;
    }

    return result;
  }, [pendingAdd, selectedBlock, iframeSyncState.blockPathMap, properties, allowedBlocks, filterByParentVariation]);

  // ============================================================================
  // SLASH MENU — filtered block list for "/" command in iframe
  // ============================================================================
  const slashMenuBlocks = useMemo(() => {
    if (!slashMenu) return [];
    const hasAllowed = effectiveAllowedBlocks && effectiveAllowedBlocks.length > 0;
    const search = (slashMenu.filter || '').toLowerCase();

    const scoreBlock = (block) => {
      if (!search) return 0;
      const title = intl.formatMessage({ id: block.title, defaultMessage: block.title }).toLowerCase();
      if (title.indexOf(search) === 0) return 2; // prefix match
      if (title.includes(search)) return 1; // substring match
      return 0;
    };

    return Object.values(blocksConfig)
      .filter(block => {
        if (!block.id || !block.title) return false;
        if (block.id === 'slate') return false; // same as core Volto
        if (hasAllowed && !effectiveAllowedBlocks.includes(block.id)) return false;
        if (!search) return true;
        const title = intl.formatMessage({ id: block.title, defaultMessage: block.title }).toLowerCase();
        const originalTitle = block.title.toLowerCase();
        return title.includes(search) || originalTitle.includes(search);
      })
      .sort((a, b) => {
        const scoreDiff = scoreBlock(b) - scoreBlock(a);
        if (scoreDiff) return scoreDiff;
        const aTitle = intl.formatMessage({ id: a.title, defaultMessage: a.title });
        const bTitle = intl.formatMessage({ id: b.title, defaultMessage: b.title });
        return aTitle.localeCompare(bTitle);
      });
  }, [slashMenu, blocksConfig, effectiveAllowedBlocks, properties, navRoot, contentType, intl]);

  // Clamp slashMenuIndex to available blocks
  const clampedSlashMenuIndex = slashMenuBlocks.length > 0
    ? Math.min(slashMenuIndex, slashMenuBlocks.length - 1)
    : 0;

  // Handle slash menu selection (when 'selecting' flag is set)
  useEffect(() => {
    if (!slashMenu?.selecting) return;
    const block = slashMenuBlocks[clampedSlashMenuIndex];
    if (block) {
      onMutateBlock(slashMenu.blockId, { '@type': block.id });
    }
    setSlashMenu(null);
    setSlashMenuIndex(0);
    // Tell iframe to clear _slashMenuActive
    document.getElementById('previewIframe')?.contentWindow?.postMessage(
      { type: 'SLASH_MENU_CLOSED' },
      '*',
    );
  }, [slashMenu?.selecting]); // eslint-disable-line react-hooks/exhaustive-deps

  // Close slash menu on click outside (or block change)
  useEffect(() => {
    if (!slashMenu) return;
    const closeSlashMenu = () => {
      setSlashMenu(null);
      setSlashMenuIndex(0);
      document.getElementById('previewIframe')?.contentWindow?.postMessage(
        { type: 'SLASH_MENU_CLOSED' },
        '*',
      );
    };
    // Click anywhere outside the menu portal closes it
    const handleMouseDown = (e) => {
      if (e.target.closest('.power-user-menu')) return;
      closeSlashMenu();
    };
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [slashMenu !== null]); // eslint-disable-line react-hooks/exhaustive-deps

  // ============================================================================
  // BLOCK ADD FLOW (Unified for Sidebar and Iframe)
  // ============================================================================
  //
  // Both sidebar add (via ChildBlocksWidget) and iframe add (via + button) follow
  // the same flow:
  //
  // 1. Determine allowedBlocks for the insertion context
  // 2. If single allowedBlock: auto-insert without showing chooser
  // 3. If multiple allowedBlocks: show BlockChooser for user selection
  //
  // After insertion (whether auto or via chooser):
  //
  // 1. onChangeFormData(newFormData) - updates Form.jsx state
  // 2. flushSync: set pendingSelectBlockUid - ensures flag is committed BEFORE Form re-renders
  // 3. useEffect runs when properties change, sees pendingSelectBlockUid
  // 4. useEffect sends FORM_DATA with selectedBlockUid to iframe
  // 5. iframe receives FORM_DATA, calls selectBlock(selectedBlockUid)
  // 6. iframe sends BLOCK_SELECTED back to admin
  // 7. View.jsx receives BLOCK_SELECTED, sets blockUI and calls onSelectBlock
  //
  // The key insight: pendingSelectBlockUid is just a FLAG. The actual formData comes
  // from Form.jsx props. The flushSync ensures the flag is set BEFORE the props update
  // triggers the useEffect, so they arrive at the iframe together.
  // ============================================================================

  // Handle sidebar add - adds inside a container's field as last child
  const handleSidebarAdd = useCallback((parentBlockId, fieldName) => {
    // Validate parentBlockId - must be PAGE_BLOCK_UID or a valid block ID
    if (parentBlockId == null) {
      throw new Error('[HYDRA] handleSidebarAdd: parentBlockId is required. Use PAGE_BLOCK_UID for page-level blocks.');
    }
    // Use getAllContainerFields to get container config (handles _page and nested blocks uniformly)
    const blocksConfig = config.blocks.blocksConfig;
    const containerFields = getAllContainerFields(parentBlockId, iframeSyncState.blockPathMap, properties, blocksConfig, intl, iframeSyncState.templateEditMode);
    const fieldConfig = containerFields.find(f => f.fieldName === fieldName);

    const isObjectList = fieldConfig?.isObjectList || false;
    const containerAllowed = fieldConfig?.allowedBlocks || null;

    // Auto-insert if single-schema object_list (no allowedBlocks) or single allowedBlock
    if ((isObjectList && (!containerAllowed || containerAllowed.length <= 1)) || (!isObjectList && containerAllowed?.length === 1)) {
      const blockType = isObjectList ? (containerAllowed?.[0] || null) : containerAllowed[0];
      insertAndSelectBlock(parentBlockId, blockType, 'inside', fieldName);
    } else {
      setPendingAdd({ mode: 'sidebar', parentBlockId, fieldName });
      setAddNewBlockOpened(true);
    }
  }, [properties, iframeSyncState.blockPathMap, iframeSyncState.templateEditMode, insertAndSelectBlock, intl]);

  // Handle iframe add - inserts AFTER the selected block (as sibling)
  const handleIframeAdd = useCallback(() => {
    if (iframeAllowedBlocks?.length === 1) {
      insertAndSelectBlock(selectedBlock, iframeAllowedBlocks[0], 'after');
    } else {
      setPendingAdd({ mode: 'iframe', afterBlockId: selectedBlock });
      setAddNewBlockOpened(true);
    }
  }, [iframeAllowedBlocks, selectedBlock, insertAndSelectBlock]);

  return (
    <div id="iframeContainer">
      <OpenObjectBrowser
        origin={iframeSrc && new URL(iframeSrc).origin}
        pendingFieldMedia={pendingFieldMedia}
        onFieldMediaSelected={(fieldName, blockUid, imagePath) => {
          // Update the block's field with the new image path
          const block = getBlockById(properties, iframeSyncState.blockPathMap, blockUid);
          if (!block) {
            setPendingFieldMedia(null);
            return;
          }

          const updatedBlock = { ...block, [fieldName]: imagePath };
          const updatedProperties = updateBlockById(properties, iframeSyncState.blockPathMap, blockUid, updatedBlock);

          // Update Redux via onChangeFormData
          onChangeFormData(updatedProperties);

          // Rebuild blockPathMap and send FORM_DATA to iframe
          const newBlockPathMap = buildBlockPathMap(updatedProperties, config.blocks.blocksConfig, intl);
          setIframeSyncState(prev => ({
            ...prev,
            formData: updatedProperties,
            blockPathMap: newBlockPathMap,
            toolbarRequestDone: `field-media-${Date.now()}`,
          }));

          setPendingFieldMedia(null);
        }}
        onFieldMediaCancelled={() => setPendingFieldMedia(null)}
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
                  const selectedBlockData = getBlockById(
                    properties,
                    iframeSyncState.blockPathMap,
                    selectedBlock,
                  );
                  const isEmptyBlock = selectedBlockData?.['@type'] === 'empty';

                  if (isEmptyBlock) return null;

                  return (id, value) => {
                    setAddNewBlockOpened(false);
                    if (pendingAdd?.mode === 'sidebar') {
                      insertAndSelectBlock(pendingAdd.parentBlockId, value['@type'], 'inside', pendingAdd.fieldName);
                    } else {
                      const afterBlockId = pendingAdd?.afterBlockId || selectedBlock;
                      insertAndSelectBlock(afterBlockId, value['@type'], 'after');
                    }
                    setPendingAdd(null);
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
      {/* Slash menu — appears under the field in the iframe where "/" was typed */}
      {slashMenu && referenceElement && slashMenu.fieldRect &&
        createPortal(
          (() => {
            const iframeRect = referenceElement.getBoundingClientRect();
            const menuTop = iframeRect.top + slashMenu.fieldRect.bottom;
            const menuLeft = iframeRect.left + slashMenu.fieldRect.left;
            return (
              <div
                className="power-user-menu"
                style={{
                  position: 'fixed',
                  top: menuTop,
                  left: menuLeft,
                  width: 210,
                  zIndex: 10,
                }}
              >
                <Menu vertical fluid borderless>
                  {slashMenuBlocks.map((block, index) => (
                    <Menu.Item
                      key={block.id}
                      className={block.id}
                      active={index === clampedSlashMenuIndex}
                      onClick={(e) => {
                        e.stopPropagation();
                        onMutateBlock(slashMenu.blockId, { '@type': block.id });
                        setSlashMenu(null);
                        setSlashMenuIndex(0);
                        document.getElementById('previewIframe')?.contentWindow?.postMessage(
                          { type: 'SLASH_MENU_CLOSED' },
                          '*',
                        );
                      }}
                    >
                      <Icon name={block.icon} size="24px" />
                      {intl.formatMessage({ id: block.title, defaultMessage: block.title })}
                    </Menu.Item>
                  ))}
                  {slashMenuBlocks.length === 0 && (
                    <Menu.Item>
                      {intl.formatMessage({ id: 'No matching blocks', defaultMessage: 'No matching blocks' })}
                    </Menu.Item>
                  )}
                </Menu>
              </div>
            );
          })(),
          document.body,
        )}
      {/* Only render when src is ready (ensures name attribute is applied on creation).
          Key on mode + frontend URL ensures iframe remounts when switching edit/view
          or switching frontends (avoids beforeunload dialog from old iframe),
          but persists during SPA navigation within the same mode */}
      {iframeSrc && (
        <iframe
          key={`${isEditMode ? 'edit' : 'view'}-${u}`}
          id="previewIframe"
          name={iframeName}
          title="Preview"
          src={iframeSrc}
          ref={setReferenceElement}
          allow="clipboard-read; clipboard-write"
          suppressHydrationWarning
          style={iframeMaxWidth ? { maxWidth: iframeMaxWidth } : undefined}
        />
      )}

      {/* Multi-block selection outlines — individual outline per selected block */}
      {blockUI?.multiSelectedUids?.length > 1 && referenceElement && (() => {
        const rects = blockUI.multiSelectRects || {};
        if (Object.keys(rects).length === 0) return null;
        const iframeRect = referenceElement.getBoundingClientRect();
        return Object.entries(rects).map(([uid, rect]) => (
          <div
            key={`multi-outline-${uid}`}
            className="volto-hydra-block-outline"
            data-outline-style="border"
            data-block-uid={uid}
            style={{
              position: 'fixed',
              left: `${iframeRect.left + rect.left - 2}px`,
              top: `${iframeRect.top + rect.top - 2}px`,
              width: `${rect.width + 4}px`,
              height: `${rect.height + 4}px`,
              background: 'transparent',
              border: '2px solid #007eb1',
              pointerEvents: 'none',
              zIndex: 1,
            }}
          />
        ));
      })()}

      {/* Single-block outline + underline (hidden during multi-select) */}
      {blockUI && blockUI.rect && referenceElement && !(blockUI.multiSelectedUids?.length > 1) && (() => {
        const isTextMode = !!blockUI.focusedFieldName;
        const iframeLeft = referenceElement.getBoundingClientRect().left;
        const iframeTop = referenceElement.getBoundingClientRect().top;
        return (
        <>
          <div
            className="volto-hydra-block-outline"
            data-outline-style={isTextMode ? 'subtle' : 'border'}
            style={{
              position: 'fixed',
              left: `${iframeLeft + blockUI.rect.left - 2}px`,
              top: `${iframeTop + blockUI.rect.top - 2}px`,
              width: `${blockUI.rect.width + 4}px`,
              height: `${blockUI.rect.height + 4}px`,
              background: 'transparent',
              border: isTextMode ? '1px solid rgba(0, 126, 177, 0.3)' : '2px solid #007eb1',
              pointerEvents: 'none',
              zIndex: 1,
            }}
          />
          {isTextMode && blockUI.focusedFieldRect && (
            <div
              className="volto-hydra-field-underline"
              style={{
                position: 'fixed',
                left: `${iframeLeft + blockUI.focusedFieldRect.left}px`,
                top: `${iframeTop + blockUI.focusedFieldRect.top + blockUI.focusedFieldRect.height - 1}px`,
                width: `${blockUI.focusedFieldRect.width}px`,
                height: '3px',
                background: '#007eb1',
                pointerEvents: 'none',
                zIndex: 2,
              }}
            />
          )}
        </>
        );
      })()}

      {/* Touch selection mode — checkbox overlays on all visible blocks */}
      {selectionMode && blockUI?.selectionModeRects && referenceElement && (() => {
        const iframeRect = referenceElement.getBoundingClientRect();
        return Object.entries(blockUI.selectionModeRects).map(([uid, rect]) => {
          const isChecked = multiSelected.includes(uid);
          return (
            <div
              key={`sel-${uid}`}
              className="volto-hydra-selection-checkbox"
              data-block-uid={uid}
              data-checked={isChecked ? 'true' : 'false'}
              onClick={() => {
                const checked = multiSelected.includes(uid)
                  ? multiSelected.filter(id => id !== uid)
                  : [...multiSelected, uid];
                if (checked.length === 0) {
                  document.dispatchEvent(new CustomEvent('hydra-exit-selection-mode'));
                } else {
                  if (onSetMultiSelected) onSetMultiSelected(checked);
                }
              }}
              style={{
                position: 'fixed',
                left: `${iframeRect.left + rect.left - 4}px`,
                top: `${iframeRect.top + rect.top + rect.height / 2 - 12}px`,
                width: '24px',
                height: '24px',
                borderRadius: '4px',
                border: `2px solid ${isChecked ? '#007eb1' : '#999'}`,
                background: isChecked ? '#007eb1' : 'white',
                cursor: 'pointer',
                zIndex: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '14px',
                fontWeight: 'bold',
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
              }}
            >
              {isChecked ? '\u2713' : ''}
            </div>
          );
        });
      })()}

      {/* Quanta Toolbar — renders for both single and multi-select */}
      <SyncedSlateToolbar
            selectedBlock={selectedBlock}
            form={iframeSyncState.formData}
            blockPathMap={iframeSyncState.blockPathMap}
            currentSelection={iframeSyncState.selection}
            _selectionSource={iframeSyncState._selectionSource}
            mouseActivityCounter={mouseActivityCounter}
            completedFlushRequestId={iframeSyncState.completedFlushRequestId}
            transformAction={iframeSyncState.transformAction}
            onTransformApplied={() => setIframeSyncState(prev => ({ ...prev, transformAction: null }))}
            onChangeFormData={(newFieldValue, selection, formatRequestId, extraBlocks) => {
              log('onChangeFormData callback called, formatRequestId:', formatRequestId,
                'hasFieldValue:', newFieldValue != null, 'extraBlocks:', extraBlocks?.length || 0,
                'selectionPath:', JSON.stringify(selection?.anchor?.path), 'selectionOffset:', selection?.anchor?.offset,
                'value[0].children:', JSON.stringify(newFieldValue?.[0]?.children?.map(c => c.type ? {type: c.type, text: c.children?.[0]?.text} : {text: c.text?.substring(0, 20)})));

              // Apply field value change and/or extra blocks to the latest
              // iframeSyncState (via prev), not the stale form prop snapshot.
              setIframeSyncState(prev => {
                let fd = prev.formData;
                let bpm = prev.blockPathMap;
                let dataChanged = false;

                // Apply field value change to the selected block
                if (newFieldValue != null) {
                  const fieldName = blockUI?.focusedFieldName || 'value';
                  const block = getBlockById(fd, bpm, selectedBlock);
                  const updatedBlock = { ...block, [fieldName]: newFieldValue };
                  fd = updateBlockById(fd, bpm, selectedBlock, updatedBlock);
                  dataChanged = true;
                }

                // Insert extra blocks from paste emitter extraction (images,
                // tables, text blocks split from multi-paragraph paste)
                let pendingSelectBlockUid = null;
                if (extraBlocks?.length > 0) {
                  bpm = buildBlockPathMap(fd, config.blocks.blocksConfig, intl);
                  const containerConfig = getContainerFieldConfig(
                    selectedBlock, bpm, fd, config.blocks.blocksConfig, intl,
                  );
                  let lastId = selectedBlock;
                  for (const [newId, blockData] of extraBlocks) {
                    fd = insertBlockInContainer(fd, bpm, lastId, newId, blockData, containerConfig, 'after');
                    bpm = buildBlockPathMap(fd, config.blocks.blocksConfig, intl);
                    lastId = newId;
                  }
                  pendingSelectBlockUid = lastId;
                  dataChanged = true;
                }

                const newSel = selection || prev.selection;
                log('onChangeFormData updater: prevSelPath:', JSON.stringify(prev.selection?.anchor?.path),
                  'newSelPath:', JSON.stringify(newSel?.anchor?.path), 'newSelOffset:', newSel?.anchor?.offset,
                  'selSameRef:', selection === prev.selection, 'formatRequestId:', formatRequestId);
                return {
                  ...prev,
                  formData: fd,
                  blockPathMap: bpm,
                  selection: newSel,
                  _selectionSource: selection ? 'onChangeFormData:toolbar' : prev._selectionSource,
                  toolbarRequestDone: formatRequestId || prev.toolbarRequestDone,
                  // When data didn't change, tell iframe to skip re-render
                  // (e.g. link cancel — just unblock and restore focus)
                  skipRenderOnSend: !dataChanged && !!formatRequestId,
                  ...(pendingSelectBlockUid ? { pendingSelectBlockUid } : {}),
                };
              });
            }}
            blockUI={blockUI}
            blockFieldTypes={blockFieldTypes}
            iframeElement={referenceElement}
            onDeleteBlock={onDeleteBlock}
            onSelectBlock={onSelectBlock}
            parentId={iframeSyncState.blockPathMap?.[selectedBlock]?.parentId}
            maxToolbarWidth={referenceElement?.getBoundingClientRect()?.width || 400}
            blockActions={iframeSyncState.blockPathMap?.[selectedBlock]?.actions}
            onBlockAction={(actionId) => {
              // Generic action handler - dispatches based on action type
              const pathInfo = iframeSyncState.blockPathMap?.[selectedBlock];

              if (actionId === 'deleteColumn' && pathInfo?.parentAddMode === 'table') {
                const cellIndex = pathInfo.path[pathInfo.path.length - 1];
                const newFormData = deleteTableColumn(properties, iframeSyncState.blockPathMap, selectedBlock);
                if (newFormData) {
                  // Determine what to select after deletion BEFORE triggering re-render
                  let selectBlockId = pathInfo.parentId;

                  if (cellIndex > 0) {
                    // Find the cell in the previous column (same row)
                    const newBlockPathMap = buildBlockPathMap(newFormData, blocksConfig, intl);
                    const rowBlock = getBlockByPath(newFormData, newBlockPathMap[pathInfo.parentId]?.path);
                    if (rowBlock?.cells?.[cellIndex - 1]) {
                      selectBlockId = rowBlock.cells[cellIndex - 1].key;
                    }
                  }

                  // Set pending selection BEFORE form update to prevent sidebar from rendering deleted block
                  flushSync(() => {
                    setIframeSyncState((prev) => ({
                      ...prev,
                      pendingSelectBlockUid: selectBlockId,
                    }));
                  });

                  // Clear current selection and update form
                  onSelectBlock(null);
                  onChangeFormData(newFormData);
                }
              } else if (actionId === 'deleteRow') {
                // Delete row - works from row itself OR from a cell (deletes parent row)
                let rowId = selectedBlock;
                let rowPathInfo = pathInfo;
                let cellIndex = null;

                // If called from a cell, find the parent row and track cell index
                if (pathInfo?.parentAddMode === 'table') {
                  cellIndex = pathInfo.path[pathInfo.path.length - 1];
                  rowId = pathInfo.parentId;
                  rowPathInfo = iframeSyncState.blockPathMap?.[rowId];
                }

                if (rowPathInfo?.addMode === 'table') {
                  const containerConfig = getContainerFieldConfig(rowId, iframeSyncState.blockPathMap, properties, blocksConfig, intl);
                  const rowIndex = rowPathInfo.path[rowPathInfo.path.length - 1];

                  let newFormData = deleteBlockFromContainer(properties, iframeSyncState.blockPathMap, rowId, containerConfig);
                  if (newFormData && containerConfig) {
                    newFormData = ensureEmptyBlockIfEmpty(newFormData, containerConfig, iframeSyncState.blockPathMap, uuid, blocksConfig, { intl, metadata, properties });

                    // Determine what to select after deletion BEFORE triggering re-render
                    // If called from a cell, select corresponding cell in previous row
                    // Otherwise, select the parent table
                    let selectBlockId = rowPathInfo.parentId;

                    if (cellIndex != null && rowIndex > 0) {
                      // Find the previous row and its corresponding cell
                      const newBlockPathMap = buildBlockPathMap(newFormData, blocksConfig, intl);
                      const tableBlock = getBlockByPath(newFormData, newBlockPathMap[rowPathInfo.parentId]?.path);
                      const dataPath = containerConfig.dataPath || ['rows'];
                      let rows = tableBlock;
                      for (const key of dataPath) {
                        rows = rows?.[key];
                      }
                      const prevRow = rows?.[rowIndex - 1];
                      if (prevRow?.cells?.[cellIndex]) {
                        selectBlockId = prevRow.cells[cellIndex].key;
                      }
                    }

                    // Set pending selection BEFORE form update to prevent sidebar from rendering deleted block
                    flushSync(() => {
                      setIframeSyncState((prev) => ({
                        ...prev,
                        pendingSelectBlockUid: selectBlockId,
                      }));
                    });

                    // Clear current selection and update form
                    onSelectBlock(null);
                    onChangeFormData(newFormData);
                  }
                }
              } else if (actionId === 'addRowBefore' || actionId === 'addRowAfter') {
                // Add row uses existing insertAndSelectBlock with 'before' or 'after'
                // If called from a cell, use the parent row and track cell index for selection
                const action = actionId === 'addRowBefore' ? 'before' : 'after';
                let targetBlock = selectedBlock;
                let selectChildIndex = null;
                if (pathInfo?.parentAddMode === 'table') {
                  // We're in a cell - find its index so we can select corresponding cell in new row
                  // Cell index is the last element in the path
                  selectChildIndex = pathInfo.path[pathInfo.path.length - 1];
                  targetBlock = pathInfo.parentId;
                }
                insertAndSelectBlock(targetBlock, null, action, null, { selectChildIndex });
              } else if (actionId === 'addColumnBefore' || actionId === 'addColumnAfter') {
                // Add column uses insertAndSelectBlock which detects table mode
                const action = actionId === 'addColumnBefore' ? 'before' : 'after';
                insertAndSelectBlock(selectedBlock, null, action);
              }
            }}
            onFieldLinkChange={(fieldName, url, metadata) => {
              let updatedProperties;

              if (selectedBlock === PAGE_BLOCK_UID) {
                // Page-level field - update directly on properties
                // For image fields with metadata, construct NamedBlobImage format
                if (metadata?.image_scales) {
                  const imageField = metadata.image_field || 'image';
                  const scaleInfo = metadata.image_scales[imageField]?.[0];
                  // Resolve relative download paths in scales against the content URL
                  const rawScales = scaleInfo?.scales || {};
                  const resolvedScales = {};
                  for (const [scaleName, scaleData] of Object.entries(rawScales)) {
                    resolvedScales[scaleName] = {
                      ...scaleData,
                      download: scaleData.download?.startsWith('http')
                        ? scaleData.download
                        : `${url}/${scaleData.download}`,
                    };
                  }
                  // Construct NamedBlobImage object format
                  const imageValue = {
                    '@type': 'Image',
                    'download': `${url}/@@images/${imageField}`,
                    'scales': resolvedScales,
                  };
                  updatedProperties = { ...properties, [fieldName]: imageValue };
                } else {
                  updatedProperties = { ...properties, [fieldName]: url };
                }
              } else {
                // Block field - update the block's field with the new URL
                // Use getBlockById to handle both top-level and container blocks
                const block = getBlockById(properties, iframeSyncState.blockPathMap, selectedBlock);
                if (!block) return;

                // For blocks, store url and image_scales separately (like Image block does)
                const updatedBlock = metadata?.image_scales
                  ? { ...block, [fieldName]: url, image_field: metadata.image_field, image_scales: metadata.image_scales }
                  : { ...block, [fieldName]: url };
                // Use updateBlockById to handle both top-level and container blocks
                updatedProperties = updateBlockById(properties, iframeSyncState.blockPathMap, selectedBlock, updatedBlock);
              }

              // Update Redux via onChangeFormData
              onChangeFormData(updatedProperties);

              // Rebuild blockPathMap and send FORM_DATA to iframe
              const newBlockPathMap = buildBlockPathMap(updatedProperties, config.blocks.blocksConfig, intl);
              setIframeSyncState(prev => ({
                ...prev,
                formData: updatedProperties,
                blockPathMap: newBlockPathMap,
                toolbarRequestDone: `field-link-${Date.now()}`,
              }));
            }}
            onOpenObjectBrowser={(fieldName, blockUid) => {
              // Set pending state to trigger object browser via OpenObjectBrowser component
              setPendingFieldMedia({ fieldName, blockUid });
            }}
            convertibleTypes={(() => {
              const blockData = getBlockById(properties, iframeSyncState.blockPathMap, selectedBlock);
              const typeFieldName = iframeSyncState.blockPathMap?.[selectedBlock]?.typeField || '@type';
              const blockType = blockData?.[typeFieldName];
              const allowedTypes = iframeSyncState.blockPathMap?.[selectedBlock]?.allowedSiblingTypes;
              return getConvertibleTypes(blockType, blocksConfig, allowedTypes);
            })()}
            onConvertBlock={(newType) => {
              const blockData = getBlockById(properties, iframeSyncState.blockPathMap, selectedBlock);
              if (!blockData) return;
              const typeFieldName = iframeSyncState.blockPathMap?.[selectedBlock]?.typeField || '@type';
              const newBlockData = convertBlockType(blockData, newType, blocksConfig, typeFieldName, intl);
              const updatedProperties = updateBlockById(properties, iframeSyncState.blockPathMap, selectedBlock, newBlockData);
              onChangeFormData(updatedProperties);
              // Rebuild blockPathMap and update state
              const newBlockPathMap = buildBlockPathMap(updatedProperties, blocksConfig, intl);
              setIframeSyncState(prev => ({
                ...prev,
                formData: updatedProperties,
                blockPathMap: newBlockPathMap,
                toolbarRequestDone: `convert-block-${Date.now()}`,
              }));
            }}
            templateEditMode={iframeSyncState.templateEditMode}
            onMakeTemplate={() => {
              // Create a new template from the selected block
              const blockData = getBlockById(properties, iframeSyncState.blockPathMap, selectedBlock);
              if (!blockData) return;

              // Generate a unique template ID and instance ID
              const templateCount = Object.values(properties.blocks || {})
                .filter(b => b.templateInstanceId === b.templateId)
                .length;
              const defaultName = `untitled-template-${templateCount + 1}`;
              const newTemplateId = `/templates/${defaultName}`;
              const newInstanceId = newTemplateId; // For new template, templateInstanceId === templateId

              // Add template fields to the block
              const updatedBlock = {
                ...blockData,
                templateId: newTemplateId,
                templateInstanceId: newInstanceId,
                slotId: 'primary', // Default slot name
              };

              // Update the block in formData
              const updatedProperties = updateBlockById(
                properties,
                iframeSyncState.blockPathMap,
                selectedBlock,
                updatedBlock
              );

              // Create a template document structure in cache
              // (will be saved when page is saved)
              templateCacheRef.current[newTemplateId] = {
                '@id': newTemplateId,
                '@type': 'Document',
                'title': defaultName,
                'blocks': {
                  [selectedBlock]: updatedBlock,
                },
                'blocks_layout': { items: [selectedBlock] },
              };

              // Update Redux
              onChangeFormData(updatedProperties);

              // Rebuild blockPathMap
              const newBlockPathMap = buildBlockPathMap(updatedProperties, blocksConfig, intl);

              // Find the template instance ID in the new pathMap
              // (it will be created as a virtual container)
              setIframeSyncState(prev => ({
                ...prev,
                formData: updatedProperties,
                blockPathMap: newBlockPathMap,
                toolbarRequestDone: `make-template-${Date.now()}`,
                pendingSelectBlockUid: newInstanceId, // Select the template instance
                templateEditMode: newInstanceId, // Activate template edit mode
              }));
            }}
          />

      {/* Add Button — single-block only, hidden during multi-select */}
      {blockUI && blockUI.rect && referenceElement && !(blockUI.multiSelectedUids?.length > 1) &&
        blockUI.addDirection !== 'hidden' && (() => {
            const iframeRect = referenceElement.getBoundingClientRect();
            log('Add button render, blockUI.addDirection:', blockUI.addDirection, 'blockUid:', blockUI.blockUid);
            const isRightDirection = blockUI.addDirection === 'right';

            const buttonWidth = 30;
            const buttonHeight = 30;
            let addLeft = isRightDirection
              ? iframeRect.left + blockUI.rect.left + blockUI.rect.width + 8
              : iframeRect.left + blockUI.rect.left + blockUI.rect.width - buttonWidth;

            let isConstrained = false;
            const iframeRight = iframeRect.left + iframeRect.width;
            if (addLeft + buttonWidth > iframeRight) {
              addLeft = iframeRect.left + blockUI.rect.left + blockUI.rect.width - buttonWidth - 8;
              isConstrained = true;
            }

            let addTop;
            if (isRightDirection) {
              addTop = isConstrained
                ? iframeRect.top + blockUI.rect.top + blockUI.rect.height - buttonHeight - 8
                : iframeRect.top + blockUI.rect.top;
            } else {
              addTop = iframeRect.top + blockUI.rect.top + blockUI.rect.height + 8;
            }

            const pathInfo = iframeSyncState.blockPathMap?.[selectedBlock];
            const isTableMode = pathInfo?.addMode === 'table' || pathInfo?.parentAddMode === 'table';
            let addIcon;
            let addTitle;
            if (isTableMode) {
              addIcon = isRightDirection
                ? <Icon name={columnAfterSVG} size="20px" />
                : <Icon name={rowAfterSVG} size="20px" />;
              addTitle = isRightDirection ? "Add column" : "Add row";
            } else {
              addIcon = <span style={{ fontSize: '22px', lineHeight: 1 }}>+</span>;
              addTitle = "Add block";
            }

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
                padding: '0',
              }}
              onClick={handleIframeAdd}
              title={addTitle}
            >
              {addIcon}
            </button>
            );
          })()}

      {/* Hierarchical sidebar widgets */}
      {/* Use properties (Redux) for formData - it's always up-to-date after onChangeFormData */}
      {/* blockPathMap is updated synchronously before onChangeFormData, so they stay in sync */}
      <ParentBlocksWidget
        selectedBlock={selectedBlock}
        multiSelected={multiSelected}
        formData={properties}
        blockPathMap={iframeSyncState.blockPathMap}
        onSelectBlock={onSelectBlock}
        onDeleteBlock={onDeleteBlock}
        onBlockAction={(actionId, blockId) => {
          // Generic action handler - dispatches based on action type
          // Used by sidebar dropdowns to handle table/block actions
          const pathInfo = iframeSyncState.blockPathMap?.[blockId];

          if (actionId === 'deleteColumn' && pathInfo?.parentAddMode === 'table') {
            const cellIndex = pathInfo.path[pathInfo.path.length - 1];
            const newFormData = deleteTableColumn(properties, iframeSyncState.blockPathMap, blockId);
            if (newFormData) {
              let selectBlockId = pathInfo.parentId;
              if (cellIndex > 0) {
                const newBlockPathMap = buildBlockPathMap(newFormData, blocksConfig, intl);
                const rowBlock = getBlockByPath(newFormData, newBlockPathMap[pathInfo.parentId]?.path);
                if (rowBlock?.cells?.[cellIndex - 1]) {
                  selectBlockId = rowBlock.cells[cellIndex - 1].key;
                }
              }
              flushSync(() => {
                setIframeSyncState((prev) => ({
                  ...prev,
                  pendingSelectBlockUid: selectBlockId,
                }));
              });
              onSelectBlock(null);
              onChangeFormData(newFormData);
            }
          } else if (actionId === 'deleteRow') {
            let rowId = blockId;
            let rowPathInfo = pathInfo;
            let cellIndex = null;
            if (pathInfo?.parentAddMode === 'table') {
              cellIndex = pathInfo.path[pathInfo.path.length - 1];
              rowId = pathInfo.parentId;
              rowPathInfo = iframeSyncState.blockPathMap?.[rowId];
            }
            if (rowPathInfo?.addMode === 'table') {
              const containerConfig = getContainerFieldConfig(rowId, iframeSyncState.blockPathMap, properties, blocksConfig, intl);
              const rowIndex = rowPathInfo.path[rowPathInfo.path.length - 1];
              let newFormData = deleteBlockFromContainer(properties, iframeSyncState.blockPathMap, rowId, containerConfig);
              if (newFormData && containerConfig) {
                newFormData = ensureEmptyBlockIfEmpty(newFormData, containerConfig, iframeSyncState.blockPathMap, uuid, blocksConfig, { intl, metadata, properties });
                let selectBlockId = rowPathInfo.parentId;
                if (cellIndex != null && rowIndex > 0) {
                  const newBlockPathMap = buildBlockPathMap(newFormData, blocksConfig, intl);
                  const tableBlock = getBlockByPath(newFormData, newBlockPathMap[rowPathInfo.parentId]?.path);
                  const dataPath = containerConfig.dataPath || ['rows'];
                  let rows = tableBlock;
                  for (const key of dataPath) {
                    rows = rows?.[key];
                  }
                  const prevRow = rows?.[rowIndex - 1];
                  if (prevRow?.cells?.[cellIndex]) {
                    selectBlockId = prevRow.cells[cellIndex].key;
                  }
                }
                flushSync(() => {
                  setIframeSyncState((prev) => ({
                    ...prev,
                    pendingSelectBlockUid: selectBlockId,
                  }));
                });
                onSelectBlock(null);
                onChangeFormData(newFormData);
              }
            }
          } else if (actionId === 'addRowBefore' || actionId === 'addRowAfter') {
            const action = actionId === 'addRowBefore' ? 'before' : 'after';
            let targetBlock = blockId;
            let selectChildIndex = null;
            if (pathInfo?.parentAddMode === 'table') {
              selectChildIndex = pathInfo.path[pathInfo.path.length - 1];
              targetBlock = pathInfo.parentId;
            }
            insertAndSelectBlock(targetBlock, null, action, null, { selectChildIndex });
          } else if (actionId === 'addColumnBefore' || actionId === 'addColumnAfter') {
            const action = actionId === 'addColumnBefore' ? 'before' : 'after';
            insertAndSelectBlock(blockId, null, action);
          }
        }}
        onChangeBlock={(blockId, newBlockData) => {
          // DEBUG: trace facets changes through onChangeBlock
          if (newBlockData?.facets) {
            log('[onChangeBlock] blockId:', blockId, 'facets:', newBlockData.facets.length,
              'ids:', newBlockData.facets.map(f => f['@id']));
          }
          // Guard: blockId can be undefined when Volto components like BlockDataForm
          // are missing the block prop (e.g., SearchBlockEdit doesn't pass block to BlockDataForm)
          if (!blockId) {
            console.warn(
              '[HYDRA] onChangeBlock called with undefined blockId. ' +
              'This is likely a Volto bug where BlockDataForm is used without a block prop. ' +
              'Data keys:', Object.keys(newBlockData || {}),
              'Stack:', new Error().stack
            );
            return;
          }

          // Handle page-level changes (PAGE_BLOCK_UID) - merge directly into formData
          if (blockId === PAGE_BLOCK_UID) {
            const newFormData = { ...properties, ...newBlockData };
            validateAndLog(newFormData, 'onChangeBlock (page-level)', blockFieldTypes);
            onChangeFormData(newFormData);
            return;
          }

          // Rebuild blockPathMap from current properties to ensure it's up to date
          const currentBlockPathMap = buildBlockPathMap(properties, config.blocks.blocksConfig, intl);

          // Get old block data before the update (for sync detection)
          const oldBlockData = getBlockById(properties, currentBlockPathMap, blockId);
          log('onChangeBlock: blockId:', blockId, 'oldVariation:', oldBlockData?.variation, 'newVariation:', newBlockData?.variation);

          // Find container config (works for both page-level and nested blocks)
          const pathInfo = currentBlockPathMap[blockId];
          if (!pathInfo) {
            throw new Error(`[HYDRA] onChangeBlock: block ${blockId} not in pathMap`);
          }
          const containerConfig = getContainerFieldConfig(
            blockId,
            currentBlockPathMap,
            properties,
            blocksConfig,
            intl,
          );

          let newFormData = mutateBlockInContainer(
            properties,
            currentBlockPathMap,
            blockId,
            newBlockData,
            containerConfig,
          );

          // Sync child @type if parent has inheritSchemaFrom and typeField changed
          newFormData = syncChildBlockTypes(
            newFormData,
            currentBlockPathMap,
            blockId,
            oldBlockData,
            newBlockData,
            config.blocks.blocksConfig,
            intl,
          );

          // Validate data from sidebar before using it
          validateAndLog(newFormData, 'onChangeBlock (sidebar)', blockFieldTypes);
          onChangeFormData(newFormData);
        }}
        templateEditMode={iframeSyncState.templateEditMode}
        onChangeTemplateSettings={(instanceId, settings) => {
          // Update template settings in templateCache
          const pathInfo = iframeSyncState.blockPathMap?.[instanceId];
          const templateId = pathInfo?.templateId || instanceId;
          if (templateCacheRef.current[templateId]) {
            templateCacheRef.current[templateId] = {
              ...templateCacheRef.current[templateId],
              ...settings,
            };
          }
          // Update blockData for the virtual template instance
          const newBlockPathMap = { ...iframeSyncState.blockPathMap };
          if (newBlockPathMap[instanceId]) {
            newBlockPathMap[instanceId] = {
              ...newBlockPathMap[instanceId],
              blockData: {
                ...newBlockPathMap[instanceId].blockData,
                ...settings,
              },
            };
            setIframeSyncState(prev => ({
              ...prev,
              blockPathMap: newBlockPathMap,
            }));
          }
        }}
        onToggleTemplateEditMode={async (instanceId) => {
          const prevInstanceId = iframeSyncState.templateEditMode;

          // Exiting template edit mode - need to flush pending text updates first
          if (prevInstanceId && !instanceId) {
            const formData = iframeSyncState.formData;

            // Validate template slot structure before allowing exit
            const validation = validateTemplatePlaceholders(formData);
            if (!validation.valid) {
              // Show validation error - user must fix structure before exiting
              const firstError = Object.values(validation.blocksErrors)[0]?._layout;
              toast.error(
                <Toast
                  error
                  title={firstError?.title || 'Invalid Template Structure'}
                  content={firstError?.message || 'Please fix the template structure before exiting edit mode.'}
                />
              );
              return; // Don't exit edit mode
            }

            // Send FLUSH_BUFFER to get latest text changes before reverse merge
            const requestId = `tpl-exit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            pendingTemplateEditExitRef.current = { requestId, prevInstanceId };

            if (referenceElement?.contentWindow) {
              referenceElement.contentWindow.postMessage(
                { type: 'FLUSH_BUFFER', requestId },
                '*'
              );
            }
            // Effect will handle the rest when flush completes
            return;
          }

          // Entering template edit mode
          setIframeSyncState(prev => ({
            ...prev,
            templateEditMode: instanceId,
          }));
          // Send template edit mode to iframe so it knows which blocks to make editable
          if (referenceElement?.contentWindow) {
            referenceElement.contentWindow.postMessage(
              { type: 'TEMPLATE_EDIT_MODE', instanceId },
              '*'
            );
          }
        }}
      />
      <ChildBlocksWidget
        selectedBlock={selectedBlock}
        formData={properties}
        blockPathMap={iframeSyncState.blockPathMap}
        onSelectBlock={onSelectBlock}
        onAddBlock={(parentBlockId, fieldName, options) => {
          if (options?.afterBlockId) {
            // Template slot section: add after specific block
            const afterId = options.afterBlockId;
            const afterPathInfo = iframeSyncState.blockPathMap?.[afterId];
            const allowed = afterPathInfo?.allowedSiblingTypes || null;
            if (allowed?.length === 1) {
              insertAndSelectBlock(afterId, allowed[0], 'after');
            } else {
              setPendingAdd({ mode: 'iframe', afterBlockId: afterId });
              setAddNewBlockOpened(true);
            }
          } else {
            handleSidebarAdd(parentBlockId, fieldName);
          }
        }}
        onMoveBlock={(parentBlockId, fieldName, newOrder) => {
          const newFormData = reorderBlocksInContainer(
            properties,
            iframeSyncState.blockPathMap,
            parentBlockId,
            fieldName,
            newOrder,
            config.blocks?.blocksConfig,
            intl,
          );
          onChangeFormData(newFormData);
        }}
        onChangeFormData={onChangeFormData}
        templateEditMode={iframeSyncState.templateEditMode}
      />
    </div>
  );
};

export default Iframe;
