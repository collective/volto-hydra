function HeroBlock({ block }) {
  const heading = block.heading || '';
  const subheading = (block.subheading || '').replace(/\n/g, '<br>');
  const buttonText = block.buttonText || '';
  const buttonLink = block.buttonLink?.[0]?.['@id'] || '';
  const imageSrc = block.image || '';

  return (
    <div data-block-uid={block['@uid']} className="hero-block">
      {imageSrc && (
        <img data-edit-media="image" src={imageSrc} alt="Hero image" />
      )}
      <h1 data-edit-text="heading">{heading}</h1>
      <p data-edit-text="subheading" dangerouslySetInnerHTML={{ __html: subheading }} />
      <div className="hero-description">
        {(block.description || []).map((node, i) => (
          <SlateNode key={i} node={node} />
        ))}
      </div>
      <a data-edit-text="buttonText" data-edit-link="buttonLink" href={buttonLink}>
        {buttonText}
      </a>
    </div>
  );
}
