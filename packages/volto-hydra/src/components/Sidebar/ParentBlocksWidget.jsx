/**
 * ParentBlocksWidget - Renders parent block settings in the sidebar.
 * Shows the chain of parent containers from root to the current block.
 *
 * The ‹ arrow always navigates UP one level (selects parent, closes current).
 *
 * Example hierarchy for text-1a inside col-1 inside columns-1:
 *   ‹ Columns     [...]   ← Click ‹ to deselect (go to page)
 *     [columns settings]
 *   ‹ Column      [...]   ← Click ‹ to select columns-1
 *     [column settings]
 *   ‹ Text        [...]   ← Click ‹ to select col-1 (current block, highlighted)
 *
 * Uses SidebarPortalTargetContext to redirect each block's Edit component's
 * SidebarPortal content to unique target elements for each block in the hierarchy.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { createPortal } from 'react-dom';
import { useIntl } from 'react-intl';
import { useLocation } from 'react-router-dom';
import config from '@plone/volto/registry';
import { BlockDataForm } from '@plone/volto/components/manage/Form';
import { SidebarPortalTargetContext } from './SidebarPortalTargetContext';

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
 * Filter out 'blocks' type fields from schema (container fields that hold nested blocks)
 * These fields display as [object Object] and should be managed via the block hierarchy instead
 */
const filterBlocksFields = (schema) => {
  if (!schema) return null;

  const blocksFields = new Set();
  for (const [fieldId, fieldDef] of Object.entries(schema.properties || {})) {
    if (fieldDef?.type === 'blocks') {
      blocksFields.add(fieldId);
    }
  }

  // If no blocks fields, return schema as-is
  if (blocksFields.size === 0) return schema;

  // Filter out blocks fields from fieldsets and properties
  return {
    ...schema,
    fieldsets: schema.fieldsets?.map((fieldset) => ({
      ...fieldset,
      fields: fieldset.fields?.filter((f) => !blocksFields.has(f)),
    })),
    properties: Object.fromEntries(
      Object.entries(schema.properties || {}).filter(
        ([key]) => !blocksFields.has(key),
      ),
    ),
  };
};

/**
 * Get the block schema for a block type
 * Returns filtered schema (without blocks-type fields) or null
 */
const getBlockSchema = (blockType, blockData, intl) => {
  if (!blockType) return null;

  const blockConfig = config.blocks?.blocksConfig?.[blockType];
  if (!blockConfig?.blockSchema) return null;

  // Schema can be a function or object
  let schema;
  if (typeof blockConfig.blockSchema === 'function') {
    schema = blockConfig.blockSchema({ formData: blockData || {}, intl });
  } else {
    schema = blockConfig.blockSchema;
  }

  // Filter out blocks-type fields (container fields)
  return filterBlocksFields(schema);
};

/**
 * Single parent block section with header and settings
 * Renders the block's Edit component with SidebarPortal redirected to this section
 */
const ParentBlockSection = ({
  blockId,
  blockType,
  blockData,
  parentId,
  index,
  isCurrentBlock,
  onSelectBlock,
  onChangeBlock,
  formData,
  pathname,
  intl,
}) => {
  const title = getBlockTypeTitle(blockType);
  // Use sidebar-properties for current block (backwards compat), parent-sidebar-{id} for parents
  const targetId = isCurrentBlock ? 'sidebar-properties' : `parent-sidebar-${blockId}`;

  // Get the Edit component for this block type
  const BlockEdit = config.blocks?.blocksConfig?.[blockType]?.edit;

  // Get schema for fallback rendering (when no Edit component)
  const schema = !BlockEdit ? getBlockSchema(blockType, blockData, intl) : null;

  return (
    <div className="sidebar-section parent-block-section">
      <div
        className="sidebar-section-header sticky-header"
        data-is-current={isCurrentBlock}
      >
        <button
          className="parent-nav"
          onClick={() => {
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

      {/* Portal target for Edit component's SidebarPortal content */}
      <div
        id={targetId}
        className="sidebar-section-content parent-block-settings"
      />

      {/* Render Edit component with context override - its SidebarPortal will render to targetId */}
      {BlockEdit && (
        <SidebarPortalTargetContext.Provider value={targetId}>
          {/* Hidden container - Edit component's center content is hidden, only sidebar renders */}
          <div style={{ display: 'none' }}>
            <BlockEdit
              type={blockType}
              id={blockId}
              data={blockData}
              selected={true}
              index={index}
              properties={formData}
              pathname={pathname}
              onChangeBlock={onChangeBlock}
              onSelectBlock={onSelectBlock}
              // These are needed but not used for sidebar-only rendering
              onMoveBlock={() => {}}
              onDeleteBlock={() => {}}
              onAddBlock={() => {}}
              onFocusPreviousBlock={() => {}}
              onFocusNextBlock={() => {}}
              handleKeyDown={() => {}}
              block={blockId}
              blocksConfig={config.blocks?.blocksConfig}
              navRoot={{}}
              contentType={formData?.['@type']}
            />
          </div>
        </SidebarPortalTargetContext.Provider>
      )}

      {/* Fallback: If no Edit component but has schema, render BlockDataForm directly */}
      {!BlockEdit && schema && (
        <div className="sidebar-section-content parent-block-settings fallback-form">
          <BlockDataForm
            schema={schema}
            onChangeField={(fieldId, value) => {
              const newBlockData = {
                ...blockData,
                [fieldId]: value,
              };
              onChangeBlock(blockId, newBlockData);
            }}
            onChangeBlock={(id, data) => {
              onChangeBlock(id, data);
            }}
            formData={blockData}
            block={blockId}
            applySchemaEnhancers={true}
          />
        </div>
      )}
    </div>
  );
};

/**
 * ParentBlocksWidget - Main component
 * Renders the parent chain for the selected block with settings forms
 */
const ParentBlocksWidget = ({
  selectedBlock,
  formData,
  blockPathMap,
  onSelectBlock,
  onChangeBlock,
}) => {
  const [isClient, setIsClient] = React.useState(false);
  const prevSelectedBlockRef = React.useRef(null);
  const intl = useIntl();
  const location = useLocation();
  const pathname = location?.pathname || '';

  React.useEffect(() => {
    setIsClient(true);
  }, []);

  // Scroll to current block settings when selection changes
  React.useEffect(() => {
    if (!isClient || !selectedBlock) return;

    // Only scroll when selecting a different block
    if (prevSelectedBlockRef.current === selectedBlock) return;
    prevSelectedBlockRef.current = selectedBlock;

    // Use setTimeout to ensure portal has rendered
    setTimeout(() => {
      const sidebarProperties = document.getElementById('sidebar-properties');
      if (sidebarProperties) {
        sidebarProperties.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  }, [isClient, selectedBlock]);

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
      {createPortal(
        <>
          {/* Parent blocks with headers + settings */}
          {parentIds.map((parentId, index) => {
            const parentData = getBlockData(parentId, formData, blockPathMap);
            const parentType = parentData?.['@type'];
            // Parent of this parent (or null if root)
            const grandparentId = index > 0 ? parentIds[index - 1] : null;

            return (
              <ParentBlockSection
                key={parentId}
                blockId={parentId}
                blockType={parentType}
                blockData={parentData}
                parentId={grandparentId}
                index={index}
                isCurrentBlock={false}
                onSelectBlock={onSelectBlock}
                onChangeBlock={onChangeBlock}
                formData={formData}
                pathname={pathname}
                intl={intl}
              />
            );
          })}

          {/* Current block - rendered the same way as parents */}
          <ParentBlockSection
            key={selectedBlock}
            blockId={selectedBlock}
            blockType={currentBlockType}
            blockData={currentBlockData}
            parentId={parentIds.length > 0 ? parentIds[parentIds.length - 1] : null}
            index={parentIds.length}
            isCurrentBlock={true}
            onSelectBlock={onSelectBlock}
            onChangeBlock={onChangeBlock}
            formData={formData}
            pathname={pathname}
            intl={intl}
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
  onChangeBlock: PropTypes.func,
};

export default ParentBlocksWidget;
