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

/**
 * Bridge class creating a two-way link between the Hydra and the frontend.
 */
class Bridge {
  /**
   * Constructor for the Bridge class.
   *
   * @param {URL} adminOrigin - The origin of the adminUI.
   * @param {Object} options - Options for the bridge initialization:
   *   - allowedBlocks: Array of allowed block types (e.g., ['title', 'text', 'image', ...])
   */
  constructor(adminOrigin, options = {}) {
    this.adminOrigin = adminOrigin;
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
    this.focusedFieldName = null; // Track which field within the block has focus
    this.isInlineEditing = false;
    this.handleMouseUp = null;
    this.blockObserver = null;
    this.handleObjectBrowserMessage = null;
    this.pendingTransforms = {}; // Track pending transform requests for timeout handling
    this.savedSelection = null; // Store selection for format operations
    this.textUpdateTimer = null; // Timer for batching text updates
    this.pendingTextUpdate = null; // Pending text update data
    this.scrollTimeout = null; // Timer for scroll debouncing
    this.init(options); // Initialize the bridge
  }

  ////////////////////////////////////////////////////////////////////////////////
  // Bridge Class Initialization and Navigation Event Handling
  ////////////////////////////////////////////////////////////////////////////////

  /**
   * Initializes the bridge, setting up event listeners and communication channels.
   *
   * @param {Object} options - Options for initialization.
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

      if (options) {
        if (options.allowedBlocks) {
          window.parent.postMessage(
            { type: 'ALLOWED_BLOCKS', allowedBlocks: options.allowedBlocks },
            this.adminOrigin,
          );
        }
      }

      if (isEditMode) {
        this.enableBlockClickListener();
        this.injectCSS();
        this.listenForSelectBlockMessage();
        this.setupScrollHandler();
        window.parent.postMessage(
          { type: 'GET_INITIAL_DATA' },
          this.adminOrigin,
        );
        const reciveInitialData = (e) => {
          if (e.origin === this.adminOrigin) {
            if (e.data.type === 'INITIAL_DATA') {
              console.log('[HYDRA] Received INITIAL_DATA');
              this.formData = JSON.parse(JSON.stringify(e.data.data));
              console.log('[HYDRA] formData has blocks:', Object.keys(this.formData?.blocks || {}));

              // Store block field types metadata (blockId -> fieldName -> fieldType)
              this.blockFieldTypes = e.data.blockFieldTypes || {};
              console.log('[HYDRA] Stored blockFieldTypes:', this.blockFieldTypes);

              // Store Slate configuration for keyboard shortcuts and toolbar
              this.slateConfig = e.data.slateConfig || { hotkeys: {}, toolbarButtons: [] };
              console.log('[HYDRA] Stored slateConfig:', this.slateConfig);
              console.log('[HYDRA] buttonConfigs received:', this.slateConfig?.buttonConfigs);
              // Log each button config to see if SVGs are present
              if (this.slateConfig?.buttonConfigs) {
                Object.entries(this.slateConfig.buttonConfigs).forEach(([name, config]) => {
                  console.log(`[HYDRA] Button ${name}: svg length = ${config.svg?.length || 0}, has svg = ${!!config.svg}`);
                });
              }

              // Add nodeIds to all slate blocks
              if (this.formData && this.formData.blocks) {
                Object.keys(this.formData.blocks).forEach((blockId) => {
                  const block = this.formData.blocks[blockId];
                  if (block['@type'] === 'slate') {
                    this.formData.blocks[blockId] = this.addNodeIds(block);
                    console.log('[HYDRA] Added nodeIds successfully');
                  }
                });
              }

              window.postMessage(
                {
                  type: 'FORM_DATA',
                  data: this.formData,
                  sender: 'hydrajs-initial',
                },
                window.location.origin,
              );
            }
          }
        };
        window.removeEventListener('message', reciveInitialData);
        window.addEventListener('message', reciveInitialData);
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
              console.log('[HYDRA] Field focused:', editableField);
              const previousFieldName = this.focusedFieldName;
              this.focusedFieldName = editableField;

              // Only update toolbar if field actually changed
              if (previousFieldName !== editableField) {
                console.log('[HYDRA] Field changed from', previousFieldName, 'to', editableField, '- updating toolbar');

                // Determine if we should show format buttons based on field type
                // blockFieldTypes maps blockType -> fieldName -> fieldType
                const blockType = this.formData?.blocks?.[blockUid]?.['@type'];
                const blockTypeFields = this.blockFieldTypes?.[blockType] || {};
                const fieldType = blockTypeFields[editableField];
                const showFormatBtns = fieldType === 'slate';

                console.log('[HYDRA] Updating toolbar with formatBtns:', showFormatBtns, 'for blockType:', blockType, 'field:', editableField, 'type:', fieldType);

                // Send BLOCK_SELECTED message to update toolbar visibility
                const blockElement = document.querySelector(`[data-block-uid="${blockUid}"]`);
                if (blockElement) {
                  const rect = blockElement.getBoundingClientRect();
                  window.parent.postMessage(
                    {
                      type: 'BLOCK_SELECTED',
                      blockUid,
                      rect: {
                        top: rect.top,
                        left: rect.left,
                        width: rect.width,
                        height: rect.height,
                      },
                      showFormatButtons: showFormatBtns,
                    },
                    this.adminOrigin,
                  );
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
    this.realTimeDataHandler = (event) => {
      // Learn admin origin from first message if needed
      if (this.learnOriginFromFirstMessage && !this.adminOrigin) {
        this.adminOrigin = event.origin;
        this.learnOriginFromFirstMessage = false;
        console.log('[HYDRA] Learned admin origin from first postMessage:', this.adminOrigin);
      }

      if (
        event.origin === this.adminOrigin ||
        event.origin === window.location.origin
      ) {
        if (
          event.data.type === 'FORM_DATA' ||
          event.data.type === 'TOGGLE_MARK_DONE'
        ) {
          console.log('[HYDRA] Received', event.data.type, 'message');
          if (event.data.data) {
            // Don't set isInlineEditing to false - user is still editing
            this.formData = JSON.parse(JSON.stringify(event.data.data));

            // Add nodeIds to all slate blocks before rendering
            // Admin UI never sends nodeIds, so we always need to add them
            if (this.formData && this.formData.blocks) {
              Object.keys(this.formData.blocks).forEach((blockId) => {
                const block = this.formData.blocks[blockId];
                if (block['@type'] === 'slate' && block.value) {
                  this.formData.blocks[blockId] = this.addNodeIds(block);
                }
              });
            }

            // Log the block data to see if bold formatting is present
            if (this.selectedBlockUid && this.formData.blocks[this.selectedBlockUid]) {
              console.log('[HYDRA] Block data being passed to callback:', JSON.stringify(this.formData.blocks[this.selectedBlockUid].value));
            }

            // Call the callback first to trigger the re-render
            console.log('[HYDRA] Calling onEditChange callback to trigger re-render');
            callback(this.formData);

            // Restore cursor position after re-render (use requestAnimationFrame to ensure DOM is updated)
            // If the message includes a transformed Slate selection, use that
            // Otherwise fall back to the old DOM-based cursor saving approach
            // Use double requestAnimationFrame to wait for ALL rendering to complete
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                if (event.data.selection) {
                  console.log('[HYDRA] Restoring cursor from transformed Slate selection:', event.data.selection);
                  this.restoreSlateSelection(event.data.selection, this.formData);
                } else {
                  console.log('[HYDRA] No transformed selection provided, using DOM-based cursor restoration');
                  const savedCursor = this.saveCursorPosition();
                  this.restoreCursorPosition(savedCursor);
                }
              });
            });

            // After the re-render, add the toolbar
            // Note: Toolbar creation and block selection should NOT happen in FORM_DATA handler
            // Those are triggered by user clicks (selectBlock()) or SELECT_BLOCK messages
            // FORM_DATA is just data synchronization - it updates the rendered blocks
            // but should not change which block is selected or create/destroy toolbars

            // Unblock input after any FORM_DATA is received (indicates transform completed)
            // Check all blocks for pending transforms and unblock them
            Object.keys(this.pendingTransforms).forEach((blockId) => {
              console.log('[HYDRA] Unblocking input for', blockId, 'after FORM_DATA');
              this.setBlockProcessing(blockId, false);
            });

            // Update block UI overlay positions after form data changes
            // Blocks might have resized after form updates
            if (this.selectedBlockUid) {
              requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                  const blockElement = document.querySelector(`[data-block-uid="${this.selectedBlockUid}"]`);
                  if (blockElement) {
                    const rect = blockElement.getBoundingClientRect();
                    const blockData = this.formData?.blocks?.[this.selectedBlockUid];
                    const isSlateBlock = blockData?.['@type'] === 'slate';

                    window.parent.postMessage(
                      {
                        type: 'BLOCK_SELECTED',
                        blockUid: this.selectedBlockUid,
                        rect: {
                          top: rect.top,
                          left: rect.left,
                          width: rect.width,
                          height: rect.height,
                        },
                        showFormatButtons: isSlateBlock && this.focusedFieldName === 'value',
                      },
                      this.adminOrigin,
                    );
                  }
                });
              });
            }
          } else {
            throw new Error('No form data has been sent from the adminUI');
          }
        } else if (event.data.type === 'SLATE_ERROR') {
          // Handle errors from Slate formatting operations
          console.error('[HYDRA] Received SLATE_ERROR:', event.data.error);
          const blockId = event.data.blockId;

          // Clear the processing state and timeout for this block
          if (blockId && this.pendingTransforms[blockId]) {
            console.log('[HYDRA] Clearing processing state due to SLATE_ERROR');
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
      console.log('[HYDRA] Block element not found for field detection:', blockUid);
      return;
    }

    // Set contenteditable on text and slate fields only
    // Get blockType to look up field types
    const blockType = this.formData?.blocks?.[blockUid]?.['@type'];
    const blockTypeFields = this.blockFieldTypes?.[blockType] || {};
    const editableFields = blockElement.querySelectorAll('[data-editable-field]');
    editableFields.forEach((field) => {
      const fieldName = field.getAttribute('data-editable-field');
      const fieldType = blockTypeFields[fieldName];
      // Only set contenteditable for string, textarea, and slate fields
      if (fieldType === 'string' || fieldType === 'textarea' || fieldType === 'slate') {
        field.setAttribute('contenteditable', 'true');

        // For string fields (single-line), prevent Enter key from creating new lines
        if (fieldType === 'string') {
          // Store the handler so we can remove it later if needed
          if (!field._enterKeyHandler) {
            field._enterKeyHandler = (e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                console.log('[HYDRA] Prevented Enter key in string field');
              }
            };
            field.addEventListener('keydown', field._enterKeyHandler);
          }
        }
      }
    });

    let fieldToFocus = null;

    if (this.lastClickEvent) {
      // Find the clicked editable field
      const clickedElement = this.lastClickEvent.target;
      const clickedField = clickedElement.closest('[data-editable-field]');
      console.log('[HYDRA] Click event path - found clickedField:', !!clickedField);
      if (clickedField) {
        fieldToFocus = clickedField.getAttribute('data-editable-field');
        console.log('[HYDRA] Got field from click:', fieldToFocus);
      }
    }

    // If no clicked field found, use the first editable field
    if (!fieldToFocus) {
      const firstEditableField = blockElement.querySelector('[data-editable-field]');
      console.log('[HYDRA] querySelector path - found:', !!firstEditableField);
      if (firstEditableField) {
        fieldToFocus = firstEditableField.getAttribute('data-editable-field');
        console.log('[HYDRA] Got field from querySelector:', fieldToFocus);
      }
    }

    // Update focusedFieldName and recreate toolbar if field changed
    if (fieldToFocus !== this.focusedFieldName) {
      console.log('[HYDRA] Updating focusedFieldName from', this.focusedFieldName, 'to', fieldToFocus);
      this.focusedFieldName = fieldToFocus;

      // Update toolbar with the correct field type
      // Only show format buttons if the focused field is a slate field
      const blockFieldTypes = this.blockFieldTypes?.[blockType] || {};
      const focusedFieldType = fieldToFocus ? blockFieldTypes[fieldToFocus] : undefined;
      const showFormatBtns = focusedFieldType === 'slate';

      // Send BLOCK_SELECTED message to update toolbar visibility
      const blockElement = document.querySelector(`[data-block-uid="${blockUid}"]`);
      if (blockElement) {
        const rect = blockElement.getBoundingClientRect();
        window.parent.postMessage(
          {
            type: 'BLOCK_SELECTED',
            blockUid,
            rect: {
              top: rect.top,
              left: rect.left,
              width: rect.width,
              height: rect.height,
            },
            showFormatButtons: showFormatBtns,
          },
          this.adminOrigin,
        );
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
      event.stopPropagation();
      const blockElement = event.target.closest('[data-block-uid]');
      if (blockElement) {
        // Store the click event for cursor positioning
        this.lastClickEvent = event;
        this.selectBlock(blockElement);
      }
    };

    document.removeEventListener('click', this.blockClickHandler);
    document.addEventListener('click', this.blockClickHandler);
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
  setBlockProcessing(blockId, processing = true) {
    console.log('[HYDRA] setBlockProcessing:', { blockId, processing });
    const block = document.querySelector(`[data-block-uid="${blockId}"]`);
    const editableField = block?.querySelector('[data-editable-field="value"]');

    if (!editableField) {
      console.log('[HYDRA] setBlockProcessing: No editable field found for', blockId);
      return;
    }

    if (processing) {
      console.log('[HYDRA] BLOCKING input for', blockId);
      // Create keyboard blocker function
      const blockKeyboard = (e) => {
        console.log('[HYDRA] BLOCKED keyboard event:', e.type, 'key:', e.key, 'for block:', blockId);
        e.preventDefault();
        e.stopPropagation();
        return false;
      };

      // Store the blocker so we can remove it later
      editableField._keyboardBlocker = blockKeyboard;

      // Block all keyboard and input events
      editableField.addEventListener('keydown', blockKeyboard, true);
      editableField.addEventListener('keypress', blockKeyboard, true);
      editableField.addEventListener('input', blockKeyboard, true);
      editableField.addEventListener('beforeinput', blockKeyboard, true);

      // Block input
      editableField.setAttribute('contenteditable', 'false');
      editableField.style.cursor = 'wait';
      editableField.style.pointerEvents = 'none'; // Prevent clicks from re-enabling editing
      editableField.blur(); // Remove focus to actually prevent keyboard input

      // TODO: Send message to parent to disable format buttons

      // Start timeout (2 seconds)
      if (this.pendingTransforms[blockId]) {
        clearTimeout(this.pendingTransforms[blockId]);
      }
      this.pendingTransforms[blockId] = setTimeout(() => {
        this.handleTransformTimeout(blockId);
      }, 2000);
    } else {
      console.log('[HYDRA] UNBLOCKING input for', blockId);
      // Remove keyboard blocker
      if (editableField._keyboardBlocker) {
        editableField.removeEventListener('keydown', editableField._keyboardBlocker, true);
        editableField.removeEventListener('keypress', editableField._keyboardBlocker, true);
        editableField.removeEventListener('input', editableField._keyboardBlocker, true);
        editableField.removeEventListener('beforeinput', editableField._keyboardBlocker, true);
        delete editableField._keyboardBlocker;
      }

      // Unblock input
      editableField.setAttribute('contenteditable', 'true');
      editableField.style.cursor = 'text';
      editableField.style.pointerEvents = 'auto'; // Re-enable interaction

      // TODO: Send message to parent to re-enable format buttons

      // Clear timeout
      if (this.pendingTransforms[blockId]) {
        clearTimeout(this.pendingTransforms[blockId]);
        delete this.pendingTransforms[blockId];
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
    const editableField = block?.querySelector('[data-editable-field="value"]');

    if (editableField) {
      // Show error state - permanently disable editing
      editableField.setAttribute('contenteditable', 'false');
      editableField.style.cursor = 'not-allowed';
      editableField.style.opacity = '0.5';
      editableField.title =
        'Transform timeout - refresh page to continue editing';
    }

    console.error('[HYDRA] Transform timeout for block:', blockId);
    delete this.pendingTransforms[blockId];
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
      console.warn('[HYDRA] Could not serialize selection points');
      return null;
    }

    return { anchor, focus };
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

    // Walk up to find the path through the Slate structure
    const path = this.getNodePath(textNode);
    if (!path) {
      return null;
    }

    return { path, offset: textOffset };
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
  getNodePath(node) {
    const path = [];
    let current = node;

    // Walk up the DOM tree building the path
    while (current) {
      // Process current node first
      if (current.hasAttribute?.('data-node-id')) {
        // This is a Slate node, find its index among siblings
        const parent = current.parentNode;
        const siblings = Array.from(parent.children).filter((child) =>
          child.hasAttribute('data-node-id'),
        );
        const index = siblings.indexOf(current);
        if (index !== -1) {
          path.unshift(index);
        }
      } else if (current.nodeType === Node.TEXT_NODE) {
        // Text node - find index among text siblings
        const parent = current.parentNode;
        const textNodes = Array.from(parent.childNodes).filter(
          (child) => child.nodeType === Node.TEXT_NODE,
        );
        const index = textNodes.indexOf(current);
        if (index !== -1) {
          path.unshift(index);
        }
      }

      // Stop if we've reached the editable field container or slate editor
      if (current.hasAttribute?.('data-editable-field') || current.hasAttribute?.('data-slate-editor')) {
        break;
      }

      current = current.parentNode;
    }

    // If we didn't find the editable field or slate editor, path is invalid
    if (!current) {
      return null;
    }

    // Ensure path has at least block index (0 for paragraph)
    if (path.length === 0) {
      return [0, 0]; // Default to first block, first text
    }

    return path;
  }

  /**
   * Selects a block and communicates the selection to the adminUI.
   *
   * @param {HTMLElement} blockElement - The block element to select.
   */
  selectBlock(blockElement) {
    console.log('[HYDRA] selectBlock called for:', blockElement?.getAttribute('data-block-uid'));
    if (!blockElement) return;
    this.isInlineEditing = true;
    console.log('[HYDRA] Set isInlineEditing = true');

    const blockUid = blockElement.getAttribute('data-block-uid');
    const isSelectingSameBlock = this.selectedBlockUid === blockUid;

    // Helper function to handle each element - sets contenteditable and handles string fields
    const handleElement = (element) => {
      const editableField = element.getAttribute('data-editable-field');
      if (editableField === 'value') {
        this.makeBlockContentEditable(element);
      } else if (editableField !== null) {
        element.setAttribute('contenteditable', 'true');

        // Check field type to determine if this is a string field (single-line)
        const blockType = this.formData?.blocks?.[blockUid]?.['@type'];
        const blockTypeFields = this.blockFieldTypes?.[blockType] || {};
        const fieldType = blockTypeFields[editableField];

        // For string fields (single-line), prevent Enter key from creating new lines
        if (fieldType === 'string' && !element._enterKeyHandler) {
          element._enterKeyHandler = (e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              console.log('[HYDRA] Prevented Enter key in string field');
            }
          };
          element.addEventListener('keydown', element._enterKeyHandler);
        }
      }
    };

    // Function to recursively handle all children
    const handleElementAndChildren = (element) => {
      handleElement(element);
      Array.from(element.children).forEach((child) =>
        handleElementAndChildren(child),
      );
    };

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
          fieldType => fieldType === 'slate'
        );
        if (hasSlateField) {
          this.formData.blocks[blockUid] = this.addNodeIds(
            this.formData.blocks[blockUid],
          );
          window.postMessage(
            { type: 'FORM_DATA', data: this.formData, sender: 'hydrajs-nodeids' },
            window.location.origin,
          );
          window.parent.postMessage(
            {
              type: 'INLINE_EDIT_DATA',
              data: this.formData,
              from: 'selectBlock',
            },
            this.adminOrigin,
          );
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

    // Reset focusedFieldName for new block - don't keep stale value from previous block
    this.focusedFieldName = null;

    // Detect focused field from click location or first editable field
    if (this.lastClickEvent) {
      // Find the clicked editable field
      const clickedElement = this.lastClickEvent.target;
      const clickedField = clickedElement.closest('[data-editable-field]');
      if (clickedField) {
        this.focusedFieldName = clickedField.getAttribute('data-editable-field');
        console.log('[HYDRA] Detected focused field from click:', this.focusedFieldName);
      }
    }

    // If no clicked field, use the first editable field in this block
    if (!this.focusedFieldName) {
      const firstEditableField = blockElement.querySelector('[data-editable-field]');
      if (firstEditableField) {
        this.focusedFieldName = firstEditableField.getAttribute('data-editable-field');
        console.log('[HYDRA] Set focusedFieldName to first editable field:', this.focusedFieldName);
      } else {
        // No editable fields in this block (e.g., image blocks)
        console.log('[HYDRA] No editable fields found, focusedFieldName remains null');
      }
    }

    // Determine if we should show format buttons based on the focused field type
    // blockFieldTypes maps blockType -> fieldName -> fieldType
    const blockType = this.formData?.blocks?.[blockUid]?.['@type'];
    const blockTypeFields = this.blockFieldTypes?.[blockType] || {};
    const focusedFieldType = this.focusedFieldName ? blockTypeFields[this.focusedFieldName] : undefined;
    let show = { formatBtns: focusedFieldType === 'slate' };

    console.log('[HYDRA] Block selected, sending UI messages:', {
      blockUid,
      focusedFieldName: this.focusedFieldName,
      focusedFieldType,
      showFormatBtns: show.formatBtns
    });

    // Send BLOCK_SELECTED message to parent with position and format button visibility
    // Parent will render selection outline, toolbar, and add button overlays
    const rect = blockElement.getBoundingClientRect();
    window.parent.postMessage(
      {
        type: 'BLOCK_SELECTED',
        blockUid,
        rect: {
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
        },
        showFormatButtons: show.formatBtns,
      },
      this.adminOrigin,
    );

    // Create drag handle for block reordering
    // This creates an invisible button in the iframe positioned under the parent's visual drag handle
    // Mouse events pass through the parent's visual (which has pointerEvents: 'none') to this button
    this.createDragHandle(blockElement);

    // Set contenteditable on all editable fields in the block
    handleElementAndChildren(blockElement);
    this.observeBlockTextChanges(blockElement);

    // Track selection changes to preserve selection across format operations
    if (!this.selectionChangeListener) {
      this.selectionChangeListener = () => {
        const selection = window.getSelection();
        console.log('[HYDRA] selectionchange event fired:', {
          rangeCount: selection?.rangeCount,
          isCollapsed: selection?.isCollapsed,
          text: selection?.toString()
        });
        // Save both cursor positions (collapsed) and text selections (non-collapsed)
        if (selection && selection.rangeCount > 0) {
          this.savedSelection = this.serializeSelection();
          console.log('[HYDRA] Selection saved:', this.savedSelection);

          // Send selection to parent for toolbar state updates
          if (this.savedSelection && this.selectedBlockUid) {
            window.parent.postMessage(
              {
                type: 'SELECTION_CHANGE',
                blockId: this.selectedBlockUid,
                selection: this.savedSelection,
              },
              this.adminOrigin,
            );
          }
        } else {
          console.log('[HYDRA] Selection not saved (no ranges)');
        }
      };
      document.addEventListener('selectionchange', this.selectionChangeListener);
    }

    // Use double requestAnimationFrame to wait for ALL DOM updates including rendering editable fields
    // contenteditable will be set in detectFocusedFieldAndUpdateToolbar after DOM is ready
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const currentBlockElement = document.querySelector(`[data-block-uid="${this.selectedBlockUid}"]`);
        console.log('[HYDRA] selectBlock focus handler:', { blockUid: this.selectedBlockUid, found: !!currentBlockElement });

        if (currentBlockElement) {
          // Detect which field should be focused if needed, and update toolbar
          if (this.needsFieldDetection) {
            this.detectFocusedFieldAndUpdateToolbar(this.selectedBlockUid);
            this.needsFieldDetection = false;
          }

          // Focus and position cursor for editable fields (text or slate type)
          const editableField = currentBlockElement.querySelector('[contenteditable="true"]');
          if (editableField) {
            const fieldName = editableField.getAttribute('data-editable-field');
            // Look up field type: blockFieldTypes maps blockType -> fieldName -> fieldType
            const blockType = this.formData?.blocks?.[this.selectedBlockUid]?.['@type'];
            const blockTypeFields = this.blockFieldTypes?.[blockType] || {};
            const fieldType = fieldName ? blockTypeFields[fieldName] : undefined;
            console.log('[HYDRA] Editable field:', { found: true, fieldName, blockType, fieldType });

            if (fieldType === 'string' || fieldType === 'textarea' || fieldType === 'slate') {
              editableField.focus();
              console.log('[HYDRA] Called focus(), activeElement:', document.activeElement);

              if (this.lastClickEvent) {
                // Only restore click position if there's no existing non-collapsed selection
                // (e.g., from Meta+A or programmatic selection)
                const currentSelection = window.getSelection();
                const hasNonCollapsedSelection = currentSelection &&
                  currentSelection.rangeCount > 0 &&
                  !currentSelection.getRangeAt(0).collapsed;

                if (!hasNonCollapsedSelection) {
                  // Position cursor at the click location using caretRangeFromPoint
                  const range = document.caretRangeFromPoint(this.lastClickEvent.clientX, this.lastClickEvent.clientY);
                  console.log('[HYDRA] caretRangeFromPoint:', { x: this.lastClickEvent.clientX, y: this.lastClickEvent.clientY, hasRange: !!range });
                  if (range) {
                    const selection = window.getSelection();
                    selection.removeAllRanges();
                    selection.addRange(range);
                    console.log('[HYDRA] Set selection at click point, rangeCount:', selection.rangeCount);
                  }
                } else {
                  console.log('[HYDRA] Preserving existing non-collapsed selection');
                }

                // Clear the stored click event
                this.lastClickEvent = null;
              }
            } else {
              // No lastClickEvent, just log that we skipped cursor positioning
              console.log('[HYDRA] No lastClickEvent, skipping cursor positioning');
            }
          } else {
            // Not an editable field type, clear click event if any
            if (this.lastClickEvent) {
              console.log('[HYDRA] Non-editable field type, clearing lastClickEvent');
              this.lastClickEvent = null;
            }
          }
        }
      });
    });
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
  }

  /**
   * Sets up mouse tracking to position drag handle dynamically.
   * The drag handle is positioned on mousemove to avoid being destroyed by re-renders.
   */
  createDragHandle() {
    console.log('[HYDRA] createDragHandle called for block:', this.selectedBlockUid);

    // Remove any existing drag handle
    const existingDragHandle = document.querySelector('.volto-hydra-drag-button');
    if (existingDragHandle) {
      console.log('[HYDRA] Removing existing drag handle');
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
    console.log('[HYDRA] Drag handle appended to body');

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
      const toolbarLeft = rect.left;
      const toolbarTop = rect.top - 48; // 48px above block (matches parent toolbar height)

      dragButton.style.left = `${toolbarLeft}px`;
      dragButton.style.top = `${toolbarTop}px`;
      dragButton.style.display = 'block';
      console.log('[HYDRA] Drag handle positioned at:', { left: toolbarLeft, top: toolbarTop });
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
      document.body.appendChild(draggedBlock);

      // Position the copy under the cursor
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

      let closestBlockUid = null;
      let throttleTimeout;
      let insertAt = null; // 0 for top, 1 for bottom

      // Handle mouse movement
      const onMouseMove = (e) => {
        draggedBlock.style.left = `${e.clientX}px`;
        draggedBlock.style.top = `${e.clientY}px`;

        if (!throttleTimeout) {
          throttleTimeout = setTimeout(() => {
            const elementBelow = document.elementFromPoint(e.clientX, e.clientY);
            let closestBlock = elementBelow;

            // Find the closest ancestor with 'data-block-uid'
            while (closestBlock && !closestBlock.hasAttribute('data-block-uid')) {
              closestBlock = closestBlock.parentElement;
            }

            if (closestBlock) {
              // Get or create drop indicator
              let dropIndicator = document.querySelector('.volto-hydra-drop-indicator');
              if (!dropIndicator) {
                dropIndicator = document.createElement('div');
                dropIndicator.className = 'volto-hydra-drop-indicator';
                dropIndicator.style.cssText = `
                  position: absolute;
                  left: 0;
                  right: 0;
                  height: 4px;
                  background: #007bff;
                  pointer-events: none;
                  z-index: 9998;
                `;
                document.body.appendChild(dropIndicator);
              }

              // Determine if hovering over top or bottom half
              const closestBlockRect = closestBlock.getBoundingClientRect();
              const mouseYRelativeToBlock = e.clientY - closestBlockRect.top;
              const isHoveringOverTopHalf =
                mouseYRelativeToBlock < closestBlockRect.height / 2;

              insertAt = isHoveringOverTopHalf ? 0 : 1;
              closestBlockUid = closestBlock.getAttribute('data-block-uid');

              // Position drop indicator between blocks
              // Center it in the gap between adjacent blocks
              const indicatorHeight = 4;
              let indicatorY;

              if (insertAt === 0) {
                // Inserting before this block - find the previous block
                const prevBlock = closestBlock.previousElementSibling;
                if (prevBlock && prevBlock.hasAttribute('data-block-uid')) {
                  // Position exactly halfway between previous block bottom and current block top
                  const prevBlockRect = prevBlock.getBoundingClientRect();
                  const gap = closestBlockRect.top - prevBlockRect.bottom;
                  indicatorY = prevBlockRect.bottom + window.scrollY + (gap / 2) - (indicatorHeight / 2);
                } else {
                  // No previous block - position at top of first block
                  indicatorY = closestBlockRect.top + window.scrollY - (indicatorHeight / 2);
                }
              } else {
                // Inserting after this block - find the next block
                const nextBlock = closestBlock.nextElementSibling;
                if (nextBlock && nextBlock.hasAttribute('data-block-uid')) {
                  // Position exactly halfway between current block bottom and next block top
                  const nextBlockRect = nextBlock.getBoundingClientRect();
                  const gap = nextBlockRect.top - closestBlockRect.bottom;
                  indicatorY = closestBlockRect.bottom + window.scrollY + (gap / 2) - (indicatorHeight / 2);
                } else {
                  // No next block - position at bottom of last block
                  indicatorY = closestBlockRect.bottom + window.scrollY - (indicatorHeight / 2);
                }
              }

              dropIndicator.style.top = `${indicatorY}px`;
              dropIndicator.style.display = 'block';
            }
            throttleTimeout = null;
          }, 100);
        }
      };

      // Cleanup on mouseup & update blocks layout
      const onMouseUp = () => {
        document.querySelector('body').classList.remove('grabbing');
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);

        draggedBlock.remove();

        if (closestBlockUid) {
          const draggedBlockId = blockElement.getAttribute('data-block-uid');
          const blocks_layout = this.formData.blocks_layout.items;
          const draggedBlockIndex = blocks_layout.indexOf(draggedBlockId);
          const targetBlockIndex = blocks_layout.indexOf(closestBlockUid);

          if (draggedBlockIndex !== -1 && targetBlockIndex !== -1) {
            // Remove dragged block from its current position
            blocks_layout.splice(draggedBlockIndex, 1);

            // Determine insertion point based on hover position
            // If dragging down, adjust target index since we removed the dragged block
            let adjustedTargetIndex = targetBlockIndex;
            if (draggedBlockIndex < targetBlockIndex) {
              adjustedTargetIndex--;
            }
            const insertIndex = insertAt === 1 ? adjustedTargetIndex + 1 : adjustedTargetIndex;

            // Insert at new position
            blocks_layout.splice(insertIndex, 0, draggedBlockId);

            // Clean up drop indicator
            const dropIndicator = document.querySelector('.volto-hydra-drop-indicator');
            if (dropIndicator) {
              dropIndicator.style.display = 'none';
            }

            // Send updated blocks_layout to parent
            window.parent.postMessage(
              { type: 'UPDATE_BLOCKS_LAYOUT', data: this.formData },
              this.adminOrigin,
            );
          }
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

      // Handle REQUEST_BLOCK_RESELECT - parent wants updated block position after scroll/resize
      if (event.data.type === 'REQUEST_BLOCK_RESELECT') {
        const { blockUid } = event.data;
        const blockElement = document.querySelector(`[data-block-uid="${blockUid}"]`);

        if (blockElement) {
          // Re-calculate block position and send BLOCK_SELECTED message
          const rect = blockElement.getBoundingClientRect();

          // Determine if format buttons should be shown
          const blockData = this.formData?.blocks?.[blockUid];
          const isSlateBlock = blockData?.['@type'] === 'slate';

          window.parent.postMessage(
            {
              type: 'BLOCK_SELECTED',
              blockUid,
              rect: {
                top: rect.top,
                left: rect.left,
                width: rect.width,
                height: rect.height,
              },
              showFormatButtons: isSlateBlock && this.focusedFieldName === 'value',
            },
            this.adminOrigin,
          );
        }
        return;
      }

      // Handle SELECT_BLOCK - select a new block from Admin UI
      if (event.data.type === 'SELECT_BLOCK') {
        const { uid } = event.data;
        this.selectedBlockUid = uid;
        this.formData = JSON.parse(JSON.stringify(event.data.data));
        if (
          this.selectedBlockUid &&
          this.formData.blocks[this.selectedBlockUid] &&
          this.formData.blocks[this.selectedBlockUid]['@type'] === 'slate' &&
          typeof this.formData.blocks[this.selectedBlockUid].nodeId ===
            'undefined'
        ) {
          this.formData.blocks[this.selectedBlockUid] = this.addNodeIds(
            this.formData.blocks[this.selectedBlockUid],
          );
        }
        window.postMessage(
          {
            type: 'FORM_DATA',
            data: this.formData,
            sender: 'hydrajs-select',
          },
          window.location.origin,
        );
        // console.log("select block", event.data?.method);
        const blockElement = document.querySelector(
          `[data-block-uid="${uid}"]`,
        );
        if (blockElement) {
          !this.elementIsVisibleInViewport(blockElement) &&
            blockElement.scrollIntoView();

          // Call selectBlock() to properly set up toolbar and contenteditable
          // This ensures blocks selected via Order tab work the same as clicking
          this.selectBlock(blockElement);

          // Focus the contenteditable element for Slate text blocks
          if (this.formData.blocks[uid]?.['@type'] === 'slate') {
            // Use double requestAnimationFrame to wait for ALL DOM updates including Quanta toolbar
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                // Re-query the block element to ensure we get the updated DOM element
                const currentBlockElement = document.querySelector(`[data-block-uid="${uid}"]`);
                console.log('[HYDRA] SELECT_BLOCK focus handler:', { uid, found: !!currentBlockElement });
                if (currentBlockElement) {
                  const editableField = currentBlockElement.querySelector('[contenteditable="true"]');
                  console.log('[HYDRA] Editable field:', { found: !!editableField, isConnected: editableField?.isConnected });
                  if (editableField) {
                    // Only focus the field, don't manipulate the selection
                    // The selection may have been carefully set by a format operation
                    // or other operation, so we should preserve it
                    editableField.focus();
                    console.log('[HYDRA] Called focus(), activeElement:', document.activeElement);

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
          console.log('[HYDRA] Block element not found for SELECT_BLOCK, retrying in 100ms:', uid);
          setTimeout(() => {
            // Re-trigger the same SELECT_BLOCK message
            window.postMessage(
              {
                type: 'SELECT_BLOCK_RETRY',
                uid: uid,
                data: this.formData,
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
          console.log('[HYDRA] Block element found on retry, selecting:', uid);
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
            const rect = blockElement.getBoundingClientRect();
            const blockData = this.formData?.blocks?.[this.selectedBlockUid];
            const isSlateBlock = blockData?.['@type'] === 'slate';

            window.parent.postMessage(
              {
                type: 'BLOCK_SELECTED',
                blockUid: this.selectedBlockUid,
                rect: {
                  top: rect.top,
                  left: rect.left,
                  width: rect.width,
                  height: rect.height,
                },
                showFormatButtons: isSlateBlock && this.focusedFieldName === 'value',
              },
              this.adminOrigin,
            );

          }
        }
      }, 150);
    };

    window.addEventListener('scroll', handleScroll);
  }

  ////////////////////////////////////////////////////////////////////////////////
  // Make Block Text Inline Editable and Text Changes Observation
  ////////////////////////////////////////////////////////////////////////////////

  /**
   * Makes the content of a block editable.
   *
   * @param {HTMLElement} blockElement - The block element to make editable.
   */
  makeBlockContentEditable(blockElement) {
    const blockUid = blockElement.getAttribute('data-block-uid');

    // For blocks with data-editable-field (e.g., Slate blocks or simple text fields from widgets/forms)
    // Only make the field-level element contenteditable, not individual inline data-node-id elements
    const editableField = blockElement.querySelector('[data-editable-field]');

    if (editableField) {
      // Make the field contenteditable - child inline elements inherit this
      editableField.setAttribute('contenteditable', 'true');
    }

    if (editableField && blockUid) {
      // Add paste event listener
      editableField.addEventListener('paste', (e) => {
        e.preventDefault(); // Prevent default paste

        const pastedHtml = e.clipboardData.getData('text/html');
        const pastedText = e.clipboardData.getData('text/plain');

        // Block input while processing paste
        this.setBlockProcessing(blockUid, true);

        // Send to Admin UI for Slate deserialization and transform
        window.parent.postMessage(
          {
            type: 'SLATE_PASTE_REQUEST',
            blockId: blockUid,
            html: pastedHtml || pastedText,
            selection: this.serializeSelection() || {},
          },
          this.adminOrigin,
        );
      });

      // Add keydown listener for Enter, Delete, Backspace, Undo, Redo, and formatting shortcuts
      editableField.addEventListener('keydown', (e) => {
        console.log('[HYDRA] Keydown event in editable field:', e.key, 'shiftKey:', e.shiftKey);

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
              console.log('[HYDRA] Formatting shortcut detected:', shortcut, 'format:', config.format);
              e.preventDefault();

              this.sendMessageToParent({
                type: 'SLATE_FORMAT_REQUEST',
                blockId: blockUid,
                selection: this.serializeSelection() || {},
                format: config.format,
                action: 'toggle',
              });
              console.log('[HYDRA] SLATE_FORMAT_REQUEST message sent for', config.format);
              return;
            }
          }
        }

        // Handle Undo (Ctrl+Z / Cmd+Z)
        if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
          console.log('[HYDRA] Undo detected');
          e.preventDefault();

          // Small delay to ensure any pending updates are processed
          setTimeout(() => {
            // Don't block processing - let the undo manager's FORM_DATA update come through
            this.sendMessageToParent({
              type: 'SLATE_UNDO_REQUEST',
              blockId: blockUid,
            });
            console.log('[HYDRA] SLATE_UNDO_REQUEST message sent');
          }, 50);
          return;
        }

        // Handle Redo (Ctrl+Shift+Z / Cmd+Shift+Z or Ctrl+Y / Cmd+Y)
        if ((e.ctrlKey || e.metaKey) && ((e.key === 'z' && e.shiftKey) || e.key === 'y')) {
          console.log('[HYDRA] Redo detected');
          e.preventDefault();

          // Small delay to ensure any pending updates are processed
          setTimeout(() => {
            // Don't block processing - let the undo manager's FORM_DATA update come through
            this.sendMessageToParent({
              type: 'SLATE_REDO_REQUEST',
              blockId: blockUid,
            });
            console.log('[HYDRA] SLATE_REDO_REQUEST message sent');
          }, 50);
          return;
        }

        // Handle Paste (Ctrl+V / Cmd+V)
        if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
          console.log('[HYDRA] Paste shortcut detected');
          e.preventDefault();

          this.setBlockProcessing(blockUid, true);

          // Read from clipboard
          navigator.clipboard.readText().then(text => {
            console.log('[HYDRA] Clipboard text:', text);

            this.sendMessageToParent({
              type: 'SLATE_PASTE_REQUEST',
              blockId: blockUid,
              html: text, // Plain text, htmlToSlate will handle it
              selection: this.serializeSelection() || {},
            });
            console.log('[HYDRA] SLATE_PASTE_REQUEST message sent');
          }).catch(err => {
            console.error('[HYDRA] Failed to read clipboard:', err);
            this.setBlockProcessing(blockUid, false);
          });
          return;
        }

        // Handle Enter key to create new block
        if (e.key === 'Enter' && !e.shiftKey) {
          console.log('[HYDRA] Enter key detected (no Shift)');
          const selection = window.getSelection();
          console.log('[HYDRA] Selection rangeCount:', selection.rangeCount);
          if (!selection.rangeCount) return;

          const range = selection.getRangeAt(0);
          const node = range.startContainer;

          // Check if this is a Slate block (has data-node-id)
          const parentElement =
            node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
          const hasNodeId = parentElement?.closest('[data-node-id]');
          console.log('[HYDRA] Has data-node-id?', !!hasNodeId);

          if (hasNodeId) {
            console.log('[HYDRA] Preventing default Enter and sending SLATE_ENTER_REQUEST for block:', blockUid);
            e.preventDefault(); // Block the default Enter behavior

            this.setBlockProcessing(blockUid, true);

            // Send Enter request to Admin UI for Slate block split
            window.parent.postMessage(
              {
                type: 'SLATE_ENTER_REQUEST',
                blockId: blockUid,
                selection: this.serializeSelection() || {},
              },
              this.adminOrigin,
            );
            console.log('[HYDRA] SLATE_ENTER_REQUEST message sent');
            return;
          }
        }

        // Handle Delete/Backspace at node boundaries
        if (e.key !== 'Delete' && e.key !== 'Backspace') return;

        const selection = window.getSelection();
        if (!selection.rangeCount) return;

        const range = selection.getRangeAt(0);
        const node = range.startContainer;

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

            this.setBlockProcessing(blockUid, true);

            // Send delete request to Admin UI for Slate transform
            window.parent.postMessage(
              {
                type: 'SLATE_DELETE_REQUEST',
                blockId: blockUid,
                direction: e.key === 'Backspace' ? 'backward' : 'forward',
                selection: this.serializeSelection() || {},
              },
              this.adminOrigin,
            );
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
    console.log('[HYDRA] observeBlockTextChanges called for block:', blockElement.getAttribute('data-block-uid'));
    if (this.blockTextMutationObserver) {
      this.blockTextMutationObserver.disconnect();
    }
    // TODO: When a transform update (delete/enter/paste/undo/redo) gets rerendered,
    // it triggers mutations that shouldn't result in INLINE_EDIT_DATA being sent.
    // We need a mechanism to distinguish user-initiated text changes from
    // programmatic updates caused by FORM_DATA messages.
    this.blockTextMutationObserver = new MutationObserver((mutations) => {
      console.log('[HYDRA] Mutation observer detected', mutations.length, 'mutations, isInlineEditing:', this.isInlineEditing);
      mutations.forEach((mutation) => {
        console.log('[HYDRA] Mutation type:', mutation.type, 'target:', mutation.target);
        if (mutation.type === 'characterData') {
          const targetElement =
            mutation.target?.parentElement?.closest('[data-node-id]');
          console.log('[HYDRA] Found targetElement with data-node-id:', targetElement);

          if (targetElement && this.isInlineEditing) {
            console.log('[HYDRA] Calling handleTextChangeOnSlate');
            this.handleTextChangeOnSlate(targetElement);
          } else if (this.isInlineEditing) {
            const targetElement = mutation.target?.parentElement?.closest(
              '[data-editable-field]',
            );
            console.log('[HYDRA] Looking for data-editable-field, found:', targetElement);
            if (targetElement) {
              console.log('[HYDRA] Calling handleTextChange');
              this.handleTextChange(targetElement);
            }
          }
        }
      });
    });
    this.blockTextMutationObserver.observe(blockElement, {
      subtree: true,
      characterData: true,
    });
    console.log('[HYDRA] Mutation observer set up');
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
   * Add nodeIds in the json object to each of the Selected Block's children
   * @param {JSON} json Selected Block's data
   * @param {BigInteger} nodeIdCounter (Optional) Counter to keep track of the nodeIds
   * @returns {JSON} block's data with nodeIds added
   */
  addNodeIds(json, nodeIdCounter = { current: 0 }) {
    if (Array.isArray(json)) {
      return json.map((item) => this.addNodeIds(item, nodeIdCounter));
    } else if (typeof json === 'object' && json !== null) {
      // Clone the object to ensure it's extensible
      json = JSON.parse(JSON.stringify(json));

      // Skip text nodes - they shouldn't have nodeIds
      // Text nodes are identified by having a 'text' property
      if (json.hasOwnProperty('text')) {
        return json;
      }

      if (json.hasOwnProperty('data')) {
        json.nodeId = nodeIdCounter.current++;
        for (const key in json) {
          if (json.hasOwnProperty(key) && key !== 'nodeId' && key !== 'data') {
            json[key] = this.addNodeIds(json[key], nodeIdCounter);
          }
        }
      } else {
        json.nodeId = nodeIdCounter.current++;
        for (const key in json) {
          if (json.hasOwnProperty(key) && key !== 'nodeId') {
            json[key] = this.addNodeIds(json[key], nodeIdCounter);
          }
        }
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
      const startNode = document.querySelector(`[data-node-id="${savedCursor.startNodeId}"]`);
      const endNode = document.querySelector(`[data-node-id="${savedCursor.endNodeId}"]`);

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
    if (!slateSelection || !slateSelection.anchor || !slateSelection.focus) {
      console.warn('[HYDRA] Invalid Slate selection:', slateSelection);
      return;
    }

    try {
      console.log('[HYDRA] Restoring Slate selection:', slateSelection);
      console.log('[HYDRA] Anchor:', JSON.stringify(slateSelection.anchor));
      console.log('[HYDRA] Focus:', JSON.stringify(slateSelection.focus));

      // Find the selected block (assume it's the currently selected block)
      if (!this.selectedBlockUid) {
        return;
      }

      const block = formData.blocks[this.selectedBlockUid];
      if (!block || block['@type'] !== 'slate' || !block.value) {
        return;
      }

      console.log('[HYDRA] Block value for selection restoration:', JSON.stringify(block.value));

      // Get nodeId for anchor and focus by walking the Slate tree
      const anchorNodeId = this.getNodeIdFromPath(block.value, slateSelection.anchor.path);
      const focusNodeId = this.getNodeIdFromPath(block.value, slateSelection.focus.path);

      if (!anchorNodeId || !focusNodeId) {
        return;
      }

      // Find DOM elements
      const anchorElement = document.querySelector(`[data-node-id="${anchorNodeId}"]`);
      const focusElement = document.querySelector(`[data-node-id="${focusNodeId}"]`);

      if (!anchorElement || !focusElement) {
        console.warn('[HYDRA] Could not find DOM elements for nodeIds:', { anchorNodeId, focusNodeId });
        console.warn('[HYDRA] Anchor element:', anchorElement, 'Focus element:', focusElement);
        return;
      }

      console.log('[HYDRA] Found DOM elements for selection restoration:', {
        anchorNodeId,
        focusNodeId,
        anchorElement: anchorElement.tagName,
        focusElement: focusElement.tagName
      });

      // Find the actual text node and offset within the parent element
      // After formatting, the DOM structure may have changed (e.g., <p><strong>Text</strong> rest</p>)
      // We need to walk through all text nodes to find the right position
      const anchorResult = this.findTextNodeAndOffset(anchorElement, slateSelection.anchor.offset);
      const focusResult = this.findTextNodeAndOffset(focusElement, slateSelection.focus.offset);

      if (!anchorResult || !focusResult) {
        return;
      }

      // Create range
      const range = document.createRange();
      const selection = window.getSelection();

      range.setStart(anchorResult.node, anchorResult.offset);
      range.setEnd(focusResult.node, focusResult.offset);

      selection?.removeAllRanges();
      selection?.addRange(range);
    } catch (e) {
      console.error('[HYDRA] Error restoring Slate selection:', e);
    }
  }

  /**
   * Find the text node and offset within an element given a character offset
   * Walks through all text nodes in the element to find the right position
   *
   * @param {HTMLElement} element - Parent element to search within
   * @param {number} targetOffset - Character offset from start of element's text content
   * @returns {{node: Text, offset: number}|null} Text node and offset, or null if not found
   */
  findTextNodeAndOffset(element, targetOffset) {
    let currentOffset = 0;

    // Walk through all child nodes recursively
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );

    let textNode = walker.nextNode();
    while (textNode) {
      const nodeLength = textNode.textContent.length;

      // Check if the target offset falls within this text node
      if (currentOffset + nodeLength >= targetOffset) {
        const offset = targetOffset - currentOffset;
        return { node: textNode, offset };
      }

      currentOffset += nodeLength;
      textNode = walker.nextNode();
    }

    // If we didn't find it, return the last text node with its max offset
    // This handles the case where targetOffset is at the very end
    walker.currentNode = element;
    let lastTextNode = null;
    textNode = walker.nextNode();
    while (textNode) {
      lastTextNode = textNode;
      textNode = walker.nextNode();
    }

    if (lastTextNode) {
      return { node: lastTextNode, offset: lastTextNode.textContent.length };
    }

    return null;
  }

  /**
   * Get nodeId from a Slate path by walking the tree
   * @param {Array} slateValue - Slate document value
   * @param {Array} path - Path array from Slate selection
   * @returns {string|null} NodeId or null if not found
   */
  getNodeIdFromPath(slateValue, path) {
    let node = slateValue;
    let parentNode = null;

    // Walk the path
    for (let i = 0; i < path.length; i++) {
      const index = path[i];

      parentNode = node;

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
    if (node.hasOwnProperty('text') && parentNode && parentNode.nodeId) {
      console.log('[HYDRA] Path points to text node, using parent nodeId:', parentNode.nodeId);
      return parentNode.nodeId;
    }

    // Return the nodeId if it exists
    return node.nodeId || null;
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

  ////////////////////////////////////////////////////////////////////////////////
  // Handling Text Changes in Blocks
  ////////////////////////////////////////////////////////////////////////////////

  /**
   * Handle the text changed in the block element with attr data-editable-field,
   * by getting changed text from DOM and send it to the adminUI
   * @param {HTMLElement} target
   */
  handleTextChange(target) {
    const blockUid = target
      .closest('[data-block-uid]')
      .getAttribute('data-block-uid');
    const editableField = target.getAttribute('data-editable-field');
    if (editableField)
      this.formData.blocks[blockUid][editableField] = target.innerText;
    if (this.formData.blocks[blockUid]['@type'] !== 'slate') {
      window.parent.postMessage(
        {
          type: 'INLINE_EDIT_DATA',
          data: this.formData,
          from: 'textChange',
        },
        this.adminOrigin,
      );
    }
  }

  /**
   * Flush any pending batched text updates immediately
   * Call this before any operation that needs current state (format, cut, paste, undo, etc.)
   */
  flushPendingTextUpdates() {
    if (this.textUpdateTimer) {
      clearTimeout(this.textUpdateTimer);
      this.textUpdateTimer = null;
    }
    if (this.pendingTextUpdate) {
      window.parent.postMessage(this.pendingTextUpdate, this.adminOrigin);
      this.pendingTextUpdate = null;
    }
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
   * Handle the text changed in the slate block element, by updating the json data
   * and sending it to the adminUI
   * @param {HTMLElement} target
   */
  handleTextChangeOnSlate(target) {
    const closestNode = target.closest('[data-node-id]');
    if (closestNode) {
      const nodeId = closestNode.getAttribute('data-node-id');
      const updatedJson = this.updateJsonNode(
        this.formData?.blocks[this.selectedBlockUid],
        nodeId,
        closestNode.innerText?.replace(/\n$/, ''),
      );
      // this.resetJsonNodeIds(updatedJson);
      const currBlock = document.querySelector(
        `[data-block-uid="${this.selectedBlockUid}"]`,
      );
      this.formData.blocks[this.selectedBlockUid] = {
        ...updatedJson,
        plaintext: currBlock.innerText,
      };

      // Store the pending update - create a deep copy so mutations don't affect it
      this.pendingTextUpdate = {
        type: 'INLINE_EDIT_DATA',
        data: JSON.parse(JSON.stringify(this.formData)),
        from: 'textChangeSlate',
      };

      // Clear existing timer and set new one - batches rapid changes
      if (this.textUpdateTimer) {
        console.log('[HYDRA] Clearing existing batch timer');
        clearTimeout(this.textUpdateTimer);
      }

      // Send update after 300ms of no typing (debounce)
      console.log('[HYDRA] Setting batch timer (300ms)');
      this.textUpdateTimer = setTimeout(() => {
        if (this.pendingTextUpdate) {
          const blockData = this.pendingTextUpdate.data.blocks[this.selectedBlockUid];
          console.log('[HYDRA] Batch timer fired, sending update with block data:', JSON.stringify(blockData?.value));
          this.sendMessageToParent(this.pendingTextUpdate);
          this.pendingTextUpdate = null;
          this.textUpdateTimer = null; // Clear the timer reference
        }
      }, 300);

      // this.sendUpdatedJsonToAdminUI(updatedJson);
    }
  }

  /**
   * Update the JSON object with the new text,
   * finds the node in json with given nodeId and update the text in it
   * @param {JSON} json Block's data
   * @param {BigInteger} nodeId Node ID of the element
   * @param {String} newText Updated text
   * @returns {JSON} Updated JSON object
   */
  updateJsonNode(json, nodeId, newText) {
    if (Array.isArray(json)) {
      return json.map((item) => this.updateJsonNode(item, nodeId, newText));
    } else if (typeof json === 'object' && json !== null) {
      if (json.nodeId === parseInt(nodeId, 10)) {
        if (json.hasOwnProperty('text')) {
          json.text = newText;
        } else {
          json.children[0].text = newText;
        }
        return json;
      }
      for (const key in json) {
        if (json.hasOwnProperty(key) && key !== 'nodeId' && key !== 'data') {
          json[key] = this.updateJsonNode(json[key], nodeId, newText);
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
      `;
    document.head.appendChild(style);
  }
}

// Export an instance of the Bridge class
let bridgeInstance = null;

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
    console.log('[HYDRA] Using explicit admin origin:', adminOrigin);
  }
  // 2. Auto-detect from referrer (most secure)
  else if (document.referrer) {
    try {
      adminOrigin = new URL(document.referrer).origin;
      console.log('[HYDRA] Auto-detected admin origin from referrer:', adminOrigin);
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
