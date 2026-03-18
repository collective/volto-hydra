/**
 * This IS a large file and it needs to be written in one file so for better understanding and
 * usage of this file in future, Below is the lineup of methods this class provides and also
 * making it easier for other to understand how each section works :)
 */
////////////////////////////////////////////////////////////////////////////////
// Bridge Class Initialization and Navigation Event Handling
////////////////////////////////////////////////////////////////////////////////

// constructor
// init
// _setTokenCookie

////////////////////////////////////////////////////////////////////////////////
// Real-time Data Handling and Quanta Toolbar Creation
////////////////////////////////////////////////////////////////////////////////

// onEditChange
// createQuantaToolbar

////////////////////////////////////////////////////////////////////////////////
// Block Selection and Deselection
////////////////////////////////////////////////////////////////////////////////

// enableBlockClickListener
// selectBlock
// deselectBlock
// listenForSelectBlockMessage

////////////////////////////////////////////////////////////////////////////////
// Make Block Text Inline Editable and Text Changes Observation
////////////////////////////////////////////////////////////////////////////////

// makeBlockContentEditable
// observeBlockTextChanges
// elementIsVisibleInViewport
// observeForBlock

////////////////////////////////////////////////////////////////////////////////
// Adding NodeIds in Slate Block's Json
////////////////////////////////////////////////////////////////////////////////

// addNodeIds
// resetJsonNodeIds

////////////////////////////////////////////////////////////////////////////////
// Handling Text Changes in Blocks
////////////////////////////////////////////////////////////////////////////////

// handleTextChange
// handleTextChangeOnSlate
// updateJsonNode
// findParentWithAttribute

////////////////////////////////////////////////////////////////////////////////
// Text Formatting
////////////////////////////////////////////////////////////////////////////////

// getSelectionHTML
// isFormatted
// nextNode
// formatSelectedText
// unwrapFormatting
// unwrapSelectedPortion
// unwrapElement
// removeEmptyFormattingElements
// sendFormattedHTMLToAdminUI
// findEditableParent

// injectCSS

////////////////////////////////////////////////////////////////////////////////
// Template Utilities
////////////////////////////////////////////////////////////////////////////////

// isLayoutTemplate
// findPlaceholderRegions
// isTemplateAllowedIn
// getLayoutTemplates
// getSnippetTemplates
// cloneBlocksWithNewIds
// applyLayoutTemplate
// insertSnippetBlocks
// getTemplateBlocks
// isFixedTemplateBlock
// isPlaceholderContent

////////////////////////////////////////////////////////////////////////////////
// Methods provided by THIS hydra.js as export
////////////////////////////////////////////////////////////////////////////////

// initBridge
// getTokenFromCookie
// onEditChange

// Debug logging - disabled by default, enable via initBridge options or window.HYDRA_DEBUG
let debugEnabled = typeof window !== 'undefined' && window.HYDRA_DEBUG;
const log = (...args) => {
  if (!debugEnabled) return;
  const runId = typeof window !== 'undefined' && window.__testRunId;
  const prefix = runId != null ? `[HYDRA][RUN-${runId}]` : '[HYDRA]';
  console.log(prefix, ...args);
};

/**
 * Virtual block UID for page-level fields (title, description, preview_image, etc.)
 * Used to distinguish "page field selected" from "nothing selected" (null)
 */
export const PAGE_BLOCK_UID = '_page';

/**
 * Bridge class creating a two-way link between the Hydra and the frontend.
 * @exports Bridge - Exported for testing purposes
 */
export class Bridge {
  /**
   * Constructor for the Bridge class.
   *
   * @param {URL} adminOrigin - The origin of the adminUI.
   * @param {Object} options - Options for the bridge initialization:
   *   - page: { schema: { properties: { fieldName: { title, allowedBlocks, ... } } } }
   *           Page-level blocks fields. Default field is 'blocks_layout'.
   *   - blocks: { blockType: { id, title, blockSchema, ... } }
   *             Custom block definitions merged into the admin config.
   *   - voltoConfig: Other Volto config (non-block settings)
   *   - onEditChange: Callback for real-time form data updates
   *   - debug: Enable verbose logging (default: false)
   *   - pathToApiPath: Function to transform frontend path to API/admin path
   */
  constructor(adminOrigin, options = {}) {
    this.adminOrigin = adminOrigin;
    if (options.debug) debugEnabled = true;
    this.token = null;
    this.navigationHandler = null; // Handler for navigation events
    this.realTimeDataHandler = null; // Handler for message events
    this.blockClickHandler = null; // Handler for block click events
    this.selectBlockHandler = null; // Handler for select block events
    this.currentlySelectedBlock = null;
    this.prevSelectedBlock = null;
    this.clickOnBtn = false;
    this.currentUrl =
      typeof window !== 'undefined' ? new URL(window.location.href) : null;
    this.formData = null;
    this.blockTextMutationObserver = null;
    this.attributeMutationObserver = null;
    this.selectedBlockUid = null;
    this.focusedFieldName = null; // Track which editable field within the block has focus
    this.focusedLinkableField = null; // Track which linkable field has focus (for link editing)
    this.focusedMediaField = null; // Track which media field has focus (for image selection)
    this.isInlineEditing = false;
    this.handleMouseUp = null;
    this.blockObserver = null;
    this.handleObjectBrowserMessage = null;
    this.pendingTransform = null; // Track the single pending transform request (only one at a time due to blocking)
    this.eventBuffer = []; // Buffer for keypresses during blocking (replayed after transform)
    this.pendingBufferReplay = null; // Marked for replay after DOM re-render
    this.savedSelection = null; // Store selection for format operations
    this.textUpdateTimer = null; // Timer for batching text updates
    this.pendingTextUpdate = null; // Pending text update data
    this.scrollTimeout = null; // Timer for scroll debouncing
    this.expectedSelectionFromAdmin = null; // Selection we're restoring from Admin - suppress sending it back
    this.blockPathMap = {}; // Maps blockUid -> { path: [...], parentId: string|null }
    this.voltoConfig = null; // Store voltoConfig for allowedBlocks checking
    // Track active prospective inline element (link/format with ZWS) for Chrome workaround.
    // Chrome always positions cursor outside <a> elements, unlike <span> for bold.
    // See: https://www.w3.org/community/editing/wiki/ContentEditable
    this.prospectiveInlineElement = null;
    // Path transformer for frontends that embed state in URL (e.g., paging)
    this.pathToApiPath = options.pathToApiPath || ((path) => path);
    // True after INITIAL_DATA is received — block selection is deferred until then
    this.initialized = false;
    this._pendingSelectBlock = null;
    // Readonly registry - blocks marked readonly won't have fields collected
    // Set by expandListingBlocks() or frontend code, not persisted to backend
    this._readonlyBlocks = new Set();
    // Template edit mode - when set to an instanceId, blocks inside that instance
    // become editable (even if readOnly), and blocks outside become locked
    this.templateEditMode = null; // instanceId of template being edited
    // Track iframe focus state via window focus/blur events.
    // document.hasFocus() is unreliable in headless browsers (always returns false),
    // but window focus/blur events are dispatched by Chromium's internal frame focus
    // manager regardless of OS-level window focus.
    this._iframeFocused = document.hasFocus();
    window.addEventListener('focus', () => { this._iframeFocused = true; });
    window.addEventListener('blur', () => { this._iframeFocused = false; });
    // Register onEditChange callback BEFORE init() sends INIT message.
    // This eliminates the race where INITIAL_DATA arrives before the callback is set.
    if (options.onEditChange) {
      this.onEditChange(options.onEditChange);
    }
    this.init(options); // Initialize the bridge
  }

  /**
   * Mark a block as readonly (or not). Readonly blocks won't have editable/linkable/media
   * fields collected - they're display-only. Used by expandListingBlocks() for listing items.
   * This is transient state, not persisted to the backend.
   *
   * @param {string} blockUid - The block UID to mark
   * @param {boolean} readonly - Whether the block is readonly (default: true)
   */
  setBlockReadonly(blockUid, readonly = true) {
    if (readonly) {
      this._readonlyBlocks.add(blockUid);
    } else {
      this._readonlyBlocks.delete(blockUid);
    }
  }

  /**
   * Check if a block is readonly. Checks in order:
   * 1. Template edit mode (uses shared isBlockReadonly function)
   * 2. Readonly registry (set by setBlockReadonly) - Bridge-specific
   * 3. Block data property (block.readOnly) - via shared function
   * DOM attribute (data-block-readonly) is checked separately in collectBlockFields.
   *
   * @param {string} blockUid - The block UID to check
   * @returns {boolean} Whether the block is readonly
   */
  isBlockReadonly(blockUid) {
    const blockData = this.getBlockData(blockUid);

    // Use shared utility for template edit mode and block.readOnly checks
    const readonlyFromShared = isBlockReadonly(blockData, this.templateEditMode);

    // In template edit mode, the shared function handles everything
    if (this.templateEditMode) {
      log('isBlockReadonly:', readonlyFromShared ? 'TRUE' : 'FALSE', '(template edit mode) for:', blockUid);
      return readonlyFromShared;
    }

    // Normal mode: also check Bridge-specific registry
    if (this._readonlyBlocks.has(blockUid)) {
      log('isBlockReadonly: TRUE (registry) for:', blockUid);
      return true;
    }

    log('isBlockReadonly:', readonlyFromShared ? 'TRUE (blockData)' : 'FALSE', 'for:', blockUid);
    return readonlyFromShared;
  }

  /**
   * Parse a hydra comment string into attributes and selectors.
   * Format: "hydra attr=value attr attr=value(selector) /"
   *
   * @param {string} commentText - The comment text (without <!-- and -->)
   * @returns {Object|null} Parsed attributes or null if not a hydra comment
   */
  parseHydraComment(commentText) {
    const text = commentText.trim();
    if (!text.startsWith('hydra ') && text !== 'hydra' && !text.startsWith('hydra/')) {
      return null;
    }

    const isSelfClosing = text.endsWith('/');
    const content = text.replace(/^hydra\s*/, '').replace(/\/$/, '').trim();

    // Parse attribute=value or attribute=value(selector) patterns
    // Supports multiple values for the same attribute (e.g., multiple edit-text)
    const attrs = {};
    // Match: word-name=value(selector) or word-name=value or word-name (boolean)
    // Value can contain paths like /page-name
    const attrRegex = /([\w-]+)(?:=([^(\s]+)(?:\(([^)]+)\))?)?/g;
    let match;
    while ((match = attrRegex.exec(content)) !== null) {
      const [, name, value, selector] = match;
      const entry = { value: value || true, selector: selector || null };
      // Support multiple entries for the same attribute name
      if (!attrs[name]) {
        attrs[name] = [];
      }
      attrs[name].push(entry);
    }

    return { attrs, selfClosing: isSelfClosing };
  }

  /**
   * Scan DOM for hydra comments and materialize attributes to elements.
   * Converts comment-based hydra attributes to actual DOM attributes.
   *
   * Called after content changes to support comment syntax for third-party components.
   */
  materializeHydraComments() {
    if (typeof document === 'undefined') return;

    const treeWalker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_COMMENT,
      null,
      false
    );

    while (treeWalker.nextNode()) {
      const comment = treeWalker.currentNode;
      const text = comment.textContent.trim();

      // Skip closing comments
      if (text === '/hydra') continue;

      // Check for hydra comment
      const parsed = this.parseHydraComment(text);
      if (!parsed) continue;

      // Find the next element sibling (skip text nodes)
      let nextElement = comment.nextSibling;
      while (nextElement && nextElement.nodeType !== Node.ELEMENT_NODE) {
        nextElement = nextElement.nextSibling;
      }

      if (!nextElement) {
        console.error('[hydra] Comment syntax found but no next element sibling:', text);
        continue;
      }

      // Apply attributes to the element
      this.applyHydraAttributes(nextElement, parsed.attrs);
    }

    log('materializeHydraComments: completed');
  }

  /**
   * Apply hydra attributes to an element and its children based on selectors.
   *
   * @param {HTMLElement} element - The root element
   * @param {Object} attrs - Parsed attributes { name: [{ value, selector }, ...] }
   */
  applyHydraAttributes(element, attrs) {
    const attrMap = {
      'block-uid': 'data-block-uid',
      'block-readonly': 'data-block-readonly',
      'edit-text': 'data-edit-text',
      'edit-link': 'data-edit-link',
      'edit-media': 'data-edit-media',
      'block-add': 'data-block-add',
      'block-selector': 'data-block-selector',
      'block-container': 'data-block-container',
    };

    for (const [name, entries] of Object.entries(attrs)) {
      const domAttr = attrMap[name];
      if (!domAttr) continue;

      // Each attribute can have multiple entries (e.g., multiple edit-text)
      for (const { value, selector } of entries) {
        // Determine target element(s)
        const targets = selector
          ? element.querySelectorAll(selector)
          : [element];

        if (selector && targets.length === 0) {
          console.error(`[hydra] Comment selector "${selector}" for ${name}=${value} matched no elements in`, element.tagName, element.className);
        }

        for (const target of targets) {
          // Don't overwrite existing attributes
          if (!target.hasAttribute(domAttr)) {
            target.setAttribute(domAttr, value === true ? '' : value);
            log('applyHydraAttributes:', domAttr, '=', value, 'to', target.tagName, selector ? `(${selector})` : '');
          }
        }
      }
    }
  }

  /**
   * Central method for receiving form data from Admin UI.
   * Sets both formData and lastReceivedFormData for echo detection.
   * All incoming data (INITIAL_DATA, FORM_DATA) should use this.
   *
   * @param {Object} data - The form data from Admin UI
   * @param {string} source - Where the data came from (for logging)
   * @param {Object} [blockPathMap] - Optional blockPathMap for nested block lookup
   */
  setFormDataFromAdmin(data, source, blockPathMap) {
    if (blockPathMap === undefined) {
      throw new Error(`setFormDataFromAdmin: blockPathMap is required (source: ${source})`);
    }

    this.blockPathMap = blockPathMap;

    // Note: do NOT clear _readonlyBlocks here. The frontend re-registers readonly blocks
    // via expandListingBlocks(), but that's async (API call). Clearing here creates a race
    // window where blocks appear non-readonly. Stale entries are harmless.

    const seq = data?._editSequence || 0;
    // Use simple direct lookup for logging - getBlockData uses this.formData which isn't set yet
    const blockData = this.selectedBlockUid ? data?.blocks?.[this.selectedBlockUid] : null;
    const text = blockData?.value?.[0]?.children?.[0]?.text?.substring(0, 40);
    log(`[setFormDataFromAdmin] source: ${source}, seq: ${seq}, block: ${this.selectedBlockUid}, text: ${JSON.stringify(text)}`);

    this.formData = JSON.parse(JSON.stringify(data));
    this.lastReceivedFormData = JSON.parse(JSON.stringify(data));
  }

  /**
   * Get block data by UID, supporting nested blocks via blockPathMap.
   * Falls back to top-level lookup if not found in blockPathMap.
   *
   * @param {string} blockUid - The UID of the block to look up
   * @returns {Object|undefined} The block data or undefined if not found
   */
  getBlockData(blockUid) {
    // PAGE_BLOCK_UID means page-level data
    if (blockUid === PAGE_BLOCK_UID) {
      return this.formData;
    }

    // First try blockPathMap for nested block support
    const pathInfo = this.blockPathMap?.[blockUid];
    if (pathInfo?.path && this.formData) {
      // Walk the path to get the nested block
      let current = this.formData;
      for (const key of pathInfo.path) {
        if (current && typeof current === 'object') {
          current = current[key];
        } else {
          current = undefined;
          break;
        }
      }
      if (current) {
        // Return the block data directly - no @type mutation needed
        // Block types are looked up via blockPathMap.blockType (single source of truth)
        return current;
      }
    }
    // No fallback - blockPathMap is the single source of truth
    return undefined;
  }

  /**
   * Get the block type for a given block ID.
   * Uses blockPathMap as the single source of truth (works for both regular blocks and object_list items).
   * @param {string} blockId - The block ID
   * @returns {string|undefined} The block type
   */
  getBlockType(blockId) {
    return this.blockPathMap?.[blockId]?.blockType;
  }

  /**
   * Resolve a field path to determine the target block and field name.
   * Supports:
   * - "fieldName" -> block's own field (or page if no block context)
   * - "../fieldName" -> parent block's field (or page if at top level)
   * - "/fieldName" -> page-level field
   *
   * @param {string} fieldPath - The field path from data-edit-text
   * @param {string|null} blockId - Current block ID (PAGE_BLOCK_UID for page-level)
   * @returns {Object} { blockId: string, fieldName: string }
   */
  resolveFieldPath(fieldPath, blockId) {
    // Handle absolute path (page-level)
    if (fieldPath.startsWith('/')) {
      return { blockId: PAGE_BLOCK_UID, fieldName: fieldPath.slice(1) };
    }

    // If no block context or PAGE_BLOCK_UID, treat as page-level
    if (!blockId || blockId === PAGE_BLOCK_UID) {
      return { blockId: PAGE_BLOCK_UID, fieldName: fieldPath };
    }

    // Handle relative path with ../
    let currentBlockId = blockId;
    let remainingPath = fieldPath;

    while (remainingPath.startsWith('../')) {
      const pathInfo = this.blockPathMap?.[currentBlockId];
      if (!pathInfo?.parentId || pathInfo.parentId === PAGE_BLOCK_UID) {
        // Already at top level, next ../ goes to page
        return { blockId: PAGE_BLOCK_UID, fieldName: remainingPath.slice(3) };
      }
      currentBlockId = pathInfo.parentId;
      remainingPath = remainingPath.slice(3);
    }

    // Block field
    return { blockId: currentBlockId, fieldName: remainingPath };
  }

  /**
   * Check if an editable field belongs directly to a block, not a nested block.
   * Container blocks (like columns) contain nested blocks with their own editable fields.
   * This method helps avoid accidentally interacting with nested blocks' fields.
   *
   * @param {HTMLElement} field - The editable field element
   * @param {HTMLElement} blockElement - The block element to check ownership against
   * @returns {boolean} True if the field belongs directly to blockElement
   */
  fieldBelongsToBlock(field, blockElement) {
    const fieldBlockElement = field.closest('[data-block-uid]');
    return fieldBlockElement === blockElement;
  }

  /**
   * Get editable fields that belong directly to a block, excluding nested blocks' fields.
   * Also checks if the blockElement itself has data-edit-text (Nuxt pattern).
   *
   * @param {HTMLElement} blockElement - The block element
   * @returns {HTMLElement[]} Array of editable field elements that belong to this block
   */
  getOwnEditableFields(blockElement) {
    const result = [];
    // Check if block element itself is an editable field (Nuxt: both attrs on same element)
    if (blockElement.hasAttribute('data-edit-text')) {
      result.push(blockElement);
    }
    // Also check descendants
    const allFields = blockElement.querySelectorAll('[data-edit-text]');
    for (const field of allFields) {
      if (this.fieldBelongsToBlock(field, blockElement)) {
        result.push(field);
      }
    }
    return result;
  }

  /**
   * Get the first editable field that belongs directly to a block, excluding nested blocks' fields.
   * Also checks if the blockElement itself has data-edit-text (Nuxt pattern).
   *
   * @param {HTMLElement} blockElement - The block element
   * @returns {HTMLElement|null} The first editable field or null if none
   */
  getOwnFirstEditableField(blockElement) {
    const fields = [];
    this.collectBlockFields(blockElement, 'data-edit-text',
      (el, name, results) => { fields.push(el); });
    return fields[0] || null;
  }

  /**
   * Get an editable field by name that belongs to a block.
   * Also checks if the blockElement itself has the field (Nuxt pattern).
   *
   * @param {HTMLElement} blockElement - The block element
   * @param {string} fieldName - The field name to find
   * @returns {HTMLElement|null} The editable field or null if not found
   */
  getEditableFieldByName(blockElement, fieldName) {
    // Check if block element itself is the editable field (Nuxt: both attrs on same element)
    if (blockElement.getAttribute('data-edit-text') === fieldName) {
      return blockElement;
    }
    // Check descendants
    return blockElement.querySelector(`[data-edit-text="${fieldName}"]`);
  }

  /**
   * Collect fields with a given attribute from all elements of a block.
   * For multi-element blocks, searches ALL elements with the same UID.
   * Checks both the element itself and its descendants.
   *
   * @param {HTMLElement} blockElement - Any element of the block
   * @param {string} attrName - Attribute name (e.g., 'data-edit-link')
   * @param {Function} processor - (fieldElement, fieldName, results) => void
   * @returns {Object} Collected results
   */
  collectBlockFields(blockElement, attrName, processor) {
    const blockUid = blockElement.getAttribute('data-block-uid');

    // Check if block is marked readonly (registry, block data, or DOM attribute)
    if (blockUid && this.isBlockReadonly(blockUid)) {
      return {};
    }

    const results = {};

    // For page-level fields (no blockUid), process the element directly
    // For block fields, get all elements with this block UID (multi-element blocks)
    const elementsToProcess = blockUid
      ? this.getAllBlockElements(blockUid)
      : [blockElement];

    for (const element of elementsToProcess) {
      // Skip if this element has data-block-readonly
      // Readonly blocks ignore editable/linkable/media fields
      if (element.hasAttribute('data-block-readonly')) {
        continue;
      }

      // Check if element itself has the attribute
      const selfField = element.getAttribute(attrName);
      if (selfField) {
        processor(element, selfField, results);
      }
      // Check descendants (for blocks only - page-level fields are self-contained)
      if (blockUid) {
        for (const field of element.querySelectorAll(`[${attrName}]`)) {
          // Skip fields inside a readonly ancestor
          if (field.closest('[data-block-readonly]')) {
            continue;
          }
          if (this.fieldBelongsToBlock(field, element)) {
            const fieldName = field.getAttribute(attrName);
            if (fieldName) {
              processor(field, fieldName, results);
            }
          }
        }
      }
    }
    return results;
  }

  /**
   * Get linkable fields that belong directly to a block.
   * For multi-element blocks, searches ALL elements with the same UID.
   */
  getLinkableFields(blockElement) {
    return this.collectBlockFields(blockElement, 'data-edit-link',
      (el, name, results) => { results[name] = true; });
  }

  /**
   * Get effective bounding rect for a media field element.
   * If element has zero dimensions but uses absolute positioning with inset-0,
   * fall back to the first ancestor with actual dimensions.
   */
  getEffectiveMediaRect(element, fieldName) {
    let rect = element.getBoundingClientRect();

    // If element has dimensions, use them directly
    if (rect.width > 0 && rect.height > 0) {
      return { top: rect.top, left: rect.left, width: rect.width, height: rect.height };
    }

    // Element has zero dimensions - try to find a parent with dimensions
    // This handles elements like empty <img> tags that rely on parent for sizing.
    // Stop at block boundary (data-block-uid) to avoid using a parent container's
    // rect when the block itself is hidden (e.g., inactive carousel slide).
    let current = element.parentElement;
    let depth = 0;
    const maxDepth = 10; // Safety limit

    while (current && depth < maxDepth) {
      // Stop at block boundary - don't escape into parent block's DOM
      if (current.hasAttribute('data-block-uid')) {
        const blockRect = current.getBoundingClientRect();
        if (blockRect.width > 0 && blockRect.height > 0) {
          log(
            `data-edit-media="${fieldName}" has zero dimensions. ` +
            `Using block element's dimensions (${blockRect.width}x${blockRect.height}).`
          );
          return { top: blockRect.top, left: blockRect.left, width: blockRect.width, height: blockRect.height };
        }
        // Block itself is hidden (e.g., inactive carousel slide) - no valid rect
        break;
      }

      const parentRect = current.getBoundingClientRect();

      if (parentRect.width > 0 && parentRect.height > 0) {
        log(
          `data-edit-media="${fieldName}" has zero dimensions. ` +
          `Using parent's dimensions (${parentRect.width}x${parentRect.height}).`
        );
        return { top: parentRect.top, left: parentRect.left, width: parentRect.width, height: parentRect.height };
      }

      // Parent also has zero dimensions, continue up the chain
      current = current.parentElement;
      depth++;
    }

    // No fallback available, warn the developer
    console.warn(
      `[HYDRA] data-edit-media="${fieldName}" has zero dimensions (${rect.width}x${rect.height}). ` +
      `The element must have visible width and height for the image picker to position correctly. ` +
      `Set explicit dimensions or use a different element.`,
      element
    );
    return { top: rect.top, left: rect.left, width: rect.width, height: rect.height };
  }

  /**
   * Get media fields that belong directly to a block.
   * For multi-element blocks, searches ALL elements with the same UID.
   */
  getMediaFields(blockElement) {
    return this.collectBlockFields(blockElement, 'data-edit-media',
      (el, name, results) => {
        const rect = this.getEffectiveMediaRect(el, name);
        // Skip fields with zero dimensions (e.g., hidden carousel slides)
        if (rect && rect.width > 0 && rect.height > 0) {
          results[name] = { rect };
        }
      });
  }

  /**
   * Get the add direction for a block element.
   * Uses data-block-add attribute if set, otherwise infers from nesting depth.
   * Even depths (0, 2, ...) → 'bottom' (vertical), odd depths (1, 3, ...) → 'right' (horizontal)
   * Returns 'hidden' if block cannot have siblings added (empty, readonly, no insertion points).
   *
   * @param {HTMLElement} blockElement - The block element
   * @returns {string} 'right', 'bottom', or 'hidden'
   */
  getAddDirection(blockElement) {
    const blockUid = blockElement.getAttribute('data-block-uid');

    // Page-level fields (no block-uid) should not have add button
    if (!blockUid) {
      return 'hidden';
    }

    // Use centralized addability logic to check if adding is allowed
    const blockData = this.getBlockData(blockUid);
    const addability = getBlockAddability(blockUid, this.blockPathMap, blockData, this.templateEditMode);

    // Hide add button if can't insert after (add button only adds after the selected block)
    if (!addability.canInsertAfter) {
      return 'hidden';
    }

    let addDirection = blockElement.getAttribute('data-block-add');
    if (!addDirection) {
      // Count ancestor blocks to determine nesting depth
      let depth = 0;
      let parent = blockElement.parentElement;
      while (parent) {
        if (parent.hasAttribute('data-block-uid')) {
          depth++;
        }
        parent = parent.parentElement;
      }
      // Page-level blocks (depth 0) → bottom, nested (depth 1) → right, etc.
      addDirection = depth % 2 === 0 ? 'bottom' : 'right';
    }
    return addDirection;
  }

  /**
   * Get the adjacent block ID in a given direction, using blockPathMap siblings + DOM order.
   * For table vertical navigation (Up/Down on cells), finds the same-column cell in the adjacent row.
   *
   * @param {string} blockId - The current block ID
   * @param {'forward'|'backward'} direction - Navigation direction
   * @param {boolean} isTableVertical - True for Up/Down navigation in table mode (cross-row)
   * @returns {string|null} The adjacent block ID, or null if at boundary
   */
  getAdjacentBlockId(blockId, direction, isTableVertical = false) {
    const pathInfo = this.blockPathMap?.[blockId];
    if (!pathInfo) return null;
    // parentId can be null for top-level blocks — they're still siblings

    if (isTableVertical) {
      // Table vertical: find same-column cell in adjacent row
      // cellId → rowId (parentId) → tableId (row's parentId)
      const rowId = pathInfo.parentId;
      const rowInfo = this.blockPathMap?.[rowId];
      if (!rowInfo?.parentId) return null;
      const tableId = rowInfo.parentId;

      // Get all rows (siblings of rowId with same parentId=tableId), sorted by DOM
      const rows = this._getSiblingsByDomOrder(rowId, tableId);
      const rowIdx = rows.indexOf(rowId);
      if (rowIdx === -1) return null;

      // Get cells in current row to find column index
      const cellsInCurrentRow = this._getSiblingsByDomOrder(blockId, rowId);
      const colIdx = cellsInCurrentRow.indexOf(blockId);
      if (colIdx === -1) return null;

      // Find adjacent row
      const adjRowIdx = direction === 'forward' ? rowIdx + 1 : rowIdx - 1;
      if (adjRowIdx < 0 || adjRowIdx >= rows.length) return null;
      const adjRowId = rows[adjRowIdx];

      // Get cells in adjacent row and pick same column
      const cellsInAdjRow = Object.entries(this.blockPathMap)
        .filter(([, info]) => info.parentId === adjRowId)
        .map(([id]) => id);
      // Sort by DOM order
      cellsInAdjRow.sort((a, b) => {
        const elA = this.queryBlockElement(a);
        const elB = this.queryBlockElement(b);
        if (!elA || !elB) return 0;
        return elA.compareDocumentPosition(elB) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
      });

      return colIdx < cellsInAdjRow.length ? cellsInAdjRow[colIdx] : null;
    }

    // Standard: find siblings with same parentId, sorted by DOM, pick adjacent
    const siblings = this._getSiblingsByDomOrder(blockId, pathInfo.parentId);
    const idx = siblings.indexOf(blockId);
    if (idx === -1) return null;
    const adjIdx = direction === 'forward' ? idx + 1 : idx - 1;
    return (adjIdx >= 0 && adjIdx < siblings.length) ? siblings[adjIdx] : null;
  }

  /**
   * Get sibling block IDs sorted by DOM position.
   * @param {string} blockId - A block to find siblings for
   * @param {string} parentId - The parent block ID
   * @returns {string[]} Sibling IDs sorted by DOM order
   */
  _getSiblingsByDomOrder(blockId, parentId) {
    const siblings = Object.entries(this.blockPathMap)
      .filter(([, info]) => info.parentId === parentId)
      .map(([id]) => id);
    siblings.sort((a, b) => {
      const elA = this.queryBlockElement(a);
      const elB = this.queryBlockElement(b);
      if (!elA || !elB) return 0;
      return elA.compareDocumentPosition(elB) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
    });
    return siblings;
  }

  /**
   * Handle arrow key press when cursor is at the edge of an editable field.
   * Navigates between fields within a block, or to adjacent blocks.
   *
   * @param {string} key - The arrow key ('ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown')
   * @param {string} blockUid - The current block UID
   * @param {HTMLElement} editableField - The currently focused editable field
   * @param {HTMLElement} blockElement - The block element
   */
  handleArrowAtEdge(key, blockUid, editableField, blockElement) {
    const pathInfo = this.blockPathMap?.[blockUid];
    if (!pathInfo) return;

    // Determine layout direction for navigation (skip addability checks — we want
    // navigation direction even for blocks that can't have siblings added)
    let addDirection = blockElement.getAttribute('data-block-add');
    if (!addDirection) {
      let depth = 0;
      let parent = blockElement.parentElement;
      while (parent) {
        if (parent.hasAttribute('data-block-uid')) depth++;
        parent = parent.parentElement;
      }
      addDirection = depth % 2 === 0 ? 'bottom' : 'right';
    }
    const isTableMode = pathInfo.parentAddMode === 'table';

    // Map arrow keys to directions
    const isForwardKey = (key === 'ArrowDown' || key === 'ArrowRight');
    const isVerticalKey = (key === 'ArrowUp' || key === 'ArrowDown');
    const isHorizontalKey = (key === 'ArrowLeft' || key === 'ArrowRight');

    // Determine if this key should trigger navigation
    let shouldNavigate = false;
    let isTableVertical = false;

    if (isTableMode) {
      // Table mode: both directions work
      // Horizontal (Left/Right) → navigate between cells in same row
      // Vertical (Up/Down) → navigate between rows (same column)
      if (isHorizontalKey) {
        shouldNavigate = true;
      } else if (isVerticalKey) {
        shouldNavigate = true;
        isTableVertical = true;
      }
    } else if (addDirection === 'bottom' && isVerticalKey) {
      shouldNavigate = true;
    } else if (addDirection === 'right' && isHorizontalKey) {
      shouldNavigate = true;
    }

    if (!shouldNavigate) return;

    const direction = isForwardKey ? 'forward' : 'backward';

    // Check multi-field: navigate between fields within the block first
    const ownFields = this.getOwnEditableFields(blockElement);
    if (ownFields.length > 1 && !isTableVertical) {
      const fieldIdx = ownFields.indexOf(editableField);
      if (fieldIdx !== -1) {
        if (direction === 'forward' && fieldIdx < ownFields.length - 1) {
          // Move to next field in same block
          const nextField = ownFields[fieldIdx + 1];
          nextField.focus();
          const sel = window.getSelection();
          const range = document.createRange();
          range.selectNodeContents(nextField);
          range.collapse(true); // Cursor at start
          sel.removeAllRanges();
          sel.addRange(range);
          return;
        }
        if (direction === 'backward' && fieldIdx > 0) {
          // Move to previous field in same block
          const prevField = ownFields[fieldIdx - 1];
          prevField.focus();
          this._placeCursorAtEnd(prevField);
          return;
        }
      }
    }

    // Navigate to adjacent block, resolving through template instance boundaries.
    // Template instances are virtual containers with no DOM element — we must
    // drill into them (when entering) or skip past them (when leaving).
    let adjacentId = this._resolveNavigationTarget(blockUid, direction, isTableVertical);
    if (!adjacentId) return;

    const adjacentElement = this.queryBlockElement(adjacentId);
    if (!adjacentElement) return;

    log('handleArrowAtEdge: navigating from', blockUid, 'to', adjacentId, 'direction:', direction);

    // selectBlock() sets up toolbar, contenteditable, and sends BLOCK_SELECTED to admin.
    // Admin echoes back SELECT_BLOCK but iframe skips it (alreadySelected).
    // So we handle field focusing and cursor placement directly here.
    this.selectBlock(adjacentElement);

    // Focus the appropriate field and place cursor after DOM settles
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const currentElement = this.queryBlockElement(adjacentId);
        if (!currentElement) return;
        let targetField;
        if (direction === 'backward') {
          const fields = this.getOwnEditableFields(currentElement);
          targetField = fields[fields.length - 1] || null;
        } else {
          targetField = this.getOwnFirstEditableField(currentElement);
        }
        if (targetField && targetField.getAttribute('contenteditable') === 'true') {
          targetField.focus();
          if (direction === 'backward') {
            this._placeCursorAtEnd(targetField);
          } else {
            const sel = window.getSelection();
            const range = document.createRange();
            range.selectNodeContents(targetField);
            range.collapse(true);
            sel.removeAllRanges();
            sel.addRange(range);
          }
        }
      });
    });
  }

  /**
   * Resolve the navigation target from a block in a given direction.
   * Handles template instance boundaries:
   * - When leaving a template instance (no sibling), skips the virtual parent
   *   and finds the adjacent sibling of the template instance.
   * - When entering a template instance (adjacent is virtual), drills into
   *   its first/last child depending on direction.
   *
   * @param {string} blockId - Current block ID
   * @param {string} direction - 'forward' or 'backward'
   * @param {boolean} isTableVertical - Whether navigating vertically in a table
   * @returns {string|null} Target block ID with a DOM element, or null
   */
  _resolveNavigationTarget(blockId, direction, isTableVertical = false) {
    let currentId = blockId;
    const visited = new Set();

    while (!visited.has(currentId)) {
      visited.add(currentId);

      let adjacentId = this.getAdjacentBlockId(currentId, direction, isTableVertical);

      if (!adjacentId) {
        // At boundary of container — try to navigate up
        const currentInfo = this.blockPathMap?.[currentId];
        if (!currentInfo?.parentId) return null;

        const parentInfo = this.blockPathMap?.[currentInfo.parentId];
        if (parentInfo?.isTemplateInstance) {
          // Parent is a virtual template instance — skip it and find ITS adjacent sibling
          currentId = currentInfo.parentId;
          continue;
        }
        // Regular container boundary — navigate to parent block
        adjacentId = currentInfo.parentId;
      }

      // If adjacent is a virtual template instance, drill into it
      const adjacentInfo = this.blockPathMap?.[adjacentId];
      if (adjacentInfo?.isTemplateInstance) {
        const children = this._getSiblingsByDomOrder(null, adjacentId);
        if (children.length === 0) return null;
        adjacentId = direction === 'forward' ? children[0] : children[children.length - 1];
      }

      // Verify the target has a DOM element
      if (this.queryBlockElement(adjacentId)) {
        return adjacentId;
      }
      return null;
    }
    return null;
  }

  /**
   * Place cursor at the end of the last text node in an element.
   * @param {HTMLElement} element - The element to place cursor in
   */
  _placeCursorAtEnd(element) {
    const sel = window.getSelection();
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    let lastText = walker.firstChild();
    while (walker.nextNode()) lastText = walker.currentNode;
    if (lastText) {
      const range = document.createRange();
      range.setStart(lastText, lastText.length);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
    } else {
      // No text nodes — place at end of element
      const range = document.createRange();
      range.selectNodeContents(element);
      range.collapse(false);
      sel.removeAllRanges();
      sel.addRange(range);
    }
  }

  /**
   * Move cursor with an arrow key and detect if at edge of field.
   * Shared by keydown handler and buffer replay.
   *
   * @param {string} key - Arrow key name (ArrowLeft, ArrowRight, ArrowUp, ArrowDown)
   * @param {HTMLElement} editableField - The editable field element
   * @param {boolean} shiftKey - Whether shift is held (extend selection)
   */
  moveArrowKey(key, editableField, shiftKey = false) {
    const navActions = {
      ArrowLeft: ['backward', 'character'],
      ArrowRight: ['forward', 'character'],
      ArrowUp: ['backward', 'line'],
      ArrowDown: ['forward', 'line'],
    };
    if (!navActions[key]) return;

    const sel = window.getSelection();
    if (!sel) return;

    if (shiftKey) {
      sel.modify('extend', navActions[key][0], navActions[key][1]);
      return;
    }

    if (!sel.isCollapsed || this._slashMenuActive || this.blockedBlockId) {
      sel.modify('move', navActions[key][0], navActions[key][1]);
      return;
    }

    const beforeNode = sel.focusNode;
    const beforeOffset = sel.focusOffset;
    sel.modify('move', navActions[key][0], navActions[key][1]);

    if (sel.focusNode === beforeNode && sel.focusOffset === beforeOffset) {
      const blockEl = editableField.closest('[data-block-uid]');
      if (blockEl) {
        const uid = blockEl.getAttribute('data-block-uid');
        this.handleArrowAtEdge(key, uid, editableField, blockEl);
      }
    }
  }

  /**
   * Handles Backspace/Delete special cases: unwrap, delete block, delete across
   * formatted nodes. Shared between the live keydown handler and buffer replay.
   *
   * @param {string} blockUid - The block UID
   * @param {string} key - 'Backspace' or 'Delete'
   * @returns {boolean} true if handled (caller should preventDefault / skip native action)
   */
  handleDeleteKey(blockUid, key) {
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) return false;
    const range = selection.getRangeAt(0);
    const node = range.startContainer;

    // Backspace at absolute start of a slate field → send to admin to unwrap
    if (key === 'Backspace' && this.isSlateField(blockUid, this.focusedFieldName)) {
      const blockEl = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
      const editField = blockEl.closest('[data-edit-text]');
      if (editField) {
        const textRange = document.createRange();
        textRange.setStart(editField, 0);
        textRange.setEnd(range.startContainer, range.startOffset);
        const textBefore = this.stripZeroWidthSpaces(textRange.toString());

        if (textBefore === '') {
          const selectedText = range.collapsed ? '' : this.stripZeroWidthSpaces(range.toString());
          if (selectedText === '') {
            const blockElement = editField.closest('[data-block-uid]');
            const firstField = blockElement ? this.getOwnFirstEditableField(blockElement) : null;
            const isFirstField = firstField === editField;
            const fieldText = this.stripZeroWidthSpaces(editField.textContent || '');
            const isEmpty = fieldText === '';

            log('Backspace at start of slate field - sending unwrapBlock, isFirstField:', isFirstField, 'isEmpty:', isEmpty);
            this.sendTransformRequest(blockUid, 'unwrapBlock', {
              isFirstField,
              isEmpty,
            });
            return true;
          }
        }
      }
    }

    // Backspace in empty first simple text field → delete block
    if (key === 'Backspace' && !this.isSlateField(blockUid, this.focusedFieldName)) {
      const blockEl = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
      const editField = blockEl.closest('[data-edit-text]');
      if (editField) {
        const fieldText = (editField.textContent || '').trim();
        if (fieldText === '') {
          const blockElement = editField.closest('[data-block-uid]');
          const firstField = blockElement ? this.getOwnFirstEditableField(blockElement) : null;
          if (firstField === editField) {
            log('Backspace in empty first simple text field - sending DELETE_BLOCK');
            this.sendMessageToParent({
              type: 'DELETE_BLOCK',
              uid: blockUid,
            });
            return true;
          }
        }
      }
    }

    // Selection spans element nodes (formatted content) → delete transform
    if (!range.collapsed) {
      const hasElementNodes = this.selectionContainsElementNodes(range);
      if (hasElementNodes) {
        log('Delete selection contains element nodes, sending transform');
        this.sendTransformRequest(blockUid, 'delete', {
          direction: key === 'Backspace' ? 'backward' : 'forward',
        });
        return true;
      }
    }

    // At node boundary with different formatting → delete transform
    const atStart = range.startOffset === 0;
    const atEnd =
      range.startOffset === node.textContent?.length ||
      range.startOffset === node.length;

    if ((key === 'Backspace' && atStart) || (key === 'Delete' && atEnd)) {
      const parentElement =
        node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
      const hasNodeId = parentElement?.closest('[data-node-id]');

      if (hasNodeId) {
        this.sendTransformRequest(blockUid, 'delete', {
          direction: key === 'Backspace' ? 'backward' : 'forward',
        });
        return true;
      }
    }

    return false;
  }

  /**
   * Protect the last real character in a text node from deletion by replacing
   * it with ZWS. Keeps the text node alive so MutationObserver fires
   * characterData (not childList) and preserves inline formatting context.
   *
   * Called from both the beforeinput handler (native keyboard) and buffer
   * replay (execCommand doesn't fire beforeinput in headless browsers).
   *
   * @returns {boolean} true if handled (last char replaced with ZWS)
   */
  preserveLastCharDelete() {
    const sel = window.getSelection();
    if (!sel?.rangeCount || !sel.isCollapsed) return false;

    const textNode = sel.getRangeAt(0).startContainer;
    if (textNode.nodeType !== Node.TEXT_NODE) return false;

    const realText = this.stripZeroWidthSpaces(textNode.textContent);
    if (realText.length !== 1) return false;

    textNode.textContent = '\uFEFF';
    const r = document.createRange();
    // Position AFTER ZWS (offset 1) — browsers normalize offset 0 of a
    // ZWS-only inline element to be OUTSIDE it, losing formatting context.
    r.setStart(textNode, 1);
    r.collapse(true);
    sel.removeAllRanges();
    sel.addRange(r);
    return true;
  }

  /**
   * Checks text before cursor for markdown shortcut patterns (Space triggers autoformat).
   * Handles both block-level (##, >, -, etc.) and inline (**bold**, __bold__, etc.) patterns.
   * Shared between the live keydown handler and buffer replay.
   *
   * @param {string} blockUid - The block UID
   * @returns {boolean} true if a markdown pattern was detected and transform sent
   */
  handleSpaceKey(blockUid) {
    if (!this.isSlateField(blockUid, this.focusedFieldName)) return false;

    const sel = window.getSelection();
    if (!sel.rangeCount || !sel.isCollapsed) return false;

    const range = sel.getRangeAt(0);
    const node = range.startContainer;
    const blockEl = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
    const editableField = blockEl.closest('[data-edit-text]');
    if (!editableField) return false;

    // Walk up to find the block-level element (p, h2, li, blockquote, etc.)
    const blockNode = blockEl.closest('p, h1, h2, h3, h4, h5, h6, li, blockquote, div[data-node-id]')
                      || editableField;

    // Get text from start of block node to cursor position
    const textRange = document.createRange();
    textRange.setStart(blockNode, 0);
    textRange.setEnd(range.startContainer, range.startOffset);
    // Strip ZWS/NBSP artifacts from contenteditable — they prevent exact pattern matches
    const textBeforeCursor = this.stripZeroWidthSpaces(textRange.toString());
    log('Markdown check - textBeforeCursor:', JSON.stringify(textBeforeCursor));

    // Block-level patterns: entire text must match (longer patterns first)
    // Skip when cursor is inside a list item — block-level shortcuts
    // should only convert paragraphs, not transform existing list items
    const isInsideListItem = blockNode.nodeName === 'LI' || !!blockEl.closest('li');
    if (!isInsideListItem) {
      const blockPatterns = [
        { markup: '###', type: 'h3' },
        { markup: '##', type: 'h2' },
        { markup: '>', type: 'blockquote' },
        { markup: '1.', type: 'ol' },
        { markup: '1)', type: 'ol' },
        { markup: '-', type: 'ul' },
        { markup: '+', type: 'ul' },
      ];

      for (const pattern of blockPatterns) {
        if (textBeforeCursor === pattern.markup) {
          log('Markdown block shortcut detected:', pattern.markup, '→', pattern.type);
          this.sendTransformRequest(blockUid, 'markdown', {
            markdownType: 'block',
            blockType: pattern.type,
          });
          return true;
        }
      }

      // Check * separately for block-level (UL) — only when it's the full text
      // This avoids conflict with inline *text* pattern
      if (textBeforeCursor === '*') {
        log('Markdown block shortcut detected: * → ul');
        this.sendTransformRequest(blockUid, 'markdown', {
          markdownType: 'block',
          blockType: 'ul',
        });
        return true;
      }
    }

    // Inline patterns: **text**, __text__, ~~text~~, *text*, _text_
    // Longer delimiters checked first to avoid false matches
    const inlinePatterns = [
      { between: ['**', '**'], type: 'strong' },
      { between: ['__', '__'], type: 'strong' },
      { between: ['~~', '~~'], type: 'del' },
      { between: ['*', '*'], type: 'em' },
      { between: ['_', '_'], type: 'em' },
    ];

    for (const pattern of inlinePatterns) {
      const [open, close] = pattern.between;
      if (!textBeforeCursor.endsWith(close)) continue;
      // Find the opening delimiter before the closing one
      const searchText = textBeforeCursor.slice(0, -close.length);
      const openIdx = searchText.lastIndexOf(open);
      if (openIdx === -1) continue;
      const inner = searchText.slice(openIdx + open.length);
      if (inner.length === 0 || inner.trim() !== inner) continue;
      // Opening delimiter must be preceded by whitespace or be at start
      if (openIdx > 0 && !/\s/.test(searchText[openIdx - 1])) continue;
      log('Markdown inline shortcut detected:', open + '...' + close, '→', pattern.type);
      this.sendTransformRequest(blockUid, 'markdown', {
        markdownType: 'inline',
        inlineType: pattern.type,
      });
      return true;
    }

    return false;
  }

  /**
   * Gets all DOM elements for a block UID.
   * A block may render as multiple elements (e.g., listing block renders multiple cards).
   * For template instances (virtual containers), returns elements from all child blocks.
   *
   * @param {string} blockUid - The block UID to find elements for
   * @returns {Array} All elements for the block (array, not NodeList, for template instances)
   */
  getAllBlockElements(blockUid) {
    // Check if this is a template instance (virtual container)
    // Template instances don't have DOM elements - their children do
    const pathInfo = this.blockPathMap?.[blockUid];
    if (pathInfo?.isTemplateInstance) {
      const childBlockIds = Object.entries(this.blockPathMap)
        .filter(([, info]) => info.parentId === blockUid)
        .map(([id]) => id);
      log('getAllBlockElements: template instance', blockUid, 'childBlockIds:', childBlockIds);
      // Get elements for all child blocks and flatten
      const elements = childBlockIds.flatMap(id => [...document.querySelectorAll(`[data-block-uid="${id}"]`)]);
      log('getAllBlockElements: found', elements.length, 'elements for template instance');
      return elements;
    }
    const elements = document.querySelectorAll(`[data-block-uid="${blockUid}"]`);
    if (elements.length === 0) {
      log('getAllBlockElements: no DOM elements for', blockUid, 'pathInfo:', pathInfo ? 'exists' : 'missing', 'isTemplateInstance:', pathInfo?.isTemplateInstance);
    }
    return elements;
  }

  /**
   * Computes a bounding box that encompasses all given elements.
   * Used for multi-element blocks where one block renders as multiple DOM elements.
   *
   * @param {NodeList|Array} elements - Elements to compute bounding box for
   * @returns {Object|null} Bounding box with {top, left, width, height, right, bottom} or null if no elements
   */
  getBoundingBoxForElements(elements) {
    if (!elements || elements.length === 0) return null;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const el of elements) {
      const rect = el.getBoundingClientRect();
      // Skip zero-size elements (might be hidden or not rendered yet)
      if (rect.width === 0 && rect.height === 0) continue;
      minX = Math.min(minX, rect.left);
      minY = Math.min(minY, rect.top);
      maxX = Math.max(maxX, rect.right);
      maxY = Math.max(maxY, rect.bottom);
    }

    // If all elements were zero-size, return null
    if (minX === Infinity) return null;

    return {
      top: minY,
      left: minX,
      width: maxX - minX,
      height: maxY - minY,
      right: maxX,
      bottom: maxY,
    };
  }

  /**
   * Centralized method to send BLOCK_SELECTED message to Admin UI.
   * Ensures all required fields are always present.
   *
   * @param {string} src - Source identifier for debugging (e.g., 'selectBlock', 'resizeObserver')
   * @param {HTMLElement|null} blockElement - The block element (null for deselection)
   * @param {Object} options - Optional overrides
   * @param {string} [options.focusedFieldName] - Override focused field name
   * @param {Object} [options.selection] - Serialized selection to include
   */
  sendBlockSelected(src, blockElement, options = {}) {
    // Suppress position-tracking updates during carousel/selector navigation
    // Allow initial selection sources (fieldFocusListener, selectionChangeListener, etc.) through
    // so the admin UI can show the sidebar and toolbar for the newly selected block
    if (this._blockSelectorNavigating) {
      const isPositionTrackingSource = src === 'transitionTracker' || src === 'transitionEnd' || src === 'scrollHandler';
      if (isPositionTrackingSource) {
        return;
      }
    }

    // Get blockUid from options or element attribute
    const blockUid = options.blockUid || blockElement?.getAttribute('data-block-uid') || PAGE_BLOCK_UID;

    // Deselection case - no element and no blockUid in options
    if (!blockElement && !options.blockUid) {
      this.sendMessageToParent({
        type: 'BLOCK_SELECTED',
        src,
        blockUid: null,
        rect: null,
      }, this.adminOrigin);
      return;
    }

    // Get all elements for this block (multi-element blocks, template instances)
    const allElements = blockUid !== PAGE_BLOCK_UID ? this.getAllBlockElements(blockUid) : [];

    // Use first element for field detection if no element was passed
    const elementForFields = blockElement || allElements[0] || null;

    // Compute rect from all elements (combined bounding box for multi-element)
    let rect;
    if (allElements.length > 0) {
      rect = this.getBoundingBoxForElements(allElements);
      // Fall back to single element rect if bounding box computation failed
      if (!rect && elementForFields) {
        const singleRect = elementForFields.getBoundingClientRect();
        rect = { top: singleRect.top, left: singleRect.left, width: singleRect.width, height: singleRect.height };
      }
    } else if (elementForFields) {
      // Page-level field or single element: use its rect directly
      const singleRect = elementForFields.getBoundingClientRect();
      rect = { top: singleRect.top, left: singleRect.left, width: singleRect.width, height: singleRect.height };
    }

    // For field operations, use elementForFields (first element if none passed)
    const editableFields = elementForFields ? this.getEditableFields(elementForFields) : {};
    const linkableFields = elementForFields ? this.getLinkableFields(elementForFields) : {};
    const mediaFields = elementForFields ? this.getMediaFields(elementForFields) : {};
    const addDirection = elementForFields ? this.getAddDirection(elementForFields) : 'bottom';
    const focusedFieldName = options.focusedFieldName !== undefined
      ? options.focusedFieldName
      : this.focusedFieldName;
    const focusedLinkableField = options.focusedLinkableField !== undefined
      ? options.focusedLinkableField
      : this.focusedLinkableField;
    const focusedMediaField = options.focusedMediaField !== undefined
      ? options.focusedMediaField
      : this.focusedMediaField;

    // Update iframe drag handle position using the same rect
    // This ensures alignment with Volto toolbar which uses this rect
    const dragHandle = document.querySelector('.volto-hydra-drag-button');
    if (dragHandle && blockUid && blockUid !== PAGE_BLOCK_UID) {
      const handlePos = calculateDragHandlePosition(rect);
      dragHandle.style.left = `${handlePos.left}px`;
      dragHandle.style.top = `${handlePos.top}px`;
      dragHandle.style.display = 'block';
    }

    const message = {
      type: 'BLOCK_SELECTED',
      src,
      blockUid,
      rect: {
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      },
      editableFields,
      linkableFields,
      mediaFields,
      focusedFieldName,
      focusedLinkableField,
      focusedMediaField,
      addDirection,
      isMultiElement: blockUid && blockUid !== PAGE_BLOCK_UID ? this.getAllBlockElements(blockUid).length > 1 : false,
    };

    // Include selection if provided
    if (options.selection !== undefined) {
      message.selection = options.selection;
    }

    window.parent.postMessage(message, this.adminOrigin);
  }

  /**
   * Shows a developer warning overlay in the iframe.
   * Used to alert developers about configuration issues.
   *
   * @param {string} title - Warning title
   * @param {string} message - Detailed message with DOM info
   */
  showDeveloperWarning(title, message) {
    // Create overlay
    const overlay = document.createElement('div');
    overlay.id = 'hydra-dev-warning';
    overlay.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      max-width: 500px;
      max-height: 80vh;
      background: #fef2f2;
      border: 2px solid #dc2626;
      border-radius: 8px;
      padding: 16px;
      z-index: 999999;
      font-family: ui-monospace, monospace;
      font-size: 12px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.2);
      overflow: auto;
    `;

    overlay.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
        <strong style="color: #dc2626; font-size: 14px;">⚠️ ${title}</strong>
        <button id="hydra-warning-close" style="background: none; border: none; cursor: pointer; font-size: 18px; color: #666;">&times;</button>
      </div>
      <pre style="white-space: pre-wrap; word-break: break-word; margin: 0; color: #1f2937;">${message}</pre>
    `;

    document.body.appendChild(overlay);

    // Close button
    document.getElementById('hydra-warning-close')?.addEventListener('click', () => {
      overlay.remove();
    });

    // Auto-hide after 30 seconds
    setTimeout(() => overlay.remove(), 30000);
  }

  ////////////////////////////////////////////////////////////////////////////////
  // Bridge Class Initialization and Navigation Event Handling
  ////////////////////////////////////////////////////////////////////////////////

  /**
   * Initializes the bridge, setting up event listeners and communication channels.
   *
   * @typedef {import('@plone/registry').ConfigData} VoltoConfigData
   * @param {Object} options - Options for initialization.
   * @param {string[]} options.allowedBlocks - List of allowed blocks.
   * @param {VoltoConfigData} options.voltoConfig - Extra config to add to Volto in edit mode.
   */
  init(options = {}) {
    if (typeof window === 'undefined') {
      return; // Exit if not in a browser environment
    }

    if (window.self !== window.top) {
      // ... (iframe-specific setup: navigation detection, token retrieval, etc.)
      // This will set the listners for hashchange & pushstate
      function detectNavigation(callback) {
        let currentUrl = window.location.href;
        log('Setting up navigation detection, currentUrl:', currentUrl);

        function checkNavigation() {
          const newUrl = window.location.href;
          if (newUrl !== currentUrl) {
            log('Navigation detected:', currentUrl, '->', newUrl);
            callback(currentUrl);
            currentUrl = newUrl;
          }
        }

        // Handle hash changes & popstate events (only happens when browser back/forward buttons is clicked)
        window.addEventListener('hashchange', checkNavigation);
        window.addEventListener('popstate', checkNavigation);

        // Intercept pushState and replaceState to detect navigation changes
        const originalPushState = window.history.pushState;
        window.history.pushState = function (...args) {
          originalPushState.apply(this, args);
          checkNavigation();
        };

        const originalReplaceState = window.history.replaceState;
        window.history.replaceState = function (...args) {
          originalReplaceState.apply(this, args);
          checkNavigation();
        };

        // Fallback: poll for URL changes every 200ms
        // This catches navigation from frameworks that cache history.pushState
        // before hydra.js patches it (e.g., Vue Router in Nuxt)
        setInterval(() => {
          checkNavigation();
        }, 200);

        // Modern Navigation API (Chrome 102+) - more reliable than polling
        if (typeof navigation !== 'undefined') {
          navigation.addEventListener('navigatesuccess', checkNavigation);
        }
      }

      log('Setting up detectNavigation with adminOrigin:', this.adminOrigin);
      detectNavigation((currentUrl) => {
        const currentUrlObj = new URL(currentUrl);
        if (window.location.pathname !== currentUrlObj.pathname) {
          const apiPath = this.pathToApiPath(window.location.pathname);
          // Check if this is in-page navigation (e.g., paging link with data-linkable-allow)
          const inPageNavTime = sessionStorage.getItem('hydra_in_page_nav_time');
          const isInPage = inPageNavTime && (Date.now() - parseInt(inPageNavTime, 10)) < 5000;
          if (isInPage) {
            sessionStorage.removeItem('hydra_in_page_nav_time');
          }
          log('Sending PATH_CHANGE:', window.location.pathname, '-> apiPath:', apiPath, 'inPage:', !!isInPage, 'to', this.adminOrigin);
          window.parent.postMessage(
            {
              type: 'PATH_CHANGE',
              path: apiPath,
              inPage: !!isInPage,
            },
            this.adminOrigin,
          );
          // Update lastKnownPath so initBridge re-init won't send a duplicate PATH_CHANGE
          this.lastKnownPath = window.location.pathname;
        } else if (window.location.hash !== currentUrlObj.hash) {
          const hash = window.location.hash;
          const i = hash.indexOf('/');
          const rawPath = i !== -1 ? hash.slice(i) || '/' : '/';
          const apiPath = this.pathToApiPath(rawPath);
          log('Sending PATH_CHANGE (hash):', rawPath, '-> apiPath:', apiPath, 'to', this.adminOrigin);
          window.parent.postMessage(
            {
              type: 'PATH_CHANGE',
              path: apiPath,
            },
            this.adminOrigin,
          );
        }
      });

      // Hydra bridge is enabled via iframe name (persists across navigation)
      // Format: hydra-edit:<origin> or hydra-view:<origin>
      // Also check _edit URL param as fallback (ensures reload on mode change)
      const url = new URL(window.location.href);
      const editParam = url.searchParams.get('_edit');
      const isHydraEdit = window.name.startsWith('hydra-edit:') || editParam === 'true';
      const isHydraView = window.name.startsWith('hydra-view:') || (editParam === 'false');
      const hydraBridgeEnabled = isHydraEdit || isHydraView || editParam !== null;
      const isEditMode = isHydraEdit;

      // Extract admin origin from iframe name
      if ((isHydraEdit || isHydraView) && !this.adminOrigin) {
        const prefix = isHydraEdit ? 'hydra-edit:' : 'hydra-view:';
        this.adminOrigin = window.name.slice(prefix.length);
        log('Got admin origin from window.name:', this.adminOrigin);
      }

      // Get the access token from URL or sessionStorage
      let access_token = url.searchParams.get('access_token');
      const hasUrlToken = !!access_token;

      // Store token in sessionStorage if found in URL, or retrieve from sessionStorage
      if (access_token) {
        sessionStorage.setItem('hydra_access_token', access_token);
        log('Stored access_token in sessionStorage');
      } else {
        access_token = sessionStorage.getItem('hydra_access_token');
        log('Retrieved access_token from sessionStorage:', access_token ? 'found' : 'not found');
      }

      if (access_token) {
        this.token = access_token;
        this._setTokenCookie(access_token);
      }

      // In view mode, we only need navigation detection (already set up above)
      // Skip all the edit mode setup to avoid slowing down page load
      if (isEditMode) {
        this.enableBlockClickListener();
        this.injectCSS();
        this.listenForSelectBlockMessage();
        this.setupScrollHandler();
        this.setupResizeHandler();
        this.setupMouseActivityReporter();

        // Add beforeunload warning to prevent accidental navigation
        window.addEventListener('beforeunload', (e) => {
          // Skip warning for explicitly allowed link navigation (e.g., paging)
          if (this._allowLinkNavigation) {
            this._allowLinkNavigation = false;
            return;
          }
          e.preventDefault();
          e.returnValue = '';
          return '';
        });

        // Send single INIT message with config - admin merges config before responding
        // This ensures blockPathMap is built with complete schema knowledge
        // Include current path so admin can navigate if iframe URL differs (e.g., after client-side nav)
        // Support hash-based routing variants: #/path, #!/path, #path
        let currentPath = window.location.pathname;
        const hash = window.location.hash;
        if (hash) {
          // Find where the path starts in the hash
          const pathIndex = hash.indexOf('/');
          if (pathIndex !== -1) {
            currentPath = hash.slice(pathIndex); // Extract /path from #/path or #!/path
          }
        }

        // Check if this is SPA navigation:
        // - window.name indicates we're in admin iframe (hydra-edit:...)
        // - No token in URL (not admin-initiated navigation)
        // - But we DO have a token in sessionStorage (we were previously initialized)
        // Without stored token, it's initial load even if URL has no token (e.g., mock-parent tests)
        const hasStoredToken = !!sessionStorage.getItem('hydra_access_token');
        const isSpaNavigation = isHydraEdit && !hasUrlToken && hasStoredToken;

        // Check if this is in-page navigation (e.g., paging) - send PATH_CHANGE with inPage flag
        const inPageNavTime = sessionStorage.getItem('hydra_in_page_nav_time');
        const isInPageNavigation = inPageNavTime && (Date.now() - parseInt(inPageNavTime, 10)) < 5000;
        if (isInPageNavigation) {
          sessionStorage.removeItem('hydra_in_page_nav_time');
          const apiPath = this.pathToApiPath(currentPath);
          log('In-page navigation detected (paging), sending PATH_CHANGE with inPage flag, apiPath:', apiPath);
          window.parent.postMessage(
            { type: 'PATH_CHANGE', path: apiPath, inPage: true },
            this.adminOrigin,
          );
          // Admin will resend form data without changing URL
        } else if (isSpaNavigation) {
          const apiPath = this.pathToApiPath(currentPath);
          log('SPA navigation detected (window.name present, access_token missing), sending PATH_CHANGE, apiPath:', apiPath);
          window.parent.postMessage(
            { type: 'PATH_CHANGE', path: apiPath },
            this.adminOrigin,
          );
          // Don't send INIT - admin will just update its URL
        } else {
          const initMessage = {
            type: 'INIT',
            currentPath: this.pathToApiPath(currentPath),
          };
          if (options?.page) {
            initMessage.page = options.page;
          }
          if (options?.blocks) {
            initMessage.blocks = options.blocks;
          }
          if (options?.voltoConfig) {
            initMessage.voltoConfig = options.voltoConfig;
          }
          window.parent.postMessage(initMessage, this.adminOrigin);
        }

        const receiveInitialData = (e) => {
          if (e.origin === this.adminOrigin) {
            if (e.data.type === 'INITIAL_DATA') {
              // Central method sets formData, lastReceivedFormData, and blockPathMap
              this.setFormDataFromAdmin(e.data.data, 'INITIAL_DATA', e.data.blockPathMap);

              // Store Slate configuration for keyboard shortcuts and toolbar
              this.slateConfig = e.data.slateConfig || { hotkeys: {}, toolbarButtons: [] };

              // Add nodeIds to all slate fields in all blocks
              this.addNodeIdsToAllSlateFields();

              // Trigger initial render through shared render path
              if (this.onContentChangeCallback) {
                this._executeRender(this.onContentChangeCallback);
              }

              // Focus the iframe window so keyboard events reach it on page load.
              // Must happen inside the iframe (window.focus()) because the parent
              // cannot call contentWindow.focus() on a cross-origin iframe.
              window.focus();

              // Mark bridge as initialized — block selection is now allowed
              this.initialized = true;

              // Restore block selection if provided (e.g., after adding a new block)
              if (e.data.selectedBlockUid) {
                const blockUidToSelect = e.data.selectedBlockUid;
                const bridge = this;
                // Wait for element to appear AND position to stabilize before selecting
                // This prevents race conditions during frontend re-render/animation
                let lastRect = null;
                let stableCount = 0;
                const STABLE_THRESHOLD = 3;
                const POSITION_TOLERANCE = 2; // pixels
                const MAX_RETRIES = 40; // ~2 seconds at 50ms interval

                const waitForStable = (retries = MAX_RETRIES) => {
                  const element = this.queryBlockElement(blockUidToSelect);
                  if (!element) {
                    if (retries > 0) {
                      bridge._pendingInitialSelectTimer = setTimeout(() => waitForStable(retries - 1), 50);
                    } else {
                      bridge._pendingInitialSelectTimer = null;
                      log('Could not find element for selectedBlockUid:', blockUidToSelect);
                    }
                    return;
                  }

                  const rect = element.getBoundingClientRect();
                  const positionStable = lastRect !== null &&
                    Math.abs(rect.left - lastRect.left) < POSITION_TOLERANCE &&
                    Math.abs(rect.top - lastRect.top) < POSITION_TOLERANCE;

                  if (positionStable) {
                    stableCount++;
                  } else {
                    stableCount = 0;
                  }
                  lastRect = rect;

                  if (stableCount >= STABLE_THRESHOLD) {
                    bridge._pendingInitialSelectTimer = null;
                    bridge.selectBlock(blockUidToSelect);
                  } else if (retries > 0) {
                    bridge._pendingInitialSelectTimer = setTimeout(() => waitForStable(retries - 1), 50);
                  } else {
                    // Timed out waiting for stable - select anyway
                    bridge._pendingInitialSelectTimer = null;
                    bridge.selectBlock(blockUidToSelect);
                  }
                };
                waitForStable();
              }
            }
          }
        };
        window.removeEventListener('message', receiveInitialData);
        window.addEventListener('message', receiveInitialData);
        // Add a single document-level focus listener to track field changes
        // This avoids adding duplicate listeners and works for all blocks
        if (!this.fieldFocusListenerAdded) {
          this.fieldFocusListenerAdded = true;
          // Track mouse button state so fieldFocusListener can distinguish
          // keyboard navigation (Tab) from mouse click side-effects.
          // During mouse clicks, the click handler handles block selection —
          // the focus event between mousedown and click must not call selectBlock
          // because restoreContentEditableOnFields would change the DOM and
          // shift event.target before the click event fires.
          document.addEventListener('mousedown', () => { this._mouseButtonDown = true; }, true);
          document.addEventListener('mouseup', () => { this._mouseButtonDown = false; }, true);
          document.addEventListener('focus', (e) => {
            const target = e.target;
            const blockElement = target.closest('[data-block-uid]');
            const blockUid = blockElement?.getAttribute('data-block-uid');
            if (!blockUid || !this.selectedBlockUid) return;

            if (blockUid !== this.selectedBlockUid) {
              // Skip if block-selector or arrow-key navigation is in progress —
              // those flows manage their own block selection
              if (this._blockSelectorNavigating || this._navigatingToBlock) {
                return;
              }
              // During mouse clicks, defer to the click handler for block selection.
              // The focus event fires between mousedown and click — calling selectBlock
              // here would run restoreContentEditableOnFields before click, which can
              // change event.target and break linkable/media field detection.
              if (this._mouseButtonDown) {
                return;
              }
              // Focus moved to a different block (e.g., via Tab) — select it
              log('Focus moved to different block:', blockUid, 'from:', this.selectedBlockUid);
              // Cancel any pending initial-selection — user navigated away
              if (this._pendingInitialSelectTimer) {
                clearTimeout(this._pendingInitialSelectTimer);
                this._pendingInitialSelectTimer = null;
              }
              this.selectBlock(blockElement);
              return;
            }

            // Focus changed within the currently selected block
            const editableField = target.getAttribute('data-edit-text');
            if (editableField) {
              log('Field focused:', editableField);
              const previousFieldName = this.focusedFieldName;
              this.focusedFieldName = editableField;

              // Only update toolbar if field actually changed
              if (previousFieldName !== editableField) {
                log('Field changed from', previousFieldName, 'to', editableField, '- updating toolbar');
                const blockEl = this.queryBlockElement(blockUid);
                if (blockEl) {
                  this.sendBlockSelected('fieldFocusListener', blockEl, { focusedFieldName: editableField });
                }
              }
            }
          }, true); // Use capture phase to catch focus events before they bubble
        }
      } else if (isHydraView) {
        // View mode: just send INIT so admin knows the current path (no edit setup needed)
        let currentPath = window.location.pathname;
        const hash = window.location.hash;
        if (hash) {
          const pathIndex = hash.indexOf('/');
          if (pathIndex !== -1) {
            currentPath = hash.slice(pathIndex);
          }
        }
        window.parent.postMessage(
          { type: 'INIT', currentPath: this.pathToApiPath(currentPath) },
          this.adminOrigin,
        );
      }
    }
  }

  /**
   * Sets the access token in a cookie.
   *
   * @param {string} token - The access token to store.
   * @private
   */
  _setTokenCookie(token) {
    const expiryDate = new Date();
    expiryDate.setTime(expiryDate.getTime() + 12 * 60 * 60 * 1000); // 12 hours

    const url = new URL(window.location.href);
    const domain = url.hostname;
    document.cookie = `access_token=${token}; expires=${expiryDate.toUTCString()}; path=/; domain=${domain}; SameSite=None; Secure`;
  }

  ////////////////////////////////////////////////////////////////////////////////
  // Real-time Data Handling and Quanta Toolbar Creation
  ////////////////////////////////////////////////////////////////////////////////

  /**
   * Registers a callback to handle real-time data updates from the adminUI.
   *
   * @param {function} callback - The function to call when form data is received.
   */
  onEditChange(callback) {
    // Store callback so INITIAL_DATA handler can use it
    this.onContentChangeCallback = callback;
    this.realTimeDataHandler = (event) => {
      if (
        event.origin === this.adminOrigin ||
        event.origin === window.location.origin
      ) {
        if (
          event.data.type === 'FORM_DATA' ||
          event.data.type === 'TOGGLE_MARK_DONE'
        ) {
          log('Received', event.data.type, 'message');
          if (event.data.data) {
            // Don't set isInlineEditing to false - user is still editing
            // Check if focused field content changed - if so, this is a sidebar edit,
            // not just a sync. Clear savedClickPosition to prevent stealing focus.
            if (this.savedClickPosition && !this.focusedFieldValuesEqual(this.formData, event.data.data)) {
              log('FORM_DATA: content changed, clearing savedClickPosition (sidebar edit)');
              this.savedClickPosition = null;
            }

            // Check if Admin wants to select a different block (e.g., after Enter creates new block)
            // NOTE: Don't set this.selectedBlockUid here - let selectBlock() set it so isSelectingSameBlock
            // is calculated correctly (important for scroll-into-view behavior)
            const adminSelectedBlockUid = event.data.selectedBlockUid;
            const needsBlockSwitch = adminSelectedBlockUid && adminSelectedBlockUid !== this.selectedBlockUid;
            if (needsBlockSwitch) {
              log('Switching selectedBlockUid from', this.selectedBlockUid, 'to', adminSelectedBlockUid);
            }

            // Check if incoming FORM_DATA is stale (our local sequence is higher)
            // EXCEPTION: Never reject format responses - they have formatRequestId and are
            // the result of a format operation we requested
            const incomingSeq = event.data.data?._editSequence || 0;
            const localSeq = this.formData?._editSequence || 0;
            const isFormatResponse = !!event.data.formatRequestId;
            const isStale = incomingSeq < localSeq && !isFormatResponse;

            if (isStale) {
              log('FORM_DATA: skipping stale data, incoming seq:', incomingSeq, 'local seq:', localSeq,
                  'isFormatResponse:', isFormatResponse, 'blockedBlockId:', this.blockedBlockId);
              // Don't unblock here - the stale FORM_DATA is not the response we're waiting for
              // Wait for the actual format response (which will have formatRequestId)
              return;
            }

            // Central method for setting form data with logging (also sets blockPathMap)
            if (event.data.blockPathMap === undefined) {
              log('WARNING: FORM_DATA received without blockPathMap!',
                'message keys:', Object.keys(event.data),
                'hasData:', !!event.data.data,
                'formatRequestId:', event.data.formatRequestId,
                'selectedBlockUid:', event.data.selectedBlockUid);
            }
            this.setFormDataFromAdmin(event.data.data, 'FORM_DATA', event.data.blockPathMap);

            // === Non-stale FORM_DATA - apply it fully ===

            // Add nodeIds to all slate blocks before rendering
            // Admin UI never sends nodeIds, so we always need to add them
            this.addNodeIdsToAllSlateFields();

            // Extract formatRequestId early so it's available in rAF callbacks
            const formatRequestId = event.data.formatRequestId;

            // If a render is already in progress, queue this FORM_DATA.
            // Processing two concurrent renders causes MutationObserver to fire
            // mid-render, corrupting formData. Process the queue after the
            // current render's afterContentRender completes.
            if (this._renderInProgress) {
              log('FORM_DATA: render in progress, queuing');
              this._formDataQueue = event.data;
              return;
            }
            // Set expectedSelectionFromAdmin BEFORE the render so that any
            // selectionchange from DOM re-render is suppressed. Without this,
            // the selectionchange fires before afterContentRender's double-rAF
            // sets it, sending a stale [0,0] selection back to the admin.
            if (event.data.transformedSelection) {
              this.expectedSelectionFromAdmin = event.data.transformedSelection;
            }
            // skipRender: data didn't change (e.g. link cancel) — skip the
            // framework re-render but still run afterContentRender for
            // selection restore, unblock, observer reattachment, etc.
            const renderFn = event.data.skipRender ? () => {} : callback;
            log(event.data.skipRender
              ? 'FORM_DATA: skipRender — running afterContentRender without re-render'
              : 'Calling onEditChange callback to trigger re-render');
            this._executeRender(renderFn, {
              transformedSelection: event.data.transformedSelection,
              formatRequestId,
              needsBlockSwitch,
              adminSelectedBlockUid,
              skipRender: !!event.data.skipRender,
            });
          } else {
            throw new Error('No form data has been sent from the adminUI');
          }
        } else if (event.data.type === 'FLUSH_BUFFER') {
          // Parent is requesting a buffer flush before applying format
          // This ensures the parent's Slate editor has the latest text
          const requestId = event.data.requestId;
          log('Received FLUSH_BUFFER request, requestId:', requestId, 'savedSelection:', this.savedSelection);

          // If a render is in progress, defer FLUSH_BUFFER until afterContentRender
          // completes. During render, DOM nodes may be detached (nodeIds stripped),
          // and serializeSelection() would fail. Process it once the DOM is stable.
          if (this._renderInProgress) {
            log('FLUSH_BUFFER: render in progress, queuing');
            this._flushBufferQueue = event.data;
            return;
          }

          this._processFlushBuffer(requestId);
        } else if (event.data.type === 'SLATE_ERROR') {
          // Handle errors from Slate formatting operations
          console.error('[HYDRA] Received SLATE_ERROR:', event.data.error);
          const blockId = event.data.blockId;

          // Clear the processing state if it matches this block
          if (blockId && this.pendingTransform?.blockId === blockId) {
            log('Clearing processing state due to SLATE_ERROR');
            this.setBlockProcessing(blockId, false);
          }
        } else if (event.data.type === 'FOCUS_FIELD') {
          // Restore focus to a specific field (e.g., after LinkEditor closes)
          const { blockId, fieldName } = event.data;
          log('Received FOCUS_FIELD:', blockId, fieldName);

          const blockElement = this.queryBlockElement(blockId);
          if (blockElement) {
            // Find the specific field by data-field-id attribute
            const field = blockElement.querySelector(`[data-field-id="${fieldName}"][contenteditable="true"]`);
            if (field) {
              field.focus();
              log('Focused field:', fieldName);
            } else {
              // Fallback to first editable field if specific field not found
              const firstEditable = this.getOwnFirstEditableField(blockElement);
              if (firstEditable) {
                firstEditable.focus();
                log('Focused first editable field (fallback)');
              }
            }
          }
        } else if (event.data.type === 'SLASH_MENU_CLOSED') {
          // Admin closed the slash menu (user selected a block type or dismissed)
          log('Received SLASH_MENU_CLOSED');
          this._slashMenuActive = false;
        } else if (event.data.type === 'TEMPLATE_EDIT_MODE') {
          // Toggle template edit mode - affects which blocks are editable via isBlockReadonly
          // instanceId: the template instance being edited, or null to exit edit mode
          this.templateEditMode = event.data.instanceId;
          log('Template edit mode:', this.templateEditMode ? `editing instance ${this.templateEditMode}` : 'disabled');

          // Update visual state of all blocks (grey out readonly blocks)
          this.applyReadonlyVisuals();

          // Refresh contenteditable on the currently selected block
          if (this.selectedBlockUid) {
            const blockElement = this.queryBlockElement(this.selectedBlockUid);
            if (blockElement) {
              this.restoreContentEditableOnFields(blockElement, 'TEMPLATE_EDIT_MODE');
            }
          }
        }
      }
    };

    // Ensure we don't add multiple listeners
    window.removeEventListener('message', this.realTimeDataHandler);
    window.addEventListener('message', this.realTimeDataHandler);
  }

  /**
   * Detects which field should be focused and updates the toolbar accordingly.
   * Called after DOM updates to ensure editable fields exist.
   * Also sets contenteditable on text and slate fields.
   *
   * @param {string} blockUid - The UID of the block to detect field for.
   */
  detectFocusedFieldAndUpdateToolbar(blockUid) {
    const blockElement = this.queryBlockElement(blockUid);
    if (!blockElement) {
      log('Block element not found for field detection:', blockUid);
      return;
    }

    // Set contenteditable on text and slate fields
    this.restoreContentEditableOnFields(blockElement, 'detectFocusedFieldAndUpdateToolbar');

    let fieldToFocus = null;

    if (this.lastClickPosition?.target) {
      // Find the clicked editable field - only accept if it belongs to THIS block
      const clickedElement = this.lastClickPosition.target;
      const clickedField = clickedElement.closest('[data-edit-text]');
      log('Click event path - found clickedField:', !!clickedField);
      if (clickedField && this.fieldBelongsToBlock(clickedField, blockElement)) {
        fieldToFocus = clickedField.getAttribute('data-edit-text');
        log('Got field from click:', fieldToFocus);
      }
    }

    // If no clicked field found, use the first editable field that belongs to THIS block
    if (!fieldToFocus) {
      const firstEditableField = this.getOwnFirstEditableField(blockElement);
      log('querySelector path - found:', !!firstEditableField);
      if (firstEditableField) {
        fieldToFocus = firstEditableField.getAttribute('data-edit-text');
        log('Got field from querySelector:', fieldToFocus);
      }
    }

    // Update focusedFieldName and recreate toolbar if field changed
    if (fieldToFocus !== this.focusedFieldName) {
      log('Updating focusedFieldName from', this.focusedFieldName, 'to', fieldToFocus);
      this.focusedFieldName = fieldToFocus;

      // Send BLOCK_SELECTED message to update toolbar visibility
      const blockElement = this.queryBlockElement(blockUid);
      if (blockElement) {
        this.sendBlockSelected('detectFieldChange', blockElement, { focusedFieldName: fieldToFocus });
      }
    }
  }

  /**
   * Creates the Quanta toolbar for the selected block.
   *
   * @param {string} blockUid - The UID of the selected block.
   * @param {Object} show - Options for showing/hiding toolbar elements:
   *   - formatBtns: Whether to show format buttons (true/false).
   */
  enableBlockClickListener() {
    this.blockClickHandler = (event) => {
      log('blockClickHandler: event target:', event.target.tagName, event.target.className);
      log('blockClickHandler: _isDragging:', this._isDragging, '_navigatingToBlock:', this._navigatingToBlock);

      // Handle data-block-selector clicks (carousel nav buttons, etc.)
      // Don't stopPropagation or preventDefault - let frontend handle visibility changes
      // Skip if tryMakeBlockVisible is currently navigating (to avoid interference)
      const selectorElement = event.target.closest('[data-block-selector]');
      if (selectorElement) {
        if (this._navigatingToBlock) {
          log('blockClickHandler: skipping handleBlockSelector, tryMakeBlockVisible in progress');
          return;
        }
        const selector = selectorElement.getAttribute('data-block-selector');
        this.handleBlockSelector(selector, selectorElement);
        return;
      }

      // Defer block selection until INITIAL_DATA is received and render completes.
      // Save the click point and poll until init + render are done, then resolve
      // the block via elementFromPoint (DOM may re-render during init).
      if (!this.initialized) {
        log('blockClickHandler: deferred — INITIAL_DATA not yet received');
        const x = event.clientX;
        const y = event.clientY;
        const bridge = this;
        const waitForInit = () => {
          if (bridge.initialized && !bridge._renderInProgress) {
            const el = document.elementFromPoint(x, y);
            const blockEl = el?.closest('[data-block-uid]');
            if (blockEl) {
              log('Processing deferred block click, uid:', blockEl.getAttribute('data-block-uid'));
              bridge.selectBlock(blockEl);
            }
          } else {
            setTimeout(waitForInit, 50);
          }
        };
        setTimeout(waitForInit, 50);
        return;
      }

      // Skip block selection during carousel/selector navigation
      // (a click on the carousel button can also trigger blockClickHandler for the old slide)
      if (this._blockSelectorNavigating) {
        log('blockClickHandler: skipping, _blockSelectorNavigating active');
        return;
      }

      // Check if clicked element (or ancestor) has data-linkable-allow - allows navigation
      // Works for paging links, checkboxes, selects, etc. regardless of block context
      // Must be checked before blockElement since paging links may be outside block elements
      const allowedElement = event.target.closest('[data-linkable-allow]');
      if (allowedElement) {
        this._allowLinkNavigation = true;
        // Reset flag after short delay if navigation didn't happen
        setTimeout(() => { this._allowLinkNavigation = false; }, 100);
        // Store timestamp for in-page navigation - checked on reload to skip PATH_CHANGE
        sessionStorage.setItem('hydra_in_page_nav_time', String(Date.now()));
      }

      const blockElement = event.target.closest('[data-block-uid]');
      if (blockElement) {
        // Skip synthetic clicks (keyboard activation like space on button) on contenteditable elements
        // event.detail === 0 indicates keyboard-triggered click
        const target = event.target;
        if (target.isContentEditable && event.detail === 0) {
          event.preventDefault(); // Prevent button activation
          return; // Don't re-select block - preserves cursor for text input
        }

        // Check if we're inside a readonly block (e.g., listing items with _blockUid)
        // Readonly blocks ignore editable/linkable/media fields and prevent link navigation
        // Check both DOM attribute and readonly registry
        const blockUid = blockElement.getAttribute('data-block-uid');
        const isInsideReadonly = event.target.closest('[data-block-readonly]') || this.isBlockReadonly(blockUid);

        // Handle link clicks in edit mode
        const linkElement = event.target.closest('a');
        if (linkElement && !allowedElement) {
          // Prevent link navigation inside readonly blocks (skip for data-linkable-allow)
          if (isInsideReadonly) {
            event.preventDefault();
          } else {
            // Only prevent if this is a linkable field (opens link editor in sidebar)
            const isLinkableField = linkElement.closest('[data-edit-link]');
            if (isLinkableField) {
              event.preventDefault();
            }
          }
        }

        // Store click position relative to the editable element for cursor positioning
        // Using relative coordinates ensures focus()/scroll doesn't invalidate the position
        // Also store the target for field detection
        // Inside readonly blocks, ignore editable/linkable/media fields (they're from query results, not editable)
        const clickedEditableField = isInsideReadonly ? null : event.target.closest('[data-edit-text]');
        const editableField = clickedEditableField || (isInsideReadonly ? null : blockElement.querySelector('[data-edit-text]'));

        // Detect clicked linkable and media fields (ignored inside readonly blocks)
        const clickedLinkableField = isInsideReadonly ? null : event.target.closest('[data-edit-link]');
        const clickedMediaField = isInsideReadonly ? null : event.target.closest('[data-edit-media]');

        if (editableField) {
          const rect = editableField.getBoundingClientRect();
          this.lastClickPosition = {
            relativeX: event.clientX - rect.left,
            relativeY: event.clientY - rect.top,
            editableField: editableField.getAttribute('data-edit-text'),
            target: event.target, // For field detection
            linkableField: clickedLinkableField?.getAttribute('data-edit-link') || null,
            mediaField: clickedMediaField?.getAttribute('data-edit-media') || null,
          };
        } else {
          this.lastClickPosition = {
            target: event.target,
            linkableField: clickedLinkableField?.getAttribute('data-edit-link') || null,
            mediaField: clickedMediaField?.getAttribute('data-edit-media') || null,
          };
        }
        // Cancel any pending initial-selection from waitForStable —
        // user click takes priority over automatic block restoration
        if (this._pendingInitialSelectTimer) {
          clearTimeout(this._pendingInitialSelectTimer);
          this._pendingInitialSelectTimer = null;
        }
        this.selectBlock(blockElement);
      } else {
        // No block - check for page-level fields
        const pageField = event.target.closest('[data-edit-media], [data-edit-link], [data-edit-text]');
        if (pageField) {
          event.preventDefault();
          this.selectedBlockUid = PAGE_BLOCK_UID;

          // Detect focused field type
          this.focusedMediaField = pageField.getAttribute('data-edit-media');
          this.focusedLinkableField = pageField.getAttribute('data-edit-link');
          this.focusedFieldName = pageField.getAttribute('data-edit-text');

          // Make page-level text fields editable and focusable
          if (this.focusedFieldName) {
            // Check if field was already editable (user may be re-clicking an edited field)
            const wasAlreadyEditable = pageField.getAttribute('contenteditable') === 'true';

            this.isInlineEditing = true;
            this.activateEditableField(pageField, this.focusedFieldName, null, 'pageFieldClick', {
              wasAlreadyEditable,
              saveClickPosition: true, // Save for FORM_DATA handler after re-render
            });
          }

          // Send BLOCK_SELECTED with pageField as "block" - blockUid will be PAGE_BLOCK_UID
          this.sendBlockSelected('pageFieldClick', pageField);
        } else {
          // No block, no page-level field — check for navigation link clicks.
          // In edit mode, let the browser navigate the iframe naturally so the
          // iframe's beforeunload handler fires a warning dialog. We must
          // stopPropagation to prevent SPA routers (Vue Router, etc.) from
          // intercepting the click as client-side navigation (which wouldn't
          // trigger beforeunload). We do NOT preventDefault — the browser's
          // default <a> navigation is exactly what we want.
          const linkEl = event.target.closest('a[href]');
          if (linkEl && !allowedElement) {
            const href = linkEl.getAttribute('href');
            try {
              const linkUrl = new URL(href, window.location.origin);
              if (linkUrl.origin === window.location.origin) {
                event.stopPropagation();
                log('Nav link click in edit mode — letting browser navigate (triggers beforeunload):', href);
              }
            } catch (e) {
              // Invalid URL - let browser handle it
            }
          }
        }
      }
    };

    document.removeEventListener('click', this.blockClickHandler, true);
    document.addEventListener('click', this.blockClickHandler, true);

    // Set _blockSelectorNavigating on mousedown (before focus fires) so the
    // focus listener doesn't incorrectly select the container block when a
    // block-selector button (e.g., carousel +1/-1) is clicked.
    if (!this._blockSelectorMousedownHandler) {
      this._blockSelectorMousedownHandler = (event) => {
        if (event.target.closest('[data-block-selector]')) {
          this._blockSelectorNavigating = true;
        }
      };
      document.addEventListener('mousedown', this._blockSelectorMousedownHandler, true);
    }

    // Add global keydown handler for space on interactive elements
    // Certain elements (buttons, inputs, summary) have space key behavior that conflicts
    // with text editing when contenteditable. This handler is at document level so it
    // survives DOM re-renders.
    if (!this._interactiveSpaceHandler) {
      this._interactiveSpaceHandler = (e) => {
        if (e.key !== ' ' || !e.target.isContentEditable) return;

        const tag = e.target.tagName;
        const type = e.target.type?.toLowerCase();

        // Elements where space has special activation behavior
        const needsSpaceOverride =
          tag === 'BUTTON' ||
          tag === 'SUMMARY' ||
          (tag === 'INPUT' && (type === 'submit' || type === 'button' || type === 'reset'));

        if (needsSpaceOverride) {
          e.preventDefault();
          document.execCommand('insertText', false, ' ');
        }
      };
      document.addEventListener('keydown', this._interactiveSpaceHandler, true);
    }

    // Add global keydown handler for Escape to select parent block
    // This allows navigating up the block hierarchy with keyboard
    if (!this._escapeKeyHandler) {
      this._escapeKeyHandler = (e) => {
        if (e.key !== 'Escape') return;
        // If no block is selected in iframe, still send deselect to admin —
        // the admin may have a selectedBlock (from Redux) that the iframe
        // hasn't processed yet (e.g., during INITIAL_DATA waitForStable).
        if (!this.selectedBlockUid) {
          this.sendBlockSelected('escapeKey', null);
          return;
        }

        // Don't interfere with escape in modals, dropdowns, etc.
        const isInPopup = e.target.closest('.volto-hydra-dropdown-menu, .blocks-chooser, [role="dialog"]');
        if (isInPopup) return;

        e.preventDefault();

        // Get parent from blockPathMap
        const pathInfo = this.blockPathMap?.[this.selectedBlockUid];
        const parentId = pathInfo?.parentId || null;
        log('Escape key - selecting parent:', parentId, 'from:', this.selectedBlockUid);

        // PAGE_BLOCK_UID is the virtual root - treat as "no parent" (deselect)
        if (parentId && parentId !== PAGE_BLOCK_UID) {
          // Handle template instances (virtual containers with no DOM element)
          if (this.blockPathMap?.[parentId]?.isTemplateInstance) {
            this.selectBlock(parentId);
          } else {
            // Select the parent block
            const parentElement = this.queryBlockElement(parentId);
            if (parentElement) {
              this.selectBlock(parentElement, 'escapeKey');
            }
          }
        } else {
          // No parent or parent is page - deselect by sending BLOCK_SELECTED with null
          this.selectedBlockUid = null;
          this.sendBlockSelected('escapeKey', null);
        }
      };
      document.addEventListener('keydown', this._escapeKeyHandler, true);
    }

    // Add global ArrowDown handler for "no block selected" → select first page-level block
    if (!this._arrowDownNoSelectionHandler) {
      this._arrowDownNoSelectionHandler = (e) => {
        if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
        if (this.selectedBlockUid) return;

        const allBlocks = document.querySelectorAll('[data-block-uid]');
        // Find page-level blocks (not nested inside another block)
        const pageBlocks = Array.from(allBlocks).filter(el =>
          !el.parentElement?.closest('[data-block-uid]'),
        );
        if (pageBlocks.length === 0) return;

        e.preventDefault();
        const target = e.key === 'ArrowDown' ? pageBlocks[0] : pageBlocks[pageBlocks.length - 1];
        this.selectBlock(target);
      };
      document.addEventListener('keydown', this._arrowDownNoSelectionHandler);
    }

    // Add global Enter handler for "block selected, no field focused" → add block after
    if (!this._enterKeyHandler) {
      this._enterKeyHandler = (e) => {
        if (e.key !== 'Enter' || e.shiftKey) return;
        if (!this.selectedBlockUid) return;
        // Only fire if no editable field is currently focused
        if (document.activeElement?.closest('[data-edit-text]')) return;
        // Must be in edit mode
        if (!this.isInlineEditing) return;

        e.preventDefault();
        this.sendMessageToParent({
          type: 'ADD_BLOCK_AFTER',
          blockId: this.selectedBlockUid,
        });
      };
      document.addEventListener('keydown', this._enterKeyHandler);
    }
  }

  ////////////////////////////////////////////////////////////////////////////////
  // Transform Blocking API - Prevent user input during Slate transforms
  ////////////////////////////////////////////////////////////////////////////////

  /**
   * Blocks or unblocks user input on a block while Slate transforms are processing.
   * This prevents race conditions where the user makes changes while waiting for
   * the Admin UI to process and return transformed content.
   *
   * @param {string} blockId - Block UID to block/unblock
   * @param {boolean} processing - true to block input, false to unblock
   */
  /**
   * Ensures the document-level keyboard blocker is attached.
   * The blocker intercepts keydown/keypress/input/beforeinput when blockedBlockId is set,
   * buffering keydown events in eventBuffer for later replay.
   * Created once and reused — the handler checks blockedBlockId before acting.
   */
  _ensureDocumentKeyboardBlocker() {
    if (this._documentKeyboardBlocker) return;
    this._documentKeyboardBlocker = (e) => {
      // DEBUG: log ALL keydown events through the blocker
      if (e.type === 'keydown') {
        log('DEBUG blocker entry:', e.key, 'blockedBlockId:', this.blockedBlockId,
            'target:', e.target?.nodeName);
      }
      if (!this.blockedBlockId) return;

      // During transforms, the renderer replaces innerHTML which destroys the
      // focused element. Focus falls to document.body, so keystrokes arrive
      // targeting BODY instead of the block. We must also buffer these events,
      // otherwise characters typed during re-render are silently lost.
      const isBodyTarget = e.target === document.body || e.target === document.documentElement;
      if (!isBodyTarget) {
        const targetBlock = e.target.closest?.('[data-block-uid]');
        if (!targetBlock || targetBlock.getAttribute('data-block-uid') !== this.blockedBlockId) {
          if (e.type === 'keydown') {
            log('DEBUG blocker: key', e.key, 'target block mismatch. target:', e.target?.nodeName,
                'closest block:', targetBlock?.getAttribute('data-block-uid'), 'blockedBlockId:', this.blockedBlockId);
          }
          return;
        }
      }

      if (e.type === 'keydown') {
        // Paste (Cmd+V): read clipboard data now while we have user gesture
        // context, store in buffer entry for replay. The async read completes
        // well before the transform finishes and replay starts.
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
          const entry = { _type: 'paste', html: null };
          this.eventBuffer.push(entry);
          navigator.clipboard.read().then(async (items) => {
            for (const item of items) {
              if (item.types.includes('text/html')) {
                entry.html = await (await item.getType('text/html')).text();
                return;
              }
              if (item.types.includes('text/plain')) {
                entry.html = await (await item.getType('text/plain')).text();
              }
            }
          }).catch(() => {
            navigator.clipboard.readText().then(text => { entry.html = text; }).catch(() => {});
          });
          log('BUFFERED paste with clipboard read, buffer size:', this.eventBuffer.length);
        } else {
          this.eventBuffer.push({
            key: e.key,
            code: e.code,
            ctrlKey: e.ctrlKey,
            metaKey: e.metaKey,
            shiftKey: e.shiftKey,
            altKey: e.altKey,
          });
          log('BUFFERED keyboard event:', e.key, 'buffer size:', this.eventBuffer.length);
        }
      }
      e.preventDefault();
      e.stopPropagation();
      return false;
    };

    document.addEventListener('keydown', this._documentKeyboardBlocker, true);
    document.addEventListener('keypress', this._documentKeyboardBlocker, true);
    document.addEventListener('input', this._documentKeyboardBlocker, true);
    document.addEventListener('beforeinput', this._documentKeyboardBlocker, true);
  }

  setBlockProcessing(blockId, processing = true, requestId = null) {
    log('setBlockProcessing:', { blockId, processing, requestId });

    if (processing) {
      log('BLOCKING input for', blockId);
      // Clear any existing buffer when starting new blocking
      this.eventBuffer = [];
      this.blockedBlockId = blockId;

      this._ensureDocumentKeyboardBlocker();

      // Visual feedback on current element
      const block = this.queryBlockElement(blockId);
      const editableField = block ? this.getOwnFirstEditableField(block) : null;
      if (editableField) {
        editableField.style.cursor = 'wait';
      }

      // Store pending transform to match with FORM_DATA for unblocking
      this.pendingTransform = {
        blockId: blockId,
        requestId: requestId,
      };
    } else {
      log('UNBLOCKING input for', blockId);

      // Clear blocked state
      this.blockedBlockId = null;

      // Restore visual feedback on current element (may be new after re-render)
      const block = this.queryBlockElement(blockId);
      const editableField = block ? this.getOwnFirstEditableField(block) : null;
      if (editableField) {
        editableField.style.cursor = 'text';
      }

      // Clear pending transform
      this.pendingTransform = null;

      // Mark buffer for replay - actual replay happens after DOM re-render
      // and selection restore in the FORM_DATA handler
      if (this.eventBuffer.length > 0) {
        this.pendingBufferReplay = {
          blockId,
          buffer: [...this.eventBuffer],
        };
        this.eventBuffer = [];
        log('Marked', this.pendingBufferReplay.buffer.length, 'events for replay after DOM ready');
      }
    }
  }

  /**
   * Replays buffered events and unblocks input after a transform completes.
   * This is the safe sequence: prepare buffer → replay → unblock
   * Called from FORM_DATA handler after DOM is updated.
   */
  replayBufferAndUnblock(context = '') {
    if (!this.pendingTransform) {
      log('[HYDRA-DEBUG] replayBufferAndUnblock: no pendingTransform, returning');
      return;
    }

    const { blockId, requestId: originalRequestId } = this.pendingTransform;
    log('[HYDRA-DEBUG] replayBufferAndUnblock:', { blockId, requestId: originalRequestId, bufferLen: this.eventBuffer.length, remainderLen: this._replayRemainder?.length || 0, context });

    // Prepare buffer for replay. Include any remainder from a previous replay
    // that was interrupted by a transform (e.g. Enter→split mid-replay).
    const remainder = this._replayRemainder || [];
    this._replayRemainder = null;

    if (remainder.length > 0 || this.eventBuffer.length > 0) {
      this.pendingBufferReplay = {
        blockId,
        buffer: [...remainder, ...this.eventBuffer],
      };
      this.eventBuffer = [];
      log('Prepared', this.pendingBufferReplay.buffer.length, 'events for replay',
          remainder.length ? `(${remainder.length} from previous cycle)` : '');
    }

    // Replay buffered events (may send new format request with new requestId)
    this.replayBufferedEvents();

    // Only unblock if replay didn't start a new transform (check if requestId changed)
    const hasNewPendingTransform = this.pendingTransform?.requestId &&
                                    this.pendingTransform.requestId !== originalRequestId;
    if (!hasNewPendingTransform) {
      // Unblock AFTER replay to prevent keystrokes arriving in the gap
      log('Unblocking input for', blockId, '- after replay' + (context ? ` (${context})` : ''));
      this.setBlockProcessing(blockId, false);
    } else {
      log('Skipping unblock - new transform pending:', this.pendingTransform.requestId);
    }
  }

  /**
   * Replays buffered keyboard events after DOM is ready.
   * Called after selection is restored following a transform.
   */
  replayBufferedEvents(retryCount = 0) {
    if (!this.pendingBufferReplay) {
      return;
    }

    const { blockId, buffer } = this.pendingBufferReplay;

    log('Replaying', buffer.length, 'buffered events, retry:', retryCount);

    // Re-query editable field in case DOM was re-rendered
    const currentBlock = this.queryBlockElement(blockId);
    const currentEditable = currentBlock ? this.getOwnFirstEditableField(currentBlock) : null;
    if (!currentEditable) {
      // Retry a few times with RAF to wait for Vue/Nuxt re-render
      if (retryCount < 5) {
        requestAnimationFrame(() => this.replayBufferedEvents(retryCount + 1));
        return;
      }
      console.warn('[HYDRA] Cannot replay buffer - editable field not found after retries');
      this.pendingBufferReplay = null;
      return;
    }

    this.pendingBufferReplay = null;

    // Navigation key → selection.modify() mapping
    const navMap = {
      ArrowLeft: ['backward', 'character'],
      ArrowRight: ['forward', 'character'],
      ArrowUp: ['backward', 'line'],
      ArrowDown: ['forward', 'line'],
      Home: ['backward', 'lineboundary'],
      End: ['forward', 'lineboundary'],
    };

    // Helper: detect format hotkey from a buffered event
    const getFormatFromHotkey = (evt) => {
      if (!(evt.ctrlKey || evt.metaKey) || !this.slateConfig?.hotkeys) return null;
      for (const [shortcut, config] of Object.entries(this.slateConfig.hotkeys)) {
        const parts = shortcut.toLowerCase().split('+');
        const hasmod = parts.includes('mod');
        const hasShift = parts.includes('shift');
        const hasAlt = parts.includes('alt');
        const key = parts[parts.length - 1];
        if ((hasmod ? (evt.ctrlKey || evt.metaKey) : true) &&
            (hasShift ? evt.shiftKey : !evt.shiftKey) &&
            (hasAlt ? evt.altKey : !evt.altKey) &&
            evt.key.toLowerCase() === key && config.type === 'inline') {
          return config.format;
        }
      }
      return null;
    };

    // Helper: insert accumulated text using Selection API
    const insertText = (text) => {
      // Ensure cursor is inside a data-node-id element, not on Vue/Nuxt
      // template whitespace. After a transform, the framework may re-render
      // and leave the cursor on whitespace outside the content element.
      this.correctInvalidWhitespaceSelection();

      const selection = window.getSelection();
      if (!selection || !selection.rangeCount) return;
      const range = selection.getRangeAt(0);

      if (!range.collapsed) {
        range.deleteContents();
      }

      // Prevent CSS whitespace collapse: replace leading/trailing spaces with
      // NBSP. Browsers do this automatically for native typing, but
      // range.insertNode with a raw text node doesn't get that fixup.
      // handleTextChange's stripZeroWidthSpaces converts NBSP back to regular
      // space when building the Slate data, so this doesn't leak into the model.
      let insertionText = text.replace(/^ /, '\u00A0').replace(/ $/, '\u00A0');

      const textNode = document.createTextNode(insertionText);
      range.insertNode(textNode);

      // Clean up ZWS text nodes left by restoreSlateSelection's ensureZwsPosition
      const parentEl = textNode.parentNode;
      if (parentEl) {
        for (const sibling of [...parentEl.childNodes]) {
          if (sibling !== textNode && sibling.nodeType === Node.TEXT_NODE) {
            const cleaned = sibling.textContent.replace(/[\uFEFF\u200B]/g, '');
            if (cleaned === '') {
              sibling.remove();
            }
          }
        }
      }

      // Position cursor inside the text node (not after it) to prevent
      // browser text-node normalization on next keystroke
      range.setStart(textNode, textNode.textContent.length);
      range.setEnd(textNode, textNode.textContent.length);
      selection.removeAllRanges();
      selection.addRange(range);

      log('[HYDRA-DEBUG] insertText:', JSON.stringify(text), 'parent:', textNode.parentElement?.tagName, 'nodeId:', textNode.parentElement?.getAttribute('data-node-id'));
      log('Inserted buffered text:', text);

      this.prospectiveInlineElement = null;

      // Manually trigger text change handler since insertNode creates a
      // childList mutation but our MutationObserver only watches characterData
      const editableField = currentEditable.closest('[data-edit-text]') || currentEditable;
      if (editableField && this.isInlineEditing) {
        this.handleTextChange(editableField, textNode.parentElement, textNode);
      }
    };

    // Helper: replay a non-text key.
    // Known native actions (Backspace, Delete, navigation, Ctrl+A) are executed
    // directly — synthetic KeyboardEvents are untrusted and browsers won't
    // perform native actions from them.
    // Unknown keys are dispatched as synthetic keydown so our keydown handler
    // can process them (e.g. Enter→split, Tab→indent set blockedBlockId).
    const replayKey = (evt) => {
      log('Replaying buffered key:', evt.key, { ctrl: evt.ctrlKey, meta: evt.metaKey, shift: evt.shiftKey });

      // Backspace/Delete: shared handler checks for special cases (unwrap, delete
      // block, boundary). Only use native execCommand if handler didn't act.
      if (evt.key === 'Backspace') {
        if (!this.handleDeleteKey(blockId, 'Backspace')) {
          // preserveLastCharDelete handles the case where execCommand would
          // remove the last char from an inline element — execCommand doesn't
          // fire beforeinput so the editableField handler can't catch it.
          if (!this.preserveLastCharDelete()) {
            document.execCommand('delete', false);
          }
        }
        return;
      }
      if (evt.key === 'Delete') {
        if (!this.handleDeleteKey(blockId, 'Delete')) {
          if (!this.preserveLastCharDelete()) {
            document.execCommand('forwardDelete', false);
          }
        }
        return;
      }
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(evt.key)) {
        this.moveArrowKey(evt.key, currentEditable, evt.shiftKey);
        return;
      }
      if (navMap[evt.key]) {
        const sel = window.getSelection();
        if (sel) {
          const alter = evt.shiftKey ? 'extend' : 'move';
          sel.modify(alter, navMap[evt.key][0], navMap[evt.key][1]);
        }
        return;
      }
      if ((evt.ctrlKey || evt.metaKey) && evt.key.toLowerCase() === 'a') {
        const sel = window.getSelection();
        if (sel && currentEditable) {
          // Use text node endpoints instead of selectNodeContents on the container,
          // because the selectionchange listener's correctInvalidWhitespaceSelection
          // treats selections anchored on the data-edit-text container as invalid
          // (since the container has data-node-id children) and "corrects" them.
          const walker = document.createTreeWalker(currentEditable, NodeFilter.SHOW_TEXT);
          const firstText = walker.firstChild();
          let lastText = firstText;
          while (walker.nextNode()) lastText = walker.currentNode;
          if (firstText && lastText) {
            const range = document.createRange();
            range.setStart(firstText, 0);
            range.setEnd(lastText, lastText.length);
            sel.removeAllRanges();
            sel.addRange(range);
          } else {
            // Fallback: no text nodes, use selectNodeContents
            const range = document.createRange();
            range.selectNodeContents(currentEditable);
            sel.removeAllRanges();
            sel.addRange(range);
          }
          log('Ctrl+A replay: selection set to:', JSON.stringify(sel.toString()), 'on', currentEditable.tagName, currentEditable.getAttribute('data-edit-text'));
        }
        return;
      }

      // Copy: execCommand triggers trusted copy event → _doCopy cleans clipboard
      if ((evt.ctrlKey || evt.metaKey) && evt.key.toLowerCase() === 'c') {
        document.execCommand('copy');
        return;
      }
      // Cut: copy cleaned selection + delete via transform
      if ((evt.ctrlKey || evt.metaKey) && evt.key.toLowerCase() === 'x') {
        this._doCut(blockId);
        return;
      }

      // Unknown keys — dispatch synthetic event for our keydown handler
      const syntheticEvent = new KeyboardEvent('keydown', {
        key: evt.key,
        code: evt.code,
        shiftKey: evt.shiftKey,
        ctrlKey: evt.ctrlKey,
        metaKey: evt.metaKey,
        altKey: evt.altKey,
        bubbles: true,
        cancelable: true,
      });
      currentEditable.dispatchEvent(syntheticEvent);
    };

    // Process buffer events sequentially to preserve ordering.
    // If a replayed event triggers a new transform (e.g. Enter→split,
    // Tab→indent), stop and save remaining events for the next replay cycle.
    // Clear blockedBlockId so the capture-phase blocker doesn't interfere;
    // if a replayed event starts a new transform, blockedBlockId gets re-set.
    const savedBlockedId = this.blockedBlockId;
    this.blockedBlockId = null;

    let textBatch = '';
    for (let i = 0; i < buffer.length; i++) {
      // A replayed event started a new transform — save remainder for next cycle
      if (this.blockedBlockId) {
        if (textBatch) {
          // Flush any pending text before saving remainder
          insertText(textBatch);
          textBatch = '';
        }
        this._replayRemainder = buffer.slice(i);
        log('Replay interrupted by transform, saved', this._replayRemainder.length, 'events for next cycle');
        break;
      }

      const evt = buffer[i];

      // Buffered paste: replay with stored clipboard data
      if (evt._type === 'paste') {
        if (textBatch) { insertText(textBatch); textBatch = ''; }
        if (evt.html) {
          this._doPaste(blockId, evt.html);
        }
        continue;
      }

      const isTextChar = evt.key.length === 1 && !evt.ctrlKey && !evt.metaKey;

      if (isTextChar) {
        // Space may trigger markdown autoformat — flush text first so the DOM
        // has the preceding text, then check via shared handler
        if (evt.key === ' ') {
          if (textBatch) {
            insertText(textBatch);
            textBatch = '';
          }
          if (!this.handleSpaceKey(blockId)) {
            insertText(' ');
          }
        } else {
          textBatch += evt.key;
        }
      } else {
        // Flush accumulated text before handling a non-text event
        if (textBatch) {
          insertText(textBatch);
          textBatch = '';
        }

        const format = getFormatFromHotkey(evt);
        if (format) {
          log('Replaying buffered format hotkey:', format);
          this.sendTransformRequest(blockId, 'format', { format });
        } else {
          // Dispatch synthetic keydown for all non-text keys. Our keydown handler
          // gets a chance to process it (Enter, Tab, etc.), and replayKey applies
          // manual fallbacks for native actions browsers won't do from untrusted events.
          replayKey(evt);
        }
      }
    }

    // Flush any remaining text batch
    if (textBatch && !this.blockedBlockId) {
      insertText(textBatch);
    }

    // Restore blockedBlockId if no replayed event started a new transform.
    // replayBufferAndUnblock will then unblock normally.
    if (!this.blockedBlockId) {
      this.blockedBlockId = savedBlockedId;
    }
  }

  /**
   * Handles timeout when a Slate transform takes too long to respond.
   * Shows error state and permanently disables editing to prevent data corruption.
   *
   * @param {string} blockId - Block UID that timed out
   */
  handleTransformTimeout(blockId) {
    const block = this.queryBlockElement(blockId);
    const editableField = block ? this.getOwnFirstEditableField(block) : null;

    if (editableField) {
      // Show error state - permanently disable editing
      editableField.setAttribute('contenteditable', 'false');
      editableField.style.cursor = 'not-allowed';
      editableField.style.opacity = '0.5';
      editableField.title =
        'Transform timeout - refresh page to continue editing';
    }

    console.error('[HYDRA] Transform timeout for block:', blockId);
    this.pendingTransform = null;
  }

  ////////////////////////////////////////////////////////////////////////////////
  // Whitespace & Zero-Width Space (ZWS) Strategy
  //
  // BACKGROUND — CSS Whitespace Collapsing in Contenteditable
  //
  //   Under `white-space: normal` (the default), the CSS rendering engine
  //   collapses whitespace in two phases:
  //     Phase I:  Consecutive spaces/tabs collapse to a single space.
  //     Phase II: Spaces at the start and end of each line are trimmed.
  //
  //   A text node containing ONLY collapsible whitespace (e.g. " " inside an
  //   otherwise-empty <p>) gets fully trimmed — it exists in the DOM but has
  //   NO CSS layout box (zero rendered width/height).
  //
  //   The browser's editing engine positions the caret based on rendered layout,
  //   not the raw DOM. With no layout box, there is no caret position. When the
  //   user types, the browser creates a new text node at the nearest valid
  //   insertion point — typically on the parent element, OUTSIDE the intended
  //   Slate node structure. Text "leaks" out of <p data-node-id> elements.
  //
  //   However, if the whitespace text node is adjacent to visible content in the
  //   same inline formatting context (e.g. a space between "Hello" and "world"),
  //   it collapses to a single rendered space but STILL HAS a layout position.
  //   The browser can insert into it fine.
  //
  //   References:
  //     CSS Text Module Level 4 §4 — https://drafts.csswg.org/css-text-4/
  //     MDN "How whitespace is handled" — https://developer.mozilla.org/en-US/docs/Web/API/Document_Object_Model/Whitespace
  //     Mozilla Bug 681626 — inconsistent insertion point with trailing space
  //     Slate-react string.tsx — uses U+FEFF for empty text nodes, void elements,
  //       and inline edges: https://github.com/ianstormtaylor/slate/blob/main/packages/slate-react/src/components/string.tsx
  //     ProseMirror cursorWrapper — uses U+FEFF for mark state during typing:
  //       https://discuss.prosemirror.net/t/what-does-the-cursorwrapper-solve/1892
  //     Tiptap white-space: pre-wrap — https://github.com/ueberdosis/tiptap/issues/2265
  //
  // ALTERNATIVE CONSIDERED — white-space: pre-wrap
  //
  //   Tiptap and Slate-react set `white-space: pre-wrap` on contenteditable
  //   elements, which preserves all whitespace and eliminates this problem
  //   entirely. We can't do this because the iframe renders the frontend's
  //   actual theme (Nuxt/Vue). `pre-wrap` would make Vue template whitespace
  //   artifacts (newlines/indentation between tags like "\n  ") visible during
  //   editing, causing layout differences between edit mode and published view.
  //
  // OUR APPROACH — ZWS Characters + Whitespace Correction
  //
  //   We handle three distinct whitespace problems:
  //
  //   Problem 1: Template whitespace (cursor lands on "\n  " between Vue tags)
  //     → correctInvalidWhitespaceSelection() moves cursor to valid position
  //     → isOnInvalidWhitespace() detects these nodes
  //     → getValidPositionForWhitespace() finds nearest valid text position
  //
  //   Problem 2: Empty element whitespace (Nuxt renders <p> </p> for empty blocks)
  //     → ensureValidInsertionTarget() replaces artifact space with U+FEFF (BOM)
  //       so the text node has a layout box and the browser can insert into it
  //     → Only fires when ALL data-node-id ancestors are empty. If any ancestor
  //       has visible content, the whitespace has layout and needs no fix.
  //
  //   Problem 3: Prospective formatting (user toggles bold/italic with no selection)
  //     When the user presses Ctrl+B without a selection, Slate creates an empty
  //     inline node: <strong>{ text: '' }</strong>. The frontend renders this as
  //     an empty <strong> element. The browser can't position a caret inside an
  //     empty element, so we insert a BOM text node for cursor placement.
  //
  //     Flow:
  //       1. Ctrl+B → sendTransformRequest('format', { format: 'strong' })
  //       2. Admin applies Slate transform → sends FORM_DATA with empty inline
  //       3. Frontend re-renders → empty <strong data-node-id="X"></strong>
  //       4. restoreSlateSelection → ensureZwsPosition() creates BOM text node
  //          inside the empty <strong> and positions cursor after it
  //       5. this.prospectiveInlineElement = the <strong> element (tracked for
  //          Chrome workaround where cursor escapes the inline)
  //       6. User types → characters go inside <strong> → bold text
  //       7. On navigation keys, prospectiveInlineElement is cleared
  //
  //     Critical interaction with Problem 2:
  //       After typing in a prospective inline and toggling format again, the
  //       user may type a space that ends up in a NEW prospective inline (e.g.
  //       <strong data-node-id="0.3"> </strong>). This space is user content,
  //       not an artifact. ensureValidInsertionTarget must NOT replace it — the
  //       walk-up-all-ancestors check detects that the parent <p> has content
  //       ("Hello bold normal") and skips the replacement.
  //
  //   ZWS lifecycle — adding:
  //     ensureValidInsertionTarget()  — BOM in empty-block artifact whitespace
  //     ensureZwsPosition()           — BOM in/around inline elements for cursor
  //                                     positioning after format operations
  //                                     (in restoreSlateSelection)
  //     getValidPositionForWhitespace() — BOM in empty elements during cursor
  //                                       correction
  //     beforeinput handler            — BOM to keep text nodes alive when user
  //                                      deletes the last real character
  //
  //   ZWS lifecycle — stripping:
  //     stripZeroWidthSpaces()         — strips from text strings during
  //                                      serialization, offset calculation
  //     stripZeroWidthSpacesFromDOM()  — strips from DOM text nodes that have
  //                                      other content (not ZWS-only nodes)
  //     Copy/cut handlers              — strips before writing to clipboard
  //     Frontend re-render             — FORM_DATA triggers re-render which
  //                                      naturally replaces ZWS-containing nodes
  //     NOTE: ZWS is NOT stripped during typing to avoid cursor corruption.
  //
  //   ZWS-aware offset calculation:
  //     findPositionByVisibleOffset()  — skips ZWS when counting char offsets
  //     findTextNodeInChild()          — positions cursor AFTER ZWS in ZWS-only
  //                                      nodes
  //     calculateNormalizedOffset()    — uses range.toString() which excludes
  //                                      collapsed whitespace
  //
  // CRITICAL TESTS
  //
  //   tests-playwright/mock-parent/navigation-keys.spec.ts:
  //     "Typing into whitespace-only text node stays inside data-node-id element"
  //       — Verifies ensureValidInsertionTarget prevents text leaking outside <p>
  //         in empty paragraphs (the core browser bug this code works around)
  //
  //   tests-playwright/integration/inline-editing-formatting.spec.ts:
  //     "prospective formatting: toggle on, type, off, type, on again does not
  //      double text"
  //       — Verifies user-typed spaces between format toggles are preserved
  //         (the bug where ensureValidInsertionTarget destroyed user spaces)
  //
  ////////////////////////////////////////////////////////////////////////////////

  /**
   * Checks if a node is on invalid whitespace (text node outside any data-node-id element).
   * This happens when cursor lands on template whitespace in Vue/Nuxt templates.
   * Part of "Problem 1" in the whitespace strategy above.
   *
   * @param {Node} node - The DOM node to check
   * @returns {boolean} True if the node is on invalid whitespace
   */
  isOnInvalidWhitespace(node) {
    if (!node) return false;

    // Handle ELEMENT nodes - cursor can land on wrapper DIV when clicking at edge of block
    if (node.nodeType === Node.ELEMENT_NODE) {
      // If this element has data-node-id, cursor position is valid
      if (node.hasAttribute?.('data-node-id')) {
        return false;
      }

      // If this element is an editable field itself, check if it has data-node-id children
      // If so, cursor should be inside those children, not on the container
      if (node.hasAttribute?.('data-edit-text')) {
        const hasNodeIdChildren = node.querySelector?.('[data-node-id]');
        if (hasNodeIdChildren) {
          log('isOnInvalidWhitespace: cursor on edit-text container but has nodeId children, needs correction');
          return true;
        }
        return false;
      }

      // Check if this element is inside a block that has slate fields
      const blockElement = node.closest?.('[data-block-uid]');
      if (!blockElement) {
        return false;
      }

      // Check if there's any data-node-id element inside the block
      // (could be nested or on same element as edit-text)
      const nodeIdElement = blockElement.querySelector('[data-node-id]');
      if (nodeIdElement && !node.closest?.('[data-node-id]')) {
        // Element is inside a block with slate content but outside data-node-id
        log('isOnInvalidWhitespace: element inside block but outside data-node-id, tagName:', node.tagName);
        return true;
      }

      return false;
    }

    // Only TEXT nodes can be "invalid whitespace" (Vue template artifacts like "\n  ")
    if (node.nodeType !== Node.TEXT_NODE) {
      return false;
    }

    // Find the editable field container
    let editableField = null;
    let current = node.parentNode;
    while (current) {
      if (current.nodeType === Node.ELEMENT_NODE && current.hasAttribute?.('data-edit-text')) {
        editableField = current;
        break;
      }
      current = current.parentNode;
    }

    // Not inside an editable field at all
    if (!editableField) {
      return false;
    }

    // If the editable field has no data-node-id elements, it's not Slate-rendered
    // (e.g., Nuxt simple HTML) - don't try to correct whitespace
    if (!editableField.querySelector('[data-node-id]')) {
      return false;
    }

    // Walk up from node to find if there's a data-node-id ancestor (including editableField itself)
    current = node.parentNode;
    while (current) {
      // If we hit an element with data-node-id, cursor is valid
      if (current.nodeType === Node.ELEMENT_NODE && current.hasAttribute?.('data-node-id')) {
        return false;
      }
      // Stop at editable field boundary
      if (current === editableField) {
        break;
      }
      current = current.parentNode;
    }

    // Reached editable field without finding data-node-id - cursor is on whitespace
    return true;
  }

  /**
   * Gets the valid position for a node on invalid whitespace.
   * Whitespace can only be before first block or after last block.
   *
   * @param {Node} node - The text node that's on invalid whitespace
   * @param {boolean} isRangeEnd - If true, this is the end of a range selection (return end position)
   * @returns {{textNode: Node, offset: number}|null} Target position, or null if not found
   */
  getValidPositionForWhitespace(node, isRangeEnd = false) {
    if (!node) return null;

    log('getValidPositionForWhitespace: node=', node.nodeType === Node.TEXT_NODE ? 'TEXT' : node.tagName, 'content=', JSON.stringify(node.textContent?.substring(0, 20)), 'isRangeEnd=', isRangeEnd);

    // Find the editable field container
    let container = null;

    // For element nodes, check if the node itself is the container
    if (node.nodeType === Node.ELEMENT_NODE && node.hasAttribute?.('data-edit-text')) {
      container = node;
    }
    // Check if we can find editable field by walking up
    if (!container) {
      let current = node.parentNode;
      while (current && !current.hasAttribute?.('data-edit-text')) {
        current = current.parentNode;
      }
      container = current;
    }
    // For element nodes (like block wrapper), also check inside for editable field
    if (!container && node.nodeType === Node.ELEMENT_NODE) {
      container = node.querySelector?.('[data-edit-text]');
    }

    if (!container) {
      log('getValidPositionForWhitespace: no container found');
      return null;
    }

    // Get first and last elements with data-node-id
    // Check if container itself has data-node-id first, then look for descendants
    const firstNodeIdEl = container.hasAttribute?.('data-node-id')
      ? container
      : container.querySelector('[data-node-id]');
    const allNodeIdEls = container.hasAttribute?.('data-node-id')
      ? [container, ...container.querySelectorAll('[data-node-id]')]
      : container.querySelectorAll('[data-node-id]');
    const lastNodeIdEl = allNodeIdEls[allNodeIdEls.length - 1];

    if (!firstNodeIdEl) {
      log('getValidPositionForWhitespace: no firstNodeIdEl found');
      return null;
    }

    // If isRangeEnd is specified, use that to determine position (for serializing range selections)
    // Otherwise, determine based on DOM position of the whitespace
    let returnEndPosition = isRangeEnd;
    if (!isRangeEnd) {
      // Determine if whitespace is before first or after last by comparing DOM positions
      const position = node.compareDocumentPosition(firstNodeIdEl);
      const isBeforeFirst = position & Node.DOCUMENT_POSITION_FOLLOWING;
      returnEndPosition = !isBeforeFirst; // After content = return end position
      log('getValidPositionForWhitespace: isBeforeFirst=', isBeforeFirst, 'firstNodeIdEl=', firstNodeIdEl.tagName, 'nodeId=', firstNodeIdEl.getAttribute('data-node-id'));
    }

    if (!returnEndPosition) {
      // Start position → start of first text node
      const walker = document.createTreeWalker(firstNodeIdEl, NodeFilter.SHOW_TEXT, null, false);
      let textNode = walker.nextNode();

      // If no text node exists, create one with ZWS for cursor positioning
      if (!textNode) {
        textNode = document.createTextNode('\uFEFF');
        firstNodeIdEl.appendChild(textNode);
        log('getValidPositionForWhitespace: created ZWS text node in empty element');
        return { textNode, offset: 1 }; // Position after ZWS
      }

      // If text node is empty, prepend ZWS for cursor positioning
      // This ensures browser types into this node rather than creating a new one
      const visibleText = textNode.textContent.replace(/[\uFEFF\u200B]/g, '');
      if (visibleText === '') {
        if (!textNode.textContent.includes('\uFEFF')) {
          textNode.textContent = '\uFEFF' + textNode.textContent;
          log('getValidPositionForWhitespace: prepended ZWS to empty text node');
        }
        return { textNode, offset: 1 }; // Position after ZWS
      }

      log('getValidPositionForWhitespace: returning start of first text node:', textNode?.textContent?.substring(0, 20));
      return { textNode, offset: 0 };
    } else {
      // End position → end of last text node
      const walker = document.createTreeWalker(lastNodeIdEl, NodeFilter.SHOW_TEXT, null, false);
      let lastText = null;
      while (walker.nextNode()) {
        lastText = walker.currentNode;
      }
      log('getValidPositionForWhitespace: returning end of last text node:', lastText?.textContent?.substring(0, 20), 'offset:', lastText?.textContent?.length);
      return lastText ? { textNode: lastText, offset: lastText.textContent.length } : null;
    }
  }

  /**
   * Validates a position and returns a corrected position if on invalid whitespace.
   * @param {Node} node - The node containing the position
   * @param {number} offset - The offset within the node
   * @returns {{node: Node, offset: number}} The validated (possibly corrected) position
   */
  getValidatedPosition(node, offset) {
    if (this.isOnInvalidWhitespace(node)) {
      const validPos = this.getValidPositionForWhitespace(node);
      if (validPos) {
        return { node: validPos.textNode, offset: validPos.offset };
      }
    }
    return { node, offset };
  }

  /**
   * Corrects cursor/selection if it's on invalid whitespace.
   * For collapsed selections, moves cursor to nearest valid position.
   * For range selections, corrects each end independently.
   *
   * @returns {boolean} True if selection was corrected
   */
  correctInvalidWhitespaceSelection() {
    const selection = window.getSelection();
    if (!selection?.rangeCount) return false;

    const range = selection.getRangeAt(0);
    const anchorOnWhitespace = this.isOnInvalidWhitespace(range.startContainer);
    const focusOnWhitespace = this.isOnInvalidWhitespace(range.endContainer);

    if (!anchorOnWhitespace && !focusOnWhitespace) return false;

    // Only log when actually correcting
    log('correctInvalidWhitespaceSelection: correcting cursor on invalid whitespace', {
      anchorOnWhitespace,
      focusOnWhitespace,
      anchorContent: range.startContainer.textContent?.substring(0, 20),
      anchorParent: range.startContainer.parentElement?.tagName,
    });

    // Get corrected positions using shared helper
    const anchorPos = this.getValidatedPosition(range.startContainer, range.startOffset);
    const focusPos = this.getValidatedPosition(range.endContainer, range.endOffset);

    log('correctInvalidWhitespaceSelection: anchorPos:', anchorPos, 'focusPos:', focusPos);

    if (!anchorPos.node || !focusPos.node) return false;

    // Check if corrected position is same as current - if so, don't update (avoids infinite loop)
    const anchorSame = anchorPos.node === range.startContainer && anchorPos.offset === range.startOffset;
    const focusSame = focusPos.node === range.endContainer && focusPos.offset === range.endOffset;
    if (anchorSame && focusSame) {
      log('correctInvalidWhitespaceSelection: corrected position same as current, skipping to avoid loop');
      return false;
    }

    // Set corrected selection
    const newRange = document.createRange();
    newRange.setStart(anchorPos.node, anchorPos.offset);
    newRange.setEnd(focusPos.node, focusPos.offset);
    selection.removeAllRanges();
    selection.addRange(newRange);

    log('correctInvalidWhitespaceSelection: Corrected selection');
    return true;
  }

  /**
   * Handles Problem 2 in the ZWS strategy above.
   *
   * When a text node contains only collapsible whitespace and the entire
   * container tree is empty (no visible content in any data-node-id ancestor),
   * the whitespace is a rendering artifact (e.g. Nuxt's <p> </p>). The CSS
   * engine strips its layout box, so the browser can't position a caret or
   * insert typed characters into it — it creates a new text node on the parent
   * instead, leaking text outside the Slate node structure.
   *
   * Fix: replace the artifact whitespace with U+FEFF (BOM), giving the text
   * node a layout box. Like Slate-react's string.tsx approach.
   *
   * If ANY data-node-id ancestor has visible content, the whitespace has a
   * layout position (it's adjacent to rendered content) and the browser can
   * insert into it fine — we leave it alone. This prevents destroying
   * user-typed spaces in prospective formatting elements (Problem 3).
   *
   * @returns {boolean} True if the text node was fixed
   */
  ensureValidInsertionTarget() {
    const selection = window.getSelection();
    if (!selection?.rangeCount) return false;

    const node = selection.anchorNode;
    if (!node || node.nodeType !== Node.TEXT_NODE) return false;

    // Only fix whitespace-only text nodes
    const text = node.textContent;
    if (!text || text.trim() !== '' || /[\uFEFF\u200B]/.test(text)) return false;

    // Walk up through ALL data-node-id ancestors. If any ancestor has visible
    // content, this whitespace has a CSS layout box (it's between rendered
    // content) and the browser can insert into it fine — don't touch it.
    // Only replace with BOM when the entire container tree is empty, meaning
    // the whitespace is a rendering artifact (e.g. Nuxt's <p> </p>) with no
    // layout box that the browser can't insert into.
    let current = node.parentNode;
    let foundDataNodeId = false;
    while (current) {
      if (current.nodeType === Node.ELEMENT_NODE) {
        // Check data-node-id BEFORE data-edit-text because elements
        // can have both attrs (e.g. <p data-edit-text="value" data-node-id="0">).
        // We must check the element's content before potentially breaking out.
        if (current.hasAttribute?.('data-node-id')) {
          foundDataNodeId = true;
          const elementText = this.stripZeroWidthSpaces(current.textContent);
          if (elementText.trim() !== '') {
            log('ensureValidInsertionTarget: skipping, ancestor has content:', elementText.substring(0, 30));
            return false;
          }
        }
        if (current.hasAttribute?.('data-edit-text')) break;
      }
      current = current.parentNode;
    }

    if (!foundDataNodeId) return false;

    // All ancestors are empty — whitespace is a rendering artifact with no
    // CSS layout box. Replace with BOM so the browser has a valid target.
    node.textContent = '\uFEFF';
    const range = selection.getRangeAt(0);
    range.setStart(node, 1);
    range.setEnd(node, 1);
    selection.removeAllRanges();
    selection.addRange(range);
    log('ensureValidInsertionTarget: replaced artifact whitespace with FEFF');

    return false;
  }

  ////////////////////////////////////////////////////////////////////////////////
  // Selection Serialization - Convert DOM selection to Slate selection
  ////////////////////////////////////////////////////////////////////////////////

  /**
   * Serializes the current DOM selection to Slate selection format.
   * Converts browser Selection/Range into Slate's {anchor, focus} format.
   *
   * @returns {Object|null} Slate selection with anchor and focus points, or null if no selection
   */
  serializeSelection() {
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) {
      // No live DOM selection - use savedSelection if available
      // This happens when iframe loses focus (e.g., toolbar button click)
      if (this.savedSelection) {
        log('serializeSelection: using savedSelection (no live selection)');
        return this.savedSelection;
      }
      return null;
    }

    const range = selection.getRangeAt(0);

    // Get anchor and focus points
    const anchorNode = range.startContainer;
    const focusNode = range.endContainer;

    // Serialize both points
    const anchor = this.serializePoint(anchorNode, range.startOffset);
    const focus = this.serializePoint(focusNode, range.endOffset);

    if (!anchor || !focus) {
      // Only warn if this is a Slate field (has data-node-id elements)
      // Non-Slate fields (simple text) can't be serialized and that's expected
      let editableField = range.commonAncestorContainer;
      while (editableField && !editableField.hasAttribute?.('data-edit-text')) {
        editableField = editableField.parentNode;
      }
      if (editableField && editableField.querySelector('[data-node-id]')) {
        console.warn('[HYDRA] Could not serialize selection points in Slate field');
      }
      return null;
    }

    // Validate the selection paths against the actual Slate value
    // Log detailed debugging info if invalid, but still send the path so the error is visible
    const validationResult = this.validateSelectionPaths(anchor, focus, range.commonAncestorContainer);
    if (!validationResult.valid) {
      console.error('[HYDRA] Invalid selection path detected! This will cause a Slate error.\n\n' +
        `Anchor path: [${anchor.path.join(', ')}], offset: ${anchor.offset}\n` +
        `Focus path: [${focus.path.join(', ')}], offset: ${focus.offset}\n\n` +
        `Error: ${validationResult.error}\n\n` +
        `DOM structure:\n${validationResult.domStructure}\n\n` +
        `Slate structure:\n${validationResult.slateStructure}`
      );
      // Still return the selection so it blows up visibly in Volto
    }

    return { anchor, focus };
  }

  /**
   * Validates that selection paths exist in the Slate structure.
   * Returns detailed debugging info if invalid.
   */
  validateSelectionPaths(anchor, focus, commonAncestor) {
    // Find the editable field container and block
    let editableField = commonAncestor;
    while (editableField && !editableField.hasAttribute?.('data-edit-text')) {
      editableField = editableField.parentNode;
    }
    if (!editableField) {
      return { valid: true }; // Can't validate without editable field
    }

    // Find the block element
    let blockElement = editableField;
    while (blockElement && !blockElement.hasAttribute?.('data-block-uid')) {
      blockElement = blockElement.parentNode;
    }
    if (!blockElement) {
      return { valid: true }; // Can't validate without block
    }

    const blockUid = blockElement.getAttribute('data-block-uid');
    const fieldName = editableField.getAttribute('data-edit-text');
    const blockData = this.getBlockData(blockUid);

    if (!blockData || !blockData[fieldName]) {
      return { valid: true }; // Can't validate without Slate value
    }

    const slateValue = blockData[fieldName];
    if (!Array.isArray(slateValue)) {
      return { valid: true }; // Not a Slate field
    }

    // Validate anchor path
    const anchorValid = this.isPathValidInSlate(anchor.path, slateValue);
    const focusValid = this.isPathValidInSlate(focus.path, slateValue);

    if (anchorValid && focusValid) {
      return { valid: true };
    }

    // Build DOM structure for debugging
    const domStructure = this.buildDomStructureForDebug(editableField);
    const slateStructure = JSON.stringify(slateValue, null, 2).substring(0, 500);

    return {
      valid: false,
      error: !anchorValid
        ? `Anchor path [${anchor.path.join(', ')}] not found in Slate`
        : `Focus path [${focus.path.join(', ')}] not found in Slate`,
      domStructure,
      slateStructure,
    };
  }

  /**
   * Checks if a path exists in a Slate value
   */
  isPathValidInSlate(path, value) {
    let current = { children: value };
    for (let i = 0; i < path.length; i++) {
      const index = path[i];
      if (!current.children || !Array.isArray(current.children)) {
        return false;
      }
      if (index < 0 || index >= current.children.length) {
        return false;
      }
      current = current.children[index];
    }
    return true;
  }

  /**
   * Builds a string representation of the DOM structure for debugging
   */
  buildDomStructureForDebug(element, depth = 0) {
    const indent = '  '.repeat(depth);
    let result = '';

    for (const child of element.childNodes) {
      if (child.nodeType === Node.TEXT_NODE) {
        const text = child.textContent.substring(0, 30);
        result += `${indent}TEXT: "${text}"${child.textContent.length > 30 ? '...' : ''}\n`;
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        const tag = child.tagName.toLowerCase();
        const nodeId = child.getAttribute('data-node-id');
        const nodeIdAttr = nodeId ? ` data-node-id="${nodeId}"` : '';
        result += `${indent}<${tag}${nodeIdAttr}>\n`;
        if (depth < 3) {
          result += this.buildDomStructureForDebug(child, depth + 1);
        }
      } else if (child.nodeType === Node.COMMENT_NODE) {
        result += `${indent}<!-- comment -->\n`;
      }
    }
    return result;
  }

  /**
   * Serializes a single point (anchor or focus) to Slate format.
   *
   * @param {Node} node - DOM node
   * @param {number} offset - Character offset within the node
   * @returns {Object|null} Slate point with path and offset, or null if invalid
   */
  serializePoint(node, offset) {
    // Find the text node (might be element node in some cases)
    let textNode = node;
    let textOffset = offset;

    if (node.nodeType === Node.ELEMENT_NODE) {
      // Element node with offset means "before/after child at offset"
      // For Ctrl+A: anchor is (element, 0), focus is (element, childCount)

      if (offset === 0) {
        // Offset 0 = start of first child
        textNode = node.firstChild;
        textOffset = 0;
      } else {
        // Offset N = after Nth child, so we want end of Nth child
        // childNodes[offset-1] is the last child included in selection
        const childNode = node.childNodes[offset - 1];
        if (childNode) {
          if (childNode.nodeType === Node.TEXT_NODE) {
            textNode = childNode;
            textOffset = childNode.textContent.length;
          } else if (childNode.nodeType === Node.ELEMENT_NODE) {
            // Recurse into element to find last text node
            textNode = this.getLastTextNode(childNode);
            textOffset = textNode ? textNode.textContent.length : 0;
          }
        } else {
          // Fallback to first child if offset is invalid
          textNode = node.firstChild;
          textOffset = 0;
        }
      }
    }

    // Handle empty element case (no text nodes) - cursor is at start of element
    if (!textNode && node.nodeType === Node.ELEMENT_NODE) {
      // Find the element's path by walking up from the element itself
      const elementPath = this.getElementPath(node);
      if (elementPath) {
        // For empty paragraph, selection should be at [0, 0] offset 0
        // (paragraph path + text child index 0)
        return { path: [...elementPath, 0], offset: 0 };
      }
      return null;
    }

    // Walk up to find the path through the Slate structure
    let path = this.getNodePath(textNode);
    if (!path) {
      // Text node might be a Vue template artifact (whitespace text node outside data-node-id)
      // Use getValidPositionForWhitespace to find the first/last valid text node
      // isRangeEnd=true for end position (offset > 0), false for start (offset === 0)
      const isEndPosition = offset > 0;
      const validPos = this.getValidPositionForWhitespace(textNode, isEndPosition);
      if (validPos) {
        textNode = validPos.textNode;
        textOffset = validPos.offset;
        path = this.getNodePath(textNode);
      }
      if (!path) {
        // getNodePath returns null for non-Slate fields (expected) or missing data-node-id (error logged there)
        return null;
      }
    }

    // Calculate offset using range.toString() for proper whitespace normalization
    // This handles Vue/Nuxt whitespace artifacts that don't match Slate's model
    const normalizedOffset = this.calculateNormalizedOffset(textNode, textOffset);

    return { path, offset: normalizedOffset };
  }

  /**
   * Calculate text offset using range.toString() for whitespace normalization.
   * Finds the start of the current Slate text leaf and measures to cursor.
   */
  calculateNormalizedOffset(textNode, domOffset) {
    const parent = textNode.parentNode;
    if (!parent) return domOffset;

    // Find the start point for measuring - either:
    // 1. End of preceding element with data-node-id (text is after formatted span)
    // 2. Start of parent element with data-node-id (text is inside formatted span)
    // 3. Start of parent if no preceding element (first text in block)

    let startNode = null;
    let startAtEnd = false;

    // First check for preceding sibling with data-node-id (e.g., text after <strong>)
    // This takes priority over parent having data-node-id
    const siblings = Array.from(parent.childNodes);
    const nodeIndex = siblings.indexOf(textNode);

    for (let i = nodeIndex - 1; i >= 0; i--) {
      const sib = siblings[i];
      if (sib.nodeType === Node.ELEMENT_NODE && sib.hasAttribute('data-node-id')) {
        startNode = sib;
        startAtEnd = true; // Measure from end of preceding element
        break;
      }
    }

    // If no preceding sibling with data-node-id, check if parent has data-node-id
    // (text is inside formatted element like <strong>)
    if (!startNode && parent.hasAttribute?.('data-node-id')) {
      startNode = parent;
      startAtEnd = false; // Measure from start of parent
    }

    // Create range from start point to cursor
    const range = document.createRange();

    if (startNode && startAtEnd) {
      // Measure from end of preceding element
      range.setStartAfter(startNode);
    } else if (startNode) {
      // Measure from start of parent element
      range.setStart(startNode, 0);
    } else {
      // No preceding element - measure from start of parent
      range.setStart(parent, 0);
    }

    range.setEnd(textNode, domOffset);

    // range.toString() normalizes whitespace as the browser renders it
    // Strip ZWS characters since they don't exist in Slate's model
    return this.stripZeroWidthSpaces(range.toString()).length;
  }

  /**
   * Helper to find the last text node within an element
   */
  getLastTextNode(element) {
    if (element.nodeType === Node.TEXT_NODE) {
      return element;
    }

    // Recursively find last text node
    for (let i = element.childNodes.length - 1; i >= 0; i--) {
      const child = element.childNodes[i];
      if (child.nodeType === Node.TEXT_NODE) {
        return child;
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        const result = this.getLastTextNode(child);
        if (result) return result;
      }
    }

    return null;
  }

  /**
   * Gets the Slate path for a DOM node by walking up the tree.
   * Uses data-node-id to identify Slate nodes.
   *
   * @param {Node} node - DOM node to find path for
   * @returns {Array|null} Slate path as array of indices, or null if not found
   */
  /**
   * Calculate the Slate index of a node among its siblings.
   * Elements with data-node-id use their ID's last component.
   * Text nodes use the next index after the previous sibling.
   * Empty/whitespace text nodes (Vue artifacts) map to the previous real content.
   */
  getSlateIndexAmongSiblings(node, parent) {
    // For elements with data-node-id, use the index from the ID
    if (node.nodeType === Node.ELEMENT_NODE && node.hasAttribute('data-node-id')) {
      const nodeId = node.getAttribute('data-node-id');
      const parts = nodeId.split(/[.-]/);
      return parseInt(parts[parts.length - 1], 10);
    }

    // For text nodes (including whitespace), find the preceding element with data-node-id
    // The text node's index = (preceding element's last id part) + 1
    // This works regardless of whitespace because all text after an element
    // belongs to the next Slate text leaf
    const siblings = Array.from(parent.childNodes);
    const nodeIndex = siblings.indexOf(node);

    for (let i = nodeIndex - 1; i >= 0; i--) {
      const sib = siblings[i];
      if (sib.nodeType === Node.ELEMENT_NODE && sib.hasAttribute('data-node-id')) {
        const nodeId = sib.getAttribute('data-node-id');
        const parts = nodeId.split(/[.-]/);
        return parseInt(parts[parts.length - 1], 10) + 1;
      }
    }

    // No preceding element with node-id - this is the first child (index 0)
    return 0;
  }

  /**
   * Gets the Slate path for an element node (not text node) by checking data-node-id
   * Used when selection is in an empty element with no text children
   *
   * @param {Element} element - DOM element to find path for
   * @returns {Array|null} Slate path as array of indices, or null if not found
   */
  getElementPath(element) {
    // Walk up to find the element with data-node-id
    let current = element;
    while (current && current.nodeType === Node.ELEMENT_NODE) {
      if (current.hasAttribute('data-node-id')) {
        const nodeId = current.getAttribute('data-node-id');
        const parts = nodeId.split(/[.-]/).map((p) => parseInt(p, 10));
        log('getElementPath: Found node-id', nodeId, '-> path:', parts);
        return parts;
      }
      if (current.hasAttribute('data-edit-text')) {
        // Reached the container without finding a node-id
        // For empty containers, return [0] (first paragraph)
        log('getElementPath: Reached container, returning [0]');
        return [0];
      }
      current = current.parentElement;
    }
    console.warn('[HYDRA] getElementPath: Could not find path for element');
    return null;
  }

  getNodePath(node) {
    const path = [];
    let current = node;

    // Inline elements that wrap text content (used to detect text leaf wrappers)
    const INLINE_WRAPPER_ELEMENTS = [
      'SPAN',
      'STRONG',
      'EM',
      'B',
      'I',
      'U',
      'S',
      'CODE',
      'A',
      'SUB',
      'SUP',
      'MARK',
    ];

    // Helper to check if element is an inline wrapper (using CSS if available)
    const isInlineElement = (el) => {
      if (typeof window !== 'undefined' && window.getComputedStyle) {
        const display = window.getComputedStyle(el).display;
        if (display && display !== '') {
          return display === 'inline' || display === 'inline-block';
        }
      }
      // Fall back to tag name (JSDOM or no CSS)
      return INLINE_WRAPPER_ELEMENTS.includes(el.nodeName);
    };

    // If starting with a text node, calculate its Slate index
    if (node.nodeType === Node.TEXT_NODE) {
      const parent = node.parentNode;

      // Check if parent has VALID data-node-id AND is an inline element (span, strong, etc.)
      // Inline elements wrap their text directly, blocks (p, div) may have multiple text children
      // Skip empty or "undefined" nodeId values (from frontends that render undefined as string)
      const parentNodeId = parent.hasAttribute?.('data-node-id')
        ? parent.getAttribute('data-node-id')
        : null;
      const hasValidNodeId =
        parentNodeId && parentNodeId !== '' && parentNodeId !== 'undefined';
      if (
        hasValidNodeId &&
        parent.nodeName !== 'P' &&
        parent.nodeName !== 'DIV' &&
        !parent.hasAttribute?.('data-edit-text')
      ) {
        // Parse the parent's path from its node ID
        const parts = parentNodeId.split(/[.-]/).map((p) => parseInt(p, 10));

        // Text node index within the parent element (filtered for Vue artifacts)
        const textIndex = this.getSlateIndexAmongSiblings(node, parent);

        // Build path: parent path + text index
        path.push(...parts, textIndex);
        return path;
      } else {
        // Parent doesn't have nodeId - is it a block element or inline wrapper?
        // Inline wrappers (span, etc.) represent text leaves - don't count text inside
        // Block elements (p, h1-h6, li, etc.) contain multiple children - count text position
        const isWrapper =
          isInlineElement(parent) &&
          !parent.hasAttribute?.('data-edit-text');

        if (isWrapper) {
          // Parent is an inline wrapper without nodeId (like Nuxt spans for text leaves)
          // Don't add textIndex - the wrapper represents the whole text leaf
          // Let the while loop calculate the wrapper's position in the block
          current = parent;
        } else {
          // Parent is a block element - calculate text's Slate index among siblings
          const slateIndex = this.getSlateIndexAmongSiblings(node, parent);
          path.push(slateIndex);
          current = parent;
        }
      }
    }

    // Walk up the DOM tree building the path
    let depth = 0;
    let foundContainer = false;
    let foundNodeIdInWalk = false;
    while (current) {
      const hasEditableField = current.hasAttribute?.('data-edit-text');
      const hasSlateEditor = current.hasAttribute?.('data-slate-editor');

      // Track if we've found an editable container
      if (hasEditableField || hasSlateEditor) {
        foundContainer = true;
      }

      // Check for valid nodeId (skip empty or "undefined" values from frontends)
      const nodeId = current.hasAttribute?.('data-node-id')
        ? current.getAttribute('data-node-id')
        : null;
      const hasValidNodeId =
        nodeId && nodeId !== '' && nodeId !== 'undefined';

      // Process current node if it has a valid nodeId
      // Must process BEFORE checking edit-text since element can have both
      if (hasValidNodeId) {
        foundNodeIdInWalk = true;
        // Parse node ID to get path components (e.g., "0.1" -> [0, 1] or "0-1" -> [0, 1])
        const parts = nodeId.split(/[.-]/).map((p) => parseInt(p, 10));

        // Prepend these path components
        for (let i = parts.length - 1; i >= 0; i--) {
          path.unshift(parts[i]);
        }

        // NodeIds are ABSOLUTE paths - stop after finding the first valid one
        // e.g., nodeId "1-1" means [1, 1], don't continue to add parent's nodeId
        break;
      }

      // Stop if we've reached the editable field container or slate editor (without nodeId)
      if (hasEditableField || hasSlateEditor) {
        break;
      }

      // Element without nodeId - only calculate index for inline wrapper elements
      // that could contain text (span, strong, etc.). Skip void elements (br, img, hr).
      const parent = current.parentNode;
      if (
        parent &&
        current.nodeType === Node.ELEMENT_NODE &&
        INLINE_WRAPPER_ELEMENTS.includes(current.nodeName)
      ) {
        const slateIndex = this.getSlateIndexAmongSiblings(current, parent);
        path.unshift(slateIndex);
      }

      current = parent;
      depth++;
    }

    // Verify we're within an editable container - if not found, continue walking up
    if (!foundContainer && current) {
      let checkNode = current.parentNode;
      while (checkNode) {
        if (
          checkNode.hasAttribute?.('data-edit-text') ||
          checkNode.hasAttribute?.('data-slate-editor')
        ) {
          foundContainer = true;
          break;
        }
        checkNode = checkNode.parentNode;
      }
    }

    // If we didn't find the editable field or slate editor, path is invalid
    if (!current || !foundContainer) {
      console.warn('[HYDRA] getNodePath - no container found, returning null');
      return null;
    }

    // If no nodeId was found, cursor may be on invalid whitespace or DOM is missing data-node-id.
    // Log detailed debug info to help diagnose the issue.
    if (!foundNodeIdInWalk) {
      // Find the editable container for context
      let container = node;
      while (container && !container.hasAttribute?.('data-edit-text')) {
        container = container.parentNode;
      }
      const blockElement = container?.closest?.('[data-block-uid]');
      const blockUid = blockElement?.getAttribute('data-block-uid') || null;
      const fieldName = container?.getAttribute?.('data-edit-text') || null;

      // Skip error for readonly blocks - they don't need selection sync
      if (blockUid && this.isBlockReadonly(blockUid)) {
        return null;
      }

      // Skip error if the field is not contenteditable — the user clicked on a
      // display-only field (e.g. a plain text field not yet activated for editing).
      // The data-node-id warning only matters when the field is actually being edited.
      if (container && container.getAttribute('contenteditable') !== 'true') {
        return null;
      }

      // Check if this field is supposed to be a Slate field
      // Use getFieldType which handles page-level fields (blockUid === null) correctly
      const fieldType = this.getFieldType(blockUid, fieldName);

      // Only skip error for KNOWN non-Slate fields
      // If fieldType is undefined (not registered), assume it could be Slate and show error
      if (fieldType && !this.fieldTypeIsSlate(fieldType)) {
        // This is a known non-Slate text field, just return null without error
        return null;
      }

      // Check if container has ANY data-node-id elements
      // If it does, the cursor is likely on whitespace and serializePoint will recover
      // via getValidPositionForWhitespace - don't show warning yet
      if (container?.querySelector('[data-node-id]')) {
        // Container has valid slate elements - let caller try recovery
        return null;
      }

      // Build DOM path showing which elements are missing data-node-id
      const domPath = [];
      let walkNode = node;
      while (walkNode && walkNode !== current?.parentNode) {
        if (walkNode.nodeType === Node.ELEMENT_NODE) {
          const tag = walkNode.tagName.toLowerCase();
          const nodeId = walkNode.getAttribute?.('data-node-id');
          const classes = walkNode.className ? `.${walkNode.className.split(' ').join('.')}` : '';
          if (nodeId) {
            domPath.unshift(`<${tag}${classes} data-node-id="${nodeId}">`);
          } else {
            domPath.unshift(`<${tag}${classes}> ⚠️ MISSING data-node-id`);
          }
        } else if (walkNode.nodeType === Node.TEXT_NODE) {
          const text = walkNode.textContent?.slice(0, 30) || '';
          domPath.unshift(`"${text}${walkNode.textContent?.length > 30 ? '...' : ''}"`);
        }
        walkNode = walkNode.parentNode;
      }

      // Get container innerHTML for debugging (truncated)
      const containerHtml = container?.innerHTML?.slice(0, 200) || 'N/A';

      const fieldTypeDesc = fieldType
        ? `"${fieldType}" (registered but no data-node-id rendered)`
        : 'undefined — field not registered in blockSchema.properties; if this is a Slate field, add it with widget: "slate"; if plain text, add type: "string"';

      const errorMsg =
        `Block: ${blockUid}, Field: ${fieldName}\nField type: ${fieldTypeDesc}\n\n` +
        'DOM path (text node → container):\n' +
        domPath.map((p, i) => '  '.repeat(i) + p).join('\n') +
        '\n\nContainer HTML:\n' + containerHtml + (container?.innerHTML?.length > 200 ? '...' : '');

      console.error('[HYDRA] Selection sync failed - missing data-node-id\n\n' + errorMsg);

      // Show visible warning overlay in iframe (only once per session)
      if (!this._shownNodeIdWarning) {
        this._shownNodeIdWarning = true;
        this.showDeveloperWarning(
          'Hydra: Missing data-node-id attributes',
          'Selection sync disabled. Your frontend must render data-node-id on Slate elements.\n\n' +
            errorMsg +
            '\n\nSee browser console for details.'
        );
      }
      return null;
    }

    // Ensure path has at least block index
    if (path.length === 0) {
      console.warn('[HYDRA] getNodePath - empty path, defaulting to [0, 0]');
      return [0, 0]; // Default to first block, first text
    }

    return path;
  }

  /**
   * Restores contenteditable attributes on editable fields within a block.
   * This is needed after renderer updates that may have replaced DOM elements.
   *
   * @param {HTMLElement} blockElement - The block element to restore contenteditable on
   * @param {string} caller - The caller for debugging (e.g., 'selectBlock', 'FORM_DATA')
   */
  restoreContentEditableOnFields(blockElement, caller = 'unknown') {
    // Get blockUid from the element - don't rely on this.selectedBlockUid as it may not be set yet
    const blockUid = blockElement.getAttribute('data-block-uid');

    // If block is readonly, remove contenteditable from all its editable fields
    if (blockUid && this.isBlockReadonly(blockUid)) {
      const editableFields = blockElement.querySelectorAll('[data-edit-text][contenteditable="true"]');
      editableFields.forEach((field) => {
        field.removeAttribute('contenteditable');
      });
      log(`restoreContentEditableOnFields called from ${caller}: block ${blockUid} is readonly, removed contenteditable`);
      return;
    }

    // For multi-element blocks, collect fields from ALL elements with this UID
    const editableFields = [];

    if (blockUid) {
      // Block-level field - use collectBlockFields to gather from all elements with this UID
      this.collectBlockFields(blockElement, 'data-edit-text',
        (el) => { editableFields.push(el); });
    } else {
      // Page-level field (no blockUid) - process the element directly
      // The element itself has data-edit-text (e.g., #page-title)
      if (blockElement.hasAttribute('data-edit-text')) {
        editableFields.push(blockElement);
      }
      // Also check any children with data-edit-text
      blockElement.querySelectorAll('[data-edit-text]').forEach((el) => {
        editableFields.push(el);
      });
    }
    log(`restoreContentEditableOnFields called from ${caller}: found ${editableFields.length} fields for block ${blockUid}`);
    editableFields.forEach((field) => {
      const fieldPath = field.getAttribute('data-edit-text');
      // Use getFieldType which handles page-level fields (e.g., /title) correctly
      const fieldType = this.getFieldType(blockUid, fieldPath);
      const wasEditable = field.getAttribute('contenteditable') === 'true';
      // Only set contenteditable for text-editable fields (string, textarea, slate)
      if (this.fieldTypeIsTextEditable(fieldType)) {
        field.setAttribute('contenteditable', 'true');
        log(`  ${fieldPath}: ${wasEditable ? 'already editable' : 'SET editable'} (type: ${fieldType})`);

        // For <pre> elements, handle Enter (newline) and Tab (indent) properly
        const isPreElement = field.tagName === 'PRE' || !!field.closest('pre');
        if (isPreElement && !field._preKeyHandler) {
          field._preKeyHandler = (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              // Insert a plain \n at cursor position instead of browser's <div>
              const sel = window.getSelection();
              if (!sel.rangeCount) return;
              const range = sel.getRangeAt(0);
              range.deleteContents();
              const textNode = document.createTextNode('\n');
              range.insertNode(textNode);
              // Move cursor after the newline
              range.setStartAfter(textNode);
              range.setEndAfter(textNode);
              sel.removeAllRanges();
              sel.addRange(range);
              field.dispatchEvent(new Event('input', { bubbles: true }));
            } else if (e.key === 'Tab') {
              e.preventDefault();
              // Insert 2 spaces for indentation
              const sel = window.getSelection();
              if (!sel.rangeCount) return;
              const range = sel.getRangeAt(0);
              range.deleteContents();
              const spaces = document.createTextNode('  ');
              range.insertNode(spaces);
              range.setStartAfter(spaces);
              range.setEndAfter(spaces);
              sel.removeAllRanges();
              sel.addRange(range);
              field.dispatchEvent(new Event('input', { bubbles: true }));
            }
          };
          field.addEventListener('keydown', field._preKeyHandler);
        }

        // For plain string fields (single-line), Enter navigates to next field or adds a block
        if (this.fieldTypeIsPlainString(fieldType) && !field._enterKeyHandler) {
          field._enterKeyHandler = (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              const blockEl = field.closest('[data-block-uid]');
              if (!blockEl) return;
              const ownFields = this.getOwnEditableFields(blockEl);
              const idx = ownFields.indexOf(field);
              if (idx < ownFields.length - 1) {
                // Not last field → focus next field
                const nextField = ownFields[idx + 1];
                nextField.focus();
                const sel = window.getSelection();
                const range = document.createRange();
                range.selectNodeContents(nextField);
                range.collapse(true);
                sel.removeAllRanges();
                sel.addRange(range);
              } else {
                // Last field → add new block after
                const blockUid = blockEl.getAttribute('data-block-uid');
                this.sendMessageToParent({
                  type: 'ADD_BLOCK_AFTER',
                  blockId: blockUid,
                });
              }
            }
          };
          field.addEventListener('keydown', field._enterKeyHandler);
        }

        // Arrow key edge navigation: move between fields/blocks when cursor is at edge
        if (!field._arrowNavHandler) {
          field._arrowNavHandler = (e) => {
            if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return;
            if (e.ctrlKey || e.metaKey || e.altKey) return;
            this.moveArrowKey(e.key, field, e.shiftKey);
            e.preventDefault();
          };
          field.addEventListener('keydown', field._arrowNavHandler);
        }
      } else {
        log(`  ${fieldPath}: skipped (type: ${fieldType})`);
      }
    });

    // Clean up stale contenteditable attributes from elements that are no longer editable
    // This happens when a field was editable but is no longer (e.g., teaser overwrite unchecked)
    const allContentEditable = blockElement.querySelectorAll('[contenteditable="true"]');
    allContentEditable.forEach((el) => {
      // Skip if this element belongs to a nested block
      const elBlock = el.closest('[data-block-uid]');
      if (elBlock !== blockElement) return;

      // If element has no data-edit-text, remove contenteditable
      if (!el.hasAttribute('data-edit-text')) {
        el.removeAttribute('contenteditable');
        log(`  Removed stale contenteditable from element without data-edit-text`);
      }
    });
  }

  /**
   * Activate an editable field: make it contenteditable, set up observers, focus it, and position cursor.
   * This is the common logic used by both block selection and page-level field clicks.
   *
   * @param {HTMLElement} fieldElement - The element with data-edit-text
   * @param {string} fieldName - The field name (e.g., 'value', 'title')
   * @param {string|null} blockUid - The block UID (null for page-level fields)
   * @param {string} caller - Caller name for debugging
   * @param {Object} options - Optional settings:
   *   - skipContentEditable: Don't call restoreContentEditableOnFields (already done)
   *   - skipObservers: Don't set up text change observers (already done)
   *   - preventScroll: Pass to focus() to prevent scrolling
   *   - wasAlreadyEditable: Field was contenteditable before click (trust browser positioning if also focused)
   *   - saveClickPosition: Save position for FORM_DATA handler to restore after re-render
   */
  activateEditableField(fieldElement, fieldName, blockUid, caller, options = {}) {
    log(`activateEditableField called from ${caller}:`, { fieldName, blockUid, options });

    // Make field contenteditable (unless already done)
    if (!options.skipContentEditable) {
      this.restoreContentEditableOnFields(fieldElement, caller);
    }

    // Set up text change observers (unless already done)
    if (!options.skipObservers) {
      this.observeBlockTextChanges(fieldElement);
    }

    // Get field type to determine if it's text-editable
    const fieldType = this.getFieldType(blockUid, fieldName);

    if (!this.fieldTypeIsTextEditable(fieldType)) {
      return;
    }

    // Check if already focused (avoid disrupting cursor position)
    const isAlreadyFocused = document.activeElement === fieldElement;
    log('activateEditableField focus check:', { isAlreadyFocused, activeElement: document.activeElement?.tagName });

    // Focus the field if not already focused
    if (!isAlreadyFocused) {
      fieldElement.focus({ preventScroll: options.preventScroll });
      log(`activateEditableField: focused field`);
    }

    // If field was already editable AND already focused, browser already handled
    // cursor positioning on click - don't redo it (causes race with typing)
    // BUT: still check if cursor is on invalid whitespace (e.g., on DIV container
    // instead of inside P element) and correct if needed
    // NOTE: Use requestAnimationFrame to run after browser's default click positioning completes
    if (options.wasAlreadyEditable && isAlreadyFocused) {
      requestAnimationFrame(() => {
        const selection = window.getSelection();
        const anchorNode = selection?.anchorNode;
        const anchorNeedsCorrection = anchorNode && this.isOnInvalidWhitespace(anchorNode);
        log('activateEditableField: deferred check -', {
          anchorNodeName: anchorNode?.nodeName,
          anchorOffset: selection?.anchorOffset,
          needsCorrection: anchorNeedsCorrection,
        });
        if (anchorNeedsCorrection) {
          log('activateEditableField: already focused but cursor on invalid whitespace, correcting');
          this.correctInvalidWhitespaceSelection();
        } else {
          log('activateEditableField: field already editable and focused, browser positioning OK');
        }
      });
      this.lastClickPosition = null;
      return;
    }

    // Position cursor at click location if we have coordinates
    if (!this.lastClickPosition) {
      // No click position (e.g., new block created via Enter) - ensure cursor
      // is inside a valid data-node-id element using the existing correction logic
      const selection = window.getSelection();
      const selectionInfo = selection?.rangeCount ? {
        rangeCount: selection.rangeCount,
        anchorNode: selection.anchorNode?.nodeName,
        anchorOffset: selection.anchorOffset,
        anchorNodeId: selection.anchorNode?.parentElement?.getAttribute?.('data-node-id') ||
                      selection.anchorNode?.getAttribute?.('data-node-id'),
      } : { noSelection: true };
      log('activateEditableField: no lastClickPosition, selection state:', selectionInfo);
      const corrected = this.correctInvalidWhitespaceSelection();
      log('activateEditableField: correction result:', corrected);
      return;
    }

    const currentRect = fieldElement.getBoundingClientRect();
    const clientX = currentRect.left + this.lastClickPosition.relativeX;
    const clientY = currentRect.top + this.lastClickPosition.relativeY;

    log('activateEditableField: positioning cursor at click location:', {
      relativeX: this.lastClickPosition.relativeX,
      relativeY: this.lastClickPosition.relativeY,
      clientX,
      clientY,
    });

    // Save click position for FORM_DATA handler if requested (for re-render scenarios)
    if (options.saveClickPosition) {
      this.savedClickPosition = {
        relativeX: this.lastClickPosition.relativeX,
        relativeY: this.lastClickPosition.relativeY,
        editableField: this.lastClickPosition.editableField,
      };
    }

    // Only restore click position if there's no existing non-collapsed selection
    const currentSelection = window.getSelection();
    const hasNonCollapsedSelection = currentSelection &&
      currentSelection.rangeCount > 0 &&
      !currentSelection.getRangeAt(0).collapsed;

    if (hasNonCollapsedSelection) {
      log('activateEditableField: skipping cursor positioning - non-collapsed selection exists');
    } else {
      const range = document.caretRangeFromPoint(clientX, clientY);
      if (range) {
        log('activateEditableField: caretRangeFromPoint result:', {
          startContainer: range.startContainer.nodeName,
          startOffset: range.startOffset,
          isOnInvalid: this.isOnInvalidWhitespace(range.startContainer),
        });
        const validPos = this.getValidatedPosition(range.startContainer, range.startOffset);
        log('activateEditableField: getValidatedPosition result:', {
          nodeName: validPos.node?.nodeName,
          offset: validPos.offset,
          nodeId: validPos.node?.parentElement?.getAttribute?.('data-node-id') || validPos.node?.getAttribute?.('data-node-id'),
        });
        const finalRange = document.createRange();
        finalRange.setStart(validPos.node, validPos.offset);
        finalRange.collapse(true);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(finalRange);
        log('activateEditableField: cursor positioned at offset:', validPos.offset);
      }
    }

    // Clear lastClickPosition - we've used it
    this.lastClickPosition = null;
  }

  /**
   * Ensure all interactive elements have minimum size so users can click/select them.
   * Called after FORM_DATA to handle newly added blocks that haven't been selected yet.
   * Only sets min dimensions on elements that have zero width or height (respects existing styling).
   */
  ensureElementsHaveMinSize() {
    // Helper: only set min-size if element has no size
    const ensureSize = (el, minWidth, minHeight) => {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) {
        el.style.minWidth = minWidth;
        el.style.minHeight = minHeight;
      } else if (rect.width === 0) {
        el.style.minWidth = minWidth;
      } else if (rect.height === 0) {
        el.style.minHeight = minHeight;
      }
      // If element already has both width and height, don't touch it
    };

    // Editable fields need min-height for text cursor
    document.querySelectorAll('[data-edit-text]').forEach((el) => {
      ensureSize(el, 'auto', '1.5em');
    });

    // Media fields need min dimensions for image picker overlay
    document.querySelectorAll('[data-edit-media]').forEach((el) => {
      ensureSize(el, '100px', '100px');
    });

    // Blocks need min-height for click selection
    document.querySelectorAll('[data-block-uid]').forEach((el) => {
      ensureSize(el, 'auto', '2em');
    });
  }

  /**
   * Ensure empty inline elements have zero-width spaces for cursor positioning.
   * Called after DOM is updated to allow cursor placement in empty formatting elements.
   * Uses \uFEFF (zero-width no-break space) like slate-react.
   *
   * @param {HTMLElement} container - The container element to process
   */
  /**
   * Find empty inline elements in Slate value that need ZWS for cursor positioning.
   * Returns array of nodeIds that should have ZWS.
   *
   * An inline element is any node with a type AND children (not a text leaf).
   * We detect empty inlines by checking if children is just [{text: ''}].
   */
  /**
   * Strip zero-width spaces from text content.
   * Part of ZWS lifecycle (stripping) — see "Whitespace & ZWS Strategy".
   * ZWS characters are added for cursor positioning and should be removed
   * when serializing text back to Slate. Also converts NBSP to regular space.
   *
   * @param {string} text - Text content that may contain ZWS
   * @returns {string} - Text with ZWS removed
   */
  stripZeroWidthSpaces(text) {
    if (!text) return text;
    // Remove ZWS characters and convert NBSP to regular space
    return text.replace(/[\uFEFF\u200B]/g, '').replace(/\u00A0/g, ' ');
  }

  /**
   * Clean HTML content for clipboard - removes internal data attributes and ZWS/NBSP.
   * Only strips ZWS/NBSP from text within editable fields, preserving other content.
   *
   * @param {DocumentFragment|HTMLElement} fragment - DOM fragment or element to clean
   * @returns {string} - Cleaned HTML string
   */
  cleanHtmlForClipboard(fragment) {
    const tempDiv = document.createElement('div');
    tempDiv.appendChild(fragment.cloneNode(true));

    // Find editable fields and clean text nodes within them
    const editableFields = tempDiv.querySelectorAll('[data-edit-text]');
    editableFields.forEach((field) => {
      const walker = document.createTreeWalker(field, NodeFilter.SHOW_TEXT);
      let node;
      while ((node = walker.nextNode())) {
        // Strip ZWS and convert NBSP to regular space
        node.textContent = node.textContent
          .replace(/[\uFEFF\u200B]/g, '')
          .replace(/\u00A0/g, ' ');
      }
    });

    // Remove internal data attributes from all elements
    const internalAttrs = [
      'data-node-id',
      'data-field-name',
      'data-slate-node',
      'data-slate-leaf',
      'data-slate-string',
      'data-block-uid',
      'data-edit-text',
    ];
    tempDiv.querySelectorAll('*').forEach((el) => {
      internalAttrs.forEach((attr) => el.removeAttribute(attr));
    });

    return tempDiv.innerHTML;
  }

  /**
   * Handle copy event — clean selection and write to clipboard.
   * Single function called from both native copy events and execCommand('copy') replay.
   * Strips ZWS/NBSP from text, removes internal data-* attributes from HTML.
   */
  _doCopy(e) {
    const selection = window.getSelection();
    if (!selection.rangeCount) return;

    const range = selection.getRangeAt(0);

    // Strip ZWS and NBSP (contenteditable artifacts) from text
    let cleanText = this.stripZeroWidthSpaces(selection.toString());
    cleanText = cleanText.replace(/\u00A0/g, ' ');

    // cleanHtmlForClipboard only cleans within [data-edit-text] elements
    const cleanHtml = this.cleanHtmlForClipboard(range.cloneContents());

    log('Copy event - cleaning clipboard');
    e.preventDefault();
    e.clipboardData.setData('text/plain', cleanText);
    e.clipboardData.setData('text/html', cleanHtml);
  }

  /**
   * Handle cut — copy cleaned selection to clipboard, then delete via transform.
   * Single function called from both normal keydown handler and buffered replay.
   */
  _doCut(blockUid) {
    // execCommand('copy') triggers a trusted copy event → _doCopy cleans clipboard
    document.execCommand('copy');
    // Delete the selected content via transform
    this.sendTransformRequest(blockUid, 'delete', {});
  }

  /**
   * Handle paste — send paste transform with HTML content.
   * Single function called from both native paste event handler and buffered replay.
   */
  _doPaste(blockUid, html) {
    this.sendTransformRequest(blockUid, 'paste', { html });
  }

  /**
   * Strip zero-width spaces from DOM text nodes within a container.
   * Part of ZWS lifecycle (stripping) — see "Whitespace & ZWS Strategy".
   * Only removes ZWS from text nodes that have other content (not from
   * empty-except-ZWS nodes, which still need ZWS for cursor positioning).
   *
   * @param {HTMLElement} container - Container element to search for text nodes
   */
  stripZeroWidthSpacesFromDOM(container) {
    const walker = document.createTreeWalker(
      container,
      NodeFilter.SHOW_TEXT,
      null,
    );

    const nodesToUpdate = [];
    let node;
    while ((node = walker.nextNode())) {
      const text = node.textContent;
      // Only strip ZWS if there's other content - don't strip from ZWS-only nodes
      // (ZWS-only nodes are still needed for cursor positioning in empty elements)
      if (text && text.length > 1 && /[\uFEFF\u200B]/.test(text)) {
        nodesToUpdate.push(node);
      }
    }

    if (nodesToUpdate.length === 0) {
      return; // Nothing to strip
    }

    // Update nodes after walking to avoid modifying during iteration
    // Note: This function is NOT called during typing to avoid cursor corruption.
    // It may be used for cleanup in other contexts if needed.
    for (const textNode of nodesToUpdate) {
      const newText = textNode.textContent.replace(/[\uFEFF\u200B]/g, '');
      if (newText !== textNode.textContent) {
        log('stripZeroWidthSpacesFromDOM: Stripping ZWS from:', JSON.stringify(textNode.textContent), '→', JSON.stringify(newText));
        textNode.textContent = newText;
      }
    }
  }

  /**
   * Post-render DOM updates shared by both INITIAL_DATA and FORM_DATA handlers.
   * Runs inside a double requestAnimationFrame to ensure the renderer has finished.
   *
   * For INITIAL_DATA, all optional params are absent so the cursor/resize/block-switch
   * code paths are no-ops.
   *
   * @param {Object} [options]
   * @param {Object} [options.transformedSelection] - Slate selection from admin
   * @param {string} [options.formatRequestId] - Format operation request id
   * @param {boolean} [options.needsBlockSwitch] - Whether admin selected a different block
   * @param {string} [options.adminSelectedBlockUid] - Block uid admin wants selected
   */
  afterContentRender({ transformedSelection, formatRequestId, needsBlockSwitch, adminSelectedBlockUid } = {}) {
    // Materialize comments immediately so data-block-uid attributes are available
    // before any waitFor selectors run. The rAF call below handles late-arriving
    // async framework content (React Suspense, Vue async components).
    this.materializeHydraComments();

    requestAnimationFrame(() => {
      requestAnimationFrame(async () => {
        // Re-materialize for any async framework content that arrived after initial call
        this.materializeHydraComments();
        this.markEmptyBlocks();
        this.applyReadonlyVisuals();

        // Re-attach observers/editors for the currently selected block
        if (this.selectedBlockUid) {
          const blockElement = this.queryBlockElement(this.selectedBlockUid);
          if (blockElement) {
            // NOTE: observeBlockTextChanges is NOT called here — it's deferred
            // to the very end of afterContentRender, after restoreSlateSelection
            // and replayBufferAndUnblock complete. Reconnecting the observer
            // earlier causes it to fire on DOM mutations from selection
            // restoration (ZWS creation) or late Vue render passes, corrupting
            // this.formData via handleTextChange reading mid-render DOM.
            this.makeBlockContentEditable(blockElement);

            const editableFields = this.getEditableFields(blockElement);
            const isSidebarEdit = !transformedSelection;
            const blockElements = [...this.getAllBlockElements(this.selectedBlockUid)];
            this.observeBlockResize(blockElements, this.selectedBlockUid, editableFields, isSidebarEdit);

            const newBlockRect = blockElement.getBoundingClientRect();
            const newMediaFields = this.getMediaFields(blockElement);

            const blockRectChanged = !this.lastBlockRect ||
              Math.abs(newBlockRect.top - this.lastBlockRect.top) > 1 ||
              Math.abs(newBlockRect.left - this.lastBlockRect.left) > 1 ||
              Math.abs(newBlockRect.width - this.lastBlockRect.width) > 1 ||
              Math.abs(newBlockRect.height - this.lastBlockRect.height) > 1;

            let mediaFieldsChanged = false;
            const newFieldNames = Object.keys(newMediaFields);
            const lastFieldNames = Object.keys(this.lastMediaFields || {});
            if (newFieldNames.length !== lastFieldNames.length) {
              mediaFieldsChanged = true;
            } else {
              for (const fieldName of newFieldNames) {
                const newRect = newMediaFields[fieldName]?.rect;
                const lastRect = this.lastMediaFields?.[fieldName]?.rect;
                if (!newRect || !lastRect ||
                    Math.abs(newRect.top - lastRect.top) > 1 ||
                    Math.abs(newRect.left - lastRect.left) > 1 ||
                    Math.abs(newRect.width - lastRect.width) > 1 ||
                    Math.abs(newRect.height - lastRect.height) > 1) {
                  mediaFieldsChanged = true;
                  break;
                }
              }
            }

            log('afterContentRender check:', {
              blockRectChanged,
              mediaFieldsChanged,
              newBlockRect: { top: newBlockRect.top, height: newBlockRect.height },
              newMediaFields,
              lastMediaFields: this.lastMediaFields,
            });

            if (transformedSelection || blockRectChanged || mediaFieldsChanged) {
              log('afterContentRender sending BLOCK_SELECTED with mediaFields:', newMediaFields);
              this.sendBlockSelected('afterContentRender', blockElement, {
                selection: transformedSelection || undefined,
              });
              this.lastBlockRect = { top: newBlockRect.top, left: newBlockRect.left, width: newBlockRect.width, height: newBlockRect.height };
              this.lastMediaFields = JSON.parse(JSON.stringify(newMediaFields));
            }
          }
        }

        // Update block UI overlay positions after form data changes
        // Detect focus lost due to re-render: user was editing a field but
        // focus is now on body (Vue/Nuxt replaced the DOM element).
        // Use _iframeFocused (tracked via window focus/blur events) instead of
        // document.hasFocus() — the latter is unreliable in headless browsers
        // (always returns false), but window focus/blur events fire correctly
        // because they're dispatched by Chromium's internal frame focus manager.
        // This avoids stealing focus from the sidebar: when the user is typing
        // in the sidebar, the iframe receives a blur event → _iframeFocused=false.
        const focusLost = this.focusedFieldName &&
            this._iframeFocused &&
            (!document.activeElement ||
             document.activeElement === document.body ||
             document.activeElement === document.documentElement);
        const skipFocus = !transformedSelection && !focusLost;

        if (transformedSelection) {
          this.savedClickPosition = null;
        }

        const blockUidToProcess = needsBlockSwitch ? adminSelectedBlockUid : this.selectedBlockUid;
        const blockHandler = needsBlockSwitch
          ? (el) => { log('Selecting new block from afterContentRender:', blockUidToProcess); this.selectBlock(el); }
          : (el) => this.updateBlockUIAfterFormData(el, skipFocus);

        if (blockUidToProcess) {
          let blockElement = this.queryBlockElement(blockUidToProcess);

          if (blockElement && this.isElementHidden(blockElement)) {
            if (this._blockSelectorNavigating || this._navigatingToBlock) {
              log('afterContentRender: block hidden, waiting for animation:', blockUidToProcess);
              for (let i = 0; i < 30; i++) {
                await new Promise((resolve) => setTimeout(resolve, 50));
                blockElement = this.queryBlockElement(blockUidToProcess);
                if (blockElement && !this.isElementHidden(blockElement)) {
                  log('afterContentRender: block now visible after animation');
                  break;
                }
              }
            } else {
              log('afterContentRender: block is hidden, trying to make visible:', blockUidToProcess);
              const madeVisible = this.tryMakeBlockVisible(blockUidToProcess);
              if (madeVisible) {
                for (let i = 0; i < 10; i++) {
                  await new Promise((resolve) => setTimeout(resolve, 50));
                  blockElement = this.queryBlockElement(blockUidToProcess);
                  if (blockElement && !this.isElementHidden(blockElement)) {
                    log('afterContentRender: block now visible');
                    break;
                  }
                }
              }
            }
          }

          blockElement = this.queryBlockElement(blockUidToProcess);

          if (!blockElement && needsBlockSwitch) {
            for (let retry = 0; retry < 10 && !blockElement; retry++) {
              await new Promise(r => setTimeout(r, 100));
              blockElement = this.queryBlockElement(blockUidToProcess);
              log('afterContentRender: retry', retry + 1, 'finding block', blockUidToProcess, 'found:', !!blockElement);
            }
          }

          this.ensureElementsHaveMinSize();
          if (blockElement) {
            blockHandler(blockElement);
          } else if (needsBlockSwitch) {
            log('afterContentRender: block element not found after retries:', blockUidToProcess);
          }
        }

        // Wait for rendered DOM content to match formData before restoring
        // selection. On mock frontends this matches immediately; on Nuxt, Vue's
        // reactivity may trigger secondary renders that replace DOM nodes after
        // the double-RAF. Proceeding before the render is complete would cause
        // restoreSlateSelection to anchor on nodes that get replaced, destroying
        // the selection.
        if (this.selectedBlockUid && this.formData) {
          const contentBlock = this.queryBlockElement(this.selectedBlockUid);
          if (contentBlock) {
            await this.waitForContentReady(contentBlock);
          }
        }

        let selectionRestored = true;
        if (transformedSelection) {
          // expectedSelectionFromAdmin was already set before the render
          // (in the FORM_DATA handler) to suppress re-render selectionchanges.
          try {
            selectionRestored = await this.restoreSlateSelection(transformedSelection, this.formData);
          } catch (e) {
            console.error('[HYDRA] Error restoring selection:', e);
            selectionRestored = false;
          }
          if (!selectionRestored) {
            log('Selection restore failed — dropping', this.eventBuffer.length, 'buffered events to avoid wrong-selection replay');
            this.eventBuffer = [];
          }

          // Clear after a brief settling period to catch trailing selectionchanges
          // from DOM attribute updates (contenteditable, nodeIds, etc.)
          setTimeout(() => { this.expectedSelectionFromAdmin = null; }, 100);
        }

        if (needsBlockSwitch && adminSelectedBlockUid) {
          if (this.pendingTransform) {
            log('Redirecting buffer from', this.pendingTransform.blockId, 'to new block:', adminSelectedBlockUid);
            this.pendingTransform.blockId = adminSelectedBlockUid;
          }
          if (this.eventBuffer.length > 0) {
            log('Redirecting eventBuffer to new block:', adminSelectedBlockUid);
          }
        }

        // Replay keystrokes buffered during re-render (separate from format op replay)
        if (this._reRenderBlocking) {
          this._reRenderBlocking = false;

          // Restore pre-render cursor position when no transformedSelection was
          // provided (echo or sidebar FORM_DATA). The DOM re-render may reset
          // cursor to position 0; we need to put it back before replaying events.
          // Only restore when iframe has focus — restoring selection calls .focus()
          // which would steal focus from sidebar fields. Note: skipFocus (based on
          // focusLost) can't be used here because frameworks like Vue may patch the
          // DOM without destroying the focused element, so focus isn't "lost" even
          // though the cursor position was reset to 0.
          if (!transformedSelection && this._preRenderSelection && this._iframeFocused) {
            log('Restoring pre-render selection for buffer replay:', JSON.stringify(this._preRenderSelection));
            try {
              await this.restoreSlateSelection(this._preRenderSelection, this.formData);
            } catch (e) {
              log('Pre-render selection restore failed:', e.message);
            }
          }
          this._preRenderSelection = null;

          if (this.eventBuffer.length > 0) {
            log('Replaying', this.eventBuffer.length, 're-render buffered events');
            this.pendingBufferReplay = {
              blockId: this.selectedBlockUid,
              buffer: [...this.eventBuffer],
            };
            this.eventBuffer = [];
            this.replayBufferedEvents();
          }
          // Clear blocking only if no format op is pending
          if (!this.pendingTransform) {
            this.blockedBlockId = null;
          }
        }

        this.replayBufferAndUnblock();

        // Render cycle complete — process any queued FORM_DATA.
        // Only the latest queued message matters (earlier ones are stale).
        this._renderInProgress = false;
        if (this._formDataQueue) {
          const queued = this._formDataQueue;
          this._formDataQueue = null;
          log('Processing queued FORM_DATA after render complete');
          // Re-dispatch as a message event so it goes through the full
          // FORM_DATA handler (stale check, addNodeIds, etc.)
          // Any queued FLUSH_BUFFER will be processed after this render completes.
          window.postMessage(queued, window.location.origin);
        } else if (this._flushBufferQueue) {
          // Process queued FLUSH_BUFFER after render complete and FORM_DATA processed.
          // Now the DOM is stable with nodeIds, so serializeSelection() will work.
          const queuedFlush = this._flushBufferQueue;
          this._flushBufferQueue = null;
          log('Processing queued FLUSH_BUFFER after render complete');
          this._processFlushBuffer(queuedFlush.requestId);
        }

        // Re-attach text change observer LAST, after all DOM operations
        // (restoreSlateSelection, replayBufferAndUnblock, queue processing)
        // are complete. Reconnecting earlier causes the observer to fire on
        // ZWS creation from restoreSlateSelection or late Vue render passes,
        // and handleTextChange reads mid-render DOM, corrupting this.formData.
        if (this.selectedBlockUid) {
          const currentBlockEl = this.queryBlockElement(this.selectedBlockUid);
          if (currentBlockEl) {
            this.observeBlockTextChanges(currentBlockEl);
          }
        }
      });
    });
  }

  /**
   * Read the text content of a data-node-id element from the DOM.
   * Shared by handleTextChange (single node) and readFieldValueFromDOM (full field).
   */
  readNodeText(nodeEl) {
    return this.stripZeroWidthSpaces(nodeEl.innerText)?.replace(/\n$/, '');
  }

  /**
   * Read an editable field's current DOM content back as a slate value.
   * Clones the formData value then updates each node's text from the DOM,
   * using the same readNodeText logic as handleTextChange.
   */
  readFieldValueFromDOM(fieldEl, slateValue) {
    const clone = JSON.parse(JSON.stringify(slateValue));
    const nodeEls = fieldEl.querySelectorAll('[data-node-id]');
    const nodes = fieldEl.hasAttribute('data-node-id')
      ? [fieldEl, ...nodeEls] : [...nodeEls];

    for (const nodeEl of nodes) {
      // Skip parent nodes that contain child data-node-id elements —
      // their innerText includes children's text, which would cause
      // updateJsonNode to collapse the inline element structure.
      if (nodeEl.querySelector('[data-node-id]')) continue;

      const nodeId = nodeEl.getAttribute('data-node-id');
      const text = this.readNodeText(nodeEl);
      this.updateJsonNode(clone, nodeId, text);
    }
    return clone;
  }

  /**
   * Wait for the rendered DOM to match this.formData for a block's editable fields.
   * Reads the full contenteditable back via readFieldValueFromDOM and compares
   * against the formData value. Returns immediately when content matches (zero
   * cost on mock); on Nuxt/Vue waits for secondary renders to complete.
   */
  async waitForContentReady(blockElement, maxRetries = 20) {
    const blockUid = blockElement.getAttribute('data-block-uid');
    const blockData = this.getBlockData(blockUid);
    if (!blockData) return;

    const editableFields = this.getEditableFields(blockElement);
    for (const [fieldName, fieldType] of Object.entries(editableFields)) {
      if (!this.fieldTypeIsSlate(fieldType)) continue;
      const slateValue = blockData[fieldName];
      if (!slateValue || !Array.isArray(slateValue)) continue;

      const fieldEl = blockElement.querySelector(`[data-edit-text="${fieldName}"]`)
        || (blockElement.getAttribute('data-edit-text') === fieldName ? blockElement : null);
      if (!fieldEl) continue;

      const expected = JSON.stringify(slateValue);
      for (let retry = 0; retry < maxRetries; retry++) {
        const domValue = this.readFieldValueFromDOM(fieldEl, slateValue);
        if (JSON.stringify(domValue) === expected) break;
        if (retry === 0) {
          log('waitForContentReady: content mismatch, waiting for render to complete');
        }
        await new Promise(r => requestAnimationFrame(r));
      }
    }
  }

  /**
   * Marks empty blocks in the DOM with a data attribute for styling.
   * This allows hydra to style empty blocks without requiring the renderer
   * to add special attributes.
   */
  markEmptyBlocks() {
    const allBlocks = document.querySelectorAll('[data-block-uid]');
    allBlocks.forEach((blockElement) => {
      const blockUid = blockElement.getAttribute('data-block-uid');
      if (this.getBlockType(blockUid) === 'empty') {
        blockElement.setAttribute('data-hydra-empty', 'true');
      } else {
        blockElement.removeAttribute('data-hydra-empty');
      }
    });
  }

  /**
   * Applies visual styling to readonly blocks.
   * Blocks where isBlockReadonly() returns true get the hydra-locked class.
   * This visually greys out:
   * - In normal mode: readonly template blocks
   * - In template edit mode: blocks outside the template being edited
   */
  applyReadonlyVisuals() {
    // Build a dynamic CSS rule targeting readonly blocks by data-block-uid.
    // This is resilient to framework re-renders — CSS selectors keep matching
    // even when Vue/React/Svelte replaces or patches DOM elements.
    const readonlyUids = [];
    const allBlocks = document.querySelectorAll('[data-block-uid]');
    allBlocks.forEach((blockElement) => {
      const blockUid = blockElement.getAttribute('data-block-uid');
      const blockData = this.getBlockData(blockUid);
      if (isBlockReadonly(blockData, this.templateEditMode)) {
        readonlyUids.push(blockUid);
      }
    });

    // Update or create the dynamic style element
    if (!this._readonlyStyleEl) {
      this._readonlyStyleEl = document.createElement('style');
      this._readonlyStyleEl.type = 'text/css';
      document.head.appendChild(this._readonlyStyleEl);
    }
    let newCSS = '';
    if (readonlyUids.length > 0) {
      const selector = readonlyUids.map(uid => `[data-block-uid="${uid}"]`).join(', ');
      newCSS = `${selector} { filter: grayscale(0.5) opacity(0.6); }`;
    }
    // Only update DOM when CSS actually changes to avoid unnecessary style recalculations
    if (this._readonlyStyleEl.textContent !== newCSS) {
      this._readonlyStyleEl.textContent = newCSS;
    }
  }

  /**
   * Updates block UI positions and states after form data changes.
   * Centralizes all UI updates that need to happen when blocks are re-rendered,
   * including after drag-and-drop reordering.
   *
   * @param {HTMLElement} blockElement - The currently selected block element.
   */
  updateBlockUIAfterFormData(blockElement, skipFocus = false) {
    // Restore contenteditable on fields after renderer updates
    // The renderer may have replaced DOM elements, removing contenteditable attributes
    this.restoreContentEditableOnFields(blockElement, 'FORM_DATA');

    // Note: ZWS for cursor positioning is added just-in-time in restoreSlateSelection

    // Determine field type for focused field (supports page-level and nested blocks)
    const fieldType = this.focusedFieldName ? this.getFieldType(this.selectedBlockUid, this.focusedFieldName) : null;

    // Focus and position cursor in the focused field
    // This ensures clicking a field focuses it immediately (no double-click required)
    // Skip focus if editing from sidebar - don't steal focus from sidebar fields
    // EXCEPTION: If we have savedClickPosition, restore cursor because the re-render
    // may have destroyed the DOM element where cursor was positioned.
    // Note: savedClickPosition is cleared in FORM_DATA handler when content changes (sidebar edit)
    const hasSavedClickPosition = !!this.savedClickPosition;
    if (this.focusedFieldName && (!skipFocus || hasSavedClickPosition)) {
      const focusedField = this.getEditableFieldByName(blockElement, this.focusedFieldName);

      if (focusedField && this.fieldTypeIsTextEditable(fieldType)) {
        // Focus the field (only if not skipFocus, unless we need to restore click position)
        if (!skipFocus || hasSavedClickPosition) {
          focusedField.focus();
        }

        // Position cursor at click location if we saved it
        if (this.savedClickPosition) {
          const selection = window.getSelection();
          if (selection) {
            // Only restore click position if there's no existing non-collapsed selection
            if (!selection.rangeCount || selection.isCollapsed) {
              // Convert relative position to screen coordinates using current element position
              const currentRect = focusedField.getBoundingClientRect();
              const clientX = currentRect.left + this.savedClickPosition.relativeX;
              const clientY = currentRect.top + this.savedClickPosition.relativeY;

              // Position cursor at the click location using caretRangeFromPoint
              const range = document.caretRangeFromPoint(clientX, clientY);
              if (range) {
                selection.removeAllRanges();
                selection.addRange(range);
              }
            }
          }
          // Clear saved click position after using it
          this.savedClickPosition = null;
        }
      }
    }

    // Scroll to block if not visible - BUT skip if we just finished dragging this block.
    // After drag-drop, the async renderer may not have completed yet and we'd be
    // scrolling to the OLD position. observeBlockDomChanges will scroll after re-render.
    let didScroll = false;
    const justDraggedThisBlock = this._justFinishedDragBlockId === this.selectedBlockUid;
    if (!this.elementIsVisibleInViewport(blockElement) && !justDraggedThisBlock) {
      log('updateBlockUIAfterFormData: scrolling to block', this.selectedBlockUid);
      this.scrollBlockIntoView(blockElement);
      didScroll = true;
    }

    // Send updated block position to Admin UI for toolbar/overlay positioning
    // For multi-element blocks, use combined bounding box
    const allElements = this.getAllBlockElements(this.selectedBlockUid);
    // Always convert to plain object - DOMRect is live and would cause comparison issues
    let currentRect = this.getBoundingBoxForElements(allElements);
    if (!currentRect) {
      const domRect = blockElement.getBoundingClientRect();
      currentRect = { top: domRect.top, left: domRect.left, width: domRect.width, height: domRect.height };
    }

    // For skipFocus (sidebar edits): only send if position actually changed (e.g., after drag-and-drop)
    // For !skipFocus (format operations): always send
    // IMPORTANT: Always send if we just scrolled to the block - Admin needs the new rect
    let shouldSendBlockSelected = !skipFocus || didScroll;

    if (skipFocus && !didScroll && this._lastBlockRect) {
      const topChanged = Math.abs(currentRect.top - this._lastBlockRect.top) > 1;
      const leftChanged = Math.abs(currentRect.left - this._lastBlockRect.left) > 1;

      if (topChanged || leftChanged) {
        log('Block position changed after re-render, updating toolbar');
        shouldSendBlockSelected = true;
      }
    }

    if (shouldSendBlockSelected) {
      this.sendBlockSelected('updateBlockUIAfterFormData', blockElement);
    }

    // Update _lastBlockRect for future comparisons (only if valid rect)
    if (currentRect.width > 0 && currentRect.height > 0) {
      this._lastBlockRect = currentRect;
    }
    // Drag handle position is now set in sendBlockSelected

    // Re-attach ResizeObserver to the new DOM element
    // React re-renders may have replaced the block element, so our old observer
    // would be watching a detached element. This ensures we catch future size
    // changes (e.g., image loading after a re-render).
    // For sidebar edits: pass skipInitialUpdate to prevent spurious BLOCK_SELECTED from immediate observer fire
    const editableFields = this.getEditableFields(blockElement);
    const blockElements = [...this.getAllBlockElements(this.selectedBlockUid)];
    this.observeBlockResize(blockElements, this.selectedBlockUid, editableFields, skipFocus);

    // NOTE: text change observer is NOT re-attached here — it's deferred to
    // the end of afterContentRender to avoid firing on DOM mutations from
    // restoreSlateSelection or late framework render passes.
  }

  /**
   * Selects a block and communicates the selection to the adminUI.
   *
   * @param {HTMLElement|string} blockElementOrUid - The block element or block UID to select.
   */
  selectBlock(blockElementOrUid) {
    // Accept either a DOM element (from click handlers) or a block UID string
    const blockUidFromArg = typeof blockElementOrUid === 'string' ? blockElementOrUid : null;

    // Get blockUid - either from argument or from element attribute
    const blockUid = blockUidFromArg || blockElementOrUid?.getAttribute?.('data-block-uid');
    if (!blockUid) return;

    // Check if this is a virtual template instance (no DOM element, but has child blocks)
    const isTemplateInstance = this.blockPathMap?.[blockUid]?.isTemplateInstance;

    // Get all elements for this block (handles multi-element blocks and template instances)
    // getAllBlockElements returns child block elements for template instances
    const blockElements = [...this.getAllBlockElements(blockUid)];

    const caller = new Error().stack?.split('\n')[2]?.trim() || 'unknown';
    log('selectBlock called for:', blockUid, 'from:', caller, 'elements:', blockElements.length);
    if (blockElements.length === 0) return;

    // Primary element for operations that need a single element
    const blockElement = blockElements[0];

    // Safety timeout: clear flag after 1500ms in case stability detection in
    // trackPosition() didn't fire (e.g., tracker was stopped by transitionend).
    // If stability detection already cleared the flag, this is a no-op.
    if (this._blockSelectorNavigating) {
      setTimeout(() => {
        if (this._blockSelectorNavigating) {
          log('selectBlock: navigation safety timeout for', blockUid);
          this._blockSelectorNavigating = false;
          if (this.selectedBlockUid === blockUid) {
            this.sendBlockSelected('navigationSettled', null, { blockUid });
          }
        }
      }, 1500);
    }

    const isSelectingSameBlock = this.selectedBlockUid === blockUid;

    // Store for use in async callback (focus handler uses this to decide preventScroll)
    this._isReselectingSameBlock = isSelectingSameBlock;

    // Only scroll block into view when selecting a NEW block (not reselecting same block)
    // This prevents unwanted scroll-back when user has scrolled the selected block off screen
    if (!isSelectingSameBlock && blockElement && !this.elementIsVisibleInViewport(blockElement)) {
      this.scrollBlockIntoView(blockElement);
    }

    // Flush any pending text updates from the previous block before switching
    // Also clear event buffer - user is reorienting to a new block
    if (!isSelectingSameBlock) {
      this.flushPendingTextUpdates();
      this.eventBuffer = [];
    }

    // Skip contenteditable setup for template instances (they're virtual containers)
    if (!isTemplateInstance) {
      this.isInlineEditing = true;

      // Set contenteditable on all text-editable fields
      this.restoreContentEditableOnFields(blockElement, 'selectBlock');

      // For slate blocks (value field), also set up paste/keydown handlers
      // Check blockElement itself first (Nuxt puts both attributes on same element)
      // then fall back to querying for child elements
      let valueField = blockElement.hasAttribute('data-edit-text') &&
                       blockElement.getAttribute('data-edit-text') === 'value'
                       ? blockElement
                       : blockElement.querySelector('[data-edit-text="value"]');
      if (valueField) {
        this.makeBlockContentEditable(valueField);
      }

      // For blocks with no usable editable fields (e.g., image, readOnly template blocks),
      // make the block element focusable and attach arrow key navigation so user can navigate away.
      const isReadonly = this.isBlockReadonly(blockUid);
      const hasEditableFields = !isReadonly && this.getOwnEditableFields(blockElement).length > 0;
      if (!hasEditableFields) {
        if (!blockElement.hasAttribute('tabindex')) {
          blockElement.setAttribute('tabindex', '-1');
        }
        blockElement.focus({ preventScroll: true });
        if (!blockElement._nonEditableArrowHandler) {
          blockElement._nonEditableArrowHandler = (e) => {
            if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return;
            if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;
            e.preventDefault();
            const uid = blockElement.getAttribute('data-block-uid');
            this.handleArrowAtEdge(e.key, uid, null, blockElement);
          };
          blockElement.addEventListener('keydown', blockElement._nonEditableArrowHandler);
        }
      }
    }

    // Remove border and button from the previously selected block
    const prevBlockUid = this.prevSelectedBlock?.getAttribute('data-block-uid');
    if (this.prevSelectedBlock === null || prevBlockUid !== blockUid) {
      if (this.currentlySelectedBlock) {
        this.deselectBlock(
          this.currentlySelectedBlock?.getAttribute('data-block-uid'),
          blockUid,
        );
      }

      // For template instances, there's no single element to track
      this.currentlySelectedBlock = isTemplateInstance ? null : blockElement;
      this.prevSelectedBlock = isTemplateInstance ? null : blockElement;
      if (!this.clickOnBtn) {
        window.parent.postMessage(
          { type: 'OPEN_SETTINGS', uid: blockUid },
          this.adminOrigin,
        );
      } else {
        this.clickOnBtn = false;
      }
    }

    // Set the currently selected block (do this every time)
    this.selectedBlockUid = blockUid;

    // Reset focused fields for new block - don't keep stale values from previous block
    this.focusedFieldName = null;
    this.focusedLinkableField = null;
    this.focusedMediaField = null;
    // Reset cached sizes so first FORM_DATA will send updated rects
    this.lastBlockRect = null;
    this.lastMediaFields = null;

    // Detect focused fields from click location (skip for template instances)
    if (!isTemplateInstance && this.lastClickPosition?.target) {
      // Find the clicked editable field
      const clickedElement = this.lastClickPosition.target;
      const clickedField = clickedElement.closest('[data-edit-text]');
      if (clickedField) {
        this.focusedFieldName = clickedField.getAttribute('data-edit-text');
        log('Detected focused field from click:', this.focusedFieldName);
      }

      // Detect clicked linkable and media fields
      this.focusedLinkableField = this.lastClickPosition.linkableField || null;
      this.focusedMediaField = this.lastClickPosition.mediaField || null;
      if (this.focusedLinkableField) {
        log('Detected focused linkable field from click:', this.focusedLinkableField);
      }
      if (this.focusedMediaField) {
        log('Detected focused media field from click:', this.focusedMediaField);
      }
    }

    // If no clicked field, use the first editable field that belongs to THIS block (skip for template instances)
    if (!isTemplateInstance && !this.focusedFieldName && blockElement) {
      const firstEditableField = this.getOwnFirstEditableField(blockElement);
      if (firstEditableField) {
        this.focusedFieldName = firstEditableField.getAttribute('data-edit-text');
        log('Set focusedFieldName to first editable field:', this.focusedFieldName);
      } else {
        // No editable fields in this block (e.g., image blocks or container blocks)
        log('No editable fields found, focusedFieldName remains null');
      }
    }

    // Store rect and show flags for BLOCK_SELECTED message (sent after selection is established)
    // Use combined bounding box for multi-element blocks and template instances
    const isMultiElement = blockElements.length > 1;
    const rect = isMultiElement
      ? this.getBoundingBoxForElements(blockElements)
      : blockElement.getBoundingClientRect();

    // For template instances, don't collect editable/linkable/media fields (they're virtual containers)
    const editableFields = isTemplateInstance ? {} : this.getEditableFields(blockElement);
    const linkableFields = isTemplateInstance ? {} : this.getLinkableFields(blockElement);
    const mediaFields = isTemplateInstance ? {} : this.getMediaFields(blockElement);
    // Get add button direction (right, bottom, hidden) - uses attribute or infers from nesting depth
    const addDirection = this.getAddDirection(blockElement);

    log('Setting _pendingBlockSelected for:', blockUid, '_justFinishedDragBlockId:', this._justFinishedDragBlockId);
    this._pendingBlockSelected = {
      blockUid,
      rect: rect ? {
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      } : null,
      editableFields, // Map of fieldName -> fieldType from DOM
      linkableFields, // Map of fieldName -> true for URL/link fields
      mediaFields, // Map of fieldName -> true for image/media fields
      focusedFieldName: this.focusedFieldName,
      focusedLinkableField: this.focusedLinkableField,
      focusedMediaField: this.focusedMediaField,
      addDirection, // Direction for add button positioning
      isMultiElement, // Signal that this is a multi-element selection
    };

    log('Block selected, sending UI messages:', {
      blockUid,
      focusedFieldName: this.focusedFieldName,
      focusedLinkableField: this.focusedLinkableField,
      focusedMediaField: this.focusedMediaField,
      editableFields,
      linkableFields,
      mediaFields,
    });

    // Create drag handle for block reordering (works for all block types including template instances)
    // This creates an invisible button in the iframe positioned under the parent's visual drag handle
    // Mouse events pass through the parent's visual (which has pointerEvents: 'none') to this button
    this.createDragHandle(blockElements);

    // Observe block size changes (e.g., image loading, content changes)
    // This updates the selection outline when block dimensions change
    this.observeBlockResize(blockElements, blockUid, editableFields);

    // Observe block text changes for inline editing (skip for template instances - they're virtual)
    if (!isTemplateInstance) {
      this.observeBlockTextChanges(blockElement);
    }

    // For template instances, send BLOCK_SELECTED immediately (no text selection to trigger it)
    if (isTemplateInstance && this._pendingBlockSelected) {
      const pending = this._pendingBlockSelected;
      this._pendingBlockSelected = null;
      log('Sending BLOCK_SELECTED for template instance:', pending.blockUid);
      // Use sendBlockSelected with blockUid override (template instances have no DOM element)
      this.sendBlockSelected('templateInstance', blockElement, {
        blockUid: pending.blockUid,
        focusedFieldName: pending.focusedFieldName,
        focusedLinkableField: pending.focusedLinkableField,
        focusedMediaField: pending.focusedMediaField,
      });
      return; // Exit early - no further processing needed for template instances
    }

    // Track selection changes to preserve selection across format operations
    if (!this.selectionChangeListener) {
      this.selectionChangeListener = () => {
        // Skip if we're correcting selection (prevents infinite loop)
        if (this._isCorrectingWhitespaceSelection) return;

        const selection = window.getSelection();
        const range = selection?.rangeCount > 0 ? selection.getRangeAt(0) : null;
        log('selectionchange fired:', {
          anchorOffset: selection?.anchorOffset,
          focusOffset: selection?.focusOffset,
          rangeStart: range?.startOffset,
          rangeEnd: range?.endOffset,
          collapsed: selection?.isCollapsed,
        });
        // Save both cursor positions (collapsed) and text selections (non-collapsed)
        if (selection && selection.rangeCount > 0) {
          // Correct cursor if it's on invalid whitespace (template artifacts)
          this._isCorrectingWhitespaceSelection = true;
          const corrected = this.correctInvalidWhitespaceSelection();
          this._isCorrectingWhitespaceSelection = false;
          if (corrected) {
            // Selection was corrected, this will trigger another selectionchange
            return;
          }

          this.savedSelection = this.serializeSelection();

          // Check if this selection matches what Admin just sent us
          // If so, this is the result of restoring their selection - don't echo it back
          if (this.expectedSelectionFromAdmin) {
            // Admin sent a selection to restore (via FORM_DATA transformedSelection).
            // Suppress ALL selectionchanges while set — they're either the
            // successful restore or re-render artifacts from DOM replacement.
            // afterContentRender clears this after restoreSlateSelection completes.
            log('selectionchange: expectedSelectionFromAdmin set, suppressing');
            return;
          } else {
            log('selectionchange: no expectedSelectionFromAdmin, sending new selection');
          }

          // IMPORTANT: Buffer selection changes WITH the text content.
          // This ensures text and selection are always atomic/in-sync. If sent
          // separately, Admin could receive stale selection that doesn't match
          // the text content, causing formats to be applied incorrectly.
          if (this.selectedBlockUid) {
            this.bufferUpdate('selectionChange');
          }
        }
      };
      document.addEventListener('selectionchange', this.selectionChangeListener);
    }

    // Use double requestAnimationFrame to wait for ALL DOM updates including rendering editable fields
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const currentBlockElement = this.queryBlockElement(this.selectedBlockUid);
        log('selectBlock focus handler:', { blockUid: this.selectedBlockUid, found: !!currentBlockElement });

        if (currentBlockElement) {
          // Detect which field should be focused if needed, and update toolbar
          if (this.needsFieldDetection) {
            this.detectFocusedFieldAndUpdateToolbar(this.selectedBlockUid);
            this.needsFieldDetection = false;
          }

          // Check if field was already editable before we do anything
          const editableField = this.getOwnFirstEditableField(currentBlockElement);
          const wasAlreadyEditable = editableField?.getAttribute('contenteditable') === 'true';

          // Set contenteditable on editable fields immediately (not waiting for FORM_DATA)
          this.restoreContentEditableOnFields(currentBlockElement, 'selectBlock');

          // Focus and position cursor for editable fields (text or slate type)
          // Use focusedFieldName to find the specific field that was clicked, not just the first one
          let contentEditableField = this.focusedFieldName
            ? this.getEditableFieldByName(currentBlockElement, this.focusedFieldName)
            : currentBlockElement.querySelector('[contenteditable="true"]');

          // Verify the field belongs to THIS block, not a nested block
          // Container blocks (like columns) contain nested blocks with their own editable fields
          // If we find a field that belongs to a nested block, don't focus it
          if (contentEditableField) {
            const fieldBlockElement = contentEditableField.closest('[data-block-uid]');
            if (fieldBlockElement !== currentBlockElement) {
              log('selectBlock: editable field belongs to nested block, skipping focus');
              contentEditableField = null;
            }
          }

          if (contentEditableField) {
            const fieldPath = contentEditableField.getAttribute('data-edit-text');
            // Use activateEditableField for focus and cursor positioning
            this.activateEditableField(contentEditableField, fieldPath, this.selectedBlockUid, 'selectBlock', {
              skipContentEditable: true, // Already done above
              skipObservers: true, // Text observers set up elsewhere for blocks
              preventScroll: this._isReselectingSameBlock,
              wasAlreadyEditable,
              saveClickPosition: true, // Save for FORM_DATA handler after re-render
            });
          } else if (this.lastClickPosition) {
            // No editable field found, clear click position
            log('selectBlock: no editable field found, clearing lastClickPosition');
            this.lastClickPosition = null;
          }

          // Now send BLOCK_SELECTED with selection - both arrive atomically
          // This prevents race conditions where toolbar gets new block but old selection
          if (this._pendingBlockSelected) {
            const serializedSelection = this.serializeSelection();
            const pendingBlockUid = this._pendingBlockSelected.blockUid;
            const pendingFocusedFieldName = this._pendingBlockSelected.focusedFieldName;
            const pendingFocusedLinkableField = this._pendingBlockSelected.focusedLinkableField;
            const pendingFocusedMediaField = this._pendingBlockSelected.focusedMediaField;
            this._pendingBlockSelected = null;
            this.sendBlockSelected('selectionChangeListener', currentBlockElement, {
              blockUid: pendingBlockUid,
              focusedFieldName: pendingFocusedFieldName,
              focusedLinkableField: pendingFocusedLinkableField,
              focusedMediaField: pendingFocusedMediaField,
              selection: serializedSelection,
            });
            log('Sent BLOCK_SELECTED with selection:', { blockUid: pendingBlockUid, selection: serializedSelection });
          }
        }
      });
    });
  }

  /**
   * Handle data-block-selector click to navigate between sibling blocks.
   * Used for carousel prev/next buttons, tab selectors, etc.
   *
   * @param {string} selector - The selector value: "+1", "-1", or a block UID
   * @param {HTMLElement} triggerElement - The element that was clicked
   */
  handleBlockSelector(selector, triggerElement) {
    log('handleBlockSelector:', selector, 'trigger:', triggerElement.className);

    // Find the container block
    const containerBlock = triggerElement.closest('[data-block-uid]');
    if (!containerBlock) {
      log('handleBlockSelector: no container found');
      return;
    }
    const containerUid = containerBlock.getAttribute('data-block-uid');
    log('handleBlockSelector: container =', containerUid);

    // Get all child blocks in this container
    const allNestedBlocks = containerBlock.querySelectorAll('[data-block-uid]');
    const childBlocks = Array.from(allNestedBlocks).filter((el) => {
      const parentContainer = el.parentElement?.closest('[data-block-uid]');
      return parentContainer?.getAttribute('data-block-uid') === containerUid;
    });
    log('handleBlockSelector: childBlocks =', childBlocks.length, childBlocks.map(el => el.getAttribute('data-block-uid')));

    if (childBlocks.length === 0) {
      log('handleBlockSelector: no child blocks found');
      return;
    }

    // For direct UID selector, target that specific block
    if (selector !== '+1' && selector !== '-1') {
      const targetUid = selector;
      log('handleBlockSelector: direct selector targetUid =', targetUid);
      // Hide outline during transition (same as +1/-1 path)
      this._blockSelectorNavigating = true;
      this.stopTransitionTracking();
      window.parent.postMessage({ type: 'HIDE_BLOCK_UI' }, this.adminOrigin);
      this.waitForBlockVisibleAndSelect(targetUid);
      return;
    }

    // Helper to get fresh child blocks (DOM may re-render)
    const getFreshChildBlocks = () => {
      const container = this.queryBlockElement(containerUid);
      if (!container) return [];
      const allNested = container.querySelectorAll('[data-block-uid]');
      return Array.from(allNested).filter((el) => {
        const parent = el.parentElement?.closest('[data-block-uid]');
        return parent?.getAttribute('data-block-uid') === containerUid;
      });
    };

    // Find the child block that's most centered within the container
    // Only returns a child if it's actually visible (center within container bounds)
    const findMostCenteredChild = (children, container) => {
      const containerRect = container.getBoundingClientRect();
      const containerCenter = containerRect.left + containerRect.width / 2;

      let best = null;
      let bestDistance = Infinity;

      for (const child of children) {
        const rect = child.getBoundingClientRect();
        const childCenter = rect.left + rect.width / 2;

        // Only consider children whose center is within the container bounds
        if (childCenter < containerRect.left || childCenter > containerRect.right) {
          continue;
        }

        const distance = Math.abs(childCenter - containerCenter);

        if (distance < bestDistance) {
          bestDistance = distance;
          best = child;
        }
      }
      return best;
    };

    // For +1/-1, calculate the target block and wait for it to become visible
    // Stop any existing tracking and hide the block UI immediately
    // Set flag to prevent scroll/resize handlers from sending stale BLOCK_SELECTED
    this._blockSelectorNavigating = true;
    this.stopTransitionTracking();
    window.parent.postMessage({ type: 'HIDE_BLOCK_UI' }, this.adminOrigin);

    const currentlyVisibleElement = findMostCenteredChild(childBlocks, containerBlock);
    const currentVisibleUid = currentlyVisibleElement?.getAttribute('data-block-uid');

    // Debug: log position of all children
    childBlocks.forEach(el => {
      const uid = el.getAttribute('data-block-uid');
      const rect = el.getBoundingClientRect();
      log(`handleBlockSelector: ${uid} rect.left=${Math.round(rect.left)}`);
    });
    log('handleBlockSelector: currently visible =', currentVisibleUid);

    // Calculate the expected target block based on +1/-1
    // Compare by element reference (not UID) since multiple elements can share the same UID
    let currentIndex = childBlocks.findIndex(
      el => el === currentlyVisibleElement
    );
    if (currentIndex === -1) currentIndex = 0;

    const offset = parseInt(selector, 10);
    let targetIndex = currentIndex + offset;

    // Handle wrapping
    if (targetIndex < 0) {
      targetIndex = childBlocks.length - 1;
    } else if (targetIndex >= childBlocks.length) {
      targetIndex = 0;
    }

    const targetUid = childBlocks[targetIndex]?.getAttribute('data-block-uid');
    log('handleBlockSelector: target =', targetUid, '(index', currentIndex, '+', offset, '→', targetIndex, ')');

    // Check if target block is visible (centered within container bounds)
    // Also returns position for stability tracking
    let visibilityPollCount = 0;
    const getTargetVisibility = (container) => {
      const targetEl = this.queryBlockElement(targetUid);
      if (!targetEl || !container) {
        return { visible: false, x: null };
      }

      const containerRect = container.getBoundingClientRect();
      const targetRect = targetEl.getBoundingClientRect();
      const targetCenter = targetRect.left + targetRect.width / 2;

      // Target is visible if its center is within container bounds
      const visible = targetCenter >= containerRect.left && targetCenter <= containerRect.right;
      visibilityPollCount++;
      if (visibilityPollCount <= 5 || visibilityPollCount % 10 === 0) {
        log('getTargetVisibility:', targetUid, 'class:', targetEl.className.substring(0, 120),
          'rect:', JSON.stringify({l: Math.round(targetRect.left), w: Math.round(targetRect.width)}),
          'container:', JSON.stringify({l: Math.round(containerRect.left), r: Math.round(containerRect.right)}),
          'visible:', visible);
      }
      return { visible, x: targetRect.left };
    };

    // Track stability - target must be visible AND position stable
    let stableCount = 0;
    let lastX = null;
    const STABLE_THRESHOLD = 3;
    const POSITION_TOLERANCE = 2; // pixels

    // Snapshot which blocks are currently visible before the animation starts.
    // We won't accept any target position as stable until this set changes,
    // proving the carousel animation has actually begun.
    const containerForSnapshot = this.queryBlockElement(containerUid);
    const containerRectSnapshot = containerForSnapshot?.getBoundingClientRect();
    // Track initially visible elements (not just UIDs) since multiple elements
    // can share the same data-block-uid (e.g., listing items in a carousel).
    const initialVisibleElements = new Set();
    if (containerRectSnapshot) {
      for (const child of childBlocks) {
        const rect = child.getBoundingClientRect();
        const center = rect.left + rect.width / 2;
        if (center >= containerRectSnapshot.left && center <= containerRectSnapshot.right) {
          initialVisibleElements.add(child);
        }
      }
    }
    let visibilityChanged = false;
    log('handleBlockSelector: initial visible blocks:', [...initialVisibleElements].map(el => el.getAttribute('data-block-uid')));

    // Get the set of child block UIDs for checking if user navigated away
    const childUids = new Set(childBlocks.map(el => el.getAttribute('data-block-uid')));

    // Wait for target to become visible AND position to stabilize
    const waitForTarget = (retries = 40) => {
      // Check if user has navigated away (e.g., pressed Escape, clicked different block)
      // Cancel if the selected block is no longer one of the children we're navigating
      if (this.selectedBlockUid && !childUids.has(this.selectedBlockUid)) {
        log('handleBlockSelector: user navigated away, canceling child selection. selected:', this.selectedBlockUid);
        return;
      }

      const container = this.queryBlockElement(containerUid);
      const freshChildBlocks = getFreshChildBlocks();

      const { visible, x } = getTargetVisibility(container);

      // Check if the set of visible blocks has changed from the initial snapshot.
      // During carousel transitions, multiple slides can be visible simultaneously.
      // We must wait until the visible set changes before accepting any position as stable,
      // otherwise we might catch a transient state before the animation has even begun.
      if (!visibilityChanged && container) {
        const containerRect = container.getBoundingClientRect();
        const currentVisible = new Set();
        for (const child of freshChildBlocks) {
          const rect = child.getBoundingClientRect();
          const center = rect.left + rect.width / 2;
          if (center >= containerRect.left && center <= containerRect.right) {
            currentVisible.add(child);
          }
        }
        // Check if the visible set differs from the initial snapshot (by element reference)
        if (currentVisible.size !== initialVisibleElements.size ||
            [...currentVisible].some(el => !initialVisibleElements.has(el))) {
          visibilityChanged = true;
          log('handleBlockSelector: visible blocks changed, animation started');
        }
      }

      if (visible && visibilityChanged) {
        // Check if position is also stable (not animating)
        const positionStable = lastX !== null && Math.abs(x - lastX) < POSITION_TOLERANCE;

        if (positionStable) {
          stableCount++;
        } else {
          stableCount = 0; // Reset if position changed
        }
        lastX = x;

        if (retries === 40 || retries === 30 || retries === 20 || retries === 10 || retries === 1) {
          log(`handleBlockSelector poll: retries=${retries} target=${targetUid} visible=true x=${Math.round(x)} stableCount=${stableCount}`);
        }

        if (stableCount >= STABLE_THRESHOLD) {
          log('handleBlockSelector: target visible and position stable, selecting', targetUid);
          // Keep _blockSelectorNavigating true - selectBlock will clear it after 1500ms
          // sendBlockSelected allows initial selection sources through while suppressing position tracking
          const targetElement = this.queryBlockElement(targetUid);
          if (targetElement) {
            this.selectBlock(targetElement);
          }
          return;
        }
      } else {
        stableCount = 0;
        lastX = null;
        if (retries === 40 || retries === 30 || retries === 20 || retries === 10 || retries === 1) {
          log(`handleBlockSelector poll: retries=${retries} target=${targetUid} visible=false`);
        }
      }

      if (retries > 0) {
        setTimeout(() => waitForTarget(retries - 1), 50);
      } else {
        // Target never became visible - fall back to most centered child
        log('handleBlockSelector: target not visible after settling, finding most centered');
        const centeredChild = container ? findMostCenteredChild(freshChildBlocks, container) : null;
        const centeredUid = centeredChild?.getAttribute('data-block-uid');
        log('handleBlockSelector: fallback to most centered =', centeredUid);
        // Keep _blockSelectorNavigating true - selectBlock will clear it after 1500ms
        if (centeredChild) {
          this.selectBlock(centeredChild);
        } else if (container) {
          // No child found - select the parent container
          log('handleBlockSelector: no centered child found, selecting parent container');
          this.selectBlock(container);
        }
      }
    };

    // Start after a short delay to let click event propagate to frontend
    setTimeout(waitForTarget, 50);
  }

  /**
   * Fallback for +1/-1 selection when visibility doesn't change.
   * Used for carousels that use transforms instead of hiding elements.
   */
  handleBlockSelectorFallback(selector, childBlocks, currentVisibleUid) {
    let currentIndex = childBlocks.findIndex(
      el => el.getAttribute('data-block-uid') === currentVisibleUid
    );
    if (currentIndex === -1) currentIndex = 0;

    const offset = parseInt(selector, 10);
    let targetIndex = currentIndex + offset;

    // Handle wrapping
    if (targetIndex < 0) {
      targetIndex = childBlocks.length - 1;
    } else if (targetIndex >= childBlocks.length) {
      targetIndex = 0;
    }

    const targetUid = childBlocks[targetIndex]?.getAttribute('data-block-uid');
    log('handleBlockSelector fallback: targetUid =', targetUid);

    if (targetUid) {
      const targetElement = this.queryBlockElement(targetUid);
      if (targetElement) {
        this.selectBlock(targetElement);
      }
    }
  }

  /**
   * Wait for a specific block to become visible AND position stable, then select it.
   * Uses same stability check as the +1/-1 path to avoid selecting during animation.
   */
  waitForBlockVisibleAndSelect(targetUid, retries = 40, stableCount = 0, lastX = null) {
    const STABLE_THRESHOLD = 3;
    const POSITION_TOLERANCE = 2;

    const targetElement = this.queryBlockElement(targetUid);
    if (targetElement && !this.isElementHidden(targetElement)) {
      const rect = targetElement.getBoundingClientRect();
      const x = rect.left;
      const positionStable = lastX !== null && Math.abs(x - lastX) < POSITION_TOLERANCE;

      if (positionStable) {
        stableCount++;
      } else {
        stableCount = 0;
      }

      if (stableCount >= STABLE_THRESHOLD) {
        log('handleBlockSelector: selecting (position stable)', targetUid);
        this.selectBlock(targetElement);
        return;
      }

      // Visible but not stable yet - keep polling
      if (retries > 0) {
        setTimeout(() => this.waitForBlockVisibleAndSelect(targetUid, retries - 1, stableCount, x), 50);
      } else {
        log('handleBlockSelector: selecting (retries exhausted)', targetUid);
        this.selectBlock(targetElement);
      }
    } else if (retries > 0) {
      setTimeout(() => this.waitForBlockVisibleAndSelect(targetUid, retries - 1, 0, null), 50);
    } else {
      log('handleBlockSelector: block not visible after retries', targetUid);
    }
  }

  /**
   * Deselects a block and updates the frontend accordingly.
   *
   * @param {string} prevSelectedBlockUid - The UID of the previously selected block.
   * @param {string} currentSelectedBlockUid - The UID of the currently selected block.
   */
  deselectBlock(prevBlockUid, currBlockUid) {
    const prevBlockElement = document.querySelector(
      `[data-block-uid="${prevBlockUid}"]`,
    );

    if (
      prevBlockUid !== null &&
      currBlockUid &&
      prevBlockUid !== currBlockUid &&
      prevBlockElement
    ) {
      // Send HIDE_BLOCK_UI message to parent to hide selection outline, toolbar, and add button
      window.parent.postMessage(
        { type: 'HIDE_BLOCK_UI' },
        this.adminOrigin,
      );

      // Remove drag handle and its event listeners
      const dragHandle = document.querySelector('.volto-hydra-drag-button');
      if (dragHandle) {
        dragHandle.remove();
      }
      if (this.dragHandleScrollListener) {
        window.removeEventListener('scroll', this.dragHandleScrollListener, true);
        this.dragHandleScrollListener = null;
      }
      this.dragHandlePositioner = null;

      if (this.blockObserver) {
        this.blockObserver.disconnect();
      }

      // Remove contenteditable attribute
      prevBlockElement.removeAttribute('contenteditable');
      const childNodes = prevBlockElement.querySelectorAll('[data-node-id]');
      childNodes.forEach((node) => {
        node.removeAttribute('contenteditable');
      });

      // Clean up JSON structure
      // if (this.formData.blocks[this.selectedBlockUid]["@type"] === "slate") this.resetJsonNodeIds(this.formData.blocks[this.selectedBlockUid]);
    }
    document.removeEventListener('mouseup', this.handleMouseUp);
    // Disconnect the mutation observer
    if (this.blockTextMutationObserver) {
      this.blockTextMutationObserver.disconnect();
      this.blockTextMutationObserver = null;
    }
    if (this.attributeMutationObserver) {
      this.attributeMutationObserver.disconnect();
      this.attributeMutationObserver = null;
    }
    if (this.handleObjectBrowserMessage) {
      window.removeEventListener('message', this.handleObjectBrowserMessage);
      this.handleObjectBrowserMessage = null;
    }
    // Clean up block resize observer
    if (this.blockResizeObserver) {
      this.blockResizeObserver.disconnect();
      this.blockResizeObserver = null;
    }
  }

  /**
   * Observes the selected block for size changes (e.g., image loading, content changes).
   * When the block's size changes, sends an updated BLOCK_SELECTED message to update the selection outline.
   * For multi-element blocks, observes ALL elements and recomputes combined bounding box.
   *
   * @param {Array} blockElements - Array of DOM elements for the block (used for initial rect fallback).
   * @param {string} blockUid - The block's UID.
   * @param {Object} editableFields - Map of fieldName -> fieldType for editable fields in this block.
   */
  observeBlockResize(blockElements, blockUid, editableFields, skipInitialUpdate = false) {
    log('observeBlockResize called for block:', blockUid, 'skipInitialUpdate:', skipInitialUpdate);

    // Skip if already observing the same block AND the current DOM elements match observed
    // ResizeObserver fires immediately when attached - recreating it causes spurious updates
    // After re-render, element references change but we're still on same block
    // For multi-element blocks, we must check ALL elements, not just one
    if (this._lastBlockRectUid === blockUid && this.blockResizeObserver && this._observedElements?.length > 0) {
      // Check if ALL observed elements are still in the DOM
      const allStillConnected = this._observedElements.every(el => document.body.contains(el));
      // Also check if current DOM elements match what we're observing
      // (re-render may have created new elements)
      const currentElements = this.getAllBlockElements(blockUid);
      const elementsMatch = currentElements.length === this._observedElements.length &&
        Array.from(currentElements).every(el => this._observedElements.includes(el));
      log('observeBlockResize: allStillConnected:', allStillConnected, 'elementsMatch:', elementsMatch, 'observed:', this._observedElements.length, 'current:', currentElements.length);
      if (allStillConnected && elementsMatch) {
        log('observeBlockResize: already observing this block, skipping');
        return;
      }
      log('observeBlockResize: elements changed, re-attaching to new elements');
    }

    // Clean up any existing observer
    if (this.blockResizeObserver) {
      this.blockResizeObserver.disconnect();
    }

    // Get all elements for multi-element blocks
    const allElements = this.getAllBlockElements(blockUid);

    // Store initial dimensions using combined bounding box for multi-element blocks
    // Use instance variable so it persists across observer recreations
    // Only reset if this is a different block
    // Always convert to plain object - DOMRect is live and would cause comparison issues
    let currentRect = this.getBoundingBoxForElements(allElements);
    if (!currentRect && blockElements?.[0]) {
      const domRect = blockElements[0].getBoundingClientRect();
      currentRect = { top: domRect.top, left: domRect.left, width: domRect.width, height: domRect.height };
    }
    if (!this._lastBlockRect || this._lastBlockRectUid !== blockUid) {
      this._lastBlockRect = currentRect;
      this._lastBlockRectUid = blockUid;
    } else if (skipInitialUpdate) {
      // Don't update _lastBlockRect - let updateBlockUIAfterFormData compare and update it
      // This preserves the pre-update position for comparison after re-render
    }
    this._observedElements = Array.from(allElements);
    log('observeBlockResize initial rect:', { width: currentRect.width, height: currentRect.height }, 'observing', allElements.length, 'elements');

    this.blockResizeObserver = new ResizeObserver((entries) => {
      log('ResizeObserver callback fired for:', blockUid);
      // Only process if this is still the selected block
      if (this.selectedBlockUid !== blockUid) {
        log('ResizeObserver: block no longer selected, ignoring');
        return;
      }

      // For multi-element blocks, recompute the combined bounding box from fresh DOM query
      // Don't check entries[0].isConnected - for multi-element blocks, some elements may
      // be detached while others are still valid. The fresh query handles this.
      const freshElements = this.getAllBlockElements(blockUid);
      if (freshElements.length === 0) {
        log('ResizeObserver: no elements found, ignoring');
        return;
      }
      const newRect = this.getBoundingBoxForElements(freshElements);
      if (!newRect) {
        log('ResizeObserver: could not compute bounding box, ignoring');
        return;
      }
      const lastRect = this._lastBlockRect;

      // Compare with last rect if we have one, or update if we now have valid dimensions
      const hadValidLastRect = lastRect && (lastRect.width > 0 || lastRect.height > 0);
      const widthChanged = hadValidLastRect ? Math.abs(newRect.width - lastRect.width) > 1 : false;
      const heightChanged = hadValidLastRect ? Math.abs(newRect.height - lastRect.height) > 1 : false;
      const topChanged = hadValidLastRect ? Math.abs(newRect.top - lastRect.top) > 1 : false;
      const leftChanged = hadValidLastRect ? Math.abs(newRect.left - lastRect.left) > 1 : false;
      const dimensionsChanged = widthChanged || heightChanged || topChanged || leftChanged;

      // Update if: dimensions changed, OR we went from invalid/zero to valid rect
      const shouldUpdate = dimensionsChanged || (!hadValidLastRect && newRect.height > 0);

      log('ResizeObserver: comparing rects - last:', lastRect?.height || 0, 'new:', newRect.height, 'shouldUpdate:', shouldUpdate);

      // Always update _lastBlockRect if we have a valid new rect
      this._lastBlockRect = newRect;

      if (shouldUpdate) {
        log('Block size changed, updating selection outline:', blockUid,
          'old:', lastRect?.top || 0, lastRect?.left || 0, lastRect?.width || 0, lastRect?.height || 0,
          'new:', newRect.top, newRect.left, newRect.width, newRect.height);

        // Send updated BLOCK_SELECTED with new rect
        // Pass blockUid so template instances use the correct UID (not the child element's UID)
        this.sendBlockSelected('resizeObserver', null, { blockUid });
      }
    });

    // Observe ALL elements of multi-element blocks
    for (const element of allElements) {
      this.blockResizeObserver.observe(element, { box: 'border-box' });
    }

    // Also observe DOM structure changes for async rendering
    // (e.g., listing blocks that fetch results after initial render)
    this.observeBlockDomChanges(blockUid);

    // Also track position during CSS transitions (e.g., carousel slide animations)
    this.observeBlockTransition(blockElements, blockUid);
  }

  /**
   * Observes DOM structure changes for the selected block.
   * Async rendering (e.g., listing blocks fetching results) may replace elements
   * after we've attached ResizeObserver. This MutationObserver detects when that
   * happens and re-attaches the ResizeObserver to the new elements.
   *
   * @param {string} blockUid - The block's UID to watch for.
   */
  observeBlockDomChanges(blockUid) {
    // Clean up existing observer
    if (this._domMutationObserver) {
      this._domMutationObserver.disconnect();
    }

    // Observe document.body to catch all DOM changes including footer blocks
    const container = document.body;

    this._domMutationObserver = new MutationObserver((mutations) => {
      // Only process if this is still the selected block
      if (this.selectedBlockUid !== blockUid) {
        return;
      }

      // Check if any mutations added elements with our block UID
      let relevantChange = false;
      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          // Check added nodes for our block UID
          for (const node of mutation.addedNodes) {
            if (node.nodeType === Node.ELEMENT_NODE) {
              if (
                node.getAttribute?.('data-block-uid') === blockUid ||
                node.querySelector?.(`[data-block-uid="${blockUid}"]`)
              ) {
                relevantChange = true;
                break;
              }
            }
          }
          if (relevantChange) break;
        }
      }

      if (!relevantChange) return;

      log('observeBlockDomChanges: detected relevant DOM change for', blockUid);

      // Materialize any new hydra comments (e.g., from async Suspense content)
      this.materializeHydraComments();

      // Check if our observed elements are still in the DOM
      if (!this._observedElements?.length) return;

      const currentElements = this.getAllBlockElements(blockUid);
      const elementsMatch =
        currentElements.length === this._observedElements.length &&
        Array.from(currentElements).every((el) =>
          this._observedElements.includes(el),
        );

      if (elementsMatch) {
        log('observeBlockDomChanges: elements still match, no action needed');
        return;
      }

      log(
        'observeBlockDomChanges: elements changed, re-attaching ResizeObserver',
        'old:',
        this._observedElements.length,
        'new:',
        currentElements.length,
      );

      // Elements have changed - re-attach ResizeObserver
      if (this.blockResizeObserver) {
        this.blockResizeObserver.disconnect();

        // Update _lastBlockRect BEFORE observing - observe() fires callback immediately
        const newRect = this.getBoundingBoxForElements(currentElements);
        if (newRect && (newRect.width > 0 || newRect.height > 0)) {
          this._lastBlockRect = newRect;
        }

        // Observe the new elements
        this._observedElements = Array.from(currentElements);
        for (const element of currentElements) {
          this.blockResizeObserver.observe(element, { box: 'border-box' });
        }

        // Send updated selection (debounced to wait for animations to settle)
        if (newRect && (newRect.width > 0 || newRect.height > 0)) {
          const firstElement = currentElements[0];
          if (firstElement) {
            // Restore contenteditable on fields - DOM elements may have been replaced
            // This is needed when the renderer re-renders (e.g., after checkbox toggle)
            this.restoreContentEditableOnFields(firstElement, 'domChange');

            // Debounce BLOCK_SELECTED to wait for animations (carousel transitions, etc.)
            // This prevents sending intermediate positions during animation
            if (this._domChangeDebounce) {
              clearTimeout(this._domChangeDebounce);
            }
            this._domChangeDebounce = setTimeout(() => {
              this._domChangeDebounce = null;
              // Only send BLOCK_SELECTED if this block is still the selected block
              // When adding a child block, the parent's DOM changes but selection has moved
              if (blockUid !== this.selectedBlockUid) {
                log('observeBlockDomChanges: skipping BLOCK_SELECTED, selection changed to', this.selectedBlockUid);
                return;
              }
              // Re-check element is still valid and get fresh rect
              const freshElements = this.getAllBlockElements(blockUid);
              if (freshElements.length > 0) {
                // Scroll to block if not visible AND we were waiting for this dragged block
                // (prevents unwanted scrolling on normal DOM changes like size updates)
                if (this._justFinishedDragBlockId === blockUid) {
                  if (!this.elementIsVisibleInViewport(freshElements[0])) {
                    log('observeBlockDomChanges: scrolling to dragged block', blockUid);
                    this.scrollBlockIntoView(freshElements[0]);
                  }
                  // Always clear after processing - drag is complete
                  this._justFinishedDragBlockId = null;
                }
                this.sendBlockSelected('domChange', null, { blockUid });
              }
            }, 150); // Wait for animation to settle
            // Drag handle position is now set in sendBlockSelected
          }
        }
      }
    });

    // Observe the container for childList changes in the subtree
    this._domMutationObserver.observe(container, {
      childList: true,
      subtree: true,
    });
  }

  /**
   * Stops all block position tracking immediately.
   * Called when navigating to a new block to prevent stale position updates.
   */
  stopTransitionTracking() {
    if (this._transitionAnimationFrame) {
      cancelAnimationFrame(this._transitionAnimationFrame);
      this._transitionAnimationFrame = null;
    }
    if (this._initialTrackingTimeout) {
      clearTimeout(this._initialTrackingTimeout);
      this._initialTrackingTimeout = null;
    }
    if (this._transitionMutationObserver) {
      this._transitionMutationObserver.disconnect();
      this._transitionMutationObserver = null;
    }
    // Remove transitionend listener from the tracked element
    if (this._transitionEndHandler && this._trackedBlockElement) {
      this._trackedBlockElement.removeEventListener(
        'transitionend',
        this._transitionEndHandler,
      );
      this._transitionEndHandler = null;
      this._trackedBlockElement = null;
    }
    // Also disconnect resize observer to prevent stale updates
    if (this.blockResizeObserver) {
      this.blockResizeObserver.disconnect();
      this.blockResizeObserver = null;
    }
    // Also disconnect DOM mutation observer
    if (this._domMutationObserver) {
      this._domMutationObserver.disconnect();
      this._domMutationObserver = null;
    }
    // Clear scroll timeout that might re-send position updates
    if (this.scrollTimeout) {
      clearTimeout(this.scrollTimeout);
      this.scrollTimeout = null;
    }
    // Clear the uid to stop any in-flight tracking loops
    this._trackingBlockUid = null;
  }

  /**
   * Tracks block position during CSS transitions/animations.
   * ResizeObserver doesn't fire for transform changes, so we poll during transitions.
   * For multi-element blocks, observes ALL elements and uses combined bounding box.
   *
   * @param {Array} blockElements - Array of DOM elements to observe.
   * @param {string} blockUid - The block's UID.
   */
  observeBlockTransition(blockElements, blockUid) {
    if (!blockElements || blockElements.length === 0) return;

    // Clean up existing transition tracking
    if (this._transitionAnimationFrame) {
      cancelAnimationFrame(this._transitionAnimationFrame);
      this._transitionAnimationFrame = null;
    }
    // Remove listeners from previously tracked elements
    if (this._transitionEndHandler && this._trackedBlockElements) {
      for (const el of this._trackedBlockElements) {
        el.removeEventListener('transitionend', this._transitionEndHandler);
      }
    }
    if (this._initialTrackingTimeout) {
      clearTimeout(this._initialTrackingTimeout);
      this._initialTrackingTimeout = null;
    }

    let isTracking = false;
    this._trackingBlockUid = blockUid;

    const trackPosition = () => {
      // Stop if tracking was cancelled or block changed
      if (!isTracking || this._trackingBlockUid !== blockUid) {
        return;
      }
      // During carousel navigation, keep tracking position internally but don't
      // send updates to the admin UI. Detect when the animation settles (position
      // stable for ~200ms) and then send the final position.
      if (this._blockSelectorNavigating) {
        const newRect = this.getBoundingBoxForElements(blockElements);
        if (newRect) {
          const lastRect = this._lastBlockRect;
          const positionChanged = !lastRect ||
            Math.abs(newRect.left - lastRect.left) > 1 ||
            Math.abs(newRect.top - lastRect.top) > 1;
          this._lastBlockRect = newRect;

          if (positionChanged) {
            this._navStableFrames = 0;
          } else {
            this._navStableFrames = (this._navStableFrames || 0) + 1;
            // Position stable for ~200ms (12 frames at 60fps) — animation settled
            if (this._navStableFrames >= 12) {
              log('trackPosition: navigation settled for', blockUid);
              this._blockSelectorNavigating = false;
              this._navStableFrames = 0;
              this.sendBlockSelected('navigationSettled', blockElements[0]);
              stopTracking();
              return;
            }
          }
        }
        this._transitionAnimationFrame = requestAnimationFrame(trackPosition);
        return;
      }

      // Use combined bounding box for multi-element blocks
      const newRect = this.getBoundingBoxForElements(blockElements);
      if (!newRect) {
        this._transitionAnimationFrame = requestAnimationFrame(trackPosition);
        return;
      }
      const lastRect = this._lastBlockRect;

      if (lastRect) {
        const topChanged = Math.abs(newRect.top - lastRect.top) > 1;
        const leftChanged = Math.abs(newRect.left - lastRect.left) > 1;

        if (topChanged || leftChanged) {
          this._lastBlockRect = newRect;
          this.sendBlockSelected('transitionTracker', blockElements[0]);
        }
      }

      this._transitionAnimationFrame = requestAnimationFrame(trackPosition);
    };

    // Start tracking when transition starts (detected by style changes)
    const startTracking = () => {
      if (!isTracking) {
        isTracking = true;
        log('observeBlockTransition: starting position tracking for:', blockUid);
        trackPosition();
      }
    };

    const stopTracking = () => {
      // During carousel navigation, don't stop — the stability detection in
      // trackPosition() needs the rAF loop to keep running
      if (this._blockSelectorNavigating) {
        log('observeBlockTransition: deferring stop during navigation for:', blockUid);
        return;
      }

      isTracking = false;
      if (this._transitionAnimationFrame) {
        cancelAnimationFrame(this._transitionAnimationFrame);
        this._transitionAnimationFrame = null;
      }
      log('observeBlockTransition: stopped tracking for:', blockUid);

      // Final position update using combined bounding box
      if (this.selectedBlockUid === blockUid) {
        const finalRect = this.getBoundingBoxForElements(blockElements);
        if (finalRect && this._lastBlockRect) {
          const moved = Math.abs(finalRect.left - this._lastBlockRect.left) > 1 ||
                        Math.abs(finalRect.top - this._lastBlockRect.top) > 1;
          if (moved) {
            this._lastBlockRect = finalRect;
            this.sendBlockSelected('transitionEnd', blockElements[0]);
          }
        }
      }
    };

    // Stop tracking when transition ends on ANY element
    this._transitionEndHandler = stopTracking;
    this._trackedBlockElements = blockElements;

    // Attach listeners to ALL elements
    for (const el of blockElements) {
      el.addEventListener('transitionend', this._transitionEndHandler);
    }

    // Use MutationObserver to detect when transform/translate classes change on ANY element
    if (this._transitionMutationObserver) {
      this._transitionMutationObserver.disconnect();
    }

    this._transitionMutationObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'attributes' &&
            (mutation.attributeName === 'class' || mutation.attributeName === 'style')) {
          const style = window.getComputedStyle(mutation.target);
          // Check if element has a transition and transform
          if (style.transition && style.transition !== 'none' &&
              (style.transform !== 'none' || style.translate !== 'none')) {
            startTracking();
          }
        }
      }
    });

    // Observe ALL elements for attribute changes
    for (const el of blockElements) {
      this._transitionMutationObserver.observe(el, {
        attributes: true,
        attributeFilter: ['class', 'style'],
      });
    }

    // Always do initial position tracking for 500ms after selection
    // This catches animations on parent elements (e.g., Flowbite carousel)
    // where the transform is not directly on the selected block
    startTracking();
    this._initialTrackingTimeout = setTimeout(() => {
      // Only stop if no ongoing transition was detected
      // (transitionend handler will stop it if one was detected)
      // During carousel navigation, keep tracking — stability detection
      // in trackPosition() will handle the stop when animation settles
      if (isTracking && this.selectedBlockUid === blockUid && !this._blockSelectorNavigating) {
        stopTracking();
      }
    }, 500);
  }

  /**
   * Sets up mouse tracking to position drag handle dynamically.
   * The drag handle is positioned on mousemove to avoid being destroyed by re-renders.
   *
   * @param {Array} blockElements - Array of DOM elements for the selected block (not used directly,
   *                                but included for API consistency - we use getAllBlockElements internally)
   */
  createDragHandle(blockElements) {

    // Remove any existing drag handle
    const existingDragHandle = document.querySelector('.volto-hydra-drag-button');
    if (existingDragHandle) {
      existingDragHandle.remove();
    }

    // Create a single persistent drag button that follows the mouse
    const dragButton = document.createElement('button');
    dragButton.className = 'volto-hydra-drag-button';
    Object.assign(dragButton.style, {
      position: 'fixed',
      width: '40px',
      height: '48px',
      opacity: '0', // Invisible - parent shows the visual
      cursor: 'grab',
      zIndex: '9999',
      background: 'transparent',
      border: 'none',
      padding: '0',
      pointerEvents: 'auto',
      display: 'none', // Hidden until positioned
    });

    document.body.appendChild(dragButton);

    // Position the drag handle immediately (not on mousemove)
    const positionDragHandle = () => {
      if (!this.selectedBlockUid) {
        dragButton.style.display = 'none';
        return;
      }

      // Get all elements for this block (multi-element blocks like listings)
      const allElements = this.getAllBlockElements(this.selectedBlockUid);
      if (allElements.length === 0) {
        dragButton.style.display = 'none';
        return;
      }

      // Use bounding box for multi-element blocks
      let rect;
      if (allElements.length > 1) {
        rect = this.getBoundingBoxForElements(allElements);
        if (!rect) {
          rect = allElements[0].getBoundingClientRect();
        }
      } else {
        rect = allElements[0].getBoundingClientRect();
      }

      // Hide if block is completely out of view
      if (rect.bottom < 0 || rect.top > window.innerHeight) {
        dragButton.style.display = 'none';
        return;
      }

      // Position using shared calculation (same as Volto toolbar)
      const handlePos = calculateDragHandlePosition(rect);

      dragButton.style.right = 'auto';
      dragButton.style.left = `${handlePos.left}px`;
      dragButton.style.top = `${handlePos.top}px`;
      dragButton.style.display = 'block';
    };

    // Drag handle position is now set in sendBlockSelected() to ensure
    // alignment with Volto toolbar (both use the same rect at the same time)
    // No scroll listener needed - sendBlockSelected handles position updates

    // Create the drag handler
    const dragHandler = (e) => {
      e.preventDefault();

      // Set flag to suppress scrollHandler during drag
      this._isDragging = true;

      // Get all elements for this block (multi-element blocks like listings, template instances)
      // Convert NodeList to array for .map() and .includes() support
      const allElements = [...this.getAllBlockElements(this.selectedBlockUid)];
      if (allElements.length === 0) return;

      // Compute bounding box for all elements
      const rect = this.getBoundingBoxForElements(allElements);
      if (!rect) return;

      document.querySelector('body').classList.add('grabbing');

      // Create a visual ghost for dragging
      let draggedBlock;
      if (allElements.length > 1) {
        // Multi-element block: create a placeholder box representing the bounding area
        draggedBlock = document.createElement('div');
        draggedBlock.classList.add('dragging', 'multi-element-ghost');
        draggedBlock.style.cssText = `
          background: rgba(0, 123, 255, 0.2);
          border: 2px dashed rgba(0, 123, 255, 0.5);
          border-radius: 4px;
        `;
      } else {
        // Single element: clone it as before
        draggedBlock = allElements[0].cloneNode(true);
        draggedBlock.classList.add('dragging');
        // Remove data-block-uid from shadow so it doesn't interfere with selectors
        draggedBlock.removeAttribute('data-block-uid');
      }

      // IMPORTANT: Set styles BEFORE appending to avoid brief layout flash
      // where element is in document flow before position:fixed takes effect
      Object.assign(draggedBlock.style, {
        position: 'fixed',
        width: `${rect.width}px`,
        height: `${rect.height}px`,
        left: `${e.clientX}px`,
        top: `${e.clientY}px`,
        opacity: '0.5',
        pointerEvents: 'none',
        zIndex: '10000',
      });

      document.body.appendChild(draggedBlock);

      let closestBlockUid = null;
      let insertAt = null; // 0 for top, 1 for bottom
      let dropIndicatorVisible = false; // Track if drop indicator is shown - drop only allowed when visible

      // Auto-scroll state - uses requestAnimationFrame for continuous scrolling
      let scrollDirection = 0; // -1 = up, 0 = none, 1 = down
      let scrollAnimationId = null;
      let lastMouseX = 0; // Track last cursor position for scroll updates
      let lastMouseY = 0;
      let currentScrollSpeed = 0; // Variable speed based on edge proximity
      const scrollThreshold = 80; // pixels from edge to trigger scroll
      const minScrollSpeed = 10; // slowest scroll (at threshold edge)
      const maxScrollSpeed = 50; // fastest scroll (at viewport edge)

      // Continuous scroll loop using requestAnimationFrame
      // Dispatches synthetic mousemove to update drop indicator while scrolling
      const scrollLoop = () => {
        if (scrollDirection !== 0) {
          // Use scrollTo with behavior: 'instant' to override CSS scroll-behavior: smooth
          window.scrollTo({
            top: window.scrollY + (scrollDirection * currentScrollSpeed),
            behavior: 'instant'
          });
          // Dispatch synthetic mousemove to update drop indicator position
          // This ensures the indicator updates even when mouse is stationary
          const syntheticEvent = new MouseEvent('mousemove', {
            clientX: lastMouseX,
            clientY: lastMouseY,
            bubbles: true,
          });
          document.dispatchEvent(syntheticEvent);
          scrollAnimationId = requestAnimationFrame(scrollLoop);
        }
      };

      const startScrolling = (direction) => {
        if (scrollDirection !== direction) {
          scrollDirection = direction;
          if (scrollAnimationId === null && direction !== 0) {
            scrollAnimationId = requestAnimationFrame(scrollLoop);
          }
        }
      };

      const stopScrolling = () => {
        scrollDirection = 0;
        if (scrollAnimationId !== null) {
          cancelAnimationFrame(scrollAnimationId);
          scrollAnimationId = null;
        }
      };

      // Handle mouse movement
      const onMouseMove = (e) => {
        // Track cursor position for scroll loop updates
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;

        draggedBlock.style.left = `${e.clientX}px`;
        draggedBlock.style.top = `${e.clientY}px`;

        // Auto-scroll when dragging near viewport edges
        // Uses continuous scrolling that works even when mouse is stationary at edge
        const viewportHeight = window.innerHeight;

        if (e.clientY < scrollThreshold) {
          // Near top edge - scroll up
          // Speed increases as cursor gets closer to edge (0 = fastest, threshold = slowest)
          const distanceFromEdge = e.clientY;
          const speedFactor = 1 - (distanceFromEdge / scrollThreshold); // 1 at edge, 0 at threshold
          currentScrollSpeed = minScrollSpeed + (maxScrollSpeed - minScrollSpeed) * speedFactor;
          startScrolling(-1);
        } else if (e.clientY > viewportHeight - scrollThreshold) {
          // Near bottom edge - scroll down
          const distanceFromEdge = viewportHeight - e.clientY;
          const speedFactor = 1 - (distanceFromEdge / scrollThreshold);
          currentScrollSpeed = minScrollSpeed + (maxScrollSpeed - minScrollSpeed) * speedFactor;
          startScrolling(1);
        } else {
          // Not near edge - stop scrolling
          stopScrolling();
        }

        // Find element under cursor (no throttle - these operations are fast)
        const elementBelow = document.elementFromPoint(e.clientX, e.clientY);
        let closestBlock = elementBelow;

        // Find the closest ancestor with 'data-block-uid'
        while (closestBlock && !closestBlock.hasAttribute('data-block-uid')) {
          closestBlock = closestBlock.parentElement;
        }

        // Exclude the dragged block(s) and ghost from being drop targets
        // For multi-element blocks (listings, template instances), exclude all elements
        const draggedBlockUids = allElements.map(el => el.getAttribute('data-block-uid'));
        const isSelfOrGhost = closestBlock &&
          (closestBlock === draggedBlock || allElements.includes(closestBlock) ||
           draggedBlockUids.includes(closestBlock.getAttribute('data-block-uid')));
        if (isSelfOrGhost) closestBlock = null;

        // Handle overshoot - find nearest block when cursor isn't over any block
        if (!closestBlock) {
          const allBlocks = Array.from(document.querySelectorAll('[data-block-uid]'))
            .filter(el => el !== draggedBlock && !draggedBlockUids.includes(el.getAttribute('data-block-uid')));

          // Find nearest block by vertical distance to cursor
          let nearest = { el: null, dist: Infinity, above: false };
          for (const el of allBlocks) {
            const rect = el.getBoundingClientRect();
            const aboveDist = rect.top - e.clientY; // positive if cursor above block
            const belowDist = e.clientY - rect.bottom; // positive if cursor below block
            if (aboveDist > 0 && aboveDist < nearest.dist) {
              nearest = { el, dist: aboveDist, above: true };
            } else if (belowDist > 0 && belowDist < nearest.dist) {
              nearest = { el, dist: belowDist, above: false };
            }
          }
          if (nearest.el) {
            closestBlock = nearest.el;
            insertAt = nearest.above ? 0 : 1;
          }
        }

        if (closestBlock) {
          // Check if the dragged block type(s) are allowed in the target container
          // If not, walk up the parent chain to find a valid drop target
          // For template instances, check all child block types are allowed
          const draggedBlockTypes = draggedBlockUids.map(uid => this.getBlockType(uid)).filter(Boolean);

          // Find a valid drop target by walking up the parent chain
          let validDropTarget = closestBlock;
          let validDropTargetUid = validDropTarget.getAttribute('data-block-uid');

          while (validDropTarget) {
            const targetPathInfo = this.blockPathMap?.[validDropTargetUid];
            const allowedSiblingTypes = targetPathInfo?.allowedSiblingTypes;

            // Check if drop is allowed here - all dragged block types must be allowed
            const allTypesAllowed = !allowedSiblingTypes || draggedBlockTypes.length === 0 ||
              draggedBlockTypes.every(type => allowedSiblingTypes.includes(type));
            if (allTypesAllowed) {
              // Drop is allowed at this level
              break;
            }

            // Not allowed here, try parent block
            const parentElement = validDropTarget.parentElement?.closest('[data-block-uid]');
            if (!parentElement) {
              // No more parents to check - drop not allowed anywhere
              validDropTarget = null;
              validDropTargetUid = null;
              break;
            }

            validDropTarget = parentElement;
            validDropTargetUid = validDropTarget.getAttribute('data-block-uid');

            // Don't allow dropping on any of the blocks we're dragging
            if (draggedBlockUids.includes(validDropTargetUid)) {
              validDropTarget = null;
              validDropTargetUid = null;
              break;
            }
          }

          // If no valid drop target found, hide indicator and skip
          if (!validDropTarget) {
            const existingIndicator = document.querySelector('.volto-hydra-drop-indicator');
            if (existingIndicator) {
              existingIndicator.style.display = 'none';
            }
            dropIndicatorVisible = false;
            closestBlockUid = null;
            return;
          }

          // Use the valid drop target (may be the original or a parent)
          closestBlock = validDropTarget;
          closestBlockUid = validDropTargetUid;

          // Get or create drop indicator
          let dropIndicator = document.querySelector('.volto-hydra-drop-indicator');
          if (!dropIndicator) {
            dropIndicator = document.createElement('div');
            dropIndicator.className = 'volto-hydra-drop-indicator';
            dropIndicator.style.cssText = 'position:absolute;background:transparent;pointer-events:none;z-index:9998;display:none;';
            document.body.appendChild(dropIndicator);
          }

          // Check if this is a multi-element block (multiple elements with same UID)
          const allElements = this.getAllBlockElements(closestBlockUid);
          const isMultiElement = allElements.length > 1;

          // For multi-element blocks, use combined bounding box and first/last elements
          let targetElement = closestBlock;
          let rect;

          if (isMultiElement) {
            // Use combined bounding box for positioning decision
            rect = this.getBoundingBoxForElements(allElements);
          } else {
            rect = closestBlock.getBoundingClientRect();
          }

          const isHorizontal = this.getAddDirection(closestBlock) === 'right';

          // Determine insertion point based on mouse position relative to block center
          const mousePos = isHorizontal ? e.clientX - rect.left : e.clientY - rect.top;
          const blockSize = isHorizontal ? rect.width : rect.height;
          const preferredInsertAt = mousePos < blockSize / 2 ? 0 : 1; // 0 = before, 1 = after

          // Check if insert position is allowed using centralized addability logic
          // This handles fixed blocks, readonly blocks, and templateEditMode
          // Pass source block data to enable dragging blocks into templates
          const targetBlockData = this.getBlockData(closestBlockUid);
          const sourceBlockData = this.getBlockData(this.selectedBlockUid);
          const addability = getBlockAddability(closestBlockUid, this.blockPathMap, targetBlockData, this.templateEditMode, sourceBlockData);

          // Use preferred position if allowed, otherwise try the other side
          if (preferredInsertAt === 0 && addability.canInsertBefore) {
            insertAt = 0;
          } else if (preferredInsertAt === 1 && addability.canInsertAfter) {
            insertAt = 1;
          } else if (addability.canInsertBefore) {
            insertAt = 0;
          } else if (addability.canInsertAfter) {
            insertAt = 1;
          } else {
            // Neither side is allowed - hide indicator
            const existingIndicator = document.querySelector('.volto-hydra-drop-indicator');
            if (existingIndicator) {
              existingIndicator.style.display = 'none';
            }
            dropIndicatorVisible = false;
            closestBlockUid = null;
            return;
          }

          // For multi-element blocks, use first or last element for indicator positioning
          if (isMultiElement) {
            targetElement = insertAt === 0 ? allElements[0] : allElements[allElements.length - 1];
          }

          // Calculate indicator position in the gap between blocks
          // For sibling lookup, use targetElement (first/last of multi-element, or the single element)
          const sibling = insertAt === 0 ? targetElement.previousElementSibling : targetElement.nextElementSibling;
          // Don't use sibling if it has the same UID (another element of same multi-element block)
          const siblingUid = sibling?.getAttribute('data-block-uid');
          const siblingRect = sibling?.hasAttribute('data-block-uid') && siblingUid !== closestBlockUid
            ? sibling.getBoundingClientRect() : null;
          const indicatorSize = 4;

          let indicatorPos;
          if (isHorizontal) {
            const edge = insertAt === 0 ? rect.left : rect.right;
            const siblingEdge = siblingRect ? (insertAt === 0 ? siblingRect.right : siblingRect.left) : edge;
            const gap = insertAt === 0 ? rect.left - (siblingRect?.right || rect.left) : (siblingRect?.left || rect.right) - rect.right;
            indicatorPos = (insertAt === 0 ? siblingRect?.right || rect.left : rect.right) + window.scrollX + gap / 2 - indicatorSize / 2;

            Object.assign(dropIndicator.style, {
              left: `${indicatorPos}px`, top: `${rect.top + window.scrollY}px`,
              width: `${indicatorSize}px`, height: `${rect.height}px`,
              borderTop: 'none', borderLeft: '3px dashed #007bff', display: 'block'
            });
          } else {
            const edge = insertAt === 0 ? rect.top : rect.bottom;
            const siblingEdge = siblingRect ? (insertAt === 0 ? siblingRect.bottom : siblingRect.top) : edge;
            const gap = insertAt === 0 ? rect.top - (siblingRect?.bottom || rect.top) : (siblingRect?.top || rect.bottom) - rect.bottom;
            indicatorPos = (insertAt === 0 ? siblingRect?.bottom || rect.top : rect.bottom) + window.scrollY + gap / 2 - indicatorSize / 2;

            Object.assign(dropIndicator.style, {
              top: `${indicatorPos}px`, left: `${rect.left}px`,
              width: `${rect.width}px`, height: `${indicatorSize}px`,
              borderLeft: 'none', borderTop: '3px dashed #007bff', display: 'block'
            });
          }
          dropIndicatorVisible = true;
        } else {
          // No valid drop target - hide indicator and mark as not droppable
          const existingIndicator = document.querySelector('.volto-hydra-drop-indicator');
          if (existingIndicator) {
            existingIndicator.style.display = 'none';
          }
          dropIndicatorVisible = false;
          closestBlockUid = null;
        }
      };

      // Cleanup on mouseup & update blocks layout
      const onMouseUp = () => {
        // Clear drag flag
        this._isDragging = false;

        // Clear any pending scroll timeout from auto-scroll
        // This prevents stale BLOCK_SELECTED from firing after drop
        if (this.scrollTimeout) {
          clearTimeout(this.scrollTimeout);
          this.scrollTimeout = null;
        }

        // Stop auto-scroll
        stopScrolling();

        document.querySelector('body').classList.remove('grabbing');
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);

        draggedBlock.remove();

        // Always clean up drop indicator on mouseup
        const dropIndicator = document.querySelector('.volto-hydra-drop-indicator');
        if (dropIndicator) {
          log('Hiding drop indicator on mouseup');
          dropIndicator.style.display = 'none';
        } else {
          log('No drop indicator to hide on mouseup');
        }

        // Only allow drop if indicator was visible - this ensures all validation passed
        if (closestBlockUid && dropIndicatorVisible) {
          // Mark which block we just finished dragging - prevents scrollIntoView race condition
          // with async renderers. Cleared when FORM_DATA arrives with this block selected.
          // Only set on successful drop, not on cancelled drags.
          this._justFinishedDragBlockId = this.selectedBlockUid;

          // Use selectedBlockUid (not blockElement's UID) to support template instances
          // For template instances, selectedBlockUid is the instance ID, blockElement is first child
          const draggedBlockId = this.selectedBlockUid;
          const draggedPathInfo = this.blockPathMap?.[draggedBlockId];
          const targetPathInfo = this.blockPathMap?.[closestBlockUid];

          // Send MOVE_BLOCK message with all info needed for the move
          // Admin will handle the complex mutation (works for page-level and container blocks)
          log('DnD: Moving block', draggedBlockId, 'relative to', closestBlockUid, 'insertAfter:', insertAt === 1);
          window.parent.postMessage(
            {
              type: 'MOVE_BLOCK',
              blockId: draggedBlockId,
              targetBlockId: closestBlockUid,
              insertAfter: insertAt === 1,
              // Include path info for Admin to determine source/target containers
              sourceParentId: draggedPathInfo?.parentId || null,
              targetParentId: targetPathInfo?.parentId || null,
            },
            this.adminOrigin,
          );
        } else if (closestBlockUid && !dropIndicatorVisible) {
          log('DnD: Drop rejected - indicator was not visible (block type not allowed in target)');
        }
      };

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    };

    // Add the event listener
    dragButton.addEventListener('mousedown', dragHandler);

    // Store reference for cleanup
    dragButton._dragHandler = dragHandler;
  }

  /**
   * Listens for 'SELECT_BLOCK' messages from the adminUI to select a block.
   */
  listenForSelectBlockMessage() {
    this.selectBlockHandler = (event) => {
      if (event.origin !== this.adminOrigin) {
        return;
      }

      // Handle SELECT_BLOCK - select a new block from Admin UI
      if (event.data.type === 'SELECT_BLOCK') {
        const { uid } = event.data;

        // Check if already selected BEFORE updating selectedBlockUid
        // This prevents ping-pong when Admin echoes back the selection from iframe click
        const alreadySelected = this.selectedBlockUid === uid;

        this.selectedBlockUid = uid;
        // Don't update formData here - it's managed via FORM_DATA messages
        // Don't post FORM_DATA - form data syncing is handled separately

        // Handle template instances (virtual containers with no DOM element)
        // selectBlock handles these by computing bounding box from child elements
        if (this.blockPathMap?.[uid]?.isTemplateInstance) {
          if (!alreadySelected) {
            this.selectBlock(uid);
          }
          return;
        }

        // console.log("select block", event.data?.method);
        let blockElement = document.querySelector(
          `[data-block-uid="${uid}"]`,
        );

        // If block doesn't exist or is hidden, try to make it visible
        // using data-block-selector navigation (e.g., carousel slides)
        if (!blockElement || this.isElementHidden(blockElement)) {
          // Wait for block to become visible (e.g., carousel animation in progress)
          const waitForVisible = async () => {
            for (let i = 0; i < 30; i++) {
              await new Promise((resolve) => setTimeout(resolve, 50));
              blockElement = document.querySelector(
                `[data-block-uid="${uid}"]`,
              );
              if (blockElement && !this.isElementHidden(blockElement)) {
                return true;
              }
            }
            return false;
          };

          if (alreadySelected || this._blockSelectorNavigating) {
            // Navigation already in progress (carousel click or handleBlockSelector) -
            // just wait for the animation to complete, don't try to navigate again
            waitForVisible().then((visible) => {
              if (visible) {
                this.selectBlock(blockElement);
              }
            });
            return;
          }

          // Block not yet selected and no navigation in progress - try to navigate to it
          const madeVisible = this.tryMakeBlockVisible(uid);
          if (madeVisible) {
            waitForVisible().then((visible) => {
              if (visible) {
                this.selectBlock(blockElement);
              }
            });
            return; // Exit early - selection will happen in the async callback
          }
        }

        if (blockElement && !this.isElementHidden(blockElement)) {
          // Skip if this block was already selected - no need to re-select
          if (alreadySelected) {
            log('SELECT_BLOCK: block already selected, skipping:', uid);
            return;
          }

          // Scroll into view for new block selection. selectBlock's internal scroll check
          // compares this.selectedBlockUid === blockUid, but we already set selectedBlockUid
          // above (line 5303) so it always thinks it's a re-select and skips the scroll.
          if (!this.elementIsVisibleInViewport(blockElement)) {
            this.scrollBlockIntoView(blockElement);
          }

          // Call selectBlock() to properly set up toolbar and contenteditable
          // This ensures blocks selected via Order tab work the same as clicking
          this.selectBlock(blockElement);

          // Focus the contenteditable element for blocks with editable fields
          // This includes slate, string, and textarea field types
          const pathInfo = this.blockPathMap?.[uid];
          const schemaProps = pathInfo?.resolvedBlockSchema?.properties;
          const hasEditableFields = schemaProps && Object.keys(schemaProps).length > 0;

          if (hasEditableFields) {
            // Use double requestAnimationFrame to wait for ALL DOM updates including Quanta toolbar
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                // Re-query the block element to ensure we get the updated DOM element
                const currentBlockElement = this.queryBlockElement(uid);
                if (currentBlockElement) {
                  // Find the first contenteditable field that belongs to THIS block
                  // (not a nested block's field) to avoid ping-pong selection issues
                  const editableField = this.getOwnFirstEditableField(currentBlockElement);
                  if (editableField && editableField.getAttribute('contenteditable') === 'true') {
                    // Only focus the field, don't manipulate the selection
                    // The selection may have been carefully set by a format operation
                    // or other operation, so we should preserve it
                    editableField.focus();

                    // Don't manipulate selection here - just focus is enough
                    // If there's no selection, the browser will place cursor at the beginning
                    // which is fine for a newly selected block
                  }
                }
              });
            });
          }
        } else {
          // Block element not found - content may not be rendered yet
          // Retry after a short delay (happens on initial page load)
          log('Block element not found for SELECT_BLOCK, retrying in 100ms:', uid);
          setTimeout(() => {
            // Re-trigger the same SELECT_BLOCK message
            window.postMessage(
              {
                type: 'SELECT_BLOCK_RETRY',
                uid: uid,
              },
              window.location.origin,
            );
          }, 100);
        }
        // this.isInlineEditing = true;
        // this.observeForBlock(uid);
      }

      // Handle retry of SELECT_BLOCK when initial attempt failed
      if (event.data.type === 'SELECT_BLOCK_RETRY') {
        const { uid } = event.data;
        const blockElement = document.querySelector(
          `[data-block-uid="${uid}"]`,
        );
        if (blockElement) {
          log('Block element found on retry, selecting:', uid);
          this.selectBlock(blockElement);
        } else {
          console.warn('[HYDRA] Block element still not found after retry:', uid);
        }
      }
    };

    window.removeEventListener('message', this.selectBlockHandler);
    window.addEventListener('message', this.selectBlockHandler);
  }

  /**
   * Sets up scroll handler to hide/show block UI overlays on scroll
   */
  setupScrollHandler() {
    const handleScroll = () => {
      // Hide overlays immediately when scrolling
      // Skip during block selector navigation — carousel animation handles its own
      // UI state, and scrollBlockIntoViewWithToolbarRoom can trigger scroll events
      // that would hide the toolbar with no BLOCK_SELECTED to restore it (the
      // debounced handler below also skips when _blockSelectorNavigating is true).
      if (this.selectedBlockUid && !this._blockSelectorNavigating) {
        window.parent.postMessage(
          { type: 'HIDE_BLOCK_UI' },
          this.adminOrigin,
        );
      }

      // Clear any existing timeout
      if (this.scrollTimeout) {
        clearTimeout(this.scrollTimeout);
      }

      // After scroll stops, re-send BLOCK_SELECTED with updated positions
      // Skip during drag - auto-scroll causes misleading position updates
      // Skip during block selector navigation - carousel animations cause stale position updates
      this.scrollTimeout = setTimeout(() => {
        if (this._isDragging || this._blockSelectorNavigating) {
          return; // Don't send BLOCK_SELECTED during drag or carousel navigation
        }
        if (this.selectedBlockUid) {
          let element;
          if (this.selectedBlockUid === PAGE_BLOCK_UID) {
            // Page-level field - find element using focused field info
            if (this.focusedMediaField) {
              element = document.querySelector(`[data-edit-media="${this.focusedMediaField}"]`);
            } else if (this.focusedLinkableField) {
              element = document.querySelector(`[data-edit-link="${this.focusedLinkableField}"]`);
            } else if (this.focusedFieldName) {
              element = document.querySelector(`[data-edit-text="${this.focusedFieldName}"]`);
            }
          } else {
            // Use getAllBlockElements to handle template instances (virtual containers)
            // which don't have their own DOM element but have child block elements
            const elements = this.getAllBlockElements(this.selectedBlockUid);
            element = elements[0] || null;
          }

          if (element) {
            // Pass blockUid explicitly to preserve template instance selection
            // (element may be a child block with different UID)
            this.sendBlockSelected('scrollHandler', element, { blockUid: this.selectedBlockUid });
          }
        }
      }, 150);
    };

    window.addEventListener('scroll', handleScroll);
  }

  /**
   * Sets up window resize handler to update block UI overlay positions
   */
  setupResizeHandler() {
    const handleResize = () => {
      // After resize, re-send BLOCK_SELECTED with updated positions
      if (this.selectedBlockUid) {
        // Use getAllBlockElements to handle template instances (virtual containers)
        const elements = this.getAllBlockElements(this.selectedBlockUid);
        const blockElement = elements[0] || null;

        if (blockElement) {
          // Pass blockUid explicitly to preserve template instance selection
          this.sendBlockSelected('resizeHandler', blockElement, { blockUid: this.selectedBlockUid });
        }
      }
    };

    window.addEventListener('resize', handleResize);
  }

  /**
   * Sends throttled MOUSE_ACTIVITY messages to admin on mouse use.
   * The admin uses this to show the toolbar (which starts hidden).
   * Listens for both mousemove and mousedown (click without prior movement).
   * Throttled to 1 message per second to avoid flooding.
   */
  setupMouseActivityReporter() {
    let lastSent = 0;
    const sendActivity = () => {
      const now = Date.now();
      if (now - lastSent < 1000) return;
      lastSent = now;
      window.parent.postMessage({ type: 'MOUSE_ACTIVITY' }, this.adminOrigin);
    };
    document.addEventListener('mousemove', sendActivity);
    document.addEventListener('mousedown', sendActivity);
  }

  ////////////////////////////////////////////////////////////////////////////////
  // Make Block Text Inline Editable and Text Changes Observation
  ////////////////////////////////////////////////////////////////////////////////

  /**
   * Makes the content of a block editable.
   *
   * @param {HTMLElement} blockElement - The block element to make editable.
   */
  makeBlockContentEditable(elementOrBlock) {
    // Handle being called with either a block element or an editable field directly
    let blockUid;
    let editableField;

    let blockElement;

    if (elementOrBlock.hasAttribute('data-edit-text')) {
      // Called with the editable field directly - find block-uid from parent
      editableField = elementOrBlock;
      blockElement = elementOrBlock.closest('[data-block-uid]');
      blockUid = blockElement?.getAttribute('data-block-uid');
    } else {
      // Called with a block element - query for child editable field
      // Use getOwnFirstEditableField to avoid getting nested blocks' fields
      blockElement = elementOrBlock;
      blockUid = elementOrBlock.getAttribute('data-block-uid');
      editableField = this.getOwnFirstEditableField(elementOrBlock);
    }

    // Skip making readonly blocks editable
    if (blockUid && this.isBlockReadonly(blockUid)) {
      return;
    }

    if (editableField) {
      // Make the field contenteditable - child inline elements inherit this
      editableField.setAttribute('contenteditable', 'true');

      // Ensure minimum dimensions if element has no height (empty content)
      // This keeps empty fields visible/clickable for user interaction
      const rect = editableField.getBoundingClientRect();
      if (rect.height === 0) {
        editableField.style.minHeight = '1.5em';
      }
      if (rect.width === 0) {
        editableField.style.minWidth = '1em';
      }
    }

    if (editableField && blockUid) {
      // Skip if listeners already attached to this element
      if (editableField._hydraListenersAttached) {
        return;
      }
      editableField._hydraListenersAttached = true;

      // Handle Chrome's cursor-outside-anchor quirk for prospective inline elements.
      // Chrome moves cursor outside <a> elements during text insertion.
      // We intercept beforeinput to manually insert text into the prospective inline.
      // See: https://www.w3.org/community/editing/wiki/ContentEditable
      //      https://github.com/ianstormtaylor/slate/issues/4704
      editableField.addEventListener('beforeinput', (e) => {
        // Handle Chrome's cursor-outside-anchor quirk for prospective inline elements.
        // Chrome moves cursor outside <a> elements DURING DOM insertion (after keydown/beforeinput).
        // We intercept beforeinput and manually insert text into the prospective inline.
        // See: https://www.w3.org/community/editing/wiki/ContentEditable
        //      https://github.com/ianstormtaylor/slate/issues/4704
        if (e.inputType !== 'insertText' || !e.data) return;
        if (!this.prospectiveInlineElement) return;

        const prospectiveInline = this.prospectiveInlineElement;
        if (!prospectiveInline.isConnected) {
          this.prospectiveInlineElement = null;
          return;
        }

        // Redirect text into prospective inline
        e.preventDefault();

        // Find the text node inside the inline
        let inlineTextNode = null;
        for (const child of prospectiveInline.childNodes) {
          if (child.nodeType === Node.TEXT_NODE) {
            inlineTextNode = child;
            break;
          }
        }

        if (inlineTextNode) {
          // Insert the character at the end of the inline's text
          const selection = window.getSelection();
          inlineTextNode.textContent += e.data;
          // Position cursor at end
          const newRange = document.createRange();
          newRange.setStart(inlineTextNode, inlineTextNode.textContent.length);
          newRange.collapse(true);
          selection.removeAllRanges();
          selection.addRange(newRange);
        }
      });

      // Add paste event listener
      editableField.addEventListener('paste', (e) => {
        e.preventDefault(); // Prevent default paste
        const html = e.clipboardData.getData('text/html') || e.clipboardData.getData('text/plain');
        this._doPaste(blockUid, html);
      });

      // Add copy event listener on document - strip ZWS/NBSP and internal data attributes from clipboard
      // Listen on document because keyboard shortcuts may not bubble through contenteditable
      document.addEventListener('copy', (e) => this._doCopy(e));

      // Document-level paste handler (registered once) — catches paste events
      // that don't reach a field-level handler: when no block is focused (body),
      // or during transforms when the editable field was destroyed by re-render.
      if (!this._documentPasteHandler) {
        this._documentPasteHandler = (e) => {
          // Skip if a field-level paste handler already handled this
          if (e.defaultPrevented) return;

          // During transforms: buffer clipboard data for replay
          if (this.blockedBlockId) {
            e.preventDefault();
            const html = e.clipboardData.getData('text/html') || e.clipboardData.getData('text/plain');
            this.eventBuffer.push({ _type: 'paste', html });
            log('BUFFERED paste data (document handler), buffer size:', this.eventBuffer.length);
            return;
          }

          // No transform: paste into selected block if available
          if (this.selectedBlockUid) {
            e.preventDefault();
            const html = e.clipboardData.getData('text/html') || e.clipboardData.getData('text/plain');
            this._doPaste(this.selectedBlockUid, html);
          }
        };
        document.addEventListener('paste', this._documentPasteHandler);
      }

      // Prevent browser from removing text nodes on last-char deletion.
      // Like slate-react (string.tsx), we keep empty text nodes alive with
      // ZWS (\uFEFF) so MutationObserver always fires characterData (not
      // childList). Part of ZWS lifecycle — see "Whitespace & ZWS Strategy".
      editableField.addEventListener('beforeinput', (e) => {
        if (e.inputType !== 'deleteContentBackward' && e.inputType !== 'deleteContentForward') return;
        if (this.preserveLastCharDelete()) {
          e.preventDefault();
        }
      });

      // Add keydown listener for Enter, Delete, Backspace, Undo, Redo, and formatting shortcuts
      editableField.addEventListener('keydown', (e) => {
        // DEBUG: trace End/Backspace key arrival and selection state
        if (e.key === 'End' || e.key === 'Backspace') {
          const sel = window.getSelection();
          log('DEBUG keydown:', e.key, 'isTrusted:', e.isTrusted,
              'collapsed:', sel?.isCollapsed, 'anchorOffset:', sel?.anchorOffset,
              'focusOffset:', sel?.focusOffset, 'anchorNode:', sel?.anchorNode?.nodeName,
              'blockedBlockId:', this.blockedBlockId);
        }
        // Ensure cursor is inside a data-node-id element before processing.
        // After transforms (e.g. delete), Vue/Nuxt may re-render and leave the
        // cursor on template whitespace outside the content element.
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
          this.correctInvalidWhitespaceSelection();
          // Also fix whitespace-only text nodes INSIDE data-node-id elements.
          // Nuxt renders empty paragraphs as <p> </p> (space). The browser's
          // contenteditable refuses to insert characters into a whitespace-only
          // text node inside a block element, creating a new node on the parent
          // instead. Replace the whitespace with FEFF so the browser has a valid
          // insertion target.
          this.ensureValidInsertionTarget();
        }

        // Clear prospective inline on navigation keys (user intentionally leaving the inline)
        const navigationKeys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Escape', 'Tab', 'Home', 'End', 'PageUp', 'PageDown'];
        const isNavigationKey = navigationKeys.includes(e.key) || e.ctrlKey || e.metaKey || e.altKey;
        if (isNavigationKey && this.prospectiveInlineElement) {
          log('Clearing prospective inline due to navigation key:', e.key);
          this.prospectiveInlineElement = null;
        }

        // Ensure navigation keys actually move the cursor.
        // CDP-dispatched keydown events (e.g. from Playwright or automation) don't always
        // trigger the browser's native cursor movement in contenteditable. Apply
        // selection.modify explicitly — this is idempotent with the native action.
        // Arrow keys are handled by _arrowNavHandler (attached in restoreContentEditableOnFields)
        // for ALL field types, so only handle Home/End and Shift+arrow here.
        const navActions = {
          Home: ['backward', 'lineboundary'],
          End: ['forward', 'lineboundary'],
        };
        // Arrow keys are handled by _arrowNavHandler (from restoreContentEditableOnFields).
        // Only handle Home/End here.
        if (navActions[e.key] && !e.ctrlKey && !e.metaKey && !e.altKey) {
          const sel = window.getSelection();
          if (sel) {
            const alter = e.shiftKey ? 'extend' : 'move';
            sel.modify(alter, navActions[e.key][0], navActions[e.key][1]);
            e.preventDefault();
          }
        }

        // When slash menu is active, forward navigation keys to admin
        if (this._slashMenuActive) {
          if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            e.preventDefault();
            this.sendMessageToParent({
              type: 'SLASH_MENU',
              action: e.key === 'ArrowUp' ? 'up' : 'down',
              blockId: blockUid,
            });
            return;
          }
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            this.sendMessageToParent({
              type: 'SLASH_MENU',
              action: 'select',
              blockId: blockUid,
            });
            return;
          }
          if (e.key === 'Escape') {
            e.preventDefault();
            this._slashMenuActive = false;
            this.sendMessageToParent({
              type: 'SLASH_MENU',
              action: 'hide',
              blockId: blockUid,
            });
            return;
          }
        }

        // Always suppress native contenteditable formatting shortcuts (Ctrl/Cmd+B/I/U/S)
        // to prevent native formatting from conflicting with Slate-based formatting
        const nativeFormattingKeys = ['b', 'i', 'u', 's'];
        if ((e.ctrlKey || e.metaKey) && nativeFormattingKeys.includes(e.key.toLowerCase())) {
          log('Suppressing native formatting for:', e.key);
          e.preventDefault();
        }

        // Handle formatting keyboard shortcuts (Ctrl+B, Ctrl+I, etc.)
        if (this.slateConfig && this.slateConfig.hotkeys) {
          for (const [shortcut, config] of Object.entries(this.slateConfig.hotkeys)) {
            // Parse shortcut like "mod+b" into components
            const parts = shortcut.toLowerCase().split('+');
            const hasmod = parts.includes('mod');
            const hasShift = parts.includes('shift');
            const hasAlt = parts.includes('alt');
            const key = parts[parts.length - 1]; // Last part is the key

            // Check if this shortcut matches the current event
            const modifierMatch = hasmod ? (e.ctrlKey || e.metaKey) : true;
            const shiftMatch = hasShift ? e.shiftKey : !e.shiftKey;
            const altMatch = hasAlt ? e.altKey : !e.altKey;
            const keyMatch = e.key.toLowerCase() === key;

            if (modifierMatch && shiftMatch && altMatch && keyMatch && config.type === 'inline') {

              // Only apply format hotkeys to slate fields - text/textarea fields don't support formatting
              if (!this.isSlateField(blockUid, this.focusedFieldName)) {
                console.warn('[HYDRA] Skipping format hotkey - field is not slate');
                // Still prevent default to avoid native contenteditable formatting
                e.preventDefault();
                return;
              }

              e.preventDefault();

              // Send format request with current form data included
              // This ensures admin receives latest text along with the format action
              this.sendTransformRequest(blockUid, 'format', {
                format: config.format,
              });
              return;
            }
          }
        }

        // Handle Undo (Ctrl+Z / Cmd+Z)
        if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
          log('Undo detected');
          e.preventDefault();

          // Flush pending text so undo manager has the latest state
          this.flushPendingTextUpdates();
          this.sendMessageToParent({
            type: 'SLATE_UNDO_REQUEST',
            blockId: blockUid,
          });
          return;
        }

        // Handle Redo (Ctrl+Shift+Z / Cmd+Shift+Z or Ctrl+Y / Cmd+Y)
        if ((e.ctrlKey || e.metaKey) && ((e.key === 'z' && e.shiftKey) || e.key === 'y')) {
          log('Redo detected');
          e.preventDefault();

          // Flush pending text so redo manager has the latest state
          this.flushPendingTextUpdates();
          this.sendMessageToParent({
            type: 'SLATE_REDO_REQUEST',
            blockId: blockUid,
          });
          return;
        }

        // Handle Save (Ctrl+S / Cmd+S) - forward to parent for CMS save
        // Note: strikethrough was moved to Ctrl+Shift+S to free this shortcut
        if ((e.ctrlKey || e.metaKey) && e.key === 's' && !e.shiftKey) {
          log('Save shortcut detected');
          e.preventDefault();
          this.sendMessageToParent({
            type: 'SAVE_REQUEST',
          });
          return;
        }

        // Copy (Ctrl+C / Cmd+C): let native keydown propagate → copy event
        // fires → _doCopy cleans clipboard with both HTML and plain text.

        // Cut (Ctrl+X / Cmd+X): copy via execCommand (triggers _doCopy),
        // then delete via transform. Synchronous — no async clipboard API.
        if ((e.ctrlKey || e.metaKey) && e.key === 'x') {
          e.preventDefault();
          this._doCut(blockUid);
          return;
        }

        // Paste (Ctrl+V / Cmd+V): let native keydown propagate → paste
        // event fires → field-level handler calls _doPaste with HTML.

        // Handle markdown shortcuts (Space triggers autoformat)
        // Shared handler checks text before cursor for block/inline patterns
        if (e.key === ' ' && this.handleSpaceKey(blockUid)) {
          e.preventDefault();
          return;
        }

        // Handle Tab/Shift+Tab for list indentation in slate fields
        if (e.key === 'Tab' && !e.ctrlKey && !e.metaKey) {
          if (this.isSlateField(blockUid, this.focusedFieldName)) {
            const selection = window.getSelection();
            if (selection.rangeCount) {
              const tabNode = selection.getRangeAt(0).startContainer;
              const tabEl = tabNode.nodeType === Node.TEXT_NODE ? tabNode.parentElement : tabNode;
              if (tabEl?.closest('li')) {
                e.preventDefault();
                this.sendTransformRequest(blockUid, e.shiftKey ? 'outdent' : 'indent', {});
                return;
              }
            }
          }
        }

        // Handle Enter key to create new block (slate fields only)
        // Non-slate fields handle Enter via _enterKeyHandler in restoreContentEditableOnFields
        if (e.key === 'Enter' && !e.shiftKey) {
          if (!this.isSlateField(blockUid, this.focusedFieldName)) {
            // Non-slate field — _enterKeyHandler handles navigation/add-block
            return;
          }

          log('Enter key detected in slate field (no Shift)');

          const blockElement = editableField.closest('[data-block-uid]');
          if (!blockElement) return;

          // Check if this is the last editable field — if not, navigate to next field
          const ownFields = this.getOwnEditableFields(blockElement);
          const currentIndex = ownFields.indexOf(editableField);
          const isLastField = currentIndex === ownFields.length - 1;

          if (!isLastField && ownFields.length > 1) {
            e.preventDefault();
            const nextField = ownFields[currentIndex + 1];
            nextField.focus();
            const sel = window.getSelection();
            const range = document.createRange();
            range.selectNodeContents(nextField);
            range.collapse(true);
            sel.removeAllRanges();
            sel.addRange(range);
            return;
          }

          // Last (or only) slate field — split/create via transform
          // Correct cursor if it's on invalid whitespace before checking data-node-id
          this.correctInvalidWhitespaceSelection();

          const selection = window.getSelection();
          log('Selection rangeCount:', selection.rangeCount);
          if (!selection.rangeCount) return;

          const range = selection.getRangeAt(0);
          const node = range.startContainer;

          const parentElement =
            node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
          const hasNodeId = parentElement?.closest('[data-node-id]');
          log('Has data-node-id?', !!hasNodeId);

          if (hasNodeId) {
            log('Preventing default Enter and sending transform request for block:', blockUid);
            e.preventDefault();
            this.sendTransformRequest(blockUid, 'enter', {});
            return;
          }
        }

        // Handle Delete/Backspace special cases (unwrap, delete block, boundary)
        // via shared handler. If not handled, let browser perform native action.
        if (e.key === 'Delete' || e.key === 'Backspace') {
          if (this.handleDeleteKey(blockUid, e.key)) {
            e.preventDefault();
          }
        }
      });
    }
  }

  /**
   * Observes changes in the text content of a block.
   * For multi-element blocks, observes ALL elements with the same block UID.
   *
   * @param {HTMLElement} blockElement - The block element to observe.
   */
  observeBlockTextChanges(blockElement) {
    const blockUid = blockElement.getAttribute('data-block-uid');
    log('observeBlockTextChanges called for block:', blockUid);
    if (this.blockTextMutationObserver) {
      this.blockTextMutationObserver.disconnect();
    }
    this.blockTextMutationObserver = new MutationObserver((mutations) => {
      log('MutationObserver fired, mutations:', mutations.length, 'isInlineEditing:', this.isInlineEditing);
      mutations.forEach((mutation) => {
        log('Mutation:', mutation.type, 'target:', mutation.target?.nodeName, 'text:', mutation.target?.textContent?.substring(0, 50));
        if (mutation.type === 'characterData' && this.isInlineEditing) {
          // Find the editable field element (works for both Slate and non-Slate fields)
          const mutatedTextNode = mutation.target; // The actual text node that changed
          const parentEl = mutation.target?.parentElement;
          const targetElement = parentEl?.closest('[data-edit-text]');
          log('characterData mutation: parentEl=', parentEl?.tagName, 'targetElement=', targetElement?.tagName, 'targetElement has attr:', targetElement?.hasAttribute?.('data-edit-text'));

          if (targetElement) {
            // Pass parentEl so handleTextChange can find the actual node that changed
            // (e.g., SPAN for inline formatting) rather than the whole editable field (P)
            // Also pass the mutated text node so we can identify which child to update
            this.handleTextChange(targetElement, parentEl, mutatedTextNode);
          } else {
            console.warn('[HYDRA] No targetElement found, parent chain:', parentEl?.outerHTML?.substring(0, 100));
          }
        }
        // childList mutations: when text is inside wrapper elements without
        // data-node-id (e.g., Vue/F7 <span>), the browser may REPLACE the
        // text node (childList) rather than modify it in place (characterData).
        // This happens on select-all + type, backspace across node boundaries,
        // or browser DOM normalization.
        // NOTE: the observer is disconnected during framework re-renders
        // (_executeRender disconnects, afterContentRender reconnects) so
        // structural changes from FORM_DATA don't trigger this.
        if (mutation.type === 'childList' && this.isInlineEditing && !this._renderInProgress) {
          const parent = mutation.target;
          if (parent?.nodeType === Node.ELEMENT_NODE) {
            const targetElement = parent.closest?.('[data-edit-text]');
            if (targetElement) {
              const addedTextNode = Array.from(mutation.addedNodes).find(
                n => n.nodeType === Node.TEXT_NODE
              );
              if (addedTextNode) {
                this.handleTextChange(targetElement, parent, addedTextNode);
              }
            }
          }
        }
      });
    });

    // For multi-element blocks, observe ALL elements with the same block UID
    // For page-level fields (no blockUid), observe the element directly
    if (blockUid) {
      const allElements = this.getAllBlockElements(blockUid);
      for (const element of allElements) {
        this.blockTextMutationObserver.observe(element, {
          subtree: true,
          characterData: true,
          childList: true,
        });
      }
    } else {
      // Page-level field - observe the element directly
      this.blockTextMutationObserver.observe(blockElement, {
        subtree: true,
        characterData: true,
        childList: true,
      });
    }
  }

  /**
   * Checks if an element is visible in the viewport
   * @param {HTMLElement} el
   * @param {Boolean} partiallyVisible
   * @returns
   */
  elementIsVisibleInViewport(el, partiallyVisible = false) {
    if (!el) return true;
    const { top, left, bottom, right } = el.getBoundingClientRect();
    const { innerHeight, innerWidth } = window;
    return partiallyVisible
      ? ((top > 0 && top < innerHeight) ||
          (bottom > 0 && bottom < innerHeight)) &&
          ((left > 0 && left < innerWidth) || (right > 0 && right < innerWidth))
      : top >= 0 && left >= 0 && bottom <= innerHeight && right <= innerWidth;
  }

  /**
   * Scrolls an element into view, centering if it fits or showing top if too tall.
   * @param {HTMLElement} el - Element to scroll into view
   * @param {Object} options - Options
   * @param {number} options.toolbarMargin - Space to reserve at top (default 50)
   * @param {number} options.bottomMargin - Space to reserve at bottom (default 50)
   */
  scrollBlockIntoView(el, { toolbarMargin = 50, bottomMargin = 50 } = {}) {
    const scrollRect = el.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const availableHeight = viewportHeight - toolbarMargin - bottomMargin;
    // Center if block fits, otherwise show top
    const blockPosition = scrollRect.height > availableHeight ? 'start' : 'center';
    el.scrollIntoView({ behavior: 'instant', block: blockPosition });
  }

  /**
   * Shared render logic for INITIAL_DATA and FORM_DATA handlers.
   * Sets _renderInProgress, disconnects MutationObserver, calls the callback,
   * and invokes afterContentRender when done.
   *
   * During INITIAL_DATA, keyboard blocking and DOM mutation waiting are
   * naturally skipped because isInlineEditing is false and pendingTransform
   * / _reRenderBlocking are unset.
   */
  _executeRender(callbackFn, afterRenderOptions = {}) {
    this._renderInProgress = true;

    // Block keyboard input during re-render to prevent keystrokes hitting
    // detached DOM elements. The re-render callback replaces innerHTML, which
    // destroys the focused element; any keystroke arriving between now and
    // afterContentRender (where focus is restored) would be lost.
    // Only block when inline editing and not already blocked by a format op.
    if (this.isInlineEditing && this.focusedFieldName && !this.blockedBlockId) {
      this._ensureDocumentKeyboardBlocker();
      this.blockedBlockId = this.selectedBlockUid;
      this._reRenderBlocking = true;
      // Save cursor position before re-render so we can restore it when
      // no transformedSelection is provided (e.g. sidebar-originated FORM_DATA).
      // Without this, the browser resets cursor to position 0 after DOM
      // replacement and buffered keystrokes replay at the wrong position.
      this._preRenderSelection = this.savedSelection;
    }

    // Disconnect MutationObserver before rendering. The framework
    // re-render will mutate DOM (text nodes, elements) and we must
    // not run handleTextChange on framework-generated mutations.
    // The observer is re-attached in afterContentRender.
    if (this.blockTextMutationObserver) {
      this.blockTextMutationObserver.disconnect();
    }

    // Call the callback to trigger the render
    // Support async callbacks (e.g., renderContentWithListings)
    const callbackResult = callbackFn(this.formData);

    const afterRender = () => {
      if (this._renderCommentObserver) {
        this._renderCommentObserver.disconnect();
        this._renderCommentObserver = null;
      }
      this.afterContentRender(afterRenderOptions);
    };

    // For async render callbacks, watch for new DOM nodes and eagerly
    // materialize hydra comments. This ensures data-block-uid attributes
    // from comment syntax are available as soon as blocks are appended,
    // rather than waiting for the entire render (including slow listing/
    // footer expansion) to complete. Safe to call repeatedly because
    // applyHydraAttributes skips existing attributes.
    if (callbackResult && typeof callbackResult.then === 'function') {
      this._renderCommentObserver = new MutationObserver(() => {
        this.materializeHydraComments();
      });
      this._renderCommentObserver.observe(document.body, { childList: true, subtree: true });
    }

    // Call afterRender after callback completes (async or sync)
    if (callbackResult && typeof callbackResult.then === 'function') {
      callbackResult.then(afterRender);
    } else {
      // Sync callback — framework may render asynchronously (Vue, React).
      // If a transform or re-render is pending, wait for the actual DOM
      // mutation before proceeding with selection restore and buffer replay.
      const blockId = this.selectedBlockUid;
      const blockEl = blockId && this.queryBlockElement(blockId);
      if (blockEl && !afterRenderOptions.skipRender && (this.pendingTransform || this._reRenderBlocking)) {
        this._waitForDomMutation(blockEl, afterRender);
      } else {
        afterRender();
      }
    }
  }

  /**
   * Waits for a DOM mutation on the given element before calling the callback.
   * Used after sync onEditChange callbacks to wait for framework re-renders
   * (Vue, React, etc.) before proceeding with selection restore and buffer replay.
   * Falls back to calling the callback after a timeout if no mutation occurs.
   */
  _waitForDomMutation(element, callback) {
    let called = false;
    const proceed = (source) => {
      if (called) return;
      called = true;
      observer.disconnect();
      log('_waitForDomMutation proceed via:', source);
      callback();
    };
    let settleRaf = null;
    const observer = new MutationObserver(() => {
      // Wait for mutations to settle: each mutation resets the wait.
      // Frameworks may patch DOM across multiple microtask cycles (e.g.,
      // Vue watchers triggering a second render pass). Proceeding after
      // one rAF with no new mutations means the framework is done.
      if (settleRaf) cancelAnimationFrame(settleRaf);
      settleRaf = requestAnimationFrame(() => proceed('mutation-settled'));
    });
    observer.observe(element, { childList: true, subtree: true, characterData: true });
    // Fallback if no mutation (e.g., data didn't change visible content)
    setTimeout(() => proceed('timeout'), 200);
  }

  /**
   * Checks if an element is hidden (display: none, visibility: hidden, or zero dimensions)
   * @param {HTMLElement} el - The element to check
   * @returns {boolean} True if the element is hidden
   */
  isElementHidden(el) {
    if (!el) return true;
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden') {
      return true;
    }
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) {
      return true;
    }
    // Check if element is translated/positioned outside its container
    // (e.g., Flowbite carousel uses translate-x-full to hide slides)
    const container = el.parentElement?.closest('[data-block-uid]');
    if (container) {
      const containerRect = container.getBoundingClientRect();
      // Element is hidden if it's completely outside the container bounds
      if (rect.right <= containerRect.left || rect.left >= containerRect.right) {
        return true;
      }
    }
    return false;
  }

  /**
   * Find the visible DOM element for a block uid.
   * When multiple elements share the same data-block-uid (e.g. listing items
   * expanded into carousel slides), querySelector returns the first which may
   * be hidden.  This method returns the first *visible* match, falling back
   * to the first match if none are visible.
   * @param {string} uid - The block uid to search for
   * @returns {HTMLElement|null}
   */
  queryBlockElement(uid) {
    const all = document.querySelectorAll(`[data-block-uid="${uid}"]`);
    if (all.length === 0) return null;
    if (all.length === 1) return all[0];
    for (const el of all) {
      if (!this.isElementHidden(el)) return el;
    }
    return all[0];
  }

  /**
   * Tries to make a block visible by clicking data-block-selector elements.
   * First looks for a direct selector (data-block-selector="{uid}"),
   * then tries +1/-1 navigation to reach the target block.
   * @param {string} targetUid - The UID of the block to make visible
   * @returns {boolean} True if a selector was clicked (block may now be visible)
   */
  tryMakeBlockVisible(targetUid) {
    log(`tryMakeBlockVisible: ${targetUid}`);
    // Set flag to prevent handleBlockSelector from interfering
    this._navigatingToBlock = targetUid;
    // First, try direct selector: data-block-selector="{targetUid}"
    const directSelector = document.querySelector(
      `[data-block-selector="${targetUid}"]`,
    );
    // Click the appropriate selector to navigate toward the target block.
    // For direct selectors (data-block-selector="{uid}"), one click suffices.
    // For +1/-1 selectors, we click once and may recurse if more steps are needed.
    let clickedSelector = null;
    let nextUid = targetUid; // UID we expect to become visible after one click

    if (directSelector) {
      log(`tryMakeBlockVisible: found direct selector for ${targetUid}`);
      clickedSelector = directSelector;
    } else {
      // No direct selector - try +1/-1 navigation
      log(`tryMakeBlockVisible: no direct selector, trying +1/-1 navigation`);

      const targetElement = this.queryBlockElement(targetUid);
      if (!targetElement) {
        log(`tryMakeBlockVisible: target element not in DOM`);
        return false;
      }

      const containerBlock = targetElement.parentElement?.closest('[data-block-uid]');
      if (!containerBlock) {
        log(`tryMakeBlockVisible: no container block found`);
        return false;
      }
      const containerUid = containerBlock.getAttribute('data-block-uid');

      const directParent = targetElement.parentElement;
      if (!directParent) {
        log(`tryMakeBlockVisible: no parent element`);
        return false;
      }

      const siblings = Array.from(
        directParent.querySelectorAll(':scope > [data-block-uid]'),
      );
      log(`tryMakeBlockVisible: found ${siblings.length} siblings in container ${containerUid}`);

      const targetIndex = siblings.findIndex(
        (el) => el.getAttribute('data-block-uid') === targetUid,
      );
      if (targetIndex === -1) {
        log(`tryMakeBlockVisible: target not in siblings`);
        return false;
      }

      const currentIndex = siblings.findIndex((el) => !this.isElementHidden(el));
      const currentUid = currentIndex >= 0 ? siblings[currentIndex].getAttribute('data-block-uid') : null;
      log(`tryMakeBlockVisible: currentIndex=${currentIndex} (${currentUid}), targetIndex=${targetIndex}`);

      if (currentIndex === -1) {
        log(`tryMakeBlockVisible: no visible sibling`);
        return false;
      }

      const stepsNeeded = targetIndex - currentIndex;
      if (stepsNeeded === 0) {
        log(`tryMakeBlockVisible: already at target`);
        return false;
      }

      const direction = stepsNeeded > 0 ? '+1' : '-1';

      const explicitSelector = document.querySelector(
        `[data-block-selector="${currentUid}:${direction}"]`,
      );
      if (explicitSelector) {
        log(`tryMakeBlockVisible: found explicit selector ${currentUid}:${direction}`);
        clickedSelector = explicitSelector;
      } else {
        const simpleSelector = containerBlock.querySelector(
          `[data-block-selector="${direction}"]`,
        );
        if (simpleSelector) {
          log(`tryMakeBlockVisible: found simple selector ${direction} inside container`);
          clickedSelector = simpleSelector;
        }
      }

      if (!clickedSelector) {
        log(`tryMakeBlockVisible: no ${direction} selector found`);
        return false;
      }

      // For +1/-1, the next visible block is one step from current
      const nextIndex = currentIndex + (stepsNeeded > 0 ? 1 : -1);
      const nextBlock = siblings[nextIndex];
      nextUid = nextBlock?.getAttribute('data-block-uid');
      log(`tryMakeBlockVisible: clicking ${direction}, expecting ${nextUid} to become visible`);
    }

    // Click the selector and wait for nextUid to become visible
    clickedSelector.click();
    log(`tryMakeBlockVisible: click() called`);

    const startTime = performance.now();
    const MAX_WAIT_MS = 2000;

    const checkVisibility = () => {
      const elapsed = performance.now() - startTime;
      const currentNextBlock = this.queryBlockElement(nextUid);

      if (elapsed > 0 && Math.floor(elapsed / 500) !== Math.floor((elapsed - 16) / 500)) {
        if (currentNextBlock) {
          const rect = currentNextBlock.getBoundingClientRect();
          const container = currentNextBlock.parentElement?.closest('[data-block-uid]');
          const containerRect = container?.getBoundingClientRect();
          log(`tryMakeBlockVisible debug: rect=${Math.round(rect.width)}x${Math.round(rect.height)} left=${Math.round(rect.left)} containerLeft=${containerRect ? Math.round(containerRect.left) : 'none'} containerRight=${containerRect ? Math.round(containerRect.right) : 'none'}`);
        } else {
          log(`tryMakeBlockVisible debug: element not found in DOM`);
        }
      }

      if (currentNextBlock && !this.isElementHidden(currentNextBlock)) {
        log(`tryMakeBlockVisible: ${nextUid} is now visible after ${Math.round(elapsed)}ms`);
        if (nextUid === targetUid) {
          log(`tryMakeBlockVisible: reached target ${targetUid}`);
          this._navigatingToBlock = null;
          return;
        }
        // Need more clicks - recurse
        log(`tryMakeBlockVisible: not at target yet, continuing navigation`);
        this.tryMakeBlockVisible(targetUid);
        return;
      }

      if (elapsed < MAX_WAIT_MS) {
        requestAnimationFrame(checkVisibility);
      } else {
        log(`tryMakeBlockVisible: timeout waiting for ${nextUid} after ${Math.round(elapsed)}ms`);
        this._navigatingToBlock = null;
      }
    };

    // Start checking on next frame (after click event has propagated)
    requestAnimationFrame(checkVisibility);
    return true;
  }

  /**
   * Collects all editable fields from a block element.
   * For multi-element blocks, searches ALL elements with the same UID.
   * @returns {Object} Map of field names to their types
   */
  getEditableFields(blockElement) {
    if (!blockElement) return {};
    const blockUid = blockElement.getAttribute('data-block-uid');
    return this.collectBlockFields(blockElement, 'data-edit-text',
      (el, name, results) => { results[name] = this.getFieldType(blockUid, name) || 'string'; });
  }

  /**
   * Observe the DOM for the changes to select and scroll the block with the given UID into view
   * @param {String} uid - UID of the block
   */
  observeForBlock(uid) {
    if (this.blockObserver) this.blockObserver.disconnect();
    this.blockObserver = new MutationObserver((mutationsList, observer) => {
      for (const mutation of mutationsList) {
        if (mutation.type === 'childList') {
          const blockElement = document.querySelector(
            `[data-block-uid="${uid}"]`,
          );

          if (blockElement && this.isInlineEditing) {
            this.selectBlock(blockElement);
            !this.elementIsVisibleInViewport(blockElement, true) &&
              blockElement.scrollIntoView({ behavior: 'smooth' });
            observer.disconnect();
            return;
          }
        }
      }
    });

    this.blockObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  ////////////////////////////////////////////////////////////////////////////////
  // Adding NodeIds in Slate Block's Json
  ////////////////////////////////////////////////////////////////////////////////

  /**
   * Add nodeIds to all Slate fields in all blocks (including nested)
   * Uses blockPathMap to find all blocks, including those in containers
   */
  addNodeIdsToAllSlateFields() {
    if (!this.formData) return;

    if (!this.blockPathMap) {
      throw new Error('[HYDRA] blockPathMap is required but was not provided by admin');
    }

    // Debug: log all blocks in blockPathMap and formData.blocks
    const pathMapBlocks = Object.keys(this.blockPathMap);
    const formDataBlocks = Object.keys(this.formData.blocks || {});
    const missingFromPathMap = formDataBlocks.filter(id => !pathMapBlocks.includes(id));
    log('addNodeIdsToAllSlateFields: pathMap has', pathMapBlocks.length, 'blocks, formData has', formDataBlocks.length, 'blocks, missing:', missingFromPathMap.length > 0 ? missingFromPathMap : 'none');

    Object.entries(this.blockPathMap).forEach(([blockId, pathInfo]) => {
      const block = this.getBlockData(blockId);
      if (!block) return;

      const schema = pathInfo.resolvedBlockSchema;
      if (!schema?.properties) return;

      Object.entries(schema.properties).forEach(([fieldName, fieldDef]) => {
        if (isSlateFieldType(getFieldTypeString(fieldDef)) && block[fieldName]) {
          block[fieldName] = this.addNodeIds(block[fieldName]);
        }
      });
    });
  }

  /**
   * Add path-based nodeIds to each element in the Slate block's children
   * @param {JSON} json Selected Block's data
   * @param {string} path Path in the Slate structure (e.g., "0.1.2")
   * @returns {JSON} block's data with nodeIds added
   */
  addNodeIds(json, path = '') {
    if (Array.isArray(json)) {
      return json.map((item, index) => {
        const itemPath = path ? `${path}.${index}` : `${index}`;
        return this.addNodeIds(item, itemPath);
      });
    } else if (typeof json === 'object' && json !== null) {
      // Clone the object to ensure it's extensible
      json = JSON.parse(JSON.stringify(json));

      // Skip text-only nodes - they shouldn't have nodeIds
      // A proper Slate text node has 'text' but NO 'children' and NO 'type'
      // Note: Some malformed data might have both 'text' AND 'children' on element nodes
      // (like li) - these should be treated as elements, not text nodes
      const isTextNode = json.hasOwnProperty('text') &&
                         !json.hasOwnProperty('children') &&
                         !json.hasOwnProperty('type');
      if (isTextNode) {
        return json;
      }

      // Assign path-based nodeId to this element
      json.nodeId = path;

      // Only process children array - don't recurse into metadata like 'data'
      if (json.children && Array.isArray(json.children)) {
        json.children = json.children.map((child, index) => {
          const childPath = `${path}.${index}`;
          return this.addNodeIds(child, childPath);
        });
      }
    }
    return json;
  }

  /**
   * Save current cursor/selection position
   * @returns {Object|null} Saved cursor state or null if no selection
   */
  saveCursorPosition() {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      return null;
    }

    try {
      const range = selection.getRangeAt(0);
      const startContainer = range.startContainer;
      const endContainer = range.endContainer;

      // Find the closest element with data-node-id for both start and end
      const startElement = startContainer.nodeType === Node.TEXT_NODE
        ? startContainer.parentElement
        : startContainer;
      const endElement = endContainer.nodeType === Node.TEXT_NODE
        ? endContainer.parentElement
        : endContainer;

      const startNode = startElement?.closest('[data-node-id]');
      const endNode = endElement?.closest('[data-node-id]');

      if (!startNode || !endNode) {
        return null;
      }

      return {
        startNodeId: startNode.getAttribute('data-node-id'),
        endNodeId: endNode.getAttribute('data-node-id'),
        startOffset: range.startOffset,
        endOffset: range.endOffset,
        isCollapsed: range.collapsed,
      };
    } catch (e) {
      console.error('[HYDRA] Error saving cursor position:', e);
      return null;
    }
  }

  /**
   * Restore cursor/selection position
   * @param {Object|null} savedCursor Saved cursor state from saveCursorPosition()
   */
  restoreCursorPosition(savedCursor) {
    if (!savedCursor) {
      return;
    }

    try {
      // Scope to current block to avoid selecting wrong element when multiple blocks visible
      const blockElement = this.selectedBlockUid
        ? this.queryBlockElement(this.selectedBlockUid)
        : document;
      const startNode = blockElement?.querySelector(`[data-node-id="${savedCursor.startNodeId}"]`);
      const endNode = blockElement?.querySelector(`[data-node-id="${savedCursor.endNodeId}"]`);

      if (!startNode || !endNode) {
        return;
      }

      // Get the text nodes inside the elements
      const startTextNode = startNode.childNodes[0] || startNode;
      const endTextNode = endNode.childNodes[0] || endNode;

      const range = document.createRange();
      const selection = window.getSelection();

      // Ensure offsets are within bounds
      const startOffset = Math.min(savedCursor.startOffset, startTextNode.textContent?.length || 0);
      const endOffset = Math.min(savedCursor.endOffset, endTextNode.textContent?.length || 0);

      range.setStart(startTextNode, startOffset);
      range.setEnd(endTextNode, endOffset);

      selection?.removeAllRanges();
      selection?.addRange(range);
    } catch (e) {
      console.error('[HYDRA] Error restoring cursor position:', e);
    }
  }

  /**
   * Restore cursor/selection from Slate selection format
   * @param {Object} slateSelection - Slate selection object with anchor and focus
   * @param {Object} formData - Form data with Slate JSON (containing nodeIds)
   */
  /**
   * Restore cursor/selection from Slate selection format.
   * @param {Object} slateSelection - Slate selection object with anchor and focus
   * @param {Object} formData - Form data with Slate JSON (containing nodeIds)
   * @returns {Promise<boolean>} true if selection was restored, false if it failed
   */
  async restoreSlateSelection(slateSelection, formData) {
    log('restoreSlateSelection called with:', JSON.stringify(slateSelection));
    if (!slateSelection || !slateSelection.anchor || !slateSelection.focus) {
      console.warn('[HYDRA] restoreSlateSelection failed: invalid selection', slateSelection);
      return false;
    }

    try {
      // Find the selected block and determine field type
      if (!this.selectedBlockUid || !this.focusedFieldName) {
        log('restoreSlateSelection failed: missing selectedBlockUid or focusedFieldName');
        return false;
      }

      // Use getBlockData to handle nested blocks (formData.blocks[uid] only works for top-level)
      const block = this.getBlockData(this.selectedBlockUid);
      if (!block) {
        log('restoreSlateSelection failed: block not found', this.selectedBlockUid);
        return false;
      }

      // Resolve field path and get field type (supports page-level and nested blocks)
      const resolved = this.resolveFieldPath(this.focusedFieldName, this.selectedBlockUid);
      const fieldData = this.getBlockData(resolved.blockId);
      const fieldType = this.getFieldType(this.selectedBlockUid, this.focusedFieldName);
      const fieldValue = fieldData?.[resolved.fieldName];

      // Find the block element for locating editable fields
      const blockElement = this.queryBlockElement(this.selectedBlockUid);
      if (!blockElement) {
        log('restoreSlateSelection failed: block element not in DOM', this.selectedBlockUid);
        return false;
      }

      // Check if this is a slate field with nodeIds
      const isSlateWithNodeIds = this.fieldTypeIsSlate(fieldType) && Array.isArray(fieldValue) && fieldValue.length > 0 && fieldValue[0]?.nodeId !== undefined;

      let anchorElement, focusElement;
      let anchorPos = null;
      let focusPos = null;

      let anchorOffset = slateSelection.anchor.offset;
      let focusOffset = slateSelection.focus.offset;

      if (isSlateWithNodeIds) {
        // Find the parent elements by nodeId from path
        const anchorResult = this.getNodeIdFromPath(fieldValue, slateSelection.anchor.path);
        const focusResult = this.getNodeIdFromPath(fieldValue, slateSelection.focus.path);

        if (!anchorResult || !focusResult) {
          console.warn('[HYDRA] restoreSlateSelection failed: could not get nodeId from path');
          return false;
        }

        // Scope to current block to avoid selecting wrong element when multiple blocks visible
        anchorElement = blockElement.querySelector(`[data-node-id="${anchorResult.nodeId}"]`);
        focusElement = blockElement.querySelector(`[data-node-id="${focusResult.nodeId}"]`);

        // If elements not found, DOM may not be ready yet (async framework render)
        // Wait and retry — afterContentRender awaits us, so buffer replay won't
        // run until we finish and the selection is actually restored.
        if (!anchorElement || !focusElement) {
          log('restoreSlateSelection: nodeId elements not found, waiting for DOM');
          await new Promise(resolve => setTimeout(resolve, 50));
          anchorElement = blockElement.querySelector(`[data-node-id="${anchorResult.nodeId}"]`);
          focusElement = blockElement.querySelector(`[data-node-id="${focusResult.nodeId}"]`);
          if (!anchorElement || !focusElement) {
            console.warn('[HYDRA] restoreSlateSelection failed: nodeId elements not found after retry',
              { anchorNodeId: anchorResult.nodeId, focusNodeId: focusResult.nodeId });
            return false;
          }
          log('restoreSlateSelection: elements found after retry');
        }

        log('restoreSlateSelection: looking for nodeIds', {
          anchorNodeId: anchorResult.nodeId,
          focusNodeId: focusResult.nodeId,
          anchorElementFound: !!anchorElement,
          focusElementFound: !!focusElement,
          anchorElementTag: anchorElement?.tagName,
          focusElementTag: focusElement?.tagName,
          anchorElementHTML: anchorElement?.outerHTML?.substring(0, 100),
        });

        if (!anchorElement || !focusElement) {
          console.warn('[HYDRA] restoreSlateSelection failed: could not find elements by nodeId');
          return false;
        }

        // Helper to create ZWS position for cursor placement.
        // Handles Problem 3 (prospective formatting) in the ZWS strategy.
        // See "Whitespace & Zero-Width Space (ZWS) Strategy" comment block.
        const ensureZwsPosition = (result, offset, parentChildren) => {
          // Case 1: Cursor exit - offset 0 in text after an inline element
          // When there's existing text after the inline element, DON'T create ZWS or position at offset 0.
          // This avoids the browser creating a new text node when typing at offset 0.
          // Instead, return null to let findPositionByVisibleOffset handle it naturally.
          if (result.textChildIndex !== null && offset === 0 && result.textChildIndex > 0) {
            const prevChild = parentChildren[result.textChildIndex - 1];
            if (prevChild && prevChild.type && prevChild.nodeId) {
              const inlineElement = blockElement.querySelector(`[data-node-id="${prevChild.nodeId}"]`);
              if (inlineElement) {
                // Check if there's already a text node after the inline element
                const existingTextNode = inlineElement.nextSibling;
                log('restoreSlateSelection: cursor exit check - inlineElement.nextSibling:', existingTextNode?.nodeType, 'text:', JSON.stringify(existingTextNode?.textContent));
                if (existingTextNode && existingTextNode.nodeType === Node.TEXT_NODE) {
                  const existingText = existingTextNode.textContent.replace(/[\uFEFF\u200B]/g, '');
                  if (existingText.length > 0) {
                    // There's existing text - prepend ZWS to it and position after the ZWS
                    // This ensures typing modifies this text node rather than creating a new one
                    if (!existingTextNode.textContent.startsWith('\uFEFF')) {
                      existingTextNode.textContent = '\uFEFF' + existingTextNode.textContent;
                    }
                    log('restoreSlateSelection: cursor exit - prepended ZWS to existing text, positioning after ZWS');
                    return { node: existingTextNode, offset: 1 };
                  }
                }
                // No existing text or empty text - create ZWS text node right after the inline element
                const zwsNode = document.createTextNode('\uFEFF');
                inlineElement.parentNode.insertBefore(zwsNode, inlineElement.nextSibling);
                log('restoreSlateSelection: cursor exit - created ZWS after inline:', prevChild.nodeId);
                return { node: zwsNode, offset: 1 }; // Position after ZWS
              }
            }
          }

          // Case 2: Prospective formatting - offset 0 inside an empty inline element
          const targetElement = blockElement.querySelector(`[data-node-id="${result.nodeId}"]`);
          if (targetElement && offset === 0) {
            const visibleText = targetElement.textContent.replace(/[\uFEFF\u200B]/g, '');
            if (visibleText === '') {
              // Empty inline - add ZWS inside and position after it
              const zwsNode = document.createTextNode('\uFEFF');
              targetElement.appendChild(zwsNode);
              log('restoreSlateSelection: prospective formatting - created ZWS inside empty inline:', result.nodeId);
              // Track this as the active prospective inline (for handling Chrome's cursor-outside-anchor quirk)
              this.prospectiveInlineElement = targetElement;
              return { node: zwsNode, offset: 1 }; // Position after ZWS
            }
          }

          return null; // Not a ZWS case, use normal positioning
        };

        // Try ZWS positioning first
        if (anchorResult.parentChildren) {
          anchorPos = ensureZwsPosition(anchorResult, slateSelection.anchor.offset, anchorResult.parentChildren);
        }
        if (focusResult.parentChildren) {
          focusPos = ensureZwsPosition(focusResult, slateSelection.focus.offset, focusResult.parentChildren);
        }

        // Fall back to offset calculation for non-ZWS cases
        if (!anchorPos) {
          if (anchorResult.textChildIndex !== null && anchorResult.parentChildren) {
            anchorOffset = this.calculateAbsoluteOffset(
              anchorResult.parentChildren,
              anchorResult.textChildIndex,
              slateSelection.anchor.offset
            );
            log('Calculated absolute anchor offset:', anchorOffset, 'from textChildIndex:', anchorResult.textChildIndex);
          }
          anchorPos = this.findPositionByVisibleOffset(anchorElement, anchorOffset);
        }
        if (!focusPos) {
          if (focusResult.textChildIndex !== null && focusResult.parentChildren) {
            focusOffset = this.calculateAbsoluteOffset(
              focusResult.parentChildren,
              focusResult.textChildIndex,
              slateSelection.focus.offset
            );
            log('Calculated absolute focus offset:', focusOffset, 'from textChildIndex:', focusResult.textChildIndex);
          }
          focusPos = this.findPositionByVisibleOffset(focusElement, focusOffset);
        }
      } else {
        // Simple field - use the editable field directly
        const editableField = this.getEditableFieldByName(blockElement, this.focusedFieldName);
        if (!editableField) {
          console.warn('[HYDRA] restoreSlateSelection failed: editable field not found:', this.focusedFieldName);
          return false;
        }
        anchorElement = focusElement = editableField;
        // For simple fields, use findPositionByVisibleOffset
        anchorPos = this.findPositionByVisibleOffset(anchorElement, anchorOffset);
        focusPos = this.findPositionByVisibleOffset(focusElement, focusOffset);
      }


      if (!anchorPos || !focusPos) {
        console.warn('[HYDRA] restoreSlateSelection failed: could not find positions by visible offset');
        return false;
      }

      // Set the actual selection
      const selection = window.getSelection();
      if (!selection) return false;

      // Focus the contenteditable element BEFORE setting selection
      // After re-render, focus goes to BODY - we need to restore it
      const editableElement = anchorElement.closest('[contenteditable="true"]') || anchorElement;
      if (editableElement && typeof editableElement.focus === 'function') {
        editableElement.focus();
      }

      const range = document.createRange();
      range.setStart(anchorPos.node, anchorPos.offset);
      range.setEnd(focusPos.node, focusPos.offset);

      selection.removeAllRanges();
      selection.addRange(range);
      return true;

    } catch (e) {
      console.error('[HYDRA] restoreSlateSelection failed with error:', e);
      return false;
    }
  }

  /**
   * Find DOM position (node + offset) by visible character offset.
   * Uses Range.toString().length to match the browser's text model,
   * which naturally handles empty text nodes, whitespace normalization, etc.
   *
   * @param {HTMLElement} element - Element to search within
   * @param {number} targetOffset - Target character offset in visible text
   * @returns {{node: Node, offset: number}|null} DOM position or null
   */
  findPositionByVisibleOffset(element, targetOffset) {
    const zwsPattern = /[\uFEFF\u200B]/g;

    // Helper to count visible chars (excluding ZWS)
    const visibleLength = (text) => text.replace(zwsPattern, '').length;

    log('findPositionByVisibleOffset: element=', element.tagName, 'nodeId=', element.getAttribute('data-node-id'), 'targetOffset=', targetOffset);

    // Handle offset 0 - return start of first text node
    if (targetOffset === 0) {
      const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null, false);
      let firstText = walker.nextNode();
      // Skip empty text nodes (Vue/Nuxt renders {{ node.text }} as empty text nodes)
      while (firstText && firstText.textContent.length === 0) {
        log('findPositionByVisibleOffset: offset=0, skipping empty text node');
        firstText = walker.nextNode();
      }
      if (firstText) {
        // If this is a ZWS-only text node, position AFTER the ZWS
        // This helps browsers preserve the cursor inside inline elements when typing
        if (visibleLength(firstText.textContent) === 0) {
          log('findPositionByVisibleOffset: offset=0, ZWS-only node, returning end:', firstText.textContent.length);
          return { node: firstText, offset: firstText.textContent.length };
        }
        log('findPositionByVisibleOffset: offset=0, returning start of first text');
        return { node: firstText, offset: 0 };
      }
      return null;
    }

    // Walk through text nodes, counting visible chars (excluding ZWS)
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null, false);
    let visibleOffset = 0;
    let node;
    let nodeIndex = 0;

    while ((node = walker.nextNode())) {
      const text = node.textContent;
      const nodeVisibleLen = visibleLength(text);
      log('findPositionByVisibleOffset: node[' + nodeIndex + ']:', {
        text: JSON.stringify(text),
        visibleLen: nodeVisibleLen,
        visibleOffset,
        parentTag: node.parentElement?.tagName,
        parentNodeId: node.parentElement?.getAttribute('data-node-id'),
      });
      nodeIndex++;

      // Count visible chars in this node
      for (let i = 0; i <= text.length; i++) {
        const visibleCharsUpToI = visibleLength(text.substring(0, i));
        const totalVisible = visibleOffset + visibleCharsUpToI;

        if (totalVisible === targetOffset) {
          // If we're at the END of this text node, check if there's a next text node
          if (i === text.length) {
            let nextNode = walker.nextNode();
            // Skip empty text nodes (Vue/Nuxt renders empty text nodes)
            while (nextNode && nextNode.textContent.length === 0) {
              log('findPositionByVisibleOffset: at end of node, skipping empty nextNode');
              nextNode = walker.nextNode();
            }
            if (nextNode) {
              // Prefer start of next text node (for cursor exit from inline elements)
              // BUT if nextNode is ZWS-only, position AFTER the ZWS (offset = length)
              // This ensures cursor is clearly inside the ZWS text node, not at boundary
              const nextVisibleLen = visibleLength(nextNode.textContent);
              if (nextVisibleLen === 0 && nextNode.textContent.length > 0) {
                // ZWS-only node - position after the ZWS
                log('findPositionByVisibleOffset: at end of node, nextNode is ZWS, positioning AFTER ZWS');
                return { node: nextNode, offset: nextNode.textContent.length };
              }
              log('findPositionByVisibleOffset: at end of node, preferring next node');
              return { node: nextNode, offset: 0 };
            }
            walker.currentNode = node;
          }
          log('findPositionByVisibleOffset: FOUND at node offset', i);
          return { node, offset: i };
        }

        if (totalVisible > targetOffset) {
          // We've passed it - return previous position
          log('findPositionByVisibleOffset: PASSED target, returning', i - 1);
          return i > 0 ? { node, offset: i - 1 } : null;
        }
      }
      visibleOffset += nodeVisibleLen;
    }

    // If we exhausted all nodes, return end of last NON-EMPTY text node
    // Vue/Nuxt creates empty text nodes ("") at the end, so we skip those
    const lastWalker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null, false);
    let lastNonEmptyNode = null;
    while ((node = lastWalker.nextNode())) {
      if (node.textContent.length > 0) {
        lastNonEmptyNode = node;
      }
    }
    if (lastNonEmptyNode) {
      log('findPositionByVisibleOffset: exhausted nodes, returning end of last non-empty node');
      return { node: lastNonEmptyNode, offset: lastNonEmptyNode.textContent.length };
    }

    return null;
  }

  /**
   * Find DOM child node at a given Slate child index.
   *
   * Walks through parentElement.childNodes counting Slate children:
   * - Text nodes count as 1 Slate child
   * - Elements with data-node-id count as 1 Slate child
   * - Elements with SAME data-node-id as previous are skipped (they're wrappers)
   *
   * This allows renderers to add wrapper elements as long as they have the same node-id.
   *
   * @param {HTMLElement} parentElement - The parent element to search within
   * @param {number} slateChildIndex - The Slate child index to find
   * @returns {Node|null} The DOM node at that Slate index, or null if not found
   */
  findChildBySlateIndex(parentElement, slateChildIndex) {
    let slateIndex = 0;
    let lastNodeId = null;

    for (const child of parentElement.childNodes) {
      if (child.nodeType === Node.TEXT_NODE) {
        // Skip empty text nodes - Vue creates these from {{ node.text }} when undefined
        // They don't correspond to any Slate children
        if (child.textContent.length === 0) {
          continue;
        }
        if (slateIndex === slateChildIndex) {
          return child;
        }
        slateIndex++;
        lastNodeId = null;
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        const nodeId = child.getAttribute('data-node-id');
        if (nodeId && nodeId !== lastNodeId) {
          // New node-id element = new Slate child
          if (slateIndex === slateChildIndex) {
            return child;
          }
          slateIndex++;
          lastNodeId = nodeId;
        }
        // Elements without node-id or with same node-id are skipped (wrappers)
      }
    }
    return null;
  }

  /**
   * Find text node and validate offset within a DOM child (text node or element)
   * For text nodes: returns the node directly
   * For elements: walks to find the first text node within
   *
   * @param {Node} child - DOM node (text node or element)
   * @param {number} offset - Offset within the text content
   * @returns {{node: Text, offset: number}|null} Text node and validated offset, or null
   */
  findTextNodeInChild(child, offset) {
    // Helper to check if a text node is empty (has no visible content)
    // Vue/Nuxt creates empty text nodes from {{ node.text }} when text is undefined
    const isEmptyTextNode = (textNode) => {
      return textNode.textContent.length === 0;
    };

    // Helper to adjust offset for ZWS-only text nodes
    // If offset is 0 in a ZWS-only node, position AFTER the ZWS
    // This helps browsers preserve the cursor inside inline elements when typing
    const adjustOffsetForZWS = (textNode, requestedOffset) => {
      const zwsPattern = /^[\uFEFF\u200B]+$/;
      if (requestedOffset === 0 && zwsPattern.test(textNode.textContent)) {
        log('findTextNodeInChild: ZWS node detected, positioning after ZWS');
        return textNode.textContent.length;
      }
      return Math.min(requestedOffset, textNode.textContent.length);
    };

    if (child.nodeType === Node.TEXT_NODE) {
      // Direct text node - skip if empty
      if (isEmptyTextNode(child)) {
        return null;
      }
      const validOffset = adjustOffsetForZWS(child, offset);
      return { node: child, offset: validOffset };
    }

    if (child.nodeType === Node.ELEMENT_NODE) {
      // Element node - find the first NON-EMPTY text node within
      const walker = document.createTreeWalker(
        child,
        NodeFilter.SHOW_TEXT,
        null,
        false
      );

      let textNode = walker.nextNode();
      // Skip empty text nodes (Vue artifact from {{ node.text }} when undefined)
      while (textNode && isEmptyTextNode(textNode)) {
        textNode = walker.nextNode();
      }
      if (textNode) {
        const validOffset = adjustOffsetForZWS(textNode, offset);
        return { node: textNode, offset: validOffset };
      }
    }

    return null;
  }

  /**
   * Get nodeId from a Slate path by walking the tree
   * @param {Array} slateValue - Slate document value
   * @param {Array} path - Path array from Slate selection
   * @returns {{nodeId: string, textChildIndex: number|null, parentChildren: Array|null}|null}
   *          Returns object with nodeId, and for text nodes: child index and parent's children array
   */
  getNodeIdFromPath(slateValue, path) {
    let node = slateValue;
    let parentNode = null;
    let lastIndex = null;

    // Walk the path
    for (let i = 0; i < path.length; i++) {
      const index = path[i];

      parentNode = node;
      lastIndex = index;

      if (Array.isArray(node)) {
        node = node[index];
      } else if (node.children) {
        node = node.children[index];
      } else {
        console.warn('[HYDRA] Could not follow path:', path, 'at index', i);
        return null;
      }

      if (!node) {
        console.warn('[HYDRA] Node not found at path:', path, 'index', i);
        return null;
      }
    }

    // If this is a text node (has 'text' property), use the parent element's nodeId
    // Text nodes don't have nodeIds in the DOM - only element nodes do
    // Also return the child index so we can calculate absolute offset
    if (node.hasOwnProperty('text') && parentNode && parentNode.nodeId) {
      log('Path points to text node at index', lastIndex, 'using parent nodeId:', parentNode.nodeId);
      return {
        nodeId: parentNode.nodeId,
        textChildIndex: lastIndex,
        parentChildren: parentNode.children || null,
      };
    }

    // Return the nodeId if it exists (not a text node, no child info needed)
    return node.nodeId ? { nodeId: node.nodeId, textChildIndex: null, parentChildren: null } : null;
  }

  /**
   * Calculate absolute character offset for a text node within its parent
   * Used for selection restoration when Slate path points to a specific child
   * @param {Array} children - Parent's children array
   * @param {number} childIndex - Index of the target text node child
   * @param {number} offsetWithinChild - Character offset within the target child
   * @returns {number} Absolute character offset from start of parent's text
   */
  calculateAbsoluteOffset(children, childIndex, offsetWithinChild) {
    let absoluteOffset = 0;

    for (let i = 0; i < childIndex; i++) {
      const child = children[i];
      absoluteOffset += this.getTextLength(child);
    }

    return absoluteOffset + offsetWithinChild;
  }

  /**
   * Get total text length of a Slate node recursively
   * @param {Object} node - Slate node
   * @returns {number} Total text length
   */
  getTextLength(node) {
    if (node.hasOwnProperty('text')) {
      return node.text.length;
    }
    if (node.children) {
      return node.children.reduce((sum, child) => sum + this.getTextLength(child), 0);
    }
    return 0;
  }

  /**
   * Remove the nodeIds from the JSON object
   * @param {JSON} json Selected Block's data
   */
  resetJsonNodeIds(json) {
    if (Array.isArray(json)) {
      json.forEach((item) => this.resetJsonNodeIds(item));
    } else if (typeof json === 'object' && json !== null) {
      if (json.hasOwnProperty('nodeId')) {
        delete json.nodeId;
      }
      for (const key in json) {
        if (json.hasOwnProperty(key) && key !== 'data') {
          this.resetJsonNodeIds(json[key]);
        }
      }
    }
  }

  /**
   * Get formData with nodeIds stripped for sending to Admin UI
   * NodeIds are internal to hydra.js for DOM<->Slate translation
   * @returns {Object} Deep copy of formData without nodeIds
   */
  getFormDataWithoutNodeIds() {
    const formDataCopy = JSON.parse(JSON.stringify(this.formData));

    // Strip nodeIds from slate fields only (value arrays in slate blocks)
    const stripNodeIdsFromSlateFields = (blocks) => {
      if (!blocks || typeof blocks !== 'object') return;
      for (const blockId of Object.keys(blocks)) {
        const block = blocks[blockId];
        const pathInfo = this.blockPathMap?.[blockId];
        const schema = pathInfo?.resolvedBlockSchema;
        if (block && schema?.properties) {
          for (const [fieldName, fieldDef] of Object.entries(schema.properties)) {
            if (isSlateFieldType(getFieldTypeString(fieldDef)) && block[fieldName]) {
              this.resetJsonNodeIds(block[fieldName]);
            }
          }
          // Also check nested blocks in container fields
          if (block.blocks) {
            stripNodeIdsFromSlateFields(block.blocks);
          }
        }
      }
    };

    if (formDataCopy.blocks) {
      stripNodeIdsFromSlateFields(formDataCopy.blocks);
    }
    return formDataCopy;
  }

  /**
   * Compare focused field value between two formData objects
   * @param {Object} formDataA - First formData object (old/current, may have nodeIds)
   * @param {Object} formDataB - Second formData object (new/incoming, no nodeIds)
   * @returns {boolean} True if values are equal (ignoring nodeIds)
   */
  focusedFieldValuesEqual(formDataA, formDataB) {
    // selectedBlockUid is PAGE_BLOCK_UID for page-level fields, so only check focusedFieldName
    if (!this.focusedFieldName) {
      return true; // No focused field to compare
    }

    // Resolve field path to handle page-level fields (e.g., /title)
    const resolved = this.resolveFieldPath(this.focusedFieldName, this.selectedBlockUid);

    let fieldA, fieldB;
    if (resolved.blockId === PAGE_BLOCK_UID) {
      // Page-level field - compare directly on formData
      fieldA = formDataA?.[resolved.fieldName];
      fieldB = formDataB?.[resolved.fieldName];
      log('focusedFieldValuesEqual (page-level):', fieldA === fieldB, 'field:', resolved.fieldName, 'A:', fieldA, 'B:', fieldB);
      return fieldA === fieldB;
    }

    // Block field - use blockPathMap to find nested blocks (object_list items, etc.)
    const pathInfo = this.blockPathMap?.[resolved.blockId];
    let blockA, blockB;
    if (pathInfo?.path) {
      // Navigate path in both formData objects
      blockA = formDataA;
      blockB = formDataB;
      for (const key of pathInfo.path) {
        blockA = blockA?.[key];
        blockB = blockB?.[key];
      }
    } else {
      // Fallback to top-level lookup
      blockA = formDataA?.blocks?.[resolved.blockId];
      blockB = formDataB?.blocks?.[resolved.blockId];
    }
    if (!blockA || !blockB) {
      return false; // Can't find block - assume not equal (safe default)
    }
    // Deep copy and strip nodeIds before comparing (old formData has nodeIds, incoming doesn't)
    fieldA = blockA[resolved.fieldName];
    fieldB = blockB[resolved.fieldName];
    if (fieldA === undefined || fieldB === undefined) {
      return fieldA === fieldB;
    }
    const copyA = JSON.parse(JSON.stringify(fieldA));
    const copyB = JSON.parse(JSON.stringify(fieldB));
    this.resetJsonNodeIds(copyA);
    this.resetJsonNodeIds(copyB);
    const strA = JSON.stringify(copyA);
    const strB = JSON.stringify(copyB);
    const isEqual = strA === strB;
    log('focusedFieldValuesEqual:', isEqual, 'A:', strA.substring(0, 100), 'B:', strB.substring(0, 100));
    return isEqual;
  }

  /**
   * Get the field type for a given block and field name
   * @param {string} blockUid - The block UID
   * @param {string} fieldName - The field name (e.g., 'value', 'text', '/title' for page-level)
   * @returns {string|undefined} Field type in "type:widget" format (e.g., 'array:slate', 'string:textarea', 'string') or undefined
   */
  getFieldType(blockUid, fieldName) {
    const resolved = this.resolveFieldPath(fieldName, blockUid);
    const pathInfo = this.blockPathMap?.[resolved.blockId];
    const schema = pathInfo?.resolvedBlockSchema;
    const fieldDef = schema?.properties?.[resolved.fieldName];
    if (!fieldDef) return undefined;
    return getFieldTypeString(fieldDef);
  }

  /**
   * Check if a field type string indicates a slate field
   * Formats: "array:slate", ":slate", "array:richtext", ":richtext"
   * @param {string} fieldType - The field type string
   * @returns {boolean} True if the field is a slate field
   */
  fieldTypeIsSlate(fieldType) {
    return isSlateFieldType(fieldType);
  }

  /**
   * Check if a field type string indicates a textarea field
   * Formats: "string:textarea", ":textarea"
   * @param {string} fieldType - The field type string
   * @returns {boolean} True if the field is a textarea field
   */
  fieldTypeIsTextarea(fieldType) {
    return isTextareaFieldType(fieldType);
  }

  /**
   * Check if a field type string indicates a plain string field (single-line text)
   * This is a string field without textarea or slate widget.
   * Formats: "string", "string:" (no widget means default TextWidget)
   * @param {string} fieldType - The field type string
   * @returns {boolean} True if the field is a plain string field
   */
  fieldTypeIsPlainString(fieldType) {
    return isPlainStringFieldType(fieldType);
  }

  /**
   * Check if a field type string indicates a text-editable field (string, textarea, or slate)
   * @param {string} fieldType - The field type string
   * @returns {boolean} True if the field is text-editable
   */
  fieldTypeIsTextEditable(fieldType) {
    return isTextEditableFieldType(fieldType);
  }

  /**
   * Check if a field is a slate field
   * @param {string} blockUid - The block UID
   * @param {string} fieldName - The field name
   * @returns {boolean} True if the field is a slate field
   */
  isSlateField(blockUid, fieldName) {
    return this.fieldTypeIsSlate(this.getFieldType(blockUid, fieldName));
  }

  /**
   * Send a transform request (format, paste, delete) with current form data included.
   * This ensures admin receives the latest text buffer along with the transform action.
   * All transforms use unified SLATE_TRANSFORM_REQUEST message type.
   * @param {string} blockUid - The block UID
   * @param {string} transformType - The transform type ('format', 'paste', 'delete')
   * @param {Object} transformFields - Additional fields specific to the transform (format, html, direction, etc.)
   * @returns {string} The requestId for this transform
   */
  sendTransformRequest(blockUid, transformType, transformFields) {
    const requestId = `transform-${transformType}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Clear any pending text timer since we're including current formData
    if (this.textUpdateTimer) {
      clearTimeout(this.textUpdateTimer);
      this.textUpdateTimer = null;
    }
    this.pendingTextUpdate = null;

    // Block the editor
    this.setBlockProcessing(blockUid, true, requestId);

    // Increment sequence — this is a new state. If the text debounce timer
    // already fired (sending INLINE_EDIT_DATA at seq N), the echo FORM_DATA
    // will arrive at seq N which is now < our local seq N+1 → stale → skipped.
    this.formData._editSequence = (this.formData?._editSequence || 0) + 1;

    // Get current form data (includes any typed text since formData is updated immediately)
    const data = this.getFormDataWithoutNodeIds();

    // Send the unified transform request with form data included
    window.parent.postMessage({
      type: 'SLATE_TRANSFORM_REQUEST',
      transformType: transformType,
      blockId: blockUid,
      fieldName: this.focusedFieldName || 'value',
      data: data,
      selection: this.serializeSelection() || {},
      requestId: requestId,
      ...transformFields,
    }, this.adminOrigin);

    log(`SLATE_TRANSFORM_REQUEST (${transformType}) sent with data, requestId:`, requestId);
    return requestId;
  }

  ////////////////////////////////////////////////////////////////////////////////
  // Handling Text Changes in Blocks
  ////////////////////////////////////////////////////////////////////////////////

  /**
   * Handle the text changed in the block element with attr data-edit-text,
   * by getting changed text from DOM and send it to the adminUI
   * @param {HTMLElement} target
   * @param {Node} mutatedTextNode - The actual text node that was modified (optional)
   */
  handleTextChange(target, mutatedNodeParent = null, mutatedTextNode = null) {
    const blockElement = target.closest('[data-block-uid]');
    const blockUid = blockElement?.getAttribute('data-block-uid') || null;
    const editableField = target.getAttribute('data-edit-text');

    if (!editableField) {
      console.warn('[HYDRA] handleTextChange: No data-edit-text found');
      return;
    }

    // Determine field type (supports page-level fields via getFieldType)
    const fieldType = this.getFieldType(blockUid, editableField);

    // Note: We intentionally do NOT strip ZWS from DOM during typing.
    // Like slate-react, we let the frontend re-render (triggered by FORM_DATA)
    // naturally remove ZWS. Stripping during typing corrupts cursor position.
    // See "Whitespace & ZWS Strategy" for the full ZWS lifecycle.

    if (this.fieldTypeIsSlate(fieldType)) {
      // Slate field - update JSON structure using nodeId
      // Find the nearest element with data-node-id by walking UP from the mutation site.
      // mutatedNodeParent may be a wrapper (e.g., <span>) without data-node-id —
      // walk up from there to find the Slate element node (e.g., <p data-node-id="0">).
      const closestNode = (mutatedNodeParent && mutatedNodeParent.hasAttribute('data-node-id'))
        ? mutatedNodeParent
        : (mutatedNodeParent || target).closest('[data-node-id]');
      if (!closestNode) {
        log('Slate field but no data-node-id found!');
        return;
      }

      const nodeId = closestNode.getAttribute('data-node-id');

      // Check if we're typing in a paragraph that has inline elements
      // In this case, we need to update the specific text node, not the whole paragraph
      let textContent;
      let childIndex = null;

      // Check if closestNode has mixed content (text nodes + element children like STRONG/EM)
      // If so, we need to track which specific text node was modified, not use full innerText
      const hasElementChildren = Array.from(closestNode.childNodes).some(n => n.nodeType === Node.ELEMENT_NODE);

      if (mutatedTextNode && closestNode === mutatedNodeParent && hasElementChildren) {
        // Text node is direct child of element with mixed content
        // Use getNodePath to get the correct Slate path (handles Vue whitespace nodes)
        const slatePath = this.getNodePath(mutatedTextNode);
        if (slatePath && slatePath.length > 1) {
          // Last element of path is the child index within the parent
          childIndex = slatePath[slatePath.length - 1];

          // Merge all adjacent text nodes at this position using Range.toString()
          // This normalizes whitespace correctly and handles Vue/React text node splitting
          let startNode = mutatedTextNode;
          let endNode = mutatedTextNode;

          // Walk backwards to find start of this text run (stop at element nodes)
          while (startNode.previousSibling) {
            const prev = startNode.previousSibling;
            if (prev.nodeType === Node.ELEMENT_NODE) break;
            if (prev.nodeType === Node.TEXT_NODE) {
              startNode = prev;
            } else {
              break;
            }
          }

          // Walk forward to find end of this text run (stop at element nodes)
          while (endNode.nextSibling) {
            const next = endNode.nextSibling;
            if (next.nodeType === Node.ELEMENT_NODE) break;
            if (next.nodeType === Node.TEXT_NODE) {
              endNode = next;
            } else {
              break;
            }
          }

          // Use Range to get normalized text content
          const range = document.createRange();
          range.setStart(startNode, 0);
          range.setEnd(endNode, endNode.textContent.length);
          textContent = this.stripZeroWidthSpaces(range.toString());
          log('handleTextChange: nodeId=', nodeId, 'childIndex=', childIndex, 'textContent=', textContent, 'closestNode.tagName=', closestNode.tagName);
        }
      }

      if (childIndex === null) {
        // Fallback: update using innerText of the whole node (original behavior)
        // This handles inline elements (STRONG, EM, etc.) which have their own nodeId
        textContent = this.readNodeText(closestNode);
        log('handleTextChange: nodeId=', nodeId, 'textContent=', textContent, 'closestNode.tagName=', closestNode.tagName);
      }

      // Get block data to support nested blocks
      const blockData = this.getBlockData(blockUid);
      if (!blockData) {
        log('handleTextChange: blockData not found for', blockUid);
        return;
      }

      const updatedJson = this.updateJsonNode(
        blockData,
        nodeId,
        textContent,
        childIndex,
      );

      const currBlock = document.querySelector(
        `[data-block-uid="${blockUid}"]`,
      );
      // Use getBlockData to handle nested blocks - it returns a reference to the actual block
      const block = this.getBlockData(blockUid);
      if (block) {
        // Update the block in place (getBlockData returns a reference)
        Object.assign(block, updatedJson);
        // TODO: Re-enable plaintext sync once echo detection is fixed
        // block.plaintext = this.stripZeroWidthSpaces(currBlock.innerText);
        log('handleTextChange: updated formData value:', JSON.stringify(block.value));
      }
    } else {
      // Non-Slate field - update field directly with text content
      // Resolve field path to handle /fieldName (page) and ../fieldName (parent) syntax
      const resolved = this.resolveFieldPath(editableField, blockUid);
      const targetData = this.getBlockData(resolved.blockId);
      if (targetData) {
        targetData[resolved.fieldName] = this.stripZeroWidthSpaces(target.innerText);
        log('handleTextChange: updated field:', resolved.fieldName);
      }
    }

    // Buffer the update - text and selection are captured together
    this.bufferUpdate(this.fieldTypeIsSlate(fieldType) ? 'textChangeSlate' : 'textChange');

    // Check for slash menu pattern (entire field content is /[letters]*)
    if (this.fieldTypeIsSlate(fieldType)) {
      const plaintext = this.stripZeroWidthSpaces(target.textContent || '').trim();
      const slashMatch = plaintext.match(/^\/([\p{L}\p{N}]*)$/u);

      if (slashMatch) {
        this._slashMenuActive = true;
        // Send field rect so admin can position the menu under the field
        const fieldRect = target.getBoundingClientRect();
        this.sendMessageToParent({
          type: 'SLASH_MENU',
          action: 'filter',
          blockId: blockUid,
          filter: slashMatch[1],
          fieldRect: {
            top: fieldRect.top,
            bottom: fieldRect.bottom,
            left: fieldRect.left,
            width: fieldRect.width,
          },
        });
      } else if (this._slashMenuActive) {
        this._slashMenuActive = false;
        this.sendMessageToParent({
          type: 'SLASH_MENU',
          action: 'hide',
          blockId: blockUid,
        });
      }
    }
  }

  /**
   * Buffer an update to be sent after debounce.
   * Text and selection are always sent together to keep them atomic/in-sync.
   *
   * @param {string} [from] - Source of the update for debugging
   */
  bufferUpdate(from = 'unknown') {
    if (!this.formData) {
      return;
    }
    // Always capture BOTH current data and current selection together
    const data = this.getFormDataWithoutNodeIds();
    const currentSeq = this.formData?._editSequence || 0;
    const text = this.getBlockData(this.selectedBlockUid)?.value?.[0]?.children?.[0]?.text?.substring(0, 30);

    // Check against lastReceivedFormData to avoid buffering echoes of what we just received/rendered
    if (this.lastReceivedFormData) {
      const isEcho = this.focusedFieldValuesEqual(data, this.lastReceivedFormData);
      if (isEcho) {
        // Text unchanged — send selection-only update (e.g., Ctrl+A, Shift+Arrow)
        // Safe because data is already in sync; atomicity only matters when text changes
        if (from === 'selectionChange') {
          const selection = this.serializeSelection();
          if (selection) {
            window.parent.postMessage({ type: 'SELECTION_CHANGE', selection }, this.adminOrigin);
          }
        }
        log('bufferUpdate: echo, skipping. from:', from, 'seq:', currentSeq);
        return;
      }
    } else {
      // No baseline yet - can't determine if this is an echo
      log('bufferUpdate: no baseline, skipping. from:', from);
      return;
    }

    // Increment sequence immediately when we have local changes
    // This marks our local state as "ahead" of Admin, so any incoming FORM_DATA
    // at a lower sequence will be rejected as stale
    const isNewPending = !this.pendingTextUpdate;
    if (isNewPending) {
      const newSeq = currentSeq + 1;
      this.formData._editSequence = newSeq;
      log('bufferUpdate: NEW pending, incrementing seq to:', newSeq, 'from:', from, 'text:', JSON.stringify(text));
    } else {
      log('bufferUpdate: updating existing pending, seq:', this.formData._editSequence, 'from:', from, 'text:', JSON.stringify(text));
    }

    // Buffer the update with current sequence
    this.pendingTextUpdate = {
      type: 'INLINE_EDIT_DATA',
      data: data,
      selection: this.serializeSelection(),
      from: from,
    };

    // Reset the debounce timer
    if (this.textUpdateTimer) {
      clearTimeout(this.textUpdateTimer);
    }
    this.textUpdateTimer = setTimeout(() => {
      this.flushPendingTextUpdates();
    }, 300);
  }

  /**
   * Flush any pending batched text updates immediately
   * Call this before any operation that needs current state (format, cut, paste, undo, etc.)
   * Process a FLUSH_BUFFER request. Extracted so it can be called immediately
   * or deferred until afterContentRender when a render is in progress.
   * @param {string} requestId - The FLUSH_BUFFER requestId
   */
  _processFlushBuffer(requestId) {
    // Block input during format operation - will be unblocked when FORM_DATA arrives
    if (this.selectedBlockUid) {
      this.setBlockProcessing(this.selectedBlockUid, true, requestId);
    }

    // Flush with requestId - if there's pending text, it will be included in INLINE_EDIT_DATA
    const hadPendingText = this.flushPendingTextUpdates(requestId);

    if (hadPendingText) {
      log('Flushed pending text with requestId, waiting for Redux sync');
    } else {
      // No pending text - send BUFFER_FLUSHED immediately
      const selection = this.serializeSelection();
      log('No pending text, sending BUFFER_FLUSHED with selection:', selection);
      this.sendMessageToParent({
        type: 'BUFFER_FLUSHED',
        requestId: requestId,
        selection: selection,
      });
    }
  }

  /**
   * @param {string} [flushRequestId] - Optional requestId to include with the update (for FLUSH_BUFFER coordination)
   * @returns {boolean} - True if there was pending text to flush, false otherwise
   */
  flushPendingTextUpdates(flushRequestId) {
    if (this.textUpdateTimer) {
      clearTimeout(this.textUpdateTimer);
      this.textUpdateTimer = null;
    }
    if (this.pendingTextUpdate) {
      // Use the sequence that was already incremented in bufferUpdate
      // This ensures we send with the same seq that we used to reject stale FORM_DATA
      const seq = this.formData?._editSequence || 1;
      this.pendingTextUpdate.data._editSequence = seq;

      // Include requestId if provided (for FLUSH_BUFFER coordination)
      if (flushRequestId) {
        this.pendingTextUpdate.flushRequestId = flushRequestId;
      }

      log('flushPendingTextUpdates: sending buffered update, seq:', seq,
          'anchor:', this.pendingTextUpdate.selection?.anchor,
          'focus:', this.pendingTextUpdate.selection?.focus);
      window.parent.postMessage(this.pendingTextUpdate, this.adminOrigin);

      // Update lastReceivedFormData to the data we just sent
      // This is needed because admin doesn't send FORM_DATA back for inline edits (echo prevention)
      this.lastReceivedFormData = JSON.parse(JSON.stringify(this.pendingTextUpdate.data));
      this.pendingTextUpdate = null;
      return true; // Had pending update
    }
    return false; // No pending update
  }

  /**
   * Send a message to the parent, automatically flushing pending text updates first
   * if this is not an inline edit message
   * @param {Object} message - The message to send
   */
  sendMessageToParent(message) {
    // If this is NOT an inline text edit, flush any pending text changes first
    if (message.type !== 'INLINE_EDIT_DATA') {
      this.flushPendingTextUpdates();
    }
    window.parent.postMessage(message, this.adminOrigin);
  }


  /**
   * Update the JSON object with the new text,
   * finds the node in json with given nodeId and update the text in it
   * @param {JSON} json Block's data
   * @param {BigInteger} nodeId Node ID of the element
   * @param {String} newText Updated text
   * @param {Number} childIndex Optional index of child to update (for paragraphs with inline elements)
   * @returns {JSON} Updated JSON object
   */
  updateJsonNode(json, nodeId, newText, childIndex = null) {
    if (Array.isArray(json)) {
      return json.map((item) => this.updateJsonNode(item, nodeId, newText, childIndex));
    } else if (typeof json === 'object' && json !== null) {
      // Compare nodeIds as strings (path-based IDs like "0", "0.0", etc.)
      if (json.nodeId === nodeId || json.nodeId === String(nodeId)) {
        if (json.hasOwnProperty('text')) {
          json.text = newText;
        } else if (childIndex !== null && json.children && json.children[childIndex]) {
          // Update specific child by index (for typing in paragraphs with inline elements)
          const child = json.children[childIndex];
          if (child.hasOwnProperty('text')) {
            child.text = newText;
          } else if (child.children && child.children[0]) {
            // Child is an inline element, update its first text child
            child.children[0].text = newText;
          }
        } else if (json.children) {
          // Fallback: childIndex is null, updating whole node content
          // Check if any child has 'type' (inline element like strong, em, link)
          const hasInlineElements = json.children.some(child => child.type);
          if (hasInlineElements) {
            // DOM simplified (inline elements deleted) - collapse to single text node
            json.children = [{ text: newText }];
          } else {
            // Simple paragraph - just update first child
            json.children[0].text = newText;
          }
        }
        return json;
      }
      for (const key in json) {
        if (json.hasOwnProperty(key) && key !== 'nodeId' && key !== 'data') {
          json[key] = this.updateJsonNode(json[key], nodeId, newText, childIndex);
        }
      }
    }
    return json;
  }

  findParentWithAttribute(node, attribute) {
    while (node && node.nodeType === Node.ELEMENT_NODE) {
      if (node.hasAttribute(attribute)) {
        return node;
      }
      node = node.parentElement;
    }
    return null;
  }

  ////////////////////////////////////////////////////////////////////////////////
  // Text Formatting
  ////////////////////////////////////////////////////////////////////////////////

  /**
   * Check if a selection range involves formatted content (nested elements).
   * Uses getNodePath to determine if selection is inside or spans inline formatting.
   *
   * Path length indicates nesting:
   * - [0, 0] = text directly in paragraph (plain text)
   * - [0, 1, 0] = text inside inline element like strong (formatted)
   *
   * @param {Range} range - The selection range
   * @returns {boolean} True if selection involves formatted/structured content
   */
  selectionContainsElementNodes(range) {
    // Get paths for start and end of selection
    const startPath = this.getNodePath(range.startContainer);
    const endPath = this.getNodePath(range.endContainer);

    if (!startPath || !endPath) return false;

    // Path length > 2 means inside nested element (e.g., strong inside p)
    if (startPath.length > 2) return true;
    if (endPath.length > 2) return true;

    // If paths are identical, selection is within same text node - no structure
    if (startPath.join('.') === endPath.join('.')) return false;

    // Different paths means selection spans multiple children
    // Could have elements between them (e.g., start [0,0], end [0,2] has [0,1] between)
    return true;
  }

  getSelectionHTML(range) {
    const div = document.createElement('div');
    div.appendChild(range.cloneContents());
    return div.innerHTML;
  }

  /**
   * Checks if the selected text has which types of formatting.
   * @param {Range} range - The selection range
   * @returns {Object} An object indicating the presence of bold, italic, del, and link formatting
   */
  isFormatted(range) {
    const formats = {
      bold: { present: false, enclosing: false },
      italic: { present: false, enclosing: false },
      del: { present: false, enclosing: false },
      link: { present: false, enclosing: false },
    };

    // Check if the selection is collapsed (empty)
    // if (range.collapsed) return formats;

    // Get the common ancestor container of the selection
    let container = range.commonAncestorContainer;

    // Traverse upwards until we find the editable parent or the root
    while (
      container &&
      container !== document &&
      !(container.dataset && container.dataset.editableField === 'value')
    ) {
      // Check if the container itself has any of the formatting
      if (container.nodeName === 'STRONG' || container.nodeName === 'B') {
        if (
          container.contains(range.startContainer) &&
          container.contains(range.endContainer)
        ) {
          formats.bold.enclosing = true;
          formats.bold.present = true;
        }
      }
      if (container.nodeName === 'EM' || container.nodeName === 'I') {
        if (
          container.contains(range.startContainer) &&
          container.contains(range.endContainer)
        ) {
          formats.italic.enclosing = true;
          formats.italic.present = true;
        }
      }
      if (container.nodeName === 'DEL') {
        if (
          container.contains(range.startContainer) &&
          container.contains(range.endContainer)
        ) {
          formats.del.enclosing = true;
          formats.del.present = true;
        }
      }
      if (container.nodeName === 'A') {
        if (
          container.contains(range.startContainer) &&
          container.contains(range.endContainer)
        ) {
          formats.link.enclosing = true;
          formats.link.present = true;
        }
      }

      container = container.parentNode;
    }

    // Check for formatting within the selection
    const selectionHTML = this.getSelectionHTML(range).toString();
    if (selectionHTML.includes('</strong>') || selectionHTML.includes('</b>')) {
      formats.bold.present = true;
    }
    if (selectionHTML.includes('</em>') || selectionHTML.includes('</i>')) {
      formats.italic.present = true;
    }
    if (selectionHTML.includes('</del>')) {
      formats.del.present = true;
    }
    if (selectionHTML.includes('</a>')) {
      formats.link.present = true;
    }

    return formats;
  }

  /**
   * Helper function to get the next node in the selection
   * @param {Node} node - The current node
   * @returns {Node|null} The next node in the selection, or null if at the end
   */
  nextNode(node) {
    if (!node) return null; // Handle the case where node is null

    if (node.firstChild) return node.firstChild;

    while (node) {
      if (node.nextSibling) return node.nextSibling;
      node = node.parentNode;
    }

    return null; // Reached the end, return null
  }

  /**
   * Formats the selected text within a block.
   *
   * @param {string} format - The format to apply (e.g., 'bold', 'italic', 'del').
   * @param {boolean} remove - Whether to remove the format (true) or apply it (false).
   */
  formatSelectedText(format, remove) {
    // Don't set isInlineEditing to false - keep it true for text changes
    const selection = window.getSelection();
    if (!selection.rangeCount) return;

    const range = selection.getRangeAt(0);
    if (remove) {
      this.unwrapFormatting(range, format);
    } else {
      // Handle selections that include non-Text nodes
      const fragment = range.extractContents(); // Extract the selected content
      const newNode = document.createElement(
        format === 'bold'
          ? 'strong'
          : format === 'italic'
            ? 'em'
            : format === 'del'
              ? 'del'
              : 'span',
      );
      newNode.appendChild(fragment); // Append the extracted content to the new node
      range.insertNode(newNode); // Insert the new node back into the document
    }
    this.sendFormattedHTMLToAdminUI(selection);
  }

  // Helper function to unwrap formatting while preserving other formatting
  unwrapFormatting(range, format) {
    const formattingElements = {
      bold: ['STRONG', 'B'],
      italic: ['EM', 'I'],
      del: ['DEL'],
      link: ['A'],
    };

    // Check if the selection is entirely within a formatting element of the specified type
    let container = range.commonAncestorContainer;
    let topmostParent = false;
    while (container && container !== document && !topmostParent) {
      if (container.dataset && container.dataset.editableField === 'value')
        topmostParent = true;
      if (formattingElements[format].includes(container.nodeName)) {
        // Check if the entire content of the formatting element is selected
        const isEntireContentSelected =
          range.startOffset === 0 &&
          range.endOffset === container.textContent.length;

        if (isEntireContentSelected) {
          // Unwrap the entire element
          this.unwrapElement(container);
        } else {
          // Unwrap only the selected portion
          this.unwrapSelectedPortion(
            container,
            range,
            format,
            formattingElements,
          );
        }
        return; // No need to check further
      }
      container = container.parentNode;
    }

    // If the selection is not entirely within a formatting element, remove all occurrences of the format within the selection
    let node = range.startContainer;
    while (node && node !== range.endContainer) {
      if (
        node.nodeType === Node.ELEMENT_NODE &&
        formattingElements[format].includes(node.nodeName)
      ) {
        this.unwrapElement(node);
      } else if (
        node.nodeType === Node.TEXT_NODE &&
        node.parentNode &&
        formattingElements[format].includes(node.parentNode.nodeName)
      ) {
        // Handle the case where the text node itself is within the formatting element
        this.unwrapElement(node.parentNode);
      }
      node = this.nextNode(node);
    }
  }

  // Helper function to unwrap the selected portion within a formatting element
  unwrapSelectedPortion(element, range, format, formattingElements) {
    const formattingTag = formattingElements[format][0];

    // Check if selection starts at the beginning of the formatting element
    const selectionStartsAtBeginning = range.startOffset === 0;

    // Check if selection ends at the end of the formatting element
    const selectionEndsAtEnd = range.endOffset === element.textContent.length;

    // Extract the contents before the selection (only if not at the beginning)
    let beforeFragment = null;
    if (!selectionStartsAtBeginning) {
      const beforeRange = document.createRange();
      beforeRange.setStart(element, 0);
      beforeRange.setEnd(range.startContainer, range.startOffset);
      beforeFragment = beforeRange.extractContents();
    }

    // Extract the selected contents
    const selectionFragment = range.extractContents();

    // Extract the contents after the selection (only if not at the end)
    let afterFragment = null;
    if (!selectionEndsAtEnd) {
      const afterRange = document.createRange();
      afterRange.setStart(range.endContainer, range.endOffset);
      afterRange.setEnd(element, element.childNodes.length);
      afterFragment = afterRange.extractContents();
    }

    // Create new elements to wrap the before and after fragments, keeping the original formatting (only if fragments exist)
    const beforeWrapper = beforeFragment
      ? document.createElement(formattingTag)
      : null;
    if (beforeWrapper) {
      beforeWrapper.appendChild(beforeFragment);
    }
    const afterWrapper = afterFragment
      ? document.createElement(formattingTag)
      : null;
    if (afterWrapper) {
      afterWrapper.appendChild(afterFragment);
    }

    // Replace the original element with the unwrapped selection and the formatted before/after parts
    const parent = element.parentNode;
    if (beforeWrapper) {
      parent.insertBefore(beforeWrapper, element);
    }
    parent.insertBefore(selectionFragment, element);
    if (afterWrapper) {
      parent.insertBefore(afterWrapper, element);
    }
    parent.removeChild(element);
    // Check and remove any empty formatting elements that might have been created
    this.removeEmptyFormattingElements(parent);
  }

  // Helper function to unwrap a single formatting element
  unwrapElement(element) {
    const parent = element.parentNode;
    if (!parent) return; // Handle the case where the element has no parent

    // Store the next sibling of the element before modifying the DOM
    const nextSibling = element.nextSibling;

    while (element.firstChild) {
      parent.insertBefore(element.firstChild, element);
    }

    // Remove the element itself
    parent.removeChild(element);

    this.removeEmptyFormattingElements(parent);

    // If there was a next sibling, set the selection to the beginning of it
    if (nextSibling) {
      const range = document.createRange();
      range.setStart(nextSibling, 0);
      range.collapse(true);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
    }
  } // Helper function to remove empty formatting elements
  removeEmptyFormattingElements(parent) {
    for (let i = 0; i < parent.childNodes.length; i++) {
      const child = parent.childNodes[i];
      if (
        child.nodeType === Node.ELEMENT_NODE &&
        (child.nodeName === 'STRONG' ||
          child.nodeName === 'EM' ||
          child.nodeName === 'DEL' ||
          child.nodeName === 'A') &&
        child.textContent.trim() === ''
      ) {
        parent.removeChild(child);
        i--; // Decrement i since we removed a child
      }
    }
  }
  sendFormattedHTMLToAdminUI(selection) {
    if (!selection.rangeCount) return; // No selection

    const range = selection.getRangeAt(0);
    const commonAncestor = range.commonAncestorContainer;

    const editableParent = this.findEditableParent(commonAncestor);
    if (!editableParent) return; // Couldn't find the editable parent

    const htmlString = editableParent.outerHTML;

    window.parent.postMessage(
      {
        type: 'TOGGLE_MARK',
        html: htmlString,
      },
      this.adminOrigin,
    );
  }
  findEditableParent(node) {
    if (!node || node === document) return null; // Reached the top without finding

    if (node.dataset && node.dataset.nodeId === '1') {
      return node;
    }

    return this.findEditableParent(node.parentNode);
  }

  /**
   * Injects custom CSS into the iframe for styling the adminUI components which we are
   * injecting into frontend's DOM like borders, toolbar etc..
   */
  injectCSS() {
    const style = document.createElement('style');
    style.type = 'text/css';
    style.innerHTML = `
        [contenteditable] {
          outline: 0px solid transparent;
        }
        /* Ensure empty editable fields are visible/clickable */
        [data-edit-text]:empty {
          min-height: 1.5em;
          display: block;
        }
        /* Linkable field hover styles - indicate clickable link areas */
        /* Exclude fields inside readonly blocks (listing items, non-overwrite teasers) */
        [data-edit-link]:not([data-block-readonly] [data-edit-link]):not([data-block-readonly][data-edit-link]) {
          cursor: pointer;
          position: relative;
        }
        [data-edit-link]:not([data-block-readonly] [data-edit-link]):not([data-block-readonly][data-edit-link]):hover::after {
          content: "";
          position: absolute;
          inset: -2px;
          border: 2px dashed rgba(0, 126, 177, 0.5);
          border-radius: 4px;
          pointer-events: none;
        }
        /* Media field hover styles - indicate clickable image areas */
        /* Exclude fields inside readonly blocks */
        [data-edit-media]:not([data-block-readonly] [data-edit-media]):not([data-block-readonly][data-edit-media]) {
          cursor: pointer;
          position: relative;
        }
        [data-edit-media]:not([data-block-readonly] [data-edit-media]):not([data-block-readonly][data-edit-media]):hover::after {
          content: "";
          position: absolute;
          inset: -2px;
          border: 2px dashed rgba(120, 192, 215, 0.5);
          border-radius: 4px;
          pointer-events: none;
        }
        /* Readonly block styles are applied dynamically via applyReadonlyVisuals() */
        .volto-hydra--outline {
          position: relative !important;
        }
        .volto-hydra--outline:before {
          content: "";
          position: absolute;
          top: -1px;
          left: -1px;
          right: -1px;
          bottom: -1px;
          border: 2px solid rgba(120,192,215,.75);
          border-radius: 6px;
          pointer-events: none;
          z-index: 5;
        }
        .volto-hydra-add-button {
          position: absolute;
          background: none;
          display: flex;
          justify-content: center;
          align-items: center;
          cursor: pointer;
          z-index: 10;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          padding: 8px;
          border-radius: 36px;
          background-color: var(--gray-snow, #f3f5f7);
          border: 2px solid rgb(37 151 244 / 50%);
        }
        .volto-hydra-add-button {
          bottom: -49px;
          right: 0;
          transform: translateX(-50%);
        }
        .volto-hydra-quantaToolbar {
          display: flex;
          align-items: center;
          justify-content: center;
          position: absolute;
          background: white;
          box-shadow: 3px 3px 10px rgb(0 0 0 / 53%);
          border-radius: 6px;
          z-index: 10;
          top: -45px;
          left: 0;
          box-sizing: border-box;
          width: fit-content;
          height: 40px;
        }
        .volto-hydra-drag-button,
        .volto-hydra-menu-button,
        .volto-hydra-format-button {
          background: none;
          border: none;
          cursor: pointer;
          padding: 6px;
          margin: 0;
        }
        .volto-hydra-format-button {
          border-radius: 5px;
          margin: 1px;
          display: none;
          height: 32px;
          width: 32px;
        }
        .volto-hydra-format-button svg {
          display: block;
          height: 100%;
          width: 100%;
        }

        .volto-hydra-format-button.show {
          display: block !important;
        }
        .volto-hydra-format-button.active,
        .volto-hydra-format-button:hover {
          background-color: #ddd;
        }
        .volto-hydra-drag-button {
          cursor: grab;
          background: #E4E8EC;
          border-radius: 6px;
          padding: 9px 6px;
          height: 40px;
          display: flex;
        }
        .grabbing {
          cursor: grabbing !important;
        }
        /* During drag operations, disable pointer events on toolbar so elementFromPoint can detect blocks underneath */
        .grabbing .quanta-toolbar,
        .grabbing .volto-hydra-add-button,
        .grabbing .volto-hydra-block-outline {
          pointer-events: none !important;
        }
        .dragging {
          position: fixed !important;
          opacity: 0.5;
          pointer-events: none;
          z-index: 1000;
        }
        .highlighted-block {
          border-top: 5px solid blue; 
        }
        .highlighted-block-bottom {
          border-bottom: 5px solid blue;
        }
        .link-input-container {
          position: absolute;
          top: 0;
          left: 0;
          width: fit-content;
          display: flex;
          background: white;
          box-shadow: 3px 3px 10px rgb(0 0 0 / 53%);
          border: 1px solid #00ff00;
          border-radius: 6px;
          z-index: 10;
          align-items: center;
          justify-content: center;
          box-sizing: border-box;
          visibility: visible;
        }
        .link-input {
          height: 40px;
          width: 270px;
          padding: 10px 10px;
          border: none;
          margin: 0 5px;
          background: transparent;
          color: black
        }
        .link-input:focus {
          outline: none;
        }
        .link-input::placeholder {
          color: #0B78D0;
        }
        .link-invalid-url {
          border: 1px solid red;
        }
        .link-folder-btn,
        .link-submit-btn,
        .link-cancel-btn {
          width: 32px;
          height: 32px;
          border: none;
          background: white;
          cursor: pointer;
          border-radius: 8px;
          margin-right: 2px
          display: flex;
          align-items: center;
        }
        .link-folder-btn:hover,
        .link-submit-btn:hover,
        .link-cancel-btn:hover {
          background-color: #ddd;
        }
        .link-submit-btn,
        .link-cancel-btn {
          border-radius: 100%;
          background-color: #0B78D0;
        }
        .link-cancel-btn.hide,
        .link-submit-btn.hide {
          display: none;
        }
        .volto-hydra-dropdown-menu {
          display: none;
          position: absolute;
          top: 100%;
          right: -80%;
          background: white;
          border: 1px solid #ccc;
          border-radius: 4px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
          z-index: 100;
          margin-top: -8px;
          width: 180px;
          box-sizing: border-box;
          height: 80px;
        }
        .volto-hydra-dropdown-menu.visible {
          display: block;
        }
        .volto-hydra-dropdown-item {
          display: flex;
          justify-content: flex-start;
          align-items: center;
          padding: 10px;
          cursor: pointer;
          transition: background 0.2s;
          height: 40px;
          box-sizing: border-box;
        }
        .volto-hydra-dropdown-text {
          font-size: 15px;
          font-weight: 500;
        }
        .volto-hydra-dropdown-item svg {
          margin-right: 1em;
        }
        .volto-hydra-dropdown-item:hover {
          background: #f0f0f0;
        }
        .volto-hydra-divider {
          height: 1px;
          background: rgba(0, 0, 0, 0.1);
          margin: 0 1em;
        }
        /* Empty block visual indicator - always visible */
        /* Hydra adds data-hydra-empty attribute to blocks with @type: 'empty' in formData */
        [data-hydra-empty] {
          border: 2px dashed #b8c6c8 !important;
          border-radius: 4px;
          background: rgba(200, 200, 200, 0.1);
          min-height: 60px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }
        [data-hydra-empty]::after {
          content: '+';
          font-size: 24px;
          color: #b8c6c8;
          pointer-events: none;
        }
      `;
    document.head.appendChild(style);
  }
}

// Export an instance of the Bridge class
// Use window.__hydraBridge to survive module hot-reloading in frameworks like Nuxt/Vite
let bridgeInstance = (typeof window !== 'undefined' && window.__hydraBridge) || null;

////////////////////////////////////////////////////////////////////////////////
// Bridge Connection Diagnostic
////////////////////////////////////////////////////////////////////////////////

let _diagnosticShown = false;

/**
 * Show a diagnostic popup when the bridge can't connect.
 * Automatically called when hydra.js detects it's in an iframe with edit signals
 * but the bridge doesn't initialize within a timeout.
 */
function _showBridgeDiagnostic(info) {
  if (_diagnosticShown) return;
  if (typeof document === 'undefined') return;
  _diagnosticShown = true;

  const el = document.createElement('div');
  el.id = 'hydra-bridge-diagnostic';
  el.setAttribute('style', [
    'position:fixed', 'bottom:16px', 'right:16px', 'z-index:2147483647',
    'max-width:440px', 'background:#fef2f2', 'border:2px solid #dc2626',
    'border-radius:8px', 'padding:16px', 'box-shadow:0 4px 12px rgba(0,0,0,0.15)',
    'font-family:monospace', 'font-size:13px', 'line-height:1.6', 'color:#7f1d1d',
  ].join(';'));

  const rows = [
    `<strong>window.name:</strong> "${info.windowName || '(empty)'}"`,
    `<strong>In iframe:</strong> ${info.inIframe}`,
    `<strong>Admin origin:</strong> ${info.adminOrigin || '(none)'}`,
    `<strong>initBridge called:</strong> ${info.bridgeCreated}`,
    `<strong>INITIAL_DATA received:</strong> ${info.bridgeInitialized}`,
  ];

  let hint = '';
  if (info.inIframe && !info.hasHydraName) {
    hint = 'The admin should set the iframe name to "hydra-edit:&lt;origin&gt;". ' +
      'Check that Volto sets window.name on the iframe element.';
  } else if (info.bridgeCreated && !info.bridgeInitialized) {
    hint = 'INIT was sent but admin did not respond with INITIAL_DATA. ' +
      'Check that adminOrigin matches the parent window origin.';
  } else if (!info.bridgeCreated) {
    hint = 'hydra.js was imported but initBridge() was never called. ' +
      'The frontend should call initBridge() in edit mode.';
  }

  el.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
      <strong style="color:#dc2626;font-size:14px">Hydra Bridge: Not Connected</strong>
      <button id="hydra-diag-dismiss" style="background:none;border:none;cursor:pointer;font-size:18px;color:#666">&times;</button>
    </div>
    <div>${rows.join('<br>')}</div>
    ${hint ? `<div style="margin-top:8px;padding:8px;background:#fee2e2;border-radius:4px;font-size:12px">${hint}</div>` : ''}
  `;

  document.body.appendChild(el);
  document.getElementById('hydra-diag-dismiss').addEventListener('click', () => el.remove());
}

// Auto-detect bridge connection issues when hydra.js is loaded in an iframe
// with edit signals (window.name or _edit param) but bridge doesn't connect.
if (typeof window !== 'undefined' && window.self !== window.top) {
  const _url = new URL(window.location.href);
  const _editParam = _url.searchParams.get('_edit');
  const _isEditMode = window.name.startsWith('hydra-edit:');
  const _expectsHydra = _isEditMode || _editParam === 'true';

  if (_expectsHydra) {
    // Check after page load + 5 seconds — enough time for bridge to connect
    const _checkConnection = () => {
      setTimeout(() => {
        if (!bridgeInstance || !bridgeInstance.initialized) {
          _showBridgeDiagnostic({
            windowName: window.name,
            hasHydraName: _isEditMode,
            inIframe: true,
            adminOrigin: bridgeInstance?.adminOrigin || null,
            bridgeCreated: !!bridgeInstance,
            bridgeInitialized: bridgeInstance?.initialized || false,
          });
        }
      }, 5000);
    };
    if (document.readyState === 'complete') {
      _checkConnection();
    } else {
      window.addEventListener('load', _checkConnection);
    }
  }
}

/**
 * Initialize the bridge
 *
 * @param {Object|string} [adminOriginOrOptions] - Options object or admin origin URL
 * @param {Object} [options] - Options (if first param is adminOrigin)
 * @returns {Bridge} The bridge instance
 */
export function initBridge(adminOriginOrOptions, options = {}) {
  let adminOrigin;

  // Support both calling conventions:
  // - initBridge({ options }) - just options, no adminOrigin
  // - initBridge(adminOrigin, { options }) - with explicit adminOrigin
  if (
    typeof adminOriginOrOptions === 'object' &&
    adminOriginOrOptions !== null
  ) {
    // First argument is options object
    options = adminOriginOrOptions;
    adminOrigin = options.adminOrigin; // Can optionally include adminOrigin in options
  } else {
    // First argument is adminOrigin (string or null/undefined)
    adminOrigin = adminOriginOrOptions;
  }

  // 1. Explicit parameter (highest priority)
  if (adminOrigin) {
    log('Using explicit admin origin:', adminOrigin);
  }
  // 2. Extract from window.name (set by Volto, persists across iframe navigation)
  else if (window.name.startsWith('hydra-edit:') || window.name.startsWith('hydra-view:')) {
    const prefix = window.name.startsWith('hydra-edit:') ? 'hydra-edit:' : 'hydra-view:';
    adminOrigin = window.name.slice(prefix.length);
    log('Got admin origin from window.name:', adminOrigin);
  }
  // 3. No window.name means we're not in a Volto iframe - nothing to communicate with
  else {
    log('No hydra window.name set - not in Volto iframe, skipping bridge setup');
    adminOrigin = null;
  }

  if (!bridgeInstance) {
    bridgeInstance = new Bridge(adminOrigin, options);
    bridgeInstance.lastKnownPath = window.location.pathname;
    // Store on window to survive module hot-reload
    if (typeof window !== 'undefined') {
      window.__hydraBridge = bridgeInstance;
    }
  } else {
    // Bridge already exists - check if URL changed (e.g., after SPA navigation + remount)
    const currentPath = window.location.pathname;
    // Update pathToApiPath if provided in new options
    if (options.pathToApiPath) {
      bridgeInstance.pathToApiPath = options.pathToApiPath;
    }
    if (bridgeInstance.lastKnownPath && bridgeInstance.lastKnownPath !== currentPath) {
      const apiPath = bridgeInstance.pathToApiPath(currentPath);
      // Check if this is in-page navigation (paging) — don't send PATH_CHANGE again
      const inPageNavTime = sessionStorage.getItem('hydra_in_page_nav_time');
      const isInPage = inPageNavTime && (Date.now() - parseInt(inPageNavTime, 10)) < 5000;
      if (!isInPage) {
        log('initBridge: URL changed since last init, sending PATH_CHANGE:', bridgeInstance.lastKnownPath, '->', currentPath, '-> apiPath:', apiPath);
        window.parent.postMessage(
          { type: 'PATH_CHANGE', path: apiPath },
          bridgeInstance.adminOrigin,
        );
      } else {
        log('initBridge: URL changed since last init but in-page nav, skipping PATH_CHANGE');
      }
    }
    bridgeInstance.lastKnownPath = currentPath;
  }
  return bridgeInstance;
}

/**
 * Get the access token from URL (preferred), sessionStorage, or cookie (fallback)
 * Token is stored in sessionStorage when first received from URL params
 * @returns {String|null} token
 */
export function getAccessToken() {
  if (typeof window === 'undefined') {
    return null;
  }
  // Try URL first (admin sends token via URL on initial load)
  const urlToken = new URL(window.location.href).searchParams.get('access_token');
  if (urlToken) {
    // Store for future SPA navigations
    sessionStorage.setItem('hydra_access_token', urlToken);
    return urlToken;
  }
  // Try sessionStorage (persists across SPA navigations)
  const sessionToken = sessionStorage.getItem('hydra_access_token');
  if (sessionToken) {
    return sessionToken;
  }
  // Fallback to cookie
  return getTokenFromCookie();
}

/**
 * Convert an absolute API URL to a frontend-relative path.
 *
 * Content URLs from the Plone REST API (e.g. @id fields in listing items)
 * use the API base URL. Pass your API base URL to convert them to
 * frontend-relative paths. Note: the bridge may not be initialised in
 * non-edit mode, so the API URL must be provided by the frontend itself.
 *
 * @param {string} url - URL to convert (absolute or relative)
 * @param {string} apiUrl - API base URL (e.g. 'https://api.example.com')
 * @returns {string} Relative path if url starts with apiUrl, otherwise url unchanged
 */
export function contentPath(url, apiUrl) {
  if (!url || !apiUrl || typeof url !== 'string') return url || '';
  if (url.startsWith(apiUrl)) {
    const rel = url.slice(apiUrl.length);
    return rel.startsWith('/') ? rel : '/' + rel;
  }
  return url;
}

/**
 * Check if we're in edit mode (hydra iframe connected to admin for editing).
 * Uses window.name (set by admin) and _edit URL param as signals.
 * @returns {boolean} True if in edit mode
 */
export function isEditMode() {
  if (typeof window === 'undefined') {
    return false;
  }
  const url = new URL(window.location.href);
  const editParam = url.searchParams.get('_edit');
  return window.name.startsWith('hydra-edit:') || editParam === 'true';
}

/**
 * Get the token from cookie (legacy method, prefer getAccessToken)
 * @returns {String|null} token
 */
export function getTokenFromCookie() {
  if (typeof document === 'undefined') {
    return null;
  }
  const name = 'access_token=';
  const decodedCookie = decodeURIComponent(document.cookie);
  const cookieArray = decodedCookie.split(';');
  for (let i = 0; i < cookieArray.length; i++) {
    let cookie = cookieArray[i].trim();
    if (cookie.indexOf(name) === 0) {
      return cookie.substring(name.length, cookie.length);
    }
  }
  return null;
}


// ============================================================================
// Listing/Search API Utilities (fetch-agnostic helpers)
// ============================================================================

/**
 * Get authorization headers for API requests.
 * Uses the access token from URL, sessionStorage, or cookie.
 * @returns {Object} Headers object with Authorization if token exists
 */
export function getAuthHeaders() {
  const token = getAccessToken();
  if (token) {
    return {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    };
  }
  return {
    Accept: 'application/json',
  };
}

/**
 * Build the request body for @querystring-search endpoint.
 * This is the Plone endpoint that accepts Volto's querystring format.
 *
 * @param {Object} queryConfig - Volto querystring configuration
 * @param {Array} queryConfig.query - Array of query conditions [{i, o, v}, ...]
 * @param {string} [queryConfig.sort_on] - Field to sort on
 * @param {string} [queryConfig.sort_order] - 'ascending' or 'descending'
 * @param {number} [queryConfig.limit] - Maximum number of results (0 = unlimited)
 * @param {Object} [paging] - Paging options
 * @param {number} [paging.b_start=0] - Starting index
 * @param {number} [paging.b_size=10] - Number of items per page
 * @param {Object} [extraCriteria={}] - Additional query criteria (for search blocks)
 * @param {string} [extraCriteria.SearchableText] - Text search term
 * @param {string} [extraCriteria.sort_on] - Override sort field
 * @param {string} [extraCriteria.sort_order] - Override sort order
 * @param {string|string[]} [extraCriteria['facet.*']] - Facet filters (e.g., 'facet.portal_type': ['Document'])
 * @returns {Object} Request body for POST to @querystring-search
 */
export function buildQuerystringSearchBody(queryConfig, paging = {}, extraCriteria = {}) {
  const { b_start = 0, b_size = 10 } = paging;

  // When no queryConfig at all (listing with no querystring configured),
  // default to current folder contents in folder order — matching Plone's
  // behavior for unconfigured listing blocks.
  const hasQuery = queryConfig?.query && Array.isArray(queryConfig.query) && queryConfig.query.length > 0;

  let query;
  if (hasQuery) {
    // Clone to avoid mutations
    query = [...queryConfig.query];
  } else {
    // Default: relative path "." = current context's children
    query = [
      {
        i: 'path',
        o: 'plone.app.querystring.operation.string.relativePath',
        v: '.',
      },
    ];
  }

  // Merge extraCriteria into query
  if (extraCriteria.SearchableText) {
    query.push({
      i: 'SearchableText',
      o: 'plone.app.querystring.operation.string.contains',
      v: extraCriteria.SearchableText,
    });
  }

  // Add facet filters from extraCriteria (keys starting with 'facet.')
  for (const [key, value] of Object.entries(extraCriteria)) {
    if (key.startsWith('facet.')) {
      const field = key.replace('facet.', '');
      query.push({
        i: field,
        o: 'plone.app.querystring.operation.selection.any',
        v: Array.isArray(value) ? value : [value],
      });
    }
  }

  // Default sort: folder order for unconfigured listings, effective date for configured ones
  const defaultSort = hasQuery ? 'effective' : 'getObjPositionInParent';
  const defaultOrder = hasQuery ? 'descending' : 'ascending';

  const body = {
    query,
    sort_on: extraCriteria.sort_on || queryConfig?.sort_on || defaultSort,
    sort_order: extraCriteria.sort_order || queryConfig?.sort_order || defaultOrder,
    b_start,
    b_size,
    metadata_fields: '_all',
  };

  // Add limit if specified (0 or undefined means no limit)
  if (queryConfig?.limit && queryConfig.limit > 0) {
    body.limit = queryConfig.limit;
  }

  return body;
}

/**
 * Calculate paging information from search results.
 *
 * @param {number} itemsTotal - Total number of items
 * @param {number} bSize - Items per page
 * @param {number} currentPage - Current page index (0-based)
 * @returns {Object} Paging info with pages array, prev, next, last
 */
export function calculatePaging(itemsTotal, bSize, currentPage = 0) {
  if (!bSize || bSize <= 0 || !itemsTotal || itemsTotal <= 0) {
    return { pages: [], prev: null, next: null, last: null, totalPages: 0, currentPage: 0, totalItems: 0 };
  }

  const totalPages = Math.ceil(itemsTotal / bSize);
  const pages = Array.from({ length: totalPages }, (_, i) => ({
    start: i * bSize,
    page: i + 1,
  }));

  // Get a window of pages around current page (show 5 pages max)
  const windowStart = Math.max(0, currentPage - 2);
  const windowEnd = Math.min(totalPages, currentPage + 3);
  const visiblePages = pages.slice(windowStart, windowEnd);

  return {
    pages: visiblePages,
    prev: currentPage > 0 ? currentPage - 1 : null,
    next: currentPage < totalPages - 1 ? currentPage + 1 : null,
    last: totalPages - 1,
    totalPages,
    currentPage,
    totalItems: itemsTotal,
  };
}

/**
 * Expand listing blocks by fetching query results and converting items to blocks.
 * Uses itemType and fieldMapping from each listing block to determine output format.
 * Each listing is replaced by multiple blocks of the specified itemType in the layout.
 * Works with any fetch library (Nuxt $fetch, React Query, SWR, etc.)
 *
 * @param {Object} blocks - Block data keyed by block ID
 * @param {Array} blocksLayout - Ordered array of block IDs (blocks_layout.items)
 * @param {Object} options
 * @param {string} [options.apiUrl] - Base API URL (required if no fetcher provided)
 * @param {string} options.contextPath - Current content path for relative queries
 * @param {number} [options.page=0] - Current page number (0-indexed)
 * @param {number} [options.pageSize=10] - Number of elements per page
 * @param {Function} [options.fetcher] - Custom fetch function(path, body, headers) => Promise<response>
 * @param {Object} [options.extraCriteria={}] - Additional query criteria (for search blocks)
 * @param {string} [options.extraCriteria.SearchableText] - Text search term
 * @param {string} [options.extraCriteria.sort_on] - Override sort field
 * @param {string} [options.extraCriteria.sort_order] - Override sort order ('ascending'|'descending')
 * @param {string|string[]} [options.extraCriteria['facet.*']] - Facet filters (e.g., 'facet.portal_type': ['Document'])
 * @param {string} [options.itemTypeField='itemType'] - Field name to read item block type from (e.g., 'variation')
 * @param {string} [options.defaultItemType='summary'] - Default item type when field is not set
 * @returns {Promise<{items: Array, paging: Object}>}
 *   - items: Array of blocks, each with @uid (block ID for data-block-uid) and @type
 *   - paging: { currentPage, totalPages, totalItems, prev, next, pages }
 *
 * @example
 * // Listing block with itemType and fieldMapping:
 * // {
 * //   '@type': 'listing',
 * //   'itemType': 'teaser',
 * //   'fieldMapping': { 'title': 'headline', '@id': 'href' },
 * //   'itemDefaults': { 'showImage': true }
 * // }
 * // Query result: { title: 'My Page', '@id': '/my-page', description: '...' }
 * // Output block: { '@type': 'teaser', headline: 'My Page', href: '/my-page', showImage: true }
 */

/**
 * Synchronous helper to pass through static blocks with @uid.
 * Use for non-listing blocks in grids with combined paging.
 *
 * Returns { items, paging } — does NOT mutate the input paging object.
 * Chain `paging.seen` from one call to the next for correct positioning.
 *
 * @param {Array} inputItems - Array of block IDs or objects with @uid
 * @param {Object} options - Configuration options
 * @param {Object} options.blocks - Map of blockId -> block data (for ID lookups)
 * @param {Object} options.paging - Paging input { start, size } (not mutated)
 * @param {number} [options.seen=0] - Number of items already seen (from prior calls)
 * @returns {{ items: Array, paging: Object }} Items on current page + computed paging state
 */
export function staticBlocks(inputItems, options = {}) {
  const { blocks: blocksDict, paging: pagingIn = {} } = options;
  let seen = options.seen || 0;
  const start = pagingIn.start || 0;
  const size = pagingIn.size || 1000;

  // Normalize items: convert IDs to objects if blocksDict provided
  const normalizedItems = (inputItems || []).map(item => {
    if (typeof item === 'string') {
      const block = blocksDict?.[item];
      if (!block) {
        console.warn(`[HYDRA] staticBlocks: block not found for ID: ${item}`);
        return null;
      }
      return { ...block, '@uid': item };
    }
    return item;
  }).filter(Boolean);

  const items = [];

  for (const item of normalizedItems) {
    seen++;
    // Only include items on current page
    if (seen > start && (seen - start) <= size) {
      items.push(item);
    }
  }

  // Build output paging with computed UI values
  const paging = { start, size, total: seen, seen };
  computePagingUI(paging);

  return { items, paging };
}

/**
 * Internal helper to compute paging UI values.
 */
function computePagingUI(paging) {
  const { start, size, total } = paging;
  if (size && total) {
    paging.currentPage = Math.floor(start / size);
    paging.totalPages = Math.ceil(total / size);
    paging.totalItems = total;

    // Page number window (show ~5 pages centered on current)
    const windowStart = Math.max(0, paging.currentPage - 2);
    const windowEnd = Math.min(paging.totalPages, paging.currentPage + 3);
    paging.pages = [];
    for (let i = windowStart; i < windowEnd; i++) {
      paging.pages.push({ start: i * size, page: i + 1 });
    }

    paging.prev = paging.currentPage > 0 ? paging.currentPage - 1 : null;
    paging.next = paging.currentPage < paging.totalPages - 1 ? paging.currentPage + 1 : null;
  }

}

/**
 * Extract plain text from a Slate JSON value (array of nodes).
 * BR nodes within a paragraph become newlines when separator is '\n'.
 */
function slateToText(nodes, separator = '\n') {
  if (!Array.isArray(nodes)) return String(nodes ?? '');
  return nodes.map(node => {
    if (node.text !== undefined) return node.text;
    if (node.type === 'br') return separator;
    if (node.children) return slateToText(node.children, separator);
    return '';
  }).join('');
}

/**
 * Convert a plain text string to Slate JSON value.
 * Always produces a single paragraph node (Slate fields have one block element).
 * Newlines become BR inline nodes within the paragraph.
 */
function textToSlate(text) {
  const str = String(text ?? '');
  if (!str || !str.includes('\n')) {
    return [{ type: 'p', children: [{ text: str }] }];
  }
  const lines = str.split('\n');
  const children = [];
  for (let i = 0; i < lines.length; i++) {
    if (i > 0) children.push({ type: 'br', children: [{ text: '' }] });
    children.push({ text: lines[i] });
  }
  return [{ type: 'p', children }];
}

/**
 * Convert a field value to match a target JSON Schema type.
 * Used by expandListingBlocks when fieldMapping specifies a target type,
 * and by convertBlockType for coercing values between block schemas.
 *
 * Conversions:
 *   array → string:  join with ", " (or extract @id from link arrays)
 *   Slate array → string:  extract text (no line breaks)
 *   object (image) → string:  extract main image URL
 *   string → link:   wrap as [{ '@id': value }]
 *   string → array:  wrap as [value]
 *   string → slate:  wrap as [{type:'p', children:[{text:value}]}]
 *   Slate → textarea:  extract text with line breaks between paragraphs
 *   string → textarea:  pass through
 *   textarea → slate:  split on newlines into paragraph nodes
 *   * → string:      String(value)
 */
export function convertFieldValue(value, targetType) {
  if (!targetType) return value;  // No type specified = pass through

  switch (targetType) {
    case 'string':
      if (Array.isArray(value)) {
        // Object browser link array: [{@id: '/path', title: '...'}] → extract URL
        if (value.length > 0 && value[0]?.['@id']) return value[0]['@id'];
        // Slate array: extract text without line breaks
        if (value.length > 0 && value[0]?.type && value[0]?.children) return slateToText(value, ' ');
        return value.join(', ');
      }
      if (value && typeof value === 'object') {
        // Image object: extract main URL from image_scales
        if (value.image_scales && value.image_field) {
          const field = value.image_field;
          const scaleData = value.image_scales[field];
          if (scaleData?.[0]?.download) {
            return `${value['@id'] || ''}/${scaleData[0].download}`;
          }
        }
        return String(value);
      }
      return String(value);

    case 'textarea':
      // Like 'string' but preserves line breaks from Slate paragraphs
      if (Array.isArray(value)) {
        if (value.length > 0 && value[0]?.['@id']) return value[0]['@id'];
        if (value.length > 0 && value[0]?.type && value[0]?.children) return slateToText(value, '\n');
        return value.join(', ');
      }
      if (typeof value === 'string') return value;
      return String(value ?? '');

    case 'slate':
      // Convert to Slate JSON array
      if (Array.isArray(value)) {
        // Already a Slate array — pass through
        if (value.length > 0 && value[0]?.type && value[0]?.children) return value;
        // Object browser link array → extract URL and wrap
        if (value.length > 0 && value[0]?.['@id']) return textToSlate(value[0]['@id']);
        return textToSlate(value.join(', '));
      }
      if (typeof value === 'string') return textToSlate(value);
      return textToSlate(String(value ?? ''));

    case 'link':
      // Volto link format: [{ '@id': url, title?: '...' }]
      if (typeof value === 'string') return [{ '@id': value }];
      if (Array.isArray(value)) {
        // Strip image-specific metadata, keep only link fields
        if (value.length > 0 && value[0]?.['@id']) {
          return value.map(item => {
            const { image_field, image_scales, ...linkFields } = item;
            return linkFields;
          });
        }
        return value;
      }
      if (value && typeof value === 'object' && value['@id']) return [{ '@id': value['@id'] }];
      return [{ '@id': String(value) }];

    case 'image':
      // ImageWidget format: plain string URL (siblings handled by pack/unpack in convertBlockType)
      if (Array.isArray(value)) {
        // Image link array: [{ '@id': url, ... }] → extract URL string
        if (value.length > 0 && value[0]?.['@id']) return value[0]['@id'];
        // Slate array → extract text as URL
        if (value.length > 0 && value[0]?.type && value[0]?.children) return slateToText(value, ' ');
        return value.join(', ');
      }
      if (typeof value === 'string') return value;
      if (value && typeof value === 'object' && value['@id']) return value['@id'];
      return value;

    case 'image_link':
      // object_browser image format: [{ '@id': url, image_field?: '...', image_scales?: {...} }]
      if (Array.isArray(value)) {
        // Already array format — pass through
        if (value.length > 0 && value[0]?.['@id']) return value;
        // Slate array → extract text as URL
        if (value.length > 0 && value[0]?.type && value[0]?.children) {
          return [{ '@id': slateToText(value, ' ') }];
        }
        return value;
      }
      if (typeof value === 'string') return [{ '@id': value }];
      if (value && typeof value === 'object' && value['@id']) return [value];
      return value;

    case 'array':
      if (Array.isArray(value)) return value;
      return [value];

    default:
      return value;  // 'object', 'number', 'boolean', 'integer' — pass through
  }
}

export async function expandListingBlocks(inputItems, options = {}) {
  const {
    blocks: blocksDict,  // Optional: lookup dict for when items are IDs
    fetchItems,          // { blockType: async (block, { start, size }) => { items, total } }
    paging: pagingIn,    // { start, size } — not mutated
    itemTypeField = 'itemType',  // Field name to read item type from (e.g., 'variation')
    defaultItemType = 'summary',  // Default item type when field is not set
  } = options;

  if (!fetchItems || typeof fetchItems !== 'object') {
    throw new Error('expandListingBlocks requires a fetchItems map of { blockType: fetcherFn }');
  }

  // Normalize items: convert IDs to objects if blocksDict provided
  // Items can be: objects with @uid, or string IDs (looked up in blocksDict)
  const normalizedItems = (inputItems || []).map(item => {
    if (typeof item === 'string') {
      // It's a block ID - look up in blocksDict
      const block = blocksDict?.[item];
      if (!block) {
        console.warn(`[HYDRA] expandListingBlocks: block not found for ID: ${item}`);
        return null;
      }
      return { ...block, '@uid': item };
    }
    // Already an object with @uid
    return item;
  }).filter(Boolean);

  // Convert to blocks/layout format for internal processing
  const blocks = Object.fromEntries(normalizedItems.map(item => [item['@uid'], item]));
  const blocksLayout = normalizedItems.map(item => item['@uid']);

  // Use input paging values (not mutated) and seen count from prior calls
  const paging = pagingIn || { start: 0, size: 1000 };

  // Find all listing blocks that need expansion (any block whose @type has a fetcher)
  const listingBlockIds = blocksLayout.filter(
    (blockId) => fetchItems[blocks[blockId]?.['@type']]
  );

  // Register listing blocks as readonly on bridge (if editing)
  // Expanded items share these UIDs and shouldn't have editable fields
  if (bridgeInstance) {
    for (const blockId of listingBlockIds) {
      bridgeInstance.setBlockReadonly(blockId, true);
      log('expandListingBlocks: registered readonly block:', blockId);
    }
  } else {
    log('expandListingBlocks: no bridgeInstance, skipping readonly registration for:', listingBlockIds);
  }

  // Account for items already counted by prior staticBlocks calls.
  // Caller passes seen count explicitly (no shared mutable state).
  const priorSeen = options.seen || 0;

  // Single-pass: walk blocks in layout order, fetching each listing sequentially.
  // Each fetch returns { items, total }, so we learn the total and get the items
  // in one request. This avoids a separate "get totals" phase.
  let globalPos = priorSeen;
  let batchTotal = 0;
  const listingTotals = {};
  const listingResults = {};
  const windowStart = paging.start;
  const windowEnd = paging.start + paging.size;

  for (const blockId of blocksLayout) {
    if (!listingBlockIds.includes(blockId)) {
      globalPos += 1; // Non-listing blocks contribute 1 item
      batchTotal += 1;
      continue;
    }

    const blockStart = globalPos;

    // Optimistic check: if this listing starts past the page window end,
    // we still need its total for paging UI, so fetch with size: 0.
    // Otherwise, compute the slice we need and fetch items + total together.
    let localStart = 0;
    let localSize = 0;
    if (blockStart < windowEnd) {
      // This listing might overlap the window — compute the slice
      localStart = Math.max(0, windowStart - blockStart);
      // We don't know total yet, so request up to the remaining window size.
      // The backend will clamp to actual available items.
      localSize = windowEnd - Math.max(blockStart, windowStart);
    }

    try {
      const fetcher = fetchItems[blocks[blockId]['@type']];
      const result = await fetcher(blocks[blockId], { start: localStart, size: localSize });
      const total = result.total || 0;
      listingTotals[blockId] = total;
      batchTotal += total;

      // Now that we know the actual total, check if this listing truly overlaps
      const blockEnd = blockStart + total;
      if (localSize > 0 && blockEnd > windowStart && blockStart < windowEnd) {
        listingResults[blockId] = result.items || [];
      }

      globalPos += total;
    } catch (error) {
      console.error(`[HYDRA] Failed to fetch listing ${blockId}:`, error);
      listingTotals[blockId] = 0;
      globalPos += 0;
    }
  }

  // Build items array — walk layout in order, emitting items that fall in the page window
  const items = [];
  globalPos = priorSeen;

  for (const blockId of blocksLayout) {
    const block = blocks[blockId];

    if (listingBlockIds.includes(blockId)) {
      const total = listingTotals[blockId];
      const blockStart = globalPos;

      if (listingResults[blockId]) {
        const itemType = block[itemTypeField] || defaultItemType;
        const fieldMapping = block.fieldMapping || {};

        // Extract itemDefaults from flat keys (e.g., itemDefaults_overwrite -> overwrite)
        const itemDefaults = {};
        const defaultsPrefix = 'itemDefaults_';
        for (const [key, value] of Object.entries(block)) {
          if (key.startsWith(defaultsPrefix)) {
            const fieldName = key.slice(defaultsPrefix.length);
            itemDefaults[fieldName] = value;
          }
        }
        log('expandListingBlocks:', { blockId, itemType, fieldMapping: JSON.stringify(fieldMapping), itemDefaults: JSON.stringify(itemDefaults), itemCount: listingResults[blockId].length });

        // Convert each query result to a block of itemType
        // All expanded items share the same @uid (the listing block's ID)
        // fieldMapping acts as an allowlist: only mapped fields end up on the block.
        // Format: { source: { field: target, type: jsonSchemaType } }
        // Or legacy: { source: target } (simple rename, no conversion)
        const DEFAULT_FIELD_MAPPING = { '@id': 'href', 'title': 'title', 'description': 'description', 'image': 'image' };
        const effectiveMapping = Object.keys(fieldMapping).length > 0 ? fieldMapping : DEFAULT_FIELD_MAPPING;

        for (const result of listingResults[blockId]) {
          const itemBlock = {
            '@uid': blockId,  // Block UID for data-block-uid attribute
            '@type': itemType,
            ...itemDefaults,
            readOnly: true,
          };

          for (const [sourceField, mapping] of Object.entries(effectiveMapping)) {
            const targetField = typeof mapping === 'string' ? mapping : mapping?.field;
            const targetType = typeof mapping === 'object' ? mapping?.type : undefined;
            if (!targetField) continue;
            if (result[sourceField] === undefined) continue;

            itemBlock[targetField] = convertFieldValue(result[sourceField], targetType);
          }

          items.push(itemBlock);
        }
      }

      globalPos += total;
    } else if (block) {
      // Non-listing block: include if it falls in the page window
      if (globalPos >= paging.start && globalPos < paging.start + paging.size) {
        items.push({ ...block, '@uid': blockId });
      }
      globalPos += 1;
    }
  }

  // Build output paging with computed UI values (input is not mutated)
  const seen = priorSeen + batchTotal;
  const outPaging = { start: paging.start, size: paging.size, total: seen, seen };
  computePagingUI(outPaging);

  return { items, paging: outPaging };
}

/**
 * Create a fetchItems callback for Plone's @querystring-search endpoint.
 *
 * @param {Object} options
 * @param {string} options.apiUrl - Plone site URL (e.g., 'http://localhost:8080/Plone')
 * @param {string} [options.contextPath='/'] - Path for relative queries
 * @param {Object} [options.extraCriteria={}] - Additional query params (SearchableText, facet.*, sort_on, sort_order)
 * @returns {Function} fetchItems(block, { start, size }) => Promise<{ items, total }>
 */
export function ploneFetchItems({ apiUrl, contextPath = '/', extraCriteria = {} } = {}) {
  if (!apiUrl) {
    throw new Error('ploneFetchItems requires apiUrl');
  }

  return async function fetchItems(block, { start, size }) {
    const body = buildQuerystringSearchBody(block.querystring, {
      b_start: start,
      b_size: size,
    }, extraCriteria);

    const headers = getAuthHeaders();
    headers['Content-Type'] = 'application/json';

    const path = `${contextPath}/++api++/@querystring-search`;
    const res = await fetch(`${apiUrl}${path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    const response = await res.json();

    const rawItems = response.items || [];
    // Normalize: package image_field + image_scales into self-contained image object
    // with @id duplicated inside (imageProps needs it as base URL for relative paths)
    const items = rawItems.map(item => {
      if (!item.image_scales || !item.image_field) return item;
      const normalized = { ...item };
      normalized.image = {
        '@id': item['@id'],
        image_field: item.image_field,
        image_scales: item.image_scales,
      };
      delete normalized.image_scales;
      delete normalized.image_field;
      return normalized;
    });

    return {
      items,
      total: response.items_total ?? rawItems.length,
    };
  };
}

// ============================================================================
// Field Type Utilities (exported for use by volto-hydra admin side)
// ============================================================================

/**
 * Convert a schema field definition to a "type:widget" string.
 * Mirrors the format used by extractBlockFieldTypes in View.jsx.
 * @param {Object} field - Schema field definition with optional type and widget
 * @returns {string} Field type string like "string", "array:slate", "string:textarea", ":object_browser"
 */
export function getFieldTypeString(field) {
  const type = field.type;
  const widget = field.widget;
  if (type && widget) return `${type}:${widget}`;
  if (widget) return `:${widget}`;
  if (type) return type;
  return 'string';
}

/**
 * Check if a field type indicates a Slate field.
 * Handles both old format ('slate') and new format ('array:slate', 'object:richtext').
 * @param {string} fieldType - Field type string
 * @returns {boolean}
 */
export function isSlateFieldType(fieldType) {
  if (!fieldType) return false;
  return fieldType === 'slate' || fieldType.includes(':slate') || fieldType.includes(':richtext');
}

/**
 * Check if a field type indicates a textarea field.
 * @param {string} fieldType - Field type string
 * @returns {boolean}
 */
export function isTextareaFieldType(fieldType) {
  return fieldType?.includes(':textarea') || false;
}

/**
 * Check if a field type indicates a plain string field (single-line text).
 * @param {string} fieldType - Field type string
 * @returns {boolean}
 */
export function isPlainStringFieldType(fieldType) {
  if (!fieldType) return false;
  if (isSlateFieldType(fieldType) || isTextareaFieldType(fieldType)) {
    return false;
  }
  return fieldType === 'string' || fieldType.startsWith('string:');
}

/**
 * Check if a field type is text-editable (string, textarea, or slate).
 * @param {string} fieldType - Field type string
 * @returns {boolean}
 */
export function isTextEditableFieldType(fieldType) {
  if (!fieldType) return false;
  return isSlateFieldType(fieldType) ||
         isTextareaFieldType(fieldType) ||
         isPlainStringFieldType(fieldType);
}

/**
 * Compare two formData objects for content equality, ignoring _editSequence.
 * Used to detect if form content has actually changed vs just metadata.
 * @param {Object} formDataA - First formData object
 * @param {Object} formDataB - Second formData object
 * @returns {boolean} True if content is equal (ignoring _editSequence)
 */
export function formDataContentEqual(formDataA, formDataB) {
  if (!formDataA || !formDataB) return formDataA === formDataB;
  const { _editSequence: seqA, ...contentA } = formDataA;
  const { _editSequence: seqB, ...contentB } = formDataB;
  return JSON.stringify(contentA) === JSON.stringify(contentB);
}

/**
 * Calculate drag handle/toolbar position for a block.
 * Used by both iframe drag handle and Volto toolbar to ensure alignment.
 *
 * @param {Object} blockRect - Block's bounding rect {top, left}
 * @param {Object} viewportOffset - Viewport offset {top, left}
 *        For iframe: {top: 0, left: 0}
 *        For parent: iframe.getBoundingClientRect()
 * @returns {Object} {top, left} position
 */
export function calculateDragHandlePosition(blockRect, viewportOffset = { top: 0, left: 0 }) {
  const HANDLE_OFFSET_TOP = 40;
  const top = Math.max(viewportOffset.top, viewportOffset.top + blockRect.top - HANDLE_OFFSET_TOP);
  const left = viewportOffset.left + blockRect.left;
  return { top, left };
}

////////////////////////////////////////////////////////////////////////////////
// Template Utilities
// For discovering, filtering, and merging templates.
// Templates are Documents with blocks that have template fields (templateId, templateInstanceId, placeholder).
// Uses Volto's standard fixed/readOnly properties for block behavior.
////////////////////////////////////////////////////////////////////////////////

// Deprecated: old marker, kept for backwards compatibility
export const TEMPLATE_MARKER = '_template';

// Template blocks use flat fields directly on the block:
// - templateId: string - the template document path (e.g., '/templates/test-layout')
// - templateInstanceId: string - unique ID for this template application instance
// - placeholder: string - placeholder region name (e.g., 'primary', 'header')

/**
 * Simple UUID generator for block IDs.
 * @returns {string} UUID v4 format string
 */
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Check if a template is a layout (has fixed blocks at edges).
 * Layout = first or last block has fixed: true (Volto standard property).
 *
 * @param {Object} templateData - Template document with blocks and blocks_layout
 * @returns {boolean}
 */
export function isLayoutTemplate(templateData) {
  const { blocks, blocks_layout } = templateData;
  const layout = blocks_layout?.items || [];
  if (layout.length === 0) return false;

  const firstBlock = blocks?.[layout[0]];
  const lastBlock = blocks?.[layout[layout.length - 1]];

  // If first or last block has fixed: true (Volto standard), it's a layout
  const firstIsFixed = firstBlock?.fixed === true;
  const lastIsFixed = lastBlock?.fixed === true;

  return firstIsFixed || lastIsFixed;
}

/**
 * Find placeholder regions in a template.
 * Placeholder blocks (fixed: false) with same placeholder form a region.
 *
 * @param {Object} templateData - Template document
 * @returns {Object} { placeholder: { blockIds: [], allowedBlocks: [] } }
 */
export function findPlaceholderRegions(templateData) {
  const { blocks, blocks_layout } = templateData;
  const layout = blocks_layout?.items || [];
  const regions = {};

  for (const blockId of layout) {
    const block = blocks?.[blockId];
    // Placeholder blocks have fixed: false (or undefined) and a placeholder
    if (block?.fixed) continue; // Skip fixed blocks

    const placeholder = block?.placeholder;
    if (placeholder) {
      if (!regions[placeholder]) {
        regions[placeholder] = {
          blockIds: [],
          allowedBlocks: null,
        };
      }
      regions[placeholder].blockIds.push(blockId);
    }
  }
  return regions;
}

/**
 * Check if a template is allowed in a given container context.
 *
 * @param {Object} templateData - Template document
 * @param {string} containerType - Block @type of container (e.g., "page", "columns")
 * @param {string} fieldName - Container field name (e.g., "blocks")
 * @returns {boolean}
 */
export function isTemplateAllowedIn(templateData, containerType, fieldName) {
  const { allowed_container_types, allowed_field_names } = templateData;

  // If no restrictions, allow everywhere
  if (!allowed_container_types?.length && !allowed_field_names?.length) {
    return true;
  }

  // Check restrictions
  const typeOk =
    !allowed_container_types?.length ||
    allowed_container_types.includes(containerType);
  const fieldOk =
    !allowed_field_names?.length || allowed_field_names.includes(fieldName);

  return typeOk && fieldOk;
}

/**
 * Filter templates for "Apply Layout" UI.
 * Returns templates that are layouts and allowed in the given context.
 *
 * @param {Array} templates - Array of template documents
 * @param {string} containerType - Block @type of container
 * @param {string} fieldName - Container field name
 * @returns {Array} Filtered templates
 */
export function getLayoutTemplates(templates, containerType, fieldName) {
  return templates.filter(
    (t) => isLayoutTemplate(t) && isTemplateAllowedIn(t, containerType, fieldName),
  );
}

/**
 * Filter templates for block chooser (snippets).
 * Returns templates that are NOT layouts and allowed in the given context.
 *
 * @param {Array} templates - Array of template documents
 * @param {string} containerType - Block @type of container
 * @param {string} fieldName - Container field name
 * @returns {Array} Filtered templates
 */
export function getSnippetTemplates(templates, containerType, fieldName) {
  return templates.filter(
    (t) =>
      !isLayoutTemplate(t) && isTemplateAllowedIn(t, containerType, fieldName),
  );
}

/**
 * Clone template blocks with fresh UUIDs.
 * Recursively filters nested blocks to only include those with template markers.
 *
 * @param {Object} blocks - Template blocks object
 * @param {Array} layout - Template blocks_layout.items array
 * @param {Function} uuidGenerator - Function to generate UUIDs (default: generateUUID)
 * @returns {Object} { blocks, layout, idMap } where idMap tracks old->new IDs
 */
export function cloneBlocksWithNewIds(blocks, layout, uuidGenerator = generateUUID) {
  const idMap = {}; // oldId -> newId
  const newBlocks = {};
  const newLayout = [];

  for (const oldId of layout) {
    const newId = uuidGenerator();
    idMap[oldId] = newId;

    // Deep clone the block, filtering nested blocks without template markers
    const block = blocks[oldId];
    if (block) {
      newBlocks[newId] = cloneBlockFilteringNested(block, uuidGenerator);
    }

    newLayout.push(newId);
  }

  return { blocks: newBlocks, layout: newLayout, idMap };
}

/**
 * Clone a block, recursively filtering nested blocks without template markers.
 * Only nested blocks with `placeholder` or `templateId` are included.
 *
 * @param {Object} block - Block to clone
 * @param {Function} uuidGenerator - Function to generate UUIDs
 * @returns {Object} Cloned block with filtered nested blocks
 */
function cloneBlockFilteringNested(block, uuidGenerator) {
  // Start with a shallow clone
  const cloned = { ...block };

  // Check for nested blocks field (blocks + blocks_layout pattern)
  if (cloned.blocks && cloned.blocks_layout?.items) {
    const nestedBlocks = {};
    const nestedLayout = [];

    for (const nestedId of cloned.blocks_layout.items) {
      const nestedBlock = cloned.blocks[nestedId];
      if (!nestedBlock) continue;

      // Only include nested blocks that have template markers
      if (nestedBlock.placeholder || nestedBlock.templateId) {
        const newNestedId = uuidGenerator();
        // Recursively filter this nested block's children too
        nestedBlocks[newNestedId] = cloneBlockFilteringNested(nestedBlock, uuidGenerator);
        nestedLayout.push(newNestedId);
      }
    }

    cloned.blocks = nestedBlocks;
    cloned.blocks_layout = { ...cloned.blocks_layout, items: nestedLayout };
  }

  return cloned;
}


/**
 * Insert snippet blocks at a specific position.
 * - Clones snippet blocks with new IDs
 * - Adds template fields (templateId, templateInstanceId, placeholder)
 * - Preserves Volto's fixed/readOnly properties
 * - Inserts at the specified position
 *
 * @param {Object} pageFormData - Existing page data
 * @param {Object} templateData - Snippet template document
 * @param {number} position - Index to insert at
 * @param {Function} uuidGenerator - Function to generate UUIDs (default: generateUUID)
 * @returns {Object} Updated formData with snippet inserted
 */
export function insertSnippetBlocks(pageFormData, templateData, position, uuidGenerator = generateUUID) {
  const result = {
    blocks: { ...pageFormData.blocks },
    blocks_layout: {
      items: [...(pageFormData.blocks_layout?.items || [])],
    },
  };
  const templateId = templateData['@id'] || templateData.UID;
  const instanceId = uuidGenerator(); // New instance ID for this insertion

  // Clone snippet blocks
  const { blocks: clonedBlocks, layout: clonedLayout, idMap } =
    cloneBlocksWithNewIds(
      templateData.blocks,
      templateData.blocks_layout?.items || [],
      uuidGenerator,
    );

  // Add template fields
  for (const [newId, block] of Object.entries(clonedBlocks)) {
    const originalId = Object.entries(idMap).find(
      ([_, v]) => v === newId,
    )?.[0];
    const originalBlock = templateData.blocks?.[originalId];

    // Set flat template fields
    block.templateId = templateId;
    block.templateInstanceId = instanceId;
    block.placeholder = originalBlock?.placeholder || originalId;

    // Preserve Volto's fixed/readOnly from template
    if (originalBlock?.fixed !== undefined) block.fixed = originalBlock.fixed;
    if (originalBlock?.readOnly !== undefined) block.readOnly = originalBlock.readOnly;

    result.blocks[newId] = block;
  }

  // Insert at position
  result.blocks_layout.items.splice(position, 0, ...clonedLayout);

  return result;
}

/**
 * Get blocks that belong to a specific template.
 *
 * @param {Object} formData - Page form data
 * @param {string} tplId - Template UID to find
 * @returns {Array} Array of block IDs belonging to this template
 */
export function getTemplateBlocks(formData, tplId) {
  const blockIds = [];
  for (const blockId of formData.blocks_layout?.items || []) {
    const block = formData.blocks?.[blockId];
    if (block?.templateId === tplId) {
      blockIds.push(blockId);
    }
  }
  return blockIds;
}

/**
 * Check if a block is a fixed template block (cannot be moved individually).
 * Uses Volto's standard fixed property.
 *
 * @param {Object} block - Block data
 * @returns {boolean}
 */
export function isFixedTemplateBlock(block) {
  // Fixed if it has templateId AND fixed: true (Volto standard)
  return block?.templateId && block?.fixed === true;
}

/**
 * Check if a block is placeholder content (can be moved freely).
 * Placeholder blocks have templateId but fixed: false (or undefined).
 *
 * @param {Object} block - Block data
 * @returns {boolean}
 */
export function isPlaceholderContent(block) {
  // Placeholder if it has templateId but is NOT fixed
  return block?.templateId && !block?.fixed;
}

/**
 * Check if a block is inside the template currently being edited.
 * A block is inside if its templateInstanceId matches the templateEditMode.
 *
 * @param {Object} blockData - The block data object
 * @param {string|null} templateEditMode - The templateInstanceId of the template being edited, or null
 * @returns {boolean} True if the block is inside the edited template, false otherwise
 */
export function isBlockInEditedTemplate(blockData, templateEditMode) {
  if (!templateEditMode) return false;
  return blockData?.templateInstanceId === templateEditMode;
}

/**
 * Check if a block should be readonly based on template edit mode.
 * This is the shared utility for both admin (sidebar/toolbar) and hydra.js Bridge.
 *
 * In template edit mode:
 * - Blocks inside the template being edited are editable (return false)
 * - Blocks outside the template are locked (return true)
 *
 * In normal mode:
 * - Check the block's readOnly property (Volto standard)
 *
 * @param {Object} blockData - The block data object
 * @param {string|null} templateEditMode - The templateInstanceId of the template being edited, or null
 * @returns {boolean} True if the block should be readonly
 */
export function isBlockReadonly(blockData, templateEditMode) {
  if (templateEditMode) {
    // In template edit mode:
    // - Blocks inside the template being edited are editable
    // - Blocks outside the template are readonly
    return !isBlockInEditedTemplate(blockData, templateEditMode);
  }

  // Normal mode: check block's readOnly property (Volto standard)
  return !!blockData?.readOnly;
}

/**
 * Check if a block's position is locked (cannot be moved/dragged).
 * This is the shared utility for both admin (toolbar) and hydra.js Bridge.
 *
 * In template edit mode:
 * - Blocks inside the template being edited are movable (return false) - even if fixed
 * - Blocks outside the template are locked (return true)
 *
 * In normal mode:
 * - Check the block's fixed property (Volto standard)
 *
 * @param {Object} blockData - The block data object
 * @param {string|null} templateEditMode - The templateInstanceId of the template being edited, or null
 * @returns {boolean} True if the block's position is locked
 */
export function isBlockPositionLocked(blockData, templateEditMode) {
  if (templateEditMode) {
    // In template edit mode, ALL blocks are draggable (not position-locked)
    // This allows dragging outside blocks into the template
    // Drop zone restriction (where blocks can be dropped) is handled
    // separately in the drag handler via isDropAllowedInTemplateEditMode
    return false;
  }

  // Normal mode: check block's fixed property (Volto standard)
  return !!blockData?.fixed;
}

/**
 * Get block addability - centralized logic for whether blocks can be added
 * before/after/into a block. Used by DnD, add buttons, and BlockChooser.
 *
 * @param {string} blockId - The block ID to check addability for (target block)
 * @param {Object} blockPathMap - Map of blockId -> pathInfo
 * @param {Object} blockData - The target block data object (can be null for pathMap-only checks)
 * @param {string|null} templateEditMode - The templateInstanceId being edited, or null
 * @param {Object|null} sourceBlockData - For DnD: the source block being moved. Enables template-aware logic.
 * @returns {Object} Addability info:
 *   - canInsertBefore: Can add a sibling before this block
 *   - canInsertAfter: Can add a sibling after this block
 *   - canReplace: Can replace this block (for empty blocks)
 *   - allowedTypes: Array of allowed block types, or null for all types
 *   - maxReached: Whether container is at maxLength
 */
export function getBlockAddability(blockId, blockPathMap, blockData, templateEditMode, sourceBlockData = null) {
  const pathInfo = blockPathMap?.[blockId];

  // Default: can't add anywhere
  const result = {
    canInsertBefore: false,
    canInsertAfter: false,
    canReplace: false,
    allowedTypes: null,
    maxReached: false,
  };

  if (!pathInfo) {
    return result;
  }

  // Get static insert restrictions from pathMap (based on fixed blocks)
  const staticCanInsertBefore = pathInfo.canInsertBefore !== false;
  const staticCanInsertAfter = pathInfo.canInsertAfter !== false;

  // Check if container is at maxLength
  const maxReached = pathInfo.maxSiblings != null &&
    pathInfo.siblingCount >= pathInfo.maxSiblings;
  result.maxReached = maxReached;

  // If max is reached, can't add more blocks
  if (maxReached) {
    return result;
  }

  // Template edit mode handling:
  // - For add button (no sourceBlockData): Only allow if target is in the edited template
  // - For DnD (sourceBlockData provided): Allow if source OR target is in the template
  //   This enables dragging blocks from outside INTO the template
  let targetInTemplate = false;
  if (templateEditMode) {
    targetInTemplate = isBlockInEditedTemplate(blockData, templateEditMode);
    const sourceInTemplate = sourceBlockData ? isBlockInEditedTemplate(sourceBlockData, templateEditMode) : false;

    // For DnD: allow if either source or target is in the template
    // For add button: only allow if target is in the template
    const allowedByTemplateMode = sourceBlockData
      ? (sourceInTemplate || targetInTemplate)
      : targetInTemplate;

    if (!allowedByTemplateMode) {
      // Neither block is in the template being edited - can't add here
      return result;
    }
  }

  // Apply static restrictions
  // In template edit mode, ignore restrictions for blocks in the template being edited
  // (the restrictions are for normal mode to prevent adding outside placeholders)
  if (templateEditMode && targetInTemplate) {
    result.canInsertBefore = true;
    result.canInsertAfter = true;
  } else {
    result.canInsertBefore = staticCanInsertBefore;
    result.canInsertAfter = staticCanInsertAfter;
  }

  // For empty blocks: can replace (unless readonly), but NOT add before/after
  // Empty blocks are meant to be replaced via block chooser
  const isEmptyBlock = blockData?.['@type'] === 'empty';
  if (isEmptyBlock) {
    // In template edit mode, check if block is in the edited template for replace permission
    const blockIsReadonly = isBlockReadonly(blockData, templateEditMode);
    result.canReplace = !blockIsReadonly;
    result.canInsertBefore = false;
    result.canInsertAfter = false;
  }

  // Include allowed types from pathInfo
  result.allowedTypes = pathInfo.allowedSiblingTypes || null;

  return result;
}

/**
 * Extract the pathname from a template ID, which may be a full URL or a path.
 * Plone's API resolves resolveuid/UID references to full URLs (e.g.
 * "http://plone.example.com/templates/foo"), but allowedLayouts may use
 * relative paths (e.g. "/templates/foo").  This helper normalises both
 * forms to a plain pathname so comparisons work regardless of format.
 *
 * @param {string|null} id - Template ID (URL or path)
 * @returns {string|null} The pathname portion, or the original value
 */
export function templateIdToPath(id) {
  if (!id || typeof id !== 'string') return id;
  // Fast path: already a relative path
  if (!id.startsWith('http://') && !id.startsWith('https://')) return id;
  try {
    return new URL(id).pathname;
  } catch {
    return id;
  }
}

/**
 * Check whether two template IDs refer to the same template, ignoring
 * URL-vs-path differences.  E.g. "http://localhost:8888/tpl/foo" matches
 * "/tpl/foo".
 */
function templateIdsMatch(a, b) {
  if (a === b) return true;
  if (!a || !b) return false;
  return templateIdToPath(a) === templateIdToPath(b);
}

/**
 * Get unique template IDs (paths) from page data.
 *
 * @param {Object} formData - Page data with blocks
 * @returns {Array<string>} Array of unique template paths
 */
export function getUniqueTemplateIds(formData) {
  const templateIds = new Set();
  for (const blockId of Object.keys(formData.blocks || {})) {
    const block = formData.blocks[blockId];
    // Skip template definitions (templateInstanceId === templateId)
    // Only include pages using templates (templateInstanceId !== templateId)
    if (block?.templateId && block.templateInstanceId !== block.templateId) {
      templateIds.add(block.templateId);
    }
  }
  return Array.from(templateIds);
}

/**
 * Check if an object looks like a blocks map (string keys -> objects with @type).
 */
function isBlocksMap(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return false;
  return Object.values(obj).some(v => v?.['@type']);
}

/**
 * Recursively scan for blocks with matching templateInstanceId.
 * Handles arbitrary nesting - looks for blocks maps (values have @type)
 * and corresponding layout arrays.
 *
 * @param {Object} container - Container object to scan
 * @param {string} instanceId - Template instance ID to match
 * @param {Map} pendingContent - Map of placeholder -> [{blockId, block}]
 * @param {Array} standaloneBlocks - Blocks without placeholder
 * @param {Set} visited - Already visited objects (prevent cycles)
 */
function collectContentFromTree(container, instanceId, pendingContent, standaloneBlocks, existingFixedBlockIds, visited = new Set()) {
  if (!container || typeof container !== 'object') return;
  if (visited.has(container)) return;
  visited.add(container);

  if (Array.isArray(container)) {
    for (const item of container) {
      collectContentFromTree(item, instanceId, pendingContent, standaloneBlocks, existingFixedBlockIds, visited);
    }
    return;
  }

  // Look for blocks maps (shared blocks format: one "blocks" dict + named layout fields)
  for (const [fieldName, value] of Object.entries(container)) {
    if (!isBlocksMap(value)) continue;

    // Collect block IDs from all layout fields ({ items: [...] }) in this container.
    // In shared blocks format, layout fields are named (columns, top_images, blocks_layout, etc.)
    // — there is no ${fieldName}_layout convention.
    const layoutBlockIds = new Set();
    for (const [key, val] of Object.entries(container)) {
      if (key !== fieldName && val?.items && Array.isArray(val.items)) {
        for (const id of val.items) layoutBlockIds.add(id);
      }
    }
    // Fall back to all keys if no layout fields found
    const blockLayout = layoutBlockIds.size > 0 ? layoutBlockIds : Object.keys(value);

    // Process in order
    for (const blockId of blockLayout) {
      const block = value[blockId];
      if (!block) continue;

      // Only collect blocks matching our instance
      if (block.templateInstanceId === instanceId) {
        const placeholder = block.placeholder;
        if (placeholder) {
          if (block.fixed) {
            // Track existing fixed block ID and content for reuse
            existingFixedBlockIds.set(placeholder, { blockId, block });
          } else {
            // User content block
            if (!pendingContent.has(placeholder)) {
              pendingContent.set(placeholder, []);
            }
            pendingContent.get(placeholder).push({ blockId, block });
          }
        }
      } else if (!block.templateId && !block.placeholder) {
        // Standalone block (no template markers) - track position
        standaloneBlocks.push({ blockId, block });
      }

      // Recurse into block for nested containers
      collectContentFromTree(block, instanceId, pendingContent, standaloneBlocks, existingFixedBlockIds, visited);
    }
  }
}

/**
 * Process blocks at a nested level inside a fixed template container.
 * Called when expandTemplates recognizes we're inside a registered nested container.
 *
 * @param {Object} docBlocks - The document's blocks at this nested level
 * @param {Array} docLayout - The document's layout at this nested level
 * @param {Object} nestedInfo - Info about the template structure at this level
 * @param {Object} templateState - Shared template state
 * @param {Object} options - Original options passed to expandTemplates
 * @param {Function} addItem - Helper to add items to result
 * @param {Array} items - Result array to populate
 * @returns {Array} Items with @uid field
 */
function processNestedTemplateLevel(docBlocks, docLayout, nestedInfo, templateState, options, addItem, items) {
  const { templateBlocks, templateLayout } = nestedInfo;
  const { templateId, instanceId } = templateState;
  const { uuidGenerator } = options;

  // Build a map of document blocks by placeholder for user content lookup
  const docBlocksByPlaceholder = new Map();
  for (const blockId of docLayout) {
    const block = docBlocks[blockId];
    if (block?.placeholder) {
      if (!docBlocksByPlaceholder.has(block.placeholder)) {
        docBlocksByPlaceholder.set(block.placeholder, []);
      }
      docBlocksByPlaceholder.get(block.placeholder).push({ blockId, block });
    }
  }

  // Process the template layout at this nested level
  // Only emit blocks that have template markers (fixed or placeholder)
  // Blocks without markers are just defaults and should NOT be synced
  for (const tplBlockId of templateLayout) {
    const tplBlock = templateBlocks[tplBlockId];
    if (!tplBlock) continue;

    if (tplBlock.fixed) {
      // Fixed block - emit template version
      const blockId = uuidGenerator ? uuidGenerator() : `${instanceId}::${tplBlockId}`;

      // Look ahead for next non-fixed placeholder at this nested level
      const tplIdx = templateLayout.indexOf(tplBlockId);
      let nextPlaceholder = undefined;
      for (let i = tplIdx + 1; i < templateLayout.length; i++) {
        const nextTplBlock = templateBlocks[templateLayout[i]];
        if (nextTplBlock && !nextTplBlock.fixed && nextTplBlock.placeholder) {
          nextPlaceholder = nextTplBlock.placeholder;
          break;
        }
        if (nextTplBlock?.fixed) break;
      }

      // childPlaceholders for nested containers
      let childPlaceholders = undefined;
      if (tplBlock.blocks && isBlocksMap(tplBlock.blocks)) {
        const innerLayout = tplBlock.blocks_layout?.items || Object.keys(tplBlock.blocks);
        for (const nestedId of innerLayout) {
          const nested = tplBlock.blocks[nestedId];
          if (nested && !nested.fixed && nested.placeholder) {
            if (!childPlaceholders) childPlaceholders = {};
            childPlaceholders['blocks'] = nested.placeholder;
            break;
          }
        }
      }

      addItem(
        {
          ...tplBlock,
          templateId: templateId,
          templateInstanceId: instanceId,
          ...(nextPlaceholder && { nextPlaceholder }),
          ...(childPlaceholders && { childPlaceholders }),
        },
        blockId
      );

      // Register further nested containers (blocks_layout and object_list)
      if (tplBlock.blocks && isBlocksMap(tplBlock.blocks)) {
        const nestedLayout = tplBlock.blocks_layout?.items || Object.keys(tplBlock.blocks);
        templateState.nestedContainers.set(tplBlock.blocks, {
          templateBlockId: tplBlockId,
          templateBlocks: tplBlock.blocks,
          templateLayout: nestedLayout,
        });
      }
      for (const val of Object.values(tplBlock)) {
        if (Array.isArray(val) && val.length > 0 && val[0]?.templateId) {
          const itemIdField = '@id';
          templateState.nestedContainers.set(val, {
            templateBlockId: tplBlockId,
            templateBlocks: Object.fromEntries(val.map(item => [item[itemIdField], item])),
            templateLayout: val.map(item => item[itemIdField]),
          });
        }
      }
    } else if (tplBlock.placeholder) {
      // Placeholder slot - emit document content that goes here
      const placeholder = tplBlock.placeholder;
      const userContent = docBlocksByPlaceholder.get(placeholder) || [];
      for (const { blockId, block } of userContent) {
        addItem(
          {
            ...block,
            templateId: templateId,
            templateInstanceId: instanceId,
            placeholder: placeholder,
          },
          blockId
        );
      }
    }
    // Skip blocks without fixed or placeholder - they're just template defaults
    // and should NOT be synced to the document
  }

  return items;
}

/**
 * Load all templates referenced in data, including nested templates.
 * Recursively scans data for templateId references, loads them,
 * then scans loaded templates for more references until all are loaded.
 *
 * @param {Object} data - Page data to scan for template references
 * @param {Function} loadTemplate - Async function: (templateId) => Promise<templateData>
 * @param {Object} preloadedTemplates - Already-loaded templates: { templateId: templateData }. Caller owns the cache.
 * @param {Array} extraTemplateIds - Additional template IDs to fetch (e.g. forced layouts not referenced in page data)
 * @returns {Promise<Object>} Map of templateId -> template data (includes preloaded + newly fetched)
 */
export async function loadTemplates(data, loadTemplate, preloadedTemplates = {}, extraTemplateIds = []) {
  // Start with caller-provided templates (caller owns the cache)
  const templates = { ...preloadedTemplates };
  const loaded = new Set(Object.keys(preloadedTemplates));
  const failed = new Map();

  // Helper to scan an object for templateId references
  function collectTemplateIds(obj, visited = new Set()) {
    const ids = new Set();

    function scan(o) {
      if (!o || typeof o !== 'object') return;
      if (visited.has(o)) return;
      visited.add(o);

      if (Array.isArray(o)) {
        for (const item of o) scan(item);
        return;
      }

      if (o.templateId && typeof o.templateId === 'string') {
        ids.add(o.templateId);
      }

      for (const value of Object.values(o)) {
        scan(value);
      }
    }

    scan(obj);
    return ids;
  }

  // Collect template IDs referenced in the page data, plus any extra forced layouts.
  let pending = collectTemplateIds(data);
  for (const id of extraTemplateIds) {
    if (id) pending.add(id);
  }

  // Keep loading until no new templates found
  while (pending.size > 0) {
    // Filter out already loaded/failed
    const toLoad = Array.from(pending).filter(id => !loaded.has(id) && !failed.has(id));
    pending.clear();

    if (toLoad.length === 0) break;

    // Load in parallel with a per-template timeout so a hanging request
    // doesn't block INITIAL_DATA indefinitely.
    const TEMPLATE_LOAD_TIMEOUT = 5000;
    const results = await Promise.all(
      toLoad.map(async (id) => {
        try {
          const template = await Promise.race([
            loadTemplate(id),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error(`Template load timed out after ${TEMPLATE_LOAD_TIMEOUT}ms`)), TEMPLATE_LOAD_TIMEOUT)
            ),
          ]);
          return { id, template };
        } catch (error) {
          console.warn(`[HYDRA] Failed to load template ${id}:`, error);
          return { id, template: null, error };
        }
      })
    );

    // Process results and collect nested template IDs
    for (const { id, template, error } of results) {
      if (template) {
        loaded.add(id);
        templates[id] = template;
        preloadedTemplates[id] = template;  // Write back to caller's cache

        // Scan this template for nested template references
        const nestedIds = collectTemplateIds(template);
        for (const nestedId of nestedIds) {
          if (!loaded.has(nestedId) && !failed.has(nestedId)) {
            pending.add(nestedId);
          }
        }
      } else {
        failed.set(id, error);
      }
    }
  }

  const errors = Array.from(failed.entries()).map(([templateId, error]) => ({ templateId, error }));
  return { templates, errors };
}

/**
 * Async version of expandTemplates.
 * Loads templates on-demand using loadTemplate callback, then delegates to expandTemplatesSync.
 *
 * @param {Array} inputItems - Input items (block IDs or block objects)
 * @param {Object} options - Configuration options
 * @param {Object} options.blocks - Blocks dict for ID lookup
 * @param {Object} options.templateState - Mutable state object (pass {} on first call)
 * @param {Function} options.loadTemplate - Async callback: (templateId) => Promise<templateData>
 * @param {Array} options.allowedLayouts - Force layout from this list if no matching layout applied
 * @returns {Promise<Array>} Items with @uid field
 */
export async function expandTemplates(inputItems, options = {}) {
  const {
    blocks: blocksDict,
    loadTemplate,
    preloadedTemplates,
  } = options;

  // Build data object for loadTemplates to scan
  const data = blocksDict
    ? { blocks: blocksDict, blocks_layout: { items: inputItems } }
    : { items: inputItems };

  // Load templates referenced in the page data, seeded with caller's cache
  const { templates } = await loadTemplates(data, loadTemplate, preloadedTemplates);

  // Delegate to sync version with pre-loaded templates.
  // Don't pass loadTemplate — it's async and expandTemplatesSync requires
  // sync loaders. Instead, catch "not found" errors and retry after awaiting.
  const { loadTemplate: _drop, ...syncOptions } = options;
  const loaded = new Set(Object.keys(templates));
  while (true) {
    try {
      return expandTemplatesSync(inputItems, {
        ...syncOptions,
        templates,
      });
    } catch (e) {
      const match = e.message?.match(/^Template "(.+)" not found/);
      if (match && loadTemplate && !loaded.has(match[1])) {
        const missingId = match[1];
        loaded.add(missingId);
        try {
          templates[missingId] = await loadTemplate(missingId);
          continue;
        } catch {
          // loadTemplate failed — fall through to rethrow
        }
      }
      throw e;
    }
  }
}

/**
 * Synchronous version of expandTemplates.
 * Requires all templates to be pre-loaded in options.templates.
 * Falls back to options.loadTemplate (must be synchronous) if a required template
 * is not in the pre-loaded map. Throws if loadTemplate returns a Promise or if
 * the template still can't be found.
 *
 * This function is called recursively: the top-level BlocksRenderer calls it for
 * the page layout, and the expanded result may contain container blocks (columns,
 * accordions, etc.) whose child BlocksRenderers call it again. Nested containers
 * are detected via templateState.nestedContainers (keyed by blocksDict reference)
 * and handled by processNestedTemplateLevel instead of the main path.
 *
 * templateState is shared across all BlocksRenderer instances on the page (via
 * Vue provide/inject or similar). It must be a fresh {} for each page render to
 * avoid stale state across navigations.
 *
 * @param {Array} inputItems - Input items (block IDs or block objects)
 * @param {Object} options - Configuration options
 * @param {Object} options.templates - Map of templateId -> template data (REQUIRED)
 * @param {Object} options.templateState - Mutable state object (pass {} on first call)
 * @param {Array} options.allowedLayouts - Force layout from this list if no matching layout applied
 * @returns {Array} Items with @uid field
 */
export function expandTemplatesSync(inputItems, options = {}) {
  const {
    blocks: blocksDict,
    templateState = {},
    templates,
    allowedLayouts,
    uuidGenerator,
    filterInstanceId,
    loadTemplate,
    idField,  // For object_list arrays: field name used as item ID (e.g. '@id', 'key')
  } = options;

  if (!templates) {
    throw new Error('expandTemplatesSync requires options.templates with pre-loaded templates');
  }

  const items = [];
  const addItem = (block, blockId) => {
    items.push({ ...block, '@uid': blockId });
  };

  // In edit mode, admin handles template merging - pass blocks through as-is
  const editMode = isEditMode();
  if (editMode) {
    return (inputItems || []).map(item => {
      if (typeof item === 'string') {
        const block = blocksDict?.[item];
        return block ? { ...block, '@uid': item } : null;
      }
      // Object_list items: map idField → @uid
      if (idField && item && !item['@uid']) {
        const id = item[idField];
        if (id) return { ...item, '@uid': id };
      }
      return item;
    }).filter(Boolean);
  }

  // Normalize items
  const normalizedItems = (inputItems || []).map(item => {
    if (typeof item === 'string') {
      const block = blocksDict?.[item];
      if (!block) {
        console.warn(`[HYDRA] expandTemplatesSync: block not found for ID: ${item}`);
        return null;
      }
      return { ...block, '@uid': item };
    }
    // Object_list items: map idField → @uid
    if (idField && item && !item['@uid']) {
      const id = item[idField];
      if (id) return { ...item, '@uid': id };
    }
    return item;
  }).filter(Boolean);

  const blocks = Object.fromEntries(normalizedItems.map(item => [item['@uid'], item]));
  const layout = normalizedItems.map(item => item['@uid']);

  // Initialize global state structures if needed
  if (!templateState.instances) {
    templateState.instances = {};
  }
  if (!templateState.nestedContainers) {
    templateState.nestedContainers = new Map();
  }
  if (!templateState.generatedInstanceIds) {
    templateState.generatedInstanceIds = new WeakMap(); // blocksDict -> generated instanceId
  }

  // Check if inside a registered nested container (blocks_layout or object_list)
  if (blocksDict && templateState.nestedContainers.has(blocksDict)) {
    const nestedInfo = templateState.nestedContainers.get(blocksDict);
    return processNestedTemplateLevel(blocks, layout, nestedInfo, templateState, options, addItem, items);
  }
  if (inputItems && templateState.nestedContainers.has(inputItems)) {
    const nestedInfo = templateState.nestedContainers.get(inputItems);
    return processNestedTemplateLevel(blocks, layout, nestedInfo, templateState, options, addItem, items);
  }

  if (layout.length === 0 && !allowedLayouts?.length) {
    return items;
  }

  // Determine templateId and instanceId for this call
  let templateId = null;
  let existingInstanceId = filterInstanceId || null;
  for (const blockId of layout) {
    const block = blocks[blockId];
    if (block?.templateId) {
      templateId = block.templateId;
      if (!filterInstanceId) {
        existingInstanceId = block.templateInstanceId;
      }
      break;
    }
  }

  // Track previous templateId before allowedLayouts may override it
  const previousTemplateId = templateId;

  if (allowedLayouts?.length > 0) {
    // Determine if this is a layout (all blocks belong to the template) or an
    // inserted template (template blocks mixed with standalone blocks).
    // allowedLayouts should only enforce on layouts, not on inserted templates.
    const isLayout = templateId && layout.every(blockId => {
      const block = blocks[blockId];
      return block?.templateInstanceId === existingInstanceId;
    });

    // Use path-normalised comparison: block templateId may be a full URL
    // (e.g. from Plone's resolveuid) while allowedLayouts may be paths.
    if (isLayout && !allowedLayouts.some(l => templateIdsMatch(l, templateId))) {
      templateId = allowedLayouts[0];
      if (!filterInstanceId) {
        existingInstanceId = null;
      }
    } else if (!templateId) {
      // No template found — apply the forced layout
      templateId = allowedLayouts[0];
      if (!filterInstanceId) {
        existingInstanceId = null;
      }
    }
  }

  // Template removal: allowedLayouts forced null but a template was applied.
  // Use same merge logic with a synthetic "container" template (just a default slot)
  // so content is properly extracted from nested structures, then strip markers.
  let removingTemplate = false;
  if (!templateId && previousTemplateId) {
    removingTemplate = true;
    templateId = '__none__';
    templates['__none__'] = {
      blocks: { '__default__': { '@type': 'slate', placeholder: 'default' } },
      blocks_layout: { items: ['__default__'] },
    };
  }

  // No template to apply - pass through
  if (!templateId) {
    for (const blockId of layout) {
      if (blocks[blockId]) {
        addItem(blocks[blockId], blockId);
      }
    }
    return items;
  }

  // Get or generate instanceId
  // For forced layouts (no existing instanceId), we use a WeakMap keyed by blocksDict
  // to ensure idempotency - same blocks object returns same generated instanceId
  let instanceId = existingInstanceId;
  if (!instanceId) {
    if (blocksDict && templateState.generatedInstanceIds.has(blocksDict)) {
      instanceId = templateState.generatedInstanceIds.get(blocksDict);
    } else {
      instanceId = generateUUID();
      if (blocksDict) {
        templateState.generatedInstanceIds.set(blocksDict, instanceId);
      }
    }
  }

  // Store for processNestedTemplateLevel (called from nested expandTemplatesSync calls)
  templateState.templateId = templateId;
  templateState.instanceId = instanceId;

  // Get or create instance context.
  // Always rebuild ctx when the instanceId is re-encountered (e.g. after save,
  // the API returns blocks with the same templateInstanceId but different content).
  // The ctx is mutated during processing (pendingContent consumed, emittedPlaceholders
  // populated) so it cannot be reused.
  let ctx = templateState.instances[instanceId];
  if (ctx) {
    delete templateState.instances[instanceId];
    ctx = null;
  }

  if (!ctx) {
    ctx = {
      templateId,
      template: null,
      instanceId,
      emittedPlaceholders: new Set(),
      pendingContent: new Map(),
      existingFixedBlockIds: new Map(),
      leadingStandaloneBlocks: [],
      trailingStandaloneBlocks: [],
      newTemplateIds: new Set(),
    };
    templateState.instances[instanceId] = ctx;

    // Initialize content collection for this instance
    if (existingInstanceId) {
      const allStandaloneBlocks = [];
      collectContentFromTree(
        { blocks, blocks_layout: { items: layout } },
        existingInstanceId,
        ctx.pendingContent,
        allStandaloneBlocks,
        ctx.existingFixedBlockIds
      );

      let foundFirstTemplateBlock = false;
      let lastTemplateBlockIndex = -1;
      for (let i = 0; i < layout.length; i++) {
        const block = blocks[layout[i]];
        if (block?.templateInstanceId === existingInstanceId) {
          if (!foundFirstTemplateBlock) foundFirstTemplateBlock = true;
          lastTemplateBlockIndex = i;
        }
      }

      for (let i = 0; i < layout.length; i++) {
        const blockId = layout[i];
        const block = blocks[blockId];
        if (!block) continue;
        if (!block.templateId && !block.templateInstanceId && !block.placeholder) {
          if (!foundFirstTemplateBlock || i < layout.indexOf(layout.find((id, idx) => {
            const b = blocks[id];
            return b?.templateInstanceId === existingInstanceId && idx <= lastTemplateBlockIndex;
          }))) {
            ctx.leadingStandaloneBlocks.push({ blockId, block });
          } else if (i > lastTemplateBlockIndex) {
            ctx.trailingStandaloneBlocks.push({ blockId, block });
          }
        }
      }
    } else {
      for (const blockId of layout) {
        const block = blocks[blockId];
        if (!block) continue;
        if (block.templateId && block.templateId !== templateId) {
          ctx.newTemplateIds.add(block.templateId);
        }
        if (block.fixed && block.templateId && block.templateId !== templateId) {
          if (block.readOnly) continue;
          if (block.placeholder) {
            ctx.existingFixedBlockIds.set(block.placeholder, { blockId, block });
          }
          continue;
        }
        if (block.placeholder) {
          const placeholder = block.placeholder;
          if (!ctx.pendingContent.has(placeholder)) {
            ctx.pendingContent.set(placeholder, []);
          }
          ctx.pendingContent.get(placeholder).push({ blockId, block });
        } else {
          if (!ctx.pendingContent.has('default')) {
            ctx.pendingContent.set('default', []);
          }
          ctx.pendingContent.get('default').push({ blockId, block });
        }
      }
    }
  }

  // Load template from pre-loaded map, falling back to sync loadTemplate callback.
  if (!ctx.template) {
    let template = templates[templateId];
    if (!template && loadTemplate) {
      template = loadTemplate(templateId);
      if (!template || typeof template.then === 'function') {
        throw new Error(`loadTemplate for "${templateId}" must return data synchronously, not a Promise. Use expandTemplates() for async loading, or pre-load templates via loadTemplates().`);
      }
      templates[templateId] = template;
    }
    if (!template) {
      throw new Error(`Template "${templateId}" not found in pre-loaded templates. Available: ${Object.keys(templates).join(', ')}`);
    }
    ctx.template = template;
  }

  const { template, emittedPlaceholders, pendingContent, leadingStandaloneBlocks, trailingStandaloneBlocks, existingFixedBlockIds } = ctx;

  // Process template (same as async version from here)
  const templateLayout = template.blocks_layout?.items || [];
  let firstFixedIndex = -1;
  let lastFixedIndex = -1;
  const slotPositions = {};

  for (let i = 0; i < templateLayout.length; i++) {
    const tplBlock = template.blocks?.[templateLayout[i]];
    if (!tplBlock?.placeholder) continue;
    if (tplBlock.fixed) {
      if (firstFixedIndex === -1) firstFixedIndex = i;
      lastFixedIndex = i;
    } else {
      if (firstFixedIndex === -1) {
        slotPositions[tplBlock.placeholder] = 'top';
      } else if (i > lastFixedIndex) {
        slotPositions[tplBlock.placeholder] = 'bottom';
      } else {
        slotPositions[tplBlock.placeholder] = 'middle';
      }
    }
  }

  for (const { blockId, block } of leadingStandaloneBlocks) {
    addItem(block, blockId);
  }

  let defaultInsertIndex = -1;
  let bottomSlotInsertIndex = -1;
  let topSlotInsertIndex = -1;

  for (const tplBlockId of templateLayout) {
    const tplBlock = template.blocks?.[tplBlockId];
    if (!tplBlock) continue;

    if (tplBlock.fixed) {
      const placeholder = tplBlock.placeholder;
      const existing = placeholder && existingFixedBlockIds?.get(placeholder);
      const blockId = existing?.blockId
        ? existing.blockId
        : (uuidGenerator ? uuidGenerator() : `${instanceId}::${tplBlockId}`);

      let blockContent = tplBlock;
      if (!tplBlock.readOnly && existing?.block) {
        blockContent = { ...tplBlock, value: existing.block.value };
      }

      // Look ahead in template layout for the next non-fixed placeholder at this level.
      // This preserves placeholder info even when all placeholder blocks are deleted.
      const tplIdx = templateLayout.indexOf(tplBlockId);
      let nextPlaceholder = undefined;
      for (let i = tplIdx + 1; i < templateLayout.length; i++) {
        const nextTplBlock = template.blocks?.[templateLayout[i]];
        if (nextTplBlock && !nextTplBlock.fixed && nextTplBlock.placeholder) {
          nextPlaceholder = nextTplBlock.placeholder;
          break;
        }
        if (nextTplBlock?.fixed) break; // Stop at next fixed block
      }

      // For container blocks, filter nested blocks to only those with template markers
      // (placeholder or templateId). Blocks without these are template-internal details
      // that should not be synced to pages. Also compute childPlaceholders.
      let childPlaceholders = undefined;
      let filteredBlocks = blockContent.blocks;
      let filteredLayout = blockContent.blocks_layout;
      if (tplBlock.blocks && isBlocksMap(tplBlock.blocks)) {
        const nestedLayout = tplBlock.blocks_layout?.items || Object.keys(tplBlock.blocks);
        const newNestedBlocks = {};
        const newNestedLayout = [];
        for (const nestedId of nestedLayout) {
          const nested = tplBlock.blocks[nestedId];
          if (!nested) continue;
          if (nested.placeholder || nested.templateId) {
            newNestedBlocks[nestedId] = nested;
            newNestedLayout.push(nestedId);
            if (!nested.fixed && nested.placeholder) {
              if (!childPlaceholders) childPlaceholders = {};
              if (!childPlaceholders['blocks']) childPlaceholders['blocks'] = nested.placeholder;
            }
          }
        }
        filteredBlocks = newNestedBlocks;
        filteredLayout = { items: newNestedLayout };
      }

      addItem(
        {
          ...blockContent,
          blocks: filteredBlocks,
          blocks_layout: filteredLayout,
          templateId: templateId,
          templateInstanceId: instanceId,
          ...(nextPlaceholder && { nextPlaceholder }),
          ...(childPlaceholders && { childPlaceholders }),
        },
        blockId
      );

      if (tplBlock.blocks && isBlocksMap(tplBlock.blocks)) {
        templateState.nestedContainers.set(filteredBlocks, {
          templateBlockId: tplBlockId,
          templateBlocks: filteredBlocks,
          templateLayout: filteredLayout.items,
        });
      }
      // Register object_list arrays (arrays of objects with templateId)
      for (const val of Object.values(tplBlock)) {
        if (Array.isArray(val) && val.length > 0 && val[0]?.templateId) {
          const itemIdField = '@id';
          templateState.nestedContainers.set(val, {
            templateBlockId: tplBlockId,
            templateBlocks: Object.fromEntries(val.map(item => [item[itemIdField], item])),
            templateLayout: val.map(item => item[itemIdField]),
          });
        }
      }
    } else {
      const placeholder = tplBlock.placeholder || 'default';
      const insertIndex = items.length;

      if (placeholder === 'default') {
        defaultInsertIndex = insertIndex;
      }
      const position = slotPositions[placeholder];
      if (position === 'bottom' && bottomSlotInsertIndex === -1) {
        bottomSlotInsertIndex = insertIndex;
      } else if (position === 'top' && topSlotInsertIndex === -1) {
        topSlotInsertIndex = insertIndex;
      }

      if (!emittedPlaceholders.has(placeholder)) {
        emittedPlaceholders.add(placeholder);
        const content = pendingContent.get(placeholder) || [];
        for (const { blockId, block } of content) {
          addItem(
            {
              ...block,
              templateId: templateId,
              templateInstanceId: instanceId,
              placeholder: placeholder,
            },
            blockId
          );
        }
        pendingContent.delete(placeholder);
      }
    }
  }

  const remainingContent = [];
  for (const [placeholder, content] of pendingContent) {
    if (!emittedPlaceholders.has(placeholder)) {
      emittedPlaceholders.add(placeholder);
      for (const { blockId, block } of content) {
        remainingContent.push({
          ...block,
          templateId: templateId,
          templateInstanceId: instanceId,
          placeholder: 'default',
          _orphaned: true,
          '@uid': blockId,
        });
      }
    }
  }

  if (remainingContent.length > 0) {
    let insertIndex = -1;
    if (defaultInsertIndex >= 0) {
      insertIndex = defaultInsertIndex;
    } else if (bottomSlotInsertIndex >= 0) {
      insertIndex = bottomSlotInsertIndex;
    } else if (topSlotInsertIndex >= 0) {
      insertIndex = topSlotInsertIndex;
    }

    if (insertIndex >= 0) {
      items.splice(insertIndex, 0, ...remainingContent);
    }
  }

  for (const { blockId, block } of trailingStandaloneBlocks) {
    addItem(block, blockId);
  }

  // Template removal: strip all template markers so blocks are clean
  if (removingTemplate) {
    for (const item of items) {
      delete item.templateId;
      delete item.templateInstanceId;
      delete item.placeholder;
      delete item.fixed;
      delete item.readOnly;
      delete item.nextPlaceholder;
      delete item.childPlaceholders;
      delete item._orphaned;
    }
  }

  return items;
}

// Make initBridge available globally
if (typeof window !== 'undefined') {
  window.initBridge = initBridge;
}

//////////////////////////////////////////////////////////////////////////////
// SVGs & Images should be exported using CDN to reduce the size of this file
// Icons from https://github.com/plone/quanta-icons/tree/main/icons unless specified as Pastanaga, in which case they're from https://pastanaga.io/icons/
//////////////////////////////////////////////////////////////////////////////
const deleteSVG = `<svg width="18px" height="18px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M4 6H20M16 6L15.7294 5.18807C15.4671 4.40125 15.3359 4.00784 15.0927 3.71698C14.8779 3.46013 14.6021 3.26132 14.2905 3.13878C13.9376 3 13.523 3 12.6936 3H11.3064C10.477 3 10.0624 3 9.70951 3.13878C9.39792 3.26132 9.12208 3.46013 8.90729 3.71698C8.66405 4.00784 8.53292 4.40125 8.27064 5.18807L8 6M18 6V16.2C18 17.8802 18 18.7202 17.673 19.362C17.3854 19.9265 16.9265 20.3854 16.362 20.673C15.7202 21 14.8802 21 13.2 21H10.8C9.11984 21 8.27976 21 7.63803 20.673C7.07354 20.3854 6.6146 19.9265 6.32698 19.362C6 18.7202 6 17.8802 6 16.2V6M14 10V17M10 10V17" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
const dragSVG = `<svg width="20px" height="20px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <g id="SVGRepo_bgCarrier" stroke-width="0"/>
  <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"/>
  <g id="SVGRepo_iconCarrier"> <path d="M8 6.5C9.38071 6.5 10.5 5.38071 10.5 4C10.5 2.61929 9.38071 1.5 8 1.5C6.61929 1.5 5.5 2.61929 5.5 4C5.5 5.38071 6.61929 6.5 8 6.5Z" fill="#4A5B68"/> <path d="M15.5 6.5C16.8807 6.5 18 5.38071 18 4C18 2.61929 16.8807 1.5 15.5 1.5C14.1193 1.5 13 2.61929 13 4C13 5.38071 14.1193 6.5 15.5 6.5Z" fill="#4A5B68"/> <path d="M10.5 12C10.5 13.3807 9.38071 14.5 8 14.5C6.61929 14.5 5.5 13.3807 5.5 12C5.5 10.6193 6.61929 9.5 8 9.5C9.38071 9.5 10.5 10.6193 10.5 12Z" fill="#4A5B68"/> <path d="M15.5 14.5C16.8807 14.5 18 13.3807 18 12C18 10.6193 16.8807 9.5 15.5 9.5C14.1193 9.5 13 10.6193 13 12C13 13.3807 14.1193 14.5 15.5 14.5Z" fill="#4A5B68"/> <path d="M10.5 20C10.5 21.3807 9.38071 22.5 8 22.5C6.61929 22.5 5.5 21.3807 5.5 20C5.5 18.6193 6.61929 17.5 8 17.5C9.38071 17.5 10.5 18.6193 10.5 20Z" fill="#4A5B68"/> <path d="M15.5 22.5C16.8807 22.5 18 21.3807 18 20C18 18.6193 16.8807 17.5 15.5 17.5C14.1193 17.5 13 18.6193 13 20C13 21.3807 14.1193 22.5 15.5 22.5Z" fill="#4A5B68"/> </g>
  </svg>`;
const boldSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
  <path d="M4.83252 20.9999H14.2185C17.6505 20.9999 20.0945 19.0239 20.0945 16.1639C20.0945 14.1879 18.8725 12.5239 16.7925 11.5879C18.3785 10.7559 19.3145 9.42994 19.3145 7.60994C19.3145 5.00994 17.0785 3.13794 13.8805 3.13794H4.83252V20.9999ZM8.65452 10.3399V6.41394H12.9445C14.3485 6.41394 15.3625 7.24594 15.3625 8.36394C15.3625 9.50794 14.3485 10.3399 12.9445 10.3399H8.65452ZM8.65452 17.7239V13.3559H13.5165C15.0505 13.3559 16.1425 14.2659 16.1425 15.5399C16.1425 16.8139 15.0505 17.7239 13.5165 17.7239H8.65452Z" fill="black"/>
</svg>`;
const italicSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
  <path fill-rule="evenodd" clip-rule="evenodd" d="M10 3H17V5H14.3584L11.4443 19H14V21L11.028 21H9L7 21V19H9.4163L12.3304 5H10V3Z" fill="black"/>
</svg>`;
// Pastanaga
const delSVG = `<svg xmlns="http://www.w3.org/2000/svg" height="24" width="24" viewBox="0 0 36 36" fill="none">
  <path fill-rule="evenodd" d="M31,17 L19.114,17 C18.533,16.863 15.451,16.107 13.666,15.066 C13.115,14.746 12.68,14.223 12.441,13.594 C11.776,11.844 11.589,9.432 14.551,7.834 C14.579,7.816 17.423,5.99 21.531,7.883 C21.556,7.897 24.074,9.269 24,11.911 L24,12 L25,12 L26,12.041 L26,12 L26,6 L24,6 L24,7.281 C23.227,6.53 22.507,6.138 22.419,6.092 C17.265,3.714 13.603,6.064 13.526,6.119 C8.981,8.563 9.946,12.657 10.572,14.304 C10.973,15.36 11.714,16.245 12.659,16.795 C12.779,16.865 12.905,16.933 13.033,17 L5,17 L5,19 L18.863,19 C23.002,20.084 24.039,22.3 24.057,22.333 C25.122,25.348 23.361,27.222 23.323,27.264 C20.638,29.732 16.212,29.021 16.103,29.005 C11.896,28.569 11.02,24.017 10.984,23.824 L10,24 L9,24 L9,30 L11,30 L11,28.359 C12.089,29.669 13.657,30.761 15.831,30.985 C15.909,30.999 16.631,31.118 17.683,31.118 C19.562,31.118 22.498,30.739 24.708,28.706 C24.821,28.593 27.438,25.9 25.924,21.617 C25.889,21.534 25.338,20.264 23.608,19 L31,19 L31,17 Z" fill="black"></path>
</svg>`;
const underlineSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
  <path d="M6 19V21H18V19H6Z" fill="black"/>
  <path d="M8 3V11C8 13.2091 9.79086 15 12 15C14.2091 15 16 13.2091 16 11V3H14V11C14 12.1046 13.1046 13 12 13C10.8954 13 10 12.1046 10 11V3H8Z" fill="black"/>
</svg>`;
const addSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
  <path d="M13 3H11V11H3V13H11V21H13V13H21V11H13V3Z" fill="black"/>
</svg>`;
const linkSVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
  <path d="M15 7V10H17V7C17 4.23858 14.7614 2 12 2C9.23858 2 7 4.23858 7 7V10H9V7C9 5.34315 10.3431 4 12 4C13.6569 4 15 5.34315 15 7Z" fill="black"/>
  <path d="M15 17V14H17V17C17 19.7614 14.7614 22 12 22C9.23858 22 7 19.7614 7 17V14H9V17C9 18.6569 10.3431 20 12 20C13.6569 20 15 18.6569 15 17Z" fill="black"/>
  <path d="M13 8H11V16H13V8Z" fill="black"/>
</svg>`;
const threeDotsSVG = `<svg width="24px" height="24px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M5 10C6.10457 10 7 10.8954 7 12C7 13.1046 6.10457 14 5 14C3.89543 14 3 13.1046 3 12C3 10.8954 3.89543 10 5 10Z" fill="#000000"/>
  <path d="M12 10C13.1046 10 14 10.8954 14 12C14 13.1046 13.1046 14 12 14C10.8954 14 10 13.1046 10 12C10 10.8954 10.8954 10 12 10Z" fill="#000000"/>
  <path d="M21 12C21 10.8954 20.1046 10 19 10C17.8954 10 17 10.8954 17 12C17 13.1046 17.8954 14 19 14C20.1046 14 21 13.1046 21 12Z" fill="#000000"/>
  </svg>`;
const settingsSVG = `<svg width="18px" height="18px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <circle cx="12" cy="12" r="3" stroke="#1C274C" stroke-width="1.5"/>
  <path d="M13.7654 2.15224C13.3978 2 12.9319 2 12 2C11.0681 2 10.6022 2 10.2346 2.15224C9.74457 2.35523 9.35522 2.74458 9.15223 3.23463C9.05957 3.45834 9.0233 3.7185 9.00911 4.09799C8.98826 4.65568 8.70226 5.17189 8.21894 5.45093C7.73564 5.72996 7.14559 5.71954 6.65219 5.45876C6.31645 5.2813 6.07301 5.18262 5.83294 5.15102C5.30704 5.08178 4.77518 5.22429 4.35436 5.5472C4.03874 5.78938 3.80577 6.1929 3.33983 6.99993C2.87389 7.80697 2.64092 8.21048 2.58899 8.60491C2.51976 9.1308 2.66227 9.66266 2.98518 10.0835C3.13256 10.2756 3.3397 10.437 3.66119 10.639C4.1338 10.936 4.43789 11.4419 4.43786 12C4.43783 12.5581 4.13375 13.0639 3.66118 13.3608C3.33965 13.5629 3.13248 13.7244 2.98508 13.9165C2.66217 14.3373 2.51966 14.8691 2.5889 15.395C2.64082 15.7894 2.87379 16.193 3.33973 17C3.80568 17.807 4.03865 18.2106 4.35426 18.4527C4.77508 18.7756 5.30694 18.9181 5.83284 18.8489C6.07289 18.8173 6.31632 18.7186 6.65204 18.5412C7.14547 18.2804 7.73556 18.27 8.2189 18.549C8.70224 18.8281 8.98826 19.3443 9.00911 19.9021C9.02331 20.2815 9.05957 20.5417 9.15223 20.7654C9.35522 21.2554 9.74457 21.6448 10.2346 21.8478C10.6022 22 11.0681 22 12 22C12.9319 22 13.3978 22 13.7654 21.8478C14.2554 21.6448 14.6448 21.2554 14.8477 20.7654C14.9404 20.5417 14.9767 20.2815 14.9909 19.902C15.0117 19.3443 15.2977 18.8281 15.781 18.549C16.2643 18.2699 16.8544 18.2804 17.3479 18.5412C17.6836 18.7186 17.927 18.8172 18.167 18.8488C18.6929 18.9181 19.2248 18.7756 19.6456 18.4527C19.9612 18.2105 20.1942 17.807 20.6601 16.9999C21.1261 16.1929 21.3591 15.7894 21.411 15.395C21.4802 14.8691 21.3377 14.3372 21.0148 13.9164C20.8674 13.7243 20.6602 13.5628 20.3387 13.3608C19.8662 13.0639 19.5621 12.558 19.5621 11.9999C19.5621 11.4418 19.8662 10.9361 20.3387 10.6392C20.6603 10.4371 20.8675 10.2757 21.0149 10.0835C21.3378 9.66273 21.4803 9.13087 21.4111 8.60497C21.3592 8.21055 21.1262 7.80703 20.6602 7C20.1943 6.19297 19.9613 5.78945 19.6457 5.54727C19.2249 5.22436 18.693 5.08185 18.1671 5.15109C17.9271 5.18269 17.6837 5.28136 17.3479 5.4588C16.8545 5.71959 16.2644 5.73002 15.7811 5.45096C15.2977 5.17191 15.0117 4.65566 14.9909 4.09794C14.9767 3.71848 14.9404 3.45833 14.8477 3.23463C14.6448 2.74458 14.2554 2.35523 13.7654 2.15224Z" stroke="#1C274C" stroke-width="1.5"/>
  </svg>`;
const linkSubmitSVG = `<img width="20px" height="20px" src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTIiIHZpZXdCb3g9IjAgMCAxNiAxMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTkuMDc2OTIgMTAuNDEwOEwxMC4yNTU0IDExLjU4OTNMMTUuODQ0NyA2LjAwMDAyTDEwLjI1NTQgMC40MTA3NjdMOS4wNzY5MiAxLjU4OTI4TDEyLjY1NDMgNS4xNjY2OUgwLjQ5OTUxMlY2LjgzMzM1SDEyLjY1NDNMOS4wNzY5MiAxMC40MTA4WiIgZmlsbD0id2hpdGUiLz4KPC9zdmc+Cg==" />`;
const linkFolderSVG = `<img width="20px" height="20px" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAACXBIWXMAAAsTAAALEwEAmpwYAAAAaklEQVR4nO2WywmAQAwF52IXWoBFWIvl2JFWJnh74nkFXQmExTeQc4b8CBhTopuYSRbYgSlTQMABLMAIdBkCCgoLPKK3paqkugXRWEBuAR5CvIb4EKmpU9wHJh++CKxBElfyramHxJh/cQJpdrBykxDdigAAAABJRU5ErkJggg==">`;
const linkCancelSVG = `<svg width="20px" height="20px" xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="100" height="100" viewBox="0,0,256,256">
<g fill="#ffffff" fill-rule="nonzero" stroke="none" stroke-width="1" stroke-linecap="butt" stroke-linejoin="miter" stroke-miterlimit="10" stroke-dasharray="" stroke-dashoffset="0" font-family="none" font-weight="none" font-size="none" text-anchor="none" style="mix-blend-mode: normal"><g transform="scale(8.53333,8.53333)"><path d="M7,4c-0.25587,0 -0.51203,0.09747 -0.70703,0.29297l-2,2c-0.391,0.391 -0.391,1.02406 0,1.41406l7.29297,7.29297l-7.29297,7.29297c-0.391,0.391 -0.391,1.02406 0,1.41406l2,2c0.391,0.391 1.02406,0.391 1.41406,0l7.29297,-7.29297l7.29297,7.29297c0.39,0.391 1.02406,0.391 1.41406,0l2,-2c0.391,-0.391 0.391,-1.02406 0,-1.41406l-7.29297,-7.29297l7.29297,-7.29297c0.391,-0.39 0.391,-1.02406 0,-1.41406l-2,-2c-0.391,-0.391 -1.02406,-0.391 -1.41406,0l-7.29297,7.29297l-7.29297,-7.29297c-0.1955,-0.1955 -0.45116,-0.29297 -0.70703,-0.29297z"></path></g></g>
</svg>`;
