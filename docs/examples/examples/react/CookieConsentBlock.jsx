// A block drawn in three places, two of them hidden.
//
// Cookie consent is the everyday case for `data-block-selector="uid#field"`.
// The block's own element is a bar; its `message` is read in a BANNER at the
// foot of the page, and its `analyticsPurpose` beside a tick box inside a
// PREFERENCES DIALOG. Both are portalled to <body> — which is where a design
// system's own JavaScript puts them too — and both are hidden until their
// trigger is pressed.
//
// So "is the block visible?" is the wrong question: the bar is always visible,
// and neither half of what an author writes is. Each trigger therefore names
// the FIELD its half holds, and the bridge opens the half whose field the author
// reached for in the sidebar.
function CookieConsentBlock({ block }) {
  const uid = block['@uid'];
  const [showBanner, setShowBanner] = useState(true);
  const [showDialog, setShowDialog] = useState(false);

  return (
    <div data-block-uid={uid} className="cookie-consent">
      {/* The block's own element: always on screen, and the way back to two
          halves a visitor may already have dismissed. */}
      <div className="cookie-consent__bar">
        <strong>Cookie consent</strong>
        <button
          type="button"
          // "I reveal where `message` is edited." Put the cursor in Banner
          // message in the sidebar and the bridge clicks this, so the banner is
          // on screen while its wording is written.
          data-block-selector={`${uid}#message`}
          onClick={() => setShowBanner(true)}
        >
          Show the banner
        </button>
        <button
          type="button"
          // The other half. One handle could not serve both: it is one click,
          // and whichever it opened, the other half's wording would stay
          // unreachable from the sidebar.
          data-block-selector={`${uid}#analyticsPurpose`}
          onClick={() => setShowDialog(true)}
        >
          Show cookie preferences
        </button>
      </div>

      {/* Both halves live outside this block's DOM, so their editable text is
          annotated where it is READ rather than where the block renders. */}
      {createPortal(
        <div className="cookie-banner" hidden={!showBanner} role="alert">
          <p data-edit-text="message">{slateToText(block.message)}</p>
          <button type="button" onClick={() => setShowBanner(false)}>
            Accept all
          </button>
          <button type="button" onClick={() => setShowDialog(true)}>
            Manage preferences
          </button>
        </div>,
        document.body,
      )}

      {createPortal(
        <div className="cookie-dialog" hidden={!showDialog} role="dialog">
          <h2>Manage cookie preferences</h2>
          <label>
            <input type="checkbox" name="analytics" />
            Analytics
          </label>
          <p data-edit-text="analyticsPurpose">{block.analyticsPurpose}</p>
          <button type="button" onClick={() => setShowDialog(false)}>
            Save
          </button>
        </div>,
        document.body,
      )}
    </div>
  );
}

// Slate is an array of nodes; the banner shows its text. A real frontend would
// render the marks and links too — kept flat here so the pattern stays visible.
function slateToText(value) {
  if (!Array.isArray(value)) return '';
  return value
    .map(node => (node.text ?? (node.children || []).map(c => c.text ?? '').join('')))
    .join('');
}
