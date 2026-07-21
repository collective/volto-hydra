/**
 * CopyFromTargetField — the wrapper the copy-from-target enhancer swaps mapped
 * destination fields to. It renders the field's ORIGINAL widget untouched
 * (that's why it works for any field type — object_browser, textarea, select…)
 * and adds a small LINKED ⇄ CUSTOM toggle beneath it.
 *
 * A mapped field is LINKED by default: it tracks the linked target — pulled on
 * block select and re-pulled when the target (href) changes. Editing the field,
 * or unticking the toggle, flips it to CUSTOM (the editor's own value, stored in
 * the block's `_customFields`). Re-ticking re-pulls the target value.
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
import { flattenToAppURL, isInternalURL } from '@plone/volto/helpers/Url/Url';
import { useHydraSchemaContext, getLiveBlockData } from '../../context';
import {
  getTargetId,
  getTargetValueForField,
  isFieldLinked,
  withFieldCustom,
  withFieldLinked,
} from '../../utils/copyFromTarget';

// Session cache of live targets, keyed by @id, so a linked field pulls the
// CURRENT target — not the stale link-field snapshot. Lazy: fetched the first
// time a @target block is edited this session; refreshed after the TTL.
// Module-level so all fields of a block share one fetch.
const LIVE_TARGET_TTL = 5 * 60 * 1000; // 5 minutes
const liveTargetCache = new Map(); // id -> { brain, fetchedAt, promise }

/**
 * Lazily fetch the live target once per session (TTL-refreshed). We use the
 * catalog **search** (metadata_fields: '_all') rather than getContent: the
 * link-field snapshot (selectedItemAttrs) is itself a catalog brain, so the
 * search result is already in the same shape — no transform, guaranteed field
 * alignment. Undefined until the first fetch resolves (callers fall back to the
 * stored snapshot). Never mutates formData directly (no dirty state).
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
          // ONLY the exact target — never fall back to some other result
          // (e.g. a missing target would otherwise pick a wrong item and
          // corrupt divergence). No match → undefined → use the stored snapshot.
          const brain = items.find((i) => flattenToAppURL(i['@id']) === path);
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
  linked: {
    id: 'pull from linked',
    defaultMessage: 'pull from linked',
  },
  linkedHint: {
    id: 'Pulls from the linked content; edit or untick to customise',
    defaultMessage: 'pulls from the linked content — edit to customise',
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
  const { baseWidget, ...rest } = props;

  // Block-level context + a block-level updater (so we can write the block's
  // `_customFields` state, which a plain field onChange can't reach).
  const ctx = useHydraSchemaContext?.() || {};
  const blockData = getLiveBlockData?.(ctx.currentBlockId) || ctx.formData || null;
  const blockConfig = blockData?.['@type']
    ? ctx.blocksConfig?.[blockData['@type']]
    : null;
  const updateBlock = (newData) => ctx.onChangeBlock?.(ctx.currentBlockId, newData);

  // Fresh target (lazy, session-cached) — the value a linked field is pulled to.
  const targetId = blockConfig && blockData && getTargetId(blockConfig, blockData);
  // Only an INTERNAL link is a pull source: an external URL has no catalog item
  // to @search, so we can't pull from it. Such a field falls back to a plain
  // editable field (no toggle). (External unfurl via OpenGraph is a follow-up.)
  const targetSupported = !!targetId && isInternalURL(targetId);
  const liveTarget = useLiveTarget(targetSupported ? targetId : undefined);

  const linked =
    targetSupported &&
    !!blockConfig &&
    !!blockData &&
    isFieldLinked(props.id, blockConfig, blockData);
  const targetValue = getTargetValueForField(props.id, blockConfig, blockData, liveTarget);

  // PULL: while linked, keep the field's stored value in sync with the target —
  // on first block select (mount) and when the target changes (href / TTL
  // refresh). Only writes when the value actually differs, so a settled linked
  // field is a no-op (no spurious dirty state). Not a user edit: uses the raw
  // field onChange (so it does NOT flip the field to custom, and is field-scoped
  // so multiple linked fields never clobber each other).
  //
  // Deferred one frame: a synchronous onChange during the block's form mount is
  // discarded (the form re-derives from its `data` prop on initial commit), so
  // we write after that commit settles. cancelled on unmount/target change.
  useEffect(() => {
    if (!linked || targetValue === undefined) return undefined;
    if (JSON.stringify(blockData?.[props.id]) === JSON.stringify(targetValue)) {
      return undefined;
    }
    const raf = requestAnimationFrame(() => props.onChange?.(props.id, targetValue));
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linked, JSON.stringify(targetValue), props.id]);

  // EDIT: a user edit to a LINKED field flips it to custom (and keeps the typed
  // value). A custom field edits normally.
  const onFieldChange = (id, value) => {
    if (linked) {
      updateBlock({ ...withFieldCustom(blockData, props.id), [props.id]: value });
    } else {
      props.onChange?.(id, value);
    }
  };

  // TOGGLE: linked ⇄ custom. custom → linked re-pulls the target value.
  const onToggle = () => {
    if (linked) {
      updateBlock(withFieldCustom(blockData, props.id));
    } else {
      let next = withFieldLinked(blockData, props.id);
      if (targetValue !== undefined) next = { ...next, [props.id]: targetValue };
      updateBlock(next);
    }
  };

  // Restore the original field def; reset `widget` (else resolveWidget recurses
  // into this wrapper) and intercept onChange for the edit→custom flip.
  const baseProps = {
    ...rest,
    ...(baseWidget || {}),
    widget: baseWidget?.widget,
    onChange: onFieldChange,
  };
  const BaseWidget = resolveWidget(baseProps);

  const label = intl.formatMessage(messages.linked);
  // Offer the toggle only for a supported (internal) target — an external URL
  // can't be pulled from, so the field is just a normal editable field.
  const showToggle = targetSupported;

  return (
    <>
      <BaseWidget {...baseProps} />
      {showToggle ? (
        <p
          className="help copy-from-target-toggle"
          style={{ marginTop: baseWidget?.description ? '2px' : '-6px' }}
        >
          <label
            style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', cursor: 'pointer', color: '#64748b' }}
            title={intl.formatMessage(messages.linkedHint)}
          >
            <input
              type="checkbox"
              className="copy-from-target-linked"
              checked={linked}
              onChange={onToggle}
              style={{ margin: 0, cursor: 'pointer' }}
            />
            🔗 {label}
          </label>
        </p>
      ) : null}
    </>
  );
};

export default CopyFromTargetField;
