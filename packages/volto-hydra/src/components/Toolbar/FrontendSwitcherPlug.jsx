import React from 'react';
import { useSelector } from 'react-redux';
import { Plug } from '@plone/volto/components/manage/Pluggable';
import { Icon } from '@plone/volto/components';
import mobileSVG from '@plone/volto/icons/mobile.svg';
import tabletSVG from '@plone/volto/icons/tablet.svg';
import screenSVG from '@plone/volto/icons/screen.svg';

const VIEWPORT_ICONS = {
  mobile: mobileSVG,
  tablet: tabletSVG,
  desktop: screenSVG,
};

const FrontendSwitcherButton = ({ onClickHandler }) => {
  const preset = useSelector((state) => state.viewportPreset?.preset || 'desktop');
  const icon = VIEWPORT_ICONS[preset] || screenSVG;

  return (
    <button
      className="frontend-switcher-btn"
      aria-label="Frontend & Viewport"
      onClick={(e) => onClickHandler(e, 'frontendSwitcher')}
      tabIndex={0}
      id="toolbar-frontend-switcher"
    >
      <Icon name={icon} size="30px" title="Frontend & Viewport" />
    </button>
  );
};

const FrontendSwitcherPlug = () => {
  if (typeof window === 'undefined') return null;
  return (
    <Plug pluggable="main.toolbar.bottom" id="frontend-switcher">
      {(params) => <FrontendSwitcherButton {...params} />}
    </Plug>
  );
};

export default FrontendSwitcherPlug;
