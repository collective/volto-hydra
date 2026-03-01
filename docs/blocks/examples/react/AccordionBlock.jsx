function AccordionBlock({ block }) {
  const [open, setOpen] = useState(false);

  const header = block.header || {};
  const content = block.content || {};

  return (
    <div data-block-uid={block['@uid']} className="accordion-block">
      <button onClick={() => setOpen(!open)} className="accordion-header">
        {(header.items || []).map(id => (
          <BlockRenderer key={id} block={{ ...header.blocks[id], '@uid': id }} />
        ))}
        <span>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="accordion-content">
          {(content.items || []).map(id => (
            <BlockRenderer key={id} block={{ ...content.blocks[id], '@uid': id }} />
          ))}
        </div>
      )}
    </div>
  );
}
