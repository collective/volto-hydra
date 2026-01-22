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
 * Supports both standard containers (blocks + blocks_layout) and object_list (array with @id)
 * @param {Array|null} dataPath - Path to actual data location (e.g., ['table', 'rows'])
 */
const getChildBlocks = (blockData, fieldName, formData, isObjectList = false, dataPath = null) => {
  // Navigate to data using dataPath if provided, otherwise use fieldName
  let data = blockData;
  if (dataPath) {
    for (const key of dataPath) {
      data = data?.[key];
    }
  } else {
    data = blockData?.[fieldName];
  }

  if (!data) return [];

  if (isObjectList) {
    // object_list: items stored as array with @id or custom idField
    if (!Array.isArray(data)) return [];

    return data.map((item, index) => {
      // Use 'key' for slateTable rows/cells, fall back to '@id'
      const blockId = item['key'] || item['@id'];
      // object_list items don't have @type, use a generic title or item field
      const title = item.title || item.plaintext || `Item ${index + 1}`;

      return {
        id: blockId,
        type: 'object_list_item',
        title: title,
        data: item,
      };
    });
  }

  // Standard container: blocks object + blocks_layout
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
 * Get child blocks for a page-level field
 */
const getChildBlocksForPageField = (formData, fieldConfig) => {
  const { fieldName } = fieldConfig;
  const layoutField = `${fieldName}_layout`;
  const pageBlocks = formData?.[layoutField]?.items || [];
  const blocksData = formData?.[fieldName] || {};

  return pageBlocks.map((blockId) => {
    const blockData = blocksData[blockId];
    return {
      id: blockId,
      type: blockData?.['@type'] || 'unknown',
      title: getBlockTitle(blockData),
      data: blockData,
    };
  });
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
  pageBlocksFields,
}) => {
  const intl = useIntl();
  const [isClient, setIsClient] = React.useState(false);

  React.useEffect(() => {
    setIsClient(true);
  }, []);

  // If no block selected, show page-level blocks for each page field
  if (!selectedBlock) {
    // Use pageBlocksFields if provided, otherwise default to single 'blocks' field
    const fieldsConfig = pageBlocksFields || [{ fieldName: 'blocks', title: 'Blocks' }];

    if (!isClient) return null;

    // Note: Uses sidebar-order for backwards compatibility with tests
    const target = document.getElementById('sidebar-order');
    if (!target) return null;

    return createPortal(
      <div className="child-blocks-widget page-blocks-fields">
        {fieldsConfig.map((fieldConfig) => {
          const childBlocks = getChildBlocksForPageField(formData, fieldConfig);
          return (
            <ContainerFieldSection
              key={fieldConfig.fieldName}
              fieldName={fieldConfig.fieldName}
              fieldTitle={fieldConfig.title || intl.formatMessage(messages.blocks)}
              childBlocks={childBlocks}
              allowedBlocks={fieldConfig.allowedBlocks}
              maxLength={fieldConfig.maxLength}
              onSelectBlock={onSelectBlock}
              onAddBlock={onAddBlock}
              onMoveBlock={onMoveBlock}
              parentBlockId={null}
            />
          );
        })}
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
    intl,
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
        const childBlocks = getChildBlocks(blockData, field.fieldName, formData, field.isObjectList, field.dataPath);
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
  pageBlocksFields: PropTypes.arrayOf(PropTypes.shape({
    fieldName: PropTypes.string.isRequired,
    title: PropTypes.string,
    allowedBlocks: PropTypes.arrayOf(PropTypes.string),
    maxLength: PropTypes.number,
  })),
};

export default ChildBlocksWidget;
