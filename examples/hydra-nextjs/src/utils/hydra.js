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
// Methods provided by THIS hydra.js while importing
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
    this.token = null;
    this.navigationHandler = null; // Handler for navigation events
    this.realTimeDataHandler = null; // Handler for message events
    this.blockClickHandler = null; // Handler for block click events
    this.selectBlockHandler = null; // Handler for select block events
    this.currentlySelectedBlock = null;
    this.prevSelectedBlock = null;
    this.addButton = null;
    this.deleteButton = null;
    this.clickOnBtn = false;
    this.quantaToolbar = null;
    this.currentUrl =
      typeof window !== "undefined" ? new URL(window.location.href) : null;
    this.formData = null;
    this.blockTextMutationObserver = null;
    this.attributeMutationObserver = null;
    this.selectedBlockUid = null;
    this.isInlineEditing = false;
    this.handleMouseUp = null;
    this.blockObserver = null;
    this.handleObjectBrowserMessage = null;
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
    if (typeof window === "undefined") {
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
        window.addEventListener("hashchange", checkNavigation);
        window.addEventListener("popstate", checkNavigation);

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
              type: "PATH_CHANGE",
              path: window.location.pathname,
            },
            this.adminOrigin
          );
        } else if (window.location.hash !== currentUrlObj.hash) {
          const hash = window.location.hash;
          const i = hash.indexOf("/");
          window.parent.postMessage(
            {
              type: "PATH_CHANGE",
              path: i !== -1 ? hash.slice(i) || "/" : "/",
            },
            this.adminOrigin
          );
        }
      });

      // Get the access token from the URL
      const url = new URL(window.location.href);
      const access_token = url.searchParams.get("access_token");
      const isEditMode = url.searchParams.get("_edit") === "true";
      if (access_token) {
        this.token = access_token;
        this._setTokenCookie(access_token);
      }

      if (options) {
        if (options.allowedBlocks) {
          window.parent.postMessage(
            { type: "ALLOWED_BLOCKS", allowedBlocks: options.allowedBlocks },
            this.adminOrigin
          );
        }
      }

      if (isEditMode) {
        this.enableBlockClickListener();
        this.injectCSS();
        this.listenForSelectBlockMessage();
        window.parent.postMessage(
          { type: "GET_INITIAL_DATA" },
          this.adminOrigin
        );
        const reciveInitialData = (e) => {
          if (e.origin === this.adminOrigin) {
            if (e.data.type === "INITIAL_DATA") {
              this.formData = JSON.parse(JSON.stringify(e.data.data));
              window.postMessage(
                {
                  type: "FORM_DATA",
                  data: this.formData,
                  sender: "hydrajs-initial",
                },
                window.location.origin
              );
            }
          }
        };
        window.removeEventListener("message", reciveInitialData);
        window.addEventListener("message", reciveInitialData);
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
      if (
        event.origin === this.adminOrigin ||
        event.origin === window.location.origin
      ) {
        if (
          event.data.type === "FORM_DATA" ||
          event.data.type === "TOGGLE_MARK_DONE"
        ) {
          if (event.data.data) {
            this.isInlineEditing = false;
            this.formData = JSON.parse(JSON.stringify(event.data.data));

            // Call the callback first to trigger the re-render
            callback(event.data.data);

            // After the re-render, add the toolbar
            /**
             * (THIS IS THE PART WHICH MAKES TOOLBAR ADDITON SLOW IN REACTJS
             * BASED FRAMEWORKS BUT ESSENTIAL FOR FRAMEWORKS LIKE F7 WHICH UPGRADES
             * WHOLE UI ON DATA UPDATE)
             */
            setTimeout(() => {
              if (this.selectedBlockUid) {
                // Check if a block is selected
                const blockElement = document.querySelector(
                  `[data-block-uid="${this.selectedBlockUid}"]`
                );
                const isToolbarPresent = blockElement?.contains(
                  this.quantaToolbar
                );
                if (blockElement && !isToolbarPresent) {
                  // Add border to the currently selected block
                  blockElement.classList.add("volto-hydra--outline");
                  let show = { formatBtns: false };
                  if (
                    this.formData &&
                    this.formData.blocks[this.selectedBlockUid] &&
                    this.formData.blocks[this.selectedBlockUid]["@type"] ===
                      "slate"
                  ) {
                    show.formatBtns = true;
                  }
                  this.prevSelectedBlock &&
                    this.deselectBlock(
                      this.prevSelectedBlock.getAttribute("data-block-uid"),
                      this.selectedBlockUid
                    );
                  this.quantaToolbar = null;
                  this.createQuantaToolbar(this.selectedBlockUid, show);
                  const editableField = blockElement.getAttribute(
                    "data-editable-field"
                  );
                  if (editableField === "value") {
                    this.makeBlockContentEditable(blockElement);
                  } else if (editableField !== null) {
                    blockElement.setAttribute("contenteditable", "true");
                  }
                  const editableChildren = blockElement.querySelectorAll(
                    "[data-editable-field]"
                  );
                  editableChildren.forEach((child) => {
                    child.setAttribute("contenteditable", "true");
                  });
                  this.prevSelectedBlock = blockElement;
                  this.observeBlockTextChanges(blockElement);
                }
              } else {
                console.warn("No block is selected to add Toolbar");
              }
            }, 0); // Use setTimeout to ensure execution after the current call stack
          } else {
            throw new Error("No form data has been sent from the adminUI");
          }
        }
      }
    };

    // Ensure we don't add multiple listeners
    window.removeEventListener("message", this.realTimeDataHandler);
    window.addEventListener("message", this.realTimeDataHandler);
  }
  /**
   * Creates the Quanta toolbar for the selected block.
   *
   * @param {string} blockUid - The UID of the selected block.
   * @param {Object} show - Options for showing/hiding toolbar elements:
   *   - formatBtns: Whether to show format buttons (true/false).
   */
  createQuantaToolbar(blockUid, show = { formatBtns: true }) {
    // Check if the toolbar already exists
    if (this.quantaToolbar) {
      return;
    }
    const blockElement = document.querySelector(
      `[data-block-uid="${blockUid}"]`
    );
    // Create the quantaToolbar
    this.quantaToolbar = document.createElement("div");
    this.quantaToolbar.className = "volto-hydra-quantaToolbar";

    // Prevent click event propagation for the quantaToolbar
    this.quantaToolbar.addEventListener("click", (e) => e.stopPropagation());

    // Create the Add button
    this.addButton = document.createElement("button");
    this.addButton.className = "volto-hydra-add-button";
    this.addButton.innerHTML = addSVG;
    this.addButton.onclick = (e) => {
      e.stopPropagation();
      this.clickOnBtn = true;
      window.parent.postMessage(
        { type: "ADD_BLOCK", uid: blockUid },
        this.adminOrigin
      );
    };
    blockElement.appendChild(this.addButton);

    // Create the drag button
    const dragButton = document.createElement("button");
    dragButton.className = "volto-hydra-drag-button";
    dragButton.innerHTML = dragSVG;
    let isDragging = false;
    let startY;
    // dragButton.disabled = true;
    dragButton.addEventListener("mousedown", (e) => {
      e.preventDefault();
      document.querySelector("body").classList.add("grabbing");
      // Create a copy of the block
      const draggedBlock = blockElement.cloneNode(true);
      draggedBlock.classList.add("dragging");
      document.body.appendChild(draggedBlock);

      // Position the copy under the cursor
      const rect = blockElement.getBoundingClientRect();
      draggedBlock.style.width = `${rect.width}px`;
      draggedBlock.style.height = `${rect.height}px`;
      draggedBlock.style.left = `${e.clientX}px`;
      draggedBlock.style.top = `${e.clientY}px`;
      let closestBlockUid = null;
      let throttleTimeout; // Throttle the mousemove event for performance (maybe not needed but if we got larger blocks than yeah needed!)
      let insertAt = null; // 0 for top & 1 for bottom
      isDragging = true;
      startY = e.clientY;
      let startYTimeout;
      // Handle mouse movement
      const onMouseMove = (e) => {
        draggedBlock.style.left = `${e.clientX}px`;
        draggedBlock.style.top = `${e.clientY}px`;
        if (!throttleTimeout) {
          throttleTimeout = setTimeout(() => {
            const elementBelow = document.elementFromPoint(
              e.clientX,
              e.clientY
            );
            let closestBlock = elementBelow;
            // Find the closest ancestor with 'data-block-id'
            while (
              closestBlock &&
              !closestBlock.hasAttribute("data-block-uid")
            ) {
              closestBlock = closestBlock.parentElement;
            }

            if (closestBlock) {
              // Remove border from any previously highlighted block
              const prevHighlighted =
                insertAt === 0
                  ? document.querySelector(".highlighted-block")
                  : document.querySelector(".highlighted-block-bottom");

              if (prevHighlighted) {
                prevHighlighted.classList.remove(
                  "highlighted-block",
                  "highlighted-block-bottom"
                );
              }

              // Determine if hovering over top or bottom half (not effiecient but lets try!)
              const closestBlockRect = closestBlock.getBoundingClientRect();
              const mouseYRelativeToBlock = e.clientY - closestBlockRect.top;
              const isHoveringOverTopHalf =
                mouseYRelativeToBlock < closestBlockRect.height / 2;

              if (isHoveringOverTopHalf) {
                insertAt = 0;
              } else {
                insertAt = 1;
              }
              closestBlock.classList.add(
                `${
                  insertAt === 0
                    ? "highlighted-block"
                    : "highlighted-block-bottom"
                }`,
                `${
                  insertAt === 0
                    ? "highlighted-block"
                    : "highlighted-block-bottom"
                }`
              );
              closestBlockUid = closestBlock.getAttribute("data-block-uid");
            } else {
              // console.log("Not hovering over any block");
            }
            throttleTimeout = null;
          }, 100);
        }
        if (isDragging) {
          const currentY = e.clientY;
          const deltaY = currentY - startY;
          clearTimeout(startYTimeout);
          startYTimeout = setTimeout(() => {
            startY = currentY;
          }, 153);

          // Check if the mouse is near the top or bottom of the viewport
          const scrollThreshold = 50; // distance from the top/bottom of the viewport
          const scrollSpeedFactor = 0.1; // for speeed scrolling (try/error)

          if (currentY < scrollThreshold) {
            // Scroll up, speed based on deltaY
            window.scrollBy(0, -Math.abs(deltaY) * scrollSpeedFactor);
          } else if (currentY > window.innerHeight - scrollThreshold) {
            // Scroll down, speed based on deltaY
            window.scrollBy(0, Math.abs(deltaY) * scrollSpeedFactor);
          }
        }
      };
      // Cleanup on mouseup & updating the blocks layout & sending it to adminUI
      const onMouseUp = () => {
        document.querySelector("body").classList.remove("grabbing");
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
        isDragging = false;
        clearTimeout(startYTimeout);
        draggedBlock.remove();
        if (closestBlockUid) {
          const draggedBlockId = blockElement.getAttribute("data-block-uid");

          const blocks_layout = this.formData.blocks_layout.items;
          const draggedBlockIndex = blocks_layout.indexOf(draggedBlockId);
          const targetBlockIndex = blocks_layout.indexOf(closestBlockUid);
          if (draggedBlockIndex !== -1 && targetBlockIndex !== -1) {
            blocks_layout.splice(draggedBlockIndex, 1);

            // Determine insertion point based on hover position
            const insertIndex =
              insertAt === 1 ? targetBlockIndex + 1 : targetBlockIndex;

            blocks_layout.splice(insertIndex, 0, draggedBlockId);
            if (insertAt === 0) {
              document
                .querySelector(".highlighted-block")
                .classList.remove("highlighted-block");
            } else {
              document
                .querySelector(".highlighted-block-bottom")
                .classList.remove("highlighted-block-bottom");
            }
            window.parent.postMessage(
              { type: "UPDATE_BLOCKS_LAYOUT", data: this.formData },
              this.adminOrigin
            );
          }
        }
      };

      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    });

    let currentFormats = null;
    let boldButton = null;
    let italicButton = null;
    let delButton = null;
    let linkButton = null;

    if (show.formatBtns) {
      // Create the bold button
      boldButton = document.createElement("button");
      boldButton.className = `volto-hydra-format-button ${
        show.formatBtns ? "show" : ""
      }`;
      boldButton.innerHTML = boldSVG;
      boldButton.addEventListener("click", () => {
        currentFormats &&
          this.formatSelectedText("bold", currentFormats["bold"].present);
      });

      // Create the italic button
      italicButton = document.createElement("button");
      italicButton.className = `volto-hydra-format-button ${
        show.formatBtns ? "show" : ""
      }`;
      italicButton.innerHTML = italicSVG;
      italicButton.addEventListener("click", () => {
        currentFormats &&
          this.formatSelectedText("italic", currentFormats["italic"].present);
      });

      // Create the del button
      delButton = document.createElement("button");
      delButton.className = `volto-hydra-format-button ${
        show.formatBtns ? "show" : ""
      }`;
      delButton.innerHTML = delSVG;
      delButton.addEventListener("click", () => {
        currentFormats &&
          this.formatSelectedText("del", currentFormats["del"].present);
      });

      // Create the del button
      linkButton = document.createElement("button");
      linkButton.className = `volto-hydra-format-button ${
        show.formatBtns ? "show" : ""
      }`;
      linkButton.innerHTML = linkSVG;
      linkButton.addEventListener("click", () => {
        const selection = window.getSelection();
        if (!selection.rangeCount || selection.isCollapsed) return;
        const listenClickOutside = (e) => {
          if (!e.target.closest(".link-input-container")) {
            linkButton.classList.remove("active");
            container?.remove();
            if (this.quantaToolbar)
              this.quantaToolbar.style.visibility = "visible";
          }
        };
        document.addEventListener("click", listenClickOutside, { once: true });
        const range = selection.getRangeAt(0);

        linkButton.classList.add("active");
        this.quantaToolbar.style.visibility = "hidden";
        const commonAncestor = range.commonAncestorContainer;

        const container = document.createElement("div");
        container.classList.add("link-input-container");

        const isValidURL = (url) => {
          try {
            new URL(url);
            return true;
          } catch (e) {
            return false;
          }
        };

        const inputField = document.createElement("input");
        inputField.classList.add("link-input");
        inputField.type = "url";
        inputField.placeholder = "Type a URL...";
        inputField.addEventListener("keydown", (e) => {
          if (e.key === "Escape") {
            linkButton.classList.remove("active");
            container.remove();
            this.quantaToolbar.style.visibility = "visible";
          } else if (e.key === "Enter") {
            e.preventDefault();
            submitBtn.click();
          } else if (e.key === "Tab") {
            e.preventDefault();
            inputField.blur();
            if (inputField.nextSibling.classList.contains("hide"))
              cancelBtn.focus();
            else submitBtn.focus();
          }
        });
        inputField.addEventListener("input", (e) => {
          const currentValue = e.target.value;
          if (isValidURL(currentValue)) {
            container.classList.remove("link-invalid-url");
            submitBtn.disabled = false;
          } else {
            container.classList.add("link-invalid-url");
            submitBtn.disabled = true;
          }
          if (currentValue === "") {
            submitBtn.classList.add("hide");
            cancelBtn.classList.remove("hide");
          } else {
            submitBtn.classList.remove("hide");
            cancelBtn.classList.add("hide");
          }
        });
        const folderBtn = document.createElement("button");
        folderBtn.classList.add("link-folder-btn");
        folderBtn.innerHTML = linkFolderSVG;
        folderBtn.addEventListener("click", () => {
          this.handleObjectBrowserMessage = (e) => {
            if (
              e.origin === this.adminOrigin &&
              e.data.type === "OBJECT_SELECTED"
            ) {
              const path = e.data.path;
              inputField.value = `${window.location.origin}${path}`;
              
              submitBtn.click();
            }
          };
          window.removeEventListener(
            "message",
            this.handleObjectBrowserMessage
          );
          window.addEventListener("message", this.handleObjectBrowserMessage);
          window.parent.postMessage(
            {
              type: "OPEN_OBJECT_BROWSER",
              mode: "link",
            },
            this.adminOrigin
          );
        });

        const submitBtn = document.createElement("button");
        submitBtn.classList.add("link-submit-btn", "hide");
        submitBtn.innerHTML = linkSubmitSVG;
        submitBtn.addEventListener("click", () => {
          const url = inputField.value;
          if (!currentFormats["link"].present) {
            const link = document.createElement("a");
            link.href = url;
            range.surroundContents(link);
          } else {
            if (currentFormats["link"].enclosing)
              range.commonAncestorContainer.parentNode.closest("a").href = url;
            else {
              const children = commonAncestor.children;
              for (let i = 0; i < children.length; i++) {
                if (children[i].tagName === "A") {
                  children[i].href = url;
                  break;
                }
              }
            }
          }
          this.isInlineEditing = false;
          const editableParent = this.findEditableParent(commonAncestor);
          const htmlString = editableParent?.outerHTML;

          window.parent.postMessage(
            {
              type: "TOGGLE_MARK",
              html: htmlString,
            },
            this.adminOrigin
          );
          linkButton.classList.remove("active");
          container.remove(); // Close the input field (why errrrror? whyyy..)(sometimes)
          this.quantaToolbar.style.visibility = "visible";
        });

        const cancelBtn = document.createElement("button");
        cancelBtn.classList.add("link-cancel-btn");
        cancelBtn.innerHTML = linkCancelSVG;
        cancelBtn.addEventListener("click", () => {
          if (currentFormats["link"].present) {
            this.unwrapFormatting(range, "link");
            this.sendFormattedHTMLToAdminUI(selection);
          }
          linkButton.classList.remove("active");
          container.remove();
          this.quantaToolbar.style.visibility = "visible";
          return;
        });

        container.appendChild(folderBtn);
        container.appendChild(inputField);
        container.appendChild(submitBtn);
        container.appendChild(cancelBtn);

        if (currentFormats["link"].present) {
          if (currentFormats["link"].enclosing) {
            inputField.value = commonAncestor.parentNode
              ?.closest("a")
              ?.getAttribute("href");
          } else {
            const children = commonAncestor.children;
            for (let i = 0; i < children.length; i++) {
              if (children[i].tagName === "A") {
                inputField.value = children[i].getAttribute("href");
                break;
              }
            }
          }
        } else {
          container.classList.add("link-invalid-url");
        }
        // Append the container to the link button's parent
        linkButton.parentNode.appendChild(container);
        inputField.focus();
      });

      // Function to handle the text selection and show/hide the bold button
      const handleSelectionChange = () => {
        const selection = window.getSelection();
        const range = selection.getRangeAt(0);

        currentFormats = this.isFormatted(range);
        boldButton.classList.toggle(
          "active",
          currentFormats.bold.enclosing || currentFormats.bold.present
        );
        italicButton.classList.toggle(
          "active",
          currentFormats.italic.enclosing || currentFormats.italic.present
        );
        delButton.classList.toggle(
          "active",
          currentFormats.del.enclosing || currentFormats.del.present
        );
        linkButton.classList.toggle(
          "active",
          currentFormats.link.enclosing || currentFormats.link.present
        );
      };

      // Add event listener to handle text selection within the block
      this.handleMouseUp = (e) => {
        if (
          e.target.closest('[data-editable-field="value"]') &&
          !e.target.closest(".volto-hydra-quantaToolbar") &&
          e.target
            .closest("[data-block-uid]")
            .getAttribute("data-block-uid") === blockUid
        ) {
          handleSelectionChange();
        }
      };
      blockElement.addEventListener("mouseup", this.handleMouseUp);
    }

    // Create the three-dot menu button
    const menuButton = document.createElement("button");
    menuButton.className = "volto-hydra-menu-button";
    menuButton.innerHTML = threeDotsSVG;

    // Create the dropdown menu
    const dropdownMenu = document.createElement("div");
    dropdownMenu.className = "volto-hydra-dropdown-menu";

    // Create the 'Remove' option
    const removeOption = document.createElement("div");
    removeOption.className = "volto-hydra-dropdown-item";
    removeOption.innerHTML = `${deleteSVG} <div class="volto-hydra-dropdown-text">Remove</div>`;
    removeOption.onclick = () => {
      this.clickOnBtn = true;
      window.parent.postMessage(
        { type: "DELETE_BLOCK", uid: blockUid },
        this.adminOrigin
      );
    };

    // Create the 'Settings' option
    const settingsOption = document.createElement("div");
    settingsOption.className = "volto-hydra-dropdown-item";
    settingsOption.innerHTML = `${settingsSVG} <div class="volto-hydra-dropdown-text">Settings</div>`;
    // ---Add settings click handler here (currently does nothing)---

    // Create the divider
    const divider = document.createElement("div");
    divider.className = "volto-hydra-divider";

    // Append options to the dropdown menu
    dropdownMenu.appendChild(settingsOption);
    dropdownMenu.appendChild(divider);
    dropdownMenu.appendChild(removeOption);

    // Add event listener to toggle dropdown visibility
    menuButton.addEventListener("click", (e) => {
      e.stopPropagation();
      dropdownMenu.classList.toggle("visible");
      document.addEventListener(
        "click",
        (e) => {
          if (!e.target.closest(".volto-hydra-dropdown-menu")) {
            dropdownMenu.classList.remove("visible");
          }
        },
        { once: true }
      );
    });

    // Append elements to the quantaToolbar
    this.quantaToolbar.appendChild(dragButton);
    if (show.formatBtns) {
      this.quantaToolbar.appendChild(boldButton);
      this.quantaToolbar.appendChild(italicButton);
      this.quantaToolbar.appendChild(delButton);
      this.quantaToolbar.appendChild(linkButton);
    }
    this.quantaToolbar.appendChild(menuButton);
    this.quantaToolbar.appendChild(dropdownMenu);

    // Append the quantaToolbar to the currently selected block
    blockElement.appendChild(this.quantaToolbar);
  }

  ////////////////////////////////////////////////////////////////////////////////
  // Block Selection and Deselection
  ////////////////////////////////////////////////////////////////////////////////

  /**
   * Enables listening for block clicks to open block settings.
   */
  enableBlockClickListener() {
    this.blockClickHandler = (event) => {
      event.stopPropagation();
      const blockElement = event.target.closest("[data-block-uid]");
      if (blockElement) {
        this.selectBlock(blockElement);
      }
    };

    document.removeEventListener("click", this.blockClickHandler);
    document.addEventListener("click", this.blockClickHandler);
  }
  /**
   * Selects a block and communicates the selection to the adminUI.
   *
   * @param {HTMLElement} blockElement - The block element to select.
   */
  selectBlock(blockElement) {
    if (!blockElement) return;
    this.isInlineEditing = true;
    // Remove border and button from the previously selected block
    if (
      this.prevSelectedBlock === null ||
      this.prevSelectedBlock?.getAttribute("data-block-uid") !==
        blockElement?.getAttribute("data-block-uid")
    ) {
      if (this.currentlySelectedBlock) {
        this.deselectBlock(
          this.currentlySelectedBlock?.getAttribute("data-block-uid"),
          blockElement?.getAttribute("data-block-uid")
        );
      }
      // Helper function to handle each element
      const handleElement = (element) => {
        const editableField = element.getAttribute("data-editable-field");
        if (editableField === "value") {
          this.makeBlockContentEditable(element);
        } else if (editableField !== null) {
          element.setAttribute("contenteditable", "true");
        }
      };

      // Function to recursively handle all children
      const handleElementAndChildren = (element) => {
        handleElement(element);
        Array.from(element.children).forEach((child) =>
          handleElementAndChildren(child)
        );
      };

      const blockUid = blockElement.getAttribute("data-block-uid");
      this.selectedBlockUid = blockUid;
      // Set the currently selected block

      let show = { formatBtns: false };
      // if the block is a slate block, add nodeIds to the block's data
      if (
        this.formData &&
        this.formData.blocks[blockUid]["@type"] === "slate"
      ) {
        show.formatBtns = true;
        this.formData.blocks[blockUid] = this.addNodeIds(
          this.formData.blocks[blockUid]
        );
        window.postMessage(
          { type: "FORM_DATA", data: this.formData, sender: "hydrajs-nodeids" },
          window.location.origin
        );
        window.parent.postMessage(
          {
            type: "INLINE_EDIT_DATA",
            data: this.formData,
            from: "selectBlock",
          },
          this.adminOrigin
        );
      } else {
        // Add border to the currently selected block
        blockElement.classList.add("volto-hydra--outline");
        this.createQuantaToolbar(this.selectedBlockUid, show);
      }
      handleElementAndChildren(blockElement);

      // if (this.formData) {
      //   this.createQuantaToolbar(blockUid, show);
      // }
      this.currentlySelectedBlock = blockElement;
      this.prevSelectedBlock = blockElement;
      if (!this.clickOnBtn) {
        window.parent.postMessage(
          { type: "OPEN_SETTINGS", uid: blockUid },
          this.adminOrigin
        );
      } else {
        this.clickOnBtn = false;
      }
    }
    this.observeBlockTextChanges(blockElement);
    const editableChildren = blockElement.querySelectorAll(
      "[data-editable-field]"
    );
    editableChildren.forEach((child) => {
      child.setAttribute("contenteditable", "true");
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
      `[data-block-uid="${prevBlockUid}"]`
    );

    if (
      prevBlockUid !== null &&
      currBlockUid &&
      prevBlockUid !== currBlockUid &&
      prevBlockElement
    ) {
      prevBlockElement.classList.remove("volto-hydra--outline");
      if (this.blockObserver) {
        this.blockObserver.disconnect();
      }
      if (this.addButton) {
        this.addButton.remove();
        this.addButton = null;
      }
      if (this.deleteButton) {
        this.deleteButton.remove();
        this.deleteButton = null;
      }
      if (this.quantaToolbar) {
        this.quantaToolbar.remove();
        this.quantaToolbar = null;
      }
      // Remove contenteditable attribute
      prevBlockElement.removeAttribute("contenteditable");
      const childNodes = prevBlockElement.querySelectorAll("[data-node-id]");
      childNodes.forEach((node) => {
        node.removeAttribute("contenteditable");
      });

      // Clean up JSON structure
      // if (this.formData.blocks[this.selectedBlockUid]["@type"] === "slate") this.resetJsonNodeIds(this.formData.blocks[this.selectedBlockUid]);
    }
    document.removeEventListener("mouseup", this.handleMouseUp);
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
      window.removeEventListener("message", this.handleObjectBrowserMessage);
      this.handleObjectBrowserMessage = null;
    }
  }

  /**
   * Listens for 'SELECT_BLOCK' messages from the adminUI to select a block.
   */
  listenForSelectBlockMessage() {
    this.selectBlockHandler = (event) => {
      if (
        event.origin === this.adminOrigin &&
        event.data.type === "SELECT_BLOCK"
      ) {
        const { uid } = event.data;
        this.selectedBlockUid = uid;
        this.formData = JSON.parse(JSON.stringify(event.data.data));
        if (
          this.selectedBlockUid &&
          this.formData.blocks[this.selectedBlockUid]["@type"] === "slate" &&
          typeof this.formData.blocks[this.selectedBlockUid].nodeId ===
            "undefined"
        ) {
          this.formData.blocks[this.selectedBlockUid] = this.addNodeIds(
            this.formData.blocks[this.selectedBlockUid]
          );
        }
        window.postMessage(
          {
            type: "FORM_DATA",
            data: this.formData,
            sender: "hydrajs-select",
          },
          window.location.origin
        );
        // console.log("select block", event.data?.method);
        const blockElement = document.querySelector(
          `[data-block-uid="${uid}"]`
        );
        if (blockElement) {
          !this.elementIsVisibleInViewport(blockElement) &&
          blockElement.scrollIntoView();
        }
        // this.isInlineEditing = true;
        // this.observeForBlock(uid);
      }
    };

    window.removeEventListener("message", this.selectBlockHandler);
    window.addEventListener("message", this.selectBlockHandler);
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
    blockElement.setAttribute("contenteditable", "true");
    const childNodes = blockElement.querySelectorAll("[data-node-id]");
    childNodes.forEach((node) => {
      node.setAttribute("contenteditable", "true");
    });
  }

  /**
   * Observes changes in the text content of a block.
   *
   * @param {HTMLElement} blockElement - The block element to observe.
   */
  observeBlockTextChanges(blockElement) {
    if (this.blockTextMutationObserver) {
      this.blockTextMutationObserver.disconnect();
    }
    this.blockTextMutationObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === "characterData") {
          const targetElement =
            mutation.target?.parentElement.closest("[data-node-id]");

          if (targetElement && this.isInlineEditing) {
            this.handleTextChangeOnSlate(targetElement);
          } else if (this.isInlineEditing) {
            const targetElement = mutation.target?.parentElement.closest(
              "[data-editable-field]"
            );
            if (targetElement) {
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
        if (mutation.type === "childList") {
          const blockElement = document.querySelector(
            `[data-block-uid="${uid}"]`
          );

          if (blockElement && this.isInlineEditing) {
            this.selectBlock(blockElement);
            !this.elementIsVisibleInViewport(blockElement, true) &&
              blockElement.scrollIntoView({ behavior: "smooth" });
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
    } else if (typeof json === "object" && json !== null) {
      // Clone the object to ensure it's extensible
      json = JSON.parse(JSON.stringify(json));

      if (json.hasOwnProperty("data")) {
        json.nodeId = nodeIdCounter.current++;
        for (const key in json) {
          if (json.hasOwnProperty(key) && key !== "nodeId" && key !== "data") {
            json[key] = this.addNodeIds(json[key], nodeIdCounter);
          }
        }
      } else {
        json.nodeId = nodeIdCounter.current++;
        for (const key in json) {
          if (json.hasOwnProperty(key) && key !== "nodeId") {
            json[key] = this.addNodeIds(json[key], nodeIdCounter);
          }
        }
      }
    }
    return json;
  }

  /**
   * Remove the nodeIds from the JSON object
   * @param {JSON} json Selected Block's data
   */
  resetJsonNodeIds(json) {
    if (Array.isArray(json)) {
      json.forEach((item) => this.resetJsonNodeIds(item));
    } else if (typeof json === "object" && json !== null) {
      if (json.hasOwnProperty("nodeId")) {
        delete json.nodeId;
      }
      for (const key in json) {
        if (json.hasOwnProperty(key) && key !== "data") {
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
      .closest("[data-block-uid]")
      .getAttribute("data-block-uid");
    const editableField = target.getAttribute("data-editable-field");
    if (editableField)
      this.formData.blocks[blockUid][editableField] = target.innerText;
    if (this.formData.blocks[blockUid]["@type"] !== "slate") {
      window.parent.postMessage(
        {
          type: "INLINE_EDIT_DATA",
          data: this.formData,
          from: "textChange",
        },
        this.adminOrigin
      );
    }
  }

  /**
   * Handle the text changed in the slate block element, by updating the json data
   * and sending it to the adminUI
   * @param {HTMLElement} target
   */
  handleTextChangeOnSlate(target) {
    const closestNode = target.closest("[data-node-id]");
    if (closestNode) {
      const nodeId = closestNode.getAttribute("data-node-id");
      const updatedJson = this.updateJsonNode(
        this.formData?.blocks[this.selectedBlockUid],
        nodeId,
        closestNode.innerText?.replace(/\n$/, "")
      );
      // this.resetJsonNodeIds(updatedJson);
      const currBlock = document.querySelector(
        `[data-block-uid="${this.selectedBlockUid}"]`
      );
      this.formData.blocks[this.selectedBlockUid] = {
        ...updatedJson,
        plaintext: currBlock.innerText,
      };

      window.parent.postMessage(
        {
          type: "INLINE_EDIT_DATA",
          data: this.formData,
          from: "textChangeSlate",
        },
        this.adminOrigin
      );

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
    } else if (typeof json === "object" && json !== null) {
      if (json.nodeId === parseInt(nodeId, 10)) {
        if (json.hasOwnProperty("text")) {
          json.text = newText;
        } else {
          json.children[0].text = newText;
        }
        return json;
      }
      for (const key in json) {
        if (json.hasOwnProperty(key) && key !== "nodeId" && key !== "data") {
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
    const div = document.createElement("div");
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
      !(container.dataset && container.dataset.editableField === "value")
    ) {
      // Check if the container itself has any of the formatting
      if (container.nodeName === "STRONG" || container.nodeName === "B") {
        if (
          container.contains(range.startContainer) &&
          container.contains(range.endContainer)
        ) {
          formats.bold.enclosing = true;
          formats.bold.present = true;
        }
      }
      if (container.nodeName === "EM" || container.nodeName === "I") {
        if (
          container.contains(range.startContainer) &&
          container.contains(range.endContainer)
        ) {
          formats.italic.enclosing = true;
          formats.italic.present = true;
        }
      }
      if (container.nodeName === "DEL") {
        if (
          container.contains(range.startContainer) &&
          container.contains(range.endContainer)
        ) {
          formats.del.enclosing = true;
          formats.del.present = true;
        }
      }
      if (container.nodeName === "A") {
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
    if (selectionHTML.includes("</strong>") || selectionHTML.includes("</b>")) {
      formats.bold.present = true;
    }
    if (selectionHTML.includes("</em>") || selectionHTML.includes("</i>")) {
      formats.italic.present = true;
    }
    if (selectionHTML.includes("</del>")) {
      formats.del.present = true;
    }
    if (selectionHTML.includes("</a>")) {
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
    this.isInlineEditing = false;
    const selection = window.getSelection();
    if (!selection.rangeCount) return;

    const range = selection.getRangeAt(0);
    if (remove) {
      this.unwrapFormatting(range, format);
    } else {
      // Handle selections that include non-Text nodes
      const fragment = range.extractContents(); // Extract the selected content
      const newNode = document.createElement(
        format === "bold"
          ? "strong"
          : format === "italic"
          ? "em"
          : format === "del"
          ? "del"
          : "span"
      );
      newNode.appendChild(fragment); // Append the extracted content to the new node
      range.insertNode(newNode); // Insert the new node back into the document
    }
    this.sendFormattedHTMLToAdminUI(selection);
  }

  // Helper function to unwrap formatting while preserving other formatting
  unwrapFormatting(range, format) {
    const formattingElements = {
      bold: ["STRONG", "B"],
      italic: ["EM", "I"],
      del: ["DEL"],
      link: ["A"],
    };

    // Check if the selection is entirely within a formatting element of the specified type
    let container = range.commonAncestorContainer;
    let topmostParent = false;
    while (container && container !== document && !topmostParent) {
      if (container.dataset && container.dataset.editableField === "value")
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
            formattingElements
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
        (child.nodeName === "STRONG" ||
          child.nodeName === "EM" ||
          child.nodeName === "DEL" ||
          child.nodeName === "A") &&
        child.textContent.trim() === ""
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
        type: "TOGGLE_MARK",
        html: htmlString,
      },
      this.adminOrigin
    );
  }
  findEditableParent(node) {
    if (!node || node === document) return null; // Reached the top without finding

    if (node.dataset && node.dataset.nodeId === "1") {
      return node;
    }

    return this.findEditableParent(node.parentNode);
  }

  /**
   * Injects custom CSS into the iframe for styling the adminUI components which we are
   * injecting into frontend's DOM like borders, toolbar etc..
   */
  injectCSS() {
    const style = document.createElement("style");
    style.type = "text/css";
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
          padding: 0.5em;
          margin: 0;
        }
        .volto-hydra-format-button {
          border-radius: 5px;
          margin: 1px;
          display: none;
          height: 32px;
          width: 32px;
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
 * Initializes the bridge, setting up event listeners and communication channels.
 *
 * @param {URL} adminOrigin
 * @param {Object} options
 * @returns {Bridge} new Bridge()
 */
export function initBridge(adminOrigin, options = {}) {
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
  if (typeof document === "undefined") {
    return null;
  }
  const name = "access_token=";
  const decodedCookie = decodeURIComponent(document.cookie);
  const cookieArray = decodedCookie.split(";");
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
if (typeof window !== "undefined") {
  window.initBridge = initBridge;
}

//////////////////////////////////////////////////////////////////////////////
// SVGs & Images should be exported using CDN to reduce the size of this file
//////////////////////////////////////////////////////////////////////////////
const deleteSVG = `<svg width="18px" height="18px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M4 6H20M16 6L15.7294 5.18807C15.4671 4.40125 15.3359 4.00784 15.0927 3.71698C14.8779 3.46013 14.6021 3.26132 14.2905 3.13878C13.9376 3 13.523 3 12.6936 3H11.3064C10.477 3 10.0624 3 9.70951 3.13878C9.39792 3.26132 9.12208 3.46013 8.90729 3.71698C8.66405 4.00784 8.53292 4.40125 8.27064 5.18807L8 6M18 6V16.2C18 17.8802 18 18.7202 17.673 19.362C17.3854 19.9265 16.9265 20.3854 16.362 20.673C15.7202 21 14.8802 21 13.2 21H10.8C9.11984 21 8.27976 21 7.63803 20.673C7.07354 20.3854 6.6146 19.9265 6.32698 19.362C6 18.7202 6 17.8802 6 16.2V6M14 10V17M10 10V17" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
const dragSVG = `<svg width="20px" height="20px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <g id="SVGRepo_bgCarrier" stroke-width="0"/>
  <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"/>
  <g id="SVGRepo_iconCarrier"> <path d="M8 6.5C9.38071 6.5 10.5 5.38071 10.5 4C10.5 2.61929 9.38071 1.5 8 1.5C6.61929 1.5 5.5 2.61929 5.5 4C5.5 5.38071 6.61929 6.5 8 6.5Z" fill="#4A5B68"/> <path d="M15.5 6.5C16.8807 6.5 18 5.38071 18 4C18 2.61929 16.8807 1.5 15.5 1.5C14.1193 1.5 13 2.61929 13 4C13 5.38071 14.1193 6.5 15.5 6.5Z" fill="#4A5B68"/> <path d="M10.5 12C10.5 13.3807 9.38071 14.5 8 14.5C6.61929 14.5 5.5 13.3807 5.5 12C5.5 10.6193 6.61929 9.5 8 9.5C9.38071 9.5 10.5 10.6193 10.5 12Z" fill="#4A5B68"/> <path d="M15.5 14.5C16.8807 14.5 18 13.3807 18 12C18 10.6193 16.8807 9.5 15.5 9.5C14.1193 9.5 13 10.6193 13 12C13 13.3807 14.1193 14.5 15.5 14.5Z" fill="#4A5B68"/> <path d="M10.5 20C10.5 21.3807 9.38071 22.5 8 22.5C6.61929 22.5 5.5 21.3807 5.5 20C5.5 18.6193 6.61929 17.5 8 17.5C9.38071 17.5 10.5 18.6193 10.5 20Z" fill="#4A5B68"/> <path d="M15.5 22.5C16.8807 22.5 18 21.3807 18 20C18 18.6193 16.8807 17.5 15.5 17.5C14.1193 17.5 13 18.6193 13 20C13 21.3807 14.1193 22.5 15.5 22.5Z" fill="#4A5B68"/> </g>
  </svg>`;
const boldSVG = `<img widht="20px" height="20px" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAACXBIWXMAAAsTAAALEwEAmpwYAAACLUlEQVR4nO3az4tOURzH8RejZiNFKUWywD+g/AEo2VioCWWnlBVCLERCiZ2dGFmQJgtFfmxkYsvCyiyI8iMpRndGfjXz6NZ5aprM85wxZu7t3POuz/ae+313O9/z45LJZDKZTCaTyfwLBVr/IT/wJeQ9XmAQ13AaG9ArYQGtiIzgHJZoqIBWyDC2abCAFsZwQIMFtEJ2Nl3AMFY1WUALA3UWMIK+KbIDeybkII7gGG7g6zTmgxV1FfB5Bs9ehP5ICXslKKDN7QgBlyQsYH2EgDsSFjAf37uMc1fCAoTndBrnqoQFLAwzfadx9ktYwK4uY4xjrUQFLMe7LmM8VCHFLAnoCYulbsWPhS5RWwHfwupuco7ibMh5XAy5Emb0TxGtr8zJKouvei/QH1pk4wT8xCHMUwOKOS7+I9apEUUFX0B5gHoda9SAosI54BeOVz0PFBUKaOcWFtRVwG887ZAhvMKHcCcwOoOOkMxCqBersR0PpiFhq0T3Apsjv4yhKlpjMQcCSrZEfgWbJCqg5HGEgHJZnayAwxECygvVZAX0RQgob5UbLeCNhAWciBDwXKICekKb6ybgpkQFnIlsg+U2OSkBy3A5svhWFYejRZcXGp10ATpV9k04LjsV1vaD4fAjtvhHc118XXaD7WzUYAEDVRRfFwEvsVhDBbxu8i8y97G0yuKrEvCkqsOP2RAwPuEX2XbehmOyZ2ELfA8XsBsr//oWmUwmk8lkMpmM6fIH83xLt33EM5cAAAAASUVORK5CYII=">`;
const italicSVG = `<img widht="20px" height="20px" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAB4AAAAeCAYAAAA7MK6iAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAq0lEQVR4nO3WsQnCYBRF4ZvSXjKA2EsGkPTiAGIvDiBZIziA2AcHEFsjDhDSSwYQayslEOGC2B4R/wOvesXXPZ4UCr1XSnp8mHb3FfgooK2BC4EdDJ6QcG3wiIRvBvcptGfoXVJEwUODLwJLDT6R8NzggoQzg3MSXhu8IuGdwTMSPhs8JuHG4AGFRt3ReMHtMUGKDb0KLDG4IuGpwXsSXhq8IcDyb3+t0G/1BLG4VBFDInqeAAAAAElFTkSuQmCC">`;
const delSVG = `<img widht="20px" height="20px" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAACXBIWXMAAAsTAAALEwEAmpwYAAAB70lEQVR4nO3ZTatOURjG8d/xiEjolAiZUYoopYgiH8EpiSi+gIGBEhMdE2WgdAYGjokyRJgYMCGKAYZeyrtS5O1RJ45WrVOrncHzvp9V61+rPdr3uq6991r3ve5NoVAoFIaAEWzGKdzAS3zBdLy+wC2MYzsahoQGDuJ5FNvqeIfjWFCn+JW436bw6niLvXWIX4UPFTFfcSEK2oBlmIXFWIMxnI9Pv2rkzCDFz8bDZPImTmJ+G/fvx+skxjcDZKwifleHcYLhiSg+LP6BcTMxEHaV7HiVGFgrQ34nBubJkPeJgXUy5Epi4PowZdVW2Yq/iYnbWC0zTlcSUVgXk9hSt7BCoU/fe7PLqrOT0exFpg8Hle81iJ+OI8zdNeM5v4F+EM4IB/AxERvyym6ZEQ48jxMTn7FQZiyKDYAZE0dlyKHEwB0ZsiIxENZFdsyt1FTZsTExEE57fSXsyz9xNia5XjCRGLikz/xIJgs9oDldxtuBP0nMnfrMuUq2vBc7dJ2wLTbDZmJdMwAa8TVX65UTGG0xxmgsEKeSGG/ibjQQRmJjNhUQxi9cxmGsx9JoeElsv4Ru3MX/FIef6moOhOPjoy4LtrtYrubCbB8etCn8CfbE+4eG8NkcwVU8jVl1Kl6fxR8cx7Cph1twoVAoFHTFPycjIDOxcKkjAAAAAElFTkSuQmCC">`;
const addSVG = `<img widht="20px" height="20px" src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCAyMCAyMCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEwLjgzMjggMi41MDAwMkg5LjE2NjE4VjkuMTY2NjhIMi40OTk1MVYxMC44MzMzSDkuMTY2MThWMTcuNUgxMC44MzI4VjEwLjgzMzNIMTcuNDk5NVY5LjE2NjY4SDEwLjgzMjhWMi41MDAwMloiIGZpbGw9IiM0QTVCNjgiLz4KPC9zdmc+Cg=='/>`;
const linkSVG = `<img widht="20px" height="20px" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAACXBIWXMAAAsTAAALEwEAmpwYAAAArUlEQVR4nO2VXQrCMBCEv2P4cyQt3sb4LgUvpe2VtL74FFkYQZa2ohtE1IF5SAfmC2nIwodoBbTAWW6AqlT5DsgDrkvsPAMXYA3M5KRvli0jgFYlVuiVlB0igE4l055souwUAWT51fxpQH6w/kGAV/FCrz/gC29RfjfAKwzoVGBPtNdc2TECaEae642yfQRQ3Q2cNDBwFgRVj4zMbbT8JhuLNrnsn5jtWMI7L6IrN6JmJYjJ8jsAAAAASUVORK5CYII=">`;
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
