/**
 * BlockTypeWidget - Select a block type from available types
 *
 * Used by container blocks to specify what type of block their children should be.
 * For example, a listing block can use this to select "teaser" as the item type.
 *
 * Allowed types are determined in order of precedence:
 * 1. Static `allowedTypes` array in schema property
 * 2. Parent container's `allowedBlocks` (via blockPathMap)
 * 3. Page-level allowed blocks (config.blocks.groupBlocksOrder)
 */
import FormFieldWrapper from '@plone/volto/components/manage/Widgets/FormFieldWrapper';
import {
  customSelectStyles,
  DropdownIndicator,
  selectTheme,
} from '@plone/volto/components/manage/Widgets/SelectStyling';
import { injectLazyLibs } from '@plone/volto/helpers/Loadable/Loadable';
import config from '@plone/volto/registry';

const BlockTypeWidget = (props) => {
  const {
    id,
    value,
    onChange,
    allowedTypes,       // Static list from schema (optional)
    useParentAllowed,   // If true, get from parent container's allowedBlocks
    blockPathMap,       // Maps block IDs to their container context
    blockId,            // Current block ID (to find parent)
    required,
    reactSelect,
  } = props;

  const Select = reactSelect.default;
  const blocksConfig = config.blocks.blocksConfig;

  // Determine allowed types in order of precedence
  let types = allowedTypes;

  // Try to get from parent container if useParentAllowed is set
  if (!types && useParentAllowed && blockPathMap && blockId) {
    const pathInfo = blockPathMap[blockId];
    if (pathInfo?.allowedBlocks) {
      types = pathInfo.allowedBlocks;
    }
  }

  // Fall back to all non-restricted blocks
  if (!types) {
    types = Object.keys(blocksConfig).filter(
      (type) => blocksConfig[type] && !blocksConfig[type].restricted,
    );
  }

  // Build options from blocksConfig
  const options = types
    .filter((type) => blocksConfig[type])
    .map((type) => ({
      value: type,
      label: blocksConfig[type].title || type,
    }));

  // Find current value option
  const selectedOption = options.find((opt) => opt.value === value) || null;

  return (
    <FormFieldWrapper {...props} columns={1}>
      <Select
        id={`field-${id}`}
        name={id}
        value={selectedOption}
        options={options}
        onChange={(selected) => onChange(id, selected?.value || null)}
        styles={customSelectStyles}
        theme={selectTheme}
        components={{ DropdownIndicator }}
        classNamePrefix="react-select"
        isClearable={!required}
        placeholder="Select block type..."
      />
    </FormFieldWrapper>
  );
};

export default injectLazyLibs(['reactSelect'])(BlockTypeWidget);
