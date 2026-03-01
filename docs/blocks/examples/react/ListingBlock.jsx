function ListingBlock({ block, blockId }) {
  const [items, setItems] = useState([]);

  useEffect(() => {
    // expandListingBlocks fetches from the API and maps fields
    async function load() {
      const result = await expandListingBlocks(
        { [blockId]: block },
        [blockId],
        blockId,
      );
      setItems(result.items);
    }
    load();
  }, [block.querystring]);

  return (
    <div data-block-uid={blockId} className="listing-block">
      {items.map(item => (
        <ListingItem key={item['@uid']} item={item} variation={block.variation} />
      ))}
    </div>
  );
}

function ListingItem({ item, variation }) {
  return (
    <div data-block-uid={item['@uid']} className="listing-item">
      {variation === 'summary' && item.image && (
        <img src={item.image} alt="" />
      )}
      <h3><a href={item.href}>{item.title}</a></h3>
      <p>{item.description}</p>
    </div>
  );
}
