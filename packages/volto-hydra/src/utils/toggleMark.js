import { jsx } from 'slate-hyperscript';
import addNodeIds from './addNodeIds';

const deserialize = (el, markAttributes = {}) => {
  if (el.nodeType === Node.TEXT_NODE && !!el.textContent.trim()) {
    return jsx('text', markAttributes, el.textContent);
  } else if (el.nodeType !== Node.ELEMENT_NODE) {
    return null;
  }

  const nodeAttributes = { ...markAttributes };

  const children = Array.from(el.childNodes)
    .map((node) => {
      return deserialize(node, nodeAttributes);
    })
    .flat();

  // Ensure formatting elements have at least one child (empty text if necessary)
  if (children.length === 0 && ['STRONG', 'EM', 'DEL'].includes(el.nodeName)) {
    children.push(jsx('text', {}, ' '));
  }

  switch (el.nodeName) {
    case 'BODY':
      return jsx('fragment', {}, children);
    case 'BR':
      // Add newline only if it's not the last child of a block-level element
      const parent = el.parentNode;
      if (parent && parent.lastChild !== el && isBlockElement(parent)) {
        return '\n';
      } else {
        return null; // Ignore <br> if it's at the end or within an inline element
      }
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
    case 'STRONG': // Handle <strong> elements explicitly
      return jsx('element', { type: 'strong' }, children);

    case 'EM': // Handle <strong> elements explicitly
      return jsx('element', { type: 'em' }, children);

    case 'DEL': // Handle <strong> elements explicitly
      return jsx('element', { type: 'del' }, children);
    default:
      return children;
  }
};
/**
 * Converts html string (recieved from hydrajs) to slate compatible json data by first deserializing the html string to slate json data and adding node ids to the json data
 * @param {String} html html string
 * @returns {JSON} slate compatible json data
 */
export default function toggleMark(html) {
  const document = new DOMParser().parseFromString(html, 'text/html');
  const d = deserialize(document.body);
  return addNodeIds(d, { current: 1 });
}

// Helper function to check if an element is block-level
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
  ]; // Add more as needed
  return blockElements.includes(element.nodeName);
}
