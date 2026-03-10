function AccordionBlock({ block }) {
  const panels = block.panels || [];

  return (
    <div data-block-uid={block['@uid']} className="accordion-block">
      {panels.map(panel => {
        const panelId = panel['@id'];
        return <AccordionPanel key={panelId} panel={panel} panelId={panelId} />;
      })}
    </div>
  );
}

function AccordionPanel({ panel, panelId }) {
  const [open, setOpen] = useState(!panel.collapsed);
  const contentBlocks = panel.blocks || {};
  const contentLayout = panel.blocks_layout?.items || [];

  return (
    <div data-block-uid={panelId} className="accordion-panel">
      <button onClick={() => setOpen(!open)} className="accordion-header">
        <span data-edit-text="title">{panel.title}</span>
        <span>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="accordion-content">
          {contentLayout.map(id => (
            <BlockRenderer key={id} block={{ ...contentBlocks[id], '@uid': id }} />
          ))}
        </div>
      )}
    </div>
  );
}
