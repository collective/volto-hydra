import { jsx } from 'slate-hyperscript';

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
    .map((node) => deserialize(node, nodeAttributes))
    .flat();

  // Ensure 'strong' elements have a 'children' array even if empty
  if (children.length === 0 && el.nodeName === 'STRONG') {
    children.push(jsx('text', {}, ''));
  }

  switch (el.nodeName) {
    case 'BODY':
      return jsx('fragment', {}, children);
    case 'BR':
      return '\n';
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
  return deserialize(document.body);
}
