import React from 'react';
import { Slate } from 'slate-react';

/**
 * Shared wrapper for Slate toolbar buttons.
 *
 * Provides:
 * - Slate context for useSlate() in button components
 * - Mouse capture handlers to flush iframe buffer before formatting
 *
 * Used by both the main toolbar and the overflow dropdown menu.
 */
const SlateButtonsWrapper = ({
  editor,
  initialValue,
  onChange,
  onMouseDownCapture,
  onClickCapture,
  children,
  style,
}) => {
  return (
    <Slate editor={editor} initialValue={initialValue} onChange={onChange}>
      <div
        style={style}
        onMouseDownCapture={onMouseDownCapture}
        onClickCapture={onClickCapture}
      >
        {children}
      </div>
    </Slate>
  );
};

export default SlateButtonsWrapper;
