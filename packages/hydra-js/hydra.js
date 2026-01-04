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
// Methods provided by THIS hydra.js as export
////////////////////////////////////////////////////////////////////////////////

// initBridge
// getTokenFromCookie
// onEditChange

// Debug logging - disabled by default, enable via initBridge options or window.HYDRA_DEBUG
let debugEnabled = true; // TEMP: Enable for debugging
const log = (...args) => debugEnabled && console.log('[HYDRA]', ...args);

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
   *   - allowedBlocks: Array of allowed block types (e.g., ['title', 'text', 'image', ...])
   *   - debug: Enable verbose logging (default: false)
   */
  constructor(adminOrigin, options = {}) {
    this.adminOrigin = adminOrigin;
    if (options.debug) debugEnabled = true;
    this.learnOriginFromFirstMessage = options._learnOriginFromFirstMessage || false;
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
    this.init(options); // Initialize the bridge
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
    // null blockUid means page-level data
    if (blockUid === null) {
      log('getBlockData: null blockUid, returning formData (page-level)');
      return this.formData;
    }

    // First try blockPathMap for nested block support
    const pathInfo = this.blockPathMap?.[blockUid];
    log('getBlockData:', blockUid, 'pathInfo:', pathInfo, 'blockPathMap keys:', Object.keys(this.blockPathMap || {}));
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
        // Inject virtual @type for object_list items (e.g., 'slider:slides')
        // This allows field type lookup to work without items having actual @type
        // IMPORTANT: Mutate the original object, don't return a copy, so that
        // modifications to the returned object update formData for inline editing sync
        if (pathInfo.itemType) {
          log('getBlockData: found object_list item via path, injecting @type:', pathInfo.itemType);
          current['@type'] = pathInfo.itemType;
        }
        log('getBlockData: found via path, @type:', current['@type']);
        return current;
      }
    }
    // Fallback to top-level blocks lookup
    const fallback = this.formData?.blocks?.[blockUid];
    log('getBlockData: fallback lookup, @type:', fallback?.['@type']);
    return fallback;
  }

  /**
   * Resolve a field path to determine the target block and field name.
   * Supports:
   * - "fieldName" -> block's own field (or page if no block context)
   * - "../fieldName" -> parent block's field (or page if at top level)
   * - "/fieldName" -> page-level field
   *
   * @param {string} fieldPath - The field path from data-editable-field
   * @param {string|null} blockId - Current block ID (null for page-level)
   * @returns {Object} { blockId: string|null, fieldName: string }
   */
  resolveFieldPath(fieldPath, blockId) {
    // Handle absolute path (page-level)
    if (fieldPath.startsWith('/')) {
      return { blockId: null, fieldName: fieldPath.slice(1) };
    }

    // If no block context, treat as page-level
    if (!blockId) {
      return { blockId: null, fieldName: fieldPath };
    }

    // Handle relative path with ../
    let currentBlockId = blockId;
    let remainingPath = fieldPath;

    while (remainingPath.startsWith('../')) {
      const pathInfo = this.blockPathMap?.[currentBlockId];
      if (!pathInfo?.parentId) {
        // Already at top level, next ../ goes to page
        return { blockId: null, fieldName: remainingPath.slice(3) };
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
   * Also checks if the blockElement itself has data-editable-field (Nuxt pattern).
   *
   * @param {HTMLElement} blockElement - The block element
   * @returns {HTMLElement[]} Array of editable field elements that belong to this block
   */
  getOwnEditableFields(blockElement) {
    const result = [];
    // Check if block element itself is an editable field (Nuxt: both attrs on same element)
    if (blockElement.hasAttribute('data-editable-field')) {
      result.push(blockElement);
    }
    // Also check descendants
    const allFields = blockElement.querySelectorAll('[data-editable-field]');
    for (const field of allFields) {
      if (this.fieldBelongsToBlock(field, blockElement)) {
        result.push(field);
      }
    }
    return result;
  }

  /**
   * Get the first editable field that belongs directly to a block, excluding nested blocks' fields.
   * Also checks if the blockElement itself has data-editable-field (Nuxt pattern).
   *
   * @param {HTMLElement} blockElement - The block element
   * @returns {HTMLElement|null} The first editable field or null if none
   */
  getOwnFirstEditableField(blockElement) {
    // Check if block element itself is an editable field (Nuxt: both attrs on same element)
    if (blockElement.hasAttribute('data-editable-field')) {
      return blockElement;
    }
    // Check descendants
    const allFields = blockElement.querySelectorAll('[data-editable-field]');
    for (const field of allFields) {
      if (this.fieldBelongsToBlock(field, blockElement)) {
        return field;
      }
    }
    return null;
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
    if (blockElement.getAttribute('data-editable-field') === fieldName) {
      return blockElement;
    }
    // Check descendants
    return blockElement.querySelector(`[data-editable-field="${fieldName}"]`);
  }

  /**
   * Get linkable fields that belong directly to a block.
   * Linkable fields use data-linkable-field attribute for URL/link editing.
   *
   * @param {HTMLElement} blockElement - The block element
   * @returns {Object} Map of field names to true
   */
  getLinkableFields(blockElement) {
    const linkableFields = {};
    // Check if block element itself has data-linkable-field
    const selfField = blockElement.getAttribute('data-linkable-field');
    if (selfField) {
      linkableFields[selfField] = true;
    }
    // Check descendants
    const allFields = blockElement.querySelectorAll('[data-linkable-field]');
    for (const field of allFields) {
      if (this.fieldBelongsToBlock(field, blockElement)) {
        const fieldName = field.getAttribute('data-linkable-field');
        if (fieldName) {
          linkableFields[fieldName] = true;
        }
      }
    }
    return linkableFields;
  }

  /**
   * Get media fields that belong directly to a block.
   * Media fields use data-media-field attribute for image/media editing.
   *
   * @param {HTMLElement} blockElement - The block element
   * @returns {Object} Map of field names to { rect: DOMRect } with element position
   */
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
    // This handles overlay elements that rely on parent for sizing (common in carousels/sliders)
    // Walk up the DOM tree to find the first ancestor with actual dimensions
    let current = element.parentElement;
    let depth = 0;
    const maxDepth = 10; // Safety limit

    while (current && depth < maxDepth) {
      const parentRect = current.getBoundingClientRect();

      if (parentRect.width > 0 && parentRect.height > 0) {
        console.log(
          `[HYDRA] data-media-field="${fieldName}" has zero dimensions. ` +
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
      `[HYDRA] data-media-field="${fieldName}" has zero dimensions (${rect.width}x${rect.height}). ` +
      `The element must have visible width and height for the image picker to position correctly. ` +
      `Set explicit dimensions or use a different element.`,
      element
    );
    return { top: rect.top, left: rect.left, width: rect.width, height: rect.height };
  }

  getMediaFields(blockElement) {
    const mediaFields = {};
    // Check if block element itself has data-media-field
    const selfField = blockElement.getAttribute('data-media-field');
    if (selfField) {
      mediaFields[selfField] = {
        rect: this.getEffectiveMediaRect(blockElement, selfField)
      };
    }
    // Check descendants
    const allFields = blockElement.querySelectorAll('[data-media-field]');
    for (const field of allFields) {
      if (this.fieldBelongsToBlock(field, blockElement)) {
        const fieldName = field.getAttribute('data-media-field');
        if (fieldName) {
          mediaFields[fieldName] = {
            rect: this.getEffectiveMediaRect(field, fieldName)
          };
        }
      }
    }
    return mediaFields;
  }

  /**
   * Get the add direction for a block element.
   * Uses data-block-add attribute if set, otherwise infers from nesting depth.
   * Even depths (0, 2, ...) → 'bottom' (vertical), odd depths (1, 3, ...) → 'right' (horizontal)
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

    // Empty blocks should not have an add button - they are meant to be replaced
    // via block chooser, not have blocks added after them
    const blockData = this.getBlockData(blockUid);
    if (blockData?.['@type'] === 'empty') {
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
    if (!blockElement) {
      // Deselection case - send null values
      this.sendMessageToParent({
        type: 'BLOCK_SELECTED',
        src,
        blockUid: null,
        rect: null,
      }, this.adminOrigin);
      return;
    }

    const blockUid = blockElement.getAttribute('data-block-uid');
    const rect = blockElement.getBoundingClientRect();
    const editableFields = this.getEditableFields(blockElement);
    const linkableFields = this.getLinkableFields(blockElement);
    const mediaFields = this.getMediaFields(blockElement);
    const addDirection = this.getAddDirection(blockElement);
    const focusedFieldName = options.focusedFieldName !== undefined
      ? options.focusedFieldName
      : this.focusedFieldName;
    const focusedLinkableField = options.focusedLinkableField !== undefined
      ? options.focusedLinkableField
      : this.focusedLinkableField;
    const focusedMediaField = options.focusedMediaField !== undefined
      ? options.focusedMediaField
      : this.focusedMediaField;

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

        function checkNavigation() {
          const newUrl = window.location.href;
          if (newUrl !== currentUrl) {
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
        setInterval(checkNavigation, 200);
      }

      detectNavigation((currentUrl) => {
        const currentUrlObj = new URL(currentUrl);
        if (window.location.pathname !== currentUrlObj.pathname) {
          window.parent.postMessage(
            {
              type: 'PATH_CHANGE',
              path: window.location.pathname,
            },
            this.adminOrigin,
          );
        } else if (window.location.hash !== currentUrlObj.hash) {
          const hash = window.location.hash;
          const i = hash.indexOf('/');
          window.parent.postMessage(
            {
              type: 'PATH_CHANGE',
              path: i !== -1 ? hash.slice(i) || '/' : '/',
            },
            this.adminOrigin,
          );
        }
      });

      // Get the access token from the URL
      const url = new URL(window.location.href);
      const access_token = url.searchParams.get('access_token');
      const isEditMode = url.searchParams.get('_edit') === 'true';
      if (access_token) {
        this.token = access_token;
        this._setTokenCookie(access_token);
      }

      if (isEditMode) {
        this.enableBlockClickListener();
        this.injectCSS();
        this.listenForSelectBlockMessage();
        this.setupScrollHandler();
        this.setupResizeHandler();

        // Send single INIT message with config - admin merges config before responding
        // This ensures blockPathMap is built with complete schema knowledge
        // Include current path so admin can navigate if iframe URL differs (e.g., after client-side nav)
        window.parent.postMessage(
          {
            type: 'INIT',
            voltoConfig: options?.voltoConfig,
            allowedBlocks: options?.allowedBlocks,
            currentPath: window.location.pathname,
          },
          this.adminOrigin,
        );

        const receiveInitialData = (e) => {
          if (e.origin === this.adminOrigin) {
            if (e.data.type === 'INITIAL_DATA') {
              // Store block field types metadata (blockId -> fieldName -> fieldType)
              this.blockFieldTypes = e.data.blockFieldTypes || {};
              log('Stored blockFieldTypes:', this.blockFieldTypes);

              // Central method sets formData, lastReceivedFormData, and blockPathMap
              this.setFormDataFromAdmin(e.data.data, 'INITIAL_DATA', e.data.blockPathMap);
              log('formData has blocks:', Object.keys(this.formData?.blocks || {}));
              log('Stored blockPathMap keys:', Object.keys(this.blockPathMap));

              // Store Slate configuration for keyboard shortcuts and toolbar
              this.slateConfig = e.data.slateConfig || { hotkeys: {}, toolbarButtons: [] };

              // Add nodeIds to all slate fields in all blocks
              this.addNodeIdsToAllSlateFields();

              // Call onContentChange callback directly to trigger initial render
              if (this.onContentChangeCallback) {
                this.onContentChangeCallback(this.formData);
              }
            }
          }
        };
        window.removeEventListener('message', receiveInitialData);
        window.addEventListener('message', receiveInitialData);
      }

      // Add a single document-level focus listener to track field changes
      // This avoids adding duplicate listeners and works for all blocks
      if (!this.fieldFocusListenerAdded) {
        this.fieldFocusListenerAdded = true;
        document.addEventListener('focus', (e) => {
          const target = e.target;
          const editableField = target.getAttribute('data-editable-field');

          // Only handle if it's an editable field in the currently selected block
          if (editableField && this.selectedBlockUid) {
            const blockElement = target.closest('[data-block-uid]');
            const blockUid = blockElement?.getAttribute('data-block-uid');

            if (blockUid === this.selectedBlockUid) {
              log('Field focused:', editableField);
              const previousFieldName = this.focusedFieldName;
              this.focusedFieldName = editableField;

              // Only update toolbar if field actually changed
              if (previousFieldName !== editableField) {
                log('Field changed from', previousFieldName, 'to', editableField, '- updating toolbar');

                // Send BLOCK_SELECTED message to update toolbar visibility
                const blockElement = document.querySelector(`[data-block-uid="${blockUid}"]`);
                if (blockElement) {
                  this.sendBlockSelected('fieldFocusListener', blockElement, { focusedFieldName: editableField });
                }
              }
            }
          }
        }, true); // Use capture phase to catch focus events before they bubble
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
      // Learn admin origin from first message if needed
      if (this.learnOriginFromFirstMessage && !this.adminOrigin) {
        this.adminOrigin = event.origin;
        this.learnOriginFromFirstMessage = false;
        log('Learned admin origin from first postMessage:', this.adminOrigin);
      }

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

            // Central method for setting form data with logging (also sets blockPathMap)
            this.setFormDataFromAdmin(event.data.data, 'FORM_DATA', event.data.blockPathMap);

            // Add nodeIds to all slate blocks before rendering
            // Admin UI never sends nodeIds, so we always need to add them
            this.addNodeIdsToAllSlateFields();

            // Extract formatRequestId early so it's available in rAF callbacks
            const formatRequestId = event.data.formatRequestId;

            // Call the callback first to trigger the re-render
            log('Calling onEditChange callback to trigger re-render');
            callback(this.formData);

            // Restore cursor position after re-render (use requestAnimationFrame to ensure DOM is updated)
            // If the message includes a transformed Slate selection, use that
            // Otherwise fall back to the old DOM-based cursor saving approach
            // Use double requestAnimationFrame to wait for ALL rendering to complete
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                // Mark empty blocks so they can be styled (must run on every render)
                this.markEmptyBlocks();

                // IMPORTANT: Ensure ZWS in empty inline elements BEFORE restoring selection
                // This allows cursor positioning inside empty formatting elements
                if (this.selectedBlockUid) {
                  const blockElement = document.querySelector(`[data-block-uid="${this.selectedBlockUid}"]`);
                  if (blockElement) {
                    // Re-attach mutation observer after DOM re-render
                    // The old observer was watching the old blockElement which no longer exists
                    this.observeBlockTextChanges(blockElement);
                    // Re-attach event listeners (keydown, paste, etc.) to the new DOM element
                    this.makeBlockContentEditable(blockElement);

                    // Re-attach ResizeObserver
                    // This is critical after drag-and-drop when block moves to new position
                    // For sidebar edits (no transformedSelection): pass skipInitialUpdate to prevent toolbar blink
                    const editableFields = this.getEditableFields(blockElement);
                    const isSidebarEdit = !event.data.transformedSelection;
                    this.observeBlockResize(blockElement, this.selectedBlockUid, editableFields, isSidebarEdit);

                    // Send BLOCK_SELECTED if toolbar operation OR if block/media field rects changed
                    // Block may resize/move after edits, media fields may change (e.g., clearing image → placeholder)
                    const newBlockRect = blockElement.getBoundingClientRect();
                    const newMediaFields = this.getMediaFields(blockElement);

                    // Check if block rect changed (size or position)
                    const blockRectChanged = !this.lastBlockRect ||
                      Math.abs(newBlockRect.top - this.lastBlockRect.top) > 1 ||
                      Math.abs(newBlockRect.left - this.lastBlockRect.left) > 1 ||
                      Math.abs(newBlockRect.width - this.lastBlockRect.width) > 1 ||
                      Math.abs(newBlockRect.height - this.lastBlockRect.height) > 1;

                    // Check if any media field rect changed
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

                    log('formDataHandler check:', {
                      blockRectChanged,
                      mediaFieldsChanged,
                      newBlockRect: { top: newBlockRect.top, height: newBlockRect.height },
                      newMediaFields,
                      lastMediaFields: this.lastMediaFields,
                    });

                    if (event.data.transformedSelection || blockRectChanged || mediaFieldsChanged) {
                      // Send updated rect to admin so toolbar/overlays follow the block
                      log('formDataHandler sending BLOCK_SELECTED with mediaFields:', newMediaFields);
                      this.sendBlockSelected('formDataHandler', blockElement);
                      this.lastBlockRect = { top: newBlockRect.top, left: newBlockRect.left, width: newBlockRect.width, height: newBlockRect.height };
                      this.lastMediaFields = JSON.parse(JSON.stringify(newMediaFields)); // Deep copy

                      // Reposition drag button to follow the block
                      if (this.dragHandlePositioner) {
                        this.dragHandlePositioner();
                      }
                    }
                  }
                }

                // Only restore selection for toolbar format operations (has transformedSelection)
                // NOT for sidebar edits - those should not steal focus from sidebar
                if (event.data.transformedSelection) {
                  // Store expected selection so selectionchange handler can suppress it
                  this.expectedSelectionFromAdmin = event.data.transformedSelection;
                  // Clear savedClickPosition so updateBlockUIAfterFormData won't overwrite
                  // the selection we're about to restore from transformedSelection
                  this.savedClickPosition = null;
                  try {
                    this.restoreSlateSelection(event.data.transformedSelection, this.formData);
                  } catch (e) {
                    console.error('[HYDRA] Error restoring selection:', e);
                  }
                }

                // Unblock after selection restore - iframe state is now fully settled
                // This ensures the next keypress sees correct DOM and selection state
                // This MUST run even if selection restore fails, so it's outside the try/catch
                if (formatRequestId && this.pendingTransform?.requestId === formatRequestId) {
                  log('Unblocking input for', this.pendingTransform.blockId, '- after selection restore');
                  this.setBlockProcessing(this.pendingTransform.blockId, false);
                }

              });
            });

            // After the re-render, add the toolbar
            // Note: Toolbar creation and block selection should NOT happen in FORM_DATA handler
            // Those are triggered by user clicks (selectBlock()) or SELECT_BLOCK messages
            // FORM_DATA is just data synchronization - it updates the rendered blocks
            // but should not change which block is selected or create/destroy toolbars

            // Update block UI overlay positions after form data changes
            // Blocks might have resized after form updates
            // Skip focus if this is from sidebar editing (no transformedSelection)
            const skipFocus = !event.data.transformedSelection;

            // For new block (needsBlockSwitch), call selectBlock to set up contenteditable etc.
            // For existing block, just update UI positions
            const blockUidToProcess = needsBlockSwitch ? adminSelectedBlockUid : this.selectedBlockUid;
            const blockHandler = needsBlockSwitch
              ? (el) => { log('Selecting new block from FORM_DATA:', blockUidToProcess); this.selectBlock(el); }
              : (el) => this.updateBlockUIAfterFormData(el, skipFocus);

            if (blockUidToProcess) {
              requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                  let blockElement = document.querySelector(`[data-block-uid="${blockUidToProcess}"]`);
                  // If block is hidden (e.g., carousel slide), try to make it visible first
                  if (blockElement && this.isElementHidden(blockElement)) {
                    log('FORM_DATA: block is hidden, trying to make visible:', blockUidToProcess);
                    const madeVisible = this.tryMakeBlockVisible(blockUidToProcess);
                    if (madeVisible) {
                      // Wait for block to become visible, then process it
                      const waitForVisible = async () => {
                        for (let i = 0; i < 10; i++) {
                          await new Promise((resolve) => setTimeout(resolve, 50));
                          blockElement = document.querySelector(`[data-block-uid="${blockUidToProcess}"]`);
                          if (blockElement && !this.isElementHidden(blockElement)) {
                            log('FORM_DATA: block now visible, processing');
                            blockHandler(blockElement);
                            this.ensureEditableFieldsHaveHeight();
                            return;
                          }
                        }
                        log('FORM_DATA: timeout waiting for block to become visible');
                      };
                      waitForVisible();
                      this.replayBufferedEvents();
                      return;
                    }
                  }
                  if (blockElement) {
                    blockHandler(blockElement);
                  }
                  // Ensure all editable fields have height (for newly added blocks)
                  this.ensureEditableFieldsHaveHeight();
                  // Replay any buffered keystrokes now that DOM is ready
                  this.replayBufferedEvents();
                });
              });
            }
          } else {
            throw new Error('No form data has been sent from the adminUI');
          }
        } else if (event.data.type === 'FLUSH_BUFFER') {
          // Parent is requesting a buffer flush before applying format
          // This ensures the parent's Slate editor has the latest text
          const requestId = event.data.requestId;
          log('Received FLUSH_BUFFER request, requestId:', requestId, 'savedSelection:', this.savedSelection);

          // Block input during format operation - will be unblocked when FORM_DATA arrives
          // This prevents any text changes from being sent while format is being applied
          // Block input and track requestId for matching with FORM_DATA
          if (this.selectedBlockUid) {
            this.setBlockProcessing(this.selectedBlockUid, true, requestId);
          }

          // Flush with requestId - if there's pending text, it will be included in INLINE_EDIT_DATA
          const hadPendingText = this.flushPendingTextUpdates(requestId);

          if (hadPendingText) {
            // requestId was included in INLINE_EDIT_DATA, parent will handle coordination
            log('Flushed pending text with requestId, waiting for Redux sync');
          } else {
            // No pending text - send BUFFER_FLUSHED immediately (safe to proceed)
            // Include current selection so toolbar has it when applying format
            const selection = this.serializeSelection();
            log('No pending text, sending BUFFER_FLUSHED with selection:', selection);
            this.sendMessageToParent({
              type: 'BUFFER_FLUSHED',
              requestId: requestId,
              selection: selection,
            });
          }
        } else if (event.data.type === 'SLATE_ERROR') {
          // Handle errors from Slate formatting operations
          console.error('[HYDRA] Received SLATE_ERROR:', event.data.error);
          const blockId = event.data.blockId;

          // Clear the processing state if it matches this block
          if (blockId && this.pendingTransform?.blockId === blockId) {
            log('Clearing processing state due to SLATE_ERROR');
            this.setBlockProcessing(blockId, false);
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
    const blockElement = document.querySelector(`[data-block-uid="${blockUid}"]`);
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
      const clickedField = clickedElement.closest('[data-editable-field]');
      log('Click event path - found clickedField:', !!clickedField);
      if (clickedField && this.fieldBelongsToBlock(clickedField, blockElement)) {
        fieldToFocus = clickedField.getAttribute('data-editable-field');
        log('Got field from click:', fieldToFocus);
      }
    }

    // If no clicked field found, use the first editable field that belongs to THIS block
    if (!fieldToFocus) {
      const firstEditableField = this.getOwnFirstEditableField(blockElement);
      log('querySelector path - found:', !!firstEditableField);
      if (firstEditableField) {
        fieldToFocus = firstEditableField.getAttribute('data-editable-field');
        log('Got field from querySelector:', fieldToFocus);
      }
    }

    // Update focusedFieldName and recreate toolbar if field changed
    if (fieldToFocus !== this.focusedFieldName) {
      log('Updating focusedFieldName from', this.focusedFieldName, 'to', fieldToFocus);
      this.focusedFieldName = fieldToFocus;

      // Send BLOCK_SELECTED message to update toolbar visibility
      const blockElement = document.querySelector(`[data-block-uid="${blockUid}"]`);
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
      // Handle data-block-selector clicks (carousel nav buttons, etc.)
      // Don't stopPropagation or preventDefault - let frontend handle visibility changes
      const selectorElement = event.target.closest('[data-block-selector]');
      if (selectorElement) {
        const selector = selectorElement.getAttribute('data-block-selector');
        this.handleBlockSelector(selector, selectorElement);
        return;
      }

      // Stop propagation for block clicks (but not selector clicks above)
      event.stopPropagation();

      const blockElement = event.target.closest('[data-block-uid]');
      if (blockElement) {
        // Skip synthetic clicks (keyboard activation like space on button) on contenteditable elements
        // event.detail === 0 indicates keyboard-triggered click
        const target = event.target;
        if (target.isContentEditable && event.detail === 0) {
          event.preventDefault(); // Prevent button activation
          return; // Don't re-select block - preserves cursor for text input
        }

        // Prevent link navigation in edit mode (for blocks wrapped in links)
        const linkElement = event.target.closest('a');
        if (linkElement) {
          event.preventDefault();
        }

        // Store click position relative to the editable element for cursor positioning
        // Using relative coordinates ensures focus()/scroll doesn't invalidate the position
        // Also store the target for field detection
        const clickedEditableField = event.target.closest('[data-editable-field]');
        const editableField = clickedEditableField || blockElement.querySelector('[data-editable-field]');

        // Detect clicked linkable and media fields
        const clickedLinkableField = event.target.closest('[data-linkable-field]');
        const clickedMediaField = event.target.closest('[data-media-field]');

        if (editableField) {
          const rect = editableField.getBoundingClientRect();
          this.lastClickPosition = {
            relativeX: event.clientX - rect.left,
            relativeY: event.clientY - rect.top,
            editableField: editableField.getAttribute('data-editable-field'),
            target: event.target, // For field detection
            linkableField: clickedLinkableField?.getAttribute('data-linkable-field') || null,
            mediaField: clickedMediaField?.getAttribute('data-media-field') || null,
          };
        } else {
          this.lastClickPosition = {
            target: event.target,
            linkableField: clickedLinkableField?.getAttribute('data-linkable-field') || null,
            mediaField: clickedMediaField?.getAttribute('data-media-field') || null,
          };
        }
        this.selectBlock(blockElement);
      } else {
        // No block - check for page-level fields
        const pageField = event.target.closest('[data-media-field], [data-linkable-field], [data-editable-field]');
        if (pageField) {
          event.preventDefault();
          this.selectedBlockUid = null;

          // Detect focused field type
          this.focusedMediaField = pageField.getAttribute('data-media-field');
          this.focusedLinkableField = pageField.getAttribute('data-linkable-field');
          this.focusedFieldName = pageField.getAttribute('data-editable-field');

          // Make page-level text fields editable (same as selectBlock does for blocks)
          if (this.focusedFieldName) {
            this.isInlineEditing = true;
            this.restoreContentEditableOnFields(pageField, 'pageFieldClick');
            this.observeBlockTextChanges(pageField);
          }

          // Send BLOCK_SELECTED with pageField as "block" - blockUid will be null
          this.sendBlockSelected('pageFieldClick', pageField);
        }
      }
    };

    document.removeEventListener('click', this.blockClickHandler, true);
    document.addEventListener('click', this.blockClickHandler, true);

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
        if (!this.selectedBlockUid) return;

        // Don't interfere with escape in modals, dropdowns, etc.
        const isInPopup = e.target.closest('.volto-hydra-dropdown-menu, .blocks-chooser, [role="dialog"]');
        if (isInPopup) return;

        e.preventDefault();

        // Get parent from blockPathMap
        const pathInfo = this.blockPathMap?.[this.selectedBlockUid];
        const parentId = pathInfo?.parentId || null;
        log('Escape key - selecting parent:', parentId, 'from:', this.selectedBlockUid);

        if (parentId) {
          // Select the parent block
          const parentElement = document.querySelector(`[data-block-uid="${parentId}"]`);
          if (parentElement) {
            this.selectBlock(parentElement, 'escapeKey');
          }
        } else {
          // No parent - deselect by sending BLOCK_SELECTED with null
          this.selectedBlockUid = null;
          this.sendBlockSelected('escapeKey', null);
        }
      };
      document.addEventListener('keydown', this._escapeKeyHandler, true);
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
  setBlockProcessing(blockId, processing = true, requestId = null) {
    log('setBlockProcessing:', { blockId, processing, requestId });

    if (processing) {
      log('BLOCKING input for', blockId);
      // Clear any existing buffer when starting new blocking
      this.eventBuffer = [];
      this.blockedBlockId = blockId;

      // Create keyboard blocker function that buffers keydown events for replay
      // Attached to document so it survives DOM re-renders
      if (!this._documentKeyboardBlocker) {
        this._documentKeyboardBlocker = (e) => {
          // Only block if we have an active blocked block
          if (!this.blockedBlockId) return;

          // Check if event is targeting our blocked block (even after re-render)
          const targetBlock = e.target.closest?.('[data-block-uid]');
          if (!targetBlock || targetBlock.getAttribute('data-block-uid') !== this.blockedBlockId) {
            return; // Not our block, let it through
          }

          // Buffer keydown events for replay after transform completes
          if (e.type === 'keydown') {
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
          e.preventDefault();
          e.stopPropagation();
          return false;
        };

        // Attach to document so it survives DOM re-renders
        document.addEventListener('keydown', this._documentKeyboardBlocker, true);
        document.addEventListener('keypress', this._documentKeyboardBlocker, true);
        document.addEventListener('input', this._documentKeyboardBlocker, true);
        document.addEventListener('beforeinput', this._documentKeyboardBlocker, true);
      }

      // Visual feedback on current element
      const block = document.querySelector(`[data-block-uid="${blockId}"]`);
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
      const block = document.querySelector(`[data-block-uid="${blockId}"]`);
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
    const currentBlock = document.querySelector(`[data-block-uid="${blockId}"]`);
    const currentEditable = currentBlock?.querySelector('[contenteditable="true"]');
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

    // Build up text string from consecutive printable characters
    let textToInsert = '';
    for (const evt of buffer) {
      if (evt.key.length === 1 && !evt.ctrlKey && !evt.metaKey) {
        textToInsert += evt.key;
      }
      // Note: special keys are ignored for now - they're complex to replay
    }

    if (textToInsert) {
      // Insert text directly using Selection API
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);

        // Delete any selected content first
        if (!range.collapsed) {
          range.deleteContents();
        }

        // Insert the text
        const textNode = document.createTextNode(textToInsert);
        range.insertNode(textNode);

        // Move cursor after inserted text
        range.setStartAfter(textNode);
        range.setEndAfter(textNode);
        selection.removeAllRanges();
        selection.addRange(range);

        log('Inserted buffered text:', textToInsert);

        // Manually trigger text change handler since insertNode creates a childList mutation
        // but our MutationObserver only watches for characterData mutations
        const editableField = currentEditable.closest('[data-editable-field]') || currentEditable;
        if (editableField && this.isInlineEditing) {
          this.handleTextChange(editableField, textNode.parentElement, textNode);
        }
      }
    }
  }

  /**
   * Handles timeout when a Slate transform takes too long to respond.
   * Shows error state and permanently disables editing to prevent data corruption.
   *
   * @param {string} blockId - Block UID that timed out
   */
  handleTransformTimeout(blockId) {
    const block = document.querySelector(`[data-block-uid="${blockId}"]`);
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
  // Cursor Position Correction - Handle template whitespace
  ////////////////////////////////////////////////////////////////////////////////

  /**
   * Checks if a node is on invalid whitespace (text node outside any data-node-id element).
   * This happens when cursor lands on template whitespace in Vue/Nuxt templates.
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

      // If this element is an editable field itself, it's valid
      if (node.hasAttribute?.('data-editable-field')) {
        return false;
      }

      // Check if this element is inside a block that has slate fields
      const blockElement = node.closest?.('[data-block-uid]');
      if (!blockElement) {
        return false;
      }

      // Check if there's any data-node-id element inside the block
      // (could be nested or on same element as editable-field)
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
      if (current.nodeType === Node.ELEMENT_NODE && current.hasAttribute?.('data-editable-field')) {
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
    if (node.nodeType === Node.ELEMENT_NODE && node.hasAttribute?.('data-editable-field')) {
      container = node;
    }
    // Check if we can find editable field by walking up
    if (!container) {
      let current = node.parentNode;
      while (current && !current.hasAttribute?.('data-editable-field')) {
        current = current.parentNode;
      }
      container = current;
    }
    // For element nodes (like block wrapper), also check inside for editable field
    if (!container && node.nodeType === Node.ELEMENT_NODE) {
      container = node.querySelector?.('[data-editable-field]');
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
      const textNode = walker.nextNode();
      log('getValidPositionForWhitespace: returning start of first text node:', textNode?.textContent?.substring(0, 20));
      return textNode ? { textNode, offset: 0 } : null;
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
      while (editableField && !editableField.hasAttribute?.('data-editable-field')) {
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
    while (editableField && !editableField.hasAttribute?.('data-editable-field')) {
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
    const fieldName = editableField.getAttribute('data-editable-field');
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
      if (current.hasAttribute('data-editable-field')) {
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
        !parent.hasAttribute?.('data-editable-field')
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
          !parent.hasAttribute?.('data-editable-field');

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
      const hasEditableField = current.hasAttribute?.('data-editable-field');
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
      // Must process BEFORE checking editable-field since element can have both
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
          checkNode.hasAttribute?.('data-editable-field') ||
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
      while (container && !container.hasAttribute?.('data-editable-field')) {
        container = container.parentNode;
      }
      const blockElement = container?.closest?.('[data-block-uid]');
      const blockUid = blockElement?.getAttribute('data-block-uid') || 'unknown';
      const fieldName = container?.getAttribute?.('data-editable-field') || 'unknown';

      // Check if this field is supposed to be a Slate field
      // Use getFieldType which handles page-level fields (e.g., /title) correctly
      const fieldType = blockUid !== 'unknown' ? this.getFieldType(blockUid, fieldName) : undefined;

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

      const errorMsg =
        `Block: ${blockUid}, Field: ${fieldName}\n\n` +
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
    // Only restore on THIS block's own fields, not nested blocks' fields
    const editableFields = this.getOwnEditableFields(blockElement);
    // Get blockUid from the element - don't rely on this.selectedBlockUid as it may not be set yet
    const blockUid = blockElement.getAttribute('data-block-uid');
    log(`restoreContentEditableOnFields called from ${caller}: found ${editableFields.length} fields for block ${blockUid}`);
    editableFields.forEach((field) => {
      const fieldPath = field.getAttribute('data-editable-field');
      // Use getFieldType which handles page-level fields (e.g., /title) correctly
      const fieldType = this.getFieldType(blockUid, fieldPath);
      const wasEditable = field.getAttribute('contenteditable') === 'true';
      // Only set contenteditable for text-editable fields (string, textarea, slate)
      if (this.fieldTypeIsTextEditable(fieldType)) {
        field.setAttribute('contenteditable', 'true');
        log(`  ${fieldPath}: ${wasEditable ? 'already editable' : 'SET editable'} (type: ${fieldType})`);

        // For plain string fields (single-line), prevent Enter key from creating new lines
        if (this.fieldTypeIsPlainString(fieldType) && !field._enterKeyHandler) {
          field._enterKeyHandler = (e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
            }
          };
          field.addEventListener('keydown', field._enterKeyHandler);
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

      // If element has no data-editable-field, remove contenteditable
      if (!el.hasAttribute('data-editable-field')) {
        el.removeAttribute('contenteditable');
        log(`  Removed stale contenteditable from element without data-editable-field`);
      }
    });
  }

  /**
   * Ensure all editable fields on the page have minimum height so users can click them.
   * Called after FORM_DATA to handle newly added blocks that haven't been selected yet.
   * Only sets min-height on fields that have zero height (respects existing styling).
   */
  ensureEditableFieldsHaveHeight() {
    const allEditableFields = document.querySelectorAll('[data-editable-field]');
    allEditableFields.forEach((field) => {
      const rect = field.getBoundingClientRect();
      if (rect.height === 0) {
        field.style.minHeight = '1.5em';
      }
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
   * ZWS characters are added for cursor positioning in empty elements and should be
   * removed when serializing text back to Slate.
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
    const editableFields = tempDiv.querySelectorAll('[data-editable-field]');
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
      'data-editable-field',
    ];
    tempDiv.querySelectorAll('*').forEach((el) => {
      internalAttrs.forEach((attr) => el.removeAttribute(attr));
    });

    return tempDiv.innerHTML;
  }

  /**
   * Strip zero-width spaces from DOM text nodes within a container.
   * Called after user types to remove ZWS that was added for cursor positioning.
   * Only removes ZWS from text nodes that have other content (not from empty-except-ZWS nodes).
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
   * Marks empty blocks in the DOM with a data attribute for styling.
   * This allows hydra to style empty blocks without requiring the renderer
   * to add special attributes.
   */
  markEmptyBlocks() {
    const allBlocks = document.querySelectorAll('[data-block-uid]');
    allBlocks.forEach((blockElement) => {
      const blockUid = blockElement.getAttribute('data-block-uid');
      const blockData = this.getBlockData(blockUid);
      if (blockData?.['@type'] === 'empty') {
        blockElement.setAttribute('data-hydra-empty', 'true');
      } else {
        blockElement.removeAttribute('data-hydra-empty');
      }
    });
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

    // Send updated block position to Admin UI for toolbar/overlay positioning
    const currentRect = blockElement.getBoundingClientRect();

    // For skipFocus (sidebar edits): only send if position actually changed (e.g., after drag-and-drop)
    // For !skipFocus (format operations): always send
    let shouldSendBlockSelected = !skipFocus;

    if (skipFocus && this._lastBlockRect) {
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

    // Update _lastBlockRect for future comparisons
    this._lastBlockRect = currentRect;

    // Always reposition drag button after DOM updates - block may have moved
    if (this.dragHandlePositioner) {
      this.dragHandlePositioner();
    }

    // Re-attach ResizeObserver to the new DOM element
    // React re-renders may have replaced the block element, so our old observer
    // would be watching a detached element. This ensures we catch future size
    // changes (e.g., image loading after a re-render).
    // For sidebar edits: pass skipInitialUpdate to prevent spurious BLOCK_SELECTED from immediate observer fire
    const editableFields = this.getEditableFields(blockElement);
    this.observeBlockResize(blockElement, this.selectedBlockUid, editableFields, skipFocus);

    // Also re-attach the text change observer for the same reason
    this.observeBlockTextChanges(blockElement);
  }

  /**
   * Selects a block and communicates the selection to the adminUI.
   *
   * @param {HTMLElement} blockElement - The block element to select.
   */
  selectBlock(blockElement) {
    const caller = new Error().stack?.split('\n')[2]?.trim() || 'unknown';
    log('selectBlock called for:', blockElement?.getAttribute('data-block-uid'), 'from:', caller);
    if (!blockElement) return;

    const blockUid = blockElement.getAttribute('data-block-uid');
    const isSelectingSameBlock = this.selectedBlockUid === blockUid;

    // Store for use in async callback (focus handler uses this to decide preventScroll)
    this._isReselectingSameBlock = isSelectingSameBlock;

    // Only scroll block into view when selecting a NEW block (not reselecting same block)
    // This prevents unwanted scroll-back when user has scrolled the selected block off screen
    if (!isSelectingSameBlock) {
      const toolbarMargin = 50; // Toolbar is ~40px tall
      const addButtonMargin = 50; // Add button is ~30px tall
      const scrollRect = blockElement.getBoundingClientRect();
      const viewportHeight = window.innerHeight;

      if (scrollRect.top < toolbarMargin || scrollRect.bottom > viewportHeight - addButtonMargin) {
        // Block or its UI elements are outside viewport - scroll to center it
        const blockCenter = scrollRect.top + scrollRect.height / 2;
        const viewportCenter = viewportHeight / 2;
        window.scrollBy({ top: blockCenter - viewportCenter, behavior: 'instant' });
      }
    }

    // Flush any pending text updates from the previous block before switching
    // Also clear event buffer - user is reorienting to a new block
    if (!isSelectingSameBlock) {
      this.flushPendingTextUpdates();
      this.eventBuffer = [];
    }

    this.isInlineEditing = true;

    // Set contenteditable on all text-editable fields
    this.restoreContentEditableOnFields(blockElement, 'selectBlock');

    // For slate blocks (value field), also set up paste/keydown handlers
    // Check blockElement itself first (Nuxt puts both attributes on same element)
    // then fall back to querying for child elements
    let valueField = blockElement.hasAttribute('data-editable-field') &&
                     blockElement.getAttribute('data-editable-field') === 'value'
                     ? blockElement
                     : blockElement.querySelector('[data-editable-field="value"]');
    if (valueField) {
      this.makeBlockContentEditable(valueField);
    }

    // Remove border and button from the previously selected block
    if (
      this.prevSelectedBlock === null ||
      this.prevSelectedBlock?.getAttribute('data-block-uid') !==
        blockElement?.getAttribute('data-block-uid')
    ) {
      if (this.currentlySelectedBlock) {
        this.deselectBlock(
          this.currentlySelectedBlock?.getAttribute('data-block-uid'),
          blockElement?.getAttribute('data-block-uid'),
        );
      }

      if (this.formData && !isSelectingSameBlock) {
        // Add nodeIds if this block has slate fields (only on first selection)
        const blockFieldTypes = this.blockFieldTypes?.[blockUid] || {};
        const hasSlateField = Object.values(blockFieldTypes).some(
          fieldType => this.fieldTypeIsSlate(fieldType)
        );
        if (hasSlateField) {
          // Use getBlockData to handle nested blocks
          const block = this.getBlockData(blockUid);
          if (block) {
            // Add nodeIds to each slate field, following the same pattern as addNodeIdsToAllSlateFields
            Object.keys(blockFieldTypes).forEach((fieldName) => {
              if (this.fieldTypeIsSlate(blockFieldTypes[fieldName]) && block[fieldName]) {
                block[fieldName] = this.addNodeIds(block[fieldName]);
              }
            });
          }
          // NodeIds are now added to this.formData for internal use
          // No need to send anywhere - they're already in memory for DOM manipulation
        }
      }

      this.currentlySelectedBlock = blockElement;
      this.prevSelectedBlock = blockElement;
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

    // Detect focused fields from click location
    if (this.lastClickPosition?.target) {
      // Find the clicked editable field
      const clickedElement = this.lastClickPosition.target;
      const clickedField = clickedElement.closest('[data-editable-field]');
      if (clickedField) {
        this.focusedFieldName = clickedField.getAttribute('data-editable-field');
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

    // If no clicked field, use the first editable field that belongs to THIS block
    if (!this.focusedFieldName) {
      const firstEditableField = this.getOwnFirstEditableField(blockElement);
      if (firstEditableField) {
        this.focusedFieldName = firstEditableField.getAttribute('data-editable-field');
        log('Set focusedFieldName to first editable field:', this.focusedFieldName);
      } else {
        // No editable fields in this block (e.g., image blocks or container blocks)
        log('No editable fields found, focusedFieldName remains null');
      }
    }

    // Store rect and show flags for BLOCK_SELECTED message (sent after selection is established)
    const rect = blockElement.getBoundingClientRect();
    const editableFields = this.getEditableFields(blockElement);
    const linkableFields = this.getLinkableFields(blockElement);
    const mediaFields = this.getMediaFields(blockElement);
    // Get add button direction (right, bottom, hidden) - uses attribute or infers from nesting depth
    const addDirection = this.getAddDirection(blockElement);
    this._pendingBlockSelected = {
      blockUid,
      rect: {
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      },
      editableFields, // Map of fieldName -> fieldType from DOM
      linkableFields, // Map of fieldName -> true for URL/link fields
      mediaFields, // Map of fieldName -> true for image/media fields
      focusedFieldName: this.focusedFieldName,
      focusedLinkableField: this.focusedLinkableField,
      focusedMediaField: this.focusedMediaField,
      addDirection, // Direction for add button positioning
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

    // Create drag handle for block reordering
    // This creates an invisible button in the iframe positioned under the parent's visual drag handle
    // Mouse events pass through the parent's visual (which has pointerEvents: 'none') to this button
    this.createDragHandle(blockElement);

    // Observe block text changes for inline editing
    this.observeBlockTextChanges(blockElement);

    // Observe block size changes (e.g., image loading, content changes)
    // This updates the selection outline when block dimensions change
    this.observeBlockResize(blockElement, blockUid, editableFields);

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
            // We're expecting a specific selection from Admin
            if (!this.savedSelection) {
              // Selection serialization failed (DOM might be re-rendering)
              // Don't send anything yet - wait for stable DOM
              log('selectionchange: expectedSelectionFromAdmin set but savedSelection null - waiting');
              return;
            }
            const expected = this.expectedSelectionFromAdmin;
            const current = this.savedSelection;
            // Compare anchor and focus paths and offsets
            const matches =
              JSON.stringify(expected.anchor) === JSON.stringify(current.anchor) &&
              JSON.stringify(expected.focus) === JSON.stringify(current.focus);
            log('selectionchange: comparing selections', {
              expected: JSON.stringify(expected),
              current: JSON.stringify(current),
              matches,
            });
            if (matches) {
              // Same selection as Admin sent - this is the restore, suppress it
              log('Selection matches Admin restore - not sending back');
              return;
            } else {
              // Different selection - user moved cursor/selected text, clear expected
              log('Selection differs from Admin restore - user action');
              this.expectedSelectionFromAdmin = null;
            }
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
        const currentBlockElement = document.querySelector(`[data-block-uid="${this.selectedBlockUid}"]`);
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
            const fieldPath = contentEditableField.getAttribute('data-editable-field');
            // Use getFieldType which handles page-level fields (e.g., /title) correctly
            const fieldType = fieldPath ? this.getFieldType(this.selectedBlockUid, fieldPath) : undefined;

            if (this.fieldTypeIsTextEditable(fieldType)) {
              // Only call focus if not already focused
              // Calling focus() on already-focused element can disrupt cursor position
              const isAlreadyFocused = document.activeElement === contentEditableField;
              log('selectBlock focus check:', { isAlreadyFocused, activeElement: document.activeElement?.tagName, contentEditableField: contentEditableField.tagName });
              if (!isAlreadyFocused) {
                log('selectBlock calling focus() on field');
                // Use preventScroll when reselecting same block to avoid scroll-back bug
                // (user may have scrolled the block off screen intentionally)
                contentEditableField.focus({ preventScroll: this._isReselectingSameBlock });
              } else {
                log('selectBlock skipping focus() - already focused');
              }

              // If field was already editable AND already focused, browser already handled
              // cursor positioning on click - don't redo it (causes race with typing)
              // But if we had to call focus(), we need to restore click position because
              // focus() moves cursor to end of text
              if (wasAlreadyEditable && isAlreadyFocused) {
                log('Field already editable and focused, trusting browser click positioning');
                this.lastClickPosition = null;
              } else if (this.lastClickPosition) {
                // Need to position cursor at click location
                // Convert relative position back to screen coordinates using current element position
                const currentRect = contentEditableField.getBoundingClientRect();
                const clientX = currentRect.left + this.lastClickPosition.relativeX;
                const clientY = currentRect.top + this.lastClickPosition.relativeY;

                log('Positioning cursor at click location:', {
                  relativeX: this.lastClickPosition.relativeX,
                  relativeY: this.lastClickPosition.relativeY,
                  clientX,
                  clientY,
                  wasAlreadyEditable,
                  isAlreadyFocused,
                });

                // Save click position for FORM_DATA handler to use after renderer updates
                this.savedClickPosition = {
                  relativeX: this.lastClickPosition.relativeX,
                  relativeY: this.lastClickPosition.relativeY,
                  editableField: this.lastClickPosition.editableField,
                };

                // Only restore click position if there's no existing non-collapsed selection
                // (e.g., from Meta+A or programmatic selection)
                const currentSelection = window.getSelection();
                const hasNonCollapsedSelection = currentSelection &&
                  currentSelection.rangeCount > 0 &&
                  !currentSelection.getRangeAt(0).collapsed;

                if (!hasNonCollapsedSelection) {
                  // Position cursor at the click location using caretRangeFromPoint
                  const range = document.caretRangeFromPoint(clientX, clientY);
                  log('caretRangeFromPoint result:', range ? {
                    startContainer: range.startContainer.nodeName,
                    startOffset: range.startOffset,
                    text: range.startContainer.textContent?.substring(0, 30),
                  } : null);
                  if (range) {
                    // Validate position before setting (may land on invalid whitespace)
                    const validPos = this.getValidatedPosition(range.startContainer, range.startOffset);
                    const finalRange = document.createRange();
                    finalRange.setStart(validPos.node, validPos.offset);
                    finalRange.collapse(true);
                    const selection = window.getSelection();
                    selection.removeAllRanges();
                    selection.addRange(finalRange);
                    log('Cursor positioned at offset:', validPos.offset);
                  }
                } else {
                  log('Skipping cursor positioning - non-collapsed selection exists');
                }

                // Clear lastClickPosition - we've used it to position cursor
                // Keep savedClickPosition for FORM_DATA handler in case React re-renders
                // (staleness check in updateBlockUIAfterFormData handles old positions)
                this.lastClickPosition = null;
              }
            } else {
              // No lastClickPosition, just log that we skipped cursor positioning
              log('No lastClickPosition, skipping cursor positioning');
            }
          } else {
            // Not an editable field type, clear click position if any
            if (this.lastClickPosition) {
              log('Non-editable field type, clearing lastClickPosition');
              this.lastClickPosition = null;
            }
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
      this.waitForBlockVisibleAndSelect(targetUid);
      return;
    }

    // Helper to get fresh child blocks (DOM may re-render)
    const getFreshChildBlocks = () => {
      const container = document.querySelector(`[data-block-uid="${containerUid}"]`);
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
    log('handleBlockSelector: target =', targetUid, '(index', currentIndex, '+', offset, '→', targetIndex, ')');

    // Check if target block is visible (centered within container bounds)
    // Also returns position for stability tracking
    const getTargetVisibility = (container) => {
      const targetEl = document.querySelector(`[data-block-uid="${targetUid}"]`);
      if (!targetEl || !container) return { visible: false, x: null };

      const containerRect = container.getBoundingClientRect();
      const targetRect = targetEl.getBoundingClientRect();
      const targetCenter = targetRect.left + targetRect.width / 2;

      // Target is visible if its center is within container bounds
      const visible = targetCenter >= containerRect.left && targetCenter <= containerRect.right;
      return { visible, x: targetRect.left };
    };

    // Track stability - target must be visible AND position stable
    let stableCount = 0;
    let lastX = null;
    const STABLE_THRESHOLD = 3;
    const POSITION_TOLERANCE = 2; // pixels

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

      const container = document.querySelector(`[data-block-uid="${containerUid}"]`);
      const freshChildBlocks = getFreshChildBlocks();

      const { visible, x } = getTargetVisibility(container);

      if (visible) {
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
          const targetElement = document.querySelector(`[data-block-uid="${targetUid}"]`);
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
      const targetElement = document.querySelector(`[data-block-uid="${targetUid}"]`);
      if (targetElement) {
        this.selectBlock(targetElement);
      }
    }
  }

  /**
   * Wait for a specific block to become visible, then select it.
   */
  waitForBlockVisibleAndSelect(targetUid, retries = 10) {
    const targetElement = document.querySelector(`[data-block-uid="${targetUid}"]`);
    if (targetElement && !this.isElementHidden(targetElement)) {
      log('handleBlockSelector: selecting', targetUid);
      this.selectBlock(targetElement);
    } else if (retries > 0) {
      setTimeout(() => this.waitForBlockVisibleAndSelect(targetUid, retries - 1), 50);
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
   *
   * @param {Element} blockElement - The block element to observe.
   * @param {string} blockUid - The block's UID.
   * @param {Object} editableFields - Map of fieldName -> fieldType for editable fields in this block.
   */
  observeBlockResize(blockElement, blockUid, editableFields, skipInitialUpdate = false) {
    log('observeBlockResize called for block:', blockUid, 'skipInitialUpdate:', skipInitialUpdate);

    // Skip if already observing the same block (by UID, not element reference)
    // ResizeObserver fires immediately when attached - recreating it causes spurious updates
    // After re-render, element reference changes but we're still on same block
    if (this._lastBlockRectUid === blockUid && this.blockResizeObserver && this._observedBlockElement) {
      // Check if the old element is still in the DOM
      // If detached, we need to re-attach to the new element
      if (document.body.contains(this._observedBlockElement)) {
        log('observeBlockResize: already observing this block, skipping');
        return;
      }
      log('observeBlockResize: old element detached, re-attaching to new element');
    }

    // Clean up any existing observer
    if (this.blockResizeObserver) {
      this.blockResizeObserver.disconnect();
    }

    // Store initial dimensions to detect actual changes
    // Use instance variable so it persists across observer recreations
    // Only reset if this is a different block
    const currentRect = blockElement.getBoundingClientRect();
    if (!this._lastBlockRect || this._lastBlockRectUid !== blockUid) {
      this._lastBlockRect = currentRect;
      this._lastBlockRectUid = blockUid;
    } else if (skipInitialUpdate) {
      // Don't update _lastBlockRect - let updateBlockUIAfterFormData compare and update it
      // This preserves the pre-update position for comparison after re-render
    }
    this._observedBlockElement = blockElement;
    log('observeBlockResize initial rect:', { width: currentRect.width, height: currentRect.height });

    this.blockResizeObserver = new ResizeObserver((entries) => {
      log('ResizeObserver callback fired for:', blockUid);
      // Only process if this is still the selected block
      if (this.selectedBlockUid !== blockUid) {
        log('ResizeObserver: block no longer selected, ignoring');
        return;
      }

      // Skip if element was detached during re-render (getBoundingClientRect returns zeros)
      if (!entries[0]?.target?.isConnected) {
        log('ResizeObserver: element detached, ignoring');
        return;
      }

      for (const entry of entries) {
        const newRect = entry.target.getBoundingClientRect();
        const lastRect = this._lastBlockRect;

        // Only send update if dimensions actually changed significantly (> 1px)
        const widthChanged = Math.abs(newRect.width - lastRect.width) > 1;
        const heightChanged = Math.abs(newRect.height - lastRect.height) > 1;
        const topChanged = Math.abs(newRect.top - lastRect.top) > 1;
        const leftChanged = Math.abs(newRect.left - lastRect.left) > 1;

        if (widthChanged || heightChanged || topChanged || leftChanged) {
          log('Block size changed, updating selection outline:', blockUid,
            'old:', lastRect.top, lastRect.left, lastRect.width, lastRect.height,
            'new:', newRect.top, newRect.left, newRect.width, newRect.height);

          this._lastBlockRect = newRect;

          // Send updated BLOCK_SELECTED with new rect
          this.sendBlockSelected('resizeObserver', blockElement);
        }
      }
    });

    // Observe border-box to catch padding/border changes too (not just content)
    // This ensures the selection outline updates for any visual size change
    this.blockResizeObserver.observe(blockElement, { box: 'border-box' });

    // Also track position during CSS transitions (e.g., carousel slide animations)
    this.observeBlockTransition(blockElement, blockUid);
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
   *
   * @param {Element} blockElement - The block element to observe.
   * @param {string} blockUid - The block's UID.
   */
  observeBlockTransition(blockElement, blockUid) {
    // Clean up existing transition tracking
    if (this._transitionAnimationFrame) {
      cancelAnimationFrame(this._transitionAnimationFrame);
      this._transitionAnimationFrame = null;
    }
    if (this._transitionEndHandler) {
      blockElement.removeEventListener('transitionend', this._transitionEndHandler);
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

      const newRect = blockElement.getBoundingClientRect();
      const lastRect = this._lastBlockRect;

      if (lastRect) {
        const topChanged = Math.abs(newRect.top - lastRect.top) > 1;
        const leftChanged = Math.abs(newRect.left - lastRect.left) > 1;

        if (topChanged || leftChanged) {
          this._lastBlockRect = newRect;
          this.sendBlockSelected('transitionTracker', blockElement);
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
      isTracking = false;
      if (this._transitionAnimationFrame) {
        cancelAnimationFrame(this._transitionAnimationFrame);
        this._transitionAnimationFrame = null;
      }
      log('observeBlockTransition: stopped tracking for:', blockUid);

      // Final position update
      if (this.selectedBlockUid === blockUid) {
        const finalRect = blockElement.getBoundingClientRect();
        if (this._lastBlockRect) {
          const moved = Math.abs(finalRect.left - this._lastBlockRect.left) > 1 ||
                        Math.abs(finalRect.top - this._lastBlockRect.top) > 1;
          if (moved) {
            this._lastBlockRect = finalRect;
            this.sendBlockSelected('transitionEnd', blockElement);
          }
        }
      }
    };

    // Stop tracking when transition ends
    this._transitionEndHandler = stopTracking;
    this._trackedBlockElement = blockElement;

    blockElement.addEventListener('transitionend', this._transitionEndHandler);

    // Use MutationObserver to detect when transform/translate classes change
    if (this._transitionMutationObserver) {
      this._transitionMutationObserver.disconnect();
    }

    this._transitionMutationObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'attributes' &&
            (mutation.attributeName === 'class' || mutation.attributeName === 'style')) {
          const style = window.getComputedStyle(blockElement);
          // Check if element has a transition and transform
          if (style.transition && style.transition !== 'none' &&
              (style.transform !== 'none' || style.translate !== 'none')) {
            startTracking();
          }
        }
      }
    });

    this._transitionMutationObserver.observe(blockElement, {
      attributes: true,
      attributeFilter: ['class', 'style'],
    });

    // Always do initial position tracking for 500ms after selection
    // This catches animations on parent elements (e.g., Flowbite carousel)
    // where the transform is not directly on the selected block
    startTracking();
    this._initialTrackingTimeout = setTimeout(() => {
      // Only stop if no ongoing transition was detected
      // (transitionend handler will stop it if one was detected)
      if (isTracking && this.selectedBlockUid === blockUid) {
        stopTracking();
      }
    }, 500);
  }

  /**
   * Sets up mouse tracking to position drag handle dynamically.
   * The drag handle is positioned on mousemove to avoid being destroyed by re-renders.
   */
  createDragHandle() {

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

      const blockElement = document.querySelector(`[data-block-uid="${this.selectedBlockUid}"]`);
      if (!blockElement) {
        dragButton.style.display = 'none';
        return;
      }

      const rect = blockElement.getBoundingClientRect();

      // Hide if block is completely out of view
      if (rect.bottom < 0 || rect.top > window.innerHeight) {
        dragButton.style.display = 'none';
        return;
      }

      // Position above block, or at top of iframe if that would be off-screen
      const handleTop = Math.max(0, rect.top - 48);

      dragButton.style.right = 'auto';
      dragButton.style.left = `${rect.left}px`;
      dragButton.style.top = `${handleTop}px`;
      dragButton.style.display = 'block';
    };

    // Position immediately
    positionDragHandle();

    // Reposition on scroll
    window.addEventListener('scroll', positionDragHandle, true);

    // Store for cleanup
    this.dragHandlePositioner = positionDragHandle;
    this.dragHandleScrollListener = positionDragHandle;

    // Create the drag handler
    const dragHandler = (e) => {
      e.preventDefault();

      // Get the current block element
      const blockElement = document.querySelector(`[data-block-uid="${this.selectedBlockUid}"]`);
      if (!blockElement) return;

      const rect = blockElement.getBoundingClientRect();
      document.querySelector('body').classList.add('grabbing');

      // Create a visual copy of the block being dragged
      const draggedBlock = blockElement.cloneNode(true);
      draggedBlock.classList.add('dragging');
      // Remove data-block-uid from shadow so it doesn't interfere with selectors
      draggedBlock.removeAttribute('data-block-uid');

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

      // Handle mouse movement
      const onMouseMove = (e) => {
        draggedBlock.style.left = `${e.clientX}px`;
        draggedBlock.style.top = `${e.clientY}px`;

        // Auto-scroll when dragging near viewport edges
        const scrollThreshold = 50; // pixels from edge to trigger scroll
        const scrollSpeed = 10; // pixels per frame
        const viewportHeight = window.innerHeight;

        if (e.clientY < scrollThreshold) {
          // Near top edge - scroll up
          window.scrollBy(0, -scrollSpeed);
        } else if (e.clientY > viewportHeight - scrollThreshold) {
          // Near bottom edge - scroll down
          window.scrollBy(0, scrollSpeed);
        }

        // Find element under cursor (no throttle - these operations are fast)
        const elementBelow = document.elementFromPoint(e.clientX, e.clientY);
        let closestBlock = elementBelow;

        // Find the closest ancestor with 'data-block-uid'
        while (closestBlock && !closestBlock.hasAttribute('data-block-uid')) {
          closestBlock = closestBlock.parentElement;
        }

        // Exclude the dragged block and its ghost from being drop targets
        const draggedBlockUid = blockElement.getAttribute('data-block-uid');
        const isSelfOrGhost = closestBlock &&
          (closestBlock === draggedBlock || closestBlock === blockElement ||
           closestBlock.getAttribute('data-block-uid') === draggedBlockUid);
        if (isSelfOrGhost) closestBlock = null;

        // Handle overshoot - find nearest block when cursor isn't over any block
        if (!closestBlock) {
          const allBlocks = Array.from(document.querySelectorAll('[data-block-uid]'))
            .filter(el => el !== draggedBlock && el.getAttribute('data-block-uid') !== draggedBlockUid);

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
          // Check if the dragged block type is allowed in the target container
          // If not, walk up the parent chain to find a valid drop target
          const draggedBlockId = blockElement.getAttribute('data-block-uid');
          const draggedBlockData = this.getBlockData(draggedBlockId);
          const draggedBlockType = draggedBlockData?.['@type'];

          // Find a valid drop target by walking up the parent chain
          let validDropTarget = closestBlock;
          let validDropTargetUid = validDropTarget.getAttribute('data-block-uid');

          while (validDropTarget) {
            const targetPathInfo = this.blockPathMap?.[validDropTargetUid];
            const allowedSiblingTypes = targetPathInfo?.allowedSiblingTypes;

            // Check if drop is allowed here
            if (!allowedSiblingTypes || !draggedBlockType || allowedSiblingTypes.includes(draggedBlockType)) {
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

            // Don't allow dropping on the block we're dragging
            if (validDropTargetUid === draggedBlockId) {
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

          const rect = closestBlock.getBoundingClientRect();
          const isHorizontal = this.getAddDirection(closestBlock) === 'right';

          // Determine insertion point based on mouse position relative to block center
          const mousePos = isHorizontal ? e.clientX - rect.left : e.clientY - rect.top;
          const blockSize = isHorizontal ? rect.width : rect.height;
          insertAt = mousePos < blockSize / 2 ? 0 : 1; // 0 = before, 1 = after

          // Calculate indicator position in the gap between blocks
          const sibling = insertAt === 0 ? closestBlock.previousElementSibling : closestBlock.nextElementSibling;
          const siblingRect = sibling?.hasAttribute('data-block-uid') ? sibling.getBoundingClientRect() : null;
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
          const draggedBlockId = blockElement.getAttribute('data-block-uid');
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

        // console.log("select block", event.data?.method);
        let blockElement = document.querySelector(
          `[data-block-uid="${uid}"]`,
        );

        // If block doesn't exist or is hidden, try to make it visible
        // using data-block-selector navigation (e.g., carousel slides)
        if (!blockElement || this.isElementHidden(blockElement)) {
          const madeVisible = this.tryMakeBlockVisible(uid);
          if (madeVisible) {
            // Wait for the renderer to make the block visible (e.g., carousel animation)
            // Poll for up to 500ms for the block to become visible
            const waitForVisible = async () => {
              for (let i = 0; i < 10; i++) {
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

          !this.elementIsVisibleInViewport(blockElement) &&
            blockElement.scrollIntoView();

          // Call selectBlock() to properly set up toolbar and contenteditable
          // This ensures blocks selected via Order tab work the same as clicking
          this.selectBlock(blockElement);

          // Focus the contenteditable element for blocks with editable fields
          // This includes slate, string, and textarea field types
          // Use getBlockData to handle nested blocks (not just top-level)
          const blockData = this.getBlockData(uid);
          const blockType = blockData?.['@type'];
          const blockTypeFields = this.blockFieldTypes?.[blockType] || {};
          const hasEditableFields = Object.keys(blockTypeFields).length > 0 || blockType === 'slate';

          if (hasEditableFields) {
            // Use double requestAnimationFrame to wait for ALL DOM updates including Quanta toolbar
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                // Re-query the block element to ensure we get the updated DOM element
                const currentBlockElement = document.querySelector(`[data-block-uid="${uid}"]`);
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
      if (this.selectedBlockUid) {
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
      this.scrollTimeout = setTimeout(() => {
        if (this.selectedBlockUid) {
          const blockElement = document.querySelector(
            `[data-block-uid="${this.selectedBlockUid}"]`,
          );

          if (blockElement) {
            this.sendBlockSelected('scrollHandler', blockElement);
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
        const blockElement = document.querySelector(
          `[data-block-uid="${this.selectedBlockUid}"]`,
        );

        if (blockElement) {
          this.sendBlockSelected('resizeHandler', blockElement);
        }
      }
    };

    window.addEventListener('resize', handleResize);
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

    if (elementOrBlock.hasAttribute('data-editable-field')) {
      // Called with the editable field directly - find block-uid from parent
      editableField = elementOrBlock;
      const blockElement = elementOrBlock.closest('[data-block-uid]');
      blockUid = blockElement?.getAttribute('data-block-uid');
    } else {
      // Called with a block element - query for child editable field
      // Use getOwnFirstEditableField to avoid getting nested blocks' fields
      blockUid = elementOrBlock.getAttribute('data-block-uid');
      editableField = this.getOwnFirstEditableField(elementOrBlock);
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

      // Add paste event listener
      editableField.addEventListener('paste', (e) => {
        e.preventDefault(); // Prevent default paste

        const pastedHtml = e.clipboardData.getData('text/html');
        const pastedText = e.clipboardData.getData('text/plain');

        // Send paste request with current form data included
        this.sendTransformRequest(blockUid, 'paste', {
          html: pastedHtml || pastedText,
        });
      });

      // Add copy event listener on document - strip ZWS/NBSP and internal data attributes from clipboard
      // Listen on document because keyboard shortcuts may not bubble through contenteditable
      document.addEventListener('copy', (e) => {
        const selection = window.getSelection();
        if (!selection.rangeCount) return;

        const range = selection.getRangeAt(0);

        // Strip ZWS and NBSP (contenteditable artifacts) from text
        let cleanText = this.stripZeroWidthSpaces(selection.toString());
        cleanText = cleanText.replace(/\u00A0/g, ' ');

        // cleanHtmlForClipboard only cleans within [data-editable-field] elements
        const cleanHtml = this.cleanHtmlForClipboard(range.cloneContents());

        log('Copy event - cleaning clipboard');
        e.preventDefault();
        e.clipboardData.setData('text/plain', cleanText);
        e.clipboardData.setData('text/html', cleanHtml);
      });

      // Add keydown listener for Enter, Delete, Backspace, Undo, Redo, and formatting shortcuts
      editableField.addEventListener('keydown', (e) => {
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

          // Small delay to ensure any pending updates are processed
          setTimeout(() => {
            // Don't block processing - let the undo manager's FORM_DATA update come through
            this.sendMessageToParent({
              type: 'SLATE_UNDO_REQUEST',
              blockId: blockUid,
            });
            log('SLATE_UNDO_REQUEST message sent');
          }, 50);
          return;
        }

        // Handle Redo (Ctrl+Shift+Z / Cmd+Shift+Z or Ctrl+Y / Cmd+Y)
        if ((e.ctrlKey || e.metaKey) && ((e.key === 'z' && e.shiftKey) || e.key === 'y')) {
          log('Redo detected');
          e.preventDefault();

          // Small delay to ensure any pending updates are processed
          setTimeout(() => {
            // Don't block processing - let the undo manager's FORM_DATA update come through
            this.sendMessageToParent({
              type: 'SLATE_REDO_REQUEST',
              blockId: blockUid,
            });
            log('SLATE_REDO_REQUEST message sent');
          }, 50);
          return;
        }

        // Handle Copy (Ctrl+C / Cmd+C) - strip ZWS from clipboard
        if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
          const selection = window.getSelection();
          const selectedText = selection.toString();
          // Strip ZWS characters before writing to clipboard
          const cleanText = this.stripZeroWidthSpaces(selectedText);
          if (cleanText !== selectedText) {
            log('Copy - stripping ZWS from clipboard');
            e.preventDefault();
            navigator.clipboard.writeText(cleanText).catch(err => {
              console.error('[HYDRA] Failed to write to clipboard:', err);
            });
          }
          // If no ZWS, let native copy happen
          return;
        }

        // Handle Cut (Ctrl+X / Cmd+X)
        if ((e.ctrlKey || e.metaKey) && e.key === 'x') {
          log('Cut shortcut detected');
          e.preventDefault();

          // Get selected text and copy to clipboard
          const selection = window.getSelection();
          const selectedText = selection.toString();
          // Strip ZWS characters before writing to clipboard
          const cleanText = this.stripZeroWidthSpaces(selectedText);
          log('Cut text:', cleanText);

          if (cleanText) {
            // Write to clipboard
            navigator.clipboard.writeText(cleanText).then(() => {
              log('Text written to clipboard');
              // Cut is just delete with clipboard - send delete request
              this.sendTransformRequest(blockUid, 'delete', {});
            }).catch(err => {
              console.error('[HYDRA] Failed to write to clipboard:', err);
            });
          }
          return;
        }

        // Handle Paste (Ctrl+V / Cmd+V)
        if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
          log('Paste shortcut detected');
          e.preventDefault();

          // Read from clipboard then send transform request
          navigator.clipboard.readText().then(text => {
            log('Clipboard text:', text);

            // Send paste request with current form data included
            this.sendTransformRequest(blockUid, 'paste', {
              html: text,
            });
          }).catch(err => {
            console.error('[HYDRA] Failed to read clipboard:', err);
          });
          return;
        }

        // Handle Enter key to create new block
        if (e.key === 'Enter' && !e.shiftKey) {
          log('Enter key detected (no Shift)');

          // Correct cursor if it's on invalid whitespace before checking data-node-id
          // This handles the case where Enter is pressed before selectionchange fires
          this.correctInvalidWhitespaceSelection();

          const selection = window.getSelection();
          log('Selection rangeCount:', selection.rangeCount);
          if (!selection.rangeCount) return;

          const range = selection.getRangeAt(0);
          const node = range.startContainer;

          // Check if this is a Slate block (has data-node-id)
          const parentElement =
            node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
          const hasNodeId = parentElement?.closest('[data-node-id]');
          log('Has data-node-id?', !!hasNodeId);

          if (hasNodeId) {
            log('Preventing default Enter and sending transform request for block:', blockUid);
            e.preventDefault(); // Block the default Enter behavior

            // Send enter request with current form data included
            this.sendTransformRequest(blockUid, 'enter', {});
            return;
          }
        }

        // Handle Delete/Backspace at node boundaries
        if (e.key !== 'Delete' && e.key !== 'Backspace') return;

        const selection = window.getSelection();
        if (!selection.rangeCount) return;

        const range = selection.getRangeAt(0);
        const node = range.startContainer;

        // Check if selection spans element nodes (formatted content like STRONG, EM, etc.)
        // If so, send as transform - don't let browser handle it locally
        if (!range.collapsed) {
          const hasElementNodes = this.selectionContainsElementNodes(range);
          if (hasElementNodes) {
            e.preventDefault();
            log('Delete selection contains element nodes, sending transform');
            this.sendTransformRequest(blockUid, 'delete', {
              direction: e.key === 'Backspace' ? 'backward' : 'forward',
            });
            return;
          }
        }

        // Check if at node boundary
        const atStart = range.startOffset === 0;
        const atEnd =
          range.startOffset === node.textContent?.length ||
          range.startOffset === node.length;

        // If deleting and at boundary, might need transform
        if ((e.key === 'Backspace' && atStart) || (e.key === 'Delete' && atEnd)) {
          // Check if there's an adjacent node with different formatting
          const parentElement =
            node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
          const hasNodeId = parentElement?.closest('[data-node-id]');

          if (hasNodeId) {
            e.preventDefault(); // Block the delete

            // Send delete request with current form data included
            this.sendTransformRequest(blockUid, 'delete', {
              direction: e.key === 'Backspace' ? 'backward' : 'forward',
            });
          }
        }
        // Otherwise let normal delete happen (no blocking needed)
      });
    }
  }

  /**
   * Observes changes in the text content of a block.
   *
   * @param {HTMLElement} blockElement - The block element to observe.
   */
  observeBlockTextChanges(blockElement) {
    log('observeBlockTextChanges called for block:', blockElement.getAttribute('data-block-uid'));
    if (this.blockTextMutationObserver) {
      this.blockTextMutationObserver.disconnect();
    }
    // TODO: When a transform update (delete/enter/paste/undo/redo) gets rerendered,
    // it triggers mutations that shouldn't result in INLINE_EDIT_DATA being sent.
    // We need a mechanism to distinguish user-initiated text changes from
    // programmatic updates caused by FORM_DATA messages.
    this.blockTextMutationObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'characterData' && this.isInlineEditing) {
          // Find the editable field element (works for both Slate and non-Slate fields)
          const mutatedTextNode = mutation.target; // The actual text node that changed
          const parentEl = mutation.target?.parentElement;
          const targetElement = parentEl?.closest('[data-editable-field]');

          if (targetElement) {
            // Pass parentEl so handleTextChange can find the actual node that changed
            // (e.g., SPAN for inline formatting) rather than the whole editable field (P)
            // Also pass the mutated text node so we can identify which child to update
            this.handleTextChange(targetElement, parentEl, mutatedTextNode);
          } else {
            console.warn('[HYDRA] No targetElement found, parent chain:', parentEl?.outerHTML?.substring(0, 100));
          }
        }
      });
    });
    this.blockTextMutationObserver.observe(blockElement, {
      subtree: true,
      characterData: true,
    });
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
   * Tries to make a block visible by clicking data-block-selector elements.
   * First looks for a direct selector (data-block-selector="{uid}"),
   * then tries +1/-1 navigation to reach the target block.
   * @param {string} targetUid - The UID of the block to make visible
   * @returns {boolean} True if a selector was clicked (block may now be visible)
   */
  tryMakeBlockVisible(targetUid) {
    log(`tryMakeBlockVisible: ${targetUid}`);
    // First, try direct selector: data-block-selector="{targetUid}"
    const directSelector = document.querySelector(
      `[data-block-selector="${targetUid}"]`,
    );
    if (directSelector) {
      log(`tryMakeBlockVisible: found direct selector for ${targetUid}`);
      directSelector.click();
      return true;
    }

    // No direct selector - try +1/-1 navigation
    log(`tryMakeBlockVisible: no direct selector, trying +1/-1 navigation`);

    // Find the target element first (may exist but be hidden)
    const targetElement = document.querySelector(`[data-block-uid="${targetUid}"]`);
    if (!targetElement) {
      log(`tryMakeBlockVisible: target element not in DOM`);
      return false;
    }

    // Find the container block (parent with data-block-uid)
    const containerBlock = targetElement.parentElement?.closest('[data-block-uid]');
    if (!containerBlock) {
      log(`tryMakeBlockVisible: no container block found`);
      return false;
    }
    const containerUid = containerBlock.getAttribute('data-block-uid');

    // Find siblings by looking at the direct parent (which may be a wrapper div like .slides-wrapper)
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

    // Find the currently visible sibling
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

    // Look for +1/-1 selectors in two formats:
    // 1. "{blockUid}:+1" - explicit format, can be anywhere on page
    // 2. "+1" - simple format, must be inside the container block
    let selector = null;

    // Try explicit format first: data-block-selector="{currentUid}:+1"
    // This means "clicking this will show the block after {currentUid}"
    // We need to click through each step, so find selector for current visible block
    const explicitSelector = document.querySelector(
      `[data-block-selector="${currentUid}:${direction}"]`,
    );
    if (explicitSelector) {
      log(`tryMakeBlockVisible: found explicit selector ${currentUid}:${direction}`);
      selector = explicitSelector;
    } else {
      // Try simple format: selector must be inside the container
      const simpleSelector = containerBlock.querySelector(
        `[data-block-selector="${direction}"]`,
      );
      if (simpleSelector) {
        log(`tryMakeBlockVisible: found simple selector ${direction} inside container`);
        selector = simpleSelector;
      }
    }

    if (!selector) {
      log(`tryMakeBlockVisible: no ${direction} selector found`);
      return false;
    }

    // Figure out which block should become visible after one click
    const nextIndex = currentIndex + (stepsNeeded > 0 ? 1 : -1);
    const nextBlock = siblings[nextIndex];
    const nextUid = nextBlock?.getAttribute('data-block-uid');
    log(`tryMakeBlockVisible: clicking ${direction}, expecting ${nextUid} to become visible`);

    // Click once
    selector.click();

    // Wait for the expected block to become visible, then recurse if needed
    const waitAndContinue = async () => {
      // Poll for up to 500ms for the next block to become visible
      for (let i = 0; i < 10; i++) {
        await new Promise((resolve) => setTimeout(resolve, 50));
        if (nextBlock && !this.isElementHidden(nextBlock)) {
          log(`tryMakeBlockVisible: ${nextUid} is now visible`);
          // Check if we've reached the target
          if (nextUid === targetUid) {
            log(`tryMakeBlockVisible: reached target ${targetUid}`);
            return true;
          }
          // Need more clicks - recurse
          log(`tryMakeBlockVisible: not at target yet, continuing navigation`);
          return this.tryMakeBlockVisible(targetUid);
        }
      }
      log(`tryMakeBlockVisible: timeout waiting for ${nextUid} to become visible`);
      return false;
    };

    // Start the async wait (caller will handle the promise via the polling loop)
    waitAndContinue();
    return true;
  }

  /**
   * Collects all editable fields from a block element.
   * Returns an object mapping fieldName -> fieldType (e.g., { heading: 'string', description: 'slate' })
   * @param {HTMLElement} blockElement - The block element to scan
   * @returns {Object} Map of field names to their types
   */
  getEditableFields(blockElement) {
    if (!blockElement) return {};

    const blockUid = blockElement.getAttribute('data-block-uid');
    const editableFields = {};
    // Use getOwnEditableFields to only get THIS block's fields, not nested blocks' fields
    const fieldElements = this.getOwnEditableFields(blockElement);

    fieldElements.forEach((element) => {
      const fieldPath = element.getAttribute('data-editable-field');
      if (fieldPath) {
        // Use getFieldType which handles page-level fields (e.g., /title) correctly
        const fieldType = this.getFieldType(blockUid, fieldPath) || 'string';
        editableFields[fieldPath] = fieldType;
      }
    });

    return editableFields;
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

    Object.entries(this.blockPathMap).forEach(([blockId, pathInfo]) => {
      const block = this.getBlockData(blockId);
      if (!block) return;

      // For object_list items, use itemSchema from pathMap
      if (pathInfo.itemSchema?.properties) {
        Object.entries(pathInfo.itemSchema.properties).forEach(([fieldName, fieldDef]) => {
          if (fieldDef?.widget === 'slate' && block[fieldName]) {
            block[fieldName] = this.addNodeIds(block[fieldName]);
          }
        });
        return;
      }

      // For regular blocks, use blockFieldTypes
      const blockType = block['@type'];
      const fieldTypes = this.blockFieldTypes?.[blockType] || {};
      Object.keys(fieldTypes).forEach((fieldName) => {
        if (this.fieldTypeIsSlate(fieldTypes[fieldName]) && block[fieldName]) {
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
        ? document.querySelector(`[data-block-uid="${this.selectedBlockUid}"]`)
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
  restoreSlateSelection(slateSelection, formData) {
    log('restoreSlateSelection called with:', JSON.stringify(slateSelection));
    if (!slateSelection || !slateSelection.anchor || !slateSelection.focus) {
      console.warn('[HYDRA] Invalid Slate selection:', slateSelection);
      return;
    }

    try {
      // Find the selected block and determine field type
      if (!this.selectedBlockUid || !this.focusedFieldName) {
        log('restoreSlateSelection: missing selectedBlockUid or focusedFieldName');
        return;
      }

      // Use getBlockData to handle nested blocks (formData.blocks[uid] only works for top-level)
      const block = this.getBlockData(this.selectedBlockUid);
      if (!block) {
        return;
      }

      // Resolve field path and get field type (supports page-level and nested blocks)
      const resolved = this.resolveFieldPath(this.focusedFieldName, this.selectedBlockUid);
      const fieldData = this.getBlockData(resolved.blockId);
      const fieldType = this.getFieldType(this.selectedBlockUid, this.focusedFieldName);
      const fieldValue = fieldData?.[resolved.fieldName];

      // Find the block element for locating editable fields
      const blockElement = document.querySelector(`[data-block-uid="${this.selectedBlockUid}"]`);
      if (!blockElement) {
        return;
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
          console.warn('[HYDRA] Could not get nodeId from path');
          return;
        }

        // Scope to current block to avoid selecting wrong element when multiple blocks visible
        anchorElement = blockElement.querySelector(`[data-node-id="${anchorResult.nodeId}"]`);
        focusElement = blockElement.querySelector(`[data-node-id="${focusResult.nodeId}"]`);

        // If elements not found, DOM may not be ready yet (async framework render)
        // Retry after a short delay - but only once to avoid infinite loops
        if ((!anchorElement || !focusElement) && !this._selectionRetryPending) {
          log('restoreSlateSelection: nodeId elements not found, scheduling retry');
          this._selectionRetryPending = true;
          setTimeout(() => {
            this._selectionRetryPending = false;
            this.restoreSlateSelection(slateSelection, formData);
          }, 50);
          return;
        }
        this._selectionRetryPending = false;

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
          console.warn('[HYDRA] Could not find elements by nodeId');
          return;
        }

        // Helper to create ZWS position for cursor placement
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
          console.warn('[HYDRA] Could not find editable field:', this.focusedFieldName);
          return;
        }
        anchorElement = focusElement = editableField;
        // For simple fields, use findPositionByVisibleOffset
        anchorPos = this.findPositionByVisibleOffset(anchorElement, anchorOffset);
        focusPos = this.findPositionByVisibleOffset(focusElement, focusOffset);
      }


      if (!anchorPos || !focusPos) {
        console.warn('[HYDRA] Could not find positions by visible offset');
        return;
      }

      // Set the actual selection
      const selection = window.getSelection();
      if (!selection) return;

      const range = document.createRange();
      range.setStart(anchorPos.node, anchorPos.offset);
      range.setEnd(focusPos.node, focusPos.offset);

      selection.removeAllRanges();
      selection.addRange(range);

    } catch (e) {
      console.error('[HYDRA] Error restoring Slate selection:', e);
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
        if (block && block['@type']) {
          // Check if this block has slate fields and strip nodeIds from them
          const blockType = block['@type'];
          const blockTypeFields = this.blockFieldTypes?.[blockType] || {};
          for (const [fieldName, fieldType] of Object.entries(blockTypeFields)) {
            if (this.fieldTypeIsSlate(fieldType) && block[fieldName]) {
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
    // selectedBlockUid can be null for page-level fields, so only check focusedFieldName
    if (!this.focusedFieldName) {
      return true; // No focused field to compare
    }

    // Resolve field path to handle page-level fields (e.g., /title)
    const resolved = this.resolveFieldPath(this.focusedFieldName, this.selectedBlockUid);

    let fieldA, fieldB;
    if (resolved.blockId === null) {
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

    // Page-level field
    if (resolved.blockId === null) {
      return this.blockFieldTypes?._page?.[resolved.fieldName];
    }

    // Block field
    const blockData = this.getBlockData(resolved.blockId);
    const blockType = blockData?.['@type'];
    const blockTypeFields = this.blockFieldTypes?.[blockType] || {};
    return blockTypeFields[resolved.fieldName];
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
   * Handle the text changed in the block element with attr data-editable-field,
   * by getting changed text from DOM and send it to the adminUI
   * @param {HTMLElement} target
   * @param {Node} mutatedTextNode - The actual text node that was modified (optional)
   */
  handleTextChange(target, mutatedNodeParent = null, mutatedTextNode = null) {
    const blockElement = target.closest('[data-block-uid]');
    const blockUid = blockElement?.getAttribute('data-block-uid') || null;
    const editableField = target.getAttribute('data-editable-field');

    if (!editableField) {
      console.warn('[HYDRA] handleTextChange: No data-editable-field found');
      return;
    }

    // Determine field type (supports page-level fields via getFieldType)
    const fieldType = this.getFieldType(blockUid, editableField);


    // Note: We intentionally do NOT strip ZWS from DOM during typing.
    // Like slate-react, we let the frontend re-render (triggered by FORM_DATA) naturally remove ZWS.
    // Stripping during typing corrupts cursor position. ZWS is stripped on copy events and during serialization.

    if (this.fieldTypeIsSlate(fieldType)) {
      // Slate field - update JSON structure using nodeId
      // Use the actual mutated node's parent if provided (e.g., SPAN for inline formatting)
      // This ensures we update the correct node, not the whole editable field
      const closestNode = (mutatedNodeParent && mutatedNodeParent.hasAttribute('data-node-id'))
        ? mutatedNodeParent
        : target.closest('[data-node-id]');
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
        textContent = this.stripZeroWidthSpaces(closestNode.innerText)?.replace(/\n$/, '');
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
  }

  /**
   * Buffer an update to be sent after debounce.
   * Text and selection are always sent together to keep them atomic/in-sync.
   *
   * @param {string} [from] - Source of the update for debugging
   */
  bufferUpdate(from = 'unknown') {
    // Always capture BOTH current data and current selection together
    const data = this.getFormDataWithoutNodeIds();
    const currentSeq = this.formData?._editSequence || 0;
    const text = this.getBlockData(this.selectedBlockUid)?.value?.[0]?.children?.[0]?.text?.substring(0, 30);

    // Check against lastReceivedFormData to avoid buffering echoes of what we just received/rendered
    if (this.lastReceivedFormData) {
      const isEcho = this.focusedFieldValuesEqual(data, this.lastReceivedFormData);
      if (isEcho) {
        // Same content as what we received - don't buffer
        log('bufferUpdate: echo, skipping. from:', from, 'seq:', currentSeq);
        return;
      }
    } else {
      // No baseline yet - can't determine if this is an echo
      log('bufferUpdate: no baseline, skipping. from:', from);
      return;
    }

    log('bufferUpdate: buffering. from:', from, 'seq:', currentSeq, 'text:', JSON.stringify(text));

    // Buffer the update - sequence will be assigned at SEND time, not buffer time
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
   * @param {string} [flushRequestId] - Optional requestId to include with the update (for FLUSH_BUFFER coordination)
   * @returns {boolean} - True if there was pending text to flush, false otherwise
   */
  flushPendingTextUpdates(flushRequestId) {
    if (this.textUpdateTimer) {
      clearTimeout(this.textUpdateTimer);
      this.textUpdateTimer = null;
    }
    if (this.pendingTextUpdate) {
      // Assign sequence number at SEND time, not buffer time
      // This ensures monotonically increasing sequences even if FORM_DATA arrives during debounce
      const currentSeq = this.formData?._editSequence || 0;
      const newSeq = currentSeq + 1;
      this.pendingTextUpdate.data._editSequence = newSeq;
      this.formData._editSequence = newSeq;

      // Include requestId if provided (for FLUSH_BUFFER coordination)
      if (flushRequestId) {
        this.pendingTextUpdate.flushRequestId = flushRequestId;
      }

      log('flushPendingTextUpdates: sending buffered update, seq:', newSeq,
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
        [data-editable-field]:empty {
          min-height: 1.5em;
          display: block;
        }
        /* Linkable field hover styles - indicate clickable link areas */
        [data-linkable-field] {
          cursor: pointer;
          position: relative;
        }
        [data-linkable-field]:hover::after {
          content: "";
          position: absolute;
          inset: -2px;
          border: 2px dashed rgba(0, 126, 177, 0.5);
          border-radius: 4px;
          pointer-events: none;
        }
        /* Media field hover styles - indicate clickable image areas */
        [data-media-field] {
          cursor: pointer;
          position: relative;
        }
        [data-media-field]:hover::after {
          content: "";
          position: absolute;
          inset: -2px;
          border: 2px dashed rgba(120, 192, 215, 0.5);
          border-radius: 4px;
          pointer-events: none;
        }
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

/**
 * Initialize the bridge
 *
 * @param {URL} adminOrigin
 * @param {Object} options
 * @returns new Bridge()
 */
export function initBridge(adminOrigin, options = {}) {
  // 1. Explicit parameter (highest priority)
  if (adminOrigin) {
    log('Using explicit admin origin:', adminOrigin);
  }
  // 2. Auto-detect from referrer (most secure)
  else if (document.referrer) {
    try {
      adminOrigin = new URL(document.referrer).origin;
      log('Auto-detected admin origin from referrer:', adminOrigin);
    } catch (e) {
      console.error('[HYDRA] Failed to parse referrer URL:', e);
    }
  }
  // 3. Learn from first postMessage (fallback, less secure)
  else {
    console.warn('[HYDRA] No referrer available, will learn origin from first postMessage (less secure)');
    // Set a flag to learn from first message
    options._learnOriginFromFirstMessage = true;
    adminOrigin = null; // Will be set when first message is received
  }

  if (!bridgeInstance) {
    bridgeInstance = new Bridge(adminOrigin, options);
    // Store on window to survive module hot-reload
    if (typeof window !== 'undefined') {
      window.__hydraBridge = bridgeInstance;
    }
  }
  return bridgeInstance;
}

/**
 * Get the token from the admin
 * @returns {String} token
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

/**
 * Enable the frontend to listen for changes in the admin and call the callback with updated data
 * @param {Function} callback - this will be called with the updated data
 */
export function onEditChange(callback) {
  if (bridgeInstance) {
    bridgeInstance.onEditChange(callback);
  }
}

// ============================================================================
// Field Type Utilities (exported for use by volto-hydra admin side)
// ============================================================================

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
