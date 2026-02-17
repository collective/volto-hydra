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
import { mergeTemplatesIntoPage } from '@volto-hydra/hydra-js';
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
  noLayout: {
    id: 'No layout',
    defaultMessage: 'None',
  },
});

// Extract display name from template URL path
// Returns "None" for null (no layout option)
const getDisplayName = (url, intl) => {
  if (url === null) {
    return intl ? intl.formatMessage(messages.noLayout) : 'None';
  }
  const parts = url.split('/');
  const lastPart = parts[parts.length - 1] || parts[parts.length - 2];
  // Convert kebab-case to Title Case
  return lastPart
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

// Detect the currently applied layout from formData blocks.
// Blocks from a layout template carry a `templateId` that matches an allowedLayouts URL.
const detectCurrentLayout = (formData, allowedLayouts) => {
  if (!allowedLayouts?.length) return '';
  const blocks = formData?.blocks || {};
  for (const block of Object.values(blocks)) {
    if (block.templateId && allowedLayouts.includes(block.templateId)) {
      return block.templateId;
    }
  }
  return '';
};

const LayoutSelector = ({
  formData,
  onChangeFormData,
  allowedLayouts, // Array of template URL strings from field config
}) => {
  const intl = useIntl();
  const [loading, setLoading] = React.useState(false);

  // Detect the currently applied layout from formData
  const currentLayout = React.useMemo(
    () => detectCurrentLayout(formData, allowedLayouts),
    [formData, allowedLayouts],
  );

  const [selectedUrl, setSelectedUrl] = React.useState(currentLayout);

  // Sync dropdown when current layout changes (after apply or initial load)
  React.useEffect(() => {
    setSelectedUrl(currentLayout);
  }, [currentLayout]);

  const handleApply = async () => {
    if (!selectedUrl || selectedUrl === currentLayout) return;

    setLoading(true);
    try {
      const api = new Api();

      // Convert 'none' back to null for the allowedLayouts
      const layoutToApply = selectedUrl === 'none' ? null : selectedUrl;

      // Use mergeTemplatesIntoPage with the selected layout as the only allowedLayout
      // This forces that layout to be applied (or removed if null)
      const { merged: newFormData } = await mergeTemplatesIntoPage(formData, {
        loadTemplate: async (templateId) => api.get(templateId),
        pageBlocksFields: { blocks: { allowedLayouts: [layoutToApply] } },
      });

      // Merge with existing formData (preserve other fields)
      onChangeFormData({
        ...formData,
        blocks: newFormData.blocks,
        blocks_layout: newFormData.blocks_layout,
      });
      // Don't reset selectedUrl — the useEffect will sync it from currentLayout
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

  // Filter out null to count actual layouts
  const actualLayouts = allowedLayouts.filter((l) => l !== null);
  const hasNullOption = allowedLayouts.includes(null);

  // If only one actual layout and no null option, it's forced - show which one (no dropdown needed)
  if (actualLayouts.length === 1 && !hasNullOption) {
    return (
      <div className="layout-selector layout-forced">
        <span className="forced-layout-label">
          Layout: {getDisplayName(actualLayouts[0], intl)}
        </span>
      </div>
    );
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
          <option key={url === null ? 'none' : url} value={url === null ? 'none' : url}>
            {getDisplayName(url, intl)}
          </option>
        ))}
      </select>
      {selectedUrl && selectedUrl !== currentLayout && (
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
