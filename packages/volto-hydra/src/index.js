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
  // Set the sidebarTab to 1
  config.blocks.blocksConfig.slate.sidebarTab = 1;

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

  return config;
};

export default applyConfig;
