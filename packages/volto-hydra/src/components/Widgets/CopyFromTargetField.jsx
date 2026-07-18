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
import { getContent } from '@plone/volto/actions/content/content';
import { flattenToAppURL } from '@plone/volto/helpers/Url/Url';
import { useHydraSchemaContext, getLiveBlockData } from '../../context';
import {
  getTargetId,
  getTargetValueForField,
  isFieldDivergedFromTarget,
  contentToSnapshot,
} from '../../utils/copyFromTarget';

// Session cache of live targets (snapshot-shaped), keyed by @id, so divergence
// is measured against the CURRENT target — not the stale link-field snapshot.
// Lazy: fetched the first time a @target block is edited this session; refreshed
// after the TTL. Module-level so all fields of a block share one fetch.
const LIVE_TARGET_TTL = 5 * 60 * 1000; // 5 minutes
const liveTargetCache = new Map(); // id -> { snapshot, fetchedAt, promise }

/**
 * Lazily fetch the live target once per session (TTL-refreshed) and return it
 * in snapshot shape. Undefined until the first fetch resolves — callers fall
 * back to the stored snapshot meanwhile. Never mutates formData (no dirty state).
 */
function useLiveTarget(targetId) {
  const dispatch = useDispatch();
  const [live, setLive] = useState(() => liveTargetCache.get(targetId)?.snapshot);

  useEffect(() => {
    if (!targetId) {
      setLive(undefined);
      return undefined;
    }
    const cached = liveTargetCache.get(targetId);
    if (cached?.snapshot && Date.now() - cached.fetchedAt < LIVE_TARGET_TTL) {
      setLive(cached.snapshot);
      return undefined;
    }
    let cancelled = false;
    const promise =
      cached?.promise ||
      Promise.resolve(
        dispatch(
          getContent(flattenToAppURL(targetId), null, `copy-from-target-${targetId}`),
        ),
      )
        .then((resp) => {
          const snapshot = contentToSnapshot(resp, flattenToAppURL);
          liveTargetCache.set(targetId, { snapshot, fetchedAt: Date.now(), promise: null });
          return snapshot;
        })
        .catch(() => {
          liveTargetCache.delete(targetId); // let a later select retry
          return undefined;
        });
    liveTargetCache.set(targetId, { ...(cached || {}), promise });
    promise.then((snapshot) => {
      if (!cancelled) setLive(snapshot);
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
          title={intl.formatMessage(messages.syncFromTarget)}
        >
          ↺ {intl.formatMessage(messages.syncFromTarget)}
        </button>
      ) : null}
    </>
  );
};

export default CopyFromTargetField;
