/**
 * LayoutSelector - Dropdown to select and apply layout templates to a container.
 * Shows in ChildBlocksWidget header for containers.
 *
 * Templates are provided by the frontend via `allowedLayouts` on the field config.
 * This is separate from `allowedTemplates` which controls BlockChooser.
 * Templates are loaded on-demand when Apply is clicked (not on mount).
 */

import React from 'react';
import { defineMessages, useIntl } from 'react-intl';
import { applyLayoutTemplate } from '@volto-hydra/hydra-js';
import { v4 as uuid } from 'uuid';
import Api from '@plone/volto/helpers/Api/Api';

const messages = defineMessages({
  selectLayout: {
    id: 'Select layout',
    defaultMessage: 'Layout',
  },
  applyLayout: {
    id: 'Apply layout',
    defaultMessage: 'Apply',
  },
});

// Extract display name from template URL path
const getDisplayName = (url) => {
  const parts = url.split('/');
  const lastPart = parts[parts.length - 1] || parts[parts.length - 2];
  // Convert kebab-case to Title Case
  return lastPart
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const LayoutSelector = ({
  formData,
  onChangeFormData,
  allowedLayouts, // Array of template URL strings from field config
}) => {
  const intl = useIntl();
  const [selectedUrl, setSelectedUrl] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  const handleApply = async () => {
    if (!selectedUrl) return;

    setLoading(true);
    try {
      // Load template data on demand
      const api = new Api();
      const templateData = await api.get(selectedUrl);

      // Apply the layout template
      const newFormData = applyLayoutTemplate(formData, templateData, uuid);

      // Merge with existing formData (preserve other fields)
      onChangeFormData({
        ...formData,
        blocks: newFormData.blocks,
        blocks_layout: newFormData.blocks_layout,
      });

      setSelectedUrl('');
    } catch (error) {
      console.error('Failed to apply layout:', error);
    } finally {
      setLoading(false);
    }
  };

  // Don't render if no layouts configured
  if (!allowedLayouts?.length) {
    return null;
  }

  return (
    <div className="layout-selector">
      <select
        value={selectedUrl}
        onChange={(e) => setSelectedUrl(e.target.value)}
        disabled={loading}
      >
        <option value="">{intl.formatMessage(messages.selectLayout)}</option>
        {allowedLayouts.map((url) => (
          <option key={url} value={url}>
            {getDisplayName(url)}
          </option>
        ))}
      </select>
      {selectedUrl && (
        <button
          className="apply-layout-btn"
          onClick={handleApply}
          disabled={loading}
        >
          {intl.formatMessage(messages.applyLayout)}
        </button>
      )}
    </div>
  );
};

export default LayoutSelector;
