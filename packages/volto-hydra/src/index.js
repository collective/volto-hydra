import frontendPreviewUrl from './reducers';
import {
  getAllowedBlocksList,
  subscribeToAllowedBlocksListChanges,
} from './utils/allowedBlockList';
import HiddenBlocksWidget from './components/Widgets/HiddenBlocksWidget';
import HiddenObjectListWidget from './components/Widgets/HiddenObjectListWidget';
import BlockTypeWidget from './components/Widgets/BlockTypeWidget';
import FieldMappingWidget from './components/Widgets/FieldMappingWidget';
import TableSchema, { TableBlockSchema } from '@plone/volto-slate/blocks/Table/schema';
import { ImageSchema } from '@plone/volto/components/manage/Blocks/Image/schema';
import {
  inheritSchemaFrom,
  QUERY_RESULT_FIELDS,
  computeSmartDefaults,
  getBlockSchema,
} from './utils/schemaInheritance';
import rowBeforeSVG from '@plone/volto/icons/row-before.svg';
import rowAfterSVG from '@plone/volto/icons/row-after.svg';
import rowDeleteSVG from '@plone/volto/icons/row-delete.svg';
import columnBeforeSVG from '@plone/volto/icons/column-before.svg';
import columnAfterSVG from '@plone/volto/icons/column-after.svg';
import columnDeleteSVG from '@plone/volto/icons/column-delete.svg';

const applyConfig = (config) => {
  // Patch setTimeout to catch focus errors from AddLinkForm
  // AddLinkForm does: setTimeout(() => this.input.focus(), 50)
  // But if component unmounts before 50ms, this.input is null and focus() throws
  // We wrap callbacks to catch these errors since we can't easily patch the HOC-wrapped class
  if (typeof window !== 'undefined' && !window._hydraSetTimeoutPatched) {
    window._hydraSetTimeoutPatched = true;
    const originalSetTimeout = window.setTimeout;
    window.setTimeout = function (callback, delay, ...args) {
      if (typeof callback === 'function') {
        const wrappedCallback = function () {
          try {
            return callback.apply(this, arguments);
          } catch (e) {
            // Suppress focus errors from AddLinkForm unmount race condition
            if (
              e &&
              e.message &&
              e.message.includes("Cannot read properties of null (reading 'focus')")
            ) {
              // Silently ignore - component unmounted before setTimeout fired
              return;
            }
            throw e; // Re-throw other errors
          }
        };
        return originalSetTimeout.call(this, wrappedCallback, delay, ...args);
      }
      return originalSetTimeout.call(this, callback, delay, ...args);
    };
  }
  // Add the frontendPreviwUrl reducer
  config.addonReducers.frontendPreviewUrl = frontendPreviewUrl;

  // Hide container block fields - ChildBlocksWidget handles their UI
  config.widgets.type.blocks = HiddenBlocksWidget;

  // Hide object_list fields - items are edited via iframe selection
  config.widgets.widget.object_list = HiddenObjectListWidget;

  // Block type selector widget - for selecting child block types in containers
  config.widgets.widget.block_type = BlockTypeWidget;

  // Field mapping widget - for mapping source fields to target block fields
  config.widgets.widget.field_mapping = FieldMappingWidget;

  // Add the slate block in the sidebar with proper initialization
  // blockSchema is used by applyBlockDefaults to set initial values for new blocks
  // This is separate from schema (used for sidebar settings form)
  config.blocks.blocksConfig.slate = {
    ...config.blocks.blocksConfig.slate,
    // initialValue is called by Volto's _applyBlockInitialValue when adding new blocks
    // This ensures slate blocks get proper initial structure (hydra.js adds nodeIds)
    initialValue: ({ id, value }) => ({
      ...value,
      value: value.value || config.settings.slate.defaultValue(),
    }),
    schemaEnhancer: ({ formData, schema, intl }) => {
      // NOTE: Do NOT use blockSchema with widget: 'richtext' - it causes Slate corruption
      // because blockSchema runs during block registration, before proper isolation
      // Use 'slate' widget (JSON format), NOT 'richtext' (HTML format)
      schema.properties.value = {
        title: 'Body',
        widget: 'slate',
      };
      schema.fieldsets[0].fields.unshift('value');
      return schema;
    },
    sidebarTab: 1,
    mostUsed: true,
  };

  // Add image from sidebar
  config.blocks.blocksConfig.image = {
    ...config.blocks.blocksConfig.image,
    schemaEnhancer: ({ formData, schema, intl }) => {
      schema.properties.url = {
        title: 'Image Src',
        widget: 'image',
      };
      schema.fieldsets[0].fields.push('url');
      return schema;
    },
  };

  // Configure slateTable block schema for buildBlockPathMap traversal
  // Structure: block.table.rows[].cells[] with 'key' as idField
  // Sidebar titles are derived from field names: "rows" -> "Row", "cells" -> "Cell"
  // Note: We use dataPath to tell traversal where data lives WITHOUT nesting
  // inside widget: 'object', which would cause applySchemaDefaults to corrupt array data.
  // sidebarSchemaOnly: TableBlockEdit expects specific data structures that don't
  // work well when rendered in sidebar - use schema form instead.
  config.blocks.blocksConfig.slateTable = {
    ...config.blocks.blocksConfig.slateTable,
    sidebarSchemaOnly: true,
    addMode: 'table', // Double-nested structure: rows contain cells, enables column add and row cell-count copying
    blockSchema: (props) => {
      const baseSchema = TableBlockSchema(props);
      return {
        ...baseSchema,
        properties: {
          ...baseSchema.properties,
          // Rows for container traversal - uses dataPath to avoid nesting inside widget: 'object'
          rows: {
            widget: 'object_list',
            idField: 'key',
            dataPath: ['table', 'rows'], // Where to find data in block
            schema: {
              fieldsets: [{ id: 'default', title: 'Default', fields: [] }],
              properties: {
                cells: {
                  widget: 'object_list',
                  idField: 'key',
                  schema: {
                    fieldsets: [{ id: 'default', title: 'Default', fields: ['value'] }],
                    properties: {
                      value: {
                        title: 'Content',
                        widget: 'slate',
                        default: [{ type: 'p', children: [{ text: '' }] }],
                      },
                    },
                  },
                },
              },
            },
          },
        },
      };
    },
  };

  // Configure listing block to use variation as item type selector
  // The existing variation field is repurposed to select the block type for rendering items
  // expandListingBlocks reads from 'variation' field via itemTypeField option
  const existingListingSchemaEnhancer =
    config.blocks.blocksConfig.listing?.schemaEnhancer;
  config.blocks.blocksConfig.listing = {
    ...config.blocks.blocksConfig.listing,
    schemaEnhancer: (args) => {
      let { schema, formData } = args;

      // Run existing schemaEnhancer first (handles variations, etc.)
      if (existingListingSchemaEnhancer) {
        schema = existingListingSchemaEnhancer(args);
      }

      // Override variation field to use block_type widget with our allowed types
      // This repurposes Volto's variation selector for item type selection
      schema.properties.variation = {
        ...schema.properties.variation,
        title: 'Item Type',
        widget: 'block_type',
        description: 'Block type used to render each item',
        allowedTypes: ['teaser', 'image', 'card'],
        default: 'teaser',
      };

      // Remove variation from all fieldsets (moved to inherited_fields)
      schema.fieldsets = schema.fieldsets.map((fs) => ({
        ...fs,
        fields: fs.fields.filter((f) => f !== 'variation'),
      }));

      // Remove b_size from querystring widget (paging handled by frontend)
      if (schema.properties.querystring) {
        schema.properties.querystring = {
          ...schema.properties.querystring,
          schemaEnhancer: ({ schema: qsSchema }) => ({
            ...qsSchema,
            fieldsets: qsSchema.fieldsets.map((fs) => ({
              ...fs,
              fields: fs.fields.filter((f) => f !== 'b_size'),
            })),
          }),
        };
      }

      // Add fieldMapping field (fieldset added after inheritSchemaFrom runs)
      if (!schema.properties.fieldMapping) {
        schema.properties.fieldMapping = {
          title: 'Field Mapping',
          widget: 'field_mapping',
          sourceFields: QUERY_RESULT_FIELDS,
          targetTypeField: 'variation',
          description: 'Map query result fields to item block fields',
        };
      }

      // Inject current variation (item type) into fieldMapping widget props
      // Use default if variation isn't set yet (e.g., new block)
      const itemType =
        formData?.variation || schema.properties.variation?.default || 'teaser';
      if (schema.properties.fieldMapping && itemType) {
        schema.properties.fieldMapping = {
          ...schema.properties.fieldMapping,
          targetType: itemType,
        };
      }

      // Run schema inheritance for the referenced block type (uses variation field)
      // This adds the inherited_fields fieldset (teaser defaults, etc.)
      schema = inheritSchemaFrom('variation', 'fieldMapping', 'itemDefaults')({
        ...args,
        schema,
      });

      // Add fieldMapping fieldset AFTER inherited fields (so order is: variation, defaults, mapping)
      if (!schema.fieldsets.find((fs) => fs.id === 'mapping')) {
        schema.fieldsets.push({
          id: 'mapping',
          title: 'Field Mapping',
          fields: ['fieldMapping'],
        });
      }

      return schema;
    },
  };

  // Configure image block with blockSchema for schema inheritance
  // The default image block only has 'schema' (settings), not 'blockSchema' (data schema)
  config.blocks.blocksConfig.image = {
    ...config.blocks.blocksConfig.image,
    blockSchema: ImageSchema,
  };

  // Configure search block to add listing container field
  // Volto's search block already has facets with widget: 'object_list'
  // We add listing/listing_layout so search can contain a listing block child
  const existingSearchSchemaEnhancer =
    config.blocks.blocksConfig.search?.schemaEnhancer;
  config.blocks.blocksConfig.search = {
    ...config.blocks.blocksConfig.search,
    schemaEnhancer: (args) => {
      let { schema } = args;

      // Defensive check - schema must exist
      if (!schema || !schema.properties) {
        return schema;
      }

      // Run existing schemaEnhancer first
      if (existingSearchSchemaEnhancer) {
        schema = existingSearchSchemaEnhancer(args);
      }

      // Add listing container field for child listing block
      if (schema.properties && !schema.properties.listing) {
        schema.properties.listing = {
          title: 'Results Listing',
          type: 'blocks', // Required for blockPathMap traversal
          description: 'Listing block to render search results',
          allowedBlocks: ['listing', 'teaser'],
          maxLength: 1,
          defaultBlockType: 'listing',
        };
        schema.properties.listing_layout = {
          title: 'Results Layout',
          type: 'blocks_layout',
        };
      }

      // Remove fields not needed for Hydra (query handled by child listing, no views selector)
      // Facets are edited via iframe selection, not the accordion widget
      // Keep showSortOn/sortOnOptions (sort dropdown controls), facetsTitle, and controls fieldset
      const fieldsToRemove = [
        'query',
        'availableViews', // Results template - not needed, handled by listing child
      ];
      // Keep 'facets' fieldset - facetsTitle shows, facets object_list hidden by HiddenObjectListWidget
      const fieldsetsToRemove = ['searchquery', 'views'];

      // Remove from fieldsets
      schema.fieldsets = (schema.fieldsets || [])
        .filter((fs) => !fieldsetsToRemove.includes(fs.id))
        .map((fs) => ({
          ...fs,
          fields: fs.fields.filter((f) => !fieldsToRemove.includes(f)),
        }));

      // Remove from properties
      fieldsToRemove.forEach((field) => {
        delete schema.properties[field];
      });

      return schema;
    },
  };

  const updateAllowedBlocks = () => {
    const allowedBlocksList = getAllowedBlocksList();
    const defaultAllowedBlocks = ['slate', 'image'];

    for (const key in config.blocks.blocksConfig) {
      config.blocks.blocksConfig[key].restricted =
        allowedBlocksList && allowedBlocksList.length > 0
          ? !allowedBlocksList.includes(key)
          : !defaultAllowedBlocks.includes(key);
    }
  };
  // Subscribe to changes in the allowed blocks list
  subscribeToAllowedBlocksListChanges(updateAllowedBlocks);

  // Initial call to set the blocks based on the initial state
  updateAllowedBlocks();

  // Initial block for Document content type
  config.blocks.initialBlocks = {
    Document: [
      { '@type': 'title' },
      {
        '@type': 'slate',
        value: [{ type: 'p', children: [{ text: '' }] }],
      },
    ],
  };

  // Generic block actions registry
  // Actions can be referenced by ID in pathMap and rendered in toolbar/dropdown
  // Each action defines: label, icon (SVG import), and the action is dispatched by ID
  config.settings.hydraActions = {
    addRowBefore: { label: 'Add Row Before', icon: rowBeforeSVG },
    addRowAfter: { label: 'Add Row After', icon: rowAfterSVG },
    addColumnBefore: { label: 'Add Column Before', icon: columnBeforeSVG },
    addColumnAfter: { label: 'Add Column After', icon: columnAfterSVG },
    deleteRow: { label: 'Remove Row', icon: rowDeleteSVG },
    deleteColumn: { label: 'Remove Column', icon: columnDeleteSVG },
  };

  return config;
};

export default applyConfig;
