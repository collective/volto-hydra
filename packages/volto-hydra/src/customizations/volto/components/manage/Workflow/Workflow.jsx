import StateMenu from '../../../../../components/Toolbar/StateMenu';

/**
 * Volto's state menu, replaced rather than added to.
 *
 * The stock component is a react-select whose onChange dispatches the
 * transition immediately, and whose options include the state the document is
 * already in. Three things follow from the spec that it cannot do:
 *
 *  - **Nothing fires on the click that opened it.** A transition names what it
 *    will do to who can reach this document, and waits.
 *  - **A transition may ask for something first** — WordPress wants a date and
 *    a visibility, Drupal a revision log, Plone effective and expiration
 *    dates. A select has nowhere to put a form.
 *  - **Access belongs in the same list.** Changing who can reach a document is
 *    the same kind of act as changing its state, and Plone putting them on
 *    separate screens is the thing this design is arguing with.
 *
 * Shadowed rather than plugged in beside: two state controls in one toolbar is
 * worse than either alone, and More.jsx imports this by module path, so this
 * takes its place wherever Volto already put it — which is both view and edit
 * mode, so publishing without editing comes for free.
 *
 * Renders nothing when the adapter does not advertise `state`, matching what
 * Volto does for content with no workflow.
 */
const Workflow = ({ pathname }) => <StateMenu pathname={pathname} />;

export default Workflow;
