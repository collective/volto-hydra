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
import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { defineMessages, useIntl } from 'react-intl';
import config from '@plone/volto/registry';
import { searchContent } from '@plone/volto/actions/search/search';
import { flattenToAppURL } from '@plone/volto/helpers/Url/Url';
import { useHydraSchemaContext, getLiveBlockData } from '../../context';
import {
  getTargetId,
  getTargetValueForField,
  isFieldDivergedFromTarget,
} from '../../utils/copyFromTarget';

// Session cache of live targets, keyed by @id, so divergence is measured
// against the CURRENT target — not the stale link-field snapshot. Lazy: fetched
// the first time a @target block is edited this session; refreshed after the
// TTL. Module-level so all fields of a block share one fetch.
const LIVE_TARGET_TTL = 5 * 60 * 1000; // 5 minutes
const liveTargetCache = new Map(); // id -> { brain, fetchedAt, promise }

/**
 * Lazily fetch the live target once per session (TTL-refreshed). We use the
 * catalog **search** (metadata_fields: '_all') rather than getContent: the
 * link-field snapshot (selectedItemAttrs) is itself a catalog brain, so the
 * search result is already in the same shape — no transform, guaranteed field
 * alignment. Undefined until the first fetch resolves (callers fall back to the
 * stored snapshot). Never mutates formData (no dirty state).
 */
function useLiveTarget(targetId) {
  const dispatch = useDispatch();
  const [live, setLive] = useState(() => liveTargetCache.get(targetId)?.brain);

  useEffect(() => {
    if (!targetId) {
      setLive(undefined);
      return undefined;
    }
    const cached = liveTargetCache.get(targetId);
    if (cached?.brain && Date.now() - cached.fetchedAt < LIVE_TARGET_TTL) {
      setLive(cached.brain);
      return undefined;
    }
    let cancelled = false;
    const path = flattenToAppURL(targetId);
    const promise =
      cached?.promise ||
      Promise.resolve(
        dispatch(
          searchContent(
            path,
            { 'path.depth': 0, metadata_fields: '_all', b_size: 1 },
            `copy-from-target-${targetId}`,
          ),
        ),
      )
        .then((resp) => {
          const items = resp?.items || [];
          const brain =
            items.find((i) => flattenToAppURL(i['@id']) === path) || items[0];
          liveTargetCache.set(targetId, { brain, fetchedAt: Date.now(), promise: null });
          return brain;
        })
        .catch(() => {
          liveTargetCache.delete(targetId); // let a later select retry
          return undefined;
        });
    liveTargetCache.set(targetId, { ...(cached || {}), promise });
    promise.then((brain) => {
      if (!cancelled) setLive(brain);
    });
    return () => {
      cancelled = true;
    };
  }, [targetId, dispatch]);

  return live;
}

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
  // Restore the original field def. Crucially, reset `widget` to the ORIGINAL
  // value (which may be undefined for a plain field) — otherwise `rest.widget`
  // is still 'copyFromTargetField' and resolveWidget would recurse into us.
  const baseProps = { ...rest, ...(baseWidget || {}), widget: baseWidget?.widget };
  const BaseWidget = resolveWidget(baseProps);

  // Block-level context: which block is being edited + its config + live data,
  // so we can tell whether this field diverges from the linked target.
  const ctx = useHydraSchemaContext?.() || {};
  const blockData = getLiveBlockData?.(ctx.currentBlockId) || ctx.formData || null;
  const blockConfig = blockData?.['@type']
    ? ctx.blocksConfig?.[blockData['@type']]
    : null;

  // Fresh target (lazy, session-cached) so divergence reflects the target's
  // CURRENT values, not the stale snapshot; falls back to the snapshot until
  // the first fetch resolves.
  const targetId = blockConfig && blockData && getTargetId(blockConfig, blockData);
  const liveTarget = useLiveTarget(targetId);

  const diverged =
    blockConfig &&
    blockData &&
    isFieldDivergedFromTarget(props.id, blockConfig, blockData, liveTarget);

  const onSync = (e) => {
    e.preventDefault();
    const value = getTargetValueForField(props.id, blockConfig, blockData, liveTarget);
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
          aria-label={intl.formatMessage(messages.syncFromTarget)}
          title={intl.formatMessage(messages.syncFromTarget)}
          style={{
            background: 'none',
            border: 'none',
            padding: '1px 2px',
            marginTop: '2px',
            color: '#64748b',
            fontSize: '11px',
            lineHeight: 1.2,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            textDecoration: 'underline',
            textUnderlineOffset: '2px',
            textDecorationColor: 'rgba(100,116,139,0.4)',
          }}
        >
          <span aria-hidden="true" style={{ fontSize: '12px' }}>
            ↺
          </span>
          {intl.formatMessage(messages.syncFromTarget)}
        </button>
      ) : null}
    </>
  );
};

export default CopyFromTargetField;
