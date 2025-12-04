/**
 * ParentBlocksWidget - Renders parent block settings in the sidebar.
 * Shows the chain of parent containers from root to the immediate parent.
 *
 * Example hierarchy for text-1a inside col-1 inside columns-1:
 *   < Columns     [...]   ← Click to select columns-1
 *     [columns settings]
 *   < Column      [...]   ← Click to select col-1
 *     [column settings]
 *   Slate         [...]   ← Current block (highlighted)
 *     [slate settings rendered via sidebar-properties portal]
 */

import React from 'react';
import PropTypes from 'prop-types';
import { createPortal } from 'react-dom';
import config from '@plone/volto/registry';

/**
 * Get the display title for a block type
 */
const getBlockTypeTitle = (blockType) => {
  if (!blockType) return 'Block';
  const blockConfig = config.blocks?.blocksConfig?.[blockType];
  return blockConfig?.title || blockType;
};

/**
 * Get parent chain for a block from blockPathMap
 * Returns array of parent block IDs from root to immediate parent
 */
const getParentChain = (blockId, blockPathMap) => {
  if (!blockId || !blockPathMap) return [];

  const parents = [];
  let currentId = blockId;

  while (currentId) {
    const pathInfo = blockPathMap[currentId];
    if (pathInfo?.parentId) {
      parents.unshift(pathInfo.parentId); // Add to front
      currentId = pathInfo.parentId;
    } else {
      break;
    }
  }

  return parents;
};

/**
 * Get block data by ID using blockPathMap
 */
const getBlockData = (blockId, formData, blockPathMap) => {
  if (!blockId || !formData) return null;

  // Check blockPathMap for nested blocks
  const pathInfo = blockPathMap?.[blockId];
  if (pathInfo?.path) {
    let current = formData;
    for (const key of pathInfo.path) {
      if (current && typeof current === 'object') {
        current = current[key];
      } else {
        return null;
      }
    }
    return current;
  }

  // Fall back to top-level blocks
  return formData.blocks?.[blockId];
};

/**
 * Single parent block section header
 */
const ParentBlockHeader = ({
  blockId,
  blockType,
  isCurrentBlock,
  onSelectBlock,
}) => {
  const title = getBlockTypeTitle(blockType);

  return (
    <div
      className="sidebar-section-header sticky-header"
      data-is-current={isCurrentBlock}
    >
      {isCurrentBlock ? (
        <span className="section-title">{title}</span>
      ) : (
        <button
          className="parent-nav"
          onClick={() => onSelectBlock(blockId)}
          title={`Select ${title}`}
        >
          <span className="nav-prefix">‹</span>
          <span>{title}</span>
        </button>
      )}
      <div className="block-actions-menu">
        <button className="menu-trigger" title="Block actions">
          •••
        </button>
      </div>
    </div>
  );
};

/**
 * ParentBlocksWidget - Main component
 * Renders the parent chain for the selected block
 */
const ParentBlocksWidget = ({
  selectedBlock,
  formData,
  blockPathMap,
  onSelectBlock,
}) => {
  const [isClient, setIsClient] = React.useState(false);

  React.useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) return null;
  if (!selectedBlock) return null;

  const parentsTarget = document.getElementById('sidebar-parents');
  if (!parentsTarget) return null;

  // Get parent chain
  const parentIds = getParentChain(selectedBlock, blockPathMap);

  // Get current block data for its type
  const currentBlockData = getBlockData(selectedBlock, formData, blockPathMap);
  const currentBlockType = currentBlockData?.['@type'];

  return (
    <>

      {/* Parent blocks - headers only, no wrappers for sticky to work */}
      {createPortal(
        <>
          {parentIds.map((parentId) => {
            const parentData = getBlockData(parentId, formData, blockPathMap);
            const parentType = parentData?.['@type'];

            return (
              <ParentBlockHeader
                key={parentId}
                blockId={parentId}
                blockType={parentType}
                isCurrentBlock={false}
                onSelectBlock={onSelectBlock}
              />
            );
          })}

          {/* Current block header - direct child for sticky stacking */}
          <ParentBlockHeader
            blockId={selectedBlock}
            blockType={currentBlockType}
            isCurrentBlock={true}
            onSelectBlock={onSelectBlock}
          />
        </>,
        parentsTarget,
      )}
    </>
  );
};

ParentBlocksWidget.propTypes = {
  selectedBlock: PropTypes.string,
  formData: PropTypes.object,
  blockPathMap: PropTypes.object,
  onSelectBlock: PropTypes.func,
};

export default ParentBlocksWidget;
