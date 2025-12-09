/**
 * ChildBlocksWidget - Shows child blocks for each container field in the current block.
 * A block can have multiple `type: 'blocks'` fields, each rendered as a separate section.
 *
 * Example: A block with both 'slides' and 'footnotes' fields would show:
 *   Slides        [+]
 *   ⋮⋮ Slide 1     >
 *   ⋮⋮ Slide 2     >
 *
 *   Footnotes     [+]
 *   ⋮⋮ Note 1      >
 *   ⋮⋮ Note 2      >
 */

import React from 'react';
import PropTypes from 'prop-types';
import { createPortal } from 'react-dom';
import { defineMessages, useIntl } from 'react-intl';
import config from '@plone/volto/registry';
import { DragDropList } from '@plone/volto/components';
import { getAllContainerFields, getBlockById } from '../../utils/blockPath';

const messages = defineMessages({
  blocks: {
    id: 'Blocks',
    defaultMessage: 'Blocks',
  },
  addBlock: {
    id: 'Add block',
    defaultMessage: 'Add block',
  },
});

/**
 * Get child blocks for a specific container field
 */
const getChildBlocks = (blockData, fieldName, formData) => {
  if (!blockData || !blockData[fieldName]) return [];

  const layoutField = `${fieldName}_layout`;
  const items = blockData[layoutField]?.items || [];
  const blocksData = blockData[fieldName] || {};

  return items.map((blockId) => {
    const childBlock = blocksData[blockId];
    const blockType = childBlock?.['@type'] || 'unknown';
    const blockConfig = config.blocks?.blocksConfig?.[blockType];
    // Use plaintext if available, otherwise fall back to block type title
    const title = childBlock?.plaintext || blockConfig?.title || blockType;

    return {
      id: blockId,
      type: blockType,
      title: title,
      data: childBlock,
    };
  });
};

/**
 * Get the display title for a block
 */
const getBlockTitle = (blockData) => {
  const blockType = blockData?.['@type'];
  if (!blockType) return 'Block';

  const blockConfig = config.blocks?.blocksConfig?.[blockType];
  return blockConfig?.title || blockType;
};

/**
 * Single container field section
 */
const ContainerFieldSection = ({
  fieldName,
  fieldTitle,
  childBlocks,
  allowedBlocks,
  maxLength,
  onSelectBlock,
  onAddBlock,
  onMoveBlock,
  parentBlockId,
}) => {
  const intl = useIntl();
  const canAdd = !maxLength || childBlocks.length < maxLength;

  // Convert childBlocks to format expected by DragDropList: [[id, data], ...]
  const childList = childBlocks.map((child) => [child.id, child]);

  const handleMoveItem = (result) => {
    const { source, destination } = result;
    if (!destination || source.index === destination.index) return;

    // Get the block IDs in current order
    const blockIds = childBlocks.map((child) => child.id);
    const [movedId] = blockIds.splice(source.index, 1);
    blockIds.splice(destination.index, 0, movedId);

    // Call the move handler with the new order
    onMoveBlock(parentBlockId, fieldName, blockIds);
  };

  return (
    <div className="container-field-section">
      <div className="widget-header">
        <span className="widget-title">{fieldTitle}</span>
        <div className="widget-actions">
          {canAdd && (
            <button
              onClick={() => onAddBlock(parentBlockId, fieldName)}
              title={intl.formatMessage(messages.addBlock)}
              aria-label={intl.formatMessage(messages.addBlock)}
            >
              +
            </button>
          )}
        </div>
      </div>
      <div className="child-blocks-list">
        {childBlocks.length > 0 ? (
          <DragDropList
            childList={childList}
            onMoveItem={handleMoveItem}
          >
            {({ child, draginfo }) => (
              <div
                ref={draginfo.innerRef}
                {...draginfo.draggableProps}
                className="child-block-item"
                onClick={() => onSelectBlock(child.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    onSelectBlock(child.id);
                  }
                }}
              >
                <span
                  className="drag-handle"
                  {...draginfo.dragHandleProps}
                >
                  ⋮⋮
                </span>
                <span className="block-type">{child.title}</span>
                <span className="nav-arrow">›</span>
              </div>
            )}
          </DragDropList>
        ) : (
          <div className="empty-container-message">No blocks yet</div>
        )}
      </div>
    </div>
  );
};

/**
 * ChildBlocksWidget - Main component
 * Renders all container fields for the current block
 */
const ChildBlocksWidget = ({
  selectedBlock,
  formData,
  blockPathMap,
  onSelectBlock,
  onAddBlock,
  onMoveBlock,
}) => {
  const intl = useIntl();
  const [isClient, setIsClient] = React.useState(false);

  React.useEffect(() => {
    setIsClient(true);
  }, []);

  // If no block selected, show page-level blocks
  if (!selectedBlock) {
    const pageBlocks = formData?.blocks_layout?.items || [];
    const blocksData = formData?.blocks || {};

    const childBlocks = pageBlocks.map((blockId) => {
      const blockData = blocksData[blockId];
      return {
        id: blockId,
        type: blockData?.['@type'] || 'unknown',
        title: getBlockTitle(blockData),
        data: blockData,
      };
    });

    if (!isClient) return null;

    // Note: Uses sidebar-order for backwards compatibility with tests
    const target = document.getElementById('sidebar-order');
    if (!target) return null;

    return createPortal(
      <div className="child-blocks-widget">
        <ContainerFieldSection
          fieldName="blocks"
          fieldTitle={intl.formatMessage(messages.blocks)}
          childBlocks={childBlocks}
          onSelectBlock={onSelectBlock}
          onAddBlock={onAddBlock}
          onMoveBlock={onMoveBlock}
          parentBlockId={null}
        />
      </div>,
      target,
    );
  }

  // Use shared helper to get all container fields (supports multiple and implicit)
  const blocksConfig = config.blocks?.blocksConfig;
  const containerFields = getAllContainerFields(
    selectedBlock,
    blockPathMap,
    formData,
    blocksConfig,
  );

  // If no container fields, don't render anything
  if (containerFields.length === 0) return null;

  if (!isClient) return null;

  // Note: Uses sidebar-order for backwards compatibility with tests
  const target = document.getElementById('sidebar-order');
  if (!target) return null;

  // Get the block data for retrieving children
  const blockData = getBlockById(formData, blockPathMap, selectedBlock);

  return createPortal(
    <div className="child-blocks-widget">
      {containerFields.map((field) => {
        const childBlocks = getChildBlocks(blockData, field.fieldName, formData);
        return (
          <ContainerFieldSection
            key={field.fieldName}
            fieldName={field.fieldName}
            fieldTitle={field.title}
            childBlocks={childBlocks}
            allowedBlocks={field.allowedBlocks}
            maxLength={field.maxLength}
            onSelectBlock={onSelectBlock}
            onAddBlock={onAddBlock}
            onMoveBlock={onMoveBlock}
            parentBlockId={selectedBlock}
          />
        );
      })}
    </div>,
    target,
  );
};

ChildBlocksWidget.propTypes = {
  selectedBlock: PropTypes.string,
  formData: PropTypes.object,
  blockPathMap: PropTypes.object,
  onSelectBlock: PropTypes.func,
  onAddBlock: PropTypes.func,
  onMoveBlock: PropTypes.func,
};

export default ChildBlocksWidget;
