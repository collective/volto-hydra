import React from 'react';
import { createPortal } from 'react-dom';

/**
 * Dropdown Menu for Block Actions
 *
 * Renders a dropdown menu with Settings and Remove options.
 * Uses React portal to avoid container clipping issues.
 */
const DropdownMenu = ({
  selectedBlock,
  onDeleteBlock,
  menuButtonRect,
  onClose,
}) => {
  if (!menuButtonRect) {
    return null;
  }

  const handleSettings = () => {
    onClose();
    // TODO: Open settings sidebar
  };

  const handleRemove = () => {
    onClose();
    if (selectedBlock) {
      onDeleteBlock(selectedBlock, true);
    }
  };

  return createPortal(
    <div
      className="volto-hydra-dropdown-menu"
      style={{
        position: 'fixed',
        left: `${menuButtonRect.right - 180}px`, // Align right edge with button
        top: `${menuButtonRect.bottom + 4}px`,
        background: 'white',
        border: '1px solid #ccc',
        borderRadius: '4px',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
        zIndex: 10000,
        width: '180px',
        pointerEvents: 'auto',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className="volto-hydra-dropdown-item"
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '10px',
          cursor: 'pointer',
          fontSize: '15px',
          fontWeight: '500',
        }}
        onMouseEnter={(e) => (e.target.style.background = '#f0f0f0')}
        onMouseLeave={(e) => (e.target.style.background = 'transparent')}
        onClick={handleSettings}
      >
        ⚙️ Settings
      </div>
      <div
        style={{
          height: '1px',
          background: 'rgba(0, 0, 0, 0.1)',
          margin: '0 10px',
        }}
      />
      <div
        className="volto-hydra-dropdown-item"
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '10px',
          cursor: 'pointer',
          fontSize: '15px',
          fontWeight: '500',
        }}
        onMouseEnter={(e) => (e.target.style.background = '#f0f0f0')}
        onMouseLeave={(e) => (e.target.style.background = 'transparent')}
        onClick={handleRemove}
      >
        🗑️ Remove
      </div>
    </div>,
    document.body,
  );
};

export default DropdownMenu;
