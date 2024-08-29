"use client";

import { useEffect, useState } from "react";

/**
 * Serializes Slate JSON into JSX elements
 * @param {Array} value - The Slate JSON value (array of nodes)
 * @returns {Array} - An array of JSX elements
 */
function serializeSlateJSON(value) {
  if (!Array.isArray(value)) {
    return null;
  }
  return value?.map(serializeNode);
}

/**
 * Recursively serializes a single Slate node into a JSX element
 * @param {Object} node - The Slate node object
 * @returns {JSX.Element} - The JSX representation of the node
 */
function serializeNode(node) {
  if (!node) {
    return null;
  }
  const uid = Date.now().toString(36) + Math.random().toString(36).slice(2, 11);
  if (node.text !== undefined) {
    return node.text !== "" ? (
      <span key={uid} data-node-id={`${node?.nodeId}`}>
        {node.text}
      </span>
    ) : (
      <span key={uid} data-node-id={`${node?.nodeId}`}>
        &#xFEFF;
      </span>
    );
  }

  const children = node.children ? node.children.map(serializeNode) : null;

  switch (node.type) {
    case "link":
      return (
        <a key={uid} href={node.data?.url} data-node-id={`${node?.nodeId}`}>
          {children}
        </a>
      );

    default:
      const Tag = node.type;
      if (Tag)
        return (
          <Tag key={uid} data-node-id={`${node?.nodeId}`}>
            {children}
          </Tag>
        );
      else return null;
  }
}

export default function SlateBlock({ value }) {
  const [slateValue, setSlateValue] = useState(value);
  const elements = serializeSlateJSON(slateValue);
  useEffect(() => {
    setSlateValue(value);
  }, [value]);
  const uid = Date.now().toString(36) + Math.random().toString(36).slice(2, 11);
  return (
    <div key={uid} data-editable-field="value">
      {elements}
    </div>
  );
}
