import React from 'react';
import PropTypes from 'prop-types';
import { createPortal } from 'react-dom';
import { SidebarPortalTargetContext } from '@plone/volto-hydra/components/Sidebar/SidebarPortalTargetContext';

// Re-export for convenience
export { SidebarPortalTargetContext };

/**
 * Portal that wraps Sidebar components
 * @param {React.ReactNode} children Sidebar content
 * @param {bool} selected Sidebar needs to know when the related block is selected
 * @param {string} tab Element id where to insert sidebar content, default: sidebar-properties
 * @returns {string} Rendered sidebar
 */
const SidebarPortal = ({ children, selected, tab = 'sidebar-properties' }) => {
  const [isClient, setIsClient] = React.useState(null);
  const overrideTarget = React.useContext(SidebarPortalTargetContext);

  React.useEffect(() => setIsClient(true), []);

  // Use override target if provided via context, otherwise use the tab prop
  const targetId = overrideTarget || tab;
  const targetElement = isClient ? document.getElementById(targetId) : null;

  return (
    <>
      {isClient &&
        selected &&
        targetElement &&
        createPortal(
          <div role="form" style={{ height: '100%' }}>
            <div
              style={{ height: '100%' }}
              role="presentation"
              onClick={(e) => {
                e.stopPropagation();
              }}
              onKeyDown={(e) => {
                e.stopPropagation();
              }}
            >
              {children}
            </div>
          </div>,
          targetElement,
        )}
    </>
  );
};

SidebarPortal.propTypes = {
  children: PropTypes.any,
  selected: PropTypes.bool.isRequired,
};

export default SidebarPortal;
