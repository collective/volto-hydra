/**
 * SchemaFieldSelectWidget — a select whose choices are the CURRENT content
 * type's schema fields, filtered by a `fieldType` parameter.
 *
 * Field options (alongside `widget: 'schemaFieldSelect'`):
 *   - fieldType: 'relation' | 'keyword' | undefined — which fields to offer.
 *       'relation' → RelationList/RelationChoice fields (widget `relateditems`)
 *       'keyword'  → tag/keyword fields (widget `tags` or a Keywords vocabulary)
 *       undefined  → every field
 *
 * The content type comes from the page's `@type` (the block lives on a page);
 * the schema is fetched via Volto's `getSchema`. An empty first option lets the
 * consuming block fall back to its own default (e.g. `relatedItems`).
 */
import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import config from '@plone/volto/registry';
import { getSchema } from '@plone/volto/actions/schema/schema';
import { useHydraSchemaContext } from '../../context/HydraSchemaContext';

function matchesFieldType(prop, fieldType) {
  if (!fieldType) return true;
  const widget = prop?.widget;
  const vocab = prop?.vocabulary?.['@id'] || prop?.items?.vocabulary?.['@id'] || '';
  if (fieldType === 'relation') return widget === 'relateditems';
  if (fieldType === 'keyword') return widget === 'tags' || /Keywords$/.test(vocab);
  return true;
}

const SchemaFieldSelectWidget = (props) => {
  const { fieldType } = props;
  const dispatch = useDispatch();
  const hydraCtx = useHydraSchemaContext();
  const contentType = hydraCtx?.formData?.['@type'];

  useEffect(() => {
    if (contentType) dispatch(getSchema(contentType));
  }, [dispatch, contentType]);

  const schema = useSelector((state) => state.schema?.schema);
  const properties = schema?.properties || {};

  const choices = [
    ['', '— default —'],
    ...Object.entries(properties)
      .filter(([, prop]) => matchesFieldType(prop, fieldType))
      .map(([name, prop]) => [name, prop.title || name]),
  ];

  const SelectWidget = config.widgets.widget.select;
  return <SelectWidget {...props} choices={choices} />;
};

export default SchemaFieldSelectWidget;
