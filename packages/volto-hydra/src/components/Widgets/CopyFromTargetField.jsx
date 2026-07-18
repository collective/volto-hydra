/**
 * CopyFromTargetField — the wrapper the copy-from-target enhancer swaps mapped
 * destination fields to. It renders the field's ORIGINAL widget untouched
 * (that's why it works for any field type — object_browser, textarea, select…)
 * and adds a small "sync from target" affordance shown only when the field has
 * diverged from the linked target.
 *
 * The enhancer stashes the original field def under `baseWidget`; we restore it
 * and resolve the real widget with Volto's own resolution order so the base
 * renders exactly as it always would.
 */
import React from 'react';
import { defineMessages, useIntl } from 'react-intl';
import config from '@plone/volto/registry';
import { useHydraSchemaContext, getLiveBlockData } from '../../context';
import {
  getTargetValueForField,
  isFieldDivergedFromTarget,
} from '../../utils/copyFromTarget';

const messages = defineMessages({
  syncFromTarget: {
    id: 'Reset to linked content',
    defaultMessage: 'Reset to linked content',
  },
});

/**
 * Resolve the real widget component for a field def, mirroring Volto's
 * Field.jsx resolution order (id → tagged → name → choices → vocabulary →
 * factory → type → default). Kept faithful so the base widget renders
 * identically to a normal field.
 */
function resolveWidget(props) {
  const widgets = config.widgets;
  const byId = widgets.id[props.id];
  if (byId) return byId;
  const tagged = props.widgetOptions?.frontendOptions?.widget;
  if (typeof tagged === 'string' && widgets.widget[tagged]) {
    return widgets.widget[tagged];
  }
  if (typeof props.widget === 'string') {
    return widgets.widget[props.widget] || widgets.default;
  }
  const vocab = props.vocabulary?.['@id'];
  if (vocab) {
    const w = widgets.vocabulary[vocab.replace(/^.*\/@vocabularies\//, '')];
    if (w) return w;
  }
  if (props.factory && widgets.factory?.[props.factory]) {
    return widgets.factory[props.factory];
  }
  if (props.type && widgets.type[props.type]) return widgets.type[props.type];
  return widgets.default;
}

const CopyFromTargetField = (props) => {
  const intl = useIntl();
  // Restore the original field def the enhancer stashed, so the base widget
  // resolves + renders exactly as Volto would (not as our wrapper).
  const { baseWidget, ...rest } = props;
  const baseProps = { ...rest, ...(baseWidget || {}) };
  const BaseWidget = resolveWidget(baseProps);

  // Block-level context: which block is being edited + its config + live data,
  // so we can tell whether this field diverges from the linked target.
  const ctx = useHydraSchemaContext?.() || {};
  const blockData = getLiveBlockData?.(ctx.currentBlockId) || ctx.formData || null;
  const blockConfig = blockData?.['@type']
    ? ctx.blocksConfig?.[blockData['@type']]
    : null;

  const diverged =
    blockConfig &&
    blockData &&
    isFieldDivergedFromTarget(props.id, blockConfig, blockData);

  const onSync = (e) => {
    e.preventDefault();
    const value = getTargetValueForField(props.id, blockConfig, blockData);
    if (value !== undefined) props.onChange?.(props.id, value);
  };

  return (
    <>
      <BaseWidget {...baseProps} />
      {diverged ? (
        <button
          type="button"
          className="copy-from-target-sync"
          onClick={onSync}
          title={intl.formatMessage(messages.syncFromTarget)}
        >
          ↺ {intl.formatMessage(messages.syncFromTarget)}
        </button>
      ) : null}
    </>
  );
};

export default CopyFromTargetField;
