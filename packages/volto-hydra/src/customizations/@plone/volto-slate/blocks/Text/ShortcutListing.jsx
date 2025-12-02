import { Segment, List } from 'semantic-ui-react';
import config from '@plone/volto/registry';
import React, { useState } from 'react';

/**
 * Collapsible shortcut listing for the slate block sidebar.
 * Collapsed by default to reduce sidebar clutter.
 */
const ShortcutListing = (props) => {
  const [expanded, setExpanded] = useState(false);
  const hotkeys = config.settings?.slate?.hotkeys;

  return (
    <div>
      <header
        className="header"
        onClick={() => setExpanded(!expanded)}
        style={{ cursor: 'pointer', opacity: expanded ? 1 : 0.7 }}
      >
        <h2>Editor shortcuts {expanded ? '▾' : '▸'}</h2>
      </header>

      {expanded && (
        <Segment secondary attached>
          <List>
            <List.Item>
              Type a slash (<em>/</em>) to change block type
            </List.Item>
            {Object.entries(hotkeys || {}).map(([shortcut, { format, type }]) => (
              <List.Item key={shortcut}>{`${shortcut}: ${format}`}</List.Item>
            ))}
          </List>
          <div>On Windows, the MOD key is Ctrl, on Mac OS X it's Cmd.</div>
        </Segment>
      )}
    </div>
  );
};

export default ShortcutListing;
