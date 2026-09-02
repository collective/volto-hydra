import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import InlineForm from '@plone/volto/components/manage/Form/InlineForm';
import { getContent } from '@plone/volto/actions';
import { flattenToAppURL } from '@plone/volto/helpers';
import { useContentState } from './useContentState';
import { menuEntriesFrom, ACCESS_ID } from './stateMenu';

/**
 * Status and access, in one place.
 *
 * Plone puts workflow, sharing and working copies on three separate screens.
 * They answer one question, so this is one list: every entry names what it will
 * do to who can reach this document, and nothing fires on the click that opened
 * it.
 *
 * Two views. The list of entries, then the one you chose — which is a plain
 * confirm when the CMS asks for nothing, and the adapter's own schema when it
 * does. What that schema contains is not our business: WordPress asks for a
 * date and a password, Drupal for a revision log, Plone for effective and
 * expiration dates and, on the access entry, a field per role.
 */
const StatePanel = ({ closeMenu }) => {
  const dispatch = useDispatch();
  const path = useSelector((state) =>
    state.content?.data?.['@id'] ? flattenToAppURL(state.content.data['@id']) : null,
  );
  const { pas, forms, error, loadForms, transition } = useContentState(path);

  const [chosen, setChosen] = useState(null);
  const [formData, setFormData] = useState({});
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState(null);

  useEffect(() => {
    loadForms();
  }, [loadForms]);

  if (error) {
    return (
      <div className="state-panel">
        <header className="header">
          <h2>Status</h2>
        </header>
        <div className="content">
          <p className="state-error">{error.message ?? String(error)}</p>
        </div>
      </div>
    );
  }

  if (!pas) return null;

  const entries = menuEntriesFrom(pas, forms);

  const choose = (entry) => {
    setFailure(null);
    setChosen(entry);
    setFormData(entry.data ?? {});
  };

  const commit = async () => {
    setBusy(true);
    setFailure(null);
    try {
      await transition(chosen.id, formData);
      // The document itself may have changed with the transition — a new
      // effective date, a slug, a working copy — so the view must re-read
      // rather than keep rendering what it had.
      dispatch(getContent(path));
      setChosen(null);
      closeMenu?.();
    } catch (err) {
      // Kept open, showing why. Closing on failure would report success by
      // looking exactly like it.
      setFailure(err.message ?? String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="state-panel">
      <header className="header">
        <button className="back" onClick={() => setChosen(null)} hidden={!chosen}>
          Back
        </button>
        <h2>{chosen ? chosen.label : `Status: ${pas.state.label}`}</h2>
      </header>

      <div className="content">
        {!chosen && (
          <ul className="state-menu-list">
            {entries.map((entry) => (
              <li key={entry.id}>
                <button
                  className={`state-menu-entry state-menu-${entry.kind}`}
                  data-entry-id={entry.id}
                  onClick={() => choose(entry)}
                >
                  {entry.label}
                </button>
              </li>
            ))}
            {entries.length === 0 && (
              // Not an error: a document can legitimately have nowhere to go
              // and no per-document grants to hand out.
              <li className="state-menu-empty">
                Nothing to change here from this state.
              </li>
            )}
          </ul>
        )}

        {chosen && (
          <div className="state-transition">
            {chosen.kind === ACCESS_ID && (
              <p className="state-consequence">
                Who can reach this. Roles come from the CMS, and what each one
                permits can depend on the state this document is in.
              </p>
            )}
            {chosen.asks ? (
              <InlineForm
                schema={chosen.schema}
                formData={formData}
                onChangeFormData={setFormData}
                title={chosen.label}
              />
            ) : (
              <p className="state-consequence">
                {`“${chosen.label}” takes effect immediately. This CMS asks for nothing else.`}
              </p>
            )}

            {failure && <p className="state-error">{failure}</p>}

            <button className="state-commit" onClick={commit} disabled={busy}>
              {busy ? 'Working…' : chosen.label}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default StatePanel;
