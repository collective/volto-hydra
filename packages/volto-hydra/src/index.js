import selectedBlock from './reducers';

const applyConfig = (config) => {
  // Add the selectedBlock reducer
  config.addonReducers.selectedBlock = selectedBlock;
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

  return config;
};

export default applyConfig;
