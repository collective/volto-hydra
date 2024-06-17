import selectedBlock from './reducers';

const applyConfig = (config) => {
  config.addonReducers.selectedBlock = selectedBlock;
  return config;
};

export default applyConfig;
