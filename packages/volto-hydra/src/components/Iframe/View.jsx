import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { v4 as uuid } from 'uuid';
import { useHistory } from 'react-router-dom';
import Cookies from 'js-cookie';
import { Node } from 'slate';
import {
  applyBlockDefaults,
  previousBlockId,
} from '@plone/volto/helpers';
import { validateAndLog } from '../../utils/formDataValidation';
import { getIframeUrlCookieName } from '../../utils/cookieNames';
import { isSlateFieldType, formDataContentEqual, PAGE_BLOCK_UID } from '@volto-hydra/hydra-js';

// Debug logging - disabled by default, enable via window.HYDRA_DEBUG
const debugEnabled =
  typeof window !== 'undefined' && window.HYDRA_DEBUG;
const log = (...args) => debugEnabled && console.log('[VIEW]', ...args);
// eslint-disable-next-line no-unused-vars
const logExtract = (...args) =>
  debugEnabled && console.log('[EXTRACT]', ...args);

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
import { BlockChooser, Icon } from '@plone/volto/components';
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
import { buildBlockPathMap, getBlockByPath, getBlockById, updateBlockById, getContainerFieldConfig, insertBlockInContainer, deleteBlockFromContainer, mutateBlockInContainer, ensureEmptyBlockIfEmpty, initializeContainerBlock, moveBlockBetweenContainers, reorderBlocksInContainer, getAllContainerFields, insertTableColumn, deleteTableColumn } from '../../utils/blockPath';
import {
  applySchemaDefaultsToFormData,
  createSchemaEnhancerFromRecipe,
  syncChildBlockTypes,
  getConvertibleTypes,
  convertBlockType,
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
              sidebarSchemaOnly: true, // Virtual types use schema form in sidebar
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
                  sidebarSchemaOnly: true,
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
let persistedIframe = { frontendUrl: null, path: null, isEdit: null };

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
    schema, // Content type schema for page-level field types
  } = props;

  const dispatch = useDispatch();

  const [addNewBlockOpened, setAddNewBlockOpened] = useState(false);
  // pendingAdd: { mode: 'sidebar', parentBlockId, fieldName } | { mode: 'iframe', afterBlockId }
  const [pendingAdd, setPendingAdd] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [popperElement, setPopperElement] = useState(null);
  const [referenceElement, setReferenceElement] = useState(null);
  const [blockUI, setBlockUI] = useState(null); // { blockUid, rect, focusedFieldName }

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

  // Track last SELECT_BLOCK sent to avoid redundant sends during pending selection
  const lastSentSelectBlockRef = useRef(null);

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
    blockPathMap: buildBlockPathMap(properties, config.blocks.blocksConfig, intl),
    selection: null,
    completedFlushRequestId: null, // For toolbar button click flow (FLUSH_BUFFER)
    transformAction: null, // For hotkey transform flow (format, paste, delete) - includes its own requestId
    toolbarRequestDone: null, // requestId - toolbar completed format, need to respond to iframe
    pendingSelectBlockUid: null, // Block to select after next FORM_DATA (for new block add)
    pendingFormatRequestId: null, // requestId to include in next FORM_DATA (for Enter key, etc.)
  }));

  // Handle Escape key in Admin UI to navigate to parent block
  // This is needed because when selecting via sidebar, focus stays in Admin UI,
  // not iframe, so the iframe's Escape handler doesn't receive the event.
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
      const iframe = document.getElementById('previewIframe');
      if (iframe && iframe.contains(document.activeElement)) return;

      e.preventDefault();

      // Get parent from blockPathMap
      const pathInfo = iframeSyncState.blockPathMap?.[selectedBlock];
      const parentId = pathInfo?.parentId || null;
      log('Admin Escape key - selecting parent:', parentId, 'from:', selectedBlock);

      // Select parent (or deselect if no parent)
      onSelectBlock(parentId);
    };

    document.addEventListener('keydown', handleEscape, true);
    return () => document.removeEventListener('keydown', handleEscape, true);
  }, [selectedBlock, iframeSyncState.blockPathMap, onSelectBlock]);

  const urlFromEnv = getURlsFromEnv();
  const u =
    useSelector((state) => state.frontendPreviewUrl.url) ||
    Cookies.get(getIframeUrlCookieName()) ||
    urlFromEnv[0];
  // Initialize to null to avoid SSR/client hydration mismatch (token differs)
  const [iframeSrc, setIframeSrc] = useState(null);

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
      setIframeSrc(getUrlWithAdminParams(u, token, isEditMode));
      persistedIframe = { frontendUrl: u, path: adminPath, isEdit: isEditMode };
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

    // Get container config and determine if object_list
    let containerConfig;
    let isObjectList = false;
    let fieldDef;

    if (action === 'inside') {
      const parentBlock = getBlockById(formData, blockPathMap, blockId);
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
      cellData = initializeContainerBlock(cellData, mergedBlocksConfig, uuid, { intl, metadata, properties });
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
      // object_list items: use virtual type to initialize containers
      // For before/after: get idField from containerConfig, virtualType from pathInfo
      // For inside: get from fieldDef
      const idField = containerConfig?.idField || fieldDef?.idField || '@id';
      let virtualType;
      if (action === 'inside') {
        // Get parent type and append field name (use blockPathMap for type lookup)
        virtualType = `${blockPathMap[blockId]?.blockType}:${fieldName}`;
      } else {
        // For before/after, use the existing item's virtual type
        virtualType = blockPathMap[blockId]?.blockType;
      }
      blockData = { [idField]: newBlockId, '@type': virtualType };

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
      blockData = initializeContainerBlock(blockData, mergedBlocksConfig, uuid, { intl, metadata, properties, siblingData });
      delete blockData['@type']; // object_list items don't store @type in data
    } else {
      // Standard block with @type
      blockData = { '@type': blockType };
      if (blockType === 'slate') {
        blockData.value = [{ type: 'p', children: [{ text: '' }] }];
      }
      blockData = applyBlockDefaults({ data: blockData, formData: blockData, intl, metadata, properties });
      blockData = initializeContainerBlock(blockData, mergedBlocksConfig, uuid, { intl, metadata, properties });
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
      // Find the first object_list field in the block and get the child at that index
      // This is used when adding a row from a cell - we want to select the corresponding cell
      const blockSchema = typeof mergedBlocksConfig?.[blockData['@type']?.split(':').slice(0, -1).join(':') + ':' + containerConfig?.fieldName]?.blockSchema === 'function'
        ? mergedBlocksConfig[blockData['@type']?.split(':').slice(0, -1).join(':') + ':' + containerConfig?.fieldName].blockSchema({ formData: {}, intl: { formatMessage: (m) => m.defaultMessage } })
        : null;

      // For table rows, cells are in the 'cells' field - look for object_list fields
      for (const [fieldName, fieldValue] of Object.entries(blockData)) {
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

    // Check if deleting from a container (null means page-level)
    const containerConfig = getContainerFieldConfig(
      id,
      iframeSyncState.blockPathMap,
      properties,
      mergedBlocksConfig,
      intl,
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

    // Rebuild blockPathMap to reflect the deleted block
    // Do NOT set formData here - let the useEffect update it after sending FORM_DATA
    const newBlockPathMap = buildBlockPathMap(newFormData, mergedBlocksConfig, intl);
    setIframeSyncState(prev => ({
      ...prev,
      blockPathMap: newBlockPathMap,
    }));
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
                blockFieldTypes,
                blockPathMap: resendBlockPathMap,
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
          // Update module-level state BEFORE history.push so useEffect knows iframe already has this path
          persistedIframe = { frontendUrl: u, path: event.data.path, isEdit: false };
          history.push(event.data.path);
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

        case 'INLINE_EDIT_DATA':
          // Validate data from postMessage before using it
          validateAndLog(event.data.data, 'INLINE_EDIT_DATA', blockFieldTypes);
          const incomingSequence = event.data.data?._editSequence || 0;
          // Use ref instead of state to avoid closure issues - ref is always current
          const currentSequence = editSequenceRef.current;
          log('INLINE_EDIT_DATA flushRequestId:', event.data.flushRequestId, '_editSequence:', incomingSequence, 'currentSeq:', currentSequence);

          // Sequence logic:
          // - incomingSeq > currentSeq: new edit from iframe, process it
          // - incomingSeq <= currentSeq: echo or stale, only update selection
          const isNewEdit = incomingSequence > currentSequence;

          if (isNewEdit) {
            // New edit from iframe - update everything
            inlineEditCounterRef.current += 1;
            editSequenceRef.current = incomingSequence; // Track the new sequence
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
              ...(event.data.flushRequestId ? { completedFlushRequestId: event.data.flushRequestId } : {}),
            }));
            // Strip _editSequence when updating Redux - sequence numbers are for iframe
            // echo detection only. Keeping them in Redux would cause sidebar edits to
            // inherit stale sequences, breaking the "skip if propsSeq < syncedSeq" check.
            const { _editSequence: _, ...formDataWithoutSeq } = event.data.data;
            log('INLINE_EDIT_DATA: calling onChangeFormData prop to update Redux (without _editSequence)');
            onChangeFormData(formDataWithoutSeq);
          } else {
            // Echo or stale - only update selection and flush state
            log('INLINE_EDIT_DATA: echo/stale, only updating selection');
            setIframeSyncState(prev => ({
              ...prev,
              selection: event.data.selection || null,
              ...(event.data.flushRequestId ? { completedFlushRequestId: event.data.flushRequestId } : {}),
            }));
          }
          break;

        case 'BUFFER_FLUSHED':
          // Iframe had no pending text - update combined state with current form + requestId + selection
          log('Received BUFFER_FLUSHED (no pending text), requestId:', event.data.requestId);
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

              // Insert new block with content after cursor, using unified flow
              const newBlockData = {
                '@type': blockType,
                [enterFieldName]: bottomValue,
              };
              insertAndSelectBlock(enterBlockId, blockType, 'after', null, {
                blockData: newBlockData,
                formData: mutatedFormData,
                blockPathMap: enterBlockPathMap,
                formatRequestId: enterRequestId,
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
          } else {
            // Format, paste, delete - let toolbar handle via transformAction
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
            }

            // IMPORTANT: Adopt the iframe's sequence if it's higher than ours.
            // The iframe increments sequence when buffering local changes (typing).
            // If we don't adopt it, FORM_DATA we send back will have a lower sequence,
            // and subsequent typing will use a stale sequence baseline.
            const incomingSeq = event.data.data?._editSequence || 0;
            if (incomingSeq > editSequenceRef.current) {
              editSequenceRef.current = incomingSeq;
              log('SLATE_TRANSFORM_REQUEST: adopting iframe sequence:', incomingSeq);
            }

            setIframeSyncState(prev => ({
              ...prev,
              formData: event.data.data,
              blockPathMap: buildBlockPathMap(event.data.data, config.blocks.blocksConfig, intl),
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

        case 'MOVE_BLOCK': {
          // Handle drag-and-drop block moves (supports container and page-level)
          const { blockId, targetBlockId, insertAfter, sourceParentId, targetParentId } = event.data;
          console.log('[MOVE_BLOCK] received:', { blockId, targetBlockId, insertAfter, sourceParentId, targetParentId });

          // Use properties (Redux) as source of truth for moves
          // Rebuild blockPathMap from properties to ensure consistency
          const currentFormData = properties;
          const currentBlockPathMap = buildBlockPathMap(currentFormData, config.blocks.blocksConfig, intl);

          // Get source container config BEFORE the move (needed for ensureEmptyBlockIfEmpty)
          // Only needed when moving to a different container
          const sourceContainerConfig = sourceParentId !== targetParentId && sourceParentId
            ? getContainerFieldConfig(blockId, currentBlockPathMap, currentFormData, blocksConfig, intl)
            : null;

          // Use moveBlockBetweenContainers utility to handle all cases:
          // - Same container reordering
          // - Different container moves
          // - Page ↔ container moves
          let newFormData = moveBlockBetweenContainers(
            currentFormData,
            currentBlockPathMap,
            blockId,
            targetBlockId,
            insertAfter,
            sourceParentId,
            targetParentId,
            blocksConfig,
            intl,
          );
          console.log('[MOVE_BLOCK] moveBlockBetweenContainers returned:', newFormData ? 'formData' : 'null');

          if (newFormData) {
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
                pendingSelectBlockUid: blockId,
              }));
            });
            // Debug: Log column contents after move
            const col1AfterMove = newFormData?.blocks?.['columns-1']?.columns?.['col-1'];
            const col2AfterMove = newFormData?.blocks?.['columns-1']?.columns?.['col-2'];
            console.log('[MOVE_BLOCK] col-1 blocks_layout after move:', col1AfterMove?.blocks_layout?.items);
            console.log('[MOVE_BLOCK] col-2 blocks_layout after move:', col2AfterMove?.blocks_layout?.items);
            console.log('[MOVE_BLOCK] calling onChangeFormData');
            onChangeFormData(newFormData);
          }
          break;
        }

        // NOTE: SELECTION_CHANGE was removed - selection is now always sent
        // WITH text content in INLINE_EDIT_DATA to keep them atomic/in-sync.

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

          // Update lastSentSelectBlockRef to match iframe's selection
          // This is critical: when iframe confirms a selection, our ref must match
          // Otherwise, if we later try to select the same block the iframe already has,
          // we'll skip sending SELECT_BLOCK (thinking it's a duplicate) but the iframe
          // may have moved to a different selection in the meantime
          lastSentSelectBlockRef.current = event.data.blockUid;

          // Call onSelectBlock OUTSIDE setBlockUI callback to avoid React warning
          if (isNewBlock) {
            log('BLOCK_SELECTED calling onSelectBlock:', event.data.blockUid);
            onSelectBlock(event.data.blockUid);
          }

          // Check if selected block is an empty block - if so, open block chooser
          // This should happen on every click of an empty block, not just "new" selections
          // BlockChooser will dynamically decide to mutate vs insert based on selected block type
          // IMPORTANT: Rebuild blockPathMap from properties instead of using iframeSyncState.blockPathMap
          // because React state updates are async and the state may be stale when BLOCK_SELECTED arrives
          // shortly after a delete operation creates an empty block
          const currentBlockPathMap = buildBlockPathMap(properties, config.blocks.blocksConfig, intl);
          const selectedBlockData = getBlockById(properties, currentBlockPathMap, event.data.blockUid);
          if (selectedBlockData?.['@type'] === 'empty') {
            setAddNewBlockOpened(true);
          }

          // Now update blockUI state
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
              focusedLinkableField: event.data.focusedLinkableField, // Track which linkable field is focused
              focusedMediaField: event.data.focusedMediaField, // Track which media field is focused
              editableFields: event.data.editableFields, // Map of fieldName -> fieldType from iframe
              linkableFields: event.data.linkableFields, // Map of fieldName -> true for link fields
              mediaFields: event.data.mediaFields, // Map of fieldName -> true for image/media fields
              addDirection: event.data.addDirection, // Direction for add button positioning
              isMultiElement: event.data.isMultiElement, // True if block renders as multiple DOM elements
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

        case 'INIT':
          // Combined initialization: merge config first, then send data
          // This ensures blockPathMap is built with complete schema knowledge
          iframeOriginRef.current = event.origin;

          // Check if iframe navigated to a different page (e.g., user clicked nav link)
          // User confirmed beforeunload warning, so they're leaving edit mode
          if (event.data.currentPath) {
            const adminPath = history.location.pathname.replace(/\/edit$/, '') || '/';
            if (event.data.currentPath !== adminPath) {
              log('INIT: iframe navigated to different page, following to view mode:', event.data.currentPath);
              // Update persistedIframe BEFORE history.push so useEffect won't reload iframe
              persistedIframe = { frontendUrl: u, path: event.data.currentPath, isEdit: false };
              history.push(event.data.currentPath);
              return; // Don't send INITIAL_DATA - admin will re-render with new page
            }
          }

          // 1. Merge voltoConfig (adds custom block definitions)
          if (event.data.voltoConfig) {
            const frontendConfig = event.data.voltoConfig;
            // Inject NoPreview view for frontend blocks that don't have one
            // Also ensure blockSchema has fieldsets if properties exist (for new blocks only)
            if (frontendConfig?.blocks?.blocksConfig) {
              Object.keys(frontendConfig.blocks.blocksConfig).forEach((blockType) => {
                const blockConfig = frontendConfig.blocks.blocksConfig[blockType];
                if (blockConfig && !blockConfig.view) {
                  blockConfig.view = NoPreview;
                }
                // Auto-generate default fieldset if missing (only for new blocks, not overrides)
                // Also ensure required is an array (Volto expects this)
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
              });
            }
            recurseUpdateVoltoConfig(frontendConfig);

            // 1b. Create schemaEnhancers from frontend recipes
            // New format: { inheritSchemaFrom: {...}, skiplogic: {...} }
            // Legacy format: { type: 'inheritSchemaFrom', config: {...} }
            if (frontendConfig?.blocks?.blocksConfig) {
              const recipeKeys = ['inheritSchemaFrom', 'childBlockConfig', 'skiplogic'];
              for (const [blockType, blockConfig] of Object.entries(
                frontendConfig.blocks.blocksConfig,
              )) {
                const recipe = blockConfig.schemaEnhancer;
                // Check if it's a recipe (has known enhancer keys, type property, or is array)
                const isRecipe =
                  recipe &&
                  typeof recipe === 'object' &&
                  (recipe.type || // legacy format
                    Array.isArray(recipe) || // array of recipes
                    recipeKeys.some((key) => key in recipe)); // new format
                if (isRecipe) {
                  const enhancer = createSchemaEnhancerFromRecipe(recipe);
                  if (enhancer) {
                    config.blocks.blocksConfig[blockType].schemaEnhancer =
                      enhancer;
                  } else {
                    // Remove invalid recipe to prevent Volto from trying to use it
                    delete config.blocks.blocksConfig[blockType].schemaEnhancer;
                  }
                }
              }
            }
          }

          // 2. Process pageBlocksFields - merge with default 'blocks' field
          // Default: [{ fieldName: 'blocks', title: 'Blocks' }] with all non-restricted block types
          // If provided, merge with default (unless 'blocks' is explicitly configured)
          let effectivePageBlocksFields;
          const defaultBlocksField = { fieldName: 'blocks', title: 'Blocks' };

          if (event.data.pageBlocksFields) {
            // Check if 'blocks' field is already configured
            const hasBlocksField = event.data.pageBlocksFields.some(f => f.fieldName === 'blocks');
            if (hasBlocksField) {
              // Use provided config as-is
              effectivePageBlocksFields = event.data.pageBlocksFields;
            } else {
              // Merge with default 'blocks' field
              effectivePageBlocksFields = [defaultBlocksField, ...event.data.pageBlocksFields];
            }
          } else {
            // No config provided - use default 'blocks' field
            effectivePageBlocksFields = [defaultBlocksField];
          }

          // 2b. Apply restrictions based on pageBlocksFields
          // Collect all unique allowed blocks across all page fields and restrict the rest
          const allAllowedBlocks = new Set();
          effectivePageBlocksFields.forEach(field => {
            if (field.allowedBlocks) {
              field.allowedBlocks.forEach(blockType => allAllowedBlocks.add(blockType));
            }
          });
          // Only apply restrictions if at least one field has allowedBlocks
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
            effectivePageBlocksFields.forEach(field => {
              const { fieldName } = field;
              const layoutFieldName = `${fieldName}_layout`;
              // Initialize missing blocks field
              if (!formWithPageFields[fieldName]) {
                formWithPageFields[fieldName] = {};
              }
              // Initialize missing layout field
              if (!formWithPageFields[layoutFieldName]) {
                formWithPageFields[layoutFieldName] = { items: [] };
              }
            });
          }

          // 3. Register _page as virtual block type in blocksConfig
          // This allows buildBlockPathMap to look up page schema without parameter passing
          const pageBlocksFieldsDef = Object.fromEntries(
            effectivePageBlocksFields.map(field => [
              field.fieldName,
              {
                type: 'blocks',
                allowedBlocks: field.allowedBlocks || null, // null = use default (all non-restricted)
                maxLength: field.maxLength || null,
                title: field.title || field.fieldName,
              },
            ]),
          );
          config.blocks.blocksConfig['_page'] = {
            id: '_page',
            schema: () => ({ properties: pageBlocksFieldsDef }),
            restricted: true, // Can't be added as a child block
          };

          // 4. Extract block field types (now includes custom blocks and page-level fields)
          const initialBlockFieldTypes = extractBlockFieldTypes(intl, schema);
          setBlockFieldTypes(initialBlockFieldTypes);

          // 5. Build blockPathMap (now has complete schema knowledge from _page registration)
          const initialBlockPathMap = buildBlockPathMap(
            formWithPageFields,
            config.blocks.blocksConfig,
            intl,
          );

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
          const toolbarButtons = config.settings.slate?.toolbarButtons || [];
          event.source.postMessage(
            {
              type: 'INITIAL_DATA',
              data: formWithDefaults,
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

  // UNIFIED FORM SYNC: Syncs iframeSyncState AND sends FORM_DATA to iframe
  // Triggers when Form's properties change or toolbar completes a format operation
  useEffect(() => {
    const formToUse = properties || form;

    // Skip if this is an echo from INLINE_EDIT_DATA we just processed
    if (processedInlineEditCounterRef.current < inlineEditCounterRef.current) {
      processedInlineEditCounterRef.current += 1;
      return;
    }

    // Case 1: Toolbar completed a format operation
    if (iframeSyncState.toolbarRequestDone) {
      // Increment edit sequence for toolbar operations too
      editSequenceRef.current++;
      const formWithSequence = {
        ...iframeSyncState.formData,
        _editSequence: editSequenceRef.current,
      };
      const message = {
        type: 'FORM_DATA',
        data: formWithSequence,
        blockPathMap: iframeSyncState.blockPathMap,
        formatRequestId: iframeSyncState.toolbarRequestDone,
      };
      if (iframeSyncState.selection) {
        message.transformedSelection = iframeSyncState.selection;
      }
      log('Sending FORM_DATA with formatRequestId:', message.formatRequestId, '_editSequence:', editSequenceRef.current);
      document.getElementById('previewIframe')?.contentWindow?.postMessage(
        message,
        iframeOriginRef.current,
      );
      // Strip _editSequence from Redux - sequences are for iframe echo detection only.
      // Keeping them in Redux causes sidebar edits to inherit stale sequences.
      const { _editSequence: _, ...formWithoutSeq } = formWithSequence;
      // Use flushSync to ensure BOTH state updates commit before any pending re-renders
      // This prevents race condition where Redux update triggers Case 2 with stale properties
      // NOTE: flushSync may warn "cannot flush when already rendering" but still works
      flushSync(() => {
        setIframeSyncState(prev => ({ ...prev, toolbarRequestDone: null, formData: formWithSequence }));
        onChangeFormData(formWithoutSeq);
      });
      return;
    }

    // Case 2: Form properties changed (sidebar edit, block add, etc.)
    if (!formToUse || !iframeOriginRef.current) {
      return;
    }

    // Skip if properties has an older sequence than what we've already sent
    // This prevents stale Redux echoes after Case 1 runs.
    // IMPORTANT: Sidebar edits come through Redux without _editSequence (it's undefined),
    // so we must NOT skip those - only skip when properties explicitly has an older sequence.
    const syncedSeq = iframeSyncState.formData?._editSequence || 0;
    const propsSeq = formToUse?._editSequence;
    if (propsSeq !== undefined && syncedSeq > propsSeq) {
      log('[SYNC SKIP] Stale sequence: propsSeq', propsSeq, '< syncedSeq', syncedSeq);
      return;
    }

    // Build blockPathMap first - needed for applying defaults to nested blocks
    const newBlockPathMap = buildBlockPathMap(formToUse, config.blocks.blocksConfig, intl);

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
      log('[SYNC SKIP] Content identical, skipping FORM_DATA');
      return;
    }
    log('[SYNC] Content changed, will send FORM_DATA. propsSeq:', propsSeq, 'syncedSeq:', syncedSeq);

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
    setIframeSyncState(prev => ({
      ...prev,
      formData: formWithSequence,
      blockPathMap: newBlockPathMap,
      selection: newSelection,
      ...(hasPendingFormatRequest ? { pendingFormatRequestId: null } : {}),
    }));

    // Send updated data to iframe (duplicates already filtered above)
    // Only include selectedBlockUid when there's a pending selection to avoid
    // clearing the iframe's selection with a null value from subsequent FORM_DATA
    const message = {
      type: 'FORM_DATA',
      data: formWithSequence,
      blockPathMap: newBlockPathMap,
      ...(hasPendingSelect ? { selectedBlockUid: iframeSyncState.pendingSelectBlockUid } : {}),
      ...(hasPendingFormatRequest ? { formatRequestId: iframeSyncState.pendingFormatRequestId } : {}),
    };
    log('Sending FORM_DATA to iframe. blockPathMap keys:', Object.keys(newBlockPathMap), 'selectedBlockUid:', hasPendingSelect ? iframeSyncState.pendingSelectBlockUid : '(not sent)', '_editSequence:', editSequenceRef.current);
    document.getElementById('previewIframe')?.contentWindow?.postMessage(
      message,
      iframeOriginRef.current,
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [properties, iframeSyncState.toolbarRequestDone]);

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
  const effectiveAllowedBlocks = useMemo(() => {
    let allowed = null;
    let parentBlockData = null;
    let parentType = null;

    if (pendingAdd?.mode === 'sidebar') {
      // Sidebar add: get allowed blocks from the container's field schema
      const { parentBlockId, fieldName } = pendingAdd;
      if (parentBlockId === null) {
        // Page-level - no parent filtering
        return allowedBlocks;
      }
      parentBlockData = getBlockById(properties, iframeSyncState.blockPathMap, parentBlockId);
      parentType = iframeSyncState.blockPathMap?.[parentBlockId]?.blockType;
      const parentSchema = config.blocks.blocksConfig?.[parentType]?.blockSchema;
      const resolvedSchema = typeof parentSchema === 'function'
        ? parentSchema({ formData: {}, intl: { formatMessage: (m) => m.defaultMessage } })
        : parentSchema;
      allowed = resolvedSchema?.properties?.[fieldName]?.allowedBlocks || null;
    } else {
      // Iframe add: get allowed blocks from parent container of afterBlockId
      const afterBlockId = pendingAdd?.afterBlockId || selectedBlock;
      const parentId = iframeSyncState.blockPathMap?.[afterBlockId]?.parentId;
      if (parentId) {
        parentBlockData = getBlockByPath(properties, iframeSyncState.blockPathMap?.[parentId]?.path);
        parentType = iframeSyncState.blockPathMap?.[parentId]?.blockType;
        const parentBlockConfig = config.blocks.blocksConfig?.[parentType];
        const parentSchema = parentBlockConfig?.blockSchema;
        const resolvedSchema = typeof parentSchema === 'function'
          ? parentSchema({ formData: {}, intl: { formatMessage: (m) => m.defaultMessage } })
          : parentSchema;

        // First check schema-defined container fields (e.g., columns, accordion)
        for (const [fieldName, fieldDef] of Object.entries(resolvedSchema?.properties || {})) {
          if (fieldDef.type === 'blocks') {
            const layoutField = `${fieldName}_layout`;
            if (parentBlockData?.[layoutField]?.items?.includes(afterBlockId)) {
              allowed = fieldDef.allowedBlocks || null;
              break;
            }
          }
        }

        // Check for implicit container (uses blocks/blocks_layout directly)
        // These have allowedBlocks on the block config, not in schema
        if (!allowed && parentBlockData?.blocks_layout?.items?.includes(afterBlockId)) {
          allowed = parentBlockConfig?.allowedBlocks || null;
        }
      }
    }

    // Apply variation filtering if parent has blocksField configured
    if (allowed && parentBlockData && parentType) {
      allowed = filterByParentVariation(allowed, parentBlockData, parentType);
    }

    return allowed || allowedBlocks;
  }, [pendingAdd, selectedBlock, iframeSyncState.blockPathMap, properties, allowedBlocks, filterByParentVariation]);

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
    // Use getAllContainerFields to get container config (handles _page and nested blocks uniformly)
    const blocksConfig = config.blocks.blocksConfig;
    const containerFields = getAllContainerFields(parentBlockId, iframeSyncState.blockPathMap, properties, blocksConfig, intl);
    const fieldConfig = containerFields.find(f => f.fieldName === fieldName);

    const isObjectList = fieldConfig?.isObjectList || false;
    const containerAllowed = fieldConfig?.allowedBlocks || null;

    // Auto-insert if object_list or single allowedBlock
    if (isObjectList || containerAllowed?.length === 1) {
      const blockType = isObjectList ? null : containerAllowed[0];
      insertAndSelectBlock(parentBlockId, blockType, 'inside', fieldName);
    } else {
      setPendingAdd({ mode: 'sidebar', parentBlockId, fieldName });
      setAddNewBlockOpened(true);
    }
  }, [properties, iframeSyncState.blockPathMap, insertAndSelectBlock, intl]);

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
      {/* Only render when src is ready (ensures name attribute is applied on creation).
          Key on mode ensures iframe remounts when switching edit/view,
          but persists during SPA navigation within the same mode */}
      {iframeSrc && (
        <iframe
          key={isEditMode ? 'edit' : 'view'}
          id="previewIframe"
          name={iframeName}
          title="Preview"
          src={iframeSrc}
          ref={setReferenceElement}
          allow="clipboard-read; clipboard-write"
          suppressHydrationWarning
        />
      )}

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
          intl,
        ).length > 0;
        // Multi-element blocks (e.g., listings) always get full border to show combined bounding box
        const showBottomLine = editableFieldCount === 1 && !isContainer && !blockUI.isMultiElement;
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
              log('onChangeFormData callback called, formatRequestId:', formatRequestId);
              // Update iframeSyncState atomically with formData, selection, and toolbarRequestDone
              // The FORM_DATA useEffect will:
              // 1. Send to iframe when it sees toolbarRequestDone (with formatRequestId)
              // 2. THEN update Redux (to avoid race condition where Redux re-render
              //    happens before toolbarRequestDone is committed)
              setIframeSyncState(prev => {
                log('setIframeSyncState called, prev toolbarRequestDone:', prev.toolbarRequestDone, 'new:', formatRequestId);
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
                  // Construct NamedBlobImage object format
                  const imageValue = {
                    '@type': 'Image',
                    'download': `${url}/@@images/${imageField}`,
                    'scales': scaleInfo?.scales || {},
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
              const blockType = blockData?.['@type'];
              return getConvertibleTypes(blockType, blocksConfig);
            })()}
            onConvertBlock={(newType) => {
              const blockData = getBlockById(properties, iframeSyncState.blockPathMap, selectedBlock);
              if (!blockData) return;
              const newBlockData = convertBlockType(blockData, newType, blocksConfig);
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
          />

          {/* Add Button - positioned based on data-block-add direction */}
          {blockUI.addDirection !== 'hidden' && (() => {
            // Check if container is at maxLength
            const pathInfo = iframeSyncState.blockPathMap?.[selectedBlock];
            if (pathInfo?.maxSiblings) {
              // Count siblings in the same container field
              // Must match both parentId AND containerField (for multi-field containers like columns with top_images + columns)
              const siblingCount = Object.values(iframeSyncState.blockPathMap || {})
                .filter((info) =>
                  info.parentId === pathInfo.parentId &&
                  info.containerField === pathInfo.containerField
                )
                .length;
              if (siblingCount >= pathInfo.maxSiblings) {
                return null; // Don't show add button when at maxLength
              }
            }

            const iframeRect = referenceElement.getBoundingClientRect();
            log('Add button render, blockUI.addDirection:', blockUI.addDirection, 'blockUid:', blockUI.blockUid);
            const isRightDirection = blockUI.addDirection === 'right';

            // Calculate ideal position
            const buttonWidth = 30;
            const buttonHeight = 30;
            let addLeft = isRightDirection
              ? iframeRect.left + blockUI.rect.left + blockUI.rect.width + 8  // Right of block
              : iframeRect.left + blockUI.rect.left + blockUI.rect.width - buttonWidth; // Bottom-right of block

            // Track if we're constrained inside the block
            let isConstrained = false;

            // Constrain to stay within iframe bounds
            const iframeRight = iframeRect.left + iframeRect.width;
            const blockRightInIframe = blockUI.rect.left + blockUI.rect.width;
            const availableMargin = iframeRect.width - blockRightInIframe;
            const buttonSpace = buttonWidth + 8; // button + gap
            log('Add button constraint check:', {
              blockRect: { left: blockUI.rect.left, width: blockUI.rect.width, right: blockRightInIframe },
              iframeWidth: iframeRect.width,
              availableMargin,
              buttonSpace,
              wouldConstrain: availableMargin < buttonSpace,
            });
            if (addLeft + buttonWidth > iframeRight) {
              // Move button inward to stay on screen, but keep it at top-right of block
              addLeft = iframeRect.left + blockUI.rect.left + blockUI.rect.width - buttonWidth - 8;
              isConstrained = true;
            }

            // For 'right': top-right of block (or bottom-right if constrained to avoid image overlay)
            // For 'bottom' (default): below block
            let addTop;
            if (isRightDirection) {
              if (isConstrained) {
                // When constrained inside block, position at bottom-right to avoid image overlay buttons
                addTop = iframeRect.top + blockUI.rect.top + blockUI.rect.height - buttonHeight - 8;
              } else {
                addTop = iframeRect.top + blockUI.rect.top;  // Top-right
              }
            } else {
              addTop = iframeRect.top + blockUI.rect.top + blockUI.rect.height + 8;  // Below block
            }

            // Check if this is a table mode block (row or cell)
            const isTableMode = pathInfo?.addMode === 'table' || pathInfo?.parentAddMode === 'table';

            // Icon and title depend on table mode and direction
            let addIcon;
            let addTitle;
            if (isTableMode) {
              // Table mode: use row/column icons
              addIcon = isRightDirection
                ? <Icon name={columnAfterSVG} size="20px" />
                : <Icon name={rowAfterSVG} size="20px" />;
              addTitle = isRightDirection ? "Add column" : "Add row";
            } else {
              // Regular blocks: use simple + icon
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
        </>
        );
      })()}

      {/* Hierarchical sidebar widgets */}
      {/* Use properties (Redux) for formData - it's always up-to-date after onChangeFormData */}
      {/* blockPathMap is updated synchronously before onChangeFormData, so they stay in sync */}
      <ParentBlocksWidget
        selectedBlock={selectedBlock}
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
          console.log('[View onChangeBlock] blockId:', blockId, 'oldVariation:', oldBlockData?.variation, 'newVariation:', newBlockData?.variation);

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
          );

          // Validate data from sidebar before using it
          validateAndLog(newFormData, 'onChangeBlock (sidebar)', blockFieldTypes);
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
            config.blocks?.blocksConfig,
            intl,
          );
          onChangeFormData(newFormData);
        }}
      />
    </div>
  );
};

export default Iframe;
