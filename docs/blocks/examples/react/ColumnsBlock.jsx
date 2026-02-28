function ColumnsBlock({ block }) {
  const columns = block.columns || {};
  const items = columns.items || [];
  const blocks = columns.blocks || {};

  return (
    <div data-block-uid={block['@uid']} className="columns-block">
      <div style={{ display: 'flex', gap: '1rem' }}>
        {items.map(id => (
          <ColumnBlock key={id} block={{ ...blocks[id], '@uid': id }} />
        ))}
      </div>
    </div>
  );
}

function ColumnBlock({ block }) {
  const layout = block.blocks_layout || {};
  const items = layout.items || [];
  const blocks = layout.blocks || {};

  return (
    <div data-block-uid={block['@uid']} style={{ flex: 1 }}>
      {block.title && <h4 data-edit-text="title">{block.title}</h4>}
      {items.map(id => (
        <BlockRenderer key={id} block={{ ...blocks[id], '@uid': id }} />
      ))}
    </div>
  );
}
