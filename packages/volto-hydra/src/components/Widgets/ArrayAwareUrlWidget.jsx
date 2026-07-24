import React from 'react';
import { UrlWidget as VoltoUrlWidget } from '@plone/volto/components/manage/Widgets/UrlWidget';
import withObjectBrowser from '@plone/volto/components/manage/Sidebar/ObjectBrowser';

/**
 * Array-aware UrlWidget.
 *
 * A url field's value in hydra can be the object-browser link shape —
 * `[{ '@id': url, ...}]`, holding either an internal content reference or an
 * external URL — because `getFieldType` classifies `widget: 'url'` as a link and
 * the link/media editor writes that array (View.jsx `onFieldLinkChange`). Volto's
 * stock UrlWidget is string-only: it does `useState(flattenToAppURL(props.value))`,
 * so an array value throws `url.replace is not a function` and takes the sidebar
 * form down. The custom ImageWidget already normalizes this same shape
 * (`value?.[0]?.['@id'] || value?.['@id'] || value`); this does the symmetric
 * thing for urls so every `widget: 'url'` field survives the array.
 *
 * Registered as the `url` widget in the addon's applyConfig.
 */
export const ArrayAwareUrlWidget = (props) => {
  const value =
    props.value?.[0]?.['@id'] ?? props.value?.['@id'] ?? props.value;
  return <VoltoUrlWidget {...props} value={value} />;
};

export default withObjectBrowser(ArrayAwareUrlWidget);
