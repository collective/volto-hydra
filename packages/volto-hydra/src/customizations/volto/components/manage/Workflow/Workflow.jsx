import { Plug } from '@plone/volto/components/manage/Pluggable';
import StateMenu from '../../../../../components/Toolbar/StateMenu';

/**
 * Volto's state menu, replaced — and the two entries that belong inside it,
 * withdrawn.
 *
 * The stock component is a react-select whose onChange fires the transition
 * immediately, and whose options include the state the document is already in.
 * Three things follow from the spec that it cannot do:
 *
 *  - **Nothing fires on the click that opened it.** A transition names what it
 *    will do to who can reach this document, and waits.
 *  - **A transition may ask for something first** — WordPress wants a date and
 *    a visibility, Drupal a revision log, Plone effective and expiration dates.
 *    A select has nowhere to put a form.
 *  - **Sharing and working copies are the same list.** Changing who can reach a
 *    document, and taking a draft copy of it, are state changes. Plone putting
 *    them on separate screens is what this design is arguing with — and Volto's
 *    More menu inherits that split, carrying `state`, `sharing` and four
 *    working-copy buttons as unrelated entries.
 *
 * So this withdraws the other two rather than sit beside them. `setPlug`
 * replaces by id (Pluggable/index.js), and a plug registered later wins: More's
 * own plugs register when More mounts, and this renders through the pluggable
 * it registered, so this effect runs afterwards. That is why it can withdraw
 * them from here instead of shadowing all 450 lines of More.jsx — the component
 * that absorbs the entries is the one that withholds them, and they cannot
 * drift apart.
 *
 * Renders nothing when the adapter does not advertise `state`, matching what
 * Volto does for content with no workflow — in which case the withdrawn entries
 * would be the only way to reach either, so they stay.
 */
const Workflow = ({ pathname }) => (
  <>
    <StateMenu pathname={pathname} />
    <Plug pluggable="toolbar-more-menu-list" id="sharing">
      {() => null}
    </Plug>
    <Plug pluggable="toolbar-more-manage-content" id="workingcopy">
      {() => null}
    </Plug>
  </>
);

export default Workflow;
