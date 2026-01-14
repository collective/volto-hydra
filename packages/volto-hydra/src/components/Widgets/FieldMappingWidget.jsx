/**
 * FieldMappingWidget - Configure source → target field mappings
 *
 * Used by blocks that populate child blocks from external data (e.g., listing blocks).
 * Maps query result fields to target block type fields.
 *
 * Example: Map "title" from query results to "headline" field in teaser blocks.
 */
import { useIntl } from 'react-intl';
import FormFieldWrapper from '@plone/volto/components/manage/Widgets/FormFieldWrapper';
import {
  customSelectStyles,
  DropdownIndicator,
  selectTheme,
} from '@plone/volto/components/manage/Widgets/SelectStyling';
import { injectLazyLibs } from '@plone/volto/helpers/Loadable/Loadable';
import {
  getBlockSchema,
  computeSmartDefaults,
} from '../../utils/schemaInheritance';

/**
 * Get schema fields for a block type as options for a select
 */
const getBlockSchemaFields = (blockType, intl) => {
  const schema = getBlockSchema(blockType, intl);
  if (!schema?.properties) return [];

  return Object.entries(schema.properties).map(([fieldName, fieldDef]) => ({
    value: fieldName,
    label: fieldDef.title || fieldName,
  }));
};

const FieldMappingWidget = (props) => {
  const {
    id,
    value = {},       // { sourceField: targetField, ... }
    onChange,
    sourceFields,     // { fieldName: { title: "Field Title" }, ... }
    targetType,       // Target block type (injected by schemaEnhancer)
    reactSelect,
  } = props;

  const intl = useIntl();
  const Select = reactSelect.default;

  // Get target schema and compute smart defaults
  const targetSchema = getBlockSchema(targetType, intl);
  const smartDefaults = sourceFields && targetSchema
    ? computeSmartDefaults(sourceFields, targetSchema)
    : {};

  // Filter out any saved mappings that reference fields not in the current target type
  const validTargetFields = new Set(Object.keys(targetSchema?.properties || {}));
  const filteredValue = Object.fromEntries(
    Object.entries(value || {}).filter(([, targetField]) => validTargetFields.has(targetField))
  );

  // Use smart defaults for any unmapped fields, filtered values override defaults
  // Note: The schemaEnhancer (inheritSchemaFrom) handles atomic updates to formData
  // when itemType changes, so we don't need a useEffect here
  const effectiveValue = { ...smartDefaults, ...filteredValue };

  // Get available target fields from block schema
  const targetFieldOptions = [
    { value: '', label: '(none)' },
    ...getBlockSchemaFields(targetType, intl),
  ];

  // Handle change for a specific source field
  const handleChange = (sourceKey, targetValue) => {
    const newValue = { ...value };
    if (targetValue) {
      newValue[sourceKey] = targetValue;
    } else {
      delete newValue[sourceKey];
    }
    onChange(id, newValue);
  };

  if (!sourceFields || Object.keys(sourceFields).length === 0) {
    return (
      <FormFieldWrapper {...props} columns={1}>
        <p className="help">No source fields defined.</p>
      </FormFieldWrapper>
    );
  }

  if (!targetType) {
    return (
      <FormFieldWrapper {...props} columns={1}>
        <p className="help">Select a block type first to configure field mappings.</p>
      </FormFieldWrapper>
    );
  }

  return (
    <FormFieldWrapper {...props} columns={1}>
      <table className="field-mapping-table" style={{ width: '100%' }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', padding: '4px 8px' }}>Source</th>
            <th style={{ width: '30px', textAlign: 'center' }}>→</th>
            <th style={{ textAlign: 'left', padding: '4px 8px' }}>Target</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(sourceFields).map(([sourceKey, sourceDef]) => (
            <tr key={sourceKey}>
              <td style={{ padding: '4px 8px', verticalAlign: 'middle' }}>
                {sourceDef.title || sourceKey}
              </td>
              <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>→</td>
              <td style={{ padding: '4px 8px' }}>
                <Select
                  value={targetFieldOptions.find(
                    (opt) => opt.value === effectiveValue?.[sourceKey],
                  )}
                  options={targetFieldOptions}
                  onChange={(selected) =>
                    handleChange(sourceKey, selected?.value || '')
                  }
                  styles={customSelectStyles}
                  theme={selectTheme}
                  components={{ DropdownIndicator }}
                  classNamePrefix="react-select"
                  isClearable
                  placeholder="(none)"
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </FormFieldWrapper>
  );
};

export default injectLazyLibs(['reactSelect'])(FieldMappingWidget);
