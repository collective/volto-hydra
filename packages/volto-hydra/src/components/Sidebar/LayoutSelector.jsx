/**
 * LayoutSelector - Dropdown to select and apply layout templates to a container.
 * Shows in ChildBlocksWidget header for containers.
 *
 * Templates are provided by the frontend via `allowedTemplates` on the field config,
 * similar to `allowedBlocks`.
 */

import React from 'react';
import { defineMessages, useIntl } from 'react-intl';
import {
  applyLayoutTemplate,
  isLayoutTemplate,
} from '@volto-hydra/hydra-js';
import { v4 as uuid } from 'uuid';

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

const LayoutSelector = ({
  formData,
  onChangeFormData,
  allowedTemplates, // Array of template objects from field config
  targetBlockId, // null for page-level, blockId for container
}) => {
  const intl = useIntl();
  const [selectedTemplate, setSelectedTemplate] = React.useState(null);
  const [loading, setLoading] = React.useState(false);

  // Filter to layout templates only (have fixed edge blocks)
  const layoutTemplates = React.useMemo(() => {
    if (!allowedTemplates?.length) return [];
    return allowedTemplates.filter((t) => isLayoutTemplate(t));
  }, [allowedTemplates]);

  const handleApply = async () => {
    if (!selectedTemplate) return;

    setLoading(true);
    try {
      // Apply the layout template
      const newFormData = applyLayoutTemplate(formData, selectedTemplate, uuid);

      // Merge with existing formData (preserve other fields)
      onChangeFormData({
        ...formData,
        blocks: newFormData.blocks,
        blocks_layout: newFormData.blocks_layout,
      });

      setSelectedTemplate(null);
    } catch (error) {
      console.error('Failed to apply layout:', error);
    } finally {
      setLoading(false);
    }
  };

  // Don't render if no layout templates available
  if (!layoutTemplates.length) {
    return null;
  }

  return (
    <div className="layout-selector">
      <select
        value={selectedTemplate?.UID || ''}
        onChange={(e) => {
          const template = layoutTemplates.find((t) => t.UID === e.target.value);
          setSelectedTemplate(template || null);
        }}
        disabled={loading}
      >
        <option value="">{intl.formatMessage(messages.selectLayout)}</option>
        {layoutTemplates.map((template) => (
          <option key={template.UID} value={template.UID}>
            {template.title}
          </option>
        ))}
      </select>
      {selectedTemplate && (
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
