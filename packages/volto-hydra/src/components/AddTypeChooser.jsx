import React, { useEffect } from 'react';
import { connect } from 'react-redux';
import { Link } from 'react-router-dom';
import filter from 'lodash/filter';
import { getTypes } from '@plone/volto/actions/types/types';
import { getBaseUrl } from '@plone/volto/helpers/Url/Url';

/**
 * Full-screen page that lists the addable content types for the
 * current container — the "what do you want to add?" step the
 * editor sees BEFORE they fill the actual add form.
 *
 * Rendered by the shadowed Add.jsx when its URL has no `?type=`
 * query param. Replaces the legacy inline `.menu-more` dropdown
 * (which was tiny, often empty in production, and bled through
 * the iframe content) with a real navigation page.
 *
 * Each type link uses the same `id="toolbar-add-<type>"` selector
 * Volto's stock Types.jsx used, so existing happy-path tests
 * (navigation.spec.ts:adding a new Document…) keep working.
 */
const AddTypeChooser = ({ types, pathname, getTypes: dispatchGetTypes }) => {
  const basePath = getBaseUrl(pathname).replace(/\/add$/, '');

  // Make sure the addable types list is loaded for the target
  // folder. The toolbar normally loads it on mount, but the editor
  // can hit the /add URL directly (deep link, browser refresh, etc).
  useEffect(() => {
    dispatchGetTypes(basePath);
  }, [dispatchGetTypes, basePath]);

  const addable = filter(types, 'addable');

  if (!addable.length) {
    return (
      <div className="add-type-chooser">
        <h1>Add Content</h1>
        <p>
          There are no content types you can add to this location.
        </p>
        <p>
          <Link to={basePath || '/'}>← Back</Link>
        </p>
      </div>
    );
  }

  return (
    <div className="add-type-chooser">
      <h1>Add Content</h1>
      <ul className="add-type-list">
        {addable.map((item) => {
          const typeName = item['@id'].split('@types/')[1];
          return (
            <li key={item['@id']}>
              <Link
                id={`toolbar-add-${typeName.toLowerCase().replace(' ', '-')}`}
                to={`${basePath}/add?type=${typeName}`}
                className="add-type-item"
              >
                {item.title}
              </Link>
            </li>
          );
        })}
      </ul>
      <p>
        <Link className="add-type-cancel" to={basePath || '/'}>
          Cancel
        </Link>
      </p>
    </div>
  );
};

export default connect(
  (state) => ({ types: state.types.types }),
  { getTypes },
)(AddTypeChooser);
