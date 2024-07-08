import frontendPreviewUrl from './reducers';

const applyConfig = (config) => {
  // Add the frontendPreviwUrl reducer
  config.addonReducers.frontendPreviewUrl = frontendPreviewUrl;

  // Add the slate block in the sidebar
  config.blocks.blocksConfig.slate.schemaEnhancer = ({
    formData,
    schema,
    intl,
  }) => {
    schema.properties.value = {
      title: 'Body',
      widget: 'slate',
    };
    schema.fieldsets[0].fields.push('value');
    return schema;
  };
  // Set the sidebarTab to 1 & set most used to true
  config.blocks.blocksConfig.slate = {
    ...config.blocks.blocksConfig.slate,
    sidebarTab: 1,
    mostUsed: true,
  };

  // Add image from sidebar
  config.blocks.blocksConfig.image.schemaEnhancer = ({
    formData,
    schema,
    intl,
  }) => {
    schema.properties.url = {
      title: 'Image Src',
      widget: 'image',
    };
    schema.fieldsets[0].fields.push('url');
    return schema;
  };

  // Remove Blocks except for slate and image
  for (const key in config.blocks.blocksConfig) {
    if (key !== 'slate' && key !== 'image') {
      config.blocks.blocksConfig[key].restricted = true;
    }
  }

  return config;
};

export default applyConfig;
