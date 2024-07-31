// Function to toggle mark in the JSON data
function toggleMark(blockData, selection, active) {
  const { startNodeId, endNodeId, startOffset, endOffset } = selection;
  let json = JSON.parse(JSON.stringify(blockData));
  const jsonData = json.value;
  let startNodeParent = null;

  const findNode = (nodeId, nodes, parent = null) => {
    for (let node of nodes) {
      if (node.nodeId === parseInt(nodeId)) {
        if (!startNodeParent) {
          startNodeParent = parent;
        }
        return node;
      }
      if (node.children) {
        const found = findNode(nodeId, node.children, node);
        if (found) {
          return found;
        }
      }
    }
    return null;
  };

  let startNode = findNode(startNodeId, jsonData);
  let endNode = findNode(endNodeId, jsonData);

  if (!startNode || !endNode) {
    console.warn('No matching nodes found');
    return json; // No matching nodes found, return original data
  }

  const startText = startNode.text.substring(0, startOffset);
  const middleText = startNode.text.substring(
    startOffset,
    endNode.text.length - (endNode.text.length - endOffset),
  );
  const endText = endNode.text.substring(endOffset);

  const updatedNodes = [
    startText !== '' && { nodeId: startNode.nodeId, text: startText },
    active
      ? {
          nodeId: startNode.nodeId + 1,
          type: 'strong',
          children: [{ nodeId: startNode.nodeId + 2, text: middleText }],
        }
      : { nodeId: startNode.nodeId + 1, text: middleText },
    endText !== '' && { nodeId: startNode.nodeId + 3, text: endText },
  ];

  // Remove nodes within the range of [startNodeId, endNodeId] and insert updated nodes
  if (startNodeParent && startNodeParent.children) {
    let insertIndex = -1;
    startNodeParent.children = startNodeParent.children.filter(
      (node, index) => {
        if (
          node.nodeId >= Math.min(startNode.nodeId, endNode.nodeId) &&
          node.nodeId <= Math.max(startNode.nodeId, endNode.nodeId)
        ) {
          if (insertIndex === -1) {
            insertIndex = index;
          }
          return false;
        }
        return true;
      },
    );

    if (insertIndex !== -1) {
      startNodeParent.children.splice(insertIndex, 0, ...updatedNodes);
    }
  }

  json.value = jsonData;
  return json;
}

export default toggleMark;
