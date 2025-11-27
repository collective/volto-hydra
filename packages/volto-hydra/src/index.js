import frontendPreviewUrl from './reducers';
import {
  getAllowedBlocksList,
  subscribeToAllowedBlocksListChanges,
} from './utils/allowedBlockList';
import HydraSlateWidget from './widgets/HydraSlateWidget';

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
