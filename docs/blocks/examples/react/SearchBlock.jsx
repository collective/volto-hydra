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
          <h4 data-edit-text="facetsTitle">{block.facetsTitle || 'Filter'}</h4>
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
      return <fieldset data-block-uid={facet['@id']}><legend data-edit-text="title">{facet.title}</legend>{/* checkbox options */}</fieldset>;
    case 'selectFacet':
      return <label data-block-uid={facet['@id']}><span data-edit-text="title">{facet.title}</span><select>{/* options */}</select></label>;
    case 'daterangeFacet':
      return <label data-block-uid={facet['@id']}><span data-edit-text="title">{facet.title}</span><input type="date" /> – <input type="date" /></label>;
    case 'toggleFacet':
      return <label data-block-uid={facet['@id']}><input type="checkbox" /> <span data-edit-text="title">{facet.title}</span></label>;
    default:
      return null;
  }
}
