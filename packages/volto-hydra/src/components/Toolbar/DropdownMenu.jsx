import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import SlateButtonsWrapper from './SlateButtonsWrapper';
import FormatDropdown from './FormatDropdown';
import config from '@plone/volto/registry';
import { Icon } from '@plone/volto/components';

/**
 * Dropdown Menu for Block Actions
 *
 * Renders a dropdown menu with:
 * - Overflow buttons (formatting buttons that don't fit in toolbar)
 * - Table actions (add row/column before, delete row/column) when in table mode
 * - Settings, Select Container, and Remove options
 * Uses React portal to avoid container clipping issues.
 *
 * Overflow buttons are wrapped in a Slate context using the passed editor
 * so that useSlate() works for the button components.
 */
const DropdownMenu = ({
  selectedBlock,
  onDeleteBlock,
  menuButtonRect,
  onClose,
  onOpenSettings,
  parentId,
  onSelectBlock,
  overflowButtons = [], // Array of { name, element } for buttons that overflow
  showFormatDropdown = false, // Whether to show FormatDropdown in overflow
  blockButtons = [], // Block buttons for FormatDropdown
  editor, // Slate editor for overflow buttons context
  onChange, // Change handler for overflow buttons to propagate changes
  onMouseDownCapture, // Capture handler for flushing buffer before format
  onClickCapture, // Capture handler to block click when mousedown was intercepted
  tableActions = null, // { toolbar: [...], dropdown: [...] } for table operations
  overflowBlockActions = [], // Block actions that overflow from toolbar
  onTableAction, // Handler for table actions: (action) => void
  addMode, // 'table' if this is a row in a table
  parentAddMode, // 'table' if this is a cell in a table row
  addDirection, // 'right' or 'bottom' - determines Column vs Row terminology
  convertibleTypes = [], // Array of { type, title } for block type conversion
  onConvertBlock, // Handler for block conversion: (newType) => void
}) => {
  const menuRef = useRef(null);
  const [convertSubmenuOpen, setConvertSubmenuOpen] = React.useState(false);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose();
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [onClose]);

  if (!menuButtonRect) {
    return null;
  }

  const handleSettings = () => {
    onClose();
    // Open/expand the sidebar if collapsed
    if (onOpenSettings) {
      onOpenSettings();
    }
  };

  const handleSelectContainer = () => {
    onClose();
    if (parentId && onSelectBlock) {
      onSelectBlock(parentId);
    }
  };

  const handleRemove = () => {
    onClose();
    if (selectedBlock) {
      onDeleteBlock(selectedBlock, true);
    }
  };

  return createPortal(
    <div
      ref={menuRef}
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
      {/* Overflow buttons row - Slate formatting buttons followed by block actions */}
      {((overflowButtons.length > 0 || showFormatDropdown) && editor) || overflowBlockActions.length > 0 ? (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '2px',
            padding: '8px',
            borderBottom: '1px solid rgba(0, 0, 0, 0.1)',
          }}
        >
          {/* Slate formatting buttons */}
          {(overflowButtons.length > 0 || showFormatDropdown) && editor && (
            <SlateButtonsWrapper
              editor={editor}
              initialValue={editor.children}
              onChange={onChange}
              onMouseDownCapture={onMouseDownCapture}
              onClickCapture={onClickCapture}
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '2px',
              }}
            >
              {/* FormatDropdown when it doesn't fit in toolbar */}
              {showFormatDropdown && blockButtons.length > 0 && (
                <FormatDropdown
                  blockButtons={blockButtons}
                  onMouseDownCapture={onMouseDownCapture}
                  onClickCapture={onClickCapture}
                />
              )}
              {overflowButtons.map(({ name, element }) => (
                <div
                  key={name}
                  data-toolbar-button={name}
                  style={{ display: 'inline-flex' }}
                >
                  {element}
                </div>
              ))}
            </SlateButtonsWrapper>
          )}
          {/* Overflow block actions (e.g., add row/column buttons that didn't fit) */}
          {overflowBlockActions.length > 0 && onTableAction && (() => {
            const actionsRegistry = config.settings.hydraActions || {};
            return overflowBlockActions.map((actionId) => {
              const actionDef = actionsRegistry[actionId] || { label: actionId };
              return (
                <button
                  key={actionId}
                  title={actionDef.label}
                  onClick={() => {
                    onClose();
                    onTableAction(actionId);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: '4px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '2px',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#e8e8e8')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                >
                  {actionDef.icon ? (
                    <Icon name={actionDef.icon} size="18px" />
                  ) : (
                    actionDef.label
                  )}
                </button>
              );
            });
          })()}
        </div>
      ) : null}
      {/* Block actions from pathMap (e.g., table row/column operations) */}
      {tableActions?.dropdown?.length > 0 && onTableAction && (() => {
        const actionsRegistry = config.settings.hydraActions || {};
        return (
          <>
            {tableActions.dropdown.map((actionId) => {
              const actionDef = actionsRegistry[actionId] || { label: actionId };
              return (
                <div
                  key={actionId}
                  className="volto-hydra-dropdown-item"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px',
                    cursor: 'pointer',
                    fontSize: '15px',
                    fontWeight: '500',
                  }}
                  onMouseEnter={(e) => (e.target.style.background = '#f0f0f0')}
                  onMouseLeave={(e) => (e.target.style.background = 'transparent')}
                  onClick={() => {
                    onClose();
                    onTableAction(actionId);
                  }}
                >
                  {actionDef.icon && <Icon name={actionDef.icon} size="20px" />}
                  {actionDef.label}
                </div>
              );
            })}
            <div
              style={{
                height: '1px',
                background: 'rgba(0, 0, 0, 0.1)',
                margin: '0 10px',
              }}
            />
          </>
        );
      })()}
      {/* Settings option - only shown when onOpenSettings is provided (toolbar usage) */}
      {onOpenSettings && (
        <>
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
        </>
      )}
      {/* Convert to submenu - only shown when there are convertible types */}
      {convertibleTypes?.length > 0 && onConvertBlock && (
        <>
          <div
            className="volto-hydra-dropdown-item convert-to-menu"
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '10px',
              cursor: 'pointer',
              fontSize: '15px',
              fontWeight: '500',
              position: 'relative',
            }}
            onMouseEnter={(e) => {
              e.target.style.background = '#f0f0f0';
              setConvertSubmenuOpen(true);
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'transparent';
            }}
          >
            🔄 Convert to
            <span style={{ marginLeft: 'auto' }}>▸</span>
            {/* Submenu */}
            {convertSubmenuOpen && (
              <div
                className="volto-hydra-submenu"
                style={{
                  position: 'absolute',
                  left: '100%',
                  top: '0',
                  background: 'white',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
                  minWidth: '150px',
                  zIndex: 10001,
                }}
                onMouseEnter={() => setConvertSubmenuOpen(true)}
                onMouseLeave={() => setConvertSubmenuOpen(false)}
              >
                {convertibleTypes.map(({ type, title }) => (
                  <div
                    key={type}
                    className="volto-hydra-dropdown-item"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '10px',
                      cursor: 'pointer',
                      fontSize: '15px',
                      fontWeight: '500',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#f0f0f0')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    onClick={() => {
                      onClose();
                      onConvertBlock(type);
                    }}
                  >
                    {title}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div
            style={{
              height: '1px',
              background: 'rgba(0, 0, 0, 0.1)',
              margin: '0 10px',
            }}
          />
        </>
      )}
      {/* Select Container option - only shown for nested blocks with a parent */}
      {parentId && onSelectBlock && (
        <>
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
            onClick={handleSelectContainer}
          >
            ⬆️ Select Container
          </div>
          <div
            style={{
              height: '1px',
              background: 'rgba(0, 0, 0, 0.1)',
              margin: '0 10px',
            }}
          />
        </>
      )}
      {/* Remove action - label changes based on table mode and add direction */}
      {/* Hide remove for page-level fields (selectedBlock is null) */}
      {selectedBlock && (() => {
        // Determine remove label and action based on table mode
        // Uses addDirection to determine Column vs Row (same as add button icon)
        const actionsRegistry = config.settings.hydraActions || {};
        const isTableMode = addMode === 'table' || parentAddMode === 'table';
        const isRightDirection = addDirection === 'right';

        let removeLabel = 'Remove';
        let removeAction = null;
        let removeIcon = null;
        if (isTableMode) {
          removeAction = isRightDirection ? 'deleteColumn' : 'deleteRow';
          const actionDef = actionsRegistry[removeAction] || {};
          removeLabel = actionDef.label || (isRightDirection ? 'Remove Column' : 'Remove Row');
          removeIcon = actionDef.icon;
        }

        return (
          <div
            className="volto-hydra-dropdown-item"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px',
              cursor: 'pointer',
              fontSize: '15px',
              fontWeight: '500',
            }}
            onMouseEnter={(e) => (e.target.style.background = '#f0f0f0')}
            onMouseLeave={(e) => (e.target.style.background = 'transparent')}
            onClick={() => {
              onClose();
              if (removeAction && onTableAction) {
                onTableAction(removeAction);
              } else {
                handleRemove();
              }
            }}
          >
            {removeIcon ? <Icon name={removeIcon} size="20px" /> : '🗑️'} {removeLabel}
          </div>
        );
      })()}
    </div>,
    document.body,
  );
};

export default DropdownMenu;
