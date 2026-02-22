/**
 * Shadow of SidebarPopup.jsx
 * Fix: Replace doesNodeContainClick with bounding-rect coordinate check.
 * The original uses semantic-ui-react's doesNodeContainClick which traverses
 * the DOM parentNode chain. When React re-renders detach DOM nodes between
 * mousedown and the containment check, the traversal fails and incorrectly
 * concludes the click was outside — closing the OB unexpectedly.
 */
import React from 'react';
import { createPortal } from 'react-dom';
import { CSSTransition } from 'react-transition-group';
import PropTypes from 'prop-types';

const DEFAULT_TIMEOUT = 500;

const SidebarPopup = (props) => {
  const { children, open, onClose, overlay } = props;

  const asideElement = React.useRef();

  const handleClickOutside = (e) => {
    // Ignore synthetic/programmatic events (e.g. React re-renders dispatching
    // mousedown at 0,0 with no target). Only real user clicks should close.
    if (!e.isTrusted) return;
    if (!asideElement.current) return;
    const rect = asideElement.current.getBoundingClientRect();
    const { clientX, clientY } = e;
    if (
      clientX >= rect.left &&
      clientX <= rect.right &&
      clientY >= rect.top &&
      clientY <= rect.bottom
    ) {
      return; // Click is inside the popup
    }
    onClose();
  };

  const handleEscapeKey = (e) => {
    if (open && e.key === 'Escape') {
      onClose();
      e.stopPropagation();
    }
  };

  const [isClient, setIsClient] = React.useState(false);
  React.useEffect(() => {
    setIsClient(true);
  }, []);

  React.useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside, false);
    document.addEventListener('keyup', handleEscapeKey, false);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside, false);
      document.removeEventListener('keyup', handleEscapeKey, false);
    };
  });
  return (
    <>
      {overlay && (
        <CSSTransition
          in={open}
          timeout={DEFAULT_TIMEOUT}
          classNames="overlay-container"
          unmountOnExit
        >
          <>
            {document?.body &&
              createPortal(
                <div className="overlay-container"></div>,
                document?.body,
              )}
          </>
        </CSSTransition>
      )}
      <CSSTransition
        in={open}
        timeout={DEFAULT_TIMEOUT}
        classNames="sidebar-container"
        unmountOnExit
      >
        <>
          {isClient &&
            createPortal(
              <aside
                role="presentation"
                onClick={(e) => {
                  e.stopPropagation();
                }}
                onKeyDown={(e) => {
                  e.stopPropagation();
                }}
                ref={asideElement}
                key="sidebarpopup"
                className="sidebar-container"
                style={{ overflowY: 'auto' }}
              >
                {children}
              </aside>,
              document.body,
            )}
        </>
      </CSSTransition>
    </>
  );
};

SidebarPopup.propTypes = {
  open: PropTypes.bool,
  onClose: PropTypes.func,
  overlay: PropTypes.bool,
};

SidebarPopup.defaultProps = {
  open: false,
  onClose: () => {},
  overlay: false,
};

export default SidebarPopup;
