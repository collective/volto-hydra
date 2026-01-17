/**
 * HydraSchemaContext
 *
 * Provides blockPathMap, currentBlockId, formData, blocksConfig, and liveBlockDataRef
 * to schemaEnhancers. This allows childBlockConfig to determine if a block is inside
 * a parent container and whether the parent has a type selected.
 *
 * liveBlockDataRef contains the most recent data from each block's form,
 * updated synchronously when forms change (before React state propagates).
 */
import React from 'react';

const HydraSchemaContext = React.createContext(null);

// Store for non-React access (schemaEnhancers are called outside React render)
let currentContextValue = null;

export const HydraSchemaProvider = ({ children, value }) => {
  // Update module-level store when context changes
  React.useEffect(() => {
    currentContextValue = value;
    return () => {
      currentContextValue = null;
    };
  }, [value]);

  // Also set synchronously for immediate access during render
  currentContextValue = value;

  return (
    <HydraSchemaContext.Provider value={value}>
      {children}
    </HydraSchemaContext.Provider>
  );
};

/**
 * Hook for React components
 */
export const useHydraSchemaContext = () => {
  return React.useContext(HydraSchemaContext);
};

/**
 * Get context value for non-React code (like schemaEnhancers)
 * Includes liveBlockDataRef for accessing fresh parent block data.
 */
export const getHydraSchemaContext = () => {
  return currentContextValue;
};

/**
 * Temporarily set context value for non-React code.
 * Used by applySchemaDefaultsToFormData to set currentBlockId for each block.
 * Returns a function to restore the previous value.
 */
export const setHydraSchemaContext = (value) => {
  const previousValue = currentContextValue;
  currentContextValue = value;
  return () => {
    currentContextValue = previousValue;
  };
};

/**
 * Get block data, checking liveBlockDataRef first for fresh data.
 * Use this instead of getBlockById when you need the most current data
 * (e.g., checking if parent has a type selected).
 */
export const getLiveBlockData = (blockId) => {
  if (!currentContextValue) {
    return null;
  }
  const { liveBlockDataRef, formData, blockPathMap } = currentContextValue;

  // Check liveBlockDataRef first (contains fresh data from form internal state)
  if (liveBlockDataRef?.current?.[blockId]) {
    return liveBlockDataRef.current[blockId];
  }

  // Fall back to formData (page-level state)
  if (formData && blockPathMap) {
    const { getBlockById } = require('../utils/blockPath');
    return getBlockById(formData, blockPathMap, blockId);
  }

  return null;
};

export default HydraSchemaContext;
