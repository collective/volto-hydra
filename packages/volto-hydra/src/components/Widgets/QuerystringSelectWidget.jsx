/**
 * QuerystringSelectWidget — choices are the SITE'S CATALOG INDEXES, as
 * `@querystring` reports them.
 *
 * Volto fills a field like this imperatively: its search block's Edit component
 * reaches into the schema and writes `sortOnOptions.items.choices` from
 * `sortable_indexes` before rendering. A hydra frontend has no Edit component —
 * its schema is JSON sent over the bridge — so that route is closed, and the
 * field falls back to a free-text list where an author types index names from
 * memory. A typo there produces a sort option that silently does nothing.
 *
 * Field options (alongside `widget: 'querystringSelect'`):
 *   - indexes: 'sortable' (default) offers only indexes the catalog can sort on;
 *       'all' offers every queryable index.
 *   - multiple: true stores an array — a chosen SUBSET, in the author's order,
 *       which is what a "sort by" menu is.
 *
 * The stored value is the index NAME (`effective`, `sortable_title`), because
 * that is what a query is built from; the title is only what the author reads.
 */
import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getQuerystring } from '@plone/volto/actions';
import config from '@plone/volto/registry';

/**
 * `[name, title]` pairs for the menu.
 *
 * `sortable_indexes` is already the sortable subset, so asking for 'sortable'
 * uses it directly rather than filtering `indexes` on a flag that means
 * something subtly different.
 */
export function indexChoices(querystring, which) {
  const source =
    which === 'all' ? querystring?.indexes : querystring?.sortable_indexes;
  return Object.entries(source || {})
    .map(([name, index]) => [name, index?.title || name])
    .sort((a, b) => a[1].localeCompare(b[1]));
}

const QuerystringSelectWidget = (props) => {
  const { indexes = 'sortable', multiple = false } = props;
  const dispatch = useDispatch();
  const querystring = useSelector((state) => state.querystring);

  useEffect(() => {
    // Volto loads this once for the whole editor; ask only if nobody has.
    if (!Object.keys(querystring?.indexes || {}).length && !querystring?.loading) {
      dispatch(getQuerystring());
    }
  }, [dispatch, querystring]);

  const choices = indexChoices(querystring, indexes);
  const Widget = multiple
    ? config.widgets.widget.array
    : config.widgets.widget.select;
  return <Widget {...props} choices={choices} />;
};

export default QuerystringSelectWidget;
