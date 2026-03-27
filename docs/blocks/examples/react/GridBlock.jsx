import { expandListingBlocks } from '@hydra-js/hydra.js';

function GridBlock({ block, blockId }) {
  const columns = block.columns || [];

  function expand(layout, blocks, containerId) {
    return expandListingBlocks(layout, { blocks, containerId });
  }

  return (
    <div data-block-uid={blockId} className="grid-block">
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${columns.length}, 1fr)`, gap: '1rem' }}>
        {columns.map(col => {
          const items = expand(col.blocks_layout?.items || [], col.blocks, col['@id']);
          return (
            <div key={col['@id']} data-block-uid={col['@id']} className="grid-column">
              {items.map(item => (
                <BlockRenderer key={item['@uid']} block={item} />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
