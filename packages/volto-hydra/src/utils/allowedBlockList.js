import EventEmitter from 'events';

let allowedBlocksList = [];
const eventEmitter = new EventEmitter();
/**
 * Get the allowed blocks list
 * @returns {Array} Allowed blocks list.
 */
export const getAllowedBlocksList = () => allowedBlocksList;

/**
 * Set the allowed blocks list & emit an event to notify subscribers
 * @param {Array} newAllowedBlocks New allowed blocks list.
 */
export const setAllowedBlocksList = (newAllowedBlocks) => {
  allowedBlocksList = newAllowedBlocks;
  eventEmitter.emit('allowedBlocksListChanged', newAllowedBlocks);
};

// Subscribe to changes in the allowed blocks list
export const subscribeToAllowedBlocksListChanges = (callback) => {
  eventEmitter.on('allowedBlocksListChanged', callback);
};

export const unsubscribeFromAllowedBlocksListChanges = (callback) => {
  eventEmitter.off('allowedBlocksListChanged', callback);
};
