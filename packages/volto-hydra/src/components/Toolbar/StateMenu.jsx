import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import InlineForm from '@plone/volto/components/manage/Form/InlineForm';
import { getContent } from '@plone/volto/actions';
import { useContentState } from './useContentState';
import { menuEntriesFrom, ACCESS_ID } from './stateMenu';

/**
 * Status and access, in one list.
 *
 * Rendered into Volto's own state slot in the More menu — a compact control
 * inside an <li>, not a panel — so it inherits being available in view mode as
 * well as edit, and publishing does not require opening the editor.
 *
 * Two states. The list of things that change what this document is or who can
 * reach it, and then the one you chose: a plain confirm where the CMS asks for
 * nothing, the adapter's own schema where it does. What the schema contains is
 * not the admin's business — WordPress asks for a date and a password, Drupal
 * for a revision log, Plone for effective and expiration dates and, on the
 * access entry, a field per role.
 *
 * Nothing fires on the click that opened this. That is the whole difference
 * from the component it replaces.
 */
const StateMenu = ({ pathname }) => {
  const dispatch = useDispatch();
  const { pas, forms, error, loadForms, transition } = useContentState(pathname);

  const [chosen, setChosen] = useState(null);
  const [formData, setFormData] = useState({});
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState(null);

  useEffect(() => {
    loadForms();
  }, [loadForms]);

  // Matches what Volto does for content with no workflow: no control, rather
  // than a disabled one. An adapter that does not advertise `state` lands here
  // too, and so does one whose session has expired — the error below says so.
  if (!pas?.state && !error) return null;

  if (error) {
    return (
      <div className="state-menu">
        <span className="state-label">State</span>
        <p className="state-error">{error.message ?? String(error)}</p>
      </div>
    );
  }

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
      // The document itself may have moved with the transition — a new
      // effective date, a slug, a working copy — so the view re-reads rather
      // than keep rendering what it had.
      dispatch(getContent(pathname));
      setChosen(null);
    } catch (err) {
      // Stays open, showing why. Closing on failure would look exactly like
      // succeeding.
      setFailure(err.message ?? String(err));
    } finally {
      setBusy(false);
    }
  };

  if (chosen) {
    return (
      <div className="state-menu state-menu-chosen">
        <button className="state-back" onClick={() => setChosen(null)}>
          ← {pas.state.label}
        </button>

        {chosen.kind === ACCESS_ID ? (
          <p className="state-consequence">
            Who can reach this. Roles come from the CMS, and what each one
            permits can depend on the state this document is in.
          </p>
        ) : (
          !chosen.asks && (
            <p className="state-consequence">
              {`“${chosen.label}” takes effect immediately. This CMS asks for nothing else.`}
            </p>
          )
        )}

        {chosen.asks && (
          <InlineForm
            schema={chosen.schema}
            formData={formData}
            onChangeFormData={setFormData}
            title={chosen.label}
          />
        )}

        {failure && <p className="state-error">{failure}</p>}

        <button className="state-commit" onClick={commit} disabled={busy}>
          {busy ? 'Working…' : chosen.label}
        </button>
      </div>
    );
  }

  return (
    <div className="state-menu">
      <span className="state-label">State</span>
      <span className={`state-current state-${pas.state.name}`}>
        {pas.state.label}
      </span>
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
          // Not an error: a document can legitimately have nowhere to go and
          // no per-document grants to hand out.
          <li className="state-menu-empty">Nothing to change from here.</li>
        )}
      </ul>
    </div>
  );
};

export default StateMenu;
