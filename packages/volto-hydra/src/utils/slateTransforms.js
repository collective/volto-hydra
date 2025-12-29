/**
 * Slate Transforms Utility
 *
 * This module provides utilities for applying Slate transformations to block content.
 * It replaces the old DOM manipulation approach with proper Slate transforms that
 * understand the document structure and prevent text loss when formatting across nodes.
 *
 * Related: GitHub Issue #147 - formatting can result in removing text in slate
 */

import { Transforms, Element, Text } from 'slate';
import { jsx } from 'slate-hyperscript';
import { makeEditor } from '@plone/volto-slate/utils';

// Inline formatting element types that should be removed when empty
const INLINE_FORMAT_TYPES = ['strong', 'em', 'del', 'sub', 'sup'];

/**
 * Editor extension that removes empty inline formatting elements (strong, em, etc.)
 * Similar to how volto-slate's withSimpleLink removes empty links.
 *
 * @param {Object} editor - Slate editor instance
 * @returns {Object} Extended editor
 */
export function withEmptyInlineRemoval(editor) {
  const { normalizeNode } = editor;

  editor.normalizeNode = (entry) => {
    const [node, path] = entry;

    // Check if this is an empty inline formatting element
    if (Element.isElement(node) && INLINE_FORMAT_TYPES.includes(node.type)) {
      const isEmpty = node.children.every(
        (child) => Text.isText(child) && child.text === ''
      );
      if (isEmpty) {
        Transforms.removeNodes(editor, { at: path });
        return;
      }
    }

    normalizeNode(entry);
  };

  return editor;
}

/**
 * Creates a headless (non-React) Slate editor instance
 * Uses makeEditor from volto-slate to include all plugins and normalizers,
 * plus our custom empty inline removal.
 *
 * @param {Array} value - Slate document value
 * @returns {Object} Slate editor instance
 */
export function createHeadlessEditor(value) {
  const editor = withEmptyInlineRemoval(makeEditor());
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

/**
 * Splits a Slate block at the current selection point
 * Used when Enter key is pressed to create a new block
 * Uses Volto's existing splitEditorInTwoFragments utility
 *
 * @param {Array} value - Slate document value
 * @param {Object} selection - Selection object
 * @returns {Object} Object with 'topValue' (content before split) and 'bottomValue' (content after split)
 */
export function splitBlock(value, selection) {
  const editor = createHeadlessEditor(value);

  try {
    Transforms.select(editor, selection);

    // Use Volto's existing utility function from volto-slate/utils/ops
    const { splitEditorInTwoFragments } = require('@plone/volto-slate/utils/ops');
    const [topValue, bottomValue] = splitEditorInTwoFragments(editor, selection);

    return { topValue, bottomValue };
  } catch (error) {
    console.warn('Failed to split block:', error);
    // Return original value if split fails
    return {
      topValue: value,
      bottomValue: [{ type: 'p', children: [{ text: '' }] }],
    };
  }
}

// Export default for backwards compatibility
export default {
  createHeadlessEditor,
  htmlToSlate,
  splitBlock,
};
