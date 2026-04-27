// ../../node_modules/.pnpm/tabbable@6.4.0/node_modules/tabbable/dist/index.esm.js
var candidateSelectors = ["input:not([inert]):not([inert] *)", "select:not([inert]):not([inert] *)", "textarea:not([inert]):not([inert] *)", "a[href]:not([inert]):not([inert] *)", "button:not([inert]):not([inert] *)", "[tabindex]:not(slot):not([inert]):not([inert] *)", "audio[controls]:not([inert]):not([inert] *)", "video[controls]:not([inert]):not([inert] *)", '[contenteditable]:not([contenteditable="false"]):not([inert]):not([inert] *)', "details>summary:first-of-type:not([inert]):not([inert] *)", "details:not([inert]):not([inert] *)"];
var candidateSelector = /* @__PURE__ */ candidateSelectors.join(",");
var NoElement = typeof Element === "undefined";
var matches = NoElement ? function() {
} : Element.prototype.matches || Element.prototype.msMatchesSelector || Element.prototype.webkitMatchesSelector;
var getRootNode = !NoElement && Element.prototype.getRootNode ? function(element) {
  var _element$getRootNode;
  return element === null || element === void 0 ? void 0 : (_element$getRootNode = element.getRootNode) === null || _element$getRootNode === void 0 ? void 0 : _element$getRootNode.call(element);
} : function(element) {
  return element === null || element === void 0 ? void 0 : element.ownerDocument;
};
var _isInert = function isInert(node, lookUp) {
  var _node$getAttribute;
  if (lookUp === void 0) {
    lookUp = true;
  }
  var inertAtt = node === null || node === void 0 ? void 0 : (_node$getAttribute = node.getAttribute) === null || _node$getAttribute === void 0 ? void 0 : _node$getAttribute.call(node, "inert");
  var inert = inertAtt === "" || inertAtt === "true";
  var result = inert || lookUp && node && // closest does not exist on shadow roots, so we fall back to a manual
  // lookup upward, in case it is not defined.
  (typeof node.closest === "function" ? node.closest("[inert]") : _isInert(node.parentNode));
  return result;
};
var isContentEditable = function isContentEditable2(node) {
  var _node$getAttribute2;
  var attValue = node === null || node === void 0 ? void 0 : (_node$getAttribute2 = node.getAttribute) === null || _node$getAttribute2 === void 0 ? void 0 : _node$getAttribute2.call(node, "contenteditable");
  return attValue === "" || attValue === "true";
};
var getCandidates = function getCandidates2(el, includeContainer, filter) {
  if (_isInert(el)) {
    return [];
  }
  var candidates = Array.prototype.slice.apply(el.querySelectorAll(candidateSelector));
  if (includeContainer && matches.call(el, candidateSelector)) {
    candidates.unshift(el);
  }
  candidates = candidates.filter(filter);
  return candidates;
};
var _getCandidatesIteratively = function getCandidatesIteratively(elements, includeContainer, options) {
  var candidates = [];
  var elementsToCheck = Array.from(elements);
  while (elementsToCheck.length) {
    var element = elementsToCheck.shift();
    if (_isInert(element, false)) {
      continue;
    }
    if (element.tagName === "SLOT") {
      var assigned = element.assignedElements();
      var content = assigned.length ? assigned : element.children;
      var nestedCandidates = _getCandidatesIteratively(content, true, options);
      if (options.flatten) {
        candidates.push.apply(candidates, nestedCandidates);
      } else {
        candidates.push({
          scopeParent: element,
          candidates: nestedCandidates
        });
      }
    } else {
      var validCandidate = matches.call(element, candidateSelector);
      if (validCandidate && options.filter(element) && (includeContainer || !elements.includes(element))) {
        candidates.push(element);
      }
      var shadowRoot = element.shadowRoot || // check for an undisclosed shadow
      typeof options.getShadowRoot === "function" && options.getShadowRoot(element);
      var validShadowRoot = !_isInert(shadowRoot, false) && (!options.shadowRootFilter || options.shadowRootFilter(element));
      if (shadowRoot && validShadowRoot) {
        var _nestedCandidates = _getCandidatesIteratively(shadowRoot === true ? element.children : shadowRoot.children, true, options);
        if (options.flatten) {
          candidates.push.apply(candidates, _nestedCandidates);
        } else {
          candidates.push({
            scopeParent: element,
            candidates: _nestedCandidates
          });
        }
      } else {
        elementsToCheck.unshift.apply(elementsToCheck, element.children);
      }
    }
  }
  return candidates;
};
var hasTabIndex = function hasTabIndex2(node) {
  return !isNaN(parseInt(node.getAttribute("tabindex"), 10));
};
var getTabIndex = function getTabIndex2(node) {
  if (!node) {
    throw new Error("No node provided");
  }
  if (node.tabIndex < 0) {
    if ((/^(AUDIO|VIDEO|DETAILS)$/.test(node.tagName) || isContentEditable(node)) && !hasTabIndex(node)) {
      return 0;
    }
  }
  return node.tabIndex;
};
var getSortOrderTabIndex = function getSortOrderTabIndex2(node, isScope) {
  var tabIndex = getTabIndex(node);
  if (tabIndex < 0 && isScope && !hasTabIndex(node)) {
    return 0;
  }
  return tabIndex;
};
var sortOrderedTabbables = function sortOrderedTabbables2(a, b) {
  return a.tabIndex === b.tabIndex ? a.documentOrder - b.documentOrder : a.tabIndex - b.tabIndex;
};
var isInput = function isInput2(node) {
  return node.tagName === "INPUT";
};
var isHiddenInput = function isHiddenInput2(node) {
  return isInput(node) && node.type === "hidden";
};
var isDetailsWithSummary = function isDetailsWithSummary2(node) {
  var r = node.tagName === "DETAILS" && Array.prototype.slice.apply(node.children).some(function(child) {
    return child.tagName === "SUMMARY";
  });
  return r;
};
var getCheckedRadio = function getCheckedRadio2(nodes, form) {
  for (var i = 0; i < nodes.length; i++) {
    if (nodes[i].checked && nodes[i].form === form) {
      return nodes[i];
    }
  }
};
var isTabbableRadio = function isTabbableRadio2(node) {
  if (!node.name) {
    return true;
  }
  var radioScope = node.form || getRootNode(node);
  var queryRadios = function queryRadios2(name) {
    return radioScope.querySelectorAll('input[type="radio"][name="' + name + '"]');
  };
  var radioSet;
  if (typeof window !== "undefined" && typeof window.CSS !== "undefined" && typeof window.CSS.escape === "function") {
    radioSet = queryRadios(window.CSS.escape(node.name));
  } else {
    try {
      radioSet = queryRadios(node.name);
    } catch (err) {
      console.error("Looks like you have a radio button with a name attribute containing invalid CSS selector characters and need the CSS.escape polyfill: %s", err.message);
      return false;
    }
  }
  var checked = getCheckedRadio(radioSet, node.form);
  return !checked || checked === node;
};
var isRadio = function isRadio2(node) {
  return isInput(node) && node.type === "radio";
};
var isNonTabbableRadio = function isNonTabbableRadio2(node) {
  return isRadio(node) && !isTabbableRadio(node);
};
var isNodeAttached = function isNodeAttached2(node) {
  var _nodeRoot;
  var nodeRoot = node && getRootNode(node);
  var nodeRootHost = (_nodeRoot = nodeRoot) === null || _nodeRoot === void 0 ? void 0 : _nodeRoot.host;
  var attached = false;
  if (nodeRoot && nodeRoot !== node) {
    var _nodeRootHost, _nodeRootHost$ownerDo, _node$ownerDocument;
    attached = !!((_nodeRootHost = nodeRootHost) !== null && _nodeRootHost !== void 0 && (_nodeRootHost$ownerDo = _nodeRootHost.ownerDocument) !== null && _nodeRootHost$ownerDo !== void 0 && _nodeRootHost$ownerDo.contains(nodeRootHost) || node !== null && node !== void 0 && (_node$ownerDocument = node.ownerDocument) !== null && _node$ownerDocument !== void 0 && _node$ownerDocument.contains(node));
    while (!attached && nodeRootHost) {
      var _nodeRoot2, _nodeRootHost2, _nodeRootHost2$ownerD;
      nodeRoot = getRootNode(nodeRootHost);
      nodeRootHost = (_nodeRoot2 = nodeRoot) === null || _nodeRoot2 === void 0 ? void 0 : _nodeRoot2.host;
      attached = !!((_nodeRootHost2 = nodeRootHost) !== null && _nodeRootHost2 !== void 0 && (_nodeRootHost2$ownerD = _nodeRootHost2.ownerDocument) !== null && _nodeRootHost2$ownerD !== void 0 && _nodeRootHost2$ownerD.contains(nodeRootHost));
    }
  }
  return attached;
};
var isZeroArea = function isZeroArea2(node) {
  var _node$getBoundingClie = node.getBoundingClientRect(), width = _node$getBoundingClie.width, height = _node$getBoundingClie.height;
  return width === 0 && height === 0;
};
var isHidden = function isHidden2(node, _ref) {
  var displayCheck = _ref.displayCheck, getShadowRoot = _ref.getShadowRoot;
  if (displayCheck === "full-native") {
    if ("checkVisibility" in node) {
      var visible = node.checkVisibility({
        // Checking opacity might be desirable for some use cases, but natively,
        // opacity zero elements _are_ focusable and tabbable.
        checkOpacity: false,
        opacityProperty: false,
        contentVisibilityAuto: true,
        visibilityProperty: true,
        // This is an alias for `visibilityProperty`. Contemporary browsers
        // support both. However, this alias has wider browser support (Chrome
        // >= 105 and Firefox >= 106, vs. Chrome >= 121 and Firefox >= 122), so
        // we include it anyway.
        checkVisibilityCSS: true
      });
      return !visible;
    }
  }
  if (getComputedStyle(node).visibility === "hidden") {
    return true;
  }
  var isDirectSummary = matches.call(node, "details>summary:first-of-type");
  var nodeUnderDetails = isDirectSummary ? node.parentElement : node;
  if (matches.call(nodeUnderDetails, "details:not([open]) *")) {
    return true;
  }
  if (!displayCheck || displayCheck === "full" || // full-native can run this branch when it falls through in case
  // Element#checkVisibility is unsupported
  displayCheck === "full-native" || displayCheck === "legacy-full") {
    if (typeof getShadowRoot === "function") {
      var originalNode = node;
      while (node) {
        var parentElement = node.parentElement;
        var rootNode = getRootNode(node);
        if (parentElement && !parentElement.shadowRoot && getShadowRoot(parentElement) === true) {
          return isZeroArea(node);
        } else if (node.assignedSlot) {
          node = node.assignedSlot;
        } else if (!parentElement && rootNode !== node.ownerDocument) {
          node = rootNode.host;
        } else {
          node = parentElement;
        }
      }
      node = originalNode;
    }
    if (isNodeAttached(node)) {
      return !node.getClientRects().length;
    }
    if (displayCheck !== "legacy-full") {
      return true;
    }
  } else if (displayCheck === "non-zero-area") {
    return isZeroArea(node);
  }
  return false;
};
var isDisabledFromFieldset = function isDisabledFromFieldset2(node) {
  if (/^(INPUT|BUTTON|SELECT|TEXTAREA)$/.test(node.tagName)) {
    var parentNode = node.parentElement;
    while (parentNode) {
      if (parentNode.tagName === "FIELDSET" && parentNode.disabled) {
        for (var i = 0; i < parentNode.children.length; i++) {
          var child = parentNode.children.item(i);
          if (child.tagName === "LEGEND") {
            return matches.call(parentNode, "fieldset[disabled] *") ? true : !child.contains(node);
          }
        }
        return true;
      }
      parentNode = parentNode.parentElement;
    }
  }
  return false;
};
var isNodeMatchingSelectorFocusable = function isNodeMatchingSelectorFocusable2(options, node) {
  if (node.disabled || isHiddenInput(node) || isHidden(node, options) || // For a details element with a summary, the summary element gets the focus
  isDetailsWithSummary(node) || isDisabledFromFieldset(node)) {
    return false;
  }
  return true;
};
var isNodeMatchingSelectorTabbable = function isNodeMatchingSelectorTabbable2(options, node) {
  if (isNonTabbableRadio(node) || getTabIndex(node) < 0 || !isNodeMatchingSelectorFocusable(options, node)) {
    return false;
  }
  return true;
};
var isShadowRootTabbable = function isShadowRootTabbable2(shadowHostNode) {
  var tabIndex = parseInt(shadowHostNode.getAttribute("tabindex"), 10);
  if (isNaN(tabIndex) || tabIndex >= 0) {
    return true;
  }
  return false;
};
var _sortByOrder = function sortByOrder(candidates) {
  var regularTabbables = [];
  var orderedTabbables = [];
  candidates.forEach(function(item, i) {
    var isScope = !!item.scopeParent;
    var element = isScope ? item.scopeParent : item;
    var candidateTabindex = getSortOrderTabIndex(element, isScope);
    var elements = isScope ? _sortByOrder(item.candidates) : element;
    if (candidateTabindex === 0) {
      isScope ? regularTabbables.push.apply(regularTabbables, elements) : regularTabbables.push(element);
    } else {
      orderedTabbables.push({
        documentOrder: i,
        tabIndex: candidateTabindex,
        item,
        isScope,
        content: elements
      });
    }
  });
  return orderedTabbables.sort(sortOrderedTabbables).reduce(function(acc, sortable) {
    sortable.isScope ? acc.push.apply(acc, sortable.content) : acc.push(sortable.content);
    return acc;
  }, []).concat(regularTabbables);
};
var tabbable = function tabbable2(container, options) {
  options = options || {};
  var candidates;
  if (options.getShadowRoot) {
    candidates = _getCandidatesIteratively([container], options.includeContainer, {
      filter: isNodeMatchingSelectorTabbable.bind(null, options),
      flatten: false,
      getShadowRoot: options.getShadowRoot,
      shadowRootFilter: isShadowRootTabbable
    });
  } else {
    candidates = getCandidates(container, options.includeContainer, isNodeMatchingSelectorTabbable.bind(null, options));
  }
  return _sortByOrder(candidates);
};

// containerOps.js
function canContain(config, blockType, currentCount) {
  if (config?.readOnly) return false;
  if (config?.fixed) return false;
  const { allowedBlocks, maxLength } = config || {};
  if (allowedBlocks != null && !allowedBlocks.includes(blockType)) return false;
  if (maxLength != null && currentCount >= maxLength) return false;
  return true;
}
function canContainAll(config, blockTypes, currentCount) {
  if (blockTypes.length === 0) return true;
  if (config?.readOnly || config?.fixed) return false;
  const { allowedBlocks, maxLength } = config || {};
  if (allowedBlocks != null) {
    for (const type of blockTypes) {
      if (!allowedBlocks.includes(type)) return false;
    }
  }
  if (maxLength != null && currentCount + blockTypes.length > maxLength) {
    return false;
  }
  return true;
}
function mapLayoutItems(sourceConfig, targetConfig, sourceBlock) {
  const sourceField = sourceConfig.fieldName;
  const targetField = targetConfig.fieldName;
  const items = sourceBlock[sourceField]?.items ?? [];
  const blocks = sourceBlock.blocks ?? {};
  return {
    blocks,
    [targetField]: { items }
  };
}
function findConversionPath(srcType, allowedTargets, blocksConfig, depth = 3) {
  if (!srcType || !blocksConfig?.[srcType]) return null;
  const targetSet = new Set(allowedTargets);
  if (targetSet.has(srcType)) return [srcType];
  const parents = /* @__PURE__ */ new Map();
  parents.set(srcType, null);
  let frontier = [srcType];
  for (let hop = 1; hop <= depth; hop++) {
    const next = [];
    for (const current of frontier) {
      for (const [candidate, candidateCfg] of Object.entries(blocksConfig)) {
        if (parents.has(candidate)) continue;
        if (!candidateCfg?.fieldMappings) continue;
        if (!candidateCfg.fieldMappings[current]) continue;
        parents.set(candidate, current);
        if (targetSet.has(candidate)) {
          const path = [candidate];
          let node = current;
          while (node !== null) {
            path.unshift(node);
            node = parents.get(node);
          }
          return path;
        }
        next.push(candidate);
      }
    }
    if (next.length === 0) break;
    frontier = next;
  }
  return null;
}

// hydra.src.js
var debugEnabled = false;
try {
  debugEnabled = typeof window !== "undefined" && !!(window.HYDRA_DEBUG || window.location?.search && new URLSearchParams(window.location.search).has("_hydra_debug"));
} catch {
}
function log(...args) {
  if (!debugEnabled && !window["HYDRA_DEBUG"]) return;
  const runId = typeof window !== "undefined" && window.__testRunId;
  const prefix = runId != null ? `[HYDRA][RUN-${runId}]` : "[HYDRA]";
  console.log(prefix, ...args);
}
var isValidNodeId = (id) => id && /^\d+(\.\d+)*$/.test(id);
var PAGE_BLOCK_UID = "_page";
var Bridge = class {
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
    this.navigationHandler = null;
    this.realTimeDataHandler = null;
    this.blockClickHandler = null;
    this.selectBlockHandler = null;
    this.currentlySelectedBlock = null;
    this.prevSelectedBlock = null;
    this.clickOnBtn = false;
    this.currentUrl = typeof window !== "undefined" ? new URL(window.location.href) : null;
    this.formData = null;
    this.blockTextMutationObserver = null;
    this.attributeMutationObserver = null;
    this.selectedBlockUid = null;
    this.editMode = "text";
    this.multiSelectedBlockUids = [];
    this.focusedFieldName = null;
    this.focusedLinkableField = null;
    this.focusedMediaField = null;
    this.isInlineEditing = false;
    this.handleMouseUp = null;
    this.blockObserver = null;
    this.handleObjectBrowserMessage = null;
    this.pendingTransform = null;
    this.eventBuffer = [];
    this.pendingBufferReplay = null;
    this.savedSelection = null;
    this.textUpdateTimer = null;
    this.pendingTextUpdate = null;
    this.scrollTimeout = null;
    this.expectedSelectionFromAdmin = null;
    this.blockPathMap = {};
    this.voltoConfig = null;
    this.prospectiveInlineElement = null;
    this.pathToApiPath = options.pathToApiPath || ((path) => path);
    this.initialized = false;
    this._pendingSelectBlock = null;
    this._readonlyBlocks = /* @__PURE__ */ new Set();
    this.templateEditMode = null;
    this._iframeFocused = document.hasFocus();
    window.addEventListener("focus", () => {
      this._iframeFocused = true;
    });
    window.addEventListener("blur", () => {
      this._iframeFocused = false;
    });
    if (options.onEditChange) {
      this.onEditChange(options.onEditChange);
    }
    this.init(options);
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
    const readonlyFromShared = isBlockReadonly(blockData, this.templateEditMode);
    if (this.templateEditMode) {
      log("isBlockReadonly:", readonlyFromShared ? "TRUE" : "FALSE", "(template edit mode) for:", blockUid);
      return readonlyFromShared;
    }
    if (this._readonlyBlocks.has(blockUid)) {
      log("isBlockReadonly: TRUE (registry) for:", blockUid);
      return true;
    }
    log("isBlockReadonly:", readonlyFromShared ? "TRUE (blockData)" : "FALSE", "for:", blockUid);
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
    if (!text.startsWith("hydra ") && text !== "hydra" && !text.startsWith("hydra/")) {
      return null;
    }
    const isSelfClosing = text.endsWith("/");
    const content = text.replace(/^hydra\s*/, "").replace(/\/$/, "").trim();
    const attrs = {};
    const attrRegex = /([\w-]+)(?:=([^(\s]+)(?:\(([^)]+)\))?)?/g;
    let match;
    while ((match = attrRegex.exec(content)) !== null) {
      const [, name, value, selector] = match;
      const entry = { value: value || true, selector: selector || null };
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
    if (typeof document === "undefined") return;
    const treeWalker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_COMMENT,
      null,
      false
    );
    while (treeWalker.nextNode()) {
      const comment = treeWalker.currentNode;
      const text = comment.textContent.trim();
      if (text === "/hydra") continue;
      const parsed = this.parseHydraComment(text);
      if (!parsed) continue;
      let nextElement = comment.nextSibling;
      while (nextElement && nextElement.nodeType !== Node.ELEMENT_NODE) {
        nextElement = nextElement.nextSibling;
      }
      if (!nextElement) {
        console.error("[hydra] Comment syntax found but no next element sibling:", text);
        continue;
      }
      this.applyHydraAttributes(nextElement, parsed.attrs);
    }
    log("materializeHydraComments: completed");
  }
  /**
   * Apply hydra attributes to an element and its children based on selectors.
   *
   * @param {HTMLElement} element - The root element
   * @param {Object} attrs - Parsed attributes { name: [{ value, selector }, ...] }
   */
  applyHydraAttributes(element, attrs) {
    const attrMap = {
      "block-uid": "data-block-uid",
      "block-readonly": "data-block-readonly",
      "edit-text": "data-edit-text",
      "edit-link": "data-edit-link",
      "edit-media": "data-edit-media",
      "block-add": "data-block-add",
      "block-selector": "data-block-selector",
      "block-container": "data-block-container"
    };
    for (const [name, entries] of Object.entries(attrs)) {
      const domAttr = attrMap[name];
      if (!domAttr) continue;
      for (const { value, selector } of entries) {
        const targets = selector ? element.querySelectorAll(selector) : [element];
        if (selector && targets.length === 0) {
          console.error(`[hydra] Comment selector "${selector}" for ${name}=${value} matched no elements in`, element.tagName, element.className);
        }
        for (const target of targets) {
          if (!target.hasAttribute(domAttr)) {
            target.setAttribute(domAttr, value === true ? "" : value);
            log("applyHydraAttributes:", domAttr, "=", value, "to", target.tagName, selector ? `(${selector})` : "");
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
    if (blockPathMap === void 0) {
      throw new Error(`setFormDataFromAdmin: blockPathMap is required (source: ${source})`);
    }
    this.blockPathMap = blockPathMap;
    const seq = data?._editSequence || 0;
    const blockData = this.selectedBlockUid ? data?.blocks?.[this.selectedBlockUid] : null;
    const text = blockData?.value?.[0]?.children?.[0]?.text?.substring(0, 40);
    log(`[setFormDataFromAdmin] source: ${source}, seq: ${seq}, block: ${this.selectedBlockUid}, text: ${JSON.stringify(text)}`);
    this._prevFormDataJson = this.formData ? JSON.stringify(this.formData) : null;
    const dataJson = JSON.stringify(data);
    this.formData = JSON.parse(dataJson);
    this.lastReceivedFormData = JSON.parse(dataJson);
  }
  /**
   * Get block data by UID, supporting nested blocks via blockPathMap.
   * Falls back to top-level lookup if not found in blockPathMap.
   *
   * @param {string} blockUid - The UID of the block to look up
   * @returns {Object|undefined} The block data or undefined if not found
   */
  getBlockData(blockUid) {
    if (blockUid === PAGE_BLOCK_UID) {
      return this.formData;
    }
    const pathInfo = this.blockPathMap?.[blockUid];
    if (pathInfo?.path && this.formData) {
      let current = this.formData;
      for (const key of pathInfo.path) {
        if (current && typeof current === "object") {
          current = current[key];
        } else {
          current = void 0;
          break;
        }
      }
      if (current) {
        return current;
      }
    }
    return void 0;
  }
  /**
   * Get the resolved schema for a block from its blockPathMap entry.
   * Looks up the deduplicated schema via _schemaRef in blockPathMap._schemas.
   */
  getBlockSchema(blockUid) {
    const pathInfo = this.blockPathMap?.[blockUid];
    if (!pathInfo?._schemaRef) {
      if (pathInfo) log("getBlockSchema: no _schemaRef for", blockUid, "keys:", Object.keys(pathInfo));
      return null;
    }
    if (!this.blockPathMap?._schemas) {
      log("getBlockSchema: no _schemas in blockPathMap");
      return null;
    }
    const schema = this.blockPathMap._schemas[pathInfo._schemaRef];
    if (!schema) log("getBlockSchema: schema not found for ref:", pathInfo._schemaRef, "available:", Object.keys(this.blockPathMap._schemas));
    return schema || null;
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
    if (fieldPath.startsWith("/")) {
      return { blockId: PAGE_BLOCK_UID, fieldName: fieldPath.slice(1) };
    }
    if (!blockId || blockId === PAGE_BLOCK_UID) {
      return { blockId: PAGE_BLOCK_UID, fieldName: fieldPath };
    }
    let currentBlockId = blockId;
    let remainingPath = fieldPath;
    while (remainingPath.startsWith("../")) {
      const pathInfo = this.blockPathMap?.[currentBlockId];
      if (!pathInfo?.parentId || pathInfo.parentId === PAGE_BLOCK_UID) {
        return { blockId: PAGE_BLOCK_UID, fieldName: remainingPath.slice(3) };
      }
      currentBlockId = pathInfo.parentId;
      remainingPath = remainingPath.slice(3);
    }
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
    const fieldBlockElement = field.closest("[data-block-uid]");
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
    if (blockElement.hasAttribute("data-edit-text")) {
      result.push(blockElement);
    }
    const allFields = blockElement.querySelectorAll("[data-edit-text]");
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
    this.collectBlockFields(
      blockElement,
      "data-edit-text",
      (el, name, results) => {
        fields.push(el);
      }
    );
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
    if (blockElement.getAttribute("data-edit-text") === fieldName) {
      return blockElement;
    }
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
    const blockUid = blockElement.getAttribute("data-block-uid");
    if (blockUid && this.isBlockReadonly(blockUid)) {
      return {};
    }
    const results = {};
    const elementsToProcess = blockUid ? this.getAllBlockElements(blockUid) : [blockElement];
    for (const element of elementsToProcess) {
      if (element.hasAttribute("data-block-readonly")) {
        continue;
      }
      const selfField = element.getAttribute(attrName);
      if (selfField) {
        processor(element, selfField, results);
      }
      if (blockUid) {
        for (const field of element.querySelectorAll(`[${attrName}]`)) {
          if (field.closest("[data-block-readonly]")) {
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
    return this.collectBlockFields(
      blockElement,
      "data-edit-link",
      (el, name, results) => {
        results[name] = true;
      }
    );
  }
  /**
   * Get effective bounding rect for a media field element.
   * If element has zero dimensions but uses absolute positioning with inset-0,
   * fall back to the first ancestor with actual dimensions.
   */
  getEffectiveMediaRect(element, fieldName) {
    let rect = element.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      return { top: rect.top, left: rect.left, width: rect.width, height: rect.height };
    }
    let current = element.parentElement;
    let depth = 0;
    const maxDepth = 10;
    while (current && depth < maxDepth) {
      if (current.hasAttribute("data-block-uid")) {
        const blockRect = current.getBoundingClientRect();
        if (blockRect.width > 0 && blockRect.height > 0) {
          log(
            `data-edit-media="${fieldName}" has zero dimensions. Using block element's dimensions (${blockRect.width}x${blockRect.height}).`
          );
          return { top: blockRect.top, left: blockRect.left, width: blockRect.width, height: blockRect.height };
        }
        break;
      }
      const parentRect = current.getBoundingClientRect();
      if (parentRect.width > 0 && parentRect.height > 0) {
        log(
          `data-edit-media="${fieldName}" has zero dimensions. Using parent's dimensions (${parentRect.width}x${parentRect.height}).`
        );
        return { top: parentRect.top, left: parentRect.left, width: parentRect.width, height: parentRect.height };
      }
      current = current.parentElement;
      depth++;
    }
    console.warn(
      `[HYDRA] data-edit-media="${fieldName}" has zero dimensions (${rect.width}x${rect.height}). The element must have visible width and height for the image picker to position correctly. Set explicit dimensions or use a different element.`,
      element
    );
    return { top: rect.top, left: rect.left, width: rect.width, height: rect.height };
  }
  /**
   * Get media fields that belong directly to a block.
   * For multi-element blocks, searches ALL elements with the same UID.
   */
  getMediaFields(blockElement) {
    return this.collectBlockFields(
      blockElement,
      "data-edit-media",
      (el, name, results) => {
        const rect = this.getEffectiveMediaRect(el, name);
        if (rect && rect.width > 0 && rect.height > 0) {
          results[name] = { rect };
        }
      }
    );
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
    const blockUid = blockElement.getAttribute("data-block-uid");
    if (!blockUid) {
      return "hidden";
    }
    const blockData = this.getBlockData(blockUid);
    const addability = getBlockAddability(blockUid, this.blockPathMap, blockData, this.templateEditMode);
    if (!addability.canInsertAfter) {
      return "hidden";
    }
    let addDirection = blockElement.getAttribute("data-block-add");
    if (!addDirection) {
      let depth = 0;
      let parent = blockElement.parentElement;
      while (parent) {
        if (parent.hasAttribute("data-block-uid")) {
          depth++;
        }
        parent = parent.parentElement;
      }
      addDirection = depth % 2 === 0 ? "bottom" : "right";
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
    if (isTableVertical) {
      const rowId = pathInfo.parentId;
      const rowInfo = this.blockPathMap?.[rowId];
      if (!rowInfo?.parentId) return null;
      const tableId = rowInfo.parentId;
      const rows = this._getSiblingsByDomOrder(rowId, tableId);
      const rowIdx = rows.indexOf(rowId);
      if (rowIdx === -1) return null;
      const cellsInCurrentRow = this._getSiblingsByDomOrder(blockId, rowId);
      const colIdx = cellsInCurrentRow.indexOf(blockId);
      if (colIdx === -1) return null;
      const adjRowIdx = direction === "forward" ? rowIdx + 1 : rowIdx - 1;
      if (adjRowIdx < 0 || adjRowIdx >= rows.length) return null;
      const adjRowId = rows[adjRowIdx];
      const cellsInAdjRow = Object.entries(this.blockPathMap).filter(([, info]) => info.parentId === adjRowId).map(([id]) => id);
      cellsInAdjRow.sort((a, b) => {
        const elA = this.queryBlockElement(a);
        const elB = this.queryBlockElement(b);
        if (!elA || !elB) return 0;
        return elA.compareDocumentPosition(elB) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
      });
      return colIdx < cellsInAdjRow.length ? cellsInAdjRow[colIdx] : null;
    }
    const siblings = this._getSiblingsByDomOrder(blockId, pathInfo.parentId);
    const idx = siblings.indexOf(blockId);
    if (idx === -1) return null;
    const adjIdx = direction === "forward" ? idx + 1 : idx - 1;
    return adjIdx >= 0 && adjIdx < siblings.length ? siblings[adjIdx] : null;
  }
  /**
   * Get sibling block IDs sorted by DOM position.
   * @param {string} blockId - A block to find siblings for
   * @param {string} parentId - The parent block ID
   * @returns {string[]} Sibling IDs sorted by DOM order
   */
  _getSiblingsByDomOrder(blockId, parentId) {
    const siblings = Object.entries(this.blockPathMap).filter(([, info]) => info.parentId === parentId).map(([id]) => id);
    siblings.sort((a, b) => {
      const elA = this.queryBlockElement(a);
      const elB = this.queryBlockElement(b);
      if (!elA || !elB) return 0;
      return elA.compareDocumentPosition(elB) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
    });
    return siblings;
  }
  _sameUids(a, b) {
    if (a.length !== b.length) return false;
    const setB = new Set(b);
    return a.every((uid) => setB.has(uid));
  }
  /** True if `ancestorUid` appears anywhere in `descendantUid`'s parent chain. */
  _isAncestor(ancestorUid, descendantUid) {
    if (!ancestorUid || !descendantUid) return false;
    let cur = this.blockPathMap?.[descendantUid]?.parentId;
    while (cur) {
      if (cur === ancestorUid) return true;
      cur = this.blockPathMap?.[cur]?.parentId;
    }
    return false;
  }
  /**
   * Auto-scroll helper for drag operations.
   *
   * Returns { onMouseMove(e), stop() } that the caller wires into a drag's
   * mousemove and mouseup. While the cursor is within `threshold` pixels of
   * the viewport top or bottom, the page scrolls at a speed proportional to
   * how close it is to the edge (faster nearer the edge). A synthetic
   * mousemove is dispatched on each scroll tick so the caller's drag
   * indicator updates while the mouse is stationary at the edge.
   *
   * Used by:
   *  - block DnD (existing drag-and-drop)
   *  - container edge-drag
   */
  _createAutoScroller() {
    const threshold = 80;
    const minSpeed = 10;
    const maxSpeed = 50;
    let direction = 0;
    let speed = 0;
    let animId = null;
    let lastX = 0;
    let lastY = 0;
    const loop = () => {
      if (direction === 0) return;
      window.scrollTo({
        top: window.scrollY + direction * speed,
        behavior: "instant"
      });
      document.dispatchEvent(new MouseEvent("mousemove", {
        clientX: lastX,
        clientY: lastY,
        bubbles: true
      }));
      animId = requestAnimationFrame(loop);
    };
    const setDirection = (d) => {
      if (direction === d) return;
      direction = d;
      if (animId === null && d !== 0) {
        animId = requestAnimationFrame(loop);
      }
    };
    const stop = () => {
      direction = 0;
      if (animId !== null) {
        cancelAnimationFrame(animId);
        animId = null;
      }
    };
    const onMouseMove = (e) => {
      lastX = e.clientX;
      lastY = e.clientY;
      const vh = window.innerHeight;
      if (e.clientY < threshold) {
        const factor = 1 - e.clientY / threshold;
        speed = minSpeed + (maxSpeed - minSpeed) * factor;
        setDirection(-1);
      } else if (e.clientY > vh - threshold) {
        const factor = 1 - (vh - e.clientY) / threshold;
        speed = minSpeed + (maxSpeed - minSpeed) * factor;
        setDirection(1);
      } else {
        stop();
      }
    };
    return { onMouseMove, stop };
  }
  /**
   * Position all 4 edge handles for the selected container.
   * For each edge:
   *   - Show if absorb is possible: there's a sibling on the outward side
   *     (parent layout matches edge axis) whose @type the container accepts.
   *   - Show if expel is possible: the container has a child whose @type
   *     the parent accepts (children layout matches edge axis).
   * The drag handler reads dataset attributes to know what to do.
   */
  _positionEdgeHandles() {
    const hide = () => {
      if (this._edgeHandles) {
        for (const h of Object.values(this._edgeHandles)) h.style.display = "none";
      }
    };
    if (!this._edgeHandles) return;
    const uid = this.selectedBlockUid;
    if (!uid || uid === PAGE_BLOCK_UID) {
      hide();
      return;
    }
    const info = this.blockPathMap?.[uid];
    const el = uid ? this.queryBlockElement(uid) : null;
    if (!info || !el) {
      hide();
      return;
    }
    const ownChildren = this._getSiblingsByDomOrder(null, uid);
    if (ownChildren.length === 0) {
      hide();
      return;
    }
    const schema = this.blockPathMap?._schemas?.[info._schemaRef];
    let childAllowed = null;
    for (const [, fd] of Object.entries(schema?.properties || {})) {
      if (fd?.widget === "blocks_layout" || fd?.widget === "object_list") {
        childAllowed = fd.allowedBlocks || null;
        break;
      }
    }
    const parentInfo = this.blockPathMap?.[info.parentId];
    const parentSchema = parentInfo?._schemaRef ? this.blockPathMap?._schemas?.[parentInfo._schemaRef] : null;
    let parentAllowed = null;
    if (parentSchema?.properties && info.containerField) {
      const fd = parentSchema.properties[info.containerField];
      if (fd?.widget === "blocks_layout" || fd?.widget === "object_list") {
        parentAllowed = fd.allowedBlocks || null;
      }
    } else if (info.parentId === PAGE_BLOCK_UID) {
      parentAllowed = info.allowedSiblingTypes || null;
    }
    const accepts = (allowedList, type) => !allowedList || type && allowedList.includes(type);
    const siblings = this._getSiblingsByDomOrder(uid, info.parentId).filter((s) => s !== uid);
    const r = el.getBoundingClientRect();
    const canAbsorbAny = siblings.some((s) => accepts(childAllowed, this.getBlockData(s)?.["@type"]));
    const canExpelAny = ownChildren.some((c) => accepts(parentAllowed, this.getBlockData(c)?.["@type"]));
    if (!canAbsorbAny && !canExpelAny) {
      hide();
      return;
    }
    const config = {
      top: { axis: "vertical", position: { left: r.left, top: r.top - 3, width: r.width, height: 6 } },
      bottom: { axis: "vertical", position: { left: r.left, top: r.bottom - 3, width: r.width, height: 6 } },
      left: { axis: "horizontal", position: { left: r.left - 3, top: r.top, width: 6, height: r.height } },
      right: { axis: "horizontal", position: { left: r.right - 3, top: r.top, width: 6, height: r.height } }
    };
    for (const [edge, cfg] of Object.entries(config)) {
      const handle = this._edgeHandles[edge];
      if (!handle) continue;
      handle.style.left = `${cfg.position.left}px`;
      handle.style.top = `${cfg.position.top}px`;
      handle.style.width = `${cfg.position.width}px`;
      handle.style.height = `${cfg.position.height}px`;
      handle.style.display = "block";
      handle.dataset.edge = edge;
      handle.dataset.axis = cfg.axis;
      handle.dataset.container = uid;
      handle.dataset.canAbsorb = canAbsorbAny ? "1" : "";
      handle.dataset.canExpel = canExpelAny ? "1" : "";
      handle.dataset.childAllowed = childAllowed ? childAllowed.join(",") : "";
      handle.dataset.parentAllowed = parentAllowed ? parentAllowed.join(",") : "";
    }
  }
  _setupEdgeHandleDrag(handle) {
    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    let growthBox = null;
    const overlays = /* @__PURE__ */ new Map();
    let autoScroller = null;
    const ensureGrowthBox = () => {
      if (growthBox) return growthBox;
      growthBox = document.createElement("div");
      growthBox.className = "volto-hydra-edge-growth";
      Object.assign(growthBox.style, {
        position: "fixed",
        background: "rgba(0, 126, 177, 0.08)",
        zIndex: "10000",
        pointerEvents: "none",
        display: "none"
      });
      document.body.appendChild(growthBox);
      return growthBox;
    };
    const tintBlock = (uid) => {
      if (overlays.has(uid)) return;
      const el = this.queryBlockElement(uid);
      if (!el) return;
      const r = el.getBoundingClientRect();
      const overlay = document.createElement("div");
      overlay.className = "volto-hydra-edge-absorb-tint";
      Object.assign(overlay.style, {
        position: "fixed",
        left: `${r.left}px`,
        top: `${r.top}px`,
        width: `${r.width}px`,
        height: `${r.height}px`,
        background: "rgba(0, 126, 177, 0.15)",
        outline: "2px dashed rgba(0, 126, 177, 0.6)",
        outlineOffset: "-2px",
        zIndex: "10000",
        pointerEvents: "none"
      });
      document.body.appendChild(overlay);
      overlays.set(uid, overlay);
    };
    const cleanup = () => {
      if (growthBox) growthBox.style.display = "none";
      for (const o of overlays.values()) o.remove();
      overlays.clear();
    };
    const edgeGeometry = (edge, rect, mouseX, mouseY) => {
      switch (edge) {
        case "bottom":
          return { axis: "vertical", edgePos: rect.bottom, mouseCoord: mouseY, outward: mouseY - rect.bottom };
        case "top":
          return { axis: "vertical", edgePos: rect.top, mouseCoord: mouseY, outward: rect.top - mouseY };
        case "right":
          return { axis: "horizontal", edgePos: rect.right, mouseCoord: mouseX, outward: mouseX - rect.right };
        case "left":
          return { axis: "horizontal", edgePos: rect.left, mouseCoord: mouseX, outward: rect.left - mouseX };
        default:
          return null;
      }
    };
    const blockMid = (el, axis) => {
      const r = el.getBoundingClientRect();
      return axis === "vertical" ? (r.top + r.bottom) / 2 : (r.left + r.right) / 2;
    };
    const computePlan = (e) => {
      const edge = handle.dataset.edge;
      const containerUid = handle.dataset.container;
      const containerEl = this.queryBlockElement(containerUid);
      if (!containerEl || !edge) return { kind: "none", blocks: [], boundary: 0 };
      const cRect = containerEl.getBoundingClientRect();
      const geo = edgeGeometry(edge, cRect, e.clientX, e.clientY);
      if (!geo) return { kind: "none", blocks: [], boundary: 0 };
      const containerInfo = this.blockPathMap?.[containerUid];
      const containerParentId = containerInfo?.parentId;
      const childAllowed = handle.dataset.childAllowed ? handle.dataset.childAllowed.split(",") : null;
      const parentAllowed = handle.dataset.parentAllowed ? handle.dataset.parentAllowed.split(",") : null;
      const slop = 3;
      let kind, candidates, accepts;
      if (geo.outward > slop && handle.dataset.canAbsorb) {
        kind = "absorb";
        accepts = (t) => !childAllowed || t && childAllowed.includes(t);
        candidates = /* @__PURE__ */ new Set();
        for (const [uid, info] of Object.entries(this.blockPathMap)) {
          if (!uid || uid === containerUid) continue;
          if (info?.isFixed) continue;
          if (this._isAncestor(uid, containerUid)) continue;
          if (this._isAncestor(containerUid, uid)) continue;
          if (!this._isAncestor(containerParentId, uid) && uid !== containerParentId) continue;
          const el = this.queryBlockElement(uid);
          if (!el) continue;
          const mid = blockMid(el, geo.axis);
          const outwardOfEdge = (mid - geo.edgePos) * (edge === "top" || edge === "left" ? -1 : 1) > 0;
          const inwardOfCursor = (mid - geo.mouseCoord) * (edge === "top" || edge === "left" ? -1 : 1) < 0;
          if (outwardOfEdge && inwardOfCursor) candidates.add(uid);
        }
      } else if (geo.outward < -slop && handle.dataset.canExpel) {
        kind = "expel";
        accepts = (t) => !parentAllowed || t && parentAllowed.includes(t);
        candidates = /* @__PURE__ */ new Set();
        for (const [uid, info] of Object.entries(this.blockPathMap)) {
          if (!uid || uid === containerUid) continue;
          if (info?.isFixed) continue;
          if (!this._isAncestor(containerUid, uid)) continue;
          const el = this.queryBlockElement(uid);
          if (!el) continue;
          const mid = blockMid(el, geo.axis);
          const outwardOfCursor = (mid - geo.mouseCoord) * (edge === "top" || edge === "left" ? -1 : 1) > 0;
          if (outwardOfCursor) candidates.add(uid);
        }
      } else {
        return { kind: "none", blocks: [], boundary: geo.edgePos };
      }
      let changed = true;
      while (changed) {
        changed = false;
        for (const uid of [...candidates]) {
          const info = this.blockPathMap[uid];
          const pid = info?.parentId;
          if (!pid) continue;
          if (kind === "absorb" && pid === containerParentId) continue;
          if (kind === "expel" && pid === containerUid) continue;
          const sibs = Object.entries(this.blockPathMap).filter(([, i]) => i?.parentId === pid).map(([id]) => id);
          if (sibs.length === 0 || !sibs.every((c) => candidates.has(c))) continue;
          const pType = this.getBlockData(pid)?.["@type"];
          if (!accepts(pType)) continue;
          for (const c of sibs) candidates.delete(c);
          candidates.add(pid);
          changed = true;
        }
      }
      for (const uid of [...candidates]) {
        const t = this.getBlockData(uid)?.["@type"];
        if (!accepts(t)) candidates.delete(uid);
      }
      const plan = [...candidates].sort((a, b) => {
        const ea = this.queryBlockElement(a);
        const eb = this.queryBlockElement(b);
        if (!ea || !eb) return 0;
        return ea.compareDocumentPosition(eb) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
      });
      let boundary = geo.edgePos;
      for (const uid of plan) {
        const el = this.queryBlockElement(uid);
        if (!el) continue;
        const r = el.getBoundingClientRect();
        if (edge === "bottom") boundary = Math.max(boundary, r.bottom);
        else if (edge === "top") boundary = Math.min(boundary, r.top);
        else if (edge === "right") boundary = Math.max(boundary, r.right);
        else if (edge === "left") boundary = Math.min(boundary, r.left);
      }
      return { kind, blocks: plan, boundary };
    };
    const updateGrowthBox = (e, plan) => {
      if (!growthBox) return;
      const containerEl = this.queryBlockElement(handle.dataset.container);
      if (!containerEl) return;
      const cRect = containerEl.getBoundingClientRect();
      const edge = handle.dataset.edge;
      const valid = plan.kind !== "none" && plan.blocks.length > 0;
      const reset = (k, v) => growthBox.style.setProperty(k, v);
      ["borderTopWidth", "borderBottomWidth", "borderLeftWidth", "borderRightWidth"].forEach((p) => reset(p, "0"));
      const cursor = edge === "top" || edge === "bottom" ? e.clientY : e.clientX;
      const dragKindIsExpel = plan.kind === "expel";
      let endCoord;
      if (valid) endCoord = plan.boundary;
      else endCoord = handle.dataset.canAbsorb || handle.dataset.canExpel ? cursor : null;
      if (endCoord === null) {
        growthBox.style.display = "none";
        return;
      }
      if (edge === "bottom" || edge === "top") {
        const top = Math.min(
          edge === "top" ? endCoord : cRect.bottom,
          edge === "top" ? cRect.top : endCoord
        );
        const bottom = Math.max(
          edge === "top" ? endCoord : cRect.bottom,
          edge === "top" ? cRect.top : endCoord
        );
        growthBox.style.left = `${cRect.left}px`;
        growthBox.style.width = `${cRect.width}px`;
        growthBox.style.top = `${top}px`;
        growthBox.style.height = `${Math.max(0, bottom - top)}px`;
        const moving = edge === "top" ? "borderTopWidth" : "borderBottomWidth";
        growthBox.style[moving] = valid ? "6px" : "1px";
        growthBox.style.borderColor = "#007eb1";
        growthBox.style.borderStyle = "solid";
      } else {
        const left = Math.min(
          edge === "left" ? endCoord : cRect.right,
          edge === "left" ? cRect.left : endCoord
        );
        const right = Math.max(
          edge === "left" ? endCoord : cRect.right,
          edge === "left" ? cRect.left : endCoord
        );
        growthBox.style.top = `${cRect.top}px`;
        growthBox.style.height = `${cRect.height}px`;
        growthBox.style.left = `${left}px`;
        growthBox.style.width = `${Math.max(0, right - left)}px`;
        const moving = edge === "left" ? "borderLeftWidth" : "borderRightWidth";
        growthBox.style[moving] = valid ? "6px" : "1px";
        growthBox.style.borderColor = "#007eb1";
        growthBox.style.borderStyle = "solid";
      }
      growthBox.style.background = dragKindIsExpel ? "rgba(220, 53, 69, 0.06)" : "rgba(0, 126, 177, 0.08)";
      growthBox.style.display = "block";
    };
    handle.addEventListener("mousedown", (e) => {
      e.preventDefault();
      e.stopPropagation();
      dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
      autoScroller = this._createAutoScroller();
      ensureGrowthBox();
      updateGrowthBox(e, { kind: "none", blocks: [], boundary: 0 });
    });
    document.addEventListener("mousemove", (e) => {
      if (!dragging) return;
      e.preventDefault();
      lastX = e.clientX;
      lastY = e.clientY;
      autoScroller?.onMouseMove(e);
      const plan = computePlan(e);
      updateGrowthBox(e, plan);
      const wanted = new Set(plan.blocks);
      for (const [uid, overlay] of overlays) {
        if (!wanted.has(uid)) {
          overlay.remove();
          overlays.delete(uid);
        }
      }
      for (const uid of plan.blocks) tintBlock(uid);
    });
    document.addEventListener("mouseup", () => {
      if (!dragging) return;
      dragging = false;
      autoScroller?.stop();
      autoScroller = null;
      const plan = computePlan({ clientX: lastX, clientY: lastY });
      const containerUid = handle.dataset.container;
      const containerInfo = containerUid ? this.blockPathMap?.[containerUid] : null;
      const edge = handle.dataset.edge;
      cleanup();
      if (plan.kind === "none" || plan.blocks.length === 0 || !containerUid) return;
      const baseMessage = {
        type: "MOVE_BLOCKS",
        blockIds: plan.blocks,
        selectAfterMove: containerUid
      };
      if (plan.kind === "absorb") {
        const ownChildren = this._getSiblingsByDomOrder(null, containerUid);
        const insertAfter = edge === "bottom" || edge === "right";
        const target = ownChildren.length > 0 ? insertAfter ? ownChildren[ownChildren.length - 1] : ownChildren[0] : containerUid;
        window.parent.postMessage({
          ...baseMessage,
          targetBlockId: target,
          insertAfter,
          targetParentId: containerUid
        }, this.adminOrigin);
      } else if (plan.kind === "expel") {
        const insertAfter = edge === "bottom" || edge === "right";
        window.parent.postMessage({
          ...baseMessage,
          targetBlockId: containerUid,
          insertAfter,
          targetParentId: containerInfo?.parentId
        }, this.adminOrigin);
      }
    });
  }
  /**
   * Filter a list of block UIDs to those that can be mutated by `op`.
   * Single source of truth for locked-block protection on the iframe side.
   * op: 'delete' | 'move' | 'edit'.
   */
  _filterMutableBlockUids(uids, op = "delete") {
    return uids.filter((uid) => {
      if (!uid) return false;
      const blockData = this.getBlockData(uid);
      if ((op === "delete" || op === "move") && isBlockPositionLocked(blockData, this.templateEditMode)) {
        return false;
      }
      if ((op === "delete" || op === "edit") && isBlockReadonly(blockData, this.templateEditMode)) {
        return false;
      }
      return true;
    });
  }
  /**
   * Detects text selections that span multiple blocks and converts them into
   * a multi-block selection. Fires on each selectionchange.
   * Only active in text mode — block-mode Shift+Click extends text selection
   * as a side effect; block-level click handlers own that state transition.
   */
  _checkCrossBlockSelection(range) {
    if (!this.focusedFieldName) return;
    const anchorBlock = this._closestBlockElement(range.startContainer);
    const focusBlock = this._closestBlockElement(range.endContainer);
    if (!anchorBlock || !focusBlock) return;
    const anchorUid = anchorBlock.getAttribute("data-block-uid");
    const focusUid = focusBlock.getAttribute("data-block-uid");
    if (!anchorUid || !focusUid || anchorUid === focusUid) return;
    const uids = [];
    const seen = /* @__PURE__ */ new Set();
    for (const el of document.querySelectorAll("[data-block-uid]")) {
      if (!range.intersectsNode(el)) continue;
      const uid = el.getAttribute("data-block-uid");
      if (!uid || seen.has(uid)) continue;
      seen.add(uid);
      uids.push(uid);
    }
    if (uids.length < 2) return;
    const pruned = uids.filter((uid) => {
      const el = this.queryBlockElement(uid);
      if (!el) return false;
      return !uids.some((other) => {
        if (other === uid) return false;
        const otherEl = this.queryBlockElement(other);
        return otherEl && el !== otherEl && el.contains(otherEl);
      });
    });
    if (pruned.length < 2) return;
    if (this._sameUids(pruned, this.multiSelectedBlockUids)) return;
    this.multiSelectedBlockUids = pruned;
    this.selectedBlockUid = pruned[pruned.length - 1];
    this._sendMultiBlockSelected();
  }
  _closestBlockElement(node) {
    let current = node;
    while (current) {
      if (current.nodeType === Node.ELEMENT_NODE && current.hasAttribute?.("data-block-uid")) {
        return current;
      }
      current = current.parentNode;
    }
    return null;
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
  /**
   * Handle keys in block mode (no contenteditable field focused).
   * Called from the document keyboard blocker for body-focused and
   * block-focused keys. Returns true if the key was handled (caller
   * should not buffer it for text replay).
   *
   * Covers: Arrow navigation, Shift+Arrow multi-select, Delete/Backspace,
   * Cmd+A select-all escalation, Enter to add block.
   */
  _handleBlockModeKey(e) {
    if (["ArrowDown", "ArrowUp", "ArrowLeft", "ArrowRight"].includes(e.key)) {
      const blockEl = this.queryBlockElement(this.selectedBlockUid);
      const nav = this.getArrowNavigationTarget(e.key, this.selectedBlockUid, blockEl);
      if (!nav) return false;
      const { adjacentId, adjacentEl } = nav;
      e.preventDefault();
      if (e.shiftKey) {
        if (this.multiSelectedBlockUids.length === 0) {
          this.multiSelectedBlockUids = [this.selectedBlockUid, adjacentId];
        } else if (this.multiSelectedBlockUids.includes(adjacentId)) {
          this.multiSelectedBlockUids = this.multiSelectedBlockUids.filter(
            (uid) => uid !== this.selectedBlockUid
          );
        } else {
          this.multiSelectedBlockUids.push(adjacentId);
        }
        this.selectedBlockUid = adjacentId;
        if (this.multiSelectedBlockUids.length <= 1) {
          const singleUid = this.multiSelectedBlockUids[0] || adjacentId;
          this.multiSelectedBlockUids = [];
          this.selectedBlockUid = singleUid;
          this.focusedFieldName = null;
          window.getSelection()?.removeAllRanges();
          const el = this.queryBlockElement(singleUid);
          if (el) this.sendBlockSelected("shiftArrowSingle", el, { focusedFieldName: null });
        } else {
          this._sendMultiBlockSelected();
        }
      } else {
        this.multiSelectedBlockUids = [];
        this._navigatingToBlock = true;
        this.selectBlock(adjacentEl);
        this._navigatingToBlock = false;
      }
      return true;
    }
    if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      if (this.multiSelectedBlockUids.length > 0) {
        const deletable = this._filterMutableBlockUids(
          this.multiSelectedBlockUids,
          "delete"
        );
        log("Block mode Delete: deleting", deletable.length, "/", this.multiSelectedBlockUids.length, "blocks");
        if (deletable.length > 0) {
          this.sendMessageToParent({ type: "DELETE_BLOCKS", uids: deletable });
        }
        this.multiSelectedBlockUids = [];
        this.selectedBlockUid = null;
      } else if (this.selectedBlockUid && this._filterMutableBlockUids([this.selectedBlockUid], "delete").length > 0) {
        log("Block mode Delete: deleting single block", this.selectedBlockUid);
        this.sendMessageToParent({ type: "DELETE_BLOCK", uid: this.selectedBlockUid });
      }
      return true;
    }
    if (e.key === "a" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      let anchorUid;
      if (this.multiSelectedBlockUids.length > 0) {
        anchorUid = this.multiSelectedBlockUids[0];
      } else {
        anchorUid = this.selectedBlockUid;
      }
      const anchorInfo = this.blockPathMap?.[anchorUid];
      if (!anchorInfo) return true;
      let containerId = anchorInfo.parentId || null;
      if (this.multiSelectedBlockUids.length > 0) {
        const containerInfo = this.blockPathMap?.[containerId];
        if (!containerInfo) return true;
        containerId = containerInfo.parentId || null;
        anchorUid = anchorInfo.parentId;
      }
      const siblings = this._getSiblingsByDomOrder(anchorUid, containerId);
      if (siblings.length > 0 && !this._sameUids(siblings, this.multiSelectedBlockUids)) {
        this.multiSelectedBlockUids = siblings;
        this._sendMultiBlockSelected();
      }
      return true;
    }
    if ((e.key === "c" || e.key === "x") && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      const uids = this.multiSelectedBlockUids.length > 0 ? [...this.multiSelectedBlockUids] : [this.selectedBlockUid];
      const action = e.key === "c" ? "copy" : "cut";
      log("Block mode", action, uids.length, "blocks");
      const transferUids = action === "cut" ? this._filterMutableBlockUids(uids, "delete") : uids;
      if (transferUids.length > 0) {
        this.sendMessageToParent({ type: "COPY_BLOCKS", uids: transferUids, action });
      }
      if (action === "cut" && transferUids.length > 0) {
        this.sendMessageToParent({ type: "DELETE_BLOCKS", uids: transferUids });
        this.multiSelectedBlockUids = [];
        this.selectedBlockUid = null;
      }
      return true;
    }
    if (e.key === "v" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      const afterUid = this.multiSelectedBlockUids.length > 0 ? this.multiSelectedBlockUids[this.multiSelectedBlockUids.length - 1] : this.selectedBlockUid;
      log("Block mode paste after:", afterUid);
      this.sendMessageToParent({ type: "PASTE_BLOCKS", afterBlockId: afterUid });
      return true;
    }
    if (e.key === "Enter" && !e.shiftKey && this.isInlineEditing) {
      e.preventDefault();
      this.sendMessageToParent({
        type: "ADD_BLOCK_AFTER",
        blockId: this.selectedBlockUid
      });
      return true;
    }
    return false;
  }
  /**
   * Single source of truth for arrow-key → adjacent block navigation.
   * Maps the arrow key to a direction based on layout mode (vertical,
   * horizontal, table), then resolves the navigation target via blockPathMap.
   *
   * @returns {{ adjacentId, adjacentEl, direction, isTableVertical }} or null
   */
  getArrowNavigationTarget(key, blockUid, blockElement) {
    const pathInfo = this.blockPathMap?.[blockUid];
    if (!pathInfo) return null;
    let addDirection = blockElement?.getAttribute("data-block-add");
    if (!addDirection && blockElement) {
      let depth = 0;
      let parent = blockElement.parentElement;
      while (parent) {
        if (parent.hasAttribute("data-block-uid")) depth++;
        parent = parent.parentElement;
      }
      addDirection = depth % 2 === 0 ? "bottom" : "right";
    }
    const isTableMode = pathInfo.parentAddMode === "table";
    const isForwardKey = key === "ArrowDown" || key === "ArrowRight";
    const isVerticalKey = key === "ArrowUp" || key === "ArrowDown";
    const isHorizontalKey = key === "ArrowLeft" || key === "ArrowRight";
    let shouldNavigate = false;
    let isTableVertical = false;
    if (isTableMode) {
      if (isHorizontalKey) shouldNavigate = true;
      else if (isVerticalKey) {
        shouldNavigate = true;
        isTableVertical = true;
      }
    } else if (addDirection === "bottom" && isVerticalKey) {
      shouldNavigate = true;
    } else if (addDirection === "right" && isHorizontalKey) {
      shouldNavigate = true;
    }
    if (!shouldNavigate) return null;
    const direction = isForwardKey ? "forward" : "backward";
    const adjacentId = this._resolveNavigationTarget(blockUid, direction, isTableVertical);
    if (!adjacentId) return null;
    const adjacentEl = this.queryBlockElement(adjacentId);
    if (!adjacentEl) return null;
    return { adjacentId, adjacentEl, direction, isTableVertical };
  }
  handleArrowAtEdge(key, blockUid, editableField, blockElement) {
    const nav = this.getArrowNavigationTarget(key, blockUid, blockElement);
    if (!nav) return;
    const { adjacentId, adjacentEl, direction, isTableVertical } = nav;
    const ownFields = this.getOwnEditableFields(blockElement);
    if (ownFields.length > 1 && !isTableVertical) {
      const fieldIdx = ownFields.indexOf(editableField);
      if (fieldIdx !== -1) {
        if (direction === "forward" && fieldIdx < ownFields.length - 1) {
          const nextField = ownFields[fieldIdx + 1];
          nextField.focus();
          const sel = window.getSelection();
          const range = document.createRange();
          range.selectNodeContents(nextField);
          range.collapse(true);
          sel.removeAllRanges();
          sel.addRange(range);
          return;
        }
        if (direction === "backward" && fieldIdx > 0) {
          const prevField = ownFields[fieldIdx - 1];
          prevField.focus();
          this._placeCursorAtEnd(prevField);
          return;
        }
      }
    }
    log("handleArrowAtEdge: navigating from", blockUid, "to", adjacentId, "direction:", direction);
    this._navigatingToBlock = true;
    this.selectBlock(adjacentEl, {
      fieldToFocus: direction === "backward" ? "last" : "first",
      cursorAt: direction === "backward" ? "end" : "start"
    });
    this._navigatingToBlock = false;
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
    const visited = /* @__PURE__ */ new Set();
    while (!visited.has(currentId)) {
      visited.add(currentId);
      let adjacentId = this.getAdjacentBlockId(currentId, direction, isTableVertical);
      if (!adjacentId) {
        const currentInfo = this.blockPathMap?.[currentId];
        if (!currentInfo?.parentId) return null;
        const parentInfo = this.blockPathMap?.[currentInfo.parentId];
        if (parentInfo?.isTemplateInstance) {
          currentId = currentInfo.parentId;
          continue;
        }
        adjacentId = currentInfo.parentId;
      }
      const adjacentInfo = this.blockPathMap?.[adjacentId];
      if (adjacentInfo?.isTemplateInstance) {
        const children = this._getSiblingsByDomOrder(null, adjacentId);
        if (children.length === 0) return null;
        adjacentId = direction === "forward" ? children[0] : children[children.length - 1];
      }
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
  /**
   * Replay a single non-text key action (arrow, delete, home, end, etc.)
   * on the given editable field. Handles ZWS/BOM nodes that interfere with
   * cursor movement. Used by buffer replay and testable independently.
   * @returns {boolean} true if handled
   */
  /**
   * Handle structural/special key actions that need preventDefault.
   * Shared by both live (_handleFieldKeydown) and replay (replayOneKey).
   * Returns true if the key was fully handled (caller should preventDefault).
   * Returns false if the key is a content key (text char, normal delete, space
   * without markdown) — caller decides: live lets native handle, replay uses
   * _insertTextAtCursor / execCommand.
   */
  handleSpecialKey(blockId, evt, editableField) {
    const { key, shiftKey = false, ctrlKey = false, metaKey = false } = evt;
    const hasMod = ctrlKey || metaKey;
    const navigationKeys = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Escape", "Tab", "Home", "End", "PageUp", "PageDown"];
    if ((navigationKeys.includes(key) || hasMod || evt.altKey) && this.prospectiveInlineElement) {
      this.prospectiveInlineElement = null;
    }
    if (this._slashMenuActive) {
      if (key === "ArrowUp" || key === "ArrowDown") {
        this.sendMessageToParent({ type: "SLASH_MENU", action: key === "ArrowUp" ? "up" : "down", blockId });
        return true;
      }
      if (key === "Enter" && !shiftKey) {
        this.sendMessageToParent({ type: "SLASH_MENU", action: "select", blockId });
        return true;
      }
      if (key === "Escape") {
        this._slashMenuActive = false;
        this.sendMessageToParent({ type: "SLASH_MENU", action: "hide", blockId });
        return true;
      }
    }
    if (evt._type === "paste") {
      if (evt.html) this._doPaste(blockId, evt.html);
      return true;
    }
    if (hasMod && key?.toLowerCase() === "v") {
      navigator.clipboard.read().then(async (items) => {
        for (const item of items) {
          if (item.types.includes("text/html")) {
            this._doPaste(blockId, await (await item.getType("text/html")).text());
            return;
          }
          if (item.types.includes("text/plain")) {
            this._doPaste(blockId, await (await item.getType("text/plain")).text());
            return;
          }
        }
      }).catch(() => {
        navigator.clipboard.readText().then((text) => {
          if (text) this._doPaste(blockId, text);
        }).catch(() => {
        });
      });
      return true;
    }
    if (hasMod && key === "s" && !shiftKey) {
      this.sendMessageToParent({ type: "SAVE_REQUEST" });
      return true;
    }
    if (hasMod && key === "z" && !shiftKey) {
      this.flushPendingTextUpdates();
      this.sendMessageToParent({ type: "SLATE_UNDO_REQUEST", blockId });
      return true;
    }
    if (hasMod && (key === "z" && shiftKey || key === "y")) {
      this.flushPendingTextUpdates();
      this.sendMessageToParent({ type: "SLATE_REDO_REQUEST", blockId });
      return true;
    }
    if (hasMod && this.slateConfig?.hotkeys) {
      for (const [shortcut, config] of Object.entries(this.slateConfig.hotkeys)) {
        const parts = shortcut.toLowerCase().split("+");
        const hasmod = parts.includes("mod");
        const hasShift = parts.includes("shift");
        const hasAlt = parts.includes("alt");
        const hotkey = parts[parts.length - 1];
        if ((hasmod ? hasMod : true) && (hasShift ? shiftKey : !shiftKey) && (hasAlt ? evt.altKey : !evt.altKey) && key?.toLowerCase() === hotkey && config.type === "inline") {
          if (!this.isSlateField(blockId, this.focusedFieldName)) return true;
          this.sendTransformRequest(blockId, "format", { format: config.format });
          return true;
        }
      }
    }
    if (hasMod && key?.toLowerCase() === "a") {
      const sel = window.getSelection();
      if (sel && editableField) {
        const walker = document.createTreeWalker(editableField, NodeFilter.SHOW_TEXT);
        const firstText = walker.firstChild();
        let lastText = firstText;
        while (walker.nextNode()) lastText = walker.currentNode;
        if (firstText && lastText) {
          const range = document.createRange();
          range.setStart(firstText, 0);
          range.setEnd(lastText, lastText.length);
          sel.removeAllRanges();
          sel.addRange(range);
        }
      }
      return true;
    }
    if (hasMod && key?.toLowerCase() === "c") {
      if (this.multiSelectedBlockUids.length > 1) {
        this.sendMessageToParent({
          type: "COPY_BLOCKS",
          uids: [...this.multiSelectedBlockUids],
          action: "copy"
        });
        return true;
      }
      document.execCommand("copy");
      return true;
    }
    if (hasMod && key?.toLowerCase() === "x") {
      if (this.multiSelectedBlockUids.length > 1) {
        const transferUids = this._filterMutableBlockUids(
          [...this.multiSelectedBlockUids],
          "delete"
        );
        if (transferUids.length > 0) {
          this.sendMessageToParent({ type: "COPY_BLOCKS", uids: transferUids, action: "cut" });
          this.sendMessageToParent({ type: "DELETE_BLOCKS", uids: transferUids });
        }
        this.multiSelectedBlockUids = [];
        return true;
      }
      this._doCut(blockId);
      return true;
    }
    if (key === " " && !hasMod) {
      if (this.handleSpaceKey(blockId)) return true;
      return false;
    }
    if (key === "Backspace") {
      if (this.handleDeleteKey(blockId, "Backspace")) return true;
      return false;
    }
    if (key === "Delete") {
      this._skipZwsNode("forward");
      if (this.handleDeleteKey(blockId, "Delete")) return true;
      return false;
    }
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(key)) {
      if (!hasMod && !evt.altKey) {
        this.moveArrowKey(key, editableField, shiftKey);
      }
      return true;
    }
    if (key === "Home" || key === "End") {
      if (!hasMod && !evt.altKey) {
        const sel = window.getSelection();
        if (sel) {
          const dir = key === "Home" ? "backward" : "forward";
          sel.modify(shiftKey ? "extend" : "move", dir, "lineboundary");
          this._skipZwsNode(dir === "backward" ? "forward" : "backward");
        }
      }
      return true;
    }
    if (key === "Tab" && !hasMod) {
      const isPreElement = editableField?.tagName === "PRE" || !!editableField?.closest("pre");
      if (isPreElement) {
        const sel = window.getSelection();
        if (sel?.rangeCount) {
          const range = sel.getRangeAt(0);
          range.deleteContents();
          const spaces = document.createTextNode("  ");
          range.insertNode(spaces);
          range.setStartAfter(spaces);
          range.setEndAfter(spaces);
          sel.removeAllRanges();
          sel.addRange(range);
          editableField.dispatchEvent(new Event("input", { bubbles: true }));
        }
        return true;
      }
      if (this.isSlateField(blockId, this.focusedFieldName)) {
        const selection = window.getSelection();
        if (selection?.rangeCount) {
          const tabNode = selection.getRangeAt(0).startContainer;
          const tabEl = this._toElement(tabNode);
          if (tabEl?.closest("li")) {
            this.sendTransformRequest(blockId, shiftKey ? "outdent" : "indent", {});
            return true;
          }
        }
      }
      {
        const ordered = tabbable(document.documentElement);
        const currentIdx = ordered.indexOf(editableField || document.activeElement);
        if (currentIdx !== -1 && ordered.length > 1) {
          const nextIdx = shiftKey ? (currentIdx - 1 + ordered.length) % ordered.length : (currentIdx + 1) % ordered.length;
          ordered[nextIdx].focus();
        }
      }
      return true;
    }
    if (key === "Enter" && !shiftKey) {
      const isPreElement = editableField?.tagName === "PRE" || !!editableField?.closest("pre");
      if (isPreElement) {
        const sel = window.getSelection();
        if (sel?.rangeCount) {
          const range = sel.getRangeAt(0);
          range.deleteContents();
          const textNode = document.createTextNode("\n");
          range.insertNode(textNode);
          range.setStartAfter(textNode);
          range.setEndAfter(textNode);
          sel.removeAllRanges();
          sel.addRange(range);
          editableField.dispatchEvent(new Event("input", { bubbles: true }));
        }
        return true;
      }
      const fieldType = this.getFieldType(blockId, this.focusedFieldName);
      if (!this.isSlateField(blockId, this.focusedFieldName) && !this.fieldTypeIsPlainString(fieldType)) {
        return false;
      }
      if (this.fieldTypeIsPlainString(fieldType)) {
        const blockEl = editableField?.closest("[data-block-uid]");
        if (!blockEl) return true;
        const ownFields2 = this.getOwnEditableFields(blockEl);
        const idx = editableField ? ownFields2.indexOf(editableField) : -1;
        if (idx >= 0 && idx < ownFields2.length - 1) {
          const nextField = ownFields2[idx + 1];
          nextField.focus();
          const sel = window.getSelection();
          const range = document.createRange();
          range.selectNodeContents(nextField);
          range.collapse(true);
          sel.removeAllRanges();
          sel.addRange(range);
        } else {
          this.sendMessageToParent({ type: "ADD_BLOCK_AFTER", blockId });
        }
        return true;
      }
      const blockElement = editableField?.closest("[data-block-uid]");
      if (!blockElement) return true;
      const ownFields = this.getOwnEditableFields(blockElement);
      const currentIndex = editableField ? ownFields.indexOf(editableField) : -1;
      if (currentIndex >= 0 && currentIndex < ownFields.length - 1) {
        const nextField = ownFields[currentIndex + 1];
        nextField.focus();
        const sel = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(nextField);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
        return true;
      }
      this.correctInvalidWhitespaceSelection();
      const selection = window.getSelection();
      if (!selection?.rangeCount) return true;
      const node = selection.getRangeAt(0).startContainer;
      const parentElement = this._toElement(node);
      if (parentElement?.closest("[data-node-id]")) {
        this.sendTransformRequest(blockId, "enter", {});
      }
      return true;
    }
    return false;
  }
  /**
   * Replay a buffered key. Calls handleSpecialKey first, then handles
   * content keys (text insertion, normal delete) that can't go native.
   */
  replayOneKey(blockId, evt, editableField) {
    if (this.handleSpecialKey(blockId, evt, editableField)) return true;
    const { key, ctrlKey = false, metaKey = false } = evt;
    const hasMod = ctrlKey || metaKey;
    if (key?.length === 1 && !hasMod) {
      this.correctInvalidWhitespaceSelection();
      this.ensureValidInsertionTarget();
      this._insertTextAtCursor(key, editableField);
      return true;
    }
    if (key === "Backspace") {
      if (!this.preserveLastCharDelete()) {
        document.execCommand("delete", false);
      }
      return true;
    }
    if (key === "Delete") {
      if (!this.preserveLastCharDelete()) {
        const sel = window.getSelection();
        if (sel?.isCollapsed && sel.focusNode?.nodeType === Node.TEXT_NODE) {
          const text = sel.focusNode.textContent || "";
          let offset = sel.focusOffset;
          while (offset < text.length && (text[offset] === "\uFEFF" || text[offset] === "\u200B")) {
            offset++;
          }
          if (offset < text.length) {
            const range = document.createRange();
            range.setStart(sel.focusNode, offset);
            range.setEnd(sel.focusNode, offset + 1);
            range.deleteContents();
          }
        }
      }
      return true;
    }
    return false;
  }
  /**
   * Check if a node contains only ZWS/BOM characters (no visible text).
   * Does NOT treat whitespace as invisible — spaces between words are real content.
   */
  _hasNoVisibleText(node) {
    if (!node) return true;
    return this.stripZeroWidthSpaces(node.textContent || "") === "";
  }
  /**
   * If the cursor is on a node with no visible text (ZWS/BOM-only text node
   * or empty Element on Firefox), move it to the nearest visible text node
   * in the given direction. Prevents keys from acting on invisible content.
   */
  _skipZwsNode(direction) {
    const sel = window.getSelection();
    if (!sel?.focusNode) return;
    const node = sel.focusNode;
    if (node.nodeType === Node.TEXT_NODE) {
      if (!this._hasNoVisibleText(node)) return;
    }
    const root = this._toElement(node)?.closest?.('[contenteditable="true"]') || document.body;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    walker.currentNode = node;
    const target = direction === "forward" ? walker.nextNode() : walker.previousNode();
    if (target) {
      const range = document.createRange();
      range.setStart(target, direction === "forward" ? 0 : target.textContent.length);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
    }
  }
  moveArrowKey(key, editableField, shiftKey = false) {
    const navActions = {
      ArrowLeft: ["backward", "character"],
      ArrowRight: ["forward", "character"],
      ArrowUp: ["backward", "line"],
      ArrowDown: ["forward", "line"]
    };
    if (!navActions[key]) return;
    const sel = window.getSelection();
    if (!sel) return;
    if (shiftKey) {
      sel.modify("extend", navActions[key][0], navActions[key][1]);
      return;
    }
    if (!sel.isCollapsed || this._slashMenuActive || this.blockedBlockId) {
      sel.modify("move", navActions[key][0], navActions[key][1]);
      return;
    }
    const beforeNode = sel.focusNode;
    const beforeOffset = sel.focusOffset;
    this._skipZwsNode(navActions[key][0]);
    sel.modify("move", navActions[key][0], navActions[key][1]);
    if (sel.focusNode === beforeNode && sel.focusOffset === beforeOffset) {
      const blockEl = editableField.closest("[data-block-uid]");
      if (blockEl) {
        const uid = blockEl.getAttribute("data-block-uid");
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
  /**
   * Insert text at the current cursor position using Range API.
   * Handles NBSP conversion for spaces, ZWS cleanup, and triggers
   * handleTextChange. Used by replayOneKey for all text insertion.
   */
  _insertTextAtCursor(text, editableField) {
    const sel = window.getSelection();
    if (!sel?.rangeCount) return;
    const range = sel.getRangeAt(0);
    const insertionText = text.replace(/^ /, "\xA0").replace(/ $/, "\xA0");
    if (!range.collapsed) range.deleteContents();
    const textNode = document.createTextNode(insertionText);
    range.insertNode(textNode);
    const parent = textNode.parentNode;
    if (parent) {
      for (const sibling of [...parent.childNodes]) {
        if (sibling !== textNode && sibling.nodeType === Node.TEXT_NODE && sibling.textContent.replace(/[\uFEFF\u200B]/g, "") === "") {
          sibling.remove();
        }
      }
    }
    range.setStart(textNode, textNode.length);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
    this.prospectiveInlineElement = null;
    if (editableField) {
      const editField = editableField.closest?.("[data-edit-text]") || editableField;
      if (this.isInlineEditing) {
        this.handleTextChange(editField, textNode.parentElement, textNode);
      }
    }
  }
  /**
   * Get the nearest Element from a node (returns node itself if Element,
   * or parentElement if text node). Used for closest() lookups.
   */
  _toElement(node) {
    return node?.nodeType === Node.TEXT_NODE ? node.parentElement : node;
  }
  handleDeleteKey(blockUid, key) {
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) return false;
    const range = selection.getRangeAt(0);
    const node = range.startContainer;
    if (key === "Backspace" && this.isSlateField(blockUid, this.focusedFieldName)) {
      const blockEl = this._toElement(node);
      const editField = blockEl?.closest("[data-edit-text]");
      if (editField) {
        if (this._hasNoVisibleText(editField) && range.collapsed === false) {
          const blockElement = editField.closest("[data-block-uid]");
          const firstField = blockElement ? this.getOwnFirstEditableField(blockElement) : null;
          const isFirstField = firstField === editField;
          log("Backspace in empty slate field (non-collapsed ZWS selection) - sending unwrapBlock, isFirstField:", isFirstField);
          this.sendTransformRequest(blockUid, "unwrapBlock", {
            isFirstField,
            isEmpty: true
          });
          return true;
        }
        if (range.collapsed) {
          const nodeIdEl = blockEl.closest("[data-node-id]");
          const effectiveNodeIdEl = nodeIdEl || editField;
          if (effectiveNodeIdEl) {
            const elRange = document.createRange();
            elRange.setStart(effectiveNodeIdEl, 0);
            elRange.setEnd(range.startContainer, range.startOffset);
            const textBeforeInEl = this.stripZeroWidthSpaces(elRange.toString());
            if (textBeforeInEl === "") {
              const textBeforeInField = this.getFieldTextAroundCursor(range, editField, "before");
              if (textBeforeInField !== "") {
                log("Backspace at start of interior element - sending delete transform");
                this.sendTransformRequest(blockUid, "delete", {
                  direction: "backward"
                });
                return true;
              }
              const blockElement = editField.closest("[data-block-uid]");
              const firstField = blockElement ? this.getOwnFirstEditableField(blockElement) : null;
              const isFirstField = firstField === editField;
              const isEmpty = this._hasNoVisibleText(editField);
              log("Backspace at start of slate field - sending unwrapBlock, isFirstField:", isFirstField, "isEmpty:", isEmpty);
              this.sendTransformRequest(blockUid, "unwrapBlock", {
                isFirstField,
                isEmpty
              });
              return true;
            }
          }
        }
      }
    }
    if (key === "Backspace" && !this.isSlateField(blockUid, this.focusedFieldName)) {
      const blockEl = this._toElement(node);
      const editField = blockEl.closest("[data-edit-text]");
      if (editField) {
        if (this._hasNoVisibleText(editField) || (editField.textContent || "").trim() === "") {
          const blockElement = editField.closest("[data-block-uid]");
          const firstField = blockElement ? this.getOwnFirstEditableField(blockElement) : null;
          if (firstField === editField) {
            log("Backspace in empty first simple text field - sending DELETE_BLOCK");
            this.sendMessageToParent({
              type: "DELETE_BLOCK",
              uid: blockUid
            });
            return true;
          }
        }
      }
    }
    if (!range.collapsed) {
      const hasElementNodes = this.selectionContainsElementNodes(range);
      if (hasElementNodes) {
        log("Delete selection contains element nodes, sending transform");
        this.sendTransformRequest(blockUid, "delete", {
          direction: key === "Backspace" ? "backward" : "forward"
        });
        return true;
      }
    }
    const atStart = range.startOffset === 0;
    const editFieldForEnd = this._toElement(node)?.closest("[data-edit-text]");
    let atEnd = false;
    if (editFieldForEnd && range.startOffset === (node.textContent?.length ?? node.length ?? 0)) {
      atEnd = this.getFieldTextAroundCursor(range, editFieldForEnd, "after") === "";
    }
    if (key === "Backspace" && atStart || key === "Delete" && atEnd) {
      const parentElement = this._toElement(node);
      const hasNodeId = parentElement?.closest("[data-node-id]");
      if (hasNodeId) {
        this.sendTransformRequest(blockUid, "delete", {
          direction: key === "Backspace" ? "backward" : "forward"
        });
        return true;
      }
    }
    return false;
  }
  /**
   * Check if there's real text content before or after the cursor in the field.
   * Used by handleDeleteKey to distinguish block boundaries from interior positions.
   * @param {Range} range - current selection range
   * @param {HTMLElement} editField - the [data-edit-text] field element
   * @param {'before'|'after'} direction - check text before or after cursor
   * @returns {string} stripped text content (empty = at boundary)
   */
  getFieldTextAroundCursor(range, editField, direction) {
    const fieldRange = document.createRange();
    if (direction === "before") {
      fieldRange.setStart(editField, 0);
      fieldRange.setEnd(range.startContainer, range.startOffset);
    } else {
      fieldRange.setStart(range.endContainer, range.endOffset);
      fieldRange.setEnd(editField, editField.childNodes.length);
    }
    return this.stripZeroWidthSpaces(fieldRange.toString());
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
    textNode.textContent = "\uFEFF";
    const r = document.createRange();
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
    const blockEl = this._toElement(node);
    const editableField = blockEl.closest("[data-edit-text]");
    if (!editableField) return false;
    const blockNode = blockEl.closest("p, h1, h2, h3, h4, h5, h6, li, blockquote, div[data-node-id]") || editableField;
    const textRange = document.createRange();
    textRange.setStart(blockNode, 0);
    textRange.setEnd(range.startContainer, range.startOffset);
    const textBeforeCursor = this.stripZeroWidthSpaces(textRange.toString());
    log("Markdown check - textBeforeCursor:", JSON.stringify(textBeforeCursor));
    const isInsideListItem = blockNode.nodeName === "LI" || !!blockEl.closest("li");
    if (!isInsideListItem) {
      const blockPatterns = [
        { markup: "###", type: "h3" },
        { markup: "##", type: "h2" },
        { markup: ">", type: "blockquote" },
        { markup: "1.", type: "ol" },
        { markup: "1)", type: "ol" },
        { markup: "-", type: "ul" },
        { markup: "+", type: "ul" }
      ];
      for (const pattern of blockPatterns) {
        if (textBeforeCursor === pattern.markup) {
          log("Markdown block shortcut detected:", pattern.markup, "\u2192", pattern.type);
          this.sendTransformRequest(blockUid, "markdown", {
            markdownType: "block",
            blockType: pattern.type
          });
          return true;
        }
      }
      if (textBeforeCursor === "*") {
        log("Markdown block shortcut detected: * \u2192 ul");
        this.sendTransformRequest(blockUid, "markdown", {
          markdownType: "block",
          blockType: "ul"
        });
        return true;
      }
    }
    const inlinePatterns = [
      { between: ["**", "**"], type: "strong" },
      { between: ["__", "__"], type: "strong" },
      { between: ["~~", "~~"], type: "del" },
      { between: ["*", "*"], type: "em" },
      { between: ["_", "_"], type: "em" }
    ];
    for (const pattern of inlinePatterns) {
      const [open, close] = pattern.between;
      if (!textBeforeCursor.endsWith(close)) continue;
      const searchText = textBeforeCursor.slice(0, -close.length);
      const openIdx = searchText.lastIndexOf(open);
      if (openIdx === -1) continue;
      const inner = searchText.slice(openIdx + open.length);
      if (inner.length === 0 || inner.trim() !== inner) continue;
      if (openIdx > 0 && !/\s/.test(searchText[openIdx - 1])) continue;
      log("Markdown inline shortcut detected:", open + "..." + close, "\u2192", pattern.type);
      this.sendTransformRequest(blockUid, "markdown", {
        markdownType: "inline",
        inlineType: pattern.type
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
    const pathInfo = this.blockPathMap?.[blockUid];
    if (pathInfo?.isTemplateInstance) {
      const childBlockIds = Object.entries(this.blockPathMap).filter(([, info]) => info.parentId === blockUid).map(([id]) => id);
      log("getAllBlockElements: template instance", blockUid, "childBlockIds:", childBlockIds);
      const elements2 = childBlockIds.flatMap((id) => [...document.querySelectorAll(`[data-block-uid="${id}"]`)]);
      log("getAllBlockElements: found", elements2.length, "elements for template instance");
      return elements2;
    }
    const elements = document.querySelectorAll(`[data-block-uid="${blockUid}"]`);
    if (elements.length === 0) {
      log("getAllBlockElements: no DOM elements for", blockUid, "pathInfo:", pathInfo ? "exists" : "missing", "isTemplateInstance:", pathInfo?.isTemplateInstance);
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
      if (rect.width === 0 && rect.height === 0) continue;
      minX = Math.min(minX, rect.left);
      minY = Math.min(minY, rect.top);
      maxX = Math.max(maxX, rect.right);
      maxY = Math.max(maxY, rect.bottom);
    }
    if (minX === Infinity) return null;
    return {
      top: minY,
      left: minX,
      width: maxX - minX,
      height: maxY - minY,
      right: maxX,
      bottom: maxY
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
    if (this._blockSelectorNavigating) {
      const isPositionTrackingSource = src === "transitionTracker" || src === "transitionEnd" || src === "scrollHandler";
      if (isPositionTrackingSource) {
        return;
      }
    }
    const blockUid = options.blockUid || blockElement?.getAttribute("data-block-uid") || PAGE_BLOCK_UID;
    if (!blockElement && !options.blockUid) {
      this.sendMessageToParent({
        type: "BLOCK_SELECTED",
        src,
        blockUid: null,
        rect: null
      }, this.adminOrigin);
      return;
    }
    const multiBlockUids = options.isMultipleSelection ? options.blockUids || [] : [];
    const allElements = multiBlockUids.length > 1 ? multiBlockUids.flatMap((uid) => [...this.getAllBlockElements(uid)]) : blockUid !== PAGE_BLOCK_UID ? this.getAllBlockElements(blockUid) : [];
    const elementForFields = blockElement || allElements[0] || null;
    let rect;
    if (allElements.length > 0) {
      rect = this.getBoundingBoxForElements(allElements);
      if (!rect && elementForFields) {
        const singleRect = elementForFields.getBoundingClientRect();
        rect = { top: singleRect.top, left: singleRect.left, width: singleRect.width, height: singleRect.height };
      }
    } else if (elementForFields) {
      const singleRect = elementForFields.getBoundingClientRect();
      rect = { top: singleRect.top, left: singleRect.left, width: singleRect.width, height: singleRect.height };
    }
    const editableFields = elementForFields ? this.getEditableFields(elementForFields) : {};
    const linkableFields = elementForFields ? this.getLinkableFields(elementForFields) : {};
    const mediaFields = elementForFields ? this.getMediaFields(elementForFields) : {};
    const addDirection = elementForFields ? this.getAddDirection(elementForFields) : "bottom";
    const focusedFieldName = options.focusedFieldName !== void 0 ? options.focusedFieldName : this.focusedFieldName;
    const focusedLinkableField = options.focusedLinkableField !== void 0 ? options.focusedLinkableField : this.focusedLinkableField;
    const focusedMediaField = options.focusedMediaField !== void 0 ? options.focusedMediaField : this.focusedMediaField;
    const dragHandle = document.querySelector(".volto-hydra-drag-button");
    if (dragHandle && blockUid && blockUid !== PAGE_BLOCK_UID) {
      const handlePos = calculateDragHandlePosition(rect);
      dragHandle.style.left = `${handlePos.left}px`;
      dragHandle.style.top = `${handlePos.top}px`;
      dragHandle.style.display = "block";
    }
    this._positionEdgeHandles();
    let focusedFieldRect = null;
    if (focusedFieldName && elementForFields) {
      const focusedEl = elementForFields.querySelector(`[data-edit-text="${focusedFieldName}"]`) || (elementForFields.getAttribute("data-edit-text") === focusedFieldName ? elementForFields : null);
      if (focusedEl) {
        const fr = focusedEl.getBoundingClientRect();
        focusedFieldRect = {
          top: Math.round(fr.top),
          left: Math.round(fr.left),
          width: Math.round(fr.width),
          height: Math.round(fr.height)
        };
      }
    }
    const message = {
      type: "BLOCK_SELECTED",
      src,
      blockUid,
      rect: {
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height
      },
      editableFields,
      linkableFields,
      mediaFields,
      focusedFieldName,
      focusedFieldRect,
      focusedLinkableField,
      focusedMediaField,
      addDirection,
      isMultiElement: blockUid && blockUid !== PAGE_BLOCK_UID ? this.getAllBlockElements(blockUid).length > 1 : false
    };
    if (options.selection !== void 0) {
      message.selection = options.selection;
    }
    if (options.isMultipleSelection) {
      message.isMultipleSelection = true;
      message.blockUids = options.blockUids;
      message.rects = options.rects;
    }
    if (options.selectionModeRects) {
      message.selectionModeRects = options.selectionModeRects;
    } else if (this._selectionModeBlockUids) {
      const rects = {};
      for (const uid of this._selectionModeBlockUids) {
        const el = this.queryBlockElement(uid);
        if (el) {
          const r = el.getBoundingClientRect();
          rects[uid] = { top: r.top, left: r.left, width: r.width, height: r.height };
        }
      }
      message.selectionModeRects = rects;
    }
    log("sendBlockSelected:", src, "blockUid:", blockUid, "isMulti:", !!message.isMultipleSelection, "rect:", !!rect);
    window.parent.postMessage(message, this.adminOrigin);
  }
  /**
   * Handle Shift/Ctrl/Meta click for multi-block selection.
   * Updates multiSelectedBlockUids and sends combined rect to admin.
   */
  _handleMultiSelectClick(blockUid, event) {
    if (event.shiftKey) {
      const anchor = this.multiSelectedBlockUids.length > 0 ? this.multiSelectedBlockUids[0] : this.selectedBlockUid;
      const anchorEl = anchor ? this.queryBlockElement(anchor) : null;
      const parentBlock = anchorEl?.parentElement?.closest("[data-block-uid]");
      const allBlocks = document.querySelectorAll("[data-block-uid]");
      const siblings = parentBlock ? Array.from(allBlocks).filter(
        (el) => el.parentElement?.closest("[data-block-uid]") === parentBlock
      ) : Array.from(allBlocks).filter(
        (el) => !el.parentElement?.closest("[data-block-uid]")
      );
      const siblingUids = siblings.map((el) => el.getAttribute("data-block-uid"));
      const anchorIdx = siblingUids.indexOf(anchor);
      const focusIdx = siblingUids.indexOf(blockUid);
      if (anchorIdx >= 0 && focusIdx >= 0) {
        const start = Math.min(anchorIdx, focusIdx);
        const end = Math.max(anchorIdx, focusIdx);
        this.multiSelectedBlockUids = siblingUids.slice(start, end + 1);
      } else {
        const current = this.multiSelectedBlockUids.length > 0 ? [...this.multiSelectedBlockUids] : this.selectedBlockUid ? [this.selectedBlockUid] : [];
        const idx = current.indexOf(blockUid);
        if (idx >= 0) {
          current.splice(idx, 1);
        } else {
          current.push(blockUid);
        }
        this.multiSelectedBlockUids = current;
      }
    } else {
      const current = this.multiSelectedBlockUids.length > 0 ? [...this.multiSelectedBlockUids] : this.selectedBlockUid ? [this.selectedBlockUid] : [];
      const idx = current.indexOf(blockUid);
      if (idx >= 0) {
        current.splice(idx, 1);
      } else {
        current.push(blockUid);
      }
      this.multiSelectedBlockUids = current;
    }
    log("Multi-select:", this.multiSelectedBlockUids.length, "blocks:", this.multiSelectedBlockUids);
    this.selectedBlockUid = null;
    this.isInlineEditing = false;
    this._sendMultiBlockSelected();
  }
  /**
   * Enter touch selection mode. Sends all sibling block rects to admin
   * so it can render checkbox overlays for toggling selection.
   * @param {string} blockUid - The long-pressed block (initially checked)
   */
  _enterSelectionMode(blockUid) {
    const blockElements = document.querySelectorAll("[data-block-uid]");
    const seen = /* @__PURE__ */ new Set();
    const allVisibleUids = [];
    for (const el of blockElements) {
      const uid = el.getAttribute("data-block-uid");
      if (uid && !seen.has(uid)) {
        seen.add(uid);
        allVisibleUids.push(uid);
      }
    }
    const allBlockRects = {};
    for (const uid of allVisibleUids) {
      const el = this.queryBlockElement(uid);
      if (el) {
        const r = el.getBoundingClientRect();
        allBlockRects[uid] = { top: r.top, left: r.left, width: r.width, height: r.height };
      }
    }
    this._selectionModeBlockUids = allVisibleUids;
    this.sendMessageToParent({
      type: "ENTER_SELECTION_MODE",
      blockUid,
      allBlockRects
    });
  }
  /**
   * Enter selection mode without toggling any block.
   * Used when admin (sidebar) initiates — admin already set multiSelected.
   * Iframe just needs to start showing checkboxes on all visible blocks.
   */
  _enterSelectionModeActivateOnly() {
    const blockElements = document.querySelectorAll("[data-block-uid]");
    const seen = /* @__PURE__ */ new Set();
    const allVisibleUids = [];
    for (const el of blockElements) {
      const uid = el.getAttribute("data-block-uid");
      if (uid && !seen.has(uid)) {
        seen.add(uid);
        allVisibleUids.push(uid);
      }
    }
    const allBlockRects = {};
    for (const uid of allVisibleUids) {
      const el = this.queryBlockElement(uid);
      if (el) {
        const r = el.getBoundingClientRect();
        allBlockRects[uid] = { top: r.top, left: r.left, width: r.width, height: r.height };
      }
    }
    this._selectionModeBlockUids = allVisibleUids;
    this.sendMessageToParent({
      type: "ENTER_SELECTION_MODE",
      allBlockRects
    });
  }
  /**
   * Send BLOCK_SELECTED with all multi-selected block UIDs and their rects.
   * The admin uses these to render combined outline and determine common parent.
   */
  _sendMultiBlockSelected() {
    const rects = {};
    for (const uid of this.multiSelectedBlockUids) {
      const el = this.queryBlockElement(uid);
      if (el) {
        const r = el.getBoundingClientRect();
        rects[uid] = { top: r.top, left: r.left, width: r.width, height: r.height };
      }
    }
    const anchorUid = this.multiSelectedBlockUids[0];
    const anchorEl = this.queryBlockElement(anchorUid);
    if (!anchorEl) return;
    this.sendBlockSelected("multiSelect", anchorEl, {
      blockUid: anchorUid,
      blockUids: this.multiSelectedBlockUids,
      rects,
      isMultipleSelection: true,
      focusedFieldName: null
    });
  }
  /**
   * Shows a developer warning overlay in the iframe.
   * Used to alert developers about configuration issues.
   *
   * @param {string} title - Warning title
   * @param {string} message - Detailed message with DOM info
   */
  showDeveloperWarning(title, message) {
    const overlay = document.createElement("div");
    overlay.id = "hydra-dev-warning";
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
        <strong style="color: #dc2626; font-size: 14px;">\u26A0\uFE0F ${title}</strong>
        <button id="hydra-warning-close" style="background: none; border: none; cursor: pointer; font-size: 18px; color: #666;">&times;</button>
      </div>
      <pre style="white-space: pre-wrap; word-break: break-word; margin: 0; color: #1f2937;">${message}</pre>
    `;
    document.body.appendChild(overlay);
    document.getElementById("hydra-warning-close")?.addEventListener("click", () => {
      overlay.remove();
    });
    setTimeout(() => overlay.remove(), 3e4);
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
    if (typeof window === "undefined") {
      return;
    }
    this._ensureDocumentKeyboardBlocker();
    if (window.self !== window.top) {
      let detectNavigation = function(callback) {
        let currentUrl = window.location.href;
        log("Setting up navigation detection, currentUrl:", currentUrl);
        function checkNavigation() {
          const newUrl = window.location.href;
          if (newUrl !== currentUrl) {
            log("Navigation detected:", currentUrl, "->", newUrl);
            callback(currentUrl);
            currentUrl = newUrl;
          }
        }
        window.addEventListener("hashchange", checkNavigation);
        window.addEventListener("popstate", checkNavigation);
        const originalPushState = window.history.pushState;
        window.history.pushState = function(...args) {
          originalPushState.apply(this, args);
          checkNavigation();
        };
        const originalReplaceState = window.history.replaceState;
        window.history.replaceState = function(...args) {
          originalReplaceState.apply(this, args);
          checkNavigation();
        };
        setInterval(() => {
          checkNavigation();
        }, 200);
        if (typeof navigation !== "undefined") {
          navigation.addEventListener("navigatesuccess", checkNavigation);
        }
      };
      log("Setting up detectNavigation with adminOrigin:", this.adminOrigin);
      detectNavigation((currentUrl) => {
        const currentUrlObj = new URL(currentUrl);
        if (window.location.pathname !== currentUrlObj.pathname) {
          const apiPath = this.pathToApiPath(window.location.pathname);
          const inPageNavTime = sessionStorage.getItem("hydra_in_page_nav_time");
          const isInPage = inPageNavTime && Date.now() - parseInt(inPageNavTime, 10) < 5e3;
          if (isInPage) {
            sessionStorage.removeItem("hydra_in_page_nav_time");
          }
          log("Sending PATH_CHANGE:", window.location.pathname, "-> apiPath:", apiPath, "inPage:", !!isInPage, "to", this.adminOrigin);
          window.parent.postMessage(
            {
              type: "PATH_CHANGE",
              path: apiPath,
              inPage: !!isInPage
            },
            this.adminOrigin
          );
          this.lastKnownPath = window.location.pathname;
        } else if (window.location.hash !== currentUrlObj.hash) {
          const hash = window.location.hash;
          const i = hash.indexOf("/");
          const rawPath = (i !== -1 ? hash.slice(i) || "/" : "/").replace(/\/+/g, "/");
          const apiPath = this.pathToApiPath(rawPath);
          log("Sending PATH_CHANGE (hash):", rawPath, "-> apiPath:", apiPath, "to", this.adminOrigin);
          window.parent.postMessage(
            {
              type: "PATH_CHANGE",
              path: apiPath
            },
            this.adminOrigin
          );
        }
      });
      const url = new URL(window.location.href);
      const editParam = url.searchParams.get("_edit");
      const isHydraEdit = window.name.startsWith("hydra-edit:") || editParam === "true";
      const isHydraView = window.name.startsWith("hydra-view:") || editParam === "false";
      const hydraBridgeEnabled = isHydraEdit || isHydraView || editParam !== null;
      const isEditMode2 = isHydraEdit;
      if ((isHydraEdit || isHydraView) && !this.adminOrigin) {
        const prefix = isHydraEdit ? "hydra-edit:" : "hydra-view:";
        this.adminOrigin = window.name.slice(prefix.length);
        log("Got admin origin from window.name:", this.adminOrigin);
      }
      let access_token = url.searchParams.get("access_token");
      const hasUrlToken = !!access_token;
      if (access_token) {
        sessionStorage.setItem("hydra_access_token", access_token);
        log("Stored access_token in sessionStorage");
      } else {
        access_token = sessionStorage.getItem("hydra_access_token");
        log("Retrieved access_token from sessionStorage:", access_token ? "found" : "not found");
      }
      if (access_token) {
        this.token = access_token;
        this._setTokenCookie(access_token);
      }
      if (isEditMode2) {
        this.enableBlockClickListener();
        this.injectCSS();
        this.listenForSelectBlockMessage();
        this.setupScrollHandler();
        this.setupResizeHandler();
        this.setupMouseActivityReporter();
        this.setupStructuralObserver();
        window.addEventListener("beforeunload", (e) => {
          if (this._allowLinkNavigation) {
            this._allowLinkNavigation = false;
            return;
          }
          e.preventDefault();
          e.returnValue = "";
          return "";
        });
        let currentPath = window.location.pathname;
        const hash = window.location.hash;
        if (hash) {
          const pathIndex = hash.indexOf("/");
          if (pathIndex !== -1) {
            currentPath = hash.slice(pathIndex);
          }
        }
        const hasStoredToken = !!sessionStorage.getItem("hydra_access_token");
        const isSpaNavigation = isHydraEdit && !hasUrlToken && hasStoredToken;
        const inPageNavTime = sessionStorage.getItem("hydra_in_page_nav_time");
        const isInPageNavigation = inPageNavTime && Date.now() - parseInt(inPageNavTime, 10) < 5e3;
        if (isInPageNavigation) {
          sessionStorage.removeItem("hydra_in_page_nav_time");
          const apiPath = this.pathToApiPath(currentPath);
          log("In-page navigation detected (paging), sending PATH_CHANGE with inPage flag, apiPath:", apiPath);
          window.parent.postMessage(
            { type: "PATH_CHANGE", path: apiPath, inPage: true },
            this.adminOrigin
          );
        } else if (isSpaNavigation) {
          const apiPath = this.pathToApiPath(currentPath);
          log("SPA navigation detected (window.name present, access_token missing), sending PATH_CHANGE, apiPath:", apiPath);
          window.parent.postMessage(
            { type: "PATH_CHANGE", path: apiPath },
            this.adminOrigin
          );
        } else {
          const initMessage = {
            type: "INIT",
            currentPath: this.pathToApiPath(currentPath)
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
            if (e.data.type === "INITIAL_DATA") {
              this.setFormDataFromAdmin(e.data.data, "INITIAL_DATA", e.data.blockPathMap);
              this.slateConfig = e.data.slateConfig || { hotkeys: {}, toolbarButtons: [] };
              this.addNodeIdsToAllSlateFields();
              if (this.onContentChangeCallback) {
                this._executeRender(this.onContentChangeCallback);
              }
              window.focus();
              this.initialized = true;
              if (e.data.selectedBlockUid) {
                const blockUidToSelect = e.data.selectedBlockUid;
                const bridge = this;
                let lastRect = null;
                let stableCount = 0;
                const STABLE_THRESHOLD = 3;
                const POSITION_TOLERANCE = 2;
                const MAX_RETRIES = 40;
                const waitForStable = (retries = MAX_RETRIES) => {
                  const element = this.queryBlockElement(blockUidToSelect);
                  if (!element) {
                    if (retries > 0) {
                      bridge._pendingInitialSelectTimer = setTimeout(() => waitForStable(retries - 1), 50);
                    } else {
                      bridge._pendingInitialSelectTimer = null;
                      log("Could not find element for selectedBlockUid:", blockUidToSelect);
                    }
                    return;
                  }
                  const rect = element.getBoundingClientRect();
                  const positionStable = lastRect !== null && Math.abs(rect.left - lastRect.left) < POSITION_TOLERANCE && Math.abs(rect.top - lastRect.top) < POSITION_TOLERANCE;
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
                    bridge._pendingInitialSelectTimer = null;
                    bridge.selectBlock(blockUidToSelect);
                  }
                };
                waitForStable();
              }
            }
          }
        };
        window.removeEventListener("message", receiveInitialData);
        window.addEventListener("message", receiveInitialData);
        if (!this.fieldFocusListenerAdded) {
          this.fieldFocusListenerAdded = true;
          document.addEventListener("mousedown", () => {
            this._mouseButtonDown = true;
          }, true);
          document.addEventListener("mouseup", () => {
            this._mouseButtonDown = false;
          }, true);
          document.addEventListener("focus", (e) => {
            const target = e.target instanceof Element ? e.target : e.target?.parentElement;
            const blockElement = target?.closest("[data-block-uid]");
            const blockUid = blockElement?.getAttribute("data-block-uid");
            if (!blockUid || !this.selectedBlockUid) return;
            if (blockUid !== this.selectedBlockUid) {
              if (this._blockSelectorNavigating || this._navigatingToBlock) {
                return;
              }
              if (this._mouseButtonDown) {
                return;
              }
              log("Focus moved to different block:", blockUid, "from:", this.selectedBlockUid);
              if (this._pendingInitialSelectTimer) {
                clearTimeout(this._pendingInitialSelectTimer);
                this._pendingInitialSelectTimer = null;
              }
              this.selectBlock(blockElement);
              return;
            }
            const editableField = target.getAttribute("data-edit-text");
            if (editableField) {
              log("Field focused:", editableField);
              const previousFieldName = this.focusedFieldName;
              this.focusedFieldName = editableField;
              if (previousFieldName !== editableField) {
                log("Field changed from", previousFieldName, "to", editableField, "- updating toolbar");
                const blockEl = this.queryBlockElement(blockUid);
                if (blockEl) {
                  this.sendBlockSelected("fieldFocusListener", blockEl, { focusedFieldName: editableField });
                }
              }
            }
          }, true);
        }
      } else if (isHydraView) {
        let currentPath = window.location.pathname;
        const hash = window.location.hash;
        if (hash) {
          const pathIndex = hash.indexOf("/");
          if (pathIndex !== -1) {
            currentPath = hash.slice(pathIndex);
          }
        }
        window.parent.postMessage(
          { type: "INIT", currentPath: this.pathToApiPath(currentPath) },
          this.adminOrigin
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
    const expiryDate = /* @__PURE__ */ new Date();
    expiryDate.setTime(expiryDate.getTime() + 12 * 60 * 60 * 1e3);
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
    this.onContentChangeCallback = callback;
    this.realTimeDataHandler = (event) => {
      if (event.origin === this.adminOrigin || event.origin === window.location.origin) {
        if (event.data.type === "FORM_DATA" || event.data.type === "TOGGLE_MARK_DONE") {
          log("Received", event.data.type, "message");
          if (event.data.data) {
            if (this.savedClickPosition && !this.focusedFieldValuesEqual(this.formData, event.data.data)) {
              log("FORM_DATA: content changed, clearing savedClickPosition (sidebar edit)");
              this.savedClickPosition = null;
            }
            const adminSelectedBlockUid = event.data.selectedBlockUid;
            const needsBlockSwitch = adminSelectedBlockUid && adminSelectedBlockUid !== this.selectedBlockUid;
            if (needsBlockSwitch) {
              log("Switching selectedBlockUid from", this.selectedBlockUid, "to", adminSelectedBlockUid);
              if (this._pendingInitialSelectTimer) {
                clearTimeout(this._pendingInitialSelectTimer);
                this._pendingInitialSelectTimer = null;
              }
            }
            const incomingSeq = event.data.data?._editSequence || 0;
            const localSeq = this.formData?._editSequence || 0;
            const isFormatResponse = !!event.data.formatRequestId;
            const isStale = incomingSeq < localSeq && !isFormatResponse;
            if (isStale) {
              log(
                "FORM_DATA: skipping stale data, incoming seq:",
                incomingSeq,
                "local seq:",
                localSeq,
                "isFormatResponse:",
                isFormatResponse,
                "blockedBlockId:",
                this.blockedBlockId
              );
              return;
            }
            if (event.data.blockPathMap === void 0) {
              log(
                "WARNING: FORM_DATA received without blockPathMap!",
                "message keys:",
                Object.keys(event.data),
                "hasData:",
                !!event.data.data,
                "formatRequestId:",
                event.data.formatRequestId,
                "selectedBlockUid:",
                event.data.selectedBlockUid
              );
            }
            if (event.data._sentAt) {
              log("FORM_DATA postMessage delivery:", Date.now() - event.data._sentAt + "ms");
            }
            if (this._transformSentAt && event.data.formatRequestId) {
              log("FORM_DATA total round-trip:", (performance.now() - this._transformSentAt).toFixed(0) + "ms");
              this._transformSentAt = null;
            }
            if (this._renderInProgress) {
              log("FORM_DATA: render in progress, queuing");
              this._formDataQueue = event.data;
              return;
            }
            this.setFormDataFromAdmin(event.data.data, "FORM_DATA", event.data.blockPathMap);
            this.addNodeIdsToAllSlateFields();
            const echoT0 = performance.now();
            this._isEchoFormData = this._prevFormDataJson && JSON.stringify(this.formData) === this._prevFormDataJson;
            log("echo detection took", (performance.now() - echoT0).toFixed(1) + "ms, isEcho:", this._isEchoFormData);
            const formatRequestId = event.data.formatRequestId;
            if (event.data.transformedSelection) {
              this.expectedSelectionFromAdmin = event.data.transformedSelection;
            }
            const renderFn = event.data.skipRender ? () => {
            } : callback;
            log(event.data.skipRender ? "FORM_DATA: skipRender \u2014 running afterContentRender without re-render" : "Calling onEditChange callback to trigger re-render");
            this._executeRender(renderFn, {
              transformedSelection: event.data.transformedSelection,
              formatRequestId,
              needsBlockSwitch,
              adminSelectedBlockUid,
              skipRender: !!event.data.skipRender
            });
          } else {
            throw new Error("No form data has been sent from the adminUI");
          }
        } else if (event.data.type === "FLUSH_BUFFER") {
          const requestId = event.data.requestId;
          log("Received FLUSH_BUFFER request, requestId:", requestId, "savedSelection:", this.savedSelection);
          if (this._renderInProgress) {
            log("FLUSH_BUFFER: render in progress, queuing");
            this._flushBufferQueue = event.data;
            return;
          }
          this._processFlushBuffer(requestId, event.data.setBlocking);
        } else if (event.data.type === "SLATE_ERROR") {
          console.error("[HYDRA] Received SLATE_ERROR:", event.data.error);
          const blockId = event.data.blockId;
          if (blockId && this.pendingTransform?.blockId === blockId) {
            log("Clearing processing state due to SLATE_ERROR");
            this.setBlockProcessing(blockId, false);
          }
        } else if (event.data.type === "FOCUS_FIELD") {
          const { blockId, fieldName } = event.data;
          log("Received FOCUS_FIELD:", blockId, fieldName);
          const blockElement = this.queryBlockElement(blockId);
          if (blockElement) {
            const field = blockElement.querySelector(`[data-field-id="${fieldName}"][contenteditable="true"]`);
            if (field) {
              field.focus();
              log("Focused field:", fieldName);
            } else {
              const firstEditable = this.getOwnFirstEditableField(blockElement);
              if (firstEditable) {
                firstEditable.focus();
                log("Focused first editable field (fallback)");
              }
            }
          }
        } else if (event.data.type === "SLASH_MENU_CLOSED") {
          log("Received SLASH_MENU_CLOSED");
          this._slashMenuActive = false;
        } else if (event.data.type === "ENTER_SELECTION_MODE") {
          log("Received ENTER_SELECTION_MODE from admin");
          this._enterSelectionModeActivateOnly();
        } else if (event.data.type === "EXIT_SELECTION_MODE") {
          log("Received EXIT_SELECTION_MODE");
          this._selectionModeBlockUids = null;
          this.multiSelectedBlockUids = [];
          this.sendMessageToParent({ type: "EXIT_SELECTION_MODE" });
        } else if (event.data.type === "TEMPLATE_EDIT_MODE") {
          this.templateEditMode = event.data.instanceId;
          log("Template edit mode:", this.templateEditMode ? `editing instance ${this.templateEditMode}` : "disabled");
          this.applyReadonlyVisuals();
          if (this.selectedBlockUid) {
            const blockElement = this.queryBlockElement(this.selectedBlockUid);
            if (blockElement) {
              this.restoreContentEditableOnFields(blockElement, "TEMPLATE_EDIT_MODE");
            }
          }
        }
      }
    };
    window.removeEventListener("message", this.realTimeDataHandler);
    window.addEventListener("message", this.realTimeDataHandler);
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
      log("Block element not found for field detection:", blockUid);
      return;
    }
    this.restoreContentEditableOnFields(blockElement, "detectFocusedFieldAndUpdateToolbar");
    let fieldToFocus = null;
    if (this.lastClickPosition?.target) {
      const clickedElement = this.lastClickPosition.target;
      const clickedField = clickedElement.closest("[data-edit-text]");
      log("Click event path - found clickedField:", !!clickedField);
      if (clickedField && this.fieldBelongsToBlock(clickedField, blockElement)) {
        fieldToFocus = clickedField.getAttribute("data-edit-text");
        log("Got field from click:", fieldToFocus);
      }
    }
    if (!fieldToFocus) {
      const firstEditableField = this.getOwnFirstEditableField(blockElement);
      log("querySelector path - found:", !!firstEditableField);
      if (firstEditableField) {
        fieldToFocus = firstEditableField.getAttribute("data-edit-text");
        log("Got field from querySelector:", fieldToFocus);
      }
    }
    if (fieldToFocus !== this.focusedFieldName) {
      log("Updating focusedFieldName from", this.focusedFieldName, "to", fieldToFocus);
      this.focusedFieldName = fieldToFocus;
      const blockElement2 = this.queryBlockElement(blockUid);
      if (blockElement2) {
        this.sendBlockSelected("detectFieldChange", blockElement2, { focusedFieldName: fieldToFocus });
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
      if (this._selectionModeBlockUids) {
        const blockElement2 = event.target.closest("[data-block-uid]");
        if (blockElement2) {
          event.preventDefault();
          event.stopPropagation();
          const blockUid = blockElement2.getAttribute("data-block-uid");
          log("blockClickHandler: selection mode toggle:", blockUid);
          this.sendMessageToParent({
            type: "ENTER_SELECTION_MODE",
            blockUid
          });
        }
        return;
      }
      log("blockClickHandler: event target:", event.target.tagName, event.target.className);
      log("blockClickHandler: _isDragging:", this._isDragging, "_navigatingToBlock:", this._navigatingToBlock);
      const selectorElement = event.target.closest("[data-block-selector]");
      if (selectorElement) {
        if (this._navigatingToBlock) {
          log("blockClickHandler: skipping handleBlockSelector, tryMakeBlockVisible in progress");
          return;
        }
        const selector = selectorElement.getAttribute("data-block-selector");
        this.handleBlockSelector(selector, selectorElement);
        return;
      }
      if (!this.initialized) {
        log("blockClickHandler: deferred \u2014 INITIAL_DATA not yet received");
        const x = event.clientX;
        const y = event.clientY;
        const bridge = this;
        const waitForInit = () => {
          if (bridge.initialized && !bridge._renderInProgress) {
            const el = document.elementFromPoint(x, y);
            const blockEl = el?.closest("[data-block-uid]");
            if (blockEl) {
              log("Processing deferred block click, uid:", blockEl.getAttribute("data-block-uid"));
              bridge.selectBlock(blockEl);
            }
          } else {
            setTimeout(waitForInit, 50);
          }
        };
        setTimeout(waitForInit, 50);
        return;
      }
      if (this._blockSelectorNavigating) {
        log("blockClickHandler: skipping, _blockSelectorNavigating active");
        return;
      }
      const allowedElement = event.target.closest("[data-linkable-allow]");
      if (allowedElement) {
        this._allowLinkNavigation = true;
        setTimeout(() => {
          this._allowLinkNavigation = false;
        }, 100);
        sessionStorage.setItem("hydra_in_page_nav_time", String(Date.now()));
      }
      const blockElement = event.target.closest("[data-block-uid]");
      if (blockElement) {
        const target = event.target;
        if (target.isContentEditable && event.detail === 0) {
          event.preventDefault();
          return;
        }
        const blockUid = blockElement.getAttribute("data-block-uid");
        const isInsideReadonly = event.target.closest("[data-block-readonly]") || this.isBlockReadonly(blockUid);
        const linkElement = event.target.closest("a");
        if (linkElement && !allowedElement) {
          if (isInsideReadonly) {
            event.preventDefault();
          } else {
            const isLinkableField = linkElement.closest("[data-edit-link]");
            if (isLinkableField) {
              event.preventDefault();
            }
          }
        }
        const clickedEditableField = isInsideReadonly ? null : event.target.closest("[data-edit-text]");
        const editableField = clickedEditableField || (isInsideReadonly ? null : blockElement.querySelector("[data-edit-text]"));
        const clickedLinkableField = isInsideReadonly ? null : event.target.closest("[data-edit-link]");
        const clickedMediaField = isInsideReadonly ? null : event.target.closest("[data-edit-media]");
        if (editableField) {
          const rect = editableField.getBoundingClientRect();
          this.lastClickPosition = {
            relativeX: event.clientX - rect.left,
            relativeY: event.clientY - rect.top,
            editableField: editableField.getAttribute("data-edit-text"),
            target: event.target,
            // For field detection
            linkableField: clickedLinkableField?.getAttribute("data-edit-link") || null,
            mediaField: clickedMediaField?.getAttribute("data-edit-media") || null
          };
        } else {
          this.lastClickPosition = {
            target: event.target,
            linkableField: clickedLinkableField?.getAttribute("data-edit-link") || null,
            mediaField: clickedMediaField?.getAttribute("data-edit-media") || null
          };
        }
        if (this._pendingInitialSelectTimer) {
          clearTimeout(this._pendingInitialSelectTimer);
          this._pendingInitialSelectTimer = null;
        }
        if (event.shiftKey || event.ctrlKey || event.metaKey) {
          const isTextMode = this.editMode === "text";
          const isSameBlock = blockUid === this.selectedBlockUid;
          if (!isTextMode && !isSameBlock || event.ctrlKey || event.metaKey) {
            this._handleMultiSelectClick(blockUid, event);
            return;
          }
        }
        if (this.multiSelectedBlockUids.length > 0) {
          this.multiSelectedBlockUids = [];
        }
        this.editMode = "text";
        this.selectBlock(blockElement);
      } else {
        const pageField = event.target.closest("[data-edit-media], [data-edit-link], [data-edit-text]");
        if (pageField) {
          event.preventDefault();
          this.selectedBlockUid = PAGE_BLOCK_UID;
          this.focusedMediaField = pageField.getAttribute("data-edit-media");
          this.focusedLinkableField = pageField.getAttribute("data-edit-link");
          this.focusedFieldName = pageField.getAttribute("data-edit-text");
          if (this.focusedFieldName) {
            const wasAlreadyEditable = pageField.getAttribute("contenteditable") === "true";
            this.editMode = "text";
            this.isInlineEditing = true;
            this.activateEditableField(pageField, this.focusedFieldName, null, "pageFieldClick", {
              wasAlreadyEditable,
              saveClickPosition: true
              // Save for FORM_DATA handler after re-render
            });
          }
          this.sendBlockSelected("pageFieldClick", pageField);
        } else {
          const linkEl = event.target.closest("a[href]");
          if (linkEl && !allowedElement) {
            const href = linkEl.getAttribute("href");
            try {
              const linkUrl = new URL(href, window.location.origin);
              if (linkUrl.origin === window.location.origin) {
                event.stopPropagation();
                log("Nav link click in edit mode \u2014 letting browser navigate (triggers beforeunload):", href);
              }
            } catch (e) {
            }
          }
        }
      }
    };
    document.removeEventListener("click", this.blockClickHandler, true);
    document.addEventListener("click", this.blockClickHandler, true);
    if (!this._blockSelectorMousedownHandler) {
      this._blockSelectorMousedownHandler = (event) => {
        if (event.target.closest("[data-block-selector]")) {
          this._blockSelectorNavigating = true;
        }
      };
      document.addEventListener("mousedown", this._blockSelectorMousedownHandler, true);
    }
    if (!this._longPressHandlersAttached) {
      this._longPressHandlersAttached = true;
      this._longPressTimer = null;
      const LONG_PRESS_MS = 600;
      const MOVE_THRESHOLD = 10;
      let startX = 0, startY = 0;
      document.addEventListener("touchstart", (e) => {
        if (this._longPressTimer) clearTimeout(this._longPressTimer);
        const touch = e.touches[0];
        startX = touch.clientX;
        startY = touch.clientY;
        const target = document.elementFromPoint(touch.clientX, touch.clientY);
        const blockEl = target?.closest("[data-block-uid]");
        if (!blockEl) return;
        const blockUid = blockEl.getAttribute("data-block-uid");
        this._longPressTimer = setTimeout(() => {
          this._longPressTimer = null;
          if (this._selectionModeBlockUids) {
            log("Long press in selection mode, toggling:", blockUid);
            this.sendMessageToParent({
              type: "ENTER_SELECTION_MODE",
              blockUid
            });
          } else {
            log("Long press detected on block:", blockUid);
            this._enterSelectionMode(blockUid);
          }
        }, LONG_PRESS_MS);
      }, { passive: true });
      document.addEventListener("touchmove", (e) => {
        if (!this._longPressTimer) return;
        const touch = e.touches[0];
        const dx = touch.clientX - startX;
        const dy = touch.clientY - startY;
        if (Math.abs(dx) > MOVE_THRESHOLD || Math.abs(dy) > MOVE_THRESHOLD) {
          clearTimeout(this._longPressTimer);
          this._longPressTimer = null;
        }
      }, { passive: true });
      document.addEventListener("touchend", () => {
        if (this._longPressTimer) {
          clearTimeout(this._longPressTimer);
          this._longPressTimer = null;
        }
      }, { passive: true });
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
      if (this.blockedBlockId) {
        log(
          "DEBUG blocker:",
          e.type,
          e.key || e.inputType || "?",
          "target:",
          e.target?.nodeName,
          "block:",
          e.target?.closest?.("[data-block-uid]")?.getAttribute("data-block-uid")
        );
      }
      if (!this.blockedBlockId) {
        if (e.type !== "keydown") return;
        if (["Shift", "Control", "Alt", "Meta", "Tab"].includes(e.key)) return;
        if (e.defaultPrevented) return;
        if (["ArrowDown", "ArrowUp"].includes(e.key)) {
          log(
            "BLOCKER arrow:",
            e.key,
            "ts:",
            Math.round(e.timeStamp),
            "trusted:",
            e.isTrusted,
            "target:",
            e.target?.nodeName,
            "class:",
            e.target?.className?.substring?.(0, 30),
            "activeEl:",
            document.activeElement?.nodeName,
            "selected:",
            this.selectedBlockUid
          );
        }
        const activeEditField = document.activeElement?.closest?.('[data-edit-text][contenteditable="true"]');
        if (e.key === "Escape") {
          if (this.multiSelectedBlockUids.length > 0) {
            const anchorUid = this.multiSelectedBlockUids[0];
            this.multiSelectedBlockUids = [];
            this.selectedBlockUid = anchorUid;
            const anchorEl = this.queryBlockElement(anchorUid);
            if (anchorEl) {
              this.sendBlockSelected("escapeMultiSelect", anchorEl, { focusedFieldName: null });
            }
            return;
          }
          if (!this.selectedBlockUid) {
            this.sendBlockSelected("escapeKey", null);
            return;
          }
          if (this._slashMenuActive) return;
          const isInPopup = e.target?.closest?.('.volto-hydra-dropdown-menu, .blocks-chooser, [role="dialog"]');
          if (isInPopup) return;
          e.preventDefault();
          if (activeEditField) {
            log("Escape key - entering block mode from text editing:", this.selectedBlockUid);
            this.editMode = "block";
            const blockElement = this.queryBlockElement(this.selectedBlockUid);
            if (blockElement) {
              this.collectBlockFields(blockElement, "data-edit-text", (el) => {
                if (el.getAttribute("contenteditable") === "true") {
                  el.setAttribute("contenteditable", "false");
                }
              });
            }
            activeEditField.blur();
            this.focusedFieldName = null;
            if (blockElement) {
              this.sendBlockSelected("escapeToBlockMode", blockElement, { focusedFieldName: null });
            }
          } else {
            this.editMode = "block";
            const pathInfo = this.blockPathMap?.[this.selectedBlockUid];
            const parentId = pathInfo?.parentId || null;
            log("Escape key - selecting parent:", parentId, "from:", this.selectedBlockUid);
            if (parentId && parentId !== PAGE_BLOCK_UID) {
              if (this.blockPathMap?.[parentId]?.isTemplateInstance) {
                this.selectBlock(parentId);
              } else {
                const parentElement = this.queryBlockElement(parentId);
                if (parentElement) this.selectBlock(parentElement);
              }
            } else {
              this.selectedBlockUid = null;
              this.editMode = "text";
              this.sendBlockSelected("escapeKey", null);
            }
          }
          return;
        }
        if (e.key === "a" && (e.ctrlKey || e.metaKey) && this.selectedBlockUid) {
          if (activeEditField) {
            const sel = window.getSelection();
            if (!sel || sel.rangeCount === 0) return;
            const fieldText = activeEditField.textContent || "";
            const selText = sel.toString();
            if (selText.length < fieldText.replace(/[\uFEFF\u200B]/g, "").length) return;
            e.preventDefault();
            this.editMode = "block";
            const blockElement = this.queryBlockElement(this.selectedBlockUid);
            if (blockElement) {
              this.collectBlockFields(blockElement, "data-edit-text", (el) => {
                if (el.getAttribute("contenteditable") === "true") {
                  el.setAttribute("contenteditable", "false");
                }
              });
            }
            activeEditField.blur();
            window.getSelection()?.removeAllRanges();
            this.focusedFieldName = null;
            if (blockElement) {
              this.sendBlockSelected("selectAllBlock", blockElement, { focusedFieldName: null });
            }
            return;
          }
        }
        if (activeEditField) return;
        if (this.multiSelectedBlockUids.length > 0) {
          if (this._handleBlockModeKey(e)) return;
        }
        if (!this.selectedBlockUid) {
          if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            const allBlocks = document.querySelectorAll("[data-block-uid]");
            const pageBlocks = Array.from(allBlocks).filter(
              (el) => !el.parentElement?.closest("[data-block-uid]")
            );
            if (pageBlocks.length === 0) return;
            e.preventDefault();
            this.editMode = "text";
            this.selectBlock(e.key === "ArrowDown" ? pageBlocks[0] : pageBlocks[pageBlocks.length - 1]);
          }
          return;
        }
        if (this.editMode === "text" && ["ArrowDown", "ArrowUp", "ArrowLeft", "ArrowRight"].includes(e.key)) {
          const blockEl = this.queryBlockElement(this.selectedBlockUid);
          if (blockEl) {
            e.preventDefault();
            this.handleArrowAtEdge(e.key, this.selectedBlockUid, null, blockEl);
            return;
          }
        }
        if (this._handleBlockModeKey(e)) return;
        const isBodyTarget2 = e.target === document.body || e.target === document.documentElement;
        if (isBodyTarget2) {
          log("Buffering body-focused key:", e.key, "for", this.selectedBlockUid);
          this.eventBuffer.push({
            key: e.key,
            code: e.code,
            ctrlKey: e.ctrlKey,
            metaKey: e.metaKey,
            shiftKey: e.shiftKey,
            altKey: e.altKey
          });
          e.preventDefault();
        }
        return;
      }
      const isBodyTarget = e.target === document.body || e.target === document.documentElement;
      if (!isBodyTarget) {
        const targetBlock = e.target.closest?.("[data-block-uid]");
        if (!targetBlock || targetBlock.getAttribute("data-block-uid") !== this.blockedBlockId) {
          if (e.type === "keydown") {
            log(
              "DEBUG blocker: key",
              e.key,
              "target block mismatch. target:",
              e.target?.nodeName,
              "closest block:",
              targetBlock?.getAttribute("data-block-uid"),
              "blockedBlockId:",
              this.blockedBlockId
            );
          }
          return;
        }
      }
      if (e.type === "keydown") {
        if (["Shift", "Control", "Alt", "Meta"].includes(e.key)) {
          e.preventDefault();
          e.stopPropagation();
          return false;
        }
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "v") {
          const entry = { _type: "paste", html: null };
          this.eventBuffer.push(entry);
          navigator.clipboard.read().then(async (items) => {
            for (const item of items) {
              if (item.types.includes("text/html")) {
                entry.html = await (await item.getType("text/html")).text();
                return;
              }
              if (item.types.includes("text/plain")) {
                entry.html = await (await item.getType("text/plain")).text();
              }
            }
          }).catch(() => {
            navigator.clipboard.readText().then((text) => {
              entry.html = text;
            }).catch(() => {
            });
          });
          log("BUFFERED paste with clipboard read, buffer size:", this.eventBuffer.length);
        } else {
          this.eventBuffer.push({
            key: e.key,
            code: e.code,
            ctrlKey: e.ctrlKey,
            metaKey: e.metaKey,
            shiftKey: e.shiftKey,
            altKey: e.altKey
          });
          log("BUFFERED keyboard event:", e.key, "buffer size:", this.eventBuffer.length);
        }
      }
      e.preventDefault();
      e.stopPropagation();
      return false;
    };
    document.addEventListener("keydown", this._documentKeyboardBlocker, true);
    document.addEventListener("keypress", this._documentKeyboardBlocker, true);
    document.addEventListener("input", this._documentKeyboardBlocker, true);
    document.addEventListener("beforeinput", this._documentKeyboardBlocker, true);
  }
  setBlockProcessing(blockId, processing = true, requestId = null) {
    log("setBlockProcessing:", { blockId, processing, requestId });
    if (processing) {
      log("BLOCKING input for", blockId);
      this.eventBuffer = [];
      this.blockedBlockId = blockId;
      this._ensureDocumentKeyboardBlocker();
      this._setPointerBlocking(true);
      this.pendingTransform = {
        blockId,
        requestId
      };
    } else {
      log("UNBLOCKING input for", blockId);
      this.blockedBlockId = null;
      this._setPointerBlocking(false);
      this.pendingTransform = null;
      if (this.eventBuffer.length > 0) {
        this.pendingBufferReplay = {
          blockId,
          buffer: [...this.eventBuffer]
        };
        this.eventBuffer = [];
        log("Marked", this.pendingBufferReplay.buffer.length, "events for replay after DOM ready");
      }
    }
  }
  /**
   * Replays buffered events and unblocks input after a transform completes.
   * This is the safe sequence: prepare buffer → replay → unblock
   * Called from FORM_DATA handler after DOM is updated.
   */
  replayBufferAndUnblock(context = "") {
    if (!this.pendingTransform) {
      log("[HYDRA-DEBUG] replayBufferAndUnblock: no pendingTransform, returning");
      return;
    }
    const { blockId, requestId: originalRequestId } = this.pendingTransform;
    log("[HYDRA-DEBUG] replayBufferAndUnblock:", { blockId, requestId: originalRequestId, bufferLen: this.eventBuffer.length, remainderLen: this._replayRemainder?.length || 0, context });
    const editEl = this.queryBlockElement(blockId)?.querySelector("[data-edit-text]") || this.queryBlockElement(blockId);
    if (editEl) log("[HYDRA-DEBUG] replayBufferAndUnblock DOM:", editEl.innerHTML?.substring(0, 200));
    const remainder = this._replayRemainder || [];
    this._replayRemainder = null;
    if (remainder.length > 0 || this.eventBuffer.length > 0) {
      this.pendingBufferReplay = {
        blockId,
        buffer: [...remainder, ...this.eventBuffer]
      };
      this.eventBuffer = [];
      log(
        "Prepared",
        this.pendingBufferReplay.buffer.length,
        "events for replay",
        remainder.length ? `(${remainder.length} from previous cycle)` : ""
      );
    }
    this.replayBufferedEvents();
    const hasNewPendingTransform = this.pendingTransform?.requestId && this.pendingTransform.requestId !== originalRequestId;
    if (!hasNewPendingTransform) {
      log("Unblocking input for", blockId, "- after replay" + (context ? ` (${context})` : ""));
      this.setBlockProcessing(blockId, false);
    } else {
      log("Skipping unblock - new transform pending:", this.pendingTransform.requestId);
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
    log("Replaying", buffer.length, "buffered events, retry:", retryCount);
    const currentBlock = this.queryBlockElement(blockId);
    const currentEditable = currentBlock ? this.getOwnFirstEditableField(currentBlock) : null;
    if (!currentEditable) {
      if (retryCount < 5) {
        requestAnimationFrame(() => this.replayBufferedEvents(retryCount + 1));
        return;
      }
      console.warn("[HYDRA] Cannot replay buffer - editable field not found after retries");
      this.pendingBufferReplay = null;
      return;
    }
    this.pendingBufferReplay = null;
    if (currentEditable && document.activeElement !== currentEditable && !currentEditable.contains(document.activeElement)) {
      currentEditable.focus({ preventScroll: true });
    }
    const savedBlockedId = this.blockedBlockId;
    this.blockedBlockId = null;
    for (let i = 0; i < buffer.length; i++) {
      if (this.blockedBlockId) {
        this._replayRemainder = buffer.slice(i);
        log("Replay interrupted by transform, saved", this._replayRemainder.length, "events for next cycle");
        break;
      }
      const evt = buffer[i];
      log("Replaying buffered key:", evt.key || evt._type, { ctrl: evt.ctrlKey, meta: evt.metaKey, shift: evt.shiftKey });
      this.replayOneKey(blockId, evt, currentEditable);
    }
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
      editableField.setAttribute("contenteditable", "false");
      editableField.style.cursor = "not-allowed";
      editableField.style.opacity = "0.5";
      editableField.title = "Transform timeout - refresh page to continue editing";
    }
    console.error("[HYDRA] Transform timeout for block:", blockId);
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
    if (node.nodeType === Node.ELEMENT_NODE) {
      if (node.hasAttribute?.("data-node-id") && isValidNodeId(node.getAttribute("data-node-id"))) {
        return false;
      }
      if (node.hasAttribute?.("data-edit-text")) {
        const hasNodeIdChildren = node.querySelector?.("[data-node-id]");
        if (hasNodeIdChildren) {
          log("isOnInvalidWhitespace: cursor on edit-text container but has nodeId children, needs correction");
          return true;
        }
        return false;
      }
      const blockElement = node.closest?.("[data-block-uid]");
      if (!blockElement) {
        return false;
      }
      const nodeIdElement = blockElement.querySelector("[data-node-id]");
      if (nodeIdElement && !node.closest?.("[data-node-id]")) {
        log("isOnInvalidWhitespace: element inside block but outside data-node-id, tagName:", node.tagName);
        return true;
      }
      return false;
    }
    if (node.nodeType !== Node.TEXT_NODE) {
      return false;
    }
    const visibleText = node.textContent?.replace(/[\uFEFF\u200B\s]/g, "");
    if (visibleText === "" && node.parentElement && !node.parentElement.hasAttribute?.("data-node-id")) {
      return true;
    }
    let editableField = null;
    let current = node.parentNode;
    while (current) {
      if (current.nodeType === Node.ELEMENT_NODE && current.hasAttribute?.("data-edit-text")) {
        editableField = current;
        break;
      }
      current = current.parentNode;
    }
    if (!editableField) {
      return false;
    }
    if (!editableField.querySelector("[data-node-id]")) {
      return false;
    }
    current = node.parentNode;
    while (current) {
      if (current.nodeType === Node.ELEMENT_NODE && current.hasAttribute?.("data-node-id") && isValidNodeId(current.getAttribute("data-node-id"))) {
        return false;
      }
      if (current === editableField) {
        break;
      }
      current = current.parentNode;
    }
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
    log("getValidPositionForWhitespace: node=", node.nodeType === Node.TEXT_NODE ? "TEXT" : node.tagName, "content=", JSON.stringify(node.textContent?.substring(0, 20)), "isRangeEnd=", isRangeEnd);
    let container = null;
    if (node.nodeType === Node.ELEMENT_NODE && node.hasAttribute?.("data-edit-text")) {
      container = node;
    }
    if (!container) {
      let current = node.parentNode;
      while (current && !current.hasAttribute?.("data-edit-text")) {
        current = current.parentNode;
      }
      container = current;
    }
    if (!container && node.nodeType === Node.ELEMENT_NODE) {
      container = node.querySelector?.("[data-edit-text]");
    }
    if (!container) {
      log("getValidPositionForWhitespace: no container found");
      return null;
    }
    const containerHasValidId = container.hasAttribute?.("data-node-id") && isValidNodeId(container.getAttribute("data-node-id"));
    const allDescendants = [...container.querySelectorAll("[data-node-id]")].filter((el) => isValidNodeId(el.getAttribute("data-node-id")));
    const firstNodeIdEl = containerHasValidId ? container : allDescendants[0] || null;
    const allNodeIdEls = containerHasValidId ? [container, ...allDescendants] : allDescendants;
    const lastNodeIdEl = allNodeIdEls[allNodeIdEls.length - 1];
    if (!firstNodeIdEl) {
      log("getValidPositionForWhitespace: no firstNodeIdEl found");
      return null;
    }
    let returnEndPosition = isRangeEnd;
    if (!isRangeEnd) {
      const position = node.compareDocumentPosition(firstNodeIdEl);
      const isBeforeFirst = position & Node.DOCUMENT_POSITION_FOLLOWING;
      returnEndPosition = !isBeforeFirst;
      log("getValidPositionForWhitespace: isBeforeFirst=", isBeforeFirst, "firstNodeIdEl=", firstNodeIdEl.tagName, "nodeId=", firstNodeIdEl.getAttribute("data-node-id"));
    }
    if (!returnEndPosition) {
      const walker = document.createTreeWalker(firstNodeIdEl, NodeFilter.SHOW_TEXT, null, false);
      let textNode = walker.nextNode();
      if (!textNode) {
        textNode = document.createTextNode("\uFEFF");
        firstNodeIdEl.appendChild(textNode);
        log("getValidPositionForWhitespace: created ZWS text node in empty element");
        return { textNode, offset: 1 };
      }
      const visibleText = textNode.textContent.replace(/[\uFEFF\u200B]/g, "");
      if (visibleText === "") {
        if (!textNode.textContent.includes("\uFEFF")) {
          textNode.textContent = "\uFEFF" + textNode.textContent;
          log("getValidPositionForWhitespace: prepended ZWS to empty text node");
        }
        return { textNode, offset: 1 };
      }
      log("getValidPositionForWhitespace: returning start of first text node:", textNode?.textContent?.substring(0, 20));
      return { textNode, offset: 0 };
    } else {
      const walker = document.createTreeWalker(lastNodeIdEl, NodeFilter.SHOW_TEXT, null, false);
      let lastText = null;
      while (walker.nextNode()) {
        lastText = walker.currentNode;
      }
      log("getValidPositionForWhitespace: returning end of last text node:", lastText?.textContent?.substring(0, 20), "offset:", lastText?.textContent?.length);
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
    log("correctInvalidWhitespaceSelection: correcting cursor on invalid whitespace", {
      anchorOnWhitespace,
      focusOnWhitespace,
      anchorContent: range.startContainer.textContent?.substring(0, 20),
      anchorParent: range.startContainer.parentElement?.tagName
    });
    this._suppressObserver();
    let anchorPos, focusPos;
    if (!range.collapsed && anchorOnWhitespace && focusOnWhitespace) {
      const editField = range.startContainer.parentElement?.closest('[data-edit-text], [contenteditable="true"]');
      if (editField) {
        const walker = document.createTreeWalker(editField, NodeFilter.SHOW_TEXT);
        let firstVisible = null;
        let lastVisible = null;
        let node;
        while (node = walker.nextNode()) {
          const vis = node.textContent?.replace(/[\uFEFF\u200B\s]/g, "");
          if (vis) {
            if (!firstVisible) firstVisible = node;
            lastVisible = node;
          }
        }
        anchorPos = firstVisible ? { node: firstVisible, offset: 0 } : this.getValidatedPosition(range.startContainer, range.startOffset);
        focusPos = lastVisible ? { node: lastVisible, offset: lastVisible.textContent.length } : this.getValidatedPosition(range.endContainer, range.endOffset);
      } else {
        anchorPos = this.getValidatedPosition(range.startContainer, range.startOffset);
        focusPos = this.getValidatedPosition(range.endContainer, range.endOffset);
      }
    } else {
      anchorPos = this.getValidatedPosition(range.startContainer, range.startOffset);
      focusPos = this.getValidatedPosition(range.endContainer, range.endOffset);
    }
    log("correctInvalidWhitespaceSelection: anchorPos:", anchorPos, "focusPos:", focusPos);
    if (!anchorPos.node || !focusPos.node) {
      this._resumeObserver();
      return false;
    }
    const anchorSame = anchorPos.node === range.startContainer && anchorPos.offset === range.startOffset;
    const focusSame = focusPos.node === range.endContainer && focusPos.offset === range.endOffset;
    if (anchorSame && focusSame) {
      log("correctInvalidWhitespaceSelection: corrected position same as current, skipping to avoid loop");
      this._resumeObserver();
      return false;
    }
    const newRange = document.createRange();
    newRange.setStart(anchorPos.node, anchorPos.offset);
    newRange.setEnd(focusPos.node, focusPos.offset);
    selection.removeAllRanges();
    selection.addRange(newRange);
    this._resumeObserver();
    log("correctInvalidWhitespaceSelection: Corrected selection");
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
    const text = node.textContent;
    if (!text || text.trim() !== "" || /[\uFEFF\u200B]/.test(text)) return false;
    let current = node.parentNode;
    let foundDataNodeId = false;
    while (current) {
      if (current.nodeType === Node.ELEMENT_NODE) {
        if (current.hasAttribute?.("data-node-id") && isValidNodeId(current.getAttribute("data-node-id"))) {
          foundDataNodeId = true;
          const elementText = this.stripZeroWidthSpaces(current.textContent);
          if (elementText.trim() !== "") {
            log("ensureValidInsertionTarget: skipping, ancestor has content:", elementText.substring(0, 30));
            return false;
          }
        }
        if (current.hasAttribute?.("data-edit-text")) {
          const fieldText = this.stripZeroWidthSpaces(current.textContent);
          if (fieldText.trim() !== "") {
            log("ensureValidInsertionTarget: skipping, field has content:", fieldText.substring(0, 30));
            return false;
          }
          break;
        }
      }
      current = current.parentNode;
    }
    if (!foundDataNodeId) return false;
    this._suppressObserver();
    node.textContent = "\uFEFF";
    const range = selection.getRangeAt(0);
    range.setStart(node, 1);
    range.setEnd(node, 1);
    selection.removeAllRanges();
    selection.addRange(range);
    this._resumeObserver();
    log("ensureValidInsertionTarget: replaced artifact whitespace with FEFF");
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
      if (this.savedSelection) {
        log("serializeSelection: using savedSelection (no live selection)");
        return this.savedSelection;
      }
      return null;
    }
    const range = selection.getRangeAt(0);
    const anchorNode = range.startContainer;
    const focusNode = range.endContainer;
    const anchor = this.serializePoint(anchorNode, range.startOffset);
    const focus = this.serializePoint(focusNode, range.endOffset);
    if (!anchor || !focus) {
      let editableField = range.commonAncestorContainer;
      while (editableField && !editableField.hasAttribute?.("data-edit-text")) {
        editableField = editableField.parentNode;
      }
      if (editableField && editableField.querySelector("[data-node-id]")) {
        console.warn("[HYDRA] Could not serialize selection points in Slate field");
      }
      return null;
    }
    const validationResult = this.validateSelectionPaths(anchor, focus, range.commonAncestorContainer);
    if (!validationResult.valid) {
      console.error(
        `[HYDRA] Invalid selection path detected! This will cause a Slate error.

Anchor path: [${anchor.path.join(", ")}], offset: ${anchor.offset}
Focus path: [${focus.path.join(", ")}], offset: ${focus.offset}

Error: ${validationResult.error}

DOM structure:
${validationResult.domStructure}

Slate structure:
${validationResult.slateStructure}`
      );
    }
    return { anchor, focus };
  }
  /**
   * Validates that selection paths exist in the Slate structure.
   * Returns detailed debugging info if invalid.
   */
  validateSelectionPaths(anchor, focus, commonAncestor) {
    let editableField = commonAncestor;
    while (editableField && !editableField.hasAttribute?.("data-edit-text")) {
      editableField = editableField.parentNode;
    }
    if (!editableField) {
      return { valid: true };
    }
    let blockElement = editableField;
    while (blockElement && !blockElement.hasAttribute?.("data-block-uid")) {
      blockElement = blockElement.parentNode;
    }
    if (!blockElement) {
      return { valid: true };
    }
    const blockUid = blockElement.getAttribute("data-block-uid");
    const fieldName = editableField.getAttribute("data-edit-text");
    const blockData = this.getBlockData(blockUid);
    if (!blockData || !blockData[fieldName]) {
      return { valid: true };
    }
    const slateValue = blockData[fieldName];
    if (!Array.isArray(slateValue)) {
      return { valid: true };
    }
    const anchorValid = this.isPathValidInSlate(anchor.path, slateValue);
    const focusValid = this.isPathValidInSlate(focus.path, slateValue);
    if (anchorValid && focusValid) {
      return { valid: true };
    }
    const domStructure = this.buildDomStructureForDebug(editableField);
    const slateStructure = JSON.stringify(slateValue, null, 2).substring(0, 500);
    return {
      valid: false,
      error: !anchorValid ? `Anchor path [${anchor.path.join(", ")}] not found in Slate` : `Focus path [${focus.path.join(", ")}] not found in Slate`,
      domStructure,
      slateStructure
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
    const indent = "  ".repeat(depth);
    let result = "";
    for (const child of element.childNodes) {
      if (child.nodeType === Node.TEXT_NODE) {
        const text = child.textContent.substring(0, 30);
        result += `${indent}TEXT: "${text}"${child.textContent.length > 30 ? "..." : ""}
`;
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        const tag = child.tagName.toLowerCase();
        const nodeId = child.getAttribute("data-node-id");
        const nodeIdAttr = nodeId ? ` data-node-id="${nodeId}"` : "";
        result += `${indent}<${tag}${nodeIdAttr}>
`;
        if (depth < 3) {
          result += this.buildDomStructureForDebug(child, depth + 1);
        }
      } else if (child.nodeType === Node.COMMENT_NODE) {
        result += `${indent}<!-- comment -->
`;
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
    let textNode = node;
    let textOffset = offset;
    if (node.nodeType === Node.ELEMENT_NODE) {
      if (offset === 0) {
        textNode = node.firstChild;
        textOffset = 0;
      } else {
        const childNode = node.childNodes[offset - 1];
        if (childNode) {
          if (childNode.nodeType === Node.TEXT_NODE) {
            textNode = childNode;
            textOffset = childNode.textContent.length;
          } else if (childNode.nodeType === Node.ELEMENT_NODE) {
            textNode = this.getLastTextNode(childNode);
            textOffset = textNode ? textNode.textContent.length : 0;
          }
        } else {
          textNode = node.firstChild;
          textOffset = 0;
        }
      }
    }
    if (!textNode && node.nodeType === Node.ELEMENT_NODE) {
      const elementPath = this.getElementPath(node);
      if (elementPath) {
        return { path: [...elementPath, 0], offset: 0 };
      }
      return null;
    }
    let path = this.getNodePath(textNode);
    if (!path) {
      const isEndPosition = offset > 0;
      const validPos = this.getValidPositionForWhitespace(textNode, isEndPosition);
      if (validPos) {
        textNode = validPos.textNode;
        textOffset = validPos.offset;
        path = this.getNodePath(textNode);
      }
      if (!path) {
        return null;
      }
    }
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
    let startNode = null;
    let startAtEnd = false;
    const siblings = Array.from(parent.childNodes);
    const nodeIndex = siblings.indexOf(textNode);
    for (let i = nodeIndex - 1; i >= 0; i--) {
      const sib = siblings[i];
      if (sib.nodeType === Node.ELEMENT_NODE && sib.hasAttribute("data-node-id") && isValidNodeId(sib.getAttribute("data-node-id"))) {
        startNode = sib;
        startAtEnd = true;
        break;
      }
    }
    if (!startNode && parent.hasAttribute?.("data-node-id") && isValidNodeId(parent.getAttribute("data-node-id"))) {
      startNode = parent;
      startAtEnd = false;
    }
    const range = document.createRange();
    if (startNode && startAtEnd) {
      range.setStartAfter(startNode);
    } else if (startNode) {
      range.setStart(startNode, 0);
    } else {
      range.setStart(parent, 0);
    }
    range.setEnd(textNode, domOffset);
    return this.stripZeroWidthSpaces(range.toString()).length;
  }
  /**
   * Helper to find the last text node within an element
   */
  getLastTextNode(element) {
    if (element.nodeType === Node.TEXT_NODE) {
      return element;
    }
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
    if (node.nodeType === Node.ELEMENT_NODE && node.hasAttribute("data-node-id")) {
      const nodeId = node.getAttribute("data-node-id");
      if (isValidNodeId(nodeId)) {
        const parts = nodeId.split(".");
        return parseInt(parts[parts.length - 1], 10);
      }
    }
    const siblings = Array.from(parent.childNodes);
    const nodeIndex = siblings.indexOf(node);
    for (let i = nodeIndex - 1; i >= 0; i--) {
      const sib = siblings[i];
      if (sib.nodeType === Node.ELEMENT_NODE && sib.hasAttribute("data-node-id")) {
        const nodeId = sib.getAttribute("data-node-id");
        if (!isValidNodeId(nodeId)) continue;
        const parts = nodeId.split(".");
        return parseInt(parts[parts.length - 1], 10) + 1;
      }
    }
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
    let current = element;
    while (current && current.nodeType === Node.ELEMENT_NODE) {
      if (current.hasAttribute("data-node-id") && isValidNodeId(current.getAttribute("data-node-id"))) {
        const nodeId = current.getAttribute("data-node-id");
        const parts = nodeId.split(".").map((p) => parseInt(p, 10));
        log("getElementPath: Found node-id", nodeId, "-> path:", parts);
        return parts;
      }
      if (current.hasAttribute("data-edit-text")) {
        log("getElementPath: Reached container, returning [0]");
        return [0];
      }
      current = current.parentElement;
    }
    console.warn("[HYDRA] getElementPath: Could not find path for element");
    return null;
  }
  getNodePath(node) {
    const path = [];
    let current = node;
    const INLINE_WRAPPER_ELEMENTS = [
      "SPAN",
      "STRONG",
      "EM",
      "B",
      "I",
      "U",
      "S",
      "CODE",
      "A",
      "SUB",
      "SUP",
      "MARK"
    ];
    const isInlineElement = (el) => {
      if (typeof window !== "undefined" && window.getComputedStyle) {
        const display = window.getComputedStyle(el).display;
        if (display && display !== "") {
          return display === "inline" || display === "inline-block";
        }
      }
      return INLINE_WRAPPER_ELEMENTS.includes(el.nodeName);
    };
    if (node.nodeType === Node.TEXT_NODE) {
      const parent = node.parentNode;
      const parentNodeId = parent.hasAttribute?.("data-node-id") ? parent.getAttribute("data-node-id") : null;
      const hasValidNodeId = isValidNodeId(parentNodeId);
      if (hasValidNodeId && parent.nodeName !== "P" && parent.nodeName !== "DIV" && !parent.hasAttribute?.("data-edit-text")) {
        const parts = parentNodeId.split(".").map((p) => parseInt(p, 10));
        const textIndex = this.getSlateIndexAmongSiblings(node, parent);
        path.push(...parts, textIndex);
        return path;
      } else {
        const isWrapper = isInlineElement(parent) && !parent.hasAttribute?.("data-edit-text");
        if (isWrapper) {
          current = parent;
        } else {
          const slateIndex = this.getSlateIndexAmongSiblings(node, parent);
          path.push(slateIndex);
          current = parent;
        }
      }
    }
    let depth = 0;
    let foundContainer = false;
    let foundNodeIdInWalk = false;
    while (current) {
      const hasEditableField = current.hasAttribute?.("data-edit-text");
      const hasSlateEditor = current.hasAttribute?.("data-slate-editor");
      if (hasEditableField || hasSlateEditor) {
        foundContainer = true;
      }
      const nodeId = current.hasAttribute?.("data-node-id") ? current.getAttribute("data-node-id") : null;
      const hasValidNodeId = isValidNodeId(nodeId);
      if (hasValidNodeId) {
        foundNodeIdInWalk = true;
        const parts = nodeId.split(".").map((p) => parseInt(p, 10));
        for (let i = parts.length - 1; i >= 0; i--) {
          path.unshift(parts[i]);
        }
        break;
      }
      if (hasEditableField || hasSlateEditor) {
        break;
      }
      const parent = current.parentNode;
      if (parent && current.nodeType === Node.ELEMENT_NODE && INLINE_WRAPPER_ELEMENTS.includes(current.nodeName)) {
        const slateIndex = this.getSlateIndexAmongSiblings(current, parent);
        path.unshift(slateIndex);
      }
      current = parent;
      depth++;
    }
    if (!foundContainer && current) {
      let checkNode = current.parentNode;
      while (checkNode) {
        if (checkNode.hasAttribute?.("data-edit-text") || checkNode.hasAttribute?.("data-slate-editor")) {
          foundContainer = true;
          break;
        }
        checkNode = checkNode.parentNode;
      }
    }
    if (!current || !foundContainer) {
      console.warn("[HYDRA] getNodePath - no container found, returning null");
      return null;
    }
    if (!foundNodeIdInWalk) {
      let container = node;
      while (container && !container.hasAttribute?.("data-edit-text")) {
        container = container.parentNode;
      }
      const blockElement = container?.closest?.("[data-block-uid]");
      const blockUid = blockElement?.getAttribute("data-block-uid") || null;
      const fieldName = container?.getAttribute?.("data-edit-text") || null;
      if (blockUid && this.isBlockReadonly(blockUid)) {
        return null;
      }
      if (container && container.getAttribute("contenteditable") !== "true") {
        return null;
      }
      const fieldType = this.getFieldType(blockUid, fieldName);
      if (fieldType && !this.fieldTypeIsSlate(fieldType)) {
        return null;
      }
      if (container?.querySelector("[data-node-id]")) {
        return null;
      }
      const domPath = [];
      let walkNode = node;
      while (walkNode && walkNode !== current?.parentNode) {
        if (walkNode.nodeType === Node.ELEMENT_NODE) {
          const tag = walkNode.tagName.toLowerCase();
          const nodeId = walkNode.getAttribute?.("data-node-id");
          const classes = walkNode.className ? `.${walkNode.className.split(" ").join(".")}` : "";
          if (nodeId) {
            domPath.unshift(`<${tag}${classes} data-node-id="${nodeId}">`);
          } else {
            domPath.unshift(`<${tag}${classes}> \u26A0\uFE0F MISSING data-node-id`);
          }
        } else if (walkNode.nodeType === Node.TEXT_NODE) {
          const text = walkNode.textContent?.slice(0, 30) || "";
          domPath.unshift(`"${text}${walkNode.textContent?.length > 30 ? "..." : ""}"`);
        }
        walkNode = walkNode.parentNode;
      }
      const containerHtml = container?.innerHTML?.slice(0, 200) || "N/A";
      const fieldTypeDesc = fieldType ? `"${fieldType}" (registered but no data-node-id rendered)` : 'undefined \u2014 field not registered in blockSchema.properties; if this is a Slate field, add it with widget: "slate"; if plain text, add type: "string"';
      const errorMsg = `Block: ${blockUid}, Field: ${fieldName}
Field type: ${fieldTypeDesc}

DOM path (text node \u2192 container):
` + domPath.map((p, i) => "  ".repeat(i) + p).join("\n") + "\n\nContainer HTML:\n" + containerHtml + (container?.innerHTML?.length > 200 ? "..." : "");
      console.error("[HYDRA] Selection sync failed - missing data-node-id\n\n" + errorMsg);
      if (!this._shownNodeIdWarning) {
        this._shownNodeIdWarning = true;
        this.showDeveloperWarning(
          "Hydra: Missing data-node-id attributes",
          "Selection sync disabled. Your frontend must render data-node-id on Slate elements.\n\n" + errorMsg + "\n\nSee browser console for details."
        );
      }
      return null;
    }
    if (path.length === 0) {
      console.warn("[HYDRA] getNodePath - empty path, defaulting to [0, 0]");
      return [0, 0];
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
  restoreContentEditableOnFields(blockElement, caller = "unknown") {
    if (this.editMode === "block") {
      log(`restoreContentEditableOnFields: skipped (editMode=block) caller=${caller}`);
      return;
    }
    const blockUid = blockElement.getAttribute("data-block-uid");
    if (blockUid && this.isBlockReadonly(blockUid)) {
      const editableFields2 = blockElement.querySelectorAll('[data-edit-text][contenteditable="true"]');
      editableFields2.forEach((field) => {
        field.removeAttribute("contenteditable");
      });
      log(`restoreContentEditableOnFields called from ${caller}: block ${blockUid} is readonly, removed contenteditable`);
      return;
    }
    const editableFields = [];
    if (blockUid) {
      this.collectBlockFields(
        blockElement,
        "data-edit-text",
        (el) => {
          editableFields.push(el);
        }
      );
    } else {
      if (blockElement.hasAttribute("data-edit-text")) {
        editableFields.push(blockElement);
      }
      blockElement.querySelectorAll("[data-edit-text]").forEach((el) => {
        editableFields.push(el);
      });
    }
    log(`restoreContentEditableOnFields called from ${caller}: found ${editableFields.length} fields for block ${blockUid}`);
    editableFields.forEach((field) => {
      const fieldPath = field.getAttribute("data-edit-text");
      const fieldType = this.getFieldType(blockUid, fieldPath);
      const wasEditable = field.getAttribute("contenteditable") === "true";
      if (this.fieldTypeIsTextEditable(fieldType)) {
        field.setAttribute("contenteditable", "true");
        const placeholder = this.getFieldPlaceholder(blockUid, fieldPath);
        if (placeholder) {
          field.setAttribute("data-placeholder", placeholder);
        }
        this.updateEmptyState(field);
        log(`  ${fieldPath}: ${wasEditable ? "already editable" : "SET editable"} (type: ${fieldType})${placeholder ? ` placeholder: "${placeholder}"` : ""}`);
        if (!field._hydraKeydownHandler) {
          field._hydraKeydownHandler = (e) => {
            this._handleFieldKeydown(e, blockUid, field);
          };
          field.addEventListener("keydown", field._hydraKeydownHandler);
        }
      } else {
        log(`  ${fieldPath}: skipped (type: ${fieldType})`);
      }
    });
    const allContentEditable = blockElement.querySelectorAll('[contenteditable="true"]');
    allContentEditable.forEach((el) => {
      const elBlock = el.closest("[data-block-uid]");
      if (elBlock !== blockElement) return;
      if (!el.hasAttribute("data-edit-text")) {
        el.removeAttribute("contenteditable");
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
    if (!options.skipContentEditable) {
      this.restoreContentEditableOnFields(fieldElement, caller);
    }
    if (!options.skipObservers) {
      this.observeBlockTextChanges(fieldElement);
    }
    const fieldType = this.getFieldType(blockUid, fieldName);
    if (!this.fieldTypeIsTextEditable(fieldType)) {
      return;
    }
    const isAlreadyFocused = document.activeElement === fieldElement;
    log("activateEditableField focus check:", { isAlreadyFocused, activeElement: document.activeElement?.tagName });
    if (!isAlreadyFocused) {
      fieldElement.focus({ preventScroll: options.preventScroll });
      log(`activateEditableField: focused field`);
    }
    fieldElement.removeAttribute("data-empty");
    if (!fieldElement._placeholderBlurHandler) {
      fieldElement._placeholderBlurHandler = () => this.updateEmptyState(fieldElement);
      fieldElement.addEventListener("blur", fieldElement._placeholderBlurHandler);
    }
    if (options.wasAlreadyEditable && isAlreadyFocused) {
      requestAnimationFrame(() => {
        const selection = window.getSelection();
        const anchorNode = selection?.anchorNode;
        const anchorNeedsCorrection = anchorNode && this.isOnInvalidWhitespace(anchorNode);
        log("activateEditableField: deferred check -", {
          anchorNodeName: anchorNode?.nodeName,
          anchorOffset: selection?.anchorOffset,
          needsCorrection: anchorNeedsCorrection
        });
        if (anchorNeedsCorrection) {
          log("activateEditableField: already focused but cursor on invalid whitespace, correcting");
          this.correctInvalidWhitespaceSelection();
        } else {
          log("activateEditableField: field already editable and focused, browser positioning OK");
        }
      });
      this.lastClickPosition = null;
      return;
    }
    if (!this.lastClickPosition) {
      const selection = window.getSelection();
      const selectionInfo = selection?.rangeCount ? {
        rangeCount: selection.rangeCount,
        anchorNode: selection.anchorNode?.nodeName,
        anchorOffset: selection.anchorOffset,
        anchorNodeId: selection.anchorNode?.parentElement?.getAttribute?.("data-node-id") || selection.anchorNode?.getAttribute?.("data-node-id")
      } : { noSelection: true };
      log("activateEditableField: no lastClickPosition, selection state:", selectionInfo);
      const corrected = this.correctInvalidWhitespaceSelection();
      log("activateEditableField: correction result:", corrected);
      return;
    }
    const currentRect = fieldElement.getBoundingClientRect();
    const clientX = currentRect.left + this.lastClickPosition.relativeX;
    const clientY = currentRect.top + this.lastClickPosition.relativeY;
    log("activateEditableField: positioning cursor at click location:", {
      relativeX: this.lastClickPosition.relativeX,
      relativeY: this.lastClickPosition.relativeY,
      clientX,
      clientY
    });
    if (options.saveClickPosition) {
      this.savedClickPosition = {
        relativeX: this.lastClickPosition.relativeX,
        relativeY: this.lastClickPosition.relativeY,
        editableField: this.lastClickPosition.editableField
      };
    }
    const currentSelection = window.getSelection();
    const hasNonCollapsedSelection = currentSelection && currentSelection.rangeCount > 0 && !currentSelection.getRangeAt(0).collapsed;
    if (hasNonCollapsedSelection) {
      log("activateEditableField: skipping cursor positioning - non-collapsed selection exists");
    } else {
      const range = document.caretRangeFromPoint(clientX, clientY);
      if (range) {
        log("activateEditableField: caretRangeFromPoint result:", {
          startContainer: range.startContainer.nodeName,
          startOffset: range.startOffset,
          isOnInvalid: this.isOnInvalidWhitespace(range.startContainer)
        });
        const validPos = this.getValidatedPosition(range.startContainer, range.startOffset);
        log("activateEditableField: getValidatedPosition result:", {
          nodeName: validPos.node?.nodeName,
          offset: validPos.offset,
          nodeId: validPos.node?.parentElement?.getAttribute?.("data-node-id") || validPos.node?.getAttribute?.("data-node-id")
        });
        const finalRange = document.createRange();
        finalRange.setStart(validPos.node, validPos.offset);
        finalRange.collapse(true);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(finalRange);
        log("activateEditableField: cursor positioned at offset:", validPos.offset);
      }
    }
    this.lastClickPosition = null;
  }
  /**
   * Ensure all interactive elements have minimum size so users can click/select them.
   * Called after FORM_DATA to handle newly added blocks that haven't been selected yet.
   * Only sets min dimensions on elements that have zero width or height (respects existing styling).
   */
  ensureElementsHaveMinSize() {
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
    };
    document.querySelectorAll("[data-edit-text]").forEach((el) => {
      ensureSize(el, "auto", "1.5em");
    });
    document.querySelectorAll("[data-edit-media]").forEach((el) => {
      ensureSize(el, "100px", "100px");
    });
    document.querySelectorAll("[data-block-uid]").forEach((el) => {
      ensureSize(el, "auto", "2em");
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
    return text.replace(/[\uFEFF\u200B]/g, "").replace(/\u00A0/g, " ");
  }
  /**
   * Clean HTML content for clipboard - removes internal data attributes and ZWS/NBSP.
   * Only strips ZWS/NBSP from text within editable fields, preserving other content.
   *
   * @param {DocumentFragment|HTMLElement} fragment - DOM fragment or element to clean
   * @returns {string} - Cleaned HTML string
   */
  cleanHtmlForClipboard(fragment) {
    const tempDiv = document.createElement("div");
    tempDiv.appendChild(fragment.cloneNode(true));
    const editableFields = tempDiv.querySelectorAll("[data-edit-text]");
    editableFields.forEach((field) => {
      const walker = document.createTreeWalker(field, NodeFilter.SHOW_TEXT);
      let node;
      while (node = walker.nextNode()) {
        node.textContent = node.textContent.replace(/[\uFEFF\u200B]/g, "").replace(/\u00A0/g, " ");
      }
    });
    const internalAttrs = [
      "data-node-id",
      "data-field-name",
      "data-slate-node",
      "data-slate-leaf",
      "data-slate-string",
      "data-block-uid",
      "data-edit-text"
    ];
    tempDiv.querySelectorAll("*").forEach((el) => {
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
    let cleanText = this.stripZeroWidthSpaces(selection.toString());
    cleanText = cleanText.replace(/\u00A0/g, " ");
    const cleanHtml = this.cleanHtmlForClipboard(range.cloneContents());
    log("Copy event - cleaning clipboard");
    e.preventDefault();
    e.clipboardData.setData("text/plain", cleanText);
    e.clipboardData.setData("text/html", cleanHtml);
  }
  /**
   * Handle cut — copy cleaned selection to clipboard, then delete via transform.
   * Single function called from both normal keydown handler and buffered replay.
   */
  _doCut(blockUid) {
    document.execCommand("copy");
    this.sendTransformRequest(blockUid, "delete", {});
  }
  /**
   * Handle paste — send paste transform with HTML content.
   * Single function called from both native paste event handler and buffered replay.
   */
  _doPaste(blockUid, html) {
    this.sendTransformRequest(blockUid, "paste", { html });
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
      null
    );
    const nodesToUpdate = [];
    let node;
    while (node = walker.nextNode()) {
      const text = node.textContent;
      if (text && text.length > 1 && /[\uFEFF\u200B]/.test(text)) {
        nodesToUpdate.push(node);
      }
    }
    if (nodesToUpdate.length === 0) {
      return;
    }
    for (const textNode of nodesToUpdate) {
      const newText = textNode.textContent.replace(/[\uFEFF\u200B]/g, "");
      if (newText !== textNode.textContent) {
        log("stripZeroWidthSpacesFromDOM: Stripping ZWS from:", JSON.stringify(textNode.textContent), "\u2192", JSON.stringify(newText));
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
    const doAfterContentRender = () => {
      const elapsed = this._renderStartTime ? (performance.now() - this._renderStartTime).toFixed(0) : "?";
      log("doAfterContentRender START +" + elapsed + "ms");
      if (this.selectedBlockUid) {
        const blockElement = this.queryBlockElement(this.selectedBlockUid);
        if (blockElement) {
          this.makeBlockContentEditable(blockElement);
          const editableFields = this.getEditableFields(blockElement);
          const isSidebarEdit = !transformedSelection;
          const blockElements = [...this.getAllBlockElements(this.selectedBlockUid)];
          this.observeBlockResize(blockElements, this.selectedBlockUid, editableFields, isSidebarEdit);
          const newBlockRect = blockElement.getBoundingClientRect();
          const newMediaFields = this.getMediaFields(blockElement);
          const blockRectChanged = !this.lastBlockRect || Math.abs(newBlockRect.top - this.lastBlockRect.top) > 1 || Math.abs(newBlockRect.left - this.lastBlockRect.left) > 1 || Math.abs(newBlockRect.width - this.lastBlockRect.width) > 1 || Math.abs(newBlockRect.height - this.lastBlockRect.height) > 1;
          let mediaFieldsChanged = false;
          const newFieldNames = Object.keys(newMediaFields);
          const lastFieldNames = Object.keys(this.lastMediaFields || {});
          if (newFieldNames.length !== lastFieldNames.length) {
            mediaFieldsChanged = true;
          } else {
            for (const fieldName of newFieldNames) {
              const newRect = newMediaFields[fieldName]?.rect;
              const lastRect = this.lastMediaFields?.[fieldName]?.rect;
              if (!newRect || !lastRect || Math.abs(newRect.top - lastRect.top) > 1 || Math.abs(newRect.left - lastRect.left) > 1 || Math.abs(newRect.width - lastRect.width) > 1 || Math.abs(newRect.height - lastRect.height) > 1) {
                mediaFieldsChanged = true;
                break;
              }
            }
          }
          log("afterContentRender check:", {
            blockRectChanged,
            mediaFieldsChanged,
            newBlockRect: { top: newBlockRect.top, height: newBlockRect.height },
            newMediaFields,
            lastMediaFields: this.lastMediaFields
          });
          if (transformedSelection || blockRectChanged || mediaFieldsChanged) {
            log("afterContentRender sending BLOCK_SELECTED with mediaFields:", newMediaFields);
            this.sendBlockSelected("afterContentRender", blockElement, {
              selection: transformedSelection || void 0
            });
            this.lastBlockRect = { top: newBlockRect.top, left: newBlockRect.left, width: newBlockRect.width, height: newBlockRect.height };
            this.lastMediaFields = JSON.parse(JSON.stringify(newMediaFields));
          }
        }
      }
      const focusLost = this.focusedFieldName && this._iframeFocused && (!document.activeElement || document.activeElement === document.body || document.activeElement === document.documentElement);
      const skipFocus = !transformedSelection && !focusLost;
      if (transformedSelection) {
        this.savedClickPosition = null;
      }
      const blockUidToProcess = needsBlockSwitch ? adminSelectedBlockUid : this.selectedBlockUid;
      const blockHandler = needsBlockSwitch ? (el) => {
        log("Selecting new block from afterContentRender:", blockUidToProcess);
        this.selectBlock(el);
      } : (el) => this.updateBlockUIAfterFormData(el, skipFocus);
      if (blockUidToProcess) {
        const blockElement = this.queryBlockElement(blockUidToProcess);
        this.ensureElementsHaveMinSize();
        if (blockElement && !this.isElementHidden(blockElement)) {
          blockHandler(blockElement);
        } else if (needsBlockSwitch) {
          log("afterContentRender: block not visible, skipping select:", blockUidToProcess);
        }
      }
      let selectionRestored = true;
      if (transformedSelection) {
        try {
          selectionRestored = this.restoreSlateSelection(transformedSelection, this.formData);
          const sel = document.getSelection();
          log(
            "restoreSlateSelection result:",
            selectionRestored,
            "selection:",
            sel?.toString()?.substring(0, 30),
            "collapsed:",
            sel?.isCollapsed,
            "anchorNode:",
            sel?.anchorNode?.nodeName,
            "anchorOffset:",
            sel?.anchorOffset,
            "focusOffset:",
            sel?.focusOffset
          );
          const trackTimer = setInterval(() => {
            const s = document.getSelection();
            const text = s?.toString() || "";
            if (text !== this._lastTrackedSel) {
              log(
                "SELECTION SHIFTED to:",
                JSON.stringify(text?.substring(0, 30)),
                "collapsed:",
                s?.isCollapsed,
                "anchorNode:",
                s?.anchorNode?.nodeName,
                "+" + (performance.now() - this._renderStartTime).toFixed(0) + "ms"
              );
              this._lastTrackedSel = text;
            }
          }, 16);
          setTimeout(() => clearInterval(trackTimer), 2e3);
          this._lastTrackedSel = sel?.toString() || "";
        } catch (e) {
          console.error("[HYDRA] Error restoring selection:", e);
          selectionRestored = false;
        }
        if (!selectionRestored) {
          log("Selection restore failed \u2014 dropping", this.eventBuffer.length, "buffered events to avoid wrong-selection replay");
          this.eventBuffer = [];
        }
        setTimeout(() => {
          this.expectedSelectionFromAdmin = null;
        }, 100);
      }
      if (needsBlockSwitch && adminSelectedBlockUid) {
        if (this.pendingTransform) {
          log("Redirecting buffer from", this.pendingTransform.blockId, "to new block:", adminSelectedBlockUid);
          this.pendingTransform.blockId = adminSelectedBlockUid;
        }
        if (this.eventBuffer.length > 0) {
          log("Redirecting eventBuffer to new block:", adminSelectedBlockUid);
        }
      }
      if (this._reRenderBlocking) {
        this._reRenderBlocking = false;
        if (!transformedSelection && this._preRenderSelection && this._iframeFocused) {
          log("Restoring pre-render selection for buffer replay:", JSON.stringify(this._preRenderSelection));
          try {
            this.restoreSlateSelection(this._preRenderSelection, this.formData);
          } catch (e) {
            log("Pre-render selection restore failed:", e.message);
          }
        }
        this._preRenderSelection = null;
        if (this.eventBuffer.length > 0) {
          log("Replaying", this.eventBuffer.length, "re-render buffered events");
          this.pendingBufferReplay = {
            blockId: this.selectedBlockUid,
            buffer: [...this.eventBuffer]
          };
          this.eventBuffer = [];
          this.replayBufferedEvents();
        }
        if (!this.pendingTransform) {
          this.blockedBlockId = null;
          this._setPointerBlocking(false);
        }
      }
      this.replayBufferAndUnblock();
      if (this._formDataQueue) {
        const queued = this._formDataQueue;
        this._formDataQueue = null;
        log("Processing queued FORM_DATA after render complete");
        window.postMessage(queued, window.location.origin);
      } else if (this._flushBufferQueue) {
        const queuedFlush = this._flushBufferQueue;
        this._flushBufferQueue = null;
        log("Processing queued FLUSH_BUFFER after render complete");
        this._processFlushBuffer(queuedFlush.requestId, queuedFlush.setBlocking);
      }
      if (this.selectedBlockUid) {
        const currentBlockEl = this.queryBlockElement(this.selectedBlockUid);
        if (currentBlockEl) {
          const editField = currentBlockEl.querySelector("[data-edit-text]") || currentBlockEl;
          this.observeBlockTextChanges(currentBlockEl);
        }
      }
      this._renderInProgress = false;
    };
    doAfterContentRender();
  }
  /**
   * Read the text content of a data-node-id element from the DOM.
   * Shared by handleTextChange (single node) and readSlateValueFromDOM (full field).
   */
  readNodeText(nodeEl) {
    return this.stripZeroWidthSpaces(nodeEl.innerText)?.replace(/\n$/, "");
  }
  /**
   * Build a map of nodeId → metadata from a Slate JSON value.
   * Metadata is everything except text, children, and nodeId — e.g.
   * type, data, bold, italic, href, etc. Used by readSlateValueFromDOM
   * to preserve formatting when reconstructing the value from the DOM.
   *
   * Also tracks which nodeIds are inline (appeared alongside text children
   * in the existing value) in map._inlineNodeIds. This drives Slate
   * normalization — inline nodes need empty text nodes around them.
   */
  buildNodeMetadataMap(slateValue, map = {}) {
    if (!map._inlineNodeIds) map._inlineNodeIds = /* @__PURE__ */ new Set();
    if (Array.isArray(slateValue)) {
      for (const item of slateValue) this.buildNodeMetadataMap(item, map);
    } else if (slateValue && typeof slateValue === "object") {
      if (slateValue.nodeId) {
        const meta = {};
        for (const key of Object.keys(slateValue)) {
          if (key !== "text" && key !== "children" && key !== "nodeId") {
            meta[key] = slateValue[key];
          }
        }
        map[slateValue.nodeId] = meta;
      }
      if (slateValue.children) {
        this.buildNodeMetadataMap(slateValue.children, map);
        const hasText = slateValue.children.some((c) => c.hasOwnProperty("text"));
        if (hasText) {
          for (const child of slateValue.children) {
            if (child.nodeId) {
              map._inlineNodeIds.add(child.nodeId);
            }
          }
        }
      }
    }
    return map;
  }
  /**
   * Collect all attribute values from an element and its descendants.
   * Used by domNodeToSlate in matchMetadataFromDom mode to check which
   * formData metadata values are visible in the rendered DOM.
   * @param {HTMLElement} el
   * @returns {Set<string>} all attribute values found
   */
  _collectDomAttributeValues(el) {
    const values = /* @__PURE__ */ new Set();
    const walk = (node) => {
      if (!(node instanceof HTMLElement)) return;
      for (const attr of node.attributes) {
        if (attr.value) values.add(attr.value);
      }
      for (const child of node.children) walk(child);
    };
    walk(el);
    return values;
  }
  /**
   * Filter metadata to only include values that appear in the DOM.
   * Walks the metadata object and keeps only leaf values (strings, numbers,
   * booleans) that match an attribute value found in the DOM element.
   * @param {Object} fullMeta - metadata from formData metadataMap
   * @param {Set<string>} domValues - attribute values from _collectDomAttributeValues
   * @returns {Object} filtered metadata with only DOM-visible values
   */
  _filterMetadataByDom(fullMeta, domValues) {
    const result = {};
    for (const [key, val] of Object.entries(fullMeta)) {
      if (val && typeof val === "object" && !Array.isArray(val)) {
        const filtered = this._filterMetadataByDom(val, domValues);
        if (Object.keys(filtered).length > 0) result[key] = filtered;
      } else if (typeof val === "string" && domValues.has(val)) {
        result[key] = val;
      } else if ((typeof val === "number" || typeof val === "boolean") && domValues.has(String(val))) {
        result[key] = val;
      }
    }
    return result;
  }
  /**
   * Convert a DOM element with data-node-id into a Slate JSON node.
   * Text nodes become {text: "..."}, elements with data-node-id recurse.
   *
   * @param {HTMLElement} el - Element with data-node-id
   * @param {Object} metadataMap - nodeId → metadata from formData
   * @param {boolean} matchMetadataFromDom - When true, only include metadata
   *   values that are visible in the DOM (as attribute values). Used by
   *   isContentReady to detect rendered changes like link URL updates.
   *   When false (default), include all metadata from metadataMap.
   */
  domNodeToSlate(el, metadataMap, matchMetadataFromDom = false) {
    const nodeId = el.getAttribute("data-node-id");
    const fullMeta = nodeId && metadataMap[nodeId] || {};
    let metadata;
    if (matchMetadataFromDom) {
      const domValues = this._collectDomAttributeValues(el);
      metadata = this._filterMetadataByDom(fullMeta, domValues);
      if (fullMeta.type) metadata.type = fullMeta.type;
    } else {
      metadata = fullMeta;
    }
    const children = [];
    for (const child of el.childNodes) {
      if (child.nodeType === Node.TEXT_NODE) {
        const raw = child.textContent || "";
        const text = this.stripZeroWidthSpaces(raw);
        children.push({ text });
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        const childNodeId = child.getAttribute("data-node-id");
        if (childNodeId && isValidNodeId(childNodeId)) {
          children.push(this.domNodeToSlate(child, metadataMap, matchMetadataFromDom));
        } else {
          const text = this.stripZeroWidthSpaces(child.textContent || "");
          children.push({ text });
        }
      }
    }
    const merged = [];
    for (const child of children) {
      const prev = merged[merged.length - 1];
      if (prev && prev.hasOwnProperty("text") && child.hasOwnProperty("text") && !child.type) {
        prev.text += child.text;
      } else {
        merged.push(child);
      }
    }
    const inlineNodeIds = metadataMap._inlineNodeIds || /* @__PURE__ */ new Set();
    const hasInlineChild = merged.some((c) => c.nodeId && inlineNodeIds.has(c.nodeId));
    if (!hasInlineChild) {
      for (let i = merged.length - 1; i >= 0; i--) {
        if (merged[i].hasOwnProperty("text") && merged[i].text.trim() === "") {
          merged.splice(i, 1);
        }
      }
    }
    if (merged.length === 0) {
      merged.push({ text: "" });
    }
    const isInline = (child) => child.nodeId && inlineNodeIds.has(child.nodeId);
    const hasInline = merged.some(isInline);
    if (hasInline) {
      const normalized = [];
      for (let i = 0; i < merged.length; i++) {
        const child = merged[i];
        if (isInline(child)) {
          const prev = normalized[normalized.length - 1];
          if (!prev || !prev.hasOwnProperty("text")) {
            normalized.push({ text: "" });
          }
        }
        normalized.push(child);
        if (isInline(child)) {
          const next = merged[i + 1];
          if (!next || !next.hasOwnProperty("text")) {
            normalized.push({ text: "" });
          }
        }
      }
      return { ...metadata, children: normalized, nodeId };
    }
    return { ...metadata, children: merged, nodeId };
  }
  /**
   * Read an editable field's current DOM content as a fresh Slate value.
   * Walks the DOM tree and builds the value from scratch using nodeIds
   * for structure and a metadata map for formatting/type info.
   *
   * This is the single source of truth for DOM → Slate conversion.
   * Used by both handleTextChange and waitForContentReady.
   */
  readSlateValueFromDOM(fieldEl, existingValue, { matchMetadataFromDom = false } = {}) {
    const metadataMap = this.buildNodeMetadataMap(existingValue);
    const fieldNodeId = fieldEl.getAttribute("data-node-id");
    if (fieldNodeId && isValidNodeId(fieldNodeId)) {
      return [this.domNodeToSlate(fieldEl, metadataMap, matchMetadataFromDom)];
    }
    const topNodes = [];
    for (const child of fieldEl.childNodes) {
      if (child.nodeType === Node.ELEMENT_NODE) {
        const nodeId = child.getAttribute("data-node-id");
        if (nodeId && isValidNodeId(nodeId)) {
          topNodes.push(this.domNodeToSlate(child, metadataMap, matchMetadataFromDom));
        }
      }
    }
    return topNodes;
  }
  /**
   * Wait for the rendered DOM to match this.formData for a block's editable fields.
   * Reads the full contenteditable back via readSlateValueFromDOM and compares
   * against the formData value. Returns immediately when content matches (zero
   * cost on mock); on Nuxt/Vue waits for secondary renders to complete.
   */
  /**
   * Synchronous check: does the DOM content match formData right now?
   */
  /**
   * Checks if the current and target blocks are ready in the DOM.
   * - Current block: if its data is in formData, check DOM content matches.
   *   If data is gone (block deleted), check element is gone from DOM.
   * - Target block (if switching): must exist in DOM with matching content.
   * Returns false if any block needs rendering.
   */
  /**
   * Pure readiness check — no side effects.
   *
   * A block is "ready" when it's visible in the viewport AND its rendered DOM
   * matches the formData (isContentReady). We cannot assume a block is rendered
   * but hidden — some implementations (carousels, tabs, lazy containers) may
   * not render a block's content at all until it is navigated to. "Not in DOM"
   * and "in DOM but not visible" are treated the same: not ready.
   *
   * @returns {{ ready: boolean, targetVisible: boolean }} ready=true means all
   *   blocks are ready to proceed. targetVisible indicates whether the target
   *   block (if switching) is visible — used by the poller to decide whether
   *   to navigate or give up on timeout.
   */
  _areBlocksReady(blockId, blockEl, afterRenderOptions = {}) {
    let currentReady = true;
    if (blockId) {
      if (!blockEl) {
        currentReady = !this.getBlockData(blockId);
      } else if (this.getBlockData(blockId)) {
        currentReady = this.isContentReady(blockEl);
      } else {
        currentReady = false;
      }
    }
    const newBlockId = afterRenderOptions.adminSelectedBlockUid;
    if (!newBlockId || newBlockId === blockId) {
      return { ready: currentReady, targetVisible: true };
    }
    const newEl = this.queryBlockElement(newBlockId);
    const targetVisible = newEl && !this.isElementHidden(newEl);
    const targetReady = targetVisible && this.isContentReady(newEl);
    return {
      ready: currentReady && targetReady,
      targetVisible: !!targetVisible
    };
  }
  isContentReady(blockElement) {
    const blockUid = blockElement.getAttribute("data-block-uid");
    const blockData = this.getBlockData(blockUid);
    if (!blockData) return true;
    const editableFields = this.getEditableFields(blockElement);
    for (const [fieldName, fieldType] of Object.entries(editableFields)) {
      const fieldEl = blockElement.querySelector(`[data-edit-text="${fieldName}"]`) || (blockElement.getAttribute("data-edit-text") === fieldName ? blockElement : null);
      if (!fieldEl) continue;
      if (this.fieldTypeIsSlate(fieldType)) {
        const slateValue = blockData[fieldName];
        if (!slateValue || !Array.isArray(slateValue)) continue;
        const domValue = this.readSlateValueFromDOM(fieldEl, slateValue, { matchMetadataFromDom: true });
        if (!this._deepEqual(domValue, slateValue)) {
          log("isContentReady MISMATCH:", blockUid, fieldName, "+" + (this._renderStartTime ? (performance.now() - this._renderStartTime).toFixed(0) : "?") + "ms");
          log("  DOM:", JSON.stringify(domValue)?.substring(0, 300));
          log("  EXP:", JSON.stringify(slateValue)?.substring(0, 300));
          log("  HTML:", fieldEl.innerHTML?.substring(0, 300));
          return false;
        }
      } else {
        const resolved = this.resolveFieldPath(fieldName, blockUid);
        const targetData = this.getBlockData(resolved.blockId);
        const expected = targetData?.[resolved.fieldName] ?? "";
        const domText = this.stripZeroWidthSpaces(fieldEl.innerText || "");
        if (domText !== String(expected)) return false;
      }
    }
    return true;
  }
  async waitForContentReady(blockElement, maxRetries = 20) {
    const blockUid = blockElement.getAttribute("data-block-uid");
    const blockData = this.getBlockData(blockUid);
    if (!blockData) return;
    const editableFields = this.getEditableFields(blockElement);
    for (const [fieldName, fieldType] of Object.entries(editableFields)) {
      if (!this.fieldTypeIsSlate(fieldType)) continue;
      const slateValue = blockData[fieldName];
      if (!slateValue || !Array.isArray(slateValue)) continue;
      const fieldEl = blockElement.querySelector(`[data-edit-text="${fieldName}"]`) || (blockElement.getAttribute("data-edit-text") === fieldName ? blockElement : null);
      if (!fieldEl) continue;
      for (let retry = 0; retry < maxRetries; retry++) {
        const domValue = this.readSlateValueFromDOM(fieldEl, slateValue);
        if (this._deepEqual(domValue, slateValue)) {
          log("waitForContentReady: MATCH on retry", retry, "innerHTML:", fieldEl.innerHTML?.substring(0, 200));
          break;
        }
        if (retry === 0) {
          log("waitForContentReady: content mismatch, waiting for render to complete. DOM:", fieldEl.innerHTML?.substring(0, 200), "expected:", JSON.stringify(slateValue).substring(0, 100));
        }
        await new Promise((r) => requestAnimationFrame(r));
      }
    }
  }
  /**
   * Marks empty blocks in the DOM with a data attribute for styling.
   * This allows hydra to style empty blocks without requiring the renderer
   * to add special attributes.
   */
  markEmptyBlocks() {
    const allBlocks = document.querySelectorAll("[data-block-uid]");
    allBlocks.forEach((blockElement) => {
      const blockUid = blockElement.getAttribute("data-block-uid");
      if (this.getBlockType(blockUid) === "empty") {
        blockElement.setAttribute("data-hydra-empty", "true");
      } else {
        blockElement.removeAttribute("data-hydra-empty");
      }
    });
  }
  /**
   * Blocks or unblocks pointer events on all editable text fields.
   * Uses a <style> element injected into <head> so it survives innerHTML
   * replacement by framework re-renders (unlike CSS classes on elements).
   * Called during re-render blocking and format-op blocking to prevent
   * user clicks from racing with restoreSlateSelection.
   */
  _setPointerBlocking(blocking) {
    if (!this._pointerBlockStyleEl) {
      this._pointerBlockStyleEl = document.createElement("style");
      this._pointerBlockStyleEl.type = "text/css";
      document.head.appendChild(this._pointerBlockStyleEl);
    }
    const newCSS = blocking ? "body { pointer-events: none !important; cursor: wait !important; }" : "";
    if (this._pointerBlockStyleEl.textContent !== newCSS) {
      this._pointerBlockStyleEl.textContent = newCSS;
    }
  }
  /**
   * Applies visual styling to readonly blocks.
   * Blocks where isBlockReadonly() returns true get the hydra-locked class.
   * This visually greys out:
   * - In normal mode: readonly template blocks
   * - In template edit mode: blocks outside the template being edited
   */
  applyReadonlyVisuals() {
    const readonlyUids = [];
    const allBlocks = document.querySelectorAll("[data-block-uid]");
    allBlocks.forEach((blockElement) => {
      const blockUid = blockElement.getAttribute("data-block-uid");
      const blockData = this.getBlockData(blockUid);
      if (isBlockReadonly(blockData, this.templateEditMode)) {
        readonlyUids.push(blockUid);
      }
    });
    if (!this._readonlyStyleEl) {
      this._readonlyStyleEl = document.createElement("style");
      this._readonlyStyleEl.type = "text/css";
      document.head.appendChild(this._readonlyStyleEl);
    }
    let newCSS = "";
    if (readonlyUids.length > 0) {
      const selector = readonlyUids.map((uid) => `[data-block-uid="${uid}"]`).join(", ");
      newCSS = `${selector} { filter: grayscale(0.5) opacity(0.6); }`;
    }
    if (this._readonlyStyleEl.textContent !== newCSS) {
      this._readonlyStyleEl.textContent = newCSS;
    }
  }
  /**
   * Apply placeholder attributes to all editable text fields in the document.
   * Sets data-placeholder (from schema) and data-empty (based on content) on
   * every [data-edit-text] element whose block has a resolvedBlockSchema.
   * Called from afterContentRender so placeholders survive framework re-renders.
   */
  applyPlaceholders() {
    const editableFields = document.querySelectorAll("[data-edit-text]");
    editableFields.forEach((field) => {
      const blockEl = field.closest("[data-block-uid]");
      const blockUid = blockEl ? blockEl.getAttribute("data-block-uid") : PAGE_BLOCK_UID;
      const fieldPath = field.getAttribute("data-edit-text");
      const placeholder = this.getFieldPlaceholder(blockUid, fieldPath);
      if (placeholder) {
        field.setAttribute("data-placeholder", placeholder);
      } else {
        field.removeAttribute("data-placeholder");
      }
      this.updateEmptyState(field);
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
    this.restoreContentEditableOnFields(blockElement, "FORM_DATA");
    const fieldType = this.focusedFieldName ? this.getFieldType(this.selectedBlockUid, this.focusedFieldName) : null;
    const hasSavedClickPosition = !!this.savedClickPosition;
    if (this.focusedFieldName && (!skipFocus || hasSavedClickPosition)) {
      const focusedField = this.getEditableFieldByName(blockElement, this.focusedFieldName);
      if (focusedField && this.fieldTypeIsTextEditable(fieldType)) {
        if (!skipFocus || hasSavedClickPosition) {
          focusedField.focus();
        }
        if (this.savedClickPosition) {
          const selection = window.getSelection();
          if (selection) {
            if (!selection.rangeCount || selection.isCollapsed) {
              const currentRect2 = focusedField.getBoundingClientRect();
              const clientX = currentRect2.left + this.savedClickPosition.relativeX;
              const clientY = currentRect2.top + this.savedClickPosition.relativeY;
              const range = document.caretRangeFromPoint(clientX, clientY);
              if (range) {
                selection.removeAllRanges();
                selection.addRange(range);
              }
            }
          }
          this.savedClickPosition = null;
        }
      }
    }
    let didScroll = false;
    const justDraggedThisBlock = this._justFinishedDragBlockId === this.selectedBlockUid;
    if (!this.elementIsVisibleInViewport(blockElement) && !justDraggedThisBlock) {
      log("updateBlockUIAfterFormData: scrolling to block", this.selectedBlockUid);
      this.scrollBlockIntoView(blockElement);
      didScroll = true;
    }
    const allElements = this.getAllBlockElements(this.selectedBlockUid);
    let currentRect = this.getBoundingBoxForElements(allElements);
    if (!currentRect) {
      const domRect = blockElement.getBoundingClientRect();
      currentRect = { top: domRect.top, left: domRect.left, width: domRect.width, height: domRect.height };
    }
    let shouldSendBlockSelected = !skipFocus || didScroll;
    if (skipFocus && !didScroll && this._lastBlockRect) {
      const topChanged = Math.abs(currentRect.top - this._lastBlockRect.top) > 1;
      const leftChanged = Math.abs(currentRect.left - this._lastBlockRect.left) > 1;
      if (topChanged || leftChanged) {
        log("Block position changed after re-render, updating toolbar");
        shouldSendBlockSelected = true;
      }
    }
    if (shouldSendBlockSelected) {
      this.sendBlockSelected("updateBlockUIAfterFormData", blockElement);
    }
    if (currentRect.width > 0 && currentRect.height > 0) {
      this._lastBlockRect = currentRect;
    }
    const editableFields = this.getEditableFields(blockElement);
    const blockElements = [...this.getAllBlockElements(this.selectedBlockUid)];
    this.observeBlockResize(blockElements, this.selectedBlockUid, editableFields, skipFocus);
  }
  /**
   * Selects a block and communicates the selection to the adminUI.
   *
   * @param {HTMLElement|string} blockElementOrUid - The block element or block UID to select.
   */
  /**
   * Select a block. The caller decides the editing intent via options.fieldToFocus:
   *   undefined → auto (focus first editable field, set contenteditable — text mode)
   *   null      → block mode (no contenteditable, no field focus)
   *   'value'   → focus specific field
   */
  selectBlock(blockElementOrUid, options = {}) {
    const opts = typeof options === "string" ? {} : options;
    const fieldToFocus = opts.fieldToFocus;
    const blockUidFromArg = typeof blockElementOrUid === "string" ? blockElementOrUid : null;
    const blockUid = blockUidFromArg || blockElementOrUid?.getAttribute?.("data-block-uid");
    if (!blockUid) return;
    const isTemplateInstance = this.blockPathMap?.[blockUid]?.isTemplateInstance;
    const blockElements = [...this.getAllBlockElements(blockUid)];
    const caller = new Error().stack?.split("\n")[2]?.trim() || "unknown";
    log("selectBlock called for:", blockUid, "from:", caller, "elements:", blockElements.length);
    if (blockElements.length === 0) return;
    const blockElement = blockElements[0];
    if (this._blockSelectorNavigating) {
      setTimeout(() => {
        if (this._blockSelectorNavigating) {
          log("selectBlock: navigation safety timeout for", blockUid);
          this._blockSelectorNavigating = false;
          if (this.selectedBlockUid === blockUid) {
            this.sendBlockSelected("navigationSettled", null, { blockUid });
          }
        }
      }, 1500);
    }
    const isSelectingSameBlock = this.selectedBlockUid === blockUid;
    this._isReselectingSameBlock = isSelectingSameBlock;
    if (!isSelectingSameBlock && blockElement && !this.elementIsVisibleInViewport(blockElement)) {
      this.scrollBlockIntoView(blockElement);
    }
    if (!isSelectingSameBlock) {
      this.flushPendingTextUpdates();
      this.eventBuffer = [];
    }
    const isBlockMode = this.editMode === "block";
    if (!isTemplateInstance && !isBlockMode) {
      this.isInlineEditing = true;
      this.restoreContentEditableOnFields(blockElement, "selectBlock");
      let valueField = blockElement.hasAttribute("data-edit-text") && blockElement.getAttribute("data-edit-text") === "value" ? blockElement : blockElement.querySelector('[data-edit-text="value"]');
      if (valueField) {
        this.makeBlockContentEditable(valueField);
      }
      if (fieldToFocus === "first" || fieldToFocus === "last" || typeof fieldToFocus === "string") {
        const cursorAt = opts.cursorAt || "start";
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            const currentElement = this.queryBlockElement(blockUid);
            if (!currentElement) return;
            let targetField;
            if (fieldToFocus === "last") {
              const fields = this.getOwnEditableFields(currentElement);
              targetField = fields[fields.length - 1] || null;
            } else if (fieldToFocus === "first") {
              targetField = this.getOwnFirstEditableField(currentElement);
            } else {
              targetField = currentElement.querySelector(`[data-edit-text="${fieldToFocus}"]`);
            }
            if (targetField && targetField.getAttribute("contenteditable") === "true") {
              targetField.focus();
              if (cursorAt === "end") {
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
    }
    if (isBlockMode) {
      this.focusedFieldName = null;
    }
    if (!isTemplateInstance) {
      const isReadonly = this.isBlockReadonly(blockUid);
      const hasEditableFields = !isReadonly && this.getOwnEditableFields(blockElement).length > 0;
      if (!hasEditableFields) {
        if (!blockElement.hasAttribute("tabindex")) {
          blockElement.setAttribute("tabindex", "-1");
        }
        blockElement.focus({ preventScroll: true });
      }
    }
    const prevBlockUid = this.prevSelectedBlock?.getAttribute("data-block-uid");
    if (this.prevSelectedBlock === null || prevBlockUid !== blockUid) {
      if (this.currentlySelectedBlock) {
        this.deselectBlock(
          this.currentlySelectedBlock?.getAttribute("data-block-uid"),
          blockUid
        );
      }
      this.currentlySelectedBlock = isTemplateInstance ? null : blockElement;
      this.prevSelectedBlock = isTemplateInstance ? null : blockElement;
      if (!this.clickOnBtn) {
        window.parent.postMessage(
          { type: "OPEN_SETTINGS", uid: blockUid },
          this.adminOrigin
        );
      } else {
        this.clickOnBtn = false;
      }
    }
    this.selectedBlockUid = blockUid;
    this.focusedFieldName = null;
    this.focusedLinkableField = null;
    this.focusedMediaField = null;
    this.lastBlockRect = null;
    this.lastMediaFields = null;
    if (!isTemplateInstance && this.lastClickPosition?.target) {
      const clickedElement = this.lastClickPosition.target;
      const clickedField = clickedElement.closest("[data-edit-text]");
      if (clickedField) {
        this.focusedFieldName = clickedField.getAttribute("data-edit-text");
        log("Detected focused field from click:", this.focusedFieldName);
      }
      this.focusedLinkableField = this.lastClickPosition.linkableField || null;
      this.focusedMediaField = this.lastClickPosition.mediaField || null;
      if (this.focusedLinkableField) {
        log("Detected focused linkable field from click:", this.focusedLinkableField);
      }
      if (this.focusedMediaField) {
        log("Detected focused media field from click:", this.focusedMediaField);
      }
    }
    if (!isTemplateInstance && !isBlockMode && !this.focusedFieldName && blockElement) {
      const firstEditableField = this.getOwnFirstEditableField(blockElement);
      if (firstEditableField) {
        this.focusedFieldName = firstEditableField.getAttribute("data-edit-text");
        log("Set focusedFieldName to first editable field:", this.focusedFieldName);
      } else {
        log("No editable fields found, focusedFieldName remains null");
      }
    }
    const isMultiElement = blockElements.length > 1;
    const rect = isMultiElement ? this.getBoundingBoxForElements(blockElements) : blockElement.getBoundingClientRect();
    const editableFields = isTemplateInstance ? {} : this.getEditableFields(blockElement);
    const linkableFields = isTemplateInstance ? {} : this.getLinkableFields(blockElement);
    const mediaFields = isTemplateInstance ? {} : this.getMediaFields(blockElement);
    const addDirection = this.getAddDirection(blockElement);
    log("Setting _pendingBlockSelected for:", blockUid, "_justFinishedDragBlockId:", this._justFinishedDragBlockId);
    this._pendingBlockSelected = {
      blockUid,
      rect: rect ? {
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height
      } : null,
      editableFields,
      // Map of fieldName -> fieldType from DOM
      linkableFields,
      // Map of fieldName -> true for URL/link fields
      mediaFields,
      // Map of fieldName -> true for image/media fields
      focusedFieldName: this.focusedFieldName,
      focusedLinkableField: this.focusedLinkableField,
      focusedMediaField: this.focusedMediaField,
      addDirection,
      // Direction for add button positioning
      isMultiElement
      // Signal that this is a multi-element selection
    };
    log("Block selected, sending UI messages:", {
      blockUid,
      focusedFieldName: this.focusedFieldName,
      focusedLinkableField: this.focusedLinkableField,
      focusedMediaField: this.focusedMediaField,
      editableFields,
      linkableFields,
      mediaFields
    });
    this.createDragHandle(blockElements);
    this.observeBlockResize(blockElements, blockUid, editableFields);
    if (!isTemplateInstance) {
      this.observeBlockTextChanges(blockElement);
    }
    {
      const isReadonly = this.isBlockReadonly(blockUid);
      const hasEditableFields = !isReadonly && this.getOwnEditableFields(blockElement).length > 0;
      const needsImmediateSend = isTemplateInstance || isBlockMode || !hasEditableFields;
      if (needsImmediateSend && this._pendingBlockSelected) {
        const pending = this._pendingBlockSelected;
        this._pendingBlockSelected = null;
        const src = isTemplateInstance ? "templateInstance" : isBlockMode ? "blockMode" : "nonEditableBlock";
        log(
          "Sending BLOCK_SELECTED immediately for:",
          pending.blockUid,
          `(${src})`,
          "mediaField:",
          pending.focusedMediaField,
          "hasEditable:",
          hasEditableFields,
          "isBlockMode:",
          isBlockMode
        );
        this.sendBlockSelected(src, blockElement, {
          blockUid: pending.blockUid,
          focusedFieldName: isBlockMode || !hasEditableFields ? null : pending.focusedFieldName,
          focusedLinkableField: pending.focusedLinkableField,
          focusedMediaField: pending.focusedMediaField
        });
        if (isTemplateInstance) return;
      }
    }
    if (!this.selectionChangeListener) {
      this.selectionChangeListener = () => {
        if (this._isCorrectingWhitespaceSelection) return;
        const selection = window.getSelection();
        const range = selection?.rangeCount > 0 ? selection.getRangeAt(0) : null;
        log("selectionchange fired:", {
          anchorOffset: selection?.anchorOffset,
          focusOffset: selection?.focusOffset,
          rangeStart: range?.startOffset,
          rangeEnd: range?.endOffset,
          collapsed: selection?.isCollapsed
        });
        if (selection && !selection.isCollapsed && range) {
          this._checkCrossBlockSelection(range);
        }
        if (selection && selection.rangeCount > 0) {
          this._isCorrectingWhitespaceSelection = true;
          const corrected = this.correctInvalidWhitespaceSelection();
          this._isCorrectingWhitespaceSelection = false;
          if (corrected) {
            return;
          }
          this.savedSelection = this.serializeSelection();
          if (this.expectedSelectionFromAdmin) {
            log("selectionchange: expectedSelectionFromAdmin set, suppressing");
            return;
          } else {
            log("selectionchange: no expectedSelectionFromAdmin, sending new selection");
          }
          if (this.selectedBlockUid) {
            this.bufferUpdate("selectionChange");
          }
        }
      };
      document.addEventListener("selectionchange", this.selectionChangeListener);
    }
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const currentBlockElement = this.queryBlockElement(this.selectedBlockUid);
        log("selectBlock focus handler:", { blockUid: this.selectedBlockUid, found: !!currentBlockElement });
        if (currentBlockElement) {
          if (this.needsFieldDetection) {
            this.detectFocusedFieldAndUpdateToolbar(this.selectedBlockUid);
            this.needsFieldDetection = false;
          }
          if (this.editMode === "block") {
            this.sendBlockSelected("blockMode", currentBlockElement, { focusedFieldName: null });
          } else if (this.editMode === "text") {
            const editableField = this.getOwnFirstEditableField(currentBlockElement);
            const wasAlreadyEditable = editableField?.getAttribute("contenteditable") === "true";
            this.restoreContentEditableOnFields(currentBlockElement, "selectBlock");
            let contentEditableField = this.focusedFieldName ? this.getEditableFieldByName(currentBlockElement, this.focusedFieldName) : currentBlockElement.querySelector('[contenteditable="true"]');
            if (contentEditableField) {
              const fieldBlockElement = contentEditableField.closest("[data-block-uid]");
              if (fieldBlockElement !== currentBlockElement) {
                log("selectBlock: editable field belongs to nested block, skipping focus");
                contentEditableField = null;
              }
            }
            if (contentEditableField) {
              const fieldPath = contentEditableField.getAttribute("data-edit-text");
              this.activateEditableField(contentEditableField, fieldPath, this.selectedBlockUid, "selectBlock", {
                skipContentEditable: true,
                // Already done above
                skipObservers: true,
                // Text observers set up elsewhere for blocks
                preventScroll: this._isReselectingSameBlock,
                wasAlreadyEditable,
                saveClickPosition: true
                // Save for FORM_DATA handler after re-render
              });
            } else if (this.lastClickPosition) {
              log("selectBlock: no editable field found, clearing lastClickPosition");
              this.lastClickPosition = null;
            }
          }
          if (this._pendingBlockSelected) {
            const serializedSelection = this.serializeSelection();
            const pendingBlockUid = this._pendingBlockSelected.blockUid;
            const pendingFocusedFieldName = this._pendingBlockSelected.focusedFieldName;
            const pendingFocusedLinkableField = this._pendingBlockSelected.focusedLinkableField;
            const pendingFocusedMediaField = this._pendingBlockSelected.focusedMediaField;
            this._pendingBlockSelected = null;
            this.sendBlockSelected("selectionChangeListener", currentBlockElement, {
              blockUid: pendingBlockUid,
              focusedFieldName: pendingFocusedFieldName,
              focusedLinkableField: pendingFocusedLinkableField,
              focusedMediaField: pendingFocusedMediaField,
              selection: serializedSelection
            });
            log("Sent BLOCK_SELECTED with selection:", { blockUid: pendingBlockUid, selection: serializedSelection });
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
    log("handleBlockSelector:", selector, "trigger:", triggerElement.className);
    const containerBlock = triggerElement.closest("[data-block-uid]");
    if (!containerBlock) {
      log("handleBlockSelector: no container found");
      return;
    }
    const containerUid = containerBlock.getAttribute("data-block-uid");
    log("handleBlockSelector: container =", containerUid);
    const allNestedBlocks = containerBlock.querySelectorAll("[data-block-uid]");
    const childBlocks = Array.from(allNestedBlocks).filter((el) => {
      const parentContainer = el.parentElement?.closest("[data-block-uid]");
      return parentContainer?.getAttribute("data-block-uid") === containerUid;
    });
    log("handleBlockSelector: childBlocks =", childBlocks.length, childBlocks.map((el) => el.getAttribute("data-block-uid")));
    if (childBlocks.length === 0) {
      log("handleBlockSelector: no child blocks found");
      return;
    }
    if (selector !== "+1" && selector !== "-1") {
      const targetUid2 = selector;
      log("handleBlockSelector: direct selector targetUid =", targetUid2);
      this._blockSelectorNavigating = true;
      this.stopTransitionTracking();
      window.parent.postMessage({ type: "HIDE_BLOCK_UI" }, this.adminOrigin);
      this.waitForBlockVisibleAndSelect(targetUid2);
      return;
    }
    const getFreshChildBlocks = () => {
      const container = this.queryBlockElement(containerUid);
      if (!container) return [];
      const allNested = container.querySelectorAll("[data-block-uid]");
      return Array.from(allNested).filter((el) => {
        const parent = el.parentElement?.closest("[data-block-uid]");
        return parent?.getAttribute("data-block-uid") === containerUid;
      });
    };
    const findMostCenteredChild = (children, container) => {
      const containerRect = container.getBoundingClientRect();
      const containerCenter = containerRect.left + containerRect.width / 2;
      let best = null;
      let bestDistance = Infinity;
      for (const child of children) {
        const rect = child.getBoundingClientRect();
        const childCenter = rect.left + rect.width / 2;
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
    this._blockSelectorNavigating = true;
    this.stopTransitionTracking();
    window.parent.postMessage({ type: "HIDE_BLOCK_UI" }, this.adminOrigin);
    const currentlyVisibleElement = findMostCenteredChild(childBlocks, containerBlock);
    const currentVisibleUid = currentlyVisibleElement?.getAttribute("data-block-uid");
    childBlocks.forEach((el) => {
      const uid = el.getAttribute("data-block-uid");
      const rect = el.getBoundingClientRect();
      log(`handleBlockSelector: ${uid} rect.left=${Math.round(rect.left)}`);
    });
    log("handleBlockSelector: currently visible =", currentVisibleUid);
    let currentIndex = childBlocks.findIndex(
      (el) => el === currentlyVisibleElement
    );
    if (currentIndex === -1) currentIndex = 0;
    const offset = parseInt(selector, 10);
    let targetIndex = currentIndex + offset;
    if (targetIndex < 0) {
      targetIndex = childBlocks.length - 1;
    } else if (targetIndex >= childBlocks.length) {
      targetIndex = 0;
    }
    const targetUid = childBlocks[targetIndex]?.getAttribute("data-block-uid");
    log("handleBlockSelector: target =", targetUid, "(index", currentIndex, "+", offset, "\u2192", targetIndex, ")");
    let visibilityPollCount = 0;
    const getTargetVisibility = (container) => {
      const targetEl = this.queryBlockElement(targetUid);
      if (!targetEl || !container) {
        return { visible: false, x: null };
      }
      const containerRect = container.getBoundingClientRect();
      const targetRect = targetEl.getBoundingClientRect();
      const targetCenter = targetRect.left + targetRect.width / 2;
      const visible = targetCenter >= containerRect.left && targetCenter <= containerRect.right;
      visibilityPollCount++;
      if (visibilityPollCount <= 5 || visibilityPollCount % 10 === 0) {
        log(
          "getTargetVisibility:",
          targetUid,
          "class:",
          targetEl.className.substring(0, 120),
          "rect:",
          JSON.stringify({ l: Math.round(targetRect.left), w: Math.round(targetRect.width) }),
          "container:",
          JSON.stringify({ l: Math.round(containerRect.left), r: Math.round(containerRect.right) }),
          "visible:",
          visible
        );
      }
      return { visible, x: targetRect.left };
    };
    let stableCount = 0;
    let lastX = null;
    const STABLE_THRESHOLD = 3;
    const POSITION_TOLERANCE = 2;
    const containerForSnapshot = this.queryBlockElement(containerUid);
    const containerRectSnapshot = containerForSnapshot?.getBoundingClientRect();
    const initialVisibleElements = /* @__PURE__ */ new Set();
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
    log("handleBlockSelector: initial visible blocks:", [...initialVisibleElements].map((el) => el.getAttribute("data-block-uid")));
    const childUids = new Set(childBlocks.map((el) => el.getAttribute("data-block-uid")));
    const waitForTarget = (retries = 40) => {
      if (this.selectedBlockUid && !childUids.has(this.selectedBlockUid)) {
        log("handleBlockSelector: user navigated away, canceling child selection. selected:", this.selectedBlockUid);
        return;
      }
      const container = this.queryBlockElement(containerUid);
      const freshChildBlocks = getFreshChildBlocks();
      const { visible, x } = getTargetVisibility(container);
      if (!visibilityChanged && container) {
        const containerRect = container.getBoundingClientRect();
        const currentVisible = /* @__PURE__ */ new Set();
        for (const child of freshChildBlocks) {
          const rect = child.getBoundingClientRect();
          const center = rect.left + rect.width / 2;
          if (center >= containerRect.left && center <= containerRect.right) {
            currentVisible.add(child);
          }
        }
        if (currentVisible.size !== initialVisibleElements.size || [...currentVisible].some((el) => !initialVisibleElements.has(el))) {
          visibilityChanged = true;
          log("handleBlockSelector: visible blocks changed, animation started");
        }
      }
      if (visible && visibilityChanged) {
        const positionStable = lastX !== null && Math.abs(x - lastX) < POSITION_TOLERANCE;
        if (positionStable) {
          stableCount++;
        } else {
          stableCount = 0;
        }
        lastX = x;
        if (retries === 40 || retries === 30 || retries === 20 || retries === 10 || retries === 1) {
          log(`handleBlockSelector poll: retries=${retries} target=${targetUid} visible=true x=${Math.round(x)} stableCount=${stableCount}`);
        }
        if (stableCount >= STABLE_THRESHOLD) {
          log("handleBlockSelector: target visible and position stable, selecting", targetUid);
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
        log("handleBlockSelector: target not visible after settling, finding most centered");
        const centeredChild = container ? findMostCenteredChild(freshChildBlocks, container) : null;
        const centeredUid = centeredChild?.getAttribute("data-block-uid");
        log("handleBlockSelector: fallback to most centered =", centeredUid);
        if (centeredChild) {
          this.selectBlock(centeredChild);
        } else if (container) {
          log("handleBlockSelector: no centered child found, selecting parent container");
          this.selectBlock(container);
        }
      }
    };
    setTimeout(waitForTarget, 50);
  }
  /**
   * Fallback for +1/-1 selection when visibility doesn't change.
   * Used for carousels that use transforms instead of hiding elements.
   */
  handleBlockSelectorFallback(selector, childBlocks, currentVisibleUid) {
    let currentIndex = childBlocks.findIndex(
      (el) => el.getAttribute("data-block-uid") === currentVisibleUid
    );
    if (currentIndex === -1) currentIndex = 0;
    const offset = parseInt(selector, 10);
    let targetIndex = currentIndex + offset;
    if (targetIndex < 0) {
      targetIndex = childBlocks.length - 1;
    } else if (targetIndex >= childBlocks.length) {
      targetIndex = 0;
    }
    const targetUid = childBlocks[targetIndex]?.getAttribute("data-block-uid");
    log("handleBlockSelector fallback: targetUid =", targetUid);
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
        log("handleBlockSelector: selecting (position stable)", targetUid);
        this.selectBlock(targetElement);
        return;
      }
      if (retries > 0) {
        setTimeout(() => this.waitForBlockVisibleAndSelect(targetUid, retries - 1, stableCount, x), 50);
      } else {
        log("handleBlockSelector: selecting (retries exhausted)", targetUid);
        this.selectBlock(targetElement);
      }
    } else if (retries > 0) {
      setTimeout(() => this.waitForBlockVisibleAndSelect(targetUid, retries - 1, 0, null), 50);
    } else {
      log("handleBlockSelector: block not visible after retries", targetUid);
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
      `[data-block-uid="${prevBlockUid}"]`
    );
    if (prevBlockUid !== null && prevBlockUid !== currBlockUid && prevBlockElement) {
      window.parent.postMessage(
        { type: "HIDE_BLOCK_UI" },
        this.adminOrigin
      );
      const dragHandle = document.querySelector(".volto-hydra-drag-button");
      if (dragHandle) {
        dragHandle.remove();
      }
      if (this.dragHandleScrollListener) {
        window.removeEventListener("scroll", this.dragHandleScrollListener, true);
        this.dragHandleScrollListener = null;
      }
      this.dragHandlePositioner = null;
      if (this.blockObserver) {
        this.blockObserver.disconnect();
      }
      prevBlockElement.removeAttribute("contenteditable");
      const childNodes = prevBlockElement.querySelectorAll("[data-node-id]");
      childNodes.forEach((node) => {
        node.removeAttribute("contenteditable");
      });
    }
    document.removeEventListener("mouseup", this.handleMouseUp);
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
    log("observeBlockResize called for block:", blockUid, "skipInitialUpdate:", skipInitialUpdate);
    if (this._lastBlockRectUid === blockUid && this.blockResizeObserver && this._observedElements?.length > 0) {
      const allStillConnected = this._observedElements.every((el) => document.body.contains(el));
      const currentElements = this.getAllBlockElements(blockUid);
      const elementsMatch = currentElements.length === this._observedElements.length && Array.from(currentElements).every((el) => this._observedElements.includes(el));
      log("observeBlockResize: allStillConnected:", allStillConnected, "elementsMatch:", elementsMatch, "observed:", this._observedElements.length, "current:", currentElements.length);
      if (allStillConnected && elementsMatch) {
        log("observeBlockResize: already observing this block, skipping");
        return;
      }
      log("observeBlockResize: elements changed, re-attaching to new elements");
    }
    if (this.blockResizeObserver) {
      this.blockResizeObserver.disconnect();
    }
    const allElements = this.getAllBlockElements(blockUid);
    let currentRect = this.getBoundingBoxForElements(allElements);
    if (!currentRect && blockElements?.[0]) {
      const domRect = blockElements[0].getBoundingClientRect();
      currentRect = { top: domRect.top, left: domRect.left, width: domRect.width, height: domRect.height };
    }
    if (!this._lastBlockRect || this._lastBlockRectUid !== blockUid) {
      this._lastBlockRect = currentRect;
      this._lastBlockRectUid = blockUid;
    } else if (skipInitialUpdate) {
    }
    this._observedElements = Array.from(allElements);
    log("observeBlockResize initial rect:", { width: currentRect.width, height: currentRect.height }, "observing", allElements.length, "elements");
    this.blockResizeObserver = new ResizeObserver((entries) => {
      log("ResizeObserver callback fired for:", blockUid);
      if (this.selectedBlockUid !== blockUid) {
        log("ResizeObserver: block no longer selected, ignoring");
        return;
      }
      const freshElements = this.getAllBlockElements(blockUid);
      if (freshElements.length === 0) {
        log("ResizeObserver: no elements found, ignoring");
        return;
      }
      const newRect = this.getBoundingBoxForElements(freshElements);
      if (!newRect) {
        log("ResizeObserver: could not compute bounding box, ignoring");
        return;
      }
      const lastRect = this._lastBlockRect;
      const hadValidLastRect = lastRect && (lastRect.width > 0 || lastRect.height > 0);
      const widthChanged = hadValidLastRect ? Math.abs(newRect.width - lastRect.width) > 1 : false;
      const heightChanged = hadValidLastRect ? Math.abs(newRect.height - lastRect.height) > 1 : false;
      const topChanged = hadValidLastRect ? Math.abs(newRect.top - lastRect.top) > 1 : false;
      const leftChanged = hadValidLastRect ? Math.abs(newRect.left - lastRect.left) > 1 : false;
      const dimensionsChanged = widthChanged || heightChanged || topChanged || leftChanged;
      const shouldUpdate = dimensionsChanged || !hadValidLastRect && newRect.height > 0;
      log("ResizeObserver: comparing rects - last:", lastRect?.height || 0, "new:", newRect.height, "shouldUpdate:", shouldUpdate);
      this._lastBlockRect = newRect;
      if (shouldUpdate) {
        log(
          "Block size changed, updating selection outline:",
          blockUid,
          "old:",
          lastRect?.top || 0,
          lastRect?.left || 0,
          lastRect?.width || 0,
          lastRect?.height || 0,
          "new:",
          newRect.top,
          newRect.left,
          newRect.width,
          newRect.height
        );
        this.sendBlockSelected("resizeObserver", null, { blockUid });
      }
    });
    for (const element of allElements) {
      this.blockResizeObserver.observe(element, { box: "border-box" });
    }
    this.observeBlockDomChanges(blockUid);
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
    if (this._domMutationObserver) {
      this._domMutationObserver.disconnect();
    }
    const container = document.body;
    this._domMutationObserver = new MutationObserver((mutations) => {
      if (this.selectedBlockUid !== blockUid) {
        return;
      }
      let relevantChange = false;
      for (const mutation of mutations) {
        if (mutation.type === "childList") {
          for (const node of mutation.addedNodes) {
            if (node.nodeType === Node.ELEMENT_NODE) {
              if (node.getAttribute?.("data-block-uid") === blockUid || node.querySelector?.(`[data-block-uid="${blockUid}"]`)) {
                relevantChange = true;
                break;
              }
            }
          }
          if (relevantChange) break;
        }
      }
      if (!relevantChange) return;
      log("observeBlockDomChanges: detected relevant DOM change for", blockUid);
      this.materializeHydraComments();
      if (!this._observedElements?.length) return;
      const currentElements = this.getAllBlockElements(blockUid);
      const elementsMatch = currentElements.length === this._observedElements.length && Array.from(currentElements).every(
        (el) => this._observedElements.includes(el)
      );
      if (elementsMatch) {
        log("observeBlockDomChanges: elements still match, no action needed");
        return;
      }
      log(
        "observeBlockDomChanges: elements changed, re-attaching ResizeObserver",
        "old:",
        this._observedElements.length,
        "new:",
        currentElements.length
      );
      if (this.blockResizeObserver) {
        this.blockResizeObserver.disconnect();
        const newRect = this.getBoundingBoxForElements(currentElements);
        if (newRect && (newRect.width > 0 || newRect.height > 0)) {
          this._lastBlockRect = newRect;
        }
        this._observedElements = Array.from(currentElements);
        for (const element of currentElements) {
          this.blockResizeObserver.observe(element, { box: "border-box" });
        }
        if (newRect && (newRect.width > 0 || newRect.height > 0)) {
          const firstElement = currentElements[0];
          if (firstElement) {
            this.restoreContentEditableOnFields(firstElement, "domChange");
            if (this._domChangeDebounce) {
              clearTimeout(this._domChangeDebounce);
            }
            this._domChangeDebounce = setTimeout(() => {
              this._domChangeDebounce = null;
              if (blockUid !== this.selectedBlockUid) {
                log("observeBlockDomChanges: skipping BLOCK_SELECTED, selection changed to", this.selectedBlockUid);
                return;
              }
              const freshElements = this.getAllBlockElements(blockUid);
              if (freshElements.length > 0) {
                if (this._justFinishedDragBlockId === blockUid) {
                  if (!this.elementIsVisibleInViewport(freshElements[0])) {
                    log("observeBlockDomChanges: scrolling to dragged block", blockUid);
                    this.scrollBlockIntoView(freshElements[0]);
                  }
                  this._justFinishedDragBlockId = null;
                }
                this.sendBlockSelected("domChange", null, { blockUid });
              }
            }, 150);
          }
        }
      }
    });
    this._domMutationObserver.observe(container, {
      childList: true,
      subtree: true
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
    if (this._transitionEndHandler && this._trackedBlockElement) {
      this._trackedBlockElement.removeEventListener(
        "transitionend",
        this._transitionEndHandler
      );
      this._transitionEndHandler = null;
      this._trackedBlockElement = null;
    }
    if (this.blockResizeObserver) {
      this.blockResizeObserver.disconnect();
      this.blockResizeObserver = null;
    }
    if (this._domMutationObserver) {
      this._domMutationObserver.disconnect();
      this._domMutationObserver = null;
    }
    if (this.scrollTimeout) {
      clearTimeout(this.scrollTimeout);
      this.scrollTimeout = null;
    }
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
    if (this._transitionAnimationFrame) {
      cancelAnimationFrame(this._transitionAnimationFrame);
      this._transitionAnimationFrame = null;
    }
    if (this._transitionEndHandler && this._trackedBlockElements) {
      for (const el of this._trackedBlockElements) {
        el.removeEventListener("transitionend", this._transitionEndHandler);
      }
    }
    if (this._initialTrackingTimeout) {
      clearTimeout(this._initialTrackingTimeout);
      this._initialTrackingTimeout = null;
    }
    let isTracking = false;
    this._trackingBlockUid = blockUid;
    const trackPosition = () => {
      if (!isTracking || this._trackingBlockUid !== blockUid) {
        return;
      }
      if (this._blockSelectorNavigating) {
        const newRect2 = this.getBoundingBoxForElements(blockElements);
        if (newRect2) {
          const lastRect2 = this._lastBlockRect;
          const positionChanged = !lastRect2 || Math.abs(newRect2.left - lastRect2.left) > 1 || Math.abs(newRect2.top - lastRect2.top) > 1;
          this._lastBlockRect = newRect2;
          if (positionChanged) {
            this._navStableFrames = 0;
          } else {
            this._navStableFrames = (this._navStableFrames || 0) + 1;
            if (this._navStableFrames >= 12) {
              log("trackPosition: navigation settled for", blockUid);
              this._blockSelectorNavigating = false;
              this._navStableFrames = 0;
              this.sendBlockSelected("navigationSettled", blockElements[0]);
              stopTracking();
              return;
            }
          }
        }
        this._transitionAnimationFrame = requestAnimationFrame(trackPosition);
        return;
      }
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
          this.sendBlockSelected("transitionTracker", blockElements[0]);
        }
      }
      this._transitionAnimationFrame = requestAnimationFrame(trackPosition);
    };
    const startTracking = () => {
      if (!isTracking) {
        isTracking = true;
        log("observeBlockTransition: starting position tracking for:", blockUid);
        trackPosition();
      }
    };
    const stopTracking = () => {
      if (this._blockSelectorNavigating) {
        log("observeBlockTransition: deferring stop during navigation for:", blockUid);
        return;
      }
      isTracking = false;
      if (this._transitionAnimationFrame) {
        cancelAnimationFrame(this._transitionAnimationFrame);
        this._transitionAnimationFrame = null;
      }
      log("observeBlockTransition: stopped tracking for:", blockUid);
      if (this.selectedBlockUid === blockUid) {
        const finalRect = this.getBoundingBoxForElements(blockElements);
        if (finalRect && this._lastBlockRect) {
          const moved = Math.abs(finalRect.left - this._lastBlockRect.left) > 1 || Math.abs(finalRect.top - this._lastBlockRect.top) > 1;
          if (moved) {
            this._lastBlockRect = finalRect;
            this.sendBlockSelected("transitionEnd", blockElements[0]);
          }
        }
      }
    };
    this._transitionEndHandler = stopTracking;
    this._trackedBlockElements = blockElements;
    for (const el of blockElements) {
      el.addEventListener("transitionend", this._transitionEndHandler);
    }
    if (this._transitionMutationObserver) {
      this._transitionMutationObserver.disconnect();
    }
    this._transitionMutationObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "attributes" && (mutation.attributeName === "class" || mutation.attributeName === "style")) {
          const style = window.getComputedStyle(mutation.target);
          if (style.transition && style.transition !== "none" && (style.transform !== "none" || style.translate !== "none")) {
            startTracking();
          }
        }
      }
    });
    for (const el of blockElements) {
      this._transitionMutationObserver.observe(el, {
        attributes: true,
        attributeFilter: ["class", "style"]
      });
    }
    startTracking();
    this._initialTrackingTimeout = setTimeout(() => {
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
    const existingDragHandle = document.querySelector(".volto-hydra-drag-button");
    if (existingDragHandle) {
      existingDragHandle.remove();
    }
    const dragButton = document.createElement("button");
    dragButton.className = "volto-hydra-drag-button";
    Object.assign(dragButton.style, {
      position: "fixed",
      width: "40px",
      height: "48px",
      opacity: "0",
      // Invisible - parent shows the visual
      cursor: "grab",
      zIndex: "9999",
      background: "transparent",
      border: "none",
      padding: "0",
      pointerEvents: "auto",
      display: "none"
      // Hidden until positioned
    });
    document.body.appendChild(dragButton);
    document.querySelectorAll(".volto-hydra-edge-handle").forEach((el) => el.remove());
    this._edgeHandles = {};
    for (const edge of ["top", "bottom", "left", "right"]) {
      const h = document.createElement("div");
      h.className = "volto-hydra-edge-handle";
      h.setAttribute("data-edge", edge);
      const isVertical = edge === "top" || edge === "bottom";
      Object.assign(h.style, {
        position: "fixed",
        background: "rgba(0, 126, 177, 0.35)",
        cursor: isVertical ? "ns-resize" : "ew-resize",
        zIndex: "9998",
        display: "none",
        pointerEvents: "auto"
      });
      if (isVertical) h.style.height = "6px";
      else h.style.width = "6px";
      document.body.appendChild(h);
      this._edgeHandles[edge] = h;
      this._setupEdgeHandleDrag(h);
    }
    const positionDragHandle = () => {
      if (!this.selectedBlockUid) {
        dragButton.style.display = "none";
        return;
      }
      const allElements = this.getAllBlockElements(this.selectedBlockUid);
      if (allElements.length === 0) {
        dragButton.style.display = "none";
        return;
      }
      let rect;
      if (allElements.length > 1) {
        rect = this.getBoundingBoxForElements(allElements);
        if (!rect) {
          rect = allElements[0].getBoundingClientRect();
        }
      } else {
        rect = allElements[0].getBoundingClientRect();
      }
      if (rect.bottom < 0 || rect.top > window.innerHeight) {
        dragButton.style.display = "none";
        return;
      }
      const handlePos = calculateDragHandlePosition(rect);
      dragButton.style.right = "auto";
      dragButton.style.left = `${handlePos.left}px`;
      dragButton.style.top = `${handlePos.top}px`;
      dragButton.style.display = "block";
    };
    const dragHandler = (e) => {
      e.preventDefault();
      this._isDragging = true;
      const rawDraggedUids = this.multiSelectedBlockUids.length > 0 ? [...this.multiSelectedBlockUids] : [this.selectedBlockUid];
      const draggedUids = this._filterMutableBlockUids(rawDraggedUids, "move");
      if (draggedUids.length === 0) {
        this._isDragging = false;
        return;
      }
      const allElements = draggedUids.flatMap((uid) => [...this.getAllBlockElements(uid)]);
      if (allElements.length === 0) return;
      const rect = this.getBoundingBoxForElements(allElements);
      if (!rect) return;
      document.querySelector("body").classList.add("grabbing");
      let draggedBlock;
      if (draggedUids.length > 1 || allElements.length > 1) {
        draggedBlock = document.createElement("div");
        draggedBlock.classList.add("dragging", "multi-element-ghost");
        draggedBlock.style.cssText = `
          background: rgba(0, 123, 255, 0.2);
          border: 2px dashed rgba(0, 123, 255, 0.5);
          border-radius: 4px;
        `;
      } else {
        draggedBlock = allElements[0].cloneNode(true);
        draggedBlock.classList.add("dragging");
        draggedBlock.removeAttribute("data-block-uid");
      }
      Object.assign(draggedBlock.style, {
        position: "fixed",
        width: `${rect.width}px`,
        height: `${rect.height}px`,
        left: `${e.clientX}px`,
        top: `${e.clientY}px`,
        opacity: "0.5",
        pointerEvents: "none",
        zIndex: "10000"
      });
      document.body.appendChild(draggedBlock);
      let closestBlockUid = null;
      let insertAt = null;
      let dropIndicatorVisible = false;
      const scroller = this._createAutoScroller();
      const onMouseMove = (e2) => {
        scroller.onMouseMove(e2);
        draggedBlock.style.left = `${e2.clientX}px`;
        draggedBlock.style.top = `${e2.clientY}px`;
        const elementBelow = document.elementFromPoint(e2.clientX, e2.clientY);
        let closestBlock = elementBelow;
        while (closestBlock && !closestBlock.hasAttribute("data-block-uid")) {
          closestBlock = closestBlock.parentElement;
        }
        const draggedBlockUids = allElements.map((el) => el.getAttribute("data-block-uid"));
        const isSelfOrGhost = closestBlock && (closestBlock === draggedBlock || allElements.includes(closestBlock) || draggedBlockUids.includes(closestBlock.getAttribute("data-block-uid")));
        if (isSelfOrGhost) closestBlock = null;
        if (!closestBlock) {
          const allBlocks = Array.from(document.querySelectorAll("[data-block-uid]")).filter((el) => el !== draggedBlock && !draggedBlockUids.includes(el.getAttribute("data-block-uid")));
          let nearest = { el: null, dist: Infinity, above: false };
          for (const el of allBlocks) {
            const rect2 = el.getBoundingClientRect();
            const aboveDist = rect2.top - e2.clientY;
            const belowDist = e2.clientY - rect2.bottom;
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
          const draggedBlockTypes = draggedBlockUids.map((uid) => this.getBlockType(uid)).filter(Boolean);
          let validDropTarget = closestBlock;
          let validDropTargetUid = validDropTarget.getAttribute("data-block-uid");
          while (validDropTarget) {
            const targetPathInfo = this.blockPathMap?.[validDropTargetUid];
            const allowedSiblingTypes = targetPathInfo?.allowedSiblingTypes;
            const allTypesAllowed = !allowedSiblingTypes || draggedBlockTypes.length === 0 || draggedBlockTypes.every((type) => allowedSiblingTypes.includes(type));
            if (allTypesAllowed) {
              break;
            }
            const parentElement = validDropTarget.parentElement?.closest("[data-block-uid]");
            if (!parentElement) {
              validDropTarget = null;
              validDropTargetUid = null;
              break;
            }
            validDropTarget = parentElement;
            validDropTargetUid = validDropTarget.getAttribute("data-block-uid");
            if (draggedBlockUids.includes(validDropTargetUid)) {
              validDropTarget = null;
              validDropTargetUid = null;
              break;
            }
          }
          if (!validDropTarget) {
            const existingIndicator = document.querySelector(".volto-hydra-drop-indicator");
            if (existingIndicator) {
              existingIndicator.style.display = "none";
            }
            dropIndicatorVisible = false;
            closestBlockUid = null;
            return;
          }
          closestBlock = validDropTarget;
          closestBlockUid = validDropTargetUid;
          let dropIndicator = document.querySelector(".volto-hydra-drop-indicator");
          if (!dropIndicator) {
            dropIndicator = document.createElement("div");
            dropIndicator.className = "volto-hydra-drop-indicator";
            dropIndicator.style.cssText = "position:absolute;background:transparent;pointer-events:none;z-index:9998;display:none;";
            document.body.appendChild(dropIndicator);
          }
          const allElements2 = this.getAllBlockElements(closestBlockUid);
          const isMultiElement = allElements2.length > 1;
          let targetElement = closestBlock;
          let rect2;
          if (isMultiElement) {
            rect2 = this.getBoundingBoxForElements(allElements2);
          } else {
            rect2 = closestBlock.getBoundingClientRect();
          }
          const isHorizontal = this.getAddDirection(closestBlock) === "right";
          const mousePos = isHorizontal ? e2.clientX - rect2.left : e2.clientY - rect2.top;
          const blockSize = isHorizontal ? rect2.width : rect2.height;
          const preferredInsertAt = mousePos < blockSize / 2 ? 0 : 1;
          const targetBlockData = this.getBlockData(closestBlockUid);
          const sourceBlockData = this.getBlockData(this.selectedBlockUid);
          const addability = getBlockAddability(closestBlockUid, this.blockPathMap, targetBlockData, this.templateEditMode, sourceBlockData);
          if (preferredInsertAt === 0 && addability.canInsertBefore) {
            insertAt = 0;
          } else if (preferredInsertAt === 1 && addability.canInsertAfter) {
            insertAt = 1;
          } else if (addability.canInsertBefore) {
            insertAt = 0;
          } else if (addability.canInsertAfter) {
            insertAt = 1;
          } else {
            const existingIndicator = document.querySelector(".volto-hydra-drop-indicator");
            if (existingIndicator) {
              existingIndicator.style.display = "none";
            }
            dropIndicatorVisible = false;
            closestBlockUid = null;
            return;
          }
          if (isMultiElement) {
            targetElement = insertAt === 0 ? allElements2[0] : allElements2[allElements2.length - 1];
          }
          const sibling = insertAt === 0 ? targetElement.previousElementSibling : targetElement.nextElementSibling;
          const siblingUid = sibling?.getAttribute("data-block-uid");
          const siblingRect = sibling?.hasAttribute("data-block-uid") && siblingUid !== closestBlockUid ? sibling.getBoundingClientRect() : null;
          const indicatorSize = 4;
          let indicatorPos;
          if (isHorizontal) {
            const edge = insertAt === 0 ? rect2.left : rect2.right;
            const siblingEdge = siblingRect ? insertAt === 0 ? siblingRect.right : siblingRect.left : edge;
            const gap = insertAt === 0 ? rect2.left - (siblingRect?.right || rect2.left) : (siblingRect?.left || rect2.right) - rect2.right;
            indicatorPos = (insertAt === 0 ? siblingRect?.right || rect2.left : rect2.right) + window.scrollX + gap / 2 - indicatorSize / 2;
            Object.assign(dropIndicator.style, {
              left: `${indicatorPos}px`,
              top: `${rect2.top + window.scrollY}px`,
              width: `${indicatorSize}px`,
              height: `${rect2.height}px`,
              borderTop: "none",
              borderLeft: "3px dashed #007bff",
              display: "block"
            });
          } else {
            const edge = insertAt === 0 ? rect2.top : rect2.bottom;
            const siblingEdge = siblingRect ? insertAt === 0 ? siblingRect.bottom : siblingRect.top : edge;
            const gap = insertAt === 0 ? rect2.top - (siblingRect?.bottom || rect2.top) : (siblingRect?.top || rect2.bottom) - rect2.bottom;
            indicatorPos = (insertAt === 0 ? siblingRect?.bottom || rect2.top : rect2.bottom) + window.scrollY + gap / 2 - indicatorSize / 2;
            Object.assign(dropIndicator.style, {
              top: `${indicatorPos}px`,
              left: `${rect2.left}px`,
              width: `${rect2.width}px`,
              height: `${indicatorSize}px`,
              borderLeft: "none",
              borderTop: "3px dashed #007bff",
              display: "block"
            });
          }
          dropIndicatorVisible = true;
        } else {
          const existingIndicator = document.querySelector(".volto-hydra-drop-indicator");
          if (existingIndicator) {
            existingIndicator.style.display = "none";
          }
          dropIndicatorVisible = false;
          closestBlockUid = null;
        }
      };
      const onMouseUp = () => {
        this._isDragging = false;
        if (this.scrollTimeout) {
          clearTimeout(this.scrollTimeout);
          this.scrollTimeout = null;
        }
        scroller.stop();
        document.querySelector("body").classList.remove("grabbing");
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
        draggedBlock.remove();
        const dropIndicator = document.querySelector(".volto-hydra-drop-indicator");
        if (dropIndicator) {
          log("Hiding drop indicator on mouseup");
          dropIndicator.style.display = "none";
        } else {
          log("No drop indicator to hide on mouseup");
        }
        if (closestBlockUid && dropIndicatorVisible) {
          this._justFinishedDragBlockId = this.selectedBlockUid;
          const targetPathInfo = this.blockPathMap?.[closestBlockUid];
          log("DnD: Moving", draggedUids.length, "blocks relative to", closestBlockUid, "insertAfter:", insertAt === 1);
          window.parent.postMessage(
            {
              type: "MOVE_BLOCKS",
              blockIds: draggedUids,
              targetBlockId: closestBlockUid,
              insertAfter: insertAt === 1,
              targetParentId: targetPathInfo?.parentId || null
            },
            this.adminOrigin
          );
        } else if (closestBlockUid && !dropIndicatorVisible) {
          log("DnD: Drop rejected - indicator was not visible (block type not allowed in target)");
        }
      };
      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    };
    dragButton.addEventListener("mousedown", dragHandler);
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
      if (event.data.type === "SELECT_BLOCK") {
        const { uid } = event.data;
        if (!uid) {
          const prevUid = this.selectedBlockUid;
          this.selectedBlockUid = null;
          if (prevUid) {
            this.deselectBlock(prevUid, null);
          }
          this.editMode = "text";
          this.sendBlockSelected("adminDeselect", null);
          return;
        }
        const alreadySelected = this.selectedBlockUid === uid;
        this.selectedBlockUid = uid;
        if (this.blockPathMap?.[uid]?.isTemplateInstance) {
          if (!alreadySelected) {
            this.selectBlock(uid);
          }
          return;
        }
        let blockElement = document.querySelector(
          `[data-block-uid="${uid}"]`
        );
        if (!blockElement || this.isElementHidden(blockElement)) {
          const waitForVisible = async () => {
            for (let i = 0; i < 30; i++) {
              await new Promise((resolve) => setTimeout(resolve, 50));
              blockElement = document.querySelector(
                `[data-block-uid="${uid}"]`
              );
              if (blockElement && !this.isElementHidden(blockElement)) {
                return true;
              }
            }
            return false;
          };
          if (alreadySelected || this._blockSelectorNavigating) {
            waitForVisible().then((visible) => {
              if (visible) {
                this.selectBlock(blockElement);
              }
            });
            return;
          }
          const madeVisible = this.tryMakeBlockVisible(uid);
          if (madeVisible) {
            waitForVisible().then((visible) => {
              if (visible) {
                this.selectBlock(blockElement);
              }
            });
            return;
          }
        }
        if (blockElement && !this.isElementHidden(blockElement)) {
          if (alreadySelected) {
            log("SELECT_BLOCK: block already selected, skipping:", uid);
            return;
          }
          if (!this.elementIsVisibleInViewport(blockElement)) {
            this.scrollBlockIntoView(blockElement);
          }
          this.editMode = "text";
          this.selectBlock(blockElement);
          const schemaProps = this.getBlockSchema(uid)?.properties;
          const hasEditableFields = schemaProps && Object.keys(schemaProps).length > 0;
          if (hasEditableFields) {
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                const currentBlockElement = this.queryBlockElement(uid);
                if (currentBlockElement) {
                  const editableField = this.getOwnFirstEditableField(currentBlockElement);
                  if (editableField && editableField.getAttribute("contenteditable") === "true") {
                    editableField.focus();
                  }
                }
              });
            });
          }
        } else {
          log("Block element not found for SELECT_BLOCK, retrying in 100ms:", uid);
          setTimeout(() => {
            window.postMessage(
              {
                type: "SELECT_BLOCK_RETRY",
                uid
              },
              window.location.origin
            );
          }, 100);
        }
      }
      if (event.data.type === "SELECT_BLOCK_RETRY") {
        const { uid } = event.data;
        const blockElement = document.querySelector(
          `[data-block-uid="${uid}"]`
        );
        if (blockElement) {
          log("Block element found on retry, selecting:", uid);
          this.selectBlock(blockElement);
        } else {
          console.warn("[HYDRA] Block element still not found after retry:", uid);
        }
      }
    };
    window.removeEventListener("message", this.selectBlockHandler);
    window.addEventListener("message", this.selectBlockHandler);
  }
  /**
   * Sets up scroll handler to hide/show block UI overlays on scroll
   */
  setupScrollHandler() {
    const handleScroll = () => {
      if ((this.selectedBlockUid || this.multiSelectedBlockUids.length > 0) && !this._blockSelectorNavigating) {
        window.parent.postMessage(
          { type: "HIDE_BLOCK_UI" },
          this.adminOrigin
        );
      }
      if (this.scrollTimeout) {
        clearTimeout(this.scrollTimeout);
      }
      this.scrollTimeout = setTimeout(() => {
        if (this._isDragging || this._blockSelectorNavigating) {
          return;
        }
        if (this.multiSelectedBlockUids.length > 1) {
          this._sendMultiBlockSelected();
          return;
        }
        if (this.selectedBlockUid) {
          let element;
          if (this.selectedBlockUid === PAGE_BLOCK_UID) {
            if (this.focusedMediaField) {
              element = document.querySelector(`[data-edit-media="${this.focusedMediaField}"]`);
            } else if (this.focusedLinkableField) {
              element = document.querySelector(`[data-edit-link="${this.focusedLinkableField}"]`);
            } else if (this.focusedFieldName) {
              element = document.querySelector(`[data-edit-text="${this.focusedFieldName}"]`);
            }
          } else {
            const elements = this.getAllBlockElements(this.selectedBlockUid);
            element = elements[0] || null;
          }
          if (element) {
            const extra = {};
            if (this._selectionModeBlockUids) {
              const selectionModeRects = {};
              for (const uid of this._selectionModeBlockUids) {
                const el = this.queryBlockElement(uid);
                if (el) {
                  const r = el.getBoundingClientRect();
                  selectionModeRects[uid] = { top: r.top, left: r.left, width: r.width, height: r.height };
                }
              }
              extra.selectionModeRects = selectionModeRects;
            }
            this.sendBlockSelected("scrollHandler", element, { blockUid: this.selectedBlockUid, ...extra });
          }
        }
      }, 150);
    };
    window.addEventListener("scroll", handleScroll);
  }
  /**
   * Sets up window resize handler to update block UI overlay positions
   */
  setupResizeHandler() {
    const handleResize = () => {
      if (this.selectedBlockUid) {
        const elements = this.getAllBlockElements(this.selectedBlockUid);
        const blockElement = elements[0] || null;
        if (blockElement) {
          this.sendBlockSelected("resizeHandler", blockElement, { blockUid: this.selectedBlockUid });
        }
      }
    };
    window.addEventListener("resize", handleResize);
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
      if (now - lastSent < 1e3) return;
      lastSent = now;
      window.parent.postMessage({ type: "MOUSE_ACTIVITY" }, this.adminOrigin);
    };
    document.addEventListener("mousemove", sendActivity);
    document.addEventListener("mousedown", sendActivity);
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
    let blockUid;
    let editableField;
    let blockElement;
    if (elementOrBlock.hasAttribute("data-edit-text")) {
      editableField = elementOrBlock;
      blockElement = elementOrBlock.closest("[data-block-uid]");
      blockUid = blockElement?.getAttribute("data-block-uid");
    } else {
      blockElement = elementOrBlock;
      blockUid = elementOrBlock.getAttribute("data-block-uid");
      editableField = this.getOwnFirstEditableField(elementOrBlock);
    }
    if (blockUid && this.isBlockReadonly(blockUid)) {
      return;
    }
    if (editableField) {
      editableField.setAttribute("contenteditable", "true");
      const rect = editableField.getBoundingClientRect();
      if (rect.height === 0) {
        editableField.style.minHeight = "1.5em";
      }
      if (rect.width === 0) {
        editableField.style.minWidth = "1em";
      }
    }
    if (editableField && blockUid) {
      if (editableField._hydraListenersAttached) {
        return;
      }
      editableField._hydraListenersAttached = true;
      editableField.addEventListener("beforeinput", (e) => {
        if (e.inputType !== "insertText" || !e.data) return;
        if (!this.prospectiveInlineElement) return;
        const prospectiveInline = this.prospectiveInlineElement;
        if (!prospectiveInline.isConnected) {
          this.prospectiveInlineElement = null;
          return;
        }
        e.preventDefault();
        let inlineTextNode = null;
        for (const child of prospectiveInline.childNodes) {
          if (child.nodeType === Node.TEXT_NODE) {
            inlineTextNode = child;
            break;
          }
        }
        if (inlineTextNode) {
          const selection = window.getSelection();
          inlineTextNode.textContent += e.data;
          const newRange = document.createRange();
          newRange.setStart(inlineTextNode, inlineTextNode.textContent.length);
          newRange.collapse(true);
          selection.removeAllRanges();
          selection.addRange(newRange);
        }
      });
      editableField.addEventListener("paste", (e) => {
        e.preventDefault();
        const html = e.clipboardData.getData("text/html") || e.clipboardData.getData("text/plain");
        this._doPaste(blockUid, html);
      });
      document.addEventListener("copy", (e) => this._doCopy(e));
      if (!this._documentPasteHandler) {
        this._documentPasteHandler = (e) => {
          if (e.defaultPrevented) return;
          if (this.blockedBlockId) {
            e.preventDefault();
            const html = e.clipboardData.getData("text/html") || e.clipboardData.getData("text/plain");
            this.eventBuffer.push({ _type: "paste", html });
            log("BUFFERED paste data (document handler), buffer size:", this.eventBuffer.length);
            return;
          }
          if (this.selectedBlockUid) {
            e.preventDefault();
            const html = e.clipboardData.getData("text/html") || e.clipboardData.getData("text/plain");
            this._doPaste(this.selectedBlockUid, html);
          }
        };
        document.addEventListener("paste", this._documentPasteHandler);
      }
      editableField.addEventListener("beforeinput", (e) => {
        if (e.inputType !== "deleteContentBackward" && e.inputType !== "deleteContentForward") return;
        if (this.preserveLastCharDelete()) {
          e.preventDefault();
        }
      });
      if (this.eventBuffer.length > 0 && !this.blockedBlockId) {
        const buffer = this.eventBuffer.splice(0);
        log("activateEditableField: replaying", buffer.length, "buffered keys for", blockUid);
        this.pendingBufferReplay = { blockId: blockUid, buffer };
        this.replayBufferedEvents();
      }
    }
  }
  /**
   * Handle live keydown events for an editable field.
   * Default: replayOneKey handles everything (same code path as buffered replay).
   * Exceptions let native handle: text characters (performance, IME compat),
   * Paste/Copy (need native clipboard events).
   * If performance issues arise, more keys can be moved to native.
   */
  _handleFieldKeydown(e, blockUid, editableField) {
    if (["Shift", "Control", "Alt", "Meta"].includes(e.key)) return;
    if (e.isComposing) return;
    if (this.handleSpecialKey(blockUid, {
      key: e.key,
      code: e.code,
      shiftKey: e.shiftKey,
      ctrlKey: e.ctrlKey,
      metaKey: e.metaKey,
      altKey: e.altKey
    }, editableField)) {
      e.preventDefault();
      return;
    }
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      this.correctInvalidWhitespaceSelection();
      this.ensureValidInsertionTarget();
    }
  }
  /**
   * Observes changes in the text content of a block.
   * For multi-element blocks, observes ALL elements with the same block UID.
   *
   * @param {HTMLElement} blockElement - The block element to observe.
   */
  /**
   * Temporarily disconnect the text MutationObserver. Call _resumeObserver() to reconnect.
   * Used during internal DOM modifications (whitespace correction, ZWS insertion)
   * that should not be treated as user edits.
   */
  _suppressObserver() {
    if (this.blockTextMutationObserver) {
      this.blockTextMutationObserver.takeRecords();
      this.blockTextMutationObserver.disconnect();
    }
  }
  /**
   * Reconnect the text MutationObserver to the currently selected block.
   */
  _resumeObserver() {
    if (!this.blockTextMutationObserver || !this.selectedBlockUid) return;
    const allElements = this.getAllBlockElements(this.selectedBlockUid);
    for (const element of allElements) {
      this.blockTextMutationObserver.observe(element, {
        subtree: true,
        characterData: true,
        childList: true
      });
    }
  }
  /**
   * Sets up a MutationObserver on document.body that watches for structural
   * DOM changes (childList). When the framework adds/removes block elements,
   * this runs all-blocks operations: materializeHydraComments, markEmptyBlocks,
   * applyReadonlyVisuals, applyPlaceholders.
   *
   * Separate from blockTextMutationObserver (which tracks text changes in the
   * selected block for inline editing). This observer is never disconnected
   * during renders — it fires whenever the framework patches the DOM.
   * Debounced via rAF to batch rapid mutations from a single render pass.
   */
  setupStructuralObserver() {
    if (this._structuralObserver) return;
    let pendingRAF = null;
    const runAllBlocksOps = () => {
      pendingRAF = null;
      const t0 = performance.now();
      this.materializeHydraComments();
      const t1 = performance.now();
      this.markEmptyBlocks();
      const t2 = performance.now();
      this.applyReadonlyVisuals();
      const t3 = performance.now();
      this.applyPlaceholders();
      const t4 = performance.now();
      const total = t4 - t0;
      if (total > 5) {
        log("runAllBlocksOps:", total.toFixed(0) + "ms (materialize:", (t1 - t0).toFixed(0), "empty:", (t2 - t1).toFixed(0), "readonly:", (t3 - t2).toFixed(0), "placeholders:", (t4 - t3).toFixed(0) + ")");
      }
      if (this._onDomSettled && !pendingRAF) {
        const cb = this._onDomSettled;
        this._onDomSettled = null;
        cb();
      }
    };
    this._structuralObserver = new MutationObserver(() => {
      if (pendingRAF) cancelAnimationFrame(pendingRAF);
      pendingRAF = requestAnimationFrame(runAllBlocksOps);
    });
    this._structuralObserver.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
  observeBlockTextChanges(blockElement) {
    const blockUid = blockElement.getAttribute("data-block-uid");
    log("observeBlockTextChanges called for block:", blockUid);
    if (this.blockTextMutationObserver) {
      this.blockTextMutationObserver.disconnect();
    }
    this.blockTextMutationObserver = new MutationObserver((mutations) => {
      log("MutationObserver fired, mutations:", mutations.length, "isInlineEditing:", this.isInlineEditing);
      mutations.forEach((mutation) => {
        log("Mutation:", mutation.type, "target:", mutation.target?.nodeName, "text:", mutation.target?.textContent?.substring(0, 50));
        if (mutation.type === "characterData" && this.isInlineEditing && !this._renderInProgress) {
          const mutatedTextNode = mutation.target;
          const parentEl = mutation.target?.parentElement;
          const targetElement = parentEl?.closest("[data-edit-text]");
          log("characterData mutation: parentEl=", parentEl?.tagName, "targetElement=", targetElement?.tagName, "targetElement has attr:", targetElement?.hasAttribute?.("data-edit-text"));
          if (targetElement) {
            this.handleTextChange(targetElement, parentEl, mutatedTextNode);
          } else {
            console.warn("[HYDRA] No targetElement found, parent chain:", parentEl?.outerHTML?.substring(0, 100));
          }
        }
        if (mutation.type === "childList" && this.isInlineEditing && !this._renderInProgress) {
          const parent = mutation.target;
          if (parent?.nodeType === Node.ELEMENT_NODE) {
            const targetElement = parent.closest?.("[data-edit-text]");
            if (targetElement) {
              const addedTextNode = Array.from(mutation.addedNodes).find(
                (n) => n.nodeType === Node.TEXT_NODE
              );
              if (addedTextNode) {
                this.handleTextChange(targetElement, parent, addedTextNode);
              }
            }
          }
        }
      });
    });
    if (blockUid) {
      const allElements = this.getAllBlockElements(blockUid);
      for (const element of allElements) {
        this.blockTextMutationObserver.observe(element, {
          subtree: true,
          characterData: true,
          childList: true
        });
      }
    } else {
      this.blockTextMutationObserver.observe(blockElement, {
        subtree: true,
        characterData: true,
        childList: true
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
    return partiallyVisible ? (top > 0 && top < innerHeight || bottom > 0 && bottom < innerHeight) && (left > 0 && left < innerWidth || right > 0 && right < innerWidth) : top >= 0 && left >= 0 && bottom <= innerHeight && right <= innerWidth;
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
    const blockPosition = scrollRect.height > availableHeight ? "start" : "center";
    el.scrollIntoView({ behavior: "instant", block: blockPosition });
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
    this._renderStartTime = performance.now();
    const blockId = this.selectedBlockUid;
    const blockEl = blockId && this.queryBlockElement(blockId);
    if (this._isEchoFormData && !afterRenderOptions.skipRender && !this.blockedBlockId) {
      log("_executeRender: echo FORM_DATA (identical data), skipping re-render");
      this._renderInProgress = false;
      return;
    }
    if (this.isInlineEditing && this.focusedFieldName && !this.blockedBlockId) {
      this._ensureDocumentKeyboardBlocker();
      this.blockedBlockId = this.selectedBlockUid;
      this._reRenderBlocking = true;
      this._setPointerBlocking(true);
      this._preRenderSelection = this.savedSelection;
    }
    if (this.blockTextMutationObserver) {
      this.blockTextMutationObserver.disconnect();
    }
    callbackFn(this.formData);
    const afterRender = () => {
      this.afterContentRender(afterRenderOptions);
    };
    const { ready: contentReady } = this._areBlocksReady(blockId, blockEl, afterRenderOptions);
    const isStructuralChange = !!afterRenderOptions.adminSelectedBlockUid;
    const needsFastPath = this.pendingTransform || this._reRenderBlocking && this._iframeFocused && !isStructuralChange;
    let navigationTriggered = false;
    let contentRetryBudget = 0;
    const CONTENT_RETRIES = 60;
    const NAV_CONTENT_RETRIES = 60;
    const pollBlocksReady = (retries = CONTENT_RETRIES) => {
      const newBlockId = afterRenderOptions.adminSelectedBlockUid;
      const result = this._areBlocksReady(blockId, blockId && this.queryBlockElement(blockId), afterRenderOptions);
      if (result.ready) {
        const elapsed = this._renderStartTime ? (performance.now() - this._renderStartTime).toFixed(0) : "?";
        log("pollBlocksReady: DONE +" + elapsed + "ms ready=true");
        afterRender();
        return;
      }
      if (newBlockId && !result.targetVisible && !navigationTriggered) {
        if (!this._navigatingToBlock) {
          this.tryMakeBlockVisible(newBlockId);
        }
        navigationTriggered = true;
      }
      if (navigationTriggered && result.targetVisible && !contentRetryBudget) {
        contentRetryBudget = NAV_CONTENT_RETRIES;
        log("pollBlocksReady: target visible after navigation, resetting content retries");
      }
      if (contentRetryBudget > 0) {
        contentRetryBudget--;
        if (contentRetryBudget <= 0) {
          const elapsed = this._renderStartTime ? (performance.now() - this._renderStartTime).toFixed(0) : "?";
          log("pollBlocksReady: TIMEOUT +" + elapsed + "ms target visible after nav, proceeding");
          afterRender();
          return;
        }
      } else if (retries <= 0) {
        const elapsed = this._renderStartTime ? (performance.now() - this._renderStartTime).toFixed(0) : "?";
        if (result.targetVisible || !newBlockId) {
          log("pollBlocksReady: TIMEOUT +" + elapsed + "ms proceeding anyway");
          afterRender();
        } else {
          log("pollBlocksReady: TIMEOUT +" + elapsed + "ms target NOT visible, falling back");
          const prevEl = blockId && this.queryBlockElement(blockId);
          if (prevEl && !this.isElementHidden(prevEl)) {
            log("pollBlocksReady: fallback to previous block:", blockId);
            afterRenderOptions.adminSelectedBlockUid = null;
            afterRenderOptions.needsBlockSwitch = false;
            this.selectBlock(prevEl);
          } else {
            const targetEl = newBlockId && this.queryBlockElement(newBlockId);
            const container = (targetEl || prevEl)?.closest?.("[data-block-uid]");
            if (container && !this.isElementHidden(container)) {
              const containerId = container.getAttribute("data-block-uid");
              log("pollBlocksReady: fallback to parent container:", containerId);
              afterRenderOptions.adminSelectedBlockUid = null;
              this.selectBlock(container);
            } else {
              log("pollBlocksReady: nothing visible, deselecting");
              this.sendMessageToParent({ type: "BLOCK_DESELECTED" });
            }
          }
          afterRender();
        }
        return;
      }
      requestAnimationFrame(() => pollBlocksReady(retries - 1));
    };
    log("_executeRender: contentReady:", contentReady, "skipRender:", !!afterRenderOptions.skipRender, "pendingTransform:", !!this.pendingTransform, "_reRenderBlocking:", !!this._reRenderBlocking, "needsFastPath:", needsFastPath, "isStructuralChange:", isStructuralChange);
    if (afterRenderOptions.skipRender) {
      afterRender();
    } else if (needsFastPath && contentReady) {
      afterRender();
    } else if (isStructuralChange) {
      const settleTimeout = setTimeout(() => {
        if (this._onDomSettled) {
          this._onDomSettled = null;
          pollBlocksReady();
        }
      }, 200);
      this._onDomSettled = () => {
        clearTimeout(settleTimeout);
        pollBlocksReady();
      };
    } else if (contentReady) {
      const settleTimeout = setTimeout(() => {
        if (this._onDomSettled) {
          this._onDomSettled = null;
          afterRender();
        }
      }, 200);
      this._onDomSettled = () => {
        clearTimeout(settleTimeout);
        afterRender();
      };
    } else {
      requestAnimationFrame(() => pollBlocksReady());
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
      log("_waitForDomMutation proceed via:", source);
      callback();
    };
    const observer = new MutationObserver(() => {
      proceed("mutation");
    });
    observer.observe(element, { childList: true, subtree: true, characterData: true });
    setTimeout(() => proceed("timeout"), 200);
  }
  /**
   * Checks if an element is hidden (display: none, visibility: hidden, or zero dimensions)
   * @param {HTMLElement} el - The element to check
   * @returns {boolean} True if the element is hidden
   */
  isElementHidden(el) {
    if (!el) return true;
    const style = window.getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden") {
      return true;
    }
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) {
      return true;
    }
    const container = el.parentElement?.closest("[data-block-uid]");
    if (container) {
      const containerRect = container.getBoundingClientRect();
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
    let all = document.querySelectorAll(`[data-block-uid="${uid}"]`);
    if (all.length === 0) {
      this.materializeHydraComments();
      all = document.querySelectorAll(`[data-block-uid="${uid}"]`);
      if (all.length === 0) return null;
    }
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
    this._navigatingToBlock = targetUid;
    const directSelector = document.querySelector(
      `[data-block-selector="${targetUid}"]`
    );
    let clickedSelector = null;
    let nextUid = targetUid;
    if (directSelector) {
      log(`tryMakeBlockVisible: found direct selector for ${targetUid}`);
      clickedSelector = directSelector;
    } else {
      log(`tryMakeBlockVisible: no direct selector, trying +1/-1 navigation`);
      const targetElement = this.queryBlockElement(targetUid);
      if (!targetElement) {
        log(`tryMakeBlockVisible: target element not in DOM`);
        return false;
      }
      const containerBlock = targetElement.parentElement?.closest("[data-block-uid]");
      if (!containerBlock) {
        log(`tryMakeBlockVisible: no container block found`);
        return false;
      }
      const containerUid = containerBlock.getAttribute("data-block-uid");
      const directParent = targetElement.parentElement;
      if (!directParent) {
        log(`tryMakeBlockVisible: no parent element`);
        return false;
      }
      const siblings = Array.from(
        directParent.querySelectorAll(":scope > [data-block-uid]")
      );
      log(`tryMakeBlockVisible: found ${siblings.length} siblings in container ${containerUid}`);
      const targetIndex = siblings.findIndex(
        (el) => el.getAttribute("data-block-uid") === targetUid
      );
      if (targetIndex === -1) {
        log(`tryMakeBlockVisible: target not in siblings`);
        return false;
      }
      const currentIndex = siblings.findIndex((el) => !this.isElementHidden(el));
      const currentUid = currentIndex >= 0 ? siblings[currentIndex].getAttribute("data-block-uid") : null;
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
      const direction = stepsNeeded > 0 ? "+1" : "-1";
      const explicitSelector = document.querySelector(
        `[data-block-selector="${currentUid}:${direction}"]`
      );
      if (explicitSelector) {
        log(`tryMakeBlockVisible: found explicit selector ${currentUid}:${direction}`);
        clickedSelector = explicitSelector;
      } else {
        const simpleSelector = containerBlock.querySelector(
          `[data-block-selector="${direction}"]`
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
      const nextIndex = currentIndex + (stepsNeeded > 0 ? 1 : -1);
      const nextBlock = siblings[nextIndex];
      nextUid = nextBlock?.getAttribute("data-block-uid");
      log(`tryMakeBlockVisible: clicking ${direction}, expecting ${nextUid} to become visible`);
    }
    clickedSelector.click();
    log(`tryMakeBlockVisible: click() called`);
    const startTime = performance.now();
    const MAX_WAIT_MS = 2e3;
    const checkVisibility = () => {
      const elapsed = performance.now() - startTime;
      const currentNextBlock = this.queryBlockElement(nextUid);
      if (elapsed > 0 && Math.floor(elapsed / 500) !== Math.floor((elapsed - 16) / 500)) {
        if (currentNextBlock) {
          const rect = currentNextBlock.getBoundingClientRect();
          const container = currentNextBlock.parentElement?.closest("[data-block-uid]");
          const containerRect = container?.getBoundingClientRect();
          log(`tryMakeBlockVisible debug: rect=${Math.round(rect.width)}x${Math.round(rect.height)} left=${Math.round(rect.left)} containerLeft=${containerRect ? Math.round(containerRect.left) : "none"} containerRight=${containerRect ? Math.round(containerRect.right) : "none"}`);
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
    const blockUid = blockElement.getAttribute("data-block-uid");
    return this.collectBlockFields(
      blockElement,
      "data-edit-text",
      (el, name, results) => {
        results[name] = this.getFieldType(blockUid, name) || "string";
      }
    );
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
            !this.elementIsVisibleInViewport(blockElement, true) && blockElement.scrollIntoView({ behavior: "smooth" });
            observer.disconnect();
            return;
          }
        }
      }
    });
    this.blockObserver.observe(document.body, {
      childList: true,
      subtree: true
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
    const t0 = performance.now();
    if (!this.formData) return;
    if (!this.blockPathMap) {
      throw new Error("[HYDRA] blockPathMap is required but was not provided by admin");
    }
    const pathMapBlocks = Object.keys(this.blockPathMap);
    const formDataBlocks = Object.keys(this.formData.blocks || {});
    const missingFromPathMap = formDataBlocks.filter((id) => !pathMapBlocks.includes(id));
    log("addNodeIdsToAllSlateFields: pathMap has", pathMapBlocks.length, "blocks, formData has", formDataBlocks.length, "blocks, missing:", missingFromPathMap.length > 0 ? missingFromPathMap : "none");
    let slateCalls = 0;
    Object.entries(this.blockPathMap).forEach(([blockId, pathInfo]) => {
      const block = this.getBlockData(blockId);
      if (!block) return;
      const schema = this.getBlockSchema(blockId);
      if (!schema?.properties) return;
      Object.entries(schema.properties).forEach(([fieldName, fieldDef]) => {
        if (isSlateFieldType(getFieldTypeString(fieldDef)) && block[fieldName]) {
          block[fieldName] = this.addNodeIds(block[fieldName]);
          slateCalls++;
        }
      });
    });
    log("addNodeIdsToAllSlateFields took", (performance.now() - t0).toFixed(1) + "ms, slate fields:", slateCalls);
  }
  /**
   * Add path-based nodeIds to each element in the Slate block's children
   * @param {JSON} json Selected Block's data
   * @param {string} path Path in the Slate structure (e.g., "0.1.2")
   * @returns {JSON} block's data with nodeIds added
   */
  addNodeIds(json, path = "") {
    if (Array.isArray(json)) {
      return json.map((item, index) => {
        const itemPath = path ? `${path}.${index}` : `${index}`;
        return this.addNodeIds(item, itemPath);
      });
    } else if (typeof json === "object" && json !== null) {
      json = JSON.parse(JSON.stringify(json));
      const isTextNode = json.hasOwnProperty("text") && !json.hasOwnProperty("children") && !json.hasOwnProperty("type");
      if (isTextNode) {
        return json;
      }
      json.nodeId = path;
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
      const startElement = startContainer.nodeType === Node.TEXT_NODE ? startContainer.parentElement : startContainer;
      const endElement = endContainer.nodeType === Node.TEXT_NODE ? endContainer.parentElement : endContainer;
      let startNode = startElement;
      while (startNode && !(startNode.hasAttribute?.("data-node-id") && isValidNodeId(startNode.getAttribute("data-node-id")))) {
        startNode = startNode.parentElement;
      }
      let endNode = endElement;
      while (endNode && !(endNode.hasAttribute?.("data-node-id") && isValidNodeId(endNode.getAttribute("data-node-id")))) {
        endNode = endNode.parentElement;
      }
      if (!startNode || !endNode) {
        return null;
      }
      return {
        startNodeId: startNode.getAttribute("data-node-id"),
        endNodeId: endNode.getAttribute("data-node-id"),
        startOffset: range.startOffset,
        endOffset: range.endOffset,
        isCollapsed: range.collapsed
      };
    } catch (e) {
      console.error("[HYDRA] Error saving cursor position:", e);
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
      const blockElement = this.selectedBlockUid ? this.queryBlockElement(this.selectedBlockUid) : document;
      const startNode = blockElement?.querySelector(`[data-node-id="${savedCursor.startNodeId}"]`);
      const endNode = blockElement?.querySelector(`[data-node-id="${savedCursor.endNodeId}"]`);
      if (!startNode || !endNode) {
        return;
      }
      const startTextNode = startNode.childNodes[0] || startNode;
      const endTextNode = endNode.childNodes[0] || endNode;
      const range = document.createRange();
      const selection = window.getSelection();
      const startOffset = Math.min(savedCursor.startOffset, startTextNode.textContent?.length || 0);
      const endOffset = Math.min(savedCursor.endOffset, endTextNode.textContent?.length || 0);
      range.setStart(startTextNode, startOffset);
      range.setEnd(endTextNode, endOffset);
      selection?.removeAllRanges();
      selection?.addRange(range);
    } catch (e) {
      console.error("[HYDRA] Error restoring cursor position:", e);
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
   * @returns {boolean} true if selection was restored, false if it failed
   */
  restoreSlateSelection(slateSelection, formData) {
    log("restoreSlateSelection called with:", JSON.stringify(slateSelection));
    if (!slateSelection || !slateSelection.anchor || !slateSelection.focus) {
      console.warn("[HYDRA] restoreSlateSelection failed: invalid selection", slateSelection);
      return false;
    }
    try {
      if (!this.selectedBlockUid || !this.focusedFieldName) {
        log("restoreSlateSelection failed: missing selectedBlockUid or focusedFieldName");
        return false;
      }
      const block = this.getBlockData(this.selectedBlockUid);
      if (!block) {
        log("restoreSlateSelection failed: block not found", this.selectedBlockUid);
        return false;
      }
      const resolved = this.resolveFieldPath(this.focusedFieldName, this.selectedBlockUid);
      const fieldData = this.getBlockData(resolved.blockId);
      const fieldType = this.getFieldType(this.selectedBlockUid, this.focusedFieldName);
      const fieldValue = fieldData?.[resolved.fieldName];
      const blockElement = this.queryBlockElement(this.selectedBlockUid);
      if (!blockElement) {
        log("restoreSlateSelection failed: block element not in DOM", this.selectedBlockUid);
        return false;
      }
      const isSlateWithNodeIds = this.fieldTypeIsSlate(fieldType) && Array.isArray(fieldValue) && fieldValue.length > 0 && fieldValue[0]?.nodeId !== void 0;
      let anchorElement, focusElement;
      let anchorPos = null;
      let focusPos = null;
      let anchorOffset = slateSelection.anchor.offset;
      let focusOffset = slateSelection.focus.offset;
      if (isSlateWithNodeIds) {
        const anchorResult = this.getNodeIdFromPath(fieldValue, slateSelection.anchor.path);
        const focusResult = this.getNodeIdFromPath(fieldValue, slateSelection.focus.path);
        if (!anchorResult || !focusResult) {
          console.warn("[HYDRA] restoreSlateSelection failed: could not get nodeId from path");
          return false;
        }
        anchorElement = blockElement.querySelector(`[data-node-id="${anchorResult.nodeId}"]`);
        focusElement = blockElement.querySelector(`[data-node-id="${focusResult.nodeId}"]`);
        if (!anchorElement || !focusElement) {
          console.warn(
            "[HYDRA] restoreSlateSelection failed: nodeId elements not found",
            { anchorNodeId: anchorResult.nodeId, focusNodeId: focusResult.nodeId }
          );
          return false;
        }
        log("restoreSlateSelection: looking for nodeIds", {
          anchorNodeId: anchorResult.nodeId,
          focusNodeId: focusResult.nodeId,
          anchorElementFound: !!anchorElement,
          focusElementFound: !!focusElement,
          anchorElementTag: anchorElement?.tagName,
          focusElementTag: focusElement?.tagName,
          anchorElementHTML: anchorElement?.outerHTML?.substring(0, 100)
        });
        if (!anchorElement || !focusElement) {
          console.warn("[HYDRA] restoreSlateSelection failed: could not find elements by nodeId");
          return false;
        }
        const ensureZwsPosition = (result, offset, parentChildren) => {
          if (result.textChildIndex !== null && offset === 0 && result.textChildIndex > 0) {
            const prevChild = parentChildren[result.textChildIndex - 1];
            if (prevChild && prevChild.type && prevChild.nodeId) {
              const inlineElement = blockElement.querySelector(`[data-node-id="${prevChild.nodeId}"]`);
              if (inlineElement) {
                const existingTextNode = inlineElement.nextSibling;
                log("restoreSlateSelection: cursor exit check - inlineElement.nextSibling:", existingTextNode?.nodeType, "text:", JSON.stringify(existingTextNode?.textContent));
                if (existingTextNode && existingTextNode.nodeType === Node.TEXT_NODE) {
                  const existingText = existingTextNode.textContent.replace(/[\uFEFF\u200B]/g, "");
                  if (existingText.length > 0) {
                    if (!existingTextNode.textContent.startsWith("\uFEFF")) {
                      existingTextNode.textContent = "\uFEFF" + existingTextNode.textContent;
                    }
                    log("restoreSlateSelection: cursor exit - prepended ZWS to existing text, positioning after ZWS");
                    return { node: existingTextNode, offset: 1 };
                  }
                }
                const zwsNode = document.createTextNode("\uFEFF");
                inlineElement.parentNode.insertBefore(zwsNode, inlineElement.nextSibling);
                log("restoreSlateSelection: cursor exit - created ZWS after inline:", prevChild.nodeId);
                return { node: zwsNode, offset: 1 };
              }
            }
          }
          const targetElement = blockElement.querySelector(`[data-node-id="${result.nodeId}"]`);
          if (targetElement && offset === 0) {
            const visibleText = targetElement.textContent.replace(/[\uFEFF\u200B]/g, "");
            if (visibleText === "") {
              const zwsNode = document.createTextNode("\uFEFF");
              targetElement.appendChild(zwsNode);
              log("restoreSlateSelection: prospective formatting - created ZWS inside empty inline:", result.nodeId);
              this.prospectiveInlineElement = targetElement;
              return { node: zwsNode, offset: 1 };
            }
          }
          return null;
        };
        const isCollapsed = slateSelection.anchor.path.toString() === slateSelection.focus.path.toString() && slateSelection.anchor.offset === slateSelection.focus.offset;
        if (isCollapsed) {
          if (anchorResult.parentChildren) {
            anchorPos = ensureZwsPosition(anchorResult, slateSelection.anchor.offset, anchorResult.parentChildren);
          }
          if (focusResult.parentChildren) {
            focusPos = ensureZwsPosition(focusResult, slateSelection.focus.offset, focusResult.parentChildren);
          }
        }
        if (!anchorPos) {
          if (anchorResult.textChildIndex !== null && anchorResult.parentChildren) {
            anchorOffset = this.calculateAbsoluteOffset(
              anchorResult.parentChildren,
              anchorResult.textChildIndex,
              slateSelection.anchor.offset
            );
            log("Calculated absolute anchor offset:", anchorOffset, "from textChildIndex:", anchorResult.textChildIndex);
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
            log("Calculated absolute focus offset:", focusOffset, "from textChildIndex:", focusResult.textChildIndex);
          }
          focusPos = this.findPositionByVisibleOffset(focusElement, focusOffset);
        }
      } else {
        const editableField = this.getEditableFieldByName(blockElement, this.focusedFieldName);
        if (!editableField) {
          console.warn("[HYDRA] restoreSlateSelection failed: editable field not found:", this.focusedFieldName);
          return false;
        }
        anchorElement = focusElement = editableField;
        anchorPos = this.findPositionByVisibleOffset(anchorElement, anchorOffset);
        focusPos = this.findPositionByVisibleOffset(focusElement, focusOffset);
      }
      if (!anchorPos || !focusPos) {
        console.warn("[HYDRA] restoreSlateSelection failed: could not find positions by visible offset");
        return false;
      }
      const selection = window.getSelection();
      if (!selection) return false;
      const editableElement = anchorElement.closest('[contenteditable="true"]') || anchorElement;
      if (editableElement && typeof editableElement.focus === "function") {
        editableElement.focus();
      }
      const range = document.createRange();
      range.setStart(anchorPos.node, anchorPos.offset);
      range.setEnd(focusPos.node, focusPos.offset);
      selection.removeAllRanges();
      selection.addRange(range);
      return true;
    } catch (e) {
      console.error("[HYDRA] restoreSlateSelection failed with error:", e);
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
    const visibleLength = (text) => text.replace(zwsPattern, "").length;
    log("findPositionByVisibleOffset: element=", element.tagName, "nodeId=", element.getAttribute("data-node-id"), "targetOffset=", targetOffset);
    if (targetOffset === 0) {
      const walker2 = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null, false);
      let firstText = walker2.nextNode();
      while (firstText && firstText.textContent.length === 0) {
        log("findPositionByVisibleOffset: offset=0, skipping empty text node");
        firstText = walker2.nextNode();
      }
      if (firstText) {
        if (visibleLength(firstText.textContent) === 0) {
          log("findPositionByVisibleOffset: offset=0, ZWS-only node, returning end:", firstText.textContent.length);
          return { node: firstText, offset: firstText.textContent.length };
        }
        log("findPositionByVisibleOffset: offset=0, returning start of first text");
        return { node: firstText, offset: 0 };
      }
      return null;
    }
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null, false);
    let visibleOffset = 0;
    let node;
    let nodeIndex = 0;
    while (node = walker.nextNode()) {
      const text = node.textContent;
      const nodeVisibleLen = visibleLength(text);
      log("findPositionByVisibleOffset: node[" + nodeIndex + "]:", {
        text: JSON.stringify(text),
        visibleLen: nodeVisibleLen,
        visibleOffset,
        parentTag: node.parentElement?.tagName,
        parentNodeId: node.parentElement?.getAttribute("data-node-id")
      });
      nodeIndex++;
      for (let i = 0; i <= text.length; i++) {
        const visibleCharsUpToI = visibleLength(text.substring(0, i));
        const totalVisible = visibleOffset + visibleCharsUpToI;
        if (totalVisible === targetOffset) {
          if (i === text.length) {
            let nextNode = walker.nextNode();
            while (nextNode && nextNode.textContent.length === 0) {
              log("findPositionByVisibleOffset: at end of node, skipping empty nextNode");
              nextNode = walker.nextNode();
            }
            if (nextNode) {
              const nextVisibleLen = visibleLength(nextNode.textContent);
              if (nextVisibleLen === 0 && nextNode.textContent.length > 0) {
                log("findPositionByVisibleOffset: at end of node, nextNode is ZWS, positioning AFTER ZWS");
                return { node: nextNode, offset: nextNode.textContent.length };
              }
              log("findPositionByVisibleOffset: at end of node, preferring next node");
              return { node: nextNode, offset: 0 };
            }
            walker.currentNode = node;
          }
          log("findPositionByVisibleOffset: FOUND at node offset", i);
          return { node, offset: i };
        }
        if (totalVisible > targetOffset) {
          log("findPositionByVisibleOffset: PASSED target, returning", i - 1);
          return i > 0 ? { node, offset: i - 1 } : null;
        }
      }
      visibleOffset += nodeVisibleLen;
    }
    const lastWalker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null, false);
    let lastNonEmptyNode = null;
    while (node = lastWalker.nextNode()) {
      if (node.textContent.length > 0) {
        lastNonEmptyNode = node;
      }
    }
    if (lastNonEmptyNode) {
      log("findPositionByVisibleOffset: exhausted nodes, returning end of last non-empty node");
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
        if (child.textContent.length === 0) {
          continue;
        }
        if (slateIndex === slateChildIndex) {
          return child;
        }
        slateIndex++;
        lastNodeId = null;
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        const nodeId = child.getAttribute("data-node-id");
        if (isValidNodeId(nodeId) && nodeId !== lastNodeId) {
          if (slateIndex === slateChildIndex) {
            return child;
          }
          slateIndex++;
          lastNodeId = nodeId;
        }
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
    const isEmptyTextNode = (textNode) => {
      return textNode.textContent.length === 0;
    };
    const adjustOffsetForZWS = (textNode, requestedOffset) => {
      const zwsPattern = /^[\uFEFF\u200B]+$/;
      if (requestedOffset === 0 && zwsPattern.test(textNode.textContent)) {
        log("findTextNodeInChild: ZWS node detected, positioning after ZWS");
        return textNode.textContent.length;
      }
      return Math.min(requestedOffset, textNode.textContent.length);
    };
    if (child.nodeType === Node.TEXT_NODE) {
      if (isEmptyTextNode(child)) {
        return null;
      }
      const validOffset = adjustOffsetForZWS(child, offset);
      return { node: child, offset: validOffset };
    }
    if (child.nodeType === Node.ELEMENT_NODE) {
      const walker = document.createTreeWalker(
        child,
        NodeFilter.SHOW_TEXT,
        null,
        false
      );
      let textNode = walker.nextNode();
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
    for (let i = 0; i < path.length; i++) {
      const index = path[i];
      parentNode = node;
      lastIndex = index;
      if (Array.isArray(node)) {
        node = node[index];
      } else if (node.children) {
        node = node.children[index];
      } else {
        console.warn("[HYDRA] Could not follow path:", path, "at index", i);
        return null;
      }
      if (!node) {
        console.warn("[HYDRA] Node not found at path:", path, "index", i);
        return null;
      }
    }
    if (node.hasOwnProperty("text") && parentNode && parentNode.nodeId) {
      log("Path points to text node at index", lastIndex, "using parent nodeId:", parentNode.nodeId);
      return {
        nodeId: parentNode.nodeId,
        textChildIndex: lastIndex,
        parentChildren: parentNode.children || null
      };
    }
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
    if (node.hasOwnProperty("text")) {
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
  /** Delegate to standalone deepEqual for key-order-independent comparison. */
  _deepEqual(a, b) {
    return deepEqual(a, b);
  }
  /**
   * Get formData with nodeIds stripped for sending to Admin UI
   * NodeIds are internal to hydra.js for DOM<->Slate translation
   * @returns {Object} Deep copy of formData without nodeIds
   */
  getFormDataWithoutNodeIds() {
    const formDataCopy = JSON.parse(JSON.stringify(this.formData));
    const stripNodeIdsFromSlateFields = (blocks) => {
      if (!blocks || typeof blocks !== "object") return;
      for (const blockId of Object.keys(blocks)) {
        const block = blocks[blockId];
        const schema = this.getBlockSchema(blockId);
        if (block && schema?.properties) {
          for (const [fieldName, fieldDef] of Object.entries(schema.properties)) {
            if (isSlateFieldType(getFieldTypeString(fieldDef)) && block[fieldName]) {
              this.resetJsonNodeIds(block[fieldName]);
            }
          }
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
    if (!this.focusedFieldName) {
      return true;
    }
    const resolved = this.resolveFieldPath(this.focusedFieldName, this.selectedBlockUid);
    let fieldA, fieldB;
    if (resolved.blockId === PAGE_BLOCK_UID) {
      fieldA = formDataA?.[resolved.fieldName];
      fieldB = formDataB?.[resolved.fieldName];
      log("focusedFieldValuesEqual (page-level):", fieldA === fieldB, "field:", resolved.fieldName, "A:", fieldA, "B:", fieldB);
      return fieldA === fieldB;
    }
    const pathInfo = this.blockPathMap?.[resolved.blockId];
    let blockA, blockB;
    if (pathInfo?.path) {
      blockA = formDataA;
      blockB = formDataB;
      for (const key of pathInfo.path) {
        blockA = blockA?.[key];
        blockB = blockB?.[key];
      }
    } else {
      blockA = formDataA?.blocks?.[resolved.blockId];
      blockB = formDataB?.blocks?.[resolved.blockId];
    }
    if (!blockA || !blockB) {
      return false;
    }
    fieldA = blockA[resolved.fieldName];
    fieldB = blockB[resolved.fieldName];
    if (fieldA === void 0 || fieldB === void 0) {
      return fieldA === fieldB;
    }
    const copyA = JSON.parse(JSON.stringify(fieldA));
    const copyB = JSON.parse(JSON.stringify(fieldB));
    this.resetJsonNodeIds(copyA);
    this.resetJsonNodeIds(copyB);
    const isEqual = deepEqual(copyA, copyB);
    log("focusedFieldValuesEqual:", isEqual, "A:", JSON.stringify(copyA).substring(0, 100), "B:", JSON.stringify(copyB).substring(0, 100));
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
    const schema = this.getBlockSchema(resolved.blockId);
    const fieldDef = schema?.properties?.[resolved.fieldName];
    if (!fieldDef) return void 0;
    return getFieldTypeString(fieldDef);
  }
  /**
   * Get the placeholder text for a given block field.
   * Checks three sources in priority order:
   * 1. Instance-level: block.fieldPlaceholders[fieldName] (from template authoring)
   * 2. Schema-level: resolvedBlockSchema.properties[fieldName].placeholder
   * @param {string} blockUid - The block UID
   * @param {string} fieldName - The field name
   * @returns {string|undefined} Placeholder text or undefined
   */
  getFieldPlaceholder(blockUid, fieldName) {
    const resolved = this.resolveFieldPath(fieldName, blockUid);
    const block = this.getBlockData(resolved.blockId);
    const instancePlaceholder = block?.fieldPlaceholders?.[resolved.fieldName];
    if (instancePlaceholder) {
      if (typeof instancePlaceholder === "string") return instancePlaceholder;
      if (Array.isArray(instancePlaceholder)) {
        const text = instancePlaceholder.map(
          (n) => (n.children || []).map((c) => c.text || "").join("")
        ).join(" ").trim();
        if (text) return text;
      }
    }
    const fieldDef = this.getBlockSchema(resolved.blockId)?.properties?.[resolved.fieldName];
    return fieldDef?.placeholder || void 0;
  }
  /**
   * Update the data-empty attribute on an editable field based on its text content.
   * Treats ZWS-only content as empty.
   * @param {HTMLElement} field - The editable field element
   */
  updateEmptyState(field) {
    const text = field.textContent?.replace(/[\u200B\uFEFF]/g, "").trim();
    const isEmpty = !text;
    const doc = field.ownerDocument;
    const isFocused = doc && (doc.activeElement === field || field.contains(doc.activeElement));
    field.toggleAttribute("data-empty", isEmpty && !isFocused);
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
    if (this.textUpdateTimer) {
      clearTimeout(this.textUpdateTimer);
      this.textUpdateTimer = null;
    }
    this.pendingTextUpdate = null;
    this.setBlockProcessing(blockUid, true, requestId);
    this.formData._editSequence = (this.formData?._editSequence || 0) + 1;
    const data = this.getFormDataWithoutNodeIds();
    window.parent.postMessage({
      type: "SLATE_TRANSFORM_REQUEST",
      transformType,
      blockId: blockUid,
      fieldName: this.focusedFieldName || "value",
      data,
      selection: this.serializeSelection() || {},
      requestId,
      ...transformFields
    }, this.adminOrigin);
    this._transformSentAt = performance.now();
    this._transformSentDateNow = Date.now();
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
    const blockElement = target.closest("[data-block-uid]");
    const blockUid = blockElement?.getAttribute("data-block-uid") || null;
    const editableField = target.getAttribute("data-edit-text");
    if (!editableField) {
      console.warn("[HYDRA] handleTextChange: No data-edit-text found");
      return;
    }
    const fieldType = this.getFieldType(blockUid, editableField);
    if (this.fieldTypeIsSlate(fieldType)) {
      const block = this.getBlockData(blockUid);
      if (!block || !block[editableField]) {
        log("handleTextChange: block or field not found for", blockUid, editableField);
        return;
      }
      const freshValue = this.readSlateValueFromDOM(target, block[editableField]);
      const freshStr = JSON.stringify(freshValue);
      const currentStr = JSON.stringify(block[editableField]);
      if (freshStr === currentStr) {
        log("handleTextChange: DOM matches formData, skipping");
        return;
      }
      log("handleTextChange: DIFF fresh=", freshStr);
      log("handleTextChange: DIFF current=", currentStr);
      block[editableField] = freshValue;
      log("handleTextChange: updated", editableField);
    } else {
      const resolved = this.resolveFieldPath(editableField, blockUid);
      const targetData = this.getBlockData(resolved.blockId);
      if (targetData) {
        targetData[resolved.fieldName] = this.stripZeroWidthSpaces(target.innerText);
        log("handleTextChange: updated field:", resolved.fieldName);
      }
    }
    this.updateEmptyState(target);
    this.bufferUpdate(this.fieldTypeIsSlate(fieldType) ? "textChangeSlate" : "textChange");
    if (this.fieldTypeIsSlate(fieldType)) {
      const plaintext = this.stripZeroWidthSpaces(target.textContent || "").trim();
      const slashMatch = plaintext.match(/^\/([\p{L}\p{N}]*)$/u);
      if (slashMatch) {
        this._slashMenuActive = true;
        const fieldRect = target.getBoundingClientRect();
        this.sendMessageToParent({
          type: "SLASH_MENU",
          action: "filter",
          blockId: blockUid,
          filter: slashMatch[1],
          fieldRect: {
            top: fieldRect.top,
            bottom: fieldRect.bottom,
            left: fieldRect.left,
            width: fieldRect.width
          }
        });
      } else if (this._slashMenuActive) {
        this._slashMenuActive = false;
        this.sendMessageToParent({
          type: "SLASH_MENU",
          action: "hide",
          blockId: blockUid
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
  bufferUpdate(from = "unknown") {
    if (!this.formData) {
      return;
    }
    const data = this.getFormDataWithoutNodeIds();
    const currentSeq = this.formData?._editSequence || 0;
    const text = this.getBlockData(this.selectedBlockUid)?.value?.[0]?.children?.[0]?.text?.substring(0, 30);
    if (this.lastReceivedFormData) {
      const isEcho = this.focusedFieldValuesEqual(data, this.lastReceivedFormData);
      if (isEcho) {
        if (from === "selectionChange") {
          const selection = this.serializeSelection();
          if (selection) {
            window.parent.postMessage({ type: "SELECTION_CHANGE", selection }, this.adminOrigin);
          }
        }
        log("bufferUpdate: echo, skipping. from:", from, "seq:", currentSeq);
        return;
      }
    } else {
      log("bufferUpdate: no baseline, skipping. from:", from);
      return;
    }
    const isNewPending = !this.pendingTextUpdate;
    if (isNewPending) {
      const newSeq = currentSeq + 1;
      this.formData._editSequence = newSeq;
      log("bufferUpdate: NEW pending, incrementing seq to:", newSeq, "from:", from, "text:", JSON.stringify(text));
    } else {
      log("bufferUpdate: updating existing pending, seq:", this.formData._editSequence, "from:", from, "text:", JSON.stringify(text));
    }
    this.pendingTextUpdate = {
      type: "INLINE_EDIT_DATA",
      data,
      selection: this.serializeSelection(),
      from
    };
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
  _processFlushBuffer(requestId, setBlocking = false) {
    if (setBlocking && this.selectedBlockUid) {
      this.setBlockProcessing(this.selectedBlockUid, true, requestId);
    }
    const hadPendingText = this.flushPendingTextUpdates(requestId);
    if (hadPendingText) {
      log("Flushed pending text with requestId, waiting for Redux sync");
    } else {
      const selection = this.serializeSelection();
      log("No pending text, sending BUFFER_FLUSHED with selection:", selection);
      this.sendMessageToParent({
        type: "BUFFER_FLUSHED",
        requestId,
        selection
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
      const seq = this.formData?._editSequence || 1;
      this.pendingTextUpdate.data._editSequence = seq;
      if (flushRequestId) {
        this.pendingTextUpdate.flushRequestId = flushRequestId;
      }
      log(
        "flushPendingTextUpdates: sending buffered update, seq:",
        seq,
        "anchor:",
        this.pendingTextUpdate.selection?.anchor,
        "focus:",
        this.pendingTextUpdate.selection?.focus
      );
      window.parent.postMessage(this.pendingTextUpdate, this.adminOrigin);
      this.lastReceivedFormData = JSON.parse(JSON.stringify(this.pendingTextUpdate.data));
      this.pendingTextUpdate = null;
      return true;
    }
    return false;
  }
  /**
   * Send a message to the parent, automatically flushing pending text updates first
   * if this is not an inline edit message
   * @param {Object} message - The message to send
   */
  sendMessageToParent(message) {
    if (message.type !== "INLINE_EDIT_DATA") {
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
    const startPath = this.getNodePath(range.startContainer);
    const endPath = this.getNodePath(range.endContainer);
    if (!startPath || !endPath) return false;
    if (startPath.length > 2) return true;
    if (endPath.length > 2) return true;
    if (startPath.join(".") === endPath.join(".")) return false;
    return true;
  }
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
      link: { present: false, enclosing: false }
    };
    let container = range.commonAncestorContainer;
    while (container && container !== document && !(container.dataset && container.dataset.editableField === "value")) {
      if (container.nodeName === "STRONG" || container.nodeName === "B") {
        if (container.contains(range.startContainer) && container.contains(range.endContainer)) {
          formats.bold.enclosing = true;
          formats.bold.present = true;
        }
      }
      if (container.nodeName === "EM" || container.nodeName === "I") {
        if (container.contains(range.startContainer) && container.contains(range.endContainer)) {
          formats.italic.enclosing = true;
          formats.italic.present = true;
        }
      }
      if (container.nodeName === "DEL") {
        if (container.contains(range.startContainer) && container.contains(range.endContainer)) {
          formats.del.enclosing = true;
          formats.del.present = true;
        }
      }
      if (container.nodeName === "A") {
        if (container.contains(range.startContainer) && container.contains(range.endContainer)) {
          formats.link.enclosing = true;
          formats.link.present = true;
        }
      }
      container = container.parentNode;
    }
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
    if (!node) return null;
    if (node.firstChild) return node.firstChild;
    while (node) {
      if (node.nextSibling) return node.nextSibling;
      node = node.parentNode;
    }
    return null;
  }
  /**
   * Formats the selected text within a block.
   *
   * @param {string} format - The format to apply (e.g., 'bold', 'italic', 'del').
   * @param {boolean} remove - Whether to remove the format (true) or apply it (false).
   */
  formatSelectedText(format, remove) {
    const selection = window.getSelection();
    if (!selection.rangeCount) return;
    const range = selection.getRangeAt(0);
    if (remove) {
      this.unwrapFormatting(range, format);
    } else {
      const fragment = range.extractContents();
      const newNode = document.createElement(
        format === "bold" ? "strong" : format === "italic" ? "em" : format === "del" ? "del" : "span"
      );
      newNode.appendChild(fragment);
      range.insertNode(newNode);
    }
    this.sendFormattedHTMLToAdminUI(selection);
  }
  // Helper function to unwrap formatting while preserving other formatting
  unwrapFormatting(range, format) {
    const formattingElements = {
      bold: ["STRONG", "B"],
      italic: ["EM", "I"],
      del: ["DEL"],
      link: ["A"]
    };
    let container = range.commonAncestorContainer;
    let topmostParent = false;
    while (container && container !== document && !topmostParent) {
      if (container.dataset && container.dataset.editableField === "value")
        topmostParent = true;
      if (formattingElements[format].includes(container.nodeName)) {
        const isEntireContentSelected = range.startOffset === 0 && range.endOffset === container.textContent.length;
        if (isEntireContentSelected) {
          this.unwrapElement(container);
        } else {
          this.unwrapSelectedPortion(
            container,
            range,
            format,
            formattingElements
          );
        }
        return;
      }
      container = container.parentNode;
    }
    let node = range.startContainer;
    while (node && node !== range.endContainer) {
      if (node.nodeType === Node.ELEMENT_NODE && formattingElements[format].includes(node.nodeName)) {
        this.unwrapElement(node);
      } else if (node.nodeType === Node.TEXT_NODE && node.parentNode && formattingElements[format].includes(node.parentNode.nodeName)) {
        this.unwrapElement(node.parentNode);
      }
      node = this.nextNode(node);
    }
  }
  // Helper function to unwrap the selected portion within a formatting element
  unwrapSelectedPortion(element, range, format, formattingElements) {
    const formattingTag = formattingElements[format][0];
    const selectionStartsAtBeginning = range.startOffset === 0;
    const selectionEndsAtEnd = range.endOffset === element.textContent.length;
    let beforeFragment = null;
    if (!selectionStartsAtBeginning) {
      const beforeRange = document.createRange();
      beforeRange.setStart(element, 0);
      beforeRange.setEnd(range.startContainer, range.startOffset);
      beforeFragment = beforeRange.extractContents();
    }
    const selectionFragment = range.extractContents();
    let afterFragment = null;
    if (!selectionEndsAtEnd) {
      const afterRange = document.createRange();
      afterRange.setStart(range.endContainer, range.endOffset);
      afterRange.setEnd(element, element.childNodes.length);
      afterFragment = afterRange.extractContents();
    }
    const beforeWrapper = beforeFragment ? document.createElement(formattingTag) : null;
    if (beforeWrapper) {
      beforeWrapper.appendChild(beforeFragment);
    }
    const afterWrapper = afterFragment ? document.createElement(formattingTag) : null;
    if (afterWrapper) {
      afterWrapper.appendChild(afterFragment);
    }
    const parent = element.parentNode;
    if (beforeWrapper) {
      parent.insertBefore(beforeWrapper, element);
    }
    parent.insertBefore(selectionFragment, element);
    if (afterWrapper) {
      parent.insertBefore(afterWrapper, element);
    }
    parent.removeChild(element);
    this.removeEmptyFormattingElements(parent);
  }
  // Helper function to unwrap a single formatting element
  unwrapElement(element) {
    const parent = element.parentNode;
    if (!parent) return;
    const nextSibling = element.nextSibling;
    while (element.firstChild) {
      parent.insertBefore(element.firstChild, element);
    }
    parent.removeChild(element);
    this.removeEmptyFormattingElements(parent);
    if (nextSibling) {
      const range = document.createRange();
      range.setStart(nextSibling, 0);
      range.collapse(true);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
    }
  }
  // Helper function to remove empty formatting elements
  removeEmptyFormattingElements(parent) {
    for (let i = 0; i < parent.childNodes.length; i++) {
      const child = parent.childNodes[i];
      if (child.nodeType === Node.ELEMENT_NODE && (child.nodeName === "STRONG" || child.nodeName === "EM" || child.nodeName === "DEL" || child.nodeName === "A") && child.textContent.trim() === "") {
        parent.removeChild(child);
        i--;
      }
    }
  }
  sendFormattedHTMLToAdminUI(selection) {
    if (!selection.rangeCount) return;
    const range = selection.getRangeAt(0);
    const commonAncestor = range.commonAncestorContainer;
    const editableParent = this.findEditableParent(commonAncestor);
    if (!editableParent) return;
    const htmlString = editableParent.outerHTML;
    window.parent.postMessage(
      {
        type: "TOGGLE_MARK",
        html: htmlString
      },
      this.adminOrigin
    );
  }
  findEditableParent(node) {
    if (!node || node === document) return null;
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
        /* Placeholder text for empty editable fields \u2014 keeps them visible/clickable */
        [data-edit-text][data-placeholder][data-empty]::before {
          content: attr(data-placeholder);
          color: #aaa;
          font-style: italic;
          pointer-events: none;
          position: absolute;
        }
        /* Hide placeholder when field is focused (user is editing) */
        [data-edit-text][data-placeholder][data-empty]:focus::before {
          display: none;
        }
        /* Empty fields with placeholder: placeholder text provides the height */
        [data-edit-text][data-placeholder][data-empty] {
          position: relative;
        }
        /* Empty fields without placeholder: min-height fallback so they stay clickable */
        [data-edit-text][data-empty]:not([data-placeholder]) {
          min-height: 1.5em;
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
};
var bridgeInstance = typeof window !== "undefined" && window.__hydraBridge || null;
var _diagnosticShown = false;
function _showBridgeDiagnostic(info) {
  if (_diagnosticShown) return;
  if (typeof document === "undefined") return;
  _diagnosticShown = true;
  const el = document.createElement("div");
  el.id = "hydra-bridge-diagnostic";
  el.setAttribute("style", [
    "position:fixed",
    "bottom:16px",
    "right:16px",
    "z-index:2147483647",
    "max-width:440px",
    "background:#fef2f2",
    "border:2px solid #dc2626",
    "border-radius:8px",
    "padding:16px",
    "box-shadow:0 4px 12px rgba(0,0,0,0.15)",
    "font-family:monospace",
    "font-size:13px",
    "line-height:1.6",
    "color:#7f1d1d"
  ].join(";"));
  const rows = [
    `<strong>window.name:</strong> "${info.windowName || "(empty)"}"`,
    `<strong>In iframe:</strong> ${info.inIframe}`,
    `<strong>Admin origin:</strong> ${info.adminOrigin || "(none)"}`,
    `<strong>initBridge called:</strong> ${info.bridgeCreated}`,
    `<strong>INITIAL_DATA received:</strong> ${info.bridgeInitialized}`
  ];
  let hint = "";
  if (info.inIframe && !info.hasHydraName) {
    hint = 'The admin should set the iframe name to "hydra-edit:&lt;origin&gt;". Check that Volto sets window.name on the iframe element.';
  } else if (info.bridgeCreated && !info.bridgeInitialized) {
    hint = "INIT was sent but admin did not respond with INITIAL_DATA. Check that adminOrigin matches the parent window origin.";
  } else if (!info.bridgeCreated) {
    hint = "hydra.js was imported but initBridge() was never called. The frontend should call initBridge() in edit mode.";
  }
  el.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
      <strong style="color:#dc2626;font-size:14px">Hydra Bridge: Not Connected</strong>
      <button id="hydra-diag-dismiss" style="background:none;border:none;cursor:pointer;font-size:18px;color:#666">&times;</button>
    </div>
    <div>${rows.join("<br>")}</div>
    ${hint ? `<div style="margin-top:8px;padding:8px;background:#fee2e2;border-radius:4px;font-size:12px">${hint}</div>` : ""}
  `;
  document.body.appendChild(el);
  document.getElementById("hydra-diag-dismiss").addEventListener("click", () => el.remove());
}
if (typeof window !== "undefined" && window.self !== window.top) {
  const _url = new URL(window.location.href);
  const _editParam = _url.searchParams.get("_edit");
  const _isEditMode = window.name.startsWith("hydra-edit:");
  const _expectsHydra = _isEditMode || _editParam === "true";
  if (_expectsHydra) {
    const _checkConnection = () => {
      setTimeout(() => {
        if (!bridgeInstance || !bridgeInstance.initialized) {
          _showBridgeDiagnostic({
            windowName: window.name,
            hasHydraName: _isEditMode,
            inIframe: true,
            adminOrigin: bridgeInstance?.adminOrigin || null,
            bridgeCreated: !!bridgeInstance,
            bridgeInitialized: bridgeInstance?.initialized || false
          });
        }
      }, 5e3);
    };
    if (document.readyState === "complete") {
      _checkConnection();
    } else {
      window.addEventListener("load", _checkConnection);
    }
  }
}
function initBridge(adminOriginOrOptions, options = {}) {
  let adminOrigin;
  if (typeof adminOriginOrOptions === "object" && adminOriginOrOptions !== null) {
    options = adminOriginOrOptions;
    adminOrigin = options.adminOrigin;
  } else {
    adminOrigin = adminOriginOrOptions;
  }
  if (adminOrigin) {
    log("Using explicit admin origin:", adminOrigin);
  } else if (window.name.startsWith("hydra-edit:") || window.name.startsWith("hydra-view:")) {
    const prefix = window.name.startsWith("hydra-edit:") ? "hydra-edit:" : "hydra-view:";
    adminOrigin = window.name.slice(prefix.length);
    log("Got admin origin from window.name:", adminOrigin);
  } else {
    log("No hydra window.name set - not in Volto iframe, skipping bridge setup");
    adminOrigin = null;
  }
  if (!bridgeInstance) {
    bridgeInstance = new Bridge(adminOrigin, options);
    bridgeInstance.lastKnownPath = window.location.pathname;
    if (typeof window !== "undefined") {
      window.__hydraBridge = bridgeInstance;
    }
  } else {
    const currentPath = window.location.pathname;
    if (options.pathToApiPath) {
      bridgeInstance.pathToApiPath = options.pathToApiPath;
    }
    if (bridgeInstance.lastKnownPath && bridgeInstance.lastKnownPath !== currentPath) {
      const apiPath = bridgeInstance.pathToApiPath(currentPath);
      const inPageNavTime = sessionStorage.getItem("hydra_in_page_nav_time");
      const isInPage = inPageNavTime && Date.now() - parseInt(inPageNavTime, 10) < 5e3;
      if (!isInPage) {
        log("initBridge: URL changed since last init, sending PATH_CHANGE:", bridgeInstance.lastKnownPath, "->", currentPath, "-> apiPath:", apiPath);
        window.parent.postMessage(
          { type: "PATH_CHANGE", path: apiPath },
          bridgeInstance.adminOrigin
        );
      } else {
        log("initBridge: URL changed since last init but in-page nav, skipping PATH_CHANGE");
      }
    }
    bridgeInstance.lastKnownPath = currentPath;
  }
  return bridgeInstance;
}
function getAccessToken() {
  if (typeof window === "undefined") {
    return null;
  }
  const urlToken = new URL(window.location.href).searchParams.get("access_token");
  if (urlToken) {
    sessionStorage.setItem("hydra_access_token", urlToken);
    return urlToken;
  }
  const sessionToken = sessionStorage.getItem("hydra_access_token");
  if (sessionToken) {
    return sessionToken;
  }
  return getTokenFromCookie();
}
function contentPath(url, apiUrl) {
  if (!url || !apiUrl || typeof url !== "string") return url || "";
  if (url.startsWith(apiUrl)) {
    const rel = url.slice(apiUrl.length);
    return rel.startsWith("/") ? rel : "/" + rel;
  }
  return url;
}
function isEditMode() {
  if (typeof window === "undefined") {
    return false;
  }
  const url = new URL(window.location.href);
  const editParam = url.searchParams.get("_edit");
  return window.name.startsWith("hydra-edit:") || editParam === "true";
}
function getTokenFromCookie() {
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
function getAuthHeaders() {
  const token = getAccessToken();
  if (token) {
    return {
      Authorization: `Bearer ${token}`,
      Accept: "application/json"
    };
  }
  return {
    Accept: "application/json"
  };
}
function buildQuerystringSearchBody(queryConfig, paging = {}, extraCriteria = {}) {
  const { b_start = 0, b_size = 10 } = paging;
  const hasQuery = queryConfig?.query && Array.isArray(queryConfig.query) && queryConfig.query.length > 0;
  let query;
  if (hasQuery) {
    query = [...queryConfig.query];
  } else {
    query = [
      {
        i: "path",
        o: "plone.app.querystring.operation.string.relativePath",
        v: "."
      }
    ];
  }
  if (extraCriteria.SearchableText) {
    query.push({
      i: "SearchableText",
      o: "plone.app.querystring.operation.string.contains",
      v: extraCriteria.SearchableText
    });
  }
  for (const [key, value] of Object.entries(extraCriteria)) {
    if (key.startsWith("facet.")) {
      const field = key.replace("facet.", "");
      query.push({
        i: field,
        o: "plone.app.querystring.operation.selection.any",
        v: Array.isArray(value) ? value : [value]
      });
    }
  }
  const defaultSort = hasQuery ? "effective" : "getObjPositionInParent";
  const defaultOrder = hasQuery ? "descending" : "ascending";
  const body = {
    query,
    sort_on: extraCriteria.sort_on || queryConfig?.sort_on || defaultSort,
    sort_order: extraCriteria.sort_order || queryConfig?.sort_order || defaultOrder,
    b_start,
    b_size,
    metadata_fields: "_all"
  };
  if (queryConfig?.limit && queryConfig.limit > 0) {
    body.limit = queryConfig.limit;
  }
  return body;
}
function calculatePaging(itemsTotal, bSize, currentPage = 0) {
  if (!bSize || bSize <= 0 || !itemsTotal || itemsTotal <= 0) {
    return { pages: [], prev: null, next: null, last: null, totalPages: 0, currentPage: 0, totalItems: 0 };
  }
  const totalPages = Math.ceil(itemsTotal / bSize);
  const pages = Array.from({ length: totalPages }, (_, i) => ({
    start: i * bSize,
    page: i + 1
  }));
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
    totalItems: itemsTotal
  };
}
function staticBlocks(inputItems, options = {}) {
  const { blocks: blocksDict, paging: pagingIn = {} } = options;
  let seen = options.seen || 0;
  const start = pagingIn.start || 0;
  const size = pagingIn.size || 1e3;
  const normalizedItems = (inputItems || []).map((item) => {
    if (typeof item === "string") {
      const block = blocksDict?.[item];
      if (!block) {
        console.warn(`[HYDRA] staticBlocks: block not found for ID: ${item}`);
        return null;
      }
      return { ...block, "@uid": item };
    }
    return item;
  }).filter(Boolean);
  const items = [];
  for (const item of normalizedItems) {
    seen++;
    if (seen > start && seen - start <= size) {
      items.push(item);
    }
  }
  const paging = { start, size, total: seen, seen };
  computePagingUI(paging);
  return { items, paging };
}
function computePagingUI(paging) {
  const { start, size, total } = paging;
  if (size && total) {
    paging.currentPage = Math.floor(start / size);
    paging.totalPages = Math.ceil(total / size);
    paging.totalItems = total;
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
function slateToText(nodes, separator = "\n") {
  if (!Array.isArray(nodes)) return String(nodes ?? "");
  return nodes.map((node) => {
    if (node.text !== void 0) return node.text;
    if (node.type === "br") return separator;
    if (node.children) return slateToText(node.children, separator);
    return "";
  }).join("");
}
function textToSlate(text) {
  const str = String(text ?? "");
  if (!str || !str.includes("\n")) {
    return [{ type: "p", children: [{ text: str }] }];
  }
  const lines = str.split("\n");
  const children = [];
  for (let i = 0; i < lines.length; i++) {
    if (i > 0) children.push({ type: "br", children: [{ text: "" }] });
    children.push({ text: lines[i] });
  }
  return [{ type: "p", children }];
}
function convertFieldValue(value, targetType) {
  if (!targetType) return value;
  switch (targetType) {
    case "string":
      if (Array.isArray(value)) {
        if (value.length > 0 && value[0]?.["@id"]) return value[0]["@id"];
        if (value.length > 0 && value[0]?.type && value[0]?.children) return slateToText(value, " ");
        return value.join(", ");
      }
      if (value && typeof value === "object") {
        if (value.image_scales && value.image_field) {
          const field = value.image_field;
          const scaleData = value.image_scales[field];
          if (scaleData?.[0]?.download) {
            return `${value["@id"] || ""}/${scaleData[0].download}`;
          }
        }
        return String(value);
      }
      return String(value);
    case "textarea":
      if (Array.isArray(value)) {
        if (value.length > 0 && value[0]?.["@id"]) return value[0]["@id"];
        if (value.length > 0 && value[0]?.type && value[0]?.children) return slateToText(value, "\n");
        return value.join(", ");
      }
      if (typeof value === "string") return value;
      return String(value ?? "");
    case "slate":
      if (Array.isArray(value)) {
        if (value.length > 0 && value[0]?.type && value[0]?.children) return value;
        if (value.length > 0 && value[0]?.["@id"]) return textToSlate(value[0]["@id"]);
        return textToSlate(value.join(", "));
      }
      if (typeof value === "string") return textToSlate(value);
      return textToSlate(String(value ?? ""));
    case "link":
      if (typeof value === "string") return [{ "@id": value }];
      if (Array.isArray(value)) {
        if (value.length > 0 && value[0]?.["@id"]) {
          return value.map((item) => {
            const { image_field, image_scales, ...linkFields } = item;
            return linkFields;
          });
        }
        return value;
      }
      if (value && typeof value === "object" && value["@id"]) return [{ "@id": value["@id"] }];
      return [{ "@id": String(value) }];
    case "image":
      if (Array.isArray(value)) {
        if (value.length > 0 && value[0]?.["@id"]) return value[0]["@id"];
        if (value.length > 0 && value[0]?.type && value[0]?.children) return slateToText(value, " ");
        return value.join(", ");
      }
      if (typeof value === "string") return value;
      if (value && typeof value === "object" && value["@id"]) return value["@id"];
      return value;
    case "image_link":
      if (Array.isArray(value)) {
        if (value.length > 0 && value[0]?.["@id"]) return value;
        if (value.length > 0 && value[0]?.type && value[0]?.children) {
          return [{ "@id": slateToText(value, " ") }];
        }
        return value;
      }
      if (typeof value === "string") return [{ "@id": value }];
      if (value && typeof value === "object" && value["@id"]) return [value];
      return value;
    case "array":
      if (Array.isArray(value)) return value;
      return [value];
    default:
      return value;
  }
}
async function expandListingBlocks(inputItems, options = {}) {
  const {
    blocks: blocksDict,
    // Optional: lookup dict for when items are IDs
    fetchItems,
    // { blockType: async (block, { start, size }) => { items, total } }
    paging: pagingIn,
    // { start, size } — not mutated
    itemTypeField = "itemType",
    // Field name to read item type from (e.g., 'variation')
    defaultItemType = "summary"
    // Default item type when field is not set
  } = options;
  if (!fetchItems || typeof fetchItems !== "object") {
    throw new Error("expandListingBlocks requires a fetchItems map of { blockType: fetcherFn }");
  }
  const normalizedItems = (inputItems || []).map((item) => {
    if (typeof item === "string") {
      const block = blocksDict?.[item];
      if (!block) {
        console.warn(`[HYDRA] expandListingBlocks: block not found for ID: ${item}`);
        return null;
      }
      return { ...block, "@uid": item };
    }
    return item;
  }).filter(Boolean);
  const blocks = Object.fromEntries(normalizedItems.map((item) => [item["@uid"], item]));
  const blocksLayout = normalizedItems.map((item) => item["@uid"]);
  const paging = pagingIn || { start: 0, size: 1e3 };
  const listingBlockIds = blocksLayout.filter(
    (blockId) => fetchItems[blocks[blockId]?.["@type"]]
  );
  if (bridgeInstance) {
    for (const blockId of listingBlockIds) {
      bridgeInstance.setBlockReadonly(blockId, true);
      log("expandListingBlocks: registered readonly block:", blockId);
    }
  } else {
    log("expandListingBlocks: no bridgeInstance, skipping readonly registration for:", listingBlockIds);
  }
  const priorSeen = options.seen || 0;
  let globalPos = priorSeen;
  let batchTotal = 0;
  const listingTotals = {};
  const listingResults = {};
  const windowStart = paging.start;
  const windowEnd = paging.start + paging.size;
  for (const blockId of blocksLayout) {
    if (!listingBlockIds.includes(blockId)) {
      globalPos += 1;
      batchTotal += 1;
      continue;
    }
    const blockStart = globalPos;
    let localStart = 0;
    let localSize = 0;
    if (blockStart < windowEnd) {
      localStart = Math.max(0, windowStart - blockStart);
      localSize = windowEnd - Math.max(blockStart, windowStart);
    }
    try {
      const fetcher = fetchItems[blocks[blockId]["@type"]];
      const result = await fetcher(blocks[blockId], { start: localStart, size: localSize });
      const total = result.total || 0;
      listingTotals[blockId] = total;
      batchTotal += total;
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
        const itemDefaults = {};
        const defaultsPrefix = "itemDefaults_";
        for (const [key, value] of Object.entries(block)) {
          if (key.startsWith(defaultsPrefix)) {
            const fieldName = key.slice(defaultsPrefix.length);
            itemDefaults[fieldName] = value;
          }
        }
        log("expandListingBlocks:", { blockId, itemType, fieldMapping: JSON.stringify(fieldMapping), itemDefaults: JSON.stringify(itemDefaults), itemCount: listingResults[blockId].length });
        const DEFAULT_FIELD_MAPPING = { "@id": "href", "title": "title", "description": "description", "image": "image" };
        const effectiveMapping = Object.keys(fieldMapping).length > 0 ? fieldMapping : DEFAULT_FIELD_MAPPING;
        for (const result of listingResults[blockId]) {
          const itemBlock = {
            "@uid": blockId,
            // Block UID for data-block-uid attribute
            "@type": itemType,
            ...itemDefaults,
            readOnly: true
          };
          for (const [sourceField, mapping] of Object.entries(effectiveMapping)) {
            const targetField = typeof mapping === "string" ? mapping : mapping?.field;
            const targetType = typeof mapping === "object" ? mapping?.type : void 0;
            if (!targetField) continue;
            if (result[sourceField] === void 0) continue;
            itemBlock[targetField] = convertFieldValue(result[sourceField], targetType);
          }
          items.push(itemBlock);
        }
      }
      globalPos += total;
    } else if (block) {
      if (globalPos >= paging.start && globalPos < paging.start + paging.size) {
        items.push({ ...block, "@uid": blockId });
      }
      globalPos += 1;
    }
  }
  const seen = priorSeen + batchTotal;
  const outPaging = { start: paging.start, size: paging.size, total: seen, seen };
  computePagingUI(outPaging);
  return { items, paging: outPaging };
}
function ploneFetchItems({ apiUrl, contextPath = "/", extraCriteria = {} } = {}) {
  if (!apiUrl) {
    throw new Error("ploneFetchItems requires apiUrl");
  }
  return async function fetchItems(block, { start, size }) {
    const body = buildQuerystringSearchBody(block.querystring, {
      b_start: start,
      b_size: size
    }, extraCriteria);
    const headers = getAuthHeaders();
    headers["Content-Type"] = "application/json";
    const path = `${contextPath}/++api++/@querystring-search`;
    const res = await fetch(`${apiUrl}${path}`, {
      method: "POST",
      headers,
      body: JSON.stringify(body)
    });
    const response = await res.json();
    const rawItems = response.items || [];
    const items = rawItems.map((item) => {
      if (!item.image_scales || !item.image_field) return item;
      const normalized = { ...item };
      normalized.image = {
        "@id": item["@id"],
        image_field: item.image_field,
        image_scales: item.image_scales
      };
      delete normalized.image_scales;
      delete normalized.image_field;
      return normalized;
    });
    return {
      items,
      total: response.items_total ?? rawItems.length
    };
  };
}
function getFieldTypeString(field) {
  const type = field.type;
  const widget = field.widget;
  if (type && widget) return `${type}:${widget}`;
  if (widget) return `:${widget}`;
  if (type) return type;
  return "string";
}
function isSlateFieldType(fieldType) {
  if (!fieldType) return false;
  return fieldType === "slate" || fieldType.includes(":slate") || fieldType.includes(":richtext");
}
function isTextareaFieldType(fieldType) {
  return fieldType?.includes(":textarea") || false;
}
function isPlainStringFieldType(fieldType) {
  if (!fieldType) return false;
  if (isSlateFieldType(fieldType) || isTextareaFieldType(fieldType)) {
    return false;
  }
  return fieldType === "string" || fieldType.startsWith("string:");
}
function isTextEditableFieldType(fieldType) {
  if (!fieldType) return false;
  return isSlateFieldType(fieldType) || isTextareaFieldType(fieldType) || isPlainStringFieldType(fieldType);
}
function deepEqual(a, b) {
  if (a === b) return true;
  if (a == null || b == null) return a === b;
  if (typeof a !== typeof b) return false;
  if (Array.isArray(a)) {
    if (!Array.isArray(b) || a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }
  if (typeof a === "object") {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    for (const k of keysA) {
      if (!b.hasOwnProperty(k) || !deepEqual(a[k], b[k])) return false;
    }
    return true;
  }
  return false;
}
function formDataContentEqual(formDataA, formDataB) {
  if (!formDataA || !formDataB) return formDataA === formDataB;
  const { _editSequence: seqA, ...contentA } = formDataA;
  const { _editSequence: seqB, ...contentB } = formDataB;
  return deepEqual(contentA, contentB);
}
function calculateDragHandlePosition(blockRect, viewportOffset = { top: 0, left: 0 }) {
  const HANDLE_OFFSET_TOP = 40;
  const top = Math.max(viewportOffset.top, viewportOffset.top + blockRect.top - HANDLE_OFFSET_TOP);
  const left = viewportOffset.left + blockRect.left;
  return { top, left };
}
var TEMPLATE_MARKER = "_template";
function generateUUID() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === "x" ? r : r & 3 | 8;
    return v.toString(16);
  });
}
function extractFieldPlaceholders(block) {
  const SYSTEM_FIELDS = /* @__PURE__ */ new Set([
    "@type",
    "@uid",
    "templateId",
    "templateInstanceId",
    "slotId",
    "fixed",
    "readOnly",
    "readOnly",
    "fieldPlaceholders",
    "fieldMappings",
    "blocks",
    "blocks_layout",
    "nextSlotId",
    "childSlotIds"
  ]);
  const placeholders = {};
  for (const [key, value] of Object.entries(block)) {
    if (SYSTEM_FIELDS.has(key)) continue;
    if (typeof value === "string" && value.trim()) {
      placeholders[key] = value;
    } else if (Array.isArray(value) && value.length > 0 && value[0]?.children) {
      const text = value.map(
        (n) => (n.children || []).map((c) => c.text || "").join("")
      ).join("").trim();
      if (text) placeholders[key] = value;
    }
  }
  return placeholders;
}
function isLayoutTemplate(templateData) {
  const { blocks, blocks_layout } = templateData;
  const layout = blocks_layout?.items || [];
  if (layout.length === 0) return false;
  const firstBlock = blocks?.[layout[0]];
  const lastBlock = blocks?.[layout[layout.length - 1]];
  const firstIsFixed = firstBlock?.fixed === true;
  const lastIsFixed = lastBlock?.fixed === true;
  return firstIsFixed || lastIsFixed;
}
function findSlotRegions(templateData) {
  const { blocks, blocks_layout } = templateData;
  const layout = blocks_layout?.items || [];
  const regions = {};
  for (const blockId of layout) {
    const block = blocks?.[blockId];
    if (block?.fixed) continue;
    const slotId = block?.slotId;
    if (slotId) {
      if (!regions[slotId]) {
        regions[slotId] = {
          blockIds: [],
          allowedBlocks: null
        };
      }
      regions[slotId].blockIds.push(blockId);
    }
  }
  return regions;
}
function isTemplateAllowedIn(templateData, containerType, fieldName) {
  const { allowed_container_types, allowed_field_names } = templateData;
  if (!allowed_container_types?.length && !allowed_field_names?.length) {
    return true;
  }
  const typeOk = !allowed_container_types?.length || allowed_container_types.includes(containerType);
  const fieldOk = !allowed_field_names?.length || allowed_field_names.includes(fieldName);
  return typeOk && fieldOk;
}
function getLayoutTemplates(templates, containerType, fieldName) {
  return templates.filter(
    (t) => isLayoutTemplate(t) && isTemplateAllowedIn(t, containerType, fieldName)
  );
}
function getSnippetTemplates(templates, containerType, fieldName) {
  return templates.filter(
    (t) => !isLayoutTemplate(t) && isTemplateAllowedIn(t, containerType, fieldName)
  );
}
function cloneBlocksWithNewIds(blocks, layout, uuidGenerator = generateUUID) {
  const idMap = {};
  const newBlocks = {};
  const newLayout = [];
  for (const oldId of layout) {
    const newId = uuidGenerator();
    idMap[oldId] = newId;
    const block = blocks[oldId];
    if (block) {
      newBlocks[newId] = cloneBlockFilteringNested(block, uuidGenerator);
    }
    newLayout.push(newId);
  }
  return { blocks: newBlocks, layout: newLayout, idMap };
}
function cloneBlockFilteringNested(block, uuidGenerator) {
  const cloned = { ...block };
  if (cloned.blocks && cloned.blocks_layout?.items) {
    const nestedBlocks = {};
    const nestedLayout = [];
    for (const nestedId of cloned.blocks_layout.items) {
      const nestedBlock = cloned.blocks[nestedId];
      if (!nestedBlock) continue;
      if (nestedBlock.slotId || nestedBlock.templateId) {
        const newNestedId = uuidGenerator();
        nestedBlocks[newNestedId] = cloneBlockFilteringNested(nestedBlock, uuidGenerator);
        nestedLayout.push(newNestedId);
      }
    }
    cloned.blocks = nestedBlocks;
    cloned.blocks_layout = { ...cloned.blocks_layout, items: nestedLayout };
  }
  return cloned;
}
function insertSnippetBlocks(pageFormData, templateData, position, uuidGenerator = generateUUID) {
  const result = {
    blocks: { ...pageFormData.blocks },
    blocks_layout: {
      items: [...pageFormData.blocks_layout?.items || []]
    }
  };
  const templateId = templateData["@id"] || templateData.UID;
  const instanceId = uuidGenerator();
  const { blocks: clonedBlocks, layout: clonedLayout, idMap } = cloneBlocksWithNewIds(
    templateData.blocks,
    templateData.blocks_layout?.items || [],
    uuidGenerator
  );
  for (const [newId, block] of Object.entries(clonedBlocks)) {
    const originalId = Object.entries(idMap).find(
      ([_, v]) => v === newId
    )?.[0];
    const originalBlock = templateData.blocks?.[originalId];
    block.templateId = templateId;
    block.templateInstanceId = instanceId;
    block.slotId = originalBlock?.slotId || originalId;
    if (originalBlock?.fixed !== void 0) block.fixed = originalBlock.fixed;
    if (originalBlock?.readOnly !== void 0) block.readOnly = originalBlock.readOnly;
    if (!block.readOnly) {
      const placeholders = extractFieldPlaceholders(originalBlock || block);
      if (Object.keys(placeholders).length > 0) {
        block.fieldPlaceholders = placeholders;
      }
    }
    result.blocks[newId] = block;
  }
  result.blocks_layout.items.splice(position, 0, ...clonedLayout);
  return result;
}
function getTemplateBlocks(formData, tplId) {
  const blockIds = [];
  for (const blockId of formData.blocks_layout?.items || []) {
    const block = formData.blocks?.[blockId];
    if (block?.templateId === tplId) {
      blockIds.push(blockId);
    }
  }
  return blockIds;
}
function isFixedTemplateBlock(block) {
  return block?.templateId && block?.fixed === true;
}
function isPlaceholderContent(block) {
  return block?.templateId && !block?.fixed;
}
function isBlockInEditedTemplate(blockData, templateEditMode) {
  if (!templateEditMode) return false;
  return blockData?.templateInstanceId === templateEditMode;
}
function isBlockReadonly(blockData, templateEditMode) {
  if (templateEditMode) {
    return !isBlockInEditedTemplate(blockData, templateEditMode);
  }
  return !!blockData?.readOnly;
}
function isBlockPositionLocked(blockData, templateEditMode) {
  if (templateEditMode) {
    return false;
  }
  return !!blockData?.fixed;
}
function getBlockAddability(blockId, blockPathMap, blockData, templateEditMode, sourceBlockData = null) {
  const pathInfo = blockPathMap?.[blockId];
  const result = {
    canInsertBefore: false,
    canInsertAfter: false,
    canReplace: false,
    allowedTypes: null,
    maxReached: false
  };
  if (!pathInfo) {
    return result;
  }
  const staticCanInsertBefore = pathInfo.canInsertBefore !== false;
  const staticCanInsertAfter = pathInfo.canInsertAfter !== false;
  const maxReached = pathInfo.maxSiblings != null && pathInfo.siblingCount >= pathInfo.maxSiblings;
  result.maxReached = maxReached;
  if (maxReached) {
    return result;
  }
  let targetInTemplate = false;
  if (templateEditMode) {
    targetInTemplate = isBlockInEditedTemplate(blockData, templateEditMode);
    const sourceInTemplate = sourceBlockData ? isBlockInEditedTemplate(sourceBlockData, templateEditMode) : false;
    const allowedByTemplateMode = sourceBlockData ? sourceInTemplate || targetInTemplate : targetInTemplate;
    if (!allowedByTemplateMode) {
      return result;
    }
  }
  if (templateEditMode && targetInTemplate) {
    result.canInsertBefore = true;
    result.canInsertAfter = true;
  } else {
    result.canInsertBefore = staticCanInsertBefore;
    result.canInsertAfter = staticCanInsertAfter;
  }
  const isEmptyBlock = blockData?.["@type"] === "empty";
  if (isEmptyBlock) {
    const blockIsReadonly = isBlockReadonly(blockData, templateEditMode);
    result.canReplace = !blockIsReadonly;
    result.canInsertBefore = false;
    result.canInsertAfter = false;
  }
  result.allowedTypes = pathInfo.allowedSiblingTypes || null;
  return result;
}
function templateIdToPath(id) {
  if (!id || typeof id !== "string") return id;
  if (!id.startsWith("http://") && !id.startsWith("https://")) return id;
  try {
    return new URL(id).pathname;
  } catch {
    return id;
  }
}
function templateIdsMatch(a, b) {
  if (a === b) return true;
  if (!a || !b) return false;
  return templateIdToPath(a) === templateIdToPath(b);
}
function getUniqueTemplateIds(formData) {
  const templateIds = /* @__PURE__ */ new Set();
  for (const blockId of Object.keys(formData.blocks || {})) {
    const block = formData.blocks[blockId];
    if (block?.templateId && block.templateInstanceId !== block.templateId) {
      templateIds.add(block.templateId);
    }
  }
  return Array.from(templateIds);
}
function isBlocksMap(obj) {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return false;
  return Object.values(obj).some((v) => v?.["@type"]);
}
function collectContentFromTree(container, instanceId, pendingContent, standaloneBlocks, existingFixedBlockIds, visited = /* @__PURE__ */ new Set()) {
  if (!container || typeof container !== "object") return;
  if (visited.has(container)) return;
  visited.add(container);
  if (Array.isArray(container)) {
    for (const item of container) {
      collectContentFromTree(item, instanceId, pendingContent, standaloneBlocks, existingFixedBlockIds, visited);
    }
    return;
  }
  for (const [fieldName, value] of Object.entries(container)) {
    if (!isBlocksMap(value)) continue;
    const layoutBlockIds = /* @__PURE__ */ new Set();
    for (const [key, val] of Object.entries(container)) {
      if (key !== fieldName && val?.items && Array.isArray(val.items)) {
        for (const id of val.items) layoutBlockIds.add(id);
      }
    }
    const blockLayout = layoutBlockIds.size > 0 ? layoutBlockIds : Object.keys(value);
    for (const blockId of blockLayout) {
      const block = value[blockId];
      if (!block) continue;
      if (block.templateInstanceId === instanceId) {
        const slotId = block.slotId;
        if (slotId) {
          if (block.fixed) {
            existingFixedBlockIds.set(slotId, { blockId, block });
          } else {
            if (!pendingContent.has(slotId)) {
              pendingContent.set(slotId, []);
            }
            pendingContent.get(slotId).push({ blockId, block });
          }
        }
      } else if (!block.templateId && !block.slotId) {
        standaloneBlocks.push({ blockId, block });
      }
      collectContentFromTree(block, instanceId, pendingContent, standaloneBlocks, existingFixedBlockIds, visited);
    }
  }
}
function processNestedTemplateLevel(docBlocks, docLayout, nestedInfo, templateState, options, addItem, items) {
  const { templateBlocks, templateLayout } = nestedInfo;
  const { templateId, instanceId } = templateState;
  const { uuidGenerator, firstInsert } = options;
  const docBlocksBySlotId = /* @__PURE__ */ new Map();
  for (const blockId of docLayout) {
    const block = docBlocks[blockId];
    if (block?.slotId) {
      if (!docBlocksBySlotId.has(block.slotId)) {
        docBlocksBySlotId.set(block.slotId, []);
      }
      docBlocksBySlotId.get(block.slotId).push({ blockId, block });
    }
  }
  for (const tplBlockId of templateLayout) {
    const tplBlock = templateBlocks[tplBlockId];
    if (!tplBlock) continue;
    if (tplBlock.fixed) {
      const blockId = uuidGenerator ? uuidGenerator() : `${instanceId}::${tplBlockId}`;
      const tplIdx = templateLayout.indexOf(tplBlockId);
      let nextSlotId = void 0;
      for (let i = tplIdx + 1; i < templateLayout.length; i++) {
        const nextTplBlock = templateBlocks[templateLayout[i]];
        if (nextTplBlock && !nextTplBlock.fixed && nextTplBlock.slotId) {
          nextSlotId = nextTplBlock.slotId;
          break;
        }
        if (nextTplBlock?.fixed) break;
      }
      let childSlotIds = void 0;
      if (tplBlock.blocks && isBlocksMap(tplBlock.blocks)) {
        const innerLayout = tplBlock.blocks_layout?.items || Object.keys(tplBlock.blocks);
        for (const nestedId of innerLayout) {
          const nested = tplBlock.blocks[nestedId];
          if (nested && !nested.fixed && nested.slotId) {
            if (!childSlotIds) childSlotIds = {};
            childSlotIds["blocks"] = nested.slotId;
            break;
          }
        }
      }
      const fixedBlock = {
        ...tplBlock,
        templateId,
        templateInstanceId: instanceId,
        ...nextSlotId && { nextSlotId },
        ...childSlotIds && { childSlotIds }
      };
      if (firstInsert && !tplBlock.readOnly) {
        const placeholders = extractFieldPlaceholders(tplBlock);
        if (Object.keys(placeholders).length > 0) {
          fixedBlock.fieldPlaceholders = placeholders;
        }
      }
      addItem(fixedBlock, blockId);
      if (tplBlock.blocks && isBlocksMap(tplBlock.blocks)) {
        const nestedLayout = tplBlock.blocks_layout?.items || Object.keys(tplBlock.blocks);
        templateState.nestedContainers.set(tplBlock.blocks, {
          templateBlockId: tplBlockId,
          templateBlocks: tplBlock.blocks,
          templateLayout: nestedLayout
        });
      }
      for (const val of Object.values(tplBlock)) {
        if (Array.isArray(val) && val.length > 0 && val[0]?.templateId) {
          const itemIdField = "@id";
          templateState.nestedContainers.set(val, {
            templateBlockId: tplBlockId,
            templateBlocks: Object.fromEntries(val.map((item) => [item[itemIdField], item])),
            templateLayout: val.map((item) => item[itemIdField])
          });
        }
      }
    } else if (tplBlock.slotId) {
      const slotId = tplBlock.slotId;
      const userContent = docBlocksBySlotId.get(slotId) || [];
      if (userContent.length > 0) {
        for (const { blockId, block } of userContent) {
          addItem(
            {
              ...block,
              templateId,
              templateInstanceId: instanceId,
              slotId
            },
            blockId
          );
        }
      } else if (firstInsert) {
        const blockId = uuidGenerator ? uuidGenerator() : `${instanceId}::${tplBlockId}`;
        const newBlock = {
          ...tplBlock,
          templateId,
          templateInstanceId: instanceId
        };
        const placeholders = extractFieldPlaceholders(tplBlock);
        if (Object.keys(placeholders).length > 0) {
          newBlock.fieldPlaceholders = placeholders;
        }
        addItem(newBlock, blockId);
      }
    }
  }
  return items;
}
async function loadTemplates(data, loadTemplate, preloadedTemplates = {}, extraTemplateIds = []) {
  const templates = { ...preloadedTemplates };
  const loaded = new Set(Object.keys(preloadedTemplates));
  const failed = /* @__PURE__ */ new Map();
  function collectTemplateIds(obj, visited = /* @__PURE__ */ new Set()) {
    const ids = /* @__PURE__ */ new Set();
    function scan(o) {
      if (!o || typeof o !== "object") return;
      if (visited.has(o)) return;
      visited.add(o);
      if (Array.isArray(o)) {
        for (const item of o) scan(item);
        return;
      }
      if (o.templateId && typeof o.templateId === "string") {
        ids.add(o.templateId);
      }
      for (const value of Object.values(o)) {
        scan(value);
      }
    }
    scan(obj);
    return ids;
  }
  let pending = collectTemplateIds(data);
  for (const id of extraTemplateIds) {
    if (id) pending.add(id);
  }
  while (pending.size > 0) {
    const toLoad = Array.from(pending).filter((id) => !loaded.has(id) && !failed.has(id));
    pending.clear();
    if (toLoad.length === 0) break;
    const TEMPLATE_LOAD_TIMEOUT = 5e3;
    const results = await Promise.all(
      toLoad.map(async (id) => {
        try {
          const template = await Promise.race([
            loadTemplate(id),
            new Promise(
              (_, reject) => setTimeout(() => reject(new Error(`Template load timed out after ${TEMPLATE_LOAD_TIMEOUT}ms`)), TEMPLATE_LOAD_TIMEOUT)
            )
          ]);
          return { id, template };
        } catch (error) {
          console.warn(`[HYDRA] Failed to load template ${id}:`, error);
          return { id, template: null, error };
        }
      })
    );
    for (const { id, template, error } of results) {
      if (template) {
        loaded.add(id);
        templates[id] = template;
        preloadedTemplates[id] = template;
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
async function expandTemplates(inputItems, options = {}) {
  const {
    blocks: blocksDict,
    loadTemplate,
    preloadedTemplates
  } = options;
  const data = blocksDict ? { blocks: blocksDict, blocks_layout: { items: inputItems } } : { items: inputItems };
  const { templates } = await loadTemplates(data, loadTemplate, preloadedTemplates);
  const { loadTemplate: _drop, ...syncOptions } = options;
  const loaded = new Set(Object.keys(templates));
  while (true) {
    try {
      return expandTemplatesSync(inputItems, {
        ...syncOptions,
        templates
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
        }
      }
      throw e;
    }
  }
}
function expandTemplatesSync(inputItems, options = {}) {
  const {
    blocks: blocksDict,
    templateState = {},
    templates,
    allowedLayouts,
    uuidGenerator,
    filterInstanceId,
    loadTemplate,
    idField,
    // For object_list arrays: field name used as item ID (e.g. '@id', 'key')
    firstInsert
    // When true, copy slot block defaults as fieldPlaceholders
  } = options;
  if (!templates) {
    throw new Error("expandTemplatesSync requires options.templates with pre-loaded templates");
  }
  const items = [];
  const addItem = (block, blockId) => {
    items.push({ ...block, "@uid": blockId });
  };
  const editMode = isEditMode();
  if (editMode) {
    return (inputItems || []).map((item) => {
      if (typeof item === "string") {
        const block = blocksDict?.[item];
        return block ? { ...block, "@uid": item } : null;
      }
      if (idField && item && !item["@uid"]) {
        const id = item[idField];
        if (id) return { ...item, "@uid": id };
      }
      return item;
    }).filter(Boolean);
  }
  const normalizedItems = (inputItems || []).map((item) => {
    if (typeof item === "string") {
      const block = blocksDict?.[item];
      if (!block) {
        console.warn(`[HYDRA] expandTemplatesSync: block not found for ID: ${item}`);
        return null;
      }
      return { ...block, "@uid": item };
    }
    if (idField && item && !item["@uid"]) {
      const id = item[idField];
      if (id) return { ...item, "@uid": id };
    }
    return item;
  }).filter(Boolean);
  const blocks = Object.fromEntries(normalizedItems.map((item) => [item["@uid"], item]));
  const layout = normalizedItems.map((item) => item["@uid"]);
  if (!templateState.instances) {
    templateState.instances = {};
  }
  if (!templateState.nestedContainers) {
    templateState.nestedContainers = /* @__PURE__ */ new Map();
  }
  if (!templateState.generatedInstanceIds) {
    templateState.generatedInstanceIds = /* @__PURE__ */ new WeakMap();
  }
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
  const previousTemplateId = templateId;
  if (allowedLayouts?.length > 0) {
    const isLayout = templateId && layout.every((blockId) => {
      const block = blocks[blockId];
      return block?.templateInstanceId === existingInstanceId;
    });
    if (isLayout && !allowedLayouts.some((l) => templateIdsMatch(l, templateId))) {
      templateId = allowedLayouts[0];
      if (!filterInstanceId) {
        existingInstanceId = null;
      }
    } else if (!templateId) {
      templateId = allowedLayouts[0];
      if (!filterInstanceId) {
        existingInstanceId = null;
      }
    }
  }
  let removingTemplate = false;
  if (!templateId && previousTemplateId) {
    removingTemplate = true;
    templateId = "__none__";
    templates["__none__"] = {
      blocks: { "__default__": { "@type": "slate", slotId: "default" } },
      blocks_layout: { items: ["__default__"] }
    };
  }
  if (!templateId) {
    for (const blockId of layout) {
      if (blocks[blockId]) {
        addItem(blocks[blockId], blockId);
      }
    }
    return items;
  }
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
  templateState.templateId = templateId;
  templateState.instanceId = instanceId;
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
      emittedSlotIds: /* @__PURE__ */ new Set(),
      pendingContent: /* @__PURE__ */ new Map(),
      existingFixedBlockIds: /* @__PURE__ */ new Map(),
      leadingStandaloneBlocks: [],
      trailingStandaloneBlocks: [],
      newTemplateIds: /* @__PURE__ */ new Set()
    };
    templateState.instances[instanceId] = ctx;
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
        if (!block.templateId && !block.templateInstanceId && !block.slotId) {
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
          if (block.slotId) {
            ctx.existingFixedBlockIds.set(block.slotId, { blockId, block });
          }
          continue;
        }
        if (block.slotId) {
          const slotId = block.slotId;
          if (!ctx.pendingContent.has(slotId)) {
            ctx.pendingContent.set(slotId, []);
          }
          ctx.pendingContent.get(slotId).push({ blockId, block });
        } else {
          if (!ctx.pendingContent.has("default")) {
            ctx.pendingContent.set("default", []);
          }
          ctx.pendingContent.get("default").push({ blockId, block });
        }
      }
    }
  }
  if (!ctx.template) {
    let template2 = templates[templateId];
    if (!template2 && loadTemplate) {
      template2 = loadTemplate(templateId);
      if (!template2 || typeof template2.then === "function") {
        throw new Error(`loadTemplate for "${templateId}" must return data synchronously, not a Promise. Use expandTemplates() for async loading, or pre-load templates via loadTemplates().`);
      }
      templates[templateId] = template2;
    }
    if (!template2) {
      throw new Error(`Template "${templateId}" not found in pre-loaded templates. Available: ${Object.keys(templates).join(", ")}`);
    }
    ctx.template = template2;
  }
  const { template, emittedSlotIds, pendingContent, leadingStandaloneBlocks, trailingStandaloneBlocks, existingFixedBlockIds } = ctx;
  const templateLayout = template.blocks_layout?.items || [];
  let firstFixedIndex = -1;
  let lastFixedIndex = -1;
  const slotPositions = {};
  for (let i = 0; i < templateLayout.length; i++) {
    const tplBlock = template.blocks?.[templateLayout[i]];
    if (!tplBlock?.slotId) continue;
    if (tplBlock.fixed) {
      if (firstFixedIndex === -1) firstFixedIndex = i;
      lastFixedIndex = i;
    } else {
      if (firstFixedIndex === -1) {
        slotPositions[tplBlock.slotId] = "top";
      } else if (i > lastFixedIndex) {
        slotPositions[tplBlock.slotId] = "bottom";
      } else {
        slotPositions[tplBlock.slotId] = "middle";
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
      const slotId = tplBlock.slotId;
      const existing = slotId && existingFixedBlockIds?.get(slotId);
      const blockId = existing?.blockId ? existing.blockId : uuidGenerator ? uuidGenerator() : `${instanceId}::${tplBlockId}`;
      let blockContent = tplBlock;
      if (!tplBlock.readOnly && existing?.block) {
        blockContent = { ...tplBlock, value: existing.block.value };
      }
      const tplIdx = templateLayout.indexOf(tplBlockId);
      let nextSlotId = void 0;
      for (let i = tplIdx + 1; i < templateLayout.length; i++) {
        const nextTplBlock = template.blocks?.[templateLayout[i]];
        if (nextTplBlock && !nextTplBlock.fixed && nextTplBlock.slotId) {
          nextSlotId = nextTplBlock.slotId;
          break;
        }
        if (nextTplBlock?.fixed) break;
      }
      let childSlotIds = void 0;
      let filteredBlocks = blockContent.blocks;
      let filteredLayout = blockContent.blocks_layout;
      if (tplBlock.blocks && isBlocksMap(tplBlock.blocks)) {
        const nestedLayout = tplBlock.blocks_layout?.items || Object.keys(tplBlock.blocks);
        const newNestedBlocks = {};
        const newNestedLayout = [];
        for (const nestedId of nestedLayout) {
          const nested = tplBlock.blocks[nestedId];
          if (!nested) continue;
          if (nested.slotId || nested.templateId) {
            newNestedBlocks[nestedId] = nested;
            newNestedLayout.push(nestedId);
            if (!nested.fixed && nested.slotId) {
              if (!childSlotIds) childSlotIds = {};
              if (!childSlotIds["blocks"]) childSlotIds["blocks"] = nested.slotId;
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
          templateId,
          templateInstanceId: instanceId,
          ...nextSlotId && { nextSlotId },
          ...childSlotIds && { childSlotIds }
        },
        blockId
      );
      if (tplBlock.blocks && isBlocksMap(tplBlock.blocks)) {
        templateState.nestedContainers.set(filteredBlocks, {
          templateBlockId: tplBlockId,
          templateBlocks: filteredBlocks,
          templateLayout: filteredLayout.items
        });
      }
      for (const val of Object.values(tplBlock)) {
        if (Array.isArray(val) && val.length > 0 && val[0]?.templateId) {
          const itemIdField = "@id";
          templateState.nestedContainers.set(val, {
            templateBlockId: tplBlockId,
            templateBlocks: Object.fromEntries(val.map((item) => [item[itemIdField], item])),
            templateLayout: val.map((item) => item[itemIdField])
          });
        }
      }
    } else {
      const slotId = tplBlock.slotId || "default";
      const insertIndex = items.length;
      if (slotId === "default") {
        defaultInsertIndex = insertIndex;
      }
      const position = slotPositions[slotId];
      if (position === "bottom" && bottomSlotInsertIndex === -1) {
        bottomSlotInsertIndex = insertIndex;
      } else if (position === "top" && topSlotInsertIndex === -1) {
        topSlotInsertIndex = insertIndex;
      }
      if (!emittedSlotIds.has(slotId)) {
        emittedSlotIds.add(slotId);
        const content = pendingContent.get(slotId) || [];
        for (const { blockId, block } of content) {
          addItem(
            {
              ...block,
              templateId,
              templateInstanceId: instanceId,
              slotId
            },
            blockId
          );
        }
        pendingContent.delete(slotId);
      }
    }
  }
  const remainingContent = [];
  for (const [slotId, content] of pendingContent) {
    if (!emittedSlotIds.has(slotId)) {
      emittedSlotIds.add(slotId);
      for (const { blockId, block } of content) {
        remainingContent.push({
          ...block,
          templateId,
          templateInstanceId: instanceId,
          slotId: "default",
          _orphaned: true,
          "@uid": blockId
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
  if (removingTemplate) {
    for (const item of items) {
      delete item.templateId;
      delete item.templateInstanceId;
      delete item.slotId;
      delete item.fixed;
      delete item.readOnly;
      delete item.nextSlotId;
      delete item.childSlotIds;
      delete item._orphaned;
    }
  }
  return items;
}
if (typeof window !== "undefined") {
  window.initBridge = initBridge;
}
export {
  Bridge,
  PAGE_BLOCK_UID,
  TEMPLATE_MARKER,
  buildQuerystringSearchBody,
  calculateDragHandlePosition,
  calculatePaging,
  canContain,
  canContainAll,
  cloneBlocksWithNewIds,
  contentPath,
  convertFieldValue,
  deepEqual,
  expandListingBlocks,
  expandTemplates,
  expandTemplatesSync,
  findConversionPath,
  findSlotRegions,
  formDataContentEqual,
  getAccessToken,
  getAuthHeaders,
  getBlockAddability,
  getFieldTypeString,
  getLayoutTemplates,
  getSnippetTemplates,
  getTemplateBlocks,
  getTokenFromCookie,
  getUniqueTemplateIds,
  initBridge,
  insertSnippetBlocks,
  isBlockInEditedTemplate,
  isBlockPositionLocked,
  isBlockReadonly,
  isEditMode,
  isFixedTemplateBlock,
  isLayoutTemplate,
  isPlaceholderContent,
  isPlainStringFieldType,
  isSlateFieldType,
  isTemplateAllowedIn,
  isTextEditableFieldType,
  isTextareaFieldType,
  loadTemplates,
  mapLayoutItems,
  ploneFetchItems,
  staticBlocks,
  templateIdToPath
};
/*! Bundled license information:

tabbable/dist/index.esm.js:
  (*!
  * tabbable 6.4.0
  * @license MIT, https://github.com/focus-trap/tabbable/blob/master/LICENSE
  *)
*/
//# sourceMappingURL=hydra.js.map
