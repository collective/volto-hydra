import React from 'react';
import { Plug } from '@plone/volto/components/manage/Pluggable';
import { Icon } from '@plone/volto/components';
import settingsSVG from '@plone/volto/icons/settings.svg';

/**
 * A Settings (⚙) shortcut in the main toolbar that toggles the right
 * sidebar — useful on mobile where the sidebar lives behind ⋯ → Settings.
 * On desktop / tablet it's a redundant entry alongside the existing
 * sidebar shrink/expand trigger; no harm in having two affordances.
 *
 * Reuses the same DOM trigger the existing Sidebar's onToggleExpanded
 * already wires (`.sidebar-container .trigger`) — no new state, no new
 * Redux action.
 */
const SidebarToggleButton = ({ onClickHandler }) => (
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
    <Icon name={settingsSVG} size="30px" title="Open settings" />
  </button>
);

const SidebarToggleToolbarPlug = () => {
  if (typeof window === 'undefined') return null;
  return (
    <Plug pluggable="main.toolbar.bottom" id="sidebar-toggle">
      {() => <SidebarToggleButton />}
    </Plug>
  );
};

export default SidebarToggleToolbarPlug;
