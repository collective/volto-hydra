import { jsx } from 'slate-hyperscript';
import addNodeIds from './addNodeIds';

const deserialize = (el, markAttributes = {}) => {
  if (el.nodeType === Node.TEXT_NODE) {
    return jsx('text', markAttributes, el.textContent);
  } else if (el.nodeType !== Node.ELEMENT_NODE) {
    return null;
  }

  const nodeAttributes = { ...markAttributes };

  // define attributes for text nodes
  // switch (el.nodeName) {
  //   case 'STRONG':
  //     nodeAttributes.type = 'strong';
  //     break;
  //   default:
  //     break;
  // }

  const children = Array.from(el.childNodes)
    .map((node) => {
      // Add data-slate-node attribute if missing
      if (node.nodeType === Node.ELEMENT_NODE && !node.dataset.slateNode) {
        node.dataset.slateNode = 'element'; // Or 'text' if it's a text node
      }
      return deserialize(node, nodeAttributes);
    })
    .flat();

  // Ensure 'strong' elements have a 'children' array even if empty
  if (children.length === 0 && el.nodeName === 'STRONG') {
    children.push(jsx('text', {}, ''));
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
        { type: 'link', url: el.getAttribute('href') },
        children,
      );
    case 'STRONG': // Handle <strong> elements explicitly
      return jsx('element', { type: 'strong' }, children);
    default:
      return children;
  }
};

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
