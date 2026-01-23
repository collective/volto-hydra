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
import { set, cloneDeep } from 'lodash';
import config from '@plone/volto/registry';
import { BlockDataForm } from '@plone/volto/components/manage/Form';
import { Icon } from '@plone/volto/components';
import { SidebarPortalTargetContext } from './SidebarPortalTargetContext';
import DropdownMenu from '../Toolbar/DropdownMenu';
import { getBlockById, getBlockSchema, updateBlockById } from '../../utils/blockPath';
import { HydraSchemaProvider } from '../../context';
import { getConvertibleTypes, convertBlockType } from '../../utils/schemaInheritance';
import { PAGE_BLOCK_UID } from '@volto-hydra/hydra-js';

/**
 * Get the display title for a block type
 * For object_list items, looks up the itemSchema.title from the parent's field definition
 */
const getBlockTypeTitle = (blockType, blockPathMap, blockId) => {
  // Check if this is an object_list item via blockPathMap FIRST
  // (object_list items often don't have @type, so blockType may be undefined)
  const pathInfo = blockPathMap?.[blockId];
  if (pathInfo?.isObjectListItem) {
    // Try to get title from blockType (parentType:fieldName format)
    // For nested types like slateTable:rows:cells, parentType is slateTable:rows, fieldName is cells
    if (pathInfo.blockType) {
      const parts = pathInfo.blockType.split(':');
      const fieldName = parts.pop(); // Last part is the field name
      const parentType = parts.join(':'); // Everything else is parent type
      const parentConfig = config.blocks?.blocksConfig?.[parentType];
      if (parentConfig?.blockSchema) {
        const parentSchema = typeof parentConfig.blockSchema === 'function'
          ? parentConfig.blockSchema({ formData: {}, intl: { formatMessage: (m) => m.defaultMessage } })
          : parentConfig.blockSchema;
        const fieldDef = parentSchema?.properties?.[fieldName];
        // Use itemSchema.title if available
        if (fieldDef?.schema?.title) {
          return fieldDef.schema.title;
        }
        // Fallback: use singular form of field title (e.g., "Slides" -> "Slide")
        if (fieldDef?.title) {
          const singular = fieldDef.title.replace(/s$/, '');
          return singular;
        }
        // Fallback: derive from field name (e.g., "rows" -> "Row", "cells" -> "Cell")
        if (fieldName) {
          const singular = fieldName.replace(/s$/, '');
          return singular.charAt(0).toUpperCase() + singular.slice(1);
        }
      }
    }

    // For nested object_list items without itemType, use containerField
    // This handles deeply nested structures like slateTable (rows > cells)
    if (pathInfo.containerField) {
      const singular = pathInfo.containerField.replace(/s$/, '');
      return singular.charAt(0).toUpperCase() + singular.slice(1);
    }
  }

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
    // Stop at PAGE_BLOCK_UID - it's the root, not a block to show in hierarchy
    if (pathInfo?.parentId && pathInfo.parentId !== PAGE_BLOCK_UID) {
      parents.unshift(pathInfo.parentId); // Add to front
      currentId = pathInfo.parentId;
    } else {
      break;
    }
  }

  return parents;
};


/**
 * Filter out container fields from schema (type: 'blocks' or widget: 'object_list')
 * These fields display as [object Object] and should be managed via the block hierarchy instead
 */
const filterBlocksFields = (schema) => {
  if (!schema) return null;

  const containerFields = new Set();
  for (const [fieldId, fieldDef] of Object.entries(schema.properties || {})) {
    if (fieldDef?.type === 'blocks' || fieldDef?.widget === 'object_list') {
      containerFields.add(fieldId);
    }
  }

  // If no container fields, return schema as-is
  if (containerFields.size === 0) return schema;

  // Filter out container fields from fieldsets and properties
  return {
    ...schema,
    fieldsets: schema.fieldsets?.map((fieldset) => ({
      ...fieldset,
      fields: fieldset.fields?.filter((f) => !containerFields.has(f)),
    })),
    properties: Object.fromEntries(
      Object.entries(schema.properties || {}).filter(
        ([key]) => !containerFields.has(key),
      ),
    ),
  };
};

/**
 * Get the block schema for a block type, filtered for sidebar display.
 * Returns filtered schema (without blocks-type fields) or null.
 * Uses the central getBlockSchema which handles object_list items.
 */
const getFilteredBlockSchema = (blockType, intl, blockPathMap, blockId, blockData) => {
  const schema = getBlockSchema(blockType, intl, config.blocks?.blocksConfig, blockPathMap, blockId, blockData);
  if (!schema) return null;

  // Filter out blocks-type fields (container fields) for sidebar display
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
  onDeleteBlock,
  onChangeBlock,
  onBlockAction,
  formData,
  pathname,
  intl,
  blockPathMap,
  liveBlockDataRef,
}) => {
  // Store current block data in liveBlockDataRef on every render
  // This ensures child schemaEnhancers can see parent's current data
  if (liveBlockDataRef && blockData) {
    liveBlockDataRef.current[blockId] = blockData;
  }

  const [menuOpen, setMenuOpen] = React.useState(false);
  const [menuButtonRect, setMenuButtonRect] = React.useState(null);
  const menuButtonRef = React.useRef(null);

  const title = getBlockTypeTitle(blockType, blockPathMap, blockId);
  // Use sidebar-properties for current block (backwards compat), parent-sidebar-{id} for parents
  const targetId = isCurrentBlock ? 'sidebar-properties' : `parent-sidebar-${blockId}`;

  // Get the Edit component for this block type
  // Skip Edit component if sidebarSchemaOnly is set (e.g., slateTable's Edit expects specific data structures)
  const blockConfig = config.blocks?.blocksConfig?.[blockType];
  const useSchemaOnly = blockConfig?.sidebarSchemaOnly;
  const BlockEdit = useSchemaOnly ? null : blockConfig?.edit;

  // Get schema for fallback rendering (when no Edit component or sidebarSchemaOnly)
  const schema = !BlockEdit ? getFilteredBlockSchema(blockType, intl, blockPathMap, blockId, blockData) : null;

  // Compute a key suffix that changes when parent's schema inheritance state changes.
  // This forces BlockEdit to remount when parent's typeField changes, ensuring child gets fresh schema.
  // Without this, Volto's BlockEdit caches its internal form and doesn't re-render with new schema.
  const parentSchemaKey = React.useMemo(() => {
    if (!parentId || !liveBlockDataRef?.current) return '';
    const parentBlock = liveBlockDataRef.current[parentId];
    if (!parentBlock) return '';
    const parentConfig = config.blocks?.blocksConfig?.[parentBlock['@type']];
    const parentTypeField = parentConfig?.schemaEnhancer?.config?.typeField;
    if (!parentTypeField) return '';
    return `-parent-${parentTypeField}:${parentBlock[parentTypeField] || 'none'}`;
  }, [parentId, liveBlockDataRef?.current?.[parentId]]);

  const handleMenuClick = (e) => {
    e.stopPropagation();
    if (menuButtonRef.current) {
      setMenuButtonRect(menuButtonRef.current.getBoundingClientRect());
    }
    setMenuOpen(!menuOpen);
  };

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
        <div className="block-actions-menu" style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
          {/* Toolbar action buttons (e.g., add row/column for tables) */}
          {(() => {
            const pathInfo = blockPathMap?.[blockId];
            const toolbarActions = pathInfo?.actions?.toolbar || [];
            if (toolbarActions.length === 0 || !onBlockAction) return null;
            const actionsRegistry = config.settings.hydraActions || {};
            return (
              <div style={{ display: 'flex', alignItems: 'center', gap: '1px' }}>
                {toolbarActions.map((actionId) => {
                  const actionDef = actionsRegistry[actionId] || { label: actionId };
                  return (
                    <button
                      key={actionId}
                      title={actionDef.label}
                      onClick={() => onBlockAction(actionId, blockId)}
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: '4px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '2px',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#e8e8e8')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                    >
                      {actionDef.icon ? (
                        <Icon name={actionDef.icon} size="18px" />
                      ) : (
                        actionDef.label
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })()}
          <button
            ref={menuButtonRef}
            className="menu-trigger"
            title="Block actions"
            onClick={handleMenuClick}
          >
            •••
          </button>
          {menuOpen && (() => {
            const pathInfo = blockPathMap?.[blockId];
            const blocksConfig = config.blocks?.blocksConfig;
            const convertibleTypes = getConvertibleTypes(blockType, blocksConfig);
            const handleConvertBlock = (newType) => {
              const newBlockData = convertBlockType(blockData, newType, blocksConfig);
              // Preserve the block ID
              newBlockData['@uid'] = blockId;
              onChangeBlock(blockId, newBlockData);
            };
            return (
              <DropdownMenu
                selectedBlock={blockId}
                onDeleteBlock={onDeleteBlock}
                menuButtonRect={menuButtonRect}
                onClose={() => setMenuOpen(false)}
                // No onOpenSettings - we're already in sidebar/settings
                parentId={parentId}
                onSelectBlock={onSelectBlock}
                tableActions={pathInfo?.actions}
                onTableAction={onBlockAction ? (actionId) => onBlockAction(actionId, blockId) : null}
                addMode={pathInfo?.addMode}
                parentAddMode={pathInfo?.parentAddMode}
                addDirection={pathInfo?.addDirection}
                convertibleTypes={convertibleTypes}
                onConvertBlock={handleConvertBlock}
              />
            );
          })()}
        </div>
      </div>

      {/* Portal target for parent blocks only - they render their own sidebar content
          Current block's #sidebar-properties is a static element in Sidebar.jsx */}
      {!isCurrentBlock && (
        <div
          id={targetId}
          className="sidebar-section-content parent-block-settings"
        />
      )}

      {/* Render Edit component for sidebar content
          We take full control - SidebarPortal only renders when context is set
          Parent blocks: render to their own target div
          Current block: render to sidebar-properties */}
      {BlockEdit && (
        <HydraSchemaProvider value={{ blockPathMap, currentBlockId: blockId, formData, blocksConfig: config.blocks?.blocksConfig, liveBlockDataRef }}>
          <SidebarPortalTargetContext.Provider value={targetId}>
            {/* Hidden container - Edit component's center content is hidden, only sidebar renders */}
            {/* Key includes parentSchemaKey to force remount when parent's schema inheritance changes */}
            <div key={`${blockId}${parentSchemaKey}`} style={{ display: 'none' }}>
              <BlockEdit
                type={blockType}
                id={blockId}
                data={blockData}
                selected={true}
                index={index}
                properties={formData}
                pathname={pathname}
                intl={intl}
                onChangeBlock={onChangeBlock}
                // For parent blocks, use no-op to prevent Edit components from changing
                // selection when they initialize/render. This was causing parent blocks
                // to get selected when clicking on child blocks (e.g., empty blocks).
                // For current block, use real onSelectBlock for sub-selections.
                onSelectBlock={isCurrentBlock ? onSelectBlock : () => {}}
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
        </HydraSchemaProvider>
      )}

      {/* Fallback: If no Edit component but has schema, render BlockDataForm directly */}
      {!BlockEdit && schema && (() => {
        const formContent = (
          <HydraSchemaProvider value={{ blockPathMap, currentBlockId: blockId, formData, blocksConfig: config.blocks?.blocksConfig, liveBlockDataRef }}>
            <BlockDataForm
              schema={schema}
              onChangeField={(fieldId, value) => {
                // Use lodash set for nested paths like 'itemDefaults.overwrite'
                const newBlockData = cloneDeep(blockData);
                set(newBlockData, fieldId, value);
                onChangeBlock(blockId, newBlockData);
              }}
              onChangeBlock={(id, data) => {
                onChangeBlock(id, data);
              }}
              formData={blockData}
              block={blockId}
              applySchemaEnhancers={true}
            />
          </HydraSchemaProvider>
        );
        // Portal to the target element (sidebar-properties for current, parent-sidebar-{id} for parents)
        const targetElement = document.getElementById(targetId);
        return targetElement ? createPortal(formContent, targetElement) : null;
      })()}
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
  onDeleteBlock,
  onChangeBlock,
  onBlockAction,
}) => {
  const [isClient, setIsClient] = React.useState(false);
  const prevSelectedBlockRef = React.useRef(null);
  const intl = useIntl();
  const location = useLocation();
  const pathname = location?.pathname || '';

  // Track live block data from each form's internal state
  // This ref is updated synchronously when any block's form changes,
  // so child schemaEnhancers see fresh parent data immediately
  const liveBlockDataRef = React.useRef({});

  // Wrapper that captures block data changes before propagating to parent
  const handleBlockChange = React.useCallback((blockId, newBlockData) => {
    // Update ref immediately (synchronous, no React batching)
    liveBlockDataRef.current = { ...liveBlockDataRef.current, [blockId]: newBlockData };
    // Propagate to parent
    onChangeBlock(blockId, newBlockData);
  }, [onChangeBlock]);

  React.useEffect(() => {
    setIsClient(true);
  }, []);

  // Scroll to current block settings when selection changes
  React.useEffect(() => {
    if (!isClient || !selectedBlock) return;

    // Only scroll when selecting a different block
    if (prevSelectedBlockRef.current === selectedBlock) return;
    prevSelectedBlockRef.current = selectedBlock;

    // Poll until sidebar content has rendered, then scroll
    // This handles async content like Slate editors that render after initial mount
    let attempts = 0;
    const maxAttempts = 20; // 2 seconds max (20 * 100ms)

    const tryScroll = () => {
      attempts++;
      const sidebarProperties = document.getElementById('sidebar-properties');
      const scrollContainer = document.querySelector('.sidebar-content-wrapper');

      if (!sidebarProperties || !scrollContainer) {
        if (attempts < maxAttempts) setTimeout(tryScroll, 100);
        return;
      }

      // Wait until there's actual content inside (not just an empty container)
      // The form or editor content should have rendered
      const hasContent = sidebarProperties.querySelector('form, [role="textbox"]');
      if (!hasContent && attempts < maxAttempts) {
        setTimeout(tryScroll, 100);
        return;
      }

      const containerRect = scrollContainer.getBoundingClientRect();
      const propertiesRect = sidebarProperties.getBoundingClientRect();

      // Calculate scroll needed to show settings from the top
      // We want: as much of settings visible as possible, but top must always be visible
      const propertiesTop = propertiesRect.top;
      const propertiesBottom = propertiesRect.bottom;
      const containerTop = containerRect.top;
      const containerBottom = containerRect.bottom;
      const containerHeight = containerRect.height;
      const propertiesHeight = propertiesRect.height;

      // First, ensure the TOP of settings is visible (scroll up if needed)
      if (propertiesTop < containerTop) {
        // Settings top is above viewport - scroll up to show it
        const scrollAmount = propertiesTop - containerTop;
        scrollContainer.scrollTop += scrollAmount;
      } else if (propertiesTop > containerTop && propertiesHeight <= containerHeight) {
        // Settings fit entirely - scroll to show from top with some padding
        const scrollAmount = propertiesTop - containerTop - 10;
        if (scrollAmount > 0) {
          scrollContainer.scrollTop += scrollAmount;
        }
      } else if (propertiesTop > containerTop && propertiesHeight > containerHeight) {
        // Settings are taller than viewport - scroll to show top
        const scrollAmount = propertiesTop - containerTop - 10;
        if (scrollAmount > 0) {
          scrollContainer.scrollTop += scrollAmount;
        }
      }
    };

    // Start polling after a small delay for initial React render
    setTimeout(tryScroll, 100);
  }, [isClient, selectedBlock]);

  if (!isClient) {
    return null;
  }
  if (!selectedBlock) {
    return null;
  }

  const parentsTarget = document.getElementById('sidebar-parents');
  if (!parentsTarget) {
    return null;
  }

  // Get parent chain
  const parentIds = getParentChain(selectedBlock, blockPathMap);

  // Get current block data and type from blockPathMap (single source of truth)
  const currentBlockData = getBlockById(formData, blockPathMap, selectedBlock);
  const currentBlockType = blockPathMap[selectedBlock]?.blockType;

  // Guard: If block data is undefined, skip rendering (data may be out of sync during drag operations)
  if (!currentBlockData) {
    console.warn('[ParentBlocksWidget] Block data undefined for:', selectedBlock, 'blockPathMap entry:', blockPathMap[selectedBlock]);
    return null;
  }

  return (
    <>
      {createPortal(
        <>
          {/* Parent blocks with headers + settings */}
          {parentIds.map((parentId, index) => {
            const parentData = getBlockById(formData, blockPathMap, parentId);
            const parentType = blockPathMap[parentId]?.blockType;
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
                onDeleteBlock={onDeleteBlock}
                onChangeBlock={handleBlockChange}
                onBlockAction={onBlockAction}
                formData={formData}
                pathname={pathname}
                intl={intl}
                blockPathMap={blockPathMap}
                liveBlockDataRef={liveBlockDataRef}
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
            onDeleteBlock={onDeleteBlock}
            onChangeBlock={handleBlockChange}
            onBlockAction={onBlockAction}
            formData={formData}
            pathname={pathname}
            intl={intl}
            blockPathMap={blockPathMap}
            liveBlockDataRef={liveBlockDataRef}
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
  onDeleteBlock: PropTypes.func,
  onChangeBlock: PropTypes.func,
  onBlockAction: PropTypes.func,
};

export default ParentBlocksWidget;
