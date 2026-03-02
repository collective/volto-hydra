import React from 'react';
import BlockRenderer from '$examples/BlockRenderer.jsx';

export default function App({ items }) {
  return (
    <div id="content">
      {items.map(block => (
        <BlockRenderer key={block['@uid']} block={block} />
      ))}
    </div>
  );
}
