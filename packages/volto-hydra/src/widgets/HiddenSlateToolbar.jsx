import React, { useState, useEffect } from 'react';
import { createEditor } from 'slate';
import { Slate, withReact, Editable } from 'slate-react';
import SlateToolbar from '@plone/volto-slate/editor/ui/SlateToolbar';
import config from '@plone/volto/registry';

/**
 * HiddenSlateToolbar - Renders a real SlateToolbar to extract toolbar button metadata
 *
 * This component renders a complete Slate editor with SlateToolbar.
 * By using a real editor with proper node structure and selection,
 * the toolbar buttons render naturally, allowing us to extract their metadata.
 *
 * IMPORTANT: Only renders on client-side to avoid SSR issues with Slate hooks.
 */
const HiddenSlateToolbar = ({ containerRef }) => {
  // Only render on client-side (not during SSR)
  const [isClient, setIsClient] = useState(false);

  // Create a real Slate editor
  const [editor] = useState(() => {
    const ed = withReact(createEditor());
    // Add required methods
    ed.getSavedSelection = () => null;
    ed.setSavedSelection = () => {};
    // Ensure sidebar is not open (prevents toolbar from returning early)
    ed.isSidebarOpen = false;
    return ed;
  });

  // Create a simple document with text
  const [value] = useState([
    {
      type: 'p',
      children: [{ text: 'Sample text for toolbar' }]
    }
  ]);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Set selection after component mounts
  useEffect(() => {
    if (isClient && editor) {
      // Set a selection so the toolbar shows
      editor.selection = {
        anchor: { path: [0, 0], offset: 0 },
        focus: { path: [0, 0], offset: 5 }
      };
      // Force a re-render by calling onChange
      editor.onChange();
    }
  }, [isClient, editor]);

  // Don't render anything during SSR
  if (!isClient) {
    return <div ref={containerRef} style={{ position: 'absolute', left: '-9999px', opacity: 0 }} />;
  }

  const slateSettings = config.settings.slate;

  // Render a complete Slate editor off-screen
  // The Editable component creates the DOM nodes that Editor.nodes() needs
  return (
    <div ref={containerRef} style={{ position: 'absolute', left: '-9999px', opacity: 0, pointerEvents: 'none', width: '500px' }}>
      <Slate editor={editor} initialValue={value} onChange={() => {}}>
        <SlateToolbar
          selected={true}
          show={true}
          slateSettings={slateSettings}
        />
        <Editable readOnly />
      </Slate>
    </div>
  );
};

export default HiddenSlateToolbar;
