import frontendPreviewUrl from './reducers';
import {
  getAllowedBlocksList,
  subscribeToAllowedBlocksListChanges,
} from './utils/allowedBlockList';
import HydraSlateWidget from './widgets/HydraSlateWidget';

const applyConfig = (config) => {
  // Add the frontendPreviwUrl reducer
  config.addonReducers.frontendPreviewUrl = frontendPreviewUrl;

  // Register the HydraSlateWidget that exposes editor instances
  config.widgets.widget.hydra_slate = HydraSlateWidget;

  // Add the slate block in the sidebar
  config.blocks.blocksConfig.slate = {
    ...config.blocks.blocksConfig.slate,
    schemaEnhancer: ({ formData, schema, intl }) => {
      schema.properties.value = {
        title: 'Body',
        widget: 'hydra_slate',
      };
      // Add to the beginning of the fields array to make it more visible
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
        value: [{ type: 'p', children: [{ text: '', nodeId: 2 }], nodeId: 1 }],
      },
    ],
  };

  return config;
};

export default applyConfig;
