function SearchBlock({ block, blockId }) {
  const [query, setQuery] = useState('');

  const facets = (block.facets || []).filter(f => !f.hidden);
  const listing = block.listing || {};
  const listingId = listing.items?.[0];
  const listingBlock = listingId ? (block.blocks?.[listingId]) : null;

  return (
    <div data-block-uid={blockId} className="search-block">
      <input
        type="search"
        placeholder="Search..."
        value={query}
        onChange={e => setQuery(e.target.value)}
      />

      {facets.length > 0 && (
        <div className="facets">
          <h4>{block.facetsTitle || 'Filter'}</h4>
          {facets.map(facet => (
            <FacetRenderer key={facet['@id']} facet={facet} />
          ))}
        </div>
      )}

      {listingBlock && (
        <ListingBlock block={listingBlock} blockId={listingId} />
      )}
    </div>
  );
}

function FacetRenderer({ facet }) {
  switch (facet.type) {
    case 'checkboxFacet':
      return <fieldset><legend>{facet.title}</legend>{/* checkbox options */}</fieldset>;
    case 'selectFacet':
      return <label>{facet.title}<select>{/* options */}</select></label>;
    case 'daterangeFacet':
      return <label>{facet.title}<input type="date" /> – <input type="date" /></label>;
    case 'toggleFacet':
      return <label><input type="checkbox" /> {facet.title}</label>;
    default:
      return null;
  }
}
