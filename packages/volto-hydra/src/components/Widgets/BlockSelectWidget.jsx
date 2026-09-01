/**
 * BlockSelectWidget — a select whose choices are OTHER BLOCKS, and whose value
 * is a field taken from the one picked.
 *
 * Not the same job as `schemaFieldSelect`, which offers the CONTENT TYPE's
 * schema fields from `/@types`. This offers blocks on the page, read from
 * `blockPathMap` — the same container/region map the editor uses — and stores
 * whatever field of the chosen block the consumer names.
 *
 * The motivating case is a form's skip logic: "show this question when THAT one
 * is answered". The author should pick the other question by its label; what
 * gets stored is that question's `field_id`, because that is what the rule is
 * evaluated against — a uid would look right in the sidebar and never match.
 *
 * Field options (alongside `widget: 'blockSelect'`):
 *   - scope: 'siblings' (default) — blocks sharing my parent
 *            '..'                 — my parent's siblings
 *            '<region>'           — that region of my parent
 *   - direction: 'before' | 'after' — only blocks earlier/later than me. A
 *       question cannot depend on one that comes after it, so skip logic uses
 *       'before'.
 *   - blockTypes: ['text', 'select'] — only these `@type`s.
 *   - valueField: 'field_id' — the field of the chosen block to STORE.
 *       Defaults to the block's own id.
 *   - labelField: 'label' — the field to SHOW. Falls back to title, then label,
 *       then the block type, then the id.
 *   - emptyLabel: the first, empty option's text.
 */
import React from 'react';
import config from '@plone/volto/registry';
import { useHydraSchemaContext } from '../../context/HydraSchemaContext';
import { getBlockById } from '../../utils/blockPath';

/** The blocks a picker may offer, in page order, given where it is asked from. */
export function candidateBlockIds({
  blockPathMap,
  currentBlockId,
  scope = 'siblings',
  direction,
}) {
  const me = blockPathMap?.[currentBlockId];
  if (!me) return [];
  // '..' asks about my parent's neighbours, so the parent whose children we
  // list is my grandparent.
  const parentId =
    scope === '..' ? blockPathMap[me.parentId]?.parentId : me.parentId;
  const anchorId = scope === '..' ? me.parentId : currentBlockId;
  if (parentId === undefined) return [];

  const siblings = Object.entries(blockPathMap)
    .filter(([, info]) => info.parentId === parentId)
    .filter(([, info]) =>
      scope && scope !== 'siblings' && scope !== '..'
        ? info.region === scope
        : true,
    );

  // Page order: the path's last segment is the position within the parent.
  const ordered = siblings.sort((a, b) => positionOf(a[1]) - positionOf(b[1]));
  const ids = ordered.map(([id]) => id);
  const at = ids.indexOf(anchorId);
  const trimmed =
    direction === 'before' && at > -1
      ? ids.slice(0, at)
      : direction === 'after' && at > -1
        ? ids.slice(at + 1)
        : ids;
  return trimmed.filter((id) => id !== currentBlockId);
}

function positionOf(info) {
  const last = info?.path?.[info.path.length - 1];
  const n = Number(last);
  return Number.isFinite(n) ? n : 0;
}

/** What a block should be called in the menu. */
export function labelFor(block, labelField) {
  if (!block) return '';
  const named = labelField && block[labelField];
  return (
    named ||
    block.title ||
    block.label ||
    block['@type'] ||
    block.field_id ||
    ''
  );
}

const BlockSelectWidget = (props) => {
  const {
    scope = 'siblings',
    direction,
    blockTypes,
    valueField,
    labelField,
    emptyLabel = '— none —',
  } = props;
  const ctx = useHydraSchemaContext();
  const { blockPathMap, currentBlockId, formData } = ctx || {};

  const ids = candidateBlockIds({
    blockPathMap,
    currentBlockId,
    scope,
    direction,
  });

  const choices = [
    ['', emptyLabel],
    ...ids
      .map((id) => ({ id, block: getBlockById(formData, blockPathMap, id) }))
      .filter(({ block }) => block)
      .filter(({ block }) =>
        blockTypes?.length ? blockTypes.includes(block['@type']) : true,
      )
      .map(({ id, block }) => [
        // What to STORE: a named field of the chosen block (a form question's
        // `field_id`), or the block's own id when the consumer wants that.
        valueField ? block[valueField] ?? id : id,
        labelFor(block, labelField),
      ])
      .filter(([value, label]) => value !== '' && label !== ''),
  ];

  const SelectWidget = config.widgets.widget.select;
  return <SelectWidget {...props} choices={choices} />;
};

export default BlockSelectWidget;
