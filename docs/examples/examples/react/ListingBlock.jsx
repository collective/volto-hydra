function ListingBlock({ block, blockId }) {
  const [items, setItems] = useState([]);

  useEffect(() => {
    async function load() {
      const fetchItems = ploneFetchItems({ apiUrl: API_URL });
      const result = await expandListingBlocks([blockId], {
        blocks: { [blockId]: block },
        fetchItems: { listing: fetchItems },
        itemTypeField: 'variation',
      });
      setItems(result.items);
    }
    load();
  }, [block.querystring]);

  return (
    <div data-block-uid={blockId} className="listing-block">
      {items.map((item, i) => (
        <BlockRenderer key={i} block={item} />
      ))}
    </div>
  );
}
