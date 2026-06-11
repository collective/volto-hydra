import React from 'react';
import { Plug } from '@plone/volto/components/manage/Pluggable';
import { Icon } from '@plone/volto/components';
import cogSVG from '../../icons/cog.svg';

/**
 * A Settings (⚙) shortcut in the main toolbar that toggles the right
 * sidebar — useful on mobile where the sidebar lives behind ⋯ → Settings.
 * On desktop / tablet it's a redundant entry alongside the existing
 * sidebar shrink/expand trigger; no harm in having two affordances.
 *
 * Only rendered in EDIT mode: the sidebar shows block / page settings,
 * which only make sense while editing. In view mode the shortcut is
 * meaningless (nothing to configure) and clutter on a compact mobile
 * bar — so we filter on window.location.pathname.endsWith('/edit'). Done
 * at render time rather than via CSS so the button doesn't exist in the
 * DOM (no accidental focus / tab target).
 *
 * Reuses the same DOM trigger the existing Sidebar's onToggleExpanded
 * already wires (`.sidebar-container .trigger`) — no new state, no new
 * Redux action.
 */
const SidebarToggleButton = () => (
  <button
    type="button"
    className="sidebar-toggle-toolbar-btn"
    aria-label="Open settings"
    onClick={() => {
      const triggerBtn = document.querySelector(
        '.sidebar-container .trigger',
      );
      if (triggerBtn) (triggerBtn as HTMLButtonElement).click();
    }}
    tabIndex={0}
  >
    <Icon name={cogSVG} size="30px" title="Open settings" />
  </button>
);

const isEditMode = () =>
  typeof window !== 'undefined' &&
  (window.location.pathname.endsWith('/edit') ||
    window.location.pathname.includes('/edit/'));

const SidebarToggleToolbarPlug = () => {
  if (typeof window === 'undefined') return null;
  if (!isEditMode()) return null;
  return (
    <Plug pluggable="main.toolbar.bottom" id="sidebar-toggle">
      {() => <SidebarToggleButton />}
    </Plug>
  );
};

export default SidebarToggleToolbarPlug;
