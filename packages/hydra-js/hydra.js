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
 * @exports Bridge - Exported for testing purposes
 */
export class Bridge {
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
    this.pendingTransform = null; // Track the single pending transform request (only one at a time due to blocking)
    this.eventBuffer = []; // Buffer for keypresses during blocking (replayed after transform)
    this.pendingBufferReplay = null; // Marked for replay after DOM re-render
    this.savedSelection = null; // Store selection for format operations
    this.textUpdateTimer = null; // Timer for batching text updates
    this.pendingTextUpdate = null; // Pending text update data
    this.scrollTimeout = null; // Timer for scroll debouncing
    this.isProcessingExternalUpdate = false; // Flag to suppress messages during FORM_DATA processing
    this.expectedSelectionFromAdmin = null; // Selection we're restoring from Admin - suppress sending it back
    this.init(options); // Initialize the bridge
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
        window.parent.postMessage(
          { type: 'GET_INITIAL_DATA' },
          this.adminOrigin,
        );
        const reciveInitialData = (e) => {
          if (e.origin === this.adminOrigin) {
            if (e.data.type === 'INITIAL_DATA') {
              this.formData = JSON.parse(JSON.stringify(e.data.data));
              console.log('[HYDRA] formData has blocks:', Object.keys(this.formData?.blocks || {}));

              // Store block field types metadata (blockId -> fieldName -> fieldType)
              this.blockFieldTypes = e.data.blockFieldTypes || {};
              console.log('[HYDRA] Stored blockFieldTypes:', this.blockFieldTypes);

              // Store Slate configuration for keyboard shortcuts and toolbar
              this.slateConfig = e.data.slateConfig || { hotkeys: {}, toolbarButtons: [] };

              // Add nodeIds to all slate fields in all blocks
              this.addNodeIdsToAllSlateFields();

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

        // Send combined initialization message with both config and allowed blocks
        // This ensures voltoConfig is processed first, then allowedBlocks can set
        // the `restricted` property on all blocks (including newly added custom blocks)
        if (options && (options.allowedBlocks || options.voltoConfig)) {
          window.parent.postMessage(
            {
              type: 'FRONTEND_INIT',
              allowedBlocks: options.allowedBlocks,
              voltoConfig: options.voltoConfig,
            },
            this.adminOrigin,
          );
        }
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

                // Send BLOCK_SELECTED message to update toolbar visibility
                const blockElement = document.querySelector(`[data-block-uid="${blockUid}"]`);
                if (blockElement) {
                  const rect = blockElement.getBoundingClientRect();
                  const editableFields = this.getEditableFields(blockElement);
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
                      editableFields,
                      focusedFieldName: editableField, // Send field name so toolbar knows which field to sync
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
   * @typedef {import('@plone/registry').ConfigData} VoltoConfigData
   * @param {VoltoConfigData} voltoConfig
   */
  _updateVoltoConfig(voltoConfig) {
    window.parent.postMessage(
      { type: 'VOLTO_CONFIG', voltoConfig: voltoConfig },
      this.adminOrigin,
    );
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
            this.addNodeIdsToAllSlateFields();

            // Log the block data to see if bold formatting is present
            if (this.selectedBlockUid && this.formData.blocks[this.selectedBlockUid]) {
              console.log('[HYDRA] Block data being passed to callback:', JSON.stringify(this.formData.blocks[this.selectedBlockUid].value));
            }

            // Suppress outbound messages during external update processing
            // This prevents hydra from sending SELECTION_CHANGE or INLINE_EDIT_DATA
            // back to Admin when the update originated FROM Admin
            this.isProcessingExternalUpdate = true;

            // Call the callback first to trigger the re-render
            console.log('[HYDRA] Calling onEditChange callback to trigger re-render');
            callback(this.formData);

            // Restore cursor position after re-render (use requestAnimationFrame to ensure DOM is updated)
            // If the message includes a transformed Slate selection, use that
            // Otherwise fall back to the old DOM-based cursor saving approach
            // Use double requestAnimationFrame to wait for ALL rendering to complete
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                // IMPORTANT: Ensure ZWS in empty inline elements BEFORE restoring selection
                // This allows cursor positioning inside empty formatting elements
                if (this.selectedBlockUid) {
                  const blockElement = document.querySelector(`[data-block-uid="${this.selectedBlockUid}"]`);
                  if (blockElement) {
                    this.ensureZeroWidthSpaces(blockElement);
                    // Re-attach mutation observer after DOM re-render
                    // The old observer was watching the old blockElement which no longer exists
                    this.observeBlockTextChanges(blockElement);
                    // Re-attach event listeners (keydown, paste, etc.) to the new DOM element
                    this.makeBlockContentEditable(blockElement);

                    // Re-attach ResizeObserver and send updated BLOCK_SELECTED
                    // This is critical after drag-and-drop when block moves to new position
                    const editableFields = this.getEditableFields(blockElement);
                    this.observeBlockResize(blockElement, this.selectedBlockUid, editableFields);

                    // Send updated rect to admin so toolbar follows the block
                    const rect = blockElement.getBoundingClientRect();
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
                        editableFields,
                        focusedFieldName: this.focusedFieldName,
                      },
                      this.adminOrigin,
                    );

                    // Reposition drag button to follow the block
                    if (this.dragHandlePositioner) {
                      this.dragHandlePositioner();
                    }
                  }
                }

                if (event.data.transformedSelection) {
                  // Store expected selection so selectionchange handler can suppress it
                  this.expectedSelectionFromAdmin = event.data.transformedSelection;
                  // Clear savedClickPosition so updateBlockUIAfterFormData won't overwrite
                  // the selection we're about to restore from transformedSelection
                  this.savedClickPosition = null;
                  this.restoreSlateSelection(event.data.transformedSelection, this.formData);
                } else if (this.savedSelection) {
                  this.expectedSelectionFromAdmin = this.savedSelection;
                  this.restoreSlateSelection(this.savedSelection, this.formData);
                } else {
                  //console.log('[HYDRA] No saved selection available');
                }
                // Replay any buffered keystrokes now that DOM is ready
                this.replayBufferedEvents();
                // Clear the processing flag - DOM updates are complete
                this.isProcessingExternalUpdate = false;
              });
            });

            // After the re-render, add the toolbar
            // Note: Toolbar creation and block selection should NOT happen in FORM_DATA handler
            // Those are triggered by user clicks (selectBlock()) or SELECT_BLOCK messages
            // FORM_DATA is just data synchronization - it updates the rendered blocks
            // but should not change which block is selected or create/destroy toolbars

            // Unblock input if this FORM_DATA has a matching formatRequestId
            // This ensures we only unblock for the specific format operation that caused blocking
            const formatRequestId = event.data.formatRequestId;
            console.log('[HYDRA] FORM_DATA received with formatRequestId:', formatRequestId, 'pendingTransform:', JSON.stringify(this.pendingTransform));
            if (formatRequestId && this.pendingTransform?.requestId === formatRequestId) {
              console.log('[HYDRA] Unblocking input for', this.pendingTransform.blockId, '- formatRequestId matches');
              this.setBlockProcessing(this.pendingTransform.blockId, false);
            } else if (formatRequestId) {
              console.log('[HYDRA] formatRequestId', formatRequestId, 'does not match pending requestId:', this.pendingTransform?.requestId);
            } else {
              console.log('[HYDRA] No formatRequestId in FORM_DATA, not unblocking');
            }

            // Update block UI overlay positions after form data changes
            // Blocks might have resized after form updates
            if (this.selectedBlockUid) {
              requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                  const blockElement = document.querySelector(`[data-block-uid="${this.selectedBlockUid}"]`);
                  if (blockElement) {
                    this.updateBlockUIAfterFormData(blockElement);
                  }
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
          console.log('[HYDRA] Received FLUSH_BUFFER request, requestId:', requestId);

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
            console.log('[HYDRA] Flushed pending text with requestId, waiting for Redux sync');
          } else {
            // No pending text - send BUFFER_FLUSHED immediately (safe to proceed)
            // Include current selection so toolbar has it when applying format
            this.sendMessageToParent({
              type: 'BUFFER_FLUSHED',
              requestId: requestId,
              selection: this.serializeSelection(),
            });
            console.log('[HYDRA] No pending text, sent BUFFER_FLUSHED immediately');
          }
        } else if (event.data.type === 'SLATE_ERROR') {
          // Handle errors from Slate formatting operations
          console.error('[HYDRA] Received SLATE_ERROR:', event.data.error);
          const blockId = event.data.blockId;

          // Clear the processing state if it matches this block
          if (blockId && this.pendingTransform?.blockId === blockId) {
            console.log('[HYDRA] Clearing processing state due to SLATE_ERROR');
            this.setBlockProcessing(blockId, false);
          }
        } else if (event.data.type === 'UPDATE_BLOCK_FIELD_TYPES') {
          // Merge updated block field types from admin (e.g., after FRONTEND_INIT adds custom blocks)
          const newTypes = event.data.blockFieldTypes || {};
          this.blockFieldTypes = { ...this.blockFieldTypes, ...newTypes };
          console.log('[HYDRA] Updated blockFieldTypes:', this.blockFieldTypes);
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

      // Send BLOCK_SELECTED message to update toolbar visibility
      const blockElement = document.querySelector(`[data-block-uid="${blockUid}"]`);
      if (blockElement) {
        const rect = blockElement.getBoundingClientRect();
        const editableFields = this.getEditableFields(blockElement);
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
            editableFields, // Map of fieldName -> fieldType from DOM
            focusedFieldName: fieldToFocus, // Send field name so toolbar knows which field to sync
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

        // Store the click event for cursor positioning
        this.lastClickEvent = event;
        this.selectBlock(blockElement);
      }
    };

    document.removeEventListener('click', this.blockClickHandler);
    document.addEventListener('click', this.blockClickHandler);

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
    console.log('[HYDRA] setBlockProcessing:', { blockId, processing, requestId });

    if (processing) {
      console.log('[HYDRA] BLOCKING input for', blockId);
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
            console.log('[HYDRA] BUFFERED keyboard event:', e.key, 'buffer size:', this.eventBuffer.length);
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
      const editableField = block?.querySelector('[data-editable-field]');
      if (editableField) {
        editableField.style.cursor = 'wait';
      }

      // Store pending transform to match with FORM_DATA for unblocking
      this.pendingTransform = {
        blockId: blockId,
        requestId: requestId,
      };
    } else {
      console.log('[HYDRA] UNBLOCKING input for', blockId);

      // Clear blocked state
      this.blockedBlockId = null;

      // Restore visual feedback on current element (may be new after re-render)
      const block = document.querySelector(`[data-block-uid="${blockId}"]`);
      const editableField = block?.querySelector('[data-editable-field]');
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
        console.log('[HYDRA] Marked', this.pendingBufferReplay.buffer.length, 'events for replay after DOM ready');
      }
    }
  }

  /**
   * Replays buffered keyboard events after DOM is ready.
   * Called after selection is restored following a transform.
   */
  replayBufferedEvents() {
    if (!this.pendingBufferReplay) {
      return;
    }

    const { blockId, buffer } = this.pendingBufferReplay;
    this.pendingBufferReplay = null;

    console.log('[HYDRA] Replaying', buffer.length, 'buffered events');

    // Re-query editable field in case DOM was re-rendered
    const currentBlock = document.querySelector(`[data-block-uid="${blockId}"]`);
    const currentEditable = currentBlock?.querySelector('[contenteditable="true"]');
    if (!currentEditable) {
      console.warn('[HYDRA] Cannot replay buffer - editable field not found');
      return;
    }

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

        console.log('[HYDRA] Inserted buffered text:', textToInsert);
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
    this.pendingTransform = null;
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
    const path = this.getNodePath(textNode);
    if (!path) {
      console.warn('[HYDRA] serializePoint: getNodePath returned null for textNode:', textNode);
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
  /**
   * Calculate the Slate index of a node among its siblings.
   * Elements with data-node-id use their ID's last component.
   * Text nodes use the next index after the previous sibling.
   */
  getSlateIndexAmongSiblings(node, parent) {
    const siblings = Array.from(parent.childNodes);
    const nodeIndex = siblings.indexOf(node);

    // Look at all siblings before this node to determine Slate index
    let slateIndex = 0;
    for (let i = 0; i < nodeIndex; i++) {
      const sibling = siblings[i];
      if (sibling.nodeType === Node.ELEMENT_NODE && sibling.hasAttribute('data-node-id')) {
        // Element with data-node-id: parse its index from the ID
        const nodeId = sibling.getAttribute('data-node-id');
        const parts = nodeId.split(/[.-]/); // Split on . or -
        const lastIndex = parseInt(parts[parts.length - 1], 10);
        slateIndex = lastIndex + 1; // Next index after this element
      } else if (sibling.nodeType === Node.TEXT_NODE) {
        // Text node: takes the next index
        slateIndex++;
      }
    }

    return slateIndex;
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
        console.log('[HYDRA] getElementPath: Found node-id', nodeId, '-> path:', parts);
        return parts;
      }
      if (current.hasAttribute('data-editable-field')) {
        // Reached the container without finding a node-id
        // For empty containers, return [0] (first paragraph)
        console.log('[HYDRA] getElementPath: Reached container, returning [0]');
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


    // If starting with a text node, calculate its Slate index
    if (node.nodeType === Node.TEXT_NODE) {
      const parent = node.parentNode;

      // Check if parent has data-node-id AND is an inline element (span, strong, etc.)
      // Inline elements wrap their text directly, blocks (p, div) may have multiple text children
      if (
        parent.hasAttribute?.('data-node-id') &&
        parent.nodeName !== 'P' &&
        parent.nodeName !== 'DIV' &&
        !parent.hasAttribute?.('data-editable-field')
      ) {
        const nodeId = parent.getAttribute('data-node-id');

        // Parse the parent's path from its node ID
        const parts = nodeId.split(/[.-]/).map((p) => parseInt(p, 10));

        // Text node index within the parent element
        const siblings = Array.from(parent.childNodes);
        const textIndex = siblings.indexOf(node);

        // Build path: parent path + text index
        path.push(...parts, textIndex);
        return path;
      } else {
        // Parent is a block element or doesn't have data-node-id
        // Calculate Slate index among siblings considering node IDs
        const slateIndex = this.getSlateIndexAmongSiblings(node, parent);
        path.push(slateIndex);
        current = parent;
      }
    }

    // Walk up the DOM tree building the path
    let depth = 0;
    while (current) {
      const hasNodeId = current.hasAttribute?.('data-node-id');
      const hasEditableField = current.hasAttribute?.('data-editable-field');
      const hasSlateEditor = current.hasAttribute?.('data-slate-editor');


      // Process current node
      if (hasNodeId) {
        const nodeId = current.getAttribute('data-node-id');
        // Parse node ID to get path components (e.g., "0.1" -> [0, 1] or "0-1" -> [0, 1])
        const parts = nodeId.split(/[.-]/).map((p) => parseInt(p, 10));

        // Prepend these path components
        for (let i = parts.length - 1; i >= 0; i--) {
          path.unshift(parts[i]);
        }
      }

      // Stop if we've reached the editable field container or slate editor
      if (hasEditableField || hasSlateEditor) {
        break;
      }

      current = current.parentNode;
      depth++;
    }

    // If we didn't find the editable field or slate editor, path is invalid
    if (!current) {
      console.warn('[HYDRA] getNodePath - no container found, returning null');
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
    const blockType = this.formData?.blocks?.[this.selectedBlockUid]?.['@type'];
    const blockTypeFields = this.blockFieldTypes?.[blockType] || {};
    const editableFields = blockElement.querySelectorAll('[data-editable-field]');
    console.log(`[HYDRA] restoreContentEditableOnFields called from ${caller}: found ${editableFields.length} fields`);
    editableFields.forEach((field) => {
      const fieldName = field.getAttribute('data-editable-field');
      const fieldType = blockTypeFields[fieldName];
      const wasEditable = field.getAttribute('contenteditable') === 'true';
      // Only set contenteditable for string, textarea, and slate fields
      if (fieldType === 'string' || fieldType === 'textarea' || fieldType === 'slate') {
        field.setAttribute('contenteditable', 'true');
        console.log(`[HYDRA]   ${fieldName}: ${wasEditable ? 'already editable' : 'SET editable'} (type: ${fieldType})`);
      } else {
        console.log(`[HYDRA]   ${fieldName}: skipped (type: ${fieldType})`);
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
  ensureZeroWidthSpaces(container) {
    // Find inline elements with data-node-id that might be empty
    // Inline formatting elements: strong, em, span (for del/u), code, a
    const inlineElements = container.querySelectorAll(
      'strong[data-node-id], em[data-node-id], span[data-node-id], code[data-node-id], a[data-node-id]'
    );

    inlineElements.forEach(el => {
      // Check if element has no text content and no child nodes
      if (el.textContent === '' && el.childNodes.length === 0) {
        // Insert zero-width no-break space for cursor positioning
        el.appendChild(document.createTextNode('\uFEFF'));
        console.log('[HYDRA] Added ZWS to empty inline element:', el.tagName, el.getAttribute('data-node-id'));
      }

      // Also ensure there's a text node AFTER inline elements for cursor exit
      // When toggling format off, cursor needs a place to go after the inline element
      const nextSibling = el.nextSibling;
      if (!nextSibling || (nextSibling.nodeType !== Node.TEXT_NODE)) {
        // No text node after inline element - add ZWS so cursor can exit
        const zws = document.createTextNode('\uFEFF');
        el.parentNode.insertBefore(zws, el.nextSibling);
        console.log('[HYDRA] Added ZWS after inline element for cursor exit:', el.tagName, el.getAttribute('data-node-id'));
      }
    });
  }

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
        console.log('[HYDRA] stripZeroWidthSpacesFromDOM: Stripping ZWS from:', JSON.stringify(textNode.textContent), '→', JSON.stringify(newText));
        textNode.textContent = newText;
      }
    }
  }

  /**
   * Updates block UI positions and states after form data changes.
   * Centralizes all UI updates that need to happen when blocks are re-rendered,
   * including after drag-and-drop reordering.
   *
   * @param {HTMLElement} blockElement - The currently selected block element.
   */
  updateBlockUIAfterFormData(blockElement) {
    // Restore contenteditable on fields after renderer updates
    // The renderer may have replaced DOM elements, removing contenteditable attributes
    this.restoreContentEditableOnFields(blockElement, 'FORM_DATA');

    // Ensure empty inline formatting elements have ZWS for cursor positioning
    this.ensureZeroWidthSpaces(blockElement);

    // Determine field type for focused field
    const blockType = this.formData?.blocks?.[this.selectedBlockUid]?.['@type'];
    const blockTypeFields = this.blockFieldTypes?.[blockType] || {};
    const fieldType = this.focusedFieldName ? blockTypeFields[this.focusedFieldName] : null;

    // Focus and position cursor in the focused field
    // This ensures clicking a field focuses it immediately (no double-click required)
    if (this.focusedFieldName) {
      const focusedField = blockElement.querySelector(`[data-editable-field="${this.focusedFieldName}"]`);

      if (focusedField && (fieldType === 'string' || fieldType === 'textarea' || fieldType === 'slate')) {
        // Focus the field
        focusedField.focus();

        // Position cursor at click location if we saved it
        if (this.savedClickPosition) {
          const selection = window.getSelection();
          if (selection) {
            // Only restore click position if there's no existing non-collapsed selection
            if (!selection.rangeCount || selection.isCollapsed) {
              // Position cursor at the click location using caretRangeFromPoint
              const range = document.caretRangeFromPoint(
                this.savedClickPosition.clientX,
                this.savedClickPosition.clientY
              );
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
    const rect = blockElement.getBoundingClientRect();

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
        focusedFieldName: this.focusedFieldName, // Send field name so toolbar knows which field to sync
      },
      this.adminOrigin,
    );

    // Reposition drag button after blocks have moved (e.g., after drag-and-drop)
    // The drag button needs to follow the selected block's new position
    if (this.dragHandlePositioner) {
      this.dragHandlePositioner();
    }

    // Re-attach ResizeObserver to the new DOM element
    // React re-renders may have replaced the block element, so our old observer
    // would be watching a detached element. This ensures we catch future size
    // changes (e.g., image loading after a re-render).
    const editableFields = this.getEditableFields(blockElement);
    this.observeBlockResize(blockElement, this.selectedBlockUid, editableFields);

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
    console.log('[HYDRA] selectBlock called for:', blockElement?.getAttribute('data-block-uid'), 'from:', caller);
    if (!blockElement) return;

    // Scroll block into view if needed, with space for toolbar above and add button below
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

    const blockUid = blockElement.getAttribute('data-block-uid');
    const isSelectingSameBlock = this.selectedBlockUid === blockUid;

    // Flush any pending text updates from the previous block before switching
    // Also clear event buffer - user is reorienting to a new block
    if (!isSelectingSameBlock) {
      this.flushPendingTextUpdates();
      this.eventBuffer = [];
    }

    this.isInlineEditing = true;

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

    // Store rect and show flags for BLOCK_SELECTED message (sent after selection is established)
    const rect = blockElement.getBoundingClientRect();
    const editableFields = this.getEditableFields(blockElement);
    this._pendingBlockSelected = {
      blockUid,
      rect: {
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      },
      editableFields, // Map of fieldName -> fieldType from DOM
      focusedFieldName: this.focusedFieldName,
    };

    console.log('[HYDRA] Block selected, sending UI messages:', {
      blockUid,
      focusedFieldName: this.focusedFieldName,
      editableFields,
    });

    // Create drag handle for block reordering
    // This creates an invisible button in the iframe positioned under the parent's visual drag handle
    // Mouse events pass through the parent's visual (which has pointerEvents: 'none') to this button
    this.createDragHandle(blockElement);

    // Set contenteditable on all editable fields in the block
    handleElementAndChildren(blockElement);
    this.observeBlockTextChanges(blockElement);

    // Observe block size changes (e.g., image loading, content changes)
    // This updates the selection outline when block dimensions change
    this.observeBlockResize(blockElement, blockUid, editableFields);

    // Track selection changes to preserve selection across format operations
    if (!this.selectionChangeListener) {
      this.selectionChangeListener = () => {
        const selection = window.getSelection();
        const offset = selection?.rangeCount > 0 ? selection.getRangeAt(0).startOffset : -1;
        console.log('[HYDRA] selectionchange fired, cursor offset:', offset);
        // Save both cursor positions (collapsed) and text selections (non-collapsed)
        if (selection && selection.rangeCount > 0) {
          this.savedSelection = this.serializeSelection();

          // Don't send SELECTION_CHANGE during external updates (FORM_DATA from Admin)
          // The selection change was caused by Admin, not user action
          if (this.isProcessingExternalUpdate) {
            return;
          }

          // Check if this selection matches what Admin just sent us
          // If so, this is the result of restoring their selection - don't echo it back
          if (this.expectedSelectionFromAdmin && this.savedSelection) {
            const expected = this.expectedSelectionFromAdmin;
            const current = this.savedSelection;
            // Compare anchor and focus paths and offsets
            const matches =
              JSON.stringify(expected.anchor) === JSON.stringify(current.anchor) &&
              JSON.stringify(expected.focus) === JSON.stringify(current.focus);
            if (matches) {
              // Same selection as Admin sent - this is the restore, suppress it
              console.log('[HYDRA] Selection matches Admin restore - not sending back');
              return;
            } else {
              // Different selection - user moved cursor/selected text, clear expected
              console.log('[HYDRA] Selection differs from Admin restore - user action');
              this.expectedSelectionFromAdmin = null;
            }
          }

          // Don't send SELECTION_CHANGE during typing - selection will be included
          // when text buffer flushes. This ensures formData and selection stay atomic.
          // Only send standalone SELECTION_CHANGE when user moves cursor without typing
          // (clicking, arrow keys, selecting text).
          if (this.pendingTextUpdate || this.textUpdateTimer) {
            // Text activity in progress - selection will be sent with the text
            return;
          }

          // No pending text - send standalone SELECTION_CHANGE for toolbar state updates
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
        }
      };
      document.addEventListener('selectionchange', this.selectionChangeListener);
    }

    // Use double requestAnimationFrame to wait for ALL DOM updates including rendering editable fields
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

          // Check if field was already editable before we do anything
          const editableField = currentBlockElement.querySelector('[data-editable-field]');
          const wasAlreadyEditable = editableField?.getAttribute('contenteditable') === 'true';

          // Set contenteditable on editable fields immediately (not waiting for FORM_DATA)
          this.restoreContentEditableOnFields(currentBlockElement, 'selectBlock');

          // Focus and position cursor for editable fields (text or slate type)
          // Use focusedFieldName to find the specific field that was clicked, not just the first one
          const contentEditableField = this.focusedFieldName
            ? currentBlockElement.querySelector(`[data-editable-field="${this.focusedFieldName}"]`)
            : currentBlockElement.querySelector('[contenteditable="true"]');
          if (contentEditableField) {
            const fieldName = contentEditableField.getAttribute('data-editable-field');
            const blockData = this.formData?.blocks?.[this.selectedBlockUid];
            const blockType = blockData?.['@type'];
            const blockTypeFields = this.blockFieldTypes?.[blockType] || {};
            const fieldType = fieldName ? blockTypeFields[fieldName] : undefined;

            if (fieldType === 'string' || fieldType === 'textarea' || fieldType === 'slate') {
              // Only call focus if not already focused
              // Calling focus() on already-focused element can disrupt cursor position
              const isAlreadyFocused = document.activeElement === contentEditableField;
              console.log('[HYDRA] selectBlock focus check:', { isAlreadyFocused, activeElement: document.activeElement?.tagName, contentEditableField: contentEditableField.tagName });
              if (!isAlreadyFocused) {
                console.log('[HYDRA] selectBlock calling focus() on field');
                contentEditableField.focus();
              } else {
                console.log('[HYDRA] selectBlock skipping focus() - already focused');
              }

              // If field was already editable, browser already handled cursor positioning
              // on click - don't redo it (causes race with typing)
              if (wasAlreadyEditable) {
                console.log('[HYDRA] Field already editable, trusting browser click positioning');
                this.lastClickEvent = null;
              } else if (this.lastClickEvent) {
                // Field just became editable - need to position cursor
                // Save click position for FORM_DATA handler to use after renderer updates
                this.savedClickPosition = {
                  clientX: this.lastClickEvent.clientX,
                  clientY: this.lastClickEvent.clientY,
                };

                // Only restore click position if there's no existing non-collapsed selection
                // (e.g., from Meta+A or programmatic selection)
                const currentSelection = window.getSelection();
                const hasNonCollapsedSelection = currentSelection &&
                  currentSelection.rangeCount > 0 &&
                  !currentSelection.getRangeAt(0).collapsed;

                if (!hasNonCollapsedSelection) {
                  // Position cursor at the click location using caretRangeFromPoint
                  const range = document.caretRangeFromPoint(this.lastClickEvent.clientX, this.lastClickEvent.clientY);
                  if (range) {
                    const selection = window.getSelection();
                    selection.removeAllRanges();
                    selection.addRange(range);
                  }
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

          // Now send BLOCK_SELECTED with selection - both arrive atomically
          // This prevents race conditions where toolbar gets new block but old selection
          if (this._pendingBlockSelected) {
            // Recalculate rect from current DOM - FORM_DATA may have triggered a re-render
            // that changed block dimensions (e.g., image loading) since we stored the rect
            const currentRect = currentBlockElement.getBoundingClientRect();
            const serializedSelection = this.serializeSelection();
            window.parent.postMessage(
              {
                type: 'BLOCK_SELECTED',
                blockUid: this._pendingBlockSelected.blockUid,
                rect: {
                  top: currentRect.top,
                  left: currentRect.left,
                  width: currentRect.width,
                  height: currentRect.height,
                },
                editableFields: this._pendingBlockSelected.editableFields,
                focusedFieldName: this._pendingBlockSelected.focusedFieldName,
                selection: serializedSelection,
              },
              this.adminOrigin,
            );
            console.log('[HYDRA] Sent BLOCK_SELECTED with selection:', { blockUid: this._pendingBlockSelected.blockUid, selection: serializedSelection });
            this._pendingBlockSelected = null;
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
  observeBlockResize(blockElement, blockUid, editableFields) {
    console.log('[HYDRA] observeBlockResize called for block:', blockUid);
    // Clean up any existing observer
    if (this.blockResizeObserver) {
      this.blockResizeObserver.disconnect();
    }

    // Store initial dimensions to detect actual changes
    let lastRect = blockElement.getBoundingClientRect();
    console.log('[HYDRA] observeBlockResize initial rect:', { width: lastRect.width, height: lastRect.height });

    this.blockResizeObserver = new ResizeObserver((entries) => {
      console.log('[HYDRA] ResizeObserver callback fired for:', blockUid);
      // Only process if this is still the selected block
      if (this.selectedBlockUid !== blockUid) {
        console.log('[HYDRA] ResizeObserver: block no longer selected, ignoring');
        return;
      }

      for (const entry of entries) {
        const newRect = entry.target.getBoundingClientRect();

        // Only send update if dimensions actually changed significantly (> 1px)
        const widthChanged = Math.abs(newRect.width - lastRect.width) > 1;
        const heightChanged = Math.abs(newRect.height - lastRect.height) > 1;
        const topChanged = Math.abs(newRect.top - lastRect.top) > 1;
        const leftChanged = Math.abs(newRect.left - lastRect.left) > 1;

        if (widthChanged || heightChanged || topChanged || leftChanged) {
          console.log('[HYDRA] Block size changed, updating selection outline:', {
            blockUid,
            oldSize: { width: lastRect.width, height: lastRect.height },
            newSize: { width: newRect.width, height: newRect.height },
          });

          lastRect = newRect;

          // Send updated BLOCK_SELECTED with new rect
          window.parent.postMessage(
            {
              type: 'BLOCK_SELECTED',
              blockUid,
              rect: {
                top: newRect.top,
                left: newRect.left,
                width: newRect.width,
                height: newRect.height,
              },
              editableFields,
              focusedFieldName: this.focusedFieldName,
            },
            this.adminOrigin,
          );
        }
      }
    });

    // Observe border-box to catch padding/border changes too (not just content)
    // This ensures the selection outline updates for any visual size change
    this.blockResizeObserver.observe(blockElement, { box: 'border-box' });
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

      // Position drag button to match parent toolbar position
      // IMPORTANT: Use BLOCK CONTAINER rect (same as BLOCK_SELECTED message), NOT editable field rect
      const rect = blockElement.getBoundingClientRect();
      const toolbarLeft = rect.left;  // Left edge of block container
      const toolbarTop = rect.top - 48; // 48px above block container (matches parent toolbar height)

      dragButton.style.left = `${toolbarLeft}px`;
      dragButton.style.top = `${toolbarTop}px`;
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
        if (
          closestBlock &&
          (closestBlock === draggedBlock ||
            closestBlock === blockElement ||
            closestBlock.getAttribute('data-block-uid') === draggedBlockUid)
        ) {
          closestBlock = null;
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
              display: none;
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
          console.log('[HYDRA] Hiding drop indicator on mouseup');
          dropIndicator.style.display = 'none';
        } else {
          console.log('[HYDRA] No drop indicator to hide on mouseup');
        }

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
          const editableFields = this.getEditableFields(blockElement);

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
              editableFields, // Map of fieldName -> fieldType from DOM
              focusedFieldName: this.focusedFieldName, // Preserve field name for toolbar
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
        // Don't update formData here - it's managed via FORM_DATA messages
        // Don't post FORM_DATA - form data syncing is handled separately

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

          // Focus the contenteditable element for blocks with editable fields
          // This includes slate, string, and textarea field types
          const blockType = this.formData.blocks[uid]?.['@type'];
          const blockTypeFields = this.blockFieldTypes?.[blockType] || {};
          const hasEditableFields = Object.keys(blockTypeFields).length > 0 || blockType === 'slate';

          if (hasEditableFields) {
            // Use double requestAnimationFrame to wait for ALL DOM updates including Quanta toolbar
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                // Re-query the block element to ensure we get the updated DOM element
                const currentBlockElement = document.querySelector(`[data-block-uid="${uid}"]`);
                if (currentBlockElement) {
                  const editableField = currentBlockElement.querySelector('[contenteditable="true"]');
                  if (editableField) {
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
          console.log('[HYDRA] Block element not found for SELECT_BLOCK, retrying in 100ms:', uid);
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
            const editableFields = this.getEditableFields(blockElement);

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
                editableFields, // Map of fieldName -> fieldType from DOM
                focusedFieldName: this.focusedFieldName, // Preserve field name for toolbar
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
      blockUid = elementOrBlock.getAttribute('data-block-uid');
      editableField = elementOrBlock.querySelector('[data-editable-field]');
    }

    if (editableField) {
      // Make the field contenteditable - child inline elements inherit this
      editableField.setAttribute('contenteditable', 'true');
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

        console.log('[HYDRA] Copy event - cleaning clipboard');
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
          console.log('[HYDRA] Suppressing native formatting for:', e.key);
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

        // Handle Copy (Ctrl+C / Cmd+C) - strip ZWS from clipboard
        if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
          const selection = window.getSelection();
          const selectedText = selection.toString();
          // Strip ZWS characters before writing to clipboard
          const cleanText = this.stripZeroWidthSpaces(selectedText);
          if (cleanText !== selectedText) {
            console.log('[HYDRA] Copy - stripping ZWS from clipboard');
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
          console.log('[HYDRA] Cut shortcut detected');
          e.preventDefault();

          // Get selected text and copy to clipboard
          const selection = window.getSelection();
          const selectedText = selection.toString();
          // Strip ZWS characters before writing to clipboard
          const cleanText = this.stripZeroWidthSpaces(selectedText);
          console.log('[HYDRA] Cut text:', cleanText);

          if (cleanText) {
            // Write to clipboard
            navigator.clipboard.writeText(cleanText).then(() => {
              console.log('[HYDRA] Text written to clipboard');
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
          console.log('[HYDRA] Paste shortcut detected');
          e.preventDefault();

          // Read from clipboard then send transform request
          navigator.clipboard.readText().then(text => {
            console.log('[HYDRA] Clipboard text:', text);

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
            console.log('[HYDRA] Preventing default Enter and sending transform request for block:', blockUid);
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
    console.log('[HYDRA] observeBlockTextChanges called for block:', blockElement.getAttribute('data-block-uid'));
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
          const parentEl = mutation.target?.parentElement;
          const targetElement = parentEl?.closest('[data-editable-field]');

          if (targetElement) {
            // Pass parentEl so handleTextChange can find the actual node that changed
            // (e.g., SPAN for inline formatting) rather than the whole editable field (P)
            this.handleTextChange(targetElement, parentEl);
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
   * Collects all editable fields from a block element.
   * Returns an object mapping fieldName -> fieldType (e.g., { heading: 'string', description: 'slate' })
   * @param {HTMLElement} blockElement - The block element to scan
   * @returns {Object} Map of field names to their types
   */
  getEditableFields(blockElement) {
    if (!blockElement) return {};

    const blockUid = blockElement.getAttribute('data-block-uid');
    const blockData = this.formData?.blocks?.[blockUid];
    const blockType = blockData?.['@type'];
    const blockTypeFields = this.blockFieldTypes?.[blockType] || {};

    const editableFields = {};
    const fieldElements = blockElement.querySelectorAll('[data-editable-field]');

    fieldElements.forEach((element) => {
      const fieldName = element.getAttribute('data-editable-field');
      if (fieldName) {
        // Get the field type from blockFieldTypes, or infer from the element
        const fieldType = blockTypeFields[fieldName] || 'string';
        editableFields[fieldName] = fieldType;
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
   * Add nodeIds to all Slate fields in all blocks
   * This centralizes the logic for adding nodeIds to ensure consistency
   */
  addNodeIdsToAllSlateFields() {
    if (this.formData && this.formData.blocks) {
      Object.keys(this.formData.blocks).forEach((blockId) => {
        const block = this.formData.blocks[blockId];
        const blockType = block['@type'];
        const fieldTypes = this.blockFieldTypes?.[blockType] || {};

        // Check each field in the block
        Object.keys(fieldTypes).forEach((fieldName) => {
          if (fieldTypes[fieldName] === 'slate' && block[fieldName]) {
            // Add nodeIds to the slate field's value
            block[fieldName] = this.addNodeIds(block[fieldName]);
          }
        });
      });
    }
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

      // Skip text nodes - they shouldn't have nodeIds
      // Text nodes are identified by having a 'text' property
      if (json.hasOwnProperty('text')) {
        return json;
      }

      // Assign path-based nodeId to this element
      json.nodeId = path;

      // Recursively process children
      for (const key in json) {
        if (json.hasOwnProperty(key) && key !== 'nodeId') {
          // For children arrays, build paths like "0.0", "0.1", etc.
          if (key === 'children' && Array.isArray(json[key])) {
            json[key] = json[key].map((child, index) => {
              const childPath = `${path}.${index}`;
              return this.addNodeIds(child, childPath);
            });
          } else if (Array.isArray(json[key])) {
            // Handle other arrays (less common in Slate)
            json[key] = json[key].map((item, index) => {
              const itemPath = `${path}.${key}.${index}`;
              return this.addNodeIds(item, itemPath);
            });
          } else {
            // For non-array properties, pass the same path
            json[key] = this.addNodeIds(json[key], path);
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
      // Find the selected block and determine field type
      if (!this.selectedBlockUid || !this.focusedFieldName) {
        return;
      }

      const block = formData.blocks[this.selectedBlockUid];
      if (!block) {
        return;
      }

      const blockType = block['@type'];
      const blockTypeFields = this.blockFieldTypes?.[blockType] || {};
      const fieldType = blockTypeFields[this.focusedFieldName];
      const fieldValue = block[this.focusedFieldName];

      // Find the block element for locating editable fields
      const blockElement = document.querySelector(`[data-block-uid="${this.selectedBlockUid}"]`);
      if (!blockElement) {
        return;
      }

      let anchorElement, focusElement;
      let anchorTextResult = null;
      let focusTextResult = null;

      // Check if this is a slate field with complex structure (has nodeIds)
      const isSlateWithNodeIds = fieldType === 'slate' && Array.isArray(fieldValue) && fieldValue.length > 0 && fieldValue[0]?.nodeId !== undefined;

      if (isSlateWithNodeIds) {
        // Slate field with nodeIds - use existing path-based lookup
        const anchorResult = this.getNodeIdFromPath(fieldValue, slateSelection.anchor.path);
        const focusResult = this.getNodeIdFromPath(fieldValue, slateSelection.focus.path);

        if (!anchorResult || !focusResult) {
          return;
        }

        // Find DOM elements by nodeId
        anchorElement = document.querySelector(`[data-node-id="${anchorResult.nodeId}"]`);
        focusElement = document.querySelector(`[data-node-id="${focusResult.nodeId}"]`);

        if (!anchorElement || !focusElement) {
          console.warn('[HYDRA] Could not find DOM elements for nodeIds:', { anchorResult, focusResult });
          return;
        }

        // Find DOM children using Slate child index
        if (anchorResult.textChildIndex !== null) {
          const anchorChild = this.findChildBySlateIndex(anchorElement, anchorResult.textChildIndex);
          if (anchorChild) {
            anchorTextResult = this.findTextNodeInChild(anchorChild, slateSelection.anchor.offset);
          } else {
            console.warn('[HYDRA] Could not find anchor child at Slate index:', anchorResult.textChildIndex);
          }
        } else {
          anchorTextResult = this.findTextNodeInChild(anchorElement, slateSelection.anchor.offset);
        }

        if (focusResult.textChildIndex !== null) {
          const focusChild = this.findChildBySlateIndex(focusElement, focusResult.textChildIndex);
          if (focusChild) {
            focusTextResult = this.findTextNodeInChild(focusChild, slateSelection.focus.offset);
          } else {
            console.warn('[HYDRA] Could not find focus child at Slate index:', focusResult.textChildIndex);
          }
        } else {
          focusTextResult = this.findTextNodeInChild(focusElement, slateSelection.focus.offset);
        }
      } else {
        // String/textarea field or slate without nodeIds - degenerate case
        // Selection path is [0] with just an offset
        // Find the editable field directly by data-editable-field attribute
        const editableField = blockElement.querySelector(`[data-editable-field="${this.focusedFieldName}"]`);
        if (!editableField) {
          console.warn('[HYDRA] Could not find editable field:', this.focusedFieldName);
          return;
        }

        // Both anchor and focus use the same element for simple text fields
        anchorElement = focusElement = editableField;
        anchorTextResult = this.findTextNodeInChild(editableField, slateSelection.anchor.offset);
        focusTextResult = this.findTextNodeInChild(editableField, slateSelection.focus.offset);
      }


      if (!anchorTextResult || !focusTextResult) {
        console.warn('[HYDRA] Selection restoration failed - could not find text nodes');
        return;
      }

      // Create range
      const range = document.createRange();
      const selection = window.getSelection();

      range.setStart(anchorTextResult.node, anchorTextResult.offset);
      range.setEnd(focusTextResult.node, focusTextResult.offset);

      selection?.removeAllRanges();
      selection?.addRange(range);

      console.log('[HYDRA] Selection set, verifying:', {
        anchorNode: selection?.anchorNode?.nodeName,
        anchorOffset: selection?.anchorOffset,
        anchorParent: selection?.anchorNode?.parentElement?.tagName,
        rangeCount: selection?.rangeCount
      });
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
        let offset = targetOffset - currentOffset;
        // If this is a ZWS-only text node and offset is 0, position AFTER the ZWS
        // This helps browsers preserve the cursor inside inline elements when typing
        const zwsPattern = /^[\uFEFF\u200B]+$/;
        if (offset === 0 && zwsPattern.test(textNode.textContent)) {
          offset = textNode.textContent.length;
          console.log('[HYDRA] findTextNodeAndOffset: ZWS node detected, positioning after ZWS, offset:', offset);
        }
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
    // Helper to adjust offset for ZWS-only text nodes
    // If offset is 0 in a ZWS-only node, position AFTER the ZWS
    // This helps browsers preserve the cursor inside inline elements when typing
    const adjustOffsetForZWS = (textNode, requestedOffset) => {
      const zwsPattern = /^[\uFEFF\u200B]+$/;
      if (requestedOffset === 0 && zwsPattern.test(textNode.textContent)) {
        console.log('[HYDRA] findTextNodeInChild: ZWS node detected, positioning after ZWS');
        return textNode.textContent.length;
      }
      return Math.min(requestedOffset, textNode.textContent.length);
    };

    if (child.nodeType === Node.TEXT_NODE) {
      // Direct text node - use it with the offset (adjusted for ZWS)
      const validOffset = adjustOffsetForZWS(child, offset);
      return { node: child, offset: validOffset };
    }

    if (child.nodeType === Node.ELEMENT_NODE) {
      // Element node - find the first text node within
      const walker = document.createTreeWalker(
        child,
        NodeFilter.SHOW_TEXT,
        null,
        false
      );

      const textNode = walker.nextNode();
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
      console.log('[HYDRA] Path points to text node at index', lastIndex, 'using parent nodeId:', parentNode.nodeId);
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
    if (formDataCopy.blocks) {
      Object.keys(formDataCopy.blocks).forEach((blockId) => {
        this.resetJsonNodeIds(formDataCopy.blocks[blockId]);
      });
    }
    return formDataCopy;
  }

  /**
   * Get the field type for a given block and field name
   * @param {string} blockUid - The block UID
   * @param {string} fieldName - The field name (e.g., 'value', 'text', 'description')
   * @returns {string|undefined} Field type ('slate', 'string', 'textarea') or undefined
   */
  getFieldType(blockUid, fieldName) {
    const blockType = this.formData?.blocks?.[blockUid]?.['@type'];
    const blockTypeFields = this.blockFieldTypes?.[blockType] || {};
    return blockTypeFields[fieldName];
  }

  /**
   * Check if a field is a slate field
   * @param {string} blockUid - The block UID
   * @param {string} fieldName - The field name
   * @returns {boolean} True if the field is a slate field
   */
  isSlateField(blockUid, fieldName) {
    return this.getFieldType(blockUid, fieldName) === 'slate';
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

    console.log(`[HYDRA] SLATE_TRANSFORM_REQUEST (${transformType}) sent with data, requestId:`, requestId);
    return requestId;
  }

  ////////////////////////////////////////////////////////////////////////////////
  // Handling Text Changes in Blocks
  ////////////////////////////////////////////////////////////////////////////////

  /**
   * Handle the text changed in the block element with attr data-editable-field,
   * by getting changed text from DOM and send it to the adminUI
   * @param {HTMLElement} target
   */
  handleTextChange(target, mutatedNodeParent = null) {
    const blockUid = target
      .closest('[data-block-uid]')
      .getAttribute('data-block-uid');
    const editableField = target.getAttribute('data-editable-field');

    if (!editableField) {
      console.warn('[HYDRA] handleTextChange: No data-editable-field found');
      return;
    }

    // Don't process text changes during external updates (FORM_DATA from Admin)
    // The DOM mutation was caused by Admin re-rendering, not user typing
    if (this.isProcessingExternalUpdate) {
      console.warn('[HYDRA] handleTextChange: Ignoring - external update in progress');
      return;
    }

    // Determine field type from block schema metadata
    const blockType = this.formData?.blocks[blockUid]?.['@type'];
    const blockFieldTypes = this.blockFieldTypes?.[blockType] || {};
    const fieldType = blockFieldTypes[editableField];


    // Note: We intentionally do NOT strip ZWS from DOM during typing.
    // Like slate-react, we let the frontend re-render (triggered by FORM_DATA) naturally remove ZWS.
    // Stripping during typing corrupts cursor position. ZWS is stripped on copy events and during serialization.

    if (fieldType === 'slate') {
      // Slate field - update JSON structure using nodeId
      // Use the actual mutated node's parent if provided (e.g., SPAN for inline formatting)
      // This ensures we update the correct node, not the whole editable field
      const closestNode = (mutatedNodeParent && mutatedNodeParent.hasAttribute('data-node-id'))
        ? mutatedNodeParent
        : target.closest('[data-node-id]');
      if (!closestNode) {
        console.log('[HYDRA] Slate field but no data-node-id found!');
        return;
      }

      const nodeId = closestNode.getAttribute('data-node-id');
      // Strip ZWS characters before updating - they're only for cursor positioning in DOM
      const textContent = this.stripZeroWidthSpaces(closestNode.innerText)?.replace(/\n$/, '');
      const updatedJson = this.updateJsonNode(
        this.formData?.blocks[blockUid],
        nodeId,
        textContent,
      );

      const currBlock = document.querySelector(
        `[data-block-uid="${blockUid}"]`,
      );
      this.formData.blocks[blockUid] = {
        ...updatedJson,
        plaintext: this.stripZeroWidthSpaces(currBlock.innerText),
      };
    } else {
      // Non-Slate field - update field directly with text content
      this.formData.blocks[blockUid][editableField] = this.stripZeroWidthSpaces(target.innerText);
    }

    // Store the pending update - create a deep copy and strip nodeIds
    // NodeIds are internal to hydra.js and should not be sent to Admin UI
    this.pendingTextUpdate = {
      type: 'INLINE_EDIT_DATA',
      data: this.getFormDataWithoutNodeIds(),
      from: fieldType === 'slate' ? 'textChangeSlate' : 'textChange',
    };

    // Clear existing timer and set new one - batches rapid changes
    if (this.textUpdateTimer) {
      clearTimeout(this.textUpdateTimer);
    }

    // Send update after 300ms of no typing (debounce)
    this.textUpdateTimer = setTimeout(() => {
      if (this.pendingTextUpdate) {
        // Add current selection at send time (not creation time)
        this.pendingTextUpdate.selection = this.serializeSelection();
        this.sendMessageToParent(this.pendingTextUpdate);
        this.pendingTextUpdate = null;
        this.textUpdateTimer = null; // Clear the timer reference
      }
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
      // Include requestId if provided (for FLUSH_BUFFER coordination)
      if (flushRequestId) {
        this.pendingTextUpdate.flushRequestId = flushRequestId;
      }
      // Add current selection at send time (not creation time)
      this.pendingTextUpdate.selection = this.serializeSelection();
      window.parent.postMessage(this.pendingTextUpdate, this.adminOrigin);
      this.pendingTextUpdate = null;
      return true; // Had pending text
    }
    return false; // No pending text
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
   * @returns {JSON} Updated JSON object
   */
  updateJsonNode(json, nodeId, newText) {
    if (Array.isArray(json)) {
      return json.map((item) => this.updateJsonNode(item, nodeId, newText));
    } else if (typeof json === 'object' && json !== null) {
      // Compare nodeIds as strings (path-based IDs like "0", "0.0", etc.)
      if (json.nodeId === nodeId || json.nodeId === String(nodeId)) {
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
