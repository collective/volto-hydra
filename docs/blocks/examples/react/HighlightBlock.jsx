function HighlightBlock({ block }) {
  const title = block.title || '';
  const description = block.description || [];
  const imageSrc = block.image || '';
  const ctaText = block.cta_title || '';
  const ctaLink = block.cta_link?.[0]?.['@id'] || '';

  return (
    <section
      data-block-uid={block['@uid']}
      className="highlight-block"
      style={{ backgroundImage: imageSrc ? `url(${imageSrc})` : undefined }}
    >
      <div className="highlight-overlay">
        <h2 data-edit-text="title">{title}</h2>
        <div className="highlight-body">
          {description.map((node, i) => (
            <SlateNode key={i} node={node} />
          ))}
        </div>
        {ctaText && (
          <a href={ctaLink} data-edit-text="cta_title" data-edit-link="cta_link" className="highlight-cta">
            {ctaText}
          </a>
        )}
      </div>
    </section>
  );
}
