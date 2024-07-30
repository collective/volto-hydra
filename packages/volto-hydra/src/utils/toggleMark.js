// Function to toggle mark in the JSON data
function toggleMark(jsonData, selection, active) {
  // Find the start and end nodes using selection.startNodeId and selection.endNodeId
  // Update the JSON data structure to apply or remove bold formatting

  const { startNodeId, endNodeId, startOffset, endOffset, text } = selection;

  const findNode = (nodeId, nodes) => {
    console.log('findNode', nodeId, nodes);
    for (let node of nodes) {
      if (node.nodeId === parseInt(nodeId)) {
        console.log('found the node');
        return node;
      }
      if (node.children) {
        const found = findNode(nodeId, node.children);
        if (found) {
          console.log('return found');
          return found;
        }
      }
    }
    return null;
  };

  const startNode = findNode(startNodeId, jsonData);
  const endNode = findNode(endNodeId, jsonData);
  console.log('startNode', startNode);
  console.log('endNode', endNode);
  if (!startNode || !endNode) {
    console.log('No matching nodes found');
    return jsonData; // No matching nodes found, return original data
  }

  const startText = startNode.text.substring(0, startOffset);
  const middleText = startNode.text.substring(
    startOffset,
    endNode.text.length - (endNode.text.length - endOffset),
  );
  const endText = endNode.text.substring(endOffset);

  const updatedNodes = [
    { nodeId: startNode.nodeId, text: startText },
    active
      ? {
          type: 'strong',
          children: [{ nodeId: startNode.nodeId, text: middleText }],
        }
      : { nodeId: startNode.nodeId, text: middleText },
    { nodeId: endNode.nodeId, text: endText },
  ];

  startNode.children = updatedNodes;

  return jsonData;
}

export default toggleMark;
