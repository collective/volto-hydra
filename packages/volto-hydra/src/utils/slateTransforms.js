/**
 * Slate Transforms Utility
 *
 * This module provides utilities for applying Slate transformations to block content.
 * It replaces the old DOM manipulation approach with proper Slate transforms that
 * understand the document structure and prevent text loss when formatting across nodes.
 *
 * Related: GitHub Issue #147 - formatting can result in removing text in slate
 */

import { createEditor, Editor, Transforms, Range } from 'slate';
import { jsx } from 'slate-hyperscript';

/**
 * Creates a headless (non-React) Slate editor instance
 * Used for applying transforms without a full editor UI
 *
 * @param {Array} value - Slate document value
 * @returns {Object} Slate editor instance
 */
export function createHeadlessEditor(value) {
  const editor = createEditor();
  editor.children = JSON.parse(JSON.stringify(value)); // Deep clone to avoid mutations
  return editor;
}

// NOTE: serialize() and serializeNode() functions have been removed.
// The Admin UI should NOT generate HTML - it only manages Slate JSON.
// HTML rendering with data-node-id attributes is handled by hydra.js in the frontend.

/**
 * Deserializes HTML to Slate-compatible JSON
 * (Re-export from existing toggleMark.js logic)
 *
 * @param {HTMLElement} el - DOM element to deserialize
 * @param {Object} markAttributes - Accumulated mark attributes
 * @returns {Object|Array} Slate node(s)
 */
function deserialize(el, markAttributes = {}) {
  if (el.nodeType === Node.TEXT_NODE && !!el.textContent.trim()) {
    return jsx('text', markAttributes, el.textContent);
  } else if (el.nodeType !== Node.ELEMENT_NODE) {
    return null;
  }

  const nodeAttributes = { ...markAttributes };

  // Handle inline formatting marks
  switch (el.nodeName) {
    case 'STRONG':
      nodeAttributes.bold = true;
      break;
    case 'EM':
      nodeAttributes.italic = true;
      break;
    case 'DEL':
      nodeAttributes.del = true;
      break;
  }

  const children = Array.from(el.childNodes)
    .map((node) => deserialize(node, nodeAttributes))
    .flat()
    .filter(Boolean);

  // Ensure formatting elements have at least one child
  if (children.length === 0 && ['STRONG', 'EM', 'DEL'].includes(el.nodeName)) {
    children.push(jsx('text', {}, ' '));
  }

  switch (el.nodeName) {
    case 'BODY':
      return jsx('fragment', {}, children);
    case 'BR':
      const parent = el.parentNode;
      if (parent && parent.lastChild !== el && isBlockElement(parent)) {
        return '\n';
      }
      return null;
    case 'BLOCKQUOTE':
      return jsx('element', { type: 'quote' }, children);
    case 'P':
      return jsx('element', { type: 'p' }, children);
    case 'A':
      return jsx(
        'element',
        { type: 'link', data: { url: el.getAttribute('href') } },
        children,
      );
    case 'STRONG':
    case 'EM':
    case 'DEL':
      // These are handled as marks, not elements
      return children;
    default:
      return children;
  }
}

/**
 * Helper to check if element is block-level
 */
function isBlockElement(element) {
  const blockElements = [
    'P',
    'DIV',
    'BLOCKQUOTE',
    'H1',
    'H2',
    'H3',
    'H4',
    'H5',
    'H6',
    'UL',
    'OL',
    'LI',
  ];
  return blockElements.includes(element.nodeName);
}

/**
 * Applies formatting to a Slate value at the given selection using proper Slate transforms
 *
 * @param {Array} value - Slate document value
 * @param {Object} selection - Selection object with anchor and focus
 * @param {string} format - Format to apply ('bold', 'italic', 'del', 'link')
 * @param {string} action - Action to perform ('toggle', 'add', 'remove')
 * @param {Object} options - Additional options (e.g., url for links)
 * @returns {Object} Object with 'value' (updated Slate document) and 'selection' (transformed selection)
 */
export function applyFormat(value, selection, format, action, options = {}) {
  console.log('[APPLY_FORMAT] Input value:', JSON.stringify(value, null, 2));
  console.log('[APPLY_FORMAT] Selection:', JSON.stringify(selection, null, 2));
  console.log('[APPLY_FORMAT] Format:', format, 'Action:', action);

  // Create headless editor with the value
  const editor = createHeadlessEditor(value);
  console.log('[APPLY_FORMAT] Created editor, children:', JSON.stringify(editor.children, null, 2));

  // Set the selection
  try {
    Transforms.select(editor, selection);
    console.log('[APPLY_FORMAT] Selection set successfully');
    console.log('[APPLY_FORMAT] Editor selection:', JSON.stringify(editor.selection, null, 2));
  } catch (error) {
    console.warn('[APPLY_FORMAT] Failed to set selection:', error);
    // If selection is invalid, return value and original selection
    return { value: editor.children, selection };
  }

  // Handle link format (element, not mark)
  if (format === 'link') {
    if (action === 'add' && options.url) {
      wrapLink(editor, options.url);
    } else if (action === 'remove' || action === 'toggle') {
      unwrapLink(editor);
    }
    console.log('[APPLY_FORMAT] Editor selection after link transform:', JSON.stringify(editor.selection, null, 2));
    return { value: editor.children, selection: editor.selection };
  }

  // Handle mark formats (bold, italic, del)
  // Use proper Slate mark APIs which preserve selection naturally
  if (action === 'toggle') {
    // Check if mark is currently active
    const marks = Editor.marks(editor);
    const isActive = marks?.[format] === true;
    console.log('[APPLY_FORMAT] Current format active?', isActive);

    if (isActive) {
      // Remove the mark using proper API
      Editor.removeMark(editor, format);
      console.log('[APPLY_FORMAT] Removed mark:', format);
    } else {
      // Add the mark using proper API
      Editor.addMark(editor, format, true);
      console.log('[APPLY_FORMAT] Added mark:', format);
    }
  } else if (action === 'add') {
    Editor.addMark(editor, format, true);
    console.log('[APPLY_FORMAT] Added mark (action=add):', format);
  } else if (action === 'remove') {
    Editor.removeMark(editor, format);
    console.log('[APPLY_FORMAT] Removed mark (action=remove):', format);
  }

  console.log('[APPLY_FORMAT] Editor children after mark:', JSON.stringify(editor.children, null, 2));
  console.log('[APPLY_FORMAT] Editor selection after mark:', JSON.stringify(editor.selection, null, 2));

  // Using proper mark APIs, selection should be preserved naturally
  return { value: editor.children, selection: editor.selection };
}

/**
 * Wraps selection in a link element
 *
 * @param {Object} editor - Slate editor instance
 * @param {string} url - Link URL
 */
function wrapLink(editor, url) {
  if (isLinkActive(editor)) {
    unwrapLink(editor);
  }

  const { selection } = editor;
  const isCollapsed = selection && Range.isCollapsed(selection);

  const link = {
    type: 'a',
    url,
    children: isCollapsed ? [{ text: url }] : [],
  };

  if (isCollapsed) {
    Transforms.insertNodes(editor, link);
  } else {
    Transforms.wrapNodes(editor, link, { split: true });
    Transforms.collapse(editor, { edge: 'end' });
  }
}

/**
 * Unwraps link element from selection
 *
 * @param {Object} editor - Slate editor instance
 */
function unwrapLink(editor) {
  Transforms.unwrapNodes(editor, {
    match: (n) => !Editor.isEditor(n) && n.type === 'a',
  });
}

/**
 * Checks if selection is inside a link element
 *
 * @param {Object} editor - Slate editor instance
 * @returns {boolean} True if inside a link
 */
function isLinkActive(editor) {
  const [link] = Editor.nodes(editor, {
    match: (n) => !Editor.isEditor(n) && n.type === 'a',
  });
  return !!link;
}

/**
 * Gets the current format state at a selection
 *
 * @param {Array} value - Slate document value
 * @param {Object} selection - Selection object with anchor and focus
 * @returns {Object} Format state object with boolean properties
 */
export function getFormatState(value, selection) {
  const editor = createHeadlessEditor(value);

  try {
    Transforms.select(editor, selection);
  } catch (error) {
    console.warn('Failed to set selection in getFormatState:', error);
    return {
      bold: false,
      italic: false,
      del: false,
      link: { present: false },
    };
  }

  // Get active marks
  const marks = Editor.marks(editor) || {};

  // Check for link element
  const linkNode = isLinkActive(editor);
  let linkState = { present: false };

  if (linkNode) {
    const [link] = Editor.nodes(editor, {
      match: (n) => !Editor.isEditor(n) && n.type === 'a',
    });
    if (link && link[0]) {
      linkState = {
        present: true,
        url: link[0].url || '',
      };
    }
  }

  return {
    bold: marks.bold === true,
    italic: marks.italic === true,
    del: marks.del === true,
    link: linkState,
  };
}

/**
 * Applies a deletion operation
 *
 * @param {Array} value - Slate document value
 * @param {Object} selection - Selection object
 * @param {string} direction - 'forward' or 'backward'
 * @returns {Array} Updated Slate document value
 */
export function applyDeletion(value, selection, direction) {
  const editor = createHeadlessEditor(value);

  try {
    Transforms.select(editor, selection);

    if (direction === 'backward') {
      Transforms.delete(editor, { unit: 'character', reverse: true });
    } else {
      Transforms.delete(editor, { unit: 'character' });
    }
  } catch (error) {
    console.warn('Failed to apply deletion:', error);
  }

  return editor.children;
}

/**
 * Inserts text at selection
 *
 * @param {Array} value - Slate document value
 * @param {Object} selection - Selection object
 * @param {string} text - Text to insert
 * @returns {Array} Updated Slate document value
 */
export function insertText(value, selection, text) {
  const editor = createHeadlessEditor(value);

  try {
    Transforms.select(editor, selection);
    Transforms.insertText(editor, text);
  } catch (error) {
    console.warn('Failed to insert text:', error);
  }

  return editor.children;
}

/**
 * Inserts nodes at selection (used for paste operations)
 *
 * @param {Array} value - Slate document value
 * @param {Object} selection - Selection object
 * @param {Array} nodesToInsert - Nodes to insert
 * @returns {Array} Updated Slate document value
 */
export function insertNodes(value, selection, nodesToInsert) {
  const editor = createHeadlessEditor(value);

  try {
    Transforms.select(editor, selection);
    Transforms.insertNodes(editor, nodesToInsert);
  } catch (error) {
    console.warn('Failed to insert nodes:', error);
  }

  return editor.children;
}

/**
 * Converts HTML to Slate value (compatibility wrapper for toggleMark)
 * Note: nodeIds are managed by hydra.js, not by the Admin UI
 *
 * @param {string} html - HTML string
 * @returns {Array} Slate document value
 */
export function htmlToSlate(html) {
  const document = new DOMParser().parseFromString(html, 'text/html');
  const slateValue = deserialize(document.body);
  return slateValue;
}

// Export default for backwards compatibility with toggleMark.js
export default {
  createHeadlessEditor,
  applyFormat,
  getFormatState,
  applyDeletion,
  insertText,
  insertNodes,
  htmlToSlate,
};
