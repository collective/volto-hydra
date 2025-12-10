/**
 * HiddenBlocksWidget - A widget that hides container block fields in sidebar
 *
 * Container fields (type: 'blocks') store nested blocks, but their editing UI
 * is provided by ChildBlocksWidget. This widget prevents the raw object from
 * showing as "[object Object]" in the sidebar.
 */
const HiddenBlocksWidget = () => {
  // Return null - ChildBlocksWidget handles the UI for managing child blocks
  return null;
};

export default HiddenBlocksWidget;
