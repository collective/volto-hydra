/**
 * ParentBlocksWidget - Renders parent block settings in the sidebar.
 * Shows the chain of parent containers from root to the current block.
 *
 * The ‹ arrow always navigates UP one level (selects parent, closes current).
 *
 * Example hierarchy for text-1a inside col-1 inside columns-1:
 *   ‹ Columns     [...]   ← Click ‹ to deselect (go to page)
 *   ‹ Column      [...]   ← Click ‹ to select columns-1
 *   ‹ Text        [...]   ← Click ‹ to select col-1 (current block, highlighted)
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
 * Arrow (‹) always navigates UP to parentId (closes this block, selects parent)
 */
const ParentBlockHeader = ({
  blockType,
  parentId,
  isCurrentBlock,
  onSelectBlock,
}) => {
  const title = getBlockTypeTitle(blockType);

  return (
    <div
      className="sidebar-section-header sticky-header"
      data-is-current={isCurrentBlock}
    >
      <button
        className="parent-nav"
        onClick={() => {
          console.log('[PARENT_NAV] Arrow clicked, navigating to parent:', parentId, 'from block type:', blockType);
          onSelectBlock(parentId);
        }}
        title={parentId ? `Go to parent` : 'Deselect block'}
      >
        <span className="nav-prefix">‹</span>
        <span>{title}</span>
      </button>
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
          {parentIds.map((parentId, index) => {
            const parentData = getBlockData(parentId, formData, blockPathMap);
            const parentType = parentData?.['@type'];
            // Parent of this parent (or null if root)
            const grandparentId = index > 0 ? parentIds[index - 1] : null;

            return (
              <ParentBlockHeader
                key={parentId}
                blockType={parentType}
                parentId={grandparentId}
                isCurrentBlock={false}
                onSelectBlock={onSelectBlock}
              />
            );
          })}

          {/* Current block header - arrow navigates to immediate parent */}
          <ParentBlockHeader
            blockType={currentBlockType}
            parentId={parentIds.length > 0 ? parentIds[parentIds.length - 1] : null}
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
