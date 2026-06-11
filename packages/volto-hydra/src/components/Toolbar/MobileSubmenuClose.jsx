import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * Mobile-only close affordance for Volto's #toolbar > .toolbar-content
 * submenus (the "Add Content", "More" → State/History/Links, etc.
 * menus). Volto stock has no close button in the submenu — the desktop
 * dismiss gesture is clicking outside, which doesn't translate to
 * mobile where the submenu is now a full-screen sheet.
 *
 * Instead of shadowing the massive Toolbar.jsx, this component watches
 * `.toolbar-content` for the `.show` class via MutationObserver, and
 * mounts a portaled close button when the menu is open. The button
 * dismisses the menu by clicking the currently-active toolbar trigger
 * (`.more` / `.add` / `.user` etc. with the `.expanded` class) — the
 * same toggle gesture Volto already wires.
 *
 * Hidden on desktop via mobile-tablet.css's `.mobile-sheet-close
 * { display: none }` rule outside the (max-width: 767px) media query.
 */
const MobileSubmenuClose = () => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;

    let target = null;
    let targetObs = null;

    const attach = (tc) => {
      target = tc;
      const sync = () => setOpen(tc.classList.contains('show'));
      sync();
      targetObs = new MutationObserver(sync);
      targetObs.observe(tc, { attributes: true, attributeFilter: ['class'] });
    };

    const initial = document.querySelector('#toolbar .toolbar-content');
    if (initial) {
      attach(initial);
    }

    // If AppExtras mounts before Volto's Toolbar paints, the initial
    // querySelector returns null. Watch the body subtree for the
    // toolbar-content node appearing, then attach the class observer.
    const bodyObs = new MutationObserver(() => {
      if (target) return;
      const tc = document.querySelector('#toolbar .toolbar-content');
      if (tc) attach(tc);
    });
    bodyObs.observe(document.body, { childList: true, subtree: true });

    return () => {
      bodyObs.disconnect();
      if (targetObs) targetObs.disconnect();
    };
  }, []);

  if (!open) return null;
  if (typeof document === 'undefined') return null;

  const handleClick = () => {
    // The active trigger button has the `.expanded` class added by
    // Toolbar's toggleMenu state; clicking it re-toggles to close.
    const expandedTrigger = document.querySelector(
      '#toolbar-body .toolbar-button.expanded, #toolbar-body button.expanded',
    );
    if (expandedTrigger) {
      expandedTrigger.click();
      return;
    }
    // Fallback: any toolbar button whose aria-expanded is true.
    const ariaExpanded = document.querySelector(
      '#toolbar-body button[aria-expanded="true"]',
    );
    if (ariaExpanded) ariaExpanded.click();
  };

  return createPortal(
    <button
      type="button"
      className="mobile-sheet-close mobile-submenu-close"
      aria-label="Close menu"
      onClick={handleClick}
    >
      ←
    </button>,
    document.body,
  );
};

export default MobileSubmenuClose;
