import React from 'react';
import { useSelector } from 'react-redux';
import { Plug } from '@plone/volto/components/manage/Pluggable';
import { flattenToAppURL } from '@plone/volto/helpers';
import { useContentState } from './useContentState';

/**
 * The state button.
 *
 * Present in view mode as well as edit mode, which is the point: publishing
 * should not require opening the editor first.
 *
 * It shows the state's own label and nothing more. Anything richer — "from
 * Tuesday", "until September" — needs the effective dates, and the honest
 * version of that is not built yet; a badge that says "Published" over a
 * document nobody can see is worse than one that says less.
 */
const StateButton = ({ onClickHandler }) => {
  const path = useSelector((state) =>
    state.content?.data?.['@id'] ? flattenToAppURL(state.content.data['@id']) : null,
  );
  const { pas } = useContentState(path);

  // No workflow, or an adapter that does not do state at all: no button. An
  // empty one would invite a click that opens nothing.
  if (!pas?.state) return null;

  return (
    <button
      className="state-btn"
      aria-label={`Status: ${pas.state.label}`}
      onClick={(e) => onClickHandler(e, 'contentState')}
      tabIndex={0}
      id="toolbar-content-state"
    >
      <span className={`state-badge state-${pas.state.name}`}>{pas.state.label}</span>
    </button>
  );
};

const StatePlug = () => {
  if (typeof window === 'undefined') return null;
  return (
    <Plug pluggable="main.toolbar.bottom" id="content-state">
      {(params) => <StateButton {...params} />}
    </Plug>
  );
};

export default StatePlug;
