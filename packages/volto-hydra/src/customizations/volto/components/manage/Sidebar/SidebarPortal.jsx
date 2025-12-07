import React from 'react';
import PropTypes from 'prop-types';
import { createPortal } from 'react-dom';
import { SidebarPortalTargetContext } from '../../../../../components/Sidebar/SidebarPortalTargetContext';

// Re-export for convenience
export { SidebarPortalTargetContext };

/**
 * Portal that wraps Sidebar components
 *
 * Hydra takes full control of sidebar rendering via ParentBlocksWidget.
 * This portal ONLY renders when SidebarPortalTargetContext is set.
 * Volto's normal block rendering (without context) is suppressed to prevent duplicates.
 *
 * @param {React.ReactNode} children Sidebar content
 * @param {bool} selected Sidebar needs to know when the related block is selected
 * @param {string} tab Element id where to insert sidebar content (ignored - context required)
 * @returns {string} Rendered sidebar
 */
const SidebarPortal = ({ children, selected }) => {
  const [isClient, setIsClient] = React.useState(null);
  const overrideTarget = React.useContext(SidebarPortalTargetContext);

  React.useEffect(() => setIsClient(true), []);

  // Hydra takes full control: ONLY render when context is set
  // This suppresses Volto's normal sidebar rendering (which has no context)
  // ParentBlocksWidget handles all sidebar rendering with explicit context
  if (!overrideTarget) {
    return null;
  }

  const targetId = overrideTarget;
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
