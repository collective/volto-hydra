function GridBlock({ block }) {
  const blocks = block.blocks || {};
  const items = block.blocks_layout?.items || [];

  return (
    <div data-block-uid={block['@uid']} className="grid-block">
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${items.length}, 1fr)`, gap: '1rem' }}>
        {items.map(id => {
          const child = { ...blocks[id], '@uid': id };
          return (
            <div key={id} className="grid-cell">
              <BlockRenderer block={child} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
