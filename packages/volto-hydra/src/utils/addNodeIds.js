/**
 * Add nodeIds in the json object to each of the Selected Block's children
 * @param {JSON} json Selected Block's data
 * @param {BigInteger} nodeIdCounter (Optional) Counter to keep track of the nodeIds
 * @returns {JSON} block's data with nodeIds added
 */
function addNodeIds(json, nodeIdCounter = { current: 0 }) {
  if (Array.isArray(json)) {
    return json.map((item) => addNodeIds(item, nodeIdCounter));
  } else if (typeof json === 'object' && json !== null) {
    // Clone the object to ensure it's extensible
    json = JSON.parse(JSON.stringify(json));

    if (json.hasOwnProperty('data')) {
      json.nodeId = nodeIdCounter.current++;
      for (const key in json) {
        if (json.hasOwnProperty(key) && key !== 'nodeId' && key !== 'data') {
          json[key] = addNodeIds(json[key], nodeIdCounter);
        }
      }
    } else {
      json.nodeId = nodeIdCounter.current++;
      for (const key in json) {
        if (json.hasOwnProperty(key) && key !== 'nodeId') {
          json[key] = addNodeIds(json[key], nodeIdCounter);
        }
      }
    }
  }
  return json;
}

export default addNodeIds;
