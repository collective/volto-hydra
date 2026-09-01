import React from 'react';
import { useSelector, shallowEqual } from 'react-redux';
import { Plug } from '@plone/volto/components/manage/Pluggable';
import { Icon } from '@plone/volto/components';
import worldSVG from '@plone/volto/icons/world.svg';

/**
 * Entries the CMS answers for itself.
 *
 * Volto's toolbar treats an action as a permission flag and then builds its own
 * route — `find(actions.object, { id: 'edit' })` and a <Link> to `${path}/edit`
 * — so an entry pointing somewhere else cannot be shown by the built-in
 * buttons no matter what the actions payload says. This renders the ones that
 * carry their own destination.
 *
 * Nothing appears unless an adapter declared something: a CMS content with
 * Volto's own screens produces no button at all, rather than an empty menu.
 */
export const nativeActionsFrom = (actions) =>
  ['object', 'site', 'user']
    .flatMap((category) => actions?.[category] ?? [])
    .filter((action) => action?.native && action['@id']);

const NativeActionsButton = ({ onClickHandler }) => {
  const actions = useSelector((state) => state.actions?.actions, shallowEqual);
  if (nativeActionsFrom(actions).length === 0) return null;

  return (
    <button
      className="native-actions-btn"
      aria-label="Open in CMS"
      onClick={(e) => onClickHandler(e, 'nativeActions')}
      tabIndex={0}
      id="toolbar-native-actions"
    >
      <Icon name={worldSVG} size="30px" title="Open in CMS" />
    </button>
  );
};

const NativeActionsPlug = () => {
  if (typeof window === 'undefined') return null;
  return (
    <Plug pluggable="main.toolbar.bottom" id="native-actions">
      {(params) => <NativeActionsButton {...params} />}
    </Plug>
  );
};

export default NativeActionsPlug;
