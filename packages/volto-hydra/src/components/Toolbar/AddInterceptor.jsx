import { useEffect } from 'react';
import { withRouter } from 'react-router-dom';
import { getBaseUrl } from '@plone/volto/helpers/Url/Url';

/**
 * Convert clicks on the toolbar's Add button from
 * `toggleMenu('types')` (inline submenu) to a navigation to
 * `${currentPath}/add` — where the shadowed Add.jsx renders a
 * full-screen chooser.
 *
 * The submenu pattern was the legacy inline `.menu-more` dropdown
 * that bled through the iframe content on mobile and rendered
 * "empty" in production (zero addable types but the gate still let
 * the menu open). Replacing it with a real route gives the editor a
 * consistent full-page Add experience on every viewport and lets
 * Volto's normal page lifecycle handle the chooser's empty state.
 *
 * Implemented as an appExtra rather than shadowing the 1000-line
 * Toolbar.jsx — Volto upgrades stay clean. We attach a CAPTURE-phase
 * click listener so we run before the button's React onClick fires;
 * preventDefault + stopImmediatePropagation suppresses the original
 * toggleMenu handler.
 */
const AddInterceptor = ({ history, location }) => {
  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const onClick = (e) => {
      const target = e.target.closest?.('#toolbar-add');
      if (!target) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      const basePath = getBaseUrl(location.pathname);
      history.push(`${basePath}/add`);
    };
    // Capture phase: run before React's button onClick.
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [history, location.pathname]);
  return null;
};

export default withRouter(AddInterceptor);
